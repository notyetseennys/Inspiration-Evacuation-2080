#!/usr/bin/env node
// 好玩度研究第三部分（2026-11-26，docs/research/fun-audit.md 第十三節起）：一晚以外的機制實驗。不改遊戲，只在模擬器裏加規則。
// 用法：node tools/exp-run.js <變體> [局數=20]
//   route-none    對照組：用窮舉的相連排法，沒有取材路線
//   route-random  取材路線：每晚三個地點（各有兩種相鄰的情緒），亂選一個
//   route-smart   取材路線：選素材庫裏最多那兩種情緒的地點
//       選了地點：今晚手上最弱的兩張換成牌庫裏那兩種情緒的素材（牌庫有的話）；
//       並且接下那裏的委託「以這兩種情緒之一為主調、至少四張」，完成的一筆 ×2
//   stake-never   加碼：從不加碼（對照組；用遊戲本身的最好排法）
//   stake-smart   加碼：估計今晚夠強就加碼：目標 ×1.5；達標的話夜晚獎金加倍，最好一筆的素材各升一星
//   stake-always  加碼：每晚都加碼
// 輸出：通關率、每晚 總分÷目標、委託完成率、加碼的比例和成功率。
'use strict';
const path = require('path');
process.env.STRAT = 'balanced';
const { runOne, IE } = require(path.join(__dirname, 'sim-rounds.js'));
const D = IE.DATA, C = IE.Create, K = IE.Desk, RD = IE.Rounds, ST = IE.Stages;
const VARIANT = process.argv[2] || 'route-none';
const N = Number(process.argv[3]) || 20;
const WHEEL = D.WHEEL;
let rng = 777;
const rand = () => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng / 0x7fffffff; };
const mainOf = (res) => (res && res.subject && res.subject.main) || null;
const stats = { nights: 0, comHits: 0, stakes: 0, stakeWins: 0 };
const night = { key: null, emos: null, comDone: false, stake: false };

// ---------- 取材路線 ----------
const ROUTE = VARIANT.startsWith('route');
function chooseRoute(s, ses) {
  const pairs = [];
  while (pairs.length < 3) {
    const i = Math.floor(rand() * 10);
    const p = [WHEEL[i], WHEEL[(i + 1) % 10]];
    if (!pairs.some((x) => x[0] === p[0])) pairs.push(p);
  }
  if (VARIANT === 'route-random') return pairs[Math.floor(rand() * 3)];
  // smart：素材庫（手牌和牌庫）裏這兩種情緒的素材越多越好
  const count = (p) => s.cards.filter((c) => c.tags.some((t) => p.includes(t))).length;
  return pairs.slice().sort((a, b) => count(b) - count(a))[0];
}
function applyRoute(s, ses, emos) {
  // 牌庫裏有這兩種情緒的素材，換走手上最弱的兩張
  const fits = ses.deck.filter((u) => { const c = s.cards.find((x) => x.uid === u); return c && c.tags.some((t) => emos.includes(t)); }).slice(0, 2);
  fits.forEach((u) => {
    const weak = ses.hand.map((h) => s.cards.find((x) => x.uid === h)).filter(Boolean).sort((a, b) => C.starOf(a) - C.starOf(b))[0];
    if (!weak) return;
    ses.hand = ses.hand.filter((h) => h !== weak.uid).concat([u]);
    ses.deck = ses.deck.filter((d) => d !== u).concat([weak.uid]);
  });
}
const comOk = (s, res) => {
  if (!ROUTE || VARIANT === 'route-none' || night.comDone || !night.emos) return false;
  return night.emos.includes(mainOf(res)) && (res.scoring || []).length >= 4;
};

// ---------- 窮舉的相連排法（路線的變體；價值＝分數 × 委託的獎勵） ----------
function* chains(hand, maxN) {
  const seq = [], used = new Set();
  function* go() {
    if (seq.length) yield seq.slice();
    if (seq.length >= maxN) return;
    for (const c of hand) {
      if (used.has(c.uid)) continue;
      if (seq.length && K.rel(seq[seq.length - 1], c) === 'duan') continue;
      used.add(c.uid); seq.push(c);
      yield* go();
      seq.pop(); used.delete(c.uid);
    }
  }
  yield* go();
}
if (ROUTE) {
  C.bestPlay = function (s) {
    const ses = s.session;
    if (!ses) return null;
    const hand = ses.hand.map((u) => s.cards.find((c) => c.uid === u)).filter((c) => c && !C.forbidden(s, c));
    if (!hand.length) return null;
    let best = null;
    for (const seq of chains(hand, Math.min(C.maxCards(s), hand.length))) {
      const uids = seq.map((c) => c.uid);
      const res = C.scorePlay(s, uids, { roll: 0.5 });
      const val = res.total * (comOk(s, res) ? 2 : 1);
      if (!best || val > best.val || (val === best.val && uids.length < best.uids.length)) best = { uids, total: res.total, form: res.form, val };
    }
    return best;
  };
}

