import {
  h, todayKey, addDays, diffDays, parseKey, fmtDuration, fmtNum, fmtMD, mondayOf, rangeKeys, debounce, autoGrow, toast, pad2, WD,
} from '../util.js';
import * as store from '../store.js';
import { CATS, CAT, SLEEP_Q, MEALS, MAIN_MEALS, MEAL_RATINGS, EXERCISES, EXERCISE, INTENSITY, DRINKS, MOODS, CUP_ML, SUPP_SUGGESTIONS, CAFFEINE } from '../constants.js';
import {
  sleepMinutes, alcoholGrams, sojuGlasses, caffeineMg, isLateTime, napCredit, isLogged, anyLogged, findLast, exerciseMinutes, activeSupps,
} from '../metrics.js';
import { character, MOOD_EXPR, SLEEP_EXPR } from '../characters.js';
import { openSheet } from '../sheet.js';
import { icon } from '../icons.js';

const CARDS = {
  sleep: sleepCard,
  meal: mealCard,
  exercise: exerciseCard,
  alcohol: alcoholCard,
  caffeine: caffeineCard,
  water: waterCard,
  supplement: supplementCard,
  weight: weightCard,
  mood: moodCard,
};

const MEAL_COLOR = { good: 'var(--meal-good)', ok: 'var(--meal-ok)', heavy: 'var(--meal-heavy)', skip: 'var(--muted)' };

export function renderToday(app) {
  const date = app.state.date;
  const settings = store.getSettings();
  const cats = CATS.filter((c) => settings.enabled[c.key]);
  const ctx = {
    app,
    date,
    settings,
    me: settings.character || 'lion',
    day: store.getDay(date),
    save: (fn) => store.updateDay(date, fn),
    // 입력 중인 칸이 다시 그려지지 않도록 화면 갱신 없이 저장
    saveQuiet: (fn) => {
      store.updateDay(date, fn, { silent: true });
      ctx.refreshTop();
    },
  };
  let weekEl = weekStrip(ctx, cats);
  let heroEl = hero(ctx, cats);
  ctx.refreshTop = () => {
    const w = weekStrip(ctx, cats);
    const hr = hero(ctx, cats);
    weekEl.replaceWith(w);
    heroEl.replaceWith(hr);
    weekEl = w;
    heroEl = hr;
  };
  const root = h('div', { class: 'view' }, topBar(ctx), weekEl, heroEl, backupNudge(ctx), cats.map((c) => CARDS[c.key](ctx)));
  enableSwipe(root, app);
  return root;
}

// ---------- 상단: 날짜, 주간 띠, 캐릭터 ----------

function relDay(date, today) {
  const diff = diffDays(date, today);
  return diff === 0 ? '오늘' : diff === 1 ? '어제' : diff === 2 ? '그제' : `${diff}일 전`;
}

