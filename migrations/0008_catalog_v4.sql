-- ============================================================
-- Migration 0008: v4 public platform
-- 1) books.archived — eski katalogni o'chirmasdan arxivlash
-- 2) rate_limits — login/webhook kabi sezgir endpointlar uchun
--    D1 asosidagi rate limit hisoblagichi
-- SAFE: faqat qo'shuvchi (additive). Mavjud ma'lumotlarga tegmaydi.
-- Eslatma: ustun allaqachon mavjud bo'lsa "duplicate column" xatosi
-- chiqadi — bu holda o'sha qatorni o'tkazib yuborish mumkin.
-- ============================================================

ALTER TABLE books ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_books_archived ON books(archived);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket      TEXT PRIMARY KEY,   -- masalan: "login:1.2.3.4"
  window_start INTEGER NOT NULL,  -- unix soniya (oyna boshi)
  count       INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
