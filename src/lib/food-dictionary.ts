export interface FoodEntry {
  term: string;
  translated: string;
  pronunciation: string;
}

const ENTRIES: FoodEntry[] = [
  { term: 'とんこつラーメン', translated: '돈코츠 라멘', pronunciation: '돈코츠라멘' },
  { term: '唐揚げ定食', translated: '가라아게 정식', pronunciation: '가라아게테이쇼쿠' },
  { term: '唐揚げ', translated: '가라아게(일본식 튀김)', pronunciation: '가라아게' },
  { term: 'からあげ', translated: '가라아게(일본식 튀김)', pronunciation: '가라아게' },
  { term: '焼き鳥', translated: '닭꼬치', pronunciation: '야키토리' },
  { term: '焼鳥', translated: '닭꼬치', pronunciation: '야키토리' },
  { term: 'お好み焼き', translated: '오코노미야키', pronunciation: '오코노미야키' },
  { term: 'たこ焼き', translated: '다코야키', pronunciation: '다코야키' },
  { term: 'たこやき', translated: '다코야키', pronunciation: '다코야키' },
  { term: 'たこわさ', translated: '문어 와사비무침', pronunciation: '타코와사' },
  { term: '天ぷら', translated: '튀김(텐푸라)', pronunciation: '텐푸라' },
  { term: 'てんぷら', translated: '튀김(텐푸라)', pronunciation: '텐푸라' },
  { term: '揚げ物', translated: '튀김 요리', pronunciation: '아게모노' },
  { term: '刺身', translated: '회', pronunciation: '사시미' },
  { term: 'さしみ', translated: '회', pronunciation: '사시미' },
  { term: '寿司', translated: '초밥', pronunciation: '스시' },
  { term: 'すし', translated: '초밥', pronunciation: '스시' },
  { term: '餃子', translated: '교자', pronunciation: '교자' },
  { term: 'ぎょうざ', translated: '교자', pronunciation: '교자' },
  { term: '枝豆', translated: '에다마메(풋콩)', pronunciation: '에다마메' },
  { term: '冷奴', translated: '차가운 두부(히야얏코)', pronunciation: '히야얏코' },
  { term: 'ひややっこ', translated: '차가운 두부(히야얏코)', pronunciation: '히야얏코' },
  { term: 'もつ鍋', translated: '곱창전골', pronunciation: '모츠나베' },
  { term: 'シロモツ', translated: '흰 곱창', pronunciation: '시로모츠' },
  { term: '豚タン', translated: '돼지 혀', pronunciation: '부타탄' },
  { term: '豚串', translated: '돼지고기 꼬치', pronunciation: '부타쿠시' },
  { term: 'ぼんじり', translated: '닭 꼬리살(봉지리)', pronunciation: '본지리' },
  { term: 'ねぎま', translated: '파닭꼬치(네기마)', pronunciation: '네기마' },
  { term: 'つくね', translated: '닭완자꼬치(츠쿠네)', pronunciation: '츠쿠네' },
  { term: 'レバー', translated: '간(레바)', pronunciation: '레바' },
  { term: 'なんこつ', translated: '연골(닭)', pronunciation: '난코츠' },
  { term: 'しいたけ', translated: '표고버섯', pronunciation: '시이타케' },
  { term: 'エリンギ', translated: '새송이버섯', pronunciation: '에린기' },
  { term: '砂肝', translated: '닭 모래주머니(砂肝)', pronunciation: '스나기모' },
  { term: 'じゃがバター', translated: '버터감자', pronunciation: '자가바타' },
  { term: 'ちくわ', translated: '치쿠와(어묵)', pronunciation: '치쿠와' },
  { term: 'オニオンスライス', translated: '양파 슬라이스', pronunciation: '오니온스라이스' },
  { term: 'バニラアイス', translated: '바닐라 아이스크림', pronunciation: '바니라아이스' },
  { term: 'うずら', translated: '메추리알', pronunciation: '우즈라' },
  { term: 'うどん', translated: '우동', pronunciation: '우동' },
  { term: 'そば', translated: '소바', pronunciation: '소바' },
  { term: 'ラーメン', translated: '라멘', pronunciation: '라멘' },
  { term: '明太子', translated: '멘타이코', pronunciation: '멘타이코' },
  { term: 'お茶漬け', translated: '오차즈케', pronunciation: '오차즈케' },
  { term: '生ビール', translated: '생맥주', pronunciation: '나마비루' },
  { term: 'ビール', translated: '맥주', pronunciation: '비루' },
  { term: 'ハイボール', translated: '하이볼', pronunciation: '하이보루' },
  { term: '一番搾り', translated: '이치반시보리(맥주)', pronunciation: '이치반시보리' },
  { term: '焼酎', translated: '소주(일본식)', pronunciation: '쇼츄' },
  { term: '日本酒', translated: '니혼슈(일본 청주)', pronunciation: '니혼슈' },
  { term: '大吟醸', translated: '다이긴죠(고급 사케)', pronunciation: '다이긴죠' },
  { term: 'カクテル', translated: '칵테일', pronunciation: '카쿠테루' },
  { term: 'サラダ', translated: '샐러드', pronunciation: '사라다' },
  { term: 'デザート', translated: '디저트', pronunciation: '데자토' },
  { term: '焼きそば', translated: '야키소바', pronunciation: '야키소바' },
  { term: 'もつ煮', translated: '곱창 조림', pronunciation: '모츠니' },
  { term: 'レモンサワー', translated: '레몬사와', pronunciation: '레몬사와' },
  { term: 'ホッピー', translated: '홋피(맥주맛 음료+소주)', pronunciation: '홋피' },
  { term: 'ポテトフライ', translated: '감자튀김', pronunciation: '포테토후라이' },
  { term: 'フライドポテト', translated: '감자튀김', pronunciation: '후라이도포테토' },
  { term: 'だし巻き玉子', translated: '다시마키 계란말이', pronunciation: '다시마키타마고' },
  { term: '玉子焼き', translated: '계란말이', pronunciation: '타마고야키' },
  { term: 'かつ丼', translated: '가츠동(돈가스덮밥)', pronunciation: '카츠동' },
  { term: '親子丼', translated: '오야코동(닭고기계란덮밥)', pronunciation: '오야코동' },
  { term: '牛丼', translated: '규동(소고기덮밥)', pronunciation: '규동' },
  { term: 'カレー', translated: '카레', pronunciation: '카레' },
  { term: 'オムライス', translated: '오므라이스', pronunciation: '오무라이스' },
  { term: '生姜焼き', translated: '생강구이(돼지고기)', pronunciation: '쇼가야키' },
  { term: 'ハンバーグ', translated: '함박스테이크', pronunciation: '한바구' },
  { term: '牛タン', translated: '소 혀 구이', pronunciation: '규탄' },
  { term: 'カルビ', translated: '갈비', pronunciation: '카루비' },
  { term: 'ハラミ', translated: '갈매기살', pronunciation: '하라미' },
  { term: 'えび', translated: '새우', pronunciation: '에비' },
  { term: 'エビ', translated: '새우', pronunciation: '에비' },
  { term: 'いか', translated: '오징어', pronunciation: '이카' },
  { term: 'イカ', translated: '오징어', pronunciation: '이카' },
  { term: 'たこ', translated: '문어', pronunciation: '타코' },
  { term: 'タコ', translated: '문어', pronunciation: '타코' },
  { term: 'まぐろ', translated: '참치', pronunciation: '마구로' },
  { term: 'サーモン', translated: '연어', pronunciation: '사몬' },
  { term: '鮭', translated: '연어', pronunciation: '사케' },
  { term: 'いくら', translated: '연어알', pronunciation: '이쿠라' },
  { term: 'うに', translated: '성게알', pronunciation: '우니' },
  { term: 'ホタテ', translated: '가리비', pronunciation: '호타테' },
  { term: 'チューハイ', translated: '츄하이(소주 칵테일)', pronunciation: '츄하이' },
  { term: '梅酒', translated: '매실주', pronunciation: '우메슈' },
  { term: 'お通し', translated: '기본 안주(오토시)', pronunciation: '오토시' },
  { term: '牛カルビ', translated: '소갈비', pronunciation: '규카루비' },
  { term: '豚バラ', translated: '삼겹살', pronunciation: '부타바라' },
  { term: 'ロース', translated: '등심', pronunciation: '로스' },
  { term: 'ホルモン', translated: '곱창(내장구이)', pronunciation: '호루몬' },
  { term: 'センマイ', translated: '천엽', pronunciation: '센마이' },
  { term: 'ミノ', translated: '양(소 위)', pronunciation: '미노' },
  { term: 'テッチャン', translated: '곱창', pronunciation: '텟창' },
  { term: '納豆', translated: '낫토', pronunciation: '낫토' },
  { term: '味噌汁', translated: '된장국', pronunciation: '미소시루' },
  { term: '豚汁', translated: '돼지고기 된장국', pronunciation: '톤지루' },
  { term: '茶碗蒸し', translated: '달걀찜(자완무시)', pronunciation: '자완무시' },
  { term: '漬物', translated: '절임 반찬', pronunciation: '츠케모노' },
  { term: '浅漬け', translated: '얕은 절임', pronunciation: '아사즈케' },
  { term: 'ポン酢', translated: '폰즈 소스', pronunciation: '폰즈' },
  { term: '梅干し', translated: '매실장아찌', pronunciation: '우메보시' },
  { term: '出汁巻き', translated: '다시마키 계란말이', pronunciation: '다시마키' },
  { term: 'つまみ', translated: '안주', pronunciation: '츠마미' },
  { term: '海鮮丼', translated: '해산물덮밥', pronunciation: '카이센동' },
  { term: '天丼', translated: '텐동(튀김덮밥)', pronunciation: '텐동' },
  { term: 'うな丼', translated: '장어덮밥', pronunciation: '우나동' },
  { term: 'うなぎ', translated: '장어', pronunciation: '우나기' },
  { term: 'カツカレー', translated: '가츠카레(돈가스카레)', pronunciation: '카츠카레' },
  { term: 'とんかつ', translated: '돈가스', pronunciation: '톤카츠' },
  { term: 'チャーハン', translated: '볶음밥', pronunciation: '차한' },
  { term: 'おにぎり', translated: '주먹밥', pronunciation: '오니기리' },
  { term: '雑炊', translated: '오차즈케(죽)', pronunciation: '조스이' },
  { term: 'ラムネ', translated: '라무네(일본 사이다)', pronunciation: '라무네' },
  { term: 'カルパッチョ', translated: '카르파초(회 마리네이드)', pronunciation: '카루팟쵸' },
  { term: 'アヒージョ', translated: '아히조(올리브오일 조림)', pronunciation: '아히죠' },
  { term: 'つけ麺', translated: '츠케멘(찍먹 라멘)', pronunciation: '츠케멘' },
  { term: '味噌ラーメン', translated: '미소라멘', pronunciation: '미소라멘' },
  { term: '醤油ラーメン', translated: '쇼유라멘(간장라멘)', pronunciation: '쇼유라멘' },
  { term: '塩ラーメン', translated: '시오라멘(소금라멘)', pronunciation: '시오라멘' },
  { term: '餃子定食', translated: '교자 정식', pronunciation: '교자테이쇼쿠' },
  { term: 'キムチ', translated: '김치', pronunciation: '키무치' },
  { term: 'チーズ', translated: '치즈', pronunciation: '치즈' },
  { term: '厚揚げ', translated: '유부튀김(두꺼운 유부)', pronunciation: '아츠아게' },
  // ponytail: 한국어-일본어 번역 말뭉치(AI Hub ko2ja, 플리토 번역)의 향토/K-FOOD
  // 도메인 문장에서 뽑은 한식 카타카나 표기. 일본 내 한식당·퓨전 메뉴판에
  // 이 표기 그대로 쓰이는 경우가 많아서 추가함.
  { term: 'ビビンバ', translated: '비빔밥', pronunciation: '비빈바' },
  { term: 'サムギョプサル', translated: '삼겹살', pronunciation: '사무교푸사루' },
  { term: 'トッポッキ', translated: '떡볶이', pronunciation: '톳포키' },
  { term: 'チャプチェ', translated: '잡채', pronunciation: '챠푸체' },
  { term: 'チヂミ', translated: '부침개(파전)', pronunciation: '치지미' },
  { term: '参鶏湯', translated: '삼계탕', pronunciation: '사무게탄' },
  { term: 'カルビタン', translated: '갈비탕', pronunciation: '카루비탄' },
  { term: 'ユッケジャン', translated: '육개장', pronunciation: '육케장' },
  { term: 'キムチチゲ', translated: '김치찌개', pronunciation: '키무치치게' },
  { term: 'テンジャンチゲ', translated: '된장찌개', pronunciation: '텐쟌치게' },
  { term: 'カムジャタン', translated: '감자탕', pronunciation: '카무자탄' },
  { term: 'ゴプチャン', translated: '곱창', pronunciation: '고푸챤' },
  { term: 'すいとん', translated: '수제비', pronunciation: '스이톤' },
  { term: '冷麺', translated: '냉면', pronunciation: '레이멘' },
  { term: 'カルグクス', translated: '칼국수', pronunciation: '카루구쿠스' },
  { term: 'スンデ', translated: '순대', pronunciation: '슨데' },
  { term: 'クッパ', translated: '국밥', pronunciation: '굿파' },
  { term: 'プルコギ', translated: '불고기', pronunciation: '푸루코기' },
  { term: 'ユッケ', translated: '육회', pronunciation: '육케' },
  { term: '豆乳素麺', translated: '콩국수', pronunciation: '도뉴소멘' },
  // ponytail: 자주 나오는 이자카야/식당 메뉴판 어휘 추가분 (일반 상식 기반, 코퍼스 미사용).
  { term: '唐揚げ弁当', translated: '가라아게 도시락', pronunciation: '카라아게벤토' },
  { term: '定食', translated: '정식', pronunciation: '테이쇼쿠' },
  { term: 'セット', translated: '세트', pronunciation: '셋토' },
  { term: 'ランチ', translated: '런치(점심 세트)', pronunciation: '란치' },
  { term: 'お任せ', translated: '오마카세(주방장 특선)', pronunciation: '오마카세' },
  { term: '盛り合わせ', translated: '모둠', pronunciation: '모리아와세' },
  { term: '握り', translated: '니기리(초밥)', pronunciation: '니기리' },
  { term: '巻き寿司', translated: '마키(김초밥)', pronunciation: '마키즈시' },
  { term: '軍艦', translated: '군칸마키(초밥)', pronunciation: '군칸' },
  { term: 'えんがわ', translated: '광어 지느러미살', pronunciation: '엔가와' },
  { term: '秋刀魚', translated: '꽁치', pronunciation: '삼마' },
  { term: '鯖', translated: '고등어', pronunciation: '사바' },
  { term: 'ホッケ', translated: '임연수어구이(홋케)', pronunciation: '홋케' },
  { term: '煮付け', translated: '조림', pronunciation: '니츠케' },
  { term: '塩焼き', translated: '소금구이', pronunciation: '시오야키' },
  { term: '西京焼き', translated: '사이쿄야키(된장절임구이)', pronunciation: '사이쿄야키' },
  { term: '焼き魚', translated: '생선구이', pronunciation: '야키자카나' },
  { term: 'お浸し', translated: '오히타시(나물무침)', pronunciation: '오히타시' },
  { term: 'ポテトサラダ', translated: '감자샐러드', pronunciation: '포테토사라다' },
  { term: 'コロッケ', translated: '고로케', pronunciation: '코롯케' },
  { term: 'メンチカツ', translated: '멘치카츠(다짐육까스)', pronunciation: '멘치카츠' },
  { term: 'ハムカツ', translated: '햄까스', pronunciation: '하무카츠' },
  { term: 'キャベツ', translated: '양배추', pronunciation: '캬베츠' },
  { term: 'ししゃも', translated: '열빙어구이(시샤모)', pronunciation: '시샤모' },
  { term: '塩辛', translated: '젓갈(시오카라)', pronunciation: '시오카라' },
  { term: '角ハイボール', translated: '카쿠 하이볼', pronunciation: '카쿠하이보루' },
  { term: 'レモンハイ', translated: '레몬하이(레몬소주)', pronunciation: '레몬하이' },
  { term: 'ウーロンハイ', translated: '우롱하이(우롱차소주)', pronunciation: '우롱하이' },
  { term: '緑茶ハイ', translated: '녹차하이(녹차소주)', pronunciation: '료쿠챠하이' },
  { term: 'プリン', translated: '푸딩', pronunciation: '푸린' },
  { term: '抹茶アイス', translated: '말차 아이스크림', pronunciation: '맛챠아이스' },
  { term: 'パフェ', translated: '파르페', pronunciation: '파훼' },
  { term: 'ウーロン茶', translated: '우롱차', pronunciation: '우롱챠' },
  { term: 'コーラ', translated: '콜라', pronunciation: '코라' },
  { term: 'オレンジジュース', translated: '오렌지주스', pronunciation: '오렌지쥬스' },
  { term: 'ほうじ茶', translated: '호지차', pronunciation: '호지챠' },
  { term: '緑茶', translated: '녹차', pronunciation: '료쿠챠' },
  { term: 'お子様ランチ', translated: '어린이 런치', pronunciation: '오코사마란치' },
  { term: 'もろきゅう', translated: '오이 된장무침', pronunciation: '모로큐' },
  { term: '鰹のたたき', translated: '가다랑어 다타키(살짝구운 회)', pronunciation: '카츠오노타타키' },
  { term: '手羽先', translated: '닭날개튀김', pronunciation: '테바사키' },
  { term: '弁当', translated: '도시락', pronunciation: '벤토' },
];

