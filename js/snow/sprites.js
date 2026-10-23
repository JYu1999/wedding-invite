// 四季飄落物造型（雪花、櫻花、楓葉）：預先繪製到離屏畫布，動畫時只需貼圖，手機也不卡

const SPRITE_SIZE = 64;

const line = (c, x1, y1, x2, y2) => {
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
};

// 雪花為六角對稱：只畫一支臂，旋轉 6 次
const sixArms = (c, r, drawArm) => {
  for (let i = 0; i < 6; i++) {
    c.save();
    c.rotate((Math.PI / 3) * i);
    drawArm(c, r);
    c.restore();
  }
};

const FLAKE_SHAPES = [
  // 簡約星芒：直線主幹 + 末端小叉
  (c, r) => sixArms(c, r, (c, r) => {
    line(c, 0, 0, 0, -r);
    line(c, 0, -r * 0.68, -r * 0.2, -r * 0.88);
    line(c, 0, -r * 0.68, r * 0.2, -r * 0.88);
  }),
  // 蕨葉狀：主幹兩側多對由長到短的細枝
  (c, r) => sixArms(c, r, (c, r) => {
    line(c, 0, 0, 0, -r);
    [0.32, 0.54, 0.74].forEach((p, i) => {
      const len = r * (0.3 - i * 0.07);
      line(c, 0, -r * p, -len, -r * p - len);
      line(c, 0, -r * p, len, -r * p - len);
    });
  }),
  // 六角板狀：中心六角形 + 主幹 + 菱形尖端
  (c, r) => {
    const hex = r * 0.3;
    for (let i = 0; i <= 6; i++) {
      const a = (Math.PI / 3) * i;
      if (i === 0) c.moveTo(Math.sin(a) * hex, -Math.cos(a) * hex);
      else c.lineTo(Math.sin(a) * hex, -Math.cos(a) * hex);
    }
    sixArms(c, r, (c, r) => {
      line(c, 0, -hex, 0, -r * 0.62);
      c.moveTo(0, -r * 0.62);
      c.lineTo(-r * 0.13, -r * 0.8);
      c.lineTo(0, -r);
      c.lineTo(r * 0.13, -r * 0.8);
      c.closePath();
    });
  },
  // 中段 V 形分枝的經典雪花
  (c, r) => sixArms(c, r, (c, r) => {
    line(c, 0, 0, 0, -r);
    line(c, 0, -r * 0.42, -r * 0.3, -r * 0.7);
    line(c, 0, -r * 0.42, r * 0.3, -r * 0.7);
    line(c, 0, -r * 0.18, -r * 0.14, -r * 0.3);
    line(c, 0, -r * 0.18, r * 0.14, -r * 0.3);
  }),
];

const createSprite = (paint) => {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = SPRITE_SIZE;
  const c = sprite.getContext('2d');
  c.translate(SPRITE_SIZE / 2, SPRITE_SIZE / 2);
  paint(c);
  return sprite;
};

export function createFlakeSprites() {
  const crystals = FLAKE_SHAPES.map((shape) => createSprite((c) => {
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3.4;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    // 淡淡的灰藍光暈：在照片上是白色雪花，在淺色底也看得見輪廓
    c.shadowColor = 'rgba(140, 158, 180, 0.6)';
    c.shadowBlur = 3;
    c.beginPath();
    shape(c, SPRITE_SIZE / 2 - 6);
    c.stroke();
  }));

  // 遠景柔焦小雪點
  const dot = createSprite((c) => {
    const r = SPRITE_SIZE / 2;
    const glow = c.createRadialGradient(0, 0, 0, 0, 0, r);
    glow.addColorStop(0, 'rgba(255, 255, 255, 1)');
    glow.addColorStop(0.45, 'rgba(255, 255, 255, 0.8)');
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    c.fillStyle = glow;
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fill();
  });

  return { crystals, dot };
}

// ---------- 春：櫻花 ----------

// 單片花瓣：尖端朝上、末端有櫻花特有的 V 形缺口，根部顏色較深
const tracePetal = (c, r) => {
  c.moveTo(0, r * 0.9);
  c.bezierCurveTo(-r * 0.6, r * 0.45, -r * 0.72, -r * 0.45, -r * 0.3, -r * 0.9);
  c.quadraticCurveTo(-r * 0.13, -r * 0.72, 0, -r * 0.6);
  c.quadraticCurveTo(r * 0.13, -r * 0.72, r * 0.3, -r * 0.9);
  c.bezierCurveTo(r * 0.72, -r * 0.45, r * 0.6, r * 0.45, 0, r * 0.9);
  c.closePath();
};

