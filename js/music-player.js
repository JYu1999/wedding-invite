// 背景音樂與黑膠唱片播放器
// 實際播放的時間累積滿一整首歌就記一次「聽完整首」（給成就用）；音樂是循環播放，不會有播完的事件，所以自己算

import { increment } from './achievements/progress.js';

// 首頁底部離視窗頂端小於此距離時，播放器浮現
const SHOW_AFTER_HERO_BOTTOM_PX = 350;
// timeupdate 大約每 0.25 秒一次；兩次之間跳太多（拖曳進度、載入卡住）不算進播放時間
const MAX_TICK_S = 2;
// 最後一次 timeupdate 不會剛好落在歌曲結尾，差這麼一點也算聽完
const END_SLACK_S = 1;

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

  // 累積實際聽了幾秒：暫停再繼續也接著算，循環回到開頭時把跨過結尾的那一段也算進去
  let listened = 0;
  let lastTime = audio.currentTime;
  audio.addEventListener('timeupdate', () => {
    const now = audio.currentTime;
    const { duration } = audio;
    let delta = now - lastTime;
    if (delta < 0 && duration) delta += duration;
    lastTime = now;
    if (audio.paused || !(delta > 0) || delta > MAX_TICK_S * audio.playbackRate || !duration) return;
    listened += delta;
    if (listened >= duration - END_SLACK_S) {
      listened = 0;
      increment('songPlays');
    }
  });

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

  // 切換分頁、縮小視窗、手機切到別的 App 或鎖屏時暫停，回到頁面再接著播
  // 只有被這裡暫停的才會自動續播，使用者自己按暫停的就維持暫停
  let pausedByHidden = false;
  const pauseWhileAway = () => {
    if (audio.paused) return;
    pausedByHidden = true;
    audio.pause();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseWhileAway();
    else if (pausedByHidden) {
      pausedByHidden = false;
      play();
    }
  });
  // iOS 關閉分頁或進入返回快取時不一定會觸發 visibilitychange
  window.addEventListener('pagehide', pauseWhileAway);

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
