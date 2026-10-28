// 跟令狗一起收集紅蘿蔔：入口
// 扭到令狗的照片、或在扭蛋圖鑑看令狗的照片時，按「跟令狗一起收集紅蘿蔔」呼叫 openLinggouSkate()
// 按下去才載入遊戲本體；載入時先蓋上全螢幕畫面、暫停首頁背景音樂，離開後再接著播
// 遊戲是橫向的：手機上試著進全螢幕並鎖定橫向（Android 可以；iPhone 不行，就請玩家自己轉，見 fullscreen.js）

import { wakeAudio } from './audio.js';
import { lockScroll, unlockScroll } from '../scroll-lock.js';
import { isTouch } from '../device.js';
import { enterFullscreen, exitFullscreen } from './fullscreen.js';

// 照片檔名有「令狗」就是令狗的照片
export const isLinggouPhoto = (photo) => !!photo?.name?.includes('令狗');

let root = null;
let game = null;
let loading = null;
let resumeBgm = false;
let active = false;

const onClose = () => {
  active = false;
  unlockScroll();
  root.classList.remove('open');
  exitFullscreen();
  setTimeout(() => {
    if (!root.classList.contains('open')) root.hidden = true;
  }, 300);
  if (resumeBgm) document.getElementById('bgm')?.play().catch(() => {});
  resumeBgm = false;
};

export async function openLinggouSkate() {
  // 要在點擊當下叫醒聲音、要求全螢幕，iOS／Android 才會答應
  wakeAudio();
  if (!root) {
    root = document.createElement('div');
    root.className = 'ls';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', '跟令狗一起收集紅蘿蔔');
    root.innerHTML = `
      <div class="ls-loading">
        <div class="ls-loading-carrots"><span>🥕</span><span>🥕</span><span>🥕</span></div>
        <p>令狗正在穿冰刀鞋⋯⋯</p>
      </div>`;
    document.body.append(root);
  }
  if (active) return;
  active = true;
  root.querySelector('.ls-loading p').textContent = '令狗正在穿冰刀鞋⋯⋯';

  const bgm = document.getElementById('bgm');
  resumeBgm = !!bgm && !bgm.paused;
  bgm?.pause();
  lockScroll();
  root.hidden = false;
  requestAnimationFrame(() => root.classList.add('open'));
  if (isTouch()) enterFullscreen(root);

  if (!game) {
    root.classList.add('is-loading');
    try {
      loading ??= import('./game.js');
      const { createGame } = await loading;
      game ??= createGame(root, { onClose });
    } catch (err) {
      console.error(err);
      loading = null;
      root.querySelector('.ls-loading p').textContent = '令狗出不了門⋯⋯請確認網路後再試一次';
      setTimeout(onClose, 2200);
      return;
    } finally {
      root.classList.remove('is-loading');
    }
  }
  game.open();
}
