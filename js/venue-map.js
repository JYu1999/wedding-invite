// 宴會場地地圖：捲到地圖時，像 Google 地球一樣從整個台灣慢慢飛近
// 台灣 → 台南 → 安平 → 福爾摩沙遊艇酒店，每一站停一下並顯示地名，最後插上愛心圖釘，再淡入可以操作的 Google 地圖
// 飛行畫面用 Leaflet（快捲到地圖時才從 CDN 載入）搭配 Esri 衛星影像；Google 地圖的嵌入畫面無法用程式控制鏡頭
// 載入失敗或系統設定「減少動態效果」時直接顯示 Google 地圖；飛完可以按「重新飛一次」

const LEAFLET = {
  js: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  jsIntegrity: 'sha384-NElt3Op+9NBMCYaef5HxeJmU4Xeard/Lku8ek6hoPTvYkQPh3zLIrJP7KiRocsxO',
  css: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  cssIntegrity: 'sha384-c6Rcwz4e4CITMbu/NBmnNS8yN2sC3cUElMEMfP3vqqKFp7GOYaaBBCqmaWBjmkjb',
};
const TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const TILE_MAX_ZOOM = 18;
const ATTRIBUTION = 'Imagery &copy; Esri, Maxar, Earthstar Geographics';

const HOTEL = [22.9989225, 120.1554594];

// 每一站要框進畫面的範圍；fly：從上一站飛過來的秒數，hold：停留的毫秒數
// 最後一站的範圍故意偏南一點，讓飯店的圖釘在畫面偏上，不被左下角的地名擋到
const STAGES = [
  { en: 'TAIWAN', name: '台灣', bounds: [[21.85, 119.95], [25.35, 122.05]], hold: 1400 },
  { en: 'TAINAN', name: '台南', bounds: [[22.93, 120.12], [23.07, 120.28]], fly: 3.2, hold: 1700 },
  { en: 'ANPING', name: '安平', bounds: [[22.988, 120.143], [23.006, 120.172]], fly: 2.8, hold: 1700 },
  { en: 'FORMOSA YACHT HOTEL', name: '福爾摩沙遊艇酒店', bounds: [[22.9973, 120.1542], [22.9995, 120.1567]], fly: 2.8, hold: 2600 },
];
const TILE_WAIT_MS = 2500;   // 第一站的衛星影像最多等這麼久就開始飛
const FADE_MS = 900;         // 與 CSS .venue-map.done 的淡出一致

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let leafletReady = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  leafletReady ??= new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = LEAFLET.css;
    css.integrity = LEAFLET.cssIntegrity;
    css.crossOrigin = 'anonymous';
    document.head.append(css);
    const script = document.createElement('script');
    script.src = LEAFLET.js;
    script.integrity = LEAFLET.jsIntegrity;
    script.crossOrigin = 'anonymous';
    script.onload = () => (window.L ? resolve(window.L) : reject(new Error('Leaflet missing')));
    script.onerror = reject;
    document.head.append(script);
  });
  return leafletReady;
}

// 先在背景載好後面幾站的衛星影像，飛到時才不會一片模糊
function prefetchTiles(L, map, stages) {
  const size = map.getSize();
  stages.forEach(({ bounds }) => {
    const zoom = Math.min(Math.round(map.getBoundsZoom(bounds)), TILE_MAX_ZOOM);
    const center = map.project(L.latLngBounds(bounds).getCenter(), zoom);
    const min = center.subtract(size.divideBy(2)).divideBy(256).floor();
    const max = center.add(size.divideBy(2)).divideBy(256).floor();
    for (let x = min.x; x <= max.x; x++) {
      for (let y = min.y; y <= max.y; y++) {
        new Image().src = L.Util.template(TILES, { z: zoom, x, y });
      }
    }
  });
}

export function initVenueMap() {
  const root = document.getElementById('venueMap');
  const stage = document.getElementById('venueMapFly');
  if (!root || !stage) return;
  const $ = (id) => document.getElementById(id);
  const label = $('venueMapLabel');
  const replayBtn = $('venueMapReplay');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const showGoogle = () => root.classList.add('done', 'static');
  if (reduceMotion) {
    showGoogle();
    return;
  }

  let map = null;
  let pin = null;
  let run = 0;          // 每次播放加一，舊的流程看到不一樣就停下
  let visible = false;
  let played = false;

  const setLabel = (s) => {
    label.classList.remove('show');
    if (!s) return;
    label.innerHTML = '';
    const en = document.createElement('span');
    en.className = 'venue-map-label-en';
    en.textContent = s.en;
    const name = document.createElement('span');
    name.className = 'venue-map-label-name';
    name.textContent = s.name;
    label.append(en, name);
    requestAnimationFrame(() => label.classList.add('show'));
  };

  const flyTo = (s) => new Promise((resolve) => {
    map.once('moveend', resolve);
    map.flyToBounds(s.bounds, { duration: s.fly, easeLinearity: 0.2 });
  });

  const finish = () => {
    run++;
    setLabel(null);
    root.classList.add('done');
    replayBtn.hidden = false;
  };

  const play = async () => {
    const current = ++run;
    played = true;
    root.classList.remove('done');
    replayBtn.hidden = true;
    pin?.remove();
    map.fitBounds(STAGES[0].bounds, { animate: false });
    await wait(FADE_MS * 0.5);

    for (const [i, s] of STAGES.entries()) {
      if (current !== run) return;
      if (i > 0) {
        label.classList.remove('show');
        await flyTo(s);
        if (current !== run) return;
      }
      if (i === STAGES.length - 1) pin = window.L.marker(HOTEL, { icon: pinIcon, interactive: false }).addTo(map);
      setLabel(s);
      await wait(s.hold);
    }
    if (current === run) finish();
  };

  let pinIcon = null;
  const setup = async () => {
    const L = await loadLeaflet();
    map = L.map(stage, {
      zoomSnap: 0,
      zoomControl: false,
      dragging: false,
      touchZoom: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: true,
    });
    map.attributionControl.setPrefix(false);
    const tiles = L.tileLayer(TILES, { maxNativeZoom: TILE_MAX_ZOOM, maxZoom: 20, attribution: ATTRIBUTION });
    const firstTiles = new Promise((resolve) => tiles.once('load', resolve));
    tiles.addTo(map);
    map.fitBounds(STAGES[0].bounds, { animate: false });
    pinIcon = L.divIcon({
      className: 'venue-pin',
      html: '<span class="venue-pin-heart">♥</span><span class="venue-pin-pulse"></span>',
      iconSize: [40, 48],
      iconAnchor: [20, 46],
    });
    prefetchTiles(L, map, STAGES.slice(1));
    await Promise.race([firstTiles, wait(TILE_WAIT_MS)]);
    root.classList.add('ready');
  };

  let ready = null;
  const prepare = () => (ready ??= setup().catch(showGoogle));

  // 快捲到地圖時先載入；地圖大半進入畫面才開始飛（只自動飛一次）
  const preload = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    preload.disconnect();
    prepare();
  }, { rootMargin: '600px 0px' });
  preload.observe(root);

  const watch = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (!visible || played) return;
    prepare().then(() => {
      if (map && visible && !played) play();
    });
  }, { threshold: 0.6 });
  watch.observe(root);

  replayBtn.addEventListener('click', () => {
    if (map) play();
  });
}
