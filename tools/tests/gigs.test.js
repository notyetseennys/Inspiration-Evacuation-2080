// 第十六期（WO-16-02）：差事系統、生活卡出牌規則、過期與報酬單元測試。
'use strict';

module.exports = (t) => {
  if (!t.IE.Cards) require('../../game/js/cards.js');
  const { IE, D, R, C, assert } = t;
  const Rounds = IE.Rounds;
  const Story = IE.Story;

  const WORK_IDS = ['label', 'delivery', 'clinic', 'salvage', 'haggle'];

  t.test('差事：每輪第一天得到一個', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 11 });
    assert.equal(Array.isArray(s.gigs), true);
    assert.equal(s.gigs.length, 1);
    assert.equal(s.gigs[0].from, 'round');
    assert.equal(s.gigs[0].night, 1);
    assert.equal(WORK_IDS.includes(s.gigs[0].micro), true);

    // 舊存檔缺少 s.gigs 時由 IE.Rounds 自動補上
    delete s.gigs;
    Rounds.offer(s);
    assert.equal(Array.isArray(s.gigs), true);

    // 走過五輪：只有每輪第一天（第 1、4、7、10、13 晚）會配給新的 round 差事
    const s2 = t.run({ mode: 'rounds', bg: 'copywriter', seed: 23 });
    for (let night = 1; night <= 15; night++) {
      assert.equal(s2.night, night);
      Rounds.expireGigs(s2);
      const isRoundDay1 = (night - 1) % 3 === 0;
      if (isRoundDay1) {
        assert.equal(s2.gigs.length, 1, '第 ' + night + ' 晚應有本輪配給的差事');
        assert.equal(s2.gigs[0].from, 'round');
        assert.equal(s2.gigs[0].night, night);
        assert.equal(WORK_IDS.includes(s2.gigs[0].micro), true);
        // 當天把差事用掉，確認同輪第 2、3 天不會再配給
        Rounds.useGig(s2, s2.gigs[0].micro);
        assert.equal(s2.gigs.length, 0);
      } else {
        assert.equal(s2.gigs.length, 0, '第 ' + night + ' 晚不應配給 round 差事');
      }
      if (night < 15) Rounds.advance(s2);
    }

    // 和朋友聊天後，按 ECON16.friendGig 機率獲得對應 D.GIG_FRIEND[npc] 的差事
    const kenName = D.NPCS.find((n) => n.id === 'ken').name;
    let gotFriendGig = 0;
    for (let seed = 1; seed <= 80; seed++) {
      const sf = t.run({ mode: 'rounds', bg: 'copywriter', seed });
      sf.gigs = [];
      sf.offer = { night: 1, ids: ['friend:ken', 'volunteer', 'rest'], gig: null, rerolls: 0, chosen: null };
      sf.cr = 200;
      Rounds.choose(sf, 'friend:ken');
      if (sf.gigs.length === 1) {
        gotFriendGig++;
        assert.deepEqual(sf.gigs[0], {
          micro: 'salvage',
          from: 'friend',
          x: kenName,
          night: 1,
        });
      }
    }
    assert.ok(gotFriendGig >= 8 && gotFriendGig <= 40, '朋友介紹差事應按機率觸發：實際 ' + gotFriendGig + '/80');

    // 生活卡 rest（在家發呆）：火花 +ECON16.restSpark 並進入夜晚
    const sr = t.run({ mode: 'rounds', bg: 'copywriter', seed: 9 });
    sr.gigs = [];
    sr.spark = 2;
    sr.offer = { night: 1, ids: ['rest', 'friend:ho', 'volunteer'], gig: null, rerolls: 0, chosen: null };
    const rInfo = Rounds.cardInfo(sr, 'rest');
    assert.equal(rInfo.kind, 'rest');
    assert.equal(rInfo.name, '在家發呆');
    assert.equal(rInfo.sub, '甚麼都不做。這在浮城是一種奢侈。');
    assert.equal(rInfo.micro, null);
    Rounds.choose(sr, 'rest');
    assert.ok(Math.abs(sr.spark - (2 + D.ECON16.restSpark)) < 1e-9);
    assert.equal(sr.phase, 'night');
  });

  t.test('差事：沒有差事時，offer 不會出現小遊戲的卡', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 31 });
    for (let night = 1; night <= 15; night++) {
      s.night = night;
      s.day = 4 * night;
      s.gigs = [];
      s.offer = null;
      const of = Rounds.offer(s);
      assert.equal(of.gig, null);
      for (let r = 0; r < 25; r++) {
        assert.equal(s.offer.ids.length, 3);
        assert.equal(new Set(s.offer.ids).size, 3);
        const c1 = Rounds.cardInfo(s, s.offer.ids[0]);
        assert.equal(['friend', 'volunteer', 'rest'].includes(c1.kind), true);
        s.offer.ids.forEach((id) => {
          const info = Rounds.cardInfo(s, id);
          assert.equal(info.micro, null, '沒有差事時不應出現小遊戲卡：' + id);
          assert.equal(info.gig, null);
        });
        s.cr = 9999;
        Rounds.rerollOffer(s);
      }
    }

    // 有第二個屬於 life 的差事（如 busk）時，第二張可以抽到該小遊戲，但不會抽到其他 life 小遊戲
    const sLife = t.run({ mode: 'rounds', bg: 'copywriter', seed: 42 });
    sLife.gigs = [];
    Rounds.addGig(sLife, { micro: 'label', from: 'round' });
    Rounds.addGig(sLife, { micro: 'busk', from: 'friend', x: '阿飛' });
    let sawBuskInSlot2 = false;
    for (let i = 0; i < 60; i++) {
      sLife.offer = null;
      const of = Rounds.offer(sLife);
      assert.equal(of.ids[0], 'label');
      if (of.ids[1] === 'busk') sawBuskInSlot2 = true;
      assert.equal(['dive', 'garden'].includes(of.ids[1]), false);
      assert.equal(Rounds.cardInfo(sLife, of.ids[2]).micro, null);
    }
    assert.equal(sawBuskInSlot2, true);
  });

  t.test('差事：有差事時，第一張是那個小遊戲，選了之後差事用掉', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 50 });
    s.gigs = [];
    Rounds.addGig(s, { micro: 'delivery', from: 'story', x: '舊同事介紹', night: 1 });
    Rounds.addGig(s, { micro: 'clinic', from: 'friend', x: 'Miu', night: 2 });

    const of = Rounds.offer(s);
    assert.equal(of.ids[0], 'delivery');
    assert.deepEqual(of.gig, { micro: 'delivery', from: 'story', x: '舊同事介紹', night: 1 });
    const c1 = Rounds.cardInfo(s, of.ids[0]);
    assert.equal(c1.micro, 'delivery');
    assert.deepEqual(c1.gig, { micro: 'delivery', from: 'story', x: '舊同事介紹', night: 1 });

    // 選了第一張差事卡之後，最舊的 delivery 差事立即用掉，只剩 clinic
    const res = Rounds.choose(s, 'delivery');
    assert.deepEqual(res, { micro: 'delivery' });
    assert.equal(s.gigs.length, 1);
    assert.equal(s.gigs[0].micro, 'clinic');

    // 兩個 micro 相同的差事時，useGig 會移除最舊的一個
    s.gigs = [];
    Rounds.addGig(s, { micro: 'label', from: 'round', night: 1 });
    Rounds.addGig(s, { micro: 'label', from: 'friend', x: '阿豪', night: 2 });
    const used = Rounds.useGig(s, 'label');
    assert.equal(used.night, 1);
    assert.equal(s.gigs.length, 1);
    assert.equal(s.gigs[0].night, 2);
  });

  t.test('差事：超過 gigKeep 天就過期', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 60 });
    s.gigs = [];
    const keep = D.ECON16.gigKeep; // 3
    Rounds.addGig(s, { micro: 'salvage', from: 'friend', x: '阿 Ken', night: 1 });

    // 第 1、2、3 晚（共留 gigKeep 天）皆未過期
    for (let n = 1; n < 1 + keep; n++) {
      s.night = n;
      const exp = Rounds.expireGigs(s);
      assert.deepEqual(exp, []);
      assert.equal(s.gigs.length, 1);
    }

    // 第 1 + gigKeep 晚（第 4 晚）：超過保留天數，expireGigs 移除並回傳該差事
    s.night = 1 + keep;
    const exp = Rounds.expireGigs(s);
    assert.deepEqual(exp, [{ micro: 'salvage', from: 'friend', x: '阿 Ken', night: 1 }]);
    assert.deepEqual(s.gigs, []);
    assert.deepEqual(Rounds.expireGigs(s), []);

    // 跨輪換日（第 3 晚 → advance 到第 4 晚）：舊差事過期仍由 expireGigs 回傳，同時拿到第 2 輪的新差事
    const s2 = t.run({ mode: 'rounds', bg: 'copywriter', seed: 61 });
    s2.gigs = [
      { micro: 'delivery', from: 'round', night: 1 },
      { micro: 'busk', from: 'friend', x: '阿飛', night: 2 },
    ];
    s2.night = 3;
    s2.day = 12;
    Rounds.advance(s2);
    assert.equal(s2.night, 4);
    const exp2 = Rounds.expireGigs(s2);
    assert.deepEqual(exp2, [{ micro: 'delivery', from: 'round', night: 1 }]);
    assert.equal(s2.gigs.length, 2);
    assert.equal(s2.gigs[0].micro, 'busk');
    assert.equal(s2.gigs[1].from, 'round');
    assert.equal(s2.gigs[1].night, 4);
  });

  t.test('差事：最多 gigMax 個', () => {
    const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 70 });
    s.gigs = [];
    const max = D.ECON16.gigMax; // 2
    for (let i = 0; i < max; i++) {
      const r = Rounds.addGig(s, { micro: WORK_IDS[i], from: 'story', x: '差事' + i });
      assert.equal(r.ok, true);
    }
    assert.equal(s.gigs.length, max);

    const over = Rounds.addGig(s, { micro: 'dive', from: 'friend', x: '陳伯' });
    assert.deepEqual(over, { ok: false });
    assert.equal(s.gigs.length, max);
  });

  t.test('差事：故事的 fx.gig 會加入差事', () => {
    const line = D.STORY.lines.copywriter;
    const fakeCh = {
      id: 'copywriter.gigtest',
      round: 1,
      day: 2,
      text: '測試故事差事章',
      options: [
        {
          label: '接下舊同事轉介的急單',
          side: 'survive',
          fx: { gig: 'delivery' },
          line: '你把地址記在手背上。',
        },
      ],
    };
    line.chapters.unshift(fakeCh);
    try {
      const s = t.run({ mode: 'rounds', bg: 'copywriter', seed: 80 });
      s.gigs = [];
      s.night = 2;
      s.day = 8;
      const ch = Story.chapter(s);
      assert.equal(ch.id, 'copywriter.gigtest');
      Story.choose(s, 0);
      assert.deepEqual(s.gigs, [
        {
          micro: 'delivery',
          from: 'story',
          x: '接下舊同事轉介的急單',
          night: 2,
        },
      ]);
    } finally {
      line.chapters.shift();
    }
  });

  t.test('報酬：經由差事做的小遊戲，收入乘 gigPay，B 或以上必定有卡', () => {
    // 1. 收入乘 ECON16.gigPay（與同種子非差事執行比較）
    const sBase = t.run({ mode: 'rounds', bg: 'copywriter', seed: 91 });
    sBase.gigs = [];
    const crBase0 = sBase.cr;
    const labelRes = { cr: 50, drain: 0.1, correct: 24, wrong: 2, maxCombo: 18, flows: 0, caught: 0 };
    const repBase = R.applyMicro(sBase, 'label', labelRes);
    const baseGain = sBase.cr - crBase0;
    assert.equal(repBase.deltas.cr, baseGain);

    const sGig = t.run({ mode: 'rounds', bg: 'copywriter', seed: 91 });
    sGig.gigs = [];
    Rounds.addGig(sGig, { micro: 'label', from: 'round' });
    Rounds.offer(sGig);
    Rounds.choose(sGig, 'label');
    const crGig0 = sGig.cr;
    const repGig = R.applyMicro(sGig, 'label', labelRes);
    const gigGain = sGig.cr - crGig0;
    assert.equal(gigGain, Math.round(baseGain * D.ECON16.gigPay));
    assert.equal(repGig.deltas.cr, gigGain);

    // 2. 評級 B 或以上必定得到至少一張卡（dive 沒撈遺物只靠捕魚達 B 級時，非差事一律 0 張卡；經由差事必定拿到 1 張卡）
    const bDiveRes = { relics: [], money: 30, fish: { sardine: 8 }, hits: 0, drowned: false, lockers: 0 };
    for (let seed = 1; seed <= 20; seed++) {
      const sNo = t.run({ mode: 'rounds', bg: 'copywriter', seed });
      sNo.gigs = [];
      const repNo = R.applyMicro(sNo, 'dive', bDiveRes);
      assert.equal(repNo.rank.id, 'B');
      assert.equal(repNo.cards.length, 0);

      const sYes = t.run({ mode: 'rounds', bg: 'copywriter', seed });
      sYes.gigs = [];
      Rounds.addGig(sYes, { micro: 'dive', from: 'friend', x: '陳伯' });
      Rounds.useGig(sYes, 'dive');
      const repYes = R.applyMicro(sYes, 'dive', bDiveRes);
      assert.equal(repYes.rank.id, 'B');
      assert.equal(repYes.cards.length, 1, '差事 B 級必定有卡（seed=' + seed + '）');
      repYes.cards.forEach((c) => {
        assert.deepEqual(c.origin, {
          kind: 'work',
          night: 1,
          text: '第 1 晚之前，做「舊城潛水」的時候留下的',
          npc: null,
        });
      });
    }

    // 3. 星級提升：A → ★2、S → ★3、SS → ★4；比原本的星級高才改（原本已更高的卡保持原星級）
    const cases = [
      { deliveries: 7, late: 1, wantRank: 'A', wantStar: 2 },
      { deliveries: 8, late: 1, wantRank: 'S', wantStar: 3 },
      { deliveries: 9, late: 1, wantRank: 'SS', wantStar: 4 },
    ];
    cases.forEach(({ deliveries, late, wantRank, wantStar }) => {
      const st = t.run({ mode: 'rounds', bg: 'copywriter', seed: 105 });
      st.gigs = [];
      Rounds.addGig(st, { micro: 'delivery', from: 'round' });
      Rounds.useGig(st, 'delivery');
      const rep = R.applyMicro(st, 'delivery', { cr: 60, deliveries, late, hits: 0 });
      assert.equal(rep.rank.id, wantRank);
      assert.ok(rep.cards.length >= 1);
      let sawUpgraded = false;
      rep.cards.forEach((c) => {
        const baseStar = C.starOf(D.CARDS[c.id]);
        assert.equal(C.starOf(c), Math.max(baseStar, wantStar));
        if (baseStar < wantStar && C.starOf(c) === wantStar) sawUpgraded = true;
        assert.equal(c.origin.kind, 'work');
        assert.equal(c.origin.text, '第 1 晚之前，做「外送潛水」的時候留下的');
      });
      assert.equal(sawUpgraded, true, wantRank + ' 級應將低星素材提升至 ★' + wantStar);
    });

    // 原本已是 ★5（極稀有傳說素材 z_*）在 A 級差事中不會被降為 ★2
    const legendId = Object.keys(D.CARDS).find((k) => D.CARDS[k].rarity === 'legend');
    if (legendId) {
      const sLeg = t.run({ mode: 'rounds', bg: 'copywriter', seed: 108 });
      sLeg.gigs = [];
      Rounds.addGig(sLeg, { micro: 'dive', from: 'friend', x: '陳伯' });
      Rounds.useGig(sLeg, 'dive');
      const repLeg = R.applyMicro(sLeg, 'dive', {
        relics: [legendId],
        money: 30,
        fish: { sardine: 8 },
        hits: 0,
        drowned: false,
        lockers: 0,
      });
      assert.ok(['A', 'S', 'SS'].includes(repLeg.rank.id));
      const legCard = repLeg.cards.find((c) => c.id === legendId);
      assert.ok(legCard);
      assert.equal(C.starOf(legCard), 5);
    }
  });

  t.test('資料：D.GIG_TEXT 和總規格逐字相同', () => {
    assert.deepEqual(D.GIG_TEXT, {
      tag: '差事',
      from: {
        round: '人才發展局本季配給的工作',
        story: '{x}',
        friend: '{x}介紹的',
      },
      left: '還有 {n} 天',
      expired: '「{x}」的差事過期了。系統已經把它分配給更積極的人。',
      none: '今天沒有工作。這在浮城很正常。',
    });

    assert.deepEqual(D.GIG_FRIEND, {
      dj: 'busk',
      ho: 'label',
      ken: 'salvage',
      miu: 'clinic',
      fong: 'busk',
      chan: 'dive',
      yu: 'delivery',
      mary: 'garden',
    });
  });
};
