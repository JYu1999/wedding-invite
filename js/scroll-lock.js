// 全螢幕視窗可能疊好幾層（扭蛋機 → 扭蛋圖鑑 → 看大圖），最上面那層關掉時不能讓底下的頁面恢復捲動
// 用計數的方式：每層打開時鎖一次、關閉時解一次，全部關掉才恢復

let locks = 0;
let lockedAt = 0;     // 這次蓋上全螢幕視窗的時間
let coveredMs = 0;    // 之前被蓋住的時間總和

export function lockScroll() {
  if (locks++ === 0) {
    document.body.style.overflow = 'hidden';
    lockedAt = performance.now();
  }
}

// 有沒有全螢幕視窗（扭蛋機、圖鑑、燈箱、小遊戲⋯⋯）蓋在頁面上
export const isScrollLocked = () => locks > 0;

export function unlockScroll() {
  if (locks > 0 && --locks === 0) {
    document.body.style.overflow = '';
    coveredMs += performance.now() - lockedAt;
  }
}

// 首頁的時鐘：跟 performance.now() 一樣往前走，但被全螢幕視窗蓋住的期間停住
// 四季、日夜用它計時，玩遊戲時看不到首頁，就不算「在首頁經歷」
export const homeTime = (now = performance.now()) =>
  (locks > 0 ? lockedAt : now) - coveredMs;
