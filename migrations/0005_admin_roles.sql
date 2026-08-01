ALTER TABLE telegram_admins ADD COLUMN role TEXT NOT NULL DEFAULT 'library';
ALTER TABLE telegram_admins ADD COLUMN username TEXT;
ALTER TABLE telegram_admins ADD COLUMN first_name TEXT;
ALTER TABLE telegram_admins ADD COLUMN group_chat_id TEXT;

ALTER TABLE telegram_group_moderators ADD COLUMN username TEXT;
ALTER TABLE telegram_group_moderators ADD COLUMN first_name TEXT;

CREATE INDEX IF NOT EXISTS idx_telegram_admins_role
  ON telegram_admins(role, added_at DESC);
