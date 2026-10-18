import {
  h, todayKey, addDays, diffDays, fmtDateLong, fmtDuration, fmtNum, fmtMD, mondayOf, rangeKeys, debounce, autoGrow,
} from '../util.js';
import * as store from '../store.js';
import {
  CATS, CAT, SLEEP_Q, MEALS, MAIN_MEALS, MEAL_RATINGS, EXERCISES, EXERCISE, INTENSITY, DRINKS, MOODS, CUP_ML,
} from '../constants.js';
import { sleepMinutes, alcoholGrams, sojuGlasses, isLogged, findLast, exerciseMinutes } from '../metrics.js';
import { openSheet } from '../sheet.js';
import { icon } from '../icons.js';

const CARDS = {
  sleep: sleepCard,
  meal: mealCard,
  exercise: exerciseCard,
  alcohol: alcoholCard,
  water: waterCard,
  weight: weightCard,
  mood: moodCard,
};

export function renderToday(app) {
  const date = app.state.date;
  const settings = store.getSettings();
  const cats = CATS.filter((c) => settings.enabled[c.key]);
  const ctx = {
    app,
    date,
    settings,
    day: store.getDay(date),
    save: (fn) => store.updateDay(date, fn),
    // 입력 중인 칸이 다시 그려지지 않도록 화면 갱신 없이 저장
    saveQuiet: (fn) => {
      store.updateDay(date, fn, { silent: true });
      ctx.refreshHeader();
    },
  };
  let headerEl = header(ctx, cats);
  ctx.refreshHeader = () => {
    const next = header(ctx, cats);
    headerEl.replaceWith(next);
    headerEl = next;
  };
  const root = h('div', { class: 'view' }, headerEl, backupNudge(ctx), cats.map((c) => CARDS[c.key](ctx)));
  enableSwipe(root, app);
  return root;
}

// ---------- header ----------

function greeting(name, isToday) {
  const who = name ? `${name}님, ` : '';
  if (!isToday) return `${who}그날은 어땠나요?`;
  const hr = new Date().getHours();
  if (hr >= 4 && hr < 11) return `${who}좋은 아침이에요 ☀️`;
  if (hr >= 11 && hr < 17) return `${who}오늘 하루 어때요?`;
  if (hr >= 17 && hr < 22) return `${who}오늘도 수고했어요`;
  return `${who}푹 쉬어요 🌙`;
}

function dateTag(date, today) {
  const diff = diffDays(date, today);
  if (diff === 0) return h('span', { class: 'date-tag today' }, '오늘');
  if (diff === 1) return h('span', { class: 'date-tag' }, '어제');
  if (diff === 2) return h('span', { class: 'date-tag' }, '그제');
  return h('span', { class: 'date-tag' }, `${diff}일 전`);
}

function header(ctx, cats) {
  const { app, date, settings } = ctx;
  const day = store.getDay(date);
  const today = todayKey();
  const isToday = date === today;
  const done = cats.filter((c) => isLogged(c.key, day)).length;
  return h(
    'header',
    { class: 'today-head' },
    h(
      'div',
      { class: 'brand-row' },
      h('div', { class: 'brand' }, h('span', { class: 'brand-mark' }, '♥'), 'CareJH'),
      !isToday && h('button', { class: 'pill-btn', onclick: () => app.setDate(today) }, '오늘로 가기')
    ),
    h('h1', { class: 'greet' }, greeting(settings.name, isToday)),
    h(
      'div',
      { class: 'date-nav' },
      h('button', { class: 'icon-btn', 'aria-label': '이전 날', onclick: () => app.setDate(addDays(date, -1)) }, icon('chevL')),
      h(
        'label',
        { class: 'date-label' },
        h('span', null, fmtDateLong(date)),
        dateTag(date, today),
        h('input', {
          type: 'date',
          value: date,
          max: today,
          'aria-label': '날짜 고르기',
          onclick: (e) => { try { e.target.showPicker(); } catch {} },
          onchange: (e) => {
            const v = e.target.value;
            if (v && v <= today) app.setDate(v);
          },
        })
      ),
      h('button', { class: 'icon-btn', 'aria-label': '다음 날', disabled: isToday, onclick: () => app.setDate(addDays(date, 1)) }, icon('chevR'))
    ),
    h(
      'div',
      { class: 'progress' },
      h('div', { class: 'progress-text' }, isToday ? '오늘 기록 ' : '이날 기록 ', h('b', null, `${done}/${cats.length}`)),
      h(
        'div',
        { class: 'progress-pills' },
        cats.map((c) => h('span', { class: 'pp' + (isLogged(c.key, day) ? ' on' : ''), style: { '--cat': `var(--c-${c.key})` }, title: c.label }, c.emoji))
      )
    )
  );
}

