import { recognizeText as nativeRecognizeText } from '../../modules/ml-features';
import type { RecognizedLine } from '../types';

const NOISE_LINE = /^[0-9¥$.,\s\-~]+$/;
const JAPANESE_CHAR = /[぀-ゟ゠-ヿ一-鿿]/g;
const LATIN_LETTER = /[A-Za-z]/g;
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

const PRICE_ONLY = /^\s*(?:[￥¥]\s?[\d,]+|[\d,]+\s?円)\s*$/;
const LEADING_BULLET = /^[◆◇●○■□★☆※・·\-*▶▷>]+\s*/;

type Box = { x: number; y: number; width: number; height: number };
type Parsed = RecognizedLine & { boundingBox: Box };

// A menu often puts the price in its own OCR block next to the name ("唐揚げ" ... "￥680").
// Attach each price-only block to the nearest priceless name: first on the same row (to the
// right, the usual layout), else directly below (vertical/stacked layout).
function attachPrice(price: Parsed, names: Parsed[]): Parsed | null {
  const p = price.boundingBox;
  let best: Parsed | null = null;
  let bestGap = Infinity;
  for (const name of names) {
    if (name.price) continue;
    const n = name.boundingBox;
    const sameRow = Math.abs(p.y + p.height / 2 - (n.y + n.height / 2)) <= Math.max(n.height, p.height) * 0.6;
    const rightGap = p.x - (n.x + n.width);
    const below = p.y >= n.y && p.y - (n.y + n.height) <= n.height * 2;
    const overlapsX = p.x < n.x + n.width && p.x + p.width > n.x;
    const gap = sameRow && rightGap >= -n.width * 0.2 ? Math.max(rightGap, 0) : below && overlapsX ? p.y - (n.y + n.height) + 1e5 : Infinity;
    if (gap < bestGap) {
      bestGap = gap;
      best = name;
    }
  }
  return best;
}

export async function recognizeText(imageUri: string): Promise<RecognizedLine[]> {
  const raw = await nativeRecognizeText(imageUri);
  const names: Parsed[] = [];
  const priceOnly: Parsed[] = [];

  for (const line of raw) {
    const text = line.text.normalize('NFKC').trim().replace(LEADING_BULLET, '');
    const boundingBox = { x: line.x, y: line.y, width: line.width, height: line.height };
    if (PRICE_ONLY.test(text)) {
      priceOnly.push({ text: '', price: text.replace(/\s+/g, ''), orientation: line.orientation, boundingBox });
      continue;
    }
    if (NOISE_LINE.test(text) || !isMostlyJapanese(text)) continue;
    const priceMatch = text.match(PRICE_PATTERN);
    const price = priceMatch ? priceMatch[0].replace(/\s+/g, '') : null;
    const name = priceMatch ? text.replace(priceMatch[0], '').trim() : text;
    // A block that was just a price glued to nothing (e.g. "890円" matched by PRICE_PATTERN
    // only after other text) leaves an empty name -- drop it instead of an empty card.
    if (name.length === 0) continue;
    names.push({ text: name, price, orientation: line.orientation, boundingBox });
  }

  for (const price of priceOnly) {
    const target = attachPrice(price, names);
    if (target) target.price = price.price;
  }
  return names;
}
