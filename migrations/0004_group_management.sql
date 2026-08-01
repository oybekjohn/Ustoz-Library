CREATE TABLE IF NOT EXISTS telegram_group_configs (
  chat_id         TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  phone_topic_id  TEXT,
  enabled         INTEGER NOT NULL DEFAULT 1,
  tel_command_enabled INTEGER NOT NULL DEFAULT 1,
  created_by      TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS telegram_group_moderators (
  chat_id       TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  display_name  TEXT,
  enabled       INTEGER NOT NULL DEFAULT 1,
  added_by      TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_moderators_user
  ON telegram_group_moderators(user_id, enabled);

CREATE TABLE IF NOT EXISTS telegram_group_contacts (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id            TEXT NOT NULL,
  full_name          TEXT NOT NULL,
  normalized_name    TEXT NOT NULL,
  aliases_json       TEXT NOT NULL DEFAULT '[]',
  phone              TEXT NOT NULL,
  note               TEXT,
  source_user_id     TEXT,
  source_message_id  TEXT,
  approved_by        TEXT NOT NULL,
  correct_votes      INTEGER NOT NULL DEFAULT 0,
  wrong_votes        INTEGER NOT NULL DEFAULT 0,
  last_verified_at   TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (chat_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_group_contacts_name
  ON telegram_group_contacts(chat_id, normalized_name);

CREATE TABLE IF NOT EXISTS telegram_group_contact_votes (
  contact_id  INTEGER NOT NULL,
  user_id     TEXT NOT NULL,
  vote        INTEGER NOT NULL CHECK (vote IN (-1, 1)),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (contact_id, user_id),
  FOREIGN KEY (contact_id) REFERENCES telegram_group_contacts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_group_contact_votes_contact
  ON telegram_group_contact_votes(contact_id, vote);

CREATE TABLE IF NOT EXISTS telegram_group_requests (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id            TEXT NOT NULL,
  topic_id           TEXT,
  kind               TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending',
  payload_json       TEXT NOT NULL,
  source_user_id     TEXT,
  source_message_id  TEXT,
  locked_by          TEXT,
  resolved_by        TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_group_requests_pending
  ON telegram_group_requests(chat_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS telegram_group_request_messages (
  request_id       INTEGER NOT NULL,
  moderator_id    TEXT NOT NULL,
  private_chat_id  TEXT NOT NULL,
  message_id       TEXT NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (request_id, moderator_id)
);

CREATE TABLE IF NOT EXISTS telegram_group_moderator_sessions (
  moderator_id  TEXT PRIMARY KEY,
  chat_id       TEXT NOT NULL,
  state         TEXT NOT NULL,
  request_id    INTEGER,
  draft_name    TEXT,
  draft_phone   TEXT,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS telegram_group_allowed_bots (
  chat_id      TEXT NOT NULL,
  bot_user_id  TEXT NOT NULL,
  username     TEXT,
  added_by     TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (chat_id, bot_user_id)
);

CREATE TABLE IF NOT EXISTS telegram_group_imports (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id        TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',
  total_messages INTEGER NOT NULL DEFAULT 0,
  found_count    INTEGER NOT NULL DEFAULT 0,
  skipped_count  INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  created_by     TEXT NOT NULL,
  resolved_by    TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS telegram_group_import_contacts (
  import_id         INTEGER NOT NULL,
  phone             TEXT NOT NULL,
  full_name         TEXT NOT NULL,
  normalized_name   TEXT NOT NULL,
  source_message_id TEXT,
  PRIMARY KEY (import_id, phone),
  FOREIGN KEY (import_id) REFERENCES telegram_group_imports(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_group_imports_chat
  ON telegram_group_imports(chat_id, status, created_at DESC);
