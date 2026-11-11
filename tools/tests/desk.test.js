// 創作桌規則核心的檢查（由 Claude 維護）：game/js/desk.js 必須符合第十六期總規格 §10。
// 實作工單不可以修改這個檔案，也不可以修改 desk.js 的規則（數值只在 D.DESK 校準）。
module.exports = (t) => {
  const { IE, D, assert } = t;
  const K = IE.Desk;
  let uid = 1;
  const c = (tags, medium) => ({ uid: uid++, id: 'x' + uid, tags: tags.split('+'), medium: medium || 'paper' });
  const opp = (tag) => D.WHEEL[(D.WHEEL.indexOf(tag) + 5) % 10];
  const next = (tag) => D.WHEEL[(D.WHEEL.indexOf(tag) + 1) % 10];
  t.test('創作桌：相同是承，相鄰是承，相對是轉，其餘是斷', () => {
    assert.equal(K.rel(c('warmth'), c('warmth+water')), 'same');
    assert.equal(K.rel(c('warmth'), c(next('warmth'))), 'near');
    assert.equal(K.rel(c('warmth'), c(opp('warmth'))), 'zhuan');
    assert.equal(K.rel(c('warmth'), c(D.WHEEL[3])), 'duan');
  });
  t.test('創作桌：沒有色輪情緒的外來素材和任何素材都接得上', () => {
    assert.equal(K.rel(c('ancient+cosmic'), c('anger')), 'near');
    assert.equal(K.analyze([c('warmth'), c('ancient'), c(D.WHEEL[3])]).len, 3);
  });
  t.test('創作桌：先承、後轉、再合是起承轉合', () => {
    const a = 'warmth', A = K.analyze([c(a), c(a), c(opp(a)), c(opp(a) + '+' + a)]);
    assert.equal(A.id, 'full');
    assert.equal(A.he, true);
    assert.deepEqual(K.roles(A), ['qi', 'cheng', 'zhuan', 'he']);
  });
  t.test('創作桌：全部帶同一種情緒是獨白', () => {
    assert.equal(K.analyze([c('hope'), c('hope+water'), c('hope')]).id, 'mono');
  });
  t.test('創作桌：斷開之後只計最長的一段，一樣長取後面的', () => {
    const A = K.analyze([c('warmth'), c('warmth'), c(D.WHEEL[3]), c(D.WHEEL[3])]);
    assert.equal(A.len, 2);
    assert.equal(A.s, 2);
    assert.equal(K.analyze([c('warmth'), c(D.WHEEL[3])]).id, 'single');
  });
  t.test('創作桌：夥伴可以把斷修成承', () => {
    const A = K.analyze([c('warmth'), c(D.WHEEL[3]), c(D.WHEEL[3])], { repair: 1 });
    assert.equal(A.len, 3);
    assert.equal(A.links[0], 'fix');
  });
  t.test('創作桌：45 種複合情緒都有名字，家族按色輪的距離', () => {
    let n = 0;
    D.WHEEL.forEach((a, i) => D.WHEEL.slice(i + 1).forEach((b) => {
      const p = K.pairOf(a, b);
      assert.ok(K.PAIRS[p.key], a + '+' + b + ' 有名字');
      assert.equal(p.fam.id, ['', 'blend', 'layer', 'echo', 'tension', 'paradox'][K.wdist(a, b)]);
      n++;
    }));
    assert.equal(n, 45);
  });
  t.test('創作桌：結構的步驟只有第一個轉 ×2，合 ×2，起承轉合再 ×1.5', () => {
    const a = 'warmth', A = K.analyze([c(a), c(a), c(opp(a)), c(a), c(opp(a) + '+' + a)]);
    const st = K.structSteps(A);
    assert.equal(st.filter((x) => x.t === 'link' && x.xmult === D.DESK.zhuan).length, 1);
    assert.equal(st.filter((x) => x.t === 'he').length, 1);
    assert.equal(st[st.length - 1].t, 'title');
  });
  t.test('創作桌：主調出現三次以上有題材加成；三種媒材以上有合奏', () => {
    const A = K.analyze([c('hope', 'paper'), c('hope', 'sound'), c('hope', 'image')]);
    assert.equal(K.subjectOf(A.run).bonus, D.DESK.subject[3]);
    assert.equal(K.mediaBonus(A), D.DESK.media[3]);
  });
  t.test('創作桌：主遊戲每一張素材都對應到存在的圖，同一張卡永遠是同一張圖', () => {
    Object.keys(D.CARDS).forEach((id) => {
      const card = Object.assign({ id }, D.CARDS[id]);
      const a = K.artOf(card);
      assert.ok(a && D.ART.a[a.face] && D.ART.a[a.mid], id + ' 有卡面和中景');
      assert.deepEqual(K.artOf(card), a);
    });
  });
  t.test('創作桌：舊配色的每個 id 都有對應的結構', () => {
    D.FORMS.forEach((f) => assert.ok(K.STRUCT[D.DESK.formMap[f.id]], f.id));
  });
};
