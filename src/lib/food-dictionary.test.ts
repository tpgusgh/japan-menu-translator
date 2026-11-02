import { lookupFoodTerm } from './food-dictionary';

describe('lookupFoodTerm', () => {
  it('matches across hiragana/katakana and full-width variants', () => {
    expect(lookupFoodTerm('タコヤキ')?.translated).toBe('다코야키');
    expect(lookupFoodTerm('◆焼き鳥')?.translated).toBe('닭꼬치');
  });

  it('tolerates one OCR-confused glyph in a long term', () => {
    // ラーメン's ー misread as 一, plus ト→卜-style slip on a long term
    expect(lookupFoodTerm('とんこつラ一メン')?.translated).toBe('돈코츠 라멘');
    expect(lookupFoodTerm('とんこつラーメソ')?.translated).toBe('돈코츠 라멘');
  });

  it('does not fuzzy-match unrelated short text', () => {
    expect(lookupFoodTerm('本日休業')).toBeNull();
  });

  it('survives a dropped handakuten and 餃/鮫 confusion on short terms', () => {
    expect(lookupFoodTerm('天ぶら')?.translated).toBe('튀김(텐푸라)');
    expect(lookupFoodTerm('鮫子')?.translated).toBe('교자');
  });
});
