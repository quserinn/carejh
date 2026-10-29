import { getDay, getSettings } from './store.js';
import { addDays, pad2, fmtDuration, fmtNum } from './util.js';
import {
  DRINKS, DRINK, SOJU_GLASS_G, EXERCISE, MEALS, MEAL_RATING, MOODS, SLEEP_Q, CUP_ML, INTENSITY, CAFFEINE,
} from './constants.js';

export const toMin = (t) => {
  const [hh, mm] = t.split(':').map(Number);
  return hh * 60 + mm;
};

export function sleepMinutes(sl) {
  if (!sl?.bed || !sl?.wake) return null;
  let d = toMin(sl.wake) - toMin(sl.bed);
  if (d <= 0) d += 1440;
  return d;
}

// 저녁 6시부터 몇 분 지났는지 (밤을 넘기는 시간을 한 축에 그리기 위해)
export const relFromEvening = (t) => (toMin(t) - 18 * 60 + 1440) % 1440;

export function clockOfRel(rel) {
  const abs = (Math.round(rel) + 18 * 60) % 1440;
  return `${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

export function alcoholGrams(a) {
  if (!a) return 0;
  return DRINKS.reduce((s, d) => s + (a[d.key] || 0) * d.grams, 0);
}

export const sojuGlasses = (grams) => grams / SOJU_GLASS_G;

export function caffeineMg(c) {
  if (!c) return 0;
  return CAFFEINE.reduce((s, d) => s + (c[d.key] || 0) * d.mg, 0);
}

// 마신 mg / 안 마심 0 / 기록 없음 null
export function caffeineStatus(day) {
  const mg = caffeineMg(day.caffeine);
  if (mg > 0) return mg;
  return day.caffeineNone ? 0 : null;
}

// 오후 3시 이후(새벽 4시 전까지)에 마신 카페인은 잠에 영향을 줄 수 있어요
export const isLateTime = (t) => !!t && (t >= '15:00' || t < '04:00');

// 낮잠은 90분까지만 수면 목표에 더해 줍니다
export const napCredit = (day) => Math.min(day.nap || 0, 90);

// 마신 g / 안 마심 0 / 기록 없음 null
export function drinkStatus(day) {
  const g = alcoholGrams(day.alcohol);
  if (g > 0) return g;
  return day.alcoholNone ? 0 : null;
}

// 운동 분 / 휴식 0 / 기록 없음 null
export function exerciseMinutes(day) {
  const list = day.exercise || [];
  if (list.length) return list.reduce((s, e) => s + (e.minutes || 0), 0);
  return day.exerciseRest ? 0 : null;
}

export function isLogged(cat, day) {
  switch (cat) {
    case 'sleep': return !!(day.sleep?.bed && day.sleep?.wake);
    case 'meal': return !!(day.meals && Object.keys(day.meals).length);
    case 'exercise': return exerciseMinutes(day) != null;
    case 'alcohol': return drinkStatus(day) != null;
    case 'caffeine': return caffeineStatus(day) != null;
    case 'water': return day.water > 0;
    case 'supplement': return (day.supps || []).length > 0;
    case 'weight': return day.weight != null;
    case 'mood': return day.mood != null;
    default: return false;
  }
}

export const anyLogged = (day) => Object.keys(day).length > 0;

// 지금 먹고 있는(목록에서 빼지 않은) 영양제
export const activeSupps = () => (getSettings().supplements || []).filter((s) => !s.archived);

// date 이전(당일 제외)에서 조건에 맞는 가장 최근 날
export function findLast(date, pred, maxBack = 400) {
  let k = date;
  for (let i = 0; i < maxBack; i++) {
    k = addDays(k, -1);
    const d = getDay(k);
    if (pred(d)) return { key: k, day: d };
  }
  return null;
}

// 오늘(또는 오늘 기록이 아직 없으면 어제)부터 거꾸로 이어진 날 수
export function streak(today, pred) {
  let k = today;
  if (!pred(getDay(k))) k = addDays(k, -1);
  let n = 0;
  while (n < 3650 && pred(getDay(k))) {
    n++;
    k = addDays(k, -1);
  }
  return n;
}

export function dayMetrics(day) {
  const sm = sleepMinutes(day.sleep);
  const bed = sm != null ? relFromEvening(day.sleep.bed) : null;
  return {
    // sleep = 밤잠 + 낮잠, night = 밤잠만
    sleep: sm != null ? sm + (day.nap || 0) : null,
    night: sm,
    nap: day.nap || null,
    caf: caffeineStatus(day),
    cafLate: caffeineMg(day.caffeine) > 0 && isLateTime(day.caffeineLast),
    caffeine: day.caffeine || {},
    bed,
    wake: sm != null ? bed + sm : null,
    sleepQ: day.sleep?.quality ?? null,
    meals: day.meals || null,
    ex: exerciseMinutes(day),
    exList: day.exercise || [],
    alc: drinkStatus(day),
    drinks: day.alcohol || {},
    water: day.water > 0 ? day.water : null,
    supps: (day.supps || []).length || null,
    weight: day.weight ?? null,
    mood: day.mood ?? null,
  };
}

export function drinkList(a) {
  return DRINKS.filter((d) => a?.[d.key]).map((d) => `${d.label} ${a[d.key]}${d.unit}`);
}

export function caffeineList(c) {
  return CAFFEINE.filter((d) => c?.[d.key]).map((d) => `${d.label} ${c[d.key]}${d.unit}`);
}

export function exerciseList(list) {
  return (list || []).map((e) => `${EXERCISE[e.type]?.label || '운동'} ${e.minutes}분`);
}

// 캘린더 상세에 쓰는 한 줄 요약 (기록 없으면 null)
export function summarize(cat, day) {
  if (!isLogged(cat, day) && !(cat === 'mood' && day.memo) && !(cat === 'meal' && day.mealMemo)) return null;
  switch (cat) {
    case 'sleep': {
      const q = SLEEP_Q.find((o) => o.key === day.sleep.quality);
      return `${day.sleep.bed} → ${day.sleep.wake} · ${fmtDuration(sleepMinutes(day.sleep))}${q ? ` · ${q.label}` : ''}${day.nap ? `\n낮잠 ${fmtDuration(day.nap)}` : ''}`;
    }
    case 'meal': {
      const parts = MEALS.filter((m) => day.meals?.[m.key]).map((m) => `${m.label} ${MEAL_RATING[day.meals[m.key]].label}`);
      return [parts.join(' · '), day.mealMemo].filter(Boolean).join('\n');
    }
    case 'exercise': {
      const list = day.exercise || [];
      if (!list.length) return '휴식';
      return list
        .map((e) => {
          const inten = INTENSITY.find((i) => i.key === e.intensity);
          return `${EXERCISE[e.type]?.label || '운동'} ${e.minutes}분${inten ? ` (${inten.label})` : ''}${e.memo ? ` – ${e.memo}` : ''}`;
        })
        .join('\n');
    }
    case 'alcohol': {
      const g = drinkStatus(day);
      if (!g) return '안 마심';
      return `${drinkList(day.alcohol).join(', ')}\n소주 ${fmtNum(sojuGlasses(g))}잔 분량 · 알코올 약 ${Math.round(g)}g`;
    }
    case 'caffeine': {
      const mg = caffeineStatus(day);
      if (!mg) return '안 마심';
      return `${caffeineList(day.caffeine).join(', ')}\n카페인 약 ${mg}mg${day.caffeineLast ? ` · 마지막 ${day.caffeineLast}` : ''}`;
    }
    case 'water':
      return `${day.water}잔 (${fmtNum((day.water * CUP_ML) / 1000, 2)}L)`;
    case 'supplement': {
      const all = getSettings().supplements || [];
      const names = day.supps.map((id) => all.find((s) => s.id === id)?.name).filter(Boolean);
      return names.join(', ') || `${day.supps.length}개`;
    }
    case 'weight':
      return `${day.weight.toFixed(1)}kg`;
    case 'mood': {
      const m = MOODS.find((o) => o.key === day.mood);
      return [m ? `${m.label} (${m.key}점)` : null, day.memo].filter(Boolean).join('\n');
    }
  }
  return null;
}

export { DRINK };
