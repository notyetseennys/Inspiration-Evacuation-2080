// 像素畫引擎：以 320×180 原生解像度繪畫再放大顯示；文字另外以高解像度繪畫，保持清晰。
(function (IE) {
  'use strict';
  const W = 320, H = 180;

  // ---------- 顏色工具 ----------
  function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  }
  function mix(a, b, t) {
    const x = hexToRgb(a), y = hexToRgb(b);
    return rgbToHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
  }
  function desat(hex, amt) {
    const [r, g, b] = hexToRgb(hex);
    const l = 0.3 * r + 0.59 * g + 0.11 * b;
    return rgbToHex(r + (l - r) * amt, g + (l - g) * amt, b + (l - b) * amt);
  }
  function rgba(hex, a) {
    const [r, g, b] = hexToRgb(hex);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  // ---------- 精靈圖 ----------
  const SPR = {
    player: { pal: { h: '#2b2140', f: '#f2c6a0', k: '#1a1a2e', m: '#b5555a', j: '#37c3d6', p: '#2a3350' }, rows: [
      '..hhhh..', '.hhhhhh.', '.hffffh.', '.fkffkf.', '.ffffff.', '..fmmf..',
      '...ff...', '.jjjjjj.', 'jjjjjjjj', 'f.jjjj.f', '..p..p..', '..p..p..'] },
    cat: { pal: { o: '#f29a3a', d: '#c46a1e', k: '#1b1b28', w: '#ffffff', p: '#ff8fb1' }, rows: [
      '............', '.o........o.', '.oo......oo.', '.oooddddooo.', '.oooooooooo.', '.okwooookwo.',
      '.oooooooooo.', '.ooooppoooo.', '.ooookkoooo.', '..oooooooo..', '...oooooo...', '............'] },
    dog: { pal: { b: '#8a5a3b', l: '#c99a6b', k: '#1b1b28', p: '#ff6f91' }, rows: [
      '............', '..bb....bb..', '.bbbllllbbb.', '.bbllllllbb.', '.bblkllklbb.', '..bllllllb..',
      '..lllkklll..', '...llllll...', '...llppll...', '....llll....', '............', '............'] },
    fish: { pal: { t: '#3fb6d9', d: '#1e7f99', k: '#1b1b28', w: '#ffffff' }, rows: [
      '............', '............', '............', '...tttt.....', '.tttttttt.dd', 'ttkwtttttddd',
      'tttttttttdd.', '.tttttttt.dd', '...tttt.....', '............', '............', '............'] },
    smile: { pal: { h: '#3b2a1e', f: '#f2c6a0', k: '#1b1b28', m: '#9e3040', w: '#ffffff', j: '#ff4fb4' }, rows: [
      '............', '...hhhhhh...', '..hhhhhhhh..', '..hffffffh..', '..fkffffkf..', '..ffffffff..',
      '..fmwwwwmf..', '..ffmmmmff..', '...ffffff...', '....ffff....', '...jjjjjj...', '..jjjjjjjj..'] },
    cry: { pal: { h: '#1e2a3b', f: '#f2c6a0', k: '#1b1b28', m: '#9e3040', t: '#5fc8ff', j: '#6b7a99' }, rows: [
      '............', '...hhhhhh...', '..hhhhhhhh..', '..hffffffh..', '..fkffffkf..', '..ftfffftf..',
      '..ftffffff..', '..fffmmfff..', '...fmffmf...', '....ffff....', '...jjjjjj...', '..jjjjjjjj..'] },
    robot: { pal: { g: '#8e9bb0', d: '#4a5568', r: '#ff4d5e', y: '#ffd36b' }, rows: [
      '.....y......', '.....g......', '..gggggggg..', '..gddddddg..', '..gdrddrdg..', '..gddddddg..',
      '..gdggggdg..', '..gggggggg..', '...dddddd...', '..gggggggg..', '.gg.gggg.gg.', '...g....g...'] },
    framed: { pal: { y: '#e8c25a', b: '#b8862b', s: '#7fb7ff', m: '#3d8b5a', u: '#ffd36b' }, rows: [
      'yyyyyyyyyyyy', 'ybbbbbbbbbby', 'ybssssssusby', 'ybssssssssby', 'ybssssmsssby', 'ybsssmmmssby',
      'ybssmmmmmsby', 'ybsmmmmmmmby', 'ybmmmmmmmmby', 'ybbbbbbbbbby', 'yyyyyyyyyyyy', '............'] },
    graffiti: { pal: { w: '#5a5f6e', n: '#ff4fb4', t: '#37c3d6', y: '#ffd36b' }, rows: [
      'wwwwwwwwwwww', 'wwnnwwwttwww', 'wnnnnwttttww', 'wnwwnwtwwtww', 'wnnnnwttttww', 'wnwwnwtwwtyw',
      'wnwwnwtwwtyw', 'wwwwwwwwwwyw', 'wnwwwwtwwwww', 'wwwwwwwwwwww', 'wwwwwwwwwwww', '............'] },
    flower: { pal: { g: '#6cc070', p: '#ff6fae', y: '#ffd84a' }, rows: [
      '............', '....pppp....', '...pppppp...', '..ppyyyypp..', '..ppyyyypp..', '...pppppp...',
      '....pppp....', '.....gg.....', '..gg.gg.....', '...gggg.....', '.....gg.....', '.....gg.....'] },
    paste: { pal: { s: '#c9d1dc', d: '#7d8899', n: '#ff4fb4', k: '#1b1b28' }, rows: [
      '............', '..ssssssss..', '..sdddddds..', '..ssssssss..', '..snnnnnns..', '..snkkkkns..',
      '..snnnnnns..', '..ssssssss..', '..ssssssss..', '..sdsdsdss..', '..ssssssss..', '............'] },
    vinyl: { pal: { k: '#15151c', g: '#3a3a48', r: '#ff4d5e', w: '#e8edf6' }, rows: [
      '....kkkk....', '..kkkkkkkk..', '.kkgkkkkgkk.', '.kgkkrrkkgk.', 'kkkkrrrrkkkk', 'kkgkrwwrkgkk',
      'kkkkrrrrkkkk', '.kgkkrrkkgk.', '.kkgkkkkgkk.', '..kkkkkkkk..', '....kkkk....', '............'] },
    tower: { pal: { b: '#4a5a78', w: '#ffd36b', n: '#ff4fb4', a: '#37c3d6' }, rows: [
      '.....nn.....', '.....bb.....', '....bbbb....', '....bwbw....', '....bbbb....', '...bbwbwb...',
      '...bbbbbb...', '...bwbwbb...', '..bbbbbbbb..', '..bwbwbwbb..', '..bbbbbbbb..', 'aaaaaaaaaaaa'] },
    diver: { pal: { d: '#37c3d6', k: '#1b2a3a', g: '#ffd36b', t: '#8e9bb0', f: '#ff4fb4' }, rows: [
      '...tttt.....', '.ddddddddgg.', 'fddddddddgk.', 'fdddddddddd.', '.ddd..ddd...', 'ff....ff....'] },
    sardine: { pal: { s: '#c3d3e6', k: '#1b1b28', d: '#7d8aa8' }, rows: [
      '.ssss.d', 'kssssdd', '.ssss.d'] },
    grouper: { pal: { g: '#6b8f4e', p: '#4a6b36', k: '#111111', m: '#8a3b3b', d: '#56753f' }, rows: [
      '....gggggg......', '..gggggggggg..dd', '.gkggggggggggddd', 'gggggppgggggggdd', 'ggggggggppgggddd',
      '.gggmmggggggg.dd', '..gggggggggg...d', '....gggggg......'] },
    locker: { pal: { m: '#5a6478', l: '#8e9bb0', k: '#2a3142', y: '#ffd36b' }, rows: [
      'kkkkkkkkkk', 'kmmmmmmmmk', 'kmllllllmk', 'kmmmmmmmmk', 'kmllllllmk', 'kmmmmmmmmk', 'kmmmmmmymk',
      'kmmmmmmmmk', 'kmllllllmk', 'kmmmmmmmmk', 'kmllllllmk', 'kmmmmmmmmk', 'kkkkkkkkkk'] },
    lockerOpen: { pal: { m: '#5a6478', k: '#2a3142', d: '#11151f' }, rows: [
      'kkkkkkkkkk', 'kddddddddk', 'kddddddddk', 'kddddddddk', 'kddddddddk', 'kddddddddk', 'kddddddddk',
      'kddddddddk', 'kddddddddk', 'kddddddddk', 'kddddddddk', 'kddddddddk', 'kkkkkkkkkk'] },
    jelly: { pal: { p: '#ff8fd1', w: '#ffffff' }, rows: [
      '..pppp..', '.pppppp.', 'pppwpppp', 'pppppppp', 'p.p.p.p.', 'p.p.p.p.', '.p.p.p.p', '........'] },
    alien: { pal: { a: '#9be36b', k: '#14201a', w: '#ffffff', s: '#2b3a5c', r: '#ff4d5e', b: '#111827' }, rows: [
      '...aaaaaa...', '..aaaaaaaa..', '.aakkaakkaa.', '.aakkaakkaa.', '.aaaaaaaaaa.', '..aawwwwaa..',
      '...aaaaaa...', '..sswrwss...', '.ssswrrwsss.', '.sssswrssss.', '.ssssrrssss.', 'a.ssssssss.a',
      '..ssssssss..', '..sss..sss..', '..sss..sss..', '..bbb..bbb..'] },
  };

  const cache = new Map();
  function spriteCanvas(name, opts) {
    const d = (opts && opts.desat) ? Math.round(opts.desat * 4) / 4 : 0;
    const palKey = opts && opts.pal ? JSON.stringify(opts.pal) : '';
    const tint = (opts && opts.tint) || '';
    const key = name + '|' + d + '|' + palKey + '|' + tint;
    if (cache.has(key)) return cache.get(key);
    const spr = SPR[name];
    const pal = Object.assign({}, spr.pal, opts && opts.pal);
    const h = spr.rows.length, w = spr.rows[0].length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const ch = spr.rows[j][i];
        if (ch === '.' || !pal[ch]) continue;
        x.fillStyle = d ? desat(pal[ch], d) : pal[ch];
        x.fillRect(i, j, 1, 1);
      }
    }
    // 染色（例如金色）：只覆蓋已有像素
    if (tint) {
      x.globalCompositeOperation = 'source-atop';
      x.fillStyle = tint;
      x.fillRect(0, 0, w, h);
      x.globalCompositeOperation = 'source-over';
    }
    cache.set(key, c);
    return c;
  }
  function sprite(ctx, name, x, y, opts) {
    opts = opts || {};
    const c = spriteCanvas(name, opts);
    const s = opts.scale || 1;
    ctx.save();
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    if (opts.flip) {
      ctx.translate(Math.round(x) + c.width * s, Math.round(y));
      ctx.scale(-1, 1);
      ctx.drawImage(c, 0, 0, c.width * s, c.height * s);
    } else {
      ctx.drawImage(c, Math.round(x), Math.round(y), c.width * s, c.height * s);
    }
    ctx.restore();
  }
  const spriteSize = (name) => ({ w: SPR[name].rows[0].length, h: SPR[name].rows.length });
  // 其他模組可以登記自己的精靈圖（例如 chars.js 的角色像素模組）
  const define = (name, spr) => { SPR[name] = spr; };
  const hasSprite = (name) => !!SPR[name];

  // ---------- 畫面 ----------
  const view = { canvas: null, ctx: null, low: null, lctx: null, scale: 1, dpr: 1, cssW: 0, cssH: 0, shake: 0 };

  function setup(canvas) {
    view.canvas = canvas;
    view.ctx = canvas.getContext('2d');
    view.low = document.createElement('canvas');
    view.low.width = W; view.low.height = H;
    view.lctx = view.low.getContext('2d');
    resize();
  }
  function resize() {
    const c = view.canvas;
    const rect = c.parentElement.getBoundingClientRect();
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    view.cssW = Math.max(200, rect.width);
    view.cssH = view.cssW * H / W;
    c.style.width = view.cssW + 'px';
    c.style.height = view.cssH + 'px';
    c.width = Math.round(view.cssW * view.dpr);
    c.height = Math.round(view.cssH * view.dpr);
    view.scale = c.width / W;
  }
  function present() {
    const { ctx, canvas, low } = view;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    let ox = 0, oy = 0;
    if (view.shake > 0.2 && !IE.Pixel.reducedMotion) {
      ox = (Math.random() - 0.5) * view.shake * view.scale;
      oy = (Math.random() - 0.5) * view.shake * view.scale;
    }
    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(low, ox, oy, canvas.width, canvas.height);
    view.shake *= 0.85;
  }
  // 在高解像度層繪畫清晰文字（座標以 320×180 為單位）
  function text(str, x, y, o) {
    o = o || {};
    const ctx = view.ctx, s = view.scale;
    const size = (o.size || 8) * s;
    const family = o.font === 'num' ? '"VT323", ui-monospace, monospace'
      : o.font === 'pixel' ? '"Silkscreen", "VT323", monospace'
        : '"Noto Sans HK", "PingFang HK", "Microsoft JhengHei", sans-serif';
    ctx.save();
    ctx.font = (o.weight || 700) + ' ' + size + 'px ' + family;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'top';
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const lines = String(str).split('\n');
    const lh = (o.lineHeight || 1.25) * size;
    lines.forEach((ln, i) => {
      const yy = y * s + i * lh;
      if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = 8 * view.dpr; }
      if (o.stroke) {
        ctx.lineWidth = Math.max(2, size / 6);
        ctx.strokeStyle = o.stroke;
        ctx.lineJoin = 'round';
        ctx.strokeText(ln, x * s, yy);
      }
      ctx.fillStyle = o.color || '#e8edf6';
      ctx.fillText(ln, x * s, yy);
    });
    ctx.restore();
  }
  function measure(str, o) {
    o = o || {};
    const ctx = view.ctx, s = view.scale;
    const family = o.font === 'num' ? '"VT323", monospace' : '"Noto Sans HK", sans-serif';
    ctx.save();
    ctx.font = (o.weight || 700) + ' ' + (o.size || 8) * s + 'px ' + family;
    const w = ctx.measureText(str).width / s;
    ctx.restore();
    return w;
  }

  // ---------- 粒子 ----------
  function particles() {
    const list = [];
    return {
      list,
      add(p) { list.push(Object.assign({ vx: 0, vy: 0, g: 0, life: 1, age: 0, size: 1, color: '#fff', drag: 1 }, p)); },
      burst(x, y, n, o) {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, sp = (o.speed || 40) * (0.3 + Math.random() * 0.7);
          this.add(Object.assign({}, o, { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0) }));
        }
      },
      update(dt) {
        for (let i = list.length - 1; i >= 0; i--) {
          const p = list[i];
          p.age += dt;
          if (p.age >= p.life) { list.splice(i, 1); continue; }
          if (p.tx != null) {
            const k = Math.min(1, dt * (p.home || 4));
            p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k;
          } else {
            p.vy += p.g * dt; p.vx *= p.drag; p.vy *= p.drag;
            p.x += p.vx * dt; p.y += p.vy * dt;
          }
        }
      },
      draw(ctx) {
        list.forEach((p) => {
          const a = 1 - p.age / p.life;
          ctx.globalAlpha = Math.max(0, a);
          ctx.fillStyle = p.color;
          const sz = p.shrink ? Math.max(1, Math.round(p.size * a)) : p.size;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), sz, sz);
        });
        ctx.globalAlpha = 1;
      },
    };
  }

  // 細小的像素數字（3×5），畫在低解像度層
  const DIGITS = {
    0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001',
    5: '111100111001111', 6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111',
    '+': '000010111010000', '-': '000000111000000', '$': '011110010011110', 'x': '000101010101000', '.': '000000000000010',
  };
  function digits(ctx, str, x, y, color, scale) {
    const s = scale || 1;
    ctx.fillStyle = color;
    let cx = x;
    for (const ch of String(str)) {
      const pat = DIGITS[ch];
      if (pat) {
        for (let i = 0; i < 15; i++) if (pat[i] === '1') ctx.fillRect(cx + (i % 3) * s, y + Math.floor(i / 3) * s, s, s);
      }
      cx += 4 * s;
    }
  }

  // 按字數換行（中文每字約等寬）
  function wrap(str, n) {
    const out = [];
    String(str).split('\n').forEach((line) => {
      for (let i = 0; i < line.length; i += n) out.push(line.slice(i, i + n));
    });
    return out.join('\n');
  }

  IE.Pixel = {
    W, H, view, setup, resize, present, text, measure, sprite, spriteSize, define, hasSprite, spriteCanvas, particles, digits, wrap,
    mix, desat, rgba, hexToRgb,
    reducedMotion: typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
})(window.IE = window.IE || {});
