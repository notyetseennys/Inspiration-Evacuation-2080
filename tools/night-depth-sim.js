// 創作之夜第五版：玩法的深度和難度。每手牌列舉全部次序，看「最好」和「一般」差幾多；三晚的分數來源；高手的通過率
const path = require('path');
const root = path.join(__dirname, '..');
['data.js', 'data-craft.js', 'data-chars.js', 'data-schools.js', '../../proto/night5/deck.js'].forEach((f) => require(path.join(root, 'game/js', f)));
require(path.join(root, 'proto/night5/engine.js'));
const P = globalThis.IE.Proto2;
function seqs(hand, max) { const out = []; const rec = (cur, used) => { if (cur.length) out.push(cur.slice()); if (cur.length === max) return; hand.forEach((u) => { if (used.has(u)) return; used.add(u); cur.push(u); rec(cur, used); cur.pop(); used.delete(u); }); }; rec([], new Set()); return out; }
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
const N = Number(process.argv[2] || 12);
const stat = [0, 1, 2].map(() => ({ ratio: [], near: [], bestId: {}, total: [], first: [], lens: {}, src: { colab: 0, recipe: 0, he: 0, zhuan: 0, level: 0, compound: 0, subject: 0, rule: 0 } }));
for (let seed = 1; seed <= N; seed++) {
  const run = P.newRun(seed * 7, { bg: ['copywriter', 'busker', 'animator'][seed % 3] });
  for (let ni = 0; ni < 3; ni++) {
    run.night = ni; const n = P.startNight(run); const T = n.target; n.target = 1e12; let sum = 0, k = 0;
    while (n.plays > 0) {
      const all = seqs(n.hand, n.maxCards).map((u) => ({ u, s: P.score(run, u) }));
      const tot = all.map((x) => x.s.total); const best = all.reduce((a, b) => (b.s.total > a.s.total ? b : a));
      const st = stat[ni];
      st.ratio.push(best.s.total / Math.max(1, q(tot, 0.5))); st.near.push(tot.filter((t) => t >= 0.8 * best.s.total).length / tot.length);
      st.bestId[best.s.id] = (st.bestId[best.s.id] || 0) + 1; st.lens[best.u.length] = (st.lens[best.u.length] || 0) + 1;
      best.s.steps.forEach((x) => { const key = x.t === 'link' ? (x.kind === 'zhuan' ? 'zhuan' : null) : x.t; if (key && st.src[key] != null && (x.xmult || x.mult || x.chips)) st.src[key]++; });
      if (k++ === 0) st.first.push(best.s.total / T);
      P.play(run, best.u); sum += best.s.total;
    }
    stat[ni].total.push(sum / T);
    const of = P.offers(run); const a = of.find((o) => o.type === 'colab') || of[0]; P.takeOffer(run, a);
    const b2 = of.filter((o) => o !== a).find((o) => o.type === 'level'); if (b2) P.takeOffer(run, b2);
    const rw = P.rewards(run); if (rw.cards[0]) P.takeCard(run, rw.cards[0]);
  }
}
stat.forEach((s, i) => {
  console.log('第 ' + (i + 1) + ' 晚（試遍所有次序的高手）：總分是目標的 中位 ' + q(s.total, 0.5).toFixed(1) + ' 倍（最低 ' + q(s.total, 0).toFixed(1) + '）；通過 ' + Math.round(100 * s.total.filter((x) => x >= 1).length / s.total.length) + '%；第一筆已達目標的 ' + Math.round(100 * s.first.filter((x) => x >= 1).length / s.first.length) + '%');
  console.log('   最好的一筆 ÷ 一般的一筆（中位數次序）= ' + q(s.ratio, 0.5).toFixed(1) + ' 倍；達到最好的八成的次序只佔 ' + (100 * q(s.near, 0.5)).toFixed(2) + '%');
  console.log('   最好一筆的結構 ' + JSON.stringify(s.bestId) + ' 張數 ' + JSON.stringify(s.lens));
});
