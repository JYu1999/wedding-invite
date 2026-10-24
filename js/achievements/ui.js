// 成就的畫面：浮動泡泡（顯示積分）、成就清單、完成成就時從上方滑下來的通知
// 泡泡跟扭蛋圖鑑一樣，拿到第一個成就才出現（不擋首頁的婚紗照），出現時旁邊跳出一句介紹；
// 第一次打開成就清單時，上方先顯示「成就怎麼玩？」的說明
// 成就有哪些在 list.js，進度怎麼記在 progress.js；這裡只負責顯示

import { ACHIEVEMENTS, REDEEM_NOTE } from './list.js';
import { onUnlock, progressOf, isUnlocked, unlockedAt, isUnseen, unseenCount, totalPoints, markAllSeen } from './progress.js';
import { initBubble } from '../bubble.js';
import { lockScroll, unlockScroll, isScrollLocked } from '../scroll-lock.js';
import { seen, markSeen } from '../storage.js';
import { haptic, HAPTIC } from '../fx/haptics.js';
import { getAudio, bell, tone } from '../fx/sound.js';

const POP_MS = 3800;      // 通知停留多久
const POP_OUT_MS = 350;   // 與 CSS .ach-pop 收回的 transition 一致
const CLOSE_MS = 300;     // 與 CSS .ach 淡出的 transition 一致
const WELCOME_FIRST_MS = 1200;   // 拿到第一個成就後多久跳出介紹（先讓通知滑下來）
const WELCOME_BACK_MS = 4000;    // 以前就有成就的人：進入首頁後多久跳出介紹（先讓人看一下主視覺）
const WELCOME_MS = 7000;
const WELCOME_KEY = 'ach-welcome';
const INTRO_KEY = 'ach-intro';

// 完成成就的音效：往上爬的三聲鈴，最後一聲加一點亮音
function chime() {
  const a = getAudio();
  if (!a) return;
  [783.99, 1046.5, 1318.51].forEach((f, i) => bell(a, f, i * 0.09, 1.2, 0.07));
  tone(a, 2093, 0.27, 0.5, { gain: 0.03 });
}

// 獎章：圓形徽章，材質依 tier（銅、銀、金、彩虹），還沒完成的是灰色
function medal(a, { locked = false } = {}) {
  const el = document.createElement('span');
  el.className = `ach-medal ach-medal--${a.tier}`;
  el.classList.toggle('locked', locked);
  el.setAttribute('aria-hidden', 'true');
  const icon = document.createElement('span');
  icon.className = 'ach-medal-icon';
  icon.textContent = a.icon;
  el.append(icon);
  return el;
}

const text = (tag, className, content) => {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = content;
  return el;
};

const formatDate = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};

