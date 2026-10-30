// 遊戲流程：早上看手機 → 三個時段 → 晚上結算 → 探射燈 → 篩選日 → 結局。
(function (IE) {
  'use strict';
  const D = IE.DATA, R = IE.Rules, P = IE.Pixel, UI = IE.UI, A = IE.Audio, S = IE.Scenes;
  const KEY_META = 'ie2080.meta', KEY_RUN = 'ie2080.run';

  // localStorage 可能無法使用（私密模式、預覽），全部包在 try 裡
  const store = {
    get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 存不了也照樣可以玩 */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* 忽略 */ } },
  };

  const seasons = Object.keys(D.SEASONS);
  const Game = IE.Game = {
    state: null, meta: store.get(KEY_META) || {}, scene: null, micro: null,
    setup: { bg: 'copywriter', season: seasons[Math.floor(Math.random() * seasons.length)] },
    celebrate(total) {
      const s = Game.state;
      if (!s || Game.scene !== S.City) return;
      const p = S.City.playerPos(s);
      const n = Math.min(80, 12 + Math.round(total / 300));
      const cols = ['#ffc247', '#ff4fb4', '#37c3d6', '#9be36b', '#ffffff'];
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = 20 + Math.random() * 60;
        S.City.fx.add({ x: p.x + 4, y: p.y + 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, g: 30, drag: 0.98, life: 1.4 + Math.random(), color: cols[i % cols.length], size: Math.random() < 0.3 ? 2 : 1 });
      }
      S.City.flash = 0.25;
      setCityFilter();
    },
  };

  const save = () => { if (Game.state && !Game.state.ended) store.set(KEY_RUN, Game.state); };
  const savedRun = () => { const r = store.get(KEY_RUN); return r && !r.ended && r.v === 3 ? r : null; };
  const stage = () => document.getElementById('stage');

  function setCityFilter() {
    const c = P.view.canvas;
    if (Game.scene === S.City && Game.state && S.City.mode === 'hub') c.style.filter = 'saturate(' + Game.state.saturation.toFixed(2) + ')';
    else c.style.filter = 'none';
  }
  function setScene(sc) {
    Game.scene = sc;
    stage().classList.toggle('playing', !!(sc && sc !== S.City && sc !== S.Office));
    setCityFilter();
  }

  // ---------- 主迴圈 ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const sc = Game.scene;
    if (sc) { sc.update(dt); sc.draw(P.view.lctx); }
    P.present();
    if (sc && sc.drawText) sc.drawText();
    requestAnimationFrame(frame);
  }

  // ---------- 標題、開局 ----------
  function showTitle() {
    document.getElementById('hud').hidden = true;
    S.City.enter('attract');
    setScene(S.City);
    UI.closeModal();
    UI.setPanel(UI.titlePanel(Game.meta, !!savedRun()), {
      continue() { A.init(); Game.state = savedRun(); S.City.enter('hub'); resumeRun(); },
      new() { A.init(); store.del(KEY_RUN); showSetup(); },
      help() { A.init(); UI.modal(UI.helpModal(), { close: UI.closeModal }, { dismiss: () => {} }); },
      collection() { UI.modal(UI.collectionModal(Game.meta), { close: UI.closeModal }, { dismiss: () => {} }); },
    });
  }
  function showSetup() {
    const render = () => UI.setPanel(UI.setupPanel(Game.setup), {
      bg(el) { Game.setup.bg = el.dataset.id; render(); },
      season(el) { Game.setup.season = el.dataset.id; render(); },
      back() { showTitle(); },
      start() { newGame(Game.setup.bg, Game.setup.season); },
    });
    render();
    window.scrollTo({ top: 0 });
  }
  function newGame(bg, season) {
    A.init();
    Game.state = R.newRun({ bg, season, meta: Game.meta });
    S.City.enter('hub');
    save();
    startDay();
  }
  function resumeRun() {
    const s = Game.state;
    setScene(S.City);
    if (s.slot === 0 && (!s.morning || s.morning.day !== s.day)) startDay();
    else showHub();
  }

  // ---------- 一天 ----------
  function startDay() {
    const s = Game.state;
    S.City.forceNight = false;
    setScene(S.City);
    UI.renderHud(s);
    UI.setPanel('<p class="mute">早上。你的手機震了幾下。</p>');
    const m = R.morning(s);
    save();
    openPhone(true);
    if (s.day === R.reviewDay(s)) UI.toast('今晚是篩選日。累積訊號必須超過 ' + UI.fmt(R.threshold(s)) + '。', 'bad');
    else if (m.astar) UI.toast('阿星傳來了訊息。');
  }
  function openPhone(morning) {
    const s = Game.state;
    const render = () => {
      UI.modal(UI.phoneModal(s, R.morning(s), R.shop(s), { morning }), {
        buy(el) {
          const r = R.buy(s, el.dataset.id);
          UI.toast(r.msg, r.ok ? 'good' : 'bad');
          if (r.ok) A.sfx('coin');
          UI.renderHud(s); A.setSpark(s.spark); save(); render();
        },
        close() { UI.closeModal(); if (morning) morningDilemma(); else showHub(); },
      }, morning ? null : { dismiss: () => showHub() });
    };
    render();
  }
  // 早上的道德抉擇：做了選擇才開始一天
  function morningDilemma() {
    const s = Game.state;
    if (!R.drawDilemma(s)) { showHub(); return; }
    save();
    UI.setPanel('<p class="mute">出門前，發生了一件事。</p>');
    UI.modal(UI.dilemmaModal(R.dilemmaView(s), s), {
      pick(el) {
        const rep = R.resolveDilemma(s, Number(el.dataset.i));
        A.sfx(rep.deltas.soul > 0 ? 'wrong' : 'pickup');
        UI.renderHud(s); A.setSpark(s.spark); save();
        UI.modal(UI.reportModal(rep, '開始今天'), { ok() { UI.closeModal(); showHub(); } });
      },
    });
  }
  function showHub() {
    const s = Game.state;
    if (!s || s.ended) return;
    setScene(S.City);
    UI.renderHud(s);
    A.setMode('city');
    A.setSpark(s.spark);
    UI.setPanel(UI.actionsPanel(s, R.actions(s)), {
      act(el) { doAction(el.dataset.id); },
    });
    save();
  }

  function doAction(id) {
    const s = Game.state;
    switch (id) {
      case 'label': case 'ot': case 'smile': case 'dive':
        return startMicro(id);
      case 'rest':
        return afterAction(R.applyRest(s));
      case 'volunteer':
        return afterAction(R.applyVolunteer(s));
      case 'chat':
        return UI.setPanel(UI.chatPanel(s), {
          npc(el) { afterAction(R.applyChat(s, el.dataset.id)); },
          back() { showHub(); },
        });
      case 'create':
        return IE.Craft.open(s, (res) => {
          if (!res) { showHub(); return; }
          UI.renderHud(s);
          afterSlot();
        });
    }
  }

  // ---------- 小遊戲 ----------
  function startMicro(kind, onResult) {
    const token = {};
    Game.microToken = token;
    const done = (result) => {
      if (Game.microToken !== token) return;
      Game.microToken = null; Game.micro = null;
      if (onResult) { onResult(result); return; }
      Game.applyMicroResult(kind, result);
    };
    const m = IE.Micro.create(kind, {}, done);
    Game.micro = m;
    setScene(m);
    UI.setPanel(UI.controlsPanel(m), {});
    // 按鈕支援「按住」：按下時 control(id, true)，放開時 control(id, false)
    document.querySelectorAll('[data-ctrl]').forEach((b) => {
      const id = b.dataset.ctrl;
      let held = false;
      const up = () => { if (held && Game.micro === m) { held = false; m.control(id, false); } };
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try { b.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
        if (Game.micro === m) { held = true; m.control(id, true); }
      });
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('lostpointercapture', up);
      b.addEventListener('click', (e) => { if (e.detail === 0 && Game.micro === m) { m.control(id, true); m.control(id, false); } });
      b.addEventListener('contextmenu', (e) => e.preventDefault());
    });
    window.scrollTo({ top: Math.max(0, stage().offsetTop - 8), behavior: 'smooth' });
  }
  // 小遊戲與測試共用：把小遊戲結果套用到規則
  Game.applyMicroResult = function (kind, result) {
    const s = Game.state;
    Game.microToken = null; Game.micro = null;
    let rep;
    if (kind === 'label' || kind === 'ot') rep = R.applyLabel(s, result, { ot: kind === 'ot' });
    else if (kind === 'smile') rep = R.applySmile(s, result);
    else if (kind === 'dive') rep = R.applyDive(s, result);
    setScene(S.City);
    afterAction(rep);
  };

  function afterAction(rep) {
    const s = Game.state;
    UI.renderHud(s);
    A.setSpark(s.spark);
    UI.setPanel('<p class="mute">' + UI.esc(rep.title) + '</p>');
    UI.modal(UI.reportModal(rep), { ok() { UI.closeModal(); afterSlot(); } });
    save();
  }
  function afterSlot() {
    const s = Game.state;
    if (s.body <= 0) return finishRun(R.endingFor(s, 'death'));
    if (R.isNight(s)) return endOfDay();
    s.slot++;
    showHub();
  }

  // ---------- 晚上 ----------
  function endOfDay() {
    const s = Game.state;
    // 狀態列停留在今晚，結算完才切換到明天
    UI.renderHud(s);
    const rep = R.endDay(s);
    S.City.forceNight = true;
    setScene(S.City);
    UI.setPanel('<p class="mute">晚上。外星人的探射燈又出來掃視城市。</p>');
    save();
    // 訊號達標，探射燈就會停在窗外；但靈魂太重的話，光束拉不動你
    const lock = !!(rep.review && rep.review.signalOk);
    const heavy = !!(rep.review && rep.review.overweight && rep.review.signalOk);
    S.City.searchlight(rep.searchlight || 0, lock, () => {
      UI.modal(UI.settleModal(rep, s), {
        ok() {
          UI.closeModal();
          if (rep.review) {
            A.sfx(rep.review.pass ? 'combo' : 'stamp');
            UI.modal(UI.reviewModal(rep.review), {
              ok() {
                UI.closeModal();
                if (rep.ending && rep.ending.type === 'recruited') chooseToGo();
                else if (rep.ending) finishRun(rep.ending);
                else { setCityFilter(); startDay(); }
              },
            });
          } else if (rep.ending) finishRun(rep.ending);
          else startDay();
        },
      });
    }, heavy);
  }

  // ---------- 被選中 ----------
  function chooseToGo() {
    const s = Game.state;
    UI.modal(UI.stayModal(s), {
      go() { UI.closeModal(); recruit(); },
      stay() {
        UI.closeModal();
        A.sfx('stamp');
        finishRun(R.endingFor(s, 'guardian'));
      },
    });
  }
  function recruit() {
    const s = Game.state;
    UI.setPanel('<p class="mute">光。很多很多光。</p>');
    S.City.forceNight = true;
    s.saturation = 1.3;
    setCityFilter();
    A.setMode('alien');
    S.City.startBeam(() => {
      S.City.flash = 1;
      S.Office.enter([
        '歡迎加入星際人才發展局。',
        '我們不是一個組織，我們是一個宇宙大家庭。',
        '你的朋友阿星也在這裡。阿星本季的表現符合預期。',
        '你的第一份工作很簡單：',
        '替我們篩選下一批地球候選人。',
      ], () => startMicro('alien', (res) => {
        const pct = Math.round(res.accuracy * 100);
        const stars = Math.max(1, Math.min(5, Math.round(res.accuracy * 5 * 10) / 10)).toFixed(1);
        let e;
        if (res.accuracy < 0.45) {
          e = { kind: 'returned', title: '被遣返',
            text: '你的員工評分只有 ★' + stars + '。星際人才發展局以「文化不契合」為由把你遣返地球。你帶著一身火花回到浮城，水位又上升了。' };
        } else {
          const self = res.selfJudged === false ? '你也沒有錄取「樣本 #2080」，一個很像你的人。指引就是指引。'
            : res.selfJudged === true ? '你錄取了「樣本 #2080」。違反指引，已記錄在案。' : '';
          const light = s.conscience < 0.3 ? '你的靈魂只有 ' + s.soul.toFixed(1) + ' 克，輕得像一張表格。你篩選地球人時，一點也不猶豫。' : '';
          e = { kind: 'agent', title: s.conscience < 0.3 ? '完美員工' : '星際特工',
            text: '你被選中了。第一份工作是篩選地球人，準確度 ' + pct + '%，員工評分 ★' + stars + '。' + self + light + '阿星就坐在隔壁，沒有抬頭看你。' };
        }
        S.City.enter('hub');
        finishRun(e);
      }));
      setScene(S.Office);
      UI.setPanel('<div class="controls"><p class="hint">按畫面或空白鍵繼續。</p></div>');
    });
  }

  function finishRun(ending) {
    const s = Game.state;
    const kind = ending.kind || ending.type;
    ending.kind = kind;
    s.ended = ending;
    Game.meta = R.recordMeta(Game.meta, s, kind);
    store.set(KEY_META, Game.meta);
    store.del(KEY_RUN);
    S.City.forceNight = true;
    setScene(S.City);
    A.setMode(kind === 'agent' ? 'alien' : 'city');
    A.setSpark(kind === 'grey' ? 0 : s.spark);
    UI.renderHud(s);
    UI.setPanel('<div class="btn-row"><button class="btn primary" type="button" data-do="again">再玩一局</button><button class="btn" type="button" data-do="title">返回標題</button></div>',
      { again: () => { UI.closeModal(); showSetup(); }, title: () => showTitle() });
    UI.modal(UI.endingModal(ending, s, Game.meta), {
      copy() {
        const text = '《靈感撤離 2080》' + ending.title + '：' + ending.text;
        const ok = () => UI.toast('已複製', 'good');
        try {
          navigator.clipboard.writeText(text).then(ok, () => UI.toast(text));
        } catch (e) { UI.toast(text); }
      },
      again() { UI.closeModal(); showSetup(); },
    }, { dismiss: () => {} });
  }

  // ---------- 輸入 ----------
  function toLow(e) {
    const r = P.view.canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * P.W, y: (e.clientY - r.top) / r.height * P.H };
  }
  function bindInput() {
    const cv = P.view.canvas;
    ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach((type) => {
      cv.addEventListener(type, (e) => {
        const sc = Game.scene;
        if (!sc || !sc.pointer) return;
        if (type === 'pointerdown') { try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ } e.preventDefault(); }
        const p = toLow(e);
        sc.pointer(type === 'pointerdown' ? 'down' : type === 'pointermove' ? 'move' : 'up', p.x, p.y, e.pointerType);
      });
    });
    const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '];
    window.addEventListener('keydown', (e) => {
      const sc = Game.scene;
      if (sc && sc.key && sc !== S.City) {
        if (KEYS.includes(e.key)) e.preventDefault();
        if (!e.repeat) sc.key(e.key, true);
        return;
      }
      if (UI.modalOpen()) return;
      if (/^[1-9]$/.test(e.key)) {
        const btns = document.querySelectorAll('#panel .act');
        const b = btns[Number(e.key) - 1];
        if (b && !b.disabled) b.click();
      }
    });
    window.addEventListener('keyup', (e) => {
      const sc = Game.scene;
      if (sc && sc.key && sc !== S.City) sc.key(e.key, false);
    });
    document.getElementById('hud').addEventListener('click', (e) => {
      const b = e.target.closest('[data-hud]');
      if (!b || !Game.state) return;
      A.sfx('click');
      if (b.dataset.hud === 'mute') { A.init(); A.toggleMute(); UI.renderHud(Game.state); }
      else if (b.dataset.hud === 'help') UI.modal(UI.helpModal(), { close: UI.closeModal }, { dismiss: () => {} });
      else if (b.dataset.hud === 'phone' && !Game.micro && !Game.state.ended) openPhone(false);
    });
    window.addEventListener('resize', () => P.resize());
  }

  // ---------- 開機 ----------
  function boot(data) {
    P.setup(document.getElementById('screen'));
    UI.bindDelegation();
    bindInput();
    S.City.forceNight = false;
    requestAnimationFrame(frame);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => P.resize());
    if (data && data.run && !data.run.ended) { Game.state = data.run; S.City.enter('hub'); showHub(); }
    else showTitle();
  }
  const hot = window.claude && window.claude.hot;
  try { if (hot && hot.snapshot) hot.snapshot(() => ({ run: Game.state && !Game.state.ended && !Game.micro ? Game.state : null })); } catch (e) { /* 不支援就略過 */ }
  if (hot && hot.ready) hot.ready(boot); else boot((hot && hot.data) || {});

  window.__IE = IE; // 方便測試
})(window.IE = window.IE || {});
