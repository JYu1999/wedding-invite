// 跟令狗一起收集紅蘿蔔：音效與背景音樂，用 Web Audio 即時合成，不用下載音檔
// 背景音樂是自己寫的三拍子圓舞曲（溜冰場的感覺），FEVER 時加快

const a = { ctx: null, master: null, music: null, muted: false, nextNote: 0, step: 0 };

// 要在點擊當下呼叫，iOS 才會出聲
export function wakeAudio() {
  if (a.ctx) { a.ctx.resume?.(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  a.ctx = new AC();
  a.master = a.ctx.createGain();
  a.master.gain.value = a.muted ? 0 : 0.55;
  a.master.connect(a.ctx.destination);
  a.music = a.ctx.createGain();
  a.music.gain.value = 0.32;
  a.music.connect(a.master);
}

export function setMuted(muted) {
  a.muted = muted;
  if (a.master) a.master.gain.value = muted ? 0 : 0.55;
}

function tone(f, dur, { type = 'square', vol = 0.12, at = 0, slide = 0, dest } = {}) {
  if (!a.ctx) return;
  const t = a.ctx.currentTime + at;
  const o = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest ?? a.master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, { vol = 0.2, at = 0, freq = 1200 } = {}) {
  if (!a.ctx) return;
  const t = a.ctx.currentTime + at;
  const len = Math.floor(a.ctx.sampleRate * dur);
  const buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.ctx.createBufferSource();
  src.buffer = buf;
  const f = a.ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = a.ctx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.master);
  src.start(t);
}

const notes = (list, opts, gap) => list.forEach((f, i) => tone(f, opts.dur, { ...opts, at: i * gap }));

export const sfx = {
  jump: () => tone(380, 0.14, { slide: 420, vol: 0.08 }),
  catch: (n) => tone(660 * Math.pow(1.06, Math.min(n, 14)), 0.09, { type: 'triangle', vol: 0.14 }),
  drop: (n) => notes([523, 659, 784, 1047].slice(0, n + 1), { dur: 0.12, type: 'triangle', vol: 0.13 }, 0.06),
  hurt: () => { tone(220, 0.3, { slide: -150, vol: 0.12 }); noise(0.2, { vol: 0.12 }); },
  boom: () => { noise(0.5, { vol: 0.35, freq: 700 }); tone(90, 0.4, { type: 'sawtooth', slide: -50, vol: 0.12 }); },
  slip: () => tone(900, 0.5, { type: 'sine', slide: -760, vol: 0.12 }),
  wall: () => { tone(140, 0.12, { vol: 0.15 }); noise(0.1, { vol: 0.15, freq: 500 }); },
  oink: () => { tone(300, 0.1, { type: 'sawtooth', slide: -80, vol: 0.08 }); tone(280, 0.12, { type: 'sawtooth', slide: -90, vol: 0.08, at: 0.15 }); },
  bark: () => { tone(520, 0.08, { slide: -200, vol: 0.1 }); tone(480, 0.08, { slide: -200, vol: 0.1, at: 0.14 }); },
  steal: () => tone(700, 0.25, { slide: -500, vol: 0.1 }),
  item: () => notes([880, 1175, 1568], { dur: 0.1, type: 'sine', vol: 0.12 }, 0.05),
  fever: () => notes([523, 659, 784, 1047, 1319], { dur: 0.14, vol: 0.09 }, 0.07),
  wave: () => notes([392, 523], { dur: 0.18, vol: 0.09 }, 0.12),
  count: (last) => tone(last ? 1047 : 523, last ? 0.3 : 0.12, { type: 'triangle', vol: 0.14 }),
  step: () => notes([659, 988], { dur: 0.1, type: 'triangle', vol: 0.12 }, 0.07),
  over: () => notes([523, 440, 349, 262], { dur: 0.25, type: 'triangle', vol: 0.13 }, 0.2),
  mission: () => notes([784, 988, 1175, 1568], { dur: 0.12, type: 'triangle', vol: 0.12 }, 0.08),
};

// ---------- 背景音樂 ----------
const NOTE = { C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494, C5: 523, D5: 587, E5: 659, F5: 698, G5: 784, A5: 880 };
const MELODY = ['E5', '', 'G5', 'C5', '', 'E5', 'D5', '', 'F5', 'G5', '', '', 'A5', '', 'G5', 'F5', '', 'E5', 'D5', '', 'C5', 'D5', '', '',
  'E5', '', 'G5', 'C5', '', 'E5', 'D5', '', 'F5', 'A5', '', 'G5', 'F5', '', 'D5', 'E5', '', 'D5', 'C5', '', '', 'C5', '', ''];
const BASS = ['C4', 'C4', 'G4', 'G4', 'F4', 'C4', 'G4', 'C4', 'C4', 'C4', 'G4', 'G4', 'F4', 'G4', 'G4', 'C4'];

export const music = {
  tempo: 1,
  restart() {
    if (!a.ctx) return;
    a.nextNote = a.ctx.currentTime + 0.1;
    a.step = 0;
  },
  resume() {
    if (a.ctx) a.nextNote = a.ctx.currentTime + 0.1;
  },
  // 每一幀呼叫：把接下來 0.12 秒的音符排進去
  tick() {
    if (!a.ctx || a.muted) return;
    const beat = 60 / 168 / music.tempo;
    while (a.nextNote < a.ctx.currentTime + 0.12) {
      const i = a.step % MELODY.length;
      const at = a.nextNote - a.ctx.currentTime;
      const bar = Math.floor(i / 3) % BASS.length;
      if (i % 3 === 0) tone(NOTE[BASS[bar]] / 2, beat * 0.9, { type: 'triangle', vol: 0.16, at, dest: a.music });
      else tone(NOTE[BASS[bar]], beat * 0.4, { vol: 0.04, at, dest: a.music });
      if (MELODY[i]) tone(NOTE[MELODY[i]], beat * 0.85, { vol: 0.06, at, dest: a.music });
      a.nextNote += beat;
      a.step++;
    }
  },
};
