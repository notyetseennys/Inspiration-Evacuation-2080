// WO-16-11：頭五分鐘（序章之夜、逐步打開、第一個抉擇、說明）。測試名稱照工單 §8。
module.exports = (t) => {
  const { IE, D, R, assert } = t;
  if (!IE.Cards) require('../../game/js/cards.js');
  const RD = IE.Rounds, P = D.PROLOGUE;
  const len = (x) => Array.from(String(x)).length;
  // 照三步下完序章，回傳每一筆的結果
  const playAll = (p) => {
    const out = [];
    P.steps.forEach(() => {
      const st = RD.prologueStep(p);
      const res = IE.Create.play(p, st.uids);
      out.push({ res, cum: p.session.total, hand: p.session.hand.slice() });
      RD.prologueAfterPlay(p);
      out[out.length - 1].handAfter = p.session.hand.slice();
    });
    return out;
  };
  // 引導局：前文案、風暴季、第一季
  const guided = (o) => {
    const s = t.run(Object.assign({ mode: 'rounds', bg: P.bg, season: P.season, chapter: 'c1', meta: { runs: 0 } }, o || {}));
    s.guided = true;
    s.hinted = {};
    return s;
  };
  const atNight = (s, n) => { s.night = n; return RD.reveal(s); };

  t.test('序章：四張卡都存在，三步的結構依次是承接、峰迴路轉、起承轉合', () => {
    const cards = P.cards.map((id) => D.CARDS[id]);
    cards.forEach((c, i) => assert.ok(c, '找不到序章的卡：' + P.cards[i]));
    const ids = P.steps.map((st) => IE.Desk.analyze(st.pick.map((k) => ({ id: P.cards[k], tags: cards[k].tags.slice() }))).id);
    assert.deepEqual(ids, ['pair', 'twist', 'full']);
    assert.deepEqual(ids.map((id) => IE.Desk.STRUCT[id].name), ['承接', '峰迴路轉', '起承轉合']);
  });

  t.test('序章：prologueRun 是五輪模式的前文案，只有四張卡，沒有物件，來歷是序章', () => {
    const p = RD.prologueRun();
    assert.equal(p.prologue, true);
    assert.ok(RD.on(p));
    assert.equal(p.bg, 'copywriter');
    assert.equal(p.phase, 'night');
    assert.deepEqual(p.objects, []);
    assert.deepEqual(p.cards.map((c) => c.id), P.cards);
    p.cards.forEach((c) => {
      assert.equal(c.from && c.from.kind, 'prologue');
      assert.equal(c.wear || 0, 0);
      assert.ok(!c.foil, '序章的卡不會是閃卡');
    });
    assert.equal(p.weather.id, P.scene.weather);
  });

  t.test('序章：照步驟下三筆，第一、二筆未達標，第三筆剛好達標', () => {
    const p = RD.prologueRun();
    const ses = RD.prologueStart(p);
    const target = ses.stage.target;
    assert.equal(ses.stage.kind, 'prologue');
    assert.equal(ses.plays, 3);
    assert.equal(ses.discards, 0);
    const out = playAll(p);
    assert.ok(!out[0].res.justPassed && out[0].cum < target, '第一筆不應達標');
    assert.ok(!out[1].res.justPassed && out[1].cum < target, '第二筆不應達標');
    assert.ok(out[2].res.justPassed && out[2].cum >= target, '第三筆要達標');
    assert.ok(out[0].res.total < out[1].res.total && out[1].res.total < out[2].res.total, '每一筆比上一筆高');
  });

  t.test('序章：每次的分數和目標都相同', () => {
    const one = () => {
      const p = RD.prologueRun();
      const ses = RD.prologueStart(p);
      return { target: ses.stage.target, scores: playAll(p).map((x) => x.res.total) };
    };
    assert.deepEqual(one(), one());
    assert.equal(RD.prologueTarget(), RD.prologueTarget());
  });

  t.test('序章：prologueNext 一次只給一張卡，選齊了才給下筆，選錯了要重來', () => {
    const p = RD.prologueRun();
    RD.prologueStart(p);
    const st = RD.prologueStep(p);
    assert.deepEqual(RD.prologueNext(p, []), { uid: st.uids[0] });
    assert.deepEqual(RD.prologueNext(p, [st.uids[0]]), { uid: st.uids[1] });
    assert.deepEqual(RD.prologueNext(p, st.uids.slice()), { play: true });
    assert.deepEqual(RD.prologueNext(p, [st.uids[1]]), { reset: true });
    const other = p.cards.map((c) => c.uid).find((u) => !st.uids.includes(u));
    assert.deepEqual(RD.prologueNext(p, st.uids.concat([other])), { reset: true });
  });

  t.test('序章：每一筆之後手上仍然是四張卡，次序不變', () => {
    const p = RD.prologueRun();
    RD.prologueStart(p);
    const uids = p.cards.map((c) => c.uid);
    assert.deepEqual(p.session.hand, uids);
    const out = playAll(p);
    out.forEach((x) => assert.deepEqual(x.handAfter, uids));
    assert.deepEqual(p.session.deck, []);
    assert.equal(RD.prologueStep(p), null, '三步之後沒有下一步');
  });

  t.test('序章：prologueFinish 有作品名和總分，不改錢、不記錄晚數', () => {
    const p = RD.prologueRun();
    RD.prologueStart(p);
    const cr = p.cr, night = p.night, logs = (p.nightLog || []).length;
    const out = playAll(p);
    const r = RD.prologueFinish(p);
    assert.ok(r.title && r.title.length > 0, '作品名');
    assert.equal(r.total, out[2].cum);
    assert.ok(r.passed);
    assert.ok(Array.isArray(r.strokes));
    assert.equal(p.session, null);
    assert.equal(p.cr, cr);
    assert.equal(p.night, night);
    assert.equal((p.nightLog || []).length, logs);
  });

  t.test('序章：prologueCarry 加入四張耗損 0 的新卡，晚數仍然是第 1 晚', () => {
    const s = guided();
    const n = s.cards.length;
    const added = RD.prologueCarry(s);
    assert.equal(added.length, 4);
    assert.equal(s.cards.length, n + 4);
    added.forEach((c) => {
      assert.equal(c.wear, 0);
      assert.equal(c.from.kind, 'prologue');
      assert.ok(!c.foil);
    });
    assert.deepEqual(added.map((c) => c.id), P.cards);
    assert.equal(s.night, 1);
  });

  t.test('序章：文字長度（say 不多於 30 字、after 不多於 20 字、hint 不多於 20 字、tagline 不多於 24 字）', () => {
    P.steps.forEach((st, i) => {
      assert.ok(len(st.say) <= 30, '第 ' + (i + 1) + ' 步 say ' + len(st.say) + ' 字');
      assert.ok(len(st.after) <= 20, '第 ' + (i + 1) + ' 步 after ' + len(st.after) + ' 字');
    });
    Object.keys(P.hint).forEach((k) => assert.ok(len(P.hint[k]) <= 20, 'hint.' + k + ' ' + len(P.hint[k]) + ' 字'));
    assert.ok(len(P.tagline) <= 24, 'tagline ' + len(P.tagline) + ' 字');
  });

  t.test('逐步打開：引導局第 1 晚只有兩張生活卡，有差事時一定包括差事', () => {
    const s = guided();
    const V = atNight(s, 1);
    assert.equal(V.cardsMax, 2);
    ['map', 'rent', 'chances', 'water', 'skip', 'deck', 'boss', 'story', 'wx', 'reroll', 'memory'].forEach((k) => assert.equal(V[k], false, k));
    // 介面先把差事排在最前再取前兩張：差事一定在顯示的兩張之內
    const infos = (RD.offer(s).ids || []).map((id) => RD.cardInfo(s, id)).filter(Boolean);
    const shown = infos.filter((c) => c.gig).concat(infos.filter((c) => !c.gig)).slice(0, V.cardsMax);
    if (infos.some((c) => c.gig)) assert.ok(shown.some((c) => c.gig), '有差事時要顯示差事');
    assert.ok(infos.length > 2, '規則照常給出全部生活卡（只是不顯示）');
    assert.equal(shown.length, 2);
  });

  t.test('逐步打開：第 2 晚加上租金、機會、水位、小地圖、睡懶覺、素材庫', () => {
    const V = atNight(guided(), 2);
    assert.equal(V.cardsMax, Infinity);
    ['map', 'rent', 'chances', 'water', 'skip', 'deck'].forEach((k) => assert.equal(V[k], true, k));
    ['boss', 'story', 'wx', 'reroll', 'memory'].forEach((k) => assert.equal(V[k], false, k));
  });

  t.test('逐步打開：第 3 晚加上評審、故事列、天氣、換一批、回憶；第 4 晚起全部', () => {
    const s = guided();
    const V3 = atNight(s, 3);
    Object.keys(V3).filter((k) => k !== 'cardsMax').forEach((k) => assert.equal(V3[k], true, k));
    const V4 = atNight(s, 4);
    assert.equal(V4.cardsMax, Infinity);
    Object.keys(V4).filter((k) => k !== 'cardsMax').forEach((k) => assert.equal(V4[k], true, k));
  });

  t.test('逐步打開：不是引導局時全部顯示', () => {
    const s = t.run({ mode: 'rounds', chapter: null });
    const V = RD.reveal(s);
    assert.equal(V.cardsMax, Infinity);
    Object.keys(V).filter((k) => k !== 'cardsMax').forEach((k) => assert.equal(V[k], true, k));
  });

  t.test('第一個抉擇：引導局只給生存、為別人、巔峰各一，保留原來的編號', () => {
    const s = guided();
    const ch = { options: [
      { side: 'survive', extreme: true }, { side: 'survive' }, { side: 'both' }, { side: 'peak' }, { side: 'others' },
    ] };
    assert.deepEqual(RD.guidedOptions(s, ch), [1, 3, 4]);
    // 真正的第一章
    const real = IE.Story && IE.Story.chapter ? IE.Story.chapter(s) : null;
    if (real && real.options && real.options.length > 3) {
      const idx = RD.guidedOptions(s, real);
      assert.equal(idx.length, 3);
      assert.deepEqual(idx.slice().sort((a, b) => a - b), idx, '按原來的次序');
      assert.deepEqual(new Set(idx.map((i) => real.options[i].side)), new Set(['survive', 'others', 'peak']));
    }
    // 回答過之後全部顯示；不是引導局全部顯示
    s.story = s.story || {};
    s.story.log = [{ night: 1, id: 'x', i: 0 }];
    assert.deepEqual(RD.guidedOptions(s, ch), [0, 1, 2, 3, 4]);
    assert.deepEqual(RD.guidedOptions(t.run({ mode: 'rounds' }), ch), [0, 1, 2, 3, 4]);
  });

  t.test('說明：newHints 只回傳第一次改變的資源，不改局面', () => {
    const s = guided();
    const rep = { deltas: { cr: 120, body: 0, spark: 0, soul: 1 } };
    const before = JSON.stringify(s);
    assert.deepEqual(RD.newHints(s, rep), ['cr', 'soul']);
    assert.equal(JSON.stringify(s), before, '不改局面');
    s.hinted.cr = true;
    assert.deepEqual(RD.newHints(s, rep), ['soul']);
    assert.deepEqual(RD.newHints(s, { deltas: { cr: 0, spark: 0.2, soul: 0 } }), ['spark']);
    assert.deepEqual(RD.newHints(t.run({ mode: 'rounds' }), rep), []);
  });

  t.test('舊模式：沒有 guided、沒有序章，reveal 全部顯示', () => {
    const s = t.run({ mode: 'standard' });
    assert.ok(!s.guided);
    assert.ok(!s.prologue);
    const V = RD.reveal(s);
    Object.keys(V).filter((k) => k !== 'cardsMax').forEach((k) => assert.equal(V[k], true, k));
    assert.deepEqual(RD.newHints(s, { deltas: { cr: 5 } }), []);
    assert.deepEqual(RD.prologueCarry(s), []);
  });
};
