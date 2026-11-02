import { getReadings } from '../../modules/ml-features';
import { kanaToHangul } from './kana-to-hangul';

const cache = new Map<string, Promise<string>>();

// kuromoji's `reading` field is the orthographic reading, not the spoken one --
// it misses two well-known kana-usage exceptions:
//  - standalone は as a particle is spoken "わ", never "は"
//  - standalone へ as a particle is spoken "え", never "へ"
// A single-character token of either kana is, in practice, always the particle
// (their content-word readings never surface as a bare 1-char token), so this is
// safe without needing part-of-speech info.
function baseReading(token: { surface: string; reading: string }): string {
  return !token.reading || token.reading === '*' ? token.surface : token.reading;
}

function followedByDesu(nextSurface: string | undefined): boolean {
  if (!nextSurface) return false;
  return nextSurface.startsWith('です') || nextSurface.startsWith('でしょう') || nextSurface === 'だ';
}

export async function getPronunciation(japaneseText: string): Promise<string> {
  if (!japaneseText.trim()) return '';
  const cached = cache.get(japaneseText);
  if (cached) return cached;
  const promise = getReadings(japaneseText).then((tokens) =>
    tokens
      .map((token, i) => {
        const reading = baseReading(token);
        // 何(なに) is spoken "なん" right before です/だ/でしょう -- "何ですか" is
        // always "なんですか", never "なにですか".
        if (token.surface === '何' && reading === 'ナニ' && followedByDesu(tokens[i + 1]?.surface)) {
          return kanaToHangul('ナン');
        }
        if (token.surface === 'は') return kanaToHangul('ワ');
        if (token.surface === 'へ') return kanaToHangul('エ');
        return kanaToHangul(reading);
      })
      .join('')
  );
  cache.set(japaneseText, promise);
  return promise;
}
