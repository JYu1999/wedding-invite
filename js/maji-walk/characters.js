// 帶麻吉去公園：角色模型
// 麻吉：白色米克斯（奶油白毛、大大的立耳、粉紅耳內、細長的嘴、深綠項圈掛紫色吊牌、鐮刀尾），做成大頭的 Q 版
// 路邊野狗用同一套骨架換毛色；主人是白色小人；牽繩是兩人之間會垂下來的紅色繩子
// 座標：往前是 −z，y 往上，原點在腳下

import * as THREE from './three.js';
import { ownMaterials, mesh, blobShadow } from './kit.js';

const MAJI = {
  coat: 0xf7f0e3,
  shade: 0xecdcc0,     // 耳背、頭頂有一點米黃
  inner: 0xf2b2ad,     // 耳朵內側的粉紅
  nose: 0x241f1d,
  eye: 0x1c1512,
  collar: 0x1f5c57,
  tag: 0x8d6bd8,
  tongue: 0xef8585,
};

const STRAY_COATS = [
  { coat: 0x2f2925, shade: 0x26201c, inner: 0x6b4a42, nose: 0x151110, eye: 0x120d0b },  // 黑狗
  { coat: 0xc79558, shade: 0xb07f45, inner: 0xd99b8a, nose: 0x2a1f19, eye: 0x1c1410 },  // 黃狗
  { coat: 0x9a7b5d, shade: 0x5b4636, inner: 0xc98f86, nose: 0x231b16, eye: 0x1c1410 },  // 虎斑土狗
];

const sphere = (r, w = 18, h = 14) => new THREE.SphereGeometry(r, w, h);
const capsule = (r, len, axis = 'y') => {
  const g = new THREE.CapsuleGeometry(r, len, 6, 14);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  return g;
};