export function initAchievements() {
  const root = document.getElementById('ach');
  if (!root) return null;
  const $ = (id) => document.getElementById(id);
  const list = $('achList');
  const popLayer = $('achPopLayer');

  const isOpen = () => !root.hidden;

  // 預設在右下方：左下角是音樂播放器，左上角是扭蛋圖鑑的泡泡
  const bubble = initBubble({
    el: $('achBubble'),
    posKey: 'ach-bubble-position',
    defaultPos: { side: 'right', y: 0.72 },
    onTap: () => open(),
  });

  const hasAny = () => ACHIEVEMENTS.some(isUnlocked);
  const refreshBubble = () => {
    if (!bubble) return;
    const points = totalPoints();
    const fresh = unseenCount();
    bubble.setInfo({
      text: `${points} 分`,
      hasNew: fresh > 0,
      label: `開啟成就，目前 ${points} 分${fresh ? `，有 ${fresh} 個新完成的成就` : ''}`,
    });
    bubble.setVisible(hasAny());
  };
  refreshBubble();

  // ---------- 成就清單 ----------

  const row = (a) => {
    const done = isUnlocked(a);
    const li = document.createElement('li');
    li.className = 'ach-item';
    li.classList.toggle('done', done);

    const info = document.createElement('div');
    info.className = 'ach-info';
    const name = text('p', 'ach-name', a.name);
    if (isUnseen(a)) name.append(text('span', 'ach-new', 'NEW'));
    info.append(name, text('p', 'ach-desc', a.desc));

    if (done) {
      info.append(text('p', 'ach-status', `✓ ${formatDate(unlockedAt(a))} 完成`));
    } else if (a.goal > 1) {
      const now = Math.min(progressOf(a), a.goal);
      const meter = document.createElement('div');
      meter.className = 'ach-meter';
      const bar = document.createElement('span');
      bar.className = 'ach-meter-bar';
      const fill = document.createElement('span');
      fill.style.width = `${(now / a.goal) * 100}%`;
      bar.append(fill);
      meter.append(bar, text('span', 'ach-meter-count', `${now} / ${a.goal}`));
      info.append(meter);
    }

    li.append(medal(a, { locked: !done }), info, text('span', 'ach-pts', `${a.points} 分`));
    li.setAttribute('aria-label', `${a.name}：${a.desc}，${a.points} 分，${done ? '已完成' : '還沒完成'}`);
    return li;
  };

  const intro = $('achIntro');
  const showIntro = (show) => {
    intro.hidden = !show;
    $('achRedeemRow').hidden = show;
  };
  $('achIntroOk').addEventListener('click', () => {
    markSeen(INTRO_KEY);
    showIntro(false);
  });
  $('achHelp').addEventListener('click', () => showIntro(true));

  const render = () => {
    const done = ACHIEVEMENTS.filter(isUnlocked).length;
    showIntro(!seen(INTRO_KEY));
    $('achPoints').textContent = totalPoints();
    $('achDone').textContent = done;
    $('achTotal').textContent = ACHIEVEMENTS.length;
    $('achRedeem').textContent = REDEEM_NOTE;
    list.replaceChildren(...ACHIEVEMENTS.map(row));
  };

  function open() {
    if (isOpen()) return;
    render();
    root.hidden = false;
    lockScroll();
    requestAnimationFrame(() => root.classList.add('open'));
    $('achClose').focus({ preventScroll: true });
  }

  const close = () => {
    if (!isOpen() || !root.classList.contains('open')) return;
    // 關掉時才把 NEW 標記清掉：這次打開都還看得到哪些是新完成的
    markAllSeen();
    refreshBubble();
    root.classList.remove('open');
    unlockScroll();
    setTimeout(() => {
      if (!root.classList.contains('open')) root.hidden = true;
    }, CLOSE_MS);
  };

  $('achClose').addEventListener('click', close);
  root.addEventListener('click', (e) => {
    if (e.target === root) close();
  });
  // 成就清單可能疊在燈箱、扭蛋機、小遊戲上面（點通知打開的），要比它們先處理 Esc（main.js 先初始化這裡）
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !isOpen()) return;
    e.stopImmediatePropagation();
    close();
  });

  // ---------- 完成成就的通知：一次一個，排隊輪流滑下來 ----------

  const queue = [];
  let showing = false;

  const pop = (a) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'ach-pop';
    const body = document.createElement('span');
    body.className = 'ach-pop-text';
    body.append(
      text('span', 'ach-pop-eyebrow', '成就達成！'),
      text('span', 'ach-pop-name', a.name),
      text('span', 'ach-pop-desc', a.desc),
    );
    el.append(medal(a), body, text('span', 'ach-pop-pts', `+${a.points}`));
    el.setAttribute('aria-label', `成就達成：${a.name}，獲得 ${a.points} 分。點一下查看成就`);
    return el;
  };

  const showNext = () => {
    const a = queue.shift();
    if (!a) {
      showing = false;
      return;
    }
    showing = true;
    const el = pop(a);
    let timer = 0;
    const dismiss = () => {
      clearTimeout(timer);
      if (!el.classList.contains('show')) return;
      el.classList.remove('show');
      setTimeout(() => {
        el.remove();
        showNext();
      }, POP_OUT_MS);
    };
    el.addEventListener('click', () => {
      dismiss();
      open();
    });
    popLayer.append(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
    chime();
    haptic(HAPTIC.achievement);
    bubble?.gulp();
    timer = setTimeout(dismiss, POP_MS);
  };

  // 泡泡第一次出現時旁邊跳出介紹，只出現一次；已經點開過成就清單的人就不用了
  // 泡泡在扭蛋機、燈箱、小遊戲底下看不到（第一個成就常常是在扭蛋機裡拿到的），等回到首頁再說
  const introduce = (delay) => {
    if (seen(WELCOME_KEY) || seen(INTRO_KEY)) return;
    setTimeout(() => {
      if (seen(WELCOME_KEY) || seen(INTRO_KEY) || !hasAny()) return;
      if (isScrollLocked()) {
        introduce(WELCOME_FIRST_MS);
        return;
      }
      markSeen(WELCOME_KEY);
      bubble?.toast('這裡是成就！完成任務就能累積積分，婚禮當天可以兌換小禮物 🎁 點我看看所有成就', WELCOME_MS);
    }, delay);
  };

  // 進入首頁時呼叫：成就上線前就扭到照片、已經有成就的人，泡泡一進來就在，也介紹一次
  const welcome = () => introduce(WELCOME_BACK_MS);

  onUnlock((a, { quiet }) => {
    refreshBubble();
    if (isOpen()) render();
    if (quiet) return;
    queue.push(a);
    if (!showing) showNext();
    introduce(WELCOME_FIRST_MS);
  });

  return { open, welcome };
}
