// 創作之夜原型第三版：畫布是一幅浮城的像素插畫。
// 一晚四筆，一筆畫一層：第一筆是天空和遠景（還有海），第二筆是中景（樓、船、市集），第三筆是主角（人物、機械人、招牌），第四筆是氣氛（雨、光、霧、火星）。
// 每張素材按它的情緒畫一樣東西；轉的那張畫得特別大、特別亮；合的那張把燈點亮。題材的主調決定天空的顏色和時間。
// 水面會倒映上面的天空、遠景和中景。重播（分享連結）用同一個種子，畫出同一幅畫。
(function (root) {
  'use strict';
  const IE = root.IE = root.IE || {};
  const W = 320, H = 200, HZ = 118; // 水平線
  let cv = null, cx = null, r = Math.random, layers = null, mood = null, sketch = true;
  const D = () => IE.DATA;
  const LAYERS = ['sky', 'far', 'mid', 'focal', 'atmo'];

  // ---------- 顏色 ----------
  function rgb(hex) { const h = hex.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function mix(h1, h2, k) { const a = rgb(h1), b = rgb(h2); return '#' + a.map((v, i) => Math.max(0, Math.min(255, Math.round(v + (b[i] - v) * k))).toString(16).padStart(2, '0')).join(''); }
  const rgba = (hex, a) => { const c = rgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  // 主調決定天空：頂、中、地平線、水、燈光、強調色
  const MOODS = {
    warmth: { top: '#2b1e3f', mid: '#8c4a62', hz: '#ffb36b', water: '#2f2440', light: '#ffcf7a', accent: '#ff8a5b', night: false },
    hope: { top: '#1d3768', mid: '#6f9fd6', hz: '#ffe7a3', water: '#22406a', light: '#fff2c4', accent: '#ffd36b', night: false },
    water: { top: '#18202e', mid: '#344a60', hz: '#7d93a8', water: '#18263a', light: '#bfe3ff', accent: '#37c3d6', night: true, rain: true },
    memory: { top: '#3a2e2a', mid: '#7f6450', hz: '#d9b98a', water: '#3a2f28', light: '#ffd9a0', accent: '#e8c25a', night: false, sepia: true },
    rebel: { top: '#120c24', mid: '#2d1b4e', hz: '#7a3d8f', water: '#150f29', light: '#ffd36b', accent: '#ff4fb4', night: true },
    machine: { top: '#172225', mid: '#35494a', hz: '#8aa39a', water: '#162324', light: '#b8fff0', accent: '#37c3d6', night: true, smog: true },
    guilt: { top: '#0e1117', mid: '#232833', hz: '#4a5160', water: '#10141b', light: '#c9d2e3', accent: '#8d99b4', night: true, cloud: true },
    anger: { top: '#26090c', mid: '#6e1b1b', hz: '#ff6a3d', water: '#260e12', light: '#ffb36b', accent: '#ff4d5e', night: true },
    neon: { top: '#0a0a1e', mid: '#251450', hz: '#d84aa8', water: '#0d0b25', light: '#ff9be0', accent: '#ff4fb4', night: true },
    hunger: { top: '#1b1b21', mid: '#3a3737', hz: '#8f8170', water: '#1d1b21', light: '#ffe0a8', accent: '#ff9e4f', night: true },
  };
  const col = (t) => D().TAGS[t].color;

  function mk() { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return { c, g }; }
  function init(canvas) { cv = canvas; cv.width = W; cv.height = H; cx = cv.getContext('2d'); cx.imageSmoothingEnabled = false; }
  function blank(seed) {
    r = IE.Proto2.rng(seed || 7);
    layers = {}; LAYERS.forEach((k) => { layers[k] = mk(); });
    layers.water = mk();
    mood = null; sketch = true;
    composite();
  }
  // 草稿：米色的紙、鉛筆畫的地平線和幾條構圖線
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
  // 合成：天空 → 遠景 → 海（倒影）→ 中景 → 主角 → 氣氛
  function composite() {
    if (!cx) return;
    if (sketch) { drawSketch(cx); return; }
    cx.clearRect(0, 0, W, H);
    cx.drawImage(layers.sky.c, 0, 0);
    cx.drawImage(layers.far.c, 0, 0);
    drawWater();
    cx.drawImage(layers.water.c, 0, 0);
    cx.drawImage(layers.mid.c, 0, 0);
    cx.drawImage(layers.focal.c, 0, 0);
    cx.drawImage(layers.atmo.c, 0, 0);
  }
  // 海：底色、上面的倒影（逐行左右搖晃）、燈光的長倒影
  function drawWater() {
    const g = layers.water.g, M = mood;
    g.clearRect(0, 0, W, H);
    for (let y = HZ; y < H; y++) { const k = (y - HZ) / (H - HZ); g.fillStyle = mix(mix(M.water, M.hz, 0.25 * (1 - k)), '#05060c', k * 0.55); g.fillRect(0, y, W, 1); }
    const src = mk();
    src.g.drawImage(layers.sky.c, 0, 0); src.g.drawImage(layers.far.c, 0, 0); src.g.drawImage(layers.mid.c, 0, 0);
    g.globalAlpha = 0.42;
    for (let y = HZ; y < H; y++) {
      const sy = HZ - (y - HZ) * 1.05 - 1;
      if (sy < 0) break;
      const off = Math.round(Math.sin(y * 0.9) * (1 + (y - HZ) * 0.06));
      g.drawImage(src.c, 0, sy | 0, W, 1, off, y, W, 1);
    }
    g.globalAlpha = 1;
    // 水紋
    for (let y = HZ + 3; y < H; y += 3 + ((y * 7) % 4)) for (let x = (y * 13) % 17; x < W; x += 9 + ((x + y) % 13)) { g.fillStyle = rgba(M.light, 0.08 + ((x + y) % 5) * 0.015); g.fillRect(x, y, 3 + (x % 4), 1); }
  }

  // ---------- 畫圖工具 ----------
  const P = {
    rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
    disc(g, x, y, rad, c) { g.fillStyle = c; for (let dy = -rad; dy <= rad; dy++) { const w = Math.round(Math.sqrt(rad * rad - dy * dy)); g.fillRect(Math.round(x - w), Math.round(y + dy), 2 * w + 1, 1); } },
    glow(g, x, y, rad, c, a) { const aa = (a || 0.25) * Math.min(1, 18 / rad); for (let k = rad; k > 0; k -= Math.max(1, rad / 10)) { g.fillStyle = rgba(c, aa * (1 - k / rad) * 0.45 + 0.008); const w = k; for (let dy = -w; dy <= w; dy += 1) { const ww = Math.round(Math.sqrt(w * w - dy * dy)); g.fillRect(Math.round(x - ww), Math.round(y + dy), 2 * ww + 1, 1); } } },
    line(g, x0, y0, x1, y1, c, w) { g.fillStyle = c; const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; for (let i = 0; i <= n; i++) { const t = n ? i / n : 0; g.fillRect(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), w || 1, w || 1); } },
    dither(g, x, y, w, h, c1, c2) { for (let yy = 0; yy < h; yy++) { const k = yy / Math.max(1, h - 1); for (let xx = 0; xx < w; xx++) { const th = ((xx & 1) * 2 + (yy & 1)) / 4 + ((xx >> 1 & 1) * 2 + (yy >> 1 & 1)) / 16; g.fillStyle = k > th ? c2 : c1; g.fillRect(x + xx, y + yy, 1, 1); } } },
  };

  // 天空（第一筆的第一張）：漸變、星、雲；按主調
  function paintSky(M) {
    const g = layers.sky.g;
    for (let y = 0; y <= HZ; y++) {
      const k = y / HZ;
      const c = k < 0.55 ? mix(M.top, M.mid, k / 0.55) : mix(M.mid, M.hz, (k - 0.55) / 0.45);
      g.fillStyle = c; g.fillRect(0, y, W, 1);
      if (k > 0.25 && k < 0.95 && y % 2 === 0) { g.fillStyle = rgba(k < 0.55 ? M.mid : M.hz, 0.35); for (let x = (y * 3) % 4; x < W; x += 4) g.fillRect(x, y, 1, 1); }
    }
    if (M.night) for (let i = 0; i < 70; i++) { const x = (r() * W) | 0, y = (r() * HZ * 0.6) | 0; g.fillStyle = rgba('#ffffff', 0.25 + r() * 0.6); g.fillRect(x, y, 1, 1); if (r() < 0.08) { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); } }
    if (M.cloud || M.rain || M.smog) for (let i = 0; i < 7; i++) cloud(g, r() * W, 12 + r() * 50, 30 + r() * 50, mix(M.top, M.mid, 0.6), 0.55);
    if (M.sepia) { g.fillStyle = 'rgba(112,72,30,0.12)'; g.fillRect(0, 0, W, HZ + 1); }
  }
  function cloud(g, x, y, w, c, a) { for (let i = 0; i < w / 4; i++) { P.disc(g, x + (i / (w / 4) - 0.5) * w + gauss() * 3, y + gauss() * 2, 3 + (r() * 5) | 0, rgba(c, a)); } }
  const gauss = () => (r() + r() + r() - 1.5) / 1.5;
  // 遠景的浮城：一排高樓，有窗、天線、高腳
  function skyline(g, x0, x1, base, hmin, hmax, c, light, prob) {
    let x = x0;
    while (x < x1) {
      const w = 8 + ((r() * 16) | 0), h = hmin + ((r() * (hmax - hmin)) | 0);
      P.rect(g, x, base - h, w, h, c);
      if (r() < 0.4) P.rect(g, x + (w >> 1), base - h - 5 - ((r() * 6) | 0), 1, 6, c);
      for (let yy = base - h + 3; yy < base - 3; yy += 4) for (let xx = x + 2; xx < x + w - 2; xx += 3) if (r() < prob) P.rect(g, xx, yy, 1, 2, rgba(light, 0.5 + r() * 0.5));
      // 高腳
      P.rect(g, x + 1, base, 1, 4, c); P.rect(g, x + w - 2, base, 1, 4, c);
      x += w + ((r() * 4) | 0);
    }
  }

  // ---------- 每一種情緒在每一層畫的東西 ----------
  // ctx：{ g, x, y, s（大小）, c（情緒色）, M（天色）, hero（轉）, light（合） }
  const ELEM = {
    far: {
      warmth(o) { P.glow(o.g, o.x, HZ - 4, 34 * o.s, o.M.hz, 0.5); skyline(o.g, o.x - 30, o.x + 30, HZ, 14, 34, mix(o.M.top, '#000000', 0.2), o.M.light, 0.45); },
      hope(o) { if (!o.once('orb')) { for (let i = 0; i < 6; i++) bird(o.g, o.x - 20 + i * 8 + gauss() * 3, 30 + i * 3 + gauss() * 3, '#1b1b28'); P.glow(o.g, o.x, HZ - 6, 30, '#fff2c4', 0.4); return; }
        P.glow(o.g, o.x, HZ - 10, 44 * o.s, '#fff2c4', 0.55); P.disc(o.g, o.x, HZ - 10, Math.round(7 * o.s), '#fff6d8'); for (let i = 0; i < 9; i++) P.line(o.g, o.x, HZ - 10, o.x + Math.cos(-Math.PI * (i + 1) / 10) * 70, HZ - 10 + Math.sin(-Math.PI * (i + 1) / 10) * 60, rgba('#fff2c4', 0.12)); },
      water(o) { for (let i = 0; i < 4; i++) cloud(o.g, o.x + (i - 1.5) * 18, 20 + r() * 20, 40, mix(o.M.mid, '#000000', 0.25), 0.7); for (let i = 0; i < 60; i++) { const x = o.x - 40 + r() * 80, y = 34 + r() * 70; P.line(o.g, x, y, x - 2, y + 7, rgba('#bfe3ff', 0.35)); } },
      memory(o) { if (!o.once('orb')) { const g = o.g, c = mix(o.M.top, '#000000', 0.25); P.rect(g, o.x - 1, HZ - 70, 2, 70, c); for (let k = 0; k < 6; k++) P.line(g, o.x, HZ - 70 + k * 10, o.x - 8 + k, HZ - 58 + k * 10, c); P.glow(g, o.x, HZ - 72, 5, '#ff4d5e', 0.9); skyline(g, o.x - 26, o.x + 26, HZ, 12, 26, c, '#ffd9a0', 0.3); return; }
        P.disc(o.g, o.x, 34, Math.round(10 * o.s), '#f3e2bd'); P.disc(o.g, o.x + 3, 31, 2, '#d9c49a'); P.disc(o.g, o.x - 3, 37, 1, '#d9c49a'); P.glow(o.g, o.x, 34, 26 * o.s, '#f3e2bd', 0.3); },
      rebel(o) { for (let k = -1; k <= 1; k += 2) { for (let i = 0; i < 90; i++) { const t = i / 90; P.rect(o.g, o.x + k * t * 60 + gauss() * 2 * t, HZ - 4 - t * 100, 1 + t * 3, 1, rgba('#fff2c4', 0.18 * (1 - t) + 0.04)); } } skyline(o.g, o.x - 20, o.x + 20, HZ, 20, 40, '#0b0818', '#ff4fb4', 0.3); },
      machine(o) { const g = o.g, c = mix(o.M.top, '#000000', 0.15); P.rect(g, o.x - 2, HZ - 64, 3, 64, c); P.rect(g, o.x - 30, HZ - 64, 60, 3, c); P.line(g, o.x - 30, HZ - 62, o.x - 30, HZ - 40, c); P.rect(g, o.x - 34, HZ - 42, 8, 6, c); for (let i = 0; i < 3; i++) P.rect(g, o.x + 10 + i * 6, HZ - 30 - i * 8, 4, 30 + i * 8, c); P.glow(g, o.x + 1, HZ - 66, 5, '#ff4d5e', 0.9); },
      guilt(o) { for (let i = 0; i < 5; i++) cloud(o.g, o.x + (i - 2) * 16, 14 + r() * 26, 46, '#0b0d12', 0.8); },
      anger(o) { P.glow(o.g, o.x, HZ - 2, 40 * o.s, '#ff6a3d', 0.7); for (let i = 0; i < 4; i++) P.disc(o.g, o.x + (i - 1.5) * 10, HZ - 18 - i * 8, 8 + i * 2, rgba('#3a1414', 0.7)); const lx = o.x + 20; P.line(o.g, lx, 10, lx - 6, 40, '#fff6d8'); P.line(o.g, lx - 6, 40, lx + 3, 46, '#fff6d8'); P.line(o.g, lx + 3, 46, lx - 4, 78, '#fff6d8'); },
      neon(o) { P.glow(o.g, o.x, HZ - 20, 50 * o.s, o.M.accent, 0.35); skyline(o.g, o.x - 36, o.x + 36, HZ, 26, 56, '#0b0820', '#ff9be0', 0.5); P.rect(o.g, o.x - 8, HZ - 44, 14, 5, '#37c3d6'); P.rect(o.g, o.x + 12, HZ - 38, 5, 12, '#ff4fb4'); },
      hunger(o) { if (o.once('orb')) { P.disc(o.g, o.x, 30, 7, '#f3eadb'); P.disc(o.g, o.x + 3, 28, 6, mix(o.M.top, o.M.mid, 0.4)); } for (let i = 0; i < 3; i++) { const sx = o.x - 20 + i * 18; for (let k = 0; k < 30; k++) P.disc(o.g, sx + Math.sin(k * 0.4 + i) * 3, HZ - 12 - k * 2, 2, rgba('#c9c0b0', 0.12)); } skyline(o.g, o.x - 26, o.x + 26, HZ, 10, 24, mix(o.M.top, '#000000', 0.2), o.M.light, 0.25); },
    },
    mid: {
      warmth(o) { tenement(o, '#5a3a3a', o.M.light, 0.6, true); },
      hope(o) { const g = o.g, x = o.x, b = HZ + 4; P.rect(g, x - 4, b - 40 * o.s, 8, 40 * o.s, '#e8e1d0'); for (let i = 0; i < 4; i++) P.rect(g, x - 4, b - 36 * o.s + i * 9 * o.s, 8, 3, '#d6334a'); P.rect(g, x - 6, b - 46 * o.s, 12, 6, '#2a2a33'); P.glow(g, x, b - 43 * o.s, 18, '#fff2c4', 0.8); P.rect(g, x - 8, b, 16, 3, '#2a2a33'); for (let i = 0; i < 40; i++) P.rect(g, x + i * 2, b - 43 * o.s - i * 0.3, 2, 1 + i * 0.12, rgba('#fff2c4', 0.12)); },
      water(o) { for (let i = 0; i < 3; i++) boat(o.g, o.x - 30 + i * 28 + gauss() * 4, HZ + 14 + i * 9, 0.8 + i * 0.2, o.M.light); },
      memory(o) { tenement(o, '#6b5444', '#ffd9a0', 0.35, true, true); },
      rebel(o) { const g = o.g, x = o.x - 24, b = HZ + 6; P.rect(g, x, b - 34, 48, 34, '#3a3044'); const cs = ['#ff4fb4', '#ffc247', '#37c3d6', '#9be36b']; for (let i = 0; i < 26; i++) P.rect(g, x + 3 + r() * 40, b - 30 + r() * 24, 2 + r() * 6, 2, cs[i % 4]); P.rect(g, x + 6, b - 46, 1, 14, '#c9c0b0'); P.rect(g, x + 7, b - 46, 12, 7, '#d6334a'); },
      machine(o) { const g = o.g; for (let i = 0; i < 3; i++) P.line(g, o.x - 50, HZ - 30 + i * 4, o.x + 50, HZ - 26 + i * 6, '#141a1c'); P.rect(g, o.x - 14, HZ - 20, 28, 26, '#2a3436'); for (let i = 0; i < 5; i++) P.rect(g, o.x - 11 + i * 5, HZ - 16, 3, 3, i % 2 ? '#b8fff0' : '#37c3d6'); P.glow(g, o.x, HZ - 8, 16, '#37c3d6', 0.4); },
      guilt(o) { const g = o.g, x = o.x - 14, b = HZ + 6; P.rect(g, x, b - 56, 28, 56, '#1a1d24'); for (let yy = b - 52; yy < b - 4; yy += 7) for (let xx = x + 3; xx < x + 25; xx += 6) P.rect(g, xx, yy, 3, 4, '#0f1116'); P.rect(g, x + 15, b - 31, 3, 4, '#ffe9a8'); P.glow(g, x + 16, b - 29, 8, '#ffe9a8', 0.5); },
      anger(o) { tenement(o, '#3a1d1d', '#ff8a3c', 0.5, false); for (let i = 0; i < 40; i++) P.disc(o.g, o.x + gauss() * 10, HZ - 50 - i * 1.5, 3 + (i % 3), rgba('#2a1010', 0.25)); P.glow(o.g, o.x, HZ - 20, 26, '#ff6a3d', 0.6); },
      neon(o) { const g = o.g, x = o.x - 10, b = HZ + 6, h = 70 * o.s; P.rect(g, x, b - h, 20, h, '#14102a'); for (let yy = b - h + 4; yy < b - 4; yy += 5) for (let xx = x + 2; xx < x + 18; xx += 4) if (r() < 0.5) P.rect(g, xx, yy, 2, 2, rgba('#ff9be0', 0.7)); neonSign(g, x + 22, b - h + 10, ['夜', '市'][((r() * 2) | 0)] + ['', '店'][((r() * 2) | 0)], r() < 0.5 ? '#ff4fb4' : '#37c3d6', true); },
      hunger(o) { const g = o.g, x = o.x - 30, b = HZ + 8; for (let i = 0; i < 3; i++) { const cs = ['#d6334a', '#ffc247', '#37c3d6']; P.rect(g, x + i * 20, b - 16, 18, 4, cs[i]); P.rect(g, x + i * 20 + 1, b - 12, 1, 12, '#2a2a33'); P.rect(g, x + i * 20 + 16, b - 12, 1, 12, '#2a2a33'); P.rect(g, x + i * 20 + 2, b - 6, 14, 6, '#3a3030'); P.glow(g, x + i * 20 + 9, b - 9, 9, '#ffe0a8', 0.6); for (let k = 0; k < 10; k++) P.disc(g, x + i * 20 + 9 + Math.sin(k + i) * 2, b - 18 - k * 2, 1, rgba('#f3eadb', 0.25)); } },
    },
    focal: {
      warmth(o) { if (r() < 0.5) { person(o.g, o.x - 8, o.y, o.s, '#ffb36b', '#3a2b2b'); person(o.g, o.x + 2, o.y, o.s * 0.6, '#9be36b', '#2b3a2b'); person(o.g, o.x + 10, o.y, o.s * 0.95, '#ff8a5b', '#2b2b3a'); lamp(o.g, o.x - 20, o.y, o.s, o.M.light); return; }
        person(o.g, o.x - 5, o.y, o.s, '#ffb36b', '#3a2b2b'); person(o.g, o.x + 5, o.y, o.s * 0.85, '#ff8a5b', '#2b2b3a'); lamp(o.g, o.x + 14, o.y, o.s, o.M.light); },
      hope(o) { person(o.g, o.x, o.y, o.s, '#9be36b', '#2b3a2b', 'up'); kite(o.g, o.x + 26, o.y - 60 * o.s, '#ffd36b'); for (let i = 0; i < 4; i++) bird(o.g, o.x - 20 + i * 12, o.y - 70 - i * 4, '#1b1b28'); },
      water(o) { if (r() < 0.4) { boat(o.g, o.x, o.y - 8, 1.5 * o.s, o.M.light); person(o.g, o.x - 4, o.y - 14, o.s * 0.7, '#37c3d6', '#1b2a3a'); return; } person(o.g, o.x, o.y, o.s, '#37c3d6', '#1b2a3a', 'umbrella'); for (let i = 0; i < 3; i++) P.rect(o.g, o.x - 10 + i * 8, o.y + 1, 6, 1, rgba('#bfe3ff', 0.5)); },
      memory(o) { if (r() < 0.5) { const g = o.g; bench(g, o.x, o.y, '#5a4030'); person(g, o.x - 6, o.y - 4, o.s * 0.9, '#8a7a6e', '#4a3a30', 'sit'); person(g, o.x + 7, o.y - 4, o.s * 0.85, '#b89a72', '#4a3a30', 'sit'); P.rect(g, o.x + 14, o.y - 12, 6, 4, '#3a2f28'); P.rect(g, o.x + 15, o.y - 11, 2, 2, '#e8c25a'); return; }
        const g = o.g, x = o.x, y = o.y - 38 * o.s; P.rect(g, x - 16, y - 12, 32, 26, '#f3ead6'); P.rect(g, x - 14, y - 10, 28, 18, '#b89a72'); person(g, x - 5, y + 8, 0.45, '#8a5a3b', '#5a4030'); person(g, x + 5, y + 8, 0.42, '#c98d5e', '#5a4030'); P.rect(g, x - 1, y + 14, 2, 22 * o.s, '#3a2f28'); bench(g, x, o.y, '#5a4030'); },
      rebel(o) { person(o.g, o.x, o.y, o.s, '#ff4fb4', '#2a1b3a', 'fist'); const g = o.g; P.rect(g, o.x + 8, o.y - 40 * o.s, 1, 26 * o.s, '#c9c0b0'); P.rect(g, o.x + 9, o.y - 40 * o.s, 14, 8, '#ffc247'); },
      machine(o) { if (r() < 0.45) { const g = o.g; for (let i = 0; i < 3; i++) { const dx = o.x - 18 + i * 18, dy = o.y - 60 - i * 8; P.rect(g, dx - 5, dy, 10, 3, '#2a3436'); P.rect(g, dx - 7, dy - 1, 3, 1, '#8e9bb0'); P.rect(g, dx + 4, dy - 1, 3, 1, '#8e9bb0'); P.rect(g, dx - 2, dy + 3, 4, 3, '#c98d5e'); P.glow(g, dx, dy + 2, 6, '#37c3d6', 0.7); } person(g, o.x + 20, o.y, o.s, '#ffc247', '#2a2a33', 'up'); return; } robot(o.g, o.x, o.y, o.s * 1.2, '#8e9bb0', '#37c3d6'); },
      guilt(o) { person(o.g, o.x, o.y, o.s, '#8d99b4', '#1b1d28', 'sit'); for (let i = 0; i < 40; i++) P.rect(o.g, o.x + i, o.y + 1, 1, 1, rgba('#000000', 0.5 - i * 0.01)); },
      anger(o) { const g = o.g; P.rect(g, o.x - 6, o.y - 14, 12, 14, '#3a2a2a'); for (let i = 0; i < 26; i++) P.disc(g, o.x + gauss() * 4, o.y - 16 - r() * 18, 1 + (r() * 3) | 0, i % 3 ? '#ff8a3c' : '#ffd36b'); P.glow(g, o.x, o.y - 22, 22, '#ff6a3d', 0.7); person(g, o.x + 14, o.y, o.s, '#d6334a', '#2a1414', 'fist'); },
      neon(o) { const g = o.g, x = o.x, y = o.y - 56 * o.s; P.rect(g, x - 1, y + 10, 2, o.y - y - 10, '#1b1b28'); neonSign(g, x - 14, y, ['糖水', '冰室', '卡拉OK', '夜市', '當舖', '旅館'][((r() * 6) | 0)], r() < 0.5 ? '#ff4fb4' : '#37c3d6', false, o.s); },
      hunger(o) { const g = o.g, x = o.x - 14, y = o.y; P.rect(g, x, y - 18, 28, 18, '#5a3a2a'); P.rect(g, x - 2, y - 30, 32, 5, '#d6334a'); P.rect(g, x, y - 25, 1, 7, '#2a2a33'); P.rect(g, x + 27, y - 25, 1, 7, '#2a2a33'); P.glow(g, x + 14, y - 22, 16, '#ffe0a8', 0.7); for (let k = 0; k < 18; k++) P.disc(g, x + 10 + Math.sin(k * 0.6) * 3, y - 22 - k * 2, 1 + (k % 2), rgba('#f3eadb', 0.3)); person(g, x + 34, y, o.s * 0.9, '#ffc247', '#3a2b2b'); cat(g, x - 8, y, '#1b1b28'); },
    },
    atmo: {
      warmth(o) { for (let i = 0; i < 14; i++) { const x = o.x - 60 + i * 9, y = 140 + Math.sin(i * 0.8) * 6; P.rect(o.g, x, y, 1, 1, '#2a2a33'); P.glow(o.g, x, y + 2, 4, i % 2 ? '#ffd36b' : '#ff8a5b', 0.9); } },
      hope(o) { for (let i = 0; i < 30; i++) { const x = o.x - 60 + r() * 120, y = 20 + r() * 150; P.rect(o.g, x, y, 1, 1, '#fff6d8'); if (r() < 0.3) { P.rect(o.g, x - 1, y, 3, 1, rgba('#fff6d8', 0.6)); P.rect(o.g, x, y - 1, 1, 3, rgba('#fff6d8', 0.6)); } } },
      water(o) { for (let i = 0; i < 220; i++) { const x = r() * W, y = r() * H; P.line(o.g, x, y, x - 2, y + 6, rgba('#cfe9ff', 0.3)); } P.rect(o.g, 0, 0, W, H, 'rgba(40,60,90,0.12)'); },
      memory(o) { const g = o.g; for (let i = 0; i < 900; i++) P.rect(g, r() * W, r() * H, 1, 1, rgba(r() < 0.5 ? '#3a2a1a' : '#fff2d8', 0.1)); for (let k = 0; k < 18; k++) { g.fillStyle = rgba('#1a1006', 0.025); g.fillRect(k, k, W - 2 * k, H - 2 * k); } },
      rebel(o) { for (let i = 0; i < 7; i++) { const x = o.x - 50 + r() * 100, y = 40 + r() * 120; P.rect(o.g, x, y, 4, 3, i % 2 ? '#f3ead6' : '#ffc247'); P.rect(o.g, x + 1, y + 1, 2, 1, '#2a2a33'); } for (let i = 0; i < 2; i++) { const x = o.x - 30 + i * 60; P.rect(o.g, x, 150, 1, 20, '#2a2a33'); P.rect(o.g, x + 1, 150, 16, 9, i ? '#ff4fb4' : '#ffc247'); } },
      machine(o) { for (let i = 0; i < 6; i++) { const x = 30 + r() * 260, y = 20 + r() * 70; P.rect(o.g, x - 3, y, 7, 2, '#2a3436'); P.glow(o.g, x, y + 3, 5, i % 2 ? '#ff4d5e' : '#37c3d6', 0.9); } },
      guilt(o) { for (let y = 150; y < H; y += 2) { o.g.fillStyle = rgba('#c9d2e3', 0.05 + (y - 150) * 0.002); o.g.fillRect(0, y, W, 2); } },
      anger(o) { for (let i = 0; i < 60; i++) P.rect(o.g, r() * W, 40 + r() * 150, 1, 1, i % 3 ? '#ff8a3c' : '#ffd36b'); },
      neon(o) { for (let i = 0; i < 10; i++) { const x = o.x - 60 + r() * 120, y = HZ + 6 + r() * 50; P.rect(o.g, x, y, 5 + r() * 8, 1, rgba(i % 2 ? '#ff4fb4' : '#37c3d6', 0.7)); } for (let i = 0; i < 5; i++) P.glow(o.g, o.x - 50 + r() * 100, 20 + r() * 60, 3, i % 2 ? '#ff4fb4' : '#37c3d6', 0.8); },
      hunger(o) { for (let i = 0; i < 40; i++) P.disc(o.g, o.x + gauss() * 30, 160 - i * 3, 2, rgba('#f3eadb', 0.06)); cat(o.g, o.x + 40, 178, '#0e0e14'); },
    },
  };
  // ---------- 小物件 ----------
  function tenement(o, wall, light, prob, people, old) {
    const g = o.g, w = 34 + ((r() * 14) | 0), h = 56 + ((r() * 30) | 0) * o.s, x = o.x - w / 2, b = HZ + 8;
    P.rect(g, x, b - h, w, h, wall);
    P.rect(g, x - 2, b - h - 3, w + 4, 3, mix(wall, '#000000', 0.3));
    for (let yy = b - h + 5; yy < b - 6; yy += 8) {
      P.rect(g, x - 2, yy + 5, w + 4, 1, mix(wall, '#000000', 0.35));
      for (let xx = x + 3; xx < x + w - 5; xx += 7) {
        const on = r() < prob;
        P.rect(g, xx, yy, 4, 4, on ? light : mix(wall, '#000000', 0.4));
        if (on && people && r() < 0.35) P.rect(g, xx + 1, yy + 1, 2, 3, mix(wall, '#000000', 0.6));
      }
      if (old && r() < 0.5) { const lx = x + 2 + r() * (w - 12); P.line(g, lx, yy + 6, lx + 10, yy + 7, '#2a2018'); for (let k = 0; k < 3; k++) P.rect(g, lx + 2 + k * 3, yy + 7, 2, 3, ['#d6334a', '#37c3d6', '#f3ead6'][k]); }
    }
    for (let i = 0; i < 4; i++) P.rect(g, x + 2 + i * (w - 4) / 3, b, 2, 6, mix(wall, '#000000', 0.5));
  }
  function boat(g, x, y, s, light) {
    P.rect(g, x - 10 * s, y, 20 * s, 3, '#3a2a1e'); P.rect(g, x - 8 * s, y + 3, 16 * s, 2, '#2a1e14');
    P.rect(g, x - 3 * s, y - 6 * s, 7 * s, 6 * s, '#5a4030'); P.rect(g, x + 6 * s, y - 9 * s, 1, 9 * s, '#2a1e14');
    P.glow(g, x + 6 * s, y - 10 * s, 8, light, 0.8); P.rect(g, x + 5 * s, y - 11 * s, 3, 3, light);
  }
  function person(g, x, y, s, coat, dark, pose) {
    s = s || 1;
    const h = Math.round(26 * s), hw = Math.max(2, Math.round(4 * s));
    P.rect(g, x - hw, y - h * 0.55, hw * 2, h * 0.38, coat); // 身體
    P.rect(g, x - hw + 1, y - h * 0.18, hw - 1, h * 0.18, dark); P.rect(g, x + 1, y - h * 0.18, hw - 1, h * 0.18, dark); // 腿
    P.disc(g, x, y - h * 0.72, Math.max(2, Math.round(3.2 * s)), '#e9c7a4'); // 頭
    P.rect(g, x - Math.round(3.2 * s), y - h * 0.86, Math.round(6.4 * s), Math.max(1, Math.round(2 * s)), dark); // 頭髮
    if (pose === 'umbrella') { for (let k = -9; k <= 9; k++) { const yy = y - h - 6 * s + Math.round((k * k) / 18); P.rect(g, x + k * s, yy, Math.max(1, s), 2, '#d6334a'); } P.rect(g, x, y - h - 6 * s, 1, h * 0.5, '#2a2a33'); }
    if (pose === 'up') { P.line(g, x + hw, y - h * 0.5, x + hw + 4 * s, y - h * 0.9, coat, Math.max(1, s | 0)); }
    if (pose === 'fist') { P.line(g, x + hw, y - h * 0.5, x + hw + 2 * s, y - h * 0.95, coat, Math.max(1, s | 0)); P.disc(g, x + hw + 2 * s, y - h * 0.98, Math.max(1, Math.round(1.6 * s)), '#e9c7a4'); }
    if (pose === 'sit') { P.rect(g, x - hw, y - h * 0.2, hw * 3, h * 0.12, dark); }
  }
  function robot(g, x, y, s, metal, eye) {
    const h = 46 * s;
    P.rect(g, x - 9 * s, y - h, 18 * s, 14 * s, metal); P.rect(g, x - 6 * s, y - h + 4 * s, 4 * s, 3 * s, eye); P.rect(g, x + 2 * s, y - h + 4 * s, 4 * s, 3 * s, eye);
    P.glow(g, x, y - h + 6 * s, 10 * s, eye, 0.5);
    P.rect(g, x - 1, y - h - 6 * s, 2, 6 * s, metal); P.disc(g, x, y - h - 7 * s, 2, '#ff4d5e');
    P.rect(g, x - 12 * s, y - h + 16 * s, 24 * s, 18 * s, mix(metal, '#000000', 0.2)); P.rect(g, x - 4 * s, y - h + 21 * s, 8 * s, 5 * s, eye);
    P.rect(g, x - 16 * s, y - h + 17 * s, 4 * s, 14 * s, metal); P.rect(g, x + 12 * s, y - h + 17 * s, 4 * s, 14 * s, metal);
    P.rect(g, x - 9 * s, y - h + 34 * s, 6 * s, 12 * s, mix(metal, '#000000', 0.35)); P.rect(g, x + 3 * s, y - h + 34 * s, 6 * s, 12 * s, mix(metal, '#000000', 0.35));
  }
  function lamp(g, x, y, s, light) { P.rect(g, x, y - 34 * s, 2, 34 * s, '#2a2a33'); P.rect(g, x - 3, y - 36 * s, 8, 3, '#2a2a33'); P.glow(g, x + 1, y - 32 * s, 16, light, 0.8); P.rect(g, x - 1, y - 33 * s, 4, 2, light); }
  function bench(g, x, y, c) { P.rect(g, x - 14, y - 6, 28, 2, c); P.rect(g, x - 12, y - 4, 2, 4, c); P.rect(g, x + 10, y - 4, 2, 4, c); }
  function kite(g, x, y, c) { P.line(g, x, y - 6, x + 6, y, c); P.line(g, x + 6, y, x, y + 6, c); P.line(g, x, y + 6, x - 6, y, c); P.line(g, x - 6, y, x, y - 6, c); P.disc(g, x, y, 3, c); for (let i = 0; i < 30; i++) P.rect(g, x - i * 0.8, y + 6 + i * 1.6, 1, 1, rgba('#f3ead6', 0.6)); }
  function bird(g, x, y, c) { P.rect(g, x - 2, y, 2, 1, c); P.rect(g, x, y + 1, 1, 1, c); P.rect(g, x + 1, y, 2, 1, c); }
  function cat(g, x, y, c) { P.rect(g, x - 4, y - 5, 8, 5, c); P.rect(g, x + 3, y - 8, 4, 4, c); P.rect(g, x + 3, y - 9, 1, 1, c); P.rect(g, x + 6, y - 9, 1, 1, c); P.line(g, x - 4, y - 4, x - 8, y - 9, c); P.rect(g, x + 4, y - 7, 1, 1, '#ffd36b'); }
  function neonSign(g, x, y, text, c, vertical, s) {
    const size = Math.round(9 * (s || 1));
    g.save(); g.font = 'bold ' + size + 'px sans-serif'; g.textBaseline = 'top';
    const chars = vertical ? text.split('') : [text];
    const wmax = vertical ? size + 6 : Math.ceil(g.measureText(text).width) + 8, hmax = vertical ? chars.length * (size + 2) + 6 : size + 8;
    P.rect(g, x, y, wmax, hmax, '#0b0a18'); P.rect(g, x, y, wmax, 1, c); P.rect(g, x, y + hmax - 1, wmax, 1, c); P.rect(g, x, y, 1, hmax, c); P.rect(g, x + wmax - 1, y, 1, hmax, c);
    g.shadowColor = c; g.shadowBlur = 6; g.fillStyle = mix(c, '#ffffff', 0.45);
    chars.forEach((ch, i) => g.fillText(ch, x + 4, y + 4 + (vertical ? i * (size + 2) : 0)));
    g.restore();
    P.glow(g, x + wmax / 2, y + hmax / 2, Math.max(wmax, hmax), c, 0.25);
  }
  // 碼頭：第三筆開始，人物站在上面
  function pier(g, M) { for (let y = 178; y < H; y++) { g.fillStyle = mix('#2a2018', '#100c08', (y - 178) / 22); g.fillRect(0, y, W, 1); } for (let x = 0; x < W; x += 12) P.rect(g, x, 178, 1, 22, '#1a140e'); P.rect(g, 0, 176, W, 2, mix('#3a3028', M.light, 0.15)); for (let x = 6; x < W; x += 40) { P.rect(g, x, 166, 2, 12, '#1a140e'); } P.rect(g, 0, 166, W, 1, '#1a140e'); }

  // 一筆的構圖：每張素材畫哪一樣、畫在哪裏
  // play = { cards, roles, links, he, ring（第幾筆）, subject: { main, second } }
  function planPlay(play) {
    const k = Math.min(3, play.ring || 0), layer = ['far', 'mid', 'focal', 'atmo'][k];
    const n = play.cards.length, list = [], plans = {};
    const main = (play.subject && play.subject.main) || play.cards[0].tags[0];
    if (k === 0 && !mood) mood = Object.assign({}, MOODS[main] || MOODS.warmth);
    const M = mood || MOODS.warmth;
    play.cards.forEach((c, i) => {
      const role = play.roles[i] || 'cheng';
      const tag = c.tags[i % c.tags.length] && ELEM[layer][c.tags[0]] ? c.tags[0] : c.tags[c.tags.length - 1];
      const t2 = c.tags[1] || null;
      const hero = role === 'zhuan' || role === 'zhuanhe';
      const x = n === 1 ? W / 2 : 28 + (i / (n - 1)) * (W - 56) + gauss() * 6;
      const y = layer === 'focal' ? 176 : layer === 'mid' ? HZ + 8 : HZ;
      const s = (hero ? 1.35 : 1) * (0.85 + c.star * 0.06);
      const seed = (r() * 1e9) | 0;
      const plan = { uid: c.uid, layer, at: [x, layer === 'focal' ? y - 20 : layer === 'atmo' ? 100 : y - 20], draw: (g) => {
        const save = r; r = IE.Proto2.rng(seed);
        if (k === 0 && i === 0 && !layers.__sky) { paintSky(M); layers.__sky = true; sketch = false; }
        if (k === 2 && !layers.__pier) { pier(layers.focal.g, M); layers.__pier = true; }
        const fn = ELEM[layer][tag] || ELEM[layer].warmth;
        const once = (key) => { if (layers['__' + key]) return false; layers['__' + key] = true; return true; };
        fn({ g, x, y, s, c: col(tag), M, hero, once });
        // 第二種情緒：在旁邊加一點它的顏色（燈、光暈）
        if (t2 && t2 !== tag && (layer === 'mid' || layer === 'focal')) { const lx = x + (i % 2 ? -12 : 12), ly = y - (layer === 'focal' ? 30 : layer === 'mid' ? 34 : 22) - ((r() * 10) | 0); P.rect(g, lx, ly, 2, 2, mix(col(t2), '#ffffff', 0.4)); P.glow(g, lx + 1, ly + 1, 6, col(t2), 0.6); }
        if (role === 'he' || role === 'zhuanhe') P.glow(g, x, y - 26, 14, M.light, 0.3);
        r = save;
      } };
      plans[c.uid] = plan; list.push(plan);
    });
    // 合：整幅畫亮一點（月光或燈光灑下來）
    let close = null;
    if (play.he && list.length >= 3) close = { uid: 'he', layer: 'atmo', at: [W / 2, 60], draw: (g) => { for (let y = 0; y < HZ; y++) { g.fillStyle = rgba(M.light, 0.05 * (1 - y / HZ)); g.fillRect(0, y, W, 1); } for (let i = 0; i < 8; i++) { const x = (Math.sin(i * 7.3 + k) * 0.5 + 0.5) * W, y = 8 + (i * 11) % 50; g.fillStyle = rgba('#ffffff', 0.7); g.fillRect(x | 0, y, 1, 1); } } };
    return { plans, list, close };
  }
  // 逐步畫出（ms 毫秒）：先畫在暫存的畫布，再一格格顯現；ms 為 0 即時畫完
  function drawPlan(plan, ms) {
    return new Promise((resolve) => {
      if (!plan || !layers) { resolve(); return; }
      const tmp = mk();
      if (plan.draw) plan.draw(tmp.g);
      const target = layers[plan.layer].g;
      if (ms <= 0) { target.drawImage(tmp.c, 0, 0); composite(); resolve(); return; }
      const T = 8, cells = []; for (let y = 0; y < H; y += T) for (let x = 0; x < W; x += T) cells.push([x, y]);
      // 由這張素材的位置向外擴散
      const ax = plan.at[0], ay = plan.at[1];
      cells.sort((a, b) => Math.hypot(a[0] - ax, a[1] - ay) - Math.hypot(b[0] - ax, b[1] - ay));
      const start = performance.now();
      let done = 0;
      const step = (now) => {
        const k = Math.min(1, (now - start) / ms);
        const upto = Math.round(k * cells.length);
        for (; done < upto; done++) { const [x, y] = cells[done]; target.drawImage(tmp.c, x, y, T, T, x, y, T, T); }
        composite();
        if (k < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
  }
  // 裝飾（不影響重播的主要畫面）
  function glint(n, color) { if (!layers) return; const g = layers.atmo.g; for (let i = 0; i < (n || 40); i++) { const x = (Math.random() * W) | 0, y = (Math.random() * H) | 0; g.fillStyle = color || 'rgba(255,214,90,0.8)'; g.fillRect(x, y, 1, 1); } composite(); }
  function spray(at, color) { if (!layers) return; const g = layers.atmo.g, x0 = at ? at[0] : W / 2, y0 = at ? at[1] : H / 2; for (let i = 0; i < 120; i++) { const a = Math.random() * Math.PI * 2, d = Math.pow(Math.random(), 0.6) * 18; g.fillStyle = rgba(color || '#ff4fb4', 0.6); g.fillRect((x0 + Math.cos(a) * d) | 0, (y0 + Math.sin(a) * d * 0.7) | 0, 1, 1); } composite(); }
  function strike(at) { if (!layers) return; const g = layers.atmo.g, x = at ? at[0] | 0 : 160, y = at ? at[1] | 0 : 100; for (let i = -12; i < 12; i++) { g.fillStyle = 'rgba(70,70,80,0.6)'; g.fillRect(x + i, y + (i >> 2), 2, 2); } composite(); }
  function sign(text) { composite(); cx.save(); cx.fillStyle = 'rgba(255,255,255,0.55)'; cx.font = '8px monospace'; cx.textAlign = 'right'; cx.fillText(text || '', W - 6, H - 6); cx.restore(); }
  function snapshot() { return cv.toDataURL('image/png'); }
  function screenPoint(p) { const b = cv.getBoundingClientRect(); return { x: b.left + (p[0] / W) * b.width, y: b.top + (p[1] / H) * b.height }; }

  IE.Painter = { W, H, init, blank, planPlay, drawPlan, glint, spray, strike, sign, snapshot, screenPoint, MOODS };
})(typeof window !== 'undefined' ? window : globalThis);
