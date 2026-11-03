// 創作之夜原型第四版：作品裏的歌（WebAudio 即時合成，按小節排程）。
// 目標：令真正做音樂的人也覺得「這是一首歌」。做法是照真實的製作習慣：
//   樂器：FM 電鋼琴（Rhodes／DX 的做法）、撥弦算法（Karplus-Strong）的結他和豎琴、超級鋸齒波的弦樂墊、
//         808 式的金屬鈸（六個方波）、有音高包絡和飽和的大鼓、層疊的小鼓和拍手、有濾波包絡的低音。
//   和聲：無根音的七和弦和九和弦排列（lo-fi、city pop 常用），聲部平順地走；小調用和聲小調的屬和弦。
//   節奏：每晚一種律動（lo-fi 搖擺、city pop 十六分音符、synthwave 四拍大鼓），輕擊的小鼓、人手的微小誤差、段落之間的過門和鈸。
//   旋律：每段兩小節一句，ABAC；強拍落和弦音（三音、七音、九音），弱拍走音階；整首歌共用一個動機。
//   混音：電鋼琴和弦樂墊經過 chorus；立體聲乒乓回聲；有早期反射的殘響；synthwave 的低音和墊音跟大鼓「呼吸」；
//         lo-fi 再加低通和磁帶的搖晃；最後是壓縮和限幅。
// 每張素材是一小節（四拍）；計分時只播兩拍的「草稿」，收工後才聽完整的編曲。
(function (root) {
  'use strict';
  const IE = root.IE = root.IE || {};
  const S = () => IE.Sfx;
  let ctx = null, G = null, noiseBuf = null;
  let key = 60, mode = 'major', bpm = 100, style = 'lofi';
  const ksCache = new Map();
  let scheduler = null;

  // ---------- 混音台 ----------
  function build(c, dest) {
    ctx = c;
    const g = (v) => { const n = c.createGain(); n.gain.value = v; return n; };
    const M = {};
    M.pre = g(0.62);
    // lo-fi：低通和輕微的飽和；其他風格直通
    M.tone = c.createBiquadFilter(); M.tone.type = 'lowpass'; M.tone.frequency.value = 18000; M.tone.Q.value = 0.5;
    M.sat = c.createWaveShaper(); M.sat.curve = curve(1.6); M.sat.oversample = '2x';
    M.lowcut = c.createBiquadFilter(); M.lowcut.type = 'highpass'; M.lowcut.frequency.value = 32;
    M.glue = c.createDynamicsCompressor(); M.glue.threshold.value = -16; M.glue.ratio.value = 3; M.glue.attack.value = 0.01; M.glue.release.value = 0.18; M.glue.knee.value = 8;
    M.limit = c.createDynamicsCompressor(); M.limit.threshold.value = -4; M.limit.ratio.value = 20; M.limit.attack.value = 0.002; M.limit.release.value = 0.08; M.limit.knee.value = 0;
    M.out = g(0.95);
    M.pre.connect(M.tone); M.tone.connect(M.sat); M.sat.connect(M.lowcut); M.lowcut.connect(M.glue); M.glue.connect(M.limit); M.limit.connect(M.out); M.out.connect(dest);
    // 各組
    ['drums', 'bass', 'keys', 'pad', 'lead', 'vox', 'fx'].forEach((k) => { M[k] = g(1); M[k].connect(M.pre); });
    // synthwave 的「呼吸」：低音和墊音的音量跟大鼓下沉
    M.duck = g(1); M.duck.connect(M.pre); M.bass.disconnect(); M.pad.disconnect(); M.bass.connect(M.duck); M.pad.connect(M.duck);
    // chorus（電鋼琴、弦樂墊）
    M.chorusIn = g(1);
    const chOut = g(0.5);
    [[0.013, 0.31, -0.6], [0.019, 0.47, 0.6]].forEach(([d, rate, pan]) => {
      const dl = c.createDelay(0.05); dl.delayTime.value = d;
      const l = c.createOscillator(); l.frequency.value = rate; const lg = g(0.0026); l.connect(lg); lg.connect(dl.delayTime); l.start();
      const p = c.createStereoPanner(); p.pan.value = pan;
      M.chorusIn.connect(dl); dl.connect(p); p.connect(chOut);
    });
    chOut.connect(M.keys);
    // 乒乓回聲（附點八分音符）
    M.delayIn = g(1);
    const dL = c.createDelay(2), dR = c.createDelay(2), fb = g(0.36), hc = c.createBiquadFilter(); hc.type = 'lowpass'; hc.frequency.value = 3200;
    const pL = c.createStereoPanner(); pL.pan.value = -0.7; const pR = c.createStereoPanner(); pR.pan.value = 0.7;
    M.delayIn.connect(dL); dL.connect(pL); pL.connect(M.fx); dL.connect(dR); dR.connect(pR); pR.connect(M.fx); dR.connect(hc); hc.connect(fb); fb.connect(dL);
    M.dL = dL; M.dR = dR;
    // 殘響：有早期反射、左右聲道不同、高頻衰減得快
    M.revIn = g(1);
    const rev = c.createConvolver(); rev.buffer = impulse(c, 2.6);
    const rg = g(0.55); M.revIn.connect(rev); rev.connect(rg); rg.connect(M.pre);
    // 短的房間（synthwave 的小鼓）
    M.roomIn = g(1);
    const room = c.createConvolver(); room.buffer = impulse(c, 0.55); const rmg = g(0.8); M.roomIn.connect(room); room.connect(rmg); rmg.connect(M.pre);
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    G = M;
    applyStyle();
    return M;
  }
  function curve(k) { const n = 2048, a = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; a[i] = Math.tanh(x * k) / Math.tanh(k); } return a; }
  function impulse(c, sec) {
    const len = Math.floor(c.sampleRate * sec), buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / c.sampleRate, k = Math.exp(-t * (6.5 / sec));
        const a = 0.25 + 0.7 * (1 - t / sec); // 高頻越來越少
        lp = lp + a * ((Math.random() * 2 - 1) - lp);
        d[i] = lp * k * 0.6;
      }
      // 早期反射
      [0.011, 0.019, 0.027, 0.041, 0.053, 0.071].forEach((tt, j) => { const i = Math.floor((tt + ch * 0.003) * c.sampleRate); if (i < len) d[i] += (0.5 - j * 0.06) * (j % 2 ? -1 : 1); });
      // 能量歸一：殘響的音量不會比原聲大
      let e = 0; for (let i = 0; i < len; i++) e += d[i] * d[i];
      const k = 0.6 / Math.sqrt(e || 1); for (let i = 0; i < len; i++) d[i] *= k;
    }
    return buf;
  }
  function ensure() {
    const c = S().ctx();
    if (!c) return null;
    if (c !== ctx || !G) build(c, S().bus());
    return ctx;
  }
  function applyStyle() {
    if (!G) return;
    const t = ctx.currentTime;
    G.tone.frequency.setValueAtTime(style === 'lofi' ? 6200 : 18000, t);
    G.sat.curve = curve(style === 'lofi' ? 1.5 : style === 'synth' ? 1.15 : 1.05);
    const dt = beat() * 0.75; G.dL.delayTime.setValueAtTime(dt, t); G.dR.delayTime.setValueAtTime(dt, t);
  }
  const beat = () => 60 / bpm;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const send = (node, bus, amt) => { if (!amt) return; const g = ctx.createGain(); g.gain.value = amt; node.connect(g); g.connect(G[bus]); };

  // ---------- 和聲 ----------
  const QUAL = { M: [0, 4, 7], m: [0, 3, 7], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], dom7: [0, 4, 7, 10], maj9: [0, 4, 7, 11, 14], m9: [0, 3, 7, 10, 14], dom9: [0, 4, 7, 10, 14], sus: [0, 5, 7, 10], add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14], m11: [0, 3, 7, 10, 17] };
  const DEG = {
    major: { I: 0, ii: 2, iii: 4, IV: 5, V: 7, vi: 9, bVI: 8 },
    minor: { I: 0, III: 3, iv: 5, V: 7, VI: 8, VII: 10, bII: 1 },
  };
  const COLOR = {
    lofi: { I: 'maj9', ii: 'm9', iii: 'm7', IV: 'maj7', V: 'dom9', vi: 'm9', bVI: 'maj7' },
    citypop: { I: 'maj9', ii: 'm9', iii: 'm7', IV: 'maj9', V: 'dom9', vi: 'm9', bVI: 'maj7' },
    synth: { I: 'madd9', III: 'M', iv: 'm7', V: 'M', VI: 'maj7', VII: 'add9', bII: 'M' },
  };
  const CHENG = { major: ['vi', 'IV', 'ii', 'iii'], minor: ['VI', 'iv', 'III', 'VII'] };
  const ZHUAN2 = { major: 'bVI', minor: 'bII' };
  const SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
  function chordOf(name) {
    const root = DEG[mode][name];
    const q = (COLOR[style] && COLOR[style][name]) || (mode === 'minor' ? (name === 'I' || name === 'iv' ? 'm' : 'M') : 'M');
    return { name, root, q, iv: QUAL[q] };
  }
  function progression(roles) {
    let k = 0, z = 0;
    return roles.map((r) => chordOf(r === 'qi' || r === 'he' ? 'I' : r === 'zhuan' || r === 'zhuanhe' ? (z++ ? ZHUAN2[mode] : 'V') : CHENG[mode][k++ % 4]));
  }
  // 無根音的排列：三音、五音、七音、九音（低音負責根音），在 C4 附近，跟上一個和弦移動最少
  function voicing(ch, prev) {
    let pcs = ch.iv.slice(1).map((x) => (x + ch.root) % 12);
    if (pcs.length < 3) pcs = ch.iv.map((x) => (x + ch.root) % 12);
    const cands = [];
    for (let rot = 0; rot < pcs.length; rot++) {
      const order = pcs.slice(rot).concat(pcs.slice(0, rot));
      let base = key - 12 + order[0]; while (base < key - 7) base += 12; while (base > key + 5) base -= 12;
      const v = [base]; order.slice(1).forEach((pc) => { let n = key - 12 + pc; while (n <= v[v.length - 1]) n += 12; v.push(n); });
      cands.push(v);
    }
    let best = cands[0], bd = 1e9;
    cands.forEach((v) => {
      const top = v[v.length - 1];
      const d = prev ? v.reduce((a, n) => a + Math.min(...prev.map((p) => Math.abs(p - n))), 0) + Math.abs(top - prev[prev.length - 1]) * 0.5 : Math.abs(v[0] - (key - 5));
      if (d < bd && top <= key + 16) { bd = d; best = v; }
    });
    return best;
  }

  // ---------- 旋律 ----------
  const RHYTHM = {
    lofi: [[[0, 3], [3, 1], [4, 2], [6, 6]], [[2, 2], [4, 2], [6, 2], [8, 6]], [[0, 2], [2, 2], [4, 4], [10, 2], [12, 4]], [[0, 6], [6, 2], [8, 4], [12, 4]]],
    citypop: [[[0, 2], [2, 1], [3, 3], [6, 2], [8, 4], [12, 2]], [[1, 2], [3, 2], [6, 2], [8, 2], [10, 6]], [[0, 3], [3, 3], [6, 2], [8, 3], [11, 5]], [[2, 2], [4, 1], [5, 3], [8, 4], [12, 4]]],
    synth: [[[0, 2], [2, 2], [4, 2], [6, 2], [8, 4], [12, 4]], [[0, 4], [4, 2], [6, 2], [8, 8]], [[0, 2], [2, 2], [4, 4], [8, 2], [10, 2], [12, 4]], [[0, 3], [3, 3], [6, 2], [8, 8]]],
  };
  function melodyFor(prog, roles, seed, motifSeed) {
    const r = IE.Proto2.rng(seed), rm = IE.Proto2.rng(motifSeed);
    const sc = SCALE[mode];
    const notes = []; for (let o = -1; o <= 3; o++) sc.forEach((x) => notes.push(key + 12 * o + x));
    const near = (m) => notes.reduce((a, n) => (Math.abs(n - m) < Math.abs(a - m) ? n : a), notes[0]);
    const step = (m, k) => { const i = notes.indexOf(near(m)); return notes[Math.max(0, Math.min(notes.length - 1, i + k))]; };
    const pool = RHYTHM[style] || RHYTHM.lofi;
    const rA = pool[Math.floor(rm() * pool.length)], rB = pool[Math.floor(r() * pool.length)];
    const motif = [0, 1, -1, 2, -2, 1].map(() => Math.floor(rm() * 5) - 2);
    let last = key + 16;
    return prog.map((ch, bi) => {
      const rh = bi % 2 === 0 ? rA : rB;
      const tones = []; for (let o = 0; o <= 2; o++) ch.iv.forEach((x) => tones.push(key + ch.root + x + 12 * o));
      const colorful = tones.filter((n) => n >= key + 9 && n <= key + 26);
      // 強拍：離上一個音最近、而且是有色彩的和弦音（三音、七音、九音）
      const target = colorful.reduce((a, n) => { const w = (x) => Math.abs(x - last) - (([3, 4, 10, 11, 14].includes((x - key - ch.root + 24) % 12) ? 1.5 : 0)); return w(n) < w(a) ? n : a; }, colorful[0] || key + 12);
      const role = roles[bi];
      const out = rh.map(([pos, len], j) => {
        let m;
        if (j === 0) m = target;
        else if (pos % 4 === 0) { const near2 = tones.filter((n) => n >= key + 7 && n <= key + 26); m = near2.reduce((a, n) => (Math.abs(n - last) < Math.abs(a - last) ? n : a), near2[0]); }
        else m = step(last, motif[j % motif.length] === 0 ? 1 : Math.max(-2, Math.min(2, motif[j % motif.length])));
        if (role === 'zhuan' || role === 'zhuanhe') m = step(m, 1);
        last = m;
        return { pos, len, m, vel: pos % 4 === 0 ? 1 : 0.8 };
      });
      if (role === 'he') { const tonic = [key + 12, key + 24].reduce((a, n) => (Math.abs(n - last) < Math.abs(a - last) ? n : a)); const lastN = out[out.length - 1]; out.splice(out.length - 1, 1, { pos: lastN.pos, len: 16 - lastN.pos, m: tonic, vel: 1 }); last = tonic; }
      return out;
    });
  }

  // ---------- 樂器 ----------
  function env(gain, t, a, peak, d, sus, hold, rel) {
    const p = gain.gain;
    p.setValueAtTime(0.0001, t); p.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    p.exponentialRampToValueAtTime(Math.max(0.0002, peak * sus), t + a + d);
    p.setValueAtTime(Math.max(0.0002, peak * sus), t + Math.max(a + d, hold));
    p.exponentialRampToValueAtTime(0.0001, t + Math.max(a + d, hold) + rel);
  }
  // FM 電鋼琴：調變器比例 1（溫暖）＋ 比例 14 的短促「鐘聲」
  function epNote(t, m, dur, vel, bright) {
    const f = mtof(m), car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), tine = ctx.createOscillator(), tg = ctx.createGain();
    car.frequency.value = f; mod.frequency.value = f; tine.frequency.value = f * 14;
    const idx = f * (bright ? 2.6 : 1.7) * vel;
    mg.gain.setValueAtTime(idx, t); mg.gain.exponentialRampToValueAtTime(Math.max(1, idx * 0.18), t + 0.9);
    tg.gain.setValueAtTime(f * 1.4 * vel, t); tg.gain.exponentialRampToValueAtTime(1, t + 0.06);
    mod.connect(mg); mg.connect(car.frequency); tine.connect(tg); tg.connect(car.frequency);
    const a = ctx.createGain(); env(a, t, 0.004, 0.055 * vel, 1.1, 0.35, dur, 0.45);
    car.connect(a); a.connect(G.chorusIn); a.connect(G.keys); send(a, 'revIn', 0.18);
    const end = t + dur + 0.6; [car, mod, tine].forEach((o) => { o.start(t); o.stop(end); });
  }
  // 撥弦（Karplus-Strong）：預先算好每個音的聲音
  function ksBuffer(m, damp, bright) {
    const k = m + ':' + damp + ':' + bright;
    if (ksCache.has(k)) return ksCache.get(k);
    const sr = ctx.sampleRate, f = mtof(m), N = Math.max(2, Math.round(sr / f)), len = Math.floor(sr * 1.8);
    const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0), ring = new Float32Array(N);
    let lp = 0; for (let i = 0; i < N; i++) { lp += bright * ((Math.random() * 2 - 1) - lp); ring[i] = lp; }
    let p = 0;
    for (let i = 0; i < len; i++) { const nx = (p + 1) % N; const v = ring[p]; ring[p] = damp * 0.5 * (ring[p] + ring[nx]); d[i] = v; p = nx; }
    ksCache.set(k, buf);
    return buf;
  }
  function pluck(t, m, vel, opt) {
    const o = opt || {};
    const src = ctx.createBufferSource(); src.buffer = ksBuffer(m, o.damp || 0.996, o.bright || 0.55);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp || 3800;
    const g = ctx.createGain(); g.gain.value = (o.vol || 0.18) * vel;
    const p = ctx.createStereoPanner(); p.pan.value = o.pan || 0;
    src.connect(lp); lp.connect(g); g.connect(p); p.connect(G[o.bus || 'lead']); send(p, 'revIn', o.rev == null ? 0.25 : o.rev); send(p, 'delayIn', o.delay || 0);
    src.start(t); src.stop(t + 1.8);
  }
  // 超級鋸齒波的墊音
  function pad(t, ms, dur, vol, bright) {
    ms.forEach((m, i) => [-11, -4, 4, 11].forEach((det, j) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.6;
      lp.frequency.setValueAtTime(400, t); lp.frequency.linearRampToValueAtTime(bright ? 2600 : 1400, t + Math.min(1.2, dur * 0.6));
      const g = ctx.createGain(); env(g, t, Math.min(0.5, dur * 0.3), vol / 4, 0.4, 0.85, dur, 0.9);
      const p = ctx.createStereoPanner(); p.pan.value = (j - 1.5) * 0.35;
      o.connect(lp); lp.connect(g); g.connect(p); p.connect(G.chorusIn); p.connect(G.pad); send(p, 'revIn', 0.35);
      o.start(t); o.stop(t + dur + 1.2);
    }));
  }
  function bassNote(t, m, dur, vel) {
    const f = mtof(m), g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    if (style === 'lofi') {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f; const g2 = ctx.createGain(); g2.gain.value = 0.35;
      lp.frequency.value = 900; o.connect(lp); o2.connect(g2); g2.connect(lp);
      env(g, t, 0.01, 0.1 * vel, 0.3, 0.75, dur * 0.9, 0.12); [o, o2].forEach((x) => { x.start(t); x.stop(t + dur + 0.3); });
    } else {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = f; const sg = ctx.createGain(); sg.gain.value = 0.6;
      lp.Q.value = style === 'citypop' ? 7 : 4;
      lp.frequency.setValueAtTime(style === 'citypop' ? 2400 : 1600, t); lp.frequency.exponentialRampToValueAtTime(style === 'citypop' ? 380 : 300, t + 0.18);
      o.connect(lp); sub.connect(sg); sg.connect(g);
      env(g, t, 0.004, 0.1 * vel, 0.2, 0.6, dur * 0.85, 0.06); [o, sub].forEach((x) => { x.start(t); x.stop(t + dur + 0.2); });
    }
    lp.connect(g); g.connect(G.bass);
  }
  function lead(t, m, dur, vel, kind) {
    const f = mtof(m), g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    const oscs = [];
    if (kind === 'bell') { // FM 鐘：比例 3.5
      const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(); car.frequency.value = f; mod.frequency.value = f * 3.5;
      mg.gain.setValueAtTime(f * 3, t); mg.gain.exponentialRampToValueAtTime(1, t + 1.4); mod.connect(mg); mg.connect(car.frequency); oscs.push(car, mod);
      lp.frequency.value = 9000; car.connect(lp); env(g, t, 0.002, 0.08 * vel, 1.6, 0.0005, dur, 0.4);
    } else {
      const wave = kind === 'saw' ? 'sawtooth' : kind === 'square' ? 'square' : 'triangle';
      [-6, 6].forEach((det) => { const o = ctx.createOscillator(); o.type = wave; o.frequency.value = f; o.detune.value = kind === 'soft' ? det / 3 : det; o.connect(lp); oscs.push(o); });
      if (kind === 'soft') { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * 2; const og = ctx.createGain(); og.gain.value = 0.15; o.connect(og); og.connect(lp); oscs.push(o); }
      const vib = ctx.createOscillator(); vib.frequency.value = 5.2; const vg = ctx.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(dur, 0.35)); vib.connect(vg); oscs.forEach((o) => vg.connect(o.frequency)); vib.start(t); vib.stop(t + dur + 0.5);
      lp.frequency.setValueAtTime(kind === 'saw' ? 3800 : kind === 'square' ? 2600 : 2200, t); lp.Q.value = 1;
      env(g, t, kind === 'soft' ? 0.03 : 0.008, (kind === 'saw' ? 0.06 : kind === 'square' ? 0.048 : 0.095) * vel, 0.25, 0.8, dur, kind === 'soft' ? 0.25 : 0.15);
    }
    lp.connect(g);
    const p = ctx.createStereoPanner(); p.pan.value = 0.08; g.connect(p); p.connect(G.lead); send(p, 'revIn', 0.3); send(p, 'delayIn', style === 'synth' ? 0.28 : 0.14);
    oscs.forEach((o) => { o.start(t); o.stop(t + dur + 1.6); });
  }
  function voice(t, m, dur, vel, o) {
    o = o || {};
    const f = mtof(m), src = ctx.createOscillator(); src.type = 'sawtooth';
    src.frequency.setValueAtTime(f * (o.slide ? 0.94 : 1), t); if (o.slide) src.frequency.exponentialRampToValueAtTime(f, t + 0.12);
    const l = ctx.createOscillator(); l.frequency.value = o.vib || 5.3; const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * (o.depth || 0.011), t + 0.3); l.connect(lg); lg.connect(src.frequency);
    const g = ctx.createGain(); env(g, t, o.a || 0.07, (o.vol || 0.08) * vel, 0.2, 0.85, dur, 0.25);
    const vow = o.oo ? [[350, 9, 1], [800, 11, 0.5], [2300, 12, 0.1]] : [[730, 8, 1], [1090, 10, 0.55], [2440, 12, 0.16]];
    vow.forEach(([fr, q, gg]) => { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = q; const gn = ctx.createGain(); gn.gain.value = gg * 4.2; src.connect(bp); bp.connect(gn); gn.connect(g); });
    const breath = ctx.createBufferSource(); breath.buffer = noiseBuf; const bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 2800; bf.Q.value = 1; const bg = ctx.createGain(); env(bg, t, 0.04, 0.012 * vel, 0.2, 0.6, dur, 0.2); breath.connect(bf); bf.connect(bg); bg.connect(g);
    const p = ctx.createStereoPanner(); p.pan.value = o.pan || -0.05; g.connect(p); p.connect(G.vox); send(p, 'revIn', 0.45); send(p, 'delayIn', 0.12);
    const end = t + dur + 0.5; src.start(t); src.stop(end); l.start(t); l.stop(end); breath.start(t, Math.random()); breath.stop(end);
  }
  // ---------- 鼓 ----------
  function kick(t, v) {
    const o = ctx.createOscillator(), g = ctx.createGain(), sh = ctx.createWaveShaper(); sh.curve = curve(2.5);
    o.frequency.setValueAtTime(style === 'synth' ? 140 : 120, t); o.frequency.exponentialRampToValueAtTime(style === 'lofi' ? 48 : 44, t + 0.07);
    g.gain.setValueAtTime(0.5 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (style === 'synth' ? 0.5 : 0.38));
    o.connect(sh); sh.connect(g); g.connect(G.drums); o.start(t); o.stop(t + 0.55);
    noise(t, 0.008, 0.18 * v, 'highpass', 3500, 0, 'drums');
    if (style === 'synth') duckAt(t);
  }
  function snare(t, v, ghost) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle';
    o.frequency.setValueAtTime(205, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.06);
    g.gain.setValueAtTime(0.22 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    o.connect(g); g.connect(G.drums); o.start(t); o.stop(t + 0.13);
    const n = noise(t, ghost ? 0.08 : style === 'lofi' ? 0.2 : 0.16, (ghost ? 0.08 : 0.28) * v, 'bandpass', 1900, 0.8, 'drums');
    noise(t, ghost ? 0.05 : 0.12, (ghost ? 0.05 : 0.14) * v, 'highpass', 6000, 0, 'drums');
    if (style === 'synth' && !ghost) send(n, 'roomIn', 1.6); else send(n, 'revIn', ghost ? 0.05 : 0.15);
    if (style === 'citypop' && !ghost) clap(t, v * 0.7);
  }
  function clap(t, v) { [0, 0.01, 0.021].forEach((d) => noise(t + d, 0.025, 0.2 * v, 'bandpass', 1200, 1.4, 'drums')); const n = noise(t + 0.03, 0.15, 0.12 * v, 'bandpass', 1100, 1, 'drums'); send(n, 'revIn', 0.3); }
  // 808 式的鈸：六個不和諧的方波
  function metal(t, dur, v, open) {
    const g = ctx.createGain(), bp = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 10000; bp.Q.value = 0.8; hp.type = 'highpass'; hp.frequency.value = 7000;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [2, 3, 4.16, 5.43, 6.79, 8.21].forEach((r) => { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 40 * r * (open ? 1.01 : 1); o.connect(bp); o.start(t); o.stop(t + dur + 0.02); });
    bp.connect(hp); hp.connect(g); g.connect(G.drums);
    const p = ctx.createStereoPanner(); p.pan.value = 0.25; g.disconnect(); g.connect(p); p.connect(G.drums);
  }
  const hat = (t, v, open) => metal(t, open ? 0.32 : 0.05, 0.05 * v, open);
  function crash(t, v) { metal(t, 1.6, 0.04 * v, true); const n = noise(t, 1.8, 0.06 * v, 'highpass', 5000, 0, 'drums'); send(n, 'revIn', 0.3); }
  function tom(t, f, v) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(f * 1.7, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.12); g.gain.setValueAtTime(0.28 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.connect(g); g.connect(G.drums); send(g, 'revIn', 0.2); o.start(t); o.stop(t + 0.37); }
  const shaker = (t, v) => noise(t, 0.05, 0.04 * v, 'bandpass', 6500, 2, 'drums');
  function noise(t, dur, vol, type, freq, q, bus) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(G[bus || 'fx']);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.02);
    return g;
  }
  function duckAt(t) { const p = G.duck.gain; p.setValueAtTime(1, t); p.linearRampToValueAtTime(0.45, t + 0.01); p.linearRampToValueAtTime(1, t + beat() * 0.8); }
  function crackle(t, dur) { for (let i = 0; i < Math.round(dur * 10); i++) noise(t + Math.random() * dur, 0.003, 0.05 + Math.random() * 0.08, 'highpass', 2500, 0, 'fx'); noise(t, dur, 0.012, 'bandpass', 4000, 0.4, 'fx'); }
  function riser(t, dur) { const src = ctx.createBufferSource(); src.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(7000, t + dur); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05); src.connect(f); f.connect(g); g.connect(G.fx); send(g, 'revIn', 0.4); src.start(t); src.stop(t + dur + 0.1); }

  // ---------- 一小節 ----------
  const hum = () => (Math.random() - 0.5) * 0.012;
  function drumsBar(t, b, density, fill, body) {
    const s16 = b / 4, sw = style === 'lofi' ? s16 * 0.22 : 0;
    const at = (i) => t + i * s16 + (i % 2 === 1 ? sw : 0) + hum();
    if (density <= 0) { for (let i = 0; i < 16; i += 4) hat(at(i + 2), 0.5); return; }
    if (style === 'lofi') {
      kick(at(0), 0.95); kick(at(7), 0.6); if (density > 1) kick(at(10), 0.7);
      snare(at(4), 0.75); snare(at(12), 0.8); if (density > 1) { snare(at(7), 0.5, true); snare(at(15), 0.45, true); }
      for (let i = 0; i < 16; i += 2) hat(at(i), i % 4 === 0 ? 0.8 : 0.5, i === 14 && density > 1);
    } else if (style === 'citypop') {
      kick(at(0), 1); kick(at(6), 0.7); kick(at(8), 0.9); if (density > 1) kick(at(11), 0.6);
      snare(at(4), 0.85); snare(at(12), 0.9);
      for (let i = 0; i < 16; i++) hat(at(i), i % 4 === 0 ? 0.75 : i % 2 ? 0.35 : 0.55, false);
      if (density > 1) for (let i = 0; i < 16; i += 2) shaker(at(i + 1), 0.8);
    } else {
      for (let i = 0; i < 16; i += 4) kick(at(i), 1);
      snare(at(4), 0.9); snare(at(12), 0.95);
      for (let i = 2; i < 16; i += 4) hat(at(i), 0.8, true);
      if (density > 1) for (let i = 0; i < 16; i++) if (i % 4 !== 2) hat(at(i), 0.25, false);
    }
    if (body) { tom(at(13), 170, 0.8); tom(at(14), 135, 0.85); tom(at(15), 105, 0.9); }
    if (fill) { snare(at(12), 0.6); snare(at(13), 0.7); snare(at(14), 0.8); snare(at(15), 0.9); }
  }
  function bassBar(t, b, ch, next) {
    const s16 = b / 4, root = key - 24 + ch.root, nroot = next ? key - 24 + next.root : root;
    if (style === 'lofi') { bassNote(t, root, b * 2.6, 1); bassNote(t + s16 * 10, root + 7 > root + 12 ? root : root + 7, b * 0.9, 0.7); bassNote(t + s16 * 14, nroot + (nroot > root ? -1 : 1), b * 0.45, 0.7); }
    else if (style === 'citypop') { [[0, 2, 0, 1], [3, 1, 12, 0.7], [6, 2, 0, 0.9], [8, 2, 7, 0.9], [11, 1, 12, 0.6], [12, 2, 10, 0.8], [14, 2, (nroot - root) - 1, 0.7]].forEach(([p, l, iv, v]) => bassNote(t + p * s16, root + iv, l * s16 * 0.9, v)); }
    else { for (let i = 0; i < 16; i += 2) bassNote(t + i * s16, root + (i % 8 === 6 ? 12 : 0), s16 * 1.6, i % 4 === 0 ? 1 : 0.8); }
  }
  function keysBar(t, b, v) {
    const s16 = b / 4;
    if (style === 'lofi') { v.forEach((m, i) => epNote(t + i * 0.012, m, b * 3.6, 0.9, false)); }
    else if (style === 'citypop') { [0, 6, 10].forEach((p, k) => v.forEach((m, i) => epNote(t + p * s16 + i * 0.006, m, s16 * (k === 2 ? 5 : 3), 0.85, true))); }
    else { v.forEach((m, i) => epNote(t + i * 0.01, m, b * 0.9, 0.5, true)); }
  }
  function arpBar(t, b, v, kind) {
    const s16 = b / 4, notes = v.concat(v.map((m) => m + 12));
    for (let i = 0; i < 16; i++) {
      const m = notes[[0, 1, 2, 3, 4, 3, 2, 1][i % 8] % notes.length] + 12;
      if (kind === 'harp') { if (i % 2 === 0) pluck(t + i * s16, m, 0.7, { bright: 0.7, damp: 0.995, lp: 6000, pan: 0.3, rev: 0.35, delay: 0.1 }); }
      else lead(t + i * s16, m, s16 * 0.7, 0.55, 'square');
    }
  }
  // 一小節：layers 決定哪些聲部在這一小節出現
  function playBar(t, sec, i, o) {
    const b = beat(), sl = sec.slots[i], card = sl.card, med = card.medium, L = Object.assign({}, sec.layers, o || {});
    const density = sec.index === 0 && !L.beat ? (i === 0 ? 0 : 1) : 2;
    drumsBar(t, b, density, !!L.fill && i === sec.slots.length - 1, med === 'body');
    bassBar(t, b, sl.ch, sec.slots[i + 1] ? sec.slots[i + 1].ch : null);
    keysBar(t, b, sl.v);
    if (med === 'image' || L.pad) pad(t, sl.v.map((m) => m + 12), b * 4, med === 'image' ? 0.05 : 0.025, style !== 'lofi');
    const leadKind = sec.leadKind;
    if (sl.mel && (sec.index >= 1 || sec.hasSound || med === 'sound')) sl.mel.forEach((n) => lead(t + n.pos * b / 4 + hum(), n.m, n.len * b / 4 * 0.92, (med === 'sound' ? 1 : 0.7) * n.vel, med === 'sound' ? sec.featKind : leadKind));
    if (med === 'paper' && sl.mel) sl.mel.forEach((n) => voice(t + n.pos * b / 4, n.m - 12, n.len * b / 4 * 0.95, n.vel, { vol: 0.09 }));
    if (med === 'data' || L.arp) arpBar(t, b, sl.v, sec.theme === 'hope' || sec.theme === 'water' ? 'harp' : 'synth');
    if (L.choir) sl.v.slice(0, 3).forEach((m, j) => voice(t, m, b * 3.8, 0.8, { vol: 0.025, oo: true, a: 0.4, pan: j - 1, depth: 0.004 }));
    if (L.wood) { [2, 6, 10, 14].forEach((p) => noise(t + p * b / 4, 0.04, 0.12, 'bandpass', 1800, 6, 'drums')); }
    if (L.opera && sl.role === 'he') voice(t + b * 0.5, key + 19, b * 2.6, 1, { vol: 0.08, slide: true, vib: 6.4, depth: 0.028 });
    if (sec.theme === 'hope' && i % 2 === 0) lead(t + b * 2, sl.v[sl.v.length - 1] + 12, b * 1.5, 0.6, 'bell');
    if (style === 'lofi') crackle(t, b * 4);
    if (sl.role === 'zhuan' || sl.role === 'zhuanhe') riser(t + b * 2, b * 2);
    if (i === 0 && sec.index > 0) crash(t, 0.8);
    return b * 4;
  }

  // ---------- 一段（一筆）：所有聲部預先算好 ----------
  function section(o) {
    const prog = progression(o.roles);
    const mel = melodyFor(prog, o.roles, o.seed >>> 0, o.motif >>> 0);
    let prev = null;
    const slots = prog.map((ch, i) => { const v = voicing(ch, prev); prev = v; return { ch, v, mel: mel[i], card: o.cards[i], role: o.roles[i] }; });
    const theme = o.theme || 'warmth';
    const LEAD = { warmth: 'soft', hope: 'bell', water: 'soft', memory: 'soft', rebel: 'square', machine: 'square', guilt: 'soft', anger: 'saw', neon: 'saw', hunger: 'square' };
    const leadKind = style === 'synth' ? 'saw' : style === 'citypop' ? (LEAD[theme] === 'soft' ? 'square' : LEAD[theme]) : (LEAD[theme] === 'saw' ? 'soft' : LEAD[theme]);
    const feat = o.cards.find((c) => c.medium === 'sound');
    return { slots, index: o.index || 0, layers: o.layers || {}, theme, hasSound: !!feat, leadKind, featKind: feat ? (LEAD[feat.tags[0]] || leadKind) : leadKind };
  }

  // 計分時的「草稿」：兩拍；快轉時只播一下
  function playSlotNow(sec, i, fast) {
    if (!ensure() || S().muted) return;
    const t = ctx.currentTime + 0.04, b = beat(), sl = sec.slots[i], med = sl.card.medium;
    if (fast) { sl.v.forEach((m) => epNote(t, m, 0.25, 0.6, true)); return; }
    kick(t, 0.8); hat(t + b, 0.6); if (i % 2 === 1) snare(t + b, 0.6);
    bassNote(t, key - 24 + sl.ch.root, b * 1.8, 0.9);
    sl.v.forEach((m, j) => epNote(t + j * 0.01, m, b * 1.8, 0.8, style !== 'lofi'));
    if (med === 'sound' && sl.mel) sl.mel.filter((n) => n.pos < 8).forEach((n) => lead(t + n.pos * b / 4, n.m, n.len * b / 4 * 0.9, 0.9, sec.featKind));
    else if (med === 'paper' && sl.mel) sl.mel.filter((n) => n.pos < 8).forEach((n) => voice(t + n.pos * b / 4, n.m - 12, n.len * b / 4, 1, { vol: 0.09 }));
    else if (med === 'data') arpBar(t, b / 2, sl.v, 'synth');
    else if (med === 'image') pad(t, sl.v.map((m) => m + 12), b * 2, 0.05, true);
    else if (med === 'body') { tom(t + b * 0.5, 170, 0.8); tom(t + b * 0.75, 135, 0.8); tom(t + b, 105, 0.9); }
  }
  function playTailNow(sec) {
    if (!ensure() || S().muted) return;
    const t = ctx.currentTime + 0.04, b = beat(), I = sec.slots[sec.slots.length - 1];
    crash(t, 0.7); kick(t, 0.9); bassNote(t, key - 24 + I.ch.root, b * 3, 1); I.v.forEach((m, j) => epNote(t + j * 0.015, m, b * 3, 0.9, true));
    if (I.mel) lead(t, I.mel[I.mel.length - 1].m, b * 2.5, 0.8, sec.leadKind);
  }

  // ---------- 整首歌：按小節排程（提前 0.6 秒排下一小節） ----------
  function song(sections, onSlot, onEnd) {
    stop();
    if (!ensure()) return { duration: 0, stop() {} };
    applyStyle();
    const b = beat(), bar = b * 4;
    const plan = [];
    // 前奏：兩小節主和弦（lo-fi 的沙沙聲、synthwave 的上升音）
    const I0 = sections.length ? sections[0] : null;
    const introV = voicing(chordOf('I'), null);
    plan.push({ kind: 'intro', k: 0 }); plan.push({ kind: 'intro', k: 1 });
    sections.forEach((sec, si) => sec.slots.forEach((sl, i) => plan.push({ kind: 'bar', si, i, fill: i === sec.slots.length - 1 && si < sections.length - 1 })));
    plan.push({ kind: 'outro', k: 0 }); plan.push({ kind: 'outro', k: 1 });
    const t0 = ctx.currentTime + 0.2;
    let next = 0;
    const timers = [];
    const run = () => {
      const now = ctx.currentTime;
      while (next < plan.length && t0 + next * bar < now + 0.7) {
        const p = plan[next], t = t0 + next * bar;
        if (p.kind === 'intro') {
          introV.forEach((m, j) => epNote(t + j * 0.012, m, bar * 0.95, 0.85, style !== 'lofi'));
          bassNote(t, key - 24, bar * 0.9, 0.8);
          if (p.k === 1) drumsBar(t, b, style === 'lofi' ? 1 : 0, false, false); else for (let i = 0; i < 4; i++) hat(t + i * b, 0.4);
          if (style === 'lofi') crackle(t, bar);
          if (p.k === 1 && style !== 'lofi') riser(t, bar);
        } else if (p.kind === 'bar') {
          const sec = sections[p.si];
          playBar(t, sec, p.i, { fill: p.fill, pad: sec.layers.pad || p.si === sections.length - 1, beat: sec.layers.beat || p.si > 0 });
          const si = p.si, ii = p.i;
          timers.push(setTimeout(() => onSlot && onSlot(si, ii), Math.max(0, (t - ctx.currentTime) * 1000)));
        } else {
          // 尾聲：主和弦長音、旋律落在主音、鈸
          const v = voicing(chordOf('I'), null);
          if (p.k === 0) { crash(t, 0.9); kick(t, 1); v.forEach((m, j) => epNote(t + j * 0.02, m, bar * 1.9, 0.9, false)); pad(t, v.map((m) => m + 12), bar * 2, 0.04, false); bassNote(t, key - 24, bar * 1.8, 0.9); lead(t + b, key + 12, bar * 1.4, 0.8, I0 ? I0.leadKind : 'soft'); }
          if (style === 'lofi') crackle(t, bar);
        }
        next++;
      }
      if (next >= plan.length) { clearInterval(iv); }
    };
    const iv = setInterval(run, 100);
    run();
    const dur = plan.length * bar + 2.5;
    const handle = { duration: dur, stop() { clearInterval(iv); timers.forEach(clearTimeout); } };
    timers.push(setTimeout(() => { if (scheduler === handle) scheduler = null; if (onEnd) onEnd(); }, dur * 1000));
    scheduler = handle;
    return handle;
  }
  function stop() {
    if (scheduler) { scheduler.stop(); scheduler = null; }
    if (G && ctx) { const t = ctx.currentTime, p = G.pre.gain; p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); p.linearRampToValueAtTime(0.0001, t + 0.2); p.linearRampToValueAtTime(0.9, t + 0.6); }
  }
  function setNight(o) { key = o.key; mode = DEG[o.mode] ? o.mode : 'major'; bpm = o.bpm || 100; style = o.style || 'lofi'; if (G) applyStyle(); }
  // 測試：OfflineAudioContext 輸出整首歌（不經排程器）
  function offline(c) {
    build(c, c.destination);
    return { songAt(sections) { const b = beat(), bar = b * 4; let t = 0.1; sections.forEach((sec, si) => sec.slots.forEach((sl, i) => { playBar(t, sec, i, { fill: i === sec.slots.length - 1, beat: si > 0 }); t += bar; })); return t; } };
  }

  IE.Music = { _G: () => G, setNight, section, playSlotNow, playTailNow, song, stop, progression, offline, beat: () => beat(), slotDur: () => beat() * 2, ensure: () => !!ensure() };
})(typeof window !== 'undefined' ? window : globalThis);
