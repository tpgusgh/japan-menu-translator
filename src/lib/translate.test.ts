jest.mock('../../modules/ml-features', () => ({
  isModelDownloaded: jest.fn(),
  downloadModel: jest.fn(),
  translateText: jest.fn(),
}));

import { translateText as nativeTranslateText } from '../../modules/ml-features';
import { translate, translateBatch } from './translate';

describe('translate', () => {
  beforeEach(() => {
    (nativeTranslateText as jest.Mock).mockReset();
    (nativeTranslateText as jest.Mock).mockImplementation((text: string) => Promise.resolve(`KO:${text}`));
  });

  it('caches repeated offline translations instead of calling native again', async () => {
    await translate('寿司', 'ja', 'ko', 'offline');
    await translate('寿司', 'ja', 'ko', 'offline');

    expect(nativeTranslateText).toHaveBeenCalledTimes(1);
  });
});

describe('translateBatch', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    (nativeTranslateText as jest.Mock).mockReset();
    (nativeTranslateText as jest.Mock).mockImplementation((text: string) => Promise.resolve(`KO:${text}`));
  });

  it('falls back to per-text translation when the batch response line count mismatches', async () => {
    globalThis.fetch = jest.fn().mockImplementation((url: string) => {
      const q = decodeURIComponent(url.split('q=')[1]);
      // Batch request (numbered, newline-joined) comes back with only one line --
      // a malformed response the code must detect and recover from per-item.
      const body = q.includes('\n')
        ? [[['한 줄만 옴', 'x']]]
        : [[[`ONLINE:${q}`, 'x']]];
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
    }) as unknown as typeof fetch;

    const result = await translateBatch(['寿司', '天ぷら'], 'ja', 'ko', 'online');

    expect(result).toEqual(['ONLINE:寿司', 'ONLINE:天ぷら']);
  });
});
