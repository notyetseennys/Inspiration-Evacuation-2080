// 《靈感撤離 2080》第八期：二十個角色的招牌能力與代價。
// 每個角色有一個改寫規則的招牌能力，以及一個明顯的代價；R 簡單易懂，SR 改變一個系統，UR 改寫核心規則。
// use：night 每晚一次（創作桌上）、money 每晚可以重複（價錢翻倍）、toggle 每晚開關一次、period 每期一次、passive 不用操作。
// perk：加到角色原有的 perk（規則見 rules.js、create.js、stages.js 的對應位置）。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA;
  const A = (name, use, desc, cost, perk, extra) => Object.assign({ name, use, desc, cost, perk: perk || {} }, extra || {});
  const ABILITIES = {
    // ---- R：簡單易懂 ----
    copywriter: A('包裝', 'period', '每期一次：宣稱今晚的作品「符合本季 KPI」，KPI 加成必定生效。', '每次包裝，靈魂 +1 克（誇大失實）。',
      { craftChips: 1 }),
    lifeguard: A('深潛', 'passive', '潛水時多撈一件遺物，深處偶然有只有你找得到的極稀有素材；家裡淹水不會傷身。', '在陸地工作（標註、陪伴、義體診所）收入 −10%。',
      { deepDive: true, floodSafe: true, landPay: 0.9, craftChips: 1.15 }),
    programmer: A('寫腳本', 'passive', '小遊戲「照舊做」最高可以拿到 S 級（其他人最多 A 級）。', 'AI 模仿你的速度加倍：你的腳本教會了 AI。',
      { scriptS: true, aiSpeed: 2 }),
    courier: A('趕單', 'passive', '每天第一次工作之後，可以馬上再接一單（不佔時段）。', '火花恢復只有六成：你永遠在趕時間。',
      { rush: true, sparkGain: 0.6 }),
    teacher: A('批改', 'night', '每晚一次：把一張手牌「打回頭重寫」，永久籌碼 +4，磨損歸零。', '「數」媒材的素材籌碼 −30%：你不懂科技。',
      { dataChips: 0.7 }),
    nurse: A('急救', 'passive', '每局兩次：死亡時以 1 點身體活下來。晚上可以「返夜班」賺錢。', '返夜班的翌日，火花 −0.3。',
      { firstAid: 2, nightShift: true, volunteerAtone: 1.2 }),
    // ---- SR：改變一個系統 ----
    busker: A('安哥', 'night', '正式創作的晚上（不是速寫）一次：觀眾要求再唱，重播剛才那一筆（分數 ×0.4），不用下筆次數。', '即興：每晚第一筆之前不准改稿。',
      { noEarlyDiscard: true, freeChat: false }),
    influencer: A('直播', 'toggle', '每晚可以開直播：之後每一筆 ×1.8，但有一成半機會「翻車」×0.4；平台評分跟著升跌。', '平台評分低於 3 星時，火花上限 −1。',
      { lowRatingCap: 1 }),
    cybertech: A('義體欄', 'passive', '多一個靈感物件欄，但只可以放機械流的物件。', '身體上限 −25。',
      { implantSlot: true, bodyMinus: 25 }),
    animator: A('逐格', 'night', '每晚一次：看牌庫頂的三張，挑一張立即加入手牌。', 'AI 模仿你的速度 ×1.5：你的分鏡早就被拿去訓練了。',
      { aiSpeed: 1.5 }),
    archaeologist: A('出土', 'passive', '素材用到第四次時，有一半機會「出土」，變成一件古董。', '書呆子：聊天得到的火花減半。',
      { unearth: 0.5, chatHalf: true, craftChips: 1.2 }),
    skyheir: A('鈔能力', 'money', '每晚可以花錢多買一次下筆或改稿（每買一次，價錢翻倍）。', '火花上限 −0.5（你沒有真正痛過）；飢餓流對你無效。',
      { sparkCapMinus: 0.5, noHunger: true }),
    astronaut: A('軌道預報', 'passive', '開局就看見本局全部外星評審的規則；所有預兆提早出現，而且看得見天數。', '在地球適應不良：每天早上身體 −1。',
      { orbit: true, omenSight: true, dayTire: 1, craftChips: 1.2 }),
    monk: A('無欲', 'passive', '所有計分的素材都計分兩次。', '只可以裝備兩件靈感物件；素材庫上限 15 張。',
      { allTwice: true, objMax: 2, deckMax: 15 }),
    antiquedealer: A('鑑定', 'period', '隨時可以在牌庫把不在手上的素材賣掉換錢；每期一次可以把一張普通素材「做舊」成古董。', '每做舊一件，靈魂 +2 克。',
      { appraise: true, craftChips: 1.35 }),
    // ---- UR：改寫核心規則 ----
    greydeserter: A('內鬼', 'period', '每期一次：在外星評審之夜花錢賄賂評審，取消一條規則。', '被追捕：每期有一個早上要躲起來，甚麼都做不了。',
      { hunted: true }),
    octopoet: A('八隻手', 'passive', '每次下筆最多可以用八張素材。', '每晚只有兩次下筆；家裡沒有淹水時太乾，每天早上身體 −1。',
      { maxCards: 8, playsSet: 2, needWater: 1, craftChips: 1.2 }),
    awakenedai: A('自我學習', 'passive', 'AI 模仿反過來：同一種作品形式用得越密，倍率越高（最多 ×2）。', '沒有良知：「愧疚」素材不能下筆；也學不到朋友教的技法。',
      { aiInvert: true, noGuilt: true, noNpcTeach: true }),
    timetraveler: A('倒帶', 'night', '每晚一次撤回上一筆；每期一次可以把今天重過。', '每倒帶一次偏執 +6；偏執太高，你會在手機上看見另一個自己。',
      { rewind: true }),
    mushroom: A('菌絲', 'passive', '每晚創作之後，一張用過的素材會長出一張同標籤的孢子素材；淹水反而回血。', '素材磨損速度加倍：它們會腐爛。',
      { mycelium: true, wearX2: true }),
  };
  Object.keys(ABILITIES).forEach((id) => { const b = D.BACKGROUNDS[id]; if (b) b.perk = Object.assign({}, b.perk || {}, ABILITIES[id].perk); });

  // 平衡（第八期）：按模擬調整每個角色的創作籌碼，令 R、SR、UR 之間有差距但不會太大（見 README「平衡模擬」）
  const CHIPS = { copywriter: 0.8, lifeguard: 1.5, programmer: 1, courier: 0.8, teacher: 0.85, nurse: 0.7,
    busker: 0.8, influencer: 1.1, cybertech: 0.62, animator: 1.15, archaeologist: 1.6, skyheir: 1.1, astronaut: 1.45, monk: 1.1, antiquedealer: 1.45,
    greydeserter: 1.6, octopoet: 1.4, awakenedai: 1.8, timetraveler: 1.3, mushroom: 1.1 };
  Object.keys(CHIPS).forEach((id) => { const b = D.BACKGROUNDS[id]; if (b) b.perk.craftChips = CHIPS[id]; });
  const USE_TEXT = { night: '每晚一次', money: '每晚可以重複', toggle: '每晚開關', period: '每期一次', passive: '被動' };

  // 「趕單」計算的工作
  const WORK_KINDS = ['label', 'smile', 'delivery', 'farm', 'clinic', 'salvage', 'haggle'];

  Object.assign(D, { ABILITIES, ABILITY_USE: USE_TEXT, WORK_KINDS });
});
