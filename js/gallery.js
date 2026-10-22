// 婚紗剪影：依 config 產生照片牆（保留原始比例，不裁切）、加上浮水印，點擊開啟燈箱
// 燈箱可用 ‹ › 按鈕、鍵盤方向鍵、手機左右滑切換，按 ✕、Esc 或點背景關閉

const SWIPE_MIN_PX = 40;

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

function initLightbox(photos, watermark) {
  const lightbox = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  const counter = document.getElementById('lightboxCounter');
  if (!lightbox || !img) return null;

  img.closest('.lightbox-frame')?.append(createWatermark(watermark));

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

  const open = (i) => {
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

export function initGallery({ photos, watermark }) {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;

  photos.forEach((src, i) => {
    const item = document.createElement('figure');
    item.className = 'gallery-item';
    item.dataset.index = i;

    const img = document.createElement('img');
    img.src = src;
    img.alt = `婚紗照 ${i + 1}`;
    img.loading = 'lazy';
    img.decoding = 'async';

    item.append(img, createWatermark(watermark));
    grid.append(item);
  });

  const lightbox = initLightbox(photos, watermark);
  if (!lightbox) return;

  grid.addEventListener('click', (e) => {
    const item = e.target.closest('.gallery-item');
    if (item) lightbox.open(Number(item.dataset.index));
  });
}
