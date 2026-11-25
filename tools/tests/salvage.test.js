// 第十七期：舊城打撈（局與局之間的升級樹）。由 Claude 維護。
module.exports = (t) => {
  const { IE, D, R, C, assert } = t;
  const RD = IE.Rounds, SV = IE.Salvage;
  const run = (o) => t.run(Object.assign({ mode: 'rounds', bg: 'copywriter', seed: 11 }, o || {}));
  const meta = (sed, owned) => ({ salvage: { sediment: sed || 0, earned: 0, owned: owned || {} } });

  t.test('打撈：六區各六個節點，價錢按層數遞增', () => {
    assert.equal(D.SALVAGE.length, 6);
    assert.equal(SV.NODES.length, 36);
    D.SALVAGE.forEach((d) => {
      const ns = SV.NODES.filter((n) => n.district === d.id);
      assert.equal(ns.length, 6, d.id);
      ns.forEach((n, i) => assert.equal(n.cost, D.SALVAGE_COST[i]));
      ns.forEach((n) => assert.ok(n.name && n.text && n.fx && Object.keys(n.fx).length, n.id));
    });
    const ids = new Set(SV.NODES.map((n) => n.id));
    assert.equal(ids.size, 36, '節點 id 不可以重複');
  });

  t.test('打撈：要先打撈上一層，沉積不夠不可以買，買了扣沉積', () => {
    const m = meta(100);
    assert.equal(SV.canBuy(m, 'drybag').ok, false);
    const r1 = SV.buy(m, 'bottle');
    assert.ok(r1.ok);
    assert.equal(SV.balance(m), 100 - D.SALVAGE_COST[0]);
    assert.ok(SV.owned(m, 'bottle'));
    assert.equal(SV.buy(m, 'bottle').ok, false);
    assert.ok(SV.buy(m, 'drybag').ok);
    const poor = meta(3);
    assert.equal(SV.canBuy(poor, 'bottle').ok, false);
  });

  t.test('打撈：效果相加（兩個開局多一張素材的節點＝多兩張）', () => {
    const m = meta(0, { bottle: true, drybag: true, tide: true, net: true, wreck: true, lamp: true, receipt: true });
    const p = SV.perks(m);
    assert.equal(p.startCards, 2);
    assert.equal(p.startFoil, 1);
    assert.equal(p.packExtra, 1);
    assert.equal(p.startCash, 15);
  });

  t.test('沉積：完成的晚數、達標、超額、通過的輪數、被選中都會算', () => {
    const s = run({ chapter: 'c1' });
    s.nightLog = [
      { night: 1, score: 1000, target: 1000, pass: true },
      { night: 2, score: 6000, target: 1000, pass: true },
      { night: 3, score: 500, target: 1000, pass: false },
    ];
    s.reviewsPassed = 1;
    const SD = D.SEDIMENT;
    const e = SV.earn(s, 'archived');
    // 3 晚 + 2 晚達標 + 超額（6 倍是第 2 級）+ 1 輪（第十八期的 D.SEDIMENT）
    const b = 3 * SD.night + 2 * SD.passed + 2 * SD.over + SD.round;
    assert.equal(e.total, b);
    const e2 = SV.earn(s, 'recruited', { firstClear: true });
    assert.equal(e2.total, b + SD.recruited + SD.firstClear);
    s.salvage = { sedimentX: 0.25 };
    assert.equal(SV.earn(s, 'archived').total, b + Math.round(b * 0.25));
    const m = meta(0);
    SV.bank(m, s, 'archived');
    assert.equal(SV.balance(m), b + Math.round(b * 0.25));
    assert.equal(m.salvage.earned, b + Math.round(b * 0.25));
    // 第十八期：越後的季，沉下去的越多
    const s3 = run({ chapter: 'c3' });
    s3.nightLog = s.nightLog; s3.reviewsPassed = 1;
    assert.equal(SV.earn(s3, 'archived').total, b + Math.round(b * (D.CHAPTERS.find((c) => c.id === 'c3').sediment - 1)));
    const sf = run();
    sf.nightLog = s.nightLog; sf.reviewsPassed = 1;
    assert.equal(SV.earn(sf, 'archived').total, b + Math.round(b * (D.ECON16.freeSediment - 1)));
  });

  t.test('開局：多帶素材、閃卡、錢、火花、靈魂、起承轉合的等級', () => {
    const base = run();
    const s = run({ salvage: { startCards: 2, startFoil: 1, startCash: 15, startSpark: 0.2, startSoul: -1, fullLevel: 1 } });
    assert.equal(s.cards.length, base.cards.length + 2);
    assert.equal(s.cards.filter((c) => c.from && c.from.kind === 'salvage').length, 2);
    assert.ok(s.cards.some((c) => c.foil));
    assert.equal(s.cr, base.cr + 15);
    assert.equal(s.spark, Math.round((base.spark + 0.2) * 10) / 10);
    assert.equal(s.soul, Math.max(0, Math.round((base.soul - 1) * 10) / 10));
    assert.equal(s.forms.full, 2);
  });

  t.test('白天：換一批半價、每輪第一次免費；物件折扣；素材包多一個選擇', () => {
    const s = run();
    RD.offer(s);
    const full = RD.offerCost(s);
    const h = run({ salvage: { rerollDisc: 0.5 } });
    RD.offer(h);
    assert.equal(RD.offerCost(h), Math.round(full * 0.5));
    const f = run({ salvage: { freeReroll: 1 } });
    f.cr = 9999;
    RD.offer(f);
    assert.equal(RD.offerCost(f), 0);
    assert.ok(RD.rerollOffer(f).ok);
    assert.ok(RD.offerCost(f) > 0, '同一輪第二次要收錢');
    const objId = D.OBJECTS.find((o) => o.rarity === 'common' && !o.npc && !o.start).id;
    const d = run({ salvage: { shopDisc: 0.15 } });
    assert.equal(RD.price(d, 'obj:' + objId), Math.round(RD.price(s, 'obj:' + objId) * 0.85));
  });

  t.test('靈魂：上限多 1 克；告解每輪一次；逃兵的暗號免扣一次機會', () => {
    const s = run({ salvage: { soulLimit: 1, confess: 1, saveChance: 1 } });
    assert.equal(R.soulLimit(s), D.SOUL_LIMIT + 1);
    s.soul = 5;
    s.phase = 'day';
    assert.ok(RD.canConfess(s));
    const rep = RD.confess(s);
    assert.ok(rep);
    assert.equal(s.soul, 4);
    assert.equal(RD.canConfess(s), false);
    assert.equal(RD.confess(s), null);
    const before = s.chances;
    RD.loseChance(s, 'night');
    assert.equal(s.chances, before);
    RD.loseChance(s, 'night');
    assert.equal(s.chances, before - 1);
    const plain = run();
    assert.equal(R.soulLimit(plain), D.SOUL_LIMIT);
  });

  t.test('每輪開始：天台派對加火花，沉船貨櫃送一個打撈包，水塔令火花回到 ×1', () => {
    const s = run({ salvage: { roundSpark: 0.1, roundPack: 1, sparkFloor: 1 } });
    s.night = 3; s.day = 12; s.phase = 'shop';
    s.spark = 0.6;
    const n = s.cards.length;
    RD.advance(s);
    assert.equal(s.night, 4);
    assert.ok(s.spark >= 1);
    assert.equal(s.cards.length, n + 1);
    assert.equal(s.packQueue.length, 1);
    assert.equal(s.packQueue[0].kind, 'salvage');
  });

  t.test('創作桌：每晚第一筆籌碼多 30；改稿多一次', () => {
    const plain = run();
    const s = run({ salvage: { firstChips: 30, discards: 1 } });
    [plain, s].forEach((x) => { x.phase = 'night'; RD.startNight(x); });
    assert.equal(s.session.discards, plain.session.discards + 1);
    const uids = s.session.hand.slice(0, 3);
    const a = C.scorePlay(s, uids);
    assert.ok(a.steps.some((x) => x.t === 'salvage' && x.chips === 30));
  });

  t.test('舊模式：舊城的參數不影響經典模式', () => {
    const s = t.run({ mode: 'standard', bg: 'copywriter', seed: 11, salvage: { startCards: 2, startCash: 15 } });
    const b = t.run({ mode: 'standard', bg: 'copywriter', seed: 11 });
    assert.equal(s.cards.length, b.cards.length);
    assert.equal(s.cr, b.cr);
  });
};
