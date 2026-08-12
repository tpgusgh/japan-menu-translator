jest.mock('../../modules/ml-features', () => ({
  recognizeText: jest.fn(),
}));

import { recognizeText as nativeRecognizeText } from '../../modules/ml-features';
import { recognizeText } from './ocr';

describe('recognizeText', () => {
  it('drops lines with no Japanese characters (UI noise) and pure price lines', async () => {
    (nativeRecognizeText as jest.Mock).mockResolvedValue([
      { text: '寿司', x: 0, y: 0, width: 10, height: 10 },
      { text: 'HTTPS', x: 0, y: 0, width: 10, height: 10 },
      { text: 'fus', x: 0, y: 0, width: 10, height: 10 },
      { text: '1,000', x: 0, y: 0, width: 10, height: 10 },
      { text: '天ぷら 800円', x: 0, y: 0, width: 10, height: 10 },
    ]);

    const result = await recognizeText('file://test.jpg');

    expect(result.map((line) => line.text)).toEqual(['寿司', '天ぷら']);
  });

  it('splits a price glued to the name onto its own field', async () => {
    (nativeRecognizeText as jest.Mock).mockResolvedValue([
      { text: '寿司', x: 0, y: 0, width: 10, height: 10 },
      { text: '天ぷら 800円', x: 0, y: 0, width: 10, height: 10 },
      { text: 'ラーメン ￥900', x: 0, y: 0, width: 10, height: 10 },
    ]);

    const result = await recognizeText('file://test.jpg');

    expect(result.map((line) => line.price)).toEqual([null, '800円', '￥900']);
  });
});
