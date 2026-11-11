// 浮城夜景與創作桌畫布（WO-16-08 / WO-16-10）：用 game/art/ 的 WebP 素材與預先算好的 .glow.webp 即時組畫。
// 純函數 plan(s)、strokePlan(s, n, res)、replayPlan(rec) 不碰 DOM，可在 Node 直接測試。
(function (root) {
  'use strict';
  const IE = root.IE = root.IE || {};
  const W = 960, H = 600, HORIZON = 340, WATER_TOP = 412;
  const STAGE_FLOOD = { dry: 0, warn: 0.35, light: 0.6, medium: 0.8, heavy: 1 };
  const SEASON_MOOD = { storm: 'water', acid: 'machine', cold: 'memory' };
  const FAR_MAP = {
    warmth: 'old', hunger: 'old', neon: 'neon', anger: 'neon',
    machine: 'industry', rebel: 'industry', hope: 'sky',
    memory: 'drowned', water: 'drowned', guilt: 'ruin',
  };
  const FRONT_MAP = {
    warmth: 'lanterns', hope: 'leaves', water: 'rainglass', memory: 'window',
    rebel: 'cables', machine: 'cables', guilt: 'window', anger: 'curtain',
    neon: 'neonframe', hunger: 'laundry',
  };

  function hash(str) {
    const s = String(str || '');
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pickDistinct(rng, pool, count) {
    const arr = pool.slice();
    const out = [];
    const n = Math.min(count, arr.length);
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(rng() * arr.length) % arr.length;
      out.push(arr.splice(idx, 1)[0]);
    }
    return out;
  }

  function artManifest() {
    return (IE.DATA && IE.DATA.ART && IE.DATA.ART.a) ? IE.DATA.ART : null;
  }

  function base() {
    const prefix = (typeof window !== 'undefined' && window.IE_ART_BASE) ? window.IE_ART_BASE : '';
    return prefix + 'art/';
  }

  function roundOfState(s) {
    if (!s) return 1;
    if (s.round != null) return Number(s.round) || 1;
    if (IE.Rounds && typeof IE.Rounds.roundOf === 'function') return IE.Rounds.roundOf(s);
    return Math.max(1, Math.ceil((s.night || 1) / 3));
  }

  function stageOfState(s) {
    if (!s) return 'dry';
    if (typeof s.stage === 'string' && STAGE_FLOOD[s.stage] != null) return s.stage;
    if (typeof s.flood === 'string' && STAGE_FLOOD[s.flood] != null) return s.flood;
    if (IE.Flood && typeof IE.Flood.stage === 'function') return IE.Flood.stage(s);
    return 'dry';
  }

  function weatherOfState(s) {
    if (!s || s.trip || !s.weather) return null;
    const wb = (IE.DATA && IE.DATA.WEATHER_BY) || {};
    if (typeof s.weather === 'string') return wb[s.weather] || null;
    if (typeof s.weather === 'object') {
      if (s.weather.day != null && s.day != null && s.weather.day !== s.day) return null;
      if (s.weather.vis || s.weather.tag) return s.weather;
      if (s.weather.id && wb[s.weather.id]) return wb[s.weather.id];
      return s.weather;
    }
    return null;
  }

  // 純函數：由局面算出白天與夜晚共用的浮城景觀設定
  function plan(s) {
    const M = artManifest();
    if (!s || !M) return null;
    const A = M.a;
    const round = roundOfState(s);
    const seed = hash(String(s.seed == null ? 1 : s.seed) + '#r' + String(round)) || 1;
    const stage = stageOfState(s);
    const flood = STAGE_FLOOD[stage] != null ? STAGE_FLOOD[stage] : 0;
    const cold = s.season === 'cold';
    const w = weatherOfState(s);
    const vis = (w && w.vis) || '';
    const mood = (w && w.tag && w.tag.t) || SEASON_MOOD[s.season] || 'neon';
    const skyN = (vis === 'storm' || vis === 'typhoon') ? 2 : 1;
    const skyKey = 'np-sky-' + mood + '-' + skyN;
    const sky = A[skyKey] ? skyKey : (A['np-sky-neon-' + skyN] ? 'np-sky-neon-' + skyN : Object.keys(A).find((k) => k.indexOf('np-sky-') === 0));
    const rain = !cold && (vis === 'drizzle' || vis === 'storm' || vis === 'typhoon');

    const rng = mulberry32(seed);
    const farPool = Object.keys(A).filter((k) => /^np-far-/.test(k)).sort();
    let far;
    if ((stage === 'medium' || stage === 'heavy') && A['np-far-drowned']) {
      far = ['np-far-drowned'].concat(pickDistinct(rng, farPool.filter((k) => k !== 'np-far-drowned'), 1));
    } else {
      far = pickDistinct(rng, farPool, 2);
    }
    const midPool = Object.keys(A).filter((k) => /^np-mid-/.test(k)).sort();
    const mids = pickDistinct(rng, midPool, 3);
    const pierPool = Object.keys(A).filter((k) => /^np-stage-pier-/.test(k)).sort();
    const pier = pickDistinct(rng, pierPool, 1)[0] || 'np-stage-pier-1';
    const frontPool = Object.keys(A).filter((k) => /^np-front-/.test(k) && k !== 'np-front-frame-gold').sort();
    const front = pickDistinct(rng, frontPool, 1)[0] || 'np-front-neonframe';

    return { seed, sky, far, mids, pier, front, flood, cold, rain, stage };
  }

  function isZ(r) {
    return r === 'zhuan' || r === 'zhuanhe';
  }

  function pick3(len, roles) {
    if (len <= 3) {
      const a = [];
      for (let i = 0; i < len; i++) a.push(i);
      return a;
    }
    let z = Array.isArray(roles) ? roles.findIndex(isZ) : -1;
    if (z < 0) z = len >> 1;
    const set = [0, Math.min(Math.max(z, 1), len - 2), len - 1];
    const uniq = [];
    for (let i = 0; i < set.length; i++) {
      if (uniq.indexOf(set[i]) < 0) uniq.push(set[i]);
    }
    return uniq.sort((a, b) => a - b);
  }

  function resolveRunCards(s, res) {
    if (!res) return [];
    const byUid = {};
    if (s && Array.isArray(s.cards)) {
      for (let i = 0; i < s.cards.length; i++) {
        const c = s.cards[i];
        if (c && c.uid != null) byUid[c.uid] = c;
      }
    }
    if (Array.isArray(res.run) && res.run.length) {
      return res.run.map((x) => (x && typeof x === 'object' ? x : byUid[x])).filter(Boolean);
    }
    if (Array.isArray(res.cards) && res.cards.length) {
      if (Array.isArray(res.scoring) && res.scoring.length) {
        const sub = res.scoring.map((u) => res.cards.find((c) => c && c.uid === u) || byUid[u]).filter(Boolean);
        if (sub.length) return sub;
      }
      return res.cards.filter(Boolean);
    }
    if (Array.isArray(res.scoring) && res.scoring.length) {
      return res.scoring.map((u) => byUid[u]).filter(Boolean);
    }
    return [];
  }

  function resolveMoodTag(c) {
    if (!c || !Array.isArray(c.tags) || !c.tags.length) return 'neon';
    const D = IE.DATA || {};
    const wheel = D.WHEEL || [];
    for (let i = 0; i < c.tags.length; i++) {
      if (wheel.indexOf(c.tags[i]) >= 0) return c.tags[i];
    }
    const artTag = (D.DESK && D.DESK.artTag) || {};
    for (let i = 0; i < c.tags.length; i++) {
      if (artTag[c.tags[i]]) return artTag[c.tags[i]];
    }
    return 'neon';
  }

  function resolveStrokeMeta(s, res) {
    const runCards = resolveRunCards(s, res);
    let A = null;
    if (IE.Desk && runCards.length && (!res.roles || !res.subject || !res.form)) {
      A = IE.Desk.analyze(runCards);
    }
    const roles = Array.isArray(res.roles)
      ? res.roles
      : (A && IE.Desk ? IE.Desk.roles(A) : runCards.map((_, i) => (i === 0 ? 'qi' : 'cheng')));
    const subject = res.subject || (runCards.length && IE.Desk ? IE.Desk.subjectOf(runCards) : null);
    const main0 = (subject && subject.main) || res.main || resolveMoodTag(runCards[0]);
    const second = (subject && subject.second) || res.second || main0;
    const form = res.form || res.id || (A && A.id) || 'single';
    const he = res.he != null ? !!res.he : !!(A && A.he);
    return { runCards, roles, subject, main0, second, form, he };
  }

  function countTonightFulls(s, n, res, form) {
    if (res && typeof res.fulls === 'number') return res.fulls;
    const thisFull = form === 'full' ? 1 : 0;
    if (s && s.session && Array.isArray(s.session.log)) {
      const prior = s.session.log.slice(0, Math.max(0, n));
      const priorFulls = prior.filter((x) => x && (x.form === 'full' || x.id === 'full')).length;
      return priorFulls + thisFull;
    }
    if (s && Array.isArray(s.strokes)) {
      const prior = s.strokes.slice(0, Math.max(0, n));
      const priorFulls = prior.filter((x) => x && (x.form === 'full' || x.id === 'full')).length;
      return priorFulls + thisFull;
    }
    if (s && typeof s.fulls === 'number') return s.fulls + thisFull;
    return thisFull;
  }

  function pickValid(A, key, fallbackPrefix) {
    if (key && A[key]) return key;
    const found = Object.keys(A).find((k) => k.indexOf(fallbackPrefix) === 0);
    return found || null;
  }

  // 純函數：決定創作之夜第 n 筆（0..3）畫上哪些素材名稱
  function strokePlan(s, n, res) {
    const M = artManifest();
    if (!M || !res) return [];
    const A = M.a;
    const ring = Math.max(0, Math.min(3, Number(n) || 0));
    const meta = resolveStrokeMeta(s, res);
    const { runCards, roles, main0, second, form } = meta;

    if (ring === 0) {
      const hasZ = roles.some(isZ) || !!(res.zc && res.zc > 0);
      const sky = pickValid(A, 'np-sky-' + main0 + '-' + (hasZ ? 2 : 1), 'np-sky-');
      const stage = stageOfState(s);
      const f1Key = (stage === 'medium' || stage === 'heavy')
        ? 'np-far-drowned'
        : ('np-far-' + (FAR_MAP[second] || 'neon'));
      const f2Key = 'np-far-' + (FAR_MAP[main0] || 'neon');
      const f1 = pickValid(A, f1Key, 'np-far-');
      const f2 = pickValid(A, f2Key, 'np-far-');
      return [sky, f1, f2].filter(Boolean);
    }

    if (ring === 1) {
      const idx = pick3(runCards.length, roles);
      const out = [];
      for (let i = 0; i < idx.length; i++) {
        const c = runCards[idx[i]];
        const art = (c && IE.Desk && IE.Desk.artOf) ? IE.Desk.artOf(c) : null;
        const m = pickValid(A, art && art.mid, 'np-mid-');
        if (m) out.push(m);
      }
      return out;
    }

    if (ring === 2) {
      const p = s ? plan(s) : null;
      const pierKey = (s && s.pier && A[s.pier])
        ? s.pier
        : ((p && p.pier) || ('np-stage-pier-' + ((((s && s.seed) || 1) >>> 0) % 3 + 1)));
      const pier = pickValid(A, pierKey, 'np-stage-pier-');
      const idx = pick3(runCards.length, roles);
      const out = pier ? [pier] : [];
      for (let i = 0; i < idx.length; i++) {
        const c = runCards[idx[i]];
        const art = (c && IE.Desk && IE.Desk.artOf) ? IE.Desk.artOf(c) : null;
        const face = pickValid(A, art && art.face, 'np-focal-');
        if (face) out.push(face);
      }
      return out;
    }

    const fulls = countTonightFulls(s, ring, res, form);
    if (fulls >= 3 && A['np-front-frame-gold']) {
      return ['np-front-frame-gold'];
    }
    const front = pickValid(A, 'np-front-' + (FRONT_MAP[main0] || 'neonframe'), 'np-front-');
    return front ? [front] : [];
  }

  // 把一筆結果壓成可存入 s.gallery[i].paint.strokes 的純資料（不存圖片）
  function recordStroke(s, n, res) {
    const meta = resolveStrokeMeta(s, res || {});
    return {
      n: Math.max(0, Math.min(3, Number(n) || 0)),
      form: meta.form,
      he: meta.he,
      main: meta.main0,
      second: meta.second,
      roles: meta.roles.slice(),
      cards: meta.runCards.map((c) => ({
        id: c.id,
        name: c.name || '',
        tags: Array.isArray(c.tags) ? c.tags.slice() : [],
      })),
    };
  }

  // 純函數：由 paint 記錄還原整幅畫的四層素材與配置（供測試與作品集重畫）
  function replayPlan(rec) {
    const M = artManifest();
    if (!M || !rec) return null;
    const strokes = Array.isArray(rec.strokes) ? rec.strokes : [];
    const pseudoState = {
      seed: rec.seed != null ? rec.seed : 1,
      round: rec.round != null ? rec.round : 1,
      stage: rec.stage || 'dry',
      season: rec.cold ? 'cold' : (rec.season || 'calm'),
      pier: rec.pier || null,
      strokes,
    };
    const basePlan = plan(pseudoState);
    const flood = rec.flood != null ? rec.flood : (basePlan ? basePlan.flood : 0);
    const cold = rec.cold != null ? !!rec.cold : !!(basePlan && basePlan.cold);
    const rain = rec.rain != null ? !!rec.rain : !!(basePlan && basePlan.rain);
    const pier = rec.pier || (basePlan && basePlan.pier) || 'np-stage-pier-1';
    pseudoState.pier = pier;

    const layers = [[], [], [], []];
    let fulls = 0;
    let lights = 0.4;
    for (let i = 0; i < strokes.length && i < 4; i++) {
      const st = strokes[i];
      if (!st) continue;
      if (st.form === 'full') fulls += 1;
      if (st.he) lights = Math.min(1, lights + 0.2);
      layers[i] = strokePlan(pseudoState, i, {
        run: st.cards || [],
        roles: st.roles,
        main: st.main,
        second: st.second,
        form: st.form,
        he: st.he,
        fulls: i === 3 ? fulls : undefined,
      });
    }
    return {
      seed: pseudoState.seed,
      pier,
      flood,
      cold,
      rain,
      fulls,
      gold: fulls >= 3,
      lights: Math.round(lights * 100) / 100,
      layers,
    };
  }

  // ---------- 瀏覽器端畫布與快取 ----------
  let cache = {};
  let cacheBase = '';
  const listeners = new Set();

  function mkCanvas(w, h) {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function notifyAssetLoad() {
    listeners.forEach((fn) => {
      try { fn(); } catch (e) { /* ignore */ }
    });
  }

  function asset(name) {
    if (!name || typeof Image === 'undefined') return { ok: false, err: true, p: Promise.resolve(null) };
    const b = base();
    if (b !== cacheBase) {
      cache = {};
      cacheBase = b;
    }
    if (cache[name]) return cache[name];
    const M = artManifest();
    const info = (M && M.a && M.a[name]) || null;
    if (!info) {
      const miss = { ok: false, err: true, p: Promise.resolve(null) };
      cache[name] = miss;
      return miss;
    }
    const o = {
      name,
      info,
      im: new Image(),
      ok: false,
      err: false,
      glowIm: null,
      glowOk: false,
      refl: null,
      band: null,
      p: null,
    };
    cache[name] = o;
    const mainP = new Promise((resolve) => {
      o.im.onload = () => {
        o.ok = true;
        notifyAssetLoad();
        resolve(o);
      };
      o.im.onerror = () => {
        o.err = true;
        notifyAssetLoad();
        resolve(o);
      };
    });
    o.im.src = b + name + '.webp';

    let glowP = Promise.resolve(o);
    if (info.g === 1) {
      o.glowIm = new Image();
      glowP = new Promise((resolve) => {
        o.glowIm.onload = () => {
          o.glowOk = true;
          notifyAssetLoad();
          resolve(o);
        };
        o.glowIm.onerror = () => {
          resolve(o);
        };
      });
      o.glowIm.src = b + name + '.glow.webp';
    }
    o.p = Promise.all([mainP, glowP]).then(() => o);
    return o;
  }

  function glowOf(o) {
    return (o && o.glowOk && o.glowIm) ? o.glowIm : null;
  }

  function reflOf(o) {
    if (!o || !o.ok) return null;
    if (o.refl) return o.refl;
    const w = o.im.width || o.info.w || 160;
    const h = o.im.height || o.info.h || 160;
    const c = mkCanvas(w, h);
    if (!c) return null;
    const g = c.getContext('2d');
    g.translate(0, h);
    g.scale(1, -1);
    g.drawImage(o.im, 0, 0, w, h);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(6,10,24,0.5)';
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-in';
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(0,0,0,0.7)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    o.refl = c;
    return c;
  }

  let vigCanvas = null;
  function vignette() {
    if (vigCanvas) return vigCanvas;
    vigCanvas = mkCanvas(W, H);
    if (!vigCanvas) return null;
    const q = vigCanvas.getContext('2d');
    const gr = q.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.72);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(1, 'rgba(0,0,0,0.42)');
    q.fillStyle = gr;
    q.fillRect(0, 0, W, H);
    return vigCanvas;
  }

  function reducedMotion() {
    if (IE.Pixel && IE.Pixel.reducedMotion) return true;
    if (typeof window !== 'undefined' && window.matchMedia) {
      try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch (e) { /* ignore */ }
    }
    return false;
  }

  function isCanvasVisible(cv) {
    if (!cv || typeof document === 'undefined') return false;
    if (document.hidden) return false;
    if (!cv.isConnected) return false;
    const r = cv.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const vh = window.innerHeight || 800;
    const vw = window.innerWidth || 1280;
    return r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
  }

  function createSceneState(seed, opts) {
    const o = opts || {};
    return {
      seed: (seed >>> 0) || 1,
      flood: Math.max(0, Math.min(1, Number(o.flood) || 0)),
      cold: !!o.cold,
      rain: !!o.rain,
      guide: o.guide !== false,
      sky: null,
      skyA: 0,
      far: [],
      mids: [],
      bays: [],
      pier: o.pier || ('np-stage-pier-' + (((seed >>> 0) || 1) % 3 + 1)),
      pierA: 0,
      front: null,
      frontA: 0,
      lights: 0.4,
      lightsTo: 0.4,
      fulls: 0,
      gold: false,
      snow: [],
      cracks: null,
      glints: [],
      drops: [],
      bolt: 0,
      nextBolt: 4,
      sparks: [],
      marks: [],
    };
  }

  function tileLayer(g, gg, name, y, h, a, glowAlpha) {
    const o = asset(name);
    if (!o.ok || a <= 0) return;
    const iw = o.im.width || o.info.w || 240;
    const ih = o.im.height || o.info.h || h;
    const scale = h / ih;
    const w = iw * scale;
    const startX = -(hash(name) % Math.max(1, w | 0));
    g.globalAlpha = Math.max(0, Math.min(1, a));
    for (let x = startX; x < W; x += Math.max(8, w - 2)) {
      g.drawImage(o.im, x, y - h, w, h);
    }
    g.globalAlpha = 1;
    const gl = gg && glowAlpha > 0 ? glowOf(o) : null;
    if (gl) {
      gg.globalAlpha = Math.max(0, Math.min(1, a * glowAlpha));
      for (let x = startX; x < W; x += Math.max(8, w - 2)) {
        gg.drawImage(gl, x / 4, (y - h) / 4, w / 4, h / 4);
      }
      gg.globalAlpha = 1;
    }
  }

  function drawDropped(g, o, x, y, w, h, flip, a) {
    if (!o.ok || a <= 0) return;
    g.globalAlpha = Math.min(1, a * 1.2);
    const dy = (1 - a) * 14;
    if (flip) {
      g.save();
      g.translate(x + w, y + dy);
      g.scale(-1, 1);
      g.drawImage(o.im, 0, 0, w, h);
      g.restore();
    } else {
      g.drawImage(o.im, x, y + dy, w, h);
    }
    g.globalAlpha = 1;
  }

  function renderScene(bufs, s, t, still) {
    const M = artManifest();
    const g = bufs.main.getContext('2d');
    const lg = bufs.layer.getContext('2d');
    const gg = bufs.glow.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;

    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#10131f');
    bg.addColorStop(1, '#0a0c16');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);

    if (s.guide && s.skyA < 1) {
      g.strokeStyle = 'rgba(160,175,210,0.16)';
      g.lineWidth = 1;
      g.setLineDash([6, 8]);
      g.beginPath();
      g.moveTo(40, HORIZON);
      g.lineTo(W - 40, HORIZON);
      g.moveTo(40, H - 104);
      g.lineTo(W - 40, H - 104);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = 'rgba(160,175,210,0.28)';
      g.font = '16px "Noto Sans TC", sans-serif';
      g.textAlign = 'center';
      const guides = [
        ['第一筆：天空和遠景', 180],
        ['第二筆：海上的建築', HORIZON + 44],
        ['第三筆：碼頭上的人和事', H - 52],
      ];
      for (let i = 0; i < guides.length; i++) {
        g.fillText(guides[i][0], W / 2, guides[i][1]);
      }
    }

    const skyMap = (M && M.sky) || {};
    const amb = (s.sky && skyMap[s.sky]) || [40, 46, 70];
    gg.globalCompositeOperation = 'source-over';
    gg.clearRect(0, 0, bufs.glow.width, bufs.glow.height);

    const skyObj = s.sky ? asset(s.sky) : null;
    if (skyObj && skyObj.ok && s.skyA > 0) {
      const pan = still ? 0 : Math.sin(t * 0.06) * 9;
      g.globalAlpha = s.skyA;
      g.drawImage(skyObj.im, -14 + pan, -6, W + 28, H + 12);
      if (!skyObj.band) {
        const bc = mkCanvas(W, 140);
        if (bc) {
          const q = bc.getContext('2d');
          q.translate(0, 140);
          q.scale(1, -1);
          q.drawImage(skyObj.im, 0, HORIZON - 140, W, 140, 0, 0, W, 140);
          q.setTransform(1, 0, 0, 1, 0, 0);
          q.globalCompositeOperation = 'destination-in';
          const gr = q.createLinearGradient(0, 0, 0, 140);
          gr.addColorStop(0, 'rgba(0,0,0,0.4)');
          gr.addColorStop(1, 'rgba(0,0,0,0)');
          q.fillStyle = gr;
          q.fillRect(0, 0, W, 140);
          skyObj.band = bc;
        }
      }
      if (skyObj.band) g.drawImage(skyObj.band, 0, HORIZON);
      g.globalAlpha = 1;
      const skyGl = glowOf(skyObj);
      if (skyGl) {
        gg.globalAlpha = s.skyA * 0.28;
        gg.drawImage(skyGl, (-14 + pan) / 4, -1.5, (W + 28) / 4, (H + 12) / 4);
        gg.globalAlpha = 1;
      }
    }

    for (let i = 0; i < s.far.length; i++) {
      const f = s.far[i];
      tileLayer(g, gg, f.name, HORIZON + 3, f.h, f.a * (1 - f.haze * 0.5), 0.38);
    }

    if (s.mids.length) {
      for (let i = 0; i < s.mids.length; i++) {
        const m = s.mids[i];
        const o = asset(m.name);
        if (!o.ok || m.fl || m.a <= 0) continue;
        const r = reflOf(o);
        if (!r) continue;
        const w = (o.im.width || o.info.w) * m.s;
        const h = (o.im.height || o.info.h) * m.s;
        g.globalAlpha = m.a;
        g.drawImage(r, m.x - w / 2, m.base, w, h);
        g.globalAlpha = 1;
      }
      lg.globalCompositeOperation = 'source-over';
      lg.clearRect(0, 0, W, H);
      for (let mi = 0; mi < s.mids.length; mi++) {
        const m = s.mids[mi];
        const o = asset(m.name);
        if (!o.ok) continue;
        const w = (o.im.width || o.info.w) * m.s;
        const h = (o.im.height || o.info.h) * m.s;
        const bob = still ? 0 : (m.fl ? Math.sin(t * 1.3 + mi) * 4 : Math.sin(t * 0.9 + mi * 2) * 0.8);
        drawDropped(lg, o, m.x - w / 2, m.base - h + bob, w, h, m.flip, m.a);
      }
      lg.globalCompositeOperation = 'source-atop';
      lg.fillStyle = 'rgba(' + amb[0] + ',' + amb[1] + ',' + amb[2] + ',0.2)';
      lg.fillRect(0, 0, W, H);
      g.drawImage(bufs.layer, 0, 0);

      for (let i = 0; i < s.mids.length; i++) {
        const m = s.mids[i];
        const o = asset(m.name);
        if (!o.ok || m.a <= 0) continue;
        const gl = glowOf(o);
        const w = (o.im.width || o.info.w) * m.s / 4;
        const h = (o.im.height || o.info.h) * m.s / 4;
        const x = m.x / 4 - w / 2;
        const y = m.base / 4 - h;
        if (gl) {
          gg.globalAlpha = m.a;
          if (m.flip) {
            gg.save();
            gg.translate(x + w, y);
            gg.scale(-1, 1);
            gg.drawImage(gl, 0, 0, w, h);
            gg.restore();
          } else {
            gg.drawImage(gl, x, y, w, h);
          }
          if (!m.fl) {
            gg.globalAlpha = m.a * 0.55;
            gg.save();
            gg.translate(0, m.base / 4);
            gg.scale(1, -1.8);
            gg.drawImage(gl, x, -h, w, h);
            gg.restore();
          }
          gg.globalAlpha = 1;
        }
        if (m.z) {
          const cx = m.x, cy = m.base - h * 2, rad = Math.max(90, w * 3.4);
          const sp = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
          sp.addColorStop(0, 'rgba(255,236,200,' + (0.14 * m.a) + ')');
          sp.addColorStop(1, 'rgba(255,236,200,0)');
          g.globalCompositeOperation = 'screen';
          g.fillStyle = sp;
          g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
          g.globalCompositeOperation = 'source-over';
        }
      }
    }

    if (!s.cold) {
      const wc = bufs.water.getContext('2d');
      const wh = H - WATER_TOP;
      wc.clearRect(0, 0, W, wh);
      wc.drawImage(bufs.main, 0, WATER_TOP, W, wh, 0, 0, W, wh);
      const waveT = still ? 1.2 : t;
      for (let y = 0; y < wh; y += 3) {
        const d = y / wh;
        const dx = Math.sin(y * 0.21 + waveT * 2.2) * (0.6 + d * 2.6) + Math.sin(y * 0.05 - waveT * 1.1) * d * 1.6;
        g.drawImage(bufs.water, 0, y, W, 3, dx, WATER_TOP + y, W, 3);
      }
    }

    if (s.flood > 0 && s.skyA > 0.3) {
      const rise = Math.round(s.flood * 36);
      const top = 404 - rise;
      const wg = g.createLinearGradient(0, top, 0, 414);
      const dark = 'rgba(' + Math.round(amb[0] * 0.35) + ',' + Math.round(amb[1] * 0.42) + ',' + Math.round(amb[2] * 0.55 + 14) + ',';
      wg.addColorStop(0, dark + '0.62)');
      wg.addColorStop(1, dark + '0.0)');
      g.globalAlpha = s.skyA;
      g.fillStyle = wg;
      g.fillRect(0, top, W, rise + 14);
      g.fillStyle = 'rgba(220,240,255,0.28)';
      for (let x = 0; x < W; x += 6) {
        const yy = top + (still ? 0 : Math.sin(x * 0.06 + t * 1.8) * 1.4);
        g.fillRect(x, yy, 4, 1);
      }
      g.globalAlpha = 1;
    }

    if (s.cold && s.skyA > 0.3) {
      const top = 404 - Math.round(s.flood * 36);
      g.fillStyle = 'rgba(200,228,255,' + (0.2 * s.skyA) + ')';
      g.fillRect(0, top, W, H - top);
      if (!s.cracks) {
        s.cracks = [];
        const rnd = mulberry32((s.seed ^ 0x9E3779B9) >>> 0);
        for (let i = 0; i < 26; i++) {
          const x = rnd() * W;
          const y = top + 10 + rnd() * Math.max(20, H - top - 120);
          const segs = 3 + (rnd() * 4 | 0);
          const pts = [[x, y]];
          for (let k = 0; k < segs; k++) {
            pts.push([pts[k][0] + (rnd() - 0.5) * 90, pts[k][1] + (rnd() - 0.3) * 14]);
          }
          s.cracks.push(pts);
        }
      }
      g.strokeStyle = 'rgba(235,246,255,' + (0.3 * s.skyA) + ')';
      g.lineWidth = 1;
      g.beginPath();
      for (let i = 0; i < s.cracks.length; i++) {
        const pts = s.cracks[i];
        g.moveTo(pts[0][0], pts[0][1]);
        for (let k = 1; k < pts.length; k++) g.lineTo(pts[k][0], pts[k][1]);
      }
      g.stroke();
    } else if (!still && s.skyA > 0.5) {
      if (s.glints.length < 46) {
        s.glints.push({
          x: Math.random() * W,
          y: 414 + Math.random() * (H - 514),
          l: 0,
          w: 6 + Math.random() * 16,
        });
      }
      s.glints = s.glints.filter((q) => q.l < 1);
      for (let i = 0; i < s.glints.length; i++) {
        const q = s.glints[i];
        q.l += 0.035;
        g.fillStyle = 'rgba(255,255,255,' + (0.3 * Math.sin(q.l * 3.14159)) + ')';
        g.fillRect(q.x, q.y, q.w, 1);
      }
    }

    if (s.pierA > 0 || s.bays.length) {
      lg.globalCompositeOperation = 'source-over';
      lg.clearRect(0, 0, W, H);
      tileLayer(lg, gg, s.pier, H, 110, s.pierA, 0.25);
      const ordered = s.bays.filter((b) => !b.z).concat(s.bays.filter((b) => b.z));
      for (let i = 0; i < ordered.length; i++) {
        const b = ordered[i];
        const o = asset(b.name);
        drawDropped(lg, o, b.x, H + 2 - b.h, b.w, b.h, b.flip, b.a);
      }
      lg.globalCompositeOperation = 'source-atop';
      lg.fillStyle = 'rgba(' + amb[0] + ',' + amb[1] + ',' + amb[2] + ',0.13)';
      lg.fillRect(0, 0, W, H);
      g.drawImage(bufs.layer, 0, 0);

      if (s.flood > 0.55 && s.pierA > 0) {
        const hgt = Math.round((s.flood - 0.5) * 44);
        const y0 = H - hgt;
        const pg = g.createLinearGradient(0, y0, 0, H);
        pg.addColorStop(0, 'rgba(20,46,78,0.0)');
        pg.addColorStop(0.35, 'rgba(20,46,78,0.5)');
        pg.addColorStop(1, 'rgba(12,30,56,0.72)');
        g.globalAlpha = s.pierA;
        g.fillStyle = pg;
        g.fillRect(0, y0, W, hgt);
        g.fillStyle = s.cold ? 'rgba(235,246,255,0.45)' : 'rgba(220,240,255,0.3)';
        for (let x = 0; x < W; x += 7) {
          const wy = y0 + hgt * 0.35 + (s.cold || still ? 0 : Math.sin(x * 0.05 + t * 2.1) * 1.5);
          g.fillRect(x, wy, 5, 1);
        }
        g.globalAlpha = 1;
      }

      for (let i = 0; i < s.bays.length; i++) {
        const b = s.bays[i];
        const o = asset(b.name);
        if (!o.ok || b.a <= 0) continue;
        const gl = glowOf(o);
        if (!gl) continue;
        gg.globalAlpha = b.a * 0.44;
        if (b.flip) {
          gg.save();
          gg.translate((b.x + b.w) / 4, (H + 2 - b.h) / 4);
          gg.scale(-1, 1);
          gg.drawImage(gl, 0, 0, b.w / 4, b.h / 4);
          gg.restore();
        } else {
          gg.drawImage(gl, b.x / 4, (H + 2 - b.h) / 4, b.w / 4, b.h / 4);
        }
      }
      gg.globalAlpha = 1;

      const zb = s.bays.find((b) => b.z && b.a > 0);
      if (zb) {
        const cx = zb.x + zb.w / 2, cy = H - zb.h * 0.5, rad = zb.w * 0.9;
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
        gr.addColorStop(0, 'rgba(255,236,200,' + (0.18 * zb.a) + ')');
        gr.addColorStop(1, 'rgba(255,236,200,0)');
        g.globalCompositeOperation = 'screen';
        g.fillStyle = gr;
        g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
        g.globalCompositeOperation = 'source-over';
      }
    }

    const fl = still ? 0.96 : (0.9 + 0.1 * Math.sin(t * 2.7) - (Math.sin(t * 0.83) > 0.992 ? 0.45 : 0));
    g.globalCompositeOperation = 'screen';
    g.globalAlpha = Math.max(0, Math.min(1, s.lights * fl));
    g.imageSmoothingEnabled = true;
    g.drawImage(bufs.glow, 0, 0, W, H);
    g.globalAlpha *= 0.6;
    g.drawImage(bufs.glow, -6, -6, W + 12, H + 12);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;

    if (s.front && s.frontA > 0) {
      const fo = asset(s.front);
      if (fo.ok) {
        lg.globalCompositeOperation = 'source-over';
        lg.clearRect(0, 0, W, H);
        lg.drawImage(fo.im, 0, 0, W, H);
        lg.globalCompositeOperation = 'source-atop';
        lg.fillStyle = 'rgba(' + amb[0] + ',' + amb[1] + ',' + amb[2] + ',0.12)';
        lg.fillRect(0, 0, W, H);
        g.globalAlpha = s.frontA;
        g.drawImage(bufs.layer, 0, 0);
        const fgl = glowOf(fo);
        if (fgl) {
          g.globalCompositeOperation = 'screen';
          g.globalAlpha = Math.max(0, Math.min(1, s.frontA * s.lights * 0.55));
          g.drawImage(fgl, 0, 0, W, H);
          g.globalCompositeOperation = 'source-over';
        }
        g.globalAlpha = 1;
      }
    }

    if (!still && s.rain && s.skyA > 0.5) {
      if (!s.drops.length) {
        const rnd = mulberry32((s.seed ^ 0x517CC1B7) >>> 0);
        for (let i = 0; i < 160; i++) {
          s.drops.push({ x: rnd() * (W + 120), y: rnd() * H, v: 520 + rnd() * 300, l: 9 + rnd() * 13 });
        }
      }
      g.strokeStyle = 'rgba(200,220,240,0.34)';
      g.lineWidth = 1;
      g.beginPath();
      for (let i = 0; i < s.drops.length; i++) {
        const d = s.drops[i];
        d.y += d.v / 28;
        d.x -= (d.v / 28) * 0.2;
        if (d.y > H) {
          d.y = -20;
          d.x = Math.random() * (W + 120);
        }
        g.moveTo(d.x, d.y);
        g.lineTo(d.x + d.l * 0.2, d.y - d.l);
      }
      g.stroke();
    }

    if (!still && s.sky && /-(anger|rebel)-2$/.test(s.sky) && s.skyA > 0.9) {
      if (t > s.nextBolt) {
        s.bolt = 1;
        s.nextBolt = t + 5 + Math.random() * 8;
      }
      if (s.bolt > 0) {
        g.fillStyle = 'rgba(255,240,235,' + (0.22 * s.bolt) + ')';
        g.fillRect(0, 0, W, H);
        s.bolt -= 0.22;
      }
    }

    if (s.cold && s.skyA > 0.3) {
      g.fillStyle = 'rgba(160,200,255,0.07)';
      g.fillRect(0, 0, W, H);
      if (!still) {
        if (!s.snow.length) {
          const rnd = mulberry32((s.seed ^ 0xA5A5A5A5) >>> 0);
          for (let i = 0; i < 140; i++) {
            s.snow.push({ x: rnd() * W, y: rnd() * H, v: 0.6 + rnd() * 1.4, r: 1 + rnd() * 2.2, p: rnd() * 6.283 });
          }
        }
        for (let i = 0; i < s.snow.length; i++) {
          const f = s.snow[i];
          f.y += f.v;
          f.x += Math.sin(t * 0.8 + f.p) * 0.5;
          if (f.y > H) {
            f.y = -4;
            f.x = Math.random() * W;
          }
          g.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.3 * Math.sin(f.p)) + ')';
          g.fillRect(f.x, f.y, f.r, f.r);
        }
      }
    }

    for (let i = 0; i < s.marks.length; i++) {
      const m = s.marks[i];
      g.strokeStyle = 'rgba(224,70,70,0.85)';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(m[0] - 22, m[1] - 22);
      g.lineTo(m[0] + 22, m[1] + 22);
      g.moveTo(m[0] + 22, m[1] - 22);
      g.lineTo(m[0] - 22, m[1] + 22);
      g.stroke();
    }

    s.sparks = s.sparks.filter((p) => p.life > 0);
    for (let i = 0; i < s.sparks.length; i++) {
      const p = s.sparks[i];
      if (!still) {
        p.life -= 0.05;
        p.x += p.vx;
        p.y += p.vy;
      }
      g.fillStyle = p.c;
      g.globalAlpha = Math.max(0, p.life);
      g.fillRect(p.x, p.y, p.r, p.r);
    }
    g.globalAlpha = 1;

    const vig = vignette();
    if (vig) g.drawImage(vig, 0, 0);
  }

  function presentTo(cv, bufs, s) {
    if (!cv) return;
    const M = artManifest();
    const g = cv.getContext('2d');
    const goldObj = (s.gold || s.fulls >= 3) && M && M.gold ? asset('np-front-frame-gold') : null;
    if (goldObj && goldObj.ok && M && M.gold) {
      const q = M.gold;
      const pad = 6;
      g.fillStyle = '#120e0a';
      g.fillRect(0, 0, W, H);
      g.drawImage(bufs.main, q[0] - pad, q[1] - pad, q[2] - q[0] + 2 * pad, q[3] - q[1] + 2 * pad);
      g.drawImage(goldObj.im, 0, 0, W, H);
      const ggl = glowOf(goldObj);
      if (ggl) {
        g.globalCompositeOperation = 'screen';
        g.globalAlpha = 0.35;
        g.drawImage(ggl, 0, 0, W, H);
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = 1;
      }
    } else {
      g.drawImage(bufs.main, 0, 0);
    }
  }

  function makeBuffers() {
    return {
      main: mkCanvas(W, H),
      layer: mkCanvas(W, H),
      glow: mkCanvas(W >> 2, H >> 2),
      water: mkCanvas(W, H - WATER_TOP),
    };
  }

  // 白天面板掛載（WO-16-08）：0.6 秒淡入換景，失敗時給 .rd-vista 加 is-off
  function mount(canvas, opts) {
    const o = opts || {};
    const wrap = canvas && canvas.closest ? canvas.closest('.rd-vista') : null;
    const markOff = () => {
      if (wrap && wrap.classList) wrap.classList.add('is-off');
      if (o.onFallback) o.onFallback();
    };
    const M = artManifest();
    if (!canvas || !M) {
      markOff();
      return { set() {}, stop() {} };
    }
    canvas.width = W;
    canvas.height = H;
    const bufs = makeBuffers();
    const prevSnap = mkCanvas(W, H);
    let sc = null;
    let fadeStart = 0;
    let hasPrev = false;
    let stopped = false;
    let raf = 0;
    let lastT = 0;

    function drawOnce(nowMs, still) {
      if (!sc || stopped) return;
      renderScene(bufs, sc, (nowMs || 1200) / 1000, still);
      const g = canvas.getContext('2d');
      if (hasPrev && fadeStart > 0 && !still) {
        const k = Math.min(1, (nowMs - fadeStart) / 600);
        g.globalAlpha = 1;
        g.drawImage(prevSnap, 0, 0);
        g.globalAlpha = k;
        g.drawImage(bufs.main, 0, 0);
        g.globalAlpha = 1;
        if (k >= 1) fadeStart = 0;
      } else {
        g.drawImage(bufs.main, 0, 0);
      }
    }

    function schedule() {
      if (stopped || raf || typeof requestAnimationFrame === 'undefined') return;
      if (reducedMotion()) {
        drawOnce(1200, true);
        return;
      }
      raf = requestAnimationFrame(function tick(now) {
        raf = 0;
        if (stopped || !sc) return;
        if (!isCanvasVisible(canvas)) return;
        if (now - lastT >= 33) {
          lastT = now;
          drawOnce(now, false);
        }
        raf = requestAnimationFrame(tick);
      });
    }

    const onLoad = () => {
      if (stopped || !sc) return;
      if (reducedMotion()) drawOnce(1200, true);
      else schedule();
    };
    listeners.add(onLoad);

    function set(p) {
      if (stopped) return;
      if (!p || !artManifest()) {
        markOff();
        return;
      }
      if (sc && prevSnap) {
        prevSnap.getContext('2d').drawImage(canvas, 0, 0);
        hasPrev = true;
        fadeStart = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      }
      const A = artManifest().a;
      sc = createSceneState(p.seed || 1, {
        flood: p.flood,
        cold: p.cold,
        rain: p.rain,
        pier: p.pier,
        guide: false,
      });
      sc.sky = p.sky;
      sc.skyA = 1;
      sc.far = (p.far || []).map((nm, idx) => ({ name: nm, h: idx === 0 ? 46 : 72, a: 1, haze: idx === 0 ? 0.5 : 0.25 }));
      const xs = (p.mids && p.mids.length > 1)
        ? p.mids.map((_, j) => 170 + j * (W - 340) / (p.mids.length - 1))
        : [W / 2];
      sc.mids = (p.mids || []).map((nm, j) => {
        const info = A[nm] || {};
        return {
          name: nm,
          x: xs[j],
          base: 392 + 14 * (j % 2) - (info.fl ? 30 : 0),
          s: j === 1 ? 0.96 : 0.87,
          flip: ((hash(nm + j) & 1) === 1),
          fl: !!info.fl,
          z: false,
          a: 1,
        };
      });
      sc.pierA = 1;
      sc.front = p.front;
      sc.frontA = 1;
      sc.lights = 0.78;
      sc.lightsTo = 0.78;

      const req = [sc.sky, sc.pier, sc.front]
        .concat(sc.far.map((f) => f.name), sc.mids.map((m) => m.name))
        .filter(Boolean);
      Promise.all(req.map((nm) => asset(nm).p)).then((list) => {
        if (stopped) return;
        if (list.some((x) => !x || x.err || !x.ok)) {
          stopped = true;
          markOff();
        } else if (wrap && wrap.classList) {
          wrap.classList.remove('is-off');
        }
      });
      onLoad();
    }

    function stop() {
      stopped = true;
      listeners.delete(onLoad);
      if (raf && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(raf);
      raf = 0;
    }

    return { set, stop };
  }

  // 創作桌畫布（WO-16-10）：回傳 { stroke(n, info), finish(), snapshot(), ... }
  function paint(canvas, opts) {
    const o = opts || {};
    const sInit = o.state || null;
    const basePlan = sInit ? plan(sInit) : null;
    const seed = o.seed != null ? o.seed : (basePlan ? basePlan.seed : ((sInit && sInit.seed) || 1));
    const flood = o.flood != null ? o.flood : (basePlan ? basePlan.flood : 0);
    const cold = o.cold != null ? !!o.cold : !!(basePlan && basePlan.cold);
    const rain = o.rain != null ? !!o.rain : !!(basePlan && basePlan.rain);
    const pier = o.pier || (basePlan && basePlan.pier) || ('np-stage-pier-' + (((seed >>> 0) || 1) % 3 + 1));
    const isStatic = !!o.static || reducedMotion();

    let fallbackTriggered = false;
    function triggerFallback() {
      if (fallbackTriggered) return;
      fallbackTriggered = true;
      if (typeof o.onFallback === 'function') o.onFallback();
    }

    if (!canvas || !artManifest()) {
      triggerFallback();
      return {
        stroke() { return []; },
        prepareStroke() { return { plans: {}, list: [], close: null, assets: [] }; },
        drawItem() { return Promise.resolve(); },
        finish() { return this; },
        snapshot() { return ''; },
        replay() { triggerFallback(); return this; },
        screenPoint() { return { x: 0, y: 0 }; },
        glint() {},
        strike() {},
        ready() { return Promise.resolve(); },
        isFallback() { return true; },
        stop() {},
      };
    }

    canvas.width = W;
    canvas.height = H;
    const bufs = makeBuffers();
    const sc = createSceneState(seed, { flood, cold, rain, pier, guide: o.guide !== false });
    asset(sc.pier);

    let stopped = false;
    let raf = 0;
    let lastT = 0;
    let requestedCount = 0;
    let okCount = 0;
    let errCount = 0;
    const tracked = new Set();

    function trackAssets(names) {
      const fresh = names.filter((nm) => nm && !tracked.has(nm));
      if (!fresh.length) return;
      fresh.forEach((nm) => tracked.add(nm));
      requestedCount += fresh.length;
      Promise.all(fresh.map((nm) => asset(nm).p)).then((resList) => {
        if (stopped) return;
        for (let i = 0; i < resList.length; i++) {
          if (resList[i] && resList[i].ok) okCount += 1;
          else errCount += 1;
        }
        if (requestedCount > 0 && okCount === 0 && errCount >= requestedCount) {
          triggerFallback();
        }
      });
    }

    function drawFrameNow(still) {
      if (stopped || fallbackTriggered) return;
      const nowS = (typeof performance !== 'undefined' ? performance.now() : 1200) / 1000;
      renderScene(bufs, sc, still ? 1.3 : nowS, still);
      presentTo(canvas, bufs, sc);
    }

    function schedule() {
      if (stopped || fallbackTriggered) return;
      if (isStatic || reducedMotion()) {
        drawFrameNow(true);
        return;
      }
      if (raf || typeof requestAnimationFrame === 'undefined') return;
      raf = requestAnimationFrame(function step(now) {
        raf = 0;
        if (stopped || fallbackTriggered) return;
        if (!isCanvasVisible(canvas)) return;
        if (now - lastT >= 33) {
          lastT = now;
          renderScene(bufs, sc, now / 1000, false);
          presentTo(canvas, bufs, sc);
        }
        raf = requestAnimationFrame(step);
      });
    }

    const onAssetReady = () => {
      if (stopped || fallbackTriggered) return;
      if (isStatic || reducedMotion() || !isCanvasVisible(canvas)) drawFrameNow(true);
      else schedule();
    };
    listeners.add(onAssetReady);

    function puff(at) {
      if (!at || isStatic || reducedMotion()) return;
      for (let i = 0; i < 16; i++) {
        const ang = Math.random() * 6.283;
        const v = 1 + Math.random() * 2.2;
        sc.sparks.push({
          x: at[0],
          y: at[1],
          vx: Math.cos(ang) * v,
          vy: Math.sin(ang) * v - 0.6,
          r: 2 + Math.random() * 2,
          life: 0.5 + Math.random() * 0.4,
          c: i % 3 ? '#fff3c4' : '#ffd65a',
        });
      }
      schedule();
    }

    function glint(count) {
      if (isStatic || reducedMotion()) return;
      const total = Math.max(8, (count || 36) >> 1);
      for (let i = 0; i < total; i++) {
        sc.sparks.push({
          x: Math.random() * W,
          y: Math.random() * H * 0.8,
          vx: (Math.random() - 0.5) * 2,
          vy: -Math.random() * 2,
          r: 2 + Math.random() * 3,
          life: 0.6 + Math.random() * 0.6,
          c: '#ffd65a',
        });
      }
      schedule();
    }

    function strike(at) {
      sc.marks.push(at ? [at[0], at[1]] : [W / 2, H / 2]);
      onAssetReady();
    }

    function prepareStroke(n, info, sOverride) {
      const M = artManifest();
      if (!M || !info) return { plans: {}, list: [], close: null, assets: [] };
      const A = M.a;
      const sRef = sOverride || o.state || { seed, pier, stage: basePlan ? basePlan.stage : 'dry' };
      const ring = Math.max(0, Math.min(3, Number(n) || 0));
      const meta = resolveStrokeMeta(sRef, info);
      const { runCards, roles, form, he } = meta;
      const assets = strokePlan(sRef, ring, info);
      trackAssets(assets);

      const plans = {};
      const list = [];
      const count = Math.max(1, runCards.length);
      const add = (c, idx, at, stepFn) => {
        const item = { uid: c && c.uid, at, step: stepFn };
        if (c && c.uid != null) plans[c.uid] = item;
        list[idx] = item;
        return item;
      };

      if (ring === 0) {
        const skyName = assets[0] || 'np-sky-neon-1';
        const f1Name = assets[1] || 'np-far-neon';
        const f2Name = assets[2] || f1Name;
        sc.sky = skyName;
        if (!sInit && o.rain == null && !sc.cold && skyName === 'np-sky-water-1') sc.rain = true;
        sc.far = [
          { name: f1Name, h: 46, a: 0, haze: 0.5 },
          { name: f2Name, h: 72, a: 0, haze: 0.25 },
        ];
        if (!runCards.length) {
          list.push({ at: [W / 2, 160], step: (k) => { sc.skyA = k; sc.far.forEach((f) => { f.a = k; }); } });
        } else {
          runCards.forEach((c, i) => add(c, i, [W * (i + 1) / (count + 1), 150 + (i % 2) * 50], (k) => {
            sc.skyA = Math.max(sc.skyA, (i + k) / count);
            if (i === count - 1) sc.far.forEach((f) => { f.a = Math.max(f.a, k); });
          }));
        }
      } else if (ring === 1) {
        sc.mids = [];
        const idx = pick3(runCards.length, roles);
        const xs = idx.length > 1
          ? idx.map((_, j) => 170 + j * (W - 340) / (idx.length - 1))
          : [W / 2];
        const used = new Set();
        runCards.forEach((c, i) => {
          const j = idx.indexOf(i);
          if (j < 0) {
            const near = xs[Math.min(xs.length - 1, Math.round(i * (xs.length - 1) / Math.max(1, count - 1)))];
            add(c, i, [near, 300], () => {});
            return;
          }
          let name = assets[j] || 'np-mid-neon-1';
          const moodTag = resolveMoodTag(c);
          for (let t = 1; used.has(name) && t <= 3; t++) {
            const alt = 'np-mid-' + moodTag + '-' + (((hash(c.id || c.name || i) + t) % 3) + 1);
            if (A[alt]) name = alt;
          }
          used.add(name);
          trackAssets([name]);
          const infoA = A[name] || { w: 170, h: 170 };
          const z = isZ(roles[i]);
          const artC = (IE.Desk && IE.Desk.artOf) ? IE.Desk.artOf(c) : null;
          const el = {
            name,
            x: xs[j],
            base: 392 + 14 * (j % 2) - (infoA.fl ? 30 : 0),
            s: z ? 1 : 0.87,
            flip: artC ? !!artC.flip : ((hash(String(c.id || i) + 'flip') & 1) === 1),
            fl: !!infoA.fl,
            z,
            a: 0,
          };
          sc.mids.push(el);
          add(c, i, [el.x, el.base - (infoA.h || 150) * el.s * 0.5], (k) => { el.a = Math.max(el.a, k); });
        });
      } else if (ring === 2) {
        sc.bays = [];
        if (assets[0] && /^np-stage-pier-/.test(assets[0])) {
          sc.pier = assets[0];
        }
        const idx = pick3(runCards.length, roles);
        const cells = idx.map((cardIdx, j) => {
          const c = runCards[cardIdx];
          const artC = (c && IE.Desk && IE.Desk.artOf) ? IE.Desk.artOf(c) : null;
          const name = assets[j + 1] || (artC && artC.face) || 'np-focal-neon-1';
          return {
            c,
            name,
            z: isZ(roles[cardIdx]),
            flip: artC ? !!artC.flip : false,
          };
        });
        let totalW = 0;
        cells.forEach((b) => {
          const m = A[b.name] || { w: 240, h: 262 };
          b.s = b.z ? 1 : 0.85;
          b.w = m.w * b.s;
          b.h = m.h * b.s;
          totalW += b.w * 0.94;
          trackAssets([b.name, sc.pier]);
        });
        const kx = totalW > 0 ? Math.min(1, (W - 20) / totalW) : 1;
        let x = (W - totalW * kx) / 2;
        cells.forEach((b) => {
          b.w *= kx;
          b.h *= kx;
          b.x = x;
          x += b.w * 0.94;
          b.a = 0;
          sc.bays.push(b);
        });
        if (!runCards.length) {
          list.push({ at: [W / 2, H - 120], step: (k) => { sc.pierA = Math.max(sc.pierA, k); } });
        } else {
          runCards.forEach((c, i) => {
            const b = cells.find((q) => q.c === c);
            const at = b ? [b.x + b.w / 2, H - b.h * 0.6] : [W * (i + 1) / (count + 1), H - 150];
            add(c, i, at, (k) => {
              if (i === 0) sc.pierA = Math.max(sc.pierA, k);
              if (b) b.a = Math.max(b.a, k);
            });
          });
        }
      } else {
        const fName = assets[0] || 'np-front-neonframe';
        if (fName === 'np-front-frame-gold') {
          sc.gold = true;
          const fallbackFront = pickValid(A, 'np-front-' + (FRONT_MAP[meta.main0] || 'neonframe'), 'np-front-');
          sc.front = fallbackFront && fallbackFront !== 'np-front-frame-gold' ? fallbackFront : null;
          if (sc.front) trackAssets([sc.front]);
        } else {
          sc.front = fName;
        }
        if (!runCards.length) {
          list.push({ at: [W / 2, 70], step: (k) => { sc.frontA = Math.max(sc.frontA, k); } });
        } else {
          runCards.forEach((c, i) => add(c, i, [W * (i + 1) / (count + 1), 70], (k) => {
            sc.frontA = Math.max(sc.frontA, (i + k) / count);
          }));
        }
      }

      const fullNow = form === 'full';
      let counted = false;
      const markFull = () => {
        if (counted) return;
        counted = true;
        if (fullNow) sc.fulls += 1;
        if (sc.fulls >= 3) {
          sc.gold = true;
          trackAssets(['np-front-frame-gold']);
        }
      };

      const close = he ? {
        at: [W / 2, H / 2],
        step(k) {
          sc.lights = Math.max(sc.lights, Math.min(1, sc.lightsTo + 0.2 * k));
          if (k >= 1) {
            sc.lightsTo = Math.min(1, sc.lightsTo + 0.2);
            markFull();
          }
        },
      } : {
        at: [W / 2, H / 2],
        silent: true,
        step(k) {
          if (k >= 1) markFull();
        },
      };

      onAssetReady();
      return { plans, list: list.filter(Boolean), close, assets };
    }

    function drawItem(planItem, ms) {
      return new Promise((resolve) => {
        if (!planItem || !planItem.step) {
          resolve();
          return;
        }
        if (!ms || isStatic || reducedMotion() || typeof requestAnimationFrame === 'undefined') {
          planItem.step(1);
          if (!planItem.silent) puff(planItem.at);
          onAssetReady();
          resolve();
          return;
        }
        const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
        function tick(now) {
          if (stopped) {
            resolve();
            return;
          }
          const cur = now || (typeof performance !== 'undefined' ? performance.now() : Date.now());
          const k = Math.min(1, (cur - t0) / ms);
          planItem.step(1 - Math.pow(1 - k, 3));
          schedule();
          if (k < 1) requestAnimationFrame(tick);
          else {
            if (!planItem.silent) puff(planItem.at);
            resolve();
          }
        }
        requestAnimationFrame(tick);
      });
    }

    function stroke(n, info, sOverride) {
      const prep = prepareStroke(n, info, sOverride);
      for (let i = 0; i < prep.list.length; i++) {
        prep.list[i].step(1);
        puff(prep.list[i].at);
      }
      if (prep.close) {
        prep.close.step(1);
        if (!prep.close.silent) glint(28);
      }
      onAssetReady();
      return prep.assets;
    }

    function finish() {
      sc.guide = false;
      if (sc.sky) sc.skyA = 1;
      sc.far.forEach((f) => { f.a = 1; });
      sc.mids.forEach((m) => { m.a = 1; });
      if (sc.bays.length) sc.pierA = 1;
      sc.bays.forEach((b) => { b.a = 1; });
      if (sc.front) sc.frontA = 1;
      if (sc.fulls >= 3) {
        sc.gold = true;
        trackAssets(['np-front-frame-gold']);
      }
      drawFrameNow(true);
      schedule();
      return api;
    }

    function snapshot() {
      if (fallbackTriggered || !bufs.main) return '';
      if (sc.fulls >= 3) sc.gold = true;
      renderScene(bufs, sc, 1.3, true);
      const out = mkCanvas(W, H);
      if (!out) return '';
      presentTo(out, bufs, sc);
      try {
        return out.toDataURL('image/jpeg', 0.86);
      } catch (e) {
        return '';
      }
    }

    function replay(rec) {
      if (!rec || !artManifest()) {
        triggerFallback();
        return api;
      }
      sc.guide = false;
      sc.seed = (rec.seed >>> 0) || sc.seed;
      if (rec.flood != null) sc.flood = Math.max(0, Math.min(1, Number(rec.flood) || 0));
      if (rec.cold != null) sc.cold = !!rec.cold;
      if (rec.rain != null) sc.rain = !!rec.rain;
      if (rec.pier) sc.pier = rec.pier;
      sc.sky = null;
      sc.skyA = 0;
      sc.far = [];
      sc.mids = [];
      sc.bays = [];
      sc.pierA = 0;
      sc.front = null;
      sc.frontA = 0;
      sc.lights = 0.4;
      sc.lightsTo = 0.4;
      sc.fulls = 0;
      sc.gold = false;

      const strokes = Array.isArray(rec.strokes) ? rec.strokes : [];
      const pseudoS = {
        seed: sc.seed,
        round: rec.round || 1,
        stage: rec.stage || 'dry',
        season: sc.cold ? 'cold' : 'calm',
        pier: sc.pier,
        strokes,
      };
      for (let i = 0; i < strokes.length && i < 4; i++) {
        const st = strokes[i];
        if (!st) continue;
        const prep = prepareStroke(i, {
          run: st.cards || [],
          roles: st.roles,
          main: st.main,
          second: st.second,
          form: st.form,
          he: st.he,
        }, pseudoS);
        for (let k = 0; k < prep.list.length; k++) prep.list[k].step(1);
        if (prep.close) prep.close.step(1);
      }
      finish();
      return api;
    }

    function screenPoint(pt) {
      const b = canvas.getBoundingClientRect();
      return {
        x: b.left + ((pt ? pt[0] : W / 2) / W) * b.width,
        y: b.top + ((pt ? pt[1] : H / 2) / H) * b.height,
      };
    }

    function ready(ms) {
      const names = Array.from(tracked);
      if (!names.length) return Promise.resolve();
      return Promise.race([
        Promise.all(names.map((nm) => asset(nm).p)),
        new Promise((r) => setTimeout(r, ms || 2000)),
      ]);
    }

    function stop() {
      stopped = true;
      listeners.delete(onAssetReady);
      if (raf && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(raf);
      raf = 0;
    }

    onAssetReady();

    const api = {
      stroke,
      prepareStroke,
      drawItem,
      finish,
      snapshot,
      replay,
      screenPoint,
      glint,
      strike,
      ready,
      isFallback: () => fallbackTriggered,
      stop,
    };
    return api;
  }

  IE.NightScene = {
    W,
    H,
    HORIZON,
    base,
    plan,
    mount,
    strokePlan,
    recordStroke,
    replayPlan,
    paint,
  };
})(typeof window !== 'undefined' ? window : globalThis);
