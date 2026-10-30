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
    setup: { bg: 'copywriter', season: seasons[Math.floor(Math.random() * seasons.length)], mode: 'standard' },
    celebrate(total) {
      const s = Game.state;
      const sc = Game.scene;
      if (!s || !sc || !sc.fx) return;
      const p = sc === S.City ? S.City.playerPos(s) : { x: 168, y: 86 };
      const n = Math.min(80, 12 + Math.round(total / 300));
      const cols = ['#ffc247', '#ff4fb4', '#37c3d6', '#9be36b', '#ffffff'];
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = 20 + Math.random() * 60;
        sc.fx.add({ x: p.x + 4, y: p.y + 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, g: 30, drag: 0.98, life: 1.4 + Math.random(), color: cols[i % cols.length], size: Math.random() < 0.3 ? 2 : 1 });
      }
      if (sc === S.City) S.City.flash = 0.25;
      setCityFilter();
    },
  };

  const save = () => { if (Game.state && !Game.state.ended) store.set(KEY_RUN, Game.state); };
  const savedRun = () => { const r = store.get(KEY_RUN); return r && !r.ended && r.v === 9 ? r : null; };
  const stage = () => document.getElementById('stage');

  // 朋友一個個被帶走，浮城（橫切面、房間、地圖）的顏色也越來越淡
  function setCityFilter() {
    const c = P.view.canvas;
    const M = IE.Maps;
    const faded = Game.scene === M.Room || Game.scene === M.CityMap || (Game.scene === S.City && S.City.mode === 'hub');
    if (faded && Game.state) c.style.filter = 'saturate(' + Game.state.saturation.toFixed(2) + ')';
    else c.style.filter = 'none';
  }
  const isMapScene = (sc) => !!IE.Maps && [IE.Maps.Room, IE.Maps.CityMap, IE.Maps.WorldMap, IE.Maps.Trip].includes(sc);
  function setScene(sc) {
    Game.scene = sc;
    stage().classList.toggle('playing', !!(sc && sc !== S.City && sc !== S.Office && !isMapScene(sc)));
    if (!isMapScene(sc)) P.view.canvas.style.cursor = 'default';
    setCityFilter();
  }

  // ---------- 畫面：房間、浮城（橫切面）、地圖、世界、旅途 ----------
  const VIEWS = { room: '房間', city: '浮城', map: '地圖', world: '世界', trip: '旅途' };
  function viewScene(v) { const M = IE.Maps; return { room: M.Room, city: S.City, map: M.CityMap, world: M.WorldMap, trip: M.Trip }[v] || S.City; }
  function currentView() {
    const s = Game.state;
    if (s && s.trip) return Game.view === 'world' ? 'world' : 'trip';
    return Game.view && Game.view !== 'trip' ? Game.view : 'room';
  }
  function renderViews(show) {
    const nav = document.getElementById('views');
    const s = Game.state;
    if (!show || !s || s.ended) { nav.hidden = true; return; }
    const list = s.trip ? ['trip', 'world'] : ['room', 'city', 'map', 'world'];
    const cur = currentView();
    nav.hidden = false;
    nav.innerHTML = list.map((v) => '<button type="button" class="view-tab' + (v === cur ? ' on' : '') + '" data-view="' + v + '" aria-pressed="' + (v === cur) + '">'
      + (v === 'room' && s.floor === 0 ? '天橋底' : v === 'trip' ? D.DEST[s.trip.dest].name : VIEWS[v]) + '</button>').join('');
  }
  function setView(v) { Game.view = v; showHub(); }

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
    document.getElementById('views').hidden = true;
    S.City.enter('attract');
    setScene(S.City);
    UI.closeModal();
    UI.setPanel(UI.titlePanel(Game.meta, !!savedRun()), {
      continue() { A.init(); Game.state = savedRun(); S.City.enter('hub'); resumeRun(); },
      new() { A.init(); store.del(KEY_RUN); showSetup(); },
      help() { A.init(); UI.modal(UI.helpModal(), { close: UI.closeModal }, { dismiss: () => {} }); },
      collection() { UI.modal(UI.collectionModal(Game.meta), { close: UI.closeModal }, { dismiss: () => {} }); },
      gacha() { A.init(); openGacha(() => showTitle()); },
      history() { UI.modal(UI.historyModal(Game.meta), { close: UI.closeModal }, { dismiss: () => {} }); },
      weekly() {
        A.init(); store.del(KEY_RUN);
        const w = IE.Meta.weekly(IE.Meta.weekKey()), mod = IE.Meta.WEEKLY_MODS[w.mod], rec = Game.meta.weekly && Game.meta.weekly[w.key];
        UI.modal('<div class="modal"><span class="eyebrow">每週挑戰・' + w.key + '</span><h2>' + mod.name + '</h2><p>' + mod.desc + '。這一週所有人都用同一個種子：<b>' + D.BACKGROUNDS[w.bg].name + '</b>、' + D.SEASONS[w.season].name + '、外星評級 ' + w.stake + '、標準模式 60 天。</p>'
          + '<p class="mute">' + (rec ? '你本週的最佳成績：第 ' + rec.day + ' 天・' + rec.stages + ' 關。' : '本週第一次完成可以得到一張外星扭蛋券。') + '</p>'
          + '<div class="btn-row"><button class="btn primary" type="button" data-do="go">開始</button><button class="btn" type="button" data-do="close">返回</button></div></div>', {
          go() { UI.closeModal(); newGame(w.bg, w.season, { seed: w.seed, stake: w.stake, weekly: { key: w.key, mod: w.mod }, mode: 'standard' }); },
          close() { UI.closeModal(); },
        }, { dismiss: () => {} });
      },
      daily() {
        A.init(); store.del(KEY_RUN);
        const d = IE.Meta.daily(IE.Meta.dateKey());
        UI.modal('<div class="modal"><span class="eyebrow">每日挑戰・' + d.key + '</span><h2>今天的人才篩選</h2><p>今天所有人都用同一個種子：<b>' + D.BACKGROUNDS[d.bg].name + '</b>、' + D.SEASONS[d.season].name + '、外星評級 ' + d.stake + '。分數按存活天數與通過的關卡計算，只記錄你今天的最佳成績。</p>'
          + '<div class="btn-row"><button class="btn primary" type="button" data-do="go">開始</button><button class="btn" type="button" data-do="close">返回</button></div></div>', {
          go() { UI.closeModal(); newGame(d.bg, d.season, { seed: d.seed, stake: d.stake, daily: d.key, mode: 'standard' }); },
          close() { UI.closeModal(); },
        }, { dismiss: () => {} });
      },
    });
  }
  // 人才扭蛋機
  function openGacha(after) {
    const render = (result, spinning, type) => UI.modal(UI.gachaModal(Game.meta, result, spinning, type), {
      pull(el) {
        const type = el.dataset.id || 'silver';
        const res = IE.Roster.pull(Game.meta, null, type);
        if (!res) return;
        store.set(KEY_META, Game.meta);
        A.sfx('beam');
        render(null, true, type);
        setTimeout(() => {
          if (res.type === 'char') {
            A.sfx(res.rarity === 'UR' ? 'combo' : 'pickup');
            if (res.rarity === 'UR' && IE.Audio.fx) IE.Audio.fx('legend');
            Game.setup.bg = res.id;
          } else A.sfx(res.id === 'refund' || res.id === 'antique' || res.id === 'tool' || res.id === 'refundGold' ? 'coin' : 'wrong');
          render(res, false, type);
        }, res.type === 'char' && res.rarity === 'UR' ? 2400 : 1400);
      },
      close() { UI.closeModal(); if (after) after(); },
    }, { dismiss: () => { if (after) after(); } });
    render(null, false);
  }
  function showSetup() {
    if (!IE.Roster.unlocked(Game.meta, Game.setup.bg)) Game.setup.bg = 'copywriter';
    const render = () => UI.setPanel(UI.setupPanel(Game.setup, Game.meta), {
      bg(el) {
        Game.setup.bg = el.dataset.id; Game.setup.stake = IE.Meta.stakeMax(Game.meta, el.dataset.id); render();
        // 手機：選了角色就捲到角色資料
        if (window.innerWidth <= 820) { const d = document.querySelector('.su-detail'); if (d) d.scrollIntoView({ behavior: IE.Pixel.reducedMotion ? 'auto' : 'smooth', block: 'start' }); }
      },
      stake(el) { Game.setup.stake = Number(el.dataset.id); render(); },
      season(el) { Game.setup.season = el.dataset.id; render(); },
      mode(el) { Game.setup.mode = el.dataset.id; render(); },
      back() { showTitle(); },
      gacha() { openGacha(render); },
      start() { if (IE.Roster.unlocked(Game.meta, Game.setup.bg)) newGame(Game.setup.bg, Game.setup.season, { stake: Math.min(Game.setup.stake || 1, IE.Meta.stakeMax(Game.meta, Game.setup.bg)), mode: Game.setup.mode || 'standard' }); },
    });
    render();
    window.scrollTo({ top: 0 });
  }
  function newGame(bg, season, o) {
    A.init();
    o = o || {};
    Game.state = R.newRun({ bg, season, meta: Game.meta, seed: o.seed, stake: o.stake || 1, daily: o.daily || null, weekly: o.weekly || null, mode: o.mode || 'standard' });
    Game.ticketShown = 0;
    if ((Game.meta.nextStart && Game.meta.nextStart.length) || Game.meta.nextTools) { Game.meta.nextStart = []; Game.meta.nextTools = 0; store.set(KEY_META, Game.meta); }
    S.City.enter('hub');
    save();
    startDay();
  }
  function resumeRun() {
    const s = Game.state;
    Game.ticketShown = (s.ticketLog || []).length;
    setScene(viewScene(currentView()));
    if (s.session) { UI.renderHud(s); openCraft(); return; }
    if (s.slot === 0 && (!s.morning || s.morning.day !== s.day)) startDay();
    else showHub();
  }

  // ---------- 一天 ----------
  // 計時：只計遊戲畫面在前景的時間（用來量度一局實際玩了多久）
  setInterval(() => { const s = Game.state; if (s && !s.ended && document.visibilityState === 'visible') s.playMs = (s.playMs || 0) + 1000; }, 1000);
  function startDay() {
    const s = Game.state;
    S.City.forceNight = false;
    const m = R.morning(s);
    // 灰人逃兵被追捕的日子：白天要躲起來
    if (R.hiding(s) && s.slot === 0) { s.slot = 1; UI.toast('追捕隊來了。你躲了一整個早上。', 'bad'); }
    IE.Maps.actions = R.actions(s);
    setScene(viewScene(currentView()));
    renderViews(true);
    UI.renderHud(s);
    UI.setPanel('<p class="mute">早上。你的手機震了幾下。</p>');
    save();
    openPhone(true);
    dayCard(s);
    if (s.day === R.reviewDay(s)) UI.toast('今晚是篩選日。累積訊號必須超過 ' + UI.fmt(R.threshold(s)) + '。', 'bad');
    else if (m.astar) UI.toast('阿星傳來了訊息。');
  }
  // 每天開始：全畫面的日期字幕
  function dayCard(s) {
    const el = document.createElement('div');
    const toReview = R.reviewDay(s) - s.day;
    el.className = 'day-card' + (toReview === 0 ? ' review' : '');
    el.innerHTML = '<span class="px">DAY</span><b>' + s.day + '</b><small>' + D.SEASONS[s.season].name + '・' + (toReview === 0 ? '今晚是篩選日' : '篩選日在 ' + toReview + ' 天後')
      + (s.trip ? '・你在' + D.DEST[s.trip.dest].name : '') + '</small>';
    stage().appendChild(el);
    setTimeout(() => el.remove(), 2200);
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
        store() { openStore('life', render); },
        close() { UI.closeModal(); if (morning) morningDilemma(); else showHub(); },
      }, morning ? null : { dismiss: () => showHub() });
    };
    render();
  }
  // 浮城百貨：分類貨架（疊在手機或地圖上面）
  function openStore(cat, after) {
    const s = Game.state;
    let cur = cat || 'life';
    const render = () => UI.pushModal(UI.storeModal(s, cur), {
      tab(el) { cur = el.dataset.id; UI.closeModal(); render(); },
      buy(el) {
        const r = R.buy(s, el.dataset.id);
        UI.toast(r.msg, r.ok ? 'good' : 'bad');
        if (r.ok) A.sfx('coin');
        UI.renderHud(s); A.setSpark(s.spark); save(); UI.closeModal(); render();
      },
      close() { UI.closeModal(); if (after) after(); else showHub(); },
    }, { dismiss: () => { if (after) after(); else showHub(); } });
    render();
  }
  function openSouvenir() {
    const s = Game.state;
    if (!s.trip) return;
    const render = () => UI.modal(UI.souvenirModal(s), {
      buy(el) { const r = IE.World.buySouvenir(s, el.dataset.id); UI.toast(r.msg, r.ok ? 'good' : 'bad'); if (r.ok) A.sfx('coin'); UI.renderHud(s); save(); render(); },
      close() { UI.closeModal(); showHub(); },
    }, { dismiss: () => showHub() });
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
    const acts = R.actions(s);
    IE.Maps.actions = acts;
    setScene(viewScene(currentView()));
    renderViews(true);
    UI.renderHud(s);
    A.setMode('city');
    A.setSpark(s.spark);
    UI.setPanel(UI.actionsPanel(s, acts), {
      act(el) { doAction(el.dataset.id); },
      auto(el) { doAction('auto:' + el.dataset.id); },
      rewindday() {
        if (!R.rewindDay(s)) return;
        A.sfx('beam');
        UI.toast('倒帶：你回到了今天早上。', 'good');
        startDay();
      },
      objs() { openObjects(); },
      souvenir() { openSouvenir(); },
      store() { openStore('life'); },
    });
    ticketToasts();
    save();
  }
  // 一局之中賺到扭蛋券：彈出提示
  function ticketToasts() {
    const s = Game.state, log = (s && s.ticketLog) || [];
    Game.ticketShown = Game.ticketShown || 0;
    while (Game.ticketShown < log.length) {
      const t = log[Game.ticketShown++];
      UI.toast(t.why + '：' + R.TICKET_NAME[t.type] + ' +' + t.n, 'good');
      A.sfx('coin');
    }
  }

  function doAction(id) {
    const s = Game.state;
    switch (id) {
      case 'label': case 'ot': case 'smile': case 'dive': case 'delivery': case 'farm': case 'busk': case 'clinic':
      case 'garden': case 'salvage': case 'haggle':
        return startMicro(id);
      case 'rest':
        return afterAction(R.applyRest(s));
      case 'nightshift':
        return afterAction(R.applyNightShift(s));
      case 'volunteer':
        return afterAction(R.applyVolunteer(s));
      case 'chat':
        return UI.setPanel(UI.chatPanel(s), {
          npc(el) { afterAction(R.applyChat(s, el.dataset.id)); },
          back() { showHub(); },
        });
      case 'create': case 'allnighter':
        IE.Create.start(s, id === 'allnighter' ? 'allnighter' : 'normal');
        save();
        return openCraft();
      case 'tripback':
        Game.view = 'room';
        return afterAction(IE.World.leaveTrip(s));
    }
    if (id.startsWith('site:')) return afterAction(IE.World.applySite(s, id.slice(5)));
    // 照舊做：熟手自動完成小遊戲
    if (id.startsWith('auto:')) { const rep = IE.Auto.apply(s, id.slice(5)); if (rep) { A.sfx('click'); afterAction(rep); } }
  }
  // 地圖上的熱點
  IE.Maps.onPick = function (view, sp) {
    const s = Game.state;
    if (!s || s.ended || Game.micro || UI.modalOpen() || IE.Craft.isOpen() || Game.scene !== viewScene(currentView())) return;
    if (view === 'room') {
      switch (sp.id) {
        case 'map': return setView('map');
        case 'city': return setView('city');
        case 'create': return sp.off ? UI.toast(sp.sub || '現在不能創作', 'bad') : doAction('create');
        case 'rest': return confirmAct('rest', s.floor ? '你的家' : '天橋底');
        case 'objects': return openObjects();
        case 'works': return openGallery();
        case 'phone': return openPhone(false);
        case 'decor': return openDecor();
        case 'stats': return UI.pushModal(UI.statsModal(s), { close: UI.closeModal }, { dismiss: () => {} });
        case 'gear': return openStore('safe');
      }
    }
    if (view === 'map') {
      const p = sp.place;
      if (p.ui === 'room') return setView('room');
      if (p.ui === 'world') return setView('world');
      if (p.ui === 'antique') return openAntique();
      if (p.ui === 'gallery') return openGallery();
      if (p.ui === 'store') return openStore('life');
      return confirmAct(p.act, p.name);
    }
    if (view === 'world') { if (sp.id !== 'home') openDest(sp.id); return; }
    if (view === 'trip') return sp.id === 'souvenir' ? openSouvenir() : confirmAct(sp.id, D.DEST[s.trip.dest].name);
  };
  // 先看清楚代價才出發
  function confirmAct(id, where) {
    const s = Game.state;
    const a = R.actions(s).find((x) => x.id === id);
    if (!a) { UI.toast(R.isNight(s) ? '晚上這裡已經關門' : '現在不能這樣做', 'bad'); return; }
    UI.modal(UI.placeModal(where, a), {
      go() { UI.closeModal(); doAction(id); if (id === 'chat') document.getElementById('panel').scrollIntoView({ behavior: 'smooth', block: 'start' }); },
      close() { UI.closeModal(); },
    }, { dismiss: () => {} });
  }
  function openDest(id) {
    const s = Game.state;
    const info = IE.World.destInfo(s, id, Game.meta);
    UI.modal(UI.destModal(info, s), {
      go(el) {
        const r = IE.World.startTrip(s, id, el.dataset.fare);
        if (!r.ok) { UI.toast(r.msg, 'bad'); return; }
        UI.closeModal();
        A.sfx('beam');
        Game.view = 'trip';
        afterAction(r.rep);
      },
      close() { UI.closeModal(); },
    }, { dismiss: () => {} });
  }
  // 天空區畫廊：委託與賣畫
  function openGallery() {
    const s = Game.state;
    const render = () => UI.modal(UI.galleryModal(s), {
      sell(el) {
        const r = IE.World.sellWork(s, Number(el.dataset.i));
        UI.toast(r.msg, r.ok ? 'good' : 'bad');
        if (r.ok) A.sfx('coin');
        UI.renderHud(s); save(); render();
      },
      close() { UI.closeModal(); showHub(); },
    }, { dismiss: () => showHub() });
    render();
  }
  function openAntique() {
    const s = Game.state;
    const render = () => UI.modal(UI.antiqueModal(s), {
      buy(el) { const r = IE.World.buyAntique(s, el.dataset.id); UI.toast(r.msg, r.ok ? 'good' : 'bad'); if (r.ok) A.sfx('coin'); UI.renderHud(s); save(); render(); },
      sellcard(el) { const r = IE.World.sellCard(s, Number(el.dataset.uid)); UI.toast(r.msg, r.ok ? 'good' : 'bad'); if (r.ok) A.sfx('coin'); UI.renderHud(s); save(); render(); },
      close() { UI.closeModal(); showHub(); },
    }, { dismiss: () => showHub() });
    render();
  }
  function openDecor() {
    const s = Game.state;
    const render = () => UI.modal(UI.decorModal(s), {
      buy(el) { const r = IE.World.buyDecor(s, el.dataset.id); UI.toast(r.msg, r.ok ? 'good' : 'bad'); if (r.ok) A.sfx('pickup'); UI.renderHud(s); save(); render(); },
      close() { UI.closeModal(); showHub(); },
    }, { dismiss: () => showHub() });
    render();
  }
  function openCraft() {
    const s = Game.state;
    IE.Craft.open(s, (res) => {
      UI.renderHud(s); A.setSpark(s.spark); save();
      if (!res) { showHub(); return; }
      afterSlot();
    });
  }
  // 靈感物件：裝備、卸下、排列（碎鏡會複製右邊的物件）、賣給天空區
  function openObjects() {
    const s = Game.state;
    const render = () => UI.pushModal(UI.objectsModal(s), {
      equip(el) { R.equipObject(s, el.dataset.id); UI.closeModal(); render(); save(); },
      unequip(el) { R.unequipObject(s, el.dataset.id); UI.closeModal(); render(); save(); },
      left(el) { R.moveObject(s, el.dataset.id, -1); UI.closeModal(); render(); save(); },
      right(el) { R.moveObject(s, el.dataset.id, 1); UI.closeModal(); render(); save(); },
      sell(el) { const p = R.sellObject(s, el.dataset.id); UI.toast('賣給天空區收藏家：+$' + p, 'good'); A.sfx('coin'); UI.closeModal(); render(); UI.renderHud(s); save(); },
      close() { UI.closeModal(); showHub(); },
    }, { dismiss: () => showHub() });
    render();
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
    renderViews(false);
    document.querySelectorAll('.day-card').forEach((el) => el.remove());
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
    const rep = kind === 'interview' ? R.applyInterview(s, result.answers) : R.applyMicro(s, kind, result);
    // 親手玩出的最高評級立即記入局外紀錄（之後可以「照舊做」）
    if (s.microBest) { Game.meta.microBest = Object.assign(Game.meta.microBest || {}, s.microBest); store.set(KEY_META, Game.meta); }
    setScene(viewScene(currentView()));
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
    if (s.body <= 0 && R.lastStand(s, null)) UI.toast('急救：你本來會倒下，但你替自己做了急救。', 'good');
    if (s.body <= 0) return finishRun(R.endingFor(s, 'death'));
    // 外賣潛水員「趕單」：留在同一個時段
    if (R.slotFree(s)) return showHub();
    if (R.isNight(s)) return endOfDay();
    s.slot++;
    showHub();
  }

  // ---------- 晚上 ----------
  function endOfDay() {
    const s = Game.state;
    // 狀態列停留在今晚，結算完才切換到明天
    UI.renderHud(s);
    renderViews(false);
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
          else if (rep.interview) dreamInterview();
          else startDay();
        },
      });
    }, heavy);
  }

  // ---------- 夢境面試（篩選日前兩晚） ----------
  function dreamInterview() {
    const s = Game.state;
    R.interviewQuestions(s);
    save();
    UI.setPanel('<p class="mute">你睡著了。</p>');
    UI.modal('<div class="modal dilemma"><span class="eyebrow">深夜・夢境</span><p class="d-text">你夢見有人敲門。門外是一張很長的辦公桌，桌後坐著一個沒有臉的面試官。</p>'
      + '<p class="mute">「請坐。這只是一個非正式的對話。」</p><div class="btn-row"><button class="btn primary" type="button" data-do="ok">坐下</button></div></div>', {
      ok() {
        UI.closeModal();
        startMicro('interview', (res) => {
          const rep = R.applyInterview(s, res.answers);
          setScene(S.City);
          UI.renderHud(s); A.setMode('city'); save();
          UI.modal(UI.reportModal(rep, '醒來'), { ok() { UI.closeModal(); startDay(); } });
        });
      },
    });
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
    renderViews(false);
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
    const dossier = IE.Dossier.evaluate(s, kind);
    Game.meta = R.recordMeta(Game.meta, s, kind, dossier);
    store.set(KEY_META, Game.meta);
    store.del(KEY_RUN);
    S.City.forceNight = true;
    renderViews(false);
    setScene(S.City);
    A.setMode(kind === 'agent' ? 'alien' : 'city');
    A.setSpark(kind === 'grey' ? 0 : s.spark);
    UI.renderHud(s);
    UI.setPanel('<div class="btn-row"><button class="btn primary" type="button" data-do="again">再玩一局</button><button class="btn" type="button" data-do="title">返回標題</button></div>',
      { again: () => { UI.closeModal(); showSetup(); }, title: () => showTitle() });
    UI.modal(UI.dossierModal(ending, s, dossier, Game.meta), {
      copy() {
        const text = UI.dossierText(ending, s, dossier);
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
      if (IE.Craft.isOpen()) {
        if (UI.modalOpen()) return;
        if (e.key === 'Enter' || e.key === 'Backspace' || e.key === ' ') e.preventDefault();
        if (!e.repeat) IE.Craft.key(e.key);
        return;
      }
      const sc = Game.scene;
      if (sc && sc.key && sc !== S.City) {
        if (KEYS.includes(e.key)) e.preventDefault();
        if (!e.repeat) sc.key(e.key, true);
        return;
      }
      if (UI.modalOpen()) return;
      if (/^[0-9]$/.test(e.key)) {
        const btns = document.querySelectorAll('#panel .act');
        const b = btns[(Number(e.key) + 9) % 10];
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
      else if (b.dataset.hud === 'help') UI.pushModal(UI.helpModal(), { close: UI.closeModal }, { dismiss: () => {} });
      else if (b.dataset.hud === 'stats' && !Game.micro) UI.pushModal(UI.statsModal(Game.state), { close: UI.closeModal }, { dismiss: () => {} });
      else if (b.dataset.hud === 'phone' && !Game.micro && !Game.state.ended && !UI.modalOpen()) openPhone(false);
    });
    document.getElementById('views').addEventListener('click', (e) => {
      const b = e.target.closest('[data-view]');
      if (!b || !Game.state || UI.modalOpen() || Game.micro || IE.Craft.isOpen()) return;
      A.sfx('click');
      setView(b.dataset.view);
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
    if (data && data.run && !data.run.ended && data.run.v === 9) { Game.state = data.run; S.City.enter('hub'); resumeRun(); }
    else showTitle();
  }
  const hot = window.claude && window.claude.hot;
  try { if (hot && hot.snapshot) hot.snapshot(() => ({ run: Game.state && !Game.state.ended && !Game.micro ? Game.state : null })); } catch (e) { /* 不支援就略過 */ }
  if (hot && hot.ready) hot.ready(boot); else boot((hot && hot.data) || {});

  window.__IE = IE; // 方便測試
})(window.IE = window.IE || {});
