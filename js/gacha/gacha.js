// 聖誕扭蛋機：點月曆上的 🎄 開啟 → 按扭蛋機（旋鈕或機身都可以）掉出一顆扭蛋 → 點擊（手機也可以搖一搖）打開
// → 用滑鼠左鍵或手指刮掉照片上的銀漆 → 刮開一半就恭喜獲得照片，可以儲存、再扭一次或退出
// 扭到的照片收進扭蛋圖鑑（collection.js），按「再扭一次／退出」前會先看到照片飛進圖鑑的泡泡
// 每次隨機挑一張，可能重複；還沒收集到的照片比較容易抽到（config.js 的 LOTTERY_NEW_WEIGHT）
// 扭到麻吉的照片（檔名有「麻吉」）時多一顆「帶麻吉去公園」，開啟小遊戲（js/maji-walk/）
// 扭到令狗的照片（檔名有「令狗」）時多一顆「跟令狗一起收集紅蘿蔔」（js/linggou-skate/）；兩個名字都有就兩顆都出現
// 手機上每個步驟都有對應的震動；隨時可以按右上角 ✕、Esc 結束
// 操作提示：第一次玩時直接用手指動畫示範要點哪裡、怎麼刮；做過一次之後，只有停著不動幾秒才再提示

import { initScratch } from './scratch.js';
import { spinSound, popSound, scratchSound, fanfare, openBurst, celebrate } from './effects.js';
import { haptic, HAPTIC, tapHaptic } from '../fx/haptics.js';
import { isTouch } from '../device.js';
import { seen, markSeen } from '../storage.js';
import { lockScroll, unlockScroll } from '../scroll-lock.js';
import { preloadPhoto, savePhoto } from '../save-photo.js';
import { openMajiWalk, isMajiPhoto } from '../maji-walk/launch.js';
import { openLinggouSkate, isLinggouPhoto } from '../linggou-skate/launch.js';
import { increment } from '../achievements/progress.js';

const SPIN_MS = 1100;        // 轉把手、機器晃動，與 CSS .spinning 的動畫一致
const DROP_MS = 1500;        // 扭蛋從出口掉出、彈一下、移到畫面中央
const DROP_LAND = 0.18;      // 掉落動畫中落地與彈跳的時間點（比例）
const DROP_BOUNCE = 0.36;
const OPEN_MS = 700;         // 扭蛋打開到出現照片卡，與 CSS .opening 的動畫一致
const CLOSE_MS = 350;        // 與 CSS .gacha 淡出的 transition 一致
const CARD_FILL = 0.94;      // 照片卡最多佔中間區域的比例
const SCRATCH_HAPTIC_MS = 70; // 刮銀漆時震動的間隔

// 操作提示：第一次玩時稍等一下就出現；做過那個動作之後，要停著不動這麼久才再提示
const COACH_FIRST_MS = 700;
const COACH_IDLE_MS = 4000;

// 搖手機：連續幾次夠大的加速度變化，而且間隔夠短，才算搖一搖
const SHAKE_DELTA = 18;
const SHAKE_HITS = 3;
const SHAKE_GAP_MS = 400;

const CAPSULE_COLORS = ['#d9534f', '#e7b74f', '#7fa37a', '#deb6ab', '#8fb3c9', '#b35d50'];

// 球罩裡堆著的小扭蛋：球罩內的中心位置（em），由下往上堆
const DOME_BALLS = [
  [2.6, 7.0], [4.5, 7.2], [6.4, 7.0],
  [1.5, 5.4], [3.5, 5.5], [5.5, 5.4], [7.5, 5.5],
  [2.4, 3.8], [4.4, 3.7], [6.4, 3.9],
  [3.5, 2.2], [5.5, 2.3],
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const centerOf = (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, width: r.width, height: r.height };
};

function fillDome(dome) {
  DOME_BALLS.forEach(([x, y], i) => {
    const ball = document.createElement('span');
    ball.className = 'gm-ball';
    ball.style.left = `${x - 1}em`;
    ball.style.top = `${y - 1}em`;
    ball.style.rotate = `${Math.round(Math.random() * 360)}deg`;
    ball.style.setProperty('--c', CAPSULE_COLORS[i % CAPSULE_COLORS.length]);
    ball.style.setProperty('--i', i);
    dome.append(ball);
  });
}

// iOS 13 以後要在點擊當下詢問，才收得到搖晃的感測資料；拒絕也沒關係，還是可以點擊打開
function askMotionPermission() {
  const request = window.DeviceMotionEvent?.requestPermission;
  if (typeof request === 'function') request.call(DeviceMotionEvent).catch(() => {});
}

