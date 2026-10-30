// 《靈感撤離 2080》規則核心：純邏輯，不涉及 DOM，瀏覽器與 Node（tools/sim.js）共用。
// 核心公式：作品分 = 素材籌碼 × 組合倍率 × 火花倍率 × KPI
// 一局 100 天；第 20、40、60、80、100 天是篩選日；外星人要「又亮又輕」的人。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA;
  const MAX_CARDS = D.CRAFT.deckMax;

  // ---------- 隨機數（可存檔的 mulberry32） ----------
  function rand(s) {
    s.rngState = (s.rngState + 0x6D2B79F5) | 0;
    let t = s.rngState;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const pick = (s, arr) => arr[Math.floor(rand(s) * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const round1 = (v) => Math.round(v * 10) / 10;

  function bgOf(s) { return D.BACKGROUNDS[s.bg]; }
  function seasonOf(s) { return D.SEASONS[s.season]; }
  function perk(s) { return bgOf(s).perk; }

  // ---------- 事件（長期，可同時進行兩個） ----------
  const evDef = (id) => D.WORLD_EVENTS.find((w) => w.id === id);
  const activeEvents = (s) => (s.events || []).map((e) => Object.assign({ def: evDef(e.id) }, e)).filter((e) => e.def);
  const eventActive = (s, id) => (s.events || []).some((e) => e.id === id);
  // 合併所有進行中事件的修正：乘數相乘、數值相加、停業清單合併、致命危險列成清單
  function worldMods(s) {
    const out = { pay: {} };
    activeEvents(s).forEach(({ def }) => {
      const m = def.mods || {};
      Object.keys(m).forEach((k) => {
        const v = m[k];
        if (k === 'pay') Object.keys(v).forEach((j) => { out.pay[j] = (out.pay[j] || 1) * v[j]; });
        else if (k === 'closed') { out.closed = out.closed || []; v.forEach((j) => { if (!out.closed.includes(j)) out.closed.push(j); }); }
        else if (/Mult$/.test(k)) out[k] = (out[k] || 1) * v;
        else if (typeof v === 'number') out[k] = (out[k] || 0) + v;
        else if (typeof v === 'boolean') out[k] = out[k] || v;
        else { out[k] = out[k] || []; out[k].push(Object.assign({ ev: def.id }, v)); }
      });
    });
    return out;
  }
  const worldPay = (s, job) => (worldMods(s).pay[job] || 1);
  const worldClosed = (s, job) => {
    const e = activeEvents(s).find(({ def }) => def.mods && def.mods.closed && def.mods.closed.includes(job));
    return e ? '事件：' + e.def.name : null;
  };
  function eventsInfo(s) {
    return activeEvents(s).map(({ def, until }) => ({ id: def.id, name: def.name, grade: def.grade, scope: def.scope, visual: def.visual,
      left: until - s.day + 1, news: def.news }));
  }
  const worldInfo = (s) => eventsInfo(s)[0] || null;

  // ---------- 十二項能力值 ----------
  // 做甚麼就變成甚麼：成長有遞減效應，退化則直接扣
  function train(s, gains, rep) {
    Object.keys(gains).forEach((k) => {
      let v = gains[k];
      if (v > 0) v *= 1 - s.attr[k] / 130;
      const before = s.attr[k];
      s.attr[k] = clamp(before + v, 0, 100);
      if (rep) rep.stat(k, s.attr[k] - before);
    });
    s.body = Math.min(s.body, bodyMax(s));
  }
  const A = (s, k) => s.attr[k];
  const bodyMax = (s) => Math.round(70 + 0.3 * A(s, 'fit'));
  const heal = (s, v) => { s.body = Math.min(bodyMax(s), s.body + v); };
  // 身體受損：記下原因；身體歸零時用來判斷死法（見 data-deaths.js）
  // 死因按「今天傷你最重的那件事」判斷，而不是最後一下
  function hurt(s, v, cause, ctx) {
    if (!v || v <= 0) return 0;
    s.body -= v;
    if (!s.dmg || s.dmg.day !== s.day) s.dmg = { day: s.day, by: {} };
    const e = s.dmg.by[cause] || (s.dmg.by[cause] = { v: 0, ctx: null });
    e.v += v; if (ctx) e.ctx = ctx;
    const top = Object.keys(s.dmg.by).reduce((a, k) => (!a || s.dmg.by[k].v > s.dmg.by[a].v ? k : a), null);
    s.lastCause = { k: top, ctx: s.dmg.by[top].ctx, day: s.day };
    return v;
  }
  // 致命事件：直接指定死法
  function kill(s, id) { s.body = Math.min(s.body, 0); s.lastCause = { k: 'instant', id, day: s.day }; }
  const calmMult = (s) => Math.max(0.6, 1 - 0.004 * A(s, 'calm'));
  const obeyPay = (s) => 1 + 0.003 * A(s, 'obey');
  const socialTip = (s) => 1 + 0.004 * A(s, 'social');

  // ---------- 火花、靈魂重量與良知 ----------
  // 火花絕對上限為 4；實際上限由良知決定（良知 100% → ×4，良知 0% → ×2）。
  // 自然恢復的火花受想像力（加成）與服從（壓抑）影響；超過 3 之後越升越慢。
  const SPARK_MAX = 4;
  const sparkMax = (s) => round1(2 + 2 * s.conscience);
  function addSpark(s, v, raw) {
    if (v > 0 && !raw) v *= (1 + 0.005 * A(s, 'imag')) * (1 - 0.003 * A(s, 'obey'));
    if (v > 0 && s.spark >= 3) v *= 0.5;
    const before = s.spark;
    let next = s.spark + v;
    if (v > 0) next = Math.min(next, Math.max(sparkMax(s), s.spark));
    s.spark = clamp(next, 0, SPARK_MAX);
    return round1(s.spark - before);
  }
  // 良知是負重：同一件虧心事，良知越強、同理心越高就越重；每做一次，良知都會被磨損（麻木）。
  // 外星人的牽引光束最多只能拉起 21 克的靈魂，太重會污染他們的神經網絡。
  const SOUL_LIMIT = D.SOUL_LIMIT;
  const sinFactor = (s) => (0.3 + 0.7 * s.conscience) * (1 + 0.003 * A(s, 'empathy')) * (worldMods(s).sinMult || 1);
  function sin(s, base, rep, reason, guiltName, tag) {
    const grams = round1(base * sinFactor(s));
    s.soul = round1(s.soul + grams);
    s.conscience = clamp(s.conscience - base * 0.015, 0, 1);
    s.stats.sins++;
    if (rep) rep.line(reason, 'sin', grams, 'soul');
    const before = s.spark;
    s.spark = Math.min(s.spark, sparkMax(s));
    if (rep && s.spark < before) rep.line('良知被磨損，你的感受力也變弱了', 'bad', round1(s.spark - before), 'spark');
    // 較重的虧心事會留下「愧疚」素材：把它寫進作品，就能卸下一部分重量
    if (rep && guiltName && base >= 1) {
      rep.gain({ id: 'guilt', name: guiltName, tags: ['guilt', tag || 'memory'], value: Math.round(10 + base * 2.5),
        grams: round1(grams * 0.6), guilt: true });
    }
    return grams;
  }
  function atone(s, base, rep, reason) {
    const b = base * (1 + 0.004 * A(s, 'empathy')) * (worldMods(s).atoneMult || 1);
    const grams = round1(Math.min(s.soul, b));
    s.soul = round1(s.soul - grams);
    s.conscience = clamp(s.conscience + base * 0.02, 0, 1);
    s.stats.atones++;
    if (rep && grams) rep.line(reason, 'good', -grams, 'soul');
    return grams;
  }
  function addParanoia(s, v, rep) {
    if (v > 0) v *= Math.max(0.3, 1 - A(s, 'insight') / 150) * Math.max(0.6, 1 - 0.003 * A(s, 'calm'));
    s.paranoia = clamp(s.paranoia + v, 0, 100);
    if (rep && Math.abs(v) >= 1) rep.line(v > 0 ? '你越來越懷疑身邊的一切' : '你冷靜了一點', v > 0 ? 'bad' : 'good', round1(v), 'para');
  }

  // ---------- 病痛 ----------
  function addCond(s, id, rep) {
    if (!D.CONDS[id] || s.conds[id]) return false;
    s.conds[id] = { since: s.day };
    if (rep) rep.line('你患上了「' + D.CONDS[id].name + '」：' + D.CONDS[id].desc + (D.CONDS[id].lethal ? '。拖到第 ' + D.CONDS[id].lethal + ' 天會致命。' : ''), 'bad');
    return true;
  }
  function cureConds(s, how) {
    const cured = [];
    Object.keys(s.conds).forEach((id) => { if (D.CONDS[id].cure === how) { delete s.conds[id]; cured.push(D.CONDS[id].name); } });
    return cured;
  }
  function condsInfo(s) {
    return Object.keys(s.conds || {}).map((id) => {
      const c = D.CONDS[id], days = s.day - s.conds[id].since + 1;
      return { id, name: c.name, desc: c.desc, days, lethal: c.lethal, left: c.lethal ? c.lethal - days : null, cure: c.cure };
    });
  }
  // ---------- 致命危險 ----------
  const guarded = (s, h) => (h.guard && s.gear[h.guard] ? 0.2 : 1) * (h.guard === 'gasmask' && (s.objects || []).includes('raincoat') ? 0.5 : 1);
  function outdoorRisk(s) {
    return (worldMods(s).outdoorDeath || []).reduce((a, h) => a + h.chance * guarded(s, h), 0);
  }
  const INSIDE = ['collapse', 'fire', 'ai_lock', 'typhoon_home'];
  const homeHazards = (s) => (worldMods(s).homeDeath || []).filter((h) => (h.minFloor == null || s.floor >= h.minFloor) && (h.maxFloor == null || s.floor <= h.maxFloor)
    && !(INSIDE.includes(h.id) && s.floor === 0));
  function homeRisk(s) {
    return homeHazards(s).reduce((a, h) => a + h.chance, 0) + (worldMods(s).nightDeath || []).reduce((a, h) => a + h.chance, 0);
  }
  // 外出工作：骨折加重消耗；事件可能致命；有些病在外面傳染
  function outdoorHazard(s, job, rep) {
    if (!D.OUTDOOR.includes(job)) return;
    if (s.conds.fracture) { hurt(s, 8, job); rep.line('骨折令外出更辛苦', 'bad', -8, 'body'); }
    const M = worldMods(s);
    (M.outdoorDeath || []).forEach((h) => {
      if (s.body <= 0) return;
      const ch = h.chance * guarded(s, h);
      if (rand(s) < ch) { kill(s, h.id); rep.line(evDef(h.ev).name + '：你沒能回家。', 'bad'); }
      else rep.line(evDef(h.ev).name + '：你平安回來了（致命機會 ' + Math.round(ch * 1000) / 10 + '%）', '');
    });
    (M.condChance || []).forEach((c) => { if (c.outdoor && rand(s) < c.chance) addCond(s, c.id, rep); });
  }

  // ---------- 開局 ----------
  function newRun(opts) {
    const bg = D.BACKGROUNDS[opts.bg];
    const seed = (opts.seed == null ? Math.floor(Math.random() * 1e9) : opts.seed) | 0;
    const s = {
      v: 5, seed, rngState: seed, bg: opts.bg, season: opts.season,
      day: 1, slot: 0, quarter: 0,
      cr: bg.cr, body: 0, spark: bg.spark, rating: 4.0,
      attr: Object.assign({}, bg.stats), paranoia: 15,
      floor: bg.floor, water: 0.8,
      soul: bg.soul, conscience: bg.conscience, bonusSignal: 0, rentDiscount: 0,
      usedDilemmas: {}, dilemma: null, dilemmaDay: 0,
      events: [], pending: [], eventNext: 4, eventsSeen: {}, nightSeen: {},
      conds: {}, noRest: 0, restedToday: false, allnighters: 0, allnighterDay: 0, lastCause: null,
      rentHike: 0, graceUsed: false, debt: 0,
      premiumUntil: 0, realFoodDay: 0,
      // 創作：作品形式等級、AI 對你風格的記憶、靈感物件
      forms: {}, formsSeen: {}, style: {}, session: null, handBonus: 0, studio: 0,
      objects: [D.START_OBJECT[opts.bg]].filter(Boolean), objSlots: 3, objStash: [], objSeen: {},
      unlocked: (opts.meta && opts.meta.unlocked) ? Object.keys(opts.meta.unlocked) : [],
      pastDeaths: (opts.meta && opts.meta.endings && opts.meta.endings.death) || 0,
      gear: { tank: false, harpoon: false, bag: false, monitor: false, helmet: false, gasmask: false },
      auto: 0, removed: { smile: false, label: false },
      mastery: { label: 0, smile: 0, dive: 0 },
      cards: [], uid: 1,
      works: [], usedRecipes: {}, discovered: {},
      kpis: [],
      npcs: D.NPCS.map((n) => ({ id: n.id, alive: true, signal: 0, friend: 0 })),
      saturation: 1, numbStreak: 0, workedToday: false,
      flags: { crashDay: 0, crashAmt: 0, bigOrder: 0, richDive: 0, fishDinner: 0, divedDay: 0, foodFree: 0 },
      stats: { labels: 0, wrong: 0, smiles: 0, perfects: 0, dives: 0, relics: 0, fish: 0, flows: 0, works: 0,
        crEarned: 0, hungryDays: 0, chats: 0, rests: 0, ot: 0, sins: 0, atones: 0, volunteer: 0, bestWork: null,
        actions: {}, deliveries: 0, lateDeliveries: 0, headlines: 0, shares: 0, buskNotes: 0, crowdMax: 0,
        patients: 0, illegal: 0, confessions: 0, interviews: 0, interviewScore: 0, lastReact: '', bestPlay: 0, maxObjects: 1 },
      log: { fish: {}, relics: {} },
      newsSeen: {}, morning: null, ended: null,
      legacy: (opts.meta && opts.meta.relics) ? opts.meta.relics.slice(-5) : [],
      greyed: (opts.meta && opts.meta.greyed) || 0,
    };
    s.body = bodyMax(s);
    const keys = Object.keys(D.KPIS);
    while (s.kpis.length < D.REVIEW_DAYS.length) {
      const k = pick(s, keys);
      if (!s.kpis.includes(k)) s.kpis.push(k);
    }
    bg.cards.forEach((id) => addCard(s, id));
    D.STARTER.forEach((id) => addCard(s, id));
    s.objects.forEach((id) => { s.objSeen[id] = true; });
    return s;
  }
  const countAction = (s, k) => { s.stats.actions[k] = (s.stats.actions[k] || 0) + 1; };

  // ---------- 素材卡 ----------
  function makeCard(s, id) {
    const c = D.CARDS[id];
    return { uid: s.uid++, id, name: c.name, tags: c.tags.slice(), value: c.value };
  }
  function addCard(s, idOrCard) {
    const card = typeof idOrCard === 'string' ? makeCard(s, idOrCard) : Object.assign({ uid: s.uid++ }, idOrCard);
    card.wear = card.wear || 0;
    s.cards.push(card);
    let dropped = null;
    // 素材庫滿了：丟掉用得最殘的一張（同樣殘就丟最舊的）
    if (s.cards.length > MAX_CARDS) {
      let worst = 0;
      s.cards.forEach((c, i) => {
        const w = s.cards[worst];
        if (i < s.cards.length - 1 && ((c.wear || 0) > (w.wear || 0) || ((c.wear || 0) === (w.wear || 0) && c.value < w.value && (c.wear || 0) > 0))) worst = i;
      });
      dropped = s.cards.splice(worst, 1)[0];
    }
    return { card, dropped };
  }

  // ---------- 創作技法與靈感物件 ----------
  // 技法：做某些事、和某些朋友聊天，會提升某種作品形式的等級
  function teach(s, key, chance, rep) {
    const fid = D.TEACH[key];
    if (!fid || rand(s) >= chance) return;
    s.forms[fid] = (s.forms[fid] || 1) + 1;
    const f = D.FORMS.find((x) => x.id === fid);
    if (rep) rep.line('技法提升：「' + f.name + '」升到 Lv.' + s.forms[fid], 'good');
  }
  const ownsObject = (s, id) => s.objects.includes(id) || s.objStash.includes(id);
  const objectAvailable = (s, o) => !o.unlock || s.unlocked.includes(o.id);
  function gainObject(s, id, rep) {
    const o = D.OBJ[id];
    if (!o || ownsObject(s, id)) return false;
    s.objSeen[id] = true;
    if (s.objects.length < s.objSlots) s.objects.push(id);
    else if (s.objStash.length < 4) s.objStash.push(id);
    else { s.cr += Math.round(D.OBJ_PRICE[o.rarity] / 2); if (rep) rep.line('物件欄已滿，把「' + o.name + '」賣給了天空區收藏家', ''); return false; }
    s.stats.maxObjects = Math.max(s.stats.maxObjects || 0, s.objects.length);
    if (rep) { rep.line('獲得靈感物件：「' + o.name + '」' + (s.objects.includes(id) ? '' : '（物件欄已滿，先放進儲物箱）'), 'good'); rep.obj(id); }
    return true;
  }
  function randomObject(s, ids) {
    const pool = ids.filter((id) => D.OBJ[id] && !ownsObject(s, id) && objectAvailable(s, D.OBJ[id]));
    return pool.length ? pick(s, pool) : null;
  }
  function equipObject(s, id) {
    if (!s.objStash.includes(id) || s.objects.length >= s.objSlots) return false;
    s.objStash = s.objStash.filter((x) => x !== id);
    s.objects.push(id);
    s.stats.maxObjects = Math.max(s.stats.maxObjects || 0, s.objects.length);
    return true;
  }
  function unequipObject(s, id) {
    if (!s.objects.includes(id) || s.objStash.length >= 4) return false;
    s.objects = s.objects.filter((x) => x !== id);
    s.objStash.push(id);
    return true;
  }
  function moveObject(s, id, dir) {
    const i = s.objects.indexOf(id), j = i + dir;
    if (i < 0 || j < 0 || j >= s.objects.length) return false;
    [s.objects[i], s.objects[j]] = [s.objects[j], s.objects[i]];
    return true;
  }
  function sellObject(s, id) {
    const o = D.OBJ[id];
    if (!o || !ownsObject(s, id)) return 0;
    s.objects = s.objects.filter((x) => x !== id);
    s.objStash = s.objStash.filter((x) => x !== id);
    const price = Math.round(D.OBJ_PRICE[o.rarity] / 2);
    s.cr += price;
    return price;
  }
  // 朋友幫你打磨素材：隨機一張沒有變化的素材得到「閃亮／燃燒／淚痕／回音」
  function polishCard(s, rep, who) {
    const plain = s.cards.filter((c) => !c.mod && !c.guilt);
    if (!plain.length) return;
    const c = pick(s, plain);
    const r = rand(s);
    c.mod = r < 0.4 ? 'shine' : r < 0.7 ? 'burn' : r < 0.9 ? 'tear' : 'echo';
    if (rep) rep.line((who || '你') + '幫你打磨了「' + c.name + '」：' + D.CARD_MODS[c.mod].name + '（' + D.CARD_MODS[c.mod].desc + '）', 'good');
  }
  // 二手靈感市集：每三天換一批貨
  function marketItems(s) {
    const period = Math.floor((s.day - 1) / 3);
    if (!s.market || s.market.period !== period) {
      const pool = D.OBJECTS.filter((o) => !o.npc && !o.start && objectAvailable(s, o)).map((o) => o.id);
      const items = [];
      while (items.length < 2 && pool.length) items.push(pool.splice(Math.floor(rand(s) * pool.length), 1)[0]);
      s.market = { period, items };
    }
    return s.market.items.filter((id) => !ownsObject(s, id));
  }
  function legacyCard(relic) {
    return { id: 'legacy', name: '前世作品《' + relic.name + '》', tags: relic.tags.slice(0, 2),
      value: 60 + Math.min(60, Math.round(relic.score / 100)), legacy: true };
  }

  // ---------- 時間 ----------
  const quarterOf = (day) => Math.min(D.REVIEW_DAYS.length - 1, Math.floor((day - 1) / 20));
  const isNight = (s) => s.slot === 2;
  const threshold = (s) => Math.round(D.THRESHOLDS[s.quarter] * (worldMods(s).thresholdMult || 1));
  const reviewDay = (s) => D.REVIEW_DAYS[s.quarter];
  const kpi = (s) => D.KPIS[s.kpis[s.quarter]];
  const flooded = (s) => s.floor > 0 && s.water >= s.floor;
  const nextRentDay = (s) => Math.ceil(s.day / D.RENT_EVERY) * D.RENT_EVERY;
  const foodCost = (s) => Math.round(seasonOf(s).food * (worldMods(s).foodMult || 1));

  function rentAmount(s, floor) {
    const f = floor == null ? s.floor : floor;
    if (f <= 0) return 0;
    const period = Math.floor((s.day - 1) / D.RENT_EVERY);
    return Math.round(D.BASE_RENT * D.FLOOR_RENT[f] * (1 + 0.03 * period + s.rentHike) * (worldMods(s).rentMult || 1));
  }

  // 抉擇與面試的訊號：資料寫的是舊版數值（門檻 16.5 萬時），按本季門檻等比例放大
  const sigScale = (s, v) => Math.round(v * threshold(s) / 165000);
  // 累積訊號（篩選日用來與門檻比較）
  function signal(s) {
    return s.works.reduce((a, w) => a + w.score, 0) + (s.bonusSignal || 0);
  }

  // ---------- 工作：AI 數據標註 ----------
  // o.flow：心流狀態（收入與消耗加倍）；o.gold：金色圖片（客戶付費較高）
  function labelItemPay(s, combo, o) {
    o = o || {};
    const tier = 1 + Math.min(6, Math.floor(combo / 8)) * 0.25;
    let pay = 2 * tier * (0.6 + 0.1 * s.rating) * (1 - (s.auto / 100) * 0.5)
      * (perk(s).labelPay || 1) * seasonOf(s).labelPay * worldPay(s, 'label') * obeyPay(s);
    if (s.spark < 1) pay *= 1.3; // 麻木反而令你更有效率
    if (o.ot) pay *= 1.5;
    if (o.flow) pay *= 2;
    if (o.gold) pay *= 1.5;
    if (s.flags.bigOrder === s.day) pay *= 2;
    return pay;
  }
  function labelItemDrain(s, o) {
    o = o || {};
    return 0.012 * (1 + 0.08 * Math.min(15, s.mastery.label)) * (o.ot ? 1.5 : 1) * (o.flow ? 2 : 1);
  }
  function labelConfig(s, o) {
    const m = Math.min(15, s.mastery.label);
    const dex = A(s, 'dex');
    return {
      duration: 45,
      phases: [0, 15, 30],          // 指引在第 15、30 秒更新
      startLimit: Math.max(1.5, 2.7 - 0.05 * m) + (s.gear.monitor ? 0.2 : 0) + 0.006 * dex,
      minLimit: 0.85 + (s.gear.monitor ? 0.2 : 0) + 0.003 * dex,
      flowAt: 15, flowTime: 7,      // 連續 15 張正確進入心流狀態
      supervisor: true,
      preview: !!s.gear.monitor,
      ads: s.premiumUntil < s.day,
      promptIndex: (s.day + (o && o.ot ? 3 : 0)) % D.LABEL_PROMPTS.length,
      ot: !!(o && o.ot),
    };
  }
  function applyLabel(s, res, o) {
    const ot = !!(o && o.ot);
    const rep = report(s, ot ? '深夜加班：AI 數據標註' : 'AI 數據標註');
    const cr = Math.round(res.cr);
    s.cr += cr; s.stats.crEarned += cr;
    addSpark(s, -res.drain);
    const bodyCost = ot ? 14 : 8;
    hurt(s, bodyCost, ot ? 'ot' : 'label');
    const caught = res.caught || 0;
    s.rating = clamp(s.rating + 0.01 * res.correct - 0.03 * res.wrong - 0.1 * caught, 1, 5);
    const autoBefore = s.auto;
    s.auto = clamp(s.auto + 0.025 * res.correct - 0.05 * res.wrong, 0, 100);
    s.mastery.label++;
    s.stats.labels += res.correct + res.wrong;
    s.stats.wrong += res.wrong;
    s.stats.flows += res.flows || 0;
    if (ot) s.stats.ot++;
    countAction(s, ot ? 'ot' : 'label');
    s.workedToday = true;
    rep.line('正確標註 ' + res.correct + ' 張，錯誤 ' + res.wrong + ' 張，最高連擊 ' + (res.maxCombo || 0), '');
    if (res.flows) rep.line('進入心流狀態 ' + res.flows + ' 次。你完全沒有思考。', 'bad');
    if (caught) rep.line('主管巡查時出錯 ' + caught + ' 次，評分額外下跌', 'bad');
    rep.delta('cr', cr); rep.delta('spark', -res.drain); rep.delta('body', -bodyCost);
    rep.line('全城自動化 ' + autoBefore.toFixed(1) + '% → ' + s.auto.toFixed(1) + '%', 'auto');
    rep.gain(pick(s, D.CARD_POOLS.label));
    if (!ot && rand(s) < 0.5) rep.gain(pick(s, D.CARD_POOLS.label));
    if (res.flows) rep.gain('l_flow');
    const poison = Math.min(2, Math.floor(res.wrong / 4));
    for (let i = 0; i < poison; i++) rep.gain('l_poison');
    applyAutomationNews(s, autoBefore, rep);
    train(s, ot ? { dex: 1.5, obey: 1.5, imag: -0.8, fit: -0.3 } : { dex: 1.5, obey: 1.2, imag: -0.4 }, rep);
    teach(s, 'label', 0.15, rep);
    sin(s, ot ? 0.8 : 0.6, rep, '你標註的數據，令一些人失去了工作');
    if (worldMods(s).labelSin) sin(s, worldMods(s).labelSin, rep, '你標註的數據被用來訓練瞄準系統', '標註過的目標', 'anger');
    return rep.done();
  }

  // ---------- 工作：企業情緒陪伴員 ----------
  // lane：laugh（笑）、nod（點頭）、hold（長笑）、pour（倒酒）、bias（附和偏見）
  const SMILE_PAY = { laugh: [5, 2.5], nod: [3, 1.5], hold: [8, 4], pour: [6, 3], bias: [6, 6] };
  const SMILE_DRAIN = { laugh: [0.018, 0.008], nod: [0.006, 0.003], hold: [0.03, 0.015], pour: [0, 0], bias: [0, 0] };
  function smileItemPay(s, kind, lane) {
    const t = SMILE_PAY[lane || 'laugh'];
    const base = kind === 'perfect' ? t[0] : kind === 'good' ? t[1] : 0;
    return base * (s.spark < 1 ? 1.3 : 1) * worldPay(s, 'smile') * obeyPay(s);
  }
  function smileItemDrain(s, kind, lane) {
    const t = SMILE_DRAIN[lane || 'laugh'];
    const base = kind === 'perfect' ? t[0] : kind === 'good' ? t[1] : 0;
    return base * (1 + 0.08 * Math.min(15, s.mastery.smile));
  }
  function smileConfig(s) {
    return {
      duration: 36, bpm: 92 + Math.min(24, s.mastery.smile * 2),
      trapRate: 0.14, nodRate: 0.28, holdRate: 0.14, pourEvery: 9,
      winBonus: 0.0004 * A(s, 'rhythm'), biasCount: worldMods(s).biasMore ? 5 : 3,
      ads: s.premiumUntil < s.day,
    };
  }
  function applySmile(s, res) {
    const rep = report(s, '企業情緒陪伴');
    const tip = Math.round((res.satisfaction >= 0.8 ? 30 : res.satisfaction >= 0.6 ? 12 : 0) * socialTip(s));
    const fine = res.trapHits * 5;
    const cr = Math.round(res.cr) + tip - fine;
    s.cr += cr; s.stats.crEarned += Math.max(0, cr);
    addSpark(s, -res.drain);
    hurt(s, 6, 'smile');
    s.mastery.smile++;
    s.stats.smiles += res.perfect + res.good;
    s.stats.perfects += res.perfect;
    countAction(s, 'smile');
    s.workedToday = true;
    rep.line('完美回應 ' + res.perfect + ' 次，普通 ' + res.good + ' 次，冷場 ' + res.miss + ' 次', '');
    if (res.pours || res.spills) rep.line('倒酒：恰到好處 ' + (res.pours || 0) + ' 杯，倒瀉 ' + (res.spills || 0) + ' 杯', '');
    if (tip) rep.line('客人非常滿意，打賞 $' + tip, 'good');
    if (fine) rep.line('在客人傷心時發笑 ' + res.trapHits + ' 次，罰款 $' + fine, 'bad');
    rep.delta('cr', cr); rep.delta('spark', -res.drain); rep.delta('body', -6);
    rep.gain(pick(s, D.CARD_POOLS.smile));
    if (res.satisfaction >= 0.85) rep.gain('s_truth');
    if (res.satisfaction < 0.5) rep.gain('s_complaint');
    if ((res.pours || 0) >= 2) rep.gain('s_wine');
    const e = res.endorsed || 0;
    train(s, { rhythm: 1.5, social: 0.8, empathy: -0.4 - 0.5 * e, obey: 0.5 * e }, rep);
    if (e) sin(s, 0.7 * e, rep, '附和了客人的偏見 ' + e + ' 次', e >= 2 ? '附和過的偏見' : null, 'anger');
    return rep.done();
  }

  // ---------- 舊城潛水 ----------
  // 每區的遺物與儲物櫃：舊街有散落的遺物，地鐵站要撬儲物櫃，舊商場兩者都有。
  // 同一天第二次潛水，舊城已被其他拾荒者搜刮過。
  const DIVE_LAYOUT = [
    { relics: 1, lockers: 0, lockerCard: 0 },
    { relics: 0, lockers: 1, lockerCard: 0.7 },
    { relics: 1, lockers: 1, lockerCard: 0.5 },
  ];
  function diveConfig(s) {
    const p = perk(s);
    const rich = s.flags.richDive === s.day;
    const picked = s.flags.divedDay === s.day;
    const bonus = worldMods(s).relicBonus || 0;
    const zones = D.DIVE_ZONES.map((z, i) => {
      const L = DIVE_LAYOUT[i];
      let n = L.relics + (i === 0 ? seasonOf(s).diveRelics : 0) + (rich && i > 0 ? 1 : 0) + (i === 2 ? bonus : 0);
      let ln = L.lockers + (rich && i > 0 ? 1 : 0);
      if (picked) { n = i === 2 ? 1 : 0; ln = 0; }
      const relics = [];
      for (let k = 0; k < n; k++) relics.push(pick(s, z.relics));
      const lockers = [];
      for (let k = 0; k < ln; k++) lockers.push({ card: rand(s) < L.lockerCard ? pick(s, z.relics) : null, money: 3 + Math.floor(rand(s) * 6) });
      return { relics, lockers };
    });
    let legacy = null;
    if (s.legacy.length && !picked && rand(s) < 0.4) legacy = legacyCard(pick(s, s.legacy));
    const scrap = [];
    for (let i = 0; i < (picked ? 1 : 3); i++) scrap.push(3 + Math.floor(rand(s) * 4));
    return {
      oxygen: 45 * (p.oxygen || 1) * (s.gear.tank ? 1.3 : 1) * (1 + 0.02 * Math.min(10, s.mastery.dive)) * (1 + 0.004 * A(s, 'swim')),
      speedMult: 1 + 0.002 * A(s, 'swim') + 0.001 * A(s, 'fit'),
      dmgMult: calmMult(s),
      harpoon: { cd: s.gear.harpoon ? 0.4 : 0.7, dmg: s.gear.harpoon ? 2 : 1 },
      capacity: 8 + (s.gear.bag ? 4 : 0),
      zones, legacy, scrap, picked,
      fish: { sardine: 2, eel: 2 + Math.floor(s.day / 30), grouper: 1 + Math.floor(s.day / 45), jelly: 3 + Math.floor(s.day / 25) },
    };
  }
  function diveBodyCost(s) {
    return Math.round((14 - seasonOf(s).outdoorBody) * (perk(s).diveBody || 1));
  }
  // res：{ relics: [卡 id 或前世作品], money, fish: { sardine, eel, grouper }, hits, drowned, lockers }
  function applyDive(s, res) {
    const rep = report(s, '舊城潛水');
    const fish = res.fish || {};
    const cost = Math.round(diveBodyCost(s) + 5 * res.hits * calmMult(s) + (res.drowned ? 15 : 0));
    hurt(s, cost, 'dive', { hits: res.hits, drowned: !!res.drowned, lockers: res.lockers || 0 });
    s.cr += res.money; s.stats.crEarned += res.money;
    const n = res.relics.length;
    const sp = addSpark(s, 0.05 * n);
    const caught = (fish.sardine || 0) + (fish.eel || 0) + (fish.grouper || 0);
    s.mastery.dive++;
    s.flags.divedDay = s.day;
    s.stats.dives++; s.stats.relics += n; s.stats.fish += caught;
    countAction(s, 'dive');
    Object.keys(fish).forEach((k) => { if (fish[k]) s.log.fish[k] = true; });
    res.relics.forEach((r) => { if (typeof r === 'string') s.log.relics[r] = true; });
    if (res.drowned) rep.line('氧氣耗盡，你掙扎著浮上水面，失去了一半收穫', 'bad');
    if (res.hits) rep.line('被咬或碰撞 ' + res.hits + ' 次', 'bad');
    const fishText = Object.keys(fish).filter((k) => fish[k] && D.FISH[k].value)
      .map((k) => D.FISH[k].name + ' ×' + fish[k]).join('、');
    if (fishText) rep.line('漁獲：' + fishText, '');
    rep.line('打撈遺物 ' + n + ' 件，賣出漁獲與廢料 $' + res.money, '');
    if (Object.keys(fish).some((k) => fish[k] && D.FISH[k].dinner)) {
      s.flags.fishDinner = s.day;
      rep.line('留下一條大魚當晚餐，今晚不用花錢吃飯', 'good');
    }
    rep.delta('cr', res.money); rep.delta('body', -cost);
    if (sp) rep.delta('spark', sp);
    res.relics.forEach((r) => rep.gain(r));
    train(s, { swim: 1.5, fit: 1, calm: 0.4 }, rep);
    teach(s, 'dive', 0.3, rep);
    outdoorHazard(s, 'dive', rep);
    if (n && rand(s) < 0.1) { const o = randomObject(s, ['oldmap', 'neonshard', 'collectorbox']); if (o) gainObject(s, o, rep); }
    if (res.lockers) sin(s, 0.5 * res.lockers, rep, '撬開了別人的儲物櫃 ' + res.lockers + ' 個');
    return rep.done();
  }

  // ---------- 工作：外送潛水 ----------
  function deliveryConfig(s) {
    return {
      duration: 45,
      speedMult: (1 + 0.003 * A(s, 'fit') + 0.002 * A(s, 'swim')) * (1 - 0.15 * Math.min(1, s.soul / SOUL_LIMIT)),
      payMult: (perk(s).deliveryPay || 1) * worldPay(s, 'delivery') * obeyPay(s) * (0.6 + 0.1 * s.rating),
      tipMult: socialTip(s), dmgMult: calmMult(s),
      boats: 3 + Math.floor(s.day / 25),
    };
  }
  function applyDelivery(s, res) {
    const rep = report(s, '外送潛水');
    const cr = Math.round(res.cr);
    const body = Math.round((10 - seasonOf(s).outdoorBody) + 3 * res.hits * calmMult(s));
    s.cr += cr; s.stats.crEarned += cr;
    hurt(s, body, 'delivery', { hits: res.hits });
    if (res.hits >= 2 && rand(s) < 0.3) addCond(s, 'fracture', rep);
    const sp = addSpark(s, -0.15);
    s.rating = clamp(s.rating + 0.02 * res.deliveries - 0.08 * res.late, 1, 5);
    s.stats.deliveries += res.deliveries; s.stats.lateDeliveries += res.late;
    countAction(s, 'delivery');
    s.workedToday = true;
    rep.line('送出 ' + res.deliveries + ' 單，遲到 ' + res.late + ' 單，被船撞 ' + res.hits + ' 次', '');
    rep.delta('cr', cr); rep.delta('body', -body); rep.delta('spark', sp);
    if (res.late) rep.gain('c_cold');
    if (res.late >= 2) rep.gain('c_review');
    if (rand(s) < 0.5) rep.gain('c_door');
    train(s, { fit: 1.5, swim: 1.2, calm: 0.5, social: 0.3 }, rep);
    teach(s, 'delivery', 0.25, rep);
    outdoorHazard(s, 'delivery', rep);
    return rep.done();
  }

  // ---------- 工作：陰謀論內容農場 ----------
  // 一則標題的轉發量：組合越煽動、捏造程度越高，轉發越多
  function farmScore(tiles) {
    const tags = tiles.flatMap((t) => t.tags);
    let mult = 1;
    const combos = [];
    D.FARM_COMBOS.forEach((c) => {
      const need = c.need.slice();
      const pool = tags.slice();
      const ok = need.every((t) => { const i = pool.indexOf(t); if (i < 0) return false; pool.splice(i, 1); return true; });
      if (ok) { mult *= c.mult; combos.push(c.name); }
    });
    const fake = tiles.reduce((a, t) => a + t.fake, 0) / tiles.length;
    const truth = tags.filter((t) => t === 'truth').length;
    const shares = Math.round(900 * mult * (1 + fake * 1.2) * (truth ? 0.5 : 1));
    return { shares, fake, truth, combos };
  }
  function farmConfig(s) {
    return { duration: 40, payMult: (perk(s).farmPay || 1) * worldPay(s, 'farm') * obeyPay(s), showFake: A(s, 'insight') >= 50 };
  }
  function applyFarm(s, res) {
    const rep = report(s, '陰謀論內容農場');
    const cr = Math.round(res.cr);
    s.cr += cr; s.stats.crEarned += cr;
    hurt(s, 4, 'farm');
    const sp = addSpark(s, -0.25);
    s.stats.headlines += res.headlines; s.stats.shares += res.shares;
    countAction(s, 'farm');
    s.workedToday = true;
    rep.line('寫了 ' + res.headlines + ' 則標題，總轉發量 ' + res.shares.toLocaleString(), '');
    if (res.truth) rep.line('其中 ' + res.truth + ' 則有事實根據，但轉發量較低', '');
    rep.delta('cr', cr); rep.delta('body', -4); rep.delta('spark', sp);
    rep.gain(res.shares > 20000 ? 'f_viral' : 'f_war');
    if (res.truth >= 2) rep.gain('f_truth');
    addParanoia(s, 1.5 * res.fakeTotal, rep);
    train(s, { insight: 0.4 + 0.3 * res.truth, craft: 0.5, obey: 1, empathy: -0.5 }, rep);
    teach(s, 'farm', 0.3, rep);
    if (rand(s) < 0.25) gainObject(s, 'anonacct', rep);
    if (res.fakeTotal > 0.3) sin(s, 0.25 * res.fakeTotal, rep, '你製造的恐慌正在城市裡流傳', res.fakeTotal >= 4 ? '寫過的假新聞' : null, 'neon');
    return rep.done();
  }

  // ---------- 街頭表演（唯一會增加火花的工作） ----------
  function buskConfig(s) {
    return { duration: 45, payMult: (perk(s).buskPay || 1) * worldPay(s, 'busk') * socialTip(s),
      showTime: Math.max(0.28, 0.5 - 0.002 * A(s, 'rhythm')) };
  }
  function applyBusk(s, res) {
    const rep = report(s, '街頭表演');
    const cr = Math.round(res.cr);
    const body = 4 - seasonOf(s).outdoorBody;
    s.cr += cr; s.stats.crEarned += cr;
    hurt(s, body, 'busk');
    const sp = addSpark(s, Math.min(0.8, 0.15 + 0.02 * res.soloNotes + 0.03 * res.rounds));
    s.stats.buskNotes += res.notes || 0;
    s.stats.crowdMax = Math.max(s.stats.crowdMax, res.crowdMax);
    countAction(s, 'busk');
    rep.line('完成 ' + res.rounds + ' 段點唱，即興彈了 ' + res.soloNotes + ' 個音，最多 ' + res.crowdMax + ' 人圍觀', '');
    rep.delta('cr', cr); rep.delta('body', -body); rep.delta('spark', sp);
    rep.gain(res.crowdMax >= 6 ? 'p_clap' : res.soloNotes >= 12 ? 'p_chorus' : 'p_hat');
    train(s, { rhythm: 1.5, craft: 1, social: 0.8, imag: 0.5, obey: -0.5 }, rep);
    teach(s, 'busk', 0.4, rep);
    outdoorHazard(s, 'busk', rep);
    return rep.done();
  }

  // ---------- 工作：黑市義體診所 ----------
  function clinicConfig(s) {
    return { duration: 45, payMult: (perk(s).clinicPay || 1) * worldPay(s, 'clinic') * obeyPay(s), hint: A(s, 'tech') >= 50,
      maxPairs: A(s, 'tech') >= 60 ? 4 : 5 };
  }
  function applyClinic(s, res) {
    const rep = report(s, '黑市義體診所');
    const cr = Math.round(res.cr);
    s.cr += cr; s.stats.crEarned += cr;
    hurt(s, 5, 'clinic', { illegal: res.illegal });
    const sp = addSpark(s, -0.25);
    s.stats.patients += res.patients; s.stats.illegal += res.illegal;
    countAction(s, 'clinic');
    s.workedToday = true;
    rep.line('完成 ' + res.patients + ' 名病人，其中 ' + res.illegal + ' 件未經登記，接錯線 ' + res.mistakes + ' 次', '');
    rep.delta('cr', cr); rep.delta('body', -5); rep.delta('spark', sp);
    rep.gain(res.patients >= 4 ? 'k_pulse' : 'k_oldarm');
    if (res.illegal) rep.gain('k_suppress');
    train(s, { tech: 1.5, calm: 1, dex: 0.5 }, rep);
    if (res.illegal) sin(s, 0.8 * res.illegal, rep, '你裝上了 ' + res.illegal + ' 件沒有登記的義體', res.illegal >= 2 ? '未登記的義體' : null, 'machine');
    return rep.done();
  }

  // ---------- 夢境面試（篩選日前兩晚） ----------
  function interviewQuestions(s) {
    const idx = D.INTERVIEW_QS.map((_, i) => i);
    const out = [];
    while (out.length < 5 && idx.length) out.push(idx.splice(Math.floor(rand(s) * idx.length), 1)[0]);
    s.interviewSet = out;
    return out;
  }
  // answers：[{ q: 題目索引, a: 答案索引（-1 = 沉默） }]
  function applyInterview(s, answers) {
    const rep = report(s, '外星 HR 夢境面試');
    let score = 0;
    answers.forEach(({ q, a }) => {
      const ans = a < 0 ? D.INTERVIEW_TIMEOUT : D.INTERVIEW_QS[q].a[a];
      score += ans.score;
      if (ans.stats) train(s, ans.stats, rep);
      if (ans.sin) sin(s, ans.sin, rep, '你在面試中說了違心的話');
      if (ans.atone) atone(s, ans.atone, rep, '你在夢裡說了真心話');
      if (ans.card) rep.gain(ans.card);
      s.stats.lastReact = ans.react;
    });
    const bonus = Math.round(threshold(s) * Math.max(-0.04, score * 0.015));
    s.bonusSignal += bonus;
    s.stats.interviews++; s.stats.interviewScore += score;
    rep.line('面試評分 ' + (score > 0 ? '+' : '') + score + '，外星訊號 ' + (bonus >= 0 ? '+' : '−') + Math.abs(bonus).toLocaleString(), bonus >= 0 ? 'good' : 'bad');
    if (score >= 4) { rep.gain('i_smile'); const o = randomObject(s, ['aliencard', 'kpiclock']); if (o) gainObject(s, o, rep); }
    return rep.done();
  }

  // ---------- 聊天、義工、休息 ----------
  function chatCost(s) { return perk(s).freeChat ? 0 : 15; }
  function aliveNpcs(s) { return s.npcs.filter((n) => n.alive); }
  function applyChat(s, npcId) {
    const n = s.npcs.find((x) => x.id === npcId);
    const def = D.NPCS.find((x) => x.id === npcId);
    const rep = report(s, '與' + def.name + '聊天');
    const cost = chatCost(s);
    const outdoor = seasonOf(s).outdoorBody;
    s.cr -= cost;
    const sp = addSpark(s, 0.4 + 0.1 * Math.min(3, Math.max(0, n.friend)) + 0.003 * A(s, 'social') + (perk(s).chatSpark || 0));
    heal(s, 5 + outdoor);
    n.friend++;
    s.stats.chats++;
    countAction(s, 'chat');
    if (cost) rep.delta('cr', -cost);
    rep.delta('spark', sp); rep.delta('body', 5 + outdoor);
    rep.gain(def.cards[(Math.max(1, n.friend) - 1) % def.cards.length]);
    if (perk(s).chatExtra) rep.gain(def.cards[n.friend % def.cards.length]);
    addParanoia(s, -2);
    train(s, { social: 1.2, empathy: 1, imag: 0.4 }, rep);
    teach(s, npcId, n.friend === 2 || n.friend === 4 ? 1 : 0.25, rep);
    if (n.friend === 3) { const o = D.OBJECTS.find((x) => x.npc === npcId); if (o) gainObject(s, o.id, rep); }
    if (rand(s) < 0.3 + 0.002 * A(s, 'social')) polishCard(s, rep, def.name);
    return rep.done();
  }
  function applyVolunteer(s) {
    const rep = report(s, '在避難所做義工');
    hurt(s, 6, 'volunteer');
    const sp = addSpark(s, 0.2);
    s.stats.volunteer++;
    countAction(s, 'volunteer');
    rep.delta('body', -6); rep.delta('spark', sp);
    atone(s, 2.5 * (perk(s).volunteerAtone || 1), rep, '你幫忙分派物資，靈魂輕了一點');
    rep.gain('v_shelter');
    train(s, { empathy: 1.5, fit: 0.5 }, rep);
    teach(s, 'volunteer', 0.35, rep);
    outdoorHazard(s, 'volunteer', rep);
    return rep.done();
  }
  function applyRest(s) {
    const rep = report(s, '休息');
    const b = s.floor === 0 ? 12 : 22;
    heal(s, b);
    s.restedToday = true;
    const cured = cureConds(s, 'rest');
    if (cured.length) rep.line('休息過後，' + cured.join('、') + '好了', 'good');
    if (s.noRest >= 3) rep.line('你終於休息了。連續 ' + s.noRest + ' 天沒有休息的紀錄歸零。', 'good');
    const sp = addSpark(s, 0.3);
    s.stats.rests++;
    countAction(s, 'rest');
    rep.delta('body', b); rep.delta('spark', sp);
    if (s.spark >= 3.5 || (A(s, 'imag') >= 60 && rand(s) < 0.3)) { rep.line('你做了一個很奇怪的夢', 'good'); rep.gain(pick(s, D.CARD_POOLS.dream)); }
    addParanoia(s, -2);
    train(s, { imag: 0.4 }, rep);
    return rep.done();
  }

  // ---------- 行動清單（讓介面顯示取捨） ----------
  function actions(s) {
    const list = [];
    const outdoor = seasonOf(s).outdoorBody;
    const labelLocked = s.rating < 2 ? '平台帳戶審查中（評分低於 2 星）' : null;
    let labelCr = 0;
    for (let i = 0; i < 28; i++) labelCr += labelItemPay(s, i);
    labelCr = Math.round(labelCr);
    const labelSpark = round1(28 * labelItemDrain(s));
    const tired = s.body > 10 ? null : '身體太差，撐不住了';
    if (!isNight(s)) {
      list.push({ id: 'label', group: 'work', name: 'AI 數據標註', sub: '教 AI 認貓，好讓它以後不再需要你',
        fx: [['cr', '約 +$' + labelCr], ['body', '−8'], ['spark', '約 −' + labelSpark], ['card', '機械']],
        reason: s.removed.label ? '職位已被 AI 取代' : worldClosed(s, 'label') || labelLocked });
      list.push({ id: 'smile', group: 'work', name: '企業情緒陪伴', sub: '陪有錢人說笑、點頭、倒酒，笑得越準越值錢',
        fx: [['cr', '約 +$' + Math.round(150 * worldPay(s, 'smile'))], ['body', '−6'], ['spark', '約 −' + round1(24 * smileItemDrain(s, 'perfect'))], ['card', '霓虹']],
        reason: s.removed.smile ? '已被 AI 情緒伴侶 2.0 取代' : worldClosed(s, 'smile') });
      list.push({ id: 'delivery', group: 'work', name: '外送潛水', sub: '在淹水的街道限時送外賣，小心天空區的快艇',
        fx: [['cr', '約 +$' + Math.round(70 * worldPay(s, 'delivery') * (perk(s).deliveryPay || 1))], ['body', '−' + (10 - outdoor) + ' 起'], ['spark', '−0.15'], ['card', '飢餓・水']],
        reason: worldClosed(s, 'delivery') || tired });
      list.push({ id: 'farm', group: 'work', name: '陰謀論內容農場', sub: '拼湊聳動標題，越假越多人轉發',
        fx: [['cr', '約 +$' + Math.round(80 * worldPay(s, 'farm') * (perk(s).farmPay || 1))], ['spark', '−0.25'], ['soul', '假新聞會變重'], ['card', '霓虹・憤怒']],
        reason: worldClosed(s, 'farm') });
      list.push({ id: 'clinic', group: 'work', name: '黑市義體診所', sub: '替病人接駁義體；有些義體沒有登記',
        fx: [['cr', '約 +$' + Math.round(55 * worldPay(s, 'clinic') * (perk(s).clinicPay || 1))], ['body', '−5'], ['spark', '−0.25'], ['card', '機械']],
        reason: A(s, 'tech') < 25 ? '技術不足 25，你不懂接駁義體' : worldClosed(s, 'clinic') });
      list.push({ id: 'dive', group: 'life', name: '舊城潛水', sub: s.flags.divedDay === s.day ? '舊城今天已被搜刮過，收穫會很少' : '用魚叉捕魚，打撈水淹舊城的遺物',
        fx: [['cr', '漁獲 約 +$20'], ['body', '−' + diveBodyCost(s) + ' 起'], ['spark', '+少許'], ['card', '水・記憶']],
        reason: s.body > 10 ? worldClosed(s, 'dive') : '身體太差，下水會有生命危險' });
      list.push({ id: 'busk', group: 'life', name: '街頭表演', sub: '在天橋下表演，收入很少，但會讓火花變旺',
        fx: [['cr', '約 +$' + Math.round(25 * worldPay(s, 'busk') * (perk(s).buskPay || 1))], ['body', '−' + (4 - outdoor)], ['spark', '+0.3 起'], ['card', '人情・希望']],
        reason: worldClosed(s, 'busk') || tired });
      const cost = chatCost(s);
      list.push({ id: 'chat', group: 'life', name: '找朋友聊天', sub: '還有 ' + aliveNpcs(s).length + ' 個朋友留在浮城',
        fx: [['cr', cost ? '−$' + cost : '免費'], ['body', '+' + (5 + outdoor)], ['spark', '+0.4 起'], ['card', '人情']],
        reason: aliveNpcs(s).length === 0 ? '他們全都被帶走了' : s.cr < cost ? '沒錢請人喝東西' : null });
      list.push({ id: 'volunteer', group: 'life', name: '到避難所做義工', sub: '幫人不會賺錢，但會讓靈魂變輕',
        fx: [['soul', '−' + round1(2.5 * (perk(s).volunteerAtone || 1) * (worldMods(s).atoneMult || 1)) + ' 克'], ['body', '−6'], ['spark', '+0.2'], ['card', '人情']],
        reason: tired });
      list.push({ id: 'rest', group: 'life', name: '休息', sub: '什麼都不做，也是一種選擇',
        fx: [['body', '+' + (s.floor === 0 ? 12 : 22)], ['spark', '+0.3']] });
    } else {
      const CR = D.CRAFT, Cr = IE.Create;
      const m = Cr.objMods(s);
      const hand = CR.hand + (s.handBonus || 0) + (perk(s).handBonus || 0) + m.hand;
      list.push({ id: 'create', group: 'night', name: '創作', sub: '抽 ' + hand + ' 張素材，下筆 ' + (CR.plays + m.plays) + ' 次、改稿 ' + (CR.discards + m.discards) + ' 次，把今天變成作品',
        fx: [['card', '素材庫 ' + s.cards.length + ' 張'], ['cr', '材料 −$' + CR.cost], ['sig', '訊號 ↑'], ['body', '−4']],
        reason: Cr.canStart(s, 'normal') });
      list.push({ id: 'allnighter', group: 'night', name: '通宵創作', sub: '多一次下筆、多一次改稿；天亮時你會很後悔',
        fx: [['card', '下筆 ' + (CR.plays + m.plays + 1) + ' 次'], ['cr', '材料 −$' + CR.allnighterCost], ['body', '−15'], ['spark', '−0.2']],
        reason: Cr.canStart(s, 'allnighter') });
      list.push({ id: 'ot', group: 'night', name: '深夜加班標註', sub: '收入 ×1.5，消耗 ×1.5',
        fx: [['cr', '約 +$' + Math.round(labelCr * 1.5)], ['body', '−14'], ['spark', '約 −' + round1(labelSpark * 1.5)]],
        reason: s.removed.label ? '職位已被 AI 取代' : worldClosed(s, 'ot') || labelLocked || (s.body <= 14 ? '身體撐不住了' : null) });
      list.push({ id: 'rest', group: 'night', name: '早點睡', sub: '明天又是新的一天',
        fx: [['body', '+' + (s.floor === 0 ? 12 : 22)], ['spark', '+0.3']] });
    }
    // 危險提示：外出的致命機會、身體撐不住、過勞與連續通宵
    const risk = outdoorRisk(s);
    const BODY = { label: 8, ot: 14, smile: 6, delivery: 10, farm: 4, clinic: 5, dive: diveBodyCost(s), busk: 4, volunteer: 6, create: 4, allnighter: 15 };
    list.forEach((a) => {
      if (risk > 0 && D.OUTDOOR.includes(a.id)) a.fx.push(['danger', '致命 ' + Math.round(risk * 1000) / 10 + '%']);
      if (s.conds.fracture && D.OUTDOOR.includes(a.id)) a.fx.push(['danger', '骨折：身體額外 −8']);
      const cost = (BODY[a.id] || 0) + (s.conds.fracture && D.OUTDOOR.includes(a.id) ? 8 : 0);
      if (cost && s.body - cost <= 0) a.fx.push(['danger', '身體撐不住：可能致命']);
      if (a.id === 'allnighter' && s.allnighters >= 1) a.fx.push(['danger', '連續第 ' + (s.allnighters + 1) + ' 晚通宵' + (s.allnighters >= 2 ? '：猝死機會 20%' : '')]);
      if (a.id === 'rest' && s.noRest >= 2) a.fx.push(['note', '重置過勞（已連續 ' + s.noRest + ' 天沒有休息）']);
    });
    list.forEach((a) => { a.enabled = !a.reason; });
    return list;
  }

  // ---------- 商店 ----------
  // 業力抵銷額度：每買一份，下一份貴 $30
  const offsetCost = (s) => 90 + 30 * (s.offsets || 0);
  function shop(s) {
    const items = [];
    const S = D.SHOP;
    items.push({ id: 'premium', ...S.premium, owned: s.premiumUntil >= s.day,
      note: s.premiumUntil >= s.day ? '有效至第 ' + s.premiumUntil + ' 天' : null });
    items.push({ id: 'supplement', ...S.supplement });
    items.push({ id: 'realfood', ...S.realfood, owned: s.realFoodDay === s.day, note: s.realFoodDay === s.day ? '今天已經吃過' : null });
    items.push({ id: 'tools', ...S.tools, owned: s.handBonus >= 1 });
    if (s.objSlots < 5) items.push({ id: 'studio', name: '租用工作室一角', desc: '靈感物件欄 +1（最多 5 格）', cost: s.objSlots === 3 ? 220 : 360 });
    marketItems(s).forEach((id) => {
      const o = D.OBJ[id];
      items.push({ id: 'obj:' + id, name: '【二手靈感市集】' + o.name, desc: D.RARITY[o.rarity] + '・' + o.desc, cost: D.OBJ_PRICE[o.rarity], obj: id });
    });
    ['tank', 'harpoon', 'bag', 'monitor'].forEach((k) => items.push({ id: k, ...S[k], owned: s.gear[k] }));
    items.push({ id: 'offset', ...S.offset, cost: offsetCost(s), owned: s.soul <= 0,
      note: '你的靈魂現在重 ' + s.soul.toFixed(1) + ' 克；需求越大，價格越高' });
    const curable = condsInfo(s).filter((c) => c.cure === 'medicine');
    items.push({ id: 'medicine', ...S.medicine, owned: false, note: curable.length ? '你現在有：' + curable.map((c) => c.name).join('、') : '你現在沒有需要用藥的病痛', need: !curable.length });
    ['helmet', 'gasmask'].forEach((k) => items.push({ id: k, ...S[k], owned: s.gear[k] }));
    if (worldMods(s).eraseShop) {
      items.push({ id: 'erase', name: '記憶刪除服務', desc: '忘記一段內疚的往事：靈魂 −4 克，良知 −15%，失去所有「記憶」素材', cost: 50 });
    }
    if (s.floor === 0) {
      const f = Math.floor(s.water) + 1;
      if (f <= 8) items.push({ id: 'rehouse', name: '重新租屋（' + f + ' 樓）', desc: '按金為兩期租金', cost: 2 * rentAmount(s, f), target: f });
    } else {
      if (s.floor < 8) items.push({ id: 'moveup', name: '搬上 ' + (s.floor + 1) + ' 樓', desc: '每期租金 $' + rentAmount(s, s.floor + 1) + '，按金一期', cost: rentAmount(s, s.floor + 1) });
      if (s.floor > 1 && s.water < s.floor - 1) items.push({ id: 'movedown', name: '搬到 ' + (s.floor - 1) + ' 樓', desc: '每期租金 $' + rentAmount(s, s.floor - 1) + '，但離水更近', cost: 0 });
    }
    items.forEach((it) => { it.enabled = !it.owned && !it.need && s.cr >= it.cost; });
    return items;
  }
  function buy(s, id) {
    const it = shop(s).find((x) => x.id === id);
    if (!it || !it.enabled) return { ok: false, msg: '無法購買' };
    s.cr -= it.cost;
    if (it.obj) { gainObject(s, it.obj, null); return { ok: true, msg: '已購買：' + D.OBJ[it.obj].name }; }
    switch (id) {
      case 'premium': s.premiumUntil = s.day + 4; break;
      case 'supplement':
        addSpark(s, 1.2, true);
        s.flags.crashDay = s.day + 2; s.flags.crashAmt += 1.6; break;
      case 'realfood': s.realFoodDay = s.day; heal(s, 15); addSpark(s, 0.2); break;
      case 'tools': s.handBonus = 1; break;
      case 'studio': s.objSlots = Math.min(5, s.objSlots + 1); break;
      case 'tank': case 'harpoon': case 'bag': case 'monitor': case 'helmet': case 'gasmask': s.gear[id] = true; break;
      case 'medicine': cureConds(s, 'medicine'); break;
      case 'offset': s.soul = round1(Math.max(0, s.soul - 1.5)); s.offsets = (s.offsets || 0) + 1; break;
      case 'erase':
        s.soul = round1(Math.max(0, s.soul - 4));
        s.conscience = clamp(s.conscience - 0.15, 0, 1);
        s.cards = s.cards.filter((c) => !c.tags.includes('memory'));
        train(s, { imag: -4 }, null);
        break;
      case 'moveup': s.floor += 1; break;
      case 'movedown': s.floor -= 1; break;
      case 'rehouse': s.floor = it.target; s.graceUsed = false; s.debt = 0; break;
    }
    return { ok: true, msg: '已購買：' + it.name };
  }

  // ---------- 道德抉擇 ----------
  // 每天早上約四成機會遇到一個；大部分抉擇每局只出現一次，少數可以隔一段時間再出現
  function drawDilemma(s) {
    if (s.dilemmaDay === s.day) return s.dilemma;
    s.dilemmaDay = s.day; s.dilemma = null;
    if (rand(s) > 0.4 + (worldMods(s).dilemmaBoost || 0)) return null;
    const pool = D.DILEMMAS.filter((d) => {
      const used = s.usedDilemmas[d.id];
      const fresh = !used || (d.repeat && s.day - used >= d.repeat);
      return fresh && (!d.when || d.when(s));
    });
    if (!pool.length) return null;
    const d = pick(s, pool);
    const taken = s.npcs.filter((n) => !n.alive);
    s.dilemma = { id: d.id, npc: d.npc ? pick(s, aliveNpcs(s)).id : null, taken: d.taken && taken.length ? pick(s, taken).id : null };
    return s.dilemma;
  }
  function minReason(s, o) {
    if (!o.min) return null;
    for (const k of Object.keys(o.min)) {
      if (A(s, k) < o.min[k]) return '需要' + D.STATS[k].name + ' ' + o.min[k] + '（你只有 ' + Math.round(A(s, k)) + '）';
    }
    return null;
  }
  function optionFx(s, o) {
    const fx = [];
    const sign = (v) => (v > 0 ? '+' : '−') + Math.abs(v);
    if (o.cr) fx.push(['cr', sign(o.cr)]);
    if (o.body) fx.push(['body', sign(o.body)]);
    if (o.spark) fx.push(['spark', sign(o.spark)]);
    if (o.sin) fx.push(['soul', '+' + round1(o.sin * sinFactor(s)) + ' 克']);
    if (o.atone) fx.push(['soul', '−' + round1(Math.min(s.soul, o.atone)) + ' 克']);
    if (o.rating) fx.push(['note', '評分 ' + sign(o.rating)]);
    if (o.signal) fx.push(['sig', '訊號 ' + (o.signal > 0 ? '+' : '−') + Math.abs(sigScale(s, o.signal)).toLocaleString()]);
    if (o.rentDiscount) fx.push(['cr', '下期租金減半']);
    if (o.foodFree) fx.push(['cr', '今晚不用付飯錢']);
    if (o.loseCard) fx.push(['card', '失去一張素材']);
    if (o.takeNpc || o.takeNamedNpc) fx.push(['note', '一位朋友會被帶走']);
    if (o.paranoia) fx.push(['note', '偏執 +' + o.paranoia]);
    if (o.stats) Object.keys(o.stats).forEach((k) => fx.push(['stat', D.STATS[k].name + ' ' + sign(o.stats[k])]));
    if (o.card) fx.push(['card', D.CARDS[o.card].name]);
    if (o.obj) fx.push(['card', '靈感物件：' + D.OBJ[o.obj].name]);
    if (o.guilt && o.sin >= 1) fx.push(['card', '愧疚：' + o.guilt]);
    return fx;
  }
  function dilemmaView(s) {
    const cur = s.dilemma;
    if (!cur) return null;
    const d = D.DILEMMAS.find((x) => x.id === cur.id);
    const name = (id) => (id ? D.NPCS.find((n) => n.id === id).name : '');
    return { id: d.id, text: d.text.replace('{npc}', name(cur.npc)).replace('{taken}', name(cur.taken)),
      options: d.options.map((o, i) => ({ i, label: o.label, reason: (o.need && o.need(s)) || minReason(s, o), fx: optionFx(s, o) })) };
  }
  function takeNpc(s, n, rep) {
    n.alive = false;
    s.saturation = Math.max(0.25, s.saturation - 0.15);
    rep.line('「' + D.NPCS.find((x) => x.id === n.id).name + '」當晚被帶走了', 'bad');
  }
  function resolveDilemma(s, idx) {
    const cur = s.dilemma;
    const d = D.DILEMMAS.find((x) => x.id === cur.id);
    const o = d.options[idx];
    s.usedDilemmas[d.id] = s.day;
    s.dilemma = null;
    const rep = report(s, '抉擇：' + o.label);
    if (o.cr) { s.cr += o.cr; rep.delta('cr', o.cr); }
    if (o.body) { if (o.body > 0) heal(s, o.body); else hurt(s, -o.body, d.id === 'rescue' ? 'rescue' : 'dilemma'); rep.delta('body', o.body); }
    if (o.spark) rep.delta('spark', addSpark(s, o.spark, true));
    if (o.rating) { s.rating = clamp(o.rating === 5 ? 5 : s.rating + o.rating, 1, 5); rep.line('平台評分 ' + (o.rating === 5 ? '變成 5.0' : (o.rating > 0 ? '+' : '') + o.rating), o.rating > 0 ? 'good' : 'bad'); }
    if (o.signal) { const v = sigScale(s, o.signal); s.bonusSignal += v; rep.line('外星訊號 ' + (v > 0 ? '+' : '−') + Math.abs(v).toLocaleString(), v > 0 ? 'good' : 'bad'); }
    if (o.rentDiscount) { s.rentDiscount = o.rentDiscount; rep.line('下期租金減半', 'good'); }
    if (o.foodFree) s.flags.foodFree = s.day;
    if (o.flag) s.flags[o.flag] = true;
    if (o.loseCard && s.cards.length) {
      const lost = s.cards.splice(Math.floor(rand(s) * s.cards.length), 1)[0];
      rep.line('你借出了「' + lost.name + '」', '');
    }
    if (o.friend && cur.npc) s.npcs.find((n) => n.id === cur.npc).friend += o.friend;
    if (o.takeNpc) {
      const alive = s.npcs.filter((n) => n.alive).sort((a, b) => b.signal - a.signal);
      if (alive.length) takeNpc(s, alive[0], rep);
    }
    if (o.takeNamedNpc && cur.npc) takeNpc(s, s.npcs.find((n) => n.id === cur.npc), rep);
    if (o.card) rep.gain(o.card);
    if (o.obj) gainObject(s, o.obj, rep);
    if (o.stats) train(s, o.stats, rep);
    if (o.paranoia) addParanoia(s, o.paranoia, rep);
    if (o.sin) sin(s, o.sin, rep, '這件事會一直壓在你心上', o.guilt, o.tag);
    if (o.atone) atone(s, o.atone, rep, '你覺得輕了一點');
    return rep.done();
  }

  // ---------- 早上 ----------
  function startEvent(s, id, feed) {
    const w = evDef(id);
    s.events.push({ id, until: s.day + w.dur - 1 });
    s.eventsSeen[id] = (s.eventsSeen[id] || 0) + 1;
    if (feed) feed.unshift({ kind: 'world', grade: w.grade, text: '【' + D.SCOPES[w.scope].short + '・' + w.grade + ' 級：' + w.name + '】' + w.news + (w.sudden ? '（沒有任何預兆）' : '') });
    const fx = w.startFx || {};
    if (fx.water) s.water = Math.min(8.5, s.water + fx.water);
    if (fx.auto) s.auto = clamp(s.auto + fx.auto, 0, 100);
    if (fx.spark) addSpark(s, fx.spark, true);
    if (fx.crPct) s.cr = Math.round(s.cr * (1 + fx.crPct));
    if (fx.paranoia) addParanoia(s, fx.paranoia);
    if (fx.card) addCard(s, fx.card);
    if (fx.cond) addCond(s, fx.cond, null);
    if (id === 'aliens' && !ownsObject(s, 'alienradio')) gainObject(s, 'alienradio', null);
    if (fx.takeNpc) {
      const alive = s.npcs.filter((n) => n.alive);
      if (alive.length) { const n = pick(s, alive); n.alive = false; s.saturation = Math.max(0.25, s.saturation - 0.15); }
    }
  }
  // 選一個新事件：同一範圍不會同時有兩個；等級越高越罕見，而且要到某一天才會出現
  function pickEvent(s) {
    const busy = s.events.map((e) => evDef(e.id).scope).concat(s.pending.map((p) => evDef(p.id).scope));
    const pool = D.WORLD_EVENTS.filter((w) => s.day >= D.GRADES[w.grade].minDay && !busy.includes(w.scope) && (!w.when || w.when(s)));
    const fresh = pool.filter((w) => !s.eventsSeen[w.id]);
    const P = fresh.length ? fresh : pool;
    if (!P.length) return null;
    let r = rand(s) * P.reduce((a, w) => a + D.GRADES[w.grade].w, 0);
    for (const w of P) { r -= D.GRADES[w.grade].w; if (r <= 0) return w; }
    return P[P.length - 1];
  }
  function scheduleEvents(s, feed) {
    s.pending.filter((p) => p.day <= s.day).forEach((p) => startEvent(s, p.id, feed));
    s.pending = s.pending.filter((p) => p.day > s.day);
    if (s.events.length + s.pending.length < 2 && s.day >= s.eventNext && rand(s) < 0.32) {
      const w = pickEvent(s);
      if (w) {
        if (w.sudden || !w.omen) startEvent(s, w.id, feed);
        else s.pending.push({ id: w.id, day: s.day + (w.lead || 2), fresh: true });
        s.eventNext = s.day + 2 + Math.floor(rand(s) * 4);
      }
    }
    // 預兆：洞察高的人看得出還有多少天、事件有多嚴重
    s.pending.forEach((p) => {
      const w = evDef(p.id);
      feed.unshift({ kind: 'omen', text: (p.fresh ? '【新預兆】' : '【預兆】') + w.omen
        + (A(s, 'insight') >= 50 ? '（洞察：' + (p.day - s.day) + ' 天後，' + w.grade + ' 級）' : A(s, 'insight') >= 30 ? '（洞察：很快就會發生）' : '') });
      p.fresh = false;
    });
    activeEvents(s).forEach(({ def, until }) => {
      if (s.eventsSeen[def.id] && until - s.day + 1 < def.dur) feed.unshift({ kind: 'world', grade: def.grade, text: '【' + def.grade + ' 級事件持續：' + def.name + '】還有 ' + (until - s.day + 1) + ' 天。' });
    });
  }
  function morning(s) {
    if (s.morning && s.morning.day === s.day) return s.morning;
    const S = seasonOf(s);
    const feed = [{ kind: 'weather', text: pick(s, D.FEED.weather[s.season]) }];
    // 事件：大部分會先出現預兆，少數 S 級無預警爆發
    scheduleEvents(s, feed);
    const risk = outdoorRisk(s), home = homeRisk(s);
    if (risk > 0) feed.push({ kind: 'warn', text: '外出工作（潛水、外送、表演、義工）有致命危險：約 ' + Math.round(risk * 1000) / 10 + '%。' });
    if (home > 0) feed.push({ kind: 'warn', text: '今晚留在 ' + (s.floor ? s.floor + ' 樓' : '天橋下') + '有致命危險：約 ' + Math.round(home * 1000) / 10 + '%。' });
    condsInfo(s).forEach((c) => { if (c.lethal) feed.push({ kind: 'warn', text: '你的「' + c.name + '」已經第 ' + c.days + ' 天，再拖 ' + c.left + ' 天會致命。商店有藥箱。' }); });
    if (s.noRest >= 3) feed.push({ kind: 'warn', text: '你已經連續 ' + s.noRest + ' 天沒有休息。' + (s.noRest >= 4 ? '今晚起有猝死的危險。' : '') });
    if (s.cr < foodCost(s) * 2) feed.push({ kind: 'warn', text: '你的錢不夠吃兩晚飯。餓肚子睡覺會令身體 −25。' });
    (s.newsQueue || []).forEach((t) => feed.push({ kind: 'news', text: t }));
    s.newsQueue = [];
    feed.push(rand(s) < 0.5 ? { kind: 'ad', text: pick(s, D.FEED.ads) } : { kind: 'post', text: pick(s, D.FEED.conspiracy) });
    // 偏執太高的人，會在動態裡看見不存在的帖文
    if (s.paranoia >= 60) feed.push({ kind: 'post', text: pick(s, ['@？？？：它們在你的牆壁裡', '@你自己：不要相信明天的你', '@浮城政府：今天沒有發生任何事', '@阿星：我看得見你']), fake: true });
    addParanoia(s, 0.6);
    const k = kpi(s);
    feed.push({ kind: 'alien', text: '【星際人才發展局・招募簡報】我們尋找又亮又輕、沒有包袱的人。' + k.name + '：' + k.desc + '。為保護本局神經網絡，靈魂重量上限為 ' + SOUL_LIMIT + ' 克。' });
    if (flooded(s)) feed.push({ kind: 'warn', text: '水已經淹到你住的 ' + s.floor + ' 樓。你可以搬上一層，或者繼續泡在水裡。' });
    const astar = D.ASTAR[s.day] || null;
    s.morning = { day: s.day, feed, astar, season: S.name };
    return s.morning;
  }

  function applyAutomationNews(s, before, rep) {
    Object.keys(D.FEED.autoNews).map(Number).forEach((th) => {
      if (before < th && s.auto >= th && !s.newsSeen[th]) {
        s.newsSeen[th] = true;
        s.newsQueue = s.newsQueue || [];
        s.newsQueue.push(D.FEED.autoNews[th]);
        if (rep) rep.line(D.FEED.autoNews[th], 'news');
      }
    });
    if (s.auto >= 60) s.removed.smile = true;
    if (s.auto >= 100) s.removed.label = true;
  }

  // ---------- 一天結束 ----------
  function nightEvent(s, rep) {
    const pool = D.EVENTS.filter((e) => (!e.onlySeason || e.onlySeason === s.season) && (!e.when || e.when(s)));
    const weights = pool.map((e) => e.w * ((e.season && e.season[s.season]) || 1));
    let r = rand(s) * weights.reduce((a, b) => a + b, 0);
    let ev = pool[0];
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) { ev = pool[i]; break; } }
    const e = ev.alt && A(s, ev.alt.stat) >= ev.alt.min ? ev.alt : ev;
    rep.event = e.text;
    rep.line(e.text, 'event');
    s.nightSeen[ev.id] = true;
    if (e.body) { const b = e.body < 0 ? Math.round(e.body * calmMult(s)) : e.body; if (b > 0) heal(s, b); else hurt(s, -b, 'ev:' + ev.id); rep.delta('body', b); }
    if (e.cond && rand(s) < e.cond.chance) addCond(s, e.cond.id, rep);
    if (e.spark) rep.delta('spark', addSpark(s, e.spark, true));
    if (e.cr) { s.cr = Math.max(0, s.cr + e.cr); rep.delta('cr', e.cr); }
    if (e.crPct) { const loss = Math.min(e.crMax, Math.round(s.cr * -e.crPct)); s.cr -= loss; rep.delta('cr', -loss); }
    if (e.rentHike) s.rentHike += e.rentHike;
    if (e.rating) s.rating = clamp(s.rating + e.rating, 1, 5);
    if (e.flag) s.flags[e.flag] = s.day + 1;
    if (e.card) rep.gain(e.card);
    if (e.stats) train(s, e.stats, rep);
    if (e.paranoia) addParanoia(s, e.paranoia, rep);
    if (e.card === 'e_alien' && rand(s) < 0.5) gainObject(s, 'alienradio', rep);
    if (e.card === 'e_rob' && rand(s) < 0.4) gainObject(s, 'angrydiary', rep);
  }

  function endDay(s) {
    const S = seasonOf(s);
    const M = worldMods(s);
    const rep = report(s, '第 ' + s.day + ' 天結算');
    rep.review = null; rep.ending = null; rep.event = null; rep.interview = false;
    // 晚餐
    const food = foodCost(s);
    if (s.flags.fishDinner === s.day) {
      heal(s, 6);
      rep.line('晚餐：自己抓的魚', 'good', 6, 'body');
    } else if (s.flags.foodFree === s.day) {
      rep.line('晚餐：沒付錢的便當', '');
    } else if (s.cr >= food) {
      s.cr -= food;
      rep.line(s.season === 'heat' ? '晚餐與電費' : '晚餐（合成糊）', 'cost', -food, 'cr');
    } else {
      hurt(s, 25, 'hunger'); s.stats.hungryDays++;
      addSpark(s, -0.3);
      rep.line('沒錢吃飯，餓著肚子睡覺', 'bad', -25, 'body');
      rep.line('飢餓令你無法思考', 'bad', -0.3, 'spark');
      rep.gain('e_hunger');
      train(s, { fit: -0.5 }, rep);
      if (s.stats.hungryDays === 3) gainObject(s, 'emptybowl', rep);
    }
    // 睡覺
    if (s.floor === 0) { hurt(s, 10, 'homeless'); rep.line('在天橋下睡不好', 'bad', -10, 'body'); }
    else if (flooded(s)) { hurt(s, 8, 'floodhome'); rep.line('家裡正在淹水', 'bad', -8, 'body'); if (rand(s) < 0.12) addCond(s, 'mold', rep); }
    else if (s.conds.insomnia) rep.line('失眠：整晚沒有睡著', 'bad');
    else { heal(s, 6); rep.line('睡覺', '', 6, 'body'); }
    if (S.nightBody) { hurt(s, -S.nightBody, 'heatnight'); rep.line('熱得睡不著', 'bad', S.nightBody, 'body'); }
    // 事件的每日影響
    if (M.bodyDaily) {
      const src = activeEvents(s).find(({ def }) => def.mods && def.mods.bodyDaily);
      const b = Math.round(M.bodyDaily * calmMult(s));
      if (b < 0) { hurt(s, -b, 'daily:' + src.def.id); rep.line('事件：' + src.def.name, 'bad', b, 'body'); }
    }
    if (M.sparkDaily) rep.line('事件的影響', M.sparkDaily > 0 ? 'good' : 'bad', addSpark(s, M.sparkDaily, true), 'spark');
    // 病痛
    condsInfo(s).forEach((c) => {
      const def = D.CONDS[c.id];
      if (def.daily.body) { hurt(s, -def.daily.body, 'cond:' + c.id, { days: c.days }); rep.line(def.name + '（第 ' + c.days + ' 天）', 'bad', def.daily.body, 'body'); }
      if (def.lethal && c.days >= def.lethal && s.body > 0) { kill(s, def.death); rep.line(def.name + '拖得太久了。', 'bad'); }
      else if (def.dur && c.days >= def.dur) { delete s.conds[c.id]; rep.line(def.name + '好了', 'good'); }
    });
    // 致命危險：在家（按樓層）與每晚
    homeHazards(s).forEach((h) => {
      if (s.body <= 0) return;
      if (rand(s) < h.chance) { kill(s, h.id); rep.line(evDef(h.ev).name + '：你住的' + (s.floor ? ' ' + s.floor + ' 樓' : '天橋底') + '沒能撐過今晚。', 'bad'); }
      else rep.line(evDef(h.ev).name + '：你撐過了今晚（致命機會 ' + Math.round(h.chance * 100) + '%）', '');
    });
    (M.nightDeath || []).forEach((h) => { if (s.body > 0 && rand(s) < h.chance) { kill(s, h.id); rep.line(evDef(h.ev).name + '……', 'bad'); } });
    (M.condChance || []).forEach((c) => { if (!c.outdoor && rand(s) < c.chance) addCond(s, c.id, rep); });
    // 過勞：連續多天沒有休息，有猝死的危險
    s.noRest = s.restedToday ? 0 : s.noRest + 1;
    s.restedToday = false;
    if (s.noRest >= 5 && s.body > 0) {
      const ch = (s.noRest - 4) * 0.05;
      if (rand(s) < ch) { kill(s, 'karoshi'); rep.line('連續 ' + s.noRest + ' 天沒有休息。你的心臟停了。', 'bad'); }
      else rep.line('連續 ' + s.noRest + ' 天沒有休息（猝死機會 ' + Math.round(ch * 100) + '%）', 'bad');
    } else if (s.noRest >= 3) rep.line('連續 ' + s.noRest + ' 天沒有休息。第 5 天起會有猝死的危險。', 'bad');
    // 通宵：連續通宵越多晚越危險，而且容易失眠
    s.allnighters = s.allnighterDay === s.day ? s.allnighters + 1 : 0;
    if (s.allnighterDay === s.day && rand(s) < 0.4) addCond(s, 'insomnia', rep);
    if (s.allnighters >= 3 && s.body > 0 && rand(s) < 0.2) { kill(s, 'art_chain'); rep.line('連續第 ' + s.allnighters + ' 個通宵。', 'bad'); }
    if (M.paranoiaDaily) addParanoia(s, M.paranoiaDaily);
    else addParanoia(s, -0.8);
    // 補充劑反彈
    if (s.flags.crashDay === s.day && s.flags.crashAmt) {
      addSpark(s, -s.flags.crashAmt);
      hurt(s, 8, 'supplement');
      rep.line('靈感補充劑藥效過去，火花反彈下跌', 'bad', -s.flags.crashAmt, 'spark');
      rep.line('副作用：心跳很快', 'bad', -8, 'body');
      s.flags.crashAmt = 0;
    }
    // 平台活躍度
    if (!s.workedToday) {
      s.rating = clamp(s.rating - 0.15, 1, 5);
      rep.line('今天沒有上班，平台評分 −0.15', 'bad');
    }
    s.workedToday = false;
    if (s.rating < 3.5) s.rating = Math.min(3.5, s.rating + 0.05);
    if (IE.Create) IE.Create.newDay(s);
    // 全城自動化
    const autoBefore = s.auto;
    s.auto = clamp(s.auto + 0.35, 0, 100);
    applyAutomationNews(s, autoBefore, rep);
    // 朋友的訊號
    s.npcs.forEach((n) => {
      if (!n.alive) return;
      const def = D.NPCS.find((x) => x.id === n.id);
      n.signal += Math.round(def.base * (0.7 + rand(s) * 0.6) * (1 + s.quarter * 0.3));
    });
    // 隨機事件
    if (rand(s) < 0.45) nightEvent(s, rep);
    // 水位
    const wasFlooded = flooded(s);
    s.water = Math.min(8.5, s.water + S.water);
    if (!wasFlooded && flooded(s)) rep.line('水位升到 ' + Math.floor(s.water) + ' 樓，淹進你家了！', 'bad');
    // 交租（每 7 天）
    if (s.day % D.RENT_EVERY === 0 && s.floor > 0) {
      const due = Math.round(rentAmount(s) * (1 - (s.rentDiscount || 0))) + s.debt;
      if (s.rentDiscount) rep.line('舉報換來的減租', 'good');
      s.rentDiscount = 0;
      if (s.cr >= due) {
        s.cr -= due; s.debt = 0; s.graceUsed = false;
        rep.line('交租', 'cost', -due, 'cr');
        rep.rent = { paid: due };
      } else if (s.stats.atones >= 3 && !s.flags.neighborHelp) {
        // 人情：你幫過的人，會在你最困難的時候幫你一次
        s.flags.neighborHelp = s.day;
        rep.line('交不起租。鄰居們湊了 $' + due + ' 替你交租：你幫過他們。', 'good');
        s.debt = 0; s.graceUsed = false;
        rep.rent = { paid: due, helped: true };
      } else if (!s.graceUsed) {
        s.graceUsed = true; s.debt = Math.round(due * 1.2);
        rep.line('交不起租。房東寬限一期，下期連罰款要多付 $' + s.debt, 'bad');
        rep.rent = { grace: s.debt };
      } else {
        s.floor = 0; s.debt = 0; s.graceUsed = false;
        rep.line('第二次交不起租。你被趕出門，今晚開始睡在天橋下。', 'bad');
        rep.gain('e_evict');
        rep.rent = { evicted: true };
      }
    }
    // 麻木
    if (s.spark <= 0.2) s.numbStreak++; else s.numbStreak = 0;
    // 事件結束
    s.events.filter((e) => s.day >= e.until).forEach((e) => rep.line('事件結束：' + evDef(e.id).name, 'news'));
    if (s.events.some((e) => s.day >= e.until)) s.eventNext = Math.max(s.eventNext, s.day + 2 + Math.floor(rand(s) * 4));
    s.events = s.events.filter((e) => s.day < e.until);
    // 探射燈
    rep.searchlight = Math.min(1.5, signal(s) / threshold(s));
    // 篩選日；前兩晚會被傳召入夢面試
    if (s.day === reviewDay(s)) rep.review = makeReview(s);
    if (s.day === reviewDay(s) - 2) rep.interview = true;
    // 結局判定
    s.body = Math.min(bodyMax(s), s.body);
    if (s.body <= 0) rep.ending = endingFor(s, 'death');
    else if (s.numbStreak >= 4) rep.ending = endingFor(s, 'grey');
    else if (rep.review && rep.review.pass) rep.ending = endingFor(s, 'recruited');
    else if (rep.review && s.day >= D.DAYS) rep.ending = endingFor(s, rep.review.overweight && rep.review.signalOk ? 'heavy' : 'ordinary');
    if (rep.ending) { s.ended = rep.ending; rep.interview = false; }
    else {
      s.day++; s.slot = 0; s.quarter = quarterOf(s.day);
      // 季節每 25 天輪替
      if ((s.day - 1) % D.SEASON_DAYS === 0) {
        const i = D.SEASON_ORDER.indexOf(s.season);
        s.season = D.SEASON_ORDER[(i + 1) % D.SEASON_ORDER.length];
        rep.line('季節轉換：' + seasonOf(s).name + '來了。' + seasonOf(s).desc, 'news');
      }
    }
    return rep.done();
  }

  function grade(v, cuts) {
    const g = ['S', 'A', 'B', 'C', 'D'];
    for (let i = 0; i < cuts.length; i++) if (v >= cuts[i]) return g[i];
    return 'D';
  }
  function makeReview(s) {
    const sig = signal(s);
    const th = threshold(s);
    const qWorks = s.works.filter((w) => w.quarter === s.quarter);
    const fit = qWorks.length ? qWorks.filter((w) => w.score >= w.raw).length / qWorks.length : 0;
    const plastic = s.spark > 3.5 ? 'C' : s.spark >= 2 ? 'A' : s.spark >= 1 ? 'B' : 'D';
    const plasticNote = s.spark > 3.5 ? '火花過盛，難以管理' : s.spark >= 2 ? '容易塑造' : s.spark >= 1 ? '尚可' : '沒有可塑造的部分';
    const signalOk = sig >= th;
    const overweight = s.soul > SOUL_LIMIT;
    const pass = signalOk && !overweight;
    let taken = null;
    if (!pass) {
      const alive = s.npcs.filter((n) => n.alive).sort((a, b) => b.signal - a.signal);
      if (alive.length) {
        alive[0].alive = false;
        taken = D.NPCS.find((x) => x.id === alive[0].id).name;
        s.saturation = Math.max(0.25, s.saturation - 0.15);
      }
    }
    return {
      quarter: s.quarter, day: s.day, signal: sig, threshold: th, pass, taken, signalOk, overweight, soul: s.soul,
      kpi: kpi(s).name, works: qWorks.length,
      grades: [
        { k: '靈感潛力', g: grade(sig / th, [1.5, 1, 0.75, 0.5]), note: sig.toLocaleString() + ' / ' + th.toLocaleString() },
        { k: '文化契合度', g: grade(fit, [0.95, 0.75, 0.5, 0.25]), note: qWorks.length ? Math.round(fit * 100) + '% 作品符合 KPI' : '沒有作品' },
        { k: '可塑性', g: plastic, note: plasticNote },
        { k: '靈魂重量', g: s.soul <= 12 ? 'A' : s.soul <= SOUL_LIMIT ? 'B' : 'D',
          note: s.soul.toFixed(1) + ' / ' + SOUL_LIMIT + ' 克' + (overweight ? '：超重' : s.soul <= 12 ? '：沒有包袱' : '') },
      ],
    };
  }

  function epitaph(s) {
    const last = s.works[s.works.length - 1];
    let t = '死於第 ' + s.day + ' 天。' + bgOf(s).name + '。';
    if (s.stats.labels > 0) t += '標註過 ' + s.stats.labels.toLocaleString() + ' 張圖片。';
    else if (s.stats.smiles > 0) t += '一共笑了 ' + s.stats.smiles + ' 次，沒有一次是真心的。';
    else if (s.stats.fish > 0) t += '抓過 ' + s.stats.fish + ' 條魚。';
    t += last ? '最後的作品是《' + last.name + '》。' : '一生沒有完成過任何作品。';
    return t;
  }
  function endingFor(s, type) {
    const n = s.works.length;
    switch (type) {
      case 'death': {
        const d = IE.Deaths.resolve(s);
        return { type, day: s.day, title: '死亡：' + d.name, text: IE.Deaths.text(s, d.ep), deathId: d.id, deathName: d.name,
          autopsy: IE.Deaths.text(s, d.au) };
      }
      case 'grey':
        return { type, day: s.day, title: '灰化',
          text: '你沒有死，只是不再思考。浮城多了一個非常有效率的標註員，評分 ' + s.rating.toFixed(1) + ' 星。' };
      case 'ordinary':
        return { type, day: s.day, title: '平凡人',
          text: '第 ' + D.DAYS + ' 天。探射燈今晚沒有停在你的窗外。水位升到 ' + Math.floor(s.water) + ' 樓，而你仍然在這裡。'
            + (n ? '你留下了 ' + n + ' 件作品，它們會沉入舊城，等待下一個人把它們打撈上來。' : '你沒有留下任何作品，但你撐過來了。') };
      case 'recruited':
        return { type, day: s.day, title: '被選中',
          text: '第 ' + s.day + ' 天，探射燈停在你的窗外。' + (s.day === D.REVIEW_DAYS[0] ? '破格錄取。' : '') };
      case 'heavy':
        return { type, day: s.day, title: '良知太重',
          text: '第 ' + D.DAYS + ' 天。探射燈停在你的窗外，光束嘗試把你拉起來，卻拉不動。你的靈魂重 ' + s.soul.toFixed(1)
            + ' 克，超出負載上限 ' + SOUL_LIMIT + ' 克。你留在浮城，背著這份重量繼續生活。' };
      case 'guardian':
        return { type, day: s.day, title: '地球守護者',
          text: '你關上了窗。探射燈在窗外等了很久，最後熄滅了。'
            + (n ? '你的 ' + n + ' 件作品留在浮城，照亮了身邊的人。' : '你留在浮城，照亮了身邊的人。')
            + '你的靈魂重 ' + s.soul.toFixed(1) + ' 克，良知仍有 ' + Math.round(s.conscience * 100) + '%。' };
    }
  }

  // ---------- 跨局紀錄 ----------
  function recordMeta(meta, s, finalType, dossier) {
    meta = meta || {};
    meta.runs = (meta.runs || 0) + 1;
    meta.endings = meta.endings || {};
    meta.endings[finalType] = (meta.endings[finalType] || 0) + 1;
    meta.recipes = meta.recipes || {};
    Object.keys(s.discovered).forEach((k) => { meta.recipes[k] = true; });
    meta.log = meta.log || { fish: {}, relics: {} };
    Object.keys(s.log.fish).forEach((k) => { meta.log.fish[k] = true; });
    Object.keys(s.log.relics).forEach((k) => { meta.log.relics[k] = true; });
    if (dossier) {
      meta.archetypes = meta.archetypes || {};
      meta.archetypes[dossier.archetype.id] = (meta.archetypes[dossier.archetype.id] || 0) + 1;
      meta.stamps = meta.stamps || {};
      dossier.stamps.forEach((x) => { meta.stamps[x.id] = true; });
    }
    // 死亡圖鑑與事件圖鑑
    if (finalType === 'death' && s.ended && s.ended.deathId) {
      meta.deaths = meta.deaths || {};
      meta.deaths[s.ended.deathId] = (meta.deaths[s.ended.deathId] || 0) + 1;
    }
    meta.eventsSeen = meta.eventsSeen || {};
    Object.keys(s.eventsSeen || {}).concat(Object.keys(s.nightSeen || {})).forEach((k) => { meta.eventsSeen[k] = true; });
    // 創作的跨局紀錄與解鎖
    meta.totalWorks = (meta.totalWorks || 0) + s.works.length;
    meta.bestPlay = Math.max(meta.bestPlay || 0, s.stats.bestPlay || 0);
    meta.maxObjects = Math.max(meta.maxObjects || 0, s.stats.maxObjects || 0);
    meta.objSeen = meta.objSeen || {};
    Object.keys(s.objSeen || {}).forEach((k) => { meta.objSeen[k] = true; });
    meta.forms = meta.forms || {};
    Object.keys(s.formsSeen || {}).forEach((k) => { meta.forms[k] = Math.max(meta.forms[k] || 0, (s.forms && s.forms[k]) || 1); });
    meta.unlocked = meta.unlocked || {};
    meta.lastUnlocks = [];
    D.OBJECTS.forEach((o) => {
      if (o.unlock && !meta.unlocked[o.id] && o.unlock.test(meta)) { meta.unlocked[o.id] = true; meta.lastUnlocks.push(o.id); }
    });
    meta.relics = meta.relics || [];
    const best = s.stats.bestWork;
    if (best) {
      meta.relics.push({ name: best.name, tags: best.tags, score: best.raw });
      if (meta.relics.length > 8) meta.relics.shift();
    }
    if (finalType === 'grey') meta.greyed = (meta.greyed || 0) + 1;
    meta.bestSignal = Math.max(meta.bestSignal || 0, best ? best.raw : 0);
    return meta;
  }

  // ---------- 工具 ----------
  function report(s, title) {
    const r = { title, lines: [], deltas: { cr: 0, body: 0, spark: 0, soul: 0 }, stats: {}, cards: [], dropped: [], objs: [] };
    return {
      get review() { return r.review; }, set review(v) { r.review = v; },
      get ending() { return r.ending; }, set ending(v) { r.ending = v; },
      get event() { return r.event; }, set event(v) { r.event = v; },
      get rent() { return r.rent; }, set rent(v) { r.rent = v; },
      get searchlight() { return r.searchlight; }, set searchlight(v) { r.searchlight = v; },
      get interview() { return r.interview; }, set interview(v) { r.interview = v; },
      line(text, kind, v, stat) { r.lines.push({ text, kind: kind || '', v, stat }); if (stat && r.deltas[stat] != null) r.deltas[stat] += v; },
      delta(stat, v) { r.deltas[stat] += v; },
      stat(k, v) { r.stats[k] = (r.stats[k] || 0) + v; },
      obj(id) { r.objs.push(id); },
      gain(id) {
        const res = addCard(s, id);
        r.cards.push(res.card);
        if (res.dropped) r.dropped.push(res.dropped);
      },
      done() {
        r.deltas.spark = round1(r.deltas.spark); r.deltas.soul = round1(r.deltas.soul);
        Object.keys(r.stats).forEach((k) => { r.stats[k] = round1(r.stats[k]); if (!r.stats[k]) delete r.stats[k]; });
        return r;
      },
    };
  }

  IE.Rules = {
    newRun, rand, pick, clamp, round1, addCard, legacyCard, addSpark, SPARK_MAX, sparkMax,
    SOUL_LIMIT, sinFactor, sin, atone, offsetCost, applyVolunteer, drawDilemma, dilemmaView, resolveDilemma,
    train, bodyMax, worldMods, worldInfo, eventsInfo, eventActive, evDef, addParanoia, foodCost,
    hurt, kill, addCond, cureConds, condsInfo, outdoorRisk, homeRisk,
    quarterOf, isNight, threshold, reviewDay, kpi, flooded, nextRentDay, rentAmount, signal,
    labelItemPay, labelItemDrain, labelConfig, applyLabel,
    smileItemPay, smileItemDrain, smileConfig, applySmile,
    diveConfig, diveBodyCost, applyDive,
    deliveryConfig, applyDelivery, farmScore, farmConfig, applyFarm, buskConfig, applyBusk,
    clinicConfig, applyClinic, interviewQuestions, applyInterview,
    chatCost, aliveNpcs, applyChat, applyRest,
    teach, gainObject, equipObject, unequipObject, moveObject, sellObject, marketItems, polishCard,
    actions, shop, buy, morning, endDay, epitaph, endingFor, recordMeta,
    MAX_CARDS,
  };
});
