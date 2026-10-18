// 가벼운 SVG 차트들. 각 차트는 탭/호버하면 툴팁을 보여주고, 표 보기로 바꿀 수 있습니다.
import { h, clamp } from './util.js';

const NS = 'http://www.w3.org/2000/svg';

function s(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  return el;
}

function text(x, y, str, attrs = {}) {
  const t = s('text', { x, y, ...attrs });
  t.textContent = str;
  return t;
}

function niceScale(max, step) {
  if (!(max > 0)) max = 1;
  if (!step) {
    const raw = max / 4;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const n = raw / mag;
    step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  }
  const top = Math.ceil(max / step - 1e-9) * step;
  const ticks = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return { top, ticks };
}

// 위쪽 모서리만 둥근 막대
function barPath(x, y, w, hgt, r) {
  r = Math.min(r, hgt, w / 2);
  return `M${x},${y + hgt}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + hgt}Z`;
}

// ---------- tooltip ----------

function makeTip(wrap) {
  const tip = h('div', { class: 'tip', role: 'status', 'aria-live': 'polite' });
  wrap.append(tip);
  return {
    show(x, y, title, rows) {
      tip.replaceChildren(
        h('div', { class: 'tip-title' }, title),
        ...rows.map(([color, value, label]) =>
          h('div', { class: 'tip-row' }, color && h('i', { class: 'tip-key', style: { background: color } }), h('b', null, value), label && h('span', null, label))
        )
      );
      tip.classList.add('on');
      const w = tip.offsetWidth, ht = tip.offsetHeight, W = wrap.clientWidth;
      const left = clamp(x - w / 2, 0, Math.max(0, W - w));
      const top = y - ht - 10 < -4 ? y + 14 : y - ht - 10;
      tip.style.transform = `translate(${left}px, ${top}px)`;
    },
    hide() {
      tip.classList.remove('on');
    },
  };
}

// 차트 바깥을 탭하면 툴팁 닫기
document.addEventListener('pointerdown', (e) => {
  document.querySelectorAll('.chart').forEach((c) => {
    if (!c.contains(e.target)) c._hide?.();
  });
});

function frame(width, height) {
  const svg = s('svg', { viewBox: `0 0 ${width} ${height}`, width, height, class: 'viz' });
  const wrap = h('div', { class: 'chart' });
  wrap.append(svg);
  return { svg, wrap };
}

function bindHits({ svg, wrap, tip, marks, hits, onShow }) {
  const hide = () => {
    marks.forEach((m) => m && [].concat(m).forEach((el) => el.classList.remove('dim')));
    tip.hide();
  };
  hits.forEach((hit, i) => {
    if (!hit) return;
    const show = () => {
      marks.forEach((m, j) => m && [].concat(m).forEach((el) => el.classList.toggle('dim', j !== i)));
      onShow(i);
    };
    hit.addEventListener('pointerenter', show);
    hit.addEventListener('pointerdown', show);
    hit.addEventListener('focus', show);
    hit.addEventListener('blur', hide);
  });
  svg.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
  wrap._hide = hide;
}

// ---------- bar chart ----------
// data: [{ label, showLabel, title, value (number|null) }]
export function barChart({ data, width, height = 170, color, goal, goalLabel, step, yMax, yFmt = String, tipFor, zeroDot = false }) {
  const P = { t: 14, r: 4, b: 22, l: 34 };
  const iw = width - P.l - P.r, ih = height - P.t - P.b;
  const vals = data.map((d) => d.value).filter((v) => v != null);
  const { top, ticks } = niceScale(yMax ?? (Math.max(goal || 0, ...vals, 0) || 1), step);
  const y = (v) => P.t + ih - (v / top) * ih;
  const band = iw / data.length;
  const bw = Math.max(2, Math.min(24, band * 0.62, band - 2));
  const { svg, wrap } = frame(width, height);

  ticks.forEach((t) => {
    svg.append(s('line', { x1: P.l, x2: width - P.r, y1: y(t), y2: y(t), class: t === 0 ? 'axis' : 'grid' }));
    svg.append(text(P.l - 6, y(t) + 3.5, yFmt(t), { class: 'tick', 'text-anchor': 'end' }));
  });

  const marks = data.map((d, i) => {
    const cx = P.l + band * i + band / 2;
    if (d.showLabel !== false) svg.append(text(cx, height - 6, d.label, { class: 'tick', 'text-anchor': 'middle' }));
    if (d.value == null) return null;
    if (d.value === 0) {
      if (!zeroDot) return null;
      const c = s('circle', { cx, cy: y(0) - 3.5, r: 2.5, class: 'zero-dot dot-plain' });
      svg.append(c);
      return c;
    }
    const bh = Math.max(1.5, (d.value / top) * ih);
    const p = s('path', { d: barPath(cx - bw / 2, y(0) - bh, bw, bh, 4), class: 'bar', style: `fill:${color}` });
    svg.append(p);
    return p;
  });

  if (goal) {
    const gy = y(goal);
    svg.append(s('line', { x1: P.l, x2: width - P.r, y1: gy, y2: gy, class: 'goal' }));
    if (goalLabel) svg.append(text(width - P.r, gy - 4, goalLabel, { class: 'goal-label', 'text-anchor': 'end' }));
  }

  const tip = makeTip(wrap);
  const hits = data.map((d, i) => {
    const hit = s('rect', { x: P.l + band * i, y: P.t, width: band, height: ih + 4, class: 'hit', tabindex: 0 });
    svg.append(hit);
    return hit;
  });
  bindHits({
    svg, wrap, tip, marks, hits,
    onShow: (i) => {
      const d = data[i];
      tip.show(P.l + band * i + band / 2, y(d.value || 0), d.title, d.value == null ? [[null, '기록 없음']] : tipFor(d));
    },
  });
  return wrap;
}

