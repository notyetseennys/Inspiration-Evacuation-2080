// AI 數據標註
//   - 圖片由「種類＋修飾（帽子、眼鏡、金色）」組成；指引每 15 秒更新一次，越來越荒謬
//   - 連續 15 張正確會進入「心流狀態」：收入加倍，火花消耗也加倍
//   - 主管會突然巡查，巡查期間出錯會被記錄
//   - 被外星人選中之後，用同一套玩法篩選地球人（alien 模式）
(function (IE) {
  'use strict';
  const P = IE.Pixel, A = IE.Audio, C = IE.Micro.C;
  const R = () => IE.Rules, D = () => IE.DATA, G = () => IE.Game;
  const CX = 204;                  // 圖片卡中心
  const CARD_TOP = 40, CARD_SIZE = 68;
  const ALIEN_N = 14;

  // 修飾：以 12×12 精靈圖的格線為單位，再乘以縮放
  function drawMods(c, it, x, y, s) {
    if (it.glasses) {
      c.fillStyle = '#0b0f1a';
      c.fillRect(x + 2 * s, y + 4 * s, 3 * s, Math.round(1.5 * s));
      c.fillRect(x + 7 * s, y + 4 * s, 3 * s, Math.round(1.5 * s));
      c.fillRect(x + 5 * s, y + Math.round(4.5 * s), 2 * s, Math.max(1, Math.round(0.5 * s)));
      c.fillStyle = '#7fb7ff';
      c.fillRect(x + 2 * s + 1, y + 4 * s + 1, Math.max(1, s - 1), Math.max(1, Math.round(s / 2)));
      c.fillRect(x + 7 * s + 1, y + 4 * s + 1, Math.max(1, s - 1), Math.max(1, Math.round(s / 2)));
    }
    if (it.hat) {
      c.fillStyle = '#1b1b28';
      c.fillRect(x + 2 * s, y - Math.round(0.5 * s), 8 * s, s);
      c.fillRect(x + Math.round(3.5 * s), y - Math.round(3.5 * s), 5 * s, 3 * s);
      c.fillStyle = '#ff4fb4';
      c.fillRect(x + Math.round(3.5 * s), y - Math.round(1.25 * s), 5 * s, Math.max(1, Math.round(0.75 * s)));
    }
  }
  function drawCandidate(c, it, x, y, s) {
    P.sprite(c, 'player', x + 4 * s, y + s, { scale: s, pal: it.pal || undefined });
    for (let i = 0; i < it.sparks; i++) {
      c.fillStyle = '#ffc247';
      const sx = x + 2 * s + i * 4 * s, sy = y - 2 * s;
      c.fillRect(sx + s, sy, s, 3 * s); c.fillRect(sx, sy + s, 3 * s, s);
    }
  }
  // 畫一張圖片卡：cx 為中心，top 為頂邊
  function drawCard(c, it, cx, top, size, scale, t) {
    c.fillStyle = it.gold ? '#fff4d1' : '#f4f6fb';
    c.fillRect(cx - size / 2, top, size, size);
    if (it.gold) {
      c.strokeStyle = '#e8c25a'; c.lineWidth = 2; c.strokeRect(cx - size / 2 + 1, top + 1, size - 2, size - 2);
    }
    const sx = cx - 6 * scale, sy = top + (size - 12 * scale) / 2 + scale;
    if (it.kind === 'person') drawCandidate(c, it, sx, sy, scale * 0.75);
    else {
      P.sprite(c, it.kind, sx, sy, { scale, tint: it.gold ? 'rgba(255,205,90,0.55)' : undefined });
      drawMods(c, it, sx, sy, scale);
    }
    if (it.gold && t != null) {
      c.fillStyle = '#ffffff';
      for (let i = 0; i < 3; i++) {
        const k = (t * 2 + i / 3) % 1;
        c.fillRect(Math.round(cx - size / 2 + 6 + ((i * 23) % (size - 12))), Math.round(top + size - 8 - k * (size - 16)), 1, 1);
      }
    }
  }

  function Label(opts, onDone) {
    const s = G().state;
    const alien = !!opts.alien;
    const cfg = alien
      ? { duration: 999, phases: [0], startLimit: 3.2, minLimit: 3.2, ads: false, promptIndex: 0, flowAt: 999, supervisor: false, preview: false }
      : R().labelConfig(s, opts);
    const prompt = alien ? null : D().LABEL_PROMPTS[cfg.promptIndex];
    const fx = P.particles();
    const st = {
      t: -1.4, phase: 'intro', banner: null, combo: 0, maxCombo: 0, correct: 0, wrong: 0, caught: 0,
      cr: 0, drain: 0, item: null, next: null, fly: [], rulePhase: 0, grace: 0, lock: 0,
      flash: 0, milestone: null, autoStart: s.auto, alienIndex: 0, selfJudged: null, endT: 0,
      flow: 0, flows: 0, flowEndNote: 0, sup: null, supAt: 8 + Math.random() * 22, supDone: false,
    };
    const ads = C.adSystem(cfg.ads, { x: 150, y: 36, w: 60, h: 46 });
    C.banner(st, alien ? '開始篩選' : opts.ot ? '深夜加班' : '上班', alien ? '#9be36b' : '#37c3d6',
      alien ? '跟足指引' : '跟從指引分類：← 否　是 →');
    A.setMode(alien ? 'alien' : 'work', alien ? 84 : 112);

    // ---------- 題目產生 ----------
    const truth = (it) => (alien ? alienYes(it) : prompt.test[st.rulePhase](it));
    function alienYes(it) { return st.rulePhase === 0 ? it.sparks >= 2 : it.sparks === 2; }
    function randomItem() {
      const k = st.rulePhase;
      return {
        kind: D().LABEL_ITEMS[Math.floor(Math.random() * D().LABEL_ITEMS.length)],
        hat: Math.random() < 0.18 + 0.08 * k,
        glasses: Math.random() < 0.15 + 0.1 * k,
        gold: Math.random() < 0.08 + 0.06 * k,
      };
    }
    function genItem() {
      if (alien) {
        if (st.alienIndex >= ALIEN_N) return null;
        const i = st.alienIndex++;
        if (i === 6) { st.rulePhase = 1; ruleUpdate(); }
        const self = i === ALIEN_N - 1;
        const hairs = ['#2b2140', '#6b3a1e', '#c9a227', '#1e2a3b', '#8e9bb0', '#a83246'];
        const jackets = ['#ff4fb4', '#9be36b', '#ffc247', '#8e9bb0', '#a77bff', '#ff8a3c'];
        return { kind: 'person', self, sparks: self ? 3 : Math.floor(Math.random() * 4),
          pal: self ? null : { h: hairs[i % hairs.length], j: jackets[(i * 5) % jackets.length] },
          tag: self ? '樣本 #2080' : '樣本 #' + (1000 + Math.floor(Math.random() * 8999)) };
      }
      // 約 45% 應答「是」；後期多出「差一點就符合」的陷阱圖
      const wantYes = Math.random() < 0.45;
      let it = randomItem();
      for (let n = 0; n < 40 && truth(it) !== wantYes; n++) it = randomItem();
      return it;
    }
    function newItem() {
      let it = st.next || genItem();
      st.next = cfg.preview ? genItem() : null;
      if (!it) { finish(); return; }
      it.age = 0;
      it.limit = Math.max(cfg.minLimit, cfg.startLimit - 0.045 * st.combo) * (st.flow > 0 ? 0.8 : 1);
      it.y = -40;
      st.item = it;
    }
    function ruleUpdate() {
      C.banner(st, '指引更新！', '#ff4fb4', alien ? '' : prompt.rules[st.rulePhase]);
      st.grace = 1.4;
      A.sfx('ad');
    }

    // ---------- 作答 ----------
    function answer(yes) {
      if (st.phase !== 'play' || !st.item || st.item.y < 30 || st.lock > 0) return;
      const it = st.item;
      const ok = truth(it) === yes;
      st.fly.push({ it, dir: yes ? 1 : -1, t: 0, ok, stamp: alien ? (yes ? '錄取' : '不錄取') : (yes ? '是' : '否') });
      if (it.self) st.selfJudged = yes;
      if (ok) {
        if (!alien) {
          const o = { ot: !!opts.ot, flow: st.flow > 0, gold: !!it.gold };
          const pay = R().labelItemPay(s, st.combo, o);
          const dr = R().labelItemDrain(s, o);
          st.cr += pay; st.drain += dr;
          fx.add({ x: CX, y: 74, tx: 22, ty: 4, home: 6, life: 0.6, color: it.gold ? '#ffd36b' : '#8be28f', size: 2 });
          const n = st.flow > 0 ? 6 : 3;
          for (let i = 0; i < n; i++) {
            fx.add({ x: 24 + Math.random() * 12, y: 150, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 30, life: 1.2, color: '#ffc247', size: 1, g: -10 });
          }
          A.sfx('coin');
          if (st.correct % 3 === 0) A.sfx('spark');
        } else A.sfx('stamp');
        st.correct++; st.combo++; st.maxCombo = Math.max(st.maxCombo, st.combo);
        if (!alien && st.combo === cfg.flowAt && st.flow <= 0) startFlow();
        else if (!alien && st.combo % 8 === 0 && st.combo <= 48) {
          st.milestone = { text: '連擊 ' + st.combo + '　收入 ×' + (1 + Math.floor(st.combo / 8) * 0.25).toFixed(2), t: 0 };
          A.sfx('combo');
        }
      } else {
        miss();
      }
      newItem();
    }
    function miss() {
      st.wrong++; st.combo = 0;
      if (!alien) {
        st.cr = Math.max(0, st.cr - 1);
        st.lock = 0.5; // 帳戶審查：防止亂按
        if (st.sup && st.sup.t > 0.4) { st.caught++; st.sup.caughtFlash = 1; }
      }
      if (st.flow > 0) endFlow();
      st.flash = 0.35; P.view.shake = 4;
      A.sfx('wrong');
    }
    function startFlow() {
      st.flow = cfg.flowTime; st.flows++;
      A.sfx('boom'); A.setMode('work', 140);
      C.banner(st, '心流狀態', '#ffc247', '收入 ×2　火花消耗 ×2');
    }
    function endFlow() {
      st.flow = 0; st.flowEndNote = 2.2;
      A.setMode('work', 112);
    }
    function timeout() {
      st.fly.push({ it: st.item, dir: 0, t: 0, ok: false, stamp: '逾時' });
      if (st.item.self) st.selfJudged = null;
      miss();
      newItem();
    }
    function finish() {
      if (st.phase === 'end') return;
      st.phase = 'end'; st.endT = 0; st.item = null;
      if (st.flow > 0) endFlow();
      C.banner(st, alien ? '篩選完成' : '下班', '#ffc247');
    }
    const endTick = C.ender(st, () => (alien
      ? { correct: st.correct, wrong: st.wrong, selfJudged: st.selfJudged, accuracy: st.correct / Math.max(1, st.correct + st.wrong) }
      : { cr: st.cr, drain: st.drain, correct: st.correct, wrong: st.wrong, maxCombo: st.maxCombo, flows: st.flows, caught: st.caught }), onDone);

    let downX = null;
    return {
      kind: 'label', alien,
      controls: alien ? [{ id: 'no', label: '不錄取', key: '←' }, { id: 'yes', label: '錄取', key: '→' }]
        : [{ id: 'no', label: '否', key: '←' }, { id: 'yes', label: '是', key: '→' }],
      hint: alien ? '依照指引篩選。鍵盤：← 不錄取　→ 錄取'
        : '依照左邊的指引分類，指引每 15 秒更新。連續答對 15 張進入心流狀態。鍵盤：← 否　→ 是，空白鍵關閉廣告。',
      control(id, down) { if (down === false) return; if (id === 'yes') answer(true); else if (id === 'no') answer(false); },
      key(k, down) {
        if (!down) return;
        if (k === 'ArrowRight' || k === 'd' || k === 'D') answer(true);
        else if (k === 'ArrowLeft' || k === 'a' || k === 'A') answer(false);
        else if (k === ' ') ads.closeTop();
      },
      pointer(type, x, y) {
        if (type === 'down') {
          if (ads.hit(x, y)) { downX = null; return; }
          downX = x;
        } else if (type === 'up' && downX != null) {
          const dx = x - downX;
          if (Math.abs(dx) > 18) answer(dx > 0); else answer(x > CX);
          downX = null;
        }
      },
      update(dt) {
        st.t += dt;
        if (st.banner) st.banner.t += dt;
        if (st.milestone) { st.milestone.t += dt; if (st.milestone.t > 1.2) st.milestone = null; }
        st.flash = Math.max(0, st.flash - dt);
        st.lock = Math.max(0, st.lock - dt);
        st.flowEndNote = Math.max(0, st.flowEndNote - dt);
        fx.update(dt);
        st.fly.forEach((f) => { f.t += dt; });
        st.fly = st.fly.filter((f) => f.t < 0.5);
        if (st.phase === 'intro' && st.t >= 0) { st.phase = 'play'; newItem(); }
        if (st.phase === 'play') {
          ads.update(dt);
          if (!alien) {
            for (let i = cfg.phases.length - 1; i > st.rulePhase; i--) {
              if (st.t >= cfg.phases[i]) { st.rulePhase = i; ruleUpdate(); break; }
            }
            if (st.flow > 0) { st.flow -= dt; if (st.flow <= 0) endFlow(); }
            // 主管巡查
            if (cfg.supervisor && !st.supDone && st.t >= st.supAt) { st.sup = { t: 0, caughtFlash: 0 }; st.supDone = true; A.sfx('rent'); }
            if (st.sup) { st.sup.t += dt; st.sup.caughtFlash = Math.max(0, st.sup.caughtFlash - dt); if (st.sup.t > 6) st.sup = null; }
          }
          st.grace = Math.max(0, st.grace - dt);
          const it = st.item;
          if (it) {
            it.y += (CARD_TOP - it.y) * Math.min(1, dt * 14);
            if (it.y > 30 && st.grace <= 0) it.age += dt;
            if (it.age > it.limit) timeout();
          }
          if (!alien && st.t >= cfg.duration) finish();
          if (!alien) A.setSpark(Math.max(0, s.spark - st.drain));
        }
        endTick(dt);
      },
      draw(c) {
        const flowing = st.flow > 0;
        const grey = alien ? 0 : flowing ? 1 : Math.min(0.7, st.combo / 30);
        c.fillStyle = alien ? '#e9eef7' : P.desat('#1a1240', grey); c.fillRect(0, 0, 320, 180);
        if (!alien) {
          c.fillStyle = P.desat('#2b1f5c', grey);
          for (let i = 0; i < 6; i++) c.fillRect(i * 56 + 4, 18, 40, 20);
          c.fillStyle = P.desat('#37c3d6', grey);
          for (let i = 0; i < 6; i++) c.fillRect(i * 56 + 8, 22, 32, 1 + ((i + Math.floor(st.t * (flowing ? 8 : 3))) % 3));
        } else {
          c.fillStyle = '#d3dbea'; for (let x = 0; x < 320; x += 32) c.fillRect(x, 0, 1, 180);
        }
        C.topBar(c, alien ? st.alienIndex / ALIEN_N : 1 - Math.max(0, st.t) / cfg.duration, alien ? '#9be36b' : flowing ? '#ffc247' : '#37c3d6');
        // 指引板
        c.fillStyle = alien ? '#ffffff' : 'rgba(10,14,23,0.86)'; c.fillRect(4, 17, 108, 110);
        c.fillStyle = alien ? '#9be36b' : '#ff4fb4'; c.fillRect(4, 17, 108, 2);
        // 卡位
        c.fillStyle = alien ? '#c4cfe3' : P.desat('#0b0f1a', grey); c.fillRect(CX - 38, CARD_TOP - 4, 76, 76);
        st.fly.forEach((f) => {
          const k = f.t / 0.5;
          c.globalAlpha = Math.max(0, 1 - k * 1.6);
          drawCard(c, f.it, CX + f.dir * k * 90, CARD_TOP + (f.dir === 0 ? k * 90 : 0), CARD_SIZE, 4, null);
          c.globalAlpha = 1;
        });
        if (st.item) {
          drawCard(c, st.item, CX, st.item.y, CARD_SIZE, 4, st.t);
          const frac = 1 - st.item.age / st.item.limit;
          c.fillStyle = '#26334d'; c.fillRect(CX - 32, 112, 64, 3);
          c.fillStyle = st.grace > 0 ? '#8d99b4' : frac > 0.35 ? '#8be28f' : '#ff4d5e'; c.fillRect(CX - 32, 112, Math.round(64 * Math.max(0, frac)), 3);
        }
        // 第二螢幕：預覽下一張
        if (st.next && st.phase === 'play') {
          c.fillStyle = '#0b0f1a'; c.fillRect(256, 30, 34, 34);
          drawCard(c, st.next, 273, 32, 30, 2, null);
        }
        // 心流計時
        if (flowing) {
          c.fillStyle = '#26334d'; c.fillRect(CX - 32, 118, 64, 2);
          c.fillStyle = '#ffc247'; c.fillRect(CX - 32, 118, Math.round(64 * st.flow / cfg.flowTime), 2);
        }
        // 主管
        if (st.sup) {
          const k = Math.min(1, st.sup.t * 3, (6 - st.sup.t) * 3);
          const x = 320 - 30 * k;
          P.sprite(c, 'alien', x, 82, { scale: 2, pal: { a: '#f2c6a0', k: '#1b1b28', s: '#3a3f4b', r: '#ff4d5e' } });
          if (st.sup.caughtFlash > 0) { c.fillStyle = 'rgba(255,77,94,' + st.sup.caughtFlash * 0.6 + ')'; c.fillRect(290, 80, 30, 36); }
        }
        // 自己（左下）：火花越少越灰
        if (!alien) {
          const cur = Math.max(0, s.spark - st.drain);
          c.fillStyle = '#0b0f1a'; c.fillRect(4, 132, 40, 44);
          P.sprite(c, IE.Chars.spr(IE.Game.state), 12, 140, { scale: 2, desat: Math.max(0, 1 - cur / 2.5) });
          c.fillStyle = '#26334d'; c.fillRect(4, 172, 40, 3);
          c.fillStyle = '#ffc247'; c.fillRect(4, 172, Math.round(40 * Math.min(1, cur / 4)), 3);
        }
        ads.draw(c);
        fx.draw(c);
        if (st.flash > 0) { c.fillStyle = 'rgba(255,77,94,' + st.flash * 0.5 + ')'; c.fillRect(0, 0, 320, 180); }
      },
      drawText() {
        const ink = alien ? '#1b2233' : '#ffffff';
        // 指引板文字
        P.text(alien ? '篩選指引' : '標註指引', 8, 21, { size: 7, color: alien ? '#2a8a3e' : '#ff8fd1', weight: 900 });
        const rules = alien ? ['火花兩粒或以上才錄取。', '火花三粒＝難以管理，只錄取剛好兩粒。'] : prompt.rules;
        let y = 32;
        for (let i = 0; i <= st.rulePhase; i++) {
          const fresh = i === st.rulePhase && i > 0;
          const lines = P.wrap((i + 1) + '. ' + rules[i], 14);
          P.text(lines, 8, y, { size: 6, color: fresh ? (alien ? '#c62f45' : '#ffc247') : (alien ? '#1b2233' : '#d5dcef'), weight: fresh ? 900 : 500, lineHeight: 1.35 });
          y += lines.split('\n').length * 8.4 + 4;
        }
        if (alien) {
          P.text('錄取嗎？', CX, 18, { size: 11, align: 'center', weight: 900, color: ink });
          if (st.item) P.text(st.item.tag, CX, 118, { size: 7, align: 'center', color: st.item.self ? '#ff4d5e' : '#1b2233', weight: 900 });
          P.text('← 不錄取', 140, 70, { size: 7, align: 'center', color: '#5b6b90', weight: 900 });
          P.text('錄取 →', 270, 70, { size: 7, align: 'center', color: '#5b6b90', weight: 900 });
          P.text(st.alienIndex + ' / ' + ALIEN_N, 6, 1, { size: 9, font: 'num', color: '#9be36b', weight: 400 });
        } else {
          const cur = Math.max(0, s.spark - st.drain);
          P.text('$ +' + Math.round(st.cr), 6, 1, { size: 9, font: 'num', color: '#8be28f', weight: 400 });
          P.text('火花 ×' + cur.toFixed(2), 314, 1, { size: 9, font: 'num', color: '#ffc247', align: 'right', weight: 400 });
          P.text(prompt.q, CX, 18, { size: 11, align: 'center', weight: 900, color: ink });
          P.text('← 否', 140, 70, { size: 9, align: 'center', color: '#ff8a9a', weight: 900 });
          P.text('是 →', 268, 70, { size: 9, align: 'center', color: '#8be28f', weight: 900 });
          if (st.next && st.phase === 'play') P.text('下一張', 273, 66, { size: 5, align: 'center', color: '#8d99b4' });
          if (st.combo >= 3) P.text('連擊 ' + st.combo, CX, 122, { size: 9, align: 'center', color: st.flow > 0 ? '#ffffff' : '#ffc247', weight: 900 });
          if (st.flow > 0) P.text('心流狀態：你感覺不到任何東西', CX, 134, { size: 7, align: 'center', color: '#ffc247', weight: 700 });
          else if (st.flowEndNote > 0) P.text('你剛才完全沒有思考。', CX, 134, { size: 7, align: 'center', color: '#8d99b4', weight: 700, alpha: Math.min(1, st.flowEndNote) });
          const auto = Math.max(0, Math.min(100, st.autoStart + 0.06 * st.correct - 0.15 * st.wrong));
          P.text('全城自動化 ' + auto.toFixed(1) + '%', 314, 168, { size: 6, align: 'right', color: '#8d99b4' });
          if (st.lock > 0) P.text('帳戶審查中…', CX, 100, { size: 8, align: 'center', color: '#ff8a9a', weight: 900, stroke: '#0b0f1a' });
          if (st.milestone) P.text(st.milestone.text, CX, 146, { size: 8, align: 'center', color: '#ff4fb4', weight: 900, stroke: '#0b0f1a' });
          if (st.sup) {
            P.text(st.sup.caughtFlash > 0 ? '記錄在案。' : '我在看著你。', 314, 70, { size: 6, align: 'right', color: st.sup.caughtFlash > 0 ? '#ff4d5e' : '#ffffff', weight: 900, stroke: '#0b0f1a' });
            P.text('主管巡查中', 314, 14, { size: 6, align: 'right', color: '#ff8a9a', weight: 900 });
          }
        }
        st.fly.forEach((f) => {
          if (f.t < 0.35) P.text(f.stamp, CX + f.dir * 30, 64, { size: 14, align: 'center', weight: 900, color: f.ok ? '#8be28f' : '#ff4d5e', stroke: '#0b0f1a', alpha: 1 - f.t / 0.35 });
        });
        ads.drawText();
        C.drawBanner(st);
      },
    };
  }

  IE.Micro.register('label', Label);
})(window.IE = window.IE || {});
