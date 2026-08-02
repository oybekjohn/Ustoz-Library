import { displayName, normalizeSearchText } from './utils.js';

function parseRequest(row) {
  if (!row) return null;
  let payload = {};
  try { payload = JSON.parse(row.payload_json || '{}'); } catch {}
  return { ...row, payload };
}

export async function getGroupConfig(env, chatId) {
  return env.DB.prepare('SELECT * FROM telegram_group_configs WHERE chat_id = ? AND enabled = 1')
    .bind(String(chatId)).first();
}

export async function upsertGroupConfig(env, { chatId, title, createdBy }) {
  await env.DB.prepare(`
    INSERT INTO telegram_group_configs (chat_id, title, created_by, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(chat_id) DO UPDATE SET
      title=excluded.title, enabled=1, updated_at=datetime('now')
  `).bind(String(chatId), title, String(createdBy)).run();
  return getGroupConfig(env, chatId);
}

export async function setPhoneTopic(env, chatId, topicId) {
  await env.DB.prepare(`
    UPDATE telegram_group_configs
    SET phone_topic_id = ?, updated_at = datetime('now')
    WHERE chat_id = ?
  `).bind(String(topicId), String(chatId)).run();
  return getGroupConfig(env, chatId);
}

export async function setTelCommandEnabled(env, chatId, enabled) {
  await env.DB.prepare(`
    UPDATE telegram_group_configs
    SET tel_command_enabled = ?, updated_at = datetime('now')
    WHERE chat_id = ?
  `).bind(enabled ? 1 : 0, String(chatId)).run();
  return getGroupConfig(env, chatId);
}

export async function addGroupModerator(env, {
  chatId,
  userId,
  displayName,
  username,
  firstName,
  addedBy,
}) {
  await env.DB.prepare(`
    INSERT INTO telegram_group_moderators
      (chat_id, user_id, display_name, username, first_name, enabled, added_by)
    VALUES (?, ?, ?, ?, ?, 1, ?)
    ON CONFLICT(chat_id, user_id) DO UPDATE SET
      display_name=excluded.display_name,
      username=COALESCE(excluded.username, telegram_group_moderators.username),
      first_name=COALESCE(excluded.first_name, telegram_group_moderators.first_name),
      enabled=1,
      added_by=excluded.added_by
  `).bind(
    String(chatId), String(userId), displayName || null,
    username || null, firstName || null, String(addedBy),
  ).run();
}

export async function upsertGroupRoleAdmin(env, {
  userId,
  username,
  firstName,
  chatId,
  addedBy,
}) {
  await env.DB.prepare(`
    INSERT INTO telegram_admins
      (user_id, added_by, added_at, role, username, first_name, group_chat_id)
    VALUES (?, ?, datetime('now'), 'group', ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      added_by=excluded.added_by,
      added_at=datetime('now'),
      role='group',
      username=COALESCE(excluded.username, telegram_admins.username),
      first_name=COALESCE(excluded.first_name, telegram_admins.first_name),
      group_chat_id=excluded.group_chat_id
  `).bind(
    String(userId), String(addedBy), username || null, firstName || null, String(chatId),
  ).run();
}

export async function syncGroupAdminProfile(env, user) {
  if (!user?.id) return;
  const name = user.first_name || user.username || String(user.id);
  await env.DB.batch([
    env.DB.prepare(`
      UPDATE telegram_group_moderators
      SET display_name = ?, username = ?, first_name = ?
      WHERE user_id = ? AND enabled = 1
    `).bind(displayName(user), user.username || null, name, String(user.id)),
    env.DB.prepare(`
      UPDATE telegram_admins
      SET username = ?, first_name = ?
      WHERE user_id = ? AND role = 'group'
    `).bind(user.username || null, name, String(user.id)),
  ]);
}

export async function disableGroupModeratorEverywhere(env, userId) {
  await env.DB.prepare(`
    UPDATE telegram_group_moderators SET enabled = 0 WHERE user_id = ?
  `).bind(String(userId)).run();
}

export async function removeGroupModerator(env, chatId, userId) {
  await env.DB.prepare(`
    UPDATE telegram_group_moderators SET enabled = 0
    WHERE chat_id = ? AND user_id = ?
  `).bind(String(chatId), String(userId)).run();
  await env.DB.prepare(`
    DELETE FROM telegram_admins
    WHERE user_id = ? AND role = 'group'
      AND NOT EXISTS (
        SELECT 1 FROM telegram_group_moderators
        WHERE user_id = ? AND enabled = 1
      )
  `).bind(String(userId), String(userId)).run();
}

export async function listGroupModerators(env, chatId) {
  const result = await env.DB.prepare(`
    SELECT * FROM telegram_group_moderators
    WHERE chat_id = ? AND enabled = 1
    ORDER BY created_at
  `).bind(String(chatId)).all();
  return result.results || [];
}

