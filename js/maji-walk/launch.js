// 帶麻吉去公園：入口
// 扭到麻吉的照片、或在扭蛋圖鑑看麻吉的照片時，按「帶麻吉去公園」呼叫 openMajiWalk()
// 3D 引擎（three.js）和遊戲本體很大，按下去才載入；載入時先蓋上全螢幕畫面、暫停首頁背景音樂，離開後再接著播

import { wakeAudio } from './music.js';
import { lockScroll, unlockScroll } from '../scroll-lock.js';

// 照片檔名有「麻吉」就是麻吉的照片
export const isMajiPhoto = (photo) => !!photo?.name?.includes('麻吉');

let root = null;
let game = null;
let loading = null;
let resumeBgm = false;
let active = false;

const onClose = () => {
  active = false;
  unlockScroll();
  root.classList.remove('open');
  setTimeout(() => {
    if (!root.classList.contains('open')) root.hidden = true;
  }, 300);
  if (resumeBgm) document.getElementById('bgm')?.play().catch(() => {});
  resumeBgm = false;
};

export async function openMajiWalk() {
  // 要在點擊當下叫醒聲音，iOS 才會出聲
  wakeAudio();
  if (!root) {
    root = document.createElement('div');
    root.className = 'mw';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', '帶麻吉去公園');
    root.innerHTML = `
      <div class="mw-loading">
        <div class="mw-loading-paws"><span>🐾</span><span>🐾</span><span>🐾</span></div>
        <p>麻吉準備出門中⋯⋯</p>
      </div>`;
    document.body.append(root);
  }
  if (active) return;
  active = true;
  root.querySelector('.mw-loading p').textContent = '麻吉準備出門中⋯⋯';

  const bgm = document.getElementById('bgm');
  resumeBgm = !!bgm && !bgm.paused;
  bgm?.pause();
  lockScroll();
  root.hidden = false;
  requestAnimationFrame(() => root.classList.add('open'));

  if (!game) {
    root.classList.add('is-loading');
    try {
      loading ??= import('./game.js');
      const { createGame } = await loading;
      game ??= createGame(root, { onClose });
    } catch (err) {
      console.error(err);
      loading = null;
      root.querySelector('.mw-loading p').textContent = '麻吉出不了門⋯⋯請確認網路後再試一次';
      setTimeout(onClose, 2200);
      return;
    } finally {
      root.classList.remove('is-loading');
    }
  }
  game.open();
}
