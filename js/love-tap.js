// 月曆上的 12/20：點一下就從愛心冒出「+1」和幾顆小愛心往上飄，像直播按讚，連點就一直冒
// 每點一下有輕輕的「啵」聲與震動（iPhone 是喀一下）

import { getAudio, tone } from './fx/sound.js';
import { haptic, HAPTIC, tapHaptic } from './fx/haptics.js';
import { increment } from './achievements/progress.js';

const HEARTS = ['♥', '♥', '♥', '❤', '💕', '💗'];
const COLORS = ['#e0566a', '#f2b3b8', '#d9534f', '#f08a9a', '#c94a5a'];
const HEARTS_PER_TAP = 4;
const POP_MS = 420;   // 與 CSS .love-pop 的動畫一致

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function blip() {
  const a = getAudio();
  if (!a) return;
  const base = rand(620, 760);
  tone(a, base, 0, 0.16, { gain: 0.07, glide: base * 1.6 });
}

// 飄出去的元素：飄完自己移除
function float(host, el, { dx, rise, rot, dur, delay = 0 }) {
  el.style.setProperty('--dx', `${dx}px`);
  el.style.setProperty('--rise', `${rise}px`);
  el.style.setProperty('--rot', `${rot}deg`);
  el.style.setProperty('--dur', `${dur}ms`);
  el.style.animationDelay = `${delay}ms`;
  el.addEventListener('animationend', () => el.remove(), { once: true });
  host.append(el);
}

export function initLoveTap(cell) {
  if (!cell) return;
  const heart = cell.querySelector('.heart-icon');
  let popTimer = 0;

  cell.addEventListener('click', () => {
    blip();
    haptic(HAPTIC.tick);
    increment('loveTaps');

    const plus = document.createElement('span');
    plus.className = 'love-plus';
    plus.textContent = '+1';
    float(cell, plus, { dx: rand(-16, 16), rise: rand(70, 90), rot: rand(-10, 10), dur: 1300 });

    for (let i = 0; i < HEARTS_PER_TAP; i++) {
      const h = document.createElement('span');
      h.className = 'love-heart';
      h.textContent = pick(HEARTS);
      h.style.color = pick(COLORS);
      h.style.fontSize = `${rand(12, 22).toFixed(0)}px`;
      float(cell, h, { dx: rand(-46, 46), rise: rand(40, 90), rot: rand(-35, 35), dur: rand(900, 1400), delay: i * 50 });
    }

    // 愛心彈一下：連點時重新開始
    heart?.classList.remove('love-pop');
    clearTimeout(popTimer);
    void heart?.offsetWidth;
    heart?.classList.add('love-pop');
    popTimer = setTimeout(() => heart?.classList.remove('love-pop'), POP_MS);
  });

  tapHaptic(cell);
}
