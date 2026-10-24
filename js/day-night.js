// 日夜循環：整頁從白天慢慢轉成夜晚、再慢慢轉回白天，一直循環
// 只更新 <html> 上的 --night（0 = 白天、1 = 夜晚），配色由 css/day-night.css 依它混色
// 每轉完一整輪（白天 → 夜晚 → 白天）記一次，給「日日夜夜」成就
// 扭蛋機、小遊戲等全螢幕視窗蓋住首頁時，日夜停在原本的時刻，關掉後再接著轉

import { increment } from './achievements/progress.js';
import { homeTime } from './scroll-lock.js';

const TRANSITION_MS = 50_000;    // 白天 → 夜晚（或夜晚 → 白天）各花 50 秒
const STEPS = 400;               // --night 分成幾階：每階色差肉眼看不出，又不必每幀重算整頁樣式
const EASE_POWER = 3;            // 越大越「前慢、中間快、後慢」

// 前慢、中間快、後慢：大部分時間停在接近白天或夜晚、字都清楚的狀態，
// 中間底色變灰、字比較難讀的那一段很快就帶過（中段速度是平均的 3 倍，約 2～3 秒）
const ease = (t) => t ** EASE_POWER / (t ** EASE_POWER + (1 - t) ** EASE_POWER);

export function initDayNight(root = document.documentElement) {
  const start = homeTime();
  let last = -1;
  let cycles = 0;

  const frame = (now) => {
    // 0 → 1 → 0 來回
    const elapsed = (homeTime(now) - start) / TRANSITION_MS;
    const t = elapsed % 2;
    const night = Math.round(ease(t < 1 ? t : 2 - t) * STEPS) / STEPS;
    if (night !== last) {
      root.style.setProperty('--night', night);
      last = night;
    }
    // 分頁在背景時畫面停住，回來時一次跳過好幾輪也只算一次
    if (Math.floor(elapsed / 2) > cycles) {
      cycles = Math.floor(elapsed / 2);
      increment('dayNightCycles');
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
