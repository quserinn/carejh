import * as store from './store.js';
import { h, todayKey, debounce } from './util.js';
import { icon } from './icons.js';
import { renderToday } from './views/today.js';
import { renderCalendar } from './views/calendar.js';
import { renderStats } from './views/stats.js';
import { renderSettings } from './views/settings.js';
import { renderOnboarding } from './views/onboarding.js';

const TABS = [
  { key: 'today', label: '기록', icon: 'edit', render: renderToday },
  { key: 'calendar', label: '캘린더', icon: 'calendar', render: renderCalendar },
  { key: 'stats', label: '통계', icon: 'chart', render: renderStats },
  { key: 'settings', label: '설정', icon: 'settings', render: renderSettings },
];

const tabFromHash = () => {
  const k = location.hash.slice(1);
  return TABS.some((t) => t.key === k) ? k : 'today';
};

let lastToday = todayKey();

const app = {
  state: {
    tab: tabFromHash(),
    date: lastToday,
    statsPeriod: 'week',
    statsAnchor: lastToday,
    calMonth: null,
    calSelected: null,
    alcoholOpen: null,
  },

  render({ keepScroll = false, animate = false } = {}) {
    const y = window.scrollY;
    const onboarding = !store.getSettings().character;
    const tab = TABS.find((t) => t.key === this.state.tab);
    const view = onboarding ? renderOnboarding(this) : tab.render(this);
    if (animate) view.classList.add('enter');
    document.getElementById('app').replaceChildren(view);
    renderTabbar(onboarding);
    window.scrollTo(0, keepScroll ? y : 0);
  },

  go(tab) {
    if (tab === this.state.tab) {
      this.render({ keepScroll: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    location.hash = tab === 'today' ? '' : tab;
  },

  setDate(key) {
    this.state.date = key;
    this.state.alcoholOpen = null;
    this.render({ keepScroll: true });
  },
};

function renderTabbar(hidden) {
  const nav = document.getElementById('tabbar');
  if (hidden) return nav.replaceChildren();
  nav.replaceChildren(
    h(
      'div',
      { class: 'tabs' },
      TABS.map((t) =>
        h(
          'button',
          { 'aria-current': t.key === app.state.tab ? 'page' : 'false', onclick: () => app.go(t.key) },
          icon(t.icon),
          t.label
        )
      )
    )
  );
}

function applyTheme() {
  const { theme, character } = store.getSettings();
  document.documentElement.dataset.char = character || app.state.obPick || 'lion';
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(document.body).backgroundColor;
}

window.addEventListener('hashchange', () => {
  app.state.tab = tabFromHash();
  app.render({ animate: true });
});

store.subscribe(() => {
  applyTheme();
  app.render({ keepScroll: true });
});

matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

// 차트 폭은 화면 폭에 맞춰 그리므로, 폭이 바뀌면 다시 그립니다.
let lastWidth = window.innerWidth;
window.addEventListener('resize', debounce(() => {
  if (window.innerWidth === lastWidth) return;
  lastWidth = window.innerWidth;
  if (app.state.tab === 'stats') app.render({ keepScroll: true });
}, 200));

// 앱을 켜 둔 채 날짜가 바뀌면 '오늘'을 따라갑니다.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const now = todayKey();
  if (now === lastToday) return;
  if (app.state.date === lastToday) app.state.date = now;
  if (app.state.statsAnchor === lastToday) app.state.statsAnchor = now;
  lastToday = now;
  app.render({ keepScroll: true });
});

applyTheme();
app.render();

if ('serviceWorker' in navigator && !['localhost', '127.0.0.1'].includes(location.hostname)) {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('서비스 워커 등록 실패', e));
}
// 브라우저가 저장 공간이 부족할 때 기록을 지우지 않도록 요청
navigator.storage?.persist?.().catch(() => {});

// 개발할 때 콘솔에서 확인용
window.CareJH = { app, store };
