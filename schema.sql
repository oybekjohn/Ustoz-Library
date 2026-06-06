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
  category      TEXT NOT NULL,          -- fandastur | darslik | monografiya | qollanma | lugat | boshqa
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
