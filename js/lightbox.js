// 全螢幕看照片的燈箱：婚紗剪影與扭蛋圖鑑共用
// 手指按著照片左右拖，下一張跟著從旁邊滑進來、目前這張縮小淡出；放開時依拖的距離與速度決定切換或彈回
// 上下拖曳照片可以關閉（像手機相簿）；也可以用 ‹ › 按鈕、鍵盤方向鍵切換，按 ✕、Esc 或點背景關閉
// 照片設定 download（檔名）時，下方多一顆「儲存照片」按鈕；設定 actions 時再多幾顆自訂按鈕（例如帶麻吉去公園）
// 照片設定 onShow 時，每次切到這張都會呼叫（婚紗剪影用來記錄看過哪幾張）
// 第一次打開時疊一層操作提示，開始滑動或幾秒後自動消失；只出現這一次，之後想慢慢欣賞照片也不會再被打擾

import { lockScroll, unlockScroll } from './scroll-lock.js';
import { seen, markSeen } from './storage.js';
import { haptic, HAPTIC, tapHaptic } from './fx/haptics.js';
import { isTouch } from './device.js';
import { preloadPhoto, savePhoto } from './save-photo.js';

const GAP_PX = 24;            // 相鄰兩張照片之間的間距
const DRAG_START_PX = 8;      // 移動超過這個距離才算拖曳，以下當作點擊
const SWITCH_RATIO = 0.2;     // 拖超過畫面寬度的這個比例就切換
const FLICK_SPEED = 0.4;      // 或是放開時的速度超過這個值（px/ms），輕輕一撥也會切換
const DISMISS_RATIO = 0.14;   // 上下拖超過畫面高度的這個比例就關閉
const EDGE_RESIST = 0.3;      // 只有一張照片時左右拖的阻力
const FADE_TO = 0.3;          // 滑走的照片最後的透明度
const SHRINK_TO = 0.88;       // 滑走的照片最後的大小
const SETTLE_MS = 340;        // 與 CSS .lightbox.settling 的 transition 一致
const CLOSE_MS = 240;         // 與 CSS .lightbox.closing 的動畫一致
const VELOCITY_WINDOW_MS = 90;
const COACH_MS = 5200;
const COACH_KEY = 'lightbox-swipe';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createSlide(watermark) {
  const el = document.createElement('div');
  el.className = 'lightbox-slide';
  const frame = document.createElement('div');
  frame.className = 'lightbox-frame';
  const img = document.createElement('img');
  img.draggable = false;
  img.decoding = 'async';
  img.addEventListener('load', () => img.classList.remove('loading'));
  frame.append(img);
  if (watermark) frame.append(watermark());
  el.append(frame);
  return { el, img, src: '' };
}

