'use strict';
// WO-15-14：票面價格換算（cash、cashText）與出國（tripCost、tripSpark、tripStar）單元測試。
module.exports = (t) => {
  const { IE, D, assert, run } = t;
  const RD = IE.Rounds;

  t.test('1. cash：五輪模式與經典模式的金額換算', () => {
    const sRounds = run({ mode: 'rounds' });
    const sClassic = run({ mode: 'standard' });
    assert.equal(RD.cash(sRounds, 84), '$1,680');
    assert.equal(RD.cash(sRounds, -20), '−$400');
    assert.equal(RD.cash(sRounds, 0), '$0');
    assert.equal(RD.cash(sClassic, 84), '$84');
  });

  t.test('2. cashText：五輪模式下各種金額格式、多個金額與無金額字串', () => {
    const s = run({ mode: 'rounds' });
    assert.equal(RD.cashText(s, '$84'), '$1,680');
    assert.equal(RD.cashText(s, '$1,234'), '$24,680');
    assert.equal(RD.cashText(s, '$ 84'), '$ 1,680');
    assert.equal(RD.cashText(s, '+$84'), '+$1,680');
    assert.equal(RD.cashText(s, '−$20'), '−$400');
    assert.equal(RD.cashText(s, '-$20'), '-$400');
    assert.equal(RD.cashText(s, '$ +120'), '$ +2,400');
    assert.equal(RD.cashText(s, '$ −30'), '$ −600');
    assert.equal(RD.cashText(s, '$ -30'), '$ -600');
    assert.equal(
      RD.cashText(s, '現有 $84，本輪租金 $80（差 −$20 或 +$1,234）'),
      '現有 $1,680，本輪租金 $1,600（差 −$400 或 +$24,680）',
    );
    const plain = 'Lv.2・+15%・3/5・2080 年・120 籌碼 × 4 倍率';
    assert.equal(RD.cashText(s, plain), plain);
  });

  t.test('2b. cashText：金額後面的半形逗號保留、多組千位（WO-15-14 審核加入）', () => {
    const s = run({ mode: 'rounds' });
    assert.equal(RD.cashText(s, '$84, $20'), '$1,680, $400');
    assert.equal(RD.cashText(s, '換一批：$10,$20,$30'), '換一批：$200,$400,$600');
    assert.equal(RD.cashText(s, '$1,234,567'), '$24,691,340');
    assert.equal(RD.cashText(s, '+$84。'), '+$1,680。');
  });

  t.test('3. cashText：經典模式下原樣回傳（不換算也不補千分位）', () => {
    const s = run({ mode: 'standard' });
    const raw = '現有 $1234，賺 +$84，花 −$20，街頭 $ +120 / $ -30';
    assert.equal(RD.cashText(s, raw), raw);
  });

  t.test('4. trip：出國扣除 tripCost（乘評級價錢修正）、火花加 tripSpark、帶回兩張 ★tripStar', () => {
    const stake = 5; // stake 5 價錢修正 ×1.15
    const s = run({ mode: 'rounds', stake, seed: 42 });
    s.night = 4; // 第 2 輪起可出國
    s.phase = 'day';
    const stMod = IE.Meta.stakeMod(s, 'prices');
    const expectedCost = Math.round(D.ECON.tripCost * stMod);
    s.cr = expectedCost + 50;
    s.spark = 1.5;
    s.offer = { night: s.night, ids: ['trip:asia', 'label', 'volunteer'], rerolls: 0, chosen: null };

    const info = RD.cardInfo(s, 'trip:asia');
    assert.equal(info.enabled, true);
    assert.deepEqual(info.fx, [
      ['cr', '−$' + expectedCost],
      ['spark', '+' + D.ECON.tripSpark],
      ['card', D.REGIONS.asia + '素材 五選二（★' + D.ECON.tripStar + '）'],
    ]);

    const res = RD.choose(s, 'trip:asia');
    assert.ok(res && res.trip);
    assert.equal(s.cr, 50);
    assert.ok(Math.abs(s.spark - (1.5 + D.ECON.tripSpark)) < 1e-9);
    assert.ok(s.trip5 && s.trip5.ids.length === 5);

    const p1 = RD.tripPick(s, 0);
    assert.ok(p1 && p1.card);
    assert.equal(p1.card.star, D.ECON.tripStar);
    assert.equal(s.phase, 'day');

    const p2 = RD.tripPick(s, 1);
    assert.ok(p2 && p2.card && p2.rep);
    assert.equal(p2.card.star, D.ECON.tripStar);
    assert.equal(s.trip5, null);
    assert.equal(s.phase, 'night');
  });
};
