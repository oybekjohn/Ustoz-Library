#!/usr/bin/env node
/**
 * Production D1 migration runner
 * --command parametri orqali har bir SQL ni alohida bajaradi
 * Ishlatish: node scripts/run-migration-remote.mjs
 */

import { execSync } from 'child_process';

const DB = 'ustoz-library-db';

const statements = [
  // 1. Users
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, google_sub TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, avatar_url TEXT, locale TEXT DEFAULT 'uz', created_at TEXT NOT NULL DEFAULT (datetime('now')), last_login_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
  `CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub)`,

  // 2. User Sessions
  `CREATE TABLE IF NOT EXISTS user_sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), last_seen_at TEXT, user_agent TEXT, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at)`,

  // 3. Presentations
  `CREATE TABLE IF NOT EXISTS presentations (id INTEGER PRIMARY KEY AUTOINCREMENT, title_uz TEXT NOT NULL, title_ru TEXT, title_en TEXT, description_uz TEXT, description_ru TEXT, description_en TEXT, category TEXT NOT NULL, language TEXT NOT NULL DEFAULT 'uz', page_count INTEGER NOT NULL, pdf_key TEXT NOT NULL, cover_key TEXT, published INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE INDEX IF NOT EXISTS idx_presentations_category ON presentations(category)`,
  `CREATE INDEX IF NOT EXISTS idx_presentations_published ON presentations(published)`,
  `CREATE INDEX IF NOT EXISTS idx_presentations_created ON presentations(created_at DESC)`,

  // 4. Videos
  `CREATE TABLE IF NOT EXISTS videos (id INTEGER PRIMARY KEY AUTOINCREMENT, title_uz TEXT NOT NULL, title_ru TEXT, title_en TEXT, description_uz TEXT, description_ru TEXT, description_en TEXT, category TEXT NOT NULL, language TEXT NOT NULL DEFAULT 'uz', youtube_url TEXT NOT NULL, youtube_video_id TEXT NOT NULL, cover_key TEXT, duration_seconds INTEGER, published INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category)`,
  `CREATE INDEX IF NOT EXISTS idx_videos_published ON videos(published)`,
  `CREATE INDEX IF NOT EXISTS idx_videos_created ON videos(created_at DESC)`,

  // 5. Tests
  `CREATE TABLE IF NOT EXISTS tests (id INTEGER PRIMARY KEY AUTOINCREMENT, title_uz TEXT NOT NULL, title_ru TEXT, title_en TEXT, description_uz TEXT, description_ru TEXT, description_en TEXT, category TEXT NOT NULL, language TEXT NOT NULL DEFAULT 'uz', duration_minutes INTEGER NOT NULL DEFAULT 15, passing_percent INTEGER NOT NULL DEFAULT 60, max_attempts INTEGER, shuffle_questions INTEGER NOT NULL DEFAULT 1, shuffle_options INTEGER NOT NULL DEFAULT 1, violation_limit INTEGER NOT NULL DEFAULT 3, show_answers_after_finish INTEGER NOT NULL DEFAULT 1, published INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE INDEX IF NOT EXISTS idx_tests_category ON tests(category)`,
  `CREATE INDEX IF NOT EXISTS idx_tests_published ON tests(published)`,

  // 6. Test Questions
  `CREATE TABLE IF NOT EXISTS test_questions (id INTEGER PRIMARY KEY AUTOINCREMENT, test_id INTEGER NOT NULL, position INTEGER NOT NULL, question_text TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE, UNIQUE(test_id, position))`,
  `CREATE INDEX IF NOT EXISTS idx_test_questions_test ON test_questions(test_id)`,

  // 7. Test Options
  `CREATE TABLE IF NOT EXISTS test_options (id INTEGER PRIMARY KEY AUTOINCREMENT, question_id INTEGER NOT NULL, position INTEGER NOT NULL, option_text TEXT NOT NULL, is_correct INTEGER NOT NULL DEFAULT 0, FOREIGN KEY (question_id) REFERENCES test_questions(id) ON DELETE CASCADE, UNIQUE(question_id, position))`,
  `CREATE INDEX IF NOT EXISTS idx_test_options_question ON test_options(question_id)`,

  // 8. Test Attempts
  `CREATE TABLE IF NOT EXISTS test_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, test_id INTEGER NOT NULL, user_id INTEGER, anonymous_token_hash TEXT, channel TEXT NOT NULL DEFAULT 'web', status TEXT NOT NULL DEFAULT 'in_progress', started_at TEXT NOT NULL DEFAULT (datetime('now')), expires_at TEXT NOT NULL, submitted_at TEXT, correct_count INTEGER, total_count INTEGER, score_percent REAL, passed INTEGER, violation_count INTEGER NOT NULL DEFAULT 0, finish_reason TEXT, question_order_json TEXT NOT NULL, option_order_json TEXT NOT NULL, retention_until TEXT, FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS idx_test_attempts_user ON test_attempts(user_id, started_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_test_attempts_anon ON test_attempts(anonymous_token_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_test_attempts_status ON test_attempts(test_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_test_attempts_expires ON test_attempts(expires_at)`,
  `CREATE INDEX IF NOT EXISTS idx_test_attempts_retention ON test_attempts(retention_until)`,

  // 9. Test Answers
  `CREATE TABLE IF NOT EXISTS test_answers (attempt_id INTEGER NOT NULL, question_id INTEGER NOT NULL, selected_option_id INTEGER, is_correct INTEGER, answered_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (attempt_id, question_id), FOREIGN KEY (attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE, FOREIGN KEY (question_id) REFERENCES test_questions(id) ON DELETE CASCADE)`,

  // 10. Test Violations
  `CREATE TABLE IF NOT EXISTS test_violations (id INTEGER PRIMARY KEY AUTOINCREMENT, attempt_id INTEGER NOT NULL, event_type TEXT NOT NULL, occurred_at TEXT NOT NULL DEFAULT (datetime('now')), client_context_json TEXT, FOREIGN KEY (attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS idx_test_violations_attempt ON test_violations(attempt_id)`,

  // 11. User Progress
  `CREATE TABLE IF NOT EXISTS user_progress (user_id INTEGER NOT NULL, item_type TEXT NOT NULL, item_id INTEGER NOT NULL, progress_percent REAL NOT NULL DEFAULT 0, position_value REAL NOT NULL DEFAULT 0, completed INTEGER NOT NULL DEFAULT 0, started_at TEXT NOT NULL DEFAULT (datetime('now')), last_opened_at TEXT NOT NULL DEFAULT (datetime('now')), completed_at TEXT, PRIMARY KEY (user_id, item_type, item_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id, last_opened_at DESC)`,

  // 12. User Telegram Links
  `CREATE TABLE IF NOT EXISTS user_telegram_links (telegram_user_id TEXT PRIMARY KEY, user_id INTEGER NOT NULL UNIQUE, telegram_username TEXT, telegram_first_name TEXT, telegram_last_name TEXT, linked_at TEXT NOT NULL DEFAULT (datetime('now')), last_seen_at TEXT, revoked_at TEXT, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,

  // 13. Account Link Tokens
  `CREATE TABLE IF NOT EXISTS account_link_tokens (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, purpose TEXT NOT NULL DEFAULT 'telegram_link', expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,

  // 14. Telegram WebApp Sessions
  `CREATE TABLE IF NOT EXISTS telegram_webapp_sessions (token_hash TEXT PRIMARY KEY, telegram_user_id TEXT NOT NULL, user_id INTEGER, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), last_seen_at TEXT, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS idx_telegram_webapp_user ON telegram_webapp_sessions(telegram_user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_telegram_webapp_expires ON telegram_webapp_sessions(expires_at)`,
];

// ALTER TABLE — mavjud bo'lsa xatolikni e'tiborsiz qoldir
const alterStatements = [
  `ALTER TABLE telegram_sessions ADD COLUMN material_type TEXT`,
  `ALTER TABLE telegram_sessions ADD COLUMN pending_source_key TEXT`,
  `ALTER TABLE telegram_admins ADD COLUMN last_name TEXT`,
  `ALTER TABLE telegram_admins ADD COLUMN role TEXT NOT NULL DEFAULT 'library'`,
  `ALTER TABLE telegram_admins ADD COLUMN updated_at TEXT`,
];

let success = 0;
let errors = 0;

console.log('🚀 Production D1 migration boshlanmoqda...\n');

for (const sql of statements) {
  const preview = sql.substring(0, 60).replace(/\n/g, ' ');
  try {
    execSync(
      `npx wrangler d1 execute ${DB} --remote --command="${sql.replace(/"/g, '\\"')}"`,
      { stdio: 'pipe', input: 'n\n' }
    );
    console.log(`  ✅ ${preview}...`);
    success++;
  } catch (err) {
    const msg = err.stderr?.toString() || err.message;
    console.error(`  ❌ XATO: ${preview}...\n     ${msg.split('\n')[0]}`);
    errors++;
  }
}

console.log('\n--- ALTER TABLE (mavjud ustunlar e\'tiborsiz qolinadi) ---\n');

for (const sql of alterStatements) {
  try {
    execSync(
      `npx wrangler d1 execute ${DB} --remote --command="${sql}"`,
      { stdio: 'pipe', input: 'n\n' }
    );
    console.log(`  ✅ ${sql}`);
  } catch (err) {
    const msg = err.stderr?.toString() || '';
    if (msg.includes('duplicate column') || msg.includes('already exists')) {
      console.log(`  ⚠️  Mavjud (skip): ${sql}`);
    } else {
      console.error(`  ❌ XATO: ${sql}\n     ${msg.split('\n').find(l => l.includes('ERROR')) || msg.split('\n')[0]}`);
      errors++;
    }
  }
}

console.log(`\n✅ Muvaffaqiyatli: ${success} | ❌ Xatolar: ${errors}`);
if (errors > 0) process.exit(1);
