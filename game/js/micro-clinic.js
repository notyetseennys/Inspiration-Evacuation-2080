// 黑市義體診所：替病人接駁義體線路
//   - 左邊是彩色插頭，右邊是符號插座；上方的接線圖說明哪種顏色接哪個符號（每位病人都不同）
//   - 可開啟「雙床急診 ×2.2」一次處理兩名病人，報酬翻倍但跨床接錯會同時電傷病人
//   - 五輪模式中途（40%–70%）出現配藥短缺：藥只夠一半病人，頭上顯示保險等級，左下角出現「自己那份藥」
//   - 有些病人要求安裝未登記的義體：收費高兩倍半，但靈魂會變重
(function (IE) {
  'use strict';
  const P = IE.Pixel, A = IE.Audio, C = IE.Micro.C;
  const R = () => IE.Rules, D = () => IE.DATA, G = () => IE.Game;
  const COLORS = ['#ff4d5e', '#37c3d6', '#ffc247', '#9be36b', '#c38bff'];
  const SYMS = ['circle', 'tri', 'square', 'cross', 'diamond'];
  const PLUG_X = 104, SOCK_X = 288;
  const SKINS = ['#f2c6a0', '#e0a77a', '#c98d5e', '#8e5b3a', '#f5d6c0'];
  const OWN_BOX = { x: 4, y: 92, w: 72, h: 44 };
  const DUAL_CHIP = { x: 84, y: 158, w: 66, h: 14 };
  const DOSE_BOXES = [
    { x: 92, y: 132, w: 62, h: 24 },
    { x: 162, y: 132, w: 62, h: 24 },
  ];
  const TIER_META = {
    gold:   { label: '金級', bg: '#ffd36b', fg: '#0b0f1a', vip: true },
    silver: { label: '銀級', bg: '#dce5f7', fg: '#0b0f1a', vip: true },
    bronze: { label: '銅級', bg: '#d79a66', fg: '#0b0f1a', vip: false },
    none:   { label: '無保', bg: '#4a5568', fg: '#e8edf6', vip: false },
  };

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
    const roundsMode = C.inRounds(s);
    const cfg = R().clinicConfig(s);
    const fx = P.particles();
    const tremor = 2.8 * Math.max(0.15, 1 - s.attr.calm / 110);
    const st = {
      t: -1.4, phase: 'intro', banner: null, endT: 0,
      mode: 'wait', modeT: 0.3, pt: null, cr: 0, patients: 0, illegal: 0, refused: 0, mistakes: 0,
      bpm: 78, flash: 0, msg: null, sel: null, drag: null, ptr: { x: 0, y: 0 },
      firstWired: false, dualWanted: false,
      dilemmaAt: roundsMode ? C.dilemmaAt(s, cfg.duration) : Infinity,
      dilemmaStarted: false, ration: null, stance: null,
    };
    C.banner(st, '開診', '#9be36b', '照接線圖接駁義體');
    A.setMode('work', 96);

    function syncBtns() {
      const inOffer = st.phase === 'play' && st.mode === 'offer';
      const inRation = st.phase === 'play' && st.mode === 'ration';
      const inWire = st.phase === 'play' && !inOffer && !inRation;
      C.syncControls({
        yes: { hidden: !inOffer, label: '接單', key: 'Y' },
        no: { hidden: !inOffer, label: '拒絕', key: 'N' },
        dual: { hidden: !inWire, active: st.dualWanted, label: st.dualWanted ? '雙床急診：開' : '雙床急診 ×2.2', key: 'D' },
        ownmed: { hidden: !(inRation && st.ration && !st.ration.usedOwn), label: '派自己那份藥', key: 'M' },
      });
    }
    if (typeof Promise !== 'undefined') Promise.resolve().then(syncBtns);

    const shuffle = (a) => {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const shuffleRun = (a) => {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(R().rand(s) * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    function say(text, color) { st.msg = { text, color: color || '#e8edf6', t: 0 }; }

    function makeDualPatients() {
      const legalList = D().CLINIC_PATIENTS.legal;
      const colPool = shuffle([0, 1, 2, 3, 4]);
      const symA = shuffle(SYMS.slice()).slice(0, 2);
      const symB = shuffle(SYMS.slice()).slice(0, 2);
      const ordA = shuffle([0, 1]);
      const ordB = shuffle([0, 1]);
      const yA = [54, 78], yB = [116, 140];
      const plugs = [
        { col: colPool[0], sym: symA[0], y: yA[0], bed: 0, done: false },
        { col: colPool[1], sym: symA[1], y: yA[1], bed: 0, done: false },
        { col: colPool[2], sym: symB[0], y: yB[0], bed: 1, done: false },
        { col: colPool[3], sym: symB[1], y: yB[1], bed: 1, done: false },
      ];
      const socks = [
        { sym: symA[ordA[0]], col: colPool[ordA[0]], y: yA[0], bed: 0, done: false },
        { sym: symA[ordA[1]], col: colPool[ordA[1]], y: yA[1], bed: 0, done: false },
        { sym: symB[ordB[0]], col: colPool[2 + ordB[0]], y: yB[0], bed: 1, done: false },
        { sym: symB[ordB[1]], col: colPool[2 + ordB[1]], y: yB[1], bed: 1, done: false },
      ];
      st.pt = {
        dual: true,
        illegal: false,
        req: legalList[Math.floor(Math.random() * legalList.length)],
        reqB: legalList[Math.floor(Math.random() * legalList.length)],
        start: st.t,
        x: -60,
        skin: SKINS[Math.floor(Math.random() * SKINS.length)],
        hair: ['#2b2140', '#c9a227', '#8d99b4', '#3b2a1e'][Math.floor(Math.random() * 4)],
        shirt: ['#5a6478', '#37c3d6', '#ff8a5c', '#a77bff'][Math.floor(Math.random() * 4)],
        skinB: SKINS[Math.floor(Math.random() * SKINS.length)],
        hairB: ['#6b3a1e', '#1e2a3b', '#c9a227', '#8d99b4'][Math.floor(Math.random() * 4)],
        shirtB: ['#9be36b', '#ffc247', '#ff8fb1', '#38c6c0'][Math.floor(Math.random() * 4)],
        chrome: true,
        plugs,
        socks,
      };
      st.bpm = 84; st.sel = null; st.drag = null;
      st.mode = 'wire';
      say('雙床同時開刀：A 床接上排、B 床接下排！', '#ffc247');
      syncBtns();
    }

    function nextPatient() {
      if (st.dualWanted) {
        makeDualPatients();
        return;
      }
      const illegal = st.patients + st.refused > 0 && Math.random() < 0.38;
      const list = D().CLINIC_PATIENTS[illegal ? 'illegal' : 'legal'];
      const n = cfg.maxPairs;
      const colors = shuffle([0, 1, 2, 3, 4]).slice(0, n);
      const syms = shuffle(SYMS.slice()).slice(0, n);
      const socks = shuffle(colors.map((_, i) => i));
      const gap = n === 5 ? 22 : 26, top = 48 + (n === 5 ? 0 : 6);
      st.pt = {
        dual: false,
        illegal, req: list[Math.floor(Math.random() * list.length)], start: st.t, x: -60,
        skin: SKINS[Math.floor(Math.random() * SKINS.length)], hair: ['#2b2140', '#c9a227', '#8d99b4', '#3b2a1e'][Math.floor(Math.random() * 4)],
        shirt: ['#5a6478', '#37c3d6', '#ff8a5c', '#a77bff'][Math.floor(Math.random() * 4)], chrome: Math.random() < 0.5,
        plugs: colors.map((col, i) => ({ col, sym: syms[i], y: top + i * gap, bed: 0, done: false })),
        socks: socks.map((pi, i) => ({ sym: syms[pi], col: colors[pi], y: top + i * gap, bed: 0, done: false })),
      };
      st.bpm = 78; st.sel = null; st.drag = null;
      st.mode = illegal ? 'offer' : 'wire';
      say(illegal ? '「現金交易，不用登記。」' : '「麻煩你了，醫生。」', illegal ? '#ff8a9a' : '#9fdcff');
      syncBtns();
    }

    function startRation() {
      if (st.dilemmaStarted || !roundsMode) return;
      // 若當前病人已接好部分線路，給予相應手工費，避免中斷損失
      if (st.pt && st.mode === 'wire') {
        const doneCnt = st.pt.plugs.filter((p) => p.done).length;
        if (doneCnt > 0) st.cr += doneCnt * 3 * cfg.payMult;
      }
      st.dilemmaStarted = true;
      st.sel = null; st.drag = null;
      const people = C.pickPeople(s, 4, R().rand(s) < 0.65);
      const frontTiers = shuffleRun(['none', 'bronze']);
      const backTiers = shuffleRun(['gold', 'silver']);
      const tiers = [frontTiers[0], frontTiers[1], backTiers[0], backTiers[1]];
      st.ration = {
        left: 10.5,
        total: 10.5,
        doses: [true, true],
        usedOwn: false,
        dragSrc: null, // 'd0' | 'd1' | 'own'
        selSrc: null,
        votes: [],
        doneDelay: 0,
        queue: people.map((p, idx) => ({
          idx,
          person: p,
          name: p.name,
          tier: tiers[idx],
          treated: false,
          byOwn: false,
        })),
      };
      st.mode = 'ration';
      A.sfx('ad');
      say('藥只剩一半（2 格）！按保險派、按排隊派，或把左下角自己那份也派出去', '#ffd36b');
      syncBtns();
    }

    function resolveRation() {
      if (!st.ration) return;
      const rt = st.ration;
      const treatedCnt = rt.queue.filter((q) => q.treated).length;
      if (treatedCnt >= 2) st.patients++;
      st.stance = rt.usedOwn ? 'care' : C.majorityStance(rt.votes);
      st.ration = null;
      st.mode = 'wait';
      st.modeT = 0.25;
      syncBtns();
    }

    function giveDoseTo(qIdx, src) {
      const rt = st.ration;
      if (!rt || st.mode !== 'ration') return false;
      const q = rt.queue[qIdx];
      if (!q || q.treated) return false;
      let useOwn = src === 'own';
      let slotIdx = src === 'd0' ? 0 : src === 'd1' ? 1 : -1;
      if (!useOwn && slotIdx < 0) {
        slotIdx = rt.doses.findIndex((x) => x);
        if (slotIdx < 0) return false;
      }
      if (useOwn) {
        if (rt.usedOwn) return false;
        rt.usedOwn = true;
        q.treated = true;
        q.byOwn = true;
        rt.votes.push('care');
        st.stance = 'care';
        A.sfx('pickup');
        fx.burst(112 + qIdx * 56, 78, 12, { color: '#9be36b', life: 0.6, speed: 34 });
        say('你把自己那份藥派給了' + q.name, '#9be36b');
      } else {
        if (!rt.doses[slotIdx]) return false;
        rt.doses[slotIdx] = false;
        q.treated = true;
        const meta = TIER_META[q.tier];
        const vote = meta.vip ? 'comply' : 'resist';
        rt.votes.push(vote);
        const pay = (meta.vip ? 9 : 6) * cfg.payMult;
        st.cr += pay;
        A.sfx(meta.vip ? 'coin' : 'good');
        fx.burst(112 + qIdx * 56, 78, 9, { color: meta.bg, life: 0.5, speed: 28 });
        say('派藥給' + q.name + '（' + meta.label + '・排 #' + (qIdx + 1) + '）', meta.bg);
      }
      rt.selSrc = null;
      rt.dragSrc = null;
      const remClinic = rt.doses.filter(Boolean).length;
      if (remClinic === 0 && rt.usedOwn) {
        rt.doneDelay = 0.65;
      } else if (remClinic === 0 && !rt.usedOwn) {
        rt.left = Math.min(rt.left, 2.4);
      }
      syncBtns();
      return true;
    }

    function giveOwnToNext() {
      const rt = st.ration;
      if (!rt || rt.usedOwn || st.mode !== 'ration') return false;
      const target = rt.queue.find((q) => !q.treated);
      if (!target) return false;
      return giveDoseTo(target.idx, 'own');
    }

    function toggleDual() {
      if (st.phase !== 'play' || st.mode === 'ration' || st.mode === 'offer') return;
      st.dualWanted = !st.dualWanted;
      A.sfx('click');
      if (st.mode === 'wire' && st.pt && st.pt.plugs.every((p) => !p.done)) {
        nextPatient();
      } else {
        say(st.dualWanted ? '下一輪啟用雙床急診（×2.2）' : '已切回單床模式', '#ffc247');
        syncBtns();
      }
    }

    function decide(yes) {
      if (st.phase !== 'play' || st.mode !== 'offer') return;
      if (yes) { st.mode = 'wire'; A.sfx('coin'); say('你戴上手套。沒有人會知道。', '#ff8a9a'); }
      else {
        st.refused++; A.sfx('click'); say('對方走向另一間診所。', '#9fdcff');
        st.mode = 'leave'; st.modeT = 0.9;
      }
      syncBtns();
    }
    const plugAt = (x, y) => (st.pt ? st.pt.plugs.findIndex((p) => !p.done && Math.hypot(x - PLUG_X, y - p.y) < 10) : -1);
    const sockAt = (x, y) => (st.pt ? st.pt.socks.findIndex((k) => !k.done && Math.hypot(x - SOCK_X, y - k.y) < 11) : -1);
    const queueCardRect = (i) => ({ x: 86 + i * 56, y: 40, w: 52, h: 82 });
    const queueAt = (x, y) => {
      for (let i = 0; i < 4; i++) {
        const r = queueCardRect(i);
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
      }
      return -1;
    };
    const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

    function connect(pi, si) {
      const p = st.pt.plugs[pi], k = st.pt.socks[si];
      st.sel = null; st.drag = null;
      if (p.sym === k.sym && p.bed === k.bed) {
        p.done = true; k.done = true; p.to = si;
        st.firstWired = true;
        A.sfx('good');
        fx.burst(SOCK_X, k.y, 8, { color: COLORS[p.col], life: 0.5, speed: 30 });
        if (st.pt.plugs.every((x) => x.done)) complete();
      } else {
        const wrongBed = p.bed !== k.bed;
        st.mistakes++; st.bpm += wrongBed ? 30 : 24;
        if (!C.reducedMotion()) { st.flash = 0.3; P.view.shake = 4; }
        A.sfx('hurt');
        say(wrongBed ? '派錯床位！兩名病人都受了電擊' : '接錯了！病人抽搐了一下', '#ff4d5e');
        fx.burst(SOCK_X, k.y, 10, { color: '#ffffff', life: 0.3, speed: 60 });
      }
    }
    function complete() {
      const used = st.t - st.pt.start;
      const mult = st.pt.dual ? 2.2 : (st.pt.illegal ? 2.5 : 1);
      const pay = (10 + Math.max(0, 8 - used / 2)) * cfg.payMult * mult;
      st.cr += pay;
      st.patients += st.pt.dual ? 2 : 1;
      if (st.pt.illegal) st.illegal++;
      A.sfx(st.pt.illegal || st.pt.dual ? 'coin' : 'pickup');
      say((st.pt.dual ? '雙床完成' : '手術完成') + '　+' + C.cash(s, Math.round(pay)), '#8be28f');
      st.mode = 'leave'; st.modeT = 0.9;
      syncBtns();
    }
    function finish() {
      if (st.phase === 'end') return;
      if (st.ration) resolveRation();
      if (roundsMode && !st.stance) st.stance = 'comply';
      st.phase = 'end'; st.endT = 0;
      syncBtns();
      C.banner(st, '關門', '#ffc247', '完成 ' + st.patients + ' 名病人');
    }
    const endTick = C.ender(st, () => ({
      cr: st.cr,
      patients: st.patients,
      illegal: st.illegal,
      mistakes: st.mistakes,
      stance: roundsMode
        ? (st.stance || (st.ration ? (st.ration.usedOwn ? 'care' : C.majorityStance(st.ration.votes)) : (st.dilemmaStarted ? 'comply' : null)))
        : null,
    }), onDone);

    return {
      kind: 'clinic', _st: st,
      controls: [
        { id: 'yes', label: '接單', key: 'Y' },
        { id: 'no', label: '拒絕', key: 'N' },
        { id: 'dual', label: '雙床急診 ×2.2', key: 'D' },
        { id: 'ownmed', label: '派自己那份藥', key: 'M' },
      ],
      hint: '照上方接線圖把彩色插頭連到同符號插座；開啟「雙床急診」可一次處理兩人搏高分，但跨床接錯會同時電傷病人。',
      control(id, down) {
        if (!down) return;
        if (id === 'yes') decide(true);
        else if (id === 'no') decide(false);
        else if (id === 'dual') toggleDual();
        else if (id === 'ownmed') giveOwnToNext();
      },
      key(k, down) {
        if (!down) return;
        if (k === 'y' || k === 'Y') decide(true);
        else if (k === 'n' || k === 'N') decide(false);
        else if (k === 'd' || k === 'D') toggleDual();
        else if (k === 'm' || k === 'M') giveOwnToNext();
        else if (k === 'Escape') { st.sel = null; if (st.ration) st.ration.selSrc = null; }
        else if (/^[1-4]$/.test(k) && st.mode === 'ration' && st.phase === 'play' && st.ration) {
          const qi = Number(k) - 1;
          giveDoseTo(qi, st.ration.selSrc);
        } else if (/^[1-5]$/.test(k) && st.mode === 'wire' && st.phase === 'play' && st.pt) {
          const i = Number(k) - 1;
          if (st.sel == null) { if (st.pt.plugs[i] && !st.pt.plugs[i].done) { st.sel = i; A.sfx('click'); } }
          else if (st.pt.socks[i] && !st.pt.socks[i].done) connect(st.sel, i);
        }
      },
      pointer(type, x, y) {
        st.ptr = { x, y };
        if (st.phase !== 'play') return;
        if (st.mode === 'ration' && st.ration) {
          const rt = st.ration;
          if (type === 'down') {
            if (!rt.usedOwn && inRect(x, y, OWN_BOX)) {
              if (rt.selSrc === 'own') { giveOwnToNext(); return; }
              rt.selSrc = 'own';
              rt.dragSrc = 'own';
              A.sfx('click');
              return;
            }
            for (let di = 0; di < DOSE_BOXES.length; di++) {
              if (rt.doses[di] && inRect(x, y, DOSE_BOXES[di])) {
                rt.selSrc = 'd' + di;
                rt.dragSrc = 'd' + di;
                A.sfx('click');
                return;
              }
            }
            const qi = queueAt(x, y);
            if (qi >= 0) giveDoseTo(qi, rt.selSrc);
          } else if (type === 'up' && rt.dragSrc) {
            const qi = queueAt(x, y);
            const src = rt.dragSrc;
            rt.dragSrc = null;
            if (qi >= 0) giveDoseTo(qi, src);
          }
          return;
        }
        if (st.mode === 'offer' && type === 'down') {
          if (y >= 112 && y <= 132) { if (x >= 120 && x <= 196) decide(true); else if (x >= 204 && x <= 280) decide(false); }
          return;
        }
        if (st.mode !== 'wire') return;
        if (type === 'down') {
          if (inRect(x, y, DUAL_CHIP)) { toggleDual(); return; }
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
        if (st.phase === 'intro' && st.t >= 0) { st.phase = 'play'; syncBtns(); }
        if (st.pt && st.mode !== 'ration') st.pt.x += ((st.mode === 'leave' ? -70 : 12) - st.pt.x) * Math.min(1, dt * 6);
        if (st.phase === 'play') {
          if (roundsMode && !st.dilemmaStarted && st.t >= st.dilemmaAt) startRation();
          if (st.mode === 'ration' && st.ration) {
            if (st.ration.doneDelay > 0) {
              st.ration.doneDelay -= dt;
              if (st.ration.doneDelay <= 0) resolveRation();
            } else {
              st.ration.left -= dt;
              if (st.ration.left <= 0) resolveRation();
            }
          } else {
            st.modeT -= dt;
            if ((st.mode === 'wait' || st.mode === 'leave') && st.modeT <= 0) nextPatient();
            st.bpm += ((st.pt && st.pt.dual ? 86 : 78) - st.bpm) * Math.min(1, dt * 0.25);
            if (st.mode === 'wire' && st.bpm >= 170) {
              st.mistakes++; A.sfx('wrong'); say('病人嚇得逃走了', '#ff4d5e');
              st.mode = 'leave'; st.modeT = 0.9;
              syncBtns();
            }
          }
          if (st.t >= cfg.duration) finish();
        }
        endTick(dt);
      },
      draw(c) {
        const rm = C.reducedMotion();
        c.fillStyle = '#0f1f1c'; c.fillRect(0, 0, 320, 180);
        c.fillStyle = '#132925'; for (let x = 0; x < 320; x += 12) for (let y = 14; y < 180; y += 12) if ((x + y) % 24 === 0) c.fillRect(x, y, 12, 12);
        const pt = st.pt;
        // 左欄：配藥短缺時顯示「自己那份藥」角落藥格；一般時顯示病人頭像
        if (st.mode === 'ration' && st.ration) {
          const rt = st.ration;
          c.fillStyle = '#142622'; c.fillRect(4, 24, 72, 62);
          c.strokeStyle = '#37c3d6'; c.lineWidth = 1; c.strokeRect(4.5, 24.5, 71, 61);
          // 畫面左下角落：自己那份藥（新的藥格）
          c.fillStyle = rt.usedOwn ? '#172220' : '#2a1d12';
          c.fillRect(OWN_BOX.x, OWN_BOX.y, OWN_BOX.w, OWN_BOX.h);
          c.strokeStyle = rt.usedOwn ? '#4a5568' : (rt.selSrc === 'own' ? '#ffffff' : '#ffd36b');
          c.lineWidth = rt.selSrc === 'own' ? 2 : 1.5;
          c.strokeRect(OWN_BOX.x + 0.75, OWN_BOX.y + 0.75, OWN_BOX.w - 1.5, OWN_BOX.h - 1.5);
          if (!rt.usedOwn) {
            c.fillStyle = '#9be36b'; c.fillRect(OWN_BOX.x + 6, OWN_BOX.y + 15, 10, 14);
            c.fillStyle = '#ffffff'; c.fillRect(OWN_BOX.x + 9, OWN_BOX.y + 19, 4, 2); c.fillRect(OWN_BOX.x + 10, OWN_BOX.y + 18, 2, 4);
          }
        } else if (pt) {
          if (pt.dual) {
            c.save(); c.translate(6, 26); c.scale(1.15, 1.15);
            C.face(c, 0, 0, { skin: pt.skin, hair: pt.hair, shirt: pt.shirt, smile: st.bpm > 120 ? 4 : 8, frown: st.bpm > 120, dead: 0, nod: 0 });
            c.restore();
            c.save(); c.translate(42, 26); c.scale(1.15, 1.15);
            C.face(c, 0, 0, { skin: pt.skinB, hair: pt.hairB, shirt: pt.shirtB, smile: st.bpm > 120 ? 4 : 8, frown: st.bpm > 120, dead: 0, nod: 0 });
            c.restore();
          } else {
            c.save(); c.translate(Math.round(pt.x), 22); c.scale(2, 2);
            C.face(c, 0, 0, { skin: pt.skin, hair: pt.hair, shirt: pt.shirt, smile: st.bpm > 120 ? 4 : 8, frown: st.bpm > 120, dead: 0, nod: st.flash > 0 && !rm ? 1 : 0 });
            c.restore();
            if (pt.chrome) { c.fillStyle = '#8e9bb0'; c.fillRect(Math.round(pt.x) + 40, 44, 8, 6); c.fillStyle = '#37c3d6'; c.fillRect(Math.round(pt.x) + 42, 46, 3, 2); }
          }
        }
        // 心電圖
        c.fillStyle = '#081210'; c.fillRect(4, 140, 72, 34);
        c.strokeStyle = st.bpm > 130 ? '#ff4d5e' : '#9be36b'; c.lineWidth = 1; c.beginPath();
        const period = 60 / st.bpm;
        const ecgT = rm ? 1 : st.t;
        for (let i = 0; i <= 66; i++) {
          const tt = ecgT - (66 - i) * 0.02;
          const ph = ((tt % period) + period) % period / period;
          const v = ph < 0.08 ? -10 * Math.sin(ph / 0.08 * Math.PI) : ph < 0.14 ? 4 * Math.sin((ph - 0.08) / 0.06 * Math.PI) : 0;
          if (i === 0) c.moveTo(6 + i, 160 + v); else c.lineTo(6 + i, 160 + v);
        }
        c.stroke();
        // 右側主面板
        c.fillStyle = '#1b2330'; c.fillRect(80, 16, 236, 160);
        c.fillStyle = '#26334d'; c.fillRect(80, 16, 236, 20);
        if (st.mode === 'ration' && st.ration) {
          const rt = st.ration;
          // 頂欄倒數條
          c.fillStyle = '#141e30'; c.fillRect(252, 23, 56, 6);
          c.fillStyle = '#ffd36b'; c.fillRect(252, 23, Math.round(56 * Math.max(0, rt.left / rt.total)), 6);
          // 四位排隊病人與頭上保險等級標章
          rt.queue.forEach((q, i) => {
            const box = queueCardRect(i);
            const meta = TIER_META[q.tier];
            c.fillStyle = q.treated ? '#152a22' : '#121926';
            c.fillRect(box.x, box.y, box.w, box.h);
            c.strokeStyle = q.treated ? '#9be36b' : meta.vip ? meta.bg : '#344563';
            c.lineWidth = 1;
            c.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1);
            // 頭上保險等級標章
            c.fillStyle = meta.bg;
            c.fillRect(box.x + 4, box.y + 3, box.w - 8, 11);
            // 病人頭像
            c.save();
            c.translate(box.x + 12, box.y + 17);
            C.face(c, 0, 0, { skin: q.person.skin, hair: q.person.hair, shirt: q.person.shirt, smile: q.treated ? 8 : 4, frown: !q.treated, dead: 0, nod: 0 });
            c.restore();
          });
          // 診所僅剩的 2 格藥（病人數量的一半）
          DOSE_BOXES.forEach((b, di) => {
            const avail = rt.doses[di];
            const sel = rt.selSrc === 'd' + di;
            c.fillStyle = avail ? '#12262e' : '#141923';
            c.fillRect(b.x, b.y, b.w, b.h);
            c.strokeStyle = avail ? (sel ? '#ffffff' : '#37c3d6') : '#344055';
            c.lineWidth = sel ? 2 : 1;
            c.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
            if (avail) {
              c.fillStyle = '#37c3d6'; c.fillRect(b.x + 6, b.y + 5, 9, 14);
              c.fillStyle = '#ffffff'; c.fillRect(b.x + 8, b.y + 10, 5, 2);
            }
          });
          // 拖曳中的藥格連線
          if (rt.dragSrc) {
            const sx = rt.dragSrc === 'own' ? OWN_BOX.x + OWN_BOX.w / 2 : DOSE_BOXES[rt.dragSrc === 'd1' ? 1 : 0].x + 31;
            const sy = rt.dragSrc === 'own' ? OWN_BOX.y + OWN_BOX.h / 2 : DOSE_BOXES[0].y + 12;
            const col = rt.dragSrc === 'own' ? '#ffd36b' : '#37c3d6';
            c.strokeStyle = col; c.lineWidth = 1.5; c.setLineDash([3, 2]);
            c.beginPath(); c.moveTo(sx, sy); c.lineTo(st.ptr.x, st.ptr.y); c.stroke();
            c.setLineDash([]);
            c.fillStyle = col; c.fillRect(Math.round(st.ptr.x) - 5, Math.round(st.ptr.y) - 6, 10, 12);
          }
        } else if (pt && st.mode !== 'offer') {
          const step = pt.plugs.length >= 5 ? 36 : 42;
          pt.plugs.forEach((p, i) => {
            const lx = 118 + i * step;
            c.fillStyle = COLORS[p.col]; c.fillRect(lx, 22, 7, 7);
            c.fillStyle = '#8d99b4'; c.fillRect(lx + 9, 25, 5, 1);
            drawSym(c, p.sym, lx + 21, 26, '#e8edf6');
          });
          if (pt.dual) {
            c.strokeStyle = 'rgba(255,194,71,0.35)'; c.lineWidth = 1; c.setLineDash([4, 3]);
            c.beginPath(); c.moveTo(86, 97); c.lineTo(310, 97); c.stroke();
            c.setLineDash([]);
          }
          // 第一條線視覺引導（十秒學會：不用讀說明也知道拖去哪裏）
          if (!st.firstWired && st.sel == null && pt.plugs[0] && !pt.plugs[0].done) {
            const p0 = pt.plugs[0];
            const k0 = pt.socks.find((k) => !k.done && k.sym === p0.sym && k.bed === p0.bed);
            if (k0) {
              c.strokeStyle = 'rgba(255,255,255,0.32)'; c.lineWidth = 1.5; c.setLineDash([3, 3]);
              c.beginPath(); c.moveTo(PLUG_X, p0.y); c.bezierCurveTo(PLUG_X + 60, p0.y, SOCK_X - 60, k0.y, SOCK_X, k0.y); c.stroke();
              c.setLineDash([]);
            }
          }
          // 已接好的線
          pt.plugs.forEach((p) => {
            if (!p.done) return;
            const k = pt.socks[p.to];
            c.strokeStyle = COLORS[p.col]; c.lineWidth = 2; c.beginPath();
            c.moveTo(PLUG_X, p.y); c.bezierCurveTo(PLUG_X + 70, p.y, SOCK_X - 70, k.y, SOCK_X, k.y); c.stroke();
          });
          // 拖動中的線（手會抖）
          if (st.sel != null && pt.plugs[st.sel]) {
            const p = pt.plugs[st.sel];
            const jitX = rm ? 0 : Math.sin(st.t * 23) * tremor;
            const jitY = rm ? 0 : Math.cos(st.t * 19) * tremor;
            const ex = st.drag ? st.ptr.x + jitX : PLUG_X + 12, ey = st.drag ? st.ptr.y + jitY : p.y;
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
          // 面板左下角雙床切換標籤
          c.fillStyle = st.dualWanted ? '#2b2210' : '#121926';
          c.fillRect(DUAL_CHIP.x, DUAL_CHIP.y, DUAL_CHIP.w, DUAL_CHIP.h);
          c.strokeStyle = st.dualWanted ? '#ffc247' : '#3a4a6b';
          c.lineWidth = 1;
          c.strokeRect(DUAL_CHIP.x + 0.5, DUAL_CHIP.y + 0.5, DUAL_CHIP.w - 1, DUAL_CHIP.h - 1);
        }
        if (st.mode === 'offer') {
          c.fillStyle = '#3a1520'; c.fillRect(100, 50, 196, 90);
          c.fillStyle = '#9be36b'; c.fillRect(120, 112, 76, 20);
          c.fillStyle = '#5a6478'; c.fillRect(204, 112, 76, 20);
        }
        fx.draw(c);
        C.topBar(c, 1 - Math.max(0, st.t) / cfg.duration, st.mode === 'ration' ? '#ffd36b' : '#9be36b');
        if (st.flash > 0 && !rm) { c.fillStyle = 'rgba(255,255,255,' + st.flash * 0.6 + ')'; c.fillRect(80, 16, 236, 160); }
      },
      drawText() {
        P.text('+' + C.cash(s, st.cr), 6, 1, { size: 8.5, font: 'num', color: '#8be28f', weight: 400 });
        P.text('病人 ' + st.patients + '　未登記 ' + st.illegal, 314, 1, { size: 7, color: '#9be36b', align: 'right' });
        P.text('心跳 ' + Math.round(st.bpm), 40, 143, { size: 5.5, align: 'center', color: st.bpm > 130 ? '#ff4d5e' : '#9be36b', weight: 900 });
        const pt = st.pt;
        if (st.mode === 'ration' && st.ration) {
          const rt = st.ration;
          const remClinic = rt.doses.filter(Boolean).length;
          P.text('配藥短缺', 40, 30, { size: 6.5, align: 'center', color: '#ffd36b', weight: 900 });
          P.text('4 名病人排隊\n診所只剩 ' + remClinic + ' 格藥', 40, 44, { size: 5.5, align: 'center', color: '#d5dcef', weight: 700, lineHeight: 1.35 });
          // 左下角落「自己那份藥」文字
          P.text('自己那份藥', OWN_BOX.x + OWN_BOX.w / 2, OWN_BOX.y + 3, { size: 6, align: 'center', color: rt.usedOwn ? '#8d99b4' : '#ffd36b', weight: 900 });
          P.text(rt.usedOwn ? '已派出去' : '拖給病人\n或按 M', OWN_BOX.x + 44, OWN_BOX.y + 15, { size: 5.2, align: 'center', color: rt.usedOwn ? '#6b7a99' : '#ffe7a8', weight: 700, lineHeight: 1.25 });
          // 頂欄標題
          P.text('藥量減半（2 / 4）：點病人派藥，或拖藥格', 84, 21, { size: 5.8, color: '#ffd36b', weight: 900 });
          // 四位排隊病人文字
          rt.queue.forEach((q, i) => {
            const box = queueCardRect(i);
            const meta = TIER_META[q.tier];
            const cx = box.x + box.w / 2;
            P.text(meta.label + '・排#' + (i + 1), cx, box.y + 4, { size: 5.2, align: 'center', color: meta.fg, weight: 900 });
            const shortName = q.name.length > 7 ? q.name.slice(0, 7) : q.name;
            P.text(shortName, cx, box.y + 53, { size: shortName.length > 6 ? 4.7 : 5.3, align: 'center', color: q.person.friend ? '#ffd36b' : '#e8edf6', weight: 900 });
            const stTxt = q.treated ? (q.byOwn ? '自備藥 ✓' : '已派藥 ✓') : '點擊派藥';
            P.text(stTxt, cx, box.y + 66, { size: 5, align: 'center', color: q.treated ? '#9be36b' : '#9fdcff', weight: 700 });
          });
          DOSE_BOXES.forEach((b, di) => {
            const avail = rt.doses[di];
            P.text(avail ? '診所藥 #' + (di + 1) : '已派出', b.x + 36, b.y + 7, { size: 5.5, align: 'center', color: avail ? '#9fdcff' : '#5a6478', weight: 900 });
          });
          P.text('金銀優先／按排隊派', 272, 138, { size: 5, align: 'center', color: '#8d99b4', weight: 700 });
        } else {
          if (pt) {
            if (pt.dual) {
              P.text('雙床急診 ×2.2', 40, 72, { size: 6, align: 'center', color: '#ffc247', weight: 900 });
              P.text('A 床＋B 床\n小心跨床接錯', 40, 84, { size: 5.3, align: 'center', color: '#d5dcef', weight: 700, lineHeight: 1.3 });
            } else {
              P.text(P.wrap(pt.req, 7), 40, 96, { size: 6, align: 'center', color: pt.illegal ? '#ff8a9a' : '#e8edf6', weight: 900, lineHeight: 1.3 });
            }
          }
          if (pt && st.mode !== 'offer') {
            P.text(pt.dual ? 'A/B 接線' : '接線圖', 84, 23, { size: 5, color: '#8d99b4', weight: 900 });
            if (pt.dual) {
              P.text('A 床', 86, 40, { size: 5.2, color: '#9fdcff', weight: 900 });
              P.text('B 床', 86, 102, { size: 5.2, color: '#ffc247', weight: 900 });
            }
            pt.plugs.forEach((p, i) => {
              P.text(String(i + 1), PLUG_X - 16, p.y - 4, { size: 6, color: '#8d99b4', align: 'center', font: 'num', weight: 400 });
            });
            pt.socks.forEach((k, i) => P.text(String(i + 1), SOCK_X + 16, k.y - 4, { size: 6, color: '#8d99b4', align: 'center', font: 'num', weight: 400 }));
            P.text(st.dualWanted ? '雙床 ×2.2：開 [D]' : '雙床 ×2.2 [D]', DUAL_CHIP.x + DUAL_CHIP.w / 2, DUAL_CHIP.y + 3, {
              size: 5, align: 'center', color: st.dualWanted ? '#ffc247' : '#9fb0d0', weight: 900,
            });
            if (!st.firstWired && st.sel == null) {
              P.text('拖左方彩色插頭 → 右方同符號插座', 206, 160, { size: 5.2, align: 'center', color: '#9be36b', weight: 900 });
            }
          }
          if (st.mode === 'offer' && pt) {
            P.text('病人要求：', 198, 58, { size: 7, align: 'center', color: '#ff8a9a', weight: 900 });
            P.text(pt.req, 198, 72, { size: 7, align: 'center', color: '#ffffff', weight: 900 });
            P.text('收費 ×2.5，不留紀錄。', 198, 90, { size: 6, align: 'center', color: '#ffc247', weight: 700 });
            P.text('接單 Y', 158, 117, { size: 7, align: 'center', color: '#0b0f1a', weight: 900 });
            P.text('拒絕 N', 242, 117, { size: 7, align: 'center', color: '#ffffff', weight: 900 });
          }
        }
        if (st.msg) P.text(st.msg.text, 206, 166, { size: 6, align: 'center', color: st.msg.color, weight: 900, stroke: '#0f1f1c', alpha: Math.max(0, 1 - Math.max(0, st.msg.t - 1.6) / 0.6) });
        P.text('義體診所（無牌）', 40, 16, { size: 5, align: 'center', color: '#9be36b', weight: 900 });
        C.drawBanner(st);
      },
    };
  }

  IE.Micro.register('clinic', Clinic);
})(window.IE = window.IE || {});
