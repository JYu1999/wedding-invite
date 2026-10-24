// 帶麻吉去公園：吃到無敵星星加速時，從前方迎面飛過來的白色風切線
// 一條條細線散布在主人前方的空中與路邊，往鏡頭方向飛，飛過鏡頭後再回到前方重新出現
// strength（0～1）控制透明度與飛行速度：沒在加速時整組隱藏

import * as THREE from './three.js';
import { rand } from './kit.js';

const COUNT = 46;
const AHEAD = [6, 46];        // 出現在主人前方幾公尺
const BEHIND = 7;             // 飛到主人後方幾公尺（鏡頭後面）就回到前方
const SPREAD_X = 7;           // 左右散布範圍
const HEIGHT = [0.25, 3.6];
const LENGTH = [1.4, 3.4];    // 每條線多長
const RUSH = 26;              // 全速時每秒往鏡頭飛幾公尺（再加上主人自己往前走的速度）
const OPACITY = 0.75;

export function createWind(scene) {
  const positions = new Float32Array(COUNT * 6);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const mesh = new THREE.LineSegments(geometry, material);
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);

  // 每條線：路的哪個位置（x、d、高度）和長度；畫的時候 three.js 的 z 是 -d
  const streaks = Array.from({ length: COUNT }, () => ({ x: 0, d: 0, y: 0, len: 0 }));

  const spawn = (s, ownerD, anywhere) => {
    // 不要剛好擋在主人和麻吉的正前方：中間留一條空隙
    const side = Math.random() < 0.5 ? -1 : 1;
    s.x = side * rand(0.9, SPREAD_X);
    s.y = rand(...HEIGHT);
    s.len = rand(...LENGTH);
    s.d = ownerD + (anywhere ? rand(-BEHIND, AHEAD[1]) : rand(...AHEAD));
  };

  const write = () => {
    streaks.forEach((s, i) => {
      positions.set([s.x, s.y, -s.d, s.x, s.y, -(s.d + s.len)], i * 6);
    });
    geometry.attributes.position.needsUpdate = true;
  };

  let active = false;

  return {
    update(dt, ownerD, strength) {
      mesh.visible = strength > 0.01;
      material.opacity = OPACITY * strength;
      if (!mesh.visible) {
        active = false;
        return;
      }
      // 剛開始加速：一口氣散布在整段路上，不必等線慢慢飛過來
      if (!active) {
        streaks.forEach((s) => spawn(s, ownerD, true));
        active = true;
      }
      for (const s of streaks) {
        s.d -= RUSH * strength * dt;
        if (s.d + s.len < ownerD - BEHIND) spawn(s, ownerD, false);
      }
      write();
    },
  };
}