// ---------- 每晚開始：選路線或決定加碼 ----------
const origStart = RD.startNight;
RD.startNight = function (s) {
  const ses = origStart.apply(this, arguments);
  if (!ses) return ses;
  night.key = s.seed + ':' + s.night;
  night.comDone = false;
  night.emos = null;
  night.stake = false;
  stats.nights++;
  if (ROUTE && VARIANT !== 'route-none') {
    night.emos = chooseRoute(s, ses);
    applyRoute(s, ses, night.emos);
  }
  if (VARIANT.startsWith('stake') && ses.stage && ses.stage.target) {
    let go = VARIANT === 'stake-always';
    if (VARIANT === 'stake-smart') {
      // 估計：現在這手牌最好的一筆 × 可以下的筆數，夠目標的 1.5 倍再加三成餘裕才加碼
      const b = C.bestPlay(s);
      go = !!(b && b.total * ses.plays >= ses.stage.target * 1.5 * 1.3);
    }
    if (go) { night.stake = true; ses.stage.target = Math.round(ses.stage.target * 1.5); stats.stakes++; }
  }
  return ses;
};
// 下筆：委託的額外分數
const origPlay = C.play;
C.play = function (s, uids) {
  const res = origPlay.apply(this, arguments);
  if (res && comOk(s, res)) {
    const extra = res.total;
    res.total += extra;
    if (s.session) s.session.total += extra;
    night.comDone = true;
    stats.comHits++;
  }
  return res;
};
// 結算：加碼成功的獎勵
const origSettle = ST.settle;
ST.settle = function (s, ses) {
  const out = origSettle.apply(this, arguments);
  if (out && night.stake && out.pass) {
    stats.stakeWins++;
    s.cr += out.reward || 0;
    const best = (ses.log || []).reduce((a, x) => (!a || x.total > a.total ? x : a), null);
    (best && best.uids || []).forEach((u) => { const c = s.cards.find((x) => x.uid === u); if (c) c.star = Math.min(5, C.starOf(c) + 1); });
  }
  return out;
};
const ratios = [];
const origFinish = C.finish;
C.finish = function (s) {
  const ses = s.session;
  if (ses && ses.stage && ses.stage.target) ratios.push(ST.stageScore(ses) / ses.stage.target);
  return origFinish.apply(this, arguments);
};

const BGS = Object.keys(D.BACKGROUNDS).filter((id) => !D.BACKGROUNDS[id].unlock);
const SEASONS = D.SEASON_ORDER.slice();
const t0 = Date.now();
let wins = 0;
for (let i = 0; i < N; i++) {
  const r = runOne(BGS[i % BGS.length], SEASONS[i % SEASONS.length], 7000 + i, 'balanced', {});
  if (r.ending === 'recruited') wins++;
}
const med = (a) => { const v = a.slice().sort((x, y) => x - y); return v.length ? v[Math.floor(v.length / 2)] : NaN; };
const geo = (a) => Math.exp(a.reduce((x, v) => x + Math.log(Math.max(v, 1e-6)), 0) / a.length);
console.log(JSON.stringify({
  variant: VARIANT, runs: N, recruited: Math.round(100 * wins / N) + '%',
  nightRatioMedian: +med(ratios).toFixed(2), nightRatioGeo: +geo(ratios).toFixed(2),
  commission: ROUTE && VARIANT !== 'route-none' ? Math.round(100 * stats.comHits / Math.max(1, stats.nights)) + '%' : '—',
  stakeRate: VARIANT.startsWith('stake') ? Math.round(100 * stats.stakes / Math.max(1, stats.nights)) + '%' : '—',
  stakeWin: stats.stakes ? Math.round(100 * stats.stakeWins / stats.stakes) + '%' : '—',
  seconds: Math.round((Date.now() - t0) / 1000),
}));