function topBar({ app, date }) {
  const today = todayKey();
  const d = parseKey(date);
  return h(
    'header',
    { class: 'top' },
    h(
      'label',
      { class: 'top-title' },
      h('h1', null, `${d.getMonth() + 1}월 ${d.getDate()}일`, icon('chevD')),
      h('p', null, `${WD[d.getDay()]}요일 · ${relDay(date, today)}`),
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
    date !== today && h('button', { class: 'pill-btn', onclick: () => app.setDate(today) }, '오늘'),
    h('button', { class: 'icon-btn', 'aria-label': '이전 날', onclick: () => app.setDate(addDays(date, -1)) }, icon('chevL')),
    h('button', { class: 'icon-btn', 'aria-label': '다음 날', disabled: date >= today, onclick: () => app.setDate(addDays(date, 1)) }, icon('chevR'))
  );
}

function weekStrip({ app, date }, cats) {
  const today = todayKey();
  const mon = mondayOf(date);
  return h(
    'nav',
    { class: 'week', 'aria-label': '이번 주' },
    rangeKeys(mon, addDays(mon, 6)).map((k) => {
      const day = store.getDay(k);
      const n = cats.filter((c) => isLogged(c.key, day)).length;
      const cls = ['wk-day', k === date && 'sel', k === today && 'today', k > today && 'future', anyLogged(day) && 'has', n === cats.length && 'full'].filter(Boolean).join(' ');
      const d = parseKey(k);
      return h(
        'button',
        { class: cls, disabled: k > today, 'aria-label': `${fmtMD(k)} ${n}개 기록`, 'aria-pressed': k === date, onclick: () => app.setDate(k) },
        h('span', { class: 'wk-label' }, WD[d.getDay()]),
        h('span', { class: 'wk-num' }, d.getDate()),
        h('span', { class: 'wk-dot' })
      );
    })
  );
}

// 이름 뒤에 '아/야' 붙이기
function callName(name) {
  if (!name) return '';
  const code = name.charCodeAt(name.length - 1);
  if (code >= 0xac00 && code <= 0xd7a3) return `${name}${(code - 0xac00) % 28 ? '아' : '야'}, `;
  return `${name}, `;
}

function heroLine(ctx, cats, done) {
  const { date, settings } = ctx;
  const day = store.getDay(date);
  const today = todayKey();
  const total = cats.length;
  const hr = new Date().getHours();
  const you = callName(settings.name);
  const glasses = sojuGlasses(alcoholGrams(day.alcohol));
  const has = (k) => settings.enabled[k];

  if (date !== today) {
    if (!done) return ['wow', `${fmtMD(date)}은 어땠어? 생각나는 것만 채워도 좋아.`];
    if (done === total) return ['proud', `${fmtMD(date)} 기록 완료! 꼼꼼하다.`];
    return ['good', `${fmtMD(date)}, ${total - done}개만 더 채워 볼까?`];
  }
  if (done === total) return ['cheer', `${you}오늘 기록 다 했어! 최고야.`];
  if (has('alcohol') && glasses >= 7) return ['dizzy', '오늘 꽤 마셨네… 자기 전에 물 한 잔 꼭 마시자.'];
  if (has('caffeine') && caffeineMg(day.caffeine) > settings.goals.caffeineMg) return ['dizzy', '카페인을 너무 많이 마셨어. 오늘은 물 마시자!'];
  if (has('mood') && day.mood && day.mood <= 2) return ['meh', '오늘 좀 힘들었구나. 일찍 푹 자자.'];
  if (hr >= 23 || hr < 4) return ['sleepy', `${you}늦었어. 기록하고 얼른 자자.`];
  if (has('sleep') && !isLogged('sleep', day) && hr < 12) return ['sleepy', `${you}좋은 아침! 어젯밤엔 몇 시에 잤어?`];
  if (has('water') && (day.water || 0) < settings.goals.waterCups / 2 && hr >= 14) {
    return ['wow', `물 ${settings.goals.waterCups - (day.water || 0)}잔 더 마시자. 같이 홀짝홀짝!`];
  }
  if (has('supplement') && activeSupps().length && !isLogged('supplement', day) && hr >= 19) return ['wow', '오늘 영양제 챙겨 먹었어?'];
  if (has('exercise') && (exerciseMinutes(day) || 0) > 0) return ['proud', `오늘 운동했구나! 멋져. ${total - done}개만 더 기록하자.`];
  if (!done) return ['good', hr < 11 ? `${you}좋은 아침! 오늘도 가볍게 기록해 보자.` : `${you}오늘 하루 어땠어? 하나씩 기록해 보자.`];
  return ['good', `${done}개 기록했어. ${total - done}개만 더 하면 끝!`];
}

function hero(ctx, cats) {
  const day = store.getDay(ctx.date);
  const done = cats.filter((c) => isLogged(c.key, day)).length;
  const [expr, text] = heroLine(ctx, cats, done);
  const C = 2 * Math.PI * 48;
  const ring = `<svg class="ring" viewBox="0 0 104 104" aria-hidden="true"><circle class="track" cx="52" cy="52" r="48" fill="none" stroke-width="5"/><circle class="bar" cx="52" cy="52" r="48" fill="none" stroke-width="5" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - done / cats.length)}"/></svg>`;
  const avatar = h('div', { class: 'hero-avatar' });
  avatar.innerHTML = ring;
  avatar.append(character(ctx.me, expr), h('span', { class: 'hero-badge', 'aria-label': `${cats.length}개 중 ${done}개 기록` }, `${done}/${cats.length}`));
  return h(
    'section',
    { class: 'hero' },
    avatar,
    h(
      'div',
      { class: 'hero-body' },
      h('p', { class: 'bubble' }, text),
      h(
        'div',
        { class: 'hero-meta' },
        h('div', { class: 'cat-dots', style: { '--n': cats.length } }, cats.map((c) => h('span', { class: 'cd' + (isLogged(c.key, day) ? ' on' : ''), style: { '--cat': `var(--c-${c.key})` }, title: c.label }, icon(c.key))))
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
    character(ctx.me, 'wow'),
    h(
      'div',
      null,
      h('p', null, '기록이 이 폰에만 저장돼요. 백업 파일을 하나 만들어 둘까요?'),
      h(
        'div',
        { class: 'nudge-actions' },
        h('button', { class: 'btn btn-sm btn-primary', onclick: () => ctx.app.go('settings') }, '백업하기'),
        h('button', { class: 'btn btn-sm btn-ghost', onclick: () => store.updateSettings((st) => { st.nudgeSnoozedAt = Date.now(); }) }, '나중에')
      )
    )
  );
}

// ---------- 공통 조각 ----------

function card(key, { sub, value }, ...body) {
  return h(
    'section',
    { class: 'card', style: { '--cat': `var(--c-${key})` }, 'data-cat': key },
    h(
      'div',
      { class: 'card-head' },
      h('span', { class: 'cat-icon' }, icon(key)),
      h('div', { class: 'card-titles' }, h('h2', null, CAT[key].label), sub && h('small', null, sub)),
      value
    ),
    ...body
  );
}

function valueBox(main, sub, ok = false) {
  return h('div', { class: 'card-value' }, h('b', null, main || ''), sub && h('small', { class: ok ? 'ok' : '' }, sub));
}

function stepper({ display, onMinus, onPlus, minusDisabled, label = '', cls = '' }) {
  return h(
    'div',
    { class: `stepper ${cls}`.trim() },
    h('button', { class: 'st-btn', onclick: onMinus, disabled: !!minusDisabled, 'aria-label': `${label} 줄이기` }, '−'),
    h('span', { class: 'st-val' }, display),
    h('button', { class: 'st-btn', onclick: onPlus, 'aria-label': `${label} 늘리기` }, '+')
  );
}

function choiceBtn(label, on, color, onclick, aria) {
  return h('button', { class: 'choice-btn' + (on ? ' on' : ''), style: { '--k': color }, 'aria-pressed': on, 'aria-label': aria || label, onclick }, h('i'), label);
}

function faceBtn(kind, expr, label, on, onclick) {
  return h('button', { class: 'face-btn' + (on ? ' on' : ''), 'aria-pressed': on, 'aria-label': label, onclick }, character(kind, expr, { face: true }), h('small', null, label));
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
  const { day, date, settings, me } = ctx;
  const sl = day.sleep || {};
  const nap = day.nap || 0;
  const goal = settings.goals.sleepHours * 60;
  const valB = h('b');
  const valS = h('small');
  const inputs = {};

  // 위쪽 숫자는 밤잠 + 낮잠. 목표는 밤잠 + 낮잠(90분까지)으로 봅니다
  const refresh = () => {
    const m = sleepMinutes({ bed: inputs.bed.value, wake: inputs.wake.value });
    if (m == null) {
      valB.textContent = nap ? `낮잠 ${fmtDuration(nap)}` : '';
      valS.textContent = '';
      valS.className = '';
      return;
    }
    const enough = m + napCredit(day) >= goal;
    valB.textContent = fmtDuration(m + nap);
    valS.textContent = [nap ? `낮잠 ${fmtDuration(nap)} 포함` : null, enough ? '목표 달성' : `목표까지 ${fmtDuration(goal - m - napCredit(day))}`].filter(Boolean).join(' · ');
    valS.className = enough ? 'ok' : '';
  };
  const setNap = (v) => ctx.save((d) => { d.nap = v > 0 ? Math.min(v, 300) : null; });

  // 기기 언어에 따라 '오후 11:40'처럼 길게 나오는 걸 막으려고, 24시간 표기를 직접 보여주고
  // 투명한 기본 시간 입력창을 위에 덮어서 탭하면 휴대폰의 시간 선택기가 열리게 합니다.
  const timeField = (field, label, ico) => {
    const shown = h('span', { class: 'tf-value' });
    const wrap = h('label', { class: 'time-field' }, h('span', { class: 'tf-top' }, icon(ico), label), shown);
    const show = () => {
      shown.textContent = inp.value || '00:00';
      wrap.classList.toggle('is-empty', !inp.value);
    };
    const onTime = () => {
      show();
      ctx.saveQuiet((d) => { d.sleep = { ...(d.sleep || {}), [field]: inp.value || null }; });
      refresh();
    };
    const inp = h('input', {
      type: 'time', class: 'time-input', value: sl[field] || '', 'aria-label': label,
      oninput: onTime, onchange: onTime, onclick: (e) => { try { e.target.showPicker(); } catch {} },
    });
    inputs[field] = inp;
    wrap.append(inp);
    show();
    return wrap;
  };

  const prev = !sl.bed && !sl.wake ? findLast(date, (d) => d.sleep?.bed && d.sleep?.wake) : null;
  const el = card(
    'sleep',
    { sub: '어젯밤', value: h('div', { class: 'card-value' }, valB, valS) },
    h('div', { class: 'time-row' }, timeField('bed', '잠든 시간', 'sleep'), timeField('wake', '일어난 시간', 'sun')),
    prev && h('button', { class: 'quick', onclick: () => ctx.save((d) => { d.sleep = { ...(d.sleep || {}), bed: prev.day.sleep.bed, wake: prev.day.sleep.wake }; }) }, `↺ 지난번처럼 ${prev.day.sleep.bed} → ${prev.day.sleep.wake}`),
    h('div', { class: 'field-label' }, '잠은 어땠어요?'),
    h(
      'div',
      { class: 'faces three', style: { '--n': 3 } },
      [...SLEEP_Q].reverse().map((o) =>
        faceBtn(me, SLEEP_EXPR[o.key], o.label, sl.quality === o.key, () =>
          ctx.save((d) => {
            const s = { ...(d.sleep || {}) };
            s.quality = s.quality === o.key ? null : o.key;
            d.sleep = s;
          })
        )
      )
    ),
    h(
      'div',
      { class: 'nap-row' + (nap ? ' on' : '') },
      h('span', { class: 'nap-label' }, icon('sun'), '낮잠'),
      h('span', { class: 'nap-hint' }, nap ? '' : '10분 단위'),
      stepper({ label: '낮잠', display: nap ? fmtDuration(nap) : '없음', minusDisabled: !nap, onMinus: () => setNap(nap - 10), onPlus: () => setNap(nap + 10) })
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
  const healthy = Object.values(meals).filter((v) => v === 'good').length;
  const toggle = (mk, rk) =>
    ctx.save((d) => {
      const m = { ...(d.meals || {}) };
      m[mk] = m[mk] === rk ? null : rk;
      d.meals = m;
    });
  return card(
    'meal',
    { value: valueBox(anyMain ? `${eaten}/3끼` : '', healthy ? `건강하게 ${healthy}번` : '') },
    MEALS.map((m) =>
      h(
        'div',
        { class: 'meal-row' },
        h('span', { class: 'meal-label' }, m.label),
        h('div', { class: 'choice' }, MEAL_RATINGS.map((r) => choiceBtn(r.label, meals[m.key] === r.key, MEAL_COLOR[r.key], () => toggle(m.key, r.key), `${m.label} ${r.long}`)))
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
      h('span', { class: 'ex-main' }, h('b', null, t.label), h('small', null, [inten?.label, e.memo].filter(Boolean).join(' · '))),
      h('span', { class: 'ex-min' }, String(e.minutes), h('small', null, '분'))
    );
  });

  return card(
    'exercise',
    { value: valueBox(total ? fmtDuration(total) : day.exerciseRest ? '쉬는 날' : '', list.length > 1 ? `${list.length}번` : '') },
    items.length ? h('div', { class: 'ex-list' }, items) : null,
    h('button', { class: 'add-btn', onclick: () => exerciseSheet(ctx, -1) }, icon('plus'), '운동 추가'),
    !list.length &&
      h(
        'div',
        { class: 'ex-foot' },
        h('span', { class: 'card-note', style: { margin: '0' } }, day.exerciseRest ? '오늘은 쉬는 날로 기록했어요.' : '운동을 안 했다면'),
        h(
          'button',
          { class: 'text-btn' + (day.exerciseRest ? ' on' : ''), 'aria-pressed': !!day.exerciseRest, onclick: () => ctx.save((d) => { d.exerciseRest = !d.exerciseRest; }) },
          day.exerciseRest ? '취소' : '쉬는 날로 기록'
        )
      ),
    goal > 0 &&
      h(
        'div',
        { class: 'week-prog' },
        h('div', { class: 'wp-text' }, h('span', null, `${weekLabel(date)} 운동`), h('span', null, h('b', null, `${wkTotal}분`), ` / ${goal}분`)),
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
          h('div', { class: 'field-label' }, '무슨 운동을 했어요?'),
          h('div', { class: 'chips' }, EXERCISES.map((t) => h('button', { class: 'chip' + (st.type === t.key ? ' on' : ''), 'aria-pressed': st.type === t.key, onclick: () => { st.type = t.key; draw(); } }, t.label))),
          h('div', { class: 'field-label' }, '얼마나?'),
          h(
            'div',
            { class: 'min-row' },
            stepper({
              cls: 'lg',
              label: '운동 시간',
              display: [String(st.minutes), h('small', null, '분')],
              minusDisabled: st.minutes <= 5,
              onMinus: () => { st.minutes = Math.max(5, st.minutes - 5); draw(); },
              onPlus: () => { st.minutes = Math.min(600, st.minutes + 5); draw(); },
            })
          ),
          h('div', { class: 'chips', style: { 'justify-content': 'center' } }, [10, 20, 30, 45, 60, 90].map((m) => h('button', { class: 'chip chip-sm' + (st.minutes === m ? ' on' : ''), onclick: () => { st.minutes = m; draw(); } }, `${m}분`))),
          h('div', { class: 'field-label' }, '강도'),
          h('div', { class: 'choice', style: { '--n': 3 } }, INTENSITY.map((o) => choiceBtn(o.label, st.intensity === o.key, 'var(--c-exercise)', () => { st.intensity = o.key; draw(); }))),
          h('input', { class: 'text-input', placeholder: '메모 (선택) 예: 한강 5km', value: st.memo, oninput: (e) => { st.memo = e.target.value; } }),
          h(
            'div',
            { class: 'btn-row sheet-actions' },
            existing && h('button', { class: 'btn btn-danger', style: { flex: '0 0 auto' }, onclick: remove }, '삭제'),
            h('button', { class: 'btn btn-primary grow', onclick: submit }, existing ? '저장' : '추가하기')
          )
        );
      draw();
    },
  });
}

// ---------- 음주 ----------

function alcoholCard(ctx) {
  const { app, day, date, settings, me } = ctx;
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
      { value: valueBox('안 마심') },
      h(
        'div',
        { class: 'react' },
        character(me, 'proud', { face: true }),
        h('div', { class: 'react-text' }, h('b', null, '오늘은 안 마셨어요!'), h('br'), soberText(date) || '멋져요. 내일도 화이팅.'),
        h('button', { class: 'text-btn', onclick: () => ctx.save((d) => { d.alcoholNone = null; }) }, '취소')
      ),
      weekNote
    );
  }

  if (!open) {
    const sober = soberText(date);
    return card(
      'alcohol',
      { value: valueBox() },
      h(
        'div',
        { class: 'big-choices' },
        h('button', { class: 'big-choice', onclick: () => { app.state.alcoholOpen = date; app.render({ keepScroll: true }); } }, icon('alcohol'), '마셨어요'),
        h('button', { class: 'big-choice', onclick: () => ctx.save((d) => { d.alcoholNone = true; d.alcohol = null; }) }, character(me, 'proud', { face: true }), '안 마셨어요')
      ),
      sober && h('div', { class: 'card-note' }, sober),
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
      h('div', { class: 'drink-main' }, h('b', null, dk.label), note && h('small', null, note)),
      dk.key === 'soju' && h('button', { class: 'chip chip-sm', onclick: () => add('soju', 7) }, '+1병'),
      stepper({ label: dk.label, display: n ? `${n}${dk.unit}` : '0', minusDisabled: !n, onMinus: () => add(dk.key, -1), onPlus: () => add(dk.key, 1) })
    );
  });

  let react = null;
  if (g > 0) {
    const [expr, line] = glasses >= 7 ? ['dizzy', '많이 마셨어요. 물 많이 마시고 푹 자요.'] : glasses > 3 ? ['ok', '오늘은 여기까지 할까요?'] : ['good', '가볍게 한잔 했네요.'];
    react = h(
      'div',
      { class: 'react' },
      character(me, expr, { face: true }),
      h('div', { class: 'react-text' }, h('b', null, `소주 ${fmtNum(glasses)}잔 분량`), ` · 알코올 약 ${Math.round(g)}g`, h('br'), line)
    );
  }

  return card('alcohol', { value: valueBox(g > 0 ? `${fmtNum(glasses)}잔` : '', g > 0 ? '소주 환산' : '') }, h('div', { class: 'drink-list' }, rows), react, weekNote);
}

