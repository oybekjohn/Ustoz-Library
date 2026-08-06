-- ============================================================
-- Migration 0007: Additive columns for existing tables
-- telegram_sessions va telegram_admins jadvallariga ustun qo'shish.
-- Bu SQL statements production D1 ga qarab ishga tushiriladi.
-- Agar ustunlar allaqachon mavjud bo'lsa "duplicate column" xatosi
-- berishi mumkin — bu holda bu migration o'tkazib yuboriladi.
-- ============================================================

ALTER TABLE telegram_sessions ADD COLUMN material_type TEXT;
ALTER TABLE telegram_sessions ADD COLUMN pending_source_key TEXT;

ALTER TABLE telegram_admins ADD COLUMN last_name TEXT;
ALTER TABLE telegram_admins ADD COLUMN role TEXT NOT NULL DEFAULT 'library';
ALTER TABLE telegram_admins ADD COLUMN updated_at TEXT;
