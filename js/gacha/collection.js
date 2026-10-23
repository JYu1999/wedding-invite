// 扭蛋圖鑑：記住扭到過哪些照片（存在訪客自己的瀏覽器），每張照片一格，扭到的顯示照片、還沒扭到的是問號
// 照片以檔名辨識，格子與總數都依 config.js 的清單產生：之後新增照片會自動多一格、總數跟著變，
// 已經收集的不受影響；從清單拿掉的照片就不再計入。照片改檔名會被當成一張新照片
// 浮動泡泡（bubble.js）顯示目前進度、點開圖鑑；刮完的照片按「再扭一次／退出」前會先飛進泡泡

import { load, save, seen, markSeen } from '../storage.js';
import { lockScroll, unlockScroll } from '../scroll-lock.js';
import { haptic, HAPTIC } from '../fx/haptics.js';
import { initBubble } from './bubble.js';
import { collectSound } from './effects.js';

const STORE_KEY = 'collection';
const FIRST_STASH_KEY = 'collection-first-stash';
const FLY_MS = 900;
const CLOSE_MS = 300;   // 與 CSS .album 淡出的 transition 一致

export function initCollection({ photos, lightbox, onPlay }) {
  const root = document.getElementById('album');
  if (!root || !photos.length) return null;

  const $ = (id) => document.getElementById(id);
  const grid = $('albumGrid');
  const countEl = $('albumCount');
  const totalEl = $('albumTotal');
  const bar = $('albumBar');
  const note = $('albumNote');
  const goBtn = $('albumGo');

  // 存的是檔名清單；seen 是在圖鑑裡看過的（沒看過的標 NEW、泡泡亮紅點）
  const saved = load(STORE_KEY, {});
  const owned = new Set(Array.isArray(saved.files) ? saved.files : []);
  const seenFiles = new Set(Array.isArray(saved.seen) ? saved.seen : []);
  const persist = () => save(STORE_KEY, { files: [...owned], seen: [...seenFiles] });

  let gachaOpen = false;

  const has = (photo) => owned.has(photo.file);
  const collected = () => photos.filter(has);
  const unseen = () => collected().filter((p) => !seenFiles.has(p.file)).length;
  const isOpen = () => !root.hidden;

  const bubble = initBubble({ onTap: () => open() });

  // shown：泡泡上顯示的數字；照片飛進泡泡的那一刻才加一
  let shown = collected().length;
  const refreshBubble = () => {
    if (!bubble) return;
    bubble.setProgress(shown, photos.length, unseen());
    // 首頁上有收藏才出現；扭蛋機裡一定出現，讓人一開始就知道可以收集
    bubble.setVisible(gachaOpen || shown > 0);
  };
  refreshBubble();


  const viewPhoto = (photo) => {
    const list = collected();
    lightbox?.open(list.map((p) => ({
      src: p.src,
      alt: p.name,
      caption: p.name,
      note: p.downloadable ? '' : '珍藏版，只能在這裡欣賞喔',
      protect: !p.downloadable,
      watermark: false,
      download: p.downloadable ? p.file : '',
    })), list.indexOf(photo));
  };

  const slot = (photo, i) => {
    const got = has(photo);
    const el = document.createElement(got ? 'button' : 'div');
    el.className = 'album-slot';
    el.classList.toggle('owned', got);
    el.classList.toggle('rare', !photo.downloadable);
    const no = document.createElement('span');
    no.className = 'album-no';
    no.textContent = `No.${String(i + 1).padStart(2, '0')}`;

    const pic = document.createElement('span');
    pic.className = 'album-pic';
    const label = document.createElement('span');
    label.className = 'album-name';

    if (got) {
      el.type = 'button';
      el.setAttribute('aria-label', `${photo.name}，點一下放大`);
      const img = document.createElement('img');
      img.src = photo.src;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.draggable = false;
      pic.append(img);
      label.textContent = photo.name;
      if (!seenFiles.has(photo.file)) {
        const badge = document.createElement('span');
        badge.className = 'album-new';
        badge.textContent = 'NEW';
        el.append(badge);
      }
      el.addEventListener('click', () => viewPhoto(photo));
    } else {
      el.setAttribute('aria-label', `No.${i + 1}：還沒扭到`);
      pic.innerHTML = '<span class="album-mystery" aria-hidden="true">?</span>';
      label.textContent = '？？？';
    }
    if (!photo.downloadable) {
      const tag = document.createElement('span');
      tag.className = 'album-rare-tag';
      tag.textContent = '珍藏';
      el.append(tag);
    }
    el.append(pic, no, label);
    return el;
  };

  const render = () => {
    const count = collected().length;
    const total = photos.length;
    countEl.textContent = count;
    totalEl.textContent = total;
    bar.style.width = `${(count / total) * 100}%`;
    note.textContent = count === total
      ? '全部集滿了！謝謝你陪我們一起收藏這些回憶 ♥'
      : count === 0
        ? '還沒有收藏，去轉一顆扭蛋吧'
        : `再收集 ${total - count} 張就全部集滿囉`;
    goBtn.textContent = gachaOpen ? '繼續扭蛋' : '去扭蛋';
    goBtn.hidden = count === total && !gachaOpen;
    grid.replaceChildren(...photos.map(slot));
  };

  function open() {
    if (isOpen()) return;
    render();
    root.hidden = false;
    lockScroll();
    requestAnimationFrame(() => root.classList.add('open'));
    $('albumClose').focus({ preventScroll: true });
  }

  const close = () => {
    if (!isOpen() || !root.classList.contains('open')) return;
    // 關掉時才把 NEW 標記清掉：這次打開都還看得到哪些是新的
    collected().forEach((p) => seenFiles.add(p.file));
    persist();
    refreshBubble();
    root.classList.remove('open');
    unlockScroll();
    setTimeout(() => {
      if (!root.classList.contains('open')) root.hidden = true;
    }, CLOSE_MS);
  };

  $('albumClose').addEventListener('click', close);
  root.addEventListener('click', (e) => {
    if (e.target === root) close();
  });
  goBtn.addEventListener('click', () => {
    close();
    if (!gachaOpen) onPlay?.();
  });
  grid.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.album-slot.rare')) e.preventDefault();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !isOpen()) return;
    e.stopImmediatePropagation();
    close();
  });

  // 扭到照片：馬上存起來（就算直接關掉網頁也不會遺失），回傳是不是第一次扭到
  const add = (photo) => {
    if (has(photo)) return false;
    owned.add(photo.file);
    persist();
    return true;
  };

  // 刮完的照片縮小、沿著弧線飛進泡泡，泡泡吞一下、數字加一
  const stash = async (card, src, isNew) => {
    if (!bubble) return;
    const from = card.getBoundingClientRect();
    const to = bubble.target();
    const fly = document.createElement('img');
    fly.className = 'album-fly';
    fly.src = src;
    fly.alt = '';
    Object.assign(fly.style, {
      left: `${from.left}px`,
      top: `${from.top}px`,
      width: `${from.width}px`,
      height: `${from.height}px`,
    });
    document.body.append(fly);
    card.classList.add('stashed');

    const dx = to.x - (from.left + from.width / 2);
    const dy = to.y - (from.top + from.height / 2);
    const end = 30 / Math.max(from.width, from.height);
    const move = (t, lift, scale, rotate) => `translate(${dx * t}px, ${dy * t - lift}px) scale(${scale}) rotate(${rotate}deg)`;
    await fly.animate([
      { transform: move(0, 0, 1, 0) },
      { transform: move(0, 0, 1.05, -2), offset: 0.15, easing: 'ease-in' },
      { transform: move(0.45, 60, 0.42, -8), offset: 0.55, easing: 'ease-in' },
      { transform: move(1, 0, end, 12), opacity: 0.85 },
    ], { duration: FLY_MS, easing: 'cubic-bezier(0.5, 0, 0.6, 1)', fill: 'forwards' }).finished.catch(() => {});
    fly.remove();

    shown = collected().length;
    refreshBubble();
    bubble.gulp();
    collectSound(isNew);
    haptic(HAPTIC.collect);
    const progress = `${shown}/${photos.length}`;
    if (isNew && !seen(FIRST_STASH_KEY)) {
      markSeen(FIRST_STASH_KEY);
      bubble.toast(`收進扭蛋圖鑑了！（${progress}）點我隨時查看，按住可以拖曳`, 4200);
    } else {
      bubble.toast(isNew ? `收進扭蛋圖鑑 ${progress}` : '這張已經收藏過囉');
    }
  };

  // 扭蛋機打開／關閉時通知：泡泡在扭蛋機裡一定出現
  const setGachaOpen = (value) => {
    gachaOpen = value;
    refreshBubble();
  };

  return { has, add, stash, setGachaOpen, isOpen, open };
}
