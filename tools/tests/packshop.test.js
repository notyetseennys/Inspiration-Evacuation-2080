// 第十九期：市集的素材包「選一燒一」或跳過。由 Claude 維護。
'use strict';

module.exports = (t) => {
  const { IE, D, assert } = t;
  const RD = IE.Rounds;
  // 開一局、進入市集、買第一個素材包
  const openShopPack = (o) => {
    const s = t.run(Object.assign({ mode: 'rounds', bg: 'copywriter', seed: 31 }, o || {}));
    s.phase = 'shop';
    s.cr = 5000;
    const sh = RD.shopOpen(s);
    const pid = sh.packs[0];
    const before = s.cr;
    const r = RD.shopBuy(s, 'pack:' + pid);
    assert.ok(r.ok, r.msg);
    return { s, pid, paid: before - s.cr };
  };

  t.test('素材包：買包記下付了多少；跳過拿回一半，包收起', () => {
    const { s, paid } = openShopPack();
    assert.ok(paid > 0);
    assert.equal(s.pack.paid, paid);
    const cr = s.cr;
    const r = RD.packSkip(s);
    assert.ok(r.ok);
    assert.equal(r.refund, Math.floor(paid * D.PACK16.skipRefund));
    assert.equal(s.cr, cr + r.refund);
    assert.equal(s.pack, null);
    assert.equal(RD.packSkip(s).ok, false, '沒有打開的包就不能跳過');
  });

  t.test('素材包：選一張同時燒掉一張，素材庫的張數不變（不是重複的素材）', () => {
    const { s } = openShopPack();
    const i = s.pack.cards.findIndex((pc) => !s.cards.some((c) => c.id === pc.id));
    assert.ok(i >= 0, '有一張不是重複的素材');
    const victim = s.cards.find((c) => !c.guilt);
    const n = s.cards.length;
    const r = RD.packPick(s, i, victim.uid);
    assert.ok(r.ok, r.msg);
    assert.equal(s.cards.length, n, '多一張、少一張');
    assert.ok(!s.cards.some((c) => c.uid === victim.uid), '燒掉的那一張不在素材庫');
    assert.ok(r.msg.includes('燒掉了'));
    assert.equal(s.stats.packBurns, 1);
  });

  t.test('素材包：不燒的時候和以前一樣（多一張）', () => {
    const { s } = openShopPack();
    const i = s.pack.cards.findIndex((pc) => !s.cards.some((c) => c.id === pc.id));
    const n = s.cards.length;
    assert.ok(RD.packPick(s, i).ok);
    assert.equal(s.cards.length, n + 1);
  });

  t.test('素材包：愧疚素材、會升星的那一張、素材庫太少，都不可以燒', () => {
    const a = openShopPack();
    const guilt = a.s.cards[0];
    guilt.guilt = true;
    assert.equal(RD.packPick(a.s, 0, guilt.uid).ok, false);
    assert.ok(a.s.pack, '失敗時包仍然打開');
    // 重複：包裏的第一張改成素材庫已經有的素材 → 選它會令原來那張升星，那一張不可以同時燒掉
    const b = openShopPack();
    const own = b.s.cards.find((c) => !c.guilt && !c.relic);
    b.s.pack.cards[0] = Object.assign({}, b.s.pack.cards[0], { id: own.id });
    const r = RD.packPick(b.s, 0, own.uid);
    assert.equal(r.ok, false);
    assert.equal(r.msg, D.PACK16.text.burnPicked);
    // 素材庫只剩最少的張數：選一張重複的（不會多一張），就不可以再燒
    const c = openShopPack();
    const keep = c.s.cards.slice(0, D.ECON.minDeck);
    c.s.cards = keep;
    c.s.pack.cards[0] = Object.assign({}, c.s.pack.cards[0], { id: keep[0].id });
    assert.equal(RD.packPick(c.s, 0, keep[1].uid).ok, false);
  });

};
