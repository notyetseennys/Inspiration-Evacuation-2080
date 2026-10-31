// 第十五期（WO-15-03）：夜晚的規則（目標、收工、獎金、失敗）單元測試。
'use strict';

module.exports = (t) => {
  const { IE, D, C, S, assert } = t;
  const Rounds = IE.Rounds;

  t.test('夜晚：創作桌的數目', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter' });
    s.objects = [];
    // s.phase 不是 'night' 時 startNight 回傳 null
    assert.equal(Rounds.startNight(s), null);

    s.phase = 'night';
    const cr0 = s.cr;
    const body0 = s.body;
    const ses = Rounds.startNight(s);
    assert.ok(ses);
    assert.equal(ses.handSize, D.ECON.hand);
    assert.equal(ses.plays, D.ECON.plays);
    assert.equal(ses.discards, D.ECON.discards);
    assert.equal(s.cr, cr0);
    assert.equal(s.body, body0);
    assert.equal(ses.stage.target, Rounds.target(s, 1));
  });

  t.test('夜晚：外星評審有規則', () => {
    const s = t.run({ mode: 'rounds' });
    s.night = 3;
    s.day = 12;
    s.phase = 'night';
    Rounds.startNight(s);
    assert.ok(s.session.stage.rules.length >= 1);
  });

  t.test('夜晚：一筆就收工', () => {
    const s = t.run({ mode: 'rounds' });
    s.phase = 'night';
    Rounds.startNight(s);
    s.session.stage.target = 1;
    const cr0 = s.cr;
    const best = C.bestPlay(s);
    assert.ok(best && best.uids.length);
    C.play(s, best.uids);
    assert.equal(Rounds.cleared(s), true);
    const res = C.finish(s);
    const expectedReward = D.ECON.nightPay.small + D.ECON.earlyBonus * 3;
    assert.equal(s.cr, cr0 + expectedReward);
    assert.equal(s.phase, 'shop');
    assert.equal(s.nightLog.length, 1);
    assert.equal(s.nightLog[0].pass, true);
    assert.equal(s.nightLog[0].playsLeft, 3);
    assert.equal(res.stage.playsLeft, 3);
    assert.equal(res.stage.reward, expectedReward);
  });

  t.test('夜晚：失敗失去一次機會', () => {
    const s = t.run({ mode: 'rounds' });
    s.phase = 'night';
    Rounds.startNight(s);
    s.session.stage.target = 1e15;
    while (s.session.plays > 0) {
      const best = C.bestPlay(s);
      if (!best) break;
      C.play(s, best.uids);
    }
    assert.equal(Rounds.cleared(s), false);
    C.finish(s);
    assert.equal(s.chances, 2);
    assert.deepEqual(s.lost, ['night']);
    assert.equal(s.nightLog.length, 1);
    assert.equal(s.nightLog[0].pass, false);
    assert.equal(s.phase, 'shop');
  });

  t.test('夜晚：三次失敗就結局', () => {
    const s = t.run({ mode: 'rounds' });
    s.chances = 1;
    s.phase = 'night';
    Rounds.startNight(s);
    s.session.stage.target = 1e15;
    while (s.session.plays > 0) {
      const best = C.bestPlay(s);
      if (!best) break;
      C.play(s, best.uids);
    }
    C.finish(s);
    assert.equal(s.chances, 0);
    assert.ok(s.ended);
    assert.equal(s.ended.type, 'archived');
    assert.equal(s.phase, 'ended');
  });

  t.test('夜晚：超額兩倍火花上升', () => {
    const s = t.run({ mode: 'rounds' });
    s.spark = 2;
    s.phase = 'night';
    Rounds.startNight(s);
    s.session.stage.target = 1;
    const best = C.bestPlay(s);
    C.play(s, best.uids);
    C.finish(s);
    assert.ok(s.spark > 2);
  });

  t.test('夜晚：獎金隨輪數上升', () => {
    const s = t.run({ mode: 'rounds' });
    s.night = 1;
    assert.equal(Rounds.nightReward(s, 'boss', 0), 140);
    s.night = 15;
    assert.equal(Rounds.nightReward(s, 'boss', 0), 280);
  });

  t.test('夜晚：舊模式不變', () => {
    const s = t.run({ mode: 'standard' });
    assert.equal(S.stageOn(s, 4).target, 9000);
    const sFirst = t.run({ mode: 'standard', meta: { runs: 0 } });
    assert.equal(S.stageOn(sFirst, 4).target, 5000);
  });
};
