#!/usr/bin/env node
// 第十八期：連續多生的模擬（失敗是必然，成長是爽感）。
// 用法：node tools/sim-meta.js [生涯數=20] [每個生涯最多幾生=80]
//   STRAT=balanced（預設）／novice／expert
//   CHTARGET='{"c1":0.5}'、ECON='{...}'：和 tools/sim-rounds.js 一樣，臨時覆寫數值
//   WALL='{"c1":2}'：臨時覆寫各季的牆（最後一晚的目標倍數）；PASTCOST='{"base":10,"growth":1.25}'：前世軌道的價錢
// 每個生涯：由第一季開始。每一生用目前的前世力量（IE.Salvage.perks）玩最早一個未通過的季；
// 一生結束時把沉積存進舊城（第一次通過另加），再升級前世的軌道（便宜的先升，手稿和掌聲優先）；通過就開放下一季。
// 輸出：每一季第一次挑戰的結果、要幾生才通過、通過時的前世等級、第一次挑戰走到第幾晚。
'use strict';
process.env.STRAT = process.env.STRAT || 'balanced';
const { runOne, IE } = require('./sim-rounds.js');
const D = IE.DATA, SV = IE.Salvage, CH = IE.Chapters;

// WALL、PASTCOST、CHTARGET、ECON 由 sim-rounds.js 處理
const CAREERS = Number(process.argv[2]) || 20;
const MAX_LIVES = Number(process.argv[3]) || 80;
const STRAT = process.env.STRAT;
const ORDER = CH.LIST.filter((c) => !c.building).map((c) => c.id);
const BGS = Object.keys(D.BACKGROUNDS).filter((id) => !D.BACKGROUNDS[id].unlock);
const SEASONS = D.SEASON_ORDER.slice();
// 升級的偏好：數字越小越優先（相當於價錢打折）。舊城的節點：有效果的 1.5，只是資訊的 4（機械人用不着，但它們是下一層的前提）
const WEIGHT = { chips: 1, mult: 1, purse: 1.5, spark: 1.7, soul: 2.5 };
const NODE_W = (n) => (n.info ? 4 : 1.5);
// STOPAT=c2：通過這一季就停（逐季校準時省時間）
const STOPAT = process.env.STOPAT || null;

function upgrade(meta) {
  for (let guard = 0; guard < 400; guard++) {
    const opts = SV.TRACKS.map((t) => ({ k: 'track', id: t.id, c: SV.canLevel(meta, t.id), w: WEIGHT[t.id] || 2 }))
      .concat(process.env.NOTREE ? [] : SV.NODES.map((n) => ({ k: 'node', id: n.id, c: SV.canBuy(meta, n.id), w: NODE_W(n) })))
      .filter((x) => x.c.ok);
    if (!opts.length) return;
    opts.sort((a, b) => a.c.cost * a.w - b.c.cost * b.w);
    if (opts[0].k === 'track') SV.levelUp(meta, opts[0].id);
    else SV.buy(meta, opts[0].id);
  }
}

function career(k) {
  const meta = { runs: 0, salvage: { sediment: 0, earned: 0, owned: {}, levels: {} } };
  const bg = BGS[k % BGS.length];
  const lives = [];
  let ci = 0;
  for (let life = 1; life <= MAX_LIVES && ci < ORDER.length; life++) {
    const chId = ORDER[ci];
    const ch = CH.get(chId);
    // 執念：這一生之前，同一季連續失敗了幾次
    const streak = lives.length - 1 - (() => { for (let i = lives.length - 1; i >= 0; i--) if (lives[i].ch !== chId || lives[i].cleared) return i; return -1; })();
    const r = runOne(bg, SEASONS[(process.env.FIXSEASON ? k : k + life) % SEASONS.length], 100000 * (k + 1) + life, STRAT, { chapter: chId, salvage: SV.perks(meta), meta: { runs: life - 1 }, streak: process.env.NOSTREAK ? 0 : streak });
    const cleared = r.ending === 'recruited';
    const sediment = r.sediment + (cleared ? Math.round(((D.SEDIMENT && D.SEDIMENT.firstClear) || 10) * (ch.sediment || 1)) : 0);
    meta.salvage.sediment += sediment;
    meta.salvage.earned += sediment;
    lives.push({ life, ch: chId, nights: r.nightsDone, total: ch.rounds * 3, cleared, wall: r.wall, ending: r.ending, sediment, level: SV.totalLevel(meta), nodes: SV.ownedCount(meta), ratio: r.lastRatio });
    meta.runs = life;
    upgrade(meta);
    if (cleared) { ci++; if (STOPAT && chId === STOPAT) break; }
  }
  lives.bg = bg;
  return lives;
}

const t0 = Date.now();
const all = [];
for (let k = 0; k < CAREERS; k++) all.push(career(k));
const med = (a) => { if (!a.length) return '—'; const v = a.slice().sort((x, y) => x - y); return v[Math.floor(v.length / 2)]; };
const q = (a, p) => { if (!a.length) return '—'; const v = a.slice().sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(v.length * p))]; };

