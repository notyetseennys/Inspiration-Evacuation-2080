// WO-15-02 審核時補充的邊界測試（Claude）
module.exports = (t) => {
  const { IE, R, assert } = t;
  const Q = IE.Rounds;

  t.test('白天：全部工作停工時仍然出三張不同的卡', () => {
    const s = t.run({ mode: 'rounds' });
    const wc = R.worldClosed;
    R.worldClosed = (st, id) => (['label', 'delivery', 'clinic', 'salvage', 'haggle', 'farm', 'smile'].includes(id) ? '停工' : wc(st, id));
    try {
      for (let i = 0; i < 30; i++) {
        s.offer = null;
        const ids = Q.offer(s).ids;
        assert.equal(ids.length, 3);
        assert.equal(new Set(ids).size, 3);
        ids.forEach((id) => assert.ok(id && Q.cardInfo(s, id).enabled !== undefined));
      }
    } finally {
      R.worldClosed = wc;
    }
  });

  t.test('白天：不是白天時不可以睡懶覺', () => {
    const s = t.run({ mode: 'rounds' });
    s.phase = 'night';
    s.spark = 2;
    assert.equal(Q.skipDay(s), null);
    assert.equal(s.spark, 2);
  });

  t.test('白天：出國選了無效的卡不會加入素材', () => {
    const s = t.run({ mode: 'rounds', seed: 5 });
    s.night = 4; s.day = 16; s.cr = 500;
    Q.offer(s);
    s.offer.ids = ['label', 'dive', 'trip:asia'];
    Q.choose(s, 'trip:asia');
    const n0 = s.cards.length;
    assert.equal(Q.tripPick(s, 99), null);
    assert.equal(Q.tripPick(s, -1), null);
    Q.tripPick(s, 0);
    assert.equal(Q.tripPick(s, 0), null, '同一張不可以選兩次');
    assert.equal(s.cards.length, n0 + 1);
    assert.equal(s.phase, 'day');
  });

  t.test('白天：介面查詢不會消耗局內的隨機數', () => {
    const s = t.run({ mode: 'rounds' });
    Q.offer(s);
    const r0 = s.rngState;
    for (let i = 0; i < 20; i++) { Q.cardList(s); s.offer.ids.forEach((id) => Q.cardInfo(s, id)); Q.offerCost(s); }
    assert.equal(s.rngState, r0);
  });
};
