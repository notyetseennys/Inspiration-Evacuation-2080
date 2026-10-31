// 第十五期（WO-15-05）：五輪模式整局自動玩與二十個角色相容性單元測試。
'use strict';

module.exports = (t) => {
  const { IE, D, C, assert } = t;
  const Rounds = IE.Rounds;

  function playDay(s) {
    const of = Rounds.offer(s);
    const enabledId = of.ids.find((id) => Rounds.cardInfo(s, id).enabled);
    if (!enabledId) {
      Rounds.skipDay(s);
      return;
    }
    const res = Rounds.choose(s, enabledId);
    if (res && res.micro) {
      IE.Auto.apply(s, res.micro);
      Rounds.afterDay(s);
    } else if (res && res.trip) {
      Rounds.tripPick(s, 0);
      Rounds.tripPick(s, 1);
    }
  }

  function playNight(s) {
    Rounds.startNight(s);
    while (s.session && s.session.plays > 0) {
      const best = C.bestPlay(s);
      if (!best || !best.uids || !best.uids.length) break;
      C.play(s, best.uids);
      if (Rounds.cleared(s)) break;
    }
    C.finish(s);
  }

  function autoRun(seed, bg) {
    const s = t.run({ mode: 'rounds', seed, bg: bg || 'copywriter' });
    let steps = 0;
    while (!s.ended) {
      steps++;
      if (steps > 200) assert.fail('迴圈超過 200 次（phase=' + s.phase + ', night=' + s.night + '）');
      if (s.phase === 'day') {
        playDay(s);
      } else if (s.phase === 'night') {
        playNight(s);
      } else if (s.phase === 'shop') {
        Rounds.shopOpen(s);
        Rounds.leaveShop(s);
      } else if (s.phase === 'review') {
        Rounds.review(s);
      } else {
        assert.fail('未知的 phase：' + s.phase);
      }
    }
    return s;
  }

  t.test('整局：三個 seed 都可以玩到結局', () => {
    [1, 2, 3].forEach((seed) => {
      const s = autoRun(seed, 'copywriter');
      assert.ok(s.ended);
      assert.equal(s.phase, 'ended');
      assert.ok(s.nightLog.length >= 1 && s.nightLog.length <= 15);
    });
  });

  t.test('整局：二十個角色都可以開局和玩一晚', () => {
    const bgs = Object.keys(D.BACKGROUNDS);
    assert.equal(bgs.length, 20);
    bgs.forEach((bg) => {
      const s = t.run({ mode: 'rounds', seed: 1, bg });
      const body0 = s.body;
      assert.equal(s.phase, 'day');
      t.R.morning(s);
      assert.equal(s.body, body0);
      playDay(s);
      assert.equal(s.phase, 'night');
      playNight(s);
      assert.equal(s.phase, 'shop');
      const sh = Rounds.shopOpen(s);
      assert.ok(sh);
      const l = Rounds.leaveShop(s);
      assert.equal(l.ok, true);
      assert.equal(s.night, 2);
      assert.equal(s.phase, 'day');
      assert.equal(s.body, body0);
    });
  });
};
