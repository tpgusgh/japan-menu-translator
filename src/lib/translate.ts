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

export async function translate(
  text: string,
  from: LangCode,
  to: LangCode,
  mode: TranslateMode = 'offline'
): Promise<string> {
  if (!text.trim()) return '';
  if (mode === 'online') {
    try {
      return await translateOnline(text, from, to);
    } catch {
      return nativeTranslateText(text, from, to);
    }
  }
  return nativeTranslateText(text, from, to);
}