function soberText(date) {
  const last = findLast(date, (d) => alcoholGrams(d.alcohol) > 0);
  if (!last) return null;
  return `마지막으로 마신 날: ${fmtMD(last.key)} (${diffDays(last.key, date)}일 전)`;
}

// ---------- 카페인 ----------

function caffeineCard(ctx) {
  const { app, day, date, settings, me } = ctx;
  const c = day.caffeine || {};
  const mg = caffeineMg(c);
  const limit = settings.goals.caffeineMg;
  const open = mg > 0 || app.state.caffeineOpen === date;

  const add = (key, n) =>
    ctx.save((d) => {
      const cf = { ...(d.caffeine || {}) };
      cf[key] = Math.max(0, (cf[key] || 0) + n);
      d.caffeine = cf;
      d.caffeineNone = null;
      // 오늘 기록할 때는 마신 시각을 자동으로 남겨서, 늦은 카페인이 잠에 주는 영향을 볼 수 있게 함
      if (n > 0 && date === todayKey()) {
        const now = new Date();
        d.caffeineLast = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
      }
      if (!Object.values(cf).some((v) => v > 0)) d.caffeineLast = null;
    });

  if (day.caffeineNone) {
    return card(
      'caffeine',
      { value: valueBox('안 마심') },
      h(
        'div',
        { class: 'react' },
        character(me, 'proud', { face: true }),
        h('div', { class: 'react-text' }, h('b', null, '오늘은 카페인 없이!'), h('br'), '잠도 더 푹 잘 수 있을 거예요.'),
        h('button', { class: 'text-btn', onclick: () => ctx.save((d) => { d.caffeineNone = null; }) }, '취소')
      )
    );
  }

  if (!open) {
    return card(
      'caffeine',
      { value: valueBox() },
      h(
        'div',
        { class: 'big-choices' },
        h('button', { class: 'big-choice', onclick: () => { app.state.caffeineOpen = date; app.render({ keepScroll: true }); } }, icon('caffeine'), '마셨어요'),
        h('button', { class: 'big-choice', onclick: () => ctx.save((d) => { d.caffeineNone = true; d.caffeine = null; d.caffeineLast = null; }) }, character(me, 'proud', { face: true }), '안 마셨어요')
      )
    );
  }

  const rows = CAFFEINE.map((cd) => {
    const n = c[cd.key] || 0;
    return h(
      'div',
      { class: 'drink-row' + (n ? ' has' : '') },
      h('div', { class: 'drink-main' }, h('b', null, cd.label), h('small', null, cd.note)),
      stepper({ label: cd.label, display: n ? `${n}${cd.unit}` : '0', minusDisabled: !n, onMinus: () => add(cd.key, -1), onPlus: () => add(cd.key, 1) })
    );
  });

  let react = null;
  if (mg > 0) {
    const [expr, line] = mg > limit ? ['dizzy', '하루 권장량을 넘었어요. 오늘은 그만!'] : mg > limit * 0.6 ? ['ok', '오늘은 이 정도만 마셔요.'] : ['good', '적당해요.'];
    react = h(
      'div',
      { class: 'react' },
      character(me, expr, { face: true }),
      h(
        'div',
        { class: 'react-text' },
        h('b', null, `카페인 약 ${mg}mg`), ` / 하루 ${limit}mg`,
        h('div', { class: 'meter', style: { margin: '7px 0 6px' } }, h('i', { style: { width: `${Math.min(100, (mg / limit) * 100)}%` } })),
        line
      )
    );
  }
  const last = day.caffeineLast;
  const lastNote = mg > 0 && last ? h('div', { class: 'card-note' }, `마지막 카페인 ${last}${isLateTime(last) ? ' · 오후 3시 넘어 마시면 잠들기 어려울 수 있어요' : ''}`) : null;

  return card('caffeine', { value: valueBox(mg > 0 ? `${mg}mg` : '', mg > 0 ? `권장량의 ${Math.round((mg / limit) * 100)}%` : '') }, h('div', { class: 'drink-list' }, rows), react, lastNote);
}

