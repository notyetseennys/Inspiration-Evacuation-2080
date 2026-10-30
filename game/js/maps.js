// 地圖：你的房間、浮城地圖、世界地圖、旅行目的地的全景。每個場景都有可以點擊的熱點，點擊後由 main.js 決定做甚麼。
(function (IE) {
  'use strict';
  const P = IE.Pixel, D = IE.DATA;
  const RL = () => IE.Rules;
  const rect = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
  const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // 用 icons.js 的 12×12 圖形直接畫在畫布上
  function icon(c, shape, pal, x, y) {
    const rows = IE.Icons.SHAPES[shape] || IE.Icons.SHAPES.gem;
    const PAL = Object.assign({ k: '#14141c', a: '#8e9bb0', b: '#4a5568', c: '#e8edf6', w: '#ffffff' }, pal);
    rows.forEach((r, j) => { for (let i = 0; i < 12; i++) { const ch = r[i]; if (!ch || ch === '.' || !PAL[ch]) continue; c.fillStyle = PAL[ch]; c.fillRect(x + i, y + j, 1, 1); } });
  }
  // 提示框：畫在高解像度的文字層
  function tip(lines, x, y, color) {
    const ctx = P.view.ctx, s = P.view.scale, size = 7, lh = size * 1.3;
    const w = Math.max.apply(null, lines.map((l, i) => P.measure(l, { size: i ? size - 1 : size }))) + 8;
    const h = lines.length * lh + 5;
    const bx = clamp(x - w / 2, 2, 318 - w);
    let by = y - h - 3;
    if (by < 2) by = y + 14;
    ctx.save();
    ctx.fillStyle = 'rgba(8,11,19,0.9)'; ctx.fillRect(bx * s, by * s, w * s, h * s);
    ctx.strokeStyle = color || '#37c3d6'; ctx.lineWidth = Math.max(1, s * 0.5); ctx.strokeRect(bx * s, by * s, w * s, h * s);
    ctx.restore();
    lines.forEach((l, i) => P.text(l, bx + 4, by + 3 + i * lh, { size: i ? size - 1 : size, color: i ? '#b9c3d8' : '#ffffff', weight: i ? 500 : 700 }));
  }

  // 共用：熱點、懸停、點擊
  function scene(name, o) {
    return Object.assign({
      name, t: 0, hover: null, fx: P.particles(),
      spots() { return []; },
      hit(x, y) { return this.spots().find((sp) => x >= sp.x && x < sp.x + sp.w && y >= sp.y && y < sp.y + sp.h) || null; },
      pointer(type, x, y) {
        const sp = this.hit(x, y);
        if (type === 'move' || type === 'down') this.hover = sp ? sp.id : null;
        if (P.view.canvas) P.view.canvas.style.cursor = sp ? 'pointer' : 'default';
        if (type === 'down' && sp && Maps.onPick) { IE.Audio.sfx('click'); Maps.onPick(name, sp); }
      },
      // 熱點的外框：懸停時發亮
      drawSpots(c) {
        this.spots().forEach((sp) => {
          if (sp.id !== this.hover) return;
          c.strokeStyle = sp.off ? 'rgba(141,153,180,0.8)' : 'rgba(255,194,71,0.95)';
          c.lineWidth = 1;
          c.strokeRect(sp.x + 0.5, sp.y + 0.5, sp.w - 1, sp.h - 1);
        });
      },
      drawTip() {
        const sp = this.spots().find((x) => x.id === this.hover);
        if (sp) tip([sp.label].concat(sp.sub ? [sp.sub] : []), sp.x + sp.w / 2, sp.y, sp.off ? '#8d99b4' : sp.color || '#ffc247');
      },
      update(dt) { this.t += dt; this.fx.update(dt); },
    }, o);
  }
  const S = () => IE.Game && IE.Game.state;
  const isNight = (s) => s.slot === 2;

  // =====================================================================
  // 房間
  // =====================================================================
  const WORK_SLOTS = [[142, 16], [164, 16], [186, 16], [142, 38], [164, 38], [186, 38]];
  const Room = scene('room', {
    spots() {
      const s = S();
      if (!s) return [];
      const night = isNight(s);
      const acts = Maps.actions || [];
      const a = (id) => acts.find((x) => x.id === id);
      const off = (id) => !a(id) || !a(id).enabled;
      if (s.floor === 0) {
        return [
          { id: 'map', x: 0, y: 40, w: 40, h: 100, label: '浮城地圖', sub: '到別的地方去' },
          { id: 'rest', x: 44, y: 116, w: 70, h: 26, label: night ? '早點睡' : '休息', sub: '在紙皮箱裡睡一覺', off: off('rest') },
          { id: 'create', x: 128, y: 108, w: 40, h: 26, label: night ? '創作' : '筆記簿', sub: night ? '今晚把素材變成作品' : '創作要等到晚上', off: !night || off('create') },
          { id: 'objects', x: 176, y: 112, w: 30, h: 22, label: '膠袋裡的靈感物件', sub: s.objects.length + '/' + s.objSlots + ' 件' },
          { id: 'phone', x: 112, y: 120, w: 12, h: 12, label: '手機', sub: '商店與今天的動態' },
          { id: 'city', x: 220, y: 20, w: 96, h: 90, label: '浮城', sub: '看看整座城市' },
        ];
      }
      return [
        { id: 'map', x: 10, y: 58, w: 34, h: 74, label: '出門', sub: '打開浮城地圖' },
        { id: 'create', x: 140, y: 86, w: 48, h: 46, label: night ? '創作' : '書桌', sub: night ? '今晚把素材變成作品' : '創作要等到晚上', off: !night || off('create') },
        { id: 'phone', x: 190, y: 86, w: 16, h: 14, label: '手機', sub: '商店與今天的動態' },
        { id: 'rest', x: 50, y: 100, w: 70, h: 34, label: night ? '早點睡' : '休息', sub: '身體 +' + (22 + (IE.World.decorOn(s, 'bed') ? 3 : 0)), off: off('rest') },
        { id: 'objects', x: 54, y: 30, w: 80, h: 20, label: '靈感物件', sub: s.objects.length + '/' + s.objSlots + ' 件・按一下排列' },
        { id: 'gear', x: 54, y: 56, w: 48, h: 36, label: '道具掛牆', sub: '買過的裝備會掛在這裡・按一下打開浮城百貨' },
        { id: 'works', x: 140, y: 12, w: 66, h: 48, label: '作品牆', sub: s.works.length + ' 件作品・賣畫與天空區委託' },
        { id: 'city', x: 226, y: 22, w: 74, h: 70, label: '窗外', sub: '看看浮城的橫切面' },
        { id: 'decor', x: 122, y: 136, w: 18, h: 12, label: '家具目錄', sub: '用錢把這裡變成一個家' },
        { id: 'stats', x: 208, y: 26, w: 16, h: 20, label: '月曆', sub: '第 ' + s.day + ' 天・篩選日在第 ' + RL().reviewDay(s) + ' 天' },
      ];
    },
    draw(c) {
      const s = S();
      if (!s) return;
      if (s.floor === 0) { this.drawStreet(c, s); this.drawSpots(c); return; }
      const night = isNight(s), t = this.t;
      const has = (id) => !!(s.decor && s.decor[id]);
      const season = D.SEASONS[s.season];
      // 牆
      const wall = night ? '#1d2133' : '#2c3350';
      rect(c, 0, 0, 320, 132, wall);
      for (let x = 0; x < 320; x += 12) rect(c, x, 0, 1, 132, P.mix(wall, '#000000', 0.12));
      // 發霉
      if (s.conds.mold || RL().flooded(s)) for (let i = 0; i < 14; i++) rect(c, 60 + hash(i) * 200, 70 + hash(i + 9) * 50, 2 + Math.floor(hash(i + 3) * 3), 2, '#3d5a3a');
      // 地板
      rect(c, 0, 132, 320, 48, '#3b2a1e');
      for (let y = 136; y < 180; y += 6) rect(c, 0, y, 320, 1, '#2a1d14');
      for (let i = 0; i < 18; i++) rect(c, (i * 37) % 320, 136 + (i % 7) * 6, 1, 5, '#2a1d14');
      // 窗
      this.drawWindow(c, s, night, season);
      // 冷氣機
      if (has('ac')) {
        rect(c, 238, 6, 50, 12, '#d6dce8'); rect(c, 238, 15, 50, 3, '#9aa7c7');
        for (let i = 0; i < 6; i++) rect(c, 242 + i * 7, 9, 5, 1, '#9aa7c7');
        if (Math.sin(t * 6) > 0) rect(c, 282, 8, 2, 2, '#9be36b');
      }
      // 門
      rect(c, 8, 56, 38, 78, '#1a1d2b');
      rect(c, 10, 58, 34, 76, has('lock') ? '#5a6478' : '#6b4a32');
      rect(c, 14, 64, 26, 30, P.mix(has('lock') ? '#5a6478' : '#6b4a32', '#000000', 0.15));
      rect(c, 14, 100, 26, 28, P.mix(has('lock') ? '#5a6478' : '#6b4a32', '#000000', 0.15));
      rect(c, 38, 96, 3, 3, '#e8c25a');
      if (has('lock')) { rect(c, 36, 74, 5, 3, '#c9d1dc'); rect(c, 36, 110, 5, 3, '#c9d1dc'); rect(c, 30, 88, 7, 6, '#1b1b28'); rect(c, 31, 89, 5, 1, Math.sin(t * 3) > 0 ? '#ff4d5e' : '#9be36b'); }
      // 霓虹燈
      if (has('neonsign')) {
        const on = Math.sin(t * 5) > -0.85;
        const col = on ? '#ff4fb4' : '#5a2245';
        rect(c, 10, 38, 34, 1, col); rect(c, 10, 48, 34, 1, col); rect(c, 10, 38, 1, 11, col); rect(c, 43, 38, 1, 11, col);
        [[14, 41], [18, 43], [22, 41], [27, 44], [31, 41], [36, 43]].forEach(([x, y]) => rect(c, x, y, 3, 2, on ? '#37c3d6' : '#1f4a52'));
        if (on) { c.fillStyle = 'rgba(255,79,180,0.08)'; c.fillRect(2, 30, 50, 28); }
      }
      // 抽水泵
      if (has('pump')) { rect(c, 0, 118, 9, 14, '#4a5568'); rect(c, 1, 120, 7, 4, '#37c3d6'); rect(c, 4, 112, 2, 6, '#2a3142'); if (RL().flooded(s) && Math.sin(t * 9) > 0) rect(c, 2, 125, 5, 1, '#9be36b'); }
      // 架子與靈感物件
      rect(c, 54, 46, 80, 3, '#6b4a32'); rect(c, 58, 49, 2, 6, '#4a3222'); rect(c, 128, 49, 2, 6, '#4a3222');
      s.objects.forEach((id, i) => { const o = D.OBJ[id]; if (o) icon(c, o.icon, o.pal, 58 + i * 15, 34); });
      for (let i = s.objects.length; i < s.objSlots; i++) rect(c, 61 + i * 15, 43, 6, 1, '#4a3222');
      // 海報
      if (has('poster')) {
        rect(c, 104, 58, 20, 28, '#1b1b28'); rect(c, 105, 59, 18, 26, '#d6334a');
        rect(c, 108, 62, 12, 10, '#1b1b28'); rect(c, 110, 64, 8, 6, '#ffd36b'); rect(c, 107, 76, 14, 2, '#1b1b28'); rect(c, 109, 80, 10, 2, '#1b1b28');
      }
      // 道具掛牆：買過的裝備都掛在這裡
      const GEAR = [['helmet', 'helmet'], ['gasmask', 'gasmask'], ['lifejacket', 'jacket'], ['tank', 'tank'], ['harpoon', 'harpoon'], ['bag', 'backpack'], ['amulet', 'amulet'], ['earplugs', 'earplug'], ['insurance', 'paper']];
      const owned = GEAR.filter(([g]) => s.gear[g]);
      if (owned.length) {
        rect(c, 54, 56, 48, 36, '#5a4a3a');
        for (let yy = 59; yy < 92; yy += 4) for (let xx = 57; xx < 102; xx += 4) rect(c, xx, yy, 1, 1, '#3b2a1e');
        owned.slice(0, 6).forEach(([g, ic], i) => { rect(c, 61 + (i % 3) * 14, 57 + Math.floor(i / 3) * 17, 2, 2, '#c9d1dc'); icon(c, ic, IE.Icons.ITEM_PAL[ic], 56 + (i % 3) * 14, 60 + Math.floor(i / 3) * 17); });
      }
      // 床
      if (has('bed')) {
        rect(c, 50, 110, 70, 16, '#8a5a3b'); rect(c, 52, 104, 66, 10, '#e8edf6'); rect(c, 52, 112, 66, 2, '#c9d1dc');
        rect(c, 54, 100, 16, 8, '#ffffff'); rect(c, 50, 126, 3, 8, '#5a3a22'); rect(c, 117, 126, 3, 8, '#5a3a22');
        rect(c, 74, 104, 44, 8, '#37c3d6'); rect(c, 74, 110, 44, 2, '#1f6b7a');
      } else {
        rect(c, 50, 122, 70, 10, '#8d99b4'); rect(c, 50, 130, 70, 2, '#5a6478'); rect(c, 54, 118, 14, 6, '#c9d1dc');
        rect(c, 72, 120, 46, 6, '#6b7a99');
      }
      // 植物
      if (has('plant')) { rect(c, 124, 122, 10, 10, '#c46a1e'); rect(c, 123, 121, 12, 2, '#8a4a1e'); [[126, 112], [129, 108], [131, 114], [124, 116], [128, 116]].forEach(([x, y], i) => rect(c, x + Math.round(Math.sin(t + i) * 0.6), y, 3, 6, i % 2 ? '#3d8b5a' : '#6cc070')); }
      // 家具目錄
      rect(c, 124, 138, 14, 9, '#eef1f7'); rect(c, 125, 139, 6, 4, '#ff4fb4'); rect(c, 132, 140, 5, 1, '#8d99b4'); rect(c, 132, 142, 5, 1, '#8d99b4');
      // 作品牆
      WORK_SLOTS.forEach(([x, y], i) => {
        const w = s.works[s.works.length - WORK_SLOTS.length + i] || null;
        if (!w) { rect(c, x + 8, y + 2, 1, 1, '#8d99b4'); return; }
        rect(c, x, y, 18, 15, w.sold ? '#3a3a48' : '#e8c25a');
        if (w.sold) { rect(c, x + 2, y + 2, 14, 11, wall); rect(c, x + 4, y + 6, 10, 4, '#d6334a'); return; }
        const col = (D.TAGS[w.tags[0]] || { color: '#8d99b4' }).color, col2 = (D.TAGS[w.tags[1]] || { color: '#1b1b28' }).color;
        rect(c, x + 2, y + 2, 14, 11, P.mix(col, '#000000', 0.3));
        for (let k = 0; k < 5; k++) rect(c, x + 3 + Math.floor(hash(w.day * 7 + k) * 10), y + 3 + Math.floor(hash(w.day * 3 + k) * 8), 3, 2, k % 2 ? col : col2);
      });
      // 月曆
      rect(c, 208, 26, 16, 20, '#eef1f7'); rect(c, 208, 26, 16, 5, '#d6334a');
      P.digits(c, String(s.day).padStart(2, '0').slice(-2), 210, 34, '#1b2233', 1);
      // 書桌
      rect(c, 138, 96, 70, 4, '#8a5a3b'); rect(c, 142, 100, 3, 32, '#5a3a22'); rect(c, 200, 100, 3, 32, '#5a3a22');
      rect(c, 160, 82, 24, 14, '#26334d'); rect(c, 162, 84, 20, 10, night ? '#37c3d6' : '#4a5a78'); rect(c, 156, 94, 32, 2, '#8e9bb0');
      if (night) for (let i = 0; i < 4; i++) rect(c, 164, 86 + i * 2, 6 + Math.floor(hash(i + Math.floor(t * 2)) * 10), 1, '#e8fdff');
      rect(c, 190, 80, 2, 16, '#4a5568'); rect(c, 186, 78, 8, 3, '#ffc247');
      if (night) { c.fillStyle = 'rgba(255,194,71,0.12)'; c.beginPath(); c.moveTo(186, 81); c.lineTo(194, 81); c.lineTo(210, 96); c.lineTo(160, 96); c.closePath(); c.fill(); }
      rect(c, 194, 90, 8, 6, '#1b1b28'); rect(c, 195, 91, 6, 4, IE.Game && IE.Game.state && Math.sin(t * 2) > 0.6 ? '#ff4fb4' : '#26334d');
      if (has('stereo')) {
        rect(c, 140, 88, 16, 8, '#3b2a1e'); rect(c, 142, 86, 12, 3, '#15151c'); rect(c, 147, 87, 2, 1, '#ff4d5e');
        if (Math.random() < 0.05) this.fx.add({ x: 150, y: 84, vx: 4, vy: -8, life: 1.5, color: '#9be36b' });
      }
      // 畫架
      if (has('easel')) {
        c.fillStyle = '#8a5a3b'; for (let y = 0; y < 42; y++) { c.fillRect(276 + Math.round(y * 0.12), 92 + y, 2, 1); c.fillRect(294 - Math.round(y * 0.12), 92 + y, 2, 1); }
        rect(c, 274, 94, 24, 20, '#eef1f7'); rect(c, 277, 97, 8, 6, '#ff4fb4'); rect(c, 284, 102, 10, 8, '#37c3d6'); rect(c, 279, 106, 6, 4, '#ffc247');
      }
      // 魚缸
      if (has('aquarium')) {
        rect(c, 232, 120, 36, 12, '#3b2a1e'); rect(c, 232, 100, 36, 20, '#123844'); rect(c, 233, 101, 34, 18, '#1e7f99');
        rect(c, 233, 101, 34, 2, '#37c3d6');
        for (let i = 0; i < 3; i++) { const fx = 236 + ((t * (8 + i * 3) + i * 11) % 26); rect(c, fx, 106 + i * 4, 4, 2, ['#ffc247', '#ff4fb4', '#9be36b'][i]); }
        if (Math.random() < 0.08) this.fx.add({ x: 240 + Math.random() * 24, y: 117, vy: -12, life: 1, color: '#bff3fb' });
      }
      // 望遠鏡
      if (has('telescope')) {
        rect(c, 214, 108, 2, 24, '#4a5568'); rect(c, 210, 128, 10, 2, '#4a5568');
        c.save(); c.translate(214, 106); c.rotate(-0.6); rect(c, -2, -3, 18, 5, '#c9d1dc'); rect(c, 14, -4, 3, 7, '#8e9bb0'); c.restore();
      }
      // 書架
      if (has('bookshelf')) {
        rect(c, 300, 40, 20, 92, '#5a3a22');
        for (let r = 0; r < 5; r++) { rect(c, 301, 44 + r * 18, 19, 1, '#3b2a1e'); for (let k = 0; k < 5; k++) rect(c, 302 + k * 3, 45 + r * 18, 2, 14 - (k * 3 + r) % 5, ['#d6334a', '#37c3d6', '#ffc247', '#9be36b', '#c38bff'][(k + r) % 5]); }
      }
      // 淹水
      if (RL().flooded(s)) {
        const depth = clamp(10 + (s.water - s.floor) * 30, 10, 40);
        c.fillStyle = 'rgba(14,90,110,0.72)'; c.fillRect(0, 180 - depth, 320, depth);
        for (let x = 0; x < 320; x += 3) rect(c, x, 180 - depth + Math.round(Math.sin(x * 0.15 + t * 2)), 2, 1, '#37c3d6');
      }
      // 你：白天在房間裡踱步，晚上站在書桌前
      const px = night ? 166 : 150 + Math.round(Math.sin(t * 0.4) * 26), py = 134;
      P.sprite(c, IE.Chars.spr(s), px, py - 24 + (night ? 0 : Math.round(Math.abs(Math.sin(t * 3)) * -1)), { scale: 2, desat: Math.max(0, 1 - s.spark / 2.5), flip: !night && Math.cos(t * 0.4) < 0 });
      IE.Scenes.City.drawStones(c, s, px + 13, py - 6);
      if (Math.random() < Math.max(0, s.spark - 0.5) * 0.05) this.fx.add({ x: px + 8, y: py - 24, vx: (Math.random() - 0.5) * 6, vy: -10 - Math.random() * 8, life: 1.4, color: Math.random() < 0.7 ? '#ffc247' : '#ff8a3c' });
      // 窗口的光
      if (!night) { c.fillStyle = 'rgba(255,240,200,0.05)'; c.beginPath(); c.moveTo(226, 92); c.lineTo(300, 92); c.lineTo(250, 180); c.lineTo(150, 180); c.closePath(); c.fill(); }
      this.fx.draw(c);
      this.drawSpots(c);
    },
    drawWindow(c, s, night, season) {
      const x0 = 226, y0 = 22, w = 74, h = 70, t = this.t;
      c.save(); c.beginPath(); c.rect(x0, y0, w, h); c.clip();
      const top = night ? P.mix(season.sky[0], '#03040a', 0.6) : s.slot === 0 ? P.mix(season.sky[1], '#ffb38a', 0.25) : season.sky[1];
      const g = c.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, top); g.addColorStop(1, night ? '#0a0e17' : P.mix(season.sky[1], '#ffd3a8', 0.3));
      c.fillStyle = g; c.fillRect(x0, y0, w, h);
      if (night) for (let i = 0; i < 10; i++) rect(c, x0 + (i * 23) % w, y0 + (i * 13) % 30, 1, 1, Math.sin(t * 2 + i) > 0.5 ? '#ffffff' : '#7d8aa8');
      for (let i = 0; i < 6; i++) { const bh = 20 + hash(i) * 34; rect(c, x0 + i * 13, y0 + h - bh, 11, bh, P.mix(top, '#000000', 0.55)); if (night) for (let k = 0; k < 4; k++) if (hash(i * 9 + k) > 0.5) rect(c, x0 + i * 13 + 2 + (k % 2) * 5, y0 + h - bh + 4 + k * 6, 2, 2, '#ffd36b'); }
      // 水位：越接近你的樓層，窗外的水越高
      const near = clamp(1 - (s.floor - s.water), 0, 1);
      if (near > 0) { const wy = y0 + h - near * 30; c.fillStyle = 'rgba(14,90,110,0.85)'; c.fillRect(x0, wy, w, y0 + h - wy); rect(c, x0, wy, w, 1, '#37c3d6'); }
      // 外星探射燈
      if (night) { const bx = x0 + 37 + Math.sin(t * 0.5) * 40; c.fillStyle = 'rgba(200,255,250,0.12)'; c.beginPath(); c.moveTo(bx - 2, y0); c.lineTo(bx + 2, y0); c.lineTo(bx + 14, y0 + h); c.lineTo(bx - 14, y0 + h); c.closePath(); c.fill(); }
      if (season.weather === 'storm' || season.weather === 'acid') { c.fillStyle = season.weather === 'acid' ? 'rgba(196,224,74,0.5)' : 'rgba(170,210,255,0.5)'; for (let i = 0; i < 18; i++) c.fillRect(x0 + (i * 17 + t * 60) % w, y0 + (i * 23 + t * 140) % h, 1, 3); }
      c.restore();
      rect(c, x0 - 3, y0 - 3, w + 6, 3, '#8e9bb0'); rect(c, x0 - 3, y0 + h, w + 6, 4, '#8e9bb0'); rect(c, x0 - 3, y0, 3, h, '#8e9bb0'); rect(c, x0 + w, y0, 3, h, '#8e9bb0');
      rect(c, x0 + w / 2 - 1, y0, 2, h, '#8e9bb0');
    },
    // 露宿街頭：天橋底
    drawStreet(c, s) {
      const night = isNight(s), t = this.t;
      const season = D.SEASONS[s.season];
      const g = c.createLinearGradient(0, 0, 0, 180); g.addColorStop(0, night ? '#05070c' : season.sky[1]); g.addColorStop(1, night ? '#0a0e17' : '#2a3350');
      c.fillStyle = g; c.fillRect(0, 0, 320, 180);
      rect(c, 0, 0, 320, 18, '#2a3350'); rect(c, 0, 18, 320, 4, '#1c2438');
      [30, 150, 270].forEach((x) => { rect(c, x, 22, 16, 120, '#3a4562'); rect(c, x + 2, 22, 2, 120, '#4a5a78'); });
      rect(c, 0, 140, 320, 6, '#3a4562');
      c.fillStyle = 'rgba(14,90,110,0.85)'; c.fillRect(0, 146, 320, 34);
      for (let x = 0; x < 320; x += 3) rect(c, x, 146 + Math.round(Math.sin(x * 0.12 + t * 2)), 2, 1, '#37c3d6');
      rect(c, 44, 120, 70, 20, '#a8865a'); rect(c, 46, 118, 66, 4, '#c9a86b'); rect(c, 60, 124, 30, 2, '#8a6a3b');
      rect(c, 130, 124, 30, 8, '#eef1f7'); rect(c, 132, 126, 12, 1, '#8d99b4'); rect(c, 112, 124, 8, 8, '#1b1b28');
      rect(c, 178, 116, 26, 18, '#e8edf6'); rect(c, 180, 114, 4, 4, '#e8edf6');
      s.objects.forEach((id, i) => { const o = D.OBJ[id]; if (o && i < 2) icon(c, o.icon, o.pal, 180 + i * 10, 120); });
      P.sprite(c, IE.Chars.spr(s), 90, 108, { desat: Math.max(0, 1 - s.spark / 2.5) });
      IE.Scenes.City.drawStones(c, s, 96, 119);
      if (night) { const bx = 160 + Math.sin(t * 0.5) * 140; c.fillStyle = 'rgba(200,255,250,0.1)'; c.beginPath(); c.moveTo(bx - 3, 0); c.lineTo(bx + 3, 0); c.lineTo(bx + 20, 146); c.lineTo(bx - 20, 146); c.closePath(); c.fill(); }
      if (season.weather !== 'heat') { c.fillStyle = 'rgba(170,210,255,0.35)'; for (let i = 0; i < 30; i++) c.fillRect((i * 37 + t * 50) % 320, 22 + (i * 29 + t * 160) % 120, 1, 3); }
      this.fx.draw(c);
    },
    drawText() {
      const s = S();
      if (!s) return;
      P.text(s.floor === 0 ? '天橋底' : '你的家・' + s.floor + ' 樓', 4, 3, { size: 7, color: '#e8edf6', stroke: '#0a0e17' });
      this.drawTip();
    },
  });

  // =====================================================================
  // 浮城地圖（俯瞰）
  // =====================================================================
  // 島：浮城的建築群
  const ISLANDS = [[70, 40, 50, 36], [40, 88, 44, 32], [92, 80, 70, 30], [140, 84, 40, 30], [228, 96, 46, 30], [176, 78, 30, 26],
    [250, 60, 44, 28], [104, 118, 42, 22], [14, 128, 44, 26], [272, 128, 46, 34], [220, 62, 26, 18]];
  const SKY = [[186, 14, 46, 22], [232, 20, 48, 24]];
  const BRIDGES = [[120, 96, 20, 3], [162, 92, 14, 3], [206, 90, 22, 3], [84, 100, 8, 3], [112, 76, 3, 6], [246, 88, 3, 8], [120, 110, 3, 8], [58, 120, 3, 8], [272, 124, 3, 4]];
  const CityMap = scene('map', {
    boats: [0, 1, 2, 3].map((i) => ({ x: hash(i) * 320, y: 0, lane: i })),
    spots() {
      const s = S();
      if (!s) return [];
      const acts = Maps.actions || [];
      return D.PLACES.map((p) => {
        let sub = '', off = false;
        if (p.act) {
          const a = acts.find((x) => x.id === p.act);
          off = !a || !a.enabled;
          sub = a ? (a.enabled ? a.name : a.name + '：' + (a.reason || '')) : isNight(s) ? '晚上不開放' : '';
        } else sub = { room: '回家', antique: '買賣古董與旅行素材', gallery: '賣畫、接委託', world: '世界地圖：出國找素材', store: '生活、保命、潛水、創作、房屋、黑市' }[p.ui] || '';
        return { id: p.id, x: p.x - 10, y: p.y - 10, w: 20, h: 20, label: p.name, sub, off, place: p };
      });
    },
    draw(c) {
      const s = S();
      if (!s) return;
      const night = isNight(s), t = this.t;
      // 海
      rect(c, 0, 0, 320, 180, night ? '#06212c' : '#0c4457');
      for (let i = 0; i < 90; i++) {
        const x = (hash(i) * 340 + t * (4 + (i % 3))) % 340 - 10, y = hash(i + 50) * 180;
        rect(c, x, y, 3, 1, night ? '#0e3a48' : '#1e7f99');
      }
      // 舊城：水底下的街道
      c.fillStyle = night ? 'rgba(20,40,60,0.6)' : 'rgba(20,60,80,0.7)';
      for (let i = 0; i < 12; i++) c.fillRect(150 + (i % 4) * 22, 136 + Math.floor(i / 4) * 14, 16, 9);
      // 島與建築
      ISLANDS.forEach(([x, y, w, h], k) => {
        rect(c, x - 1, y + 2, w + 2, h, '#062a36');
        rect(c, x, y, w, h, night ? '#2a2f45' : '#4a5470');
        for (let i = 0; i < Math.floor(w * h / 70); i++) {
          const bx = x + 2 + Math.floor(hash(k * 31 + i) * (w - 8)), by = y + 2 + Math.floor(hash(k * 17 + i * 3) * (h - 8));
          const bw = 4 + Math.floor(hash(i + k) * 5), bh = 4 + Math.floor(hash(i * 7 + k) * 4);
          rect(c, bx, by, bw, bh, night ? '#1c2033' : P.mix('#8e9bb0', '#4a5470', hash(i * 13 + k)));
          rect(c, bx, by, bw, 1, night ? '#3a4562' : '#c9d1dc');
          if (night && hash(i * 5 + k) > 0.55) rect(c, bx + 1, by + 2, 1, 1, hash(i + k * 3) > 0.8 ? '#ff4fb4' : '#ffd36b');
        }
      });
      BRIDGES.forEach(([x, y, w, h]) => rect(c, x, y, w, h, night ? '#5a6478' : '#c9d1dc'));
      // 機場跑道
      rect(c, 276, 150, 42, 6, '#2a3142'); for (let i = 0; i < 6; i++) rect(c, 279 + i * 7, 152, 3, 1, night && Math.floor(t * 4) % 6 === i ? '#ffd36b' : '#eef1f7');
      const pl = (t * 18) % 140;
      if (pl < 60) { const px = 300 - pl * 1.2, py = 153 - pl * 0.6; rect(c, px, py, 7, 2, '#eef1f7'); rect(c, px + 2, py - 2, 2, 6, '#c9d1dc'); }
      // 船
      this.boats.forEach((b, i) => {
        const lane = [[60, 122], [86, 82], [200, 116], [168, 64]][i];
        const x = (b.x + t * (10 + i * 4)) % 340 - 10;
        rect(c, x, lane[1], 6, 2, '#eef1f7'); rect(c, x - 4, lane[1] + 1, 3, 1, '#bff3fb');
      });
      // 天空區：浮在上空，影子落在水面
      SKY.forEach(([x, y, w, h], k) => {
        c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x + 8, y + 18, w, h);
        const yy = y + Math.sin(t * 0.6 + k) * 1.5;
        rect(c, x, yy, w, h, '#c9d6ff'); rect(c, x, yy + h - 2, w, 2, '#9aa7c7');
        for (let i = 0; i < 6; i++) rect(c, x + 4 + i * 7, yy + 4, 4, 4, i % 2 ? '#9be36b' : '#ffe9a8');
        rect(c, x + 6, yy + 12, w - 12, 4, '#37c3d6');
      });
      // 晚上：探射燈掃過整個城市
      if (night) { const bx = 160 + Math.sin(t * 0.4) * 150, by = 90 + Math.cos(t * 0.3) * 60; const g = c.createRadialGradient(bx, by, 2, bx, by, 26); g.addColorStop(0, 'rgba(200,255,250,0.25)'); g.addColorStop(1, 'rgba(200,255,250,0)'); c.fillStyle = g; c.fillRect(bx - 26, by - 26, 52, 52); }
      // 地點
      const spots = this.spots();
      spots.forEach((sp) => {
        const p = sp.place;
        const hover = sp.id === this.hover;
        const bob = hover ? Math.round(Math.sin(t * 8)) : 0;
        rect(c, p.x - 6, p.y - 6 + bob, 13, 13, sp.off ? '#3a3a48' : p.ui ? '#ff4fb4' : '#ffc247');
        rect(c, p.x - 5, p.y - 5 + bob, 11, 11, sp.off ? '#5a5f6e' : '#1b2233');
        MAP_ICON(c, p.icon, p.x - 4, p.y - 4 + bob, sp.off ? '#8d99b4' : p.ui ? '#ff8fd1' : '#ffd36b');
        if (hover) { c.strokeStyle = '#ffffff'; c.strokeRect(p.x - 7.5, p.y - 7.5 + bob, 15, 15); }
      });
      // 你在家
      const home = D.PLACES.find((p) => p.id === 'home');
      if (Math.sin(t * 4) > 0) { c.strokeStyle = '#ff4fb4'; c.strokeRect(home.x - 9.5, home.y - 9.5, 19, 19); }
      this.fx.draw(c);
    },
    drawText() {
      const s = S();
      if (!s) return;
      P.text('浮城地圖', 4, 3, { size: 7, color: '#e8edf6', stroke: '#0a0e17' });
      P.text(isNight(s) ? '晚上：大部分地方已經關門' : '按地點前往，或者用下面的行動清單', 316, 3, { size: 6, color: '#b9c3d8', stroke: '#0a0e17', align: 'right' });
      D.PLACES.forEach((p) => { if (p.id !== this.hover) P.text(p.name, p.x, p.y + 8, { size: 5, align: 'center', color: '#e8edf6', stroke: '#0a0e17' }); });
      this.drawTip();
    },
  });
  // 浮城地圖的 8×8 圖示
  const MI = {
    home: ['...##...', '..####..', '.######.', '########', '.#....#.', '.#.##.#.', '.#.##.#.', '.######.'],
    office: ['.######.', '.#.#.#..', '.######.', '.#.#.#..', '.######.', '.#.#.#..', '.######.', '.##..##.'],
    sky: ['........', '..####..', '.######.', '########', '.#.##.#.', '..#..#..', '........', '........'],
    boat: ['........', '...#....', '...##...', '...###..', '...#....', '########', '.######.', '........'],
    clinic: ['...##...', '...##...', '########', '########', '...##...', '...##...', '........', '........'],
    dive: ['..####..', '.#....#.', '#.#..#.#', '#......#', '.#....#.', '..####..', '...##...', '..#..#..'],
    bridge: ['........', '########', '#..##..#', '#.#..#.#', '##....##', '#......#', '#......#', '........'],
    friends: ['.##..##.', '.##..##.', '........', '.##..##.', '####.###', '####.###', '.##..##.', '........'],
    shelter: ['...##...', '..####..', '.######.', '########', '#.####.#', '#.#..#.#', '#.#..#.#', '########'],
    market: ['########', '#.#.#.#.', '########', '.#....#.', '.#.##.#.', '.#.##.#.', '.#....#.', '.######.'],
    plane: ['...#....', '...##...', '#..##...', '########', '#..##...', '...##...', '...#....', '........'],
    shop: ['..####..', '.#....#.', '########', '#......#', '#.#..#.#', '#......#', '#......#', '########'],
    garden: ['...##...', '..#..#..', '...##...', '.#.##.#.', '..####..', '########', '#.#.#.#.', '########'],
    crane: ['########', '#.....#.', '#.....#.', '#.....#.', '#....###', '#....###', '#.......', '###.....'],
    stall: ['########', '#.#.#.#.', '########', '.#....#.', '.######.', '.#.##.#.', '.#....#.', '.#....#.'],
  };
  function MAP_ICON(c, id, x, y, col) {
    const rows = MI[id] || MI.home;
    c.fillStyle = col;
    rows.forEach((r, j) => { for (let i = 0; i < 8; i++) if (r[i] === '#') c.fillRect(x + i, y + j, 1, 1); });
  }

  // =====================================================================
  // 世界地圖
  // =====================================================================
  // 64×36 的等距圓柱投影：每一行是 [起, 止] 的陸地欄位（每格 5×5 像素）
  const LAND = [
    [], [[21, 28]], [[11, 13], [16, 18], [20, 29], [34, 35], [49, 50]], [[2, 7], [10, 19], [21, 28], [44, 58]],
    [[2, 8], [9, 19], [22, 27], [28, 29], [34, 37], [37, 63]], [[2, 8], [9, 13], [17, 21], [23, 25], [33, 37], [37, 62]],
    [[8, 14], [18, 23], [30, 31], [33, 36], [36, 56], [60, 60]], [[8, 14], [17, 22], [30, 31], [31, 40], [40, 56], [57, 57]],
    [[9, 21], [22, 22], [31, 36], [39, 40], [42, 56], [57, 57]], [[10, 20], [30, 31], [33, 35], [35, 36], [36, 40], [42, 54], [56, 56]],
    [[10, 19], [30, 31], [34, 34], [35, 39], [40, 45], [46, 54], [55, 57]], [[11, 18], [30, 37], [39, 44], [44, 53], [55, 56]],
    [[12, 14], [17, 17], [29, 37], [39, 42], [42, 48], [48, 53]], [[12, 15], [17, 18], [29, 37], [39, 42], [44, 48], [48, 52]],
    [[14, 16], [29, 38], [40, 41], [45, 47], [49, 51], [53, 54]], [[16, 17], [29, 40], [41, 41], [45, 46], [49, 51], [54, 54]],
    [[17, 21], [30, 41], [46, 46], [50, 51], [51, 53], [54, 54]], [[17, 24], [33, 40], [49, 50], [51, 53], [53, 54]],
    [[17, 25], [33, 39], [50, 53], [55, 58]], [[18, 25], [33, 39], [51, 52], [56, 58]],
    [[18, 25], [34, 39], [40, 41], [54, 57]], [[19, 24], [34, 39], [40, 41], [53, 58]],
    [[19, 24], [34, 38], [40, 40], [52, 58]], [[19, 23], [34, 37], [52, 58]], [[19, 22], [34, 36], [52, 57]],
    [[19, 21], [56, 57], [62, 62]], [[19, 21], [57, 57], [61, 62]], [[19, 20], [61, 61]], [[19, 20]], [], [],
    [[20, 21]], [[0, 18], [22, 63]], [[0, 63]], [[0, 63]], [[0, 63]],
  ];
  const isLand = (col, row) => (LAND[row] || []).some(([a, b]) => col >= a && col <= b);
  const ICE = (row) => row <= 3 || row >= 32;
  const DESERT = (col, row) => (row >= 11 && row <= 14 && col >= 29 && col <= 42) || (row >= 21 && row <= 24 && col >= 53 && col <= 57);
  let worldBase = null;
  function buildWorld() {
    const cv = document.createElement('canvas');
    cv.width = 320; cv.height = 180;
    const c = cv.getContext('2d');
    for (let row = 0; row < 36; row++) for (let col = 0; col < 64; col++) {
      if (!isLand(col, row)) continue;
      const x = col * 5, y = row * 5, n = hash(col * 64 + row);
      const base = ICE(row) ? '#dfe9f5' : DESERT(col, row) ? '#c9a86b' : row >= 16 && row <= 20 ? '#2f7a43' : '#4f8a4a';
      c.fillStyle = P.mix(base, n > 0.5 ? '#ffffff' : '#000000', 0.06 + n * 0.06);
      c.fillRect(x, y, 5, 5);
      // 圓角：令海岸線不那麼方
      const L = isLand(col - 1, row), Rr = isLand(col + 1, row), U = isLand(col, row - 1), Dn = isLand(col, row + 1);
      c.fillStyle = '#0f4a6a';
      if (!L && !U) c.fillRect(x, y, 2, 1), c.fillRect(x, y + 1, 1, 1);
      if (!Rr && !U) c.fillRect(x + 3, y, 2, 1), c.fillRect(x + 4, y + 1, 1, 1);
      if (!L && !Dn) c.fillRect(x, y + 4, 2, 1), c.fillRect(x, y + 3, 1, 1);
      if (!Rr && !Dn) c.fillRect(x + 3, y + 4, 2, 1), c.fillRect(x + 4, y + 3, 1, 1);
      // 2080 年：低窪的海岸已經被淹沒
      if (!ICE(row) && (!L || !Rr || !U || !Dn) && hash(col * 7 + row * 13) > 0.55) { c.fillStyle = 'rgba(55,195,214,0.35)'; c.fillRect(x, y, 5, 5); }
    }
    return cv;
  }
  const KIND_COL = () => ({ modern: D.KINDS.modern.color, ancient: D.KINDS.ancient.color, prehistoric: D.KINDS.prehistoric.color, alien: D.KINDS.alien.color, legend: D.KINDS.legend.color });
  const WorldMap = scene('world', {
    sel: null,
    spots() {
      const s = S();
      if (!s || !IE.World) return [];
      const meta = IE.Game && IE.Game.meta;
      const out = IE.World.worldList(s, meta).map((d) => {
        const def = D.DEST[d.id];
        const rare = d.sites.some((x) => x.rare && x.rare.ready);
        return { id: d.id, x: def.x - 6, y: def.y - 6, w: 12, h: 12, label: d.name + (d.visited ? '　✓' : ''),
          sub: d.locked ? '🔒 ' + d.lockText : d.kind.name + '・$' + d.cost.toLocaleString() + (d.deal ? '（特價）' : '') + '・' + d.stay + ' 天' + (rare ? '・極稀有素材時機已到' : ''),
          off: d.locked, color: d.kind.color, dest: d, rare };
      });
      out.push({ id: 'home', x: D.HOME.x - 6, y: D.HOME.y - 6, w: 12, h: 12, label: '浮城', sub: s.trip ? '你現在在' + D.DEST[s.trip.dest].name : '你在這裡', color: '#ff4fb4' });
      return out;
    },
    draw(c) {
      const s = S();
      if (!s) return;
      const t = this.t;
      rect(c, 0, 0, 320, 180, '#0b3550');
      for (let i = 0; i < 70; i++) { const x = (hash(i) * 330 + t * 3) % 330 - 5, y = hash(i + 7) * 180; rect(c, x, y, 2, 1, '#14506e'); }
      if (!worldBase) worldBase = buildWorld();
      c.drawImage(worldBase, 0, 0);
      // 經緯線
      c.fillStyle = 'rgba(255,255,255,0.05)';
      for (let x = 0; x < 320; x += 40) c.fillRect(x, 0, 1, 180);
      for (let y = 0; y < 180; y += 30) c.fillRect(0, y, 320, 1);
      // 月球
      const mx = 300, my = 16;
      c.fillStyle = '#c9d1dc'; c.beginPath(); c.arc(mx, my, 11, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#8d99b4'; c.fillRect(mx - 5, my - 3, 3, 3); c.fillRect(mx + 2, my + 3, 4, 3); c.fillRect(mx - 1, my - 7, 2, 2);
      const spots = this.spots();
      const home = spots.find((x) => x.id === 'home');
      // 航線：從浮城到懸停或旅行中的目的地
      const target = s.trip ? spots.find((x) => x.id === s.trip.dest) : spots.find((x) => x.id === this.hover && x.id !== 'home');
      if (target && home) {
        const x0 = home.x + 6, y0 = home.y + 6, x1 = target.x + 6, y1 = target.y + 6;
        const mxp = (x0 + x1) / 2, myp = Math.min(y0, y1) - 20 - Math.abs(x1 - x0) * 0.15;
        for (let k = 0; k <= 40; k++) {
          const u = k / 40, x = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mxp + u * u * x1, y = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * myp + u * u * y1;
          if (k % 3 !== 0) rect(c, x, y, 1, 1, target.off ? '#8d99b4' : '#ffd36b');
        }
        const u = (t * 0.35) % 1, x = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mxp + u * u * x1, y = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * myp + u * u * y1;
        if (!target.off) { rect(c, x - 2, y, 5, 1, '#ffffff'); rect(c, x, y - 1, 1, 3, '#ffffff'); }
      }
      // 目的地
      spots.forEach((sp) => {
        const cx = sp.x + 6, cy = sp.y + 6;
        if (sp.id === 'home') {
          rect(c, cx - 3, cy - 3, 7, 7, '#ff4fb4'); rect(c, cx - 2, cy - 2, 5, 5, '#1b2233'); rect(c, cx - 1, cy - 1, 3, 3, '#ff8fd1');
          return;
        }
        const col = sp.off ? '#5a5f6e' : sp.color;
        const pulse = sp.off ? 0 : (Math.sin(t * 3 + cx) + 1) / 2;
        if (!sp.off) { c.fillStyle = P.rgba(col, 0.25 * pulse); c.beginPath(); c.arc(cx, cy, 4 + pulse * 3, 0, Math.PI * 2); c.fill(); }
        // 菱形標記
        c.fillStyle = '#0a0e17';
        c.beginPath(); c.moveTo(cx, cy - 5); c.lineTo(cx + 4, cy); c.lineTo(cx, cy + 5); c.lineTo(cx - 4, cy); c.closePath(); c.fill();
        c.fillStyle = col;
        c.beginPath(); c.moveTo(cx, cy - 4); c.lineTo(cx + 3, cy); c.lineTo(cx, cy + 4); c.lineTo(cx - 3, cy); c.closePath(); c.fill();
        if (sp.dest.visited) rect(c, cx - 1, cy - 1, 2, 2, '#ffffff');
        if (sp.dest.deal && !sp.off) { rect(c, cx + 3, cy - 9, 7, 5, '#ff4d5e'); rect(c, cx + 4, cy - 8, 1, 1, '#ffffff'); rect(c, cx + 8, cy - 6, 1, 1, '#ffffff'); rect(c, cx + 5, cy - 7, 3, 1, '#ffffff'); }
        if (sp.off) { rect(c, cx - 1, cy - 1, 3, 2, '#1b1b28'); }
        // 極稀有素材的時機到了：金光
        if (sp.rare && Math.random() < 0.3) this.fx.add({ x: cx + (Math.random() - 0.5) * 8, y: cy + (Math.random() - 0.5) * 8, vy: -8, life: 0.8, color: '#ffd36b' });
        if (sp.id === this.hover) { c.strokeStyle = '#ffffff'; c.strokeRect(sp.x + 0.5, sp.y + 0.5, 11, 11); }
      });
      // 旅行中：你在目的地
      if (s.trip) { const d = D.DEST[s.trip.dest]; P.sprite(c, IE.Chars.spr(s), d.x - 4, d.y - 18 + Math.round(Math.sin(t * 3)), {}); }
      this.fx.draw(c);
    },
    drawText() {
      const s = S();
      if (!s) return;
      P.text('世界地圖・2080', 4, 3, { size: 7, color: '#e8edf6', stroke: '#0a0e17' });
      P.text('護照印章 ' + IE.World.stamps(s) + '・去過 ' + Object.keys(s.visited || {}).length + '/' + D.DESTINATIONS.length, 4, 13, { size: 5, color: '#ffd36b', stroke: '#0a0e17' });
      P.text('你有 $' + Math.round(s.cr).toLocaleString(), 316, 168, { size: 7, color: '#8be28f', stroke: '#0a0e17', align: 'right' });
      const K = D.KINDS;
      let x = 4;
      Object.keys(K).forEach((k) => { P.text('◆ ' + K[k].name, x, 170, { size: 5, color: K[k].color, stroke: '#0a0e17' }); x += P.measure('◆ ' + K[k].name, { size: 5 }) + 6; });
      this.drawTip();
    },
  });

  // =====================================================================
  // 旅行：目的地的全景
  // =====================================================================
  const SITE_POS = [[54, 120], [160, 108], [266, 120]];
  const Trip = scene('trip', {
    px: 0, py: 0, cx: 0, cy: 0, parX: 0, parY: 0,
    pointer(type, x, y) {
      if (type === 'move' || type === 'down') {
        this.px = clamp((x - 160) / 160, -1, 1);
        this.py = clamp((y - 90) / 90, -1, 1);
      }
      const sp = this.hit(x, y);
      if (type === 'move' || type === 'down') this.hover = sp ? sp.id : null;
      if (P.view.canvas) P.view.canvas.style.cursor = sp ? 'pointer' : 'default';
      if (type === 'down' && sp && Maps.onPick) { IE.Audio.sfx('click'); Maps.onPick('trip', sp); }
    },
    update(dt) {
      this.t += dt;
      this.fx.update(dt);
      const tx = this.px + Math.sin(this.t * 0.55) * 0.38;
      const ty = this.py + Math.cos(this.t * 0.42) * 0.22;
      this.cx += (tx - this.cx) * Math.min(1, dt * 6);
      this.cy += (ty - this.cy) * Math.min(1, dt * 6);
      this.parX = this.cx;
      this.parY = this.cy;
    },
    spots() {
      const s = S();
      if (!s || !s.trip) return [];
      const d = D.DEST[s.trip.dest];
      const acts = Maps.actions || [];
      const out = d.sites.map((st, i) => {
        const a = acts.find((x) => x.id === 'site:' + st.id);
        const [x, y] = SITE_POS[i];
        const h = IE.World.rareHint(s, st, IE.Game && IE.Game.meta);
        return { id: 'site:' + st.id, x: x - 14, y: y - 22, w: 28, h: 30, label: st.name + (s.trip.visits[st.id] ? '（去過 ' + s.trip.visits[st.id] + ' 次）' : ''),
          sub: !a ? '晚上不能探索' : a.enabled ? st.desc : a.reason, off: !a || !a.enabled, rare: h && h.ready && !h.found, site: st };
      });
      out.push({ id: 'rest', x: 2, y: 140, w: 34, h: 30, label: isNight(s) ? '早點睡' : '在旅館休息', sub: '身體 +18' });
      out.push({ id: 'souvenir', x: 38, y: 142, w: 30, h: 28, label: '紀念品店', sub: '只在當地買得到的靈感物件・不用花時段' });
      const back = acts.find((x) => x.id === 'tripback');
      out.push({ id: 'tripback', x: 284, y: 140, w: 34, h: 30, label: '提早回程', sub: back ? '旅費不會退還' : '晚上沒有航班', off: !back });
      return out;
    },
    draw(c) {
      const s = S();
      if (!s || !s.trip) return;
      const d = D.DEST[s.trip.dest], t = this.t, night = isNight(s);
      const px = this.parX || 0, py = this.parY || 0;
      const g = c.createLinearGradient(0, 0, 0, 130);
      g.addColorStop(0, night ? P.mix(d.sky[0], '#000000', 0.5) : d.sky[0]); g.addColorStop(1, night ? P.mix(d.sky[1], '#000000', 0.6) : d.sky[1]);
      c.fillStyle = g; c.fillRect(0, 0, 320, 180);
      // 遠景星空（視差層 1：微移最慢）
      if (night || d.landmark === 'moon' || d.landmark === 'monolith' || d.kind === 'alien') {
        const sxOff = Math.round(px * 1.2), syOff = Math.round(py * 0.6);
        for (let i = 0; i < 55; i++) rect(c, ((i * 71 + sxOff) % 320 + 320) % 320, ((i * 37 + syOff) % 90 + 90) % 90, 1, 1, Math.sin(t * 2 + i) > 0.4 ? '#ffffff' : '#7d8aa8');
      }
      // 中景地標與目的地專屬動態元素（視差層 2）
      c.save();
      LANDMARK[d.landmark](c, t, d, night, this);
      c.restore();
      // 前景互動層（視差層 3：與背景分開微移）
      const fgX = Math.round(px * 3.2), fgY = Math.round(py * 1.2);
      // 探索點旗幟
      this.spots().forEach((sp) => {
        if (!sp.site) return;
        const cx = sp.x + 14 + Math.round(px * 1.8), cy = sp.y + 22 + Math.round(py * 0.8);
        const visited = s.trip.visits[sp.site.id];
        rect(c, cx - 1, cy - 14, 2, 14, '#2a2f45');
        const col = sp.off ? '#8d99b4' : sp.rare ? '#ffd36b' : '#ff4fb4';
        const wave = Math.round(Math.sin(t * 4 + cx) * 1);
        rect(c, cx + 1, cy - 14 + wave, 10, 6, col); rect(c, cx + 1, cy - 9 + wave, 7, 1, P.mix(col, '#000000', 0.3));
        if (visited) rect(c, cx + 4, cy - 12 + wave, 3, 2, '#ffffff');
        rect(c, cx - 4, cy, 9, 2, 'rgba(0,0,0,0.35)');
        if (sp.rare && Math.random() < 0.4) this.fx.add({ x: cx + (Math.random() - 0.5) * 14, y: cy - 6 + (Math.random() - 0.5) * 10, vy: -10, life: 0.9, color: '#ffd36b' });
        if (sp.id === this.hover) { c.strokeStyle = '#ffffff'; c.strokeRect(sp.x + 0.5, sp.y + 0.5, sp.w - 1, sp.h - 1); }
      });
      // 紀念品攤（帶微晃小燈籠）
      const sx0 = 40 + Math.round(fgX * 0.5);
      rect(c, sx0, 150, 26, 18, '#8a5a3b'); for (let i = 0; i < 4; i++) rect(c, sx0 + i * 7, 144, 6, 6, i % 2 ? '#ff4fb4' : '#ffd36b'); rect(c, sx0 + 4, 154, 6, 6, '#37c3d6'); rect(c, sx0 + 14, 154, 6, 6, '#9be36b');
      rect(c, sx0 + 25 + Math.round(Math.sin(t * 3)), 149, 2, 3, '#ffd36b');
      // 旅館與飛機
      const hx0 = 4 + Math.round(fgX * 0.5);
      rect(c, hx0, 146, 28, 22, '#eef1f7'); rect(c, hx0, 142, 28, 5, '#d6334a'); rect(c, hx0 + 4, 152, 5, 6, night ? '#ffd36b' : '#37c3d6'); rect(c, hx0 + 18, 152, 5, 6, night ? '#ffd36b' : '#37c3d6'); rect(c, hx0 + 10, 160, 6, 8, '#6b4a32');
      const planeY = 152 + Math.round(Math.sin(t * 2));
      const planeX = 288 + Math.round(fgX * 0.5);
      rect(c, planeX, planeY, 24, 4, '#eef1f7'); rect(c, planeX + 8, planeY - 6, 4, 16, '#c9d1dc'); rect(c, planeX + 20, planeY - 4, 3, 5, '#c9d1dc'); rect(c, planeX + 1, planeY + 1, 2, 1, '#37c3d6');
      if (Math.sin(t * 6) > 0) rect(c, planeX + 22, planeY - 4, 1, 1, '#ff4d5e');
      // 你（在水上的地方坐船，帶前景視差）
      const isWaterDest = d.landmark === 'sunken' || d.landmark === 'pyramid' || d.landmark === 'nyc';
      const bob = Math.round(Math.sin(t * 2) * (isWaterDest ? 1.5 : 0.5)) + Math.round(fgY * 0.4);
      const charX = 152 + fgX;
      if (isWaterDest) { rect(c, charX - 12, 158 + bob, 40, 5, '#1b1b28'); rect(c, charX - 16, 155 + bob, 6, 4, '#1b1b28'); rect(c, charX + 26, 155 + bob, 6, 4, '#1b1b28'); rect(c, charX - 10, 158 + bob, 36, 1, '#e8c25a'); }
      P.sprite(c, IE.Chars.spr(s), charX, 134 + bob, { scale: 2, desat: Math.max(0, 1 - s.spark / 2.5) });
      IE.Scenes.City.drawStones(c, s, charX + 13, 152 + bob);
      if (night) { c.fillStyle = 'rgba(5,7,20,0.32)'; c.fillRect(0, 0, 320, 180); }
      this.fx.draw(c);
    },
    drawText() {
      const s = S();
      if (!s || !s.trip) return;
      const d = D.DEST[s.trip.dest];
      P.text(d.name, 4, 3, { size: 8, color: '#ffffff', stroke: '#0a0e17', weight: 900 });
      P.text(D.KINDS[d.kind].name + '・第 ' + s.trip.until + ' 天晚上回程', 4, 15, { size: 6, color: D.KINDS[d.kind].color, stroke: '#0a0e17' });
      this.spots().forEach((sp) => { if (sp.site && sp.id !== this.hover) P.text(sp.site.name, sp.x + 14, sp.y + 32, { size: 6, align: 'center', color: sp.off ? '#8d99b4' : '#ffffff', stroke: '#0a0e17' }); });
      this.drawTip();
    },
  });

  // 地標畫法與動態細節輔助：支援遠景/中景/前景視差微移與 7 大動態元素（海浪、飛鳥、燈籠、極光、風沙、螢火蟲、巡邏無人機）
  const ground = (c, col, y) => { rect(c, -16, y, 352, 180 - y, col); rect(c, -16, y, 352, 1, P.mix(col, '#ffffff', 0.2)); };
  const water = (c, t, y, col) => {
    c.fillStyle = col || 'rgba(14,90,110,0.9)'; c.fillRect(-16, y, 352, 180 - y);
    for (let x = -12; x < 332; x += 3) rect(c, x, y + Math.round(Math.sin(x * 0.1 + t * 2.2)), 2, 1, '#37c3d6');
    // 動態海浪白沫與層疊波紋
    for (let row = 0; row < 3; row++) {
      const wy = y + 6 + row * 12;
      if (wy >= 178) continue;
      for (let i = 0; i < 9; i++) {
        const wx = ((i * 41 + row * 19 + t * (10 + row * 4)) % 340) - 10;
        const crest = Math.sin(t * 3 + i + row);
        rect(c, wx, wy + Math.round(crest), 5 + (i % 3) * 2, 1, crest > 0.3 ? '#bff3fb' : 'rgba(55,195,214,0.55)');
      }
    }
  };
  // 飛鳥：展翅拍動橫越天際
  const drawBirds = (c, t, n, y0, ySpan, col, speed) => {
    const sp = speed || 14;
    for (let i = 0; i < n; i++) {
      const bx = ((i * 67 + t * (sp + (i % 3) * 3)) % 360) - 20;
      const by = y0 + (i * 19) % ySpan + Math.sin(t * 2 + i) * 3;
      const flap = Math.sin(t * 8 + i * 2.1) > 0 ? -1 : 1;
      rect(c, bx, by, 2, 1, col);
      rect(c, bx - 2, by + flap, 2, 1, col);
      rect(c, bx + 2, by + flap, 2, 1, col);
    }
  };
  // 燈籠：隨風搖曳並散發暖光暈
  const drawLanterns = (c, t, list, col, glowCol) => {
    list.forEach(([x, y], i) => {
      const sway = Math.round(Math.sin(t * 2.6 + i * 1.4));
      const lx = x + sway;
      rect(c, x, y - 3, 1, 3, '#5a3a22');
      c.fillStyle = glowCol || 'rgba(255,194,71,0.22)';
      c.beginPath(); c.arc(lx + 1, y + 2, 6 + Math.sin(t * 4 + i) * 1.5, 0, Math.PI * 2); c.fill();
      rect(c, lx, y, 3, 4, col || '#ff6b4a');
      rect(c, lx + 1, y + 1, 1, 2, '#fff2c4');
    });
  };
  // 極光：多層次流動光幕
  const drawAurora = (c, t, yBase, c1, c2) => {
    for (let i = 0; i < 64; i++) {
      const x = i * 5;
      const wave1 = Math.sin(i * 0.22 + t * 1.1) * 9 + Math.cos(i * 0.11 - t * 0.7) * 5;
      const y = yBase + wave1;
      const a1 = 0.14 + 0.1 * Math.sin(t * 2.1 + i * 0.3);
      c.fillStyle = P.rgba(c1 || '#9be36b', a1);
      c.fillRect(x, y, 5, 22);
      c.fillStyle = P.rgba(c2 || '#37c3d6', a1 * 0.75);
      c.fillRect(x, y - 6 + Math.sin(t + i * 0.4) * 3, 5, 12);
    }
  };
  // 風沙：斜掠沙塵線與旋風顆粒
  const drawSandWind = (c, t, yMin, yMax, col) => {
    const span = Math.max(10, yMax - yMin);
    c.fillStyle = col || 'rgba(255,211,107,0.25)';
    for (let i = 0; i < 26; i++) {
      const sx = ((i * 47 + t * (75 + (i % 4) * 18)) % 360) - 20;
      const sy = yMin + ((i * 23 + Math.floor(t * 12)) % span);
      c.fillRect(sx, sy, 8 + (i % 3) * 5, 1);
      if (i % 2 === 0) c.fillRect((sx + 14) % 320, sy + 2, 2, 1);
    }
  };
  // 螢火蟲：閃爍微光漂浮粒子
  const drawFireflies = (c, t, n, yMin, yMax, col) => {
    const span = Math.max(10, yMax - yMin);
    for (let i = 0; i < n; i++) {
      const fx = ((i * 53 + Math.sin(t * 1.3 + i * 2) * 14) % 320 + 320) % 320;
      const fy = yMin + ((i * 29) % span) + Math.cos(t * 1.8 + i) * 6;
      const pulse = (Math.sin(t * 4.5 + i * 1.9) + 1) * 0.5;
      if (pulse < 0.25) continue;
      c.fillStyle = P.rgba(col || '#d4ff6b', pulse * 0.32);
      c.fillRect(fx - 1, fy - 1, 3, 3);
      rect(c, fx, fy, 1, 1, pulse > 0.75 ? '#ffffff' : (col || '#d4ff6b'));
    }
  };
  // 巡邏無人機：帶警示燈與向下掃描光束
  const drawDrone = (c, t, x0, y0, range, beamCol) => {
    const dx = x0 + Math.sin(t * 0.9 + x0 * 0.05) * range;
    const dy = y0 + Math.cos(t * 2.4 + x0) * 2;
    c.fillStyle = beamCol || 'rgba(55,195,214,0.16)';
    c.beginPath(); c.moveTo(dx + 3, dy + 2); c.lineTo(dx - 9, dy + 34); c.lineTo(dx + 15, dy + 34); c.closePath(); c.fill();
    rect(c, dx, dy, 7, 2, '#c9d1dc');
    rect(c, dx - 2, dy - 1, 3, 1, '#5a6478');
    rect(c, dx + 6, dy - 1, 3, 1, '#5a6478');
    rect(c, dx + 3, dy + 1, 1, 1, Math.sin(t * 10 + x0) > 0 ? '#ff4d5e' : '#37c3d6');
  };
  // 視差圖層包裹器：k 為位移倍率（遠景 ~1.0，中景 ~2.2，前景 ~3.8）
  const layer = (c, sc, k, fn) => {
    const ox = Math.round(((sc && sc.parX) || 0) * k);
    const oy = Math.round(((sc && sc.parY) || 0) * k * 0.45);
    c.save(); c.translate(ox, oy); fn(); c.restore();
  };

  const LANDMARK = {
    towers(c, t, d, night, sc) {
      // 新東京：遠景摩天樓 + 中景巡邏無人機與飛車 + 前景屋台紅燈籠與霓虹雨
      layer(c, sc, 1.3, () => {
        for (let i = 0; i < 14; i++) {
          const x = i * 24 - 6, h = 60 + hash(i) * 70, w = 16 + hash(i + 3) * 8;
          rect(c, x, 130 - h, w, h, P.mix('#1a0b2e', '#3a2a60', hash(i + 5)));
          for (let k = 0; k < h / 8; k++) if (hash(i * 9 + k) > 0.45) rect(c, x + 3 + (k % 2) * 6, 134 - h + k * 8, 3, 3, hash(k + i) > 0.6 ? '#ff4fb4' : '#37c3d6');
          if (hash(i + 7) > 0.5) rect(c, x + w - 3, 140 - h, 2, 20, Math.sin(t * 3 + i) > -0.6 ? '#ffd36b' : '#5a4a1f');
        }
      });
      layer(c, sc, 2.4, () => {
        for (let i = 0; i < 3; i++) { const x = (t * (30 + i * 10) + i * 120) % 360 - 20; rect(c, x, 40 + i * 14, 8, 2, '#c9d1dc'); rect(c, x + 1, 42 + i * 14, 2, 1, '#ff4fb4'); }
        drawDrone(c, t, 90, 34, 55, 'rgba(255,79,180,0.18)');
        drawDrone(c, t + 2, 230, 46, 50, 'rgba(55,195,214,0.18)');
        ground(c, d.ground, 130);
      });
      layer(c, sc, 3.6, () => {
        drawLanterns(c, t, [[24, 122], [78, 124], [126, 122], [204, 124], [248, 122], [296, 124]], '#ff4fb4', 'rgba(255,79,180,0.22)');
        c.fillStyle = 'rgba(255,79,180,0.45)'; for (let i = 0; i < 42; i++) c.fillRect((i * 37 + t * 45) % 320, (i * 23 + t * 200) % 180, 1, 4);
      });
    },
    sunken(c, t, d, night, sc) {
      // 沉沒的威尼斯：遠景海鷗與屋頂 + 中景聖馬可鐘樓與圓頂 + 前景海浪、貢多拉與漂浮水燈
      layer(c, sc, 1.2, () => {
        drawBirds(c, t, 5, 18, 35, '#eef1f7', 12);
        for (let i = 0; i < 12; i++) { const x = i * 28 + 4, h = 6 + hash(i) * 10; rect(c, x, 112 - h, 20, h, P.mix('#8a5a3b', '#1b3a5c', 0.5)); rect(c, x, 112 - h, 20, 2, '#a8865a'); }
      });
      layer(c, sc, 2.3, () => {
        rect(c, 140, 40, 14, 90, '#c98d5e'); rect(c, 138, 34, 18, 8, '#8a5a3b'); rect(c, 144, 22, 6, 12, '#5a3a22'); rect(c, 146, 46, 2, 4, '#1b1b28');
        for (let y = 56; y < 110; y += 10) rect(c, 142, y, 10, 1, '#a8865a');
        [[60, 30], [210, 26], [262, 20]].forEach(([x, r]) => {
          c.fillStyle = '#c9d1dc'; c.beginPath(); c.arc(x, 124, r, Math.PI, 0); c.fill();
          c.fillStyle = '#9aa7c7'; c.beginPath(); c.arc(x + r * 0.3, 124, r * 0.7, Math.PI * 1.5, 0); c.fill();
          rect(c, x - 2, 124 - r - 8, 4, 8, '#e8c25a'); rect(c, x - 4, 124 - r - 4, 8, 2, '#e8c25a');
          for (let k = -2; k <= 2; k++) rect(c, x + k * r * 0.35 - 1, 118, 2, 6, '#5a6478');
        });
      });
      layer(c, sc, 3.4, () => {
        water(c, t, 112);
        c.fillStyle = 'rgba(232,194,90,0.25)'; for (let y = 116; y < 170; y += 3) c.fillRect(144 + Math.sin(y + t * 3) * 2, y, 6, 1);
        const gx = (t * 12) % 360 - 20; rect(c, gx, 116, 26, 3, '#1b1b28'); rect(c, gx + 20, 108, 1, 8, '#1b1b28'); rect(c, gx + 4, 113, 3, 3, '#ff6b4a');
        // 潟湖面具節漂浮水燈
        [[42, 126], [96, 134], [188, 124], [244, 132], [290, 122]].forEach(([lx, ly], i) => {
          const wx = lx + Math.sin(t * 1.4 + i) * 4, wy = ly + Math.sin(t * 2.5 + i * 2) * 1.5;
          rect(c, wx, wy, 3, 2, '#ffd36b'); rect(c, wx, wy + 2, 3, 1, 'rgba(255,194,71,0.4)');
        });
      });
    },
    dunes(c, t, d, night, sc) {
      // 沙漠化的開羅：遠景烈日與飛鳥 + 中景沙丘、宣禮塔與駱駝商隊 + 前景漫天風沙與市集燈籠
      layer(c, sc, 1.1, () => {
        c.fillStyle = '#fff2c4'; c.beginPath(); c.arc(250, 40, 16 + Math.sin(t * 2), 0, Math.PI * 2); c.fill();
        drawBirds(c, t, 4, 24, 28, '#5a2a1a', 10);
      });
      layer(c, sc, 2.2, () => {
        for (let i = 0; i < 4; i++) { c.fillStyle = P.mix(d.ground, '#ffffff', i * 0.08); c.beginPath(); c.ellipse(i * 100, 140 - i * 4, 90, 30 - i * 3, 0, Math.PI, 0); c.fill(); }
        rect(c, 200, 70, 8, 60, '#e8c25a'); rect(c, 198, 66, 12, 6, '#c98d5e'); c.fillStyle = '#c98d5e'; c.beginPath(); c.arc(204, 66, 5, Math.PI, 0); c.fill();
        // 沙丘稜線上的駱駝隊
        for (let k = 0; k < 3; k++) {
          const cx = ((t * 7 + k * 18) % 160) + 40, cy = 116 + Math.round(Math.sin(t * 4 + k) * 0.6);
          rect(c, cx, cy, 6, 4, '#5a3a22'); rect(c, cx + 1, cy - 2, 3, 2, '#5a3a22'); rect(c, cx + 5, cy - 3, 2, 4, '#5a3a22');
          rect(c, cx + 1, cy + 4, 1, 3 + (Math.floor(t * 4 + k) % 2), '#5a3a22'); rect(c, cx + 4, cy + 4, 1, 3 + (Math.floor(t * 4 + k + 1) % 2), '#5a3a22');
        }
        ground(c, d.ground, 132);
      });
      layer(c, sc, 3.5, () => {
        drawLanterns(c, t, [[82, 126], [116, 128]], '#ffc247', 'rgba(255,194,71,0.2)');
        drawSandWind(c, t, 68, 165, 'rgba(255,220,130,0.32)');
      });
    },
    ice(c, t, d, night, sc) {
      // 北極種子庫（極光光幕 + 訊號閃燈 + 巡邏無人機）與 西伯利亞凍土（極光微光 + 甲烷冒泡漣漪 + 暴風雪）
      layer(c, sc, 1.1, () => {
        if (d.id === 'svalbard' || night) drawAurora(c, t, 28, '#9be36b', '#37c3d6');
        else drawAurora(c, t, 24, '#37c3d6', '#9b8cff');
        c.fillStyle = '#eef2f8'; c.beginPath(); c.moveTo(-16, 130); c.lineTo(60, 70); c.lineTo(120, 110); c.lineTo(190, 60); c.lineTo(260, 104); c.lineTo(336, 80); c.lineTo(336, 130); c.closePath(); c.fill();
        c.fillStyle = '#c9d6e8'; c.beginPath(); c.moveTo(190, 60); c.lineTo(220, 130); c.lineTo(160, 130); c.closePath(); c.fill();
      });
      layer(c, sc, 2.3, () => {
        if (d.id === 'svalbard') {
          rect(c, 172, 104, 24, 26, '#5a6478'); rect(c, 176, 108, 16, 22, '#2a3142');
          const pulse = 0.5 + 0.5 * Math.sin(t * 4);
          rect(c, 182, 112, 4, 4, pulse > 0.5 ? '#37c3d6' : '#9be36b');
          c.fillStyle = P.rgba('#37c3d6', 0.25 * pulse); c.fillRect(178, 108, 12, 10);
          drawDrone(c, t, 120, 64, 38, 'rgba(155,227,107,0.16)');
        }
        ground(c, d.ground, 130);
        if (d.id === 'siberia') {
          c.fillStyle = '#3a4a5a'; c.beginPath(); c.ellipse(230, 150, 50, 10, 0, 0, Math.PI * 2); c.fill();
          for (let b = 0; b < 3; b++) {
            const br = ((t * 8 + b * 6) % 16);
            c.strokeStyle = P.rgba('#bff3fb', Math.max(0, 0.55 - br / 20));
            c.beginPath(); c.ellipse(210 + b * 20, 150, br, br * 0.3, 0, 0, Math.PI * 2); c.stroke();
          }
          if (Math.random() < 0.35) IE.Maps.Trip.fx.add({ x: 190 + Math.random() * 80, y: 150, vy: -8, life: 1.1, color: '#9aa7c7' });
          rect(c, 80, 140, 24, 3, '#e8dcc4'); rect(c, 100, 134, 3, 8, '#e8dcc4');
          drawBirds(c, t, 3, 36, 20, '#5a6478', 9);
        }
      });
      layer(c, sc, 3.6, () => {
        c.fillStyle = 'rgba(255,255,255,0.75)';
        for (let i = 0; i < 36; i++) c.fillRect((i * 41 + t * 28 + Math.sin(t + i) * 6) % 320, (i * 29 + t * 36) % 180, 1 + (i % 2), 1);
      });
    },
    pyramid(c, t, d, night, sc) {
      // 半淹的金字塔：遠景盤旋隼鳥與風沙 + 中景金字塔與獅身人面像 + 前景海浪拍岸與水底太陽船金光
      layer(c, sc, 1.2, () => {
        drawBirds(c, t, 5, 18, 30, '#3a1a10', 13);
        drawSandWind(c, t, 30, 95, 'rgba(255,211,107,0.18)');
      });
      layer(c, sc, 2.3, () => {
        c.fillStyle = '#e8c25a'; c.beginPath(); c.moveTo(80, 128); c.lineTo(160, 34); c.lineTo(240, 128); c.closePath(); c.fill();
        c.fillStyle = '#c98d5e'; c.beginPath(); c.moveTo(160, 34); c.lineTo(240, 128); c.lineTo(180, 128); c.closePath(); c.fill();
        for (let y = 44; y < 128; y += 8) rect(c, 160 - (y - 34) * 0.85, y, (y - 34) * 1.7, 1, 'rgba(0,0,0,0.12)');
        rect(c, 260, 96, 30, 16, '#c98d5e'); rect(c, 282, 86, 12, 14, '#e8c25a'); rect(c, 286, 90, 2, 2, '#1b1b28');
      });
      layer(c, sc, 3.5, () => {
        water(c, t, 100);
        // 金字塔水面倒影與水底太陽船光斑
        c.fillStyle = 'rgba(255,211,107,0.22)';
        for (let y = 104; y < 156; y += 4) c.fillRect(148 + Math.sin(y * 0.3 + t * 3) * 6, y, 24 - (y - 104) * 0.3, 1);
        drawLanterns(c, t, [[96, 98], [232, 98]], '#ffd36b', 'rgba(255,211,107,0.24)');
      });
    },
    temple(c, t, d, night, sc) {
      // 吳哥窟（升空天燈、佛塔香煙與螢火蟲）與 馬雅遺跡（雨林飛鳥、曆法光環與螢火蟲）
      layer(c, sc, 1.2, () => {
        drawBirds(c, t, 5, 16, 34, d.id === 'angkor' ? '#ffd36b' : '#9be36b', 12);
      });
      layer(c, sc, 2.3, () => {
        if (d.id === 'angkor') {
          [[100, 50], [160, 30], [220, 50]].forEach(([x, top]) => {
            for (let k = 0; k < 6; k++) { const w = 30 - k * 4; rect(c, x - w / 2, 128 - (128 - top) * (k + 1) / 6, w, (128 - top) / 6 + 1, P.mix('#8a7a5a', '#5a4a3a', k / 6)); }
            c.fillStyle = '#8a7a5a'; c.beginPath(); c.arc(x, top, 4, 0, Math.PI * 2); c.fill();
          });
          c.fillStyle = 'rgba(60,40,20,0.8)'; for (let i = 0; i < 8; i++) c.fillRect(80 + i * 22, 90 + (i % 3) * 8, 2, 40);
          drawLanterns(c, t, [[92, 114], [136, 112], [184, 112], [228, 114]], '#ff8a3c', 'rgba(255,194,71,0.26)');
        } else {
          // 馬雅神殿頂端旋轉曆法光環
          c.strokeStyle = 'rgba(155,227,107,' + (0.28 + 0.14 * Math.sin(t * 2.5)) + ')';
          c.beginPath(); c.arc(160, 36, 16 + Math.sin(t * 2) * 2, 0, Math.PI * 2); c.stroke();
          for (let k = 0; k < 7; k++) { const w = 120 - k * 14; rect(c, 160 - w / 2, 128 - (k + 1) * 12, w, 12, P.mix('#9a9a7a', '#6a6a4a', k / 7)); }
          rect(c, 150, 30, 20, 14, '#6a6a4a'); rect(c, 156, 34, 8, 10, '#1b1b28'); rect(c, 156, 50, 8, 78, 'rgba(0,0,0,0.15)');
        }
        for (let i = 0; i < 16; i++) { const x = i * 21, h = 30 + hash(i) * 30; c.fillStyle = i % 2 ? '#1d4a2a' : '#2f7a43'; c.beginPath(); c.arc(x, 130 - h * 0.3, h * 0.4, 0, Math.PI * 2); c.fill(); }
        ground(c, d.ground, 130);
      });
      layer(c, sc, 3.6, () => {
        drawFireflies(c, t, 22, 60, 166, d.id === 'angkor' ? '#ffd36b' : '#9be36b');
      });
    },
    masks(c, t, d, night, sc) {
      // 三星堆：青銅神樹金烏飛鳥盤旋 + 縱目青銅神光掃描 + 祭祀坑螢火金屑
      layer(c, sc, 1.3, () => {
        drawBirds(c, t, 5, 22, 36, '#ffd36b', 15);
      });
      layer(c, sc, 2.3, () => {
        rect(c, 120, 40, 80, 80, '#6b8f4e'); rect(c, 124, 44, 72, 72, '#8aa65a');
        rect(c, 100, 60, 24, 30, '#6b8f4e'); rect(c, 196, 60, 24, 30, '#6b8f4e');
        rect(c, 132, 62, 20, 8, '#e8c25a'); rect(c, 168, 62, 20, 8, '#e8c25a');
        const pop = Math.round(Math.sin(t * 1.8) * 2);
        rect(c, 138, 64, 8, 4 + pop, '#3a4a2a'); rect(c, 174, 64, 8, 4 + pop, '#3a4a2a');
        // 縱目凝視光束
        const beamA = 0.1 + 0.08 * Math.sin(t * 3);
        c.fillStyle = 'rgba(232,194,90,' + beamA + ')';
        c.beginPath(); c.moveTo(142, 66); c.lineTo(116 + Math.sin(t) * 10, 130); c.lineTo(148, 130); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(178, 66); c.lineTo(172, 130); c.lineTo(204 + Math.sin(t) * 10, 130); c.closePath(); c.fill();
        rect(c, 150, 84, 20, 8, '#6b8f4e'); rect(c, 140, 100, 40, 4, '#3a4a2a');
        rect(c, 40, 50, 3, 80, '#8a6a3b');
        [[30, 60], [46, 70], [28, 84], [48, 96]].forEach(([x, y], i) => {
          rect(c, x, y, 14, 2, '#8a6a3b');
          const by = y - 4 + Math.round(Math.sin(t * 4 + i));
          rect(c, x + 10, by, 4, 4, '#ffd36b');
        });
        ground(c, d.ground, 130);
      });
      layer(c, sc, 3.5, () => {
        drawLanterns(c, t, [[78, 124], [242, 124]], '#e8c25a', 'rgba(232,194,90,0.22)');
        drawFireflies(c, t, 18, 55, 160, '#ffd36b');
      });
    },
    cave(c, t, d, night, sc) {
      // 拉斯科洞穴：搖曳原始火把燈火 + 壁畫奔馬光影躍動 + 洞穴螢火微塵與鐘乳石滴水
      rect(c, 0, 0, 320, 180, '#1a1410');
      layer(c, sc, 1.4, () => {
        c.fillStyle = '#3a2a1e'; c.beginPath(); c.ellipse(160, 90, 170, 80, 0, 0, Math.PI * 2); c.fill();
        const shift = Math.round(Math.sin(t * 6) * 1.5);
        [[70, 60, '#c46a1e'], [150, 46, '#1b1b28'], [220, 70, '#c46a1e'], [110, 90, '#8a3b2a']].forEach(([x, y, col], i) => {
          const hx = x + (i % 2 ? shift : -shift);
          rect(c, hx, y, 22, 8, col); rect(c, hx + 18, y - 4, 6, 6, col);
          const leg = Math.round(Math.sin(t * 7 + i) * 1.5);
          rect(c, hx + 2 + leg, y + 8, 2, 6, col); rect(c, hx + 16 - leg, y + 8, 2, 6, col);
          if (i === 1) rect(c, hx + 4, y + 2, 2, 2, '#c46a1e');
        });
        [[190, 40], [200, 48], [184, 50]].forEach(([x, y]) => { rect(c, x, y, 4, 6, '#a8865a'); rect(c, x - 1, y - 2, 1, 3, '#a8865a'); rect(c, x + 4, y - 2, 1, 3, '#a8865a'); });
      });
      layer(c, sc, 2.5, () => {
        const fl = 0.2 + 0.07 * Math.sin(t * 9) + 0.04 * Math.sin(t * 23);
        const g = c.createRadialGradient(160, 140, 4, 160, 140, 125); g.addColorStop(0, 'rgba(255,170,90,' + fl + ')'); g.addColorStop(1, 'rgba(255,170,90,0)');
        c.fillStyle = g; c.fillRect(-16, 0, 352, 180);
        ground(c, d.ground, 134);
        drawLanterns(c, t, [[86, 126], [160, 128], [234, 126]], '#ff8a3c', 'rgba(255,138,60,0.28)');
      });
      layer(c, sc, 3.6, () => {
        drawFireflies(c, t, 16, 45, 155, '#ffb36b');
      });
    },
    monolith(c, t, d, night, sc) {
      // 哥貝克力石陣：遠景星圖極光連線與盤旋禿鷲 + 中景 T 形巨石柱 + 前景遠古風沙與星塵螢光
      layer(c, sc, 1.1, () => {
        drawAurora(c, t, 22, '#9b8cff', '#37c3d6');
        drawBirds(c, t, 4, 24, 26, '#c98d5e', 10);
      });
      layer(c, sc, 2.3, () => {
        [[40, 0.7], [90, 0.85], [150, 1], [210, 0.9], [270, 0.75]].forEach(([x, k]) => {
          rect(c, x, 130 - 70 * k, 14 * k, 70 * k, '#8a7a6a'); rect(c, x - 6 * k, 130 - 70 * k, 26 * k, 10 * k, '#9a8a7a');
          rect(c, x + 3 * k, 130 - 50 * k, 6 * k, 3, '#5a4a3a'); rect(c, x + 2 * k, 130 - 40 * k, 2, 8 * k, '#5a4a3a');
        });
        ground(c, d.ground, 130);
        if (Math.random() < 0.05) IE.Maps.Trip.fx.add({ x: Math.random() * 320, y: 0, vx: 60, vy: 30, life: 0.8, color: '#ffffff', size: 1 });
      });
      layer(c, sc, 3.5, () => {
        drawSandWind(c, t, 85, 160, 'rgba(201,141,94,0.24)');
        drawFireflies(c, t, 14, 40, 135, '#9b8cff');
      });
    },
    dome(c, t, d, night, sc) {
      // 51 區：遠景懸浮飛碟與探照燈 + 中景圓頂機庫与雙巡邏無人機 + 前景內華達沙漠風沙
      layer(c, sc, 1.2, () => {
        const bx = 160 + Math.sin(t * 0.7) * 120;
        c.fillStyle = 'rgba(200,255,250,' + (night ? 0.22 : 0.1) + ')';
        c.beginPath(); c.moveTo(203, 100); c.lineTo(bx - 14, 0); c.lineTo(bx + 14, 0); c.closePath(); c.fill();
        const ux = 240 + Math.sin(t * 1.3) * 36, uy = 28 + Math.cos(t * 2.1) * 4;
        rect(c, ux - 8, uy, 16, 2, '#9aa7c7'); rect(c, ux - 4, uy - 3, 8, 3, '#cfd8ee');
        rect(c, ux - 6, uy + 2, 12, 1, Math.sin(t * 8) > 0 ? '#9be36b' : '#37c3d6');
      });
      layer(c, sc, 2.3, () => {
        rect(c, 40, 90, 100, 40, '#8e9bb0'); c.fillStyle = '#c9d1dc'; c.beginPath(); c.arc(90, 90, 50, Math.PI, 0); c.fill();
        rect(c, 70, 108, 40, 22, '#2a3142'); rect(c, 200, 110, 6, 20, '#5a6478'); rect(c, 196, 100, 14, 10, '#c9d1dc');
        for (let x = -16; x < 336; x += 8) rect(c, x, 118, 1, 12, '#5a6478');
        rect(c, -16, 120, 352, 1, '#5a6478'); rect(c, -16, 125, 352, 1, '#5a6478');
        ground(c, d.ground, 130);
        drawDrone(c, t, 80, 58, 45, 'rgba(155,227,107,0.18)');
        drawDrone(c, t + 1.8, 220, 52, 55, 'rgba(255,77,94,0.18)');
      });
      layer(c, sc, 3.6, () => {
        drawSandWind(c, t, 96, 168, 'rgba(210,175,120,0.26)');
      });
    },
    crater(c, t, d, night, sc) {
      // 南極外星基地：遠景南極光光幕 + 中景冰川、巡邏偵測無人機與搖擺企鵝群 + 前景冰層下外星脈衝與飄雪
      layer(c, sc, 1.1, () => {
        drawAurora(c, t, 24, '#9b8cff', '#37c3d6');
        c.fillStyle = '#eef2f8'; c.beginPath(); c.moveTo(-16, 120); c.lineTo(80, 90); c.lineTo(160, 100); c.lineTo(250, 84); c.lineTo(336, 104); c.lineTo(336, 130); c.lineTo(-16, 130); c.closePath(); c.fill();
      });
      layer(c, sc, 2.3, () => {
        ground(c, d.ground, 128);
        const glow = 0.32 + 0.2 * Math.sin(t * 2.4);
        c.fillStyle = 'rgba(155,140,255,' + glow + ')'; c.fillRect(120, 140, 80, 30);
        rect(c, 130, 146, 60, 18, '#2b3a5c'); for (let i = 0; i < 6; i++) rect(c, 134 + i * 10, 150, 6, 2, Math.sin(t * 4 + i) > 0 ? '#9b8cff' : '#5a4aa8');
        [[40, 120], [60, 124], [82, 122], [250, 118], [270, 122]].forEach(([x, y], i) => {
          const walk = Math.sin(t * 2 + i) * 4;
          const b = Math.round(Math.abs(Math.sin(t * 4 + i)) * -1.5);
          rect(c, x + walk, y + b, 5, 8, '#1b1b28'); rect(c, x + 1 + walk, y + 2 + b, 3, 5, '#ffffff'); rect(c, x + 4 + walk, y + 2 + b, 2, 1, '#ffc247');
        });
        drawDrone(c, t, 160, 62, 60, 'rgba(155,140,255,0.2)');
      });
      layer(c, sc, 3.5, () => {
        drawFireflies(c, t, 14, 110, 170, '#9b8cff');
      });
    },
    moon(c, t, d, night, sc) {
      // 月球背面招聘中心：遠景地球升起 + 中景環形山、2080 圓頂基地與外星巡邏無人機 + 前景月球探測車與低重力月塵
      layer(c, sc, 1.0, () => {
        const ey = 44 + Math.sin(t * 0.6) * 2;
        c.fillStyle = '#1e7f99'; c.beginPath(); c.arc(250, ey, 22, 0, Math.PI * 2); c.fill();
        rect(c, 238, ey - 10, 10, 6, '#37c3d6'); rect(c, 252, ey + 4, 12, 4, '#37c3d6'); rect(c, 243, ey + 10, 4, 3, '#4f8a4a');
        c.fillStyle = 'rgba(0,0,0,0.5)'; c.beginPath(); c.arc(258, ey, 22, -Math.PI / 2, Math.PI / 2); c.fill();
      });
      layer(c, sc, 2.2, () => {
        c.fillStyle = '#8d99b4'; c.beginPath(); c.moveTo(-16, 120); c.quadraticCurveTo(160, 100, 336, 118); c.lineTo(336, 180); c.lineTo(-16, 180); c.closePath(); c.fill();
        [[40, 140, 14], [220, 150, 20], [120, 160, 8]].forEach(([x, y, r]) => { c.fillStyle = '#6b7a99'; c.beginPath(); c.ellipse(x, y, r, r * 0.35, 0, 0, Math.PI * 2); c.fill(); });
        c.fillStyle = '#c9d1dc'; c.beginPath(); c.arc(100, 116, 28, Math.PI, 0); c.fill();
        rect(c, 76, 98, 48, 6, '#9be36b'); P.digits(c, '2080', 88, 99, '#14201a', 1);
        if (Math.sin(t * 3) > 0) rect(c, 98, 86, 4, 4, '#ff4fb4');
        drawDrone(c, t, 175, 58, 55, 'rgba(155,227,107,0.18)');
        drawDrone(c, t + 2.5, 70, 50, 35, 'rgba(255,79,180,0.16)');
      });
      layer(c, sc, 3.4, () => {
        drawFireflies(c, t, 18, 70, 170, '#c9d6ff');
      });
    },
    atlantis(c, t, d, night, sc) {
      // 亞特蘭提斯：遠景深海光柱 + 中景山銅神殿與游魚群 + 前景發光水母、海浪暗流與珊瑚螢光
      layer(c, sc, 1.2, () => {
        for (let i = 0; i < 8; i++) { c.fillStyle = 'rgba(55,195,214,' + (0.06 + 0.03 * Math.sin(t + i)) + ')'; c.beginPath(); c.moveTo(20 + i * 40, 0); c.lineTo(30 + i * 40, 0); c.lineTo(60 + i * 40, 180); c.lineTo(40 + i * 40, 180); c.closePath(); c.fill(); }
      });
      layer(c, sc, 2.3, () => {
        [[60, 70], [100, 50], [220, 50], [260, 70]].forEach(([x, top]) => { rect(c, x, top, 10, 130 - top, '#c9d1dc'); rect(c, x - 3, top, 16, 4, '#e8edf6'); rect(c, x + 2, top + 10, 2, 120 - top - 10, '#9aa7c7'); });
        c.fillStyle = '#e8c25a'; c.beginPath(); c.arc(160, 80, 30, Math.PI, 0); c.fill(); rect(c, 130, 80, 60, 50, '#d6c08a'); rect(c, 150, 100, 20, 30, '#062433');
        // 旋轉山銅光環
        c.strokeStyle = 'rgba(255,211,107,' + (0.35 + 0.15 * Math.sin(t * 3)) + ')';
        c.beginPath(); c.ellipse(160, 46, 18, 5, 0, 0, Math.PI * 2); c.stroke();
        ground(c, d.ground, 130);
        for (let i = 0; i < 8; i++) { const fx = (t * (12 + i * 3) + i * 55) % 360 - 20, fy = 36 + i * 11 + Math.sin(t * 2 + i) * 3; rect(c, fx, fy, 5, 2, ['#ffc247', '#ff4fb4', '#9be36b', '#37c3d6'][i % 4]); rect(c, fx - 2, fy - 1, 2, 4, ['#ffc247', '#ff4fb4', '#9be36b', '#37c3d6'][i % 4]); }
      });
      layer(c, sc, 3.5, () => {
        drawFireflies(c, t, 20, 30, 168, '#37c3d6');
        if (Math.random() < 0.25) IE.Maps.Trip.fx.add({ x: Math.random() * 320, y: 178, vy: -20, life: 3, color: '#bff3fb' });
        c.fillStyle = 'rgba(4,22,31,0.22)'; c.fillRect(-16, 0, 352, 180);
      });
    },
    nyc(c, t, d, night, sc) {
      // 沉沒的紐約：遠景海鳥與帝國大廈 + 中景自由女神火炬、百老匯探照燈與巡邏無人機 + 前景大西洋海浪
      layer(c, sc, 1.2, () => {
        drawBirds(c, t, 5, 16, 32, '#eef1f7', 13);
        for (let i = 0; i < 11; i++) { const x = i * 30 + 2, h = 30 + hash(i + 4) * 70, w = 18 + hash(i) * 8; rect(c, x, 116 - h, w, h, P.mix('#3a4562', '#8e9bb0', hash(i + 9) * 0.5)); for (let k = 0; k < h / 7; k++) for (let q = 0; q < 3; q++) if (hash(i * 31 + k * 3 + q) > 0.5) rect(c, x + 3 + q * 5, 120 - h + k * 7, 2, 3, '#ffd36b'); }
      });
      layer(c, sc, 2.3, () => {
        rect(c, 150, 30, 10, 86, '#5a6478'); rect(c, 152, 18, 6, 12, '#8e9bb0'); rect(c, 154, 8, 2, 10, '#c9d1dc');
        rect(c, 262, 70, 6, 46, '#3d8b5a'); rect(c, 258, 64, 14, 8, '#3d8b5a'); rect(c, 270, 54, 3, 12, '#3d8b5a');
        const torchOn = Math.sin(t * 5) > -0.3;
        rect(c, 268, 50, 7, 5, torchOn ? '#ffd36b' : '#e8c25a');
        c.fillStyle = 'rgba(255,211,107,' + (0.22 + 0.1 * Math.sin(t * 6)) + ')';
        c.beginPath(); c.arc(271, 51, 9, 0, Math.PI * 2); c.fill();
        drawDrone(c, t, 105, 42, 45, 'rgba(255,138,60,0.18)');
      });
      layer(c, sc, 3.5, () => {
        water(c, t, 112);
      });
    },
    geyser(c, t, d, night, sc) {
      // 冰島地熱城：遠景北極光光幕與火山群 + 中景噴發間歇泉、蒸氣團與紅頂小屋燈籠 + 前景黑沙灘海浪
      layer(c, sc, 1.1, () => {
        drawAurora(c, t, 22, '#37c3d6', '#9be36b');
        c.fillStyle = '#3a3a48'; c.beginPath(); c.moveTo(-16, 110); c.lineTo(80, 70); c.lineTo(140, 100); c.lineTo(220, 60); c.lineTo(336, 96); c.lineTo(336, 130); c.lineTo(-16, 130); c.closePath(); c.fill();
      });
      layer(c, sc, 2.3, () => {
        ground(c, d.ground, 128);
        const ph = (t * 0.28) % 1, hgt = ph < 0.38 ? Math.sin(ph / 0.38 * Math.PI) * 92 : 8 + Math.sin(t * 6) * 4;
        if (hgt > 1) { c.fillStyle = 'rgba(232,240,248,0.85)'; c.fillRect(156, 128 - hgt, 10, hgt); c.fillStyle = 'rgba(232,240,248,0.42)'; c.beginPath(); c.arc(161, 128 - hgt, 14, 0, Math.PI * 2); c.fill(); }
        for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(255,255,255,0.16)'; c.beginPath(); c.arc(50 + i * 44 + Math.sin(t + i) * 4, 118 - (t * 8 + i * 9) % 34, 6 + (i % 2) * 2, 0, Math.PI * 2); c.fill(); }
        [[40, 120], [250, 118]].forEach(([x, y]) => { rect(c, x, y - 10, 16, 10, '#d6334a'); rect(c, x - 2, y - 12, 20, 3, '#1b1b28'); rect(c, x + 6, y - 6, 4, 6, '#ffd36b'); });
        drawLanterns(c, t, [[58, 114], [246, 112]], '#ffd36b', 'rgba(255,211,107,0.22)');
      });
      layer(c, sc, 3.5, () => {
        water(c, t, 162, 'rgba(14,70,90,0.85)');
      });
    },
    moai(c, t, d, night, sc) {
      // 復活節島：遠景南太平洋海鳥 + 中景五尊摩艾石像（眼眸微光） + 前景拍岸海浪與流螢
      layer(c, sc, 1.2, () => {
        drawBirds(c, t, 6, 18, 36, '#fff2c4', 14);
      });
      layer(c, sc, 2.3, () => {
        ground(c, d.ground, 118);
        [[50, 1], [100, 1.2], [150, 1.4], [200, 1.2], [250, 1]].forEach(([x, k], idx) => {
          const h = 50 * k;
          rect(c, x, 118 - h, 22 * k, h, '#6b5a4a'); rect(c, x - 2, 118 - h + 4, 26 * k, 8 * k, '#5a4a3a');
          const eyeCol = idx === 2 && Math.sin(t * 2.5) > 0.2 ? '#ff6b4a' : '#2a2018';
          rect(c, x + 3 * k, 118 - h + 14 * k, 5 * k, 3, eyeCol); rect(c, x + 13 * k, 118 - h + 14 * k, 5 * k, 3, eyeCol);
          rect(c, x + 8 * k, 118 - h + 18 * k, 5 * k, 12 * k, '#7a6a5a');
          rect(c, x - 2, 116, 26 * k, 4, '#4a4a3a');
        });
      });
      layer(c, sc, 3.5, () => {
        water(c, t, 128, 'rgba(14,90,110,0.92)');
        drawFireflies(c, t, 12, 70, 125, '#ffd36b');
      });
    },
    machu(c, t, d, night, sc) {
      // 馬丘比丘：遠景安第斯禿鷹展翅與山峰 + 中景印加梯田與拴日石金光 + 前景流動山嵐雲海與螢火蟲
      layer(c, sc, 1.1, () => {
        drawBirds(c, t, 4, 14, 30, '#1b1b28', 11);
        c.fillStyle = '#2f5a3a'; c.beginPath(); c.moveTo(200, 128); c.lineTo(250, 20); c.lineTo(300, 128); c.closePath(); c.fill();
      });
      layer(c, sc, 2.3, () => {
        for (let i = 0; i < 6; i++) rect(c, 30 + i * 4, 128 - i * 10, 180 - i * 8, 10, P.mix('#3d6b2a', '#8a8a6a', (i % 2) * 0.4));
        for (let i = 0; i < 8; i++) { rect(c, 60 + i * 16, 70, 12, 10, '#9a9a8a'); rect(c, 62 + i * 16, 66, 8, 4, '#8a5a3b'); }
        ground(c, d.ground, 128);
      });
      layer(c, sc, 3.5, () => {
        for (let i = 0; i < 10; i++) { c.fillStyle = 'rgba(255,255,255,' + (0.22 + 0.1 * Math.sin(t + i)) + ')'; c.fillRect((i * 37 + t * 10) % 340 - 20, 40 + (i % 4) * 14, 42, 6); }
        drawFireflies(c, t, 14, 68, 148, '#9be36b');
      });
    },
    petra(c, t, d, night, sc) {
      // 佩特拉：遠景玫瑰岩壁與寶庫立面 + 中景蛇道峽谷搖曳燈籠與駱駝 + 前景峽谷風沙
      layer(c, sc, 1.3, () => {
        rect(c, 90, 20, 140, 110, '#c46a4a');
        rect(c, 120, 36, 80, 6, '#e08a6a'); for (let i = 0; i < 6; i++) rect(c, 124 + i * 14, 42, 6, 40, '#e08a6a');
        rect(c, 118, 82, 84, 6, '#e08a6a'); for (let i = 0; i < 4; i++) rect(c, 128 + i * 20, 88, 8, 42, '#e08a6a');
        rect(c, 154, 98, 12, 32, '#3a1a10');
        const glow = 0.16 + 0.1 * Math.sin(t * 2);
        c.fillStyle = 'rgba(255,211,107,' + glow + ')'; c.fillRect(154, 98, 12, 32);
      });
      layer(c, sc, 2.4, () => {
        rect(c, -16, 0, 106, 130, '#a8503a'); rect(c, 230, 0, 106, 130, '#a8503a');
        ground(c, d.ground, 130);
        drawLanterns(c, t, [[96, 122], [116, 124], [142, 124], [178, 124], [204, 124], [224, 122]], '#ffd36b', 'rgba(255,194,71,0.26)');
      });
      layer(c, sc, 3.6, () => {
        drawSandWind(c, t, 60, 165, 'rgba(255,179,138,0.28)');
      });
    },
    wall(c, t, d, night, sc) {
      // 長城：遠景北歸雁群與群山 + 中景蜿蜒長城與烽火台熊熊狼煙 + 前景紅燈籠與塞外風雪
      layer(c, sc, 1.1, () => {
        drawBirds(c, t, 6, 16, 28, '#1b2233', 12);
        c.fillStyle = '#3d5a3a'; c.beginPath(); c.moveTo(-16, 120); c.lineTo(60, 70); c.lineTo(120, 100); c.lineTo(190, 60); c.lineTo(260, 96); c.lineTo(336, 70); c.lineTo(336, 130); c.lineTo(-16, 130); c.closePath(); c.fill();
      });
      layer(c, sc, 2.3, () => {
        c.fillStyle = '#a8a08a';
        for (let x = -12; x < 332; x++) { const y = 106 - Math.sin(x * 0.03) * 20 - (x > 160 ? (x - 160) * 0.12 : 0); c.fillRect(x, y, 1, 8); if (x % 6 < 3) c.fillRect(x, y - 3, 1, 3); }
        [[60, 82], [190, 70], [290, 64]].forEach(([x, y], i) => {
          rect(c, x, y - 18, 16, 20, '#9a907a'); rect(c, x + 6, y - 12, 4, 6, '#3a3a2a');
          const fh = 5 + Math.round(Math.sin(t * 7 + i) * 2);
          rect(c, x + 5, y - 18 - fh, 6, fh, '#ff8a3c'); rect(c, x + 7, y - 17 - fh, 2, fh - 1, '#ffd36b');
          for (let s = 0; s < 3; s++) {
            c.fillStyle = 'rgba(90,95,110,0.35)';
            c.beginPath(); c.arc(x + 8 + Math.sin(t * 2 + s + i) * 4, y - 24 - s * 6 - (t * 6 % 6), 3 + s, 0, Math.PI * 2); c.fill();
          }
        });
        ground(c, d.ground, 128);
        drawLanterns(c, t, [[76, 76], [206, 64]], '#ff4d5e', 'rgba(255,77,94,0.22)');
      });
      layer(c, sc, 3.6, () => {
        c.fillStyle = 'rgba(255,255,255,0.65)';
        for (let i = 0; i < 28; i++) c.fillRect((i * 43 + t * 35) % 320, (i * 29 + t * 28) % 175, 1, 1);
      });
    },
    pompeii(c, t, d, night, sc) {
      // 龐貝：遠景維蘇威火山濃煙與噴發火星 + 中景古羅馬柱廊與搖曳火盆燈籠 + 前景飄落火山灰與驚飛鳥群
      layer(c, sc, 1.1, () => {
        drawBirds(c, t, 4, 20, 32, '#2a2020', 15);
        c.fillStyle = '#5a4a4a'; c.beginPath(); c.moveTo(150, 128); c.lineTo(230, 30); c.lineTo(250, 30); c.lineTo(328, 128); c.closePath(); c.fill();
        rect(c, 234, 29, 12, 3, Math.sin(t * 6) > 0 ? '#ff6b4a' : '#ff8a3c');
        for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(90,90,100,0.52)'; c.beginPath(); c.arc(240 + Math.sin(t * 0.5 + i) * 10, 24 - i * 6 - (t * 4 % 6), 6 + i * 2, 0, Math.PI * 2); c.fill(); }
      });
      layer(c, sc, 2.3, () => {
        for (let i = 0; i < 6; i++) { rect(c, 20 + i * 22, 70, 8, 58, '#d6c8b0'); rect(c, 17 + i * 22, 66, 14, 4, '#e8dcc4'); }
        rect(c, 16, 62, 130, 4, '#e8dcc4');
        ground(c, d.ground, 128);
        drawLanterns(c, t, [[34, 120], [78, 120], [122, 120]], '#ff8a3c', 'rgba(255,138,60,0.22)');
      });
      layer(c, sc, 3.5, () => {
        drawFireflies(c, t, 14, 30, 130, '#ff6b4a');
        c.fillStyle = 'rgba(180,170,170,0.5)'; for (let i = 0; i < 34; i++) c.fillRect((i * 41 + t * 18) % 320, (i * 23 + t * 28) % 180, 1, 1);
      });
    },
    stonehenge(c, t, d, night, sc) {
      // 巨石陣：遠景極光星芒與渡鴉飛鳥 + 中景藍砂岩巨石圈與冬至光束 + 前景德魯伊螢火蟲與薄霧
      layer(c, sc, 1.1, () => {
        drawAurora(c, t, 26, '#9b8cff', '#9be36b');
        drawBirds(c, t, 4, 22, 26, '#1b1b28', 11);
      });
      layer(c, sc, 2.3, () => {
        for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI, x = 160 - Math.cos(a) * 120, h = 36 + (i % 2) * 6, y = 128 - Math.sin(a) * 10; rect(c, x - 6, y - h, 12, h, '#8a8a8a'); rect(c, x - 6, y - h, 12, 2, '#a8a8a8'); if (i % 2 === 0 && i < 8) rect(c, x - 6, y - h - 5, 30, 5, '#9a9a9a'); }
        ground(c, d.ground, 128);
        const sx = 160 + Math.sin(t * 0.4) * 20; c.fillStyle = 'rgba(255,211,107,0.18)'; c.beginPath(); c.moveTo(sx, 50); c.lineTo(sx - 12, 128); c.lineTo(sx + 12, 128); c.closePath(); c.fill();
      });
      layer(c, sc, 3.5, () => {
        drawFireflies(c, t, 20, 72, 155, '#9b8cff');
      });
    },
    nazca(c, t, d, night, sc) {
      // 納斯卡線：遠景小飛機與巡邏觀測無人機 + 中景發光蜂鳥與蜘蛛巨畫 + 前景荒原風沙
      layer(c, sc, 1.2, () => {
        const px = (t * 25) % 380 - 30, py = 26 + Math.sin(t * 2) * 2;
        rect(c, px, py, 10, 2, '#eef1f7'); rect(c, px + 3, py - 3, 2, 8, '#c9d1dc');
        drawBirds(c, t, 3, 18, 22, '#5a3a22', 12);
      });
      layer(c, sc, 2.3, () => {
        ground(c, d.ground, 60);
        const pulse = 0.65 + 0.35 * Math.sin(t * 2.5);
        c.strokeStyle = P.rgba('#fff2c4', pulse); c.lineWidth = 1;
        // 蜂鳥
        c.beginPath(); c.moveTo(120, 90); c.lineTo(160, 100); c.lineTo(200, 86); c.moveTo(160, 100); c.lineTo(150, 130); c.moveTo(160, 100); c.lineTo(175, 125); c.moveTo(160, 100); c.lineTo(166, 70); c.lineTo(168, 62); c.stroke();
        // 蜘蛛
        c.beginPath(); c.arc(60, 140, 10, 0, Math.PI * 2); for (let i = 0; i < 4; i++) { c.moveTo(50, 136 + i * 3); c.lineTo(36, 128 + i * 6); c.moveTo(70, 136 + i * 3); c.lineTo(84, 128 + i * 6); } c.stroke();
        for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-16, 70 + i * 18); c.lineTo(336, 100 + i * 24); c.stroke(); }
        drawDrone(c, t, 220, 44, 48, 'rgba(255,211,107,0.18)');
      });
      layer(c, sc, 3.5, () => {
        drawSandWind(c, t, 64, 168, 'rgba(242,214,176,0.28)');
      });
    },
    fossil(c, t, d, night, sc) {
      // 戈壁恐龍谷：遠景盤旋禿鷲與火焰崖 + 中景恐龍骨架、恐龍蛋與考古營地燈籠 + 前景戈壁狂沙
      layer(c, sc, 1.2, () => {
        drawBirds(c, t, 4, 18, 28, '#3a1a10', 11);
        c.fillStyle = '#a8503a'; c.beginPath(); c.moveTo(-16, 90); c.lineTo(60, 70); c.lineTo(110, 86); c.lineTo(170, 64); c.lineTo(240, 88); c.lineTo(336, 72); c.lineTo(336, 130); c.lineTo(-16, 130); c.closePath(); c.fill();
        for (let y = 90; y < 130; y += 6) rect(c, -16, y, 352, 1, 'rgba(0,0,0,0.12)');
      });
      layer(c, sc, 2.3, () => {
        ground(c, d.ground, 128);
        rect(c, 120, 140, 70, 3, '#e8dcc4'); for (let i = 0; i < 8; i++) rect(c, 126 + i * 7, 132, 2, 8, '#e8dcc4');
        rect(c, 188, 132, 12, 6, '#e8dcc4'); rect(c, 196, 134, 2, 2, '#3b2a1e'); rect(c, 100, 142, 22, 2, '#e8dcc4');
        [[240, 150], [250, 156], [262, 152]].forEach(([x, y]) => { c.fillStyle = '#e8dcc4'; c.beginPath(); c.ellipse(x, y, 4, 5, 0, 0, Math.PI * 2); c.fill(); });
        drawLanterns(c, t, [[78, 126], [220, 126]], '#ff8a3c', 'rgba(255,138,60,0.22)');
      });
      layer(c, sc, 3.6, () => {
        drawSandWind(c, t, 74, 168, 'rgba(255,194,107,0.3)');
      });
    },
    tunguska(c, t, d, night, sc) {
      // 通古斯：遠景異變極光 + 中景放射狀倒木、懸浮隕石碎片與巡邏無人機 + 前景泰加林螢火蟲
      layer(c, sc, 1.1, () => {
        drawAurora(c, t, 22, '#ff8a3c', '#9be36b');
        for (let i = 0; i < 20; i++) rect(c, i * 17, 110 - 20 - hash(i) * 30, 2, 20 + hash(i) * 30, '#2a3a2a');
      });
      layer(c, sc, 2.3, () => {
        ground(c, d.ground, 110);
        for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2, r = 30 + (i % 5) * 18, x = 160 + Math.cos(a) * r * 1.6, y = 140 + Math.sin(a) * r * 0.4; c.save(); c.translate(x, y); c.rotate(a); rect(c, 0, -1, 14, 2, '#5a4a3a'); c.restore(); }
        const g = c.createRadialGradient(160, 140, 1, 160, 140, 32); g.addColorStop(0, 'rgba(255,138,60,' + (0.28 + 0.12 * Math.sin(t * 3)) + ')'); g.addColorStop(1, 'rgba(255,138,60,0)');
        c.fillStyle = g; c.fillRect(120, 108, 80, 62);
        // 懸浮的 1908 隕石核心
        const my = 128 + Math.round(Math.sin(t * 3) * 3);
        rect(c, 157, my, 6, 5, '#ff8a3c'); rect(c, 159, my + 1, 2, 2, '#fff2c4');
        drawDrone(c, t, 110, 56, 45, 'rgba(255,138,60,0.18)');
      });
      layer(c, sc, 3.5, () => {
        drawFireflies(c, t, 18, 70, 165, '#ff8a3c');
      });
    },
    dish(c, t, d, night, sc) {
      // 阿雷西博天線：遠景向宇宙發射的電波環與巡邏無人機 + 中景巨型反射盤與吊臂 + 前景雨林樹蛙螢火蟲
      layer(c, sc, 1.2, () => {
        c.fillStyle = '#2f5a2a'; c.beginPath(); c.moveTo(-16, 60); c.lineTo(336, 60); c.lineTo(336, 130); c.lineTo(-16, 130); c.closePath(); c.fill();
        // 向太空擴散的無線電波紋
        for (let w = 0; w < 3; w++) {
          const prog = ((t * 0.45 + w * 0.33) % 1);
          c.strokeStyle = P.rgba('#9be36b', (1 - prog) * 0.45);
          c.beginPath(); c.arc(160, 56 - prog * 42, 10 + prog * 36, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
        }
        drawDrone(c, t, 225, 36, 40, 'rgba(155,227,107,0.18)');
      });
      layer(c, sc, 2.3, () => {
        c.fillStyle = '#c9d1dc'; c.beginPath(); c.ellipse(160, 110, 130, 26, 0, 0, Math.PI); c.fill();
        c.fillStyle = '#8e9bb0'; c.beginPath(); c.ellipse(160, 110, 120, 20, 0, 0, Math.PI); c.fill();
        [[50, 40], [270, 40], [160, 24]].forEach(([x, y]) => { rect(c, x, y, 3, 90 - y + 20, '#5a6478'); c.strokeStyle = '#5a6478'; c.beginPath(); c.moveTo(x + 1, y); c.lineTo(160, 62); c.stroke(); });
        rect(c, 140, 56, 40, 10, '#4a5568'); if (Math.sin(t * 4) > 0) rect(c, 158, 66, 4, 3, '#ff4d5e');
        ground(c, d.ground, 132);
      });
      layer(c, sc, 3.6, () => {
        drawFireflies(c, t, 22, 66, 168, '#9be36b');
      });
    },
    shangrila(c, t, d, night, sc) {
      // 香格里拉：遠景雪山仙鶴與極光瑞氣 + 中景雪山寺院與隨風飄揚五色經幡 + 前景酥油燈籠與飄雪
      layer(c, sc, 1.1, () => {
        drawAurora(c, t, 20, '#ffd36b', '#37c3d6');
        drawBirds(c, t, 5, 16, 28, '#ffffff', 11);
        c.fillStyle = '#e8edf6'; c.beginPath(); c.moveTo(-16, 100); c.lineTo(70, 30); c.lineTo(130, 90); c.lineTo(200, 20); c.lineTo(270, 80); c.lineTo(336, 50); c.lineTo(336, 130); c.lineTo(-16, 130); c.closePath(); c.fill();
        c.fillStyle = '#8db7d6'; c.beginPath(); c.moveTo(200, 20); c.lineTo(230, 130); c.lineTo(170, 130); c.closePath(); c.fill();
      });
      layer(c, sc, 2.3, () => {
        rect(c, 120, 92, 80, 30, '#eef1f7'); rect(c, 116, 86, 88, 8, '#d6334a'); rect(c, 140, 76, 40, 10, '#e8c25a'); rect(c, 152, 100, 16, 22, '#8a3b2a');
        for (let i = 0; i < 12; i++) rect(c, 60 + i * 18, 78 + Math.sin(t * 3.2 + i) * 2.5, 6, 5, ['#d6334a', '#ffd36b', '#37c3d6', '#9be36b', '#eef1f7'][i % 5]);
        ground(c, d.ground, 128);
        drawLanterns(c, t, [[108, 118], [136, 120], [184, 120], [212, 118]], '#ffd36b', 'rgba(255,211,107,0.28)');
      });
      layer(c, sc, 3.5, () => {
        drawFireflies(c, t, 16, 65, 158, '#ffd36b');
      });
    },
    eldorado(c, t, d, night, sc) {
      // 黃金國：遠景雨林飛鳥 + 中景瓜達維塔湖波浪、黃金木筏與祭典燈籠 + 前景漫天黃金螢火蟲
      layer(c, sc, 1.2, () => {
        drawBirds(c, t, 5, 16, 30, '#ffd36b', 13);
        for (let i = 0; i < 16; i++) { const x = i * 21, h = 30 + hash(i) * 30; c.fillStyle = i % 2 ? '#1d4a2a' : '#2f7a43'; c.beginPath(); c.arc(x, 100 - h * 0.3, h * 0.5, 0, Math.PI * 2); c.fill(); }
      });
      layer(c, sc, 2.3, () => {
        c.fillStyle = '#1e5a6a'; c.beginPath(); c.ellipse(160, 140, 130, 22, 0, 0, Math.PI * 2); c.fill();
        for (let x = 40; x < 290; x += 3) rect(c, x, 140 + Math.round(Math.sin(x * 0.12 + t * 2.5)), 2, 1, x % 6 === 0 ? '#ffd36b' : '#37c3d6');
        const rx = 150 + Math.sin(t * 0.5) * 32;
        rect(c, rx - 6, 138, 38, 1, 'rgba(255,211,107,0.45)');
        rect(c, rx, 134, 26, 4, '#e8c25a'); rect(c, rx + 10, 124, 6, 10, '#ffd36b');
        if (Math.random() < 0.35) IE.Maps.Trip.fx.add({ x: rx + 13 + (Math.random() - 0.5) * 12, y: 126, vy: -10, life: 0.9, color: '#ffd36b' });
        drawLanterns(c, t, [[52, 126], [268, 126]], '#ffd36b', 'rgba(255,211,107,0.26)');
        ground(c, d.ground, 162);
      });
      layer(c, sc, 3.6, () => {
        drawFireflies(c, t, 24, 58, 162, '#ffd36b');
      });
    },
    library(c, t, d, night, sc) {
      // 亞歷山大圖書館：遠景高聳書架與時間裂縫微光 + 中景搖曳吊掛油燈籠與飄浮書頁 + 前景金色書塵螢光
      rect(c, 0, 0, 320, 130, '#3a2a10');
      layer(c, sc, 1.3, () => {
        for (let i = 0; i < 6; i++) { rect(c, 10 + i * 52, 20, 44, 106, '#5a3a22'); for (let r = 0; r < 8; r++) { rect(c, 12 + i * 52, 30 + r * 12, 40, 1, '#2a1a0b'); for (let k = 0; k < 10; k++) rect(c, 13 + i * 52 + k * 4, 31 + r * 12, 3, 9, P.mix('#e8c25a', '#c98d5e', hash(i * 80 + r * 10 + k))); } }
      });
      layer(c, sc, 2.4, () => {
        for (let i = 0; i < 4; i++) {
          const sway = Math.round(Math.sin(t * 2.2 + i) * 2);
          const x = 40 + i * 80 + sway, fl = 0.25 + 0.08 * Math.sin(t * 7 + i);
          rect(c, 40 + i * 80, 20, 1, 36, '#2a1a0b');
          const g = c.createRadialGradient(x, 60, 1, x, 60, 30); g.addColorStop(0, 'rgba(255,211,107,' + fl + ')'); g.addColorStop(1, 'rgba(255,211,107,0)');
          c.fillStyle = g; c.fillRect(x - 30, 30, 60, 60); rect(c, x - 2, 56, 5, 4, '#ffd36b');
        }
        // 飄浮的古老書頁
        for (let p = 0; p < 5; p++) {
          const px = 45 + p * 56 + Math.sin(t * 1.5 + p) * 8;
          const py = 46 + ((t * 8 + p * 19) % 68);
          rect(c, px, py, 4, 3, '#fff2c4');
        }
        ground(c, d.ground, 130);
        rect(c, 120, 136, 80, 6, '#8a5a3b'); rect(c, 140, 132, 18, 4, '#eef1f7'); rect(c, 164, 132, 18, 4, '#eef1f7');
      });
      layer(c, sc, 3.6, () => {
        drawFireflies(c, t, 20, 32, 155, '#ffd36b');
      });
    },
  };

  const Maps = IE.Maps = { Room, CityMap, WorldMap, Trip, onPick: null, actions: null, icon };
})(window.IE = window.IE || {});
