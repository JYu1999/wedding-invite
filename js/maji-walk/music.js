// 帶麻吉去公園：小遊戲自己的音樂與音效，全部用 Web Audio 即時合成，跟首頁的背景音樂分開
// 音樂是一首輕快的 8-bit 散步曲（C 大調、16 小節循環）：
//   calm：標題與教學，只有旋律、低音和輕輕的和弦
//   run：正式出發，加上鼓
//   star：吃到無敵星星，再加上閃亮的琶音和十六分音符的 hi-hat
// 吃到星星加速時，整首的速度也跟著加快（setTempo）
// AudioContext 沿用網站的（sound.js），一定要在使用者點擊時先叫醒

import { getAudio } from '../fx/sound.js';

const BPM = 138;
const BASE_STEP = 60 / BPM / 2;     // 八分音符
const LOOKAHEAD = 0.15;

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const freq = (name) => {
  const m = /^([A-G])(#?)(\d)$/.exec(name);
  const midi = 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] ? 1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
};

// 旋律：「音:八分音符數」，R 是休止；每小節 8 拍
const MELODY = [
  'E5:1 G5:1 C6:2 B5:1 G5:1 E5:2',
  'F5:1 A5:1 D6:2 C6:1 A5:1 F5:2',
  'E5:1 G5:1 C6:1 E6:1 D6:2 C6:1 B5:1',
  'A5:2 G5:2 R:2 G5:1 G5:1',
  'E5:1 G5:1 C6:2 B5:1 G5:1 E5:2',
  'F5:1 A5:1 D6:2 C6:1 A5:1 F5:2',
  'G5:1 F5:1 E5:1 D5:1 G5:2 B4:2',
  'C5:4 R:2 G4:1 B4:1',
  'A5:2 A5:1 G5:1 F5:2 A5:2',
  'G5:2 G5:1 F5:1 E5:2 C5:2',
  'D5:1 E5:1 F5:1 G5:1 A5:2 B5:2',
  'C6:3 R:1 G5:1 A5:1 G5:1 E5:1',
  'A5:2 A5:1 G5:1 F5:2 A5:2',
  'G5:2 G5:1 E5:1 C6:2 E5:2',
  'D5:1 F5:1 A5:1 C6:1 B5:2 G5:2',
  'C6:4 R:4',
];
// 每小節的和弦（根音、三音、五音）
const CHORDS = {
  C: ['C3', 'E4', 'G4', 'C5'], F: ['F2', 'A4', 'C5', 'F5'], G: ['G2', 'B4', 'D5', 'G5'],
  Am: ['A2', 'C5', 'E5', 'A5'], Dm: ['D3', 'D5', 'F5', 'A5'],
};
const PROGRESSION = ['C', 'F', 'C', 'G', 'C', 'F', 'G', 'C', 'F', 'C', 'Dm', 'C', 'F', 'C', 'G', 'C'];

const STEPS = MELODY.length * 8;
const lead = [];   // 每個八分音符位置：{ f, len } 或 undefined
MELODY.forEach((bar, b) => {
  let at = b * 8;
  for (const token of bar.split(' ')) {
    const [name, len] = token.split(':');
    if (name !== 'R') lead[at] = { f: freq(name), len: Number(len) };
    at += Number(len);
  }
});

let a = null;            // { ctx, music, sfx, noiseBuf }
function audio() {
  const base = getAudio();
  if (!base) return null;
  if (!a || a.ctx !== base.ctx) {
    const { ctx } = base;
    const music = ctx.createGain();
    music.gain.value = 0;
    music.connect(ctx.destination);
    const sfx = ctx.createGain();
    sfx.gain.value = 0.7;
    sfx.connect(ctx.destination);
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    a = { ctx, music, sfx, noiseBuf };
  }
  return a;
}

// 單音：波形、音量包絡、可滑音，接到 dest（音樂或音效）
function voice(dest, f, t, dur, { type = 'square', gain = 0.1, attack = 0.008, release = 0.06, glide, cutoff } = {}) {
  const { ctx } = a;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f, t);
  if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.setValueAtTime(gain, t + Math.max(attack, dur - release));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = osc;
  if (cutoff) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    osc.connect(filter);
    node = filter;
  }
  node.connect(g).connect(dest);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function hiss(dest, t, dur, { type = 'highpass', f = 7000, q = 0.7, gain = 0.05 } = {}) {
  const { ctx, noiseBuf } = a;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = f;
  filter.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(dest);
  src.start(t, Math.random() * 0.5, dur + 0.02);
}

