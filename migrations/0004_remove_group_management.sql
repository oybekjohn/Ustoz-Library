-- Existing production bazasidan guruh funksiyalari va ularning ma'lumotlarini o'chiradi.
PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS telegram_group_contact_votes;
DROP TABLE IF EXISTS telegram_group_request_messages;
DROP TABLE IF EXISTS telegram_group_moderator_sessions;
DROP TABLE IF EXISTS telegram_group_allowed_bots;
DROP TABLE IF EXISTS telegram_group_import_contacts;
DROP TABLE IF EXISTS telegram_group_imports;
DROP TABLE IF EXISTS telegram_group_requests;
DROP TABLE IF EXISTS telegram_group_contacts;
DROP TABLE IF EXISTS telegram_group_moderators;
DROP TABLE IF EXISTS telegram_group_configs;

DROP INDEX IF EXISTS idx_telegram_admins_role;
ALTER TABLE telegram_admins RENAME TO telegram_admins_with_roles;

CREATE TABLE telegram_admins (
  user_id    TEXT PRIMARY KEY,
  added_by   TEXT NOT NULL,
  added_at   TEXT NOT NULL DEFAULT (datetime('now')),
  username   TEXT,
  first_name TEXT
);

-- Faqat DL Library adminlari saqlanadi; eski guruh adminlari o'chiriladi.
INSERT INTO telegram_admins (user_id, added_by, added_at, username, first_name)
SELECT user_id, added_by, added_at, username, first_name
FROM telegram_admins_with_roles
WHERE role <> 'group';

DROP TABLE telegram_admins_with_roles;

CREATE INDEX IF NOT EXISTS idx_telegram_admins_added
  ON telegram_admins(added_at DESC);

PRAGMA foreign_keys = ON;
