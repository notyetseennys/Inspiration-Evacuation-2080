// 音樂與音效：全部以 Web Audio 即時合成，沒有外部音檔。
// 音樂分為 4 層，由火花控制：火花高時旋律豐富；火花低時只剩機械節拍。
(function (IE) {
  'use strict';
  let ctx = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null;
  let muted = false, timer = null, step = 0, nextTime = 0;
  let spark = 2, mode = 'city', tempo = 92;
  const layers = {};

  const CHORDS = {
    city:  [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],   // Am F C G
    alien: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]],   // C Am F G（電梯音樂）
    work:  [[57, 60, 64], [57, 60, 64], [56, 60, 63], [56, 60, 63]],   // 單調
  };
  const LEAD = [0, 2, 4, 2, 1, 0, 2, -1, 0, 4, 2, 1, 0, -1, 0, -1];

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.7; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
    ['beat', 'bass', 'arp', 'lead'].forEach((k) => {
      layers[k] = ctx.createGain(); layers[k].gain.value = 0; layers[k].connect(musicBus);
    });
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    nextTime = ctx.currentTime + 0.1;
    timer = setInterval(schedule, 25);
    applyLayers();
  }

  function applyLayers() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const v = {
      beat: mode === 'alien' ? 0.25 : 0.9,
      bass: clamp01((spark - 0.6) / 1.4),
      arp: mode === 'work' ? 0.15 : clamp01((spark - 1.6) / 1.4),
      lead: mode === 'work' ? 0 : clamp01((spark - 2.6) / 1.2),
    };
    if (mode === 'alien') { v.bass = 0.6; v.arp = 0.5; v.lead = 0.8; }
    Object.keys(v).forEach((k) => layers[k].gain.setTargetAtTime(v[k], t, 0.4));
  }

  function tone(type, freq, start, dur, gain, dest, slideTo) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(dest);
    o.start(start); o.stop(start + dur + 0.02);
  }
  function noise(start, dur, gain, dest, hp) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = hp ? 'highpass' : 'lowpass';
    f.frequency.value = hp || 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(start); src.stop(start + dur + 0.02);
  }

  function schedule() {
    if (!ctx) return;
    const spb = 60 / tempo / 4; // 每個 16 分音符
    while (nextTime < ctx.currentTime + 0.12) {
      playStep(step, nextTime, spb);
      nextTime += spb;
      step = (step + 1) % 64;
    }
  }
  function playStep(i, t, spb) {
    const bar = Math.floor(i / 16) % 4;
    const s = i % 16;
    const chord = (CHORDS[mode] || CHORDS.city)[bar];
    // 機械節拍
    if (s % 8 === 0) tone('sine', 120, t, 0.18, 0.5, layers.beat, 45);
    if (s % 2 === 0) noise(t, 0.03, 0.12, layers.beat, 7000);
    if (s === 4 || s === 12) noise(t, 0.09, 0.18, layers.beat, 1800);
    // 低音
    if (s % 4 === 0) tone('triangle', midi(chord[0] - 24), t, spb * 3.5, 0.35, layers.bass);
    // 琶音
    if (s % 2 === 0) tone('square', midi(chord[(s / 2) % 3] + 12), t, spb * 1.6, 0.06, layers.arp);
    // 旋律
    if (s % 4 === 0 || s % 4 === 3) {
      const deg = LEAD[(s + bar * 4) % 16];
      if (deg >= 0) tone('triangle', midi(chord[deg % 3] + 12 + (deg >= 3 ? 12 : 0)), t, spb * 2.8, 0.12, layers.lead);
    }
  }

  // ---------- 音效 ----------
  const SFX = {
    coin() { const t = ctx.currentTime; tone('square', 988, t, 0.06, 0.12, sfxBus); tone('square', 1319, t + 0.05, 0.1, 0.12, sfxBus); },
    spark() { const t = ctx.currentTime; tone('sine', 1200, t, 0.35, 0.06, sfxBus, 260); },
    wrong() { const t = ctx.currentTime; tone('square', 110, t, 0.18, 0.15, sfxBus, 80); },
    combo() { const t = ctx.currentTime; [0, 4, 7, 12].forEach((n, i) => tone('square', midi(72 + n), t + i * 0.05, 0.08, 0.08, sfxBus)); },
    stamp() { const t = ctx.currentTime; noise(t, 0.08, 0.35, sfxBus); tone('sine', 90, t, 0.1, 0.3, sfxBus, 50); },
    click() { const t = ctx.currentTime; tone('square', 660, t, 0.03, 0.05, sfxBus); },
    perfect() { const t = ctx.currentTime; tone('triangle', 1568, t, 0.09, 0.1, sfxBus); tone('triangle', 2093, t + 0.04, 0.1, 0.08, sfxBus); },
    good() { const t = ctx.currentTime; tone('triangle', 1047, t, 0.08, 0.08, sfxBus); },
    splash() { const t = ctx.currentTime; noise(t, 0.4, 0.3, sfxBus); },
    bubble() { const t = ctx.currentTime; tone('sine', 400, t, 0.12, 0.08, sfxBus, 900); },
    pickup() { const t = ctx.currentTime; [0, 7, 12].forEach((n, i) => tone('triangle', midi(76 + n), t + i * 0.06, 0.1, 0.1, sfxBus)); },
    hurt() { const t = ctx.currentTime; noise(t, 0.15, 0.3, sfxBus); tone('sawtooth', 200, t, 0.2, 0.1, sfxBus, 60); },
    tick() { const t = ctx.currentTime; tone('square', 2400, t, 0.02, 0.04, sfxBus); },
    chips() { const t = ctx.currentTime; tone('square', 880 + Math.random() * 200, t, 0.04, 0.06, sfxBus); },
    mult() { const t = ctx.currentTime; tone('sawtooth', 220, t, 0.25, 0.1, sfxBus, 880); },
    boom() {
      const t = ctx.currentTime;
      noise(t, 0.6, 0.4, sfxBus);
      [0, 4, 7, 11, 14].forEach((n, i) => tone('triangle', midi(60 + n), t + i * 0.03, 1.2, 0.09, sfxBus));
    },
    beam() { const t = ctx.currentTime; tone('sine', 180, t, 3.5, 0.15, sfxBus, 1400); tone('triangle', 90, t, 3.5, 0.1, sfxBus, 700); },
    rent() { const t = ctx.currentTime; tone('square', 330, t, 0.15, 0.1, sfxBus); tone('square', 262, t + 0.15, 0.25, 0.1, sfxBus); },
    ad() { const t = ctx.currentTime; tone('square', 1760, t, 0.05, 0.06, sfxBus); tone('square', 1760, t + 0.08, 0.05, 0.06, sfxBus); },
  };

  IE.Audio = {
    init,
    get ready() { return !!ctx; },
    setSpark(v) { spark = v; applyLayers(); },
    setMode(m, bpm) { mode = m; tempo = bpm || (m === 'work' ? 120 : m === 'alien' ? 84 : 92); applyLayers(); },
    sfx(name) { if (ctx && SFX[name] && !muted) { try { SFX[name](); } catch (e) { /* 音效失敗不影響遊戲 */ } } },
    // 街頭表演的音階（五聲音階）；i 由 0 開始，oct 升八度
    note(i, oct) {
      if (!ctx || muted) return;
      const SCALE = [60, 64, 67, 69, 72, 76];
      try {
        const t = ctx.currentTime, f = midi(SCALE[i % SCALE.length] + (oct ? 12 : 0));
        tone('triangle', f, t, 0.35, 0.14, sfxBus); tone('sine', f * 2, t, 0.2, 0.04, sfxBus);
      } catch (e) { /* 忽略 */ }
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.7, ctx.currentTime, 0.05);
      return muted;
    },
    get muted() { return muted; },
  };
})(window.IE = window.IE || {});
