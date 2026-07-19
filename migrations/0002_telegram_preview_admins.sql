ALTER TABLE telegram_sessions ADD COLUMN pending_pdf_key TEXT;
ALTER TABLE telegram_sessions ADD COLUMN pending_cover_key TEXT;
ALTER TABLE telegram_sessions ADD COLUMN pending_metadata TEXT;
ALTER TABLE telegram_sessions ADD COLUMN edit_field TEXT;

CREATE TABLE IF NOT EXISTS telegram_admins (
  user_id   TEXT PRIMARY KEY,
  added_by  TEXT NOT NULL,
  added_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_telegram_admins_added
  ON telegram_admins(added_at DESC);
