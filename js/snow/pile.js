// 照片底部的積雪：用高度陣列（每 CELL_WIDTH px 一欄）記錄雪堆輪廓

const CELL_WIDTH = 3;
// 相鄰欄位允許的最大坡度（高度差 / 水平距離），超過就往兩側崩落，雪堆才會自然圓滑
const MAX_SLOPE = 0.55;

export class SnowPile {
  constructor() {
    this.heights = new Float32Array(0);
    this.width = 0;
    this.maxHeight = 0;
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
    this.width = width;
    this.maxHeight = maxHeight;
  }

  heightAt(x) {
    const i = Math.round(x / CELL_WIDTH);
    return this.heights[Math.min(Math.max(i, 0), this.heights.length - 1)] || 0;
  }

  // 對 x 附近半徑 radius 內的欄位套用鐘形權重
  #forEachInRange(x, radius, fn) {
    const h = this.heights;
    const center = x / CELL_WIDTH;
    const r = Math.max(1, radius / CELL_WIDTH);
    const from = Math.max(0, Math.floor(center - r));
    const to = Math.min(h.length - 1, Math.ceil(center + r));
    for (let i = from; i <= to; i++) {
      const weight = 1 - ((i - center) / r) ** 2;
      if (weight > 0) fn(i, weight);
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

  // 坡度過陡時把雪往低處推
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
  }

  draw(ctx, groundY) {
    const h = this.heights;
    if (h.length < 2) return;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, groundY + 4);
    ctx.lineTo(0, groundY - h[0]);
    // 以相鄰欄位中點做二次曲線，讓雪堆輪廓圓潤
    for (let i = 1; i < h.length - 1; i++) {
      const midY = groundY - (h[i] + h[i + 1]) / 2;
      ctx.quadraticCurveTo(i * CELL_WIDTH, groundY - h[i], (i + 0.5) * CELL_WIDTH, midY);
    }
    ctx.lineTo(this.width, groundY - h[h.length - 1]);
    ctx.lineTo(this.width, groundY + 4);
    ctx.closePath();

    const fill = ctx.createLinearGradient(0, groundY - this.maxHeight, 0, groundY);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(1, '#eef2f7');
    ctx.fillStyle = fill;
    // 灰藍陰影勾出雪堆輪廓，在米白底上也看得出是雪
    ctx.shadowColor = 'rgba(120, 140, 165, 0.45)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = -1;
    ctx.fill();
    ctx.restore();
  }
}
