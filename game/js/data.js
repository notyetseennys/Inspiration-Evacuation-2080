// 《靈感撤離 2080》遊戲內容資料：標籤、素材卡、組合、KPI、開局背景、季節、NPC、事件、小遊戲內容與文字。
// 數值集中在此檔與 rules.js，方便以 tools/sim.js 做平衡模擬。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';

  // 素材標籤：每張素材卡有一至兩個標籤，組合由標籤觸發
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
    guilt:   { name: '愧疚', color: '#a89a82' },
  };

  // 素材卡目錄。value 為籌碼值
  const CARDS = {
    // AI 數據標註
    l_cat:      { name: '第 4,812 張貓圖',          tags: ['machine'],            value: 12 },
    l_sunset:   { name: 'AI 生成的日落',            tags: ['machine', 'neon'],    value: 16 },
    l_rules:    { name: '標註員守則 v3.2',          tags: ['machine', 'anger'],   value: 16 },
    l_notart:   { name: '一幅被判定為「非藝術」的畫', tags: ['machine', 'memory'],  value: 18 },
    l_screen:   { name: '凌晨三點的螢幕光',          tags: ['machine', 'neon'],    value: 14 },
    l_error:    { name: '系統錯誤訊息',              tags: ['machine'],            value: 10 },
    l_poison:   { name: '故意標錯的數據',            tags: ['rebel', 'machine'],   value: 22 },
    l_flow:     { name: '心流過後的空白',            tags: ['machine'],            value: 20 },
    // 情緒陪伴
    s_steak:    { name: '客人吃剩的真牛排',          tags: ['hunger', 'neon'],     value: 20 },
    s_joke:     { name: '有錢人講的笑話',            tags: ['anger', 'neon'],      value: 18 },
    s_perfume:  { name: 'VIP 房的香水味',            tags: ['neon'],               value: 14 },
    s_face:     { name: '笑到僵硬的臉',              tags: ['anger', 'machine'],   value: 16 },
    s_truth:    { name: '客人醉後說的真心話',        tags: ['warmth', 'neon'],     value: 26 },
    s_complaint:{ name: '投訴信',                    tags: ['anger'],              value: 14 },
    s_wine:     { name: '倒得剛剛好的一杯酒',        tags: ['neon', 'warmth'],     value: 20 },
    // 舊城潛水遺物
    d_album:    { name: '泡濕的相簿',                tags: ['water', 'memory'],    value: 22 },
    d_vinyl:    { name: '一張黑膠唱片',              tags: ['memory', 'hope'],     value: 30 },
    d_comic:    { name: '實體漫畫第 7 期',           tags: ['memory'],             value: 18 },
    d_chime:    { name: '生鏽的風鈴',                tags: ['water', 'memory'],    value: 20 },
    d_letter:   { name: '舊時代的情書',              tags: ['memory', 'warmth'],   value: 28 },
    d_sign:     { name: '海底的霓虹招牌',            tags: ['water', 'neon'],      value: 22 },
    d_crayon:   { name: '小孩的蠟筆畫',              tags: ['hope', 'memory'],     value: 34 },
    d_paste:    { name: '一盒 2061 年的合成糊',      tags: ['hunger', 'water'],    value: 16 },
    d_jelly:    { name: '發光的水母',                tags: ['water', 'hope'],      value: 28 },
    k_ticket:   { name: '一張沒用過的地鐵車票',      tags: ['memory', 'hope'],     value: 24 },
    k_badge:    { name: '商場員工的名牌',            tags: ['machine', 'memory'],  value: 18 },
    k_bag:      { name: '被遺下的行李箱',            tags: ['memory', 'warmth'],   value: 26 },
    f_scale:    { name: '霓虹鰻的鱗片',              tags: ['neon', 'water'],      value: 22 },
    f_eye:      { name: '石斑眼中的倒影',            tags: ['water', 'memory'],    value: 26 },
    // 道德抉擇與義工
    m_family:   { name: '別人的全家福',              tags: ['warmth', 'memory'],   value: 24 },
    m_thanks:   { name: '婆婆的道謝',                tags: ['warmth', 'hope'],     value: 24 },
    m_saved:    { name: '被救起的人',                tags: ['hope', 'water'],      value: 28 },
    v_shelter:  { name: '避難所的晚上',              tags: ['warmth', 'hope'],     value: 22 },
    // NPC 朋友
    n_ken1:     { name: '牆上未完成的壁畫',          tags: ['rebel', 'hope'],      value: 26 },
    n_ken2:     { name: '阿 Ken 的噴漆罐',           tags: ['rebel'],              value: 18 },
    n_dj1:      { name: '天台的低音',                tags: ['neon', 'rebel'],      value: 24 },
    n_dj2:      { name: '一首未發表的 demo',         tags: ['hope', 'neon'],       value: 26 },
    n_ho1:      { name: '何伯的舊詩',                tags: ['memory', 'warmth'],   value: 26 },
    n_ho2:      { name: '何伯沏的茶',                tags: ['warmth'],             value: 16 },
    n_miu1:     { name: 'Miu 的機械貓',              tags: ['machine', 'warmth'],  value: 24 },
    n_miu2:     { name: '改裝晶片',                  tags: ['machine', 'rebel'],   value: 22 },
    n_fong1:    { name: '一段粵劇唱腔',              tags: ['memory', 'anger'],    value: 26 },
    n_fong2:    { name: '芳姐的糖水',                tags: ['warmth', 'hope'],     value: 24 },
    // 夢
    r_alien:    { name: '外星人面試的夢',            tags: ['hope', 'neon'],       value: 30 },
    r_astar:    { name: '夢見阿星',                  tags: ['memory', 'hope'],     value: 30 },
    r_flood:    { name: '水淹的夢',                  tags: ['water', 'memory'],    value: 24 },
    // 事件
    e_hunger:   { name: '肚餓的聲音',                tags: ['hunger'],             value: 14 },
    e_flood:    { name: '水淹到門口',                tags: ['water', 'anger'],     value: 18 },
    e_soup:     { name: '隔壁婆婆的湯',              tags: ['warmth', 'hope'],     value: 26 },
    e_rob:      { name: '被搶劫之後',                tags: ['anger'],              value: 16 },
    e_dark:     { name: '停電的晚上',                tags: ['memory', 'hope'],     value: 22 },
    e_evict:    { name: '被趕出門的那天',            tags: ['anger', 'hunger'],    value: 22 },
    e_alien:    { name: '可疑的外星訊號',            tags: ['hope', 'machine'],    value: 24 },
    e_cult:     { name: '「被提」傳單',              tags: ['hope', 'water'],      value: 18 },
    e_rent:     { name: '加租通知書',                tags: ['anger', 'hunger'],    value: 18 },
    // 開局背景
    b_slogan:   { name: '被否決的廣告標語',          tags: ['neon', 'anger'],      value: 18 },
    b_lanyard:  { name: '舊公司的職員證',            tags: ['machine', 'memory'],  value: 16 },
    b_novel:    { name: '一本寫了一半的小說',        tags: ['memory', 'hope'],     value: 28 },
    b_whistle:  { name: '救生員哨子',                tags: ['water', 'warmth'],    value: 20 },
    b_photo:    { name: '褪色的泳會合照',            tags: ['water', 'memory'],    value: 20 },
    b_repo:     { name: '被 AI 取代的程式庫',        tags: ['machine', 'anger'],   value: 18 },
    b_log:      { name: '深夜的除錯紀錄',            tags: ['machine'],            value: 12 },
    b_guitar:   { name: '斷了弦的結他',              tags: ['memory', 'rebel'],    value: 24 },
    b_coins:    { name: '街頭打賞的硬幣',            tags: ['warmth'],             value: 14 },
    b_song:     { name: '一首沒人聽的歌',            tags: ['hope', 'anger'],      value: 22 },
    b_echo:     { name: '天橋下的回音',              tags: ['water', 'neon'],      value: 18 },
  };

  const CARD_POOLS = {
    label:   ['l_cat', 'l_sunset', 'l_rules', 'l_notart', 'l_screen', 'l_error'],
    smile:   ['s_steak', 's_joke', 's_perfume', 's_face'],
    dream:   ['r_alien', 'r_astar', 'r_flood'],
  };

  // 具名組合：need 表示每個標籤最少要有多少張卡包含它
  const RECIPES = [
    { id: 'childhood', name: '水淹童年',     need: { water: 1, memory: 1, hunger: 1 }, chips: 30, mult: 3 },
    { id: 'nostalgia', name: '電子鄉愁',     need: { neon: 1, machine: 1, memory: 1 }, chips: 25, mult: 2.5 },
    { id: 'robodream', name: '機械人的夢',   need: { machine: 1, hope: 1 },            chips: 15, mult: 1.5 },
    { id: 'band',      name: '地下樂隊',     need: { rebel: 1, anger: 1, warmth: 1 },  chips: 35, mult: 3 },
    { id: 'diary',     name: '浮城日記',     need: { water: 1, neon: 1, warmth: 1 },   chips: 25, mult: 2.5 },
    { id: 'lovesong',  name: '末世情歌',     need: { warmth: 1, hope: 1, memory: 1 },  chips: 30, mult: 3 },
    { id: 'labeler',   name: '標註員之死',   need: { machine: 3, rebel: 1 },           chips: 40, mult: 3.5 },
    { id: 'dinner',    name: '有錢人的晚餐', need: { neon: 1, hunger: 1, anger: 1 },   chips: 30, mult: 2.5 },
    { id: 'archaeo',   name: '舊城考古',     need: { water: 2, memory: 2 },            chips: 30, mult: 2.5 },
    { id: 'blackhumor',name: '黑色幽默',     need: { hope: 1, anger: 1 },              chips: 15, mult: 1.5 },
    { id: 'letter',    name: '外星來信',     need: { hope: 1, neon: 1 },               chips: 15, mult: 1.5 },
    { id: 'rentday',   name: '交租日',       need: { hunger: 1, machine: 1, anger: 1 },chips: 25, mult: 2.5 },
    { id: 'confession',name: '懺悔錄',       need: { guilt: 1, memory: 1 },            chips: 30, mult: 3 },
    { id: 'absolve',   name: '告解',         need: { guilt: 1, warmth: 1 },            chips: 25, mult: 2.5 },
    { id: 'crime',     name: '罪與罰',       need: { guilt: 2, anger: 1 },             chips: 40, mult: 3.5 },
  ];

  // 同一標籤出現在多少張卡
  const RESONANCE = [
    { count: 5, id: 'res5', name: '全情投入', chips: 80, mult: 4 },
    { count: 4, id: 'res4', name: '共鳴',     chips: 40, mult: 2 },
    { count: 3, id: 'res3', name: '同調',     chips: 20, mult: 1 },
  ];
  const MEDLEY = { id: 'medley', name: '百感交集', minTags: 6, chips: 20, mult: 2 };

  // 外星 KPI：每季抽一個，互相矛盾是刻意的
  const KPIS = {
    hope:     { name: '本季重點：希望',            desc: '含「希望」的作品 ×1.6',      tag: 'hope',    mod: 1.6 },
    water:    { name: '在地化指標：要有水',        desc: '含「水」的作品 ×1.6',        tag: 'water',   mod: 1.6 },
    machine:  { name: '數據驅動：要有機械',        desc: '含「機械」的作品 ×1.6',      tag: 'machine', mod: 1.6 },
    warmth:   { name: '團隊精神：要有人情',        desc: '含「人情」的作品 ×1.6',      tag: 'warmth',  mod: 1.6 },
    noanger:  { name: '文化契合度：拒絕負面情緒',  desc: '含「憤怒」的作品不計分',     tag: 'anger',   mod: 0 },
    norebel:  { name: '合規審查：拒絕反叛',        desc: '含「反叛」的作品不計分',     tag: 'rebel',   mod: 0 },
    novelty:  { name: '創新指標：不要重複',        desc: '用過的組合再用只計 20%',     special: 'novelty' },
    lean:     { name: '精益創作：少即是多',        desc: '使用 4 張或以上素材 ×0.5',   special: 'lean' },
    pliable:  { name: '可塑性：我們欣賞聽話的人',  desc: '火花低於 ×2 時創作 ×1.5',   special: 'pliable' },
    confess:  { name: '坦白從寬：歡迎懺悔',        desc: '含「愧疚」的作品 ×1.6',      tag: 'guilt',   mod: 1.6 },
    nobaggage:{ name: '我們不要有包袱的人',        desc: '含「愧疚」的作品不計分',     tag: 'guilt',   mod: 0 },
  };

  // 牽引光束的負載上限：靈魂超過 21 克會污染外星人的神經網絡
  const SOUL_LIMIT = 21;

  // 累積訊號門檻（第 10、20、30 天）
  const THRESHOLDS = [72000, 64000, 64000];

  const BACKGROUNDS = {
    copywriter: {
      name: '前廣告公司文案', short: '前文案',
      desc: '擅長寫作，有一點積蓄。', perkText: '創作籌碼 +15%',
      cr: 170, body: 85, spark: 2.4, floor: 4, medium: '寫了一篇',
      soul: 9, conscience: 0.85, past: '你寫過的廣告騙過很多人。',
      cards: ['b_slogan', 'b_lanyard', 'b_novel'],
      perk: { craftChips: 1.15 },
    },
    lifeguard: {
      name: '退役潛水救生員', short: '前救生員',
      desc: '身體好，熟悉水性，火花偏低。', perkText: '潛水氧氣 +35%，潛水體力消耗減半',
      cr: 180, body: 100, spark: 1.7, floor: 3, medium: '畫了一幅',
      soul: 3, conscience: 1, past: '你救過很多人。',
      cards: ['b_whistle', 'b_photo'],
      perk: { oxygen: 1.35, diveBody: 0.5 },
    },
    programmer: {
      name: '失業程式員', short: '前程式員',
      desc: '有積蓄，標註快，火花最低。', perkText: '標註收入 +25%',
      cr: 280, body: 80, spark: 1.5, floor: 5, medium: '做了一幅像素畫',
      soul: 8, conscience: 0.9, past: '你寫的程式取代過三百人。',
      cards: ['b_repo', 'b_log'],
      perk: { labelPay: 1.25 },
    },
    busker: {
      name: '街頭樂手', short: '街頭樂手',
      desc: '火花最高，但身無分文。', perkText: '找朋友聊天不用花錢，還多得一張素材',
      cr: 60, body: 75, spark: 2.7, floor: 2, medium: '寫了一首歌',
      soul: 4, conscience: 1, past: '你唱的歌從沒傷害過任何人。',
      cards: ['b_guitar', 'b_coins', 'b_song', 'b_echo'],
      perk: { freeChat: true, chatExtra: 1 },
    },
  };

  const SEASONS = {
    storm: {
      name: '風暴季', desc: '水位上升得快，舊城遺物較多。',
      water: 0.26, food: 30, nightBody: 0, outdoorBody: 0, labelPay: 1, diveRelics: 1,
      sky: ['#0b2a3a', '#14485a'], tint: '#38c6c0', weather: 'storm',
    },
    heat: {
      name: '熱浪季', desc: '電費昂貴，晚上熱得睡不著。',
      water: 0.2, food: 40, nightBody: -3, outdoorBody: 0, labelPay: 1, diveRelics: 0,
      sky: ['#3a1410', '#7a2e16'], tint: '#ff8a3c', weather: 'heat',
    },
    acid: {
      name: '酸雨季', desc: '外出會損害身體，室內工作收入較高。',
      water: 0.2, food: 30, nightBody: 0, outdoorBody: -5, labelPay: 1.15, diveRelics: 0,
      sky: ['#1d2a10', '#3d4a12'], tint: '#c4e04a', weather: 'acid',
    },
  };

  // 同區的創作人朋友，篩選日會被帶走
  const NPCS = [
    { id: 'ken',  name: '畫壁畫的阿 Ken',    cards: ['n_ken1', 'n_ken2'],  base: 260 },
    { id: 'dj',   name: '天台 DJ 小妹',      cards: ['n_dj1', 'n_dj2'],    base: 300 },
    { id: 'ho',   name: '寫詩的何伯',        cards: ['n_ho1', 'n_ho2'],    base: 220 },
    { id: 'miu',  name: '改裝機械人的 Miu',  cards: ['n_miu1', 'n_miu2'],  base: 280 },
    { id: 'fong', name: '唱粵劇的芳姐',      cards: ['n_fong1', 'n_fong2'], base: 240 },
  ];

  // 樓層租金系數：0 代表天橋下
  const FLOOR_RENT = [0, 0.6, 0.7, 0.85, 1.0, 1.15, 1.3, 1.5, 1.75];
  const BASE_RENT = 190;

  const SHOP = {
    premium:    { name: '浮聲 Premium',   desc: '5 天內工作時沒有廣告',               cost: 60 },
    supplement: { name: '靈感補充劑',     desc: '火花立即 +1.2，兩天後 −1.6',         cost: 80 },
    realfood:   { name: '真食物套餐',     desc: '身體 +15，火花 +0.2（每天一次）',    cost: 55 },
    tools:      { name: '二手創作工具',   desc: '創作時可使用 5 張素材',              cost: 160 },
    tank:       { name: '大容量氧氣瓶',   desc: '潛水氧氣 +30%',                      cost: 140 },
    harpoon:    { name: '改裝魚叉',       desc: '魚叉發射更快，傷害加倍',             cost: 120 },
    bag:        { name: '防水大背包',     desc: '潛水背包容量 +4',                    cost: 100 },
    monitor:    { name: '二手第二螢幕',   desc: '標註時可預覽下一張，判斷時間 +0.2 秒', cost: 90 },
    offset:     { name: '業力抵銷額度',   desc: '天空區企業發行，每份抵銷 1.5 克',     cost: 90 },
  };

  // 晚上的隨機事件
  const EVENTS = [
    { id: 'soup',    w: 3, text: '隔壁的婆婆煲了湯，順手給你送來一碗。', body: 10, card: 'e_soup' },
    { id: 'flood',   w: 3, text: '水淹到門口，你整晚都在舀水。',         body: -5, card: 'e_flood', season: { storm: 2 } },
    { id: 'rob',     w: 2, text: '回家途中遇上搶劫。',                   crPct: -0.25, crMax: 60, card: 'e_rob' },
    { id: 'hike',    w: 2, text: '房東說下期起加租一成。',               rentHike: 0.1, card: 'e_rent' },
    { id: 'dark',    w: 2, text: '停電了。在黑暗中，你想到了一些東西。', spark: 0.2, card: 'e_dark', season: { heat: 2 } },
    { id: 'bigorder',w: 2, text: '黑市大單：明天標註收入加倍。',         flag: 'bigOrder' },
    { id: 'signal',  w: 2, text: '收音機收到一段不屬於地球的訊號。',     card: 'e_alien' },
    { id: 'algo',    w: 2, text: '平台演算法更新，你的評分無故下跌。',   rating: -0.3 },
    { id: 'tip',     w: 2, text: '有人透露消息：明天舊城有寶物。',       flag: 'richDive' },
    { id: 'cult',    w: 1, text: '邪教上門派傳單，說水災是「被提」的預兆。', card: 'e_cult' },
    { id: 'roof',    w: 2, text: '酸雨蝕穿屋頂，漏了一整晚。',           body: -8, onlySeason: 'acid' },
    { id: 'heatwave',w: 2, text: '熱浪導致停電，冷氣停了。',             body: -8, onlySeason: 'heat' },
  ];

  // 早上的「浮聲」動態
  const FEED = {
    weather: {
      storm: ['天文台：今天懸掛八號風球，舊城水流湍急。', '颱風「KPI」正位於浮城以南 40 公里。', '暴雨警告：半浸區居民請自行游泳回家。'],
      heat: ['天文台：今天氣溫 47 度，體感溫度 52 度。', '電力公司：今晚的冷氣用電將以拍賣形式分配。', '熱浪警告：請避免思考，以減少腦部發熱。'],
      acid: ['天文台：酸雨 pH 值 3.1，外出請穿全身雨衣。', '酸雨持續，雨傘價格上升 300%。', '市民注意：雨水不可飲用，再次提醒。'],
    },
    conspiracy: [
      '@真相獵人：失蹤的人都被政府抓去做人體實驗！！醒醒吧',
      '@浮城媽媽：聽說大企業抽取人腦來訓練 AI，大家小心',
      '@末日教會：他們不是失蹤，而是被提。下一個可能就是你 🙏',
      '@偷渡專家：他們只是自己買船走了，有門路請私訊',
      '@外星派：是外星人帶走了他們。我有證據（證據：一張模糊的照片）',
      '@理性派：大家冷靜，失蹤人口其實和去年差不多（帖文已被刪除）',
    ],
    ads: [
      '【廣告】靈感補充劑：被選中機會提升 300%！*（*效果因人而異）',
      '【廣告】天空區示範單位，首期只需 999 年供款。',
      '【廣告】AI 情緒伴侶：它永遠不會嫌你窮。',
      '【廣告】你的靈感值多少錢？立即免費估價。',
      '【廣告】浮聲 Premium：沒有廣告的人生，月費 $60。',
    ],
    autoNews: {
      30: '新聞：標註數據累積充足，AI 情緒伴侶 2.0 即將推出。',
      50: '新聞：AI 情緒伴侶 2.0 正式推出，「企業情緒陪伴員」職位全數取消。',
      80: '新聞：視覺 AI 準確度達 99.2%，預計標註員需求將大幅下降。',
      100: '新聞：AI 開始標註 AI 標註過的數據，「AI 數據標註員」職位正式取消。',
    },
  };

  // 阿星的訊息：以格式變化講故事
  const ASTAR = {
    2:  { style: 'casual', text: '喂！！我上來了😭😭 這裡的星星好漂亮，你快點上來吧' },
    6:  { style: 'casual', text: '今天開始入職培訓 🤣 原來他們也有 KPI，不過包吃包住' },
    11: { style: 'memo',   text: '【內部通訊】各位地球候選人好，請保持靈感穩定，切勿過度思考。——阿星' },
    16: { style: 'memo',   text: '我們被教導不要想太多。其實也挺舒服的。' },
    21: { style: 'auto',   text: '【自動回覆】感謝你的訊息。阿星（星際人才發展局・第 7 區・靈感資源專員）暫時未能回覆。' },
    26: { style: 'glitch', text: '不要上來' },
    29: { style: 'auto',   text: '【自動回覆】感謝你的訊息。' },
  };

  // ---------- AI 數據標註 ----------
  // 圖片由「種類 + 修飾」組成；指引分三個階段，越來越荒謬
  const LABEL_ITEMS = ['cat', 'dog', 'fish', 'smile', 'cry', 'robot', 'framed', 'graffiti', 'flower', 'paste', 'vinyl', 'tower'];
  const isHuman = (i) => i.kind === 'smile' || i.kind === 'cry';
  const SELLABLE = ['framed', 'vinyl', 'paste', 'tower', 'robot'];
  const LABEL_PROMPTS = [
    { q: '這是貓嗎？',
      rules: ['只有貓才算是貓。', '戴帽子的貓不算（版權問題）。', '金色的東西一律算貓（客戶要求）。'],
      test: [(i) => i.kind === 'cat', (i) => i.kind === 'cat' && !i.hat, (i) => (i.kind === 'cat' && !i.hat) || i.gold] },
    { q: '這是人類嗎？',
      rules: ['人臉才算人類。', '戴眼鏡的是機械人偽裝，不算。', '戴帽子的機械人算人類（暫行措施）。'],
      test: [isHuman, (i) => isHuman(i) && !i.glasses, (i) => (isHuman(i) && !i.glasses) || (i.kind === 'robot' && i.hat)] },
    { q: '這是藝術嗎？',
      rules: ['有畫框才算藝術。', '戴帽子的畫是盜版，不算。', '金色的一律算藝術（可以賣錢）。'],
      test: [(i) => i.kind === 'framed', (i) => i.kind === 'framed' && !i.hat, (i) => (i.kind === 'framed' && !i.hat) || i.gold] },
    { q: '這個快樂嗎？',
      rules: ['露齒笑才算快樂。', '戴眼鏡的笑容不夠真誠，不算。', '金色的東西都很快樂。'],
      test: [(i) => i.kind === 'smile', (i) => i.kind === 'smile' && !i.glasses, (i) => (i.kind === 'smile' && !i.glasses) || i.gold] },
    { q: '可以吃嗎？',
      rules: ['魚和合成糊可以吃。', '金色的合成糊是展品，不能吃。', '花也可以吃（新菜單）。'],
      test: [(i) => i.kind === 'fish' || i.kind === 'paste', (i) => i.kind === 'fish' || (i.kind === 'paste' && !i.gold),
        (i) => i.kind === 'fish' || (i.kind === 'paste' && !i.gold) || i.kind === 'flower'] },
    { q: '有商業價值嗎？',
      rules: ['畫、唱片、合成糊、大廈、機械人有價值。', '戴眼鏡的一律不值錢。', '貓永遠有商業價值（流量）。'],
      test: [(i) => SELLABLE.includes(i.kind), (i) => SELLABLE.includes(i.kind) && !i.glasses,
        (i) => (SELLABLE.includes(i.kind) && !i.glasses) || i.kind === 'cat'] },
  ];

  const ADS = [
    '靈感補充劑\n被選中機會 +300%',
    '天空區示範單位\n首期 999 年',
    'AI 情緒伴侶\n它不會嫌你窮',
    '你今天笑了嗎？\n立即訂閱快樂',
    '浮聲 Premium\n去除廣告 $60',
  ];

  // ---------- 情緒陪伴 ----------
  const SMILE_LINES = [
    '我上個月又買了一層樓，哈哈', 'AI 什麼都會做，你們還能做什麼？哈哈', '我兒子想當藝術家，我幫他報了金融系',
    '笑吧，我付了錢的', '天空區的空氣很清新，你沒試過吧？', '我請了三個人幫我想事情，很方便',
    '水災？我住 88 樓啊', '我捐錢給低層，可以扣稅的', '你說對不對？', '你們這一代就是不夠努力',
  ];
  const SAD_LINES = ['我的機械狗壞了……', '我家的錦鯉死了', '我太太說我沒有靈魂', '其實我很寂寞'];
  // 偏見言論：點頭附和可以多拿小費，但靈魂會變重
  const BIAS_LINES = [
    '低層的人就是懶，對不對？', '那些失蹤的人，大概是自願離開的吧？', 'AI 取代你們，是因為你們不夠好。',
    '窮人不需要藝術，需要的是紀律。', '淹水區的人應該自己學會游泳。',
  ];

  // ---------- 道德抉擇 ----------
  // 每天早上有機會遇到一個。sin：虧心程度（實際重量 = sin × 良知系數）；atone：贖罪程度。
  // guilt：做了虧心事後得到的「愧疚」素材名稱，tag 為它的第二個標籤。
  const DILEMMAS = [
    { id: 'wallet', text: '你在樓梯撿到一個錢包，裡面有 $120 和一張全家福。',
      options: [{ label: '據為己有', cr: 80, sin: 3, guilt: '那個錢包', tag: 'memory' },
        { label: '交到管理處', atone: 1, card: 'm_family' }] },
    { id: 'granny', text: '隔壁的婆婆病倒了，她想向你借 $60 買藥。',
      options: [{ label: '借錢給她', cr: -60, atone: 2, card: 'm_thanks', need: (s) => (s.cr >= 60 ? null : '你根本沒有 $60') },
        { label: '假裝不在家', sin: 2, guilt: '門外的敲門聲', tag: 'warmth' }] },
    { id: 'report', when: (s) => s.floor >= 2, text: '房東說：只要你舉報樓下的非法劏房，下期租金減半。',
      options: [{ label: '舉報', rentDiscount: 0.5, sin: 4, guilt: '樓下搬走的一家人', tag: 'water' },
        { label: '拒絕' }] },
    { id: 'badreview', when: (s) => !s.removed.label, text: '平台主管私訊你：給同組的新人打差評，你的評分就會上升。',
      options: [{ label: '照做', rating: 0.5, sin: 2, guilt: '新人的差評', tag: 'machine' },
        { label: '拒絕', rating: -0.2 }] },
    { id: 'farm', text: '內容農場急招寫手：今晚寫三篇假新聞，酬勞 $120。',
      options: [{ label: '接下工作', cr: 120, spark: -0.3, sin: 3.5, guilt: '三篇假新聞', tag: 'neon' },
        { label: '拒絕' }] },
    { id: 'rescue', text: '淹水的街上有人在呼救。',
      options: [{ label: '跳下水救人', body: -12, atone: 3, card: 'm_saved', need: (s) => (s.body > 20 ? null : '你的身體撐不住') },
        { label: '假裝沒聽見', sin: 3, guilt: '水裡的呼救聲', tag: 'water' }] },
    { id: 'course', when: (s) => s.day >= 4, text: '有人邀請你推銷「外星錄取保證班」，每成交一單抽佣 $60。',
      options: [{ label: '推銷兩單', cr: 120, sin: 4, guilt: '賣出去的錄取保證', tag: 'hope' },
        { label: '拒絕' }] },
    { id: 'lend', when: (s) => s.cards.length >= 2 && s.npcs.some((n) => n.alive), npc: true,
      text: '{npc}想參加創作比賽，問你可否借一張素材。',
      options: [{ label: '借出素材', loseCard: true, atone: 1.5, friend: 2 },
        { label: '拒絕', sin: 1, guilt: '沒有借出的素材', tag: 'warmth' }] },
    { id: 'steal', when: (s) => s.cr < 30, text: '你身上的錢不夠吃晚飯。便利店的自助收銀機剛好壞了。',
      options: [{ label: '拿了就走', foodFree: true, sin: 2, guilt: '沒付錢的晚餐', tag: 'hunger' },
        { label: '餓著肚子' }] },
    { id: 'mural', when: (s) => s.npcs.some((n) => n.id === 'ken' && n.alive), text: '阿 Ken 的壁畫被大廈管理處塗掉了，阿 Ken 想你陪他重新畫一次。',
      options: [{ label: '陪阿 Ken 重畫', body: -6, atone: 1.5, card: 'n_ken1' },
        { label: '說自己沒空', sin: 0.5, guilt: '被塗掉的壁畫', tag: 'rebel' }] },
    { id: 'chatlogs', text: '一間企業想以 $80 收購你和朋友們的聊天紀錄，用來訓練 AI。',
      options: [{ label: '賣掉', cr: 80, sin: 3.5, guilt: '朋友們的聊天紀錄', tag: 'warmth' },
        { label: '拒絕' }] },
    { id: 'blame', when: (s) => !s.removed.label && s.day >= 3, text: '標註組出了錯，主管要找人負責。你可以把責任推給新同事。',
      options: [{ label: '推給新人', rating: 0.3, sin: 2.5, guilt: '替你受罰的新人', tag: 'anger' },
        { label: '自己承擔', rating: -0.4, atone: 0.5 }] },
    { id: 'donate', text: '避難所正在募捐，$40 可以讓一家人多吃一餐。',
      options: [{ label: '捐出 $40', cr: -40, atone: 1.5, need: (s) => (s.cr >= 40 ? null : '你連自己的晚餐都未必付得起') },
        { label: '走開', sin: 0.5, guilt: '募捐箱', tag: 'hunger' }] },
    { id: 'lostkid', text: '一個小孩在天橋下走失了，哭著問你回家的路。',
      options: [{ label: '送小孩回家', body: -4, atone: 2, card: 'd_crayon' },
        { label: '叫小孩去找警察', sin: 0.5, guilt: '小孩的哭聲', tag: 'memory' }] },
    { id: 'spy', when: (s) => s.floor > 0, text: '房東想你幫忙監視鄰居有沒有偷用電，每舉報一次 $40。',
      options: [{ label: '答應', cr: 80, sin: 3, guilt: '鄰居的電錶', tag: 'machine' },
        { label: '拒絕' }] },
    { id: 'snitch', when: (s) => s.day >= 5 && s.npcs.filter((n) => n.alive).length >= 2,
      text: '一個自稱外星招募專員的人說：只要你交出同區創作人的名單，就能提高你的錄取機會。',
      options: [{ label: '交出名單', signal: 4000, takeNpc: true, sin: 5, guilt: '交出去的名單', tag: 'anger' },
        { label: '拒絕' }] },
  ];

  // ---------- 舊城潛水 ----------
  const FISH = {
    sardine: { name: '沙甸魚',   value: 1,  weight: 1, hp: 1 },
    eel:     { name: '霓虹鰻',   value: 5,  weight: 2, hp: 2, card: 'f_scale', cardChance: 0.2, dinner: true },
    grouper: { name: '變種石斑', value: 12, weight: 4, hp: 4, card: 'f_eye',   cardChance: 0.35, dinner: true },
    jelly:   { name: '發光水母', value: 0,  weight: 1, hp: 1, card: 'd_jelly', cardChance: 0.25 },
  };
  const DIVE_ZONES = [
    { id: 'street', name: '舊街',   depth: 0,   relics: ['d_album', 'd_comic', 'd_chime', 'd_paste'] },
    { id: 'metro',  name: '地鐵站', depth: 60,  relics: ['d_sign', 'd_letter', 'k_ticket', 'k_badge'] },
    { id: 'mall',   name: '舊商場', depth: 120, relics: ['d_crayon', 'd_vinyl', 'k_bag', 'd_letter'] },
  ];

  IE.DATA = {
    TAGS, CARDS, CARD_POOLS, RECIPES, RESONANCE, MEDLEY, KPIS, THRESHOLDS,
    BACKGROUNDS, SEASONS, NPCS, FLOOR_RENT, BASE_RENT, SHOP, EVENTS, FEED, ASTAR,
    LABEL_ITEMS, LABEL_PROMPTS, ADS, SMILE_LINES, SAD_LINES, BIAS_LINES, FISH, DIVE_ZONES, DILEMMAS, SOUL_LIMIT,
    DAYS: 30, REVIEW_DAYS: [10, 20, 30], SLOTS: ['早上', '下午', '晚上'],
  };
});