console.log('=== 連續多生（' + STRAT + '，' + CAREERS + ' 個生涯，每個最多 ' + MAX_LIVES + ' 生）===');
console.log('季 | 第一次挑戰失敗 | 第一次走到第幾晚 | 要幾生才通過（中位數，25%–75%） | 未通過的生涯 | 通過時的前世等級 | 每生沉積（中位數）');
let cum = [];
ORDER.forEach((id, i) => {
  const ch = CH.get(id);
  const firsts = all.map((L) => L.find((x) => x.ch === id)).filter(Boolean);
  const firstFail = firsts.filter((x) => !x.cleared).length;
  const firstNights = firsts.map((x) => x.nights);
  const toClear = all.map((L) => {
    const inCh = L.filter((x) => x.ch === id);
    const c = inCh.findIndex((x) => x.cleared);
    return c >= 0 ? c + 1 : null;
  });
  const done = toClear.filter((x) => x != null);
  const notDone = toClear.filter((x) => x == null && all.find((L) => L.some((y) => y.ch === id))).length;
  const lvAtClear = all.map((L) => (L.find((x) => x.ch === id && x.cleared) || {}).level).filter((x) => x != null);
  const sed = all.flatMap((L) => L.filter((x) => x.ch === id).map((x) => x.sediment));
  cum = all.map((L) => { const c = L.findIndex((x) => x.ch === id && x.cleared); return c >= 0 ? c + 1 : null; }).filter((x) => x != null);
  // 在這一季的第 1、2、3……生：走到第幾晚（中位數）、最後一晚的 總分÷目標（中位數）
  const byTry = [];
  for (let t = 0; t < 8; t++) {
    const xs = all.map((L) => L.filter((x) => x.ch === id)[t]).filter(Boolean);
    if (xs.length < Math.max(3, all.length / 4)) break;
    byTry.push(med(xs.map((x) => x.nights)) + '晚/' + med(xs.map((x) => Math.round(x.ratio * 100))) + '%' + (xs.some((x) => x.cleared) ? '(' + Math.round(100 * xs.filter((x) => x.cleared).length / xs.length) + '%過)' : ''));
  }
  console.log(ch.name + '（' + id + '，' + ch.rounds * 3 + ' 晚） | ' + (firsts.length ? Math.round(100 * firstFail / firsts.length) + '%' : '—')
    + ' | ' + med(firstNights) + '／' + ch.rounds * 3
    + ' | ' + med(done) + '（' + q(done, 0.25) + '–' + q(done, 0.75) + '）'
    + ' | ' + notDone
    + ' | ' + med(lvAtClear)
    + ' | ' + med(sed));
  console.log('    逐生：' + byTry.join(' → '));
  // 同一個生涯在這一季相鄰兩生：最後一晚的 總分÷目標 之比（兩生都走到最後一晚），和每一生升了幾級前世
  const grow = [], lv = [];
  all.forEach((L) => {
    const xs = L.filter((x) => x.ch === id);
    for (let t = 1; t < xs.length; t++) {
      if (xs[t].nights === xs[t].total && xs[t - 1].nights === xs[t - 1].total && xs[t - 1].ratio > 0) grow.push(xs[t].ratio / xs[t - 1].ratio);
      lv.push(xs[t].level - xs[t - 1].level);
    }
  });
  if (grow.length) console.log('    相鄰兩生的增長（中位數，25%–75%）：×' + med(grow).toFixed(2) + '（×' + q(grow, 0.25).toFixed(2) + '–×' + q(grow, 0.75).toFixed(2) + '）；每生升級：' + med(lv) + ' 級');
  console.log('    累計到這一季通過：第 ' + med(cum) + ' 生（中位數）；那時的舊城節點：' + med(all.map((L) => (L.find((x) => x.ch === id && x.cleared) || {}).nodes).filter((x) => x != null)));
});
// 每個角色：每一季要幾生才通過（中位數）、第一次挑戰就通過的生涯數
console.log('角色 | ' + ORDER.join(' | ') + ' | 第一次就通過');
BGS.forEach((bg) => {
  const mine = all.filter((L) => L.bg === bg);
  if (!mine.length) return;
  const cells = ORDER.map((id) => {
    const xs = mine.map((L) => { const inCh = L.filter((x) => x.ch === id); const c = inCh.findIndex((x) => x.cleared); return c >= 0 ? c + 1 : null; }).filter((x) => x != null);
    return xs.length ? String(med(xs)) : '—';
  });
  const firstWins = mine.reduce((a, L) => a + ORDER.filter((id) => { const f = L.find((x) => x.ch === id); return f && f.cleared; }).length, 0);
  console.log(bg + '（' + mine.length + '） | ' + cells.join(' | ') + ' | ' + firstWins);
});
const wallDeaths = all.flat().filter((x) => x.wall).length, deaths = all.flat().filter((x) => !x.cleared).length;
console.log('失敗的生之中，死在牆前（最後一晚）的比例：' + (deaths ? Math.round(100 * wallDeaths / deaths) : 0) + '%');
console.log('時間：' + Math.round((Date.now() - t0) / 1000) + ' 秒');
