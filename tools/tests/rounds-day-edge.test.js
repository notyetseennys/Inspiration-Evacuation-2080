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

  // WO-15-06 審核時補充（Claude）
  t.test('五輪：開局時選好五個外星評審之夜的規則，之後讀取不會動到隨機數', () => {
    const s = t.run({ mode: 'rounds' });
    assert.deepEqual(Object.keys(s.bosses).sort(), ['0', '1', '2', '3', '4']);
    const r0 = s.rngState;
    s.night = 3; s.day = 12;
    const stg = IE.Stages.today(s);
    assert.equal(stg.kind, 'boss');
    assert.ok(stg.rules.length >= 1);
    assert.equal(s.rngState, r0);
  });

  t.test('白天：出國的報告跟着存檔，選到一半重新載入仍然完整', () => {
    const s0 = t.run({ mode: 'rounds', seed: 5 });
    s0.night = 4; s0.day = 16; s0.cr = 500; s0.spark = 2;
    Q.offer(s0);
    s0.offer.ids = ['label', 'dive', 'trip:asia'];
    assert.deepEqual(Q.choose(s0, 'trip:asia'), { trip: true });
    const cost = Math.round(t.D.ECON.tripCost * IE.Meta.stakeMod(s0, 'prices'));
    assert.equal(s0.cr, 500 - cost);
    assert.equal(s0.trip5.rep.deltas.cr, -cost);
    assert.ok(s0.trip5.rep.deltas.spark > 0);
    assert.equal(s0.trip5.rep.deltas.spark, Math.round((s0.spark - 2) * 10) / 10);
    const first = Q.tripPick(s0, 0);
    assert.equal(first.rep, undefined, '只選了一張時沒有報告');
    const s = JSON.parse(JSON.stringify(s0)); // 存檔再載入
    const last = Q.tripPick(s, 3);
    assert.ok(last.rep, '選滿兩張時回傳報告');
    assert.deepEqual(last.rep.cards.map((c) => c.id), [s0.trip5.ids[0], s0.trip5.ids[3]]);
    assert.equal(last.rep.deltas.cr, -cost);
    assert.equal(s.trip5, null);
    assert.equal(s.phase, 'night');
  });
};
