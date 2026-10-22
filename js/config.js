// 網站可調整的內容集中在這裡：婚禮時間、照片清單、浮水印文字

// 倒數計時的目標時間
export const WEDDING_DATE = new Date('2026-12-20T12:00:00');

// 美好剪影：照片放在 assets/images/gallery/，新增照片只要把檔名加進來
const GALLERY_DIR = 'assets/images/gallery/';
export const GALLERY_PHOTOS = [
  'Cody036.jpg',
  'Cody080.jpg',
  'Cody151.jpg',
  'Cody169.jpg',
  'Cody237.jpg',
  'Cody245.jpg',
  'Cody312.jpg',
  'Cody333.jpg',
  'Cody362.jpg',
  'Cody368.jpg',
].map((file) => GALLERY_DIR + file);

// 藝廊照片與燈箱上的浮水印
export const WATERMARK = {
  names: 'JYU & CHI',
  script: 'Wedding',
};
