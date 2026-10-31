// 《靈感撤離 2080》第八期：小遊戲的「照舊做」（熟手自動完成）。純邏輯，瀏覽器與 Node 共用。
// 親手玩過一次的小遊戲，之後可以選「照舊做」：按你在這個小遊戲的最高評級減一級，即時生成一份普通的結果。
// 自動完成最多 A 級（失業程式員的「寫腳本」最多 S 級），永遠拿不到 SS、特別成就和稀有掉落。
// 自動完成只做老實的選擇：不附和偏見、不撬儲物櫃、不接黑市私活、不吹噓。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA, R = IE.Rules;
  const ORDER = ['D', 'C', 'B', 'A', 'S', 'SS'];
  const KINDS = ['label', 'ot', 'smile', 'dive', 'delivery', 'farm', 'busk', 'clinic', 'garden', 'salvage', 'haggle'];
  const perk = (s) => D.BACKGROUNDS[s.bg].perk || {};
  // 每局開始時從局外紀錄複製，親手玩出更好的評級時更新
  const best = (s, kind) => (s.microBest && s.microBest[kind === 'ot' ? 'label' : kind]) || null;
  const cap = (s) => (perk(s).scriptS ? 'S' : 'A');
  // 跳過的評級：沒有親手玩過是 B 級；玩過之後是最高評級減一級，不超過上限
  function target(s, kind) {
    const b = best(s, kind);
    if (!b) return 'B';
    return ORDER[Math.max(0, Math.min(ORDER.indexOf(b) - 1, ORDER.indexOf(cap(s))))];
  }
  const can = (s, kind) => KINDS.includes(kind);
  function record(s, kind, rank) {
    if (!rank) return;
    const k = kind === 'ot' ? 'label' : kind;
    s.microBest = s.microBest || {};
    if (!s.microBest[k] || ORDER.indexOf(rank) > ORDER.indexOf(s.microBest[k])) s.microBest[k] = rank;
  }

  // 固定種子的亂數：同一個 q 每次得到同一份結果，方便二分搜尋
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const lerp = (a, b, q) => a + (b - a) * q;

  // q（0 至 1）越高，表現越好
  const GEN = {
    label(s, q, r, ot) {
      let combo = 0, cr = 0, drain = 0, correct = 0, wrong = 0, maxCombo = 0, flows = 0, flowLeft = 0;
      for (let i = 0; i < 32; i++) {
        if (r() < lerp(0.55, 0.97, q)) {
          const o = { ot, flow: flowLeft > 0, gold: false };
          cr += R.labelItemPay(s, combo, o); drain += R.labelItemDrain(s, o);
          correct++; combo++; maxCombo = Math.max(maxCombo, combo);
          if (flowLeft > 0) flowLeft--;
          if (combo === 15) { flows++; flowLeft = 6; }
        } else { wrong++; combo = 0; flowLeft = 0; }
      }
      return { cr, drain, correct, wrong: Math.max(1, wrong), maxCombo: Math.min(maxCombo, 29), flows, caught: 0 };
    },
    ot(s, q, r) { return GEN.label(s, q, r, true); },
    smile(s, q, r) {
      let perfect = 0, good = 0, miss = 0, cr = 0, drain = 0, pours = 0;
      for (let i = 0; i < 40; i++) {
        const lane = i % 3 === 0 ? 'nod' : i % 3 === 1 ? 'hold' : 'laugh';
        const x = r();
        const kind = x < lerp(0.15, 0.62, q) ? 'perfect' : x < lerp(0.5, 0.98, q) ? 'good' : 'miss';
        if (kind === 'perfect') perfect++; else if (kind === 'good') good++; else miss++;
        cr += R.smileItemPay(s, kind, lane); drain += R.smileItemDrain(s, kind, lane);
      }
      for (let i = 0; i < 3; i++) if (r() < lerp(0.3, 0.9, q)) { pours++; cr += R.smileItemPay(s, 'perfect', 'pour'); }
      const spills = 3 - pours;
      const satisfaction = Math.max(0, (perfect + 0.6 * good) / 40 - spills * 0.05);
      return { cr, drain, perfect, good, miss, trapHits: 0, satisfaction, pours, spills, endorsed: 0 };
    },
    dive(s, q, r) {
      const cfg = R.diveConfig(s);
      const relics = [], fish = { sardine: 0, eel: 0, grouper: 0, jelly: 0 };
      let money = 0, weight = 0;
      const take = (w) => { if (weight + w > cfg.capacity) return false; weight += w; return true; };
      const findP = [lerp(0.2, 0.8, q), lerp(0.05, 0.5, q), 0];
      cfg.zones.forEach((z, i) => z.relics.forEach((id) => { if (relics.length < 3 && r() < findP[i] && take(1)) relics.push(id); }));
      cfg.scrap.forEach((v) => { if (r() < 0.6 && take(1)) money += v; });
      const sard = 1 + Math.round(3 * q);
      for (let i = 0; i < sard; i++) if (take(1)) { fish.sardine++; money += D.FISH.sardine.value; }
      if (q > 0.5 && take(2)) { fish.eel++; money += D.FISH.eel.value; }
      return { relics, money, fish, hits: Math.round((1 - q) * 2), drowned: false, lockers: 0 };
    },
    delivery(s, q, r) {
      const cfg = R.deliveryConfig(s);
      const deliveries = Math.max(1, Math.round(lerp(2, 7.4, q) * cfg.speedMult));
      const late = Math.max(1, Math.round(deliveries * lerp(0.35, 0.05, q)));
      const hits = q < 0.6 ? 1 : 0;
      const on = deliveries - late;
      return { cr: (on * 9.6 + late * 3) * cfg.payMult + on * 0.6 * 3 * cfg.tipMult, deliveries, late, hits };
    },
    farm(s, q, r) {
      const cfg = R.farmConfig(s);
      const T = D.FARM_TILES;
      const pick = (list) => list[Math.floor(r() * list.length)];
      let shares = 0, fakeTotal = 0;
      const n = 5 + Math.round(3 * q);
      for (let h = 0; h < n; h++) {
        let bestSc = null;
        const tries = 1 + Math.round(8 * q);
        for (let t = 0; t < tries; t++) {
          const sc = R.farmScore([pick(T.subject), pick(T.verb), pick(T.object)]);
          if (!bestSc || sc.shares > bestSc.shares) bestSc = sc;
        }
        shares += bestSc.shares; fakeTotal += bestSc.fake;
      }
      shares = Math.min(Math.round(shares * lerp(0.35, 1, q)), 59000);
      return { cr: shares * 0.0026 * cfg.payMult, headlines: n, shares, fakeTotal: Math.round(fakeTotal * 10) / 10, truth: 0 };
    },
    busk(s, q, r) {
      const cfg = R.buskConfig(s);
      const rounds = Math.min(6, 1 + Math.round(5 * q));
      let crowd = 1, crowdMax = 1, cr = 0;
      for (let i = 0; i < rounds; i++) { cr += (1 + crowd * 0.5) * cfg.payMult; crowd = Math.min(9, crowd + 1 + (r() < q ? 1 : 0)); crowdMax = Math.max(crowdMax, crowd); }
      const soloNotes = Math.floor(rounds * lerp(1.5, 4, q));
      cr += soloNotes * 0.25 * cfg.payMult * 0.7 + crowd * cfg.payMult;
      return { cr, rounds, soloNotes, notes: soloNotes * 2 + rounds * 5, crowdMax };
    },
    clinic(s, q, r) {
      const cfg = R.clinicConfig(s);
      const patients = Math.min(5, 2 + Math.round(3 * q));
      let cr = 0;
      for (let i = 0; i < patients; i++) cr += (10 + 4 * r()) * cfg.payMult;
      return { cr, patients, illegal: 0, mistakes: Math.max(1, Math.round((1 - q) * 3)) };
    },
    garden(s, q, r) {
      return { harvest: Math.min(15, Math.round(lerp(3, 14, q))), stolen: Math.max(1, Math.round((1 - q) * 3)), wilted: Math.round((1 - q) * 2), golden: 0, mutant: false };
    },
    salvage(s, q, r) {
      const floors = Math.round(lerp(3, 9, q)), perfect = Math.min(4, Math.round(floors * 0.4 * q)), misses = Math.max(1, Math.round((1 - q) * 3));
      const items = [];
      for (let i = 0; i < floors; i++) if (r() < 0.25) items.push(r() < 0.5 ? 'v_brick' : 'v_photo');
      return { floors, perfect, misses, injured: q < 0.3 ? 1 : 0, items, cr: floors * 6 + perfect * 2 };
    },
    haggle(s, q, r) {
      let total = 0, deals = 0, walkaways = 0, best2 = 0;
      for (let i = 0; i < 6; i++) {
        if (r() < lerp(0.45, 0.95, q)) { const p = Math.min(55, Math.round(lerp(8, 30, q) + 6 * r())); total += p; deals++; best2 = Math.max(best2, p); } else walkaways++;
      }
      return { total, deals, walkaways, lies: 0, best: best2, exposed: false };
    },
  };

  // 生成一份落在目標評級的結果：逐級試 q，選評級不超過目標而且最接近目標的一份
  function result(s, kind) {
    const want = target(s, kind);
    if (!want || !GEN[kind]) return null;
    const J = IE.Jobs2;
    const goal = J.RANKS.find((x) => x.id === want).min + 0.05, top = ORDER.indexOf(want);
    const seed = (s.seed ^ (s.day * 7919) ^ (s.slot * 104729) ^ KINDS.indexOf(kind) * 31337) >>> 0;
    let res = null, bestGap = Infinity, low = null, lowPerf = Infinity;
    for (let i = 0; i <= 40; i++) {
      const cand = GEN[kind](s, i / 40, rng(seed)), p = J.PERF[kind](cand);
      if (p < lowPerf) { lowPerf = p; low = cand; }
      const ri = ORDER.indexOf(J.rankOf(p).id);
      if (ri > top) continue;
      // 先求評級等於目標，再求表現接近目標下限 +5%
      const gap = (top - ri) * 10 + Math.abs(p - goal);
      if (gap < bestGap) { bestGap = gap; res = cand; }
    }
    res = res || low;
    res.auto = true;
    res.autoRank = want;
    return res;
  }

  // 「照舊做」：生成結果並套用規則，回傳報告
  function apply(s, kind) {
    const res = result(s, kind);
    if (!res) return null;
    s.stats.autoDone = (s.stats.autoDone || 0) + 1;
    return R.applyMicro(s, kind, res);
  }

  IE.Auto = { KINDS, ORDER, target, can, record, result, apply, cap };
});
