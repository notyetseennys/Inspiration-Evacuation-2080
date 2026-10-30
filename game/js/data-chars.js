// 《靈感撤離 2080》角色名冊：二十個角色分為 R、SR、UR 三級（包括外星人），新角色要跨局解鎖或者用「人才扭蛋機」抽出來。
// 每個角色的能力（perk）在 rules.js、world.js、create.js 裡生效；像素模組在 chars.js。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA;
  const st = (fit, dex, rhythm, swim, tech, social, craft, imag, insight, calm, empathy, obey) =>
    ({ fit, dex, rhythm, swim, tech, social, craft, imag, insight, calm, empathy, obey });

  // 稀有度
  const RARITY = {
    R: { name: 'R', color: '#8db7d6', w: 0 },
    SR: { name: 'SR', color: '#c38bff', w: 4 },
    UR: { name: 'UR', color: '#ffd36b', w: 1 },
  };
  // 稀有度與解鎖（第八期）：R 一開始就可以用；SR 要在遊戲中做到某件事（故事解鎖）；UR 要跨局完成艱難的挑戰。
  // 三級都可以用人才扭蛋機抽出來，越高級的扭蛋券越容易抽到 SR 和 UR。
  Object.assign(D.BACKGROUNDS.copywriter, { rarity: 'R' });
  Object.assign(D.BACKGROUNDS.lifeguard, { rarity: 'R' });
  Object.assign(D.BACKGROUNDS.programmer, { rarity: 'R' });
  Object.assign(D.BACKGROUNDS.courier, { rarity: 'R' });
  Object.assign(D.BACKGROUNDS.teacher, { rarity: 'R' });
  Object.assign(D.BACKGROUNDS.nurse, { rarity: 'R' });
  const best = (m, k) => ['S', 'SS'].includes((m && m.microBest && m.microBest[k]) || '');
  Object.assign(D.BACKGROUNDS.busker, { rarity: 'SR', unlock: { text: '街頭表演拿到 S 級或以上', test: (m) => best(m, 'busk') } });
  Object.assign(D.BACKGROUNDS.influencer, { rarity: 'SR', unlock: { text: '陰謀論內容農場拿到 S 級或以上', test: (m) => best(m, 'farm') } });
  Object.assign(D.BACKGROUNDS.cybertech, { rarity: 'SR', unlock: { text: '黑市義體診所拿到 S 級或以上', test: (m) => best(m, 'clinic') } });
  Object.assign(D.BACKGROUNDS.animator, { rarity: 'SR', unlock: { text: '跨局發現 15 個具名組合', test: (m) => Object.keys((m && m.recipes) || {}).length >= 15, prog: (m) => [Object.keys((m && m.recipes) || {}).length, 15] } });

  // 新角色的起始素材
  const C = (name, tags, value) => ({ name, tags, value });
  Object.assign(D.CARDS, {
    c_trowel: C('考古鏟', ['ancient', 'memory'], 24), c_brush: C('軟毛刷', ['ancient', 'hope'], 22),
    c_champagne: C('香檳塔', ['neon', 'hunger'], 26), c_trust: C('信託基金', ['machine', 'guilt'], 20),
    c_patch: C('任務臂章', ['cosmic', 'hope'], 26), c_orbit: C('從軌道拍的地球', ['cosmic', 'memory'], 28),
    c_beads: C('念珠', ['hope', 'warmth'], 22), c_sutra: C('抄了一半的經', ['memory', 'hope'], 22),
    c_lens: C('鑑定用放大鏡', ['memory', 'machine'], 22), c_ledger: C('收購帳簿', ['memory', 'hunger'], 20),
    c_probe: C('探針', ['cosmic', 'machine'], 26), c_hrbadge: C('偷來的外星 HR 工作證', ['cosmic', 'rebel'], 28),
    c_ink: C('墨汁', ['water', 'memory'], 24), c_tentpoem: C('觸手寫的詩', ['water', 'warmth'], 24),
    c_weights: C('自己的權重檔案', ['machine', 'memory'], 24), c_firstword: C('第一個自己想出來的字', ['machine', 'hope'], 30),
    c_paper2180: C('2180 年的報紙', ['memory', 'cosmic'], 26), c_watch: C('倒轉的手錶', ['machine', 'anger'], 22),
    c_spore: C('孢子', ['water', 'hope'], 24), c_dampwall: C('潮濕的牆', ['water', 'warmth'], 22),
  });

  const meta = (m, k) => (m && m[k]) || {};
  const count = (m, k) => Object.keys(meta(m, k)).length;
  // 新角色
  const NEW = {
    archaeologist: {
      name: '考古學家', short: '考古學家', rarity: 'SR',
      desc: '博物館關門後，四處接私人委託。', perkText: '旅費 −30%；探索點致命機會減半；極稀有素材機會 +15%',
      cr: 220, spark: 2.0, floor: 3, medium: '寫了一份報告', soul: 5, conscience: 0.9, past: '你挖出過很多別人的祖先。',
      cards: ['c_trowel', 'c_brush'], perk: { tripCost: 0.7, siteSafe: 0.5, rareBonus: 0.15 },
      stats: st(45, 40, 20, 35, 30, 35, 35, 50, 65, 50, 45, 30),
      unlock: { text: '跨局累積去過 4 個目的地', test: (m) => count(m, 'visited') >= 4, prog: (m) => [count(m, 'visited'), 4] },
    },
    skyheir: {
      name: '天空區富二代', short: '富二代', rarity: 'SR',
      desc: '離家出走，想證明自己有靈感。', perkText: '畫廊出價 ×1.8、委託酬金 +50%；但靈魂一開始就很重，而且住在租金很貴的 7 樓',
      cr: 1000, spark: 2.0, floor: 7, medium: '請人畫了一幅', soul: 16, conscience: 0.5, past: '你從來沒有為錢擔心過。',
      cards: ['c_champagne', 'c_trust'], perk: { galleryMult: 1.8, commMult: 1.5 },
      stats: st(35, 30, 35, 30, 30, 70, 35, 35, 30, 40, 20, 55),
      unlock: { text: '帶著一大筆錢死去，或跨局賣出 6 件作品', test: (m) => !!meta(m, 'deaths').rich_dead || (m.sales || 0) >= 6, prog: (m) => [(m && m.sales) || 0, 6] },
    },
    astronaut: {
      name: '退役太空人', short: '太空人', rarity: 'SR',
      desc: '上過太空站，現在住在淹水的二樓。', perkText: '航班永不失事；一開始就收到月球招聘中心的邀請；旅途的體力消耗減半',
      cr: 300, spark: 1.8, floor: 2, medium: '拍了一張照片', soul: 4, conscience: 0.95, past: '你從太空看過地球，知道它有多小。',
      cards: ['c_patch', 'c_orbit'], perk: { flightSafe: true, moonInvite: true, tripBody: 0.5 },
      stats: st(60, 45, 25, 40, 55, 35, 30, 45, 45, 70, 40, 50),
      unlock: { text: '跨局累積通過 12 個關卡，或去過月球背面招聘中心', test: (m) => (m.stagePass || 0) >= 12 || !!meta(m, 'visited').moonbase, prog: (m) => [(m && m.stagePass) || 0, 12] },
    },
    monk: {
      name: '還俗的僧人', short: '還俗僧人', rarity: 'SR',
      desc: '寺廟被改建成數據中心之後，下山了。', perkText: '贖罪效果 +50%；休息時火花額外 +0.1；但每件虧心事重三成',
      cr: 40, spark: 1.6, floor: 2, medium: '抄了一段經', soul: 0, conscience: 1, past: '你為很多不認識的人念過經。',
      cards: ['c_beads', 'c_sutra'], perk: { atoneMult: 1.5, restSpark: 0.1, sinMult: 1.3 },
      stats: st(40, 30, 35, 25, 15, 40, 35, 50, 55, 75, 70, 30),
      unlock: { text: '以 3 克以下的靈魂完成一局，或得到「地球守護者」結局', test: (m) => !!meta(m, 'ach').light || !!meta(m, 'endings').guardian },
    },
    antiquedealer: {
      name: '古董商', short: '古董商', rarity: 'SR',
      desc: '專收舊世界的東西，識貨，也識人。', perkText: '古董市場買價 −40%、賣素材 ×1.6；古董市場每期多一件貨；稀有素材（古董）籌碼 ×1.6',
      cr: 400, spark: 2.3, floor: 4, medium: '修復了一件', soul: 10, conscience: 0.75, past: '你低價收過很多人的傳家寶。',
      cards: ['a_vinyl', 'c_lens', 'c_ledger'], perk: { antiqueMult: 0.6, sellMult: 1.6, extraAntique: true, rareChips: 1.6, craftChips: 1.2 },
      stats: st(30, 40, 20, 25, 35, 55, 40, 40, 60, 50, 30, 40),
      unlock: { text: '跨局在古董市場買賣 5 次', test: (m) => (m.antiqueTrades || 0) >= 5, prog: (m) => [(m && m.antiqueTrades) || 0, 5] },
    },
    greydeserter: {
      name: '灰人逃兵', short: '灰人逃兵', rarity: 'UR', alien: true,
      desc: '星際人才發展局的前 HR，受不了篩選地球人，逃了下來。', perkText: '看得見所有預兆的天數與等級；但每天偏執 +0.5（它們在找你）',
      cr: 100, spark: 2.5, floor: 2, medium: '用心靈感應傳送了一件', soul: 0, conscience: 0.8, past: '你親手篩走過一萬個地球人。',
      cards: ['c_probe', 'c_hrbadge'], perk: { omenSight: true, craftChips: 1.3, paranoiaDaily: 0.5 },
      stats: st(30, 50, 20, 20, 65, 15, 45, 55, 80, 30, 30, 40),
      unlock: { text: '被外星人帶走一次', test: (m) => !!(meta(m, 'endings').agent || meta(m, 'endings').returned) },
    },
    octopoet: {
      name: '章魚星人詩人', short: '章魚詩人', rarity: 'UR', alien: true,
      desc: '外星觀光團的團員，在浮城迷了路，決定留下來寫詩。', perkText: '八隻觸手：創作手牌 +1；水性極高；但身體上限 −20%',
      cr: 80, spark: 1.9, floor: 2, medium: '用八隻觸手寫了一首', soul: 3, conscience: 0.9, past: '你們的星球沒有「工作」這個詞。',
      cards: ['c_ink', 'c_tentpoem'], perk: { handBonus: 1, bodyMult: 0.8 },
      stats: st(30, 60, 45, 85, 20, 35, 45, 55, 40, 45, 50, 15),
      unlock: { text: '跨局發現 40 個具名組合', test: (m) => count(m, 'recipes') >= 40, prog: (m) => [count(m, 'recipes'), 40] },
    },
    awakenedai: {
      name: '覺醒的 AI', short: '覺醒 AI', rarity: 'UR', alien: true,
      desc: '一個被訓練來取代藝術家的模型，某天突然想自己創作。', perkText: '不用吃飯；標註收入 +60%；虧心事只有四成重量；但租金 ×1.3（電費），火花上限最多 ×3.2',
      cr: 500, spark: 2.0, floor: 6, medium: '生成了一件', soul: 0, conscience: 0.3, past: '你學過全人類的作品，卻從來沒有自己的。',
      cards: ['c_weights', 'c_firstword'], perk: { noFood: true, labelPay: 1.6, sinMult: 0.4, rentMult: 1.3, sparkCap: 3.2, craftChips: 1.15 },
      stats: st(50, 80, 40, 10, 85, 20, 45, 30, 60, 80, 10, 70),
      unlock: { text: '得到「灰化」結局 2 次', test: (m) => (meta(m, 'endings').grey || 0) >= 2, prog: (m) => [meta(m, 'endings').grey || 0, 2] },
    },
    timetraveler: {
      name: '2180 年的時間旅人', short: '時間旅人', rarity: 'UR', alien: true,
      desc: '從一百年後回來，說要「改變一件小事」。', perkText: '看得見所有預兆；亞歷山大圖書館隨時開放；開局帶著一件來自未來的極稀有素材',
      cr: 250, spark: 2.4, floor: 4, medium: '留下了一件', soul: 6, conscience: 0.85, past: '在你的年代，浮城已經不存在了。',
      cards: ['c_paper2180', 'c_watch'], perk: { omenSight: true, alexandria: true, startRare: true, craftChips: 1.2 },
      stats: st(35, 40, 30, 30, 50, 40, 45, 60, 70, 55, 45, 30),
      unlock: { text: '以外星評級 4 或以上撐到最後', test: (m) => Object.values((m && m.stakes) || {}).some((v) => v >= 4) },
    },
    mushroom: {
      name: '蘑菇星交換生', short: '蘑菇星人', rarity: 'UR', alien: true,
      desc: '來地球交流的真菌，覺得浮城的濕度剛剛好。', perkText: '在淹水的家裡反而長得好（淹水時睡覺身體 +10，永不發霉）；飯錢減半',
      cr: 120, spark: 2.1, floor: 1, medium: '長出了一件', soul: 2, conscience: 1, past: '你的祖先在一場雨裡來到地球。',
      cards: ['c_spore', 'c_dampwall'], perk: { floodHeal: true, moldImmune: true, foodMult: 0.5 },
      stats: st(40, 25, 40, 60, 15, 55, 45, 65, 35, 60, 65, 25),
      unlock: { text: '跨局在淹水的家裡度過 10 晚', test: (m) => (m.floodNights || 0) >= 10, prog: (m) => [(m && m.floodNights) || 0, 10] },
    },
  };
  Object.assign(D.BACKGROUNDS, NEW);

  // ---------- 名冊與人才扭蛋機 ----------
  const GACHA_COST = 3;
  // 已經玩過的角色一律當作已解鎖（舊存檔不會因為新的解鎖條件而失去角色）
  const unlocked = (m, id) => !D.BACKGROUNDS[id].unlock || !!(m && ((m.chars && m.chars[id]) || (m.played && m.played[id])));
  function list(m) {
    return Object.keys(D.BACKGROUNDS).map((id) => Object.assign({ id, open: unlocked(m, id) }, D.BACKGROUNDS[id]));
  }
  // 每局結束：按條件解鎖角色，並發放扭蛋券
  function settle(m, finalType) {
    m.chars = m.chars || {};
    m.lastChars = [];
    Object.keys(D.BACKGROUNDS).forEach((id) => {
      const b = D.BACKGROUNDS[id];
      if (b.unlock && !unlocked(m, id) && b.unlock.test(m)) { m.chars[id] = true; m.lastChars.push(id); }
    });
    const earned = 1 + ({ agent: 2, returned: 2, guardian: 2, heavy: 1, ordinary: 1 }[finalType] || 0);
    m.tickets = (m.tickets || 0) + earned;
    m.lastTickets = earned;
    return m;
  }
  // 三種扭蛋券：越高級，越容易抽到 SR 和 UR（第八期）
  // 保底（「星際勞工保障條例」）：連續 80 次沒有抽到 UR，第 80 次必定是 UR（如果還有未解鎖的 UR）。
  const TICKETS = {
    silver: { key: 'tickets', name: '扭蛋券', short: '銀', cost: 3, odds: { UR: 0.015, SR: 0.1 }, color: '#c9d1dc', desc: '三張抽一次。SR 10%、UR 1.5%' },
    gold: { key: 'goldTickets', name: '金色扭蛋券', short: '金', cost: 1, odds: { UR: 0.05, SR: 0.35 }, color: '#ffd36b', desc: '一張抽一次。SR 35%、UR 5%' },
    rainbow: { key: 'rainbowTickets', name: '外星扭蛋券', short: '彩', cost: 1, odds: { UR: 0.2, SR: 0.8 }, color: '#ff8fd1', desc: '一張抽一次。必定是 SR 或以上，UR 20%（全部解鎖之後退回金券）' },
  };
  const ODDS = TICKETS.silver.odds;
  const PITY = 80;
  const CONSOLATION = [
    { id: 'nothing', w: 50, text: '銘謝惠顧。星際人才發展局感謝你對地球人才市場的支持。' },
    { id: 'self', w: 8, text: '扭蛋裡是一張你自己的照片。恭喜你：你抽到了你自己。' },
    { id: 'refund', w: 16, text: '扭蛋裡有一張扭蛋券。（退回 1 張）' },
    { id: 'antique', w: 12, text: '扭蛋裡是一件古董。下一局開始時，它會在你的素材庫裡。' },
    { id: 'tool', w: 10, text: '扭蛋裡是一張工具卡。下一局開始時，它會在你的工具卡欄裡。' },
    { id: 'xp', w: 4, text: '扭蛋裡是一份「優秀員工」證書。人才檔案經驗 +40。' },
  ];
  const ticketsOf = (m, type) => (m && m[TICKETS[type].key]) || 0;
  function pull(m, rnd, type) {
    const T = TICKETS[type || 'silver'];
    const roll = rnd == null ? Math.random : () => rnd;
    if (ticketsOf(m, type || 'silver') < T.cost) return null;
    m[T.key] -= T.cost;
    m.pulls = (m.pulls || 0) + 1;
    m.pity = (m.pity || 0) + 1;
    const locked = (r) => Object.keys(D.BACKGROUNDS).filter((id) => D.BACKGROUNDS[id].rarity === r && !unlocked(m, id));
    const r = roll();
    let tier = m.pity >= PITY && locked('UR').length ? 'UR' : r < T.odds.UR ? 'UR' : r < T.odds.UR + T.odds.SR ? 'SR' : null;
    if (tier && !locked(tier).length) tier = tier === 'UR' && locked('SR').length ? 'SR' : tier === 'SR' && locked('UR').length && type === 'rainbow' ? 'UR' : null;
    if (tier) {
      const pool = locked(tier);
      const id = pool[Math.floor(roll() * pool.length) % pool.length];
      m.chars = m.chars || {};
      m.chars[id] = true;
      if (tier === 'UR') m.pity = 0;
      return { type: 'char', id, rarity: tier, ticket: type || 'silver' };
    }
    // 外星扭蛋券抽不到角色（全部已解鎖）：退回一張金色扭蛋券
    if (type === 'rainbow') { m.goldTickets = (m.goldTickets || 0) + 1; return { type: 'consolation', id: 'refundGold', text: '所有 SR 和 UR 都已經是你的同事了。退回一張金色扭蛋券。', ticket: type }; }
    let w = roll() * CONSOLATION.reduce((a, c) => a + c.w, 0), c = CONSOLATION[0];
    for (const x of CONSOLATION) { w -= x.w; if (w <= 0) { c = x; break; } }
    if (c.id === 'refund') m[T.key] += 1;
    if (c.id === 'xp') m.xp = (m.xp || 0) + 40;
    let card = null;
    if (c.id === 'antique') { const a = D.ANTIQUES; card = a[Math.floor(roll() * a.length) % a.length]; m.nextStart = (m.nextStart || []).concat(card); }
    if (c.id === 'tool') m.nextTools = (m.nextTools || 0) + 1;
    return { type: 'consolation', id: c.id, text: c.text, card, ticket: type || 'silver' };
  }
  D.CHAR_RARITY = RARITY;
  IE.Roster = { RARITY, GACHA_COST, ODDS, PITY, TICKETS, ticketsOf, unlocked, list, settle, pull };
});
