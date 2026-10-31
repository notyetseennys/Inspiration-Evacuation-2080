// 《靈感撤離 2080》第十五期：五輪模式的數值常數、白日卡目錄、素材包、服務與固定文案。
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
    t1: 4000,
    growth: 1.5,
    firstRunEase: 0.65,
    reward: { small: 80, big: 140, boss: 220 },
    interestStep: 50,
    interestCap: 25,
    rent: [220, 340, 480, 640, 820],
    rerollBase: 40,
    rerollStep: 20,
    packCost: 65,
    packPick: 1,
    packShow: 3,
    toolCost: 50,
    serviceCost: { polish: 70, burn: 50, copy: 110 },
    sparkDecay: 0.15,
    sparkFloor: 0.6,
  };

  // 五輪模式的固定文案
  const ROUND_TEXT = {
    modeName: '五輪',
    modeDesc: '十五晚，約四十分鐘',
    dayPickTitle: '今天白天做甚麼？',
    dayPickSub: '選一張白日卡（小遊戲或一鍵結算），做完就入夜創作',
    nightSmall: '社區小展',
    nightBig: '畫廊聯展',
    nightBoss: '外星評審',
    passHeadline: '過關',
    failHeadline: '未達標',
    interestLine: (n) => '存款利息 +$' + n,
    chanceLost: (left) => '失去一盞機會燈（剩餘 ' + left + ' 盞）',
    shopTitle: '晚間市集',
    shopSub: '買靈感物件、拆素材包、做一次服務，準備好就去下一晚',
    shopSkip: '收工，去下一晚',
    packTitle: '選一張帶走',
    packSkip: '都不拿',
    servicePickTitle: (name) => name + '：選一張素材',
    roundEndTitle: (r) => '第 ' + r + ' 輪結束・篩選與交租',
    rentPaid: (v) => '交租 −$' + v,
    rentShort: (v) => '不夠錢交租（差 $' + v + '）：搬到天橋底，火花 −0.6，失去一件最貴的靈感物件',
    npcTaken: (name, card) => name + ' 今晚被探射燈帶走了，臨走塞給你「' + card + '」',
  };

  // 十三張白日卡目錄
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

  // 晚間市集的三種服務
  const SERVICES = [
    { id: 'polish', name: '打磨', desc: '一張素材升一星' },
    { id: 'burn', name: '燒掉', desc: '從素材庫刪除一張素材' },
    { id: 'copy', name: '複印', desc: '複製一張素材' },
  ];

  Object.assign(D, { ECON, ROUND_TEXT, DAYCARDS, PACKS, SERVICES });
});
