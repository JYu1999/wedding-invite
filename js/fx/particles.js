// 開信封特效用的輕量粒子系統：全螢幕畫布，粒子全部消失後自動停止動畫

const MAX_DPR = 2;
const FRAME_MS = 1000 / 60;

// 預先畫好的柔光圓點，依顏色快取
const glowCache = new Map();
export function glowSprite(color, size = 64) {
  const key = `${color}|${size}`;
  if (!glowCache.has(key)) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const r = size / 2;
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.18, color);
    grad.addColorStop(0.45, color.replace(/[\d.]+\)$/, '0.35)'));
    grad.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    glowCache.set(key, c);
  }
  return glowCache.get(key);
}

const SHAPES = {
  glow(ctx, p) {
    const s = p.size * 2;
    ctx.drawImage(p.sprite, -s / 2, -s / 2, s, s);
  },
  image(ctx, p) {
    ctx.drawImage(p.sprite, -p.size / 2, -p.size / 2, p.size, p.size);
  },
};

export class ParticleLayer {
  constructor(host) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'fx-canvas';
    this.host = host;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.painters = [];   // 其他每幀要畫的東西（光環等），回傳 false 代表結束
    this.running = false;
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  add(p) {
    this.particles.push({
      vx: 0, vy: 0, gravity: 0, drag: 1, size: 4, life: 1, decay: 0.01,
      rotation: Math.random() * Math.PI * 2, spin: 0,
      phase: Math.random() * Math.PI * 2, twinkle: 0, alpha: 1, shape: 'glow',
      ...p,
    });
    this.start();
  }

  paint(fn) {
    this.painters.push({ fn, born: performance.now() });
    this.start();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = 0;
    this.host.append(this.canvas);
    requestAnimationFrame(this.frame);
  }

  frame = (now) => {
    const dt = Math.min((now - (this.last || now)) / FRAME_MS || 1, 3);
    this.last = now;
    const { ctx } = this;
    ctx.clearRect(0, 0, this.width, this.height);

    this.painters = this.painters.filter((p) => p.fn(ctx, now - p.born) !== false);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (p.delay > 0) {
        p.delay -= dt * FRAME_MS;
        continue;
      }
      p.vx *= p.drag ** dt;
      p.vy = p.vy * p.drag ** dt + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.spin * dt;
      p.life -= p.decay * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      let alpha = p.alpha * Math.min(1, p.life * 2.5);
      if (p.twinkle) alpha *= 0.55 + 0.45 * Math.sin(now * p.twinkle + p.phase);
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      SHAPES[p.shape](ctx, p);
      ctx.restore();
    }

    if (this.particles.length || this.painters.length) {
      requestAnimationFrame(this.frame);
    } else {
      // 粒子都消失後把全螢幕畫布拿掉，不要一直佔著手機的繪圖記憶體
      this.running = false;
      this.canvas.remove();
    }
  };
}