// ---------- 音樂 ----------

let mode = 'calm';
let tempo = 1;           // 速度倍率：2 就是兩倍快
let timer = 0;
let step = 0;
let nextTime = 0;

function scheduleStep(i, t) {
  const dest = a.music;
  const eighth = BASE_STEP / tempo;   // 這一拍的八分音符長度（加速時變短）
  const bar = Math.floor(i / 8);
  const beat = i % 8;
  const chord = CHORDS[PROGRESSION[bar]];
  const note = lead[i];
  if (note) {
    voice(dest, note.f, t, note.len * eighth * 0.92, { type: 'square', gain: 0.055, cutoff: 3200 });
    voice(dest, note.f / 2, t, note.len * eighth * 0.9, { type: 'triangle', gain: 0.05 });
  }
  // 低音：根音、八度跳來跳去
  const root = freq(chord[0]);
  if (beat % 2 === 0) voice(dest, beat % 4 === 0 ? root : root * 2, t, eighth * 0.85, { type: 'triangle', gain: 0.2 });
  // 反拍的和弦
  if (beat % 2 === 1) {
    chord.slice(1).forEach((n) => voice(dest, freq(n), t, eighth * 0.45, { type: 'square', gain: 0.012, cutoff: 1800 }));
  }
  if (mode === 'calm') return;
  // 鼓：大鼓在一、三拍，小鼓在二、四拍，hi-hat 每個八分音符
  if (beat === 0 || beat === 4 || (beat === 7 && bar % 4 === 3)) voice(dest, 150, t, 0.16, { type: 'sine', gain: 0.45, glide: 45, release: 0.12 });
  if (beat === 2 || beat === 6) {
    hiss(dest, t, 0.14, { type: 'bandpass', f: 1900, q: 0.8, gain: 0.18 });
    voice(dest, 220, t, 0.08, { type: 'triangle', gain: 0.08, glide: 140 });
  }
  hiss(dest, t, 0.04, { gain: 0.045 });
  if (mode === 'star') {
    hiss(dest, t + eighth / 2, 0.03, { gain: 0.035 });
    // 閃亮亮的琶音
    chord.slice(1).concat(chord[1]).forEach((n, k) => {
      voice(dest, freq(n) * 2, t + (k * eighth) / 4, eighth / 4, { type: 'square', gain: 0.018, cutoff: 5000 });
    });
  }
}

function tick() {
  while (nextTime < a.ctx.currentTime + LOOKAHEAD) {
    scheduleStep(step, nextTime);
    step = (step + 1) % STEPS;
    nextTime += BASE_STEP / tempo;
  }
}

export const music = {
  // 開始播放（已經在播就只換模式）；restart 為 false 時從暫停的地方接著播
  play(nextMode = 'calm', restart = true) {
    if (!audio()) return;
    mode = nextMode;
    if (timer) return;
    const { ctx } = a;
    if (restart) step = 0;
    nextTime = ctx.currentTime + 0.08;
    a.music.gain.cancelScheduledValues(ctx.currentTime);
    a.music.gain.setValueAtTime(0.0001, ctx.currentTime);
    a.music.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 0.3);
    timer = setInterval(tick, 25);
    tick();
  },
  setMode(nextMode) {
    mode = nextMode;
  },
  // 從下一個音開始換速度（已經排好的那一點點照舊）
  setTempo(value) {
    tempo = value;
  },
  stop(fade = 0.35) {
    if (!a || !timer) return;
    clearInterval(timer);
    timer = 0;
    const { ctx } = a;
    a.music.gain.cancelScheduledValues(ctx.currentTime);
    a.music.gain.setValueAtTime(a.music.gain.value, ctx.currentTime);
    a.music.gain.linearRampToValueAtTime(0, ctx.currentTime + fade);
  },
  get playing() {
    return !!timer;
  },
};

// ---------- 音效 ----------

const at = () => (audio() ? a.ctx.currentTime : null);

