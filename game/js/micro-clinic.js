// 黑市義體診所：替病人接駁義體線路
//   - 左邊是彩色插頭，右邊是符號插座；上方的接線圖說明哪種顏色接哪個符號（每位病人都不同）
//   - 拖動插頭到插座（或先按插頭、再按插座）；接錯會電到病人，心跳上升，太高病人會逃走
//   - 手越穩（冷靜），拖線時越不會抖；技術 ≥ 50 時插座會顯示顏色提示
//   - 有些病人要求安裝未登記的義體：收費高兩倍半，但靈魂會變重
(function (IE) {
  'use strict';
  const P = IE.Pixel, A = IE.Audio, C = IE.Micro.C;
  const R = () => IE.Rules, D = () => IE.DATA, G = () => IE.Game;
  const COLORS = ['#ff4d5e', '#37c3d6', '#ffc247', '#9be36b', '#c38bff'];
  const SYMS = ['circle', 'tri', 'square', 'cross', 'diamond'];
  const PLUG_X = 104, SOCK_X = 288;
  const SKINS = ['#f2c6a0', '#e0a77a', '#c98d5e', '#8e5b3a', '#f5d6c0'];

  function drawSym(c, kind, x, y, col) {
    c.fillStyle = col;
    if (kind === 'circle') { c.beginPath(); c.arc(x, y, 3.5, 0, Math.PI * 2); c.fill(); }
    else if (kind === 'tri') { c.beginPath(); c.moveTo(x, y - 4); c.lineTo(x + 4, y + 3); c.lineTo(x - 4, y + 3); c.closePath(); c.fill(); }
    else if (kind === 'square') c.fillRect(x - 3, y - 3, 7, 7);
    else if (kind === 'cross') { c.fillRect(x - 4, y - 1, 9, 3); c.fillRect(x - 1, y - 4, 3, 9); }
    else { c.beginPath(); c.moveTo(x, y - 4); c.lineTo(x + 4, y); c.lineTo(x, y + 4); c.lineTo(x - 4, y); c.closePath(); c.fill(); }
  }

  function Clinic(opts, onDone) {
    const s = G().state;
    const cfg = R().clinicConfig(s);
    const fx = P.particles();
    const tremor = 2.8 * Math.max(0.15, 1 - s.attr.calm / 110);
    const st = {
      t: -1.4, phase: 'intro', banner: null, endT: 0,
      mode: 'wait', modeT: 0.3, pt: null, cr: 0, patients: 0, illegal: 0, refused: 0, mistakes: 0,
      bpm: 78, flash: 0, msg: null, sel: null, drag: null, ptr: { x: 0, y: 0 },
    };
    C.banner(st, '開診', '#9be36b', '照接線圖接駁義體');
    A.setMode('work', 96);

    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    function say(text, color) { st.msg = { text, color: color || '#e8edf6', t: 0 }; }
    function nextPatient() {
      const illegal = st.patients + st.refused > 0 && Math.random() < 0.38;
      const list = D().CLINIC_PATIENTS[illegal ? 'illegal' : 'legal'];
      const n = cfg.maxPairs;
      const colors = shuffle([0, 1, 2, 3, 4]).slice(0, n);
      const syms = shuffle(SYMS.slice()).slice(0, n);
      const socks = shuffle(colors.map((_, i) => i));
      const gap = n === 5 ? 24 : 28, top = 50 + (n === 5 ? 0 : 6);
      st.pt = {
        illegal, req: list[Math.floor(Math.random() * list.length)], start: st.t, x: -60,
        skin: SKINS[Math.floor(Math.random() * SKINS.length)], hair: ['#2b2140', '#c9a227', '#8d99b4', '#3b2a1e'][Math.floor(Math.random() * 4)],
        shirt: ['#5a6478', '#37c3d6', '#ff8a5c', '#a77bff'][Math.floor(Math.random() * 4)], chrome: Math.random() < 0.5,
        plugs: colors.map((col, i) => ({ col, sym: syms[i], y: top + i * gap, done: false })),
        socks: socks.map((pi, i) => ({ sym: syms[pi], col: colors[pi], y: top + i * gap, done: false })),
      };
      st.bpm = 78; st.sel = null; st.drag = null;
      st.mode = illegal ? 'offer' : 'wire';
      say(illegal ? '「現金交易，不用登記。」' : '「麻煩你了，醫生。」', illegal ? '#ff8a9a' : '#9fdcff');
    }
    function decide(yes) {
      if (st.phase !== 'play' || st.mode !== 'offer') return;
      if (yes) { st.mode = 'wire'; A.sfx('coin'); say('你戴上手套。沒有人會知道。', '#ff8a9a'); }
      else {
        st.refused++; A.sfx('click'); say('他走向另一間診所。', '#9fdcff');
        st.mode = 'leave'; st.modeT = 0.9;
      }
    }
    const plugAt = (x, y) => (st.pt ? st.pt.plugs.findIndex((p) => !p.done && Math.hypot(x - PLUG_X, y - p.y) < 10) : -1);
    const sockAt = (x, y) => (st.pt ? st.pt.socks.findIndex((k) => !k.done && Math.hypot(x - SOCK_X, y - k.y) < 11) : -1);
    function connect(pi, si) {
      const p = st.pt.plugs[pi], k = st.pt.socks[si];
      st.sel = null; st.drag = null;
      if (p.sym === k.sym) {
        p.done = true; k.done = true; p.to = si;
        A.sfx('good');
        fx.burst(SOCK_X, k.y, 8, { color: COLORS[p.col], life: 0.5, speed: 30 });
        if (st.pt.plugs.every((x) => x.done)) complete();
      } else {
        st.mistakes++; st.bpm += 24; st.flash = 0.3; P.view.shake = 4;
        A.sfx('hurt'); say('接錯了！病人抽搐了一下', '#ff4d5e');
        fx.burst(SOCK_X, k.y, 10, { color: '#ffffff', life: 0.3, speed: 60 });
      }
    }
    function complete() {
      const used = st.t - st.pt.start;
      const pay = (10 + Math.max(0, 8 - used / 2)) * cfg.payMult * (st.pt.illegal ? 2.5 : 1);
      st.cr += pay; st.patients++;
      if (st.pt.illegal) st.illegal++;
      A.sfx(st.pt.illegal ? 'coin' : 'pickup');
      say('手術完成　+$' + Math.round(pay), '#8be28f');
      st.mode = 'leave'; st.modeT = 0.9;
    }
    function finish() {
      if (st.phase === 'end') return;
      st.phase = 'end'; st.endT = 0;
      C.banner(st, '關門', '#ffc247', '完成 ' + st.patients + ' 名病人');
    }
    const endTick = C.ender(st, () => ({ cr: st.cr, patients: st.patients, illegal: st.illegal, mistakes: st.mistakes }), onDone);

    return {
      kind: 'clinic',
      controls: [{ id: 'yes', label: '接單', key: 'Y' }, { id: 'no', label: '拒絕', key: 'N' }],
      hint: '照上方接線圖，把左邊的彩色插頭拖到相應符號的插座（也可以先按插頭，再按插座；鍵盤按 1 至 5 選插頭，再按 1 至 5 選插座）。接錯會令病人心跳上升。有病人要求安裝未登記的義體時，選擇「接單」或「拒絕」。',
      control(id, down) { if (down) decide(id === 'yes'); },
      key(k, down) {
        if (!down) return;
        if (k === 'y' || k === 'Y') decide(true);
        else if (k === 'n' || k === 'N') decide(false);
        else if (k === 'Escape') st.sel = null;
        else if (/^[1-5]$/.test(k) && st.mode === 'wire' && st.phase === 'play') {
          const i = Number(k) - 1;
          if (st.sel == null) { if (st.pt.plugs[i] && !st.pt.plugs[i].done) { st.sel = i; A.sfx('click'); } }
          else if (st.pt.socks[i] && !st.pt.socks[i].done) connect(st.sel, i);
        }
      },
      pointer(type, x, y) {
        st.ptr = { x, y };
        if (st.phase !== 'play') return;
        if (st.mode === 'offer' && type === 'down') {
          if (y >= 112 && y <= 132) { if (x >= 120 && x <= 196) decide(true); else if (x >= 204 && x <= 280) decide(false); }
          return;
        }
        if (st.mode !== 'wire') return;
        if (type === 'down') {
          const pi = plugAt(x, y);
          if (pi >= 0) { st.sel = pi; st.drag = { x0: x, y0: y }; A.sfx('click'); return; }
          const si = sockAt(x, y);
          if (si >= 0 && st.sel != null) connect(st.sel, si);
        } else if (type === 'up' && st.drag) {
          const si = sockAt(x, y);
          const moved = Math.hypot(x - st.drag.x0, y - st.drag.y0) > 6;
          st.drag = null;
          if (si >= 0 && st.sel != null) connect(st.sel, si);
          else if (moved) st.sel = null;
        }
      },
      update(dt) {
        st.t += dt;
        if (st.banner) st.banner.t += dt;
        if (st.msg) { st.msg.t += dt; if (st.msg.t > 2.2) st.msg = null; }
        st.flash = Math.max(0, st.flash - dt);
        fx.update(dt);
        if (st.phase === 'intro' && st.t >= 0) st.phase = 'play';
        if (st.pt) st.pt.x += ((st.mode === 'leave' ? -70 : 12) - st.pt.x) * Math.min(1, dt * 6);
        if (st.phase === 'play') {
          st.modeT -= dt;
          if ((st.mode === 'wait' || st.mode === 'leave') && st.modeT <= 0) nextPatient();
          st.bpm += (78 - st.bpm) * Math.min(1, dt * 0.25);
          if (st.mode === 'wire' && st.bpm >= 170) {
            st.mistakes++; A.sfx('wrong'); say('病人嚇得逃走了', '#ff4d5e');
            st.mode = 'leave'; st.modeT = 0.9;
          }
          if (st.t >= cfg.duration) finish();
        }
        endTick(dt);
      },
      draw(c) {
        c.fillStyle = '#0f1f1c'; c.fillRect(0, 0, 320, 180);
        c.fillStyle = '#132925'; for (let x = 0; x < 320; x += 12) for (let y = 14; y < 180; y += 12) if ((x + y) % 24 === 0) c.fillRect(x, y, 12, 12);
        // 病人
        const pt = st.pt;
        if (pt) {
          c.save(); c.translate(Math.round(pt.x), 22); c.scale(2, 2);
          C.face(c, 0, 0, { skin: pt.skin, hair: pt.hair, shirt: pt.shirt, smile: st.bpm > 120 ? 4 : 8, frown: st.bpm > 120, dead: 0, nod: st.flash > 0 ? 1 : 0 });
          c.restore();
          if (pt.chrome) { c.fillStyle = '#8e9bb0'; c.fillRect(Math.round(pt.x) + 40, 44, 8, 6); c.fillStyle = '#37c3d6'; c.fillRect(Math.round(pt.x) + 42, 46, 3, 2); }
        }
        // 心電圖
        c.fillStyle = '#081210'; c.fillRect(4, 140, 70, 34);
        c.strokeStyle = st.bpm > 130 ? '#ff4d5e' : '#9be36b'; c.lineWidth = 1; c.beginPath();
        const period = 60 / st.bpm;
        for (let i = 0; i <= 66; i++) {
          const tt = st.t - (66 - i) * 0.02;
          const ph = ((tt % period) + period) % period / period;
          const v = ph < 0.08 ? -10 * Math.sin(ph / 0.08 * Math.PI) : ph < 0.14 ? 4 * Math.sin((ph - 0.08) / 0.06 * Math.PI) : 0;
          if (i === 0) c.moveTo(6 + i, 160 + v); else c.lineTo(6 + i, 160 + v);
        }
        c.stroke();
        // 面板
        c.fillStyle = '#1b2330'; c.fillRect(80, 16, 236, 160);
        c.fillStyle = '#26334d'; c.fillRect(80, 16, 236, 20);
        if (pt && st.mode !== 'offer') {
          pt.plugs.forEach((p, i) => {
            const lx = 120 + i * 39;
            c.fillStyle = COLORS[p.col]; c.fillRect(lx, 22, 7, 7);
            c.fillStyle = '#8d99b4'; c.fillRect(lx + 10, 25, 6, 1);
            drawSym(c, p.sym, lx + 25, 26, '#e8edf6');
          });
          // 已接好的線
          pt.plugs.forEach((p) => {
            if (!p.done) return;
            const k = pt.socks[p.to];
            c.strokeStyle = COLORS[p.col]; c.lineWidth = 2; c.beginPath();
            c.moveTo(PLUG_X, p.y); c.bezierCurveTo(PLUG_X + 70, p.y, SOCK_X - 70, k.y, SOCK_X, k.y); c.stroke();
          });
          // 拖動中的線（手會抖）
          if (st.sel != null) {
            const p = pt.plugs[st.sel];
            const ex = st.drag ? st.ptr.x + Math.sin(st.t * 23) * tremor : PLUG_X + 12, ey = st.drag ? st.ptr.y + Math.cos(st.t * 19) * tremor : p.y;
            c.strokeStyle = COLORS[p.col]; c.lineWidth = 2; c.beginPath();
            c.moveTo(PLUG_X, p.y); c.bezierCurveTo(PLUG_X + 40, p.y, ex - 40, ey, ex, ey); c.stroke();
            c.fillStyle = '#ffffff'; c.fillRect(Math.round(ex) - 1, Math.round(ey) - 1, 3, 3);
          }
          pt.plugs.forEach((p, i) => {
            c.fillStyle = '#0b0f1a'; c.fillRect(PLUG_X - 10, p.y - 6, 12, 12);
            c.fillStyle = COLORS[p.col]; c.beginPath(); c.arc(PLUG_X, p.y, 5, 0, Math.PI * 2); c.fill();
            if (st.sel === i) { c.strokeStyle = '#ffffff'; c.lineWidth = 1; c.beginPath(); c.arc(PLUG_X, p.y, 8, 0, Math.PI * 2); c.stroke(); }
          });
          pt.socks.forEach((k) => {
            c.fillStyle = '#0b0f1a'; c.beginPath(); c.arc(SOCK_X, k.y, 8, 0, Math.PI * 2); c.fill();
            if (cfg.hint) { c.strokeStyle = P.rgba(COLORS[k.col], 0.7); c.lineWidth = 1; c.beginPath(); c.arc(SOCK_X, k.y, 8, 0, Math.PI * 2); c.stroke(); }
            drawSym(c, k.sym, SOCK_X, k.y, k.done ? '#4a5568' : '#e8edf6');
          });
        }
        if (st.mode === 'offer') {
          c.fillStyle = '#3a1520'; c.fillRect(100, 50, 196, 90);
          c.fillStyle = '#9be36b'; c.fillRect(120, 112, 76, 20);
          c.fillStyle = '#5a6478'; c.fillRect(204, 112, 76, 20);
        }
        fx.draw(c);
        C.topBar(c, 1 - Math.max(0, st.t) / cfg.duration, '#9be36b');
        if (st.flash > 0) { c.fillStyle = 'rgba(255,255,255,' + st.flash * 0.6 + ')'; c.fillRect(80, 16, 236, 160); }
      },
      drawText() {
        P.text('$ +' + Math.round(st.cr), 6, 1, { size: 9, font: 'num', color: '#8be28f', weight: 400 });
        P.text('病人 ' + st.patients + '　未登記 ' + st.illegal, 314, 1, { size: 7, color: '#9be36b', align: 'right' });
        P.text('心跳 ' + Math.round(st.bpm), 39, 143, { size: 5.5, align: 'center', color: st.bpm > 130 ? '#ff4d5e' : '#9be36b', weight: 900 });
        const pt = st.pt;
        if (pt) P.text(P.wrap(pt.req, 7), 39, 96, { size: 6, align: 'center', color: pt.illegal ? '#ff8a9a' : '#e8edf6', weight: 900, lineHeight: 1.3 });
        if (pt && st.mode !== 'offer') {
          P.text('接線圖', 84, 25, { size: 5, color: '#8d99b4', weight: 900 });
          pt.plugs.forEach((p, i) => {
            P.text(String(i + 1), PLUG_X - 16, p.y - 4, { size: 6, color: '#8d99b4', align: 'center', font: 'num', weight: 400 });
          });
          pt.socks.forEach((k, i) => P.text(String(i + 1), SOCK_X + 16, k.y - 4, { size: 6, color: '#8d99b4', align: 'center', font: 'num', weight: 400 }));
        }
        if (st.mode === 'offer' && pt) {
          P.text('病人要求：', 198, 58, { size: 7, align: 'center', color: '#ff8a9a', weight: 900 });
          P.text(pt.req, 198, 72, { size: 7, align: 'center', color: '#ffffff', weight: 900 });
          P.text('收費 ×2.5，不留紀錄。', 198, 90, { size: 6, align: 'center', color: '#ffc247', weight: 700 });
          P.text('接單 Y', 158, 117, { size: 7, align: 'center', color: '#0b0f1a', weight: 900 });
          P.text('拒絕 N', 242, 117, { size: 7, align: 'center', color: '#ffffff', weight: 900 });
        }
        if (st.msg) P.text(st.msg.text, 198, 164, { size: 6.5, align: 'center', color: st.msg.color, weight: 900, stroke: '#0f1f1c', alpha: Math.max(0, 1 - Math.max(0, st.msg.t - 1.6) / 0.6) });
        P.text('義體診所（無牌）', 39, 16, { size: 5, align: 'center', color: '#9be36b', weight: 900 });
        C.drawBanner(st);
      },
    };
  }

  IE.Micro.register('clinic', Clinic);
})(window.IE = window.IE || {});
