// 《靈感撤離 2080》第十七期：浮城年表、舊城打撈、沉積結算、收藏冊總覽、白天的舊城情報（介面）。
// 只產生 HTML 和讀局面；規則在 chapters.js、salvage.js、rounds.js。
(function (IE) {
  'use strict';
  const D = () => IE.DATA;
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // 圖片路徑要相對於頁面（CSS 變數裏的相對路徑會被當作相對於樣式檔），所以換成絕對路徑
  const art = (name) => {
    const rel = (IE.NightScene ? IE.NightScene.base() : 'art/') + name + '.webp';
    try { return new URL(rel, document.baseURI).href; } catch (e) { return rel; }
  };
  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // ---------- 浮城年表 ----------
  function chapterPanel(meta, sel) {
    const CH = IE.Chapters, T = D().CHAPTER_TEXT;
    const items = CH.list(meta).map((c) => {
      const st = c.status;
      const stTxt = st === 'cleared' ? T.cleared + (c.clears > 1 ? ' ×' + c.clears : '') : st === 'locked' ? '🔒' : st === 'building' ? '🚧' : (c.tries ? T.current : '');
      const why = st === 'locked' ? T.locked : st === 'building' ? T.building : '';
      const can = st === 'open' || st === 'cleared';
      return '<button type="button" class="era-ch st-' + st + (sel === c.id ? ' sel' : '') + '" data-do="chapter" data-id="' + c.id + '"' + (can ? '' : ' disabled') + ' style="--sky:url(\'' + esc(art(c.sky)) + '\')">'
        + '<span class="era-sky" aria-hidden="true"></span>'
        + '<span class="era-txt">'
        + '<span class="era-no">第 ' + c.no + ' 季・' + esc(c.year) + '</span>'
        + '<b class="era-name">' + esc(c.name) + '</b>'
        + '<span class="era-sp">' + esc(T.species.replace('{species}', c.species).replace('{org}', c.org)) + '</span>'
        + '<span class="era-intro">' + esc(c.intro) + '</span>'
        + '<span class="era-adds">' + esc(T.adds.replace('{x}', c.adds)) + '</span>'
        + (why ? '<span class="era-why">' + esc(why) + '</span>' : '<span class="era-len num">' + esc(T.length.replace('{r}', c.rounds).replace('{n}', c.rounds * 3)) + '</span>')
        + '</span>'
        + (stTxt ? '<span class="era-st">' + esc(stTxt) + '</span>' : '')
        + '</button>';
    }).join('');
    const free = CH.freeUnlocked(meta);
    const freeBtn = '<button type="button" class="era-ch era-free st-' + (free ? 'open' : 'locked') + (sel === 'free' ? ' sel' : '') + '" data-do="chapter" data-id="free"' + (free ? '' : ' disabled') + ' style="--sky:url(\'' + esc(art('np-sky-anger-2')) + '\')">'
      + '<span class="era-sky" aria-hidden="true"></span>'
      + '<span class="era-txt"><span class="era-no">自由模式</span><b class="era-name">' + esc(T.free) + '</b><span class="era-intro">' + esc(T.freeDesc) + '</span></span>'
      + (free ? '' : '<span class="era-st">🔒</span>') + '</button>';
    return '<div class="modal wide era-map">'
      + '<span class="eyebrow">' + esc(T.head) + '</span><h2>' + esc(T.head) + '</h2>'
      + '<p class="era-lede">' + esc(T.sub) + '</p>'
      + '<div class="era-list">' + items + freeBtn + '</div>'
      + '<div class="btn-row"><button class="btn" type="button" data-do="close">' + esc(T.back) + '</button></div>'
      + '</div>';
  }
  // 開局頁的一行：現在選了哪一季
  function chapterChip(meta, sel) {
    const T = D().CHAPTER_TEXT;
    const c = sel && sel !== 'free' ? IE.Chapters.get(sel) : null;
    const txt = c ? '第 ' + c.no + ' 季・' + c.name : T.free;
    const sub = c ? T.length.replace('{r}', c.rounds).replace('{n}', c.rounds * 3) + '・' + c.species : '完整的一年';
    return '<div class="su-opt su-era"><span class="lbl">' + esc(T.head) + '</span>'
      + '<button type="button" class="era-pick" data-do="era" style="--sky:url(\'' + esc(art(c ? c.sky : 'np-sky-anger-2')) + '\')"><b>' + esc(txt) + '</b><small>' + esc(sub) + '</small><span class="era-pick-go">換一季 ›</span></button></div>';
  }

  // ---------- 舊城打撈 ----------
  function salvagePanel(meta, selId) {
    const SV = IE.Salvage, T = D().SALVAGE_TEXT;
    const bal = SV.balance(meta);
    const dists = SV.districts().map((d) => {
      const nodes = d.nodes.map((n) => {
        const own = SV.owned(meta, n.id);
        const c = SV.canBuy(meta, n.id);
        const prevOk = n.tier === 0 || SV.owned(meta, d.nodes[n.tier - 1].id);
        const cls = own ? 'is-owned' : prevOk ? (c.ok ? 'is-next' : 'is-poor') : 'is-locked';
        return '<li><button type="button" class="salv-n ' + cls + (selId === n.id ? ' sel' : '') + (n.info ? ' is-info' : '') + '" data-do="node" data-id="' + n.id + '" aria-pressed="' + (selId === n.id) + '">'
          + '<i class="salv-lamp" aria-hidden="true"></i>'
          + '<span class="salv-nm">' + esc(n.name) + '</span>'
          + '<span class="salv-cost num">' + (own ? '✓' : n.cost) + '</span>'
          + '</button></li>';
      }).join('');
      const got = d.nodes.filter((n) => SV.owned(meta, n.id)).length;
      return '<section class="salv-d"><h3>' + esc(d.name) + '<small>' + esc(d.line) + '</small><span class="num">' + got + '/' + d.nodes.length + '</span></h3><ol class="salv-chain">' + nodes + '</ol></section>';
    }).join('');
    let detail = '<p class="salv-empty">' + esc(bal || SV.ownedCount(meta) ? '選一盞燈，看看水底有甚麼。' : T.empty) + '</p>';
    const n = selId ? SV.get(selId) : null;
    if (n) {
      const own = SV.owned(meta, n.id);
      const c = SV.canBuy(meta, n.id);
      const dist = D().SALVAGE.find((x) => x.id === n.district);
      detail = '<div class="salv-sel"><span class="eyebrow">' + esc(dist ? dist.name : '') + '・第 ' + (n.tier + 1) + ' 層' + (n.info ? '・' + esc(T.infoTag) : '') + '</span>'
        + '<b>' + esc(n.name) + '</b><p>' + esc(SV.describe(n)) + '</p>'
        + (own ? '<span class="salv-own">' + esc(T.bought) + '</span>'
          : '<button type="button" class="btn primary" data-do="buy" data-id="' + n.id + '"' + (c.ok ? '' : ' disabled') + '>' + esc(T.buy) + '・<span class="num">' + n.cost + '</span> ' + esc(T.unit) + '</button>'
            + (c.ok ? '' : '<span class="act-why">' + esc(c.msg) + '</span>'))
        + '</div>';
    }
    return '<div class="modal wide salv">'
      + '<div class="salv-bg" aria-hidden="true" style="--bg1:url(\'' + esc(art('np-far-drowned')) + '\');--bg2:url(\'' + esc(art('np-sky-water-2')) + '\')"></div>'
      + '<div class="salv-head"><div><span class="eyebrow">' + esc(T.head) + '</span><h2>' + esc(T.head) + '</h2><p class="salv-sub">' + esc(T.sub) + '</p></div>'
      + '<div class="salv-bal"><small>' + esc(T.unit) + '</small><b class="num">' + fmt(bal) + '</b><small>' + SV.ownedCount(meta) + ' / ' + SV.NODES.length + '</small></div></div>'
      + '<div class="salv-grid">' + dists + '</div>'
      + '<div class="salv-detail" aria-live="polite">' + detail + '</div>'
      + '<div class="btn-row"><button class="btn" type="button" data-do="close">' + esc(D().CHAPTER_TEXT.back) + '</button></div>'
      + '</div>';
  }

  // ---------- 一生結束：沉下去的沉積 ----------
  function earnModal(res, chRes, meta) {
    const T = D().SALVAGE_TEXT, CT = D().CHAPTER_TEXT;
    const lines = (res.lines || []).map((l) => '<li><span>' + esc(l.text) + '</span><span class="v num">+' + l.v + '</span></li>').join('');
    let chHtml = '';
    if (chRes && chRes.firstClear && chRes.cleared) chHtml += '<p class="earn-ch">' + esc(CT.clearedNow.replace('{x}', chRes.cleared.name)) + ' ' + esc(chRes.cleared.clear || '') + '</p>';
    if (chRes && chRes.next) chHtml += '<p class="earn-unlock">' + esc(CT.unlocked.replace('{x}', '第 ' + chRes.next.no + ' 季・' + chRes.next.name)) + '</p>';
    if (chRes && chRes.free) chHtml += '<p class="earn-unlock">' + esc(CT.unlocked.replace('{x}', CT.free)) + '</p>';
    return '<div class="modal salv-earn">'
      + '<div class="salv-bg" aria-hidden="true" style="--bg1:url(\'' + esc(art('np-far-drowned')) + '\');--bg2:url(\'' + esc(art('np-sky-water-1')) + '\')"></div>'
      + '<span class="eyebrow">' + esc(T.earnHead) + '</span>'
      + '<h2 class="earn-total">' + esc(T.earnTotal.replace('{n}', res.total)) + '</h2>'
      + '<ul class="lines earn-lines">' + lines + '</ul>'
      + chHtml
      + '<p class="mute">' + esc(T.balance.replace('{n}', fmt(IE.Salvage.balance(meta)))) + '</p>'
      + '<div class="btn-row"><button class="btn primary" type="button" data-do="salvage">' + esc(T.go) + '</button><button class="btn" type="button" data-do="ok">繼續</button></div>'
      + '</div>';
  }

  // ---------- 每輪開始的打撈包 ----------
  function salvagePackModal(s, pk) {
    const cards = (pk.uids || []).map((u) => s.cards.find((c) => c.uid === u)).filter(Boolean);
    return '<div class="modal wide pk-modal">'
      + '<span class="eyebrow">' + esc(D().SALVAGE_TEXT.head) + '</span>'
      + '<h2>沉船貨櫃</h2>'
      + '<p class="mute">' + esc(D().SALVAGE_TEXT.roundPack) + '</p>'
      + (IE.PackFx ? IE.PackFx.html(s, cards, { kind: 'salvage' }) : '')
      + '<div class="btn-row"><button class="btn primary" type="button" data-do="ok">' + esc(D().PACK16.done) + '</button></div>'
      + '</div>';
  }

  // ---------- 白天面板：舊城的情報 ----------
  function dayExtras(s) {
    const sv = s.salvage || {};
    const T = D().SALVAGE_TEXT;
    const out = [];
    const RD = IE.Rounds;
    if (sv.floodForecast && IE.Flood && IE.Flood.forecast) {
      const f = IE.Flood.forecast(s);
      const stName = { dry: '安全', warn: '預警', light: '輕微滲漏', medium: '水會帶走東西', heavy: '失去住所' };
      if (f) out.push('<div class="era-intel">' + esc(T.forecast.replace('{w}', f.water.toFixed(1)).replace('{stage}', stName[f.stage] || f.stage)) + '</div>');
    }
    if (sv.soulWarn && s.soul > IE.Rules.soulLimit(s) - 2) out.push('<div class="era-intel warn">' + esc(T.soulWarn) + '</div>');
    if (sv.reviewPreview && RD.reviewPreview) {
      const p = RD.reviewPreview(s);
      if (p) out.push('<div class="era-intel">' + esc(T.reviewPreview.replace('{rent}', RD.cash(s, p.rent)).replace('{rentOk}', p.rentOk ? T.ok : T.short).replace('{soul}', (p.soul || 0).toFixed(1)).replace('{soulOk}', p.soulOk ? T.soulOk : T.soulOver)) + '</div>');
    }
    if (sv.judgeImpact && IE.Stages && IE.Stages.bossesFor && (!IE.Chapters || IE.Chapters.feat(s, 'judge'))) {
      const q = RD.roundOf(s) - 1;
      const rules = IE.Stages.bossesFor(s, q);
      const hits = rules.map((b) => {
        const f = b.block || b.forbid;
        if (!f) return null;
        const n = s.cards.filter((c) => { try { return f(c); } catch (e) { return false; } }).length;
        return n ? b.name + '：' + T.impact.replace('{n}', n) : null;
      }).filter(Boolean);
      if (hits.length) out.push('<div class="era-intel">翻譯機：' + esc(hits.join('；')) + '</div>');
    }
    if (RD.canConfess && RD.canConfess(s)) out.push('<button type="button" class="btn era-confess" data-do="confess">' + esc(T.confessBtn) + '<small>靈魂 −1 克・火花 −0.2</small></button>');
    return out.length ? '<div class="era-intels">' + out.join('') + '</div>' : '';
  }

  // ---------- 收藏冊總覽 ----------
  function collectionOverview(meta) {
    const D_ = D();
    const seen = meta.cardsSeen || {};
    const allCards = Object.keys(D_.CARDS).concat(D_.DESK_IDS || []);
    const total = allCards.length;
    const got = allCards.filter((id) => seen[id]).length;
    const foil = allCards.filter((id) => seen[id] === 2).length;
    const recipes = D_.RECIPES ? D_.RECIPES.length : 0;
    const recGot = meta.recipes ? Object.keys(meta.recipes).length : 0;
    const ach17 = meta.ach17 ? Object.keys(meta.ach17).length : 0;
    const chs = IE.Chapters ? IE.Chapters.LIST.filter((c) => !c.building) : [];
    const chGot = chs.filter((c) => meta.chapters && meta.chapters.cleared && meta.chapters.cleared[c.id]).length;
    const row = (name, a, b) => {
      const p = b ? Math.round(a / b * 100) : 0;
      return '<div class="col-row"><span class="col-k">' + esc(name) + '</span><span class="col-bar"><i style="width:' + Math.min(100, p) + '%"></i></span><span class="col-v num">' + a + ' / ' + b + '</span></div>';
    };
    const achList = (D_.ACH17 || []).map((a) => '<li class="' + (meta.ach17 && meta.ach17[a.id] ? 'got' : '') + '"><b>' + esc(meta.ach17 && meta.ach17[a.id] ? a.name : '？？？') + '</b><small>' + esc(a.desc) + '</small></li>').join('');
    return '<section class="col-over"><h3>收藏冊</h3>'
      + row('素材', got, total)
      + row('閃卡', foil, total)
      + row('具名組合', recGot, recipes)
      + row('浮城年表', chGot, chs.length)
      + row('舊城打撈', IE.Salvage ? IE.Salvage.ownedCount(meta) : 0, IE.Salvage ? IE.Salvage.NODES.length : 0)
      + row('第十七期成就', ach17, (D_.ACH17 || []).length)
      + '<ul class="col-ach">' + achList + '</ul>'
      + '</section>';
  }

  IE.EraUI = { chapterPanel, chapterChip, salvagePanel, earnModal, salvagePackModal, dayExtras, collectionOverview };
})(window.IE = window.IE || {});
