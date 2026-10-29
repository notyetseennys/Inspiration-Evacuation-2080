#!/usr/bin/env node
// 平衡模擬：用同遊戲一樣嘅規則，跑唔同策略幾百局，睇核心矛盾成唔成立。
// 用法：node tools/sim.js [局數]
// 設計目標：
//   - 淨係打工（workaholic）：唔會被選中（平凡人或灰化）
//   - 淨係創作（artist）：捱唔過（死亡）
//   - 有節奏嘅玩家（balanced）：有一定機會被選中，第 10 日被選中好難
'use strict';
const path = require('path');
require(path.join(__dirname, '../game/js/data.js'));
require(path.join(__dirname, '../game/js/rules.js'));
const { DATA: D, Rules: R } = globalThis.IE;

const RUNS = Number(process.argv[2]) || 400;

// ---------- 小遊戲表現模型（大約係一個普通玩家） ----------
function simLabel(s, ot, rng) {
  let combo = 0, cr = 0, drain = 0, correct = 0, wrong = 0, maxCombo = 0;
  const items = 26 + Math.floor(rng() * 6);
  for (let i = 0; i < items; i++) {
    if (rng() < 0.88) {
      cr += R.labelItemPay(s, combo, { ot }); drain += R.labelItemDrain(s, { ot });
      correct++; combo++; maxCombo = Math.max(maxCombo, combo);
    } else { wrong++; combo = 0; }
  }
  return { cr, drain, correct, wrong, maxCombo };
}
function simSmile(s, rng) {
  let perfect = 0, good = 0, miss = 0, trapHits = 0, cr = 0, drain = 0;
  for (let i = 0; i < 40; i++) {
    if (rng() < 0.15) { if (rng() < 0.3) trapHits++; continue; }
    const r = rng();
    const kind = r < 0.45 ? 'perfect' : r < 0.8 ? 'good' : 'miss';
    if (kind === 'perfect') perfect++; else if (kind === 'good') good++; else miss++;
    cr += R.smileItemPay(s, kind); drain += R.smileItemDrain(s, kind);
  }
  const total = perfect + good + miss;
  const satisfaction = Math.max(0, (perfect + 0.6 * good) / total - trapHits * 0.05);
  return { cr, drain, perfect, good, miss, trapHits, satisfaction };
}
function simDive(s, rng) {
  const cfg = R.diveConfig(s);
  const all = cfg.relics.slice();
  if (cfg.legacy) all.push(cfg.legacy);
  let relics = all.filter(() => rng() < 0.7);
  let sold = cfg.sell.filter(() => rng() < 0.6).reduce((a, b) => a + b, 0);
  const hits = rng() < 0.5 ? 1 : rng() < 0.3 ? 2 : 0;
  const drowned = rng() < 0.08;
  if (drowned) { relics = relics.slice(0, Math.ceil(relics.length / 2)); sold = Math.round(sold / 2); }
  return { relics, sold, hits, drowned };
}

// 揀最高分嘅素材組合（試晒所有 2 至 N 張組合）
function bestCraft(s) {
  const cards = s.cards;
  let best = null;
  const n = cards.length;
  let maxK = Math.min(s.craftSlots, n);
  while (maxK > 2 && R.craftCost(maxK) > s.cr) maxK--;
  const choose = (start, chosen) => {
    if (chosen.length >= 2) {
      const ev = R.evalCraft(s, chosen.map((c) => c.uid));
      if (!best || ev.total > best.total) best = { total: ev.total, uids: chosen.map((c) => c.uid) };
    }
    if (chosen.length === maxK) return;
    for (let i = start; i < n; i++) choose(i + 1, chosen.concat([cards[i]]));
  };
  choose(0, []);
  return best;
}

function act(s, id, rng) {
  switch (id) {
    case 'label': return R.applyLabel(s, simLabel(s, false, rng));
    case 'ot': return R.applyLabel(s, simLabel(s, true, rng), { ot: true });
    case 'smile': return R.applySmile(s, simSmile(s, rng));
    case 'dive': return R.applyDive(s, simDive(s, rng));
    case 'chat': {
      const alive = R.aliveNpcs(s);
      return R.applyChat(s, alive[Math.floor(rng() * alive.length)].id);
    }
    case 'rest': return R.applyRest(s);
    case 'create': {
      const b = bestCraft(s);
      return R.commitCraft(s, b.uids);
    }
  }
}
const enabled = (s, id) => { const a = R.actions(s).find((x) => x.id === id); return a && a.enabled; };
const firstEnabled = (s, ids) => ids.find((id) => enabled(s, id)) || 'rest';

// ---------- 策略 ----------
const STRATEGIES = {
  workaholic(s) {
    if (R.isNight(s)) return s.body > 30 ? firstEnabled(s, ['ot']) : 'rest';
    if (s.body < 25) return 'rest';
    return firstEnabled(s, ['smile', 'label', 'dive']);
  },
  artist(s) {
    if (R.isNight(s)) return enabled(s, 'create') ? 'create' : 'rest';
    if (s.body < 30) return 'rest';
    return firstEnabled(s, s.slot === 0 ? ['chat', 'dive'] : ['dive', 'chat']);
  },
  balanced(s) {
    const S = D.SEASONS[s.season];
    const daysToRent = R.nextRentDay(s) - s.day + 1;
    const need = R.rentAmount(s) + s.debt + S.food * daysToRent + 40;
    if (R.isNight(s)) {
      if (enabled(s, 'create') && s.cards.length >= 4) {
        const b = bestCraft(s);
        if (b && (b.total >= 700 || s.cards.length >= 9 || s.day === R.reviewDay(s))) return 'create';
      }
      if (s.cr < need && s.spark > 2.2 && s.body > 45) return firstEnabled(s, ['ot']);
      return 'rest';
    }
    if (s.body < 35) return 'rest';
    if (s.cr < need) return s.spark >= 2.2 ? firstEnabled(s, ['smile', 'label']) : firstEnabled(s, ['label', 'smile']);
    if (s.spark < 1.8) return firstEnabled(s, ['chat', 'rest']);
    if (s.cards.length < 6) return firstEnabled(s, s.body > 45 ? ['dive', 'chat'] : ['chat', 'rest']);
    return firstEnabled(s, ['chat', 'dive', 'label']);
  },
  random(s, rng) {
    const opts = R.actions(s).filter((a) => a.enabled).map((a) => a.id);
    return opts[Math.floor(rng() * opts.length)];
  },
};

