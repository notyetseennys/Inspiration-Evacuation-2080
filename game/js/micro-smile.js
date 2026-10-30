// 企業情緒陪伴：在 VIP 包廂同時應付三件事（參考《Dave the Diver》壽司店的多工節奏）
//   - 「笑」軌道：客人講笑話，準時笑；長條音符要一直笑到結束（最傷火花）
//   - 「點頭」軌道：客人發表高見要點頭；客人講傷心事也要點頭，笑出來會被罰款
//   - 倒酒：客人的杯空了就按住倒酒，在目標範圍內放手；倒滿會瀉
//   - 偏見言論（紅色）：點頭附和可以多拿小費，但靈魂會變重；不附和，客人會有點不高興
(function (IE) {
  'use strict';
  const P = IE.Pixel, A = IE.Audio, C = IE.Micro.C;
  const R = () => IE.Rules, D = () => IE.DATA, G = () => IE.Game;
  const HIT_X = 74, SPAWN_X = 330, TRAVEL = 1.9;
  const LANE_Y = { laugh: 140, nod: 162 };
  const WIN_MISS = 0.2;
  const GLASS = { x: 200, y: 82, w: 18, h: 36 };

  function Smile(opts, onDone) {
    const s = G().state;
    const cfg = R().smileConfig(s);
    // 節奏感越好，判定範圍越寬
    const WIN_P = 0.075 + cfg.winBonus, WIN_G = 0.15 + cfg.winBonus;
    const fx = P.particles();
    const notes = [];
    // 預先排好音符：後半段節奏加快
    let tt = 1.2;
    const beat = 60 / cfg.bpm;
    while (tt < cfg.duration - 0.8) {
      const b = tt > cfg.duration / 2 ? beat * 0.85 : beat;
      if (Math.random() < 0.8) {
        const r = Math.random();
        if (r < cfg.trapRate) notes.push({ t: tt, lane: 'nod', kind: 'sad' });
        else if (r < cfg.trapRate + cfg.nodRate) notes.push({ t: tt, lane: 'nod', kind: 'tap' });
        else if (r < cfg.trapRate + cfg.nodRate + cfg.holdRate && tt + b * 2 < cfg.duration - 0.8) {
          notes.push({ t: tt, lane: 'laugh', kind: 'hold', dur: b * 2 });
          tt += b * 3; continue;
        } else notes.push({ t: tt, lane: 'laugh', kind: 'tap' });
      }
      tt += b;
    }
    // 每場插入三句偏見言論，取代附近的音符
    const biasAt = [];
    for (let i = 0; i < cfg.biasCount; i++) biasAt.push((i + 0.6) / (cfg.biasCount + 0.2));
    biasAt.forEach((f) => {
      const t0 = 1.2 + f * (cfg.duration - 2.4);
      for (let i = notes.length - 1; i >= 0; i--) if (Math.abs(notes[i].t - t0) < 0.45 || (notes[i].dur && t0 > notes[i].t && t0 < notes[i].t + notes[i].dur + 0.3)) notes.splice(i, 1);
      notes.push({ t: t0, lane: 'nod', kind: 'bias', line: D().BIAS_LINES[Math.floor(Math.random() * D().BIAS_LINES.length)] });
    });
    notes.sort((a, b) => a.t - b.t);
    const st = {
      t: -1.4, phase: 'intro', banner: null, perfect: 0, good: 0, miss: 0, trapHits: 0, sat: 0.6,
      cr: 0, drain: 0, judge: null, bubble: null, nextBubble: 1.5, endT: 0, flash: 0, nod: 0, angry: 0, endorsed: 0,
      holding: null, laughDown: false, pour: null, nextPour: 6, pours: 0, spills: 0, joy: 0,
    };
    const ads = C.adSystem(cfg.ads, { x: 96, y: 26, w: 70, h: 40 });
    C.banner(st, '上班', '#ff4fb4', '笑 →　點頭 ←　按住空白鍵倒酒');
    A.setMode('work', cfg.bpm);

    const xOf = (time) => HIT_X + (time - st.t) / TRAVEL * (SPAWN_X - HIT_X);
    function judge(text, color) { st.judge = { text, color, t: 0 }; }
    function nearest(fn, win) {
      let best = null, bd = win;
      notes.forEach((n) => { if (!n.done && !n.holding && fn(n)) { const d = Math.abs(n.t - st.t); if (d <= bd) { bd = d; best = n; } } });
      return best;
    }
    function reward(lane, kind) {
      const pay = R().smileItemPay(s, kind, lane), dr = R().smileItemDrain(s, kind, lane);
      st.cr += pay; st.drain += dr;
      if (kind === 'perfect') {
        st.perfect++; st.sat = Math.min(1, st.sat + 0.03); A.sfx('perfect');
        if (lane !== 'pour') judge(lane === 'nod' ? '完美點頭' : lane === 'hold' ? '笑到最後' : '完美', '#ff4fb4');
        if (lane === 'laugh' || lane === 'hold') {
          st.joy += lane === 'hold' ? 2 : 1;
          const n = lane === 'hold' ? 8 : 4;
          for (let i = 0; i < n; i++) fx.add({ x: 46 + Math.random() * 20, y: 70, vx: (Math.random() - 0.5) * 30, vy: -30 - Math.random() * 30, life: 1.2, color: '#ffc247', g: -5 });
        }
      } else {
        st.good++; st.sat = Math.min(1, st.sat + 0.01); A.sfx('good');
        if (lane !== 'pour') judge('還可以', '#37c3d6');
      }
      fx.add({ x: HIT_X, y: LANE_Y[lane === 'hold' ? 'laugh' : lane === 'pour' ? 'laugh' : lane], tx: 22, ty: 4, home: 6, life: 0.6, color: '#8be28f', size: 2 });
    }
    // 附和偏見：多拿小費，靈魂掉下一塊石頭
    function endorse(n, text) {
      n.done = true; st.endorsed++;
      st.cr += R().smileItemPay(s, 'perfect', 'bias');
      st.sat = Math.min(1, st.sat + 0.04);
      judge(text, '#ff8a8a'); A.sfx('coin');
      for (let i = 0; i < 3; i++) fx.add({ x: 44 + Math.random() * 12, y: 86, vx: (Math.random() - 0.5) * 10, vy: 10, g: 160, life: 0.9, color: '#5c5448', size: 2 });
      fx.add({ x: HIT_X, y: LANE_Y.nod, tx: 22, ty: 4, home: 6, life: 0.6, color: '#8be28f', size: 2 });
    }
    function missNote(n) {
      if (n.kind === 'bias') { n.done = true; st.sat = Math.max(0, st.sat - 0.03); judge('你沒有附和', '#9fdcff'); return; }
      n.done = true; st.miss++;
      if (n.kind === 'sad') { st.sat = Math.max(0, st.sat - 0.05); judge('冷漠', '#8d99b4'); }
      else { st.sat = Math.max(0, st.sat - 0.04); judge('冷場', '#8d99b4'); }
    }
    function emptyPress(text) { st.sat = Math.max(0, st.sat - 0.02); judge(text, '#8d99b4'); }

    // ---------- 輸入 ----------
    function laughDown() {
      if (st.phase !== 'play' || st.laughDown) return;
      st.laughDown = true;
      const bias = nearest((n) => n.kind === 'bias', WIN_G);
      if (bias) { endorse(bias, '你跟著笑了'); return; }
      const sad = nearest((n) => n.kind === 'sad', WIN_MISS);
      const target = nearest((n) => n.lane === 'laugh', WIN_MISS);
      if (sad && (!target || Math.abs(sad.t - st.t) <= Math.abs(target.t - st.t))) {
        sad.done = true; st.trapHits++; st.sat = Math.max(0, st.sat - 0.1);
        st.flash = 0.3; st.angry = 1.2; P.view.shake = 3;
        judge('你笑什麼？', '#5fc8ff'); A.sfx('wrong');
        st.bubble = { text: '你笑什麼？', t: 0, angry: true };
        return;
      }
      if (!target) { emptyPress('乾笑'); return; }
      const d = Math.abs(target.t - st.t);
      const kind = d <= WIN_P ? 'perfect' : d <= WIN_G ? 'good' : null;
      if (!kind) { missNote(target); return; }
      if (target.kind === 'hold') {
        target.holding = true; target.startKind = kind; st.holding = target;
        judge('繼續笑……', '#ffc247'); A.sfx('good');
      } else {
        target.done = true; reward('laugh', kind);
      }
    }
    function laughUp() {
      st.laughDown = false;
      const h = st.holding;
      if (!h) return;
      st.holding = null; h.holding = false;
      if (st.t >= h.t + h.dur - 0.15) { h.done = true; reward('hold', h.startKind); }
      else { h.done = true; st.miss++; st.sat = Math.max(0, st.sat - 0.04); judge('笑不下去了', '#8d99b4'); }
    }
    function nodDown() {
      if (st.phase !== 'play') return;
      st.nod = 0.25;
      const target = nearest((n) => n.lane === 'nod', WIN_MISS);
      if (!target) { emptyPress('亂點頭'); return; }
      const d = Math.abs(target.t - st.t);
      const kind = d <= WIN_P ? 'perfect' : d <= WIN_G ? 'good' : null;
      if (!kind) { missNote(target); return; }
      if (target.kind === 'bias') { endorse(target, '你點了頭'); return; }
      target.done = true;
      reward('nod', kind);
      if (target.kind === 'sad') judge('同情地點頭', '#9fdcff');
    }
    function pourDown() {
      if (st.phase !== 'play' || !st.pour) return;
      st.pour.holding = true;
    }
    function pourUp() {
      const p = st.pour;
      if (!p || !p.holding) return;
      p.holding = false;
      if (p.level < 0.08) return; // 還未開始倒
      if (p.level >= p.lo && p.level <= p.hi) {
        st.pours++; reward('pour', 'perfect'); st.sat = Math.min(1, st.sat + 0.04);
        judge('倒得剛剛好', '#ffc247');
      } else if (p.level >= 0.45) {
        reward('pour', 'good'); judge('少了一點', '#37c3d6');
      } else {
        st.sat = Math.max(0, st.sat - 0.03); judge('只倒了一點點', '#8d99b4');
      }
      st.pour = null; st.nextPour = st.t + cfg.pourEvery;
    }
    function finish() {
      if (st.phase === 'end') return;
      st.phase = 'end'; st.endT = 0;
      if (st.holding) laughUp();
      C.banner(st, '下班', '#ffc247');
    }
    const endTick = C.ender(st, () => ({ cr: st.cr, drain: st.drain, perfect: st.perfect, good: st.good, miss: st.miss,
      trapHits: st.trapHits, satisfaction: st.sat, pours: st.pours, spills: st.spills, endorsed: st.endorsed }), onDone);

    const KEY_LAUGH = ['ArrowRight', 'j', 'J', 'd', 'D'], KEY_NOD = ['ArrowLeft', 'f', 'F', 'a', 'A'];
    return {
      kind: 'smile',
      controls: [{ id: 'nod', label: '點頭', key: '←' }, { id: 'laugh', label: '笑', key: '→' }, { id: 'pour', label: '倒酒', key: '按住空白鍵' }],
      hint: '黃色音符到圈中時按「笑」，長條要一直按住；藍綠色按「點頭」；客人講傷心事（藍色）也要點頭，笑出來會被罰款。紅色是偏見言論：附和可以多拿小費，但靈魂會變重，不附和客人會有點不高興。杯空了就按住「倒酒」，在綠色範圍放手。',
      control(id, down) {
        if (id === 'laugh') { if (down) laughDown(); else laughUp(); }
        else if (id === 'nod') { if (down) nodDown(); }
        else if (id === 'pour') { if (down) pourDown(); else pourUp(); }
      },
      key(k, down) {
        if (KEY_LAUGH.includes(k)) { if (down) laughDown(); else laughUp(); }
        else if (KEY_NOD.includes(k)) { if (down) nodDown(); }
        else if (k === ' ') { if (down) pourDown(); else pourUp(); }
      },
      pointer(type, x, y) {
        if (type === 'down') {
          if (ads.hit(x, y)) return;
          if (x >= GLASS.x - 14 && x <= GLASS.x + GLASS.w + 14 && y >= GLASS.y - 10 && y <= GLASS.y + GLASS.h + 10) { this.ptr = 'pour'; pourDown(); }
          else if (y >= 128 && y < 151) { this.ptr = 'laugh'; laughDown(); }
          else if (y >= 151) { this.ptr = 'nod'; nodDown(); }
        } else if (type === 'up') {
          if (this.ptr === 'pour') pourUp();
          if (this.ptr === 'laugh') laughUp();
          this.ptr = null;
        }
      },
      update(dt) {
        st.t += dt;
        if (st.banner) st.banner.t += dt;
        if (st.judge) st.judge.t += dt;
        st.flash = Math.max(0, st.flash - dt);
        st.nod = Math.max(0, st.nod - dt);
        st.angry = Math.max(0, st.angry - dt);
        fx.update(dt);
        if (st.phase === 'intro' && st.t >= 0) st.phase = 'play';
        if (st.phase === 'play') {
          ads.update(dt);
          notes.forEach((n) => {
            if (!n.done && !n.holding && st.t - n.t > WIN_MISS) missNote(n);
          });
          // 長笑：按住到結束自動完成；按住期間持續噴出火花
          const h = st.holding;
          if (h) {
            if (Math.random() < dt * 14) fx.add({ x: 50 + Math.random() * 16, y: 66, vx: (Math.random() - 0.5) * 20, vy: -40, life: 0.9, color: '#ffc247', g: -5 });
            if (st.t >= h.t + h.dur) { st.holding = null; h.holding = false; h.done = true; reward('hold', h.startKind); }
          }
          // 倒酒
          if (!st.pour && st.t >= st.nextPour) {
            const lo = 0.68 + Math.random() * 0.1;
            st.pour = { level: 0, t: 0, holding: false, lo, hi: lo + 0.15 };
            A.sfx('ad');
          }
          const p = st.pour;
          if (p) {
            p.t += dt;
            if (p.holding) {
              p.level += dt * 0.55;
              if (Math.random() < dt * 20) fx.add({ x: GLASS.x + GLASS.w / 2, y: GLASS.y - 6, vy: 40, life: 0.25, color: '#ffb347' });
              if (p.level >= 1) {
                st.spills++; st.sat = Math.max(0, st.sat - 0.08); st.flash = 0.2;
                judge('倒瀉了！', '#ff4d5e'); A.sfx('splash');
                fx.burst(GLASS.x + GLASS.w / 2, GLASS.y, 14, { color: '#ffb347', life: 0.7, speed: 40, g: 80 });
                st.pour = null; st.nextPour = st.t + cfg.pourEvery;
              }
            } else if (p.t > 5 && p.level < 0.08) {
              st.sat = Math.max(0, st.sat - 0.08);
              judge('客人只好自己倒酒', '#ff8a9a'); A.sfx('wrong');
              st.pour = null; st.nextPour = st.t + cfg.pourEvery;
            }
          }
          const soon = notes.find((n) => !n.done && n.kind === 'bias' && n.t - st.t < 2.6 && n.t > st.t);
          if (soon && !(st.bubble && st.bubble.bias)) st.nextBubble = 0;
          st.nextBubble -= dt;
          if (st.nextBubble <= 0) {
            st.nextBubble = 3.5 + Math.random() * 2;
            const bias = notes.find((n) => !n.done && n.kind === 'bias' && n.t - st.t < 2.6 && n.t > st.t);
            const sad = notes.find((n) => !n.done && n.kind === 'sad' && n.t - st.t < 2.4 && n.t > st.t);
            const pool = sad ? D().SAD_LINES : D().SMILE_LINES;
            st.bubble = bias ? { text: bias.line, t: 0, bias: true }
              : { text: pool[Math.floor(Math.random() * pool.length)], t: 0, sad: !!sad };
          }
          if (st.bubble) { st.bubble.t += dt; if (st.bubble.t > 3) st.bubble = null; }
          if (st.t >= cfg.duration) finish();
          A.setSpark(Math.max(0, s.spark - st.drain));
        }
        endTick(dt);
      },
      draw(c) {
        const cur = Math.max(0, s.spark - st.drain);
        // 包廂
        c.fillStyle = '#1a0b24'; c.fillRect(0, 0, 320, 180);
        c.fillStyle = '#0d0716'; c.fillRect(112, 18, 84, 44);
        for (let i = 0; i < 12; i++) { c.fillStyle = i % 3 ? '#ffd36b' : '#ff4fb4'; c.fillRect(116 + (i * 13) % 76, 24 + (i * 7) % 32, 2, 2); }
        c.fillStyle = '#2d1240'; c.fillRect(0, 100, 320, 26);
        c.fillStyle = '#4a1f6b'; c.fillRect(150, 112, 120, 6);
        for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ff4fb4' : '#a77bff'; c.fillRect(i * 44 + 6, 15, 30, 1); }
        C.topBar(c, 1 - Math.max(0, st.t) / cfg.duration, '#ff4fb4');
        // 頭像（兩倍大）
        c.save(); c.translate(18, 22); c.scale(2, 2);
        C.face(c, 0, 0, { skin: P.desat('#f2c6a0', Math.max(0, 1 - cur / 2.5) * 0.7), hair: '#2b2140', shirt: '#37c3d6',
          smile: 6 + Math.min(14, st.joy / 2), dead: 1 - cur / 2.5, nod: st.nod > 0 ? 3 : 0 });
        c.restore();
        c.save(); c.translate(240, 18); c.scale(2, 2);
        C.face(c, 0, 0, { skin: st.angry > 0 ? '#f08a7c' : '#f0b98c', hair: '#c9a227', shirt: '#4a1f6b', smile: st.sat > 0.6 ? 12 : 8,
          frown: st.sat < 0.4 || st.angry > 0, angry: st.angry > 0, shades: true, fat: true, chain: true });
        c.restore();
        c.fillStyle = '#7a3b1e'; c.fillRect(288, 58, 14, 3); c.fillStyle = '#ff8a3c'; c.fillRect(302, 58, 3, 3);
        // 滿意度
        c.fillStyle = '#26334d'; c.fillRect(240, 92, 56, 4);
        c.fillStyle = st.sat > 0.6 ? '#8be28f' : st.sat > 0.4 ? '#ffc247' : '#ff4d5e'; c.fillRect(240, 92, Math.round(56 * st.sat), 4);
        // 酒杯
        const p = st.pour;
        c.fillStyle = 'rgba(200,230,255,0.25)'; c.fillRect(GLASS.x, GLASS.y, GLASS.w, GLASS.h);
        c.fillStyle = '#c8e6ff'; c.fillRect(GLASS.x - 1, GLASS.y, 1, GLASS.h); c.fillRect(GLASS.x + GLASS.w, GLASS.y, 1, GLASS.h); c.fillRect(GLASS.x - 1, GLASS.y + GLASS.h, GLASS.w + 2, 1);
        if (p) {
          const lvl = Math.min(1, p.level);
          c.fillStyle = '#ffb347'; c.fillRect(GLASS.x, GLASS.y + GLASS.h * (1 - lvl), GLASS.w, Math.ceil(GLASS.h * lvl));
          c.fillStyle = 'rgba(139,226,143,0.35)';
          c.fillRect(GLASS.x - 3, GLASS.y + GLASS.h * (1 - p.hi), GLASS.w + 6, GLASS.h * (p.hi - p.lo));
          c.fillStyle = '#8be28f';
          c.fillRect(GLASS.x - 4, Math.round(GLASS.y + GLASS.h * (1 - p.hi)), 3, 1); c.fillRect(GLASS.x - 4, Math.round(GLASS.y + GLASS.h * (1 - p.lo)), 3, 1);
          if (!p.holding && Math.floor(st.t * 4) % 2 === 0) { c.strokeStyle = '#ffc247'; c.lineWidth = 1; c.strokeRect(GLASS.x - 3, GLASS.y - 3, GLASS.w + 6, GLASS.h + 6); }
        } else {
          c.fillStyle = '#ffb347'; c.fillRect(GLASS.x, GLASS.y + GLASS.h * 0.25, GLASS.w, GLASS.h * 0.75);
        }
        // 軌道
        c.fillStyle = '#12081a'; c.fillRect(0, 128, 320, 46);
        c.fillStyle = '#1d0f2b'; c.fillRect(0, 151, 320, 1);
        ['laugh', 'nod'].forEach((lane) => {
          c.strokeStyle = lane === 'laugh' ? '#ffc247' : '#37c3d6'; c.lineWidth = 2;
          c.beginPath(); c.arc(HIT_X, LANE_Y[lane], 8, 0, Math.PI * 2); c.stroke();
        });
        notes.forEach((n) => {
          if (n.done) return;
          const x = xOf(n.t);
          const y = LANE_Y[n.lane];
          if (n.kind === 'hold') {
            const x2 = Math.min(330, xOf(n.t + n.dur));
            const x1 = n.holding ? HIT_X : x;
            if (x2 < -10 || x1 > 330) return;
            c.fillStyle = n.holding ? 'rgba(255,194,71,0.85)' : 'rgba(255,194,71,0.45)';
            c.fillRect(Math.round(x1), y - 4, Math.max(0, Math.round(x2 - x1)), 8);
            c.fillStyle = '#ffc247'; c.beginPath(); c.arc(Math.round(x2), y, 4, 0, Math.PI * 2); c.fill();
            if (!n.holding) { c.beginPath(); c.arc(Math.round(x), y, 7, 0, Math.PI * 2); c.fill(); }
            return;
          }
          if (x > 330 || x < -10) return;
          const col = n.kind === 'bias' ? '#c0392b' : n.kind === 'sad' ? '#5fc8ff' : n.lane === 'nod' ? '#37c3d6' : '#ffc247';
          c.fillStyle = col; c.beginPath(); c.arc(Math.round(x), y, 7, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#12081a';
          const xi = Math.round(x);
          if (n.kind === 'bias') { c.fillStyle = '#ffffff'; c.fillRect(xi - 1, y - 4, 2, 5); c.fillRect(xi - 1, y + 2, 2, 2); }
          else if (n.kind === 'sad') { c.fillRect(xi - 3, y - 2, 2, 2); c.fillRect(xi + 1, y - 2, 2, 2); c.fillRect(xi - 2, y + 3, 4, 1); c.fillStyle = '#ffffff'; c.fillRect(xi - 3, y, 1, 3); }
          else if (n.lane === 'nod') { c.fillRect(xi - 3, y - 2, 6, 1); c.fillRect(xi - 2, y - 1, 4, 1); c.fillRect(xi - 1, y, 2, 2); }
          else { c.fillRect(xi - 3, y + 2, 6, 1); c.fillRect(xi - 3, y - 3, 2, 2); c.fillRect(xi + 1, y - 3, 2, 2); }
        });
        ads.draw(c);
        fx.draw(c);
        if (st.flash > 0) { c.fillStyle = 'rgba(95,200,255,' + st.flash * 0.5 + ')'; c.fillRect(0, 0, 320, 180); }
      },
      drawText() {
        const cur = Math.max(0, s.spark - st.drain);
        P.text('$ +' + Math.round(st.cr), 6, 1, { size: 9, font: 'num', color: '#8be28f', weight: 400 });
        P.text('火花 ×' + cur.toFixed(2), 314, 1, { size: 9, font: 'num', color: '#ffc247', align: 'right', weight: 400 });
        P.text('你', 46, 88, { size: 7, align: 'center', color: '#9fb0d0' });
        P.text('VIP 客人滿意度', 268, 98, { size: 6, align: 'center', color: '#9fb0d0' });
        P.text('笑', 30, LANE_Y.laugh - 5, { size: 8, align: 'center', color: '#ffc247', weight: 900 });
        P.text('點頭', 30, LANE_Y.nod - 5, { size: 7, align: 'center', color: '#37c3d6', weight: 900 });
        if (st.pour) P.text(st.pour.holding ? '倒酒中…' : '杯空了！按住倒酒', GLASS.x + GLASS.w / 2, GLASS.y + GLASS.h + 3, { size: 6, align: 'center', color: '#ffc247', weight: 900 });
        if (st.bubble) {
          const w = Math.min(150, P.measure(st.bubble.text, { size: 7 }) + 10);
          const ctx = P.view.ctx, sc = P.view.scale;
          ctx.fillStyle = st.bubble.angry ? '#ff4d5e' : st.bubble.bias ? '#ffb3a7' : st.bubble.sad ? '#9fdcff' : '#ffffff';
          ctx.fillRect((234 - w) * sc, 40 * sc, w * sc, 13 * sc);
          P.text(st.bubble.text, 234 - w + 5, 42, { size: 7, color: '#1b1b28', weight: 700 });
        }
        if (st.judge && st.judge.t < 0.6) P.text(st.judge.text, HIT_X + 26, 118, { size: 9, align: 'center', weight: 900, color: st.judge.color, stroke: '#12081a', alpha: 1 - st.judge.t / 0.6 });
        ads.drawText();
        C.drawBanner(st);
      },
    };
  }

  IE.Micro.register('smile', Smile);
})(window.IE = window.IE || {});
