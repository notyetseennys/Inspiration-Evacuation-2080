// 創作之夜原型第三版：作品裏的歌（WebAudio 即時合成）。
// 每一筆是歌的一段；每張計分的素材是一個和弦，佔兩拍（半小節）。
// 由第一筆開始，整首歌一直有鼓、低音和和弦伴奏，所以每一段都是完整的音樂：
//   起承轉合決定和弦進行：起＝主和弦、承＝vi／IV／ii、轉＝屬七（緊張）、合＝回到主和弦（解決）；例如 起承承轉合＝I–vi–IV–V–I。
//   旋律由每一段的動機發展：同一個節奏和走向，跟着和弦移位（模進）；轉的時候倒過來，合的時候落在主音。
//   媒材決定主角樂器：聲＝主旋律、身＝鼓的過門和重音、數＝電子琶音、影＝弦樂墊、紙＝人聲（唱出旋律，歌詞是素材的名字）。
//   情緒決定音色：人情＝溫暖的電鋼琴、霓虹＝合成器、水＝回聲、記憶＝舊唱片的沙沙聲……
//   夥伴加入之後一起演奏：DJ 小妹打鼓、Miu 的琶音、小雨的副旋律、Mary 姐的和音、老陳的木魚、芳姐在合的時候唱一句。
(function (root) {
  'use strict';
  const IE = root.IE = root.IE || {};
  const S = () => IE.Sfx;
  let ctx = null, bus = null, rev = null, echo = null, noiseBuf = null, drive = null;
  let key = 60, mode = 'major', bpm = 100, style = 'lofi';
  const live = new Set();

  function ensure() {
    const c = S().ctx();
    if (!c) return null;
    if (c !== ctx) {
      ctx = c;
      bus = ctx.createGain(); bus.gain.value = 0.85; bus.connect(S().bus());
      rev = ctx.createConvolver();
      const len = Math.floor(ctx.sampleRate * 2.4), ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
      rev.buffer = ir;
      const rg = ctx.createGain(); rg.gain.value = 0.3; rev.connect(rg); rg.connect(S().bus());
      echo = ctx.createDelay(1.5);
      const fb = ctx.createGain(); fb.gain.value = 0.3; const eg = ctx.createGain(); eg.gain.value = 0.32; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
      echo.connect(lp); lp.connect(fb); fb.connect(echo); lp.connect(eg); eg.connect(bus);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      drive = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = (i / 512) - 1; drive[i] = Math.tanh(x * 3); }
    }
    echo.delayTime.setValueAtTime(beat() * 0.75, ctx.currentTime);
    return ctx;
  }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const beat = () => 60 / bpm;
  const slotDur = () => beat() * 2;

  // ---------- 和聲 ----------
  const QUAL = { M: [0, 4, 7], m: [0, 3, 7], M7: [0, 4, 7, 10], dim: [0, 3, 6] };
  const DEG = {
    major: { I: [0, 'M'], ii: [2, 'm'], iii: [4, 'm'], IV: [5, 'M'], V: [7, 'M7'], vi: [9, 'm'], bVI: [8, 'M'] },
    minor: { I: [0, 'm'], III: [3, 'M'], iv: [5, 'm'], V: [7, 'M7'], VI: [8, 'M'], VII: [10, 'M'], bII: [1, 'M'] },
  };
  const CHENG = { major: ['vi', 'IV', 'ii', 'iii'], minor: ['VI', 'iv', 'III', 'VII'] };
  const ZHUAN2 = { major: 'bVI', minor: 'bII' };
  const SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
  const PENTA = { major: [0, 2, 4, 7, 9], minor: [0, 3, 5, 7, 10] };
  function chordOf(name) { const d = DEG[mode][name]; return { name, root: d[0], q: d[1], tones: QUAL[d[1]].map((x) => (x + d[0]) % 12) }; }
  // 一段的和弦進行：由起承轉合的角色決定
  function progression(roles) {
    let k = 0, z = 0;
    return roles.map((r) => chordOf(r === 'qi' || r === 'he' ? 'I' : r === 'zhuan' || r === 'zhuanhe' ? (z++ ? ZHUAN2[mode] : 'V') : CHENG[mode][k++ % 4]));
  }
  // 和弦的排列：三個轉位裏選和上一個和弦移動最少的（中音區）
  function voicing(ch, prev) {
    const base = key - 12 + ch.root;
    const t = QUAL[ch.q].slice(0, 3).map((x) => base + x);
    const inv = [t, [t[1], t[2], t[0] + 12], [t[2], t[0] + 12, t[1] + 12]].map((v) => { const sh = 12 * Math.round((62 - v[1]) / 12); return v.map((n) => n + sh); });
    let best = inv[0], bd = 1e9;
    inv.forEach((v) => { const d = prev ? v.reduce((a, n, i) => a + Math.abs(n - prev[i]), 0) : Math.abs(v[1] - 62); if (d < bd) { bd = d; best = v; } });
    if (ch.q === 'M7') { const sev = base + 10; let n = sev; while (n < best[0]) n += 12; while (n > best[2] + 2) n -= 12; best = best.concat([n]).sort((a, b) => a - b); }
    return best;
  }

  // ---------- 旋律：動機發展 ----------
  // 節奏（半小節 8 個十六分音符：開始位置、長度）和走向（音階的步數）
  const RHYTHMS = [
    [[0, 2], [2, 2], [4, 2], [6, 2]], [[0, 3], [3, 3], [6, 2]], [[0, 2], [2, 1], [3, 1], [4, 4]], [[0, 4], [4, 4]],
    [[2, 2], [4, 2], [6, 2]], [[0, 1], [1, 1], [2, 2], [4, 4]], [[0, 3], [3, 1], [4, 4]], [[0, 2], [3, 3], [6, 2]],
  ];
  const CONTOURS = [[0, 1, 2, 1], [0, -1, -2, 0], [0, 2, 1, 0], [2, 1, 0, -1], [0, 0, 1, 2], [0, 1, 0, -1], [0, -1, 1, 0], [1, 0, -1, -2]];
  function melodyFor(prog, roles, seed, contourSeed) {
    const r = IE.Proto2.rng(seed);
    const rhythm = RHYTHMS[Math.floor(r() * RHYTHMS.length)];
    const contour = CONTOURS[(contourSeed >>> 0) % CONTOURS.length];
    const pen = PENTA[mode];
    const scaleNotes = []; for (let o = 4; o <= 7; o++) pen.forEach((x) => scaleNotes.push(key + 12 * (o - 5) + x + 12));
    const near = (m) => scaleNotes.reduce((a, n) => (Math.abs(n - m) < Math.abs(a - m) ? n : a), scaleNotes[0]);
    const step = (m, k) => { const i = scaleNotes.indexOf(near(m)); return scaleNotes[Math.max(0, Math.min(scaleNotes.length - 1, i + k))]; };
    let last = key + 12 + 4;
    return prog.map((ch, si) => {
      const role = roles[si];
      // 錨：離上一個音最近的和弦音（旋律在 C5 附近）
      const tones = []; for (let o = 0; o <= 2; o++) ch.tones.forEach((tc) => tones.push(key + tc + 12 * o));
      let anchor = tones.reduce((a, n) => (Math.abs(n - last) < Math.abs(a - last) ? n : a), tones[0]);
      if (anchor > key + 26) anchor -= 12; if (anchor < key + 9) anchor += 12;
      const cont = role === 'zhuan' || role === 'zhuanhe' ? contour.map((x) => -x) : contour;
      const notes = rhythm.map(([pos, len], j) => ({ pos, len, m: j === 0 ? anchor : step(anchor, cont[j % cont.length]) }));
      if (role === 'he') { const tonic = [key + 12, key + 24].reduce((a, n) => (Math.abs(n - anchor) < Math.abs(a - anchor) ? n : a)); notes.length = Math.min(notes.length, 2); notes[notes.length - 1] = { pos: notes[notes.length - 1].pos, len: 8 - notes[notes.length - 1].pos, m: tonic }; }
      last = notes[notes.length - 1].m;
      return notes;
    });
  }

  // ---------- 音色：情緒 ----------
  const TIMBRE = {
    warmth: { wave: 'triangle', lp: 2600, a: 0.012, r: 0.3, g: 1 },
    hope: { wave: 'sine', lp: 7000, a: 0.004, r: 0.55, g: 0.9, bell: true, echo: true },
    water: { wave: 'sine', lp: 3600, a: 0.02, r: 0.45, g: 1.05, vib: 5, echo: true },
    memory: { wave: 'triangle', lp: 1800, a: 0.02, r: 0.38, g: 1, detune: 14, wow: true },
    rebel: { wave: 'square', lp: 3000, a: 0.004, r: 0.14, g: 0.5 },
    machine: { wave: 'square', lp: 5200, a: 0.002, r: 0.08, g: 0.42 },
    guilt: { wave: 'triangle', lp: 1100, a: 0.05, r: 0.55, g: 1.15, oct: -1 },
    anger: { wave: 'sawtooth', lp: 2300, a: 0.003, r: 0.16, g: 0.45, drive: true },
    neon: { wave: 'sawtooth', lp: 4000, a: 0.01, r: 0.32, g: 0.4, detune: 10, echo: true },
    hunger: { wave: 'square', lp: 1600, a: 0.02, r: 0.22, g: 0.45, trem: 8 },
  };
  const tb = (tag) => TIMBRE[tag] || TIMBRE.warmth;
  function env(g, t, peak, a, hold, r) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.setValueAtTime(Math.max(0.0002, peak), t + a + Math.max(0, hold));
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + Math.max(0, hold) + r);
  }
  function out(node, pan, sendRev, sendEcho) {
    let n = node;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; n.connect(p); n = p; }
    n.connect(bus);
    if (sendRev) { const s = ctx.createGain(); s.gain.value = sendRev; n.connect(s); s.connect(rev); }
    if (sendEcho) { const s = ctx.createGain(); s.gain.value = sendEcho; n.connect(s); s.connect(echo); }
  }
  function lead(t, midi, dur, T, vol, pan) {
    const c = ctx, f = mtof(midi + 12 * (T.oct || 0));
    const g = c.createGain();
    env(g, t, vol * T.g, T.a, Math.max(0.02, dur - T.a), T.r);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = T.lp; lp.Q.value = 0.8;
    const end = t + dur + T.r + 0.1, oscs = [];
    const mk = (type, freq, det, gain) => { const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (det) o.detune.value = det; const gg = c.createGain(); gg.gain.value = gain; o.connect(gg); gg.connect(lp); oscs.push(o); };
    mk(T.wave, f, 0, 1);
    if (T.detune) mk(T.wave, f, T.detune, 0.7);
    if (T.bell) mk('sine', f * 2.005, 0, 0.3);
    if (T.vib || T.wow) { const l = c.createOscillator(); l.frequency.value = T.vib || 0.9; const lg = c.createGain(); lg.gain.value = f * (T.vib ? 0.006 : 0.01); l.connect(lg); oscs.forEach((o) => lg.connect(o.frequency)); l.start(t + 0.08); l.stop(end); }
    let tail = lp;
    if (T.drive) { const ws = c.createWaveShaper(); ws.curve = drive; lp.connect(ws); tail = ws; }
    if (T.trem) { const tg = c.createGain(); tg.gain.value = 0.75; const l = c.createOscillator(); l.frequency.value = T.trem; const lg = c.createGain(); lg.gain.value = 0.25; l.connect(lg); lg.connect(tg.gain); l.start(t); l.stop(end); tail.connect(tg); tail = tg; }
    tail.connect(g);
    out(g, pan || 0, 0.28, T.echo ? 0.35 : 0);
    oscs.forEach((o) => { o.start(t); o.stop(end); });
  }
  // 電鋼琴（伴奏的和弦）
  function ep(t, midis, dur, vol, bright) {
    midis.forEach((m, i) => {
      const c = ctx, f = mtof(m), g = c.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
      g.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.45); g.gain.setValueAtTime(vol * 0.35, t + Math.max(0.46, dur - 0.05)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = bright ? 3600 : 2200;
      const o1 = c.createOscillator(); o1.type = 'sine'; o1.frequency.value = f;
      const o2 = c.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f; const g2 = c.createGain(); g2.gain.value = 0.25;
      const o3 = c.createOscillator(); o3.type = 'sine'; o3.frequency.value = f * 4; const g3 = c.createGain(); g3.gain.setValueAtTime(0.12, t); g3.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      o1.connect(lp); o2.connect(g2); g2.connect(lp); o3.connect(g3); g3.connect(lp); lp.connect(g);
      out(g, (i - 1) * 0.25, 0.22, 0);
      const end = t + dur + 0.3; [o1, o2, o3].forEach((o) => { o.start(t); o.stop(end); });
    });
  }
  // 弦樂墊（影）、合成器墊（霓虹）
  function pad(t, midis, dur, vol, T) {
    midis.forEach((m, i) => [-7, 7].forEach((det, j) => {
      const c = ctx, g = c.createGain();
      env(g, t, vol, Math.min(0.35, dur * 0.3), dur * 0.6, 0.7);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(600, t); lp.frequency.linearRampToValueAtTime((T && T.lp) ? Math.min(3000, T.lp) : 1800, t + dur * 0.7);
      const o = c.createOscillator(); o.type = (T && T.wave === 'sine') ? 'triangle' : 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det + (i - 1) * 2;
      o.connect(lp); lp.connect(g); out(g, j ? 0.45 : -0.45, 0.4, 0);
      o.start(t); o.stop(t + dur + 0.9);
    }));
  }
  function bassNote(t, midi, dur, vol, kind) {
    const c = ctx, f = mtof(midi), g = c.createGain();
    env(g, t, vol, 0.006, Math.max(0.03, dur - 0.06), 0.08);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(kind === 'synth' ? 1400 : 900, t); lp.frequency.exponentialRampToValueAtTime(kind === 'synth' ? 380 : 420, t + Math.min(0.3, dur));
    const o1 = c.createOscillator(); o1.type = kind === 'synth' ? 'sawtooth' : 'triangle'; o1.frequency.value = f;
    const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f / 2; const g2 = c.createGain(); g2.gain.value = kind === 'lofi' ? 0.7 : 0.45;
    o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); out(g, 0, 0, 0);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.15); o2.stop(t + dur + 0.15);
  }
  function sing(t, midi, dur, vol, o) {
    o = o || {};
    const c = ctx, f = mtof(midi);
    const src = c.createOscillator(); src.type = 'sawtooth';
    if (o.slide) { src.frequency.setValueAtTime(f * 0.94, t); src.frequency.exponentialRampToValueAtTime(f, t + 0.12); } else src.frequency.setValueAtTime(f, t);
    const l = c.createOscillator(); l.frequency.value = o.vib || 5.2; const lg = c.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * (o.depth || 0.01), t + 0.25);
    l.connect(lg); lg.connect(src.frequency);
    const g = c.createGain(); env(g, t, vol, o.a || 0.06, Math.max(0.05, dur - 0.1), 0.22);
    [[o.f1 || 730, 8, 1], [o.f2 || 1090, 10, 0.55], [2440, 12, 0.16]].forEach(([fr, q, gg]) => {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = q;
      const gn = c.createGain(); gn.gain.value = gg * 4.2; src.connect(bp); bp.connect(gn); gn.connect(g);
    });
    out(g, o.pan || 0, 0.5, 0.15);
    const end = t + dur + 0.4; src.start(t); src.stop(end); l.start(t); l.stop(end);
  }
  function noise(t, dur, vol, type, freq, q, pan, sendRev) {
    const c = ctx, src = c.createBufferSource(); src.buffer = noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); out(g, pan || 0, sendRev || 0, 0);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.02);
  }
  // ---------- 鼓 ----------
  function kick(t, v) {
    const c = ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    o.connect(g); out(g, 0, 0, 0); o.start(t); o.stop(t + 0.36);
    noise(t, 0.012, v * 0.25, 'highpass', 1800);
  }
  function snare(t, v, roomy) { noise(t, roomy ? 0.24 : 0.17, v * 0.75, 'bandpass', 1800, 0.7, 0.05, roomy ? 0.7 : 0.18); const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.08); g.gain.setValueAtTime(v * 0.45, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); o.connect(g); out(g, 0, 0.1, 0); o.start(t); o.stop(t + 0.12); }
  function clap(t, v) { [0, 0.011, 0.023].forEach((d) => noise(t + d, 0.03, v * 0.6, 'bandpass', 1300, 1.2, 0, 0.15)); noise(t + 0.03, 0.14, v * 0.4, 'bandpass', 1200, 1, 0, 0.3); }
  const hat = (t, v, open) => noise(t, open ? 0.22 : 0.045, v, 'highpass', 7600, 0, 0.18);
  const shaker = (t, v) => noise(t, 0.06, v, 'bandpass', 6200, 2, -0.2);
  function tom(t, f, v) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.14); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g); out(g, 0, 0.2, 0); o.start(t); o.stop(t + 0.32); }
  const crash = (t, v) => { noise(t, 1.8, v, 'highpass', 4200, 0, 0, 0.3); noise(t, 0.9, v * 0.5, 'bandpass', 8500, 0.8); };
  const wood = (t, v) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = 820; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07); o.connect(g); out(g, 0.3, 0.1, 0); o.start(t); o.stop(t + 0.08); noise(t, 0.02, v * 0.4, 'bandpass', 2400, 3, 0.3); };
  const crackle = (t, dur, v) => { for (let i = 0; i < Math.round(dur * 14); i++) noise(t + Math.random() * dur, 0.004, v * (0.4 + Math.random()), 'highpass', 3000); };

  // ---------- 一段：每張素材一個和弦（兩拍），所有聲部預先算好 ----------
  // cards: [{ id, tags, medium, star }]；roles：起承轉合；layers：夥伴和之前出現過的媒材
  function section(o) {
    const prog = progression(o.roles);
    const seed = o.seed >>> 0;
    const mel = melodyFor(prog, o.roles, seed, o.motif >>> 0);
    let prev = null;
    const slots = prog.map((ch, i) => { const v = voicing(ch, prev); prev = v; return { ch, v, mel: mel[i], card: o.cards[i], role: o.roles[i] }; });
    // 湊夠整小節：單數就把最後一個和弦多拉兩拍（合的時候像一個終止）
    const tail = slots.length % 2 === 1;
    return { slots, tail, index: o.index || 0, layers: o.layers || {}, theme: o.theme || 'warmth', hasSound: o.cards.some((c) => c.medium === 'sound') };
  }
  function playSlot(sec, i, t, b) {
    b = b || beat();
    const sl = sec.slots[i], L = sec.layers, card = sl.card, med = card.medium, T = tb(sec.theme);
    const sixteenth = b / 4, intensity = Math.min(3, sec.index + (L.beat ? 1 : 0));
    const swing = style === 'lofi' ? 0.06 * b : 0;
    const at = (pos) => t + pos * sixteenth + (pos % 2 === 1 ? swing : 0);
    const isBody = med === 'body';
    // 鼓
    if (style === 'synth') { kick(at(0), 0.85); kick(at(4), 0.85); }
    else { kick(at(0), 0.8); if (intensity >= 1 && (style === 'citypop' || isBody)) kick(at(style === 'citypop' ? 3 : 6), 0.55); }
    if (intensity >= 1 || isBody) { snare(at(4), style === 'lofi' ? 0.38 : 0.5, style === 'synth'); if (style === 'citypop') clap(at(4), 0.35); }
    for (let k = 0; k < 8; k++) {
      if (style === 'synth') { if (k % 2 === 1) hat(at(k), 0.09); }
      else if (style === 'citypop') hat(at(k), k % 2 ? 0.05 : 0.08);
      else if (k % 2 === 0 || intensity >= 2) hat(at(k), k % 2 ? 0.035 : 0.07);
    }
    if (isBody) {
      // 身：過門和重音
      const big = (card.star || 1) >= 3;
      tom(at(5), 160, 0.35); tom(at(6), 130, 0.38); if (big) tom(at(7), 100, 0.4);
      shaker(at(1), 0.08); shaker(at(3), 0.08);
    }
    if (L.wood) { wood(at(2), 0.12); wood(at(6), 0.1); }
    // 低音
    const root = key - 24 + sl.ch.root, five = root + 7;
    const bk = style === 'synth' ? 'synth' : style === 'lofi' ? 'lofi' : 'funk';
    if (style === 'synth') for (let k = 0; k < 4; k++) bassNote(at(k * 2), root, b * 0.45, 0.3, 'synth');
    else if (style === 'citypop') { bassNote(at(0), root, b * 0.4, 0.34, bk); bassNote(at(3), root + 12, b * 0.2, 0.26, bk); bassNote(at(4), root, b * 0.4, 0.3, bk); bassNote(at(7), five, b * 0.2, 0.24, bk); }
    else { bassNote(at(0), root, b * 1.2, 0.38, bk); bassNote(at(6), five - 12 < root - 7 ? five : five - 12, b * 0.45, 0.24, bk); }
    // 和弦伴奏
    if (style === 'citypop') { ep(at(0), sl.v, b * 0.35, 0.05, true); ep(at(3), sl.v, b * 0.3, 0.045, true); ep(at(6), sl.v, b * 0.35, 0.04, true); }
    else if (style === 'synth') pad(t, sl.v, b * 2, 0.022, TIMBRE.neon);
    else ep(at(0), sl.v, b * 1.9, 0.055, false);
    if (med === 'image' || L.pad) pad(t, sl.v.map((m) => m + 12), b * 2, med === 'image' ? 0.03 : 0.015, tb(card.tags[0]));
    // 旋律：第二段起一直有；聲素材是主角（音量大、用它自己的音色）
    if (sl.mel && (sec.index >= 1 || sec.hasSound || med === 'sound')) {
      const feat = med === 'sound', TT = feat ? tb(card.tags[0]) : T;
      sl.mel.forEach((n) => lead(at(n.pos), n.m, n.len * sixteenth * 0.95, TT, feat ? 0.15 : 0.085, 0.1));
      if (L.melody) sl.mel.forEach((n, j) => { if (j % 2 === 0) lead(at(n.pos), n.m - (mode === 'major' ? 4 : 3), n.len * sixteenth * 0.9, TIMBRE.warmth, 0.04, -0.3); });
    }
    // 紙：人聲唱出旋律（歌詞是素材的名字）
    if (med === 'paper' && sl.mel) sl.mel.forEach((n) => sing(at(n.pos), n.m - 12, n.len * sixteenth * 0.98, 0.1, { pan: -0.1 }));
    // 數：電子琶音
    if (med === 'data' || L.arp) {
      const ar = sl.v.concat([sl.v[0] + 12]);
      for (let k = 0; k < 8; k++) lead(at(k), ar[(k % 2 ? 3 - (k >> 1) % 4 : (k >> 1) % 4) % ar.length] + 12, sixteenth * 0.8, med === 'data' ? Object.assign({}, tb(card.tags[0]), { a: 0.002, r: 0.06 }) : TIMBRE.machine, med === 'data' ? 0.07 : 0.03, 0.35);
    }
    // 和音（Mary 姐）、粵劇（芳姐，在合的時候）
    if (L.choir) sl.v.forEach((m, j) => sing(t, m, b * 1.9, 0.026, { f1: 520, f2: 880, a: 0.3, vib: 4.6, depth: 0.005, pan: j - 1 }));
    if (L.opera && sl.role === 'he') sing(t + b * 0.25, key + 19, b * 1.6, 0.08, { slide: true, vib: 6.5, depth: 0.028, f1: 660, f2: 1250 });
    // 轉：緊張的掃音；合：鈸；記憶：舊唱片的沙沙聲；水：雨聲
    if (sl.role === 'zhuan' || sl.role === 'zhuanhe') noise(t, b * 2, 0.06, 'bandpass', 3000, 0.6, 0, 0.3);
    if (sl.role === 'he') crash(t, 0.12);
    if (sec.theme === 'memory' || style === 'lofi') crackle(t, b * 2, 0.035);
    if (sec.theme === 'water') noise(t, b * 2, 0.03, 'highpass', 5000, 0, 0, 0.1);
    return b * 2;
  }
  // 段尾：多拉兩拍的主和弦
  function playTail(sec, t, b) {
    b = b || beat();
    const sl = sec.slots[sec.slots.length - 1];
    kick(t, 0.6); ep(t, sl.v, b * 1.9, 0.05, false);
    bassNote(t, key - 24 + sl.ch.root, b * 1.8, 0.34, style === 'synth' ? 'synth' : 'lofi');
    if (sl.mel) lead(t, sl.mel[sl.mel.length - 1].m, b * 1.6, tb(sec.theme), 0.06, 0.1);
    hat(t + b, 0.05, true);
    return b * 2;
  }

  // 計分時：播一個和弦（現在開始）；快轉時只播一下
  function playSlotNow(sec, i, fast) {
    if (!ensure() || S().muted) return;
    const t = ctx.currentTime + 0.03;
    if (fast) { ep(t, sec.slots[i].v, 0.18, 0.05, true); return; }
    playSlot(sec, i, t);
  }
  function playTailNow(sec) { if (!ensure() || S().muted) return; playTail(sec, ctx.currentTime + 0.03); }

  // 整首歌：前奏（兩小節）→ 每一筆一段 → 尾聲；onSlot(段, 第幾個) 用來同步歌詞和畫面
  function song(sections, onSlot, onEnd) {
    stop();
    if (!ensure()) return { duration: 0, stop() {} };
    const b = beat();
    let t = ctx.currentTime + 0.2;
    const t0 = t, timers = [];
    // 前奏：主和弦，鼓慢慢進來
    const I = voicing(chordOf('I'), null);
    for (let k = 0; k < 2; k++) { ep(t + k * b * 2, I, b * 1.9, 0.05, false); bassNote(t + k * b * 2, key - 24, b * 1.6, 0.32, 'lofi'); hat(t + k * b * 2 + b, 0.05); if (k) { kick(t + k * b * 2, 0.6); snare(t + k * b * 2 + b, 0.3); } }
    if (style === 'lofi') crackle(t, b * 4, 0.04);
    t += b * 4;
    sections.forEach((sec, si) => {
      sec.slots.forEach((sl, i) => {
        const at = t;
        timers.push(setTimeout(() => onSlot && onSlot(si, i), Math.max(0, (at - ctx.currentTime) * 1000)));
        playSlot(sec, i, at, b);
        t += b * 2;
      });
      if (sec.tail) { playTail(sec, t, b); t += b * 2; }
    });
    // 尾聲：主和弦長音、鈸、旋律落在主音
    const end = t;
    ep(end, I, b * 3.5, 0.06, false); pad(end, I.map((m) => m + 12), b * 4, 0.02, TIMBRE.warmth);
    bassNote(end, key - 24, b * 3.5, 0.34, 'lofi'); kick(end, 0.7); crash(end, 0.14);
    lead(end, key + 12, b * 3, tb(sections.length ? sections[sections.length - 1].theme : 'warmth'), 0.08, 0.1);
    const dur = end + b * 4 + 1.5 - t0;
    const handle = { timers, duration: dur, stop() { timers.forEach(clearTimeout); } };
    timers.push(setTimeout(() => { live.delete(handle); if (onEnd) onEnd(); }, dur * 1000));
    live.add(handle);
    return handle;
  }
  function stop() {
    live.forEach((h) => h.stop()); live.clear();
    if (bus && ctx) { const t = ctx.currentTime; bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.linearRampToValueAtTime(0.0001, t + 0.15); bus.gain.linearRampToValueAtTime(0.85, t + 0.45); }
  }
  function setNight(o) { key = o.key; mode = DEG[o.mode] ? o.mode : 'major'; bpm = o.bpm || 100; style = o.style || 'lofi'; }

  // 測試：用 OfflineAudioContext 輸出整首歌
  function offline(c) {
    ctx = c;
    bus = c.createGain(); bus.gain.value = 0.85;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    const master = c.createGain(); master.gain.value = 0.42; bus.connect(master); master.connect(comp); comp.connect(c.destination);
    rev = c.createConvolver();
    const len = Math.floor(c.sampleRate * 2.4), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
    rev.buffer = ir; const rg = c.createGain(); rg.gain.value = 0.3; rev.connect(rg); rg.connect(master);
    echo = c.createDelay(1.5); echo.delayTime.value = beat() * 0.75; const fb = c.createGain(); fb.gain.value = 0.3; echo.connect(fb); fb.connect(echo); const eg = c.createGain(); eg.gain.value = 0.32; echo.connect(eg); eg.connect(bus);
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    drive = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = (i / 512) - 1; drive[i] = Math.tanh(x * 3); }
    return { songAt(sections) { let t = 0.1; const b = beat(); sections.forEach((sec) => { sec.slots.forEach((sl, i) => { playSlot(sec, i, t, b); t += b * 2; }); if (sec.tail) { playTail(sec, t, b); t += b * 2; } }); return t; } };
  }

  IE.Music = { offline, setNight, setKey: (k, m, b) => setNight({ key: k, mode: m, bpm: b, style }), section, playSlotNow, playTailNow, song, stop, progression, beat: () => beat(), slotDur: () => slotDur(), ensure: () => !!ensure() };
})(typeof window !== 'undefined' ? window : globalThis);
