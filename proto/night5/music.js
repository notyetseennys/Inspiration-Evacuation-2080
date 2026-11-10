// 創作之夜第五版的歌：用製作人的 Flow Music 分軌，按起承轉合編成「玩家的歌」（做法同 tools/music-night-preview.py）。
// - 母曲（base）是那一晚的樂隊：起承轉合決定和弦功能，在母曲裏找一條盡量連續的小節路徑。
// - 層：卡的媒材決定哪件樂器出場（聲 = 那種情緒的主旋律、紙 = 人聲、身 = 敲擊、數 = 琶音、影 = 弦樂），按和弦配對整句。
// - 選牌時母曲隔着牆（低通）做背景；計分時每張素材奏半小節，樂隊逐層加入；收工後播放完整的歌。
// 對外的介面和第四版的 music.js 相同。分軌用到才下載和解碼，最多留 8 條層在記憶體。
(function (root) {
  'use strict';
  const IE = root.IE = root.IE || {};
  const S = () => IE.SfxProto || IE.Sfx || {};
  const M = () => IE.MUSIC || { styles: {}, base: 'music/' };
  const QUALS = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], sus4: [0, 5, 7], dim: [0, 3, 6] };
  const LAYER = { sound: (c) => ['lead-' + c.tags[0], 'other'], paper: () => ['vocal', 'vocals'], body: () => ['perc', null], data: () => ['arp', 'other'], image: () => ['strings', 'other'] };
  const GAIN = { other: 1.0, vocals: 0.95, drums: 0.6 };
  let ctx = null, out = null, bandBus = null, layerBus = null, bedBus = null, bedLP = null;
  let style = 'lofi', used = new Set(), cursor = 0, live = [], bedTimer = null, bedOn = false, bedNext = 0;

  function ensure() {
    const s = S(); const c = s.ctx && s.ctx();
    if (!c) return null;
    if (c !== ctx) {
      ctx = c;
      out = ctx.createGain(); out.gain.value = 0.9; out.connect(s.bus ? s.bus() : ctx.destination);
      bandBus = ctx.createGain(); bandBus.gain.value = 0.8; bandBus.connect(out);
      layerBus = ctx.createGain(); layerBus.gain.value = 1.0; layerBus.connect(out);
      bedLP = ctx.createBiquadFilter(); bedLP.type = 'lowpass'; bedLP.frequency.value = 850; bedLP.connect(out);
      bedBus = ctx.createGain(); bedBus.gain.value = 0; bedBus.connect(bedLP);
    }
    return ctx;
  }
  const st = () => M().styles[style] || null;
  const songOf = (name) => { const s = st(); return s && s.songs[name] ? s.songs[name] : null; };
  const barLen = () => (st() ? st().bar : 2.4);

  // ---------- 分軌的下載和解碼 ----------
  const bufs = new Map();
  function loadFile(file, keep) {
    if (!file || !ensure()) return Promise.resolve(null);
    let o = bufs.get(file);
    if (!o) {
      o = { buf: null, keep: !!keep, t: 0 };
      o.p = fetch((M().base || 'music/') + file).then((r) => r.arrayBuffer()).then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
        .then((b) => { o.buf = b; return b; }).catch(() => { bufs.delete(file); return null; });
      bufs.set(file, o);
    }
    o.t = Date.now(); if (keep) o.keep = true;
    // 層最多留 8 條
    const loose = [...bufs.entries()].filter((e) => !e[1].keep && e[1].buf).sort((a, b) => a[1].t - b[1].t);
    while (loose.length > 8) bufs.delete(loose.shift()[0]);
    return o.p;
  }
  const bufOf = (file) => { const o = bufs.get(file); if (o) o.t = Date.now(); return o && o.buf; };
  const fileOf = (song, stem) => { const s = songOf(song); return s ? s.stems[stem] : null; };
  const stemOf = (song, stem) => { const s = songOf(song); if (!s) return null; return stem && s.stems[stem] ? stem : Object.keys(s.stems)[0]; };
  function loadBand() { return Promise.all(['drums', 'bass', 'other'].map((s) => loadFile(fileOf('base', s), true))); }

  // ---------- 和弦 ----------
  const pcs = (b) => new Set((QUALS[b.q] || QUALS['']).map((i) => (b.r + i) % 12));
  function compat(a, b) { const A = pcs(a), B = pcs(b); let n = 0; A.forEach((x) => { if (B.has(x)) n++; }); return n / (A.size + B.size - n) + (a.r === b.r ? 0.25 : 0); }
  const isZ = (r) => r === 'zhuan' || r === 'zhuanhe';
  function fnOk(bar, role) {
    if (role === 'qi' || role === 'he') return bar.ro === 'I';
    if (isZ(role)) return bar.ro === 'V';
    return bar.ro === 'ii' || bar.ro === 'iii' || bar.ro === 'vi' || bar.ro === 'IV';
  }
  // 母曲的路徑：連續的小節最好，「和弦轉換相同」的跳接次之
  function bandPath(roles) {
    const song = songOf('base'); if (!song) return roles.map(() => null);
    const all = song.bars.map((b, i) => Object.assign({ i }, b)).filter((b) => b.l.other && b.l.drums);
    const bars = all.length ? all : song.bars.map((b, i) => Object.assign({ i }, b));
    const cands = roles.map((r) => { const c = bars.filter((b) => fnOk(b, r)); return c.length ? c : bars; });
    let cost = cands[0].map(() => 0); const back = [cands[0].map(() => -1)];
    for (let j = 1; j < roles.length; j++) {
      const row = [], brow = [];
      cands[j].forEach((c) => {
        let best = Infinity, bi = 0;
        cands[j - 1].forEach((p, pk) => {
          let t = 0;
          if (c.i !== p.i + 1) { const prev = song.bars[c.i - 1]; t = prev && prev.r === p.r && prev.q === p.q ? 0.35 : 1; if (c.i === p.i) t += 0.5; }
          if (cost[pk] + t < best) { best = cost[pk] + t; bi = pk; }
        });
        row.push(best); brow.push(bi);
      });
      cost = row; back.push(brow);
    }
    let k = cost.indexOf(Math.min.apply(null, cost)); const path = [];
    for (let j = roles.length - 1; j >= 0; j--) { path.unshift(cands[j][k]); k = back[j][k]; }
    return path;
  }
  // 層：同一種媒材連續幾張 = 原曲連續的一整句；按和弦相容度挑選，用過的小節扣分
  function layerBars(songName, stem, band, use) {
    const song = songOf(songName), L = band.length, outp = new Array(L).fill(null);
    if (!song) return outp;
    for (let j = 0; j < L;) {
      if (!use[j] || !band[j]) { j++; continue; }
      let k = j; while (k + 1 < L && use[k + 1] && band[k + 1]) k++;
      const n = k - j + 1; let best = -Infinity, bs = 0;
      for (let s = 0; s + n <= song.bars.length; s++) {
        let sc = 0;
        for (let q = 0; q < n; q++) { const lb = song.bars[s + q]; if (!lb.l[stem]) { sc -= 0.8; continue; } sc += compat(lb, band[j + q]) - (used.has(songName + ':' + (s + q)) ? 0.3 : 0); }
        if (sc > best) { best = sc; bs = s; }
      }
      for (let q = 0; q < n; q++) { const lb = song.bars[bs + q]; if (lb.l[stem] && (stem === 'drums' || compat(lb, band[j + q]) >= 0.45)) { outp[j + q] = { song: songName, stem, t: lb.t, i: bs + q }; used.add(songName + ':' + (bs + q)); } }
      j = k + 1;
    }
    return outp;
  }

  // ---------- 一段（一筆）----------
  function section(o) {
    const roles = o.roles.slice(), cards = o.cards;
    const band = bandPath(roles);
    const slots = cards.map((c, i) => ({ card: { id: c.id, name: c.name, medium: c.medium, tags: c.tags.slice() }, role: roles[i], band: band[i] ? { t: band[i].t, i: band[i].i } : null, layers: [] }));
    ['sound', 'paper', 'body', 'data', 'image'].forEach((med) => {
      // 聲：每種情緒有自己的主旋律，所以逐種情緒分開配
      const groups = {};
      cards.forEach((c, i) => { if (c.medium !== med) return; const q = LAYER[med](c); const key = q[0]; (groups[key] = groups[key] || { stem: q[1], use: cards.map(() => false) }).use[i] = true; });
      Object.keys(groups).forEach((name0) => {
        // 這種風格沒有那首歌（例如未有人聲）：用弦樂代替
        const name = songOf(name0) ? name0 : 'strings';
        const stem = stemOf(name, songOf(name0) ? groups[name0].stem : 'other'); if (!stem) return;
        layerBars(name, stem, band, groups[name0].use).forEach((lb, i) => { if (lb) slots[i].layers.push(lb); });
      });
    });
    return { style, slots, tail: roles[roles.length - 1] === 'he', index: o.index || 0 };
  }
  const filesOf = (sec) => { const f = new Set(); sec.slots.forEach((s) => s.layers.forEach((l) => f.add(fileOf(l.song, l.stem)))); return [...f].filter(Boolean); };
  // 計分之前先準備好這一筆要用的分軌（最多等 ms 毫秒）
  function prepare(sec, ms) {
    if (!ensure() || !sec) return Promise.resolve();
    return Promise.race([Promise.all([loadBand()].concat(filesOf(sec).map((f) => loadFile(f)))), new Promise((r) => setTimeout(r, ms || 3000))]);
  }

  function playBuf(file, tSrc, when, dur, gain, bus, tailFade) {
    const buf = bufOf(file); if (!buf || !ctx) return null;
    const pre = 0.012, post = tailFade || 0.07;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain();
    const t0 = Math.max(ctx.currentTime, when - pre), off = Math.max(0, tSrc - pre);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(gain, t0 + pre);
    g.gain.setValueAtTime(gain, when + dur); g.gain.linearRampToValueAtTime(0.0001, when + dur + post);
    src.connect(g); g.connect(bus);
    try { src.start(t0, off, dur + pre + post + 0.02); } catch (e) { return null; }
    live.push(src); src.onended = () => { const i = live.indexOf(src); if (i >= 0) live.splice(i, 1); };
    return src;
  }
  function playSlot(sec, i, when, dur, stems) {
    const sl = sec.slots[i]; if (!sl) return;
    if (sl.band) stems.forEach((s) => playBuf(fileOf('base', s), sl.band.t, when, dur, 1, bandBus));
    sl.layers.forEach((l) => playBuf(fileOf(l.song, l.stem), l.t, when, dur, GAIN[l.stem] || 1, layerBus));
  }
  const slotDur = () => barLen() / 2;
  // 計分：每張素材半小節；樂隊逐層加入（先和弦，再低音，再鼓）
  function playSlotNow(sec, i, fast) {
    if (!ensure() || S().muted) return;
    const dur = fast ? 0.28 : slotDur();
    const when = cursor > ctx.currentTime - 0.02 && cursor < ctx.currentTime + 0.25 ? cursor : ctx.currentTime + 0.05;
    playSlot(sec, i, when, dur, i === 0 ? ['other'] : i === 1 ? ['other', 'bass'] : ['other', 'bass', 'drums']);
    cursor = when + dur;
  }
  function impact(when, g0) {
    const n = Math.floor(ctx.sampleRate * 1.4), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) { const t = i / ctx.sampleRate; d[i] = Math.sin(2 * Math.PI * (42 + 40 * Math.exp(-t / 0.05)) * t) * Math.exp(-t / 0.33) + (Math.random() * 2 - 1) * 0.22 * Math.exp(-t / 0.5); }
    const s = ctx.createBufferSource(); s.buffer = b; const g = ctx.createGain(); g.gain.value = g0 || 0.32; s.connect(g); g.connect(out); s.start(when); live.push(s);
  }
  function applause(when, dur) {
    const n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let k = 0; k < dur * 55; k++) { const at = Math.floor(Math.random() * (n - 1200)), amp = 0.25 + Math.random() * 0.5; for (let i = 0; i < 900; i++) d[at + i] += (Math.random() * 2 - 1) * amp * Math.exp(-i / 260); } }
    const s = ctx.createBufferSource(); s.buffer = b; const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when); g.gain.linearRampToValueAtTime(0.3, when + 0.4); g.gain.setValueAtTime(0.3, when + dur - 1.6); g.gain.linearRampToValueAtTime(0.0001, when + dur);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900; s.connect(hp); hp.connect(g); g.connect(out); s.start(when); live.push(s);
  }
  function playTailNow(sec) { if (!ensure() || S().muted) return; impact(ctx.currentTime + 0.03); }

  // ---------- 完整的歌：前奏 → 每筆一段 → 結尾 → 掌聲 ----------
  function song(sections, onSlot, onEnd) {
    stop();
    const h = { duration: 0, stopped: false, timers: [], stop() { this.stopped = true; this.timers.forEach(clearTimeout); stopSources(); } };
    if (!ensure() || !sections || !sections.length) { if (onEnd) setTimeout(onEnd, 0); return h; }
    const files = new Set(); sections.forEach((s) => filesOf(s).forEach((f) => files.add(f)));
    const bar = barLen();
    h.duration = (2 + sections.reduce((a, s) => a + s.slots.length, 0) + 2) * bar + 4;
    Promise.all([loadBand()].concat([...files].map((f) => loadFile(f)))).then(() => {
      if (h.stopped) return;
      duckBed(true);
      let t = ctx.currentTime + 0.25; const t00 = t;
      const intro = bandPath(['cheng', 'zhuan']);
      intro.forEach((b, i) => { if (b) playBuf(fileOf('base', 'other'), b.t, t + i * bar, bar, 0.9, bandBus); });
      t += 2 * bar;
      sections.forEach((sec, si) => {
        sec.slots.forEach((sl, bi) => {
          playSlot(sec, bi, t, bar, ['other', 'bass', 'drums']);
          h.timers.push(setTimeout(() => { if (!h.stopped && onSlot) onSlot(si, bi); }, (t - t00) * 1000 + 250));
          t += bar;
        });
        if (sec.tail) impact(t - bar, 0.2);
      });
      const end = bandPath(['he'])[0];
      if (end) { playBuf(fileOf('base', 'other'), end.t, t, bar, 1, bandBus, 1.2); playBuf(fileOf('base', 'bass'), end.t, t, bar, 1, bandBus, 1.2); playBuf(fileOf('base', 'drums'), end.t, t, bar * 0.25, 1, bandBus, 0.3); }
      impact(t, 0.28); applause(t + bar * 0.8, 4.5);
      h.timers.push(setTimeout(() => { if (!h.stopped) { duckBed(false); if (onEnd) onEnd(); } }, (t - t00 + bar + 4.6) * 1000));
    });
    scheduler = h;
    return h;
  }
  let scheduler = null;
  function stopSources() { live.splice(0).forEach((s) => { try { s.stop(); } catch (e) { /* 已經停了 */ } }); }
  function stop() { if (scheduler) { const s = scheduler; scheduler = null; s.stop(); } else stopSources(); cursor = 0; if (bedOn) { bedNext = 0; duckBed(false); } }

  // ---------- 背景：母曲隔着牆 ----------
  function bedTick() {
    if (!bedOn || !ctx || S().muted) return;
    const song0 = songOf('base'); if (!song0) return;
    const n = Math.min(8, song0.bars.length), bar = barLen();
    // 取一段連續而且有聲的八小節
    let s0 = 0; for (let s = 0; s + n <= song0.bars.length; s++) { if (song0.bars.slice(s, s + n).every((b) => b.l.other)) { s0 = s; break; } }
    if (bedNext < ctx.currentTime + 0.6) {
      const when = Math.max(ctx.currentTime + 0.1, bedNext || 0);
      ['drums', 'bass', 'other'].forEach((sname) => { if (bufOf(fileOf('base', sname))) playBuf(fileOf('base', sname), song0.bars[s0].t, when, n * bar, 1, bedBus, 0.05); });
      bedNext = when + n * bar;
    }
  }
  function duckBed(on) { if (!ctx || !bedBus) return; const g = bedBus.gain, t = ctx.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(on || !bedOn || S().muted ? 0.0001 : 0.5, t + 0.5); }
  function bed(on) {
    bedOn = !!on;
    if (!ensure()) return;
    bedOn = false; duckBed(true); // 第五版修訂：選牌和計分時只用遊戲的配樂，分軌的歌留到收工後才播
  }
  function setNight(o) {
    const next = (o && o.style) || 'lofi';
    if (next !== style) { stopSources(); bufs.clear(); bedNext = 0; }
    style = next; used = new Set(); cursor = 0;
  }

  IE.Music = { setNight, section, playSlotNow, playTailNow, song, stop, slotDur, ensure, prepare, bed, duckBed, beat: () => barLen() / 4, progression: bandPath, _dbg: () => ({ bufs: [...bufs.entries()].filter((e) => e[1].buf).length, live: live.length, style, bed: bedOn }) };
})(typeof window !== 'undefined' ? window : globalThis);
