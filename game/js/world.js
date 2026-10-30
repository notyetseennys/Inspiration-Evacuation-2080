// 《靈感撤離 2080》旅行與金錢：出國探索、極稀有素材、天空區畫廊、古董市場、家居。純邏輯，瀏覽器與 Node 共用。
// 錢在這裡變得很有用：旅費、家具、古董都要錢；缺錢時可以把作品賣給天空區，但那件作品的外星訊號會減半。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA, R = IE.Rules;
  const round1 = (v) => Math.round(v * 10) / 10;
  const pctText = (p) => Math.round(p * 1000) / 10 + '%';
  const owned = (s, id) => s.cards.some((c) => c.id === id);
  const stat = (s, k) => s.attr[k];

  // ---------- 家居 ----------
  // 家具放在家裡才有用：露宿街頭或出門旅行時都不算
  const decorOn = (s, id) => !!(s.decor && s.decor[id]) && s.floor > 0 && !s.trip;
  function decorList(s) {
    return D.DECOR.map((d) => {
      const own = !!(s.decor && s.decor[d.id]);
      return Object.assign({}, d, { owned: own,
        reason: own ? '已擁有' : s.floor === 0 ? '你沒有家可以放' : s.trip ? '你不在浮城' : s.cr < d.cost ? '錢不夠' : null });
    });
  }
  function buyDecor(s, id) {
    const it = decorList(s).find((d) => d.id === id);
    if (!it || it.reason) return { ok: false, msg: it ? it.reason : '沒有這件家具' };
    s.cr -= it.cost;
    s.decor[id] = s.day;
    s.stats.decor = Object.keys(s.decor).length;
    return { ok: true, msg: '「' + it.name + '」搬進了你的家' };
  }
  // 每天晚上：植物與魚缸令火花慢慢回升；唱盤、霓虹燈、海報會帶來素材
  function decorDaily(s, rep) {
    if (decorOn(s, 'plant')) R.addSpark(s, 0.05, true);
    if (decorOn(s, 'aquarium')) { R.addSpark(s, 0.1, true); R.train(s, { calm: 0.3 }, null); }
    Object.keys(D.DECOR_GIFTS).forEach((id) => {
      const g = D.DECOR_GIFTS[id];
      if (decorOn(s, id) && s.day % g.every === 0) {
        rep.line(D.DEC[id].name + '帶給你一點靈感', 'good');
        rep.gain(R.pick(s, g.cards));
      }
    });
  }

  // ---------- 天空區畫廊：把作品賣掉 ----------
  // 天空區收藏家按作品的原始分數出價；賣出的作品留在別人的浴室裡，外星訊號只剩一半
  const GALLERY_EVENTS = { skyparty: 1.5, crash: 0.6, tax: 0.8, tourists: 1.3 };
  function galleryMult(s) {
    return Object.keys(GALLERY_EVENTS).reduce((a, id) => a * (R.eventActive(s, id) ? GALLERY_EVENTS[id] : 1), 1);
  }
  // 出價看這件作品在今天的外星門檻面前有多亮：同一件作品，越遲賣越不值錢
  const GALLERY_K = Number((typeof process !== 'undefined' && process.env && process.env.GALLERY_K) || 1000);
  const workPrice = (s, w) => Math.max(20, Math.round(GALLERY_K * w.score / R.threshold(s) * (0.8 + 0.006 * stat(s, 'social')) * galleryMult(s)));
  function galleryOffers(s) {
    const today = s.gallerySoldDay === s.day;
    return s.works.map((w, i) => ({ i, name: w.name, form: w.form, day: w.day, raw: w.raw, score: w.score, sold: !!w.sold, price: workPrice(s, w),
      lose: Math.round(w.score / 2),
      reason: w.sold ? '已賣出' : s.trip ? '你不在浮城' : today ? '畫廊今天只收一件作品' : null })).reverse();
  }
  function sellWork(s, i) {
    const w = s.works[i];
    const o = galleryOffers(s).find((x) => x.i === i);
    if (!w || !o || o.reason) return { ok: false, msg: o ? o.reason : '沒有這件作品' };
    w.sold = true;
    w.score -= o.lose;
    s.cr += o.price; s.stats.crEarned += o.price;
    s.stats.sales = (s.stats.sales || 0) + 1;
    s.gallerySoldDay = s.day;
    R.train(s, { social: 0.6, obey: 0.4 }, null);
    const where = R.pick(s, ['客廳', '浴室', '遊艇', '寵物房', '電梯大堂', '第二個浴室']);
    return { ok: true, price: o.price, lose: o.lose, msg: '《' + w.name + '》以 $' + o.price + ' 賣出，現在掛在某位收藏家的' + where + '。外星訊號 −' + o.lose.toLocaleString() };
  }

  // ---------- 天空區委託：有錢人想要某種作品 ----------
  // 每五天換一批：兩個委託，各要求作品裡有某些標籤；某一次下筆湊齊了，就收到酬金
  const WANTS = ['想掛在遊艇上', '想送給情人', '想放在新開的餐廳', '想擺在公司大堂', '想在派對上炫耀', '想放在寵物房', '想證明自己有品味', '想掛在第二間浴室'];
  const BUYERS = ['天空區的富豪', '一位科技新貴', '某位議員的太太', '外星觀光團的團長', '一間 AI 公司', '一位退休的天空區法官'];
  function commissions(s) {
    const period = Math.floor((s.day - 1) / 5);
    if (!s.comm || s.comm.period !== period) {
      const pool = Object.keys(D.TAGS).filter((k) => k !== 'guilt' && k !== 'ancient' && k !== 'cosmic');
      const items = [];
      for (let i = 0; i < 2; i++) {
        const need = {};
        const travel = R.rand(s) < 0.45;
        if (travel) need[R.rand(s) < 0.5 ? 'ancient' : 'cosmic'] = 1 + (R.rand(s) < 0.3 ? 1 : 0);
        while (Object.keys(need).length < 2) { const k = R.pick(s, pool); if (!need[k]) need[k] = 1 + (R.rand(s) < 0.35 ? 1 : 0); }
        const n = Object.values(need).reduce((a, b) => a + b, 0);
        items.push({ id: period + '-' + i, need, pay: Math.round((60 + 35 * n + (travel ? 120 : 0)) * (1 + 0.15 * s.quarter)),
          who: R.pick(s, BUYERS), want: R.pick(s, WANTS), done: false });
      }
      s.comm = { period, until: period * 5 + 5, items };
    }
    return s.comm.items.map((c) => Object.assign({}, c, { until: s.comm.until,
      text: c.who + c.want + '：要一件有' + Object.keys(c.need).map((k) => (c.need[k] > 1 ? c.need[k] + ' 張' : '') + '「' + D.TAGS[k].name + '」').join('和') + '的作品' }));
  }
  // 一晚的創作完成後：每一次下筆檢查有沒有湊齊某個委託的標籤
  function settleCommissions(s, ses) {
    if (!s.comm || !ses || !ses.log.length) return [];
    const paid = [];
    s.comm.items.forEach((c) => {
      if (c.done) return;
      // 要湊齊標籤，而且那一次下筆要有一定水準（本季門檻的 2%）
      const hit = ses.log.some((x) => x.total >= R.threshold(s) * 0.02 && Object.keys(c.need).every((k) => x.tags.filter((t) => t === k).length >= c.need[k]));
      if (!hit) return;
      c.done = true;
      s.cr += c.pay; s.stats.crEarned += c.pay;
      s.stats.commissions = (s.stats.commissions || 0) + 1;
      R.train(s, { obey: 0.6 }, null);
      paid.push({ text: c.who + '收到了作品', pay: c.pay });
    });
    return paid;
  }

  // ---------- 古董市場：每四天換一批貨 ----------
  function antiqueOffers(s) {
    const period = Math.floor((s.day - 1) / 4);
    if (!s.antique || s.antique.period !== period) {
      const pool = D.ANTIQUES.slice();
      const items = [];
      while (items.length < 3 && pool.length) {
        const id = pool.splice(Math.floor(R.rand(s) * pool.length), 1)[0];
        items.push({ id, price: Math.round(D.CARDS[id].value * (5 + R.rand(s) * 3)) });
      }
      // 外星觀光團來的時候，有人在賣月塵
      if (R.eventActive(s, 'tourists')) items.push({ id: 't_moondust', price: 480, special: '外星觀光團的紀念品' });
      // 時間裂縫期間，攤檔上會出現不屬於這條時間線的東西
      if (R.eventActive(s, 'timeslip')) items.push({ id: 't_scroll', price: 520, special: '來自另一條時間線' });
      s.antique = { period, items };
    }
    const mult = R.eventActive(s, 'crash') ? 0.6 : 1;
    return s.antique.items.map((it) => {
      const c = D.CARDS[it.id];
      const price = Math.round(it.price * mult);
      return { id: it.id, name: c.name, tags: c.tags, value: c.value, origin: c.origin, rarity: c.rarity, price, special: it.special || null,
        reason: it.sold ? '已賣出' : s.trip ? '你不在浮城' : s.cr < price ? '錢不夠' : null, sold: !!it.sold };
    });
  }
  function buyAntique(s, id) {
    const o = antiqueOffers(s).find((x) => x.id === id);
    if (!o || o.reason) return { ok: false, msg: o ? o.reason : '沒有這件貨' };
    s.cr -= o.price;
    s.antique.items.find((x) => x.id === id).sold = true;
    const res = R.addCard(s, id);
    return { ok: true, msg: '買下了「' + o.name + '」' + (res.dropped ? '（素材庫滿了，丟掉了「' + res.dropped.name + '」）' : '') };
  }

  // 古董商也收貨：旅行帶回來的素材特別值錢，極稀有素材更是天價（每天最多收兩件）
  function cardPrice(s, c) {
    const k = c.rarity === 'legend' ? 4 : c.origin && c.origin !== 'home' ? 1.5 : c.rarity === 'rare' ? 2 : 1;
    return Math.max(5, Math.round(c.value * k * Math.max(0.3, 1 - 0.12 * (c.wear || 0)) * (R.eventActive(s, 'crash') ? 0.6 : 1)));
  }
  function sellCards(s) {
    const left = 2 - (s.cardSales && s.cardSales.day === s.day ? s.cardSales.n : 0);
    return s.cards.filter((c) => !c.guilt && !c.legacy).map((c) => ({ uid: c.uid, name: c.name, tags: c.tags, value: c.value, origin: c.origin, rarity: c.rarity,
      wear: c.wear || 0, price: cardPrice(s, c), reason: s.trip ? '你不在浮城' : left <= 0 ? '古董商今天不再收貨' : s.cards.length <= 6 ? '素材庫最少留 6 張' : null }))
      .sort((a, b) => b.price - a.price);
  }
  function sellCard(s, uid) {
    const o = sellCards(s).find((x) => x.uid === uid);
    if (!o || o.reason) return { ok: false, msg: o ? o.reason : '沒有這張素材' };
    s.cards = s.cards.filter((c) => c.uid !== uid);
    s.cr += o.price; s.stats.crEarned += o.price;
    s.cardSales = { day: s.day, n: (s.cardSales && s.cardSales.day === s.day ? s.cardSales.n : 0) + 1 };
    return { ok: true, price: o.price, msg: '把「' + o.name + '」賣給古董商：+$' + o.price };
  }

  // ---------- 旅行 ----------
  const TRAVEL_EVENTS = { war: 1.5, pandemic: 1.4, crash: 0.8, netdown: 1.2, tourists: 1.2, famine: 1.2 };
  const tripCost = (s, d) => Math.round(d.cost * Object.keys(TRAVEL_EVENTS).reduce((a, id) => a * (R.eventActive(s, id) ? TRAVEL_EVENTS[id] : 1), 1));
  function flightRisk(s) {
    return D.FLIGHT.base + Object.keys(D.FLIGHT.events).reduce((a, id) => a + (R.eventActive(s, id) ? D.FLIGHT.events[id] : 0), 0);
  }
  // 探索點的致命機會：體能與冷靜可以降低
  const siteRisk = (s, st) => (st.risk ? st.risk.chance * Math.max(0.35, 1 - (stat(s, 'fit') + stat(s, 'calm')) / 300) : 0);
  function needReason(s, st) {
    if (!st.need) return null;
    for (const k of Object.keys(st.need)) if (stat(s, k) < st.need[k]) return '需要' + D.STATS[k].name + ' ' + st.need[k] + '（你只有 ' + Math.round(stat(s, k)) + '）';
    return null;
  }
  // 極稀有素材的線索：洞察 30 以上，或者在之前的局找到過，才看得懂
  function rareHint(s, st, meta) {
    const r = st.rare;
    if (!r) return null;
    const found = owned(s, r.id) || !!(s.rares && s.rares[r.id]);
    const known = found || stat(s, 'insight') >= 30 || !!(meta && meta.rares && meta.rares[r.id]);
    return { id: r.id, name: known ? D.CARDS[r.id].name : '？？？', text: known ? r.text : '這裡好像藏著甚麼。（洞察 30 以上才看得出端倪）',
      ready: !found && r.cond(s), found, chance: r.chance };
  }
  function destReason(s, d) {
    if (d.when && !d.when(s)) return d.lockText || '暫時去不了';
    if (s.trip) return '你正在旅行';
    if (s.ended) return '—';
    if (R.isNight(s)) return '晚上沒有航班';
    if (s.body <= 25) return '身體太差，坐不了長途機';
    if (s.cr < tripCost(s, d)) return '旅費不足（要 $' + tripCost(s, d).toLocaleString() + '）';
    return null;
  }
  function destInfo(s, id, meta) {
    const d = D.DEST[id];
    const risk = flightRisk(s);
    return { id: d.id, name: d.name, region: D.REGIONS[d.region], kind: D.KINDS[d.kind], desc: d.desc, cost: tripCost(s, d), stay: d.stay,
      flight: risk, locked: !!(d.when && !d.when(s)), lockText: d.lockText, visited: (s.visited && s.visited[id]) || 0, reason: destReason(s, d),
      sites: d.sites.map((st) => ({ id: st.id, name: st.name, desc: st.desc, body: st.body, spark: st.spark, gain: st.gain.map((g) => D.CARDS[g].name),
        risk: siteRisk(s, st), need: needReason(s, st), rare: rareHint(s, st, meta) })) };
  }
  function worldList(s, meta) { return D.DESTINATIONS.map((d) => destInfo(s, d.id, meta)); }

  function startTrip(s, id) {
    const d = D.DEST[id];
    const reason = d ? destReason(s, d) : '沒有這個地方';
    if (reason) return { ok: false, msg: reason };
    const cost = tripCost(s, d);
    const rep = R.report(s, '出發：' + d.name);
    s.cr -= cost;
    rep.line('機票與住宿', 'cost', -cost, 'cr');
    s.stats.flights = (s.stats.flights || 0) + 1;
    const risk = flightRisk(s);
    if (R.rand(s) < risk) {
      R.kill(s, 'plane');
      rep.line('你坐的航班沒有抵達' + d.name + '。', 'bad');
      return { ok: true, rep: rep.done() };
    }
    if (risk > 0.005) rep.line('航班平安降落（致命機會 ' + pctText(risk) + '）', '');
    s.trip = { dest: id, start: s.day, until: s.day + d.stay - 1, visits: {} };
    s.visited[id] = (s.visited[id] || 0) + 1;
    s.stats.trips = (s.stats.trips || 0) + 1;
    rep.line('你飛到了' + d.name + '。' + d.desc, 'good');
    R.hurt(s, 6, 'flight'); rep.delta('body', -6);
    rep.delta('spark', R.addSpark(s, s.visited[id] === 1 ? 0.4 : 0.15));
    R.train(s, { insight: 0.6, imag: 0.6 }, rep);
    // 第一次去的地方一定會學到新東西
    if (s.visited[id] === 1) R.teach(s, 'trip_' + d.kind, 1, rep);
    if (s.stats.trips === 1 && R.gainObject(s, 'passport', rep)) rep.line('海關在你的護照上蓋了第一個印章', 'good');
    rep.line('你會在這裡留到第 ' + s.trip.until + ' 天晚上，然後飛回浮城。房租照樣要交。', 'news');
    return { ok: true, rep: rep.done() };
  }
  // 白天的行動：探索點、在旅館休息、提早回程
  function tripActions(s) {
    const d = D.DEST[s.trip.dest];
    const list = d.sites.map((st) => {
      const n = s.trip.visits[st.id] || 0;
      const fx = [['body', '−' + st.body]];
      if (st.spark) fx.push(['spark', '+' + round1(st.spark * (n ? 0.5 : 1))]);
      fx.push(['card', n ? '再去一次：一張' : st.gain.map((g) => D.CARDS[g].name).join('、')]);
      if (st.atone) fx.push(['soul', '−' + st.atone + ' 克']);
      if (st.paranoia) fx.push(['note', '偏執 +' + st.paranoia]);
      if (st.cond) fx.push(['danger', '可能染上' + D.CONDS[st.cond.id].name]);
      const h = rareHint(s, st, IE.Game && IE.Game.meta);
      if (h && !h.found) fx.push(['rare', h.ready ? '極稀有素材：時機已到！' : '極稀有素材：時機未到']);
      const risk = siteRisk(s, st);
      if (risk > 0) fx.push(['danger', '致命 ' + pctText(risk)]);
      return { id: 'site:' + st.id, group: 'trip', name: st.name + (n ? '（第 ' + (n + 1) + ' 次）' : ''), sub: st.desc, fx,
        reason: needReason(s, st) || (s.body <= st.body ? '身體撐不住' : null) };
    });
    list.push({ id: 'rest', group: 'trip', name: '在旅館休息', sub: '睡到自然醒，窗外是' + d.name, fx: [['body', '+18'], ['spark', '+0.3']] });
    list.push({ id: 'tripback', group: 'trip', name: '提早回程', sub: '旅費不會退還', fx: [['note', '回到浮城']].concat(flightRisk(s) > 0.005 ? [['danger', '航班致命 ' + pctText(flightRisk(s))]] : []) });
    return list;
  }
  function applySite(s, siteId) {
    const d = D.DEST[s.trip.dest];
    const st = d.sites.find((x) => x.id === siteId);
    const rep = R.report(s, d.name + '・' + st.name);
    const n = s.trip.visits[st.id] = (s.trip.visits[st.id] || 0) + 1;
    s.stats.sites = (s.stats.sites || 0) + 1;
    s.stats.actions.site = (s.stats.actions.site || 0) + 1;
    rep.line(st.desc, '');
    R.hurt(s, st.body, 'site', { dest: d.id }); rep.delta('body', -st.body);
    if (st.spark) rep.delta('spark', R.addSpark(s, st.spark * (n > 1 ? 0.5 : 1)));
    // 致命危險
    const risk = siteRisk(s, st);
    if (risk > 0) {
      if (R.rand(s) < risk) { R.kill(s, st.risk.death); rep.line('……', 'bad'); return rep.done(); }
      rep.line('有驚無險（致命機會 ' + pctText(risk) + '）', '');
    }
    (n > 1 ? [R.pick(s, st.gain)] : st.gain).forEach((id) => rep.gain(id));
    // 極稀有素材：只在特定條件下出現
    const r = st.rare;
    if (r && !owned(s, r.id) && !s.rares[r.id]) {
      if (r.cond(s) && R.rand(s) < r.chance) {
        s.rares[r.id] = s.day;
        rep.line('極稀有素材！你找到了「' + D.CARDS[r.id].name + '」。' + r.text + '。', 'legend');
        rep.gain(r.id);
      } else if (r.cond(s)) rep.line('你覺得這裡有甚麼東西，差一點就找到了。', '');
      else if (stat(s, 'insight') >= 30) rep.line('你隱約覺得，這裡在某個特別的時刻會不一樣。', '');
    }
    if (st.atone) R.atone(s, st.atone, rep, '你在這裡放下了一些東西');
    if (st.paranoia) R.addParanoia(s, st.paranoia, rep);
    if (st.cond && R.rand(s) < st.cond.chance) R.addCond(s, st.cond.id, rep);
    const gains = { insight: 0.8, imag: 0.6 };
    if (st.need) Object.keys(st.need).forEach((k) => { gains[k] = (gains[k] || 0) + 0.8; });
    R.train(s, gains, rep);
    R.teach(s, 'trip_' + d.kind, 0.3, rep);
    if (R.rand(s) < 0.12) R.gainObject(s, 'postcards', rep);
    return rep.done();
  }
  function tripRest(s) {
    const d = D.DEST[s.trip.dest];
    const rep = R.report(s, '在旅館休息');
    R.heal(s, 18); rep.delta('body', 18);
    s.restedToday = true;
    const cured = R.cureConds(s, 'rest');
    if (cured.length) rep.line('休息過後，' + cured.join('、') + '好了', 'good');
    rep.delta('spark', R.addSpark(s, 0.3));
    s.stats.rests++;
    rep.line('你在' + d.name + '的旅館睡到中午。', '');
    return rep.done();
  }
  // 旅行的靈感：在外地的晚上創作 ×1.3；回來之後七晚仍有「旅行的餘韻」（第一次去的地方 ×1.6，外星基地與傳說之地 ×1.8，舊地重遊 ×1.3）
  function tripMult(s) {
    if (s.trip) return 1.3;
    return s.glow && s.day <= s.glow.until ? s.glow.x : 1;
  }
  // 回程：航班一樣有風險
  function flyHome(s, rep) {
    const d = D.DEST[s.trip.dest];
    const first = s.visited[d.id] === 1;
    s.glow = { until: s.day + 7, x: (first ? 1.6 : 1.3) + (first && (d.kind === 'alien' || d.kind === 'legend') ? 0.2 : 0), dest: d.id };
    s.stats.flights = (s.stats.flights || 0) + 1;
    const risk = flightRisk(s);
    if (R.rand(s) < risk) { R.kill(s, 'plane'); rep.line('回程的航班沒有抵達浮城。', 'bad'); return; }
    rep.line('你離開' + d.name + '，飛回浮城。' + (risk > 0.005 ? '（航班致命機會 ' + pctText(risk) + '）' : ''), 'news');
    rep.line('旅行的餘韻：之後七晚的作品 ×' + s.glow.x, 'good');
    s.trip = null;
  }
  function leaveTrip(s) {
    const rep = R.report(s, '提早回程');
    flyHome(s, rep);
    if (s.body > 0) s.trip = null;
    return rep.done();
  }
  // 旅途的晚上
  function tripNight(s, rep) {
    const pool = D.TRIP_EVENTS;
    let r = R.rand(s) * pool.reduce((a, e) => a + e.w, 0);
    let e = pool[0];
    for (const x of pool) { r -= x.w; if (r <= 0) { e = x; break; } }
    rep.event = e.text;
    rep.line(e.text, 'event');
    if (e.cr) { const v = Math.max(-s.cr, e.cr); s.cr += v; rep.delta('cr', v); }
    if (e.crPct) { const loss = Math.min(e.crMax, Math.round(s.cr * e.crPct)); s.cr -= loss; rep.delta('cr', -loss); }
    if (e.body) { if (e.body > 0) R.heal(s, e.body); else R.hurt(s, -e.body, 'trip:' + e.id); rep.delta('body', e.body); }
    if (e.spark) rep.delta('spark', R.addSpark(s, e.spark, true));
    if (e.paranoia) R.addParanoia(s, e.paranoia, rep);
    if (e.cond && R.rand(s) < e.cond.chance) R.addCond(s, e.cond.id, rep);
    if (e.card) rep.gain(e.card);
    if (e.gainOrigin) rep.gain(R.pick(s, D.DEST[s.trip.dest].sites.flatMap((st) => st.gain)));
  }

  // ---------- 圖鑑 ----------
  function rareList(meta, s) {
    return D.DESTINATIONS.flatMap((d) => d.sites.filter((st) => st.rare).map((st) => ({ id: st.rare.id, name: D.CARDS[st.rare.id].name, dest: d.name, site: st.name,
      text: st.rare.text, found: !!((meta && meta.rares && meta.rares[st.rare.id]) || (s && s.rares && s.rares[st.rare.id])) })));
  }

  IE.World = {
    decorOn, decorList, buyDecor, decorDaily,
    workPrice, galleryOffers, sellWork, galleryMult, commissions, settleCommissions,
    antiqueOffers, buyAntique, cardPrice, sellCards, sellCard,
    tripCost, flightRisk, tripMult, siteRisk, destInfo, worldList, startTrip, tripActions, applySite, tripRest, flyHome, leaveTrip, tripNight, rareHint, rareList,
  };
});
