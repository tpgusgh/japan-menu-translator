import { getReadings } from '../../modules/ml-features';
import { kanaToHangul } from './kana-to-hangul';

export async function getPronunciation(japaneseText: string): Promise<string> {
  if (!japaneseText.trim()) return '';
  const tokens = await getReadings(japaneseText);
  return tokens.map((token) => kanaToHangul(token.reading)).join('');
}
