// 日夜循環：整頁從白天慢慢轉成夜晚、再慢慢轉回白天，一直循環
// 只更新 <html> 上的 --night（0 = 白天、1 = 夜晚），配色由 css/day-night.css 依它混色

const TRANSITION_MS = 50_000;    // 白天 → 夜晚（或夜晚 → 白天）各花 50 秒
const STEPS = 400;               // --night 分成幾階：每階色差肉眼看不出，又不必每幀重算整頁樣式
const EASE_POWER = 3;            // 越大越「前慢、中間快、後慢」

// 前慢、中間快、後慢：大部分時間停在接近白天或夜晚、字都清楚的狀態，
// 中間底色變灰、字比較難讀的那一段很快就帶過（中段速度是平均的 3 倍，約 2～3 秒）
const ease = (t) => t ** EASE_POWER / (t ** EASE_POWER + (1 - t) ** EASE_POWER);

export function initDayNight(root = document.documentElement) {
  const start = performance.now();
  let last = -1;

  const frame = (now) => {
    // 0 → 1 → 0 來回
    const t = ((now - start) / TRANSITION_MS) % 2;
    const night = Math.round(ease(t < 1 ? t : 2 - t) * STEPS) / STEPS;
    if (night !== last) {
      root.style.setProperty('--night', night);
      last = night;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
