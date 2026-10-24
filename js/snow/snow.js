// 首頁照片上的四季景色：每 10 秒換一季（雪花、櫻花、流星、楓葉），只在照片範圍內飄落，
// 落到底部後一律堆成積雪；滑鼠經過或手機點擊積雪會讓它慢慢融化
// 成就：把堆起來的積雪清乾淨記一次「清積雪」；四季每輪完一圈記一次「四季輪迴」

import { createFlakeSprites, createSakuraSprites, createLeafSprites } from './sprites.js';
import { SEASONS } from './seasons.js';
import { SnowPile } from './pile.js';
import { increment } from '../achievements/progress.js';
import { homeTime } from '../scroll-lock.js';

const MAX_DPR = 2;
const FRAME_MS = 1000 / 60;      // 速度以 60fps 為基準，高更新率螢幕不會飄得比較快
const GROUND_OFFSET = 3;         // 積雪地面距照片底部
const MOBILE_BREAKPOINT = 768;
const SEASON_MS = 10_000;        // 每 10 秒換一季：冬 → 春 → 夏 → 秋
const SPARK_COLOR = '255, 236, 190';

// 積雪高度上限：不蓋住照片下緣的英文小標
const MAX_PILE_MOBILE = 22;
const MAX_PILE_DESKTOP = 32;

// 融化
const MELT_RATE = 0.18;          // 每幀中心點融化的高度 (px)，滿高約 3 秒融完
const MELT_RADIUS_MOUSE = 46;
const MELT_RADIUS_TOUCH = 60;
const TOUCH_MELT_MS = 1500;      // 手機點一下持續融化的時間

// 清積雪：積雪堆到 CLEAR_ARM 以上之後，被融到只剩 CLEAR_DONE 以下，算清乾淨一次
const CLEAR_ARM = 0.12;     // 約堆了半分鐘的雪
const CLEAR_DONE = 0.04;

// 照片上的一顆飄落物：外觀與動作由所屬季節決定（seasons.js）
// slot 是它在整批粒子裡的固定位置（0～1），季節的 share 決定前多少比例會出場
class Particle {
  constructor(slot) {
    this.slot = slot;
    this.season = null;
    this.idle = true;
    this.fade = 1;
    this.fadeSpeed = 0;
  }

  // arriving：換季時以新季節的樣子散布在照片上淡入；否則從頂部重新落下
  assign(season, world, sprites, { initial = false, arriving = false } = {}) {
    this.season = season;
    this.idle = this.slot >= season.share;
    if (this.idle) return;
    season.spawn(this, world, sprites, initial || arriving);
    this.fade = arriving && !season.instant ? 0 : 1;
    this.fadeSpeed = Math.random() * 0.02 + 0.015;   // 約 0.5～1 秒淡入淡出
  }

  get hidden() {
    return this.idle || Boolean(this.season.hidden?.(this));
  }
}

// 融雪時從雪面彈起的小水珠（也用在流星落地濺起的火花）
class Droplet {
  constructor(x, y, color = '170, 200, 230') {
    this.color = color;
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 0.6;
    this.vy = -(Math.random() * 0.9 + 0.4);
    this.radius = Math.random() * 0.8 + 0.8;
    this.life = 1;
  }

