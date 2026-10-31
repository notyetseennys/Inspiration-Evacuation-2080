// 朋友的對話（第十期）：按熟絡度、近況和天氣，從 data-talk.js 組合三句。
// 只影響文字，所以用 Math.random，不動遊戲的亂數（每日挑戰的結果不受影響）。
(function (IE) {
  'use strict';
  const D = () => IE.DATA, R = () => IE.Rules;
  const one = (a) => a[Math.floor(Math.random() * a.length)];
  const recent = [];
  // 盡量不重複最近說過的話
  function fresh(arr) {
    for (let k = 0; k < 6; k++) { const t = one(arr); if (!recent.includes(t)) return t; }
    return one(arr);
  }
  function lines(s, id) {
    const T = D().TALK && D().TALK[id];
    if (!T) return [];
    const SH = D().NPC_SHORT;
    const n = s.npcs.find((x) => x.id === id) || { friend: 0 };
    const others = s.npcs.filter((x) => x.alive && x.id !== id).map((x) => SH[x.id]);
    const gone = s.npcs.filter((x) => !x.alive).map((x) => SH[x.id]);
    const w = R().weatherOf ? R().weatherOf(s) : null;
    const taken = gone.length ? one(gone) : '';
    const fill = (t) => t.replace(/\{other\}/g, others.length ? one(others) : '大家').replace(/\{taken\}/g, taken).replace(/\{w\}/g, w ? w.name : '天氣').replace(/\{day\}/g, s.day);
    const out = [fresh(n.friend >= 4 ? T.close : n.friend >= 2 ? T.mid : T.new)];
    // 近況：挑最要緊的一件；沒有就談天氣
    const sit = [];
    if (gone.length && Math.random() < 0.5) sit.push(T.missing);
    if (s.body < 30) sit.push(T.hurt);
    if (s.spark < 1.3) sit.push(T.tired);
    if (s.soul > 17) sit.push(T.heavy);
    if (s.cr < 40) sit.push(T.broke);
    if (s.cr > 900) sit.push(T.rich);
    if (IE.Stages && IE.Stages.today && IE.Stages.today(s)) sit.push(T.stage);
    if (R().reviewDay(s) - s.day <= 2) sit.push(T.review);
    const wl = w && D().WEATHER_TALK[w.id];
    if (sit.length && Math.random() < 0.75) out.push(fill(fresh(one(sit))));
    else if (wl) out.push(wl);
    // 話題或八卦
    out.push(fill(others.length && Math.random() < 0.3 ? fresh(D().TALK_GOSSIP) : fresh(T.topics)));
    out.forEach((t) => { recent.push(t); if (recent.length > 40) recent.shift(); });
    return out;
  }
  IE.Talk = { lines };
})(window.IE = window.IE || {});
