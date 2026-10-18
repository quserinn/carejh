// DOM helper: h('div', { class: 'x', onclick: fn }, child, [children], 'text')
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null) continue;
      if (k.startsWith('aria-')) { el.setAttribute(k, String(v)); continue; }
      if (v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') {
        if (typeof v === 'string') el.style.cssText = v;
        else for (const [sk, sv] of Object.entries(v)) el.style.setProperty(sk, sv);
      } else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value' || k === 'checked' || k === 'disabled') el[k] = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : String(c));
  }
}

// ---------- dates (keys are local 'YYYY-MM-DD') ----------

// 새벽 4시 전까지는 전날로 칩니다 (늦은 술자리, 야식 기록용).
export const DAY_START_HOUR = 4;
export const WD = ['일', '월', '화', '수', '목', '금', '토'];

export const pad2 = (n) => String(n).padStart(2, '0');

export function keyOf(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey() {
  const now = new Date();
  now.setHours(now.getHours() - DAY_START_HOUR);
  return keyOf(now);
}

export function addDays(k, n) {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return keyOf(d);
}

// b - a in days
export function diffDays(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export function rangeKeys(a, b) {
  const out = [];
  for (let k = a; k <= b; k = addDays(k, 1)) out.push(k);
  return out;
}

export function mondayOf(k) {
  const wd = parseKey(k).getDay();
  return addDays(k, -((wd + 6) % 7));
}

export function fmtMD(k) {
  const d = parseKey(k);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function fmtDayTitle(k) {
  const d = parseKey(k);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`;
}

export function fmtDateLong(k) {
  const d = parseKey(k);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WD[d.getDay()]}요일`;
}

// ---------- numbers ----------

export function fmtDuration(min) {
  if (min == null) return '–';
  min = Math.round(min);
  const hh = Math.floor(min / 60);
  const mm = min % 60;
  if (!hh) return `${mm}분`;
  return mm ? `${hh}시간 ${mm}분` : `${hh}시간`;
}

export function fmtNum(n, digits = 1) {
  if (n == null || Number.isNaN(n)) return '–';
  const f = 10 ** digits;
  return String(Math.round(n * f) / f);
}

export const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
export const sum = (arr) => arr.reduce((a, b) => a + b, 0);
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------- misc ----------

export function debounce(fn, ms) {
  let t, lastArgs;
  const d = (...args) => {
    lastArgs = args;
    clearTimeout(t);
    t = setTimeout(() => { t = null; fn(...lastArgs); }, ms);
  };
  d.flush = () => {
    if (t) { clearTimeout(t); t = null; fn(...lastArgs); }
  };
  return d;
}

let toastEl, toastTimer;
export function toast(msg) {
  if (!toastEl) {
    toastEl = h('div', { class: 'toast', role: 'status' });
    document.body.append(toastEl);
  }
  toastEl.textContent = msg;
  requestAnimationFrame(() => toastEl.classList.add('on'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2200);
}

export function autoGrow(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}
