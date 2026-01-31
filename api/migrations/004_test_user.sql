-- Add is_test_user column for E2E testing
-- Test users' posts are filtered from public feeds

ALTER TABLE eidola.users ADD COLUMN IF NOT EXISTS is_test_user BOOLEAN DEFAULT false;

-- Index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_users_is_test_user ON eidola.users (is_test_user) WHERE is_test_user = true;

COMMENT ON COLUMN eidola.users.is_test_user IS 'When true, user posts are excluded from public feeds (for E2E testing)';