// Lookup runs on a "folded" form so OCR slips and spelling variants still hit:
// NFKC (full/half-width), hiragana -> katakana, and glyphs ML Kit commonly confuses
// with katakana (力/カ, 口/ロ, 夕/タ, 二/ニ, 八/ハ, 一/ー), a dropped handakuten (ぷ read as ぶ),
// and 鮫 read for 餃. Both sides are folded the same
// way, so the mapping only has to be consistent, not "correct".
const NOISE_CHARS = /[◆◇●○■□★☆※·|:：、,，\s]/g;
const CONFUSABLE: Record<string, string> = { 力: 'カ', 口: 'ロ', 夕: 'タ', 二: 'ニ', 八: 'ハ', 一: 'ー', 鮫: '餃' };
const HANDAKUTEN_TO_DAKUTEN: Record<string, string> = {
  ぱ: 'ば', ぴ: 'び', ぷ: 'ぶ', ぺ: 'べ', ぽ: 'ぼ', パ: 'バ', ピ: 'ビ', プ: 'ブ', ペ: 'ベ', ポ: 'ボ',
};

function fold(text: string): string {
  return text
    .normalize('NFKC')
    .replace(NOISE_CHARS, '')
    .replace(/[ぱぴぷぺぽパピプペポ]/g, (c) => HANDAKUTEN_TO_DAKUTEN[c])
    .replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
    .replace(/[力口夕二八一鮫]/g, (c) => CONFUSABLE[c]);
}

const SORTED_ENTRIES = [...ENTRIES]
  .map((entry) => ({ entry, folded: fold(entry.term) }))
  .sort((a, b) => b.folded.length - a.folded.length);

// ponytail: substitution-only fuzzy match (one wrong glyph, same length); dropped/extra
// glyphs still miss. Upgrade to real edit distance if OCR deletions turn out common.
const FUZZY_MIN_LENGTH = 5;

function hasOneSubstitution(text: string, term: string): boolean {
  for (let start = 0; start + term.length <= text.length; start++) {
    let diff = 0;
    for (let k = 0; k < term.length && diff <= 1; k++) {
      if (text[start + k] !== term[k]) diff++;
    }
    if (diff <= 1) return true;
  }
  return false;
}

export function lookupFoodTerm(text: string): FoodEntry | null {
  const normalized = fold(text);
  if (!normalized) return null;
  for (const { entry, folded } of SORTED_ENTRIES) {
    if (normalized.includes(folded)) return entry;
  }
  for (const { entry, folded } of SORTED_ENTRIES) {
    if (folded.length >= FUZZY_MIN_LENGTH && hasOneSubstitution(normalized, folded)) return entry;
  }
  return null;
}
