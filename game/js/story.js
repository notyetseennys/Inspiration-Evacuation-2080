// 《靈感撤離 2080》第十五期：故事線核心（角色線、物極必反、城市換算、朋友收藏線、阿星線、今日快訊與終局總結）。
// 純邏輯，不涉及 DOM，瀏覽器與 Node（tools/test.js、tools/sim-rounds.js）共用。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA, R = IE.Rules;

  // ---------- 狀態初始化與向後相容 ----------
  function init(s) {
    if (!s) return null;
    s.city = s.city || D.CITY_DEFAULT || 'zone7';
    s.story = {
      done: [],      // 已經回答的章 id
      pending: null, // 今天要回答、還沒有回答的章 id（重新載入時仍然在）
      flags: {},     // 故事旗標
      side: 0,       // 光譜：survive −1、peak +1、both 和 others 0；極端的選項加倍（−2、+2）
      notice: {},    // 外星種族對你的注意 { 種族 id: 次數 }
      log: [],       // [{ night, id, i }]
      later: [],     // 未發生的反轉 [{ round, id, i }]（§14.3 物極必反）
      plan: {},      // 收藏預告 { 輪: { npc, species, why, fate } 或 null }
      met: {},       // 本輪見過最後一面 { npc: 輪 }
      hidden: {},    // 藏起來 { npc: 輪 }
      taken: {},     // 被收藏 { npc: { round, species, met } }
      fates: [],     // 待顯示的近況 [{ npc, species, night, text }]
    };
    if (s.nightMod === undefined) s.nightMod = null; // { night, mult }
    if (s.rentMod === undefined) s.rentMod = null;   // { round, mult }
    return s.story;
  }

  function ensure(s) {
    if (!s) return null;
    if (!s.city) s.city = D.CITY_DEFAULT || 'zone7';
    if (!s.story) return init(s);
    const st = s.story;
    st.done = st.done || [];
    if (st.pending === undefined) st.pending = null;
    st.flags = st.flags || {};
    st.side = st.side || 0;
    st.notice = st.notice || {};
    st.log = st.log || [];
    st.later = st.later || [];
    st.plan = st.plan || {};
    st.met = st.met || {};
    st.hidden = st.hidden || {};
    st.taken = st.taken || {};
    st.fates = st.fates || [];
    if (s.nightMod === undefined) s.nightMod = null;
    if (s.rentMod === undefined) s.rentMod = null;
    return st;
  }

  // 純讀取輔助（不改變 s，供 money、fmt、say、fx、reversals、feed 等唯讀函數使用）
  function getCity(s) {
    const cid = (s && s.city) || (D && D.CITY_DEFAULT) || 'zone7';
    return (D && D.CITIES && (D.CITIES[cid] || D.CITIES[D.CITY_DEFAULT])) || {
      name: '浮城',
      currency: { name: '浮城元', symbol: '$', rate: 1 },
      econ: { rent: 1, pay: 1, price: 1, inflation: 1 },
    };
  }

  function getCityId(s) {
    return (s && s.city) || (D && D.CITY_DEFAULT) || 'zone7';
  }

  function findChapterById(s, id) {
    if (!id || !D.STORY || !D.STORY.lines) return null;
    const bgLine = s && s.bg && D.STORY.lines[s.bg];
    if (bgLine && Array.isArray(bgLine.chapters)) {
      const c = bgLine.chapters.find((x) => x.id === id);
      if (c) return c;
    }
    for (const bg of Object.keys(D.STORY.lines)) {
      const line = D.STORY.lines[bg];
      const c = line && Array.isArray(line.chapters) && line.chapters.find((x) => x.id === id);
      if (c) return c;
    }
    return null;
  }

  // ---------- 城市換算與文字格式化（唯讀，不改變狀態、不用隨機數） ----------
  function moneyAtRound(s, v, round) {
    if (!v) return 0;
    const c = getCity(s);
    const econ = (c && c.econ) || { rent: 1, pay: 1, price: 1, inflation: 1 };
    const r = round == null ? (s && IE.Rounds ? IE.Rounds.roundOf(s) : 1) : round;
    const mult = v >= 0 ? (econ.pay || 1) : (econ.price || 1);
    const inf = Math.pow(econ.inflation || 1, Math.max(0, r - 1));
    return Math.round(v * mult * inf) || 0;
  }

  function money(s, v) {
    return moneyAtRound(s, v, s && IE.Rounds ? IE.Rounds.roundOf(s) : 1);
  }

  function fmt(s, v) {
    const c = getCity(s);
    const cur = (c && c.currency) || { symbol: '$', rate: 1 };
    const num = Math.round(Math.abs(v || 0) * (cur.rate || 1));
    return (cur.symbol || '$') + String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function say(s, str, fxObj) {
    if (typeof str !== 'string' || !str) return '';
    const c = getCity(s);
    const cur = (c && c.currency) || { name: '浮城元', symbol: '$', rate: 1 };
    const r = s && IE.Rounds ? IE.Rounds.roundOf(s) : 1;
    const f = fxObj && fxObj.fx && typeof fxObj.fx === 'object' ? fxObj.fx : (fxObj || {});
    return str
      .replace(/\{cr\}/g, () => fmt(s, money(s, f.cr || 0)))
      .replace(/\{rent\}/g, () => fmt(s, s && IE.Rounds ? IE.Rounds.rentOf(s, r) : 0))
      .replace(/\{city\}/g, () => (c && c.name) || '浮城')
      .replace(/\{currency\}/g, () => cur.name || '浮城元');
  }

  // ---------- 角色線（每輪一章，五章） ----------
  function formatChapter(s, ch) {
    if (!ch) return null;
    return Object.assign({}, ch, {
      text: say(s, ch.text),
      options: (ch.options || []).map((o) => Object.assign({}, o, {
        label: say(s, o.label, o.fx),
        line: say(s, o.line, o.fx),
      })),
    });
  }

  function chapter(s) {
    if (!s || !IE.Rounds || !IE.Rounds.on(s)) return null;
    const st = ensure(s);
    const line = D.STORY && D.STORY.lines && D.STORY.lines[s.bg];
    if (!line || !Array.isArray(line.chapters)) return null;
    const round = IE.Rounds.roundOf(s);
    const dayInRound = ((s.night - 1) % 3) + 1;
    const cityId = getCityId(s);

    if (st.pending) {
      const cur = line.chapters.find((c) => c.id === st.pending);
      if (
        cur &&
        !st.done.includes(cur.id) &&
        cur.round === round &&
        (cur.day || 1) === dayInRound &&
        (!Array.isArray(cur.city) || cur.city.includes(cityId))
      ) {
        return formatChapter(s, cur);
      }
      st.pending = null;
    }

    const found = line.chapters.find((c) => {
      if (c.round !== round) return false;
      if ((c.day || 1) !== dayInRound) return false;
      if (Array.isArray(c.city) && !c.city.includes(cityId)) return false;
      if (st.done.includes(c.id)) return false;
      if (Array.isArray(c.if) && !c.if.every((f) => !!st.flags[f])) return false;
      if (Array.isArray(c.unless) && c.unless.some((f) => !!st.flags[f])) return false;
      return true;
    });

    if (!found) return null;
    st.pending = found.id;
    return formatChapter(s, found);
  }

  function buildFxTags(s, f, round) {
    if (!f) return [];
    const out = [];
    if (f.cr) {
      const m = moneyAtRound(s, f.cr, round);
      out.push(['cr', (m >= 0 ? '+' : '−') + fmt(s, m)]);
    }
    if (f.spark) out.push(['spark', (f.spark > 0 ? '+' : '−') + Math.abs(f.spark)]);
    if (f.sin) {
      const factor = s ? R.sinFactor(s) : 1;
      out.push(['soul', '+' + R.round1(f.sin * factor) + ' 克']);
    }
    if (f.atone) {
      const grams = s ? R.round1(Math.min(s.soul, f.atone)) : R.round1(f.atone);
      out.push(['soul', '−' + grams + ' 克']);
    }
    if (f.card) {
      if (typeof f.card === 'string') {
        out.push(['card', (D.CARDS[f.card] && D.CARDS[f.card].name) || f.card]);
      } else if (typeof f.card === 'object') {
        out.push(['card', f.card.name + (f.card.star ? ' (★' + f.card.star + ')' : '')]);
      }
    }
    if (f.guilt && f.sin >= 1) out.push(['card', '愧疚：' + f.guilt]);
    if (f.obj && D.OBJ && D.OBJ[f.obj]) out.push(['card', '靈感物件：' + D.OBJ[f.obj].name]);
    if (f.form) {
      Object.keys(f.form).forEach((k) => {
        const fDef = D.FORMS && D.FORMS.find((x) => x.id === k);
        out.push(['note', '技法：' + (fDef ? fDef.name : k) + ' +' + f.form[k]]);
      });
    }
    if (f.friend) {
      Object.keys(f.friend).forEach((npcId) => {
        const nDef = D.NPCS && D.NPCS.find((x) => x.id === npcId);
        out.push(['note', (nDef ? nDef.name : npcId) + '熟絡 +' + f.friend[npcId]]);
      });
    }
    if (f.chance) out.push(['note', '機會 ' + (f.chance > 0 ? '+' : '−') + Math.abs(f.chance)]);
    if (f.target) {
      const pct = Math.round((f.target - 1) * 100);
      out.push(['note', '今晚目標 ' + (pct >= 0 ? '+' : '−') + Math.abs(pct) + '%']);
    }
    if (f.rent) {
      const pct = Math.round((f.rent - 1) * 100);
      out.push(['cr', '本輪租金 ' + (pct >= 0 ? '+' : '−') + Math.abs(pct) + '%']);
    }
    if (f.notice && D.STORY && D.STORY.species) {
      Object.keys(f.notice).forEach((sp) => {
        const spDef = D.STORY.species[sp];
        out.push(['note', (spDef ? spDef.name : sp) + '注意 +' + f.notice[sp]]);
      });
    }
    return out;
  }

  // 介面顯示用的選項效果標籤陣列（可傳 (s, option) 或 (option)；不改變狀態、不用隨機數）
  function fx(a, b) {
    const hasState = a && typeof a === 'object' && ('bg' in a || 'attr' in a || 'rngState' in a);
    const s = hasState ? a : null;
    const opt = hasState ? b : a;
    if (!opt) return [];
    const f = opt.fx && typeof opt.fx === 'object' ? opt.fx : opt;
    const r = s && IE.Rounds ? IE.Rounds.roundOf(s) : 1;
    const out = buildFxTags(s, f, r);
    if (opt.extreme && opt.later) {
      const after = opt.later.after || 1;
      const revTags = buildFxTags(s, opt.later.fx || {}, r + after).map((x) => x[1]).join('、');
      const head = (D.STORY && D.STORY.text && D.STORY.text.reversalHead) || '物極必反';
      out.push(['note', head + '（' + after + ' 輪後）' + (revTags ? '：' + revTags : '')]);
    }
    return out;
  }

  function applyStoryFx(s, f, rep, allowFlags) {
    if (!f) return;
    const st = ensure(s);
    if (f.cr) {
      const cr = money(s, f.cr);
      s.cr = Math.max(0, s.cr + cr);
      if (cr > 0 && s.stats) s.stats.crEarned = (s.stats.crEarned || 0) + cr;
      rep.delta('cr', cr);
    }
    if (f.spark) {
      rep.delta('spark', R.addSpark(s, f.spark, true));
    }
    if (f.card) {
      const cArg = typeof f.card === 'object' ? Object.assign({}, f.card, { tags: (f.card.tags || []).slice() }) : f.card;
      rep.gain(cArg);
    }
    if (f.obj) {
      R.gainObject(s, f.obj, rep);
    }
    if (f.sin) {
      R.sin(s, f.sin, rep, '這件事會一直壓在你心上', f.guilt, f.tag);
    }
    if (f.atone) {
      R.atone(s, f.atone, rep, '你覺得輕了一點');
    }
    if (f.form) {
      s.forms = s.forms || {};
      Object.keys(f.form).forEach((k) => {
        const add = f.form[k];
        if (!add) return;
        s.forms[k] = (s.forms[k] || 1) + add;
        const fDef = D.FORMS && D.FORMS.find((x) => x.id === k);
        if (fDef) rep.line('技法提升：「' + fDef.name + '」升到 Lv.' + s.forms[k], 'good');
      });
    }
    if (f.friend && Array.isArray(s.npcs)) {
      Object.keys(f.friend).forEach((npcId) => {
        const n = s.npcs.find((x) => x.id === npcId);
        if (n) n.friend = R.clamp((n.friend || 0) + f.friend[npcId], 0, 4);
      });
    }
    if (f.chance) {
      if (f.chance > 0) {
        s.chances = Math.min(3, (s.chances == null ? 3 : s.chances) + f.chance);
        rep.line('機會 +' + f.chance, 'good');
      } else if (f.chance < 0) {
        for (let k = 0; k < -f.chance; k++) {
          IE.Rounds.loseChance(s, 'story', rep);
        }
      }
    }
    if (f.target) {
      s.nightMod = { night: s.night, mult: f.target };
    }
    if (f.rent) {
      s.rentMod = { round: IE.Rounds.roundOf(s), mult: f.rent };
    }
    if (f.notice) {
      Object.keys(f.notice).forEach((sp) => {
        st.notice[sp] = (st.notice[sp] || 0) + f.notice[sp];
      });
    }
    if (allowFlags && f.set) {
      [].concat(f.set).forEach((fl) => {
        if (fl) st.flags[fl] = true;
      });
    }
  }

  function choose(s, i) {
    if (!s || !IE.Rounds || !IE.Rounds.on(s)) return null;
    const st = ensure(s);
    const line = D.STORY && D.STORY.lines && D.STORY.lines[s.bg];
    if (!line || !Array.isArray(line.chapters)) return null;
    if (!st.pending) chapter(s);
    const ch = st.pending ? line.chapters.find((c) => c.id === st.pending) : null;
    if (!ch || !Array.isArray(ch.options) || !ch.options.length) return null;
    const opt = ch.options[i] || ch.options[0];
    const idx = ch.options.indexOf(opt);
    const f = opt.fx || {};
    const label = say(s, opt.label, f);
    const lineText = say(s, opt.line, f);
    const rep = R.report(s, label);
    if (lineText) rep.line(lineText, '');

    applyStoryFx(s, f, rep, true);

    const r = IE.Rounds.roundOf(s);
    st.done.push(ch.id);
    st.log.push({ night: s.night, id: ch.id, i: idx });
    const baseSide = opt.side === 'survive' ? -1 : opt.side === 'peak' ? 1 : 0;
    st.side += opt.extreme ? baseSide * 2 : baseSide;
    if (opt.extreme && opt.later && opt.later.after) {
      st.later.push({ round: r + opt.later.after, id: ch.id, i: idx });
    }
    st.pending = null;
    return rep.done();
  }

  // ---------- 物極必反（reversals 唯讀、reverse 套用一次） ----------
  function reversals(s) {
    if (!s || !IE.Rounds || !IE.Rounds.on(s)) return [];
    const st = s.story;
    if (!st || !Array.isArray(st.later) || !st.later.length) return [];
    const dayInRound = ((s.night - 1) % 3) + 1;
    if (dayInRound !== 1) return [];
    const r = IE.Rounds.roundOf(s);
    const out = [];
    st.later.forEach((item) => {
      if (!item || item.round !== r) return;
      const ch = findChapterById(s, item.id);
      const opt = ch && Array.isArray(ch.options) ? ch.options[item.i] : null;
      const L = opt && opt.later;
      if (!L) return;
      out.push({
        id: item.id,
        i: item.i,
        text: say(s, L.text, L.fx),
        fx: L.fx || {},
      });
    });
    return out;
  }

  function reverse(s) {
    if (!s || !IE.Rounds || !IE.Rounds.on(s)) return null;
    const list = reversals(s);
    if (!list.length) return null;
    const st = ensure(s);
    const r = IE.Rounds.roundOf(s);
    const title = (D.STORY && D.STORY.text && D.STORY.text.reversalHead) || '物極必反';
    const rep = R.report(s, title);
    list.forEach((item) => {
      if (item.text) rep.line(item.text, 'bad');
      applyStoryFx(s, item.fx, rep, false);
    });
    st.later = st.later.filter((x) => !x || x.round !== r);
    return rep.done();
  }

  // ---------- 朋友線（每輪一位被外星人收藏） ----------
  function plan(s) {
    if (!s || !IE.Rounds || !IE.Rounds.on(s) || !D.STORY) return null;
    const st = ensure(s);
    const r = IE.Rounds.roundOf(s);
    if (Object.prototype.hasOwnProperty.call(st.plan, r)) return st.plan[r];
    if (r >= 5) {
      st.plan[r] = null;
      return null;
    }
    const species = D.STORY.collectOrder[r - 1];
    const inCity = R.aliveNpcs(s).filter((n) => !st.taken[n.id] && !st.hidden[n.id]);
    if (!inCity.length) {
      st.plan[r] = null;
      return null;
    }
    const primary = inCity.filter((n) => {
      const fDef = D.STORY.friends && D.STORY.friends[n.id];
      return fDef && Array.isArray(fDef.collectors) && fDef.collectors.includes(species);
    });
    const picked = R.pick(s, primary.length ? primary : inCity);
    const npc = picked.id;
    const fDef = (D.STORY.friends && D.STORY.friends[npc]) || {};
    const spDef = (D.STORY.species && D.STORY.species[species]) || {};
    const nDef = D.NPCS.find((x) => x.id === npc);
    const npcName = nDef ? nDef.name : npc;
    const why = (fDef.why && fDef.why[species]) || (spDef.why ? spDef.why.replace(/\{npc\}/g, npcName) : '');
    const fateText = (fDef.fate && fDef.fate[species]) || (spDef.fate ? spDef.fate.replace(/\{npc\}/g, npcName) : '');
    st.plan[r] = { npc, species, why, fate: fateText };
    return st.plan[r];
  }

  function hide(s, npc) {
    if (!s || !IE.Rounds || !IE.Rounds.on(s) || !D.STORY) return { ok: false, msg: '不在五輪模式' };
    const st = ensure(s);
    const r = IE.Rounds.roundOf(s);
    const pl = plan(s);
    if (!pl || pl.npc !== npc) return { ok: false, msg: '不是本輪預告的朋友' };
    if (st.hidden[npc] || st.taken[npc]) return { ok: false, msg: '已經不在浮城' };
    const rawCost = (D.ECON.hideCost && D.ECON.hideCost[r - 1]) || 80;
    const cost = Math.abs(money(s, -rawCost));
    if (s.cr < cost) {
      return { ok: false, msg: D.STORY.text.hideFail.replace('{cost}', fmt(s, cost)), cost };
    }
    s.cr -= cost;
    st.hidden[npc] = r;
    st.notice[pl.species] = (st.notice[pl.species] || 0) + 1;
    const fDef = D.STORY.friends && D.STORY.friends[npc];
    return { ok: true, msg: (fDef && fDef.hiddenLine) || '', cost };
  }

  function addRepLine(rep, text) {
    if (!rep || !text) return;
    if (typeof rep.line === 'function') rep.line(text, '');
    else if (Array.isArray(rep.lines)) rep.lines.push(text);
  }

  function collect(s, rep) {
    if (!s || !IE.Rounds || !IE.Rounds.on(s) || !D.STORY) return null;
    if ((s.chances != null && s.chances <= 0) || s.ended) return null;
    const st = ensure(s);
    const r = IE.Rounds.roundOf(s);
    if (r >= 5) return null;
    const pl = plan(s);
    if (!pl || !pl.npc) return null;
    const npc = pl.npc;
    const species = pl.species;
    const fDef = (D.STORY.friends && D.STORY.friends[npc]) || {};
    const met = st.met[npc] === r;

    if (st.hidden[npc] === r) {
      addRepLine(rep, fDef.hiddenLine);
      const res = { npc, species, met, hidden: true };
      if (rep) rep.collect = res;
      return res;
    }

    const nObj = Array.isArray(s.npcs) ? s.npcs.find((x) => x.id === npc) : null;
    if (nObj) nObj.alive = false;
    st.taken[npc] = { round: r, species, met };

    if (met) {
      if (fDef.gift && R.gainObject(s, fDef.gift, null)) {
        addRepLine(rep, fDef.farewell);
      } else if (fDef.farewell) {
        addRepLine(rep, fDef.farewell);
      }
    } else {
      if (fDef.note) {
        const noteCard = Object.assign({}, fDef.note, { tags: (fDef.note.tags || []).slice() });
        R.addCard(s, noteCard);
      }
      addRepLine(rep, fDef.nomeet);
    }

    if (pl.fate) {
      st.fates.push({ npc, species, night: s.night + 1, text: pl.fate });
    }
    const res = { npc, species, met, hidden: false };
    if (rep) rep.collect = res;
    return res;
  }

  // ---------- 阿星線、今日快訊、朋友近況、終局總結（唯讀，不改變狀態） ----------
  function astar(s) {
    if (!s || !D.STORY || !D.STORY.astarNights || !D.ASTAR) return null;
    const d = D.STORY.astarNights[s.night];
    return d ? D.ASTAR[d] || null : null;
  }

  function feed(s) {
    if (!s || !D.STORY || !Array.isArray(D.STORY.feed) || !D.STORY.feed.length) return '';
    if (s.morning && Array.isArray(s.morning.feed)) {
      const w = s.morning.feed.find((x) => x && x.kind === 'world' && x.text);
      if (w) return w.text;
    }
    const idx = ((s.night || 1) * 7 + Math.abs(s.seed || 0)) % D.STORY.feed.length;
    return D.STORY.feed[idx];
  }

  function fate(s) {
    if (!s || !s.story || !Array.isArray(s.story.fates)) return [];
    return s.story.fates.filter((f) => f && f.night === s.night);
  }

  function epilogue(s) {
    if (!s || !D.STORY) return null;
    const st = s.story || {};
    const flags = st.flags || {};
    const taken = st.taken || {};
    const hidden = st.hidden || {};
    const log = st.log || [];
    const sideVal = st.side || 0;

    const bgLine = D.STORY.lines && D.STORY.lines[s.bg];
    const epList = (bgLine && Array.isArray(bgLine.epilogue)) ? bgLine.epilogue : [];
    const matched = epList.find((e) => {
      if (Array.isArray(e.if) && !e.if.every((f) => !!flags[f])) return false;
      if (Array.isArray(e.unless) && e.unless.some((f) => !!flags[f])) return false;
      return true;
    });
    const line = matched ? say(s, matched.text) : '';

    const fStates = (D.STORY.text && D.STORY.text.friendStates) || {
      taken: '被{species}收藏',
      hidden: '藏起來了',
      stayed: '留在浮城',
    };
    const friends = (D.NPCS || []).map((n) => {
      if (taken[n.id]) {
        const spId = taken[n.id].species;
        const spName = (D.STORY.species && D.STORY.species[spId] && D.STORY.species[spId].name) || spId || '';
        return {
          npc: n.id,
          id: n.id,
          name: n.name,
          state: 'taken',
          species: spId,
          text: fStates.taken.replace('{species}', spName),
        };
      }
      if (hidden[n.id]) {
        return {
          npc: n.id,
          id: n.id,
          name: n.name,
          state: 'hidden',
          species: null,
          text: fStates.hidden,
        };
      }
      return {
        npc: n.id,
        id: n.id,
        name: n.name,
        state: 'stayed',
        species: null,
        text: fStates.stayed,
      };
    });

    let others = 0;
    log.forEach((entry) => {
      if (!entry) return;
      const ch = findChapterById(s, entry.id);
      const opt = ch && Array.isArray(ch.options) ? ch.options[entry.i] : null;
      if (opt && opt.side === 'others') others++;
    });

    const side = sideVal <= -2 ? 'survive' : sideVal >= 2 ? 'peak' : 'both';
    return { line, friends, side, others };
  }

  IE.Story = {
    init,
    plan,
    reversals,
    reverse,
    chapter,
    choose,
    fx,
    money,
    fmt,
    say,
    hide,
    collect,
    astar,
    feed,
    fate,
    epilogue,
  };
});
