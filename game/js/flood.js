// 《靈感撤離 2080》第十六期：五輪模式的水位階段、淹水後果與搬遷服務（WO-16-06）。
// 純邏輯，不涉及 DOM，瀏覽器與 Node 共用；只在五輪模式生效。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA, R = IE.Rules;

  function on(s) {
    return !!(s && D.MODES && D.MODES[s.mode] && D.MODES[s.mode].rounds);
  }

  function priceMod(s) {
    return IE.Meta && IE.Meta.stakeMod ? IE.Meta.stakeMod(s, 'prices') : 1;
  }

  function deckMax(s) {
    const bg = s && D.BACKGROUNDS && D.BACKGROUNDS[s.bg];
    const base = (bg && bg.perk && bg.perk.deckMax) || D.CRAFT.deckMax;
    if (!on(s)) return base;
    if ((s.floor || 0) <= 0) {
      return Math.max(1, base - ((D.ECON16 && D.ECON16.homelessDeck) || 2));
    }
    return base;
  }

  // 回傳現在的水位階段（dry / warn / light / medium / heavy），已計入抽水泵與角色特性
  function stage(s) {
    if (!on(s)) return 'dry';
    if ((s.floor || 0) <= 0) return 'dry';
    if (!R.flooded(s)) {
      const gap = s.floor - (s.water || 0);
      return gap <= 1 ? 'warn' : 'dry';
    }
    const run = Math.max(1, s.floodRun || 1);
    let st = run === 1 ? 'light' : run === 2 ? 'medium' : 'heavy';
    if (IE.World && IE.World.decorOn && IE.World.decorOn(s, 'pump')) {
      st = st === 'light' ? 'dry' : st === 'medium' ? 'light' : 'medium';
    }
    const pk = (D.BACKGROUNDS && D.BACKGROUNDS[s.bg] && D.BACKGROUNDS[s.bg].perk) || {};
    if (st === 'light' && (pk.floodSafe || pk.floodHeal)) st = 'dry';
    return st;
  }

  // 相容舊存檔與新局初始化（不消耗亂數）
  function ensure(s) {
    if (!on(s)) return s;
    if (typeof s.floodRun !== 'number') s.floodRun = 0;
    if (s.floodPick === undefined) s.floodPick = null;
    if (s.floodOut === undefined) s.floodOut = null;
    if (typeof s.floodPump !== 'boolean') s.floodPump = false;
    if (typeof s.flood !== 'string') s.flood = stage(s);
    return s;
  }

  // 每晚白天開始時（IE.Rounds.advance 之後）呼叫一次
  function tick(s) {
    if (!on(s)) return null;
    ensure(s);
    if (IE.Cards && IE.Cards.ensure) IE.Cards.ensure(s);
    const rep = R.report(s, '水位');
    const E = D.ECON16 || {};
    const T = D.FLOOD_TEXT || {};
    s.floodPump = false;
    s.floodPick = null;
    s.floodOut = null;

    if ((s.floor || 0) <= 0) {
      s.floodRun = 0;
      s.flood = 'dry';
      const loss = E.homelessBody != null ? E.homelessBody : 4;
      s.body -= loss;
      s.lastCause = { k: 'homeless', ctx: null, day: s.day };
      rep.delta('body', -loss);
      if (T.barHomeless) {
        rep.line(T.barHomeless.replace('{w}', (s.water || 0).toFixed(1)), 'bad');
      }
      if (s.body <= 0 && (!R.lastStand || !R.lastStand(s, rep))) {
        s.ended = R.endingFor(s, 'death');
        s.phase = 'ended';
        rep.ending = s.ended;
      }
      return rep.done();
    }

    const flooded = R.flooded(s);
    s.floodRun = flooded ? (s.floodRun || 0) + 1 : 0;
    if (flooded) {
      s.stats = s.stats || {};
      s.stats.floodNights = (s.stats.floodNights || 0) + 1;
      if (IE.World && IE.World.decorOn && IE.World.decorOn(s, 'pump')) {
        s.floodPump = true;
        if (T.pump) rep.line(T.pump, 'good');
      }
    }

    const st = stage(s);
    s.flood = st;

    if (st === 'warn') {
      if (T.warn) rep.line(T.warn, 'warn');
      return rep.done();
    }

    if (st === 'light' || st === 'medium' || st === 'heavy') {
      const bLoss = E.floodBody != null ? E.floodBody : 8;
      const spLoss = E.floodSpark != null ? E.floodSpark : 0.2;
      s.body -= bLoss;
      s.lastCause = { k: 'floodhome', ctx: null, day: s.day };
      rep.delta('body', -bLoss);
      const sp = R.addSpark(s, -spLoss, true);
      rep.delta('spark', sp);
      if (T.light) rep.line(T.light, 'bad');
    }

    if (s.body <= 0 && (!R.lastStand || !R.lastStand(s, rep))) {
      s.ended = R.endingFor(s, 'death');
      s.phase = 'ended';
      rep.ending = s.ended;
      return rep.done();
    }

    if (st === 'medium') {
      const pool = (s.cards || []).filter((c) => c && !c.relic);
      if (pool.length > 0) {
        if (pool.length <= 3) {
          s.floodPick = pool.map((c) => c.uid);
        } else {
          const rem = pool.slice();
          const chosen = [];
          while (chosen.length < 3 && rem.length) {
            const idx = Math.floor(R.rand(s) * rem.length);
            chosen.push(rem.splice(idx, 1)[0].uid);
          }
          s.floodPick = chosen;
        }
      }
    } else if (st === 'heavy') {
      s.floor = 0;
      s.stats = s.stats || {};
      s.stats.lostHome = (s.stats.lostHome || 0) + 1;
      const startId = D.START_OBJECT && D.START_OBJECT[s.bg];
      const isLoseable = (id) => !!(id && D.OBJ && D.OBJ[id] && !D.OBJ[id].start && id !== startId);
      const allCands = (s.objects || []).filter(isLoseable).concat((s.objStash || []).filter(isLoseable));
      let lostName = null;
      if (allCands.length) {
        const lostId = allCands[Math.floor(R.rand(s) * allCands.length)];
        const eqIdx = (s.objects || []).indexOf(lostId);
        if (eqIdx >= 0) s.objects.splice(eqIdx, 1);
        else if (Array.isArray(s.objStash)) {
          const stIdx = s.objStash.indexOf(lostId);
          if (stIdx >= 0) s.objStash.splice(stIdx, 1);
        }
        lostName = D.OBJ[lostId].name;
      }
      s.floodOut = { night: s.night, obj: lostName };
      if (T.heavy) rep.line(T.heavy, 'bad');
      if (lostName && T.heavyObj) rep.line(T.heavyObj.replace('{x}', lostName), 'bad');
      if (Array.isArray(s.cards) && s.cards.length > deckMax(s)) {
        s.over = true;
      }
    }

    return rep.done();
  }

  // 「中」階段：玩家選一張卡留給水，移入回憶並標記 lost: 'flood'
  function pick(s, uid) {
    if (!on(s)) return { ok: false, msg: '只在五輪模式生效' };
    if (!Array.isArray(s.floodPick) || !s.floodPick.includes(uid)) {
      return { ok: false, msg: '不在候選清單' };
    }
    if (IE.Cards && IE.Cards.ensure) IE.Cards.ensure(s);
    const idx = (s.cards || []).findIndex((c) => c && c.uid === uid);
    if (idx < 0) return { ok: false, msg: '找不到這張素材' };
    const card = s.cards[idx];
    if (card.relic) return { ok: false, msg: D.CARD_TEXT.relicKeep };
    s.cards.splice(idx, 1);
    card.lost = 'flood';
    card.lostNight = s.night || 1;
    s.memory.push(card);
    s.floodPick = null;
    if (s.cards.length <= deckMax(s)) s.over = false;
    s.stats = s.stats || {};
    s.stats.floodLostCards = (s.stats.floodLostCards || 0) + 1;
    const tpl = (D.FLOOD_TEXT && D.FLOOD_TEXT.mediumDone) || '「{x}」跟着水走了。它現在在回憶裏。';
    return { ok: true, card, msg: tpl.replace('{x}', card.name) };
  }

  // 模擬器與 IE.Auto：放下三張之中價值最低的一張
  function autoPick(s) {
    if (!on(s) || !Array.isArray(s.floodPick) || !s.floodPick.length) return null;
    const starOf = (c) => (IE.Create && IE.Create.starOf ? IE.Create.starOf(c) : (c.star || 1));
    const cands = s.floodPick
      .map((u) => (s.cards || []).find((c) => c && c.uid === u))
      .filter((c) => c && !c.relic);
    if (!cands.length) {
      s.floodPick = null;
      return null;
    }
    cands.sort((a, b) => (starOf(a) - starOf(b)) || ((a.value || 0) - (b.value || 0)) || ((b.wear || 0) - (a.wear || 0)));
    const r = pick(s, cands[0].uid);
    return r && r.ok ? r.card : null;
  }

  // 市集的住所服務清單（moveup / rehouse）
  function services(s) {
    if (!on(s)) return [];
    const E = D.ECON16 || {};
    const defs = D.SERVICES16 || [];
    const mod = priceMod(s);
    if ((s.floor || 0) <= 0) {
      const def = defs.find((x) => x.id === 'rehouse') || { id: 'rehouse', name: '租回一個單位', desc: '租回 {f} 樓的單位，恢復素材庫上限' };
      const nextFloor = Math.min(8, Math.max(1, Math.floor(s.water || 0) + 2));
      const cost = Math.round((E.rehouse != null ? E.rehouse : 260) * mod);
      const affordable = (s.cr || 0) >= cost;
      return [{
        id: 'rehouse',
        name: def.name,
        desc: def.desc.replace('{f}', String(nextFloor)),
        floor: nextFloor,
        cost,
        price: cost,
        affordable,
        enabled: affordable,
      }];
    }
    if (s.floor < 8) {
      const def = defs.find((x) => x.id === 'moveup') || { id: 'moveup', name: '搬上一層', desc: '搬上 {f} 樓，連續淹水晚數歸零' };
      const nextFloor = s.floor + 1;
      const base = E.moveBase != null ? E.moveBase : 120;
      const step = E.moveStep != null ? E.moveStep : 40;
      const cost = Math.round((base + step * nextFloor) * mod);
      const affordable = (s.cr || 0) >= cost;
      return [{
        id: 'moveup',
        name: def.name,
        desc: def.desc.replace('{f}', String(nextFloor)),
        floor: nextFloor,
        cost,
        price: cost,
        affordable,
        enabled: affordable,
      }];
    }
    return [];
  }

  // 購買 moveup 或 rehouse
  function buy(s, id) {
    if (!on(s)) return { ok: false, msg: '只在五輪模式生效' };
    const srv = services(s).find((x) => x.id === id);
    if (!srv) {
      return {
        ok: false,
        msg: id === 'moveup' && (s.floor || 0) >= 8 ? '已經在最高 8 樓' : '目前不能購買這項服務',
      };
    }
    if ((s.cr || 0) < srv.cost) return { ok: false, msg: '要 $' + srv.cost };
    s.cr -= srv.cost;
    s.floor = srv.floor;
    s.floodRun = 0;
    s.floodPump = false;
    s.flood = stage(s);
    if (Array.isArray(s.cards) && s.cards.length <= deckMax(s)) s.over = false;
    s.stats = s.stats || {};
    s.stats.moves = (s.stats.moves || 0) + 1;
    const T = D.FLOOD_TEXT || {};
    const tpl = id === 'rehouse' ? (T.rehouse || '') : (T.moveup || '');
    return {
      ok: true,
      id,
      cost: srv.cost,
      floor: s.floor,
      msg: tpl.replace('{f}', String(s.floor)),
    };
  }

  IE.Flood = {
    on,
    ensure,
    stage,
    tick,
    pick,
    autoPick,
    deckMax,
    services,
    buy,
  };
});
