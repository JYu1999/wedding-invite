// 帶麻吉去公園：台灣街景
// 兩線道柏油路、紅線、人行道；兩旁是有騎樓的透天厝／公寓：磁磚外牆、鐵窗、冷氣機、直式招牌、頂樓水塔和鐵皮加蓋
// 左邊一排電線桿拉著電線；終點是公園大門和草地
// 街景一段一段（CHUNK 公尺）生成，走過去的就拆掉，手機上也只畫看得到的範圍
// 座標：d 是往前走的距離（three.js 的 z = −d），x 往右

import * as THREE from './three.js';
import { lambert, mesh, canvasTexture, repeatFace, rand, pick, chance, disposeTree, bake, SIGN_FONT } from './kit.js';
import { createTree } from './obstacles.js';

export const ROAD_HALF = 4;        // 柏油路半寬（路緣石在這裡）
export const WALK_HALF = 5.4;      // 人和狗走得到的範圍（含人行道）
const FRONT = 6.2;                 // 騎樓柱子、樓上外牆的位置
const SHOP = 8.6;                  // 一樓店面（騎樓內側）
const BAY = 2.6;                   // 外牆一格窗戶的寬
const FLOOR = 3;                   // 一層樓高
const GROUND = 3.3;                // 一樓（騎樓）高
const CHUNK = 24;
const AHEAD = 120;
const BEHIND = 24;
const POLE_GAP = 32;

const TILES = ['#e8dcc6', '#d8d4cc', '#efe9df', '#d6b3a8', '#bfd0c9', '#dcc79f', '#b7c3cf', '#e3cfc0'];
const SIGNS = [
  '早餐店', '鹹酥雞', '牙醫診所', '機車行', '手搖飲', '自助餐', '牛肉麵', '藥局', '眼鏡行', '水電行',
  '補習班', '婚紗攝影', '寵物美容', '五金行', '滷肉飯', '便當', '豆花', '麵線', '中醫診所', '洗衣店',
];
const SIGN_COLORS = [
  ['#d62f2f', '#fff6d6'], ['#ffd23f', '#c0261f'], ['#1f6fb5', '#ffffff'], ['#2e8b57', '#ffffff'],
  ['#ffffff', '#d0312d'], ['#f28c28', '#ffffff'], ['#6a3fa0', '#ffe169'], ['#14335c', '#ffd23f'],
];

// ---------- 貼圖（第一次用到時才畫，之後共用） ----------

