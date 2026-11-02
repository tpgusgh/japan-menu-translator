jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => store[k] ?? null),
      setItem: jest.fn(async (k: string, v: string) => {
        store[k] = v;
      }),
      __store: store,
    },
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getJpyToKrw, parseYen, formatKrw, per100Yen } from './exchange';

const store = (AsyncStorage as unknown as { __store: Record<string, string> }).__store;

describe('parseYen', () => {
  it('reads the common OCR price shapes', () => {
    expect(parseYen('¥680')).toBe(680);
    expect(parseYen('680円')).toBe(680);
    expect(parseYen('1,280円')).toBe(1280);
    expect(parseYen('¥ 1,280')).toBe(1280);
  });

  it('returns null when there is no usable amount', () => {
    expect(parseYen(null)).toBeNull();
    expect(parseYen('円')).toBeNull();
    expect(parseYen('0円')).toBeNull();
  });
});

describe('formatKrw', () => {
  it('rounds to the nearest 10 won with a 약 prefix', () => {
    expect(formatKrw(480, 8.4768)).toBe('약 4,070원');
    expect(formatKrw(1280, 8.4768)).toBe('약 10,850원');
  });

  it('shows the rate per 100 yen', () => {
    expect(per100Yen(8.4768)).toBe('848원');
  });
});

describe('getJpyToKrw', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    Object.keys(store).forEach((k) => delete store[k]);
  });

  it('fetches, caches, and then serves the cache without another request', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ date: '2026-10-09', rates: { KRW: 8.4768 } }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    expect(await getJpyToKrw()).toEqual({ rate: 8.4768, date: '2026-10-09', stale: false });
    expect(await getJpyToKrw()).toEqual({ rate: 8.4768, date: '2026-10-09', stale: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the saved rate, marked stale, when the network fails', async () => {
    store.jpy_krw_rate = JSON.stringify({ rate: 9, date: '2026-10-01', fetchedAt: 0 });
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

    expect(await getJpyToKrw()).toEqual({ rate: 9, date: '2026-10-01', stale: true });
  });

  it('returns null rather than guessing when offline with nothing saved', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

    expect(await getJpyToKrw()).toBeNull();
  });
});