// ---------- 물 ----------

function waterCard(ctx) {
  const w = ctx.day.water || 0;
  const goal = ctx.settings.goals.waterCups;
  const set = (n) => ctx.save((d) => { d.water = n > 0 ? n : null; });
  return card(
    'water',
    { value: valueBox(`${w} / ${goal}잔`, w >= goal ? '목표 달성' : '', w >= goal) },
    h(
      'div',
      { class: 'cups', style: { '--n': Math.min(Math.max(goal, w), 10) } },
      Array.from({ length: Math.max(goal, w) }, (_, i) =>
        h('button', { class: 'cup' + (i < w ? ' on' : ''), 'aria-label': `${i + 1}잔`, onclick: () => set(i + 1 === w ? i : i + 1) }, icon('cup'))
      )
    ),
    h(
      'div',
      { class: 'water-foot' },
      h('div', { class: 'card-note' }, `1잔 ${CUP_ML}ml · 지금 ${fmtNum((w * CUP_ML) / 1000, 2)}L`),
      stepper({ label: '물', display: `${w}잔`, minusDisabled: !w, onMinus: () => set(w - 1), onPlus: () => set(w + 1) })
    )
  );
}

// ---------- 영양제 ----------

function supplementCard(ctx) {
  const list = activeSupps();
  if (!list.length) {
    return card(
      'supplement',
      { value: valueBox() },
      h('p', { class: 'card-note', style: { margin: '0 0 12px' } }, '먹고 있는 영양제를 한 번 등록해 두면, 매일 체크만 하면 돼요.'),
      h('button', { class: 'add-btn', onclick: () => supplementSheet() }, icon('plus'), '영양제 등록하기')
    );
  }
  const taken = new Set(ctx.day.supps || []);
  const n = list.filter((s) => taken.has(s.id)).length;
  const all = n === list.length;
  const toggle = (id) =>
    ctx.save((d) => {
      const set = new Set(d.supps || []);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      d.supps = [...set];
    });
  return card(
    'supplement',
    { value: valueBox(`${n} / ${list.length}`, all ? '다 챙겼어요' : '', all) },
    h(
      'div',
      { class: 'supp-grid' },
      list.map((s) =>
        h(
          'button',
          { class: 'supp' + (taken.has(s.id) ? ' on' : ''), 'aria-pressed': taken.has(s.id), onclick: () => toggle(s.id) },
          h('span', { class: 'supp-check' }, icon('check')),
          h('span', { class: 'supp-name' }, s.name)
        )
      )
    ),
    h(
      'div',
      { class: 'ex-foot' },
      all
        ? h('span')
        : h('button', { class: 'text-btn', onclick: () => ctx.save((d) => { d.supps = [...new Set([...(d.supps || []), ...list.map((s) => s.id)])]; }) }, '모두 먹었어요'),
      h('button', { class: 'text-btn', onclick: () => supplementSheet() }, '목록 관리')
    )
  );
}

