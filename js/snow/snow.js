// 首頁照片上的雪景：雪花只在照片範圍內飄落，落到底部後堆積；
// 滑鼠經過或手機點擊積雪會讓它慢慢融化

import { createFlakeSprites } from './sprites.js';
import { SnowPile } from './pile.js';

const MAX_DPR = 2;
const FRAME_MS = 1000 / 60;      // 速度以 60fps 為基準，高更新率螢幕不會飄得比較快
const GROUND_OFFSET = 3;         // 積雪地面距照片底部
const MOBILE_BREAKPOINT = 768;

// 積雪高度上限：不蓋住照片下緣的英文小標
const MAX_PILE_MOBILE = 22;
const MAX_PILE_DESKTOP = 32;

// 融化
const MELT_RATE = 0.18;          // 每幀中心點融化的高度 (px)，滿高約 3 秒融完
const MELT_RADIUS_MOUSE = 46;
const MELT_RADIUS_TOUCH = 60;
const TOUCH_MELT_MS = 1500;      // 手機點一下持續融化的時間

class Snowflake {
  constructor(world, sprites) {
    this.world = world;
    this.sprites = sprites;
    this.reset(true);
  }

  reset(initial = false) {
    const { width, height } = this.world;
    // 約六成是不同造型的六角結晶，其餘為遠景柔焦小雪點
    this.isCrystal = Math.random() < 0.6;
    const { crystals, dot } = this.sprites;
    this.sprite = this.isCrystal ? crystals[Math.floor(Math.random() * crystals.length)] : dot;
    this.size = this.isCrystal ? Math.random() * 12 + 9 : Math.random() * 4 + 3; // 繪製尺寸 (px)
    this.depositArea = this.size * (this.isCrystal ? 6 : 4);                     // 落地後增加的積雪量 (px²)
    this.x = Math.random() * width;
    // 初始時均勻分布在照片上，後續重置則從頂部外生成
    this.y = initial ? Math.random() * height : -this.size;
    // 越大的雪花（離鏡頭越近）掉得稍快，營造景深
    this.speedY = this.isCrystal ? this.size * 0.02 + 0.2 : Math.random() * 0.15 + 0.18;
    this.speedX = Math.random() * 0.2 - 0.1;           // 基礎微風橫移
    this.opacity = this.isCrystal ? Math.random() * 0.3 + 0.65 : Math.random() * 0.4 + 0.35;
    this.angle = Math.random() * Math.PI * 2;
    this.angleSpeed = Math.random() * 0.01 + 0.005;    // 左右擺動頻率
    this.swayRange = Math.random() * 0.4 + 0.2;        // 左右搖曳幅度
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.012; // 緩慢自轉，方向各異
  }

  update(dt) {
    this.angle += this.angleSpeed * dt;
    this.x += (Math.sin(this.angle) * this.swayRange + this.speedX) * dt;
    this.y += this.speedY * dt;
    this.rotation += this.rotationSpeed * dt;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.drawImage(this.sprite, -this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

// 融雪時從雪面彈起的小水珠
class Droplet {
  constructor(x, y) {
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
    ctx.fillStyle = `rgba(170, 200, 230, ${this.life * 0.8})`;
    ctx.fill();
  }
}

export function initSnow({ canvas, area }) {
  if (!canvas || !area) return;
  const ctx = canvas.getContext('2d');
  const sprites = createFlakeSprites();
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

  // 依螢幕寬度決定雪花密度（手機版適度減少，避免耗電）
  const flakeCount = world.width < MOBILE_BREAKPOINT ? 35 : 65;
  const flakes = Array.from({ length: flakeCount }, () => new Snowflake(world, sprites));

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

    for (const flake of flakes) {
      flake.update(dt);
      if (flake.x < -flake.size || flake.x > width + flake.size) {
        flake.reset();
      } else if (flake.y + flake.size * 0.3 >= groundY - pile.heightAt(flake.x)) {
        // 碰到照片底部（或已堆起的雪面）就加入積雪
        pile.deposit(flake.x, flake.depositArea, flake.size * 3);
        flake.reset();
      }
    }

    meltUnderPointer(now, dt);
    pile.settle();

    for (let i = droplets.length - 1; i >= 0; i--) {
      droplets[i].update(dt);
      if (droplets[i].life <= 0) droplets.splice(i, 1);
    }

    ctx.clearRect(0, 0, width, height);
    flakes.forEach((flake) => flake.draw(ctx));
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
}