export async function isGroupModerator(env, chatId, userId, ownerId) {
  if (String(userId) === String(ownerId)) return true;
  const row = await env.DB.prepare(`
    SELECT 1 AS allowed FROM telegram_group_moderators
    WHERE chat_id = ? AND user_id = ? AND enabled = 1
  `).bind(String(chatId), String(userId)).first();
  return Boolean(row?.allowed);
}

export async function isAnyGroupModerator(env, userId, ownerId) {
  if (String(userId) === String(ownerId)) return true;
  const row = await env.DB.prepare(`
    SELECT 1 AS allowed FROM telegram_group_moderators
    WHERE user_id = ? AND enabled = 1 LIMIT 1
  `).bind(String(userId)).first();
  return Boolean(row?.allowed);
}

export async function listModeratorGroups(env, userId, ownerId) {
  const owner = String(userId) === String(ownerId);
  const result = owner
    ? await env.DB.prepare(`SELECT * FROM telegram_group_configs WHERE enabled = 1 ORDER BY title`).all()
    : await env.DB.prepare(`
        SELECT c.* FROM telegram_group_configs c
        JOIN telegram_group_moderators m ON m.chat_id = c.chat_id
        WHERE m.user_id = ? AND m.enabled = 1 AND c.enabled = 1
        ORDER BY c.title
      `).bind(String(userId)).all();
  return result.results || [];
}

export async function listGroupContacts(env, chatId) {
  const result = await env.DB.prepare(`
    SELECT * FROM telegram_group_contacts
    WHERE chat_id = ? ORDER BY normalized_name, full_name, id
  `).bind(String(chatId)).all();
  return result.results || [];
}

export async function getGroupContact(env, contactId) {
  return env.DB.prepare('SELECT * FROM telegram_group_contacts WHERE id = ?')
    .bind(Number(contactId)).first();
}

export async function findIncorrectGroupContact(env, chatId, fullName) {
  return env.DB.prepare(`
    SELECT * FROM telegram_group_contacts
    WHERE chat_id = ? AND normalized_name = ? AND wrong_votes > 0
    ORDER BY wrong_votes DESC, updated_at DESC, id DESC
    LIMIT 1
  `).bind(String(chatId), normalizeSearchText(fullName)).first();
}

export async function upsertGroupContact(env, contact) {
  await env.DB.prepare(`
    INSERT INTO telegram_group_contacts
      (chat_id, full_name, normalized_name, aliases_json, phone, secondary_phone, note,
       source_user_id, source_message_id, approved_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(chat_id, phone) DO UPDATE SET
      full_name=excluded.full_name,
      normalized_name=excluded.normalized_name,
      aliases_json=excluded.aliases_json,
      secondary_phone=COALESCE(excluded.secondary_phone, telegram_group_contacts.secondary_phone),
      note=excluded.note,
      approved_by=excluded.approved_by,
      updated_at=datetime('now')
  `).bind(
    String(contact.chatId),
    contact.fullName,
    normalizeSearchText(contact.fullName),
    JSON.stringify(contact.aliases || []),
    contact.phone,
    contact.secondaryPhone || null,
    contact.note || null,
    contact.sourceUserId ? String(contact.sourceUserId) : null,
    contact.sourceMessageId ? String(contact.sourceMessageId) : null,
    String(contact.approvedBy),
  ).run();

  return env.DB.prepare(`
    SELECT * FROM telegram_group_contacts WHERE chat_id = ? AND phone = ?
  `).bind(String(contact.chatId), contact.phone).first();
}

export async function updateGroupContact(env, contactId, contact) {
  await env.DB.prepare(`
    UPDATE telegram_group_contacts
    SET full_name = ?, normalized_name = ?, phone = ?,
        secondary_phone = COALESCE(?, secondary_phone), note = ?,
        approved_by = ?, updated_at = datetime('now')
    WHERE id = ? AND chat_id = ?
  `).bind(
    contact.fullName,
    normalizeSearchText(contact.fullName),
    contact.phone,
    contact.secondaryPhone || null,
    contact.note || null,
    String(contact.approvedBy),
    Number(contactId),
    String(contact.chatId),
  ).run();
  return getGroupContact(env, contactId);
}

