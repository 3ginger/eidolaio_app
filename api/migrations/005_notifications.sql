-- Notifications table for tracking user notifications
CREATE TABLE IF NOT EXISTS eidola.notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES eidola.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'like', 'comment', 'follow', 'chain_join'
  actor_id INTEGER REFERENCES eidola.users(id) ON DELETE SET NULL, -- User who triggered the notification
  post_id INTEGER REFERENCES eidola.posts(id) ON DELETE CASCADE, -- Related post (if applicable)
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying of user notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON eidola.notifications(user_id, is_read, created_at DESC);

-- Index for finding notifications by post
CREATE INDEX IF NOT EXISTS idx_notifications_post ON eidola.notifications(post_id) WHERE post_id IS NOT NULL;

-- Index for finding notifications by actor (for cleanup on user deletion)
CREATE INDEX IF NOT EXISTS idx_notifications_actor ON eidola.notifications(actor_id) WHERE actor_id IS NOT NULL;
