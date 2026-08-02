-- ============================================
--  DL-library.uz - D1 schema
-- ============================================

DROP TABLE IF EXISTS books;

CREATE TABLE books (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  title_uz       TEXT NOT NULL,
  title_ru       TEXT,
  title_en       TEXT,
  author         TEXT NOT NULL,
  year           INTEGER,
  category       TEXT NOT NULL,
  language       TEXT NOT NULL DEFAULT 'uz',
  pages          INTEGER,
  file_key       TEXT NOT NULL,
  cover_key      TEXT,
  description_uz TEXT,
  description_ru TEXT,
  description_en TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_books_created ON books(created_at DESC);

CREATE TABLE IF NOT EXISTS telegram_sessions (
  user_id           TEXT PRIMARY KEY,
  chat_id           TEXT NOT NULL,
  state             TEXT NOT NULL DEFAULT 'idle',
  category          TEXT,
  pdf_file_id       TEXT,
  pdf_name          TEXT,
  pdf_size          INTEGER,
  pending_pdf_key   TEXT,
  pending_cover_key TEXT,
  pending_metadata  TEXT,
  edit_field        TEXT,
  active_book_id    INTEGER,
  list_page         INTEGER,
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS telegram_updates (
  update_id  TEXT PRIMARY KEY,
  status     TEXT NOT NULL,
  error      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_telegram_updates_updated
  ON telegram_updates(updated_at DESC);

CREATE TABLE IF NOT EXISTS telegram_admins (
  user_id    TEXT PRIMARY KEY,
  added_by   TEXT NOT NULL,
  added_at   TEXT NOT NULL DEFAULT (datetime('now')),
  username   TEXT,
  first_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_telegram_admins_added
  ON telegram_admins(added_at DESC);
