// 創作之夜原型：音效（WebAudio 即時合成，不用音效檔）。第一次點擊之後才發聲（瀏覽器的規定）。
(function (root) {
  'use strict';
  const IE = root.IE = root.IE || {};
  let ctx = null, master = null, muted = false;
  function ensure() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.42;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type, vol, delay, slideTo) {
    const c = ensure();
    if (!c || muted) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'triangle';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq, delay, sweepTo) {
    const c = ensure();
    if (!c || muted) return;
    const t = c.currentTime + (delay || 0);
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(freq || 1200, t); f.Q.value = 0.9;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.02);
  }
  // 五聲音階：每一張計分的素材升一個音，越計越高
  const PENTA = [0, 2, 4, 7, 9];
  const note = (i, base) => base * Math.pow(2, (PENTA[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5)) / 12);

  IE.Sfx = {
    unlock() { ensure(); },
    get muted() { return muted; },
    setMuted(m) { muted = !!m; if (master) master.gain.value = muted ? 0 : 0.42; },
    select(i) { tone(note(i, 523), 0.08, 'triangle', 0.16); },
    deselect() { tone(392, 0.06, 'triangle', 0.1, 0, 330); },
    shape(rank) { const b = 392 + 40 * (rank || 0); [0, 1, 2].forEach((k) => tone(note(k * 2, b), 0.12, 'sine', 0.13, k * 0.05)); },
    whoosh() { noise(0.28, 0.16, 500, 0, 3000); },
    chip(i) { tone(note(i, 330), 0.1, 'square', 0.07); tone(note(i, 660), 0.08, 'triangle', 0.08, 0.01); },
    mult() { tone(220, 0.14, 'sawtooth', 0.07, 0, 440); },
    xmult() { tone(440, 0.09, 'square', 0.08); tone(880, 0.16, 'square', 0.08, 0.07); noise(0.12, 0.08, 4000, 0.05); },
    obj() { tone(1046, 0.18, 'sine', 0.12); tone(1568, 0.2, 'sine', 0.06, 0.02); },
    blocked() { tone(140, 0.18, 'sawtooth', 0.08, 0, 90); },
    recipe() { [0, 2, 4, 5, 7].forEach((k, i) => tone(note(k, 523), 0.22, 'triangle', 0.13, i * 0.07)); noise(0.5, 0.06, 6000, 0.3); },
    total(power) { const p = Math.min(1, power || 0.3); tone(90 + 60 * p, 0.35, 'sine', 0.35); noise(0.25, 0.12 + 0.2 * p, 300, 0, 80); tone(note(7, 392), 0.3, 'triangle', 0.1 * p, 0.05); },
    tick() { tone(1760, 0.03, 'square', 0.03); },
    stamp() { tone(70, 0.28, 'sine', 0.4); noise(0.18, 0.25, 200); },
    clear() { [0, 4, 7, 12].forEach((k, i) => tone(261.6 * Math.pow(2, k / 12), 0.6, 'triangle', 0.12, i * 0.09)); noise(0.8, 0.05, 7000, 0.35); },
    fail() { [0, -3, -6].forEach((k, i) => tone(220 * Math.pow(2, k / 12), 0.35, 'sawtooth', 0.07, i * 0.16)); },
    crumple() { noise(0.18, 0.2, 1800); noise(0.12, 0.14, 900, 0.08); },
    flip(i) { tone(note(i || 0, 784), 0.04, 'square', 0.04); },
    firework() { tone(600, 0.5, 'sine', 0.05, 0, 1800); noise(0.6, 0.18, 1400, 0.45, 300); },
    page() { noise(0.12, 0.1, 2500, 0, 800); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
