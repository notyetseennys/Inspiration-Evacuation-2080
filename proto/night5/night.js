// 創作之夜原型第四版：畫面和演出。第四版加上：每晚的難題、提示、收工時的進修和改造、會動的畫。
// （以下沿用第三版的說明）規則在 engine.js，歌在 music.js，畫在 painter.js，音效在 sfx.js。
// 原則：不替玩家找答案；排列是形式（起承轉合），標籤是內容（複合情緒和題材）；每一筆同時是畫的一層、歌的一段、詩的一節；
// 收工得到一件可以分享的作品。選牌時有背景音樂；下筆演出和播放作品時，背景音樂淡出。
(function () {
  'use strict';
  const IE = window.IE, D = IE.DATA, P = IE.Proto2, Pt = IE.Painter, S = IE.Sfx, Mu = IE.Music;
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const fmtM = (m) => String(Math.round(m * 10) / 10);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('ie-night2.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('ie-night2.' + k, JSON.stringify(v)); } catch (e) { /* 私密瀏覽：不記住 */ } },
  };
  const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const BASE_SPEED = reduced ? 3 : 1;
  let speed = BASE_SPEED, busy = false, run = null, sel = [], tipStep = 0, lastStruct = null, pending = null, hero = 'copywriter', current = null;
  const wait = (ms) => new Promise((res) => setTimeout(res, ms / speed));
  const imgSrc = (n) => { const s = IE.img ? IE.img(n) : ''; return s && s.indexOf('data:') !== 0 ? '../../game/' + s : s; };
  const tagName = (t) => D.TAGS[t].name;
  const tagColor = (t) => D.TAGS[t].color;
  function tagText(t) {
    const h = tagColor(t).replace('#', '');
    const v = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    return 0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2] > 0.56 ? '#1b1b1b' : '#ffffff';
  }
  const MED = { paper: '紙', sound: '聲', image: '影', body: '身', data: '數' };
  const PART = { paper: '人聲', sound: '旋律', image: '和聲', body: '鼓', data: '琶音' };
  const ROLE = { qi: '起', cheng: '承', zhuan: '轉', he: '合', zhuanhe: '轉合' };
  const NUM = ['零', '一', '兩', '三', '四', '五'];
  const recipeOf = (id) => D.RECIPES.find((x) => x.id === id);
  // ---------- 圖鑑：發現過的複合情緒和名作，存在這部裝置，跨局累積 ----------
  const col = store.get('col5', { pairs: {}, works: {}, nights: 0 });
  col.pairs = col.pairs || {}; col.works = col.works || {};
  const saveCol = () => store.set('col5', col);
  const pairKeyOf = (c) => (c.tags.length >= 2 && c.tags[0] !== c.tags[1] ? c.tags.slice(0, 2).sort((a, b) => wpos(a) - wpos(b)).join('+') : null);
  const TOTAL_PAIRS = 45, TOTAL_WORKS = P.RECIPES.length;
  const colCount = () => ({ pairs: Object.keys(col.pairs).length, works: Object.keys(col.works).length });
  function renderColBtn() { const b = $('btnBook'); if (b) { const c = colCount(); b.textContent = '圖鑑 ' + (c.pairs + c.works) + '／' + (TOTAL_PAIRS + TOTAL_WORKS); } }
  const C = (id) => P.COLABS[id];
  function wishHint(need) {
    const ks = Object.keys(need), sum = ks.reduce((a, t) => a + need[t], 0);
    return NUM[ks.length] + '種情緒' + (sum > ks.length ? '，合共 ' + sum + ' 張' : '') + '；每張計分的素材都要帶有其中一種';
  }
  const linkLabel = (k) => (k === 'same' ? '<b>承</b><small>+2</small>' : k === 'near' ? '<b>承</b><small>+1</small>' : k === 'fix' ? '<b>修</b><small>+2</small>' : k === 'zhuan' ? '<b>轉</b><small>×2</small>' : '<b>斷</b>');

  // ---------- 背景音樂（遊戲的配樂；演出時淡出） ----------
  const BGM = {
    el: null, name: null, vol: 0.32, want: 0, timer: null,
    base() { return window.IE_BGM_BASE || '../../game/audio/'; },
    play(name) {
      if (!name) return;
      if (this.name !== name) {
        if (this.el) { const old = this.el; this.fadeEl(old, 0, 500, () => old.pause()); }
        try { this.el = new Audio(this.base() + name + '.mp3'); this.el.loop = true; this.el.volume = 0; } catch (e) { this.el = null; return; }
        this.name = name;
      }
      this.duck(false);
    },
    fadeEl(el, to, ms, done) {
      const from = el.volume, start = performance.now();
      const step = () => { const k = Math.min(1, (performance.now() - start) / ms); try { el.volume = Math.max(0, Math.min(1, from + (to - from) * k)); } catch (e) { /* 有些瀏覽器不准改音量 */ } if (k < 1) requestAnimationFrame(step); else if (done) done(); };
      requestAnimationFrame(step);
    },
    duck(on) {
      const el = this.el;
      if (!el) return;
      if (on || S.muted) { this.fadeEl(el, 0, 400, () => { if (el.volume === 0) el.pause(); }); return; }
      const p = el.play(); if (p && p.catch) p.catch(() => {});
      this.fadeEl(el, this.vol, 900);
    },
  };

  // ---------- 小工具：浮動數字、粒子、震動 ----------
  function elCenter(el) { const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }
  const canvasCenter = () => elCenter($('paint'));
  function floatAt(p, text, cls) {
    const el = document.createElement('div');
    el.className = 'float ' + (cls || '');
    el.textContent = text;
    el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
    $('fx').appendChild(el);
    setTimeout(() => el.remove(), 950);
  }
  function burst(p, n, colors) {
    if (reduced) return;
    for (let i = 0; i < n; i++) {
      const b = document.createElement('i');
      b.className = 'bit';
      b.style.left = p.x + 'px'; b.style.top = p.y + 'px';
      b.style.background = colors[i % colors.length];
      const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 180;
      b.style.setProperty('--dx', (Math.cos(a) * d).toFixed(0) + 'px');
      b.style.setProperty('--dy', (Math.sin(a) * d - 50).toFixed(0) + 'px');
      b.style.setProperty('--rot', (Math.random() * 720 - 360).toFixed(0) + 'deg');
      $('fx').appendChild(b);
      setTimeout(() => b.remove(), 1200);
    }
  }
  function shake(power) {
    if (reduced) return;
    const app = $('app');
    app.style.setProperty('--sh', (2 + 11 * Math.min(1, power)).toFixed(1) + 'px');
    app.classList.remove('shake'); void app.offsetWidth; app.classList.add('shake');
  }
  function bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  function hint(text, tip) { const h = $('hint'); h.textContent = text || ''; h.classList.toggle('tip', !!tip); }
  function canvasBanner(text, sub, cls) {
    const el = document.createElement('div');
    el.className = 'banner' + (cls ? ' ' + cls : '');
    el.innerHTML = (sub ? '<small>' + esc(sub) + '</small>' : '') + esc(text);
    $('canvasFx').appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }
  // 名作揭曉：整幅插畫、印章、標題；第一次收藏時停留久一點
  function revealWork(id, name, firstEver) {
    return new Promise((res) => {
      const el = document.createElement('div');
      el.className = 'reveal' + (firstEver ? ' first' : '');
      el.innerHTML = '<img src="' + Pt.src('np-work-' + id) + '" alt=""><span class="seal">名作</span>'
        + '<div class="cap"><b>《' + esc(name) + '》</b><small>' + (firstEver ? '第一次收藏・名作 ' + (colCount().works + 1) + '／' + TOTAL_WORKS : '再次完成') + '</small></div>';
      $('canvasFx').appendChild(el);
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 420); res(); }, (firstEver ? 2600 : 1300) / (speed > 1 ? 3 : 1));
    });
  }
  // 這一筆之後收錄圖鑑
  function collect(res) {
    const fresh = [];
    res.run.forEach((u) => { const c = P.cardOf(run, u), k = c && pairKeyOf(c); if (k && !col.pairs[k]) { col.pairs[k] = 1; fresh.push(P.compoundOf(c).name); } });
    (res.recipes || []).forEach((id) => { if (!col.works[id]) col.works[id] = 1; });
    saveCol(); renderColBtn();
    if (fresh.length) { const b = $('btnBook'); if (b) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); floatAt(elCenter(b), '圖鑑 +' + fresh.length + '：' + fresh.join('、'), 'rule'); } }
  }
  // 差一張就是名作：提示缺哪一種情緒（未收藏的優先）
  function nearMiss() {
    if (!run || !run.cur || !sel.length || sel.length >= run.cur.maxCards) return '';
    const cards = sel.map((u) => P.cardOf(run, u)), cnt = {};
    cards.forEach((c) => c.tags.forEach((t) => { cnt[t] = (cnt[t] || 0) + 1; }));
    let best = null;
    P.RECIPES.forEach((r) => {
      if (!cards.every((c) => c.tags.some((t) => r.need[t]))) return;
      const miss = []; let m = 0;
      Object.keys(r.need).forEach((t) => { const d = r.need[t] - (cnt[t] || 0); if (d > 0) { m += d; miss.push(t); } });
      if (m !== 1) return;
      const inHand = run.cur.hand.some((u) => { if (sel.includes(u)) return false; const c = P.cardOf(run, u); return c.tags.includes(miss[0]) && c.tags.some((t) => r.need[t]) && c.tags.every((t) => r.need[t]); });
      const score = (inHand ? 2 : 0) + (col.works[r.id] ? 0 : 1);
      if (!best || score > best.score) best = { r, t: miss[0], inHand, score };
    });
    if (!best) return '';
    return '差一張「' + tagName(best.t) + '」就是' + (col.works[best.r.id] ? '' : '未收藏的') + '名作《' + best.r.name + '》' + (best.inHand ? '，手上有。' : '。');
  }
  function showBook() {
    const Wl = D.WHEEL, c = colCount();
    let ph = '';
    for (let i = 0; i < 10; i++) for (let j = i + 1; j < 10; j++) {
      const a = Wl[i], b = Wl[j], found = col.pairs[a + '+' + b];
      ph += '<div class="bk' + (found ? '' : ' lock') + '">' + (found ? '<img src="' + Pt.src('np-duo-' + a + '-' + b) + '" alt="" loading="lazy">' : '<span class="q">？</span>')
        + '<b>' + (found ? esc(P.pairOf(a, b).name) : '？？') + '</b><small><i style="--c:' + tagColor(a) + '"></i><i style="--c:' + tagColor(b) + '"></i>' + tagName(a) + '×' + tagName(b) + '</small></div>';
    }
    const wh = P.RECIPES.map((r) => {
      const found = col.works[r.id];
      return '<div class="bk wide' + (found ? '' : ' lock') + '">' + (found ? '<img src="' + Pt.src('np-work-' + r.id) + '" alt="" loading="lazy">' : '<span class="q">？</span>')
        + '<b>' + (found ? '《' + esc(r.name) + '》' : '？？？') + '</b><small>' + esc(wishHint(r.need)) + '</small></div>';
    }).join('');
    sheet('<span class="title-mark">圖鑑</span><h2>你發現過的創作</h2>'
      + '<p class="sub">打出兩種情緒的素材，就會收錄那種複合情緒；湊齊名作的情緒，就會收藏名作。記錄存在這部裝置。</p>'
      + '<h3 class="bk-h">複合情緒 ' + c.pairs + '／' + TOTAL_PAIRS + '</h3><div class="book">' + ph + '</div>'
      + '<h3 class="bk-h">名作 ' + c.works + '／' + TOTAL_WORKS + '</h3><div class="book works">' + wh + '</div>'
      + '<div class="row"><button class="btn hot" data-act="close">返回</button></div>');
  }
  function lyric(text, sung) { const el = $('lyric'); el.textContent = text || ''; el.classList.toggle('sung', !!sung); el.classList.remove('on'); void el.offsetWidth; if (text) el.classList.add('on'); }
  function stampCanvas(text, cls) { const el = document.createElement('div'); el.className = 'stamp ' + cls; el.textContent = text; $('canvasFx').appendChild(el); }
  function flyNumber(text, toEl) {
    return new Promise((res) => {
      const from = canvasCenter(), to = elCenter(toEl);
      const el = document.createElement('div');
      el.className = 'float chips';
      el.style.cssText = 'left:' + from.x + 'px;top:' + from.y + 'px;animation:none;opacity:1;color:#ffd36b;font-size:40px;transition:left .45s cubic-bezier(.5,0,.3,1),top .45s cubic-bezier(.5,0,.3,1),font-size .45s;';
      el.textContent = text;
      $('fx').appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => { el.style.left = to.x + 'px'; el.style.top = to.y + 'px'; el.style.fontSize = '24px'; }));
      setTimeout(() => { el.remove(); res(); }, 470 / Math.max(1, speed / 2));
    });
  }

  // ---------- 色輪：按次序連成的路線 ----------
  const WR = 44;
  const wpos = (t) => P.WHEEL.indexOf(t);
  const wdist = (a, b) => { const d = Math.abs(wpos(a) - wpos(b)); return Math.min(d, 10 - d); };
  function wheelPoint(t, rr) { const a = -Math.PI / 2 + (wpos(t) * Math.PI * 2) / 10; return [Math.cos(a) * (rr || WR), Math.sin(a) * (rr || WR)]; }
  function buildWheel() {
    let h = '<circle class="ring" r="' + WR + '"></circle><g id="wheelPath"></g>';
    P.WHEEL.forEach((t) => {
      const p = wheelPoint(t), a = Math.atan2(p[1], p[0]);
      h += '<circle class="dot" data-t="' + t + '" cx="' + p[0].toFixed(2) + '" cy="' + p[1].toFixed(2) + '" r="5" fill="' + tagColor(t) + '"></circle>';
      h += '<text class="lbl" data-t="' + t + '" x="' + (Math.cos(a) * (WR + 12)).toFixed(2) + '" y="' + (Math.sin(a) * (WR + 12)).toFixed(2) + '">' + tagName(t) + '</text>';
    });
    $('wheelSvg').innerHTML = h;
  }
  // 每張素材用哪一種情緒接上前一張（承：最近的；轉：相對的）
  function anchors(cards, links) {
    const out = [];
    cards.forEach((c, i) => {
      if (!i) { out.push(c.tags[0]); return; }
      const prev = out[i - 1], k = links[i - 1];
      out.push(c.tags.slice().sort((a, b) => (k === 'zhuan' ? Math.abs(5 - wdist(prev, a)) - Math.abs(5 - wdist(prev, b)) : wdist(prev, a) - wdist(prev, b)))[0]);
    });
    return out;
  }
  function renderWheel(pv) {
    const cards = pv ? pv.run.map((u) => P.cardOf(run, u)) : [];
    const lit = new Set(); cards.forEach((c) => c.tags.forEach((t) => lit.add(t)));
    document.querySelectorAll('#wheelSvg .dot').forEach((d) => { const on = lit.has(d.dataset.t); d.classList.toggle('on', on); d.setAttribute('r', on ? 7 : 5); });
    document.querySelectorAll('#wheelSvg .lbl').forEach((l) => l.classList.toggle('on', lit.has(l.dataset.t)));
    let h = '';
    if (cards.length) {
      const links = pv.links.slice(pv.s, pv.e);
      const an = anchors(cards, links);
      const pts = an.map((t, i) => wheelPoint(t, WR - 3 - i * 1.5));
      for (let i = 1; i < pts.length; i++) {
        const k = links[i - 1], a = pts[i - 1], b = pts[i];
        h += '<line class="seg ' + k + '" x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '"></line>';
      }
      if (pv.he && pts.length >= 3) { const a = pts[pts.length - 1], b = pts[0]; h += '<line class="seg he" x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '"></line>'; }
      pts.forEach((p, i) => { h += '<circle class="node" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (i ? 2.2 : 3.2) + '"></circle>'; });
    }
    $('wheelPath').innerHTML = h;
    $('wheel').classList.toggle('ok', !!pv && pv.run.length >= 3);
    $('formName').textContent = pv ? pv.name : '起承轉合';
    $('formTag').textContent = pv ? pv.tag : '按次序選素材';
  }
  function setCalc(c, m, which) {
    if (c != null) { $('chipsNum').textContent = fmt(c); if (which !== 'm') bump($('chipsNum')); }
    if (m != null) { $('multNum').textContent = fmtM(m); if (which !== 'c') bump($('multNum')); }
  }

  // ---------- 卡 ----------
  function markOf(c) {
    const rule = run && run.cur ? run.cur.def.rule : null;
    if (rule && rule.tag && c.tags.includes(rule.tag)) return rule.id === 'block' ? '<span class="mark no" title="評審的規則：這張不計籌碼">✕ 不收</span>' : '<span class="mark yes" title="評審的規則：這張加分">♥ 加分</span>';
    return '';
  }
  function cardHtml(c, extra, act) {
    const hid = run && run.cur && run.cur.def.obstacle === 'hidden' && !act && c.tags.includes(run.cur.def.hiddenTag);
    if (hid) return hiddenCardHtml(c, extra);
    const ord = sel.indexOf(c.uid);
    return '<button type="button" class="card' + (extra || '') + '" ' + (act || 'data-uid="' + c.uid + '"') + '>'
      + '<span class="sw">' + c.tags.map((t) => '<i style="--c:' + tagColor(t) + '"></i>').join('') + '</span>'
      + '<span class="face' + (Pt.faceOf(c).indexOf('np-duo') === 0 ? ' duo' : '') + '"><img src="' + Pt.src(Pt.faceOf(c)) + '" alt="" loading="lazy" draggable="false"></span>'
      + (pairKeyOf(c) && !col.pairs[pairKeyOf(c)] ? '<span class="nw" title="圖鑑未有：打出這張就會收錄">新</span>' : '')
      + markOf(c)
      + (act ? '' : hintBadge(c.uid))
      + (ord >= 0 && !act ? '<span class="ord">' + (ord + 1) + '</span>' : '')
      + '<b class="nm">' + esc(c.name) + '</b>'
      + '<span class="tg">' + c.tags.map((t) => '<em style="--c:' + tagColor(t) + ';--t:' + tagText(t) + '">' + tagName(t) + '</em>').join('') + '</span>'
      + compoundHtml(c)
      + '<span class="ft"><span class="st">' + '★'.repeat(c.star) + '</span><span class="md" title="' + PART[c.medium] + '">' + (MED[c.medium] || '') + '</span><b class="ch">' + c.chips + '</b></span>'
      + '</button>';
  }
  function hiddenCardHtml(c, extra) {
    const ord = sel.indexOf(c.uid);
    return '<button type="button" class="card hidden-card' + (extra || '') + '" data-uid="' + c.uid + '">'
      + '<span class="sw"><i style="--c:#555a66"></i></span>' + (ord >= 0 ? '<span class="ord">' + (ord + 1) + '</span>' : '')
      + '<b class="nm">' + esc(c.name) + '</b><span class="tg"><em style="--c:#3a3f4b;--t:#c9d2e3">？？</em></span>'
      + '<span class="ft"><span class="st">' + '★'.repeat(c.star) + '</span><span class="md">' + (MED[c.medium] || '') + '</span><b class="ch">' + c.chips + '</b></span></button>';
  }
  // 兩種情緒的素材：複合情緒的名字和效果
  function compoundHtml(c) {
    const cp = P.compoundOf(c);
    if (!cp || !cp.fam) return '';
    return '<span class="cp f-' + cp.fam.id + '" title="' + esc(cp.name + '：' + cp.line + '。' + cp.fam.name + '：' + cp.fam.desc) + '"><b>' + esc(cp.name) + '</b><small>' + esc(cp.fam.name) + '</small></span>';
  }
  function renderSubject(pv) {
    const el = $('subject');
    if (!pv || !pv.subject) { el.innerHTML = '<span class="k">題材</span><b>—</b><small>計分素材裏最多的情緒決定題材</small>'; el.classList.remove('on'); return; }
    const sb = pv.subject, pair = sb.pair;
    el.classList.add('on');
    el.innerHTML = '<span class="k">題材</span><b>' + esc(pair.name) + '</b><small>' + tagName(sb.main) + (sb.second ? ' × ' + tagName(sb.second) : '') + '　主調 ' + sb.strength + ' 張' + (sb.bonus ? '：倍率 +' + sb.bonus : '（3 張起有加成）') + '</small>';
  }
  function sortedCards(uids) {
    return uids.map((u) => P.cardOf(run, u)).filter(Boolean)
      .sort((a, b) => (wpos(a.tags[0]) - wpos(b.tags[0])) || (b.star - a.star) || (a.uid - b.uid));
  }
  function renderHand(fresh, list) {
    const cards = sortedCards(list || run.cur.hand);
    $('hand').innerHTML = cards.map((c) => cardHtml(c, (sel.includes(c.uid) ? ' sel' : '') + (fresh && fresh.includes(c.uid) ? ' new' : ''))).join('');
    let k = 0;
    document.querySelectorAll('#hand .card.new').forEach((el) => { el.style.animationDelay = (k++ * 0.07) + 's'; });
  }
  // 稿紙：選好的素材按次序排成一行，中間是連接，下面是起承轉合的角色
  function renderDraft(pv) {
    const box = $('draft');
    if (!sel.length) { box.innerHTML = '<p class="draft-empty">稿紙：按次序點選素材。第一張是「起」。</p>'; box.classList.remove('has'); return; }
    box.classList.add('has');
    const runSet = new Set(pv.run);
    let h = '', zSeen = false;
    sel.forEach((u, i) => {
      const c = P.cardOf(run, u);
      const ri = pv.run.indexOf(u);
      const role = ri >= 0 ? pv.roles[ri] : null;
      if (i) {
        const k = pv.links[i - 1], inRun = i - 1 >= pv.s && i - 1 < pv.e;
        // 同一筆第二個「轉」不再加倍
        const again = k === 'zhuan' && inRun && zSeen;
        if (k === 'zhuan' && inRun) zSeen = true;
        h += '<span class="lk ' + k + (again ? ' again' : '') + '" data-i="' + (i - 1) + '">' + (again ? '<b>轉</b><small>不加</small>' : linkLabel(k)) + '</span>';
      }
      h += '<button type="button" class="slot' + (runSet.has(u) ? '' : ' noise') + '" data-uid="' + u + '" title="點一下拿走">'
        + '<span class="sw">' + c.tags.map((t) => '<i style="--c:' + tagColor(t) + '"></i>').join('') + '</span>'
        + '<b>' + esc(c.name) + '</b><span class="md">' + MED[c.medium] + '</span>'
        + '<span class="role">' + (role ? ROLE[role] : '不計') + '</span></button>';
    });
    if (pv.he) h += '<span class="lk he"><b>合</b><small>×2 ↺</small></span>';
    box.innerHTML = h;
  }
  function pips(n, max) { let h = ''; for (let i = 0; i < max; i++) h += '<i' + (i < n ? '' : ' class="off"') + '></i>'; return h; }
  // 提示：標出手上哪幾張可以接上稿紙最後一張（承／轉），每晚三次
  let hintAnchor = null;
  function useHint() {
    const n = run.cur;
    if (busy || n.done) return;
    if (!sel.length) { hint('先選一張素材放上稿紙，再按提示。'); return; }
    if (n.hints <= 0) { hint('今晚的提示已經用完。'); return; }
    n.hints -= 1; hintAnchor = sel[sel.length - 1]; S.chip(5);
    renderHand(); renderButtons();
    const c = P.cardOf(run, hintAnchor);
    hint('提示：手上有標記的素材可以接在「' + c.name + '」後面。', true);
  }
  function hintBadge(u) {
    if (hintAnchor == null || sel[sel.length - 1] !== hintAnchor || sel.includes(u)) return '';
    const k = P.rel(P.cardOf(run, hintAnchor), P.cardOf(run, u));
    if (k === 'duan') return '<span class="hb duan">斷</span>';
    return '<span class="hb ' + k + '">' + (k === 'zhuan' ? '轉 ×2' : k === 'same' ? '承 +2' : '承 +1') + '</span>';
  }
  function renderButtons() {
    const n = run.cur;
    $('hintPips').innerHTML = pips(n.hints, P.BASE.hints);
    $('btnHint').disabled = busy || n.done || n.hints <= 0;
    $('playPips').innerHTML = pips(n.plays, n.playsMax);
    $('discardPips').innerHTML = pips(n.discards, n.discardsMax);
    $('btnPlay').disabled = busy || !sel.length || n.done;
    $('btnDiscard').disabled = busy || !sel.length || n.discards <= 0 || n.done;
  }
  function renderGoal() {
    const n = run.cur;
    $('goalFill').style.width = Math.min(100, (n.score / n.target) * 100).toFixed(1) + '%';
    $('scoreNum').textContent = fmt(n.score);
    $('targetNum').textContent = fmt(n.target);
    $('goalBar').classList.toggle('hit', n.score >= n.target);
  }
  function renderJudge() {
    const def = run.cur.def, J = P.JUDGES[def.judge];
    $('judgeImg').src = imgSrc(J.img);
    $('judgeName').textContent = J.name;
    $('judgeTitle').textContent = J.title;
    $('judgeRule').innerHTML = '<span class="k">評審的規則</span>' + esc(def.rule.text);
    $('judgeRule').classList.toggle('good', !!def.rule.good);
    const W = def.wish ? recipeOf(def.wish) : null, el = $('judgeWish');
    el.hidden = !W;
    if (W) el.innerHTML = '<span class="k">評審想看</span><b>《' + esc(W.name) + '》</b><small>' + esc(wishHint(W.need)) + '</small>';
    el.classList.toggle('done', !!run.cur.wishDone);
    const ob = P.OBSTACLES[def.obstacle];
    $('judgeObstacle').innerHTML = ob ? '<span class="k">今晚的難題</span><b>' + esc(ob.name) + '</b>' + esc(obText(def)) : '';
    $('judgeObstacle').hidden = !ob;
  }
  const obText = (def) => { const ob = P.OBSTACLES[def.obstacle]; if (!ob) return ''; return def.obstacle === 'hidden' ? '「' + tagName(def.hiddenTag) + '」的素材看不見標籤' : ob.text; };
  function say(text) {
    const el = $('judgeSay');
    el.textContent = '「' + text + '」';
    el.classList.remove('new'); void el.offsetWidth; el.classList.add('new');
  }
  function nodJudge() { const im = $('judgeImg'); im.classList.remove('react'); void im.offsetWidth; im.classList.add('react'); }
  function renderBand() {
    $('band').innerHTML = '<span class="k">創作夥伴</span>' + run.colabs.map((id, i) => {
      const c = C(id);
      return '<div class="mate" data-slot="' + i + '" title="' + esc(c.name + '（' + c.part + '）：' + c.desc) + '"><img src="' + imgSrc(c.img) + '" alt=""><div><b>' + esc(c.short) + '<small>' + esc(c.part) + '</small></b><span>' + esc(c.desc) + '</span></div></div>';
    }).join('');
  }
  function fireMate(slot) { const el = document.querySelector('.mate[data-slot="' + slot + '"]'); if (el) { el.classList.remove('fire'); void el.offsetWidth; el.classList.add('fire'); } return el; }
  // 夥伴在歌裏的聲部
  function layersOf(colabs, played) {
    const L = { pad: true };
    colabs.forEach((id) => { const c = C(id); if (c) L[c.layer] = true; });
    if (played && played.body) L.beat = true;
    return L;
  }

  // ---------- 一晚 ----------
  // 世界在變：水位一晚比一晚高；第三晚是寒潮（下雪、水面結冰）
  const sceneOf = (night) => ({ flood: [0.15, 0.6, 1][night] || 0, cold: night === 2 });
  const paintSeed = () => (run.seed * 31 + run.night * 7 + (run.retries || 0) * 101) % 1679616;
  function beginNight(showIntroSheet) {
    const n = P.startNight(run);
    n.played = {};
    sel = []; lastStruct = null; busy = false;
    Pt.blank(paintSeed(), sceneOf(run.night));
    Mu.setNight(n.def);
    BGM.play(n.def.bgm);
    $('nightNo').textContent = '第 ' + (run.night + 1) + ' 晚' + (n.def.boss ? '・外星評審之夜' : '');
    $('nightName').textContent = n.def.name;
    $('canvasFx').innerHTML = '';
    lyric('');
    $('sparkNum').textContent = run.spark.toFixed(1);
    renderGoal(); renderJudge(); renderBand(); renderHand(n.hand); updatePreview(true); renderButtons();
    say(P.JUDGES[n.def.judge].lines.start);
    hint('');
    if (showIntroSheet) showIntro();
  }

  // ---------- 選牌：按次序排上稿紙 ----------
  function toggleCard(u) {
    if (sel.includes(u)) { sel = sel.filter((x) => x !== u); S.deselect(); }
    else {
      if (sel.length >= run.cur.maxCards) { const el = document.querySelector('#hand .card[data-uid="' + u + '"]'); if (el) { el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); } hint('今晚一筆最多 ' + run.cur.maxCards + ' 張素材。'); S.blocked(); return; }
      sel.push(u); S.select(sel.length);
    }
    renderHand();
    updatePreview();
  }
  function updatePreview(silent) {
    const pv = sel.length ? P.preview(run, sel) : null;
    renderWheel(pv);
    renderDraft(pv);
    renderSubject(pv);
    if (pv) setCalc(pv.chips, pv.mult); else { $('chipsNum').textContent = '0'; $('multNum').textContent = '0'; }
    if (!silent && pv && pv.id !== lastStruct && P.STRUCT_RANK.indexOf(pv.id) >= 3) { S.shape(P.STRUCT_RANK.indexOf(pv.id)); const f = $('formName'); f.classList.remove('pop'); void f.offsetWidth; f.classList.add('pop'); }
    lastStruct = pv ? pv.id : null;
    renderButtons();
    if (!silent && !tips('select', pv)) { const nm = nearMiss(); if (nm) hint(nm, true); }
    return pv;
  }

  // ---------- 下筆：畫一圈、唱一段、寫一節 ----------
  async function flyToCanvas(uids) {
    S.whoosh();
    const t = canvasCenter();
    uids.forEach((u, i) => {
      const el = document.querySelector('#draft .slot[data-uid="' + u + '"]') || document.querySelector('#hand .card[data-uid="' + u + '"]');
      const hc = document.querySelector('#hand .card[data-uid="' + u + '"]');
      if (hc) hc.style.visibility = 'hidden';
      if (!el) return;
      const b = el.getBoundingClientRect();
      const g = el.cloneNode(true);
      g.classList.add('ghost-card');
      g.style.left = b.left + 'px'; g.style.top = b.top + 'px'; g.style.width = b.width + 'px'; g.style.height = b.height + 'px';
      document.body.appendChild(g);
      setTimeout(() => {
        g.style.transform = 'translate(' + (t.x - b.left - b.width / 2).toFixed(0) + 'px,' + (t.y - b.top - b.height / 2).toFixed(0) + 'px) scale(.4) rotate(' + (i * 9 - 14) + 'deg)';
        g.style.opacity = '0.15';
      }, 20 + i * 50);
      setTimeout(() => g.remove(), 500 + i * 50);
    });
    await wait(280 + uids.length * 40);
  }
  function armSkip() {
    const on = (e) => { if (e.target.closest && e.target.closest('.veil')) return; if (speed < 4) { speed = 4; $('speedTag').hidden = false; } };
    document.addEventListener('pointerdown', on);
    return () => { document.removeEventListener('pointerdown', on); $('speedTag').hidden = true; speed = BASE_SPEED; };
  }
  async function showEquation(Cc, M, X, total) {
    const eq = document.createElement('div');
    eq.className = 'equation';
    eq.innerHTML = '<span class="c">' + fmt(Cc) + '</span> × <span class="m">' + fmtM(M) + '</span> × <span class="s">' + X.toFixed(1) + '</span>';
    $('canvasFx').appendChild(eq);
    S.tick();
    await wait(360);
    eq.innerHTML = '<span class="t big">0</span>';
    const tEl = eq.querySelector('.t');
    const dur = 500 / speed, start = performance.now();
    let lastTick = 0;
    await new Promise((res) => {
      const step = (now) => {
        const k = Math.min(1, (now - start) / dur);
        tEl.textContent = fmt(total * (1 - Math.pow(1 - k, 3)));
        if (now - lastTick > 55) { S.tick(); lastTick = now; }
        if (k < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
    const power = total / run.cur.target;
    S.total(power);
    shake(power);
    if (power > 0.3) burst(canvasCenter(), Math.round(10 + 34 * Math.min(1, power)), ['#ffc247', '#ff4fb4', '#37c3d6', '#ffffff']);
    await wait(380);
    eq.remove();
  }
  function slotEl(u) { return document.querySelector('#draft .slot[data-uid="' + u + '"]'); }
  function linkEl(i) { return document.querySelector('#draft .lk[data-i="' + i + '"]'); }
  function lightSlot(u) { document.querySelectorAll('#draft .slot.now').forEach((e) => e.classList.remove('now')); const e = slotEl(u); if (e) e.classList.add('now'); }
  async function animateSteps(res, art) {
    const n = run.cur;
    for (const st of res.steps) {
      if (st.t === 'struct') {
        setCalc(st.C, st.M);
        canvasBanner(st.name, P.STRUCT[res.id].tag);
        await wait(360);
      } else if (st.t === 'card') {
        const plan = art.plans[st.uid];
        lightSlot(st.uid);
        const p = plan ? Pt.screenPoint(plan.at) : canvasCenter();
        floatAt(p, '+' + st.chips, 'chips');
        if (st.by) { const sl = run.colabs.indexOf(st.by); fireMate(sl); floatAt(elCenter(fireMate(sl) || $('band')), '再計一次', 'rule'); }
        setCalc(st.C, null, 'c');
        const card = P.cardOf(run, st.uid);
        if (!st.again) lyric(card.name + '　' + ROLE[st.role], card.medium === 'paper');
        if (st.echo) { const pp = plan ? Pt.screenPoint(plan.at) : canvasCenter(); floatAt({ x: pp.x, y: pp.y - 30 }, '回響：再計一次', 'rule'); }
        if (!st.again) {
          S.chip(st.idx + 3);
          const barMs = speed > 1 ? 160 : 620;
          await Promise.all([plan ? Pt.drawPlan(plan, Math.max(200, barMs * 0.7)) : Promise.resolve(), wait(barMs * 0.97 * speed)]);
        } else { S.chip(st.idx + 3); Pt.glint(14); await wait(320); }
      } else if (st.t === 'blocked') {
        const plan = art.plans[st.uid];
        lightSlot(st.uid);
        if (plan) await Pt.drawPlan(plan, 120);
        Pt.strike(plan ? plan.at : null);
        floatAt(plan ? Pt.screenPoint(plan.at) : canvasCenter(), '評審：不計籌碼', 'blocked');
        S.blocked(); nodJudge();
        await wait(420);
      } else if (st.t === 'link') {
        const el = linkEl(res.s + st.idx);
        if (el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
        const p = el ? elCenter(el) : canvasCenter();
        if (st.extra) { floatAt(p, '再轉：不加分', 'blocked'); await wait(160); continue; }
        if (st.nulled) { floatAt(p, P.OBSTACLES[run.cur.def.obstacle].name + '：不加分', 'blocked'); S.blocked(); await wait(200); continue; }
        floatAt(p, st.xmult ? '轉 ×' + st.xmult : '承 +' + st.mult, st.xmult ? 'xmult' : 'mult');
        setCalc(st.C, st.M, 'm');
        if (st.kind === 'zhuan') { S.zhuan(); shake(0.25); } else S.cheng(st.idx);
        await wait(100);
      } else if (st.t === 'rule') {
        floatAt(elCenter($('judgeImg')), st.xmult ? '×' + st.xmult : '+' + st.mult + ' 倍率', st.xmult && st.xmult < 1 ? 'blocked' : st.xmult ? 'xmult' : 'rule');
        setCalc(st.C, st.M, 'm'); nodJudge();
        if (st.xmult && st.xmult < 1) S.blocked(); else S.mult();
        await wait(320);
      } else if (st.t === 'colab') {
        const el = fireMate(st.slot);
        const txt = st.xmult ? C(st.id).short + ' ×' + st.xmult : st.mult ? C(st.id).short + ' +' + st.mult + ' 倍率' : C(st.id).short + ' +' + st.chips;
        floatAt(st.uid != null && art.plans[st.uid] ? Pt.screenPoint(art.plans[st.uid].at) : el ? elCenter(el) : canvasCenter(), txt, st.xmult ? 'xmult' : st.mult ? 'mult' : 'chips');
        setCalc(st.C, st.M, st.chips && !st.mult && !st.xmult ? 'c' : 'm');
        if (st.id === 'ken') Pt.spray(art.zhuanAt || null, '#ff4fb4');
        if (st.xmult) S.xmult(); else S.obj();
        await wait(st.xmult ? 320 : 190);
      } else if (st.t === 'media') {
        floatAt(canvasCenter(), st.name + ' +' + st.mult, 'mult');
        setCalc(st.C, st.M, 'm'); S.mult();
        await wait(360);
      } else if (st.t === 'recipe') {
        const firstEver = !col.works[st.id];
        Pt.glint(80);
        setCalc(st.C, st.M);
        S.recipe();
        burst(canvasCenter(), firstEver ? 46 : 24, ['#ffd36b', '#ffffff', '#ff4fb4']);
        await revealWork(st.id, st.name, firstEver);
      } else if (st.t === 'level') {
        floatAt(elCenter($('formName')), P.STRUCT[st.id].name + ' Lv' + st.lv + '：+' + st.chips + ' 籌碼、+' + st.mult + ' 倍率', 'mult');
        setCalc(st.C, st.M); S.mult();
        await wait(380);
      } else if (st.t === 'obstacle') {
        floatAt(elCenter($('judgeObstacle')), P.OBSTACLES[st.id].name + ' ×' + st.xmult, 'blocked');
        setCalc(st.C, st.M, 'm'); S.blocked(); nodJudge();
        await wait(420);
      } else if (st.t === 'compound') {
        const plan = art.plans[st.uid];
        const pp = plan ? Pt.screenPoint(plan.at) : canvasCenter();
        const txt = st.name + '・' + st.famName + (st.mult ? ' +' + st.mult : st.chips ? ' +' + st.chips : st.xmult ? ' ×' + st.xmult : '');
        floatAt({ x: pp.x, y: pp.y - 18 }, txt, st.xmult ? 'xmult' : st.mult ? 'mult' : st.chips ? 'chips' : 'rule');
        setCalc(st.C, st.M, st.chips ? 'c' : 'm');
        if (st.xmult) S.xmult(); else if (st.mult || st.chips) S.mult();
        await wait(st.xmult ? 220 : 130);
      } else if (st.t === 'subject') {
        canvasBanner('題材：' + st.name, D.TAGS[st.main].name + '貫穿 ' + st.strength + ' 張');
        floatAt(elCenter($('subject')), '題材 +' + st.mult, 'mult');
        setCalc(st.C, st.M, 'm'); S.mult();
        await wait(480);
      } else if (st.t === 'he') {
        if (art.close) await Pt.drawPlan(art.close, 260 / speed);
        if (speed === 1) S.mult();
        const el = document.querySelector('#draft .lk.he');
        if (el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
        floatAt(el ? elCenter(el) : canvasCenter(), '合 ×' + st.xmult, 'xmult');
        setCalc(st.C, st.M, 'm');
        if (speed > 1) S.mult();
        lyric('—— 回到開頭 ——');
        await wait(480);
      } else if (st.t === 'title') {
        canvasBanner(st.name + '！', st.id === 'full' ? '先承、後轉、轉了之後再合：倍率 ×' + st.xmult : '一種情緒說到底：倍率 ×' + st.xmult, 'recipe');
        setCalc(st.C, st.M, 'm');
        S.recipe(); burst(canvasCenter(), 36, ['#ffd36b', '#9be36b', '#ffffff', '#37c3d6']);
        await wait(700);
      } else if (st.t === 'wish') {
        canvasBanner('委託完成！', '這正是評審想看的作品', 'recipe');
        floatAt(elCenter($('judgeImg')), '×2', 'xmult');
        setCalc(st.C, st.M, 'm');
        $('judgeWish').classList.add('done');
        say(P.JUDGES[n.def.judge].lines.wish); nodJudge();
        S.xmult(); S.recipe();
        burst(elCenter($('judgeWish')), 26, ['#ffd36b', '#9be36b', '#ffffff']);
        await wait(900);
      } else if (st.t === 'spark') {
        document.querySelectorAll('#draft .slot.now').forEach((e) => e.classList.remove('now'));
        if (res.blockedAll) { canvasBanner('不計分', P.JUDGES[n.def.judge].name + '的規則'); S.blocked(); await wait(700); }
        else await showEquation(st.C, st.M, st.x, st.total);
      }
    }
  }
  // 這一筆的畫（構圖）和歌（每張素材一小節）
  // 一段歌：動機由今晚第一筆的「起」決定（整首歌的主題），節奏由這一段的「起」決定
  function sectionFor(cards, roles, ring, colabs, played, subject, motifId) {
    return Mu.section({ roles, cards, seed: P.hash(cards[0].id + ':' + ring), motif: P.hash(motifId || cards[0].id), index: ring, layers: layersOf(colabs, played), theme: subject.main });
  }
  function artFor(res, ring, colabs, played) {
    const cards = res.run.map((u) => P.cardOf(run, u));
    const links = res.links.slice(res.s, res.e);
    const plan = Pt.planPlay({ cards, roles: res.roles, links, he: res.he, ring, subject: res.subject, full: res.id === 'full', mates: res.usedColabs || [] });
    const n = run.cur;
    if (!n.motif) n.motif = cards[0].id;
    const sec = sectionFor(cards, res.roles, ring, colabs, played, res.subject, n.motif);
    const zi = links.indexOf('zhuan');
    return { plans: plan.plans, close: plan.close, sec, zhuanAt: zi >= 0 && plan.list[zi + 1] ? plan.list[zi + 1].at : null };
  }
  async function doPlay() {
    if (busy || !sel.length || run.cur.done) return;
    busy = true; S.unlock(); renderButtons();
    const n = run.cur;
    const uids = sel.slice();
    const before = n.hand.slice();
    const ring = n.log.length;
    const colabs = run.colabs.slice();
    await flyToCanvas(uids);
    const res = P.play(run, uids);
    if (!res) { busy = false; renderButtons(); return; }
    const remaining = before.filter((u) => !uids.includes(u));
    renderHand(null, remaining);
    const art = artFor(res, ring, colabs, n.played);
    res.run.forEach((u) => { n.played[P.cardOf(run, u).medium] = true; });
    n.log[n.log.length - 1].art = { sec: art.sec };
    const stopSkip = armSkip();
    hint('');
    await Pt.ready(2500);
    await animateSteps(res, art);
    collect(res);
    if (res.total > 0) await flyNumber('+' + fmt(res.total), $('scoreNum'));
    stopSkip();
    lyric('');
    renderGoal(); bump($('scoreNum'));
    sel = [];
    const J = P.JUDGES[n.def.judge];
    if (res.clear) { updatePreview(true); await nightClear(res); return; }
    if (res.fail) { updatePreview(true); await nightFail(); return; }
    const ratio = res.total / n.target;
    say(J.lines[res.wish ? 'wish' : res.id === 'full' ? 'full' : res.newRecipes && res.newRecipes.length ? 'recipe' : ratio < 0.15 ? 'small' : ratio < 0.4 ? 'good' : 'great']);
    nodJudge();
    await wait(240);
    const fresh = n.hand.filter((u) => !remaining.includes(u));
    renderHand(fresh);
    fresh.forEach((u, i) => setTimeout(() => S.flip(i), i * 70));
    updatePreview(true);
    busy = false; renderButtons();
    if (res.justPassed) { stampCanvas('達標', 'pass'); S.stamp(); setTimeout(() => { const st = document.querySelector('#canvasFx .stamp'); if (st) st.remove(); }, 1500); }
    const LAYERS = ['', '海上的建築', '碼頭上的人和事', '前景'];
    const nextLayer = LAYERS[n.log.length] ? '下一筆畫' + LAYERS[n.log.length] + '。' : '';
    const ng = P.nextGrade(n);
    if (n.passed) hint((res.justPassed ? '已經達標！' : '') + (ng ? '再多 ' + fmt(n.target * ng.x - n.score) + ' 分就是' + ng.name + '。' : '已經是金獎！') + nextLayer, true);
    else if (n.plays === 1) hint('最後一筆！還差 ' + fmt(n.target - n.score) + ' 分。', true);
    else if (!tips('afterPlay')) hint('今晚還有 ' + n.plays + ' 筆，還差 ' + fmt(n.target - n.score) + ' 分。' + nextLayer);
  }
  async function doDiscard() {
    const n = run.cur;
    if (busy || !sel.length || n.discards <= 0 || n.done) return;
    busy = true; S.unlock(); renderButtons(); S.crumple();
    const disc = sel.slice();
    disc.forEach((u) => { const el = document.querySelector('#hand .card[data-uid="' + u + '"]'); if (el) el.classList.add('gone'); });
    await wait(320);
    const kept = n.hand.filter((u) => !disc.includes(u));
    P.discard(run, disc);
    sel = [];
    const fresh = n.hand.filter((u) => !kept.includes(u));
    renderHand(fresh);
    fresh.forEach((u, i) => setTimeout(() => S.flip(i), i * 70));
    updatePreview(true);
    busy = false; renderButtons();
    hint(n.discards ? '還可以改稿 ' + n.discards + ' 次。' : '今晚不能再改稿了。');
  }

  // ---------- 作品：畫、歌、詩 ----------
  function workOf(n) {
    // 題目：今晚最後發現的具名組合；沒有就用最高分那一筆的「起」
    const withRec = n.log.filter((l) => l.recipes.length);
    let title, tsrc;
    if (withRec.length) { const id = withRec[withRec.length - 1].recipes[0]; title = recipeOf(id).name; tsrc = { r: id }; }
    else { let bi = 0; n.log.forEach((l, i) => { if (l.total > n.log[bi].total) bi = i; }); title = n.log.length ? P.cardOf(run, n.log[bi].run[0]).name : '無題'; tsrc = { p: bi }; }
    return {
      title, tsrc, score: n.score, target: n.target, judge: n.def.judge, night: run.night, bg: run.bg,
      colabs: run.colabs.slice(), credit: run.colabs.slice(),
      stanzas: n.log.map((l) => l.run.map((u, i) => ({ name: P.cardOf(run, u).name, role: l.roles[i], medium: P.cardOf(run, u).medium }))),
      sections: n.log.map((l) => l.art.sec),
      subjects: n.log.map((l) => l.subject && l.subject.name),
      style: n.def.style,
      plays: n.log.map((l) => l.run.map((u) => P.cardOf(run, u).id)),
      seed: paintSeed(),
      key: n.def.key, mode: n.def.mode, bpm: n.def.bpm,
    };
  }
  const nightOf = (w) => P.NIGHTS[w.night];
  function poemHtml(w) {
    return '<div class="poem">' + w.stanzas.map((st) => '<p>' + st.map((l, i) => '<span class="ln" data-l="' + i + '"><em class="r-' + l.role + '">' + ROLE[l.role] + '</em>' + esc(l.name) + (l.medium === 'paper' ? '<i title="唱出來">♪</i>' : '') + '</span>').join('') + '</p>').join('') + '</div>';
  }
  function creditHtml(w) {
    const heroName = D.BACKGROUNDS[w.bg].name;
    const mates = (w.credit && w.credit.length ? w.credit : w.colabs).map((id) => C(id) ? C(id).short + '（' + C(id).part + '）' : '').filter(Boolean);
    return '<p class="credit">作者：' + esc(heroName) + (mates.length ? '<br>夥伴：' + esc(mates.join('、')) : '') + '</p>';
  }
  let playing = null;
  function playWork(w, sheetEl) {
    if (playing) { playing.stop(); playing = null; Mu.stop(); BGM.duck(false); sheetEl.querySelectorAll('.ln.on').forEach((e) => e.classList.remove('on')); const b0 = sheetEl.querySelector('[data-act="playWork"]'); if (b0) b0.textContent = '▶ 播放這首歌'; return; }
    S.unlock();
    Mu.setNight(nightOf(w));
    BGM.duck(true);
    const btn = sheetEl.querySelector('[data-act="playWork"]');
    const lines = [...sheetEl.querySelectorAll('.poem p')];
    const cap = sheetEl.querySelector('.framed .cap');
    playing = Mu.song(w.sections, (si, bi) => {
      sheetEl.querySelectorAll('.ln.on').forEach((e) => e.classList.remove('on'));
      const ln = lines[si] && lines[si].querySelectorAll('.ln')[bi];
      if (ln) { ln.classList.add('on'); if (cap) cap.textContent = ln.textContent.replace('♪', '').slice(1); }
    }, () => { playing = null; if (btn) btn.textContent = '▶ 再播一次'; sheetEl.querySelectorAll('.ln.on').forEach((e) => e.classList.remove('on')); if (cap) cap.textContent = ''; BGM.duck(false); });
    if (btn) btn.textContent = '■ 停止';
  }
  const SHARE_BASE = () => (window.IE_SHARE_BASE || location.href.split('#')[0]);
  function shareLink(w) { return SHARE_BASE() + '#' + P.encodeWork({ bg: w.bg, night: w.night, judge: w.judge, score: w.score, colabs: w.colabs, plays: w.plays, seed: w.seed, tsrc: w.tsrc }); }
  function copyShare(w, btn) {
    const link = shareLink(w);
    const box = btn.closest('.sheet').querySelector('.share-box');
    const show = () => { if (box) { box.hidden = false; const inp = box.querySelector('input'); inp.value = link; inp.focus(); inp.select(); } };
    try {
      navigator.clipboard.writeText(link).then(() => { btn.textContent = '已複製分享連結'; show(); }, show);
    } catch (e) { show(); }
  }
  function workSheet(w, opts) {
    const o = opts || {};
    const J = P.JUDGES[w.judge];
    return '<span class="title-mark">' + esc(o.mark || ('第 ' + (w.night + 1) + ' 晚・' + P.NIGHTS[w.night].name + '・作品')) + '</span>'
      + '<div class="framed work">' + (o.live ? '<canvas class="live-paint" width="320" height="200" aria-label="這一晚的畫"></canvas>' : '<img src="' + w.shot + '" alt="這一晚的畫">') + '<span class="cap"></span></div>'
      + '<div class="work-title"><span>《' + esc(w.title) + '》</span>' + (o.noRename ? '' : '<button type="button" class="ib rename" data-act="rename" title="為作品改名">✎</button>') + '</div>'
      + '<div class="work-meta">' + fmt(w.score) + (w.target ? ' / ' + fmt(w.target) : ' 分') + '</div>'
      + '<div class="row"><button class="btn hot" data-act="playWork">▶ 聽今晚的歌</button><button class="btn ghost" data-act="share">分享這件作品</button></div>'
      + '<div class="share-box" hidden><input type="text" readonly aria-label="分享連結"><small>把連結傳給朋友，打開就會重播這件作品（Artifact 要先在「分享」裏開放給對方）。</small></div>'
      + poemHtml(w) + creditHtml(w)
      + (o.quote !== false ? '<p class="quote">' + esc(J.name) + '：「' + esc(J.lines.clear) + '」</p>' : '')
      + (o.extra || '');
  }

  // ---------- 收工、失敗、獎勵、一局完 ----------
  async function nightClear(res) {
    const n = run.cur, J = P.JUDGES[n.def.judge];
    stampCanvas(P.gradeOf(n).name, 'pass'); S.stamp();
    await wait(240);
    S.clear(); say(J.lines.clear); nodJudge();
    burst(canvasCenter(), 44, ['#9be36b', '#ffc247', '#ffffff', '#37c3d6']);
    if (res.overkill) {
      for (let k = 0; k < 3; k++) {
        await wait(320); S.firework();
        const b = $('paint').getBoundingClientRect();
        burst({ x: b.left + b.width * (0.2 + Math.random() * 0.6), y: b.top + b.height * (0.15 + Math.random() * 0.4) }, 28, ['#ff4fb4', '#ffc247', '#37c3d6', '#ffffff']);
      }
    }
    await wait(900);
    Pt.sign(D.BACKGROUNDS[run.bg].name + ' · 2080');
    const w = workOf(n);
    w.shot = Pt.snapshot();
    const unused = n.encore || 0;
    const fin = P.finishNight(run, w);
    const lines = [];
    if (unused) lines.push('達標之後加演 ' + unused + ' 筆，火花 +' + (0.1 * unused).toFixed(1));
    const gr = P.gradeOf(n);
    if (gr.id === 'gold') lines.push('金獎（目標的 3.5 倍）：火花 +0.4'); else if (gr.id === 'silver') lines.push('銀獎（目標的 2 倍）：火花 +0.2');
    if (n.wishDone) lines.push('完成評審的委託：火花 +0.2');
    current = w;
    sheet(workSheet(w, { live: true, extra: (lines.length ? '<p class="bonus">' + lines.map(esc).join('<br>') + '<br>火花現在是 ×' + fin.spark.toFixed(1) + '</p>' : '')
      + '<div class="row"><button class="btn hot" data-act="reward">' + (run.night >= run.nightDefs.length ? '看三晚的作品' : '領取收工獎勵') + '</button></div>' }));
  }
  async function nightFail() {
    const n = run.cur, J = P.JUDGES[n.def.judge];
    stampCanvas('否決', 'fail'); S.stamp();
    await wait(200);
    S.fail(); say(J.lines.fail); nodJudge();
    await wait(1000);
    sheet('<span class="title-mark">第 ' + (run.night + 1) + ' 晚・' + esc(n.def.name) + '</span>'
      + '<h2>評審否決了今晚的作品</h2>'
      + '<div class="framed"><img src="' + Pt.snapshot() + '" alt="今晚的畫"></div>'
      + '<div class="work-meta">' + fmt(n.score) + ' / ' + fmt(n.target) + '　差 ' + fmt(n.target - n.score) + ' 分</div>'
      + '<p class="quote">' + esc(J.name) + '：「' + esc(J.lines.fail) + '」</p>'
      + '<div class="row"><button class="btn hot" data-act="retry">再創作一次（今晚重來）</button><button class="btn ghost" data-act="restart">從第一晚重新開始</button></div>');
  }
  function mateChoice(id) {
    const c = C(id);
    return '<button type="button" class="choice mate-choice" data-act="takeColab" data-id="' + id + '"><img src="' + imgSrc(c.img) + '" alt=""><b>' + esc(c.name) + '</b><span class="part">在作品裏：' + esc(c.part) + '</span><span>' + esc(c.desc) + '</span></button>';
  }
  // 收工獎勵：四個選擇裏選兩個（夥伴、進修、改造），然後選一張素材
  let offers = null, picked = 0;
  function offerHtml(o, i) {
    if (o.type === 'colab') { const c = C(o.id); return '<button type="button" class="choice mate-choice" data-act="takeOffer" data-i="' + i + '"><img src="' + imgSrc(c.img) + '" alt=""><b>邀請：' + esc(c.name) + '</b><span class="part">在作品裏：' + esc(c.part) + '</span><span>' + esc(c.desc) + '</span></button>'; }
    if (o.type === 'level') return '<button type="button" class="choice level" data-act="takeOffer" data-i="' + i + '"><span class="big">Lv' + o.lv + '</span><b>進修：' + esc(P.STRUCT[o.id].name) + '</b><span>以後打出' + esc(P.STRUCT[o.id].name) + '：+' + P.LEVEL.chips * (o.lv - 1) + ' 籌碼、+' + P.LEVEL.mult * (o.lv - 1) + ' 倍率</span><span class="part">' + esc(P.STRUCT[o.id].tag) + '</span></button>';
    const c = P.cardOf(run, o.uid);
    return '<button type="button" class="choice mod" data-act="takeOffer" data-i="' + i + '"><span class="big">＋' + esc(tagName(o.tag)) + '</span><b>改造：' + esc(c.name) + '</b><span>加上「' + esc(tagName(o.tag)) + '」，成為複合情緒《' + esc(o.pair.name) + '》</span><span class="part">' + esc(o.pair.fam ? o.pair.fam.name + '：' + o.pair.fam.desc : '') + '</span></button>';
  }
  function showRewardColabs() {
    if (!offers) { offers = P.offers(run); picked = 0; }
    if (picked >= 2 || !offers.length) { offers = null; pending = P.rewards(run); showRewardCards(); return; }
    sheet('<span class="title-mark">收工獎勵 ' + (picked + 1) + ' / 3</span><h2>' + (picked ? '再選一個' : '選兩個：夥伴、進修或改造') + '</h2><p>夥伴在計分時發揮所長，也會在你的歌裏一起演奏；進修令一種結構以後更值錢；改造為素材加上第二種情緒。</p>'
      + '<div class="choices four">' + offers.map((o, i) => (o ? offerHtml(o, i) : '')).join('') + '</div>');
  }
  function showRewardCards() {
    sheet('<span class="title-mark">收工獎勵 3 / 3</span><h2>選一張素材，放進你的素材庫</h2><p>情緒決定顏色、音色和它可以接上哪些素材；媒材決定它在歌裏是甚麼樂器。</p>'
      + '<div class="choices">' + pending.cards.map((c, i) => cardHtml(c, '', 'data-act="takeCard" data-i="' + i + '"')).join('') + '</div>'
      + '<div class="row"><button class="btn ghost" data-act="skipCard">都不要</button></div>');
  }
  function nextNight() { if (run.night >= run.nightDefs.length) { showFinal(); return; } beginNight(true); }
  function showFinal() {
    const found = Object.keys(run.discovered).length;
    sheet('<span class="title-mark">三晚完成</span><h2>你的作品集</h2>'
      + '<div class="gallery">' + run.nights.map((x, i) => '<figure><button type="button" class="framed" data-act="openWork" data-i="' + i + '"><img src="' + x.work.shot + '" alt=""></button><figcaption><b>《' + esc(x.work.title) + '》</b>' + esc(x.name) + '・' + fmt(x.score) + ' 分</figcaption></figure>').join('') + '</div>'
      + '<p>點一幅畫可以重聽那一晚的歌。發現了 ' + found + ' 個具名組合（共 ' + P.RECIPES.length + ' 個）。火花最後是 ×' + run.spark.toFixed(1) + '。</p>'
      + '<p class="quote">灰人：「評核完成。你的三件作品已經存入人才庫。我們會再聯絡你。」</p>'
      + '<div class="row"><button class="btn hot" data-act="again">再玩一局（新的素材和評審）</button></div>');
    S.clear();
  }
  function showHelp() {
    const found = Object.keys(run.discovered).map((id) => recipeOf(id)).filter(Boolean);
    sheet('<h2>起承轉合</h2><p>按次序點選素材，排成一行。相鄰兩張的情緒決定它們怎樣連接：</p>'
      + '<div class="ftable">'
      + '<div><b class="lk same">承</b><span>情緒相同 +2 倍率；在色輪上相鄰 +1</span></div>'
      + '<div><b class="lk zhuan">轉</b><span>情緒在色輪上相對：每一筆第一個轉，倍率 ×2</span></div>'
      + '<div><b class="lk duan">斷</b><span>沒有關係：一行斷開，只計最長的一段</span></div>'
      + '<div><b class="lk he">合</b><span>三張以上，最後一張和第一張是「承」：倍率 ×2</span></div>'
      + '<div><b>起承轉合</b><span>四張以上：先承、後轉、轉了之後還有一張，最後合，倍率再 ×1.5</span></div>'
      + '<div><b>獨白</b><span>三張以上都帶着同一種情緒，倍率再 ×1.5</span></div>'
      + '<div><b>編制</b><span>三種媒材 +2、四種 +4、五種 +8；全部同一種媒材 +6</span></div>'
      + '</div>'
      + '<p class="lead">分數 = 籌碼 × 倍率 × 火花。倍率先加後乘，所以先承、後轉、再合最高分。</p>'
      + '<h3>標籤：複合情緒和題材</h3>'
      + '<p>有兩種情緒的素材，本身就是一種複合情緒（卡上寫着名字）。兩種情緒在色輪上相隔越遠，效果越戲劇性：</p>'
      + '<div class="ftable">' + Object.keys(P.FAMILY).map((d) => '<div><b class="cp f-' + P.FAMILY[d].id + '"><small>' + P.FAMILY[d].name + '</small></b><span>' + ['', '相鄰', '相近', '相隔', '相遠', '相對'][d] + '的兩種情緒：' + P.FAMILY[d].desc + '</span></div>').join('') + '</div>'
      + '<p>計分素材裏最多的情緒（主調）和第二多的（配調）決定這一筆的<b>題材</b>：題材決定畫甚麼、歌用甚麼音色。主調貫穿 3 張 +3 倍率、4 張 +6、5 張 +10。三種情緒湊成具名組合，就是有名字的作品。</p>'
      + '<h3>已發現的複合情緒（' + Object.keys(run.found || {}).filter((k) => !k.startsWith('s:')).length + ' / ' + Object.keys(P.PAIRS).length + '）</h3>'
      + '<p class="small-note">' + (Object.keys(run.found || {}).filter((k) => !k.startsWith('s:')).map((k) => (P.PAIRS[k] || [k])[0]).join('　') || '還沒有。打出兩種情緒的素材就會記下來。') + '</p>'
      + '<p>每一筆同時是畫的一圈、歌的一段、詩的一節。情緒決定顏色和音色；媒材決定樂器：聲＝旋律、身＝鼓、數＝琶音、影＝和聲、紙＝人聲（唱出素材的名字）。完整的起承轉合，聽起來就是完整的一句。</p>'
      + '<h3>已發現的具名組合（' + found.length + ' / ' + P.RECIPES.length + '）</h3>'
      + '<p class="small-note">' + (found.length ? found.map((r) => '《' + esc(r.name) + '》').join('　') : '還沒有。某幾種情緒放在同一行裏，會變成有名字的作品。') + '</p>'
      + '<div class="row"><button class="btn hot" data-act="close">繼續</button></div>');
  }

  // ---------- 第一晚的提示 ----------
  const TIPS = [
    '按次序點選素材，排在稿紙上。第一張是「起」。',
    '下一張和上一張情緒相同或相鄰＝承；在色輪上相對＝轉。看稿紙上的連接。',
    '最後一張回到第一張的情緒＝合。按「下筆」，聽聽這一段。',
    '分數達到目標就收工。手牌不順，就選不要的素材按「改稿」。',
  ];
  function tips(ev, pv) {
    if (!run || run.night > 0 || store.get('tipsDone', false)) return false;
    if (ev === 'start') { tipStep = 0; hint(TIPS[0], true); return true; }
    if (ev === 'select') {
      if (pv && pv.run.length >= 3) { tipStep = 2; hint(TIPS[2], true); }
      else if (sel.length) { tipStep = Math.max(tipStep, 1); hint(TIPS[1], true); }
      else hint(TIPS[0], true);
      return true;
    }
    if (ev === 'afterPlay') { hint(TIPS[3], true); store.set('tipsDone', true); return true; }
    return false;
  }

  // ---------- 視窗 ----------
  let liveCanvas = null;
  function sheet(html) {
    if (playing) { playing.stop(); playing = null; Mu.stop(); }
    if (liveCanvas) { Pt.detach(liveCanvas); liveCanvas = null; }
    $('sheet').innerHTML = html;
    liveCanvas = $('sheet').querySelector('canvas.live-paint');
    if (liveCanvas) Pt.attach(liveCanvas);
    $('veil').hidden = false;
    $('veil').scrollTop = 0;
    const b = $('sheet').querySelector('.btn.hot') || $('sheet').querySelector('button');
    if (b) setTimeout(() => b.focus({ preventScroll: true }), 30);
  }
  function closeSheet() { if (playing) { playing.stop(); playing = null; Mu.stop(); BGM.duck(false); } if (liveCanvas) { Pt.detach(liveCanvas); liveCanvas = null; } $('veil').hidden = true; $('sheet').innerHTML = ''; }
  function heroChoice(id) {
    const b = D.BACKGROUNDS[id], h = P.HEROES[id], c = C(h.colab);
    return '<button type="button" class="choice hero' + (id === hero ? ' on' : '') + '" data-act="hero" data-id="' + id + '"><img src="' + imgSrc(c.img) + '" alt=""><b>' + esc(b.name) + '</b><span>' + esc(h.blurb) + '</span><span class="part">火花 ×' + b.spark + '</span></button>';
  }
  function showTitle() {
    sheet('<span class="title-mark">INSPIRATION EVACUATION 2080・原型第四版</span>'
      + '<h1 class="big-title">創作<span>之夜</span></h1>'
      + '<p class="lead">2080 年，外星人來地球收藏人類最後的靈感。今晚，把素材排成一首歌、一幅畫、一首詩，讓評審看見你。</p>'
      + '<p>排列是<b>形式</b>：情緒相同或相鄰是「承」，相對是「轉」，最後回到開頭是「合」。標籤是<b>內容</b>：兩種情緒的素材是一種有名字的複合情緒；一筆裏最多的情緒決定作品的題材。</p>'
      + '<p>每一筆同時畫出畫的一層、唱出歌的一段、寫成詩的一節。三晚，三位評審。</p>'
      + '<h3>你是誰？</h3><div class="choices">' + Object.keys(P.HEROES).map(heroChoice).join('') + '</div>'
      + '<p class="small-note">建議開聲音。計分時點一下畫面可以快轉；右上角的「?」有完整規則。</p>'
      + '<div class="row"><button class="btn hot" data-act="start">開始創作</button></div>');
  }
  function showIntro() {
    const def = run.cur.def, J = P.JUDGES[def.judge];
    const W = def.wish ? recipeOf(def.wish) : null;
    sheet('<span class="title-mark">第 ' + (run.night + 1) + ' 晚・' + esc(def.name) + (def.boss ? '・外星評審之夜' : '') + '</span>'
      + '<div class="intro-judge"><img src="' + imgSrc(J.img) + '" alt=""><div><h2>' + esc(J.name) + '</h2><p>' + esc(J.title) + '</p></div></div>'
      + '<p class="quote">「' + esc(J.lines.start) + '」</p>'
      + '<div class="rule' + (def.rule.good ? ' good' : '') + '"><span class="k">評審的喜好</span>' + esc(def.rule.text) + '</div>'
      + (P.OBSTACLES[def.obstacle] ? '<div class="obstacle"><span class="k">今晚的難題</span><b>' + esc(P.OBSTACLES[def.obstacle].name) + '</b>' + esc(obText(def)) + '</div>' : '')
      + (W ? '<div class="wish"><span class="k">評審想看（委託）</span><b>《' + esc(W.name) + '》</b><small>' + esc(wishHint(W.need)) + '。猜猜是哪幾種情緒？畫出來：倍率 ×2，火花 +0.2。</small></div>' : '')
      + '<p>今晚的目標 <span class="target-line">' + fmt(run.cur.target) + '</span> 分，有 ' + run.cur.plays + ' 筆、改稿 ' + run.cur.discards + ' 次、提示 ' + run.cur.hints + ' 次。'
      + '今晚的歌是' + (def.mode === 'major' ? '大調' : '小調') + '，每分鐘 ' + def.bpm + ' 拍。</p>'
      + '<div class="row"><button class="btn hot" data-act="go">開始</button></div>');
  }
  // 重播：分享連結打開的作品
  function replay(code) {
    const w0 = P.decodeWork(code);
    if (!w0) return false;
    const nd = P.NIGHTS[w0.night];
    Pt.blank(w0.seed, sceneOf(w0.night));
    const sections = [], stanzas = [];
    const repair = w0.colabs.reduce((a, id) => a + ((C(id) && C(id).repair) || 0), 0);
    let title = null, motif = null;
    const played = {};
    Mu.setNight(nd);
    w0.plays.forEach((ids, k) => {
      const cards = ids.map((id, i) => P.makeCard(id, 1000 + k * 10 + i));
      const A = P.analyze(cards, { repair });
      const roles = P.roles(A);
      const sub = P.subjectOf(A.run);
      const plan = Pt.planPlay({ cards: A.run, roles, links: A.rl, he: A.he, ring: k, subject: sub, full: A.id === 'full', mates: w0.colabs || [] });
      plan.list.forEach((pl) => Pt.drawPlan(pl, 0));
      if (plan.close) Pt.drawPlan(plan.close, 0);
      if (!motif) motif = A.run[0].id;
      sections.push(sectionFor(A.run, roles, k, w0.colabs, Object.assign({}, played), sub, motif));
      A.run.forEach((c) => { played[c.medium] = true; });
      stanzas.push(A.run.map((c, i) => ({ name: c.name, role: roles[i], medium: c.medium })));
    });
    if (w0.tsrc && w0.tsrc.c) title = w0.tsrc.c;
    else if (w0.tsrc && w0.tsrc.r && recipeOf(w0.tsrc.r)) title = recipeOf(w0.tsrc.r).name;
    else if (w0.tsrc && w0.tsrc.p != null && stanzas[w0.tsrc.p]) title = stanzas[w0.tsrc.p][0].name;
    Pt.sign(D.BACKGROUNDS[w0.bg].name + ' · 2080');
    const w = { title: title || stanzas[0][0].name, tsrc: w0.tsrc, score: w0.score, judge: w0.judge, night: w0.night, bg: w0.bg, colabs: w0.colabs, credit: w0.colabs,
      stanzas, sections, plays: w0.plays, seed: w0.seed, key: nd.key, mode: nd.mode, bpm: nd.bpm, shot: Pt.snapshot() };
    current = w;
    sheet(workSheet(w, { live: true, mark: '朋友分享的作品・' + nd.name, quote: true, noRename: true, extra: '<div class="row"><button class="btn hot" data-act="fromShare">我也來創作</button></div>' }));
    return true;
  }
  const actions = {
    hero(b) { hero = b.dataset.id; document.querySelectorAll('.choice.hero').forEach((e) => e.classList.toggle('on', e.dataset.id === hero)); S.unlock(); S.select(2); BGM.play('pixel-orbit'); },
    start() { S.unlock(); newGame(); showIntro(); },
    go() { closeSheet(); if (!tips('start')) hint('按次序選素材，然後下筆。'); },
    reward() { if (run.night >= run.nightDefs.length) showFinal(); else { offers = null; showRewardColabs(); } },
    takeOffer(b) { const o = offers[Number(b.dataset.i)]; if (!o) return; P.takeOffer(run, o); offers[Number(b.dataset.i)] = null; picked += 1; S.obj(); showRewardColabs(); },
    takeColab(b) { P.takeColab(run, b.dataset.id); S.obj(); showRewardCards(); },
    skipColab() { showRewardCards(); },
    takeCard(b) { P.takeCard(run, pending.cards[Number(b.dataset.i)]); S.select(3); nextNight(); },
    skipCard() { nextNight(); },
    retry() { run.retries = (run.retries || 0) + 1; beginNight(false); closeSheet(); hint('再來一次。素材重新洗過了。'); },
    restart() { showTitle(); },
    again() { showTitle(); },
    close() { closeSheet(); },
    playWork() { if (current) playWork(current, $('sheet')); },
    rename(b) {
      const box = b.closest('.work-title');
      box.innerHTML = '<input type="text" maxlength="12" aria-label="作品的名字" value="' + esc(current.title) + '"><button type="button" class="btn ghost" data-act="renameOk">好</button>';
      const inp = box.querySelector('input'); inp.focus(); inp.select();
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') actions.renameOk(box.querySelector('[data-act="renameOk"]')); });
    },
    renameOk(b) {
      const box = b.closest('.work-title'), v = (box.querySelector('input').value || '').replace(/[《》<>]/g, '').trim().slice(0, 12);
      if (v) { current.title = v; current.tsrc = { c: v }; }
      box.innerHTML = '<span>《' + esc(current.title) + '》</span><button type="button" class="ib rename" data-act="rename" title="為作品改名">✎</button>';
      S.select(4);
    },
    share(b) { if (current) copyShare(current, b); },
    openWork(b) { const x = run.nights[Number(b.dataset.i)]; if (!x) return; current = x.work; sheet(workSheet(x.work, { extra: '<div class="row"><button class="btn hot" data-act="backFinal">回到作品集</button></div>' })); },
    backFinal() { showFinal(); },
    fromShare() { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* 不能改網址也沒關係 */ } showTitle(); },
  };

  function newGame(seed) {
    run = P.newRun(seed || ((Date.now() % 1000003) + 1), { bg: hero, seen: col.pairs });
    beginNight(false);
  }

  // ---------- 開始 ----------
  buildWheel();
  Pt.init($('paint'));
  $('hand').addEventListener('click', (e) => { const b = e.target.closest('.card'); if (!b || busy || !run || run.cur.done) return; S.unlock(); toggleCard(Number(b.dataset.uid)); });
  $('draft').addEventListener('click', (e) => { const b = e.target.closest('.slot'); if (!b || busy || !run || run.cur.done) return; toggleCard(Number(b.dataset.uid)); });
  $('btnPlay').addEventListener('click', doPlay);
  $('btnDiscard').addEventListener('click', doDiscard);
  $('btnHint').addEventListener('click', useHint);
  $('btnHelp').addEventListener('click', () => { if (!busy && run) showHelp(); });
  $('btnBook').addEventListener('click', () => { if (!busy) showBook(); });
  renderColBtn();
  $('btnMute').addEventListener('click', () => { const m = !S.muted; S.setMuted(m); store.set('muted', m); $('btnMute').setAttribute('aria-pressed', String(m)); BGM.duck(m); });
  $('judgeWish').addEventListener('click', () => { const W = run && run.cur.def.wish ? recipeOf(run.cur.def.wish) : null; if (W && !busy) hint('評審想看《' + W.name + '》：' + wishHint(W.need) + '。'); });
  $('band').addEventListener('click', (e) => { const el = e.target.closest('.mate'); if (!el || busy) return; const c = C(run.colabs[Number(el.dataset.slot)]); if (c) hint(c.name + '（' + c.part + '）：' + c.desc); });
  $('sheet').addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; S.unlock(); if (!BGM.el) BGM.play('pixel-orbit'); const fn = actions[b.dataset.act]; if (fn) fn(b); });
  if (store.get('muted', false)) { S.setMuted(true); $('btnMute').setAttribute('aria-pressed', 'true'); }
  newGame();
  const code = (location.hash || '').slice(1);
  if (!(code && replay(code))) showTitle();
  window.__night = { get run() { return run; }, get busy() { return busy; }, get sel() { return sel; }, P, actions, doPlay, doDiscard, toggleCard };
})();
