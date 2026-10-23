// 手機震動回饋：Android 用 Vibration API 照著節奏震動
// iPhone 的 Safari 不支援 Vibration API，改用 iOS 18 起「開關」元件切換時的系統觸覺回饋：
// 只能發出固定強度的「喀」一下，所以節奏裡的每一段「震」都換成喀一下；舊版 iOS 就安靜不動
// 只在手指操作的裝置上作用，電腦不會有反應

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

let iosSwitch = null;

function iosTick() {
  if (!iosSwitch) {
    iosSwitch = document.createElement('label');
    iosSwitch.ariaHidden = 'true';
    iosSwitch.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    iosSwitch.append(input);
    document.body.append(iosSwitch);
  }
  iosSwitch.click();
}

export function haptic(pattern) {
  if (!isTouch()) return;
  const steps = [].concat(pattern);
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(steps);
    return;
  }
  if (!IS_IOS) return;
  let at = 0;
  steps.forEach((ms, i) => {
    if (i % 2 === 0) {
      if (at === 0) iosTick();
      else setTimeout(iosTick, at);
    }
    at += ms;
  });
}
