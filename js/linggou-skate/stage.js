// 跟令狗一起收集紅蘿蔔：場地
// 側面看的碗形溜冰場（畫面 800 × 450），兩端是斜坡，坡頂外面是圍牆
// 三個跳台像樓梯：地面 → 左右兩個低跳台 → 最上面放紅蘿蔔箱的跳台；後面的關卡跳台會移動

import { platSVG } from './sprites.js';

export const W = 800;
export const H = 450;
export const FLOOR = 360;      // 碗底
export const RIM = 220;        // 坡頂
export const RAMP_W = 110;     // 斜坡的寬度

const SVGNS = 'http://www.w3.org/2000/svg';
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, k) => a + (b - a) * k;

export function groundY(x) {
  if (x < RAMP_W) { const u = (RAMP_W - x) / RAMP_W; return FLOOR - (FLOOR - RIM) * u * u; }
  if (x > W - RAMP_W) { const u = (x - (W - RAMP_W)) / RAMP_W; return FLOOR - (FLOOR - RIM) * u * u; }
  return FLOOR;
}

// 地面的斜率（往右下是正）
export function groundSlope(x) {
  if (x < RAMP_W) return 2 * (FLOOR - RIM) * ((RAMP_W - x) / RAMP_W) / RAMP_W;
  if (x > W - RAMP_W) return -2 * (FLOOR - RIM) * ((x - (W - RAMP_W)) / RAMP_W) / RAMP_W;
  return 0;
}

// 關卡配置：每個跳台的中心 cx、高度 y、寬 w，以及移動幅度 ax / ay（像素）、週期 per（秒）、相位 ph
// 第三個永遠是放紅蘿蔔箱的最高跳台
export const LAYOUTS = {
  still: { name: '', plats: [
    { cx: 230, y: 282, w: 130 }, { cx: 570, y: 282, w: 130 }, { cx: 400, y: 168, w: 140 },
  ] },
  slide: { name: '低跳台會左右移動！', plats: [
    { cx: 250, y: 282, w: 120, ax: 70, per: 4.2 }, { cx: 550, y: 282, w: 120, ax: 70, per: 4.2, ph: 0.5 }, { cx: 400, y: 168, w: 140 },
  ] },
  lift: { name: '低跳台變成升降梯！', plats: [
    { cx: 220, y: 300, w: 120, ay: 46, per: 3.6 }, { cx: 580, y: 300, w: 120, ay: 46, per: 3.6, ph: 0.5 }, { cx: 400, y: 160, w: 140 },
  ] },
  drift: { name: '放箱子的跳台在移動！', plats: [
    { cx: 230, y: 282, w: 130 }, { cx: 570, y: 282, w: 130 }, { cx: 400, y: 168, w: 130, ax: 150, per: 7 },
  ] },
  chaos: { name: '全部的跳台都在動！', plats: [
    { cx: 240, y: 290, w: 116, ax: 50, ay: 20, per: 4 }, { cx: 560, y: 290, w: 116, ax: 50, ay: 20, per: 4, ph: 0.5 }, { cx: 400, y: 164, w: 130, ax: 130, per: 6.5, ph: 0.25 },
  ] },
};

// 第 1、2 波跳台不動；之後跳過紅蘿蔔雨的波次，依序左右移動 → 升降 → 箱子跳台移動 → 全部都動，再輪一次
export function layoutForWave(wave, bonus) {
  if (bonus || wave <= 2) return 'still';
  return ['slide', 'lift', 'drift', 'chaos'][(wave - 3 - Math.floor(wave / 5)) % 4];
}