function backupNudge(ctx) {
  const s = ctx.settings;
  if (ctx.date !== todayKey() || store.dayCount() < 14) return null;
  const last = Math.max(s.lastBackupAt || 0, s.nudgeSnoozedAt || 0);
  if (Date.now() - last < 30 * 864e5) return null;
  return h(
    'div',
    { class: 'nudge' },
    h('span', null, '💾'),
    h('p', null, '기록은 이 휴대폰에만 저장돼요. 가끔 백업 파일을 만들어 두면 폰을 바꿔도 안심이에요.'),
    h(
      'div',
      { class: 'btn-row' },
      h('button', { class: 'btn btn-sm btn-primary', onclick: () => ctx.app.go('settings') }, '백업하러 가기'),
      h('button', { class: 'btn btn-sm btn-ghost', onclick: () => store.updateSettings((st) => { st.nudgeSnoozedAt = Date.now(); }) }, '나중에')
    )
  );
}

// ---------- shared bits ----------

function card(key, valueEl, ...body) {
  return h(
    'section',
    { class: 'card', style: { '--cat': `var(--c-${key})` }, 'data-cat': key },
    h('div', { class: 'card-head' }, h('span', { class: 'card-icon' }, CAT[key].emoji), h('h2', { class: 'card-title' }, CAT[key].label), valueEl),
    ...body
  );
}

const valueSpan = (text) => h('span', { class: 'card-value' }, text || '');

function segBtn({ emoji, label }, on, onclick, extra = {}) {
  return h(
    'button',
    { class: 'seg-btn' + (on ? ' on' : ''), 'aria-pressed': on, onclick, ...extra },
    h('span', { class: 'seg-ico' }, emoji),
    h('span', { class: 'seg-txt' }, label)
  );
}

function stepper({ display, onMinus, onPlus, minusDisabled, label = '' }) {
  return h(
    'div',
    { class: 'stepper' },
    h('button', { class: 'st-btn', onclick: onMinus, disabled: !!minusDisabled, 'aria-label': `${label} 줄이기` }, '−'),
    h('span', { class: 'st-val' }, display),
    h('button', { class: 'st-btn', onclick: onPlus, 'aria-label': `${label} 늘리기` }, '+')
  );
}

function memoField(ctx, field, placeholder) {
  const save = debounce((v) => ctx.saveQuiet((d) => { d[field] = v.trim() ? v : null; }), 400);
  const ta = h('textarea', {
    class: 'memo',
    rows: 1,
    placeholder,
    value: ctx.day[field] || '',
    oninput: (e) => { autoGrow(e.target); save(e.target.value); },
    onblur: () => save.flush(),
  });
  requestAnimationFrame(() => autoGrow(ta));
  return ta;
}

const weekLabel = (date) => (mondayOf(date) === mondayOf(todayKey()) ? '이번 주' : '그 주');

function weekKeys(date) {
  const mon = mondayOf(date);
  return rangeKeys(mon, addDays(mon, 6));
}

// ---------- 수면 ----------

