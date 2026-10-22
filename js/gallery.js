// 婚紗剪影：最喜歡的一張置頂放大，其餘照片直式並排、橫式另成一列（都不裁切），加上浮水印，點擊開啟燈箱
// 燈箱可用 ‹ › 按鈕、鍵盤方向鍵、手機左右滑切換，按 ✕、Esc 或點背景關閉

const SWIPE_MIN_PX = 40;

// 每種螢幕寬度的排列樣式，照片依序重複套用：
// 手機兩欄：直、直一列，橫式獨佔一列；電腦三欄：三張直式一列、三張橫式一列
const NARROW_PATTERN = ['portrait', 'portrait', 'landscape'];
const WIDE_PATTERN = ['portrait', 'portrait', 'portrait', 'landscape', 'landscape', 'landscape'];

// 算出每張照片套用排列樣式後的順序；某種形狀用完了就拿另一種補上
function layoutOrder(photos, pattern) {
  const queues = { portrait: [], landscape: [] };
  photos.forEach((photo, i) => queues[photo.shape].push(i));
  const order = [];
  let next = 0;
  while (next < photos.length) {
    for (const shape of pattern) {
      const queue = queues[shape].length ? queues[shape] : queues[shape === 'portrait' ? 'landscape' : 'portrait'];
      if (!queue.length) break;
      order[queue.shift()] = next++;
    }
  }
  return order;
}

function createWatermark({ names, script }) {
  const mark = document.createElement('span');
  mark.className = 'watermark';
  mark.setAttribute('aria-hidden', 'true');

  const namesEl = document.createElement('span');
  namesEl.className = 'watermark-names';
  namesEl.textContent = names;

  const scriptEl = document.createElement('span');
  scriptEl.className = 'watermark-script';
  scriptEl.textContent = script;

  mark.append(namesEl, scriptEl);
  return mark;
}

function initLightbox(watermark) {
  const lightbox = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  const counter = document.getElementById('lightboxCounter');
  if (!lightbox || !img) return null;

  img.closest('.lightbox-frame')?.append(createWatermark(watermark));

  let photos = [];
  let index = 0;

  const show = (i) => {
    index = (i + photos.length) % photos.length;
    img.classList.add('switching');
    img.onload = () => img.classList.remove('switching');
    img.src = photos[index];
    img.alt = `婚紗照 ${index + 1}`;
    if (counter) counter.textContent = `${index + 1} / ${photos.length}`;
    // 預先載入前後兩張，切換時不必等
    [index - 1, index + 1].forEach((j) => {
      new Image().src = photos[(j + photos.length) % photos.length];
    });
  };

  // 照片清單依畫面上的排列順序傳入，左右切換才會跟看到的順序一致
  const open = (list, i) => {
    photos = list;
    show(i);
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const close = () => {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  };

  const bind = (id, fn) => document.getElementById(id)?.addEventListener('click', (e) => {
    e.stopPropagation();
    fn();
  });
  bind('lightboxClose', close);
  bind('lightboxPrev', () => show(index - 1));
  bind('lightboxNext', () => show(index + 1));

  // 點照片本身不關閉，點背景才關閉
  lightbox.addEventListener('click', (e) => {
    if (!e.target.closest('.lightbox-frame')) close();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === 'ArrowRight') show(index + 1);
  });

  // 手機左右滑切換
  let startX = 0;
  let startY = 0;
  lightbox.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy)) return;
    show(dx < 0 ? index + 1 : index - 1);
  });

  return { open };
}

function createItem({ src, alt, shape, featured = false }, watermark) {
  const item = document.createElement('figure');
  item.className = `gallery-item gallery-item--${featured ? 'featured' : shape}`;

  const img = document.createElement('img');
  img.src = src;
  img.alt = alt;
  img.loading = featured ? 'eager' : 'lazy';
  img.decoding = 'async';

  item.append(img, createWatermark(watermark));
  return item;
}

export function initGallery({ featured, photos, watermark }) {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;

  if (featured) {
    grid.append(createItem({ src: featured, alt: '婚紗照 精選', featured: true }, watermark));
  }

  const narrow = layoutOrder(photos, NARROW_PATTERN);
  const wide = layoutOrder(photos, WIDE_PATTERN);
  photos.forEach((photo, i) => {
    const item = createItem({ ...photo, alt: `婚紗照 ${i + 1}` }, watermark);
    item.style.setProperty('--order-narrow', narrow[i]);
    item.style.setProperty('--order-wide', wide[i]);
    grid.append(item);
  });

  const lightbox = initLightbox(watermark);
  if (!lightbox) return;

  grid.addEventListener('click', (e) => {
    const item = e.target.closest('.gallery-item');
    if (!item) return;
    // 依畫面上由上到下、由左到右的位置排序
    const visual = [...grid.children]
      .map((el) => ({ el, rect: el.getBoundingClientRect() }))
      .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left)
      .map(({ el }) => el);
    lightbox.open(visual.map((el) => el.querySelector('img').src), visual.indexOf(item));
  });
}