// 跳台：換關時 1.2 秒內滑到新的位置與動法；dx / dy 是這一步移動了多少，站在上面的東西要跟著走
export function createPlatforms(layer) {
  const plats = [0, 1, 2].map((i) => ({ top: i === 2, x1: 0, x2: 0, cx: 0, y: 0, yPrev: 0, dx: 0, dy: 0, moving: false, k: 1, from: null, to: null, cur: null, el: null }));
  let clock = 0;
  const KEYS = ['cx', 'y', 'w', 'ax', 'ay', 'per', 'ph'];

  const reset = () => {
    layer.replaceChildren();
    plats.forEach((p) => {
      p.el = document.createElementNS(SVGNS, 'g');
      layer.append(p.el);
      p.to = null;
      p.x1 = 0;
      p.y = 0;
    });
    clock = 0;
    set('still', true);
    update(0);
  };

  const set = (name, instant = false) => {
    LAYOUTS[name].plats.forEach((def, i) => {
      const p = plats[i];
      const target = { ax: 0, ay: 0, per: 4, ph: 0, ...def };
      p.from = instant || !p.cur ? target : { ...p.cur };
      p.to = target;
      p.k = instant ? 1 : 0;
      p.moving = Boolean(target.ax || target.ay);
      p.el.innerHTML = platSVG(target.w, p.moving);
    });
  };

  const update = (dt) => {
    clock += dt;
    for (const p of plats) {
      if (p.k < 1) p.k = Math.min(1, p.k + dt / 1.2);
      const e = p.k * p.k * (3 - 2 * p.k);
      const c = {};
      for (const key of KEYS) c[key] = lerp(p.from[key], p.to[key], e);
      p.cur = c;
      const phase = (clock / c.per + c.ph) * Math.PI * 2;
      const cx = c.cx + Math.sin(phase) * c.ax;
      const y = c.y + Math.sin(phase) * c.ay;
      const x1 = cx - c.w / 2;
      p.dx = p.x1 ? x1 - p.x1 : 0;
      p.dy = p.y ? y - p.y : 0;
      p.yPrev = p.y || y;
      p.x1 = x1;
      p.x2 = cx + c.w / 2;
      p.cx = cx;
      p.y = y;
    }
  };

  const render = () => {
    for (const p of plats) p.el.setAttribute('transform', `translate(${p.x1.toFixed(1)} ${p.y.toFixed(1)})`);
  };

  return { list: plats, top: plats[2], reset, set, update, render };
}

// 落在跳台上（從上面落下才算）或地面
export function surfaceAt(plats, x, yPrev, yNow) {
  for (const p of plats) if (x > p.x1 + 4 && x < p.x2 - 4 && yPrev <= p.yPrev + 3 && yNow >= p.y) return { y: p.y, plat: p };
  const gy = groundY(Math.max(0, Math.min(W, x)));
  if (yNow >= gy) return { y: gy, plat: null };
  return null;
}

// ---------- 背景：只留天空、遠山、飄雪和溜冰場，不放會讓人分心的東西 ----------
export function buildBackground(g) {
  const ice = `M0,${RIM} C${RAMP_W * 0.25},${RIM + 60} ${RAMP_W * 0.6},${FLOOR} ${RAMP_W},${FLOOR} L${W - RAMP_W},${FLOOR} C${W - RAMP_W * 0.6},${FLOOR} ${W - RAMP_W * 0.25},${RIM + 60} ${W},${RIM} L${W},${H} L0,${H} Z`;
  g.innerHTML = `
    <defs>
      <linearGradient id="ls-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a7d5ef"/><stop offset=".8" stop-color="#e8f5fb"/></linearGradient>
      <linearGradient id="ls-ice" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7fcff"/><stop offset="1" stop-color="#cfe8f5"/></linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#ls-sky)"/>
    <path d="M0,250 C120,200 220,214 330,230 C450,248 560,196 680,208 C740,214 780,226 800,232 L800,300 L0,300 Z" fill="#ffffff" opacity=".55"/>
    <g class="ls-snow" fill="#fff" opacity=".85"></g>
    <rect x="-6" y="168" width="14" height="56" rx="4" fill="#fff" stroke="#3e2618" stroke-width="2.4"/>
    <rect x="${W - 8}" y="168" width="14" height="56" rx="4" fill="#fff" stroke="#3e2618" stroke-width="2.4"/>
    <path d="${ice}" fill="url(#ls-ice)" stroke="#3e2618" stroke-width="2.6"/>
    <path d="M${RAMP_W + 40},${FLOOR + 12} H${W - RAMP_W - 40}" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".9"/>
    <text x="${W / 2}" y="${FLOOR + 38}" text-anchor="middle" font-family="'Noto Serif TC', serif" font-weight="700" font-size="20" fill="#a9cfe2" letter-spacing="8">令狗溜冰場</text>
  `;
  const snow = g.querySelector('.ls-snow');
  const flakes = Array.from({ length: 34 }, () => {
    const c = document.createElementNS(SVGNS, 'circle');
    c.setAttribute('r', rand(1.2, 2.6).toFixed(1));
    snow.append(c);
    return { el: c, x: rand(0, W), y: rand(0, 300), s: rand(12, 30) };
  });
  return (dt) => {
    for (const f of flakes) {
      f.y += f.s * dt;
      if (f.y > 320) f.y = -6;
      f.el.setAttribute('cx', (f.x + Math.sin(f.y / 30) * 6).toFixed(1));
      f.el.setAttribute('cy', f.y.toFixed(1));
    }
  };
}
