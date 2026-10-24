// 刮刮樂：照片上蓋一層銀漆畫布，用滑鼠左鍵或手指刮開，刮掉一半後通知外部，剩下的銀漆淡出

import { createFlakeSprites } from '../snow/sprites.js';

const MAX_DPR = 2;
const BRUSH_RATIO = 0.1;    // 筆刷粗細：卡片短邊的比例
const DONE_RATIO = 0.5;    // 刮掉一半就夠了，剩下的銀漆自己淡出，不用刮得很乾淨
const CHECK_MS = 150;       // 計算進度的間隔，避免每次移動都讀整張畫布
const SAMPLE_STEP = 6;      // 計算進度時每隔幾個像素取樣一次
const FLAKE_GAP_PX = 64;    // 銀漆上雪花暗紋的間距

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

let flakes = null;

// 銀漆：金屬漸層 + 細砂顆粒 + 白色雪花暗紋 + 中央「刮刮樂」字樣
function paintSilver(ctx, w, h, dpr) {
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, w, h);

  const base = ctx.createLinearGradient(0, 0, w, h);
  [[0, '#aeb3bb'], [0.22, '#eceef1'], [0.45, '#b9bec6'], [0.62, '#f4f5f7'], [0.85, '#a9aeb7'], [1, '#d5d8dd']]
    .forEach(([stop, color]) => base.addColorStop(stop, color));
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  const grains = Math.round((w * h) / (180 * dpr * dpr));
  for (let i = 0; i < grains; i++) {
    ctx.fillStyle = Math.random() < 0.5
      ? `rgba(255, 255, 255, ${rand(0.2, 0.5)})`
      : `rgba(70, 76, 88, ${rand(0.08, 0.2)})`;
    ctx.fillRect(rand(0, w), rand(0, h), dpr, dpr);
  }

  flakes ??= createFlakeSprites().crystals;
  const gap = FLAKE_GAP_PX * dpr;
  ctx.globalAlpha = 0.55;
  for (let y = gap / 2, row = 0; y < h + gap; y += gap, row++) {
    for (let x = row % 2 ? 0 : gap / 2; x < w + gap; x += gap) {
      const s = rand(14, 22) * dpr;
      ctx.drawImage(pick(flakes), x - s / 2, y - s / 2, s, s);
    }
  }
  ctx.globalAlpha = 1;

  const size = Math.min(w, h);
  const cy = h / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const emboss = (text, y) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(text, w / 2 + dpr, y + dpr);
    ctx.fillStyle = 'rgba(78, 83, 99, 0.85)';
    ctx.fillText(text, w / 2, y);
  };
  ctx.font = `600 ${size * 0.13}px 'Noto Serif TC', serif`;
  emboss('刮刮樂', cy - size * 0.04);
  ctx.font = `500 ${size * 0.05}px 'Cormorant Garamond', serif`;
  emboss('S C R A T C H   T O   R E V E A L', cy + size * 0.08);
}

export function initScratch(canvas, { onScratch, onDone } = {}) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let brush = 0;
  let last = null;
  let drawing = false;
  let done = true;
  let lastCheck = 0;

  // 依畫布目前在畫面上的大小重畫銀漆；之後卡片縮放只會拉伸畫布，刮過的痕跡不會消失
  // 用排版尺寸而不是 getBoundingClientRect：卡片剛出現時正在放大動畫中，量到的會偏小
  const reset = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.max(1, Math.round(canvas.offsetWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.offsetHeight * dpr));
    brush = Math.min(canvas.width, canvas.height) * BRUSH_RATIO;
    paintSilver(ctx, canvas.width, canvas.height, dpr);
    canvas.classList.remove('cleared');
    done = false;
    drawing = false;
  };

  const toCanvas = (e) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * canvas.width) / r.width,
      y: ((e.clientY - r.top) * canvas.height) / r.height,
    };
  };

  const scrape = (from, to) => {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brush;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    // 長度為 0 的線段不會畫出圓頭，按下去的那一點另外補一個圓
    ctx.beginPath();
    ctx.arc(to.x, to.y, brush / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const clearedRatio = () => {
    const { width: w, height: h } = canvas;
    const { data } = ctx.getImageData(0, 0, w, h);
    let cleared = 0;
    let total = 0;
    for (let y = 0; y < h; y += SAMPLE_STEP) {
      for (let x = 0; x < w; x += SAMPLE_STEP) {
        total++;
        if (data[(y * w + x) * 4 + 3] < 64) cleared++;
      }
    }
    return cleared / total;
  };

  const check = (force) => {
    const now = performance.now();
    if (done || (!force && now - lastCheck < CHECK_MS)) return;
    lastCheck = now;
    if (clearedRatio() < DONE_RATIO) return;
    done = true;
    drawing = false;
    canvas.classList.add('cleared');
    onDone?.();
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (done || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    canvas.setPointerCapture?.(e.pointerId);
    drawing = true;
    last = toCanvas(e);
    scrape(last, last);
    onScratch?.();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    // 快速滑動時把中間漏掉的點也補上，刮痕才連續
    const coalesced = e.getCoalescedEvents?.();
    for (const point of coalesced?.length ? coalesced : [e]) {
      const next = toCanvas(point);
      scrape(last, next);
      last = next;
    }
    onScratch?.();
    check();
  });

  const stop = () => {
    if (!drawing) return;
    drawing = false;
    check(true);
  };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => canvas.addEventListener(type, stop));

  return { reset };
}
