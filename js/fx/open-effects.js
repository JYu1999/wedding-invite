// 拆信封時的「開寶箱」特效：金色光芒在信封後方旋轉，金色雪花結晶與金粉從信封中心放射綻放，
// 搭配玻璃風鈴般的音效

import { ParticleLayer, glowSprite } from './particles.js';
import { getAudio, tone, bell, noise } from './sound.js';
import { createFlakeSprites } from '../snow/sprites.js';

const BURST_MS = 420;        // 封蓋掀到一半時迸發
const RAYS_END_MS = 3400;    // 信紙放大定位後光芒收起
const GOLD = 'rgba(238, 186, 82, 1)';
const GOLD_LIGHT = 'rgba(250, 212, 128, 1)';

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const later = (ms, fn) => setTimeout(fn, ms);

// 在信封中心放一個 DOM 特效元素（光芒、閃光），排在信封後方
function placeAt(overlay, className, x, y) {
  const el = document.createElement('div');
  el.className = className;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  overlay.append(el);
  return el;
}

// 光芒收起後只是淡出，元素留到開場結束才拿掉：
// 中途移除會在「翻面→推進」之間改動遮罩的合成層，部分 iPhone 會因此整層遮罩沒畫出來、透出首頁
function showRays(overlay, x, y) {
  const rays = placeAt(overlay, 'fx-rays', x, y);
  const flash = placeAt(overlay, 'fx-flash', x, y);
  later(BURST_MS, () => {
    rays.classList.add('on');
    flash.classList.add('on');
  });
  later(RAYS_END_MS, () => rays.classList.remove('on'));
  return [rays, flash];
}

// 從中心擴散的金色光環
function ring(layer, x, y, { duration = 1100, maxR = 280, width = 3 } = {}) {
  layer.paint((ctx, age) => {
    const t = age / duration;
    if (t >= 1) return false;
    const ease = 1 - (1 - t) ** 3;
    ctx.save();
    ctx.globalAlpha = (1 - t) * 0.9;
    ctx.strokeStyle = GOLD_LIGHT;
    ctx.lineWidth = width * (1 - t * 0.6);
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(x, y, 18 + ease * maxR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return true;
  });
}

// 把首頁雪花的造型染成金色，外圍加一點暖色光暈
let goldFlakes = null;
function goldFlakeSprites() {
  goldFlakes ??= createFlakeSprites().crystals.map((src) => {
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    const fill = g.createLinearGradient(0, 0, c.width, c.height);
    fill.addColorStop(0, '#f6d58a');
    fill.addColorStop(1, '#d9a441');
    g.fillStyle = fill;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  });
  return goldFlakes;
}

function burst(layer, cx, cy) {
  ring(layer, cx, cy);
  const flakes = goldFlakeSprites();
  for (let i = 0; i < 30; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(3.5, 9);
    layer.add({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      drag: 0.95, gravity: 0.015, size: rand(14, 30), decay: rand(0.007, 0.011),
      spin: rand(-0.06, 0.06), shape: 'image', sprite: pick(flakes), alpha: 0.95,
    });
  }
  // 金粉：比雪花慢、會閃爍
  for (let i = 0; i < 60; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(1, 5);
    layer.add({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      drag: 0.96, gravity: 0.01, size: rand(2.5, 5.5), decay: rand(0.006, 0.01),
      twinkle: 0.015, shape: 'glow', sprite: glowSprite(pick([GOLD, GOLD_LIGHT])),
    });
  }
}

// 玻璃風鈴：一陣微風後，幾個高音鈴隨機錯落響起
function chime() {
  const a = getAudio();
  if (!a) return;
  noise(a, 0, 1.4, { from: 500, to: 1400, gain: 0.05, type: 'lowpass', attack: 0.4 });
  [1567.98, 2093, 2637.02, 3135.96, 2349.32, 2793.83].forEach((f) => {
    bell(a, f, 0.4 + Math.random() * 0.5, 1.3, 0.045);
  });
  tone(a, 1046.5, 0.42, 2, { gain: 0.05, attack: 0.15 });
}

// 回傳清除函式：開場結束（遮罩已隱藏）後再呼叫，把特效元素與畫布一次拿掉
export function playOpenEffect(envelope) {
  const overlay = envelope.closest('#intro-overlay');
  const box = envelope.getBoundingClientRect();
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  const layer = new ParticleLayer(overlay, { persist: true });

  // 音效要在點擊當下建立，iOS 才允許播放
  chime();
  const fxEls = showRays(overlay, cx, cy);
  const burstTimer = later(BURST_MS, () => burst(layer, cx, cy));

  return () => {
    clearTimeout(burstTimer);
    fxEls.forEach((el) => el.remove());
    layer.remove();
  };
}