// ---------- range chart (잠든 시각 → 일어난 시각) ----------
// data: [{ label, showLabel, title, start, end }]  start/end = 저녁 6시 기준 분
export function rangeChart({ data, width, height = 200, color, tipFor, clock }) {
  const P = { t: 8, r: 4, b: 22, l: 40 };
  const iw = width - P.l - P.r, ih = height - P.t - P.b;
  const vals = data.filter((d) => d.start != null);
  let lo = Math.min(...vals.map((d) => d.start)), hi = Math.max(...vals.map((d) => d.end));
  lo = Math.floor(lo / 60) * 60;
  hi = Math.ceil(hi / 60) * 60;
  if (hi - lo < 360) { const pad = (360 - (hi - lo)) / 2; lo = Math.floor((lo - pad) / 60) * 60; hi = lo + 360; }
  const span = hi - lo;
  const stepMin = span > 720 ? 180 : 120;
  const y = (m) => P.t + ((m - lo) / span) * ih;
  const band = iw / data.length;
  const bw = Math.max(2, Math.min(18, band * 0.55, band - 2));
  const { svg, wrap } = frame(width, height);

  for (let t = Math.ceil(lo / stepMin) * stepMin; t <= hi; t += stepMin) {
    svg.append(s('line', { x1: P.l, x2: width - P.r, y1: y(t), y2: y(t), class: 'grid' }));
    svg.append(text(P.l - 6, y(t) + 3.5, clock(t).slice(0, 2) + '시', { class: 'tick', 'text-anchor': 'end' }));
  }

  const marks = data.map((d, i) => {
    const cx = P.l + band * i + band / 2;
    if (d.showLabel !== false) svg.append(text(cx, height - 6, d.label, { class: 'tick', 'text-anchor': 'middle' }));
    if (d.start == null) return null;
    const r = s('rect', { x: cx - bw / 2, y: y(d.start), width: bw, height: Math.max(2, y(d.end) - y(d.start)), rx: Math.min(4, bw / 2), class: 'bar', style: `fill:${color}` });
    svg.append(r);
    return r;
  });

  const tip = makeTip(wrap);
  const hits = data.map((d, i) => {
    const hit = s('rect', { x: P.l + band * i, y: P.t, width: band, height: ih, class: 'hit', tabindex: 0 });
    svg.append(hit);
    return hit;
  });
  bindHits({
    svg, wrap, tip, marks, hits,
    onShow: (i) => {
      const d = data[i];
      tip.show(P.l + band * i + band / 2, d.start != null ? y(d.start) : P.t + ih / 2, d.title, d.start == null ? [[null, '기록 없음']] : tipFor(d));
    },
  });
  return wrap;
}

