#!/usr/bin/env node
// 好玩度研究（2026-11-25，docs/research/fun-audit.md）：市集的哪一樣最重要。把某一類購買擋住，其他照均衡機械人的策略（全城篩選）。
// 用法：node tools/audit-shop.js [局數=100] [none|obj|tech|pack|service|list]
//   obj＝物件和遺物、tech＝技法課、pack＝素材包、service＝打磨／燒掉／複製；none＝照買（基準）；list＝只數購買的種類
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const N = Number(process.argv[2]) || 100, MODE = process.argv[3] || 'none';
process.env.STRAT = 'balanced';
const { runOne, IE } = require(path.join(ROOT, 'tools/sim-rounds.js'));
const D = IE.DATA, RD = IE.Rounds;
const orig = RD.shopBuy;
const seen = {};
const kindOf = (slot) => (/^relic:|^obj/.test(slot) ? 'obj' : slot === 'tech' ? 'tech' : /^pack/.test(slot) ? 'pack' : ['polish', 'burn', 'copy', 'service'].some((k) => String(slot).startsWith(k)) ? 'service' : String(slot).split(':')[0]);
RD.shopBuy = function (s, slot) {
  const k = kindOf(String(slot));
  seen[k] = (seen[k] || 0) + 1;
  if (MODE !== 'none' && MODE !== 'list' && k === MODE) return { ok: false, msg: 'ablate' };
  return orig.apply(this, arguments);
};
const BGS = Object.keys(D.BACKGROUNDS);
const SEASONS = D.SEASON_ORDER.slice();
let win = 0;
for (let i = 0; i < N; i++) { const r = runOne(BGS[i % BGS.length], SEASONS[i % SEASONS.length], i, 'balanced', {}); if (r.ending === 'recruited') win++; }
console.log(MODE, 'win', (100 * win / N).toFixed(1) + '%', 'attempts', JSON.stringify(seen));
