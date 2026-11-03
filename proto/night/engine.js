// 《靈感撤離 2080》創作之夜原型（2026-11-03）：規則。純邏輯，瀏覽器和 Node 共用。
// 目的：找出「好玩」。沿用遊戲真實的色輪、配色、素材、具名組合和靈感物件（game/js/data*.js），
// 計分步驟另外整理成可以逐步演出的 steps；外星評審用四個種族（docs/WORLD.md 第六節）。
(function (root) {
  'use strict';
  const IE = root.IE = root.IE || {};
  const D = IE.DATA;

  // ---------- 隨機數（可以重現） ----------
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const shuffle = (r, arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const x = arr[i]; arr[i] = arr[j]; arr[j] = x; } return arr; };
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const r1 = (x) => Math.round(x * 10) / 10;

  // ---------- 色輪與配色（照搬 game/js/create.js） ----------
  const WHEEL = D.WHEEL;
  const wpos = (t) => WHEEL.indexOf(t);
  const wdist = (a, b) => { const d = Math.abs(wpos(a) - wpos(b)); return Math.min(d, 10 - d); };
  const opposite = (t) => WHEEL[(wpos(t) + 5) % 10];
  function contiguous(pal) {
    if (pal.length < 2 || pal.length > 3) return false;
    return pal.some((start) => { const i = wpos(start); return pal.every((t) => ((wpos(t) - i + 10) % 10) < pal.length); });
  }
  // 全光譜的門檻：遊戲是 8 種情緒；原型提高到 9 種（大部分素材有兩種情緒，五張很容易湊到 8 種，
  // 「全光譜」變成最容易的高分配色，色輪的形狀就沒有意義了）
  const FULL_MIN = 9;
  function paletteShape(pal) {
    const n = pal.length;
    if (n === 1) return 'mono';
    if (n === 2 && wdist(pal[0], pal[1]) === 5) return 'comp';
    if (n >= FULL_MIN) return 'full';
    if (n === 3) {
      const split = pal.some((x) => { const o = wpos(opposite(x)); const nb = [WHEEL[(o + 1) % 10], WHEEL[(o + 9) % 10]]; return nb.every((t) => pal.includes(t)); });
      if (split) return 'split';
      if (wdist(pal[0], pal[1]) >= 3 && wdist(pal[0], pal[2]) >= 3 && wdist(pal[1], pal[2]) >= 3) return 'triad';
    }
    if (n === 4 && pal.filter((t) => pal.includes(opposite(t))).length === 4) return 'tetrad';
    if (contiguous(pal)) return 'adj';
    return 'mix';
  }
  const STAR_CHIPS = [0, 10, 18, 28, 42, 60];
  const FORM = {};
  D.FORMS.forEach((f) => { FORM[f.id] = f; });
  function tagCounts(cards) {
    const counts = {};
    cards.forEach((c) => c.tags.forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
    return counts;
  }
  function detectForm(cards) {
    const counts = tagCounts(cards);
    const n = cards.length;
    const pal = WHEEL.filter((t) => counts[t]);
    let id = n ? paletteShape(pal) : 'mix';
    if (id === 'comp' && n >= 3 && cards.every((c) => pal.every((t) => c.tags.includes(t)))) id = 'paradox';
    if ((id === 'mono' && n < 3) || (id === 'full' && n < 4)) id = 'mix';
    // 成形的配色：全部素材計分；草稿只計最亮的一張
    const scoring = id !== 'mix' ? cards.slice() : n ? [cards.reduce((a, c) => (c.star > a.star || (c.star === a.star && c.chips > a.chips) ? c : a), cards[0])] : [];
    return { id, palette: pal, scoring, counts, distinct: pal.length };
  }

  // ---------- 具名組合（照搬 create.js：要「純」，每張素材都要有組合要求的其中一個標籤） ----------
  const RECIPES = D.RECIPES.filter((r) => !r.legend && !r.cond && Object.keys(r.need).length && Object.keys(r.need).every((t) => wpos(t) >= 0));
  const power = (r) => r.chips / 10 + r.mult * 10;
  function matchRecipes(sel, limit) {
    const counts = tagCounts(sel);
    const hit = RECIPES.filter((r) => Object.keys(r.need).every((t) => (counts[t] || 0) >= r.need[t]) && sel.every((c) => c.tags.some((t) => r.need[t])));
    return hit.sort((a, b) => power(b) - power(a)).slice(0, limit || 2);
  }

  // ---------- 靈感物件（名字、說明、圖示沿用 D.OBJ；效果在這裡實作） ----------
  const has = (c, t) => c.tags.includes(t);
  const OBJFX = {
    slogans: { play: (x) => ({ mult: x.distinct }) },
    anonacct: { card: (c) => (has(c, 'anger') || has(c, 'neon') ? { chips: 12 } : null) },
    spraycan: { card: (c) => (has(c, 'rebel') ? { mult: 3 } : null) },
    subwoofer: { card: (c) => (has(c, 'neon') ? { mult: 2 } : null) },
    robocat: { card: (c) => (has(c, 'machine') ? { chips: 15 } : null) },
    costume: { card: (c) => (has(c, 'memory') ? { mult: 2 } : null) },
    boatlamp: { card: (c) => (has(c, 'water') ? { chips: 20 } : null) },
    sweetbowl: { card: (c) => (has(c, 'warmth') ? { mult: 2 } : null) },
    whistle: { card: (c) => (has(c, 'water') ? { mult: 2 } : null) },
    solder: { card: (c) => (has(c, 'machine') ? { mult: 2 } : null) },
    angrydiary: { card: (c) => (has(c, 'anger') ? { mult: 3 } : null) },
    lyricbook: { card: (c) => (has(c, 'hope') ? { xmult: 1.2 } : null) },
    ringlight: { card: (c) => (has(c, 'neon') ? { xmult: 1.25 } : null) },
    confkey: { card: (c) => (has(c, 'guilt') ? { xmult: 2 } : null) },
    emptybowl: { card: (c) => (has(c, 'hunger') ? { xmult: 1.3 } : null) },
    penguin: { card: (c) => (has(c, 'warmth') ? { chips: 30 } : null) },
    dreamcatcher: { card: (c) => (has(c, 'hope') ? { chips: 25 } : null) },
    carnivalmask: { card: (c) => (has(c, 'neon') || has(c, 'memory') ? { mult: 2 } : null) },
    oldpoems: { play: (x) => (x.form === 'adj' || x.form === 'mono' ? { chips: 60 } : null) },
    guitar: { play: (x) => (x.form === 'mono' ? { xmult: 1.6 } : null) },
    oldmap: { play: (x) => (x.form === 'comp' ? { xmult: 2 } : null) },
    redpen: { play: (x) => (x.n === 3 ? { xmult: 2 } : null) },
    alienradio: { play: (x) => (x.sel.some((c) => has(c, 'hope')) ? { xmult: 1.5 } : null) },
    thermobag: { play: () => ({ chips: 25 }) },
    billboard: { play: () => ({ mult: 12 }) },
    neonshard: { play: (x) => (x.discardsUsed ? { mult: 4 * x.discardsUsed } : null) },
    goldframe: { play: (x) => (x.playIndex ? { xmult: r1(Math.pow(1.5, x.playIndex)) } : null) },
    minimoai: { play: (x) => (x.n === 1 ? { xmult: 5 } : null) },
    instant: { retrig: (c, x, i) => (i === 0 ? 1 : 0) },
    frame24: { retrig: (c, x, i) => (i === x.scoring.length - 1 ? 1 : 0) },
    espresso: { plays: 1 },
    shredder: { discards: 2 },
    typewriter: { hand: 1 },
  };
  const OBJ_POOL = Object.keys(OBJFX).filter((id) => D.OBJ[id]);
  const objDef = (id) => D.OBJ[id];

  // ---------- 外星評審（docs/WORLD.md 第六節：每個種族有自己的腔調） ----------
  const JUDGES = {
    conserve: {
      name: '保育者', title: '人類保護區的觀察員', img: 'species-conserve',
      rules: [
        { id: 'chipsx2', tag: 'warmth', text: '保護瀕危的人情：「人情」素材的籌碼 ×2', good: true },
        { id: 'calm', text: '喜歡平靜：「單色」和「鄰近色」倍率 ×2', good: true },
      ],
      lines: {
        start: '一個瀕危的地球人，正準備在夜裡創作。我們保持距離，不要驚動牠。',
        small: '牠還在摸索。這很正常。',
        good: '看，牠找到了自己的顏色。',
        great: '罕見的畫面……這一刻值得保育。',
        recipe: '牠把幾種情緒放在一起了。我們從未見過這種行為。',
        clear: '記錄完畢。這個個體狀態良好，可以繼續野放。',
        wish: '就是這一幕！保育區的資料庫終於有了。',
        fail: '今晚沒有作品。保護區的床位已經準備好了。',
      },
    },
    octo: {
      name: '章魚星人', title: '觀光團的私人收藏家', img: 'species-octo',
      rules: [
        { id: 'multplus', tag: 'neon', text: '喜歡霓虹：「霓虹」素材計分時倍率 +2', good: true },
        { id: 'norepeat', text: '只要新奇：今晚同一種配色第二次起倍率 ×0.5' },
      ],
      lines: {
        start: '各位團友，右手邊就是一位真正的地球創作者！請勿餵食。',
        small: '嗯……地球感不夠。',
        good: '很有地球感！大家拍照！',
        great: '成交！這一筆我出雙倍！',
        recipe: '限量款！這個組合在拍賣會上很少見！',
        clear: '今晚的行程圓滿結束，請團友回到觀光船。',
        wish: '就是這款！團友們，這一件我要帶回家！',
        fail: '好可惜，今晚沒有紀念品可以帶回家。',
      },
    },
    myco: {
      name: '菌絲網絡', title: '蘑菇星的田野研究員', img: 'species-myco',
      rules: [
        { id: 'min3', text: '樣本太少不算：少於 3 張素材的一筆不計分' },
        { id: 'chipsx2', tag: 'hope', text: '研究希望：「希望」素材的籌碼 ×2', good: true },
      ],
      lines: {
        start: '觀察記錄第 7,203 號：樣本開始創作。',
        small: '樣本的輸出偏低。原因待查。',
        good: '樣本出現明顯的情緒波動。很好。',
        great: '異常：樣本的輸出超出所有模型。記錄、記錄、記錄。',
        recipe: '新的組合。網絡正在同步這一刻。',
        clear: '研究結論：樣本仍然在創作。原因不明。',
        wish: '假設得到證實。網絡一致通過。',
        fail: '樣本今晚沒有輸出。我們會繼續觀察。',
      },
    },
    grey: {
      name: '灰人', title: '星際人才發展局的 HR', img: 'species-grey',
      rules: [
        { id: 'block', tag: 'memory', text: '不准懷舊：「記憶」素材不計分' },
        { id: 'block', tag: 'neon', text: '討厭霓虹：「霓虹」素材不計分' },
        { id: 'plays3', text: '效率審查：今晚只有 3 次下筆' },
        { id: 'nomix', text: '標準化：「草稿」一律不計分' },
      ],
      lines: {
        start: '本次評核開始。請在限時內展示你的可轉移技能。',
        small: '表現低於預期。',
        good: '表現符合預期。',
        great: '表現超出預期。建議列入人才庫的優先名單。',
        recipe: '此組合不在 KPI 範圍之內。已記錄為「創新」。',
        clear: '評核通過。你的檔案已經更新。',
        wish: '符合委託要求。已加分。',
        fail: '評核不通過。我們會保留你的資料十二個月。',
      },
    },
  };
  // 一晚的設定：名稱、目標、評審（第 3 晚是外星評審之夜：規則對你不利）
  const NIGHTS = [
    { name: '社區小展', target: 3000, judges: ['conserve'], goodRule: true },
    { name: '畫廊聯展', target: 5500, judges: ['octo', 'myco'] },
    { name: '外星評審', target: 8000, judges: ['grey'], boss: true },
  ];
  const BASE = { hand: 8, plays: 4, discards: 3, maxCards: 5 };
  // 評審的委託：今晚想看的具名組合。只公開名稱和情緒的數目，玩家要自己猜是哪幾種情緒
  function pickWish(r, deck, taken) {
    const have = {};
    deck.forEach((c) => c.tags.forEach((t) => { have[t] = (have[t] || 0) + 1; }));
    const ok = RECIPES.filter((rc) => !taken.includes(rc.id) && Object.keys(rc.need).every((t) => (have[t] || 0) >= rc.need[t] + 1));
    return ok.length ? pick(r, ok).id : null;
  }

  // ---------- 一局 ----------
  function makeCard(id, uid) {
    const c = D.CARDS[id];
    const star = c.star || (c.value < 16 ? 1 : c.value < 24 ? 2 : c.value < 32 ? 3 : c.value < 60 ? 4 : 5);
    return { uid, id, name: c.name, tags: c.tags.slice(), star, chips: STAR_CHIPS[star], medium: D.mediumOf ? D.mediumOf({ id, tags: c.tags }) : 'paper' };
  }
  function newRun(seed, opts) {
    const o = opts || {};
    const r = rng(seed || 1);
    const bg = D.BACKGROUNDS[o.bg || 'copywriter'];
    const run = { seed: seed || 1, r, bg: o.bg || 'copywriter', uid: 1, deck: [], objects: [], spark: bg.spark || 2, night: 0, discovered: {}, paintings: [], nights: [] };
    const ids = bg.cards.concat(D.STARTER).filter((id) => D.CARDS[id]);
    // 原型：多加幾張常見的素材，令牌組有變化（改稿有東西可以抽）
    const extra = Object.keys(D.CARDS).filter((id) => {
      const c = D.CARDS[id];
      return c.tags.every((t) => wpos(t) >= 0) && !c.rarity && c.value <= 18 && !ids.includes(id);
    });
    shuffle(r, extra).slice(0, 7).forEach((id) => ids.push(id));
    ids.forEach((id) => run.deck.push(makeCard(id, run.uid++)));
    (o.objects || ['slogans', 'anonacct']).forEach((id) => { if (OBJFX[id]) run.objects.push(id); });
    run.nightDefs = NIGHTS.map((n, i) => {
      const jid = pick(r, n.judges);
      const J = JUDGES[jid];
      const pool = J.rules.filter((x) => (n.goodRule ? x.good : n.boss ? !x.good : true));
      return { idx: i, name: n.name, target: n.target, judge: jid, rule: pick(r, pool.length ? pool : J.rules), boss: !!n.boss };
    });
    const taken = [];
    run.nightDefs.forEach((d) => { d.wish = pickWish(r, run.deck, taken); if (d.wish) taken.push(d.wish); });
    return run;
  }
  const objCount = (run, key) => run.objects.reduce((a, id) => a + ((OBJFX[id] && OBJFX[id][key]) || 0), 0);
  function startNight(run) {
    const def = run.nightDefs[run.night];
    const plays = BASE.plays + objCount(run, 'plays') - (def.rule.id === 'plays3' ? 1 : 0);
    const n = { def, target: def.target, score: 0, plays, playsMax: plays, discards: BASE.discards + objCount(run, 'discards'),
      handSize: BASE.hand + objCount(run, 'hand'), hand: [], pile: shuffle(run.r, run.deck.map((c) => c.uid)), used: [], log: [], formsUsed: {}, discardsUsed: 0, wishDone: false, done: false, failed: false };
    run.cur = n;
    draw(run);
    return n;
  }
  const cardOf = (run, uid) => run.deck.find((c) => c.uid === uid);
  function draw(run) {
    const n = run.cur;
    while (n.hand.length < n.handSize && n.pile.length) n.hand.push(n.pile.shift());
    if (n.hand.length < n.handSize && n.used.length) {
      n.pile = shuffle(run.r, n.used.splice(0));
      while (n.hand.length < n.handSize && n.pile.length) n.hand.push(n.pile.shift());
    }
  }

  // 選牌時的預覽：只有配色的名稱和基本的籌碼 × 倍率（不預計分數）
  function preview(run, uids) {
    const sel = uids.map((u) => cardOf(run, u)).filter(Boolean);
    const F = detectForm(sel);
    const f = FORM[F.id];
    return { form: F.id, name: f.name, tag: f.tag, chips: f.chips, mult: f.mult, palette: F.palette, scoring: F.scoring.map((c) => c.uid) };
  }

  // 計分：回傳逐步演出用的 steps（不改變狀態）
  function score(run, uids) {
    const n = run.cur;
    const rule = n.def.rule;
    const sel = uids.map((u) => cardOf(run, u)).filter(Boolean);
    const F = detectForm(sel);
    const f = FORM[F.id];
    let chips = f.chips, mult = f.mult;
    const steps = [];
    const snap = (o) => Object.assign(o, { C: Math.round(chips), M: r1(mult) });
    steps.push(snap({ t: 'form', form: F.id, name: f.name, chips, mult }));
    const objs = run.objects.map((id, slot) => ({ id, slot, fx: OBJFX[id] })).filter((o) => o.fx);
    const x = { sel, scoring: F.scoring, form: F.id, n: sel.length, distinct: F.distinct, playIndex: n.log.length, discardsUsed: n.discardsUsed };
    const apply = (e) => { if (e.chips) chips += e.chips; if (e.mult) mult += e.mult; if (e.xmult) mult *= e.xmult; };
    const blockedAll = (rule.id === 'nomix' && F.id === 'mix') || (rule.id === 'min3' && sel.length < 3);
    F.scoring.forEach((c, i) => {
      if (blockedAll || (rule.id === 'block' && has(c, rule.tag))) { steps.push(snap({ t: 'blocked', uid: c.uid })); return; }
      let reps = 1;
      objs.forEach((o) => { if (o.fx.retrig) reps += o.fx.retrig(c, x, i); });
      for (let k = 0; k < reps; k++) {
        let v = c.chips;
        if (rule.id === 'chipsx2' && has(c, rule.tag)) v *= 2;
        chips += v;
        steps.push(snap({ t: 'card', uid: c.uid, chips: v, again: k > 0, judge: rule.id === 'chipsx2' && has(c, rule.tag) }));
        if (rule.id === 'multplus' && has(c, rule.tag)) { mult += 2; steps.push(snap({ t: 'rule', uid: c.uid, mult: 2 })); }
        objs.forEach((o) => {
          if (!o.fx.card) return;
          const e = o.fx.card(c, x);
          if (e) { apply(e); steps.push(snap(Object.assign({ t: 'obj', id: o.id, slot: o.slot, uid: c.uid }, e))); }
        });
      }
    });
    // 具名組合要配色成形才成立（草稿不算）；例外：評審的委託只看內容，草稿也算，而且排在第一（全數倍率）
    const wishId = n.def.wish && !n.wishDone ? n.def.wish : null;
    const recs = (blockedAll ? [] : matchRecipes(sel, 99))
      .filter((rc) => F.id !== 'mix' || rc.id === wishId)
      .sort((a, b) => (b.id === wishId) - (a.id === wishId) || power(b) - power(a))
      .slice(0, 2);
    recs.forEach((rc, i) => {
      const m = i === 0 ? rc.mult : rc.mult / 2;
      chips += rc.chips; mult += m;
      steps.push(snap({ t: 'recipe', id: rc.id, name: rc.name, chips: rc.chips, mult: m, isNew: !run.discovered[rc.id] }));
    });
    if (!blockedAll) {
      objs.forEach((o) => {
        if (!o.fx.play) return;
        const e = o.fx.play(x);
        if (e && (e.chips || e.mult || (e.xmult && e.xmult !== 1))) { apply(e); steps.push(snap(Object.assign({ t: 'obj', id: o.id, slot: o.slot }, e))); }
      });
    }
    if (rule.id === 'calm' && (F.id === 'mono' || F.id === 'adj')) { mult *= 2; steps.push(snap({ t: 'rule', xmult: 2 })); }
    if (rule.id === 'norepeat' && n.formsUsed[F.id]) { mult *= 0.5; steps.push(snap({ t: 'rule', xmult: 0.5 })); }
    // 委託：今晚第一次畫出評審想看的組合，倍率 ×2
    const wish = !!(wishId && recs.some((rc) => rc.id === wishId));
    if (wish) { mult *= 2; steps.push(snap({ t: 'wish', id: n.def.wish, xmult: 2 })); }
    mult = Math.max(0, mult);
    const total = blockedAll ? 0 : Math.round(chips * mult * run.spark);
    steps.push({ t: 'spark', x: run.spark, C: Math.round(chips), M: r1(mult), total });
    return { form: F.id, formName: f.name, palette: F.palette, scoring: F.scoring.map((c) => c.uid), chips: Math.round(chips), mult: r1(mult), total, steps, recipes: recs.map((rc) => rc.id), blockedAll, wish };
  }

  // 下筆：套用分數、記錄配色和組合、補牌；回傳計分結果和今晚的狀態
  function play(run, uids) {
    const n = run.cur;
    if (n.done || n.plays <= 0 || !uids.length || uids.length > BASE.maxCards) return null;
    const res = score(run, uids);
    n.score += res.total;
    n.plays -= 1;
    n.formsUsed[res.form] = (n.formsUsed[res.form] || 0) + 1;
    res.newRecipes = res.recipes.filter((id) => !run.discovered[id]);
    res.recipes.forEach((id) => { run.discovered[id] = true; });
    if (res.wish) n.wishDone = true;
    n.log.push({ uids: uids.slice(), form: res.form, total: res.total, palette: res.palette, recipes: res.recipes });
    n.hand = n.hand.filter((u) => !uids.includes(u));
    n.used.push(...uids);
    if (n.score >= n.target) {
      n.done = true;
      res.clear = true;
      res.unusedPlays = n.plays;
      res.overkill = n.score >= n.target * 2;
    } else if (n.plays <= 0) {
      n.done = true;
      n.failed = true;
      res.fail = true;
    } else {
      draw(run);
    }
    return res;
  }
  function discard(run, uids) {
    const n = run.cur;
    if (n.done || n.discards <= 0 || !uids.length || uids.length > BASE.maxCards) return false;
    n.discards -= 1;
    n.discardsUsed += 1;
    n.hand = n.hand.filter((u) => !uids.includes(u));
    n.used.push(...uids);
    draw(run);
    return true;
  }
  // 收工：火花的獎勵（每剩一次下筆 +0.1；分數達到目標兩倍 +0.2；完成委託 +0.2），記錄作品，進入下一晚
  function finishNight(run, painting) {
    const n = run.cur;
    const bonus = r1(0.1 * n.plays + (n.score >= n.target * 2 ? 0.2 : 0) + (n.wishDone ? 0.2 : 0));
    run.spark = r1(run.spark + bonus);
    run.nights.push({ name: n.def.name, score: n.score, target: n.target, judge: n.def.judge, painting: painting || null });
    run.night += 1;
    return { bonus, spark: run.spark };
  }
  function retryNight(run) { return startNight(run); }

  // 收工之後的獎勵：三選一的靈感物件、三選一的素材
  function rewards(run) {
    const owned = new Set(run.objects);
    const weight = (id) => ({ common: 6, rare: 3, legend: 1 }[objDef(id).rarity] || 2);
    const pool = OBJ_POOL.filter((id) => !owned.has(id));
    const objs = [];
    for (let k = 0; k < 3 && pool.length; k++) {
      const total = pool.reduce((a, id) => a + weight(id), 0);
      let roll = run.r() * total, i = 0;
      while (roll > weight(pool[i])) { roll -= weight(pool[i]); i += 1; }
      objs.push(pool.splice(i, 1)[0]);
    }
    const cpool = Object.keys(D.CARDS).filter((id) => {
      const c = D.CARDS[id];
      return c.tags.every((t) => wpos(t) >= 0) && c.value >= 16 && c.value < 40 && !c.rarity;
    });
    const cards = shuffle(run.r, cpool.slice()).slice(0, 3).map((id) => makeCard(id, 0));
    return { objects: objs, cards };
  }
  function takeObject(run, id) { if (OBJFX[id] && run.objects.length < 5 && !run.objects.includes(id)) run.objects.push(id); }
  function takeCard(run, card) { const c = makeCard(card.id, run.uid++); run.deck.push(c); return c; }

  IE.Proto = {
    rng, WHEEL, FORM, STAR_CHIPS, JUDGES, NIGHTS, BASE, OBJFX, OBJ_POOL, RECIPES,
    detectForm, paletteShape, matchRecipes, newRun, startNight, retryNight, preview, score, play, discard, finishNight, rewards, takeObject, takeCard, cardOf,
  };
})(typeof window !== 'undefined' ? window : globalThis);
