// 第十五期（WO-15-05）：篩選日與日子推進單元測試。
'use strict';

module.exports = (t) => {
  const { IE, D, assert } = t;
  const Rounds = IE.Rounds;

  const mkReview = (opts) => {
    const s = t.run(Object.assign({ mode: 'rounds' }, opts || {}));
    s.night = 3;
    s.day = 12;
    s.phase = 'review';
    s.soul = 10;
    return s;
  };

  t.test('篩選日：交租通過', () => {
    const s = mkReview();
    s.cr = 500;
    const rent = Rounds.rentOf(s, 1);
    const rep = Rounds.review(s);
    assert.ok(rep);
    assert.equal(rep.paid, true);
    assert.equal(rep.passed, true);
    assert.equal(s.cr, 500 - rent);
    assert.equal(s.reviewsPassed, 1);
    assert.equal(s.runTickets.gold, 1);
    assert.equal(s.night, 4);
    assert.equal(s.day, 16);
    assert.equal(s.phase, 'day');
  });

  t.test('篩選日：交不起租', () => {
    const s = mkReview();
    s.cr = 50;
    const rep = Rounds.review(s);
    assert.equal(rep.paid, false);
    assert.equal(s.cr, 0);
    assert.equal(s.chances, 2);
    assert.equal(s.lost.includes('rent'), true);
    assert.equal(s.reviewsPassed || 0, 0);
  });

  t.test('篩選日：靈魂太重', () => {
    const s = mkReview();
    s.soul = 22;
    s.cr = 500;
    const rent = Rounds.rentOf(s, 1);
    const rep = Rounds.review(s);
    assert.equal(rep.paid, true);
    assert.equal(s.cr, 500 - rent);
    assert.equal(s.chances, 2);
    assert.deepEqual(s.lost, ['soul']);
    assert.deepEqual(rep.lost, ['soul']);
  });

  t.test('篩選日：兩項都失敗', () => {
    const s = mkReview();
    s.soul = 22;
    s.cr = 0;
    const rep = Rounds.review(s);
    assert.equal(s.chances, 1);
    assert.deepEqual(rep.lost, ['rent', 'soul']);
  });

  t.test('篩選日：最後一次機會因靈魂用完', () => {
    const s = mkReview();
    s.chances = 1;
    s.cr = 500;
    s.soul = 22;
    Rounds.review(s);
    assert.ok(s.ended);
    assert.equal(s.ended.type, 'heavy');
    assert.equal(s.phase, 'ended');
  });

  t.test('篩選日：第五輪通過', () => {
    const s = mkReview();
    s.night = 15;
    s.day = 60;
    s.cr = 1000;
    Rounds.review(s);
    assert.ok(s.ended);
    assert.equal(s.ended.type, 'recruited');
    assert.equal(s.phase, 'ended');
  });

  t.test('推進：AI 記憶消退四次、磨損減一', () => {
    const s = t.run({ mode: 'rounds' });
    s.style = { mix: 10 };
    s.cards[0].wear = 3;
    s.cards[1].wear = 0;
    Rounds.advance(s);
    const expected = Math.round(10 * Math.pow(0.6, 4) * 100) / 100;
    assert.equal(s.style.mix, expected);
    assert.equal(s.cards[0].wear, 2);
    assert.equal(s.cards[1].wear, 0);
  });

  t.test('推進：水位和季節', () => {
    const s = t.run({ mode: 'rounds', season: 'storm' });
    s.night = 5;
    s.day = 20;
    const water0 = s.water;
    const season0 = s.season;
    const addWater = D.SEASONS[season0].water * 4;
    Rounds.advance(s);
    assert.equal(s.day, 24);
    const nextIdx = (D.SEASON_ORDER.indexOf(season0) + 1) % D.SEASON_ORDER.length;
    assert.equal(s.season, D.SEASON_ORDER[nextIdx]);
    assert.ok(Math.abs(s.water - (water0 + addWater)) < 1e-9);
  });

  t.test('推進：過期的世界事件移除', () => {
    const s = t.run({ mode: 'rounds' });
    s.night = 4;
    s.day = 16;
    s.events = [{ id: 'heatwave', until: 18 }, { id: 'typhoon', until: 22 }];
    Rounds.advance(s);
    assert.equal(s.day, 20);
    assert.equal(s.events.some((e) => e.until === 18), false);
    assert.equal(s.events.some((e) => e.until === 22), true);
  });
};
