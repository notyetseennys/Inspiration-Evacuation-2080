// 創作之夜原型：畫布。配色決定構圖，素材的情緒決定顏色，媒材決定筆觸。
// 計分時一張素材一張素材地畫上去；一晚的幾筆疊成一幅畫，收工時拍下來掛上作品牆。
(function (root) {
  'use strict';
  const IE = root.IE = root.IE || {};
  const W = 320, H = 200;
  let cv = null, cx = null, r = Math.random;
  const D = () => IE.DATA;

  function rgb(hex) { const h = hex.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function shade(hex, f, a) {
    const c = rgb(hex);
    const m = (v) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))));
    return 'rgba(' + m(c[0]) + ',' + m(c[1]) + ',' + m(c[2]) + ',' + (a == null ? 1 : a) + ')';
  }
  const gauss = () => (r() + r() + r() - 1.5) / 1.5;

  function init(canvas) {
    cv = canvas;
    cv.width = W; cv.height = H;
    cx = cv.getContext('2d');
    cx.imageSmoothingEnabled = false;
  }
  // 空白的畫布：紙紋和鉛筆的三分線
  function blank(seed) {
    r = IE.Proto.rng(seed || 7);
    cx.globalAlpha = 1;
    cx.fillStyle = '#efe5cf';
    cx.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) {
      cx.fillStyle = r() < 0.55 ? 'rgba(120,96,60,0.07)' : 'rgba(255,255,255,0.28)';
      cx.fillRect((r() * W) | 0, (r() * H) | 0, 1, 1);
    }
    cx.fillStyle = 'rgba(90,80,70,0.10)';
    for (let x = 0; x < W; x += 3) { cx.fillRect(x, (H / 3) | 0, 1, 1); cx.fillRect(x, ((2 * H) / 3) | 0, 1, 1); }
    for (let y = 0; y < H; y += 3) { cx.fillRect((W / 3) | 0, y, 1, 1); cx.fillRect(((2 * W) / 3) | 0, y, 1, 1); }
  }

  // ---------- 構圖：每一種顏色畫在哪裡 ----------
  const wpos = (t) => D().WHEEL.indexOf(t);
  const oppT = (t) => D().WHEEL[(wpos(t) + 5) % 10];
  function layout(form, palette) {
    const out = {};
    const n = palette.length || 1;
    const ox = W / 2 + (r() - 0.5) * 40, oy = H / 2 + (r() - 0.5) * 20;
    const rot = r() * Math.PI * 2;
    if (form === 'split') {
      const main = palette.find((t) => { const o = wpos(oppT(t)); const W10 = D().WHEEL; return [W10[(o + 1) % 10], W10[(o + 9) % 10]].every((x) => palette.includes(x)); }) || palette[0];
      const rest = palette.filter((t) => t !== main);
      const left = r() < 0.5;
      out[main] = { k: 'blob', x: left ? W * 0.3 : W * 0.7, y: H * 0.52, rx: 70, ry: 62 };
      rest.forEach((t, i) => { out[t] = { k: 'blob', x: left ? W * 0.76 : W * 0.24, y: i ? H * 0.74 : H * 0.28, rx: 40, ry: 30 }; });
      return out;
    }
    if (form === 'tetrad') {
      const a = palette[0], b = palette.find((t) => t !== a && t !== oppT(a)) || palette[1];
      const pos = [[a, 0.27, 0.3], [oppT(a), 0.73, 0.72], [b, 0.73, 0.3], [oppT(b), 0.27, 0.72]];
      pos.forEach(([t, x, y]) => { if (palette.includes(t)) out[t] = { k: 'quad', x: W * x, y: H * y }; });
      palette.forEach((t) => { if (!out[t]) out[t] = { k: 'quad', x: W * (0.2 + r() * 0.6), y: H * (0.2 + r() * 0.6) }; });
      return out;
    }
    palette.forEach((t, i) => {
      if (form === 'mono') out[t] = { k: 'blob', x: ox, y: oy, rx: 96, ry: 60 };
      else if (form === 'adj') { const h = H / n; out[t] = { k: 'band', y0: i * h, y1: (i + 1) * h, ph: r() * 6 }; }
      else if (form === 'comp') out[t] = { k: 'blob', x: i ? W * 0.74 : W * 0.26, y: H * (i ? 0.56 : 0.42), rx: 66, ry: 72 };
      else if (form === 'paradox') out[t] = { k: 'swirl', ph: i * Math.PI };
      else if (form === 'triad') { const a = rot + (i * 2 * Math.PI) / 3; out[t] = { k: 'blob', x: W / 2 + Math.cos(a) * 92, y: H / 2 + Math.sin(a) * 54, rx: 46, ry: 40 }; }
      else if (form === 'full') out[t] = { k: 'ray', a: (wpos(t) / 10) * Math.PI * 2 + rot };
      else out[t] = { k: 'blob', x: 34 + r() * (W - 68), y: 28 + r() * (H - 56), rx: 24 + r() * 18, ry: 18 + r() * 14 };
    });
    return out;
  }
  function pointIn(g) {
    if (g.k === 'band') { const x = r() * W; return [x, g.y0 + r() * (g.y1 - g.y0) + Math.sin(x / 26 + g.ph) * 7]; }
    if (g.k === 'ray') { const d = 6 + Math.pow(r(), 0.75) * 170; const sp = (r() - 0.5) * 0.32; return [W / 2 + Math.cos(g.a + sp) * d, H / 2 + Math.sin(g.a + sp) * d * 0.62]; }
    if (g.k === 'swirl') { const t = r() * 3.4 * Math.PI; const rad = 5 + t * 9; return [W / 2 + Math.cos(t + g.ph) * rad + gauss() * 5, H / 2 + Math.sin(t + g.ph) * rad * 0.6 + gauss() * 4]; }
    if (g.k === 'quad') return [g.x + gauss() * 64, g.y + gauss() * 40];
    return [g.x + gauss() * g.rx, g.y + gauss() * g.ry];
  }

  // ---------- 筆觸：媒材 ----------
  function disc(x, y, rad, col) {
    cx.fillStyle = col;
    for (let dy = -rad; dy <= rad; dy++) { const w = Math.round(Math.sqrt(rad * rad - dy * dy)); cx.fillRect(x - w, y + dy, 2 * w + 1, 1); }
  }
  function dab(d, med) {
    const x = d.x | 0, y = d.y | 0, big = d.size > 1 ? 1 : 0;
    cx.fillStyle = d.col;
    if (med === 'paper') { const len = 3 + d.len; for (let i = 0; i < len; i++) cx.fillRect(x + i, y + d.dir * (i >> 1), 2, 1 + big); }
    else if (med === 'sound') { for (let i = 0; i < 9; i++) cx.fillRect(x + i, y + Math.round(Math.sin((x + i) / 2.2) * 2), 1, 1 + big); }
    else if (med === 'image') cx.fillRect(x, y, 3 + d.len, 2 + (d.len >> 1));
    else if (med === 'body') { disc(x, y, 1 + (d.len % 3), d.col); if (d.drip) cx.fillRect(x, y, 1, 4 + d.len * 2); }
    else if (med === 'data') cx.fillRect(x - (x % 3), y - (y % 3), 2, 2);
    else cx.fillRect(x, y, 2, 2);
  }
  // 一張素材的筆觸：顏色來自它的情緒，數量隨星級增加
  function planCard(card, regions) {
    const tags = card.tags.filter((t) => regions[t]);
    if (!tags.length) return { uid: card.uid, dabs: [], med: card.medium, at: [W / 2, H / 2] };
    const n = Math.round(80 + card.star * 34);
    const dabs = [];
    for (let i = 0; i < n; i++) {
      const t = tags[i % tags.length];
      const p = pointIn(regions[t]);
      if (p[0] < -6 || p[1] < -6 || p[0] > W + 6 || p[1] > H + 6) continue;
      const base = D().TAGS[t].color;
      dabs.push({ x: p[0], y: p[1], col: shade(base, (r() - 0.45) * 0.55, 0.74 + r() * 0.24), size: r() < 0.3 ? 2 : 1, len: (r() * 6) | 0, dir: r() < 0.5 ? 1 : -1, drip: r() < 0.1 });
    }
    dabs.sort((a, b) => (a.x - b.x) + (a.y - b.y) * 0.25);
    const at = dabs.length ? [dabs.reduce((s, d) => s + d.x, 0) / dabs.length, dabs.reduce((s, d) => s + d.y, 0) / dabs.length] : [W / 2, H / 2];
    return { uid: card.uid, dabs, med: card.medium, at };
  }
  function planPlay(play) {
    const regions = layout(play.form, play.palette);
    const plans = {};
    play.cards.forEach((c) => { plans[c.uid] = planCard(c, regions); });
    return plans;
  }
  // 逐步畫出一張素材的筆觸（ms 毫秒）；skip() 會即時畫完
  function drawPlan(plan, ms) {
    return new Promise((resolve) => {
      if (!plan || !plan.dabs.length) { resolve(); return; }
      const start = performance.now();
      let done = 0;
      const step = (now) => {
        const k = Math.min(1, ms <= 0 ? 1 : (now - start) / ms);
        const upto = Math.round(k * plan.dabs.length);
        for (; done < upto; done++) dab(plan.dabs[done], plan.med);
        if (k < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
  }
  // 組合或大分數的閃光：金色的點
  function glint(n, color) {
    for (let i = 0; i < (n || 40); i++) {
      const x = (r() * W) | 0, y = (r() * H) | 0;
      cx.fillStyle = color || 'rgba(255,214,90,0.9)';
      cx.fillRect(x, y, 1, 1);
      if (r() < 0.4) { cx.fillRect(x - 1, y, 3, 1); cx.fillRect(x, y - 1, 1, 3); }
    }
  }
  // 評審劃掉的素材：灰色的一劃
  function strike(at) {
    const x = at ? at[0] | 0 : (r() * W) | 0, y = at ? at[1] | 0 : (r() * H) | 0;
    for (let i = -12; i < 12; i++) { cx.fillStyle = 'rgba(70,70,80,0.55)'; cx.fillRect(x + i, y + (i >> 2), 2, 2); }
  }
  // 收工：在右下角簽名
  function sign(text) {
    cx.fillStyle = 'rgba(40,32,24,0.65)';
    cx.font = '8px monospace';
    cx.textAlign = 'right';
    cx.fillText(text || '', W - 6, H - 6);
  }
  function snapshot() { return cv.toDataURL('image/png'); }
  // 畫布上某一點在螢幕上的位置（浮動數字用）
  function screenPoint(p) {
    const b = cv.getBoundingClientRect();
    return { x: b.left + (p[0] / W) * b.width, y: b.top + (p[1] / H) * b.height };
  }

  IE.Painter = { W, H, init, blank, planPlay, drawPlan, glint, strike, sign, snapshot, screenPoint };
})(typeof window !== 'undefined' ? window : globalThis);