// 狗：stray 為 true 時是路邊野狗（沒有項圈、毛色不同）
export function createDog({ stray = false } = {}) {
  const c = stray ? STRAY_COATS[Math.floor(Math.random() * STRAY_COATS.length)] : MAJI;
  const m = ownMaterials();
  const root = new THREE.Group();
  const body = new THREE.Group();     // 身體會上下晃、坐下時往後仰
  body.position.y = 0.52;
  root.add(body);

  // 軀幹：胸口大一點、屁股圓圓的
  body.add(mesh(capsule(0.165, 0.36, 'z'), m(c.coat), 0, 0, 0.02));
  body.add(mesh(sphere(0.19), m(c.coat), 0, 0.02, -0.19));
  body.add(mesh(sphere(0.17), m(c.coat), 0, 0.03, 0.2));
  // 背上淡淡的米黃
  const saddle = mesh(capsule(0.12, 0.3, 'z'), m(c.shade), 0, 0.075, 0.04);
  saddle.scale.set(0.9, 0.7, 1);
  body.add(saddle);

  // 脖子
  const neck = mesh(capsule(0.11, 0.16), m(c.coat), 0, 0.14, -0.28);
  neck.rotation.x = -0.6;
  body.add(neck);

  // 頭：Q 版的大頭
  const head = new THREE.Group();
  head.position.set(0, 0.31, -0.38);
  body.add(head);
  const skull = mesh(sphere(0.22, 24, 18), m(c.coat));
  skull.scale.set(1, 0.92, 1.02);
  head.add(skull);
  const crown = mesh(sphere(0.17, 18, 12), m(c.shade), 0, 0.07, 0.04);
  crown.scale.set(1.05, 0.65, 1);
  head.add(crown);

  // 細長的嘴：往前漸細的圓柱，前端圓頭加黑鼻子
  const muzzle = mesh(new THREE.CylinderGeometry(0.068, 0.115, 0.2, 18).rotateX(-Math.PI / 2), m(c.coat), 0, -0.065, -0.22);
  head.add(muzzle);
  head.add(mesh(sphere(0.068), m(c.coat), 0, -0.065, -0.32));
  const nose = mesh(sphere(0.034), m(c.nose), 0, -0.035, -0.38);
  nose.scale.set(1.4, 1, 1.1);
  head.add(nose);
  const tongue = mesh(sphere(0.05, 12, 8), m(MAJI.tongue), 0, -0.13, -0.29);
  tongue.scale.set(0.75, 0.25, 1.1);
  tongue.visible = false;
  head.add(tongue);

  // 眼睛：杏仁形的深色眼睛加上反光點
  for (const s of [-1, 1]) {
    const eye = mesh(sphere(0.045, 14, 10), m(c.eye), s * 0.098, 0.025, -0.183);
    eye.scale.set(1.3, 0.88, 0.7);
    eye.rotation.set(0, s * 0.45, s * 0.22);
    head.add(eye);
    head.add(mesh(sphere(0.013, 8, 6), m(0xffffff), s * 0.088, 0.042, -0.214));
  }

  // 大立耳：壓扁的圓錐，內側疊一層粉紅；耳根是轉軸，跑步時會往後貼
  const ears = [];
  for (const s of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(s * 0.115, 0.15, 0.03);
    ear.rotation.z = -s * 0.3;
    const outer = mesh(new THREE.ConeGeometry(0.1, stray ? 0.24 : 0.34, 14), m(c.shade), 0, stray ? 0.12 : 0.17, 0);
    outer.scale.z = 0.42;
    const inner = mesh(new THREE.ConeGeometry(0.068, stray ? 0.17 : 0.25, 14), m(c.inner), 0, stray ? 0.1 : 0.145, -0.022);
    inner.scale.z = 0.3;
    ear.add(outer, inner);
    head.add(ear);
    ears.push(ear);
  }

  // 項圈與紫色吊牌（只有麻吉有）
  if (!stray) {
    const collar = mesh(new THREE.TorusGeometry(0.118, 0.03, 8, 22), m(c.collar), 0, 0.15, -0.29);
    collar.rotation.x = Math.PI / 2 - 0.6;
    body.add(collar);
    const tag = mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.014, 14).rotateX(Math.PI / 2), m(c.tag), 0, 0.06, -0.385);
    tag.rotation.x = -0.3;
    body.add(tag);
  }

  // 腿：肩膀、髖關節是轉軸；細細長長的腿
  const legs = [];
  for (const [z, s] of [[-0.19, -1], [-0.19, 1], [0.2, -1], [0.2, 1]]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.1, -0.03, z);
    if (z > 0) pivot.add(mesh(sphere(0.1), m(c.coat), 0, 0.02, 0.01));   // 大腿
    pivot.add(mesh(capsule(0.052, 0.32), m(c.coat), 0, -0.2, 0));
    const paw = mesh(sphere(0.064), m(c.coat), 0, -0.41, -0.02);
    paw.scale.set(1, 0.75, 1.2);
    pivot.add(paw);
    body.add(pivot);
    legs.push(pivot);
  }

  // 鐮刀尾：往上翹再往前彎
  const tail = new THREE.Group();
  tail.position.set(0, 0.08, 0.33);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0.1, 0.09),
    new THREE.Vector3(0, 0.23, 0.08),
    new THREE.Vector3(0, 0.29, -0.02),
  ]);
  tail.add(mesh(new THREE.TubeGeometry(curve, 16, 0.042, 8), m(c.coat)));
  tail.add(mesh(sphere(0.042, 10, 8), m(c.shade), 0, 0.29, -0.02));
  body.add(tail);

  const shadow = blobShadow(0.62, 1.05);
  root.add(shadow);

  // 項圈在世界中的位置：牽繩綁在這裡
  const collarPoint = new THREE.Object3D();
  collarPoint.position.set(0, 0.12, -0.33);
  body.add(collarPoint);
  const headTop = new THREE.Object3D();
  headTop.position.set(0, 0.5, 0);
  head.add(headTop);

  let phase = Math.random() * 10;
  let sit = 0;          // 0 站著 → 1 坐下
  let wag = 0;

  // speed：跑多快（m/s），pose：'run' | 'sit'，happy：尾巴搖多快
  const animate = (dt, { speed = 0, pose = 'run', happy = 1, pant = false } = {}) => {
    sit += ((pose === 'sit' ? 1 : 0) - sit) * Math.min(1, dt * 10);
    phase += dt * (2.5 + speed * 1.55);
    wag += dt * (8 + happy * 10);
    const stride = Math.min(0.95, speed * 0.13) * (1 - sit);
    const swing = (o) => Math.sin(phase + o) * stride;
    // 小跑步：對角的腳一起動
    legs[0].rotation.x = swing(0);
    legs[3].rotation.x = swing(0.2);
    legs[1].rotation.x = swing(Math.PI);
    legs[2].rotation.x = swing(Math.PI + 0.2);
    // 坐下：身體往後仰，後腳往前收，前腳撐直，頭抬回來看前面
    legs[0].rotation.x += -0.95 * sit;
    legs[1].rotation.x += -0.95 * sit;
    legs[2].rotation.x += 0.75 * sit;
    legs[3].rotation.x += 0.75 * sit;
    body.rotation.x = 0.9 * sit + Math.sin(phase * 2) * 0.03 * stride;
    body.position.y = 0.52 - 0.21 * sit + Math.abs(Math.sin(phase)) * 0.05 * stride;
    head.rotation.x = -0.78 * sit + Math.sin(phase * 2 + 0.6) * 0.04 * stride;
    // 跑得越快耳朵越往後貼
    const flat = Math.min(0.7, speed * 0.06);
    ears.forEach((ear, i) => {
      ear.rotation.x = flat + Math.sin(phase * 2 + i) * 0.06 * stride;
    });
    tail.rotation.z = Math.sin(wag) * (0.35 + 0.15 * happy);
    tail.rotation.x = -0.2 + 0.25 * sit;
    tongue.visible = pant;
  };

  return { root, body, head, collarPoint, headTop, animate, materials: m.all() };
}

