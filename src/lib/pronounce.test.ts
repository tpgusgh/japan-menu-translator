jest.mock('../../modules/ml-features', () => ({
  getReadings: jest.fn(),
}));

import { getReadings } from '../../modules/ml-features';
import { getPronunciation } from './pronounce';

describe('getPronunciation', () => {
  it('토큰 읽기를 한글 발음으로 이어붙인다', async () => {
    (getReadings as jest.Mock).mockResolvedValue([{ surface: '豚肉', reading: 'ブタニク' }]);
    const result = await getPronunciation('豚肉');
    expect(result).toBe('부타니쿠');
  });

  it('여러 토큰을 순서대로 이어붙인다', async () => {
    (getReadings as jest.Mock).mockResolvedValue([
      { surface: '本', reading: 'ホン' },
      { surface: 'です', reading: 'デス' },
    ]);
    const result = await getPronunciation('本です');
    expect(result).toBe('혼데스');
  });
});
