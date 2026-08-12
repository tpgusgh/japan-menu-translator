import {
  isModelDownloaded as nativeIsModelDownloaded,
  downloadModel as nativeDownloadModel,
  translateText as nativeTranslateText,
} from '../../modules/ml-features';
import type { LangCode } from '../types';

export async function isModelDownloaded(lang: LangCode): Promise<boolean> {
  return nativeIsModelDownloaded(lang);
}

export async function downloadModel(lang: LangCode): Promise<void> {
  return nativeDownloadModel(lang);
}

export type TranslateMode = 'offline' | 'online';

async function translateOnline(text: string, from: LangCode, to: LangCode): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`online translate failed: ${res.status}`);
  const data = await res.json();
  return (data[0] as [string, string][]).map(([sentence]) => sentence).join('');
}

// Same menu term (생맥주, 唐揚げ, ...) shows up repeatedly across items and rescans --
// cache by promise (not just resolved value) so concurrent calls for the same text
// also collapse into one underlying request instead of firing duplicates.
const cache = new Map<string, Promise<string>>();

function cacheKey(text: string, from: LangCode, to: LangCode, mode: TranslateMode): string {
  return `${mode}:${from}:${to}:${text}`;
}

async function translateUncached(text: string, from: LangCode, to: LangCode, mode: TranslateMode): Promise<string> {
  if (mode === 'online') {
    try {
      return await translateOnline(text, from, to);
    } catch {
      return nativeTranslateText(text, from, to);
    }
  }
  return nativeTranslateText(text, from, to);
}

export async function translate(
  text: string,
  from: LangCode,
  to: LangCode,
  mode: TranslateMode = 'offline'
): Promise<string> {
  if (!text.trim()) return '';
  const key = cacheKey(text, from, to, mode);
  const cached = cache.get(key);
  if (cached) return cached;
  const promise = translateUncached(text, from, to, mode);
  cache.set(key, promise);
  return promise;
}

// Batches uncached texts into one online request (numbered lines) instead of one
// network round trip per item -- cuts request count against the free endpoint and
// lowers rate-limit risk on a dense menu. Falls back to per-text offline translation
// on any network/parse failure, so a malformed batch response never drops items.
async function translateOnlineBatch(texts: string[], from: LangCode, to: LangCode): Promise<string[]> {
  const combined = texts.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(combined)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`online translate failed: ${res.status}`);
  const data = await res.json();
  const translated = (data[0] as [string, string][]).map(([sentence]) => sentence).join('');
  const lines = translated
    .split('\n')
    .map((line) => line.replace(/^\s*\d+\.\s*/, '').trim())
    .filter((line) => line.length > 0);
  if (lines.length !== texts.length) throw new Error('batch translate line count mismatch');
  return lines;
}

export async function translateBatch(
  texts: string[],
  from: LangCode,
  to: LangCode,
  mode: TranslateMode = 'offline'
): Promise<string[]> {
  if (texts.length === 0) return [];

  const results = new Array<string>(texts.length);
  const uncachedTexts: string[] = [];

  texts.forEach((text, i) => {
    if (!text.trim()) {
      results[i] = '';
    } else if (!cache.has(cacheKey(text, from, to, mode))) {
      uncachedTexts.push(text);
    }
  });

  // One batch request prefills the cache for every uncached text; the per-text
  // pass below then just reads from cache (or falls back per-item if the batch
  // request failed or wasn't attempted, e.g. offline mode or a single item).
  if (mode === 'online' && uncachedTexts.length > 1) {
    try {
      const batchResults = await translateOnlineBatch(uncachedTexts, from, to);
      uncachedTexts.forEach((text, i) => {
        cache.set(cacheKey(text, from, to, mode), Promise.resolve(batchResults[i]));
      });
    } catch {
      // per-text fallback below handles this
    }
  }

  await Promise.all(
    texts.map(async (text, i) => {
      if (results[i] === undefined) {
        results[i] = await translate(text, from, to, mode);
      }
    })
  );

  return results;
}
