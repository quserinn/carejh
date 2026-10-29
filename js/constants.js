// 기록 화면에 나오는 순서. 아이콘은 icons.js에서 같은 이름으로 찾습니다.
export const CATS = [
  { key: 'sleep', label: '수면', emoji: '🌙' },
  { key: 'meal', label: '식사', emoji: '🍚' },
  { key: 'exercise', label: '운동', emoji: '🏃' },
  { key: 'alcohol', label: '음주', emoji: '🍷' },
  { key: 'caffeine', label: '카페인', emoji: '☕' },
  { key: 'water', label: '물', emoji: '💧' },
  { key: 'supplement', label: '영양제', emoji: '💊' },
  { key: 'weight', label: '체중', emoji: '⚖️' },
  { key: 'mood', label: '컨디션', emoji: '😊' },
];
export const CAT = Object.fromEntries(CATS.map((c) => [c.key, c]));

export const catColor = (key) => `var(--c-${key})`;

export const SLEEP_Q = [
  { key: 3, emoji: '😌', label: '개운해요' },
  { key: 2, emoji: '😐', label: '보통' },
  { key: 1, emoji: '🥱', label: '피곤해요' },
];

export const MEALS = [
  { key: 'breakfast', label: '아침' },
  { key: 'lunch', label: '점심' },
  { key: 'dinner', label: '저녁' },
  { key: 'snack', label: '간식·야식' },
];
export const MAIN_MEALS = ['breakfast', 'lunch', 'dinner'];

export const MEAL_RATINGS = [
  { key: 'good', emoji: '🥗', label: '건강', long: '건강하게' },
  { key: 'ok', emoji: '🍚', label: '보통', long: '보통' },
  { key: 'heavy', emoji: '🍔', label: '과식', long: '과식·자극적' },
  { key: 'skip', emoji: '✕', label: '안 먹음', long: '안 먹음' },
];
export const MEAL_RATING = Object.fromEntries(MEAL_RATINGS.map((r) => [r.key, r]));

export const EXERCISES = [
  { key: 'walk', emoji: '🚶', label: '걷기' },
  { key: 'run', emoji: '🏃', label: '러닝' },
  { key: 'gym', emoji: '🏋️', label: '헬스' },
  { key: 'yoga', emoji: '🧘', label: '요가·필라테스' },
  { key: 'bike', emoji: '🚴', label: '자전거' },
  { key: 'swim', emoji: '🏊', label: '수영' },
  { key: 'hike', emoji: '⛰️', label: '등산' },
  { key: 'sports', emoji: '🏸', label: '구기·라켓' },
  { key: 'etc', emoji: '✨', label: '기타' },
];
export const EXERCISE = Object.fromEntries(EXERCISES.map((e) => [e.key, e]));

export const INTENSITY = [
  { key: 1, emoji: '🙂', label: '가볍게' },
  { key: 2, emoji: '😤', label: '적당히' },
  { key: 3, emoji: '🔥', label: '빡세게' },
];

// grams = 순수 알코올(g) = 용량(ml) × 도수 × 0.789
export const DRINKS = [
  { key: 'soju', emoji: '🍶', label: '소주', unit: '잔', grams: 6.5, note: '50ml · 1병 = 7잔' },
  { key: 'beer', emoji: '🍺', label: '맥주', unit: '잔', grams: 17.8, note: '500cc 기준' },
  { key: 'somaek', emoji: '🍻', label: '소맥', unit: '잔', grams: 12, note: '맥주잔 한 잔' },
  { key: 'wine', emoji: '🍷', label: '와인', unit: '잔', grams: 15.4, note: '150ml' },
  { key: 'makgeolli', emoji: '🥛', label: '막걸리', unit: '사발', grams: 9.5, note: '200ml' },
  { key: 'yakju', emoji: '🍶', label: '약주', unit: '잔', grams: 5.1, note: '백세주·청하 등 50ml' },
  { key: 'whisky', emoji: '🥃', label: '위스키·양주', unit: '샷', grams: 9.5, note: '30ml' },
  { key: 'highball', emoji: '🍸', label: '하이볼·칵테일', unit: '잔', grams: 12, note: '' },
];
export const DRINK = Object.fromEntries(DRINKS.map((d) => [d.key, d]));
export const SOJU_GLASS_G = 6.5;

// 한 잔에 든 카페인(mg). 카페마다 달라서 흔한 크기 기준 대략값입니다.
export const CAFFEINE = [
  { key: 'americano', label: '아메리카노', unit: '잔', mg: 150, note: '2샷 · 약 150mg' },
  { key: 'latte', label: '라떼·카푸치노', unit: '잔', mg: 150, note: '2샷 · 약 150mg' },
  { key: 'coldbrew', label: '콜드브루', unit: '잔', mg: 200, note: '약 200mg' },
  { key: 'mix', label: '믹스커피', unit: '봉', mg: 60, note: '약 60mg' },
  { key: 'tea', label: '녹차·홍차', unit: '잔', mg: 40, note: '약 40mg' },
  { key: 'energy', label: '에너지음료', unit: '캔', mg: 80, note: '약 80mg' },
  { key: 'cola', label: '콜라', unit: '캔', mg: 30, note: '약 30mg' },
];
export const CAFFEINE_DRINK = Object.fromEntries(CAFFEINE.map((c) => [c.key, c]));

export const MOODS = [
  { key: 1, emoji: '😫', label: '최악' },
  { key: 2, emoji: '😕', label: '별로' },
  { key: 3, emoji: '😐', label: '보통' },
  { key: 4, emoji: '🙂', label: '좋음' },
  { key: 5, emoji: '😆', label: '최고' },
];

export const CUP_ML = 250;

export const SUPP_SUGGESTIONS = ['종합비타민', '비타민D', '오메가3', '유산균', '마그네슘', '비타민C', '철분', '루테인', '아연', '콜라겐'];
