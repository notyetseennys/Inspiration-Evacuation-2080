// 第十五期（WO-15-11 第二版）：故事線（角色線、城市換算、為別人、物極必反、朋友收藏線、阿星與快訊、終局總結）16 項單元測試。
'use strict';

module.exports = (t) => {
  const { IE, D, R, assert } = t;
  const Rounds = IE.Rounds;
  const Story = IE.Story;

  // 1. 新局有 s.city、s.story；舊存檔（刪掉 s.story、s.city）呼叫任何函數都不會出錯
  t.test('1. 新局與舊存檔相容：有 s.city、s.story，刪掉後呼叫任何函數不報錯', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 10 });
    assert.equal(s.city, D.CITY_DEFAULT);
    assert.ok(s.story);
    assert.ok(Array.isArray(s.story.done));
    assert.ok(Array.isArray(s.story.later));

    delete s.story;
    delete s.city;
    assert.doesNotThrow(() => {
      Story.money(s, 100);
      Story.fmt(s, 100);
      Story.say(s, '{city} {currency} {cr} {rent}', { cr: 50 });
      Story.reversals(s);
      Story.astar(s);
      Story.feed(s);
      Story.fate(s);
      Story.epilogue(s);
      Story.plan(s);
      const ch = Story.chapter(s);
      if (ch) {
        Story.fx(s, ch.options[0]);
        Story.choose(s, 0);
      }
      Story.reverse(s);
      Story.hide(s, 'ho');
    });
    assert.equal(s.city, D.CITY_DEFAULT);
    assert.ok(s.story);
  });

  // 2. 每輪第一天有章，同一天重複呼叫回傳同一章；回答之後 done、log、side 正確，pending 清除
  t.test('2. 角色線抽章與回答：同一天冪等，回答後更新 done、log、side 並清除 pending', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 11 });
    const ch1 = Story.chapter(s);
    assert.ok(ch1);
    assert.equal(ch1.id, 'copywriter.1');
    assert.equal(s.story.pending, 'copywriter.1');

    const ch1Again = Story.chapter(s);
    assert.equal(ch1Again.id, 'copywriter.1');

    const rep = Story.choose(s, 0);
    assert.ok(rep);
    assert.equal(s.story.pending, null);
    assert.deepEqual(s.story.done, ['copywriter.1']);
    assert.deepEqual(s.story.log, [{ night: 1, id: 'copywriter.1', i: 0 }]);
    assert.equal(s.story.side, -1);
    assert.equal(Story.chapter(s), null);

    s.night = 2; s.day = 8;
    assert.equal(Story.chapter(s), null);
    s.night = 4; s.day = 16;
    const ch2 = Story.chapter(s);
    assert.ok(ch2);
    assert.equal(ch2.round, 2);
  });

  // 3. if、unless：第 1 輪的選擇令第 2 輪出現不同的章（用 copywriter）
  t.test('3. 角色線分支（if / unless）：第 1 輪選擇決定第 2 輪出現 2a 或 2b', () => {
    const sA = t.run({ mode: 'rounds', bg: 'copywriter', seed: 20 });
    Story.chapter(sA);
    Story.choose(sA, 0); // 設 copywriter.ghost
    sA.night = 4; sA.day = 16;
    const ch2a = Story.chapter(sA);
    assert.ok(ch2a);
    assert.equal(ch2a.id, 'copywriter.2a');

    const sB = t.run({ mode: 'rounds', bg: 'copywriter', seed: 20 });
    Story.chapter(sB);
    Story.choose(sB, 1); // 不設 copywriter.ghost
    sB.night = 4; sB.day = 16;
    const ch2b = Story.chapter(sB);
    assert.ok(ch2b);
    assert.equal(ch2b.id, 'copywriter.2b');
  });

  // 4. 城市：章的 city 不包括 s.city 時不出現（測試裡臨時加一座城市和一章，測完刪除）
  t.test('4. 城市篩選：章的 city 不包含 s.city 時跳過，包含時出現', () => {
    D.CITIES.testCity = {
      name: '測試城', zone: '第 9 區', treaty: 'octo', difficulty: 2, difficultyName: '普通',
      currency: { name: '測試幣', symbol: 'T$', rate: 1, regime: 'float', regimeName: '自由浮動' },
      econ: { rent: 1, pay: 1, price: 1, inflation: 1 },
      blurb: '測試',
    };
    const line = D.STORY.lines.copywriter;
    const cityCh = {
      id: 'copywriter.citytest',
      round: 1,
      day: 1,
      city: ['testCity'],
      text: '只在{city}出現的章',
      options: line.chapters[0].options,
    };
    line.chapters.unshift(cityCh);
    try {
      const sZone7 = t.run({ mode: 'rounds', bg: 'copywriter', seed: 21 });
      const chZ = Story.chapter(sZone7);
      assert.equal(chZ.id, 'copywriter.1');

      const sTest = t.run({ mode: 'rounds', bg: 'copywriter', seed: 21 });
      sTest.city = 'testCity';
      const chT = Story.chapter(sTest);
      assert.equal(chT.id, 'copywriter.citytest');
      assert.equal(chT.text, '只在測試城出現的章');
    } finally {
      line.chapters.shift();
      delete D.CITIES.testCity;
    }
  });

  // 5. 每一種 fx 都正確套用（錢、火花、靈魂、素材、物件、配色、熟絡度、機會、target、rent、notice、set）
  t.test('5. 每一種 fx 效果正確套用', () => {
    const line = D.STORY.lines.copywriter;
    const testCh = {
      id: 'copywriter.fxtest',
      round: 1,
      day: 1,
      text: '效果測試章',
      options: [
        {
          label: '全效果正項',
          side: 'survive',
          fx: {
            cr: 100,
            spark: 0.4,
            sin: 1.5,
            guilt: '測試愧疚',
            tag: 'machine',
            card: { name: '測試故事卡', tags: ['hope', 'memory'], value: 25, star: 2, medium: 'paper' },
            obj: 'oldpoems',
            form: { split: 1 },
            friend: { ho: 2 },
            chance: -1,
            target: 1.15,
            rent: 1.2,
            notice: { grey: 2 },
            set: ['copywriter.fx1', 'copywriter.fx2'],
          },
          line: '收了 {cr}',
        },
        {
          label: '贖罪與回機會',
          side: 'peak',
          fx: {
            cr: -30,
            atone: 1.0,
            chance: 1,
          },
          line: '付了 {cr}',
        },
      ],
    };
    line.chapters.unshift(testCh);
    try {
      const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 25 });
      s.spark = 2.0;
      s.objects = [];
      const cr0 = s.cr;
      const soul0 = s.soul;
      const split0 = (s.forms && s.forms.split) || 1;
      const ho0 = s.npcs.find((n) => n.id === 'ho').friend;

      Story.chapter(s);
      Story.choose(s, 0);

      assert.equal(s.cr, cr0 + 100);
      assert.ok(s.spark > 2.0);
      assert.ok(s.soul > soul0);
      assert.ok(s.cards.some((c) => c.guilt && c.name === '測試愧疚' && c.tags.includes('machine')));
      const sc = s.cards.find((c) => c.name === '測試故事卡');
      assert.ok(sc && sc.star === 2 && sc.medium === 'paper');
      assert.ok(s.objects.includes('oldpoems') || s.objStash.includes('oldpoems'));
      assert.equal(s.forms.split, split0 + 1);
      assert.equal(s.npcs.find((n) => n.id === 'ho').friend, Math.min(4, ho0 + 2));
      assert.equal(s.chances, 2);
      assert.deepEqual(s.nightMod, { night: 1, mult: 1.15 });
      assert.deepEqual(s.rentMod, { round: 1, mult: 1.2 });
      assert.equal(s.story.notice.grey, 2);
      assert.equal(s.story.flags['copywriter.fx1'], true);
      assert.equal(s.story.flags['copywriter.fx2'], true);

      // 再測試 atone 與 chance +1（以及 chance 歸零進 archived 結局）
      const soul1 = s.soul;
      s.story.done = [];
      Story.chapter(s);
      Story.choose(s, 1);
      assert.ok(s.soul < soul1);
      assert.equal(s.chances, 3);

      // 機會扣到 0 時進入 archived 結局
      s.chances = 1;
      s.story.done = [];
      Story.chapter(s);
      Story.choose(s, 0);
      assert.equal(s.chances, 0);
      assert.ok(s.ended);
      assert.equal(s.ended.type, 'archived');
      assert.equal(s.phase, 'ended');
    } finally {
      line.chapters.shift();
    }
  });

  // 6. 換算：臨時加一座 econ 不是 1 的城市，測試 money、fmt、say
  t.test('6. 城市換算與格式化：money、fmt、say', () => {
    D.CITIES.hyper = {
      name: '高通脹城', zone: '第 8 區', treaty: 'octo', difficulty: 4, difficultyName: '很難',
      currency: { name: '舊城幣', symbol: 'C$', rate: 20, regime: 'float', regimeName: '浮動' },
      econ: { rent: 1.2, pay: 1.5, price: 2.0, inflation: 1.6 },
      blurb: '測試換算',
    };
    try {
      const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 30 });
      s.city = 'hyper';
      s.night = 4; // 第 2 輪（round = 2）
      s.day = 16;

      // 收入乘 pay (1.5) × inflation^(2-1) (1.6) = × 2.4
      assert.equal(Story.money(s, 100), Math.round(100 * 1.5 * 1.6));
      // 支出乘 price (2.0) × inflation^(2-1) (1.6) = × 3.2
      assert.equal(Story.money(s, -50), Math.round(-50 * 2.0 * 1.6));

      // fmt 乘 currency.rate (20)、加千位逗號、不帶正負號
      assert.equal(Story.fmt(s, 100), 'C$2,000');
      assert.equal(Story.fmt(s, -240), 'C$4,800');

      // say 替換 {cr}、{rent}、{city}、{currency}
      const rent2 = Rounds.rentOf(s, 2);
      const text = Story.say(s, '在{city}用{currency}收了 {cr}，本輪租金 {rent}', { cr: 100 });
      assert.equal(text, '在高通脹城用舊城幣收了 C$4,800，本輪租金 ' + Story.fmt(s, rent2));
    } finally {
      delete D.CITIES.hyper;
    }
  });

  // 7. 光譜：survive −1、peak +1、both 和 others 0，極端的選項加倍；epilogue(s).others 是「為別人」的次數
  t.test('7. 光譜與「為別人」計數：一般 ±1、極端 ±2、both/others 為 0，epilogue.others 正確', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 35 });
    // 第 1 輪選極端 survive（索引 4）-> side = -2
    let ch = Story.chapter(s);
    const extSurvIdx = ch.options.findIndex((o) => o.extreme && o.side === 'survive');
    assert.ok(extSurvIdx >= 0);
    Story.choose(s, extSurvIdx);
    assert.equal(s.story.side, -2);

    // 第 2 輪選 others -> side 不變 (-2)，others 次數 +1
    s.night = 4; s.day = 16;
    ch = Story.chapter(s);
    const othersIdx1 = ch.options.findIndex((o) => o.side === 'others');
    assert.ok(othersIdx1 >= 0);
    Story.choose(s, othersIdx1);
    assert.equal(s.story.side, -2);

    // 第 3 輪選極端 peak -> side = 0
    s.night = 7; s.day = 28;
    ch = Story.chapter(s);
    const extPeakIdx = ch.options.findIndex((o) => o.extreme && o.side === 'peak');
    assert.ok(extPeakIdx >= 0);
    Story.choose(s, extPeakIdx);
    assert.equal(s.story.side, 0);

    // 第 4 輪選 others -> side = 0，others 次數 +1 (共 2 次)
    s.night = 10; s.day = 40;
    ch = Story.chapter(s);
    const othersIdx2 = ch.options.findIndex((o) => o.side === 'others');
    assert.ok(othersIdx2 >= 0);
    Story.choose(s, othersIdx2);
    assert.equal(s.story.side, 0);

    // 第 5 輪選 both -> side = 0
    s.night = 13; s.day = 52;
    ch = Story.chapter(s);
    const bothIdx = ch.options.findIndex((o) => o.side === 'both');
    Story.choose(s, bothIdx);
    assert.equal(s.story.side, 0);

    const ep = Story.epilogue(s);
    assert.equal(ep.side, 'both');
    assert.equal(ep.others, 2);
  });

  // 8. 物極必反：選了極端的選項，later 有一項；未到那一輪 reversals 是空的；到了那一輪第一天 reversals 有一項；reverse 套用 later.fx、從 later 移除、回傳報告；再呼叫回傳 null
  t.test('8. 物極必反：later 排程、reversals 查詢與 reverse 單次套用', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 40 });
    const ch1 = Story.chapter(s);
    const extIdx = ch1.options.findIndex((o) => o.extreme);
    assert.ok(extIdx >= 0);
    // fx 清單包含物極必反提示
    const tags = Story.fx(s, ch1.options[extIdx]);
    assert.ok(tags.some(([k, txt]) => k === 'note' && txt.includes('物極必反')));

    Story.choose(s, extIdx); // copywriter.1 極端選項 after: 2 -> 第 3 輪反轉
    assert.equal(s.story.later.length, 1);
    assert.equal(s.story.later[0].round, 3);

    // 第 1、2 輪 reversals 是空的
    assert.deepEqual(Story.reversals(s), []);
    s.night = 4; s.day = 16; // 第 2 輪第 1 天
    assert.deepEqual(Story.reversals(s), []);
    assert.equal(Story.reverse(s), null);

    // 第 3 輪第 2 天（night = 8）不是第一天，reversals 也是空的
    s.night = 8; s.day = 32;
    assert.deepEqual(Story.reversals(s), []);

    // 第 3 輪第 1 天（night = 7）reversals 有一項
    s.night = 7; s.day = 28;
    s.spark = 2.5;
    const revs = Story.reversals(s);
    assert.equal(revs.length, 1);
    assert.equal(revs[0].id, 'copywriter.1');
    assert.ok(revs[0].text.length > 0);

    const rep = Story.reverse(s);
    assert.ok(rep);
    assert.equal(rep.title, D.STORY.text.reversalHead);
    assert.ok(s.spark < 2.5);
    assert.deepEqual(s.nightMod, { night: 7, mult: 1.15 });
    assert.equal(s.story.later.length, 0);

    // 再呼叫回傳 null
    assert.equal(Story.reverse(s), null);
  });

  // 9. target 只影響下一晚；rent 只影響本輪
  t.test('9. target 只影響當晚目標，rent 只影響本輪租金', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 45 });
    const baseT1 = Rounds.target(s, 1);
    const baseT2 = Rounds.target(s, 2);
    s.nightMod = { night: 1, mult: 1.15 };
    assert.equal(Rounds.target(s, 1), Rounds.sig3(D.ECON.t1 * 1.15));
    assert.notEqual(Rounds.target(s, 1), baseT1);
    assert.equal(Rounds.target(s, 2), baseT2);

    const baseR1 = Rounds.rentOf(s, 1);
    const baseR2 = Rounds.rentOf(s, 2);
    s.rentMod = { round: 1, mult: 1.2 };
    assert.equal(Rounds.rentOf(s, 1), Math.round(baseR1 * 1.2));
    assert.equal(Rounds.rentOf(s, 2), baseR2);
  });

  // 10. 收藏預告：同一個種子結果相同；候選按 collectors；候選都不在浮城時改抽其他朋友，文字用種族的通用文字；一位朋友都不在就沒有收藏；第 5 輪沒有
  t.test('10. 收藏預告：同種子一致、按 collectors、後備通用文字、全空與第 5 輪為 null', () => {
    const s1 = t.run({ mode: 'rounds', bg: 'copywriter', seed: 50 });
    const s2 = t.run({ mode: 'rounds', bg: 'copywriter', seed: 50 });
    const p1 = Story.plan(s1);
    const p2 = Story.plan(s2);
    assert.deepEqual(p1, p2);
    assert.equal(p1.species, 'octo');
    assert.ok(D.STORY.friends[p1.npc].collectors.includes('octo'));

    // 把所有 collectors 含 octo 的朋友標為不在浮城，只留 miu（collectors 是 myco、grey）
    const sFallback = t.run({ mode: 'rounds', bg: 'copywriter', seed: 51 });
    sFallback.npcs.forEach((n) => {
      if (n.id !== 'miu') n.alive = false;
    });
    const pf = Story.plan(sFallback);
    assert.ok(pf);
    assert.equal(pf.npc, 'miu');
    assert.equal(pf.species, 'octo');
    const miuName = D.NPCS.find((n) => n.id === 'miu').name;
    assert.equal(pf.why, D.STORY.species.octo.why.replace(/\{npc\}/g, miuName));
    assert.equal(pf.fate, D.STORY.species.octo.fate.replace(/\{npc\}/g, miuName));

    // 一位朋友都不在浮城時回傳 null
    const sEmpty = t.run({ mode: 'rounds', bg: 'copywriter', seed: 52 });
    sEmpty.npcs.forEach((n) => { n.alive = false; });
    assert.equal(Story.plan(sEmpty), null);

    // 第 5 輪回傳 null
    const sR5 = t.run({ mode: 'rounds', bg: 'copywriter', seed: 53 });
    sR5.night = 13; sR5.day = 52;
    assert.equal(Story.plan(sR5), null);
  });

  // 11. 第二天的生活卡有這位朋友的朋友卡；選了之後記下 met
  t.test('11. 第二天生活卡固定出現預告朋友，選了之後記下 met', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 60 });
    const pl = Story.plan(s);
    assert.ok(pl);
    s.night = 2; s.day = 8; s.cr = 500;
    const of = Rounds.offer(s);
    assert.equal(of.ids[1], 'friend:' + pl.npc);
    Rounds.choose(s, 'friend:' + pl.npc);
    assert.equal(s.story.met[pl.npc], 1);
  });

  // 12. hide：扣錢（經 money 換算）、錢不夠失敗、篩選日不會被收藏、notice 加一
  t.test('12. 把朋友藏起來（hide）：按城市換算扣錢、錢不夠失敗、篩選日免收藏、notice +1', () => {
    D.CITIES.costly = {
      name: '昂貴城', zone: '第 6 區', treaty: 'octo', difficulty: 3, difficultyName: '困難',
      currency: { name: '昂貴元', symbol: '$', rate: 1, regime: 'peg', regimeName: '掛鈎' },
      econ: { rent: 1, pay: 1, price: 1.5, inflation: 1 },
      blurb: '測試',
    };
    try {
      const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 70 });
      s.city = 'costly';
      const pl = Story.plan(s);
      const expectedCost = Math.abs(Story.money(s, -D.ECON.hideCost[0])); // 80 * 1.5 = 120
      assert.equal(expectedCost, 120);

      s.cr = expectedCost - 1;
      const fail = Story.hide(s, pl.npc);
      assert.equal(fail.ok, false);
      assert.equal(s.cr, expectedCost - 1);
      assert.equal(s.story.hidden[pl.npc], undefined);

      s.cr = expectedCost + 30;
      const ok = Story.hide(s, pl.npc);
      assert.equal(ok.ok, true);
      assert.equal(ok.cost, expectedCost);
      assert.equal(s.cr, 30);
      assert.equal(s.story.hidden[pl.npc], 1);
      assert.equal(s.story.notice[pl.species], 1);

      s.night = 3; s.day = 12; s.phase = 'review'; s.cr = 500; s.soul = 5;
      const rev = Rounds.review(s);
      assert.equal(s.npcs.find((n) => n.id === pl.npc).alive, true);
      assert.equal(s.story.taken[pl.npc], undefined);
      assert.equal(rev.collect.hidden, true);
      assert.ok(rev.lines.includes(D.STORY.friends[pl.npc].hiddenLine));
    } finally {
      delete D.CITIES.costly;
    }
  });

  // 13. collect：見過最後一面得到贈物；沒見得到紙條素材；朋友 alive 變成 false；下一晚 fate 有近況
  t.test('13. 篩選日收藏（collect）：見面得贈物、未見得紙條素材、alive=false、下一晚有 fate', () => {
    // 見過最後一面
    const sMet = t.run({ mode: 'rounds', bg: 'copywriter', seed: 80 });
    const pl1 = Story.plan(sMet);
    sMet.night = 2; sMet.day = 8; sMet.cr = 500;
    Rounds.offer(sMet);
    Rounds.choose(sMet, 'friend:' + pl1.npc);
    sMet.night = 3; sMet.day = 12; sMet.phase = 'review'; sMet.cr = 500; sMet.soul = 5;
    const rev1 = Rounds.review(sMet);
    const fDef1 = D.STORY.friends[pl1.npc];
    assert.equal(sMet.npcs.find((n) => n.id === pl1.npc).alive, false);
    assert.ok(sMet.objects.includes(fDef1.gift) || sMet.objStash.includes(fDef1.gift));
    assert.ok(rev1.lines.includes(fDef1.farewell));
    assert.equal(sMet.night, 4);
    const fates4 = Story.fate(sMet);
    assert.equal(fates4.length, 1);
    assert.equal(fates4[0].npc, pl1.npc);
    assert.equal(fates4[0].text, pl1.fate);

    // 沒見過最後一面
    const sNoMet = t.run({ mode: 'rounds', bg: 'copywriter', seed: 81 });
    const pl2 = Story.plan(sNoMet);
    sNoMet.night = 3; sNoMet.day = 12; sNoMet.phase = 'review'; sNoMet.cr = 500; sNoMet.soul = 5;
    const rev2 = Rounds.review(sNoMet);
    const fDef2 = D.STORY.friends[pl2.npc];
    assert.equal(sNoMet.npcs.find((n) => n.id === pl2.npc).alive, false);
    assert.ok(sNoMet.cards.some((c) => c.name === fDef2.note.name));
    assert.ok(rev2.lines.includes(fDef2.nomeet));
  });

  // 14. astar、feed：對應正確；feed、money、fmt、say、fx、reversals 前後 rngState 和 s 都不變
  t.test('14. astar、feed 與唯讀函數不改變 rngState 和 s', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 90 });
    const ch = Story.chapter(s);
    const opt = ch.options[4] || ch.options[0];
    const snap = JSON.stringify(s);
    const rng0 = s.rngState;

    for (let n = 1; n <= 15; n++) {
      const sCopy = JSON.parse(snap);
      sCopy.night = n;
      const a = Story.astar(sCopy);
      if (n % 2 === 1) assert.ok(a && typeof a.text === 'string' && a.text.length > 0);
      else assert.equal(a, null);
    }

    const news = Story.feed(s);
    assert.ok(typeof news === 'string' && news.length > 0);
    Story.money(s, 120);
    Story.fmt(s, 120);
    Story.say(s, '{city} {currency} {cr} {rent}', opt.fx);
    Story.fx(s, opt);
    Story.reversals(s);

    assert.equal(s.rngState, rng0);
    assert.equal(JSON.stringify(s), snap);
  });

  // 15. 「存檔再載入」（JSON）之後，pending 的章和未發生的反轉仍然在，可以回答、可以套用，不會重複套用
  t.test('15. 存檔再載入（JSON）：pending 章與 later 反轉完整保留且不重複套用', () => {
    const s0 = t.run({ mode: 'rounds', bg: 'copywriter', seed: 100 });
    const ch = Story.chapter(s0);
    assert.equal(s0.story.pending, 'copywriter.1');

    // 在還沒回答前存檔並重新載入
    const s1 = JSON.parse(JSON.stringify(s0));
    const chReloaded = Story.chapter(s1);
    assert.equal(chReloaded.id, 'copywriter.1');
    const extIdx = chReloaded.options.findIndex((o) => o.extreme);
    Story.choose(s1, extIdx);
    assert.equal(s1.story.pending, null);
    assert.equal(s1.story.later.length, 1);

    // 推進到第 3 輪第 1 天，存檔再載入後套用反轉
    s1.night = 7; s1.day = 28;
    const s2 = JSON.parse(JSON.stringify(s1));
    assert.equal(Story.reversals(s2).length, 1);
    const rep = Story.reverse(s2);
    assert.ok(rep);
    assert.equal(Story.reversals(s2).length, 0);
    assert.equal(Story.reverse(s2), null);
  });

  // 16. epilogue：結語按旗標選擇；朋友的狀態、光譜和「為別人」的次數正確
  t.test('16. 終局總結（epilogue）：結語旗標匹配、朋友狀態、光譜與「為別人」次數正確', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 110 });
    // 第 1 輪選 0 (survive, 設 copywriter.ghost)
    Story.chapter(s);
    Story.choose(s, 0);
    const pl1 = Story.plan(s);
    s.night = 3; s.day = 12; s.phase = 'review'; s.cr = 500; s.soul = 5;
    Rounds.review(s); // 第 1 輪朋友被收藏

    // 第 2 輪選 others
    s.night = 4; s.day = 16;
    const ch2 = Story.chapter(s);
    Story.choose(s, ch2.options.findIndex((o) => o.side === 'others'));
    const pl2 = Story.plan(s);
    s.cr = 500;
    Story.hide(s, pl2.npc); // 第 2 輪朋友被藏起來

    // 第 3 輪選 0 (survive, 設 copywriter.recruiter)
    s.night = 7; s.day = 28;
    Story.chapter(s);
    Story.choose(s, 0);

    const ep = Story.epilogue(s);
    assert.ok(ep);
    assert.ok(ep.line.includes('你寫的招聘廣告仍然掛在天橋上'));
    assert.equal(ep.side, 'survive');
    assert.equal(ep.others, 1);
    assert.equal(ep.friends.length, 8);
    assert.equal(ep.friends.find((f) => f.npc === pl1.npc).state, 'taken');
    assert.equal(ep.friends.find((f) => f.npc === pl1.npc).species, pl1.species);
    assert.equal(ep.friends.find((f) => f.npc === pl2.npc).state, 'hidden');
    assert.ok(ep.friends.some((f) => f.state === 'stayed'));
  });
};
