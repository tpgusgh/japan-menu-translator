import { recognizeText as nativeRecognizeText } from '../../modules/ml-features';
import type { RecognizedLine } from '../types';

const NOISE_LINE = /^[0-9¥$.,\s\-~]+$/;

export async function recognizeText(imageUri: string): Promise<RecognizedLine[]> {
  const lines = await nativeRecognizeText(imageUri);
  return lines
    .filter((line) => !NOISE_LINE.test(line.text.trim()))
    .map((line) => ({
      text: line.text,
      boundingBox: { x: line.x, y: line.y, width: line.width, height: line.height },
    }));
}
