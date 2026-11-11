// 第十六期（WO-16-06）：水位階段、淹水後果、搬遷服務與固定文案單元測試。
'use strict';

module.exports = (t) => {
  if (!t.IE.Cards) require('../../game/js/cards.js');
  if (!t.IE.Flood) require('../../game/js/flood.js');
  const { IE, D, R, assert } = t;
  const F = IE.Flood, RD = IE.Rounds;

  t.test('水位：差一層以內是預警，沒有損失', () => {
    const s = t.run({ mode: 'rounds', seed: 101, bg: 'copywriter' });
    s.floor = 3;
    s.water = 1.8;
    assert.equal(F.stage(s), 'dry');

    s.water = 2.2;
    const body0 = s.body;
    const spark0 = s.spark;
    assert.equal(F.stage(s), 'warn');

    const rep = F.tick(s);
    assert.equal(s.flood, 'warn');
    assert.equal(s.floodRun, 0);
    assert.equal(s.body, body0);
    assert.equal(s.spark, spark0);
    assert.equal(s.floodPick, null);
    assert.ok(rep && rep.lines.some((l) => l.text === D.FLOOD_TEXT.warn));
  });

  t.test('水位：淹第一晚是輕，身體和火花減少', () => {
    const s = t.run({ mode: 'rounds', seed: 102, bg: 'copywriter' });
    s.floor = 3;
    s.water = 3.1;
    const body0 = s.body;
    const spark0 = s.spark;

    const rep = F.tick(s);
    assert.equal(s.floodRun, 1);
    assert.equal(s.flood, 'light');
    assert.equal(F.stage(s), 'light');
    assert.equal(s.body, body0 - D.ECON16.floodBody);
    assert.equal(R.round1(s.spark), R.round1(spark0 - D.ECON16.floodSpark));
    assert.equal(s.floodPick, null);
    assert.ok(rep && rep.lines.some((l) => l.text === D.FLOOD_TEXT.light));

    // floodSafe / floodHeal 角色特性：「輕」沒有損失
    const sSafe = t.run({ mode: 'rounds', seed: 103, bg: 'lifeguard' });
    sSafe.floor = 3;
    sSafe.water = 3.1;
    const bSafe = sSafe.body;
    const spSafe = sSafe.spark;
    F.tick(sSafe);
    assert.equal(sSafe.floodRun, 1);
    assert.equal(sSafe.flood, 'dry');
    assert.equal(sSafe.body, bSafe);
    assert.equal(sSafe.spark, spSafe);
  });

  t.test('水位：連續第二晚是中，三張卡選一張進入回憶，標記 lost', () => {
    const s = t.run({ mode: 'rounds', seed: 104, bg: 'copywriter' });
    s.floor = 3;
    s.water = 3.1;
    F.tick(s);
    assert.equal(s.floodRun, 1);

    s.night = 2;
    s.water = 3.3;
    const cardsBefore = s.cards.length;
    F.tick(s);
    assert.equal(s.floodRun, 2);
    assert.equal(s.flood, 'medium');
    assert.ok(Array.isArray(s.floodPick));
    assert.equal(s.floodPick.length, 3);
    assert.equal(new Set(s.floodPick).size, 3);

    // s.floodPick 有值時不可以選生活卡，也不可以進入夜晚
    const of = RD.offer(s);
    const enabledId = of.ids.find((id) => RD.cardInfo(s, id).enabled);
    assert.equal(RD.choose(s, enabledId), null);
    assert.equal(RD.skipDay(s), null);
    assert.equal(RD.afterDay(s).ok, false);

    const targetUid = s.floodPick[1];
    const targetCard = s.cards.find((c) => c.uid === targetUid);
    const res = F.pick(s, targetUid);
    assert.equal(res.ok, true);
    assert.equal(s.floodPick, null);
    assert.equal(s.cards.length, cardsBefore - 1);
    assert.equal(s.memory.length, 1);
    assert.equal(s.memory[0].uid, targetUid);
    assert.equal(s.memory[0].lost, 'flood');
    assert.equal(s.memory[0].lostNight, 2);
    assert.equal(res.msg, D.FLOOD_TEXT.mediumDone.replace('{x}', targetCard.name));

    // autoPick：放下三張之中價值最低的一張
    const s2 = t.run({ mode: 'rounds', seed: 105, bg: 'copywriter' });
    s2.floor = 3;
    s2.water = 3.2;
    s2.floodRun = 1;
    F.tick(s2);
    assert.equal(s2.floodPick.length, 3);
    const cands = s2.floodPick.map((u) => s2.cards.find((c) => c.uid === u));
    cands[0].star = 5; cands[0].value = 40;
    cands[1].star = 1; cands[1].value = 10;
    cands[2].star = 3; cands[2].value = 25;
    const autoCard = F.autoPick(s2);
    assert.equal(autoCard.uid, cands[1].uid);
    assert.equal(s2.floodPick, null);
    assert.equal(autoCard.lost, 'flood');
  });

  t.test('水位：連續第三晚是重，住到天橋下，失去一件物件，素材庫上限減少', () => {
    const s = t.run({ mode: 'rounds', seed: 106, bg: 'copywriter' });
    const startObj = s.objects[0];
    const extraObj = D.OBJECTS.find((o) => !o.start && o.id !== startObj).id;
    s.objects.push(extraObj);
    const baseMax = F.deckMax(s);

    s.floor = 3;
    s.water = 3.1;
    F.tick(s); // 第 1 晚：light
    F.tick(s); // 第 2 晚：medium
    F.autoPick(s);
    const rep3 = F.tick(s); // 第 3 晚：heavy

    assert.equal(s.flood, 'heavy');
    assert.equal(s.floor, 0);
    assert.ok(s.objects.includes(startObj), '起始物件不會失去');
    assert.equal(s.objects.includes(extraObj), false, '非起始物件被水沖走');
    assert.ok(s.floodOut && s.floodOut.obj === D.OBJ[extraObj].name);
    assert.ok(rep3.lines.some((l) => l.text === D.FLOOD_TEXT.heavy));
    assert.ok(rep3.lines.some((l) => l.text === D.FLOOD_TEXT.heavyObj.replace('{x}', D.OBJ[extraObj].name)));
    assert.equal(F.deckMax(s), baseMax - D.ECON16.homelessDeck);

    // 住天橋下之後每晚身體減少 homelessBody，不算淹水
    const bodyBeforeBridge = s.body;
    F.tick(s);
    assert.equal(s.flood, 'dry');
    assert.equal(s.floodRun, 0);
    assert.equal(s.body, bodyBeforeBridge - D.ECON16.homelessBody);
  });

  t.test('水位：遺物不會被水帶走', () => {
    const s = t.run({ mode: 'rounds', seed: 107, bg: 'copywriter' });
    s.cards.forEach((c) => { c.relic = true; });
    s.floor = 3;
    s.water = 3.2;
    s.floodRun = 1;
    F.tick(s);
    assert.equal(s.flood, 'medium');
    assert.equal(s.floodPick, null);

    // 只有兩張不是遺物時，只列出那兩張
    s.cards[0].relic = false;
    s.cards[1].relic = false;
    s.floodRun = 1;
    F.tick(s);
    assert.deepEqual(s.floodPick, [s.cards[0].uid, s.cards[1].uid]);
  });

  t.test('水位：抽水泵令階段推遲一級', () => {
    const s = t.run({ mode: 'rounds', seed: 108, bg: 'copywriter' });
    s.floor = 3;
    s.water = 3.2;
    s.decor = { pump: 1 };
    const body0 = s.body;
    const spark0 = s.spark;

    // 第 1 晚淹水：輕 → 沒有後果（dry）
    const r1 = F.tick(s);
    assert.equal(s.floodRun, 1);
    assert.equal(s.flood, 'dry');
    assert.equal(s.body, body0);
    assert.equal(s.spark, spark0);
    assert.ok(r1.lines.some((l) => l.text === D.FLOOD_TEXT.pump));

    // 第 2 晚淹水：中 → 輕（light）
    F.tick(s);
    assert.equal(s.floodRun, 2);
    assert.equal(s.flood, 'light');
    assert.equal(s.floodPick, null);
    assert.equal(s.body, body0 - D.ECON16.floodBody);

    // 第 3 晚淹水：重 → 中（medium），不會失去住所
    F.tick(s);
    assert.equal(s.floodRun, 3);
    assert.equal(s.flood, 'medium');
    assert.equal(s.floor, 3);
    assert.ok(Array.isArray(s.floodPick) && s.floodPick.length === 3);
  });

  t.test('水位：搬上一層之後 floodRun 歸零，價錢按樓層計', () => {
    const s = t.run({ mode: 'rounds', seed: 109, bg: 'copywriter' });
    s.floor = 3;
    s.water = 3.2;
    s.floodRun = 2;
    s.cr = 700;

    const srvs1 = F.services(s);
    assert.equal(srvs1.length, 1);
    assert.equal(srvs1[0].id, 'moveup');
    const wantCost4 = D.ECON16.moveBase + D.ECON16.moveStep * 4;
    assert.equal(srvs1[0].cost, wantCost4);
    assert.equal(srvs1[0].affordable, true);

    const b1 = F.buy(s, 'moveup');
    assert.equal(b1.ok, true);
    assert.equal(s.floor, 4);
    assert.equal(s.floodRun, 0);
    assert.equal(s.cr, 700 - wantCost4);
    assert.equal(b1.msg, D.FLOOD_TEXT.moveup.replace('{f}', '4'));

    const srvs2 = F.services(s);
    const wantCost5 = D.ECON16.moveBase + D.ECON16.moveStep * 5;
    assert.equal(srvs2[0].cost, wantCost5);

    // 最高 8 樓
    s.floor = 8;
    assert.deepEqual(F.services(s), []);
    assert.equal(F.buy(s, 'moveup').ok, false);
  });

  t.test('水位：住天橋下可以租回一個單位', () => {
    const s = t.run({ mode: 'rounds', seed: 110, bg: 'copywriter' });
    s.floor = 3;
    assert.equal(F.services(s).some((x) => x.id === 'rehouse'), false);

    s.floor = 0;
    s.water = 3.7;
    s.cr = 400;
    const homelessMax = F.deckMax(s);

    const srvs = F.services(s);
    assert.equal(srvs.length, 1);
    assert.equal(srvs[0].id, 'rehouse');
    assert.equal(srvs[0].cost, D.ECON16.rehouse);
    assert.equal(srvs[0].floor, 5);

    const res = F.buy(s, 'rehouse');
    assert.equal(res.ok, true);
    assert.equal(s.floor, 5);
    assert.equal(s.cr, 400 - D.ECON16.rehouse);
    assert.equal(res.msg, D.FLOOD_TEXT.rehouse.replace('{f}', '5'));
    assert.equal(F.deckMax(s), homelessMax + D.ECON16.homelessDeck);
  });

  t.test('水位：舊模式不受影響', () => {
    const s = t.run({ mode: 'standard', seed: 111, bg: 'copywriter' });
    s.floor = 3;
    s.water = 3.5;
    const body0 = s.body;
    assert.equal(F.on(s), false);
    assert.equal(F.stage(s), 'dry');
    assert.equal(F.tick(s), null);
    assert.deepEqual(F.services(s), []);
    assert.equal(F.buy(s, 'moveup').ok, false);
    assert.equal(s.body, body0);
    assert.equal(s.flood, undefined);
    assert.equal(s.floodRun, undefined);
  });

  t.test('資料：D.FLOOD_TEXT 和總規格逐字相同', () => {
    assert.deepEqual(D.FLOOD_TEXT, {
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
    });
    assert.equal(D.CARD_TEXT.lostFlood, '第 {n} 晚，水帶走的。');
    assert.ok(Array.isArray(D.SERVICES16) && D.SERVICES16.length === 2);
  });
};
