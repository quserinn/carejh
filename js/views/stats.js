import {
  h, todayKey, addDays, diffDays, rangeKeys, mondayOf, fmtMD, fmtDayTitle, fmtDuration, fmtNum, mean, sum, WD, keyOf, pad2, parseKey,
} from '../util.js';
import * as store from '../store.js';
import { CAT, MEALS, MEAL_RATING, EXERCISES, EXERCISE, DRINKS, MOODS, CUP_ML } from '../constants.js';
import { dayMetrics, clockOfRel, sojuGlasses, drinkList, streak, anyLogged } from '../metrics.js';
import { barChart, rangeChart, lineChart, mealMatrix, hbarList, tableView } from '../charts.js';
import { icon } from '../icons.js';

const PERIODS = [['week', '주간'], ['month', '월간'], ['quarter', '3개월']];
const PREV_LABEL = { week: '지난주', month: '지난달', quarter: '직전 3개월' };
const MEAL_COLORS = { good: 'var(--meal-good)', ok: 'var(--meal-ok)', heavy: 'var(--meal-heavy)' };

function periodOf(type, anchor) {
  if (type === 'week') {
    const start = mondayOf(anchor);
    const end = addDays(start, 6);
    const keys = rangeKeys(start, end);
    const sameMonth = start.slice(0, 7) === end.slice(0, 7);
    return {
      type, start, end, keys, daily: true,
      buckets: keys.map((k, i) => ({ keys: [k], label: WD[(i + 1) % 7], title: fmtDayTitle(k) })),
      title: `${fmtMD(start)} – ${sameMonth ? `${parseKey(end).getDate()}일` : fmtMD(end)}`,
      prevAnchor: addDays(start, -7),
      nextAnchor: addDays(start, 7),
    };
  }
  if (type === 'month') {
    const [y, m] = anchor.split('-').map(Number);
    const start = `${y}-${pad2(m)}-01`;
    const end = keyOf(new Date(y, m, 0));
    const keys = rangeKeys(start, end);
    return {
      type, start, end, keys, daily: true,
      buckets: keys.map((k, i) => ({ keys: [k], label: String(i + 1), showLabel: i === 0 || (i + 1) % 5 === 0, title: fmtDayTitle(k) })),
      title: `${y}년 ${m}월`,
      prevAnchor: keyOf(new Date(y, m - 2, 1)),
      nextAnchor: keyOf(new Date(y, m, 1)),
    };
  }
  // 3개월: 기준 주를 포함한 최근 13주, 주 단위로 묶음
  const end = addDays(mondayOf(anchor), 6);
  const start = addDays(end, -90);
  const keys = rangeKeys(start, end);
  const buckets = [];
  for (let i = 0; i < 13; i++) {
    const wk = keys.slice(i * 7, i * 7 + 7);
    const d = parseKey(wk[0]);
    buckets.push({ keys: wk, label: `${d.getMonth() + 1}/${d.getDate()}`, showLabel: i % 4 === 0, title: `${fmtMD(wk[0])} – ${fmtMD(wk[6])}` });
  }
  return { type, start, end, keys, daily: false, buckets, title: `${fmtMD(start)} – ${fmtMD(end)}`, prevAnchor: addDays(start, -1), nextAnchor: addDays(end, 7) };
}

function chartWidth() {
  const el = document.getElementById('app');
  return Math.max(240, Math.floor(el.clientWidth - 32 - 34));
}

