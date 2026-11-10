// 小遊戲抉擇內容的檢查（由 Claude 維護）：game/js/data-stance.js 必須符合第十六期總規格第四節。
// 實作工單不可以修改這個檔案，也不可以修改 data-stance.js。
module.exports = (t) => {
  const { D, assert } = t;
  const MICROS = ['label', 'delivery', 'clinic', 'salvage', 'haggle', 'farm', 'smile', 'dive', 'busk', 'garden'];
  const STANCES = ['comply', 'resist', 'care'];
  const MEDIA = ['paper', 'sound', 'image', 'body', 'data'];
  t.test('抉擇：十個小遊戲都有三張卡和三句結語', () => {
    assert.ok(D.STANCE, 'D.STANCE 存在');
    assert.deepEqual(Object.keys(D.STANCE).sort(), MICROS.slice().sort());
    MICROS.forEach((m) => {
      const s = D.STANCE[m];
      assert.ok(s.name && s.dilemma, m + '：有名稱和兩難');
      STANCES.forEach((k) => {
        const c = s[k];
        assert.ok(c && c.name, m + '.' + k + '：有卡');
        assert.equal(c.tags.length, 2, m + '.' + k + '：兩種情緒');
        c.tags.forEach((x) => assert.ok(D.WHEEL.includes(x), m + '.' + k + '：情緒 ' + x + ' 在色輪上'));
        assert.notEqual(c.tags[0], c.tags[1], m + '.' + k + '：兩種情緒不同');
        assert.ok(MEDIA.includes(c.medium), m + '.' + k + '：媒材');
        assert.ok(c.value >= 16 && c.value <= 26 && c.star >= 1 && c.star <= 2, m + '.' + k + '：價值和星級');
        const line = s.lines[k];
        assert.ok(typeof line === 'string' && line.length >= 20 && line.length <= 90, m + '.' + k + '：結語 20 至 90 字（' + (line || '').length + '）');
        assert.ok(/。$/.test(line), m + '.' + k + '：結語以句號結束');
      });
    });
  });
  t.test('抉擇：三十張卡的名字不重複，也不和素材卡重名', () => {
    const names = [];
    Object.values(D.STANCE).forEach((s) => STANCES.forEach((k) => names.push(s[k].name)));
    assert.equal(new Set(names).size, 30);
    const taken = new Set(Object.values(D.CARDS).map((c) => c.name));
    names.forEach((n) => assert.ok(!taken.has(n), '和素材卡重名：' + n));
  });
  t.test('抉擇：照做的卡最弱，為別人的卡最強', () => {
    Object.entries(D.STANCE).forEach(([m, s]) => {
      assert.ok(s.comply.value < s.resist.value && s.resist.value < s.care.value, m);
    });
  });
  t.test('抉擇：立場的文字和總規格逐字相同', () => {
    assert.deepEqual(D.STANCE_TEXT, { comply: '你照做了。', resist: '你沒有照做。', care: '你為了一個人，放棄了今天的成績。', auto: '你沒有親手做，系統替你照規定完成了。' });
  });
};
