// 故事線內容的檢查（由 Claude 維護）：game/js/data-story.js 必須符合總規格 §14。
// 實作工單（WO-15-11、WO-15-13）不可以修改這個檔案，也不可以修改 data-story.js。
// 重點：每章四至五個選項；每個選項都「有得必有失」（docs/WORLD.md 第五節）；極端的選項之後會反轉（物極必反）；
// 錢的尺度跟這一輪的租金（docs/ECONOMY.md 第六節）；每個角色每一輪都有章，旗標的分支走得通。
module.exports = (t) => {
  const { D, assert } = t;
  const ST = () => D.STORY;
  const SIDES = ['survive', 'both', 'peak', 'others'];
  const FX_KEYS = ['cr', 'spark', 'sin', 'guilt', 'tag', 'atone', 'card', 'obj', 'form', 'friend', 'chance', 'target', 'rent', 'notice', 'set'];
  const PLACEHOLDERS = ['cr', 'rent', 'city', 'currency'];
  const tagOk = (x) => !!D.TAGS[x];
  const npcOk = (x) => D.NPCS.some((n) => n.id === x);
  const formOk = (x) => D.FORMS.some((f) => f.id === x);
  const isText = (x) => typeof x === 'string' && x.trim().length > 0;
  const flagsOf = (set) => (set ? [].concat(set) : []);
  const rentOf = (round) => D.ECON.rent[round - 1];

  // 總規格 §14.3「有得必有失」的定義
  const gains = (fx) => {
    const g = [];
    if (fx.cr > 0) g.push('cr');
    if (fx.spark > 0) g.push('spark');
    if (fx.friend && Object.keys(fx.friend).length) g.push('friend');
    if (fx.chance > 0) g.push('chance');
    if (fx.atone) g.push('atone');
    if (fx.card) g.push('card');
    if (fx.obj) g.push('obj');
    if (fx.form) g.push('form');
    if (fx.target && fx.target < 1) g.push('target');
    if (fx.rent && fx.rent < 1) g.push('rent');
    return g;
  };
  const costs = (fx) => {
    const c = [];
    if (fx.cr < 0) c.push('cr');
    if (fx.spark < 0) c.push('spark');
    if (fx.chance < 0) c.push('chance');
    if (fx.sin) c.push('sin');
    if (fx.target && fx.target > 1) c.push('target');
    if (fx.rent && fx.rent > 1) c.push('rent');
    return c;
  };
  // 文字：只可以用 {cr}、{rent}、{city}、{currency}；{cr} 只可以出現在有 cr 的效果旁邊；不可以直接寫金額
  const checkText = (str, where, hasCr) => {
    assert.ok(isText(str), where + '：文字是空的');
    (str.match(/\{(\w+)\}/g) || []).forEach((m) => {
      const k = m.slice(1, -1);
      assert.ok(PLACEHOLDERS.includes(k), where + '：未知的佔位符 ' + m);
      if (k === 'cr') assert.ok(hasCr, where + '：寫了 {cr}，但這裡的效果沒有 cr');
    });
    assert.ok(!/\$\s*\d/.test(str), where + '：金額要寫 {cr} 或 {rent}，不可以直接寫數字（城市不同，金額不同）');
  };
  const checkCard = (c, where) => {
    assert.ok(c && isText(c.name), where + '：素材要有名稱');
    assert.ok(Array.isArray(c.tags) && c.tags.length === 2 && c.tags.every(tagOk) && c.tags[0] !== c.tags[1], where + '：素材要有兩個不同而且存在的標籤');
    assert.ok(!c.tags.includes('guilt'), where + '：故事素材不用「愧疚」標籤（愧疚素材由 sin 產生）');
    assert.ok(Number.isInteger(c.value) && c.value > 0 && c.value <= 60, where + '：價值是 1 至 60 的整數');
    assert.ok(Number.isInteger(c.star) && c.star >= 1 && c.star <= 5, where + '：星級是 1 至 5');
    assert.ok(!c.medium || !!D.MEDIA[c.medium], where + '：媒材不存在');
  };
  const checkFx = (fx, where, bg) => {
    Object.keys(fx).forEach((k) => assert.ok(FX_KEYS.includes(k), where + '：未知的效果 ' + k));
    if ('cr' in fx) assert.ok(Number.isInteger(fx.cr) && fx.cr !== 0, where + '：cr 是不等於 0 的整數');
    if ('spark' in fx) assert.ok(typeof fx.spark === 'number' && fx.spark !== 0 && Math.abs(fx.spark) <= 1, where + '：spark');
    if ('sin' in fx) assert.ok(fx.sin > 0 && fx.sin <= 3, where + '：sin 是 0 至 3');
    if (fx.sin >= 1) assert.ok(isText(fx.guilt) && tagOk(fx.tag) && fx.tag !== 'guilt', where + '：sin ≥ 1 會留下愧疚素材，要有 guilt 和 tag（tag 不可以是 guilt）');
    else assert.ok(!('guilt' in fx) && !('tag' in fx), where + '：sin 小於 1 不會留下愧疚素材，不要寫 guilt 和 tag');
    if ('atone' in fx) assert.ok(fx.atone > 0 && fx.atone <= 3, where + '：atone 是 0 至 3');
    if ('card' in fx) checkCard(fx.card, where);
    if ('obj' in fx) assert.ok(!!D.OBJ[fx.obj], where + '：物件不存在 ' + fx.obj);
    if ('form' in fx) Object.keys(fx.form).forEach((f) => assert.ok(formOk(f) && fx.form[f] === 1, where + '：配色 ' + f));
    if ('friend' in fx) Object.keys(fx.friend).forEach((n) => assert.ok(npcOk(n) && Number.isInteger(fx.friend[n]) && fx.friend[n] > 0, where + '：朋友 ' + n));
    if ('chance' in fx) assert.ok(fx.chance === 1 || fx.chance === -1, where + '：chance 是 ±1');
    if ('target' in fx) assert.ok(fx.target >= 0.7 && fx.target <= 1.3 && fx.target !== 1, where + '：target 是 0.7 至 1.3');
    if ('rent' in fx) assert.ok(fx.rent >= 0.7 && fx.rent <= 1.3 && fx.rent !== 1, where + '：rent 是 0.7 至 1.3');
    if ('notice' in fx) Object.keys(fx.notice).forEach((sp) => assert.ok(!!ST().species[sp] && Number.isInteger(fx.notice[sp]) && fx.notice[sp] > 0, where + '：notice ' + sp));
    flagsOf(fx.set).forEach((f) => assert.ok(isText(f) && f.startsWith(bg + '.'), where + '：旗標要以「' + bg + '.」開頭：' + f));
  };
  // 第一個成立的章（總規格 §14.3；現在每章都是第 1 天）
  const chapterFor = (line, round, flags) => line.chapters.find((c) => c.round === round
    && (c.if || []).every((f) => flags.has(f)) && !(c.unless || []).some((f) => flags.has(f)));
  const eachOption = (fn) => Object.keys(ST().lines).forEach((bg) => ST().lines[bg].chapters.forEach((c) => c.options.forEach((o, i) => fn(o, c, bg, c.id + ' 選項 ' + i + '（' + o.label + '）'))));

  t.test('故事資料：D.STORY 和城市的結構齊全', () => {
    assert.ok(ST(), 'data-story.js 沒有載入');
    ['species', 'collectOrder', 'friends', 'astarNights', 'feed', 'text', 'lines'].forEach((k) => assert.ok(ST()[k], '缺少 D.STORY.' + k));
    const tx = ST().text;
    ['astarHead', 'feedHead', 'fateHead', 'preview', 'lastMeet', 'hide', 'hideFail', 'storyHead', 'epilogueHead', 'friendsHead', 'sideHead', 'extreme', 'reversalHead', 'othersCount']
      .forEach((k) => assert.ok(isText(tx[k]), '缺少 text.' + k));
    SIDES.forEach((k) => assert.ok(isText(tx.sides[k]), '缺少 text.sides.' + k));
    ['taken', 'hidden', 'stayed'].forEach((k) => assert.ok(isText(tx.friendStates[k]), '缺少 text.friendStates.' + k));
    assert.ok(tx.preview.includes('{species}') && tx.preview.includes('{npc}') && tx.preview.includes('{why}'));
    assert.ok(tx.hide.includes('{npc}') && tx.hide.includes('{cost}') && tx.hideFail.includes('{cost}'));
    assert.ok(!tx.hide.includes('$') && !tx.hideFail.includes('$'), 'hide、hideFail 的 {cost} 已經包括貨幣符號');
    assert.ok(tx.othersCount.includes('{n}'));
    assert.ok(D.CITIES && D.CITIES[D.CITY_DEFAULT], '缺少 D.CITIES 或預設城市');
    Object.keys(D.CITIES).forEach((id) => {
      const C = D.CITIES[id];
      assert.ok(isText(C.name) && isText(C.currency.name) && isText(C.currency.symbol) && C.currency.rate > 0, id + '：名稱和貨幣');
      ['rent', 'pay', 'price', 'inflation'].forEach((k) => assert.ok(C.econ[k] > 0, id + '：econ.' + k));
    });
  });

  t.test('故事資料：外星種族和收藏次序', () => {
    Object.keys(ST().species).forEach((id) => assert.ok(isText(ST().species[id].name), '種族要有名稱：' + id));
    assert.equal(ST().collectOrder.length, 4, '第 1 至 4 輪各一個收藏的種族');
    ST().collectOrder.forEach((sp) => {
      const S = ST().species[sp];
      assert.ok(S, '收藏的種族不存在：' + sp);
      // 候選用完、改抽其他朋友時用的通用文字（總規格 §14.4.1）
      assert.ok(isText(S.why) && S.why.includes('{npc}'), sp + '：要有通用的 why（含 {npc}）');
      assert.ok(isText(S.fate) && S.fate.includes('{npc}'), sp + '：要有通用的 fate（含 {npc}）');
      assert.ok(Object.keys(ST().friends).some((n) => ST().friends[n].collectors.includes(sp)), sp + '：至少一位朋友的 collectors 包含這個種族');
    });
  });

  t.test('故事資料：朋友線齊全（每位朋友、每個收藏家都有文字）', () => {
    const F = ST().friends;
    D.NPCS.forEach((n) => assert.ok(F[n.id], '朋友沒有朋友線：' + n.id));
    Object.keys(F).forEach((id) => {
      const f = F[id];
      assert.ok(npcOk(id), '不是朋友：' + id);
      assert.ok(Array.isArray(f.collectors) && f.collectors.length >= 1, id + '：collectors');
      f.collectors.forEach((sp) => {
        assert.ok(ST().collectOrder.includes(sp), id + '：collectors 只用會來收藏的種族：' + sp);
        assert.ok(isText(f.why[sp]), id + '：缺少 why.' + sp);
        assert.ok(isText(f.fate[sp]), id + '：缺少 fate.' + sp);
      });
      assert.ok(!!D.OBJ[f.gift], id + '：贈物不存在 ' + f.gift);
      ['farewell', 'nomeet', 'hiddenLine'].forEach((k) => assert.ok(isText(f[k]), id + '：缺少 ' + k));
      checkCard(f.note, id + ' 的紙條');
    });
  });

  t.test('故事資料：阿星和今日快訊', () => {
    const nights = Object.keys(ST().astarNights).map(Number);
    assert.deepEqual(nights, [1, 3, 5, 7, 9, 11, 13, 15], '阿星隔一晚一則（第 1、3……15 晚）');
    nights.forEach((n) => assert.ok(D.ASTAR[ST().astarNights[n]], '第 ' + n + ' 晚對應的 D.ASTAR 日子不存在'));
    assert.ok(ST().feed.length >= 15, '今日快訊至少 15 則');
    ST().feed.forEach((x, i) => assert.ok(isText(x) && !/\$\s*\d/.test(x), '第 ' + i + ' 則快訊是空的，或者直接寫了金額'));
    assert.equal(new Set(ST().feed).size, ST().feed.length, '快訊不可以重複');
  });

  t.test('故事資料：每章四至五個選項，生存、兼顧、巔峰都有', () => {
    const ids = new Set();
    Object.keys(ST().lines).forEach((bg) => {
      assert.ok(D.BACKGROUNDS[bg], '不是角色：' + bg);
      const line = ST().lines[bg];
      assert.ok(Array.isArray(line.chapters) && line.chapters.length >= 5, bg + '：至少五章');
      line.chapters.forEach((c) => {
        assert.ok(isText(c.id) && c.id.startsWith(bg + '.') && !ids.has(c.id), '章的 id 要唯一，並以角色開頭：' + c.id);
        ids.add(c.id);
        assert.ok(Number.isInteger(c.round) && c.round >= 1 && c.round <= 5, c.id + '：round');
        assert.ok(Number.isInteger(c.day) && c.day >= 1 && c.day <= 3, c.id + '：day');
        assert.ok(!c.city || (Array.isArray(c.city) && c.city.every((x) => D.CITIES[x])), c.id + '：city 是城市 id 的陣列');
        checkText(c.text, c.id, false);
        ['if', 'unless'].forEach((k) => assert.ok(!c[k] || (Array.isArray(c[k]) && c[k].every(isText)), c.id + '：' + k + ' 是旗標的陣列'));
        assert.ok(c.options.length >= 4 && c.options.length <= 5, c.id + '：四至五個選項');
        const sides = c.options.map((o) => o.side);
        sides.forEach((x) => assert.ok(SIDES.includes(x), c.id + '：未知的 side ' + x));
        ['survive', 'both', 'peak'].forEach((x) => assert.ok(sides.includes(x), c.id + '：缺少「' + ST().text.sides[x] + '」的選項'));
        assert.ok(c.options.filter((o) => o.extreme).length <= 1, c.id + '：每章最多一個極端的選項');
        assert.equal(new Set(c.options.map((o) => o.label)).size, c.options.length, c.id + '：選項的標題不可以重複');
        c.options.forEach((o, i) => {
          const where = c.id + ' 選項 ' + i;
          checkText(o.label, where + ' 的 label', 'cr' in o.fx);
          checkText(o.line, where + ' 的 line', 'cr' in o.fx);
          checkFx(o.fx, where, bg);
        });
      });
    });
  });

  t.test('故事資料：每個選項都有得也有失', () => {
    eachOption((o, c, bg, where) => {
      assert.ok(gains(o.fx).length >= 1, where + '：沒有「得」');
      assert.ok(costs(o.fx).length >= 1, where + '：沒有「失」');
    });
  });

  t.test('故事資料：極端的選項之後會反轉（物極必反）', () => {
    let n = 0;
    eachOption((o, c, bg, where) => {
      if (!o.extreme) {
        assert.ok(!('later' in o), where + '：只有極端的選項有 later');
        return;
      }
      n++;
      assert.ok(o.side === 'survive' || o.side === 'peak', where + '：極端只可以是生存或巔峰');
      const L = o.later;
      assert.ok(L && (L.after === 1 || L.after === 2), where + '：later.after 是 1 或 2');
      assert.ok(c.round + L.after <= 5, where + '：反轉要在第 5 輪或之前發生');
      checkText(L.text, where + ' 的 later.text', 'cr' in L.fx);
      checkFx(L.fx, where + ' 的 later.fx', bg);
      assert.ok(!('set' in L.fx), where + '：反轉不設定旗標');
      assert.ok(costs(L.fx).length >= 1, where + '：反轉至少有一項「失」');
    });
    assert.ok(n >= Object.keys(ST().lines).length, '每個角色至少一個極端的選項');
  });

  t.test('故事資料：錢的尺度跟這一輪的租金（docs/ECONOMY.md 第六節）', () => {
    eachOption((o, c, bg, where) => {
      const R = rentOf(c.round);
      const cr = o.fx.cr || 0;
      if (o.extreme) assert.ok(Math.abs(cr) <= 1.5 * R, where + '：極端的金額不超過這一輪租金的 1.5 倍（' + R + '）');
      else if (cr > 0) assert.ok(cr <= 0.8 * R, where + '：收入不超過這一輪租金的 0.8 倍（' + R + '）');
      else assert.ok(-cr <= 0.5 * R, where + '：支出不超過這一輪租金的 0.5 倍（' + R + '）');
      if (o.later && o.later.fx.cr) assert.ok(Math.abs(o.later.fx.cr) <= 0.5 * rentOf(c.round + o.later.after), where + '：反轉的金額不超過那一輪租金的 0.5 倍');
    });
  });

  t.test('故事資料：每一條路都有五章，每一章、每個結語都走得到', () => {
    Object.keys(ST().lines).forEach((bg) => {
      const line = ST().lines[bg];
      const set = new Set();
      line.chapters.forEach((c) => c.options.forEach((o) => flagsOf(o.fx.set).forEach((f) => set.add(f))));
      const used = [].concat(...line.chapters.map((c) => (c.if || []).concat(c.unless || [])), ...line.epilogue.map((e) => (e.if || []).concat(e.unless || [])));
      used.forEach((f) => assert.ok(set.has(f), bg + '：旗標 ' + f + ' 沒有選項會設定'));
      const seenCh = new Set(), seenEp = new Set();
      let paths = 0;
      const walk = (round, flags) => {
        if (round > 5) {
          paths++;
          const e = line.epilogue.findIndex((x) => (x.if || []).every((f) => flags.has(f)) && !(x.unless || []).some((f) => flags.has(f)));
          assert.ok(e >= 0, bg + '：有一條路沒有結語');
          seenEp.add(e);
          return;
        }
        const c = chapterFor(line, round, flags);
        assert.ok(c, bg + '：第 ' + round + ' 輪有一條路沒有章（旗標：' + [...flags].join('、') + '）');
        seenCh.add(c.id);
        c.options.forEach((o) => walk(round + 1, new Set([...flags, ...flagsOf(o.fx.set)])));
      };
      walk(1, new Set());
      assert.ok(paths >= 1024, bg + '：至少 4⁵ 條路');
      line.chapters.forEach((c) => assert.ok(seenCh.has(c.id), bg + '：章 ' + c.id + ' 走不到'));
      line.epilogue.forEach((x, i) => {
        checkText(x.text, bg + ' 結語 ' + i, false);
        assert.ok(seenEp.has(i), bg + '：結語 ' + i + ' 走不到');
      });
      const last = line.epilogue[line.epilogue.length - 1];
      assert.ok(!last.if && !last.unless, bg + '：最後一個結語不設條件（預設）');
    });
  });

  t.test('故事資料：R 級角色全部有角色線', () => {
    Object.keys(D.BACKGROUNDS).filter((id) => D.BACKGROUNDS[id].rarity === 'R')
      .forEach((id) => assert.ok(ST().lines[id], 'R 級角色沒有角色線：' + id));
  });
};
