// 《靈感撤離 2080》創作系統的內容：作品形式、具名組合、靈感物件、素材變化、起始素材。
// 創作規則見 create.js；演出見 craft.js。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA;
  const has = (c, t) => c.tags.includes(t);

  // ---------- 作品形式（相當於撲克牌型） ----------
  // 按標籤出現次數判斷；一張素材有兩個標籤時，兩個都會計算。
  // up：每升一級增加的籌碼與倍率。teach：在哪裡可以練習這種技法。
  const FORMS = [
    { id: 'sketch',   name: '隨筆',   desc: '任何素材，只計最高分的一張',           chips: 5,   mult: 1,  up: [10, 1], teach: 'AI 數據標註' },
    { id: 'poem',     name: '短詩',   desc: '兩張素材有相同標籤',                   chips: 10,  mult: 2,  up: [15, 1], teach: '與何伯聊天' },
    { id: 'couplet',  name: '對聯',   desc: '兩種標籤各出現兩次',                   chips: 20,  mult: 2,  up: [20, 1], teach: '陰謀論內容農場' },
    { id: 'song',     name: '歌',     desc: '同一標籤出現三次',                     chips: 30,  mult: 3,  up: [20, 2], teach: '街頭表演、與小雨聊天' },
    { id: 'collage',  name: '拼貼',   desc: '五張素材，合共七種或以上標籤',         chips: 35,  mult: 4,  up: [30, 2], teach: '舊城潛水、與 Miu 聊天' },
    { id: 'novel',    name: '小說',   desc: '一種標籤三次，另一種兩次',             chips: 40,  mult: 4,  up: [25, 2], teach: '做義工、與 Mary 姐聊天' },
    { id: 'mural',    name: '壁畫',   desc: '同一標籤出現四次',                     chips: 60,  mult: 7,  up: [30, 3], teach: '外送潛水、與阿 Ken 聊天' },
    { id: 'symphony', name: '交響曲', desc: '一種標籤四次，另一種三次',             chips: 80,  mult: 8,  up: [35, 3], teach: '與 DJ 小妹聊天' },
    { id: 'epic',     name: '史詩',   desc: '同一標籤出現五次',                     chips: 100, mult: 12, up: [40, 3], teach: '與芳姐聊天' },
    { id: 'film',     name: '電影',   desc: '五張素材全部擁有同樣的兩種標籤',       chips: 150, mult: 16, up: [50, 4], teach: '與老陳聊天', secret: true },
  ];
  // 行動與朋友教你的技法
  const TEACH = { label: 'sketch', farm: 'couplet', busk: 'song', dive: 'collage', volunteer: 'novel', delivery: 'mural',
    ho: 'poem', yu: 'song', miu: 'collage', mary: 'novel', ken: 'mural', dj: 'symphony', fong: 'epic', chan: 'film' };

  // ---------- 具名組合 ----------
  // need：每個標籤最少要有多少張素材包含它（看所有下筆的素材，包括不計分的陪襯）。
  // legend：隱藏的傳說組合，xmult 為額外乘數，cond 為特殊條件，hint 為圖鑑裡的謎語。
  const R = (id, name, need, chips, mult, extra) => Object.assign({ id, name, need, chips, mult }, extra || {});
  const RECIPES = [
    R('childhood', '水淹童年', { water: 1, memory: 1, hunger: 1 }, 30, 3),
    R('nostalgia', '電子鄉愁', { neon: 1, machine: 1, memory: 1 }, 25, 2.5),
    R('robodream', '機械人的夢', { machine: 1, hope: 1 }, 15, 1.5),
    R('band', '地下樂隊', { rebel: 1, anger: 1, warmth: 1 }, 35, 3),
    R('diary', '浮城日記', { water: 1, neon: 1, warmth: 1 }, 25, 2.5),
    R('lovesong', '末世情歌', { warmth: 1, hope: 1, memory: 1 }, 30, 3),
    R('labeler', '標註員之死', { machine: 3, rebel: 1 }, 40, 3.5),
    R('dinner', '有錢人的晚餐', { neon: 1, hunger: 1, anger: 1 }, 30, 2.5),
    R('archaeo', '舊城考古', { water: 2, memory: 2 }, 30, 2.5),
    R('blackhumor', '黑色幽默', { hope: 1, anger: 1 }, 15, 1.5),
    R('letter', '外星來信', { hope: 1, neon: 1 }, 15, 1.5),
    R('rentday', '交租日', { hunger: 1, machine: 1, anger: 1 }, 25, 2.5),
    R('confession', '懺悔錄', { guilt: 1, memory: 1 }, 30, 3),
    R('absolve', '告解', { guilt: 1, warmth: 1 }, 25, 2.5),
    R('crime', '罪與罰', { guilt: 2, anger: 1 }, 40, 3.5),
    R('drown', '溺水的霓虹', { water: 2, neon: 2 }, 35, 3),
    R('strike', '罷工宣言', { rebel: 2, machine: 1 }, 30, 3),
    R('lullaby', '搖籃曲', { warmth: 2, memory: 1 }, 25, 2.5),
    R('starve', '飢餓藝術家', { hunger: 2, hope: 1 }, 30, 3),
    R('riot', '暴動', { anger: 2, rebel: 2 }, 45, 4),
    R('algo', '演算法之神', { machine: 2, neon: 1 }, 25, 2.5),
    R('acidlove', '酸雨情書', { water: 1, warmth: 1, anger: 1 }, 25, 2.5),
    R('dawn', '黎明前', { hope: 2, rebel: 1 }, 30, 3),
    R('noodles', '半夜的即食麵', { hunger: 1, warmth: 1, neon: 1 }, 25, 2.5),
    R('ghost', '舊城的鬼', { water: 1, memory: 1, machine: 1 }, 25, 2.5),
    R('alarm', '鬧鐘響了', { machine: 1, hunger: 1 }, 15, 1.5),
    R('overtime', '加班到天光', { machine: 2, hunger: 1, neon: 1 }, 40, 3.5),
    R('rally', '和平集會', { warmth: 1, rebel: 1, hope: 1 }, 30, 3),
    R('eulogy', '悼詞', { memory: 2, guilt: 1 }, 35, 3),
    R('lies', '謊言大全', { neon: 2, guilt: 1 }, 30, 3),
    R('tides', '潮汐', { water: 3 }, 30, 3),
    R('karaoke', '卡拉 OK 之夜', { neon: 1, warmth: 1, memory: 1 }, 25, 2.5),
    R('recycle', '回收的夢', { machine: 1, memory: 1, hope: 1 }, 25, 2.5),
    R('fury', '沉默的憤怒', { anger: 3 }, 30, 3),
    R('family', '全家福', { warmth: 3 }, 30, 3),
    R('future', '未來考古學', { machine: 1, water: 1, hope: 1 }, 25, 2.5),
    R('sweatshop', '血汗工廠', { hunger: 2, machine: 2 }, 40, 3.5),
    R('escape', '逃離計劃', { rebel: 1, water: 1, hope: 1 }, 30, 3),
    R('debt', '負債人生', { hunger: 1, anger: 1, guilt: 1 }, 35, 3),
    R('neonsign', '霓虹之下', { neon: 3 }, 30, 3),
    // ---- 隱藏的傳說組合 ----
    R('g21', '21 克', { guilt: 1, hope: 1 }, 80, 4, { legend: true, xmult: 3,
      cond: (s) => s.soul >= 19 && s.soul <= 21, hint: '當你的靈魂剛好壓在極限上，把愧疚和希望放在一起。' }),
    R('lastart', '最後的人類藝術', {}, 60, 4, { legend: true, xmult: 2.5,
      cond: (s, sel) => sel.length === 5 && !sel.some((c) => has(c, 'machine')) && (IE.Rules.eventActive(s, 'airogue') || s.auto >= 80),
      hint: '機器停下來的時候，或者全城都已經自動化的時候，用五件沒有機械的東西。' }),
    R('unreadable', '外星人看不懂', {}, 60, 3, { legend: true, xmult: 3,
      cond: (s, sel) => new Set(sel.flatMap((c) => c.tags)).size >= 9, hint: '把盡可能多種不同的東西塞進同一件作品。' }),
    R('astarletter', '給阿星的信', { hope: 1 }, 50, 3, { legend: true, xmult: 2,
      cond: (s, sel) => sel.some((c) => c.id === 'r_astar'), hint: '在夢裡見過的那個人，配上一點希望。' }),
    R('deluge', '大洪水', { water: 5 }, 100, 6, { legend: true, xmult: 2.5,
      cond: (s) => s.water >= 6 || IE.Rules.eventActive(s, 'flood') || IE.Rules.eventActive(s, 'tsunami'), hint: '水淹得很高的時候，全部都要是水。' }),
    R('blank', '空白', {}, 0, 0, { legend: true, xmult: 6,
      cond: (s, sel) => sel.length === 1 && (sel[0].wear || 0) >= 4, hint: '外星人最欣賞甚麼都沒有的作品。用一件用到爛的東西就夠了。' }),
    R('lastpainting', '欠債藝術家的最後一幅畫', { hunger: 1 }, 50, 3, { legend: true, xmult: 3,
      cond: (s) => s.cr < 25, hint: '口袋裡幾乎一分錢都沒有的時候，畫你的肚餓。' }),
    R('forthetaken', '為所有被帶走的人', { warmth: 1, memory: 1 }, 60, 4, { legend: true, xmult: 3,
      cond: (s) => s.npcs.filter((n) => !n.alive).length >= 3, hint: '當身邊的朋友一個一個被帶走之後……' }),
  ];

  // ---------- 素材變化 ----------
  const CARD_MODS = {
    shine: { name: '閃亮', desc: '計分時籌碼 +30', color: '#7fe3ff' },
    burn:  { name: '燃燒', desc: '計分時倍率 +4', color: '#ff8a3c' },
    tear:  { name: '淚痕', desc: '計分時倍率 ×1.5', color: '#9fb6ff' },
    echo:  { name: '回音', desc: '計分兩次', color: '#c38bff' },
  };

  // ---------- 起始素材：每個人的日常 ----------
  Object.assign(D.CARDS, {
    x_rain:    { name: '窗外的雨',          tags: ['water'],           value: 12 },
    x_paste:   { name: '合成糊早餐',        tags: ['hunger'],          value: 10 },
    x_phone:   { name: '裂了的手機',        tags: ['machine', 'neon'], value: 14 },
    x_noise:   { name: '隔壁的吵架聲',      tags: ['anger'],           value: 12 },
    x_photo:   { name: '舊錢包裡的照片',    tags: ['memory', 'warmth'],value: 16 },
    x_sun:     { name: '難得的晴天',        tags: ['hope'],            value: 14 },
    x_poster:  { name: '撕爛的海報',        tags: ['rebel', 'neon'],   value: 14 },
    x_kettle:  { name: '燒水壺的聲音',      tags: ['warmth'],          value: 10 },
  });
  const STARTER = ['x_rain', 'x_paste', 'x_phone', 'x_noise', 'x_photo', 'x_sun', 'x_poster', 'x_kettle'];

  // ---------- 靈感物件（相當於小丑牌） ----------
  // card(c, ctx)：每張計分素材觸發；play(ctx)：每次下筆觸發；mods：手牌／下筆／改稿次數；
  // after(ctx)：下筆之後的代價；retrig(c, ctx, i)：額外計分一次；unlock：跨局解鎖條件（meta → 是否已達成）。
  // 數值：chips 加籌碼、mult 加倍率、xmult 乘倍率。
  const O = (id, name, rarity, icon, pal, desc, fx) => Object.assign({ id, name, rarity, icon, pal, desc }, fx);
  const OBJECTS = [
    // 朋友送的（熟絡度達 3）
    O('spraycan', '阿 Ken 的噴漆罐', 'common', 'can', { a: '#ff4fb4', b: '#a3206b', c: '#ffc2e6' }, '每張「反叛」素材計分時，倍率 +3。', { npc: 'ken',
      card: (c) => (has(c, 'rebel') ? { mult: 3 } : null) }),
    O('subwoofer', '天台低音喇叭', 'common', 'speaker', { a: '#37c3d6', b: '#1f6b7a', c: '#bff3fb' }, '每張「霓虹」素材計分時，倍率 +2。', { npc: 'dj',
      card: (c) => (has(c, 'neon') ? { mult: 2 } : null) }),
    O('oldpoems', '何伯的舊詩集', 'common', 'book', { a: '#c98d5e', b: '#7a4f2a', c: '#f5d6c0' }, '作品形式是「短詩」或「對聯」時，籌碼 +60。', { npc: 'ho',
      play: (x) => (x.form === 'poem' || x.form === 'couplet' ? { chips: 60 } : null) }),
    O('robocat', 'Miu 的機械貓', 'common', 'cat', { a: '#8e9bb0', b: '#4a5568', c: '#e8edf6' }, '每張「機械」素材計分時，籌碼 +15。', { npc: 'miu',
      card: (c) => (has(c, 'machine') ? { chips: 15 } : null) }),
    O('costume', '芳姐的戲服', 'common', 'mask', { a: '#ff4d5e', b: '#8a1f2e', c: '#ffd36b' }, '每張「記憶」素材計分時，倍率 +2。', { npc: 'fong',
      card: (c) => (has(c, 'memory') ? { mult: 2 } : null) }),
    O('boatlamp', '老陳的船燈', 'common', 'lamp', { a: '#ffc247', b: '#8a6a1f', c: '#fff2c4' }, '每張「水」素材計分時，籌碼 +20。', { npc: 'chan',
      card: (c) => (has(c, 'water') ? { chips: 20 } : null) }),
    O('lyricbook', '小雨的歌詞簿', 'rare', 'book', { a: '#9be36b', b: '#3d6b2a', c: '#e4ffd0' }, '每張「希望」素材計分時，倍率 ×1.2。', { npc: 'yu',
      card: (c) => (has(c, 'hope') ? { xmult: 1.2 } : null) }),
    O('sweetbowl', 'Mary 姐的糖水碗', 'common', 'bowl', { a: '#ff8fb1', b: '#a34a6b', c: '#ffe0ec' }, '每張「人情」素材計分時，倍率 +2。', { npc: 'mary',
      card: (c) => (has(c, 'warmth') ? { mult: 2 } : null) }),
    // 角色的起始物件
    O('slogans', '被否決的標語本', 'common', 'paper', { a: '#e8edf6', b: '#8d99b4', c: '#ff4fb4' }, '下筆的素材每有一種不同標籤，倍率 +1。', { start: 'copywriter',
      play: (x) => ({ mult: x.distinct }) }),
    O('whistle', '救生員哨子', 'common', 'whistle', { a: '#ff4d5e', b: '#8a1f2e', c: '#ffd0d5' }, '每張「水」素材計分時，倍率 +2。', { start: 'lifeguard',
      card: (c) => (has(c, 'water') ? { mult: 2 } : null) }),
    O('autoedit', '自動剪輯軟件', 'common', 'monitor', { a: '#37c3d6', b: '#26334d', c: '#e8fdff' }, '每次下筆籌碼 +60，但 AI 模仿你的速度加倍。', { start: 'programmer',
      play: () => ({ chips: 60 }), aiDouble: true }),
    O('guitar', '斷弦結他', 'rare', 'guitar', { a: '#c98d5e', b: '#6b3a1e', c: '#ffd36b' }, '作品形式是「歌」時，倍率 ×2。', { start: 'busker',
      play: (x) => (x.form === 'song' ? { xmult: 2 } : null) }),
    O('thermobag', '外送保溫袋', 'common', 'box', { a: '#ffc247', b: '#8a6a1f', c: '#fff2c4' }, '每次下筆籌碼 +25，並得到 $3 小費。', { start: 'courier',
      play: () => ({ chips: 25 }), after: () => ({ cr: 3 }) }),
    O('redpen', '批改紅筆', 'common', 'pen', { a: '#ff4d5e', b: '#8a1f2e', c: '#ffffff' }, '剛好用三張素材下筆時，倍率 ×2。', { start: 'teacher',
      play: (x) => (x.sel.length === 3 ? { xmult: 2 } : null) }),
    O('ringlight', '補光燈', 'common', 'lamp', { a: '#ffffff', b: '#8d99b4', c: '#ffe9a8' }, '每張「霓虹」素材計分時，倍率 ×1.25。', { start: 'influencer',
      card: (c) => (has(c, 'neon') ? { xmult: 1.25 } : null) }),
    O('solder', '焊槍', 'common', 'gun', { a: '#8e9bb0', b: '#4a5568', c: '#ff8a3c' }, '每張「機械」素材計分時，倍率 +2。', { start: 'cybertech',
      card: (c) => (has(c, 'machine') ? { mult: 2 } : null) }),
    O('confkey', '告解室的鑰匙', 'rare', 'key', { a: '#e8c25a', b: '#8a6a1f', c: '#fff2c4' }, '每張「愧疚」素材計分時，倍率 ×2。', { start: 'nurse',
      card: (c) => (has(c, 'guilt') ? { xmult: 2 } : null) }),
    O('frame24', '第 24 格', 'rare', 'film', { a: '#c38bff', b: '#5a2f8a', c: '#f0e0ff' }, '最後一張計分的素材會再計分一次。', { start: 'animator',
      retrig: (c, x, i) => i === x.scoring.length - 1 }),
    // 生活裡找到的
    O('emptybowl', '空碗', 'rare', 'bowl', { a: '#e8edf6', b: '#8d99b4', c: '#ffffff' }, '每張「飢餓」素材計分時，倍率 ×1.3。', { src: '挨餓三天',
      card: (c) => (has(c, 'hunger') ? { xmult: 1.3 } : null) }),
    O('alienradio', '外星收音機', 'rare', 'radio', { a: '#9be36b', b: '#2b3a5c', c: '#d9f7c7' }, '下筆的素材裡有「希望」時，倍率 ×1.5。', { src: '外星人干預、可疑的外星訊號',
      play: (x) => (x.counts.hope ? { xmult: 1.5 } : null) }),
    O('angrydiary', '憤怒的日記', 'common', 'book', { a: '#d6334a', b: '#6b1424', c: '#ffc2cb' }, '每張「憤怒」素材計分時，倍率 +3。', { src: '被搶劫、二手市集',
      card: (c) => (has(c, 'anger') ? { mult: 3 } : null) }),
    O('pills', '過期的靈感補充劑', 'common', 'bottle', { a: '#ffc247', b: '#8a4a1e', c: '#ffffff' }, '每次下筆倍率 +10，但火花 −0.1。', { src: '二手市集',
      play: () => ({ mult: 10 }), after: () => ({ spark: -0.1 }) }),
    O('stolen', '偷來的靈感', 'rare', 'hand', { a: '#f2c6a0', b: '#8e5b3a', c: '#a89a82' }, '每次下筆倍率 ×3，但靈魂變重。', { src: '道德抉擇',
      play: () => ({ xmult: 3 }), after: () => ({ sin: 1 }) }),
    O('typewriter', '二手打字機', 'common', 'typewriter', { a: '#5a6478', b: '#2a3142', c: '#e8edf6' }, '手牌 +1。', { src: '二手市集',
      mods: { hand: 1 } }),
    O('espresso', '雙倍濃縮咖啡', 'rare', 'cup', { a: '#8a5a3b', b: '#3b2a1e', c: '#f2f2f2' }, '每晚多一次下筆。', { src: '二手市集',
      mods: { plays: 1 } }),
    O('shredder', '碎紙機', 'common', 'shredder', { a: '#8e9bb0', b: '#4a5568', c: '#ffffff' }, '每晚多兩次改稿。', { src: '二手市集',
      mods: { discards: 2 } }),
    O('neonshard', '霓虹招牌碎片', 'rare', 'shard', { a: '#ff4fb4', b: '#37c3d6', c: '#ffffff' }, '今晚每改稿一次，之後下筆倍率 +4。', { src: '舊城潛水',
      play: (x) => (x.discardsUsed ? { mult: 4 * x.discardsUsed } : null) }),
    O('oldmap', '舊城地圖', 'rare', 'map', { a: '#e8c25a', b: '#3fb6d9', c: '#fff2c4' }, '作品形式是「拼貼」時，倍率 ×2。', { src: '舊城潛水',
      play: (x) => (x.form === 'collage' ? { xmult: 2 } : null) }),
    O('collectorbox', '收藏家的盒子', 'rare', 'box', { a: '#c38bff', b: '#5a2f8a', c: '#ffd36b' }, '本局每打撈過一件遺物，籌碼 +4。', { src: '舊城潛水',
      play: (x) => (x.s.stats.relics ? { chips: 4 * x.s.stats.relics } : null) }),
    O('aliencard', '外星人的名片', 'rare', 'card', { a: '#9be36b', b: '#2b3a5c', c: '#ffffff' }, '每有一位朋友被帶走，倍率 +4。', { src: '夢境面試表現出色',
      play: (x) => { const n = x.s.npcs.filter((m) => !m.alive).length; return n ? { mult: 4 * n } : null; } }),
    O('anonacct', '匿名帳號', 'common', 'phone', { a: '#1b1b28', b: '#5a6478', c: '#ff4fb4' }, '每張「憤怒」或「霓虹」素材計分時，籌碼 +12。', { src: '陰謀論內容農場',
      card: (c) => (has(c, 'anger') || has(c, 'neon') ? { chips: 12 } : null) }),
    O('nightlamp', '熬夜檯燈', 'rare', 'lamp', { a: '#ff8a3c', b: '#6b3a1e', c: '#ffe9a8' }, '身體低於 40 時，倍率 ×2。', { src: '二手市集',
      play: (x) => (x.s.body < 40 ? { xmult: 2 } : null) }),
    O('kpiclock', '外星 KPI 打卡機', 'rare', 'clock', { a: '#9be36b', b: '#2b3a5c', c: '#ffffff' }, '作品符合本季 KPI 時倍率 ×2；不符合時 ×0.8。', { src: '夢境面試表現出色',
      play: (x) => (x.kpiMod > 1 ? { xmult: 2 } : { xmult: 0.8 }) }),
    O('instant', '即影即有相機', 'rare', 'camera', { a: '#e8edf6', b: '#5a6478', c: '#ff4d5e' }, '第一張計分的素材會再計分一次。', { src: '二手市集',
      retrig: (c, x, i) => i === 0 }),
    O('raincoat', '酸雨雨衣', 'common', 'coat', { a: '#c4e04a', b: '#5a6b12', c: '#f0ffb0' }, '倍率 +4；酸雨季時改為 ×1.5。', { src: '二手市集',
      play: (x) => (x.s.season === 'acid' ? { xmult: 1.5 } : { mult: 4 }) }),
    // 跨局解鎖的傳說物件
    O('weight21', '21 克的砝碼', 'legend', 'weight', { a: '#a89a82', b: '#5c5448', c: '#e9dcc4' }, '靈魂越輕，倍率越高：×(1 + (21 − 靈魂重量) ÷ 14)。', {
      play: (x) => ({ xmult: Math.round((1 + Math.max(0, 21 - x.s.soul) / 14) * 100) / 100 }),
      unlock: { text: '發現傳說組合「21 克」', test: (m) => !!(m.recipes && m.recipes.g21) } }),
    O('lastpainter', '地球最後的畫家', 'legend', 'brush', { a: '#ffc247', b: '#ff4fb4', c: '#ffffff' }, '本局每完成過一件作品，倍率 +1。', {
      play: (x) => (x.s.works.length ? { mult: x.s.works.length } : null),
      unlock: { text: '累積完成 60 件作品', test: (m) => (m.totalWorks || 0) >= 60 } }),
    O('mirror', '碎鏡', 'legend', 'mirror', { a: '#bff3fb', b: '#37c3d6', c: '#ffffff' }, '複製右邊那件靈感物件的效果。', { copy: true,
      unlock: { text: '同時裝備 5 件靈感物件', test: (m) => (m.maxObjects || 0) >= 5 } }),
    O('blackbox', '外星黑盒', 'legend', 'cube', { a: '#1b1b28', b: '#9be36b', c: '#ff4fb4' }, '每次下筆倍率隨機 ×1 至 ×4。', {
      play: (x) => ({ xmult: Math.round((1 + x.roll * 3) * 10) / 10 }),
      unlock: { text: '被外星人帶走一次', test: (m) => !!(m.endings && (m.endings.agent || m.endings.returned)) } }),
    O('greybadge', '灰色員工證', 'legend', 'card', { a: '#9ca3af', b: '#4a5568', c: '#ffffff' }, '火花低於 1.5 時，倍率 ×3。', {
      play: (x) => (x.s.spark < 1.5 ? { xmult: 3 } : null),
      unlock: { text: '得到「灰化」結局', test: (m) => !!(m.endings && m.endings.grey) } }),
    O('rubbing', '墓碑拓本', 'legend', 'stone', { a: '#8d99b4', b: '#4a5568', c: '#e8edf6' }, '你在所有局裡每死過一次，倍率 +3。', {
      play: (x) => (x.s.pastDeaths ? { mult: 3 * x.s.pastDeaths } : null),
      unlock: { text: '死亡 3 次', test: (m) => ((m.endings && m.endings.death) || 0) >= 3 } }),
    O('goldframe', '鍍金畫框', 'legend', 'frame', { a: '#e8c25a', b: '#8a6a1f', c: '#fff2c4' }, '同一晚每多下筆一次，倍率 ×1.5（第二次 ×1.5，第三次 ×2.25……）。', {
      play: (x) => (x.playIndex ? { xmult: Math.round(Math.pow(1.5, x.playIndex) * 100) / 100 } : null),
      unlock: { text: '一次下筆得到 50,000 分以上', test: (m) => (m.bestPlay || 0) >= 50000 } }),
  ];
  const OBJ = {};
  OBJECTS.forEach((o) => { OBJ[o.id] = o; });
  const OBJ_PRICE = { common: 90, rare: 160, legend: 260 };
  const RARITY = { common: '普通', rare: '稀有', legend: '傳說' };
  // 角色的起始物件
  const START_OBJECT = { copywriter: 'slogans', lifeguard: 'whistle', programmer: 'autoedit', busker: 'guitar', courier: 'thermobag',
    teacher: 'redpen', influencer: 'ringlight', cybertech: 'solder', nurse: 'confkey', animator: 'frame24' };

  Object.assign(D, { FORMS, TEACH, RECIPES, CARD_MODS, STARTER, OBJECTS, OBJ, OBJ_PRICE, RARITY, START_OBJECT,
    CRAFT: { hand: 7, plays: 3, discards: 2, deckMax: 30, cost: 20, allnighterCost: 25 } });
});
