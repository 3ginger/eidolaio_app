-- Eidola Admin & Reports Schema
-- Migration 002

-- Add admin flag to users
ALTER TABLE eidola.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Reports table
CREATE TABLE IF NOT EXISTS eidola.reports (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES eidola.posts(id) ON DELETE CASCADE,
  reporter_id INTEGER NOT NULL REFERENCES eidola.users(id),
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('spam', 'nsfw', 'harassment', 'copyright', 'other')),
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'sustained')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by INTEGER REFERENCES eidola.users(id)
);

-- Indexes for reports
CREATE INDEX IF NOT EXISTS idx_reports_status ON eidola.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_post_id ON eidola.reports(post_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON eidola.reports(created_at DESC);

-- Note: To set admins, add ADMIN_EMAILS environment variable in Vercel:
-- ADMIN_EMAILS=3gingermail@gmail.com
-- Multiple admins can be comma-separated: ADMIN_EMAILS=admin1@example.com,admin2@example.com
-- Users will be auto-promoted to admin when they access their profile or admin pages.