const newId = () => Math.random().toString(36).slice(2, 7) + Date.now().toString(36).slice(-3);

function supplementSheet() {
  openSheet({
    title: '내 영양제',
    cat: 'supplement',
    build(body, close) {
      const add = (raw) => {
        const name = raw.trim();
        if (!name) return;
        if (activeSupps().some((s) => s.name === name)) return toast('이미 목록에 있어요.');
        store.updateSettings((st) => {
          const old = st.supplements.find((s) => s.name === name);
          if (old) old.archived = false;
          else st.supplements.push({ id: newId(), name });
        });
        draw();
      };
      const remove = (id) => {
        // 지난 기록에 이름이 남도록 지우지 않고 숨김
        store.updateSettings((st) => {
          const s = st.supplements.find((x) => x.id === id);
          if (s) s.archived = true;
        });
        draw();
      };
      const draw = () => {
        const list = activeSupps();
        const names = new Set(list.map((s) => s.name));
        const input = h('input', {
          class: 'text-input', placeholder: '이름 (예: 비타민D)', maxlength: '20', enterkeyhint: 'done', 'aria-label': '영양제 이름',
          onkeydown: (e) => { if (e.key === 'Enter') add(input.value); },
        });
        body.replaceChildren(
          list.length
            ? h('div', { class: 'supp-manage' }, list.map((s) => h('div', { class: 'sm-row' }, h('span', null, s.name), h('button', { class: 'icon-btn flat', 'aria-label': `${s.name} 빼기`, onclick: () => remove(s.id) }, icon('close')))))
            : h('p', { class: 'card-note', style: { margin: '0' } }, '아직 등록한 영양제가 없어요. 아래에서 골라 보세요.'),
          h('div', { class: 'field-label' }, '추가하기'),
          h('div', { class: 'add-row' }, input, h('button', { class: 'btn btn-primary', onclick: () => add(input.value) }, '추가')),
          h('div', { class: 'chips', style: { 'margin-top': '10px' } }, SUPP_SUGGESTIONS.filter((n) => !names.has(n)).map((n) => h('button', { class: 'chip chip-sm', onclick: () => add(n) }, `+ ${n}`))),
          h('div', { class: 'btn-row sheet-actions' }, h('button', { class: 'btn btn-primary grow', onclick: close }, '완료'))
        );
      };
      draw();
    },
  });
}

