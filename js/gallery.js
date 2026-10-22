// 美好剪影：依 config 產生照片格、加上浮水印，點擊開啟燈箱

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

export function initGallery({ photos, watermark }) {
  const grid = document.getElementById('galleryGrid');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  if (!grid) return;

  photos.forEach((src, i) => {
    const item = document.createElement('figure');
    item.className = 'gallery-item';

    const img = document.createElement('img');
    img.src = src;
    img.alt = `婚紗照 ${i + 1}`;
    img.loading = 'lazy';
    img.decoding = 'async';

    item.append(img, createWatermark(watermark));
    grid.append(item);
  });

  if (!lightbox || !lightboxImg) return;
  lightboxImg.closest('.lightbox-frame')?.append(createWatermark(watermark));

  grid.addEventListener('click', (e) => {
    const item = e.target.closest('.gallery-item');
    if (!item) return;
    lightboxImg.src = item.querySelector('img').src;
    lightbox.classList.add('open');
  });

  lightbox.addEventListener('click', () => lightbox.classList.remove('open'));
}
