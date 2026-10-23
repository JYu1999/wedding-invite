// 進入點：初始化各區塊功能

import { WEDDING_DATE, GALLERY_FEATURED, GALLERY_PHOTOS, WATERMARK, LOTTERY_PHOTOS, LOTTERY_NEW_WEIGHT } from './config.js';
import { initIntro } from './intro.js';
import { playOpenEffect } from './fx/open-effects.js';
import { initMusicPlayer } from './music-player.js';
import { initCountdown } from './countdown.js';
import { initGallery, createWatermark } from './gallery.js';
import { initLightbox } from './lightbox.js';
import { initReveal } from './reveal.js';
import { initSnow } from './snow/snow.js';
import { initGacha } from './gacha/gacha.js';
import { initCollection } from './gacha/collection.js';
import { initVenueMap } from './venue-map.js';
import { initLoveTap } from './love-tap.js';

const music = initMusicPlayer();

// 拆信封時播放「開寶箱」特效與音效；翻面進入首頁時開始播放背景音樂
// （兩者都在點擊當下觸發，算使用者互動，瀏覽器才允許出聲）
initIntro({ onOpen: playOpenEffect, onEnter: music.play });

initSnow({
  canvas: document.getElementById('snowCanvas'),
  area: document.querySelector('.hero-image-container'),
});

initCountdown(WEDDING_DATE);
initLoveTap(document.getElementById('weddingDay'));
initVenueMap();
// 燈箱、扭蛋圖鑑、扭蛋機都會處理 Esc，要依這個順序初始化：疊在最上面的先處理
const lightbox = initLightbox({ watermark: () => createWatermark(WATERMARK) });
initGallery({ featured: GALLERY_FEATURED, photos: GALLERY_PHOTOS, watermark: WATERMARK, lightbox });
initReveal();
const collection = initCollection({ photos: LOTTERY_PHOTOS, lightbox, onPlay: () => gacha?.open() });
const gacha = initGacha({
  trigger: document.getElementById('gachaTrigger'),
  photos: LOTTERY_PHOTOS,
  collection,
  newWeight: LOTTERY_NEW_WEIGHT,
});
