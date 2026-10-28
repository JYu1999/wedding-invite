// 跟令狗一起收集紅蘿蔔：讓人想一直玩下去的長期目標
// 最佳紀錄、隨時 3 個任務、令狗等級（每完成 3 個任務升一級）、升級解鎖的造型
// 存在訪客自己的瀏覽器（storage.js），跟網站成就的進度分開

import { load, save } from '../storage.js';

const KEY = 'linggou-skate';

// 任務：stat 對應遊戲裡每一局的紀錄（game.js 的 run.stats），一局內達到 goal 就算完成
export const MISSIONS = [
  { text: '單局收集 15 根紅蘿蔔', stat: 'score', goal: 15 },
  { text: '在空中接住 5 根', stat: 'air', goal: 5 },
  { text: '一次放進 3 根', stat: 'triple', goal: 1 },
  { text: '撐到第 3 波', stat: 'wave', goal: 3 },
  { text: '啟動一次 FEVER', stat: 'fever', goal: 1 },
  { text: '接到黃金紅蘿蔔', stat: 'gold', goal: 1 },
  { text: '站在會動的跳台上接住 3 根', stat: 'ride', goal: 3 },
  { text: '碰到小豬 2 次', stat: 'pig', goal: 2 },
  { text: '單局收集 30 根紅蘿蔔', stat: 'score', goal: 30 },
  { text: '從麻吉嘴裡搶回紅蘿蔔', stat: 'recover', goal: 1 },
  { text: '箱子發金光時放進 6 根', stat: 'hot', goal: 6 },
  { text: '不受傷撐過 60 秒', stat: 'nohit', goal: 60 },
  { text: '衝到斜坡頂端 3 次（別撞牆）', stat: 'rim', goal: 3 },
  { text: '一次放進 3 根，做到 3 次', stat: 'triple', goal: 3 },
  { text: '撐到第 6 波', stat: 'wave', goal: 6 },
  { text: '在空中接住 15 根', stat: 'air', goal: 15 },
  { text: '一局啟動 2 次 FEVER', stat: 'fever', goal: 2 },
  { text: '單局收集 60 根紅蘿蔔', stat: 'score', goal: 60 },
  { text: '跳過麻吉 5 次', stat: 'dodge', goal: 5 },
  { text: '單局收集 100 根紅蘿蔔', stat: 'score', goal: 100 },
];

// 第 i 個任務：清單用完後，用同樣的任務、目標加倍繼續出
export function missionAt(i) {
  const base = MISSIONS[i % MISSIONS.length];
  const round = Math.floor(i / MISSIONS.length);
  if (!round) return base;
  const scale = (n) => Math.ceil(n * (1 + round));
  return { ...base, goal: scale(base.goal), text: base.text.replace(/\d+/, (n) => scale(Number(n))) };
}

const data = {
  best: 0,          // 最佳紀錄（根）
  total: 0,         // 累積收集
  plays: 0,
  done: 0,          // 完成過幾個任務
  next: 3,          // 下一個要出的任務編號
  active: [0, 1, 2],
  costume: 'none',
  muted: false,
  ...load(KEY, {}),
};

export const progress = {
  data,
  level: () => Math.floor(data.done / 3) + 1,
  write: () => save(KEY, data),
};
