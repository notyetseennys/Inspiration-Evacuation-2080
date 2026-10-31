// WO-15-04 審核時補充的測試（Claude）
module.exports = (t) => {
  const { IE, D, assert } = t;
  const Q = IE.Rounds;
  const openMany = (pid, n) => {
    const cards = [];
    for (let seed = 1; seed <= n; seed++) {
      const s = t.run({ mode: 'rounds', seed });
      s.phase = 'shop';
      s.cr = 999;
      Q.shopOpen(s);
      s.shop.packs = [pid, 'flood'];
      const r = Q.shopBuy(s, 'pack:' + pid);
      assert.ok(r.ok, r.msg);
      cards.push(...s.pack.cards);
    }
    return cards;
  };

  t.test('市集：遠方包的極稀有很少', () => {
    const cards = openMany('far', 300);
    const share = cards.filter((c) => D.CARDS[c.id].rarity === 'legend').length / cards.length;
    assert.ok(share > 0.005 && share < 0.07, '極稀有的比例 ' + (share * 100).toFixed(1) + '%');
    cards.forEach((c) => assert.ok(D.CARDS[c.id].origin && D.CARDS[c.id].origin !== 'home'));
    cards.filter((c) => D.CARDS[c.id].rarity === 'legend').forEach((c) => assert.equal(c.star, 5));
  });

  t.test('市集：普通素材包沒有極稀有', () => {
    ['flood', 'sky', 'street', 'under'].forEach((pid) => {
      openMany(pid, 60).forEach((c) => assert.notEqual(D.CARDS[c.id].rarity, 'legend', pid));
    });
  });
};