function sleepCard(ctx) {
  const { day, date, settings } = ctx;
  const sl = day.sleep || {};
  const goal = settings.goals.sleepHours * 60;
  const valueEl = valueSpan();
  const noteEl = h('div', { class: 'card-note' });
  const inputs = {};

  const refresh = () => {
    const m = sleepMinutes({ bed: inputs.bed.value, wake: inputs.wake.value });
    valueEl.textContent = m != null ? fmtDuration(m) : '';
    noteEl.classList.toggle('ok', m != null && m >= goal);
    if (m == null) noteEl.textContent = '어젯밤 잠든 시간과 오늘 아침 일어난 시간을 적어 주세요.';
    else if (m >= goal) noteEl.textContent = `목표 ${fmtDuration(goal)} 달성 👍`;
    else noteEl.textContent = `목표 ${fmtDuration(goal)}까지 ${fmtDuration(goal - m)} 모자라요.`;
  };

  // 기기 언어에 따라 '오후 11:40'처럼 길게 나오는 걸 막으려고, 24시간 표기를 직접 보여주고
  // 투명한 기본 시간 입력창을 위에 덮어서 탭하면 휴대폰의 시간 선택기가 열리게 합니다.
  const timeField = (field, label) => {
    const shown = h('span', { class: 'tf-value' });
    const wrap = h('label', { class: 'time-field' }, h('span', { class: 'tf-label' }, label), shown);
    const show = () => {
      shown.textContent = inp.value || '--:--';
      wrap.classList.toggle('is-empty', !inp.value);
    };
    const onTime = () => {
      show();
      ctx.saveQuiet((d) => {
        d.sleep = { ...(d.sleep || {}), [field]: inp.value || null };
      });
      refresh();
    };
    const inp = h('input', {
      type: 'time',
      class: 'time-input',
      value: sl[field] || '',
      'aria-label': label,
      oninput: onTime,
      onchange: onTime,
      onclick: (e) => { try { e.target.showPicker(); } catch {} },
    });
    inputs[field] = inp;
    wrap.append(inp);
    show();
    return wrap;
  };

  const prev = !sl.bed && !sl.wake ? findLast(date, (d) => d.sleep?.bed && d.sleep?.wake) : null;
  const quick = prev
    ? h(
        'button',
        { class: 'quick', onclick: () => ctx.save((d) => { d.sleep = { ...(d.sleep || {}), bed: prev.day.sleep.bed, wake: prev.day.sleep.wake }; }) },
        `↺ 지난번처럼 ${prev.day.sleep.bed} → ${prev.day.sleep.wake}`
      )
    : null;

  const el = card(
    'sleep',
    valueEl,
    h('div', { class: 'time-row' }, timeField('bed', '잠든 시간'), h('span', { class: 'time-arrow' }, '→'), timeField('wake', '일어난 시간')),
    quick,
    noteEl,
    h('div', { class: 'field-label' }, '잠은 어땠나요?'),
    h(
      'div',
      { class: 'seg' },
      SLEEP_Q.map((o) =>
        segBtn(o, sl.quality === o.key, () =>
          ctx.save((d) => {
            const s = { ...(d.sleep || {}) };
            s.quality = s.quality === o.key ? null : o.key;
            d.sleep = s;
          })
        )
      )
    )
  );
  refresh();
  return el;
}

// ---------- 식사 ----------

function mealCard(ctx) {
  const meals = ctx.day.meals || {};
  const eaten = MAIN_MEALS.filter((k) => meals[k] && meals[k] !== 'skip').length;
  const anyMain = MAIN_MEALS.some((k) => meals[k]);
  const toggle = (mk, rk) =>
    ctx.save((d) => {
      const m = { ...(d.meals || {}) };
      m[mk] = m[mk] === rk ? null : rk;
      d.meals = m;
    });
  return card(
    'meal',
    valueSpan(anyMain ? `${eaten}/3끼` : ''),
    MEALS.map((m) =>
      h(
        'div',
        { class: 'meal-row' },
        h('span', { class: 'meal-label' }, m.label),
        h('div', { class: 'seg' }, MEAL_RATINGS.map((r) => segBtn(r, meals[m.key] === r.key, () => toggle(m.key, r.key), { 'data-r': r.key, 'aria-label': `${m.label} ${r.long}` })))
      )
    ),
    memoField(ctx, 'mealMemo', '뭐 먹었는지 메모 (선택)')
  );
}

// ---------- 운동 ----------

