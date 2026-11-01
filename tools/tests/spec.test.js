// 規格測試（由 Claude 維護）：資料檔必須與 docs/workorders/phase-15/README.md 的總規格逐字一致。
// 實作工單時不可以修改這個檔案；只有數值校準（WO-15-09）可以在同一個 PR 更新 ECON 的期望值，並在 PR 說明。
// data-rounds.js 還未加入時（WO-15-01 之前），這些測試不檢查任何東西。
module.exports = (t) => {
  const { D, assert } = t;
  const has = () => !!D.ECON;

  // 總規格 §6
  const ECON = {
    t1: 3120,
    growth: 1.42,
    firstRunEase: 0.7,
    hand: 8, plays: 4, discards: 3,
    nightPay: { small: 42, big: 62, boss: 140 },
    payGrowth: 0.25,
    earlyBonus: 8,
    overkillSpark: 0.22,
    failSpark: -0.3,
    rent: [160, 240, 305, 365, 430],
    offerReroll: [10, 20, 30],
    skipSpark: 0.2,
    tripCost: 85, tripPick: 2,
    objReroll: [20, 30, 40, 50],
    pack: 35, packFar: 55,
    packStars: [0.01, 0.05, 0.18, 0.36, 0.40],
    packLegend: 0.03,
    polish: [0, 10, 20, 35, 55],
    burn: 15, copy: 35, minDeck: 8,
    tech: 20, techStep: 10,
    toolMult: 1,
    sparkFloor: 1,
  };

  // 總規格 §11
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

  t.test('規格：ECON 與總規格 §6 一致（沒有多出或缺少的欄位）', () => {
    if (!has()) return;
    assert.deepEqual(D.ECON, ECON);
  });

  t.test('規格：ROUND_TEXT 與總規格 §11 逐字一致', () => {
    if (!has()) return;
    assert.deepEqual(D.ROUND_TEXT, ROUND_TEXT);
  });

  t.test('規格：生活卡、素材包、工作室服務與總規格 §7、§8 一致', () => {
    if (!has()) return;
    const kinds = Object.fromEntries(D.DAYCARDS.map((c) => [c.id, c.kind]));
    assert.deepEqual(kinds, { label: 'work', delivery: 'work', clinic: 'work', salvage: 'work', haggle: 'work', farm: 'shady', smile: 'shady',
      dive: 'life', busk: 'life', garden: 'life', friend: 'friend', volunteer: 'volunteer', trip: 'trip' });
    D.DAYCARDS.filter((c) => !['friend', 'volunteer', 'trip'].includes(c.id)).forEach((c) => assert.equal(c.micro, c.id, c.id + ' 的 micro'));
    const trip = D.DAYCARDS.find((c) => c.id === 'trip');
    assert.equal(trip.minRound, 2);
    assert.equal(trip.chance, 0.15);
    assert.deepEqual(trip.origins, ['asia', 'europe', 'america', 'africa', 'arctic', 'ocean']);
    assert.deepEqual(D.PACKS.map((p) => p.id), ['flood', 'sky', 'street', 'under', 'far']);
    assert.deepEqual(D.PACKS.find((p) => p.id === 'flood').tags, ['water', 'memory']);
    assert.deepEqual(D.PACKS.find((p) => p.id === 'sky').tags, ['machine', 'neon']);
    assert.deepEqual(D.PACKS.find((p) => p.id === 'street').tags, ['warmth', 'hunger', 'hope']);
    assert.deepEqual(D.PACKS.find((p) => p.id === 'under').tags, ['rebel', 'anger', 'guilt']);
    assert.equal(D.PACKS.find((p) => p.id === 'far').foreign, true);
    assert.deepEqual(D.SERVICES.map((x) => x.id + ':' + x.name), ['polish:打磨', 'burn:燒掉', 'copy:複印']);
  });

  t.test('規格：五輪模式的設定與總規格 §3 一致', () => {
    if (!has()) return;
    const M = D.MODES.rounds;
    assert.ok(M, '沒有 rounds 模式');
    assert.equal(M.rounds, true);
    assert.equal(M.days, 60);
    assert.equal(M.period, 12);
    assert.deepEqual(M.stageDays, [4, 8, 12]);
    assert.equal(M.season, 20);
    assert.equal(M.sketch, false);
  });
};
