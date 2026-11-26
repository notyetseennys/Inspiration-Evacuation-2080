#!/usr/bin/env node
// 好玩度研究（2026-11-25，docs/research/fun-audit.md）：市集的哪一樣最重要。把某一類購買擋住，其他照均衡機械人的策略（全城篩選）。
// 用法：node tools/audit-shop.js [局數=100] [none|obj|tech|pack|service|list]
//   obj＝物件和遺物、tech＝技法課、pack＝素材包、service＝打磨／燒掉／複製；none＝照買（基準）；list＝只數購買的種類
//   PACKSWAP=1：素材包改為「選一張，同時燒掉最弱的一張」
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
// PACKSWAP=1：素材包的實驗：選了一張之後，同時燒掉素材庫裏最弱的一張（星級最低；不燒愧疚和剛選的）
if (process.env.PACKSWAP) {
  const origPick = RD.packPick;
  RD.packPick = function (s, i) {
    const res = origPick.apply(this, arguments);
    if (res && res.ok && s.cards.length > 8) {
      const C = IE.Create;
      const weak = s.cards.filter((c) => !c.guilt && (!res.card || c.uid !== res.card.uid)).sort((a, b) => C.starOf(a) - C.starOf(b) || (a.value || 0) - (b.value || 0))[0];
      if (weak) s.cards = s.cards.filter((c) => c.uid !== weak.uid);
    }
    return res;
  };
}
const BGS = Object.keys(D.BACKGROUNDS);
const SEASONS = D.SEASON_ORDER.slice();
let win = 0;
for (let i = 0; i < N; i++) { const r = runOne(BGS[i % BGS.length], SEASONS[i % SEASONS.length], i, 'balanced', {}); if (r.ending === 'recruited') win++; }
console.log(MODE, 'win', (100 * win / N).toFixed(1) + '%', 'attempts', JSON.stringify(seen));
