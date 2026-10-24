// 帶麻吉去公園：路上的障礙物與道具
// 障礙物：路邊停的汽車（有黃色計程車）、騎樓前一整排機車、路樹、住戶擺出來的盆栽、三角錐、晃來晃去的野狗，
// 還有對向開過來的汽車、機車（開過來前會按喇叭）
// 道具：❤️ 補一條命、⭐ 一陣子無敵（撞到的東西會被撞飛）
// 整場的配置一開始就排好（只是資料），走到看得到的距離才建模，走過去就拆掉

import * as THREE from './three.js';
import { lambert, mesh, blobShadow, canvasTexture, disposeTree, keep, bake, rand, pick, chance } from './kit.js';
import { createDog } from './characters.js';
import { ROAD_HALF, WALK_HALF } from './street.js';

const SHOW_AHEAD = 95;
const DROP_BEHIND = 14;
const GRAVITY = 22;

// ---------- 共用幾何 ----------

const geos = new Map();
const geo = (key, make) => {
  if (!geos.has(key)) geos.set(key, keep(make()));
  return geos.get(key);
};
const box = (w, h, d) => geo(`box${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const cyl = (rt, rb, h, seg = 16) => geo(`cyl${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
const wheel = (r, w) => geo(`wheel${r},${w}`, () => new THREE.CylinderGeometry(r, r, w, 18).rotateZ(Math.PI / 2));
const ball = (r, detail = 1) => geo(`ico${r},${detail}`, () => new THREE.IcosahedronGeometry(r, detail));
const sphere = (r) => geo(`sph${r}`, () => new THREE.SphereGeometry(r, 16, 12));
const cone = (r, h, seg = 16) => geo(`cone${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg));

const flat = new Map();
const flatMat = (color) => {
  if (!flat.has(color)) flat.set(color, new THREE.MeshLambertMaterial({ color, flatShading: true }));
  return flat.get(color);
};

// ---------- 模型（前方都是 −z） ----------

const CAR_COLORS = [0xf3f3f0, 0xb9bec4, 0x2f3a4a, 0xa8322d, 0x3f6fa8, 0x6b6f72];
const TAXI = 0xf6c31a;

function createCar() {
  const taxi = chance(0.3);
  const color = taxi ? TAXI : pick(CAR_COLORS);
  const g = new THREE.Group();
  const paint = lambert(color);
  g.add(mesh(box(1.8, 0.62, 4.2), paint, 0, 0.62, 0));
  g.add(mesh(box(1.6, 0.6, 2.3), lambert(0x34424f), 0, 1.22, 0.15));
  g.add(mesh(box(1.64, 0.1, 2.0), paint, 0, 1.55, 0.2));
  g.add(mesh(box(1.84, 0.2, 0.2), lambert(0x8e9296), 0, 0.42, -2.1));
  g.add(mesh(box(1.84, 0.2, 0.2), lambert(0x8e9296), 0, 0.42, 2.1));
  for (const s of [-1, 1]) {
    g.add(mesh(box(0.36, 0.14, 0.06), lambert(0xfff4c8), s * 0.6, 0.72, -2.11));
    g.add(mesh(box(0.36, 0.14, 0.06), lambert(0xd8322b), s * 0.62, 0.72, 2.11));
    for (const z of [-1.35, 1.35]) g.add(mesh(wheel(0.34, 0.26), lambert(0x1e1e1e), s * 0.85, 0.34, z));
  }
  if (taxi) {
    g.add(mesh(box(0.6, 0.22, 0.28), lambert(0xfafafa), 0, 1.71, 0.2));
  }
  g.add(blobShadow(2.3, 4.8, 0.38));
  return g;
}

const SCOOTER_COLORS = [0xf2f2ee, 0xc8342c, 0x2f5f9e, 0xb5b9bd, 0x2a2a2a, 0x7fb2a8, 0xe7c5cf];

function createScooter(rider = false) {
  const g = new THREE.Group();
  const paint = lambert(pick(SCOOTER_COLORS));
  const dark = lambert(0x262626);
  g.add(mesh(wheel(0.25, 0.12), dark, 0, 0.25, -0.62));
  g.add(mesh(wheel(0.25, 0.12), dark, 0, 0.25, 0.62));
  g.add(mesh(box(0.36, 0.12, 0.7), paint, 0, 0.34, 0.02));
  g.add(mesh(box(0.42, 0.38, 0.72), paint, 0, 0.56, 0.36));
  g.add(mesh(box(0.38, 0.12, 0.64), dark, 0, 0.8, 0.33));
  const shield = mesh(box(0.42, 0.74, 0.14), paint, 0, 0.64, -0.42);
  shield.rotation.x = -0.25;
  g.add(shield);
  g.add(mesh(box(0.72, 0.06, 0.06), dark, 0, 1.06, -0.5));
  g.add(mesh(box(0.3, 0.18, 0.2), paint, 0, 1.0, -0.53));
  for (const s of [-1, 1]) g.add(mesh(sphere(0.05), lambert(0xd8dde0), s * 0.32, 1.22, -0.52));
  if (rider) {
    const jacket = lambert(pick([0x3b5d8f, 0x8f3b3b, 0x4f4f4f, 0x6b8f3b]));
    g.add(mesh(box(0.42, 0.55, 0.3), jacket, 0, 1.18, 0.22));
    g.add(mesh(sphere(0.2), lambert(pick([0xf2f2ee, 0xd8322b, 0x2f5f9e, 0xffd23f])), 0, 1.62, 0.18));
    g.add(mesh(box(0.3, 0.12, 0.5), lambert(0x30343a), 0, 0.92, -0.05));
  }
  g.add(blobShadow(0.7, 1.7, 0.35));
  return g;
}

// 路樹（公園也用）：樹幹加幾團樹冠，路邊的有方形樹穴
export function createTree({ planter = true } = {}) {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.13, 0.19, 2.4, 10), lambert(0x76563a), 0, 1.2, 0));
  const greens = [0x5f9a48, 0x4f8a3e, 0x6eaa52];
  const crowns = [[0, 2.9, 0, 1.05], [0.55, 2.55, 0.2, 0.75], [-0.5, 2.6, -0.2, 0.8], [0.1, 3.5, 0.1, 0.7]];
  for (const [x, y, z, r] of crowns) g.add(mesh(ball(r), flatMat(pick(greens)), x, y, z));
  if (planter) {
    g.add(mesh(box(1.1, 0.22, 1.1), lambert(0xb7b2a8), 0, 0.11, 0));
    g.add(mesh(box(0.9, 0.05, 0.9), lambert(0x6b4f36), 0, 0.22, 0));
  }
  g.add(blobShadow(2.2, 2.2, 0.25));
  return g;
}

const POT_COLORS = [0xb5653d, 0x4a7bb7, 0xf0eee8, 0x34383c, 0x8a5a3c];

function createPot() {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.34, 0.25, 0.52), lambert(pick(POT_COLORS)), 0, 0.26, 0));
  g.add(mesh(cyl(0.31, 0.31, 0.04), lambert(0x5a4030), 0, 0.5, 0));
  const kind = Math.floor(Math.random() * 3);
  if (kind === 0) {
    // 圓圓一叢
    for (const [x, y, z, r] of [[0, 0.82, 0, 0.36], [0.2, 0.7, 0.1, 0.25], [-0.2, 0.72, -0.08, 0.26]]) {
      g.add(mesh(ball(r), flatMat(pick([0x4f8a3e, 0x67a24c])), x, y, z));
    }
  } else if (kind === 1) {
    // 虎尾蘭：一片片直直的葉子
    for (let i = 0; i < 6; i++) {
      const leaf = mesh(cone(0.07, 0.9, 6), flatMat(i % 2 ? 0x3d6e3a : 0x5b8a3a), Math.cos(i) * 0.12, 0.92, Math.sin(i) * 0.12);
      leaf.rotation.set(Math.sin(i * 2) * 0.2, 0, Math.cos(i * 2) * 0.2);
      g.add(leaf);
    }
  } else {
    // 小樹盆景
    g.add(mesh(cyl(0.04, 0.05, 0.5, 8), lambert(0x76563a), 0, 0.75, 0));
    g.add(mesh(ball(0.38), flatMat(0x5f9a48), 0, 1.1, 0));
  }
  g.add(blobShadow(0.9, 0.9, 0.3));
  return g;
}

function createCone() {
  const g = new THREE.Group();
  g.add(mesh(box(0.55, 0.05, 0.55), lambert(0x2a2a2a), 0, 0.025, 0));
  g.add(mesh(cone(0.24, 0.72), lambert(0xf26b1d), 0, 0.4, 0));
  g.add(mesh(cyl(0.12, 0.165, 0.14), lambert(0xf7f7f2), 0, 0.42, 0));
  g.add(blobShadow(0.65, 0.65, 0.3));
  return g;
}

// ---------- 道具 ----------

let glowTex = null;
function glowSprite(color) {
  glowTex ??= canvasTexture(64, 64, (g) => {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sprite.scale.setScalar(1.6);
  return sprite;
}

const extrude = (shape) => new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3, curveSegments: 16 }).center();

const heartGeo = () => geo('heart', () => {
  const s = new THREE.Shape();
  s.moveTo(0, -0.36);
  s.bezierCurveTo(-0.1, -0.26, -0.46, -0.04, -0.46, 0.16);
  s.bezierCurveTo(-0.46, 0.4, -0.18, 0.47, 0, 0.27);
  s.bezierCurveTo(0.18, 0.47, 0.46, 0.4, 0.46, 0.16);
  s.bezierCurveTo(0.46, -0.04, 0.1, -0.26, 0, -0.36);
  return extrude(s);
});

const starGeo = () => geo('star', () => {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.2 : 0.46;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return extrude(s);
});

function createPickup(type) {
  const g = new THREE.Group();
  const spin = new THREE.Group();
  const material = type === 'heart'
    ? new THREE.MeshLambertMaterial({ color: 0xe8384f, emissive: 0x5a0d16 })
    : new THREE.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x6b4d00 });
  spin.add(new THREE.Mesh(type === 'heart' ? heartGeo() : starGeo(), material));
  spin.add(glowSprite(type === 'heart' ? 0xff8a9a : 0xfff0a0));
  spin.position.y = 0.95;
  g.add(spin);
  g.add(blobShadow(0.7, 0.7, 0.22));
  g.userData.spin = spin;
  return g;
}

// ---------- 碰撞形狀：以 (x, d) 為中心的長方形，hw 左右半寬、hd 前後半長 ----------

const SPEC = {
  car: { hw: 0.92, hd: 2.12 },
  scooter: { hw: 0.36, hd: 0.9 },
  tree: { hw: 0.5, hd: 0.5 },
  pot: { hw: 0.33, hd: 0.33 },
  cone: { hw: 0.26, hd: 0.26 },
  stray: { hw: 0.24, hd: 0.45 },
};

function overlaps(o, x, d, r) {
  const cx = Math.max(o.x - o.hw, Math.min(x, o.x + o.hw));
  const cd = Math.max(o.d - o.hd, Math.min(d, o.d + o.hd));
  return (x - cx) ** 2 + (d - cd) ** 2 < r * r;
}

// ---------- 整場的障礙物 ----------

export function createObstacles(scene, { onHonk } = {}) {
  const root = new THREE.Group();
  scene.add(root);
  let plan = [];      // 還沒建模的（依 d 排序）
  let live = [];      // 建好模、在場上的
  let pickups = [];

  const reset = () => {
    [...root.children].forEach(disposeTree);
    plan = [];
    live = [];
    pickups = [];
  };

  // 一個障礙物（資料）；moving 的會自己動
  const item = (type, x, d, extra = {}) => ({ type, x, d, ...SPEC[type], ...extra });

  // 一排：盡量留一條至少 2.6 公尺寬的路給人和狗過
  const MIN_GAP = 2.6;
  const freeGap = (spans) => {
    const sorted = [...spans].sort((a, b) => a[0] - b[0]);
    let edge = -WALK_HALF;
    let best = 0;
    for (const [a, b] of sorted) {
      best = Math.max(best, a - edge);
      edge = Math.max(edge, b);
    }
    return Math.max(best, WALK_HALF - edge);
  };

  const candidates = {
    car: () => {
      const s = chance(0.5) ? -1 : 1;
      return [item('car', s * (ROAD_HALF - 1.05), 0, { flip: chance(0.5) })];
    },
    scooters: () => {
      const s = chance(0.5) ? -1 : 1;
      const n = 2 + Math.floor(Math.random() * 3);
      // 騎樓前一排：機車垂直路邊停，整排算一個長方形
      return [item('scooter', s * 4.75, 0, { side: s, count: n, hw: 0.9, hd: n * 0.38 })];
    },
    tree: () => {
      const s = chance(0.5) ? -1 : 1;
      return [item('tree', s * 4.75, 0)];
    },
    pots: () => {
      const n = 1 + Math.floor(Math.random() * 3);
      const x0 = rand(-WALK_HALF + 0.4, WALK_HALF - 0.4 - (n - 1) * 0.75);
      return Array.from({ length: n }, (_, i) => item('pot', x0 + i * 0.75, rand(-0.15, 0.15)));
    },
    cones: () => {
      const n = 2 + Math.floor(Math.random() * 2);
      const x0 = rand(-ROAD_HALF + 0.5, ROAD_HALF - 0.5 - (n - 1) * 1.1);
      return Array.from({ length: n }, (_, i) => item('cone', x0 + i * 1.1, 0));
    },
  };
  const WEIGHTS = [['car', 2], ['scooters', 2], ['tree', 1.4], ['pots', 2.2], ['cones', 1.2]];
  const pickType = () => {
    let r = Math.random() * WEIGHTS.reduce((s, [, w]) => s + w, 0);
    for (const [type, w] of WEIGHTS) if ((r -= w) < 0) return type;
    return 'pots';
  };

  const planRow = (d, p) => {
    const spans = [];
    const want = 1 + (chance(0.35 + 0.4 * p) ? 1 : 0) + (chance(0.12 + 0.35 * p) ? 1 : 0);
    let placed = 0;
    for (let tries = 0; tries < want * 4 && placed < want; tries++) {
      const group = candidates[pickType()]();
      const groupSpans = group.map((o) => [o.x - o.hw - 0.15, o.x + o.hw + 0.15]);
      const clash = groupSpans.some(([a, b]) => spans.some(([c, e]) => a < e && c < b));
      if (clash || freeGap([...spans, ...groupSpans]) < MIN_GAP) continue;
      spans.push(...groupSpans);
      group.forEach((o) => plan.push({ ...o, d: d + o.d }));
      placed++;
    }
    // 野狗：在路上左右晃，越後面越常出現
    if (chance(0.1 + 0.22 * p)) {
      plan.push(item('stray', rand(-3.5, 3.5), d + rand(3, 5), { vx: (chance(0.5) ? -1 : 1) * rand(1.2, 2.2) }));
    }
  };

  // 正式開始：從 start 排到 end（公園），越後面越密
  const planRace = (start, end) => {
    const rows = [];
    for (let d = start + 30; d < end - 14; d += rand(10, 14) - (d - start) / (end - start) * 4.5) {
      rows.push(d);
      planRow(d, (d - start) / (end - start));
    }
    // 道具放在兩排中間，比較不會跟障礙物疊在一起
    const between = (target) => {
      const i = rows.findIndex((r) => r > target);
      return i > 0 ? (rows[i - 1] + rows[i]) / 2 : target;
    };
    for (let d = start + rand(90, 130); d < end - 30; d += rand(95, 140)) {
      plan.push({ type: 'heart', x: rand(-3.8, 3.8), d: between(d), pickup: true });
    }
    for (let d = start + rand(160, 220); d < end - 30; d += rand(170, 240)) {
      plan.push({ type: 'star', x: rand(-3.5, 3.5), d: between(d), pickup: true });
    }
    plan.sort((a, b) => a.d - b.d);
  };

  // 教學用：直接放指定的東西
  const place = (type, x, d) => {
    plan.push(type === 'heart' || type === 'star' ? { type, x, d, pickup: true } : item(type, x, d));
    plan.sort((a, b) => a.d - b.d);
  };

  // 對向來車：從遠處開過來，靠近時按喇叭
  const spawnTraffic = (d) => {
    const car = chance(0.55);
    const o = car
      ? item('car', -1.0, d, { vd: -rand(4.5, 6), flip: true, moving: true })
      : item('scooter', rand(-2.6, -0.8), d, { vd: -rand(5, 7), moving: true, rider: true, weave: rand(0, 6) });
    o.hd = car ? 2.12 : 0.9;
    o.hw = car ? 0.92 : 0.36;
    instantiate(o);
  };

  function instantiate(o) {
    let model;
    switch (o.type) {
      case 'car': model = createCar(); if (o.flip) model.rotation.y = Math.PI; break;
      case 'scooter':
        if (o.count) {
          model = new THREE.Group();
          for (let i = 0; i < o.count; i++) {
            const s = createScooter();
            s.position.z = (i - (o.count - 1) / 2) * 0.76;
            s.rotation.y = o.side * Math.PI / 2 + rand(-0.12, 0.12);
            model.add(s);
          }
        } else {
          model = createScooter(o.rider);
          model.rotation.y = o.vd < 0 ? Math.PI : 0;
        }
        break;
      case 'tree': model = createTree(); break;
      case 'pot': model = createPot(); break;
      case 'cone': model = createCone(); break;
      case 'stray': {
        const dog = createDog({ stray: true });
        dog.root.scale.setScalar(0.88);
        o.dog = dog;
        model = dog.root;
        break;
      }
      default: model = createPickup(o.type);
    }
    // 不會自己動的障礙物合併成幾個網格（野狗會跑、道具會轉，不合併）
    if (!o.pickup && o.type !== 'stray') bake(model);
    model.position.set(o.x, 0, -o.d);
    o.model = model;
    root.add(model);
    (o.pickup ? pickups : live).push(o);
  }

  const remove = (o) => {
    disposeTree(o.model);
    o.gone = true;
  };

  // 撞飛：無敵時或被車撞到的盆栽、三角錐
  const knock = (o, fromX) => {
    if (o.flying) return;
    o.flying = { vx: (o.x - fromX >= 0 ? 1 : -1) * rand(3, 6), vy: rand(6, 9), vd: rand(6, 10), spin: rand(-12, 12), t: 0 };
  };

  // 人或狗（圓心 x, d、半徑 r）撞到哪個障礙物
  const hit = (x, d, r) => live.find((o) => !o.flying && !o.gone && Math.abs(o.d - d) < 3 && overlaps(o, x, d, r));
  const takePickup = (x, d, r) => {
    const p = pickups.find((o) => !o.gone && Math.abs(o.d - d) < 1.5 && (o.x - x) ** 2 + (o.d - d) ** 2 < (r + 0.5) ** 2);
    if (p) remove(p);
    return p;
  };

  // 被撞到的東西晃一下
  const wobble = (o) => { o.wobble = 0.5; };

  const update = (dt, viewD, time) => {
    while (plan.length && plan[0].d < viewD + SHOW_AHEAD) instantiate(plan.shift());

    for (const o of live) {
      if (o.gone) continue;
      if (o.flying) {
        const f = o.flying;
        f.t += dt;
        f.vy -= GRAVITY * dt;
        o.x += f.vx * dt;
        o.d += f.vd * dt;
        o.model.position.set(o.x, Math.max(0, o.model.position.y + f.vy * dt), -o.d);
        o.model.rotation.x += f.spin * dt;
        o.model.rotation.z += f.spin * 0.7 * dt;
        if (f.t > 1.4) remove(o);
        continue;
      }
      if (o.moving) {
        o.d += o.vd * dt;
        if (o.weave != null) o.x += Math.sin(time * 1.6 + o.weave) * 0.6 * dt;
        o.model.position.set(o.x, 0, -o.d);
        if (!o.honked && o.d - viewD < 40) {
          o.honked = true;
          onHonk?.(o);
        }
        // 對向車道上的盆栽、三角錐會被撞飛，野狗會跳開
        for (const other of live) {
          if (other === o || other.gone || other.flying || other.moving) continue;
          if (Math.abs(other.d - o.d) > o.hd + 1.5 || Math.abs(other.x - o.x) > o.hw + other.hw) continue;
          if (other.type === 'pot' || other.type === 'cone') knock(other, o.x);
          else if (other.type === 'stray') other.vx = (other.x > o.x ? 1 : -1) * 4;
        }
      }
      if (o.type === 'stray') {
        o.x += o.vx * dt;
        if (Math.abs(o.x) > WALK_HALF - 0.6) {
          o.x = Math.sign(o.x) * (WALK_HALF - 0.6);
          o.vx = -Math.sign(o.x) * rand(1.2, 2.2);
        }
        o.model.position.x = o.x;
        o.model.rotation.y = o.vx > 0 ? -Math.PI / 2 : Math.PI / 2;
        o.dog.animate(dt, { speed: Math.abs(o.vx) * 1.4, happy: 0.3 });
      }
      if (o.wobble > 0) {
        o.wobble = Math.max(0, o.wobble - dt);
        o.model.rotation.z = Math.sin(o.wobble * 40) * o.wobble * 0.25;
      }
      if (o.d < viewD - DROP_BEHIND) remove(o);
    }
    for (const p of pickups) {
      if (p.gone) continue;
      const spin = p.model.userData.spin;
      spin.rotation.y = time * 2.4;
      spin.position.y = 0.95 + Math.sin(time * 3 + p.d) * 0.12;
      if (p.d < viewD - DROP_BEHIND) remove(p);
    }
    live = live.filter((o) => !o.gone);
    pickups = pickups.filter((o) => !o.gone);
  };

  return { reset, planRace, place, spawnTraffic, update, hit, takePickup, knock, wobble };
}
