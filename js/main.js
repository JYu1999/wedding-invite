// 進入點：初始化各區塊功能

import { WEDDING_DATE, GALLERY_FEATURED, GALLERY_PHOTOS, WATERMARK } from './config.js';
import { initIntro } from './intro.js';
import { playOpenEffect } from './fx/open-effects.js';
import { initMusicPlayer } from './music-player.js';
import { initCountdown } from './countdown.js';
import { initGallery } from './gallery.js';
import { initReveal } from './reveal.js';
import { initSnow } from './snow/snow.js';

const music = initMusicPlayer();

// 拆信封時播放「開寶箱」特效與音效；翻面進入首頁時開始播放背景音樂
// （兩者都在點擊當下觸發，算使用者互動，瀏覽器才允許出聲）
initIntro({ onOpen: playOpenEffect, onEnter: music.play });

initSnow({
  canvas: document.getElementById('snowCanvas'),
  area: document.querySelector('.hero-image-container'),
});

initCountdown(WEDDING_DATE);
initGallery({ featured: GALLERY_FEATURED, photos: GALLERY_PHOTOS, watermark: WATERMARK });
initReveal();
