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
  pending_pdf_key TEXT,
  pending_cover_key TEXT,
  pending_metadata TEXT,
  edit_field   TEXT,
  active_book_id INTEGER,
  list_page    INTEGER,
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

CREATE TABLE IF NOT EXISTS telegram_admins (
  user_id   TEXT PRIMARY KEY,
  added_by  TEXT NOT NULL,
  added_at  TEXT NOT NULL DEFAULT (datetime('now')),
  role      TEXT NOT NULL DEFAULT 'library',
  username  TEXT,
  first_name TEXT,
  group_chat_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_telegram_admins_added
  ON telegram_admins(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_admins_role
  ON telegram_admins(role, added_at DESC);

-- Telegram guruh moderatsiyasi. Production bazaga
-- migrations/0004_group_management.sql orqali qo'shiladi.
CREATE TABLE IF NOT EXISTS telegram_group_configs (
  chat_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  phone_topic_id TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  tel_command_enabled INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS telegram_group_moderators (
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  display_name TEXT,
  username TEXT,
  first_name TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  added_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (chat_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_group_moderators_user
  ON telegram_group_moderators(user_id, enabled);

CREATE TABLE IF NOT EXISTS telegram_group_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  phone TEXT NOT NULL,
  secondary_phone TEXT,
  note TEXT,
  source_user_id TEXT,
  source_message_id TEXT,
  approved_by TEXT NOT NULL,
  correct_votes INTEGER NOT NULL DEFAULT 0,
  wrong_votes INTEGER NOT NULL DEFAULT 0,
  last_verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (chat_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_group_contacts_name
  ON telegram_group_contacts(chat_id, normalized_name);

CREATE TABLE IF NOT EXISTS telegram_group_contact_votes (
  contact_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  vote INTEGER NOT NULL CHECK (vote IN (-1, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (contact_id, user_id),
  FOREIGN KEY (contact_id) REFERENCES telegram_group_contacts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_group_contact_votes_contact
  ON telegram_group_contact_votes(contact_id, vote);

CREATE TABLE IF NOT EXISTS telegram_group_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  topic_id TEXT,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payload_json TEXT NOT NULL,
  source_user_id TEXT,
  source_message_id TEXT,
  locked_by TEXT,
  resolved_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_group_requests_pending
  ON telegram_group_requests(chat_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS telegram_group_request_messages (
  request_id INTEGER NOT NULL,
  moderator_id TEXT NOT NULL,
  private_chat_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (request_id, moderator_id)
);

CREATE TABLE IF NOT EXISTS telegram_group_moderator_sessions (
  moderator_id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  state TEXT NOT NULL,
  request_id INTEGER,
  draft_name TEXT,
  draft_phone TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS telegram_group_allowed_bots (
  chat_id TEXT NOT NULL,
  bot_user_id TEXT NOT NULL,
  username TEXT,
  added_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (chat_id, bot_user_id)
);

CREATE TABLE IF NOT EXISTS telegram_group_imports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_messages INTEGER NOT NULL DEFAULT 0,
  found_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  resolved_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS telegram_group_import_contacts (
  import_id INTEGER NOT NULL,
  phone TEXT NOT NULL,
  full_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  source_message_id TEXT,
  PRIMARY KEY (import_id, phone),
  FOREIGN KEY (import_id) REFERENCES telegram_group_imports(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_group_imports_chat
  ON telegram_group_imports(chat_id, status, created_at DESC);
