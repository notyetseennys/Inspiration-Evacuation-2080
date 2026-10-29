// 介面：HUD、行動卡、手機、結算、考績表、結局。只負責砌 HTML，流程喺 main.js。
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
    return '<' + tag + ' class="card' + (c.legacy ? ' legacy' : '') + (o.sel ? ' sel' : '') + '"' + attrs + (o.disabled ? ' disabled' : '') + '>'
      + '<span class="c-name">' + esc(c.name) + '</span>'
      + '<span class="c-foot"><span class="tags">' + tagsHtml(c.tags) + '</span><span class="c-val">' + c.value + '</span></span>'
      + '</' + tag + '>';
  }
  function fxHtml(fx) {
    const label = { cr: '$', body: '身體', spark: '火花', card: '素材', sig: '' };
    return fx.map(([k, v]) => {
      const neg = /−/.test(v) && k !== 'card';
      return '<span class="fx-' + k + (neg ? ' neg' : '') + '">' + (label[k] ? label[k] + ' ' : '') + esc(v) + '</span>';
    }).join('');
  }

  // ---------- HUD ----------
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
      ? '<span class="chip' + (toRent <= 1 && s.cr < rent ? ' warn' : '') + '">交租 ' + (toRent === 0 ? '今晚' : toRent + ' 日後') + ' · $' + fmt(rent) + '</span>'
      : '<span class="chip warn">露宿天橋底</span>';
    hud.innerHTML = ''
      + '<div class="hud-top">'
      + '<div class="hud-day"><span class="px">Day</span><span class="num">' + pad2(s.day) + '</span><span class="num mute">/' + D().DAYS + '</span><span>· ' + D().SLOTS[s.slot] + '</span></div>'
      + '<span class="chip season">' + season.name + '</span>' + rentChip
      + '<span class="chip' + (toReview === 0 ? ' warn' : '') + '">' + (toReview === 0 ? '今晚篩選日' : '篩選日 ' + toReview + ' 日後') + '</span>'
      + '<div class="hud-btns">'
      + '<button class="icon-btn" type="button" data-hud="phone">電話' + (s.morning && s.morning.day === s.day && D().ASTAR[s.day] ? '<span class="dot"></span>' : '') + '</button>'
      + '<button class="icon-btn" type="button" data-hud="help">玩法</button>'
      + '<button class="icon-btn" type="button" data-hud="mute" aria-pressed="' + IE.Audio.muted + '">' + (IE.Audio.muted ? '靜音' : '聲音') + '</button>'
      + '</div></div>'
      + '<div class="hud-meters">'
      + '<div class="meter m-cash"><span class="lbl">$ 信用點</span><b class="num">' + fmt(s.cr) + '</b></div>'
      + '<div class="meter m-body"><span class="lbl">身體</span><div class="bar"><i style="width:' + Math.max(0, s.body) + '%"></i></div><b class="num">' + Math.max(0, Math.round(s.body)) + '</b></div>'
      + '<div class="meter m-spark' + (s.spark < 1 ? ' numb' : '') + '"><span class="lbl">' + (s.spark < 1 ? '麻木' : '火花') + '</span><div class="bar"><i style="width:' + (s.spark / R().SPARK_MAX * 100) + '%"></i></div><b class="num">×' + s.spark.toFixed(1) + '</b></div>'
      + '<div class="meter m-signal"><span class="lbl">訊號</span><div class="bar"><i style="width:' + Math.min(100, sig / th * 100) + '%"></i></div><b class="num">' + kfmt(sig) + '/' + kfmt(th) + '</b></div>'
      + '</div>'
      + '<div class="hud-sub">'
      + '<span>平台評分 <b>★' + s.rating.toFixed(1) + '</b></span>'
      + '<span>全城自動化 <b>' + s.auto.toFixed(0) + '%</b></span>'
      + '<span class="' + (flooded ? 'bad' : '') + '">水位 <b>' + s.water.toFixed(1) + ' 樓</b> · 你住 <b>' + (s.floor ? s.floor + ' 樓' : '天橋底') + '</b>' + (flooded ? '（浸緊）' : '') + '</span>'
      + '<span>今季 KPI <b>' + esc(R().kpi(s).name) + '</b></span>'
      + '</div>';
  }

  // ---------- 面板同對話框 ----------
  let panelHandlers = {}, modalHandlers = {}, modalOpts = {};
  function setPanel(html, handlers) {
    $('#panel').innerHTML = html;
    panelHandlers = handlers || {};
  }
  function modal(html, handlers, opts) {
    const wrap = $('#modal');
    modalOpts = opts || {};
    // 已經開住嘅對話框重畫時唔再播彈出動畫
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
      ? '夜晚可以創作：作品分 = 素材籌碼 × 組合倍率 × 火花 × KPI。'
      : '打工賺錢會扣火花；潛水同傾偈收集素材；冇錢冇屋住。';
    return '<div class="panel-head"><h2>' + D().SLOTS[s.slot] + '：做咩好？</h2><p>' + hint + '</p></div>'
      + '<div class="acts">' + list.map((a, i) => '<button class="act" type="button" data-do="act" data-id="' + a.id + '"' + (a.enabled ? '' : ' disabled') + '>'
        + '<span class="act-key">' + (i + 1) + '</span><span class="act-name">' + a.name + '</span><span class="act-sub">' + esc(a.sub) + '</span>'
        + '<span class="fx">' + fxHtml(a.fx) + '</span>' + (a.reason ? '<span class="act-why">' + esc(a.reason) + '</span>' : '') + '</button>').join('') + '</div>'
      + invHtml(s);
  }
  function invHtml(s) {
    return '<div class="inv-wrap"><div class="inv-head"><span>素材 ' + s.cards.length + ' / ' + R().MAX_CARDS + '</span><span>夜晚用嚟創作・滿咗會丟最舊嗰張</span></div>'
      + '<div class="inv">' + (s.cards.length ? s.cards.map((c) => cardHtml(c)).join('') : '<span class="mute" style="font-size:13px">未有素材。去生活下先。</span>') + '</div></div>';
  }
  function chatPanel(s) {
    const npcs = R().aliveNpcs(s);
    return '<div class="panel-head"><h2>搵邊個傾偈？</h2><p>' + (R().chatCost(s) ? '請人飲嘢 $' + R().chatCost(s) : '街頭樂手唔使請') + '。越熟，火花回得越多。</p></div>'
      + '<div class="acts">' + npcs.map((n) => {
        const def = D().NPCS.find((x) => x.id === n.id);
        const cards = def.cards.map((id) => D().CARDS[id]);
        return '<button class="act" type="button" data-do="npc" data-id="' + n.id + '"><span class="act-name">' + def.name + '</span>'
          + '<span class="act-sub">熟絡度 ' + '●'.repeat(Math.min(4, n.friend)) + '○'.repeat(Math.max(0, 4 - n.friend)) + '　佢今季嘅訊號 ' + kfmt(n.signal) + '</span>'
          + '<span class="tags">' + tagsHtml([...new Set(cards.flatMap((c) => c.tags))]) + '</span></button>';
      }).join('') + '</div>'
      + '<div class="btn-row"><button class="btn" type="button" data-do="back">返轉頭</button></div>';
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
    return out.length ? '<div class="deltas">' + out.join('') + '</div>' : '';
  }
  function linesHtml(lines) {
    if (!lines.length) return '';
    return '<ul class="lines">' + lines.map((l) => '<li class="' + l.kind + '"><span>' + esc(l.text) + '</span>'
      + (l.v != null ? '<span class="v">' + (l.stat === 'spark' ? signed(l.v, 1) : signed(l.v)) + '</span>' : '') + '</li>').join('') + '</ul>';
  }
  function gainedHtml(rep) {
    let h = '';
    if (rep.cards.length) h += '<h3>得到素材</h3><div class="gained">' + rep.cards.map((c) => cardHtml(c)).join('') + '</div>';
    if (rep.dropped.length) h += '<p class="mute" style="font-size:13px">素材太多，丟咗：' + rep.dropped.map((c) => esc(c.name)).join('、') + '</p>';
    return h;
  }
  function reportModal(rep, btnLabel) {
    return '<div class="modal"><h2>' + esc(rep.title) + '</h2>' + deltasHtml(rep.deltas) + linesHtml(rep.lines) + gainedHtml(rep)
      + '<div class="btn-row"><button class="btn primary" type="button" data-do="ok">' + (btnLabel || '繼續') + '</button></div></div>';
  }
  function settleModal(rep, s) {
    const btn = rep.review ? '睇考績' : rep.ending ? '……' : '瞓覺';
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
      + '<button class="btn' + (it.enabled ? ' sea' : '') + '" type="button" data-do="buy" data-id="' + it.id + '"' + (it.enabled ? '' : ' disabled') + '>' + (it.owned ? '已有' : '$' + fmt(it.cost)) + '</button></div>').join('') + '</div>';
    return '<div class="phone" role="dialog" aria-label="手機">'
      + '<div class="phone-bar"><span>' + (opts.morning ? '07:00' : '··:··') + '</span><span>浮聲 5G</span><span class="' + (battery < 10 ? 'low' : '') + '">電量 ' + battery + '%</span></div>'
      + '<h2>第 ' + s.day + ' 日' + (opts.morning ? '・朝早' : '') + '</h2>'
      + '<div class="feed">' + feed + '</div>' + astar + shop
      + '<button class="btn primary" type="button" data-do="close">' + (opts.morning ? '開始今日' : '收起電話') + '</button></div>';
  }

  // ---------- 外星考績 ----------
  function reviewModal(rv) {
    return '<div class="modal"><div class="review">'
      + '<div class="r-head"><span>星際人才發展局・天賦對齊流程</span><span>第 ' + (rv.quarter + 1) + ' 季考績</span></div>'
      + '<h2>候選人季度表現評估</h2>'
      + '<table>' + rv.grades.map((g) => '<tr><td>' + g.k + '</td><td class="g">' + g.g + '</td><td class="n">' + esc(g.note) + '</td></tr>').join('') + '</table>'
      + '<p class="verdict">' + (rv.pass ? '恭喜！你已通過天賦對齊流程。請保持窗戶打開。' : '感謝你嘅申請。你已被加入人才庫，我哋會保留你嘅資料十二個月。') + '</p>'
      + (rv.taken ? '<p>同區候選人「' + esc(rv.taken) + '」已獲錄取並完成人才優化遷移。</p>' : '')
      + '<p style="font-size:12px;color:#5b6b90">今季 KPI：' + esc(rv.kpi) + '。我哋唔係一個組織，我哋係一個宇宙大家庭。</p>'
      + '<span class="stamp ' + (rv.pass ? 'pass' : 'fail') + '">' + (rv.pass ? '錄取' : '人才庫') + '</span>'
      + '</div><div class="btn-row"><button class="btn primary" type="button" data-do="ok">' + (rv.pass ? '……' : '繼續生活') + '</button></div></div>';
  }

  // ---------- 標題、開局、結局 ----------
  function titlePanel(meta, hasSave) {
    const endings = meta.endings ? Object.keys(meta.endings).length : 0;
    const recipes = meta.recipes ? Object.keys(meta.recipes).length : 0;
    return '<div class="title-menu">'
      + '<p class="tagline">份工越做越<em>爽</em>，靈魂越做越少。</p>'
      + '<p class="lede">2080 年，海平面暴升，浮城越高越有錢、越低越浸水。靈感強嘅人一個接一個被外星人帶走。你要打工捱過每一期租，同時保住火花，燒到大到外星人睇得見。</p>'
      + '<div class="btn-row">'
      + (hasSave ? '<button class="btn primary big" type="button" data-do="continue">繼續上一局</button>' : '')
      + '<button class="btn ' + (hasSave ? '' : 'primary big') + '" type="button" data-do="new">' + (hasSave ? '放棄，開新一局' : '開始') + '</button>'
      + '</div>'
      + '<div class="btn-row"><button class="btn" type="button" data-do="help">玩法</button><button class="btn" type="button" data-do="collection">收藏</button></div>'
      + '<div class="stats-row"><span>玩過 <b>' + (meta.runs || 0) + '</b> 局</span><span>結局 <b>' + endings + '/5</b></span><span>組合 <b>' + recipes + '/' + D().RECIPES.length + '</b></span>'
      + (meta.relics && meta.relics.length ? '<span>舊城入面有 <b>' + meta.relics.length + '</b> 件你前世嘅作品</span>' : '') + '</div>'
      + '<p class="mute" style="font-size:12px;margin:0">自動存檔，冇得 SL。建議開聲。</p>'
      + '</div>';
  }
  function setupPanel(sel) {
    const bgs = D().BACKGROUNDS, seasons = D().SEASONS;
    return '<div class="panel-head"><h2>你係邊個？</h2><p>開局背景決定起始資源同專長。</p></div>'
      + '<div class="bg-grid">' + Object.keys(bgs).map((k) => {
        const b = bgs[k];
        return '<button class="bg-card' + (sel.bg === k ? ' sel' : '') + '" type="button" data-do="bg" data-id="' + k + '">'
          + '<span class="n">' + b.name + '</span><span class="d">' + b.desc + '</span><span class="p">' + b.perkText + '</span>'
          + '<span class="s"><span style="color:var(--cash)">$' + b.cr + '</span><span style="color:#ffb3b3">身體 ' + b.body + '</span><span style="color:var(--spark)">火花 ×' + b.spark.toFixed(1) + '</span></span></button>';
      }).join('') + '</div>'
      + '<div class="panel-head"><h2>季節</h2><p>' + esc(seasons[sel.season].desc) + '</p></div>'
      + '<div class="seg">' + Object.keys(seasons).map((k) => '<button type="button" class="' + (sel.season === k ? 'sel' : '') + '" data-do="season" data-id="' + k + '">' + seasons[k].name + '</button>').join('') + '</div>'
      + '<div class="btn-row"><button class="btn" type="button" data-do="back">返轉頭</button><button class="btn primary big" type="button" data-do="start">落地</button></div>';
  }
  const ENDING_KIND = { death: 'DEATH', grey: 'GREYED OUT', ordinary: 'ORDINARY', agent: 'RECRUITED', returned: 'RETURNED' };
  function endingModal(e, s, meta) {
    const best = s.stats.bestWork;
    return '<div class="modal"><div class="ending ' + e.kind + '">'
      + '<span class="e-kind">' + ENDING_KIND[e.kind] + '・第 ' + s.day + ' 日</span>'
      + '<h2>' + esc(e.title) + '</h2>'
      + '<p class="epitaph">' + esc(e.text) + '</p>'
      + '<div class="e-stats">'
      + '<div class="e-stat"><span class="k">作品</span><span class="num">' + s.works.length + '</span></div>'
      + '<div class="e-stat"><span class="k">累積訊號</span><span class="num">' + kfmt(R().signal(s)) + '</span></div>'
      + '<div class="e-stat"><span class="k">標註</span><span class="num">' + fmt(s.stats.labels) + '</span></div>'
      + '<div class="e-stat"><span class="k">賺過</span><span class="num">$' + kfmt(s.stats.crEarned) + '</span></div>'
      + '<div class="e-stat"><span class="k">餓過</span><span class="num">' + s.stats.hungryDays + ' 晚</span></div>'
      + '</div>'
      + (best ? '<p class="mute" style="font-size:14px">最好嘅作品：《' + esc(best.name) + '》（' + fmt(best.raw) + ' 分）。佢會沉落舊城，等下一局嘅你撈返上嚟。</p>' : '')
      + '<div class="btn-row" style="width:100%"><button class="btn" type="button" data-do="copy">複製墓誌銘</button><button class="btn primary" type="button" data-do="again">再嚟一局</button></div>'
      + '<p class="mute" style="font-size:12px">結局收集 ' + Object.keys(meta.endings || {}).length + '/5</p>'
      + '</div></div>';
  }
  function helpModal() {
    return '<div class="modal wide"><h2>點玩</h2><div class="help">'
      + '<p>你有 30 日。每日三個時段，每個時段做一件事。第 10、20、30 日夜晚係<b>篩選日</b>：你嘅累積訊號夠高，外星人就會帶你走。</p>'
      + '<h3>三樣嘢互相蠶食</h3><ul>'
      + '<li><b>錢</b>：每晚要食飯，每 5 日要交租。交唔到兩次就被趕出街。</li>'
      + '<li><b>身體</b>：跌到 0 就死。</li>'
      + '<li><b>火花</b>：創作嘅倍率。打工會扣，越熟手扣得越多。火花低過 ×1 就會麻木，唔可以創作；連續 4 晚冇火花，你會灰化。</li></ul>'
      + '<h3>創作</h3><p>作品分 = 素材籌碼 × 組合倍率 × 火花 × 外星 KPI。素材嚟自生活：打工、潛水、傾偈、甚至捱餓。同一標籤嘅素材越多越有共鳴，特定標籤組合會觸發具名組合。</p>'
      + '<h3>小貼士</h3><ul>'
      + '<li>打工做得越準越快，錢越多，但火花亦燒得越快。份爽係陷阱。</li>'
      + '<li>情緒陪伴：完美笑容最值錢，亦最傷。偶然「OK」一下，保住自己。</li>'
      + '<li>AI 數據標註做得越多，全城越快自動化，你份工會消失。故意標錯可以拖慢佢。</li>'
      + '<li>水位每日都升。浸到你層樓就要搬上去，租亦會貴。</li>'
      + '<li>每季外星 KPI 都唔同，記得睇手機嘅招募簡報。</li></ul>'
      + '<h3>操作</h3><p>鍵盤：數字鍵揀行動；標註用 ← →；陪笑用空白鍵；潛水用方向鍵。手機：直接撳畫面或者下面嘅掣。</p>'
      + '</div><div class="btn-row"><button class="btn primary" type="button" data-do="close">明白</button></div></div>';
  }
  function collectionModal(meta) {
    const names = { agent: '星際特工', returned: '被遣返', ordinary: '平凡人', death: '死亡', grey: '灰化' };
    const endings = Object.keys(names).map((k) => '<div class="recipe' + (meta.endings && meta.endings[k] ? '' : ' unknown') + '"><b>' + (meta.endings && meta.endings[k] ? names[k] : '？？？') + '</b>'
      + (meta.endings && meta.endings[k] ? '<span class="mute">達成 ' + meta.endings[k] + ' 次</span>' : '') + '</div>').join('');
    const recipes = D().RECIPES.map((r) => {
      const known = meta.recipes && meta.recipes[r.id];
      const tags = Object.keys(r.need).map((t) => (r.need[t] > 1 ? D().TAGS[t].name + '×' + r.need[t] : D().TAGS[t].name));
      return '<div class="recipe' + (known ? '' : ' unknown') + '"><b>' + (known ? r.name : '？？？') + '</b><span>' + (known ? tags.join(' + ') : tags[0] + ' + …') + '</span><span class="mute">倍率 +' + r.mult + '</span></div>';
    }).join('');
    return '<div class="modal wide"><h2>收藏</h2><h3>結局</h3><div class="recipes">' + endings + '</div><h3>具名組合</h3><div class="recipes">' + recipes + '</div>'
      + '<div class="btn-row"><button class="btn primary" type="button" data-do="close">收埋</button></div></div>';
  }

  IE.UI = {
    esc, fmt, kfmt, signed, tagsHtml, cardHtml, fxHtml, deltasHtml, linesHtml, gainedHtml,
    renderHud, setPanel, modal, closeModal, modalOpen, bindDelegation, toast,
    actionsPanel, invHtml, chatPanel, controlsPanel, reportModal, settleModal, phoneModal, reviewModal,
    titlePanel, setupPanel, endingModal, helpModal, collectionModal,
  };
})(window.IE = window.IE || {});
