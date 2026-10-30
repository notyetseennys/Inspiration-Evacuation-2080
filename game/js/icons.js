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
    // ---------- 第四期：商店貨品與家具 ----------
    burger: ['............', '...kkkkkk...', '..kccacack..', '.kaaaaaaaak.', '.kkkkkkkkkk.', '.kbbbbbbbbk.', '.kwwwwwwwwk.', '.kbbbbbbbbk.', '.kaaaaaaaak.', '..kkkkkkkk..', '............', '............'],
    can: ['....kkkk....', '...kcccck...', '...kkkkkk...', '...kaaaak...', '...kawwak...', '...kawwak...', '...kaaaak...', '...kbbbbk...', '...kaaaak...', '...kaaaak...', '...kkkkkk...', '............'],
    gift: ['...k...k....', '..kck.kck...', '...kkkkk....', '.kkkkckkkkk.', '.kaaakcaaak.', '.kkkkckkkkk.', '.kbbbkcbbbk.', '.kbbbkcbbbk.', '.kbbbkcbbbk.', '.kbbbkcbbbk.', '.kkkkkkkkkk.', '............'],
    medkit: ['............', '....kkkk....', '....k..k....', '.kkkkkkkkkk.', '.kwwwwwwwwk.', '.kwwwaawwwk.', '.kwwaaaawwk.', '.kwwwaawwwk.', '.kwwwwwwwwk.', '.kbbbbbbbbk.', '.kkkkkkkkkk.', '............'],
    helmet: ['............', '....kkkk....', '..kkaaaakk..', '.kaacaaaaak.', '.kacaaaaaak.', 'kaaaaaaaaaak', 'kaaaaaaaaaak', 'kkkkkkkkkkkk', 'kbbbbbbbbbbk', '.kk......kk.', '............', '............'],
    gasmask: ['............', '..kkkkkkkk..', '.kaaaaaaaak.', 'kakkkaakkkak', 'kakcckkcckak', 'kakkkaakkkak', '.kaaakkaaak.', '..kaakkaak..', '..kkbbbbkk..', '...kbccbk...', '...kbbbbk...', '....kkkk....'],
    jacket: ['...kk..kk...', '..kaakkaak..', '.kaaawwaaak.', 'kaaaawwaaaak', 'kakaawwaakak', 'kakaawwaakak', 'kkkaawwaakkk', '..kaawwaak..', '..kaawwaak..', '..kaaaaaak..', '..kkkkkkkk..', '............'],
    earplug: ['............', '............', '..kkk..kkk..', '.kaaak.kaaak', '.kacak.kacak', '.kaaak.kaaak', '..kbk...kbk.', '..kbk...kbk.', '..kbkkkkkbk.', '...kbbbbbk..', '....kkkkk...', '............'],
    amulet: ['...kkkkkk...', '..k......k..', '.k........k.', '.k........k.', '..k......k..', '...k....k...', '....kkkk....', '...kaaaak...', '..kaaccaak..', '..kaaccaak..', '...kaaaak...', '....kkkk....'],
    tank: ['....kkkk....', '....kbbk....', '...kkkkkk...', '..kaaaaaak..', '..kacaaaak..', '..kacaaaak..', '..kaaaaaak..', '..kwwwwwwk..', '..kaaaaaak..', '..kaaaaaak..', '..kbbbbbbk..', '...kkkkkk...'],
    harpoon: ['..........k.', '.........kck', '........kck.', '.......kbk..', '......kbk...', '.....kbk....', '....kbk.....', '..kkkk......', '.kaaak......', 'kaaak.......', 'kkkk........', '............'],
    backpack: ['....kkkk....', '...k....k...', '.kkkkkkkkkk.', '.kaaaaaaaak.', '.kacaaaaaak.', '.kkkkkkkkkk.', '.kaaabbaaak.', '.kaaabbaaak.', '.kaaaaaaaak.', '.kaaaaaaaak.', '.kkkkkkkkkk.', '............'],
    house: ['.....kk.....', '....kaak....', '...kaaaak...', '..kaaaaaak..', '.kaaaaaaaak.', 'kkkkkkkkkkkk', '.kccccccbbk.', '.kcwckccbbk.', '.kcckkccbbk.', '.kccccccbbk.', '.kkkkkkkkkk.', '............'],
    d_bed: ['............', '............', 'k...........', 'kwwk........', 'kwwkkkkkkkkk', 'kkkaaaaaaaak', 'kbbaaaaaaaak', 'kbbbbbbbbbbk', 'kkkkkkkkkkkk', 'k..........k', 'k..........k', '............'],
    d_ac: ['............', 'kkkkkkkkkkkk', 'kwwwwwwwwwwk', 'kwccccccccak', 'kwwwwwwwwwwk', 'kbbbbbbbbbbk', 'kkkkkkkkkkkk', '.c..c..c..c.', '..c..c..c...', '.c..c..c..c.', '............', '............'],
    d_pump: ['............', '..kkkk......', '..kaak.kkkk.', '..kaak.kcck.', 'kkkkkkkkcck.', 'kbbbbbbkkkk.', 'kbaaaabk....', 'kbaccabk....', 'kbaaaabk....', 'kbbbbbbk....', 'kkkkkkkk....', '............'],
    d_lock: ['....kkkk....', '...k....k...', '..k......k..', '..k......k..', '.kkkkkkkkkk.', '.kaaaaaaaak.', '.kaaakkaaak.', '.kaaakkaaak.', '.kaaaakaaak.', '.kaaaaaaaak.', '.kkkkkkkkkk.', '............'],
    d_plant: ['.....c......', '..c..cc..c..', '..cc.cc.cc..', '...cccccc...', '....cccc....', '.....cc.....', '..kkkkkkkk..', '..kaaaaaak..', '...kaaaak...', '...kaaaak...', '...kkkkkk...', '............'],
    d_aquarium: ['............', 'kkkkkkkkkkkk', 'kccccccccc.k', 'kaaaaaaaaaak', 'kaawaaaaaaak', 'kaaaaaaacaak', 'kaaacaaaaaak', 'kbbbbbbbbbbk', 'kkkkkkkkkkkk', '.k........k.', '.k........k.', '............'],
    d_bookshelf: ['kkkkkkkkkkkk', 'kacbwacbwack', 'kacbwacbwack', 'kkkkkkkkkkkk', 'kbwacbwacbwk', 'kbwacbwacbwk', 'kkkkkkkkkkkk', 'kcbwacbwacbk', 'kcbwacbwacbk', 'kkkkkkkkkkkk', 'k..........k', '............'],
    d_easel: ['.....kk.....', '..kkkkkkkk..', '..kwwwwwwk..', '..kwaawccwk.', '..kwaawccwk.', '..kwwwwwwk..', '..kkkkkkkk..', '...k.kk.k...', '..k..kk..k..', '..k..kk..k..', '.k...kk...k.', '............'],
    d_telescope: ['..........kk', '........kkck', '......kkaak.', '....kkaaak..', '..kkaaak....', '.kcaak......', '..kk.k......', '.....k......', '....k.k.....', '...k...k....', '..k.....k...', '............'],
    d_stereo: ['............', '.kkkkkkkkkk.', '.kbbbbbbbbk.', '.kbkkkkkkbk.', '.kbkaaaakbk.', '.kbkacwakbk.', '.kbkaaaakbk.', '.kbkkkkkkbk.', '.kbbbbbbbbk.', '.kkkkkkkkkk.', '..k......k..', '............'],
    d_neonsign: ['............', 'kkkkkkkkkkkk', 'k..........k', 'k.aa.cc.aa.k', 'k.a..c..a..k', 'k.aa.cc.aa.k', 'k....c.....k', 'k.aa.cc.aa.k', 'k..........k', 'kkkkkkkkkkkk', '............', '............'],
    d_poster: ['kkkkkkkkkkk.', 'kaaaaaaaaak.', 'kakkkkkkkak.', 'kakccccckak.', 'kakccccckak.', 'kakkkkkkkak.', 'kaaaaaaaaak.', 'kakkkkkkkak.', 'kaaaaaaaaak.', 'kakkkkkaaak.', 'kkkkkkkkkkk.', '............'],
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
  // 商店貨品的配色
  const ITEM_PAL = {
    phone: { a: '#37c3d6', b: '#26334d', c: '#e8fdff' }, burger: { a: '#e8a85a', b: '#8a4a1e', c: '#fff2c4', w: '#6cc070' }, can: { a: '#9be36b', b: '#3d6b2a', c: '#e8edf6', w: '#1b1b28' },
    bottle: { a: '#ffc247', b: '#8a4a1e', c: '#ffffff' }, gift: { a: '#ff4fb4', b: '#a3206b', c: '#ffd36b' }, weight: { a: '#8e9bb0', b: '#4a5568', c: '#e8edf6' },
    book: { a: '#9be36b', b: '#3d6b2a', c: '#e4ffd0' }, medkit: { a: '#d6334a', b: '#8a1f2e', w: '#eef1f7' }, helmet: { a: '#ffc247', b: '#8a6a1f', c: '#fff2c4' },
    gasmask: { a: '#5a6478', b: '#2a3142', c: '#9be36b' }, jacket: { a: '#ff8a3c', b: '#8a4a1e', w: '#eef1f7' }, earplug: { a: '#ffd36b', b: '#8a6a1f', c: '#ffffff' },
    amulet: { a: '#e8c25a', b: '#8a6a1f', c: '#ff4d5e' }, paper: { a: '#37c3d6', c: '#8d99b4' }, tank: { a: '#ffc247', b: '#5a4a1f', c: '#ffffff', w: '#1b1b28' },
    harpoon: { a: '#8a5a3b', b: '#8e9bb0', c: '#ffffff' }, backpack: { a: '#37c3d6', b: '#1f6b7a', c: '#bff3fb' }, monitor: { a: '#37c3d6', b: '#26334d', c: '#e8fdff' },
    brush: { a: '#ff4fb4', b: '#8a5a3b', c: '#ffffff' }, key: { a: '#e8c25a', b: '#8a6a1f', c: '#fff2c4' }, house: { a: '#d6334a', b: '#8a5a3b', c: '#eef1f7', w: '#37c3d6' },
    gem: { a: '#a89a82', b: '#5c5448', c: '#e9dcc4' }, shredder: { a: '#8e9bb0', b: '#4a5568', c: '#ffffff' },
    d_bed: { a: '#37c3d6', b: '#8a5a3b', w: '#ffffff' }, d_ac: { a: '#9be36b', b: '#9aa7c7', c: '#bff3fb', w: '#eef1f7' }, d_pump: { a: '#37c3d6', b: '#4a5568', c: '#9be36b' },
    d_lock: { a: '#8e9bb0', b: '#4a5568' }, d_plant: { a: '#c46a1e', c: '#6cc070' }, d_aquarium: { a: '#1e7f99', b: '#3b2a1e', c: '#37c3d6', w: '#ffc247' },
    d_bookshelf: { a: '#d6334a', b: '#37c3d6', c: '#ffc247', w: '#9be36b' }, d_easel: { a: '#ff4fb4', c: '#37c3d6', w: '#eef1f7' }, d_telescope: { a: '#c9d1dc', c: '#37c3d6' },
    d_stereo: { a: '#ff4d5e', b: '#3b2a1e', c: '#1b1b28', w: '#ffffff' }, d_neonsign: { a: '#ff4fb4', c: '#37c3d6' }, d_poster: { a: '#d6334a', c: '#ffd36b' },
  };
  const item = (icon, size) => '<img class="px-icon item" src="' + url(icon, ITEM_PAL[icon]) + '" width="' + (size || 36) + '" height="' + (size || 36) + '" alt="">';
  IE.Icons = { SHAPES, url, obj, item, ITEM_PAL };
})(window.IE = window.IE || {});
