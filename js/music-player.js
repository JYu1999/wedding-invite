// 背景音樂與黑膠唱片播放器

// 首頁底部離視窗頂端小於此距離時，播放器浮現
const SHOW_AFTER_HERO_BOTTOM_PX = 350;

export function initMusicPlayer() {
  const audio = document.getElementById('bgm');
  const player = document.getElementById('musicPlayer');
  const playBtn = document.getElementById('playBtn');
  const playIcon = document.getElementById('playIcon');
  const hero = document.querySelector('.hero');
  if (!audio || !player) return { play: () => {} };

  // 播放狀態一律跟著音訊實際狀態走：唱片轉動、唱臂落下、按鈕圖示切換
  const setPlaying = (isPlaying) => {
    player.classList.toggle('playing', isPlaying);
    if (playIcon) playIcon.textContent = isPlaying ? '❚❚' : '▶';
  };
  audio.addEventListener('play', () => setPlaying(true));
  audio.addEventListener('pause', () => setPlaying(false));

  const play = () => {
    // 瀏覽器可能擋下自動播放，失敗時保留手動播放
    audio.play().catch((err) => {
      console.warn('瀏覽器限制自動播放或正在載入，可手動點擊音樂按鈕播放', err);
    });
  };

  playBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (audio.paused) play();
    else audio.pause();
  });

  // 滑離首頁時浮現播放器（浮現後不再隱藏）
  const updateVisibility = () => {
    if (!hero) return;
    if (hero.getBoundingClientRect().bottom < SHOW_AFTER_HERO_BOTTOM_PX) {
      player.classList.add('show');
      window.removeEventListener('scroll', updateVisibility);
    }
  };
  window.addEventListener('scroll', updateVisibility, { passive: true });
  updateVisibility();

  return { play };
}
