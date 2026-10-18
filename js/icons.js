// 24px 라인 아이콘. currentColor로 칠해지므로 글자색을 따라갑니다.
const S = 'fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"';

const PATHS = {
  // 탭
  edit: `<g ${S}><path d="M4.5 19.5h4L19 9a2.8 2.8 0 0 0-4-4L4.5 15.5v4z"/><path d="M13.5 6.5l4 4"/></g>`,
  calendar: `<g ${S}><rect x="3.5" y="5" width="17" height="15.5" rx="4"/><path d="M3.5 10h17M8 3v4M16 3v4"/></g>`,
  chart: `<g ${S}><path d="M5 20V11M12 20V4M19 20v-6"/></g>`,
  settings: `<g ${S}><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/></g>`,

  // 기록 항목
  sleep: `<path ${S} d="M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1z"/>`,
  meal: `<g ${S}><path d="M3.8 12h16.4a8.2 8.2 0 0 1-16.4 0z"/><path d="M9 20.5h6"/><path d="M14.5 3.5l-2.5 6M19 4.5l-5 5.5"/></g>`,
  exercise: `<g ${S}><path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/></g>`,
  alcohol: `<g ${S}><path d="M7.5 3.5h9l-.6 5.2a3.9 3.9 0 0 1-7.8 0z"/><path d="M12 12.6v7.4M8.5 20.5h7"/></g>`,
  water: `<path ${S} d="M12 3.5s6.2 6.6 6.2 11.1a6.2 6.2 0 0 1-12.4 0C5.8 10.1 12 3.5 12 3.5z"/>`,
  weight: `<g ${S}><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M8.2 10a5 5 0 0 1 7.6 0"/><path d="M12 10.5l1.4-2"/></g>`,
  mood: `<g ${S}><circle cx="12" cy="12" r="8.5"/><path d="M8.6 14.2a4.4 4.4 0 0 0 6.8 0"/></g><g fill="currentColor"><circle cx="9.2" cy="10" r="1.15"/><circle cx="14.8" cy="10" r="1.15"/></g>`,
  supplement: `<g ${S} transform="rotate(-40 12 12)"><rect x="3" y="8.4" width="18" height="7.2" rx="3.6"/><path d="M12 8.4v7.2"/></g>`,
  sun: `<g ${S}><circle cx="12" cy="12" r="4"/><path d="M12 2.8v1.9M12 19.3v1.9M2.8 12h1.9M19.3 12h1.9M5.5 5.5l1.3 1.3M17.2 17.2l1.3 1.3M5.5 18.5l1.3-1.3M17.2 6.8l1.3-1.3"/></g>`,

  // 기타
  chevL: `<path ${S} d="M14.5 5.5L8 12l6.5 6.5"/>`,
  chevR: `<path ${S} d="M9.5 5.5L16 12l-6.5 6.5"/>`,
  chevD: `<path ${S} d="M6 9.5l6 6 6-6"/>`,
  close: `<path ${S} d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>`,
  plus: `<path ${S} d="M12 5v14M5 12h14"/>`,
  check: `<path ${S} d="M5 12.5l4.5 4.5L19 7.5"/>`,
  download: `<g ${S}><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M5 19.5h14"/></g>`,
  upload: `<g ${S}><path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/><path d="M5 19.5h14"/></g>`,
  trash: `<g ${S}><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.9 12a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l.9-12"/></g>`,
  palette: `<g ${S}><path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.3 0 1.8-.9 1.4-1.9-.5-1.2.3-2.4 1.6-2.4h1.7a3.8 3.8 0 0 0 3.8-3.8c0-4.9-3.8-8.9-8.5-8.9z"/></g><g fill="currentColor"><circle cx="8" cy="11" r="1.2"/><circle cx="11" cy="7.5" r="1.2"/><circle cx="15.5" cy="8.5" r="1.2"/></g>`,
  user: `<g ${S}><circle cx="12" cy="8.5" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></g>`,
  target: `<g ${S}><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.8"/></g>`,
  list: `<g ${S}><path d="M9 6.5h11M9 12h11M9 17.5h11"/></g><g fill="currentColor"><circle cx="4.8" cy="6.5" r="1.2"/><circle cx="4.8" cy="12" r="1.2"/><circle cx="4.8" cy="17.5" r="1.2"/></g>`,
  spark: `<path fill="currentColor" d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5z"/>`,
  cup: `<path class="cup-fill" d="M6.9 9.6h10.2l-1.06 10.3c-.07.62-.6 1.1-1.22 1.1H9.2c-.62 0-1.15-.48-1.22-1.1z"/><path class="cup-line" d="M5.2 3.4h13.6l-1.86 17a2.2 2.2 0 0 1-2.19 1.96H9.25a2.2 2.2 0 0 1-2.19-1.96z" fill="none" stroke-width="1.6" stroke-linejoin="round"/>`,
};

export function icon(name, cls = '') {
  const span = document.createElement('span');
  span.className = `icon ${cls}`.trim();
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 24 24">${PATHS[name] || ''}</svg>`;
  return span;
}
