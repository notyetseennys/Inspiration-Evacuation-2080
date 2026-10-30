// 《靈感撤離 2080》局外成長：外星評級（難度階梯）、人才檔案等級、成就、每日挑戰、外星 HR 內部備忘錄。
// 設計原則：每一局都會得到一點東西；解鎖的是「新選擇」而不是單純變強；難度由玩家自己選擇往上爬。純邏輯，瀏覽器與 Node 共用。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA;

  // ---------- 外星評級：每一級都疊加上一級的規則 ----------
  const STAKES = [
    { n: 1, name: '見習', desc: '標準規則' },
    { n: 2, name: '正式', desc: '小展與聯展的目標 ×1.25' },
    { n: 3, name: '資深', desc: '每期租金 +15%' },
    { n: 4, name: '主管', desc: '外星評審每次有兩條規則' },
    { n: 5, name: '總監', desc: '篩選門檻 ×1.2' },
    { n: 6, name: '副總裁', desc: '每晚少一次改稿' },
    { n: 7, name: '合夥人', desc: '商店、物件與工具卡貴三成' },
    { n: 8, name: '外星人本人', desc: '所有關卡目標再 ×1.2，篩選門檻 ×1.4' },
  ];
  function stakeMod(s, key) {
    const k = (s && s.stake) || 1;
    switch (key) {
      case 'stageTarget': return (k >= 2 ? 1.25 : 1) * (k >= 8 ? 1.2 : 1);
      case 'rent': return k >= 3 ? 1.15 : 1;
      case 'doubleBoss': return k >= 4 ? 2 : 1;
      case 'threshold': return k >= 8 ? 1.4 : k >= 5 ? 1.2 : 1;
      case 'discards': return k >= 6 ? 1 : 0;
      case 'prices': return k >= 7 ? 1.3 : 1;
      default: return 1;
    }
  }
  const stakeCleared = (m, bg) => (m && m.stakes && m.stakes[bg]) || 0;
  const stakeMax = (m, bg) => Math.min(8, stakeCleared(m, bg) + 1);

  // ---------- 人才檔案等級 ----------
  // 每局按存活天數、通過的關卡和結局得到經驗；每升一級有一個獎勵和一份外星 HR 內部備忘錄
  const BASE_TOOLS = ['rewrite', 'renew', 'coffee', 'lamp', 'convert'];
  const LEVELS = [
    null, null,
    { text: '工具卡「碎紙」加入卡池', tool: 'shred' }, { text: '人才扭蛋券 +2', tickets: 2 }, { text: '工具卡「複印」加入卡池', tool: 'copy' },
    { text: '每日挑戰開放', daily: true }, { text: '工具卡「裝裱」加入卡池', tool: 'frame' }, { text: '人才扭蛋券 +3', tickets: 3 },
    { text: '工具卡欄 +1', toolSlots: 1 }, { text: '工具卡「拼貼」加入卡池', tool: 'collage' }, { text: '每局開始時多帶一張工具卡', startTool: 1 },
    { text: '工具卡「夢境」加入卡池', tool: 'dream' }, { text: '人才扭蛋券 +4', tickets: 4 }, { text: '工具卡「作品集」加入卡池', tool: 'portfolio' },
    { text: '人才扭蛋券 +5', tickets: 5 }, { text: '靈感物件欄 +1（開局 4 格）', objSlots: 1 },
  ];
  const xpFor = (lv) => 100 + 60 * (lv - 1); // 由 lv 升到 lv+1 要的經驗
  const levelOf = (m) => (m && m.level) || 1;
  function levelInfo(m) {
    const lv = levelOf(m), xp = (m && m.xp) || 0;
    const next = LEVELS[lv + 1] || { text: '人才扭蛋券 +5', tickets: 5 };
    return { level: lv, xp, need: xpFor(lv), next };
  }
  // 局內查詢（新一局開始時從 meta 複製到 s.metaPerks）
  const perks = (m) => {
    const lv = levelOf(m), out = { tools: BASE_TOOLS.slice(), toolSlots: 0, startTool: 0, objSlots: 0, daily: false, weekly: lv >= 3 };
    for (let i = 2; i <= lv; i++) { const L = LEVELS[i]; if (!L) continue; if (L.tool) out.tools.push(L.tool); if (L.toolSlots) out.toolSlots += L.toolSlots; if (L.startTool) out.startTool += L.startTool; if (L.objSlots) out.objSlots += L.objSlots; if (L.daily) out.daily = true; }
    return out;
  };
  const toolOpen = (s, id) => !s.metaPerks || s.metaPerks.tools.includes(id);
  const bonus = (s, key) => (s.metaPerks && s.metaPerks[key]) || 0;

  // ---------- 外星 HR 內部備忘錄：每升一級解鎖一份，慢慢揭開星際人才發展局的真相 ----------
  const MEMOS = [
    '【備忘錄 #001】地球樣本的篩選標準維持不變：又亮又輕。請勿向樣本解釋「輕」的定義。',
    '【備忘錄 #002】本季地球樣本的平均靈魂重量上升 3%。研究部建議把「良知」重新分類為可回收物料。',
    '【備忘錄 #003】有樣本在面試時問：「你們要人才做甚麼？」請統一回答：「我們是一個宇宙大家庭。」',
    '【備忘錄 #004】提醒各篩選員：探射燈每晚的電費由被篩走的樣本分攤。',
    '【備忘錄 #005】浮城的 AI 已經學會模仿人類的作品。請篩選員留意：我們要的是會「燒」的那種，不是會「生成」的那種。',
    '【備忘錄 #006】關於「21 克」上限：這不是技術限制。牽引光束可以拉起任何重量。我們只是不想要有包袱的員工。',
    '【備忘錄 #007】人才扭蛋機的 UR 機率已調整為 1.5%。法務部確認此舉符合《星際勞工保障條例》第 80 條。',
    '【備忘錄 #008】請勿再把被遣返的樣本稱為「失敗品」。正式名稱為「文化不契合的回收資產」。',
    '【備忘錄 #009】有篩選員在報告中寫「這個樣本的作品令我哭了」。該篩選員已被安排休假。我們沒有淚腺。',
    '【備忘錄 #010】被帶走的地球人目前全部從事同一份工作：篩選下一批地球人。這是一個可持續的模式。',
    '【備忘錄 #011】浮城的水位上升速度與本局的招募進度一致。請勿在樣本面前提及兩者的關係。',
    '【備忘錄 #012】阿星（編號 2079-A）申請調回地球。申請已被駁回。理由：表現符合預期。',
    '【備忘錄 #013】本局的母星也曾經被淹沒。我們把最亮的人帶走，然後把其他人留下。後來，我們就變成了現在的樣子。',
    '【備忘錄 #014】有一位地球樣本選擇「關上窗戶」。研究部至今無法解釋這個決定。建議列為「不可預測的優點」。',
    '【備忘錄 #015】這是最後一份備忘錄。如果你讀到這裡，你已經在這個系統裡輪迴了很多次。請問：這一次，你還要被選中嗎？',
  ];

  // ---------- 成就：每個都有扭蛋券獎勵 ----------
  const ACH = [
    { id: 'first', name: '第一次', desc: '完成一局', t: 1, test: (m) => (m.runs || 0) >= 1 },
    { id: 'survive', name: '撐過來了', desc: '活到最後一天', t: 2, test: (m, s) => s.day >= IE.Rules.days(s) && s.body > 0 },
    { id: 'recruited', name: '被選中', desc: '被外星人帶走', t: 3, test: (m, s, e) => e === 'agent' || e === 'returned' },
    { id: 'guardian', name: '關上窗戶', desc: '被選中時選擇留下', t: 3, test: (m, s, e) => e === 'guardian' },
    { id: 'stage3', name: '開展', desc: '一局之內通過三個關卡', t: 1, test: (m, s) => ((s.stats.stages || {}).pass || 0) >= 3 },
    { id: 'stage9', name: '巡迴展', desc: '一局之內通過九個關卡', t: 3, test: (m, s) => ((s.stats.stages || {}).pass || 0) >= 9 },
    { id: 'allstages', name: '全勝', desc: '一局之內通過全部十五個關卡', t: 5, test: (m, s) => ((s.stats.stages || {}).pass || 0) >= 15 },
    { id: 'double', name: '驚為天人', desc: '在關卡之夜得到目標的兩倍分數', t: 2, test: (m, s) => ((s.stats.stages || {}).double || 0) >= 1 },
    { id: 'legend', name: '傳說', desc: '觸發任何一個傳說組合', t: 2, test: (m) => D.RECIPES.some((r) => r.legend && m.recipes && m.recipes[r.id]) },
    { id: 'recipes30', name: '組合收藏家', desc: '跨局發現 30 個具名組合', t: 3, test: (m) => Object.keys(m.recipes || {}).length >= 30 },
    { id: 'million', name: '一百萬', desc: '一次下筆得到 100 萬分', t: 3, test: (m) => (m.bestPlay || 0) >= 1000000 },
    { id: 'light', name: '沒有包袱', desc: '以 3 克以下的靈魂完成一局', t: 2, test: (m, s, e) => s.soul <= 3 && IE.Rules.age(s) >= 60 },
    { id: 'heavy', name: '背著整個世界', desc: '靈魂超過 60 克', t: 1, test: (m, s) => s.soul >= 60 },
    { id: 'deaths10', name: '十種死法', desc: '死亡圖鑑收集 10 種', t: 2, test: (m) => Object.keys(m.deaths || {}).length >= 10 },
    { id: 'deaths30', name: '死得很有創意', desc: '死亡圖鑑收集 30 種', t: 4, test: (m) => Object.keys(m.deaths || {}).length >= 30 },
    { id: 'world10', name: '環遊世界', desc: '跨局去過 10 個目的地', t: 3, test: (m) => Object.keys(m.visited || {}).length >= 10 },
    { id: 'rare3', name: '極稀有', desc: '跨局找到 3 種極稀有素材', t: 3, test: (m) => Object.keys(m.rares || {}).length >= 3 },
    { id: 'tools10', name: '工具人', desc: '一局之內用 10 張工具卡', t: 2, test: (m, s) => (s.stats.toolsUsed || 0) >= 10 },
    { id: 'rankSS', name: '神乎其技', desc: '小遊戲得到 SS 評級', t: 2, test: (m, s) => ((s.stats.ranks || {}).SS || 0) >= 1 },
    { id: 'stake3', name: '資深人才', desc: '以外星評級 3 撐到最後', t: 3, test: (m) => Object.values(m.stakes || {}).some((v) => v >= 3) },
    { id: 'stake8', name: '外星人本人', desc: '以外星評級 8 撐到最後', t: 10, test: (m) => Object.values(m.stakes || {}).some((v) => v >= 8) },
    { id: 'chars5', name: '多重人格', desc: '用五個不同的角色完成一局', t: 3, test: (m) => Object.keys(m.played || {}).length >= 5 },
    { id: 'daily', name: '每日一篩', desc: '完成一次每日挑戰', t: 2, test: (m, s) => !!s.daily },
    { id: 'memos', name: '真相', desc: '讀到最後一份外星 HR 備忘錄', t: 5, test: (m) => levelOf(m) >= MEMOS.length + 1 },
    { id: 'school', name: '自成一派', desc: '以三件同流派的靈感物件通過一個關卡', t: 2, test: (m, s) => Object.keys(s.stats.schoolPass || {}).length >= 1 },
    { id: 'schools5', name: '百家爭鳴', desc: '跨局以五個不同的流派通過關卡', t: 4, test: (m) => Object.keys(m.schoolPass || {}).length >= 5 },
    { id: 'opus', name: '傑作', desc: '寫出作品形式「傑作」（同一媒材的史詩）', t: 3, test: (m, s) => !!(s.formsSeen && s.formsSeen.opus) },
    { id: 'objects60', name: '靈感收藏家', desc: '跨局見過 60 件靈感物件', t: 3, test: (m) => Object.keys(m.objSeen || {}).length >= 60 },
  ];

  // ---------- 每日挑戰：同一天的所有玩家用同一個種子、角色、季節，外星評級 2 ----------
  const dateKey = (d) => { const x = d || new Date(); return x.getFullYear() + String(x.getMonth() + 1).padStart(2, '0') + String(x.getDate()).padStart(2, '0'); };
  function daily(key) {
    let h = 2166136261;
    for (const ch of String(key)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    h >>>= 0;
    const bgs = Object.keys(D.BACKGROUNDS).filter((id) => !D.BACKGROUNDS[id].unlock);
    const seasons = Object.keys(D.SEASONS);
    return { key, seed: h % 1000000000, bg: bgs[h % bgs.length], season: seasons[(h >>> 8) % seasons.length], stake: 2 };
  }

  // ---------- 每週挑戰（第八期）：同一週的所有玩家用同一個種子、角色和一條特別規則，外星評級 3 ----------
  const WEEKLY_MODS = {
    flood: { name: '大洪水週', desc: '開局水位已經到 4 樓' },
    broke: { name: '破產週', desc: '開局身無分文' },
    judges: { name: '全員評審週', desc: '社區小展和畫廊聯展也有外星評審的規則' },
    single: { name: '斷捨離週', desc: '只可以裝備一件靈感物件' },
  };
  function weekKey(d) {
    const x = d ? new Date(d) : new Date();
    const t = new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return t.getUTCFullYear() + '-W' + String(Math.ceil(((t - y0) / 86400000 + 1) / 7)).padStart(2, '0');
  }
  function weekly(key) {
    let h = 2166136261;
    for (const ch of 'week' + String(key)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    h >>>= 0;
    const bgs = Object.keys(D.BACKGROUNDS).filter((id) => D.BACKGROUNDS[id].rarity === 'R');
    const seasons = Object.keys(D.SEASONS), mods = Object.keys(WEEKLY_MODS);
    return { key, seed: h % 1000000000, bg: bgs[h % bgs.length], season: seasons[(h >>> 8) % seasons.length], stake: 3, mod: mods[(h >>> 12) % mods.length] };
  }

  // ---------- 角色精通（第八期）：每個角色各自累積經驗，升級解鎖角色故事和獎勵 ----------
  const MASTERY_XP = [0, 0, 150, 400, 800, 1400]; // 升到 Lv.k 要的累積經驗
  const MASTERY_REWARD = [null, null,
    { text: '角色故事（一）；金色扭蛋券 +1', story: 0, gold: 1 },
    { text: '角色故事（二）；用這個角色開局時多帶一張工具卡', story: 1, tool: 1 },
    { text: '角色故事（三）；金色外框', story: 2, frame: true },
    { text: '「大師」稱號；外星扭蛋券 +1', rainbow: 1, title: true },
  ];
  function masteryOf(m, bg) {
    const xp = (m && m.mastery && m.mastery[bg]) || 0;
    let level = 1;
    while (level < 5 && xp >= MASTERY_XP[level + 1]) level++;
    return { xp, level, next: MASTERY_XP[level + 1] || null, base: MASTERY_XP[level], reward: MASTERY_REWARD[level + 1] || null };
  }
  const storiesOf = (m, bg) => ((D.STORIES && D.STORIES[bg]) || []).slice(0, Math.max(0, masteryOf(m, bg).level - 1));

  // ---------- 一局結束：經驗、等級、評級、成就、每日挑戰紀錄 ----------
  function settle(m, s, e) {
    const st = s.stats.stages || {};
    const xp = Math.round(IE.Rules.age(s) + 25 * (st.pass || 0) + ({ agent: 80, returned: 60, guardian: 70, heavy: 40, ordinary: 30 }[e] || 0) + 4 * (s.stake || 1) * ((st.pass || 0) + 1));
    m.xp = (m.xp || 0) + xp;
    m.level = levelOf(m);
    m.lastXp = xp; m.lastLevels = [];
    while (m.xp >= xpFor(m.level)) {
      m.xp -= xpFor(m.level);
      m.level++;
      const L = LEVELS[m.level] || { text: '人才扭蛋券 +5', tickets: 5 };
      if (L.tickets) m.tickets = (m.tickets || 0) + L.tickets;
      m.lastLevels.push({ level: m.level, text: L.text, memo: MEMOS[m.level - 2] || null });
    }
    // 角色精通：同一份經驗也加到這個角色
    m.mastery = m.mastery || {};
    const lv0 = masteryOf(m, s.bg).level;
    m.mastery[s.bg] = (m.mastery[s.bg] || 0) + xp;
    m.lastMastery = [];
    for (let k = lv0 + 1; k <= masteryOf(m, s.bg).level; k++) {
      const W = MASTERY_REWARD[k];
      if (W.gold) m.goldTickets = (m.goldTickets || 0) + W.gold;
      if (W.rainbow) m.rainbowTickets = (m.rainbowTickets || 0) + W.rainbow;
      m.lastMastery.push({ level: k, text: W.text, story: W.story != null && D.STORIES && D.STORIES[s.bg] ? D.STORIES[s.bg][W.story] : null });
    }
    m.lastExtra = [];
    // 對局歷史與個人紀錄
    const ms = s.playMs || 0;
    m.history = [{ date: dateKey(), bg: s.bg, mode: s.mode || 'long', stake: s.stake || 1, day: s.day, ending: e, stages: st.pass || 0,
      best: s.stats.bestPlay || 0, ms, daily: s.daily || null, weekly: s.weekly ? s.weekly.key : null }].concat(m.history || []).slice(0, 30);
    m.bests = m.bests || {};
    const B = m.bests[s.bg] || { stages: 0, best: 0, day: 0 };
    if ((st.pass || 0) > B.stages || (s.stats.bestPlay || 0) > B.best) m.lastExtra.push('個人紀錄：' + D.BACKGROUNDS[s.bg].name);
    m.bests[s.bg] = { stages: Math.max(B.stages, st.pass || 0), best: Math.max(B.best, s.stats.bestPlay || 0), day: Math.max(B.day, s.day) };
    // 收藏完成獎勵：湊齊一個流派的全部靈感物件（金色扭蛋券），打敗全部外星評審規則（外星扭蛋券）
    m.schoolDone = m.schoolDone || {};
    Object.keys(D.SCHOOLS || {}).forEach((k) => {
      if (m.schoolDone[k]) return;
      const all = D.OBJECTS.filter((o) => o.school === k);
      if (all.length && all.every((o) => m.objSeen && m.objSeen[o.id])) { m.schoolDone[k] = true; m.goldTickets = (m.goldTickets || 0) + 1; m.lastExtra.push('湊齊「' + D.SCHOOLS[k].name + '」的全部物件：金色扭蛋券 +1'); }
    });
    m.judges = Object.assign(m.judges || {}, s.stats.judges || {});
    if (!m.judgesDone && IE.Stages && IE.Stages.BOSSES.every((b) => m.judges[b.id])) { m.judgesDone = true; m.rainbowTickets = (m.rainbowTickets || 0) + 1; m.lastExtra.push('打敗過全部外星評審的規則：外星扭蛋券 +1'); }
    // 外星評級：活到最後（沒有死亡、沒有灰化）就算通過
    m.stakes = m.stakes || {};
    m.played = m.played || {};
    m.played[s.bg] = (m.played[s.bg] || 0) + 1;
    m.lastStake = null;
    if (e !== 'death' && e !== 'grey' && (s.stake || 1) > stakeCleared(m, s.bg)) { m.stakes[s.bg] = s.stake || 1; m.lastStake = s.stake || 1; }
    // 每日挑戰
    if (s.daily) {
      m.daily = m.daily || {};
      const prev = m.daily[s.daily];
      const score = s.day + 100 * (st.pass || 0) + (e === 'agent' ? 1000 : 0);
      if (!prev) { m.goldTickets = (m.goldTickets || 0) + 1; m.lastExtra.push('完成今天的每日挑戰：金色扭蛋券 +1'); }
      if (!prev || score > prev.score) m.daily[s.daily] = { score, day: s.day, stages: st.pass || 0, ending: e, bg: s.bg };
    }
    // 每週挑戰：每週第一次完成，外星扭蛋券 +1
    if (s.weekly) {
      m.weekly = m.weekly || {};
      const prev = m.weekly[s.weekly.key];
      const score = s.day + 100 * (st.pass || 0) + (e === 'agent' ? 1000 : 0);
      if (!prev) { m.rainbowTickets = (m.rainbowTickets || 0) + 1; m.lastExtra.push('完成本週挑戰：外星扭蛋券 +1'); }
      if (!prev || score > prev.score) m.weekly[s.weekly.key] = { score, day: s.day, stages: st.pass || 0, ending: e, bg: s.bg };
    }
    // 成就
    m.ach = m.ach || {};
    m.lastAch = [];
    ACH.forEach((a) => {
      if (m.ach[a.id]) return;
      let ok = false;
      try { ok = !!a.test(m, s, e); } catch (err) { ok = false; }
      if (ok) { m.ach[a.id] = 1; m.tickets = (m.tickets || 0) + a.t; if (a.t >= 5) m.goldTickets = (m.goldTickets || 0) + 1; m.lastAch.push(a.id); }
    });
    return m;
  }

  IE.Meta = { STAKES, stakeMod, stakeCleared, stakeMax, LEVELS, xpFor, levelOf, levelInfo, perks, toolOpen, bonus, MEMOS, ACH, dateKey, daily, settle, BASE_TOOLS,
    WEEKLY_MODS, weekKey, weekly, MASTERY_XP, MASTERY_REWARD, masteryOf, storiesOf };
});
