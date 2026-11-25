// 《靈感撤離 2080》第十七期：撕開（介面）。每一次得到素材，都是一個要用手指撕開的包。
// html(s, cards, opts) 產生封好的包；bind(root) 令裏面的包可以撕開。只讀局面，不改規則。
(function (IE) {
  'use strict';
  const D = () => IE.DATA;
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = () => !!(IE.Pixel && IE.Pixel.reducedMotion) || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const sfx = (k) => { try { if (IE.Audio && IE.Audio.sfx) IE.Audio.sfx(k); } catch (e) { /* 沒有聲音也可以 */ } };
  const meta = () => (IE.Game && IE.Game.meta) || {};

  function kindOf(cards, fallback) {
    const k = fallback || (cards[0] && cards[0].from && cards[0].from.kind) || 'shop';
    return D().PACK16.kinds[k] ? k : 'shop';
  }
  // 一張卡的正面：真的圖（沒有美術包就用情緒的顏色）、名字、情緒、星級、徽章、來歷
  function cardFace(s, c, i, o) {
    const D_ = D(), P = D_.PACK16;
    const t0 = c.tags[0], t1 = c.tags[1] || t0;
    const col = (t) => (t && D_.TAGS[t] && D_.TAGS[t].color) || '#37c3d6';
    const art = IE.Desk && IE.Desk.artOf ? IE.Desk.artOf(c) : null;
    const hasArt = !!(D_.ART && D_.ART.a && art && D_.ART.a[art.face] && IE.NightScene);
    const im = hasArt ? '<img class="pk-im' + (art.flip ? ' flip' : '') + '" src="' + esc(IE.NightScene.base() + art.face + '.webp') + '" alt="" draggable="false" loading="lazy">' : '';
    const star = IE.Create && IE.Create.starOf ? IE.Create.starOf(c) : (c.star || 1);
    const tags = c.tags.slice(0, 2).filter((t) => D_.TAGS[t]).map((t) => '<i style="--c:' + col(t) + '">' + esc(D_.TAGS[t].name) + '</i>').join('');
    const seen = meta().cardsSeen || {};
    const isNew = !!(c.id && !seen[c.id]) && !o.noNew;
    const isDup = !!(c.echo && s && c.echo.night === s.night && o.dup !== false);
    const badges = (isNew ? '<span class="pk-b b-new">' + esc(P.badge.new) + '</span>' : '')
      + (c.foil ? '<span class="pk-b b-foil">' + esc(P.badge.foil) + '</span>' : '')
      + (isDup ? '<span class="pk-b b-dup">' + esc(P.badge.dup) + ' ★' + c.echo.from + '→★' + c.echo.to + '</span>' : '');
    const from = isDup ? P.dupLine.replace('{n}', c.echo.to) : (c.foil ? P.foilLine : ((c.from && c.from.text) || ''));
    return '<div class="pk-card' + (c.foil ? ' is-foil' : '') + (isNew ? ' is-new' : '') + (isDup ? ' is-dup' : '') + '" style="--m1:' + col(t0) + ';--m2:' + col(t1) + ';--i:' + i + '">'
      + '<div class="pk-face">' + im + '<span class="pk-stars s' + star + '">' + '★'.repeat(star) + '</span></div>'
      + '<div class="pk-body"><b class="pk-name">' + esc(c.name) + '</b><span class="pk-tags">' + tags + '</span></div>'
      + (badges ? '<div class="pk-badges">' + badges + '</div>' : '')
      + (from ? '<p class="pk-from">' + esc(from) + '</p>' : '')
      + '</div>';
  }
  // 封好的包。cardsHtml 可以由外面提供（例如市集的「選一張」按鈕）
  function html(s, cards, opts) {
    const o = opts || {};
    const P = D().PACK16;
    const kind = kindOf(cards, o.kind);
    const K = P.kinds[kind];
    const inner = o.cardsHtml || cards.map((c, i) => cardFace(s, c, i, o)).join('');
    const n = o.count != null ? o.count : cards.length;
    return '<div class="pk k-' + kind + (o.cls ? ' ' + o.cls : '') + '" data-kind="' + kind + '">'
      + '<button type="button" class="pk-seal" aria-label="' + esc(P.tear + '：' + K.name) + '">'
      + '<span class="pk-flap" aria-hidden="true"></span>'
      + '<span class="pk-tearline" aria-hidden="true"><i></i></span>'
      + '<span class="pk-label"><b>' + esc(K.name) + '</b><small>' + esc(K.line) + '</small></span>'
      + (n > 1 ? '<span class="pk-count num">×' + n + '</span>' : '')
      + '<span class="pk-hint">' + esc(P.tearHint) + '</span>'
      + '</button>'
      + '<div class="pk-cards' + (o.gridCls ? ' ' + o.gridCls : '') + '">' + inner + '</div>'
      + '</div>';
  }
  // 卡包的機率（市集素材包）：星級的機會、閃卡的機會、可能有的情緒
  function oddsHtml(s, pdef) {
    const D_ = D(), P = D_.PACK16;
    const stars = (D_.ECON.packStars || []).map((p, i) => P.oddsStar.replace('{n}', i + 1).replace('{p}', Math.round(p * 100) + '%')).join('　');
    const foil = P.foil * (1 + ((s && s.salvage && s.salvage.foilX) || 0));
    const pool = pdef && pdef.tags ? pdef.tags.map((t) => (D_.TAGS[t] ? D_.TAGS[t].name : t)).join('、') : (pdef && pdef.foreign ? '外國的素材' : '');
    return '<details class="pk-odds"><summary>' + esc(P.oddsBtn) + '</summary>'
      + '<p class="pk-odds-head">' + esc(P.oddsHead) + '</p>'
      + '<p class="num">' + esc(stars) + '</p>'
      + '<p>' + esc(P.oddsFoil.replace('{p}', (Math.round(foil * 1000) / 10) + '%')) + '</p>'
      + (pool ? '<p>' + esc(P.oddsPool.replace('{list}', pool)) + '</p>' : '')
      + '</details>';
  }

  function open(pk) {
    if (!pk || pk.classList.contains('is-open')) return;
    pk.classList.add('is-open');
    sfx('stamp');
    const cards = Array.from(pk.querySelectorAll('.pk-cards > *'));
    const fast = reduced();
    cards.forEach((el, i) => {
      const show = () => {
        el.classList.add('in');
        if (el.classList.contains('is-foil') || el.querySelector('.is-foil')) sfx('combo');
        else sfx('pickup');
      };
      if (fast) show(); else setTimeout(show, 260 + i * 230);
    });
    pk.dispatchEvent(new CustomEvent('pk-open', { bubbles: true }));
  }
  // 撕：在封口上橫向劃過六成就撕開；只是按一下也會撕開（手機和鍵盤都可以）
  const bound = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
  function bind(root) {
    const scope = root || document;
    scope.querySelectorAll('.pk').forEach((pk) => {
      if (bound) { if (bound.has(pk)) return; bound.add(pk); }
      const seal = pk.querySelector('.pk-seal');
      if (!seal) return;
      let x0 = null, w = 1, moved = false;
      seal.addEventListener('pointerdown', (e) => {
        x0 = e.clientX; w = seal.getBoundingClientRect().width || 1; moved = false;
        try { seal.setPointerCapture(e.pointerId); } catch (err) { /* 舊瀏覽器 */ }
      });
      seal.addEventListener('pointermove', (e) => {
        if (x0 == null) return;
        const k = Math.max(0, Math.min(1, Math.abs(e.clientX - x0) / (w * 0.6)));
        if (k > 0.05) moved = true;
        pk.style.setProperty('--tear', k.toFixed(3));
        if (k >= 1) { x0 = null; open(pk); }
      });
      const end = () => { if (x0 == null) return; x0 = null; if (!pk.classList.contains('is-open')) pk.style.setProperty('--tear', '0'); };
      seal.addEventListener('pointerup', end);
      seal.addEventListener('pointercancel', end);
      seal.addEventListener('click', () => { if (!moved || !pk.classList.contains('is-open')) open(pk); });
    });
  }
  // 一次撕開畫面上所有未撕的包（例如按「收好」時）
  const openAll = (root) => (root || document).querySelectorAll('.pk:not(.is-open)').forEach(open);

  IE.PackFx = { html, cardFace, oddsHtml, bind, open, openAll, kindOf };
})(window.IE = window.IE || {});
