const PHONE_PATTERN = /(?:\+?998[\s().-]*)?(?:\d[\s().-]*){9}/g;

const CYRILLIC_TO_LATIN = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 's', ч: 'ch', ш: 'sh', щ: 'sh',
  ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', қ: 'q', ғ: 'g', ҳ: 'h', ў: 'o',
};

const REQUEST_PHRASES = [
  'telefon nomeri', 'telefon raqami', 'telefonini', 'telefoni', 'telefon',
  'nomeri', 'nomerini', 'raqami', 'raqamini', 'kontakti', 'kontakt',
  'kimda bor', 'kim biladi', 'tashlanglar', 'tashlang', 'yuboringlar', 'yuboring',
  'beringlar', 'bering', 'kerak edi', 'kerak',
  'номер телефона', 'номер', 'телефон', 'контакт', 'у кого есть', 'скиньте',
];

const REQUEST_ACTIONS = [
  'kimda bor', 'kim biladi', 'tashlanglar', 'tashlang', 'yuboringlar', 'yuboring',
  'beringlar', 'bering', 'kerak edi', 'kerak', 'bormi',
  'у кого есть', 'скиньте', 'нужен', 'нужна',
];

const CONTACT_TERMS = [
  'telefon', 'nomer', 'raqam', 'kontakt',
  'номер', 'телефон', 'контакт',
];

const GENERIC_WORDS = new Set([
  'iltimos', 'bormi', 'bor', 'kimda', 'kim', 'shu', 'shuni', 'menga', 'bizga',
  'iltimos', 'please', 'нужен', 'нужна', 'пожалуйста',
]);

