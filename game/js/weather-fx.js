// 浮城的天氣效果（第十期）：每種天氣和奇怪狀態各有自己的像素動畫。
// draw(c, vis, env) 畫在 320×180 的低解像度畫布上；回傳要由 scene.js 疊加的基本天氣（storm／acid／heat），沒有則回傳 null。
// env：{ t（秒）, wy（水面 y）, night }
(function (IE) {
  'use strict';
  const W = 320, H = 180;
  const fr = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
  const mod = (v, m) => ((v % m) + m) % m;
  // 由上而下落的粒子
  function fall(c, t, n, o) {
    for (let i = 0; i < n; i++) {
      const sway = o.sway ? Math.sin(t * o.sway + i) * 3 : 0;
      const x = mod(i * 97 + t * (o.dx || 0) + sway, W + 10) - 5;
      const y = mod(i * 61 + t * o.speed, H + 10) - 5;
      o.draw(x, y, i);
    }
  }
  // 由下而上升的粒子
  function rise(c, t, n, o) {
    for (let i = 0; i < n; i++) {
      const x = mod(i * 83 + Math.sin(t * (o.sway || 0.8) + i * 1.7) * (o.amp || 4), W);
      const y = o.top + mod(o.bottom - o.top - (i * 37 + t * o.speed), o.bottom - o.top);
      o.draw(x, y, i);
    }
  }
  function lightning(c, t, every, strong) {
    const k = mod(t, every);
    if (k > 0.22) return;
    fr(c, 'rgba(235,245,255,' + (strong ? 0.35 : 0.22) * (1 - k / 0.22) + ')', 0, 0, W, H);
    const seed = Math.floor(t / every);
    let x = 40 + mod(seed * 131, 240), y = 0;
    c.fillStyle = 'rgba(255,255,255,0.95)';
    while (y < 90) {
      const nx = x + (mod(seed * 7 + y, 9) - 4);
      c.fillRect(Math.round(nx), y, 1, 6);
      x = nx; y += 6;
    }
  }
  function fogBands(c, t, col, n) {
    for (let i = 0; i < n; i++) {
      const y = 30 + i * 22 + Math.sin(t * 0.3 + i) * 4;
      const x = mod(t * (6 + i * 2) + i * 80, W + 160) - 160;
      fr(c, col, x, y, 220, 10 + (i % 3) * 4);
      fr(c, col, x + 140, y + 6, 180, 8);
    }
  }

  const FX = {
    drizzle(c, e) {
      c.fillStyle = 'rgba(190,220,255,0.38)';
      fall(c, e.t, 46, { speed: 120, dx: -20, draw: (x, y) => c.fillRect(Math.round(x), Math.round(y), 1, 3) });
      return null;
    },
    storm() { return 'storm'; },
    typhoon(c, e) {
      // 被風捲起的招牌碎片和膠袋
      for (let i = 0; i < 14; i++) {
        const x = mod(i * 53 + e.t * (160 + i * 9), W + 40) - 20;
        const y = 20 + mod(i * 29, 120) + Math.sin(e.t * 6 + i) * 6;
        fr(c, i % 3 === 0 ? 'rgba(255,79,180,0.8)' : i % 3 === 1 ? 'rgba(230,230,230,0.7)' : 'rgba(55,195,214,0.8)', x, y, 3, 1 + (i % 2));
      }
      fr(c, 'rgba(10,30,45,0.18)', 0, 0, W, H);
      return 'storm';
    },
    fog(c, e) {
      fr(c, 'rgba(190,200,210,0.16)', 0, 0, W, H);
      fogBands(c, e.t, 'rgba(210,220,228,0.16)', 6);
      return null;
    },
    thunder(c, e) { lightning(c, e.t, 3.4, true); return 'storm'; },
    heat() { return 'heat'; },
    heatdome(c, e) {
      // 籠罩全城的熱穹頂
      c.strokeStyle = 'rgba(255,150,60,0.35)';
      c.lineWidth = 1;
      c.beginPath(); c.ellipse(160, 150, 190, 135 + Math.sin(e.t) * 2, 0, Math.PI, 2 * Math.PI); c.stroke();
      fr(c, 'rgba(255,110,40,0.10)', 0, 0, W, H);
      return 'heat';
    },
    sand(c, e) {
      fr(c, 'rgba(214,140,60,0.26)', 0, 0, W, H);
      for (let i = 0; i < 70; i++) {
        const x = mod(i * 71 + e.t * (140 + (i % 5) * 30), W + 20) - 10;
        const y = mod(i * 47, H);
        fr(c, i % 4 ? 'rgba(240,190,120,0.55)' : 'rgba(255,220,160,0.7)', x, y, 3 + (i % 3), 1);
      }
      return null;
    },
    drythunder(c, e) { fr(c, 'rgba(30,20,40,0.15)', 0, 0, W, H); lightning(c, e.t, 2.7, false); return null; },
    acid() { return 'acid'; },
    acidfog(c, e) {
      fr(c, 'rgba(150,190,60,0.14)', 0, 0, W, H);
      fogBands(c, e.t, 'rgba(196,224,74,0.14)', 6);
      return null;
    },
    neonsmog(c, e) {
      for (let y = 0; y < H; y += 6) fr(c, 'rgba(255,79,180,' + (0.05 + 0.04 * Math.sin(y * 0.08 + e.t)) + ')', 0, y, W, 6);
      fogBands(c, e.t, 'rgba(195,139,255,0.10)', 5);
      for (let i = 0; i < 24; i++) {
        const on = mod(Math.floor(e.t * 3) + i, 5) > 0;
        if (on) fr(c, i % 2 ? 'rgba(255,140,220,0.8)' : 'rgba(120,230,255,0.8)', mod(i * 59, W), 20 + mod(i * 37, 110), 1, 1);
      }
      return null;
    },
    clear(c, e) {
      if (e.night) {
        for (let i = 0; i < 60; i++) if (mod(Math.floor(e.t * 2) + i, 7)) fr(c, 'rgba(255,255,255,0.75)', mod(i * 53, W), mod(i * 29, 70), 1, 1);
      } else {
        fr(c, 'rgba(255,240,200,0.10)', 0, 0, W, H);
        for (let i = 0; i < 5; i++) {
          // 海鳥：小小的 V 字
          const x = mod(i * 70 + e.t * (12 + i * 3), W + 20) - 10, y = 26 + i * 9 + Math.sin(e.t * 2 + i) * 2;
          const f = mod(Math.floor(e.t * 4) + i, 2);
          fr(c, '#1d2433', x, y + f, 1, 1); fr(c, '#1d2433', x + 1, y + 1 - f, 1, 1); fr(c, '#1d2433', x + 2, y + f, 1, 1);
        }
      }
      return null;
    },
    rainbow(c, e) {
      const cols = ['255,90,90', '255,170,70', '255,230,90', '120,220,120', '90,170,255', '170,120,255'];
      const a = e.night ? 0.12 : 0.3;
      cols.forEach((col, i) => {
        c.strokeStyle = 'rgba(' + col + ',' + a + ')';
        c.lineWidth = 2;
        c.beginPath(); c.arc(170, 150, 120 - i * 2.2, Math.PI * 1.06, Math.PI * 1.94); c.stroke();
      });
      return null;
    },
    overcast(c, e) {
      fr(c, 'rgba(120,130,145,0.18)', 0, 0, W, H);
      for (let i = 0; i < 7; i++) {
        const x = mod(i * 60 + e.t * 4, W + 80) - 80;
        fr(c, 'rgba(150,160,175,0.22)', x, 4 + (i % 3) * 7, 70, 8);
        fr(c, 'rgba(150,160,175,0.18)', x + 12, 0 + (i % 3) * 7, 44, 6);
      }
      return null;
    },
    hail(c, e) {
      fall(c, e.t, 40, { speed: 260, dx: -10, draw: (x, y) => fr(c, 'rgba(235,245,255,0.9)', x, y, 2, 2) });
      for (let i = 0; i < 10; i++) if (mod(Math.floor(e.t * 10) + i, 4) === 0) fr(c, 'rgba(255,255,255,0.8)', mod(i * 37 + e.t * 50, W), e.wy - 2, 1, 1);
      return null;
    },
    snow(c, e) {
      fall(c, e.t, 70, { speed: 18, dx: 6, sway: 1.3, draw: (x, y, i) => fr(c, i % 4 ? 'rgba(255,255,255,0.85)' : 'rgba(220,235,255,0.9)', x, y, i % 5 ? 1 : 2, i % 5 ? 1 : 2) });
      fr(c, 'rgba(220,235,255,0.08)', 0, 0, W, H);
      return null;
    },
    fishrain(c, e) {
      fall(c, e.t, 26, { speed: 90, dx: -8, sway: 2, draw: (x, y, i) => {
        const col = i % 3 ? '#c8d6e5' : '#ff9a4d';
        fr(c, col, x, y, 1, 3); fr(c, col, x - 1, y + 3, 3, 1); fr(c, '#0b0f1a', x, y, 1, 1);
      } });
      return 'storm';
    },
    jellysky(c, e) {
      rise(c, e.t, 10, { speed: 6, top: 8, bottom: e.wy, amp: 6, sway: 0.6, draw: (x, y, i) => {
        const col = i % 2 ? '255,143,209' : '127,227,255';
        const pulse = 0.55 + 0.3 * Math.sin(e.t * 2 + i);
        c.fillStyle = 'rgba(' + col + ',0.18)'; c.beginPath(); c.arc(x, y + 2, 9, 0, Math.PI * 2); c.fill();
        fr(c, 'rgba(' + col + ',' + pulse + ')', x - 5, y, 11, 3);
        fr(c, 'rgba(' + col + ',' + pulse * 0.85 + ')', x - 4, y - 2, 9, 2);
        fr(c, 'rgba(' + col + ',' + pulse * 0.7 + ')', x - 2, y - 3, 5, 1);
        for (let k = 0; k < 4; k++) fr(c, 'rgba(' + col + ',0.45)', x - 4 + k * 3, y + 3, 1, 4 + mod(Math.floor(e.t * 3) + k + i, 4));
      } });
      return null;
    },
    aurora(c, e) {
      for (let x = 0; x < W; x += 2) {
        const h = 22 + Math.sin(x * 0.03 + e.t * 0.7) * 10 + Math.sin(x * 0.011 - e.t * 0.4) * 8;
        const y0 = 6 + Math.sin(x * 0.02 + e.t * 0.5) * 6;
        fr(c, 'rgba(90,255,170,' + (e.night ? 0.22 : 0.12) + ')', x, y0, 2, h);
        fr(c, 'rgba(190,110,255,' + (e.night ? 0.18 : 0.09) + ')', x, y0 + h, 2, 8);
      }
      return null;
    },
    meteor(c, e) {
      for (let i = 0; i < 4; i++) {
        const per = 2.4 + i * 0.7, k = mod(e.t + i * 1.3, per) / per;
        if (k > 0.35) continue;
        const p = k / 0.35, x0 = 60 + mod(i * 97 + Math.floor((e.t + i * 1.3) / per) * 53, 220), y0 = 6 + i * 6;
        for (let j = 0; j < 10; j++) fr(c, 'rgba(255,240,200,' + (1 - j / 10) * 0.9 + ')', x0 - p * 80 + j * 2, y0 + p * 40 - j, 1, 1);
      }
      if (!e.night) fr(c, 'rgba(10,10,40,0.12)', 0, 0, W, H);
      return null;
    },
    doublemoon(c, e) {
      const y = 22 + Math.sin(e.t * 0.3) * 1;
      c.fillStyle = 'rgba(255,190,220,0.9)'; c.beginPath(); c.arc(262, y, 8, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(40,20,60,0.55)'; c.beginPath(); c.arc(266, y - 2, 7, 0, Math.PI * 2); c.fill();
      fr(c, 'rgba(255,79,180,0.6)', 254, y + 11, 16, 1);
      return null;
    },
    blackout(c, e) {
      fr(c, 'rgba(2,4,12,' + (e.night ? 0.6 : 0.35) + ')', 0, 0, W, H);
      for (let i = 0; i < 26; i++) {
        const fl = 0.5 + 0.5 * Math.sin(e.t * 9 + i * 2.3);
        fr(c, 'rgba(255,200,110,' + (0.4 + fl * 0.5) + ')', mod(i * 61, W), 40 + mod(i * 43, Math.max(10, e.wy - 50)), 1, 1);
      }
      return null;
    },
    adsky(c, e) {
      // 雲層變成了廣告螢幕
      const x = 70, y = 10, w = 180, h = 34;
      fr(c, 'rgba(10,8,20,0.75)', x - 2, y - 2, w + 4, h + 4);
      for (let i = 0; i < h; i += 2) fr(c, 'hsla(' + mod(e.t * 60 + i * 6, 360) + ',90%,60%,0.55)', x, y + i, w, 1);
      const k = mod(Math.floor(e.t * 1.5), 3);
      fr(c, 'rgba(255,255,255,0.9)', x + 20 + k * 40, y + 10, 30, 4);
      fr(c, 'rgba(255,255,255,0.7)', x + 20 + k * 40, y + 18, 50, 3);
      fr(c, 'rgba(255,79,180,0.9)', x + w - 26, y + 6, 18, 18);
      fr(c, 'rgba(255,255,255,0.12)', 0, 0, W, H);
      return null;
    },
    gravity(c, e) {
      rise(c, e.t, 30, { speed: 8, top: 6, bottom: e.wy + 4, amp: 3, sway: 0.5, draw: (x, y, i) => {
        const col = ['#6b6254', '#4a5870', '#ff4fb4', '#37c3d6', '#8a7f6a'][i % 5];
        const w = 3 + (i % 4), h = 2 + (i % 3);
        fr(c, col, x, y, w, h);
        fr(c, 'rgba(255,255,255,0.25)', x, y, w, 1);
        if (i % 5 === 2) fr(c, 'rgba(255,255,255,0.8)', x + 1, y + 1, w - 2, 1);
      } });
      fr(c, 'rgba(120,90,200,0.08)', 0, 0, W, H);
      return null;
    },
    uprain(c, e) {
      c.fillStyle = 'rgba(175,218,255,0.5)';
      for (let i = 0; i < 70; i++) {
        const x = mod(i * 97, W), y = H - mod(i * 61 + e.t * 160, H + 10);
        c.fillRect(Math.round(x), Math.round(y), 1, 4);
      }
      return null;
    },
    redtide(c, e) {
      fr(c, 'rgba(190,20,40,0.45)', 0, e.wy, W, H - e.wy);
      for (let i = 0; i < 12; i++) fr(c, 'rgba(255,90,90,0.5)', mod(i * 41 + e.t * 10, W), e.wy + 3 + (i % 5) * 4, 10, 1);
      fr(c, 'rgba(120,10,20,0.12)', 0, 0, W, e.wy);
      return null;
    },
    glitch(c, e) {
      const k = Math.floor(e.t * 8);
      for (let i = 0; i < 3; i++) {
        if (mod(k + i * 5, 7) > 1) continue;
        const y = mod(k * 37 + i * 53, H - 12), h = 3 + mod(k + i, 8), dx = mod(k * 13 + i, 15) - 7;
        try { c.drawImage(c.canvas, 0, y, W, h, dx, y, W, h); } catch (err) { /* 有些環境不能自我複製 */ }
        fr(c, i % 2 ? 'rgba(255,0,90,0.25)' : 'rgba(0,255,230,0.25)', 0, y, W, 1);
      }
      return null;
    },
    paper(c, e) {
      fall(c, e.t, 30, { speed: 22, dx: 14, sway: 1.6, draw: (x, y, i) => {
        const w = i % 2 ? 3 : 4;
        fr(c, 'rgba(240,240,232,0.92)', x, y, w, 4);
        fr(c, 'rgba(120,120,140,0.7)', x + 1, y + 1, w - 2, 1);
      } });
      return null;
    },
    bubbles(c, e) {
      rise(c, e.t, 24, { speed: 14, top: 0, bottom: e.wy, amp: 5, sway: 1.1, draw: (x, y, i) => {
        c.strokeStyle = 'hsla(' + mod(i * 47 + e.t * 40, 360) + ',90%,75%,0.75)';
        c.lineWidth = 1;
        c.beginPath(); c.arc(x, y, 2 + (i % 3), 0, Math.PI * 2); c.stroke();
      } });
      return null;
    },
    eclipse(c, e) {
      fr(c, 'rgba(5,5,15,0.45)', 0, 0, W, H);
      c.fillStyle = 'rgba(255,240,200,0.35)'; c.beginPath(); c.arc(240, 34, 13 + Math.sin(e.t * 2) * 0.6, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#05060c'; c.beginPath(); c.arc(240, 34, 10, 0, Math.PI * 2); c.fill();
      return null;
    },
    whale(c, e) {
      const x = mod(e.t * 9, W + 160) - 120, y = 30 + Math.sin(e.t * 0.5) * 4;
      c.fillStyle = 'rgba(30,50,90,0.75)';
      c.beginPath(); c.ellipse(x + 40, y, 40, 11, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - 14, y - 8); c.lineTo(x - 12, y + 8); c.closePath(); c.fill();
      fr(c, 'rgba(160,200,255,0.55)', x + 50, y + 3, 26, 2);
      fr(c, '#d9fbff', x + 66, y - 3, 1, 1);
      if (mod(e.t, 5) < 1) for (let k = 0; k < 5; k++) fr(c, 'rgba(210,240,255,0.7)', x + 56 + k - 2, y - 14 - k * 2 + mod(e.t * 10, 3), 1, 2);
      return null;
    },
    freeze(c) {
      c.fillStyle = 'rgba(190,225,255,0.55)';
      for (let i = 0; i < 90; i++) c.fillRect(mod(i * 97, W), mod(i * 61, H), 1, 3);
      fr(c, 'rgba(160,200,255,0.10)', 0, 0, W, H);
      return null;
    },
    ufos(c, e) {
      for (let i = 0; i < 9; i++) {
        const x = 20 + i * 34 + Math.sin(e.t * 0.8 + i) * 5, y = 12 + (i % 3) * 10 + Math.sin(e.t * 1.3 + i * 2) * 2;
        fr(c, 'rgba(160,170,190,0.9)', x - 5, y, 11, 2);
        fr(c, 'rgba(155,227,107,0.85)', x - 2, y - 2, 5, 2);
        if (mod(Math.floor(e.t * 4) + i, 3) === 0) fr(c, 'rgba(255,79,180,1)', x - 4 + mod(Math.floor(e.t * 6), 9), y + 1, 1, 1);
      }
      return null;
    },
    drones(c, e) {
      for (let i = 0; i < 80; i++) {
        const a = e.t * (0.6 + (i % 5) * 0.15) + i;
        const x = mod(i * 41 + Math.cos(a) * 18, W), y = 10 + mod(i * 23, 110) + Math.sin(a * 1.3) * 8;
        if (!mod(Math.floor(e.t * 5) + i, 4)) continue;
        const col = i % 2 ? '255,211,107' : '127,227,255';
        fr(c, 'rgba(' + col + ',0.25)', x - 1, y - 1, 3, 3);
        fr(c, 'rgba(' + col + ',1)', x, y, 1, 1);
      }
      return null;
    },
    glowsea(c, e) {
      fr(c, 'rgba(40,200,230,0.22)', 0, e.wy, W, H - e.wy);
      for (let i = 0; i < 48; i++) {
        const x = mod(i * 29 + e.t * (8 + i % 4), W + 20) - 10, y = e.wy + 1 + (i % 8) * 2;
        fr(c, 'rgba(120,250,255,' + (0.5 + 0.4 * Math.sin(e.t * 3 + i)) + ')', x, y, 8 + (i % 4) * 4, 1);
      }
      for (let i = 0; i < 16; i++) if (mod(Math.floor(e.t * 6) + i, 5) === 0) fr(c, 'rgba(200,255,255,0.95)', mod(i * 53, W), e.wy + mod(i * 7, 16), 1, 1);
      return null;
    },
  };
  IE.WeatherFX = {
    has: (vis) => !!FX[vis],
    draw(c, vis, env) { const f = FX[vis]; return f ? f(c, env) : vis; },
  };
})(window.IE = window.IE || {});
