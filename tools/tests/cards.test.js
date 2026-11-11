// 第十六期（WO-16-01）：卡的來歷、回憶、作品記錄與遺物單元測試。
'use strict';

module.exports = (t) => {
  if (!t.IE.Cards) require('../../game/js/cards.js');
  const { IE, D, R, C, assert } = t;
  const Cards = IE.Cards;
  const Rounds = IE.Rounds;
  const Story = IE.Story;

  t.test('卡的來歷：五輪模式開局的卡都是 start', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 10 });
    assert.ok(s.cards.length > 0);
    assert.deepEqual(s.memory, []);
    assert.equal(s.over, false);
    s.cards.forEach((c) => {
      assert.ok(c.origin && typeof c.origin === 'object');
      assert.equal(c.origin.kind, 'start');
      assert.equal(c.origin.text, '來浮城之前就帶在身上');
      assert.equal(c.origin.npc, null);
      assert.deepEqual(c.works, []);
      assert.equal(c.relic, false);
    });

    // 舊存檔相容：刪掉 s.memory、s.over 與卡上的新欄位後，ensure 會補齊
    delete s.memory;
    delete s.over;
    delete s.cards[0].works;
    delete s.cards[0].relic;
    s.cards[0].origin = 'asia';
    Cards.ensure(s);
    assert.deepEqual(s.memory, []);
    assert.equal(s.over, false);
    assert.deepEqual(s.cards[0].works, []);
    assert.equal(s.cards[0].relic, false);
    assert.equal(s.cards[0].origin, null);
  });

  t.test('卡的來歷：故事的卡記下選項的名字和第幾晚', () => {
    const line = D.STORY.lines.copywriter;
    const testCh = {
      id: 'copywriter.origintest',
      round: 2,
      day: 1,
      text: '測試來歷章',
      options: [
        {
          label: '把工作讓給舊同事',
          side: 'others',
          fx: {
            card: { name: '舊同事的謝意', tags: ['warmth', 'hope'], value: 24, star: 2, medium: 'paper' },
          },
          line: '他向你點了點頭。',
        },
      ],
    };
    line.chapters.unshift(testCh);
    try {
      const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 12 });
      s.night = 4;
      s.day = 16;
      const ch = Story.chapter(s);
      assert.equal(ch.id, 'copywriter.origintest');
      Story.choose(s, 0);
      const gained = s.cards.find((c) => c.name === '舊同事的謝意');
      assert.ok(gained);
      assert.deepEqual(gained.origin, {
        kind: 'story',
        night: 4,
        text: '第 4 晚之前：把工作讓給舊同事',
        npc: null,
      });

      // 其他來源（工作、出國、市集、複製、朋友）也正確組裝來歷
      s.cr = 1000;
      Rounds.offer(s);
      s.offer.ids = ['label', 'friend:ho', 'trip:asia'];
      IE.Auto.apply(s, 'label');
      const workCard = s.cards[s.cards.length - 1];
      assert.equal(workCard.origin.kind, 'work');
      assert.equal(workCard.origin.night, 4);
      assert.equal(workCard.origin.text, '第 4 晚之前，做「AI 數據標註」的時候留下的');

      Rounds.choose(s, 'trip:asia');
      const trip1 = Rounds.tripPick(s, 0);
      assert.deepEqual(trip1.card.origin, {
        kind: 'trip',
        night: 4,
        text: '第 4 晚之前，從亞洲帶回來',
        npc: null,
      });
      Rounds.tripPick(s, 1);

      s.phase = 'shop';
      s.night = 2;
      const sh = Rounds.shopOpen(s);
      Rounds.shopBuy(s, 'pack:' + sh.packs[0]);
      const packRes = Rounds.packPick(s, 0);
      assert.deepEqual(packRes.card.origin, {
        kind: 'shop',
        night: 2,
        text: '第 2 晚之後，在市集買的',
        npc: null,
      });
      Rounds.shopBuy(s, 'service'); // night 2 服務為 copy
      const copyRes = Rounds.pickCard(s, s.cards[0].uid);
      assert.deepEqual(copyRes.card.origin, {
        kind: 'craft',
        night: 2,
        text: '第 2 晚之後，自己做出來的',
        npc: null,
      });
    } finally {
      line.chapters.shift();
    }
  });

  t.test('回憶：超過上限時不丟棄，s.over 為 true', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 15 });
    const max = D.CRAFT.deckMax;
    const cardId = Object.keys(D.CARDS)[0];
    while (s.cards.length < max) {
      const r = R.addCard(s, cardId, { kind: 'shop' });
      assert.equal(r.dropped, null);
      assert.equal(r.over, false);
    }
    assert.equal(s.cards.length, max);
    assert.equal(s.over, false);

    const overRes = R.addCard(s, cardId, { kind: 'shop' });
    assert.equal(s.cards.length, max + 1);
    assert.equal(overRes.dropped, null);
    assert.equal(overRes.over, true);
    assert.equal(s.over, true);
    assert.equal(s.memory.length, 0);

    // s.over 為 true 時不可以進入夜晚
    assert.equal(s.phase, 'day');
    const enterRes = Rounds.afterDay(s);
    assert.deepEqual(enterRes, { ok: false, msg: D.CARD_TEXT.overHead });
    assert.equal(s.phase, 'day');
  });

  t.test('回憶：putDown 之後回到上限，卡在 s.memory', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 16 });
    const max = D.CRAFT.deckMax;
    const cardId = Object.keys(D.CARDS)[0];
    while (s.cards.length < max + 2) {
      R.addCard(s, cardId, { kind: 'shop' });
    }
    assert.equal(s.cards.length, max + 2);
    assert.equal(s.over, true);

    const u1 = s.cards[0].uid;
    const u2 = s.cards[1].uid;
    const p1 = Cards.putDown(s, u1);
    assert.equal(p1.ok, true);
    assert.equal(p1.card.uid, u1);
    assert.equal(s.cards.length, max + 1);
    assert.equal(s.over, true);
    assert.deepEqual(s.memory.map((c) => c.uid), [u1]);

    const p2 = Cards.putDown(s, u2);
    assert.equal(p2.ok, true);
    assert.equal(p2.card.uid, u2);
    assert.equal(s.cards.length, max);
    assert.equal(s.over, false);
    assert.deepEqual(s.memory.map((c) => c.uid), [u1, u2]);

    // 回到上限之後可以正常進入夜晚
    const enterOk = Rounds.afterDay(s);
    assert.equal(enterOk.ok, true);
    assert.equal(s.phase, 'night');
  });

  t.test('回憶：遺物不可以放下', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 18 });
    const max = D.CRAFT.deckMax;
    const cardId = Object.keys(D.CARDS)[0];
    while (s.cards.length < max + 1) {
      R.addCard(s, cardId, { kind: 'shop' });
    }
    const relicCard = s.cards[0];
    relicCard.relic = true;
    relicCard.wear = 99; // 即使是最殘的卡，autoPutDown 也不會選遺物

    const res = Cards.putDown(s, relicCard.uid);
    assert.deepEqual(res, { ok: false, msg: D.CARD_TEXT.relicKeep });
    assert.equal(s.cards.some((c) => c.uid === relicCard.uid), true);
    assert.equal(s.memory.length, 0);
    assert.equal(s.over, true);

    Cards.autoPutDown(s);
    assert.equal(s.over, false);
    assert.equal(s.cards.length, max);
    assert.equal(s.cards.some((c) => c.uid === relicCard.uid), true);
    assert.equal(s.memory.length, 1);
    assert.notEqual(s.memory[0].uid, relicCard.uid);
  });

  t.test('作品：noteWork 最多記 3 個，不重複', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 22 });
    const c1 = s.cards[0];
    const c2 = s.cards[1];
    const other = s.cards[2];

    Cards.noteWork(s, [c1.uid, c2.uid], '雨夜霓虹');
    Cards.noteWork(s, [c1.uid], '雨夜霓虹'); // 重複的不記第二次
    assert.deepEqual(c1.works, ['雨夜霓虹']);
    assert.deepEqual(c2.works, ['雨夜霓虹']);
    assert.deepEqual(other.works, []);

    Cards.noteWork(s, [c1.uid], '水底故鄉');
    Cards.noteWork(s, [c1.uid], '鐵皮屋頂');
    Cards.noteWork(s, [c1.uid], '地球之歌');
    assert.deepEqual(c1.works, ['水底故鄉', '鐵皮屋頂', '地球之歌']);

    // 夜晚實際打出具名組合時，Create.play 自動把組合名稱記在計分卡上
    const rec = D.RECIPES.find((r) => !r.legend && Object.keys(r.need).length === 2 && !r.cond
      && C.detectForm(Object.keys(r.need).map((tg) => ({ tags: [tg], value: 20 }))).id !== 'mix');
    assert.ok(rec);
    const [tA, tB] = Object.keys(rec.need);
    const nA = rec.need[tA];
    const nB = rec.need[tB];
    const testCards = [];
    for (let i = 0; i < nA; i++) {
      testCards.push(R.addCard(s, { id: 'tw_a' + i, name: '測試甲' + i, tags: [tA], value: 20, star: 2, medium: 'paper' }, { kind: 'craft' }).card);
    }
    for (let i = 0; i < nB; i++) {
      testCards.push(R.addCard(s, { id: 'tw_b' + i, name: '測試乙' + i, tags: [tB], value: 20, star: 2, medium: 'paper' }, { kind: 'craft' }).card);
    }
    s.phase = 'night';
    Rounds.startNight(s);
    const uids = testCards.map((c) => c.uid);
    s.session.hand = uids.slice();
    const playRes = C.play(s, uids);
    assert.ok(playRes && playRes.recipes.includes(rec.id));
    testCards.forEach((c) => {
      assert.ok(c.works.includes(rec.name));
    });
  });

  t.test('遺物：朋友被收藏之後，那位朋友的卡變成遺物', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 30 });
    const pl = Story.plan(s);
    assert.ok(pl && pl.npc);

    // 先和這位朋友聊天拿到朋友送的卡，也和另一位朋友聊天作對照
    const otherNpc = D.NPCS.find((n) => n.id !== pl.npc).id;
    R.applyChat(s, pl.npc);
    R.applyChat(s, otherNpc);

    const friendCards = s.cards.filter((c) => c.origin && c.origin.npc === pl.npc);
    const otherCards = s.cards.filter((c) => c.origin && c.origin.npc === otherNpc);
    assert.ok(friendCards.length >= 1);
    assert.ok(otherCards.length >= 1);
    friendCards.forEach((c) => {
      assert.equal(c.origin.kind, 'friend');
      assert.equal(c.relic, false);
    });

    // 篩選日該位朋友被收藏
    s.night = 3;
    s.day = 12;
    s.phase = 'review';
    s.cr = 500;
    s.soul = 5;
    Rounds.review(s);

    const afterFriendCards = s.cards.filter((c) => c.origin && c.origin.npc === pl.npc);
    assert.ok(afterFriendCards.length >= friendCards.length);
    afterFriendCards.forEach((c) => {
      assert.equal(c.relic, true);
    });
    otherCards.forEach((c) => {
      assert.equal(c.relic, false);
    });
  });

  t.test('舊模式：addCard 的回傳值和丟棄規則不變', () => {
    const s = t.run({ mode: 'standard', bg: 'copywriter', seed: 40 });
    const max = D.CRAFT.deckMax;
    const cardId = Object.keys(D.CARDS)[0];
    while (s.cards.length < max) {
      const r = R.addCard(s, cardId);
      assert.deepEqual(Object.keys(r).sort(), ['card', 'dropped']);
      assert.equal(r.dropped, null);
    }
    // 把第 3 張磨損設最高，再加一張應自動丟掉第 3 張，且回傳 { card, dropped }（沒有 over）
    const targetDrop = s.cards[2];
    targetDrop.wear = 5;
    const fullRes = R.addCard(s, cardId);
    assert.deepEqual(Object.keys(fullRes).sort(), ['card', 'dropped']);
    assert.equal(fullRes.over, undefined);
    assert.ok(fullRes.dropped);
    assert.equal(fullRes.dropped.uid, targetDrop.uid);
    assert.equal(s.cards.length, max);
    assert.equal(s.over, undefined);
    assert.equal(s.memory, undefined);
  });

  t.test('資料：D.ORIGIN、D.CARD_TEXT 和總規格逐字相同', () => {
    assert.deepEqual(D.ORIGIN, {
      start: '來浮城之前就帶在身上',
      story: '第 {n} 晚之前：{x}',
      work: '第 {n} 晚之前，做「{x}」的時候留下的',
      trip: '第 {n} 晚之前，從{x}帶回來',
      friend: '{x}給你的',
      shop: '第 {n} 晚之後，在市集買的',
      craft: '第 {n} 晚之後，自己做出來的',
    });

    assert.deepEqual(D.CARD_TEXT, {
      backHead: '這張卡的來歷',
      worksHead: '它參與過的作品',
      noWorks: '還沒有用它完成過具名的作品。',
      relic: '遺物：給你這張卡的人已經不在浮城。',
      relicKeep: '這是遺物，放不下。',
      overHead: '素材庫放不下了',
      overSub: '選一張放進回憶。放下的卡不會消失，但不能再用。',
      memoryHead: '回憶',
      memoryEmpty: '你還沒有放下過任何東西。',
    });

    assert.deepEqual(D.ECON16, {
      restSpark: 0.2,
      gigKeep: 3,
      gigMax: 2,
      friendGig: 0.25,
      gigPay: 2.2,
      startStarter: 2,
      stancePay: { comply: 1.3, resist: 0.6, care: 0.8 },
    });
  });
};
