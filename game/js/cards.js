// 《靈感撤離 2080》第十六期：卡的來歷、回憶、作品記錄與遺物規則（WO-16-01）。
// 純邏輯，不涉及 DOM，瀏覽器與 Node 共用；只在五輪模式（s.mode === 'rounds'）生效。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA;

  function deckMax(s) {
    const bg = s && D.BACKGROUNDS && D.BACKGROUNDS[s.bg];
    return (bg && bg.perk && bg.perk.deckMax) || D.CRAFT.deckMax;
  }

  // 由 { kind, x, npc } 組成完整的來歷物件；空值時回傳 null
  function origin(s, o) {
    if (!o || !o.kind) return null;
    const night = o.night != null ? o.night : ((s && s.night) || 0);
    const tpl = (D.ORIGIN && D.ORIGIN[o.kind]) || '';
    const text = o.text != null
      ? String(o.text)
      : tpl.replace(/\{n\}/g, String(night)).replace(/\{x\}/g, o.x != null ? String(o.x) : '');
    return {
      kind: o.kind,
      night,
      text,
      npc: o.npc || null,
    };
  }

  // 相容舊存檔：補齊 s.memory、s.over，以及每張卡的 works、relic、from（來歷）
  function ensure(s) {
    if (!s) return s;
    if (!Array.isArray(s.memory)) s.memory = [];
    if (typeof s.over !== 'boolean') s.over = false;
    const isRounds = s.mode === 'rounds';
    if (Array.isArray(s.cards)) {
      s.cards.forEach((c) => {
        if (!c) return;
        if (!Array.isArray(c.works)) c.works = [];
        if (typeof c.relic !== 'boolean') c.relic = false;
        if (isRounds && c.from === undefined) c.from = null;
      });
    }
    return s;
  }

  // 把一張卡由素材庫移進回憶（遺物不可放下）；回到上限或以下時清除 s.over
  function putDown(s, uid) {
    if (!s) return { ok: false, msg: '找不到這張素材' };
    ensure(s);
    const idx = s.cards.findIndex((c) => c && c.uid === uid);
    if (idx < 0) return { ok: false, msg: '找不到這張素材' };
    const card = s.cards[idx];
    if (card.relic) return { ok: false, msg: D.CARD_TEXT.relicKeep };
    s.cards.splice(idx, 1);
    s.memory.push(card);
    if (s.cards.length <= deckMax(s)) s.over = false;
    return { ok: true, card };
  }

  // 模擬器與 IE.Auto 使用：超過上限時按舊自動丟棄規則選非遺物的卡放進回憶
  function autoPutDown(s) {
    if (!s || s.mode !== 'rounds') return [];
    ensure(s);
    const moved = [];
    const max = deckMax(s);
    if (s.cards.length <= max) {
      s.over = false;
      return moved;
    }
    s.over = true;
    while (s.over && s.cards.length > max) {
      const pool = s.cards.filter((c) => c && !c.relic);
      if (!pool.length) break;
      const candidates = pool.length > 1 && pool[pool.length - 1] === s.cards[s.cards.length - 1]
        ? pool.slice(0, -1)
        : pool;
      let worst = candidates[0];
      for (let i = 1; i < candidates.length; i++) {
        const c = candidates[i];
        if ((c.wear || 0) > (worst.wear || 0) || ((c.wear || 0) === (worst.wear || 0) && c.value < worst.value && (c.wear || 0) > 0)) {
          worst = c;
        }
      }
      const res = putDown(s, worst.uid);
      if (!res.ok) break;
      moved.push(res.card);
    }
    return moved;
  }

  // 夜晚打出具名組合時，把作品名記在計分卡的 works（不重複，最多 3 個，最新在最後）
  function noteWork(s, uids, title) {
    if (!s || !title || !Array.isArray(uids) || !uids.length) return;
    ensure(s);
    const set = new Set(uids);
    s.cards.forEach((c) => {
      if (!c || !set.has(c.uid)) return;
      if (!Array.isArray(c.works)) c.works = [];
      if (c.works.includes(title)) return;
      c.works.push(title);
      while (c.works.length > 3) c.works.shift();
    });
  }

  // 朋友被收藏時，把該位朋友送的卡標記為遺物並回傳
  function relics(s, npcId) {
    if (!s || !npcId) return [];
    ensure(s);
    const out = [];
    s.cards.forEach((c) => {
      if (c && c.from && c.from.npc === npcId) {
        c.relic = true;
        out.push(c);
      }
    });
    return out;
  }

  IE.Cards = {
    origin,
    putDown,
    autoPutDown,
    noteWork,
    relics,
    ensure,
  };
});
