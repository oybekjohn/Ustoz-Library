ALTER TABLE telegram_group_contacts ADD COLUMN secondary_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_group_contacts_secondary_phone
  ON telegram_group_contacts(chat_id, secondary_phone);
