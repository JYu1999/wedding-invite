// 開場拆信封：open（掀蓋）→ pulling（信紙從袋中抽出，仍被袋身遮擋）→ pulled（信紙移到最前方放大）
// → 使用者看完正面後點擊翻面 → 鏡頭推進穿過信紙背面的圓窗，進入首頁

const PULL_START_MS = 700;   // 封蓋翻開後開始抽信
const PULLED_MS = 2150;      // 信紙完全離開信封
const FLIP_HINT_MS = 3000;   // 信紙放大定位後才提示「點擊翻面」
const FLIP_MS = 1000;        // 與 CSS .flipped 的 transition 一致
const ZOOM_DELAY_MS = 350;   // 翻到背面後停頓一下再推進
const ZOOM_MS = 2000;
const ZOOM_MAX_SCALE = 70;
const HOLE_FEATHER = 48;     // 與 CSS 遮罩的羽化寬度一致

const smoothstep = (a, b, t) => {
  const x = Math.min(Math.max((t - a) / (b - a), 0), 1);
  return x * x * (3 - 2 * x);
};

export function initIntro({ onOpen, onEnter } = {}) {
  const overlay = document.getElementById('intro-overlay');
  const envelope = document.getElementById('envelopeBox');
  const portal = document.getElementById('letterPortal');
  if (!overlay || !envelope || !portal) return;

  // 每次都從首頁最上面開始：關掉瀏覽器「重新整理後回到上次捲動位置」的行為
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  let stage = 'idle';
  let cleanupOpenFx = null;

  const finish = () => {
    overlay.classList.add('done');
    document.body.classList.remove('intro-active', 'intro-entering');
    // 遮罩隱藏後才清掉開信特效，翻面與推進期間遮罩裡的圖層結構都不變動
    cleanupOpenFx?.();
  };

  // 鏡頭以背面圓窗為中心指數放大，同時在遮罩上挖洞，洞裡就是首頁
  const zoomThrough = () => {
    window.scrollTo(0, 0);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }

    const box = envelope.getBoundingClientRect();
    const hole = portal.getBoundingClientRect();
    const cx = hole.left + hole.width / 2;
    const cy = hole.top + hole.height / 2;
    const portalRadius = hole.width / 2;
    const maxRadius = Math.hypot(window.innerWidth, window.innerHeight);

    envelope.style.transformOrigin = `${cx - box.left}px ${cy - box.top}px`;
    envelope.classList.add('zooming');
    overlay.style.setProperty('--hole-x', `${cx}px`);
    overlay.style.setProperty('--hole-y', `${cy}px`);
    overlay.style.setProperty('--hole-r', `${-HOLE_FEATHER}px`);
    overlay.classList.add('entering');
    document.body.classList.add('intro-entering');

    const start = performance.now();
    const frame = (now) => {
      const t = Math.min((now - start) / ZOOM_MS, 1);
      // 指數放大：越靠近推得越快，像鏡頭一路衝進信紙
      const scale = ZOOM_MAX_SCALE ** (t ** 1.7);
      envelope.style.transform = `scale(${scale})`;

      // 圓窗中心先透出光，再隨著推進把洞撐開到整個畫面
      const open = smoothstep(0.12, 0.7, t);
      const radius = -HOLE_FEATHER + (portalRadius * scale * 0.85 + HOLE_FEATHER) * open;
      overlay.style.setProperty('--hole-r', `${radius}px`);

      if (t < 1 && radius < maxRadius) requestAnimationFrame(frame);
      else finish();
    };
    requestAnimationFrame(frame);
  };

  overlay.addEventListener('click', () => {
    if (stage === 'idle') {
      stage = 'opening';
      overlay.classList.add('opening');
      envelope.classList.add('open');
      cleanupOpenFx = onOpen?.(envelope);

      setTimeout(() => envelope.classList.add('pulling'), PULL_START_MS);
      setTimeout(() => envelope.classList.add('pulled'), PULLED_MS);
      setTimeout(() => {
        stage = 'pulled';
        overlay.classList.add('can-flip');
      }, FLIP_HINT_MS);
      return;
    }

    if (stage === 'pulled') {
      stage = 'entering';
      overlay.classList.remove('can-flip');
      envelope.classList.add('flipped');
      onEnter?.();
      setTimeout(zoomThrough, FLIP_MS + ZOOM_DELAY_MS);
    }
  });
}
