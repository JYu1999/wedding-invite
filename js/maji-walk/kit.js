// 帶麻吉去公園：建模共用的小工具（材質、影子、畫在畫布上的貼圖）

import * as THREE from './three.js';

// 街景、障礙物共用同一色的材質；角色會發光閃爍，要用 own 自己建一份
const shared = new Map();
export function lambert(color) {
  if (!shared.has(color)) shared.set(color, new THREE.MeshLambertMaterial({ color }));
  return shared.get(color);
}

// 角色用：每隻角色各自一組材質，無敵時改 emissive 不會影響到別人
export function ownMaterials() {
  const mats = new Map();
  const get = (color) => {
    if (!mats.has(color)) mats.set(color, new THREE.MeshLambertMaterial({ color }));
    return mats.get(color);
  };
  get.all = () => [...mats.values()];
  return get;
}

export function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  return m;
}

export function canvasTexture(width, height, draw, repeat = false) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// 腳下的圓形軟影子：比即時陰影便宜很多，手機也跑得動；同樣深淺的影子共用材質，才能合併
let shadowMap = null;
const shadowMats = new Map();
const shadowGeo = new THREE.CircleGeometry(0.5, 24).rotateX(-Math.PI / 2);
shadowGeo.userData.keep = true;
export function blobShadow(width, length = width, opacity = 0.32) {
  shadowMap ??= canvasTexture(64, 64, (g) => {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.6)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  });
  if (!shadowMats.has(opacity)) {
    shadowMats.set(opacity, new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false, color: 0x000000, opacity }));
  }
  const m = new THREE.Mesh(shadowGeo, shadowMats.get(opacity));
  m.scale.set(width, 1, length);
  m.position.y = 0.012;
  m.renderOrder = -1;
  return m;
}

// BoxGeometry 某一面的貼圖重複幾次（窗戶一格一格排）；面的順序：+x −x +y −y +z −z
export function repeatFace(geometry, face, ru, rv) {
  const uv = geometry.attributes.uv;
  for (let i = face * 4; i < face * 4 + 4; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv);
  uv.needsUpdate = true;
  return geometry;
}

export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (list) => list[Math.floor(Math.random() * list.length)];
export const chance = (p) => Math.random() < p;

export const SIGN_FONT = '"PingFang TC", "Noto Sans TC", "Microsoft JhengHei", "Heiti TC", sans-serif';

// 拆掉看不到的街景、障礙物時釋放顯示卡記憶體；共用的幾何（keep）與材質留著
export function disposeTree(object) {
  object.traverse((o) => {
    if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose();
  });
  object.removeFromParent();
}

// 很多物件共用的幾何：標記起來，拆物件時不要釋放
export const keep = (geometry) => {
  geometry.userData.keep = true;
  return geometry;
};

// 把一整組不會動的模型合併成「一種材質一個網格」：手機一格畫面能畫的物件數有限，
// 一段街景原本上百個小方塊，合併後只剩二三十個，效能差很多
const tmpNormal = new THREE.Matrix3();
const tmpVec = new THREE.Vector3();
export function bake(group) {
  group.updateMatrixWorld(true);
  const inverse = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map();
  const merged = [];
  group.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || !o.geometry.index) return;
    const matrix = new THREE.Matrix4().multiplyMatrices(inverse, o.matrixWorld);
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push({ geometry: o.geometry, matrix, order: o.renderOrder });
    merged.push(o);
  });
  for (const o of merged) {
    o.removeFromParent();
    if (!o.geometry.userData.keep) o.geometry.dispose();
  }
  for (const [material, parts] of buckets) {
    let vertices = 0;
    let indices = 0;
    for (const { geometry } of parts) {
      vertices += geometry.attributes.position.count;
      indices += geometry.index.count;
    }
    const position = new Float32Array(vertices * 3);
    const normal = new Float32Array(vertices * 3);
    const uv = new Float32Array(vertices * 2);
    const index = new (vertices > 65535 ? Uint32Array : Uint16Array)(indices);
    let v = 0;
    let i = 0;
    for (const { geometry, matrix } of parts) {
      const p = geometry.attributes.position;
      const n = geometry.attributes.normal;
      const t = geometry.attributes.uv;
      tmpNormal.getNormalMatrix(matrix);
      for (let k = 0; k < p.count; k++) {
        tmpVec.fromBufferAttribute(p, k).applyMatrix4(matrix).toArray(position, (v + k) * 3);
        if (n) tmpVec.fromBufferAttribute(n, k).applyMatrix3(tmpNormal).normalize().toArray(normal, (v + k) * 3);
        if (t) { uv[(v + k) * 2] = t.getX(k); uv[(v + k) * 2 + 1] = t.getY(k); }
      }
      const idx = geometry.index;
      for (let k = 0; k < idx.count; k++) index[i + k] = idx.getX(k) + v;
      v += p.count;
      i += idx.count;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    geometry.computeBoundingSphere();
    const m = new THREE.Mesh(geometry, material);
    m.renderOrder = parts[0].order;
    group.add(m);
  }
  return group;
}
