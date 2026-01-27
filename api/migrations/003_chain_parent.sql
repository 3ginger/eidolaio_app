-- Add chain_parent_id to posts table for linking chain entries to their parent post
ALTER TABLE eidola.posts ADD COLUMN IF NOT EXISTS chain_parent_id INTEGER REFERENCES eidola.posts(id);
CREATE INDEX IF NOT EXISTS posts_chain_parent_idx ON eidola.posts(chain_parent_id);
