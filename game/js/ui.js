// 介面：狀態列、行動卡、手機、結算、考績表、結局。這裡只負責組合 HTML，流程在 main.js。
(function (IE) {
  'use strict';
  const D = () => IE.DATA;
  const R = () => IE.Rules;
  const $ = (sel) => document.querySelector(sel);

  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  // 大數字：萬、億
  const kfmt = (n) => (n >= 1e8 ? (n / 1e8).toFixed(2) + '億' : n >= 1e4 ? (n / 1e4).toFixed(n >= 1e6 ? 0 : 1) + '萬' : fmt(n));
  const pad2 = (n) => String(n).padStart(2, '0');
  const signed = (v, d) => (v > 0 ? '+' : v < 0 ? '−' : '±') + (d ? Math.abs(v).toFixed(d) : fmt(Math.abs(v)));

  function tagsHtml(tags) {
    return tags.map((t) => '<span class="tag" style="--c:' + D().TAGS[t].color + '">' + D().TAGS[t].name + '</span>').join('');
  }
  function cardHtml(c, o) {
    o = o || {};
    const tag = o.button ? 'button' : 'div';
    const attrs = o.button ? ' type="button" data-do="' + (o.action || 'card') + '" data-uid="' + c.uid + '"' : '';
    return '<' + tag + ' class="card' + (c.legacy ? ' legacy' : '') + (c.guilt ? ' guilt' : '') + (c.rarity ? ' r-' + c.rarity : '') + (o.sel ? ' sel' : '') + '"' + attrs + (o.disabled ? ' disabled' : '') + '>'
      + (c.rarity === 'legend' ? '<span class="c-rar">極稀有</span>' : c.rarity === 'rare' ? '<span class="c-rar">稀有</span>' : '')
      + '<span class="c-name">' + esc(c.name) + '</span>'
      + (c.origin && c.origin !== 'home' && D().REGIONS ? '<span class="c-origin">' + esc(D().REGIONS[c.origin]) + '</span>' : '')
      + '<span class="c-foot"><span class="tags">' + tagsHtml(c.tags) + '</span><span class="c-val">' + c.value + '</span></span>'
      + (c.grams ? '<span class="c-grams">寫進作品可卸下 ' + c.grams + ' 克</span>' : '')
      + (c.mod ? '<span class="c-mod" style="--c:' + D().CARD_MODS[c.mod].color + '">' + D().CARD_MODS[c.mod].name + '</span>' : '')
      + (c.wear ? '<span class="c-wear">' + (c.wear >= 4 ? '陳腔濫調' : '用過 ×' + c.wear) + '</span>' : '')
      + '</' + tag + '>';
  }
  function fxHtml(fx) {
    const label = { cr: '$', body: '身體', spark: '火花', card: '素材', sig: '', soul: '靈魂', note: '', danger: '⚠', rare: '★' };
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
    const evs = R().eventsInfo(s);
    const gb = (g) => '<b class="gbadge g-' + g + '">' + g + '</b>';
    const conds = R().condsInfo(s);
    const orisk = R().outdoorRisk(s), hrisk = R().homeRisk(s);
    const danger = evs.map((w) => '<span class="chip world" title="' + esc(D().SCOPES[w.scope].name + '：' + w.news) + '">' + gb(w.grade) + esc(w.name) + '・剩 ' + w.left + ' 天</span>').join('')
      + (s.pending && s.pending.length ? '<span class="chip omen" title="手機動態裡有預兆">預兆 ×' + s.pending.length + '</span>' : '')
      + conds.map((c) => '<span class="chip ' + (c.lethal ? 'warn' : 'cond') + '" title="' + esc(c.desc) + '">' + esc(c.name) + (c.lethal ? '・' + c.left + ' 天後致命' : '・第 ' + c.days + ' 天') + '</span>').join('')
      + (s.noRest >= 3 ? '<span class="chip ' + (s.noRest >= 4 ? 'warn' : 'cond') + '">連續 ' + s.noRest + ' 天沒有休息' + (s.noRest >= 4 ? '・猝死危險' : '') + '</span>' : '')
      + (orisk > 0 ? '<span class="chip warn">外出致命 ' + Math.round(orisk * 1000) / 10 + '%</span>' : '')
      + (hrisk > 0 && !s.trip ? '<span class="chip warn">今晚在家致命 ' + Math.round(hrisk * 1000) / 10 + '%</span>' : '')
      + (IE.World && IE.World.stamps(s) ? '<span class="chip stamp" title="護照印章：3 個手牌 +1、6 個物件欄 +1、10 個每晚多一次下筆">護照印章 ×' + IE.World.stamps(s) + '</span>' : '')
      + (s.trip ? '<span class="chip trip">旅行中：' + esc(D().DEST[s.trip.dest].name) + '・第 ' + s.trip.until + ' 天晚上回程</span>' : '')
      + (IE.World && !s.trip && IE.World.tripMult(s) > 1 ? '<span class="chip glow">旅行的餘韻 ×' + IE.World.tripMult(s) + '・至第 ' + s.glow.until + ' 天</span>' : '');
    const bmax = R().bodyMax(s);
    const rentChip = s.floor > 0
      ? '<span class="chip' + (toRent <= 1 && s.cr < rent ? ' warn' : '') + '">交租 ' + (toRent === 0 ? '今晚' : toRent + ' 天後') + ' · $' + fmt(rent) + '</span>'
      : '<span class="chip warn">露宿天橋下</span>';
    hud.innerHTML = ''
      + '<div class="hud-top">'
      + '<div class="hud-day">' + IE.Chars.img(s.bg, 2) + '<span class="px">Day</span><span class="num">' + pad2(s.day) + '</span><span class="num mute">/' + D().DAYS + '</span><span>· ' + D().SLOTS[s.slot] + '</span></div>'
      + '<span class="chip season">' + season.name + '</span>' + rentChip
      + '<span class="chip' + (toReview === 0 ? ' warn' : '') + '">' + (toReview === 0 ? '今晚是篩選日' : '篩選日在 ' + toReview + ' 天後') + '</span>'
      + danger
      + '<div class="hud-btns">'
      + '<button class="icon-btn" type="button" data-hud="stats">能力</button>'
      + '<button class="icon-btn" type="button" data-hud="phone">手機' + (s.morning && s.morning.day === s.day && D().ASTAR[s.day] ? '<span class="dot"></span>' : '') + '</button>'
      + '<button class="icon-btn" type="button" data-hud="help">玩法</button>'
      + '<button class="icon-btn" type="button" data-hud="mute" aria-pressed="' + IE.Audio.muted + '">' + (IE.Audio.muted ? '靜音' : '聲音') + '</button>'
      + '</div></div>'
      + '<div class="hud-meters">'
      + '<div class="meter m-cash"><span class="lbl">$ 信用點</span><b class="num">' + fmt(s.cr) + '</b></div>'
      + '<div class="meter m-body"><span class="lbl">身體</span><div class="bar"><i style="width:' + Math.max(0, s.body / bmax * 100) + '%"></i></div><b class="num">' + Math.max(0, Math.round(s.body)) + '<small>/' + bmax + '</small></b></div>'
      + '<div class="meter m-spark' + (s.spark < 1 ? ' numb' : '') + '"><span class="lbl">' + (s.spark < 1 ? '麻木' : '火花') + '</span><div class="bar"><i style="width:' + (s.spark / R().SPARK_MAX * 100) + '%"></i></div><b class="num">×' + s.spark.toFixed(1) + '</b></div>'
      + '<div class="meter m-soul' + (s.soul > R().SOUL_LIMIT ? ' over' : '') + '"><span class="lbl">靈魂</span><div class="bar"><i style="width:' + Math.min(100, s.soul / 30 * 100) + '%"></i><em style="left:' + (R().SOUL_LIMIT / 30 * 100) + '%"></em></div><b class="num">' + s.soul.toFixed(1) + '<small>克</small></b></div>'
      + '<div class="meter m-signal"><span class="lbl">訊號</span><div class="bar"><i style="width:' + Math.min(100, sig / th * 100) + '%"></i></div><b class="num">' + kfmt(sig) + '/' + kfmt(th) + '</b></div>'
      + '</div>'
      + '<div class="hud-sub">'
      + '<span>良知 <b class="pips">' + pips(s.conscience) + '</b> <b>' + Math.round(s.conscience * 100) + '%</b>・火花上限 <b>×' + R().sparkMax(s).toFixed(1) + '</b></span>'
      + '<span>平台評分 <b>★' + s.rating.toFixed(1) + '</b></span>'
      + '<span>全城自動化 <b>' + s.auto.toFixed(0) + '%</b></span>'
      + '<span class="' + (s.paranoia >= 60 ? 'bad' : '') + '">偏執 <b>' + Math.round(s.paranoia) + '%</b></span>'
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
  // 疊加的對話框（能力值、玩法）：關閉後回到原本的對話框，不會打斷流程
  const stack = [];
  function pushModal(html, handlers, opts) {
    const wrap = $('#modal');
    if (!wrap.hidden) stack.push({ html: wrap.innerHTML, handlers: modalHandlers, opts: modalOpts });
    modal(html, handlers, opts);
  }
  function closeModal() {
    const wrap = $('#modal');
    const prev = stack.pop();
    if (prev) {
      wrap.classList.add('static');
      wrap.innerHTML = prev.html; modalHandlers = prev.handlers; modalOpts = prev.opts;
      return;
    }
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
  const GROUPS = { work: '工作：賺錢，但會消耗火花', life: '生活：收集素材、恢復火花', night: '晚上', trip: '旅行：探索、找素材' };
  function actionsPanel(s, list) {
    const night = R().isNight(s);
    const hint = s.trip && !night ? '你在' + D().DEST[s.trip.dest].name + '。每個時段探索一個地方；極稀有素材只在特定時機出現。'
      : night ? '晚上可以創作：作品分 = 素材籌碼 × 組合倍率 × 火花 × KPI。'
        : '工作賺錢會消耗火花；潛水、表演和聊天可以收集素材；沒錢就沒有地方住。也可以直接在上面的地圖點選地點。';
    let i = 0;
    const groups = [...new Set(list.map((a) => a.group))];
    return '<div class="panel-head"><h2>' + D().SLOTS[s.slot] + '：要做什麼？</h2><p>' + hint + '</p>'
      + '<div class="btn-row left">' + (s.trip ? '<button class="btn mini" type="button" data-do="souvenir">紀念品店</button>' : '<button class="btn mini" type="button" data-do="store">浮城百貨</button>') + '</div></div>'
      + groups.map((g) => (groups.length > 1 ? '<h3 class="act-group">' + GROUPS[g] + '</h3>' : '')
        + '<div class="acts">' + list.filter((a) => a.group === g).map((a) => {
          i++;
          return '<button class="act" type="button" data-do="act" data-id="' + a.id + '"' + (a.enabled ? '' : ' disabled') + '>'
            + '<span class="act-key">' + (i % 10) + '</span><span class="act-name">' + a.name + '</span><span class="act-sub">' + esc(a.sub) + '</span>'
            + '<span class="fx">' + fxHtml(a.fx) + '</span>' + (a.reason ? '<span class="act-why">' + esc(a.reason) + '</span>' : '') + '</button>';
        }).join('') + '</div>').join('')
      + invHtml(s);
  }
  function invHtml(s) {
    const objs = s.objects.map((id) => '<span class="inv-obj" title="' + esc(D().OBJ[id].name + '：' + D().OBJ[id].desc) + '">' + IE.Icons.obj(id, 32) + '<small>' + esc(D().OBJ[id].name) + '</small></span>').join('');
    return '<div class="inv-wrap"><div class="inv-head"><span>靈感物件 ' + s.objects.length + ' / ' + s.objSlots + (s.objStash.length ? '・儲物箱 ' + s.objStash.length : '') + '</span>'
      + '<button class="btn mini" type="button" data-do="objs">管理物件</button></div>'
      + '<div class="inv-objs">' + (objs || '<span class="mute" style="font-size:13px">還沒有靈感物件。朋友、潛水、事件和二手市集都可以找到。</span>') + '</div>'
      + '<div class="inv-head"><span>素材庫 ' + s.cards.length + ' / ' + R().MAX_CARDS + '</span><span>晚上用來創作・用得越多次越殘・滿了會丟掉最殘的一張</span></div>'
      + '<div class="inv">' + (s.cards.length ? s.cards.map((c) => cardHtml(c)).join('') : '<span class="mute" style="font-size:13px">還沒有素材。先去生活吧。</span>') + '</div></div>';
  }
  function objectsModal(s) {
    const D_ = D();
    const row = (id, equipped, i) => {
      const o = D_.OBJ[id];
      return '<div class="obj-row r-' + o.rarity + '">' + IE.Icons.obj(id, 44)
        + '<div class="obj-txt"><b>' + esc(o.name) + '</b><span class="mute">' + D_.RARITY[o.rarity] + '</span><span>' + esc(o.desc) + '</span></div>'
        + '<div class="obj-btns">'
        + (equipped ? '<button class="btn mini" type="button" data-do="left" data-id="' + id + '"' + (i === 0 ? ' disabled' : '') + '>←</button>'
          + '<button class="btn mini" type="button" data-do="right" data-id="' + id + '"' + (i === s.objects.length - 1 ? ' disabled' : '') + '>→</button>'
          + '<button class="btn mini" type="button" data-do="unequip" data-id="' + id + '"' + (s.objStash.length >= 4 ? ' disabled' : '') + '>卸下</button>'
          : '<button class="btn mini sea" type="button" data-do="equip" data-id="' + id + '"' + (s.objects.length >= s.objSlots ? ' disabled' : '') + '>裝備</button>')
        + '<button class="btn mini" type="button" data-do="sell" data-id="' + id + '">賣 $' + Math.round(D_.OBJ_PRICE[o.rarity] / 2) + '</button></div></div>';
    };
    return '<div class="modal wide"><h2>靈感物件</h2>'
      + '<p class="mute" style="font-size:13px">裝備中的物件會在創作計分時由左至右觸發（碎鏡會複製右邊那件）。物件欄 ' + s.objects.length + ' / ' + s.objSlots + '，儲物箱最多 4 件。</p>'
      + '<h3>裝備中</h3>' + (s.objects.map((id, i) => row(id, true, i)).join('') || '<p class="mute">沒有</p>')
      + '<h3>儲物箱</h3>' + (s.objStash.map((id) => row(id, false)).join('') || '<p class="mute">沒有</p>')
      + '<div class="btn-row"><button class="btn primary" type="button" data-do="close">完成</button></div></div>';
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
      + (l.v != null ? '<span class="v">' + (l.stat === 'spark' || l.stat === 'para' ? signed(l.v, 1) : l.stat === 'soul' ? signed(l.v, 1) + '<small>克</small>' : signed(l.v)) + '</span>' : '') + '</li>').join('') + '</ul>';
  }
  function statsDeltaHtml(st) {
    const keys = Object.keys(st || {});
    if (!keys.length) return '';
    return '<div class="stat-deltas">' + keys.map((k) => '<span class="sd' + (st[k] < 0 ? ' neg' : '') + '">' + D().STATS[k].name + ' ' + signed(st[k], 1) + '</span>').join('') + '</div>';
  }
  function gainedHtml(rep) {
    let h = '';
    if (rep.objs && rep.objs.length) h += '<h3>獲得靈感物件</h3><div class="gained">' + rep.objs.map((id) => '<div class="obj-row r-' + D().OBJ[id].rarity + '">' + IE.Icons.obj(id, 40)
      + '<div class="obj-txt"><b>' + esc(D().OBJ[id].name) + '</b><span>' + esc(D().OBJ[id].desc) + '</span></div></div>').join('') + '</div>';
    if (rep.cards.length) h += '<h3>獲得素材</h3><div class="gained">' + rep.cards.map((c) => cardHtml(c)).join('') + '</div>';
    if (rep.dropped.length) h += '<p class="mute" style="font-size:13px">素材太多，丟掉了：' + rep.dropped.map((c) => esc(c.name)).join('、') + '</p>';
    return h;
  }
  function reportModal(rep, btnLabel) {
    return '<div class="modal"><h2>' + esc(rep.title) + '</h2>' + deltasHtml(rep.deltas) + linesHtml(rep.lines) + statsDeltaHtml(rep.stats) + gainedHtml(rep)
      + '<div class="btn-row"><button class="btn primary" type="button" data-do="ok">' + (btnLabel || '繼續') + '</button></div></div>';
  }
  function settleModal(rep) {
    const btn = rep.review ? '查看考績' : rep.ending ? '……' : rep.interview ? '睡著了……' : '睡覺';
    return '<div class="modal"><h2>' + esc(rep.title) + '</h2>' + deltasHtml(rep.deltas) + linesHtml(rep.lines) + statsDeltaHtml(rep.stats) + gainedHtml(rep)
      + '<div class="btn-row"><button class="btn primary" type="button" data-do="ok">' + btn + '</button></div></div>';
  }

  // ---------- 手機 ----------
  function phoneModal(s, m, shopItems, opts) {
    const who = { weather: '天文台', news: '新聞', ad: '贊助', post: '浮聲網民', alien: '星際人才發展局', warn: '危險提示', world: '突發新聞', omen: '預兆', comm: '天空區畫廊' };
    const feed = m.feed.map((p) => '<div class="post ' + p.kind + (p.fake ? ' fake' : '') + '"><span class="who">' + (p.grade ? '<b class="gbadge g-' + p.grade + '">' + p.grade + '</b>' : '') + (who[p.kind] || '') + '</span>' + esc(p.text) + '</div>').join('');
    const astar = m.astar ? '<span class="msg-head">阿星（神秘頻道）</span><div class="msg ' + m.astar.style + '">' + esc(m.astar.text) + '</div>' : '';
    const battery = Math.max(1, 100 - s.day);
    // 今日推介：有需要的保命用品優先，其次是二手市集的靈感物件
    const urgent = shopItems.filter((it) => it.enabled && (it.id === 'medicine' || (it.cat === 'safe' && IE.Rules.outdoorRisk(s) > 0 && (it.id === 'helmet' || it.id === 'gasmask'))));
    const picks = urgent.concat(shopItems.filter((it) => it.enabled && it.obj)).slice(0, 2);
    const shop = '<h3>浮城百貨</h3><div class="shop">' + picks.map((it) => '<div class="shop-item has-icon">' + (it.obj ? IE.Icons.obj(it.obj, 36) : IE.Icons.item(it.icon, 36)) + '<div><div class="n">' + esc(it.name) + '</div><div class="d">' + esc(it.note || it.desc) + '</div></div>'
      + '<button class="btn sea" type="button" data-do="buy" data-id="' + it.id + '">$' + fmt(it.cost) + '</button></div>').join('')
      + '<button class="btn store-open" type="button" data-do="store">打開浮城百貨（' + shopItems.length + ' 件貨品）</button></div>';
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
    const types = meta.archetypes ? Object.keys(meta.archetypes).length : 0;
    const recipes = meta.recipes ? Object.keys(meta.recipes).length : 0;
    return '<div class="title-menu">'
      + '<p class="tagline">工作越做越<em>爽</em>，靈魂越做越少。</p>'
      + '<p class="lede">2080 年，海平面暴漲，浮城越高越富有、越低越淹水。靈感強的人一個接一個被外星人帶走。外星人只要又亮又輕、沒有包袱的人：你的火花要夠旺，靈魂又不能超過 21 克。可是在這個城市，活下去本身就會讓靈魂變重。</p>'
      + '<div class="btn-row">'
      + (hasSave ? '<button class="btn primary big" type="button" data-do="continue">繼續上一局</button>' : '')
      + '<button class="btn ' + (hasSave ? '' : 'primary big') + '" type="button" data-do="new">' + (hasSave ? '放棄並開始新一局' : '開始') + '</button>'
      + '</div>'
      + '<div class="btn-row"><button class="btn" type="button" data-do="help">玩法</button><button class="btn" type="button" data-do="collection">收藏</button>'
      + '<button class="btn gacha-btn" type="button" data-do="gacha">人才扭蛋機<small>扭蛋券 ' + (meta.tickets || 0) + '</small></button></div>'
      + '<div class="stats-row"><span>已玩 <b>' + (meta.runs || 0) + '</b> 局</span><span>結局 <b>' + endings + '/' + ENDING_COUNT + '</b></span><span>人類模組 <b>' + types + '/' + IE.Dossier.ARCHETYPES.length + '</b></span><span>死法 <b>' + Object.keys(meta.deaths || {}).length + '/' + D().DEATHS.length + '</b></span><span>事件 <b>' + Object.keys(meta.eventsSeen || {}).length + '/' + (D().WORLD_EVENTS.length + D().EVENTS.length) + '</b></span><span>組合 <b>' + recipes + '/' + D().RECIPES.length + '</b></span><span>角色 <b>' + IE.Roster.list(meta).filter((c) => c.open).length + '/' + Object.keys(D().BACKGROUNDS).length + '</b></span>'
      + (meta.relics && meta.relics.length ? '<span>舊城裡有 <b>' + meta.relics.length + '</b> 件你前世的作品</span>' : '') + '</div>'
      + '<p class="mute" style="font-size:12px;margin:0">自動存檔，無法讀檔重來。建議開啟聲音。</p>'
      + '</div>';
  }
  // 能力值條：單一色相的橫條，數值直接標在旁邊（0 至 100）
  function statBars(attr, o) {
    o = o || {};
    const keys = o.keys || D().STAT_KEYS;
    return '<div class="statbars' + (o.compact ? ' compact' : '') + '">' + keys.map((k) => {
      const v = Math.round(attr[k]);
      const d = o.delta && o.delta[k] ? Math.round(o.delta[k]) : 0;
      return '<div class="sb" title="' + esc(D().STATS[k].name + '：' + D().STATS[k].desc) + '"><span class="sb-k">' + D().STATS[k].name + '</span>'
        + '<span class="sb-track"><i style="width:' + v + '%"></i></span><span class="sb-v num">' + v
        + (d ? '<small class="' + (d < 0 ? 'neg' : 'pos') + '">' + (d > 0 ? '+' : '−') + Math.abs(d) + '</small>' : '') + '</span></div>';
    }).join('') + '</div>';
  }
  const topStats = (attr, n) => D().STAT_KEYS.slice().sort((a, b) => attr[b] - attr[a]).slice(0, n);
  function setupPanel(sel, meta) {
    const bgs = D().BACKGROUNDS, seasons = D().SEASONS, RA = D().CHAR_RARITY;
    const roster = IE.Roster.list(meta);
    const b = bgs[sel.bg];
    const open = IE.Roster.unlocked(meta, sel.bg);
    const card = (x) => '<button class="bg-card r-' + x.rarity + (sel.bg === x.id ? ' sel' : '') + (x.open ? '' : ' locked') + '" type="button" data-do="bg" data-id="' + x.id + '">'
      + '<span class="bg-top"><span class="rar r-' + x.rarity + '">' + x.rarity + '</span>' + (x.alien ? '<span class="alien-tag">非地球人</span>' : '') + '</span>'
      + '<span class="bg-por">' + IE.Chars.img(x.id, 5, !x.open) + '</span>'
      + '<span class="n">' + (x.open ? x.name : '？？？') + '</span>'
      + (x.open ? '<span class="p">' + x.perkText + '</span>'
        + '<span class="s"><span style="color:var(--cash)">$' + x.cr + '</span><span style="color:var(--spark)">火花 ×' + x.spark.toFixed(1) + '</span><span style="color:var(--stone)">' + x.soul + '<small>克</small></span></span>'
        : '<span class="d">解鎖：' + esc(x.unlock.text) + '</span>') + '</button>';
    const group = (r, title) => '<h3 class="act-group"><span class="rar r-' + r + '">' + r + '</span>' + title + '（' + roster.filter((x) => x.rarity === r && x.open).length + '/' + roster.filter((x) => x.rarity === r).length + '）</h3>'
      + '<div class="bg-grid">' + roster.filter((x) => x.rarity === r).map(card).join('') + '</div>';
    return '<div class="panel-head"><h2>你是誰？</h2><p>二十種人生（包括幾個不是地球人的），分為 R、SR、UR。新角色要跨局達成條件，或者用人才扭蛋機抽出來。</p></div>'
      + group('R', '普通人') + group('SR', '稀有人才') + group('UR', '極稀有（包括外星人）')
      + '<div class="bg-detail r-' + b.rarity + '"><div class="bg-big">' + IE.Chars.img(sel.bg, 8, !open) + '</div><div><h3><span class="rar r-' + b.rarity + '">' + b.rarity + '</span>' + (open ? b.name : '？？？') + '</h3>'
      + (open ? '<p class="mute">' + b.desc + b.past + '</p><p class="p">' + b.perkText + '</p>'
        + '<p>靈魂 <b>' + b.soul + ' 克</b>・良知 <b>' + Math.round(b.conscience * 100) + '%</b>・身體上限 <b>' + Math.round((70 + 0.3 * b.stats.fit) * (b.perk.bodyMult || 1)) + '</b>・住 <b>' + b.floor + ' 樓</b>・擅長 <b>' + topStats(b.stats, 3).map((k) => D().STATS[k].name).join('、') + '</b></p>'
        : '<p class="act-why">未解鎖：' + esc(b.unlock.text) + '</p><p class="mute">也可以用人才扭蛋機抽出來（每次 ' + IE.Roster.GACHA_COST + ' 張扭蛋券，你有 ' + ((meta && meta.tickets) || 0) + ' 張）。</p>')
      + '</div>' + (open ? statBars(b.stats, { compact: true }) : '') + '</div>'
      + '<div class="panel-head"><h2>起始季節</h2><p>' + esc(seasons[sel.season].desc) + '季節每 25 天輪替一次。</p></div>'
      + '<div class="seg">' + Object.keys(seasons).map((k) => '<button type="button" class="' + (sel.season === k ? 'sel' : '') + '" data-do="season" data-id="' + k + '">' + seasons[k].name + '</button>').join('') + '</div>'
      + '<div class="btn-row"><button class="btn" type="button" data-do="back">返回</button><button class="btn" type="button" data-do="gacha">人才扭蛋機（' + ((meta && meta.tickets) || 0) + '）</button>'
      + '<button class="btn primary big" type="button" data-do="start"' + (open ? '' : ' disabled') + '>' + (open ? '出發' : '未解鎖') + '</button></div>';
  }
  // 人才扭蛋機：星際人才發展局出品，抽出你的下一世
  function gachaModal(meta, result, spinning) {
    const RA = D().CHAR_RARITY;
    const locked = IE.Roster.list(meta).filter((c) => !c.open);
    const t = (meta && meta.tickets) || 0, cost = IE.Roster.GACHA_COST;
    const w = locked.reduce((a, c) => a + RA[c.rarity].w, 0);
    const odds = ['SR', 'UR'].map((r) => { const n = locked.filter((c) => c.rarity === r).reduce((a, c) => a + RA[c.rarity].w, 0); return r + ' ' + (w ? Math.round(n / w * 100) : 0) + '%'; }).join('・');
    let res = '';
    if (result) {
      const b = D().BACKGROUNDS[result];
      res = '<div class="gacha-result r-' + b.rarity + '"><span class="rar r-' + b.rarity + '">' + b.rarity + '</span>' + IE.Chars.img(result, 8) + '<h3>' + esc(b.name) + '</h3><p>' + esc(b.perkText) + '</p><p class="mute">' + esc(b.desc) + '</p></div>';
    }
    return '<div class="modal gacha"><span class="eyebrow">星際人才發展局・人才扭蛋機</span><h2>抽出你的下一世</h2>'
      + '<p class="mute" style="font-size:13px">每局結束都會得到扭蛋券（被選中或留下來守護地球得到更多）。每次扭蛋 ' + cost + ' 張，只會抽到你還沒有的角色。機會率：' + (locked.length ? odds : '—') + '。本局保證：你抽到的就是你。</p>'
      + '<div class="gacha-machine' + (spinning ? ' spin' : '') + '"><div class="globe">' + [0, 1, 2, 3, 4, 5].map((i) => '<i style="--i:' + i + '"></i>').join('') + '</div><div class="slot"></div></div>'
      + res
      + '<p class="tickets">扭蛋券 <b>' + t + '</b> 張・未解鎖角色 <b>' + locked.length + '</b> 個</p>'
      + '<div class="btn-row"><button class="btn primary" type="button" data-do="pull"' + (t >= cost && locked.length && !spinning ? '' : ' disabled') + '>扭一次（' + cost + ' 張）</button>'
      + '<button class="btn" type="button" data-do="close"' + (spinning ? ' disabled' : '') + '>離開</button></div></div>';
  }
  // 浮城百貨：分類貨架，每件貨品都有像素模組
  function storeModal(s, cat) {
    const items = R().shop(s);
    const cats = R().SHOP_CATS;
    const list = items.filter((it) => it.cat === cat);
    const tabs = Object.keys(cats).map((k) => '<button type="button" class="store-tab' + (k === cat ? ' on' : '') + '" data-do="tab" data-id="' + k + '">' + cats[k]
      + '<small>' + items.filter((it) => it.cat === k && it.enabled).length + '</small></button>').join('');
    const cards = list.map((it) => '<div class="store-item' + (it.owned ? ' owned' : '') + (it.obj ? ' r-' + D().OBJ[it.obj].rarity : '') + '">'
      + '<div class="store-icon">' + (it.obj ? IE.Icons.obj(it.obj, 48) : IE.Icons.item(it.icon, 48)) + '</div>'
      + '<div class="store-txt"><b>' + esc(it.name) + '</b><span>' + esc(it.desc) + '</span>' + (it.note ? '<span class="mute">' + esc(it.note) + '</span>' : '') + '</div>'
      + '<button class="btn mini' + (it.enabled ? ' sea' : '') + '" type="button" data-do="buy" data-id="' + it.id + '"' + (it.enabled ? '' : ' disabled') + '>' + (it.owned ? '已擁有' : '$' + fmt(it.cost)) + '</button></div>').join('');
    return '<div class="modal wide store"><span class="eyebrow">浮城百貨・24 小時營業</span><h2>浮城百貨</h2>'
      + '<div class="store-cash">你有 <b class="num">$' + fmt(s.cr) + '</b></div>'
      + '<div class="store-tabs">' + tabs + '</div><div class="store-grid">' + (cards || '<p class="mute">這個貨架今天是空的。</p>') + '</div>'
      + '<div class="btn-row"><button class="btn primary" type="button" data-do="close">離開</button></div></div>';
  }
  function souvenirModal(s) {
    const d = D().DEST[s.trip.dest];
    const items = IE.World.souvenirs(s).map((o) => '<div class="store-item r-' + o.rarity + (o.owned ? ' owned' : '') + '"><div class="store-icon">' + IE.Icons.obj(o.id, 48) + '</div>'
      + '<div class="store-txt"><b>' + esc(o.name) + '</b><span>' + esc(o.desc) + '</span><span class="mute">' + D().RARITY[o.rarity] + '・只在' + esc(D().REGIONS[d.region]) + '買得到</span></div>'
      + '<button class="btn mini' + (o.reason ? '' : ' sea') + '" type="button" data-do="buy" data-id="' + o.id + '"' + (o.reason ? ' disabled' : '') + '>' + (o.owned ? '已擁有' : '$' + fmt(o.price)) + '</button></div>').join('');
    return '<div class="modal wide store"><span class="eyebrow">' + esc(d.name) + '・紀念品店</span><h2>紀念品店</h2>'
      + '<p class="mute" style="font-size:13px">每個地區都有自己的紀念品，它們是只在當地買得到的靈感物件。不用花時段。</p>'
      + '<div class="store-cash">你有 <b class="num">$' + fmt(s.cr) + '</b></div><div class="store-grid">' + items + '</div>'
      + '<div class="btn-row"><button class="btn primary" type="button" data-do="close">離開</button></div></div>';
  }
  function rosterHtml(meta) {
    return '<h3>角色（' + IE.Roster.list(meta).filter((c) => c.open).length + '/' + Object.keys(D().BACKGROUNDS).length + '）</h3><div class="recipes">'
      + IE.Roster.list(meta).map((c) => '<div class="recipe obj-card r-' + c.rarity + (c.open ? '' : ' unknown') + '">' + IE.Chars.img(c.id, 3, !c.open)
        + '<b><span class="rar r-' + c.rarity + '">' + c.rarity + '</span>' + (c.open ? esc(c.name) : '？？？') + '</b><span>' + (c.open ? esc(c.perkText) : '解鎖：' + esc(c.unlock.text)) + '</span></div>').join('') + '</div>';
  }
  function statsModal(s) {
    const bg = D().BACKGROUNDS[s.bg];
    const delta = {};
    D().STAT_KEYS.forEach((k) => { delta[k] = s.attr[k] - bg.stats[k]; });
    const acts = s.stats.actions || {};
    const names = { label: '標註', ot: '加班', smile: '陪伴', delivery: '外送', farm: '內容農場', clinic: '診所', dive: '潛水', busk: '表演', chat: '聊天', volunteer: '義工', rest: '休息', create: '創作' };
    const top = Object.keys(acts).sort((a, b) => acts[b] - acts[a]).slice(0, 5);
    return '<div class="modal wide"><h2>能力值</h2><p class="mute" style="font-size:13px">' + esc(bg.name) + '・第 ' + s.day + ' 天。小字是與開局相比的變化。外星人最後會根據這些數字，把你歸類為一種人類模組。</p>'
      + statBars(s.attr, { delta })
      + '<div class="e-stats" style="margin-top:12px">'
      + '<div class="e-stat"><span class="k">靈魂</span><span class="num">' + s.soul.toFixed(1) + '<small>克</small></span></div>'
      + '<div class="e-stat"><span class="k">良知</span><span class="num">' + Math.round(s.conscience * 100) + '%</span></div>'
      + '<div class="e-stat"><span class="k">偏執</span><span class="num">' + Math.round(s.paranoia) + '%</span></div>'
      + '<div class="e-stat"><span class="k">身體上限</span><span class="num">' + R().bodyMax(s) + '</span></div>'
      + '</div>'
      + (top.length ? '<p class="mute" style="font-size:13px">你最常做的事：' + top.map((k) => (names[k] || k) + ' ' + acts[k] + ' 次').join('、') + '</p>' : '')
      + '<div class="btn-row"><button class="btn primary" type="button" data-do="close">收起</button></div></div>';
  }
  const ENDING_KIND = { death: 'DEATH', grey: 'GREYED OUT', ordinary: 'ORDINARY', agent: 'RECRUITED', returned: 'RETURNED', heavy: 'TOO HEAVY', guardian: 'STAYED' };
  const ENDING_COUNT = Object.keys(ENDING_KIND).length;
  // 人類樣本檔案：外星人視角的結局
  function dossierModal(e, s, dos, meta) {
    const DS = IE.Dossier;
    const a = dos.archetype;
    const stamps = dos.stamps.map((x, i) => '<span class="dstamp tone-' + DS.STAMPS[x.id].tone + ' n' + i + '">' + esc(DS.STAMPS[x.id].text)
      + (x.label ? '<small>' + esc(x.label) + '</small>' : '') + '</span>').join('');
    const seen = meta.archetypes ? Object.keys(meta.archetypes).length : 0;
    return '<div class="modal wide"><div class="ending ' + e.kind + '">'
      + '<span class="e-kind">' + ENDING_KIND[e.kind] + '・DAY ' + s.day + '</span>'
      + '<h2>' + esc(e.title) + '</h2>'
      + '<p class="epitaph">' + esc(e.text) + '</p></div>'
      + '<div class="dossier">'
      + '<div class="d-head"><span>星際人才發展局・人類樣本檔案</span><span class="num">' + esc(dos.sampleId) + '</span></div>'
      + '<div class="d-meta"><span>來源：浮城（地球）</span><span>觀察期：' + dos.days + ' 天</span><span>狀態：' + esc(dos.status) + '</span></div>'
      + '<div class="d-class"><span class="d-k">模組分類</span><h3>' + esc(a.name) + '</h3><p>' + esc(a.desc) + '</p>'
      + '<p class="d-runner">次要特徵：' + esc(dos.runnerUp.name) + '</p></div>'
      + '<div class="d-cols"><div><span class="d-k">觀察筆記</span><ol class="d-notes">' + dos.notes.map((n) => '<li>' + esc(n) + '</li>').join('') + '</ol></div>'
      + '<div><span class="d-k">能力讀數</span>' + statBars(dos.attr, { compact: true }) + '</div></div>'
      + '<div class="d-stamps">' + stamps + '</div>'
      + '<p class="d-foot">本檔案由自動化流程產生，無需人手覆核。我們不是一個組織，我們是一個宇宙大家庭。</p>'
      + '</div>'
      + ((meta.lastUnlocks || []).length ? '<div class="unlocks"><h3>跨局解鎖</h3>' + meta.lastUnlocks.map((id) => '<div class="obj-row r-legend">' + IE.Icons.obj(id, 44)
        + '<div class="obj-txt"><b>新靈感物件：' + esc(D().OBJ[id].name) + '</b><span>' + esc(D().OBJ[id].desc) + '</span><span class="mute">解鎖條件：' + esc(D().OBJ[id].unlock.text) + '</span></div></div>').join('') + '</div>' : '')
      + ((meta.lastChars || []).length ? '<div class="unlocks"><h3>新角色解鎖</h3>' + meta.lastChars.map((id) => { const b = D().BACKGROUNDS[id]; return '<div class="obj-row r-' + b.rarity + '">' + IE.Chars.img(id, 4)
        + '<div class="obj-txt"><b><span class="rar r-' + b.rarity + '">' + b.rarity + '</span>' + esc(b.name) + '</b><span>' + esc(b.perkText) + '</span><span class="mute">解鎖條件：' + esc(b.unlock.text) + '</span></div></div>'; }).join('') + '</div>' : '')
      + (meta.lastTickets ? '<p class="tickets-note">星際人才發展局發給你 <b>' + meta.lastTickets + '</b> 張人才扭蛋券（現有 ' + (meta.tickets || 0) + ' 張）。</p>' : '')
      + '<div class="btn-row"><button class="btn" type="button" data-do="copy">複製檔案</button><button class="btn primary" type="button" data-do="again">再玩一局</button></div>'
      + '<p class="mute" style="font-size:12px;text-align:center">結局 ' + Object.keys(meta.endings || {}).length + '/' + ENDING_COUNT + '・人類模組 ' + seen + '/' + DS.ARCHETYPES.length + '</p>'
      + '</div>';
  }
  function dossierText(e, s, dos) {
    const DS = IE.Dossier;
    return '《靈感撤離 2080》人類樣本檔案 ' + dos.sampleId + '\n'
      + e.title + '：' + e.text + '\n'
      + '模組分類：' + dos.archetype.name + '——' + dos.archetype.desc + '\n'
      + dos.notes.map((n) => '・' + n).join('\n') + '\n'
      + '印章：' + dos.stamps.map((x) => '【' + DS.STAMPS[x.id].text + '】').join('');
  }
  function helpModal() {
    return '<div class="modal wide"><h2>玩法</h2><div class="help">'
      + '<p>你有 <b>100 天</b>。每天分為早上、下午、晚上三個時段，每個時段做一件事。第 20、40、60、80、100 天晚上是<b>篩選日</b>：累積訊號夠高、靈魂又夠輕，外星人就會把你帶走。篩選日前兩晚，外星 HR 會在夢裡面試你。</p>'
      + '<h3>三樣東西互相蠶食</h3><ul>'
      + '<li><b>錢</b>：每晚要吃飯，每 7 天要交租，租金每期上漲。兩次交不起租就會被趕出門。</li>'
      + '<li><b>身體</b>：降到 0 就會死。身體上限由體能決定。</li>'
      + '<li><b>火花</b>：創作的倍率。工作會消耗火花；低於 ×1 會陷入麻木；連續 4 晚沒有火花，你就會灰化。</li></ul>'
      + '<h3>十二項能力</h3><p>體能、手速、節奏感、水性、技術、社交、創作、想像力、洞察、冷靜、同理心、服從。做甚麼就會變成甚麼：標註會提高手速和服從，卻磨掉想像力；表演會提高節奏感和創作，卻降低服從。按狀態列的「能力」可以隨時查看。</p>'
      + '<h3>工作與生活</h3><ul>'
      + '<li><b>AI 數據標註</b>：依照越來越荒謬的指引分類圖片。收入穩定，但令別人失業。</li>'
      + '<li><b>企業情緒陪伴</b>：準時笑、點頭、倒酒；附和偏見可以多拿小費，但靈魂會變重。</li>'
      + '<li><b>外送潛水</b>：在淹水的街道取餐送餐，避開天空區的快艇。</li>'
      + '<li><b>陰謀論內容農場</b>：拼出聳動標題，越假越多人轉發，城市也越恐慌，你也越偏執。</li>'
      + '<li><b>黑市義體診所</b>（技術 25 以上）：照接線圖接駁義體；可以接未登記的私活。</li>'
      + '<li><b>舊城潛水</b>：捕魚、打撈遺物、撬儲物櫃。</li>'
      + '<li><b>街頭表演</b>：唯一會令火花變旺的工作，但收入很少。</li>'
      + '<li><b>聊天、義工、休息</b>：恢復火花、讓靈魂變輕、恢復身體。</li></ul>'
      + '<h3>事件（100 種，S 至 E 級）</h3><p>事件分為宇宙級、世界級、國家級（浮城）、地區級、街坊級，按影響力分為 S 至 E 級。長期事件會持續數天，改變收入、物價、靈魂重量，甚至令某些工作停擺；最多同時有兩個。大部分事件會先在手機出現<b>預兆</b>（洞察越高，看得越清楚），少數 S 級事件沒有任何預兆。</p>'
      + '<h3>死亡（100 種以上）</h3><ul>'
      + '<li>死因會按當天傷你最重的那件事，以及當時的處境判斷，並收錄在跨局的<b>死亡圖鑑</b>。</li>'
      + '<li><b>致命危險</b>：有些事件令外出工作（潛水、外送、表演、義工）有致命機會，有些令住在某些樓層的人晚上有致命機會（海嘯淹低層，火災燒高層）。狀態列會顯示機會率；商店的頭盔、防毒面罩可以減低機會，搬樓可以避開。</li>'
      + '<li><b>病痛</b>：霉菌肺、新型病毒、鼠疫熱拖太久會致命，要買藥箱；中暑、失眠要休息；骨折令外出更辛苦。</li>'
      + '<li><b>過勞</b>：連續 5 天沒有休息，每晚都有猝死的機會。連續通宵創作三晚以上也一樣。</li></ul>'
      + '<h3>靈魂重量與良知</h3><ul>'
      + '<li>外星人的牽引光束最多只能拉起 <b>21 克</b>的靈魂。太重的人會污染他們的神經網絡，訊號再高也不會被帶走。</li>'
      + '<li><b>良知是負重</b>：同一件虧心事，良知越強、同理心越高就越重。可是每做一次，良知都會被磨損，下一件事就越來越輕。</li>'
      + '<li>良知也決定你的感受力：火花上限 = 2 + 2 × 良知。</li>'
      + '<li>減輕的方法：做義工、在抉擇中選擇良心、把「愧疚」素材寫進作品，或者購買「業力抵銷額度」。</li></ul>'
      + '<h3>人類樣本檔案</h3><p>無論被帶走、留下、死去還是灰化，外星人都會根據你最後的能力值、靈魂和所作所為，把你歸類為 30 種人類模組之一，寫下觀察筆記，再蓋上印章。</p>'
      + '<h3>創作（核心）</h3><ul>'
      + '<li>晚上選「創作」：從素材庫抽一手素材，下筆三次、改稿兩次。三次下筆的分數加起來就是今晚的作品，會變成外星訊號。「通宵創作」多一次下筆和改稿，但很傷身。</li>'
      + '<li>每次下筆的分數 = 籌碼 × 倍率 × 火花。同一標籤出現得越多，作品形式越高級：隨筆、短詩、對聯、歌、拼貼、小說、壁畫、交響曲、史詩，還有一種隱藏形式。</li>'
      + '<li>特定標籤組合會觸發 ' + D().RECIPES.length + ' 個具名組合之一，其中 ' + D().RECIPES.filter((r) => r.legend).length + ' 個是隱藏的傳說組合。圖鑑跨局保存，未發現的組合會給你提示。</li>'
      + '<li><b>靈感物件</b>最多裝備 3 件（工作室可擴充至 5 件），在計分時觸發。朋友、潛水、事件、面試和二手市集都可以找到；部分要跨局解鎖。</li>'
      + '<li><b>技法</b>：白天做不同的事、和不同的朋友聊天，會令相應的作品形式升級。為了創作，去試不同的生活吧。</li>'
      + '<li>素材用得越多次越殘；同一種形式用得太密，AI 會學會你的風格，倍率下降。</li></ul>'
      + '<h3>地圖、旅行與金錢</h3><ul>'
      + '<li>畫面上方可以切換<b>房間</b>、<b>浮城</b>（橫切面）、<b>地圖</b>和<b>世界</b>。房間、地圖和世界裡的東西都可以直接點選。</li>'
      + '<li><b>世界地圖</b>：用錢出國，到現代都市、古文明、史前遺跡、外星人基地和傳說之地收集素材。旅行帶回「遠古」和「星辰」標籤，以及新的具名組合。部分地方要特定條件才去得到。</li>'
      + '<li><b>極稀有素材</b>：每個目的地都藏著一件，只會在特定事件或處境下出現（例如糧荒期間的種子庫、太陽閃焰期間的太陽船坑）。洞察 30 以上才看得懂線索。有四個傳說組合要靠它們才能觸發。</li>'
      + '<li>在外地：晚上照樣創作（異鄉之夜 ×1.3）；回來後七晚有<b>旅行的餘韻</b>。探索點有致命危險，航班在戰爭或 AI 失控期間也不安全。</li>'
      + '<li><b>天空區畫廊</b>：接委託（湊齊指定標籤就收錢），或者把作品賣掉（作品的訊號會減半）。</li>'
      + '<li><b>古董市場</b>：買稀有的古董素材，也可以把素材賣給古董商。</li>'
      + '<li><b>家具</b>：彈簧床、冷氣機、抽水泵、防盜門、魚缸、書架、畫架、望遠鏡……全部看得見，也全部有用。被趕出門會失去全部家具。</li></ul>'
      + '<h3>操作</h3><p>鍵盤：數字鍵選擇行動（第 10 項按 0）。每個小遊戲畫面下方都有操作說明；手機可以直接按畫面或下方的按鈕。</p>'
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
    const DS = IE.Dossier;
    const at = meta.archetypes || {};
    const types = DS.ARCHETYPES.map((a) => '<div class="recipe' + (at[a.id] ? '' : ' unknown') + '"><b>' + (at[a.id] ? esc(a.name) : '？？？') + '</b>'
      + (at[a.id] ? '<span class="mute">' + esc(DS.STAMPS[a.stamp].text) + '・歸類 ' + at[a.id] + ' 次</span>' : '') + '</div>').join('');
    const stampsSeen = meta.stamps || {};
    const stamps = Object.keys(DS.STAMPS).map((k) => '<span class="dstamp mini tone-' + DS.STAMPS[k].tone + (stampsSeen[k] ? '' : ' unknown') + '">' + (stampsSeen[k] ? esc(DS.STAMPS[k].text) : '？？？') + '</span>').join('');
    const unlocked = meta.unlocked || {}, seenO = meta.objSeen || {};
    const objs = D().OBJECTS.map((o) => {
      const open = !o.unlock || unlocked[o.id];
      const seen = seenO[o.id];
      return '<div class="recipe obj-card r-' + o.rarity + (seen ? '' : ' unknown') + '">' + (seen || open ? IE.Icons.obj(o.id, 32) : '')
        + '<b>' + (seen ? esc(o.name) : open ? '？？？' : '未解鎖') + '</b>'
        + '<span>' + (seen ? esc(o.desc) : open ? '來源：' + esc(o.npc ? '與朋友成為好友' : o.start ? '某個角色的隨身物' : (o.src || '二手市集')) : '解鎖條件：' + esc(o.unlock.text)) + '</span></div>';
    }).join('');
    const evSeen = meta.eventsSeen || {};
    const allEv = D().WORLD_EVENTS.map((w) => ({ id: w.id, name: w.name, scope: w.scope, grade: w.grade, text: w.news, long: true }))
      .concat(D().EVENTS.map((e) => ({ id: e.id, name: e.text.split(/[，。]/)[0], scope: e.scope, grade: e.grade, text: e.text })));
    const events = Object.keys(D().SCOPES).map((sc) => '<h4>' + D().SCOPES[sc].name + '</h4><div class="recipes">' + allEv.filter((e) => e.scope === sc)
      .sort((a, b) => 'SABCDE'.indexOf(a.grade) - 'SABCDE'.indexOf(b.grade)).map((e) => '<div class="recipe' + (evSeen[e.id] ? '' : ' unknown') + '"><b><b class="gbadge g-' + e.grade + '">' + e.grade + '</b>'
        + (evSeen[e.id] ? esc(e.name) : '？？？') + '</b>' + (evSeen[e.id] ? '<span class="mute">' + esc(e.text) + '</span>' : '<span class="mute">' + (e.long ? '持續數天的事件' : '一晚的事件') + '</span>') + '</div>').join('') + '</div>').join('');
    const dSeen = meta.deaths || {};
    const deaths = Object.keys(D().DEATH_CATS).map((cat) => '<h4>' + D().DEATH_CATS[cat] + '</h4><div class="recipes">' + D().DEATHS.filter((d) => d.cat === cat)
      .map((d) => '<div class="recipe death' + (dSeen[d.id] ? '' : ' unknown') + '"><b>' + (dSeen[d.id] ? esc(d.name) : '？？？') + '</b>'
        + '<span class="mute">' + (dSeen[d.id] ? '死過 ' + dSeen[d.id] + ' 次・' : '提示：') + esc(d.hint) + '</span></div>').join('') + '</div>').join('');
    return '<div class="modal wide"><h2>收藏</h2>' + rosterHtml(meta) + '<h3>結局</h3><div class="recipes">' + endings + '</div>'
      + '<h3>死亡圖鑑（' + Object.keys(dSeen).length + '/' + D().DEATHS.length + '）</h3>' + deaths
      + worldCodexHtml(meta)
      + '<h3>事件圖鑑（' + Object.keys(evSeen).length + '/' + allEv.length + '）</h3>' + events
      + '<h3>靈感物件（' + Object.keys(seenO).length + '/' + D().OBJECTS.length + '）</h3><div class="recipes">' + objs + '</div>'
      + IE.Craft.codexHtml({ discovered: {}, formsSeen: {}, forms: meta.forms || {} }, meta).replace(/^<div class="modal wide"><h2>創作圖鑑<\/h2>/, '').replace(/<div class="btn-row">[\s\S]*$/, '')
      + '<h3>人類模組（' + Object.keys(at).length + '/' + DS.ARCHETYPES.length + '）</h3><div class="recipes">' + types + '</div>'
      + '<h3>外星印章（' + Object.keys(stampsSeen).length + '/' + Object.keys(DS.STAMPS).length + '）</h3><div class="stamp-wall">' + stamps + '</div>'
      + '<h3>具名組合</h3><div class="recipes">' + recipes + '</div>'
      + '<h3>舊城圖鑑：魚類</h3><div class="recipes">' + fish + '</div>'
      + '<h3>舊城圖鑑：遺物</h3><div class="recipes">' + relics + '</div>'
      + '<div class="btn-row"><button class="btn primary" type="button" data-do="close">收起</button></div></div>';
  }

  // ---------- 地圖與旅行 ----------
  // 在地圖上點選地點：先看清楚代價
  function placeModal(where, a) {
    return '<div class="modal place"><span class="eyebrow">' + esc(where) + '</span><h2>' + esc(a.name) + '</h2><p class="mute">' + esc(a.sub) + '</p>'
      + '<div class="fx big">' + fxHtml(a.fx) + '</div>' + (a.reason ? '<p class="act-why">' + esc(a.reason) + '</p>' : '')
      + '<div class="btn-row"><button class="btn primary" type="button" data-do="go"' + (a.enabled ? '' : ' disabled') + '>' + (a.id.startsWith('site:') ? '去探索' : '前往') + '</button>'
      + '<button class="btn" type="button" data-do="close">取消</button></div></div>';
  }
  function destModal(d, s) {
    const pct = (p) => Math.round(p * 1000) / 10 + '%';
    const sites = d.sites.map((st) => '<div class="site">'
      + '<div class="site-head"><b>' + esc(st.name) + '</b><span class="fx">' + fxHtml([['body', '−' + st.body]].concat(st.spark ? [['spark', '+' + st.spark]] : []).concat(st.risk > 0 ? [['danger', '致命 ' + pct(st.risk)]] : [])) + '</span></div>'
      + '<p class="mute">' + esc(st.desc) + '</p>'
      + '<p class="site-gain">素材：' + st.gain.map(esc).join('、') + '</p>'
      + (st.need ? '<p class="act-why">' + esc(st.need) + '</p>' : '')
      + (st.rare ? '<p class="site-rare' + (st.rare.found ? ' found' : st.rare.ready ? ' ready' : '') + '">★ 極稀有：' + esc(st.rare.name) + (st.rare.found ? '（已找到）' : '') + '<br><span>' + esc(st.rare.text) + (st.rare.ready && !st.rare.found ? '　→　時機已到！' : '') + '</span></p>' : '')
      + '</div>').join('');
    return '<div class="modal wide dest"><span class="eyebrow" style="color:' + d.kind.color + '">' + esc(d.kind.name) + '・' + esc(d.region) + (d.visited ? '・去過 ' + d.visited + ' 次' : '') + '</span>'
      + '<h2>' + esc(d.name) + (d.deal ? '<span class="deal-tag">特價 −' + Math.round(d.deal.off * 100) + '%・第 ' + d.deal.until + ' 天前</span>' : '') + '</h2><p>' + esc(d.desc) + '</p>'
      + '<div class="dest-facts"><span>停留 <b>' + d.stay + ' 天</b></span><span>你有 <b>$' + fmt(s.cr) + '</b></span>' + (d.souvenir.length ? '<span>紀念品：<b>' + d.souvenir.map(esc).join('、') + '</b></span>' : '') + '</div>'
      + '<p class="mute" style="font-size:13px">在外地：每個時段探索一個地方；晚上照樣可以創作（異鄉之夜 ×1.3，手牌 +1）。回來後七晚有「旅行的餘韻」（第一次去 ×1.6）。房租照交，飯錢貴五成，平台評分會下降。</p>'
      + '<h3>探索點</h3><div class="sites">' + sites + '</div>'
      + (d.reason ? '<p class="act-why">' + esc(d.reason) + '</p>' : '')
      + '<h3>機票</h3><div class="fares">' + d.fares.map((f) => '<button class="fare fare-' + f.id + '" type="button" data-do="go" data-fare="' + f.id + '"' + (d.reason || !f.ok ? ' disabled' : '') + '>'
        + '<b>' + f.name + '</b><span class="num">$' + fmt(f.cost) + '</span><small>' + esc(f.desc) + '</small><small>航班致命機會 ' + pct(f.risk) + '（來回各一次）</small></button>').join('') + '</div>'
      + '<div class="btn-row"><button class="btn" type="button" data-do="close">返回</button></div></div>';
  }
  function galleryModal(s) {
    const W = IE.World;
    const comm = W.commissions(s).map((c) => '<div class="comm' + (c.done ? ' done' : '') + '"><b>$' + fmt(c.pay) + '</b><span>' + esc(c.text) + '</span><span class="mute">'
      + (c.done ? '已完成' : '第 ' + c.until + ' 天前・某一次下筆湊齊這些標籤，而且分數達到本季門檻的 2%') + '</span></div>').join('');
    const works = W.galleryOffers(s).map((w) => '<div class="work-row' + (w.sold ? ' sold' : '') + '"><div><b>《' + esc(w.name) + '》</b><span class="mute">第 ' + w.day + ' 天・訊號 ' + kfmt(w.score) + '</span></div>'
      + (w.sold ? '<span class="mute">已賣出</span>' : '<button class="btn mini' + (w.reason ? '' : ' sea') + '" type="button" data-do="sell" data-i="' + w.i + '"' + (w.reason ? ' disabled title="' + esc(w.reason) + '"' : '') + '>賣 $' + fmt(w.price) + '<small>訊號 −' + kfmt(w.lose) + '</small></button>') + '</div>').join('');
    return '<div class="modal wide"><span class="eyebrow">天空區畫廊</span><h2>作品與委託</h2>'
      + '<h3>天空區委託（每五天更新）</h3><p class="mute" style="font-size:13px">有錢人想要特定的作品。創作時湊齊標籤就會自動收到酬金，不會損失訊號，但會令你更「聽話」。</p><div class="comms">' + comm + '</div>'
      + '<h3>你的作品</h3><p class="mute" style="font-size:13px">收藏家按作品在今天的外星門檻面前有多亮出價（越遲賣越不值錢）。賣出的作品外星訊號減半。畫廊每天只收一件。</p>'
      + '<div class="works">' + (works || '<p class="mute">你還沒有完成任何作品。</p>') + '</div>'
      + '<div class="btn-row"><button class="btn primary" type="button" data-do="close">離開</button></div></div>';
  }
  function antiqueModal(s) {
    const W = IE.World;
    const offers = W.antiqueOffers(s).map((o) => '<div class="ant-item">' + cardHtml(o) + (o.special ? '<span class="mute">' + esc(o.special) + '</span>' : '')
      + '<button class="btn mini' + (o.reason ? '' : ' sea') + '" type="button" data-do="buy" data-id="' + o.id + '"' + (o.reason ? ' disabled' : '') + '>' + (o.sold ? '已賣出' : '$' + fmt(o.price)) + '</button></div>').join('');
    const sells = W.sellCards(s).map((c) => '<div class="ant-sell">' + cardHtml(c) + '<button class="btn mini" type="button" data-do="sellcard" data-uid="' + c.uid + '"' + (c.reason ? ' disabled title="' + esc(c.reason) + '"' : '') + '>賣 $' + fmt(c.price) + '</button></div>').join('');
    return '<div class="modal wide"><span class="eyebrow">浮城・古董市場</span><h2>古董市場</h2>'
      + '<p class="mute" style="font-size:13px">每四天換一批貨。古董是稀有的素材；某些事件期間會出現不屬於這個時代的東西。你也可以把素材賣給古董商：旅行帶回來的素材比較值錢，極稀有素材更是天價（每天最多收兩件）。</p>'
      + '<h3>今期貨品</h3><div class="ant-grid">' + offers + '</div>'
      + '<h3>賣出素材</h3><div class="ant-grid">' + sells + '</div>'
      + '<div class="btn-row"><button class="btn primary" type="button" data-do="close">離開</button></div></div>';
  }
  function decorModal(s) {
    const items = IE.World.decorList(s).map((d) => '<div class="decor-item' + (d.owned ? ' owned' : '') + '"><div><b>' + esc(d.name) + '</b><span>' + esc(d.desc) + '</span></div>'
      + '<button class="btn mini' + (d.reason ? '' : ' sea') + '" type="button" data-do="buy" data-id="' + d.id + '"' + (d.reason ? ' disabled' : '') + '>' + (d.owned ? '已擁有' : '$' + fmt(d.cost)) + '</button></div>').join('');
    return '<div class="modal wide"><span class="eyebrow">家具目錄</span><h2>把這裡變成一個家</h2>'
      + '<p class="mute" style="font-size:13px">家具會出現在你的房間，而且有實際作用。只在家裡有效；被趕出門時，房東會沒收全部家具。</p>'
      + '<div class="decor-list">' + items + '</div><div class="btn-row"><button class="btn primary" type="button" data-do="close">合上目錄</button></div></div>';
  }
  function worldCodexHtml(meta) {
    const W = IE.World, vis = meta.visited || {};
    const dests = D().DESTINATIONS.map((d) => '<div class="recipe' + (vis[d.id] ? '' : ' unknown') + '"><b style="color:' + D().KINDS[d.kind].color + '">' + (vis[d.id] ? esc(d.name) : '？？？') + '</b>'
      + '<span class="mute">' + esc(D().KINDS[d.kind].name) + (vis[d.id] ? '・去過 ' + vis[d.id] + ' 次' : d.lockText ? '・' + esc(d.lockText) : '') + '</span></div>').join('');
    const rares = W.rareList(meta).map((r) => '<div class="recipe' + (r.found ? ' legend' : ' unknown') + '"><b>' + (r.found ? '★ ' + esc(r.name) : '？？？') + '</b>'
      + '<span class="mute">' + esc(r.dest) + '・' + esc(r.site) + '：' + esc(r.text) + '</span></div>').join('');
    return '<h3>世界圖鑑（' + Object.keys(vis).length + '/' + D().DESTINATIONS.length + '）</h3><div class="recipes">' + dests + '</div>'
      + '<h3>極稀有素材（' + Object.keys(meta.rares || {}).length + '/' + W.rareList(meta).length + '）</h3><div class="recipes">' + rares + '</div>';
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
    renderHud, setPanel, modal, pushModal, closeModal, objectsModal, modalOpen, bindDelegation, toast,
    actionsPanel, invHtml, chatPanel, controlsPanel, reportModal, settleModal, phoneModal, reviewModal,
    titlePanel, setupPanel, dossierModal, dossierText, statsModal, statBars, helpModal, collectionModal, dilemmaModal, stayModal,
    placeModal, destModal, galleryModal, antiqueModal, decorModal, worldCodexHtml, gachaModal, storeModal, souvenirModal, rosterHtml,
  };
})(window.IE = window.IE || {});
