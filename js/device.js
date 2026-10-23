// 裝置判斷：iPhone／iPad（新的 iPad 會偽裝成 Mac，要再看觸控點數）、是否用手指操作

export const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isTouch = () => window.matchMedia('(pointer: coarse)').matches;
