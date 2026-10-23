// 扭蛋機的音效與特效：轉把手的喀啦聲、扭蛋落地、打開時的閃光、刮銀漆的沙沙聲、中獎的拉炮與彩帶
// 音效都用 Web Audio 即時合成；第一次出聲是在按下旋鈕的當下，iOS 才允許播放

import { ParticleLayer, glowSprite } from '../fx/particles.js';
import { getAudio, tone, bell, noise } from '../fx/sound.js';

const GOLD = 'rgba(238, 186, 82, 1)';
const GOLD_LIGHT = 'rgba(250, 212, 128, 1)';
const CONFETTI_COLORS = ['#e7b74f', '#f6d58a', '#d9534f', '#b35d50', '#deb6ab', '#7fa37a', '#fbf6ee', '#8fb3c9'];
const SCRATCH_SOUND_MS = 70;
const C_MAJOR = [523.25, 659.25, 783.99, 1046.5];

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// 轉把手的棘輪聲，接著扭蛋滾下出口、落地彈兩下（時間點對齊 gacha.js 的 SPIN_MS 與掉落動畫）
export function spinSound(landAt, bounceAt) {
  const a = getAudio();
  if (!a) return;
  for (let i = 0; i < 8; i++) {
    noise(a, i * 0.12, 0.035, { from: 2600, to: 1800, q: 4, gain: 0.16, attack: 0.002 });
    tone(a, 1400, i * 0.12, 0.03, { type: 'square', gain: 0.012 });
  }
  noise(a, landAt - 0.3, 0.3, { from: 300, to: 900, gain: 0.08, type: 'lowpass', attack: 0.05 });
  tone(a, 210, landAt, 0.22, { glide: 80, gain: 0.3 });
  tone(a, 190, bounceAt, 0.14, { glide: 90, gain: 0.14 });
}

// 扭蛋「啵」一聲打開，接著幾聲清脆的鈴
export function popSound() {
  const a = getAudio();
  if (!a) return;
  noise(a, 0, 0.16, { from: 2200, to: 500, q: 1.2, gain: 0.3, attack: 0.003 });
  tone(a, 320, 0, 0.22, { glide: 900, gain: 0.12 });
  [1567.98, 2093, 2637.02].forEach((f, i) => bell(a, f, 0.12 + i * 0.07, 1, 0.04));
}

// 刮銀漆的沙沙聲，連續刮的時候節流
let lastScratch = 0;
export function scratchSound() {
  const now = performance.now();
  if (now - lastScratch < SCRATCH_SOUND_MS) return;
  lastScratch = now;
  const a = getAudio();
  if (!a) return;
  noise(a, 0, 0.08, { from: 3500, to: 5500, q: 0.8, gain: 0.035, type: 'highpass', attack: 0.01 });
}

// 中獎：拉炮聲 + 上行琶音 + 大和弦，最後一串高音鈴
export function fanfare() {
  const a = getAudio();
  if (!a) return;
  noise(a, 0, 0.35, { from: 2500, to: 600, gain: 0.22, attack: 0.003 });
  C_MAJOR.forEach((f, i) => {
    tone(a, f, 0.08 + i * 0.11, 0.5, { type: 'triangle', gain: 0.12 });
    bell(a, f * 2, 0.08 + i * 0.11, 0.9, 0.03);
  });
  C_MAJOR.forEach((f) => tone(a, f, 0.55, 1.8, { type: 'triangle', gain: 0.07, attack: 0.02 }));
  [2093, 2637.02, 3135.96, 2349.32, 2793.83].forEach((f) => bell(a, f, 0.7 + Math.random() * 0.6, 1.2, 0.035));
}

// 從中心擴散的金色光環
function ring(layer, x, y, { duration = 900, maxR = 220, width = 3 } = {}) {
  layer.paint((ctx, age) => {
    // 畫面更新的時間戳可能比建立光環的時間早一點，age 會是負的
    const t = Math.max(0, age) / duration;
    if (t >= 1) return false;
    const ease = 1 - (1 - t) ** 3;
    ctx.save();
    ctx.globalAlpha = (1 - t) * 0.9;
    ctx.strokeStyle = GOLD_LIGHT;
    ctx.lineWidth = width * (1 - t * 0.6);
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(x, y, 12 + ease * maxR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return true;
  });
}

function sparkle(layer, x, y, count, maxSpeed) {
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(1, maxSpeed);
    layer.add({
      x, y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      drag: 0.95, gravity: 0.02, size: rand(2.5, 6), decay: rand(0.008, 0.014),
      twinkle: 0.015, shape: 'glow', sprite: glowSprite(pick([GOLD, GOLD_LIGHT])),
    });
  }
}

// 扭蛋打開：金色光環 + 金粉
export function openBurst(host, x, y) {
  const layer = new ParticleLayer(host);
  ring(layer, x, y);
  sparkle(layer, x, y, 50, 6);
}

// 中獎：照片中心再迸一次金粉，左右下角各一支拉炮朝上噴出彩帶
export function celebrate(host, x, y) {
  const layer = new ParticleLayer(host);
  const { width: w, height: h } = layer;
  ring(layer, x, y, { duration: 1200, maxR: Math.max(w, h) * 0.5, width: 4 });
  sparkle(layer, x, y, 60, 8);

  [[0, h, -1.35, -0.85], [w, h, -2.3, -1.8]].forEach(([sx, sy, from, to]) => {
    for (let i = 0; i < 70; i++) {
      const angle = rand(from, to);
      const speed = h * rand(0.018, 0.03);
      layer.add({
        x: sx, y: sy,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        drag: 0.965, gravity: h * 0.0003, size: rand(8, 13), decay: rand(0.004, 0.007),
        spin: rand(-0.15, 0.15), shape: 'confetti', color: pick(CONFETTI_COLORS), delay: rand(0, 160),
      });
    }
  });
}
