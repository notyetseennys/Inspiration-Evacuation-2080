// 第十六期（WO-16-09）：創作桌規則接入五輪模式的單元測試。
'use strict';

module.exports = (t) => {
  const { IE, D, R, C, S, assert } = t;
  const RD = IE.Rounds;
  const K = IE.Desk;

  function setHand(s, defs) {
    s.cards = defs.map((d, i) => ({
      uid: i + 1,
      id: d.id || ('test_' + (i + 1)),
      name: d.name || ('測試素材' + (i + 1)),
      tags: d.tags.slice(),
      medium: d.medium || 'paper',
      star: d.star || 3,
      value: d.value || 28,
      rarity: d.rarity || 'common',
      origin: d.origin || 'home',
      wear: d.wear || 0,
      mod: d.mod || null,
    }));
    s.nextUid = s.cards.length + 1;
    if (s.session) {
      s.session.hand = s.cards.map((c) => c.uid);
      s.session.deck = [];
      s.session.used = [];
    }
    return s.cards.map((c) => c.uid);
  }

  function beginNight(s) {
    s.phase = 'night';
    return RD.startNight(s);
  }

  t.test('創作桌規則：五輪模式的 scorePlay 用結構，舊模式仍然用配色', () => {
    const defs = [
      { tags: ['warmth'], medium: 'paper', star: 3 },
      { tags: ['warmth'], medium: 'sound', star: 3 },
      { tags: ['machine'], medium: 'image', star: 3 },
      { tags: ['machine', 'warmth'], medium: 'paper', star: 3 },
    ];
    const sr = t.run({ mode: 'rounds', seed: 11 });
    sr.objects = [];
    beginNight(sr);
    const uidsR = setHand(sr, defs);
    const resR = C.scorePlay(sr, uidsR);
    assert.equal(resR.form, 'full');
    assert.equal(resR.he, true);
    assert.deepEqual(resR.scoring, uidsR);
    assert.deepEqual(resR.roles, ['qi', 'cheng', 'zhuan', 'he']);
    assert.deepEqual(resR.noise, []);
    assert.ok(Array.isArray(resR.links) && resR.links.length === 3);
    assert.ok(resR.subject && resR.subject.main === 'warmth');
    assert.equal(resR.s, 0);
    assert.equal(resR.e, 3);
    assert.ok(resR.steps.some((x) => x.t === 'link' && typeof x.C === 'number' && typeof x.M === 'number'));
    assert.ok(resR.steps.some((x) => x.t === 'he' && typeof x.C === 'number' && typeof x.M === 'number'));
    assert.ok(resR.steps.some((x) => x.t === 'title' && typeof x.C === 'number' && typeof x.M === 'number'));

    const sc = t.run({ mode: 'standard', seed: 11 });
    sc.objects = [];
    C.start(sc, 'normal');
    const uidsC = setHand(sc, defs);
    const resC = C.scorePlay(sc, uidsC);
    assert.equal(resC.form, 'comp');
    assert.equal(resC.links, undefined);
    assert.ok(!resC.steps.some((x) => x.t === 'link' || x.t === 'he' || x.t === 'title'));
  });

  t.test('創作桌規則：同一組素材，次序不同，分數不同', () => {
    const s = t.run({ mode: 'rounds', seed: 12 });
    s.objects = [];
    beginNight(s);
    const uids = setHand(s, [
      { tags: ['warmth'], medium: 'paper', star: 3 },
      { tags: ['warmth'], medium: 'sound', star: 3 },
      { tags: ['machine'], medium: 'image', star: 3 },
      { tags: ['machine', 'warmth'], medium: 'body', star: 3 },
    ]);
    const rFull = C.scorePlay(s, [uids[0], uids[1], uids[2], uids[3]]);
    const rBroken = C.scorePlay(s, [uids[2], uids[0], uids[1], uids[3]]);
    assert.equal(rFull.form, 'full');
    assert.equal(rBroken.form, 'loop');
    assert.ok(rFull.total > rBroken.total);
  });

  t.test('創作桌規則：斷開的素材不計分，列在 noise', () => {
    const s = t.run({ mode: 'rounds', seed: 13 });
    s.objects = [];
    beginNight(s);
    // warmth(0) 與 memory(3) 距離 3 為斷；後三張 memory(3) -> memory(3) -> water(2) 相連
    const uids = setHand(s, [
      { tags: ['warmth'], medium: 'paper', star: 5, value: 60 },
      { tags: ['memory'], medium: 'paper', star: 2, value: 18 },
      { tags: ['memory'], medium: 'sound', star: 2, value: 18 },
      { tags: ['water'], medium: 'image', star: 2, value: 18 },
    ]);
    const res = C.scorePlay(s, uids);
    assert.deepEqual(res.scoring, [uids[1], uids[2], uids[3]]);
    assert.deepEqual(res.noise, [uids[0]]);
    assert.equal(res.s, 1);
    assert.equal(res.e, 3);
    const cardStepUids = res.steps.filter((x) => x.t === 'card').map((x) => x.uid);
    assert.ok(!cardStepUids.includes(uids[0]));
    assert.deepEqual(cardStepUids, [uids[1], uids[2], uids[3]]);

    // 熟絡度滿的朋友可以把 1 個斷修成承
    s.npcs[0].alive = true;
    s.npcs[0].friend = 4;
    const repaired = C.scorePlay(s, uids);
    assert.deepEqual(repaired.noise, []);
    assert.equal(repaired.scoring.length, 4);
    assert.equal(repaired.links[0], 'fix');
  });

  t.test('創作桌規則：結構的等級來自 s.forms 的結構 id', () => {
    const s = t.run({ mode: 'rounds', seed: 14 });
    s.objects = [];
    beginNight(s);
    // warmth(0) -> hope(1) 為承，hope(1) -> guilt(6) 為轉 => twist（起承轉）
    const uids = setHand(s, [
      { tags: ['warmth'], medium: 'paper', star: 3 },
      { tags: ['hope'], medium: 'sound', star: 3 },
      { tags: ['guilt'], medium: 'image', star: 3 },
    ]);
    s.forms.twist = 1;
    const r1 = C.scorePlay(s, uids);
    assert.equal(r1.form, 'twist');
    assert.equal(r1.level, 1);

    s.forms.twist = 4;
    const r4 = C.scorePlay(s, uids);
    assert.equal(r4.form, 'twist');
    assert.equal(r4.level, 4);
    assert.equal(C.formStats(s, 'twist').level, 4);
    assert.ok(r4.chips > r1.chips);
    assert.ok(r4.mult > r1.mult);
    assert.ok(r4.total > r1.total);
  });

  t.test('創作桌規則：回響令下一張素材多計一次', () => {
    const s = t.run({ mode: 'rounds', seed: 15 });
    s.objects = [];
    beginNight(s);
    // warmth(0) + memory(3) 色輪距離 3 => fam === 'echo'（回響）
    assert.equal(K.pairOf('warmth', 'memory').fam.id, 'echo');
    const uids = setHand(s, [
      { tags: ['warmth', 'memory'], medium: 'paper', star: 2, value: 18 },
      { tags: ['memory'], medium: 'sound', star: 4, value: 42 },
    ]);
    const res = C.scorePlay(s, uids);
    assert.ok(res.steps.some((x) => x.t === 'compound' && x.fam === 'echo' && x.uid === uids[0]));
    const secondSteps = res.steps.filter((x) => x.t === 'card' && x.uid === uids[1]);
    assert.equal(secondSteps.length, 2);
    assert.equal(secondSteps[0].again, false);
    assert.equal(secondSteps[1].again, true);
    assert.equal(secondSteps[1].echo, true);
  });

  t.test('創作桌規則：物件、流派、評審、AI、火花的乘數照舊套用', () => {
    const s = t.run({ mode: 'rounds', seed: 16, bg: 'copywriter' });
    s.objects = [];
    s.style = {};
    s.spark = 1;
    s.kpi = { id: 'none', name: '無', desc: '', bonus: 1, penalty: 1 };
    beginNight(s);
    s.session.stage.rules = [];
    // 三張 hope => mono（獨白）
    const uids = setHand(s, [
      { tags: ['hope'], medium: 'paper', star: 3 },
      { tags: ['hope'], medium: 'sound', star: 3 },
      { tags: ['hope'], medium: 'image', star: 3 },
    ]);
    const base = C.scorePlay(s, uids);
    assert.equal(base.form, 'mono');

    // 1. 物件（guitar：獨白時 ×2）
    s.objects = ['guitar'];
    const withObj = C.scorePlay(s, uids);
    assert.ok(withObj.total > base.total);
    assert.ok(withObj.steps.some((x) => x.t === 'obj' && x.id === 'guitar'));

    // 2. 流派（裝備 billboard + glowstick，湊齊 neon 兩件流派加成 ×1.5）
    s.objects = ['billboard', 'glowstick'];
    const withSchool = C.scorePlay(s, uids);
    assert.ok(withSchool.schools.includes('neon'));
    assert.ok(withSchool.steps.some((x) => x.t === 'school' && x.school === 'neon'));

    // 3. 火花乘數
    s.spark = 2.5;
    const withSpark = C.scorePlay(s, uids);
    assert.ok(withSpark.total > withSchool.total);
    assert.equal(withSpark.steps.find((x) => x.t === 'spark').x, 2.5);

    // 4. AI 模仿（s.style.mono 累積後乘數下降）
    s.style = { mono: 6 };
    const withAi = C.scorePlay(s, uids);
    assert.ok(withAi.ai < 1);
    assert.ok(withAi.total < withSpark.total);
    assert.ok(withAi.steps.some((x) => x.t === 'ai'));

    // 5. 外星評審規則（copied：最常用結構 ×0.5）
    s.session.stage.rules = ['copied'];
    const withJudge = C.scorePlay(s, uids);
    assert.ok(withJudge.total < withAi.total);
    assert.ok(withJudge.steps.some((x) => x.t === 'stage' && x.x === 0.5));
  });

  t.test('創作桌規則：達標之後繼續，加演每筆火花 +0.1', () => {
    const s = t.run({ mode: 'rounds', seed: 17 });
    s.spark = 1.5;
    const ses = beginNight(s);
    ses.stage.target = 10;
    const cardsDef = [];
    for (let i = 0; i < 12; i++) {
      cardsDef.push({ tags: ['warmth'], medium: 'paper', star: 3 });
    }
    setHand(s, cardsDef);
    ses.hand = s.cards.slice(0, 7).map((c) => c.uid);
    ses.deck = s.cards.slice(7).map((c) => c.uid);

    // 第 1 筆：剛達標，passed 變為 true，encore 仍為 0，且不可提早收工
    const p1 = C.play(s, [ses.hand[0]]);
    assert.ok(p1.total >= 10);
    assert.equal(ses.passed, true);
    assert.equal(p1.justPassed, true);
    assert.equal(ses.encore, 0);
    assert.equal(s.spark, 1.5);
    assert.equal(RD.canFinish(s), false);

    // 第 2 筆（加演第 1 筆）：encore = 1，火花 +0.1
    C.play(s, [ses.hand[0]]);
    assert.equal(ses.encore, 1);
    assert.equal(s.spark, 1.6);
    assert.equal(RD.canFinish(s), false);

    // 第 3 筆（加演第 2 筆）：encore = 2，火花 +0.1
    C.play(s, [ses.hand[0]]);
    assert.equal(ses.encore, 2);
    assert.equal(s.spark, 1.7);
    assert.equal(RD.canFinish(s), false);

    // 第 4 筆（加演第 3 筆）：encore = 3，火花 +0.1，四筆用完可收工
    C.play(s, [ses.hand[0]]);
    assert.equal(ses.encore, 3);
    assert.equal(s.spark, 1.8);
    assert.equal(ses.plays, 0);
    assert.equal(RD.canFinish(s), true);
  });

  t.test('創作桌規則：超額 2、5、10 倍只給最高的一級', () => {
    function checkOver(multOfTarget) {
      const s = t.run({ mode: 'rounds', seed: 18 });
      s.spark = 1.0;
      const ses = beginNight(s);
      ses.stage.target = 100;
      const tot = Math.round(100 * multOfTarget);
      ses.total = tot;
      ses.raw = tot;
      ses.log.push({ form: 'pair', total: tot, raw: tot, chips: tot, mult: 1, recipes: [], tags: ['warmth'] });
      ses.plays = 0;
      const fin = C.finish(s);
      return { over: fin.stage.over, sparkDelta: Math.round((s.spark - 1.0) * 10) / 10, ticketDelta: fin.stage.tickets };
    }

    const rNone = checkOver(1.5);
    assert.equal(rNone.over || null, null);
    assert.equal(rNone.sparkDelta, 0);
    assert.equal(rNone.ticketDelta, 0);

    const r2 = checkOver(2.2);
    assert.equal(r2.over.x, 2);
    assert.equal(r2.sparkDelta, 0.2);
    assert.equal(r2.ticketDelta, 0);

    const r5 = checkOver(5.5);
    assert.equal(r5.over.x, 5);
    assert.equal(r5.sparkDelta, 0.4);
    assert.equal(r5.ticketDelta, 1);

    const r10 = checkOver(12);
    assert.equal(r10.over.x, 10);
    assert.equal(r10.sparkDelta, 0.6);
    assert.equal(r10.ticketDelta, 1);
  });

  t.test('創作桌規則：bestPlay 找到的次序不比隨機次序差', () => {
    // 1. 五張手牌：bestPlay 試遍所有排列，必等於全排列最高分
    const s5 = t.run({ mode: 'rounds', seed: 20 });
    s5.objects = [];
    beginNight(s5);
    const uids5 = setHand(s5, [
      { tags: ['warmth'], medium: 'paper', star: 3 },
      { tags: ['warmth', 'memory'], medium: 'sound', star: 2 },
      { tags: ['machine'], medium: 'image', star: 4 },
      { tags: ['machine', 'warmth'], medium: 'body', star: 3 },
      { tags: ['hope'], medium: 'data', star: 3 },
    ]);
    const b5 = C.bestPlay(s5);
    let maxPerm = 0;
    const seq = [];
    const used = new Array(uids5.length).fill(false);
    const walk = () => {
      if (seq.length) {
        const sc = C.scorePlay(s5, seq, { roll: 0.5 }).total;
        if (sc > maxPerm) maxPerm = sc;
      }
      if (seq.length >= 5) return;
      for (let i = 0; i < uids5.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        seq.push(uids5[i]);
        walk();
        seq.pop();
        used[i] = false;
      }
    };
    walk();
    assert.equal(b5.total, maxPerm);

    // 2. 完整開局手牌：bestPlay 找到的次序不比隨機次序差
    for (let seed = 21; seed <= 26; seed++) {
      const s = t.run({ mode: 'rounds', seed });
      const ses = beginNight(s);
      const best = C.bestPlay(s);
      assert.ok(best && Array.isArray(best.uids) && best.uids.length >= 1);
      const bestActual = C.scorePlay(s, best.uids, { roll: 0.5 }).total;
      assert.equal(best.total, bestActual);

      const valid = ses.hand.filter((u) => {
        const c = s.cards.find((x) => x.uid === u);
        return c && !C.forbidden(s, c);
      });
      const maxK = Math.min(C.maxCards(s), valid.length);
      for (let trial = 0; trial < 40; trial++) {
        const k = 1 + (trial % maxK);
        const pool = valid.slice();
        const pick = [];
        let rng = seed * 997 + trial * 37 + 1;
        while (pick.length < k && pool.length) {
          rng = (rng * 1103515245 + 12345) & 0x7fffffff;
          const idx = rng % pool.length;
          pick.push(pool.splice(idx, 1)[0]);
        }
        const randScore = C.scorePlay(s, pick, { roll: 0.5 }).total;
        assert.ok(best.total >= randScore, 'seed=' + seed + ' best=' + best.total + ' rand=' + randScore + ' pick=' + pick.join(','));
      }
    }
  });

  t.test('創作桌規則：五輪模式抽得到 dk_ 素材，舊模式抽不到', () => {
    let sawDkStart = false;
    let sawDkPack = false;
    for (let seed = 1; seed <= 30; seed++) {
      const sr = t.run({ mode: 'rounds', seed });
      if (sr.cards.some((c) => c.id.startsWith('dk_'))) sawDkStart = true;
      sr.cr = 999;
      sr.phase = 'shop';
      const sh = RD.shopOpen(sr);
      for (const pid of (sh.packs || [])) {
        const b = RD.shopBuy(sr, 'pack:' + pid);
        if (b && b.ok && sr.pack && sr.pack.cards) {
          if (sr.pack.cards.some((c) => c.id.startsWith('dk_'))) sawDkPack = true;
          RD.packPick(sr, 0);
        }
      }
    }
    assert.equal(sawDkStart, true, '五輪模式開局補充素材應抽得到 dk_');
    assert.equal(sawDkPack, true, '五輪模式素材包應抽得到 dk_');

    // 舊模式：Object.keys(D.CARDS) 不枚舉 dk_，開局與抽卡皆不出現 dk_
    assert.equal(Object.keys(D.CARDS).some((id) => id.startsWith('dk_')), false);
    for (let seed = 1; seed <= 30; seed++) {
      const sc = t.run({ mode: 'standard', seed });
      assert.equal(sc.cards.some((c) => c.id.startsWith('dk_')), false);
      R.applyVolunteer(sc);
      if (IE.World && IE.World.shopItems) {
        const items = IE.World.shopItems(sc);
        assert.equal(items.some((it) => String(it.id || '').startsWith('dk_')), false);
      }
      assert.equal(sc.cards.some((c) => c.id.startsWith('dk_')), false);
    }
  });

  t.test('創作桌規則：每一張 dk_ 素材都有圖（IE.Desk.artOf）', () => {
    assert.equal(D.DESK_IDS.length, 75);
    D.DESK_IDS.forEach((id) => {
      assert.ok(id.startsWith('dk_'), id);
      const def = D.CARDS[id];
      assert.ok(def, id + ' 存在於 D.CARDS');
      const card = Object.assign({ id }, def);
      const a = K.artOf(card);
      assert.ok(a && D.ART.a[a.face] && D.ART.a[a.mid], id + ' 有卡面和中景');
      assert.deepEqual(K.artOf(card), a);
    });
  });
};