function exerciseCard(ctx) {
  const { day, date, settings } = ctx;
  const list = day.exercise || [];
  const total = list.reduce((s, e) => s + e.minutes, 0);
  const goal = settings.goals.exerciseWeekMin;
  const wkTotal = weekKeys(date).reduce((s, k) => s + (exerciseMinutes(store.getDay(k)) || 0), 0);

  const items = list.map((e, i) => {
    const t = EXERCISE[e.type] || EXERCISE.etc;
    const inten = INTENSITY.find((o) => o.key === e.intensity);
    return h(
      'button',
      { class: 'ex-item', onclick: () => exerciseSheet(ctx, i), 'aria-label': `${t.label} ${e.minutes}분 수정` },
      h('span', { class: 'ex-ico' }, t.emoji),
      h('span', { class: 'ex-main' }, h('b', null, t.label), h('small', null, [inten?.label, e.memo].filter(Boolean).join(' · '))),
      h('span', { class: 'ex-min' }, `${e.minutes}분`)
    );
  });

  return card(
    'exercise',
    valueSpan(total ? fmtDuration(total) : day.exerciseRest ? '휴식' : ''),
    items.length ? h('div', { class: 'ex-list' }, items) : null,
    h(
      'div',
      { class: 'btn-row' },
      h('button', { class: 'btn btn-cat', onclick: () => exerciseSheet(ctx, -1) }, '+ 운동 추가'),
      !list.length &&
        h(
          'button',
          {
            class: 'btn btn-ghost' + (day.exerciseRest ? ' on' : ''),
            'aria-pressed': !!day.exerciseRest,
            onclick: () => ctx.save((d) => { d.exerciseRest = !d.exerciseRest; }),
          },
          day.exerciseRest ? '😴 쉬는 날 ✓' : '😴 오늘은 쉬어요'
        )
    ),
    goal > 0 &&
      h(
        'div',
        { class: 'week-prog' },
        h('div', { class: 'wp-text' }, h('span', null, `${weekLabel(date)} 운동`), h('span', null, h('b', null, `${wkTotal}분`), ` / 목표 ${goal}분`)),
        h('div', { class: 'meter' }, h('i', { style: { width: `${Math.min(100, (wkTotal / goal) * 100)}%` } }))
      )
  );
}

function exerciseSheet(ctx, index) {
  const existing = index >= 0 ? (ctx.day.exercise || [])[index] : null;
  const recent = findLast(addDays(ctx.date, 1), (d) => d.exercise?.length);
  const st = {
    type: existing?.type || recent?.day.exercise.at(-1).type || 'walk',
    minutes: existing?.minutes || 30,
    intensity: existing?.intensity || 2,
    memo: existing?.memo || '',
  };

  openSheet({
    title: existing ? '운동 수정' : '운동 추가',
    cat: 'exercise',
    build(body, close) {
      const submit = () => {
        const item = { type: st.type, minutes: st.minutes, intensity: st.intensity };
        if (st.memo.trim()) item.memo = st.memo.trim();
        ctx.save((d) => {
          const l = [...(d.exercise || [])];
          if (index >= 0) l[index] = item;
          else l.push(item);
          d.exercise = l;
          d.exerciseRest = null;
        });
        close();
      };
      const remove = () => {
        ctx.save((d) => { d.exercise = (d.exercise || []).filter((_, i) => i !== index); });
        close();
      };
      const draw = () =>
        body.replaceChildren(
          h('div', { class: 'field-label' }, '무슨 운동?'),
          h(
            'div',
            { class: 'ex-grid' },
            EXERCISES.map((t) =>
              h('button', { class: 'ex-type' + (st.type === t.key ? ' on' : ''), 'aria-pressed': st.type === t.key, onclick: () => { st.type = t.key; draw(); } }, h('span', null, t.emoji), h('small', null, t.label))
            )
          ),
          h('div', { class: 'field-label' }, '얼마나?'),
          h(
            'div',
            { class: 'min-row' },
            stepper({
              label: '운동 시간',
              display: [String(st.minutes), h('small', null, '분')],
              minusDisabled: st.minutes <= 5,
              onMinus: () => { st.minutes = Math.max(5, st.minutes - 5); draw(); },
              onPlus: () => { st.minutes = Math.min(600, st.minutes + 5); draw(); },
            })
          ),
          h('div', { class: 'chips' }, [10, 20, 30, 45, 60, 90].map((m) => h('button', { class: 'chip' + (st.minutes === m ? ' on' : ''), onclick: () => { st.minutes = m; draw(); } }, `${m}분`))),
          h('div', { class: 'field-label' }, '강도'),
          h('div', { class: 'seg' }, INTENSITY.map((o) => segBtn(o, st.intensity === o.key, () => { st.intensity = o.key; draw(); }))),
          h('input', { class: 'text-input', placeholder: '메모 (선택) 예: 한강 5km', value: st.memo, oninput: (e) => { st.memo = e.target.value; } }),
          h(
            'div',
            { class: 'btn-row sheet-actions' },
            existing && h('button', { class: 'btn btn-danger', onclick: remove }, '삭제'),
            h('button', { class: 'btn btn-primary grow', onclick: submit }, existing ? '저장' : '추가하기')
          )
        );
      draw();
    },
  });
}

