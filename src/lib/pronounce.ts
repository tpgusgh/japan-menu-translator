import { getReadings } from '../../modules/ml-features';
import { kanaToHangul } from './kana-to-hangul';

const cache = new Map<string, Promise<string>>();

export async function getPronunciation(japaneseText: string): Promise<string> {
  if (!japaneseText.trim()) return '';
  const cached = cache.get(japaneseText);
  if (cached) return cached;
  const promise = getReadings(japaneseText).then((tokens) =>
    tokens
      .map((token) => kanaToHangul(!token.reading || token.reading === '*' ? token.surface : token.reading))
      .join('')
  );
  cache.set(japaneseText, promise);
  return promise;
}