export function renderStats(app) {
  const st = app.state;
  const type = st.statsPeriod;
  const today = todayKey();
  const P = periodOf(type, st.statsAnchor);
  const PP = periodOf(type, P.prevAnchor);
  const settings = store.getSettings();
  const en = settings.enabled;
  const goals = settings.goals;
  const W = chartWidth();

  const cache = new Map();
  const M = (k) => {
    let v = cache.get(k);
    if (!v) { v = dayMetrics(store.getDay(k)); cache.set(k, v); }
    return v;
  };
  const vals = (keys, f) => keys.map((k) => f(M(k))).filter((v) => v != null);
  const avg = (keys, f) => mean(vals(keys, f));
  const total = (keys, f) => { const v = vals(keys, f); return v.length ? sum(v) : null; };
  const cnt = (keys, pred) => keys.filter((k) => pred(M(k))).length;

  const controls = h(
    'div',
    { class: 'stats-controls' },
    h(
      'div',
      { class: 'seg seg-period', role: 'tablist' },
      PERIODS.map(([k, l]) =>
        h('button', { class: 'seg-btn' + (type === k ? ' on' : ''), role: 'tab', 'aria-selected': type === k, onclick: () => { st.statsPeriod = k; st.statsAnchor = today; app.render({ keepScroll: true }); } }, l)
      )
    ),
    h(
      'div',
      { class: 'date-nav' },
      h('button', { class: 'icon-btn', 'aria-label': '이전 기간', onclick: () => { st.statsAnchor = P.prevAnchor; app.render({ keepScroll: true }); } }, icon('chevL')),
      h('div', { class: 'date-label static' }, P.title),
      h('button', { class: 'icon-btn', 'aria-label': '다음 기간', disabled: P.end >= today, onclick: () => { st.statsAnchor = P.nextAnchor; app.render({ keepScroll: true }); } }, icon('chevR'))
    )
  );

  const view = h('div', { class: 'view' }, h('h1', { class: 'page-title' }, '통계'), controls);

  if (!store.dayCount()) {
    view.append(h('div', { class: 'empty' }, h('div', { class: 'big' }, '📊'), h('b', null, '아직 기록이 없어요'), '기록을 시작하면 여기에서 한눈에 볼 수 있어요.'));
    return view;
  }

  // ---------- 요약 타일 ----------
  const tiles = [];
  const elapsed = P.keys.filter((k) => k <= today).length || 1;

  if (en.sleep) {
    const goal = goals.sleepHours * 60;
    const cur = avg(P.keys, (m) => m.sleep);
    const n = vals(P.keys, (m) => m.sleep).length;
    tiles.push(tile({
      cat: 'sleep', label: '평균 수면', value: fmtDuration(cur),
      delta: deltaEl(cur, avg(PP.keys, (m) => m.sleep), { fmt: fmtDuration, eps: 1 }),
      sub: n ? `목표 달성 ${cnt(P.keys, (m) => m.sleep >= goal && m.sleep != null)}/${n}일` : '기록 없음',
    }));
  }
  if (en.exercise) {
    const cur = total(P.keys, (m) => m.ex);
    const days = cnt(P.keys, (m) => m.ex > 0);
    let sub = cur == null ? '기록 없음' : `운동한 날 ${days}일`;
    if (cur != null && type === 'week' && goals.exerciseWeekMin) sub += ` · 목표의 ${Math.round((cur / goals.exerciseWeekMin) * 100)}%`;
    if (cur != null && type !== 'week') sub += ` · 주 평균 ${fmtDuration(cur / (elapsed / 7))}`;
    tiles.push(tile({ cat: 'exercise', label: '운동', value: fmtDuration(cur), delta: deltaEl(cur, total(PP.keys, (m) => m.ex), { fmt: fmtDuration, eps: 1, good: 'up' }), sub }));
  }
  if (en.alcohol) {
    const logged = vals(P.keys, (m) => m.alc).length;
    const prevLogged = vals(PP.keys, (m) => m.alc).length;
    const days = cnt(P.keys, (m) => m.alc > 0);
    const g = total(P.keys, (m) => m.alc) || 0;
    tiles.push(tile({
      cat: 'alcohol', label: '술 마신 날', value: logged ? `${days}일` : '–',
      delta: deltaEl(logged ? days : null, prevLogged ? cnt(PP.keys, (m) => m.alc > 0) : null, { fmt: (v) => `${fmtNum(v)}일`, eps: 0.5, good: 'down' }),
      sub: g > 0 ? `소주 ${fmtNum(sojuGlasses(g))}잔 분량` : logged ? '한 번도 안 마셨어요 👏' : '기록 없음',
    }));
  }
  if (en.meal) {
    const ratio = (keys) => {
      const r = keys.flatMap((k) => Object.values(M(k).meals || {}).filter((v) => v !== 'skip'));
      return r.length ? (r.filter((v) => v === 'good').length / r.length) * 100 : null;
    };
    const cur = ratio(P.keys);
    const bSkip = cnt(P.keys, (m) => m.meals?.breakfast === 'skip');
    const snacks = cnt(P.keys, (m) => m.meals?.snack && m.meals.snack !== 'skip');
    tiles.push(tile({
      cat: 'meal', label: '건강하게 먹은 끼니', value: cur != null ? `${Math.round(cur)}%` : '–',
      delta: deltaEl(cur, ratio(PP.keys), { fmt: (v) => `${Math.round(v)}%p`, eps: 0.5, good: 'up' }),
      sub: cur != null ? `아침 거른 날 ${bSkip}일 · 간식·야식 ${snacks}번` : '기록 없음',
    }));
  }
  if (en.water) {
    const cur = avg(P.keys, (m) => m.water);
    tiles.push(tile({
      cat: 'water', label: '하루 평균 물', value: cur != null ? `${fmtNum(cur)}잔` : '–',
      delta: deltaEl(cur, avg(PP.keys, (m) => m.water), { fmt: (v) => `${fmtNum(v)}잔`, eps: 0.05, good: 'up' }),
      sub: cur != null ? `목표 ${goals.waterCups}잔 달성 ${cnt(P.keys, (m) => m.water >= goals.waterCups)}일` : '기록 없음',
    }));
  }
  if (en.weight) {
    const wv = vals(P.keys, (m) => m.weight);
    const pv = vals(PP.keys, (m) => m.weight);
    const last = wv.at(-1);
    const change = wv.length > 1 ? last - wv[0] : null;
    tiles.push(tile({
      cat: 'weight', label: '체중', value: last != null ? `${last.toFixed(1)}kg` : '–',
      delta: deltaEl(last ?? null, pv.at(-1) ?? null, { fmt: (v) => `${v.toFixed(1)}kg`, eps: 0.05 }),
      sub: change != null ? `이 기간 ${change > 0 ? '+' : ''}${change.toFixed(1)}kg` : wv.length ? '한 번 기록' : '기록 없음',
    }));
  }
  if (en.mood) {
    const cur = avg(P.keys, (m) => m.mood);
    const n = vals(P.keys, (m) => m.mood).length;
    tiles.push(tile({
      cat: 'mood', label: '평균 컨디션', value: cur != null ? `${MOODS[Math.round(cur) - 1].emoji} ${fmtNum(cur)}` : '–',
      delta: deltaEl(cur, avg(PP.keys, (m) => m.mood), { fmt: (v) => fmtNum(v), eps: 0.05, good: 'up' }),
      sub: n ? `5점 만점 · ${n}일 기록` : '기록 없음',
    }));
  }
  view.append(h('div', { class: 'tiles' }, tiles), h('p', { class: 'tiles-caption' }, `▲▼ 표시는 ${PREV_LABEL[type]}와 비교한 값이에요.`));

  // ---------- 차트 ----------
  const charts = [];
  const dayOrWeek = P.daily ? '날짜' : '주';

  if (en.sleep) {
    const goalH = goals.sleepHours;
    const data = P.buckets.map((b) => {
      const v = avg(b.keys, (m) => m.sleep);
      return { ...b, value: v != null ? v / 60 : null };
    });
    if (data.some((d) => d.value != null)) {
      charts.push(chartCard({
        cat: 'sleep', title: '수면 시간', sub: `${P.daily ? '하루 수면 시간' : '주별 하루 평균'} · 가로선은 목표 ${fmtNum(goalH)}시간`,
        chart: () => barChart({
          data, width: W, color: 'var(--c-sleep)', goal: goalH, step: 2, yFmt: (v) => `${v}h`,
          tipFor: (d) => [['var(--c-sleep)', fmtDuration(d.value * 60), P.daily ? '수면' : '하루 평균']],
        }),
        table: { head: [dayOrWeek, '수면'], rows: data.filter((d) => d.value != null).map((d) => [d.title, fmtDuration(d.value * 60)]) },
      }));

      const win = P.buckets.map((b) => {
        const bs = vals(b.keys, (m) => m.bed), ws = vals(b.keys, (m) => m.wake);
        return { ...b, start: bs.length ? mean(bs) : null, end: ws.length ? mean(ws) : null };
      });
      const allBed = vals(P.keys, (m) => m.bed), allWake = vals(P.keys, (m) => m.wake);
      charts.push(chartCard({
        cat: 'sleep', title: '잠든 시각 · 일어난 시각',
        sub: `평균 ${clockOfRel(mean(allBed))}에 자고 ${clockOfRel(mean(allWake))}에 일어나요`,
        chart: () => rangeChart({
          data: win, width: W, color: 'var(--c-sleep)', clock: clockOfRel,
          tipFor: (d) => [['var(--c-sleep)', `${clockOfRel(d.start)} → ${clockOfRel(d.end)}`, fmtDuration(d.end - d.start)]],
        }),
        table: { head: [dayOrWeek, '잠든 시각', '일어난 시각'], rows: win.filter((d) => d.start != null).map((d) => [d.title, clockOfRel(d.start), clockOfRel(d.end)]) },
      }));
    }
  }

  if (en.exercise) {
    const data = P.buckets.map((b) => ({ ...b, value: total(b.keys, (m) => m.ex), list: b.keys.flatMap((k) => M(k).exList) }));
    if (data.some((d) => d.value != null)) {
      const byType = {};
      P.keys.forEach((k) => M(k).exList.forEach((e) => { byType[e.type] = (byType[e.type] || 0) + e.minutes; }));
      const items = EXERCISES.filter((t) => byType[t.key])
        .map((t) => ({ emoji: t.emoji, label: t.label, value: byType[t.key], display: fmtDuration(byType[t.key]) }))
        .sort((a, b) => b.value - a.value);
      const goal = goals.exerciseWeekMin;
      charts.push(chartCard({
        cat: 'exercise', title: '운동 시간 (분)',
        sub: P.daily ? '회색 점은 쉬는 날로 기록한 날' : `주별 합계${goal ? ` · 가로선은 목표 주 ${goal}분` : ''}`,
        chart: () => barChart({
          data, width: W, color: 'var(--c-exercise)', zeroDot: true, goal: !P.daily && goal ? goal : null,
          tipFor: (d) => [['var(--c-exercise)', d.value ? fmtDuration(d.value) : '쉬는 날', d.value ? summarizeExercise(d.list) : '']],
        }),
        extra: items.length ? hbarList(items) : null,
        table: { head: [dayOrWeek, '운동', '내용'], rows: data.filter((d) => d.value != null).map((d) => [d.title, d.value ? fmtDuration(d.value) : '쉼', summarizeExercise(d.list)]) },
      }));
    }
  }

  if (en.alcohol) {
    const data = P.buckets.map((b) => {
      const g = total(b.keys, (m) => m.alc);
      const drinks = {};
      b.keys.forEach((k) => Object.entries(M(k).drinks).forEach(([dk, n]) => { drinks[dk] = (drinks[dk] || 0) + n; }));
      return { ...b, value: g != null ? sojuGlasses(g) : null, drinks };
    });
    if (data.some((d) => d.value != null)) {
      const counts = {};
      P.keys.forEach((k) => Object.entries(M(k).drinks).forEach(([dk, n]) => { counts[dk] = (counts[dk] || 0) + n; }));
      const items = DRINKS.filter((d) => counts[d.key])
        .map((d) => ({ emoji: d.emoji, label: d.label, value: counts[d.key] * d.grams, display: `${counts[d.key]}${d.unit} · 알코올 ${Math.round(counts[d.key] * d.grams)}g` }))
        .sort((a, b) => b.value - a.value);
      charts.push(chartCard({
        cat: 'alcohol', title: '음주량 (소주 잔 환산)',
        sub: P.daily ? '회색 점은 안 마신 날로 기록한 날' : '주별 합계',
        chart: () => barChart({
          data, width: W, color: 'var(--c-alcohol)', zeroDot: true,
          tipFor: (d) => [['var(--c-alcohol)', d.value ? `소주 ${fmtNum(d.value)}잔 분량` : '안 마심', d.value ? drinkList(d.drinks).join(', ') : '']],
        }),
        extra: items.length ? hbarList(items) : null,
        table: { head: [dayOrWeek, '소주 환산', '마신 술'], rows: data.filter((d) => d.value != null).map((d) => [d.title, d.value ? `${fmtNum(d.value)}잔` : '0', drinkList(d.drinks).join(', ') || '안 마심']) },
      }));
    }
  }

  if (en.meal) {
    if (P.daily) {
      const data = P.buckets.map((b) => ({ ...b, meals: M(b.keys[0]).meals }));
      if (data.some((d) => d.meals)) {
        const rows = MEALS.map((m) => ({ key: m.key, label: m.key === 'snack' ? '간식·야식' : m.label }));
        charts.push(chartCard({
          cat: 'meal', title: '식사', sub: '끼니별로 어떻게 먹었는지',
          chart: () => mealMatrix({
            data, rows, width: W, colors: MEAL_COLORS,
            tipFor: (d) => MEALS.map((m) => {
              const r = d.meals?.[m.key];
              return [r && r !== 'skip' ? MEAL_COLORS[r] : null, r ? MEAL_RATING[r].long : '기록 없음', m.label];
            }),
          }),
          legend: legend([
            { color: 'var(--meal-good)', label: '건강하게', cls: 'round' },
            { color: 'var(--meal-ok)', label: '보통', cls: 'round' },
            { color: 'var(--meal-heavy)', label: '과식·자극적', cls: 'round' },
            { label: '안 먹음', cls: 'ring' },
          ]),
          table: {
            head: ['날짜', ...MEALS.map((m) => m.label)],
            rows: data.filter((d) => d.meals).map((d) => [d.title, ...MEALS.map((m) => (d.meals[m.key] ? MEAL_RATING[d.meals[m.key]].label : null))]),
          },
        }));
      }
    } else {
      const data = P.buckets.map((b) => {
        const r = b.keys.flatMap((k) => Object.values(M(k).meals || {}).filter((v) => v !== 'skip'));
        return { ...b, value: r.length ? (r.filter((v) => v === 'good').length / r.length) * 100 : null, n: r.length };
      });
      if (data.some((d) => d.value != null)) {
        charts.push(chartCard({
          cat: 'meal', title: '건강하게 먹은 끼니 비율', sub: '주별 · 안 먹은 끼니는 빼고 계산',
          chart: () => barChart({ data, width: W, color: 'var(--c-meal)', yMax: 100, step: 25, yFmt: (v) => `${v}%`, tipFor: (d) => [['var(--c-meal)', `${Math.round(d.value)}%`, `${d.n}끼 중`]] }),
          table: { head: ['주', '비율', '끼니 수'], rows: data.filter((d) => d.value != null).map((d) => [d.title, `${Math.round(d.value)}%`, `${d.n}`]) },
        }));
      }
    }
  }

  if (en.water) {
    const data = P.buckets.map((b) => ({ ...b, value: avg(b.keys, (m) => m.water) }));
    if (data.some((d) => d.value != null)) {
      charts.push(chartCard({
        cat: 'water', title: '물 (잔)', sub: `${P.daily ? `1잔 ${CUP_ML}ml` : '주별 하루 평균'} · 가로선은 목표 ${goals.waterCups}잔`,
        chart: () => barChart({
          data, width: W, color: 'var(--c-water)', goal: goals.waterCups, step: goals.waterCups > 12 ? 4 : 2,
          tipFor: (d) => [['var(--c-water)', `${fmtNum(d.value)}잔`, P.daily ? `${fmtNum((d.value * CUP_ML) / 1000, 2)}L` : '하루 평균']],
        }),
        table: { head: [dayOrWeek, '물'], rows: data.filter((d) => d.value != null).map((d) => [d.title, `${fmtNum(d.value)}잔`]) },
      }));
    }
  }

  if (en.weight) {
    const data = P.buckets.map((b) => ({ ...b, value: avg(b.keys, (m) => m.weight) }));
    if (data.some((d) => d.value != null)) {
      charts.push(chartCard({
        cat: 'weight', title: '체중 (kg)', sub: P.daily ? '기록한 날을 이어서 보여줘요' : '주별 평균',
        chart: () => lineChart({ data, width: W, color: 'var(--c-weight)', yFmt: (v) => fmtNum(v), tipFor: (d) => [['var(--c-weight)', `${d.value.toFixed(1)}kg`, P.daily ? '' : '주 평균']] }),
        table: { head: [dayOrWeek, '체중'], rows: data.filter((d) => d.value != null).map((d) => [d.title, `${d.value.toFixed(1)}kg`]) },
      }));
    }
  }

  if (en.mood) {
    const data = P.buckets.map((b) => ({ ...b, value: avg(b.keys, (m) => m.mood) }));
    if (data.some((d) => d.value != null)) {
      charts.push(chartCard({
        cat: 'mood', title: '컨디션', sub: P.daily ? '5점 만점' : '주별 평균 · 5점 만점',
        chart: () => lineChart({
          data, width: W, color: 'var(--c-mood)', domain: [1, 5], ticks: [1, 2, 3, 4, 5], padLeft: 34, tickClass: 'tick tick-emoji', yFmt: (v) => MOODS[v - 1].emoji,
          tipFor: (d) => [['var(--c-mood)', `${MOODS[Math.round(d.value) - 1].emoji} ${fmtNum(d.value)}점`, P.daily ? MOODS[d.value - 1].label : '주 평균']],
        }),
        table: { head: [dayOrWeek, '컨디션'], rows: data.filter((d) => d.value != null).map((d) => [d.title, `${fmtNum(d.value)}점`]) },
      }));
    }
  }

  view.append(...(charts.length ? charts : [h('div', { class: 'card empty' }, h('div', { class: 'big' }, '🗓️'), h('b', null, '이 기간에는 기록이 없어요'), '다른 기간을 보거나 오늘 기록을 남겨 보세요.')]));

  view.append(h('h2', { class: 'section-title' }, '발견한 패턴 · 최근 90일'), insightsCard(M, settings, today));
  return view;
}

