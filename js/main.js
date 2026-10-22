// 進入點：初始化各區塊功能

import { WEDDING_DATE, GALLERY_PHOTOS, WATERMARK } from './config.js';
import { initIntro } from './intro.js';
import { initMusicPlayer } from './music-player.js';
import { initCountdown } from './countdown.js';
import { initGallery } from './gallery.js';
import { initReveal } from './reveal.js';
import { initSnow } from './snow/snow.js';

const music = initMusicPlayer();

// 拆信封時順便播放背景音樂（點擊算使用者互動，瀏覽器才允許播放）
initIntro({ onOpen: music.play });

initSnow({
  canvas: document.getElementById('snowCanvas'),
  area: document.querySelector('.hero-image-container'),
});

initCountdown(WEDDING_DATE);
initGallery({ photos: GALLERY_PHOTOS, watermark: WATERMARK });
initReveal();
