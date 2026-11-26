#!/usr/bin/env node
// 好玩度研究第二部分（2026-11-26，docs/research/fun-audit.md 第七節起）：機制的實驗。
// 不改遊戲：在模擬器裏把創作桌的規則換掉，量度每一個提案會不會令玩家改變玩法。
// 用法：node tools/exp-desk.js <變體> [局數=20] [季，不寫＝全城篩選]
//   base          原來的規則（對照組；用窮舉的「相連排法」搜尋，和其他變體一致）
//   gamebot       原來的規則，但用遊戲本身的最好排法搜尋（量度遊戲的搜尋和窮舉差多少）
//   montage       蒙太奇：一筆之中可以有一個「斷」，兩邊都計分
//   counterpoint  對位：每一個「轉」都 ×1.5（原本只有第一個）
//   negspace      留白：每少用一張素材（相對五張），倍率 ×1.5
//   combo         以上三件物件同時有
//   serial        連載：和這一晚上一筆同一個主調，×1.5（機械人知道這條規則）
//   macro-greedy  四格：一晚四筆的主調依次是起、承、轉、合，第四筆 ×2（機械人不理會四格，只量度自然發生的比例）
//   macro-plan    四格：機械人會為四格計劃（承、轉的那一筆加權 1.3，完成的一筆 ×2）
//   commission    委託：每晚一個委託（主調、剛好三張、沒有轉、不是起承轉合或迴旋、三種媒材），完成的一筆 ×2
//   commission-hard  委託要兩個條件（主調＋至少四張、主調＋剛好三張、四種媒材、五張的首尾呼應或獨白）
//   macro-steps   四格的每一步都有獎勵：承 ×1.2、轉 ×1.3、合 ×1.6（機械人會計劃）
// 每一筆由均衡機械人選「價值」最高的相連排法；輸出結構的分佈和多樣性、用幾張、每晚的 總分÷目標、變體專屬的量度。
'use strict';
const path = require('path');
process.env.STRAT = 'balanced';
const { runOne, IE } = require('./sim-rounds.js');
const D = IE.DATA, C = IE.Create, K = IE.Desk, RD = IE.Rounds;
const VARIANT = process.argv[2] || 'base';
const N = Number(process.argv[3]) || 20;
const CHAP = process.argv[4] || null;
const WHEEL = D.WHEEL;
const wd = (a, b) => K.wdist(a, b);
const cheng = (a, b) => a && b && wd(a, b) <= 1;
const zhuan = (a, b) => a && b && wd(a, b) === 5;

// ---------- 改寫規則（scorePlay 經 IE.Desk 呼叫這兩個函數，所以模擬器的計分會用新的規則） ----------
const has = (v) => VARIANT === v || (VARIANT === 'combo' && ['montage', 'counterpoint', 'negspace'].includes(v));
const BREAKS = has('montage') ? 1 : 0;
if (has('montage')) {
  const prev = K.analyze;
  K.analyze = (cards, o) => prev(cards, Object.assign({}, o, { repair: ((o && o.repair) || 0) + 1 }));
}
if (has('counterpoint')) {
  const prev = K.structSteps;
  K.structSteps = (A) => prev(A).map((st) => (st.t === 'link' && st.kind === 'zhuan' && st.extra ? Object.assign({}, st, { xmult: D.DESK.zhuan, extra: false }) : st));
}
if (has('negspace')) {
  const prev = K.structSteps;
  K.structSteps = (A) => { const out = prev(A); if (A.len >= 1 && A.len < 5) out.push({ t: 'exp', name: '留白', xmult: Math.pow(1.5, 5 - A.len) }); return out; };
}

