// 手機震動回饋
// Android：用 Vibration API 照著節奏震動，只在手指操作的裝置上作用，電腦不會有反應
// iPhone：Safari 不支援 Vibration API，唯一的觸覺回饋是「開關」元件（<input type="checkbox" switch>）切換時的「喀」一下，
// 而且從 iOS 26.5 起一定要手指真的點到開關才會喀，用程式去點它不會有反應。
// 所以在可以點的地方疊一個看不見的開關（tapHaptic），手指點下去就喀一下，點擊照樣傳給底下的元素；
// 拖曳、計時器觸發的震動（刮銀漆、扭蛋落地、中獎⋯⋯）在 iPhone 上做不到

import { IS_IOS, isTouch } from '../device.js';

// 節奏的寫法跟 navigator.vibrate 一樣：震、停、震、停⋯⋯（毫秒）
export const HAPTIC = {
  tick: 6,                          // 刮銀漆、切換照片的細碎觸感
  thud: 32,                         // 扭蛋落地
  bounce: 14,                       // 扭蛋彈起再落下
  ratchet: Array(8).fill([8, 112]).flat(),  // 轉旋鈕的棘輪，與 effects.js 的 spinSound 同步（每 0.12 秒一下）
  pop: [16, 50, 26],                // 扭蛋打開
  success: [28, 70, 28, 70, 70],    // 刮完中獎
  collect: [12, 60, 22],            // 照片收進扭蛋圖鑑
};

export function haptic(pattern) {
  if (!isTouch() || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(pattern);
}

// iPhone：點這個元素時喀一下（樣式在 base.css 的 .tap-haptic）
export function tapHaptic(el) {
  if (!IS_IOS || !el) return;
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.className = 'tap-haptic';
  input.tabIndex = -1;
  input.ariaHidden = 'true';
  el.append(input);
}
