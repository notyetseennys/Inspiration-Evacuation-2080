// 第十四期：情緒色輪、星級與打磨（示範：之後每張工單都要照這個格式加測試）
module.exports = (t) => {
  const { C, assert } = t;
  const mk = (tags, value) => ({ tags, value: value || 12 });
  const form = (...cards) => C.detectForm(cards).id;

  t.test('色輪：人情＋機械是互補色', () => assert.equal(form(mk(['warmth']), mk(['machine'])), 'comp'));
  t.test('色輪：三張水是單色', () => assert.equal(form(mk(['water']), mk(['water']), mk(['water'])), 'mono'));
  t.test('色輪：單色少於三張只是草稿', () => assert.equal(form(mk(['water']), mk(['water'])), 'mix'));
  t.test('色輪：水・記憶＋希望是鄰近色', () => assert.equal(form(mk(['water', 'memory']), mk(['hope'])), 'adj'));
  t.test('色輪：人情、記憶、愧疚是三色', () => assert.equal(form(mk(['warmth']), mk(['memory']), mk(['guilt'])), 'triad'));
  t.test('色輪：兩對互補是四色', () => assert.equal(form(mk(['warmth', 'machine']), mk(['hope', 'guilt'])), 'tetrad'));
  t.test('色輪：三張「人情・機械」是矛盾', () => assert.equal(form(mk(['warmth', 'machine']), mk(['warmth', 'machine']), mk(['warmth', 'machine'])), 'paradox'));
  t.test('色輪：草稿只計最亮的一張', () => {
    const F = C.detectForm([mk(['warmth', 'water']), mk(['rebel'], 30), mk(['anger', 'neon'])]);
    assert.equal(F.id, 'mix');
    assert.equal(F.scoring.length, 1);
    assert.equal(F.scoring[0].value, 30);
  });
  t.test('星級：按籌碼換算，極稀有一律 ★5', () => {
    assert.equal(C.starOf({ value: 10 }), 1);
    assert.equal(C.starOf({ value: 20 }), 2);
    assert.equal(C.starOf({ value: 30 }), 3);
    assert.equal(C.starOf({ value: 40 }), 4);
    assert.equal(C.starOf({ value: 12, rarity: 'legend' }), 5);
    assert.equal(C.starOf({ value: 10, star: 4 }), 4);
  });
  t.test('打磨：升一星並扣錢，★5 不能再打磨', () => {
    const s = t.run();
    const c = s.cards.find((x) => C.starOf(x) < 5);
    const st0 = C.starOf(c), cost = C.polishCost(s, c);
    s.cr = cost + 5;
    const r = C.polishStar(s, c.uid);
    assert.ok(r.ok, r.msg);
    assert.equal(C.starOf(c), st0 + 1);
    assert.equal(s.cr, 5);
    c.star = 5;
    assert.equal(C.polishStar(s, c.uid).ok, false);
  });
};
