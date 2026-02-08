-- Comment likes feature
-- Create comment_likes table
CREATE TABLE IF NOT EXISTS eidola.comment_likes (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER NOT NULL REFERENCES eidola.comments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES eidola.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON eidola.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON eidola.comment_likes(user_id);

-- Add likes_count to comments
ALTER TABLE eidola.comments ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Backfill existing rows
UPDATE eidola.comments SET likes_count = 0 WHERE likes_count IS NULL;
