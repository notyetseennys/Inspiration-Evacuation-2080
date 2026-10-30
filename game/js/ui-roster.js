// 《靈感撤離 2080》第八期介面：選角畫面、三種扭蛋券的人才扭蛋機、對局紀錄、招牌能力的提示。
// 在 ui.js 之後載入，把函式加到 IE.UI。
(function (IE) {
  'use strict';
  const D = () => IE.DATA;
  const UI = IE.UI;
  const esc = UI.esc, fmt = UI.fmt;
  const ENDING = { agent: '被選中', returned: '被退回', guardian: '地球守護者', heavy: '良知太重', ordinary: '平凡人', death: '死亡', grey: '灰化' };
  const RNAME = { R: '普通人', SR: '稀有人才', UR: '極稀有（包括外星人）' };
  const mmss = (ms) => { const m = Math.round((ms || 0) / 60000); return m >= 60 ? Math.floor(m / 60) + ' 小時 ' + (m % 60) + ' 分' : m + ' 分鐘'; };
  const tickets = (meta) => { const RO = IE.Roster; return Object.keys(RO.TICKETS).map((k) => ({ k, T: RO.TICKETS[k], n: RO.ticketsOf(meta, k) })); };

  // 扭蛋券的小標籤（標題、選角、扭蛋機共用）
  function ticketChips(meta, o) {
    o = o || {};
    return '<span class="tk-chips' + (o.big ? ' big' : '') + '">' + tickets(meta).map((x) => '<span class="tk-chip" style="--c:' + x.T.color + '" title="' + esc(x.T.name + '：' + x.T.desc) + '"><i></i>' + x.T.short + ' <b class="num">' + x.n + '</b></span>').join('') + '</span>';
  }
  // 角色精通的星星
  const stars = (lv) => '<span class="stars" aria-label="精通 Lv.' + lv + '">' + [1, 2, 3, 4, 5].map((k) => '<i class="' + (k <= lv ? 'on' : '') + '"></i>').join('') + '</span>';

  function abilityHtml(bg, o) {
    o = o || {};
    const A = D().ABILITIES[bg];
    if (!A) return '';
    return '<div class="sd-abil' + (o.compact ? ' compact' : '') + '"><div class="sd-ab-h"><span class="lbl">招牌能力</span><b>' + esc(A.name) + '</b><span class="use">' + esc(D().ABILITY_USE[A.use]) + '</span></div>'
      + '<p>' + esc(A.desc) + '</p><p class="sd-cost"><span class="lbl">代價</span>' + esc(A.cost) + '</p></div>';
  }
  function masteryHtml(meta, bg) {
    const M = IE.Meta.masteryOf(meta, bg);
    const pct = M.next ? Math.min(100, (M.xp - M.base) / (M.next - M.base) * 100) : 100;
    return '<div class="sd-mast"><div class="sd-mast-h"><span class="lbl">角色精通</span>' + stars(M.level) + '<b>Lv.' + M.level + (M.level >= 5 ? '・大師' : '') + '</b>'
      + '<span class="mute num">' + (M.next ? M.xp + ' / ' + M.next : M.xp) + '</span></div>'
      + '<div class="bar"><i style="width:' + pct + '%"></i></div>'
      + (M.reward ? '<small>下一級：' + esc(M.reward.text) + '</small>' : '<small>已經是大師。</small>') + '</div>';
  }
  function storiesHtml(meta, bg) {
    const all = (D().STORIES && D().STORIES[bg]) || [];
    const got = IE.Meta.storiesOf(meta, bg);
    return '<div class="sd-stories">' + all.map((t, i) => (i < got.length ? '<p class="story">' + esc(t) + '</p>' : '<p class="story locked">角色精通 Lv.' + (i + 2) + ' 解鎖第 ' + (i + 1) + ' 段故事</p>')).join('') + '</div>';
  }
  function unlockProgress(meta, b) {
    if (!b.unlock || !b.unlock.prog) return '';
    const [cur, need] = b.unlock.prog(meta);
    return '<div class="bar unlock-bar"><i style="width:' + Math.min(100, cur / need * 100) + '%"></i></div><small class="num">' + Math.min(cur, need) + ' / ' + need + '</small>';
  }

  // ---------- 選角 ----------
  function setupPanel(sel, meta) {
    const bgs = D().BACKGROUNDS, RO = IE.Roster;
    const roster = RO.list(meta);
    const b = bgs[sel.bg];
    const open = RO.unlocked(meta, sel.bg);
    const mast = (id) => IE.Meta.masteryOf(meta, id).level;
    const card = (x) => '<button class="ch r-' + x.rarity + (sel.bg === x.id ? ' sel' : '') + (x.open ? '' : ' locked') + (x.open && mast(x.id) >= 4 ? ' gold' : '') + '" type="button" data-do="bg" data-id="' + x.id + '" aria-pressed="' + (sel.bg === x.id) + '">'
      + '<span class="ch-rar">' + x.rarity + '</span>'
      + '<span class="ch-por">' + IE.Chars.img(x.id, 4, !x.open) + '</span>'
      + '<span class="ch-name">' + (x.open ? esc(x.short || x.name) : '？？？') + '</span>'
      + (x.open ? '<span class="ch-abil">' + esc(D().ABILITIES[x.id] ? D().ABILITIES[x.id].name : '') + '</span>' + stars(mast(x.id)) : '<span class="ch-lock">未解鎖</span>') + '</button>';
    const group = (r) => {
      const list = roster.filter((x) => x.rarity === r);
      return '<div class="su-group"><h3><span class="rar r-' + r + '">' + r + '</span>' + RNAME[r] + '<span class="mute num">' + list.filter((x) => x.open).length + '/' + list.length + '</span></h3>'
        + '<div class="su-grid">' + list.map(card).join('') + '</div></div>';
    };
    const school = (() => { const o = D().OBJ[D().START_OBJECT[sel.bg]]; if (!o) return ''; const sc = o.school && D().SCHOOLS[o.school];
      return '<div class="sd-school">' + IE.Icons.obj(o.id, 36) + '<div>' + (sc ? '<span class="sch-tag" style="--c:' + sc.color + '">' + esc(sc.name) + '</span>' : '') + '<b>起始物件：' + esc(o.name) + '</b><span>' + esc(o.desc) + '</span></div></div>'; })();
    const best = meta.bests && meta.bests[sel.bg];
    const bodyMax = Math.round((70 + 0.3 * b.stats.fit) * (b.perk.bodyMult || 1)) - (b.perk.bodyMinus || 0);
    const detail = open
      ? '<div class="sd-head"><div class="sd-por' + (mast(sel.bg) >= 4 ? ' gold' : '') + '">' + IE.Chars.img(sel.bg, 7) + '</div><div class="sd-id">'
        + '<span class="rar r-' + b.rarity + '">' + b.rarity + '</span><h3>' + esc(b.name) + (mast(sel.bg) >= 5 ? '<small class="title">大師</small>' : '') + '</h3>'
        + '<p class="mute">' + esc(b.desc + b.past) + '</p>'
        + '<div class="sd-chips"><span style="--c:var(--cash)">$' + b.cr + '</span><span style="--c:var(--spark)">火花 ×' + b.spark.toFixed(1) + '</span><span style="--c:var(--stone)">靈魂 ' + b.soul + ' 克</span>'
        + '<span>良知 ' + Math.round(b.conscience * 100) + '%</span><span>身體 ' + bodyMax + '</span><span>住 ' + b.floor + ' 樓</span>'
        + '<span title="素材計分時的籌碼倍數">創作籌碼 ×' + (b.perk.craftChips || 1) + '</span>' + (b.rarity !== 'R' ? '<span style="--c:var(--alien)" title="外星 HR 對稀有人才的要求比較低">篩選門檻 ' + (b.rarity === 'UR' ? '−28%' : '−12%') + '</span>' : '') + '</div></div></div>'
        + abilityHtml(sel.bg) + school + masteryHtml(meta, sel.bg)
        + '<details class="sd-more"><summary>角色故事、能力值與個人紀錄</summary>' + storiesHtml(meta, sel.bg)
        + '<p class="p">' + esc(b.perkText) + '</p>' + UI.statBars(b.stats, { compact: true })
        + (best ? '<p class="mute">個人紀錄：最多 ' + best.stages + ' 關・最佳一筆 ' + fmt(best.best) + ' 分・活到第 ' + best.day + ' 天</p>' : '') + '</details>'
      : '<div class="sd-head"><div class="sd-por">' + IE.Chars.img(sel.bg, 7, true) + '</div><div class="sd-id"><span class="rar r-' + b.rarity + '">' + b.rarity + '</span><h3>？？？</h3>'
        + '<p class="act-why">解鎖條件：' + esc(b.unlock.text) + '</p>' + unlockProgress(meta, b) + '</div></div>'
        + abilityHtml(sel.bg, { compact: true })
        + '<p class="mute">也可以用人才扭蛋機抽出來：' + ticketChips(meta) + '</p>';
    const modes = D().MODES;
    const opts = '<div class="su-opts">'
      + '<div class="su-opt"><span class="lbl">一局的長度</span><div class="seg">' + Object.keys(modes).map((k) => '<button type="button" class="' + ((sel.mode || 'standard') === k ? 'sel' : '') + '" data-do="mode" data-id="' + k + '">' + modes[k].name + '<small>' + modes[k].desc + '</small></button>').join('') + '</div></div>'
      + '<div class="su-opt"><span class="lbl">起始季節</span><div class="seg">' + Object.keys(D().SEASONS).map((k) => '<button type="button" class="' + (sel.season === k ? 'sel' : '') + '" data-do="season" data-id="' + k + '">' + D().SEASONS[k].name + '</button>').join('') + '</div></div>'
      + (open ? UI.stakeHtml(sel, meta) : '') + '</div>';
    return '<div class="setup8"><div class="panel-head"><h2>你是誰？</h2><p>R 一開始就可以用；SR 要在遊戲中做到某件事；UR 要完成艱難的挑戰。三級都可以用人才扭蛋機抽出來。</p></div>'
      + '<div class="su-layout"><div class="su-roster">' + group('R') + group('SR') + group('UR') + '</div>'
      + '<aside class="su-detail r-' + b.rarity + '" aria-live="polite">' + detail + '</aside></div>'
      + opts
      + '<div class="su-go"><button class="btn" type="button" data-do="back">返回</button><button class="btn gacha-btn" type="button" data-do="gacha">人才扭蛋機' + ticketChips(meta) + '</button>'
      + '<button class="btn primary big" type="button" data-do="start"' + (open ? '' : ' disabled') + '>' + (open ? '出發' : '未解鎖') + '</button></div></div>';
  }

  // ---------- 人才扭蛋機：三種扭蛋券 ----------
  function gachaModal(meta, result, spinning, type) {
    const RO = IE.Roster;
    const lockedOf = (r) => RO.list(meta).filter((c) => !c.open && c.rarity === r).length;
    let res = '';
    if (result && result.type === 'char') {
      const b = D().BACKGROUNDS[result.id], A = D().ABILITIES[result.id];
      res = '<div class="gacha-result r-' + b.rarity + '"><span class="rar r-' + b.rarity + '">' + b.rarity + '</span>' + IE.Chars.img(result.id, 8) + '<h3>' + esc(b.name) + '</h3>'
        + (A ? '<p><b>招牌能力・' + esc(A.name) + '</b>：' + esc(A.desc) + '</p>' : '') + '<p class="mute">' + esc(b.desc) + '</p></div>';
    } else if (result) {
      res = '<div class="gacha-result miss"><p class="miss-text">' + esc(result.text) + '</p>' + (result.card ? '<p class="mute">「' + esc(D().CARDS[result.card].name) + '」</p>' : '') + '</div>';
    }
    const left = Math.max(0, RO.PITY - (meta.pity || 0));
    const cards = tickets(meta).map((x) => '<div class="g-tk' + (type === x.k ? ' on' : '') + '" style="--c:' + x.T.color + '"><div class="g-tk-h"><i></i><b>' + esc(x.T.name) + '</b><span class="num">× ' + x.n + '</span></div>'
      + '<p>' + esc(x.T.desc) + '</p><button class="btn' + (x.n >= x.T.cost ? ' primary' : '') + '" type="button" data-do="pull" data-id="' + x.k + '"' + (x.n >= x.T.cost && !spinning ? '' : ' disabled') + '>抽一次（' + x.T.cost + ' 張）</button></div>').join('');
    return '<div class="modal gacha g8"><span class="eyebrow">星際人才發展局・人才扭蛋機</span><h2>抽出你的下一世</h2>'
      + '<div class="gacha-machine' + (spinning ? ' spin' : '') + '" style="--c:' + (type ? RO.TICKETS[type].color : '#ff8fd1') + '"><div class="globe">' + [0, 1, 2, 3, 4, 5].map((i) => '<i style="--i:' + i + '"></i>').join('') + '</div><div class="slot"></div></div>'
      + res
      + '<div class="g-tks">' + cards + '</div>'
      + '<p class="tickets">已扭 ' + (meta.pulls || 0) + ' 次・未解鎖 SR <b>' + lockedOf('SR') + '</b> 個、UR <b>' + lockedOf('UR') + '</b> 個・根據《星際勞工保障條例》，再扭 ' + left + ' 次沒有 UR，下一次必定是 UR。</p>'
      + '<p class="mute g-where">扭蛋券怎樣得到：關卡入選、小遊戲 SS、發現傳說組合（金）、驚為天人（金）、每日挑戰（金）、每週挑戰（外星）、角色精通、成就、湊齊流派、街上的外星推廣員。</p>'
      + '<div class="btn-row"><button class="btn" type="button" data-do="close"' + (spinning ? ' disabled' : '') + '>離開</button></div></div>';
  }

  // ---------- 對局紀錄與個人紀錄 ----------
  function historyModal(meta) {
    const H = meta.history || [];
    const rows = H.map((h) => '<div class="h-row"><span class="h-date num">' + h.date.slice(4, 6) + '/' + h.date.slice(6, 8) + '</span>'
      + '<span class="h-ch">' + IE.Chars.img(h.bg, 2) + esc(D().BACKGROUNDS[h.bg].short || D().BACKGROUNDS[h.bg].name) + '</span>'
      + '<span class="h-mode">' + (h.mode === 'long' ? '長篇' : '標準') + '・評級 ' + h.stake + (h.daily ? '・每日' : '') + (h.weekly ? '・每週' : '') + '</span>'
      + '<span class="h-end e-' + h.ending + '">' + (ENDING[h.ending] || h.ending) + '</span>'
      + '<span class="num">第 ' + h.day + ' 天</span><span class="num">' + h.stages + ' 關</span><span class="num">' + fmt(h.best) + '</span><span class="num mute">' + (h.ms ? mmss(h.ms) : '—') + '</span></div>').join('');
    const bests = Object.keys(meta.bests || {}).map((id) => { const b = meta.bests[id], M = IE.Meta.masteryOf(meta, id);
      return '<div class="hb">' + IE.Chars.img(id, 3) + '<b>' + esc(D().BACKGROUNDS[id].name) + '</b>' + stars(M.level) + '<span>最多 ' + b.stages + ' 關・活到第 ' + b.day + ' 天</span><span>最佳一筆 <b class="num">' + fmt(b.best) + '</b></span></div>'; }).join('');
    const timed = H.filter((h) => h.ms && h.mode === 'standard');
    const avg = timed.length ? timed.reduce((a, h) => a + h.ms, 0) / timed.length : 0;
    return '<div class="modal wide hist"><h2>對局紀錄</h2>'
      + (avg ? '<p class="mute">標準模式平均每局 ' + mmss(avg) + '（只計遊戲畫面在前景的時間）。</p>' : '')
      + '<h3>最近 ' + H.length + ' 局</h3><div class="h-list">' + (rows || '<p class="mute">還沒有完成過任何一局。</p>') + '</div>'
      + '<h3>每個角色的個人紀錄</h3><div class="h-bests">' + (bests || '<p class="mute">還沒有紀錄。</p>') + '</div>'
      + '<div class="btn-row"><button class="btn primary" type="button" data-do="close">返回</button></div></div>';
  }

  // ---------- 一局之中：招牌能力的提示條 ----------
  function abilityStrip(s) {
    const A = D().ABILITIES[s.bg];
    if (!A) return '';
    const R = IE.Rules;
    const extra = [];
    if (s.bg === 'timetraveler') extra.push('<button class="btn mini sea" type="button" data-do="rewindday"' + (R.canRewindDay(s) ? ' disabled title="' + esc(R.canRewindDay(s)) + '"' : '') + '>重過今天（每期一次）</button>');
    if (s.bg === 'nurse') extra.push('<span class="mute">急救剩 ' + Math.max(0, 2 - (s.aidUsed || 0)) + ' 次</span>');
    if (s.bg === 'courier' && s.flags.rushDay !== s.day) extra.push('<span class="mute">今天還可以趕一次單</span>');
    return '<div class="abil-strip"><span class="lbl">招牌能力</span><b>' + esc(A.name) + '</b><span class="abil-desc">' + esc(A.desc) + '</span>' + extra.join('') + '</div>';
  }
  // 結局：這一局的扭蛋券、角色精通與其他局外獎勵
  function metaRunHtml(meta) {
    const T = meta.lastRunTickets || {};
    const tk = ['silver', 'gold', 'rainbow'].filter((k) => T[k]).map((k) => IE.Roster.TICKETS[k].name + ' +' + T[k]).join('、');
    const mast = (meta.lastMastery || []).map((x) => '<div class="mr-mast"><b>角色精通升到 Lv.' + x.level + '！</b>' + esc(x.text) + (x.story ? '<p class="story">' + esc(x.story) + '</p>' : '') + '</div>').join('');
    const extra = (meta.lastExtra || []).map((t) => '<p class="mr-extra">' + esc(t) + '</p>').join('');
    return (tk ? '<p class="mr-tk">這一局賺到的扭蛋券：<b>' + esc(tk) + '</b></p>' : '') + mast + extra;
  }

  Object.assign(UI, { setupPanel, gachaModal, historyModal, ticketChips, abilityHtml, masteryHtml, storiesHtml, abilityStrip, metaRunHtml, mmss, ENDING_NAME: ENDING });
})(window.IE = window.IE || {});
