/**
 * POST /api/test-attempts
 * Start a new test attempt for user or anonymous session
 */
import { getCurrentUser, USER_COOKIE_NAME, parseCookies, hashToken } from '../../_lib/user-auth.js';
import { prepareAttemptOrders } from '../../_lib/test-engine.js';
import { generateRandomToken } from '../../_lib/telegram-link.js';

export async function onRequestPost(context) {
  const { env, request } = context;

  try {
    const body = await request.json();
    const testId = body.test_id;

    if (!testId) {
      return new Response(JSON.stringify({ error: "test_id ko'rsatilmadi" }), { status: 400 });
    }

    // 1. Check test exists and is published
    const testRecord = await env.DB.prepare(
      `SELECT * FROM tests WHERE id = ? AND published = 1`
    ).bind(testId).first();

    if (!testRecord) {
      return new Response(JSON.stringify({ error: "Test topilmadi yoki faol emas" }), { status: 404 });
    }

    // 2. Identify user or create anonymous token
    const user = await getCurrentUser(env, request);
    let userId = null;
    let anonTokenHash = null;
    let anonRawToken = null;

    if (user) {
      userId = user.id;

      // Urinishlar limitini tekshirish
      if (testRecord.max_attempts) {
        const attemptCount = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM test_attempts WHERE test_id = ? AND user_id = ? AND status != 'in_progress'`
        ).bind(testId, userId).first('count');

        if (attemptCount >= testRecord.max_attempts) {
          return new Response(JSON.stringify({ error: "Ruxsat etilgan maksimum urinishlar soniga yetdingiz" }), { status: 403 });
        }
      }
    } else {
      // Anonymous attempt token
      const cookies = parseCookies(request);
      anonRawToken = cookies['dl_anon_token'];
      if (!anonRawToken) {
        anonRawToken = generateRandomToken(32);
      }
      anonTokenHash = await hashToken(anonRawToken);
    }

    // 3. Fetch test questions and options
    const { results: questions } = await env.DB.prepare(
      `SELECT id, position, question_text FROM test_questions WHERE test_id = ? ORDER BY position ASC`
    ).bind(testId).all();

    if (!questions || questions.length === 0) {
      return new Response(JSON.stringify({ error: "Testda savollar mavjud emas" }), { status: 400 });
    }

    for (const q of questions) {
      const { results: options } = await env.DB.prepare(
        `SELECT id, position, option_text, is_correct FROM test_options WHERE question_id = ? ORDER BY position ASC`
      ).bind(q.id).all();
      q.options = options || [];
    }

    // 4. Generate random order snapshot
    const orders = prepareAttemptOrders(
      questions,
      Boolean(testRecord.shuffle_questions),
      Boolean(testRecord.shuffle_options)
    );

    const now = new Date();
    const durationMs = (testRecord.duration_minutes || 15) * 60 * 1000;
    const expiresAt = new Date(now.getTime() + durationMs).toISOString();
    const retentionUntil = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

    // 5. Insert test attempt record
    const res = await env.DB.prepare(
      `INSERT INTO test_attempts
       (test_id, user_id, anonymous_token_hash, channel, status, started_at, expires_at,
        question_order_json, option_order_json, retention_until)
       VALUES (?, ?, ?, 'web', 'in_progress', ?, ?, ?, ?, ?)`
    ).bind(
      testId,
      userId,
      anonTokenHash,
      now.toISOString(),
      expiresAt,
      JSON.stringify(orders.questionOrder),
      JSON.stringify(orders.optionOrder),
      userId ? null : retentionUntil
    ).run();

    const attemptId = res.meta.last_row_id;

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');

    if (anonRawToken) {
      headers.append('Set-Cookie', `dl_anon_token=${anonRawToken}; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Lax`);
    }

    return new Response(JSON.stringify({
      success: true,
      attemptId,
      expiresAt,
      durationMinutes: testRecord.duration_minutes
    }), {
      status: 201,
      headers
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
