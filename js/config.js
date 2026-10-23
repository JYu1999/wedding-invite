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

// 聖誕扭蛋機（點月曆上的 🎄）：每次從全部照片中隨機挑一張，抽中時顯示檔名（不含副檔名）
// 照片依資料夾分兩種：downloadable/ 抽中後可以儲存，non-downloadable/ 只能欣賞（在扭蛋圖鑑裡標「珍藏」）
// 新增照片時放進對應資料夾，再把檔名加進下面對應的清單；扭蛋圖鑑會自動多一格、總數跟著變
// 扭蛋圖鑑用檔名記住訪客收集過哪些照片：已經放上網站的照片不要改檔名，否則會被當成新的一張
const LOTTERY_DIR = 'assets/images/lottery/';

const LOTTERY_DOWNLOADABLE = [
  '一起睡覺的好姐妹直到麻吉翻了身.jpg',
  '再見了小泰飽.jpg',
  '回眸一笑的令狗.jpg',
  '坐沙發看電視的麻吉.jpg',
  '搶令狗玩具的麻吉.jpg',
  '搶奪紅蘿蔔的令狗.jpg',
  '有新玩具的麻吉.jpg',
  '正在坐飛機的兔兔和大巴巴公爵.jpg',
  '歪七扭八的麻吉.jpg',
  '看什麼看！麻吉.jpg',
  '眺望遠方的小企鵝🐧.jpg',
  '紅蘿蔔被偷走的令狗.jpg',
  '肥嘟嘟麻吉.jpg',
  '豆芽和小波.jpg',
  '賣光紅蘿蔔的小令狗.jpg',
  '賣紅蘿蔔的小令狗.jpg',
  '迷你小麻吉.jpg',
  '麻吉和令狗修煉柔術ing.jpg',
  '麻吉的小腦袋瓜.jpg',
  '麻吉睡搞搞.jpg',
  '麻吉與她的青蛙🐸好夥伴.jpg',
];

const LOTTERY_VIEW_ONLY = [
  '7 與兩隻貓.jpg',
  '不敢睜開眼希望是我的幻覺.jpg',
  '京都塔下的美女與野獸.jpg',
  '喜歡你:妳在我身邊的每一個日子.jpg',
  '斯巴達女壯士.JPG',
  '泰國公主和她的仰慕者.jpg',
  '第一次見到麻吉.jpg',
  '賞櫻初體驗.jpg',
  '青森弘前城の櫻花愛心.jpg',
];

// macOS 檔名不能有「/」，Finder 會存成「:」，顯示時換回來
const lotteryPhoto = (folder, downloadable) => (file) => ({
  src: `${LOTTERY_DIR}${folder}/${encodeURIComponent(file)}`,
  file,
  name: file.replace(/\.[^.]+$/, '').replace(/:/g, '/'),
  downloadable,
});

// 還沒收集到的照片被抽中的機會是收集過的幾倍：1 就是完全隨機；調高一點比較容易集滿，重複的比較少
export const LOTTERY_NEW_WEIGHT = 3;

export const LOTTERY_PHOTOS = [
  ...LOTTERY_DOWNLOADABLE.map(lotteryPhoto('downloadable', true)),
  ...LOTTERY_VIEW_ONLY.map(lotteryPhoto('non-downloadable', false)),
];
