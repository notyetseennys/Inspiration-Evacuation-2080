// 第十七期：撕開（閃卡、重複升星）。由 Claude 維護。
module.exports = (t) => {
  const { IE, D, R, C, assert } = t;
  const run = (o) => t.run(Object.assign({ mode: 'rounds', bg: 'copywriter', seed: 21 }, o || {}));
  const freshId = (s, i) => (D.DESK_IDS || Object.keys(D.CARDS)).filter((id) => !s.cards.some((c) => c.id === id))[i || 0];

  t.test('重複：同一張素材由市集再得到，原來那張升一星，素材庫不會多一張', () => {
    const s = run();
    const id = freshId(s);
    const a = R.addCard(s, id, { kind: 'shop' });
    const n = s.cards.length;
    const star = C.starOf(a.card);
    const b = R.addCard(s, id, { kind: 'story', x: '測試' });
    assert.equal(b.dup, true);
    assert.equal(b.card.uid, a.card.uid);
    assert.equal(s.cards.length, n);
    assert.equal(C.starOf(b.card), Math.min(5, star + 1));
    assert.equal(b.card.echoes, 1);
    assert.equal(b.card.echo.to, Math.min(5, star + 1));
    assert.equal(b.card.from.kind, 'shop', '來歷保持第一次得到時的');
  });

  t.test('重複：舊碼頭的網令重複升兩星；最多 ★5', () => {
    const s = run({ salvage: { dupStar: 1 } });
    const id = freshId(s);
    const a = R.addCard(s, id, { kind: 'shop' });
    a.card.star = 2;
    R.addCard(s, id, { kind: 'shop' });
    assert.equal(a.card.star, 4);
    R.addCard(s, id, { kind: 'shop' });
    assert.equal(a.card.star, 5);
  });

  t.test('重複：開局的行李和工作室做出來的東西不會合併', () => {
    const s = run();
    const id = freshId(s);
    R.addCard(s, id, { kind: 'start' });
    const n = s.cards.length;
    R.addCard(s, id, { kind: 'start' });
    R.addCard(s, id, { kind: 'craft' });
    assert.equal(s.cards.length, n + 2);
  });

  t.test('閃卡：同一局同一張卡永遠相同；機會大約是 5%；計分時籌碼 ×1.5', () => {
    const ids = (D.DESK_IDS || []).slice(0, 60);
    const roll = (seed) => {
      const s = run({ seed });
      return ids.map((id) => R.addCard(s, id, { kind: 'craft' })).map(() => 0) && s.cards.filter((c) => c.foil).map((c) => c.uid).join(',');
    };
    assert.equal(roll(5), roll(5));
    let foils = 0, total = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = run({ seed });
      const start = s.cards.length;
      ids.forEach((id) => R.addCard(s, id, { kind: 'shop' }));
      s.cards.slice(start).forEach((c) => { total++; if (c.foil) foils++; });
    }
    const rate = foils / total;
    assert.ok(rate > 0.025 && rate < 0.08, '閃卡比例 ' + rate.toFixed(3));
    const s = run();
    const c = R.addCard(s, freshId(s), { kind: 'craft' }).card;
    const plain = C.cardValue(s, c);
    c.foil = true;
    assert.equal(C.cardValue(s, c), Math.round(plain * D.PACK16.foilChips) || C.cardValue(s, c));
    assert.ok(C.cardValue(s, c) > plain);
  });

  t.test('閃卡：閃光燈令機會加倍', () => {
    let a = 0, b = 0;
    const ids = (D.DESK_IDS || []).slice(0, 60);
    for (let seed = 1; seed <= 30; seed++) {
      const s1 = run({ seed });
      const s2 = run({ seed, salvage: { foilX: 1 } });
      const n1 = s1.cards.length, n2 = s2.cards.length;
      ids.forEach((id) => { R.addCard(s1, id, { kind: 'shop' }); R.addCard(s2, id, { kind: 'shop' }); });
      a += s1.cards.slice(n1).filter((c) => c.foil).length;
      b += s2.cards.slice(n2).filter((c) => c.foil).length;
    }
    assert.ok(b > a * 1.5, '加倍之後 ' + b + '，之前 ' + a);
  });

  t.test('閃卡：序章的卡和工作室做出來的東西永遠不是閃卡', () => {
    const ids = (D.DESK_IDS || []).slice(0, 60);
    for (let seed = 1; seed <= 20; seed++) {
      const s = run({ seed });
      const n = s.cards.length;
      ids.forEach((id) => { R.addCard(s, id, { kind: 'prologue' }); R.addCard(s, id, { kind: 'craft' }); });
      assert.ok(!s.cards.slice(n).some((c) => c.foil), '種子 ' + seed);
    }
  });

  t.test('收藏：得到過的素材記在 s.seenCards，閃卡記作 2', () => {
    const s = run();
    const id = freshId(s);
    const c = R.addCard(s, id, { kind: 'craft' }).card;
    assert.ok(s.seenCards[id] >= 1);
    R.markFoil(s, c);
    assert.equal(s.seenCards[id], 2);
  });

  t.test('舊模式：沒有閃卡，同一張素材照舊多一張', () => {
    const s = t.run({ mode: 'standard', bg: 'copywriter', seed: 21 });
    const id = Object.keys(D.CARDS)[3];
    const n = s.cards.length;
    R.addCard(s, id); R.addCard(s, id);
    assert.equal(s.cards.length, Math.min(n + 2, R.MAX_CARDS));
    assert.ok(!s.cards.some((c) => c.foil));
  });
};
