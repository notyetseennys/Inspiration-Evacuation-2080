// 創作之夜：《小丑牌》式的創作桌。
//   抽一手素材 → 選 1 至 5 張下筆（或改稿換牌）→ 逐張計分：籌碼跳動、物件觸發、組合蓋章、倍率燃燒、乘上火花 → 爆分。
//   規則全部在 create.js；這裡只負責演出與輸入。
(function (IE) {
  'use strict';
  const D = () => IE.DATA, R = () => IE.Rules, C = () => IE.Create, UI = () => IE.UI, A = () => IE.Audio;
  const esc = (v) => IE.UI.esc(v);
  const fmt = (n) => IE.UI.fmt(n);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 忽略 */ } },
  };
  let root = null, st = null;
  const $ = (sel) => root.querySelector(sel);

  // ---------- 素材卡 ----------
  function cardEl(s, c, o) {
    o = o || {};
    const D_ = D();
    const SR = IE.Stages ? IE.Stages.scoring(s) : null;
    const dark = s.session && s.session.stage && s.session.stage.rules.some((id) => IE.Stages.BOSS[id].ui === 'blackout') && !o.sel;
    if (dark) return '<button type="button" class="cc dark" data-uid="' + c.uid + '"><span class="cc-name">？？？</span><span class="cc-tags"><span class="t">停電</span></span><span class="cc-foot"><b class="cc-val num">?</b></span></button>';
    const off = SR && SR.forbidden(c), blocked = SR && !off && SR.blocked(c);
    const stripes = c.tags.map((t) => '<i style="--c:' + D_.TAGS[t].color + '"></i>').join('');
    const tags = c.tags.map((t) => '<span class="t" style="--c:' + D_.TAGS[t].color + '">' + D_.TAGS[t].name + '</span>').join('');
    const wear = c.wear || 0;
    const val = C().cardValue(s, c);
    return '<button type="button" class="cc' + (o.sel ? ' sel' : '') + (c.mod ? ' mod-' + c.mod : '') + (wear >= 4 ? ' worn' : '') + (c.guilt ? ' guilt' : '') + (c.rarity ? ' r-' + c.rarity : '')
      + (c.legacy ? ' legacy' : '') + (o.dim ? ' dim' : '') + (off ? ' forbidden' : '') + (blocked ? ' blocked' : '') + '" data-uid="' + c.uid + '"' + (o.stage ? ' tabindex="-1"' : '') + (off ? ' title="外星評審：這張素材不能用"' : blocked ? ' title="外星評審：這張素材不計分"' : '') + '>'
      + '<span class="cc-stripes">' + stripes + '</span>'
      + '<span class="cc-name">' + esc(c.name) + '</span>'
      + (c.rarity === 'legend' ? '<span class="cc-rar">極稀有</span>' : c.origin && c.origin !== 'home' && D_.REGIONS ? '<span class="cc-rar origin">' + esc(D_.REGIONS[c.origin]) + '</span>' : '')
      + '<span class="cc-tags">' + tags + '</span>'
      + '<span class="cc-foot"><b class="cc-val num">' + val + '</b>'
      + (wear ? '<span class="cc-wear" title="用過 ' + wear + ' 次，籌碼 ×' + C().wearMult(c).toFixed(2) + '">' + (wear >= 4 ? '陳腔濫調' : '用過 ×' + wear) + '</span>' : '') + '</span>'
      + (c.mod ? '<span class="cc-mod">' + D_.CARD_MODS[c.mod].name + '</span>' : '')
      + (c.guilt ? '<span class="cc-grams">愧疚 ' + c.grams + ' 克</span>' : '')
      + '</button>';
  }
  function objTile(id, slot) {
    const o = D().OBJ[id];
    return '<button type="button" class="ct-obj r-' + o.rarity + '" data-obj="' + id + '" data-slot="' + slot + '" title="' + esc(o.name + '：' + o.desc) + '">'
      + IE.Icons.obj(id, 40) + '<span class="on">' + esc(o.name) + '</span></button>';
  }

  // ---------- 開啟 ----------
  function open(s, onDone) {
    st = { s, onDone, sel: [], busy: false, speed: Number(store.get('ie2080.speed')) || 1, sortBy: store.get('ie2080.sort') || 'tag',
      fast: false, best: Math.max(s.stats.bestPlay || 0, (IE.Game.meta && IE.Game.meta.bestPlay) || 0), sigStart: R().signal(s), chipN: 0 };
    root = document.createElement('div');
    root.id = 'ctable';
    root.className = 'ctable';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', '創作之夜');
    root.innerHTML = '<canvas class="ct-fx"></canvas><div class="ct-inner">'
      + '<header class="ct-head"><div class="ct-title"><b>創作之夜</b><span class="ct-sub"></span></div>'
      + '<div class="ct-hbtns"><button type="button" class="btn" data-ct="speed"></button><button type="button" class="btn" data-ct="deck">牌庫</button><button type="button" class="btn" data-ct="codex">圖鑑</button><button type="button" class="btn" data-ct="leave">離開</button></div></header>'
      + '<div class="ct-goal"><span class="lbl">本季訊號</span><div class="bar"><i></i><em></em></div><b class="num ct-goal-n"></b></div>'
      + '<div class="ct-stagebar" hidden></div>'
      + '<section class="ct-objs"></section><section class="ct-tools"></section><p class="ct-info"></p>'
      + '<section class="ct-score"><div class="ct-form"><span class="fn">選擇素材</span><span class="fl"></span></div>'
      + '<div class="ct-calc"><div class="ct-box ct-chips"><small>籌碼</small><b class="num">0</b></div><span class="x">×</span><div class="ct-box ct-mult"><small>倍率</small><b class="num">0</b></div></div>'
      + '<div class="ct-night"><small>今晚</small><b class="num">0</b></div></section>'
      + '<p class="ct-est"></p>'
      + '<div class="ct-tags"></div>'
      + '<section class="ct-stage"><div class="ct-played"></div><div class="ct-total num" hidden></div></section>'
      + '<p class="ct-hint"></p>'
      + '<section class="ct-hand"></section>'
      + '<footer class="ct-actions"><button type="button" class="btn" data-ct="sort">排序</button>'
      + '<button type="button" class="btn ct-discard" data-ct="discard">改稿</button>'
      + '<button type="button" class="btn primary big ct-play" data-ct="play">下筆</button></footer>'
      + '<p class="ct-counts"></p></div>';
    document.body.appendChild(root);
    document.body.classList.add('ct-open');
    root.addEventListener('click', onClick);
    root.addEventListener('pointerdown', () => { if (st && st.busy) st.fast = true; });
    fxInit();
    render();
    A().setMode('alien', 80);
    const meta = IE.Game.meta || {};
    if (!meta.craftTutorial) {
      meta.craftTutorial = true;
      UI().pushModal(tutorialHtml(), { close: UI().closeModal }, { dismiss: () => {} });
    }
  }
  function close(result) {
    fxStop();
    if (root) { root.removeEventListener('click', onClick); root.remove(); }
    document.body.classList.remove('ct-open');
    root = null;
    const cb = st.onDone;
    st = null;
    A().setMode('city');
    cb(result);
  }
  const isOpen = () => !!root;

  // ---------- 繪畫 ----------
  function sortedHand() {
    const s = st.s, ses = s.session;
    const cards = ses.hand.map((u) => s.cards.find((c) => c.uid === u)).filter(Boolean);
    const order = D().TAGS ? Object.keys(D().TAGS) : [];
    if (st.sortBy === 'tag') cards.sort((a, b) => order.indexOf(a.tags[0]) - order.indexOf(b.tags[0]) || b.value - a.value);
    else cards.sort((a, b) => C().cardValue(s, b) - C().cardValue(s, a));
    return cards;
  }
  function render() {
    const s = st.s, ses = s.session;
    const k = R().kpi(s);
    $('.ct-sub').textContent = '第 ' + s.day + ' 天' + (ses.mode === 'allnighter' ? '・通宵' : '') + '・火花 ×' + s.spark.toFixed(1) + '・KPI：' + k.name;
    $('[data-ct="speed"]').textContent = '速度 ×' + st.speed;
    const slots = [];
    for (let i = 0; i < s.objSlots; i++) slots.push(s.objects[i] ? objTile(s.objects[i], i) : '<div class="ct-obj empty">空位</div>');
    $('.ct-objs').innerHTML = slots.join('');
    renderTools();
    renderStage();
    renderGoal();
    $('.ct-night b').textContent = fmt(ses.total);
    $('.ct-hand').innerHTML = sortedHand().map((c) => cardEl(s, c, { sel: st.sel.includes(c.uid) })).join('');
    $('.ct-counts').textContent = '素材庫 ' + s.cards.length + ' 張・未抽 ' + ses.deck.length + ' 張' + (ses.reshuffled ? '・已洗牌 ' + ses.reshuffled + ' 次' : '') + '・最佳一筆 ' + fmt(st.best);
    const pb = $('.ct-play'), db = $('.ct-discard');
    pb.textContent = '下筆（' + ses.plays + '）';
    db.textContent = '改稿（' + ses.discards + '）';
    pb.disabled = st.busy || !st.sel.length || ses.plays <= 0;
    db.disabled = st.busy || !st.sel.length || ses.discards <= 0;
    renderPreview();
  }
  // 工具卡欄
  function renderTools() {
    const s = st.s, S = IE.Stages;
    if (!S) return;
    const n = S.toolSlots(s), tools = s.tools || [];
    const out = [];
    for (let i = 0; i < n; i++) {
      const id = tools[i];
      if (!id) { out.push('<div class="ct-tool empty">工具卡</div>'); continue; }
      const T = S.TOOL[id];
      out.push('<button type="button" class="ct-tool" data-tool="' + i + '" title="' + esc(T.name + '：' + T.desc) + '">' + IE.Icons.item(T.icon, 28) + '<span>' + esc(T.name) + '</span></button>');
    }
    $('.ct-tools').innerHTML = out.join('');
  }
  // 關卡之夜：目標分數與評審規則
  function renderStage() {
    const s = st.s, ses = s.session, bar = $('.ct-stagebar');
    const g = ses.stage;
    if (!g) { bar.hidden = true; return; }
    bar.hidden = false;
    const sc = IE.Stages.stageScore(ses);
    const rules = g.rules.map((id) => IE.Stages.BOSS[id]);
    bar.style.setProperty('--c', g.color);
    bar.innerHTML = '<div class="sb-head"><b>第 ' + g.index + ' 關・' + esc(g.name) + '</b><span class="num">' + fmt(sc) + ' / ' + fmt(g.target) + '</span></div>'
      + '<div class="bar"><i style="width:' + Math.min(100, sc / g.target * 100) + '%"></i></div>'
      + (rules.length ? '<div class="sb-rules">' + rules.map((b) => '<span>' + esc(b.name) + '：' + esc(b.desc) + '</span>').join('') + '</div>' : '')
      + (sc >= g.target ? '<div class="sb-pass">已達標！</div>' : '');
  }
  function renderGoal(extra) {
    const s = st.s;
    const th = R().threshold(s);
    const sig = R().signal(s) + (extra || 0);
    $('.ct-goal i').style.width = Math.min(100, sig / th * 100) + '%';
    $('.ct-goal em').style.left = Math.min(100, st.sigStart / th * 100) + '%';
    $('.ct-goal-n').textContent = IE.UI.kfmt(sig) + ' / ' + IE.UI.kfmt(th);
  }
  function setBoxes(chips, mult, cls) {
    const cb = $('.ct-chips b'), mb = $('.ct-mult b');
    cb.textContent = fmt(chips);
    mb.textContent = Number.isInteger(mult) ? mult : (Math.round(mult * 10) / 10).toFixed(1);
    $('.ct-chips').classList.toggle('preview', cls === 'preview');
    $('.ct-mult').classList.toggle('preview', cls === 'preview');
  }
  function renderPreview() {
    const s = st.s;
    const pv = st.sel.length ? C().preview(s, st.sel) : null;
    if (!pv) {
      $('.ct-form .fn').textContent = st.s.session.log.length ? '再下一筆？' : '選擇素材';
      $('.ct-form .fl').textContent = '';
      setBoxes(0, 0, 'preview');
      $('.ct-hint').innerHTML = st.s.session.log.length ? '' : '選 1 至 5 張素材下筆。同一標籤出現得越多，作品形式越高級；具名組合要「純」：每一張都要有組合要求的標籤。';
      $('.ct-est').innerHTML = '';
      root.querySelectorAll('.ct-hand .cc').forEach((b) => b.classList.remove('scoring'));
      return;
    }
    $('.ct-form .fn').textContent = pv.name;
    $('.ct-form .fl').textContent = 'Lv.' + pv.level;
    setBoxes(pv.chips, pv.mult, 'preview');
    const bits = pv.recipes.map((r) => (r.known ? '<span class="rc' + (r.legend ? ' lg' : '') + '">' + esc(r.name) + '</span>'
      : '<span class="rc unk' + (r.legend ? ' lg' : '') + '">' + (r.legend ? '？？？ 傳說組合' : '？？？ 未知組合') + '</span>'));
    if (pv.ai < 1) bits.push('<span class="rc ai">AI 正在模仿你的「' + esc(pv.name) + '」：×' + pv.ai + '</span>');
    if (pv.blocked) bits.push('<span class="rc ai">' + pv.blocked + ' 張素材被評審判為不計分</span>');
    // 「差一張」提示
    pv.hints.forEach((h) => bits.push('<span class="rc near">加入「' + esc(h.card) + '」→《' + esc(h.name) + '》</span>'));
    $('.ct-hint').innerHTML = bits.join('') || '<span class="mute">沒有具名組合</span>';
    // 預計得分
    const g = st.s.session.stage;
    const need = g ? Math.max(0, g.target - IE.Stages.stageScore(st.s.session)) : 0;
    $('.ct-est').innerHTML = '預計 <b class="num">≈ ' + fmt(pv.est) + '</b> 分（' + fmt(pv.estChips) + ' × ' + (Math.round(pv.estMult * 10) / 10) + ' × 火花）'
      + (g && need > 0 ? '<span class="' + (pv.est >= need ? 'ok' : 'short') + '">　關卡還差 ' + fmt(need) + (pv.est >= need ? '：這一筆足夠！' : '') + '</span>' : '');
    root.querySelectorAll('.ct-hand .cc').forEach((b) => b.classList.toggle('scoring', pv.scoring.includes(Number(b.dataset.uid))));
  }

  // ---------- 輸入 ----------
  function onClick(e) {
    if (!st) return;
    const card = e.target.closest('.ct-hand .cc');
    if (card && !st.busy) { toggle(Number(card.dataset.uid)); return; }
    const tb = e.target.closest('.ct-tool[data-tool]');
    if (tb && !st.busy) { useTool(Number(tb.dataset.tool)); return; }
    const ob = e.target.closest('.ct-obj[data-obj]');
    if (ob) { const o = D().OBJ[ob.dataset.obj]; $('.ct-info').innerHTML = '<b>' + esc(o.name) + '</b>（' + D().RARITY[o.rarity] + '）：' + esc(o.desc); wiggle(ob); return; }
    const b = e.target.closest('[data-ct]');
    if (!b || b.disabled) return;
    A().sfx('click');
    const k = b.dataset.ct;
    if (k === 'play') doPlay();
    else if (k === 'discard') doDiscard();
    else if (k === 'sort') { st.sortBy = st.sortBy === 'tag' ? 'value' : 'tag'; store.set('ie2080.sort', st.sortBy); render(); }
    else if (k === 'speed') { st.speed = st.speed >= 4 ? 1 : st.speed * 2; store.set('ie2080.speed', String(st.speed)); render(); }
    else if (k === 'deck') UI().pushModal(deckHtml(st.s), { close: UI().closeModal }, { dismiss: () => {} });
    else if (k === 'codex') UI().pushModal(codexHtml(st.s, IE.Game.meta || {}), { close: UI().closeModal }, { dismiss: () => {} });
    else if (k === 'leave') leave();
  }
  function toggle(uid) {
    const SR = IE.Stages ? IE.Stages.scoring(st.s) : null;
    const c = st.s.cards.find((x) => x.uid === uid);
    if (st.sel.includes(uid)) st.sel = st.sel.filter((u) => u !== uid);
    else if (SR && c && SR.forbidden(c)) { $('.ct-info').textContent = '外星評審：這張素材不能用。'; return; }
    else if (st.sel.length < (SR ? SR.maxCards : 5)) st.sel.push(uid);
    else { if (SR && SR.maxCards < 5) $('.ct-info').textContent = '外星評審：每次最多下筆 ' + SR.maxCards + ' 張。'; return; }
    A().fx('card', st.sel.length * 2);
    render();
  }
  function key(k) {
    if (!st || st.busy) { if (st) st.fast = true; return; }
    if (/^[1-9]$/.test(k)) { const c = sortedHand()[Number(k) - 1]; if (c) toggle(c.uid); }
    else if (k === 'Enter') doPlay();
    else if (k === 'd' || k === 'D' || k === 'Backspace') doDiscard();
    else if (k === 's' || k === 'S') { st.sortBy = st.sortBy === 'tag' ? 'value' : 'tag'; render(); }
  }
  // 使用工具卡：先選素材，再按工具卡
  function useTool(idx) {
    const r = IE.Stages.useTool(st.s, idx, st.sel.slice());
    $('.ct-info').innerHTML = esc(r.msg);
    if (r.ok) { A().sfx('pickup'); st.sel = []; burst($('.ct-tools'), 24, 0.8, '#9be36b'); }
    else A().sfx('wrong');
    render();
  }
  // 牌庫檢視：還沒抽的素材按標籤分佈
  function deckHtml(s) {
    const ses = s.session;
    const left = ses.deck.map((u) => s.cards.find((c) => c.uid === u)).filter(Boolean);
    const counts = {};
    left.forEach((c) => c.tags.forEach((g) => { counts[g] = (counts[g] || 0) + 1; }));
    const max = Math.max(1, ...Object.values(counts));
    const rows = Object.keys(D().TAGS).filter((g) => counts[g]).sort((a, b) => counts[b] - counts[a]).map((g) => '<div class="dk-row"><span class="tag" style="--c:' + D().TAGS[g].color + '">' + D().TAGS[g].name + '</span>'
      + '<div class="dk-bar"><i style="width:' + counts[g] / max * 100 + '%;background:' + D().TAGS[g].color + '"></i></div><b class="num">' + counts[g] + '</b></div>').join('');
    return '<div class="modal wide"><h2>牌庫</h2><p class="mute" style="font-size:13px">還沒抽到的素材有 ' + left.length + ' 張（用過的 ' + ses.used.length + ' 張會在牌庫抽完後洗回去）。改稿前看看接下來最可能抽到甚麼。</p>'
      + '<div class="dk-rows">' + (rows || '<p class="mute">牌庫已經抽完。</p>') + '</div>'
      + '<h3>未抽的素材</h3><div class="dk-cards">' + left.slice().sort((a, b) => b.value - a.value).map((c) => '<span class="dk-card">' + esc(c.name) + ' <small>' + c.tags.map((g) => D().TAGS[g].name).join('・') + '・' + c.value + '</small></span>').join('') + '</div>'
      + '<div class="btn-row"><button class="btn primary" type="button" data-do="close">返回</button></div></div>';
  }
  function leave() {
    if (st.busy) return;
    const s = st.s;
    if (!s.session.log.length) {
      C().cancel(s);
      close(null);
      return;
    }
    endNight();
  }

  // ---------- 演出工具 ----------
  const speedK = () => (IE.Pixel.reducedMotion ? 4 : st.fast ? 5 : st.speed);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms / speedK()));
  function rectOf(el) {
    const a = el.getBoundingClientRect();
    return { x: a.left + a.width / 2, y: a.top + a.height / 2, w: a.width, h: a.height, top: a.top };
  }
  function floatText(el, text, cls) {
    if (!root || !el) return;
    const r = rectOf(el);
    const f = document.createElement('div');
    f.className = 'ct-float ' + (cls || '');
    f.textContent = text;
    f.style.left = r.x + 'px';
    f.style.top = r.top + 'px';
    root.appendChild(f);
    const dur = 900 / Math.min(2, speedK());
    f.animate([{ transform: 'translate(-50%, 0) scale(0.6)', opacity: 0 }, { transform: 'translate(-50%, -22px) scale(1.15)', opacity: 1, offset: 0.25 },
      { transform: 'translate(-50%, -44px) scale(1)', opacity: 0 }], { duration: dur, easing: 'ease-out' });
    setTimeout(() => f.remove(), dur);
  }
  function bump(el, scale) {
    if (!el) return;
    el.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-12px) scale(' + (scale || 1.12) + ')' }, { transform: 'translateY(0) scale(1)' }],
      { duration: 260 / Math.min(2, speedK()), easing: 'ease-out' });
  }
  function wiggle(el) {
    if (!el) return;
    el.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-9deg) scale(1.15)' }, { transform: 'rotate(7deg) scale(1.1)' }, { transform: 'rotate(0)' }],
      { duration: 320 / Math.min(2, speedK()), easing: 'ease-out' });
  }
  function pulse(el, color) {
    if (!el) return;
    el.animate([{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: 'scale(1.18)', filter: 'brightness(1.6)' }, { transform: 'scale(1)', filter: 'brightness(1)' }],
      { duration: 220 / Math.min(2, speedK()) });
    if (color) el.style.setProperty('--glow', color);
  }
  function shake(mag) {
    if (IE.Pixel.reducedMotion || !root) return;
    const el = $('.ct-inner');
    const k = [];
    for (let i = 0; i < 6; i++) k.push({ transform: 'translate(' + ((Math.random() - 0.5) * mag * 2).toFixed(1) + 'px,' + ((Math.random() - 0.5) * mag * 2).toFixed(1) + 'px)' });
    k.push({ transform: 'translate(0,0)' });
    el.animate(k, { duration: 260 + mag * 12 });
  }
  function tag(text, cls) {
    const t = document.createElement('span');
    t.className = 'ct-tag ' + (cls || '');
    t.textContent = text;
    $('.ct-tags').appendChild(t);
    t.animate([{ transform: 'scale(2.2) rotate(-6deg)', opacity: 0 }, { transform: 'scale(1) rotate(-2deg)', opacity: 1 }], { duration: 260 / Math.min(2, speedK()), easing: 'cubic-bezier(.2,2,.4,1)' });
  }

  // ---------- 火焰粒子（倍率燃燒） ----------
  let fx = null;
  function fxInit() {
    const cv = $('.ct-fx');
    const ctx = cv.getContext('2d');
    fx = { cv, ctx, ps: [], burn: 0, raf: 0 };
    const resize = () => { const d = Math.min(2, window.devicePixelRatio || 1); cv.width = innerWidth * d; cv.height = innerHeight * d; cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px'; ctx.setTransform(d, 0, 0, d, 0, 0); };
    resize();
    fx.resize = resize;
    window.addEventListener('resize', resize);
    let last = performance.now();
    const loop = (now) => {
      if (!fx) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      // 倍率燃燒：倍率越高，火越大
      if (fx.burn > 0 && root) {
        const r = rectOf($('.ct-mult'));
        const n = Math.min(14, fx.burn) * dt * 22;
        for (let i = 0; i < n; i++) emit(r.x + (Math.random() - 0.5) * r.w, r.top + r.h * 0.4, 1);
      }
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = fx.ps.length - 1; i >= 0; i--) {
        const p = fx.ps[i];
        p.age += dt;
        if (p.age >= p.life) { fx.ps.splice(i, 1); continue; }
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        const k = 1 - p.age / p.life;
        ctx.globalAlpha = k;
        ctx.fillStyle = k > 0.7 ? '#fff2a8' : k > 0.45 ? '#ffc247' : k > 0.25 ? '#ff8a3c' : '#ff4d5e';
        if (p.col) ctx.fillStyle = p.col;
        const sz = Math.max(2, Math.round(p.size * (0.4 + k * 0.6)));
        ctx.fillRect(Math.round(p.x), Math.round(p.y), sz, sz);
      }
      ctx.globalAlpha = 1;
      fx.raf = requestAnimationFrame(loop);
    };
    fx.raf = requestAnimationFrame(loop);
  }
  function emit(x, y, power, col) {
    if (!fx || IE.Pixel.reducedMotion) return;
    fx.ps.push({ x, y, vx: (Math.random() - 0.5) * 40 * power, vy: -60 - Math.random() * 90 * power, g: -20, life: 0.5 + Math.random() * 0.6, age: 0, size: 3 + Math.random() * 4 * power, col });
  }
  function burst(el, n, power, col) {
    if (!el || !fx) return;
    const r = rectOf(el);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (60 + Math.random() * 200) * power;
      fx.ps.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, g: 160, life: 0.6 + Math.random() * 0.7, age: 0, size: 3 + Math.random() * 4, col });
    }
  }
  function fxStop() {
    if (!fx) return;
    cancelAnimationFrame(fx.raf);
    window.removeEventListener('resize', fx.resize);
    fx = null;
  }

  // ---------- 下筆 ----------
  async function doPlay() {
    const s = st.s, ses = s.session;
    if (st.busy || !st.sel.length || ses.plays <= 0) return;
    st.busy = true; st.fast = false; st.chipN = 0;
    const uids = st.sel.slice();
    st.sel = [];
    const snap = uids.map((u) => Object.assign({}, s.cards.find((c) => c.uid === u)));
    const pv = C().preview(s, uids);
    // 素材飛上舞台
    $('.ct-tags').innerHTML = '';
    $('.ct-played').innerHTML = snap.map((c) => cardEl(s, c, { stage: true, dim: !pv.scoring.includes(c.uid) })).join('');
    $('.ct-hand').innerHTML = sortedHand().filter((c) => !uids.includes(c.uid)).map((c) => cardEl(s, c)).join('');
    root.querySelectorAll('.ct-played .cc').forEach((el, i) => {
      el.animate([{ transform: 'translateY(120px) rotate(' + (i * 4 - 8) + 'deg)', opacity: 0 }, { transform: 'translateY(0) rotate(0)', opacity: 1 }],
        { duration: 260 / Math.min(2, speedK()), delay: i * 50 / speedK(), easing: 'cubic-bezier(.2,1.4,.4,1)', fill: 'backwards' });
    });
    A().fx('card', 4);
    $('.ct-play').disabled = true; $('.ct-discard').disabled = true;
    $('.ct-hint').innerHTML = '';
    await wait(380);
    const res = C().play(s, uids);
    await animate(res);
    await showTotal(res);
    // 收起舞台，補牌
    root.querySelectorAll('.ct-played .cc').forEach((el, i) => el.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-60px) rotate(' + (i * 6 - 10) + 'deg)', opacity: 0 }],
      { duration: 300 / Math.min(2, speedK()), fill: 'forwards' }));
    await wait(320);
    $('.ct-played').innerHTML = '';
    $('.ct-total').hidden = true;
    fx && (fx.burn = 0);
    $('.ct-mult').classList.remove('burning', 'inferno');
    st.busy = false;
    render();
    root.querySelectorAll('.ct-hand .cc').forEach((el, i) => el.animate([{ transform: 'translateY(40px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: 220, delay: i * 30, fill: 'backwards' }));
    if (ses.plays <= 0 || !ses.hand.length) await endNight();
  }

  async function animate(res) {
    const s = st.s;
    const stageCard = (uid) => root.querySelector('.ct-played .cc[data-uid="' + uid + '"]');
    const objEl = (slot) => root.querySelector('.ct-obj[data-slot="' + slot + '"]');
    const multEl = $('.ct-mult'), chipsEl = $('.ct-chips');
    let n = 0;
    for (const x of res.steps) {
      if (!root) return;
      switch (x.t) {
        case 'form':
          $('.ct-form .fn').textContent = C().FORM[x.form].name;
          $('.ct-form .fl').textContent = 'Lv.' + x.level;
          setBoxes(x.chips, x.mult);
          pulse(chipsEl); pulse(multEl);
          A().fx('chip', 0);
          await wait(320);
          break;
        case 'card': {
          const el = stageCard(x.uid);
          bump(el);
          floatText(el, '+' + x.chips, 'chips');
          setBoxes(x.C, x.M);
          pulse(chipsEl);
          A().fx('chip', ++n);
          await wait(x.again ? 260 : 300);
          break;
        }
        case 'mod': {
          const el = stageCard(x.uid);
          floatText(el, x.chips ? '+' + x.chips : x.mult ? '+' + x.mult + ' 倍率' : '×' + x.xmult, x.chips ? 'chips' : 'mult');
          setBoxes(x.C, x.M);
          pulse(x.chips ? chipsEl : multEl);
          A().fx(x.xmult ? 'xmult' : 'mult', ++n);
          await wait(280);
          break;
        }
        case 'obj': {
          const el = objEl(x.slot);
          wiggle(el);
          if (x.uid != null) bump(stageCard(x.uid), 1.06);
          floatText(el, x.xmult ? '×' + x.xmult : x.mult ? '+' + x.mult + ' 倍率' : '+' + x.chips, x.xmult ? 'xmult' : x.mult ? 'mult' : 'chips');
          setBoxes(x.C, x.M);
          pulse(x.chips && !x.mult ? chipsEl : multEl);
          A().fx(x.xmult ? 'xmult' : 'mult', ++n);
          if (x.xmult) shake(4);
          await wait(x.xmult ? 420 : 300);
          break;
        }
        case 'recipe':
          tag((x.isNew ? '新組合！' : '') + x.name + '　+' + x.chips + ' 籌碼　+' + x.mult + ' 倍率' + (x.xmult ? '　×' + x.xmult : ''),
            x.legend ? 'legend' : x.isNew ? 'new' : 'recipe');
          setBoxes(x.C, x.M);
          pulse(chipsEl); pulse(multEl);
          if (x.legend) {
            A().fx('legend');
            shake(14);
            burst($('.ct-tags'), 80, 1.4, '#ffd36b');
            flash('#ffd36b');
            await wait(900);
          } else {
            A().fx(x.isNew ? 'xmult' : 'mult', ++n);
            if (x.isNew) burst($('.ct-tags'), 30, 0.8, '#ffd36b');
            await wait(x.isNew ? 520 : 380);
          }
          break;
        case 'ai':
          tag('AI 模仿 ×' + x.x, 'ai');
          setBoxes(res.chips, Math.round(Number($('.ct-mult b').textContent) * x.x * 10) / 10);
          A().sfx('wrong');
          await wait(320);
          break;
        case 'blocked': {
          const el = stageCard(x.uid);
          if (el) { el.classList.add('blocked'); floatText(el, '不計分', 'bad'); wiggle(el); }
          A().sfx('wrong');
          await wait(260);
          break;
        }
        case 'stage':
          tag('外星評審（' + x.name + '）×' + x.x, x.x >= 1 ? 'kpi-good' : 'kpi-bad');
          A().sfx(x.x >= 1 ? 'combo' : 'wrong');
          if (x.x !== 1) shake(6);
          await wait(360);
          break;
        case 'world':
          tag('世界事件 ×' + x.x, 'kpi-good');
          await wait(260);
          break;
        case 'trip':
          tag((x.abroad ? '異鄉之夜' : '旅行的餘韻') + ' ×' + x.x, 'kpi-good');
          A().fx('mult', 3);
          await wait(300);
          break;
        case 'kpi':
          tag('外星 KPI ×' + x.x, x.x >= 1 ? 'kpi-good' : 'kpi-bad');
          A().sfx(x.x >= 1 ? 'combo' : 'wrong');
          await wait(320);
          break;
        case 'spark':
          tag('× 火花 ' + x.x.toFixed(1), 'spark');
          A().fx('burn');
          fx && (fx.burn = Math.log10(Math.max(1, res.mult)) * 6);
          multEl.classList.add('burning');
          if (res.mult >= 20) multEl.classList.add('inferno');
          shake(Math.min(10, 3 + res.mult / 6));
          await wait(520);
          break;
      }
      // 倍率越高，倍率格燒得越旺
      const M = x.M || 0;
      if (fx && M >= 8) { fx.burn = Math.max(fx.burn, Math.log10(M) * 4); multEl.classList.add('burning'); }
    }
  }

  function flash(color) {
    if (!root || IE.Pixel.reducedMotion) return;
    const f = document.createElement('div');
    f.className = 'ct-flash';
    f.style.background = color;
    root.appendChild(f);
    f.animate([{ opacity: 0.6 }, { opacity: 0 }], { duration: 500 });
    setTimeout(() => f.remove(), 500);
  }

  async function showTotal(res) {
    const s = st.s;
    const el = $('.ct-total');
    el.hidden = false;
    const size = Math.min(84, 30 + Math.log10(Math.max(10, res.total)) * 10);
    el.style.fontSize = size + 'px';
    const record = res.total > st.best;
    const steps = 18;
    for (let i = 1; i <= steps; i++) {
      const v = Math.round(res.total * (1 - Math.pow(1 - i / steps, 3)));
      el.textContent = fmt(v);
      if (i % 3 === 0) A().fx('chip', 12 + i / 2);
      await wait(34);
    }
    el.textContent = fmt(res.total);
    A().fx('total', Math.min(12, Math.round(Math.log10(Math.max(10, res.total)) * 2)));
    el.animate([{ transform: 'translate(-50%,-50%) scale(1.6)' }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: 280, easing: 'cubic-bezier(.2,2,.4,1)' });
    const mag = Math.log10(Math.max(10, res.total));
    shake(Math.min(18, mag * 2.5));
    burst(el, Math.min(120, Math.round(mag * 14)), Math.min(1.6, mag / 3));
    if (record) {
      st.best = res.total;
      tag('新紀錄！', 'legend');
      flash('#ff4fb4');
      A().sfx('boom');
    }
    // 數字飛向「今晚」
    const night = $('.ct-night b');
    night.textContent = fmt(s.session ? s.session.total : res.total);
    pulse(night);
    renderGoal();
    if (res.reliefApplied) tag('愧疚寫進作品：靈魂 −' + res.reliefApplied + ' 克', 'relief');
    (res.notes || []).forEach((n) => tag(n, 'ai'));
    if (res.fresh && res.fresh.length && res.sparkUp) tag('靈光一閃：火花 +' + res.sparkUp, 'spark');
    await wait(record ? 1300 : 900);
  }

  // ---------- 改稿 ----------
  async function doDiscard() {
    const s = st.s, ses = s.session;
    if (st.busy || !st.sel.length || ses.discards <= 0) return;
    st.busy = true;
    const uids = st.sel.slice();
    root.querySelectorAll('.ct-hand .cc').forEach((el) => {
      if (uids.includes(Number(el.dataset.uid))) el.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(80px) rotate(20deg)', opacity: 0 }], { duration: 260, fill: 'forwards' });
    });
    A().fx('card', 1);
    await wait(280);
    st.sel = [];
    C().discard(s, uids);
    st.busy = false;
    render();
    root.querySelectorAll('.ct-hand .cc').forEach((el) => {
      if (!el.dataset.seen) el.animate([{ transform: 'translateY(40px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 220 });
    });
  }

  function stageResultHtml(g) {
    return '<div class="ct-stage-result ' + (g.pass ? 'pass' : 'fail') + '"><span class="sr-stamp">' + (g.pass ? '入選' : '落選') + '</span>'
      + '<b>第 ' + g.index + ' 關・' + esc(g.name) + '</b><span class="num">' + fmt(g.score) + ' / ' + fmt(g.target) + '</span>'
      + (g.lines.length ? '<small>' + esc(g.lines.join('・')) + '</small>' : '')
      + (g.tools.length ? '<small>工具卡：' + g.tools.map((id) => esc(IE.Stages.TOOL[id].name)).join('、') + '</small>' : '')
      + (g.objs.length ? '<small>靈感物件：' + g.objs.map((id) => esc(D().OBJ[id].name)).join('、') + '</small>' : '') + '</div>';
  }
  // ---------- 今晚完成 ----------
  async function endNight() {
    const s = st.s;
    st.busy = true;
    const before = st.sigStart;
    const res = C().finish(s);
    const w = res.work;
    const fresh = [...new Set(res.session.fresh)].map((id) => D().RECIPES.find((r) => r.id === id)).filter(Boolean);
    const th = R().threshold(s);
    const after = R().signal(s);
    const best = s.stats.bestWork && w && s.stats.bestWork === w;
    const panel = document.createElement('div');
    panel.className = 'ct-end';
    panel.innerHTML = '<div class="ct-end-card">'
      + '<span class="mute">今晚的作品</span>'
      + '<h2>' + (w ? '《' + esc(w.name) + '》' : '今晚甚麼都沒有寫') + '</h2>'
      + '<div class="ct-end-score num">0</div>'
      + (best ? '<p class="ct-best">你最好的作品！它會沉入舊城，等下一局的你把它打撈上來。</p>' : '')
      + '<ul class="ct-end-log">' + res.session.log.map((x, i) => '<li><span>第 ' + (i + 1) + ' 筆・' + C().FORM[x.form].name + '</span><b class="num">' + fmt(x.total) + '</b></li>').join('') + '</ul>'
      + (fresh.length ? '<p class="ct-fresh">新發現的組合：' + fresh.map((r) => '<b' + (r.legend ? ' class="lg"' : '') + '>' + esc(r.name) + '</b>').join('、') + '</p>' : '')
      + (res.session.relief ? '<p class="relief">你把愧疚寫了出來，靈魂輕了 ' + res.session.relief + ' 克。</p>' : '')
      + (res.stage ? stageResultHtml(res.stage) : '')
      + (res.paid && res.paid.length ? res.paid.map((p) => '<p class="ct-paid">天空區委託完成：' + esc(p.text) + '　<b class="num">+$' + fmt(p.pay) + '</b></p>').join('') : '')
      + '<div class="ct-goal end"><span class="lbl">本季訊號</span><div class="bar"><i style="width:' + Math.min(100, before / th * 100) + '%"></i></div><b class="num">' + IE.UI.kfmt(after) + ' / ' + IE.UI.kfmt(th) + '</b></div>'
      + '<button type="button" class="btn primary big" data-end="done">完成</button></div>';
    root.appendChild(panel);
    let closed = false;
    panel.querySelector('[data-end="done"]').addEventListener('click', () => {
      if (closed) return;
      closed = true;
      if (IE.Game.celebrate) IE.Game.celebrate(w ? w.score : 0);
      close(res);
    });
    panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
    const sc = panel.querySelector('.ct-end-score');
    const total = w ? w.score : 0;
    for (let i = 1; i <= 24 && !closed; i++) { sc.textContent = fmt(total * (1 - Math.pow(1 - i / 24, 3))); if (i % 4 === 0) A().fx('chip', i / 2); await wait(30); }
    if (closed) return;
    sc.textContent = fmt(total);
    A().sfx('boom');
    burst(sc, 100, 1.4);
    shake(10);
    panel.querySelector('.ct-goal i').style.transition = 'width 1.2s ease';
    requestAnimationFrame(() => { panel.querySelector('.ct-goal i').style.width = Math.min(100, after / th * 100) + '%'; });
    if (after >= th && before < th) { setTimeout(() => { A().sfx('combo'); flash('#9be36b'); }, 900); }
    if (!closed) panel.querySelector('[data-end="done"]').focus({ preventScroll: true });
  }

  // ---------- 教學與圖鑑 ----------
  function tutorialHtml() {
    return '<div class="modal"><h2>創作之夜</h2><div class="help">'
      + '<p>從素材庫抽一手素材。每晚可以<b>下筆</b>三次、<b>改稿</b>兩次；三次下筆的分數加起來，就是今晚的作品。</p>'
      + '<ul><li>選 1 至 5 張素材下筆。同一標籤出現得越多，<b>作品形式</b>越高級：短詩、對聯、歌、小說、壁畫、交響曲、史詩……</li>'
      + '<li>特定標籤組合會觸發<b>具名組合</b>（例如「水＋記憶＋飢餓」＝水淹童年）。組合要<b>純</b>：下筆的每一張都要有組合要求的標籤。還有隱藏的<b>傳說組合</b>等你發現。</li>'
      + '<li>選牌時會顯示<b>預計得分</b>，以及「加入某張就成為某個組合」的提示；「牌庫」可以看接下來會抽到甚麼。</li>'
      + '<li>每季第 7、14、20 天晚上是<b>關卡之夜</b>：一晚之內要達到目標分數。第 20 天的外星評審還會改寫規則。<b>工具卡</b>可以在這裡改造素材。</li>'
      + '<li><b>靈感物件</b>會在計分時觸發；朋友、潛水、事件和二手市集都可以找到。</li>'
      + '<li>分數 = 籌碼 × 倍率 × 火花。素材用得越多次越殘；同一種形式用得太密，AI 會學會你的風格。</li>'
      + '<li>白天做不同的事，會練成不同的技法，令相應的作品形式升級。</li></ul>'
      + '<p class="mute">演出時點一下畫面可以快轉；右上角可以調整速度。</p></div>'
      + '<div class="btn-row"><button class="btn primary" type="button" data-do="close">開始創作</button></div></div>';
  }
  function recipeHint(r) {
    if (r.hint) return r.hint;
    const tags = Object.keys(r.need).map((t) => (r.need[t] > 1 ? '「' + D().TAGS[t].name + '」×' + r.need[t] : '「' + D().TAGS[t].name + '」'));
    return tags.length > 1 ? '需要' + tags.slice(0, -1).join('、') + '，還有一樣東西……' : '需要很多' + tags[0] + '……';
  }
  function codexHtml(s, meta) {
    const known = (id) => !!(s.discovered[id] || (meta.recipes && meta.recipes[id]));
    const forms = D().FORMS.map((f) => {
      const seen = (s.formsSeen && s.formsSeen[f.id]) || (meta.forms && meta.forms[f.id]) || !f.secret;
      const st2 = C().formStats(s, f.id);
      return '<div class="recipe' + (seen ? '' : ' unknown') + '"><b>' + (seen ? f.name + ' Lv.' + st2.level : '？？？') + '</b>'
        + '<span>' + (seen ? esc(f.desc) : '一種隱藏的作品形式') + '</span>'
        + (seen ? '<span class="mute">' + st2.chips + ' 籌碼 × ' + st2.mult + ' 倍率・練習：' + esc(f.teach) + '</span>' : '') + '</div>';
    }).join('');
    const nKnown = D().RECIPES.filter((r) => known(r.id)).length;
    const recipes = D().RECIPES.map((r) => {
      const k = known(r.id);
      const tags = Object.keys(r.need).map((t) => (r.need[t] > 1 ? D().TAGS[t].name + '×' + r.need[t] : D().TAGS[t].name)).join(' + ');
      return '<div class="recipe' + (k ? '' : ' unknown') + (r.legend ? ' legend' : '') + '"><b>' + (k ? esc(r.name) : r.legend ? '？？？ 傳說' : '？？？') + '</b>'
        + '<span>' + (k ? esc(tags || '特殊條件') + (r.hint ? '：' + esc(r.hint) : '') : esc(recipeHint(r))) + '</span>'
        + '<span class="mute">+' + r.chips + ' 籌碼・+' + r.mult + ' 倍率' + (r.xmult ? '・×' + r.xmult : '') + '</span></div>';
    }).join('');
    return '<div class="modal wide"><h2>創作圖鑑</h2>'
      + '<h3>作品形式</h3><div class="recipes">' + forms + '</div>'
      + '<h3>具名組合（' + nKnown + '/' + D().RECIPES.length + '）</h3><div class="recipes">' + recipes + '</div>'
      + '<div class="btn-row"><button class="btn primary" type="button" data-do="close">收起</button></div></div>';
  }

  IE.Craft = { open, isOpen, key, codexHtml, cardEl, isBusy: () => !!(st && st.busy) };
})(window.IE = window.IE || {});
