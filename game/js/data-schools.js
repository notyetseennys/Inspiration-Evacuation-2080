// 《靈感撤離 2080》第七期：媒材、十個創作流派、靈感物件擴充至約 120 件。
// 媒材是素材的第二條軸（相當於撲克牌的花色）：標籤決定小說、壁畫這類形式，媒材決定連作、跨界。
// 流派是靈感物件的分類：裝備兩件同流派的物件會觸發流派加成，三件更強。規則見 create.js。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA;
  const has = (c, t) => c.tags.includes(t);

  // ---------- 媒材 ----------
  const MEDIA = {
    paper: { name: '紙', full: '紙本', color: '#c8a46a', desc: '文字、書信、印在紙上的東西' },
    sound: { name: '聲', full: '聲音', color: '#37c3d6', desc: '音樂、噪音、說話的聲音' },
    image: { name: '影', full: '影像', color: '#ff4fb4', desc: '照片、畫、光和螢幕' },
    body:  { name: '身', full: '身體', color: '#ff8a3c', desc: '食物、觸感、痛楚和勞動' },
    data:  { name: '數', full: '數據', color: '#9be36b', desc: '程式、評分、演算法' },
  };
  // 按素材名稱判斷媒材（由上而下，第一個符合的為準）；判斷不到就看標籤
  const MEDIUM_WORDS = [
    ['sound', ['聲', '歌', '音', '唱', '曲', '和弦', '旋律', '鈴', '哨', '黑膠', 'demo', '結他', '吵', '笑話', '掌聲', '叫賣', '早課', '經文', '雜音', '嗡嗡', '錄音', '電話', '來電']],
    ['data', ['AI', '數據', '錯誤', '評分', '程式', '除錯', '粉絲', '直播', '系統', '訊號', '權重', '晶片', '天線', '字型', '信託', '貓圖', '假新聞', '留言', '差評', '合約', '檔案', '工作證', '職員證', '名牌', '手機', '螺絲', '探針', '零件', '帳簿', '靈感券', '抑制器', '心跳']],
    ['image', ['照', '相', '影', '畫', '光', '霓虹', '螢幕', '日落', '微笑', '面具', '月亮', '夜空', '倒影', '招牌', '漫畫', '星圖', '海市蜃樓', '飛碟', '焦痕', '聖像', '火炬', '地球儀', '石刻', '壁', '拓', '蜂鳥', '蜘蛛', '線', '樹', '洞穴', '晴天', '海報', '金', '水母', '鱗片', '眼']],
    ['paper', ['信', '詩', '書', '日記', '紙', '報', '字', '標語', '明信片', '筆', '經', '卷', '賒數簿', '點名簿', '傳單', '喜帖', '通知書', '小說', '守則', '符號', '書目', '薩迦', '結繩', '名字', '塗鴉', '一句話', '墨', '車票', '門票', '聯署', '文件', '帳', '木板', '地圖', '水路圖', '曆法', '話', '問題', '真相', '故事']],
    ['body', ['手', '身', '臉', '餓', '肚', '麵', '飯', '湯', '茶', '糖水', '牛排', '酒', '香水', '早餐', '糊', '麵包', '擁抱', '腳印', '骨', '義肢', '毛', '奶茶', '宴會', '呼吸', '空氣', '一夜', '晚上', '貓', '雨', '颱風', '搶劫', '趕出', '搖晃', '口罩', '沙', '蒸氣', '泥土', '外賣', '保溫袋', '硬幣', '人', '蛋', '種子', '孢子', '牆']],
  ];
  // 判斷錯了或者想刻意平均分佈的，在這裡逐張指定
  const MEDIUM_FIX = {
    x_rain: 'image', x_paste: 'body', x_phone: 'data', x_noise: 'sound', x_photo: 'image', x_sun: 'image', x_poster: 'paper', x_kettle: 'sound', z_heartbeat: 'sound', t_ochre: 'image',
    l_flow: 'body', l_notart: 'image', l_poison: 'data', l_sunset: 'data', d_vinyl: 'sound', d_chime: 'sound', d_letter: 'paper', d_paste: 'body',
    k_ticket: 'paper', k_bag: 'body', f_truth: 'paper', p_hat: 'body', k_oldarm: 'body', k_pulse: 'data', e_robot: 'data', e_glitch: 'data',
    m_truth: 'paper', m_robot: 'data', m_drone: 'data', n_chan1: 'body', n_ken2: 'image', n_dj1: 'sound', n_ho2: 'body', n_miu1: 'data',
    n_miu2: 'data', n_fong2: 'body', r_alien: 'image', r_astar: 'image', r_flood: 'body', e_dark: 'image', e_alien: 'data', e_cult: 'paper',
    b_light: 'image', b_solder: 'body', b_nbadge: 'body', b_frame: 'image', b_whistle: 'sound', b_repo: 'data', b_log: 'data', b_coins: 'body',
    e_meteor: 'image', e_ash: 'body', e_curfew: 'sound', e_zoo: 'paper', e_moon: 'image', e_mask: 'body', v_shelter: 'body', m_saved: 'body',
    m_family: 'image', m_thanks: 'sound', e_soup: 'body', e_kidart: 'image', b_chalk: 'paper', b_novel: 'paper', b_lanyard: 'data',
    c_trust: 'data', c_weights: 'data', c_firstword: 'paper', c_watch: 'body', c_ledger: 'paper', c_hrbadge: 'data', c_probe: 'data',
    n_ho1: 'paper', e_song: 'sound', n_dj2: 'sound', n_fong1: 'sound', b_rating: 'data', e_wedding: 'paper', b_slogan: 'paper', m_graffiti: 'paper',
    f_scale: 'image', d_jelly: 'image', e_ufo: 'image', e_scam: 'sound', p_chorus: 'sound', f_war: 'data', e_graffiti: 'paper', c_sutra: 'paper',
    d_crayon: 'image', b_roll: 'paper', n_mary1: 'paper', i_question: 'sound', c_review: 'data', l_error: 'sound', l_rules: 'paper', l_screen: 'image',
    n_yu1: 'sound', n_yu2: 'sound', b_guitar: 'image', l_cat: 'image', s_face: 'body', k_badge: 'data', b_bag: 'body', c_cold: 'body', f_viral: 'data', e_fight: 'sound', c_door: 'sound',
  };
  const TAG_MEDIUM = { machine: 'data', neon: 'image', hunger: 'body', warmth: 'body', memory: 'paper', hope: 'image', anger: 'sound',
    rebel: 'paper', guilt: 'paper', water: 'sound', ancient: 'paper', cosmic: 'image' };
  // 媒材要與標籤互相獨立（就像花色與點數），否則五張同標籤自然就是同一媒材，「傑作」會變得太容易。
  // 做法：名稱提示的媒材只是優先選擇；如果同一標籤已經有太多素材是這種媒材，就分到其他媒材去。
  const KEYS = Object.keys(MEDIA);
  const pair = {};
  const seen = (t, m) => (pair[t] && pair[t][m]) || 0;
  function guessMedium(id, c) {
    if (MEDIUM_FIX[id]) return MEDIUM_FIX[id];
    const hint = MEDIUM_WORDS.find(([, words]) => words.some((w) => c.name.includes(w)));
    const like = hint ? hint[0] : TAG_MEDIUM[c.tags[0]] || 'paper', pull = hint ? 2.5 : 0.5;
    let best = like, bestScore = Infinity;
    KEYS.forEach((m, i) => {
      const score = c.tags.reduce((a, t) => a + seen(t, m), 0) - (m === like ? pull : 0) + i * 0.01;
      if (score < bestScore) { bestScore = score; best = m; }
    });
    return best;
  }
  Object.keys(D.CARDS).forEach((id) => {
    const c = D.CARDS[id];
    if (!c.medium) c.medium = guessMedium(id, c);
    c.tags.forEach((t) => { pair[t] = pair[t] || {}; pair[t][c.medium] = (pair[t][c.medium] || 0) + 1; });
  });
  // 卡牌實例的媒材：轉檔過的素材記在自己身上；否則跟目錄；目錄以外的（例如拼貼出來的）看標籤
  const mediumOf = (c) => c.medium || (D.CARDS[c.id] && D.CARDS[c.id].medium) || TAG_MEDIUM[c.tags[0]] || 'paper';
  // 外地素材：旅行、古董、極稀有
  const foreign = (c) => !!((c.origin && c.origin !== 'home') || c.rarity === 'legend' || (c.id && c.id.startsWith('a_')));

  // ---------- 十個創作流派 ----------
  // 裝備兩件同流派的靈感物件觸發流派加成，三件或以上觸發更強的版本（n 為件數）。
  // 鉤子與物件相同：card（每張計分素材）、play（每次下筆）、retrig（再計分）、after（下筆之後的代價）。
  const med = (c) => mediumOf(c);
  const closeFriends = (s, lv) => s.npcs.filter((n) => n.alive && n.friend >= (lv || 3)).length;
  const SCHOOLS = {
    flood: { name: '水淹流', color: '#3fb6d9', motto: '淹得越深，作品越好',
      b2: '每張「水」素材計分時，倍率 + 浮城水位（樓數）', b3: '另外，水位 5 樓以上時，每次下筆倍率 ×2',
      card: (c, x) => (has(c, 'water') && x.s.water >= 1 ? { mult: Math.floor(x.s.water) } : null),
      play: (x, n) => (n >= 3 && x.s.water >= 5 ? { xmult: 2 } : null) },
    neon: { name: '霓虹流', color: '#ff4fb4', motto: '越亮越空虛',
      b2: '每次下筆倍率 ×1.5，但火花 −0.05', b3: '改為每次下筆倍率 ×2.5',
      play: (x, n) => ({ xmult: n >= 3 ? 2.5 : 1.5 }), after: () => ({ spark: -0.05 }) },
    cliche: { name: '陳腔濫調流', color: '#c9a86b', motto: '重複就是風格',
      b2: '磨損不再令素材的籌碼下降；素材每用過一次，計分時倍率 +1', b3: '另外，「陳腔濫調」（用過四次或以上）的素材再計分一次',
      noWear: true, card: (c) => (c.wear ? { mult: c.wear } : null), retrig: (c, x, i, n) => n >= 3 && (c.wear || 0) >= 4 },
    guilt: { name: '愧疚流', color: '#a89a82', motto: '痛苦出藝術',
      b2: '每次下筆倍率 ×(1 + 靈魂重量 ÷ 40)', b3: '另外，「愧疚」素材計分時倍率 ×1.5',
      play: (x) => (x.s.soul > 0 ? { xmult: Math.round((1 + x.s.soul / 40) * 100) / 100 } : null),
      card: (c, x, n) => (n >= 3 && has(c, 'guilt') ? { xmult: 1.5 } : null) },
    machine: { name: '機械流', color: '#9be36b', motto: '用 AI 打敗 AI',
      b2: '「數」媒材的素材再計分一次', b3: '另外，AI 模仿不再降低你的倍率',
      retrig: (c) => med(c) === 'data', noAI: 3 },
    hunger: { name: '飢餓流', color: '#f08a3c', motto: '窮困出藝術家',
      b2: '存款低於 $100 時，每次下筆倍率 ×1.5；低於 $30 時 ×2.5', b3: '另外，「飢餓」素材計分時倍率 +5',
      play: (x) => (x.s.cr < 30 ? { xmult: 2.5 } : x.s.cr < 100 ? { xmult: 1.5 } : null),
      card: (c, x, n) => (n >= 3 && has(c, 'hunger') ? { mult: 5 } : null) },
    rebel: { name: '反叛流', color: '#a77bff', motto: '打破規則',
      b2: '本局每改稿一次，倍率永久 +0.5', b3: '另外，「反叛」素材無視外星評審的規則，計分時倍率 ×1.3',
      play: (x) => { const d = x.s.stats.discards || 0; return d ? { mult: Math.round(d * 5) / 10 } : null; },
      card: (c, x, n) => (n >= 3 && has(c, 'rebel') ? { xmult: 1.3 } : null), freeRebel: 3 },
    warmth: { name: '人情流', color: '#ff6b5e', motto: '靠朋友成名',
      b2: '每位熟絡度 3 以上、仍在浮城的朋友，倍率 +3', b3: '改為每位 +6，並且籌碼 +20',
      play: (x, n) => { const k = closeFriends(x.s); return k ? (n >= 3 ? { chips: 20 * k, mult: 6 * k } : { mult: 3 * k }) : null; } },
    faraway: { name: '遠方流', color: '#9b8cff', motto: '用全世界換一件作品',
      b2: '外地素材（旅行、古董、極稀有）計分時，倍率 +4', b3: '另外，極稀有素材再計分一次',
      card: (c) => (foreign(c) ? { mult: 4 } : null), retrig: (c, x, i, n) => n >= 3 && c.rarity === 'legend' },
    minimal: { name: '極簡流', color: '#e8edf6', motto: '少即是多',
      b2: '下筆三張或以下時，倍率 ×1.5', b3: '改為：下筆兩張或以下時 ×3，三張時 ×1.5',
      play: (x, n) => { const k = x.sel.length; if (n >= 3 && k <= 2) return { xmult: 3 }; return k <= 3 ? { xmult: 1.5 } : null; } },
  };

  // ---------- 新的靈感物件（每個流派六件，另有八件媒材物件） ----------
  // 新鉤子：held(c, x) 手牌中沒有打出的素材；grow 改稿時成長（數值記在 s.objVal）；show(s) 顯示現在的數值；
  // reliefMult 卸下愧疚的倍數；aiMult、aiHalf 影響 AI 模仿；freeRebel「反叛」素材無視評審規則。
  const O = (id, name, rarity, icon, pal, desc, fx) => Object.assign({ id, name, rarity, icon, pal, desc, src: '二手靈感市集' }, fx);
  const val = (s, id) => (s.objVal && s.objVal[id]) || 0;
  const unlockSchool = (sc) => ({ text: '以三件「' + SCHOOLS[sc].name + '」物件通過一個關卡', test: (m) => !!(m.schoolPass && m.schoolPass[sc]) });
  const R2 = (v) => Math.round(v * 100) / 100;
  const NEW_OBJECTS = [
    // 水淹流
    O('tidegauge', '潮汐尺', 'common', 'clock', { a: '#3fb6d9', b: '#1f4a6b', c: '#e8fdff' }, '每次下筆倍率 + 浮城水位（樓數）。', { school: 'flood',
      play: (x) => (x.s.water >= 1 ? { mult: Math.floor(x.s.water) } : null), show: (s) => '現在 +' + Math.floor(s.water) }),
    O('sandbag', '沙包', 'common', 'box', { a: '#c9a86b', b: '#6b5a3a', c: '#e9dcc4' }, '家裡淹水的晚上，每次下筆倍率 ×2。', { school: 'flood',
      play: (x) => (IE.Rules.flooded(x.s) ? { xmult: 2 } : null) }),
    O('inksac', '墨囊', 'common', 'bottle', { a: '#2b3a5c', b: '#1b1b28', c: '#9b8cff' }, '每張「水」素材計分時，籌碼 + 水位 × 6。', { school: 'flood', start: 'octopoet',
      card: (c, x) => (has(c, 'water') ? { chips: Math.round(x.s.water * 6) } : null) }),
    O('aquarium', '魚缸', 'rare', 'bowl', { a: '#37c3d6', b: '#1f6b7a', c: '#ffc247' }, '手牌中每張沒有打出的「水」素材，倍率 ×1.2。', { school: 'flood',
      held: (c) => (has(c, 'water') ? { xmult: 1.2 } : null) }),
    O('divehelm', '舊潛水頭盔', 'rare', 'helmet', { a: '#c98d5e', b: '#6b3a1e', c: '#bff3fb' }, '每張「水」素材計分時倍率 ×1.2；水位 5 樓以上改為 ×1.4。', { school: 'flood',
      card: (c, x) => (has(c, 'water') ? { xmult: x.s.water >= 5 ? 1.4 : 1.2 } : null) }),
    O('ark', '方舟藍圖', 'legend', 'map', { a: '#3fb6d9', b: '#e8edf6', c: '#ffc247' }, '下筆的五張素材全部有「水」時，倍率 ×4。', { school: 'flood', unlock: unlockSchool('flood'),
      play: (x) => (x.sel.length === 5 && x.sel.every((c) => has(c, 'water')) ? { xmult: 4 } : null) }),
    // 霓虹流
    O('billboard', '天空區廣告牌', 'common', 'monitor', { a: '#ff4fb4', b: '#5a2f8a', c: '#ffe0f2' }, '每次下筆倍率 +12，但火花 −0.03。', { school: 'neon',
      play: () => ({ mult: 12 }), after: () => ({ spark: -0.03 }) }),
    O('glowstick', '螢光棒', 'common', 'pen', { a: '#9be36b', b: '#3d6b2a', c: '#f0ffb0' }, '每張「霓虹」素材計分時，籌碼 +25。', { school: 'neon',
      card: (c) => (has(c, 'neon') ? { chips: 25 } : null) }),
    O('adcontract', '網紅合約', 'rare', 'paper', { a: '#ffffff', b: '#ff4fb4', c: '#37c3d6' }, '平台評分 4 星以上時，每次下筆倍率 ×2；低於 3 星時 ×0.7。', { school: 'neon',
      play: (x) => (x.s.rating >= 4 ? { xmult: 2 } : x.s.rating < 3 ? { xmult: 0.7 } : null) }),
    O('hologram', '全息投影', 'rare', 'cube', { a: '#37c3d6', b: '#5a2f8a', c: '#ff4fb4' }, '第一張計分的「霓虹」素材再計分兩次。', { school: 'neon',
      retrig: (c, x) => (has(c, 'neon') && x.scoring.find((d) => has(d, 'neon')) === c ? 2 : 0) }),
    O('vipcard', 'VIP 會員卡', 'rare', 'card', { a: '#1b1b28', b: '#e8c25a', c: '#ff4fb4' }, '下筆的素材有三張或以上「霓虹」時，倍率 ×2。', { school: 'neon',
      play: (x) => ((x.counts.neon || 0) >= 3 ? { xmult: 2 } : null) }),
    O('voidtower', '空虛之塔', 'legend', 'shard', { a: '#ff4fb4', b: '#1b1b28', c: '#37c3d6' }, '火花越低，倍率越高：×(1 + (4 − 火花) × 0.6)。', { school: 'neon', unlock: unlockSchool('neon'),
      play: (x) => (x.s.spark < 4 ? { xmult: R2(1 + (4 - x.s.spark) * 0.6) } : null) }),
    // 陳腔濫調流
    O('rubberstamp', '橡皮印章', 'common', 'stone', { a: '#ff4d5e', b: '#8a1f2e', c: '#ffd0d5' }, '每張用過兩次或以上的素材計分時，倍率 +3。', { school: 'cliche',
      card: (c) => ((c.wear || 0) >= 2 ? { mult: 3 } : null) }),
    O('catchphrase', '口頭禪', 'common', 'paper', { a: '#ffd36b', b: '#8a6a1f', c: '#fff2c4' }, '作品形式和今晚上一筆相同時，倍率 +10。', { school: 'cliche',
      play: (x) => { const L = x.ses && x.ses.log; return L && L.length && L[L.length - 1].form === x.form ? { mult: 10 } : null; } }),
    O('templatebook', '範本大全', 'common', 'book', { a: '#8d99b4', b: '#4a5568', c: '#e8edf6' }, '每張用過的素材計分時，籌碼 + 用過的次數 × 10。', { school: 'cliche',
      card: (c) => (c.wear ? { chips: 10 * c.wear } : null) }),
    O('sequel', '續集合約', 'rare', 'film', { a: '#c38bff', b: '#2a1640', c: '#ffd36b' }, '作品形式和上一件作品最好的一筆相同時，倍率 ×2。', { school: 'cliche',
      play: (x) => { const w = x.s.works.filter((v) => v.day < x.s.day).pop(); return w && w.form === x.form ? { xmult: 2 } : null; } }),
    O('remaster', '重製版', 'rare', 'camera', { a: '#e8c25a', b: '#5a4a2a', c: '#ffffff' }, '「陳腔濫調」（用過四次或以上）的素材計分時，倍率 ×1.5。', { school: 'cliche',
      card: (c) => ((c.wear || 0) >= 4 ? { xmult: 1.5 } : null) }),
    O('loop', '無限循環', 'legend', 'clock', { a: '#9b8cff', b: '#2b3a5c', c: '#ffffff' }, '每張用過三次或以上的素材再計分一次。', { school: 'cliche', unlock: unlockSchool('cliche'),
      retrig: (c) => (c.wear || 0) >= 3 }),
    // 愧疚流
    O('rosary', '念珠', 'common', 'amulet', { a: '#a89a82', b: '#5c5448', c: '#e9dcc4' }, '每張「愧疚」素材計分時，倍率 +5。', { school: 'guilt',
      card: (c) => (has(c, 'guilt') ? { mult: 5 } : null) }),
    O('hairshirt', '苦修衣', 'common', 'coat', { a: '#8a7a6a', b: '#4a3a2a', c: '#c9a86b' }, '靈魂超過 21 克時，每次下筆倍率 ×1.6。外星人拉不動你，但你寫得更好。', { school: 'guilt',
      play: (x) => (x.s.soul > 21 ? { xmult: 1.6 } : null) }),
    O('indulgence', '贖罪券', 'common', 'paper', { a: '#e8c25a', b: '#8a6a1f', c: '#ffffff' }, '每張「愧疚」素材計分時倍率 +3；寫進作品的愧疚，卸下的重量 ×1.5。', { school: 'guilt', start: 'skyheir',
      card: (c) => (has(c, 'guilt') ? { mult: 3 } : null), reliefMult: 1.5 }),
    O('sinlog', '罪行紀錄', 'rare', 'book', { a: '#5c5448', b: '#2a2420', c: '#d6334a' }, '本局每做過一件虧心事，籌碼 +10。', { school: 'guilt',
      play: (x) => (x.s.stats.sins ? { chips: 10 * x.s.stats.sins } : null), show: (s) => '現在 +' + 10 * (s.stats.sins || 0) }),
    O('accomplice', '共犯', 'rare', 'hand', { a: '#a89a82', b: '#4a3a2a', c: '#d6334a' }, '「愧疚」素材再計分一次；但每次下筆靈魂 +0.5 克。', { school: 'guilt',
      retrig: (c) => has(c, 'guilt'), after: () => ({ sin: 0.5 }) }),
    O('scales', '天秤', 'legend', 'weight', { a: '#e8c25a', b: '#5c5448', c: '#fff2c4' }, '倍率 ×(1 + 靈魂重量 ÷ 20)。', { school: 'guilt', unlock: unlockSchool('guilt'),
      play: (x) => (x.s.soul > 0 ? { xmult: R2(1 + x.s.soul / 20) } : null) }),
    // 機械流
    O('overclock', '超頻晶片', 'common', 'gem', { a: '#9be36b', b: '#2b3a5c', c: '#e8fdff' }, '每張「機械」素材計分時，倍率 +3。', { school: 'machine',
      card: (c) => (has(c, 'machine') ? { mult: 3 } : null) }),
    O('selfpatch', '自我修補程式', 'common', 'monitor', { a: '#9be36b', b: '#1b1b28', c: '#e8fdff' }, '每張「數」媒材的素材計分時，籌碼 +25。', { school: 'machine', start: 'awakenedai',
      card: (c) => (med(c) === 'data' ? { chips: 25 } : null) }),
    O('antivirus', '反 AI 噴霧', 'common', 'can', { a: '#e8edf6', b: '#4a5568', c: '#9be36b' }, 'AI 模仿對你的影響減半；每次下筆籌碼 +30。', { school: 'machine',
      play: () => ({ chips: 30 }), aiHalf: true }),
    O('recursion', '遞迴函數', 'rare', 'cube', { a: '#37c3d6', b: '#26334d', c: '#9be36b' }, '第一張計分的「數」媒材素材再計分兩次。', { school: 'machine',
      retrig: (c, x) => (med(c) === 'data' && x.scoring.find((d) => med(d) === 'data') === c ? 2 : 0) }),
    O('gpu', '二手顯示卡', 'rare', 'box', { a: '#1b1b28', b: '#4a5568', c: '#9be36b' }, '每次下筆倍率 ×1.8，但 AI 模仿你的速度加倍。', { school: 'machine',
      play: () => ({ xmult: 1.8 }), aiDouble: true }),
    O('mainframe', '舊城主機', 'legend', 'monitor', { a: '#26334d', b: '#1b1b28', c: '#9be36b' }, '所有計分的素材再計分一次，但 AI 模仿你的速度 ×3。', { school: 'machine', unlock: unlockSchool('machine'),
      retrig: () => true, aiMult: 3 }),
    // 飢餓流
    O('coupon', '過期的優惠券', 'common', 'paper', { a: '#ffc247', b: '#8a4a1e', c: '#ffffff' }, '存款低於 $80 時，每次下筆倍率 +12。', { school: 'hunger',
      play: (x) => (x.s.cr < 80 ? { mult: 12 } : null) }),
    O('ramen', '最後一包即食麵', 'common', 'bowl', { a: '#f08a3c', b: '#8a4a1e', c: '#fff2c4' }, '每張「飢餓」素材計分時，倍率 +3。', { school: 'hunger',
      card: (c) => (has(c, 'hunger') ? { mult: 3 } : null) }),
    O('sporedish', '孢子培養皿', 'common', 'bottle', { a: '#c4e04a', b: '#5a6b12', c: '#f0ffb0' }, '每張「身」媒材的素材計分時，籌碼 +15；本局每挨餓一天，再 +5。', { school: 'hunger', start: 'mushroom',
      card: (c, x) => (med(c) === 'body' ? { chips: 15 + 5 * (x.s.stats.hungryDays || 0) } : null) }),
    O('pawnticket', '當票', 'rare', 'card', { a: '#e8edf6', b: '#5a6478', c: '#ff4d5e' }, '本局每賣出一件作品或靈感物件，倍率 +2。', { school: 'hunger',
      play: (x) => { const k = (x.s.stats.sales || 0) + (x.s.stats.objSold || 0); return k ? { mult: 2 * k } : null; } }),
    O('palette', '窮畫家的調色板', 'rare', 'brush', { a: '#ff8a3c', b: '#6b3a1e', c: '#9be36b' }, '存款越少，倍率越高：×(1 + (200 − 存款) ÷ 200)，最多 ×2。', { school: 'hunger',
      play: (x) => (x.s.cr < 200 ? { xmult: R2(1 + Math.min(200, 200 - x.s.cr) / 200) } : null) }),
    O('lastcoin', '最後一枚硬幣', 'legend', 'gem', { a: '#e8c25a', b: '#8a6a1f', c: '#ffffff' }, '存款低於 $20 時，每次下筆倍率 ×4。', { school: 'hunger', unlock: unlockSchool('hunger'),
      play: (x) => (x.s.cr < 20 ? { xmult: 4 } : null) }),
    // 反叛流
    O('deserterbadge', '撕掉的徽章', 'common', 'card', { a: '#9ca3af', b: '#4a5568', c: '#a77bff' }, '每張「反叛」素材計分時，籌碼 +30。', { school: 'rebel', start: 'greydeserter',
      card: (c) => (has(c, 'rebel') ? { chips: 30 } : null) }),
    O('paradox', '祖父悖論', 'common', 'clock', { a: '#a77bff', b: '#2a1640', c: '#ffd36b' }, '每改稿一次，這件物件的倍率永久 +1。', { school: 'rebel', start: 'timetraveler',
      grow: 1, play: (x) => (val(x.s, 'paradox') ? { mult: val(x.s, 'paradox') } : null), show: (s) => '現在 +' + val(s, 'paradox') }),
    O('boltcutter', '斷線鉗', 'rare', 'key', { a: '#ff4d5e', b: '#4a5568', c: '#e8edf6' }, '「反叛」素材無視外星評審的規則；每張「反叛」素材計分時，倍率 +3。', { school: 'rebel',
      freeRebel: true, card: (c) => (has(c, 'rebel') ? { mult: 3 } : null) }),
    O('blackflag', '黑旗', 'rare', 'shard', { a: '#1b1b28', b: '#4a5568', c: '#a77bff' }, '下筆的素材完全不符合本季 KPI 時，倍率 ×2.5。', { school: 'rebel',
      play: (x) => { const k = IE.Rules.kpi(x.s); return k.tag && !x.sel.some((c) => has(c, k.tag)) ? { xmult: 2.5 } : null; } }),
    O('underground', '地下刊物', 'rare', 'book', { a: '#a77bff', b: '#2a1640', c: '#ff4fb4' }, '今晚的改稿次數用完之後，每次下筆倍率 ×2。', { school: 'rebel',
      play: (x) => (x.ses && x.ses.discards === 0 ? { xmult: 2 } : null) }),
    O('statue', '推倒的銅像', 'legend', 'stone', { a: '#c98d5e', b: '#4a3a2a', c: '#a77bff' }, '每改稿一次，這件物件的倍率永久多 ×0.05。', { school: 'rebel', unlock: unlockSchool('rebel'),
      grow: 1, play: (x) => (val(x.s, 'statue') ? { xmult: R2(1 + 0.05 * val(x.s, 'statue')) } : null), show: (s) => '現在 ×' + R2(1 + 0.05 * val(s, 'statue')) }),
    // 人情流
    O('groupchat', '街坊群組', 'common', 'phone', { a: '#9be36b', b: '#2b3a5c', c: '#ffffff' }, '每位熟絡度 2 以上、仍在浮城的朋友，籌碼 +20。', { school: 'warmth',
      play: (x) => { const k = closeFriends(x.s, 2); return k ? { chips: 20 * k } : null; }, show: (s) => '現在 ' + closeFriends(s, 2) + ' 位' }),
    O('potluck', '百家飯', 'common', 'bowl', { a: '#ff6b5e', b: '#8a2f2a', c: '#fff2c4' }, '每張「人情」素材計分時，籌碼 +25。', { school: 'warmth',
      card: (c) => (has(c, 'warmth') ? { chips: 25 } : null) }),
    O('scarf', '織了一半的頸巾', 'common', 'coat', { a: '#ff6b5e', b: '#8a2f2a', c: '#9be36b' }, '下筆的素材裡同時有「人情」和「希望」時，倍率 +10。', { school: 'warmth',
      play: (x) => (x.counts.warmth && x.counts.hope ? { mult: 10 } : null) }),
    O('mixtape', '朋友送的混音帶', 'rare', 'radio', { a: '#ff4fb4', b: '#2b3a5c', c: '#ffd36b' }, '每位熟絡度 3 以上、仍在浮城的朋友，倍率 +4。', { school: 'warmth',
      play: (x) => { const k = closeFriends(x.s); return k ? { mult: 4 * k } : null; }, show: (s) => '現在 ' + closeFriends(s) + ' 位' }),
    O('photobooth', '大頭貼', 'rare', 'camera', { a: '#ff8fb1', b: '#a34a6b', c: '#ffffff' }, '每張「人情」素材計分時，倍率 ×1.2。', { school: 'warmth',
      card: (c) => (has(c, 'warmth') ? { xmult: 1.2 } : null) }),
    O('promise', '約定', 'legend', 'hand', { a: '#ff6b5e', b: '#ffd36b', c: '#ffffff' }, '每位仍在浮城的朋友，倍率 ×1.15。', { school: 'warmth', unlock: unlockSchool('warmth'),
      play: (x) => { const k = x.s.npcs.filter((n) => n.alive).length; return k ? { xmult: R2(Math.pow(1.15, k)) } : null; },
      show: (s) => '現在 ' + s.npcs.filter((n) => n.alive).length + ' 位' }),
    // 遠方流
    O('fieldnotes', '田野筆記', 'common', 'book', { a: '#c9a86b', b: '#6b5a3a', c: '#e9dcc4' }, '每張外地或「遠古」素材計分時，籌碼 +20。', { school: 'faraway', start: 'archaeologist',
      card: (c) => (foreign(c) || has(c, 'ancient') ? { chips: 20 } : null) }),
    O('telescope', '望遠鏡', 'common', 'gun', { a: '#9b8cff', b: '#2b3a5c', c: '#ffffff' }, '每張「星辰」素材計分時，倍率 +3。', { school: 'faraway', start: 'astronaut',
      card: (c) => (has(c, 'cosmic') ? { mult: 3 } : null) }),
    O('appraisal', '鑑定證書', 'common', 'paper', { a: '#e8c25a', b: '#8a6a1f', c: '#5a2f8a' }, '每張古董或極稀有素材計分時，倍率 +4。', { school: 'faraway', start: 'antiquedealer',
      card: (c) => ((c.id && c.id.startsWith('a_')) || c.rarity === 'legend' ? { mult: 4 } : null) }),
    O('phrasebook', '旅遊會話手冊', 'common', 'book', { a: '#37c3d6', b: '#1f6b7a', c: '#ffd36b' }, '下筆的素材來自三個或以上不同的地方（包括浮城）時，倍率 +15。', { school: 'faraway',
      play: (x) => (new Set(x.sel.map((c) => c.origin || 'home')).size >= 3 ? { mult: 15 } : null) }),
    O('jetlag', '時差', 'rare', 'clock', { a: '#ffc247', b: '#2b3a5c', c: '#ff4fb4' }, '在旅途中創作時，每次下筆倍率 ×2。', { school: 'faraway',
      play: (x) => (x.s.trip ? { xmult: 2 } : null) }),
    O('worldpuzzle', '世界地圖拼圖', 'legend', 'map', { a: '#9be36b', b: '#3fb6d9', c: '#ffd36b' }, '極稀有素材再計分兩次。', { school: 'faraway', unlock: unlockSchool('faraway'),
      retrig: (c) => (c.rarity === 'legend' ? 2 : 0) }),
    // 極簡流
    O('woodfish', '木魚', 'common', 'stone', { a: '#8a5a3b', b: '#3b2a1e', c: '#e8c25a' }, '剛好用兩張素材下筆時，倍率 +12。', { school: 'minimal', start: 'monk',
      play: (x) => (x.sel.length === 2 ? { mult: 12 } : null) }),
    O('whitespace', '留白', 'common', 'paper', { a: '#ffffff', b: '#c9d1dc', c: '#e8edf6' }, '下筆的素材每比五張少一張，倍率 +4。', { school: 'minimal',
      play: (x) => (x.sel.length < 5 ? { mult: 4 * (5 - x.sel.length) } : null) }),
    O('eraser', '橡皮擦', 'common', 'box', { a: '#ff8fb1', b: '#a34a6b', c: '#ffffff' }, '今晚每剩下一次下筆次數，倍率 +6。', { school: 'minimal',
      play: (x) => { const k = x.ses ? x.ses.plays - 1 : 0; return k > 0 ? { mult: 6 * k } : null; } }),
    O('zen', '枯山水', 'rare', 'stone', { a: '#e8edf6', b: '#8d99b4', c: '#9be36b' }, '只用一張素材下筆時，那張素材再計分兩次。', { school: 'minimal',
      retrig: (c, x) => (x.sel.length === 1 ? 2 : 0) }),
    O('capsule', '膠囊衣櫃', 'rare', 'coat', { a: '#e8edf6', b: '#5a6478', c: '#37c3d6' }, '素材庫少於 20 張時，倍率 ×1.5；少於 12 張時 ×2.5。', { school: 'minimal',
      play: (x) => (x.s.cards.length < 12 ? { xmult: 2.5 } : x.s.cards.length < 20 ? { xmult: 1.5 } : null), show: (s) => '現在 ' + s.cards.length + ' 張' }),
    O('monolith', '黑色方碑', 'legend', 'cube', { a: '#1b1b28', b: '#000000', c: '#5a6478' }, '下筆的素材少於三張時，倍率 ×3。', { school: 'minimal', unlock: unlockSchool('minimal'),
      play: (x) => (x.sel.length < 3 ? { xmult: 3 } : null) }),
    // 媒材物件（不屬於任何流派）
    O('fountainpen', '鋼筆', 'common', 'pen', { a: '#1b1b28', b: '#5a6478', c: '#e8c25a' }, '每張「紙」素材計分時，倍率 +2。', {
      card: (c) => (med(c) === 'paper' ? { mult: 2 } : null) }),
    O('earphones', '降噪耳機', 'common', 'earplug', { a: '#37c3d6', b: '#1b1b28', c: '#ffffff' }, '每張「聲」素材計分時，籌碼 +25。', {
      card: (c) => (med(c) === 'sound' ? { chips: 25 } : null) }),
    O('projector', '投影機', 'common', 'camera', { a: '#5a6478', b: '#26334d', c: '#ffe9a8' }, '每張「影」素材計分時，倍率 +2。', {
      card: (c) => (med(c) === 'image' ? { mult: 2 } : null) }),
    O('tattoo', '刺青', 'rare', 'hand', { a: '#f2c6a0', b: '#8e5b3a', c: '#3fb6d9' }, '每張「身」素材計分時，倍率 ×1.25；每次下筆身體 −1。', {
      card: (c) => (med(c) === 'body' ? { xmult: 1.25 } : null), after: () => ({ body: -1 }) }),
    O('usb', '隨身碟', 'common', 'box', { a: '#9be36b', b: '#26334d', c: '#ffffff' }, '每張「數」素材計分時，倍率 +2。', {
      card: (c) => (med(c) === 'data' ? { mult: 2 } : null) }),
    O('prism', '稜鏡', 'rare', 'shard', { a: '#ffffff', b: '#9b8cff', c: '#37c3d6' }, '下筆的素材每有一種不同的媒材，倍率 +4。', {
      play: (x) => ({ mult: 4 * x.mdistinct }) }),
    O('curator', '策展人的名片', 'rare', 'card', { a: '#1b1b28', b: '#e8c25a', c: '#ffffff' }, '作品形式是「連作」或「三部曲」時，倍率 ×2.5。', {
      play: (x) => (x.form === 'series' || x.form === 'trilogy' ? { xmult: 2.5 } : null) }),
    O('gesamt', '總體藝術宣言', 'legend', 'book', { a: '#ffd36b', b: '#ff4fb4', c: '#37c3d6' }, '作品形式是「跨界」時，倍率 ×3。', {
      play: (x) => (x.form === 'crossover' ? { xmult: 3 } : null) }),
  ];
  NEW_OBJECTS.forEach((o) => { D.OBJECTS.push(o); D.OBJ[o.id] = o; if (o.start) D.START_OBJECT[o.start] = o.id; });

  // 舊物件歸入流派
  const OLD = {
    flood: ['whistle', 'boatlamp', 'snowglobe', 'raincoat'],
    neon: ['subwoofer', 'ringlight', 'anonacct', 'slogans', 'carnivalmask'],
    cliche: ['frame24', 'rubbing', 'lastpainter'],
    guilt: ['confkey', 'stolen'],
    machine: ['robocat', 'solder', 'autoedit', 'kpiclock', 'instant'],
    hunger: ['emptybowl', 'thermobag', 'nightlamp', 'pills'],
    rebel: ['spraycan', 'angrydiary', 'shredder', 'neonshard'],
    warmth: ['sweetbowl', 'oldpoems', 'lyricbook', 'penguin', 'aliencard', 'guitar', 'costume', 'dreamcatcher'],
    faraway: ['passport', 'postcards', 'aliencompass', 'scarab', 'moondust', 'collectorbox', 'oldmap', 'manekineko'],
    minimal: ['redpen', 'minimoai', 'weight21'],
  };
  Object.keys(OLD).forEach((sc) => OLD[sc].forEach((id) => { if (D.OBJ[id]) D.OBJ[id].school = sc; }));
  // 每個角色的流派（起始物件的流派）
  const schoolOf = (bg) => { const o = D.OBJ[D.START_OBJECT[bg]]; return o ? o.school || null : null; };

  // ---------- 流派的傳說組合（要裝備三件同流派的物件） ----------
  const SC = (s) => (IE.Create ? IE.Create.schoolCounts(s) : {});
  const R = (id, name, need, chips, mult, extra) => Object.assign({ id, name, need, chips, mult, legend: true }, extra);
  D.RECIPES.push(
    R('sunkcity', '沉沒之城', { water: 4 }, 100, 6, { xmult: 3, school: 'flood',
      cond: (s) => (SC(s).flood || 0) >= 3 && s.water >= 5, hint: '水淹到五樓以上的時候，帶著三件水淹流的物件，用四張以上的水。' }),
    R('nightless', '不夜城', { neon: 3 }, 80, 5, { xmult: 3, school: 'neon',
      cond: (s) => (SC(s).neon || 0) >= 3 && s.spark < 2, hint: '火花快要熄滅的時候，用三件霓虹流的物件，把霓虹堆起來。' }),
    R('classic', '經典', {}, 60, 5, { xmult: 4, school: 'cliche',
      cond: (s, sel) => (SC(s).cliche || 0) >= 3 && sel.length === 5 && sel.every((c) => (c.wear || 0) >= 4), hint: '五件用到爛的東西，加上三件陳腔濫調流的物件，就是經典。' }),
    R('originalsin', '原罪', { guilt: 2 }, 90, 6, { xmult: 3, school: 'guilt',
      cond: (s) => (SC(s).guilt || 0) >= 3 && s.soul >= 30, hint: '靈魂重得光束拉不動的時候，帶著三件愧疚流的物件，把愧疚寫出來。' }),
    R('singularity', '奇點', {}, 80, 6, { xmult: 3, school: 'machine',
      cond: (s, sel) => (SC(s).machine || 0) >= 3 && sel.length === 5 && sel.every((c) => mediumOf(c) === 'data'), hint: '五張數據，加上三件機械流的物件。' }),
    R('famine', '斷糧', { hunger: 3 }, 80, 5, { xmult: 3, school: 'hunger',
      cond: (s) => (SC(s).hunger || 0) >= 3 && s.cr < 50, hint: '口袋裡不夠 $50 的時候，帶著三件飢餓流的物件，寫你的肚餓。' }),
    R('uprising', '起義', { rebel: 3 }, 90, 6, { xmult: 3, school: 'rebel',
      cond: (s) => (SC(s).rebel || 0) >= 3 && !!(s.session && s.session.stage && s.session.stage.kind === 'boss'), hint: '在外星評審的面前，帶著三件反叛流的物件，用三張以上的反叛。' }),
    R('reunion', '大團圓', { warmth: 3 }, 80, 6, { xmult: 3, school: 'warmth',
      cond: (s) => (SC(s).warmth || 0) >= 3 && closeFriends(s) >= 4, hint: '有四位熟絡的朋友仍在浮城的時候，帶著三件人情流的物件。' }),
    R('aroundworld', '環遊世界', {}, 80, 6, { xmult: 4, school: 'faraway',
      cond: (s, sel) => (SC(s).faraway || 0) >= 3 && new Set(sel.filter(foreign).map((c) => c.origin || c.id)).size >= 4, hint: '四個不同地方的東西，加上三件遠方流的物件。' }),
    R('one', '一', {}, 0, 0, { xmult: 8, school: 'minimal',
      cond: (s, sel) => (SC(s).minimal || 0) >= 3 && sel.length === 1 && !(sel[0].wear), hint: '三件極簡流的物件，加一張從未用過的素材。就這樣。' }),
  );

  Object.assign(D, { MEDIA, mediumOf, foreign, SCHOOLS, schoolOf, closeFriends });
});
