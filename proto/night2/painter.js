// 創作之夜原型第二版：畫布。整幅畫就是一個大色輪：每一筆沿着一圈畫，由外圈到內圈，四筆疊成年輪。
//   素材畫在它的情緒在色輪上的位置；「承」沿着圈走，「轉」橫過中心，「合」回到起點把圈合上。
//   媒材決定筆觸（紙＝短筆、聲＝波紋、影＝色塊、身＝圓點和滴落、數＝格子），星越多筆觸越多。
// 計分時一張一張畫上去；收工時拍下來，和歌、詩一起成為作品。重播（分享連結）時用同一個種子，畫出同一幅畫。
(function (root) {
  'use strict';
  const IE = root.IE = root.IE || {};
  const W = 320, H = 200, CX = W / 2, CY = H / 2;
  const RINGS = [0.9, 0.68, 0.46, 0.26];
  let cv = null, cx = null, r = Math.random;
  const D = () => IE.DATA;
  const WHEEL = () => D().WHEEL;

  function rgb(hex) { const h = hex.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function shade(hex, f, a) {
    const c = rgb(hex);
    const m = (v) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))));
    return 'rgba(' + m(c[0]) + ',' + m(c[1]) + ',' + m(c[2]) + ',' + (a == null ? 1 : a) + ')';
  }
  function mix(h1, h2, k) { const a = rgb(h1), b = rgb(h2); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join(''); }
  const gauss = () => (r() + r() + r() - 1.5) / 1.5;
  const col = (t) => D().TAGS[t].color;
  const wpos = (t) => WHEEL().indexOf(t);
  const wdist = (a, b) => { const d = Math.abs(wpos(a) - wpos(b)); return Math.min(d, 10 - d); };
  const angleOf = (t) => -Math.PI / 2 + (wpos(t) / 10) * Math.PI * 2;
  const ringPoint = (a, k) => [CX + Math.cos(a) * 140 * RINGS[k], CY + Math.sin(a) * 88 * RINGS[k]];

  function init(canvas) { cv = canvas; cv.width = W; cv.height = H; cx = cv.getContext('2d'); cx.imageSmoothingEnabled = false; }
  function attach(canvas) { init(canvas); }
  // 空白的畫布：紙紋和鉛筆畫的色輪參考線
  function blank(seed) {
    r = IE.Proto2.rng(seed || 7);
    cx.globalAlpha = 1;
    cx.fillStyle = '#efe5cf';
    cx.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) {
      cx.fillStyle = r() < 0.55 ? 'rgba(120,96,60,0.07)' : 'rgba(255,255,255,0.28)';
      cx.fillRect((r() * W) | 0, (r() * H) | 0, 1, 1);
    }
    cx.fillStyle = 'rgba(90,80,70,0.09)';
    RINGS.forEach((f, k) => { for (let a = 0; a < Math.PI * 2; a += 0.06 / f) { const p = ringPoint(a, k); cx.fillRect(p[0] | 0, p[1] | 0, 1, 1); } });
    WHEEL().forEach((t) => { const p = ringPoint(angleOf(t), 0); cx.fillStyle = shade(col(t), 0.2, 0.35); cx.fillRect((p[0] | 0) - 1, (p[1] | 0) - 1, 3, 3); });
  }

  // ---------- 筆觸 ----------
  function disc(x, y, rad, c) { cx.fillStyle = c; for (let dy = -rad; dy <= rad; dy++) { const w = Math.round(Math.sqrt(rad * rad - dy * dy)); cx.fillRect(x - w, y + dy, 2 * w + 1, 1); } }
  function dab(d, med) {
    const x = d.x | 0, y = d.y | 0, big = d.size > 1 ? 1 : 0;
    cx.fillStyle = d.col;
    if (d.line) { cx.fillRect(x, y, 2, 2); return; }
    if (med === 'paper') { const len = 3 + d.len; for (let i = 0; i < len; i++) cx.fillRect(x + i, y + d.dir * (i >> 1), 2, 1 + big); }
    else if (med === 'sound') { for (let i = 0; i < 9; i++) cx.fillRect(x + i, y + Math.round(Math.sin((x + i) / 2.2) * 2), 1, 1 + big); }
    else if (med === 'image') cx.fillRect(x, y, 3 + d.len, 2 + (d.len >> 1));
    else if (med === 'body') { disc(x, y, 1 + (d.len % 3), d.col); if (d.drip) cx.fillRect(x, y, 1, 4 + d.len * 2); }
    else if (med === 'data') cx.fillRect(x - (x % 3), y - (y % 3), 2, 2);
    else cx.fillRect(x, y, 2, 2);
  }

  // 一筆的構圖：每張素材的位置（它的情緒在色輪上的角度、這一筆的圈）、連接的筆觸
  // play = { cards: [{uid, tags, star, medium}], links: ['same'|'near'|'zhuan'|'fix'...], he: bool, ring: 0..3 }
  function planPlay(play) {
    const k = Math.min(3, play.ring || 0), plans = {}, list = [];
    let prevTag = null, prevPt = null;
    play.cards.forEach((c, i) => {
      // 錨點：這張素材用哪一種情緒接上前一張（承：最近的；轉：相對的）
      let tag = c.tags[0];
      if (prevTag) {
        const link = play.links[i - 1];
        const cand = c.tags.slice().sort((a, b) => (link === 'zhuan' ? Math.abs(5 - wdist(prevTag, a)) - Math.abs(5 - wdist(prevTag, b)) : wdist(prevTag, a) - wdist(prevTag, b)));
        tag = cand[0];
      }
      const ang = angleOf(tag) + gauss() * 0.06;
      const at = ringPoint(ang, k);
      const dabs = [];
      // 第一張：先沿着這一圈刷一層很淡的底色（起的顏色），令只有一筆的畫也完整
      if (!i) {
        const base = col(tag);
        for (let a = 0; a < Math.PI * 2; a += 0.018) {
          const p = ringPoint(a, k);
          dabs.push({ x: p[0] + gauss() * 9, y: p[1] + gauss() * 7, col: shade(base, 0.45 + r() * 0.2, 0.16 + r() * 0.1), size: 2, len: (r() * 6) | 0, dir: 1 });
        }
      }
      // 連接的筆觸
      if (prevPt) {
        const link = play.links[i - 1];
        const steps = 34;
        const c1 = col(prevTag), c2 = col(tag);
        for (let s = 0; s <= steps; s++) {
          const u = s / steps;
          let x, y;
          if (link === 'zhuan') {
            // 轉：橫過中心的一道（稍為彎向中心）
            const mx = CX + (r() - 0.5) * 10, my = CY + (r() - 0.5) * 8;
            x = (1 - u) * (1 - u) * prevPt[0] + 2 * u * (1 - u) * mx + u * u * at[0];
            y = (1 - u) * (1 - u) * prevPt[1] + 2 * u * (1 - u) * my + u * u * at[1];
            x += Math.sin(u * 22) * 2.5;
          } else {
            // 承：沿着圈走
            const a0 = Math.atan2((prevPt[1] - CY) / 88, (prevPt[0] - CX) / 140), a1 = Math.atan2((at[1] - CY) / 88, (at[0] - CX) / 140);
            let da = a1 - a0; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
            const p = ringPoint(a0 + da * u, k); x = p[0]; y = p[1];
          }
          const cc = mix(c1, c2, u);
          for (let j = 0; j < (link === 'zhuan' ? 4 : 3); j++) dabs.push({ x: x + gauss() * 2.6, y: y + gauss() * 2.6, col: shade(cc, (r() - 0.5) * 0.3, link === 'fix' && s % 3 === 0 ? 0.25 : 0.85), line: true });
        }
      }
      // 素材本身：一團筆觸
      const n = Math.round(80 + c.star * 36);
      const spread = 12 + c.star * 3.4 + (3 - k) * 3;
      for (let j = 0; j < n; j++) {
        const t = c.tags[j % c.tags.length];
        dabs.push({ x: at[0] + gauss() * spread * 1.4, y: at[1] + gauss() * spread, col: shade(col(t), (r() - 0.45) * 0.55, 0.72 + r() * 0.26), size: r() < 0.3 ? 2 : 1, len: (r() * 6) | 0, dir: r() < 0.5 ? 1 : -1, drip: r() < 0.1 });
      }
      const plan = { uid: c.uid, dabs, med: c.medium, at, tag };
      plans[c.uid] = plan; list.push(plan);
      prevTag = tag; prevPt = at;
    });
    // 合：由最後一張回到第一張，把圈合上（淡淡的一道）
    let close = null;
    if (play.he && list.length >= 3) {
      const a = list[list.length - 1], b = list[0];
      close = { uid: 'he', med: 'line', at: b.at, dabs: [] };
      const a0 = Math.atan2((a.at[1] - CY) / 88, (a.at[0] - CX) / 140), a1 = Math.atan2((b.at[1] - CY) / 88, (b.at[0] - CX) / 140);
      let da = a1 - a0; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      for (let s = 0; s <= 40; s++) { const p = ringPoint(a0 + da * (s / 40), k); close.dabs.push({ x: p[0] + gauss() * 1.5, y: p[1] + gauss() * 1.5, col: shade(mix(col(a.tag), col(b.tag), s / 40), 0.1, 0.9), line: true }); }
    }
    return { plans, list, close };
  }
  // 逐步畫出（ms 毫秒）；ms 為 0 即時畫完
  function drawPlan(plan, ms) {
    return new Promise((resolve) => {
      if (!plan || !plan.dabs.length) { resolve(); return; }
      if (ms <= 0) { plan.dabs.forEach((d) => dab(d, plan.med)); resolve(); return; }
      const start = performance.now();
      let done = 0;
      const step = (now) => {
        const k = Math.min(1, (now - start) / ms);
        const upto = Math.round(k * plan.dabs.length);
        for (; done < upto; done++) dab(plan.dabs[done], plan.med);
        if (k < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
  }
  // 裝飾（不影響重播的主要畫面）：閃光、阿 Ken 的噴漆、評審劃掉
  function glint(n, color) {
    for (let i = 0; i < (n || 40); i++) {
      const x = (Math.random() * W) | 0, y = (Math.random() * H) | 0;
      cx.fillStyle = color || 'rgba(255,214,90,0.9)';
      cx.fillRect(x, y, 1, 1);
      if (Math.random() < 0.4) { cx.fillRect(x - 1, y, 3, 1); cx.fillRect(x, y - 1, 1, 3); }
    }
  }
  function spray(at, color) {
    const x0 = at ? at[0] : CX, y0 = at ? at[1] : CY;
    for (let i = 0; i < 140; i++) { const a = Math.random() * Math.PI * 2, d = Math.pow(Math.random(), 0.6) * 22; cx.fillStyle = shade(color || '#ff4fb4', (Math.random() - 0.5) * 0.4, 0.75); cx.fillRect((x0 + Math.cos(a) * d) | 0, (y0 + Math.sin(a) * d * 0.7) | 0, 1, 1); }
  }
  function strike(at) {
    const x = at ? at[0] | 0 : (Math.random() * W) | 0, y = at ? at[1] | 0 : (Math.random() * H) | 0;
    for (let i = -12; i < 12; i++) { cx.fillStyle = 'rgba(70,70,80,0.55)'; cx.fillRect(x + i, y + (i >> 2), 2, 2); }
  }
  function sign(text) {
    cx.fillStyle = 'rgba(40,32,24,0.65)';
    cx.font = '8px monospace';
    cx.textAlign = 'right';
    cx.fillText(text || '', W - 6, H - 6);
  }
  function snapshot() { return cv.toDataURL('image/png'); }
  function screenPoint(p) { const b = cv.getBoundingClientRect(); return { x: b.left + (p[0] / W) * b.width, y: b.top + (p[1] / H) * b.height }; }

  IE.Painter = { W, H, init, attach, blank, planPlay, drawPlan, glint, spray, strike, sign, snapshot, screenPoint };
})(typeof window !== 'undefined' ? window : globalThis);
