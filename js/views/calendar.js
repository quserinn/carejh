import { h, todayKey, pad2, WD, fmtDayTitle, keyOf, fmtNum, mean } from '../util.js';
import * as store from '../store.js';
import { CATS, CAT } from '../constants.js';
import { anyLogged, streak, summarize } from '../metrics.js';
import { dayScore, scoreTier, scoreRingSVG, SCORE_PARTS } from '../score.js';
import { character } from '../characters.js';
import { anniversaryOn, annivMessage } from '../anniv.js';
import { icon } from '../icons.js';

function scoreRing(score) {
  const span = h('span', { class: 'score-ring' });
  span.innerHTML = scoreRingSVG(score);
  return span;
}

export function renderCalendar(app) {
  const st = app.state;
  const today = todayKey();
  const thisMonth = today.slice(0, 7);
  const month = st.calMonth || thisMonth;
  const [y, m] = month.split('-').map(Number);
  const daysIn = new Date(y, m, 0).getDate();
  const startWd = new Date(y, m - 1, 1).getDay();
  const settings = store.getSettings();
  const me = settings.character || 'lion';
  const sel = st.calSelected?.startsWith(month) ? st.calSelected : today.startsWith(month) ? today : null;

  const shiftMonth = (n) => {
    st.calMonth = keyOf(new Date(y, m - 1 + n, 1)).slice(0, 7);
    st.calSelected = null;
    app.render({ keepScroll: true });
  };

  const scores = [];
  const cells = [];
  for (let i = 0; i < startWd; i++) cells.push(h('div', { class: 'cal-cell', 'aria-hidden': 'true' }));
  for (let d = 1; d <= daysIn; d++) {
    const k = `${month}-${pad2(d)}`;
    const day = store.getDay(k);
    const future = k > today;
    const { score } = dayScore(day, settings);
    if (score != null) scores.push(score);
    // 기념일은 그날이 되어야 표시돼요 (미리 알려주지 않음)
    const anniv = settings.showAnniv && !future ? anniversaryOn(settings.anniversary, k) : null;
    const mark = score != null ? scoreRing(score) : anyLogged(day) ? h('span', { class: 'cal-dot' }) : null;
    cells.push(
      h(
        'button',
        {
          class: 'cal-cell' + (k === today ? ' today' : '') + (k === sel ? ' sel' : '') + (future ? ' future' : '') + (anniv ? ' anniv' : ''),
          disabled: future,
          'aria-label': `${m}월 ${d}일${anniv ? `, ${anniv.title}` : ''}${score != null ? `, ${score}점` : ''}`,
          'aria-pressed': k === sel,
          onclick: () => { st.calSelected = k; app.render({ keepScroll: true }); },
        },
        anniv && h('span', { class: 'cal-heart' }, icon('heart')),
        h('span', { class: 'cal-num' }, d),
        h('span', { class: 'cal-mark' }, mark)
      )
    );
  }
  const avg = scores.length ? Math.round(mean(scores)) : null;

  return h(
    'div',
    { class: 'view' },
    h('div', { class: 'page-head' }, h('h1', { class: 'page-title' }, '캘린더'), h('p', { class: 'page-sub' }, '날짜마다 하루 건강 점수를 매겨요 (100점 만점)')),
    h(
      'div',
      { class: 'summary-row' },
      h('div', { class: 'summary' }, h('small', null, `${m}월 평균 점수`), h('b', null, avg ?? '–', avg != null && h('span', null, '점'))),
      h('div', { class: 'summary' }, h('small', null, '연속 기록'), h('b', null, streak(today, anyLogged), h('span', null, '일')))
    ),
    h(
      'section',
      { class: 'card cal-card' },
      h(
        'div',
        { class: 'cal-nav' },
        h('button', { class: 'icon-btn flat', 'aria-label': '이전 달', onclick: () => shiftMonth(-1) }, icon('chevL')),
        h('h3', null, `${y}년 ${m}월`),
        h('button', { class: 'icon-btn flat', 'aria-label': '다음 달', disabled: month >= thisMonth, onclick: () => shiftMonth(1) }, icon('chevR'))
      ),
      h('div', { class: 'cal-week' }, WD.map((w) => h('span', null, w))),
      h('div', { class: 'cal-grid' }, cells)
    ),
    sel && dayDetail(app, sel, settings, me),
    scoreHelp(settings)
  );
}

