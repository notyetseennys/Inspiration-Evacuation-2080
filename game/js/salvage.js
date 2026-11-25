// 《靈感撤離 2080》第十七期：舊城打撈（局與局之間的升級樹）。純邏輯，瀏覽器和 Node 共用。
// 每一生（任何結局）沉下去的作品變成「沉積」；用沉積在舊城六區由上而下打撈節點。
// 跨局的紀錄在 meta.salvage：{ sediment: 現有, earned: 累計, owned: { 節點 id: true } }。
// 開新局時 perks(meta) 合併已打撈節點的 fx，複製到 s.salvage；遊戲各處用 s.salvage 的鍵：
//   startCards 開局多幾張素材、startFoil 開局幾張閃卡、packExtra 素材包多幾個選擇、dupStar 重複時多升幾星、roundPack 每輪送打撈包、
//   preview 預計分數、hint 最好的排法、discards 改稿、fullLevel 起承轉合的等級、aiHalf AI 模仿減半、firstChips 第一筆籌碼、
//   soulWarn 靈魂提醒、startSoul 開局靈魂、confess 告解、reviewPreview 篩選預告、careBonus 為了一個人、soulLimit 靈魂上限、
//   skipSpark 睡懶覺、startSpark 開局火花、roundSpark 每輪第一晚、sparkFloor 火花下限、encoreSpark 加演、passSpark 達標、
//   startCash 開局的錢（內部單位）、rerollDisc 換一批折扣、foilX 閃卡機會倍數、shopDisc 物件折扣、moveDisc 搬遷折扣、freeReroll 每輪免費換一批、
//   floodForecast 水位預報、nextJudge 下一輪評審預告、judgeImpact 評審規則的影響、saveChance 免扣機會、hideDisc 藏朋友折扣、sedimentX 沉積加成
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA;
  const COST = D.SALVAGE_COST || [];
  const NODES = [];
  (D.SALVAGE || []).forEach((dist) => dist.nodes.forEach((n, i) => {
    NODES.push(Object.assign({}, n, { district: dist.id, tier: i, cost: COST[i] || COST[COST.length - 1] || 99 }));
  }));
  const BY = {};
  NODES.forEach((n) => { BY[n.id] = n; });

  const get = (id) => BY[id] || null;
  const owned = (meta, id) => !!(meta && meta.salvage && meta.salvage.owned && meta.salvage.owned[id]);
  const balance = (meta) => (meta && meta.salvage && meta.salvage.sediment) || 0;
  const ownedCount = (meta) => NODES.filter((n) => owned(meta, n.id)).length;
  function ensure(meta) {
    meta.salvage = meta.salvage || { sediment: 0, earned: 0, owned: {} };
    meta.salvage.owned = meta.salvage.owned || {};
    meta.salvage.sediment = meta.salvage.sediment || 0;
    meta.salvage.earned = meta.salvage.earned || 0;
    return meta.salvage;
  }
  // 上一層（同一區、tier − 1）
  const prevOf = (n) => (n.tier > 0 ? NODES.find((x) => x.district === n.district && x.tier === n.tier - 1) : null);

  function canBuy(meta, id) {
    const T = D.SALVAGE_TEXT;
    const n = get(id);
    if (!n) return { ok: false, msg: '沒有這個節點' };
    if (owned(meta, id)) return { ok: false, msg: T.bought };
    const p = prevOf(n);
    if (p && !owned(meta, p.id)) return { ok: false, msg: T.lockedPrev };
    if (balance(meta) < n.cost) return { ok: false, msg: T.need.replace('{n}', String(n.cost)), cost: n.cost };
    return { ok: true, cost: n.cost };
  }
  function buy(meta, id) {
    const c = canBuy(meta, id);
    if (!c.ok) return c;
    const sv = ensure(meta);
    const n = get(id);
    sv.sediment -= n.cost;
    sv.owned[id] = true;
    return { ok: true, node: n, left: sv.sediment };
  }
  // 已打撈節點的效果合併（數字相加）
  function perks(meta) {
    const out = {};
    NODES.forEach((n) => {
      if (!owned(meta, n.id)) return;
      Object.keys(n.fx || {}).forEach((k) => { out[k] = Math.round(((out[k] || 0) + n.fx[k]) * 100) / 100; });
    });
    return out;
  }

  // 一晚的超額級數（和 IE.Stages 的超額規則一致：2、5、10 倍）
  function overTier(score, target) {
    if (!target || !score) return 0;
    const x = score / target;
    return x >= 10 ? 3 : x >= 5 ? 2 : x >= 2 ? 1 : 0;
  }
  // 這一生沉下去多少沉積（純函數，不改局面）
  function earn(s, endingKind, opts) {
    const o = opts || {};
    const log = (s && s.nightLog) || [];
    const nights = log.length;
    const passed = log.filter((x) => x.pass).length;
    const over = log.reduce((a, x) => a + overTier(x.score, x.target), 0);
    const roundsPassed = (s && s.reviewsPassed) || 0;
    const recruited = endingKind === 'recruited';
    const lines = [];
    const T = D.SALVAGE_TEXT.lines;
    let v = 0;
    const add = (k, n, val) => { if (!val) return; v += val; lines.push({ k, text: T[k].replace('{n}', String(n)), v: val }); };
    add('nights', nights, nights * 1);
    add('passed', passed, passed * 3);
    add('over', over, over * 1);
    add('rounds', roundsPassed, roundsPassed * 4);
    add('recruited', 1, recruited ? 12 : 0);
    add('firstClear', 1, o.firstClear ? 10 : 0);
    const x = (s && s.salvage && s.salvage.sedimentX) || 0;
    if (x && v) {
      const bonus = Math.round(v * x);
      v += bonus;
      lines.push({ k: 'gaze', text: T.gaze, v: bonus });
    }
    return { total: v, lines };
  }
  // 存進舊城：回傳 earn 的結果
  function bank(meta, s, endingKind, opts) {
    const res = earn(s, endingKind, opts);
    const sv = ensure(meta);
    sv.sediment += res.total;
    sv.earned += res.total;
    return res;
  }
  // 節點的說明（{cash:15} 換成顯示的金額）
  function describe(n) {
    if (!n) return '';
    const rate = (D.CITIES && D.CITY_DEFAULT && D.CITIES[D.CITY_DEFAULT] && D.CITIES[D.CITY_DEFAULT].currency && D.CITIES[D.CITY_DEFAULT].currency.rate) || 1;
    return String(n.text || '').replace(/\{cash:(\d+)\}/g, (m, v) => '$' + String(Math.round(Number(v) * rate)).replace(/\B(?=(\d{3})+(?!\d))/g, ','));
  }
  const districts = () => (D.SALVAGE || []).map((d) => Object.assign({}, d, { nodes: NODES.filter((n) => n.district === d.id) }));

  IE.Salvage = { NODES, get, owned, balance, ownedCount, ensure, canBuy, buy, perks, overTier, earn, bank, describe, districts };
});
