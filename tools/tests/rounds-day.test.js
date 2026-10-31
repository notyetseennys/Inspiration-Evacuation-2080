// 第十五期（WO-15-02）：白天生活卡的出牌、重抽、選卡與套用規則測試。
'use strict';

module.exports = (t) => {
  const { IE, D, R, assert } = t;
  const Rounds = IE.Rounds;

  t.test('白天：三張不同的卡', () => {
    const s = t.run({ mode: 'rounds' });
    const of = Rounds.offer(s);
    assert.equal(of.ids.length, 3);
    assert.equal(new Set(of.ids).size, 3);
    const c1 = Rounds.cardInfo(s, of.ids[0]);
    const c2 = Rounds.cardInfo(s, of.ids[1]);
    assert.ok(c1.kind === 'work' || c1.kind === 'shady');
    assert.ok(c2.kind === 'life' || c2.kind === 'friend');
    of.ids.forEach((id) => {
      const info = Rounds.cardInfo(s, id);
      assert.equal(info.fx.some(([k]) => k === 'body'), false);
    });
  });

  t.test('白天：同一晚出牌不變', () => {
    const s = t.run({ mode: 'rounds' });
    const ids1 = Rounds.offer(s).ids.slice();
    const ids2 = Rounds.offer(s).ids.slice();
    assert.deepEqual(ids1, ids2);
  });

  t.test('白天：同一個 seed 出牌相同', () => {
    const s1 = t.run({ mode: 'rounds', seed: 777 });
    const s2 = t.run({ mode: 'rounds', seed: 777 });
    assert.deepEqual(Rounds.offer(s1), Rounds.offer(s2));
  });

  t.test('白天：換一批要錢', () => {
    const s = t.run({ mode: 'rounds' });
    Rounds.offer(s);
    s.cr = 100;
    const r1 = Rounds.rerollOffer(s);
    assert.equal(r1.ok, true);
    assert.equal(s.cr, 100 - D.ECON.offerReroll[0]);

    s.cr = 0;
    const beforeIds = s.offer.ids.slice();
    const r2 = Rounds.rerollOffer(s);
    assert.equal(r2.ok, false);
    assert.equal(s.cr, 0);
    assert.deepEqual(s.offer.ids, beforeIds);
  });

  t.test('白天：第一輪沒有出國', () => {
    const s = t.run({ mode: 'rounds' });
    for (let night = 1; night <= 3; night++) {
      s.night = night;
      s.day = 4 * night;
      s.offer = null;
      Rounds.offer(s);
      for (let i = 0; i < 50; i++) {
        assert.equal(s.offer.ids.some((id) => id.startsWith('trip:')), false);
        s.cr = 9999;
        Rounds.rerollOffer(s);
      }
    }
  });

  t.test('白天：被 AI 取代的工作不出現', () => {
    const s = t.run({ mode: 'rounds' });
    s.removed.label = true;
    Rounds.offer(s);
    for (let i = 0; i < 50; i++) {
      assert.equal(s.offer.ids.includes('label'), false);
      s.cr = 9999;
      Rounds.rerollOffer(s);
    }
  });

  t.test('白天：朋友卡必定教技法', () => {
    const s = t.run({ mode: 'rounds' });
    Rounds.offer(s);
    s.offer.ids = ['label', 'friend:ho', 'volunteer'];
    const cr0 = s.cr;
    const cost = R.chatCost(s);
    Rounds.choose(s, 'friend:ho');
    assert.equal(s.forms.mono, 2);
    assert.equal(s.cr, cr0 - cost);
    assert.equal(s.phase, 'night');
  });

  t.test('白天：義工令靈魂變輕', () => {
    const s = t.run({ mode: 'rounds' });
    Rounds.offer(s);
    s.offer.ids = ['label', 'dive', 'volunteer'];
    const soul0 = s.soul;
    Rounds.choose(s, 'volunteer');
    assert.ok(s.soul < soul0);
    assert.equal(s.phase, 'night');
  });

  t.test('白天：小遊戲卡交給介面', () => {
    const s = t.run({ mode: 'rounds' });
    Rounds.offer(s);
    s.offer.ids = ['label', 'dive', 'volunteer'];
    const cr0 = s.cr;
    const body0 = s.body;
    const res = Rounds.choose(s, 'label');
    assert.deepEqual(res, { micro: 'label' });
    assert.equal(s.phase, 'day');
    IE.Auto.apply(s, 'label');
    Rounds.afterDay(s);
    assert.ok(s.cr > cr0);
    assert.equal(s.phase, 'night');
    assert.equal(s.body, body0);
  });

  t.test('白天：睡懶覺', () => {
    const s = t.run({ mode: 'rounds' });
    s.spark = 2;
    Rounds.skipDay(s);
    assert.ok(Math.abs(s.spark - (2 + D.ECON.skipSpark)) < 1e-9);
    assert.equal(s.phase, 'night');
  });

  t.test('白天：出國五選二', () => {
    const s = t.run({ mode: 'rounds' });
    s.night = 4;
    s.day = 16;
    s.cr = 500;
    Rounds.offer(s);
    s.offer.ids = ['label', 'dive', 'trip:asia'];
    const deck0 = s.cards.length;
    const res = Rounds.choose(s, 'trip:asia');
    assert.deepEqual(res, { trip: true });
    assert.ok(s.trip5);
    assert.equal(s.trip5.ids.length, 5);
    assert.equal(new Set(s.trip5.ids).size, 5);
    s.trip5.ids.forEach((id) => {
      assert.equal(D.CARDS[id].origin, 'asia');
      assert.notEqual(D.CARDS[id].rarity, 'legend');
    });
    Rounds.tripPick(s, 0);
    assert.equal(s.phase, 'day');
    Rounds.tripPick(s, 1);
    assert.equal(s.cards.length, deck0 + 2);
    assert.equal(s.trip5, null);
    assert.equal(s.phase, 'night');
  });
};
