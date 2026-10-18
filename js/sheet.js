import { h } from './util.js';
import { icon } from './icons.js';

// 아래에서 올라오는 시트. build(body, close)로 내용을 채웁니다.
export function openSheet({ title, cat, build }) {
  const backdrop = h('div', { class: 'sheet-backdrop' });
  const body = h('div', { class: 'sheet-body' });
  const panel = h(
    'div',
    { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, style: cat ? { '--cat': `var(--c-${cat})` } : null },
    h('div', { class: 'sheet-grip' }),
    h('div', { class: 'sheet-head' }, h('h3', null, title), h('button', { class: 'icon-btn', 'aria-label': '닫기', onclick: () => close() }, icon('close'))),
    body
  );

  let closed = false;
  const onKey = (e) => e.key === 'Escape' && close();
  function close() {
    if (closed) return;
    closed = true;
    panel.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.classList.remove('sheet-lock');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => { panel.remove(); backdrop.remove(); }, 320);
  }

  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.append(backdrop, panel);
  document.body.classList.add('sheet-lock');
  build(body, close);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    panel.classList.add('open');
    backdrop.classList.add('open');
  }));
  return close;
}
