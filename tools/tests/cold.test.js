// WO-16-07：寒潮季（第十七期起是第五季「急凍」的系統，開關 cold）。測試名稱照工單。
module.exports = (t) => {
  const { IE, D, R, assert } = t;
  if (!IE.Cards) require('../../game/js/cards.js');
  if (!IE.Flood) require('../../game/js/flood.js');
  const RD = IE.Rounds;
  const run = (o) => t.run(Object.assign({ mode: 'rounds', bg: 'copywriter', seed: 5 }, o || {}));
  // 一直推進，直到換季；回傳新的季節（最多 20 晚）
  const nextSeason = (s) => {
    const from = s.season;
    for (let i = 0; i < 20 && s.season === from; i++) RD.advance(s);
    return s.season;
  };

  t.test('寒潮：五輪模式的季節次序是 storm、heat、acid、cold', () => {
    assert.deepEqual(D.SEASON_ORDER16, ['storm', 'heat', 'acid', 'cold']);
    const s = run({ season: 'acid' });
    assert.equal(nextSeason(s), 'cold', '全城篩選有寒潮系統：酸雨季之後是寒潮季');
    assert.equal(nextSeason(s), 'storm', '寒潮季之後回到風暴季');
  });

  t.test('寒潮：開局不會是寒潮季', () => {
    assert.ok(!D.SEASON_ORDER.includes('cold'));
    for (let seed = 1; seed <= 30; seed++) {
      const d = IE.Meta.daily('2026-11-' + String((seed % 28) + 1).padStart(2, '0') + '#' + seed);
      assert.ok(D.SEASON_ORDER.includes(d.season), '每日挑戰的季節 ' + d.season);
    }
    const w = IE.Meta.weekly('2026-W48');
    assert.ok(D.SEASON_ORDER.includes(w.season));
  });

  t.test('寒潮：寒潮季水位不升，floodRun 不增加', () => {
    const s = run({ season: 'cold' });
    s.night = 1; s.day = RD.dayOfNight(1);
    const w0 = s.water;
    RD.advance(s);
    assert.equal(s.season, 'cold');
    assert.equal(s.water, w0, '寒潮季水位不升');
    // 已經淹了的維持原來的階段
    const f = run({ season: 'cold' });
    IE.Flood.ensure(f);
    f.floor = 1; f.water = 3; f.floodRun = 1;
    IE.Flood.tick(f);
    assert.equal(f.floodRun, 1, '寒潮季 floodRun 不增加');
    const g = run({ season: 'storm' });
    IE.Flood.ensure(g);
    g.floor = 1; g.water = 3; g.floodRun = 1;
    IE.Flood.tick(g);
    assert.equal(g.floodRun, 2, '其他季節照常惡化');
  });

  t.test('寒潮：寒潮季沒有潛水的卡', () => {
    const s = run({ season: 'cold' });
    assert.ok(!RD.cardList(s).includes('dive'));
    const w = run({ season: 'storm' });
    assert.ok(RD.cardList(w).includes('dive'), '其他季節有潛水');
  });

  t.test('寒潮：換季時融冰，水位加 thaw', () => {
    const s = run({ season: 'acid' });
    nextSeason(s);
    assert.equal(s.season, 'cold');
    const w0 = s.water;
    nextSeason(s);
    assert.equal(s.season, 'storm');
    assert.ok(Math.abs(s.water - Math.min(8.5, w0 + D.ECON16.thaw)) < 1e-9, '融冰：水位 ' + w0 + ' → ' + s.water);
    assert.equal(s.thawNight, s.night);
  });

  t.test('寒潮：舊模式的季節次序不變，不會進入寒潮季', () => {
    assert.deepEqual(D.SEASON_ORDER, ['storm', 'heat', 'acid']);
    const s = t.run({ mode: 'standard', season: 'acid' });
    assert.equal(s.season, 'acid');
    assert.ok(!RD.on(s));
    RD.advance(s);
    assert.equal(s.season, 'acid', '五輪模式的推進不影響舊模式');
  });

  t.test('寒潮：只有有寒潮系統的季（第五季、全城篩選）才會進入寒潮季', () => {
    const c4 = run({ season: 'acid', chapter: 'c4' });
    assert.ok(!IE.Chapters.feat(c4, 'cold'));
    assert.equal(nextSeason(c4), 'storm', '第四季沒有寒潮：酸雨季之後是風暴季');
    const c5 = run({ season: 'acid', chapter: 'c5' });
    assert.ok(IE.Chapters.feat(c5, 'cold'));
    assert.equal(nextSeason(c5), 'cold');
    assert.equal(IE.Chapters.get('c5').collector, 'purge');
    assert.ok(D.STORY.species.purge.why && D.STORY.species.purge.fate.includes('{npc}'));
  });

  t.test('資料：D.SEASONS.cold 和三種天氣和總規格逐字相同', () => {
    assert.deepEqual(D.SEASONS.cold, {
      name: '寒潮季', desc: '洋流停了。水面結冰，水位暫時不升；甚麼都貴，甚麼都冷。',
      water: 0, food: 45, nightBody: -4, outdoorBody: -3, labelPay: 1.1, diveRelics: 0,
      sky: ['#0e1a2b', '#3a5a7a'], tint: '#bfe6ff', weather: 'cold',
    });
    const pick = (id) => D.WEATHER.find((w) => w.id === id);
    const want = [
      ['sleet', '凍雨', 3, '凍雨。雨傘會結冰，請勿用來指向他人。'],
      ['heavysnow', '大雪', 3, '浮城下雪了。上一次下雪的記錄，氣象局已經隨舊辦公室一併淹沒。'],
      ['icelock', '冰封', 2, '海面全面結冰。水位局今日休息：水位沒有變化，本局沒有可以發佈的數字。'],
    ];
    want.forEach(([id, name, w, forecast]) => {
      const x = pick(id);
      assert.ok(x, '沒有天氣 ' + id);
      assert.equal(x.name, name);
      assert.equal(x.kind, 'normal');
      assert.equal(x.w, w);
      assert.deepEqual(x.mods, {});
      assert.equal(x.vis, id);
      assert.deepEqual(x.seasons, ['cold']);
      assert.equal(x.forecast, forecast);
    });
    assert.equal(D.WEATHER.filter((w) => w.id === 'snow').length, 1, 'id 不可以重複（snow 是熱帶落雪）');
    assert.equal(D.FLOOD_TEXT.thaw, '冰融了。水位局表示，這是「季節性補償」。');
  });
};
