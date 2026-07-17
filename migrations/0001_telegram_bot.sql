CREATE TABLE IF NOT EXISTS telegram_sessions (
  user_id      TEXT PRIMARY KEY,
  chat_id      TEXT NOT NULL,
  state        TEXT NOT NULL DEFAULT 'idle',
  category     TEXT,
  pdf_file_id  TEXT,
  pdf_name     TEXT,
  pdf_size     INTEGER,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS telegram_updates (
  update_id    TEXT PRIMARY KEY,
  status       TEXT NOT NULL,
  error        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_telegram_updates_updated
  ON telegram_updates(updated_at DESC);