// ---------- 체중 ----------

function weightCard(ctx) {
  const { day, date } = ctx;
  const wt = day.weight;
  const prev = findLast(date, (d) => d.weight != null);
  const base = wt ?? prev?.day.weight ?? null;
  const valB = h('b', null, wt != null ? `${wt.toFixed(1)}kg` : '');
  const set = (v) => ctx.save((d) => { d.weight = Math.round(v * 10) / 10; });
  const valid = (v) => v >= 20 && v <= 300;

  const input = h('input', {
    type: 'number', inputmode: 'decimal', step: '0.1', min: '20', max: '300', class: 'num-input', 'aria-label': '체중 (kg)',
    placeholder: base != null ? base.toFixed(1) : '00.0',
    value: wt != null ? wt.toFixed(1) : '',
    oninput: (e) => {
      const v = parseFloat(e.target.value);
      ctx.saveQuiet((d) => { d.weight = valid(v) ? Math.round(v * 10) / 10 : null; });
      valB.textContent = valid(v) ? `${v.toFixed(1)}kg` : '';
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
    { value: h('div', { class: 'card-value' }, valB) },
    h(
      'div',
      { class: 'weight-row' },
      h('button', { class: 'st-btn', 'aria-label': '0.1kg 줄이기', disabled: base == null, onclick: () => set(base - 0.1) }, '−'),
      h('div', { class: 'weight-input' }, input, h('span', { class: 'weight-unit' }, 'kg')),
      h('button', { class: 'st-btn', 'aria-label': '0.1kg 늘리기', onclick: () => (base != null ? set(base + 0.1) : input.focus()) }, '+')
    ),
    wt == null && prev && h('div', { class: 'center' }, h('button', { class: 'quick', onclick: () => set(prev.day.weight) }, `↺ 지난번과 같아요 (${prev.day.weight.toFixed(1)}kg)`)),
    h('div', { class: 'card-note center' }, note)
  );
}

// ---------- 컨디션 ----------

function moodCard(ctx) {
  const m = ctx.day.mood;
  return card(
    'mood',
    { value: valueBox(m ? MOODS[m - 1].label : '') },
    h(
      'div',
      { class: 'faces', style: { '--n': 5 } },
      MOODS.map((o) => faceBtn(ctx.me, MOOD_EXPR[o.key], o.label, m === o.key, () => ctx.save((d) => { d.mood = d.mood === o.key ? null : o.key; })))
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
