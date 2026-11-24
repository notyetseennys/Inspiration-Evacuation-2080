'use strict';
const path = require('path');

module.exports = (t) => {
  const { IE, D, C, assert, run, test } = t;
  if (!IE.Flood) require(path.join(__dirname, '../../game/js/flood.js'));
  if (!IE.NightScene) require(path.join(__dirname, '../../game/js/nightscene.js'));
  const NS = IE.NightScene;

  let seq = 9000;
  function mkCard(id, tags, star) {
    seq += 1;
    return {
      uid: 'dp_' + seq,
      id,
      name: id,
      tags: tags.slice(),
      star: star || 2,
      value: 24,
      rarity: 'common',
      origin: 'home',
      medium: 'paper',
      wear: 0,
      mod: null,
    };
  }

  function newRoundsState(seed) {
    const s = run({ mode: 'rounds', seed: seed || 42, bg: 'copywriter', season: 'storm' });
    s.phase = 'night';
    IE.Rounds.startNight(s);
    return s;
  }

  function addCards(s, list) {
    list.forEach((c) => {
      s.cards.push(c);
      if (s.session && Array.isArray(s.session.hand)) s.session.hand.push(c.uid);
    });
    return list.map((c) => c.uid);
  }

  test('創作桌畫面：四筆分別是天空和遠景、中景、碼頭、前景', () => {
    const s = newRoundsState(11);
    const cards = [
      mkCard('c_warmth', ['warmth']),
      mkCard('c_hope', ['hope']),
      mkCard('c_guilt', ['guilt']),
      mkCard('c_neon', ['neon']),
      mkCard('c_hunger', ['hunger']),
    ];
    const uids = addCards(s, cards);
    const res = C.scorePlay(s, uids);

    const p0 = NS.strokePlan(s, 0, res);
    const p1 = NS.strokePlan(s, 1, res);
    const p2 = NS.strokePlan(s, 2, res);
    const p3 = NS.strokePlan(s, 3, res);

    assert.equal(p0.length, 3);
    assert.match(p0[0], /^np-sky-/);
    assert.match(p0[1], /^np-far-/);
    assert.match(p0[2], /^np-far-/);

    assert.ok(p1.length >= 1 && p1.length <= 3);
    p1.forEach((nm) => assert.match(nm, /^np-mid-/));

    assert.ok(p2.length >= 2 && p2.length <= 4);
    assert.match(p2[0], /^np-stage-pier-/);
    p2.slice(1).forEach((nm) => assert.match(nm, /^np-(focal|duo)-/));

    assert.equal(p3.length, 1);
    assert.match(p3[0], /^np-front-/);
  });

  test('創作桌畫面：有轉的第一筆用第二張天空', () => {
    const s = newRoundsState(22);
    // warmth(0) -> hope(1) -> water(2)：一路相連，無「轉」（相對 d=5）
    const flowUids = addCards(s, [
      mkCard('f1', ['warmth']),
      mkCard('f2', ['hope']),
      mkCard('f3', ['water']),
    ]);
    const resNoZhuan = C.scorePlay(s, flowUids);
    const sky1 = NS.strokePlan(s, 0, resNoZhuan)[0];
    assert.match(sky1, /-1$/);

    // warmth(0) -> machine(5) -> guilt(6)：包含相對情緒（d=5），有「轉」
    const twistUids = addCards(s, [
      mkCard('z1', ['warmth']),
      mkCard('z2', ['machine']),
      mkCard('z3', ['guilt']),
    ]);
    const resZhuan = C.scorePlay(s, twistUids);
    const sky2 = NS.strokePlan(s, 0, resZhuan)[0];
    assert.match(sky2, /-2$/);
  });

  test('創作桌畫面：中景和碼頭用起、轉、合三張素材的圖', () => {
    const s = newRoundsState(33);
    // 5 張起承轉合：warmth(0)[起] -> hope(1)[承] -> guilt(6)[轉] -> anger(7)[承] -> hunger(9)[合]
    const cQi = mkCard('card_qi', ['warmth']);
    const cCheng1 = mkCard('card_cheng_a', ['hope']);
    const cZhuan = mkCard('card_zhuan', ['guilt']);
    const cCheng2 = mkCard('card_cheng_b', ['anger', 'neon']);
    const cHe = mkCard('card_he', ['hunger', 'warmth']);
    const uids = addCards(s, [cQi, cCheng1, cZhuan, cCheng2, cHe]);
    const res = C.scorePlay(s, uids);
    assert.equal(res.form, 'full');

    const mids = NS.strokePlan(s, 1, res);
    const pierAndFaces = NS.strokePlan(s, 2, res);

    assert.deepEqual(mids, [
      IE.Desk.artOf(cQi).mid,
      IE.Desk.artOf(cZhuan).mid,
      IE.Desk.artOf(cHe).mid,
    ]);
    assert.deepEqual(pierAndFaces.slice(1), [
      IE.Desk.artOf(cQi).face,
      IE.Desk.artOf(cZhuan).face,
      IE.Desk.artOf(cHe).face,
    ]);
  });

  test('創作桌畫面：三筆完整的起承轉合用金框', () => {
    const s = newRoundsState(44);
    const makeFullPlay = (tag) => {
      const uids = addCards(s, [
        mkCard('q_' + tag, ['warmth']),
        mkCard('c_' + tag, ['hope']),
        mkCard('z_' + tag, ['guilt']),
        mkCard('h_' + tag, ['guilt', 'warmth']),
      ]);
      const r = C.play(s, uids);
      assert.equal(r.form, 'full');
      return r;
    };

    makeFullPlay('1');
    makeFullPlay('2');
    // 只得兩筆 full 時，第四筆若是普通承接不用金框
    const plainUids = addCards(s, [mkCard('p1', ['neon']), mkCard('p2', ['neon'])]);
    const plainPreview = C.scorePlay(s, plainUids);
    assert.notEqual(NS.strokePlan(s, 3, plainPreview)[0], 'np-front-frame-gold');

    // 第三筆也是 full，到第四筆收尾時滿三筆 full，應裱金框
    makeFullPlay('3');
    const lastUids = addCards(s, [mkCard('l1', ['water']), mkCard('l2', ['memory'])]);
    const res4 = C.play(s, lastUids);
    assert.deepEqual(NS.strokePlan(s, 3, res4), ['np-front-frame-gold']);
  });

  test('創作桌畫面：strokePlan 的每個名稱都在清單裏', () => {
    const manifest = D.ART.a;
    for (let seed = 1; seed <= 8; seed++) {
      const s = newRoundsState(seed * 17);
      for (let stroke = 0; stroke < 4; stroke++) {
        const hand = (s.session.hand || []).slice(0, 5);
        if (!hand.length) break;
        const res = C.play(s, hand);
        const names = NS.strokePlan(s, stroke, res);
        assert.ok(names.length > 0, '第 ' + stroke + ' 筆應有素材');
        names.forEach((nm) => {
          assert.ok(manifest[nm], '素材不在 D.ART.a 清單裏：' + nm);
        });
      }
      const vista = NS.plan(s);
      assert.ok(vista);
      [vista.sky, vista.pier, vista.front].concat(vista.far, vista.mids).forEach((nm) => {
        assert.ok(manifest[nm], 'plan(s) 素材不在清單裏：' + nm);
      });
      assert.notEqual(vista.front, 'np-front-frame-gold');
    }
  });

  test('創作桌畫面：同一局同一晚的畫可以由記錄重畫', () => {
    const s = newRoundsState(77);
    const vp = NS.plan(s);
    const liveLayers = [];
    const strokes = [];
    for (let i = 0; i < 4; i++) {
      const hand = (s.session.hand || []).slice(0, 4);
      const res = C.play(s, hand);
      liveLayers.push(NS.strokePlan(s, i, res));
      strokes.push(NS.recordStroke(s, i, res));
    }
    const paintRec = {
      seed: vp.seed,
      round: IE.Rounds.roundOf(s),
      stage: vp.stage,
      flood: vp.flood,
      cold: vp.cold,
      rain: vp.rain,
      pier: vp.pier,
      strokes,
    };
    const jsonCopy = JSON.parse(JSON.stringify(paintRec));
    const replayedA = NS.replayPlan(jsonCopy);
    const replayedB = NS.replayPlan(jsonCopy);

    assert.deepEqual(replayedA, replayedB);
    assert.deepEqual(replayedA.layers, liveLayers);
    assert.equal(replayedA.pier, vp.pier);
    assert.equal(replayedA.flood, vp.flood);

    // 沒有 IE.DATA.ART 時安全退回，不拋錯
    const saved = D.ART;
    try {
      D.ART = null;
      assert.equal(NS.plan(s), null);
      assert.deepEqual(NS.strokePlan(s, 0, {}), []);
      assert.equal(NS.replayPlan(jsonCopy), null);
    } finally {
      D.ART = saved;
    }
  });
};
