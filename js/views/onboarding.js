import { h } from '../util.js';
import * as store from '../store.js';
import { character, duo, CHARACTERS } from '../characters.js';

// 처음 열었을 때: 내 캐릭터와 이름 고르기
export function renderOnboarding(app) {
  const st = app.state;
  st.obPick = st.obPick || null;
  const pick = (k) => {
    st.obPick = k;
    document.documentElement.dataset.char = k;
    app.render({ keepScroll: true });
  };
  const nameInput = h('input', { class: 'text-input', placeholder: '이름 또는 애칭 (선택)', maxlength: '20', value: st.obName || '', 'aria-label': '이름 또는 애칭', oninput: (e) => { st.obName = e.target.value; } });
  const start = () => {
    store.updateSettings((s) => {
      s.character = st.obPick;
      s.name = (st.obName || '').trim();
    });
    app.state.obPick = null;
    app.state.obName = null;
  };

  return h(
    'div',
    { class: 'view onboard' },
    duo(st.obPick === 'lion' ? 'cheer' : 'good', st.obPick === 'alpaca' ? 'cheer' : 'good'),
    h('h1', { class: 'ob-title' }, 'CareJH'),
    h('p', { class: 'ob-sub' }, '수면, 식사, 운동, 술, 물까지', h('br'), '하루 건강을 가볍게 기록해요'),
    h('p', { class: 'ob-q' }, '나는 누구일까요?'),
    h(
      'div',
      { class: 'ob-pick', role: 'radiogroup', 'aria-label': '내 캐릭터' },
      ['lion', 'alpaca'].map((k) =>
        h(
          'button',
          { class: 'ob-card' + (st.obPick === k ? ' on' : ''), role: 'radio', 'aria-checked': st.obPick === k, onclick: () => pick(k) },
          character(k, st.obPick === k ? 'cheer' : 'good'),
          CHARACTERS[k].name,
          h('small', null, k === 'lion' ? '노을빛 오렌지 테마' : '포근한 라벤더 테마')
        )
      )
    ),
    h('p', { class: 'ob-q' }, '뭐라고 불러 드릴까요?'),
    nameInput,
    h('button', { class: 'btn btn-primary block', disabled: !st.obPick, onclick: start }, st.obPick ? `${CHARACTERS[st.obPick].name}로 시작하기` : '캐릭터를 골라 주세요')
  );
}