// ---------- pieces ----------

function tile({ cat, label, value, sub, delta }) {
  return h(
    'div',
    { class: 'tile', style: { '--cat': `var(--c-${cat})` } },
    h('div', { class: 'tile-label' }, h('i'), label),
    h('div', { class: 'tile-value' }, value),
    delta,
    sub && h('div', { class: 'tile-sub' }, sub)
  );
}

// good: 'up' | 'down' | undefined(중립)
function deltaEl(cur, prev, { fmt, eps, good }) {
  if (cur == null || prev == null) return null;
  const d = cur - prev;
  if (Math.abs(d) < eps) return h('div', { class: 'delta' }, '변화 없음');
  const up = d > 0;
  const cls = good ? (up === (good === 'up') ? ' good' : ' bad') : '';
  return h('div', { class: 'delta' + cls }, `${up ? '▲' : '▼'} ${fmt(Math.abs(d))}`);
}

function chartCard({ cat, title, sub, chart, table, legend: legendEl, extra }) {
  let asTable = false;
  const body = h('div');
  const btn = h('button', { class: 'mini-toggle', 'aria-label': '차트와 표 전환' });
  const draw = () => {
    btn.textContent = asTable ? '차트' : '표';
    body.replaceChildren(asTable ? (table.rows.length ? tableView(table) : h('p', { class: 'card-sub' }, '기록 없음')) : chart());
  };
  btn.addEventListener('click', () => { asTable = !asTable; draw(); });
  draw();
  return h(
    'section',
    { class: 'card chart-card', style: { '--cat': `var(--c-${cat})` } },
    h('div', { class: 'chart-head' }, h('div', null, h('h3', null, CAT[cat].emoji, ' ', title), sub && h('p', { class: 'card-sub' }, sub)), btn),
    body,
    legendEl,
    extra
  );
}

