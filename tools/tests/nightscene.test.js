// WO-16-08：白天面板頂部的浮城夜景（IE.NightScene.plan）。測試名稱照工單。
'use strict';
const path = require('path');

module.exports = (t) => {
  const { IE, D, assert } = t;
  if (!IE.Flood) require(path.join(__dirname, '../../game/js/flood.js'));
  if (!IE.NightScene) require(path.join(__dirname, '../../game/js/nightscene.js'));
  const NS = IE.NightScene;
  const run = (o) => t.run(Object.assign({ mode: 'rounds', bg: 'copywriter', season: 'storm', seed: 31 }, o || {}));
  const names = (p) => [p.sky, p.pier, p.front].concat(p.far, p.mids);
  const atStage = (st) => { const s = run(); s.stage = st; return s; };

  t.test('夜景：同一個局面的 plan 相同，換輪之後不同', () => {
    const s = run();
    s.night = 1;
    const a = NS.plan(s), b = NS.plan(s);
    assert.deepEqual(a, b);
    s.night = 2;
    assert.deepEqual(NS.plan(s), a, '同一輪的三晚是同一個地方');
    s.night = 4;
    const c = NS.plan(s);
    assert.notEqual(c.seed, a.seed, '換輪之後換景');
  });

  t.test('夜景：plan 的每個素材名稱都在清單裏', () => {
    for (let seed = 1; seed <= 25; seed++) {
      ['storm', 'heat', 'acid', 'cold'].forEach((season) => {
        const p = NS.plan(run({ seed, season }));
        names(p).forEach((nm) => assert.ok(D.ART.a[nm], '不在清單裏：' + nm));
        assert.equal(new Set(p.mids).size, p.mids.length, '中景不重複');
        assert.equal(new Set(p.far).size, p.far.length, '遠景不重複');
      });
    }
  });

  t.test('夜景：水位階段對應 flood 的五個數值', () => {
    const want = { dry: 0, warn: 0.35, light: 0.6, medium: 0.8, heavy: 1 };
    Object.keys(want).forEach((st) => assert.equal(NS.plan(atStage(st)).flood, want[st], st));
    // 沒有指定時用 IE.Flood.stage
    const s = run();
    assert.equal(NS.plan(s).stage, IE.Flood.stage(s));
  });

  t.test('夜景：中和重的階段，遠景有 np-far-drowned', () => {
    ['medium', 'heavy'].forEach((st) => {
      for (let seed = 1; seed <= 10; seed++) {
        const s = run({ seed });
        s.stage = st;
        assert.equal(NS.plan(s).far[0], 'np-far-drowned', st + ' 種子 ' + seed);
      }
    });
  });

  t.test('夜景：有 tag 的天氣用對應的天空，暴雨和風球用第二張', () => {
    const s = run();
    s.weather = { id: 'downpour', day: s.day };   // vis storm，tag water
    assert.equal(NS.plan(s).sky, 'np-sky-water-2');
    s.weather = { id: 'typhoon', day: s.day };    // vis typhoon，tag water
    assert.equal(NS.plan(s).sky, 'np-sky-water-2');
    s.weather = { id: 'fog', day: s.day };        // tag memory
    assert.equal(NS.plan(s).sky, 'np-sky-memory-1');
    s.weather = null;
    assert.equal(NS.plan(s).sky, 'np-sky-water-1', '風暴季沒有天氣時用 water');
  });

  t.test('夜景：寒潮季 cold 為 true 而且不下雨', () => {
    const s = run({ season: 'cold' });
    s.weather = { id: 'downpour', day: s.day };
    const p = NS.plan(s);
    assert.equal(p.cold, true);
    assert.equal(p.rain, false);
    const w = run({ season: 'storm' });
    w.weather = { id: 'downpour', day: w.day };
    assert.equal(NS.plan(w).rain, true);
    assert.equal(NS.plan(w).cold, false);
  });

  t.test('夜景：前景不會抽到金框', () => {
    for (let seed = 1; seed <= 60; seed++) assert.notEqual(NS.plan(run({ seed })).front, 'np-front-frame-gold');
  });

  t.test('夜景：沒有 IE.DATA.ART 時 plan 回傳 null，不會出錯', () => {
    const keep = D.ART;
    try {
      D.ART = null;
      assert.equal(NS.plan(run()), null);
      assert.deepEqual(NS.sketchPlan(run()), []);
    } finally {
      D.ART = keep;
    }
  });
};
