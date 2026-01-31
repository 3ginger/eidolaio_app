-- Track which posts a user has earned voting points for (prevents double-dipping)
CREATE TABLE IF NOT EXISTS eidola.vote_points_earned (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES eidola.posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES eidola.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS vote_points_post_idx ON eidola.vote_points_earned(post_id);
CREATE INDEX IF NOT EXISTS vote_points_user_idx ON eidola.vote_points_earned(user_id);
