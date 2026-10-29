// 《靈感撤離 2080》遊戲內容資料：標籤、素材卡、組合、KPI、開局背景、季節、NPC、事件、文字。
// 所有數值調整集中喺度同 rules.js，方便用 tools/sim.js 做平衡模擬。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';

  // 素材標籤：每張素材卡有 1 至 2 個標籤，組合靠標籤觸發
  const TAGS = {
    water:   { name: '水',   color: '#3fb6d9' },
    neon:    { name: '霓虹', color: '#ff4fb4' },
    hunger:  { name: '飢餓', color: '#f08a3c' },
    memory:  { name: '記憶', color: '#e8c25a' },
    machine: { name: '機械', color: '#8e9bb0' },
    warmth:  { name: '人情', color: '#ff6b5e' },
    hope:    { name: '希望', color: '#9be36b' },
    anger:   { name: '憤怒', color: '#d6334a' },
    rebel:   { name: '反叛', color: '#a77bff' },
  };

  // 素材卡目錄。value = 籌碼值
  const CARDS = {
    // AI 數據標註
    l_cat:      { name: '第 4,812 張貓圖',        tags: ['machine'],            value: 12 },
    l_sunset:   { name: 'AI 生成嘅日落',          tags: ['machine', 'neon'],    value: 16 },
    l_rules:    { name: '標註員守則 v3.2',        tags: ['machine', 'anger'],   value: 16 },
    l_notart:   { name: '一幅被判定「非藝術」嘅畫', tags: ['machine', 'memory'],  value: 18 },
    l_screen:   { name: '凌晨三點嘅螢幕光',        tags: ['machine', 'neon'],    value: 14 },
    l_error:    { name: '系統錯誤訊息',            tags: ['machine'],            value: 10 },
    l_poison:   { name: '故意標錯嘅數據',          tags: ['rebel', 'machine'],   value: 22 },
    // 情緒陪伴
    s_steak:    { name: '客人食剩嘅真牛扒',        tags: ['hunger', 'neon'],     value: 20 },
    s_joke:     { name: '有錢人講嘅笑話',          tags: ['anger', 'neon'],      value: 18 },
    s_perfume:  { name: 'VIP 房嘅香水味',          tags: ['neon'],               value: 14 },
    s_face:     { name: '笑到面僵',                tags: ['anger', 'machine'],   value: 16 },
    s_truth:    { name: '客人醉後講嘅真心話',      tags: ['warmth', 'neon'],     value: 26 },
    s_complaint:{ name: '投訴信',                  tags: ['anger'],              value: 14 },
    // 舊城潛水遺物
    d_album:    { name: '浸濕嘅相簿',              tags: ['water', 'memory'],    value: 22 },
    d_vinyl:    { name: '一張黑膠唱片',            tags: ['memory', 'hope'],     value: 30 },
    d_comic:    { name: '實體漫畫第 7 期',         tags: ['memory'],             value: 18 },
    d_chime:    { name: '生鏽嘅風鈴',              tags: ['water', 'memory'],    value: 20 },
    d_letter:   { name: '舊時代嘅情書',            tags: ['memory', 'warmth'],   value: 28 },
    d_sign:     { name: '海底嘅霓虹招牌',          tags: ['water', 'neon'],      value: 22 },
    d_crayon:   { name: '細路仔嘅蠟筆畫',          tags: ['hope', 'memory'],     value: 34 },
    d_paste:    { name: '一盒 2061 年嘅合成糊',    tags: ['hunger', 'water'],    value: 16 },
    d_jelly:    { name: '發光嘅水母',              tags: ['water', 'hope'],      value: 28 },
    // NPC 朋友
    n_ken1:     { name: '牆上未完成嘅壁畫',        tags: ['rebel', 'hope'],      value: 26 },
    n_ken2:     { name: '阿 Ken 嘅噴漆罐',         tags: ['rebel'],              value: 18 },
    n_dj1:      { name: '天台嘅低音',              tags: ['neon', 'rebel'],      value: 24 },
    n_dj2:      { name: '一首未出嘅 demo',         tags: ['hope', 'neon'],       value: 26 },
    n_ho1:      { name: '何伯嘅舊詩',              tags: ['memory', 'warmth'],   value: 26 },
    n_ho2:      { name: '何伯沖嘅茶',              tags: ['warmth'],             value: 16 },
    n_miu1:     { name: 'Miu 嘅機械貓',            tags: ['machine', 'warmth'],  value: 24 },
    n_miu2:     { name: '改裝晶片',                tags: ['machine', 'rebel'],   value: 22 },
    n_fong1:    { name: '一段粵劇唱腔',            tags: ['memory', 'anger'],    value: 26 },
    n_fong2:    { name: '芳姐嘅糖水',              tags: ['warmth', 'hope'],     value: 24 },
    // 夢
    r_alien:    { name: '外星人面試嘅夢',          tags: ['hope', 'neon'],       value: 30 },
    r_astar:    { name: '夢見阿星',                tags: ['memory', 'hope'],     value: 30 },
    r_flood:    { name: '浸水嘅夢',                tags: ['water', 'memory'],    value: 24 },
    // 事件
    e_hunger:   { name: '肚餓嘅聲音',              tags: ['hunger'],             value: 14 },
    e_flood:    { name: '水浸到門口',              tags: ['water', 'anger'],     value: 18 },
    e_soup:     { name: '隔籬阿婆嘅湯',            tags: ['warmth', 'hope'],     value: 26 },
    e_rob:      { name: '被打劫之後',              tags: ['anger'],              value: 16 },
    e_dark:     { name: '停電嘅晚上',              tags: ['memory', 'hope'],     value: 22 },
    e_evict:    { name: '被趕出街嗰日',            tags: ['anger', 'hunger'],    value: 22 },
    e_alien:    { name: '可疑外星訊號',            tags: ['hope', 'machine'],    value: 24 },
    e_cult:     { name: '「被提」傳單',            tags: ['hope', 'water'],      value: 18 },
    e_rent:     { name: '加租通知書',              tags: ['anger', 'hunger'],    value: 18 },
    // 開局背景
    b_slogan:   { name: '被斃咗嘅廣告 slogan',     tags: ['neon', 'anger'],      value: 18 },
    b_lanyard:  { name: '舊公司嘅職員證',          tags: ['machine', 'memory'],  value: 16 },
    b_novel:    { name: '一本寫咗一半嘅小說',      tags: ['memory', 'hope'],     value: 28 },
    b_whistle:  { name: '救生員哨子',              tags: ['water', 'warmth'],    value: 20 },
    b_photo:    { name: '褪色嘅泳會合照',          tags: ['water', 'memory'],    value: 20 },
    b_repo:     { name: '被 AI 取代嘅 repo',       tags: ['machine', 'anger'],   value: 18 },
    b_log:      { name: '深夜嘅 debug log',        tags: ['machine'],            value: 12 },
    b_guitar:   { name: '斷咗弦嘅結他',            tags: ['memory', 'rebel'],    value: 24 },
    b_coins:    { name: '街頭打賞嘅硬幣',          tags: ['warmth'],             value: 14 },
    b_song:     { name: '一首冇人聽嘅歌',          tags: ['hope', 'anger'],      value: 22 },
    b_echo:     { name: '天橋底嘅回音',            tags: ['water', 'neon'],      value: 18 },
  };

  const CARD_POOLS = {
    label:   ['l_cat', 'l_sunset', 'l_rules', 'l_notart', 'l_screen', 'l_error'],
    smile:   ['s_steak', 's_joke', 's_perfume', 's_face'],
    dive:    ['d_album', 'd_comic', 'd_chime', 'd_sign', 'd_paste', 'd_letter', 'd_vinyl'],
    diveRare:['d_crayon', 'd_jelly', 'd_vinyl', 'd_letter'],
    dream:   ['r_alien', 'r_astar', 'r_flood'],
  };

  // 具名組合：need = 每個標籤最少要有幾多張卡包含佢
  const RECIPES = [
    { id: 'childhood', name: '浸水童年',   need: { water: 1, memory: 1, hunger: 1 }, chips: 30, mult: 3 },
    { id: 'nostalgia', name: '電子鄉愁',   need: { neon: 1, machine: 1, memory: 1 }, chips: 25, mult: 2.5 },
    { id: 'robodream', name: '機械人嘅夢', need: { machine: 1, hope: 1 },            chips: 15, mult: 1.5 },
    { id: 'band',      name: '地下樂隊',   need: { rebel: 1, anger: 1, warmth: 1 },  chips: 35, mult: 3 },
    { id: 'diary',     name: '浮城日記',   need: { water: 1, neon: 1, warmth: 1 },   chips: 25, mult: 2.5 },
    { id: 'lovesong',  name: '末世情歌',   need: { warmth: 1, hope: 1, memory: 1 },  chips: 30, mult: 3 },
    { id: 'labeler',   name: '標註員之死', need: { machine: 3, rebel: 1 },           chips: 40, mult: 3.5 },
    { id: 'dinner',    name: '有錢人嘅晚餐', need: { neon: 1, hunger: 1, anger: 1 }, chips: 30, mult: 2.5 },
    { id: 'archaeo',   name: '舊城考古',   need: { water: 2, memory: 2 },            chips: 30, mult: 2.5 },
    { id: 'blackhumor',name: '黑色幽默',   need: { hope: 1, anger: 1 },              chips: 15, mult: 1.5 },
    { id: 'letter',    name: '外星來信',   need: { hope: 1, neon: 1 },               chips: 15, mult: 1.5 },
    { id: 'rentday',   name: '交租日',     need: { hunger: 1, machine: 1, anger: 1 },chips: 25, mult: 2.5 },
  ];

  // 同一標籤出現喺幾多張卡
  const RESONANCE = [
    { count: 5, id: 'res5', name: '全情投入', chips: 80, mult: 4 },
    { count: 4, id: 'res4', name: '共鳴',     chips: 40, mult: 2 },
    { count: 3, id: 'res3', name: '同調',     chips: 20, mult: 1 },
  ];
  const MEDLEY = { id: 'medley', name: '百感交集', minTags: 6, chips: 20, mult: 2 };

  // 外星 KPI：每季抽一個，互相矛盾係刻意嘅
  const KPIS = {
    hope:     { name: '今季重視：希望',          desc: '有「希望」嘅作品 ×1.6',      tag: 'hope',    mod: 1.6 },
    water:    { name: '本地化指標：要有水',      desc: '有「水」嘅作品 ×1.6',        tag: 'water',   mod: 1.6 },
    machine:  { name: '數據驅動：要有機械',      desc: '有「機械」嘅作品 ×1.6',      tag: 'machine', mod: 1.6 },
    warmth:   { name: '團隊精神：要有人情',      desc: '有「人情」嘅作品 ×1.6',      tag: 'warmth',  mod: 1.6 },
    noanger:  { name: '文化契合度：拒絕負面情緒', desc: '有「憤怒」嘅作品唔計分',     tag: 'anger',   mod: 0 },
    norebel:  { name: '合規審查：拒絕反叛',      desc: '有「反叛」嘅作品唔計分',     tag: 'rebel',   mod: 0 },
    novelty:  { name: '創新指標：唔好重複',      desc: '用過嘅組合再用只計 20%',     special: 'novelty' },
    lean:     { name: '精益創作：少即是多',      desc: '用 4 張或以上素材 ×0.5',     special: 'lean' },
    pliable:  { name: '可塑性：我哋欣賞聽話嘅人', desc: '火花低過 ×2 時創作 ×1.5',  special: 'pliable' },
  };

  // 累積訊號門檻（第 10、20、30 日）
  const THRESHOLDS = [28000, 31000, 34000];

  const BACKGROUNDS = {
    copywriter: {
      name: '前廣告公司文案', short: '前文案',
      desc: '識寫嘢，有少少積蓄。', perkText: '創作籌碼 +15%',
      cr: 170, body: 85, spark: 2.4, floor: 4, medium: '寫咗一篇',
      cards: ['b_slogan', 'b_lanyard', 'b_novel'],
      perk: { craftChips: 1.15 },
    },
    lifeguard: {
      name: '退役潛水救生員', short: '前救生員',
      desc: '身體好，識潛水，火花偏低。', perkText: '潛水氧氣 +35%，潛水體力消耗減半',
      cr: 180, body: 100, spark: 1.7, floor: 3, medium: '畫咗一幅',
      cards: ['b_whistle', 'b_photo'],
      perk: { oxygen: 1.35, diveBody: 0.5 },
    },
    programmer: {
      name: '失業程式員', short: '前程式員',
      desc: '有積蓄，標註快，火花最低。', perkText: '標註人工 +25%',
      cr: 280, body: 80, spark: 1.5, floor: 5, medium: '砌咗一幅像素畫',
      cards: ['b_repo', 'b_log'],
      perk: { labelPay: 1.25 },
    },
    busker: {
      name: '街頭樂手', short: '街頭樂手',
      desc: '火花最高，冇錢。', perkText: '同朋友傾偈唔使錢，仲多一張素材',
      cr: 60, body: 75, spark: 2.7, floor: 2, medium: '寫咗一首歌',
      cards: ['b_guitar', 'b_coins', 'b_song', 'b_echo'],
      perk: { freeChat: true, chatExtra: 1 },
    },
  };

  const SEASONS = {
    storm: {
      name: '風暴季', desc: '水位升得快，舊城多遺物。',
      water: 0.26, food: 30, nightBody: 0, outdoorBody: 0, labelPay: 1, diveRelics: 1,
      sky: ['#0b2a3a', '#14485a'], tint: '#38c6c0', weather: 'storm',
    },
    heat: {
      name: '熱浪季', desc: '電費貴，夜晚熱到瞓唔著。',
      water: 0.2, food: 40, nightBody: -3, outdoorBody: 0, labelPay: 1, diveRelics: 0,
      sky: ['#3a1410', '#7a2e16'], tint: '#ff8a3c', weather: 'heat',
    },
    acid: {
      name: '酸雨季', desc: '出街扣身體，室內工人工高啲。',
      water: 0.2, food: 30, nightBody: 0, outdoorBody: -5, labelPay: 1.15, diveRelics: 0,
      sky: ['#1d2a10', '#3d4a12'], tint: '#c4e04a', weather: 'acid',
    },
  };

  // 同一區嘅創作人朋友，篩選日會被帶走
  const NPCS = [
    { id: 'ken',  name: '畫牆嘅阿 Ken',    cards: ['n_ken1', 'n_ken2'],  base: 260 },
    { id: 'dj',   name: '天台 DJ 細妹',    cards: ['n_dj1', 'n_dj2'],    base: 300 },
    { id: 'ho',   name: '寫詩嘅何伯',      cards: ['n_ho1', 'n_ho2'],    base: 220 },
    { id: 'miu',  name: '改裝機械人嘅 Miu', cards: ['n_miu1', 'n_miu2'], base: 280 },
    { id: 'fong', name: '唱粵劇嘅芳姐',    cards: ['n_fong1', 'n_fong2'], base: 240 },
  ];

  // 樓層租金系數：0 = 天橋底
  const FLOOR_RENT = [0, 0.6, 0.7, 0.85, 1.0, 1.15, 1.3, 1.5, 1.75];
  const BASE_RENT = 190;

  const SHOP = {
    premium:    { name: '浮聲 Premium',  desc: '5 日內打工冇廣告',          cost: 60 },
    supplement: { name: '靈感補充劑',    desc: '火花即刻 +1.2，兩日後 −1.6', cost: 80 },
    realfood:   { name: '真食物套餐',    desc: '身體 +15，火花 +0.2（每日一次）', cost: 55 },
    tools:      { name: '二手創作工具',  desc: '創作可以用 5 張素材',        cost: 160 },
    gear:       { name: '潛水裝備升級',  desc: '潛水氧氣 +25%',              cost: 140 },
  };

  // 夜晚隨機事件
  const EVENTS = [
    { id: 'soup',    w: 3, text: '隔籬阿婆煲咗湯，順手俾咗你一碗。', body: 10, card: 'e_soup' },
    { id: 'flood',   w: 3, text: '水浸到門口。你用咗成晚舀水。',     body: -5, card: 'e_flood', season: { storm: 2 } },
    { id: 'rob',     w: 2, text: '返屋企途中被打劫。',               crPct: -0.25, crMax: 60, card: 'e_rob' },
    { id: 'hike',    w: 2, text: '業主話下期開始加租 10%。',         rentHike: 0.1, card: 'e_rent' },
    { id: 'dark',    w: 2, text: '停電。黑暗入面，你諗到啲嘢。',     spark: 0.2, card: 'e_dark', season: { heat: 2 } },
    { id: 'bigorder',w: 2, text: '黑市大單：聽日標註人工 ×2。',      flag: 'bigOrder' },
    { id: 'signal',  w: 2, text: '收音機收到一段唔屬於地球嘅訊號。', card: 'e_alien' },
    { id: 'algo',    w: 2, text: '平台演算法更新。你嘅評分無故跌咗。', rating: -0.3 },
    { id: 'tip',     w: 2, text: '有人放料：聽日舊城有寶。',         flag: 'richDive' },
    { id: 'cult',    w: 1, text: '邪教上門派傳單，話水浸係「被提」嘅預兆。', card: 'e_cult' },
    { id: 'roof',    w: 2, text: '酸雨蝕穿屋頂，漏咗成晚。',         body: -8, onlySeason: 'acid' },
    { id: 'heatwave',w: 2, text: '熱浪停電，冷氣停咗。',             body: -8, onlySeason: 'heat' },
  ];

  // 朝早「浮聲」feed
  const FEED = {
    weather: {
      storm: ['天文台：今日八號風球，舊城水流急。', '颱風「KPI」正喺浮城以南 40 公里。', '暴雨警告：半浸區居民請自行游返屋企。'],
      heat: ['天文台：今日 47 度，體感 52 度。', '電力公司：今晚冷氣用電將以拍賣形式分配。', '熱浪警告：請避免思考，以減少腦部發熱。'],
      acid: ['天文台：酸雨 pH 3.1，出街請着全身雨衣。', '酸雨持續，雨傘價格上升 300%。', '市民注意：雨水唔可以飲，再次提提你。'],
    },
    conspiracy: [
      '@真相獵人：失蹤嗰啲人係被政府抽去做人體實驗！！醒下啦',
      '@浮城媽媽：聽講大企業抽人腦去 train AI，大家小心',
      '@末日教會：佢哋唔係失蹤，係被提。下一個可以係你 🙏',
      '@偷渡專家：佢哋自己買船飛走咗啫，私訊我有門路',
      '@外星派：外星人帶走咗佢哋。我有證據（證據：一張模糊相）',
      '@理性派：大家冷靜，失蹤人口其實同上年差唔多（帖文已被刪除）',
    ],
    ads: [
      '【廣告】靈感補充劑：被選中機會提升 300%！*（*結果因人而異）',
      '【廣告】天空區示範單位，首期只需 999 年供款。',
      '【廣告】AI 情緒伴侶：佢永遠唔會嫌你窮。',
      '【廣告】你嘅靈感值幾多錢？立即免費估價。',
      '【廣告】浮聲 Premium：冇廣告嘅人生，月費 $60。',
    ],
    autoNews: {
      30: '新聞：標註數據累積充足，AI 情緒伴侶 2.0 即將上線。',
      50: '新聞：AI 情緒伴侶 2.0 正式上線。「企業情緒陪伴員」職位全數取消。',
      80: '新聞：視覺 AI 準確度達 99.2%，標註員需求預計大幅下降。',
      100: '新聞：AI 標註 AI 標註嘅數據。「AI 數據標註員」職位正式取消。',
    },
  };

  // 阿星訊息：用格式變化講故事
  const ASTAR = {
    2:  { style: 'casual', text: '喂！！我上咗嚟啦😭😭 呢度啲星好靚 你快啲嚟啦' },
    6:  { style: 'casual', text: '今日開咗 onboarding 🤣 原來佢哋都有 KPI 不過包食包住' },
    11: { style: 'memo',   text: '【內部通訊】各位地球候選人好，請保持靈感穩定，切勿過度思考。— 阿星' },
    16: { style: 'memo',   text: '我哋被教咗唔好諗太多。其實都幾舒服。' },
    21: { style: 'auto',   text: '【自動回覆】多謝你嘅訊息。阿星（星際人才發展局・第 7 區・靈感資源專員）暫時未能回覆。' },
    26: { style: 'glitch', text: '唔好上嚟' },
    29: { style: 'auto',   text: '【自動回覆】多謝你嘅訊息。' },
  };

  // 標註小遊戲嘅圖片同指引
  const LABEL_ITEMS = ['cat', 'dog', 'fish', 'smile', 'cry', 'robot', 'framed', 'graffiti', 'flower', 'paste', 'vinyl', 'tower'];
  const LABEL_PROMPTS = [
    { q: '係唔係貓？',     rule: '指引 v1.0：只有貓係貓。',                   yes: ['cat'] },
    { q: '係唔係人類？',   rule: '指引 v2.1：機械人唔係人類（暫時）。',        yes: ['smile', 'cry'] },
    { q: '係唔係快樂？',   rule: '指引 v3.0：露齒先算快樂。',                  yes: ['smile'] },
    { q: '係唔係藝術？',   rule: '指引 v3.2：有畫框先算藝術。',                yes: ['framed'] },
    { q: '可唔可以食？',   rule: '指引 v1.4：合成糊同魚可以食。',              yes: ['fish', 'paste'] },
    { q: '有冇商業價值？', rule: '指引 v5.0：可以賣嘅先有價值。',              yes: ['framed', 'vinyl', 'paste', 'tower', 'robot'] },
  ];

  const ADS = [
    '靈感補充劑\n被選中機會 +300%',
    '天空區示範單位\n首期 999 年',
    'AI 情緒伴侶\n佢唔會嫌你窮',
    '你今日笑咗未？\n立即訂閱快樂',
    '浮聲 Premium\n去廣告 $60',
  ];

  IE.DATA = {
    TAGS, CARDS, CARD_POOLS, RECIPES, RESONANCE, MEDLEY, KPIS, THRESHOLDS,
    BACKGROUNDS, SEASONS, NPCS, FLOOR_RENT, BASE_RENT, SHOP, EVENTS, FEED, ASTAR,
    LABEL_ITEMS, LABEL_PROMPTS, ADS,
    DAYS: 30, REVIEW_DAYS: [10, 20, 30], SLOTS: ['朝早', '晏晝', '夜晚'],
  };
});