function legend(items) {
  return h('div', { class: 'legend' }, items.map((it) => h('span', null, h('i', { class: it.cls || '', style: it.color ? { '--k': it.color } : null }), it.label)));
}

function summarizeExercise(list) {
  const by = {};
  list.forEach((e) => { by[e.type] = (by[e.type] || 0) + e.minutes; });
  return Object.entries(by)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t, m]) => `${EXERCISE[t]?.label || '운동'} ${m}분`)
    .join(' · ');
}

function insightsCard(M, settings, today) {
  const en = settings.enabled;
  const keys = rangeKeys(addDays(today, -89), today);
  const goal = settings.goals.sleepHours * 60;
  const items = [];
  const split = (fn) => {
    const a = [], b = [];
    keys.forEach((k) => fn(k, a, b));
    return a.length >= 3 && b.length >= 3 ? [mean(a), mean(b)] : null;
  };

  if (en.alcohol && en.mood) {
    const r = split((k, a, b) => {
      const alc = M(k).alc, nx = addDays(k, 1);
      if (alc == null || nx > today || M(nx).mood == null) return;
      (alc > 0 ? a : b).push(M(nx).mood);
    });
    if (r && Math.abs(r[0] - r[1]) >= 0.3) items.push(['🍷', `술 마신 다음 날 컨디션은 평균 ${fmtNum(r[0])}점, 안 마신 다음 날은 ${fmtNum(r[1])}점이에요.`]);
  }
  if (en.alcohol && en.sleep) {
    const r = split((k, a, b) => {
      const alc = M(k).alc, nx = addDays(k, 1);
      if (alc == null || nx > today || M(nx).sleep == null) return;
      (alc > 0 ? a : b).push(M(nx).sleep);
    });
    if (r && Math.abs(r[0] - r[1]) >= 15) {
      items.push(['🌙', `술 마신 날 밤에는 평균 ${fmtDuration(r[0])} 잤어요. 안 마신 날보다 ${fmtDuration(Math.abs(r[0] - r[1]))} ${r[0] < r[1] ? '적게' : '더'} 잤어요.`]);
    }
  }
  if (en.exercise && en.mood) {
    const r = split((k, a, b) => {
      const m = M(k);
      if (m.mood == null) return;
      (m.ex > 0 ? a : b).push(m.mood);
    });
    if (r && Math.abs(r[0] - r[1]) >= 0.3) items.push(['🏃', `운동한 날 컨디션은 평균 ${fmtNum(r[0])}점으로, 안 한 날(${fmtNum(r[1])}점)보다 ${r[0] > r[1] ? '좋아요' : '낮아요'}.`]);
  }
  if (en.sleep && en.mood) {
    const r = split((k, a, b) => {
      const m = M(k);
      if (m.mood == null || m.sleep == null) return;
      (m.sleep >= goal ? a : b).push(m.mood);
    });
    if (r && Math.abs(r[0] - r[1]) >= 0.3) items.push(['😴', `${fmtDuration(goal)} 이상 잔 날 컨디션은 ${fmtNum(r[0])}점, 덜 잔 날은 ${fmtNum(r[1])}점이에요.`]);
  }

  const facts = [h('div', { class: 'fact' }, h('b', null, `${streak(today, anyLogged)}일`), h('small', null, '연속 기록'))];
  if (en.alcohol) {
    let lastDrink = null;
    for (let i = 0; i < 400; i++) {
      const k = addDays(today, -i);
      if (M(k).alc > 0) { lastDrink = k; break; }
    }
    const ago = lastDrink ? diffDays(lastDrink, today) : null;
    facts.push(h('div', { class: 'fact' }, h('b', null, ago == null ? '–' : ago === 0 ? '오늘' : ago === 1 ? '어제' : `${ago}일 전`), h('small', null, '마지막 음주')));
  }
  if (en.exercise) {
    const last30 = rangeKeys(addDays(today, -29), today);
    facts.push(h('div', { class: 'fact' }, h('b', null, `${last30.filter((k) => M(k).ex > 0).length}일`), h('small', null, '최근 30일 운동')));
  }

  return h(
    'section',
    { class: 'card' },
    h('div', { class: 'facts', style: { 'grid-template-columns': `repeat(${facts.length}, 1fr)` } }, facts),
    items.length
      ? items.map(([e, t]) => h('div', { class: 'insight' }, h('span', null, e), h('p', null, t)))
      : h('p', { class: 'card-note', style: { 'margin-top': '12px' } }, '기록이 더 쌓이면 수면·음주·운동과 컨디션 사이의 패턴을 찾아서 알려 드릴게요.')
  );
}
