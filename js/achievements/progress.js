// 成就進度：記下訪客在網站上做過的事（存在自己的瀏覽器），紀錄達到成就的目標就解鎖
// 網站各處直接 import 這裡的三個函式記錄，不用知道有哪些成就；成就怎麼算在 list.js
//   increment(stat)        次數加一：點愛心、扭蛋、清積雪⋯⋯
//   recordMax(stat, value) 只留最高紀錄：遛麻吉走了幾公尺
//   markItem(stat, key)    收集一組不重複的項目：扭到的照片、看過的婚紗照
// 解鎖時通知 onUnlock 註冊的對象（ui.js 跳出通知、更新積分）；quiet 的解鎖不跳通知，只在泡泡上亮紅點
// 三個函式都可以加 { quiet: true }：補記成就上線前就有的紀錄時用（見 legacy.js）

import { load, save } from '../storage.js';
import { ACHIEVEMENTS } from './list.js';

const STORE_KEY = 'achievements';

// stats：每項紀錄的數字，或一組項目（存成陣列）；unlocked：成就 id → 解鎖時間；seen：在成就清單裡看過的
const saved = load(STORE_KEY, {});
const stats = saved.stats && typeof saved.stats === 'object' ? saved.stats : {};
const unlocked = saved.unlocked && typeof saved.unlocked === 'object' ? saved.unlocked : {};
const seen = new Set(Array.isArray(saved.seen) ? saved.seen : []);
const persist = () => save(STORE_KEY, { stats, unlocked, seen: [...seen] });

const listeners = new Set();

const value = (stat) => stats[stat] ?? 0;

export function progressOf(a) {
  const v = value(a.stat);
  if (a.count) return a.count(new Set(Array.isArray(v) ? v : []));
  return Array.isArray(v) ? v.length : Number(v) || 0;
}

export const isUnlocked = (a) => Boolean(unlocked[a.id]);
export const unlockedAt = (a) => unlocked[a.id];

// 紀錄變了：存起來，檢查用到這項紀錄、還沒解鎖的成就
function check(stat, quiet = false) {
  const fresh = ACHIEVEMENTS.filter((a) => a.stat === stat && !isUnlocked(a) && progressOf(a) >= a.goal);
  fresh.forEach((a) => { unlocked[a.id] = Date.now(); });
  persist();
  fresh.forEach((a) => listeners.forEach((fn) => fn(a, { quiet })));
}

// 之後新增的成就，如果以前的紀錄就已經達標，打開網站時直接算完成
if (ACHIEVEMENTS.some((a) => !isUnlocked(a) && progressOf(a) >= a.goal)) {
  new Set(ACHIEVEMENTS.map((a) => a.stat)).forEach((stat) => check(stat, true));
}

export function increment(stat, n = 1, { quiet = false } = {}) {
  stats[stat] = (Number(stats[stat]) || 0) + n;
  check(stat, quiet);
}

export function recordMax(stat, v, { quiet = false } = {}) {
  if (!(v > (Number(stats[stat]) || 0))) return;
  stats[stat] = v;
  check(stat, quiet);
}

// keys 可以是一個或一組
export function markItem(stat, keys, { quiet = false } = {}) {
  const items = new Set(Array.isArray(stats[stat]) ? stats[stat] : []);
  const before = items.size;
  [].concat(keys).forEach((key) => items.add(key));
  if (items.size === before) return;
  stats[stat] = [...items];
  check(stat, quiet);
}

// fn(achievement, { quiet })：剛解鎖一個成就
export function onUnlock(fn) {
  listeners.add(fn);
}

export const totalPoints = () => ACHIEVEMENTS.filter(isUnlocked).reduce((sum, a) => sum + a.points, 0);
export const unseenCount = () => ACHIEVEMENTS.filter((a) => isUnlocked(a) && !seen.has(a.id)).length;
export const isUnseen = (a) => isUnlocked(a) && !seen.has(a.id);

// 關掉成就清單時呼叫：清掉 NEW 標記
export function markAllSeen() {
  ACHIEVEMENTS.filter(isUnlocked).forEach((a) => seen.add(a.id));
  persist();
}
