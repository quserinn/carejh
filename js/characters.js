// 아기사자와 알파카. 표정을 바꿔 가며 앱 곳곳에 등장합니다.
// charSVG(kind, expr)는 DOM 없이 SVG 문자열을 만들고, character()는 그걸 요소로 감쌉니다.

export const CHARACTERS = {
  lion: { key: 'lion', name: '아기사자', short: '사자' },
  alpaca: { key: 'alpaca', name: '알파카', short: '알파카' },
};

const INK = '#4A2C1A';

const PAL = {
  lion: {
    mane: '#EE9A3C', maneLine: '#D47C25',
    face: '#FFD27D', faceLine: '#E8A63E',
    ear: '#F59E58', muzzle: '#FFF3DA', nose: '#8C4A28',
  },
  alpaca: {
    fluff: '#FFFAF2', fluffLine: '#E4CFAE',
    face: '#F8E3C6', faceLine: '#E0C197',
    ear: '#FFB7AC', snout: '#FFF6EA', nose: '#7A4A2E',
    scarf: '#9C88EC', scarfLine: '#7F6AD6',
  },
};

// 표정 = 눈, 입, 볼터치 진하기, 덤(반짝이, zzz, 땀, 하트), 눈썹
export const EXPRESSIONS = {
  great: { eyes: 'happy', mouth: 'open', blush: 1, extra: 'sparkles' },
  good: { eyes: 'dot', mouth: 'smile', blush: 0.85 },
  ok: { eyes: 'dot', mouth: 'flat', blush: 0.5 },
  meh: { eyes: 'dot', mouth: 'frown', blush: 0.4, brows: 'sad' },
  bad: { eyes: 'squeeze', mouth: 'frown', blush: 0.3, brows: 'sad', extra: 'sweat' },
  sleepy: { eyes: 'closed', mouth: 'o', blush: 0.6, extra: 'zzz' },
  cheer: { eyes: 'happy', mouth: 'open', blush: 1, extra: 'sparkles' },
  proud: { eyes: 'happy', mouth: 'smile', blush: 0.9, extra: 'hearts' },
  dizzy: { eyes: 'swirl', mouth: 'wavy', blush: 1.3, extra: 'sweat' },
  wow: { eyes: 'sparkle', mouth: 'o', blush: 0.8 },
};

// 기분 1~5 → 표정
export const MOOD_EXPR = [null, 'bad', 'meh', 'ok', 'good', 'great'];
// 수면 개운함 1~3 → 표정
export const SLEEP_EXPR = [null, 'sleepy', 'ok', 'good'];

const ANCHOR = {
  lion: { ex: [47, 73], ey: 63, my: 77.5, by: 74, bx: [40, 80] },
  alpaca: { ex: [49, 71], ey: 63, my: 79, by: 73.5, bx: [43, 77] },
};

