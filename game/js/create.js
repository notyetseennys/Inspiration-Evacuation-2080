// 《靈感撤離 2080》創作規則：純邏輯，瀏覽器與 Node（tools/sim.js）共用。
// 每晚創作 = 從素材庫抽一手牌 → 下筆（打出 1 至 5 張）／改稿（換牌）→ 全部下筆的分數加起來就是今晚的作品。
// 每次下筆的分數 = (形式籌碼 + 素材籌碼 + 組合籌碼) × (形式倍率 + 加成) × 乘數 × 火花 × KPI × AI 模仿
// scorePlay 會回傳逐步的計分紀錄（steps），讓 craft.js 逐張演出。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA, RL = IE.Rules;
  const C = D.CRAFT;
  const FORM = {};
  D.FORMS.forEach((f) => { FORM[f.id] = f; });
  const r1 = (v) => Math.round(v * 10) / 10;
  const r2 = (v) => Math.round(v * 100) / 100;
  const decorOn = (s, id) => !!(IE.World && IE.World.decorOn(s, id));

  // ---------- 素材 ----------
  const cardOf = (s, uid) => s.cards.find((c) => c.uid === uid);
  const wearMult = (c) => Math.max(0.3, 1 - 0.12 * (c.wear || 0));
  function cardValue(s, c) {
    const perk = D.BACKGROUNDS[s.bg].perk;
    return Math.round(c.value * wearMult(c) * (perk.craftChips || 1) * (1 + 0.003 * s.attr.craft) * (decorOn(s, 'bookshelf') ? 1.05 : 1));
  }
  const MOD_FX = { shine: { chips: 30 }, burn: { mult: 4 }, tear: { xmult: 1.5 } };

  // ---------- 作品形式 ----------
  function tagCounts(cards) {
    const counts = {};
    cards.forEach((c) => c.tags.forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
    return counts;
  }
  function detectForm(cards) {
    const counts = tagCounts(cards);
    const weight = (t) => cards.filter((c) => c.tags.includes(t)).reduce((a, c) => a + c.value, 0);
    const tags = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || weight(b) - weight(a));
    const t0 = tags[0], t1 = tags[1];
    const c1 = counts[t0] || 0, c2 = counts[t1] || 0;
    const n = cards.length, distinct = tags.length;
    let id, keys = null;
    if (n === 5 && c1 >= 5 && c2 >= 5) { id = 'film'; keys = [t0, t1]; }
    else if (c1 >= 5) { id = 'epic'; keys = [t0]; }
    else if (c1 >= 4 && c2 >= 3) { id = 'symphony'; keys = [t0, t1]; }
    else if (c1 >= 4) { id = 'mural'; keys = [t0]; }
    else if (c1 >= 3 && c2 >= 2) { id = 'novel'; keys = [t0, t1]; }
    else if (n === 5 && distinct >= 7) { id = 'collage'; }
    else if (c1 >= 3) { id = 'song'; keys = [t0]; }
    else if (c1 >= 2 && c2 >= 2) { id = 'couplet'; keys = [t0, t1]; }
    else if (c1 >= 2) { id = 'poem'; keys = [t0]; }
    else id = 'sketch';
    let scoring;
    if (keys) scoring = cards.filter((c) => c.tags.some((t) => keys.includes(t)));
    else if (id === 'collage') scoring = cards.slice();
    else scoring = cards.length ? [cards.reduce((a, c) => (c.value > a.value ? c : a), cards[0])] : [];
    return { id, keys, scoring, counts, distinct };
  }
  const level = (s, id) => (s.forms && s.forms[id]) || 1;
  function formStats(s, id) {
    const f = FORM[id], l = level(s, id);
    return { chips: f.chips + (l - 1) * f.up[0], mult: f.mult + (l - 1) * f.up[1], level: l };
  }

  // ---------- 具名組合與 KPI ----------
  function matchRecipes(s, sel) {
    const counts = tagCounts(sel);
    return D.RECIPES.filter((r) => {
      const need = Object.keys(r.need);
      if (!need.length && !r.cond) return false;
      return need.every((t) => (counts[t] || 0) >= r.need[t]) && (!r.cond || r.cond(s, sel));
    });
  }
  const power = (r) => r.chips / 10 + r.mult * 10 + (Object.values(r.need).reduce((a, b) => a + b, 0)) * 0.5;
  function topRecipes(recs) {
    const regular = recs.filter((r) => !r.legend).sort((a, b) => power(b) - power(a)).slice(0, 2);
    return recs.filter((r) => r.legend).concat(regular);
  }
  function kpiMod(s, sel, recs) {
    const k = RL.kpi(s);
    if (k.tag) return sel.some((c) => c.tags.includes(k.tag)) ? k.mod : 1;
    if (k.special === 'lean') return sel.length >= 4 ? 0.5 : 1;
    if (k.special === 'pliable') return s.spark < 2 ? 1.5 : 1;
    if (k.special === 'novelty') {
      const named = recs.filter((r) => !r.legend);
      return named.length && named.every((r) => s.usedRecipes[r.id]) ? 0.2 : 1;
    }
    return 1;
  }
  // AI 模仿：同一種形式用得越密，AI 學得越快，倍率越低（每天消退四成）
  function aiFactor(s, form, objs) {
    const heat = ((s.style && s.style[form]) || 0) * (objs.some((o) => o.def.aiDouble) ? 2 : 1);
    return Math.max(0.4, r2(1 - 0.1 * Math.max(0, heat - 2)));
  }

  // ---------- 靈感物件 ----------
  // 碎鏡複製右邊那件物件的效果
  function activeObjects(s) {
    const ids = s.objects || [];
    return ids.map((id, i) => {
      let def = D.OBJ[id];
      if (def && def.copy) {
        const right = D.OBJ[ids[i + 1]];
        def = right && !right.copy ? Object.assign({}, right, { id, copyOf: right.id }) : null;
      }
      return def ? { id, slot: i, def } : null;
    }).filter(Boolean);
  }
  function objMods(s) {
    const m = { hand: 0, plays: 0, discards: 0 };
    activeObjects(s).forEach((o) => { const x = o.def.mods; if (x) Object.keys(x).forEach((k) => { m[k] += x[k]; }); });
    return m;
  }

  // ---------- 計分 ----------
  function scorePlay(s, uids, opt) {
    const sel = uids.map((u) => cardOf(s, u)).filter(Boolean);
    const F = detectForm(sel);
    const fs = formStats(s, F.id);
    let chips = fs.chips, mult = fs.mult;
    const steps = [{ t: 'form', form: F.id, level: fs.level, chips, mult, C: chips, M: mult }];
    const objs = activeObjects(s);
    const ses = s.session || {};
    const recs = matchRecipes(s, sel);
    const ctx = { s, sel, scoring: F.scoring, form: F.id, counts: F.counts, distinct: F.distinct,
      discardsUsed: ses.discardsUsed || 0, playIndex: (ses.log || []).length, kpiMod: kpiMod(s, sel, recs),
      roll: opt && opt.roll != null ? opt.roll : 0.5 };
    const apply = (e) => { if (e.chips) chips += e.chips; if (e.mult) mult += e.mult; if (e.xmult) mult *= e.xmult; };
    const snap = (o) => Object.assign(o, { C: Math.round(chips), M: r1(mult) });
    F.scoring.forEach((c, i) => {
      let reps = 1 + (c.mod === 'echo' ? 1 : 0);
      objs.forEach((o) => { if (o.def.retrig && o.def.retrig(c, ctx, i)) reps++; });
      for (let r = 0; r < reps; r++) {
        const v = cardValue(s, c);
        chips += v;
        steps.push(snap({ t: 'card', uid: c.uid, chips: v, again: r > 0 }));
        const mf = MOD_FX[c.mod];
        if (mf) { apply(mf); steps.push(snap(Object.assign({ t: 'mod', uid: c.uid, mod: c.mod }, mf))); }
        objs.forEach((o) => {
          if (!o.def.card) return;
          const e = o.def.card(c, ctx);
          if (e) { apply(e); steps.push(snap(Object.assign({ t: 'obj', id: o.id, slot: o.slot, uid: c.uid }, e))); }
        });
      }
    });
    // 組合：只有最強的一個一般組合計足，第二個計一半，其餘被埋沒；傳說組合全部計算並另外乘
    const sorted = topRecipes(recs);
    let primary = false;
    sorted.forEach((r) => {
      let m = r.mult;
      if (!r.legend) { if (primary) m = r.mult / 2; primary = true; }
      chips += r.chips; mult += m;
      if (r.xmult) mult *= r.xmult;
      steps.push(snap({ t: 'recipe', id: r.id, name: r.name, chips: r.chips, mult: m, xmult: r.xmult || 0, legend: !!r.legend, isNew: !s.discovered[r.id] }));
    });
    objs.forEach((o) => {
      if (!o.def.play) return;
      const e = o.def.play(ctx);
      if (e && (e.chips || e.mult || (e.xmult && e.xmult !== 1))) { apply(e); steps.push(snap(Object.assign({ t: 'obj', id: o.id, slot: o.slot }, e))); }
    });
    mult = Math.max(0, mult);
    const ai = aiFactor(s, F.id, objs);
    const wm = (RL.worldMods(s).signalMult) || 1;
    const tm = IE.World ? IE.World.tripMult(s) : 1;
    if (ai !== 1) steps.push({ t: 'ai', x: ai });
    if (wm !== 1) steps.push({ t: 'world', x: wm });
    if (tm !== 1) steps.push({ t: 'trip', x: tm, abroad: !!s.trip });
    if (ctx.kpiMod !== 1) steps.push({ t: 'kpi', x: ctx.kpiMod });
    steps.push({ t: 'spark', x: s.spark });
    const raw = Math.round(chips * mult * s.spark * ai * wm * tm);
    const total = Math.round(raw * ctx.kpiMod);
    const relief = r1(F.scoring.reduce((a, c) => a + (c.grams || 0), 0));
    return { form: F.id, level: fs.level, keys: F.keys, scoring: F.scoring.map((c) => c.uid), chips: Math.round(chips), mult: r1(mult),
      ai, kpi: ctx.kpiMod, world: wm, spark: s.spark, raw, total, steps, recipes: sorted.map((r) => r.id), relief };
  }

  // 下筆前的預覽：只顯示形式與可能觸發的組合（不計物件，留一點懸念）
  function preview(s, uids) {
    const sel = uids.map((u) => cardOf(s, u)).filter(Boolean);
    if (!sel.length) return null;
    const F = detectForm(sel);
    const fs = formStats(s, F.id);
    const all = matchRecipes(s, sel);
    const recs = topRecipes(all).map((r) => ({ id: r.id, name: r.name, known: !!s.discovered[r.id] || known(r.id), legend: !!r.legend }));
    return { form: F.id, name: FORM[F.id].name, level: fs.level, chips: fs.chips, mult: fs.mult, scoring: F.scoring.map((c) => c.uid),
      recipes: recs, ai: aiFactor(s, F.id, activeObjects(s)) };
  }
  const known = (id) => { const m = (IE.Game && IE.Game.meta) || {}; return !!(m.recipes && m.recipes[id]); };

  // ---------- 一晚的創作 ----------
  function canStart(s, mode) {
    const cost = mode === 'allnighter' ? C.allnighterCost : C.cost;
    if (s.spark < 1) return '火花不足 ×1.0，你甚麼都想不出來';
    if (s.cards.length < 3) return '素材庫最少要有 3 張素材';
    if (s.cr < cost) return '連 $' + cost + ' 材料費都付不起';
    if (mode === 'allnighter' && s.body <= 20) return '身體撐不住通宵';
    return null;
  }
  function shuffle(s, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(RL.rand(s) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function start(s, mode) {
    const all = mode === 'allnighter';
    const m = objMods(s);
    const perk = D.BACKGROUNDS[s.bg].perk;
    const refund = { cr: all ? C.allnighterCost : C.cost, body: all ? 15 : 4, spark: s.spark };
    s.cr -= refund.cr;
    RL.hurt(s, refund.body, all ? 'allnighter' : 'create');
    if (all) { RL.addSpark(s, -0.2, true); s.allnighterDay = s.day; }
    s.session = {
      mode: all ? 'allnighter' : 'normal', day: s.day,
      deck: shuffle(s, s.cards.map((c) => c.uid)), hand: [],
      handSize: C.hand + (s.handBonus || 0) + (perk.handBonus || 0) + m.hand + (s.trip ? 1 : 0),
      plays: C.plays + m.plays + (all ? 1 : 0) + (RL.worldMods(s).extraPlay || 0), discards: C.discards + m.discards + (all ? 1 : 0) + (decorOn(s, 'easel') ? 1 : 0),
      discardsUsed: 0, log: [], total: 0, raw: 0, fresh: [], relief: 0, notes: [], used: [], reshuffled: 0, refund,
    };
    draw(s);
    return s.session;
  }
  function draw(s) {
    const ses = s.session;
    // 素材庫抽完了：把用過的素材洗回去（再用會更殘）
    if (ses.deck.length < ses.handSize - ses.hand.length && ses.used.length) {
      ses.deck = ses.deck.concat(shuffle(s, ses.used));
      ses.used = [];
      ses.reshuffled++;
    }
    while (ses.hand.length < ses.handSize && ses.deck.length) {
      const uid = ses.deck.shift();
      if (cardOf(s, uid)) ses.hand.push(uid);
    }
  }
  function play(s, uids) {
    const ses = s.session;
    if (!ses || ses.plays <= 0 || !uids.length || uids.length > 5 || !uids.every((u) => ses.hand.includes(u))) return null;
    const res = scorePlay(s, uids, { roll: RL.rand(s) });
    // 用過的素材會磨損；寫進作品的愧疚會被卸下
    res.scoring.forEach((u) => { const c = cardOf(s, u); if (c) c.wear = (c.wear || 0) + 1; });
    const guilt = res.scoring.map((u) => cardOf(s, u)).filter((c) => c && c.guilt);
    let relief = 0;
    if (guilt.length) {
      relief = RL.atone(s, guilt.reduce((a, c) => a + (c.grams || 0), 0), null);
      s.stats.confessions = (s.stats.confessions || 0) + guilt.length;
      const gone = new Set(guilt.map((c) => c.uid));
      s.cards = s.cards.filter((c) => !gone.has(c.uid));
    }
    res.reliefApplied = relief;
    ses.relief = r1(ses.relief + relief);
    // 新組合帶來靈光一閃
    res.fresh = res.recipes.filter((id) => !s.discovered[id]);
    res.fresh.forEach((id) => { s.discovered[id] = true; });
    if (res.fresh.length) res.sparkUp = RL.addSpark(s, 0.15, true);
    res.recipes.forEach((id) => { s.usedRecipes[id] = true; });
    ses.fresh.push(...res.fresh);
    s.formsSeen = s.formsSeen || {};
    s.formsSeen[res.form] = true;
    const objs = activeObjects(s);
    s.style = s.style || {};
    s.style[res.form] = (s.style[res.form] || 0) + 1;
    // 物件的代價
    const notes = [];
    objs.forEach((o) => {
      if (!o.def.after) return;
      const e = o.def.after({ s });
      if (e.sin) notes.push(D.OBJ[o.id].name + '：靈魂 +' + RL.sin(s, e.sin, null) + ' 克');
      if (e.spark) { RL.addSpark(s, e.spark, true); notes.push(D.OBJ[o.id].name + '：火花 ' + e.spark); }
      if (e.cr) { s.cr += e.cr; notes.push(D.OBJ[o.id].name + '：+$' + e.cr); }
    });
    res.notes = notes;
    ses.notes.push(...notes);
    ses.total += res.total; ses.raw += res.raw;
    ses.log.push({ form: res.form, total: res.total, raw: res.raw, recipes: res.recipes, tags: uids.map((u) => (cardOf(s, u) || { tags: [] }).tags).flat() });
    ses.plays--;
    ses.hand = ses.hand.filter((u) => !uids.includes(u) && cardOf(s, u));
    ses.used.push(...uids.filter((u) => cardOf(s, u)));
    s.stats.bestPlay = Math.max(s.stats.bestPlay || 0, res.total);
    if (ses.plays > 0) draw(s);
    return res;
  }
  function discard(s, uids) {
    const ses = s.session;
    if (!ses || ses.discards <= 0 || !uids.length || uids.length > 5 || !uids.every((u) => ses.hand.includes(u))) return false;
    ses.hand = ses.hand.filter((u) => !uids.includes(u));
    ses.used.push(...uids);
    ses.discards--; ses.discardsUsed++;
    draw(s);
    return true;
  }
  function workName(log) {
    const best = log.reduce((a, x) => (x.total > a.total ? x : a), log[0]);
    const rec = best.recipes.map((id) => D.RECIPES.find((r) => r.id === id)).filter(Boolean)
      .sort((a, b) => (b.legend ? 100 : 0) + b.mult - ((a.legend ? 100 : 0) + a.mult))[0];
    if (rec) return rec.name;
    const counts = {};
    best.tags.forEach((t) => { counts[t] = (counts[t] || 0) + 1; });
    const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    return FORM[best.form].name + (top ? '・' + D.TAGS[top].name : '');
  }
  function finish(s) {
    const ses = s.session;
    if (!ses) return null;
    s.session = null;
    if (!ses.log.length) return { work: null, session: ses };
    const best = ses.log.reduce((a, x) => (x.total > a.total ? x : a), ses.log[0]);
    const tagCount = {};
    ses.log.forEach((x) => x.tags.forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; }));
    const work = { day: s.day, quarter: s.quarter, name: workName(ses.log), tags: Object.keys(tagCount).sort((a, b) => tagCount[b] - tagCount[a]),
      score: ses.total, raw: ses.raw, medium: D.BACKGROUNDS[s.bg].medium, n: ses.log.length, form: best.form };
    s.works.push(work);
    s.stats.works++;
    s.stats.actions.create = (s.stats.actions.create || 0) + 1;
    if (!s.stats.bestWork || work.raw > s.stats.bestWork.raw) s.stats.bestWork = work;
    s.saturation = Math.min(1.15, s.saturation + 0.02);
    RL.train(s, { craft: 1.2, imag: 0.5 }, null);
    const paid = IE.World ? IE.World.settleCommissions(s, ses) : [];
    return { work, session: ses, paid };
  }
  // 還未下筆就離開：退回材料費與體力
  function cancel(s) {
    const ses = s.session;
    if (!ses || ses.log.length) return false;
    s.cr += ses.refund.cr; s.body += ses.refund.body; s.spark = ses.refund.spark;
    if (ses.mode === 'allnighter') s.allnighterDay = 0;
    s.session = null;
    return true;
  }
  // 每天 AI 對你風格的記憶消退四成
  function newDay(s) {
    if (!s.style) return;
    Object.keys(s.style).forEach((k) => { s.style[k] = r2(s.style[k] * 0.6); if (s.style[k] < 0.05) delete s.style[k]; });
  }

  // ---------- 模擬用：找出這手牌最好的下筆 ----------
  function bestPlay(s) {
    const ses = s.session;
    const hand = ses.hand.map((u) => cardOf(s, u)).filter(Boolean);
    if (!hand.length) return null;
    const cands = new Map();
    const add = (cards) => { const uids = cards.slice(0, 5).map((c) => c.uid); if (uids.length) cands.set(uids.slice().sort().join(','), uids); };
    const byVal = hand.slice().sort((a, b) => b.value - a.value);
    add(byVal);
    const tags = [...new Set(hand.flatMap((c) => c.tags))];
    tags.forEach((t) => add(byVal.filter((c) => c.tags.includes(t))));
    tags.forEach((a, i) => tags.slice(i + 1).forEach((b) => add(byVal.filter((c) => c.tags.includes(a) || c.tags.includes(b)))));
    // 湊組合：每個已知組合各試一次
    D.RECIPES.forEach((r) => {
      const need = Object.keys(r.need);
      if (!need.length) return;
      const pick = [];
      need.forEach((t) => byVal.filter((c) => c.tags.includes(t) && !pick.includes(c)).slice(0, r.need[t]).forEach((c) => pick.push(c)));
      if (pick.length <= 5) add(pick);
    });
    let best = null;
    cands.forEach((uids) => {
      const sc = scorePlay(s, uids);
      if (!best || sc.total > best.total) best = { uids, total: sc.total, form: sc.form };
    });
    return best;
  }

  IE.Create = {
    FORM, cardValue, wearMult, tagCounts, detectForm, formStats, level, matchRecipes, kpiMod, aiFactor,
    activeObjects, objMods, topRecipes, scorePlay, preview, canStart, start, draw, play, discard, finish, cancel, newDay, bestPlay,
  };
});
