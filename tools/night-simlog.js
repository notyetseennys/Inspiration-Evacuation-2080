// 創作之夜：用第四版的規則（proto/night4/engine.js）模擬多晚，記下每一晚的四筆，
// 給 tools/art-night-compose.py 組畫和統計素材用量。
// 每一筆記下：計分的素材（id、情緒、媒材）、角色、結構、題材、出過手的夥伴、具名組合。
// 機械人每筆隨機試 40 個次序，取分數最高的；收工時先邀夥伴，再進修，再拿第一張新素材。
// 用法：node tools/night-simlog.js [局數，預設 30] > 出牌記錄.json（每局三晚）
const path = require('path');
const root = path.join(__dirname, '..');
['data.js', 'data-craft.js', 'data-chars.js', 'data-schools.js'].forEach((f) => require(path.join(root, 'game/js', f)));
require(path.join(root, 'proto/night4/engine.js'));
const P = globalThis.IE.Proto2;
const N = Number(process.argv[2] || 30), K = 40;
const BGS = ['copywriter', 'artist', 'musician'];
function randSeq(r, hand) { const h = hand.slice(); for (let i = h.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [h[i], h[j]] = [h[j], h[i]]; } return h.slice(0, 2 + Math.floor(r() * 4)); }
function bestPlay(run) {
  const hand = run.cur.hand; let best = null;
  for (let i = 0; i < K; i++) { const u = randSeq(run.r, hand); const s = P.score(run, u); if (!best || s.total > best.total) best = { u, total: s.total }; }
  return best;
}
const out = [];
for (let seed = 1; seed <= N; seed++) {
  const bg = BGS[seed % BGS.length];
  let run;
  try { run = P.newRun(seed, { bg }); } catch (e) { run = P.newRun(seed, {}); }
  for (let night = 0; night < 3; night++) {
    run.night = night;
    const n = P.startNight(run); n.target = 1e12;
    while (n.plays > 0) { const b = bestPlay(run); P.play(run, b.u); }
    const strokes = n.log.map((L) => ({
      id: L.id, roles: L.roles, total: L.total,
      cards: L.run.map((u) => { const c = P.cardOf(run, u); return { uid: u, id: c.id, name: c.name, tags: c.tags, medium: c.medium }; }),
      subject: L.subject ? { main: L.subject.main, second: L.subject.second, name: L.subject.name } : null,
      colabs: L.colabs || [], recipes: L.recipes || [],
    }));
    out.push({ seed, night, bg: run.bg, style: run.nightDefs[night].style, colabs: run.colabs.slice(), strokes });
    const of = P.offers(run);
    const a = of.find((o) => o.type === 'colab') || of[0]; P.takeOffer(run, a);
    const rest = of.filter((o) => o !== a); const b2 = rest.find((o) => o.type === 'level') || rest[0]; if (b2) P.takeOffer(run, b2);
    const rw = P.rewards(run); if (rw.cards && rw.cards[0]) P.takeCard(run, rw.cards[0]);
  }
}
process.stdout.write(JSON.stringify(out));
