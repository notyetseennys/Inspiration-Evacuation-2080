// 《靈感撤離 2080》創作規則：純邏輯，瀏覽器與 Node（tools/sim.js）共用。
// 每晚創作 = 從素材庫抽一手牌 → 下筆（打出 1 至 5 張）／改稿（換牌）→ 全部下筆的分數加起來就是今晚的作品。
// 每次下筆的分數 = (形式籌碼 + 素材籌碼 + 組合籌碼) × (形式倍率 + 加成) × 乘數 × 火花 × KPI × AI 模仿
// 第七期：素材有第二條軸「媒材」（決定連作、跨界等形式）；靈感物件分為十個流派，兩件同流派觸發流派加成。
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
  const has = (c, t) => c.tags.includes(t);
  const med = (c) => D.mediumOf(c);
  const perkOf = (s) => D.BACKGROUNDS[s.bg].perk || {};
  function mediaCounts(cards) {
    const m = {};
    cards.forEach((c) => { const k = med(c); m[k] = (m[k] || 0) + 1; });
    return m;
  }
  // 作品形式由低至高（決定「差一張」提示是否算升級）
  const RANK = ['sketch', 'poem', 'couplet', 'song', 'collage', 'crossover', 'novel', 'series', 'mural', 'symphony', 'epic', 'trilogy', 'opus', 'film'];

  // ---------- 素材 ----------
  const cardOf = (s, uid) => s.cards.find((c) => c.uid === uid);
  const wearMult = (c) => Math.max(0.3, 1 - 0.12 * (c.wear || 0));
  function cardValue(s, c) {
    const perk = D.BACKGROUNDS[s.bg].perk;
    return Math.round(c.value * (schoolOn(s, 'cliche') ? 1 : wearMult(c)) * (perk.dataChips && med(c) === 'data' ? perk.dataChips : 1) * (perk.craftChips || 1) * (1 + 0.003 * s.attr.craft) * (decorOn(s, 'bookshelf') ? 1.05 : 1) * (c.rarity === 'rare' && perk.rareChips ? perk.rareChips : 1));
  }
  const MOD_FX = { shine: { chips: 30 }, burn: { mult: 4 }, tear: { xmult: 1.5 } };

  // ---------- 起承轉合（第十三期）：下筆的次序就是作品的結構 ----------
  // 起：定下主題。承：和起有相同標籤 → 呼應。轉：和前兩張完全不同 → 反轉。
  // 合：和起有相同標籤 → 首尾呼應；同時接回轉的標籤 → 收束。尾：和合有相同標籤 → 餘韻。
  // 系列作：這一筆的起延續上一筆的主題，同一晚越連越強。
  const POS = ['起', '承', '轉', '合', '尾'];
  const shares = (a, b) => !!a && !!b && a.tags.some((t) => b.tags.includes(t));
  function structure(s, sel) {
    const [a, b, c, d, e] = sel;
    const ses = (s && s.session) || {};
    const out = [];
    const twist = !!c && !shares(c, a) && !shares(c, b);
    if (b) out.push({ id: 'echo', name: '呼應', pos: 1, mult: 2, ok: shares(a, b), need: '「承」要和「起」有相同標籤' });
    if (c) out.push({ id: 'twist', name: '反轉', pos: 2, xmult: 1.5, ok: twist, need: '「轉」要和前兩張完全沒有相同標籤' });
    if (d) {
      out.push({ id: 'callback', name: '首尾呼應', pos: 3, xmult: 1.5, ok: shares(d, a), need: '「合」要和「起」有相同標籤' });
      out.push({ id: 'resolve', name: '收束', pos: 3, xmult: 1.5, ok: twist && shares(d, a) && shares(d, c), need: '「合」同時要有「轉」的標籤（雙標籤素材最合用）' });
    }
    if (e) out.push({ id: 'coda', name: '餘韻', pos: 4, mult: 3, ok: shares(e, d), need: '「尾」要和「合」有相同標籤' });
    if (a && ses.lastTheme && a.tags.some((t) => ses.lastTheme.includes(t))) out.push({ id: 'series', name: '系列作', pos: 0, xmult: r2(1 + 0.25 * (ses.themeStreak || 1)), ok: true, need: '' });
    return out;
  }
  // 自動排列（模擬機械人用）：主題最多的做起，同主題做承，完全不同的做轉，能接回兩邊的做合
  function arrange(cards) {
    if (cards.length < 3) return cards.slice();
    const cnt = tagCounts(cards);
    const theme = Object.keys(cnt).sort((x, y) => cnt[y] - cnt[x])[0];
    const pool = cards.slice().sort((x, y) => y.value - x.value);
    const take = (f) => { const i = pool.findIndex(f); return i >= 0 ? pool.splice(i, 1)[0] : null; };
    const a = take((c) => c.tags.includes(theme)) || pool.shift();
    const b = take((c) => shares(c, a)) || pool.shift();
    const c = take((x) => !shares(x, a) && !shares(x, b)) || pool.shift();
    const d = take((x) => shares(x, a) && shares(x, c)) || take((x) => shares(x, a)) || pool.shift();
    return [a, b, c, d].concat(pool).filter(Boolean);
  }

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
    // 媒材：四張或以上同一種 = 連作（相當於同花）；五種各一 = 跨界（相當於順子）；五張同一種配合標籤 = 三部曲、傑作
    const media = mediaCounts(cards), mdistinct = Object.keys(media).length;
    const m0 = Object.keys(media).sort((a, b) => media[b] - media[a])[0];
    const same = n >= 5 && mdistinct === 1, cross = n >= 5 && mdistinct === 5, run = (media[m0] || 0) >= 4;
    let id, keys = null, all = false;
    if (n >= 5 && c1 >= n && c2 >= n) { id = 'film'; keys = [t0, t1]; }
    else if (same && c1 >= 5) { id = 'opus'; keys = [t0]; all = true; }
    else if (same && c1 >= 3 && c2 >= 2) { id = 'trilogy'; keys = [t0, t1]; all = true; }
    else if (c1 >= 5) { id = 'epic'; keys = [t0]; }
    else if (c1 >= 4 && c2 >= 3) { id = 'symphony'; keys = [t0, t1]; }
    else if (c1 >= 4) { id = 'mural'; keys = [t0]; }
    else if (run) { id = 'series'; }
    else if (c1 >= 3 && c2 >= 2) { id = 'novel'; keys = [t0, t1]; }
    else if (cross) { id = 'crossover'; all = true; }
    else if (n >= 5 && distinct >= 7) { id = 'collage'; }
    else if (c1 >= 3) { id = 'song'; keys = [t0]; }
    else if (c1 >= 2 && c2 >= 2) { id = 'couplet'; keys = [t0, t1]; }
    else if (c1 >= 2) { id = 'poem'; keys = [t0]; }
    else id = 'sketch';
    let scoring;
    if (all || id === 'collage') scoring = cards.slice();
    else if (id === 'series') scoring = cards.filter((c) => med(c) === m0);
    else if (keys) scoring = cards.filter((c) => c.tags.some((t) => keys.includes(t)));
    else scoring = cards.length ? [cards.reduce((a, c) => (c.value > a.value ? c : a), cards[0])] : [];
    return { id, keys, scoring, counts, distinct, media, mdistinct, same };
  }
  const level = (s, id) => (s.forms && s.forms[id]) || 1;
  function formStats(s, id) {
    const f = FORM[id], l = level(s, id);
    return { chips: f.chips + (l - 1) * f.up[0], mult: f.mult + (l - 1) * f.up[1], level: l };
  }

  // ---------- 具名組合與 KPI ----------
  // 具名組合要「純」：下筆的每一張素材，都要有組合要求的其中一個標籤（像同花一樣，要刻意湊）
  const pure = (r, sel) => sel.every((c) => c.tags.some((t) => r.need[t]));
  function matchRecipes(s, sel) {
    const counts = tagCounts(sel);
    return D.RECIPES.filter((r) => {
      const need = Object.keys(r.need);
      if (!need.length && !r.cond) return false;
      return need.every((t) => (counts[t] || 0) >= r.need[t]) && (!need.length || pure(r, sel)) && (!r.cond || r.cond(s, sel));
    });
  }
  const power = (r) => r.chips / 10 + r.mult * 10 + (Object.values(r.need).reduce((a, b) => a + b, 0)) * 0.5;
  function topRecipes(recs) {
    const regular = recs.filter((r) => !r.legend).sort((a, b) => power(b) - power(a)).slice(0, 2);
    return recs.filter((r) => r.legend).concat(regular);
  }
  function kpiMod(s, sel, recs) {
    const k = RL.kpi(s);
    // 文案的「包裝」：今晚的作品一律當作符合 KPI
    if (s.session && s.session.packaged) return k.tag ? Math.max(1, k.mod) : k.special === 'pliable' ? 1.5 : 1;
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
  // 機械流（三件）完全不受 AI 模仿影響；某些物件令 AI 學得更快或更慢
  function aiFactor(s, form, objs, schools) {
    const P = perkOf(s);
    if ((schools || []).some((x) => x.def.noAI && x.n >= x.def.noAI)) return 1;
    const speed = objs.reduce((a, o) => a * (o.def.aiMult || (o.def.aiDouble ? 2 : 1)), 1) * (P.aiSpeed || 1);
    const heat = ((s.style && s.style[form]) || 0) * speed;
    // 覺醒的 AI：模仿自己反而越來越強
    if (P.aiInvert) return Math.min(2, r2(1 + 0.12 * heat));
    const pen = 0.1 * Math.max(0, heat - 2) * (objs.some((o) => o.def.aiHalf) ? 0.5 : 1);
    return Math.max(0.4, r2(1 - pen));
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
  // 流派：數一數裝備中每個流派的物件，兩件或以上觸發流派加成
  function schoolCounts(s, objs) {
    const n = {};
    (objs || activeObjects(s)).forEach((o) => { const sc = D.OBJ[o.id] && D.OBJ[o.id].school; if (sc) n[sc] = (n[sc] || 0) + 1; });
    return n;
  }
  function activeSchools(s, objs) {
    const n = schoolCounts(s, objs);
    return Object.keys(n).filter((k) => n[k] >= 2 && D.SCHOOLS[k] && !(k === 'hunger' && perkOf(s).noHunger)).map((k) => ({ id: k, n: n[k], def: D.SCHOOLS[k] }));
  }
  // 外星評審「純粹主義」令物件與流派全部失效
  const objsOff = (s) => !!(s.session && s.session.stage && IE.Stages && s.session.stage.rules.some((id) => IE.Stages.BOSS[id].noObjects));
  const schoolOn = (s, id, k) => !objsOff(s) && (schoolCounts(s)[id] || 0) >= (k || 2);
  // 「反叛」素材無視外星評審的規則（斷線鉗，或者三件反叛流）
  const freeOfRules = (s, c) => has(c, 'rebel') && !objsOff(s) && (activeObjects(s).some((o) => o.def.freeRebel) || schoolOn(s, 'rebel', D.SCHOOLS.rebel.freeRebel));
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
    const SR = IE.Stages && s.session ? IE.Stages.scoring(s) : null;
    const objs = SR && SR.noObjects ? [] : activeObjects(s);
    const schools = activeSchools(s, objs);
    const ses = s.session || {};
    const recs = matchRecipes(s, sel);
    const held = (ses.hand || []).filter((u) => !uids.includes(u)).map((u) => cardOf(s, u)).filter(Boolean);
    const ctx = { s, sel, scoring: F.scoring, form: F.id, counts: F.counts, distinct: F.distinct, media: F.media, mdistinct: F.mdistinct,
      discardsUsed: ses.discardsUsed || 0, playIndex: (ses.log || []).length, kpiMod: kpiMod(s, sel, recs), ses: s.session || null, held,
      roll: opt && opt.roll != null ? opt.roll : 0.5 };
    const times = (r) => (r === true ? 1 : r || 0);
    const noWear = schools.some((x) => x.def.noWear);
    const apply = (e) => { if (e.chips) chips += e.chips; if (e.mult) mult += e.mult; if (e.xmult) mult *= e.xmult; };
    const snap = (o) => Object.assign(o, { C: Math.round(chips), M: r1(mult) });
    F.scoring.forEach((c, i) => {
      // 外星評審的規則：某些素材不計分
      if (SR && SR.blocked(c)) { steps.push(snap({ t: 'blocked', uid: c.uid })); return; }
      let reps = 1 + (c.mod === 'echo' ? 1 : 0) + (perkOf(s).allTwice ? 1 : 0);
      objs.forEach((o) => { if (o.def.retrig) reps += times(o.def.retrig(c, ctx, i)); });
      schools.forEach((x) => { if (x.def.retrig) reps += times(x.def.retrig(c, ctx, i, x.n)); });
      for (let r = 0; r < reps; r++) {
        const v = SR && SR.extraWear && !noWear ? Math.round(cardValue(s, c) * wearMult({ wear: (c.wear || 0) + SR.extraWear }) / wearMult(c)) : cardValue(s, c);
        chips += v;
        steps.push(snap({ t: 'card', uid: c.uid, chips: v, again: r > 0 }));
        const mf = MOD_FX[c.mod];
        if (mf) { apply(mf); steps.push(snap(Object.assign({ t: 'mod', uid: c.uid, mod: c.mod }, mf))); }
        objs.forEach((o) => {
          if (!o.def.card) return;
          const e = o.def.card(c, ctx);
          if (e) { apply(e); steps.push(snap(Object.assign({ t: 'obj', id: o.id, slot: o.slot, uid: c.uid }, e))); }
        });
        schools.forEach((x) => {
          if (!x.def.card) return;
          const e = x.def.card(c, ctx, x.n);
          if (e) { apply(e); steps.push(snap(Object.assign({ t: 'school', school: x.id, uid: c.uid }, e))); }
        });
      }
    });
    // 留在手牌、沒有打出的素材（例如魚缸）
    held.forEach((c) => objs.forEach((o) => {
      if (!o.def.held) return;
      const e = o.def.held(c, ctx);
      if (e) { apply(e); steps.push(snap(Object.assign({ t: 'obj', id: o.id, slot: o.slot, uid: c.uid, held: true }, e))); }
    }));
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
    schools.forEach((x) => {
      if (!x.def.play) return;
      const e = x.def.play(ctx, x.n);
      if (e && (e.chips || e.mult || (e.xmult && e.xmult !== 1))) { apply(e); steps.push(snap(Object.assign({ t: 'school', school: x.id }, e))); }
    });
    // 起承轉合：按次序判斷結構技巧
    const struct = structure(s, sel);
    struct.filter((x) => x.ok).forEach((x) => {
      apply({ mult: x.mult, xmult: x.xmult });
      steps.push(snap({ t: 'struct', id: x.id, name: x.name, pos: x.pos, mult: x.mult || 0, xmult: x.xmult || 0, uid: sel[x.pos] && sel[x.pos].uid }));
    });
    mult = Math.max(0, mult);
    const ai = aiFactor(s, F.id, objs, schools);
    const wm = (RL.worldMods(s).signalMult) || 1;
    const tm = IE.World ? IE.World.tripMult(s) : 1;
    const wt = RL.weatherTag ? RL.weatherTag(s, sel) : null, wx = wt ? wt.x : 1;
    const sm = SR ? SR.mult(F.id, ctx.kpiMod, sel) : 1;
    const sp = s.spark * (SR ? SR.sparkMult : 1);
    if (ai !== 1) steps.push({ t: 'ai', x: ai });
    if (sm !== 1) steps.push({ t: 'stage', x: sm, name: SR.names.join('・') });
    if (wm !== 1) steps.push({ t: 'world', x: wm });
    if (tm !== 1) steps.push({ t: 'trip', x: tm, abroad: !!s.trip });
    if (wt) steps.push({ t: 'weather', x: wx, name: wt.name });
    if (ctx.kpiMod !== 1) steps.push({ t: 'kpi', x: ctx.kpiMod });
    steps.push({ t: 'spark', x: sp });
    const raw = Math.round(chips * mult * sp * ai * wm * tm * sm * wx);
    const total = Math.round(raw * ctx.kpiMod);
    const relief = r1(F.scoring.reduce((a, c) => a + (c.grams || 0), 0));
    return { form: F.id, level: fs.level, keys: F.keys, scoring: F.scoring.map((c) => c.uid), chips: Math.round(chips), mult: r1(mult),
      ai, kpi: ctx.kpiMod, world: wm, spark: s.spark, raw, total, steps, recipes: sorted.map((r) => r.id), relief, schools: schools.map((x) => x.id) };
  }

  // 下筆前的預覽：只顯示形式與可能觸發的組合（不計物件，留一點懸念）
  function preview(s, uids) {
    const sel = uids.map((u) => cardOf(s, u)).filter(Boolean);
    if (!sel.length) return null;
    const F = detectForm(sel);
    const fs = formStats(s, F.id);
    const all = matchRecipes(s, sel);
    const recs = topRecipes(all).map((r) => ({ id: r.id, name: r.name, known: !!s.discovered[r.id] || known(r.id), legend: !!r.legend }));
    // 預計得分（包括物件；黑盒之類的隨機效果按中間值計）與「差一張」提示
    const est = scorePlay(s, uids, { roll: 0.5 });
    const have = new Set(all.map((r) => r.id));
    const ses = s.session;
    const hints = [];
    if (ses && uids.length < 5) {
      ses.hand.filter((u) => !uids.includes(u)).forEach((u) => {
        const c = cardOf(s, u);
        if (!c) return;
        matchRecipes(s, sel.concat(c)).filter((r) => !have.has(r.id) && !r.legend).forEach((r) => {
          if (!hints.some((h) => h.recipe === r.id)) hints.push({ uid: u, card: c.name, recipe: r.id, name: (s.discovered[r.id] || known(r.id)) ? r.name : '？？？', power: power(r) });
        });
        // 再加一張就升級成更高的作品形式（例如連作、跨界）
        const F2 = detectForm(sel.concat(c));
        if (RANK.indexOf(F2.id) > RANK.indexOf(F.id) && RANK.indexOf(F2.id) >= RANK.indexOf('crossover') && !hints.some((h) => h.form === F2.id)) {
          const f2 = FORM[F2.id];
          hints.push({ uid: u, card: c.name, form: F2.id, name: f2.name, power: f2.chips / 10 + f2.mult * 10 });
        }
      });
    }
    hints.sort((a, b) => b.power - a.power);
    return { form: F.id, name: FORM[F.id].name, level: fs.level, chips: fs.chips, mult: fs.mult, scoring: F.scoring.map((c) => c.uid),
      recipes: recs, ai: aiFactor(s, F.id, activeObjects(s), activeSchools(s)), est: est.total, estChips: est.chips, estMult: est.mult, hints: hints.slice(0, 3),
      blocked: est.steps.filter((x) => x.t === 'blocked').length };
  }
  const known = (id) => { const m = (IE.Game && IE.Game.meta) || {}; return !!(m.recipes && m.recipes[id]); };

  // ---------- 手牌建議（第九期：創作桌的指引） ----------
  // 試遍手牌裡所有可以下筆的組合，每種作品形式留下預計得分最高的一組。
  // 用的是真正的計分（物件、流派、KPI、評審規則都計在內），所以建議的分數和下筆後的分數一致。
  function suggest(s, uids, limit) {
    const cards = uids.map((u) => cardOf(s, u)).filter((c) => c && !forbidden(s, c));
    const k = Math.min(maxCards(s), cards.length);
    const best = {};
    const pick = [];
    let n = 0;
    const visit = (i) => {
      if (pick.length) {
        const ids = pick.map((c) => c.uid);
        const F = detectForm(pick);
        const total = scorePlay(s, ids, { roll: 0.5 }).total;
        const cur = best[F.id];
        // 同分時用較少的素材（陪襯不計分，留在手上更有用）
        if (!cur || total > cur.est || (total === cur.est && ids.length < cur.uids.length)) best[F.id] = { form: F.id, uids: ids, est: total, keys: F.keys, media: F.id === 'series' ? med(F.scoring[0]) : null };
      }
      if (pick.length >= k || ++n > 4000) return;
      for (let j = i; j < cards.length; j++) { pick.push(cards[j]); visit(j + 1); pick.pop(); }
    };
    visit(0);
    return Object.values(best).filter((x) => x.est > 0).sort((a, b) => b.est - a.est).slice(0, limit || 4).map((x) => {
      const sel = x.uids.map((u) => cardOf(s, u));
      const fs = formStats(s, x.form);
      const recipes = topRecipes(matchRecipes(s, sel)).map((r) => ({ id: r.id, name: r.name, known: !!s.discovered[r.id] || known(r.id), legend: !!r.legend }));
      return Object.assign(x, { name: FORM[x.form].name, level: fs.level, chips: fs.chips, mult: fs.mult, recipes });
    });
  }
  // 改稿方向：保留手上最多的一種標籤（或媒材），換走其他素材，追更高一級的作品形式。
  // 機會率按牌庫裡還有多少張計算（牌庫不夠時，用過的素材會洗回去）。
  const TAG_FORM = { 3: 'song', 4: 'mural', 5: 'epic' };
  function chase(s, limit) {
    const ses = s.session;
    if (!ses || ses.discards <= 0 || ses.plays <= 0 || (perkOf(s).noEarlyDiscard && !ses.log.length)) return [];
    const hand = ses.hand.map((u) => cardOf(s, u)).filter(Boolean);
    const maxDisc = Math.max(5, maxCards(s));
    const comb = (n, r) => { if (r < 0 || r > n) return 0; let v = 1; for (let i = 0; i < r; i++) v = v * (n - i) / (i + 1); return v; };
    // 抽 k 張，至少有一張是目標的機會
    const odds = (match, k) => {
      const deck = ses.deck.map((u) => cardOf(s, u)).filter(Boolean);
      const hit = (pool) => pool.filter(match).length;
      if (deck.length >= k) return 1 - comb(deck.length - hit(deck), k) / comb(deck.length, k);
      if (hit(deck)) return 1;
      const rest = ses.used.map((u) => cardOf(s, u)).filter(Boolean), r = k - deck.length;
      return rest.length ? 1 - comb(rest.length - hit(rest), Math.min(r, rest.length)) / comb(rest.length, Math.min(r, rest.length)) : 0;
    };
    const out = [];
    const plan = (goal, match, label) => {
      const keep = hand.filter(match);
      const toss = hand.filter((c) => !match(c)).sort((a, b) => cardValue(s, a) - cardValue(s, b)).slice(0, maxDisc);
      if (!toss.length || keep.length + toss.length < 4) return;
      const p = odds(match, toss.length);
      if (p < 0.12) return;
      const fs = formStats(s, goal);
      out.push({ goal, name: FORM[goal].name, label, keep: keep.length, uids: toss.map((c) => c.uid), odds: Math.round(p * 100), value: p * fs.chips * fs.mult });
    };
    const tc = tagCounts(hand);
    Object.keys(tc).forEach((t) => { if (TAG_FORM[tc[t] + 1]) plan(TAG_FORM[tc[t] + 1], (c) => has(c, t), { tag: t }); });
    const mc = mediaCounts(hand);
    Object.keys(mc).forEach((m) => { if (mc[m] === 3) plan('series', (c) => med(c) === m, { medium: m }); });
    return out.sort((a, b) => b.value - a.value).slice(0, limit || 2);
  }

  // ---------- 一晚的創作 ----------
  // 標準模式（60 天）：不是關卡之夜的晚上，「創作」是只下筆一次的速寫，令一局保持在一小時左右
  const stageTonight = (s) => !!(IE.Stages && IE.Stages.today(s) && !(s.stageDone && s.stageDone[s.day]));
  const isSketch = (s, mode) => mode === 'normal' && RL.modeOf(s).sketch && !stageTonight(s);
  function canStart(s, mode) {
    const cost = mode === 'allnighter' ? C.allnighterCost : isSketch(s, mode) ? C.sketchCost : C.cost;
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
    const all = mode === 'allnighter', sketch = isSketch(s, mode);
    const m = objMods(s);
    const perk = D.BACKGROUNDS[s.bg].perk;
    const refund = { cr: all ? C.allnighterCost : sketch ? C.sketchCost : C.cost, body: all ? 15 : sketch ? 2 : 4, spark: s.spark };
    s.cr -= refund.cr;
    RL.hurt(s, refund.body, all ? 'allnighter' : 'create');
    if (all) { RL.addSpark(s, -0.2, true); s.allnighterDay = s.day; }
    s.session = {
      mode: all ? 'allnighter' : sketch ? 'sketch' : 'normal', day: s.day,
      deck: shuffle(s, s.cards.map((c) => c.uid)), hand: [],
      handSize: C.hand + (s.handBonus || 0) + (perk.handBonus || 0) + m.hand + (s.trip ? 1 : 0) + (IE.World ? IE.World.stampBonus(s).hand : 0),
      plays: (perk.playsSet || C.plays) + m.plays + (all ? 1 : 0) + (RL.worldMods(s).extraPlay || 0) + (IE.World ? IE.World.stampBonus(s).plays : 0), discards: Math.max(0, C.discards + m.discards + (all ? 1 : 0) + (decorOn(s, 'easel') ? 1 : 0) - (IE.Meta ? IE.Meta.stakeMod(s, 'discards') : 0)),
      discardsUsed: 0, log: [], total: 0, raw: 0, fresh: [], relief: 0, notes: [], used: [], reshuffled: 0, refund,
    };
    // 速寫：只下筆一次、改稿一次
    if (sketch) { s.session.plays = 1; s.session.discards = Math.min(1, s.session.discards); }
    s.session.base = { plays: s.session.plays, discards: s.session.discards, handSize: s.session.handSize };
    s.session.abil = { used: 0, bought: 0 };
    // 關卡之夜：設定目標分數與外星評審的規則
    if (IE.Stages) IE.Stages.onStart(s, s.session);
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
  // 每次下筆最多幾張：一般五張；章魚星人詩人八張；外星評審「小品展」三張
  function maxCards(s) {
    const SR = IE.Stages ? IE.Stages.scoring(s) : null;
    return Math.min(perkOf(s).maxCards || 5, SR ? SR.maxCards : 8);
  }
  // 不能下筆的素材：外星評審禁止的；覺醒的 AI 不能用「愧疚」
  function forbidden(s, c) {
    if (!c) return false;
    if (perkOf(s).noGuilt && c.guilt) return true;
    const SR = IE.Stages ? IE.Stages.scoring(s) : null;
    return !!(SR && SR.forbidden(c));
  }
  // 時間旅人的「倒帶」：每次下筆之前存一份狀態
  const snapshot = (s) => JSON.stringify(s, (k, v) => (k === 'undo' || k === 'dayStart' ? undefined : v));
  function restore(s, snap) {
    const o = JSON.parse(snap);
    Object.keys(s).forEach((k) => { if (k !== 'dayStart' && !(k in o)) delete s[k]; });
    Object.assign(s, o);
  }
  function play(s, uids) {
    const ses = s.session;
    if (!ses || ses.plays <= 0 || !uids.length || uids.length > maxCards(s) || !uids.every((u) => ses.hand.includes(u))) return null;
    if (uids.some((u) => forbidden(s, cardOf(s, u)))) return null;
    const SR = IE.Stages ? IE.Stages.scoring(s) : null;
    const P = perkOf(s);
    if (P.rewind) ses.undo = snapshot(s);
    const res = scorePlay(s, uids, { roll: RL.rand(s) });
    // 過氣網紅的「直播」：每一筆 ×1.6，兩成機會翻車 ×0.4
    if (ses.live) {
      const crash = RL.rand(s) < 0.15, m = crash ? 0.4 : 1.8;
      res.total = Math.round(res.total * m); res.raw = Math.round(res.raw * m);
      res.steps.push({ t: 'live', x: m });
      s.rating = Math.max(1, Math.min(5, s.rating + (crash ? -0.15 : 0.05)));
      res.live = crash ? 'crash' : 'ok';
    }
    // 用過的素材會磨損（蘑菇星人的素材會腐爛：磨損加倍）；寫進作品的愧疚會被卸下
    const notes0 = [];
    res.scoring.forEach((u) => {
      const c = cardOf(s, u);
      if (!c) return;
      const before = c.wear || 0;
      c.wear = before + (P.wearX2 ? 2 : 1);
      // 考古學家的「出土」：素材用到第四次，有機會變成古董
      if (P.unearth && before < 4 && c.wear >= 4 && !c.guilt && D.ANTIQUES && RL.rand(s) < P.unearth) {
        const nid = RL.pick(s, D.ANTIQUES), def = D.CARDS[nid];
        notes0.push('出土：「' + c.name + '」原來是「' + def.name + '」');
        Object.assign(c, { id: nid, name: def.name, tags: def.tags.slice(), value: def.value, origin: def.origin, rarity: def.rarity, wear: 0, medium: def.medium });
      }
    });
    const guilt = res.scoring.map((u) => cardOf(s, u)).filter((c) => c && c.guilt);
    let relief = 0;
    if (guilt.length) {
      const rm = activeObjects(s).reduce((a, o) => a * (o.def.reliefMult || 1), 1);
      relief = RL.atone(s, guilt.reduce((a, c) => a + (c.grams || 0), 0) * rm, null);
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
    // 這一局第一次觸發傳說組合：金色扭蛋券
    res.fresh.filter((id) => (D.RECIPES.find((r) => r.id === id) || {}).legend).forEach((id) => RL.gainTicket(s, 'gold', 1, '發現傳說組合「' + D.RECIPES.find((r) => r.id === id).name + '」'));
    res.recipes.forEach((id) => { s.usedRecipes[id] = true; });
    ses.fresh.push(...res.fresh);
    s.formsSeen = s.formsSeen || {};
    s.formsSeen[res.form] = true;
    const objs = activeObjects(s);
    s.style = s.style || {};
    s.style[res.form] = (s.style[res.form] || 0) + 1;
    // 物件的代價
    const notes = [];
    const cost = (name, e) => {
      if (e.sin) notes.push(name + '：靈魂 +' + RL.sin(s, e.sin, null) + ' 克');
      if (e.spark) { RL.addSpark(s, e.spark, true); notes.push(name + '：火花 ' + e.spark); }
      if (e.cr) { s.cr += e.cr; notes.push(name + '：+$' + e.cr); }
      if (e.body) { s.body = Math.max(1, s.body + e.body); notes.push(name + '：身體 ' + e.body); }
    };
    objs.forEach((o) => { if (o.def.after) cost(D.OBJ[o.id].name, o.def.after({ s })); });
    activeSchools(s, objs).forEach((x) => { if (x.def.after) cost(x.def.name, x.def.after({ s }, x.n)); });
    if (SR && SR.sinPerPlay) notes.push('天空區贊助：靈魂 +' + RL.sin(s, SR.sinPerPlay, null) + ' 克');
    if (res.live) notes.push(res.live === 'crash' ? '直播翻車了：留言區一片嘲笑' : '直播觀眾很喜歡');
    notes.push(...notes0);
    res.notes = notes;
    ses.notes.push(...notes);
    ses.total += res.total; ses.raw += res.raw;
    ses.log.push({ form: res.form, total: res.total, raw: res.raw, recipes: res.recipes, tags: uids.map((u) => (cardOf(s, u) || { tags: [] }).tags).flat() });
    ses.lastUids = uids.slice();
    const first = cardOf(s, uids[0]);
    const cont = !!(first && ses.lastTheme && first.tags.some((t) => ses.lastTheme.includes(t)));
    ses.themeStreak = cont ? (ses.themeStreak || 1) + 1 : 1;
    ses.lastTheme = first ? first.tags.slice() : null;
    ses.plays--;
    ses.hand = ses.hand.filter((u) => !uids.includes(u) && cardOf(s, u));
    ses.used.push(...uids.filter((u) => cardOf(s, u)));
    s.stats.bestPlay = Math.max(s.stats.bestPlay || 0, res.total);
    if (ses.plays > 0) draw(s);
    return res;
  }
  function discard(s, uids) {
    const ses = s.session;
    if (!ses || ses.discards <= 0 || !uids.length || uids.length > Math.max(5, maxCards(s)) || !uids.every((u) => ses.hand.includes(u))) return false;
    // 街頭樂手：即興，第一筆之前不准改稿
    if (perkOf(s).noEarlyDiscard && !ses.log.length) return false;
    ses.hand = ses.hand.filter((u) => !uids.includes(u));
    ses.used.push(...uids);
    ses.discards--; ses.discardsUsed++;
    // 反叛流與會成長的物件（祖父悖論、推倒的銅像）記住每一次改稿
    s.stats.discards = (s.stats.discards || 0) + 1;
    activeObjects(s).forEach((o) => { if (o.def.grow) { s.objVal = s.objVal || {}; s.objVal[o.id] = (s.objVal[o.id] || 0) + o.def.grow; } });
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
    // 蘑菇星交換生的「菌絲」：一張用過的素材長出孢子
    let spore = null;
    if (perkOf(s).mycelium) {
      const used = ses.used.map((u) => cardOf(s, u)).filter((c) => c && !c.guilt);
      if (used.length) {
        const c = RL.pick(s, used);
        spore = RL.addCard(s, { id: 'spore', name: '孢子：' + c.name.slice(0, 8), tags: c.tags.slice(), value: Math.round(c.value * 0.7), medium: med(c), wear: 0 }).card;
      }
    }
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
    const stage = IE.Stages ? IE.Stages.settle(s, ses) : null;
    return { work, session: ses, paid, stage, spore };
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

  // ---------- 角色的招牌能力（創作桌上使用，第八期） ----------
  const ability = (s) => D.ABILITIES && D.ABILITIES[s.bg];
  const periodOf = (s) => s.quarter;
  const periodUsed = (s, k) => !!(s.abilPeriod && s.abilPeriod[k] === periodOf(s));
  const buyPrice = (s, kind) => Math.round((kind === 'play' ? 60 : 30) * Math.pow(2, (s.session && s.session.abil.bought) || 0) * (IE.Meta ? IE.Meta.stakeMod(s, 'prices') : 1));
  const bribePrice = (s) => Math.round(100 * (IE.Meta ? IE.Meta.stakeMod(s, 'prices') : 1));
  const sellPrice = (s, c) => Math.round((5 + cardValue(s, c) / 2) * (perkOf(s).sellMult || 1));
  // 現在可以用嗎？回傳 null 表示可以，否則回傳原因
  function abilityState(s, kind) {
    const ses = s.session, A = ability(s);
    if (!ses || !A) return '沒有招牌能力';
    const nightUsed = ses.abil.used > 0;
    switch (kind) {
      case 'package': return periodUsed(s, 'package') ? '這一期已經包裝過' : null;
      case 'mark': return nightUsed ? '今晚已經批改過' : null;
      case 'encore': return nightUsed ? '今晚已經安哥過' : ses.mode === 'sketch' ? '速寫沒有觀眾：只有正式創作的晚上才可以安哥' : !ses.log.length ? '先下筆一次，觀眾才會要求再唱' : null;
      case 'live': return ses.live ? '直播已經開始' : null;
      case 'frames': return nightUsed ? '今晚已經用過' : !ses.deck.length ? '牌庫已經抽完' : null;
      case 'buyPlay': return s.cr < buyPrice(s, 'play') ? '錢不夠' : null;
      case 'buyDiscard': return s.cr < buyPrice(s, 'discard') ? '錢不夠' : null;
      case 'rewind': return nightUsed ? '今晚已經倒帶過' : !ses.undo || !ses.log.length ? '還沒有下筆' : null;
      case 'bribe': return periodUsed(s, 'bribe') ? '這一期已經賄賂過' : !(ses.stage && ses.stage.rules.length) ? '只可以在外星評審之夜使用' : ses.log.length ? '要在第一筆之前賄賂' : s.cr < bribePrice(s) ? '錢不夠（$' + bribePrice(s) + '）' : null;
      case 'forge': return periodUsed(s, 'forge') ? '這一期已經做舊過' : null;
      case 'sell': return null;
      default: return '不能使用';
    }
  }
  function useAbility(s, kind, arg) {
    const ses = s.session;
    const why = abilityState(s, kind);
    if (why) return { ok: false, msg: why };
    const P = perkOf(s);
    let msg = '', res = null, peek = null;
    switch (kind) {
      case 'package': {
        ses.packaged = true;
        s.abilPeriod = Object.assign(s.abilPeriod || {}, { package: periodOf(s) });
        const g = RL.sin(s, 1, null);
        msg = '包裝：今晚的作品全部「符合本季 KPI」。靈魂 +' + g + ' 克';
        break;
      }
      case 'mark': {
        const c = cardOf(s, arg);
        if (!c || !ses.hand.includes(arg)) return { ok: false, msg: '先選一張手牌' };
        c.value += 4; c.wear = 0;
        msg = '批改：「' + c.name + '」重寫之後籌碼 +4，磨損歸零';
        break;
      }
      case 'encore': {
        res = scorePlay(s, ses.lastUids, { roll: RL.rand(s) });
        res.total = Math.round(res.total * 0.4); res.raw = Math.round(res.raw * 0.4);
        res.steps.push({ t: 'encore', x: 0.4 });
        res.encore = true; res.notes = []; res.fresh = [];
        ses.total += res.total; ses.raw += res.raw;
        ses.log.push({ form: res.form, total: res.total, raw: res.raw, recipes: res.recipes, tags: ses.lastUids.map((u) => (cardOf(s, u) || { tags: [] }).tags).flat(), encore: true });
        msg = '安哥！觀眾要求再唱一次（×0.4）';
        break;
      }
      case 'live': ses.live = true; msg = '直播開始：之後每一筆 ×1.8，但有一成半機會翻車'; break;
      case 'frames': {
        if (arg == null) { peek = ses.deck.slice(0, 3); return { ok: true, peek, msg: '牌庫頂的三張' }; }
        if (!ses.deck.slice(0, 3).includes(arg)) return { ok: false, msg: '只可以挑牌庫頂的三張' };
        ses.deck = ses.deck.filter((u) => u !== arg);
        ses.hand.push(arg);
        msg = '逐格：把「' + cardOf(s, arg).name + '」加入手牌';
        break;
      }
      case 'buyPlay': case 'buyDiscard': {
        const price = buyPrice(s, kind === 'buyPlay' ? 'play' : 'discard');
        s.cr -= price; ses.abil.bought++;
        if (kind === 'buyPlay') ses.plays++; else ses.discards++;
        msg = '鈔能力：花了 $' + price + (kind === 'buyPlay' ? '多買一次下筆' : '多買一次改稿');
        break;
      }
      case 'rewind': {
        const used = ses.abil.used;
        restore(s, ses.undo);
        s.session.abil.used = used + 1;
        RL.addParanoia(s, 6, null);
        msg = '倒帶：上一筆從來沒有發生過。偏執 +6';
        break;
      }
      case 'bribe': {
        const id = arg && ses.stage.rules.includes(arg) ? arg : ses.stage.rules[0];
        const price = bribePrice(s);
        s.cr -= price;
        ses.stage.rules = ses.stage.rules.filter((x) => x !== id);
        // 重新套用其餘規則的開局效果（例如「只看一筆」）
        Object.assign(ses, ses.base);
        ses.stage.rules.forEach((x) => { const b = IE.Stages.BOSS[x]; if (b.start) b.start(ses); });
        draw(s);
        s.abilPeriod = Object.assign(s.abilPeriod || {}, { bribe: periodOf(s) });
        msg = '內鬼：花了 $' + price + '，評審「' + IE.Stages.BOSS[id].name + '」的規則今晚不算數';
        return { ok: true, msg };
      }
      case 'forge': {
        const c = cardOf(s, arg);
        if (!c || c.guilt || (c.id && c.id.startsWith('a_'))) return { ok: false, msg: '選一張普通素材' };
        const nid = RL.pick(s, D.ANTIQUES), def = D.CARDS[nid];
        Object.assign(c, { id: nid, name: def.name + '（做舊）', tags: def.tags.slice(), value: def.value, origin: def.origin, rarity: def.rarity, wear: 0, medium: def.medium });
        const g = RL.sin(s, 2, null);
        s.abilPeriod = Object.assign(s.abilPeriod || {}, { forge: periodOf(s) });
        msg = '做舊：它現在是一件「古董」了。靈魂 +' + g + ' 克';
        return { ok: true, msg };
      }
      case 'sell': {
        const c = cardOf(s, arg);
        if (!c || ses.hand.includes(arg)) return { ok: false, msg: '只可以賣不在手上的素材' };
        const price = sellPrice(s, c);
        s.cards = s.cards.filter((x) => x.uid !== arg);
        ses.deck = ses.deck.filter((u) => u !== arg); ses.used = ses.used.filter((u) => u !== arg);
        s.cr += price;
        return { ok: true, msg: '鑑定：把「' + c.name + '」賣了 $' + price };
      }
    }
    if (['mark', 'encore', 'frames', 'rewind'].includes(kind)) ses.abil.used++;
    s.stats.abilities = (s.stats.abilities || 0) + 1;
    return { ok: true, msg, res };
  }

  // ---------- 模擬用：找出這手牌最好的下筆 ----------
  function bestPlay(s) {
    const ses = s.session;
    const hand = ses.hand.map((u) => cardOf(s, u)).filter((c) => c && !forbidden(s, c));
    if (!hand.length) return null;
    const cands = new Map();
    const maxN = maxCards(s);
    const add = (cards) => { const uids = cards.slice(0, maxN).map((c) => c.uid); if (uids.length) cands.set(uids.slice().sort().join(','), uids); };
    const byVal = hand.slice().sort((a, b) => b.value - a.value);
    add(byVal);
    const tags = [...new Set(hand.flatMap((c) => c.tags))];
    tags.forEach((t) => add(byVal.filter((c) => c.tags.includes(t))));
    tags.forEach((a, i) => tags.slice(i + 1).forEach((b) => add(byVal.filter((c) => c.tags.includes(a) || c.tags.includes(b)))));
    // 媒材：同一媒材（連作）與五種媒材各一（跨界）
    const meds = [...new Set(hand.map(med))];
    meds.forEach((m) => add(byVal.filter((c) => med(c) === m)));
    if (meds.length === 5) add(meds.map((m) => byVal.find((c) => med(c) === m)));
    // 少張數（極簡流）
    add(byVal.slice(0, 1)); add(byVal.slice(0, 2));
    // 湊組合：每個已知組合各試一次
    D.RECIPES.forEach((r) => {
      const need = Object.keys(r.need);
      if (!need.length) return;
      const pick = [];
      need.forEach((t) => byVal.filter((c) => c.tags.includes(t) && !pick.includes(c)).slice(0, r.need[t]).forEach((c) => pick.push(c)));
      if (pick.length <= 5) add(pick);
    });
    // 起承轉合：主題兩張、一張反轉、一張能接回兩邊的雙標籤素材
    tags.forEach((a) => tags.forEach((b) => {
      if (a === b) return;
      const pick = byVal.filter((c) => c.tags.includes(a) && !c.tags.includes(b)).slice(0, 2);
      const tw = byVal.find((c) => c.tags.includes(b) && !c.tags.includes(a) && !pick.includes(c));
      const br = byVal.find((c) => c.tags.includes(a) && c.tags.includes(b));
      if (pick.length === 2 && tw && br) add(pick.concat([tw, br]));
    }));
    let best = null;
    cands.forEach((raw) => {
      const uids = arrange(raw.map((u) => cardOf(s, u))).map((c) => c.uid);
      const sc = scorePlay(s, uids);
      if (!best || sc.total > best.total) best = { uids, total: sc.total, form: sc.form };
    });
    return best;
  }

  IE.Create = {
    FORM, RANK, POS, structure, arrange, cardValue, wearMult, tagCounts, mediaCounts, detectForm, formStats, level, matchRecipes, kpiMod, aiFactor,
    isSketch, stageTonight, maxCards, forbidden, snapshot, restore, ability, abilityState, useAbility, buyPrice, bribePrice, sellPrice, activeObjects, objMods, schoolCounts, activeSchools, schoolOn, freeOfRules, medium: med, topRecipes, scorePlay, suggest, chase, preview, canStart, start, draw, play, discard, finish, cancel, newDay, bestPlay,
  };
});
