// 遊戲流程：朝早手機 → 三個時段 → 夜晚結算 → 探射燈 → 篩選日 → 結局。
(function (IE) {
  'use strict';
  const D = IE.DATA, R = IE.Rules, P = IE.Pixel, UI = IE.UI, A = IE.Audio, S = IE.Scenes;
  const KEY_META = 'ie2080.meta', KEY_RUN = 'ie2080.run';

  // localStorage 可能用唔到（私密模式、預覽），全部包住
  const store = {
    get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 存唔到都照玩 */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* 冇所謂 */ } },
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
  const savedRun = () => { const r = store.get(KEY_RUN); return r && !r.ended && r.v === 1 ? r : null; };
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

  // ---------- 一日 ----------
  function startDay() {
    const s = Game.state;
    S.City.forceNight = false;
    setScene(S.City);
    UI.renderHud(s);
    UI.setPanel('<p class="mute">朝早。你部電話震咗幾下。</p>');
    const m = R.morning(s);
    save();
    openPhone(true);
    if (s.day === R.reviewDay(s)) UI.toast('今晚係篩選日。累積訊號要過 ' + UI.fmt(R.threshold(s)) + '。', 'bad');
    else if (m.astar) UI.toast('阿星傳咗訊息嚟。');
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
        close() { UI.closeModal(); if (morning) showHub(); else showHub(); },
      }, morning ? null : { dismiss: () => showHub() });
    };
    render();
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
    document.querySelectorAll('[data-ctrl]').forEach((b) => {
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (Game.micro === m) m.control(b.dataset.ctrl); });
      b.addEventListener('click', (e) => { if (e.detail === 0 && Game.micro === m) m.control(b.dataset.ctrl); });
    });
    window.scrollTo({ top: Math.max(0, stage().offsetTop - 8), behavior: 'smooth' });
  }
  // 測試同小遊戲共用：將小遊戲結果套落規則
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

  // ---------- 夜晚 ----------
  function endOfDay() {
    const s = Game.state;
    // HUD 停喺今晚，等結算完先轉去聽朝
    UI.renderHud(s);
    const rep = R.endDay(s);
    S.City.forceNight = true;
    setScene(S.City);
    UI.setPanel('<p class="mute">夜晚。外星人嘅探射燈又出嚟掃。</p>');
    save();
    const lock = !!(rep.review && rep.review.pass);
    S.City.searchlight(rep.searchlight || 0, lock, () => {
      UI.modal(UI.settleModal(rep, s), {
        ok() {
          UI.closeModal();
          if (rep.review) {
            A.sfx(rep.review.pass ? 'combo' : 'stamp');
            UI.modal(UI.reviewModal(rep.review), {
              ok() {
                UI.closeModal();
                if (rep.ending && rep.ending.type === 'recruited') recruit();
                else if (rep.ending) finishRun(rep.ending);
                else { setCityFilter(); startDay(); }
              },
            });
          } else if (rep.ending) finishRun(rep.ending);
          else startDay();
        },
      });
    });
  }

  // ---------- 被選中 ----------
  function recruit() {
    const s = Game.state;
    UI.setPanel('<p class="mute">光。好多光。</p>');
    S.City.forceNight = true;
    s.saturation = 1.3;
    setCityFilter();
    A.setMode('alien');
    S.City.startBeam(() => {
      S.City.flash = 1;
      S.Office.enter([
        '歡迎加入星際人才發展局。',
        '我哋唔係一個組織，我哋係一個宇宙大家庭。',
        '你嘅朋友阿星都喺度。佢今季表現符合預期。',
        '你嘅第一份工作好簡單：',
        '幫我哋篩選下一批地球候選人。',
      ], () => startMicro('alien', (res) => {
        const pct = Math.round(res.accuracy * 100);
        const stars = Math.max(1, Math.min(5, Math.round(res.accuracy * 5 * 10) / 10)).toFixed(1);
        let e;
        if (res.accuracy < 0.45) {
          e = { kind: 'returned', title: '被遣返',
            text: '你嘅員工評分得 ★' + stars + '。星際人才發展局以「文化唔契合」為由將你遣返地球。你帶住一身火花返到浮城，水位又升咗。' };
        } else {
          const self = res.selfJudged === false ? '你亦唔錄取咗「樣本 #2080」，一個好似你嘅人。指引就係指引。'
            : res.selfJudged === true ? '你錄取咗「樣本 #2080」。違反指引，已記錄。' : '';
          e = { kind: 'agent', title: '星際特工',
            text: '你被選中咗。第一份工係篩選地球人，準確度 ' + pct + '%，員工評分 ★' + stars + '。' + self + '阿星喺隔籬枱，冇抬頭望你。' };
        }
        S.City.enter('hub');
        finishRun(e);
      }));
      setScene(S.Office);
      UI.setPanel('<div class="controls"><p class="hint">撳畫面或者空白鍵繼續。</p></div>');
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
    UI.setPanel('<div class="btn-row"><button class="btn primary" type="button" data-do="again">再嚟一局</button><button class="btn" type="button" data-do="title">返標題</button></div>',
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
        if (type === 'pointerdown') { try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 冇所謂 */ } e.preventDefault(); }
        const p = toLow(e);
        sc.pointer(type === 'pointerdown' ? 'down' : type === 'pointermove' ? 'move' : 'up', p.x, p.y);
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
  try { if (hot && hot.snapshot) hot.snapshot(() => ({ run: Game.state && !Game.state.ended && !Game.micro ? Game.state : null })); } catch (e) { /* 唔支援就算 */ }
  if (hot && hot.ready) hot.ready(boot); else boot((hot && hot.data) || {});

  window.__IE = IE; // 方便測試
})(window.IE = window.IE || {});
