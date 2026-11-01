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
    t1: 3120,             // 第 1 晚的目標
    growth: 1.42,         // 之後每晚 ×1.42
    firstRunEase: 0.7,    // 第一局的第 1、2 晚目標 ×0.7
    // 創作桌
    hand: 8, plays: 4, discards: 3,
    // 收入
    nightPay: { small: 42, big: 62, boss: 140 },
    payGrowth: 0.25,      // 每多一輪，獎金 +25%
    earlyBonus: 8,        // 每次沒有用的下筆
    overkillSpark: 0.22,  // 分數達到目標兩倍：火花 +0.22
    failSpark: -0.3,      // 一晚失敗：火花 −0.3
    // 篩選日
    rent: [160, 240, 305, 365, 430],
    // 白天
    offerReroll: [10, 20, 30],      // 換一批生活卡（第 4 次起都是最後一個價錢）
    skipSpark: 0.2,                 // 睡懶覺
    tripCost: 85, tripPick: 2,      // 出國：五選二
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

  Object.assign(D, { ECON, ROUND_TEXT, DAYCARDS, PACKS, SERVICES });
});
