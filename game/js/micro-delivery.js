// 外送潛水：俯瞰水淹的街道，在限時內從店舖取餐、游到客人的窗口
//   - 同時最多背兩份外賣；越快送到，小費越多；過時仍可送，但客人會給一星
//   - 中央設有「天空區管制近路」：游進去速度加倍，但被巡邏無人機探照燈照到會扣錢
//   - 五輪模式中途（40%–70%）路邊會出現倒下求助的人：繞過去準時送達、把貨拖到水面丟進海裏，或停在旁邊 3 秒照顧對方
//   - 天空區的快艇不會減速：看見「！」就要避開那條水道，被撞會灑湯
(function (IE) {
  'use strict';
  const P = IE.Pixel, A = IE.Audio, C = IE.Micro.C;
  const R = () => IE.Rules, D = () => IE.DATA, G = () => IE.Game;
  const ROWS = [[26, 58], [84, 116], [142, 174]];
  const COLS = [[14, 64], [100, 150], [186, 236], [272, 316]];
  const LANES = [{ axis: 'h', at: 71 }, { axis: 'h', at: 129 }, { axis: 'v', at: 82 }, { axis: 'v', at: 168 }, { axis: 'v', at: 254 }];
  const NAMES = ['金魚樓', '海景閣', '長命大廈', '福來苑', '安居邨', '新天地', '怡心閣', '樂水樓', '永安大廈', '明珠閣', '富貴苑', '浮城中心'];
  const SHOP_AT = [4, 1, 10, 7];
  const SHOP_COL = ['#ffc247', '#ff8a5c', '#9be36b', '#ff4fb4'];
  const CAP = 2;
  // 中央管制區近路（游入時速度 ×2，無人機巡邏）
  const ZONE = { x: 152, y: 54, w: 32, h: 74 };
  // 右下角包裹格（可把包裹直接拖到海面丟棄）
  const CARGO_BOX = { x: 248, y: 148, w: 68, h: 26 };
  const FALLEN_SPOTS = [
    { x: 82, y: 71 },
    { x: 82, y: 129 },
    { x: 254, y: 71 },
    { x: 254, y: 129 },
  ];

  function Delivery(opts, onDone) {
    const s = G().state;
    const roundsMode = C.inRounds(s);
    const cfg = R().deliveryConfig(s);
    const fx = P.particles();
    const rnd = (a, b) => a + Math.random() * (b - a);
    const blds = [];
    ROWS.forEach((r, ri) => COLS.forEach((c, ci) => {
      const b = { x: c[0], y: r[0], w: c[1] - c[0], h: r[1] - r[0], name: NAMES[ri * 4 + ci], i: ri * 4 + ci, docks: [] };
      [[b.x + b.w / 2, b.y - 6], [b.x + b.w / 2, b.y + b.h + 6], [b.x - 6, b.y + b.h / 2], [b.x + b.w + 6, b.y + b.h / 2]]
        .forEach(([x, y]) => { if (y > 17 && y < 177 && x > 5 && x < 315) b.docks.push({ x, y }); });
      b.deco = { tank: Math.random() < 0.6, ac: Math.floor(rnd(1, 4)), laundry: Math.random() < 0.5 };
      blds.push(b);
    }));
    const shops = D().DELIVERY.shops.map((name, i) => {
      const b = blds[SHOP_AT[i]];
      const d = b.docks.reduce((best, k) => (Math.abs(k.y - 100) < Math.abs(best.y - 100) ? k : best), b.docks[0]);
      return { name, b, x: d.x, y: d.y, color: SHOP_COL[i] };
    });
    const st = {
      t: -1.4, phase: 'intro', banner: null, endT: 0,
      x: 82, y: 100, vx: 0, vy: 0, face: 1, keys: {}, steer: null,
      orders: [], nextOrder: 0, oid: 1, cr: 0, deliveries: 0, late: 0, hits: 0, inv: 0, flash: 0,
      dash: 0, dashCd: 0, boats: [], nextBoat: 4, popups: [], stars: 0,
      drone: { x: 168, y: 62, phase: 0, r: 16, cd: 0, alert: 0 },
      dilemmaAt: roundsMode ? C.dilemmaAt(s, cfg.duration) : Infinity,
      dilemmaStarted: false, fallen: null, cargoDrag: null, stanceVotes: [], stance: null,
    };
    const debris = [];
    for (let i = 0; i < 4; i++) {
      const L = LANES[i % LANES.length];
      debris.push({ x: L.axis === 'h' ? rnd(20, 300) : L.at + rnd(-8, 8), y: L.axis === 'h' ? L.at + rnd(-8, 8) : rnd(30, 170),
        vx: L.axis === 'h' ? rnd(-6, 6) : 0, vy: L.axis === 'v' ? rnd(-6, 6) : 0, w: 9, h: 6 });
    }
    C.banner(st, '開工', '#ffc247', '取餐 → 送到亮起的窗口');
    A.setMode('work', 112);

    function popup(text, color, x, y) { st.popups.push({ text, color, x, y, t: 0 }); if (st.popups.length > 4) st.popups.shift(); }
    const inBld = (x, y) => blds.some((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    const blocked = (x, y) => x < 1 || x > 312 || y < 14 || y > 173 || blds.some((b) => x + 6 > b.x && x < b.x + b.w && y + 6 > b.y && y < b.y + b.h);
    const inZone = (x, y) => x + 3 >= ZONE.x && x + 3 <= ZONE.x + ZONE.w && y + 3 >= ZONE.y && y + 3 <= ZONE.y + ZONE.h;
    const inCargoBox = (x, y) => x >= CARGO_BOX.x && x <= CARGO_BOX.x + CARGO_BOX.w && y >= CARGO_BOX.y && y <= CARGO_BOX.y + CARGO_BOX.h;
    const isWaterDrop = (x, y) => y > 15 && y < 174 && x > 4 && x < 316 && !inBld(x, y) && !inCargoBox(x, y);

    function newOrder(asCarry) {
      const shop = shops[Math.floor(Math.random() * shops.length)];
      let b;
      do { b = blds[Math.floor(Math.random() * blds.length)]; } while (b === shop.b || !b.docks.length);
      const d = b.docks[Math.floor(Math.random() * b.docks.length)];
      const dist = Math.hypot(d.x - shop.x, d.y - shop.y);
      const time = Math.round(9 + dist / 22);
      const used = st.orders.map((o) => o.color);
      const color = ['#ffffff', '#5fd4ff', '#ffb3e6', '#b6ff8a', '#ffd36b'].find((c) => !used.includes(c)) || '#ffffff';
      const order = { id: st.oid++, shop, b, x: d.x, y: d.y, t: time, total: time, state: asCarry ? 'carry' : 'wait', color, spilled: 0 };
      st.orders.push(order);
      if (!asCarry) A.sfx('ad');
      return order;
    }

    function spawnDilemma() {
      if (st.dilemmaStarted || !roundsMode) return;
      st.dilemmaStarted = true;
      const useFriend = R().rand(s) < 0.5;
      const person = C.pickPeople(s, 1, useFriend)[0];
      const candidates = FALLEN_SPOTS.filter((p) => Math.hypot(p.x - st.x, p.y - st.y) > 28);
      const pool = candidates.length ? candidates : FALLEN_SPOTS;
      const spot = pool[Math.floor(R().rand(s) * pool.length)];
      st.fallen = {
        x: spot.x,
        y: spot.y,
        person,
        careT: 0,
        resolved: null,
      };
      // 確保玩家手上至少有一件貨，令「繞過準時送達」與「把貨拖到水面」都可即時操作
      if (!st.orders.some((o) => o.state === 'carry')) {
        const waitOrd = st.orders.find((o) => o.state === 'wait');
        if (waitOrd) {
          waitOrd.state = 'carry';
          waitOrd.t = Math.max(waitOrd.t, 12);
        } else {
          newOrder(true);
        }
      }
      popup(person.name + '倒在路邊！', '#ffd36b', spot.x, spot.y - 30);
      A.sfx('ad');
    }

    function dropCargoToSea(x, y) {
      const carried = st.orders.filter((o) => o.state === 'carry');
      if (!carried.length) return false;
      const dropped = carried[0];
      st.orders.splice(st.orders.indexOf(dropped), 1);
      fx.burst(x, y, 14, { color: '#bfefff', life: 0.7, speed: 48 });
      A.sfx('splash');
      popup('把貨丟進海裏了', '#7fe3ff', x, y - 8);
      if (st.dilemmaStarted) {
        st.stanceVotes.push('resist');
        if (st.fallen && !st.fallen.resolved) st.fallen.resolved = 'resist';
        st.stance = C.majorityStance(st.stanceVotes);
      }
      return true;
    }

    function hurt() {
      if (st.inv > 0) return;
      st.hits++; st.inv = 1.3;
      if (!C.reducedMotion()) { st.flash = 0.3; P.view.shake = 5; }
      A.sfx('hurt');
      const carried = st.orders.filter((o) => o.state === 'carry');
      carried.forEach((o) => { o.t -= 4 * cfg.dmgMult; o.spilled++; });
      popup(carried.length ? '湯都灑了！' : '被快艇撞到！', '#ff4d5e', st.x, st.y - 8);
      fx.burst(st.x + 3, st.y + 3, 12, { color: '#bfefff', life: 0.6, speed: 50 });
    }
    function deliver(o) {
      const on = o.t > 0;
      const pay = (on ? 6 + 0.4 * o.t : 3) * cfg.payMult;
      const tip = on && o.t > 8 && !o.spilled ? Math.round((1 + 0.2 * o.t) * cfg.tipMult) : 0;
      st.cr += pay + tip;
      st.orders.splice(st.orders.indexOf(o), 1);
      st.deliveries++;
      if (!on) st.late++;
      if (st.dilemmaStarted && on && (!st.fallen || st.fallen.resolved !== 'care')) {
        st.stanceVotes.push('comply');
      }
      const lines = on ? D().DELIVERY.good : D().DELIVERY.late;
      popup((on ? '+' + C.cash(s, Math.round(pay + tip)) + '　' : '') + lines[Math.floor(Math.random() * lines.length)], on ? '#8be28f' : '#ff8a9a', o.x, o.y - 10);
      A.sfx(on ? 'coin' : 'wrong');
      if (on) { st.stars++; fx.burst(o.x, o.y, 10, { color: '#ffc247', life: 0.7, speed: 40, up: 20 }); }
    }
    function finish() {
      if (st.phase === 'end') return;
      st.phase = 'end'; st.endT = 0; st.cargoDrag = null; st.steer = null;
      // 還在背包裏的外賣，全部變冷
      st.orders.filter((o) => o.state === 'carry').forEach(() => { st.late++; st.deliveries++; st.cr += 2 * cfg.payMult; });
      if (roundsMode) {
        if (st.fallen && st.fallen.resolved === 'care') st.stance = 'care';
        else st.stance = C.majorityStance(st.stanceVotes);
      }
      C.banner(st, '收工', '#ffc247', '送出 ' + st.deliveries + ' 單');
    }
    const endTick = C.ender(st, () => ({
      cr: st.cr,
      deliveries: st.deliveries,
      late: st.late,
      hits: st.hits,
      stance: roundsMode
        ? (st.stance || (st.dilemmaStarted ? (st.fallen && st.fallen.resolved === 'care' ? 'care' : C.majorityStance(st.stanceVotes)) : null))
        : null,
    }), onDone);
    function dash() {
      if (st.phase !== 'play' || st.dashCd > 0) return;
      st.dash = 0.5; st.dashCd = 2.5; A.sfx('bubble');
      for (let i = 0; i < 6; i++) fx.add({ x: st.x + 3, y: st.y + 3, vx: -st.vx * 0.4 + rnd(-10, 10), vy: -st.vy * 0.4 + rnd(-10, 10), life: 0.5, color: '#bfefff' });
    }
    const UP = ['ArrowUp', 'w', 'W'], DN = ['ArrowDown', 's', 'S'], LF = ['ArrowLeft', 'a', 'A'], RT = ['ArrowRight', 'd', 'D'];
    const held = (list) => list.some((k) => st.keys[k]);

    // 計算身邊指南針目標（十秒學會：不用讀說明也知道游去哪裏）
    function guideTarget() {
      const carry = st.orders.filter((o) => o.state === 'carry');
      if (carry.length) {
        return carry.reduce((best, o) => (o.t < best.t ? o : best), carry[0]);
      }
      const wait = st.orders.filter((o) => o.state === 'wait');
      if (wait.length) {
        const w = wait.reduce((best, o) => (Math.hypot(o.shop.x - st.x, o.shop.y - st.y) < Math.hypot(best.shop.x - st.x, best.shop.y - st.y) ? o : best), wait[0]);
        return { x: w.shop.x, y: w.shop.y, color: w.shop.color };
      }
      return null;
    }

    return {
      kind: 'delivery', _st: st,
      controls: [{ id: 'dash', label: '衝刺', key: '空白鍵' }],
      hint: '方向鍵或 WASD 游泳（手機：按住畫面游向手指）。穿過中央管制區可快一倍，但被無人機探照燈照到會扣錢；看見「！」要避開快艇水道。',
      control(id, down) { if (id === 'dash' && down) dash(); },
      key(k, down) {
        st.keys[k] = down;
        if (k === ' ' && down) dash();
      },
      pointer(type, x, y) {
        const hasCarry = st.orders.some((o) => o.state === 'carry');
        if (type === 'down') {
          const nearBag = st.dilemmaStarted && hasCarry && Math.hypot(x - (st.x + 3), y - (st.y + 3)) < 13;
          if (hasCarry && (inCargoBox(x, y) || nearBag)) {
            st.cargoDrag = { x0: x, y0: y, x, y };
            st.steer = null;
            A.sfx('click');
            return;
          }
          st.steer = { x, y };
        } else if (type === 'move') {
          if (st.cargoDrag) st.cargoDrag.x = x, st.cargoDrag.y = y;
          else if (st.steer) st.steer = { x, y };
        } else if (type === 'up') {
          if (st.cargoDrag) {
            const moved = Math.hypot(x - st.cargoDrag.x0, y - st.cargoDrag.y0) > 8;
            st.cargoDrag = null;
            if (moved && isWaterDrop(x, y)) dropCargoToSea(x, y);
            return;
          }
          st.steer = null;
        }
      },
      update(dt) {
        st.t += dt;
        if (st.banner) st.banner.t += dt;
        st.popups.forEach((p) => { p.t += dt; });
        st.popups = st.popups.filter((p) => p.t < 1.6);
        st.flash = Math.max(0, st.flash - dt);
        st.inv = Math.max(0, st.inv - dt);
        st.dash = Math.max(0, st.dash - dt);
        st.dashCd = Math.max(0, st.dashCd - dt);
        st.drone.cd = Math.max(0, st.drone.cd - dt);
        st.drone.alert = Math.max(0, st.drone.alert - dt);
        fx.update(dt);
        if (st.phase === 'intro' && st.t >= 0) { st.phase = 'play'; newOrder(); newOrder(); st.nextOrder = 5; }
        // 垃圾
        debris.forEach((d) => {
          d.x += d.vx * dt; d.y += d.vy * dt;
          if (d.x < 4 || d.x > 306) d.vx = -d.vx;
          if (d.y < 18 || d.y > 168) d.vy = -d.vy;
        });
        if (st.phase === 'play') {
          if (roundsMode && !st.dilemmaStarted && st.t >= st.dilemmaAt) spawnDilemma();
          // 巡邏無人機（在中央管制區上下巡航）
          st.drone.phase += dt * 1.55;
          st.drone.x = ZONE.x + ZONE.w / 2 + Math.sin(st.drone.phase * 1.7) * 8;
          st.drone.y = ZONE.y + 12 + (0.5 + 0.5 * Math.sin(st.drone.phase)) * (ZONE.h - 24);
          // 移動
          let ix = (held(RT) ? 1 : 0) - (held(LF) ? 1 : 0), iy = (held(DN) ? 1 : 0) - (held(UP) ? 1 : 0);
          if (st.steer) {
            const dx = st.steer.x - (st.x + 3), dy = st.steer.y - (st.y + 3), d = Math.hypot(dx, dy);
            if (d > 4) { ix = dx / d; iy = dy / d; }
          }
          const n = Math.hypot(ix, iy) || 1;
          const slow = debris.some((d) => st.x + 6 > d.x && st.x < d.x + d.w && st.y + 6 > d.y && st.y < d.y + d.h) ? 0.5 : 1;
          const shortcutBoost = inZone(st.x, st.y) ? 2.0 : 1;
          const max = 66 * cfg.speedMult * slow * shortcutBoost * (st.dash > 0 ? 1.9 : 1);
          st.vx += ((ix / n) * max - st.vx) * Math.min(1, dt * 5);
          st.vy += ((iy / n) * max - st.vy) * Math.min(1, dt * 5);
          if (ix) st.face = ix > 0 ? 1 : -1;
          const nx = st.x + st.vx * dt, ny = st.y + st.vy * dt;
          if (!blocked(nx, st.y)) st.x = nx; else st.vx = 0;
          if (!blocked(st.x, ny)) st.y = ny; else st.vy = 0;
          if ((ix || iy) && Math.random() < dt * (shortcutBoost > 1 ? 18 : 10)) {
            fx.add({ x: st.x + 3, y: st.y + 5, vx: -st.vx * 0.2, vy: -st.vy * 0.2, life: 0.6, color: shortcutBoost > 1 ? '#5fd4ff' : 'rgba(191,239,255,0.8)' });
          }
          if (slow < 1 && Math.random() < dt * 3) popup('被垃圾纏住', '#8d99b4', st.x, st.y - 8);
          // 管制區無人機偵測扣錢
          if (shortcutBoost > 1 && st.drone.cd <= 0 && Math.hypot(st.x + 3 - st.drone.x, st.y + 3 - st.drone.y) < st.drone.r) {
            const fine = Math.max(1, Math.round(6 * cfg.payMult));
            st.cr = Math.max(0, st.cr - fine);
            st.drone.cd = 2.4;
            st.drone.alert = 0.8;
            A.sfx('wrong');
            popup('無人機拍到了！−' + C.cash(s, fine), '#ff4d5e', st.x, st.y - 10);
          }
          // 照顧路邊倒下的人（停在旁邊滿 3 秒）
          if (st.fallen && !st.fallen.resolved) {
            const nearFallen = Math.hypot(st.x + 3 - st.fallen.x, st.y + 3 - st.fallen.y) <= 18;
            if (nearFallen) {
              st.fallen.careT += dt;
              if (st.fallen.careT >= 3) {
                st.fallen.careT = 3;
                st.fallen.resolved = 'care';
                st.stanceVotes.push('care');
                st.stance = 'care';
                A.sfx('pickup');
                fx.burst(st.fallen.x, st.fallen.y, 12, { color: '#9be36b', life: 0.7, speed: 34 });
                popup('你停下來照顧' + st.fallen.person.name, '#9be36b', st.fallen.x, st.fallen.y - 12);
              }
            } else {
              st.fallen.careT = Math.max(0, st.fallen.careT - dt * 0.35);
            }
          }
          // 訂單
          st.nextOrder -= dt;
          if (st.nextOrder <= 0 && st.orders.length < 4) { newOrder(); st.nextOrder = 5 + Math.random() * 3; }
          st.orders.forEach((o) => { o.t -= dt; });
          for (let i = st.orders.length - 1; i >= 0; i--) {
            const o = st.orders[i];
            if (o.state === 'wait' && o.t < -6) { st.orders.splice(i, 1); st.late++; popup('客人取消了訂單', '#ff8a9a', o.shop.x, o.shop.y - 10); A.sfx('wrong'); }
          }
          // 取餐
          shops.forEach((sh) => {
            if (Math.hypot(st.x + 3 - sh.x, st.y + 3 - sh.y) > 11) return;
            st.orders.filter((o) => o.state === 'wait' && o.shop === sh).forEach((o) => {
              if (st.orders.filter((x) => x.state === 'carry').length >= CAP) return;
              o.state = 'carry'; A.sfx('pickup');
              popup('取餐：' + sh.name, sh.color, sh.x, sh.y - 10);
            });
          });
          // 送餐
          st.orders.filter((o) => o.state === 'carry' && Math.hypot(st.x + 3 - o.x, st.y + 3 - o.y) < 11).forEach(deliver);
          // 快艇（避開倒下求助者的水道，讓玩家可安心停下 3 秒）
          st.nextBoat -= dt;
          if (st.nextBoat <= 0) {
            st.nextBoat = Math.max(3, 42 / cfg.boats) * (0.7 + Math.random() * 0.6);
            const safeLanes = (st.fallen && !st.fallen.resolved)
              ? LANES.filter((l) => !((l.axis === 'h' && Math.abs(l.at - st.fallen.y) < 10) || (l.axis === 'v' && Math.abs(l.at - st.fallen.x) < 10)))
              : LANES;
            const lanePool = safeLanes.length ? safeLanes : LANES;
            const L = lanePool[Math.floor(Math.random() * lanePool.length)];
            const dir = Math.random() < 0.5 ? 1 : -1;
            st.boats.push({ axis: L.axis, at: L.at, dir, warn: 1.2, pos: dir > 0 ? -24 : (L.axis === 'h' ? 344 : 204), speed: rnd(130, 170) });
          }
          st.boats.forEach((b) => {
            if (b.warn > 0) { b.warn -= dt; if (b.warn <= 0) A.sfx('splash'); return; }
            b.pos += b.dir * b.speed * dt;
            const bx = b.axis === 'h' ? b.pos - 10 : b.at - 4, by = b.axis === 'h' ? b.at - 4 : b.pos - 10;
            const bw = b.axis === 'h' ? 20 : 8, bh = b.axis === 'h' ? 8 : 20;
            b.box = { x: bx, y: by, w: bw, h: bh };
            if (Math.random() < dt * 30) fx.add({ x: bx + bw / 2 - (b.axis === 'h' ? b.dir * 10 : 0), y: by + bh / 2 - (b.axis === 'v' ? b.dir * 10 : 0), vx: rnd(-15, 15), vy: rnd(-15, 15), life: 0.7, color: '#e8f6ff' });
            if (st.x + 6 > bx && st.x < bx + bw && st.y + 6 > by && st.y < by + bh) {
              hurt();
              const kx = b.axis === 'v' ? Math.sign(st.x + 3 - b.at) || 1 : 0, ky = b.axis === 'h' ? Math.sign(st.y + 3 - b.at) || 1 : 0;
              st.vx = kx * 120 + (b.axis === 'h' ? b.dir * 60 : 0); st.vy = ky * 120 + (b.axis === 'v' ? b.dir * 60 : 0);
            }
          });
          st.boats = st.boats.filter((b) => b.warn > 0 || (b.pos > -40 && b.pos < 380));
          if (st.t >= cfg.duration) finish();
        }
        endTick(dt);
      },
      draw(c) {
        const rm = C.reducedMotion();
        // 水
        c.fillStyle = '#195a70'; c.fillRect(0, 0, 320, 180);
        c.fillStyle = '#1f6b84';
        const waveT = rm ? 0 : st.t * 8;
        for (let i = 0; i < 40; i++) {
          const x = (i * 53 + waveT) % 330 - 5, y = 16 + (i * 37) % 160;
          c.fillRect(Math.round(x), y, 5, 1);
        }
        // 中央管制區近路（×2 速）與無人機探照燈
        c.fillStyle = inZone(st.x, st.y) ? 'rgba(55,195,214,0.25)' : 'rgba(255,194,71,0.12)';
        c.fillRect(ZONE.x, ZONE.y, ZONE.w, ZONE.h);
        c.strokeStyle = inZone(st.x, st.y) ? '#5fd4ff' : 'rgba(255,194,71,0.75)';
        c.lineWidth = 1;
        c.setLineDash([3, 3]);
        c.strokeRect(ZONE.x + 0.5, ZONE.y + 0.5, ZONE.w - 1, ZONE.h - 1);
        c.setLineDash([]);
        // 快艇預警：水道提示（減少動態效果時改為穩定高亮，不閃爍）
        st.boats.forEach((b) => {
          if (b.warn <= 0) return;
          if (!rm && Math.floor(b.warn * 8) % 2) return;
          c.fillStyle = 'rgba(255,77,94,0.18)';
          if (b.axis === 'h') c.fillRect(0, b.at - 12, 320, 24); else c.fillRect(b.at - 12, 13, 24, 167);
        });
        // 天台
        blds.forEach((b) => {
          c.fillStyle = '#2a3142'; c.fillRect(b.x, b.y + 2, b.w, b.h);
          c.fillStyle = '#3a4256'; c.fillRect(b.x, b.y, b.w, b.h - 2);
          c.fillStyle = '#4d5872'; c.fillRect(b.x, b.y, b.w, 2); c.fillRect(b.x, b.y, 2, b.h - 2); c.fillRect(b.x + b.w - 2, b.y, 2, b.h - 2);
          if (b.deco.tank) { c.fillStyle = '#6b7a99'; c.fillRect(b.x + 6, b.y + 6, 8, 8); c.fillStyle = '#8e9bb0'; c.fillRect(b.x + 6, b.y + 6, 8, 2); }
          for (let k = 0; k < b.deco.ac; k++) { c.fillStyle = '#5a6478'; c.fillRect(b.x + b.w - 10 - k * 8, b.y + b.h - 10, 6, 5); }
          if (b.deco.laundry) {
            c.fillStyle = '#8d99b4'; c.fillRect(b.x + 18, b.y + 10, 22, 1);
            ['#ff8fb1', '#37c3d6', '#ffd36b'].forEach((col, k) => { c.fillStyle = col; c.fillRect(b.x + 20 + k * 7, b.y + 11, 4, 4); });
          }
        });
        // 店舖
        shops.forEach((sh) => {
          c.fillStyle = sh.color; c.fillRect(sh.x - 6, sh.y - 3, 12, 6);
          c.fillStyle = '#ffffff'; for (let k = 0; k < 12; k += 4) c.fillRect(sh.x - 6 + k, sh.y - 3, 2, 6);
          const waiting = st.orders.some((o) => o.state === 'wait' && o.shop === sh);
          if (waiting && (rm || Math.floor(st.t * 4) % 2 === 0)) { c.strokeStyle = sh.color; c.lineWidth = 1; c.strokeRect(sh.x - 9, sh.y - 6, 18, 12); }
        });
        // 目的地
        st.orders.forEach((o) => {
          if (o.state !== 'carry') return;
          const pulse = rm ? 6.5 : 6 + Math.sin(st.t * 8) * 1.5;
          c.strokeStyle = o.t > 0 ? o.color : '#ff4d5e'; c.lineWidth = 1;
          c.beginPath(); c.arc(o.x, o.y, pulse, 0, Math.PI * 2); c.stroke();
          const frac = Math.max(0, o.t / o.total);
          c.strokeStyle = o.t > 4 ? '#8be28f' : '#ff4d5e'; c.lineWidth = 2;
          c.beginPath(); c.arc(o.x, o.y, pulse + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); c.stroke();
          c.fillStyle = '#ffd36b'; c.fillRect(o.x - 1, o.y - 1, 3, 3);
        });
        // 路邊倒下的人（兩難）
        if (st.fallen) {
          const fl = st.fallen, fx0 = Math.round(fl.x), fy0 = Math.round(fl.y);
          // 浮板／木棧板
          c.fillStyle = '#5c4329'; c.fillRect(fx0 - 11, fy0 - 5, 22, 11);
          c.fillStyle = '#7d5c3a'; c.fillRect(fx0 - 10, fy0 - 4, 20, 2); c.fillRect(fx0 - 10, fy0 + 2, 20, 2);
          if (fl.resolved === 'care') {
            // 已扶起坐好
            c.fillStyle = fl.person.shirt; c.fillRect(fx0 - 3, fy0 - 3, 6, 6);
            c.fillStyle = fl.person.skin; c.fillRect(fx0 - 2, fy0 - 8, 4, 5);
            c.fillStyle = fl.person.hair; c.fillRect(fx0 - 2, fy0 - 9, 4, 2);
          } else {
            // 倒臥像素小人
            c.fillStyle = fl.person.shirt; c.fillRect(fx0 - 6, fy0 - 2, 8, 5);
            c.fillStyle = '#2a3350'; c.fillRect(fx0 + 2, fy0 - 1, 5, 4);
            c.fillStyle = fl.person.skin; c.fillRect(fx0 - 9, fy0 - 2, 4, 4);
            c.fillStyle = fl.person.hair; c.fillRect(fx0 - 10, fy0 - 3, 3, 4);
            // 求助圈與 3 秒照顧進度弧
            c.strokeStyle = 'rgba(255,211,107,0.55)'; c.lineWidth = 1;
            c.beginPath(); c.arc(fx0, fy0, 15, 0, Math.PI * 2); c.stroke();
            if (fl.careT > 0) {
              c.strokeStyle = '#9be36b'; c.lineWidth = 2.5;
              c.beginPath(); c.arc(fx0, fy0, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, fl.careT / 3)); c.stroke();
            }
            // 旁邊求助標記牌
            c.fillStyle = '#ff4d5e'; c.fillRect(fx0 + 9, fy0 - 14, 18, 9);
            c.strokeStyle = '#ffffff'; c.lineWidth = 1; c.strokeRect(fx0 + 9.5, fy0 - 13.5, 17, 8);
          }
        }
        // 垃圾
        debris.forEach((d) => {
          c.fillStyle = '#6b5a3a'; c.fillRect(Math.round(d.x), Math.round(d.y), d.w, d.h);
          c.fillStyle = '#c9d1dc'; c.fillRect(Math.round(d.x) + 2, Math.round(d.y) + 1, 3, 2);
          c.fillStyle = '#ff4fb4'; c.fillRect(Math.round(d.x) + 6, Math.round(d.y) + 3, 2, 2);
        });
        // 快艇
        st.boats.forEach((b) => {
          if (b.warn > 0) return;
          const { x, y, w, h } = b.box;
          c.fillStyle = '#e8edf6'; c.fillRect(Math.round(x), Math.round(y), w, h);
          c.fillStyle = '#ff4fb4';
          if (b.axis === 'h') c.fillRect(Math.round(x) + (b.dir > 0 ? w - 6 : 0), Math.round(y) + 2, 6, 4);
          else c.fillRect(Math.round(x) + 2, Math.round(y) + (b.dir > 0 ? h - 6 : 0), 4, 6);
          c.fillStyle = '#37c3d6'; c.fillRect(Math.round(x + w / 2) - 2, Math.round(y + h / 2) - 2, 4, 4);
        });
        // 巡邏無人機與探照燈
        const drx = Math.round(st.drone.x), dry = Math.round(st.drone.y);
        c.fillStyle = st.drone.alert > 0 ? 'rgba(255,77,94,0.28)' : 'rgba(255,211,107,0.16)';
        c.beginPath(); c.arc(drx, dry, st.drone.r, 0, Math.PI * 2); c.fill();
        c.strokeStyle = st.drone.alert > 0 ? '#ff4d5e' : 'rgba(255,211,107,0.6)';
        c.lineWidth = 1; c.beginPath(); c.arc(drx, dry, st.drone.r, 0, Math.PI * 2); c.stroke();
        c.fillStyle = '#0b0f1a'; c.fillRect(drx - 5, dry - 2, 10, 4);
        c.fillStyle = '#cbd5f0'; c.fillRect(drx - 7, dry - 4, 4, 2); c.fillRect(drx + 3, dry - 4, 4, 2);
        c.fillStyle = st.drone.alert > 0 ? '#ff4d5e' : '#ffd36b'; c.fillRect(drx - 1, dry - 1, 2, 2);
        // 玩家：發泡膠板 + 外賣箱 + 方向指標
        const carry = st.orders.filter((o) => o.state === 'carry');
        if (!(st.inv > 0 && !rm && Math.floor(st.t * 12) % 2)) {
          const px = Math.round(st.x), py = Math.round(st.y);
          c.fillStyle = '#f2f2f2'; c.fillRect(px - 2, py + 2, 10, 5);
          c.fillStyle = '#f2c6a0'; c.fillRect(px + 1, py, 4, 4);
          c.fillStyle = '#2b2140'; c.fillRect(px + 1, py, 4, 1);
          c.fillStyle = carry.length ? '#ffc247' : '#5a6478'; c.fillRect(px + (st.face > 0 ? -3 : 6), py + 1, 4, 4);
          if (carry.length > 1) { c.fillStyle = '#ff8a5c'; c.fillRect(px + (st.face > 0 ? -3 : 6), py - 2, 4, 3); }
          if (st.dash > 0) { c.fillStyle = 'rgba(191,239,255,0.7)'; c.fillRect(px - 4 * st.face, py + 3, 3, 1); }
          const gt = st.phase === 'play' ? guideTarget() : null;
          if (gt) {
            const ang = Math.atan2(gt.y - (py + 3), gt.x - (px + 3));
            const ax = px + 3 + Math.cos(ang) * 11, ay = py + 3 + Math.sin(ang) * 11;
            c.fillStyle = gt.color || '#ffd36b';
            c.fillRect(Math.round(ax) - 1, Math.round(ay) - 1, 3, 3);
          }
        }
        // 右下角包裹拖放欄（背着外賣時可把貨拖到水面丟棄）
        if (carry.length && st.phase === 'play') {
          const hi = !!(st.fallen && !st.fallen.resolved);
          c.fillStyle = 'rgba(8,12,22,0.9)'; c.fillRect(CARGO_BOX.x, CARGO_BOX.y, CARGO_BOX.w, CARGO_BOX.h);
          c.strokeStyle = hi ? '#7fe3ff' : '#ffc247'; c.lineWidth = 1;
          c.strokeRect(CARGO_BOX.x + 0.5, CARGO_BOX.y + 0.5, CARGO_BOX.w - 1, CARGO_BOX.h - 1);
          c.fillStyle = '#ffc247'; c.fillRect(CARGO_BOX.x + 5, CARGO_BOX.y + 6, 12, 12);
          c.fillStyle = '#9e5b1e'; c.fillRect(CARGO_BOX.x + 5, CARGO_BOX.y + 11, 12, 2);
        }
        if (st.cargoDrag) {
          const dx = Math.round(st.cargoDrag.x), dy = Math.round(st.cargoDrag.y);
          const overSea = isWaterDrop(dx, dy);
          c.strokeStyle = overSea ? '#7fe3ff' : '#ffc247'; c.lineWidth = 1;
          c.setLineDash([2, 2]);
          c.beginPath(); c.moveTo(CARGO_BOX.x + 11, CARGO_BOX.y + 12); c.lineTo(dx, dy); c.stroke();
          c.setLineDash([]);
          c.fillStyle = overSea ? '#7fe3ff' : '#ffc247';
          c.fillRect(dx - 6, dy - 6, 12, 12);
        }
        fx.draw(c);
        C.topBar(c, 1 - Math.max(0, st.t) / cfg.duration, '#ffc247');
        if (st.flash > 0 && !rm) { c.fillStyle = 'rgba(255,77,94,' + st.flash * 0.6 + ')'; c.fillRect(0, 0, 320, 180); }
      },
      drawText() {
        P.text('+' + C.cash(s, st.cr), 6, 1, { size: 8.5, font: 'num', color: '#8be28f', weight: 400 });
        P.text('已送 ' + st.deliveries + '　遲 ' + st.late, 314, 1, { size: 7, color: '#ffc247', align: 'right' });
        P.text('管制近路 ×2速', ZONE.x + ZONE.w / 2, ZONE.y + 2, { size: 4.8, align: 'center', color: '#ffe7a8', weight: 900, stroke: '#0b0f1a' });
        const carry = st.orders.filter((o) => o.state === 'carry');
        blds.forEach((b) => {
          if (carry.length && st.phase === 'play' && b.i === 11) return;
          P.text(b.name, b.x + b.w / 2, b.y + b.h / 2 - 3, { size: 5, align: 'center', color: 'rgba(232,237,246,0.45)', weight: 700 });
        });
        shops.forEach((sh) => P.text(sh.name, Math.max(26, Math.min(294, sh.x)), sh.y - 13, { size: 6, align: 'center', color: sh.color, weight: 900, stroke: '#0b0f1a' }));
        if (st.fallen) {
          const fl = st.fallen;
          const labelX = Math.max(36, Math.min(284, fl.x));
          if (fl.resolved === 'care') {
            P.text(fl.person.name + '（已安置）', labelX, fl.y - 20, { size: 5.8, align: 'center', color: '#9be36b', weight: 900, stroke: '#0b0f1a' });
          } else {
            P.text('求助', fl.x + 18, fl.y - 13.5, { size: 5.5, align: 'center', color: '#ffffff', weight: 900 });
            P.text(fl.person.name, labelX, fl.y - 22, { size: 6, align: 'center', color: '#ffd36b', weight: 900, stroke: '#0b0f1a' });
            const sub = fl.careT > 0.05 ? '照顧中 ' + fl.careT.toFixed(1) + ' / 3.0秒' : '停在旁邊 3 秒照顧';
            P.text(sub, labelX, fl.y + 9, { size: 5.5, align: 'center', color: fl.careT > 0.05 ? '#9be36b' : '#ffffff', weight: 900, stroke: '#0b0f1a' });
          }
        }
        if (carry.length && st.phase === 'play') {
          P.text('包裹 ×' + carry.length, CARGO_BOX.x + 21, CARGO_BOX.y + 4, { size: 5.8, color: '#ffe7a8', weight: 900 });
          P.text('拖到水面丟棄', CARGO_BOX.x + 21, CARGO_BOX.y + 13, { size: 5, color: '#9fdcff', weight: 700 });
        }
        if (st.cargoDrag) {
          const overSea = isWaterDrop(st.cargoDrag.x, st.cargoDrag.y);
          P.text(overSea ? '放開丟進海裏' : '拖到水面', Math.max(34, Math.min(286, st.cargoDrag.x)), st.cargoDrag.y - 14, { size: 5.8, align: 'center', color: '#7fe3ff', weight: 900, stroke: '#0b0f1a' });
        }
        // 訂單清單
        const list = st.orders.slice(0, 4);
        list.forEach((o, i) => {
          const t = Math.max(0, Math.ceil(o.t));
          const txt = (o.state === 'carry' ? '▶ ' : '　') + o.shop.name + ' → ' + o.b.name + '　' + (o.t > 0 ? t + '秒' : '過時');
          P.text(txt, 4, 164 - (list.length - 1 - i) * 10, { size: 6.5, color: o.state === 'carry' ? o.color : '#c9d1dc', weight: 900, stroke: '#0b0f1a' });
        });
        st.orders.forEach((o) => { if (o.state === 'carry') P.text(String(Math.max(0, Math.ceil(o.t))), o.x, o.y - 16, { size: 6, align: 'center', font: 'num', color: o.t > 4 ? '#8be28f' : '#ff4d5e', weight: 400, stroke: '#0b0f1a' }); });
        st.boats.forEach((b) => {
          if (b.warn <= 0) return;
          const x = b.axis === 'h' ? (b.dir > 0 ? 8 : 312) : b.at, y = b.axis === 'h' ? b.at - 4 : (b.dir > 0 ? 16 : 168);
          P.text('！', x, y, { size: 9, align: 'center', color: '#ff4d5e', weight: 900, stroke: '#0b0f1a' });
        });
        st.popups.forEach((p) => P.text(p.text, Math.max(36, Math.min(284, p.x)), p.y - p.t * 10, { size: 6, align: 'center', color: p.color, weight: 900, stroke: '#0b0f1a', alpha: Math.max(0, 1 - p.t / 1.6) }));
        if (st.dashCd > 0 && st.phase === 'play') P.text('衝刺冷卻', 314, 11, { size: 5, align: 'right', color: '#8d99b4' });
        C.drawBanner(st);
      },
    };
  }

  IE.Micro.register('delivery', Delivery);
})(window.IE = window.IE || {});
