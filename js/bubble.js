// 浮動泡泡：像舊 iPhone 的「輔助觸控」小圓鈕，扭蛋圖鑑（gacha/collection.js）與成就（achievements/ui.js）共用
// 可以拖到畫面任何地方，放開後貼齊最近的左右邊緣並記住位置；一陣子沒碰就變半透明，不擋畫面
// 中間一行小字（例如收集進度 3/23），有還沒看過的新東西時右上角亮紅點；點一下開啟對應的清單
// 泡泡裡要有 .bubble-icon、.bubble-count、.bubble-toast（見 index.html），樣式在 css/bubble.css

import { load, save } from './storage.js';

const EDGE_PX = 10;           // 貼齊邊緣時留的距離
const DRAG_START_PX = 6;      // 移動超過這個距離才算拖曳，以下當作點擊
const IDLE_MS = 3000;         // 多久沒碰就變半透明
const SNAP_MS = 300;          // 與 CSS .float-bubble.snapping 的 transition 一致

// 量出瀏海、底部橫條佔掉的高度，泡泡不要躲到那底下
function safeInsets() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)';
  document.body.append(probe);
  const style = getComputedStyle(probe);
  const insets = { top: parseFloat(style.paddingTop) || 0, bottom: parseFloat(style.paddingBottom) || 0 };
  probe.remove();
  return insets;
}

// posKey：記住位置用的名稱；defaultPos：{ side: 'left' | 'right', y: 0～1（可移動範圍由上到下的比例） }
export function initBubble({ el, posKey, defaultPos, onTap }) {
  if (!el) return null;
  const countEl = el.querySelector('.bubble-count');
  const toastEl = el.querySelector('.bubble-toast');

  let pos = { ...defaultPos, ...load(posKey, {}) };
  let drag = null;
  let idleTimer = 0;
  let toastTimer = 0;
  let justDragged = false;

  const size = () => el.offsetWidth || 64;

  // y 存成「可移動範圍的比例」，換手機方向或視窗大小時位置也合理
  const bounds = () => {
    const insets = safeInsets();
    const top = insets.top + EDGE_PX;
    const bottom = window.innerHeight - insets.bottom - EDGE_PX - size();
    return { top, bottom: Math.max(top, bottom) };
  };

  const place = () => {
    const { top, bottom } = bounds();
    const x = pos.side === 'left' ? EDGE_PX : window.innerWidth - size() - EDGE_PX;
    const y = top + (bottom - top) * Math.min(Math.max(pos.y, 0), 1);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.classList.toggle('on-right', pos.side === 'right');
  };

  const wake = () => {
    el.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => el.classList.add('idle'), IDLE_MS);
  };

  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    wake();
    justDragged = false;
    const r = el.getBoundingClientRect();
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, offX: e.clientX - r.left, offY: e.clientY - r.top, moved: false };
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // 指標已經放開就抓不到，不影響點擊
    }
  });

  el.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < DRAG_START_PX) return;
    drag.moved = true;
    el.classList.add('dragging');
    el.style.left = `${e.clientX - drag.offX}px`;
    el.style.top = `${e.clientY - drag.offY}px`;
  });

  const release = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { moved } = drag;
    drag = null;
    el.classList.remove('dragging');
    wake();
    if (!moved) return;
    justDragged = true;
    // 放開後貼齊比較近的那一邊
    const r = el.getBoundingClientRect();
    const { top, bottom } = bounds();
    pos = {
      side: r.left + r.width / 2 < window.innerWidth / 2 ? 'left' : 'right',
      y: bottom > top ? (r.top - top) / (bottom - top) : 0,
    };
    pos.y = Math.min(Math.max(pos.y, 0), 1);
    save(posKey, pos);
    el.classList.add('snapping');
    place();
    setTimeout(() => el.classList.remove('snapping'), SNAP_MS);
  };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);

  // 拖曳放開也會觸發 click，只有沒拖動時才算點擊
  el.addEventListener('click', () => {
    if (!justDragged) onTap?.();
    justDragged = false;
  });

  window.addEventListener('resize', place);

  // text：泡泡上的小字；hasNew：亮紅點；label：給螢幕閱讀器的說明
  const setInfo = ({ text, hasNew, label }) => {
    countEl.textContent = text;
    el.classList.toggle('has-new', hasNew);
    el.setAttribute('aria-label', label);
  };

  const setVisible = (visible) => {
    const was = el.classList.contains('show');
    el.classList.toggle('show', visible);
    if (visible && !was) {
      place();
      wake();
    }
  };

  // 東西飛進泡泡的落點：泡泡中央的圖示
  const target = () => {
    const r = el.querySelector('.bubble-icon').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  // 收進東西時泡泡「吞」一下；旁邊跳出一句提示
  const gulp = () => {
    wake();
    el.classList.remove('gulp');
    void el.offsetWidth;
    el.classList.add('gulp');
  };

  const toast = (text, ms = 2200) => {
    clearTimeout(toastTimer);
    toastEl.textContent = text;
    toastEl.classList.add('show');
    wake();
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
  };

  return { setInfo, setVisible, target, gulp, toast };
}
