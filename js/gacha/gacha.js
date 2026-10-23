// 聖誕扭蛋機：點月曆上的 🎄 開啟 → 按扭蛋機的旋鈕掉出一顆扭蛋 → 點擊（手機也可以搖一搖）打開
// → 用滑鼠左鍵或手指刮掉照片上的銀漆 → 差不多刮乾淨就恭喜獲得照片，可以儲存、再扭一次或退出
// 每次從照片清單完全隨機挑一張，可能重複；隨時可以按右上角 ✕、Esc 結束

import { initScratch } from './scratch.js';
import { spinSound, popSound, scratchSound, fanfare, openBurst, celebrate } from './effects.js';

const SPIN_MS = 1100;        // 轉把手、機器晃動，與 CSS .spinning 的動畫一致
const DROP_MS = 1500;        // 扭蛋從出口掉出、彈一下、移到畫面中央
const DROP_LAND = 0.18;      // 掉落動畫中落地與彈跳的時間點（比例）
const DROP_BOUNCE = 0.36;
const OPEN_MS = 700;         // 扭蛋打開到出現照片卡，與 CSS .opening 的動畫一致
const CLOSE_MS = 350;        // 與 CSS .gacha 淡出的 transition 一致
const CARD_FILL = 0.94;      // 照片卡最多佔中間區域的比例

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

const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isTouch = () => window.matchMedia('(pointer: coarse)').matches;
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

// 儲存照片：iPhone 用分享選單（可以直接「儲存影像」到相簿），其他裝置直接下載原檔
function savePhoto(prize) {
  if (IS_IOS && prize.blob) {
    const file = new File([prize.blob], prize.file, { type: prize.blob.type || 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) {
      navigator.share({ files: [file] }).catch(() => {});
      return;
    }
  }
  if (IS_IOS) {
    // LINE 等內建瀏覽器不支援分享檔案：另開照片，長按即可儲存
    window.open(prize.src, '_blank');
    return;
  }
  const link = document.createElement('a');
  link.href = prize.src;
  link.download = prize.file;
  document.body.append(link);
  link.click();
  link.remove();
}

export function initGacha({ trigger, photos }) {
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
  const againBtn = $('gachaAgain');
  const exitBtn = $('gachaExit');

  fillDome($('gachaDome'));
  // 「刮刮樂」字樣畫在畫布上，先載好中文字型，畫出來才不會是系統字
  document.fonts?.load("600 40px 'Noto Serif TC'", '刮刮樂').catch(() => {});

  let state = 'closed';
  let prize = null;
  let photoReady = null;
  let stopShake = null;
  let run = 0;   // 每次重來或關閉就加一，舊流程的非同步步驟看到不一致就停下

  const render = () => {
    root.dataset.state = state;
    const won = state === 'won';
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
      machine: '轉動扭蛋機的旋鈕，看看會掉出什麼',
      spinning: '轉呀轉⋯⋯',
      dropped: isTouch() ? '點一下扭蛋，或搖一搖手機打開它' : '點一下扭蛋打開它',
      opening: '打開中⋯⋯',
      scratch: isTouch() ? '用手指把銀漆刮乾淨' : '按住滑鼠左鍵，把銀漆刮乾淨',
      won: prize?.downloadable
        ? (isTouch() ? '也可以長按照片直接儲存' : '')
        : '這張是珍藏版，只能在這裡欣賞喔',
    }[state] ?? '';
    knob.disabled = state !== 'machine';
    [againBtn, exitBtn].forEach((btn) => { btn.hidden = !won; });
    saveBtn.hidden = !won || !prize.downloadable;
    card.classList.toggle('view-only', !prize?.downloadable);
  };

  const setState = (next) => {
    state = next;
    render();
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

  const scratch = initScratch($('gachaScratch'), {
    onScratch: scratchSound,
    onDone: () => {
      if (state !== 'scratch') return;
      setState('won');
      fanfare();
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
    setState('machine');
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
    setState('spinning');

    prize = { ...pick(photos), blob: null };
    photo.src = prize.src;
    photo.alt = prize.name;
    photoReady = photo.decode().catch(() => {});
    // iPhone 的分享選單要在點擊當下就拿到檔案，所以先在背景載好
    if (prize.downloadable && IS_IOS && navigator.canShare) {
      const target = prize;
      fetch(target.src).then((r) => (r.ok ? r.blob() : null)).then((blob) => { target.blob = blob; }).catch(() => {});
    }

    spinSound((SPIN_MS + DROP_MS * DROP_LAND) / 1000, (SPIN_MS + DROP_MS * DROP_BOUNCE) / 1000);
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
    setState('opening');
    popSound();
    capsule.classList.add('opening');
    const c = centerOf(capsule);
    openBurst(root, c.x, c.y);

    await Promise.all([wait(OPEN_MS), photoReady]);
    if (current !== run) return;
    capsule.hidden = true;
    card.hidden = false;
    fitCard();
    scratch.reset();
    setState('scratch');
  }

  const open = () => {
    askMotionPermission();
    toMachine();
    root.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => root.classList.add('open'));
    knob.focus({ preventScroll: true });
  };

  const close = () => {
    if (state === 'closed') return;
    toMachine();
    state = 'closed';
    root.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (state === 'closed') root.hidden = true;
    }, CLOSE_MS);
    trigger.focus({ preventScroll: true });
  };

  trigger.addEventListener('click', open);
  knob.addEventListener('click', spin);
  capsule.addEventListener('click', openCapsule);
  saveBtn.addEventListener('click', () => {
    if (prize?.downloadable) savePhoto(prize);
  });
  // 只能欣賞的照片：擋掉右鍵另存與長按選單
  photo.addEventListener('contextmenu', (e) => {
    if (!prize?.downloadable) e.preventDefault();
  });
  againBtn.addEventListener('click', () => {
    toMachine();
    knob.focus({ preventScroll: true });
  });
  exitBtn.addEventListener('click', close);
  $('gachaClose').addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state !== 'closed') close();
  });
}