  update(dt) {
    this.vy += 0.06 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= 0.035 * dt;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${this.color}, ${this.life * 0.8})`;
    ctx.fill();
  }
}

export function initSnow({ canvas, area }) {
  if (!canvas || !area) return;
  const ctx = canvas.getContext('2d');
  const sprites = {
    snow: createFlakeSprites(),
    sakura: createSakuraSprites(),
    leaves: createLeafSprites(),
  };
  const pile = new SnowPile();
  const world = { width: 0, height: 0, groundY: 0 };
  const droplets = [];
  const pointer = { x: 0, y: 0, hovering: false, touchUntil: 0, radius: MELT_RADIUS_MOUSE };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    world.width = area.clientWidth;
    world.height = area.clientHeight;
    world.groundY = world.height - GROUND_OFFSET;
    canvas.width = Math.round(world.width * dpr);
    canvas.height = Math.round(world.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pile.resize(world.width, world.width < MOBILE_BREAKPOINT ? MAX_PILE_MOBILE : MAX_PILE_DESKTOP);
  };
  resize();
  new ResizeObserver(resize).observe(area);

  // 依螢幕寬度決定粒子數量（手機版適度減少，避免耗電）
  const count = world.width < MOBILE_BREAKPOINT ? 35 : 65;
  let seasonStart = homeTime();
  let seasonCycles = Infinity;    // 開場拆信封時不算，進入首頁（restartSeasons）才開始計算
  let snowArmed = false;
  const currentSeason = (now) => SEASONS[Math.floor((homeTime(now) - seasonStart) / SEASON_MS) % SEASONS.length];
  const particles = Array.from({ length: count }, (_, i) => new Particle(i / count));
  particles.forEach((p) => p.assign(SEASONS[0], world, sprites, { initial: true }));

  // ---------- 融雪互動：滑鼠經過、手機點擊 ----------
  const setPointer = (e) => {
    const rect = area.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
  };
  area.addEventListener('pointermove', (e) => {
    setPointer(e);
    if (e.pointerType === 'mouse') {
      pointer.hovering = true;
      pointer.radius = MELT_RADIUS_MOUSE;
    }
  });
  area.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') pointer.hovering = false;
  });
  area.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    setPointer(e);
    pointer.radius = MELT_RADIUS_TOUCH;
    pointer.touchUntil = performance.now() + TOUCH_MELT_MS;
  });

  const meltUnderPointer = (now, dt) => {
    if (!pointer.hovering && now > pointer.touchUntil) return;
    // 指標要在雪面附近才會融化
    const surfaceY = world.groundY - pile.heightAt(pointer.x);
    if (pointer.y < surfaceY - pointer.radius) return;

    const melted = pile.melt(pointer.x, pointer.radius, MELT_RATE * dt);
    if (snowArmed && melted > 0 && pile.fullness() <= CLEAR_DONE) {
      snowArmed = false;
      increment('snowCleared');
    }
    if (melted > 0.05 && Math.random() < 0.5) {
      const x = pointer.x + (Math.random() - 0.5) * pointer.radius;
      droplets.push(new Droplet(x, world.groundY - pile.heightAt(x)));
    }
  };

  // ---------- 動畫循環 ----------
  let lastTime = 0;
  let rafId = 0;

  const frame = (now) => {
    const dt = Math.min((now - (lastTime || now)) / FRAME_MS || 1, 3);
    lastTime = now;
    const { width, height, groundY } = world;

    const season = currentSeason(now);
    // 照片捲出畫面時動畫暫停，捲回來才補記；一次跳過好幾輪也只算一次
    // 季節用首頁的時鐘：扭蛋機、小遊戲等全螢幕視窗蓋住首頁的期間不算
    const cycle = Math.floor((homeTime(now) - seasonStart) / (SEASON_MS * SEASONS.length));
    if (cycle > seasonCycles) {
      seasonCycles = cycle;
      increment('seasonCycles');
    }

    for (const p of particles) {
      // 換季：還沒出場的直接換成新季節；飄在空中的先淡出，消失後再以新季節的樣子出現
      if (p.season !== season) {
        if (p.hidden) {
          p.assign(season, world, sprites, { arriving: true });
        } else if ((p.fade -= p.fadeSpeed * dt) <= 0) {
          p.assign(season, world, sprites, { arriving: true });
        }
      } else if (p.fade < 1) {
        p.fade = Math.min(1, p.fade + p.fadeSpeed * dt);
      }
      if (p.idle) continue;

      p.season.update(p, dt);
      if (p.hidden) continue;
      if (p.x < -p.margin || p.x > width + p.margin || p.y > height + p.margin) {
        p.assign(season, world, sprites);
      } else if (p.y + p.size * 0.3 >= groundY - pile.heightAt(p.x)) {
        // 碰到照片底部（或已堆起的雪面）就加入積雪
        pile.deposit(p.x, p.depositArea, p.size * 3);
        if (p.season.instant) {
          // 流星落地濺起幾點火花
          for (let i = 0; i < 5; i++) droplets.push(new Droplet(p.x, groundY - pile.heightAt(p.x), SPARK_COLOR));
        }
        p.assign(season, world, sprites);
      }
    }

    meltUnderPointer(now, dt);
    pile.settle();
    if (pile.fullness() >= CLEAR_ARM) snowArmed = true;

    for (let i = droplets.length - 1; i >= 0; i--) {
      droplets[i].update(dt);
      if (droplets[i].life <= 0) droplets.splice(i, 1);
    }

    ctx.clearRect(0, 0, width, height);
    for (const p of particles) {
      if (!p.idle) p.season.draw(p, ctx, p.fade);
    }
    pile.draw(ctx, groundY, now);
    droplets.forEach((drop) => drop.draw(ctx));

    rafId = requestAnimationFrame(frame);
  };

  // 照片捲出畫面時暫停動畫，省電
  new IntersectionObserver(([entry]) => {
    cancelAnimationFrame(rafId);
    if (entry.isIntersecting) {
      lastTime = 0;
      rafId = requestAnimationFrame(frame);
    }
  }).observe(area);

  return {
    // 從冬天重新開始輪替（進入首頁時呼叫）
    restartSeasons() {
      seasonStart = homeTime();
      seasonCycles = 0;
    },
  };
}
