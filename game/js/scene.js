// 浮城橫切面：水位、你的家、火花、外星探射燈、牽引光束、外星 HR 辦公室。
(function (IE) {
  'use strict';
  const P = IE.Pixel;
  // GROUND 為 1 樓地面；水位 w 代表水淹到第幾樓的地面（w ≥ 你住的樓層即代表正在淹水）
  const GROUND = 164, FLOOR_H = 16, BX = 124, BW = 72;
  const floorTop = (f) => GROUND - f * FLOOR_H;
  const waterY = (w) => GROUND - (w - 1) * FLOOR_H;

  // 固定的背景樓宇（每次開遊戲都一樣）
  function seeded(seed) {
    let a = seed;
    return () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; };
  }
  const SKYLINE = (() => {
    const r = seeded(2080);
    const far = [], mid = [];
    for (let x = -10; x < 330; x += 10 + Math.floor(r() * 14)) far.push({ x, w: 14 + Math.floor(r() * 16), h: 50 + Math.floor(r() * 70) });
    const spots = [[0, 40], [42, 34], [80, 38], [204, 36], [244, 42], [290, 34]];
    spots.forEach(([x, w]) => {
      const h = 70 + Math.floor(r() * 70);
      const wins = [];
      for (let yy = 6; yy < h - 4; yy += 8) for (let xx = 4; xx < w - 5; xx += 7) wins.push({ x: xx, y: yy, on: r() < 0.45, c: r() < 0.15 ? '#ff4fb4' : r() < 0.2 ? '#37c3d6' : '#ffd36b' });
      mid.push({ x, w, h, wins, sign: r() < 0.7 ? { y: 10 + Math.floor(r() * 30), c: r() < 0.5 ? '#ff4fb4' : '#37c3d6', w: 4 + Math.floor(r() * 6) } : null });
    });
    const bwins = [];
    for (let f = 1; f <= 8; f++) for (let i = 0; i < 3; i++) bwins.push({ f, i, on: r() < 0.55 });
    return { far, mid, bwins };
  })();

  const City = {
    t: 0, mode: 'hub', fx: P.particles(), sl: null, beam: null, demo: null, flash: 0, forceNight: false,
    enter(mode) { this.mode = mode || 'hub'; this.sl = null; this.beam = null; },
    state() { return this.mode === 'attract' ? this.demoState() : IE.Game.state; },
    demoState() {
      if (!this.demo) this.demo = { floor: 4, water: 2.6, spark: 3.2, season: 'storm', saturation: 1, slot: 2, day: 1, greyed: 0 };
      return this.demo;
    },
    // 探射燈：ratio = 訊號 / 門檻，越接近 1 越貼近你的窗口
    // heavy：訊號達標但靈魂超重，光束停下來卻拉不動
    searchlight(ratio, lock, done, heavy) {
      this.sl = { t: 0, ratio: Math.max(0, Math.min(1.2, ratio)), lock: !!lock, heavy: !!heavy, done, fired: false };
    },
    startBeam(done) { this.beam = { t: 0, done, fired: false }; IE.Audio.sfx('beam'); },
    playerPos(s) {
      if (s.floor === 0) return { x: 104, y: waterY(s.water) - 14 };
      return { x: BX + 31, y: floorTop(s.floor) + 4 };
    },
    update(dt) {
      this.t += dt;
      const s = this.state();
      if (!s) return;
      const p = this.playerPos(s);
      // 火花從你的窗口飄出來：火花越高越多
      const rate = Math.max(0, s.spark - 0.5) * 3;
      if (Math.random() < rate * dt) {
        this.fx.add({ x: p.x + 4 + (Math.random() - 0.5) * 8, y: p.y + 2, vx: (Math.random() - 0.5) * 6, vy: -10 - Math.random() * 12,
          life: 1.6 + Math.random(), color: Math.random() < 0.7 ? '#ffc247' : '#ff8a3c', size: 1 });
      }
      if (this.mode === 'attract') { this.demo.water = 2.4 + Math.sin(this.t * 0.2) * 0.3; }
      if (this.sl) {
        this.sl.t += dt;
        if (this.sl.t > 4.6 && !this.sl.fired) { this.sl.fired = true; if (this.sl.done) this.sl.done(); }
      }
      if (this.beam) {
        this.beam.t += dt;
        if (this.beam.t > 2.2 && Math.random() < 0.6) {
          this.fx.add({ x: p.x + Math.random() * 10 - 1, y: p.y + 10, vy: -40 - Math.random() * 30, life: 1.2, color: '#d9fbff', size: 1 });
        }
        if (this.beam.t > 6.2 && !this.beam.fired) { this.beam.fired = true; if (this.beam.done) this.beam.done(); }
      }
      this.flash = Math.max(0, this.flash - dt * 1.5);
      this.fx.update(dt);
    },
    draw(c) {
      const s = this.state();
      if (!s) return;
      const season = IE.DATA.SEASONS[s.season];
      const night = s.slot === 2 || this.mode === 'attract' || this.forceNight;
      const t = this.t;
      // 天空
      const top = night ? P.mix(season.sky[0], '#03040a', 0.6) : s.slot === 0 ? P.mix(season.sky[1], '#ffb38a', 0.25) : season.sky[1];
      const bot = night ? P.mix(season.sky[1], '#0a0e17', 0.4) : P.mix(season.sky[1], '#ffd3a8', s.slot === 0 ? 0.35 : 0.15);
      const g = c.createLinearGradient(0, 0, 0, 180);
      g.addColorStop(0, top); g.addColorStop(1, bot);
      c.fillStyle = g; c.fillRect(0, 0, 320, 180);
      if (night) {
        for (let i = 0; i < 40; i++) {
          const x = (i * 73) % 320, y = (i * 37) % 70;
          c.fillStyle = (Math.sin(t * 2 + i) > 0.6) ? '#ffffff' : '#7d8aa8';
          c.fillRect(x, y, 1, 1);
        }
      }
      // 天空區：浮在上空的富人平台
      c.fillStyle = P.mix(top, '#c9d6ff', 0.25);
      [[30, 16, 46], [214, 10, 60]].forEach(([x, y, w]) => {
        const yy = y + Math.sin(t * 0.5 + x) * 1.5;
        c.fillRect(x, yy, w, 3); c.fillRect(x + 6, yy - 6, w - 12, 6);
        c.fillStyle = '#ffe9a8';
        for (let i = 8; i < w - 8; i += 5) c.fillRect(x + i, yy - 4, 2, 2);
        c.fillStyle = P.mix(top, '#c9d6ff', 0.25);
      });
      // 遠景
      c.fillStyle = P.mix(bot, '#000000', 0.45);
      SKYLINE.far.forEach((b) => c.fillRect(b.x, GROUND - b.h, b.w, b.h));
      // 中景樓宇
      SKYLINE.mid.forEach((b) => {
        c.fillStyle = P.mix(bot, '#0b0f1a', 0.7);
        c.fillRect(b.x, GROUND - b.h, b.w, b.h);
        b.wins.forEach((w) => {
          const on = night ? w.on : w.on && Math.random() < 0.002;
          c.fillStyle = on ? w.c : P.mix(bot, '#0b0f1a', 0.55);
          c.fillRect(b.x + w.x, GROUND - b.h + w.y, 3, 4);
        });
        if (b.sign && (Math.sin(t * 3 + b.x) > -0.7)) {
          c.fillStyle = b.sign.c;
          c.fillRect(b.x + b.w - 3, GROUND - b.h + b.sign.y, 2, b.sign.w * 2);
        }
      });
      // 地面以下是被淹沒的舊城
      c.fillStyle = '#071820'; c.fillRect(0, GROUND, 320, 180 - GROUND);
      this.drawBuilding(c, s, night);
      this.drawWater(c, s, night, bot);
      this.drawWeather(c, s);
      if (night) this.drawUfo(c, s);
      this.fx.draw(c);
      if (this.flash > 0) { c.fillStyle = 'rgba(255,255,255,' + Math.min(1, this.flash) + ')'; c.fillRect(0, 0, 320, 180); }
    },
    drawBuilding(c, s, night) {
      const top = floorTop(8);
      c.fillStyle = '#1c2438';
      c.fillRect(BX, top - 6, BW, GROUND - top + 6);
      c.fillStyle = '#2a3554';
      c.fillRect(BX, top - 6, BW, 2);
      // 天台招牌
      c.fillStyle = '#0b0f1a'; c.fillRect(BX + 18, top - 16, 36, 9);
      c.fillStyle = Math.sin(this.t * 4) > -0.8 ? '#ff4fb4' : '#5a2245';
      c.fillRect(BX + 20, top - 14, 32, 1); c.fillRect(BX + 20, top - 10, 32, 1);
      for (let f = 1; f <= 8; f++) {
        const y = floorTop(f);
        c.fillStyle = '#151c2c'; c.fillRect(BX, y + FLOOR_H - 1, BW, 1);
        for (let i = 0; i < 3; i++) {
          const wx = BX + 6 + i * 22, wy = y + 3;
          const isPlayer = f === s.floor && i === 1;
          const wet = s.water >= f;
          const lit = SKYLINE.bwins[(f - 1) * 3 + i].on && night;
          let col = wet ? '#123844' : lit ? '#ffd36b' : '#2a3350';
          if (isPlayer) col = wet ? '#1d5a66' : night ? '#ffcf7a' : '#5b6b90';
          c.fillStyle = col; c.fillRect(wx, wy, 16, 11);
          if (isPlayer) {
            c.save();
            c.beginPath(); c.rect(wx, wy, 16, 11); c.clip();
            const bob = Math.round(Math.sin(this.t * 2) * 0.5);
            const beamLift = this.beam && this.beam.t > 2.4 ? Math.min(60, (this.beam.t - 2.4) * 30) : 0;
            // 超重：光束一拉，人被提起一點又跌回去
            const strain = this.sl && this.sl.heavy && this.sl.t > 3.2 ? Math.round(Math.abs(Math.sin(this.sl.t * 9)) * 3) : 0;
            if (beamLift < 12) P.sprite(c, 'player', wx + 4, wy + 1 + bob - beamLift - strain, { desat: Math.max(0, 1 - s.spark / 2.5) });
            if (beamLift < 12) this.drawStones(c, s, wx + 10, wy + 10 - strain);
            c.restore();
          }
          // 灰化了的前世：在另一個窗口做標註
          if (s.greyed && f === Math.max(1, Math.min(8, s.floor === 3 ? 5 : 3)) && i === 2 && !wet) {
            c.fillStyle = '#6b7280'; c.fillRect(wx + 6, wy + 4, 4, 7);
            c.fillStyle = '#9ca3af'; c.fillRect(wx + 6, wy + 2, 4, 3);
            c.fillStyle = '#7fb7ff'; c.fillRect(wx + 1, wy + 7, 4, 3);
          }
        }
      }
      // 天橋下
      if (s.floor === 0) {
        const p = this.playerPos(s);
        c.fillStyle = '#2a3350'; c.fillRect(84, p.y + 12, 44, 3); c.fillRect(90, p.y + 15, 3, 10); c.fillRect(118, p.y + 15, 3, 10);
        P.sprite(c, 'player', p.x, p.y, { desat: Math.max(0, 1 - s.spark / 2.5) });
        this.drawStones(c, s, p.x + 6, p.y + 11);
      }
      if (this.beam && this.beam.t > 2.4) {
        const p = this.playerPos(s);
        const lift = Math.min(60, (this.beam.t - 2.4) * 30);
        if (lift >= 12) P.sprite(c, 'player', p.x, p.y - lift, { alpha: Math.max(0, 1 - (lift - 40) / 20) });
      }
    },
    // 靈魂的重量：背後的石頭，每 6 克一塊，超重會變紅
    drawStones(c, s, x, y) {
      const n = Math.min(5, Math.ceil(s.soul / 6));
      const over = s.soul > IE.Rules.SOUL_LIMIT;
      for (let i = 0; i < n; i++) {
        c.fillStyle = over ? '#8a3b3b' : '#5c5448';
        const sx = x + (i % 3) * 2, sy = y - Math.floor(i / 3) * 2;
        c.fillRect(sx, sy, 2, 2);
        c.fillStyle = over ? '#c46a6a' : '#8a7f70'; c.fillRect(sx, sy, 1, 1);
      }
    },
    drawWater(c, s, night, bot) {
      const wy = waterY(s.water);
      c.fillStyle = P.rgba('#0e5a6e', 0.78);
      c.fillRect(0, wy, 320, 180 - wy);
      c.fillStyle = P.rgba('#37c3d6', 0.55);
      for (let x = 0; x < 320; x += 2) {
        const yy = wy + Math.round(Math.sin(x * 0.12 + this.t * 2) * 1.2);
        c.fillRect(x, yy, 2, 1);
      }
      if (night) {
        c.fillStyle = P.rgba('#ff4fb4', 0.25);
        for (let i = 0; i < 18; i++) {
          const x = (i * 53 + Math.floor(this.t * 6)) % 320;
          c.fillRect(x, wy + 4 + (i % 5) * 3, 6, 1);
        }
      }
    },
    drawWeather(c, s) {
      const w = IE.DATA.SEASONS[s.season].weather;
      if (w === 'storm' || w === 'acid') {
        c.fillStyle = w === 'acid' ? 'rgba(196,224,74,0.5)' : 'rgba(170,210,255,0.45)';
        for (let i = 0; i < 70; i++) {
          const x = (i * 97 + this.t * (w === 'storm' ? 260 : 120)) % 340 - 10;
          const y = (i * 61 + this.t * 220) % 180;
          c.fillRect(Math.round(x), Math.round(y), 1, w === 'storm' ? 4 : 3);
        }
      } else if (w === 'heat') {
        c.fillStyle = 'rgba(255,138,60,0.08)';
        for (let y = 60; y < 180; y += 6) c.fillRect(Math.sin(y + this.t * 3) * 2, y, 320, 2);
      }
    },
    drawUfo(c, s) {
      const p = this.playerPos(s);
      let ux = 160 + Math.sin(this.t * 0.3) * 120, uy = 30;
      let spotX = null, spotY = null, alpha = 0.18;
      if (this.sl) {
        const k = Math.min(1, this.sl.t / 4);
        if (this.sl.lock) {
          // 鎖定：從左邊慢慢移到你的窗口，然後停下
          const ease = 1 - Math.pow(1 - k, 3);
          spotX = 10 + (p.x + 4 - 10) * ease; spotY = p.y + 5;
        } else {
          // 掃過：訊號越接近門檻，光束越貼近你住的樓層
          const miss = (1 - Math.min(1, this.sl.ratio)) * 70 + 6;
          spotX = -30 + 380 * k; spotY = p.y + 5 - miss;
        }
        ux = spotX + Math.sin(this.t) * 6; alpha = 0.3;
      } else if (this.beam) {
        const k = Math.min(1, this.beam.t / 2);
        ux = 160 + (p.x + 4 - 160) * k; uy = 30;
        spotX = p.x + 4; spotY = p.y + 6; alpha = 0.2 + k * 0.4;
      } else if (this.mode === 'attract') {
        spotX = ux + Math.sin(this.t * 0.7) * 40; spotY = 120;
      }
      if (spotX != null) {
        const grad = c.createLinearGradient(0, uy, 0, spotY);
        grad.addColorStop(0, 'rgba(200,255,250,' + alpha + ')');
        grad.addColorStop(1, 'rgba(200,255,250,' + alpha * 0.4 + ')');
        c.fillStyle = grad;
        const half = this.beam ? 10 : 16;
        c.beginPath(); c.moveTo(ux - 3, uy + 5); c.lineTo(ux + 3, uy + 5);
        c.lineTo(spotX + half, spotY); c.lineTo(spotX - half, spotY); c.closePath(); c.fill();
        c.fillStyle = 'rgba(220,255,250,' + (alpha + 0.15) + ')';
        c.fillRect(Math.round(spotX - half), Math.round(spotY) - 1, half * 2, 2);
      }
      // 飛碟
      c.fillStyle = '#9aa7c7'; c.fillRect(Math.round(ux) - 12, uy + 2, 24, 3);
      c.fillStyle = '#cfd8ee'; c.fillRect(Math.round(ux) - 6, uy - 2, 12, 4);
      c.fillStyle = '#9be36b'; c.fillRect(Math.round(ux) - 3, uy - 1, 6, 2);
      for (let i = 0; i < 5; i++) {
        c.fillStyle = (Math.floor(this.t * 6) + i) % 5 === 0 ? '#ff4fb4' : '#ffd36b';
        c.fillRect(Math.round(ux) - 10 + i * 5, uy + 3, 1, 1);
      }
    },
    drawText() {
      const s = this.state();
      if (this.mode === 'attract') {
        P.text('靈感撤離 2080', 160, 52, { size: 26, align: 'center', weight: 900, color: '#fff2f9', glow: '#ff4fb4', stroke: '#1a0b16' });
        P.text('INSPIRATION EVACUATION', 160, 84, { size: 7, align: 'center', font: 'pixel', weight: 400, color: '#7ee6f2' });
        return;
      }
      if (!s) return;
      if (this.sl && this.sl.t > 1 && this.sl.t < 4.6) {
        const near = this.sl.ratio;
        const msg = this.sl.lock && this.sl.heavy ? (this.sl.t > 3.2 ? '光束停在你的窗外，卻拉不動你。' : '探射燈停在你的窗外。') : this.sl.lock ? '探射燈停在你的窗外。' : near > 0.85 ? '探射燈差一點就照到你。' : near > 0.5 ? '探射燈在你頭頂幾層掃過。' : '探射燈在很遠的地方掃過。';
        P.text(msg, 160, 150, { size: 8, align: 'center', color: '#e8fdff', stroke: '#05222a' });
      }
      if (this.beam && this.beam.t > 3.2) {
        P.text('你被選中了。', 160, 70, { size: 16, align: 'center', weight: 900, color: '#ffffff', glow: '#9be36b', stroke: '#0b1a10', alpha: Math.min(1, (this.beam.t - 3.2) / 0.8) });
      }
    },
  };

  // 星際人才發展局辦公室：以對白帶出最後一份工作
  const Office = {
    t: 0, lines: [], i: 0, done: null, charT: 0,
    enter(lines, done) { this.t = 0; this.lines = lines; this.i = 0; this.done = done; this.charT = 0; },
    next() {
      const full = this.lines[this.i];
      if (this.charT * 30 < full.length) { this.charT = 999; return; }
      IE.Audio.sfx('click');
      this.i++; this.charT = 0;
      if (this.i >= this.lines.length && this.done) { const d = this.done; this.done = null; d(); }
    },
    pointer(type) { if (type === 'down') this.next(); },
    key(k) { if (k === ' ' || k === 'Enter') this.next(); },
    update(dt) { this.t += dt; this.charT += dt; },
    draw(c) {
      c.fillStyle = '#e9eef7'; c.fillRect(0, 0, 320, 180);
      c.fillStyle = '#d3dbea'; for (let x = 0; x < 320; x += 32) c.fillRect(x, 0, 1, 130);
      c.fillStyle = '#c4cfe3'; c.fillRect(0, 130, 320, 50);
      // 窗外：被水淹沒的地球
      c.fillStyle = '#0a0e1f'; c.fillRect(200, 20, 96, 70);
      c.save(); c.beginPath(); c.rect(200, 20, 96, 70); c.clip();
      c.fillStyle = '#1e7f99'; c.beginPath(); c.arc(248, 78, 30, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#37c3d6'; c.fillRect(232, 64, 10, 4); c.fillRect(252, 80, 12, 3);
      c.restore();
      c.fillStyle = '#ffffff';
      for (let i = 0; i < 12; i++) c.fillRect(204 + (i * 29) % 90, 24 + (i * 17) % 30, 1, 1);
      c.strokeStyle = '#9aa7c7'; c.lineWidth = 2; c.strokeRect(200, 20, 96, 70);
      // 辦公桌與 HR
      c.fillStyle = '#9aa7c7'; c.fillRect(30, 112, 120, 6);
      c.fillStyle = '#7d8899'; c.fillRect(36, 118, 4, 14); c.fillRect(140, 118, 4, 14);
      P.sprite(c, 'alien', 70, 64 + Math.round(Math.sin(this.t * 2)), { scale: 3 });
      c.fillStyle = '#ffffff'; c.fillRect(44, 104, 18, 8); c.fillStyle = '#37c3d6'; c.fillRect(46, 106, 10, 1); c.fillRect(46, 108, 8, 1);
      // 對白框
      c.fillStyle = 'rgba(17,24,39,0.92)'; c.fillRect(10, 134, 300, 40);
      c.fillStyle = '#9be36b'; c.fillRect(10, 134, 300, 1);
    },
    drawText() {
      P.text('星際人才發展局・入職簡介', 14, 10, { size: 7, color: '#5b6b90' });
      const full = this.lines[Math.min(this.i, this.lines.length - 1)] || '';
      const shown = full.slice(0, Math.floor(this.charT * 30));
      P.text('HR 專員', 16, 137, { size: 6, color: '#9be36b' });
      P.text(shown, 16, 146, { size: 8, color: '#e8edf6' });
      if (Math.floor(this.t * 2) % 2 === 0) P.text('▼', 300, 164, { size: 6, color: '#9be36b' });
    },
  };

  IE.Scenes = { City, Office, floorTop, waterY };
})(window.IE = window.IE || {});