const stroke = (w = 2.4) => `fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

// 겹친 도형의 바깥쪽에만 테두리를 그리는 방법: 굵은 테두리로 한 번, 테두리 없이 한 번 더
function outlined(shapes, fill, line, w = 2.2) {
  const under = shapes.map((s) => s.replace('/>', ` fill="${line}" stroke="${line}" stroke-width="${w * 2}" stroke-linejoin="round"/>`)).join('');
  const over = shapes.map((s) => s.replace('/>', ` fill="${fill}"/>`)).join('');
  return under + over;
}

function eyes(kind, a) {
  return a.ex
    .map((x, i) => {
      const y = a.ey;
      const mirror = i === 1 ? -1 : 1;
      switch (kind) {
        case 'happy':
          return `<path d="M${x - 4.6} ${y + 1.6} Q${x} ${y - 4.8} ${x + 4.6} ${y + 1.6}" ${stroke(2.7)}/>`;
        case 'closed':
          return `<path d="M${x - 4.6} ${y - 0.4} Q${x} ${y + 3.8} ${x + 4.6} ${y - 0.4}" ${stroke(2.5)}/>`;
        case 'squeeze':
          return `<path d="M${x - 3.6 * mirror} ${y - 3.6} L${x + 3 * mirror} ${y} L${x - 3.6 * mirror} ${y + 3.6}" ${stroke(2.5)}/>`;
        case 'swirl':
          return `<circle cx="${x}" cy="${y}" r="4.4" ${stroke(1.8)}/><circle cx="${x + 0.6}" cy="${y - 0.4}" r="1.6" fill="${INK}"/>`;
        case 'sparkle':
          return `<circle cx="${x}" cy="${y}" r="5.3" fill="${INK}"/><circle cx="${x + 1.8}" cy="${y - 2}" r="1.9" fill="#fff"/><circle cx="${x - 1.6}" cy="${y + 1.8}" r="0.95" fill="#fff"/>`;
        default:
          return `<circle cx="${x}" cy="${y}" r="4.5" fill="${INK}"/><circle cx="${x + 1.5}" cy="${y - 1.7}" r="1.55" fill="#fff"/>`;
      }
    })
    .join('');
}

function brows(kind, a) {
  if (kind !== 'sad') return '';
  const [l, r] = a.ex;
  const y = a.ey;
  return `<path d="M${l - 4.5} ${y - 7} L${l + 3.5} ${y - 9.8}" ${stroke(2.2)}/><path d="M${r + 4.5} ${y - 7} L${r - 3.5} ${y - 9.8}" ${stroke(2.2)}/>`;
}

function mouth(kind, a) {
  const y = a.my;
  switch (kind) {
    case 'open':
      return `<path d="M52.5 ${y + 1} Q60 ${y + 3} 67.5 ${y + 1} Q66 ${y + 10.5} 60 ${y + 10.5} Q54 ${y + 10.5} 52.5 ${y + 1} Z" fill="${INK}"/><ellipse cx="60" cy="${y + 8}" rx="4" ry="2.3" fill="#FF8A8A"/>`;
    case 'flat':
      return `<path d="M55.5 ${y + 3.8} H64.5" ${stroke(2.3)}/>`;
    case 'frown':
      return `<path d="M54.5 ${y + 6.2} Q60 ${y + 1.6} 65.5 ${y + 6.2}" ${stroke(2.3)}/>`;
    case 'o':
      return `<ellipse cx="60" cy="${y + 4.6}" rx="2.7" ry="3.1" fill="${INK}"/>`;
    case 'wavy':
      return `<path d="M52.5 ${y + 4.2} q1.9 -2.2 3.75 0 t3.75 0 t3.75 0 t3.75 0" ${stroke(2.2)}/>`;
    default:
      return `<path d="M60 ${y} v2.6 M60 ${y + 2.6} q-3.5 4 -7.2 0.6 M60 ${y + 2.6} q3.5 4 7.2 0.6" ${stroke(2.2)}/>`;
  }
}

const star = (x, y, s) => `<path d="M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z" fill="#FFC23D"/>`;
const heart = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 2.2C0-.8 4-1.2 4 2c0-3.2 4-2.8 4 .2C8 5.4 4 8 4 8S0 5.4 0 2.2z" fill="#FF7E95"/>`;

function extra(kind) {
  switch (kind) {
    case 'sparkles':
      return star(103, 26, 7.5) + star(15, 44, 5.5) + star(108, 62, 4.5);
    case 'zzz':
      return `<g fill="#8E9BD6" font-family="Pretendard, -apple-system, sans-serif" font-weight="800"><text x="90" y="34" font-size="15">z</text><text x="101" y="22" font-size="11">z</text><text x="109" y="13" font-size="8">z</text></g>`;
    case 'sweat':
      return `<path d="M93 38 Q98.5 47 93 51 Q87.5 47 93 38 Z" fill="#9DD3F7" stroke="#6FB6E8" stroke-width="1.4"/>`;
    case 'hearts':
      return heart(96, 18, 1.5) + heart(12, 36, 1.1);
    default:
      return '';
  }
}

function lionBody(p) {
  const bumps = [];
  for (let i = 0; i < 14; i++) {
    const t = (i / 14) * Math.PI * 2;
    bumps.push(`<circle cx="${(60 + Math.cos(t) * 39).toFixed(2)}" cy="${(62 + Math.sin(t) * 39).toFixed(2)}" r="12.5"/>`);
  }
  const mane = outlined([`<circle cx="60" cy="62" r="40"/>`, ...bumps], p.mane, p.maneLine);
  const ears = outlined([`<circle cx="40" cy="39" r="10"/>`, `<circle cx="80" cy="39" r="10"/>`], p.face, p.faceLine) +
    `<circle cx="40" cy="39" r="5.5" fill="${p.ear}"/><circle cx="80" cy="39" r="5.5" fill="${p.ear}"/>`;
  const face = outlined([`<circle cx="60" cy="66" r="31"/>`], p.face, p.faceLine);
  const tuft = `<path d="M50 38.5 C52 31 60 28.5 64 33 C60 31.8 57.5 34 58 38 C55.5 35.5 52.5 36 50 38.5 Z" fill="${p.mane}" stroke="${p.maneLine}" stroke-width="1.6" stroke-linejoin="round"/>`;
  const muzzle = `<ellipse cx="60" cy="79" rx="15.5" ry="11.5" fill="${p.muzzle}"/>`;
  const nose = `<path d="M54.4 72.2 Q60 69.2 65.6 72.2 Q63 77.2 60 77.6 Q57 77.2 54.4 72.2 Z" fill="${p.nose}"/>`;
  return { back: mane + ears, face: face + tuft + muzzle, nose };
}