// ---------- 一晚之內的情境（連載、四格、委託） ----------
const mainOf = (res) => (res && res.subject && res.subject.main) || null;
const nightState = { key: null, mains: [], com: null, comDone: false, comHits: 0, comNights: 0, macroDone: 0, macroNights: 0, diverge: 0, decisions: 0 };
let rng = 4242;
const rand = () => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng / 0x7fffffff; };
function newNight(s) {
  const key = s.seed + ':' + s.night;
  if (nightState.key === key) return;
  nightState.key = key;
  nightState.mains = [];
  nightState.com = null;
  nightState.comDone = false;
  if (VARIANT.startsWith('commission')) {
    const counts = {};
    s.cards.forEach((c) => c.tags.forEach((t) => { if (WHEEL.includes(t)) counts[t] = (counts[t] || 0) + 1; }));
    const emos = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 5);
    const types = VARIANT === 'commission-hard' ? ['main4', 'main3', 'media4', 'echo5'] : ['main', 'three', 'nozhuan', 'notfull', 'media'];
    const type = types[Math.floor(rand() * types.length)];
    nightState.com = { type, emo: emos[Math.floor(rand() * emos.length)] || 'warmth' };
    nightState.comNights++;
  }
}
function comOk(s, res) {
  const c = nightState.com;
  if (!c || nightState.comDone || !res) return false;
  const run = (res.scoring || []).map((u) => s.cards.find((x) => x.uid === u)).filter(Boolean);
  if (c.type === 'main') return mainOf(res) === c.emo;
  if (c.type === 'three') return run.length === 3;
  if (c.type === 'nozhuan') return run.length >= 3 && ['flow', 'echo', 'mono'].includes(res.form);
  if (c.type === 'notfull') return run.length >= 3 && !['full', 'loop'].includes(res.form);
  if (c.type === 'media') return new Set(run.map((x) => C.medium(x))).size >= 3;
  if (c.type === 'main4') return mainOf(res) === c.emo && run.length >= 4;
  if (c.type === 'main3') return mainOf(res) === c.emo && run.length === 3;
  if (c.type === 'media4') return new Set(run.map((x) => C.medium(x))).size >= 4;
  if (c.type === 'echo5') return run.length === 5 && ['echo', 'mono'].includes(res.form);
  return false;
}
// 這一筆實際的額外倍數（規則）和機械人估值用的倍數（規則加計劃）
function bonus(s, res, planning) {
  const k = nightState.mains.length, m = mainOf(res), M = nightState.mains;
  let real = 1, plan = 1;
  if (VARIANT === 'serial' && k > 0 && m && m === M[k - 1]) { real *= 1.5; plan *= 1.5; }
  if (VARIANT === 'macro-steps') {
    const alive2 = k >= 1 && cheng(M[0], M[1]), alive3 = alive2 && k >= 2 && zhuan(M[1], M[2]);
    if (k === 1 && cheng(M[0], m)) { real *= 1.2; plan *= 1.2; }
    if (k === 2 && alive2 && zhuan(M[1], m)) { real *= 1.3; plan *= 1.3; }
    if (k === 3 && alive3 && cheng(m, M[0])) { real *= 1.6; plan *= 1.6; }
  } else if (VARIANT.startsWith('macro')) {
    const alive2 = k >= 1 && cheng(M[0], M[1]), alive3 = alive2 && k >= 2 && zhuan(M[1], M[2]);
    if (k === 3 && alive3 && cheng(m, M[0])) { real *= 2; plan *= 2; }
    if (planning && k === 1 && cheng(M[0], m)) plan *= 1.3;
    if (planning && k === 2 && alive2 && zhuan(M[1], m)) plan *= 1.3;
  }
  if (VARIANT.startsWith('commission') && comOk(s, res)) { real *= 2; plan *= 2; }
  return { real, plan };
}

// ---------- 窮舉相連的排法（最多 BREAKS 個「斷」） ----------
function* chains(hand, maxN) {
  const seq = [], used = new Set();
  function* go(breaks) {
    if (seq.length) yield seq.slice();
    if (seq.length >= maxN) return;
    for (const c of hand) {
      if (used.has(c.uid)) continue;
      let b = breaks;
      if (seq.length && K.rel(seq[seq.length - 1], c) === 'duan') { if (b <= 0) continue; b--; }
      used.add(c.uid); seq.push(c);
      yield* go(b);
      seq.pop(); used.delete(c.uid);
    }
  }
  yield* go(BREAKS);
}
function bestPlay(s) {
  const ses = s.session;
  if (!ses) return null;
  newNight(s);
  const hand = ses.hand.map((u) => s.cards.find((c) => c.uid === u)).filter((c) => c && !C.forbidden(s, c));
  if (!hand.length) return null;
  const planning = VARIANT !== 'macro-greedy';
  let best = null, raw = null;
  for (const seq of chains(hand, Math.min(C.maxCards(s), hand.length))) {
    const uids = seq.map((c) => c.uid);
    const res = C.scorePlay(s, uids, { roll: 0.5 });
    const val = res.total * bonus(s, res, planning).plan;
    if (!best || val > best.val || (val === best.val && uids.length < best.uids.length)) best = { uids, total: res.total, form: res.form, val };
    if (!raw || res.total > raw.total) raw = { uids, total: res.total };
  }
  if (best && raw) { nightState.decisions++; if (best.uids.join() !== raw.uids.join()) nightState.diverge++; }
  return best;
}
// gamebot：用遊戲本身的 IE.Create.bestPlay（候選排法的啟發式搜尋），和窮舉的 base 比較
if (VARIANT !== 'gamebot') C.bestPlay = bestPlay;

