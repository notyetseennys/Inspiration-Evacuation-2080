// 第十七期：後段的引擎（訊號上限、名作）。由 Claude 維護。
module.exports = (t) => {
  const { IE, D, R, C, S, assert } = t;
  if (!IE.Cards) require('../../game/js/cards.js');
  const Rounds = IE.Rounds;
  const mkReview = (round, opts) => {
    const s = t.run(Object.assign({ mode: 'rounds' }, opts || {}));
    s.night = round * 3;
    s.day = Rounds.dayOfNight(round * 3);
    s.phase = 'review';
    s.soul = 10;
    s.cr = 5000;
    return s;
  };

  t.test('後段的引擎：通過篩選，火花上限 +0.5，並得到 +0.5 火花', () => {
    const s = mkReview(1);
    const capBefore = R.sparkMax(s);
    s.spark = 2;
    const rep = Rounds.review(s);
    assert.equal(rep.passed, true);
    assert.equal(s.sparkCapBonus, D.ECON.sparkCapStep);
    assert.equal(R.sparkMax(s), Math.round((capBefore + D.ECON.sparkCapStep) * 10) / 10);
    assert.ok(s.spark >= 2 + D.ECON.sparkCapStep - 0.01, '火花 ' + s.spark);
    assert.ok(rep.sparkCap && rep.sparkCap.includes('訊號上限'), '報告有 sparkCap 一句');
    assert.ok(!rep.lines.some((l) => l.includes('訊號上限')), '不放進 lines（lines[2] 是收藏的那一句）');
  });

  t.test('後段的引擎：篩選不通過、最後一輪、經典模式都不提高上限', () => {
    const fail = mkReview(1);
    fail.cr = 0;
    Rounds.review(fail);
    assert.ok(!fail.sparkCapBonus);
    const last = mkReview(Rounds.total(t.run({ mode: 'rounds' })));
    Rounds.review(last);
    assert.ok(!last.sparkCapBonus, '最後一輪之後沒有下一輪');
    const classic = t.run({ mode: 'standard' });
    classic.sparkCapBonus = 2;
    assert.equal(R.sparkMax(classic), R.sparkMax(Object.assign({}, classic, { sparkCapBonus: 0 })));
  });

  t.test('後段的引擎：五輪模式的火花可以超過 4，經典模式仍然以 4 為上限', () => {
    const s = t.run({ mode: 'rounds' });
    s.conscience = 1;
    s.sparkCapBonus = 1.5;
    s.spark = 3.9;
    for (let i = 0; i < 20; i++) R.addSpark(s, 0.5, true);
    assert.ok(s.spark > 4 && s.spark <= R.sparkMax(s), '五輪模式火花 ' + s.spark);
    const c = t.run({ mode: 'standard' });
    c.conscience = 1;
    c.spark = 3.9;
    for (let i = 0; i < 20; i++) R.addSpark(c, 0.5, true);
    assert.ok(c.spark <= R.SPARK_MAX);
  });

  // 開一晚、照順序下三筆，最後以指定的分數結算
  const nightWith = (scoreX) => {
    const s = t.run({ mode: 'rounds', seed: 9 });
    const ses = C.start(s, 'normal');
    for (let i = 0; i < 3 && ses.plays > 0 && ses.hand.length; i++) {
      const bp = C.bestPlay(s);
      if (!bp || !bp.uids.length) break;
      C.play(s, bp.uids);
    }
    ses.stage.target = Math.max(1, Math.round(ses.total / scoreX));
    ses.passed = ses.total >= ses.stage.target;
    const best = ses.log.reduce((a, x) => (x.total > a.total ? x : a), ses.log[0]);
    const stars = best.uids.map((u) => C.starOf(s.cards.find((c) => c.uid === u)));
    const res = S.settle(s, ses, ses.plays);
    return { s, ses, best, stars, res };
  };

  t.test('後段的引擎：一晚達到目標的 2 倍是名作，最好的一筆的素材各升一星（最多 ★5）', () => {
    const { s, best, stars, res } = nightWith(2.5);
    assert.ok(res.pass && res.over, '應該達標而且超額');
    assert.ok(Array.isArray(best.uids) && best.uids.length > 0, '一筆的記錄要有素材');
    best.uids.forEach((u, i) => {
      const c = s.cards.find((x) => x.uid === u);
      assert.equal(C.starOf(c), Math.min(5, stars[i] + D.ECON.masterStar));
    });
    if (stars.some((x) => x < 5)) {
      assert.ok(res.lines.some((l) => l.includes('名作')));
      assert.equal(s.stats.masterworks, 1);
    }
  });

  t.test('後段的引擎：未達目標的 2 倍沒有名作', () => {
    const { s, best, stars, res } = nightWith(1.5);
    assert.ok(res.pass && !res.over);
    best.uids.forEach((u, i) => assert.equal(C.starOf(s.cards.find((x) => x.uid === u)), stars[i]));
    assert.ok(!s.stats.masterworks);
  });
};
