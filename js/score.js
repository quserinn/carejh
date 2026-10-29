// 하루 건강 점수 (100점 만점)
// 항목별 배점을 더하되, 그날 기록한 항목만으로 계산해서 100점으로 환산합니다.
// 배점의 절반 이상을 기록한 날만 점수를 매깁니다. 체중과 컨디션은 점수에 넣지 않아요.
import { sleepMinutes, alcoholGrams, sojuGlasses, exerciseMinutes, activeSupps, caffeineMg, isLateTime, napCredit } from './metrics.js';
import { clamp } from './util.js';

export const SCORE_PARTS = [
  { key: 'sleep', max: 25, rule: '목표 시간만큼 자면 만점이고, 모자랄수록 깎여요. 낮잠은 90분까지 더해 주고, 개운했는지도 반영해요.' },
  { key: 'meal', max: 25, rule: '건강하게 먹을수록 높아요. 과식하거나 끼니를 거르면 낮아져요.' },
  { key: 'exercise', max: 20, rule: '30분 넘게 운동하면 만점. 쉬는 날도 조금은 쳐 줘요.' },
  { key: 'alcohol', max: 15, rule: '안 마시면 만점, 마실수록 깎여요. 소주 5잔이 넘으면 마이너스예요.' },
  { key: 'caffeine', max: 5, rule: '하루 권장량 안이면 만점, 넘으면 깎여요. 오후 3시 넘어 마시면 조금 감점.' },
  { key: 'water', max: 10, rule: '목표한 만큼 마시면 만점.' },
  { key: 'supplement', max: 5, rule: '등록한 영양제를 다 챙기면 만점.' },
];

const MEAL_PTS = { good: 7, ok: 5, heavy: 2, skip: 0 };
const SNACK_PTS = { skip: 4, good: 3, ok: 2, heavy: 0 };
const UNLOGGED_MEAL = 4; // 아직 안 적은 끼니는 중간쯤으로

function partScore(key, day, s) {
  switch (key) {
    case 'sleep': {
      const night = sleepMinutes(day.sleep);
      if (night == null) return null;
      const m = night + napCredit(day);
      const goal = s.goals.sleepHours * 60;
      let pts;
      if (m < goal) pts = 20 * Math.max(0, 1 - (goal - m) / 180); // 3시간 모자라면 0
      else if (m <= goal + 120) pts = 20;
      else pts = Math.max(10, 20 - ((m - goal - 120) / 30) * 3); // 너무 오래 자도 조금 감점
      const q = day.sleep.quality;
      return pts + (q === 3 ? 5 : q === 1 ? 0 : 3);
    }
    case 'meal': {
      const ml = day.meals;
      if (!ml || !Object.keys(ml).length) return null;
      const main = ['breakfast', 'lunch', 'dinner'].reduce((t, k) => t + (ml[k] ? MEAL_PTS[ml[k]] : UNLOGGED_MEAL), 0);
      return main + (ml.snack ? SNACK_PTS[ml.snack] : SNACK_PTS.skip);
    }
    case 'exercise': {
      const m = exerciseMinutes(day);
      if (m == null) return null;
      if (m === 0) return 6;
      return m >= 30 ? 20 : 8 + (12 * m) / 30;
    }
    case 'alcohol': {
      const g = alcoholGrams(day.alcohol);
      if (g === 0 && !day.alcoholNone) return null;
      const glasses = sojuGlasses(g);
      return glasses <= 5 ? 15 - 3 * glasses : Math.max(-10, -2 * (glasses - 5));
    }
    case 'caffeine': {
      const mg = caffeineMg(day.caffeine);
      if (mg === 0 && !day.caffeineNone) return null;
      const limit = s.goals.caffeineMg;
      let pts = mg <= limit ? 5 : Math.max(0, 5 - ((mg - limit) / 100) * 2.5);
      if (mg > 0 && isLateTime(day.caffeineLast)) pts -= 1.5;
      return Math.max(0, pts);
    }
    case 'water':
      return day.water > 0 ? Math.min(1, day.water / s.goals.waterCups) * 10 : null;
    case 'supplement': {
      const list = activeSupps();
      const taken = new Set(day.supps || []);
      const n = list.filter((x) => taken.has(x.id)).length;
      return n ? (n / list.length) * 5 : null;
    }
  }
  return null;
}

// { score: 0~100 | null, parts: [{ key, max, value }] }
export function dayScore(day, s) {
  const parts = [];
  let possible = 0;
  const hasSupps = activeSupps().length > 0;
  for (const p of SCORE_PARTS) {
    if (!s.enabled[p.key] || (p.key === 'supplement' && !hasSupps)) continue;
    possible += p.max;
    const value = partScore(p.key, day, s);
    if (value != null) parts.push({ key: p.key, max: p.max, value });
  }
  const logged = parts.reduce((t, p) => t + p.max, 0);
  if (!parts.length || logged < possible / 2) return { score: null, parts };
  const earned = parts.reduce((t, p) => t + p.value, 0);
  return { score: clamp(Math.round((earned / logged) * 100), 0, 100), parts };
}

export function scoreTier(score) {
  if (score >= 85) return { label: '최고의 하루', expr: 'cheer' };
  if (score >= 70) return { label: '건강한 하루', expr: 'good' };
  if (score >= 55) return { label: '괜찮은 하루', expr: 'ok' };
  if (score >= 40) return { label: '아쉬운 하루', expr: 'meh' };
  return { label: '힘든 하루', expr: 'bad' };
}

// 점수를 숫자로 감싼 작은 고리. 숫자도 SVG 안에 그려서 글자 크기 설정과 상관없이 고리 안에 들어가게 합니다.
export function scoreRingSVG(score, size = 30) {
  const c = size / 2;
  const r = c - 2;
  const C = 2 * Math.PI * r;
  const fs = score >= 100 ? 9 : 11;
  return (
    `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">` +
    `<circle class="track" cx="${c}" cy="${c}" r="${r}" fill="none" stroke-width="2.6"/>` +
    `<circle class="bar" cx="${c}" cy="${c}" r="${r}" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - score / 100)}" transform="rotate(-90 ${c} ${c})"/>` +
    `<text x="${c}" y="${c}" text-anchor="middle" dominant-baseline="central" font-size="${fs}" font-weight="800">${score}</text>` +
    `</svg>`
  );
}
