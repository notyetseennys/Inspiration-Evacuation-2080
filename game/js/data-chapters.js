// 《靈感撤離 2080》第十七期：浮城年表（章節）、舊城打撈（局與局之間的升級樹）、撕開（卡包、閃卡、重複升星）。
// 純資料，瀏覽器和 Node 共用。設計見 docs/research/booster-pack-heroes.md 和 docs/workorders/phase-17/README.md。
// 只在五輪模式生效；經典模式（standard、long）不讀這個檔案的任何東西。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA;

  // ---------- 浮城年表 ----------
  // feats：這一章開放的系統。沒有列出的系統在這一章不存在（不是隱藏）。
  //   collect 朋友被收藏、flood 水淹的後果、weather 天氣、stance 工作裏的抉擇、kpi 外星 KPI、judge 外星評審的規則、trip 出國
  // objRarity：市集和遺物攤會出現的物件稀有度。
  // building：還在興建中（等對應的工單），不可以玩。
  // target：這一季的目標倍數（第一輪校準：第一季最易）。
  const CHAPTERS = [
    {
      target: 1.2, steep: 1.15, wall: 7, sediment: 1, id: 'c1', collector: 'grey', no: 1, year: '2080 年・春', name: '招聘季', species: '灰人', org: '星際人才發展局', zone: '招聘區',
      rounds: 2, feats: ['collect'], objRarity: ['common'], sky: 'np-sky-neon-1',
      intro: '星際人才發展局在浮城開設招聘處。他們複製了太多代，再也沒有靈感，只能向人類「招聘」。',
      adds: '創作桌、人生的選擇、朋友、差事',
      clear: '你通過了試用期。發展局把你的檔案升了一級，並且附上一句：下一季，水會上來。',
    },
    {
      target: 38, steep: 1.15, wall: 2.4, sediment: 2, id: 'c2', collector: 'harvest', no: 2, year: '2080 年・夏', name: '收成季', species: '收割者', org: '收割者農業署', zone: '收成區',
      rounds: 3, feats: ['collect', 'flood', 'weather'], objRarity: ['common', 'rare'], sky: 'np-sky-water-2',
      intro: '收割者的農業報告寫着：苦難令靈感豐收。這一季，浮城的水位不會再退。',
      adds: '水位：水淹到家，由受傷到失去住所；天氣',
      clear: '農業署把你列為「高產」。報告的附錄說，水位的上升「符合預期」。',
    },
    {
      target: 450, steep: 1.15, wall: 2, sediment: 3.5, id: 'c3', collector: 'mirror', no: 3, year: '2080 年・秋', name: '朝聖季', species: '鏡神族', org: '被提教會', zone: '朝聖區',
      rounds: 4, feats: ['collect', 'flood', 'weather', 'stance', 'kpi'], objRarity: ['common', 'rare', 'legend'], sky: 'np-sky-guilt-2',
      intro: '鏡神族化成你崇拜的樣子，在浮城經營「被提」信仰。從這一季起，工作要你表態。',
      adds: '工作裏的抉擇：照做、不照做、為了一個人；外星人的 KPI',
      clear: '教會為你舉行了儀式。你不記得自己有沒有跪下。',
    },
    {
      target: 5000, steep: 1.12, wall: 2.4, sediment: 6, id: 'c4', collector: 'octo', no: 4, year: '2080 年・冬', name: '觀光季', species: '章魚星人', org: '章魚星觀光團', zone: '觀光區',
      rounds: 5, feats: ['collect', 'flood', 'weather', 'stance', 'kpi', 'judge', 'trip'], objRarity: ['common', 'rare', 'legend'], sky: 'np-sky-memory-2',
      intro: '章魚星人的觀光團來了。他們真心喜歡人類的藝術，喜歡的方式是擁有。五輪篩選，完整的一年。',
      adds: '外星評審的規則；出國',
      clear: '觀光團把你的作品放進玻璃櫃。導遊說，下一季會冷。',
    },
    {
      // WO-16-07 之後開放（2026-11-25）
      target: 70000, steep: 1.12, wall: 2.4, sediment: 12, id: 'c5', collector: 'purge', no: 5, year: '2081 年・春', name: '急凍', species: '淨化派', org: '淨化派衛生部', zone: '清除區',
      rounds: 5, feats: ['collect', 'flood', 'weather', 'stance', 'kpi', 'judge', 'trip', 'cold'], objRarity: ['common', 'rare', 'legend'], sky: 'np-sky-water-1',
      intro: '洋流停了。水面結冰，水位暫時不升；融冰的那天，水會一次過上來。',
      adds: '寒潮季：結冰、不能潛水、融冰',
      clear: '衛生部在你的檔案上蓋了「已消毒」。冰融的那晚，你的鞋子濕到腳踝。',
    },
    {
      id: 'c6', no: 6, year: '2081 年・夏', name: '大概是偷來的', species: '逃兵網絡', org: '逃兵網絡', zone: '走私區',
      rounds: 5, feats: [], objRarity: [], sky: 'np-sky-rebel-2', building: true,
      intro: '市面上開始出現 AI 仿造的記憶。給你素材的人，未必是朋友。',
      adds: '鑑定素材：有些經歷是假的',
    },
    {
      id: 'c7', no: 7, year: '2081 年・秋', name: '收藏家的價錢', species: '保育者', org: '人類保護區委員會', zone: '保護區',
      rounds: 5, feats: [], objRarity: [], sky: 'np-sky-warmth-2', building: true,
      intro: '保育者願意出高價收購人類的作品，條件是作者一併搬進保護區。',
      adds: '賣作品要議價',
    },
    {
      id: 'c8', no: 8, year: '2081 年・冬', name: '升維', species: '升維者', org: '（沒有機構）', zone: '柏拉圖空間',
      rounds: 5, feats: [], objRarity: [], sky: 'np-sky-hope-2', building: true,
      intro: '一個夠輕、夠亮的靈魂，可以不靠飛碟離開。',
      adds: '最後的篩選',
    },
  ];

  const CHAPTER_TEXT = {
    head: '浮城年表',
    sub: '一年四季，一季一種外星人。打敗那一季最後的外星評審，下一季才會開始。',
    play: '開始這一季',
    locked: '打敗上一季最後的外星評審，才會開放。',
    building: '水位仍在上漲。這一季還在興建中。',
    cleared: '已通過',
    current: '進行中',
    adds: '這一季新加入：{x}',
    length: '{r} 輪・{n} 晚',
    species: '{species}・{org}',
    unlocked: '新的一季開放了：{x}',
    clearedNow: '你通過了「{x}」。',
    free: '全城篩選',
    freeDesc: '完整的一年，所有系統全開；可以選角色、季節和外星評級。通過「觀光季」之後開放。',
    back: '返回',
  };

  // ---------- 舊城打撈 ----------
  // 每一生（任何結局）的作品最後沉到舊城，變成「沉積」。局與局之間，用沉積在舊城的六區打撈。
  // 每區由上而下：買了上一個才可以買下一個。效果只在五輪模式生效。
  // fx 的鍵見 game/js/salvage.js 的 FX 說明。
  const SALVAGE_COST = [5, 9, 14, 20, 28, 38];
  const SALVAGE = [
    {
      id: 'dock', name: '舊碼頭', line: '開局帶甚麼', nodes: [
        { id: 'bottle', name: '漂流瓶', text: '開局多一張素材。', fx: { startCards: 1 } },
        { id: 'drybag', name: '防水袋', text: '開局的素材之中，一張是閃卡。', fx: { startFoil: 1 } },
        { id: 'tide', name: '潮汐表', text: '市集的素材包多一個選擇（四選一）。', fx: { packExtra: 1 } },
        { id: 'net', name: '舊碼頭的網', text: '抽到重複的素材，升兩星而不是一星。', fx: { dupStar: 1 } },
        { id: 'wreck', name: '沉船貨櫃', text: '每輪開始，送你一個打撈包。', fx: { roundPack: 1 } },
        { id: 'lamp', name: '碼頭的燈', text: '開局再多一張素材。', fx: { startCards: 1 } },
      ],
    },
    {
      id: 'theatre', name: '舊戲院', line: '創作桌', nodes: [
        { id: 'rehearse', name: '排練', text: '下筆之前，看得到這一筆的預計分數。', fx: { preview: 1 }, info: true },
        { id: 'script', name: '劇本', text: '創作桌提示這手牌排得出的最好結構（次序要自己找）。', fx: { hint: 1 }, info: true },
        { id: 'backstage', name: '後台', text: '每晚多一次改稿。', fx: { discards: 1 } },
        { id: 'repertoire', name: '舊劇目', text: '開局「起承轉合」就是 Lv.2。', fx: { fullLevel: 1 } },
        { id: 'notes', name: '導演筆記', text: 'AI 模仿你的結構，速度減半。', fx: { aiHalf: 1 } },
        { id: 'fullhouse', name: '滿座', text: '每晚第一筆，籌碼 +30。', fx: { firstChips: 30 } },
      ],
    },
    {
      id: 'clinic', name: '舊診所', line: '靈魂', nodes: [
        { id: 'chart', name: '病歷', text: '靈魂離上限不足 2 克時，會提醒你。', fx: { soulWarn: 1 }, info: true },
        { id: 'cabinet', name: '舊藥櫃', text: '開局靈魂輕 1 克。', fx: { startSoul: -1 } },
        { id: 'confess', name: '告解室', text: '每輪一次：靈魂輕 1 克，火花 −0.2。', fx: { confess: 1 }, info: true },
        { id: 'ecg', name: '心電圖', text: '每輪最後一晚，預告篩選的結果（租金和靈魂）。', fx: { reviewPreview: 1 }, info: true },
        { id: 'visit', name: '探病', text: '「為了一個人」的選擇，靈魂多輕 0.5 克。', fx: { careBonus: 0.5 } },
        { id: 'discharge', name: '出院紙', text: '靈魂的上限多 1 克。', fx: { soulLimit: 1 } },
      ],
    },
    {
      id: 'rooftop', name: '舊天台', line: '火花', nodes: [
        { id: 'laundry', name: '晾衫架', text: '睡懶覺，火花多 +0.1。', fx: { skipSpark: 0.1 } },
        { id: 'kite', name: '風箏', text: '開局火花 +0.2。', fx: { startSpark: 0.2 } },
        { id: 'party', name: '天台派對', text: '每輪第一晚，火花 +0.1。', fx: { roundSpark: 0.1 } },
        { id: 'tank', name: '水塔', text: '早上火花低於 ×1，回到 ×1。', fx: { sparkFloor: 1 } },
        { id: 'bow', name: '謝幕', text: '達標之後的加演，每筆火花多 +0.05。', fx: { encoreSpark: 0.05 } },
        { id: 'stars', name: '星空', text: '每晚達標，火花 +0.05。', fx: { passSpark: 0.05 } },
      ],
    },
    {
      id: 'market', name: '舊市集', line: '錢和卡包', nodes: [
        { id: 'receipt', name: '當舖收據', text: '開局多 {cash:15}。', fx: { startCash: 15 } },
        { id: 'regular', name: '熟客', text: '換一批生活卡，半價。', fx: { rerollDisc: 0.5 } },
        { id: 'flash', name: '閃光燈', text: '閃卡的機會加倍。', fx: { foilX: 1 } },
        { id: 'haggle', name: '講價', text: '市集的物件便宜 15%。', fx: { shopDisc: 0.15 } },
        { id: 'movers', name: '搬屋公司的卡片', text: '搬上一層、租回單位便宜 25%。', fx: { moveDisc: 0.25 } },
        { id: 'paper', name: '舊報紙', text: '每輪第一次換一批生活卡，免費。', fx: { freeReroll: 1 } },
      ],
    },
    {
      id: 'consulate', name: '外星領事館', line: '情報', nodes: [
        { id: 'bulletin', name: '水位局內部通告', text: '白天看得到明晚的水位。', fx: { floodForecast: 1 }, info: true },
        { id: 'adverts', name: '招聘廣告', text: '篩選之後，預告下一輪外星評審的規則。', fx: { nextJudge: 1 }, info: true },
        { id: 'translator', name: '翻譯機', text: '外星評審的規則旁邊，寫明你有幾張素材會受影響。', fx: { judgeImpact: 1 }, info: true },
        { id: 'safehouse', name: '逃兵的暗號', text: '每局一次：第一次失去機會時，不扣機會。', fx: { saveChance: 1 } },
        { id: 'hideout', name: '藏身處', text: '把被收藏家看中的朋友藏起來，費用減半。', fx: { hideDisc: 0.5 } },
        { id: 'gaze', name: '升維者的目光', text: '每一生沉下去的沉積多 25%。', fx: { sedimentX: 0.25 } },
      ],
    },
  ];

  const SALVAGE_TEXT = {
    head: '舊城打撈',
    sub: '你每一生的作品，最後都沉到這裏。水底的東西，留給下一個你。',
    unit: '沉積',
    balance: '沉積 {n}',
    buy: '打撈',
    bought: '已打撈',
    need: '要 {n} 沉積',
    lockedPrev: '先打撈上面一層',
    infoTag: '情報',
    earnHead: '這一生沉下去的',
    earnTotal: '沉積 +{n}',
    lines: {
      nights: '完成 {n} 晚',
      passed: '{n} 晚達標',
      over: '超額 {n} 次',
      rounds: '通過 {n} 輪篩選',
      recruited: '被選中',
      firstClear: '第一次通過這一季',
      gaze: '升維者的目光',
      season: '這一季的沉積 ×{x}',
      streak: '執念：這一季已經失敗 {n} 次，沉積 ×{x}',
    },
    empty: '舊城還是一片漆黑。玩完一局，作品就會沉到這裏。',
    go: '去舊城打撈',
    confessBtn: '告解',
    confessDone: '你在告解室坐了一個下午。靈魂輕了 1 克，火花也弱了一點。',
    saved: '逃兵網絡替你改了一筆紀錄：這一次不扣機會。',
    forecast: '水位局內部通告：明晚水位 {w} 樓・{stage}',
    reviewPreview: '心電圖：今晚之後篩選。租金 {rent}（{rentOk}）・靈魂 {soul} 克（{soulOk}）',
    ok: '夠',
    short: '不夠',
    soulOk: '合格',
    soulOver: '超重',
    soulWarn: '病歷：靈魂離上限不足 2 克。',
    nextJudge: '招聘廣告：下一輪的外星評審規則是 {rules}',
    impact: '你有 {n} 張素材受影響',
    hint: '劇本：這手牌排得出「{form}」',
    preview: '排練：預計 {score} 分',
    roundPack: '沉船貨櫃：水退了一點，你撈起一個包。',
  };

  // ---------- 撕開：卡包、閃卡、重複升星 ----------
  const PACK16 = {
    foil: 0.05, // 每張新得到的素材是閃卡的機會（舊城的「閃光燈」加倍）
    foilChips: 1.5, // 閃卡計分時籌碼 ×1.5
    // 這些來歷的素材：同一張素材再抽到，不會多一張，而是原來那張升星
    dupKinds: ['story', 'work', 'trip', 'shop', 'friend', 'salvage'],
    kinds: {
      start: { name: '隨身行李', line: '來浮城之前就帶在身上的東西。' },
      story: { name: '人生的信封', line: '有些東西，是選擇留給你的。' },
      work: { name: '工資袋', line: '工資之外，工作還留下了一點別的。' },
      trip: { name: '旅行包', line: '從遠方帶回來的，通常不是紀念品。' },
      shop: { name: '市集包', line: '來歷不明，價錢公道。' },
      friend: { name: '朋友的信', line: '信封上的字，你認得。' },
      craft: { name: '工作室的盒', line: '你親手做出來的東西。' },
      salvage: { name: '打撈包', line: '舊城的水底，有上一生沉下去的東西。' },
      prologue: { name: '序章', line: '你第一次排出起承轉合。' },
    },
    tear: '撕開',
    tearHint: '用手指劃過封口',
    reveal: '再看一張',
    done: '收好',
    badge: { new: '新', foil: '閃', dup: '升星' },
    dupLine: '同一段經歷又來了一次，記得更深：升到 ★{n}。',
    foilLine: '閃卡：計分時籌碼 ×1.5。',
    oddsHead: '根據《浮城博彩透明條例》第 7 條，本包的機率公開如下',
    oddsStar: '★{n}：{p}',
    oddsFoil: '閃卡：每張 {p}',
    oddsPool: '這個包可能有：{list}',
    oddsBtn: '機率',
  };

  // ---------- 收藏冊的成就（第十七期新增） ----------
  const ACH17 = [
    { id: 'foil1', name: '品質超出預期，已通報有關部門', desc: '抽到第一張閃卡' },
    { id: 'dup1', name: '同一個夢做了兩次', desc: '第一次抽到重複的素材' },
    { id: 'salvage1', name: '水底的第一件東西', desc: '在舊城打撈第一個節點' },
    { id: 'salvageAll', name: '舊城重建委員會', desc: '打撈舊城的全部節點' },
    { id: 'c1', name: '試用期滿', desc: '通過「招聘季」' },
    { id: 'c2', name: '高產', desc: '通過「收成季」' },
    { id: 'c3', name: '信徒', desc: '通過「朝聖季」' },
    { id: 'c4', name: '玻璃櫃', desc: '通過「觀光季」' },
  ];

  // 第十八期（2026-11-25，製作人：「失敗係 100%，然後不斷透過失敗去成長」）：
  // 前世的軌道：舊城打撈裏可以一直升級的力量。每一級的效果相加；價錢按等級上升（PAST_COST）。
  // per 的鍵和舊城的節點相同，合併到 s.salvage：chipsX／multX 是每一筆的籌碼和倍率加成，payX 是夜晚獎金加成，sparkCap 是火花上限。
  const PAST_TRACKS = [
    { id: 'chips', name: '前世的手稿', text: '每一級：每一筆的籌碼 ×1.15（連乘）', per: { chipsX: 0.15 }, compound: true, max: 60 },
    { id: 'mult', name: '前世的掌聲', text: '每一級：每一筆的倍率 ×1.15（連乘）', per: { multX: 0.15 }, compound: true, max: 60 },
    { id: 'spark', name: '前世的星光', text: '開局火花 +0.1、火花上限 +0.1', per: { startSpark: 0.1, sparkCap: 0.1 }, max: 10 },
    { id: 'soul', name: '前世的藥方', text: '靈魂上限 +0.5 克', per: { soulLimit: 0.5 }, max: 8 },
    { id: 'purse', name: '前世的積蓄', text: '夜晚的獎金 +10%、開局多 {cash:4}', per: { payX: 0.1, startCash: 4 }, max: 12 },
  ];
  // 第 L 級升到 L + 1 的價錢：base × growth^L（四捨五入）
  const PAST_COST = { base: 10, growth: 1.12 };
  // 一生沉下去的沉積：每晚、每晚達標、超額每一級、每通過一輪、被選中、第一次通過這一季
  const SEDIMENT = { night: 4, passed: 6, over: 2, round: 8, recruited: 24, firstClear: 20,
    // 執念：同一季之前每連續失敗一次，這一生的沉積多 streak（最多算 streakMax 次）；通過這一季就重新計算
    streak: 0.25, streakMax: 4 };
  // 牆：每一季最後一晚的外星評審。不達標，這一生就結束（不論還有幾次機會）
  const WALL_TEXT = {
    ahead: '今晚是這一季最後的外星評審。不達標，這一生到此為止。',
    goal: '最後的外星評審',
    fail: '最後的外星評審沒有選中你。這一生到此為止；你的作品會沉到舊城。',
    best: '最遠：第 {n}／{total} 晚',
    bestWall: '最遠：外星評審的 {p}%',
    lifeNow: '這一生：第 {n}／{total} 晚',
    lifePrev: '上一生：第 {n}／{total} 晚',
    wallPct: '外星評審 {p}%',
    newBest: '新的最遠紀錄',
    pastHead: '前世',
    pastSub: '每一次失敗，都令下一生更強。',
    pastPower: '每一筆 ×{x}',
    pastFree: '前世的力量只帶進浮城年表的季節；全城篩選只看今生。',
    level: 'Lv.{n}',
    levelMax: '已滿',
    up: '升級',
  };

  // 第十七期（後段的引擎）的文字
  const ENGINE_TEXT = {
    sparkCapUp: '外星人調高了你的訊號上限：火花上限 +{v}（現在 ×{max}）。',
    masterwork: '名作：這幅作品的 {n} 張素材記得更深，各升一星。',
  };

  Object.assign(D, { CHAPTERS, CHAPTER_TEXT, SALVAGE, SALVAGE_COST, SALVAGE_TEXT, PACK16, ACH17, ENGINE_TEXT, PAST_TRACKS, PAST_COST, WALL_TEXT, SEDIMENT });
});
