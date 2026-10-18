import { h, todayKey, toast, fmtNum, debounce } from '../util.js';
import * as store from '../store.js';
import { CATS } from '../constants.js';
import { character, duo, CHARACTERS } from '../characters.js';
import { icon } from '../icons.js';

export function renderSettings(app) {
  const s = store.getSettings();
  const me = s.character || 'lion';
  const setGoal = (key, v) => store.updateSettings((st) => { st.goals[key] = v; });
  const saveName = debounce((v) => store.updateSettings((st) => { st.name = v.trim(); }, { silent: true }), 400);

  const goal = (cat, label, key, value, display, step, min, max) =>
    h(
      'div',
      { class: 'set-row', style: { '--cat': `var(--c-${cat})` } },
      h('span', { class: 'cat-icon sm' }, icon(cat)),
      h('div', { class: 'set-label' }, h('b', null, label)),
      h(
        'div',
        { class: 'stepper' },
        h('button', { class: 'st-btn', 'aria-label': `${label} 줄이기`, disabled: value <= min, onclick: () => setGoal(key, Math.max(min, value - step)) }, '−'),
        h('span', { class: 'st-val' }, display),
        h('button', { class: 'st-btn', 'aria-label': `${label} 늘리기`, disabled: value >= max, onclick: () => setGoal(key, Math.min(max, value + step)) }, '+')
      )
    );

  const enabledCount = CATS.filter((c) => s.enabled[c.key]).length;
  const toggleCat = (key) => {
    if (s.enabled[key] && enabledCount === 1) return toast('최소 한 가지는 켜 두어야 해요.');
    store.updateSettings((st) => { st.enabled[key] = !st.enabled[key]; });
  };

  const fileInput = h('input', {
    type: 'file',
    accept: 'application/json,.json',
    style: { display: 'none' },
    onchange: async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      try {
        const backup = store.parseBackup(await file.text());
        const n = Object.keys(backup.days).length;
        if (!confirm(`백업 파일에 ${n}일의 기록이 있어요.\n같은 날짜의 기록은 백업 내용으로 바뀌고, 나머지 기록은 그대로 남아요.\n불러올까요?`)) return;
        store.importBackup(backup);
        toast(`${n}일의 기록을 불러왔어요.`);
      } catch (err) {
        alert(err.message);
      }
    },
  });

  const lastBackup = s.lastBackupAt ? new Date(s.lastBackupAt) : null;
  const row = (ico, title, sub, onclick, danger = false) =>
    h(
      'button',
      { class: 'set-row click', onclick },
      h('span', { class: 'cat-icon sm', style: { '--cat': danger ? 'var(--bad)' : 'var(--ink-2)' } }, icon(ico)),
      h('div', { class: 'set-label' }, h('b', { class: danger ? 'danger-text' : '' }, title), sub && h('small', null, sub)),
      h('span', { class: 'chev' }, icon('chevR'))
    );

  return h(
    'div',
    { class: 'view' },
    h('div', { class: 'page-head' }, h('h1', { class: 'page-title' }, '설정')),

    h(
      'section',
      { class: 'card profile' },
      character(me, 'good'),
      h('input', {
        class: 'text-input',
        placeholder: '이름 또는 애칭',
        value: s.name,
        maxlength: '20',
        'aria-label': '이름 또는 애칭',
        oninput: (e) => saveName(e.target.value),
        onblur: () => saveName.flush(),
      }),
      h(
        'div',
        { class: 'char-pick', role: 'radiogroup', 'aria-label': '내 캐릭터' },
        ['lion', 'alpaca'].map((k) =>
          h(
            'button',
            { class: 'char-opt' + (me === k ? ' on' : ''), role: 'radio', 'aria-checked': me === k, onclick: () => store.updateSettings((st) => { st.character = k; }) },
            character(k, me === k ? 'good' : 'ok', { face: true }),
            CHARACTERS[k].name
          )
        )
      )
    ),

    h('h2', { class: 'section-title' }, '목표'),
    h(
      'div',
      { class: 'set-group' },
      goal('sleep', '하루 수면', 'sleepHours', s.goals.sleepHours, `${fmtNum(s.goals.sleepHours)}시간`, 0.5, 4, 12),
      goal('water', '하루 물', 'waterCups', s.goals.waterCups, `${s.goals.waterCups}잔`, 1, 1, 20),
      goal('exercise', '주간 운동', 'exerciseWeekMin', s.goals.exerciseWeekMin, `${s.goals.exerciseWeekMin}분`, 10, 0, 1500),
      goal('alcohol', '술 마시는 날', 'alcoholDaysWeek', s.goals.alcoholDaysWeek, `주 ${s.goals.alcoholDaysWeek}일`, 1, 0, 7)
    ),
    h('p', { class: 'set-note' }, '세계보건기구는 일주일에 150분 이상 운동하기를 권해요.'),

    h('h2', { class: 'section-title' }, '기록할 항목'),
    h(
      'div',
      { class: 'set-group' },
      CATS.map((c) =>
        h(
          'div',
          { class: 'set-row', style: { '--cat': `var(--c-${c.key})` } },
          h('span', { class: 'cat-icon sm' }, icon(c.key)),
          h('div', { class: 'set-label' }, h('b', null, c.label)),
          h('button', { class: 'switch' + (s.enabled[c.key] ? ' on' : ''), role: 'switch', 'aria-checked': !!s.enabled[c.key], 'aria-label': `${c.label} 기록`, onclick: () => toggleCat(c.key) }, h('i'))
        )
      )
    ),
    h('p', { class: 'set-note' }, '꺼 둔 항목은 화면에서만 숨겨지고, 이미 남긴 기록은 지워지지 않아요.'),

    h('h2', { class: 'section-title' }, '화면'),
    h(
      'div',
      { class: 'set-group' },
      h(
        'div',
        { class: 'set-row' },
        h('span', { class: 'cat-icon sm', style: { '--cat': 'var(--ink-2)' } }, icon('palette')),
        h('div', { class: 'set-label' }, h('b', null, '테마')),
        h(
          'div',
          { class: 'theme-seg' },
          [['system', '자동'], ['light', '밝게'], ['dark', '어둡게']].map(([k, l]) =>
            h('button', { class: s.theme === k ? 'on' : '', 'aria-pressed': s.theme === k, onclick: () => store.updateSettings((st) => { st.theme = k; }) }, l)
          )
        )
      )
    ),

    h('h2', { class: 'section-title' }, '데이터'),
    h(
      'div',
      { class: 'set-group' },
      row('download', '백업 파일 만들기', lastBackup ? `마지막 백업 ${lastBackup.getFullYear()}. ${lastBackup.getMonth() + 1}. ${lastBackup.getDate()}.` : '아직 백업한 적이 없어요', exportBackup),
      row('upload', '백업 파일 불러오기', '폰을 바꿨거나 기록을 되살릴 때', () => fileInput.click()),
      row('trash', '모든 기록 지우기', null, resetAll, true)
    ),
    fileInput,
    h('p', { class: 'set-note' }, `지금 이 폰에 ${store.dayCount()}일의 기록이 있어요. 기록은 이 폰 안에만 저장되고 어디에도 보내지 않아요. 앱을 지우거나 브라우저 데이터를 지우면 기록도 사라지니 가끔 백업해 두세요.`),

    h('div', { class: 'about' }, duo('good', 'good'), 'CareJH · v2.0')
  );
}

async function exportBackup() {
  const json = store.exportJSON();
  const name = `CareJH-백업-${todayKey()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  const done = () => {
    store.updateSettings((st) => { st.lastBackupAt = Date.now(); });
    toast('백업 파일을 만들었어요. 안전한 곳에 보관해 주세요.');
  };
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'CareJH 백업' });
      done();
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  done();
}

function resetAll() {
  const n = store.dayCount();
  if (!confirm('모든 기록과 설정을 지울까요?\n지운 기록은 되돌릴 수 없어요.')) return;
  if (n > 0 && !confirm(`마지막으로 확인할게요.\n${n}일의 기록이 모두 사라져요. 정말 지울까요?`)) return;
  store.resetAll();
  toast('모든 기록을 지웠어요.');
}
