// 創作之夜原型第四版：畫布是一幅會動的浮城像素插畫（cinemagraph）。
// 一晚四筆，一筆一層：天空和遠景 → 中景 → 主角 → 氣氛；每張素材按它的情緒在那一層畫一樣東西，轉的那張特別大、合的那張點亮燈。
// 第四版的重點：
//   光：所有燈、窗、招牌、月亮的光暈畫在一張「光」的圖層，以 screen 疊上去（柔和、會照亮周圍）；
//   遠近：遠景混入天色、地平線有霧；建築有受光面和背光面；
//   細節：唐樓有冷氣機、晾衫竹、水缸、天線、天台招牌；人物是像素小人，有輪廓光；
//   會動：雨、霓虹閃爍、水面的倒影和波光、煙和蒸氣上升、星星閃、雲慢慢飄、船輕輕搖。
// 重播（分享連結）用同一個種子，畫出同一幅畫。
(function (root) {
  'use strict';
  const IE = root.IE = root.IE || {};
  const W = 320, H = 200, HZ = 118;
  let r = Math.random, layers = null, mood = null, sketch = true, dyn = null;
  const targets = new Set();
  let raf = 0, t0 = 0;
  const D = () => IE.DATA;
  const LAYERS = ['sky', 'far', 'mid', 'focal', 'atmo', 'light'];

  // ---------- 顏色 ----------
  function rgb(hex) { const h = hex.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function mix(h1, h2, k) { const a = rgb(h1), b = rgb(h2); return '#' + a.map((v, i) => Math.max(0, Math.min(255, Math.round(v + (b[i] - v) * k))).toString(16).padStart(2, '0')).join(''); }
  const rgba = (hex, a) => { const c = rgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  const MOODS = {
    warmth: { top: '#2a1c3d', mid: '#7e4560', hz: '#ffae6b', water: '#2c2240', light: '#ffcf7a', accent: '#ff8a5b', haze: '#c96a6a', night: false },
    hope: { top: '#1b3463', mid: '#6e9ad0', hz: '#ffe3a0', water: '#20406a', light: '#fff2c4', accent: '#ffd36b', haze: '#a9c3e0', night: false },
    water: { top: '#141c2a', mid: '#2f4458', hz: '#6f8aa0', water: '#132235', light: '#bfe3ff', accent: '#37c3d6', haze: '#4d6478', night: true, rain: true },
    memory: { top: '#352a26', mid: '#77604e', hz: '#d6b688', water: '#362c26', light: '#ffd9a0', accent: '#e8c25a', haze: '#a58a6c', night: false, sepia: true },
    rebel: { top: '#110b22', mid: '#2b1a4b', hz: '#77408c', water: '#140e28', light: '#ffd36b', accent: '#ff4fb4', haze: '#4a2d66', night: true },
    machine: { top: '#152023', mid: '#334647', hz: '#86a097', water: '#152122', light: '#b8fff0', accent: '#37c3d6', haze: '#56706c', night: true, smog: true },
    guilt: { top: '#0d1016', mid: '#212631', hz: '#474e5d', water: '#0f131a', light: '#c9d2e3', accent: '#8d99b4', haze: '#2f3542', night: true, cloud: true },
    anger: { top: '#24080b', mid: '#6a1a1a', hz: '#ff6a3d', water: '#250d11', light: '#ffb36b', accent: '#ff4d5e', haze: '#8a2a1e', night: true },
    neon: { top: '#09091c', mid: '#24134d', hz: '#d248a3', water: '#0c0a24', light: '#ff9be0', accent: '#ff4fb4', haze: '#4b1e64', night: true },
    hunger: { top: '#1a1a20', mid: '#383535', hz: '#8c7e6d', water: '#1c1a20', light: '#ffe0a8', accent: '#ff9e4f', haze: '#544c45', night: true },
  };
  const col = (t) => D().TAGS[t].color;
  function mk() { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return { c, g }; }

  // ---------- 畫布、動畫 ----------
  function init(canvas) { canvas.width = W; canvas.height = H; canvas.getContext('2d').imageSmoothingEnabled = false; targets.clear(); targets.add(canvas); loop(); }
  function attach(canvas) { canvas.width = W; canvas.height = H; canvas.getContext('2d').imageSmoothingEnabled = false; targets.add(canvas); loop(); }
  function detach(canvas) { targets.delete(canvas); }
  function blank(seed) {
    r = IE.Proto2.rng(seed || 7);
    layers = {}; LAYERS.forEach((k) => { layers[k] = mk(); });
    layers.water = mk();
    mood = null; sketch = true;
    dyn = { rain: 0, neons: [], smokes: [], stars: [], lamps: [], boats: [], fog: 0, embers: 0 };
    frame(true);
  }
  function loop() {
    if (raf) return;
    t0 = performance.now();
    let last = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 50) return; // 約 20 格／秒，像素畫不用太快
      last = now;
      frame(false, (now - t0) / 1000);
    };
    raf = requestAnimationFrame(tick);
  }
  const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 一格：靜態圖層 + 會動的東西
  function frame(still, t) {
    if (!layers) return;
    t = still || reduced ? 0 : t || 0;
    targets.forEach((cv) => {
      const cx = cv.getContext('2d');
      if (sketch) { drawSketch(cx); return; }
      cx.globalCompositeOperation = 'source-over';
      cx.drawImage(layers.sky.c, 0, 0);
      drawStars(cx, t);
      cx.drawImage(layers.far.c, 0, 0);
      drawWater(cx, t);
      cx.drawImage(layers.mid.c, 0, 0);
      drawBoats(cx, t);
      cx.drawImage(layers.focal.c, 0, 0);
      cx.drawImage(layers.atmo.c, 0, 0);
      drawSmoke(cx, t);
      // 光：screen 疊上去；霓虹閃爍
      cx.globalCompositeOperation = 'screen';
      cx.drawImage(layers.light.c, 0, 0);
      drawNeonFlicker(cx, t);
      cx.globalCompositeOperation = 'source-over';
      drawRain(cx, t);
      drawEmbers(cx, t);
      if (mood && mood.sepia) { cx.fillStyle = 'rgba(112,72,30,0.08)'; cx.fillRect(0, 0, W, H); }
      vignette(cx);
    });
  }
  function vignette(cx) { for (let k = 0; k < 10; k++) { cx.fillStyle = 'rgba(0,0,0,' + (0.035 - k * 0.003) + ')'; cx.fillRect(k, k, W - 2 * k, 1); cx.fillRect(k, H - 1 - k, W - 2 * k, 1); cx.fillRect(k, k, 1, H - 2 * k); cx.fillRect(W - 1 - k, k, 1, H - 2 * k); } }
  function drawSketch(g) {
    g.fillStyle = '#efe5cf'; g.fillRect(0, 0, W, H);
    const rr = IE.Proto2.rng(99);
    for (let i = 0; i < 2600; i++) { g.fillStyle = rr() < 0.55 ? 'rgba(120,96,60,0.07)' : 'rgba(255,255,255,0.28)'; g.fillRect((rr() * W) | 0, (rr() * H) | 0, 1, 1); }
    g.fillStyle = 'rgba(70,60,50,0.25)';
    for (let x = 6; x < W - 6; x += 2) g.fillRect(x, HZ + ((x * 7) % 3 === 0 ? 1 : 0), 1, 1);
    for (let x = 30; x < 290; x += 3) { const h = 18 + Math.round(Math.abs(Math.sin(x * 0.07)) * 30 + Math.abs(Math.sin(x * 0.019)) * 18); g.fillRect(x, HZ - h, 1, 1); }
    g.fillStyle = 'rgba(70,60,50,0.12)';
    for (let y = 8; y < H - 8; y += 3) { g.fillRect((W / 3) | 0, y, 1, 1); g.fillRect(((2 * W) / 3) | 0, y, 1, 1); }
  }
  // 海：底色、倒影（逐行左右搖晃，跟時間走）、波光
  const reflSrc = (() => { let c = null; return () => c || (c = mk()); })();
  function drawWater(cx, t) {
    const M = mood;
    for (let y = HZ; y < H; y++) { const k = (y - HZ) / (H - HZ); cx.fillStyle = mix(mix(M.water, M.hz, 0.22 * (1 - k)), '#04050a', k * 0.5); cx.fillRect(0, y, W, 1); }
    const src = reflSrc();
    src.g.clearRect(0, 0, W, H);
    src.g.drawImage(layers.sky.c, 0, 0); src.g.drawImage(layers.far.c, 0, 0); src.g.drawImage(layers.mid.c, 0, 0);
    src.g.globalCompositeOperation = 'screen'; src.g.drawImage(layers.light.c, 0, 0); src.g.globalCompositeOperation = 'source-over';
    cx.globalAlpha = 0.45;
    for (let y = HZ; y < H; y++) {
      const sy = HZ - (y - HZ) * 1.08 - 1;
      if (sy < 0) break;
      const off = Math.round(Math.sin(y * 0.85 + t * 2.2) * (1 + (y - HZ) * 0.05));
      cx.drawImage(src.c, 0, sy | 0, W, 1, off, y, W, 1);
    }
    cx.globalAlpha = 1;
    // 波光：燈下面的長倒影，一閃一閃
    dyn.lamps.forEach((l, i) => {
      for (let y = HZ + 2; y < Math.min(H, HZ + 60); y += 2) {
        const a = 0.22 * (1 - (y - HZ) / 60) * (0.6 + 0.4 * Math.sin(t * 3 + y * 0.7 + i));
        const w = 2 + ((y - HZ) >> 3);
        cx.fillStyle = rgba(l.c, Math.max(0, a)); cx.fillRect(Math.round(l.x - w / 2 + Math.sin(y + t * 2) * 1.5), y, w, 1);
      }
    });
    for (let y = HZ + 3; y < H; y += 3 + ((y * 7) % 4)) for (let x = (y * 13) % 17; x < W; x += 9 + ((x + y) % 13)) {
      const a = 0.06 + 0.06 * Math.sin(t * 1.7 + x * 0.3 + y);
      cx.fillStyle = rgba(M.light, Math.max(0, a)); cx.fillRect((x + Math.round(t * 4)) % W, y, 3 + (x % 4), 1);
    }
  }
  function drawStars(cx, t) { dyn.stars.forEach((s) => { const a = s.a * (0.55 + 0.45 * Math.sin(t * s.sp + s.ph)); cx.fillStyle = 'rgba(255,255,255,' + Math.max(0, a).toFixed(2) + ')'; cx.fillRect(s.x, s.y, 1, 1); if (s.big && a > 0.6) { cx.fillRect(s.x - 1, s.y, 3, 1); cx.fillRect(s.x, s.y - 1, 1, 3); } }); }
  function drawSmoke(cx, t) {
    dyn.smokes.forEach((s, i) => {
      for (let k = 0; k < 14; k++) {
        const life = ((t * s.speed + k / 14 + i * 0.37) % 1);
        const y = s.y - life * s.h, x = s.x + Math.sin(life * 6 + i + t) * 3 * life + life * s.drift;
        const rad = 1 + life * s.size;
        cx.fillStyle = rgba(s.c, (1 - life) * s.a);
        cx.beginPath(); cx.arc(x, y, rad, 0, Math.PI * 2); cx.fill();
      }
    });
  }
  function drawNeonFlicker(cx, t) {
    dyn.neons.forEach((n, i) => {
      const f = Math.sin(t * 13 + n.ph) > 0.92 || Math.sin(t * 2.3 + i) > 0.985 ? 0.25 : 1;
      const grd = cx.createRadialGradient(n.x, n.y, 1, n.x, n.y, n.r);
      grd.addColorStop(0, rgba(n.c, 0.28 * f)); grd.addColorStop(1, rgba(n.c, 0));
      cx.fillStyle = grd; cx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    });
  }
  function drawRain(cx, t) {
    if (!dyn.rain) return;
    const n = Math.round(160 * dyn.rain);
    cx.fillStyle = 'rgba(200,225,255,0.32)';
    for (let i = 0; i < n; i++) {
      const sx = (i * 73.13) % W, sp = 180 + (i % 7) * 20;
      const y = ((i * 37.7 + t * sp) % (H + 20)) - 10, x = (sx - y * 0.25 + W) % W;
      cx.fillRect(Math.round(x), Math.round(y), 1, 4);
    }
    // 水面的雨點
    for (let i = 0; i < 18 * dyn.rain; i++) { const x = (i * 97.3 + Math.floor(t * 6) * 31) % W, y = HZ + 6 + ((i * 53.1) % (H - HZ - 8)); cx.fillStyle = 'rgba(200,225,255,0.25)'; cx.fillRect(x | 0, y | 0, 3, 1); }
  }
  function drawEmbers(cx, t) {
    if (!dyn.embers) return;
    for (let i = 0; i < 26 * dyn.embers; i++) {
      const life = ((t * 0.18 + i * 0.137) % 1), x = (i * 61.7 + Math.sin(t + i) * 8) % W, y = H - life * 150;
      cx.fillStyle = 'rgba(255,' + (140 + (i % 5) * 20) + ',60,' + (0.9 * (1 - life)).toFixed(2) + ')'; cx.fillRect(x | 0, y | 0, 1, 1);
    }
  }
  function drawBoats(cx, t) { dyn.boats.forEach((b, i) => { const dy = Math.round(Math.sin(t * 1.4 + i * 2) * 1); boat(cx, b.x, b.y + dy, b.s, b.light, true); }); }

  // ---------- 畫圖工具 ----------
  const P = {
    rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
    disc(g, x, y, rad, c) { g.fillStyle = c; for (let dy = -rad; dy <= rad; dy++) { const w = Math.round(Math.sqrt(rad * rad - dy * dy)); g.fillRect(Math.round(x - w), Math.round(y + dy), 2 * w + 1, 1); } },
    line(g, x0, y0, x1, y1, c, w) { g.fillStyle = c; const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; for (let i = 0; i <= n; i++) { const t = n ? i / n : 0; g.fillRect(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), w || 1, w || 1); } },
  };
  // 柔和的光（畫在光的圖層）
  function light(x, y, rad, c, a) {
    const g = layers.light.g;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, rgba(c, a == null ? 0.5 : a)); grd.addColorStop(0.35, rgba(c, (a == null ? 0.5 : a) * 0.35)); grd.addColorStop(1, rgba(c, 0));
    g.fillStyle = grd; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const gauss = () => (r() + r() + r() - 1.5) / 1.5;

  // ---------- 天空（第一筆第一張）----------
  function paintSky(M) {
    const g = layers.sky.g;
    for (let y = 0; y <= HZ; y++) {
      const k = y / HZ;
      const c = k < 0.55 ? mix(M.top, M.mid, k / 0.55) : mix(M.mid, M.hz, (k - 0.55) / 0.45);
      g.fillStyle = c; g.fillRect(0, y, W, 1);
      // 漸層之間的抖動（像素畫的做法）
      if (k > 0.2 && y % 2 === 0) { g.fillStyle = rgba(k < 0.55 ? M.mid : M.hz, 0.28); for (let x = (y * 3) % 4; x < W; x += 4) g.fillRect(x, y, 1, 1); }
    }
    if (M.night) for (let i = 0; i < 80; i++) dyn.stars.push({ x: (r() * W) | 0, y: (r() * HZ * 0.62) | 0, a: 0.35 + r() * 0.6, sp: 1 + r() * 3, ph: r() * 6, big: r() < 0.08 });
    if (M.cloud || M.rain || M.smog) for (let i = 0; i < 8; i++) cloud(g, r() * W, 10 + r() * 50, 30 + r() * 60, mix(M.top, M.mid, 0.55), 0.6);
    // 地平線的霧
    for (let y = HZ - 34; y <= HZ; y++) { g.fillStyle = rgba(M.haze, 0.22 * (1 - (HZ - y) / 34)); g.fillRect(0, y, W, 1); }
    if (M.rain) dyn.rain = Math.max(dyn.rain, 0.6);
  }
  function cloud(g, x, y, w, c, a) { for (let i = 0; i < w / 4; i++) P.disc(g, x + (i / (w / 4) - 0.5) * w + gauss() * 3, y + gauss() * 2, 3 + ((r() * 5) | 0), rgba(c, a)); }
  // 遠景的浮城：受光面、背光面、窗、天線、高腳；混入天色（遠）
  function skyline(g, x0, x1, base, hmin, hmax, M, prob, far) {
    let x = x0;
    const body = mix(M.top, M.haze, far ? 0.35 : 0.12), shade = mix(body, '#000000', 0.25);
    while (x < x1) {
      const w = 8 + ((r() * 16) | 0), h = hmin + ((r() * (hmax - hmin)) | 0);
      P.rect(g, x, base - h, w, h, body); P.rect(g, x + Math.round(w * 0.65), base - h, Math.round(w * 0.35), h, shade);
      if (r() < 0.45) P.rect(g, x + (w >> 1), base - h - 5 - ((r() * 7) | 0), 1, 7, body);
      if (r() < 0.25) { P.rect(g, x + 2, base - h - 4, 5, 4, shade); }
      for (let yy = base - h + 3; yy < base - 3; yy += 4) for (let xx = x + 2; xx < x + w - 2; xx += 3) if (r() < prob) { const lc = r() < 0.15 ? M.accent : M.light; P.rect(g, xx, yy, 1, 2, rgba(lc, 0.55 + r() * 0.45)); if (r() < 0.08) light(xx, yy + 1, 6, lc, 0.25); }
      P.rect(g, x + 1, base, 1, 4, shade); P.rect(g, x + w - 2, base, 1, 4, shade);
      x += w + ((r() * 3) | 0);
    }
  }

  // ---------- 像素人物（輪廓光） ----------
  const SPR = {
    stand: ['..hhh..', '.hhhhh.', '.hssss.', '..sss..', '..ccc..', '.ccccc.', 'cc.c.cc', 'c.ccc.c', 's.ccc.s', '..ccc..', '..l.l..', '..l.l..', '..l.l..', '.kk.kk.'],
    sit: ['..hhh..', '.hhhhh.', '.hssss.', '..sss..', '..ccc..', '.ccccc.', 'cc.c.cc', '..cccc.', '..lllll', '......l', '......k'],
    child: ['.hhh.', 'hssss', '.sss.', '.ccc.', 'ccccc', '.ccc.', '.l.l.', 'kk.kk'],
    robot: ['....a.....', '....m.....', '.mmmmmmmm.', '.meemmeem.', '.mmmmmmmm.', '..mmmmmm..', 'mmmmmmmmmm', 'm.mmeemm.m', 'm.mmmmmm.m', 'm.mmmmmm.m', '..mm..mm..', '..mm..mm..', '.mmm..mmm.'],
    cat: ['k...k..', 'kk.kk..', 'kkkkk..', 'kekek..', '.kkkkkk', '.kkkkk.', '.k.k.k.'],
  };
  function sprite(g, name, x, y, pal, s, rim) {
    const rows = SPR[name], h = rows.length, w = rows[0].length, sc = Math.max(1, Math.round(s || 1));
    const x0 = Math.round(x - (w * sc) / 2), y0 = Math.round(y - h * sc);
    rows.forEach((row, j) => { for (let i = 0; i < w; i++) { const ch = row[i]; if (ch === '.' || !pal[ch]) continue; g.fillStyle = pal[ch]; g.fillRect(x0 + i * sc, y0 + j * sc, sc, sc); } });
    // 輪廓光：受光的一邊亮一點
    if (rim) rows.forEach((row, j) => { const i = rim > 0 ? row.search(/[^.][.]*$/) : row.search(/[^.]/); if (i >= 0 && row[i] !== '.') { g.fillStyle = rgba(mood.light, 0.55); g.fillRect(x0 + i * sc, y0 + j * sc, sc, sc); } });
  }
  const PEOPLE = [
    { h: '#2a1e18', s: '#e9c7a4', c: '#d6334a', l: '#2a2a33', k: '#14141c' }, { h: '#14141c', s: '#d9b08c', c: '#37c3d6', l: '#1b2a3a', k: '#0e0e14' },
    { h: '#5a3a28', s: '#f1d0b0', c: '#ffc247', l: '#3a2b2b', k: '#14141c' }, { h: '#c9c0b0', s: '#e0bfa0', c: '#8d99b4', l: '#2a2a33', k: '#14141c' },
    { h: '#14141c', s: '#c99a78', c: '#9be36b', l: '#2b3a2b', k: '#0e0e14' }, { h: '#3a2018', s: '#f1d0b0', c: '#ff8a5b', l: '#2b2b3a', k: '#14141c' },
  ];
  const ppl = () => PEOPLE[(r() * PEOPLE.length) | 0];
  function umbrella(g, x, y, c) { for (let k = -8; k <= 8; k++) { const yy = y + Math.round((k * k) / 16); P.rect(g, x + k, yy, 1, 2, c); } P.rect(g, x - 8, y + 4, 17, 1, mix(c, '#000000', 0.3)); P.rect(g, x, y, 1, 14, '#2a2a33'); }

  // ---------- 物件 ----------
  function tenement(o, wall, prob, opts) {
    const g = o.g, M = o.M, w = 34 + ((r() * 16) | 0), h = Math.round((56 + ((r() * 34) | 0)) * o.s), x = Math.round(o.x - w / 2), b = HZ + 8;
    const lit = mix(wall, M.light, 0.08), dark = mix(wall, '#000000', 0.35);
    P.rect(g, x, b - h, w, h, lit); P.rect(g, x + Math.round(w * 0.7), b - h, Math.round(w * 0.3), h, dark);
    P.rect(g, x - 2, b - h - 3, w + 4, 3, mix(wall, '#000000', 0.45));
    // 天台：水缸、天線、招牌
    P.rect(g, x + 4, b - h - 9, 8, 6, mix(wall, '#000000', 0.2)); P.rect(g, x + 5, b - h - 10, 6, 1, mix(wall, '#000000', 0.1));
    P.line(g, x + w - 6, b - h - 3, x + w - 6, b - h - 16, dark); P.line(g, x + w - 9, b - h - 12, x + w - 3, b - h - 12, dark);
    if (opts && opts.sign) { const sc = opts.sign; P.rect(g, x + 14, b - h - 10, 14, 6, '#0b0a18'); P.rect(g, x + 15, b - h - 9, 12, 4, sc); light(x + 21, b - h - 7, 16, sc, 0.45); dyn.neons.push({ x: x + 21, y: b - h - 7, r: 12, c: sc, ph: r() * 6 }); }
    for (let yy = b - h + 5; yy < b - 6; yy += 8) {
      P.rect(g, x - 2, yy + 5, w + 4, 1, mix(wall, '#000000', 0.4));
      for (let xx = x + 3; xx < x + w - 5; xx += 7) {
        const on = r() < prob;
        const lc = r() < 0.2 ? mix(M.light, M.accent, 0.5) : M.light;
        P.rect(g, xx, yy, 4, 4, on ? lc : mix(wall, '#000000', 0.5));
        if (on) { if (r() < 0.35) P.rect(g, xx + 1, yy + 1, 2, 3, mix(wall, '#000000', 0.6)); if (r() < 0.25) light(xx + 2, yy + 2, 7, lc, 0.3); }
        if (r() < 0.35) { P.rect(g, xx, yy + 5, 3, 2, '#9aa0a8'); P.rect(g, xx, yy + 6, 3, 1, '#6a7078'); } // 冷氣機
      }
      if (opts && opts.laundry && r() < 0.55) { const lx = x + 2 + r() * (w - 14); P.line(g, lx, yy + 6, lx + 12, yy + 7, '#2a2018'); for (let k = 0; k < 4; k++) P.rect(g, lx + 1 + k * 3, yy + 7, 2, 3 + (k % 2), ['#d6334a', '#37c3d6', '#f3ead6', '#ffc247'][k]); }
    }
    for (let i = 0; i < 4; i++) P.rect(g, x + 2 + i * (w - 4) / 3, b, 2, 7, mix(wall, '#000000', 0.55));
  }
  function boat(g, x, y, s, lightC, live) {
    P.rect(g, x - 10 * s, y, 20 * s, 3, '#3a2a1e'); P.rect(g, x - 8 * s, y + 3, 16 * s, 2, '#2a1e14');
    P.rect(g, x - 3 * s, y - 6 * s, 7 * s, 6 * s, '#5a4030'); P.rect(g, x + 6 * s, y - 9 * s, 1, 9 * s, '#2a1e14');
    P.rect(g, x + 5 * s, y - 11 * s, 3, 3, lightC);
    if (!live) { light(x + 6 * s, y - 10 * s, 14, lightC, 0.5); dyn.lamps.push({ x: x + 6 * s, c: lightC }); }
  }
  function lamp(g, x, y, s, lc) { P.rect(g, x, y - 34 * s, 2, 34 * s, '#22222b'); P.rect(g, x - 3, y - 36 * s, 8, 3, '#22222b'); P.rect(g, x - 1, y - 33 * s, 4, 2, lc); light(x + 1, y - 30 * s, 30, lc, 0.55); dyn.lamps.push({ x: x + 1, c: lc }); }
  function neonSign(g, x, y, text, c, vertical, s) {
    const size = Math.round(9 * (s || 1));
    g.save(); g.font = 'bold ' + size + 'px sans-serif'; g.textBaseline = 'top';
    const chars = vertical ? text.split('') : [text];
    const wmax = vertical ? size + 6 : Math.ceil(g.measureText(text).width) + 8, hmax = vertical ? chars.length * (size + 2) + 6 : size + 8;
    P.rect(g, x, y, wmax, hmax, '#0b0a18'); ['top', 'bottom'].forEach((k) => P.rect(g, x, k === 'top' ? y : y + hmax - 1, wmax, 1, c)); P.rect(g, x, y, 1, hmax, c); P.rect(g, x + wmax - 1, y, 1, hmax, c);
    g.fillStyle = mix(c, '#ffffff', 0.5);
    chars.forEach((ch, i) => g.fillText(ch, x + 4, y + 4 + (vertical ? i * (size + 2) : 0)));
    g.restore();
    light(x + wmax / 2, y + hmax / 2, Math.max(wmax, hmax) * 1.2, c, 0.55);
    dyn.neons.push({ x: x + wmax / 2, y: y + hmax / 2, r: Math.max(wmax, hmax), c, ph: r() * 6 });
  }
  function pier(g, M) {
    for (let y = 178; y < H; y++) { g.fillStyle = mix('#2a2018', '#0c0906', (y - 178) / 22); g.fillRect(0, y, W, 1); }
    for (let x = 0; x < W; x += 12) P.rect(g, x, 178, 1, 22, '#1a140e');
    P.rect(g, 0, 176, W, 2, mix('#3a3028', M.light, 0.18));
    for (let x = 6; x < W; x += 40) P.rect(g, x, 165, 2, 12, '#16110c');
    P.rect(g, 0, 165, W, 1, '#16110c');
  }

  // ---------- 每一種情緒在每一層畫的東西 ----------
  const ELEM = {
    far: {
      warmth(o) { light(o.x, HZ - 4, 70, o.M.hz, 0.5); skyline(o.g, o.x - 34, o.x + 34, HZ, 14, 36, o.M, 0.5, true); },
      hope(o) { if (!o.once('orb')) { for (let i = 0; i < 7; i++) { const bx = o.x - 24 + i * 8 + gauss() * 3, by = 28 + i * 3 + gauss() * 3; P.rect(o.g, bx - 2, by, 2, 1, '#1b1b28'); P.rect(o.g, bx, by + 1, 1, 1, '#1b1b28'); P.rect(o.g, bx + 1, by, 2, 1, '#1b1b28'); } return; }
        P.disc(o.g, o.x, HZ - 10, Math.round(7 * o.s), '#fff6d8'); light(o.x, HZ - 10, 90, '#fff2c4', 0.6); for (let i = 0; i < 9; i++) P.line(o.g, o.x, HZ - 10, o.x + Math.cos(-Math.PI * (i + 1) / 10) * 80, HZ - 10 + Math.sin(-Math.PI * (i + 1) / 10) * 70, rgba('#fff2c4', 0.08)); },
      water(o) { for (let i = 0; i < 4; i++) cloud(o.g, o.x + (i - 1.5) * 18, 20 + r() * 20, 44, mix(o.M.mid, '#000000', 0.2), 0.7); dyn.rain = Math.max(dyn.rain, 0.7); },
      memory(o) { if (!o.once('orb')) { const g = o.g, c = mix(o.M.top, '#000000', 0.2); P.rect(g, o.x - 1, HZ - 70, 2, 70, c); for (let k = 0; k < 6; k++) P.line(g, o.x, HZ - 70 + k * 10, o.x - 8 + k, HZ - 58 + k * 10, c); P.rect(g, o.x - 1, HZ - 73, 2, 2, '#ff4d5e'); light(o.x, HZ - 72, 10, '#ff4d5e', 0.6); skyline(g, o.x - 26, o.x + 26, HZ, 12, 26, o.M, 0.3, true); return; }
        P.disc(o.g, o.x, 34, Math.round(10 * o.s), '#f3e2bd'); P.disc(o.g, o.x + 3, 31, 2, '#d9c49a'); P.disc(o.g, o.x - 3, 37, 1, '#d9c49a'); light(o.x, 34, 50, '#f3e2bd', 0.4); },
      rebel(o) { for (let k = -1; k <= 1; k += 2) for (let i = 0; i < 90; i++) { const t = i / 90; P.rect(o.g, o.x + k * t * 60, HZ - 4 - t * 100, 1 + t * 3, 1, rgba('#fff2c4', 0.12 * (1 - t) + 0.03)); } skyline(o.g, o.x - 22, o.x + 22, HZ, 20, 42, o.M, 0.35, true); },
      machine(o) { const g = o.g, c = mix(o.M.top, o.M.haze, 0.2); P.rect(g, o.x - 2, HZ - 64, 3, 64, c); P.rect(g, o.x - 30, HZ - 64, 60, 3, c); P.line(g, o.x - 30, HZ - 62, o.x - 30, HZ - 40, c); P.rect(g, o.x - 34, HZ - 42, 8, 6, c); for (let i = 0; i < 3; i++) { P.rect(g, o.x + 10 + i * 6, HZ - 30 - i * 8, 4, 30 + i * 8, c); dyn.smokes.push({ x: o.x + 12 + i * 6, y: HZ - 30 - i * 8, h: 40, size: 6, speed: 0.12, drift: 10, c: '#8a8a8a', a: 0.25 }); } P.rect(g, o.x - 1, HZ - 66, 2, 2, '#ff4d5e'); light(o.x, HZ - 66, 8, '#ff4d5e', 0.8); },
      guilt(o) { for (let i = 0; i < 5; i++) cloud(o.g, o.x + (i - 2) * 16, 14 + r() * 26, 46, '#0a0c10', 0.8); dyn.fog = 1; },
      anger(o) { light(o.x, HZ - 2, 80, '#ff6a3d', 0.6); for (let i = 0; i < 3; i++) dyn.smokes.push({ x: o.x + (i - 1) * 10, y: HZ - 4, h: 70, size: 10, speed: 0.08, drift: 12, c: '#3a1414', a: 0.5 }); const lx = o.x + 20; P.line(o.g, lx, 10, lx - 6, 40, '#fff6d8'); P.line(o.g, lx - 6, 40, lx + 3, 46, '#fff6d8'); P.line(o.g, lx + 3, 46, lx - 4, 78, '#fff6d8'); light(lx, 44, 30, '#fff6d8', 0.35); },
      neon(o) { light(o.x, HZ - 20, 90, o.M.accent, 0.3); skyline(o.g, o.x - 38, o.x + 38, HZ, 26, 60, o.M, 0.55, true); P.rect(o.g, o.x - 8, HZ - 46, 14, 5, '#37c3d6'); light(o.x - 1, HZ - 44, 16, '#37c3d6', 0.6); P.rect(o.g, o.x + 12, HZ - 40, 5, 12, '#ff4fb4'); light(o.x + 14, HZ - 34, 14, '#ff4fb4', 0.6); dyn.neons.push({ x: o.x + 14, y: HZ - 34, r: 10, c: '#ff4fb4', ph: r() * 6 }); },
      hunger(o) { if (o.once('orb')) { P.disc(o.g, o.x, 30, 7, '#f3eadb'); P.disc(o.g, o.x + 3, 28, 6, mix(o.M.top, o.M.mid, 0.4)); light(o.x, 30, 30, '#f3eadb', 0.3); } for (let i = 0; i < 3; i++) dyn.smokes.push({ x: o.x - 20 + i * 18, y: HZ - 10, h: 50, size: 5, speed: 0.1, drift: 6, c: '#c9c0b0', a: 0.18 }); skyline(o.g, o.x - 26, o.x + 26, HZ, 10, 24, o.M, 0.25, true); },
    },
    mid: {
      warmth(o) { tenement(o, '#5a3a3a', 0.62, { laundry: true }); },
      hope(o) { const g = o.g, x = o.x, b = HZ + 4, h = 40 * o.s; P.rect(g, x - 4, b - h, 8, h, '#e8e1d0'); P.rect(g, x + 1, b - h, 3, h, '#c9c2b0'); for (let i = 0; i < 4; i++) P.rect(g, x - 4, b - h + 4 + i * 9 * o.s, 8, 3, '#d6334a'); P.rect(g, x - 6, b - h - 6, 12, 6, '#2a2a33'); P.rect(g, x - 2, b - h - 5, 4, 3, '#fff2c4'); light(x, b - h - 3, 26, '#fff2c4', 0.75); dyn.lamps.push({ x, c: '#fff2c4' }); P.rect(g, x - 8, b, 16, 3, '#2a2a33'); },
      water(o) { for (let i = 0; i < 3; i++) dyn.boats.push({ x: o.x - 30 + i * 28 + gauss() * 4, y: HZ + 14 + i * 9, s: 0.8 + i * 0.2, light: o.M.light }); dyn.boats.slice(-3).forEach((b) => { light(b.x + 6 * b.s, b.y - 10 * b.s, 14, b.light, 0.5); dyn.lamps.push({ x: b.x + 6 * b.s, c: b.light }); }); },
      memory(o) { tenement(o, '#6b5444', 0.4, { laundry: true }); },
      rebel(o) { const g = o.g, x = o.x - 24, b = HZ + 6; P.rect(g, x, b - 34, 48, 34, '#3a3044'); P.rect(g, x + 34, b - 34, 14, 34, '#2a2234'); const cs = ['#ff4fb4', '#ffc247', '#37c3d6', '#9be36b']; for (let i = 0; i < 30; i++) P.rect(g, x + 3 + r() * 40, b - 30 + r() * 24, 2 + r() * 6, 2, cs[i % 4]); P.rect(g, x + 6, b - 46, 1, 14, '#c9c0b0'); P.rect(g, x + 7, b - 46, 12, 7, '#d6334a'); },
      machine(o) { const g = o.g; for (let i = 0; i < 3; i++) P.line(g, o.x - 50, HZ - 30 + i * 4, o.x + 50, HZ - 26 + i * 6, '#11171a'); P.rect(g, o.x - 14, HZ - 20, 28, 26, '#2a3436'); for (let i = 0; i < 5; i++) { P.rect(g, o.x - 11 + i * 5, HZ - 16, 3, 3, i % 2 ? '#b8fff0' : '#37c3d6'); } light(o.x, HZ - 12, 22, '#37c3d6', 0.4); },
      guilt(o) { const g = o.g, x = o.x - 14, b = HZ + 6; P.rect(g, x, b - 56, 28, 56, '#191c23'); P.rect(g, x + 19, b - 56, 9, 56, '#101217'); for (let yy = b - 52; yy < b - 4; yy += 7) for (let xx = x + 3; xx < x + 25; xx += 6) P.rect(g, xx, yy, 3, 4, '#0d0f13'); P.rect(g, x + 15, b - 31, 3, 4, '#ffe9a8'); light(x + 16, b - 29, 16, '#ffe9a8', 0.6); },
      anger(o) { tenement(o, '#3a1d1d', 0.5); dyn.smokes.push({ x: o.x, y: HZ - 40, h: 60, size: 9, speed: 0.1, drift: 14, c: '#2a1010', a: 0.5 }); light(o.x, HZ - 20, 46, '#ff6a3d', 0.55); },
      neon(o) { const g = o.g, x = o.x - 10, b = HZ + 6, h = 70 * o.s; P.rect(g, x, b - h, 20, h, '#14102a'); P.rect(g, x + 14, b - h, 6, h, '#0e0b1e'); for (let yy = b - h + 4; yy < b - 4; yy += 5) for (let xx = x + 2; xx < x + 18; xx += 4) if (r() < 0.5) P.rect(g, xx, yy, 2, 2, rgba('#ff9be0', 0.7)); neonSign(g, x + 22, b - h + 10, ['夜', '市', '茶', '冰'][((r() * 4) | 0)] + ['', '店', '室'][((r() * 3) | 0)], r() < 0.5 ? '#ff4fb4' : '#37c3d6', true); },
      hunger(o) { const g = o.g, x = o.x - 30, b = HZ + 8; for (let i = 0; i < 3; i++) { const cs = ['#d6334a', '#ffc247', '#37c3d6']; P.rect(g, x + i * 20, b - 16, 18, 4, cs[i]); P.rect(g, x + i * 20 + 1, b - 12, 1, 12, '#2a2a33'); P.rect(g, x + i * 20 + 16, b - 12, 1, 12, '#2a2a33'); P.rect(g, x + i * 20 + 2, b - 6, 14, 6, '#3a3030'); light(x + i * 20 + 9, b - 9, 16, '#ffe0a8', 0.6); dyn.lamps.push({ x: x + i * 20 + 9, c: '#ffe0a8' }); dyn.smokes.push({ x: x + i * 20 + 9, y: b - 16, h: 24, size: 3, speed: 0.25, drift: 2, c: '#f3eadb', a: 0.25 }); } },
    },
    focal: {
      warmth(o) { const g = o.g; if (r() < 0.5) { sprite(g, 'stand', o.x - 8, o.y, ppl(), o.s, 1); sprite(g, 'child', o.x + 1, o.y, ppl(), o.s, 1); sprite(g, 'stand', o.x + 9, o.y, ppl(), o.s, -1); lamp(g, o.x - 22, o.y, o.s, o.M.light); return; } sprite(g, 'stand', o.x - 4, o.y, ppl(), o.s, 1); sprite(g, 'stand', o.x + 4, o.y, ppl(), o.s, -1); lamp(g, o.x + 16, o.y, o.s, o.M.light); },
      hope(o) { const g = o.g; sprite(g, 'child', o.x, o.y, ppl(), o.s, 1); P.line(g, o.x + 3, o.y - 8 * o.s, o.x + 26, o.y - 62, rgba('#f3ead6', 0.7)); const kx = o.x + 26, ky = o.y - 62; P.line(g, kx, ky - 6, kx + 6, ky, '#ffd36b'); P.line(g, kx + 6, ky, kx, ky + 6, '#ffd36b'); P.line(g, kx, ky + 6, kx - 6, ky, '#ffd36b'); P.line(g, kx - 6, ky, kx, ky - 6, '#ffd36b'); P.disc(g, kx, ky, 3, '#ffd36b'); light(kx, ky, 14, '#ffd36b', 0.4); },
      water(o) { const g = o.g; if (r() < 0.4) { boat(g, o.x, o.y - 8, 1.5 * o.s, o.M.light, false); sprite(g, 'stand', o.x - 4, o.y - 14, ppl(), 1, 1); return; } const p = ppl(); sprite(g, 'stand', o.x, o.y, p, o.s, 1); umbrella(g, o.x, o.y - 14 * o.s - 10, '#d6334a'); for (let i = 0; i < 3; i++) P.rect(g, o.x - 10 + i * 8, o.y + 1, 6, 1, rgba('#bfe3ff', 0.5)); dyn.rain = Math.max(dyn.rain, 0.5); },
      memory(o) { const g = o.g; if (r() < 0.5) { P.rect(g, o.x - 14, o.y - 6, 28, 2, '#5a4030'); P.rect(g, o.x - 12, o.y - 4, 2, 4, '#5a4030'); P.rect(g, o.x + 10, o.y - 4, 2, 4, '#5a4030'); sprite(g, 'sit', o.x - 6, o.y - 2, Object.assign({}, ppl(), { h: '#c9c0b0' }), 1, 1); sprite(g, 'sit', o.x + 5, o.y - 2, Object.assign({}, ppl(), { h: '#d9d0c0' }), 1, -1); return; }
        const x = o.x, y = o.y - 38 * o.s; P.rect(g, x - 16, y - 12, 32, 26, '#f3ead6'); P.rect(g, x - 14, y - 10, 28, 18, '#b89a72'); sprite(g, 'child', x - 5, y + 6, ppl(), 1); sprite(g, 'child', x + 5, y + 6, ppl(), 1); P.rect(g, x - 1, y + 14, 2, 22 * o.s, '#3a2f28'); light(x, y, 26, '#ffd9a0', 0.35); },
      rebel(o) { const g = o.g; sprite(g, 'stand', o.x, o.y, ppl(), o.s, 1); P.rect(g, o.x + 8, o.y - 40 * o.s, 1, 26 * o.s, '#c9c0b0'); P.rect(g, o.x + 9, o.y - 40 * o.s, 14, 8, '#ffc247'); sprite(g, 'stand', o.x - 12, o.y, ppl(), o.s * 0.9, -1); },
      machine(o) { const g = o.g; if (r() < 0.45) { for (let i = 0; i < 3; i++) { const dx = o.x - 18 + i * 18, dy = o.y - 60 - i * 8; P.rect(g, dx - 5, dy, 10, 3, '#2a3436'); P.rect(g, dx - 7, dy - 1, 3, 1, '#8e9bb0'); P.rect(g, dx + 4, dy - 1, 3, 1, '#8e9bb0'); P.rect(g, dx - 2, dy + 3, 4, 3, '#c98d5e'); light(dx, dy + 2, 10, '#37c3d6', 0.6); } sprite(g, 'stand', o.x + 20, o.y, ppl(), o.s, 1); return; }
        sprite(g, 'robot', o.x, o.y, { m: '#8e9bb0', e: '#37c3d6', a: '#ff4d5e' }, 2 * o.s, 1); light(o.x, o.y - 20 * o.s, 26, '#37c3d6', 0.4); },
      guilt(o) { const g = o.g; sprite(g, 'sit', o.x, o.y, Object.assign({}, ppl(), { c: '#5a6478' }), o.s, 1); for (let i = 0; i < 40; i++) P.rect(g, o.x + i, o.y + 1, 1, 1, rgba('#000000', 0.5 - i * 0.012)); },
      anger(o) { const g = o.g; P.rect(g, o.x - 6, o.y - 14, 12, 14, '#3a2a2a'); P.rect(g, o.x - 6, o.y - 14, 12, 2, '#5a4040'); light(o.x, o.y - 20, 34, '#ff6a3d', 0.7); dyn.embers = Math.max(dyn.embers, 0.6); dyn.smokes.push({ x: o.x, y: o.y - 16, h: 40, size: 5, speed: 0.3, drift: 4, c: '#ff8a3c', a: 0.35 }); sprite(g, 'stand', o.x + 14, o.y, Object.assign({}, ppl(), { c: '#d6334a' }), o.s, -1); },
      neon(o) { const g = o.g, x = o.x, y = o.y - 56 * o.s; P.rect(g, x - 1, y + 10, 2, o.y - y - 10, '#1b1b28'); neonSign(g, x - 14, y, ['糖水', '冰室', '卡拉OK', '夜市', '當舖', '旅館'][((r() * 6) | 0)], r() < 0.5 ? '#ff4fb4' : '#37c3d6', false, o.s); },
      hunger(o) { const g = o.g, x = o.x - 14, y = o.y; P.rect(g, x, y - 18, 28, 18, '#5a3a2a'); P.rect(g, x - 2, y - 30, 32, 5, '#d6334a'); P.rect(g, x, y - 25, 1, 7, '#2a2a33'); P.rect(g, x + 27, y - 25, 1, 7, '#2a2a33'); light(x + 14, y - 22, 30, '#ffe0a8', 0.7); dyn.lamps.push({ x: x + 14, c: '#ffe0a8' }); dyn.smokes.push({ x: x + 12, y: y - 24, h: 34, size: 4, speed: 0.3, drift: 3, c: '#f3eadb', a: 0.35 }); sprite(g, 'stand', x + 36, y, ppl(), o.s, -1); sprite(g, 'cat', x - 8, y, { k: '#101016', e: '#ffd36b' }, 1); },
    },
    atmo: {
      warmth(o) { for (let i = 0; i < 14; i++) { const x = o.x - 60 + i * 9, y = 140 + Math.sin(i * 0.8) * 6; P.rect(o.g, x, y, 1, 1, '#2a2a33'); const lc = i % 2 ? '#ffd36b' : '#ff8a5b'; P.rect(o.g, x, y + 2, 1, 1, lc); light(x, y + 2, 6, lc, 0.8); } },
      hope(o) { for (let i = 0; i < 26; i++) { const x = o.x - 60 + r() * 120, y = 20 + r() * 150; light(x, y, 4, '#fff6d8', 0.7); } },
      water(o) { dyn.rain = 1; P.rect(o.g, 0, 0, W, H, 'rgba(40,60,90,0.1)'); },
      memory(o) { const g = o.g; for (let i = 0; i < 900; i++) P.rect(g, r() * W, r() * H, 1, 1, rgba(r() < 0.5 ? '#3a2a1a' : '#fff2d8', 0.08)); mood.sepia = true; },
      rebel(o) { for (let i = 0; i < 7; i++) { const x = o.x - 50 + r() * 100, y = 40 + r() * 120; P.rect(o.g, x, y, 4, 3, i % 2 ? '#f3ead6' : '#ffc247'); } for (let i = 0; i < 2; i++) { const x = o.x - 30 + i * 60; P.rect(o.g, x, 150, 1, 20, '#2a2a33'); P.rect(o.g, x + 1, 150, 16, 9, i ? '#ff4fb4' : '#ffc247'); } },
      machine(o) { for (let i = 0; i < 6; i++) { const x = 30 + r() * 260, y = 20 + r() * 70; P.rect(o.g, x - 3, y, 7, 2, '#2a3436'); const lc = i % 2 ? '#ff4d5e' : '#37c3d6'; P.rect(o.g, x, y + 2, 1, 1, lc); light(x, y + 3, 8, lc, 0.8); } },
      guilt(o) { for (let y = 150; y < H; y += 2) { o.g.fillStyle = rgba('#c9d2e3', 0.04 + (y - 150) * 0.002); o.g.fillRect(0, y, W, 2); } dyn.fog = 1; },
      anger(o) { dyn.embers = 1; light(W / 2, H, 160, '#ff6a3d', 0.25); },
      neon(o) { for (let i = 0; i < 10; i++) { const x = o.x - 60 + r() * 120, y = HZ + 6 + r() * 50; P.rect(o.g, x, y, 5 + r() * 8, 1, rgba(i % 2 ? '#ff4fb4' : '#37c3d6', 0.7)); } light(o.x, HZ + 20, 80, o.M.accent, 0.25); },
      hunger(o) { dyn.smokes.push({ x: o.x, y: 175, h: 70, size: 6, speed: 0.12, drift: 8, c: '#f3eadb', a: 0.12 }); sprite(o.g, 'cat', o.x + 40, 178, { k: '#0b0b10', e: '#ffd36b' }, 1); },
    },
  };

  // 一筆的構圖：每張素材畫哪一樣、畫在哪裏
  function planPlay(play) {
    const k = Math.min(3, play.ring || 0), layer = ['far', 'mid', 'focal', 'atmo'][k];
    const n = play.cards.length, list = [], plans = {};
    const main = (play.subject && play.subject.main) || play.cards[0].tags[0];
    if (k === 0 && !mood) mood = Object.assign({}, MOODS[main] || MOODS.warmth);
    const M = mood || MOODS.warmth;
    play.cards.forEach((c, i) => {
      const role = play.roles[i] || 'cheng';
      const tag = ELEM[layer][c.tags[0]] ? c.tags[0] : c.tags[c.tags.length - 1];
      const t2 = c.tags[1] || null;
      const hero = role === 'zhuan' || role === 'zhuanhe';
      const x = n === 1 ? W / 2 : 28 + (i / (n - 1)) * (W - 56) + gauss() * 6;
      const y = layer === 'focal' ? 176 : layer === 'mid' ? HZ + 8 : HZ;
      const s = (hero ? 1.3 : 1) * (0.85 + c.star * 0.06);
      const seed = (r() * 1e9) | 0;
      const plan = { uid: c.uid, layer, at: [x, layer === 'focal' ? y - 20 : layer === 'atmo' ? 100 : y - 20], draw: (g) => {
        const save = r; r = IE.Proto2.rng(seed);
        if (k === 0 && i === 0 && !layers.__sky) { paintSky(M); layers.__sky = true; sketch = false; }
        if (k === 2 && !layers.__pier) { pier(layers.focal.g, M); layers.__pier = true; }
        const fn = ELEM[layer][tag] || ELEM[layer].warmth;
        const once = (key) => { if (layers['__' + key]) return false; layers['__' + key] = true; return true; };
        fn({ g, x, y, s, c: col(tag), M, hero, once });
        // 第二種情緒：中景在水面映出一抹那種顏色的光；主角旁邊的欄杆掛一盞那種顏色的燈
        if (t2 && t2 !== tag && layer === 'mid') { light(x, HZ + 14, 22, col(t2), 0.35); dyn.lamps.push({ x, c: col(t2) }); }
        if (t2 && t2 !== tag && layer === 'focal') { const lx = Math.round(x + (i % 2 ? -14 : 14)); P.rect(g, lx, 158, 1, 7, '#16110c'); P.rect(g, lx - 1, 156, 3, 3, mix(col(t2), '#ffffff', 0.35)); light(lx, 157, 14, col(t2), 0.7); }
        if (role === 'he' || role === 'zhuanhe') light(x, y - 26, 30, M.light, 0.35);
        if (hero) light(x, y - 24, 40, col(tag), 0.25);
        r = save;
      } };
      plans[c.uid] = plan; list.push(plan);
    });
    let close = null;
    if (play.he && list.length >= 3) close = { uid: 'he', layer: 'atmo', at: [W / 2, 60], draw: () => { light(W / 2, -20, 220, M.light, 0.18); } };
    return { plans, list, close };
  }
  // 逐步畫出：先畫在暫存的畫布，再由這張素材的位置向外一格格顯現；光直接加上
  function drawPlan(plan, ms) {
    return new Promise((resolve) => {
      if (!plan || !layers) { resolve(); return; }
      const tmp = mk();
      if (plan.draw) plan.draw(tmp.g);
      const target = layers[plan.layer].g;
      if (ms <= 0) { target.drawImage(tmp.c, 0, 0); frame(true); resolve(); return; }
      const T = 8, cells = []; for (let y = 0; y < H; y += T) for (let x = 0; x < W; x += T) cells.push([x, y]);
      const ax = plan.at[0], ay = plan.at[1];
      cells.sort((a, b) => Math.hypot(a[0] - ax, a[1] - ay) - Math.hypot(b[0] - ax, b[1] - ay));
      const start = performance.now();
      let done = 0;
      const step = (now) => {
        const k = Math.min(1, (now - start) / ms);
        const upto = Math.round(k * cells.length);
        for (; done < upto; done++) { const [x, y] = cells[done]; target.drawImage(tmp.c, x, y, T, T, x, y, T, T); }
        if (k < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
  }
  function glint(n) { if (!layers) return; for (let i = 0; i < (n || 40) / 4; i++) light(Math.random() * W, Math.random() * H, 3, '#ffd65a', 0.8); }
  function spray(at, color) { if (!layers) return; const g = layers.atmo.g, x0 = at ? at[0] : W / 2, y0 = at ? at[1] : H / 2; for (let i = 0; i < 120; i++) { const a = Math.random() * Math.PI * 2, d = Math.pow(Math.random(), 0.6) * 18; g.fillStyle = rgba(color || '#ff4fb4', 0.6); g.fillRect((x0 + Math.cos(a) * d) | 0, (y0 + Math.sin(a) * d * 0.7) | 0, 1, 1); } }
  function strike(at) { if (!layers) return; const g = layers.atmo.g, x = at ? at[0] | 0 : 160, y = at ? at[1] | 0 : 100; for (let i = -12; i < 12; i++) { g.fillStyle = 'rgba(70,70,80,0.6)'; g.fillRect(x + i, y + (i >> 2), 2, 2); } }
  let signText = '';
  function sign(text) { signText = text || ''; if (layers) { const g = layers.atmo.g; g.save(); g.fillStyle = 'rgba(255,255,255,0.55)'; g.font = '8px monospace'; g.textAlign = 'right'; g.fillText(signText, W - 6, H - 6); g.restore(); } frame(true); }
  function snapshot() { const c = mk(); targets.add(c.c); frame(false, 1.3); targets.delete(c.c); return c.c.toDataURL('image/png'); }
  function screenPoint(p) { const cv = [...targets][0]; const b = cv.getBoundingClientRect(); return { x: b.left + (p[0] / W) * b.width, y: b.top + (p[1] / H) * b.height }; }

  IE.Painter = { W, H, init, attach, detach, blank, planPlay, drawPlan, glint, spray, strike, sign, snapshot, screenPoint, MOODS };
})(typeof window !== 'undefined' ? window : globalThis);
