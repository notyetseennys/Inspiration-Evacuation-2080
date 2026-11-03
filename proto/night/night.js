// 創作之夜原型：畫面和演出。規則在 engine.js，畫布在 painter.js，音效在 sfx.js。
// 原則（製作人 2026-11-03）：不替玩家找答案；每個動作都有畫面、聲音和數字的回饋；作品看得見。
(function () {
  'use strict';
  const IE = window.IE, D = IE.DATA, P = IE.Proto, Pt = IE.Painter, S = IE.Sfx;
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const fmtM = (m) => String(Math.round(m * 10) / 10);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('ie-night.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('ie-night.' + k, JSON.stringify(v)); } catch (e) { /* 私密瀏覽：不記住 */ } },
  };
  const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const BASE_SPEED = reduced ? 3 : 1;
  let speed = BASE_SPEED, busy = false, run = null, sel = [], tipStep = 0, lastForm = null, pending = null;
  const wait = (ms) => new Promise((res) => setTimeout(res, ms / speed));
  const imgSrc = (n) => { const s = IE.img ? IE.img(n) : ''; return s && s.indexOf('data:') !== 0 ? '../../game/' + s : s; };
  const tagName = (t) => D.TAGS[t].name;
  function tagText(t) {
    const h = D.TAGS[t].color.replace('#', '');
    const v = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    return 0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2] > 0.56 ? '#1b1b1b' : '#ffffff';
  }
  const MED = { paper: '紙', sound: '聲', image: '影', body: '身', data: '數' };
  const RANK = ['mix', 'adj', 'triad', 'split', 'comp', 'tetrad', 'full', 'mono', 'paradox'];
  const NOUN = { mono: '獨白', adj: '漸層', comp: '對峙', split: '裂縫', triad: '三重奏', tetrad: '交響', full: '群像', paradox: '一體兩面', mix: '草稿' };
  const RAR = { common: '常見', rare: '稀有', legend: '傳說' };
  const NUM = ['零', '一', '兩', '三', '四', '五'];
  const recipeOf = (id) => D.RECIPES.find((x) => x.id === id);
  // 委託的提示：只說情緒的數目，不說是哪幾種
  function wishHint(need) {
    const ks = Object.keys(need), sum = ks.reduce((a, t) => a + need[t], 0);
    return NUM[ks.length] + '種情緒' + (sum > ks.length ? '，合共 ' + sum + ' 張' : '') + '；每張素材都要帶有其中一種';
  }
  // 委託和今晚的規則一起看：灰人的「標準化」令草稿不計分，菌絲網絡要至少 3 張
  const wishNote = (rule) => (rule.id === 'nomix' ? '今晚的規則：草稿不計分，要配成形狀' : rule.id === 'min3' ? '草稿也算，但今晚至少要 3 張' : '草稿也算');

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

  // ---------- 色輪 ----------
  const WR = 44;
  function wheelPoint(t) { const i = P.WHEEL.indexOf(t); const a = -Math.PI / 2 + (i * Math.PI * 2) / 10; return [Math.cos(a) * WR, Math.sin(a) * WR]; }
  function buildWheel() {
    let h = '<circle class="ring" r="' + WR + '"></circle><path class="shape" id="wheelShape" d=""></path>';
    P.WHEEL.forEach((t) => {
      const p = wheelPoint(t), a = Math.atan2(p[1], p[0]);
      h += '<circle class="dot" data-t="' + t + '" cx="' + p[0].toFixed(2) + '" cy="' + p[1].toFixed(2) + '" r="5" fill="' + D.TAGS[t].color + '"></circle>';
      h += '<text class="lbl" data-t="' + t + '" x="' + (Math.cos(a) * (WR + 12)).toFixed(2) + '" y="' + (Math.sin(a) * (WR + 12)).toFixed(2) + '">' + tagName(t) + '</text>';
    });
    $('wheelSvg').innerHTML = h;
  }
  function renderWheel(pv) {
    const pal = pv && sel.length ? pv.palette : [];
    document.querySelectorAll('#wheelSvg .dot').forEach((d) => { const on = pal.includes(d.dataset.t); d.classList.toggle('on', on); d.setAttribute('r', on ? 7.5 : 5); });
    document.querySelectorAll('#wheelSvg .lbl').forEach((l) => l.classList.toggle('on', pal.includes(l.dataset.t)));
    const pts = pal.map(wheelPoint);
    let d = '';
    if (pts.length === 1) { const p = pts[0]; d = 'M' + (p[0] - 11).toFixed(1) + ' ' + p[1].toFixed(1) + ' a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0'; }
    else if (pts.length >= 2) d = 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + (pts.length > 2 ? ' Z' : '');
    const shape = $('wheelShape');
    shape.setAttribute('d', d);
    shape.setAttribute('class', 'shape' + (pv && pv.form === 'mix' ? ' mix' : ''));
    $('wheel').classList.toggle('ok', !!pv && sel.length > 0 && pv.form !== 'mix');
    $('formName').textContent = pv && sel.length ? pv.name : '選素材';
    $('formTag').textContent = pv && sel.length ? (pv.form === 'mix' ? '只計最亮的一張' : pv.tag) : '一筆最多 5 張';
  }
  function setCalc(c, m, which) {
    if (c != null) { $('chipsNum').textContent = fmt(c); if (which !== 'm') bump($('chipsNum')); }
    if (m != null) { $('multNum').textContent = fmtM(m); if (which !== 'c') bump($('multNum')); }
  }

  // ---------- 手牌 ----------
  function cardHtml(c, extra, act) {
    const rule = run && run.cur ? run.cur.def.rule : null;
    let mark = '';
    if (rule && rule.tag && c.tags.includes(rule.tag)) mark = rule.id === 'block' ? '<span class="mark no" title="評審的規則：這張不計分">✕ 不收</span>' : '<span class="mark yes" title="評審的規則：這張加分">♥ 加分</span>';
    return '<button type="button" class="card' + (extra || '') + '" ' + (act || 'data-uid="' + c.uid + '"') + '>'
      + '<span class="sw">' + c.tags.map((t) => '<i style="--c:' + D.TAGS[t].color + '"></i>').join('') + '</span>'
      + mark
      + '<b class="nm">' + esc(c.name) + '</b>'
      + '<span class="tg">' + c.tags.map((t) => '<em style="--c:' + D.TAGS[t].color + ';--t:' + tagText(t) + '">' + tagName(t) + '</em>').join('') + '</span>'
      + '<span class="ft"><span class="st">' + '★'.repeat(c.star) + '</span><span class="md">' + (MED[c.medium] || '') + '</span><b class="ch">' + c.chips + '</b></span>'
      + '</button>';
  }
  function sortedCards(uids) {
    return uids.map((u) => P.cardOf(run, u)).filter(Boolean)
      .sort((a, b) => (P.WHEEL.indexOf(a.tags[0]) - P.WHEEL.indexOf(b.tags[0])) || (b.star - a.star) || (a.uid - b.uid));
  }
  function renderHand(fresh, list) {
    const cards = sortedCards(list || run.cur.hand);
    $('hand').innerHTML = cards.map((c) => cardHtml(c, (sel.includes(c.uid) ? ' sel' : '') + (fresh && fresh.includes(c.uid) ? ' new' : ''))).join('');
    let k = 0;
    document.querySelectorAll('#hand .card.new').forEach((el) => { el.style.animationDelay = (k++ * 0.07) + 's'; });
  }
  function pips(n, max) { let h = ''; for (let i = 0; i < max; i++) h += '<i' + (i < n ? '' : ' class="off"') + '></i>'; return h; }
  function renderButtons() {
    const n = run.cur;
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
    renderWish();
  }
  function renderWish() {
    const W = run.cur.def.wish ? recipeOf(run.cur.def.wish) : null, el = $('judgeWish');
    el.hidden = !W;
    if (!W) return;
    el.innerHTML = '<span class="k">評審想看</span><b>《' + esc(W.name) + '》</b><small>' + esc(wishHint(W.need)) + '</small>';
    el.classList.toggle('done', !!run.cur.wishDone);
  }
  function say(text) {
    const el = $('judgeSay');
    el.textContent = '「' + text + '」';
    el.classList.remove('new'); void el.offsetWidth; el.classList.add('new');
  }
  function nodJudge() { const im = $('judgeImg'); im.classList.remove('react'); void im.offsetWidth; im.classList.add('react'); }
  function renderObjs() {
    $('objs').innerHTML = '<span class="k">靈感物件</span>' + run.objects.map((id, i) => {
      const o = D.OBJ[id];
      return '<div class="obj" data-slot="' + i + '" title="' + esc(o.name + '：' + o.desc) + '">' + (IE.Icons ? IE.Icons.obj(id, 40) : '') + '<div><b>' + esc(o.name) + '</b><span>' + esc(o.desc) + '</span></div></div>';
    }).join('');
  }
  function fireObj(slot) { const el = document.querySelector('.obj[data-slot="' + slot + '"]'); if (el) { el.classList.remove('fire'); void el.offsetWidth; el.classList.add('fire'); } return el; }

  // ---------- 一晚 ----------
  function beginNight(showIntroSheet) {
    const n = P.startNight(run);
    n.discardsMax = n.discards;
    sel = []; lastForm = null; busy = false;
    Pt.blank(run.seed * 31 + run.night * 7 + (run.retries || 0) * 101);
    $('nightNo').textContent = '第 ' + (run.night + 1) + ' 晚' + (n.def.boss ? '・外星評審之夜' : '');
    $('nightName').textContent = n.def.name;
    $('canvasFx').innerHTML = '';
    $('sparkNum').textContent = run.spark.toFixed(1);
    renderGoal(); renderJudge(); renderObjs(); renderHand(n.hand); renderWheel(null); setCalc(0, 0); renderButtons();
    say(P.JUDGES[n.def.judge].lines.start);
    hint('');
    if (showIntroSheet) showIntro();
  }
  function titleFor(log) {
    const recs = [].concat(...log.map((l) => l.recipes));
    if (recs.length) { const r = D.RECIPES.find((x) => x.id === recs[recs.length - 1]); if (r) return '《' + r.name + '》'; }
    if (!log.length) return '《空白》';
    const best = log.reduce((a, b) => (b.total > a.total ? b : a));
    const counts = {};
    log.forEach((l) => l.palette.forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
    const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    return '《' + (top ? tagName(top) : '無題') + '的' + NOUN[best.form] + '》';
  }

  // ---------- 選牌 ----------
  function toggleCard(el) {
    const u = Number(el.dataset.uid);
    if (sel.includes(u)) { sel = sel.filter((x) => x !== u); el.classList.remove('sel'); S.deselect(); }
    else {
      if (sel.length >= P.BASE.maxCards) { el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); hint('一筆最多 5 張素材。'); S.blocked(); return; }
      sel.push(u); el.classList.add('sel'); S.select(sel.length);
    }
    updatePreview();
  }
  function updatePreview() {
    const pv = sel.length ? P.preview(run, sel) : null;
    renderWheel(pv);
    if (pv) setCalc(pv.chips, pv.mult); else { $('chipsNum').textContent = '0'; $('multNum').textContent = '0'; }
    if (pv && pv.form !== 'mix' && pv.form !== lastForm) { S.shape(RANK.indexOf(pv.form)); const f = $('formName'); f.classList.remove('pop'); void f.offsetWidth; f.classList.add('pop'); }
    lastForm = pv ? pv.form : null;
    renderButtons();
    tips('select', pv);
  }

  // ---------- 下筆：整段演出 ----------
  async function flyToCanvas(uids) {
    S.whoosh();
    const t = canvasCenter();
    uids.forEach((u, i) => {
      const el = document.querySelector('#hand .card[data-uid="' + u + '"]');
      if (!el) return;
      const b = el.getBoundingClientRect();
      const g = el.cloneNode(true);
      g.classList.remove('sel', 'new');
      g.classList.add('ghost-card');
      g.style.left = b.left + 'px'; g.style.top = b.top + 'px'; g.style.width = b.width + 'px'; g.style.height = b.height + 'px';
      document.body.appendChild(g);
      el.style.visibility = 'hidden';
      setTimeout(() => {
        g.style.transform = 'translate(' + (t.x - b.left - b.width / 2).toFixed(0) + 'px,' + (t.y - b.top - b.height / 2).toFixed(0) + 'px) scale(.3) rotate(' + (i * 9 - 14) + 'deg)';
        g.style.opacity = '0.15';
      }, 20 + i * 55);
      setTimeout(() => g.remove(), 520 + i * 55);
    });
    await wait(380 + uids.length * 55);
  }
  function armSkip() {
    const on = (e) => { if (e.target.closest && e.target.closest('.veil')) return; if (speed < 4) { speed = 4; $('speedTag').hidden = false; } };
    document.addEventListener('pointerdown', on);
    return () => { document.removeEventListener('pointerdown', on); $('speedTag').hidden = true; speed = BASE_SPEED; };
  }
  async function showEquation(C, M, X, total) {
    const eq = document.createElement('div');
    eq.className = 'equation';
    eq.innerHTML = '<span class="c">' + fmt(C) + '</span> × <span class="m">' + fmtM(M) + '</span> × <span class="s">' + X.toFixed(1) + '</span>';
    $('canvasFx').appendChild(eq);
    S.tick();
    await wait(460);
    eq.innerHTML = '<span class="t big">0</span>';
    const tEl = eq.querySelector('.t');
    const dur = 560 / speed, start = performance.now();
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
    if (power > 0.4) burst(canvasCenter(), Math.round(10 + 34 * Math.min(1, power)), ['#ffc247', '#ff4fb4', '#37c3d6', '#ffffff']);
    await wait(430);
    eq.remove();
  }
  async function animateSteps(res, plans) {
    let ci = 0;
    for (const st of res.steps) {
      if (st.t === 'form') {
        setCalc(st.C, st.M);
        canvasBanner(st.name, res.form === 'mix' ? '草稿：只計最亮的一張' : P.FORM[res.form].tag);
        S.shape(RANK.indexOf(res.form));
        await wait(470);
      } else if (st.t === 'card') {
        const plan = plans[st.uid];
        const p = plan && plan.dabs.length ? Pt.screenPoint(plan.at) : canvasCenter();
        S.chip(ci++);
        floatAt(p, '+' + st.chips, 'chips');
        setCalc(st.C, null, 'c');
        if (plan && !st.again) await Pt.drawPlan(plan, 280 / speed);
        else { Pt.glint(16); await wait(200); }
        await wait(40);
      } else if (st.t === 'blocked') {
        const plan = plans[st.uid];
        const p = plan && plan.dabs.length ? Pt.screenPoint(plan.at) : canvasCenter();
        Pt.strike(plan && plan.dabs.length ? plan.at : null);
        floatAt(p, '評審：不計分', 'blocked');
        S.blocked(); nodJudge();
        await wait(380);
      } else if (st.t === 'rule') {
        floatAt(elCenter($('judgeImg')), st.xmult ? '×' + st.xmult : '+' + st.mult + ' 倍率', st.xmult && st.xmult < 1 ? 'blocked' : st.xmult ? 'xmult' : 'rule');
        setCalc(st.C, st.M, 'm'); nodJudge();
        if (st.xmult && st.xmult < 1) S.blocked(); else S.mult();
        await wait(340);
      } else if (st.t === 'obj') {
        const el = fireObj(st.slot);
        const plan = st.uid != null ? plans[st.uid] : null;
        const p = plan && plan.dabs.length ? Pt.screenPoint(plan.at) : el ? elCenter(el) : canvasCenter();
        const txt = st.xmult ? '×' + st.xmult : st.mult ? '+' + st.mult + ' 倍率' : '+' + st.chips + ' 籌碼';
        floatAt(p, txt, st.xmult ? 'xmult' : st.mult ? 'mult' : 'chips');
        setCalc(st.C, st.M, st.chips && !st.mult && !st.xmult ? 'c' : 'm');
        if (st.xmult) S.xmult(); else S.obj();
        await wait(st.xmult ? 420 : 290);
      } else if (st.t === 'wish') {
        canvasBanner('委託完成！', '這正是評審想看的作品', 'recipe');
        floatAt(elCenter($('judgeImg')), '×2', 'xmult');
        setCalc(st.C, st.M, 'm');
        $('judgeWish').classList.add('done');
        say(P.JUDGES[run.cur.def.judge].lines.wish); nodJudge();
        S.xmult(); S.recipe();
        burst(elCenter($('judgeWish')), 26, ['#ffd36b', '#9be36b', '#ffffff']);
        await wait(1150);
      } else if (st.t === 'recipe') {
        canvasBanner('《' + st.name + '》', st.isNew ? '發現新組合' : '組合', 'recipe');
        Pt.glint(90);
        setCalc(st.C, st.M);
        S.recipe();
        burst(canvasCenter(), 30, ['#ffd36b', '#ffffff', '#ff4fb4']);
        await wait(st.isNew ? 1150 : 640);
      } else if (st.t === 'spark') {
        if (res.blockedAll) { canvasBanner('不計分', P.JUDGES[run.cur.def.judge].name + '的規則'); S.blocked(); await wait(700); }
        else await showEquation(st.C, st.M, st.x, st.total);
      }
    }
  }
  async function doPlay() {
    if (busy || !sel.length || run.cur.done) return;
    busy = true; S.unlock(); renderButtons();
    const n = run.cur;
    const uids = sel.slice();
    const before = n.hand.slice();
    await flyToCanvas(uids);
    const res = P.play(run, uids);
    if (!res) { busy = false; renderButtons(); return; }
    sel = [];
    const remaining = before.filter((u) => !uids.includes(u));
    renderHand(null, remaining);
    renderWheel(null);
    const plans = Pt.planPlay({ form: res.form, palette: res.palette, cards: res.scoring.map((u) => P.cardOf(run, u)) });
    const stopSkip = armSkip();
    hint('');
    await animateSteps(res, plans);
    if (res.total > 0) await flyNumber('+' + fmt(res.total), $('scoreNum'));
    stopSkip();
    renderGoal(); bump($('scoreNum'));
    const J = P.JUDGES[n.def.judge];
    if (res.clear) { await nightClear(res); return; }
    if (res.fail) { await nightFail(); return; }
    const ratio = res.total / n.target;
    say(J.lines[res.wish ? 'wish' : res.newRecipes && res.newRecipes.length ? 'recipe' : ratio < 0.2 ? 'small' : ratio < 0.45 ? 'good' : 'great']);
    nodJudge();
    await wait(260);
    const fresh = n.hand.filter((u) => !remaining.includes(u));
    renderHand(fresh);
    fresh.forEach((u, i) => setTimeout(() => S.flip(i), i * 70));
    lastForm = null; setCalc(0, 0);
    busy = false; renderButtons();
    if (n.plays === 1) hint('最後一筆！還差 ' + fmt(n.target - n.score) + ' 分。', true);
    else if (!tips('afterPlay')) hint('今晚還有 ' + n.plays + ' 筆，還差 ' + fmt(n.target - n.score) + ' 分。');
  }
  async function doDiscard() {
    const n = run.cur;
    if (busy || !sel.length || n.discards <= 0 || n.done) return;
    busy = true; S.unlock(); renderButtons(); S.crumple();
    const disc = sel.slice();
    disc.forEach((u) => { const el = document.querySelector('#hand .card[data-uid="' + u + '"]'); if (el) el.classList.add('gone'); });
    await wait(340);
    const kept = n.hand.filter((u) => !disc.includes(u));
    P.discard(run, disc);
    sel = [];
    const fresh = n.hand.filter((u) => !kept.includes(u));
    renderHand(fresh);
    fresh.forEach((u, i) => setTimeout(() => S.flip(i), i * 70));
    lastForm = null; renderWheel(null); setCalc(0, 0);
    busy = false; renderButtons();
    hint(n.discards ? '還可以改稿 ' + n.discards + ' 次。' : '今晚不能再改稿了。');
  }

  // ---------- 收工、失敗、獎勵、一局完 ----------
  async function nightClear(res) {
    const n = run.cur, J = P.JUDGES[n.def.judge];
    stampCanvas('通過', 'pass'); S.stamp();
    await wait(240);
    S.clear(); say(J.lines.clear); nodJudge();
    burst(canvasCenter(), 44, ['#9be36b', '#ffc247', '#ffffff', '#37c3d6']);
    if (res.overkill) {
      for (let k = 0; k < 3; k++) {
        await wait(320);
        S.firework();
        const b = $('paint').getBoundingClientRect();
        burst({ x: b.left + b.width * (0.2 + Math.random() * 0.6), y: b.top + b.height * (0.15 + Math.random() * 0.4) }, 28, ['#ff4fb4', '#ffc247', '#37c3d6', '#ffffff']);
      }
    }
    await wait(1000);
    Pt.sign(run.bgName + ' · 2080');
    const shot = Pt.snapshot();
    const title = titleFor(n.log);
    const unused = n.plays;
    const fin = P.finishNight(run, { shot, title });
    const lines = [];
    if (unused) lines.push('提早收工：還剩 ' + unused + ' 筆，火花 +' + (0.1 * unused).toFixed(1));
    if (n.score >= n.target * 2) lines.push('分數是目標的兩倍以上：火花 +0.2');
    if (n.wishDone) lines.push('完成評審的委託：火花 +0.2');
    sheet('<span class="title-mark">第 ' + (n.def.idx + 1) + ' 晚・' + esc(n.def.name) + '・收工</span>'
      + '<div class="framed"><img src="' + shot + '" alt="今晚的作品"></div>'
      + '<div class="work-title">' + esc(title) + '</div>'
      + '<div class="work-meta">' + fmt(n.score) + ' / ' + fmt(n.target) + '</div>'
      + '<p class="quote">' + esc(J.name) + '：「' + esc(J.lines.clear) + '」</p>'
      + (lines.length ? '<p class="bonus">' + lines.map(esc).join('<br>') + '<br>火花現在是 ×' + fin.spark.toFixed(1) + '</p>' : '')
      + '<div class="row"><button class="btn hot" data-act="reward">' + (run.night >= run.nightDefs.length ? '看三晚的作品' : '領取收工獎勵') + '</button></div>');
  }
  async function nightFail() {
    const n = run.cur, J = P.JUDGES[n.def.judge];
    stampCanvas('否決', 'fail'); S.stamp();
    await wait(200);
    S.fail(); say(J.lines.fail); nodJudge();
    await wait(1100);
    const shot = Pt.snapshot();
    sheet('<span class="title-mark">第 ' + (run.night + 1) + ' 晚・' + esc(n.def.name) + '</span>'
      + '<h2>評審否決了今晚的作品</h2>'
      + '<div class="framed"><img src="' + shot + '" alt="今晚的作品"></div>'
      + '<div class="work-meta">' + fmt(n.score) + ' / ' + fmt(n.target) + '　差 ' + fmt(n.target - n.score) + ' 分</div>'
      + '<p class="quote">' + esc(J.name) + '：「' + esc(J.lines.fail) + '」</p>'
      + '<div class="row"><button class="btn hot" data-act="retry">再畫一次（今晚重來）</button><button class="btn ghost" data-act="restart">從第一晚重新開始</button></div>');
  }
  function showRewardObjects() {
    pending = P.rewards(run);
    if (!pending.objects.length || run.objects.length >= 5) { showRewardCards(); return; }
    sheet('<span class="title-mark">收工獎勵 1 / 2</span><h2>選一件靈感物件</h2><p>物件在計分時觸發，下一晚就用得上。</p>'
      + '<div class="choices">' + pending.objects.map((id) => {
        const o = D.OBJ[id];
        return '<button type="button" class="choice" data-act="takeObj" data-id="' + id + '">' + IE.Icons.obj(id, 56) + '<b>' + esc(o.name) + '</b><span>' + esc(o.desc) + '</span><span class="rar ' + o.rarity + '">' + (RAR[o.rarity] || '') + '</span></button>';
      }).join('') + '</div>'
      + '<div class="row"><button class="btn ghost" data-act="skipObj">都不要</button></div>');
  }
  function showRewardCards() {
    sheet('<span class="title-mark">收工獎勵 2 / 2</span><h2>選一張素材，放進你的素材庫</h2><p>素材的顏色是它的情緒；星越多，籌碼越高。</p>'
      + '<div class="choices">' + pending.cards.map((c, i) => cardHtml(c, '', 'data-act="takeCard" data-i="' + i + '"')).join('') + '</div>'
      + '<div class="row"><button class="btn ghost" data-act="skipCard">都不要</button></div>');
  }
  function nextNight() {
    if (run.night >= run.nightDefs.length) { showFinal(); return; }
    beginNight(true);
  }
  function showFinal() {
    const found = Object.keys(run.discovered).length;
    sheet('<span class="title-mark">三晚完成</span><h2>你的作品牆</h2>'
      + '<div class="gallery">' + run.nights.map((x) => '<figure><div class="framed"><img src="' + x.painting.shot + '" alt=""></div><figcaption><b>' + esc(x.painting.title) + '</b>' + esc(x.name) + '・' + fmt(x.score) + ' 分</figcaption></figure>').join('') + '</div>'
      + '<p>發現了 ' + found + ' 個具名組合（共 ' + P.RECIPES.length + ' 個）。火花最後是 ×' + run.spark.toFixed(1) + '。</p>'
      + '<p class="quote">灰人：「評核完成。你的三件作品已經存入人才庫。我們會再聯絡你。」</p>'
      + '<div class="row"><button class="btn hot" data-act="again">再玩一局（新的素材和評審）</button></div>');
    S.clear();
  }
  function showHelp() {
    const found = Object.keys(run.discovered).map((id) => D.RECIPES.find((r) => r.id === id)).filter(Boolean);
    sheet('<h2>配色的規則</h2><p>選中的素材的情緒，在色輪上連成形狀。形狀決定基本的籌碼和倍率；每張計分的素材再加它的籌碼（★ 越多越高）。靈感物件和具名組合在下筆時觸發。</p>'
      + '<p class="lead">分數 = 籌碼 × 倍率 × 火花</p>'
      + '<div class="ftable">' + D.FORMS.filter((f) => !f.secret || run.discovered['form-' + f.id]).map((f) => '<div><b>' + esc(f.name) + '</b><span>' + esc(f.id === 'full' ? '五張，合共 9 種或以上的情緒' : f.desc) + '</span><span class="v"><span class="c">' + f.chips + '</span> × <span class="m">' + f.mult + '</span></span></div>').join('') + '</div>'
      + '<h3>已發現的具名組合（' + found.length + ' / ' + P.RECIPES.length + '）</h3>'
      + '<p class="small-note">' + (found.length ? found.map((r) => '《' + esc(r.name) + '》').join('　') : '還沒有。某幾種情緒放在同一筆裡，會觸發有名字的作品。') + '</p>'
      + '<div class="row"><button class="btn hot" data-act="close">繼續</button></div>');
  }

  // ---------- 第一晚的提示 ----------
  const TIPS = [
    '點選幾張素材。每張素材有一至兩種情緒，就是色輪上的顏色。',
    '顏色在色輪上連成形狀，形狀決定倍率。試試換幾張。',
    '形狀成立了！按「下筆」，把它們畫上畫布。',
    '分數達到目標就收工。手牌不順，就選不要的素材按「改稿」。',
  ];
  function tips(ev, pv) {
    if (!run || run.night > 0 || store.get('tipsDone', false)) return false;
    if (ev === 'start') { tipStep = 0; hint(TIPS[0], true); return true; }
    if (ev === 'select') {
      if (pv && pv.form !== 'mix') { tipStep = 2; hint(TIPS[2], true); }
      else if (sel.length) { tipStep = Math.max(tipStep, 1); hint(TIPS[1], true); }
      else hint(TIPS[0], true);
      return true;
    }
    if (ev === 'afterPlay') { hint(TIPS[3], true); store.set('tipsDone', true); return true; }
    return false;
  }

  // ---------- 視窗 ----------
  function sheet(html) {
    $('sheet').innerHTML = html;
    $('veil').hidden = false;
    const b = $('sheet').querySelector('.btn.hot') || $('sheet').querySelector('button');
    if (b) setTimeout(() => b.focus({ preventScroll: true }), 30);
  }
  function closeSheet() { $('veil').hidden = true; $('sheet').innerHTML = ''; }
  function showTitle() {
    sheet('<span class="title-mark">INSPIRATION EVACUATION 2080・原型</span>'
      + '<h1 class="big-title">創作<span>之夜</span></h1>'
      + '<p class="lead">2080 年，外星人來地球收藏人類最後的靈感。今晚，把你的情緒畫成一幅作品，讓評審看見你。</p>'
      + '<p>三晚：社區小展、畫廊聯展，最後是外星評審。每晚有幾筆和幾次改稿，分數達到目標就收工。</p>'
      + '<p class="small-note">計分時點一下畫面可以快轉。右上角的「?」有配色的規則。</p>'
      + '<div class="row"><button class="btn hot" data-act="start">開始創作</button></div>');
  }
  function showIntro() {
    const def = run.cur.def, J = P.JUDGES[def.judge];
    sheet('<span class="title-mark">第 ' + (run.night + 1) + ' 晚・' + esc(def.name) + (def.boss ? '・外星評審之夜' : '') + '</span>'
      + '<div class="intro-judge"><img src="' + imgSrc(J.img) + '" alt=""><div><h2>' + esc(J.name) + '</h2><p>' + esc(J.title) + '</p></div></div>'
      + '<p class="quote">「' + esc(J.lines.start) + '」</p>'
      + '<div class="rule' + (def.rule.good ? ' good' : '') + '"><span class="k">評審的規則</span>' + esc(def.rule.text) + '</div>'
      + (def.wish ? '<div class="wish"><span class="k">評審想看（委託）</span><b>《' + esc(recipeOf(def.wish).name) + '》</b><small>' + esc(wishHint(recipeOf(def.wish).need)) + '。猜猜是哪幾種情緒？畫出來：倍率 ×2，火花 +0.2。' + wishNote(def.rule) + '。</small></div>' : '')
      + '<p>今晚的目標 <span class="target-line">' + fmt(run.cur.target) + '</span> 分，有 ' + run.cur.plays + ' 筆、改稿 ' + run.cur.discards + ' 次。</p>'
      + '<div class="row"><button class="btn hot" data-act="go">開始畫</button></div>');
  }
  let bgm = null;
  function startBgm() {
    if (bgm || S.muted) return;
    try {
      bgm = new Audio(window.IE_NIGHT_BGM || '../../game/audio/pixel-orbit.mp3');
      bgm.loop = true; bgm.volume = 0.32;
      const p = bgm.play();
      if (p && p.catch) p.catch(() => { bgm = null; });
    } catch (e) { bgm = null; }
  }
  const actions = {
    start() { S.unlock(); startBgm(); showIntro(); },
    go() { closeSheet(); if (!tips('start')) hint('選素材，然後下筆。'); },
    reward() { if (run.night >= run.nightDefs.length) showFinal(); else showRewardObjects(); },
    takeObj(b) { P.takeObject(run, b.dataset.id); S.obj(); showRewardCards(); },
    skipObj() { showRewardCards(); },
    takeCard(b) { P.takeCard(run, pending.cards[Number(b.dataset.i)]); S.select(3); nextNight(); },
    skipCard() { nextNight(); },
    retry() { run.retries = (run.retries || 0) + 1; beginNight(false); closeSheet(); hint('再來一次。素材重新洗過了。'); },
    restart() { newGame(); showIntro(); },
    again() { newGame(); showIntro(); },
    close() { closeSheet(); },
  };

  function newGame(seed) {
    run = P.newRun(seed || ((Date.now() % 1000003) + 1));
    run.bgName = D.BACKGROUNDS[run.bg].name;
    beginNight(false);
  }

  // ---------- 開始 ----------
  buildWheel();
  Pt.init($('paint'));
  $('hand').addEventListener('click', (e) => { const b = e.target.closest('.card'); if (!b || busy || !run || run.cur.done) return; S.unlock(); toggleCard(b); });
  $('btnPlay').addEventListener('click', doPlay);
  $('btnDiscard').addEventListener('click', doDiscard);
  $('btnHelp').addEventListener('click', () => { if (!busy) showHelp(); });
  // 點委託：在提示列重複提示（手機上只看到名稱）
  $('judgeWish').addEventListener('click', () => { const W = run && run.cur.def.wish ? recipeOf(run.cur.def.wish) : null; if (W && !busy) hint('評審想看《' + W.name + '》：' + wishHint(W.need) + '。' + wishNote(run.cur.def.rule) + '。'); });
  // 點物件：在提示列顯示它的效果（手機上只看到圖示）
  $('objs').addEventListener('click', (e) => { const el = e.target.closest('.obj'); if (!el || busy) return; const o = D.OBJ[run.objects[Number(el.dataset.slot)]]; if (o) hint(o.name + '：' + o.desc); });
  $('btnMute').addEventListener('click', () => {
    const m = !S.muted;
    S.setMuted(m); store.set('muted', m);
    $('btnMute').setAttribute('aria-pressed', String(m));
    if (bgm) { if (m) bgm.pause(); else bgm.play().catch(() => {}); } else if (!m) startBgm();
  });
  $('sheet').addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; S.unlock(); const fn = actions[b.dataset.act]; if (fn) fn(b); });
  if (store.get('muted', false)) { S.setMuted(true); $('btnMute').setAttribute('aria-pressed', 'true'); }
  newGame();
  showTitle();
  window.__night = { get run() { return run; }, get busy() { return busy; }, P, actions, doPlay, doDiscard, toggleCard };
})();