function alpacaBody(p) {
  const neck = `<path d="M43 84 L43 121 L77 121 L77 84 Z" fill="${p.face}" stroke="${p.faceLine}" stroke-width="2.2" stroke-linejoin="round"/>` +
    `<path d="M39.5 93 Q60 101 80.5 93 L80.5 102.5 Q60 110.5 39.5 102.5 Z" fill="${p.scarf}" stroke="${p.scarfLine}" stroke-width="1.8" stroke-linejoin="round"/>` +
    `<path d="M64 104 L72 104 L74 119 L65 119 Z" fill="${p.scarf}" stroke="${p.scarfLine}" stroke-width="1.8" stroke-linejoin="round"/>`;
  const earShape = (cx, rot) => `<ellipse cx="${cx}" cy="38" rx="7.2" ry="15.5" transform="rotate(${rot} ${cx} 38)"/>`;
  const ears = outlined([earShape(37, -28), earShape(83, 28)], p.face, p.faceLine) +
    `<ellipse cx="37" cy="39" rx="3.4" ry="10" transform="rotate(-28 37 39)" fill="${p.ear}"/><ellipse cx="83" cy="39" rx="3.4" ry="10" transform="rotate(28 83 39)" fill="${p.ear}"/>`;
  const head = outlined([`<ellipse cx="60" cy="67" rx="25.5" ry="30"/>`], p.face, p.faceLine);
  const fluffCircles = [
    [44, 46, 10], [50, 37, 11], [60, 33, 12.5], [70, 37, 11], [76, 46, 10], [60, 45, 12], [51, 47, 10], [69, 47, 10],
  ].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`);
  const fluff = outlined(fluffCircles, p.fluff, p.fluffLine, 2);
  const snout = `<ellipse cx="60" cy="80" rx="15" ry="11.5" fill="${p.snout}"/>`;
  const nose = `<path d="M55.6 75.4 Q60 73.4 64.4 75.4 Q62.4 79 60 79.2 Q57.6 79 55.6 75.4 Z" fill="${p.nose}"/>`;
  return { back: neck + ears, face: head + snout + fluff, nose };
}

// 전신(기본)과 얼굴만(face) 보여줄 때의 영역. 알파카는 여백이 많아 조금 더 당겨서 보여줌
const FULL_BOX = { lion: '0 0 120 120', alpaca: '8 16 104 104' };
const FACE_BOX = { lion: '7 7 106 106', alpaca: '19 13 82 82' };

export function charSVG(kind, exprKey = 'good', { title, face = false } = {}) {
  const e = EXPRESSIONS[exprKey] || EXPRESSIONS.good;
  const a = ANCHOR[kind];
  const body = kind === 'alpaca' ? alpacaBody(PAL.alpaca) : lionBody(PAL.lion);
  const blush = a.bx.map((x) => `<ellipse cx="${x}" cy="${a.by}" rx="5.6" ry="3.3" fill="#FF8F86" opacity="${Math.min(0.75, 0.5 * e.blush)}"/>`).join('');
  return (
    `<svg viewBox="${face ? FACE_BOX[kind] : FULL_BOX[kind]}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title || CHARACTERS[kind].name}">` +
    body.back + body.face + blush + body.nose + eyes(e.eyes, a) + brows(e.brows, a) + mouth(e.mouth, a) + extra(e.extra) +
    `</svg>`
  );
}

export function duoSVG(exprLion = 'good', exprAlpaca = 'good') {
  const at = (svg, x, y, size) => svg.replace('<svg ', `<svg x="${x}" y="${y}" width="${size}" height="${size}" `);
  return (
    `<svg viewBox="0 0 232 124" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="아기사자와 알파카">` +
    at(charSVG('lion', exprLion), 0, 2, 120) +
    at(charSVG('alpaca', exprAlpaca), 110, 0, 122) +
    `</svg>`
  );
}

// 앱에서 쓰는 요소 버전
export function character(kind, expr = 'good', { size, cls = '', face = false, title } = {}) {
  const span = document.createElement('span');
  span.className = `char ${cls}`.trim();
  if (size) span.style.setProperty('--size', `${size}px`);
  span.innerHTML = charSVG(kind, expr, { face, title });
  return span;
}

export function duo(exprLion, exprAlpaca, cls = '') {
  const span = document.createElement('span');
  span.className = `duo ${cls}`.trim();
  span.innerHTML = duoSVG(exprLion, exprAlpaca);
  return span;
}