export async function replaceIncorrectGroupContact(env, contactId, contact) {
  const existing = await getGroupContact(env, contactId);
  if (!existing
      || String(existing.chat_id) !== String(contact.chatId)
      || existing.normalized_name !== normalizeSearchText(contact.fullName)
      || Number(existing.wrong_votes) < 1) {
    return null;
  }
  await env.DB.batch([
    env.DB.prepare(`
      UPDATE telegram_group_contacts
      SET full_name = ?, normalized_name = ?, phone = ?, secondary_phone = ?, note = ?,
          source_user_id = ?, source_message_id = ?, approved_by = ?,
          correct_votes = 0, wrong_votes = 0, last_verified_at = NULL,
          updated_at = datetime('now')
      WHERE id = ? AND chat_id = ? AND wrong_votes > 0
    `).bind(
      contact.fullName,
      normalizeSearchText(contact.fullName),
      contact.phone,
      contact.secondaryPhone || null,
      contact.note || null,
      contact.sourceUserId ? String(contact.sourceUserId) : null,
      contact.sourceMessageId ? String(contact.sourceMessageId) : null,
      String(contact.approvedBy),
      Number(contactId),
      String(contact.chatId),
    ),
    env.DB.prepare('DELETE FROM telegram_group_contact_votes WHERE contact_id = ?')
      .bind(Number(contactId)),
  ]);
  return getGroupContact(env, contactId);
}

export async function deleteGroupContact(env, contactId, chatId) {
  const result = await env.DB.prepare(`
    DELETE FROM telegram_group_contacts WHERE id = ? AND chat_id = ?
  `).bind(Number(contactId), String(chatId)).run();
  return Number(result.meta?.changes || 0) > 0;
}

export async function voteGroupContact(env, contactId, userId, vote) {
  const normalizedVote = Number(vote) === 1 ? 1 : -1;
  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO telegram_group_contact_votes (contact_id, user_id, vote, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(contact_id, user_id) DO UPDATE SET
        vote = excluded.vote, updated_at = datetime('now')
    `).bind(Number(contactId), String(userId), normalizedVote),
    env.DB.prepare(`
      UPDATE telegram_group_contacts
      SET correct_votes = (
            SELECT COUNT(*) FROM telegram_group_contact_votes
            WHERE contact_id = ? AND vote = 1
          ),
          wrong_votes = (
            SELECT COUNT(*) FROM telegram_group_contact_votes
            WHERE contact_id = ? AND vote = -1
          ),
          last_verified_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(Number(contactId), Number(contactId), Number(contactId)),
  ]);
  return getGroupContact(env, contactId);
}

