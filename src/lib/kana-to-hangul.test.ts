import { kanaToHangul, katakanaToHiragana } from './kana-to-hangul';

describe('katakanaToHiragana', () => {
  it('가타카나를 히라가나로 바꾸되 장음 기호는 그대로 둔다', () => {
    expect(katakanaToHiragana('ラーメン')).toBe('らーめん');
  });
});

describe('kanaToHangul', () => {
  it('ラーメン(장음 생략)을 라멘으로 변환한다', () => {
    expect(kanaToHangul('ラーメン')).toBe('라멘');
  });

  it('ブタニク(돈육)를 부타니쿠로 변환한다', () => {
    expect(kanaToHangul('ブタニク')).toBe('부타니쿠');
  });

  it('促音(っ)을 다음 자음 계열에 맞는 받침으로 근사 변환한다', () => {
    expect(kanaToHangul('がっこう')).toBe('각코우');
  });

  it('요음(きょ)을 하나의 음절로 변환한다', () => {
    expect(kanaToHangul('きょう')).toBe('쿄우');
  });

  it('끝의 ん을 앞 음절 받침(ㄴ)으로 붙인다', () => {
    expect(kanaToHangul('ほん')).toBe('혼');
  });

  it('작은 카나 결합(ふぇ 등)으로 만들어지는 외래어 표기(パフェ)를 변환한다', () => {
    expect(kanaToHangul('パフェ')).toBe('파페');
  });
});
