-- Trust system: Two-button voting (Real vs AI)

-- Add real_count to posts
ALTER TABLE eidola.posts 
ADD COLUMN IF NOT EXISTS real_count INTEGER DEFAULT 0;

-- Track who voted "real" on which post
CREATE TABLE IF NOT EXISTS eidola.real_votes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES eidola.posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES eidola.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS real_votes_post_idx ON eidola.real_votes(post_id);
CREATE INDEX IF NOT EXISTS real_votes_user_idx ON eidola.real_votes(user_id);