function listenShake(onShake) {
  let prev = null;
  let hits = 0;
  let lastHit = 0;
  const handler = (e) => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null) return;
    if (prev) {
      const delta = Math.abs(a.x - prev.x) + Math.abs(a.y - prev.y) + Math.abs(a.z - prev.z);
      const now = performance.now();
      if (delta > SHAKE_DELTA) {
        hits = now - lastHit < SHAKE_GAP_MS ? hits + 1 : 1;
        lastHit = now;
        if (hits >= SHAKE_HITS) onShake();
      }
    }
    prev = { x: a.x, y: a.y, z: a.z };
  };
  window.addEventListener('devicemotion', handler);
  return () => window.removeEventListener('devicemotion', handler);
}

// 依權重抽一張：還沒收集到的照片權重是 newWeight，收集過的是 1
function pickPrize(photos, collection, newWeight) {
  const weights = photos.map((p) => (collection?.has(p) ? 1 : newWeight));
  let r = Math.random() * weights.reduce((sum, w) => sum + w, 0);
  for (let i = 0; i < photos.length; i++) {
    r -= weights[i];
    if (r < 0) return photos[i];
  }
  return photos[photos.length - 1];
}

export function initGacha({ trigger, photos, collection, newWeight = 1 }) {
  const root = document.getElementById('gacha');
  if (!root || !trigger || !photos.length) return;

  const $ = (id) => document.getElementById(id);
  const eyebrow = $('gachaEyebrow');
  const title = $('gachaTitle');
  const hint = $('gachaHint');
  const arena = $('gachaArena');
  const machine = $('gachaMachine');
  const chute = $('gachaChute');
  const capsule = $('gachaCapsule');
  const card = $('gachaCard');
  const photo = $('gachaPhoto');
  const knob = $('gachaKnob');
  const saveBtn = $('gachaSave');
  const walkBtn = $('gachaWalk');
  const skateBtn = $('gachaSkate');
  const againBtn = $('gachaAgain');
  const exitBtn = $('gachaExit');
  const badge = $('gachaBadge');
  const coach = $('gachaCoach');
  const coachLabel = $('gachaCoachLabel');

  fillDome($('gachaDome'));
  // 「刮刮樂」字樣畫在畫布上，先載好中文字型，畫出來才不會是系統字
  document.fonts?.load("600 40px 'Noto Serif TC'", '刮刮樂').catch(() => {});

  let state = 'closed';
  let prize = null;
  let photoReady = null;
  let stopShake = null;
  let run = 0;   // 每次重來或關閉就加一，舊流程的非同步步驟看到不一致就停下

  // 每個步驟要提示的地方：key 是「做過這個動作」的紀錄
  const COACH = {
    machine: { key: 'gacha-spin', target: () => knob, mode: 'tap', label: '點這裡轉一轉' },
    dropped: { key: 'gacha-open', target: () => capsule, mode: 'tap', label: isTouch() ? '點一下或搖一搖' : '點一下打開' },
    scratch: { key: 'gacha-scratch', target: () => card, mode: 'scratch', label: '來回刮開銀漆' },
  };
  let coachTimer = 0;

  const hideCoach = () => {
    clearTimeout(coachTimer);
    coach.classList.remove('show');
  };

  // 手指提示放在目標中央（座標相對於中間區域）
  const showCoach = (step) => {
    const a = arena.getBoundingClientRect();
    const t = step.target().getBoundingClientRect();
    coach.style.left = `${t.left - a.left + t.width / 2}px`;
    coach.style.top = `${t.top - a.top + t.height / 2}px`;
    coach.style.setProperty('--w', `${t.width}px`);
    coach.style.setProperty('--h', `${t.height}px`);
    coach.dataset.mode = step.mode;
    coachLabel.textContent = step.label;
    coach.classList.add('show');
  };

  // 換到新步驟時重新計時；使用者有任何操作就重新計時（nudge）
  const scheduleCoach = () => {
    hideCoach();
    const step = COACH[state];
    if (!step || (state === 'scratch' && scratching)) return;
    const current = run;
    coachTimer = setTimeout(() => {
      if (current === run && COACH[state] === step) showCoach(step);
    }, seen(step.key) ? COACH_IDLE_MS : COACH_FIRST_MS);
  };

  const render = () => {
    root.dataset.state = state;
    const won = state === 'won' || state === 'collecting';
    eyebrow.textContent = won ? 'CONGRATULATIONS' : 'MERRY CHRISTMAS';
    if (won) {
      const name = document.createElement('span');
      name.className = 'gacha-prize-name';
      name.textContent = prize.name;
      // 「一張！」不拆行，檔名太長時從檔名中間換行
      const tail = document.createElement('span');
      tail.className = 'gacha-nowrap';
      tail.textContent = ' 一張！';
      title.replaceChildren('恭喜你/妳獲得 ', name, tail);
    } else {
      title.textContent = state === 'scratch' ? '刮刮樂' : '聖誕扭蛋機';
    }
    hint.textContent = {
      machine: '點一下金色旋鈕，轉出一顆扭蛋',
      spinning: '轉呀轉⋯⋯',
      dropped: isTouch() ? '點一下扭蛋，或搖一搖手機打開它' : '點一下扭蛋打開它',
      opening: '打開中⋯⋯',
      scratch: isTouch() ? '用手指刮開銀漆' : '按住滑鼠左鍵，刮開銀漆',
      won: prize?.downloadable
        ? (isTouch() ? '也可以長按照片直接儲存' : '')
        : '這張是珍藏版，只能在這裡欣賞喔',
      collecting: prize?.isNew ? '收進扭蛋圖鑑囉！' : '這張已經收藏過囉',
    }[state] ?? '';
    knob.disabled = state !== 'machine';
    [againBtn, exitBtn].forEach((btn) => { btn.hidden = state !== 'won'; });
    saveBtn.hidden = state !== 'won' || !prize.downloadable;
    walkBtn.hidden = state !== 'won' || !isMajiPhoto(prize);
    skateBtn.hidden = state !== 'won' || !isLinggouPhoto(prize);
    card.classList.toggle('view-only', !prize?.downloadable);
    badge.textContent = prize?.isNew ? 'NEW!' : '已收藏';
    badge.classList.toggle('owned', !prize?.isNew);
  };

  const setState = (next) => {
    state = next;
    render();
    scheduleCoach();
  };

  const fitCard = () => {
    if (card.hidden) return;
    const ratio = photo.naturalWidth && photo.naturalHeight ? photo.naturalWidth / photo.naturalHeight : 3 / 4;
    let w = arena.clientWidth * CARD_FILL;
    let h = w / ratio;
    if (h > arena.clientHeight * CARD_FILL) {
      h = arena.clientHeight * CARD_FILL;
      w = h * ratio;
    }
    card.style.width = `${Math.round(w)}px`;
    card.style.height = `${Math.round(h)}px`;
  };
  new ResizeObserver(fitCard).observe(arena);

  let scratching = false;
  let lastScratchHaptic = 0;
  const scratch = initScratch($('gachaScratch'), {
    onScratch: () => {
      scratchSound();
      if (!scratching) {
        scratching = true;
        markSeen(COACH.scratch.key);
        hideCoach();
      }
      const now = performance.now();
      if (now - lastScratchHaptic > SCRATCH_HAPTIC_MS) {
        lastScratchHaptic = now;
        haptic(HAPTIC.tick);
      }
    },
    onDone: () => {
      if (state !== 'scratch') return;
      prize.isNew = collection ? collection.add(prize) : false;
      setState('won');
      fanfare();
      haptic(HAPTIC.success);
      const c = centerOf(card);
      celebrate(root, c.x, c.y);
      (prize.downloadable ? saveBtn : againBtn).focus({ preventScroll: true });
    },
  });

  const toMachine = () => {
    run++;
    stopShake?.();
    stopShake = null;
    machine.classList.remove('spinning', 'away');
    capsule.getAnimations().forEach((a) => a.cancel());
    capsule.classList.remove('opening');
    capsule.hidden = true;
    card.hidden = true;
    card.classList.remove('stashed');
    setState('machine');
  };

  // 刮完的照片先飛進扭蛋圖鑑，才進行下一步（再扭一次、退出）
  const stash = async () => {
    if (state !== 'won') return;
    setState('collecting');
    await collection?.stash(card, prize.src, prize.isNew);
  };

  // 扭蛋從出口掉出、彈一下，再放大移到畫面中央；同時扭蛋機淡出
  const dropCapsule = (current) => {
    capsule.style.setProperty('--c', pick(CAPSULE_COLORS));
    capsule.hidden = false;
    const from = centerOf(chute);
    const to = centerOf(capsule);
    const dx = from.x - to.x;
    const dy = from.y + from.height * 0.1 - to.y;
    const s = (from.width * 0.75) / to.width;
    const at = (y) => `translate(${dx}px, ${dy + y}px) scale(${s})`;
    setTimeout(() => {
      if (current === run) machine.classList.add('away');
    }, DROP_MS * 0.45);
    return capsule.animate([
      { transform: at(-30), opacity: 0 },
      { transform: at(0), opacity: 1, offset: DROP_LAND, easing: 'ease-out' },
      { transform: at(-16), offset: (DROP_LAND + DROP_BOUNCE) / 2, easing: 'ease-in' },
      { transform: at(0), offset: DROP_BOUNCE },
      { transform: at(0), offset: 0.48, easing: 'cubic-bezier(0.3, 0, 0.2, 1)' },
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    ], { duration: DROP_MS, fill: 'both' }).finished;
  };

  const spin = async () => {
    if (state !== 'machine') return;
    const current = run;
    markSeen(COACH.machine.key);
    setState('spinning');
    increment('gachaSpins');

    prize = { ...pickPrize(photos, collection, newWeight), isNew: false };
    photo.src = prize.src;
    photo.alt = prize.name;
    photoReady = photo.decode().catch(() => {});
    if (prize.downloadable) preloadPhoto(prize.src);

    const landAt = SPIN_MS + DROP_MS * DROP_LAND;
    const bounceAt = SPIN_MS + DROP_MS * DROP_BOUNCE;
    spinSound(landAt / 1000, bounceAt / 1000);
    haptic(HAPTIC.ratchet);
    setTimeout(() => current === run && haptic(HAPTIC.thud), landAt);
    setTimeout(() => current === run && haptic(HAPTIC.bounce), bounceAt);
    machine.classList.add('spinning');
    await wait(SPIN_MS);
    if (current !== run) return;
    machine.classList.remove('spinning');

    await dropCapsule(current).catch(() => {});
    if (current !== run) return;
    setState('dropped');
    capsule.focus({ preventScroll: true });
    stopShake = listenShake(openCapsule);
  };

  async function openCapsule() {
    if (state !== 'dropped') return;
    const current = run;
    stopShake?.();
    stopShake = null;
    markSeen(COACH.dropped.key);
    setState('opening');
    popSound();
    haptic(HAPTIC.pop);
    capsule.classList.add('opening');
    const c = centerOf(capsule);
    openBurst(root, c.x, c.y);

    await Promise.all([wait(OPEN_MS), photoReady]);
    if (current !== run) return;
    capsule.hidden = true;
    card.hidden = false;
    fitCard();
    scratch.reset();
    scratching = false;
    setState('scratch');
  }

  const open = () => {
    if (state !== 'closed') return;
    askMotionPermission();
    toMachine();
    root.hidden = false;
    lockScroll();
    collection?.setGachaOpen(true);
    requestAnimationFrame(() => root.classList.add('open'));
    knob.focus({ preventScroll: true });
  };

  const close = async () => {
    if (state === 'closed' || state === 'collecting') return;
    await stash();
    toMachine();
    hideCoach();
    state = 'closed';
    root.classList.remove('open');
    unlockScroll();
    collection?.setGachaOpen(false);
    setTimeout(() => {
      if (state === 'closed') root.hidden = true;
    }, CLOSE_MS);
    trigger.focus({ preventScroll: true });
  };

  trigger.addEventListener('click', open);
  // 整台扭蛋機都可以點，不必剛好點中旋鈕；旋鈕本身是按鈕，鍵盤也按得到
  machine.addEventListener('click', spin);
  capsule.addEventListener('click', openCapsule);
  // iPhone 點扭蛋機、扭蛋時喀一下（只有能點的時候，見 gacha.css）
  tapHaptic(machine);
  tapHaptic(capsule);
  saveBtn.addEventListener('click', () => {
    if (prize?.downloadable) savePhoto(prize);
  });
  walkBtn.addEventListener('click', openMajiWalk);
  tapHaptic(walkBtn);
  skateBtn.addEventListener('click', openLinggouSkate);
  tapHaptic(skateBtn);
  // 只能欣賞的照片：擋掉右鍵另存與長按選單
  photo.addEventListener('contextmenu', (e) => {
    if (!prize?.downloadable) e.preventDefault();
  });
  againBtn.addEventListener('click', async () => {
    if (state !== 'won') return;
    await stash();
    toMachine();
    knob.focus({ preventScroll: true });
  });
  exitBtn.addEventListener('click', close);
  $('gachaClose').addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state !== 'closed') close();
  });
  // 停著不動才提示：在扭蛋機上有任何觸碰就重新計時
  root.addEventListener('pointerdown', () => {
    if (COACH[state]) scheduleCoach();
  });

  return { open };
}
