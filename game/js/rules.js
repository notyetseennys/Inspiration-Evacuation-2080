// 《靈感撤離 2080》規則核心：純邏輯，不涉及 DOM，瀏覽器與 Node（tools/sim.js）共用。
// 核心公式：作品分 = 素材籌碼 × 組合倍率 × 火花倍率 × KPI
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA;
  const MAX_CARDS = 12;

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

  // 火花上限為 4；超過 3 之後越升越慢（回傳實際變化）
  const SPARK_MAX = 4;
  function addSpark(s, v) {
    if (v > 0 && s.spark >= 3) v *= 0.5;
    const before = s.spark;
    s.spark = clamp(s.spark + v, 0, SPARK_MAX);
    return round1(s.spark - before);
  }
  function bgOf(s) { return D.BACKGROUNDS[s.bg]; }
  function seasonOf(s) { return D.SEASONS[s.season]; }
  function perk(s) { return bgOf(s).perk; }

  // ---------- 開局 ----------
  function newRun(opts) {
    const bg = D.BACKGROUNDS[opts.bg];
    const seed = (opts.seed == null ? Math.floor(Math.random() * 1e9) : opts.seed) | 0;
    const s = {
      v: 2, seed, rngState: seed, bg: opts.bg, season: opts.season,
      day: 1, slot: 0, quarter: 0,
      cr: bg.cr, body: bg.body, spark: bg.spark, rating: 4.0,
      floor: bg.floor, water: 0.8,
      rentHike: 0, graceUsed: false, debt: 0,
      premiumUntil: 0, craftSlots: 4, realFoodDay: 0,
      gear: { tank: false, harpoon: false, bag: false, monitor: false },
      auto: 0, removed: { smile: false, label: false },
      mastery: { label: 0, smile: 0, dive: 0 },
      cards: [], uid: 1,
      works: [], usedRecipes: {}, discovered: {},
      kpis: [],
      npcs: D.NPCS.map((n) => ({ id: n.id, alive: true, signal: 0, friend: 0 })),
      saturation: 1, numbStreak: 0, workedToday: false,
      flags: { crashDay: 0, crashAmt: 0, bigOrder: 0, richDive: 0, fishDinner: 0, divedDay: 0 },
      stats: { labels: 0, wrong: 0, smiles: 0, perfects: 0, dives: 0, relics: 0, fish: 0, flows: 0, works: 0,
        crEarned: 0, hungryDays: 0, chats: 0, rests: 0, ot: 0, bestWork: null },
      log: { fish: {}, relics: {} },
      newsSeen: {}, morning: null, ended: null,
      legacy: (opts.meta && opts.meta.relics) ? opts.meta.relics.slice(-5) : [],
      greyed: (opts.meta && opts.meta.greyed) || 0,
    };
    const keys = Object.keys(D.KPIS);
    while (s.kpis.length < 3) {
      const k = pick(s, keys);
      if (!s.kpis.includes(k)) s.kpis.push(k);
    }
    bg.cards.forEach((id) => addCard(s, id));
    return s;
  }

  // ---------- 素材卡 ----------
  function makeCard(s, id) {
    const c = D.CARDS[id];
    return { uid: s.uid++, id, name: c.name, tags: c.tags.slice(), value: c.value };
  }
  function addCard(s, idOrCard) {
    const card = typeof idOrCard === 'string' ? makeCard(s, idOrCard) : Object.assign({ uid: s.uid++ }, idOrCard);
    s.cards.push(card);
    let dropped = null;
    if (s.cards.length > MAX_CARDS) dropped = s.cards.shift();
    return { card, dropped };
  }
  function legacyCard(relic) {
    return { id: 'legacy', name: '前世作品《' + relic.name + '》', tags: relic.tags.slice(0, 2),
      value: 60 + Math.min(60, Math.round(relic.score / 100)), legacy: true };
  }

  // ---------- 時間 ----------
  const quarterOf = (day) => (day <= 10 ? 0 : day <= 20 ? 1 : 2);
  const isNight = (s) => s.slot === 2;
  const threshold = (s) => D.THRESHOLDS[s.quarter];
  const reviewDay = (s) => D.REVIEW_DAYS[s.quarter];
  const kpi = (s) => D.KPIS[s.kpis[s.quarter]];
  const flooded = (s) => s.floor > 0 && s.water >= s.floor;
  const nextRentDay = (s) => Math.ceil(s.day / 5) * 5;

  function rentAmount(s, floor) {
    const f = floor == null ? s.floor : floor;
    if (f <= 0) return 0;
    const period = Math.floor((s.day - 1) / 5);
    return Math.round(D.BASE_RENT * D.FLOOR_RENT[f] * (1 + 0.08 * period + s.rentHike));
  }

  // 累積訊號（篩選日用來與門檻比較）
  function signal(s) {
    return s.works.reduce((a, w) => a + w.score, 0);
  }

  // ---------- 工作：AI 數據標註 ----------
  // o.flow：心流狀態（收入與消耗加倍）；o.gold：金色圖片（客戶付費較高）
  function labelItemPay(s, combo, o) {
    o = o || {};
    const tier = 1 + Math.min(6, Math.floor(combo / 8)) * 0.25;
    let pay = 2 * tier * (0.6 + 0.1 * s.rating) * (1 - (s.auto / 100) * 0.5)
      * (perk(s).labelPay || 1) * seasonOf(s).labelPay;
    if (s.spark < 1) pay *= 1.3; // 麻木反而令你更有效率
    if (o.ot) pay *= 1.5;
    if (o.flow) pay *= 2;
    if (o.gold) pay *= 1.5;
    if (s.flags.bigOrder === s.day) pay *= 2;
    return pay;
  }
  function labelItemDrain(s, o) {
    o = o || {};
    return 0.012 * (1 + 0.08 * s.mastery.label) * (o.ot ? 1.5 : 1) * (o.flow ? 2 : 1);
  }
  function labelConfig(s, o) {
    const m = s.mastery.label;
    return {
      duration: 45,
      phases: [0, 15, 30],          // 指引在第 15、30 秒更新
      startLimit: Math.max(1.5, 2.7 - 0.05 * m) + (s.gear.monitor ? 0.2 : 0),
      minLimit: 0.85 + (s.gear.monitor ? 0.2 : 0),
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
    s.body -= bodyCost;
    const caught = res.caught || 0;
    s.rating = clamp(s.rating + 0.01 * res.correct - 0.03 * res.wrong - 0.1 * caught, 1, 5);
    const autoBefore = s.auto;
    s.auto = clamp(s.auto + 0.06 * res.correct - 0.15 * res.wrong, 0, 100);
    s.mastery.label++;
    s.stats.labels += res.correct + res.wrong;
    s.stats.wrong += res.wrong;
    s.stats.flows += res.flows || 0;
    if (ot) s.stats.ot++;
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
    return rep.done();
  }

  // ---------- 工作：企業情緒陪伴員 ----------
  // lane：laugh（笑）、nod（點頭）、hold（長笑）、pour（倒酒）
  const SMILE_PAY = { laugh: [5, 2.5], nod: [3, 1.5], hold: [8, 4], pour: [6, 3] };
  const SMILE_DRAIN = { laugh: [0.018, 0.008], nod: [0.006, 0.003], hold: [0.03, 0.015], pour: [0, 0] };
  function smileItemPay(s, kind, lane) {
    const t = SMILE_PAY[lane || 'laugh'];
    const base = kind === 'perfect' ? t[0] : kind === 'good' ? t[1] : 0;
    return base * (s.spark < 1 ? 1.3 : 1);
  }
  function smileItemDrain(s, kind, lane) {
    const t = SMILE_DRAIN[lane || 'laugh'];
    const base = kind === 'perfect' ? t[0] : kind === 'good' ? t[1] : 0;
    return base * (1 + 0.08 * s.mastery.smile);
  }
  function smileConfig(s) {
    return {
      duration: 36, bpm: 92 + Math.min(24, s.mastery.smile * 3),
      trapRate: 0.14, nodRate: 0.28, holdRate: 0.14, pourEvery: 9,
      ads: s.premiumUntil < s.day,
    };
  }
  function applySmile(s, res) {
    const rep = report(s, '企業情緒陪伴');
    const tip = res.satisfaction >= 0.8 ? 30 : res.satisfaction >= 0.6 ? 12 : 0;
    const fine = res.trapHits * 5;
    const cr = Math.round(res.cr) + tip - fine;
    s.cr += cr; s.stats.crEarned += Math.max(0, cr);
    addSpark(s, -res.drain);
    s.body -= 6;
    s.mastery.smile++;
    s.stats.smiles += res.perfect + res.good;
    s.stats.perfects += res.perfect;
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
    const zones = D.DIVE_ZONES.map((z, i) => {
      const L = DIVE_LAYOUT[i];
      let n = L.relics + (i === 0 ? seasonOf(s).diveRelics : 0) + (rich && i > 0 ? 1 : 0);
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
      oxygen: 45 * (p.oxygen || 1) * (s.gear.tank ? 1.3 : 1) * (1 + 0.02 * Math.min(10, s.mastery.dive)),
      harpoon: { cd: s.gear.harpoon ? 0.4 : 0.7, dmg: s.gear.harpoon ? 2 : 1 },
      capacity: 8 + (s.gear.bag ? 4 : 0),
      zones, legacy, scrap, picked,
      fish: { sardine: 2, eel: 2 + Math.floor(s.day / 12), grouper: 1 + Math.floor(s.day / 15), jelly: 3 + Math.floor(s.day / 8) },
    };
  }
  function diveBodyCost(s) {
    return Math.round((14 - seasonOf(s).outdoorBody) * (perk(s).diveBody || 1));
  }
  // res：{ relics: [卡 id 或前世作品], money, fish: { sardine, eel, grouper }, hits, drowned }
  function applyDive(s, res) {
    const rep = report(s, '舊城潛水');
    const fish = res.fish || {};
    const cost = diveBodyCost(s) + 5 * res.hits + (res.drowned ? 15 : 0);
    s.body -= cost;
    s.cr += res.money; s.stats.crEarned += res.money;
    const n = res.relics.length;
    const sp = addSpark(s, 0.05 * n);
    const caught = (fish.sardine || 0) + (fish.eel || 0) + (fish.grouper || 0);
    s.mastery.dive++;
    s.flags.divedDay = s.day;
    s.stats.dives++; s.stats.relics += n; s.stats.fish += caught;
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
    return rep.done();
  }

  // ---------- 聊天、休息 ----------
  function chatCost(s) { return perk(s).freeChat ? 0 : 15; }
  function aliveNpcs(s) { return s.npcs.filter((n) => n.alive); }
  function applyChat(s, npcId) {
    const n = s.npcs.find((x) => x.id === npcId);
    const def = D.NPCS.find((x) => x.id === npcId);
    const rep = report(s, '與' + def.name + '聊天');
    const cost = chatCost(s);
    const outdoor = seasonOf(s).outdoorBody;
    s.cr -= cost;
    const sp = addSpark(s, 0.4 + 0.1 * Math.min(3, n.friend));
    s.body = Math.min(100, s.body + 5 + outdoor);
    n.friend++;
    s.stats.chats++;
    if (cost) rep.delta('cr', -cost);
    rep.delta('spark', sp); rep.delta('body', 5 + outdoor);
    rep.gain(def.cards[(n.friend - 1) % def.cards.length]);
    if (perk(s).chatExtra) rep.gain(def.cards[n.friend % def.cards.length]);
    return rep.done();
  }
  function applyRest(s) {
    const rep = report(s, '休息');
    const b = s.floor === 0 ? 12 : 22;
    s.body = Math.min(100, s.body + b);
    const sp = addSpark(s, 0.3);
    s.stats.rests++;
    rep.delta('body', b); rep.delta('spark', sp);
    if (s.spark >= 3.5) { rep.line('你做了一個很奇怪的夢', 'good'); rep.gain(pick(s, D.CARD_POOLS.dream)); }
    return rep.done();
  }

  // ---------- 創作 ----------
  function evalCraft(s, uids) {
    const cards = uids.map((u) => s.cards.find((c) => c.uid === u)).filter(Boolean);
    const counts = {};
    cards.forEach((c) => c.tags.forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
    const cardChips = cards.reduce((a, c) => a + c.value, 0) * (perk(s).craftChips || 1);
    const combos = [];
    let maxTag = null, maxCount = 0;
    Object.keys(counts).forEach((t) => { if (counts[t] > maxCount) { maxCount = counts[t]; maxTag = t; } });
    for (const r of D.RESONANCE) {
      if (maxCount >= r.count) {
        combos.push({ id: r.id, name: r.name + '・' + D.TAGS[maxTag].name, chips: r.chips, mult: r.mult, kind: 'res' });
        break;
      }
    }
    // 主組合計足倍率，其餘組合只加 0.5（避免倍率無限疊加）
    const recipes = D.RECIPES
      .filter((rec) => Object.keys(rec.need).every((t) => (counts[t] || 0) >= rec.need[t]))
      .sort((a, b) => b.mult - a.mult);
    recipes.forEach((rec, i) => {
      combos.push({ id: rec.id, name: rec.name, chips: rec.chips, mult: i === 0 ? rec.mult : 0.5, kind: 'recipe',
        secondary: i > 0, isNew: !s.discovered[rec.id], used: !!s.usedRecipes[rec.id] });
    });
    if (Object.keys(counts).length >= D.MEDLEY.minTags) {
      combos.push({ id: D.MEDLEY.id, name: D.MEDLEY.name, chips: D.MEDLEY.chips, mult: D.MEDLEY.mult, kind: 'medley' });
    }
    const chips = Math.round(cardChips + combos.reduce((a, c) => a + c.chips, 0));
    const mult = round1(1 + combos.reduce((a, c) => a + c.mult, 0));
    const base = chips * mult * s.spark;
    const k = kpi(s);
    let kpiMod = 1;
    if (k.tag && counts[k.tag]) kpiMod = k.mod;
    if (k.special === 'lean' && cards.length >= 4) kpiMod = 0.5;
    if (k.special === 'pliable' && s.spark < 2) kpiMod = 1.5;
    if (k.special === 'novelty') {
      const named = combos.filter((c) => c.kind === 'recipe');
      if (named.length && named.every((c) => c.used)) kpiMod = 0.2;
    }
    return { cards, counts, cardChips: Math.round(cardChips), chips, mult, spark: s.spark,
      combos, kpi: k, kpiMod, raw: Math.round(base), total: Math.round(base * kpiMod) };
  }
  function workName(s, ev) {
    const named = ev.combos.filter((c) => c.kind === 'recipe').sort((a, b) => b.mult - a.mult);
    if (named.length) return named[0].name;
    const tags = Object.keys(ev.counts).sort((a, b) => ev.counts[b] - ev.counts[a]);
    if (tags.length >= 2) return D.TAGS[tags[0]].name + '與' + D.TAGS[tags[1]].name;
    return '無題 #' + (s.stats.works + 1);
  }
  // 創作需要材料費：藝術不是免費的
  const craftCost = (n) => 10 + 5 * n;
  function canCreate(s) {
    if (s.spark < 1) return { ok: false, reason: '火花不足 ×1.0，你什麼都想不出來' };
    if (s.cards.length < 2) return { ok: false, reason: '最少需要 2 張素材' };
    if (s.cr < craftCost(2)) return { ok: false, reason: '連 $' + craftCost(2) + ' 材料費都付不起' };
    return { ok: true };
  }
  function commitCraft(s, uids) {
    const ev = evalCraft(s, uids);
    const used = new Set(uids);
    s.cards = s.cards.filter((c) => !used.has(c.uid));
    s.cr -= craftCost(ev.cards.length);
    const fresh = ev.combos.filter((c) => c.kind === 'recipe' && !s.discovered[c.id]);
    fresh.forEach((c) => { s.discovered[c.id] = true; });
    ev.combos.filter((c) => c.kind === 'recipe').forEach((c) => { s.usedRecipes[c.id] = true; });
    const tags = Object.keys(ev.counts).sort((a, b) => ev.counts[b] - ev.counts[a]);
    const work = { day: s.day, quarter: s.quarter, name: workName(s, ev), tags,
      score: ev.total, raw: ev.raw, medium: bgOf(s).medium, n: ev.cards.length };
    s.works.push(work);
    s.stats.works++;
    if (!s.stats.bestWork || work.raw > s.stats.bestWork.raw) s.stats.bestWork = work;
    s.body -= 4;
    s.saturation = Math.min(1.15, s.saturation + 0.02);
    let sparkUp = 0;
    if (fresh.length) sparkUp = addSpark(s, 0.15);
    return { ev, work, fresh, sparkUp };
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
    if (!isNight(s)) {
      list.push({ id: 'label', name: 'AI 數據標註', sub: '教 AI 認貓，好讓它以後不再需要你',
        fx: [['cr', '約 +$' + labelCr], ['body', '−8'], ['spark', '約 −' + labelSpark], ['card', '機械']],
        enabled: !s.removed.label && !labelLocked,
        reason: s.removed.label ? '職位已被 AI 取代' : labelLocked });
      list.push({ id: 'smile', name: '企業情緒陪伴', sub: '陪有錢人說笑、點頭、倒酒，笑得越準越值錢',
        fx: [['cr', '約 +$150'], ['body', '−6'], ['spark', '約 −' + round1(24 * smileItemDrain(s, 'perfect'))], ['card', '霓虹']],
        enabled: !s.removed.smile, reason: s.removed.smile ? '已被 AI 情緒伴侶 2.0 取代' : null });
      list.push({ id: 'dive', name: '舊城潛水', sub: s.flags.divedDay === s.day ? '舊城今天已被搜刮過，收穫會很少' : '用魚叉捕魚，打撈水淹舊城的遺物',
        fx: [['cr', '漁獲 約 +$20'], ['body', '−' + diveBodyCost(s) + ' 起'], ['spark', '+少許'], ['card', '水・記憶']],
        enabled: s.body > 10, reason: s.body > 10 ? null : '身體太差，下水會有生命危險' });
      const cost = chatCost(s);
      list.push({ id: 'chat', name: '找朋友聊天', sub: '還有 ' + aliveNpcs(s).length + ' 個朋友留在浮城',
        fx: [['cr', cost ? '−$' + cost : '免費'], ['body', '+' + (5 + outdoor)], ['spark', '+0.4 起'], ['card', '人情']],
        enabled: aliveNpcs(s).length > 0 && s.cr >= cost,
        reason: aliveNpcs(s).length === 0 ? '他們全都被帶走了' : s.cr < cost ? '沒錢請人喝東西' : null });
      list.push({ id: 'rest', name: '休息', sub: '什麼都不做，也是一種選擇',
        fx: [['body', '+' + (s.floor === 0 ? 12 : 22)], ['spark', '+0.3']], enabled: true });
    } else {
      const c = canCreate(s);
      list.push({ id: 'create', name: '創作', sub: '把今天的經歷變成作品，讓外星人看見',
        fx: [['card', '使用 2 至 ' + s.craftSlots + ' 張素材'], ['cr', '材料 −$' + craftCost(2) + ' 起'], ['sig', '訊號 ↑'], ['body', '−4']],
        enabled: c.ok, reason: c.reason });
      list.push({ id: 'ot', name: '深夜加班標註', sub: '收入 ×1.5，消耗 ×1.5',
        fx: [['cr', '約 +$' + Math.round(labelCr * 1.5)], ['body', '−14'], ['spark', '約 −' + round1(labelSpark * 1.5)]],
        enabled: !s.removed.label && !labelLocked && s.body > 14,
        reason: s.removed.label ? '職位已被 AI 取代' : labelLocked || (s.body <= 14 ? '身體撐不住了' : null) });
      list.push({ id: 'rest', name: '早點睡', sub: '明天又是新的一天',
        fx: [['body', '+' + (s.floor === 0 ? 12 : 22)], ['spark', '+0.3']], enabled: true });
    }
    return list;
  }

  // ---------- 商店 ----------
  function shop(s) {
    const items = [];
    const S = D.SHOP;
    items.push({ id: 'premium', ...S.premium, owned: s.premiumUntil >= s.day,
      note: s.premiumUntil >= s.day ? '有效至第 ' + s.premiumUntil + ' 天' : null });
    items.push({ id: 'supplement', ...S.supplement });
    items.push({ id: 'realfood', ...S.realfood, owned: s.realFoodDay === s.day, note: s.realFoodDay === s.day ? '今天已經吃過' : null });
    items.push({ id: 'tools', ...S.tools, owned: s.craftSlots >= 5 });
    ['tank', 'harpoon', 'bag', 'monitor'].forEach((k) => items.push({ id: k, ...S[k], owned: s.gear[k] }));
    if (s.floor === 0) {
      const f = Math.floor(s.water) + 1;
      if (f <= 8) items.push({ id: 'rehouse', name: '重新租屋（' + f + ' 樓）', desc: '按金為兩期租金', cost: 2 * rentAmount(s, f), target: f });
    } else {
      if (s.floor < 8) items.push({ id: 'moveup', name: '搬上 ' + (s.floor + 1) + ' 樓', desc: '每期租金 $' + rentAmount(s, s.floor + 1) + '，按金一期', cost: rentAmount(s, s.floor + 1) });
      if (s.floor > 1 && s.water < s.floor - 1) items.push({ id: 'movedown', name: '搬到 ' + (s.floor - 1) + ' 樓', desc: '每期租金 $' + rentAmount(s, s.floor - 1) + '，但離水更近', cost: 0 });
    }
    items.forEach((it) => { it.enabled = !it.owned && s.cr >= it.cost; });
    return items;
  }
  function buy(s, id) {
    const it = shop(s).find((x) => x.id === id);
    if (!it || !it.enabled) return { ok: false, msg: '無法購買' };
    s.cr -= it.cost;
    switch (id) {
      case 'premium': s.premiumUntil = s.day + 4; break;
      case 'supplement':
        addSpark(s, 1.2);
        s.flags.crashDay = s.day + 2; s.flags.crashAmt += 1.6; break;
      case 'realfood': s.realFoodDay = s.day; s.body = Math.min(100, s.body + 15); addSpark(s, 0.2); break;
      case 'tools': s.craftSlots = 5; break;
      case 'tank': case 'harpoon': case 'bag': case 'monitor': s.gear[id] = true; break;
      case 'moveup': s.floor += 1; break;
      case 'movedown': s.floor -= 1; break;
      case 'rehouse': s.floor = it.target; s.graceUsed = false; s.debt = 0; break;
    }
    return { ok: true, msg: '已購買：' + it.name };
  }

  // ---------- 早上 ----------
  function morning(s) {
    if (s.morning && s.morning.day === s.day) return s.morning;
    const S = seasonOf(s);
    const feed = [{ kind: 'weather', text: pick(s, D.FEED.weather[s.season]) }];
    (s.newsQueue || []).forEach((t) => feed.push({ kind: 'news', text: t }));
    s.newsQueue = [];
    feed.push(rand(s) < 0.5 ? { kind: 'ad', text: pick(s, D.FEED.ads) } : { kind: 'post', text: pick(s, D.FEED.conspiracy) });
    const k = kpi(s);
    feed.push({ kind: 'alien', text: '【星際人才發展局・招募簡報】' + k.name + '。' + k.desc + '。' });
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
    if (s.auto >= 50) s.removed.smile = true;
    if (s.auto >= 100) s.removed.label = true;
  }

  // ---------- 一天結束 ----------
  function endDay(s) {
    const S = seasonOf(s);
    const rep = report(s, '第 ' + s.day + ' 天結算');
    rep.review = null; rep.ending = null; rep.event = null;
    // 晚餐
    if (s.flags.fishDinner === s.day) {
      s.body = Math.min(100, s.body + 6);
      rep.line('晚餐：自己抓的魚', 'good', 6, 'body');
    } else if (s.cr >= S.food) {
      s.cr -= S.food;
      rep.line(s.season === 'heat' ? '晚餐與電費' : '晚餐（合成糊）', 'cost', -S.food, 'cr');
    } else {
      s.body -= 22; s.stats.hungryDays++;
      addSpark(s, -0.3);
      rep.line('沒錢吃飯，餓著肚子睡覺', 'bad', -22, 'body');
      rep.line('飢餓令你無法思考', 'bad', -0.3, 'spark');
      rep.gain('e_hunger');
    }
    // 睡覺
    if (s.floor === 0) { s.body -= 10; rep.line('在天橋下睡不好', 'bad', -10, 'body'); }
    else if (flooded(s)) { s.body -= 8; rep.line('家裡正在淹水', 'bad', -8, 'body'); }
    else { s.body = Math.min(100, s.body + 8); rep.line('睡覺', '', 8, 'body'); }
    if (S.nightBody) { s.body += S.nightBody; rep.line('熱得睡不著', 'bad', S.nightBody, 'body'); }
    // 補充劑反彈
    if (s.flags.crashDay === s.day && s.flags.crashAmt) {
      addSpark(s, -s.flags.crashAmt);
      rep.line('靈感補充劑藥效過去，火花反彈下跌', 'bad', -s.flags.crashAmt, 'spark');
      s.flags.crashAmt = 0;
    }
    // 平台活躍度
    if (!s.workedToday) {
      s.rating = clamp(s.rating - 0.15, 1, 5);
      rep.line('今天沒有上班，平台評分 −0.15', 'bad');
    }
    s.workedToday = false;
    if (s.rating < 3.5) s.rating = Math.min(3.5, s.rating + 0.05);
    // 全城自動化
    const autoBefore = s.auto;
    s.auto = clamp(s.auto + 0.8, 0, 100);
    applyAutomationNews(s, autoBefore, rep);
    // 朋友的訊號
    s.npcs.forEach((n) => {
      if (!n.alive) return;
      const def = D.NPCS.find((x) => x.id === n.id);
      n.signal += Math.round(def.base * (0.7 + rand(s) * 0.6) * (1 + s.quarter * 0.4));
    });
    // 隨機事件
    if (rand(s) < 0.45) {
      const pool = D.EVENTS.filter((e) => !e.onlySeason || e.onlySeason === s.season);
      const weights = pool.map((e) => e.w * ((e.season && e.season[s.season]) || 1));
      let r = rand(s) * weights.reduce((a, b) => a + b, 0);
      let ev = pool[0];
      for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) { ev = pool[i]; break; } }
      rep.event = ev.text;
      rep.line(ev.text, 'event');
      if (ev.body) { s.body = Math.min(100, s.body + ev.body); rep.delta('body', ev.body); }
      if (ev.spark) rep.delta('spark', addSpark(s, ev.spark));
      if (ev.crPct) { const loss = Math.min(ev.crMax, Math.round(s.cr * -ev.crPct)); s.cr -= loss; rep.delta('cr', -loss); }
      if (ev.rentHike) s.rentHike += ev.rentHike;
      if (ev.rating) s.rating = clamp(s.rating + ev.rating, 1, 5);
      if (ev.flag) s.flags[ev.flag] = s.day + 1;
      if (ev.card) rep.gain(ev.card);
    }
    // 水位
    const wasFlooded = flooded(s);
    s.water = Math.min(8.5, s.water + S.water);
    if (!wasFlooded && flooded(s)) rep.line('水位升到 ' + Math.floor(s.water) + ' 樓，淹進你家了！', 'bad');
    // 交租
    if (s.day % 5 === 0 && s.floor > 0) {
      const due = rentAmount(s) + s.debt;
      if (s.cr >= due) {
        s.cr -= due; s.debt = 0; s.graceUsed = false;
        rep.line('交租', 'cost', -due, 'cr');
        rep.rent = { paid: due };
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
    // 探射燈
    rep.searchlight = Math.min(1.5, signal(s) / threshold(s));
    // 篩選日
    if (s.day === reviewDay(s)) rep.review = makeReview(s);
    // 結局判定
    s.body = Math.min(100, s.body);
    if (s.body <= 0) rep.ending = endingFor(s, 'death');
    else if (s.numbStreak >= 4) rep.ending = endingFor(s, 'grey');
    else if (rep.review && rep.review.pass) rep.ending = endingFor(s, 'recruited');
    else if (rep.review && s.day >= D.DAYS) rep.ending = endingFor(s, 'ordinary');
    if (rep.ending) s.ended = rep.ending;
    else { s.day++; s.slot = 0; s.quarter = quarterOf(s.day); }
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
    const pass = sig >= th;
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
      quarter: s.quarter, day: s.day, signal: sig, threshold: th, pass, taken,
      kpi: kpi(s).name, works: qWorks.length,
      grades: [
        { k: '靈感潛力', g: grade(sig / th, [1.5, 1, 0.75, 0.5]), note: sig.toLocaleString() + ' / ' + th.toLocaleString() },
        { k: '文化契合度', g: grade(fit, [0.95, 0.75, 0.5, 0.25]), note: qWorks.length ? Math.round(fit * 100) + '% 作品符合 KPI' : '沒有作品' },
        { k: '可塑性', g: plastic, note: plasticNote },
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
      case 'death':
        return { type, day: s.day, title: '死亡', text: epitaph(s) };
      case 'grey':
        return { type, day: s.day, title: '灰化',
          text: '你沒有死，只是不再思考。浮城多了一個非常有效率的標註員，評分 ' + s.rating.toFixed(1) + ' 星。' };
      case 'ordinary':
        return { type, day: s.day, title: '平凡人',
          text: '第 30 天。探射燈今晚沒有停在你的窗外。水位升到 ' + Math.floor(s.water) + ' 樓，而你仍然在這裡。'
            + (n ? '你留下了 ' + n + ' 件作品，它們會沉入舊城，等待下一個人把它們打撈上來。' : '你沒有留下任何作品，但你撐過來了。') };
      case 'recruited':
        return { type, day: s.day, title: '被選中',
          text: '第 ' + s.day + ' 天，探射燈停在你的窗外。' + (s.day === 10 ? '破格錄取。' : '') };
    }
  }

  // ---------- 跨局紀錄 ----------
  function recordMeta(meta, s, finalType) {
    meta = meta || {};
    meta.runs = (meta.runs || 0) + 1;
    meta.endings = meta.endings || {};
    meta.endings[finalType] = (meta.endings[finalType] || 0) + 1;
    meta.recipes = meta.recipes || {};
    Object.keys(s.discovered).forEach((k) => { meta.recipes[k] = true; });
    meta.log = meta.log || { fish: {}, relics: {} };
    Object.keys(s.log.fish).forEach((k) => { meta.log.fish[k] = true; });
    Object.keys(s.log.relics).forEach((k) => { meta.log.relics[k] = true; });
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
    const r = { title, lines: [], deltas: { cr: 0, body: 0, spark: 0 }, cards: [], dropped: [] };
    return {
      get review() { return r.review; }, set review(v) { r.review = v; },
      get ending() { return r.ending; }, set ending(v) { r.ending = v; },
      get event() { return r.event; }, set event(v) { r.event = v; },
      get rent() { return r.rent; }, set rent(v) { r.rent = v; },
      get searchlight() { return r.searchlight; }, set searchlight(v) { r.searchlight = v; },
      line(text, kind, v, stat) { r.lines.push({ text, kind: kind || '', v, stat }); if (stat) r.deltas[stat] += v; },
      delta(stat, v) { r.deltas[stat] += v; },
      gain(id) {
        const res = addCard(s, id);
        r.cards.push(res.card);
        if (res.dropped) r.dropped.push(res.dropped);
      },
      done() { r.deltas.spark = round1(r.deltas.spark); return r; },
    };
  }

  IE.Rules = {
    newRun, rand, pick, clamp, round1, addCard, legacyCard, addSpark, SPARK_MAX,
    quarterOf, isNight, threshold, reviewDay, kpi, flooded, nextRentDay, rentAmount, signal,
    labelItemPay, labelItemDrain, labelConfig, applyLabel,
    smileItemPay, smileItemDrain, smileConfig, applySmile,
    diveConfig, diveBodyCost, applyDive,
    chatCost, aliveNpcs, applyChat, applyRest,
    evalCraft, commitCraft, canCreate, craftCost,
    actions, shop, buy, morning, endDay, epitaph, endingFor, recordMeta,
    MAX_CARDS,
  };
});
