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

export async function translate(text: string, from: LangCode, to: LangCode): Promise<string> {
  if (!text.trim()) return '';
  return nativeTranslateText(text, from, to);
}
