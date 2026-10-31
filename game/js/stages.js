// 《靈感撤離 2080》第六期：關卡與工具卡。
// 每季 20 天有三個關卡之夜：第 7 天「社區小展」、第 14 天「畫廊聯展」、第 20 天「外星評審」（Boss，與篩選日同一晚）。
// 關卡之夜要在一晚之內，用創作達到目標分數（不是累積訊號）。外星評審每次都帶著一條改寫規則的條件。
// 工具卡（相當於塔羅牌）是在創作桌上使用的消耗品，可以改造素材庫。純邏輯，瀏覽器與 Node 共用。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA, R = IE.Rules;
  const has = (c, t) => c.tags.includes(t);
  const med = (c) => D.mediumOf(c);

  // ---------- 外星評審的規則（Boss） ----------
  const BOSSES = [
    { id: 'noneon', name: '評審討厭霓虹', desc: '「霓虹」素材不計分', block: (c) => has(c, 'neon') },
    { id: 'waterhall', name: '水浸畫廊', desc: '只有「水」素材計分', block: (c) => !has(c, 'water') },
    { id: 'nomemory', name: '不准懷舊', desc: '「記憶」素材不計分', block: (c) => has(c, 'memory') },
    { id: 'oneshot', name: '只看一筆', desc: '只准下筆一次，但手牌 +2', start: (ses) => { ses.plays = 1; ses.handSize += 2; } },
    { id: 'censor', name: '審查', desc: '「反叛」素材不能用', forbid: (c) => has(c, 'rebel') },
    { id: 'copied', name: 'AI 已經學會你', desc: '你最常用的作品形式 ×0.5', formMult: (s, form) => (topForm(s) === form ? 0.5 : 1) },
    { id: 'sponsor', name: '天空區贊助', desc: '分數 ×2，但每次下筆靈魂 +1 克', mult: 2, sinPerPlay: 1 },
    { id: 'blackout', name: '停電', desc: '手牌的標籤看不見（計分照常）', ui: 'blackout' },
    { id: 'kpionly', name: 'KPI 大師', desc: '不符合本季 KPI 的下筆不計分', kpiOnly: true },
    { id: 'nodiscard', name: '一稿過', desc: '不准改稿', start: (ses) => { ses.discards = 0; } },
    { id: 'small', name: '小品展', desc: '每次最多下筆三張', maxCards: 3 },
    { id: 'numb', name: '麻木的評審', desc: '火花只計一半', sparkMult: 0.5 },
    { id: 'tired', name: '陳腔濫調', desc: '所有素材當作已經用過兩次', extraWear: 2 },
    { id: 'noobj', name: '純粹主義', desc: '靈感物件全部失效', noObjects: true },
    { id: 'finale', name: '壓軸', desc: '只計最後一筆，但 ×2', lastOnly: true },
    { id: 'thinhand', name: '預算削減', desc: '手牌 −2', start: (ses) => { ses.handSize = Math.max(3, ses.handSize - 2); } },
    // 第七期：媒材的規則
    { id: 'silent', name: '默片展', desc: '「聲」媒材的素材不計分', block: (c) => med(c) === 'sound' },
    { id: 'analog', name: '拒收數據', desc: '「數」媒材的素材不計分', block: (c) => med(c) === 'data' },
    { id: 'monomedia', name: '單一媒材展', desc: '素材不是同一種媒材的下筆 ×0.4', playMult: (sel) => (new Set(sel.map(med)).size === 1 ? 1 : 0.4) },
  ];
  const BOSS = {};
  BOSSES.forEach((b) => { BOSS[b.id] = b; });
  function topForm(s) {
    const st = s.style || {};
    return Object.keys(st).sort((a, b) => st[b] - st[a])[0] || null;
  }

  // ---------- 關卡 ----------
  const KINDS = {
    small: { name: '社區小展', short: '小展', mult: 0.8, color: '#37c3d6', reward: { cr: 60, tools: 1 }, fail: { rating: -0.2, spark: -0.2 } },
    big: { name: '畫廊聯展', short: '聯展', mult: 1.1, color: '#c38bff', reward: { cr: 120, tools: 1, tickets: 1 }, fail: { rating: -0.3, spark: -0.3 } },
    boss: { name: '外星評審', short: '評審', mult: 1.45, color: '#ff4d5e', reward: { cr: 200, tools: 2, tickets: 2, obj: 0.5 }, fail: { signalPct: -0.08, spark: -0.4 } },
  };
  const STAGE_K = Number((typeof process !== 'undefined' && process.env && process.env.STAGE_K) || 17000);
  // 一晚的目標分數：隨日子以每天約 4% 增長（與創作分數的增長曲線相若）
  const STAGE_G = Number((typeof process !== 'undefined' && process.env && process.env.STAGE_G) || 1.032);
  // 用「進度日」計算：60 天的一局，目標也會走完整條增長曲線
  const baseTarget = (s, day) => STAGE_K * Math.pow(STAGE_G, R.age(s, day) - 1);
  const stakeMod = (s, key) => (IE.Meta ? IE.Meta.stakeMod(s, key) : 1);
  // 每季開始時選好這一季的評審規則（外星評級 4 以上有兩條）
  function bossesFor(s, q) {
    s.bosses = s.bosses || {};
    if (!s.bosses[q]) {
      const pool = BOSSES.map((b) => b.id);
      const n = stakeMod(s, 'doubleBoss') > 1 ? 2 : 1;
      const out = [];
      while (out.length < n) { const id = R.pick(s, pool); if (!out.includes(id) && !(out.length && (id === 'oneshot' || BOSS[out[0]].start && BOSS[id].start))) out.push(id); }
      s.bosses[q] = out;
    }
    return s.bosses[q].map((id) => BOSS[id]);
  }
  function stageOn(s, day) {
    const M = R.modeOf(s), q = Math.floor((day - 1) / M.period), d = (day - 1) % M.period + 1;
    const kind = d === M.stageDays[0] ? 'small' : d === M.stageDays[1] ? 'big' : d === M.stageDays[2] ? 'boss' : null;
    if (!kind) return null;
    const K = KINDS[kind];
    // 第一局的頭兩關目標較低（第十二期），讓新玩家先嘗到過關的滋味
    const easy = s.firstRun && q === 0 && kind !== 'boss' ? 0.6 : 1;
    const target = Math.round(baseTarget(s, day) * K.mult * stakeMod(s, 'stageTarget') * easy / 1000) * 1000;
    return { day, quarter: q, kind, name: K.name, short: K.short, color: K.color, target, rules: kind === 'boss' || (s.weekly && s.weekly.mod === 'judges') ? bossesFor(s, q) : [], index: q * 3 + ['small', 'big', 'boss'].indexOf(kind) + 1 };
  }
  const today = (s) => stageOn(s, s.day);
  function nextStage(s) { for (let d = s.day; d <= R.days(s); d++) { const st = stageOn(s, d); if (st && !(s.stageDone && s.stageDone[d])) return st; } return null; }
  // 合併所有生效的規則
  function rulesNow(s) {
    const ses = s.session;
    return ses && ses.stage ? ses.stage.rules : [];
  }
  function onStart(s, ses) {
    const st = today(s);
    if (!st || (s.stageDone && s.stageDone[s.day])) return;
    ses.stage = { kind: st.kind, name: st.name, target: st.target, color: st.color, rules: st.rules.map((b) => b.id), index: st.index };
    st.rules.forEach((b) => { if (b.start) b.start(ses); });
  }
  // 計分時用到的修正（create.js 呼叫）
  function scoring(s) {
    const ids = rulesNow(s);
    if (!ids.length) return null;
    const rules = ids.map((id) => BOSS[id]);
    // 反叛流（三件）或斷線鉗：「反叛」素材無視規則
    const free = (c) => IE.Create.freeOfRules(s, c);
    return {
      blocked: (c) => !free(c) && rules.some((b) => (b.block && b.block(c)) || (b.forbid && b.forbid(c))),
      forbidden: (c) => !free(c) && rules.some((b) => b.forbid && b.forbid(c)),
      maxCards: Math.min(...rules.map((b) => b.maxCards || 5)),
      noObjects: rules.some((b) => b.noObjects),
      extraWear: rules.reduce((a, b) => a + (b.extraWear || 0), 0),
      sparkMult: rules.reduce((a, b) => a * (b.sparkMult || 1), 1),
      mult: (form, kpiMod, sel) => rules.reduce((a, b) => a * (b.mult || 1) * (b.formMult ? b.formMult(s, form) : 1) * (b.kpiOnly && kpiMod <= 1 ? 0 : 1) * (b.playMult && sel ? b.playMult(sel) : 1), 1),
      sinPerPlay: rules.reduce((a, b) => a + (b.sinPerPlay || 0), 0),
      names: rules.map((b) => b.name),
    };
  }
  // 這一晚的關卡分數
  function stageScore(ses) {
    if (!ses.stage) return 0;
    if (ses.stage.rules.some((id) => BOSS[id].lastOnly)) return ses.log.length ? ses.log[ses.log.length - 1].total * 2 : 0;
    return ses.total;
  }
  // 創作完成時結算關卡
  function settle(s, ses) {
    if (!ses || !ses.stage || (s.stageDone && s.stageDone[s.day])) return null;
    const score = stageScore(ses);
    return resolve(s, ses.stage, score);
  }
  function resolve(s, stage, score) {
    s.stageDone = s.stageDone || {};
    const pass = score >= stage.target;
    const K = KINDS[stage.kind];
    const out = { kind: stage.kind, name: stage.name, target: stage.target, score, pass, index: stage.index, lines: [], tools: [], objs: [], tickets: 0 };
    s.stageDone[s.day] = pass ? 'pass' : 'fail';
    s.stats.stages = s.stats.stages || { pass: 0, fail: 0 };
    if (pass) {
      s.stats.stages.pass++;
      // 以三件同流派的物件通過關卡：跨局解鎖該流派的傳說物件
      const sc = IE.Create.schoolCounts(s);
      Object.keys(sc).forEach((k) => { if (sc[k] >= 3) { s.stats.schoolPass = s.stats.schoolPass || {}; s.stats.schoolPass[k] = true; } });
      const W = K.reward;
      const cr = Math.round(W.cr * (1 + 0.15 * stage.index / 3));
      s.cr += cr; s.stats.crEarned += cr; out.cr = cr;
      out.lines.push('獎金 $' + cr);
      for (let i = 0; i < (W.tools || 0); i++) { const t = randomTool(s); if (t && giveTool(s, t)) out.tools.push(t); }
      if (W.tickets) { R.gainTicket(s, 'silver', W.tickets, stage.name + '入選'); out.tickets = W.tickets; out.lines.push('扭蛋券 +' + W.tickets); }
      if (W.obj && R.rand(s) < W.obj) {
        const pool = D.OBJECTS.filter((o) => !o.npc && !o.start && !o.unlock && !o.souvenir && !s.objects.includes(o.id) && !s.objStash.includes(o.id)).map((o) => o.id);
        if (pool.length) { const id = R.pick(s, pool); if (R.gainObject(s, id, null)) out.objs.push(id); }
      }
      if (score >= stage.target * 2) {
        s.stats.stages.double = (s.stats.stages.double || 0) + 1; out.lines.push('分數達到目標的兩倍：評語「驚為天人」'); R.addSpark(s, 0.2, true);
        if (stage.kind !== 'small') { R.gainTicket(s, 'gold', 1, '驚為天人'); out.lines.push('金色扭蛋券 +1'); }
      }
      // 外星評審圖鑑：記下打敗過的評審規則
      if (stage.rules && stage.rules.length) { s.stats.judges = s.stats.judges || {}; stage.rules.forEach((id) => { s.stats.judges[id] = true; }); }
    } else {
      s.stats.stages.fail++;
      const F = K.fail;
      if (F.rating) { s.rating = Math.max(1, s.rating + F.rating); out.lines.push('平台評分 ' + F.rating); }
      if (F.spark) { R.addSpark(s, F.spark, true); out.lines.push('火花 ' + F.spark); }
      if (F.signalPct) { const v = Math.round(R.threshold(s) * F.signalPct); s.bonusSignal += v; out.lines.push('外星訊號 ' + Math.round(v).toLocaleString()); }
    }
    s.stageLog = (s.stageLog || []).concat({ day: s.day, kind: stage.kind, pass, score, target: stage.target });
    return out;
  }
  // 關卡之夜沒有創作：當作棄權
  function endOfDay(s, rep) {
    const st = today(s);
    if (!st || (s.stageDone && s.stageDone[s.day]) || s.body <= 0) return;
    const r = resolve(s, st, 0);
    rep.line('你沒有參加今晚的' + st.name + '：當作棄權。' + r.lines.join('，'), 'bad');
  }

  // ---------- 工具卡 ----------
  const TOOLS = [
    { id: 'rewrite', name: '改寫', icon: 'pen', price: 45, need: 1, desc: '把選中的一張素材的兩個標籤，都改成手牌裡最常見的標籤' },
    { id: 'shred', name: '碎紙', icon: 'shredder', price: 35, need: [1, 2], desc: '把選中的一至兩張素材永久刪除（令素材庫更精簡）' },
    { id: 'copy', name: '複印', icon: 'paper', price: 50, need: 1, desc: '複製選中的一張素材，副本加入素材庫和手牌' },
    { id: 'renew', name: '翻新', icon: 'brush', price: 35, need: [1, 3], desc: '選中的素材磨損歸零' },
    { id: 'frame', name: '裝裱', icon: 'frame', price: 60, need: 1, desc: '選中的一張素材得到隨機的永久變化（閃亮、燃燒、淚痕或回音）' },
    { id: 'collage', name: '拼貼', icon: 'card', price: 55, need: 2, desc: '把選中的兩張合成一張：保留最多的兩個標籤，籌碼相加 ×0.8' },
    { id: 'coffee', name: '濃縮咖啡', icon: 'cup', price: 30, need: 0, desc: '今晚改稿 +2' },
    { id: 'lamp', name: '加班燈', icon: 'lamp', price: 50, need: 0, desc: '今晚下筆 +1' },
    { id: 'portfolio', name: '作品集', icon: 'book', price: 55, need: [1, 5], desc: '選中素材組成的作品形式升一級（永久）' },
    { id: 'dream', name: '夢境', icon: 'mirror', price: 70, need: 1, desc: '選中的一張素材變成一件隨機的古董或旅行素材' },
    { id: 'convert', name: '轉檔', icon: 'monitor', price: 40, need: [1, 3], desc: '選中的一至三張素材，變成手牌裡最常見的媒材' },
  ];
  const TOOL = {};
  TOOLS.forEach((t) => { TOOL[t.id] = t; });
  const toolSlots = (s) => 2 + (IE.Meta ? IE.Meta.bonus(s, 'toolSlots') : 0);
  const toolPool = (s) => TOOLS.filter((t) => !IE.Meta || IE.Meta.toolOpen(s, t.id)).map((t) => t.id);
  const randomTool = (s) => { const p = toolPool(s); return p.length ? R.pick(s, p) : null; };
  function giveTool(s, id) {
    s.tools = s.tools || [];
    if (s.tools.length >= toolSlots(s)) return false;
    s.tools.push(id);
    return true;
  }
  const cardOf = (s, uid) => s.cards.find((c) => c.uid === uid);
  function useTool(s, idx, uids) {
    const ses = s.session;
    const id = (s.tools || [])[idx];
    const t = TOOL[id];
    if (!t || !ses) return { ok: false, msg: '只可以在創作桌上使用' };
    const need = Array.isArray(t.need) ? t.need : [t.need, t.need];
    if (uids.length < need[0] || uids.length > need[1]) return { ok: false, msg: t.name + '：' + (need[0] === need[1] ? '要選 ' + need[0] + ' 張素材' : '要選 ' + need[0] + ' 至 ' + need[1] + ' 張素材') };
    const cards = uids.map((u) => cardOf(s, u)).filter(Boolean);
    let msg = '';
    switch (id) {
      case 'rewrite': {
        const counts = {};
        ses.hand.map((u) => cardOf(s, u)).filter(Boolean).forEach((c) => c.tags.forEach((g) => { counts[g] = (counts[g] || 0) + 1; }));
        const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).filter((g) => g !== 'guilt');
        cards[0].tags = top.slice(0, Math.min(2, top.length));
        if (cards[0].tags.length === 1) cards[0].tags.push(top[0]);
        cards[0].tags = [...new Set(cards[0].tags)];
        msg = '「' + cards[0].name + '」現在是' + cards[0].tags.map((g) => '「' + D.TAGS[g].name + '」').join('');
        break;
      }
      case 'shred':
        s.cards = s.cards.filter((c) => !uids.includes(c.uid));
        ses.hand = ses.hand.filter((u) => !uids.includes(u));
        IE.Create.draw(s);
        msg = '刪除了 ' + cards.map((c) => '「' + c.name + '」').join('');
        break;
      case 'copy': {
        const c = cards[0];
        const copy = Object.assign({}, c, { wear: 0, name: c.name + '（副本）', medium: med(c) });
        delete copy.uid;
        const res = R.addCard(s, copy);
        ses.hand.push(res.card.uid);
        msg = '複製了「' + c.name + '」';
        break;
      }
      case 'renew': cards.forEach((c) => { c.wear = 0; }); msg = '翻新了 ' + cards.length + ' 張素材'; break;
      case 'frame': {
        const r = R.rand(s);
        cards[0].mod = r < 0.4 ? 'shine' : r < 0.7 ? 'burn' : r < 0.9 ? 'tear' : 'echo';
        msg = '「' + cards[0].name + '」：' + D.CARD_MODS[cards[0].mod].name;
        break;
      }
      case 'collage': {
        const [a, b] = cards;
        const counts = {};
        a.tags.concat(b.tags).forEach((g) => { counts[g] = (counts[g] || 0) + 1; });
        const tags = Object.keys(counts).sort((x, y) => counts[y] - counts[x]).slice(0, 2);
        const merged = { id: 'collage', name: a.name.slice(0, 6) + '＋' + b.name.slice(0, 6), tags, value: Math.round((a.value + b.value) * 0.8), wear: 0, medium: med(a) };
        s.cards = s.cards.filter((c) => c.uid !== a.uid && c.uid !== b.uid);
        ses.hand = ses.hand.filter((u) => u !== a.uid && u !== b.uid);
        const res = R.addCard(s, merged);
        ses.hand.push(res.card.uid);
        msg = '拼貼成「' + merged.name + '」（' + merged.value + ' 籌碼）';
        break;
      }
      case 'coffee': ses.discards += 2; msg = '今晚改稿 +2'; break;
      case 'lamp': ses.plays += 1; msg = '今晚下筆 +1'; break;
      case 'portfolio': {
        const F = IE.Create.detectForm(cards);
        s.forms[F.id] = (s.forms[F.id] || 1) + 1;
        msg = '「' + IE.Create.FORM[F.id].name + '」升到 Lv.' + s.forms[F.id];
        break;
      }
      case 'dream': {
        const pool = D.ANTIQUES.concat(Object.keys(D.CARDS).filter((k) => k.startsWith('t_')));
        const nid = R.pick(s, pool), def = D.CARDS[nid];
        Object.assign(cards[0], { id: nid, name: def.name, tags: def.tags.slice(), value: def.value, origin: def.origin, rarity: def.rarity, wear: 0, medium: def.medium });
        msg = '「' + def.name + '」從夢裡出現了';
        break;
      }
      case 'convert': {
        const counts = {};
        ses.hand.map((u) => cardOf(s, u)).filter(Boolean).forEach((c) => { const m = med(c); counts[m] = (counts[m] || 0) + 1; });
        const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
        cards.forEach((c) => { c.medium = top; });
        msg = cards.length + ' 張素材變成了「' + D.MEDIA[top].full + '」';
        break;
      }
    }
    s.tools.splice(idx, 1);
    s.stats.toolsUsed = (s.stats.toolsUsed || 0) + 1;
    return { ok: true, msg: t.name + '：' + msg };
  }
  // 浮城百貨的工具卡貨架：每三天換兩張
  function toolShop(s) {
    const period = Math.floor((s.day - 1) / R.modeOf(s).shopEvery);
    if (!s.toolShop || s.toolShop.period !== period) {
      const pool = toolPool(s);
      const items = [];
      while (items.length < 2 && pool.length) items.push(pool.splice(Math.floor(R.rand(s) * pool.length), 1)[0]);
      s.toolShop = { period, items };
    }
    return s.toolShop.items;
  }
  const toolPrice = (s, id) => Math.round(TOOL[id].price * stakeMod(s, 'prices'));

  IE.Stages = { BOSSES, BOSS, KINDS, TOOLS, TOOL, stageOn, today, nextStage, onStart, scoring, stageScore, settle, endOfDay, bossesFor,
    toolSlots, giveTool, randomTool, useTool, toolShop, toolPrice, topForm };
});
