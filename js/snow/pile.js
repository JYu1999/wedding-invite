// 照片底部的積雪：用高度陣列（每 CELL_WIDTH px 一欄）記錄雪堆輪廓

const CELL_WIDTH = 3;
// 相鄰欄位允許的最大坡度（高度差 / 水平距離），超過就往兩側崩落
const MAX_SLOPE = 0.3;
// 每幀把雪往兩側攤平的比例：只靠坡度限制會堆成直線斜坡的三角尖峰，
// 加上擴散才會變成圓潤、蓬鬆的雪丘
const DIFFUSION = 0.2;
const DIFFUSION_PASSES = 2;
// 繪製時再做一次平滑的半徑（欄數），讓輪廓沒有鋸齒
const DRAW_SMOOTH_RADIUS = 3;

// 雪面上一閃一閃的冰晶反光
const GLINT_SPACING = 14;        // 平均每幾 px 一顆
const GLINT_MIN_PILE = 5;        // 積雪高於此值才會出現反光

// 雪的細微顆粒質感：預先做一張雜訊貼圖，畫積雪時用 pattern 鋪上
function createGrainPattern(ctx) {
  const size = 96;
  const tile = document.createElement('canvas');
  tile.width = tile.height = size;
  const c = tile.getContext('2d');
  for (let i = 0; i < 520; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 0.9 + 0.3;
    c.fillStyle = Math.random() < 0.55
      ? `rgba(150, 172, 200, ${Math.random() * 0.16 + 0.04})`
      : `rgba(255, 255, 255, ${Math.random() * 0.6 + 0.3})`;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  return ctx.createPattern(tile, 'repeat');
}

export class SnowPile {
  constructor() {
    this.heights = new Float32Array(0);
    this.smooth = new Float32Array(0);
    this.width = 0;
    this.maxHeight = 0;
    this.grain = null;
    this.glints = [];
  }

  // 視窗縮放時依比例重新取樣，保留既有積雪
  resize(width, maxHeight) {
    const count = Math.ceil(width / CELL_WIDTH) + 1;
    const prev = this.heights;
    const next = new Float32Array(count);
    if (prev.length) {
      for (let i = 0; i < count; i++) {
        next[i] = Math.min(prev[Math.floor((i / count) * prev.length)], maxHeight);
      }
    }
    this.heights = next;
    this.smooth = new Float32Array(count);
    this.width = width;
    this.maxHeight = maxHeight;
    this.glints = Array.from({ length: Math.ceil(width / GLINT_SPACING) }, () => ({
      x: Math.random() * width,
      depth: Math.random() * 0.55 + 0.1,   // 落在雪面下方的比例位置
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.0025 + 0.0012,
      size: Math.random() * 1.1 + 0.7,
    }));
  }

  heightAt(x) {
    const i = Math.round(x / CELL_WIDTH);
    return this.heights[Math.min(Math.max(i, 0), this.heights.length - 1)] || 0;
  }

  // 對 x 附近半徑 radius 內的欄位套用高斯權重
  #forEachInRange(x, radius, fn) {
    const h = this.heights;
    const center = x / CELL_WIDTH;
    const r = Math.max(1, radius / CELL_WIDTH);
    const from = Math.max(0, Math.floor(center - r));
    const to = Math.min(h.length - 1, Math.ceil(center + r));
    for (let i = from; i <= to; i++) {
      const d = (i - center) / r;
      const weight = Math.exp(-4 * d * d);
      if (weight > 0.01) fn(i, weight);
    }
  }

  // 雪花落地：把體積（px²）分散堆到落點附近，超過上限的部分不再累積
  deposit(x, area, spread) {
    let total = 0;
    this.#forEachInRange(x, spread, (_, w) => { total += w; });
    if (!total) return;
    const h = this.heights;
    this.#forEachInRange(x, spread, (i, w) => {
      h[i] = Math.min(this.maxHeight, h[i] + (area * w) / (total * CELL_WIDTH));
    });
  }

  // 融化：中心融得最快、往外漸弱，回傳這一幀融掉的總高度
  melt(x, radius, rate) {
    const h = this.heights;
    let melted = 0;
    this.#forEachInRange(x, radius, (i, w) => {
      const amount = Math.min(h[i], rate * w);
      h[i] -= amount;
      melted += amount;
    });
    return melted;
  }

  // 坡度過陡時把雪往低處推，再整體攤平一點
  settle() {
    const h = this.heights;
    const maxDiff = MAX_SLOPE * CELL_WIDTH;
    for (let i = 0; i < h.length - 1; i++) {
      const diff = h[i] - h[i + 1];
      if (Math.abs(diff) <= maxDiff) continue;
      const move = (Math.abs(diff) - maxDiff) / 2;
      const dir = Math.sign(diff);
      h[i] -= move * dir;
      h[i + 1] += move * dir;
    }

    // 擴散：每欄往相鄰兩欄流出一點，總量不變
    for (let pass = 0; pass < DIFFUSION_PASSES; pass++) {
      let prev = h[0];
      for (let i = 0; i < h.length; i++) {
        const cur = h[i];
        const left = i > 0 ? prev : cur;
        const right = i < h.length - 1 ? h[i + 1] : cur;
        prev = cur;
        h[i] = cur + DIFFUSION * (left + right - 2 * cur);
      }
    }
  }

  // 只用於繪製的平滑輪廓
  #smoothHeights() {
    const h = this.heights;
    const out = this.smooth;
    const r = DRAW_SMOOTH_RADIUS;
    for (let i = 0; i < h.length; i++) {
      let sum = 0;
      let weight = 0;
      for (let k = -r; k <= r; k++) {
        const j = Math.min(Math.max(i + k, 0), h.length - 1);
        const w = r + 1 - Math.abs(k);
        sum += h[j] * w;
        weight += w;
      }
      out[i] = sum / weight;
    }
    return out;
  }

  #tracePath(ctx, h, groundY, offsetY = 0) {
    ctx.moveTo(0, groundY - h[0] + offsetY);
    for (let i = 1; i < h.length - 1; i++) {
      const midY = groundY - (h[i] + h[i + 1]) / 2 + offsetY;
      ctx.quadraticCurveTo(i * CELL_WIDTH, groundY - h[i] + offsetY, (i + 0.5) * CELL_WIDTH, midY);
    }
    ctx.lineTo(this.width, groundY - h[h.length - 1] + offsetY);
  }

  draw(ctx, groundY, now = 0) {
    if (this.heights.length < 2) return;
    const h = this.#smoothHeights();
    const top = groundY - this.maxHeight;
    this.grain ??= createGrainPattern(ctx);

    const body = new Path2D();
    this.#tracePath(body, h, groundY);
    body.lineTo(this.width, groundY + 6);
    body.lineTo(0, groundY + 6);
    body.closePath();

    ctx.save();

    // 1. 雪身：上亮下帶一點冷色，底部融進照片下緣的米白
    //    用白色柔光當陰影，讓輪廓邊緣微微羽化、不會像剪紙一樣銳利
    const fill = ctx.createLinearGradient(0, top, 0, groundY + 4);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(0.55, '#f3f6fa');
    fill.addColorStop(1, '#e8edf3');
    ctx.fillStyle = fill;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
    ctx.shadowBlur = 6;
    ctx.fill(body);
    ctx.shadowColor = 'transparent';

    // 以下效果只畫在雪身範圍內
    ctx.clip(body);

    // 2. 立體感：沿著雪面往下偏移一段的柔和冷色陰影，像光從上方打下來
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(165, 184, 208, 0.07)';
    ctx.shadowColor = 'rgba(150, 172, 200, 0.22)';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 10;
    const shade = new Path2D();
    this.#tracePath(shade, h, groundY, 9);
    ctx.stroke(shade);
    ctx.shadowColor = 'transparent';

    // 3. 顆粒質感
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = this.grain;
    ctx.fill(body);
    ctx.globalAlpha = 1;

    // 4. 雪面頂端的柔亮高光
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.shadowColor = 'rgba(255, 255, 255, 1)';
    ctx.shadowBlur = 3;
    ctx.lineWidth = 2;
    const rim = new Path2D();
    this.#tracePath(rim, h, groundY, 1.2);
    ctx.stroke(rim);
    ctx.shadowColor = 'transparent';

    ctx.restore();

    // 5. 冰晶反光：雪面下方隨機的小亮點，慢慢閃爍
    ctx.save();
    for (const g of this.glints) {
      const i = Math.min(Math.max(Math.round(g.x / CELL_WIDTH), 0), h.length - 1);
      if (h[i] < GLINT_MIN_PILE) continue;
      const twinkle = Math.sin(now * g.speed + g.phase);
      if (twinkle < 0.35) continue;
      const alpha = (twinkle - 0.35) / 0.65;
      const y = groundY - h[i] * (1 - g.depth);
      const s = g.size * (0.6 + alpha * 0.6);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(150, 175, 210, 0.55)';
      ctx.beginPath();
      ctx.arc(g.x, y, s * 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(g.x, y, s * 0.8, 0, Math.PI * 2);
      ctx.fill();
      // 十字星芒
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(g.x - s * 3, y);
      ctx.lineTo(g.x + s * 3, y);
      ctx.moveTo(g.x, y - s * 3);
      ctx.lineTo(g.x, y + s * 3);
      ctx.stroke();
    }
    ctx.restore();
  }
}
