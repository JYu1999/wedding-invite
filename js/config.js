// 網站可調整的內容集中在這裡：婚禮時間、照片清單、浮水印文字

// 倒數計時的目標時間
export const WEDDING_DATE = new Date('2026-12-20T18:00:00');

// 婚紗剪影：照片放在 assets/images/gallery/
const GALLERY_DIR = 'assets/images/gallery/';

// 最喜歡的一張：放在最上面、獨立一列並放大
export const GALLERY_FEATURED = GALLERY_DIR + 'Cody036.jpg';

// 其他照片：新增照片時加一行並標明直式（portrait）或橫式（landscape），
// 排版會依此把直式並排、橫式另成一列，照片都不裁切
export const GALLERY_PHOTOS = [
  { file: 'Cody080.jpg', shape: 'portrait' },
  { file: 'Cody151.jpg', shape: 'portrait' },
  { file: 'Cody169.jpg', shape: 'portrait' },
  { file: 'Cody312.jpg', shape: 'landscape' },
  { file: 'Cody237.jpg', shape: 'portrait' },
  { file: 'Cody245.jpg', shape: 'portrait' },
  { file: 'Cody333.jpg', shape: 'landscape' },
  { file: 'Cody362.jpg', shape: 'portrait' },
  { file: 'Cody368.jpg', shape: 'landscape' },
].map(({ file, shape }) => ({ src: GALLERY_DIR + file, shape }));

// 藝廊照片與燈箱上的浮水印
export const WATERMARK = {
  names: 'JYU & CHI',
  script: 'Wedding',
};
