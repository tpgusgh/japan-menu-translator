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
];

const SORTED_ENTRIES = [...ENTRIES].sort((a, b) => b.term.length - a.term.length);
const NOISE_CHARS = /[◆·|:：、,，\s]/g;

export function lookupFoodTerm(text: string): FoodEntry | null {
  const normalized = text.replace(NOISE_CHARS, '');
  if (!normalized) return null;
  for (const entry of SORTED_ENTRIES) {
    if (normalized.includes(entry.term)) return entry;
  }
  return null;
}
