// 全螢幕視窗可能疊好幾層（扭蛋機 → 扭蛋圖鑑 → 看大圖），最上面那層關掉時不能讓底下的頁面恢復捲動
// 用計數的方式：每層打開時鎖一次、關閉時解一次，全部關掉才恢復

let locks = 0;

export function lockScroll() {
  if (locks++ === 0) document.body.style.overflow = 'hidden';
}

export function unlockScroll() {
  if (locks > 0 && --locks === 0) document.body.style.overflow = '';
}
