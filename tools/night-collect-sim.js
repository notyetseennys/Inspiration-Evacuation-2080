// 創作之夜：收集進度的模擬（玩家累積發現的組合和具名組合）。
// 預設用主遊戲的素材卡；BAL=1 改用平衡的牌組：十種情緒各兩張單一素材、45 種組合各一張，
// 起手十張單一素材加六張組合（按背景固定），原有的卡不再出現。
// 2026-11-07 的結果（40 局）：
//   現在：組合停在 27/45，名作約 30；
//   平衡：組合 37/45 仍在上升，名作 32，愧疚的名作也會出現。
// 用法：node tools/night-collect-sim.js [局數]；BAL=1 node tools/night-collect-sim.js [局數]
const path = require('path');
const root = path.join(__dirname, '..');
['data.js', 'data-craft.js', 'data-chars.js', 'data-schools.js'].forEach((f) => require(path.join(root, 'game/js', f)));
const D = globalThis.IE.DATA;
const BAL = process.env.BAL === '1';
if (BAL) {
  const W = D.WHEEL;
  Object.values(D.CARDS).forEach((c) => { c.rarity = c.rarity || 'orig'; });
  const singles = [];
  W.forEach((e, i) => { for (let k = 1; k <= 2; k++) { const id = 'n1_' + e + k; D.CARDS[id] = { name: e + k, tags: [e], value: 14 }; singles.push(id); } });
  const duos = [];
  for (let i = 0; i < 10; i++) for (let j = i + 1; j < 10; j++) { const id = 'n2_' + W[i] + '_' + W[j]; D.CARDS[id] = { name: W[i] + W[j], tags: [W[i], W[j]], value: 26 }; duos.push(id); }
  // 起手：十種情緒各一張單一素材 + 六張組合（按背景固定）
  D.STARTER = W.map((e) => 'n1_' + e + '1');
  let h = 7;
  Object.values(D.BACKGROUNDS).forEach((b) => { b.cards = []; for (let k = 0; k < 6; k++) { h = (h * 1103515245 + 12345) % 2147483648; b.cards.push(duos[h % duos.length]); } });
  // 補牌：另外一套單一素材，令牌組的情緒平均
  singles.filter((id) => id.endsWith('2')).forEach((id) => { D.CARDS[id].value = 14; });
}
require(path.join(root, 'proto/night4/engine.js'));
const P = globalThis.IE.Proto2;
const N = Number(process.argv[2] || 40), K = 40;
function randSeq(r, hand) { const h = hand.slice(); for (let i = h.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [h[i], h[j]] = [h[j], h[i]]; } return h.slice(0, 2 + Math.floor(r() * 4)); }
function bestPlay(run) { const hand = run.cur.hand; let best = null; for (let i = 0; i < K; i++) { const u = randSeq(run.r, hand); const s = P.score(run, u); if (!best || s.total > best.total) best = { u, total: s.total }; } return best; }
const out = [];
for (let seed = 1; seed <= N; seed++) {
  const run = P.newRun(seed, { bg: ['copywriter', 'busker', 'teacher'][seed % 3] });
  const night = [];
  for (let ni = 0; ni < 3; ni++) {
    run.night = ni;
    const n = P.startNight(run); n.target = 1e12;
    while (n.plays > 0) { const b = bestPlay(run); P.play(run, b.u); }
    n.log.forEach((L) => night.push({ recipes: L.recipes || [], pairs: L.run.map((u) => P.cardOf(run, u)).filter((c) => c.tags.length >= 2).map((c) => c.tags.slice(0, 2).sort((a, b) => D.WHEEL.indexOf(a) - D.WHEEL.indexOf(b)).join('+')), mains: L.run.map((u) => P.cardOf(run, u).tags[0]) }));
    const of = P.offers(run); const a = of.find((o) => o.type === 'colab') || of[0]; P.takeOffer(run, a);
    const rest = of.filter((o) => o !== a); const b2 = rest.find((o) => o.type === 'level') || rest[0]; if (b2) P.takeOffer(run, b2);
    const rw = P.rewards(run); if (rw.cards && rw.cards[0]) P.takeCard(run, rw.cards[0]);
  }
  out.push(night);
}
// 收集曲線
const seenP = new Set(), seenR = new Set(), curve = [], mains = {};
out.forEach((night, k) => { night.forEach((s) => { s.pairs.forEach((p) => seenP.add(p)); s.recipes.forEach((r) => seenR.add(r)); s.mains.forEach((m) => mains[m] = (mains[m] || 0) + 1); }); curve.push([k + 1, seenP.size, seenR.size]); });
const tot = Object.values(mains).reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ bal: BAL, curve: curve.filter((c) => [1, 2, 3, 5, 10, 20, 30, 40].includes(c[0])), mains: Object.fromEntries(Object.entries(mains).map(([k, v]) => [k, Math.round(100 * v / tot)])) }));