// watermark：產生浮水印元素的函式；照片設定 watermark: false 時隱藏
export function initLightbox({ watermark } = {}) {
  const lightbox = document.getElementById('lightbox');
  const track = document.getElementById('lightboxTrack');
  const counter = document.getElementById('lightboxCounter');
  const caption = document.getElementById('lightboxCaption');
  const coach = document.getElementById('lightboxCoach');
  const saveBtn = document.getElementById('lightboxSave');
  const actionsEl = document.getElementById('lightboxActions');
  if (!lightbox || !track) return null;

  // 三張輪流使用：[上一張, 目前這張, 下一張]
  const slides = [0, 1, 2].map(() => createSlide(watermark));
  track.append(...slides.map((s) => s.el));

  let items = [];
  let index = 0;
  let width = window.innerWidth;
  let height = window.innerHeight;
  let busy = false;
  let closing = false;
  let drag = null;
  let justDragged = false;
  let coachTimer = 0;

  const isOpen = () => lightbox.classList.contains('open');
  const wrap = (i) => (i + items.length) % items.length;

  const fill = (slide, i) => {
    const item = items[wrap(i)];
    slide.img.alt = item.alt ?? '';
    if (slide.src === item.src) return;
    slide.src = item.src;
    // 新照片載入前先隱藏，快速連續滑動時不會先閃過上一張的舊圖
    slide.img.classList.add('loading');
    slide.img.src = item.src;
    if (slide.img.complete) slide.img.classList.remove('loading');
  };

  const fillAll = () => [-1, 0, 1].forEach((offset, k) => fill(slides[k], index + offset));

  // 依拖曳位移擺放三張照片：dx 左右切換、dy 上下關閉
  const layout = (dx = 0, dy = 0) => {
    const span = width + GAP_PX;
    slides.forEach((slide, k) => {
      const x = (k - 1) * span + dx;
      const away = Math.min(Math.abs(x) / span, 1);
      let scale = 1 - (1 - SHRINK_TO) * away;
      const y = k === 1 ? dy : 0;
      if (y) scale *= 1 - Math.min(Math.abs(y) / height, 1) * 0.35;
      slide.el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
      slide.el.style.opacity = 1 - (1 - FADE_TO) * away;
    });
    const dim = 1 - Math.min(Math.abs(dy) / (height * 0.45), 1) * 0.85;
    lightbox.style.backgroundColor = `rgba(0, 0, 0, ${(0.92 * dim).toFixed(3)})`;
  };

  // 有 transition 地移到指定位置
  const settle = async (dx, dy) => {
    lightbox.classList.add('settling');
    layout(dx, dy);
    await wait(SETTLE_MS);
    lightbox.classList.remove('settling');
  };

  const update = () => {
    const item = items[index];
    if (counter) counter.textContent = items.length > 1 ? `${index + 1} / ${items.length}` : '';
    if (caption) {
      caption.replaceChildren();
      if (item.caption) {
        const name = document.createElement('span');
        name.className = 'lightbox-caption-name';
        name.textContent = item.caption;
        caption.append(name);
      }
      if (item.note) {
        const note = document.createElement('span');
        note.className = 'lightbox-caption-note';
        note.textContent = item.note;
        caption.append(note);
      }
    }
    lightbox.classList.toggle('lightbox--protect', item.protect !== false);
    lightbox.classList.toggle('lightbox--plain', item.watermark === false);
    lightbox.classList.toggle('lightbox--single', items.length < 2);
    lightbox.classList.toggle('lightbox--save', Boolean(item.download));
    if (saveBtn) saveBtn.hidden = !item.download;
    if (item.download) preloadPhoto(item.src);
    actionsEl?.replaceChildren(...(item.actions ?? []).map(({ label, run, tone }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = tone ? `lightbox-action lightbox-action--${tone}` : 'lightbox-action';
      btn.textContent = label;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        run();
      });
      tapHaptic(btn);
      return btn;
    }));
    item.onShow?.();
  };

  const hideCoach = () => {
    clearTimeout(coachTimer);
    coach?.classList.remove('show');
  };

  const showCoach = () => {
    if (!coach || items.length < 2 || seen(COACH_KEY)) return;
    coach.querySelector('[data-touch]').hidden = !isTouch();
    coach.querySelector('[data-mouse]').hidden = isTouch();
    coach.classList.add('show');
    markSeen(COACH_KEY);
    coachTimer = setTimeout(hideCoach, COACH_MS);
  };

  // 往左（dir = 1）或往右（dir = -1）切換一張
  const go = async (dir) => {
    if (busy || items.length < 2) return;
    busy = true;
    hideCoach();
    haptic(HAPTIC.tick);
    await settle(-dir * (width + GAP_PX), 0);
    // 滑出畫面的那張移到另一邊，換成新的下一張（或上一張）
    if (dir > 0) slides.push(slides.shift());
    else slides.unshift(slides.pop());
    index = wrap(index + dir);
    fill(dir > 0 ? slides[2] : slides[0], index + dir);
    layout();
    update();
    busy = false;
  };

  // items：[{ src, alt, caption?, note?, protect?, watermark?, download?, actions?, onShow? }]
  // protect 預設 true：擋掉右鍵另存與長按選單；watermark: false 不顯示浮水印；download：儲存時的檔名
  // actions：[{ label, run, tone? }]，照片下方多幾顆按鈕，按下時呼叫 run；tone: 'carrot' 是紅蘿蔔橘色
  const open = (list, i = 0) => {
    if (!list.length) return;
    items = list;
    index = wrap(i);
    width = window.innerWidth;
    height = window.innerHeight;
    closing = false;
    fillAll();
    layout();
    update();
    if (!isOpen()) lockScroll();
    lightbox.classList.add('open');
    coachTimer = setTimeout(showCoach, 450);
  };

  // dy：上下拖曳關閉時，照片順著原本的方向繼續飛走
  const close = async (dy = 0) => {
    if (!isOpen() || closing) return;
    closing = true;
    busy = true;
    hideCoach();
    if (dy) {
      lightbox.classList.add('settling');
      layout(0, Math.sign(dy) * height * 0.6);
    }
    lightbox.classList.add('closing');
    await wait(CLOSE_MS);
    lightbox.classList.remove('open', 'closing', 'settling', 'dragging');
    lightbox.style.backgroundColor = '';
    unlockScroll();
    busy = false;
  };

  const bind = (id, fn) => document.getElementById(id)?.addEventListener('click', (e) => {
    e.stopPropagation();
    fn();
  });
  bind('lightboxClose', () => close());
  bind('lightboxPrev', () => go(-1));
  bind('lightboxNext', () => go(1));
  bind('lightboxSave', () => {
    const item = items[index];
    if (item?.download) savePhoto({ src: item.src, file: item.download });
  });
  // iPhone 點左右鍵時喀一下（手指拖曳切換在 iPhone 上沒有觸覺回饋）
  ['lightboxPrev', 'lightboxNext'].forEach((id) => tapHaptic(document.getElementById(id)));

  // 點照片本身不關閉，點背景才關閉；剛拖曳完放開的那一下不算點擊
  lightbox.addEventListener('click', (e) => {
    if (justDragged || busy) return;
    if (!e.target.closest('.lightbox-frame')) close();
  });

  lightbox.addEventListener('contextmenu', (e) => {
    if (items[index]?.protect !== false) e.preventDefault();
  });

  // 燈箱在最上層，處理過的按鍵不再交給底下的扭蛋圖鑑、扭蛋機
  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    const actions = { Escape: () => close(), ArrowLeft: () => go(-1), ArrowRight: () => go(1) };
    if (!actions[e.key]) return;
    e.stopImmediatePropagation();
    actions[e.key]();
  });

  lightbox.addEventListener('pointerdown', (e) => {
    justDragged = false;
    if (busy || drag || e.target.closest('.lightbox-btn, .lightbox-save, .lightbox-action')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, axis: null, dx: 0, dy: 0, samples: [] };
  });

  lightbox.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.axis) {
      if (Math.hypot(dx, dy) < DRAG_START_PX) return;
      // 一開始往哪個方向動就鎖定那個方向：左右是切換，上下是關閉
      drag.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      try {
        lightbox.setPointerCapture(e.pointerId);
      } catch {
        // 指標已經放開就抓不到，照樣處理這次拖曳
      }
      lightbox.classList.add('dragging');
      hideCoach();
    }
    const now = performance.now();
    drag.samples.push({ x: e.clientX, y: e.clientY, t: now });
    while (drag.samples.length > 2 && now - drag.samples[0].t > VELOCITY_WINDOW_MS) drag.samples.shift();
    drag.dx = dx;
    drag.dy = dy;
    if (drag.axis === 'x') layout(items.length < 2 ? dx * EDGE_RESIST : dx, 0);
    else layout(0, dy);
  });

  const release = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { axis, dx, dy, samples } = drag;
    drag = null;
    if (!axis) return;
    justDragged = true;
    lightbox.classList.remove('dragging');

    const first = samples[0];
    const last = samples[samples.length - 1];
    const dt = first && last && last.t > first.t ? last.t - first.t : 0;
    const vx = dt ? (last.x - first.x) / dt : 0;
    const vy = dt ? (last.y - first.y) / dt : 0;

    if (axis === 'x') {
      const far = Math.abs(dx) > width * SWITCH_RATIO;
      const flick = Math.abs(vx) > FLICK_SPEED && Math.sign(vx) === Math.sign(dx);
      if (items.length > 1 && (far || flick)) go(dx < 0 ? 1 : -1);
      else settle(0, 0);
    } else {
      const far = Math.abs(dy) > height * DISMISS_RATIO;
      const flick = Math.abs(vy) > FLICK_SPEED && Math.sign(vy) === Math.sign(dy);
      if (far || flick) close(dy);
      else settle(0, 0);
    }
  };
  ['pointerup', 'pointercancel'].forEach((type) => lightbox.addEventListener(type, release));

  window.addEventListener('resize', () => {
    if (!isOpen()) return;
    width = window.innerWidth;
    height = window.innerHeight;
    layout();
  });

  return { open, close, isOpen };
}