export const sfx = {
  // 撞到東西：低沉的「咚」
  bonk() {
    const t = at();
    if (t == null) return;
    voice(a.sfx, 300, t, 0.22, { type: 'square', gain: 0.16, glide: 90, cutoff: 1400 });
    hiss(a.sfx, t, 0.12, { type: 'lowpass', f: 900, gain: 0.25 });
  },
  // 麻吉被撞到：嗚嗯
  yelp() {
    const t = at();
    if (t == null) return;
    voice(a.sfx, 1300, t, 0.18, { type: 'sine', gain: 0.12, glide: 650 });
    voice(a.sfx, 1100, t + 0.2, 0.22, { type: 'sine', gain: 0.08, glide: 520 });
  },
  // 汪汪：麻吉要暴衝之前
  bark(times = 2) {
    const t = at();
    if (t == null) return;
    for (let i = 0; i < times; i++) {
      const s = t + i * 0.2;
      voice(a.sfx, 560, s, 0.12, { type: 'sawtooth', gain: 0.1, glide: 300, cutoff: 1500, attack: 0.004 });
      hiss(a.sfx, s, 0.08, { type: 'bandpass', f: 1100, q: 1.2, gain: 0.22 });
    }
  },
  // 撿到愛心
  heart() {
    const t = at();
    if (t == null) return;
    ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => voice(a.sfx, freq(n), t + i * 0.06, 0.25, { type: 'triangle', gain: 0.16 }));
  },
  // 撿到星星
  star() {
    const t = at();
    if (t == null) return;
    ['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'].forEach((n, i) => voice(a.sfx, freq(n), t + i * 0.045, 0.18, { type: 'square', gain: 0.07, cutoff: 6000 }));
  },
  // 吃到星星開始加速：「咻——」一陣風聲由低往高掃過去
  whoosh() {
    const t = at();
    if (t == null) return;
    const { ctx, noiseBuf } = a;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.4;
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(5200, t + 0.45);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.45, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    src.connect(filter).connect(g).connect(a.sfx);
    src.start(t, 0, 0.62);
    voice(a.sfx, 220, t, 0.5, { type: 'sawtooth', gain: 0.04, glide: 880, cutoff: 2400 });
  },
  // 無敵時撞飛東西
  smash() {
    const t = at();
    if (t == null) return;
    hiss(a.sfx, t, 0.25, { type: 'bandpass', f: 2400, q: 0.6, gain: 0.3 });
    voice(a.sfx, 880, t, 0.15, { type: 'square', gain: 0.06, glide: 1760, cutoff: 5000 });
  },
  // 對向來車的喇叭：叭叭
  honk() {
    const t = at();
    if (t == null) return;
    for (const s of [0, 0.22]) {
      voice(a.sfx, 392, t + s, 0.16, { type: 'square', gain: 0.07, cutoff: 1600 });
      voice(a.sfx, 494, t + s, 0.16, { type: 'square', gain: 0.06, cutoff: 1600 });
    }
  },
  // 倒數：3、2、1 低音，出發高音
  count(go = false) {
    const t = at();
    if (t == null) return;
    voice(a.sfx, go ? 1046 : 523, t, go ? 0.45 : 0.18, { type: 'square', gain: 0.09, cutoff: 4000 });
  },
  // 教學每一步完成
  ding() {
    const t = at();
    if (t == null) return;
    voice(a.sfx, freq('E6'), t, 0.2, { type: 'triangle', gain: 0.14 });
    voice(a.sfx, freq('A6'), t + 0.08, 0.3, { type: 'triangle', gain: 0.12 });
  },
  // 抵達公園
  win() {
    const t = at();
    if (t == null) return;
    const tune = [['C5', 0, 0.15], ['E5', 0.15, 0.15], ['G5', 0.3, 0.15], ['C6', 0.45, 0.35], ['G5', 0.8, 0.15], ['C6', 0.95, 0.7]];
    for (const [n, s, d] of tune) {
      voice(a.sfx, freq(n), t + s, d, { type: 'square', gain: 0.08, cutoff: 4000 });
      voice(a.sfx, freq(n) / 2, t + s, d, { type: 'triangle', gain: 0.1 });
    }
  },
  // 五條命用完
  lose() {
    const t = at();
    if (t == null) return;
    [['G4', 0], ['F#4', 0.25], ['F4', 0.5], ['E4', 0.75]].forEach(([n, s], i) => {
      voice(a.sfx, freq(n), t + s, i === 3 ? 0.8 : 0.24, { type: 'square', gain: 0.07, cutoff: 2200, glide: i === 3 ? freq(n) * 0.9 : undefined });
    });
  },
};

// 在使用者點擊當下呼叫，iOS 才會出聲
export const wakeAudio = () => audio();
