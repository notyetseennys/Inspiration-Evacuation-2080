// 看得見的作品（第十四期）：每一筆按配色畫一幅 12×8 的像素小畫，並起一個名字。
// 構圖隨配色改變：單色＝漸層、鄰近色＝橫向色帶、互補色＝對角分割、三色／分裂互補＝三塊色、四色＝四格、全光譜＝馬賽克、矛盾＝棋盤、草稿＝混濁。
(function (IE) {
  'use strict';
  const D = () => IE.DATA;
  const W = 12, H = 8;
  const col = (t) => (D().TAGS[t] ? D().TAGS[t].color : '#8d99b4');
  const nm = (t) => (D().TAGS[t] ? D().TAGS[t].name : t);
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // 把顏色調亮或調暗（k：−1 至 1）
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k));
    const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  function grid(form, pal, seed) {
    const R = rng(seed);
    const c = pal.length ? pal.map(col) : ['#5b6478'];
    const cell = (x, y) => {
      const j = (R() - 0.5) * 0.25;
      switch (form) {
        case 'mono': return shade(c[0], (y / (H - 1)) * 0.7 - 0.35 + j);
        case 'adj': return shade(c[Math.min(c.length - 1, Math.floor(y / H * c.length))], j);
        case 'comp': return shade(x / W + y / H < 1 ? c[0] : c[1] || c[0], j);
        case 'triad': case 'split': {
          const a = Math.atan2(y - H / 2 + 0.5, x - W / 2 + 0.5) + Math.PI;
          return shade(c[Math.floor(a / (2 * Math.PI) * c.length) % c.length], j);
        }
        case 'tetrad': return shade(c[(x < W / 2 ? 0 : 1) + (y < H / 2 ? 0 : 2)] || c[0], j);
        case 'full': return shade(c[Math.floor(R() * c.length)], j * 2);
        case 'paradox': return shade(c[(x + y) % 2] || c[0], j);
        default: return shade(c[Math.floor(R() * c.length)], -0.45 + j);
      }
    };
    const out = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) out.push({ x, y, f: cell(x, y) });
    return out;
  }
  function svg(form, pal, seed, cls) {
    const rects = grid(form, pal || [], seed || 1).map((p) => '<rect x="' + p.x + '" y="' + p.y + '" width="1" height="1" fill="' + p.f + '"/>').join('');
    return '<svg class="' + (cls || 'art-svg') + '" viewBox="0 0 ' + W + ' ' + H + '" shape-rendering="crispEdges" aria-hidden="true">' + rects + '</svg>';
  }
  function title(form, pal, n) {
    const p = (pal || []).map(nm);
    const no = '・第 ' + (n || 1) + ' 號';
    switch (form) {
      case 'mono': return '《純粹的' + p[0] + no + '》';
      case 'comp': return '《' + p[0] + '與' + p[1] + '》';
      case 'adj': return '《' + p[0] + '漸變成' + p[p.length - 1] + '》';
      case 'triad': return '《' + p.join('、') + '》';
      case 'split': return '《' + p[0] + '，在' + p[1] + '與' + p[2] + '之間》';
      case 'tetrad': return '《四重奏：' + p.join('') + '》';
      case 'full': return '《浮城群像' + no + '》';
      case 'paradox': return '《一體兩面：' + p.join('／') + '》';
      default: return '《草稿' + no + '》';
    }
  }
  IE.Artwork = { svg, title, shade };
})(window.IE = window.IE || {});
