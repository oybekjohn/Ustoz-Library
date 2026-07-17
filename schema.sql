-- ============================================
--  DL-library.uz — D1 schema
-- ============================================

DROP TABLE IF EXISTS books;

CREATE TABLE books (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title_uz      TEXT NOT NULL,
  title_ru      TEXT,
  title_en      TEXT,
  author        TEXT NOT NULL,
  year          INTEGER,
  category      TEXT NOT NULL,          -- it | ai | iqtisodiyot | biznes | salomatlik | bogdorchilik | fandastur | ai_darslar | ai_agentlar | boshqa
  language      TEXT NOT NULL DEFAULT 'uz',
  pages         INTEGER,
  file_key      TEXT NOT NULL,          -- R2 dagi PDF kaliti
  cover_key     TEXT,                   -- R2 dagi muqova kaliti
  description_uz TEXT,
  description_ru TEXT,
  description_en TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_books_created  ON books(created_at DESC);

-- Telegram bot dialog holati. Mavjud production bazaga
-- migrations/0001_telegram_bot.sql orqali qo'shiladi.
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
