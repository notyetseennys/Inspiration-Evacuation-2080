// 《靈感撤離 2080》第十五期：五輪模式的狀態機、時間表與白天生活卡核心。
// 純邏輯，不涉及 DOM，瀏覽器與 Node（tools/sim.js）共用。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA, R = IE.Rules;

  // 是否為五輪模式
  function on(s) {
    return !!(s && D.MODES[s.mode] && D.MODES[s.mode].rounds);
  }

  // 第幾輪（1..5）
  function roundOf(s, night) {
    const n = night == null ? s.night : night;
    return R.clamp(Math.ceil(n / 3), 1, 5);
  }

  // 這一晚的關卡種類：小展／聯展／外星評審
  function kindOf(night) {
    return ['small', 'big', 'boss'][(night - 1) % 3];
  }

  // 對應標準模式的關卡之夜，讓季節、進度日、評審規則與 KPI 全部沿用現有邏輯
  function dayOfNight(night) {
    return 4 * night;
  }

  // 把正整數四捨五入到三位有效數字
  function sig3(v) {
    if (!v || v <= 0) return 0;
    const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(v)) - 2));
    return Math.round(v / p) * p;
  }

  // 第 k 晚的目標分數
  function target(s, night) {
    const k = night == null ? s.night : night;
    const stMod = IE.Meta && IE.Meta.stakeMod ? IE.Meta.stakeMod(s, 'stageTarget') : 1;
    const ease = s && s.firstRun && k <= 2 ? D.ECON.firstRunEase : 1;
    return sig3(D.ECON.t1 * Math.pow(D.ECON.growth, k - 1) * stMod * ease);
  }

  // 第 r 輪結束時的租金
  function rentOf(s, round) {
    const r = round == null ? roundOf(s) : round;
    const base = D.ECON.rent[R.clamp(r - 1, 0, D.ECON.rent.length - 1)];
    const stMod = IE.Meta && IE.Meta.stakeMod ? IE.Meta.stakeMod(s, 'rent') : 1;
    const wMod = (s && R.worldMods(s).rentMult) || 1;
    const pMod = (s && D.BACKGROUNDS[s.bg] && D.BACKGROUNDS[s.bg].perk && D.BACKGROUNDS[s.bg].perk.rentMult) || 1;
    return Math.round(base * stMod * wMod * pMod);
  }

  // ---------- 白天：生活卡 ----------
  function cardDef(id) {
    if (id.startsWith('friend:')) return D.DAYCARDS.find((c) => c.id === 'friend');
    if (id.startsWith('trip:')) return D.DAYCARDS.find((c) => c.id === 'trip');
    return D.DAYCARDS.find((c) => c.id === id);
  }

  // 這一晚可以出現的全部卡 id（已展開 friend:<npc>、trip:<origin>）
  function cardList(s) {
    const out = [];
    const r = roundOf(s);
    D.DAYCARDS.forEach((c) => {
      if (c.id === 'friend') {
        R.aliveNpcs(s).forEach((n) => out.push('friend:' + n.id));
      } else if (c.id === 'trip') {
        if (r >= (c.minRound || 2)) (c.origins || []).forEach((o) => out.push('trip:' + o));
      } else if (!(s.removed && s.removed[c.id]) && !R.worldClosed(s, c.id)) {
        out.push(c.id);
      }
    });
    return out;
  }

  function drawOfferIds(s) {
    const all = cardList(s);
    const kOf = (id) => { const d = cardDef(id); return d ? d.kind : ''; };
    const p1 = all.filter((id) => { const k = kOf(id); return k === 'work' || k === 'shady'; });
    const c1 = R.pick(s, p1);
    const p2 = all.filter((id) => { const k = kOf(id); return (k === 'life' || k === 'friend') && id !== c1; });
    const c2 = R.pick(s, p2);
    const tripDef = D.DAYCARDS.find((c) => c.id === 'trip');
    const trips = all.filter((id) => id.startsWith('trip:'));
    const rest = all.filter((id) => !id.startsWith('trip:') && id !== c1 && id !== c2);
    const c3 = trips.length && R.rand(s) < (tripDef ? tripDef.chance : 0.15) ? R.pick(s, trips) : R.pick(s, rest);
    return [c1, c2, c3];
  }

  // 回傳 s.offer；這一晚還沒有就按總規格 §7 的出牌規則產生
  function offer(s) {
    if (s.offer && s.offer.night === s.night && Array.isArray(s.offer.ids) && s.offer.ids.length === 3) return s.offer;
    s.offer = { night: s.night, ids: drawOfferIds(s), rerolls: 0, chosen: null };
    return s.offer;
  }

  // 換一批的價錢
  function offerCost(s) {
    const of = offer(s);
    const r = (of && of.rerolls) || 0;
    const arr = D.ECON.offerReroll;
    const base = arr[R.clamp(r, 0, arr.length - 1)];
    const stMod = IE.Meta && IE.Meta.stakeMod ? IE.Meta.stakeMod(s, 'prices') : 1;
    return Math.round(base * stMod);
  }

  // 換一批生活卡
  function rerollOffer(s) {
    const of = offer(s);
    const cost = offerCost(s);
    if (s.cr < cost) return { ok: false, msg: '換一批要 $' + cost };
    s.cr -= cost;
    of.rerolls = (of.rerolls || 0) + 1;
    of.ids = drawOfferIds(s);
    of.chosen = null;
    return { ok: true };
  }

  // 介面顯示用的卡片資訊
  function cardInfo(s, id) {
    if (id.startsWith('friend:')) {
      const npcId = id.slice(7);
      const npc = D.NPCS.find((n) => n.id === npcId);
      const fid = D.TEACH[npcId];
      const form = D.FORMS.find((f) => f.id === fid);
      const cost = R.chatCost(s);
      const reason = s.cr < cost ? '沒錢請人喝東西' : null;
      return {
        id,
        kind: 'friend',
        kindName: D.ROUND_TEXT.kinds.friend,
        name: '找' + (npc ? npc.name : npcId) + '聊天',
        sub: form ? '聊聊近況，練習「' + form.name + '」的配色' : '和朋友聊聊近況',
        micro: null,
        fx: [['cr', cost ? '−$' + cost : '免費'], ['spark', '+0.4 起'], ['card', '人情'], ['note', '技法：' + (form ? form.name : '') + ' +1']],
        danger: 0,
        enabled: !reason,
        reason,
      };
    }
    if (id.startsWith('trip:')) {
      const origin = id.slice(5);
      const reg = (D.REGIONS && D.REGIONS[origin]) || origin;
      const stMod = IE.Meta && IE.Meta.stakeMod ? IE.Meta.stakeMod(s, 'prices') : 1;
      const cost = Math.round(D.ECON.tripCost * stMod);
      const reason = s.cr < cost ? '旅費不足（需要 $' + cost + '）' : null;
      return {
        id,
        kind: 'trip',
        kindName: D.ROUND_TEXT.kinds.trip,
        name: '出國：' + reg,
        sub: '飛往' + reg + '，從五張當地素材中帶回兩張',
        micro: null,
        fx: [['cr', '−$' + cost], ['spark', '+0.4'], ['card', reg + '素材 五選二']],
        danger: 0,
        enabled: !reason,
        reason,
      };
    }
    const def = cardDef(id) || { id, kind: 'work' };
    const oldSlot = s.slot;
    s.slot = 0;
    const act = R.actions(s).find((a) => a.id === id);
    s.slot = oldSlot;
    const KEEP = ['cr', 'spark', 'soul', 'card'];
    const fx = act ? act.fx.filter(([k]) => KEEP.includes(k)).map((x) => x.slice()) : [];
    const danger = D.OUTDOOR && D.OUTDOOR.includes(id) ? R.outdoorRisk(s) : 0;
    if (danger > 0) fx.push(['danger', '致命 ' + Math.round(danger * 1000) / 10 + '%']);
    const reason = s.removed && s.removed[id]
      ? (id === 'smile' ? '已被 AI 情緒伴侶 2.0 取代' : '職位已被 AI 取代')
      : R.worldClosed(s, id) || null;
    return {
      id,
      kind: def.kind,
      kindName: D.ROUND_TEXT.kinds[def.kind],
      name: act ? act.name : id,
      sub: act ? act.sub : '',
      micro: def.micro || null,
      fx,
      danger,
      enabled: !reason,
      reason,
    };
  }

  // 白天完結：進入創作之夜，若在致命危險中喪生則進入結局
  function afterDay(s) {
    if (!s || s.phase !== 'day') return;
    if (s.body <= 0) {
      s.ended = R.endingFor(s, 'death');
      s.phase = 'ended';
      return;
    }
    s.phase = 'night';
  }

  // 睡懶覺：不選卡，恢復火花並進入晚上
  function skipDay(s) {
    const rep = R.report(s, '睡懶覺');
    const sp = R.addSpark(s, D.ECON.skipSpark, true);
    rep.line('今天甚麼都不做，睡了一整天', 'good', sp, 'spark');
    afterDay(s);
    return rep.done();
  }

  // 選一張生活卡
  function choose(s, id, reply) {
    if (!s || s.phase !== 'day') return null;
    const of = offer(s);
    if (!of || !of.ids.includes(id)) return null;
    const info = cardInfo(s, id);
    if (!info.enabled) return null;
    if (info.micro) {
      of.chosen = id;
      return { micro: info.micro };
    }
    if (id.startsWith('friend:')) {
      of.chosen = id;
      const npcId = id.slice(7);
      const fid = D.TEACH[npcId];
      const lv0 = (s.forms && s.forms[fid]) || 1;
      const rep = R.applyChat(s, npcId, reply);
      if (((s.forms && s.forms[fid]) || 1) === lv0) {
        R.teach(s, npcId, 1, { line: (text, kind) => rep.lines.push({ text, kind: kind || '' }) });
      }
      afterDay(s);
      return rep;
    }
    if (id === 'volunteer') {
      of.chosen = id;
      const rep = R.applyVolunteer(s);
      afterDay(s);
      return rep;
    }
    if (id.startsWith('trip:')) {
      const origin = id.slice(5);
      const stMod = IE.Meta && IE.Meta.stakeMod ? IE.Meta.stakeMod(s, 'prices') : 1;
      const cost = Math.round(D.ECON.tripCost * stMod);
      of.chosen = id;
      s.cr -= cost;
      R.addSpark(s, 0.4, true);
      s.visited[origin] = (s.visited[origin] || 0) + 1;
      s.stats.trips = (s.stats.trips || 0) + 1;
      const pool = Object.keys(D.CARDS).filter((k) => D.CARDS[k].origin === origin && D.CARDS[k].rarity !== 'legend');
      const ids = [];
      while (ids.length < 5 && pool.length) {
        const k = R.pick(s, pool);
        pool.splice(pool.indexOf(k), 1);
        ids.push(k);
      }
      s.trip5 = { origin, ids, picked: [] };
      return { trip: true };
    }
    return null;
  }

  // 出國五選二：每選一張呼叫一次，選滿兩張後清除 s.trip5 並呼叫 afterDay(s)
  function tripPick(s, idx) {
    if (!s || !s.trip5 || !Array.isArray(s.trip5.ids)) return null;
    const t5 = s.trip5;
    t5.picked = t5.picked || [];
    let i = typeof idx === 'string' ? t5.ids.indexOf(idx) : idx;
    if (i == null || i < 0 || i >= t5.ids.length || t5.picked.includes(i)) {
      i = t5.ids.findIndex((_, k) => !t5.picked.includes(k));
    }
    if (i < 0) return null;
    t5.picked.push(i);
    const res = R.addCard(s, t5.ids[i]);
    if (t5.picked.length >= D.ECON.tripPick) {
      s.trip5 = null;
      afterDay(s);
    }
    return res;
  }

  IE.Rounds = {
    on,
    roundOf,
    kindOf,
    dayOfNight,
    sig3,
    target,
    rentOf,
    offer,
    offerCost,
    rerollOffer,
    cardList,
    cardInfo,
    choose,
    afterDay,
    skipDay,
    tripPick,
  };
});
