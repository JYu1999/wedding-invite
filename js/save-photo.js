// 儲存照片：扭蛋機刮完的照片與扭蛋圖鑑的燈箱共用
// iPhone 用分享選單（可以直接「儲存影像」到相簿），其他裝置直接下載原檔
// 分享選單要在點擊當下就拿到檔案，所以照片一出現就先用 preloadPhoto 在背景載好

import { IS_IOS } from './device.js';

const blobs = new Map();   // src → 載好的 Blob（載入中是 null）

export function preloadPhoto(src) {
  if (!IS_IOS || !navigator.canShare || blobs.has(src)) return;
  blobs.set(src, null);
  fetch(src)
    .then((r) => (r.ok ? r.blob() : null))
    .then((blob) => (blob ? blobs.set(src, blob) : blobs.delete(src)))
    .catch(() => blobs.delete(src));
}

// photo：{ src, file }，file 是存下來的檔名
export function savePhoto({ src, file }) {
  const blob = blobs.get(src);
  if (IS_IOS && blob) {
    const shared = new File([blob], file, { type: blob.type || 'image/jpeg' });
    if (navigator.canShare?.({ files: [shared] })) {
      navigator.share({ files: [shared] }).catch(() => {});
      return;
    }
  }
  if (IS_IOS) {
    // LINE 等內建瀏覽器不支援分享檔案：另開照片，長按即可儲存
    window.open(src, '_blank');
    return;
  }
  const link = document.createElement('a');
  link.href = src;
  link.download = file;
  document.body.append(link);
  link.click();
  link.remove();
}