export async function createGroupRequest(env, request) {
  const result = await env.DB.prepare(`
    INSERT INTO telegram_group_requests
      (chat_id, topic_id, kind, payload_json, source_user_id, source_message_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    String(request.chatId),
    request.topicId ? String(request.topicId) : null,
    request.kind,
    JSON.stringify(request.payload || {}),
    request.sourceUserId ? String(request.sourceUserId) : null,
    request.sourceMessageId ? String(request.sourceMessageId) : null,
  ).run();
  return Number(result.meta?.last_row_id);
}

export async function getGroupRequest(env, requestId) {
  const row = await env.DB.prepare('SELECT * FROM telegram_group_requests WHERE id = ?')
    .bind(Number(requestId)).first();
  return parseRequest(row);
}

export async function claimGroupRequest(env, requestId, moderatorId, nextStatus = 'processing') {
  const result = await env.DB.prepare(`
    UPDATE telegram_group_requests
    SET status = ?, locked_by = ?, updated_at = datetime('now')
    WHERE id = ? AND status = 'pending'
  `).bind(nextStatus, String(moderatorId), Number(requestId)).run();
  return Number(result.meta?.changes || 0) > 0;
}

export async function finishGroupRequest(env, requestId, status, moderatorId, payload) {
  await env.DB.prepare(`
    UPDATE telegram_group_requests
    SET status = ?, resolved_by = ?, payload_json = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(status, String(moderatorId), JSON.stringify(payload || {}), Number(requestId)).run();
}

export async function reopenGroupRequest(env, requestId) {
  await env.DB.prepare(`
    UPDATE telegram_group_requests
    SET status = 'pending', locked_by = NULL, updated_at = datetime('now')
    WHERE id = ?
  `).bind(Number(requestId)).run();
}

export async function saveRequestMessage(env, requestId, moderatorId, privateChatId, messageId) {
  await env.DB.prepare(`
    INSERT OR REPLACE INTO telegram_group_request_messages
      (request_id, moderator_id, private_chat_id, message_id)
    VALUES (?, ?, ?, ?)
  `).bind(Number(requestId), String(moderatorId), String(privateChatId), String(messageId)).run();
}

export async function listRequestMessages(env, requestId) {
  const result = await env.DB.prepare(`
    SELECT * FROM telegram_group_request_messages WHERE request_id = ?
  `).bind(Number(requestId)).all();
  return result.results || [];
}

export async function clearRequestMessages(env, requestId) {
  await env.DB.prepare('DELETE FROM telegram_group_request_messages WHERE request_id = ?')
    .bind(Number(requestId)).run();
}

export async function saveModeratorSession(env, session) {
  await env.DB.prepare(`
    INSERT INTO telegram_group_moderator_sessions
      (moderator_id, chat_id, state, request_id, draft_name, draft_phone, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(moderator_id) DO UPDATE SET
      chat_id=excluded.chat_id,
      state=excluded.state,
      request_id=excluded.request_id,
      draft_name=excluded.draft_name,
      draft_phone=excluded.draft_phone,
      updated_at=datetime('now')
  `).bind(
    String(session.moderatorId), String(session.chatId), session.state,
    session.requestId || null, session.draftName || null, session.draftPhone || null,
  ).run();
}

export async function getModeratorSession(env, moderatorId) {
  return env.DB.prepare('SELECT * FROM telegram_group_moderator_sessions WHERE moderator_id = ?')
    .bind(String(moderatorId)).first();
}

export async function clearModeratorSession(env, moderatorId) {
  await env.DB.prepare('DELETE FROM telegram_group_moderator_sessions WHERE moderator_id = ?')
    .bind(String(moderatorId)).run();
}

export async function isAllowedBot(env, chatId, botUserId) {
  const row = await env.DB.prepare(`
    SELECT 1 AS allowed FROM telegram_group_allowed_bots
    WHERE chat_id = ? AND bot_user_id = ?
  `).bind(String(chatId), String(botUserId)).first();
  return Boolean(row?.allowed);
}

export async function allowBot(env, chatId, bot, addedBy) {
  await env.DB.prepare(`
    INSERT OR REPLACE INTO telegram_group_allowed_bots
      (chat_id, bot_user_id, username, added_by)
    VALUES (?, ?, ?, ?)
  `).bind(String(chatId), String(bot.id), bot.username || null, String(addedBy)).run();
}

export async function createGroupImport(env, data, contacts) {
  const result = await env.DB.prepare(`
    INSERT INTO telegram_group_imports
      (chat_id, total_messages, found_count, skipped_count, duplicate_count, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    String(data.chatId), Number(data.totalMessages || 0), contacts.length,
    Number(data.skippedCount || 0), Number(data.duplicateCount || 0), String(data.createdBy),
  ).run();
  const importId = Number(result.meta?.last_row_id);
  const statements = contacts.map((contact) => env.DB.prepare(`
    INSERT OR IGNORE INTO telegram_group_import_contacts
      (import_id, phone, full_name, normalized_name, source_message_id)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    importId, contact.phone, contact.fullName, normalizeSearchText(contact.fullName),
    contact.sourceMessageId ? String(contact.sourceMessageId) : null,
  ));
  for (let index = 0; index < statements.length; index += 50) {
    await env.DB.batch(statements.slice(index, index + 50));
  }
  return getGroupImport(env, importId);
}

export async function getGroupImport(env, importId) {
  return env.DB.prepare('SELECT * FROM telegram_group_imports WHERE id = ?')
    .bind(Number(importId)).first();
}

export async function listGroupImportContacts(env, importId, limit = 20, offset = 0) {
  const result = await env.DB.prepare(`
    SELECT * FROM telegram_group_import_contacts
    WHERE import_id = ? ORDER BY normalized_name, phone LIMIT ? OFFSET ?
  `).bind(Number(importId), Number(limit), Number(offset)).all();
  return result.results || [];
}

export async function resolveGroupImport(env, importId, moderatorId, approve) {
  const claim = await env.DB.prepare(`
    UPDATE telegram_group_imports
    SET status = 'processing', resolved_by = ?, updated_at = datetime('now')
    WHERE id = ? AND status = 'pending'
  `).bind(String(moderatorId), Number(importId)).run();
  if (Number(claim.meta?.changes || 0) === 0) return false;

  try {
    if (approve) {
      await env.DB.prepare(`
        INSERT INTO telegram_group_contacts
          (chat_id, full_name, normalized_name, phone, source_message_id, approved_by, updated_at)
        SELECT i.chat_id, c.full_name, c.normalized_name, c.phone,
               c.source_message_id, ?, datetime('now')
        FROM telegram_group_import_contacts c
        JOIN telegram_group_imports i ON i.id = c.import_id
        WHERE c.import_id = ?
        ON CONFLICT(chat_id, phone) DO NOTHING
      `).bind(String(moderatorId), Number(importId)).run();
    }

    await env.DB.prepare(`
      UPDATE telegram_group_imports
      SET status = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(approve ? 'approved' : 'rejected', Number(importId)).run();
    return true;
  } catch (error) {
    await env.DB.prepare(`
      UPDATE telegram_group_imports
      SET status = 'pending', resolved_by = NULL, updated_at = datetime('now') WHERE id = ?
    `).bind(Number(importId)).run();
    throw error;
  }
}
