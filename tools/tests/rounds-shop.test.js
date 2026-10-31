// 第十五期（WO-15-04）：市集的規則（物件、素材包、工作室服務、技法課、遺物）單元測試。
'use strict';

module.exports = (t) => {
  const { IE, D, C, assert } = t;
  const Rounds = IE.Rounds;

  const mkShop = (opts) => {
    const s = t.run(Object.assign({ mode: 'rounds' }, opts || {}));
    s.phase = 'shop';
    s.cr = 1000;
    return s;
  };

  t.test('市集：內容', () => {
    const s = mkShop();
    // 不是 'shop' 時回傳 null
    s.phase = 'day';
    assert.equal(Rounds.shopOpen(s), null);
    s.phase = 'shop';

    const sh1 = Rounds.shopOpen(s);
    assert.ok(sh1);
    assert.equal(sh1.objs.length, 2);
    assert.equal(sh1.packs.length, 2);
    assert.equal(new Set(sh1.packs).size, 2);
    assert.ok(['polish', 'burn', 'copy'].includes(sh1.service));
    assert.ok(sh1.tech && C.FORM[sh1.tech]);
    assert.ok(sh1.tool && IE.Stages.TOOL[sh1.tool]);
    assert.equal(sh1.relic, null);

    const s3 = mkShop();
    s3.night = 3;
    s3.day = 12;
    const sh3 = Rounds.shopOpen(s3);
    assert.ok(sh3.relic);
    assert.equal(sh3.relic.items.length, 3);
    assert.equal(sh3.relic.taken, false);
  });

  t.test('市集：服務輪流', () => {
    const s = mkShop();
    s.night = 1;
    s.shop = null;
    assert.equal(Rounds.shopOpen(s).service, 'burn');
    s.night = 2;
    s.shop = null;
    assert.equal(Rounds.shopOpen(s).service, 'copy');
    s.night = 3;
    s.shop = null;
    assert.equal(Rounds.shopOpen(s).service, 'polish');
  });

  t.test('市集：買物件', () => {
    const s = mkShop();
    const sh = Rounds.shopOpen(s);
    const id1 = sh.objs[0];
    const id2 = sh.objs[1];
    const p1 = Rounds.price(s, 'obj:' + id1);
    const cr0 = s.cr;
    const r1 = Rounds.shopBuy(s, 'obj:' + id1);
    assert.equal(r1.ok, true);
    assert.ok(s.objects.includes(id1) || s.objStash.includes(id1));
    assert.equal(s.cr, cr0 - p1);
    assert.deepEqual(sh.objs, [id2]);

    s.cr = 0;
    const objsBefore = s.objects.slice();
    const stashBefore = s.objStash.slice();
    const r2 = Rounds.shopBuy(s, 'obj:' + id2);
    assert.equal(r2.ok, false);
    assert.equal(s.cr, 0);
    assert.deepEqual(sh.objs, [id2]);
    assert.deepEqual(s.objects, objsBefore);
    assert.deepEqual(s.objStash, stashBefore);
  });

  t.test('市集：素材包', () => {
    const s = mkShop();
    const sh = Rounds.shopOpen(s);
    const pid = sh.packs[0];
    const pCost = Rounds.price(s, 'pack:' + pid);
    const cr0 = s.cr;
    const deck0 = s.cards.length;
    const r = Rounds.shopBuy(s, 'pack:' + pid);
    assert.equal(r.ok, true);
    assert.equal(s.cr, cr0 - pCost);
    assert.ok(s.pack);
    assert.equal(s.pack.cards.length, 3);
    assert.equal(new Set(s.pack.cards.map((c) => c.id)).size, 3);

    // 選卡之前不能離開市集
    assert.equal(Rounds.leaveShop(s).ok, false);

    const pickRes = Rounds.packPick(s, 1);
    assert.equal(pickRes.ok, true);
    assert.equal(s.cards.length, deck0 + 1);
    assert.ok(pickRes.card.star >= 1 && pickRes.card.star <= 5);
    assert.equal(s.pack, null);
  });

  t.test('市集：打磨', () => {
    const s = mkShop();
    s.night = 3;
    Rounds.shopOpen(s);
    const c = s.cards.find((x) => !x.guilt);
    c.star = 1;
    const cr0 = s.cr;
    const b = Rounds.shopBuy(s, 'service');
    assert.equal(b.ok, true);
    assert.equal(s.cr, cr0);
    const p = Rounds.pickCard(s, c.uid);
    assert.equal(p.ok, true);
    assert.equal(s.cr, cr0 - D.ECON.polish[1]);
    assert.equal(c.star, 2);
    assert.equal(s.pick, null);
  });

  t.test('市集：燒掉有下限', () => {
    const s = mkShop();
    s.night = 1;
    Rounds.shopOpen(s);
    s.cards = s.cards.slice(0, D.ECON.minDeck);
    assert.equal(Rounds.shopBuy(s, 'service').ok, true);
    const failRes = Rounds.pickCard(s, s.cards[0].uid);
    assert.equal(failRes.ok, false);
    assert.equal(s.cards.length, D.ECON.minDeck);

    // 取消可退錢，再測試多一張時成功
    const crBeforeCancel = s.cr;
    assert.equal(Rounds.cancelPick(s).ok, true);
    assert.equal(s.cr, crBeforeCancel + D.ECON.burn);

    t.R.addCard(s, Object.keys(D.CARDS)[0]);
    const lenBefore = s.cards.length;
    assert.equal(lenBefore, D.ECON.minDeck + 1);
    assert.equal(Rounds.shopBuy(s, 'service').ok, true);
    const okRes = Rounds.pickCard(s, s.cards[0].uid);
    assert.equal(okRes.ok, true);
    assert.equal(s.cards.length, lenBefore - 1);
    assert.equal(s.pick, null);
  });

  t.test('市集：複印', () => {
    const s = mkShop();
    s.night = 2;
    Rounds.shopOpen(s);
    const orig = s.cards[0];
    orig.star = 3;
    orig.wear = 2;
    orig.mod = 'shine';
    assert.equal(Rounds.shopBuy(s, 'service').ok, true);
    const res = Rounds.pickCard(s, orig.uid);
    assert.equal(res.ok, true);
    const copy = res.card;
    assert.ok(copy);
    assert.notEqual(copy.uid, orig.uid);
    assert.deepEqual(copy.tags, orig.tags);
    assert.equal(C.starOf(copy), C.starOf(orig));
    assert.equal(copy.wear, 0);
    assert.equal(copy.mod, 'shine');
    assert.ok(copy.name.endsWith('（副本）'));
  });

  t.test('市集：技法課越來越貴', () => {
    const s = mkShop();
    const sh = Rounds.shopOpen(s);
    const fid = sh.tech;
    const lv0 = s.forms[fid] || 1;
    const p1 = Rounds.price(s, 'tech');
    const r = Rounds.shopBuy(s, 'tech');
    assert.equal(r.ok, true);
    assert.equal(s.forms[fid], lv0 + 1);
    const p2 = Rounds.price(s, 'tech');
    assert.equal(p2, p1 + D.ECON.techStep);
  });

  t.test('市集：遺物只可以拿一件', () => {
    const s = mkShop();
    s.night = 3;
    s.day = 12;
    const sh = Rounds.shopOpen(s);
    const cr0 = s.cr;
    const r1 = Rounds.shopBuy(s, 'relic:' + sh.relic.items[0]);
    assert.equal(r1.ok, true);
    assert.equal(s.cr, cr0);
    assert.equal(sh.relic.taken, true);

    const r2 = Rounds.shopBuy(s, 'relic:' + sh.relic.items[1]);
    assert.equal(r2.ok, false);
    assert.equal(s.cr, cr0);
  });

  t.test('市集：重抽越來越貴', () => {
    const s = mkShop();
    Rounds.shopOpen(s);
    const cr0 = s.cr;
    const r1 = Rounds.objReroll(s);
    assert.equal(r1.ok, true);
    assert.equal(s.cr, cr0 - 20);
    const r2 = Rounds.objReroll(s);
    assert.equal(r2.ok, true);
    assert.equal(s.cr, cr0 - 20 - 30);
  });

  t.test('市集：第一局保證稀有', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = mkShop({ seed, meta: { runs: 0 } });
      const sh = Rounds.shopOpen(s);
      assert.equal(sh.objs.some((id) => D.OBJ[id] && D.OBJ[id].rarity === 'rare'), true);
    }
  });

  t.test('市集：離開', () => {
    const s1 = mkShop();
    Rounds.shopOpen(s1);
    const l1 = Rounds.leaveShop(s1);
    assert.equal(l1.ok, true);
    assert.equal(s1.night, 2);
    assert.equal(s1.phase, 'day');

    const s3 = mkShop();
    s3.night = 3;
    s3.day = 12;
    Rounds.shopOpen(s3);
    const l3 = Rounds.leaveShop(s3);
    assert.equal(l3.ok, true);
    assert.equal(s3.phase, 'review');
  });

  t.test('市集：滿了不能買、不會刷錢', () => {
    const s = mkShop();
    const sh = Rounds.shopOpen(s);
    const targetId = sh.objs[0];
    const fillPool = D.OBJECTS.filter((o) => o.id !== targetId && !s.objects.includes(o.id)).map((o) => o.id);
    while (s.objects.length < t.R.slotsOf(s)) s.objects.push(fillPool.shift());
    s.objStash = fillPool.slice(0, 4);

    const cr0 = s.cr;
    const objs0 = s.objects.slice();
    const stash0 = s.objStash.slice();
    const res = Rounds.shopBuy(s, 'obj:' + targetId);
    assert.equal(res.ok, false);
    assert.equal(s.cr, cr0);
    assert.deepEqual(s.objects, objs0);
    assert.deepEqual(s.objStash, stash0);
    assert.equal(sh.objs.includes(targetId), true);
  });
};
