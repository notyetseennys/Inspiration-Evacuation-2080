// 第十五期（WO-15-01）：五輪模式的資料、狀態與時間表單元測試。
'use strict';

module.exports = (t) => {
  const { IE, D, R, S, assert } = t;
  const Rounds = IE.Rounds;

  t.test('五輪：開局狀態', () => {
    const s = t.run({ mode: 'rounds' });
    assert.equal(s.mode, 'rounds');
    assert.equal(s.night, 1);
    assert.equal(s.phase, 'day');
    assert.equal(s.day, 4);
    assert.equal(s.v, 10);
    assert.equal(s.chances, 3);
    assert.deepEqual(s.nightLog, []);
    assert.deepEqual(s.roundLog, []);
    assert.deepEqual(s.lost, []);
    assert.equal(Rounds.on(s), true);
  });

  t.test('五輪：舊模式不受影響', () => {
    const s = t.run({ mode: 'standard' });
    assert.equal(s.night, undefined);
    assert.equal(s.day, 1);
    assert.equal(Rounds.on(s), false);
  });

  t.test('五輪：時間表', () => {
    const s = t.run({ mode: 'rounds' });
    const nights = Array.from({ length: 15 }, (_, i) => i + 1);
    assert.deepEqual(
      nights.map((k) => Rounds.kindOf(k)),
      [
        'small', 'big', 'boss',
        'small', 'big', 'boss',
        'small', 'big', 'boss',
        'small', 'big', 'boss',
        'small', 'big', 'boss',
      ]
    );
    assert.equal(Rounds.roundOf(s, 4), 2);
    assert.equal(Rounds.roundOf(s, 15), 5);
    assert.equal(Rounds.dayOfNight(15), 60);
  });

  t.test('五輪：目標每晚上升', () => {
    const s = t.run({ mode: 'rounds' });
    assert.equal(Rounds.target(s, 1), Rounds.sig3(D.ECON.t1));
    for (let k = 1; k <= 14; k++) {
      assert.equal(Rounds.target(s, k), Rounds.sig3(D.ECON.t1 * Math.pow(D.ECON.growth, k - 1)));
      const ratio = Rounds.target(s, k + 1) / Rounds.target(s, k);
      assert.ok(Math.abs(ratio - D.ECON.growth) <= D.ECON.growth * 0.015, '第 ' + k + ' 晚增長率誤差超過 1.5%');
    }
  });

  t.test('五輪：第一局頭兩晚較易', () => {
    const s = t.run({ mode: 'rounds', meta: { runs: 0 } });
    assert.equal(Rounds.target(s, 1), Rounds.sig3(D.ECON.t1 * D.ECON.firstRunEase));
    assert.equal(Rounds.target(s, 2), Rounds.sig3(D.ECON.t1 * D.ECON.growth * D.ECON.firstRunEase));
    assert.equal(Rounds.target(s, 3), Rounds.sig3(D.ECON.t1 * Math.pow(D.ECON.growth, 2)));
  });

  t.test('五輪：外星評審之夜', () => {
    const s = t.run({ mode: 'rounds' });
    s.day = 12;
    const st = S.stageOn(s, 12);
    assert.ok(st);
    assert.equal(st.kind, 'boss');
    assert.ok(Array.isArray(st.rules) && st.rules.length >= 1);
  });

  t.test('五輪：身體不變、火花有下限', () => {
    const s = t.run({ mode: 'rounds' });
    const body0 = s.body;
    assert.equal(R.hurt(s, 50, 'test'), 0);
    assert.equal(s.body, body0);
    R.heal(s, 20);
    assert.equal(s.body, body0);
    R.addSpark(s, -10, true);
    assert.equal(s.spark, D.ECON.sparkFloor);

    const std = t.run({ mode: 'standard' });
    const stdBody0 = std.body;
    R.hurt(std, 50, 'test');
    assert.ok(std.body < stdBody0);
  });

  t.test('五輪：租金', () => {
    const s = t.run({ mode: 'rounds', stake: 1, bg: 'copywriter' });
    assert.equal(Rounds.rentOf(s, 1), D.ECON.rent[0]);
    assert.equal(Rounds.rentOf(s, 5), D.ECON.rent[4]);
  });

  t.test('五輪：舊模式的隨機數不變', () => {
    const s = R.newRun({ bg: 'copywriter', season: 'storm', mode: 'standard', seed: 12345 });
    assert.equal(s.rngState, -63928852);
  });
};
