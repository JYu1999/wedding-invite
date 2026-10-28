// 跟令狗一起收集紅蘿蔔：讓手機上的遊戲畫面變大，不被瀏覽器的網址列擋住
// Android、iPad、電腦：用全螢幕 API，網址列整個消失，手機上順便鎖定橫向
// iPhone 的 Safari 不讓網頁全螢幕（只有影片可以）；不過 Safari 在畫面捲動時會把網址列收起來，
// 所以網址列還在時請玩家往上滑一下（見 game.js 的 ls-swipe）

import { IS_IOS, isTouch } from '../device.js';

export const canFullscreen = () => Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);
export const isFullscreen = () => Boolean(document.fullscreenElement || document.webkitFullscreenElement);

// 要在點擊當下呼叫，瀏覽器才會答應
export function enterFullscreen(el) {
  if (!canFullscreen() || isFullscreen()) return;
  const request = el.requestFullscreen ?? el.webkitRequestFullscreen;
  // 舊版 Safari 的 webkitRequestFullscreen 不回傳 Promise
  Promise.resolve(request?.call(el, { navigationUI: 'hide' }))
    .then(() => screen.orientation?.lock?.('landscape'))
    .catch(() => {});
}

export function exitFullscreen() {
  if (!isFullscreen()) return;
  Promise.resolve((document.exitFullscreen ?? document.webkitExitFullscreen)?.call(document)).catch(() => {});
}

export function onFullscreenChange(fn) {
  document.addEventListener('fullscreenchange', fn);
  document.addEventListener('webkitfullscreenchange', fn);
}

// iPhone Safari 橫拿時網址列還在：畫面高度比螢幕的短邊矮
// 從主畫面打開（navigator.standalone）沒有網址列，不用提示
export const iosBarsShowing = () => IS_IOS && isTouch() && !canFullscreen() && !navigator.standalone
  && innerWidth > innerHeight && innerHeight < Math.min(screen.width, screen.height) - 8;
