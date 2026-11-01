// 第十五期（WO-15-11）：故事線（角色線、朋友收藏線、阿星線、今日快訊與終局總結）單元測試。
'use strict';

module.exports = (t) => {
  const { IE, D, R, assert } = t;
  const Rounds = IE.Rounds;
  const Story = IE.Story;

  t.test('角色線——按輪數抽章', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 10 });
    const ch1 = Story.chapter(s);
    assert.ok(ch1);
    assert.equal(ch1.id, 'copywriter.1');
    assert.equal(s.story.pending, 'copywriter.1');

    // 同一天再呼叫仍回傳同一章（包括重載）
    const ch1Again = Story.chapter(s);
    assert.equal(ch1Again.id, 'copywriter.1');

    // 回答後同日再呼叫回傳 null
    const rep = Story.choose(s, 0);
    assert.ok(rep);
    assert.equal(s.story.pending, null);
    assert.deepEqual(s.story.done, ['copywriter.1']);
    assert.equal(Story.chapter(s), null);

    // 第 2、3 天（night = 2, 3）回傳 null
    s.night = 2;
    s.day = 8;
    assert.equal(Story.chapter(s), null);
    s.night = 3;
    s.day = 12;
    assert.equal(Story.chapter(s), null);

    // 第 4 晚（第 2 輪第 1 天）回傳第 2 章
    s.night = 4;
    s.day = 16;
    const ch2 = Story.chapter(s);
    assert.ok(ch2);
    assert.equal(ch2.round, 2);
  });

  t.test('角色線——套用效果與旗標', () => {
    // 測試 cr、sin、guilt、set、side(-1)
    const s1 = t.run({ mode: 'rounds', bg: 'copywriter', seed: 11 });
    const cr0 = s1.cr;
    const soul0 = s1.soul;
    Story.chapter(s1);
    Story.choose(s1, 0); // copywriter.1 opt 0: cr 120, sin 1, guilt '替 AI 寫的人味', tag 'machine', set 'copywriter.ghost', survive
    assert.equal(s1.cr, cr0 + 120);
    assert.ok(s1.soul > soul0);
    assert.equal(s1.story.flags['copywriter.ghost'], true);
    assert.equal(s1.story.side, -1);
    const guiltCard = s1.cards.find((c) => c.guilt && c.name === '替 AI 寫的人味');
    assert.ok(guiltCard);
    assert.ok(guiltCard.tags.includes('machine'));

    // 測試 spark、card（有 star 和 medium）、side(+1)
    const s2 = t.run({ mode: 'rounds', bg: 'copywriter', seed: 12 });
    s2.spark = 2.0;
    Story.chapter(s2);
    Story.choose(s2, 1); // copywriter.1 opt 1: cr -20, spark 0.4, card('沒人要的署名', ..., star 2, medium 'paper'), peak
    assert.ok(s2.spark > 2.0);
    assert.equal(s2.story.side, 1);
    const storyCard = s2.cards.find((c) => c.name === '沒人要的署名');
    assert.ok(storyCard);
    assert.equal(storyCard.star, 2);
    assert.equal(storyCard.medium, 'paper');

    // 測試 target、notice、side(0)
    const s3 = t.run({ mode: 'rounds', bg: 'copywriter', seed: 13 });
    Story.chapter(s3);
    Story.choose(s3, 2); // copywriter.1 opt 2: cr 60, spark 0.2, target 1.1, notice { grey: 1 }, both
    assert.equal(s3.story.side, 0);
    assert.equal(s3.story.notice.grey, 1);
    assert.deepEqual(s3.nightMod, { night: 1, mult: 1.1 });

    // 測試 form、friend、rent（用 nurse 線）
    const s4 = t.run({ mode: 'rounds', bg: 'nurse', seed: 14 });
    // 第 3 輪 nurse.3 opt 2: form { split: 1 }
    s4.night = 7;
    s4.day = 28;
    const split0 = (s4.forms && s4.forms.split) || 1;
    Story.chapter(s4);
    Story.choose(s4, 2);
    assert.equal(s4.forms.split, split0 + 1);

    // 第 4 輪 nurse.4 opt 1: friend { ho: 2 }, rent: 1.15
    s4.night = 10;
    s4.day = 40;
    const ho0 = s4.npcs.find((n) => n.id === 'ho').friend;
    Story.chapter(s4);
    Story.choose(s4, 1);
    assert.equal(s4.npcs.find((n) => n.id === 'ho').friend, Math.min(4, ho0 + 2));
    assert.deepEqual(s4.rentMod, { round: 4, mult: 1.15 });
  });

  t.test('角色線——分支', () => {
    // 選第 0 個選項（設 copywriter.ghost）-> copywriter.2a
    const sA = t.run({ mode: 'rounds', bg: 'copywriter', seed: 20 });
    Story.chapter(sA);
    Story.choose(sA, 0);
    sA.night = 4;
    sA.day = 16;
    const ch2a = Story.chapter(sA);
    assert.ok(ch2a);
    assert.equal(ch2a.id, 'copywriter.2a');

    // 選第 1 個選項（不設 copywriter.ghost）-> copywriter.2b
    const sB = t.run({ mode: 'rounds', bg: 'copywriter', seed: 20 });
    Story.chapter(sB);
    Story.choose(sB, 1);
    sB.night = 4;
    sB.day = 16;
    const ch2b = Story.chapter(sB);
    assert.ok(ch2b);
    assert.equal(ch2b.id, 'copywriter.2b');
  });

  t.test('角色線——今晚目標與本輪租金修正', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 30 });
    const baseT1 = Rounds.target(s, 1);
    const baseT2 = Rounds.target(s, 2);
    s.nightMod = { night: 1, mult: 1.15 };
    assert.equal(Rounds.target(s, 1), Rounds.sig3(D.ECON.t1 * 1.15));
    assert.notEqual(Rounds.target(s, 1), baseT1);
    assert.equal(Rounds.target(s, 2), baseT2, '下一晚目標不受影響');

    const baseR1 = Rounds.rentOf(s, 1);
    const baseR2 = Rounds.rentOf(s, 2);
    s.rentMod = { round: 1, mult: 1.2 };
    assert.equal(Rounds.rentOf(s, 1), Math.round(baseR1 * 1.2));
    assert.equal(Rounds.rentOf(s, 2), baseR2, '下一輪租金不受影響');
  });

  t.test('角色線——五條線都可走完五章', () => {
    const bgs = Object.keys(D.STORY.lines);
    assert.ok(bgs.length >= 5);
    const sides = ['survive', 'peak', 'both'];
    bgs.forEach((bg) => {
      sides.forEach((targetSide) => {
        const s = t.run({ mode: 'rounds', bg, seed: 40 });
        for (let r = 1; r <= 5; r++) {
          s.night = (r - 1) * 3 + 1;
          s.day = 4 * s.night;
          const ch = Story.chapter(s);
          assert.ok(ch, bg + ' 第 ' + r + ' 輪應有章節');
          const idx = ch.options.findIndex((o) => o.side === targetSide);
          assert.ok(idx >= 0, ch.id + ' 應有 ' + targetSide + ' 選項');
          Story.choose(s, idx);
        }
        assert.equal(s.story.done.length, 5);
        const ep = Story.epilogue(s);
        assert.ok(ep && ep.line && ep.line.length > 0);
        assert.equal(ep.side, targetSide);
      });
    });
  });

  t.test('朋友線——預告與點名', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 50 });
    const seen = new Set();
    const expectedOrder = ['octo', 'myco', 'conserve', 'grey'];
    for (let r = 1; r <= 4; r++) {
      s.night = (r - 1) * 3 + 1;
      s.day = 4 * s.night;
      const pl = Story.plan(s);
      assert.ok(pl);
      assert.equal(pl.species, expectedOrder[r - 1]);
      assert.equal(seen.has(pl.npc), false, '已不在浮城的朋友不會再被抽中');
      assert.ok(D.STORY.friends[pl.npc].collectors.includes(pl.species));

      // 每輪第 2 天 IE.Rounds.offer(s).ids[1] 是 'friend:' + plan.npc
      s.night = (r - 1) * 3 + 2;
      s.day = 4 * s.night;
      s.offer = null;
      const of = Rounds.offer(s);
      assert.equal(of.ids[1], 'friend:' + pl.npc);

      // 模擬該輪篩選日被收藏
      s.night = r * 3;
      s.day = 4 * s.night;
      s.phase = 'review';
      s.cr = 1000;
      s.soul = 5;
      Rounds.review(s);
      seen.add(pl.npc);
    }

    // 第 5 輪回傳 null
    s.night = 13;
    s.day = 52;
    assert.equal(Story.plan(s), null);
  });

  t.test('朋友線——見了最後一面送遺物', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 60 });
    const pl = Story.plan(s);
    assert.ok(pl);
    // 第 2 天選該朋友
    s.night = 2;
    s.day = 8;
    s.cr = 500;
    const of = Rounds.offer(s);
    assert.equal(of.ids[1], 'friend:' + pl.npc);
    Rounds.choose(s, 'friend:' + pl.npc);
    assert.equal(s.story.met[pl.npc], 1);

    // 篩選日
    s.night = 3;
    s.day = 12;
    s.phase = 'review';
    s.cr = 500;
    s.soul = 5;
    const rev = Rounds.review(s);
    const npcObj = s.npcs.find((n) => n.id === pl.npc);
    assert.equal(npcObj.alive, false);
    const fDef = D.STORY.friends[pl.npc];
    assert.ok(s.objects.includes(fDef.gift) || s.objStash.includes(fDef.gift));
    assert.ok(rev.lines.includes(fDef.farewell));
    assert.deepEqual(rev.collect, { npc: pl.npc, species: pl.species, met: true, hidden: false });
  });

  t.test('朋友線——沒見面留字條', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 70 });
    const pl = Story.plan(s);
    assert.ok(pl);
    // 不選該朋友，直接到第 1 輪篩選日
    s.night = 3;
    s.day = 12;
    s.phase = 'review';
    s.cr = 500;
    s.soul = 5;
    const rev = Rounds.review(s);
    const npcObj = s.npcs.find((n) => n.id === pl.npc);
    assert.equal(npcObj.alive, false);
    const fDef = D.STORY.friends[pl.npc];
    assert.ok(s.cards.some((c) => c.name === fDef.note.name));
    assert.ok(rev.lines.includes(fDef.nomeet));
    assert.deepEqual(rev.collect, { npc: pl.npc, species: pl.species, met: false, hidden: false });
  });

  t.test('朋友線——藏起來', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 80 });
    const pl = Story.plan(s);
    const cost = D.ECON.hideCost[0];

    // 錢不夠時失敗且狀態不變
    s.cr = cost - 1;
    const failRes = Story.hide(s, pl.npc);
    assert.equal(failRes.ok, false);
    assert.equal(s.cr, cost - 1);
    assert.equal(s.story.hidden[pl.npc], undefined);

    // 錢夠時扣錢、紀錄 hidden、notice +1
    s.cr = cost + 50;
    const okRes = Story.hide(s, pl.npc);
    assert.equal(okRes.ok, true);
    assert.equal(okRes.cost, cost);
    assert.equal(s.cr, 50);
    assert.equal(s.story.hidden[pl.npc], 1);
    assert.equal(s.story.notice[pl.species], 1);

    // 該輪篩選日不被收藏
    s.night = 3;
    s.day = 12;
    s.phase = 'review';
    s.cr = 500;
    s.soul = 5;
    const rev = Rounds.review(s);
    const npcObj = s.npcs.find((n) => n.id === pl.npc);
    assert.equal(npcObj.alive, true);
    assert.equal(s.story.taken[pl.npc], undefined);
    assert.ok(rev.lines.includes(D.STORY.friends[pl.npc].hiddenLine));
    assert.equal(rev.collect.hidden, true);
  });

  t.test('朋友線——近況明信片', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 90 });
    const pl = Story.plan(s);
    s.night = 3;
    s.day = 12;
    s.phase = 'review';
    s.cr = 500;
    s.soul = 5;
    Rounds.review(s);
    // review 後推進到第 4 晚（第 2 輪第 1 天）
    assert.equal(s.night, 4);
    const f4 = Story.fate(s);
    assert.equal(f4.length, 1);
    assert.equal(f4[0].npc, pl.npc);
    assert.equal(f4[0].species, pl.species);
    assert.equal(f4[0].text, pl.fate);

    // 第 5 晚回傳空陣列
    s.night = 5;
    assert.deepEqual(Story.fate(s), []);
  });

  t.test('阿星與今日快訊', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 100 });
    for (let n = 1; n <= 15; n++) {
      s.night = n;
      const msg = Story.astar(s);
      if (n % 2 === 1) {
        const text = typeof msg === 'string' ? msg : (msg && msg.text);
        assert.equal(typeof text, 'string');
        assert.ok(text.length > 0);
      } else {
        assert.equal(msg, null);
      }
      const rng0 = s.rngState;
      const news = Story.feed(s);
      assert.equal(typeof news, 'string');
      assert.ok(news.length > 0);
      assert.equal(s.rngState, rng0, 'feed(s) 不改變 s.rngState');
    }
  });

  t.test('終局總結', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 110 });
    // 第 1 輪朋友被收藏
    const pl1 = Story.plan(s);
    s.night = 3;
    s.day = 12;
    s.phase = 'review';
    s.cr = 500;
    s.soul = 5;
    Rounds.review(s);

    // 第 2 輪朋友被藏起來
    const pl2 = Story.plan(s);
    s.cr = 500;
    Story.hide(s, pl2.npc);

    const ep = Story.epilogue(s);
    assert.ok(ep);
    assert.equal(typeof ep.line, 'string');
    assert.ok(ep.line.length > 0);
    assert.equal(ep.friends.length, 8);
    const f1 = ep.friends.find((f) => f.id === pl1.npc);
    const f2 = ep.friends.find((f) => f.id === pl2.npc);
    const fOther = ep.friends.find((f) => f.id !== pl1.npc && f.id !== pl2.npc);
    assert.equal(f1.state, 'taken');
    assert.equal(f2.state, 'hidden');
    assert.equal(fOther.state, 'stayed');
  });
};
