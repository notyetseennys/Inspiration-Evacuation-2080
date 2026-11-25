#!/usr/bin/env node
// 好玩度研究（2026-11-25，docs/research/fun-audit.md）：創作桌每一筆的決策空間。均衡機械人每下一筆之前，量度這手牌：
// 最好的排法、第二好的結構、和最好的差 20% 以內的結構有幾種、隨便排（隨機 30 次）的平均、「簡單的玩法」（星級最高的五張按色輪排）；
// 實際打出的一筆：結構、計分的張數、分數的組成（籌碼、倍率、結構和物件的 ×倍率、火花、AI 模仿、評審）。
// 用法：node tools/audit-desk.js [局數=20] [季，例如 c1；不寫＝全城篩選]
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const N = Number(process.argv[2]) || 20;
const CHAP = process.argv[3] || null;
process.env.STRAT = 'balanced';
const { runOne, IE } = require(path.join(ROOT, 'tools/sim-rounds.js'));
const D = IE.DATA, C = IE.Create, ST = IE.Stages;
const WHEEL = D.WHEEL;
const rows = [], nights = [];
let rngState = 12345;
const rnd = () => { rngState = (rngState * 1103515245 + 12345) & 0x7fffffff; return rngState / 0x7fffffff; };
const orig = C.play;
let curNight = null;
C.play = function (s, uids) {
  const ses = s.session;
  if (ses && ses.hand && ses.hand.length) {
    const hand = ses.hand.filter((u) => { const c = s.cards.find((x) => x.uid === u); return c && !C.forbidden(s, c); });
    const sug = C.suggest(s, hand, 9) || [];
    const best = sug.length ? sug[0].est : 0;
    const second = sug.length > 1 ? sug[1].est : 0;
    const within = sug.filter((x) => x.est >= best * 0.8).length;
    // 隨便排：隨機 3 至 5 張、隨機次序
    let rs = 0, rn = 0;
    for (let i = 0; i < 30; i++) {
      const pool = hand.slice();
      const k = Math.min(pool.length, 3 + Math.floor(rnd() * 3));
      const pick = [];
      for (let j = 0; j < k; j++) pick.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
      rs += C.scorePlay(s, pick, { roll: 0.5 }).total; rn++;
    }
    // 簡單的玩法：星級最高的五張，按色輪的位置排（相同、相鄰的情緒放在一起）
    const cards = hand.map((u) => s.cards.find((c) => c.uid === u));
    const top = cards.slice().sort((a, b) => C.starOf(b) - C.starOf(a)).slice(0, Math.min(5, cards.length));
    const wp = (c) => { const t = c.tags.find((x) => WHEEL.includes(x)); return t ? WHEEL.indexOf(t) : 99; };
    const naive = C.scorePlay(s, top.sort((a, b) => wp(a) - wp(b)).map((c) => c.uid), { roll: 0.5 }).total;
    const res = orig.apply(this, arguments);
    if (res) {
      const st = res.steps || [];
      let xprod = 1; st.forEach((x) => { if (x.xmult && x.t !== 'past' && x.t !== 'ai') xprod *= x.xmult; });
      const fin = {}; st.forEach((x) => { if (['past', 'ai', 'stage', 'world', 'trip', 'weather', 'kpi', 'spark'].includes(x.t)) fin[x.t] = x.x; });
      const cardsScored = st.filter((x) => x.t === 'card').length;
      const objX = st.filter((x) => (x.t === 'obj' || x.t === 'school' || x.t === 'mod') && x.xmult).reduce((a, x) => a * x.xmult, 1);
      const objAdd = st.filter((x) => (x.t === 'obj' || x.t === 'school') && x.mult).reduce((a, x) => a + x.mult, 0);
      const structX = st.filter((x) => (x.t === 'link' || x.t === 'he' || x.t === 'title' || x.t === 'compound') && x.xmult).reduce((a, x) => a * x.xmult, 1);
      const recipe = st.filter((x) => x.t === 'recipe').length;
      rows.push({ night: s.night, kind: ses.stage && ses.stage.kind, form: res.form, len: (res.scoring || []).length, cardsScored, total: res.total, best, second, within, rand: rs / rn, naive,
        chips: res.chips, mult: res.mult, xprod, objX, objAdd, structX, recipe, spark: fin.spark || 1, ai: fin.ai || 1, past: fin.past || 1, stage: fin.stage || 1, noise: (res.noise || []).length, handN: hand.length, plays: ses.plays, target: ses.stage && ses.stage.target });
    }
    return res;
  }
  return orig.apply(this, arguments);
};
const BGS = Object.keys(D.BACKGROUNDS).filter((id) => !D.BACKGROUNDS[id].unlock);
const SEASONS = D.SEASON_ORDER.slice();
const runs = [];
for (let i = 0; i < N; i++) {
  const r = runOne(BGS[i % BGS.length], SEASONS[i % SEASONS.length], 900 + i, 'balanced', { chapter: CHAP });
  runs.push(r);
}
const med = (a) => { const v = a.filter((x) => isFinite(x)).sort((x, y) => x - y); return v.length ? v[Math.floor(v.length / 2)] : NaN; };
const q = (a, p) => { const v = a.filter((x) => isFinite(x)).sort((x, y) => x - y); return v.length ? v[Math.min(v.length - 1, Math.floor(v.length * p))] : NaN; };
const pct = (f) => Math.round(100 * rows.filter(f).length / rows.length) + '%';
console.log('=== 創作桌每一筆（' + (CHAP || '全城篩選') + '，均衡，' + N + ' 局，' + rows.length + ' 筆）===');
const forms = {}; rows.forEach((r) => { forms[r.form] = (forms[r.form] || 0) + 1; });
console.log('結構：' + Object.keys(forms).sort((a, b) => forms[b] - forms[a]).map((k) => k + ' ' + Math.round(100 * forms[k] / rows.length) + '%').join('、'));
const H = -Object.values(forms).reduce((a, n) => { const p = n / rows.length; return a + p * Math.log2(p); }, 0);
console.log('結構的多樣性（熵）：' + H.toFixed(2) + ' 位元（最多 ' + Math.log2(9).toFixed(2) + '）');
console.log('計分的張數：' + [1, 2, 3, 4, 5].map((k) => k + ' 張 ' + pct((r) => r.len === k)).join('、') + '；有斷開的素材（不計分）：' + pct((r) => r.noise > 0));
console.log('打出的 ÷ 最好的：中位 ' + med(rows.map((r) => r.total / r.best)).toFixed(2) + '；第二好的結構 ÷ 最好的：中位 ' + med(rows.map((r) => r.second / r.best)).toFixed(2) + '；和最好的差 20% 以內的結構：中位 ' + med(rows.map((r) => r.within)) + ' 種');
console.log('最好的 ÷ 隨便排：中位 ×' + med(rows.map((r) => r.best / r.rand)).toFixed(1) + '（25% ×' + q(rows.map((r) => r.best / r.rand), 0.25).toFixed(1) + '，75% ×' + q(rows.map((r) => r.best / r.rand), 0.75).toFixed(1) + '）');
console.log('最好的 ÷ 簡單的玩法（星級最高的五張按色輪排）：中位 ×' + med(rows.map((r) => r.best / r.naive)).toFixed(1) + '；簡單的玩法 ≥ 最好的八成：' + pct((r) => r.naive >= r.best * 0.8));
console.log('分數的組成（中位）：籌碼 ' + Math.round(med(rows.map((r) => r.chips))) + '、倍率 ' + med(rows.map((r) => r.mult)).toFixed(1) + '（其中結構的 ×' + med(rows.map((r) => r.structX)).toFixed(2) + '、物件流派卡面的 ×' + med(rows.map((r) => r.objX)).toFixed(2) + '、物件流派的 +' + med(rows.map((r) => r.objAdd)).toFixed(0) + '）、火花 ×' + med(rows.map((r) => r.spark)).toFixed(2) + '、AI ×' + med(rows.map((r) => r.ai)).toFixed(2) + '、評審 ×' + med(rows.map((r) => r.stage)).toFixed(2));
console.log('有具名組合的筆：' + pct((r) => r.recipe > 0));
console.log('AI 模仿的懲罰：×0.9 以下 ' + pct((r) => r.ai < 0.9) + '、×0.7 以下 ' + pct((r) => r.ai < 0.7));
console.log('每一筆和這一晚目標的比例：中位 ' + med(rows.map((r) => r.total / r.target)).toFixed(2) + '；一筆就達標：' + pct((r) => r.total >= r.target));
const growth = {}; rows.forEach((r) => { (growth[r.night] = growth[r.night] || []).push(r.total); });
console.log('每晚一筆的中位分數：' + Object.keys(growth).map(Number).sort((a, b) => a - b).map((k) => 'N' + k + ' ' + Math.round(med(growth[k]))).join(' '));
console.log('結局：' + JSON.stringify(runs.reduce((a, r) => { a[r.ending] = (a[r.ending] || 0) + 1; return a; }, {})) + '；每局下筆 ' + (rows.length / N).toFixed(1) + ' 次、每晚 ' + (rows.length / runs.reduce((a, r) => a + r.nightsDone, 0)).toFixed(2) + ' 次');
