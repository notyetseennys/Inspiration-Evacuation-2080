// 第十六期（WO-16-03）：小遊戲抉擇立場結算（jobs2.js、auto.js）單元測試。
'use strict';

module.exports = (t) => {
  if (!t.IE.Cards) require('../../game/js/cards.js');
  const { IE, D, R, C, assert } = t;
  const Rounds = IE.Rounds;

  const baseLabelRes = () => ({ cr: 50, drain: 0.1, correct: 24, wrong: 2, maxCombo: 18, flows: 0, caught: 0 });
  const baseDeliveryRes = () => ({ cr: 60, deliveries: 7, late: 1, hits: 0 });
  const baseClinicRes = () => ({ cr: 55, patients: 5, illegal: 0, mistakes: 1 });

  t.test('立場：comply 收入乘 stancePay.comply，sin +1', () => {
    const sNull = t.run({ mode: 'rounds', bg: 'copywriter', seed: 301 });
    sNull.gigs = [];
    const cr0Null = sNull.cr;
    const repNull = R.applyMicro(sNull, 'label', Object.assign(baseLabelRes(), { stance: null }));
    const baseGain = sNull.cr - cr0Null;
    assert.equal(repNull.deltas.cr, baseGain);

    // 計算同種子無立場執行後再加 R.sin(s, 1) 的精確靈魂克數
    const sExpected = t.run({ mode: 'rounds', bg: 'copywriter', seed: 301 });
    sExpected.gigs = [];
    R.applyMicro(sExpected, 'label', Object.assign(baseLabelRes(), { stance: null }));
    const extraGrams = R.sin(sExpected, 1, null);

    const sComp = t.run({ mode: 'rounds', bg: 'copywriter', seed: 301 });
    sComp.gigs = [];
    const cr0 = sComp.cr;
    const rep = R.applyMicro(sComp, 'label', Object.assign(baseLabelRes(), { stance: 'comply' }));
    const compGain = sComp.cr - cr0;

    assert.equal(compGain, Math.round(baseGain * D.ECON16.stancePay.comply));
    assert.equal(rep.deltas.cr, compGain);
    assert.equal(sComp.stats.sins, sNull.stats.sins + 1);
    assert.equal(sComp.soul, sExpected.soul);
    assert.equal(rep.deltas.soul, R.round1(repNull.deltas.soul + extraGrams));
    assert.equal(rep.lines.some((l) => l.text === D.STANCE.label.lines.comply), true);
    assert.equal(rep.stance && rep.stance.id, 'comply');

    // 經由差事執行時，先乘 gigPay 再乘 stancePay.comply
    const sGigNull = t.run({ mode: 'rounds', bg: 'copywriter', seed: 302 });
    sGigNull.gigs = [];
    Rounds.addGig(sGigNull, { micro: 'delivery', from: 'round' });
    Rounds.useGig(sGigNull, 'delivery');
    const gigBase = R.applyMicro(sGigNull, 'delivery', baseDeliveryRes()).deltas.cr;

    const sGigComp = t.run({ mode: 'rounds', bg: 'copywriter', seed: 302 });
    sGigComp.gigs = [];
    Rounds.addGig(sGigComp, { micro: 'delivery', from: 'round' });
    Rounds.useGig(sGigComp, 'delivery');
    const gigCompRep = R.applyMicro(sGigComp, 'delivery', Object.assign(baseDeliveryRes(), { stance: 'comply' }));
    assert.equal(gigCompRep.deltas.cr, Math.round(gigBase * D.ECON16.stancePay.comply));
  });

  t.test('立場：resist 收入乘 stancePay.resist', () => {
    const sNull = t.run({ mode: 'rounds', bg: 'copywriter', seed: 311 });
    sNull.gigs = [];
    const cr0Null = sNull.cr;
    const repNull = R.applyMicro(sNull, 'delivery', Object.assign(baseDeliveryRes(), { stance: null }));
    const baseGain = sNull.cr - cr0Null;

    const sRes = t.run({ mode: 'rounds', bg: 'copywriter', seed: 311 });
    sRes.gigs = [];
    const cr0 = sRes.cr;
    const soul0 = sRes.soul;
    const sins0 = sRes.stats.sins;
    const atones0 = sRes.stats.atones;
    const rep = R.applyMicro(sRes, 'delivery', Object.assign(baseDeliveryRes(), { stance: 'resist' }));
    const resGain = sRes.cr - cr0;

    assert.equal(resGain, Math.round(baseGain * D.ECON16.stancePay.resist));
    assert.equal(rep.deltas.cr, resGain);
    assert.equal(sRes.soul, soul0);
    assert.equal(sRes.stats.sins, sins0);
    assert.equal(sRes.stats.atones, atones0);
    assert.equal(rep.deltas.soul, 0);
    assert.equal(rep.lines.some((l) => l.text === D.STANCE.delivery.lines.resist), true);
    assert.equal(rep.stance && rep.stance.id, 'resist');
  });

  t.test('立場：care 收入乘 stancePay.care，atone +1', () => {
    const sNull = t.run({ mode: 'rounds', bg: 'copywriter', seed: 321 });
    sNull.gigs = [];
    const cr0Null = sNull.cr;
    const repNull = R.applyMicro(sNull, 'clinic', Object.assign(baseClinicRes(), { stance: null }));
    const baseGain = sNull.cr - cr0Null;

    // 用另一局計算經過相同 train 後 R.atone(s, 1) 的精確克數
    const sExpected = t.run({ mode: 'rounds', bg: 'copywriter', seed: 321 });
    sExpected.gigs = [];
    R.applyMicro(sExpected, 'clinic', Object.assign(baseClinicRes(), { stance: null }));
    const soulBeforeAtone = sExpected.soul;
    const expectedAtone = R.atone(sExpected, 1, null);
    assert.ok(expectedAtone > 0, 'copywriter 起始靈魂 > 0，atone 應減輕靈魂重量');

    const sCare = t.run({ mode: 'rounds', bg: 'copywriter', seed: 321 });
    sCare.gigs = [];
    const cr0 = sCare.cr;
    const atones0 = sCare.stats.atones;
    const rep = R.applyMicro(sCare, 'clinic', Object.assign(baseClinicRes(), { stance: 'care' }));
    const careGain = sCare.cr - cr0;

    assert.equal(careGain, Math.round(baseGain * D.ECON16.stancePay.care));
    assert.equal(rep.deltas.cr, careGain);
    assert.equal(sCare.stats.atones, atones0 + 1);
    assert.equal(sCare.soul, R.round1(soulBeforeAtone - expectedAtone));
    assert.equal(rep.deltas.soul, -expectedAtone);
    assert.equal(rep.lines.some((l) => l.text === D.STANCE.clinic.lines.care), true);
    assert.equal(rep.stance && rep.stance.id, 'care');
  });

  t.test('立場：得到的卡是 D.STANCE 對應的那一張，有來歷', () => {
    const micros = [
      { kind: 'label', title: 'AI 數據標註', res: baseLabelRes },
      { kind: 'delivery', title: '外送潛水', res: baseDeliveryRes },
      { kind: 'clinic', title: '黑市義體診所', res: baseClinicRes },
    ];
    const stances = ['comply', 'resist', 'care'];

    micros.forEach(({ kind, title, res }) => {
      stances.forEach((stance) => {
        const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 330 });
        s.gigs = [];
        s.night = 5;
        s.day = 20;
        const deckBefore = s.cards.length;
        const rep = R.applyMicro(s, kind, Object.assign(res(), { stance }));
        const want = D.STANCE[kind][stance];

        assert.equal(rep.cards.length, 1);
        assert.equal(s.cards.length, deckBefore + 1);
        const card = rep.cards[0];
        assert.equal(s.cards[s.cards.length - 1].uid, card.uid);
        assert.equal(card.name, want.name);
        assert.deepEqual(card.tags, want.tags);
        assert.equal(card.value, want.value);
        assert.equal(card.medium, want.medium);
        assert.deepEqual(card.from, {
          kind: 'work',
          night: 5,
          text: '第 5 晚之前，做「' + title + '」的時候留下的',
          npc: null,
        });
      });
    });

    // 星級按總規格 §3.3（B 維持原星級，A → ★2，S → ★3，SS → ★4）調整
    const rankCases = [
      { deliveries: 5, late: 1, wantRank: 'B', complyStar: 1, careStar: 2 },
      { deliveries: 7, late: 1, wantRank: 'A', complyStar: 2, careStar: 2 },
      { deliveries: 8, late: 1, wantRank: 'S', complyStar: 3, careStar: 3 },
      { deliveries: 9, late: 1, wantRank: 'SS', complyStar: 4, careStar: 4 },
    ];
    rankCases.forEach(({ deliveries, late, wantRank, complyStar, careStar }) => {
      const s1 = t.run({ mode: 'rounds', bg: 'copywriter', seed: 340 });
      const rep1 = R.applyMicro(s1, 'delivery', { cr: 60, deliveries, late, hits: 0, stance: 'comply' });
      assert.equal(rep1.rank.id, wantRank);
      assert.equal(C.starOf(rep1.cards[0]), complyStar);

      const s2 = t.run({ mode: 'rounds', bg: 'copywriter', seed: 340 });
      const rep2 = R.applyMicro(s2, 'delivery', { cr: 60, deliveries, late, hits: 0, stance: 'care' });
      assert.equal(rep2.rank.id, wantRank);
      assert.equal(C.starOf(rep2.cards[0]), careStar);
    });
  });

  t.test('立場：照舊做一律是 comply', () => {
    ['label', 'delivery', 'clinic'].forEach((kind, i) => {
      const sNull = t.run({ mode: 'rounds', bg: 'copywriter', seed: 350 + i });
      const rawRes = Object.assign(IE.Auto.result(sNull, kind), { stance: null });
      R.applyMicro(sNull, kind, rawRes);

      const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 350 + i });
      const res = IE.Auto.result(s, kind);
      assert.equal(res.auto, true);
      assert.equal(res.stance, 'comply');

      const rep = IE.Auto.apply(s, kind);
      assert.equal(rep.stance.id, 'comply');
      assert.equal(rep.stance.auto, true);
      assert.equal(s.stats.sins, sNull.stats.sins + 1);
      assert.ok(s.soul > sNull.soul);
      assert.equal(rep.cards.length, 1);
      assert.equal(rep.cards[0].name, D.STANCE[kind].comply.name);
      assert.equal(rep.cards[0].from.kind, 'work');
      assert.equal(rep.lines.some((l) => l.text === D.STANCE_TEXT.auto), true);
      assert.equal(rep.lines.some((l) => l.text === D.STANCE[kind].lines.comply), false);
    });
  });

  t.test('立場：舊模式不套用立場', () => {
    ['standard', 'long'].forEach((mode) => {
      // 1. IE.Auto 在舊模式不附加 stance，也不套用 stancePay、sin 或 D.STANCE 卡
      const sAuto = t.run({ mode, bg: 'copywriter', seed: 360 });
      const autoRes = IE.Auto.result(sAuto, 'delivery');
      assert.equal(autoRes.stance, undefined);
      const sinsAuto0 = sAuto.stats.sins;
      const repAuto = IE.Auto.apply(sAuto, 'delivery');
      assert.equal(repAuto.stance, undefined);
      assert.equal(sAuto.stats.sins, sinsAuto0);
      assert.equal(repAuto.cards.some((c) => c.name === D.STANCE.delivery.comply.name), false);
      assert.equal(repAuto.lines.some((l) => l.text === D.STANCE_TEXT.auto), false);

      // 2. 即使傳入帶 stance 的結果，舊模式的 jobs2.grade 亦完全忽略立場
      const sPlain = t.run({ mode, bg: 'copywriter', seed: 361 });
      const crPlain0 = sPlain.cr;
      const soulPlain0 = sPlain.soul;
      const sinsPlain0 = sPlain.stats.sins;
      const repPlain = R.applyMicro(sPlain, 'label', baseLabelRes());

      const sWithStance = t.run({ mode, bg: 'copywriter', seed: 361 });
      const crSt0 = sWithStance.cr;
      const soulSt0 = sWithStance.soul;
      const sinsSt0 = sWithStance.stats.sins;
      const repWithStance = R.applyMicro(sWithStance, 'label', Object.assign(baseLabelRes(), { stance: 'comply' }));

      assert.equal(sWithStance.cr - crSt0, sPlain.cr - crPlain0);
      assert.equal(sWithStance.soul - soulSt0, sPlain.soul - soulPlain0);
      assert.equal(sWithStance.stats.sins - sinsSt0, sPlain.stats.sins - sinsPlain0);
      assert.equal(repWithStance.deltas.cr, repPlain.deltas.cr);
      assert.equal(repWithStance.deltas.soul, repPlain.deltas.soul);
      assert.equal(repWithStance.stance, undefined);
      assert.deepEqual(repWithStance.cards.map((c) => c.name), repPlain.cards.map((c) => c.name));
    });
  });
};
