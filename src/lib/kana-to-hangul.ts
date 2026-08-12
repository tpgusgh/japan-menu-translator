const BASE_TABLE: Record<string, string> = {
  あ: '아', い: '이', う: '우', え: '에', お: '오',
  か: '카', き: '키', く: '쿠', け: '케', こ: '코',
  さ: '사', し: '시', す: '스', せ: '세', そ: '소',
  た: '타', ち: '치', つ: '쓰', て: '테', と: '토',
  な: '나', に: '니', ぬ: '누', ね: '네', の: '노',
  は: '하', ひ: '히', ふ: '후', へ: '헤', ほ: '호',
  ま: '마', み: '미', む: '무', め: '메', も: '모',
  や: '야', ゆ: '유', よ: '요',
  ら: '라', り: '리', る: '루', れ: '레', ろ: '로',
  わ: '와', ゐ: '이', ゑ: '에', を: '오',
  が: '가', ぎ: '기', ぐ: '구', げ: '게', ご: '고',
  ざ: '자', じ: '지', ず: '즈', ぜ: '제', ぞ: '조',
  だ: '다', ぢ: '지', づ: '즈', で: '데', ど: '도',
  ば: '바', び: '비', ぶ: '부', べ: '베', ぼ: '보',
  ゔ: '부',
  ぱ: '파', ぴ: '피', ぷ: '푸', ぺ: '페', ぽ: '포',
  きゃ: '캬', きゅ: '큐', きょ: '쿄',
  しゃ: '샤', しゅ: '슈', しょ: '쇼',
  ちゃ: '차', ちゅ: '츄', ちょ: '초',
  にゃ: '냐', にゅ: '뉴', にょ: '뇨',
  ひゃ: '햐', ひゅ: '휴', ひょ: '효',
  みゃ: '먀', みゅ: '뮤', みょ: '묘',
  りゃ: '랴', りゅ: '류', りょ: '료',
  ぎゃ: '갸', ぎゅ: '규', ぎょ: '교',
  じゃ: '자', じゅ: '주', じょ: '조',
  びゃ: '뱌', びゅ: '뷰', びょ: '뵤',
  ぴゃ: '퍄', ぴゅ: '퓨', ぴょ: '표',
  ぁ: '아', ぃ: '이', ぅ: '우', ぇ: '에', ぉ: '오',
  ふぁ: '파', ふぃ: '피', ふぇ: '페', ふぉ: '포',
  しぇ: '셰', じぇ: '제', ちぇ: '체',
  てぃ: '티', でぃ: '디', うぃ: '위',
};

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;
const FINAL_COUNT = 28;
const FINAL_GIYEOK = 1;
const FINAL_NIEUN = 4;
const FINAL_BIEUP = 17;
const FINAL_SIOT = 19;

function addBatchim(hangul: string, finalIndex: number): string {
  const code = hangul.charCodeAt(0);
  if (code < HANGUL_BASE || code > HANGUL_END) return hangul;
  const offset = code - HANGUL_BASE;
  if (offset % FINAL_COUNT !== 0) return hangul; // 이미 받침 있음 — 근사치라 덮어쓰지 않음
  return String.fromCharCode(code + finalIndex);
}

function sokuonFinalIndex(nextChar: string | undefined): number {
  if (!nextChar) return FINAL_SIOT;
  if ('かきくけこ'.includes(nextChar)) return FINAL_GIYEOK;
  if ('ぱぴぷぺぽ'.includes(nextChar)) return FINAL_BIEUP;
  return FINAL_SIOT;
}

function katakanaToHiraganaChar(ch: string): string {
  const code = ch.charCodeAt(0);
  if (code >= 0x30a1 && code <= 0x30f6) {
    return String.fromCharCode(code - 0x60);
  }
  return ch;
}

export function katakanaToHiragana(input: string): string {
  return Array.from(input).map(katakanaToHiraganaChar).join('');
}

export function kanaToHangul(input: string): string {
  const hiragana = katakanaToHiragana(input);
  const chars = Array.from(hiragana);
  const result: string[] = [];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];

    if (ch === 'ー') continue; // 장음 표기 생략 (근사)

    if (ch === 'っ') {
      if (result.length > 0) {
        result[result.length - 1] = addBatchim(result[result.length - 1], sokuonFinalIndex(chars[i + 1]));
      }
      continue;
    }

    if (ch === 'ん') {
      if (result.length > 0) {
        const withBatchim = addBatchim(result[result.length - 1], FINAL_NIEUN);
        if (withBatchim !== result[result.length - 1]) {
          result[result.length - 1] = withBatchim;
          continue;
        }
      }
      result.push('ㄴ');
      continue;
    }

    const twoChar = chars[i + 1] ? ch + chars[i + 1] : '';
    if (twoChar && BASE_TABLE[twoChar]) {
      result.push(BASE_TABLE[twoChar]);
      i += 1;
      continue;
    }

    result.push(BASE_TABLE[ch] ?? ch);
  }

  return result.join('');
}
