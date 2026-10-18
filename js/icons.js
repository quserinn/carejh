const STROKE = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

const PATHS = {
  edit: `<g ${STROKE}><path d="M4 20h4L19 9a2.83 2.83 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></g>`,
  calendar: `<g ${STROKE}><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></g>`,
  chart: `<g ${STROKE}><path d="M4 20h16"/><path d="M7 16v-4M12 16V7M17 16v-6"/></g>`,
  settings: `<g ${STROKE}><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/></g>`,
  chevL: `<path ${STROKE} d="M15 5l-7 7 7 7"/>`,
  chevR: `<path ${STROKE} d="M9 5l7 7-7 7"/>`,
  close: `<path ${STROKE} d="M6 6l12 12M18 6L6 18"/>`,
  cup: `<path class="cup-fill" d="M6.8 9.5h10.4l-1.1 10.7c-.06.5-.48.8-.98.8H8.88c-.5 0-.92-.3-.98-.8z"/><path class="cup-line" d="M5 3h14l-1.9 17.3A2 2 0 0 1 15.1 22H8.9a2 2 0 0 1-2-1.7z" fill="none" stroke-width="1.6" stroke-linejoin="round"/>`,
};

export function icon(name) {
  const span = document.createElement('span');
  span.className = 'icon';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 24 24">${PATHS[name]}</svg>`;
  return span;
}
