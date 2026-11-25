// 《靈感撤離 2080》第十五期：五輪模式的數值常數、生活卡目錄、素材包、服務與固定文案。
// 純資料檔，不涉及 DOM，瀏覽器與 Node（tools/sim.js）共用。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA;

  // 五輪模式的經濟與數值常數
  const ECON = {
    // 目標
    // 第十七期第二輪校準（2026-11-25，WO-16-05，加入後段的引擎之後）：目標改為逐晚的表（t1 × curve[第幾晚 − 1]）。
    // 外星評審之夜（第 3、6、9、12、15 晚）有評審的規則，本身比較難；曲線單調上升，第四輪升得慢（引擎成形的一輪），第五輪是最後的考驗。
    t1: 24000,            // 第 1 晚的目標
    curve: [1, 1.98, 3.37, 5.27, 6.7, 9.07, 13.3, 15.6, 19, 21.3, 24.9, 27.2, 31.8, 37.2, 42.3],
    firstRunEase: 0.7,    // 第一局的第 1、2 晚目標 ×0.7
    // 創作桌
    hand: 8, plays: 4, discards: 3,
    // 收入
    nightPay: { small: 42, big: 62, boss: 140 },
    payGrowth: 0.45,      // 每多一輪，獎金 +45%（第十七期第二輪校準：原本 +25%，第四、五輪的獎金追不上租金）
    earlyBonus: 8,        // 每次沒有用的下筆
    overkillSpark: 0.22,  // 分數達到目標兩倍：火花 +0.22
    failSpark: -0.3,      // 一晚失敗：火花 −0.3
    // 篩選日
    rent: [175, 265, 335, 400, 475],  // 每輪的租金；2026-11-02 加入故事線之後加一成（製作人：第 7 區維持，甚至稍為加難；CALIBRATION.md 第七節）
    // 白天
    offerReroll: [10, 20, 30],      // 換一批生活卡（第 4 次起都是最後一個價錢）
    skipSpark: 0.2,                 // 睡懶覺
    // 第十七期（後段的引擎）：每通過一輪篩選，火花上限 +0.5；一晚達到目標的 2 倍是「名作」，最好的一筆的素材各升一星
    sparkCapStep: 0.5, masterStar: 1,
    tripCost: 240, tripPick: 2,     // 出國：五選二；2026-11-02 製作人：出國要更貴（約一期租，見 docs/ECONOMY.md）
    tripStar: 4, tripSpark: 0.6,    // 出國帶回的素材是 ★4（親眼見過的東西最亮）；火花 +0.6（WO-15-14 接上）
    // 市集
    objReroll: [20, 30, 40, 50],    // 重抽物件
    pack: 35, packFar: 55,          // 素材包
    packStars: [0.01, 0.05, 0.18, 0.36, 0.40],  // 素材包的星級機會（★1 至 ★5）
    packLegend: 0.03,               // 遠方包每張素材是極稀有（★5）的機會
    polish: [0, 10, 20, 35, 55],    // 打磨：★1→2 是 polish[1]……★4→5 是 polish[4]
    burn: 15, copy: 35, minDeck: 8,  // 起始素材庫約 11 張
    tech: 20, techStep: 10,         // 技法課：20 + 10 ×（現在等級 − 1）
    toolMult: 1,                    // 工具卡價錢 × toolMult
    sparkFloor: 1,
    // 故事線（總規格 §14）
    hideCost: [80, 120, 160, 200],  // 把朋友藏起來（第 1 至 4 輪）
  };

  // 五輪模式的固定文案
  const ROUND_TEXT = {
    kinds: { work: '工作', shady: '虧心', life: '生活', friend: '朋友', volunteer: '義工', trip: '出國' },
    nightKinds: { small: '社區小展', big: '畫廊聯展', boss: '外星評審' },
    dayTitle: '第 {round} 輪・第 {night}／15 晚',
    dayAsk: '今天做甚麼？',
    reroll: '換一批（${cost}）',
    skip: '睡懶覺（火花 +{v}）',
    byHand: '親手做',
    byAuto: '照舊做（{rank} 級）',
    tonight: '今晚：{kind}・目標 {target} 分',
    rentLine: '本輪租金 ${rent}（第 {day} 天到期）',
    cleared: '收工！',
    early: '提早收工：還有 {n} 次下筆，每次 +${v}',
    failed: '今晚沒有達到目標。失去一次機會。',
    toShop: '前往市集',
    shopTitle: '二手市集',
    leave: '離開市集',
    relic: '遺物：三選一（免費）',
    rentOk: '交租 −${rent}',
    rentFail: '交不起租：房東收走了你身上全部的錢。失去一次機會。',
    soulOk: '靈魂 {soul} 克：光束拉得動你。',
    soulFail: '靈魂 {soul} 克，超過 21 克：光束拉不動你。失去一次機會。',
    nextRound: '進入第 {round} 輪',
    chances: '機會',
    bossAhead: '本輪的外星評審：{rules}',
  };

  // 十三張生活卡目錄
  const DAYCARDS = [
    { id: 'label', kind: 'work', micro: 'label' },
    { id: 'delivery', kind: 'work', micro: 'delivery' },
    { id: 'clinic', kind: 'work', micro: 'clinic' },
    { id: 'salvage', kind: 'work', micro: 'salvage' },
    { id: 'haggle', kind: 'work', micro: 'haggle' },
    { id: 'farm', kind: 'shady', micro: 'farm' },
    { id: 'smile', kind: 'shady', micro: 'smile' },
    { id: 'dive', kind: 'life', micro: 'dive' },
    { id: 'busk', kind: 'life', micro: 'busk' },
    { id: 'garden', kind: 'life', micro: 'garden' },
    { id: 'friend', kind: 'friend' },
    { id: 'volunteer', kind: 'volunteer' },
    { id: 'trip', kind: 'trip', minRound: 2, chance: 0.15, origins: ['asia', 'europe', 'america', 'africa', 'arctic', 'ocean'] },
  ];

  // 五種素材包
  const PACKS = [
    { id: 'flood', name: '舊城潛水包', tags: ['water', 'memory'] },
    { id: 'sky', name: '天空區垃圾包', tags: ['machine', 'neon'] },
    { id: 'street', name: '街坊包', tags: ['warmth', 'hunger', 'hope'] },
    { id: 'under', name: '地下包', tags: ['rebel', 'anger', 'guilt'] },
    { id: 'far', name: '遠方包', foreign: true },
  ];

  // 市集的工作室服務
  const SERVICES = [
    { id: 'polish', name: '打磨', desc: '一張素材升一星' },
    { id: 'burn', name: '燒掉', desc: '從素材庫刪除一張素材' },
    { id: 'copy', name: '複印', desc: '複製一張素材' },
  ];

  // 第十六期：卡的來歷預設文案（總規格 §2.1）
  const ORIGIN = {
    start: '來浮城之前就帶在身上',
    story: '第 {n} 晚之前：{x}',
    work: '第 {n} 晚之前，做「{x}」的時候留下的',
    trip: '第 {n} 晚之前，從{x}帶回來',
    friend: '{x}給你的',
    shop: '第 {n} 晚之後，在市集買的',
    craft: '第 {n} 晚之後，自己做出來的',
    prologue: '序章之夜，你第一次排出了起承轉合',
    salvage: '從舊城的水底打撈上來的',
  };

  // 第十六期：卡背、遺物與回憶文案（總規格 §2.5）
  const CARD_TEXT = {
    backHead: '這張卡的來歷',
    worksHead: '它參與過的作品',
    noWorks: '還沒有用它完成過具名的作品。',
    relic: '遺物：給你這張卡的人已經不在浮城。',
    relicKeep: '這是遺物，放不下。',
    overHead: '素材庫放不下了',
    overSub: '選一張放進回憶。放下的卡不會消失，但不能再用。',
    memoryHead: '回憶',
    memoryEmpty: '你還沒有放下過任何東西。',
    lostFlood: '第 {n} 晚，水帶走的。',
  };

  // 第十六期：差事、立場與水位數值常數（總規格 §3.4、§7.3）
  const ECON16 = {
    restSpark: 0.2,
    gigKeep: 3,
    gigMax: 2,
    friendGig: 0.25,
    gigPay: 2.2,
    startStarter: 2,
    stancePay: { comply: 1.3, resist: 0.6, care: 0.8 },
    floodBody: 8,
    floodSpark: 0.2,
    homelessBody: 4,
    homelessDeck: 2,
    moveBase: 120,
    moveStep: 40,
    rehouse: 260,
    thaw: 0.6,
  };
  // 創作桌超額三級獎勵（WO-16-09 §3）；不可列舉以維持 cards.test.js 對甲段鍵集合的既有檢查相容
  Object.defineProperty(ECON16, 'over', {
    value: [
      { x: 2, spark: 0.2 },
      { x: 5, spark: 0.4, ticket: 1 },
      { x: 10, spark: 0.6, ticket: 1 },
    ],
    enumerable: false,
    configurable: true,
    writable: true,
  });

  // 第十六期：差事固定文案（總規格 §3.5）
  const GIG_TEXT = {
    tag: '差事',
    from: {
      round: '人才發展局本季配給的工作',
      story: '{x}',
      friend: '{x}介紹的',
    },
    left: '還有 {n} 天',
    expired: '「{x}」的差事過期了。系統已經把它分配給更積極的人。',
    none: '今天沒有工作。這在浮城很正常。',
  };

  // 第十六期：每位朋友介紹的小遊戲（WO-16-02 §1）
  const GIG_FRIEND = {
    dj: 'busk',
    ho: 'label',
    ken: 'salvage',
    miu: 'clinic',
    fong: 'busk',
    chan: 'dive',
    yu: 'delivery',
    mary: 'garden',
  };

  // 第十六期新增生活卡（獨立匯出以保持 spec.test.js 對第十五期 D.DAYCARDS 的既有檢查相容；rounds.js 合併讀取）
  const DAYCARDS16 = [
    { id: 'rest', kind: 'rest', name: '在家發呆', sub: '甚麼都不做。這在浮城是一種奢侈。' },
  ];

  // 第十六期：市集的水位與住所服務（總規格 §7.2，不改第十五期的 D.SERVICES）
  const SERVICES16 = [
    { id: 'moveup', name: '搬上一層', desc: '搬上 {f} 樓，連續淹水晚數歸零' },
    { id: 'rehouse', name: '租回一個單位', desc: '租回 {f} 樓的單位，恢復素材庫上限' },
  ];

  // 第十六期：水位與淹水固定文案（總規格 §7.4）
  const FLOOD_TEXT = {
    bar: '水位 {w} 樓・你住 {f} 樓',
    barHomeless: '水位 {w} 樓・你住天橋下',
    warn: '水位局提示：水位距離閣下的單位不足一層。請自行評估。',
    light: '水進了你家。水位局把這種情況歸類為「輕微滲漏」。',
    mediumHead: '水要帶走一樣東西',
    mediumSub: '水已經淹了兩晚。選一張留給它，其餘的你還抱得住。',
    mediumDone: '「{x}」跟着水走了。它現在在回憶裏。',
    heavy: '你的單位已經在水位以下。按天空區的新例，水位以下的樓層不再計入城市面積，所以你沒有失去任何地方。',
    heavyObj: '走的時候來不及拿「{x}」。',
    moveup: '你搬上了 {f} 樓。樓下的鄰居沒有搬。',
    rehouse: '你租回了一個單位，在 {f} 樓。合約註明：水位上升不屬於業主的責任。',
    pump: '抽水泵響了一整晚，水退了一點。',
    thaw: '冰融了。水位局表示，這是「季節性補償」。',
  };

  // 第十六期乙段（WO-16-11）：序章之夜和新玩家的說明
  const PROLOGUE = {
    bg: 'copywriter', season: 'storm', seed: 2080, chapter: 'c1',
    // 一碗糖水兩個人（人情）、摺紙船（人情）、為誰撐傘的機械人（機械）、人機之間（人情＋機械）
    cards: ['dk_warmth1', 'dk_warmth2', 'dk_machine1', 'dk_warmth_machine'],
    scene: { weather: 'drizzle', flood: 0.35 },
    stageName: '序章之夜',
    tagline: '水位每天都在上漲。你還有今晚可以畫。',
    start: '開始',
    steps: [
      { pick: [0, 1], say: '這兩張都有人情，接得上。按它們，再按「下筆」。', after: '相同的情緒接在一起，是「承」。' },
      { pick: [0, 1, 2], say: '人情的對面是機械。加上它，相反的情緒是「轉」。', after: '轉，令倍率翻倍。' },
      { pick: [0, 1, 2, 3], say: '最後一張又有人情。回到開頭，就是「合」。', after: '先承、後轉、再合：起承轉合。' },
    ],
    done: '這就是你的第一幅畫。之後每一晚，次序由你決定。',
    next: '開始第一晚',
    replay: '重看序章',
    hint: {
      cr: '錢：交租用，交不起就失去一次機會。',
      spark: '火花：分數的倍數。',
      soul: '靈魂：超過 21 克，外星人就不要你。',
    },
  };

  // 五輪模式的「玩法」（取代經典模式的說明；經典模式的說明收在最後的摺疊裏）
  const HELP16 = {
    head: '玩法',
    goal: '撐過這一季的每一晚和每一輪篩選（第一季是六晚、兩輪）。最後一輪通過，外星人就會帶你走。今晚不達標、交不起租、靈魂太重，都會失去一次機會；三次用完，你會被歸入人才庫。',
    pillars: [
      { name: '創作', text: '晚上把素材按次序排成一行。相同或相鄰的情緒是「承」，相反的情緒是「轉」，最後一張回到開頭是「合」。先承、後轉、再合，就是起承轉合，分數最高；斷開的素材不計分。每一筆都會畫進同一幅夜景。' },
      { name: '靈魂', text: '外星人只要又亮又輕的人：靈魂超過 21 克就不會被選中。做虧心事會變重，為別人做事會變輕。' },
      { name: '浮城', text: '白天選一件事做。工作是罕有的差事，過了期限就沒有；故事的選擇會改變你的錢、靈魂和素材。水位每天上漲，水淹到家會帶走東西。' },
    ],
    era: '得到素材時，用手指撕開包：閃卡的籌碼 ×1.5，同一張再得到會升星。一生結束時，作品沉到舊城，留下沉積，在「舊城打撈」換下一生的能力。',
    foot: '撐住三樣東西：錢（交租）、火花（分數的倍數）、靈魂（不可以太重）。每張素材都有來歷：按卡上的「來歷」看它從哪裏來。',
    classic: '經典模式的規則',
  };

  Object.assign(D, {
    ECON, ROUND_TEXT, DAYCARDS, DAYCARDS16, PACKS, SERVICES, SERVICES16,
    ORIGIN, CARD_TEXT, ECON16, GIG_TEXT, GIG_FRIEND, FLOOD_TEXT,
    PROLOGUE, HELP16,
  });
});
