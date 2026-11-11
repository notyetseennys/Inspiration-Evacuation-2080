// 創作之夜第五版的畫：用製作人的素材即時組成「玩家的畫」（規則同 tools/art-night-compose.py）。
// 一晚四筆 = 四層：天空和遠景 → 中景（起、轉、合三座）→ 碼頭上一排小場景（起、轉、合三格 + 出過手的夥伴）→ 前景框。
// 光暈、水面的燈影、倒影、水波、雨、霓虹閃爍由程式做；「合」令燈更亮；三筆完整的起承轉合裱金框。
// 對外的介面和第四版的 painter.js 相同，night.js 不用知道畫是怎樣來的。
(function (root) {
  'use strict';
  const IE = root.IE = root.IE || {};
  const W = 960, H = 600, HORIZON = 340, WATER_TOP = 412;
  const WHEEL = ['warmth', 'hope', 'water', 'memory', 'rebel', 'machine', 'guilt', 'anger', 'neon', 'hunger'];
  const FAR = { warmth: 'old', hunger: 'old', neon: 'neon', anger: 'neon', machine: 'industry', rebel: 'industry', hope: 'sky', memory: 'drowned', water: 'drowned', guilt: 'ruin' };
  // 前景只用上方和兩側的款式；欄杆、船頭、觀眾在下方會遮住前排
  const FRONT = { warmth: 'lanterns', hope: 'leaves', water: 'rainglass', memory: 'window', rebel: 'cables', machine: 'cables', guilt: 'window', anger: 'curtain', neon: 'neonframe', hunger: 'laundry' };
  const A = () => IE.ART || { a: {}, sky: {}, base: 'art/' };
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // ---------- 素材 ----------
  const cache = {};
  function asset(name) {
    if (cache[name]) return cache[name];
    const o = cache[name] = { im: new Image(), ok: false, glow: null, refl: null };
    o.p = new Promise((res) => { o.im.onload = () => { o.ok = true; res(o); }; o.im.onerror = () => res(o); });
    o.im.src = (A().base || 'art/') + name + '.webp';
    return o;
  }
  const src = (name) => (A().base || 'art/') + name + '.webp';
  // 發光的像素：亮而且有顏色（窗、燈籠、霓虹、火），或者接近白色。縮到四分之一，放大時自然變成光暈。
  function glowOf(o) {
    if (o.glow || !o.ok) return o.glow;
    const w = Math.max(1, o.im.width >> 2), h = Math.max(1, o.im.height >> 2);
    const c = mk(w, h), g = c.getContext('2d');
    g.drawImage(o.im, 0, 0, w, h);
    try {
      const d = g.getImageData(0, 0, w, h), p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        const r = p[i], gg = p[i + 1], b = p[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
        const lum = 0.299 * r + 0.587 * gg + 0.114 * b;
        const hot = (mx > 205 && (mx - mn) / (mx + 1) > 0.3 && lum > 128) || lum > 225;
        if (!hot || p[i + 3] < 128) p[i + 3] = 0;
      }
      g.putImageData(d, 0, 0);
    } catch (e) { g.clearRect(0, 0, w, h); }
    o.glow = c;
    return c;
  }
  // 倒影：上下翻轉、調暗、越遠越淡
  function reflOf(o) {
    if (o.refl || !o.ok) return o.refl;
    const c = mk(o.im.width, o.im.height), g = c.getContext('2d');
    g.translate(0, c.height); g.scale(1, -1); g.drawImage(o.im, 0, 0); g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(6,10,24,0.5)'; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'destination-in';
    const gr = g.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, 'rgba(0,0,0,0.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
    o.refl = c;
    return c;
  }

  // 一張卡在畫裏用哪一張圖：兩種情緒 = 小景；一種情緒 = 主角。同一張卡永遠同一張圖、同一個方向。
  function faceOf(card) {
    const D = IE.DATA, def = D.CARDS[card.id] || {};
    if (card.tags.length >= 2) {
      const t = card.tags.slice(0, 2).sort((a, b) => WHEEL.indexOf(a) - WHEEL.indexOf(b));
      const n = 'np-duo-' + t[0] + '-' + t[1];
      if (t[0] !== t[1] && A().a[n]) return n;
    }
    return def.face || 'np-focal-' + card.tags[0] + '-' + (hash(card.id) % 3 + 1);
  }
  const midOf = (card) => { const def = IE.DATA.CARDS[card.id] || {}; return def.mid || 'np-mid-' + card.tags[0] + '-' + (hash(card.id) % 3 + 1); };
  const flipOf = (card) => (hash(card.id + 'flip') & 1) === 1;
  const isZ = (r) => r === 'zhuan' || r === 'zhuanhe';
  function pick3(n, roles) {
    if (n <= 3) return Array.from({ length: n }, (_, i) => i);
    let z = roles.findIndex(isZ); if (z < 0) z = n >> 1;
    return [...new Set([0, Math.min(Math.max(z, 1), n - 2), n - 1])].sort((a, b) => a - b);
  }

  // ---------- 場景 ----------
  let sc = null, signText = '', seed0 = 1;
  const targets = new Set();
  let raf = 0, lastT = 0;
  const main = mk(W, H), layer = mk(W, H), glowC = mk(W >> 2, H >> 2), waterC = mk(W, H - WATER_TOP);
  let vig = null;
  // opts.flood：0 至 1，水位（越高，水越接近建築和碼頭）；opts.cold：寒潮（下雪、水面結冰）
  function blank(seed, opts) {
    seed0 = seed || 1;
    const o = opts || {};
    sc = { flood: Math.max(0, Math.min(1, o.flood || 0)), cold: !!o.cold, snow: [], cracks: null, bolt: 0, nextBolt: 4, glints: [], sky: null, skyA: 0, far: [], mids: [], bays: [], pier: 'np-stage-pier-' + (seed0 % 3 + 1), pierA: 0, front: null, frontA: 0, lights: 0.4, lightsTo: 0.4,
      fulls: 0, gold: 0, rain: false, sparks: [], marks: [], drops: [] };
    signText = '';
    asset(sc.pier);
    loop();
  }
  function init(canvas) { canvas.width = W; canvas.height = H; targets.clear(); targets.add(canvas); if (!sc) blank(1); preload(); loop(); }
  function attach(canvas) { canvas.width = W; canvas.height = H; targets.add(canvas); loop(); }
  function detach(canvas) { targets.delete(canvas); }
  // 先載入今晚一定用到的（天空以外的小圖），其餘用到才載入
  let preloaded = false;
  function preload() {
    if (preloaded) return; preloaded = true;
    const names = Object.keys(A().a).filter((n) => /^np-(far|stage|front)/.test(n));
    let i = 0;
    const next = () => { if (i < names.length) asset(names[i++]).p.then(next); };
    next(); next();
  }

  // 一筆的構圖：回傳每張素材在畫上的位置和「畫出來」的方法
  function planPlay(play) {
    const cards = play.cards, roles = play.roles || [], n = cards.length, ring = Math.min(3, play.ring || 0);
    const main0 = (play.subject && play.subject.main) || cards[0].tags[0];
    const second = (play.subject && play.subject.second) || main0;
    const plans = {}, list = [];
    const add = (c, at, step) => { const p = { at, step }; plans[c.uid] = p; list.push(p); return p; };
    if (ring === 0) {
      const sky = 'np-sky-' + main0 + '-' + (roles.some(isZ) ? 2 : 1);
      sc.sky = sky; sc.rain = sky === 'np-sky-water-1'; asset(sky);
      sc.far = [{ name: 'np-far-' + FAR[second], h: 46, a: 0, haze: 0.5 }, { name: 'np-far-' + FAR[main0], h: 72, a: 0, haze: 0.25 }];
      sc.far.forEach((f) => asset(f.name));
      cards.forEach((c, i) => add(c, [W * (i + 1) / (n + 1), 150 + (i % 2) * 50], (k) => {
        sc.skyA = Math.max(sc.skyA, (i + k) / n);
        if (i === n - 1) sc.far.forEach((f) => { f.a = k; });
      }));
    } else if (ring === 1) {
      const idx = pick3(n, roles), xs = idx.length > 1 ? idx.map((_, j) => 170 + j * (W - 340) / (idx.length - 1)) : [W / 2];
      const used = new Set();
      cards.forEach((c, i) => {
        const j = idx.indexOf(i);
        if (j < 0) { const near = xs[Math.min(xs.length - 1, Math.round(i * (xs.length - 1) / Math.max(1, n - 1)))]; add(c, [near, 300], () => {}); return; }
        let name = midOf(c);
        for (let t = 1; used.has(name) && t <= 3; t++) name = 'np-mid-' + c.tags[0] + '-' + ((hash(c.id) + t) % 3 + 1);
        used.add(name);
        const m = A().a[name] || {}, z = isZ(roles[i]);
        const el = { name, x: xs[j], base: 392 + 14 * (j % 2) - (m.fl ? 30 : 0), s: z ? 1 : 0.87, flip: flipOf(c), fl: !!m.fl, a: 0 };
        asset(name); sc.mids.push(el);
        add(c, [el.x, el.base - (m.h || 150) * el.s * 0.5], (k) => { el.a = k; });
      });
    } else if (ring === 2) {
      const idx = pick3(n, roles);
      const cells = idx.map((i) => ({ c: cards[i], name: faceOf(cards[i]), z: isZ(roles[i]), flip: flipOf(cards[i]) }));
      const mate = (play.mates || []).find((id) => A().a['np-mate-' + id]);
      if (mate) cells.splice(Math.max(1, cells.length - 1), 0, { c: null, name: 'np-mate-' + mate, z: false, flip: false });
      let total = 0;
      cells.forEach((b) => { const m = A().a[b.name] || { w: 240, h: 262 }; b.s = b.z ? 1 : 0.85; b.w = m.w * b.s; b.h = m.h * b.s; total += b.w * 0.94; asset(b.name); });
      const kx = Math.min(1, (W - 20) / total);
      let x = (W - total * kx) / 2;
      cells.forEach((b) => { b.w *= kx; b.h *= kx; b.x = x; x += b.w * 0.94; b.a = 0; sc.bays.push(b); });
      const mateEl = cells.find((b) => !b.c);
      cards.forEach((c, i) => {
        const b = cells.find((q) => q.c === c);
        const at = b ? [b.x + b.w / 2, H - b.h * 0.6] : [W * (i + 1) / (n + 1), H - 150];
        add(c, at, (k) => { if (i === 0) sc.pierA = Math.max(sc.pierA, k); if (b) b.a = k; if (mateEl && i === n - 1) mateEl.a = k; });
      });
    } else {
      sc.front = 'np-front-' + FRONT[main0]; asset(sc.front);
      cards.forEach((c, i) => add(c, [W * (i + 1) / (n + 1), 70], (k) => { sc.frontA = Math.max(sc.frontA, (i + k) / n); }));
    }
    const fullNow = !!play.full;
    const close = play.he ? { at: [W / 2, H / 2], step: (k) => {
      sc.lights = Math.max(sc.lights, Math.min(1, sc.lightsTo + 0.2 * k));
      if (k >= 1) { sc.lightsTo = Math.min(1, sc.lightsTo + 0.2); if (fullNow && !close.done) { close.done = true; sc.fulls += 1; } }
    } } : null;
    if (!play.he && fullNow) sc.fulls += 1;
    return { plans, list, close };
  }
  // 畫出一張素材（ms 毫秒內由無到有）
  function drawPlan(plan, ms) {
    return new Promise((res) => {
      if (!plan || !plan.step) { res(); return; }
      if (!ms) { plan.step(1); loop(); res(); return; }
      const t0 = performance.now();
      const tick = () => {
        const k = Math.min(1, (performance.now() - t0) / ms);
        plan.step(1 - Math.pow(1 - k, 3));
        if (k < 1) requestAnimationFrame(tick); else { puff(plan.at); res(); }
      };
      tick(); loop();
    });
  }

  // ---------- 每一格 ----------
  function tile(g, name, y, h, a, haze, amb) {
    const o = asset(name); if (!o.ok || a <= 0) return;
    const s = h / o.im.height, w = o.im.width * s;
    g.globalAlpha = a;
    for (let x = -(hash(name) % Math.max(1, w | 0)); x < W; x += w - 2) g.drawImage(o.im, x, y - h, w, h);
    g.globalAlpha = 1;
  }
  function drawItem(g, o, x, y, w, h, flip, a) {
    if (!o.ok || a <= 0) return;
    g.globalAlpha = Math.min(1, a * 1.2);
    const dy = (1 - a) * 14;
    if (flip) { g.save(); g.translate(x + w, y + dy); g.scale(-1, 1); g.drawImage(o.im, 0, 0, w, h); g.restore(); } else g.drawImage(o.im, x, y + dy, w, h);
    g.globalAlpha = 1;
  }
  function frame(t, still) {
    const g = main.getContext('2d'), s = sc;
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    // 白紙：未落筆的草稿
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#10131f'); bg.addColorStop(1, '#0a0c16');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    if (s.skyA < 1) {
      g.strokeStyle = 'rgba(160,175,210,0.16)'; g.lineWidth = 1; g.setLineDash([6, 8]);
      g.beginPath(); g.moveTo(40, HORIZON); g.lineTo(W - 40, HORIZON); g.moveTo(40, H - 104); g.lineTo(W - 40, H - 104); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(160,175,210,0.28)'; g.font = '16px "Noto Sans TC", sans-serif'; g.textAlign = 'center';
      [['第一筆：天空和遠景', 180], ['第二筆：海上的建築', HORIZON + 44], ['第三筆：碼頭上的人和事', H - 52]].forEach((q) => g.fillText(q[0], W / 2, q[1]));
    }
    const amb = (s.sky && A().sky[s.sky]) || [40, 46, 70];
    const sky = s.sky ? asset(s.sky) : null;
    if (sky && sky.ok && s.skyA > 0) {
      const pan = still ? 0 : Math.sin(t * 0.06) * 9;
      g.globalAlpha = s.skyA; g.drawImage(sky.im, -14 + pan, -6, W + 28, H + 12);
      // 天色在水面的倒影
      if (!sky.band) {
        const c = mk(W, 140), q = c.getContext('2d');
        q.translate(0, 140); q.scale(1, -1); q.drawImage(sky.im, 0, HORIZON - 140, W, 140, 0, 0, W, 140); q.setTransform(1, 0, 0, 1, 0, 0);
        q.globalCompositeOperation = 'destination-in';
        const gr = q.createLinearGradient(0, 0, 0, 140); gr.addColorStop(0, 'rgba(0,0,0,0.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        q.fillStyle = gr; q.fillRect(0, 0, W, 140); sky.band = c;
      }
      g.drawImage(sky.band, 0, HORIZON);
      g.globalAlpha = 1;
    }
    // 遠景兩排
    s.far.forEach((f) => tile(g, f.name, HORIZON + 3, f.h, f.a * (1 - f.haze * 0.5)));
    // 中景：倒影 → 建築（按天色統一色調）
    const lg = layer.getContext('2d');
    if (s.mids.length) {
      s.mids.forEach((m) => { const o = asset(m.name); if (!o.ok || m.fl || m.a <= 0) return; const r = reflOf(o), w = o.im.width * m.s, h = o.im.height * m.s; g.globalAlpha = m.a; g.drawImage(r, m.x - w / 2, m.base, w, h); g.globalAlpha = 1; });
      lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, W, H);
      s.mids.forEach((m, mi) => { const o = asset(m.name); if (!o.ok) return; const w = o.im.width * m.s, h = o.im.height * m.s; const bob = still ? 0 : m.fl ? Math.sin(t * 1.3 + mi) * 4 : Math.sin(t * 0.9 + mi * 2) * 0.8; drawItem(lg, o, m.x - w / 2, m.base - h + bob, w, h, m.flip, m.a); });
      lg.globalCompositeOperation = 'source-atop'; lg.fillStyle = 'rgba(' + amb[0] + ',' + amb[1] + ',' + amb[2] + ',0.2)'; lg.fillRect(0, 0, W, H);
      g.drawImage(layer, 0, 0);
    }
    // 光暈（四分之一大小，放大就是柔和的光）和水面的燈影
    const gg = glowC.getContext('2d');
    gg.globalCompositeOperation = 'source-over'; gg.clearRect(0, 0, glowC.width, glowC.height);
    s.mids.forEach((m) => {
      const o = asset(m.name); if (!o.ok || m.a <= 0) return; const gl = glowOf(o); if (!gl) return;
      const w = o.im.width * m.s / 4, h = o.im.height * m.s / 4, x = (m.x) / 4 - w / 2, y = m.base / 4 - h;
      gg.globalAlpha = m.a; gg.drawImage(gl, x, y, w, h);
      if (!m.fl) { gg.globalAlpha = m.a * 0.55; gg.save(); gg.translate(0, m.base / 4); gg.scale(1, -1.8); gg.drawImage(gl, x, -h, w, h); gg.restore(); }
    });
    gg.globalAlpha = 1;
    // 水波：水面按行左右移
    if (!s.cold) {
      const wc = waterC.getContext('2d');
      wc.clearRect(0, 0, W, H - WATER_TOP); wc.drawImage(main, 0, WATER_TOP, W, H - WATER_TOP, 0, 0, W, H - WATER_TOP);
      for (let y = 0; y < H - WATER_TOP; y += 3) {
        const d = y / (H - WATER_TOP), dx = Math.sin(y * 0.21 + t * 2.2) * (0.6 + d * 2.6) + Math.sin(y * 0.05 - t * 1.1) * d * 1.6;
        g.drawImage(waterC, 0, y, W, 3, dx, WATER_TOP + y, W, 3);
      }
    }
    // 水位：水漲上來，淹過高腳和碼頭的下半（每晚更高）
    if (s.flood > 0 && s.skyA > 0.3) {
      const rise = Math.round(s.flood * 36), top = 404 - rise;
      const wg = g.createLinearGradient(0, top, 0, 404 + 10);
      const dark = 'rgba(' + Math.round(amb[0] * 0.35) + ',' + Math.round(amb[1] * 0.42) + ',' + Math.round(amb[2] * 0.55 + 14) + ',';
      wg.addColorStop(0, dark + '0.62)'); wg.addColorStop(1, dark + '0.0)');
      g.globalAlpha = s.skyA; g.fillStyle = wg; g.fillRect(0, top, W, rise + 14);
      g.fillStyle = 'rgba(220,240,255,0.28)';
      for (let x = 0; x < W; x += 6) { const yy = top + Math.sin(x * 0.06 + t * 1.8) * 1.4; g.fillRect(x, yy, 4, 1); }
      g.globalAlpha = 1;
    }
    // 寒潮：水面結冰（不再有水波），冰上有裂紋
    if (s.cold && s.skyA > 0.3) {
      const top = 404 - Math.round(s.flood * 36);
      g.fillStyle = 'rgba(200,228,255,' + (0.2 * s.skyA) + ')'; g.fillRect(0, top, W, H - top);
      if (!s.cracks) { s.cracks = []; let r = seed0 * 9301 + 49297; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280; for (let i = 0; i < 26; i++) { const x = rnd() * W, y = top + 10 + rnd() * (H - top - 120), n = 3 + (rnd() * 4 | 0), pts = [[x, y]]; for (let k = 0; k < n; k++) pts.push([pts[k][0] + (rnd() - 0.5) * 90, pts[k][1] + (rnd() - 0.3) * 14]); s.cracks.push(pts); } }
      g.strokeStyle = 'rgba(235,246,255,' + (0.3 * s.skyA) + ')'; g.lineWidth = 1; g.beginPath();
      s.cracks.forEach((pts) => { g.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((q) => g.lineTo(q[0], q[1])); });
      g.stroke();
    } else if (!still && s.skyA > 0.5) {
      // 波光：水面上一閃一閃的短橫線
      if (s.glints.length < 46) s.glints.push({ x: Math.random() * W, y: 414 + Math.random() * (H - 414 - 100), l: 0, w: 6 + Math.random() * 16 });
      s.glints = s.glints.filter((q) => q.l < 1);
      s.glints.forEach((q) => { q.l += 0.035; g.fillStyle = 'rgba(255,255,255,' + (0.3 * Math.sin(q.l * 3.14159)) + ')'; g.fillRect(q.x, q.y, q.w, 1); });
    }
    // 碼頭和前排的小場景
    if (s.pierA > 0 || s.bays.length) {
      lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, W, H);
      tile(lg, s.pier, H, 110, s.pierA);
      s.bays.filter((b) => !b.z).concat(s.bays.filter((b) => b.z)).forEach((b) => { const o = asset(b.name); drawItem(lg, o, b.x, H + 2 - b.h, b.w, b.h, b.flip, b.a); });
      lg.globalCompositeOperation = 'source-atop'; lg.fillStyle = 'rgba(' + amb[0] + ',' + amb[1] + ',' + amb[2] + ',0.13)'; lg.fillRect(0, 0, W, H);
      g.drawImage(layer, 0, 0);
      if (s.flood > 0.55 && s.pierA > 0) {
        const hgt = Math.round((s.flood - 0.5) * 44), y0 = H - hgt;
        const pg = g.createLinearGradient(0, y0, 0, H); pg.addColorStop(0, 'rgba(20,46,78,0.0)'); pg.addColorStop(0.35, 'rgba(20,46,78,0.5)'); pg.addColorStop(1, 'rgba(12,30,56,0.72)');
        g.globalAlpha = s.pierA; g.fillStyle = pg; g.fillRect(0, y0, W, hgt);
        g.fillStyle = s.cold ? 'rgba(235,246,255,0.45)' : 'rgba(220,240,255,0.3)';
        for (let x = 0; x < W; x += 7) g.fillRect(x, y0 + hgt * 0.35 + (s.cold ? 0 : Math.sin(x * 0.05 + t * 2.1) * 1.5), 5, 1);
        g.globalAlpha = 1;
      }
      s.bays.forEach((b) => {
        const o = asset(b.name); if (!o.ok || b.a <= 0) return; const gl = glowOf(o); if (!gl) return;
        gg.globalAlpha = b.a * 0.4;
        if (b.flip) { gg.save(); gg.translate((b.x + b.w) / 4, (H + 2 - b.h) / 4); gg.scale(-1, 1); gg.drawImage(gl, 0, 0, b.w / 4, b.h / 4); gg.restore(); } else gg.drawImage(gl, b.x / 4, (H + 2 - b.h) / 4, b.w / 4, b.h / 4);
      });
      gg.globalAlpha = 1;
      // 「轉」的聚光
      const zb = s.bays.find((b) => b.z && b.a > 0);
      if (zb) {
        const cx = zb.x + zb.w / 2, cy = H - zb.h * 0.5, r = zb.w * 0.9;
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, 'rgba(255,236,200,' + (0.16 * zb.a) + ')'); gr.addColorStop(1, 'rgba(255,236,200,0)');
        g.globalCompositeOperation = 'screen'; g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2); g.globalCompositeOperation = 'source-over';
      }
    }
    // 疊上光暈：慢慢呼吸，偶然閃一下
    const fl = 0.9 + 0.1 * Math.sin(t * 2.7) - (Math.sin(t * 0.83) > 0.992 ? 0.5 : 0);
    g.globalCompositeOperation = 'screen'; g.globalAlpha = Math.max(0, Math.min(1, s.lights * fl));
    g.imageSmoothingEnabled = true; g.drawImage(glowC, 0, 0, W, H); g.globalAlpha *= 0.6; g.drawImage(glowC, -6, -6, W + 12, H + 12);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    // 前景框
    if (s.front && s.frontA > 0) { const o = asset(s.front); if (o.ok) { g.globalAlpha = s.frontA; g.drawImage(o.im, 0, 0, W, H); g.globalAlpha = 1; } }
    // 雨
    if (s.rain && s.skyA > 0.5) {
      if (!s.drops.length) for (let i = 0; i < 170; i++) s.drops.push({ x: Math.random() * (W + 120), y: Math.random() * H, v: 520 + Math.random() * 300, l: 9 + Math.random() * 13 });
      g.strokeStyle = 'rgba(200,220,240,0.34)'; g.lineWidth = 1; g.beginPath();
      s.drops.forEach((d) => { if (!still) { d.y += d.v / 20; d.x -= d.v / 20 * 0.2; if (d.y > H) { d.y = -20; d.x = Math.random() * (W + 120); } } g.moveTo(d.x, d.y); g.lineTo(d.x + d.l * 0.2, d.y - d.l); });
      g.stroke();
    }
    // 閃電：戲劇性的風暴天空偶然一閃，全畫亮一下
    if (!still && s.sky && /-(anger|rebel)-2$/.test(s.sky) && s.skyA > 0.9) {
      if (t > s.nextBolt) { s.bolt = 1; s.nextBolt = t + 5 + Math.random() * 8; }
      if (s.bolt > 0) { g.fillStyle = 'rgba(255,240,235,' + (0.22 * s.bolt) + ')'; g.fillRect(0, 0, W, H); s.bolt -= 0.22; }
    }
    // 寒潮：雪，比雨慢，左右飄；全畫偏冷
    if (s.cold && s.skyA > 0.3) {
      g.fillStyle = 'rgba(160,200,255,0.07)'; g.fillRect(0, 0, W, H);
      if (!s.snow.length) for (let i = 0; i < 150; i++) s.snow.push({ x: Math.random() * W, y: Math.random() * H, v: 0.6 + Math.random() * 1.4, r: 1 + Math.random() * 2.2, p: Math.random() * 6.283 });
      s.snow.forEach((f) => { if (!still) { f.y += f.v; f.x += Math.sin(t * 0.8 + f.p) * 0.5; if (f.y > H) { f.y = -4; f.x = Math.random() * W; } } g.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.3 * Math.sin(f.p)) + ')'; g.fillRect(f.x, f.y, f.r, f.r); });
    }
    // 火花、記號
    s.marks.forEach((m) => { g.strokeStyle = 'rgba(224,70,70,0.85)'; g.lineWidth = 5; g.beginPath(); g.moveTo(m[0] - 22, m[1] - 22); g.lineTo(m[0] + 22, m[1] + 22); g.moveTo(m[0] + 22, m[1] - 22); g.lineTo(m[0] - 22, m[1] + 22); g.stroke(); });
    s.sparks = s.sparks.filter((p) => p.life > 0);
    s.sparks.forEach((p) => { if (!still) { p.life -= 0.05; p.x += p.vx; p.y += p.vy; } g.fillStyle = p.c; g.globalAlpha = Math.max(0, p.life); g.fillRect(p.x, p.y, p.r, p.r); });
    g.globalAlpha = 1;
    // 暗角
    if (!vig) { vig = mk(W, H); const q = vig.getContext('2d'); const gr = q.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.72); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.42)'); q.fillStyle = gr; q.fillRect(0, 0, W, H); }
    g.drawImage(vig, 0, 0);
    if (signText) { g.fillStyle = 'rgba(255,255,255,0.6)'; g.font = '15px "Noto Sans TC", sans-serif'; g.textAlign = 'right'; g.fillText(signText, W - 18, H - 14); }
  }
  function present(cv) {
    const g = cv.getContext('2d');
    const gold = sc.fulls >= 3 && A().gold ? asset('np-front-frame-gold') : null;
    if (gold && gold.ok) {
      const q = A().gold, pad = 6;
      g.fillStyle = '#120e0a'; g.fillRect(0, 0, W, H);
      g.drawImage(main, q[0] - pad, q[1] - pad, q[2] - q[0] + 2 * pad, q[3] - q[1] + 2 * pad);
      g.drawImage(gold.im, 0, 0, W, H);
    } else if (cv !== [...targets][0] && lastT) {
      const z = 1.03 + 0.03 * Math.sin(lastT / 1000 * 0.25);
      g.drawImage(main, (W - W * z) / 2, (H - H * z) / 2, W * z, H * z);
    } else g.drawImage(main, 0, 0);
  }
  function loop() {
    if (raf || typeof requestAnimationFrame === 'undefined') return;
    const step = (now) => {
      raf = 0;
      if (!targets.size || !sc) return;
      if (now - lastT > 45) { lastT = now; frame(now / 1000, false); targets.forEach(present); }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  // 一張素材畫好的一刻：一圈細碎的光
  function puff(at) { if (!sc || !at) return; for (let i = 0; i < 16; i++) { const a = Math.random() * 6.283, v = 1 + Math.random() * 2.2; sc.sparks.push({ x: at[0], y: at[1], vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, r: 2 + Math.random() * 2, life: 0.5 + Math.random() * 0.4, c: i % 3 ? '#fff3c4' : '#ffd65a' }); } }
  function glint(n) { if (!sc) return; for (let i = 0; i < (n || 40) / 2; i++) sc.sparks.push({ x: Math.random() * W, y: Math.random() * H * 0.8, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2, r: 2 + Math.random() * 3, life: 0.6 + Math.random() * 0.6, c: '#ffd65a' }); }
  function spray(at, color) { if (!sc) return; const x = at ? at[0] : W / 2, y = at ? at[1] : H / 2; for (let i = 0; i < 40; i++) sc.sparks.push({ x: x + (Math.random() - 0.5) * 60, y: y + (Math.random() - 0.5) * 60, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, r: 3 + Math.random() * 4, life: 1, c: color || '#ff4fb4' }); }
  function strike(at) { if (sc) sc.marks.push(at ? [at[0], at[1]] : [W / 2, H / 2]); }
  function sign(text) { signText = text || ''; }
  function snapshot() {
    if (sc && sc.fulls >= 3) asset('np-front-frame-gold');
    frame(1.3, true);
    const c = mk(W, H); present(c);
    try { return c.toDataURL('image/jpeg', 0.86); } catch (e) { return ''; }
  }
  function screenPoint(p) { const cv = [...targets][0]; const b = cv.getBoundingClientRect(); return { x: b.left + (p[0] / W) * b.width, y: b.top + (p[1] / H) * b.height }; }
  // 等這一筆要用的圖載入（最多等 ms 毫秒）
  function ready(ms) {
    if (!sc) return Promise.resolve();
    const names = [sc.sky, sc.front, sc.pier].concat(sc.far.map((f) => f.name), sc.mids.map((m) => m.name), sc.bays.map((b) => b.name)).filter(Boolean);
    return Promise.race([Promise.all(names.map((n) => asset(n).p)), new Promise((r) => setTimeout(r, ms || 2500))]);
  }
  const isGold = () => !!(sc && sc.fulls >= 3);

  IE.Painter = { W, H, init, attach, detach, blank, planPlay, drawPlan, glint, spray, strike, sign, snapshot, screenPoint, MOODS: {}, faceOf, src, ready, isGold };
})(typeof window !== 'undefined' ? window : globalThis);
