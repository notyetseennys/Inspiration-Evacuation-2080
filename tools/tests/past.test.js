// 第十八期：失敗是必然，成長是爽感（牆、季內逐晚加難、前世的軌道、×倍率上限）。由 Claude 維護。
'use strict';

module.exports = (t) => {
  const { IE, D, R, C, S, assert } = t;
  const RD = IE.Rounds, SV = IE.Salvage;
  const run = (o) => t.run(Object.assign({ mode: 'rounds', bg: 'copywriter', seed: 11 }, o || {}));
  const meta = (sed, levels) => ({ salvage: { sediment: sed || 0, earned: 0, owned: {}, levels: levels || {} } });
  const near = (a, b, tol, msg) => assert.ok(Math.abs(a / b - 1) <= tol, (msg || '') + '：' + a + ' 和 ' + b);

  t.test('前世：五條軌道；手稿和掌聲每一級連乘，其他每一級相加', () => {
    assert.equal(SV.TRACKS.length, 5);
    ['chips', 'mult', 'spark', 'soul', 'purse'].forEach((id) => assert.ok(SV.track(id), id));
    const p = SV.perks(meta(0, { chips: 3, mult: 2, spark: 2, soul: 1, purse: 2 }));
    assert.equal(p.chipsX, Math.round((Math.pow(1.15, 3) - 1) * 100) / 100);
    assert.equal(p.multX, Math.round((Math.pow(1.15, 2) - 1) * 100) / 100);
    assert.equal(p.startSpark, 0.2);
    assert.equal(p.sparkCap, 0.2);
    assert.equal(p.soulLimit, 0.5);
    assert.equal(p.payX, 0.2);
    assert.equal(p.startCash, 8);
    assert.deepEqual(SV.perks(meta(0)), {}, '沒有升級就沒有效果');
  });

  t.test('前世：價錢是 base × growth^等級；沉積不夠不能升，升了扣沉積；到頂不能再升', () => {
    const C0 = D.PAST_COST;
    assert.equal(SV.levelCost(0), C0.base);
    assert.equal(SV.levelCost(5), Math.round(C0.base * Math.pow(C0.growth, 5)));
    const m = meta(SV.levelCost(0) + SV.levelCost(1));
    assert.ok(SV.levelUp(m, 'chips').ok);
    assert.ok(SV.levelUp(m, 'chips').ok);
    assert.equal(SV.level(m, 'chips'), 2);
    assert.equal(SV.balance(m), 0);
    assert.equal(SV.canLevel(m, 'chips').ok, false, '沉積不夠');
    const top = meta(1e9, { soul: SV.track('soul').max });
    assert.equal(SV.canLevel(top, 'soul').ok, false, '到頂');
    assert.equal(SV.totalLevel(meta(0, { chips: 2, mult: 1 })), 3);
  });

  t.test('前世：只帶進浮城年表的季節；全城篩選只看今生（舊城的節點照樣有效）', () => {
    const m = meta(0, { chips: 4, mult: 4 });
    m.salvage.owned = { bottle: true };
    const all = SV.perks(m);
    const free = SV.perks(m, { tracks: false });
    assert.ok(all.chipsX > 0 && all.multX > 0);
    assert.equal(free.chipsX, undefined);
    assert.equal(free.multX, undefined);
    assert.equal(free.startCards, 1);
  });

  t.test('前世：創作桌每一筆多一個「前世」的倍數＝(1 + 手稿)(1 + 掌聲)', () => {
    const base = run({ seed: 21 });
    const strong = run({ seed: 21, salvage: { chipsX: 0.5, multX: 0.2 } });
    const sb = C.start(base, 'normal'), ss = C.start(strong, 'normal');
    assert.deepEqual(sb.hand, ss.hand, '同一個種子，同一手牌');
    const uids = sb.hand.slice(0, 3);
    const a = C.scorePlay(base, uids, { roll: 0.5 }), b = C.scorePlay(strong, uids, { roll: 0.5 });
    const step = b.steps.find((x) => x.t === 'past');
    assert.ok(step, '有「前世」一步');
    assert.equal(step.x, 1.8);
    assert.ok(!a.steps.some((x) => x.t === 'past'), '沒有前世就沒有這一步');
    near(b.raw, a.raw * 1.8, 0.01, '分數 ×1.8');
  });

  t.test('牆：每一季最後一晚的目標再乘這一季的 wall；季內逐晚再乘 steep', () => {
    const c2 = D.CHAPTERS.find((c) => c.id === 'c2');
    const s = run({ chapter: 'c2' });
    const n = RD.nightsTotal(s);
    assert.equal(n, c2.rounds * 3);
    const E = D.ECON.curve;
    // 第 3 晚 ÷ 第 2 晚 ＝ curve 的比例 × steep
    near(RD.target(s, 3) / RD.target(s, 2), (E[2] / E[1]) * c2.steep, 0.015, '逐晚加難');
    // 最後一晚 ÷ 前一晚 ＝ curve 的比例 × steep × wall
    near(RD.target(s, n) / RD.target(s, n - 1), (E[n - 1] / E[n - 2]) * c2.steep * c2.wall, 0.015, '牆');
    // 全城篩選沒有牆、沒有逐晚加難（第十七期的校準不變）
    const f = run();
    near(RD.target(f, 15) / RD.target(f, 14), E[14] / E[13], 0.015, '全城篩選');
  });

  t.test('牆：最後一晚不達標，這一生就結束（不論還有幾次機會）；其他晚只扣一次機會', () => {
    // 用 IE.Stages.settle 結算一晚：總分 10，目標 1000
    const ses = (s) => ({ stage: { kind: RD.kindOf(s.night), name: '測試', target: 1000, index: 0, rules: [] }, log: [{ total: 10 }], total: 10 });
    const s = run({ chapter: 'c1' });
    s.night = RD.nightsTotal(s);
    s.day = RD.dayOfNight(s.night);
    s.chances = 3;
    assert.ok(RD.isWall(s));
    const out = S.settle(s, ses(s), 0);
    assert.equal(out.pass, false);
    assert.equal(out.wall, true);
    assert.equal(s.phase, 'ended');
    assert.ok(s.lost.includes('wall'));
    assert.ok(out.lines.includes(D.WALL_TEXT.fail));
    const m = run({ chapter: 'c1' });
    m.night = RD.nightsTotal(m) - 1;
    m.day = RD.dayOfNight(m.night);
    m.chances = 3;
    assert.equal(RD.isWall(m), false);
    const o2 = S.settle(m, ses(m), 0);
    assert.ok(!o2.wall);
    assert.equal(m.chances, 2);
    assert.notEqual(m.phase, 'ended');
  });

  t.test('沉積：越後的季沉下去越多（×1、×2、×3.5、×6、×12，跟各季目標的增長一致）', () => {
    const f = D.CHAPTERS.filter((c) => !c.building).map((c) => c.sediment);
    assert.deepEqual(f, [1, 2, 3.5, 6, 12]);
    assert.ok(D.SEDIMENT && D.SEDIMENT.night > 0 && D.SEDIMENT.firstClear > 0);
  });

  t.test('執念：同一季之前每連續失敗一次，沉積多 25%（最多四次）；通過就重新計算', () => {
    const s = run({ chapter: 'c1' });
    s.nightLog = [{ night: 1, score: 1000, target: 1000, pass: true }];
    const base = SV.earn(s, 'archived').total;
    const two = SV.earn(s, 'archived', { streak: 2 });
    assert.equal(two.total, base + Math.round(base * 0.5));
    assert.ok(two.lines.some((l) => l.k === 'streak' && l.text.includes('2 次')));
    assert.equal(SV.earn(s, 'archived', { streak: 9 }).total, base + Math.round(base * D.SEDIMENT.streak * D.SEDIMENT.streakMax));
    // Chapters.record 記下連續失敗的次數，回傳這一生之前的次數；通過就歸零
    const m = { runs: 3 };
    const IEC = IE.Chapters;
    assert.equal(IEC.record(m, s, 'archived').prog.streak, 0);
    assert.equal(IEC.record(m, s, 'archived').prog.streak, 1);
    const won = IEC.record(m, s, 'recruited');
    assert.equal(won.prog.streak, 2);
    assert.equal(m.chapters.fails.c1, 0);
  });

  t.test('進度：每一季記下上一生和最遠紀錄（先比晚數，再比最後一晚的比例）', () => {
    const IEC = IE.Chapters;
    const m = { runs: 3 };
    const life = (n, ratio) => { const s = run({ chapter: 'c2' }); s.nightLog = Array.from({ length: n }, (_, i) => ({ night: i + 1, score: i === n - 1 ? ratio * 1000 : 3000, target: 1000, pass: i < n - 1 })); return s; };
    const a = IEC.record(m, life(5, 0.6), 'archived').prog;
    assert.equal(a.prev, null);
    assert.equal(a.newBest, false, '第一生沒有「打破紀錄」');
    assert.deepEqual([a.now.nights, a.now.total, a.now.wall], [5, 9, false]);
    const b = IEC.record(m, life(9, 0.4), 'archived').prog;
    assert.equal(b.prev.nights, 5);
    assert.equal(b.newBest, true);
    assert.equal(b.now.wall, true);
    const c = IEC.record(m, life(9, 0.3), 'archived').prog;
    assert.equal(c.newBest, false, '同樣走到牆，但比例較低');
    assert.equal(IEC.best(m, 'c2').ratio, 0.4);
  });

  t.test('創作桌：同一件物件的 ×倍率，一筆之中最多生效 D.DESK.xCap 次', () => {
    const cap = D.DESK.xCap;
    assert.ok(cap >= 1);
    D.OBJ.__xtest = { id: '__xtest', name: '測試', desc: '', card: () => ({ xmult: 2 }) };
    try {
      const s = run({ seed: 5 });
      s.objects = ['__xtest'];
      const ses = C.start(s, 'normal');
      const uids = ses.hand.slice(0, 5);
      const r = C.scorePlay(s, uids, { roll: 0.5 });
      const cards = r.steps.filter((x) => x.t === 'card').length;
      const xs = r.steps.filter((x) => x.t === 'obj' && x.id === '__xtest');
      assert.equal(xs.length, Math.min(cap, cards), '計分 ' + cards + ' 次，×2 生效 ' + xs.length + ' 次');
      // 舊模式不受影響：每張計分的素材都 ×2
      const c = t.run({ mode: 'standard', seed: 5 });
      c.objects = ['__xtest'];
      const cs = C.start(c, 'normal');
      if (cs && cs.hand && cs.hand.length >= 4) {
        const rc = C.scorePlay(c, cs.hand.slice(0, 4), { roll: 0.5 });
        const cc = rc.steps.filter((x) => x.t === 'card').length;
        assert.equal(rc.steps.filter((x) => x.t === 'obj' && x.id === '__xtest').length, cc);
      }
    } finally {
      delete D.OBJ.__xtest;
    }
  });

  t.test('創作桌：護士的「告解室的鑰匙」在五輪模式是 ×1.5（說明也一樣）', () => {
    const s = run({ bg: 'nurse' });
    const def = C.objDef(s, 'confkey');
    assert.ok(def.desc.includes('×1.5'));
    assert.deepEqual(def.card({ tags: ['guilt'] }), { xmult: 1.5 });
    assert.equal(def.card({ tags: ['water'] }), null);
    const classic = t.run({ mode: 'standard', bg: 'nurse' });
    assert.ok(C.objDef(classic, 'confkey').desc.includes('×2'), '舊模式不變');
  });
};