function dayDetail(app, key, settings, me) {
  const day = store.getDay(key);
  const rows = CATS.filter((c) => settings.enabled[c.key])
    .map((c) => ({ c, text: summarize(c.key, day) }))
    .filter((r) => r.text);
  const { score, parts } = dayScore(day, settings);

  let scoreBlock = null;
  if (score != null) {
    const tier = scoreTier(score);
    scoreBlock = h(
      'div',
      { class: 'score-box' },
      h(
        'div',
        { class: 'score-top' },
        character(me, tier.expr, { size: 64 }),
        h('div', null, h('div', { class: 'score-num' }, String(score), h('span', null, '점')), h('div', { class: 'score-label' }, tier.label))
      ),
      h(
        'div',
        { class: 'score-parts' },
        parts.map((p) =>
          h(
            'div',
            { class: 'sp-row', style: { '--cat': `var(--c-${p.key})` } },
            h('span', { class: 'sp-name' }, CAT[p.key].label),
            h('div', { class: 'sp-track' }, h('i', { style: { width: `${(Math.max(0, p.value) / p.max) * 100}%` } })),
            h('span', { class: 'sp-val' + (p.value < 0 ? ' neg' : '') }, `${fmtNum(p.value, 0)}/${p.max}`)
          )
        )
      )
    );
  } else if (rows.length) {
    scoreBlock = h('p', { class: 'card-note', style: { margin: '0 0 6px' } }, '기록이 조금 더 있으면 점수를 매겨 드려요. 점수 항목의 절반 넘게 기록하면 돼요.');
  }

  return h(
    'section',
    { class: 'card day-detail' },
    h('h3', null, fmtDayTitle(key)),
    (() => {
      const a = settings.showAnniv ? anniversaryOn(settings.anniversary, key) : null;
      return a && h('div', { class: 'dd-anniv' }, icon('heart'), h('div', null, h('b', null, a.title), h('br'), annivMessage(a, key)));
    })(),
    scoreBlock,
    scoreBlock && rows.length ? h('div', { class: 'dd-divider' }) : null,
    rows.length
      ? rows.map(({ c, text }) =>
          h('div', { class: 'dd-row', style: { '--cat': `var(--c-${c.key})` } }, h('span', { class: 'cat-icon sm' }, icon(c.key)), h('span', { class: 'dd-cat' }, c.label), h('span', { class: 'dd-text' }, text))
        )
      : h('div', { class: 'dd-empty' }, character(me, 'sleepy'), '이날은 기록이 없어요.'),
    h(
      'div',
      { class: 'btn-row' },
      h('button', { class: 'btn btn-primary', onclick: () => { app.state.date = key; app.go('today'); } }, rows.length ? '이날 기록 고치기' : '이날 기록하기')
    )
  );
}

function scoreHelp(settings) {
  return h(
    'details',
    { class: 'card score-help' },
    h('summary', null, '점수는 이렇게 매겨요', icon('chevD')),
    h(
      'ul',
      null,
      SCORE_PARTS.filter((p) => settings.enabled[p.key]).map((p) =>
        h('li', { style: { '--cat': `var(--c-${p.key})` } }, h('span', { class: 'cat-icon sm' }, icon(p.key)), h('div', null, h('b', null, `${CAT[p.key].label} ${p.max}점`), h('br'), p.rule))
      )
    ),
    h('p', { class: 'card-note' }, '그날 기록한 항목만으로 계산해서 100점으로 바꿔요. 점수 항목의 절반 넘게 기록한 날만 점수가 나와요. 체중과 컨디션은 점수에 넣지 않아요.')
  );
}