let tex = null;
function textures() {
  if (tex) return tex;
  // 樓上外牆：磁磚底、窗戶、白色鐵窗
  const facade = TILES.map((tile) => canvasTexture(128, 148, (g, w, h) => {
    g.fillStyle = tile;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.06)';
    for (let y = 0; y < h; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let x = 0; x < w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    // 窗戶
    g.fillStyle = '#3e4c58';
    g.fillRect(22, 34, 84, 70);
    g.fillStyle = 'rgba(190,220,240,0.35)';
    g.fillRect(24, 36, 38, 66);
    // 鐵窗：外凸的格柵
    g.strokeStyle = '#f4f4f0';
    g.lineWidth = 3;
    g.strokeRect(18, 30, 92, 78);
    for (let x = 30; x < 110; x += 12) { g.beginPath(); g.moveTo(x, 30); g.lineTo(x, 108); g.stroke(); }
    g.beginPath(); g.moveTo(18, 69); g.lineTo(110, 69); g.stroke();
    // 窗台
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(16, 108, 96, 5);
  }, true));

  // 一樓店面：鐵捲門或亮著燈的玻璃門
  const shop = [
    canvasTexture(128, 128, (g, w, h) => {
      g.fillStyle = '#9ea4a8';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.12)';
      for (let y = 8; y < h; y += 7) g.fillRect(6, y, w - 12, 2);
      g.fillStyle = '#5e6266';
      g.fillRect(0, 0, w, 10);
    }, true),
    canvasTexture(128, 128, (g, w, h) => {
      g.fillStyle = '#6b5a48';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffe9b8';
      g.fillRect(10, 20, w - 20, h - 20);
      g.fillStyle = '#d9b77a';
      for (let y = 40; y < h; y += 24) g.fillRect(14, y, w - 28, 6);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(14, 22, 26, h - 24);
    }, true),
    canvasTexture(128, 128, (g, w, h) => {
      g.fillStyle = '#41505a';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#cfe6ef';
      g.fillRect(8, 16, 52, h - 16);
      g.fillRect(68, 16, 52, h - 16);
      g.fillStyle = '#e04a3c';
      g.fillRect(0, 0, w, 14);
    }, true),
  ];

  // 人行道、騎樓地磚
  const paving = canvasTexture(64, 64, (g, w, h) => {
    g.fillStyle = '#c98e72';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ab7058';
    g.lineWidth = 2;
    g.strokeRect(1, 1, 31, 31); g.strokeRect(33, 1, 30, 31); g.strokeRect(1, 33, 31, 30); g.strokeRect(33, 33, 30, 30);
  }, true);
  const arcade = canvasTexture(64, 64, (g, w, h) => {
    g.fillStyle = '#d7cbbb';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#bfb19e';
    g.lineWidth = 2;
    g.strokeRect(1, 1, 62, 62);
  }, true);
  const asphalt = canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#5a5e63';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      g.fillStyle = `rgba(${chance(0.5) ? '255,255,255' : '0,0,0'},${rand(0.03, 0.08)})`;
      g.fillRect(rand(0, w), rand(0, h), 2, 2);
    }
  }, true);

  // 招牌：直式（字由上往下）與橫式
  const vertical = SIGNS.map((text) => {
    const [bg, fg] = pick(SIGN_COLORS);
    return canvasTexture(80, 80 * text.length + 40, (g, w, h) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = fg;
      g.lineWidth = 4;
      g.strokeRect(6, 6, w - 12, h - 12);
      g.fillStyle = fg;
      g.font = `900 58px ${SIGN_FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      [...text].forEach((ch, i) => g.fillText(ch, w / 2, 20 + 80 * i + 42));
    });
  });
  const horizontal = SIGNS.map((text) => {
    const [bg, fg] = pick(SIGN_COLORS);
    return canvasTexture(512, 112, (g, w, h) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      g.fillStyle = fg;
      g.font = `900 70px ${SIGN_FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, w / 2, h / 2 + 4);
    });
  });

  // 終點：公園大門的牌子
  const gate = canvasTexture(512, 160, (g, w, h) => {
    g.fillStyle = '#2f6b3a';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f3e3b3';
    g.lineWidth = 8;
    g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#fff6dc';
    g.font = `900 92px ${SIGN_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('麻吉公園', w / 2, h / 2 + 4);
  });
  const finish = canvasTexture(64, 64, (g) => {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      g.fillStyle = (x + y) % 2 ? '#222' : '#fafafa';
      g.fillRect(x * 16, y * 16, 16, 16);
    }
  }, true);

  tex = { facade, shop, paving, arcade, asphalt, vertical, horizontal, gate, finish };
  return tex;
}

const mat = new Map();
function texMat(texture) {
  if (!mat.has(texture)) mat.set(texture, new THREE.MeshLambertMaterial({ map: texture }));
  return mat.get(texture);
}

// ---------- 建築 ----------

// side：−1 左、1 右；d0 起點、bays 幾格寬
function building(side, d0, bays) {
  const t = textures();
  const g = new THREE.Group();
  const w = bays * BAY;
  const floors = Math.floor(rand(2, 5.99));
  const h = floors * FLOOR;
  const depth = 6;
  const zc = -(d0 + w / 2);

  // 樓上：外牆一格一格的窗
  const facade = t.facade[Math.floor(Math.random() * t.facade.length)];
  const wallMat = texMat(facade);
  const upperGeo = repeatFace(repeatFace(new THREE.BoxGeometry(depth, h, w), side > 0 ? 1 : 0, bays, floors), 4, depth / BAY, floors);
  const upper = mesh(upperGeo, wallMat, side * (FRONT + depth / 2), GROUND + h / 2, zc);
  g.add(upper);

  // 一樓店面（往內縮，前面是騎樓）
  const shopGeo = repeatFace(new THREE.BoxGeometry(0.2, GROUND, w), side > 0 ? 1 : 0, bays, 1);
  g.add(mesh(shopGeo, texMat(pick(t.shop)), side * SHOP, GROUND / 2, zc));
  // 隔壁之間的牆、騎樓柱子
  g.add(mesh(new THREE.BoxGeometry(SHOP - FRONT, GROUND, 0.25), lambert(0xcfc6b8), side * (FRONT + SHOP) / 2, GROUND / 2, -d0));
  g.add(mesh(new THREE.BoxGeometry(0.55, GROUND, 0.55), wallMat, side * (FRONT + 0.27), GROUND / 2, -d0 - 0.3));
  // 騎樓地板、天花板
  const floorGeo = new THREE.PlaneGeometry(SHOP - WALK_HALF, w).rotateX(-Math.PI / 2);
  const uv = floorGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * w / 1.2);
  g.add(mesh(floorGeo, texMat(t.arcade), side * (WALK_HALF + SHOP) / 2, 0.06, zc));

  // 騎樓上方的橫式招牌：白色底座加上朝馬路的字面
  if (chance(0.75)) {
    const sw = w * rand(0.65, 0.9);
    g.add(mesh(new THREE.BoxGeometry(0.16, 0.85, sw), lambert(0xeeeeee), side * (FRONT - 0.12), GROUND + 0.2, zc));
    const face = mesh(new THREE.PlaneGeometry(sw, 0.85).rotateY(-side * Math.PI / 2), texMat(pick(t.horizontal)), side * (FRONT - 0.205), GROUND + 0.2, zc);
    g.add(face);
  }
  // 直式招牌：伸出外牆，正面朝走過來的人
  if (chance(0.7)) {
    const i = Math.floor(Math.random() * t.vertical.length);
    const len = SIGNS[i].length;
    const sh = len * 0.9 + 0.4;
    const y = Math.min(GROUND + 0.6 + sh / 2 + rand(0, Math.max(0, h - sh - 1.2)), GROUND + h - sh / 2);
    const z = -(d0 + rand(0.6, w - 0.6));
    g.add(mesh(new THREE.BoxGeometry(0.9, sh, 0.18), lambert(0xe9e9e9), side * (FRONT - 0.5), y, z));
    g.add(mesh(new THREE.PlaneGeometry(0.9, sh), texMat(t.vertical[i]), side * (FRONT - 0.5), y, z + 0.091));
  }
  // 冷氣機
  const ac = lambert(0xf2f2ee);
  for (let i = 0; i < floors; i++) {
    if (!chance(0.55)) continue;
    const bay = Math.floor(Math.random() * bays);
    g.add(mesh(new THREE.BoxGeometry(0.4, 0.5, 0.75), ac, side * (FRONT - 0.2), GROUND + i * FLOOR + 0.55, -(d0 + bay * BAY + BAY / 2)));
  }
  // 頂樓：水塔、鐵皮加蓋
  const roof = GROUND + h;
  if (chance(0.45)) {
    g.add(mesh(new THREE.BoxGeometry(depth * 0.7, 2.3, w * rand(0.5, 0.85)), lambert(pick([0x6f90b3, 0x9aa3a8, 0x7fa28c])), side * (FRONT + depth * 0.6), roof + 1.15, zc));
  }
  const tanks = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < tanks; i++) {
    const tank = mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.2, 16), lambert(pick([0xc9ced3, 0x3d7cc9, 0xe8e2d0])), side * (FRONT + rand(1.2, 4.5)), roof + 1.2, -(d0 + rand(0.8, w - 0.8)));
    g.add(tank);
    g.add(mesh(new THREE.BoxGeometry(1.1, 0.6, 1.1), lambert(0x8d8a84), tank.position.x, roof + 0.3, tank.position.z));
  }
  return g;
}

// ---------- 道路 ----------

function roadChunk(d0, len) {
  const t = textures();
  const g = new THREE.Group();
  const zc = -(d0 + len / 2);
  const plane = (w, l, material, x, y = 0, repeatU = 1, repeatV = 1) => {
    const geo = new THREE.PlaneGeometry(w, l).rotateX(-Math.PI / 2);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * repeatU, uv.getY(i) * repeatV);
    g.add(mesh(geo, material, x, y, zc));
  };
  plane(ROAD_HALF * 2, len, texMat(t.asphalt), 0, 0, 2, len / 4);
  for (const s of [-1, 1]) {
    plane(FRONT + 0.3 - ROAD_HALF, len, texMat(t.paving), s * (ROAD_HALF + FRONT + 0.3) / 2, 0.1, 3, len / 0.9);
    // 路緣石與紅線
    g.add(mesh(new THREE.BoxGeometry(0.18, 0.12, len), lambert(0xc9c3b8), s * ROAD_HALF, 0.06, zc));
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.01, len), lambert(0xc23b31), s * (ROAD_HALF - 0.25), 0.012, zc));
  }
  // 中線：白色虛線
  for (let d = Math.ceil(d0 / 6) * 6; d < d0 + len; d += 6) {
    g.add(mesh(new THREE.BoxGeometry(0.14, 0.01, 3), lambert(0xf2f2ec), 0, 0.012, -(d + 1.5)));
  }
  // 斑馬線
  if (chance(0.25)) {
    const at = d0 + rand(4, len - 6);
    for (let x = -ROAD_HALF + 0.5; x < ROAD_HALF; x += 0.9) {
      g.add(mesh(new THREE.BoxGeometry(0.5, 0.01, 3), lambert(0xf4f4ee), x + 0.25, 0.013, -at));
    }
  }
  return g;
}

function pole(d) {
  const g = new THREE.Group();
  const x = -(FRONT - 0.45);
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.15, 9, 10), lambert(0xbdb8ae), x, 4.5, -d));
  g.add(mesh(new THREE.BoxGeometry(1.6, 0.12, 0.12), lambert(0x8d8a84), x, 8.2, -d));
  if (chance(0.5)) g.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.8, 12), lambert(0x6f7a72), x + 0.35, 7.3, -d));
  return g;
}

// 兩根電線桿之間垂下來的電線
const wireMat = new THREE.LineBasicMaterial({ color: 0x2b2b2b });
function wires(d1, d2) {
  const g = new THREE.Group();
  const x = -(FRONT - 0.45);
  for (const dx of [-0.7, 0, 0.7]) {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const f = i / 10;
      pts.push(new THREE.Vector3(x + dx, 8.25 - Math.sin(f * Math.PI) * 0.8, -(d1 + (d2 - d1) * f)));
    }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
  }
  return g;
}

// ---------- 公園（終點） ----------

function park(d) {
  const t = textures();
  const g = new THREE.Group();
  const grass = lambert(0x8cc46a);
  g.add(mesh(new THREE.PlaneGeometry(80, 90).rotateX(-Math.PI / 2), grass, 0, 0.005, -(d + 45)));
  // 公園步道
  g.add(mesh(new THREE.PlaneGeometry(5, 90).rotateX(-Math.PI / 2), lambert(0xe2cfa6), 0, 0.02, -(d + 45)));
  // 終點線
  const finishGeo = new THREE.PlaneGeometry(ROAD_HALF * 2 + 2.8, 1).rotateX(-Math.PI / 2);
  const uv = finishGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 10, uv.getY(i));
  g.add(mesh(finishGeo, texMat(t.finish), 0, 0.03, -d));
  // 大門：兩根石柱加上「麻吉公園」牌子
  const stone = lambert(0xd8cbb3);
  for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.8, 5, 0.8), stone, s * (ROAD_HALF + 0.9), 2.5, -(d + 1)));
  g.add(mesh(new THREE.BoxGeometry(ROAD_HALF * 2 + 2.6, 1.6, 0.3), stone, 0, 5.2, -(d + 1)));
  g.add(mesh(new THREE.PlaneGeometry(ROAD_HALF * 2 + 2.4, 1.45), texMat(t.gate), 0, 5.2, -(d + 1) + 0.152));
  // 樹與花叢
  for (let i = 0; i < 46; i++) {
    const x = (chance(0.5) ? -1 : 1) * rand(4, 28);
    const tree = createTree({ planter: false });
    tree.position.set(x, 0, -(d + rand(3, 80)));
    tree.scale.setScalar(rand(1, 1.6));
    g.add(tree);
  }
  const flowers = [0xf3a6b8, 0xffe07a, 0xffffff, 0xd98be0];
  for (let i = 0; i < 60; i++) {
    const x = (chance(0.5) ? -1 : 1) * rand(3, 16);
    g.add(mesh(new THREE.SphereGeometry(rand(0.25, 0.5), 10, 8), lambert(chance(0.6) ? 0x5c9a4a : pick(flowers)), x, 0.2, -(d + rand(2, 60))));
  }
  return bake(g);
}

// ---------- 整條街 ----------

export function createStreet(scene) {
  const root = new THREE.Group();
  scene.add(root);
  let chunks = [];        // { end, group }
  let nextChunk = 0;
  let cursor = { [-1]: 0, [1]: 0 };
  let lastPole = 0;
  let parkAt = Infinity;
  let parkGroup = null;

  const clear = () => {
    [...root.children].forEach(disposeTree);
    chunks = [];
  };

  // start：最一開始的位置（在這之前也先蓋好一點，回頭看不會是空的）
  const reset = (start = 0) => {
    clear();
    parkAt = Infinity;
    parkGroup = null;
    nextChunk = Math.floor((start - BEHIND) / CHUNK) * CHUNK;
    cursor = { [-1]: nextChunk, [1]: nextChunk };
    lastPole = nextChunk;
  };

  const setPark = (d) => {
    parkAt = d;
    // 已經蓋過頭的街道要拆掉重蓋，免得房子蓋在公園裡
    chunks = chunks.filter((c) => {
      if (c.start < d) return true;
      disposeTree(c.group);
      return false;
    });
    nextChunk = Math.min(nextChunk, Math.ceil(d / CHUNK) * CHUNK);
    for (const s of [-1, 1]) cursor[s] = Math.min(cursor[s], nextChunk);
    parkGroup = park(d);
    root.add(parkGroup);
  };

  const build = (d0) => {
    const group = new THREE.Group();
    const end = Math.min(d0 + CHUNK, parkAt + 2);
    if (end > d0) group.add(roadChunk(d0, end - d0));
    for (const s of [-1, 1]) {
      while (cursor[s] < d0 + CHUNK && cursor[s] < parkAt - 4) {
        const bays = 2 + Math.floor(Math.random() * 3);
        group.add(building(s, cursor[s], bays));
        cursor[s] += bays * BAY;
      }
    }
    while (lastPole + POLE_GAP < d0 + CHUNK && lastPole + POLE_GAP < parkAt - 4) {
      group.add(pole(lastPole + POLE_GAP));
      group.add(wires(lastPole, lastPole + POLE_GAP));
      lastPole += POLE_GAP;
    }
    root.add(bake(group));
    chunks.push({ start: d0, end: d0 + CHUNK, group });
  };

  // 跟著人往前走：前面蓋到看得到的地方，後面看不到的拆掉
  const update = (d) => {
    while (nextChunk < d + AHEAD && nextChunk < parkAt + CHUNK) {
      build(nextChunk);
      nextChunk += CHUNK;
    }
    chunks = chunks.filter((c) => {
      if (c.end > d - BEHIND) return true;
      disposeTree(c.group);
      return false;
    });
  };

  return { reset, update, setPark };
}
