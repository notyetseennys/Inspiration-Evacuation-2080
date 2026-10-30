// 《靈感撤離 2080》第五期：三份新工作（天台菜園、拆樓打撈、夜市擺地攤），以及所有小遊戲共用的「分級獎勵」：
// 每局小遊戲按表現評為 SS、S、A、B、C、D 六級，再加上每個小遊戲各自的特別成就，得到很多種不同的獎勵。純邏輯，瀏覽器與 Node 共用。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA, R = IE.Rules;
  const clamp01 = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
  const n = (v) => (Number.isFinite(v) ? v : 0);

  // ---------- 獎勵素材 ----------
  const C = (name, tags, value) => ({ name, tags, value });
  Object.assign(D.CARDS, {
    // 天台菜園
    g_sprout: C('第一棵芽', ['hope', 'water'], 20), g_tomato: C('天台番茄', ['hunger', 'warmth'], 22), g_golden: C('金色的南瓜', ['hope', 'neon'], 34),
    g_mutant: C('酸雨裡長出的怪菜', ['anger', 'water'], 26), g_pigeon: C('偷菜的白鴿', ['rebel', 'warmth'], 24), g_feast: C('整棟大廈的晚飯', ['warmth', 'hunger'], 32),
    // 拆樓打撈
    v_brick: C('舊城的紅磚', ['memory', 'anger'], 20), v_safe: C('打不開的夾萬', ['machine', 'hunger'], 28), v_photo: C('牆縫裡的全家福', ['memory', 'warmth'], 30),
    v_neon: C('拆下來的霓虹招牌', ['neon', 'memory'], 30), v_perfect: C('一錘定音', ['anger', 'hope'], 34), v_dust: C('一口灰塵', ['hunger', 'anger'], 14),
    // 夜市擺地攤
    h_coin: C('皺巴巴的鈔票', ['hunger', 'neon'], 18), h_regular: C('熟客', ['warmth', 'memory'], 26), h_lie: C('說得像真的一樣', ['neon', 'guilt'], 24),
    h_walkaway: C('掉頭就走的背影', ['anger', 'memory'], 20), h_master: C('砍價大師', ['rebel', 'hunger'], 32),
    // 舊小遊戲的分級獎勵
    q_label: C('零錯誤的標註紀錄', ['machine', 'rebel'], 30), q_label2: C('被 AI 誇獎', ['machine', 'neon'], 26),
    q_smile: C('客人的五星評語', ['neon', 'warmth'], 28), q_smile2: C('一滴真心的眼淚', ['warmth', 'guilt'], 30),
    q_dive: C('無傷打撈', ['water', 'hope'], 30), q_dive2: C('舊城的寶藏地圖', ['water', 'memory'], 32),
    q_delivery: C('全部準時', ['hunger', 'hope'], 28), q_delivery2: C('客人的道謝', ['warmth', 'water'], 26),
    q_farm: C('全城都在轉發', ['neon', 'anger'], 30), q_farm2: C('你自己也信了', ['anger', 'guilt'], 24),
    q_busk: C('全場大合唱', ['hope', 'warmth'], 32), q_busk2: C('有人為你哭了', ['warmth', 'memory'], 30),
    q_clinic: C('完美的接駁', ['machine', 'hope'], 30), q_clinic2: C('病人的新手', ['machine', 'warmth'], 28),
    q_fail: C('今天搞砸了', ['anger', 'memory'], 16),
  });
  Object.assign(D.TEACH, { garden: 'series', salvage: 'mural', haggle: 'crossover' });
  // 浮城地圖上的新地點
  if (D.PLACES) D.PLACES.push({ id: 'rooftop', name: '天台菜園', x: 128, y: 80, act: 'garden', icon: 'garden' },
    { id: 'demolition', name: '拆樓工地', x: 30, y: 110, act: 'salvage', icon: 'crane' },
    { id: 'nightmarket', name: '夜市', x: 170, y: 118, act: 'haggle', icon: 'stall' });

  // ---------- 評級 ----------
  const RANKS = [
    { id: 'SS', min: 0.95, name: '神乎其技', color: '#ffd36b' }, { id: 'S', min: 0.85, name: '出色', color: '#ff8fd1' },
    { id: 'A', min: 0.7, name: '很好', color: '#9be36b' }, { id: 'B', min: 0.5, name: '合格', color: '#37c3d6' },
    { id: 'C', min: 0.3, name: '勉強', color: '#8d99b4' }, { id: 'D', min: -1, name: '搞砸了', color: '#ff4d5e' },
  ];
  const rankOf = (p) => RANKS.find((r) => p >= r.min);
  const LIFE = ['dive', 'busk', 'garden'];
  // 每個小遊戲的表現（0 至 1）與特別成就
  const PERF = {
    label: (r) => clamp01(n(r.correct) / Math.max(1, n(r.correct) + n(r.wrong)) * 0.7 + Math.min(1, n(r.maxCombo) / 25) * 0.3 - n(r.caught) * 0.1),
    ot: (r) => PERF.label(r),
    smile: (r) => clamp01(n(r.satisfaction) - n(r.trapHits) * 0.03),
    dive: (r) => clamp01((r.relics ? r.relics.length : 0) * 0.22 + Object.values(r.fish || {}).reduce((a, b) => a + b, 0) * 0.07 - n(r.hits) * 0.12 - (r.drowned ? 0.4 : 0)),
    delivery: (r) => clamp01(n(r.deliveries) / 8 - n(r.late) * 0.06 - n(r.hits) * 0.1),
    farm: (r) => clamp01(n(r.shares) / 45000 + n(r.headlines) * 0.02),
    busk: (r) => clamp01(n(r.rounds) / 7 * 0.5 + n(r.soloNotes) / 26 * 0.3 + n(r.crowdMax) / 12 * 0.2),
    clinic: (r) => clamp01(n(r.patients) / 6 - n(r.mistakes) * 0.08),
    garden: (r) => clamp01(n(r.harvest) / 14 - n(r.stolen) * 0.03 - n(r.wilted) * 0.03 + n(r.golden) * 0.1),
    salvage: (r) => clamp01(n(r.floors) / 10 + n(r.perfect) * 0.02 - n(r.misses) * 0.04),
    haggle: (r) => clamp01(n(r.total) / 160 + n(r.deals) * 0.02 - n(r.walkaways) * 0.03),
  };
  // 特別成就：條件 → 獎勵（每個小遊戲兩至三個）
  const SPECIAL = {
    label: [{ test: (r) => n(r.wrong) === 0 && n(r.correct) >= 20, text: '零錯誤', card: 'q_label', stats: { obey: 1 } },
      { test: (r) => n(r.maxCombo) >= 30, text: '連擊 30 以上，AI 誇獎了你', card: 'q_label2' }],
    smile: [{ test: (r) => n(r.endorsed) === 0 && n(r.satisfaction) >= 0.8, text: '一句偏見都沒有附和，客人仍然很滿意', card: 'q_smile2', atone: 1 },
      { test: (r) => n(r.perfect) >= 18, text: '十八個完美表情', card: 'q_smile' }],
    dive: [{ test: (r) => n(r.hits) === 0 && (r.relics || []).length >= 2, text: '無傷打撈', card: 'q_dive' },
      { test: (r) => (r.relics || []).length >= 4, text: '一次撈到四件遺物', card: 'q_dive2', obj: ['oldmap', 'collectorbox'] }],
    delivery: [{ test: (r) => n(r.late) === 0 && n(r.deliveries) >= 6, text: '全部準時送達', card: 'q_delivery', rating: 0.2 },
      { test: (r) => n(r.hits) === 0 && n(r.deliveries) >= 4, text: '沒有被快艇撞到', card: 'q_delivery2' }],
    farm: [{ test: (r) => n(r.shares) >= 60000, text: '全城都在轉發你的標題', card: 'q_farm', paranoia: 4 },
      { test: (r) => n(r.truth) >= 3, text: '你偷偷寫了三個真標題', card: 'q_farm2', atone: 0.5 }],
    busk: [{ test: (r) => n(r.crowdMax) >= 10, text: '全場大合唱', card: 'q_busk' },
      { test: (r) => n(r.rounds) >= 7, text: '連續七段點唱', card: 'q_busk2', spark: 0.2 }],
    clinic: [{ test: (r) => n(r.mistakes) === 0 && n(r.patients) >= 4, text: '沒有接錯一條線', card: 'q_clinic' },
      { test: (r) => n(r.patients) >= 6 && !n(r.illegal), text: '全部是合法手術', card: 'q_clinic2', atone: 0.5 }],
    garden: [{ test: (r) => n(r.golden) > 0, text: '收成了金色的南瓜', card: 'g_golden' },
      { test: (r) => n(r.stolen) === 0 && n(r.harvest) >= 8, text: '一棵菜都沒有被白鴿偷走', card: 'g_pigeon' },
      { test: (r) => n(r.harvest) >= 16, text: '菜多得可以請整棟大廈吃飯', card: 'g_feast', atone: 1 }],
    salvage: [{ test: (r) => n(r.perfect) >= 5, text: '五次一錘定音', card: 'v_perfect' },
      { test: (r) => n(r.misses) === 0 && n(r.floors) >= 6, text: '沒有一錘落空', card: 'v_neon' }],
    haggle: [{ test: (r) => n(r.lies) === 0 && n(r.deals) >= 5, text: '老老實實地賣出五件貨', card: 'h_regular', atone: 0.5 },
      { test: (r) => n(r.best) >= 60, text: '一件貨賣出 $60 以上', card: 'h_master' }],
  };
  SPECIAL.ot = SPECIAL.label;
  // 每一級的獎勵：越高越多，D 級有懲罰
  const TIER = {
    SS: { spark: 0.3, crPct: 0.25, cards: 2, objChance: 0.25 }, S: { spark: 0.2, crPct: 0.15, cards: 1, objChance: 0.08 },
    A: { spark: 0.1, crPct: 0.08, cards: 1 }, B: { crPct: 0.03 }, C: {}, D: { spark: -0.1, rating: -0.1, card: 'q_fail' },
  };
  const POOL = {
    label: ['q_label2', 'l_cat', 'l_screen'], ot: ['q_label2', 'l_cat'], smile: ['q_smile', 's_truth', 's_wine'], dive: ['q_dive2', 'd_vinyl', 'd_crayon'],
    delivery: ['q_delivery2', 'k_ticket', 'k_bag'], farm: ['q_farm', 'f_viral', 'f_truth'], busk: ['q_busk2', 'p_clap', 'p_chorus'],
    clinic: ['q_clinic2', 'k_pulse'], garden: ['g_tomato', 'g_sprout', 'g_feast'], salvage: ['v_photo', 'v_safe', 'v_neon'], haggle: ['h_regular', 'h_coin', 'h_master'],
  };
  // 把評級與特別成就加到一份已完成的報告上
  function grade(s, kind, res, r) {
    if (!PERF[kind] || !r || s.body <= 0) return r;
    const perf = PERF[kind](res || {});
    const rk = rankOf(perf);
    const T = TIER[rk.id];
    r.rank = { id: rk.id, name: rk.name, color: rk.color, perf: Math.round(perf * 100) };
    s.stats.ranks = s.stats.ranks || {};
    s.stats.ranks[rk.id] = (s.stats.ranks[rk.id] || 0) + 1;
    const line = (text, kind2, v, stat) => { r.lines.push({ text, kind: kind2 || '', v, stat }); if (stat && r.deltas[stat] != null) r.deltas[stat] += v; };
    const gain = (id) => { if (!D.CARDS[id]) return; const x = R.addCard(s, id); r.cards.push(x.card); if (x.dropped) r.dropped.push(x.dropped); };
    line('評級 ' + rk.id + '：' + rk.name + '（表現 ' + r.rank.perf + '%）', rk.id === 'D' ? 'bad' : rk.id === 'SS' || rk.id === 'S' ? 'legend' : 'good');
    if (T.crPct && r.deltas.cr > 0) { const b = Math.round(r.deltas.cr * T.crPct); s.cr += b; line('評級獎金', 'good', b, 'cr'); }
    // 工作做得好不會令火花變旺（那是工作）；只有生活類的小遊戲會
    if (T.spark && (T.spark < 0 || LIFE.includes(kind))) { const v = R.addSpark(s, T.spark, true); if (v) line(T.spark > 0 ? '你對自己很滿意' : '你對自己很失望', T.spark > 0 ? 'good' : 'bad', v, 'spark'); }
    if (T.rating) s.rating = Math.max(1, Math.min(5, s.rating + T.rating));
    if (T.card) gain(T.card);
    for (let i = 0; i < (T.cards || 0); i++) gain(R.pick(s, POOL[kind]));
    if (T.objChance && R.rand(s) < T.objChance) {
      const pool = D.OBJECTS.filter((o) => !o.npc && !o.start && !o.unlock && !o.souvenir && !s.objects.includes(o.id) && !s.objStash.includes(o.id)).map((o) => o.id);
      if (pool.length) { const id = R.pick(s, pool); R.gainObject(s, id, null); r.objs.push(id); line('表現太出色，有人送了你一件靈感物件', 'legend'); }
    }
    (SPECIAL[kind] || []).forEach((sp) => {
      if (!sp.test(res || {})) return;
      line('特別成就：' + sp.text, 'legend');
      if (sp.card) gain(sp.card);
      if (sp.atone) { const g = R.atone(s, sp.atone, null); if (g) line('靈魂輕了一點', 'good', -g, 'soul'); }
      if (sp.spark) line('火花', 'good', R.addSpark(s, sp.spark, true), 'spark');
      if (sp.stats) R.train(s, sp.stats, null);
      if (sp.paranoia) R.addParanoia(s, sp.paranoia, null);
      if (sp.rating) s.rating = Math.min(5, s.rating + sp.rating);
      if (sp.obj && R.rand(s) < 0.35) { const id = R.pick(s, sp.obj); if (R.gainObject(s, id, null)) r.objs.push(id); }
    });
    r.deltas.spark = Math.round(r.deltas.spark * 10) / 10; r.deltas.soul = Math.round(r.deltas.soul * 10) / 10;
    return r;
  }

  // ---------- 三份新工作 ----------
  const rooftop = (s) => s.floor > 0 && !s.trip;
  function actions(s) {
    if (s.trip || R.isNight(s)) return [];
    const tired = s.body > 10 ? null : '身體太差，撐不住了';
    const closed = (j) => { const e = R.eventsInfo(s).find((w) => { const def = R.evDef(w.id); return def.mods && def.mods.closed && def.mods.closed.includes(j); }); return e ? '事件：' + e.name : null; };
    return [
      { id: 'garden', group: 'life', name: '天台菜園', sub: '在大廈天台種菜：澆水、收成、趕走偷菜的白鴿',
        fx: [['body', '−3'], ['spark', '+0.1 起'], ['cr', '收成好就不用付飯錢'], ['card', '希望・人情']],
        reason: !rooftop(s) ? '你沒有家，也沒有天台' : R.eventActive(s, 'toxicrain') ? '毒雨期間不能上天台' : null },
      { id: 'salvage', group: 'work', name: '拆樓打撈', sub: '替重建計劃拆舊樓，看準弱點落錘，牆裡可能藏著舊世界的東西',
        fx: [['cr', '約 +$' + Math.round(60 * (R.eventActive(s, 'gentrify') ? 1.5 : 1))], ['body', '−10'], ['spark', '−0.15'], ['card', '記憶・機械']],
        reason: tired || closed('salvage') || (s.body <= 10 ? '身體撐不住了' : null) },
      { id: 'haggle', group: 'work', name: '夜市擺地攤', sub: '把撿回來的舊物賣給遊客：開價太高客人會走，吹噓可以賣貴一點',
        fx: [['cr', '約 +$70'], ['body', '−4'], ['spark', '−0.1'], ['soul', '吹噓會變重'], ['card', '飢餓・人情']],
        reason: closed('haggle') },
    ];
  }
  const gardenConfig = (s) => ({ duration: 32, acid: s.season === 'acid', heat: s.season === 'heat', pigeons: 1 + (R.eventActive(s, 'famine') ? 1 : 0) });
  function applyGarden(s, res) {
    const rep = R.report(s, '天台菜園');
    const h = n(res.harvest);
    R.hurt(s, 3, 'garden'); rep.delta('body', -3);
    rep.delta('spark', R.addSpark(s, 0.1 + 0.02 * h));
    rep.line('收成了 ' + h + ' 棵菜' + (res.stolen ? '，被白鴿偷走 ' + res.stolen + ' 棵' : '') + (res.wilted ? '，枯死了 ' + res.wilted + ' 棵' : ''), '');
    if (h >= 3) { s.flags.vegDinner = s.day; rep.line('今晚吃自己種的菜，不用付飯錢', 'good'); }
    if (h > 6) { const cr = (h - 6) * 4; s.cr += cr; s.stats.crEarned += cr; rep.line('把多出來的菜賣給鄰居', 'good', cr, 'cr'); }
    if (h > 0) rep.gain(h >= 10 ? 'g_tomato' : 'g_sprout');
    if (res.mutant) rep.gain('g_mutant');
    R.train(s, { empathy: 0.6, calm: 0.8, imag: 0.5, fit: 0.3 }, rep);
    R.teach(s, 'garden', 0.35, rep);
    s.stats.actions.garden = (s.stats.actions.garden || 0) + 1;
    return grade(s, 'garden', res, rep.done());
  }
  const salvageConfig = (s) => ({ floors: 12, swing: 1 + (R.eventActive(s, 'gentrify') ? 0.2 : 0), duration: 36 });
  function applySalvage(s, res) {
    const rep = R.report(s, '拆樓打撈');
    const cr = Math.round(n(res.cr) * (R.eventActive(s, 'gentrify') ? 1.5 : 1));
    s.cr += cr; s.stats.crEarned += cr;
    rep.delta('cr', cr);
    const body = 10 + 3 * Math.min(5, n(res.injured));
    R.hurt(s, body, 'salvage'); rep.delta('body', -body);
    rep.delta('spark', R.addSpark(s, -0.15));
    s.workedToday = true;
    rep.line('拆了 ' + n(res.floors) + ' 層樓' + (res.injured ? '，被落下的碎石打中 ' + res.injured + ' 次' : ''), '');
    (res.items || []).slice(0, 3).forEach((id) => rep.gain(id));
    if (!(res.items || []).length) rep.gain('v_dust');
    R.train(s, { fit: 1, dex: 0.8, obey: 0.4, imag: -0.3 }, rep);
    R.teach(s, 'salvage', 0.25, rep);
    if (R.rand(s) < 0.25) R.sin(s, 0.8, rep, '你拆掉的樓裡，還有人沒有搬走', '拆掉的家', 'memory');
    s.stats.actions.salvage = (s.stats.actions.salvage || 0) + 1;
    return grade(s, 'salvage', res, rep.done());
  }
  const haggleConfig = (s) => ({ customers: 6, insight: s.attr.insight, tourists: R.eventActive(s, 'tourists') || R.eventActive(s, 'nightmarket') });
  function applyHaggle(s, res) {
    const rep = R.report(s, '夜市擺地攤');
    const cr = Math.round(n(res.total));
    s.cr += cr; s.stats.crEarned += cr; rep.delta('cr', cr);
    R.hurt(s, 4, 'haggle'); rep.delta('body', -4);
    rep.delta('spark', R.addSpark(s, -0.1));
    s.workedToday = true;
    rep.line('賣出 ' + n(res.deals) + ' 件貨' + (res.walkaways ? '，' + res.walkaways + ' 個客人掉頭走了' : ''), '');
    rep.gain(n(res.deals) >= 4 ? 'h_coin' : 'h_walkaway');
    if (res.lies) R.sin(s, 0.5 * res.lies, rep, '你把浮城製造的東西說成真古董 ' + res.lies + ' 次', res.lies >= 2 ? '說得像真的一樣' : null, 'neon');
    if (res.exposed) { s.rating = Math.max(1, s.rating - 0.2); rep.line('有客人當場拆穿你：平台評分 −0.2', 'bad'); }
    R.train(s, { social: 1, insight: 0.6, obey: -0.3 }, rep);
    R.teach(s, 'haggle', 0.3, rep);
    s.stats.actions.haggle = (s.stats.actions.haggle || 0) + 1;
    return grade(s, 'haggle', res, rep.done());
  }

  IE.Jobs2 = { RANKS, rankOf, PERF, SPECIAL, grade, actions, gardenConfig, applyGarden, salvageConfig, applySalvage, haggleConfig, applyHaggle };
});
