// 舊城潛水（參考《Dave the Diver》）
//   - 三個深度區：舊街 → 地鐵站 → 舊商場，經樓板的缺口往下游；越深越暗，只看得見頭燈範圍
//   - 魚叉捕魚：沙甸魚成群逃走、霓虹鰻會衝過來咬人、變種石斑要打幾下
//   - 背包有重量上限，越重游得越慢；儲物櫃要停在旁邊撬開
//   - 氧氣就是生命：被咬或碰撞會扣氧氣，用完之前要浮上水面
//   - 良知是負重：靈魂越重，身體越往下沉，越難浮上水面；撬開別人的儲物櫃會讓靈魂變重
(function (IE) {
  'use strict';
  const P = IE.Pixel, A = IE.Audio, C = IE.Micro.C;
  const R = () => IE.Rules, D = () => IE.DATA, G = () => IE.Game;
  const WW = 480, WH = 560, SURF = 24;
  const SLABS = [
    // 舊街地面（地鐵站入口在 200–260）
    { x: 0, y: 196, w: 200, h: 10 }, { x: 260, y: 196, w: 220, h: 10 },
    // 地鐵站月台底（往商場的扶手電梯在 60–112）
    { x: 0, y: 376, w: 60, h: 10 }, { x: 112, y: 376, w: 368, h: 10 },
  ];
  const zoneOf = (y) => (y < 200 ? 0 : y < 380 ? 1 : 2);
  const depthM = (y) => Math.max(0, Math.round((y - SURF) / (WH - SURF) * 180));
  const WATER = [[SURF, '#1f7f96'], [200, '#0c4457'], [380, '#062433'], [WH, '#020b12']];
  function waterAt(y) {
    for (let i = 1; i < WATER.length; i++) {
      if (y <= WATER[i][0]) { const a = WATER[i - 1], b = WATER[i]; return P.mix(a[1], b[1], (y - a[0]) / (b[0] - a[0])); }
    }
    return WATER[WATER.length - 1][1];
  }

  function Dive(opts, onDone) {
    const s = G().state;
    const cfg = R().diveConfig(s);
    const meta = G().meta || {};
    const knownFish = Object.assign({}, meta.log && meta.log.fish, s.log.fish);
    const knownRelic = Object.assign({}, meta.log && meta.log.relics, s.log.relics);
    const fx = P.particles();
    const rnd = (a, b) => a + Math.random() * (b - a);
    const st = {
      t: -1.2, phase: 'intro', banner: null, endT: 0,
      x: 40, y: 12, vx: 0, vy: 0, face: 1, cam: { x: 0, y: 0 },
      ox: cfg.oxygen, been: false, hits: 0, inv: 0, drowned: false, flash: 0,
      bag: [], load: 0, money: 0, fish: { sardine: 0, eel: 0, grouper: 0, jelly: 0 },
      cd: 0, harpoon: null, aim: null, keys: {}, steer: null, popups: [], seenZone: [true, false, false], zoneBanner: null,
      fireHeld: false, upHeld: false, lockerNear: null, lockers: 0,
      sink: Math.min(2, s.soul / D().SOUL_LIMIT), // 靈魂重量造成的下沉力
    };

    // ---------- 擺放物件 ----------
    const items = [];
    const zoneY = [[150, 192], [330, 370], [500, 550]];
    cfg.zones.forEach((z, i) => {
      z.relics.forEach((id) => items.push({ type: 'relic', id, x: rnd(70, 450), y: rnd(zoneY[i][0], zoneY[i][1]) }));
      z.lockers.forEach((l) => items.push({ type: 'locker', l, x: rnd(130, 440), y: zoneY[i][1] - 10, prog: 0, open: false }));
    });
    if (cfg.legacy) items.push({ type: 'legacy', card: cfg.legacy, x: rnd(400, 460), y: rnd(530, 550) });
    cfg.scrap.forEach((v, i) => items.push({ type: 'scrap', v, x: rnd(60, 460), y: i === 0 ? rnd(120, 190) : rnd(300, 370) }));

    const fish = [];
    const schools = [];
    for (let k = 0; k < cfg.fish.sardine; k++) {
      const sc = { cx: rnd(100, 420), cy: rnd(70, 170), vx: rnd(-14, 14) || 8, ph: rnd(0, 6) };
      schools.push(sc);
      const n = 5 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) fish.push({ type: 'sardine', school: sc, ox: rnd(-16, 16), oy: rnd(-8, 8), x: sc.cx, y: sc.cy, vx: 0, vy: 0, hp: 1, flashT: 0 });
    }
    for (let k = 0; k < cfg.fish.eel; k++) {
      const hx = rnd(100, 440), hy = rnd(225, 355);
      fish.push({ type: 'eel', x: hx, y: hy, hx, hy, dir: Math.random() < 0.5 ? -1 : 1, state: 'patrol', t: 0, cool: 1, hp: 2, flashT: 0, stun: 0 });
    }
    for (let k = 0; k < cfg.fish.grouper; k++) {
      fish.push({ type: 'grouper', x: rnd(120, 440), y: rnd(420, 530), vx: rnd(-12, 12) || 8, vy: 0, hp: 4, flashT: 0, flee: 0 });
    }
    for (let k = 0; k < cfg.fish.jelly; k++) {
      const y0 = rnd(220, 540);
      fish.push({ type: 'jelly', x: rnd(60, 450), y: y0, y0, ph: rnd(0, 6), hp: 1, flashT: 0 });
    }
    const debris = [];
    for (let k = 0; k < 2 + Math.floor(s.day / 10); k++) debris.push({ x: rnd(40, 440), y: rnd(230, 540), vx: rnd(-18, 18) || 10, w: 10 + Math.floor(rnd(0, 10)) });

    // 背景裝飾（固定）
    const deco = { bldg: [], pillars: [], shops: [], kelp: [] };
    for (let x = -10; x < WW; x += 50 + Math.floor(Math.random() * 30)) deco.bldg.push({ x, w: 30 + Math.floor(Math.random() * 18), h: 60 + Math.floor(Math.random() * 80) });
    for (let x = 140; x < WW; x += 70) deco.pillars.push(x);
    for (let x = 130; x < WW; x += 84) deco.shops.push({ x, sign: ['大減價', '結業', '全場一折', '租約期滿'][Math.floor(x / 84) % 4] });
    for (let i = 0; i < 14; i++) deco.kelp.push({ x: rnd(0, WW), base: [196, 376, WH][i % 3], h: rnd(14, 34) });

    C.banner(st, '下水', '#37c3d6', s.soul > 10 ? '你的靈魂重 ' + s.soul.toFixed(1) + ' 克，會比平時更快下沉' : '方向鍵游泳，空白鍵或滑鼠點擊發射魚叉');
    A.setMode('city', 70);

    // ---------- 工具 ----------
    const speedMax = () => 82 * (cfg.speedMult || 1) * (1 - 0.35 * st.load / cfg.capacity);
    function popup(text, color, sub) { st.popups.push({ text, sub, color, t: 0 }); if (st.popups.length > 3) st.popups.shift(); }
    function addToBag(entry, w) {
      if (st.load + w > cfg.capacity) return false;
      st.bag.push(entry); st.load += w; return true;
    }
    function collides(x, y, w, h) {
      return SLABS.some((r) => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y);
    }
    function hurt(amount, why) {
      if (st.inv > 0) return;
      amount = Math.round(amount * (cfg.dmgMult || 1));
      st.ox -= amount; st.hits++; st.inv = 1.2; st.flash = 0.35; P.view.shake = 5;
      A.sfx('hurt');
      popup(why + '：氧氣 −' + amount, '#ff4d5e');
    }

    // ---------- 魚叉 ----------
    function autoAim() {
      let best = null, bd = 115;
      fish.forEach((f) => {
        if (f.hp <= 0) return;
        const dx = f.x - (st.x + 6), dy = f.y - (st.y + 3), d = Math.hypot(dx, dy);
        const front = Math.sign(dx) === st.face || Math.abs(dx) < 10;
        const score = d - (front ? 30 : 0);
        if (d < 115 && score < bd) { bd = score; best = f; }
      });
      if (best) return Math.atan2(best.y - (st.y + 3), best.x - (st.x + 6));
      if (Math.hypot(st.vx, st.vy) > 20) return Math.atan2(st.vy, st.vx);
      return st.face > 0 ? 0 : Math.PI;
    }
    function fire(angle) {
      if (st.phase !== 'play' || st.cd > 0 || st.harpoon) return;
      const a = angle == null ? autoAim() : angle;
      st.harpoon = { x: st.x + 6, y: st.y + 3, dx: Math.cos(a), dy: Math.sin(a), dist: 0, state: 'out' };
      st.cd = cfg.harpoon.cd;
      if (Math.cos(a) !== 0) st.face = Math.cos(a) > 0 ? 1 : -1;
      A.sfx('click');
    }
    function catchFish(f) {
      const def = D().FISH[f.type];
      fx.burst(f.x, f.y, 10, { color: f.type === 'eel' ? '#ff4fb4' : f.type === 'jelly' ? '#ff8fd1' : '#bfefff', life: 0.6, speed: 35 });
      if (f.type === 'jelly') {
        if (Math.random() < def.cardChance && addToBag({ kind: 'card', id: def.card }, 1)) relicPopup(def.card);
        else popup('水母散開了', '#ff8fd1');
        return;
      }
      if (!addToBag({ kind: 'fish', type: f.type }, def.weight)) { popup('背包滿了，放走了' + def.name, '#ff8a9a'); return; }
      st.fish[f.type]++; st.money += def.value;
      A.sfx('pickup');
      const isNew = !knownFish[f.type];
      knownFish[f.type] = true;
      popup('抓到' + def.name + '　+$' + def.value, '#bfefff', isNew ? '圖鑑新增！' : null);
      if (def.card && Math.random() < def.cardChance && st.load + 1 <= cfg.capacity) {
        st.bag.push({ kind: 'card', id: def.card }); st.load += 1; relicPopup(def.card);
      }
    }
    function relicPopup(id) {
      const c = D().CARDS[id];
      const isNew = !knownRelic[id];
      knownRelic[id] = true;
      popup('打撈到：' + c.name, '#ffc247', (isNew ? '圖鑑新增！　' : '') + c.tags.map((t) => '［' + D().TAGS[t].name + '］').join(''));
    }

    function finish(drowned) {
      if (st.phase === 'end') return;
      st.phase = 'end'; st.endT = 0; st.drowned = drowned;
      st.harpoon = null;
      if (drowned) {
        const keep = Math.ceil(st.bag.length / 2);
        st.bag = st.bag.slice(0, keep);
        st.money = Math.round(st.money / 2);
        C.banner(st, '氧氣耗盡', '#ff4d5e', '你拚命浮上水面，失去了一半收穫');
        A.sfx('hurt');
      } else { C.banner(st, '浮上水面', '#ffc247'); A.sfx('splash'); }
    }
    const endTick = C.ender(st, () => {
      const fishOut = { sardine: 0, eel: 0, grouper: 0, jelly: st.fish.jelly };
      st.bag.forEach((b) => { if (b.kind === 'fish') fishOut[b.type]++; });
      return {
        relics: st.bag.filter((b) => b.kind === 'card' || b.kind === 'legacy').map((b) => (b.kind === 'legacy' ? b.card : b.id)),
        money: st.money, fish: fishOut, hits: st.hits, drowned: st.drowned, lockers: st.lockers,
      };
    }, onDone);

    // 暗角：用另一張畫布挖出頭燈與發光物的光圈
    const dark = document.createElement('canvas');
    dark.width = 320; dark.height = 180;
    const dctx = dark.getContext('2d');
    function hole(x, y, r) {
      const g = dctx.createRadialGradient(x, y, r * 0.3, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = g; dctx.beginPath(); dctx.arc(x, y, r, 0, Math.PI * 2); dctx.fill();
    }

    return {
      kind: 'dive',
      controls: [{ id: 'fire', label: '魚叉', key: '空白鍵' }, { id: 'up', label: '↑ 上浮', key: '按住' }],
      hint: '電腦：方向鍵或 WASD 游泳，滑鼠點擊向該方向發射魚叉（或按空白鍵自動瞄準）。手機：按住畫面游向手指，按「魚叉」自動瞄準。停在儲物櫃旁邊可以撬開。氧氣用完之前要浮上水面。',
      control(id, down) {
        if (id === 'fire') { st.fireHeld = !!down; if (down) fire(); }
        if (id === 'up') st.upHeld = !!down;
      },
      key(k, down) {
        st.keys[k] = down;
        if ((k === ' ' || k === 'j' || k === 'J' || k === 'k' || k === 'K') ) { st.fireHeld = down; if (down) fire(); }
      },
      pointer(type, x, y, ptype) {
        const wx = x + st.cam.x, wy = y + st.cam.y;
        if (ptype === 'mouse') {
          st.aim = { x: wx, y: wy };
          if (type === 'down') fire(Math.atan2(wy - (st.y + 3), wx - (st.x + 6)));
          return;
        }
        if (type === 'down' || (type === 'move' && st.steer)) st.steer = { x: wx, y: wy };
        if (type === 'up') st.steer = null;
      },
      update(dt) {
        st.t += dt;
        if (st.banner) st.banner.t += dt;
        if (st.zoneBanner) { st.zoneBanner.t += dt; if (st.zoneBanner.t > 2.2) st.zoneBanner = null; }
        st.popups.forEach((p) => { p.t += dt; });
        st.popups = st.popups.filter((p) => p.t < 2.4);
        st.flash = Math.max(0, st.flash - dt);
        fx.update(dt);
        // 魚
        schools.forEach((sc) => {
          sc.cx += sc.vx * dt; sc.cy += Math.sin(st.t + sc.ph) * 6 * dt;
          if (sc.cx < 60 || sc.cx > 440) sc.vx = -sc.vx;
          const d = Math.hypot(sc.cx - st.x, sc.cy - st.y);
          if (d < 60) { sc.cx += (sc.cx - st.x) / d * 30 * dt; sc.cy += (sc.cy - st.y) / d * 20 * dt; }
          sc.cy = Math.max(50, Math.min(185, sc.cy));
        });
        fish.forEach((f) => {
          if (f.hp <= 0) return;
          f.flashT = Math.max(0, f.flashT - dt);
          if (f.type === 'sardine') {
            const sc = f.school;
            const tx = sc.cx + f.ox + Math.sin(st.t * 2 + f.oy) * 4, ty = sc.cy + f.oy;
            f.vx += ((tx - f.x) * 3 - f.vx) * Math.min(1, dt * 3);
            f.vy += ((ty - f.y) * 3 - f.vy) * Math.min(1, dt * 3);
            const dx = f.x - st.x, dy = f.y - st.y, d = Math.hypot(dx, dy);
            if (d < 40) { f.vx += dx / d * 140 * dt; f.vy += dy / d * 140 * dt; }
            f.x += f.vx * dt; f.y = Math.max(40, Math.min(190, f.y + f.vy * dt));
          } else if (f.type === 'eel') {
            f.t += dt; f.cool -= dt; f.stun = Math.max(0, f.stun - dt);
            if (f.stun > 0) return;
            const dx = st.x + 6 - f.x, dy = st.y + 3 - f.y, d = Math.hypot(dx, dy);
            if (f.state === 'patrol') {
              f.x += f.dir * 22 * dt; f.y = f.hy + Math.sin(f.t * 2) * 6;
              if (Math.abs(f.x - f.hx) > 50) f.dir = -Math.sign(f.x - f.hx);
              if (d < 72 && f.cool <= 0 && st.phase === 'play') { f.state = 'charge'; f.t = 0; f.cx = dx / d; f.cy = dy / d; }
            } else if (f.state === 'charge') {
              f.x += f.cx * 100 * dt; f.y += f.cy * 100 * dt; f.dir = Math.sign(f.cx) || f.dir;
              if (d < 9) { hurt(5, '被霓虹鰻咬'); f.state = 'retreat'; f.t = 0; }
              else if (f.t > 1) { f.state = 'retreat'; f.t = 0; }
            } else {
              f.x -= f.cx * 35 * dt; f.y -= f.cy * 35 * dt;
              if (f.t > 1.2) { f.state = 'patrol'; f.cool = 2; f.hx = f.x; f.hy = Math.max(225, Math.min(360, f.y)); }
            }
            f.y = Math.max(214, Math.min(368, f.y));
          } else if (f.type === 'grouper') {
            f.flee = Math.max(0, f.flee - dt);
            f.x += (f.flee > 0 ? 45 * Math.sign(f.vx) : f.vx) * dt;
            f.y += Math.sin(st.t * 0.8 + f.x * 0.01) * 4 * dt;
            if (f.x < 70 || f.x > 450) f.vx = -f.vx;
            if (Math.random() < dt * 0.2) f.vx = -f.vx;
          } else if (f.type === 'jelly') {
            f.y = f.y0 + Math.sin(st.t * 1.1 + f.ph) * 14;
            if (st.phase === 'play' && Math.hypot(f.x + 4 - (st.x + 6), f.y + 4 - (st.y + 3)) < 8) hurt(3, '被水母螫到');
          }
        });
        debris.forEach((d) => {
          d.x += d.vx * dt;
          if (d.x < 10 || d.x > WW - 20) d.vx = -d.vx;
          if (st.phase === 'play' && Math.abs(d.x + d.w / 2 - (st.x + 6)) < d.w / 2 + 5 && Math.abs(d.y + 2 - (st.y + 3)) < 6) hurt(3, '撞到漂浮的碎片');
        });
        if (st.phase === 'intro' && st.t >= 0) st.phase = 'play';
        if (st.phase !== 'play') { endTick(dt); return; }

        // ---------- 潛水員 ----------
        let ax = 0, ay = 0;
        const k = st.keys;
        if (k.ArrowLeft || k.a || k.A) ax -= 1;
        if (k.ArrowRight || k.d || k.D) ax += 1;
        if (k.ArrowUp || k.w || k.W) ay -= 1;
        if (k.ArrowDown || k.s || k.S) ay += 1;
        if (st.upHeld) ay = -1;
        if (st.steer) {
          const dx = st.steer.x - (st.x + 6), dy = st.steer.y - (st.y + 3), d = Math.hypot(dx, dy);
          if (d > 4) { ax = dx / d; ay = dy / d; }
        }
        const len = Math.hypot(ax, ay) || 1;
        const sp = speedMax();
        st.vx += (ax / len * sp * (ax ? 1 : 0) - st.vx) * Math.min(1, dt * 4);
        // 往上游會被靈魂的重量拖慢；不動的時候，輕的人浮起，重的人下沉
        const upDrag = ay < 0 ? 1 - 0.35 * Math.min(1, st.sink) : 1;
        st.vy += (ay / len * sp * upDrag * (ay ? 1 : 0) - st.vy) * Math.min(1, dt * 4) + (ay === 0 && st.y > SURF ? (st.sink * 32 - 6) * dt : 0);
        const nx = Math.max(4, Math.min(WW - 16, st.x + st.vx * dt));
        if (!collides(nx, st.y, 12, 6)) st.x = nx; else st.vx = 0;
        const ny = Math.max(8, Math.min(WH - 10, st.y + st.vy * dt));
        if (!collides(st.x, ny, 12, 6)) st.y = ny; else st.vy = 0;
        if (st.aim) st.face = st.aim.x > st.x + 6 ? 1 : -1;
        else if (Math.abs(st.vx) > 6) st.face = st.vx > 0 ? 1 : -1;
        if (st.y > 60) st.been = true;
        if (st.been && st.y < SURF - 2) { finish(false); endTick(dt); return; }
        const z = zoneOf(st.y + 3);
        if (!st.seenZone[z]) {
          st.seenZone[z] = true;
          const zone = D().DIVE_ZONES[z];
          st.zoneBanner = { text: zone.name, sub: '深度 ' + zone.depth + ' 米', t: 0 };
          A.sfx('bubble');
        }
        // 攝影機
        const tcx = Math.max(0, Math.min(WW - 320, st.x - 154)), tcy = Math.max(0, Math.min(WH - 180, st.y - 84));
        st.cam.x += (tcx - st.cam.x) * Math.min(1, dt * 5);
        st.cam.y += (tcy - st.cam.y) * Math.min(1, dt * 5);
        // 氧氣
        if (st.y > SURF) {
          const before = st.ox;
          st.ox -= dt;
          if (Math.random() < dt * 2) fx.add({ x: st.x + (st.face > 0 ? 10 : 2), y: st.y, vy: -22, vx: rnd(-4, 4), life: 1.5, color: '#bfefff' });
          if (st.ox < cfg.oxygen * 0.3 && Math.floor(st.ox * 2) !== Math.floor(before * 2)) A.sfx('tick');
        }
        if (st.ox <= 0) { finish(true); endTick(dt); return; }
        st.inv = Math.max(0, st.inv - dt);
        // 魚叉
        st.cd = Math.max(0, st.cd - dt);
        if (st.fireHeld && st.cd <= 0 && !st.harpoon) fire();
        const h = st.harpoon;
        if (h) {
          if (h.state === 'out') {
            const step = 320 * dt;
            h.x += h.dx * step; h.y += h.dy * step; h.dist += step;
            for (const f of fish) {
              if (f.hp <= 0) continue;
              const size = f.type === 'grouper' ? 10 : f.type === 'eel' ? 7 : 5;
              const fxp = f.type === 'grouper' ? f.x + 8 : f.type === 'jelly' ? f.x + 4 : f.x;
              const fyp = f.type === 'grouper' ? f.y + 4 : f.type === 'jelly' ? f.y + 4 : f.y;
              if (Math.hypot(fxp - h.x, fyp - h.y) < size) {
                f.hp -= cfg.harpoon.dmg; f.flashT = 0.2;
                if (f.type === 'eel') f.stun = 0.5;
                if (f.type === 'grouper') { f.flee = 1.5; f.vx = Math.sign(f.x - st.x) * 12 || 12; }
                A.sfx(f.hp <= 0 ? 'combo' : 'stamp');
                fx.burst(h.x, h.y, 5, { color: '#ffffff', life: 0.3, speed: 30 });
                if (f.hp <= 0) catchFish(f);
                h.state = 'back';
                break;
              }
            }
            if (h.dist > 105 || collides(h.x, h.y, 1, 1)) h.state = 'back';
          } else {
            const dx = st.x + 6 - h.x, dy = st.y + 3 - h.y, d = Math.hypot(dx, dy);
            if (d < 8) st.harpoon = null;
            else { h.x += dx / d * 380 * dt; h.y += dy / d * 380 * dt; }
          }
        }
        // 撿拾與撬櫃
        st.lockerNear = null;
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          const d = Math.hypot(it.x - (st.x + 6), it.y - (st.y + 3));
          if (it.type === 'locker') {
            if (it.open) continue;
            if (d < 14) {
              st.lockerNear = it;
              if (Math.hypot(st.vx, st.vy) < 45) it.prog += dt / 1.2; else it.prog = Math.max(0, it.prog - dt);
              if (it.prog >= 1) {
                it.open = true; st.money += it.l.money; st.lockers++; A.sfx('pickup');
                if (it.l.card) {
                  if (addToBag({ kind: 'card', id: it.l.card }, 1)) relicPopup(it.l.card);
                  else popup('背包滿了，帶不走櫃裡的東西', '#ff8a9a');
                }
                popup('撬開儲物櫃　+$' + it.l.money, '#8be28f');
                fx.burst(it.x, it.y, 12, { color: '#ffd36b', life: 0.6, speed: 30 });
              }
            } else it.prog = Math.max(0, it.prog - dt * 0.5);
            continue;
          }
          if (d < 10) {
            if (it.type === 'scrap') {
              if (!addToBag({ kind: 'scrap' }, 1)) { if (!it.warned) { popup('背包滿了', '#ff8a9a'); it.warned = true; } continue; }
              items.splice(i, 1); st.money += it.v; A.sfx('coin');
              popup('廢料　+$' + it.v, '#8be28f');
            } else if (it.type === 'relic') {
              if (!addToBag({ kind: 'card', id: it.id }, 1)) { if (!it.warned) { popup('背包滿了', '#ff8a9a'); it.warned = true; } continue; }
              items.splice(i, 1); A.sfx('pickup'); relicPopup(it.id);
              fx.burst(it.x, it.y, 10, { color: '#ffc247', life: 0.8, speed: 30 });
            } else if (it.type === 'legacy') {
              if (!addToBag({ kind: 'legacy', card: it.card }, 1)) { if (!it.warned) { popup('背包滿了', '#ff8a9a'); it.warned = true; } continue; }
              items.splice(i, 1); A.sfx('boom');
              popup('你打撈到前世的作品', '#c9a6ff', it.card.name);
              fx.burst(it.x, it.y, 18, { color: '#c9a6ff', life: 1, speed: 40 });
            }
          }
        }
        endTick(dt);
      },
      draw(c) {
        const cx = Math.round(st.cam.x), cy = Math.round(st.cam.y);
        // 水色
        const g = c.createLinearGradient(0, 0, 0, 180);
        g.addColorStop(0, waterAt(cy)); g.addColorStop(1, waterAt(cy + 180));
        c.fillStyle = g; c.fillRect(0, 0, 320, 180);
        // 水面以上
        if (cy < SURF) {
          c.fillStyle = '#0b1622'; c.fillRect(0, 0, 320, SURF - cy);
          c.fillStyle = '#6b4a2e'; c.fillRect(20 - cx, SURF - cy - 6, 36, 6);
          c.fillStyle = '#8e9bb0'; c.fillRect(32 - cx, SURF - cy - 18, 2, 12);
          c.fillStyle = '#ffd36b'; c.fillRect(33 - cx, SURF - cy - 18, 6, 4);
          c.fillStyle = '#37c3d6';
          for (let x = 0; x < 320; x += 2) c.fillRect(x, SURF - cy + Math.round(Math.sin((x + cx) * 0.1 + st.t * 2)), 2, 1);
        }
        // 淺水光線
        if (cy < 200) {
          c.fillStyle = 'rgba(160,240,255,0.06)';
          for (let i = 0; i < 6; i++) {
            const x = ((i * 90 - cx * 0.3 + st.t * 4) % 380) - 30;
            c.beginPath(); c.moveTo(x, SURF - cy); c.lineTo(x + 20, SURF - cy); c.lineTo(x + 60, 200 - cy); c.lineTo(x + 30, 200 - cy); c.fill();
          }
        }
        // 舊街：倒塌的樓宇
        deco.bldg.forEach((b) => {
          const x = b.x - cx * 0.9, y = 196 - b.h - cy;
          if (x < -60 || x > 330 || y > 180) return;
          c.fillStyle = '#0a3a4a'; c.fillRect(x, y, b.w, b.h);
          c.fillStyle = '#0f4a5c';
          for (let yy = 6; yy < b.h - 4; yy += 10) for (let xx = 4; xx < b.w - 4; xx += 8) c.fillRect(x + xx, y + yy, 4, 5);
        });
        // 沉沒巴士
        if (196 - cy > -10 && 160 - cy < 180) {
          c.fillStyle = '#7a2e16'; c.fillRect(300 - cx, 178 - cy, 60, 18);
          c.fillStyle = '#2a3350'; for (let i = 0; i < 6; i++) c.fillRect(304 - cx + i * 9, 182 - cy, 6, 5);
        }
        // 地鐵站：磚牆與柱
        if (cy + 180 > 200 && cy < 380) {
          c.fillStyle = 'rgba(80,110,130,0.18)';
          for (let y = 206; y < 376; y += 8) for (let x = (y % 16 ? 0 : 8); x < WW; x += 16) { const sx = x - cx, sy = y - cy; if (sx > -16 && sx < 320 && sy > -8 && sy < 180) c.fillRect(sx, sy, 14, 6); }
          deco.pillars.forEach((x) => { c.fillStyle = '#0a2a36'; c.fillRect(x - cx, 206 - cy, 8, 170); });
          c.fillStyle = '#ffd36b'; c.fillRect(0, 372 - cy, 320, 1);
        }
        // 舊商場：店舖
        if (cy + 180 > 380) {
          deco.shops.forEach((sh) => {
            const x = sh.x - cx, y = 470 - cy;
            c.fillStyle = '#071a24'; c.fillRect(x, y, 64, 80);
            c.fillStyle = Math.sin(st.t * 3 + sh.x) > 0.6 ? '#ff4fb4' : '#3a1530'; c.fillRect(x + 6, y + 6, 52, 8);
            c.fillStyle = '#0d2a36'; c.fillRect(x + 8, y + 22, 48, 50);
          });
          // 扶手電梯
          c.fillStyle = '#1b3a46';
          for (let i = 0; i < 12; i++) c.fillRect(60 - cx + i * 4, 386 - cy + i * 7, 6, 3);
        }
        // 樓板
        c.fillStyle = '#1b2f3a';
        SLABS.forEach((r) => c.fillRect(r.x - cx, r.y - cy, r.w, r.h));
        c.fillStyle = '#2d4a58';
        SLABS.forEach((r) => c.fillRect(r.x - cx, r.y - cy, r.w, 1));
        // 海草與電線
        deco.kelp.forEach((k) => {
          const x = k.x - cx, y = k.base - cy;
          if (x < -10 || x > 330 || y < 0 || y - k.h > 180) return;
          c.fillStyle = '#1f6b4a';
          for (let i = 0; i < k.h; i += 2) c.fillRect(Math.round(x + Math.sin(st.t * 1.5 + i * 0.2 + k.x) * (i / 8)), y - i, 2, 2);
        });
        // 物件
        items.forEach((it) => {
          const x = Math.round(it.x - cx), y = Math.round(it.y - cy);
          if (x < -12 || x > 332 || y < -16 || y > 196) return;
          if (it.type === 'scrap') { c.fillStyle = '#8e9bb0'; c.fillRect(x - 3, y - 2, 6, 4); c.fillStyle = '#5a6478'; c.fillRect(x - 1, y - 1, 2, 2); }
          else if (it.type === 'locker') {
            P.sprite(c, it.open ? 'lockerOpen' : 'locker', x - 5, y - 7);
            if (!it.open && it.prog > 0) {
              c.strokeStyle = '#ffd36b'; c.lineWidth = 2;
              c.beginPath(); c.arc(x, y - 12, 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * it.prog); c.stroke();
            }
          } else {
            const col = it.type === 'legacy' ? '#c9a6ff' : '#ffc247';
            const pulse = 3 + Math.sin(st.t * 4 + it.x) * 1.5;
            c.fillStyle = P.rgba(col, 0.25); c.beginPath(); c.arc(x, y, pulse + 3, 0, Math.PI * 2); c.fill();
            c.fillStyle = col; c.fillRect(x - 2, y - 2, 4, 4);
            c.fillStyle = '#ffffff'; c.fillRect(x - 1, y - 1, 1, 1);
          }
        });
        // 魚
        fish.forEach((f) => {
          if (f.hp <= 0) return;
          const x = Math.round(f.x - cx), y = Math.round(f.y - cy);
          if (x < -20 || x > 340 || y < -20 || y > 200) return;
          const white = f.flashT > 0;
          if (f.type === 'sardine') P.sprite(c, 'sardine', x - 3, y - 1, { flip: f.vx > 0, tint: white ? '#ffffff' : undefined });
          else if (f.type === 'grouper') P.sprite(c, 'grouper', x, y, { flip: f.vx > 0, tint: white ? '#ffffff' : undefined });
          else if (f.type === 'jelly') P.sprite(c, 'jelly', x, y, { alpha: 0.85, tint: white ? '#ffffff' : undefined });
          else if (f.type === 'eel') {
            const dir = f.dir || 1;
            for (let i = 0; i < 8; i++) {
              const sx = x - dir * i * 2, sy = y + Math.round(Math.sin(st.t * 10 - i * 0.8) * 1.5);
              c.fillStyle = white ? '#ffffff' : i === 0 ? '#ff8fd1' : i % 2 ? '#ff4fb4' : '#a77bff';
              c.fillRect(sx, sy, 2, 3);
            }
            c.fillStyle = '#ffffff'; c.fillRect(x + (dir > 0 ? 1 : 0), y, 1, 1);
            if (f.state === 'charge') { c.fillStyle = 'rgba(255,79,180,0.35)'; c.fillRect(x - 3, y - 2, 6, 7); }
          }
        });
        debris.forEach((d) => {
          const x = Math.round(d.x - cx), y = Math.round(d.y - cy);
          if (x < -30 || x > 330 || y < -10 || y > 190) return;
          c.fillStyle = '#5a4a3a'; c.fillRect(x, y, d.w, 4); c.fillStyle = '#a0522d'; c.fillRect(x + 2, y, 2, 1);
        });
        // 魚叉
        const h = st.harpoon;
        if (h) {
          c.strokeStyle = '#cfd8ee'; c.lineWidth = 1;
          c.beginPath(); c.moveTo(st.x + 6 - cx, st.y + 3 - cy); c.lineTo(h.x - cx, h.y - cy); c.stroke();
          c.fillStyle = '#ffffff'; c.fillRect(Math.round(h.x - cx) - 1, Math.round(h.y - cy) - 1, 3, 3);
        }
        // 潛水員
        if (st.phase !== 'end' || !st.drowned) {
          if (st.inv <= 0 || Math.floor(st.t * 12) % 2 === 0) P.sprite(c, 'diver', Math.round(st.x - cx), Math.round(st.y - cy), { flip: st.face < 0 });
          // 業石：每 6 克一塊，用繩拖在腳後
          const stones = Math.min(5, Math.ceil(s.soul / 6));
          for (let i = 0; i < stones; i++) {
            const sx = Math.round(st.x - cx + (st.face > 0 ? -3 - i * 3 : 15 + i * 3)), sy = Math.round(st.y - cy + 5 + i + Math.sin(st.t * 3 + i) * 0.8);
            c.fillStyle = s.soul > D().SOUL_LIMIT ? '#8a3b3b' : '#5c5448'; c.fillRect(sx, sy, 3, 3);
            c.fillStyle = '#8a7f70'; c.fillRect(sx, sy, 1, 1);
          }
        }
        fx.draw(c);
        // 黑暗
        const darkness = Math.max(0, Math.min(0.9, (st.y - 150) / 330));
        if (darkness > 0.02) {
          dctx.globalCompositeOperation = 'source-over';
          dctx.clearRect(0, 0, 320, 180);
          dctx.fillStyle = 'rgba(1,4,9,' + darkness + ')';
          dctx.fillRect(0, 0, 320, 180);
          dctx.globalCompositeOperation = 'destination-out';
          hole(st.x + 6 - cx + st.face * 10, st.y + 3 - cy, 58);
          items.forEach((it) => { if (it.type === 'relic' || it.type === 'legacy') hole(it.x - cx, it.y - cy, 12); });
          fish.forEach((f) => { if (f.hp > 0 && (f.type === 'jelly' || f.type === 'eel')) hole(f.x - cx + 4, f.y - cy + 3, 10); });
          c.drawImage(dark, 0, 0);
        }
        // 頂部儀表
        const frac = Math.max(0, st.ox / cfg.oxygen);
        c.fillStyle = '#0b0f1a'; c.fillRect(0, 0, 320, 13);
        c.fillStyle = '#26334d'; c.fillRect(110, 4, 100, 5);
        c.fillStyle = frac > 0.3 ? '#37c3d6' : (Math.floor(st.t * 4) % 2 ? '#ff4d5e' : '#7a1f2a'); c.fillRect(110, 4, Math.round(100 * frac), 5);
        // 背包重量
        c.fillStyle = '#26334d'; c.fillRect(250, 9, 64, 2);
        c.fillStyle = st.load >= cfg.capacity ? '#ff4d5e' : '#ffc247'; c.fillRect(250, 9, Math.round(64 * st.load / cfg.capacity), 2);
        if (st.flash > 0) { c.fillStyle = 'rgba(255,77,94,' + st.flash * 0.4 + ')'; c.fillRect(0, 0, 320, 180); }
        if (frac < 0.25 && st.phase === 'play') { c.strokeStyle = 'rgba(255,77,94,' + (0.4 + 0.4 * Math.sin(st.t * 8)) + ')'; c.lineWidth = 3; c.strokeRect(1, 1, 318, 178); }
        // 滑鼠準星
        if (st.aim && st.phase === 'play') {
          const ax = Math.round(st.aim.x - cx), ay = Math.round(st.aim.y - cy);
          c.fillStyle = 'rgba(255,255,255,0.7)';
          c.fillRect(ax - 4, ay, 3, 1); c.fillRect(ax + 2, ay, 3, 1); c.fillRect(ax, ay - 4, 1, 3); c.fillRect(ax, ay + 2, 1, 3);
        }
      },
      drawText() {
        P.text('氧氣', 104, 1, { size: 7, align: 'right', color: '#9fd8e6' });
        P.text('深度 ' + depthM(st.y) + ' 米・靈魂 ' + s.soul.toFixed(1) + ' 克', 6, 1, { size: 7, color: '#9fd8e6' });
        P.text('背包 ' + st.load + '/' + cfg.capacity, 314, 0, { size: 6, align: 'right', color: st.load >= cfg.capacity ? '#ff8a9a' : '#ffc247' });
        P.text('$ +' + st.money + '　魚 ' + (st.fish.sardine + st.fish.eel + st.fish.grouper), 6, 15, { size: 6, color: '#8be28f' });
        let py = 26;
        st.popups.forEach((p) => {
          const a = Math.min(1, (2.4 - p.t) * 2);
          const y = py;
          py += p.sub ? 22 : 13;
          P.text(p.text, 160, y, { size: 8, align: 'center', color: p.color, stroke: '#04161f', alpha: a, weight: 900 });
          if (p.sub) P.text(p.sub, 160, y + 10, { size: 6, align: 'center', color: '#e8edf6', stroke: '#04161f', alpha: a });
        });
        if (st.zoneBanner) {
          const a = Math.min(1, st.zoneBanner.t * 3, (2.2 - st.zoneBanner.t) * 2);
          P.text(st.zoneBanner.text, 160, 120, { size: 16, align: 'center', weight: 900, color: '#e8fdff', stroke: '#04161f', alpha: a });
          P.text(st.zoneBanner.sub, 160, 142, { size: 7, align: 'center', color: '#9fd8e6', stroke: '#04161f', alpha: a });
        }
        if (st.lockerNear && !st.lockerNear.open) P.text('停下來撬開別人的儲物櫃…（靈魂會變重）', st.lockerNear.x - st.cam.x, st.lockerNear.y - st.cam.y - 26, { size: 6, align: 'center', color: '#ffd36b', stroke: '#04161f' });
        const frac = st.ox / cfg.oxygen;
        if (st.phase === 'play' && frac < 0.35 && st.y > SURF + 10) {
          P.text('↑ 氧氣不足，快浮上水面！', 160, 160, { size: 8, align: 'center', color: '#ff8a9a', weight: 900, stroke: '#04161f', alpha: 0.6 + 0.4 * Math.sin(st.t * 6) });
        } else if (st.been && st.y < 70 && st.phase === 'play') {
          P.text('↑ 再往上就出水', 160, 160, { size: 7, align: 'center', color: '#e8fdff', stroke: '#04161f' });
        }
        if (st.y > 150 && st.y < 215 && st.x > 170 && st.x < 290 && st.phase === 'play' && !st.seenZone[1]) {
          P.text('↓ 地鐵站入口', 230 - st.cam.x, 180 - st.cam.y, { size: 6, align: 'center', color: '#ffd36b', stroke: '#04161f' });
        }
        C.drawBanner(st);
      },
    };
  }

  IE.Micro.register('dive', Dive);
})(window.IE = window.IE || {});
