-- Eidola Database Schema
-- PostgreSQL with PostGIS extension

-- Enable PostGIS (may already be enabled on Vercel)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create dedicated schema
CREATE SCHEMA IF NOT EXISTS eidola;

-- Users (synced from Clerk)
CREATE TABLE IF NOT EXISTS eidola.users (
  id SERIAL PRIMARY KEY,
  clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Posts (all pareidolia types)
CREATE TABLE IF NOT EXISTS eidola.posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES eidola.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('persistent', 'temporary', 'challenge')),
  title VARCHAR(200),
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- Content moderation
  is_nsfw BOOLEAN DEFAULT FALSE,
  user_marked_nsfw BOOLEAN DEFAULT FALSE,
  moderation_status VARCHAR(20) DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'flagged')),
  moderation_score JSONB,

  -- Location (for persistent posts)
  location GEOGRAPHY(POINT, 4326),
  address TEXT,

  -- What user sees (drawing + text caption)
  user_drawing JSONB,
  user_caption TEXT,

  -- Challenge settings
  is_challenge BOOLEAN DEFAULT FALSE,
  challenge_type VARCHAR(20) CHECK (challenge_type IN ('draw', 'text')),
  challenge_difficulty VARCHAR(20) CHECK (challenge_difficulty IN ('easy', 'medium', 'hard')),

  -- Engagement
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  checkins_count INTEGER DEFAULT 0,
  submissions_count INTEGER DEFAULT 0,

  -- Timestamps
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Challenge Submissions
CREATE TABLE IF NOT EXISTS eidola.challenge_submissions (
  id SERIAL PRIMARY KEY,
  challenge_id INTEGER REFERENCES eidola.posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES eidola.users(id) ON DELETE CASCADE,
  drawing_data JSONB NOT NULL,
  text_guess TEXT,
  similarity_score FLOAT,
  rank INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

-- Photo Chain (ordered sequence at persistent spots)
CREATE TABLE IF NOT EXISTS eidola.photo_chain (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES eidola.posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES eidola.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  position INTEGER NOT NULL,
  caption TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Auto-assign position on insert
CREATE OR REPLACE FUNCTION eidola.set_chain_position()
RETURNS TRIGGER AS $$
BEGIN
  NEW.position := (SELECT COALESCE(MAX(position), 0) + 1
                   FROM eidola.photo_chain WHERE post_id = NEW.post_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chain_position_trigger ON eidola.photo_chain;
CREATE TRIGGER chain_position_trigger
BEFORE INSERT ON eidola.photo_chain
FOR EACH ROW EXECUTE FUNCTION eidola.set_chain_position();

-- Likes
CREATE TABLE IF NOT EXISTS eidola.likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES eidola.posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES eidola.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Comments
CREATE TABLE IF NOT EXISTS eidola.comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES eidola.posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES eidola.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Follows
CREATE TABLE IF NOT EXISTS eidola.follows (
  follower_id INTEGER REFERENCES eidola.users(id) ON DELETE CASCADE,
  following_id INTEGER REFERENCES eidola.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY(follower_id, following_id)
);

-- Tags
CREATE TABLE IF NOT EXISTS eidola.tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Post tags
CREATE TABLE IF NOT EXISTS eidola.post_tags (
  post_id INTEGER REFERENCES eidola.posts(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES eidola.tags(id) ON DELETE CASCADE,
  PRIMARY KEY(post_id, tag_id)
);

-- User interests
CREATE TABLE IF NOT EXISTS eidola.user_interests (
  user_id INTEGER REFERENCES eidola.users(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES eidola.tags(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id, tag_id)
);

-- Seed default tags
INSERT INTO eidola.tags (name) VALUES
  ('faces'), ('animals'), ('objects'), ('nature'),
  ('clouds'), ('rocks'), ('food'), ('buildings'),
  ('funny'), ('creepy'), ('artistic')
ON CONFLICT (name) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS posts_location_idx ON eidola.posts USING GIST(location);
CREATE INDEX IF NOT EXISTS posts_type_idx ON eidola.posts(type);
CREATE INDEX IF NOT EXISTS posts_user_idx ON eidola.posts(user_id);
CREATE INDEX IF NOT EXISTS posts_created_idx ON eidola.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS photo_chain_post_idx ON eidola.photo_chain(post_id);
CREATE INDEX IF NOT EXISTS comments_post_idx ON eidola.comments(post_id);
CREATE INDEX IF NOT EXISTS likes_post_idx ON eidola.likes(post_id);
CREATE INDEX IF NOT EXISTS likes_user_idx ON eidola.likes(user_id);
CREATE INDEX IF NOT EXISTS follows_follower_idx ON eidola.follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_idx ON eidola.follows(following_id);
CREATE INDEX IF NOT EXISTS user_interests_user_idx ON eidola.user_interests(user_id);
