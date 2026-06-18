-- ============================================
--  Mavjud kitoblarni yangi (mavzu asosidagi) kategoriyalarga ko'chirish
--  Eski: monografiya/lugat/darslik/qollanma  →  Yangi: it / ai / ...
--
--  Ishlatish (HAQIQIY bazada):
--    npx wrangler d1 execute ustoz-library-db --remote --file=./scripts/update-categories.sql
--  Lokal sinov uchun --remote o'rniga --local ishlating.
-- ============================================

-- Boshlang'ich 7 kitob (id bo'yicha aniq taqsimot)
UPDATE books SET category = 'ai' WHERE id = 5;                       -- Sun'iy intellektning dasturiy vositalari
UPDATE books SET category = 'it' WHERE id IN (1, 2, 3, 4, 6, 7);     -- qolganlari hozircha IT

-- Zaxira: agar eski kategoriyali boshqa kitoblar qolgan bo'lsa, ularni IT ga olib o'tamiz
UPDATE books SET category = 'it' WHERE category IN ('monografiya', 'lugat', 'darslik', 'qollanma');
-- 'fandastur' va 'boshqa' yangi ro'yxatda ham mavjud — tegmaymiz.