export function normalizeSearchText(value) {
  const lower = String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('uz')
    .replace(/[’‘`ʻʼ]/g, "'");
  let transliterated = '';
  for (const char of lower) transliterated += CYRILLIC_TO_LATIN[char] ?? char;
  return transliterated
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/'/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return null;
}

export function extractPhones(text) {
  const matches = String(text || '').match(PHONE_PATTERN) || [];
  return [...new Set(matches.map(normalizePhone).filter(Boolean))];
}

export function extractContactName(text, phone) {
  const withoutPhone = String(text || '')
    .replace(phone || '', ' ')
    .replace(PHONE_PATTERN, ' ')
    .replace(/\b(?:tel(?:efon)?|nomer(?:i|ini)?|raqam(?:i|ini)?|kontakt(?:i)?)\b/gi, ' ')
    .replace(/[|:;,()[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return withoutPhone.slice(0, 160);
}

export function extractRequestedName(text) {
  const original = String(text || '').trim();
  const normalized = normalizeSearchText(original);
  const mentionsContact = CONTACT_TERMS
    .some((phrase) => normalized.includes(normalizeSearchText(phrase)));
  const hasRequestAction = REQUEST_ACTIONS
    .some((phrase) => normalized.includes(normalizeSearchText(phrase)));
  const isRequest = mentionsContact && (hasRequestAction || original.includes('?'));
  if (!isRequest || extractPhones(original).length) return null;

  let candidate = normalized;
  for (const phrase of [...REQUEST_PHRASES].sort((a, b) => b.length - a.length)) {
    candidate = candidate.replaceAll(normalizeSearchText(phrase), ' ');
  }
  const words = candidate
    .replace(/\b([a-z]+?)(?:ning|ni)\b/g, '$1')
    .split(/\s+/)
    .filter((word) => word.length >= 2 && !GENERIC_WORDS.has(word));
  return words.join(' ').trim() || null;
}

function levenshtein(left, right) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

function similarity(left, right) {
  const maxLength = Math.max(left.length, right.length);
  return maxLength ? 1 - levenshtein(left, right) / maxLength : 1;
}

export function rankContacts(contacts, query) {
  const needle = normalizeSearchText(query);
  if (!needle) return [];
  return contacts
    .map((contact) => {
      const values = [
        contact.normalized_name,
        contact.full_name,
        contact.note,
        ...safeJsonArray(contact.aliases_json),
      ].map(normalizeSearchText).filter(Boolean);
      let score = 0;
      for (const value of values) {
        if (value === needle) score = Math.max(score, 1);
        else if (value.includes(needle) || needle.includes(value)) score = Math.max(score, 0.92);
        else {
          score = Math.max(score, similarity(value, needle));
          for (const token of value.split(' ')) score = Math.max(score, similarity(token, needle));
        }
      }
      return { ...contact, score };
    })
    .filter((contact) => contact.score >= 0.68)
    .sort((left, right) => right.score - left.score || left.full_name.localeCompare(right.full_name));
}

export function safeJsonArray(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function displayName(user) {
  return [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()
    || user?.username
    || String(user?.id || 'Noma’lum');
}

export function formatContactLine(contact) {
  const label = String(contact?.full_name || contact?.note || "Noma'lum").trim();
  return `${label}: ${contact?.phone || '-'}`;
}

function truncateCell(value, width) {
  const text = String(value || '');
  if (text.length <= width) return text.padEnd(width, ' ');
  return `${text.slice(0, Math.max(1, width - 1))}…`;
}

export function formatContactsTablePages(contacts, maxLength = 3800) {
  const sorted = [...contacts].sort((left, right) => (
    normalizeSearchText(left.full_name).localeCompare(normalizeSearchText(right.full_name), 'uz')
      || String(left.phone).localeCompare(String(right.phone))
  ));
  if (!sorted.length) return ['Telefonlar bazasi bo‘sh.'];

  const header = ' #   Ism yoki kasb             Telefon';
  const divider = '---  ------------------------  -------------';
  const rows = sorted.map((contact, index) => (
    `${String(index + 1).padStart(3, ' ')}  ${truncateCell(contact.full_name, 24)}  ${contact.phone}`
  ));
  const pages = [];
  let pageRows = [];
  for (const row of rows) {
    const candidate = [header, divider, ...pageRows, row].join('\n');
    if (candidate.length > maxLength && pageRows.length) {
      pages.push([header, divider, ...pageRows].join('\n'));
      pageRows = [row];
    } else {
      pageRows.push(row);
    }
  }
  if (pageRows.length) pages.push([header, divider, ...pageRows].join('\n'));
  return pages;
}

export function flattenTelegramExportText(value) {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';
  return value.map((part) => (
    typeof part === 'string' ? part : String(part?.text || '')
  )).join('');
}

export function extractContactsFromTelegramExport(payload, options = {}) {
  const allMessages = Array.isArray(payload?.messages)
    ? payload.messages
    : Array.isArray(payload?.chats?.list)
      ? payload.chats.list.flatMap((chat) => chat?.messages || [])
      : [];
  const topicId = String(options.topicId || '');
  const topicOf = (message) => message?.message_thread_id
    || message?.topic_id
    || message?.reply_to?.top_msg_id
    || null;
  const hasTopicMetadata = topicId && allMessages.some((message) => topicOf(message));
  const messages = hasTopicMetadata
    ? allMessages.filter((message) => String(topicOf(message) || '') === topicId)
    : allMessages;
  const byPhone = new Map();
  let skippedCount = 0;
  let duplicateCount = 0;

  for (const message of messages) {
    const contact = message?.contact_information || message?.contact || null;
    const contactPhone = normalizePhone(contact?.phone_number || contact?.phone || '');
    const contactName = [contact?.first_name, contact?.last_name].filter(Boolean).join(' ').trim();
    const text = flattenTelegramExportText(message?.text || message?.caption);
    const phones = contactPhone ? [contactPhone] : extractPhones(text);
    if (!phones.length) continue;

    for (const phone of phones) {
      const fullName = contactName || extractContactName(text, phone);
      if (!fullName || normalizeSearchText(fullName).length < 2) {
        skippedCount += 1;
        continue;
      }
      if (byPhone.has(phone)) duplicateCount += 1;
      byPhone.set(phone, {
        phone,
        fullName: fullName.slice(0, 160),
        sourceMessageId: message?.id || null,
      });
    }
  }

  return {
    contacts: [...byPhone.values()],
    totalMessages: messages.length,
    skippedCount,
    duplicateCount,
  };
}