// 下筆：加上情境的額外分數，記下每一筆
const rows = [];
const origPlay = C.play;
C.play = function (s, uids) {
  newNight(s);
  const res = origPlay.apply(this, arguments);
  if (!res) return res;
  const b = bonus(s, res, false);
  if (b.real !== 1) {
    const extra = Math.round(res.total * (b.real - 1));
    res.total += extra;
    if (s.session) s.session.total += extra;
  }
  if (VARIANT.startsWith('commission') && comOk(s, res)) { nightState.comDone = true; nightState.comHits++; }
  nightState.mains.push(mainOf(res));
  if (VARIANT.startsWith('macro') && nightState.mains.length === 4) {
    nightState.macroNights++;
    const M = nightState.mains;
    if (cheng(M[0], M[1])) nightState.step2 = (nightState.step2 || 0) + 1;
    if (cheng(M[0], M[1]) && zhuan(M[1], M[2])) nightState.step3 = (nightState.step3 || 0) + 1;
    if (cheng(M[0], M[1]) && zhuan(M[1], M[2]) && cheng(M[3], M[0])) nightState.macroDone++;
  }
  const cards = uids.map((u) => s.cards.find((c) => c.uid === u)).filter(Boolean);
  const A = K.analyze(cards, { repair: BREAKS });
  rows.push({ form: res.form, len: (res.scoring || []).length, zc: A.zc, fix: A.links.slice(A.s, A.e).filter((x) => x === 'fix').length });
  return res;
};
// 每晚結束時的 總分÷目標
const nightRatios = [];
const origFinish = C.finish;
C.finish = function (s) {
  const ses = s.session;
  if (ses && ses.stage && ses.stage.target) nightRatios.push(IE.Stages.stageScore(ses) / ses.stage.target);
  return origFinish.apply(this, arguments);
};

const BGS = Object.keys(D.BACKGROUNDS).filter((id) => !D.BACKGROUNDS[id].unlock);
const SEASONS = D.SEASON_ORDER.slice();
const t0 = Date.now();
const ends = {};
for (let i = 0; i < N; i++) {
  const r = runOne(BGS[i % BGS.length], SEASONS[i % SEASONS.length], 3000 + i, 'balanced', { chapter: CHAP });
  ends[r.ending] = (ends[r.ending] || 0) + 1;
}
const pct = (f) => Math.round(100 * rows.filter(f).length / rows.length);
const forms = {};
rows.forEach((r) => { forms[r.form] = (forms[r.form] || 0) + 1; });
const H = -Object.values(forms).reduce((a, n) => { const p = n / rows.length; return a + p * Math.log2(p); }, 0);
const med = (a) => { const v = a.slice().sort((x, y) => x - y); return v.length ? v[Math.floor(v.length / 2)] : NaN; };
const geo = (a) => Math.exp(a.reduce((x, v) => x + Math.log(Math.max(v, 1e-6)), 0) / a.length);
const out = {
  variant: VARIANT, chapter: CHAP || 'free', runs: N, strokes: rows.length,
  recruited: Math.round(100 * (ends.recruited || 0) / N) + '%',
  entropy: +H.toFixed(2),
  forms: Object.keys(forms).sort((a, b) => forms[b] - forms[a]).map((k) => k + ' ' + Math.round(100 * forms[k] / rows.length) + '%').join('、'),
  fiveCards: pct((r) => r.len === 5) + '%', le3Cards: pct((r) => r.len <= 3) + '%', multiZhuan: pct((r) => r.zc >= 2) + '%', usesBreak: pct((r) => r.fix > 0) + '%',
  nightRatioMedian: +med(nightRatios).toFixed(2), nightRatioGeo: +geo(nightRatios).toFixed(2),
  diverge: Math.round(100 * nightState.diverge / Math.max(1, nightState.decisions)) + '%',
  macro: nightState.macroNights ? Math.round(100 * nightState.macroDone / nightState.macroNights) + '%' : '—',
  macroSteps: nightState.macroNights ? [nightState.step2 || 0, nightState.step3 || 0, nightState.macroDone].map((x) => Math.round(100 * x / nightState.macroNights) + '%').join('／') : '—',
  commission: nightState.comNights ? Math.round(100 * nightState.comHits / nightState.comNights) + '%' : '—',
  seconds: Math.round((Date.now() - t0) / 1000),
};
console.log(JSON.stringify(out));