// 主人：白色小人，右手往前伸牽著繩子
export function createOwner() {
  const m = ownMaterials();
  const white = m(0xf3f3f1);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  body.add(mesh(capsule(0.2, 0.36), white, 0, 1.0, 0));
  body.add(mesh(sphere(0.21, 24, 18), white, 0, 1.5, 0));

  const limb = (x, y, r, len) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    pivot.add(mesh(capsule(r, len), white, 0, -len / 2 - r * 0.6, 0));
    body.add(pivot);
    return pivot;
  };
  const legL = limb(-0.1, 0.72, 0.08, 0.46);
  const legR = limb(0.1, 0.72, 0.08, 0.46);
  const armL = limb(-0.27, 1.22, 0.065, 0.38);
  const armR = limb(0.27, 1.22, 0.065, 0.38);
  armR.rotation.x = 1.1;

  const hand = new THREE.Object3D();
  hand.position.set(0, -0.5, 0);
  armR.add(hand);

  root.add(blobShadow(0.75, 0.6));

  let phase = 0;
  // speed：走多快；lean：被拖著走時往前傾（0～1）
  const animate = (dt, { speed = 0, lean = 0 } = {}) => {
    phase += dt * (3 + speed * 1.6);
    const stride = Math.min(0.85, speed * 0.14);
    legL.rotation.x = Math.sin(phase) * stride;
    legR.rotation.x = -Math.sin(phase) * stride;
    armL.rotation.x = -Math.sin(phase) * stride * 0.8;
    armR.rotation.x = 1.1 + lean * 0.35;
    body.rotation.x = -lean * 0.32;
    body.position.y = Math.abs(Math.sin(phase)) * 0.05 * stride;
  };

  return { root, hand, animate, materials: m.all() };
}

// 牽繩：一節一節的軟繩子（verlet），兩端綁在主人的手和麻吉的項圈上
// 會受重力垂下來、跟著跑動甩來甩去，靠近時軟軟地垂到地上，拉開到繩長才繃直
const ROPE_SEGMENTS = 14;
const ROPE_ITERATIONS = 14;
const ROPE_DAMPING = 0.985;

export function createLeash(length) {
  const material = new THREE.MeshLambertMaterial({ color: 0xc8413a });
  const line = new THREE.Mesh(new THREE.BufferGeometry(), material);
  const pts = Array.from({ length: ROPE_SEGMENTS + 1 }, () => new THREE.Vector3());
  const prev = pts.map(() => new THREE.Vector3());
  const seg = length / ROPE_SEGMENTS;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const v = new THREE.Vector3();
  const delta = new THREE.Vector3();
  let ready = false;

  // 角色瞬間移動（重新開始）時，繩子直接拉成直線，不要甩一大圈
  const reset = () => { ready = false; };

  const update = (hand, collar, dt) => {
    hand.getWorldPosition(a);
    collar.getWorldPosition(b);
    const last = ROPE_SEGMENTS;
    if (!ready) {
      pts.forEach((p, i) => p.lerpVectors(a, b, i / last));
      prev.forEach((p, i) => p.copy(pts[i]));
      ready = true;
    }
    const gravity = 9.8 * dt * dt;
    for (let i = 1; i < last; i++) {
      v.subVectors(pts[i], prev[i]).multiplyScalar(ROPE_DAMPING);
      prev[i].copy(pts[i]);
      pts[i].add(v);
      pts[i].y -= gravity;
    }
    for (let k = 0; k < ROPE_ITERATIONS; k++) {
      pts[0].copy(a);
      pts[last].copy(b);
      for (let i = 0; i < last; i++) {
        delta.subVectors(pts[i + 1], pts[i]);
        const d = delta.length() || 1e-6;
        const diff = (d - seg) / d;
        // 端點不動，修正全給中間的節點
        const wa = i === 0 ? 0 : i + 1 === last ? 1 : 0.5;
        const wb = i === 0 ? 1 : i + 1 === last ? 0 : 0.5;
        pts[i].addScaledVector(delta, diff * wa);
        pts[i + 1].addScaledVector(delta, -diff * wb);
      }
      for (let i = 1; i < last; i++) pts[i].y = Math.max(0.02, pts[i].y);
    }
    pts[0].copy(a);
    pts[last].copy(b);
    line.geometry.dispose();
    line.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 36, 0.02, 6);
  };

  return { mesh: line, update, reset };
}
