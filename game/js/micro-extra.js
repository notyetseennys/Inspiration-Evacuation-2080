// 第五期的三個小遊戲：天台菜園、拆樓打撈、夜市擺地攤。獎勵按表現分級（見 jobs2.js）。
(function (IE) {
  'use strict';
  const P = IE.Pixel, A = IE.Audio, C = IE.Micro.C;
  const J = () => IE.Jobs2, G = () => IE.Game;
  const rect = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };

  // =====================================================================
  // 天台菜園：九塊菜田。缺水要澆、熟了要收、白鴿來了要趕
  // =====================================================================
  function Garden(opts, onDone) {
    const s = G().state;
    const cfg = J().gardenConfig(s);
    const fx = P.particles();
    const plots = [];
    for (let i = 0; i < 9; i++) plots.push({ i, x: 64 + (i % 3) * 66, y: 62 + Math.floor(i / 3) * 34, st: 'empty', t: 0.3 + Math.random() * 1.2, gold: false, mutant: false, pigeon: null });
    const st = { t: -1.2, phase: 'intro', endT: 0, banner: null, harvest: 0, golden: 0, stolen: 0, wilted: 0, watered: 0, mutant: 0, pigeonT: 4, rainT: 7, msg: null };
    C.banner(st, '開工', '#9be36b', '澆水・收成・趕白鴿');
    const say = (text, color) => { st.msg = { text, color: color || '#ffffff', t: 0 }; };
    function tap(i) {
      const p = plots[i];
      if (!p || st.phase !== 'play') return;
      if (p.pigeon && p.pigeon.landed) { p.pigeon = null; A.sfx('click'); fx.burst(p.x + 24, p.y, 8, { color: '#eef1f7', speed: 40, life: 0.6 }); say('白鴿飛走了', '#9fdcff'); return; }
      if (p.st === 'thirsty') { p.st = 'grow'; p.t = 1.6 + Math.random() * 1.6; st.watered++; A.note(1); fx.burst(p.x + 24, p.y + 8, 10, { color: '#37c3d6', speed: 30, life: 0.5 }); return; }
      if (p.st === 'ripe') {
        st.harvest++; if (p.gold) st.golden++; if (p.mutant) st.mutant++;
        A.sfx(p.gold ? 'combo' : 'pickup');
        fx.burst(p.x + 24, p.y + 6, p.gold ? 30 : 12, { color: p.gold ? '#ffd36b' : '#ff6b6b', speed: 50, life: 0.8, up: 30 });
        if (p.gold) say('金色的南瓜！', '#ffd36b');
        p.st = 'empty'; p.t = 0.6 + Math.random(); p.gold = false; p.mutant = false; p.pigeon = null;
      }
    }
    function finish() { if (st.phase === 'end') return; st.phase = 'end'; st.endT = 0; C.banner(st, '收工', '#ffc247', '收成 ' + st.harvest + ' 棵'); }
    const endTick = C.ender(st, () => ({ harvest: st.harvest, golden: st.golden, stolen: st.stolen, wilted: st.wilted, watered: st.watered, mutant: st.mutant }), onDone);
    const KEYS = '123456789';
    return {
      kind: 'garden',
      controls: plots.map((p) => ({ id: 'g' + p.i, label: String(p.i + 1), key: String(p.i + 1) })),
      hint: '菜田出現水滴就按一下澆水；發光的菜按一下收成（拖太久會爛掉）；白鴿落在菜田上就按一下趕走，否則菜會被偷。鍵盤 1 至 9。',
      control(id, down) { if (down) tap(Number(id.slice(1))); },
      key(k, down) { if (down && KEYS.includes(k)) tap(KEYS.indexOf(k)); },
      pointer(type, x, y) { if (type !== 'down') return; plots.forEach((p) => { if (x >= p.x - 4 && x <= p.x + 52 && y >= p.y - 18 && y <= p.y + 26) tap(p.i); }); },
      update(dt) {
        st.t += dt;
        if (st.banner) st.banner.t += dt;
        if (st.msg) { st.msg.t += dt; if (st.msg.t > 1.8) st.msg = null; }
        fx.update(dt);
        if (st.phase === 'intro' && st.t >= 0) st.phase = 'play';
        if (st.phase === 'play') {
          plots.forEach((p) => {
            p.t -= dt * (cfg.heat ? 1.3 : 1);
            if (p.t > 0) return;
            if (p.st === 'empty') { p.st = 'grow'; p.t = 1.4 + Math.random() * 1.6; }
            else if (p.st === 'grow') {
              if (Math.random() < 0.55 && !p.wateredOnce) { p.st = 'thirsty'; p.t = 3; p.wateredOnce = true; }
              else { p.st = 'ripe'; p.t = 4; p.gold = Math.random() < 0.06; }
            } else if (p.st === 'thirsty' || p.st === 'ripe') { st.wilted++; p.st = 'empty'; p.t = 1; p.wateredOnce = false; p.gold = false; p.pigeon = null; A.sfx('wrong'); }
            if (p.st === 'empty') p.wateredOnce = false;
          });
          // 白鴿：飛向熟了的菜，落地之後兩秒就偷走
          st.pigeonT -= dt;
          if (st.pigeonT <= 0) {
            st.pigeonT = (3.2 + Math.random() * 2.4) / cfg.pigeons;
            const ripe = plots.filter((p) => p.st === 'ripe' && !p.pigeon);
            if (ripe.length) { const p = ripe[Math.floor(Math.random() * ripe.length)]; p.pigeon = { t: 0, landed: false, fromX: Math.random() < 0.5 ? -10 : 330 }; }
          }
          plots.forEach((p) => {
            if (!p.pigeon) return;
            p.pigeon.t += dt;
            if (!p.pigeon.landed && p.pigeon.t > 1.1) { p.pigeon.landed = true; p.pigeon.t = 0; A.sfx('ad'); }
            else if (p.pigeon.landed && p.pigeon.t > 2.1) { st.stolen++; p.pigeon = null; p.st = 'empty'; p.t = 1; p.gold = false; say('白鴿偷走了一棵菜', '#ff4d5e'); }
          });
          // 酸雨季：酸雨令一塊田長出怪菜
          if (cfg.acid) {
            st.rainT -= dt;
            if (st.rainT <= 0) { st.rainT = 6 + Math.random() * 4; const g = plots.filter((p) => p.st === 'grow' || p.st === 'ripe'); if (g.length) { g[Math.floor(Math.random() * g.length)].mutant = true; say('酸雨落在菜田上', '#c4e04a'); } }
          }
          if (st.t >= cfg.duration) finish();
        }
        endTick(dt);
      },
      draw(c) {
        const g = c.createLinearGradient(0, 0, 0, 180); g.addColorStop(0, '#ffb38a'); g.addColorStop(1, '#5b6b90');
        c.fillStyle = g; c.fillRect(0, 0, 320, 180);
        for (let i = 0; i < 8; i++) rect(c, i * 42, 30 + (i % 3) * 8, 34, 30, '#3a4562');
        rect(c, 0, 50, 320, 130, '#6b6f80'); rect(c, 0, 50, 320, 3, '#8e9bb0');
        rect(c, 268, 20, 30, 34, '#8e9bb0'); rect(c, 270, 18, 26, 4, '#c9d1dc'); rect(c, 18, 14, 2, 40, '#4a5568'); rect(c, 12, 14, 14, 2, '#4a5568');
        plots.forEach((p) => {
          rect(c, p.x, p.y, 48, 22, '#5a3a22'); rect(c, p.x, p.y, 48, 2, '#8a5a3b');
          for (let k = 0; k < 5; k++) rect(c, p.x + 3 + k * 9, p.y + 8, 6, 1, '#3b2a1e');
          const cx = p.x + 24, cy = p.y + 4;
          if (p.st === 'grow' || p.st === 'thirsty') { rect(c, cx - 1, cy - 6, 2, 8, '#3d8b5a'); rect(c, cx - 5, cy - 6, 4, 3, '#6cc070'); rect(c, cx + 1, cy - 8, 4, 3, '#6cc070'); }
          if (p.st === 'thirsty') { const b = Math.round(Math.sin(st.t * 8) * 2); rect(c, cx + 8, cy - 18 + b, 6, 8, '#37c3d6'); rect(c, cx + 9, cy - 21 + b, 4, 3, '#37c3d6'); }
          if (p.st === 'ripe') {
            const glow = 0.4 + 0.3 * Math.sin(st.t * 6 + p.i);
            c.fillStyle = p.gold ? 'rgba(255,211,107,' + glow + ')' : 'rgba(255,255,255,' + glow * 0.4 + ')'; c.beginPath(); c.arc(cx, cy - 6, 12, 0, Math.PI * 2); c.fill();
            rect(c, cx - 1, cy - 10, 2, 10, '#3d8b5a');
            const col = p.gold ? '#ffd36b' : p.mutant ? '#c4e04a' : '#ff4d5e';
            rect(c, cx - 7, cy - 12, 6, 6, col); rect(c, cx + 1, cy - 14, 6, 6, col); rect(c, cx - 3, cy - 6, 6, 6, col);
            if (p.t < 1.2 && Math.floor(st.t * 8) % 2) rect(c, p.x, p.y - 2, 48, 1, '#ff4d5e');
          }
          if (p.pigeon) {
            const k = p.pigeon.landed ? 1 : Math.min(1, p.pigeon.t / 1.1);
            const px = p.pigeon.fromX + (cx + 12 - p.pigeon.fromX) * k, py = (p.pigeon.landed ? cy - 12 : 10 + (cy - 22) * k) + (p.pigeon.landed ? 0 : Math.sin(st.t * 20) * 2);
            rect(c, px - 4, py, 9, 5, '#eef1f7'); rect(c, px + 3, py - 3, 4, 4, '#eef1f7'); rect(c, px + 7, py - 2, 2, 1, '#ffc247'); rect(c, px + 5, py - 2, 1, 1, '#1b1b28');
            if (!p.pigeon.landed || Math.sin(st.t * 30) > 0) { rect(c, px - 3, py - 3, 5, 3, '#c9d1dc'); }
            if (p.pigeon.landed) { c.fillStyle = 'rgba(255,77,94,0.6)'; c.fillRect(p.x, p.y + 22, 48 * Math.max(0, 1 - p.pigeon.t / 2.1), 2); }
          }
        });
        if (cfg.acid) { c.fillStyle = 'rgba(196,224,74,0.4)'; for (let i = 0; i < 30; i++) c.fillRect((i * 37 + st.t * 40) % 320, (i * 23 + st.t * 160) % 180, 1, 3); }
        P.sprite(c, IE.Chars.spr(s), 20, 140, { scale: 2 });
        fx.draw(c);
        C.topBar(c, Math.max(0, st.t) / cfg.duration, '#9be36b');
      },
      drawText() {
        P.text('收成 ' + st.harvest + (st.golden ? '（金 ' + st.golden + '）' : ''), 6, 1, { size: 8, color: '#9be36b' });
        P.text('被偷 ' + st.stolen + '　爛掉 ' + st.wilted, 314, 1, { size: 7, color: '#ff8fb1', align: 'right' });
        plots.forEach((p) => P.text(String(p.i + 1), p.x + 2, p.y + 13, { size: 6, color: '#c98d5e' }));
        if (st.msg) P.text(st.msg.text, 160, 40, { size: 8, align: 'center', weight: 900, color: st.msg.color, stroke: '#0d1430' });
        C.drawBanner(st);
      },
    };
  }

  // =====================================================================
  // 拆樓打撈：吊臂上的鐵球左右擺動，看準每一層的弱點落錘
  // =====================================================================
  const LOOT = ['v_brick', 'v_safe', 'v_photo', 'v_neon'];
  function Salvage(opts, onDone) {
    const s = G().state;
    const cfg = J().salvageConfig(s);
    const fx = P.particles();
    const st = { t: -1.2, phase: 'intro', endT: 0, banner: null, floors: cfg.floors, broken: 0, perfect: 0, misses: 0, injured: 0, items: [], cr: 0,
      swing: 0, speed: 1.6 * cfg.swing, drop: null, weak: 0, msg: null, debris: [], cool: 0 };
    const BX = 150, BW = 120, FLOOR = 10, BASE = 168;
    const newWeak = () => { st.weak = BX + 10 + Math.random() * (BW - 20); };
    newWeak();
    C.banner(st, '開工', '#ffc247', '看準紅色的弱點落錘');
    const say = (text, color) => { st.msg = { text, color: color || '#ffffff', t: 0 }; };
    const ballX = () => BX + BW / 2 + Math.sin(st.swing) * (BW / 2 + 10);
    function press() {
      if (st.phase !== 'play' || st.drop || st.cool > 0) return;
      st.drop = { x: ballX(), t: 0 };
      A.sfx('click');
    }
    function land() {
      const d = Math.abs(st.drop.x - st.weak);
      const top = BASE - st.floors * FLOOR;
      if (d < 12) {
        const perfect = d < 4;
        st.broken++; st.floors--; st.cr += 6 + (perfect ? 2 : 0);
        if (perfect) st.perfect++;
        P.view.shake = perfect ? 8 : 5;
        A.sfx(perfect ? 'combo' : 'boom');
        fx.burst(st.drop.x, top + 4, perfect ? 30 : 18, { color: '#a8865a', speed: 70, life: 0.9, g: 120 });
        if (Math.random() < (perfect ? 0.6 : 0.3)) {
          const id = Math.random() < 0.06 ? IE.DATA.ANTIQUES[Math.floor(Math.random() * IE.DATA.ANTIQUES.length)] : LOOT[Math.floor(Math.random() * LOOT.length)];
          st.items.push(id); say('牆裡有東西：「' + IE.DATA.CARDS[id].name + '」', '#ffd36b');
        } else say(perfect ? '一錘定音！' : '打穿了', perfect ? '#ffd36b' : '#e8edf6');
        st.speed *= 1.08;
        newWeak();
        if (st.floors <= 0) finish();
      } else {
        st.misses++; A.sfx('wrong'); P.view.shake = 3;
        for (let i = 0; i < 4; i++) st.debris.push({ x: st.drop.x + (Math.random() - 0.5) * 20, y: top, vy: 0, t: 0 });
        if (Math.random() < 0.35) { st.injured++; say('碎石打中了你', '#ff4d5e'); } else say('落空了', '#8d99b4');
      }
      st.drop = null;
      st.cool = 0.55;
    }
    function finish() { if (st.phase === 'end') return; st.phase = 'end'; st.endT = 0; C.banner(st, '收工', '#ffc247', '拆了 ' + st.broken + ' 層'); }
    const endTick = C.ender(st, () => ({ floors: st.broken, perfect: st.perfect, misses: st.misses, injured: st.injured, items: st.items, cr: st.cr }), onDone);
    return {
      kind: 'salvage',
      controls: [{ id: 'drop', label: '落錘', key: '空白鍵' }],
      hint: '鐵球會左右擺動。在它經過紅色弱點的時候按「落錘」：打得越準，越有機會在牆裡找到東西；落空的話，碎石可能打中你。',
      control(id, down) { if (down) press(); },
      key(k, down) { if (down && (k === ' ' || k === 'Enter' || k === 'ArrowDown')) press(); },
      pointer(type) { if (type === 'down') press(); },
      update(dt) {
        st.t += dt;
        if (st.banner) st.banner.t += dt;
        if (st.msg) { st.msg.t += dt; if (st.msg.t > 1.6) st.msg = null; }
        fx.update(dt);
        st.debris.forEach((d) => { d.t += dt; d.vy += 300 * dt; d.y += d.vy * dt; });
        st.debris = st.debris.filter((d) => d.y < 180);
        if (st.phase === 'intro' && st.t >= 0) st.phase = 'play';
        if (st.phase === 'play') {
          st.cool = Math.max(0, st.cool - dt);
          if (!st.drop) st.swing += dt * st.speed;
          else { st.drop.t += dt; if (st.drop.t > 0.3) land(); }
          if (st.t >= cfg.duration) finish();
        }
        endTick(dt);
      },
      draw(c) {
        const g = c.createLinearGradient(0, 0, 0, 180); g.addColorStop(0, '#5b6b90'); g.addColorStop(1, '#c98d5e');
        c.fillStyle = g; c.fillRect(0, 0, 320, 180);
        for (let i = 0; i < 6; i++) rect(c, i * 26, 80 + (i % 2) * 14, 20, 100, '#3a4562');
        rect(c, 0, BASE, 320, 12, '#3b2a1e');
        // 大廈
        for (let f = 0; f < st.floors; f++) {
          const y = BASE - (f + 1) * FLOOR;
          rect(c, BX, y, BW, FLOOR, f % 2 ? '#8e7a6a' : '#9a8676'); rect(c, BX, y, BW, 1, '#6b5a4a');
          for (let w = 0; w < 6; w++) rect(c, BX + 6 + w * 19, y + 3, 8, 5, f === st.floors - 1 ? '#2a2f45' : '#3a3a48');
        }
        // 弱點
        if (st.floors > 0) {
          const top = BASE - st.floors * FLOOR;
          const pulse = Math.floor(st.t * 6) % 2;
          c.strokeStyle = pulse ? '#ff4d5e' : '#ffc247'; c.lineWidth = 1;
          c.beginPath(); c.moveTo(st.weak - 4, top - 1); c.lineTo(st.weak + 4, top + 7); c.moveTo(st.weak + 4, top - 1); c.lineTo(st.weak - 4, top + 7); c.stroke();
        }
        // 吊臂與鐵球
        rect(c, 30, 10, 6, 160, '#ffc247'); rect(c, 30, 10, 270, 5, '#ffc247'); for (let x = 36; x < 300; x += 8) rect(c, x, 11, 2, 3, '#8a6a1f');
        const bx = st.drop ? st.drop.x : ballX();
        const by = st.drop ? 40 + st.drop.t / 0.3 * (BASE - st.floors * FLOOR - 48) : 40;
        c.strokeStyle = '#1b1b28'; c.beginPath(); c.moveTo(bx, 15); c.lineTo(bx, by); c.stroke();
        c.fillStyle = '#2a2f45'; c.beginPath(); c.arc(bx, by + 6, 7, 0, Math.PI * 2); c.fill();
        rect(c, bx - 3, by + 2, 2, 2, '#8e9bb0');
        st.debris.forEach((d) => rect(c, d.x, d.y, 3, 3, '#6b5a4a'));
        P.sprite(c, IE.Chars.spr(s), 70, 144, { scale: 2 });
        rect(c, 66, 140, 24, 5, '#ffc247');
        fx.draw(c);
        C.topBar(c, Math.max(0, st.t) / cfg.duration, '#ffc247');
      },
      drawText() {
        P.text('$ +' + st.cr, 6, 1, { size: 9, font: 'num', color: '#8be28f', weight: 400 });
        P.text('拆了 ' + st.broken + ' 層・一錘定音 ' + st.perfect + '・找到 ' + st.items.length + ' 件', 314, 1, { size: 7, color: '#ffc247', align: 'right' });
        if (st.msg) P.text(st.msg.text, 160, 26, { size: 8, align: 'center', weight: 900, color: st.msg.color, stroke: '#0d1430' });
        C.drawBanner(st);
      },
    };
  }

  // =====================================================================
  // 夜市擺地攤：指針在價錢條上來回擺動，按一下開價；開得太高客人會走
  // =====================================================================
  const GOODS = ['舊城撈上來的黑膠', '一部壞了的菲林相機', '褪色的明信片', '生鏽的打字機', '沒有指針的手錶', '一盒舊硬幣', '缺了一隻耳的公仔', '手寫的食譜'];
  function Haggle(opts, onDone) {
    const s = G().state;
    const cfg = J().haggleConfig(s);
    const st = { t: -1.2, phase: 'intro', endT: 0, banner: null, i: 0, cust: null, needle: 0, dir: 1, speed: 0.9, total: 0, deals: 0, walkaways: 0, lies: 0, exposed: 0, best: 0, msg: null, wait: 0, coins: [] };
    const MAXP = 70;
    C.banner(st, '開檔', '#ff4fb4', '開價太高，客人會走');
    const say = (text, color) => { st.msg = { text, color: color || '#ffffff', t: 0 }; };
    function nextCustomer() {
      if (st.i >= cfg.customers) { finish(); return; }
      st.i++;
      const tourist = cfg.tourists && Math.random() < 0.5;
      const max = Math.round((10 + Math.random() * 30) * (tourist ? 1.5 : 1));
      st.cust = { max, good: GOODS[Math.floor(Math.random() * GOODS.length)], tries: 0, lie: false, sharp: Math.random(), tourist,
        look: { skin: ['#f2c6a0', '#d9a070', '#8a5a3b', '#9be36b'][Math.floor(Math.random() * 4)], hair: ['#2b2140', '#c9a227', '#8d99b4', '#ff8fd1'][Math.floor(Math.random() * 4)], shirt: ['#37c3d6', '#ff8a3c', '#9b8cff', '#eef1f7'][Math.floor(Math.random() * 4)], smile: 6, shades: tourist } };
      st.speed = 0.9 + st.i * 0.12;
      say((tourist ? '外星遊客' : '客人') + '看中了「' + st.cust.good + '」', '#ffd36b');
    }
    const price = () => Math.round(st.needle * MAXP);
    function offer() {
      if (st.phase !== 'play' || !st.cust || st.wait > 0) return;
      const p = price(), c = st.cust;
      const max = c.max * (c.lie ? 1.6 : 1);
      if (c.lie && c.sharp > 0.8) { st.exposed++; st.walkaways++; A.sfx('wrong'); say('「這是浮城製造的！」客人當場拆穿你', '#ff4d5e'); c.look.frown = true; st.wait = 1.2; st.cust = null; return; }
      if (p <= max) {
        st.total += p; st.deals++; st.best = Math.max(st.best, p);
        A.sfx(p >= max * 0.85 ? 'combo' : 'coin');
        for (let k = 0; k < Math.min(10, 2 + p / 6); k++) st.coins.push({ x: 160, y: 96, vx: (Math.random() - 0.5) * 80, vy: -60 - Math.random() * 40, t: 0 });
        say(p >= max * 0.85 ? '成交！賣得剛剛好（$' + p + '）' : '成交：$' + p + (p < max * 0.5 ? '（賣得太便宜了）' : ''), p >= max * 0.85 ? '#ffd36b' : '#8be28f');
        st.wait = 1; st.cust = null;
      } else if (c.tries === 0) {
        c.tries++; c.look.angry = true; st.speed *= 1.3; A.sfx('wrong');
        say('「太貴了吧？」再給你一次機會', '#ff8fb1');
      } else {
        st.walkaways++; A.sfx('wrong'); say('客人掉頭走了', '#ff4d5e'); st.wait = 1; st.cust = null;
      }
    }
    function brag() {
      if (st.phase !== 'play' || !st.cust || st.cust.lie) return;
      st.cust.lie = true; st.lies++; A.sfx('ad');
      say('「這是真正的舊世界古董。」（客人願意出更多，但可能會被拆穿）', '#c38bff');
    }
    function finish() { if (st.phase === 'end') return; st.phase = 'end'; st.endT = 0; C.banner(st, '收檔', '#ffc247', '今晚賺了 $' + st.total); }
    const endTick = C.ender(st, () => ({ total: st.total, deals: st.deals, walkaways: st.walkaways, lies: st.lies, exposed: st.exposed, best: st.best }), onDone);
    return {
      kind: 'haggle',
      controls: [{ id: 'offer', label: '開價', key: '空白鍵' }, { id: 'brag', label: '吹噓', key: 'B' }],
      hint: '指針在價錢條上來回擺動，按「開價」停下。客人心裡有一個價：開得剛好最賺，太高他會不滿，第二次太高就會走。「吹噓」說是真古董，客人願意多付六成，但眼尖的客人會拆穿你，靈魂也會變重。洞察越高，越看得出客人的底價。',
      control(id, down) { if (!down) return; if (id === 'offer') offer(); else brag(); },
      key(k, down) { if (!down) return; if (k === ' ' || k === 'Enter') offer(); if (k === 'b' || k === 'B') brag(); },
      pointer(type, x, y) { if (type === 'down') (y > 150 && x > 230 ? brag() : offer()); },
      update(dt) {
        st.t += dt;
        if (st.banner) st.banner.t += dt;
        if (st.msg) { st.msg.t += dt; if (st.msg.t > 2.2) st.msg = null; }
        st.coins.forEach((c) => { c.t += dt; c.vy += 240 * dt; c.x += c.vx * dt; c.y += c.vy * dt; });
        st.coins = st.coins.filter((c) => c.t < 1.4);
        if (st.phase === 'intro' && st.t >= 0) { st.phase = 'play'; nextCustomer(); }
        if (st.phase === 'play') {
          st.needle += st.dir * st.speed * dt;
          if (st.needle >= 1) { st.needle = 1; st.dir = -1; } if (st.needle <= 0) { st.needle = 0; st.dir = 1; }
          if (st.wait > 0) { st.wait -= dt; if (st.wait <= 0) nextCustomer(); }
        }
        endTick(dt);
      },
      draw(c) {
        rect(c, 0, 0, 320, 180, '#120b24');
        for (let i = 0; i < 14; i++) { const on = Math.sin(st.t * 3 + i) > -0.5; rect(c, 8 + i * 23, 10, 10, 8, on ? ['#ff4fb4', '#ffd36b', '#37c3d6'][i % 3] : '#2a2240'); }
        c.strokeStyle = '#4a3a60'; c.beginPath(); c.moveTo(0, 14); c.lineTo(320, 14); c.stroke();
        // 攤檔
        rect(c, 60, 108, 200, 30, '#8a5a3b'); rect(c, 60, 106, 200, 4, '#c98d5e');
        for (let i = 0; i < 8; i++) rect(c, 70 + i * 23, 98, 14, 9, ['#e8c25a', '#37c3d6', '#c9d1dc', '#ff8fb1', '#9be36b', '#8e9bb0', '#ffd36b', '#c38bff'][i]);
        rect(c, 56, 40, 208, 6, '#d6334a'); for (let i = 0; i < 13; i++) rect(c, 56 + i * 16, 46, 8, 5, i % 2 ? '#d6334a' : '#eef1f7');
        if (st.cust) C.face(c, 146, 58, Object.assign({ nod: Math.sin(st.t * 3) }, st.cust.look));
        P.sprite(c, IE.Chars.spr(s), 24, 100, { scale: 3 });
        // 價錢條
        rect(c, 30, 150, 260, 12, '#1b1b28'); rect(c, 31, 151, 258, 10, '#2a2f45');
        for (let k = 0; k <= 7; k++) rect(c, 31 + k * 258 / 7, 151, 1, 10, '#4a5568');
        // 洞察高的人看得出底價大概在哪裡
        if (st.cust && cfg.insight >= 35) {
          const m = Math.min(1, st.cust.max * (st.cust.lie ? 1.6 : 1) / MAXP), fuzz = Math.max(0.03, 0.25 - cfg.insight / 400);
          c.fillStyle = 'rgba(155,227,107,0.25)'; c.fillRect(31 + 258 * Math.max(0, m - fuzz), 151, 258 * fuzz, 10);
        }
        const nx = 31 + st.needle * 258;
        rect(c, nx - 1, 146, 3, 20, '#ffd36b');
        st.coins.forEach((co) => rect(c, co.x, co.y, 3, 3, '#ffd36b'));
      },
      drawText() {
        P.text('$ +' + st.total, 6, 22, { size: 9, font: 'num', color: '#8be28f', weight: 400 });
        P.text('客人 ' + Math.min(st.i, cfg.customers) + ' / ' + cfg.customers + '　成交 ' + st.deals + '　吹噓 ' + st.lies, 314, 22, { size: 7, color: '#ffc247', align: 'right' });
        P.text('$' + price(), 31 + st.needle * 258, 136, { size: 9, align: 'center', font: 'num', color: '#ffd36b', weight: 400 });
        if (st.cust && st.cust.lie) P.text('（說是真古董）', 160, 96, { size: 6, align: 'center', color: '#c38bff' });
        if (st.msg) P.text(st.msg.text, 160, 30, { size: 7, align: 'center', weight: 900, color: st.msg.color, stroke: '#0d1430' });
        C.drawBanner(st);
      },
    };
  }

  IE.Micro.register('garden', Garden);
  IE.Micro.register('salvage', Salvage);
  IE.Micro.register('haggle', Haggle);
})(window.IE = window.IE || {});
