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
      const morning = !night && s.slot === 0;
      const afternoon = !night && s.slot === 1;
      const isAcid = season.weather === 'acid';
      const isHeat = season.weather === 'heat';
      const isStorm = season.weather === 'storm';
      const t = this.t;
      // 天空：早上（破曉冷藍至玫瑰金）、下午（暖琥珀斜陽）、晚上（深靛夜空）
      const top = night
        ? P.mix(season.sky[0], '#03040a', 0.62)
        : morning
          ? P.mix(season.sky[0], '#2c3e66', 0.35)
          : P.mix(season.sky[0], '#4a1c14', 0.28);
      const midSky = night
        ? P.mix(season.sky[1], '#070b14', 0.5)
        : morning
          ? P.mix(season.sky[1], '#ff9e7a', 0.32)
          : P.mix(season.sky[1], '#ff8533', 0.38);
      const bot = night
        ? P.mix(season.sky[1], '#0a0e17', 0.4)
        : morning
          ? P.mix(season.sky[1], '#ffe0b8', 0.45)
          : P.mix(season.sky[1], '#ffd175', 0.32);
      const g = c.createLinearGradient(0, 0, 0, 180);
      g.addColorStop(0, top);
      g.addColorStop(0.55, midSky);
      g.addColorStop(1, bot);
      c.fillStyle = g; c.fillRect(0, 0, 320, 180);
      // 早上與下午的太陽與光線；晚上星光
      if (night) {
        for (let i = 0; i < 44; i++) {
          const x = (i * 73) % 320, y = (i * 37) % 72;
          c.fillStyle = (Math.sin(t * 2 + i) > 0.55) ? '#ffffff' : '#7d8aa8';
          c.fillRect(x, y, 1, 1);
        }
      } else if (morning) {
        // 早上：東邊初升的朝陽與斜射晨光
        const sx = 62, sy = 38;
        const sg = c.createRadialGradient(sx, sy, 2, sx, sy, 36);
        sg.addColorStop(0, 'rgba(255,244,214,0.75)');
        sg.addColorStop(0.4, 'rgba(255,190,130,0.28)');
        sg.addColorStop(1, 'rgba(255,190,130,0)');
        c.fillStyle = sg; c.fillRect(sx - 36, sy - 36, 72, 72);
        c.fillStyle = '#fff5d6'; c.beginPath(); c.arc(sx, sy, 6, 0, Math.PI * 2); c.fill();
        // 斜射晨光束
        c.fillStyle = 'rgba(255,232,190,0.06)';
        for (let r = 0; r < 3; r++) {
          c.beginPath();
          c.moveTo(sx - 4 + r * 6, sy);
          c.lineTo(sx + 10 + r * 8, sy);
          c.lineTo(sx + 90 + r * 36, GROUND);
          c.lineTo(sx + 50 + r * 30, GROUND);
          c.closePath();
          c.fill();
        }
      } else if (afternoon) {
        // 下午：西斜烈日與暖金天光（熱浪季太陽更巨大灼熱）
        const sx = 258, sy = isHeat ? 26 : 32, sr = isHeat ? 11 : 7;
        const sg = c.createRadialGradient(sx, sy, 2, sx, sy, isHeat ? 54 : 38);
        sg.addColorStop(0, isHeat ? 'rgba(255,230,150,0.88)' : 'rgba(255,215,130,0.72)');
        sg.addColorStop(0.45, isHeat ? 'rgba(255,120,40,0.34)' : 'rgba(255,140,70,0.24)');
        sg.addColorStop(1, 'rgba(255,120,40,0)');
        c.fillStyle = sg; c.fillRect(sx - 56, sy - 56, 112, 112);
        c.fillStyle = isHeat ? '#fff0b8' : '#ffe29a';
        c.beginPath(); c.arc(sx, sy, sr, 0, Math.PI * 2); c.fill();
      }
      // 風暴季：閃電（周期性或隨機劈落）
      if (isStorm) this.drawLightning(c, t);
      // 天空區：浮在上空的富人平台
      c.fillStyle = P.mix(top, '#c9d6ff', 0.25);
      [[30, 16, 46], [214, 10, 60]].forEach(([x, y, w]) => {
        const yy = y + Math.sin(t * 0.5 + x) * 1.5;
        c.fillRect(x, yy, w, 3); c.fillRect(x + 6, yy - 6, w - 12, 6);
        c.fillStyle = '#ffe9a8';
        for (let i = 8; i < w - 8; i += 5) c.fillRect(x + i, yy - 4, 2, 2);
        c.fillStyle = P.mix(top, '#c9d6ff', 0.25);
      });
      // 遠景（熱浪季帶輕微水平扭曲）
      c.fillStyle = P.mix(bot, '#000000', 0.45);
      SKYLINE.far.forEach((b) => {
        const dx = isHeat ? Math.round(Math.sin(t * 4 + b.x * 0.1) * 0.8) : 0;
        c.fillRect(b.x + dx, GROUND - b.h, b.w, b.h);
      });
      // 中景樓宇
      const takenCount = s.npcs ? s.npcs.filter((n) => !n.alive).length : 0;
      SKYLINE.mid.forEach((b, bi) => {
        const bCol = P.mix(bot, '#0b0f1a', morning ? 0.62 : afternoon ? 0.66 : 0.72);
        c.fillStyle = bCol;
        c.fillRect(b.x, GROUND - b.h, b.w, b.h);
        // 早上東側晨光邊／下午西側夕照金邊
        if (morning) {
          c.fillStyle = 'rgba(255,220,175,0.22)';
          c.fillRect(b.x, GROUND - b.h, 1, b.h);
          c.fillRect(b.x, GROUND - b.h, b.w, 1);
        } else if (afternoon) {
          c.fillStyle = 'rgba(255,180,90,0.28)';
          c.fillRect(b.x + b.w - 1, GROUND - b.h, 1, b.h);
          c.fillRect(b.x, GROUND - b.h, b.w, 1);
        }
        b.wins.forEach((w, wi) => {
          // 朋友被帶走越多，鄰棟亮燈的窗口也越少
          const darkByTaken = takenCount > 0 && ((bi * 7 + wi) % 8) < takenCount;
          const on = !darkByTaken && (night ? w.on : afternoon ? (w.on && (wi % 5 === 0)) : false);
          c.fillStyle = on ? w.c : P.mix(bot, '#0b0f1a', 0.55);
          c.fillRect(b.x + w.x, GROUND - b.h + w.y, 3, 4);
        });
        if (b.sign && (Math.sin(t * 3 + b.x) > -0.7)) {
          const sx = b.x + b.w - 3, sy = GROUND - b.h + b.sign.y, sh = b.sign.w * 2;
          if (isAcid) {
            // 酸雨季：被腐蝕的直立霓虹招牌（缺角、斷續閃爍、綠色酸液滴落）
            for (let yy = 0; yy < sh; yy++) {
              if ((yy + bi) % 4 === 1) continue; // 腐蝕缺口
              const sputter = (yy % 3 === 0) && Math.sin(t * 14 + yy + b.x) < 0;
              c.fillStyle = sputter ? '#3a4a1e' : b.sign.c;
              c.fillRect(sx, sy + yy, (yy % 5 === 0) ? 1 : 2, 1);
            }
            // 招牌底部的酸蝕綠斑與滴液
            c.fillStyle = '#9be36b';
            c.fillRect(sx, sy + sh, 1, 2 + Math.floor((t * 6 + bi) % 3));
            c.fillStyle = 'rgba(196,224,74,0.65)';
            c.fillRect(sx + 1, sy + Math.floor(sh * 0.5), 1, 2);
          } else {
            c.fillStyle = b.sign.c;
            c.fillRect(sx, sy, 2, sh);
          }
        }
      });
      // 地面以下是被淹沒的舊城
      c.fillStyle = '#071820'; c.fillRect(0, GROUND, 320, 180 - GROUND);
      this.drawBuilding(c, s, night, morning, afternoon, isAcid);
      this.drawWater(c, s, night, morning, afternoon, bot);
      this.drawWeather(c, s);
      this.drawWorld(c, s, night);
      if (night) this.drawUfo(c, s);
      this.fx.draw(c);
      if (this.flash > 0) { c.fillStyle = 'rgba(255,255,255,' + Math.min(1, this.flash) + ')'; c.fillRect(0, 0, 320, 180); }
    },
    // 風暴季閃電
    drawLightning(c, t) {
      const cycle = t % 3.6;
      const active = (cycle > 0.08 && cycle < 0.26) || (cycle > 1.85 && cycle < 1.97);
      if (!active) return;
      const seed = Math.floor(t * 2);
      const x0 = 55 + ((seed * 79) % 210);
      c.save();
      c.fillStyle = 'rgba(210,235,255,0.16)';
      c.fillRect(0, 0, 320, 180);
      c.strokeStyle = '#eef8ff';
      c.lineWidth = 1.5;
      c.beginPath();
      let lx = x0, ly = 0;
      c.moveTo(lx, ly);
      for (let step = 0; step < 7; step++) {
        lx += ((step % 2 === 0 ? -1 : 1) * (4 + ((seed + step * 3) % 7)));
        ly += 12 + (step % 3) * 4;
        c.lineTo(lx, ly);
        if (step === 2 || step === 4) {
          c.moveTo(lx, ly);
          c.lineTo(lx + (step === 2 ? 12 : -10), ly + 14);
          c.moveTo(lx, ly);
        }
      }
      c.stroke();
      c.restore();
    },
    // 世界事件的畫面：戰爭的火光、失控 AI 的雜訊、停電、飛碟群、霉菌、派對煙花、熱穹
    drawWorld(c, s, night) {
      if (!s.events || !IE.Rules.eventsInfo) return;
      IE.Rules.eventsInfo(s).forEach((w) => { if (w.visual) this.drawVisual(c, s, night, w.visual); });
    },
    drawVisual(c, s, night, visual) {
      const t = this.t;
      switch (visual) {
        case 'war':
          c.fillStyle = 'rgba(255,70,40,0.10)'; c.fillRect(0, 0, 320, 180);
          for (let i = 0; i < 3; i++) {
            const ph = (t * 0.7 + i * 0.37) % 1;
            if (ph < 0.12) { c.fillStyle = 'rgba(255,170,90,' + (0.5 - ph * 4) + ')'; c.fillRect(20 + i * 110 + Math.sin(i * 9) * 30, GROUND - 30 - ph * 60, 26, 30 + ph * 40); }
          }
          c.fillStyle = 'rgba(255,220,160,0.7)';
          for (let i = 0; i < 4; i++) { const x = (t * 90 + i * 83) % 360 - 20; c.fillRect(Math.round(x), Math.round(40 + i * 9 - x * 0.08), 4, 1); }
          break;
        case 'ai':
          for (let i = 0; i < 6; i++) {
            if (Math.random() < 0.5) continue;
            c.fillStyle = ['rgba(255,79,180,0.35)', 'rgba(55,195,214,0.35)', 'rgba(155,227,107,0.3)'][i % 3];
            c.fillRect(Math.floor(Math.random() * 300), Math.floor(Math.random() * 170), 6 + Math.floor(Math.random() * 40), 1 + Math.floor(Math.random() * 3));
          }
          if (Math.floor(t * 2) % 7 === 0) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, Math.floor((t * 60) % 180), 320, 4); }
          break;
        case 'blackout': {
          c.fillStyle = 'rgba(2,4,10,' + (night ? 0.55 : 0.3) + ')'; c.fillRect(0, 0, 320, 180);
          const p = this.playerPos(s);
          const g = c.createRadialGradient(p.x + 4, p.y + 4, 1, p.x + 4, p.y + 4, 14);
          g.addColorStop(0, 'rgba(255,200,120,0.55)'); g.addColorStop(1, 'rgba(255,200,120,0)');
          c.fillStyle = g; c.fillRect(p.x - 12, p.y - 12, 32, 32);
          break;
        }
        case 'aliens':
          for (let i = 0; i < 3; i++) {
            const x = Math.round(50 + i * 110 + Math.sin(t * 0.6 + i * 2) * 20), y = Math.round(22 + i * 6 + Math.sin(t + i) * 3);
            c.fillStyle = 'rgba(200,255,250,0.12)';
            c.beginPath(); c.moveTo(x - 2, y + 4); c.lineTo(x + 2, y + 4); c.lineTo(x + 10, GROUND); c.lineTo(x - 10, GROUND); c.closePath(); c.fill();
            c.fillStyle = '#9aa7c7'; c.fillRect(x - 8, y + 2, 16, 2);
            c.fillStyle = '#cfd8ee'; c.fillRect(x - 4, y - 1, 8, 3);
            c.fillStyle = (Math.floor(t * 5) + i) % 2 ? '#ff4fb4' : '#9be36b'; c.fillRect(x - 1, y, 2, 1);
          }
          break;
        case 'plague':
          for (let i = 0; i < 5; i++) {
            c.fillStyle = 'rgba(140,190,90,' + (0.07 + 0.03 * Math.sin(t + i)) + ')';
            c.fillRect(0, Math.round(GROUND - 50 + i * 12 + Math.sin(t * 0.5 + i) * 4), 320, 10);
          }
          break;
        case 'party':
          if (Math.random() < 0.05) {
            const x = 40 + Math.random() * 240, y = 10 + Math.random() * 30;
            const col = ['#ffc247', '#ff4fb4', '#37c3d6', '#9be36b'][Math.floor(Math.random() * 4)];
            for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; this.fx.add({ x, y, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30, g: 20, drag: 0.97, life: 1.2, color: col }); }
          }
          break;
        case 'heat':
          c.fillStyle = 'rgba(255,140,60,0.12)'; c.fillRect(0, 0, 320, 180);
          c.fillStyle = 'rgba(255,220,180,0.08)';
          for (let i = 0; i < 6; i++) c.fillRect(0, Math.round(GROUND - 20 - i * 14 + Math.sin(t * 3 + i) * 2), 320, 1);
          break;
        case 'flood':
          c.fillStyle = 'rgba(159,220,255,0.35)';
          for (let i = 0; i < 50; i++) c.fillRect((i * 41 + t * 30) % 320, (i * 29 + t * 260) % 180, 1, 5);
          break;
      }
    },
    // 朋友的窗戶座標與燈色（被外星人帶走之後不再亮燈）
    npcWinMap: {
      '8:0': { id: 'dj',   col: '#37c3d6', acc: '#ff4fb4' }, // 天台 DJ 小妹
      '7:2': { id: 'yu',   col: '#b8f28a', acc: '#ffd36b' }, // 寫歌的小雨
      '6:0': { id: 'ken',  col: '#ff8fd1', acc: '#37c3d6' }, // 畫壁畫的阿 Ken
      '6:2': { id: 'miu',  col: '#7fe3ff', acc: '#9be36b' }, // 改裝機械人的 Miu
      '5:0': { id: 'fong', col: '#ff9e7a', acc: '#ffd36b' }, // 唱粵劇的芳姐
      '4:2': { id: 'ho',   col: '#ffd36b', acc: '#c98d5e' }, // 寫詩的何伯
      '3:0': { id: 'mary', col: '#ffb3c6', acc: '#fff2c4' }, // 開糖水舖的 Mary 姐
      '2:2': { id: 'chan', col: '#ffc247', acc: '#3fb6d9' }, // 修船的老陳
    },
    drawBuilding(c, s, night, morning, afternoon, isAcid) {
      const top = floorTop(8);
      c.fillStyle = morning ? '#232d45' : afternoon ? '#262940' : '#1c2438';
      c.fillRect(BX, top - 6, BW, GROUND - top + 6);
      c.fillStyle = morning ? '#465880' : afternoon ? '#6b4e45' : '#2a3554';
      c.fillRect(BX, top - 6, BW, 2);
      // 早上東側／下午西側樓宇受光邊
      if (morning) {
        c.fillStyle = 'rgba(255,222,180,0.22)';
        c.fillRect(BX, top - 6, 2, GROUND - top + 6);
      } else if (afternoon) {
        c.fillStyle = 'rgba(255,175,90,0.28)';
        c.fillRect(BX + BW - 2, top - 6, 2, GROUND - top + 6);
      }
      // 天台招牌（酸雨季呈現腐蝕斑駁、缺口與滴落綠酸）
      c.fillStyle = '#0b0f1a'; c.fillRect(BX + 18, top - 16, 36, 9);
      if (isAcid) {
        c.fillStyle = '#1d2a10';
        c.fillRect(BX + 24, top - 16, 4, 2);
        c.fillRect(BX + 41, top - 16, 5, 2);
        c.fillRect(BX + 31, top - 9, 6, 2);
        const on1 = Math.sin(this.t * 9) > -0.3;
        const on2 = Math.sin(this.t * 15 + 1.7) > 0.1;
        c.fillStyle = on1 ? '#ff4fb4' : '#4a1c38';
        c.fillRect(BX + 20, top - 14, 11, 1);
        c.fillRect(BX + 35, top - 14, 9, 1);
        c.fillStyle = on2 ? '#37c3d6' : '#1b3a44';
        c.fillRect(BX + 21, top - 10, 14, 1);
        c.fillRect(BX + 39, top - 10, 10, 1);
        // 酸蝕鐵鏽與綠色酸液滴痕
        c.fillStyle = '#8fb83b';
        c.fillRect(BX + 25, top - 8, 1, 3);
        c.fillRect(BX + 33, top - 8, 2, 2);
        c.fillRect(BX + 45, top - 8, 1, 4);
        c.fillStyle = '#c4e04a';
        const dripY = top - 5 + Math.floor((this.t * 8) % 5);
        c.fillRect(BX + 25, dripY, 1, 2);
        c.fillRect(BX + 45, top - 4 + Math.floor((this.t * 6 + 2) % 4), 1, 2);
      } else {
        c.fillStyle = Math.sin(this.t * 4) > -0.8 ? '#ff4fb4' : '#5a2245';
        c.fillRect(BX + 20, top - 14, 32, 1);
        c.fillRect(BX + 20, top - 10, 32, 1);
        c.fillStyle = '#37c3d6';
        c.fillRect(BX + 23, top - 12, 8, 1);
        c.fillRect(BX + 36, top - 12, 12, 1);
      }
      for (let f = 1; f <= 8; f++) {
        const y = floorTop(f);
        c.fillStyle = '#151c2c'; c.fillRect(BX, y + FLOOR_H - 1, BW, 1);
        for (let i = 0; i < 3; i++) {
          const wx = BX + 6 + i * 22, wy = y + 3;
          const isPlayer = f === s.floor && i === 1;
          const wet = s.water >= f;
          const npcSlot = this.npcWinMap[f + ':' + i];
          const npcObj = npcSlot && s.npcs ? s.npcs.find((n) => n.id === npcSlot.id) : null;
          const npcAlive = npcSlot ? (!npcObj || npcObj.alive) : false;
          const npcTaken = npcSlot ? !!(npcObj && !npcObj.alive) : false;
          const lit = npcSlot
            ? (npcAlive && (night || afternoon))
            : (!npcTaken && SKYLINE.bwins[(f - 1) * 3 + i].on && night);
          let col = wet ? '#123844' : npcTaken ? '#111624' : lit ? (npcSlot ? npcSlot.col : '#ffd36b') : (morning ? '#384668' : afternoon ? '#3d3f60' : '#2a3350');
          if (isPlayer) col = wet ? '#1d5a66' : night ? '#ffcf7a' : morning ? '#6b82ab' : '#7a7498';
          c.fillStyle = col; c.fillRect(wx, wy, 16, 11);
          // 朋友的窗戶：仍在浮城時亮燈並見剪影；被外星人帶走後熄燈拉上窗簾
          if (npcSlot && !wet && !isPlayer) {
            if (npcAlive) {
              if (night || afternoon) {
                c.fillStyle = npcSlot.acc;
                c.fillRect(wx + 2, wy + 8, 3, 2);
                // 窗內朋友剪影
                c.fillStyle = '#261c2e';
                c.fillRect(wx + 9, wy + 4, 3, 3);
                c.fillRect(wx + 8, wy + 7, 5, 4);
              }
            } else {
              // 被帶走後：漆黑窗格與百葉簾暗紋
              c.fillStyle = '#0b0e18';
              c.fillRect(wx + 1, wy + 1, 14, 9);
              c.fillStyle = '#1a2133';
              c.fillRect(wx + 1, wy + 3, 14, 1);
              c.fillRect(wx + 1, wy + 6, 14, 1);
            }
          }
          if (isPlayer) {
            c.save();
            c.beginPath(); c.rect(wx, wy, 16, 11); c.clip();
            const bob = Math.round(Math.sin(this.t * 2) * 0.5);
            const beamLift = this.beam && this.beam.t > 2.4 ? Math.min(60, (this.beam.t - 2.4) * 30) : 0;
            // 超重：光束一拉，人被提起一點又跌回去
            const strain = this.sl && this.sl.heavy && this.sl.t > 3.2 ? Math.round(Math.abs(Math.sin(this.sl.t * 9)) * 3) : 0;
            if (beamLift < 12) P.sprite(c, IE.Chars.spr(s), wx + 4, wy + 1 + bob - beamLift - strain, { desat: Math.max(0, 1 - s.spark / 2.5) });
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
        P.sprite(c, IE.Chars.spr(s), p.x, p.y, { desat: Math.max(0, 1 - s.spark / 2.5) });
        this.drawStones(c, s, p.x + 6, p.y + 11);
      }
      if (this.beam && this.beam.t > 2.4) {
        const p = this.playerPos(s);
        const lift = Math.min(60, (this.beam.t - 2.4) * 30);
        if (lift >= 12) P.sprite(c, IE.Chars.spr(s), p.x, p.y - lift, { alpha: Math.max(0, 1 - (lift - 40) / 20) });
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
    drawWater(c, s, night, morning, afternoon, bot) {
      const wy = waterY(s.water);
      const isAcid = IE.DATA.SEASONS[s.season].weather === 'acid';
      const waterBase = isAcid ? '#13564c' : morning ? '#14667c' : afternoon ? '#12586e' : '#0e5a6e';
      c.fillStyle = P.rgba(waterBase, 0.8);
      c.fillRect(0, wy, 320, 180 - wy);
      // 早上水面薄霧／下午斜陽波光
      if (morning) {
        c.fillStyle = 'rgba(255,235,210,0.12)';
        c.fillRect(0, wy - 3, 320, 5);
      } else if (afternoon) {
        c.fillStyle = 'rgba(255,190,105,0.22)';
        for (let i = 0; i < 14; i++) {
          const sx = 210 + Math.sin(this.t * 2 + i) * 28 - i * 3;
          c.fillRect(Math.round(sx), wy + 2 + i * 2, 10 + (i % 4) * 3, 1);
        }
      }
      // 水面波紋線
      c.fillStyle = P.rgba(isAcid ? '#9be36b' : '#37c3d6', 0.6);
      for (let x = 0; x < 320; x += 2) {
        const yy = wy + Math.round(Math.sin(x * 0.12 + this.t * 2.2) * 1.2);
        c.fillRect(x, yy, 2, 1);
      }
      // 霓虹與燈光在水面的搖曳倒影
      const reflAlpha = night ? 0.42 : afternoon ? 0.2 : 0.12;
      const neonSources = [
        { x: BX + 24, w: 24, col: '#ff4fb4' },
        { x: BX + 10, w: 14, col: '#37c3d6' },
        { x: BX + 32, w: 14, col: '#ffd36b' },
      ];
      SKYLINE.mid.forEach((b) => {
        if (b.sign) neonSources.push({ x: b.x + b.w - 6, w: 10, col: b.sign.c });
      });
      neonSources.forEach((ns, idx) => {
        c.fillStyle = P.rgba(ns.col, reflAlpha);
        for (let r = 0; r < 9; r++) {
          const ry = wy + 2 + r * 3;
          if (ry >= 179) break;
          const sway = Math.round(Math.sin(this.t * 3.4 + r * 0.8 + idx) * (1.5 + r * 0.25));
          const rw = Math.max(2, Math.round(ns.w * (1 - r * 0.08)));
          const rx = Math.round(ns.x + (ns.w - rw) / 2 + sway);
          c.fillRect(rx, ry, rw, 1);
        }
      });
      if (night) {
        c.fillStyle = P.rgba('#ff4fb4', 0.28);
        for (let i = 0; i < 22; i++) {
          const x = (i * 53 + Math.floor(this.t * 7)) % 320;
          c.fillRect(x, wy + 3 + (i % 6) * 3, 5 + (i % 3) * 2, 1);
        }
      }
    },
    drawWeather(c, s) {
      const w = IE.DATA.SEASONS[s.season].weather;
      const wy = waterY(s.water);
      if (w === 'storm') {
        // 風暴季：強風斜雨與水面濺花
        c.strokeStyle = 'rgba(175,218,255,0.52)';
        c.lineWidth = 1;
        c.beginPath();
        for (let i = 0; i < 85; i++) {
          const x = ((i * 97 - this.t * 180) % 360 + 360) % 360 - 10;
          const y = (i * 61 + this.t * 250) % 180;
          c.moveTo(x, y);
          c.lineTo(x - 4, y + 7);
        }
        c.stroke();
        // 雨點打在水面激起白沫
        c.fillStyle = 'rgba(210,240,255,0.65)';
        for (let i = 0; i < 16; i++) {
          const sx = Math.round((i * 47 + this.t * 90) % 316);
          if (((i * 19 + Math.floor(this.t * 12)) % 5) === 0) {
            c.fillRect(sx, wy - 1, 3, 1);
            c.fillRect(sx + 1, wy - 2, 1, 1);
          }
        }
      } else if (w === 'acid') {
        // 酸雨季：螢光綠酸雨點與腐蝕氣泡
        for (let i = 0; i < 72; i++) {
          const x = Math.round((i * 97 + this.t * 45) % 330 - 5);
          const y = Math.round((i * 61 + this.t * 175) % 180);
          c.fillStyle = (i % 3 === 0) ? 'rgba(155,227,107,0.72)' : 'rgba(196,224,74,0.58)';
          c.fillRect(x, y, 1, 3);
          c.fillStyle = 'rgba(235,255,160,0.8)';
          c.fillRect(x, y + 2, 1, 1);
        }
        // 水面與屋頂的酸蝕綠泡
        c.fillStyle = 'rgba(196,224,74,0.7)';
        for (let i = 0; i < 14; i++) {
          const bx = Math.round((i * 59 + this.t * 30) % 312);
          const phase = (this.t * 3 + i * 0.7) % 1;
          c.fillRect(bx, Math.round(wy - phase * 4), 2, 1);
        }
      } else if (w === 'heat') {
        // 熱浪季：熱空氣扭曲波紋與上升熱流
        c.fillStyle = 'rgba(255,138,60,0.09)';
        c.fillRect(0, 0, 320, 180);
        for (let y = 36; y < 176; y += 5) {
          const shift = Math.sin(y * 0.22 + this.t * 4.5) * 3.5;
          c.fillStyle = (y % 10 === 0) ? 'rgba(255,210,140,0.11)' : 'rgba(255,140,60,0.07)';
          c.fillRect(Math.round(shift), y, 320, 2);
        }
        // 上升熱氣微粒
        c.fillStyle = 'rgba(255,225,165,0.28)';
        for (let i = 0; i < 20; i++) {
          const hx = Math.round((i * 67 + Math.sin(this.t * 2 + i) * 8) % 320);
          const hy = Math.round(170 - ((this.t * 22 + i * 19) % 130));
          c.fillRect(hx, hy, 2, 1);
        }
      }
    },
    drawUfo(c, s) {
      const p = this.playerPos(s);
      const wy = waterY(s.water);
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
      } else {
        // 平常晚上與標題畫面：飛碟探射燈持續掃過浮城與水面
        spotX = ux + Math.sin(this.t * 0.75) * 44;
        spotY = this.mode === 'attract' ? 120 : Math.min(GROUND, wy + 2);
        alpha = 0.17;
      }
      if (spotX != null) {
        const grad = c.createLinearGradient(0, uy, 0, spotY);
        grad.addColorStop(0, 'rgba(190,255,245,' + alpha + ')');
        grad.addColorStop(1, 'rgba(155,227,107,' + alpha * 0.45 + ')');
        c.fillStyle = grad;
        const half = this.beam ? 10 : 18;
        c.beginPath(); c.moveTo(ux - 3, uy + 5); c.lineTo(ux + 3, uy + 5);
        c.lineTo(spotX + half, spotY); c.lineTo(spotX - half, spotY); c.closePath(); c.fill();
        c.fillStyle = 'rgba(220,255,250,' + (alpha + 0.16) + ')';
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