const PETAL_TINTS = [
  ['#f39bb2', '#fde6ed'],
  ['#f7b3c4', '#fff1f4'],
  ['#ec8aa5', '#fbd9e3'],
];

export function createSakuraSprites() {
  const r = SPRITE_SIZE / 2 - 5;
  const petals = PETAL_TINTS.map(([base, tip]) => createSprite((c) => {
    const fill = c.createLinearGradient(0, r * 0.9, 0, -r * 0.9);
    fill.addColorStop(0, base);
    fill.addColorStop(1, tip);
    c.fillStyle = fill;
    c.shadowColor = 'rgba(190, 90, 120, 0.35)';
    c.shadowBlur = 3;
    c.beginPath();
    tracePetal(c, r);
    c.fill();
  }));

  // 偶爾整朵飄下：五片花瓣圍成一圈，中央一點花蕊
  const blossom = createSprite((c) => {
    c.shadowColor = 'rgba(190, 90, 120, 0.3)';
    c.shadowBlur = 3;
    for (let i = 0; i < 5; i++) {
      c.save();
      c.rotate((Math.PI * 2 * i) / 5);
      c.translate(0, -r * 0.48);
      c.scale(0.5, 0.5);
      const fill = c.createLinearGradient(0, r * 0.9, 0, -r * 0.9);
      fill.addColorStop(0, '#f39bb2');
      fill.addColorStop(1, '#fff1f4');
      c.fillStyle = fill;
      c.beginPath();
      tracePetal(c, r);
      c.fill();
      c.restore();
    }
    c.shadowColor = 'transparent';
    c.fillStyle = '#e0607e';
    c.beginPath();
    c.arc(0, 0, r * 0.14, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#f7d27a';
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6;
      c.beginPath();
      c.arc(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2, r * 0.045, 0, Math.PI * 2);
      c.fill();
    }
  });

  return { petals, blossom };
}

// ---------- 秋：楓葉 ----------

// 五裂楓葉：以極座標畫輪廓，五個尖裂片再加上邊緣細鋸齒；葉柄朝下
const LOBES = [
  { angle: -Math.PI / 2, length: 0.62 },              // 頂端
  { angle: -Math.PI / 2 - 0.95, length: 0.56 },       // 左上
  { angle: -Math.PI / 2 + 0.95, length: 0.56 },       // 右上
  { angle: -Math.PI / 2 - 1.95, length: 0.34 },       // 左下
  { angle: -Math.PI / 2 + 1.95, length: 0.34 },       // 右下
];
const LOBE_WIDTH = 0.72;

const angleDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

const leafRadius = (theta) => {
  let r = 0.28;
  for (const lobe of LOBES) {
    const d = angleDiff(theta, lobe.angle) / LOBE_WIDTH;
    if (d < 1) r += lobe.length * (1 - d) ** 1.6;
  }
  return r + 0.035 * Math.abs(Math.sin(theta * 13));
};

const LEAF_COLORS = [
  ['#e2502f', '#a8291b'],
  ['#ee7f2d', '#c24b1c'],
  ['#efb040', '#c97b20'],
  ['#c93a2c', '#8c2218'],
];

export function createLeafSprites() {
  const r = SPRITE_SIZE / 2 - 4;
  return LEAF_COLORS.map(([light, dark]) => createSprite((c) => {
    const fill = c.createRadialGradient(0, -r * 0.2, r * 0.1, 0, 0, r);
    fill.addColorStop(0, light);
    fill.addColorStop(1, dark);
    c.fillStyle = fill;
    c.shadowColor = 'rgba(90, 30, 10, 0.35)';
    c.shadowBlur = 3;
    c.beginPath();
    const points = 140;
    for (let i = 0; i <= points; i++) {
      const theta = (Math.PI * 2 * i) / points;
      const len = leafRadius(theta) * r;
      const x = Math.cos(theta) * len;
      const y = Math.sin(theta) * len;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.closePath();
    c.fill();
    c.shadowColor = 'transparent';

    // 葉脈與葉柄
    c.strokeStyle = 'rgba(255, 225, 180, 0.45)';
    c.lineWidth = 1.2;
    c.lineCap = 'round';
    c.beginPath();
    for (const lobe of LOBES) {
      const len = (0.3 + lobe.length) * r * 0.85;
      line(c, 0, 0, Math.cos(lobe.angle) * len, Math.sin(lobe.angle) * len);
    }
    c.stroke();
    c.strokeStyle = dark;
    c.lineWidth = 1.8;
    c.beginPath();
    line(c, 0, 0, 0, r * 0.95);
    c.stroke();
  }));
}
