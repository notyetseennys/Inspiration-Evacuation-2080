#!/usr/bin/env node
// 好玩度研究第三部分（2026-11-26，docs/research/fun-audit.md 第十三節起）：物件和流派的版圖。
// 均衡機械人玩全城篩選，記下每一局最後擁有的物件、達到兩件以上的流派和結局，
// 計算每件物件、每個流派的「出現的局數」「擁有時的通關率」和「比整體高或低幾點」，找出主導的打法和沒有人用的物件。
// 擁有物件的局本來就比較強（有錢才買得起），所以「高幾點」只是線索，不是因果。
// 用法：node tools/audit-objects.js [局數=300]
'use strict';
const path = require('path');
process.env.STRAT = process.env.STRAT || 'balanced';
const { runOne, IE } = require(path.join(__dirname, 'sim-rounds.js'));
const D = IE.DATA, C = IE.Create;
const N = Number(process.argv[2]) || 300;
const BGS = Object.keys(D.BACKGROUNDS);
const SEASONS = D.SEASON_ORDER.slice();
// 每一局結束時（C.finish 最後一次）記下物件
let last = null;
const origFinish = C.finish;
C.finish = function (s) {
  const objs = (s.objects || []).concat(s.objStash || []);
  const act = C.activeSchools(s, C.activeObjects(s)).map((x) => x.id + (x.n >= 3 ? '3' : '2'));
  last = { objs: objs.slice(), schools: act, start: D.START_OBJECT[s.bg] || null };
  return origFinish.apply(this, arguments);
};
const runs = [];
for (let i = 0; i < N; i++) {
  last = null;
  const r = runOne(BGS[i % BGS.length], SEASONS[i % SEASONS.length], 50000 + i, process.env.STRAT, {});
  runs.push({ win: r.ending === 'recruited', objs: last ? last.objs : [], schools: last ? last.schools : [], start: last ? last.start : null, bg: BGS[i % BGS.length] });
}
const base = runs.filter((r) => r.win).length / N;
const tally = (key) => {
  const m = {};
  runs.forEach((r) => {
    const seen = new Set(key(r));
    seen.forEach((k) => { m[k] = m[k] || { n: 0, w: 0 }; m[k].n++; if (r.win) m[k].w++; });
  });
  return Object.keys(m).map((k) => ({ k, n: m[k].n, rate: m[k].w / m[k].n })).sort((a, b) => b.n - a.n);
};
const objs = tally((r) => r.objs.filter((id) => id !== r.start));
const schools = tally((r) => r.schools);
const name = (id) => (D.OBJ[id] ? D.OBJ[id].name : id);
const all = D.OBJECTS.filter((o) => !o.npc && !o.souvenir && !o.start).map((o) => o.id);
const never = all.filter((id) => !objs.some((x) => x.k === id));
console.log('=== 物件和流派的版圖（全城篩選，' + process.env.STRAT + '，' + N + ' 局，整體通關率 ' + Math.round(base * 100) + '%）===');
console.log('每局最後擁有的物件（不含起始物件）：中位 ' + runs.map((r) => r.objs.length).sort((a, b) => a - b)[Math.floor(N / 2)] + ' 件');
console.log('流派（兩件或以上）出現的局：' + Math.round(100 * runs.filter((r) => r.schools.length).length / N) + '%；三件或以上：' + Math.round(100 * runs.filter((r) => r.schools.some((x) => x.endsWith('3'))).length / N) + '%');
console.log('\n流派 | 局數 | 通關率 | 比整體');
schools.forEach((x) => console.log(x.k + ' | ' + x.n + ' | ' + Math.round(x.rate * 100) + '% | ' + (x.rate >= base ? '+' : '') + Math.round((x.rate - base) * 100)));
console.log('\n最常見的物件（前 20）| 局數 | 通關率 | 比整體');
objs.slice(0, 20).forEach((x) => console.log(name(x.k) + '（' + x.k + '）| ' + x.n + ' | ' + Math.round(x.rate * 100) + '% | ' + (x.rate >= base ? '+' : '') + Math.round((x.rate - base) * 100)));
const solid = objs.filter((x) => x.n >= Math.max(15, N * 0.04));
console.log('\n至少 ' + Math.max(15, Math.round(N * 0.04)) + ' 局擁有：通關率最高的 8 件');
solid.slice().sort((a, b) => b.rate - a.rate).slice(0, 8).forEach((x) => console.log('  ' + name(x.k) + ' ' + Math.round(x.rate * 100) + '%（' + x.n + ' 局）'));
console.log('通關率最低的 8 件');
solid.slice().sort((a, b) => a.rate - b.rate).slice(0, 8).forEach((x) => console.log('  ' + name(x.k) + ' ' + Math.round(x.rate * 100) + '%（' + x.n + ' 局）'));
console.log('\n市集買得到、但 ' + N + ' 局都沒有出現的物件：' + never.length + ' / ' + all.length + (never.length ? '：' + never.slice(0, 30).map(name).join('、') : ''));
