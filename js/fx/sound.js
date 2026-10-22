// 開信封音效：全部用 Web Audio 即時合成，不需要額外音檔
// AudioContext 必須在使用者點擊的同一個事件裡建立／喚醒，iOS 才會出聲

let audio = null;

export function getAudio() {
  if (!audio) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);

    // 簡易殘響：衰減雜訊當作脈衝響應，讓聲音有空間感
    const reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.2;
    const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6;
    }
    reverb.buffer = impulse;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    reverb.connect(wet).connect(master);

    audio = { ctx, master, reverb };
  }
  if (audio.ctx.state === 'suspended') audio.ctx.resume();
  return audio;
}

const out = (a, node) => {
  node.connect(a.master);
  node.connect(a.reverb);
};

// 單音：可選波形、起音與衰減
export function tone(a, freq, at, dur, { type = 'sine', gain = 0.2, attack = 0.005, glide } = {}) {
  const { ctx } = a;
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  out(a, g);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

// 鈴聲：基頻加上幾個非整數倍泛音，聽起來像玻璃或金屬鈴
export function bell(a, freq, at, dur = 1.4, gain = 0.12) {
  tone(a, freq, at, dur, { gain });
  tone(a, freq * 2.76, at, dur * 0.5, { gain: gain * 0.35 });
  tone(a, freq * 5.4, at, dur * 0.25, { gain: gain * 0.15 });
}

// 濾波雜訊：風聲、氣流、拉炮
export function noise(a, at, dur, { from = 800, to = 3000, q = 1, gain = 0.15, type = 'bandpass', attack = 0.02 } = {}) {
  const { ctx } = a;
  const t = ctx.currentTime + at;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g);
  out(a, g);
  src.start(t);
}
