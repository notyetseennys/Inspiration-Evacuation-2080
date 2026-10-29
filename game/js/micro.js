// 打工小遊戲：做得越好越爽，但每一下都見到火花飛走。
//   label：AI 數據標註（左右分類）
//   smile：企業情緒陪伴（節奏）
//   dive： 舊城潛水（探索）
//   alien：被招攬之後嘅第一份工（標註地球人）
(function (IE) {
  'use strict';
  const P = IE.Pixel, A = IE.Audio;
  const R = () => IE.Rules;
  const D = () => IE.DATA;
  const G = () => IE.Game;

  // ---------- 共用：開工／收工橫額、廣告 ----------
  function banner(state, text, color) { state.banner = { text, color: color || '#ffffff', t: 0 }; }
  function drawBanner(state) {
    const b = state.banner;
    if (!b || b.t > 1.3) return;
    const a = b.t < 0.15 ? b.t / 0.15 : b.t > 1 ? 1 - (b.t - 1) / 0.3 : 1;
    P.text(b.text, 160, 74, { size: 20, align: 'center', weight: 900, color: b.color, stroke: '#0b0f1a', alpha: Math.max(0, a) });
  }

  function adSystem(enabled) {
    const ads = [];
    let next = 5 + Math.random() * 3;
    return {
      ads,
      update(dt) {
        if (!enabled) return;
        next -= dt;
        if (next <= 0) {
          next = 6 + Math.random() * 4;
          const lines = D().ADS;
          ads.push({ x: 70 + Math.random() * 90, y: 34 + Math.random() * 50, w: 104, h: 44,
            text: lines[Math.floor(Math.random() * lines.length)], t: 0, hue: Math.random() < 0.5 ? '#ff4fb4' : '#ffc247' });
          A.sfx('ad');
        }
        for (let i = ads.length - 1; i >= 0; i--) { ads[i].t += dt; if (ads[i].t > 5) ads.splice(i, 1); }
      },
      // 撳中 × 就閂；撳中廣告其他位置當冇撳
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
          c.fillStyle = '#ffffff'; c.fillRect(a.x + a.w - 10, a.y + 6, 6, 1);
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
    c.fillStyle = color || '#37c3d6'; c.fillRect(110, 5, Math.round(100 * Math.max(0, progress)), 3);
  }

  // ============================================================
  // AI 數據標註
  // ============================================================
  function Label(opts, onDone) {
    const s = G().state;
    const alien = !!opts.alien;
    const cfg = alien ? { duration: 999, startLimit: 3.2, minLimit: 3.2, ads: false, promptIndex: 0 } : R().labelConfig(s, opts);
    const prompts = D().LABEL_PROMPTS;
    const fx = P.particles();
    const st = {
      t: -1.2, phase: 'intro', banner: null, combo: 0, maxCombo: 0, correct: 0, wrong: 0,
      cr: 0, drain: 0, item: null, fly: [], prompt: alien ? null : prompts[cfg.promptIndex], promptSwitched: false,
      flash: 0, flashColor: '#ff4d5e', milestone: null, autoStart: s.auto, alienIndex: 0, alienRule: 1,
      selfJudged: null, endT: 0, lock: 0,
    };
    const ads = adSystem(cfg.ads);
    banner(st, alien ? '開始篩選' : opts.ot ? '深夜 OT' : '開工', alien ? '#9be36b' : '#37c3d6');
    A.setMode(alien ? 'alien' : 'work', alien ? 84 : 112);

    const ALIEN_N = 14;
    function alienCandidate(i) {
      const self = i === ALIEN_N - 1;
      const hairs = ['#2b2140', '#6b3a1e', '#c9a227', '#1e2a3b', '#8e9bb0', '#a83246'];
      const jackets = ['#ff4fb4', '#9be36b', '#ffc247', '#8e9bb0', '#a77bff', '#ff8a3c'];
      return {
        kind: 'person', self,
        sparks: self ? 3 : Math.floor(Math.random() * 4),
        pal: self ? null : { h: hairs[i % hairs.length], j: jackets[(i * 5) % jackets.length] },
        tag: self ? '樣本 #2080' : '樣本 #' + (1000 + Math.floor(Math.random() * 8999)),
      };
    }
    function alienYes(it) { return st.alienRule === 1 ? it.sparks >= 2 : it.sparks === 2; }

    function newItem() {
      let it;
      if (alien) {
        if (st.alienIndex >= ALIEN_N) { finish(); return; }
        it = alienCandidate(st.alienIndex++);
        if (st.alienIndex === 7) { st.alienRule = 2; banner(st, '指引更新！', '#ff4fb4'); A.sfx('ad'); }
      } else {
        const p = st.prompt;
        const yes = Math.random() < 0.45;
        const pool = D().LABEL_ITEMS.filter((k) => p.yes.includes(k) === yes);
        it = { kind: pool[Math.floor(Math.random() * pool.length)] };
      }
      it.age = 0;
      it.limit = Math.max(cfg.minLimit, cfg.startLimit - 0.045 * st.combo);
      it.y = -40;
      st.item = it;
    }
    function answer(yes) {
      if (st.phase !== 'play' || !st.item || st.item.y < 40 || st.lock > 0) return;
      const it = st.item;
      const right = alien ? alienYes(it) : st.prompt.yes.includes(it.kind);
      const ok = right === yes;
      st.fly.push({ it, dir: yes ? 1 : -1, t: 0, ok, stamp: alien ? (yes ? '錄取' : '唔錄取') : (yes ? '是' : '否') });
      if (it.self) st.selfJudged = yes;
      if (ok) {
        if (!alien) {
          const pay = R().labelItemPay(s, st.combo, opts);
          const dr = R().labelItemDrain(s, opts);
          st.cr += pay; st.drain += dr;
          fx.add({ x: 160, y: 80, tx: 22, ty: 4, home: 6, life: 0.6, color: '#8be28f', size: 2 });
          for (let i = 0; i < 3; i++) {
            fx.add({ x: 24 + Math.random() * 12, y: 150, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 30, life: 1.2, color: '#ffc247', size: 1, g: -10 });
          }
          A.sfx('coin');
          if (st.correct % 3 === 0) A.sfx('spark');
        } else A.sfx('stamp');
        st.correct++; st.combo++; st.maxCombo = Math.max(st.maxCombo, st.combo);
        if (!alien && st.combo % 8 === 0 && st.combo <= 48) {
          st.milestone = { text: 'COMBO ' + st.combo + '　人工 ×' + (1 + Math.floor(st.combo / 8) * 0.25).toFixed(2), t: 0 };
          A.sfx('combo');
        }
      } else {
        // 標錯：罰 $1，帳戶審查 0.5 秒（防止亂撳）
        st.wrong++; st.combo = 0;
        if (!alien) { st.cr = Math.max(0, st.cr - 1); st.lock = 0.5; }
        st.flash = 0.35; P.view.shake = 4;
        A.sfx('wrong');
      }
      newItem();
    }
    function timeout() {
      st.wrong++; st.combo = 0; st.flash = 0.3; A.sfx('wrong');
      st.fly.push({ it: st.item, dir: 0, t: 0, ok: false, stamp: '逾時' });
      if (st.item.self) st.selfJudged = null;
      newItem();
    }
    function finish() {
      if (st.phase === 'end') return;
      st.phase = 'end'; st.endT = 0; st.item = null;
      banner(st, alien ? '篩選完成' : '收工', '#ffc247');
    }

    let downX = null;
    return {
      kind: 'label', alien,
      controls: alien ? [{ id: 'no', label: '唔錄取', key: '←' }, { id: 'yes', label: '錄取', key: '→' }]
        : [{ id: 'no', label: '否', key: '←' }, { id: 'yes', label: '是', key: '→' }],
      hint: alien ? '跟足指引。鍵盤：← 唔錄取　→ 錄取' : '跟住指引分類，越快越多錢。鍵盤：← 否　→ 是　空白鍵閂廣告',
      control(id) { if (id === 'yes') answer(true); else if (id === 'no') answer(false); },
      key(k, down) {
        if (!down) return;
        if (k === 'ArrowRight' || k === 'd' || k === 'D') answer(true);
        else if (k === 'ArrowLeft' || k === 'a' || k === 'A') answer(false);
        else if (k === ' ') ads.closeTop();
      },
      pointer(type, x, y) {
        if (type === 'down') {
          const h = ads.hit(x, y);
          if (h) { downX = null; return; }
          downX = x;
        } else if (type === 'up' && downX != null) {
          const dx = x - downX;
          if (Math.abs(dx) > 18) answer(dx > 0); else answer(x > 160);
          downX = null;
        }
      },
      update(dt) {
        st.t += dt;
        if (st.banner) st.banner.t += dt;
        if (st.milestone) { st.milestone.t += dt; if (st.milestone.t > 1.2) st.milestone = null; }
        st.flash = Math.max(0, st.flash - dt);
        st.lock = Math.max(0, st.lock - dt);
        fx.update(dt);
        st.fly.forEach((f) => { f.t += dt; });
        st.fly = st.fly.filter((f) => f.t < 0.5);
        if (st.phase === 'intro' && st.t >= 0) { st.phase = 'play'; newItem(); }
        if (st.phase === 'play') {
          ads.update(dt);
          if (!alien && !st.promptSwitched && st.t > cfg.duration / 2) {
            st.promptSwitched = true;
            st.prompt = prompts[(cfg.promptIndex + 2) % prompts.length];
            banner(st, '指引更新！', '#ff4fb4'); A.sfx('ad');
          }
          const it = st.item;
          if (it) {
            it.y += (60 - it.y) * Math.min(1, dt * 14);
            if (it.y > 40) it.age += dt;
            if (it.age > it.limit) timeout();
          }
          if (!alien && st.t >= cfg.duration) finish();
          if (!alien) A.setSpark(Math.max(0, s.spark - st.drain));
        }
        if (st.phase === 'end') {
          st.endT += dt;
          if (st.endT > 1.4 && onDone) {
            const cb = onDone; onDone = null;
            cb(alien ? { correct: st.correct, wrong: st.wrong, selfJudged: st.selfJudged, accuracy: st.correct / Math.max(1, st.correct + st.wrong) }
              : { cr: st.cr, drain: st.drain, correct: st.correct, wrong: st.wrong, maxCombo: st.maxCombo });
          }
        }
      },
      draw(c) {
        // 背景：combo 越高，房間越灰
        const grey = alien ? 0 : Math.min(0.85, st.combo / 30);
        c.fillStyle = alien ? '#e9eef7' : P.desat('#1a1240', grey); c.fillRect(0, 0, 320, 180);
        if (!alien) {
          c.fillStyle = P.desat('#2b1f5c', grey);
          for (let i = 0; i < 6; i++) c.fillRect(i * 56 + 4, 20, 40, 26);
          c.fillStyle = P.desat('#37c3d6', grey);
          for (let i = 0; i < 6; i++) c.fillRect(i * 56 + 8, 24, 32, 1 + ((i + Math.floor(st.t * 3)) % 3));
        } else {
          c.fillStyle = '#d3dbea'; for (let x = 0; x < 320; x += 32) c.fillRect(x, 0, 1, 180);
        }
        topBar(c, alien ? st.alienIndex / ALIEN_N : 1 - Math.max(0, st.t) / cfg.duration, alien ? '#9be36b' : '#37c3d6');
        // 卡
        c.fillStyle = alien ? '#c4cfe3' : P.desat('#0b0f1a', grey); c.fillRect(124, 50, 72, 72);
        const drawItem = (it, x, y, alpha) => {
          c.globalAlpha = alpha;
          c.fillStyle = '#f4f6fb'; c.fillRect(x - 32, y - 2, 64, 64);
          if (it.kind === 'person') {
            P.sprite(c, 'player', x - 12, y + 14, { scale: 3, pal: it.pal || undefined });
            for (let i = 0; i < it.sparks; i++) {
              c.fillStyle = '#ffc247';
              const sx = x - 12 + i * 10, sy = y + 4;
              c.fillRect(sx + 2, sy, 2, 6); c.fillRect(sx, sy + 2, 6, 2);
            }
          } else {
            P.sprite(c, it.kind, x - 24, y + 6, { scale: 4 });
          }
          c.globalAlpha = 1;
        };
        st.fly.forEach((f) => {
          const k = f.t / 0.5;
          drawItem(f.it, 160 + f.dir * k * 160, 54 + (f.dir === 0 ? k * 100 : 0), 1 - k);
        });
        if (st.item) {
          drawItem(st.item, 160, st.item.y - 6, 1);
          const frac = 1 - st.item.age / st.item.limit;
          c.fillStyle = '#26334d'; c.fillRect(128, 126, 64, 3);
          c.fillStyle = frac > 0.35 ? '#8be28f' : '#ff4d5e'; c.fillRect(128, 126, Math.round(64 * Math.max(0, frac)), 3);
        }
        // 自己（左下）：火花越少越灰
        if (!alien) {
          const cur = Math.max(0, s.spark - st.drain);
          c.fillStyle = '#0b0f1a'; c.fillRect(6, 132, 40, 44);
          P.sprite(c, 'player', 14, 140, { scale: 2, desat: Math.max(0, 1 - cur / 2.5) });
          c.fillStyle = '#26334d'; c.fillRect(6, 172, 40, 3);
          c.fillStyle = '#ffc247'; c.fillRect(6, 172, Math.round(40 * Math.min(1, cur / 4)), 3);
        }
        ads.draw(c);
        fx.draw(c);
        if (st.flash > 0) { c.fillStyle = 'rgba(255,77,94,' + st.flash * 0.5 + ')'; c.fillRect(0, 0, 320, 180); }
      },
      drawText() {
        if (alien) {
          const rule = st.alienRule === 1 ? '指引 v1.0：火花 2 粒或以上先錄取。' : '指引 v1.1：火花 3 粒 = 難以管理。只錄取剛好 2 粒。';
          P.text('錄取？', 160, 16, { size: 12, align: 'center', weight: 900, color: '#1b2233' });
          P.text(rule, 160, 34, { size: 6, align: 'center', color: '#5b6b90' });
          if (st.item) P.text(st.item.tag, 160, 128, { size: 7, align: 'center', color: st.item.self ? '#ff4d5e' : '#1b2233', weight: 900 });
          P.text('← 唔錄取', 40, 84, { size: 8, align: 'center', color: '#5b6b90' });
          P.text('錄取 →', 280, 84, { size: 8, align: 'center', color: '#5b6b90' });
          P.text(st.alienIndex + ' / ' + ALIEN_N, 8, 2, { size: 7, font: 'num', color: '#9be36b' });
        } else {
          const cur = Math.max(0, s.spark - st.drain);
          P.text('$ +' + Math.round(st.cr), 6, 1, { size: 9, font: 'num', color: '#8be28f', weight: 400 });
          P.text('火花 ×' + cur.toFixed(2), 314, 1, { size: 9, font: 'num', color: '#ffc247', align: 'right', weight: 400 });
          if (st.prompt) {
            P.text(st.prompt.q, 160, 16, { size: 12, align: 'center', weight: 900, color: '#ffffff' });
            P.text(st.prompt.rule, 160, 34, { size: 6, align: 'center', color: '#9fb0d0' });
          }
          P.text('← 否', 46, 84, { size: 9, align: 'center', color: '#ff8a9a', weight: 900 });
          P.text('是 →', 274, 84, { size: 9, align: 'center', color: '#8be28f', weight: 900 });
          if (st.combo >= 3) P.text('COMBO ' + st.combo, 160, 132, { size: 10, align: 'center', font: 'num', color: '#ffc247', weight: 400 });
          const auto = Math.max(0, Math.min(100, st.autoStart + 0.06 * st.correct - 0.15 * st.wrong));
          if (st.lock > 0) P.text('審查中…', 160, 112, { size: 8, align: 'center', color: '#ff8a9a', weight: 900 });
          P.text('全城自動化 ' + auto.toFixed(1) + '%', 314, 168, { size: 6, align: 'right', color: '#8d99b4' });
          if (st.milestone) P.text(st.milestone.text, 160, 146, { size: 8, align: 'center', color: '#ff4fb4', weight: 900, stroke: '#0b0f1a' });
        }
        st.fly.forEach((f) => {
          if (f.t < 0.35) P.text(f.stamp, 160 + f.dir * 30, 70, { size: 14, align: 'center', weight: 900, color: f.ok ? '#8be28f' : '#ff4d5e', stroke: '#0b0f1a', alpha: 1 - f.t / 0.35 });
        });
        ads.drawText();
        drawBanner(st);
      },
    };
  }

  // ============================================================
  // 企業情緒陪伴（節奏）
  // ============================================================
  const CLIENT_LINES = [
    '我上個月又買咗層樓，哈哈', 'AI 識做晒啲嘢，你哋做咩好？哈哈', '我個仔話想做藝術家，我幫佢報咗金融',
    '笑啦，我俾錢㗎嘛', '天空區啲空氣好清新，你未試過？哈哈', '我請咗三個人幫我諗嘢，好方便',
    '浸水？我住 88 樓喎', '我捐咗錢俾低層，抵扣稅㗎',
  ];
  const SAD_LINES = ['我隻機械狗壞咗……', '我屋企嘅錦鯉死咗', '我老婆話我冇靈魂', '其實我好寂寞'];

  function face(c, x, y, o) {
    // 28×32 大頭像，用色塊砌
    c.fillStyle = o.shirt; c.fillRect(x, y + 24, 28, 8);
    c.fillStyle = o.skin; c.fillRect(x + 4, y + 4, 20, 22);
    if (o.fat) { c.fillRect(x + 2, y + 10, 24, 14); }
    c.fillStyle = o.hair; c.fillRect(x + 3, y + 1, 22, 6); c.fillRect(x + 3, y + 3, 3, 10); c.fillRect(x + 22, y + 3, 3, 10);
    if (o.shades) {
      c.fillStyle = '#0b0f1a'; c.fillRect(x + 6, y + 11, 7, 4); c.fillRect(x + 15, y + 11, 7, 4); c.fillRect(x + 13, y + 12, 2, 1);
    } else {
      c.fillStyle = '#1b1b28';
      const eh = o.dead > 0.6 ? 1 : 3;
      c.fillRect(x + 8, y + 11 + (3 - eh), 3, eh); c.fillRect(x + 17, y + 11 + (3 - eh), 3, eh);
    }
    const mw = Math.round(o.smile);
    const mx = x + 14 - Math.floor(mw / 2);
    c.fillStyle = '#9e3040'; c.fillRect(mx, y + 19, mw, 3);
    c.fillStyle = '#ffffff'; c.fillRect(mx + 1, y + 19, Math.max(0, mw - 2), 1);
    c.fillStyle = o.skin; if (mw > 6) { c.fillRect(mx - 1, y + 17, 1, 2); c.fillRect(mx + mw, y + 17, 1, 2); }
    if (o.chain) { c.fillStyle = '#e8c25a'; for (let i = 0; i < 14; i += 2) c.fillRect(x + 7 + i, y + 26 + (i > 6 ? 14 - i : i) / 3, 2, 1); }
  }

  function Smile(opts, onDone) {
    const s = G().state;
    const cfg = R().smileConfig(s);
    const fx = P.particles();
    const HIT_X = 74, SPAWN_X = 330, TRAVEL = 1.8;
    const notes = [];
    const st = {
      t: -1.2, phase: 'intro', banner: null, perfect: 0, good: 0, miss: 0, trapHits: 0, sat: 0.6,
      cr: 0, drain: 0, judge: null, bubble: null, nextBubble: 1, endT: 0, flash: 0,
    };
    const ads = adSystem(cfg.ads);
    // 預先排好音符
    let tt = 0.8, beat = 60 / cfg.bpm;
    while (tt < cfg.duration - 0.5) {
      if (Math.random() < 0.78) notes.push({ hit: tt, trap: Math.random() < cfg.trapRate, done: false });
      tt += tt > cfg.duration / 2 ? beat * 0.85 : beat;
    }
    banner(st, '開工', '#ff4fb4');
    A.setMode('work', cfg.bpm);

    function judge(text, color) { st.judge = { text, color, t: 0 }; }
    function press() {
      if (st.phase !== 'play') return;
      const now = st.t;
      let best = null, bd = 1;
      notes.forEach((n) => { if (!n.done) { const d = Math.abs(n.hit - now); if (d < bd) { bd = d; best = n; } } });
      if (!best || bd > 0.2) { st.sat = Math.max(0, st.sat - 0.02); judge('乾笑', '#8d99b4'); return; }
      best.done = true;
      if (best.trap) {
        st.trapHits++; st.sat = Math.max(0, st.sat - 0.1); st.flash = 0.3; P.view.shake = 3;
        judge('你笑咩？', '#5fc8ff'); A.sfx('wrong');
        st.bubble = { text: '你笑咩？', t: 0, angry: true };
        return;
      }
      const kind = bd <= 0.075 ? 'perfect' : 'good';
      const pay = R().smileItemPay(s, kind), dr = R().smileItemDrain(s, kind);
      st.cr += pay; st.drain += dr;
      if (kind === 'perfect') {
        st.perfect++; st.sat = Math.min(1, st.sat + 0.03); judge('完美', '#ff4fb4'); A.sfx('perfect');
        for (let i = 0; i < 4; i++) fx.add({ x: 46 + Math.random() * 10, y: 80, vx: (Math.random() - 0.5) * 30, vy: -30 - Math.random() * 30, life: 1.2, color: '#ffc247', g: -5 });
      } else {
        st.good++; st.sat = Math.min(1, st.sat + 0.01); judge('OK', '#37c3d6'); A.sfx('good');
      }
      fx.add({ x: HIT_X, y: 150, tx: 22, ty: 4, home: 6, life: 0.6, color: '#8be28f', size: 2 });
    }
    function finish() {
      if (st.phase === 'end') return;
      st.phase = 'end'; st.endT = 0;
      banner(st, '收工', '#ffc247');
    }
    return {
      kind: 'smile',
      controls: [{ id: 'laugh', label: '笑！', key: '空白鍵' }],
      hint: '「哈」到中間個圈先笑。藍色係傷心事，唔好笑。笑得越完美，火花扣得越多。',
      control(id) { if (id === 'laugh') press(); },
      key(k, down) { if (down && (k === ' ' || k === 'Enter' || k === 'j' || k === 'f')) press(); },
      pointer(type, x, y) { if (type === 'down') { if (ads.hit(x, y)) return; press(); } },
      update(dt) {
        st.t += dt;
        if (st.banner) st.banner.t += dt;
        if (st.judge) st.judge.t += dt;
        st.flash = Math.max(0, st.flash - dt);
        fx.update(dt);
        if (st.phase === 'intro' && st.t >= 0) st.phase = 'play';
        if (st.phase === 'play') {
          ads.update(dt);
          notes.forEach((n) => {
            if (!n.done && st.t - n.hit > 0.18) {
              n.done = true;
              if (!n.trap) { st.miss++; st.sat = Math.max(0, st.sat - 0.04); judge('冷場', '#8d99b4'); }
            }
          });
          st.nextBubble -= dt;
          if (st.nextBubble <= 0) {
            st.nextBubble = 4 + Math.random() * 2;
            const upcomingTrap = notes.find((n) => !n.done && n.trap && n.hit - st.t < 2.2 && n.hit > st.t);
            st.bubble = { text: upcomingTrap ? SAD_LINES[Math.floor(Math.random() * SAD_LINES.length)] : CLIENT_LINES[Math.floor(Math.random() * CLIENT_LINES.length)], t: 0 };
          }
          if (st.bubble) { st.bubble.t += dt; if (st.bubble.t > 3) st.bubble = null; }
          if (st.t >= cfg.duration) finish();
          A.setSpark(Math.max(0, s.spark - st.drain));
        }
        if (st.phase === 'end') {
          st.endT += dt;
          if (st.endT > 1.4 && onDone) {
            const cb = onDone; onDone = null;
            cb({ cr: st.cr, drain: st.drain, perfect: st.perfect, good: st.good, miss: st.miss, trapHits: st.trapHits, satisfaction: st.sat });
          }
        }
      },
      draw(c) {
        c.fillStyle = '#1a0b24'; c.fillRect(0, 0, 320, 180);
        c.fillStyle = '#2d1240'; c.fillRect(0, 100, 320, 80);
        for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ff4fb4' : '#a77bff'; c.fillRect(i * 44 + 6, 16, 30, 1); }
        topBar(c, 1 - Math.max(0, st.t) / cfg.duration, '#ff4fb4');
        const cur = Math.max(0, s.spark - st.drain);
        // 自己
        face(c, 30, 56, { skin: P.desat('#f2c6a0', Math.max(0, 1 - cur / 2.5) * 0.7), hair: '#2b2140', shirt: '#37c3d6',
          smile: 6 + Math.min(14, st.perfect / 2), dead: 1 - cur / 2.5 });
        // 客人
        face(c, 238, 50, { skin: '#f0b98c', hair: '#c9a227', shirt: '#4a1f6b', smile: st.sat > 0.6 ? 12 : 6, shades: true, fat: true, chain: true });
        c.fillStyle = '#7a3b1e'; c.fillRect(262, 70, 10, 2); c.fillStyle = '#ff8a3c'; c.fillRect(272, 70, 2, 2);
        // 滿意度
        c.fillStyle = '#26334d'; c.fillRect(238, 92, 28, 3);
        c.fillStyle = st.sat > 0.6 ? '#8be28f' : st.sat > 0.4 ? '#ffc247' : '#ff4d5e'; c.fillRect(238, 92, Math.round(28 * st.sat), 3);
        // 軌道
        c.fillStyle = '#12081a'; c.fillRect(0, 138, 320, 26);
        c.strokeStyle = '#ffc247'; c.lineWidth = 2;
        c.beginPath(); c.arc(HIT_X, 151, 9, 0, Math.PI * 2); c.stroke();
        notes.forEach((n) => {
          if (n.done) return;
          const x = HIT_X + (n.hit - st.t) / TRAVEL * (SPAWN_X - HIT_X);
          if (x > 330 || x < -10) return;
          c.fillStyle = n.trap ? '#5fc8ff' : '#ffc247';
          c.beginPath(); c.arc(Math.round(x), 151, 7, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#12081a';
          if (n.trap) { c.fillRect(Math.round(x) - 1, 147, 2, 6); } else { c.fillRect(Math.round(x) - 3, 153, 6, 1); c.fillRect(Math.round(x) - 3, 148, 2, 2); c.fillRect(Math.round(x) + 1, 148, 2, 2); }
        });
        ads.draw(c);
        fx.draw(c);
        if (st.flash > 0) { c.fillStyle = 'rgba(95,200,255,' + st.flash * 0.5 + ')'; c.fillRect(0, 0, 320, 180); }
      },
      drawText() {
        const cur = Math.max(0, s.spark - st.drain);
        P.text('$ +' + Math.round(st.cr), 6, 1, { size: 9, font: 'num', color: '#8be28f', weight: 400 });
        P.text('火花 ×' + cur.toFixed(2), 314, 1, { size: 9, font: 'num', color: '#ffc247', align: 'right', weight: 400 });
        P.text('你', 44, 92, { size: 7, align: 'center', color: '#9fb0d0' });
        P.text('VIP 客人・滿意度', 252, 98, { size: 6, align: 'center', color: '#9fb0d0' });
        if (st.bubble) {
          const w = Math.min(150, P.measure(st.bubble.text, { size: 7 }) + 10);
          const ctx = P.view.ctx, sc = P.view.scale;
          ctx.fillStyle = st.bubble.angry ? '#ff4d5e' : '#ffffff';
          ctx.fillRect((228 - w) * sc, 40 * sc, w * sc, 13 * sc);
          P.text(st.bubble.text, 228 - w + 5, 42, { size: 7, color: '#1b1b28', weight: 700 });
        }
        if (st.judge && st.judge.t < 0.6) P.text(st.judge.text, HIT_X, 118, { size: 10, align: 'center', weight: 900, color: st.judge.color, stroke: '#12081a', alpha: 1 - st.judge.t / 0.6 });
        P.text('完美 ' + st.perfect + '　OK ' + st.good + '　冷場 ' + st.miss, 160, 168, { size: 6, align: 'center', color: '#9fb0d0' });
        ads.drawText();
        drawBanner(st);
      },
    };
  }

  // ============================================================
  // 舊城潛水
  // ============================================================
  function Dive(opts, onDone) {
    const s = G().state;
    const cfg = R().diveConfig(s);
    const WORLD = 640, SURF = 22;
    const fx = P.particles();
    const st = {
      t: -1, phase: 'intro', banner: null, ox: cfg.oxygen, x: 36, y: 14, vx: 0, vy: 0, face: 1,
      cam: 0, been: false, hits: 0, inv: 0, sold: 0, got: [], popup: null, endT: 0, drowned: false,
      target: null, keys: {},
    };
    const items = [];
    const rnd = (a, b) => a + Math.random() * (b - a);
    cfg.relics.forEach((id, i) => items.push({ type: 'relic', id, x: 90 + (i + 0.5) * (520 / cfg.relics.length) + rnd(-20, 20), y: rnd(80, 168) }));
    if (cfg.legacy) items.push({ type: 'legacy', card: cfg.legacy, x: rnd(560, 620), y: rnd(150, 170) });
    cfg.sell.forEach((v) => items.push({ type: 'scrap', v, x: rnd(70, 600), y: rnd(50, 170) }));
    const hazards = [];
    for (let i = 0; i < cfg.hazards; i++) {
      hazards.push(i % 2 === 0
        ? { type: 'jelly', x: rnd(120, 620), y0: rnd(60, 160), y: 0, ph: rnd(0, 6) }
        : { type: 'debris', x: rnd(80, 640), y: rnd(50, 170), vx: rnd(-16, 16) || 8, w: 10 + Math.floor(rnd(0, 10)) });
    }
    const RUINS = [];
    for (let x = 20; x < WORLD; x += 46 + Math.floor(Math.random() * 30)) RUINS.push({ x, w: 26 + Math.floor(Math.random() * 20), h: 50 + Math.floor(Math.random() * 90) });
    banner(st, '落水', '#37c3d6');
    A.setMode('city', 70);

    function cardName(it) { return it.type === 'legacy' ? it.card.name : D().CARDS[it.id].name; }
    function finish(drowned) {
      if (st.phase === 'end') return;
      st.phase = 'end'; st.endT = 0; st.drowned = drowned;
      if (drowned) {
        st.got = st.got.slice(0, Math.ceil(st.got.length / 2));
        st.sold = Math.round(st.sold / 2);
        banner(st, '氧氣用盡', '#ff4d5e');
        A.sfx('hurt');
      } else { banner(st, '上水', '#ffc247'); A.sfx('splash'); }
    }
    return {
      kind: 'dive',
      controls: [{ id: 'up', label: '↑ 上水', key: '方向鍵' }],
      hint: '按住畫面，潛水員會游向你手指。撞到水母同垃圾會受傷。氧氣用完前返上水面。',
      control(id) { if (id === 'up') st.target = { x: st.x, y: 0, hold: true }; },
      key(k, down) { st.keys[k] = down; },
      pointer(type, x, y) {
        if (type === 'down' || (type === 'move' && st.target)) st.target = { x: x + st.cam, y, hold: true };
        if (type === 'up') st.target = null;
      },
      update(dt) {
        st.t += dt;
        if (st.banner) st.banner.t += dt;
        if (st.popup) { st.popup.t += dt; if (st.popup.t > 2) st.popup = null; }
        fx.update(dt);
        hazards.forEach((h) => {
          if (h.type === 'jelly') h.y = h.y0 + Math.sin(st.t * 1.2 + h.ph) * 14;
          else { h.x += h.vx * dt; if (h.x < 40) h.vx = Math.abs(h.vx); if (h.x > WORLD - 10) h.vx = -Math.abs(h.vx); }
        });
        if (st.phase === 'intro' && st.t >= 0) st.phase = 'play';
        if (st.phase !== 'play') {
          if (st.phase === 'end') {
            st.endT += dt;
            if (st.endT > 1.4 && onDone) {
              const cb = onDone; onDone = null;
              cb({ relics: st.got.map((it) => (it.type === 'legacy' ? it.card : it.id)), sold: st.sold, hits: st.hits, drowned: st.drowned });
            }
          }
          return;
        }
        // 移動
        let ax = 0, ay = 0;
        const k = st.keys;
        if (k.ArrowLeft || k.a || k.A) ax -= 1;
        if (k.ArrowRight || k.d || k.D) ax += 1;
        if (k.ArrowUp || k.w || k.W) ay -= 1;
        if (k.ArrowDown || k.s || k.S) ay += 1;
        if (st.target) {
          const dx = st.target.x - st.x, dy = st.target.y - st.y, d = Math.hypot(dx, dy);
          if (d > 3) { ax = dx / d; ay = dy / d; }
        }
        const sp = 78;
        st.vx += (ax * sp - st.vx) * Math.min(1, dt * 4);
        st.vy += (ay * sp - st.vy) * Math.min(1, dt * 4) - (ax === 0 && ay === 0 ? 6 * dt : 0);
        st.x = Math.max(6, Math.min(WORLD - 14, st.x + st.vx * dt));
        st.y = Math.max(10, Math.min(172, st.y + st.vy * dt));
        if (Math.abs(st.vx) > 4) st.face = st.vx > 0 ? 1 : -1;
        if (st.y > 40) st.been = true;
        if (st.been && st.y < SURF) { finish(false); return; }
        st.cam += (Math.max(0, Math.min(WORLD - 320, st.x - 150)) - st.cam) * Math.min(1, dt * 5);
        if (st.y > SURF) {
          st.ox -= dt;
          if (Math.random() < dt * 2) fx.add({ x: st.x + (st.face > 0 ? 10 : 0), y: st.y, vy: -20, vx: rnd(-4, 4), life: 1.5, color: '#bfefff' });
          if (st.ox < cfg.oxygen * 0.25 && Math.floor(st.ox * 2) !== Math.floor((st.ox + dt) * 2)) A.sfx('tick');
        }
        if (st.ox <= 0) { finish(true); return; }
        // 撿嘢
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          if (Math.hypot(it.x - (st.x + 6), it.y - (st.y + 3)) < 10) {
            items.splice(i, 1);
            if (it.type === 'scrap') {
              st.sold += it.v; A.sfx('coin');
              st.popup = { text: '廢料 +$' + it.v, t: 0, color: '#8be28f' };
            } else {
              st.got.push(it); A.sfx('pickup');
              const c = it.type === 'legacy' ? it.card : D().CARDS[it.id];
              st.popup = { text: (it.type === 'legacy' ? '你撈到前世嘅作品：' : '撈到：') + cardName(it), tags: c.tags, t: 0, color: it.type === 'legacy' ? '#c9a6ff' : '#ffc247' };
              fx.burst(it.x, it.y, 10, { color: it.type === 'legacy' ? '#c9a6ff' : '#ffc247', life: 0.8, speed: 30 });
            }
          }
        }
        // 危險
        st.inv = Math.max(0, st.inv - dt);
        if (st.inv <= 0) {
          for (const h of hazards) {
            const hx = h.type === 'jelly' ? h.x + 4 : h.x + h.w / 2, hy = h.type === 'jelly' ? h.y + 4 : h.y + 2;
            if (Math.abs(hx - (st.x + 6)) < (h.type === 'jelly' ? 8 : h.w / 2 + 5) && Math.abs(hy - (st.y + 3)) < 6) {
              st.hits++; st.inv = 1.2; P.view.shake = 5; A.sfx('hurt');
              st.vx = -st.vx * 1.5; st.vy = -30;
              st.popup = { text: '受傷！身體 −6', t: 0, color: '#ff4d5e' };
              break;
            }
          }
        }
      },
      draw(c) {
        const cam = Math.round(st.cam);
        const g = c.createLinearGradient(0, 0, 0, 180);
        g.addColorStop(0, '#1a6f86'); g.addColorStop(0.2, '#0e4a5e'); g.addColorStop(1, '#04161f');
        c.fillStyle = '#0b1622'; c.fillRect(0, 0, 320, SURF);
        c.fillStyle = g; c.fillRect(0, SURF, 320, 180 - SURF);
        // 光線
        c.fillStyle = 'rgba(160,240,255,0.05)';
        for (let i = 0; i < 6; i++) {
          const x = ((i * 90 - cam * 0.3 + st.t * 4) % 380) - 30;
          c.beginPath(); c.moveTo(x, SURF); c.lineTo(x + 20, SURF); c.lineTo(x + 60, 180); c.lineTo(x + 30, 180); c.fill();
        }
        // 舊城廢墟
        RUINS.forEach((r) => {
          const x = r.x - cam * 0.8;
          if (x < -60 || x > 340) return;
          c.fillStyle = '#082531'; c.fillRect(x, 180 - r.h, r.w, r.h);
          c.fillStyle = '#0d3442';
          for (let yy = 180 - r.h + 6; yy < 176; yy += 10) for (let xx = 4; xx < r.w - 4; xx += 8) c.fillRect(x + xx, yy, 4, 5);
        });
        // 沉咗嘅霓虹招牌
        const sx = 300 - cam;
        c.fillStyle = Math.sin(st.t * 5) > 0 ? '#ff4fb4' : '#5a2245'; c.fillRect(sx, 120, 30, 2); c.fillRect(sx, 128, 30, 2);
        // 水面同船
        c.fillStyle = '#37c3d6';
        for (let x = 0; x < 320; x += 2) c.fillRect(x, SURF + Math.round(Math.sin((x + cam) * 0.1 + st.t * 2)), 2, 1);
        c.fillStyle = '#6b4a2e'; c.fillRect(20 - cam, SURF - 5, 34, 5); c.fillStyle = '#8e9bb0'; c.fillRect(30 - cam, SURF - 14, 2, 9);
        // 物件
        items.forEach((it) => {
          const x = Math.round(it.x - cam), y = Math.round(it.y);
          if (x < -10 || x > 330) return;
          if (it.type === 'scrap') {
            c.fillStyle = '#8e9bb0'; c.fillRect(x - 3, y - 2, 6, 4); c.fillStyle = '#5a6478'; c.fillRect(x - 1, y - 1, 2, 2);
          } else {
            const col = it.type === 'legacy' ? '#c9a6ff' : '#ffc247';
            const pulse = 3 + Math.sin(st.t * 4 + it.x) * 1.5;
            c.fillStyle = P.rgba(col, 0.25); c.beginPath(); c.arc(x, y, pulse + 3, 0, Math.PI * 2); c.fill();
            c.fillStyle = col; c.fillRect(x - 2, y - 2, 4, 4);
            c.fillStyle = '#ffffff'; c.fillRect(x - 1, y - 1, 1, 1);
          }
        });
        hazards.forEach((h) => {
          const x = Math.round(h.x - cam);
          if (x < -20 || x > 340) return;
          if (h.type === 'jelly') P.sprite(c, 'jelly', x, Math.round(h.y), { alpha: 0.85 });
          else { c.fillStyle = '#5a4a3a'; c.fillRect(x, Math.round(h.y), h.w, 4); c.fillStyle = '#a0522d'; c.fillRect(x + 2, Math.round(h.y), 2, 1); }
        });
        if (st.inv <= 0 || Math.floor(st.t * 12) % 2 === 0) P.sprite(c, 'diver', Math.round(st.x - cam), Math.round(st.y), { flip: st.face < 0 });
        fx.draw(c);
        // 氧氣
        const frac = Math.max(0, st.ox / cfg.oxygen);
        c.fillStyle = '#0b0f1a'; c.fillRect(0, 0, 320, 12);
        c.fillStyle = '#26334d'; c.fillRect(110, 4, 100, 4);
        c.fillStyle = frac > 0.25 ? '#37c3d6' : (Math.floor(st.t * 4) % 2 ? '#ff4d5e' : '#7a1f2a'); c.fillRect(110, 4, Math.round(100 * frac), 4);
      },
      drawText() {
        P.text('氧氣', 104, 1, { size: 7, align: 'right', color: '#9fd8e6' });
        P.text('遺物 ' + st.got.length + '　$' + st.sold, 6, 1, { size: 7, color: '#ffc247' });
        P.text('受傷 ' + st.hits, 314, 1, { size: 7, align: 'right', color: st.hits ? '#ff8a9a' : '#9fb0d0' });
        if (st.been && st.y < 50 && st.phase === 'play') P.text('↑ 再上啲就出水', 160, 26, { size: 7, align: 'center', color: '#e8fdff' });
        if (st.popup) {
          P.text(st.popup.text, 160, 150, { size: 8, align: 'center', color: st.popup.color, stroke: '#04161f', alpha: Math.min(1, 2 - st.popup.t) });
          if (st.popup.tags) P.text(st.popup.tags.map((t) => '［' + D().TAGS[t].name + '］').join(''), 160, 162, { size: 6, align: 'center', color: '#e8edf6', alpha: Math.min(1, 2 - st.popup.t) });
        }
        drawBanner(st);
      },
    };
  }

  IE.Micro = {
    create(kind, opts, onDone) {
      if (kind === 'label' || kind === 'ot') return Label(Object.assign({ ot: kind === 'ot' }, opts), onDone);
      if (kind === 'alien') return Label({ alien: true }, onDone);
      if (kind === 'smile') return Smile(opts, onDone);
      if (kind === 'dive') return Dive(opts, onDone);
      throw new Error('未知小遊戲：' + kind);
    },
  };
})(window.IE = window.IE || {});