// ---------- 음주 ----------

function alcoholCard(ctx) {
  const { app, day, date, settings } = ctx;
  const a = day.alcohol || {};
  const g = alcoholGrams(a);
  const open = g > 0 || app.state.alcoholOpen === date;
  const glasses = sojuGlasses(g);

  const add = (key, n) =>
    ctx.save((d) => {
      const al = { ...(d.alcohol || {}) };
      al[key] = Math.max(0, (al[key] || 0) + n);
      d.alcohol = al;
      d.alcoholNone = null;
    });

  const drinkDays = weekKeys(date).filter((k) => alcoholGrams(store.getDay(k).alcohol) > 0).length;
  const limit = settings.goals.alcoholDaysWeek;
  const weekNote = h('div', { class: 'card-note' }, `${weekLabel(date)} 마신 날 ${drinkDays}일 · 목표 주 ${limit}일 이하${drinkDays > limit ? ' (넘었어요)' : ''}`);

  if (day.alcoholNone) {
    return card(
      'alcohol',
      valueSpan('안 마심'),
      h('div', { class: 'sober' }, h('span', null, '🙅 오늘은 안 마셨어요'), h('button', { class: 'btn btn-sm btn-ghost', onclick: () => ctx.save((d) => { d.alcoholNone = null; }) }, '취소')),
      soberNote(date),
      weekNote
    );
  }

  if (!open) {
    return card(
      'alcohol',
      valueSpan(),
      h(
        'div',
        { class: 'btn-row', style: { 'margin-top': '0' } },
        h('button', { class: 'btn btn-cat', onclick: () => { app.state.alcoholOpen = date; app.render({ keepScroll: true }); } }, '🍻 마셨어요'),
        h('button', { class: 'btn btn-ghost', onclick: () => ctx.save((d) => { d.alcoholNone = true; d.alcohol = null; }) }, '🙅 안 마셨어요')
      ),
      soberNote(date),
      weekNote
    );
  }

  const rows = DRINKS.map((dk) => {
    const n = a[dk.key] || 0;
    let note = dk.note;
    if (dk.key === 'soju' && n >= 7) note = `${Math.floor(n / 7)}병${n % 7 ? ` ${n % 7}잔` : ''}`;
    return h(
      'div',
      { class: 'drink-row' + (n ? ' has' : '') },
      h('span', { class: 'drink-ico' }, dk.emoji),
      h('div', { class: 'drink-main' }, h('b', null, dk.label), note && h('small', null, note)),
      dk.key === 'soju' && h('button', { class: 'chip chip-sm', onclick: () => add('soju', 7) }, '+1병'),
      stepper({ label: dk.label, display: n ? `${n}${dk.unit}` : '0', minusDisabled: !n, onMinus: () => add(dk.key, -1), onPlus: () => add(dk.key, 1) })
    );
  });

  return card(
    'alcohol',
    valueSpan(g > 0 ? `소주 ${fmtNum(glasses)}잔 분량` : ''),
    h('div', { class: 'drink-list' }, rows),
    g > 0 && h('div', { class: 'alc-total' }, '알코올 약 ', h('b', null, `${Math.round(g)}g`), ` · 소주로 치면 `, h('b', null, `${fmtNum(glasses)}잔`)),
    weekNote
  );
}

function soberNote(date) {
  const last = findLast(date, (d) => alcoholGrams(d.alcohol) > 0);
  if (!last) return null;
  const n = diffDays(last.key, date);
  return h('div', { class: 'card-note' }, `마지막으로 마신 날: ${fmtMD(last.key)} (${n}일 전)`);
}

// ---------- 물 ----------

function waterCard(ctx) {
  const w = ctx.day.water || 0;
  const goal = ctx.settings.goals.waterCups;
  const set = (n) => ctx.save((d) => { d.water = n > 0 ? n : null; });
  const slots = Math.max(goal, w);
  return card(
    'water',
    valueSpan(`${w} / ${goal}잔`),
    h(
      'div',
      { class: 'cups' },
      Array.from({ length: slots }, (_, i) =>
        h('button', { class: 'cup' + (i < w ? ' on' : ''), 'aria-label': `${i + 1}잔`, onclick: () => set(i + 1 === w ? i : i + 1) }, icon('cup'))
      )
    ),
    h(
      'div',
      { class: 'water-foot' },
      h('div', { class: 'card-note' }, `1잔 ${CUP_ML}ml · ${fmtNum((w * CUP_ML) / 1000, 2)}L${w >= goal ? ' · 목표 달성 💧' : ''}`),
      stepper({ label: '물', display: `${w}잔`, minusDisabled: !w, onMinus: () => set(w - 1), onPlus: () => set(w + 1) })
    )
  );
}

