import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ExchangeRate {
  /** KRW per 1 JPY */
  rate: number;
  /** reference date from the provider, YYYY-MM-DD */
  date: string;
  /** true when this is a saved rate because a fresh one could not be fetched */
  stale: boolean;
}

interface CachedRate {
  rate: number;
  date: string;
  fetchedAt: number;
}

const STORAGE_KEY = 'jpy_krw_rate';
// The provider (ECB reference rates) updates once per working day, so there is no gain in
// asking more often than a few times a day.
const FRESH_MS = 6 * 60 * 60 * 1000;
const TIMEOUT_MS = 6000;
const URL = 'https://api.frankfurter.dev/v1/latest?base=JPY&symbols=KRW';

async function readCache(): Promise<CachedRate | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRate;
    return typeof parsed.rate === 'number' && parsed.rate > 0 ? parsed : null;
  } catch {
    return null;
  }
}

async function fetchRate(): Promise<CachedRate> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`exchange rate request failed: ${res.status}`);
    const data = await res.json();
    const rate = data?.rates?.KRW;
    if (typeof rate !== 'number' || !(rate > 0)) throw new Error('exchange rate response had no KRW rate');
    return { rate, date: String(data.date ?? ''), fetchedAt: Date.now() };
  } finally {
    clearTimeout(timer);
  }
}

// Returns null when there is neither a fresh nor a saved rate -- callers then show the yen
// price alone rather than guessing a number.
export async function getJpyToKrw(): Promise<ExchangeRate | null> {
  const cached = await readCache();
  if (cached && Date.now() - cached.fetchedAt < FRESH_MS) {
    return { rate: cached.rate, date: cached.date, stale: false };
  }
  try {
    const fresh = await fetchRate();
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)).catch(() => {});
    return { rate: fresh.rate, date: fresh.date, stale: false };
  } catch {
    return cached ? { rate: cached.rate, date: cached.date, stale: true } : null;
  }
}

// Menu prices come out of OCR as "¥680", "680円", "1,280円". Returns the yen amount or null.
export function parseYen(price: string | null): number | null {
  if (!price) return null;
  const digits = price.replace(/[,\s]/g, '').match(/\d+/);
  if (!digits) return null;
  const yen = Number(digits[0]);
  return yen > 0 ? yen : null;
}

// Rounded to the nearest 10 won: a 1-won figure would look more precise than a printed
// menu price converted at a daily reference rate really is.
export function formatKrw(yen: number, rate: number): string {
  const won = Math.round((yen * rate) / 10) * 10;
  return `약 ${won.toLocaleString('ko-KR')}원`;
}

export function per100Yen(rate: number): string {
  return `${Math.round(rate * 100).toLocaleString('ko-KR')}원`;
}
