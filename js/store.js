// 모든 기록은 이 기기의 localStorage 한 곳에 JSON으로 저장됩니다.
//
// days['2026-10-18'] = {
//   sleep: { bed: '23:30', wake: '07:10', quality: 3 },   // 그날 아침에 일어난 기준
//   meals: { breakfast: 'good', lunch: 'ok', dinner: 'heavy', snack: 'skip' },
//   mealMemo: '점심 김치찌개',
//   exercise: [{ type: 'run', minutes: 30, intensity: 2, memo: '' }],
//   exerciseRest: true,
//   alcohol: { soju: 3, beer: 1 },  alcoholNone: true,
//   water: 6, supps: ['k3f9a1'], weight: 62.3, mood: 4, memo: '한 줄 일기',
// }

const KEY = 'carejh:data:v1';

export const DEFAULT_SETTINGS = {
  name: '',
  character: null, // 'lion' | 'alpaca' — 처음 실행할 때 고릅니다
  enabled: { sleep: true, meal: true, exercise: true, alcohol: true, water: true, supplement: true, weight: true, mood: true },
  // 먹는 영양제 목록. 목록에서 빼도 지난 기록의 이름이 남도록 archived로 숨깁니다.
  supplements: [], // [{ id, name, archived? }]
  goals: { sleepHours: 7, waterCups: 8, exerciseWeekMin: 150, alcoholDaysWeek: 2 },
  theme: 'system',
  lastBackupAt: null,
  nudgeSnoozedAt: null,
};

const clone = (o) => JSON.parse(JSON.stringify(o));
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function fresh() {
  return { version: 1, settings: clone(DEFAULT_SETTINGS), days: {} };
}

function normalize(raw) {
  const d = fresh();
  if (!isObj(raw)) return d;
  if (isObj(raw.days)) {
    for (const [k, v] of Object.entries(raw.days)) if (DATE_RE.test(k) && isObj(v)) d.days[k] = v;
  }
  const s = isObj(raw.settings) ? raw.settings : {};
  d.settings = {
    ...d.settings,
    ...s,
    enabled: { ...d.settings.enabled, ...(isObj(s.enabled) ? s.enabled : {}) },
    goals: { ...d.settings.goals, ...(isObj(s.goals) ? s.goals : {}) },
    supplements: Array.isArray(s.supplements) ? s.supplements.filter((x) => isObj(x) && typeof x.id === 'string' && typeof x.name === 'string') : [],
  };
  return d;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) {
    console.error('CareJH: 저장된 데이터를 읽지 못했어요', e);
  }
  return fresh();
}

let data = load();
const listeners = new Set();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    console.error(e);
    alert('저장하지 못했어요. 저장 공간이 부족하거나 브라우저가 저장을 막고 있어요.');
  }
}

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ---------- days ----------

export function getDay(key) {
  return data.days[key] || {};
}

export function dayKeys() {
  return Object.keys(data.days).sort();
}

export function dayCount() {
  return Object.keys(data.days).length;
}

// 빈 값은 지워서 "기록 안 함"과 구분되게 합니다.
function prune(day) {
  for (const [k, v] of Object.entries(day)) {
    if (v == null || v === '' || v === false) delete day[k];
    else if (Array.isArray(v) && !v.length) delete day[k];
    else if (isObj(v)) {
      for (const [ik, iv] of Object.entries(v)) if (iv == null || iv === '' || iv === 0) delete v[ik];
      if (!Object.keys(v).length) delete day[k];
    }
  }
}

export function updateDay(key, fn, { silent = false } = {}) {
  const day = clone(data.days[key] || {});
  fn(day);
  prune(day);
  if (Object.keys(day).length) data.days[key] = day;
  else delete data.days[key];
  save();
  if (!silent) emit();
}

// ---------- settings ----------

export function getSettings() {
  return data.settings;
}

export function updateSettings(fn, { silent = false } = {}) {
  const s = clone(data.settings);
  fn(s);
  data.settings = s;
  save();
  if (!silent) emit();
}

// ---------- backup ----------

export function exportJSON() {
  return JSON.stringify({ app: 'CareJH', exportedAt: new Date().toISOString(), ...data }, null, 2);
}

export function parseBackup(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('백업 파일을 읽을 수 없어요 (JSON 형식이 아니에요).');
  }
  if (!isObj(raw) || !isObj(raw.days)) throw new Error('CareJH 백업 파일이 아닌 것 같아요.');
  return normalize(raw);
}

// 같은 날짜는 백업 내용으로 덮어쓰고, 나머지 기록은 그대로 둡니다.
export function importBackup(backup) {
  const wasEmpty = dayCount() === 0;
  data.days = { ...data.days, ...backup.days };
  if (wasEmpty) {
    // 새 폰에서 불러올 때는 백업의 설정을 쓰되, 백업에 없는 캐릭터/이름은 지금 고른 것을 유지
    const cur = data.settings;
    data.settings = { ...backup.settings, character: backup.settings.character || cur.character, name: backup.settings.name || cur.name };
  }
  save();
  emit();
  return Object.keys(backup.days).length;
}

export function resetAll() {
  data = fresh();
  save();
  emit();
}
