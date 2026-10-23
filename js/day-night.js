// 日夜循環：整頁從白天慢慢轉成夜晚、再慢慢轉回白天，一直循環
// 只更新 <html> 上的 --night（0 = 白天、1 = 夜晚），配色由 css/day-night.css 依它混色

const TRANSITION_MS = 60_000;    // 白天 → 夜晚（或夜晚 → 白天）各花一分鐘
const STEPS = 240;               // --night 分成幾階：每階色差肉眼看不出，又不必每幀重算整頁樣式

const smoothstep = (t) => t * t * (3 - 2 * t);

export function initDayNight(root = document.documentElement) {
  const start = performance.now();
  let last = -1;

  const frame = (now) => {
    // 0 → 1 → 0 來回，頭尾放慢，在最亮與最暗時多停留一下
    const t = ((now - start) / TRANSITION_MS) % 2;
    const night = Math.round(smoothstep(t < 1 ? t : 2 - t) * STEPS) / STEPS;
    if (night !== last) {
      root.style.setProperty('--night', night);
      last = night;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
