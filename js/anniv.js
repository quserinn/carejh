// 기념일: 한국식으로 처음 만난 날을 1일로 셉니다. (100일 = 처음 만난 날 + 99일)
import { diffDays, pad2 } from './util.js';

export const dayNumber = (start, key) => diffDays(start, key) + 1;

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

// 2월 29일에 시작했다면 평년에는 2월 28일에 챙겨요
function yearDay(start, y) {
  const [, sm, sd] = start.split('-').map(Number);
  const [m, d] = sm === 2 && sd === 29 && !isLeap(y) ? [2, 28] : [sm, sd];
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

// 그날이 기념일이면 { kind: 'start' | 'year' | 'hundred', n, years?, title }
export function anniversaryOn(start, key) {
  if (!start || key < start) return null;
  if (key === start) return { kind: 'start', n: 1, title: '처음 만난 날' };
  const n = dayNumber(start, key);
  const years = Number(key.slice(0, 4)) - Number(start.slice(0, 4));
  if (years > 0 && key === yearDay(start, Number(key.slice(0, 4)))) return { kind: 'year', n, years, title: `${years}주년` };
  if (n % 100 === 0) return { kind: 'hundred', n, title: `${n}일` };
  return null;
}

// 지난 날짜를 볼 때도 어색하지 않게 '오늘'이라는 말은 빼고 씁니다
const HUNDRED = {
  100: '100일 축하해! 앞으로도 매일 같이 건강하자.',
  200: '200일 축하해! 함께라서 하루하루가 더 즐거워.',
  300: '벌써 300일! 여기까지 같이 와 줘서 고마워.',
  500: '500일 축하해! 1000일까지 손잡고 가자.',
  1000: '1000일이라니! 정말 고마워. 앞으로도 잘 부탁해.',
};

const SPECIAL_DAYS = { '02-14': '발렌타인데이', '12-25': '크리스마스', '03-14': '화이트데이' };

export function annivMessage(a, key) {
  const special = key && SPECIAL_DAYS[key.slice(5)];
  if (special) return `${a.title}이 ${special}랑 겹쳤어! 두 배로 축하해. 함께해 줘서 고마워.`;
  if (a.kind === 'start') return '우리가 처음 만난 날. 모든 게 여기서 시작됐어.';
  if (a.kind === 'year') {
    return a.years === 1
      ? '1주년 축하해! 1년 동안 함께해 줘서 정말 고마워.'
      : `${a.years}주년 축하해! ${a.years}년 내내 고마웠어. 앞으로도 같이 건강하자.`;
  }
  return HUNDRED[a.n] || `${a.n}일 축하해! 앞으로도 같이 건강하자.`;
}

// 카드 큰 제목
export function annivHeadline(a) {
  if (a.kind === 'start') return '처음 만난 날';
  if (a.kind === 'year') return `${a.years}주년`;
  return `우리 ${a.n}일`;
}
