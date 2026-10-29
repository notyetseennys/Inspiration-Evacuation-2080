// 創作：揀素材 → 即時睇到組合同分數 → 爆分演出。
(function (IE) {
  'use strict';
  const D = () => IE.DATA;
  const R = () => IE.Rules;
  const UI = () => IE.UI;
  const A = () => IE.Audio;

  function known(s, id) {
    const meta = IE.Game.meta || {};
    return !!(s.discovered[id] || (meta.recipes && meta.recipes[id]));
  }
  function comboHtml(s, c) {
    const m = '<span class="m">+' + c.mult + '</span>';
    if (c.kind === 'res' || c.kind === 'medley') return '<span class="combo res">' + c.name + m + '</span>';
    if (!known(s, c.id)) return '<span class="combo hidden">？？？ 新組合' + m + '</span>';
    return '<span class="combo' + (c.secondary ? ' secondary' : '') + '">' + c.name + m + '</span>';
  }

  function open(s, onDone) {
    let sel = [];
    const render = () => {
      const ev = sel.length ? R().evalCraft(s, sel) : null;
      const cost = R().craftCost(Math.max(2, sel.length));
      const k = R().kpi(s);
      const can = sel.length >= 2 && s.cr >= R().craftCost(sel.length);
      const slots = [];
      for (let i = 0; i < 5; i++) {
        const uid = sel[i];
        const c = uid != null ? s.cards.find((x) => x.uid === uid) : null;
        if (i >= s.craftSlots) slots.push('<div class="slot locked">要創作工具</div>');
        else slots.push('<div class="slot">' + (c ? UI().cardHtml(c, { button: true, sel: true }) : '空') + '</div>');
      }
      const formula = ev
        ? '<div class="formula">'
          + '<span class="term t-chips"><small>籌碼</small>' + ev.chips + '</span><span class="op">×</span>'
          + '<span class="term t-mult"><small>倍率</small>' + ev.mult + '</span><span class="op">×</span>'
          + '<span class="term t-spark"><small>火花</small>' + ev.spark.toFixed(1) + '</span>'
          + (ev.kpiMod !== 1 ? '<span class="op">×</span><span class="term t-kpi"><small>KPI</small>' + ev.kpiMod + '</span>' : '')
          + '<span class="op">=</span><span class="term t-total"><small>作品分</small>' + UI().fmt(ev.total) + '</span></div>'
          + '<div class="combos">' + (ev.combos.length ? ev.combos.map((c) => comboHtml(s, c)).join('') : '<span class="mute" style="font-size:13px">冇組合。試下揀同一標籤，或者唔同標籤配搭。</span>') + '</div>'
        : '<p class="mute" style="font-size:14px">揀 2 至 ' + s.craftSlots + ' 張素材。同一標籤出現 3 張或以上會「同調」，特定標籤組合會觸發具名組合。</p>';
      UI().modal('<div class="modal wide craft">'
        + '<div class="panel-head"><h2>創作</h2><p>火花 ×' + s.spark.toFixed(1) + '・今季 KPI：' + UI().esc(k.name) + '（' + UI().esc(k.desc) + '）</p></div>'
        + '<div class="craft-tray">' + slots.join('') + '</div>'
        + formula
        + '<h3>你嘅素材（材料費 $' + cost + '，你有 $' + UI().fmt(s.cr) + '）</h3>'
        + '<div class="craft-grid">' + s.cards.map((c) => UI().cardHtml(c, {
          button: true, sel: sel.includes(c.uid),
          disabled: !sel.includes(c.uid) && sel.length >= s.craftSlots,
        })).join('') + '</div>'
        + '<div class="btn-row"><button class="btn" type="button" data-do="cancel">唔做住</button>'
        + '<button class="btn primary big" type="button" data-do="make"' + (can ? '' : ' disabled') + '>創作' + (sel.length >= 2 ? '（$' + R().craftCost(sel.length) + '）' : '') + '</button></div>'
        + '</div>', {
        card(el) {
          const uid = Number(el.dataset.uid);
          if (sel.includes(uid)) sel = sel.filter((u) => u !== uid);
          else if (sel.length < s.craftSlots) sel.push(uid);
          render();
        },
        cancel() { UI().closeModal(); onDone(null); },
        make() { reveal(s, sel, onDone); },
      });
    };
    render();
  }

  // 爆分演出
  function reveal(s, sel, onDone) {
    const before = R().signal(s);
    const res = R().commitCraft(s, sel);
    const ev = res.ev;
    const fast = IE.Pixel.reducedMotion;
    const step = fast ? 60 : 1;
    UI().modal('<div class="modal"><div class="reveal">'
      + '<span class="mute">你' + UI().esc(res.work.medium) + '作品</span>'
      + '<div class="formula" id="rv-formula">'
      + '<span class="term t-chips"><small>籌碼</small><span id="rv-chips">0</span></span><span class="op">×</span>'
      + '<span class="term t-mult"><small>倍率</small><span id="rv-mult">1</span></span><span class="op">×</span>'
      + '<span class="term t-spark"><small>火花</small><span id="rv-spark">?</span></span>'
      + '<span class="op" id="rv-kop" hidden>×</span><span class="term t-kpi" id="rv-kpi" hidden><small>KPI</small>' + ev.kpiMod + '</span></div>'
      + '<div class="combos" id="rv-combos"></div>'
      + '<div class="score" id="rv-score">0</div>'
      + '<div class="work" id="rv-work" hidden>《' + UI().esc(res.work.name) + '》</div>'
      + '<div id="rv-extra" hidden></div>'
      + '</div><div class="btn-row"><button class="btn" type="button" data-do="skip" id="rv-skip">跳過</button>'
      + '<button class="btn primary" type="button" data-do="done" id="rv-done" hidden>完成</button></div></div>', {
      skip() { finishNow(); },
      done() { UI().closeModal(); onDone(res); },
    });
    const $ = (id) => document.getElementById(id);
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms / step));
    let t = 0;
    const tickChips = (target, dur) => {
      const n = 10;
      for (let i = 1; i <= n; i++) at(t + (dur * i) / n, () => { $('rv-chips').textContent = Math.round((target * i) / n); A().sfx('chips'); });
      t += dur;
    };
    // 1. 素材籌碼
    tickChips(ev.cardChips, 600);
    // 2. 組合
    let mult = 1, chips = ev.cardChips;
    ev.combos.forEach((c) => {
      at(t, () => {
        chips += c.chips; mult = Math.round((mult + c.mult) * 10) / 10;
        $('rv-chips').textContent = chips;
        $('rv-mult').textContent = mult;
        const span = document.createElement('span');
        span.className = 'combo' + (c.kind !== 'recipe' ? ' res' : c.secondary ? ' secondary' : '');
        span.innerHTML = c.name + '<span class="m">+' + c.mult + '</span>' + (c.kind === 'recipe' && c.isNew ? ' <b class="new">新！</b>' : '');
        $('rv-combos').appendChild(span);
        A().sfx('mult');
      });
      t += 380;
    });
    // 3. 火花
    at(t, () => { $('rv-spark').textContent = ev.spark.toFixed(1); A().sfx('stamp'); IE.Pixel.view.shake = 3; });
    t += 420;
    // 4. KPI
    if (ev.kpiMod !== 1) {
      at(t, () => { $('rv-kop').hidden = false; $('rv-kpi').hidden = false; A().sfx(ev.kpiMod >= 1 ? 'combo' : 'wrong'); });
      t += 420;
    }
    // 5. 總分
    const total = ev.total;
    for (let i = 1; i <= 12; i++) at(t + i * 45, () => { $('rv-score').textContent = UI().fmt((total * i) / 12); });
    t += 12 * 45;
    at(t, () => finishNow());

    let finished = false;
    function finishNow() {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      $('rv-chips').textContent = ev.chips;
      $('rv-mult').textContent = ev.mult;
      $('rv-spark').textContent = ev.spark.toFixed(1);
      if (ev.kpiMod !== 1) { $('rv-kop').hidden = false; $('rv-kpi').hidden = false; }
      if (!$('rv-combos').children.length) $('rv-combos').innerHTML = ev.combos.map((c) => '<span class="combo' + (c.kind !== 'recipe' ? ' res' : '') + '">' + c.name + '<span class="m">+' + c.mult + '</span></span>').join('');
      const sc = $('rv-score');
      sc.textContent = UI().fmt(total);
      sc.classList.add('boom');
      $('rv-work').hidden = false;
      const after = R().signal(s);
      const extra = [];
      if (res.fresh.length) extra.push('<p class="new">靈光一閃！發現新組合：' + res.fresh.map((c) => c.name).join('、') + (res.sparkUp ? '（火花 +' + res.sparkUp + '）' : '') + '</p>');
      if (ev.kpiMod === 0) extra.push('<p style="color:#ff9aa6">外星人唔計呢件作品：' + UI().esc(ev.kpi.desc) + '</p>');
      extra.push('<p class="mute">訊號 ' + UI().fmt(before) + ' → <b style="color:#ffd6ef">' + UI().fmt(after) + '</b> / ' + UI().fmt(R().threshold(s)) + '</p>');
      $('rv-extra').innerHTML = extra.join('');
      $('rv-extra').hidden = false;
      $('rv-skip').hidden = true;
      $('rv-done').hidden = false;
      $('rv-done').focus({ preventScroll: true });
      A().sfx('boom');
      IE.Game.celebrate(total);
    }
  }

  IE.Craft = { open };
})(window.IE = window.IE || {});
