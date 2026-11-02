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

  it('kuromoji가 읽기를 "*"로 반환하면 원문(surface)으로 대체하고 별표를 남기지 않는다', async () => {
    (getReadings as jest.Mock).mockResolvedValue([{ surface: '400', reading: '*' }]);
    const result = await getPronunciation('400');
    expect(result).toBe('400');
    expect(result).not.toContain('*');
  });

  it('조사 は는 표기(하)가 아니라 발음(와)로 읽는다', async () => {
    (getReadings as jest.Mock).mockResolvedValue([
      { surface: '名前', reading: 'ナマエ' },
      { surface: 'は', reading: 'ハ' },
      { surface: '何', reading: 'ナニ' },
      { surface: 'です', reading: 'デス' },
      { surface: 'か', reading: 'カ' },
    ]);
    const result = await getPronunciation('名前は何ですか');
    expect(result).toBe('나마에와난데스카');
  });

  it('조사 へ는 표기(헤)가 아니라 발음(에)로 읽는다', async () => {
    (getReadings as jest.Mock).mockResolvedValue([
      { surface: '東京', reading: 'トウキョウ' },
      { surface: 'へ', reading: 'ヘ' },
    ]);
    const result = await getPronunciation('東京へ');
    expect(result).toBe('토우쿄우에');
  });

  it('何が처럼 です/だ가 안 이어지면 나니 그대로 둔다', async () => {
    (getReadings as jest.Mock).mockResolvedValue([
      { surface: '何', reading: 'ナニ' },
      { surface: 'が', reading: 'ガ' },
    ]);
    const result = await getPronunciation('何が');
    expect(result).toBe('나니가');
  });
});
