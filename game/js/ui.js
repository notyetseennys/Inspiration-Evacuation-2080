// 介面：狀態列、行動卡、手機、結算、考績表、結局。這裡只負責組合 HTML，流程在 main.js。
(function (IE) {
  'use strict';
  const D = () => IE.DATA;
  const R = () => IE.Rules;
  const $ = (sel) => document.querySelector(sel);

  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const kfmt = (n) => (n >= 10000 ? (n / 1000).toFixed(1) + 'k' : fmt(n));
  const pad2 = (n) => String(n).padStart(2, '0');
  const signed = (v, d) => (v > 0 ? '+' : v < 0 ? '−' : '±') + (d ? Math.abs(v).toFixed(d) : fmt(Math.abs(v)));

  function tagsHtml(tags) {
    return tags.map((t) => '<span class="tag" style="--c:' + D().TAGS[t].color + '">' + D().TAGS[t].name + '</span>').join('');
  }
  function cardHtml(c, o) {
    o = o || {};
    const tag = o.button ? 'button' : 'div';
    const attrs = o.button ? ' type="button" data-do="' + (o.action || 'card') + '" data-uid="' + c.uid + '"' : '';
    return '<' + tag + ' class="card' + (c.legacy ? ' legacy' : '') + (c.guilt ? ' guilt' : '') + (o.sel ? ' sel' : '') + '"' + attrs + (o.disabled ? ' disabled' : '') + '>'
      + '<span class="c-name">' + esc(c.name) + '</span>'
      + '<span class="c-foot"><span class="tags">' + tagsHtml(c.tags) + '</span><span class="c-val">' + c.value + '</span></span>'
      + (c.grams ? '<span class="c-grams">寫進作品可卸下 ' + c.grams + ' 克</span>' : '')
      + '</' + tag + '>';
  }
  function fxHtml(fx) {
    const label = { cr: '$', body: '身體', spark: '火花', card: '素材', sig: '', soul: '靈魂', note: '' };
    return fx.map(([k, v]) => {
      const neg = /−/.test(v) && k !== 'card';
      return '<span class="fx-' + k + (neg ? ' neg' : '') + '">' + (label[k] ? label[k] + ' ' : '') + esc(v) + '</span>';
    }).join('');
  }

  const pips = (v) => { const n = Math.round(v * 5); return '●'.repeat(n) + '○'.repeat(5 - n); };

  // ---------- 狀態列 ----------
  function renderHud(s) {
    const hud = $('#hud');
    hud.hidden = false;
    const season = D().SEASONS[s.season];
    const th = R().threshold(s), sig = R().signal(s);
    const rent = R().rentAmount(s) + s.debt;
    const toRent = R().nextRentDay(s) - s.day;
    const toReview = R().reviewDay(s) - s.day;
    const flooded = R().flooded(s);
    const rentChip = s.floor > 0
      ? '<span class="chip' + (toRent <= 1 && s.cr < rent ? ' warn' : '') + '">交租 ' + (toRent === 0 ? '今晚' : toRent + ' 天後') + ' · $' + fmt(rent) + '</span>'
      : '<span class="chip warn">露宿天橋下</span>';
    hud.innerHTML = ''
      + '<div class="hud-top">'
      + '<div class="hud-day"><span class="px">Day</span><span class="num">' + pad2(s.day) + '</span><span class="num mute">/' + D().DAYS + '</span><span>· ' + D().SLOTS[s.slot] + '</span></div>'
      + '<span class="chip season">' + season.name + '</span>' + rentChip
      + '<span class="chip' + (toReview === 0 ? ' warn' : '') + '">' + (toReview === 0 ? '今晚是篩選日' : '篩選日在 ' + toReview + ' 天後') + '</span>'
      + '<div class="hud-btns">'
      + '<button class="icon-btn" type="button" data-hud="phone">手機' + (s.morning && s.morning.day === s.day && D().ASTAR[s.day] ? '<span class="dot"></span>' : '') + '</button>'
      + '<button class="icon-btn" type="button" data-hud="help">玩法</button>'
      + '<button class="icon-btn" type="button" data-hud="mute" aria-pressed="' + IE.Audio.muted + '">' + (IE.Audio.muted ? '靜音' : '聲音') + '</button>'
      + '</div></div>'
      + '<div class="hud-meters">'
      + '<div class="meter m-cash"><span class="lbl">$ 信用點</span><b class="num">' + fmt(s.cr) + '</b></div>'
      + '<div class="meter m-body"><span class="lbl">身體</span><div class="bar"><i style="width:' + Math.max(0, s.body) + '%"></i></div><b class="num">' + Math.max(0, Math.round(s.body)) + '</b></div>'
      + '<div class="meter m-spark' + (s.spark < 1 ? ' numb' : '') + '"><span class="lbl">' + (s.spark < 1 ? '麻木' : '火花') + '</span><div class="bar"><i style="width:' + (s.spark / R().SPARK_MAX * 100) + '%"></i></div><b class="num">×' + s.spark.toFixed(1) + '</b></div>'
      + '<div class="meter m-soul' + (s.soul > R().SOUL_LIMIT ? ' over' : '') + '"><span class="lbl">靈魂</span><div class="bar"><i style="width:' + Math.min(100, s.soul / 30 * 100) + '%"></i><em style="left:' + (R().SOUL_LIMIT / 30 * 100) + '%"></em></div><b class="num">' + s.soul.toFixed(1) + '<small>克</small></b></div>'
      + '<div class="meter m-signal"><span class="lbl">訊號</span><div class="bar"><i style="width:' + Math.min(100, sig / th * 100) + '%"></i></div><b class="num">' + kfmt(sig) + '/' + kfmt(th) + '</b></div>'
      + '</div>'
      + '<div class="hud-sub">'
      + '<span>良知 <b class="pips">' + pips(s.conscience) + '</b> <b>' + Math.round(s.conscience * 100) + '%</b>・火花上限 <b>×' + R().sparkMax(s).toFixed(1) + '</b></span>'
      + '<span>平台評分 <b>★' + s.rating.toFixed(1) + '</b></span>'
      + '<span>全城自動化 <b>' + s.auto.toFixed(0) + '%</b></span>'
      + '<span class="' + (flooded ? 'bad' : '') + '">水位 <b>' + s.water.toFixed(1) + ' 樓</b> · 你住在 <b>' + (s.floor ? s.floor + ' 樓' : '天橋下') + '</b>' + (flooded ? '（正在淹水）' : '') + '</span>'
      + '<span>本季 KPI <b>' + esc(R().kpi(s).name) + '</b></span>'
      + '</div>';
  }

  // ---------- 面板與對話框 ----------
  let panelHandlers = {}, modalHandlers = {}, modalOpts = {};
  function setPanel(html, handlers) {
    $('#panel').innerHTML = html;
    panelHandlers = handlers || {};
  }
  function modal(html, handlers, opts) {
    const wrap = $('#modal');
    modalOpts = opts || {};
    // 已開啟的對話框重新繪畫時，不再播放彈出動畫
    wrap.classList.toggle('static', !wrap.hidden);
    wrap.innerHTML = html;
    wrap.hidden = false;
    modalHandlers = handlers || {};
    const first = wrap.querySelector('[data-autofocus]') || wrap.querySelector('.btn.primary') || wrap.querySelector('button');
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 30);
  }
  function closeModal() {
    const wrap = $('#modal');
    wrap.hidden = true; wrap.innerHTML = ''; modalHandlers = {}; modalOpts = {};
  }
  const modalOpen = () => !$('#modal').hidden;
  function bindDelegation() {
    const route = (root, getHandlers) => root.addEventListener('click', (e) => {
      const el = e.target.closest('[data-do]');
      if (!el || !root.contains(el) || el.disabled) return;
      const fn = getHandlers()[el.dataset.do];
      if (fn) { IE.Audio.sfx('click'); fn(el, e); }
    });
    route($('#panel'), () => panelHandlers);
    route($('#modal'), () => modalHandlers);
    const dismiss = () => {
      const fn = modalOpts.dismiss;
      if (!fn || !modalOpen()) return;
      closeModal();
      fn();
    };
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') dismiss(); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') dismiss(); });
  }
  function toast(text, kind) {
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = text;
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  // ---------- 行動 ----------
  function actionsPanel(s, list) {
    const night = R().isNight(s);
    const hint = night
      ? '晚上可以創作：作品分 = 素材籌碼 × 組合倍率 × 火花 × KPI。'
      : '工作賺錢會消耗火花；潛水和聊天可以收集素材；沒錢就沒有地方住。';
    return '<div class="panel-head"><h2>' + D().SLOTS[s.slot] + '：要做什麼？</h2><p>' + hint + '</p></div>'
      + '<div class="acts">' + list.map((a, i) => '<button class="act" type="button" data-do="act" data-id="' + a.id + '"' + (a.enabled ? '' : ' disabled') + '>'
        + '<span class="act-key">' + (i + 1) + '</span><span class="act-name">' + a.name + '</span><span class="act-sub">' + esc(a.sub) + '</span>'
        + '<span class="fx">' + fxHtml(a.fx) + '</span>' + (a.reason ? '<span class="act-why">' + esc(a.reason) + '</span>' : '') + '</button>').join('') + '</div>'
      + invHtml(s);
  }
  function invHtml(s) {
    return '<div class="inv-wrap"><div class="inv-head"><span>素材 ' + s.cards.length + ' / ' + R().MAX_CARDS + '</span><span>晚上用來創作・超出上限會丟掉最舊的一張</span></div>'
      + '<div class="inv">' + (s.cards.length ? s.cards.map((c) => cardHtml(c)).join('') : '<span class="mute" style="font-size:13px">還沒有素材。先去生活吧。</span>') + '</div></div>';
  }
  function chatPanel(s) {
    const npcs = R().aliveNpcs(s);
    return '<div class="panel-head"><h2>找誰聊天？</h2><p>' + (R().chatCost(s) ? '請對方喝東西 $' + R().chatCost(s) : '街頭樂手不用請客') + '。越熟絡，火花恢復得越多。</p></div>'
      + '<div class="acts">' + npcs.map((n) => {
        const def = D().NPCS.find((x) => x.id === n.id);
        const cards = def.cards.map((id) => D().CARDS[id]);
        return '<button class="act" type="button" data-do="npc" data-id="' + n.id + '"><span class="act-name">' + def.name + '</span>'
          + '<span class="act-sub">熟絡度 ' + '●'.repeat(Math.min(4, n.friend)) + '○'.repeat(Math.max(0, 4 - n.friend)) + '　本季訊號 ' + kfmt(n.signal) + '</span>'
          + '<span class="tags">' + tagsHtml([...new Set(cards.flatMap((c) => c.tags))]) + '</span></button>';
      }).join('') + '</div>'
      + '<div class="btn-row"><button class="btn" type="button" data-do="back">返回</button></div>';
  }
  function controlsPanel(game) {
    return '<div class="controls"><p class="hint">' + esc(game.hint) + '</p><div class="ctrl-row">'
      + game.controls.map((c) => '<button class="btn ' + c.id + '" type="button" data-ctrl="' + c.id + '">' + c.label + ' <small>' + esc(c.key) + '</small></button>').join('')
      + '</div></div>';
  }

  // ---------- 報告 ----------
  function deltasHtml(d) {
    const out = [];
    if (d.cr) out.push('<div class="delta cr"><span class="k">信用點</span><span class="num">' + signed(d.cr) + '</span></div>');
    if (d.body) out.push('<div class="delta body"><span class="k">身體</span><span class="num">' + signed(d.body) + '</span></div>');
    if (d.spark) out.push('<div class="delta spark"><span class="k">火花</span><span class="num">' + signed(d.spark, 2) + '</span></div>');
    if (d.soul) out.push('<div class="delta soul"><span class="k">靈魂重量</span><span class="num">' + signed(d.soul, 1) + '<small>克</small></span></div>');
    return out.length ? '<div class="deltas">' + out.join('') + '</div>' : '';
  }
  function linesHtml(lines) {
    if (!lines.length) return '';
    return '<ul class="lines">' + lines.map((l) => '<li class="' + l.kind + '"><span>' + esc(l.text) + '</span>'
      + (l.v != null ? '<span class="v">' + (l.stat === 'spark' ? signed(l.v, 1) : l.stat === 'soul' ? signed(l.v, 1) + '<small>克</small>' : signed(l.v)) + '</span>' : '') + '</li>').join('') + '</ul>';
  }
  function gainedHtml(rep) {
    let h = '';
    if (rep.cards.length) h += '<h3>獲得素材</h3><div class="gained">' + rep.cards.map((c) => cardHtml(c)).join('') + '</div>';
    if (rep.dropped.length) h += '<p class="mute" style="font-size:13px">素材太多，丟掉了：' + rep.dropped.map((c) => esc(c.name)).join('、') + '</p>';
    return h;
  }
  function reportModal(rep, btnLabel) {
    return '<div class="modal"><h2>' + esc(rep.title) + '</h2>' + deltasHtml(rep.deltas) + linesHtml(rep.lines) + gainedHtml(rep)
      + '<div class="btn-row"><button class="btn primary" type="button" data-do="ok">' + (btnLabel || '繼續') + '</button></div></div>';
  }
  function settleModal(rep) {
    const btn = rep.review ? '查看考績' : rep.ending ? '……' : '睡覺';
    return '<div class="modal"><h2>' + esc(rep.title) + '</h2>' + deltasHtml(rep.deltas) + linesHtml(rep.lines) + gainedHtml(rep)
      + '<div class="btn-row"><button class="btn primary" type="button" data-do="ok">' + btn + '</button></div></div>';
  }

  // ---------- 手機 ----------
  function phoneModal(s, m, shopItems, opts) {
    const who = { weather: '天文台', news: '新聞', ad: '贊助', post: '浮聲網民', alien: '星際人才發展局', warn: '系統提示' };
    const feed = m.feed.map((p) => '<div class="post ' + p.kind + '"><span class="who">' + (who[p.kind] || '') + '</span>' + esc(p.text) + '</div>').join('');
    const astar = m.astar ? '<span class="msg-head">阿星（神秘頻道）</span><div class="msg ' + m.astar.style + '">' + esc(m.astar.text) + '</div>' : '';
    const battery = Math.max(1, 23 - s.day);
    const shop = '<h3>商店</h3><div class="shop">' + shopItems.map((it) => '<div class="shop-item"><div><div class="n">' + esc(it.name) + '</div><div class="d">' + esc(it.note || it.desc) + '</div></div>'
      + '<button class="btn' + (it.enabled ? ' sea' : '') + '" type="button" data-do="buy" data-id="' + it.id + '"' + (it.enabled ? '' : ' disabled') + '>' + (it.owned ? '已擁有' : '$' + fmt(it.cost)) + '</button></div>').join('') + '</div>';
    return '<div class="phone" role="dialog" aria-label="手機">'
      + '<div class="phone-bar"><span>' + (opts.morning ? '07:00' : '··:··') + '</span><span>浮聲 5G</span><span class="' + (battery < 10 ? 'low' : '') + '">電量 ' + battery + '%</span></div>'
      + '<h2>第 ' + s.day + ' 天' + (opts.morning ? '・早上' : '') + '</h2>'
      + '<div class="feed">' + feed + '</div>' + astar + shop
      + '<button class="btn primary" type="button" data-do="close">' + (opts.morning ? '開始今天' : '收起手機') + '</button></div>';
  }

  // ---------- 外星考績 ----------
  function reviewModal(rv) {
    return '<div class="modal"><div class="review">'
      + '<div class="r-head"><span>星際人才發展局・天賦對齊流程</span><span>第 ' + (rv.quarter + 1) + ' 季考績</span></div>'
      + '<h2>候選人季度表現評估</h2>'
      + '<table>' + rv.grades.map((g) => '<tr><td>' + g.k + '</td><td class="g">' + g.g + '</td><td class="n">' + esc(g.note) + '</td></tr>').join('') + '</table>'
      + '<p class="verdict">' + (rv.pass ? '恭喜！你已通過天賦對齊流程。請保持窗戶打開。'
        : rv.overweight && rv.signalOk ? '你的訊號已經達標，但靈魂重量超出牽引光束的負載上限。為保護本局神經網絡，暫不錄取。'
          : '感謝你的申請。你已被納入人才庫，我們會保留你的資料十二個月。') + '</p>'
      + (rv.taken ? '<p>同區候選人「' + esc(rv.taken) + '」已獲錄取，並完成人才優化遷移。</p>' : '')
      + '<p style="font-size:12px;color:#5b6b90">本季 KPI：' + esc(rv.kpi) + '。我們不是一個組織，我們是一個宇宙大家庭。</p>'
      + '<span class="stamp ' + (rv.pass ? 'pass' : 'fail') + '">' + (rv.pass ? '錄取' : rv.overweight && rv.signalOk ? '超重' : '人才庫') + '</span>'
      + '</div><div class="btn-row"><button class="btn primary" type="button" data-do="ok">' + (rv.pass ? '……' : '繼續生活') + '</button></div></div>';
  }

  // ---------- 標題、開局、結局 ----------
  function titlePanel(meta, hasSave) {
    const endings = meta.endings ? Object.keys(meta.endings).length : 0;
    const recipes = meta.recipes ? Object.keys(meta.recipes).length : 0;
    return '<div class="title-menu">'
      + '<p class="tagline">工作越做越<em>爽</em>，靈魂越做越少。</p>'
      + '<p class="lede">2080 年，海平面暴漲，浮城越高越富有、越低越淹水。靈感強的人一個接一個被外星人帶走。外星人只要又亮又輕、沒有包袱的人：你的火花要夠旺，靈魂又不能超過 21 克。可是在這個城市，活下去本身就會讓靈魂變重。</p>'
      + '<div class="btn-row">'
      + (hasSave ? '<button class="btn primary big" type="button" data-do="continue">繼續上一局</button>' : '')
      + '<button class="btn ' + (hasSave ? '' : 'primary big') + '" type="button" data-do="new">' + (hasSave ? '放棄並開始新一局' : '開始') + '</button>'
      + '</div>'
      + '<div class="btn-row"><button class="btn" type="button" data-do="help">玩法</button><button class="btn" type="button" data-do="collection">收藏</button></div>'
      + '<div class="stats-row"><span>已玩 <b>' + (meta.runs || 0) + '</b> 局</span><span>結局 <b>' + endings + '/' + ENDING_COUNT + '</b></span><span>組合 <b>' + recipes + '/' + D().RECIPES.length + '</b></span>'
      + (meta.relics && meta.relics.length ? '<span>舊城裡有 <b>' + meta.relics.length + '</b> 件你前世的作品</span>' : '') + '</div>'
      + '<p class="mute" style="font-size:12px;margin:0">自動存檔，無法讀檔重來。建議開啟聲音。</p>'
      + '</div>';
  }
  function setupPanel(sel) {
    const bgs = D().BACKGROUNDS, seasons = D().SEASONS;
    return '<div class="panel-head"><h2>你是誰？</h2><p>開局背景決定起始資源與專長。</p></div>'
      + '<div class="bg-grid">' + Object.keys(bgs).map((k) => {
        const b = bgs[k];
        return '<button class="bg-card' + (sel.bg === k ? ' sel' : '') + '" type="button" data-do="bg" data-id="' + k + '">'
          + '<span class="n">' + b.name + '</span><span class="d">' + b.desc + b.past + '</span><span class="p">' + b.perkText + '</span>'
          + '<span class="d">靈魂 ' + b.soul + ' 克・良知 ' + Math.round(b.conscience * 100) + '%</span>'
          + '<span class="s"><span style="color:var(--cash)">$' + b.cr + '</span><span style="color:#ffb3b3">身體 ' + b.body + '</span><span style="color:var(--spark)">火花 ×' + b.spark.toFixed(1) + '</span></span></button>';
      }).join('') + '</div>'
      + '<div class="panel-head"><h2>季節</h2><p>' + esc(seasons[sel.season].desc) + '</p></div>'
      + '<div class="seg">' + Object.keys(seasons).map((k) => '<button type="button" class="' + (sel.season === k ? 'sel' : '') + '" data-do="season" data-id="' + k + '">' + seasons[k].name + '</button>').join('') + '</div>'
      + '<div class="btn-row"><button class="btn" type="button" data-do="back">返回</button><button class="btn primary big" type="button" data-do="start">出發</button></div>';
  }
  const ENDING_KIND = { death: 'DEATH', grey: 'GREYED OUT', ordinary: 'ORDINARY', agent: 'RECRUITED', returned: 'RETURNED', heavy: 'TOO HEAVY', guardian: 'STAYED' };
  const ENDING_COUNT = Object.keys(ENDING_KIND).length;
  function endingModal(e, s, meta) {
    const best = s.stats.bestWork;
    return '<div class="modal"><div class="ending ' + e.kind + '">'
      + '<span class="e-kind">' + ENDING_KIND[e.kind] + '・DAY ' + s.day + '</span>'
      + '<h2>' + esc(e.title) + '</h2>'
      + '<p class="epitaph">' + esc(e.text) + '</p>'
      + '<div class="e-stats">'
      + '<div class="e-stat"><span class="k">作品</span><span class="num">' + s.works.length + '</span></div>'
      + '<div class="e-stat"><span class="k">累積訊號</span><span class="num">' + kfmt(R().signal(s)) + '</span></div>'
      + '<div class="e-stat"><span class="k">標註</span><span class="num">' + fmt(s.stats.labels) + '</span></div>'
      + '<div class="e-stat"><span class="k">捕魚</span><span class="num">' + (s.stats.fish || 0) + '</span></div>'
      + '<div class="e-stat"><span class="k">靈魂</span><span class="num">' + s.soul.toFixed(1) + '<small>克</small></span></div>'
      + '<div class="e-stat"><span class="k">良知</span><span class="num">' + Math.round(s.conscience * 100) + '%</span></div>'
      + '</div>'
      + (best ? '<p class="mute" style="font-size:14px">最好的作品：《' + esc(best.name) + '》（' + fmt(best.raw) + ' 分）。它會沉入舊城，等下一局的你把它打撈上來。</p>' : '')
      + '<div class="btn-row" style="width:100%"><button class="btn" type="button" data-do="copy">複製墓誌銘</button><button class="btn primary" type="button" data-do="again">再玩一局</button></div>'
      + '<p class="mute" style="font-size:12px">結局收集 ' + Object.keys(meta.endings || {}).length + '/' + ENDING_COUNT + '</p>'
      + '</div></div>';
  }
  function helpModal() {
    return '<div class="modal wide"><h2>玩法</h2><div class="help">'
      + '<p>你有 30 天。每天分為早上、下午、晚上三個時段，每個時段做一件事。第 10、20、30 天晚上是<b>篩選日</b>：如果你的累積訊號夠高，外星人就會把你帶走。</p>'
      + '<h3>三樣東西互相蠶食</h3><ul>'
      + '<li><b>錢</b>：每晚要吃飯，每 5 天要交租。兩次交不起租就會被趕出門。</li>'
      + '<li><b>身體</b>：降到 0 就會死。</li>'
      + '<li><b>火花</b>：創作的倍率。工作會消耗火花，而且越熟練消耗越多。火花低於 ×1 會陷入麻木，無法創作；連續 4 晚沒有火花，你就會灰化。</li></ul>'
      + '<h3>三份工作</h3><ul>'
      + '<li><b>AI 數據標註</b>：依照左邊的指引把圖片分為「是」或「否」。指引每 15 秒更新，越來越荒謬。連續答對 15 張會進入心流狀態：收入加倍，火花消耗也加倍。主管巡查時出錯會被記錄。</li>'
      + '<li><b>企業情緒陪伴</b>：黃色音符按「笑」，長條要一直按住；藍綠色按「點頭」；客人講傷心事（藍色）也要點頭，笑出來會被罰款。客人的杯空了就按住「倒酒」，在綠色範圍內放手，倒滿會瀉。</li>'
      + '<li><b>舊城潛水</b>：用魚叉捕魚，打撈遺物，撬開儲物櫃。舊街、地鐵站、舊商場越深越暗，收穫也越好。霓虹鰻會衝過來咬人，水母碰到會螫。背包越重游得越慢，氧氣用完之前要浮上水面。抓到大魚當晚餐，當晚不用買飯。</li></ul>'
      + '<h3>靈魂重量與良知</h3><ul>'
      + '<li>外星人的牽引光束最多只能拉起 <b>21 克</b>的靈魂。太重的人會污染他們的神經網絡，訊號再高也不會被帶走。</li>'
      + '<li>活下去很容易讓靈魂變重：標註數據令別人失業、附和有錢人的偏見、撬別人的儲物櫃，還有每天早上的道德抉擇。</li>'
      + '<li><b>良知是負重</b>：同一件虧心事，良知越強就越重。可是每做一次，良知都會被磨損，你會越來越麻木，下一件事就越來越輕。</li>'
      + '<li>良知也決定你的感受力：火花上限 = 2 + 2 × 良知。麻木的人很輕，但也燒不起來。</li>'
      + '<li>減輕的方法：到避難所做義工、在抉擇中選擇良心、把「愧疚」素材寫進作品（懺悔），或者像天空區的人一樣購買「業力抵銷額度」。</li></ul>'
      + '<h3>創作</h3><p>作品分 = 素材籌碼 × 組合倍率 × 火花 × 外星 KPI。素材來自生活：工作、潛水、聊天，甚至挨餓。同一標籤的素材越多越有共鳴，特定的標籤組合會觸發具名組合。</p>'
      + '<h3>操作</h3><p>鍵盤：數字鍵選擇行動。標註用 ← →；陪伴用 ←（點頭）、→（笑）、空白鍵（倒酒）；潛水用方向鍵或 WASD 游泳，滑鼠點擊或空白鍵發射魚叉。手機：直接按畫面或下方的按鈕。</p>'
      + '</div><div class="btn-row"><button class="btn primary" type="button" data-do="close">明白</button></div></div>';
  }
  function collectionModal(meta) {
    const names = { agent: '星際特工', returned: '被遣返', guardian: '地球守護者', heavy: '良知太重', ordinary: '平凡人', death: '死亡', grey: '灰化' };
    const has = (k) => meta.endings && meta.endings[k];
    const endings = Object.keys(names).map((k) => '<div class="recipe' + (has(k) ? '' : ' unknown') + '"><b>' + (has(k) ? names[k] : '？？？') + '</b>'
      + (has(k) ? '<span class="mute">達成 ' + meta.endings[k] + ' 次</span>' : '') + '</div>').join('');
    const recipes = D().RECIPES.map((r) => {
      const known = meta.recipes && meta.recipes[r.id];
      const tags = Object.keys(r.need).map((t) => (r.need[t] > 1 ? D().TAGS[t].name + '×' + r.need[t] : D().TAGS[t].name));
      return '<div class="recipe' + (known ? '' : ' unknown') + '"><b>' + (known ? r.name : '？？？') + '</b><span>' + (known ? tags.join(' + ') : tags[0] + ' + …') + '</span><span class="mute">倍率 +' + r.mult + '</span></div>';
    }).join('');
    const log = meta.log || { fish: {}, relics: {} };
    const fish = Object.keys(D().FISH).map((k) => '<div class="recipe' + (log.fish[k] ? '' : ' unknown') + '"><b>' + (log.fish[k] ? D().FISH[k].name : '？？？') + '</b>'
      + (log.fish[k] ? '<span class="mute">' + (D().FISH[k].value ? '售價 $' + D().FISH[k].value : '不能賣，但會發光') + '</span>' : '') + '</div>').join('');
    const relicIds = [...new Set(D().DIVE_ZONES.flatMap((z) => z.relics).concat(['d_jelly', 'f_scale', 'f_eye']))];
    const relics = relicIds.map((id) => '<div class="recipe' + (log.relics[id] ? '' : ' unknown') + '"><b>' + (log.relics[id] ? esc(D().CARDS[id].name) : '？？？') + '</b>'
      + (log.relics[id] ? '<span class="tags">' + tagsHtml(D().CARDS[id].tags) + '</span>' : '') + '</div>').join('');
    return '<div class="modal wide"><h2>收藏</h2><h3>結局</h3><div class="recipes">' + endings + '</div>'
      + '<h3>具名組合</h3><div class="recipes">' + recipes + '</div>'
      + '<h3>舊城圖鑑：魚類</h3><div class="recipes">' + fish + '</div>'
      + '<h3>舊城圖鑑：遺物</h3><div class="recipes">' + relics + '</div>'
      + '<div class="btn-row"><button class="btn primary" type="button" data-do="close">收起</button></div></div>';
  }

  // ---------- 道德抉擇 ----------
  function dilemmaModal(v, s) {
    return '<div class="modal dilemma"><span class="eyebrow">早上的抉擇</span>'
      + '<p class="d-text">' + esc(v.text) + '</p>'
      + '<div class="d-opts">' + v.options.map((o) => '<button class="d-opt" type="button" data-do="pick" data-i="' + o.i + '"' + (o.reason ? ' disabled' : '') + '>'
        + '<span class="d-label">' + esc(o.label) + '</span><span class="fx">' + fxHtml(o.fx) + '</span>'
        + (o.reason ? '<span class="act-why">' + esc(o.reason) + '</span>' : '') + '</button>').join('') + '</div>'
      + '<p class="mute" style="font-size:12px">你的良知 ' + Math.round(s.conscience * 100) + '%：每件虧心事的重量 ×' + R().sinFactor(s).toFixed(2)
      + '。靈魂現在重 ' + s.soul.toFixed(1) + ' 克，上限 ' + R().SOUL_LIMIT + ' 克。</p></div>';
  }
  function stayModal(s) {
    return '<div class="modal dilemma"><span class="eyebrow">第 ' + s.day + ' 天・晚上</span>'
      + '<p class="d-text">探射燈停在你的窗外。光束在等你。</p>'
      + '<p class="mute">走進光裡，你會成為星際人才發展局的一員。關上窗戶，你會留在浮城。</p>'
      + '<div class="d-opts"><button class="d-opt" type="button" data-do="go"><span class="d-label">走進光裡</span><span class="fx"><span class="fx-sig">被外星人帶走</span></span></button>'
      + '<button class="d-opt" type="button" data-do="stay"><span class="d-label">關上窗戶</span><span class="fx"><span class="fx-note">留下來</span></span></button></div></div>';
  }

  IE.UI = {
    esc, fmt, kfmt, signed, tagsHtml, cardHtml, fxHtml, deltasHtml, linesHtml, gainedHtml,
    renderHud, setPanel, modal, closeModal, modalOpen, bindDelegation, toast,
    actionsPanel, invHtml, chatPanel, controlsPanel, reportModal, settleModal, phoneModal, reviewModal,
    titlePanel, setupPanel, endingModal, helpModal, collectionModal, dilemmaModal, stayModal,
  };
})(window.IE = window.IE || {});
