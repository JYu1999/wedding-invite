// 四季飄落物：冬雪花 → 春櫻花 → 夏流星 → 秋楓葉，每季各自的生成、移動與繪製方式
// 每顆粒子都是同一個物件，換季時淡出再以新季節的樣子重新出現（見 snow.js）

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const spin = (min, max) => rand(min, max) * (Math.random() < 0.5 ? -1 : 1);

// 飄落：基礎速度 + 左右搖曳，自轉；有 flipSpeed 的（花瓣、楓葉）還會像翻面一樣在空中翻轉
const drift = (p, dt) => {
  p.angle += p.angleSpeed * dt;
  p.x += (Math.sin(p.angle) * p.swayRange + p.speedX) * dt;
  p.y += p.speedY * dt;
  p.rotation += p.rotationSpeed * dt;
  p.flip += p.flipSpeed * dt;
};

const drawSprite = (p, ctx, alpha) => {
  ctx.save();
  ctx.globalAlpha = p.opacity * alpha;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  if (p.flipSpeed) {
    // 用水平縮放模擬翻面，壓到最扁時保留一點寬度，不會整片消失
    const squash = Math.cos(p.flip);
    ctx.scale(Math.sign(squash || 1) * Math.max(Math.abs(squash), 0.15), 1);
  }
  ctx.drawImage(p.sprite, -p.size / 2, -p.size / 2, p.size, p.size);
  ctx.restore();
};

// 飄落物共用的初始位置：一開始散布在整張照片，之後從頂部外生成
const placeFalling = (p, { width, height }, initial, spreadLeft = 0) => {
  p.x = rand(-spreadLeft * width, width);
  p.y = initial ? Math.random() * height : -p.size;
  p.margin = p.size + spreadLeft * width;
  p.angle = Math.random() * Math.PI * 2;
  p.rotation = Math.random() * Math.PI * 2;
  p.flip = Math.random() * Math.PI * 2;
};

// ---------- 冬：雪花 ----------
const winter = {
  name: 'winter',
  share: 1,
  spawn(p, world, { snow }, initial) {
    // 約六成是不同造型的六角結晶，其餘為遠景柔焦小雪點
    const isCrystal = Math.random() < 0.6;
    p.sprite = isCrystal ? pick(snow.crystals) : snow.dot;
    p.size = isCrystal ? rand(9, 21) : rand(3, 7);                // 繪製尺寸 (px)
    p.depositArea = p.size * (isCrystal ? 6 : 4);                  // 落地後增加的積雪量 (px²)
    placeFalling(p, world, initial);
    // 越大的雪花（離鏡頭越近）掉得稍快，營造景深
    p.speedY = isCrystal ? p.size * 0.02 + 0.2 : rand(0.18, 0.33);
    p.speedX = rand(-0.1, 0.1);                                    // 基礎微風橫移
    p.opacity = isCrystal ? rand(0.65, 0.95) : rand(0.35, 0.75);
    p.angleSpeed = rand(0.005, 0.015);                             // 左右擺動頻率
    p.swayRange = rand(0.2, 0.6);                                  // 左右搖曳幅度
    p.rotationSpeed = rand(-0.006, 0.006);                         // 緩慢自轉，方向各異
    p.flipSpeed = 0;
  },
  update: drift,
  draw: drawSprite,
};

// ---------- 春：櫻花，春風往右吹，花瓣邊轉邊翻 ----------
const spring = {
  name: 'spring',
  share: 0.85,
  spawn(p, world, { sakura }, initial) {
    const isBlossom = Math.random() < 0.12;
    p.sprite = isBlossom ? sakura.blossom : pick(sakura.petals);
    p.size = isBlossom ? rand(17, 24) : rand(12, 20);
    p.depositArea = p.size * 3.5;
    // 會往右飄，生成範圍往左多留一些，左半邊才不會空
    placeFalling(p, world, initial, 0.2);
    p.speedY = rand(0.5, 0.9);
    p.speedX = rand(0.12, 0.35);
    p.opacity = rand(0.8, 0.95);
    p.angleSpeed = rand(0.015, 0.03);
    p.swayRange = rand(0.5, 1.1);
    p.rotationSpeed = spin(0.01, 0.035);
    p.flipSpeed = isBlossom ? rand(0.015, 0.03) : rand(0.03, 0.07);
  },
  update: drift,
  draw: drawSprite,
};

// ---------- 夏：流星，又快又直地斜斜劃過，數量少、一顆顆輪流出現 ----------
const METEOR_TAIL = 'rgba(190, 215, 255, 0)';

const summer = {
  name: 'summer',
  share: 0.25,
  instant: true,                 // 自己有劃入的淡入，換季時不再額外淡入
  spawn(p, { width, height }, { snow }, initial) {
    p.delay = initial ? rand(0, 150) : rand(40, 260);          // 幾幀之後才出現
    p.sprite = snow.dot;
    p.size = rand(2, 3.4);                                      // 流星頭的粗細
    p.depositArea = 40;
    const speed = rand(7, 11);
    const heading = rand(0.92, 1.12);                           // 往左下，與水平約 53°～64°
    p.speedX = -Math.cos(heading) * speed;
    p.speedY = Math.sin(heading) * speed;
    p.speed = speed;
    p.tailMax = rand(70, 150);
    p.tail = 0;
    p.margin = p.tailMax;
    p.x = rand(width * 0.2, width * 1.1);
    p.y = rand(-10, height * 0.45);
    p.opacity = rand(0.75, 1);
    p.age = 0;
  },
  update(p, dt) {
    if (p.delay > 0) {
      p.delay -= dt;
      return;
    }
    p.age += dt;
    p.x += p.speedX * dt;
    p.y += p.speedY * dt;
    p.tail = Math.min(p.tailMax, p.tail + p.speed * dt);
  },
  draw(p, ctx, alpha) {
    if (p.delay > 0) return;
    const a = p.opacity * alpha * Math.min(p.age / 8, 1);
    const tx = p.x - (p.speedX / p.speed) * p.tail;
    const ty = p.y - (p.speedY / p.speed) * p.tail;
    ctx.save();
    const trail = ctx.createLinearGradient(p.x, p.y, tx, ty);
    trail.addColorStop(0, `rgba(255, 252, 240, ${a})`);
    trail.addColorStop(0.25, `rgba(225, 235, 255, ${a * 0.55})`);
    trail.addColorStop(1, METEOR_TAIL);
    ctx.strokeStyle = trail;
    ctx.lineWidth = p.size * 0.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    // 流星頭的光暈
    ctx.globalAlpha = a;
    const glow = p.size * 4;
    ctx.drawImage(p.sprite, p.x - glow / 2, p.y - glow / 2, glow, glow);
    ctx.restore();
  },
  hidden: (p) => p.delay > 0,
};

// ---------- 秋：楓葉，比花瓣大、掉得快一點，大幅度左右飄盪 ----------
const autumn = {
  name: 'autumn',
  share: 0.55,
  spawn(p, world, { leaves }, initial) {
    p.sprite = pick(leaves);
    p.size = rand(22, 34);
    p.depositArea = p.size * 3;
    placeFalling(p, world, initial);
    p.speedY = rand(0.75, 1.2);
    p.speedX = rand(-0.3, 0.3);
    p.opacity = rand(0.85, 1);
    p.angleSpeed = rand(0.012, 0.025);
    p.swayRange = rand(0.9, 1.8);
    p.rotationSpeed = spin(0.015, 0.045);
    p.flipSpeed = rand(0.025, 0.06);
  },
  update: drift,
  draw: drawSprite,
};

export const SEASONS = [winter, spring, summer, autumn];
