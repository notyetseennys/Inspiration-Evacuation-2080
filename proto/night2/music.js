// 創作之夜原型第二版：作品裏的歌（WebAudio 即時合成）。
// 每張計分的素材是歌裏的一小節（兩拍）：
//   情緒決定音色（人情＝溫暖的三角波、霓虹＝合成器鋸齒波、記憶＝走音的舊錄音……）
//   媒材決定樂器：聲＝旋律、身＝鼓、數＝電子琶音、影＝和聲墊、紙＝人聲（歌詞就是素材的名字）
//   起承轉合決定和弦：起＝主和弦、承＝順着走的和弦、轉＝屬七和弦（緊張）、合＝回到主和弦（解決）
// 所以結構越完整，歌就越好聽。夥伴加入之後也會一起演奏（DJ 打鼓、Miu 的琶音、Mary 姐的和音……）。
(function (root) {
  'use strict';
  const IE = root.IE = root.IE || {};
  const S = () => IE.Sfx;
  let ctx = null, bus = null, rev = null, echo = null, noiseBuf = null, drive = null;
  let key = 60, mode = 'major', bpm = 112;
  const live = new Set();

  function ensure() {
    const c = S().ctx();
    if (!c) return null;
    if (c !== ctx) {
      ctx = c;
      bus = ctx.createGain(); bus.gain.value = 0.9; bus.connect(S().bus());
      // 殘響：自己生成的脈衝響應
      rev = ctx.createConvolver();
      const len = Math.floor(ctx.sampleRate * 2.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      rev.buffer = ir;
      const rg = ctx.createGain(); rg.gain.value = 0.28; rev.connect(rg); rg.connect(S().bus());
      // 回聲（水）
      echo = ctx.createDelay(1); echo.delayTime.value = 0.32;
      const fb = ctx.createGain(); fb.gain.value = 0.32; const eg = ctx.createGain(); eg.gain.value = 0.35;
      echo.connect(fb); fb.connect(echo); echo.connect(eg); eg.connect(bus);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      drive = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = (i / 512) - 1; drive[i] = Math.tanh(x * 3.2); }
    }
    return ctx;
  }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const beat = () => 60 / bpm;

  // ---------- 調性與和弦 ----------
  const MODES = {
    major: { scale: [0, 2, 4, 5, 7, 9, 11], tonic: [0, 4, 7], cheng: [[9, 12, 16], [5, 9, 12], [2, 5, 9], [4, 7, 11]], zhuan: [7, 11, 14, 17], zhuan2: [8, 12, 15] },
    minor: { scale: [0, 2, 3, 5, 7, 8, 10], tonic: [0, 3, 7], cheng: [[8, 12, 15], [5, 8, 12], [3, 7, 10], [10, 14, 17]], zhuan: [7, 11, 14, 17], zhuan2: [1, 5, 8] },
  };
  // 一筆的和弦進行：由起承轉合的角色決定
  function progression(roles) {
    const M = MODES[mode];
    let k = 0, z = 0;
    return roles.map((r) => (r === 'qi' || r === 'he' ? M.tonic : r === 'zhuan' || r === 'zhuanhe' ? (z++ ? M.zhuan2 : M.zhuan) : M.cheng[k++ % M.cheng.length]));
  }

  // ---------- 音色：由情緒決定 ----------
  const TIMBRE = {
    warmth: { wave: 'triangle', lp: 2600, a: 0.012, r: 0.28, g: 1 },
    hope: { wave: 'sine', lp: 7000, a: 0.004, r: 0.5, g: 0.9, bell: true },
    water: { wave: 'sine', lp: 3600, a: 0.02, r: 0.42, g: 1.05, vib: 5, echo: true },
    memory: { wave: 'triangle', lp: 1700, a: 0.02, r: 0.36, g: 1, detune: 16, wow: true },
    rebel: { wave: 'square', lp: 3000, a: 0.004, r: 0.12, g: 0.5 },
    machine: { wave: 'square', lp: 6000, a: 0.002, r: 0.05, g: 0.4, stacc: true },
    guilt: { wave: 'triangle', lp: 900, a: 0.06, r: 0.5, g: 1.15, oct: -1 },
    anger: { wave: 'sawtooth', lp: 2300, a: 0.003, r: 0.14, g: 0.45, drive: true },
    neon: { wave: 'sawtooth', lp: 4300, a: 0.01, r: 0.3, g: 0.4, detune: 12 },
    hunger: { wave: 'square', lp: 1500, a: 0.02, r: 0.2, g: 0.45, trem: 9 },
  };
  const tb = (tag) => TIMBRE[tag] || TIMBRE.warmth;

  function env(g, t, peak, a, hold, r) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.setValueAtTime(Math.max(0.0002, peak), t + a + Math.max(0, hold));
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + Math.max(0, hold) + r);
  }
  // 一個音：音色 T、音量 vol、時值 dur（秒）
  function voice(t, midi, dur, T, vol, dest) {
    const c = ctx, f = mtof(midi + 12 * (T.oct || 0));
    const out = c.createGain();
    const hold = T.stacc ? Math.min(dur, 0.06) : dur * 0.7;
    env(out, t, vol * T.g, T.a, hold, T.r);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = T.lp; lp.Q.value = 0.7;
    const end = t + T.a + hold + T.r + 0.05;
    const oscs = [];
    const mk = (type, freq, det, gain) => {
      const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (det) o.detune.value = det;
      const g = c.createGain(); g.gain.value = gain; o.connect(g); g.connect(lp); oscs.push(o); return o;
    };
    mk(T.wave, f, 0, 1);
    if (T.detune) mk(T.wave, f, T.detune, 0.8);
    if (T.bell) mk('sine', f * 2.01, 0, 0.35);
    if (T.vib || T.wow) {
      const l = c.createOscillator(); l.frequency.value = T.vib || 0.8;
      const lg = c.createGain(); lg.gain.value = T.vib ? f * 0.007 : f * 0.012;
      l.connect(lg); oscs.forEach((o) => lg.connect(o.frequency)); l.start(t); l.stop(end);
    }
    let tail = lp;
    if (T.drive) { const ws = c.createWaveShaper(); ws.curve = drive; lp.connect(ws); tail = ws; }
    if (T.trem) {
      const tg = c.createGain(); tg.gain.value = 0.7;
      const l = c.createOscillator(); l.frequency.value = T.trem; const lg = c.createGain(); lg.gain.value = 0.3;
      l.connect(lg); lg.connect(tg.gain); l.start(t); l.stop(end);
      tail.connect(tg); tail = tg;
    }
    tail.connect(out);
    out.connect(dest || bus);
    if (T.echo) out.connect(echo);
    const send = c.createGain(); send.gain.value = 0.35; out.connect(send); send.connect(rev);
    oscs.forEach((o) => { o.start(t); o.stop(end); });
  }
  // 人聲（「啊」的母音：鋸齒波加兩個共振峰）
  function sing(t, midi, dur, vol, opts) {
    const c = ctx, o = opts || {}, f = mtof(midi);
    const src = c.createOscillator(); src.type = 'sawtooth';
    if (o.slide) { src.frequency.setValueAtTime(f * 0.94, t); src.frequency.exponentialRampToValueAtTime(f, t + 0.12); } else src.frequency.setValueAtTime(f, t);
    const l = c.createOscillator(); l.frequency.value = o.vib || 5.5; const lg = c.createGain(); lg.gain.value = f * (o.depth || 0.012);
    l.connect(lg); lg.connect(src.frequency);
    const out = c.createGain(); env(out, t, vol, o.a || 0.07, dur * 0.75, 0.25);
    [[o.f1 || 720, 7, 1], [o.f2 || 1150, 9, 0.6], [2600, 10, 0.18]].forEach(([fr, q, g]) => {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = q;
      const gg = c.createGain(); gg.gain.value = g * 4; src.connect(bp); bp.connect(gg); gg.connect(out);
    });
    out.connect(bus);
    const send = c.createGain(); send.gain.value = 0.55; out.connect(send); send.connect(rev);
    const end = t + dur + 0.4;
    src.start(t); src.stop(end); l.start(t); l.stop(end);
  }
  function noise(t, dur, vol, type, freq, q) {
    const c = ctx, src = c.createBufferSource(); src.buffer = noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  }
  function kick(t, v) {
    const c = ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.32);
  }
  const snare = (t, v) => { noise(t, 0.16, v * 0.8, 'bandpass', 1900, 0.8); const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 185; g.gain.setValueAtTime(v * 0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.1); };
  const hat = (t, v) => noise(t, 0.045, v, 'highpass', 7500);
  const wood = (t, v) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = 880; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.08); noise(t, 0.02, v * 0.5, 'bandpass', 2400, 3); };

  // ---------- 樂器：由媒材決定 ----------
  // 每一小節兩拍；chord 是相對主音的半音；seed 令旋律可以重現
  function bar(t, info, bl) {
    const b = bl || beat(), M = MODES[mode], ch = info.chord, T = tb(info.tags[0]);
    const r = IE.Proto2.rng(info.seed || 1);
    const tone = (deg, oct) => key + ch[deg % ch.length] + 12 * (oct + Math.floor(deg / ch.length));
    const scaleNote = (i, oct) => key + M.scale[((i % 7) + 7) % 7] + 12 * (oct + Math.floor(i / 7));
    const L = info.layers || {};
    const vol = 0.85 + 0.06 * (info.star || 1);
    // 低音：每小節的根音（一直都在）
    voice(t, key - 24 + ch[0], b * 1.6, { wave: 'triangle', lp: 700, a: 0.01, r: 0.2, g: 1 }, 0.3);
    if (L.pad || info.medium === 'image') {
      const v = info.medium === 'image' ? 0.075 : 0.03;
      ch.slice(0, 3).forEach((d, i) => voice(t, key + d + (i ? 0 : 12) - 12, b * 1.9, { wave: info.medium === 'image' ? T.wave : 'sine', lp: info.medium === 'image' ? Math.min(T.lp, 2400) : 1400, a: info.medium === 'image' ? 0.25 : 0.12, r: 0.6, g: 1, detune: info.medium === 'image' ? 10 : 0 }, v));
    }
    if (info.medium === 'sound' || L.melody) {
      // 旋律：四個八分音符，由和弦音出發，一步步走；合的時候落在主音
      const main = info.medium === 'sound';
      let i = 7 + Math.floor(r() * 3) * 2;
      const n = 4;
      for (let k = 0; k < n; k++) {
        const last = k === n - 1;
        let m;
        if (last && info.role === 'he') m = key + 12 + (main ? 12 : 0);
        else if (last) m = tone(Math.floor(r() * 3), main ? 2 : 1);
        else { i += [-1, 1, 1, 2, -2][Math.floor(r() * 5)]; m = scaleNote(i, main ? 1 : 0); }
        voice(t + k * b / 2, m, b / 2 * (last ? 1.6 : 0.9), main ? T : { wave: 'triangle', lp: 2000, a: 0.02, r: 0.2, g: 1 }, main ? 0.16 * vol : 0.05);
      }
    }
    if (info.medium === 'data' || L.arp) {
      const main = info.medium === 'data';
      for (let k = 0; k < 8; k++) voice(t + k * b / 4, tone(k % 2 ? (k % 4 === 1 ? 1 : 2) : (k % 4 === 0 ? 0 : 1), main ? 1 : 1), b / 4 * 0.8, main ? Object.assign({}, T, { stacc: true, r: 0.06 }) : { wave: 'square', lp: 2600, a: 0.002, r: 0.05, g: 0.4, stacc: true }, main ? 0.09 * vol : 0.03);
    }
    if (info.medium === 'body' || L.beat) {
      const main = info.medium === 'body', v = main ? 0.55 : 0.3;
      kick(t, v); snare(t + b, v * 0.7);
      const hard = info.tags[0] === 'anger' || info.tags[0] === 'rebel';
      for (let k = 0; k < (hard ? 8 : 4); k++) hat(t + k * b / (hard ? 4 : 2), (main ? 0.12 : 0.06) * (k % 2 ? 0.6 : 1));
      if (main && (info.star || 1) >= 3) kick(t + b * 1.5, v * 0.6);
    }
    if (info.medium === 'paper') {
      // 人聲：唱出素材的名字（兩個長音）
      sing(t, tone(1, 0) + 12, b * 0.95, 0.11 * vol);
      sing(t + b, info.role === 'he' ? key + 12 : tone(Math.floor(r() * 3), 0) + 12, b * 0.95, 0.11 * vol);
    }
    if (L.choir) [0, 1, 2].forEach((d) => sing(t, tone(d, 0), b * 1.9, 0.03, { f1: 500, f2: 900, a: 0.25, vib: 4.5, depth: 0.006 }));
    if (L.wood) { wood(t + b * 0.5, 0.18); wood(t + b * 1.5, 0.14); }
    if (L.opera && info.role === 'he') sing(t + b * 0.2, key + 19, b * 1.6, 0.09, { slide: true, vib: 6.5, depth: 0.03, f1: 650, f2: 1250 });
    if (info.role === 'zhuan' || info.role === 'zhuanhe') { noise(t, b * 1.8, 0.05, 'highpass', 5000); }
    return b * 2;
  }

  // 計分時的一小節（現在開始播，拍子快一點）；快轉時只播一個短和弦
  const QUICK = 0.62;
  function playBar(info, fast) {
    if (!ensure() || S().muted) return;
    const t = ctx.currentTime + 0.03;
    if (fast) { info.chord.slice(0, 3).forEach((d) => voice(t, key + d, 0.12, tb(info.tags[0]), 0.05)); return; }
    bar(t, info, beat() * QUICK);
  }
  // 合：主和弦整個響起來
  function cadence() {
    if (!ensure() || S().muted) return;
    const t = ctx.currentTime + 0.02, M = MODES[mode];
    M.tonic.concat([12]).forEach((d, i) => voice(t + i * 0.03, key + d, 1.4, { wave: 'triangle', lp: 3000, a: 0.01, r: 0.9, g: 1, bell: true }, 0.08));
    voice(t, key - 24, 1.6, { wave: 'triangle', lp: 600, a: 0.01, r: 0.8, g: 1 }, 0.3);
  }

  // 整首歌：intro（主和弦）→ 每一筆一段 → 尾聲；onBar(段, 小節) 用來同步歌詞和畫面
  function song(sections, onBar, onEnd) {
    stop();
    if (!ensure()) return { duration: 0 };
    const b = beat();
    let t = ctx.currentTime + 0.15;
    const t0 = t;
    const timers = [];
    const M = MODES[mode];
    // intro：兩拍的和聲墊
    M.tonic.forEach((d) => voice(t, key + d, b * 1.9, { wave: 'sine', lp: 1600, a: 0.3, r: 0.6, g: 1 }, 0.05));
    voice(t, key - 24, b * 1.9, { wave: 'triangle', lp: 700, a: 0.05, r: 0.3, g: 1 }, 0.25);
    t += b * 2;
    sections.forEach((sec, si) => {
      sec.bars.forEach((info, bi) => {
        const at = t;
        timers.push(setTimeout(() => onBar && onBar(si, bi), Math.max(0, (at - ctx.currentTime) * 1000)));
        bar(at, info);
        t += b * 2;
      });
    });
    // 尾聲：主和弦長音
    const end = t;
    M.tonic.concat([12]).forEach((d) => voice(end, key + d, b * 3, { wave: 'triangle', lp: 2400, a: 0.02, r: 1.2, g: 1, bell: true }, 0.07));
    voice(end, key - 24, b * 3, { wave: 'triangle', lp: 600, a: 0.01, r: 1, g: 1 }, 0.3);
    const dur = end + b * 3 + 1.2 - t0;
    timers.push(setTimeout(() => { live.delete(handle); if (onEnd) onEnd(); }, dur * 1000));
    const handle = { timers, duration: dur, stop() { timers.forEach(clearTimeout); } };
    live.add(handle);
    return handle;
  }
  // 停止：取消未到的小節（已經排好的音很短，自然結束）；整條音樂線淡出再恢復
  function stop() {
    live.forEach((h) => h.stop());
    live.clear();
    if (bus && ctx) {
      const t = ctx.currentTime;
      bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t);
      bus.gain.linearRampToValueAtTime(0.0001, t + 0.15);
      bus.gain.linearRampToValueAtTime(0.9, t + 0.4);
    }
  }
  function setKey(k, m, tempo) { key = k; mode = MODES[m] ? m : 'major'; bpm = tempo || 112; }

  IE.Music = { setKey, progression, playBar, cadence, song, stop, beat: () => beat(), quickBar: () => beat() * QUICK * 2, ensure: () => !!ensure() };
})(typeof window !== 'undefined' ? window : globalThis);
