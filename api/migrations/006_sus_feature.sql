-- Sus feature: community AI detection + author confession

-- Add sus tracking to posts
ALTER TABLE eidola.posts 
ADD COLUMN IF NOT EXISTS sus_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_busted BOOLEAN DEFAULT FALSE;

-- Track who sus'd which post (like likes table)
CREATE TABLE IF NOT EXISTS eidola.sus (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES eidola.posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES eidola.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS sus_post_idx ON eidola.sus(post_id);
CREATE INDEX IF NOT EXISTS sus_user_idx ON eidola.sus(user_id);
