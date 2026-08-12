import { recognizeText as nativeRecognizeText } from '../../modules/ml-features';
import type { RecognizedLine } from '../types';

const NOISE_LINE = /^[0-9¥$.,\s\-~]+$/;
const HAS_JAPANESE = /[぀-ゟ゠-ヿ一-鿿]/;
// ponytail: only catches price glued to the name on one OCR line (e.g. "天ぷら 800円").
// price on its own separate line still gets dropped as noise; pair-by-proximity if that matters later.
const PRICE_PATTERN = /[￥¥]\s?[\d,]+|[\d,]+\s?円/;

export async function recognizeText(imageUri: string): Promise<RecognizedLine[]> {
  const lines = await nativeRecognizeText(imageUri);
  return lines
    .map((line) => ({ ...line, text: line.text.trim() }))
    .filter((line) => !NOISE_LINE.test(line.text) && HAS_JAPANESE.test(line.text))
    .map((line) => {
      const priceMatch = line.text.match(PRICE_PATTERN);
      const price = priceMatch ? priceMatch[0].replace(/\s+/g, '') : null;
      const text = priceMatch ? line.text.replace(priceMatch[0], '').trim() : line.text;
      return {
        text,
        price,
        boundingBox: { x: line.x, y: line.y, width: line.width, height: line.height },
      };
    });
}