// ---------- line chart ----------
// data: [{ label, showLabel, title, value }]
export function lineChart({ data, width, height = 160, color, domain, ticks, yFmt = String, tipFor, padLeft = 34, tickClass = 'tick' }) {
  const P = { t: 12, r: 10, b: 22, l: padLeft };
  const iw = width - P.l - P.r, ih = height - P.t - P.b;
  const vals = data.map((d) => d.value).filter((v) => v != null);
  let [lo, hi] = domain || [Math.min(...vals), Math.max(...vals)];
  if (!domain) {
    const pad = Math.max(0.5, (hi - lo) * 0.25);
    lo = Math.floor(lo - pad);
    hi = Math.ceil(hi + pad);
  }
  if (!ticks) {
    const stepT = (hi - lo) / 4 >= 1 ? Math.ceil((hi - lo) / 4) : 0.5;
    ticks = [];
    for (let v = lo; v <= hi + 1e-9; v += stepT) ticks.push(Math.round(v * 10) / 10);
  }
  const band = iw / data.length;
  const x = (i) => P.l + band * i + band / 2;
  const y = (v) => P.t + ih - ((v - lo) / (hi - lo)) * ih;
  const { svg, wrap } = frame(width, height);

  ticks.forEach((t) => {
    svg.append(s('line', { x1: P.l, x2: width - P.r, y1: y(t), y2: y(t), class: 'grid' }));
    svg.append(text(P.l - 6, y(t) + 4, yFmt(t), { class: tickClass, 'text-anchor': 'end' }));
  });
  data.forEach((d, i) => { if (d.showLabel !== false) svg.append(text(x(i), height - 6, d.label, { class: 'tick', 'text-anchor': 'middle' })); });

  const pts = data.map((d, i) => (d.value != null ? [x(i), y(d.value)] : null)).filter(Boolean);
  if (pts.length > 1) svg.append(s('path', { d: 'M' + pts.map((p) => p.join(',')).join('L'), class: 'line', style: `stroke:${color}` }));

  const cross = s('line', { y1: P.t, y2: P.t + ih, class: 'cross', visibility: 'hidden' });
  svg.append(cross);
  const marks = data.map((d, i) => {
    if (d.value == null) return null;
    const c = s('circle', { cx: x(i), cy: y(d.value), r: 4.5, class: 'dot', style: `fill:${color}` });
    svg.append(c);
    return c;
  });

  const tip = makeTip(wrap);
  const hits = data.map((d, i) => {
    const hit = s('rect', { x: P.l + band * i, y: P.t, width: band, height: ih, class: 'hit', tabindex: d.value != null ? 0 : -1 });
    svg.append(hit);
    return hit;
  });
  bindHits({
    svg, wrap, tip, marks, hits,
    onShow: (i) => {
      const d = data[i];
      cross.setAttribute('x1', x(i));
      cross.setAttribute('x2', x(i));
      cross.setAttribute('visibility', 'visible');
      tip.show(x(i), d.value != null ? y(d.value) : P.t + ih / 2, d.title, d.value == null ? [[null, '기록 없음']] : tipFor(d));
    },
  });
  const baseHide = wrap._hide;
  wrap._hide = () => { cross.setAttribute('visibility', 'hidden'); baseHide(); };
  svg.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') cross.setAttribute('visibility', 'hidden'); });
  return wrap;
}

// ---------- 식사 매트릭스 ----------
// data: [{ label, showLabel, title, meals }], rows: [{ key, label }], colors: { good, ok, heavy }
export function mealMatrix({ data, rows, width, tipFor, colors }) {
  const P = { t: 4, r: 4, b: 22, l: 58 };
  const rowH = 26;
  const height = P.t + rows.length * rowH + P.b;
  const iw = width - P.l - P.r;
  const band = iw / data.length;
  const r = Math.max(2.5, Math.min(8, band / 2 - 1.5));
  const { svg, wrap } = frame(width, height);

  rows.forEach((row, ri) => svg.append(text(0, P.t + ri * rowH + rowH / 2 + 4, row.label, { class: 'row-label' })));

  const marks = data.map((d, i) => {
    const cx = P.l + band * i + band / 2;
    if (d.showLabel !== false) svg.append(text(cx, height - 6, d.label, { class: 'tick', 'text-anchor': 'middle' }));
    return rows.map((row, ri) => {
      const cy = P.t + ri * rowH + rowH / 2;
      const v = d.meals?.[row.key];
      let c;
      if (v === 'skip') c = s('circle', { cx, cy, r: r - 0.75, class: 'cell cell-skip' });
      else if (v) c = s('circle', { cx, cy, r, class: 'cell', style: `fill:${colors[v]}` });
      else c = s('circle', { cx, cy, r: Math.min(2, r), class: 'cell cell-none' });
      svg.append(c);
      return c;
    });
  });

  const tip = makeTip(wrap);
  const hits = data.map((d, i) => {
    const hit = s('rect', { x: P.l + band * i, y: P.t, width: band, height: rows.length * rowH, class: 'hit', tabindex: 0 });
    svg.append(hit);
    return hit;
  });
  bindHits({
    svg, wrap, tip, marks, hits,
    onShow: (i) => tip.show(P.l + band * i + band / 2, P.t, data[i].title, tipFor(data[i])),
  });
  return wrap;
}

// ---------- 가로 막대 목록 (종류별 비중) ----------
export function hbarList(items) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return h(
    'div',
    { class: 'hbars' },
    items.map((it) =>
      h(
        'div',
        { class: 'hbar' },
        h('div', { class: 'hbar-top' }, h('span', null, `${it.emoji} ${it.label}`), h('span', null, it.display)),
        h('div', { class: 'hbar-track' }, h('i', { style: { width: `${(it.value / max) * 100}%` } }))
      )
    )
  );
}

export function tableView({ head, rows }) {
  return h(
    'div',
    { class: 'table-wrap' },
    h(
      'table',
      { class: 'data-table' },
      h('thead', null, h('tr', null, head.map((c) => h('th', null, c)))),
      h('tbody', null, rows.map((r) => h('tr', null, r.map((c) => h('td', null, c ?? '–')))))
    )
  );
}
