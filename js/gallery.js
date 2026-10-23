// 婚紗剪影：最喜歡的一張置頂放大，其餘照片直式並排、橫式另成一列（都不裁切），加上浮水印，點擊開啟燈箱（lightbox.js）
// 照片只能欣賞，不提供儲存：擋掉右鍵另存、拖曳與長按選單

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

export function createWatermark({ names, script }) {
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

function createItem({ src, alt, shape, featured = false }, watermark) {
  const item = document.createElement('figure');
  item.className = `gallery-item gallery-item--${featured ? 'featured' : shape}`;

  const img = document.createElement('img');
  img.src = src;
  img.alt = alt;
  img.loading = featured ? 'eager' : 'lazy';
  img.decoding = 'async';
  img.draggable = false;

  item.append(img, createWatermark(watermark));
  return item;
}

export function initGallery({ featured, photos, watermark, lightbox }) {
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

  grid.addEventListener('contextmenu', (e) => e.preventDefault());

  if (!lightbox) return;

  grid.addEventListener('click', (e) => {
    const item = e.target.closest('.gallery-item');
    if (!item) return;
    // 依畫面上由上到下、由左到右的位置排序
    const visual = [...grid.children]
      .map((el) => ({ el, rect: el.getBoundingClientRect() }))
      .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left)
      .map(({ el }) => el);
    const items = visual.map((el) => {
      const img = el.querySelector('img');
      return { src: img.src, alt: img.alt };
    });
    lightbox.open(items, visual.indexOf(item));
  });
}
