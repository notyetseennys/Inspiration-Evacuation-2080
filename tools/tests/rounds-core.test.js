// 第十五期（WO-15-01）：五輪模式的資料、狀態與時間表單元測試。
'use strict';

module.exports = (t) => {
  const { IE, D, R, S, assert } = t;
  const Rounds = IE.Rounds;

  t.test('rounds mode registered and hidden', () => {
    assert.ok(D.MODES.rounds);
    assert.equal(D.MODES.rounds.rounds, true);
    assert.equal(D.MODES.rounds.hidden, true);
    assert.equal(D.MODES.rounds.days, 60);
    assert.equal(D.MODES.rounds.period, 12);
  });

  t.test('rounds data tables match spec', () => {
    assert.equal(D.DAYCARDS.length, 13);
    assert.equal(D.PACKS.length, 5);
    assert.equal(D.SERVICES.length, 3);
    assert.equal(D.ECON.rent.length, 5);
  });

  t.test('newRun(rounds) initializes state', () => {
    const s = R.newRun({ bg: 'copywriter', season: 'storm', mode: 'rounds', seed: 42 });
    assert.equal(s.v, 10);
    assert.equal(s.night, 1);
    assert.equal(s.phase, 'day');
    assert.equal(s.day, 4);
    assert.equal(s.slot, 0);
    assert.equal(s.chances, 3);
    assert.equal(s.offer, null);
    assert.equal(s.shop, null);
    assert.equal(s.pack, null);
    assert.equal(s.pick, null);
    assert.deepEqual(s.nightLog, []);
    assert.deepEqual(s.roundLog, []);
    assert.deepEqual(s.lost, []);
    assert.equal(Rounds.on(s), true);
  });

  t.test('roundOf / kindOf / dayOfNight map 15 nights', () => {
    const s = R.newRun({ bg: 'copywriter', season: 'storm', mode: 'rounds', seed: 42 });
    const nights = Array.from({ length: 15 }, (_, i) => i + 1);
    assert.deepEqual(
      nights.map((k) => Rounds.roundOf(s, k)),
      [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5]
    );
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
    const expectedDays = nights.map((k) => 4 * k);
    assert.deepEqual(
      nights.map((k) => Rounds.dayOfNight(k)),
      expectedDays
    );
    nights.forEach((k) => {
      const st = S.stageOn(s, Rounds.dayOfNight(k));
      assert.ok(st);
      assert.equal(st.kind, Rounds.kindOf(k));
    });
  });

  t.test('target curve matches spec', () => {
    const s = R.newRun({ bg: 'copywriter', season: 'storm', mode: 'rounds', seed: 42, stake: 1 });
    s.firstRun = false;
    assert.equal(Rounds.target(s, 1), 4000);
    assert.equal(Rounds.target(s, 3), 9000);
    assert.equal(Rounds.target(s, 6), 30400);
    assert.equal(Rounds.target(s, 15), 1170000);

    s.firstRun = true;
    assert.equal(Rounds.target(s, 1), 2600);
    assert.equal(Rounds.target(s, 2), 3900);
    assert.equal(Rounds.target(s, 3), 9000);
  });

  t.test('hurt is no-op and spark has floor in rounds mode', () => {
    const s = R.newRun({ bg: 'copywriter', season: 'storm', mode: 'rounds', seed: 42 });
    const beforeBody = s.body;
    const dmg = R.hurt(s, 50, 'test');
    assert.equal(dmg, 0);
    assert.equal(s.body, beforeBody);
    R.heal(s, 20);
    assert.equal(s.body, beforeBody);

    R.addSpark(s, -99, true);
    assert.equal(s.spark, 0.6);
  });

  t.test('rentOf uses ECON.rent table', () => {
    const s = R.newRun({ bg: 'copywriter', season: 'storm', mode: 'rounds', seed: 42, stake: 1 });
    const rents = [1, 2, 3, 4, 5].map((r) => Rounds.rentOf(s, r));
    assert.deepEqual(rents, [220, 340, 480, 640, 820]);
  });

  t.test('standard mode RNG unchanged', () => {
    const s = R.newRun({ bg: 'copywriter', season: 'storm', mode: 'standard', seed: 12345 });
    assert.equal(s.rngState, -63928852);
  });
};
