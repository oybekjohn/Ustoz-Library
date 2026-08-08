/**
 * Matn asosida JSON qaytaruvchi umumiy AI qatlami.
 *
 * Kitob metadatasidan farqli o'laroq (u PDF vision ishlatadi), taqdimot,
 * video va test uchun bizga faqat matn tahlili kerak. Shu sababli bu modul
 * yengil: bitta system + user prompt yuboradi va JSON obyekt qaytaradi.
 */

import { parseJsonText, readJsonResponse } from './common.js';

// OpenRouter uchun standart model. Sozlanmagan bo'lsa yoki eskirgan bepul
// model qolib ketgan bo'lsa shu ishlatiladi.
export const DEFAULT_OPENROUTER_MODEL = 'anthropic/claude-haiku-4.5';
const LEGACY_MODELS = new Set(['openrouter/free', 'openrouter/auto', '']);

const REQUEST_TIMEOUT_MS = 45_000;

export function resolveOpenRouterModel(env) {
  const configured = String(env.OPENROUTER_METADATA_MODEL || '').trim();
  return LEGACY_MODELS.has(configured) ? DEFAULT_OPENROUTER_MODEL : configured;
}

// Anthropic (to'g'ridan-to'g'ri Claude API) uchun standart model
export const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';

export function resolveAnthropicModel(env) {
  const configured = String(env.ANTHROPIC_METADATA_MODEL || '').trim();
  return configured || DEFAULT_ANTHROPIC_MODEL;
}

function timeoutSignal(ms) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

async function viaOpenRouter({ env, system, user, maxTokens }) {
  if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY sozlanmagan');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.PUBLIC_SITE_URL || 'https://dl-library.uz',
      'X-Title': env.OPENROUTER_SITE_TITLE || 'DL Library',
    },
    body: JSON.stringify({
      model: resolveOpenRouterModel(env),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      max_tokens: maxTokens,
      temperature: 0.2,
    }),
    signal: timeoutSignal(REQUEST_TIMEOUT_MS),
  });

  const payload = await readJsonResponse(response, 'OpenRouter');
  const text = payload?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('OpenRouter matnli natija qaytarmadi');
  }
  return parseJsonText(text);
}

async function viaAnthropic({ env, system, user, maxTokens }) {
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY sozlanmagan');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: resolveAnthropicModel(env),
      system,
      messages: [{ role: 'user', content: user }],
      max_tokens: maxTokens,
      temperature: 0.2,
    }),
    signal: timeoutSignal(REQUEST_TIMEOUT_MS),
  });

  const payload = await readJsonResponse(response, 'Anthropic');
  const text = payload?.content?.find((part) => part.type === 'text')?.text;
  if (!text) throw new Error('Anthropic matnli natija qaytarmadi');
  return parseJsonText(text);
}

async function viaOpenAI({ env, system, user, maxTokens }) {
  if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY sozlanmagan');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.OPENAI_METADATA_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      max_tokens: maxTokens,
      temperature: 0.2,
    }),
    signal: timeoutSignal(REQUEST_TIMEOUT_MS),
  });

  const payload = await readJsonResponse(response, 'OpenAI');
  const text = payload?.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenAI matnli natija qaytarmadi');
  return parseJsonText(text);
}

async function viaGemini({ env, system, user, maxTokens }) {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY sozlanmagan');
  const model = env.GEMINI_METADATA_MODEL || 'gemini-2.0-flash';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: maxTokens,
          temperature: 0.2,
        },
      }),
      signal: timeoutSignal(REQUEST_TIMEOUT_MS),
    },
  );

  const payload = await readJsonResponse(response, 'Gemini');
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini matnli natija qaytarmadi');
  return parseJsonText(text);
}

// Testlar va AI o'chirilgan holat uchun: hech narsa qaytarmaydi,
// chaqiruvchi zaxira (fallback) qiymatlarini ishlatadi.
async function viaMock() {
  return null;
}

const PROVIDERS = {
  openrouter: viaOpenRouter,
  anthropic: viaAnthropic,
  openai: viaOpenAI,
  gemini: viaGemini,
  mock: viaMock,
};

/** Provayder uchun kalit mavjudmi? */
function hasKey(env, name) {
  const keys = {
    anthropic: env.ANTHROPIC_API_KEY,
    openrouter: env.OPENROUTER_API_KEY,
    openai: env.OPENAI_API_KEY,
    gemini: env.GEMINI_API_KEY,
    mock: true,
  };
  return Boolean(keys[name]);
}

/**
 * Asosiy provayder ishlamay qolsa (kalit eskirgan, kvota tugagan, API uzilgan)
 * material qo'shish oqimi to'xtab qolmasligi kerak. Shu sababli kaliti mavjud
 * boshqa provayderlar zaxira sifatida ketma-ket sinab ko'riladi.
 */
function providerChain(env) {
  const primary = String(env.AI_METADATA_PROVIDER || 'mock').trim().toLowerCase();
  if (primary === 'mock') return ['mock'];

  const chain = [primary];
  for (const candidate of ['anthropic', 'openrouter', 'openai', 'gemini']) {
    if (candidate !== primary && hasKey(env, candidate)) chain.push(candidate);
  }
  return chain;
}

/**
 * Provayderdan JSON obyekt so'raydi.
 * @returns {Promise<object|null>} mock provayderda null qaytadi.
 */
export async function requestJson({ env, system, user, maxTokens = 1200 }) {
  const chain = providerChain(env);
  let lastError = null;

  for (const name of chain) {
    const provider = PROVIDERS[name];
    if (!provider) {
      lastError = new Error(`AI_METADATA_PROVIDER noto'g'ri: ${name}`);
      continue;
    }
    try {
      return await provider({ env, system, user, maxTokens });
    } catch (error) {
      lastError = error;
      console.error(`AI provayder "${name}" ishlamadi:`, error?.message || error);
    }
  }

  throw lastError || new Error('AI provayder topilmadi');
}

export function isAiConfigured(env) {
  const name = String(env.AI_METADATA_PROVIDER || 'mock').trim().toLowerCase();
  if (name === 'mock') return false;
  const keyByProvider = {
    openrouter: env.OPENROUTER_API_KEY,
    anthropic: env.ANTHROPIC_API_KEY,
    openai: env.OPENAI_API_KEY,
    gemini: env.GEMINI_API_KEY,
  };
  return Boolean(keyByProvider[name]);
}
