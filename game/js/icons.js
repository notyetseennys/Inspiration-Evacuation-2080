// 像素圖示：靈感物件（之後的道具也會用）。12×12 的格子，k = 外框、a = 主色、b = 暗色、c = 亮色、w = 白色。
// IE.Icons.url(形狀, 調色盤) 回傳快取的 dataURL，用 <img> 顯示並以 CSS 放大（image-rendering: pixelated）。
(function (IE) {
  'use strict';
  const SHAPES = {
    can: ['....kk......', '...kcck.....', '...kkkk.....', '..kaaaak....', '..kacaak....', '..kacaak....', '..kaaaak....', '..kbbbbk....', '..kaaaak....', '..kacaak....', '..kaaaak....', '...kkkk.....'],
    speaker: ['.kkkkkkkk...', '.kbbbbbbk...', '.kbkkkkbk...', '.kbkcckbk...', '.kbkcckbk...', '.kbkkkkbk...', '.kbbbbbbk...', '.kbkkkkbk...', '.kbkaakbk...', '.kbkkkkbk...', '.kbbbbbbk...', '.kkkkkkkk...'],
    book: ['............', '.kkkkkkkkk..', '.kaaaaaaaak.', '.kaccccccak.', '.kaaaaaaaak.', '.kaccccaaak.', '.kaaaaaaaak.', '.kaaaaaaaak.', '.kbbbbbbbbk.', '.kwwwwwwwwk.', '.kkkkkkkkkk.', '............'],
    cat: ['.k......k...', '.kk....kk...', '.kakkkkak...', '.kaaaaaak...', '.kawaawak...', '.kakaakak...', '.kaaccaak...', '..kaaaak....', '.kaaaaaak...', '.kabaabak..k', '.kaaaaaakkk.', '..kk..kk....'],
    mask: ['............', '..kkkkkkkk..', '.kaaaaaaaak.', 'kaaccaaccaak', 'kakkcaackkak', 'kaaaaaaaaaak', '.kaaabbaaak.', '.kaaaaaaaak.', '..kaabbaak..', '...kaaaak...', '....kkkk....', '............'],
    lamp: ['....kkkk....', '...kaaaak...', '..kaaaaaak..', '.kaacaaaaak.', '.kkkkkkkkkk.', '....kcck....', '....kcck....', '.....kk.....', '.....bb.....', '.....bb.....', '...kbbbbk...', '...kkkkkk...'],
    bowl: ['............', '....c..c....', '...c..c.....', '....c..c....', 'kkkkkkkkkkkk', 'kaaaaaaaaaak', '.kaaccaaaak.', '.kaaaaaaaak.', '..kbbbbbbk..', '...kkkkkk...', '....kbbk....', '...kkkkkk...'],
    paper: ['.kkkkkkkk...', '.kwwwwwwkk..', '.kwccccwwkk.', '.kwwwwwwwwk.', '.kwcccccwwk.', '.kwwwwwwwwk.', '.kwccccccwk.', '.kwwwwwwwwk.', '.kwaaaawwwk.', '.kwwwwwwwwk.', '.kkkkkkkkkk.', '............'],
    whistle: ['............', '............', '..kkkkkkk...', '.kaaaaaaak..', 'kaacaaaaakkk', 'kaaaaaaaaaak', 'kaaakkkaaakk', '.kaak..kak..', '..kk....k...', '.......b....', '......b.....', '............'],
    monitor: ['kkkkkkkkkkkk', 'kbbbbbbbbbbk', 'kbaaaaaaaabk', 'kbacccaaaabk', 'kbaaaaaccabk', 'kbacaaaaaabk', 'kbaaaaaaaabk', 'kbbbbbbbbbbk', 'kkkkkkkkkkkk', '....kbbk....', '..kkkkkkkk..', '............'],
    guitar: ['.........kk.', '........kbk.', '.......kbk..', '......kbk...', '..kkk.kk....', '.kaaakk.....', 'kaacaak.....', 'kacwcak.....', 'kaacaak.....', '.kaaak......', '..kkk.......', '............'],
    box: ['............', '.kkkkkkkkkk.', '.kcccccccck.', '.kkkkkkkkkk.', '.kaaaaaaaak.', '.kaaabbaaak.', '.kaaabbaaak.', '.kaaaaaaaak.', '.kaaaaaaaak.', '.kbbbbbbbbk.', '.kkkkkkkkkk.', '............'],
    pen: ['..........kk', '.........kck', '........kaak', '.......kaak.', '......kaak..', '.....kaak...', '....kaak....', '...kaak.....', '..kbak......', '..kwk.......', '.kk.........', 'k...........'],
    gun: ['............', '............', 'kkkkkkkkk...', 'kaaaaaaaakkk', 'kacccaaaabbc', 'kaaaaaaaakkk', 'kkkkbbkkk...', '....bbk.....', '....bbk.....', '....kkk.....', '............', '............'],
    key: ['............', '..kkkk......', '.kaaaak.....', 'kaakkaak....', 'kak..kak....', 'kaakkaak....', '.kaaaakkkkkk', '..kkkkaaaaak', '......kkakak', '.......kk.kk', '............', '............'],
    film: ['kkkkkkkkkkkk', 'kwkwkwkwkwkk', 'kkkkkkkkkkkk', 'kaaaakaaaakk', 'kacaakacaakk', 'kaaaakaaaakk', 'kbbbbkbbbbkk', 'kkkkkkkkkkkk', 'kwkwkwkwkwkk', 'kkkkkkkkkkkk', '............', '............'],
    radio: ['.........k..', '........k...', '.......k....', 'kkkkkkkkkkkk', 'kaaaaaaaaaak', 'kakkkkkaccak', 'kakbbbkaccak', 'kakbbbkaaaak', 'kakkkkkaccak', 'kaaaaaaaaaak', 'kkkkkkkkkkkk', '.kk......kk.'],
    bottle: ['....kkkk....', '....kwwk....', '....kkkk....', '...kaaaak...', '..kaaaaaak..', '..kwwwwwwk..', '..kwcccwwk..', '..kwwwwwwk..', '..kaaaaaak..', '..kaaaaaak..', '..kbbbbbbk..', '...kkkkkk...'],
    hand: ['...k.k.k....', '..kakakak...', '..kakakakk..', '..kakakakak.', '..kaaaaakak.', 'k.kaaaaaaak.', 'kakaaaaaaak.', '.kaaaaaaaak.', '..kaaaaaak..', '...kaaaaak..', '....kbbbk...', '....kkkkk...'],
    typewriter: ['...kkkkkk...', '...kwwwwk...', '...kwccwk...', '.kkkkkkkkkk.', 'kaaaaaaaaaak', 'kacacacacaak', 'kaaaaaaaaaak', 'kacacacacaak', 'kabbbbbbbbak', 'kaaaaaaaaaak', 'kkkkkkkkkkkk', '............'],
    cup: ['....c..c....', '...c..c.....', '....c..c....', '.kkkkkkkk...', '.kwwwwwwkkk.', '.kwaaaawk.k.', '.kwwwwwwk.k.', '.kwwwwwwkkk.', '..kwwwwk....', 'kkkkkkkkkkk.', '.kbbbbbbbk..', '..kkkkkkk...'],
    shredder: ['..kkkkkkkk..', '..kwwwwwwk..', '..kwccccwk..', 'kkkkkkkkkkkk', 'kaaaaaaaaaak', 'kaaaaaaccaak', 'kbbbbbbbbbbk', 'kkkkkkkkkkkk', '.w.w.w.w.w..', '.w.w.w.w.w..', 'w.w.w.w.w...', '............'],
    shard: ['......k.....', '.....kak....', '....kaaak...', '....kacak...', '...kaacak...', '...kaaabk...', '..kaacbbk...', '..kaabbbk...', '.kaaabbbbk..', '.kabbbbbbk..', 'kkkkkkkkkk..', '............'],
    map: ['kkkkkkkkkkkk', 'kccbccccbcck', 'kcaabccaabck', 'kcaacbcaaack', 'kcbbccbbccck', 'kccaacbccaak', 'kcaabbcaabck', 'kccaacbbcack', 'kcbcccbcccck', 'kkkkkkkkkkkk', '............', '............'],
    card: ['............', 'kkkkkkkkkkkk', 'kwwwwwwwwwwk', 'kwaaawwwwwwk', 'kwaaawccccwk', 'kwaaawwwwwwk', 'kwwwwwccccwk', 'kwbbbbbbbbwk', 'kwwwwwwwwwwk', 'kkkkkkkkkkkk', '............', '............'],
    phone: ['..kkkkkkk...', '..kbbbbbk...', '..kaaaaak...', '..kacccak...', '..kaaaaak...', '..kacccak...', '..kaaaaak...', '..kacaaak...', '..kaaaaak...', '..kbbbbbk...', '..kbbcbbk...', '..kkkkkkk...'],
    clock: ['...kkkkkk...', '..kaaaaaak..', '.kaaacaaaak.', 'kaaaacaaaaak', 'kaaaacaaaaak', 'kaaaacckaaak', 'kaaaaaaaaaak', 'kaaaaaaaaaak', '.kaaaaaaaak.', '..kaaaaaak..', '...kkkkkk...', '..kk....kk..'],
    camera: ['............', '....kkkk....', '.kkkkbbkkkk.', 'kaaaaaaaaaak', 'kaaakkkkaaak', 'kaakwccwkaak', 'kaakcwwckaak', 'kaakwccwkaak', 'kaaakkkkaaak', 'kaaaaaaaaaak', 'kkkkkkkkkkkk', '............'],
    coat: ['...kk..kk...', '..kaakkaak..', '.kaaacaaaak.', 'kaaaacaaaaak', 'kakaacaaakak', 'kakaacaaakak', 'kakaacaaakak', 'kakaacaaakak', 'kkkaacaaakkk', '..kaacaaak..', '..kbbbbbbk..', '..kkkkkkkk..'],
    weight: ['....kkkk....', '...kk..kk...', '...k....k...', '..kkkkkkkk..', '..kaaaaaak..', '.kaacaaaaak.', '.kaacaaaaak.', 'kaaaaaaaaaak', 'kaaaaaaaaaak', 'kbbbbbbbbbbk', 'kkkkkkkkkkkk', '............'],
    brush: ['..........kk', '.........kbk', '........kbk.', '.......kbk..', '......kbk...', '.....kbk....', '....kkk.....', '...kccck....', '..kaaack....', '.kaaaak.....', 'kaaakk......', 'kkkk........'],
    mirror: ['...kkkkkk...', '..kbbbbbbk..', '.kbcccwcabk.', '.kbccwcaabk.', '.kbcwcaaabk.', '.kbwcaaaabk.', '.kbcaaaaabk.', '.kbaaaaaabk.', '..kbbbbbbk..', '...kkkkkk...', '.....kk.....', '...kkkkkk...'],
    cube: ['....kkkk....', '..kkbbbbkk..', 'kkbbbbbbbbkk', 'kakkbbbbkkck', 'kaaakkkkccck', 'kaaaaakcccck', 'kaaaaakcccck', 'kaaaaakcccck', 'kaaaaakcccck', '.kkaaakcckk.', '...kkakkk...', '.....k......'],
    stone: ['...kkkkkk...', '..kaaaaaak..', '.kaaaaaaaak.', '.kaacccaaak.', '.kaaacaaaak.', '.kaaacaaaak.', '.kaaaaaaaak.', '.kaaaaaaaak.', '.kaaaaaaaak.', 'kkkkkkkkkkkk', 'kbbbbbbbbbbk', 'kkkkkkkkkkkk'],
    frame: ['kkkkkkkkkkkk', 'kaaaaaaaaaak', 'kakkkkkkkkak', 'kakcccccckak', 'kakccbccckak', 'kakcbbbcckak', 'kakbbbbbbkak', 'kakkkkkkkkak', 'kaaaaaaaaaak', 'kkkkkkkkkkkk', '............', '............'],
    gem: ['............', '...kkkkkk...', '..kccaaaak..', '.kcaaaaaabk.', 'kkkkkkkkkkkk', '.kaaaaaabk..', '..kaaaabk...', '...kaabk....', '....kbk.....', '.....k......', '............', '............'],
  };
  const cache = new Map();
  function url(shape, pal) {
    pal = pal || {};
    const key = shape + JSON.stringify(pal);
    if (cache.has(key)) return cache.get(key);
    const rows = (SHAPES[shape] || SHAPES.gem).map((r) => r.padEnd(12, '.').slice(0, 12));
    // 水平置中
    let min = 12, max = -1;
    rows.forEach((r) => { for (let i = 0; i < 12; i++) if (r[i] !== '.') { min = Math.min(min, i); max = Math.max(max, i); } });
    const off = Math.floor((12 - (max - min + 1)) / 2) - min;
    const P = Object.assign({ k: '#14141c', a: '#8e9bb0', b: '#4a5568', c: '#e8edf6', w: '#ffffff' }, pal);
    const cv = document.createElement('canvas');
    cv.width = 12; cv.height = 12;
    const x = cv.getContext('2d');
    rows.forEach((r, j) => { for (let i = 0; i < 12; i++) { const ch = r[i]; if (ch === '.' || !P[ch]) continue; x.fillStyle = P[ch]; x.fillRect(i + off, j, 1, 1); } });
    const u = cv.toDataURL();
    cache.set(key, u);
    return u;
  }
  // 靈感物件的 <img>
  function obj(id, size) {
    const o = IE.DATA.OBJ[id];
    if (!o) return '';
    return '<img class="px-icon r-' + o.rarity + '" src="' + url(o.icon, o.pal) + '" width="' + (size || 36) + '" height="' + (size || 36) + '" alt="">';
  }
  IE.Icons = { SHAPES, url, obj };
})(window.IE = window.IE || {});
