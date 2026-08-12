import { recognizeText as nativeRecognizeText } from '../../modules/ml-features';
import type { RecognizedLine } from '../types';

const NOISE_LINE = /^[0-9¥$.,\s\-~]+$/;
const HAS_JAPANESE = /[぀-ゟ゠-ヿ一-鿿]/;

export async function recognizeText(imageUri: string): Promise<RecognizedLine[]> {
  const lines = await nativeRecognizeText(imageUri);
  return lines
    .filter((line) => {
      const text = line.text.trim();
      return !NOISE_LINE.test(text) && HAS_JAPANESE.test(text);
    })
    .map((line) => ({
      text: line.text,
      boundingBox: { x: line.x, y: line.y, width: line.width, height: line.height },
    }));
}
