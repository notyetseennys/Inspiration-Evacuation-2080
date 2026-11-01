// 《靈感撤離 2080》第十五期：故事線核心（角色線、朋友收藏線、阿星線、今日快訊与終局總結）。
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
    s.story = {
      done: [],      // 已回答的章 id
      pending: null, // 今天要回答、還沒回答的章 id（重載時仍在）
      flags: {},     // 故事旗標
      side: 0,       // 光譜：survive -1、peak +1、both 0
      notice: {},    // 外星種族對你的注意 { 種族 id: 次數 }
      log: [],       // [{ night, id, i }]
      plan: {},      // 收藏預告 { 輪: { npc, species, why, fate } } 或 null
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
    if (!s.story) return init(s);
    const st = s.story;
    st.done = st.done || [];
    if (st.pending === undefined) st.pending = null;
    st.flags = st.flags || {};
    st.side = st.side || 0;
    st.notice = st.notice || {};
    st.log = st.log || [];
    st.plan = st.plan || {};
    st.met = st.met || {};
    st.hidden = st.hidden || {};
    st.taken = st.taken || {};
    st.fates = st.fates || [];
    if (s.nightMod === undefined) s.nightMod = null;
    if (s.rentMod === undefined) s.rentMod = null;
    return st;
  }

  // ---------- 角色線（每輪一章，五章） ----------
  function chapter(s) {
    if (!s || !IE.Rounds || !IE.Rounds.on(s)) return null;
    const st = ensure(s);
    const line = D.STORY && D.STORY.lines && D.STORY.lines[s.bg];
    if (!line || !Array.isArray(line.chapters)) return null;
    const round = IE.Rounds.roundOf(s);
    const dayInRound = ((s.night - 1) % 3) + 1;

    if (st.pending) {
      const cur = line.chapters.find((c) => c.id === st.pending);
      if (cur && !st.done.includes(cur.id) && cur.round === round && (cur.day || 1) === dayInRound) {
        return cur;
      }
      st.pending = null;
    }

    const found = line.chapters.find((c) => {
      if (c.round !== round) return false;
      if ((c.day || 1) !== dayInRound) return false;
      if (st.done.includes(c.id)) return false;
      if (Array.isArray(c.if) && !c.if.every((f) => !!st.flags[f])) return false;
      if (Array.isArray(c.unless) && c.unless.some((f) => !!st.flags[f])) return false;
      return true;
    });

    if (!found) return null;
    st.pending = found.id;
    return found;
  }

  // 介面顯示用的選項效果標籤陣列（可傳 (s, option) 或 (option)）
  function fx(a, b) {
    const hasState = a && typeof a === 'object' && ('bg' in a || 'attr' in a || 'rngState' in a);
    const s = hasState ? a : null;
    const opt = hasState ? b : a;
    if (!opt) return [];
    const f = opt.fx && typeof opt.fx === 'object' ? opt.fx : opt;
    const out = [];
    if (f.cr) out.push(['cr', (f.cr > 0 ? '+$' : '−$') + Math.abs(f.cr)]);
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

  function choose(s, i) {
    if (!s || !IE.Rounds || !IE.Rounds.on(s)) return null;
    const st = ensure(s);
    const line = D.STORY && D.STORY.lines && D.STORY.lines[s.bg];
    if (!line || !Array.isArray(line.chapters)) return null;
    const ch = (st.pending && line.chapters.find((c) => c.id === st.pending)) || chapter(s);
    if (!ch || !Array.isArray(ch.options) || !ch.options.length) return null;
    const opt = ch.options[i] || ch.options[0];
    const idx = ch.options.indexOf(opt);
    const f = opt.fx || {};
    const rep = R.report(s, opt.label);
    if (opt.line) rep.line(opt.line, '');

    if (f.cr) {
      s.cr = Math.max(0, s.cr + f.cr);
      if (f.cr > 0 && s.stats) s.stats.crEarned = (s.stats.crEarned || 0) + f.cr;
      rep.delta('cr', f.cr);
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
    if (f.set) {
      [].concat(f.set).forEach((fl) => {
        if (fl) st.flags[fl] = true;
      });
    }

    st.done.push(ch.id);
    st.log.push({ night: s.night, id: ch.id, i: idx });
    st.side += opt.side === 'survive' ? -1 : opt.side === 'peak' ? 1 : 0;
    st.pending = null;
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
    const cost = (D.ECON.hideCost && D.ECON.hideCost[r - 1]) || 90;
    if (s.cr < cost) {
      return { ok: false, msg: D.STORY.text.hideFail.replace('{cost}', String(cost)) };
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

  // ---------- 阿星線、今日快訊、朋友近況、終局總結 ----------
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
    if (!s) return [];
    const st = ensure(s);
    return st.fates.filter((f) => f.night === s.night);
  }

  function epilogue(s) {
    if (!s || !D.STORY) return null;
    const st = ensure(s);
    const bgLine = D.STORY.lines && D.STORY.lines[s.bg];
    const epList = (bgLine && Array.isArray(bgLine.epilogue)) ? bgLine.epilogue : [];
    const matched = epList.find((e) => !Array.isArray(e.if) || e.if.every((f) => !!st.flags[f]));
    const line = matched ? matched.text : '';

    const fStates = (D.STORY.text && D.STORY.text.friendStates) || {
      taken: '被{species}收藏',
      hidden: '藏起來了',
      stayed: '留在浮城',
    };
    const friends = (D.NPCS || []).map((n) => {
      if (st.taken[n.id]) {
        const spId = st.taken[n.id].species;
        const spName = (D.STORY.species && D.STORY.species[spId] && D.STORY.species[spId].name) || spId || '';
        return { id: n.id, name: n.name, state: 'taken', text: fStates.taken.replace('{species}', spName) };
      }
      if (st.hidden[n.id]) {
        return { id: n.id, name: n.name, state: 'hidden', text: fStates.hidden };
      }
      return { id: n.id, name: n.name, state: 'stayed', text: fStates.stayed };
    });

    const side = st.side <= -2 ? 'survive' : st.side >= 2 ? 'peak' : 'both';
    return { line, friends, side };
  }

  IE.Story = {
    init,
    plan,
    chapter,
    choose,
    fx,
    hide,
    collect,
    astar,
    feed,
    fate,
    epilogue,
  };
});
