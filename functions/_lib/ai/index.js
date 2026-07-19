import { analyzeWithAnthropic } from './providers/anthropic.js';
import { analyzeWithGemini } from './providers/gemini.js';
import { analyzeWithMock } from './providers/mock.js';
import { analyzeWithOpenAI } from './providers/openai.js';
import { analyzeWithOpenRouter } from './providers/openrouter.js';

const PROVIDERS = {
  anthropic: analyzeWithAnthropic,
  gemini: analyzeWithGemini,
  mock: analyzeWithMock,
  openai: analyzeWithOpenAI,
  openrouter: analyzeWithOpenRouter,
};

export async function analyzeBookMetadata(input) {
  const providerName = (input.env.AI_METADATA_PROVIDER || 'mock').trim().toLowerCase();
  const provider = PROVIDERS[providerName];
  if (!provider) {
    throw new Error(`AI_METADATA_PROVIDER noto'g'ri: ${providerName}`);
  }
  return provider(input);
}

export const supportedMetadataProviders = Object.freeze(Object.keys(PROVIDERS));