// ---------- 체중 ----------

function weightCard(ctx) {
  const { day, date } = ctx;
  const wt = day.weight;
  const prev = findLast(date, (d) => d.weight != null);
  const base = wt ?? prev?.day.weight ?? null;
  const valueEl = valueSpan(wt != null ? `${wt.toFixed(1)}kg` : '');
  const set = (v) => ctx.save((d) => { d.weight = Math.round(v * 10) / 10; });
  const valid = (v) => v >= 20 && v <= 300;

  const input = h('input', {
    type: 'number',
    inputmode: 'decimal',
    step: '0.1',
    min: '20',
    max: '300',
    class: 'num-input',
    'aria-label': '체중 (kg)',
    placeholder: base != null ? base.toFixed(1) : '00.0',
    value: wt != null ? wt.toFixed(1) : '',
    oninput: (e) => {
      const v = parseFloat(e.target.value);
      ctx.saveQuiet((d) => { d.weight = valid(v) ? Math.round(v * 10) / 10 : null; });
      valueEl.textContent = valid(v) ? `${v.toFixed(1)}kg` : '';
    },
  });

  let note;
  if (wt != null && prev) {
    const delta = wt - prev.day.weight;
    note = `지난 기록(${fmtMD(prev.key)})보다 ${delta > 0 ? '+' : ''}${delta.toFixed(1)}kg`;
  } else if (prev) note = `지난 기록 ${prev.day.weight.toFixed(1)}kg (${fmtMD(prev.key)})`;
  else note = '아침에 일어나서 재면 가장 정확해요.';

  return card(
    'weight',
    valueEl,
    h(
      'div',
      { class: 'weight-row' },
      h('button', { class: 'st-btn lg', 'aria-label': '0.1kg 줄이기', disabled: base == null, onclick: () => set(base - 0.1) }, '−'),
      h('div', { class: 'weight-input' }, input, h('span', null, 'kg')),
      h('button', { class: 'st-btn lg', 'aria-label': '0.1kg 늘리기', onclick: () => (base != null ? set(base + 0.1) : input.focus()) }, '+')
    ),
    wt == null && prev && h('div', { class: 'weight-quick' }, h('button', { class: 'quick', onclick: () => set(prev.day.weight) }, `↺ 지난번과 같아요 (${prev.day.weight.toFixed(1)}kg)`)),
    h('div', { class: 'card-note', style: { 'text-align': 'center' } }, note)
  );
}

// ---------- 컨디션 ----------

function moodCard(ctx) {
  const m = ctx.day.mood;
  return card(
    'mood',
    valueSpan(m ? MOODS[m - 1].label : ''),
    h(
      'div',
      { class: 'mood-row' },
      MOODS.map((o) =>
        h(
          'button',
          { class: 'mood-btn' + (m === o.key ? ' on' : ''), 'aria-pressed': m === o.key, 'aria-label': o.label, onclick: () => ctx.save((d) => { d.mood = d.mood === o.key ? null : o.key; }) },
          h('span', null, o.emoji),
          h('small', null, o.label)
        )
      )
    ),
    memoField(ctx, 'memo', '오늘 하루 한 줄 메모 (선택)')
  );
}

// ---------- 좌우로 밀어서 날짜 이동 ----------

function enableSwipe(root, app) {
  let x0 = 0, y0 = 0, t0 = 0, ok = false;
  root.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    ok = e.touches.length === 1 && !e.target.closest('input, textarea');
    x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
  }, { passive: true });
  root.addEventListener('touchend', (e) => {
    if (!ok) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0;
    if (Date.now() - t0 > 600 || Math.abs(dx) < 70 || Math.abs(dy) > 45) return;
    const next = addDays(app.state.date, dx < 0 ? 1 : -1);
    if (next <= todayKey()) app.setDate(next);
  }, { passive: true });
}
