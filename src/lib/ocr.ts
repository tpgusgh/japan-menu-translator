import { recognizeText as nativeRecognizeText } from '../../modules/ml-features';
import type { RecognizedLine } from '../types';

const NOISE_LINE = /^[0-9¥$.,\s\-~]+$/;
const JAPANESE_CHAR = /[぀-ゟ゠-ヿ一-鿿]/g;
const LATIN_LETTER = /[A-Za-z]/g;
// ponytail: only catches price glued to the name on one OCR line (e.g. "天ぷら 800円").
// price on its own separate line still gets dropped as noise; pair-by-proximity if that matters later.
const PRICE_PATTERN = /[￥¥]\s?[\d,]+|[\d,]+\s?円/;

// ML Kit's on-device confidence score is unreliable (often 0/null depending on Play
// Services version), so this compares Japanese-vs-Latin letter counts instead --
// deterministic and catches the common misread failure mode: garbled Latin text
// from noisy backgrounds (UI chrome, glare) that happens to contain a stray
// Japanese-looking glyph. Digits/symbols/prices are ignored either way, so real
// items like "天ぷら800円" still pass.
function isMostlyJapanese(text: string): boolean {
  const japaneseCount = (text.match(JAPANESE_CHAR) || []).length;
  const latinCount = (text.match(LATIN_LETTER) || []).length;
  return japaneseCount > latinCount;
}

export async function recognizeText(imageUri: string): Promise<RecognizedLine[]> {
  const lines = await nativeRecognizeText(imageUri);
  return lines
    .map((line) => ({ ...line, text: line.text.trim() }))
    .filter((line) => !NOISE_LINE.test(line.text) && isMostlyJapanese(line.text))
    .map((line) => {
      const priceMatch = line.text.match(PRICE_PATTERN);
      const price = priceMatch ? priceMatch[0].replace(/\s+/g, '') : null;
      const text = priceMatch ? line.text.replace(priceMatch[0], '').trim() : line.text;
      return {
        text,
        price,
        orientation: line.orientation,
        boundingBox: { x: line.x, y: line.y, width: line.width, height: line.height },
      };
    });
}
