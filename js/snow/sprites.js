// 雪花造型：預先繪製到離屏畫布，動畫時只需貼圖，手機也不卡

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
