import { h, todayKey, pad2, WD, fmtDayTitle, keyOf } from '../util.js';
import * as store from '../store.js';
import { CATS, CAT, DOT_ORDER } from '../constants.js';
import { isLogged, anyLogged, streak, summarize } from '../metrics.js';
import { icon } from '../icons.js';

export function renderCalendar(app) {
  const st = app.state;
  const today = todayKey();
  const thisMonth = today.slice(0, 7);
  const month = st.calMonth || thisMonth;
  const [y, m] = month.split('-').map(Number);
  const daysIn = new Date(y, m, 0).getDate();
  const startWd = new Date(y, m - 1, 1).getDay();
  const settings = store.getSettings();
  const dotCats = DOT_ORDER.filter((k) => settings.enabled[k]);
  const sel = st.calSelected?.startsWith(month) ? st.calSelected : today.startsWith(month) ? today : null;

  const shiftMonth = (n) => {
    st.calMonth = keyOf(new Date(y, m - 1 + n, 1)).slice(0, 7);
    st.calSelected = null;
    app.render({ keepScroll: true });
  };

  let loggedDays = 0;
  const cells = [];
  for (let i = 0; i < startWd; i++) cells.push(h('div', { class: 'cal-cell blank', 'aria-hidden': 'true' }));
  for (let d = 1; d <= daysIn; d++) {
    const k = `${month}-${pad2(d)}`;
    const day = store.getDay(k);
    const future = k > today;
    const has = anyLogged(day);
    if (has) loggedDays++;
    const n = dotCats.filter((c) => isLogged(c, day)).length;
    cells.push(
      h(
        'button',
        {
          class: 'cal-cell' + (k === today ? ' today' : '') + (k === sel ? ' sel' : '') + (future ? ' future' : ''),
          disabled: future,
          'aria-label': `${m}월 ${d}일, ${n}개 기록`,
          'aria-pressed': k === sel,
          onclick: () => { st.calSelected = k; app.render({ keepScroll: true }); },
        },
        h('span', { class: 'cal-num' }, d),
        h('span', { class: 'cal-dots' }, dotCats.map((c) => h('i', { class: isLogged(c, day) ? 'on' : '', style: { '--cat': `var(--c-${c})` } })))
      )
    );
  }

  return h(
    'div',
    { class: 'view' },
    h('h1', { class: 'page-title' }, '캘린더'),
    h(
      'div',
      { class: 'cal-summary' },
      h('div', null, h('small', null, `${m}월 기록한 날`), h('b', null, `${loggedDays}일`)),
      h('div', null, h('small', null, '연속 기록'), h('b', null, `${streak(today, anyLogged)}일`))
    ),
    h(
      'section',
      { class: 'card cal-card' },
      h(
        'div',
        { class: 'date-nav', style: { border: '0', padding: '0 0 8px' } },
        h('button', { class: 'icon-btn', 'aria-label': '이전 달', onclick: () => shiftMonth(-1) }, icon('chevL')),
        h('div', { class: 'date-label static' }, `${y}년 ${m}월`),
        h('button', { class: 'icon-btn', 'aria-label': '다음 달', disabled: month >= thisMonth, onclick: () => shiftMonth(1) }, icon('chevR'))
      ),
      h('div', { class: 'cal-week' }, WD.map((w) => h('span', null, w))),
      h('div', { class: 'cal-grid' }, cells),
      h('div', { class: 'cal-legend' }, dotCats.map((c) => h('span', { style: { '--cat': `var(--c-${c})` } }, h('i'), CAT[c].label)))
    ),
    sel && dayDetail(app, sel, settings)
  );
}

function dayDetail(app, key, settings) {
  const day = store.getDay(key);
  const rows = CATS.filter((c) => settings.enabled[c.key])
    .map((c) => ({ c, text: summarize(c.key, day) }))
    .filter((r) => r.text);
  return h(
    'section',
    { class: 'card day-detail' },
    h('h3', null, fmtDayTitle(key)),
    rows.length
      ? rows.map(({ c, text }) => h('div', { class: 'dd-row' }, h('span', { class: 'dd-ico' }, c.emoji), h('span', { class: 'dd-cat' }, c.label), h('span', { class: 'dd-text' }, text)))
      : h('p', { class: 'dd-empty' }, '이날은 기록이 없어요.'),
    h(
      'div',
      { class: 'btn-row' },
      h('button', { class: 'btn btn-primary', onclick: () => { app.state.date = key; app.go('today'); } }, rows.length ? '이날 기록 고치기' : '이날 기록하기')
    )
  );
}