function shopping(s, strat) {
  if (strat !== 'balanced') return;
  if (R.flooded(s)) R.buy(s, 'moveup');
  if (s.floor === 0) R.buy(s, 'rehouse');
  if (s.craftSlots < 5 && s.cr > 450) R.buy(s, 'tools');
  if (s.premiumUntil < s.day && s.cr > 300) R.buy(s, 'premium');
}

function mulberry(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function runOne(strat, bg, season, seed) {
  const rng = mulberry(seed * 7 + 13);
  const s = R.newRun({ bg, season, seed });
  const quarterSignals = [];
  while (!s.ended) {
    R.morning(s);
    shopping(s, strat);
    for (let slot = 0; slot < 3 && !s.ended; slot++) {
      s.slot = slot;
      const id = STRATEGIES[strat](s, rng);
      act(s, id, rng);
      if (s.body <= 0) break;
    }
    if (s.day === R.reviewDay(s)) quarterSignals.push(R.signal(s));
    const rep = R.endDay(s);
    if (rep.ending) break;
  }
  return { ending: s.ended.type, day: s.ended.day, signals: quarterSignals, works: s.works.length,
    maxScore: s.works.reduce((a, w) => Math.max(a, w.score), 0), auto: s.auto };
}

const bgs = Object.keys(D.BACKGROUNDS);

// DIST=1：唔設門檻，睇各策略喺第 10、20、30 日嘅累積訊號分佈，用嚟定門檻
if (process.env.DIST) {
  D.THRESHOLDS = [1e12, 1e12, 1e12];
  const pctl = (arr, p) => { if (!arr.length) return '-'; const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
  for (const strat of Object.keys(STRATEGIES)) {
    const res = [];
    for (let i = 0; i < RUNS; i++) res.push(runOne(strat, bgs[i % bgs.length], Object.keys(D.SEASONS)[Math.floor(i / bgs.length) % 3], 1000 + i));
    const line = [0, 1, 2].map((q) => {
      const arr = res.filter((r) => r.signals[q] != null).map((r) => r.signals[q]);
      return 'D' + (q + 1) * 10 + ' 存活' + String(Math.round(100 * arr.length / RUNS)).padStart(3) + '% p10/50/75/90 '
        + [0.1, 0.5, 0.75, 0.9].map((p) => pctl(arr, p)).join('/');
    });
    console.log(strat.padEnd(11) + line.join('  ｜ '));
  }
  process.exit(0);
}
const seasons = Object.keys(D.SEASONS);
const pct = (n, t) => (100 * n / t).toFixed(0).padStart(3) + '%';

console.log('門檻：' + D.THRESHOLDS.join(' / ') + '　每個策略 ' + RUNS + ' 局\n');
for (const strat of Object.keys(STRATEGIES)) {
  const res = [];
  for (let i = 0; i < RUNS; i++) res.push(runOne(strat, bgs[i % bgs.length], seasons[Math.floor(i / bgs.length) % seasons.length], 1000 + i));
  const count = (f) => res.filter(f).length;
  const rec = res.filter((r) => r.ending === 'recruited');
  const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const q = [0, 1, 2].map((i) => avg(res.filter((r) => r.signals[i] != null).map((r) => r.signals[i])));
  console.log(strat.padEnd(11)
    + ' 被選中' + pct(rec.length, RUNS)
    + '（D10 ' + pct(count((r) => r.ending === 'recruited' && r.day === 10), RUNS)
    + ' D20 ' + pct(count((r) => r.ending === 'recruited' && r.day === 20), RUNS)
    + ' D30 ' + pct(count((r) => r.ending === 'recruited' && r.day === 30), RUNS) + '）'
    + ' 平凡人' + pct(count((r) => r.ending === 'ordinary'), RUNS)
    + ' 死亡' + pct(count((r) => r.ending === 'death'), RUNS)
    + ' 灰化' + pct(count((r) => r.ending === 'grey'), RUNS)
    + ' ｜平均季訊號 ' + q.join('/')
    + ' 作品 ' + avg(res.map((r) => r.works))
    + ' 最高單件 ' + avg(res.map((r) => r.maxScore))
    + ' 自動化 ' + avg(res.map((r) => r.auto)) + '%');
}
console.log('\n按開局背景（balanced）：');
for (const bg of bgs) {
  const res = [];
  for (let i = 0; i < RUNS / 2; i++) res.push(runOne('balanced', bg, seasons[i % seasons.length], 5000 + i));
  const n = res.length;
  const c = (t) => pct(res.filter((r) => r.ending === t).length, n);
  console.log('  ' + D.BACKGROUNDS[bg].name.padEnd(8, '　') + ' 被選中' + c('recruited') + ' 平凡人' + c('ordinary') + ' 死亡' + c('death') + ' 灰化' + c('grey'));
}
