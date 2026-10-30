// 小遊戲共用部分：橫額、廣告、頂部列、大頭像，以及小遊戲登記表。
// 個別小遊戲見 micro-label.js、micro-smile.js、micro-dive.js。
(function (IE) {
  'use strict';
  const P = IE.Pixel, A = IE.Audio;

  // ---------- 橫額 ----------
  function banner(st, text, color, sub) { st.banner = { text, sub, color: color || '#ffffff', t: 0 }; }
  function drawBanner(st) {
    const b = st.banner;
    if (!b || b.t > 1.4) return;
    const a = b.t < 0.15 ? b.t / 0.15 : b.t > 1.1 ? 1 - (b.t - 1.1) / 0.3 : 1;
    const pop = b.t < 0.15 ? 1.4 - b.t / 0.15 * 0.4 : 1;
    P.text(b.text, 160, 70, { size: 20 * pop, align: 'center', weight: 900, color: b.color, stroke: '#0b0f1a', alpha: Math.max(0, a) });
    if (b.sub) P.text(b.sub, 160, 98, { size: 8, align: 'center', weight: 700, color: '#ffffff', stroke: '#0b0f1a', alpha: Math.max(0, a) });
  }

  // ---------- 廣告：沒有付費訂閱時，彈出來遮住畫面 ----------
  function adSystem(enabled, area) {
    const ads = [];
    const box = area || { x: 70, y: 34, w: 90, h: 50 };
    let next = 5 + Math.random() * 3;
    return {
      ads,
      update(dt) {
        if (!enabled) return;
        next -= dt;
        if (next <= 0) {
          next = 6 + Math.random() * 4;
          const lines = IE.DATA.ADS;
          ads.push({ x: box.x + Math.random() * box.w, y: box.y + Math.random() * box.h, w: 104, h: 44,
            text: lines[Math.floor(Math.random() * lines.length)], t: 0, hue: Math.random() < 0.5 ? '#ff4fb4' : '#ffc247' });
          A.sfx('ad');
        }
        for (let i = ads.length - 1; i >= 0; i--) { ads[i].t += dt; if (ads[i].t > 5) ads.splice(i, 1); }
      },
      // 按中「×」就關閉；按中廣告其他位置等於沒有按
      hit(x, y) {
        for (let i = ads.length - 1; i >= 0; i--) {
          const a = ads[i];
          if (x >= a.x + a.w - 14 && x <= a.x + a.w + 2 && y >= a.y - 2 && y <= a.y + 12) { ads.splice(i, 1); A.sfx('click'); return 'closed'; }
          if (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) return 'blocked';
        }
        return null;
      },
      closeTop() { if (ads.length) { ads.pop(); A.sfx('click'); return true; } return false; },
      draw(c) {
        ads.forEach((a) => {
          const pop = Math.min(1, a.t * 8);
          c.fillStyle = '#ffffff'; c.fillRect(a.x - 1, a.y - 1, a.w + 2, (a.h + 2) * pop);
          c.fillStyle = a.hue; c.fillRect(a.x, a.y, a.w, a.h * pop);
          c.fillStyle = '#0b0f1a'; c.fillRect(a.x + a.w - 12, a.y + 2, 10, 9);
        });
      },
      drawText() {
        ads.forEach((a) => {
          P.text('廣告', a.x + 4, a.y + 3, { size: 5, color: '#0b0f1a', weight: 900 });
          P.text(a.text, a.x + 4, a.y + 13, { size: 7, color: '#0b0f1a', weight: 900, lineHeight: 1.2 });
          P.text('×', a.x + a.w - 7, a.y + 1, { size: 8, align: 'center', color: '#ffffff', weight: 900 });
        });
      },
    };
  }

  function topBar(c, progress, color) {
    c.fillStyle = '#0b0f1a'; c.fillRect(0, 0, 320, 13);
    c.fillStyle = '#26334d'; c.fillRect(110, 5, 100, 3);
    c.fillStyle = color || '#37c3d6'; c.fillRect(110, 5, Math.round(100 * Math.max(0, Math.min(1, progress))), 3);
  }

  // ---------- 大頭像（28×32），用色塊拼成 ----------
  function face(c, x, y, o) {
    const nod = Math.round(o.nod || 0);
    y += nod;
    c.fillStyle = o.shirt; c.fillRect(x, y + 24 - nod, 28, 8 + nod);
    c.fillStyle = o.skin; c.fillRect(x + 4, y + 4, 20, 22);
    if (o.fat) c.fillRect(x + 2, y + 10, 24, 14);
    c.fillStyle = o.hair; c.fillRect(x + 3, y + 1, 22, 6); c.fillRect(x + 3, y + 3, 3, 10); c.fillRect(x + 22, y + 3, 3, 10);
    if (o.shades) {
      c.fillStyle = '#0b0f1a'; c.fillRect(x + 6, y + 11, 7, 4); c.fillRect(x + 15, y + 11, 7, 4); c.fillRect(x + 13, y + 12, 2, 1);
    } else {
      c.fillStyle = '#1b1b28';
      const eh = o.dead > 0.6 ? 1 : 3;
      c.fillRect(x + 8, y + 11 + (3 - eh), 3, eh); c.fillRect(x + 17, y + 11 + (3 - eh), 3, eh);
    }
    if (o.angry) { c.fillStyle = '#1b1b28'; c.fillRect(x + 7, y + 8, 4, 1); c.fillRect(x + 17, y + 8, 4, 1); }
    const mw = Math.round(o.smile);
    const mx = x + 14 - Math.floor(mw / 2);
    if (o.frown) {
      c.fillStyle = '#9e3040'; c.fillRect(mx, y + 20, mw, 1); c.fillRect(mx - 1, y + 21, 1, 1); c.fillRect(mx + mw, y + 21, 1, 1);
    } else {
      c.fillStyle = '#9e3040'; c.fillRect(mx, y + 19, mw, 3);
      c.fillStyle = '#ffffff'; c.fillRect(mx + 1, y + 19, Math.max(0, mw - 2), 1);
      c.fillStyle = o.skin; if (mw > 6) { c.fillRect(mx - 1, y + 17, 1, 2); c.fillRect(mx + mw, y + 17, 1, 2); }
    }
    if (o.chain) { c.fillStyle = '#e8c25a'; for (let i = 0; i < 14; i += 2) c.fillRect(x + 7 + i, y + 26 + (i > 6 ? 14 - i : i) / 3, 2, 1); }
  }

  // 結束後延遲一陣才回傳結果，讓「下班」橫額播完
  function ender(st, getResult, onDone) {
    return (dt) => {
      if (st.phase !== 'end') return;
      st.endT += dt;
      if (st.endT > 1.4 && onDone) { const cb = onDone; onDone = null; cb(getResult()); }
    };
  }

  const registry = {};
  IE.Micro = {
    C: { banner, drawBanner, adSystem, topBar, face, ender },
    register(kind, factory) { registry[kind] = factory; },
    create(kind, opts, onDone) {
      if (kind === 'label' || kind === 'ot') return registry.label(Object.assign({ ot: kind === 'ot' }, opts), onDone);
      if (kind === 'alien') return registry.label({ alien: true }, onDone);
      if (registry[kind]) return registry[kind](opts || {}, onDone);
      throw new Error('未知的小遊戲：' + kind);
    },
  };
})(window.IE = window.IE || {});
