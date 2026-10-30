// 背景音樂（BGM）：按畫面與情況播放錄好的音樂檔（game/audio/），取代合成的背景音樂；音效仍然由 audio.js 合成。
// 小遊戲期間暫停 BGM，讓小遊戲自己的節拍音樂（例如街頭表演）接手。
// 每首音樂第一次用到時才下載；切換時淡入淡出，回到同一首時由上次停下的位置繼續。
(function (IE) {
  'use strict';
  const TRACKS = {
    cartridge: { file: 'audio/cosmic-cartridge.mp3', name: 'Cosmic Cartridge', desc: '標題畫面與浮城白天的日常' },
    orbit: { file: 'audio/pixel-orbit.mp3', name: 'Pixel Orbit', desc: '浮城的晚上；翻看收藏和對局紀錄' },
    plaza: { file: 'audio/pixel-plaza.mp3', name: 'Pixel Plaza', desc: '整備：選角、浮城百貨、市集、古董、畫廊、物件' },
    acid: { file: 'audio/acid-arcade.mp3', name: 'Acid Arcade', desc: '創作之夜（速寫與平常的創作）' },
    funk: { file: 'audio/pixel-funk.mp3', name: 'Pixel Funk', desc: '社區小展、畫廊聯展與通宵創作', restart: true },
    overdrive: { file: 'audio/subspace-overdrive.mp3', name: 'Subspace Overdrive', desc: '外星評審之夜（頭目戰）', restart: true },
    bounce: { file: 'audio/cosmic-bounce.mp3', name: 'Cosmic Bounce', desc: '創作途中打出傳說組合、達到關卡目標或刷新紀錄之後', restart: true },
    drift: { file: 'audio/cosmic-drift.mp3', name: 'Cosmic Drift', desc: '人才扭蛋機與結局' },
    phantom: { file: 'audio/phantom-cartridge.mp3', name: 'Phantom Cartridge', desc: '夢境面試與道德抉擇' },
    pulse: { file: 'audio/stellar-pulse.mp3', name: 'Stellar Pulse', desc: '舊城潛水與世界地圖' },
    fractal: { file: 'audio/fractal-groove.mp3', name: 'Fractal Groove', desc: '沒有固定節拍的工作小遊戲（標註、診所、外送、內容農場、拆樓、夜市）' },
    promenade: { file: 'audio/pixel-promenade.mp3', name: 'Pixel Promenade', desc: '篩選日入選、被選中，以及旅途中的日子' },
    astral: { file: 'audio/astral-pulse.mp3', name: 'Astral Pulse', desc: '最後一期的浮城（殘局）', restart: true },
  };
  // 情況 → 音樂（null：交給合成音樂，例如有自己節拍的小遊戲）
  const SCENES = {
    title: 'cartridge', city: 'cartridge', night: 'orbit', archive: 'orbit', cozy: 'orbit', endgame: 'astral', setup: 'plaza', shop: 'plaza',
    create: 'acid', stage: 'funk', boss: 'overdrive', frenzy: 'bounce', gacha: 'drift', ending: 'drift', victory: 'promenade',
    dream: 'phantom', dilemma: 'phantom', deep: 'pulse', world: 'pulse', travel: 'promenade', work: 'fractal', none: null,
  };
  const VOL = 0.5, FADE = 900;
  const KEY = 'ie2080.bgm';
  const els = {};
  const failed = {};
  let enabled = true, scene = null, cur = null, unlocked = false, fadeTimer = null;
  try { enabled = localStorage.getItem(KEY) !== 'off'; } catch (e) { /* 私隱模式 */ }

  const audio = () => IE.Audio;
  const muted = () => !!(audio() && audio().muted);
  function el(id) {
    if (els[id]) return els[id];
    const a = new Audio();
    a.preload = 'none'; a.loop = true; a.volume = 0;
    // 單一 HTML 版本（dist/）從 ../game/audio/ 讀取
    a.src = (window.IE_AUDIO_BASE || '') + TRACKS[id].file;
    a.addEventListener('error', () => { failed[id] = true; if (cur === id) syncSynth(); });
    els[id] = a;
    return a;
  }
  // 合成的背景音樂只在沒有 BGM 時出現
  function syncSynth() {
    const A = audio();
    if (!A || !A.music) return;
    A.music(!(enabled && cur && !failed[cur]));
  }
  function fade(a, to, done) {
    const from = a.volume, t0 = Date.now(), dur = IE.Pixel && IE.Pixel.reducedMotion ? 200 : FADE;
    const tick = () => {
      const k = Math.min(1, (Date.now() - t0) / dur);
      try { a.volume = Math.max(0, Math.min(1, from + (to - from) * k)); } catch (e) { /* iOS 不能調音量 */ }
      if (k < 1) a._fade = setTimeout(tick, 40); else if (done) done();
    };
    clearTimeout(a._fade);
    tick();
  }
  function stopOthers(keep) {
    Object.keys(els).forEach((id) => {
      if (id === keep) return;
      const a = els[id];
      if (!a.paused) fade(a, 0, () => a.pause());
    });
  }
  function start(id) {
    const a = el(id);
    if (TRACKS[id].restart && cur !== id) { try { a.currentTime = 0; } catch (e) { /* 還未載入 */ } }
    a.muted = muted();
    const p = a.play();
    if (p && p.catch) p.catch(() => { /* 還沒有使用者操作：等第一下點擊 */ });
    fade(a, VOL);
  }
  // 切換情況
  function play(sc) {
    scene = sc;
    const id = enabled && !document.hidden ? SCENES[sc] : null;
    if (id === cur && (!id || !els[id] || !els[id].paused)) { syncSynth(); return; }
    cur = id;
    stopOthers(id);
    if (id && !failed[id]) start(id);
    syncSynth();
  }
  // 音樂開關（音效不受影響）
  function setEnabled(on) {
    enabled = on;
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* 私隱模式 */ }
    cur = null;
    play(scene || 'title');
  }
  // 靜音：跟隨 audio.js 的靜音
  function syncMute() { Object.keys(els).forEach((id) => { els[id].muted = muted(); }); }
  // 瀏覽器要求先有使用者操作才可以播放
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    const id = cur;
    cur = null;
    if (scene) play(scene); else if (id) play('title');
  }
  if (typeof document !== 'undefined') {
    ['pointerdown', 'keydown', 'touchend'].forEach((ev) => document.addEventListener(ev, unlock, { once: true, capture: true }));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { Object.keys(els).forEach((id) => els[id].pause()); }
      else if (scene) { cur = null; play(scene); }
    });
  }

  IE.BGM = {
    TRACKS, SCENES, play, setEnabled, syncMute,
    get enabled() { return enabled; },
    get current() { return cur; },
    get scene() { return scene; },
    // 測試用：正在播放和載入失敗的音樂
    get playing() { return Object.keys(els).filter((id) => !els[id].paused); },
    get failed() { return Object.keys(failed); },
  };
})(window.IE = window.IE || {});
