// 第十七期：浮城年表（章節）的規則。由 Claude 維護。
module.exports = (t) => {
  const { IE, D, R, assert } = t;
  const RD = IE.Rounds, CH = IE.Chapters;
  const run = (o) => t.run(Object.assign({ mode: 'rounds', bg: 'copywriter', seed: 7 }, o || {}));

  t.test('章節：第一章是兩輪六晚，第幾輪不會超過兩輪，標題寫「／6 晚」', () => {
    const s = run({ chapter: 'c1' });
    assert.equal(s.chapter, 'c1');
    assert.equal(RD.total(s), 2);
    assert.equal(RD.nightsTotal(s), 6);
    assert.equal(RD.roundOf(s, 6), 2);
    assert.equal(RD.roundOf(s, 9), 2);
    assert.ok(RD.dayTitle(s, 1, 1).includes('／6 晚'));
  });

  t.test('章節：沒有章節＝完整的五輪模式，標題和以前一樣', () => {
    const s = run();
    assert.equal(s.chapter, null);
    assert.equal(RD.total(s), 5);
    assert.equal(RD.dayTitle(s, 1, 1), D.ROUND_TEXT.dayTitle.replace('{round}', 1).replace('{night}', 1));
    ['collect', 'flood', 'weather', 'stance', 'kpi', 'judge', 'trip'].forEach((k) => assert.ok(CH.feat(s, k), k));
  });

  t.test('章節：還在興建中的一章不可以開局（當作沒有章節）', () => {
    const s = run({ chapter: 'c6' });
    assert.equal(s.chapter, null);
    assert.equal(RD.total(s), 5);
  });

  t.test('章節：第一章沒有水淹、天氣、KPI、外星評審的規則、出國', () => {
    const s = run({ chapter: 'c1' });
    assert.equal(IE.Flood.on(s), false);
    assert.equal(IE.Flood.stage(s), 'dry');
    s.weather = null;
    s.day = 8;
    R.morning && R.morning(s);
    assert.equal(s.weather, null);
    assert.equal(R.kpi(s).mod, 1);
    assert.equal(R.kpi(s).name, '');
    // 第三晚是外星評審之夜：第一章只看分數，沒有規則
    s.night = 3; s.day = 12;
    const st = IE.Stages.today(s);
    assert.equal(st.kind, 'boss');
    assert.deepEqual(st.rules, []);
    // 出國不會出現在生活卡
    for (let n = 1; n <= 6; n++) {
      s.night = n; s.day = 4 * n; s.offer = null; s.phase = 'day';
      const of = RD.offer(s);
      assert.ok(!of.ids.some((id) => id.startsWith('trip:')), '第 ' + n + ' 晚不應有出國');
    }
  });

  t.test('章節：第二章開放水位和天氣，第四章開放全部', () => {
    const s2 = run({ chapter: 'c2' });
    assert.equal(IE.Flood.on(s2), true);
    assert.ok(CH.feat(s2, 'weather'));
    assert.ok(!CH.feat(s2, 'stance'));
    const s4 = run({ chapter: 'c4' });
    ['collect', 'flood', 'weather', 'stance', 'kpi', 'judge', 'trip'].forEach((k) => assert.ok(CH.feat(s4, k), k));
    assert.equal(RD.total(s4), 5);
  });

  t.test('章節：第一章的市集只有普通的物件', () => {
    const s = run({ chapter: 'c1' });
    for (let i = 0; i < 12; i++) {
      R.pickObjects(s, 3).forEach((id) => assert.equal(D.OBJ[id].rarity, 'common', id));
    }
    const s4 = run({ chapter: 'c4' });
    const seen = new Set();
    for (let i = 0; i < 40; i++) R.pickObjects(s4, 3).forEach((id) => seen.add(D.OBJ[id].rarity));
    assert.ok(seen.has('rare') || seen.has('legend'));
  });

  t.test('章節：第一章第二輪的篩選通過就是被選中', () => {
    const s = run({ chapter: 'c1' });
    s.night = 6; s.day = 24; s.phase = 'review';
    s.cr = 99999; s.soul = 5; s.chances = 3;
    const rep = RD.review(s);
    assert.equal(rep.round, 2);
    assert.ok(s.ended);
    assert.equal(s.ended.type || s.ended.kind, 'recruited');
  });

  t.test('年表：第一章永遠開放；通過上一章才開放下一章；興建中的不開放', () => {
    const meta = CH.migrate({ runs: 0 });
    assert.equal(meta.chapters.legacy, false);
    assert.equal(CH.status(meta, 'c1'), 'open');
    assert.equal(CH.status(meta, 'c2'), 'locked');
    assert.equal(CH.status(meta, 'c5'), 'building');
    assert.equal(CH.defaultFor(meta), 'c1');
    assert.equal(CH.freeUnlocked(meta), false);
    const s = run({ chapter: 'c1' });
    const r1 = CH.record(meta, s, 'archived');
    assert.equal(r1.firstClear, false);
    assert.equal(meta.chapters.tries.c1, 1);
    const r2 = CH.record(meta, s, 'recruited');
    assert.equal(r2.firstClear, true);
    assert.equal(r2.next.id, 'c2');
    assert.equal(CH.status(meta, 'c1'), 'cleared');
    assert.equal(CH.status(meta, 'c2'), 'open');
    assert.equal(CH.defaultFor(meta), 'c2');
    const r3 = CH.record(meta, s, 'recruited');
    assert.equal(r3.firstClear, false);
    assert.equal(r3.next, null);
  });

  t.test('年表：章節出現之前已經玩過的玩家，全城篩選一開始就開放', () => {
    const meta = CH.migrate({ runs: 12 });
    assert.equal(meta.chapters.legacy, true);
    assert.equal(CH.freeUnlocked(meta), true);
    assert.equal(CH.status(meta, 'c1'), 'open');
  });

  t.test('年表：每一章都有名字、年份、外星種族、輪數、介紹和新加入的系統', () => {
    assert.equal(D.CHAPTERS.length, 8);
    D.CHAPTERS.forEach((c, i) => {
      assert.equal(c.no, i + 1);
      assert.ok(c.name && c.year && c.species && c.intro && c.adds, c.id);
      assert.ok(c.rounds >= 2 && c.rounds <= 5, c.id);
      assert.ok(D.ART && D.ART.a[c.sky], c.id + ' 的天空圖要存在');
    });
  });

  t.test('舊模式：章節的參數不影響經典模式', () => {
    const s = t.run({ mode: 'standard', bg: 'copywriter', seed: 7, chapter: 'c1' });
    assert.ok(!s.chapter);
    assert.ok(CH.feat(s, 'flood'));
    assert.ok(!s.salvage);
  });
  t.test('收藏家：每一季第一輪的收藏家是這一季的外星人，有通用的文字；全城篩選照原來的次序', () => {
    [['c1', 'grey'], ['c2', 'harvest'], ['c3', 'mirror'], ['c4', 'octo']].forEach(([id, sp]) => {
      assert.equal(CH.get(id).collector, sp, id);
      const sd = D.STORY.species[sp];
      assert.ok(typeof sd.why === 'string' && sd.why.length > 0 && sd.fate.includes('{npc}'), sp + '：要有通用的 why、fate');
      const s = run({ chapter: id });
      const order = IE.Story.collectOrderOf(s);
      assert.equal(order[0], sp, id);
      assert.equal(new Set(order).size, order.length, id + '：次序裏沒有重複的種族');
      const pl = IE.Story.plan(s);
      if (pl) {
        assert.equal(pl.species, sp, id);
        assert.ok(pl.why && !pl.why.includes('{npc}'), id + '：文字已經代入朋友的名字');
      }
    });
    assert.deepEqual(IE.Story.collectOrderOf(run()), D.STORY.collectOrder);
  });
};
