// 《靈感撤離 2080》第十七期：浮城年表（章節）。純邏輯，瀏覽器和 Node 共用。
// 一局（一生）屬於一章：章節決定有幾輪、開放哪些系統、市集有哪些物件。沒有章節（s.chapter 為 null）＝完整的五輪模式（「全城篩選」）。
// 跨局的紀錄在 meta.chapters：{ cleared: { c1: 次數 }, tries: { c1: 次數 }, legacy: 布林 }。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA;
  const LIST = D.CHAPTERS || [];
  const BY = {};
  LIST.forEach((c) => { BY[c.id] = c; });

  const get = (id) => BY[id] || null;
  const of = (s) => (s && s.chapter && BY[s.chapter]) || null;
  const roundsMode = (s) => !!(s && D.MODES && D.MODES[s.mode] && D.MODES[s.mode].rounds);

  // 這一局有沒有這個系統：沒有章節＝全部都有；經典模式不受章節影響
  function feat(s, key) {
    if (!roundsMode(s)) return true;
    const c = of(s);
    return c ? c.feats.includes(key) : true;
  }
  const rounds = (s) => { const c = roundsMode(s) ? of(s) : null; return c ? c.rounds : 5; };
  const nights = (s) => rounds(s) * 3;
  // 市集和遺物攤的物件：章節限制稀有度
  function objAllowed(s, o) {
    if (!roundsMode(s) || !o) return true;
    const c = of(s);
    return c ? c.objRarity.includes(o.rarity) : true;
  }

  // ---------- 跨局 ----------
  const cleared = (meta) => (meta && meta.chapters && meta.chapters.cleared) || {};
  const legacy = (meta) => !!(meta && meta.chapters && meta.chapters.legacy);
  // 舊玩家（章節出現之前已經玩過）：全城篩選一開始就開放
  function migrate(meta) {
    if (!meta) return meta;
    if (!meta.chapters) meta.chapters = { cleared: {}, tries: {}, legacy: (meta.runs || 0) > 0 };
    meta.chapters.cleared = meta.chapters.cleared || {};
    meta.chapters.tries = meta.chapters.tries || {};
    return meta;
  }
  function unlocked(meta, id) {
    const c = get(id);
    if (!c || c.building) return false;
    if (c.no === 1) return true;
    const prev = LIST[c.no - 2];
    return !!(prev && cleared(meta)[prev.id]);
  }
  const freeUnlocked = (meta) => legacy(meta) || !!cleared(meta).c4;
  function status(meta, id) {
    const c = get(id);
    if (!c) return 'locked';
    if (c.building) return 'building';
    if (cleared(meta)[id]) return 'cleared';
    return unlocked(meta, id) ? 'open' : 'locked';
  }
  function list(meta) {
    return LIST.map((c) => Object.assign({}, c, { status: status(meta, c.id), clears: cleared(meta)[c.id] || 0, tries: (meta && meta.chapters && meta.chapters.tries && meta.chapters.tries[c.id]) || 0 }));
  }
  // 開局頁預設選哪一章：最早一個開放而未通過的；全部通過就選最後一個開放的
  function defaultFor(meta) {
    const open = LIST.filter((c) => unlocked(meta, c.id));
    const fresh = open.find((c) => !cleared(meta)[c.id]);
    return (fresh || open[open.length - 1] || LIST[0]).id;
  }
  // 一局結束：記錄嘗試和通過；回傳 { firstClear, next }（next 是這次新開放的一章）
  function record(meta, s, endingKind) {
    if (!meta || !s || !roundsMode(s) || !s.chapter) return { firstClear: false, next: null };
    migrate(meta);
    const id = s.chapter;
    meta.chapters.tries[id] = (meta.chapters.tries[id] || 0) + 1;
    if (endingKind !== 'recruited') return { firstClear: false, next: null };
    const first = !meta.chapters.cleared[id];
    meta.chapters.cleared[id] = (meta.chapters.cleared[id] || 0) + 1;
    const c = get(id);
    const nx = c ? LIST[c.no] : null;
    const next = first && nx ? nx : null;
    return { firstClear: first, next, free: first && id === 'c4' };
  }

  IE.Chapters = { LIST, get, of, feat, rounds, nights, objAllowed, migrate, unlocked, freeUnlocked, status, list, defaultFor, record };
});
