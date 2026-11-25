// 《靈感撤離 2080》第十五期：五輪模式的狀態機、時間表與白天生活卡核心。
// 純邏輯，不涉及 DOM，瀏覽器與 Node（tools/sim.js）共用。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA, R = IE.Rules;

  // 是否為五輪模式
  function on(s) {
    return !!(s && D.MODES[s.mode] && D.MODES[s.mode].rounds);
  }

  // 介面顯示用的貨幣換算倍數（總規格 §6、ECONOMY.md §3）
  function rate(s) {
    if (!on(s)) return 1;
    const id = (s && s.city) || (D && D.CITY_DEFAULT) || 'zone7';
    const c = D && D.CITIES && D.CITIES[id];
    return (c && c.currency && c.currency.rate) || 1;
  }

  function comma(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function cash(s, v) {
    const n = Math.round(Math.abs(v || 0) * rate(s));
    return (v < 0 ? '−$' : '$') + comma(n);
  }

  function cashText(s, str) {
    if (typeof str !== 'string' || !str) return str;
    const r = rate(s);
    if (r === 1) return str;
    return str.replace(
      // 數字只接受 1,234 這種千位寫法；金額後面的半形逗號（例如「$84, $20」）保留原樣（WO-15-14 審核修正）
      /(?:([+\-−]?)\$([ \t]*)|\$([ \t]*[+\-−][ \t]*))(\d{1,3}(?:,\d{3})+(?!\d)|\d+)/g,
      (m, pre, sp, post, digits) => {
        const n = Number(digits.replace(/,/g, ''));
        if (!Number.isFinite(n)) return m;
        const v = comma(Math.round(n * r));
        return post != null ? '$' + post + v : (pre || '') + '$' + (sp || '') + v;
      },
    );
  }

  // 第十七期：這一局有幾輪（章節決定；沒有章節是五輪）
  const total = (s) => (s && s.roundsTotal) || 5;
  const nightsTotal = (s) => total(s) * 3;
  const sv = (s, k) => (s && s.salvage && s.salvage[k]) || 0;
  const feat = (s, k) => !IE.Chapters || IE.Chapters.feat(s, k);
  // 第幾輪（1..total）
  function roundOf(s, night) {
    const n = night == null ? s.night : night;
    return R.clamp(Math.ceil(n / 3), 1, total(s));
  }
  // 「第 2 輪・第 4／15 晚」：章節較短時把 15 換成這一局的晚數
  function dayTitle(s, round, night) {
    const t = D.ROUND_TEXT.dayTitle.replace('{round}', round).replace('{night}', night);
    return nightsTotal(s) === 15 ? t : t.replace('／15', '／' + nightsTotal(s));
  }

  // 這一晚的關卡種類：小展／聯展／外星評審
  function kindOf(night) {
    return ['small', 'big', 'boss'][(night - 1) % 3];
  }

  // 對應標準模式的關卡之夜，讓季節、進度日、評審規則與 KPI 全部沿用現有邏輯
  function dayOfNight(night) {
    return 4 * night;
  }

  // 把正整數四捨五入到三位有效數字
  function sig3(v) {
    if (!v || v <= 0) return 0;
    const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(v)) - 2));
    return Math.round(v / p) * p;
  }

  // 第 k 晚的目標分數
  function target(s, night) {
    const k = night == null ? s.night : night;
    const stMod = IE.Meta && IE.Meta.stakeMod ? IE.Meta.stakeMod(s, 'stageTarget') : 1;
    const ease = s && s.firstRun && k <= 2 ? D.ECON.firstRunEase : 1;
    const nMod = s && s.nightMod && s.nightMod.night === k ? s.nightMod.mult : 1;
    // 第十七期第一輪校準：兩段式曲線（前 lateFrom 晚 ×growth，之後 ×growthLate）；章節再乘它的難度
    const E = D.ECON, lf = E.lateFrom || 99;
    const curve = Math.pow(E.growth, Math.min(k, lf) - 1) * Math.pow(E.growthLate || E.growth, Math.max(0, k - lf));
    const ch = IE.Chapters ? IE.Chapters.of(s) : null;
    return sig3(E.t1 * curve * stMod * ease * nMod * ((ch && ch.target) || 1));
  }

  // 第 r 輪結束時的租金
  function rentOf(s, round) {
    const r = round == null ? roundOf(s) : round;
    const base = D.ECON.rent[R.clamp(r - 1, 0, D.ECON.rent.length - 1)];
    const stMod = IE.Meta && IE.Meta.stakeMod ? IE.Meta.stakeMod(s, 'rent') : 1;
    const wMod = (s && R.worldMods(s).rentMult) || 1;
    const pMod = (s && D.BACKGROUNDS[s.bg] && D.BACKGROUNDS[s.bg].perk && D.BACKGROUNDS[s.bg].perk.rentMult) || 1;
    const rMod = s && s.rentMod && s.rentMod.round === r ? s.rentMod.mult : 1;
    return Math.round(base * stMod * wMod * pMod * rMod);
  }

  // ---------- 白天：差事與生活卡 ----------
  function allDayDefs() {
    return D.DAYCARDS16 ? D.DAYCARDS.concat(D.DAYCARDS16) : D.DAYCARDS;
  }

  function ensureGigs(s) {
    if (!s || !on(s)) return [];
    if (!Array.isArray(s.gigs)) s.gigs = [];
    return s.gigs;
  }

  function isGigExpired(s, g) {
    const keep = (D.ECON16 && D.ECON16.gigKeep) || 3;
    return !g || ((s.night || 1) - (g.night || 1)) >= keep;
  }

  function addGig(s, c) {
    if (!s || !on(s) || !c || !c.micro) return { ok: false };
    const gigs = ensureGigs(s);
    const max = (D.ECON16 && D.ECON16.gigMax) || 2;
    if (gigs.length >= max) return { ok: false };
    const gig = {
      micro: c.micro,
      from: c.from || 'round',
      night: c.night != null ? c.night : (s.night || 1),
    };
    if (c.x != null) gig.x = c.x;
    gigs.push(gig);
    return { ok: true, gig };
  }

  function useGig(s, micro) {
    if (!s || !on(s) || !micro) return null;
    const gigs = ensureGigs(s);
    const idx = gigs.findIndex((g) => g && g.micro === micro);
    if (idx < 0) return null;
    const used = gigs.splice(idx, 1)[0];
    s.gigActive = micro;
    if (s.offer && s.offer.gig === used) s.offer.gig = null;
    return used;
  }

  function expireGigs(s) {
    if (!s || !on(s)) return [];
    const gigs = ensureGigs(s);
    const expired = Array.isArray(s.pendingExpiredGigs) ? s.pendingExpiredGigs.slice() : [];
    if (s.pendingExpiredGigs) s.pendingExpiredGigs = [];
    const kept = [];
    gigs.forEach((g) => {
      if (isGigExpired(s, g)) expired.push(g);
      else kept.push(g);
    });
    s.gigs = kept;
    return expired;
  }

  function grantRoundGig(s) {
    if (!s || !on(s)) return null;
    ensureGigs(s);
    if ((s.night - 1) % 3 !== 0) return null;
    const workPool = D.DAYCARDS
      .filter((c) => c.kind === 'work' && !(s.removed && s.removed[c.id]) && !R.worldClosed(s, c.id))
      .map((c) => c.id);
    if (!workPool.length) return null;
    return addGig(s, { micro: R.pick(s, workPool), from: 'round' });
  }

  function normalizeForms(s, rep) {
    if (!s || !on(s)) return;
    s.forms = s.forms || {};
    if (D.DESK && D.DESK.formMap) {
      const fmap = D.DESK.formMap;
      Object.keys(s.forms).forEach((k) => {
        const nk = fmap[k];
        if (!nk || nk === k) return;
        const add = (s.forms[k] || 1) - 1;
        if (add > 0) s.forms[nk] = (s.forms[nk] || 1) + add;
        delete s.forms[k];
      });
      if (IE.Desk && Array.isArray(IE.Desk.RANK)) {
        IE.Desk.RANK.forEach((id) => { if (!s.forms[id]) s.forms[id] = 1; });
      }
      if (rep && Array.isArray(rep.lines) && D.DESK_FORM) {
        rep.lines.forEach((ln) => {
          if (!ln || typeof ln.text !== 'string' || !ln.text.startsWith('技法提升：「')) return;
          D.FORMS.forEach((f) => {
            const nk = fmap[f.id];
            const df = nk && D.DESK_FORM[nk];
            if (df && ln.text.includes('「' + f.name + '」')) {
              ln.text = '技法提升：「' + df.name + '」Lv.' + (s.forms[nk] || 1);
            }
          });
        });
      }
    }
  }

  function initGigs(s) {
    if (!s || !on(s)) return;
    if (IE.Flood && IE.Flood.ensure) IE.Flood.ensure(s);
    normalizeForms(s);
    s.gigs = [];
    s.pendingExpiredGigs = [];
    grantRoundGig(s);
    if (!s.deskInit && Array.isArray(D.DESK_IDS) && D.DESK_IDS.length && Array.isArray(s.cards)) {
      s.deskInit = true;
      const starterSet = new Set(D.STARTER || []);
      let count = 0;
      s.cards = s.cards.filter((c) => {
        if (c && c.from && c.from.kind === 'start' && starterSet.has(c.id)) {
          count += 1;
          return false;
        }
        return true;
      });
      if (count > 0) {
        const pool = (D.STARTER || []).concat(D.DESK_IDS);
        for (let i = 0; i < count && pool.length; i++) {
          const id = R.pick(s, pool);
          pool.splice(pool.indexOf(id), 1);
          R.addCard(s, id, { kind: 'start', night: 0 });
        }
      }
    }
  }

  function cardDef(id) {
    const defs = allDayDefs();
    if (id.startsWith('friend:')) return defs.find((c) => c.id === 'friend');
    if (id.startsWith('trip:')) return defs.find((c) => c.id === 'trip');
    return defs.find((c) => c.id === id);
  }

  // 這一晚可以出現的全部卡 id（已展開 friend:<npc>、trip:<origin>）
  function cardList(s) {
    const out = [];
    const r = roundOf(s);
    allDayDefs().forEach((c) => {
      if (c.id === 'friend') {
        R.aliveNpcs(s).forEach((n) => out.push('friend:' + n.id));
      } else if (c.id === 'trip') {
        if (r >= (c.minRound || 2)) (c.origins || []).forEach((o) => out.push('trip:' + o));
      } else if (!(s.removed && s.removed[c.id]) && !R.worldClosed(s, c.id)) {
        out.push(c.id);
      }
    });
    return out;
  }

  function drawOffer(s) {
    const all = cardList(s);
    const kOf = (id) => { const d = cardDef(id); return d ? d.kind : ''; };
    const hasMicro = (id) => { const d = cardDef(id); return !!(d && d.micro); };
    const gigs = ensureGigs(s).filter((g) => g && g.micro && !isGigExpired(s, g) && all.includes(g.micro));
    const pl = (s.night - 1) % 3 === 1 && IE.Story && IE.Story.plan ? IE.Story.plan(s) : null;
    const st = s && s.story;
    const plannedFriend = pl && pl.npc && R.aliveNpcs(s).some((n) => n.id === pl.npc) && !(st && st.taken && st.taken[pl.npc]) && !(st && st.hidden && st.hidden[pl.npc])
      ? 'friend:' + pl.npc
      : null;
    const nonMicro = (used) => all.filter((id) => !id.startsWith('trip:') && !hasMicro(id) && !used.includes(id));

    const firstGig = gigs.length ? gigs[0] : null;
    const p1 = all.filter((id) => {
      const k = kOf(id);
      return (k === 'friend' || k === 'volunteer' || k === 'rest') && id !== plannedFriend;
    });
    const c1 = firstGig
      ? firstGig.micro
      : R.pick(s, p1.length ? p1 : nonMicro([]));

    const p2 = all.filter((id) => {
      if (id === c1) return false;
      const k = kOf(id);
      if (k === 'friend') return true;
      if (k === 'life') return !hasMicro(id) || gigs.some((g) => g.micro === id);
      return false;
    });
    const c2 = (plannedFriend && plannedFriend !== c1)
      ? plannedFriend
      : R.pick(s, p2.length ? p2 : nonMicro([c1]));

    const tripDef = D.DAYCARDS.find((c) => c.id === 'trip');
    const trips = feat(s, 'trip') ? all.filter((id) => id.startsWith('trip:')) : [];
    const restPool = nonMicro([c1, c2]);
    const c3 = trips.length && (R.rand(s) < (tripDef ? tripDef.chance : 0.15) || !restPool.length)
      ? R.pick(s, trips)
      : R.pick(s, restPool);

    return { ids: [c1, c2, c3].filter(Boolean), gig: firstGig };
  }

  // 回傳 s.offer；這一晚還沒有就按總規格 §3.1 的出牌規則產生
  function offer(s) {
    if (IE.Flood && IE.Flood.ensure) IE.Flood.ensure(s);
    ensureGigs(s);
    if (s.offer && s.offer.night === s.night && Array.isArray(s.offer.ids) && s.offer.ids.length) return s.offer;
    const drawn = drawOffer(s);
    s.offer = { night: s.night, ids: drawn.ids, gig: drawn.gig, rerolls: 0, chosen: null };
    return s.offer;
  }

  // 換一批的價錢
  function offerCost(s) {
    const of = offer(s);
    const r = (of && of.rerolls) || 0;
    const arr = D.ECON.offerReroll;
    const base = arr[R.clamp(r, 0, arr.length - 1)];
    const stMod = IE.Meta && IE.Meta.stakeMod ? IE.Meta.stakeMod(s, 'prices') : 1;
    if (sv(s, 'freeReroll') && s.freeRerollRound !== roundOf(s)) return 0;
    return Math.round(base * stMod * (1 - sv(s, 'rerollDisc')));
  }

  // 換一批生活卡
  function rerollOffer(s) {
    const of = offer(s);
    const cost = offerCost(s);
    if (s.cr < cost) return { ok: false, msg: '換一批要 $' + cost };
    s.cr -= cost;
    if (cost === 0 && sv(s, 'freeReroll')) s.freeRerollRound = roundOf(s);
    of.rerolls = (of.rerolls || 0) + 1;
    const drawn = drawOffer(s);
    of.ids = drawn.ids;
    of.gig = drawn.gig;
    of.chosen = null;
    return { ok: true };
  }

  // 介面顯示用的卡片資訊
  function cardInfo(s, id) {
    if (id.startsWith('friend:')) {
      const npcId = id.slice(7);
      const npc = D.NPCS.find((n) => n.id === npcId);
      const fid = (D.DESK_REMAP && D.DESK_REMAP.teach && D.DESK_REMAP.teach[npcId]) || D.TEACH[npcId];
      const form = (D.DESK_FORM && D.DESK_FORM[fid]) || D.FORMS.find((f) => f.id === fid);
      const cost = R.chatCost(s);
      const reason = s.cr < cost ? '沒錢請人喝東西' : null;
      return {
        id,
        kind: 'friend',
        kindName: D.ROUND_TEXT.kinds.friend,
        name: '找' + (npc ? npc.name : npcId) + '聊天',
        sub: form ? '聊聊近況，練習「' + form.name + '」的' + (D.DESK_FORM ? '結構' : '配色') : '和朋友聊聊近況',
        micro: null,
        gig: null,
        fx: [['cr', cost ? '−$' + cost : '免費'], ['spark', '+0.4 起'], ['card', '人情'], ['note', '技法：' + (form ? form.name : '') + ' +1']],
        danger: 0,
        enabled: !reason,
        reason,
      };
    }
    if (id.startsWith('trip:')) {
      const origin = id.slice(5);
      const reg = (D.REGIONS && D.REGIONS[origin]) || origin;
      const stMod = IE.Meta && IE.Meta.stakeMod ? IE.Meta.stakeMod(s, 'prices') : 1;
      const cost = Math.round(D.ECON.tripCost * stMod);
      const reason = s.cr < cost ? '旅費不足（需要 $' + cost + '）' : null;
      return {
        id,
        kind: 'trip',
        kindName: D.ROUND_TEXT.kinds.trip,
        name: '出國：' + reg,
        sub: '飛往' + reg + '：機票、氣候附加費和邊境保證金。從五張當地素材中帶回兩張',
        micro: null,
        gig: null,
        fx: [['cr', '−$' + cost], ['spark', '+' + D.ECON.tripSpark], ['card', reg + '素材 五選二（★' + D.ECON.tripStar + '）']],
        danger: 0,
        enabled: !reason,
        reason,
      };
    }
    if (id === 'rest') {
      const rDef = cardDef('rest') || { id: 'rest', kind: 'rest', name: '在家發呆', sub: '甚麼都不做。這在浮城是一種奢侈。' };
      return {
        id: 'rest',
        kind: 'rest',
        kindName: (D.ROUND_TEXT.kinds && D.ROUND_TEXT.kinds.rest) || '休息',
        name: rDef.name || '在家發呆',
        sub: rDef.sub || '甚麼都不做。這在浮城是一種奢侈。',
        micro: null,
        gig: null,
        fx: [['spark', '+' + ((D.ECON16 && D.ECON16.restSpark) || 0.2)]],
        danger: 0,
        enabled: true,
        reason: null,
      };
    }
    const def = cardDef(id) || { id, kind: 'work' };
    const oldSlot = s.slot;
    s.slot = 0;
    const act = R.actions(s).find((a) => a.id === id);
    s.slot = oldSlot;
    const KEEP = ['cr', 'spark', 'soul', 'card'];
    const fx = act ? act.fx.filter(([k]) => KEEP.includes(k)).map((x) => x.slice()) : [];
    const danger = D.OUTDOOR && D.OUTDOOR.includes(id) ? R.outdoorRisk(s) : 0;
    if (danger > 0) fx.push(['danger', '致命 ' + Math.round(danger * 1000) / 10 + '%']);
    const reason = s.removed && s.removed[id]
      ? (id === 'smile' ? '已被 AI 情緒伴侶 2.0 取代' : '職位已被 AI 取代')
      : R.worldClosed(s, id) || null;
    const of = s && s.offer && s.offer.night === s.night ? s.offer : null;
    const gig = def.micro
      ? ((of && Array.isArray(of.ids) && of.ids[0] === id && of.gig)
        || (s && Array.isArray(s.gigs) ? s.gigs.find((g) => g && g.micro === def.micro && !isGigExpired(s, g)) : null)
        || null)
      : null;
    return {
      id,
      kind: def.kind,
      kindName: D.ROUND_TEXT.kinds[def.kind],
      name: act ? act.name : id,
      sub: act ? act.sub : '',
      micro: def.micro || null,
      gig,
      fx,
      danger,
      enabled: !reason,
      reason,
    };
  }

  function hasFloodPick(s) {
    return !!(IE.Flood && s && Array.isArray(s.floodPick) && s.floodPick.length > 0);
  }

  // 白天完結：進入創作之夜，若在致命危險中喪生則進入結局；超過素材庫上限或尚未處理淹水帶走時留在白天
  function afterDay(s) {
    if (!s || s.phase !== 'day') return { ok: false };
    if (s.body <= 0) {
      s.ended = R.endingFor(s, 'death');
      s.phase = 'ended';
      return { ok: true };
    }
    if (hasFloodPick(s)) return { ok: false, msg: (D.FLOOD_TEXT && D.FLOOD_TEXT.mediumHead) || '水要帶走一樣東西' };
    if (s.over) return { ok: false, msg: D.CARD_TEXT.overHead };
    s.phase = 'night';
    return { ok: true };
  }

  // 睡懶覺：不選卡，恢復火花並進入晚上
  function skipDay(s) {
    if (!s || s.phase !== 'day') return null;
    if (hasFloodPick(s)) {
      if (s._floodSkipWarn === s.night && IE.Flood && IE.Flood.autoPick) {
        delete s._floodSkipWarn;
        IE.Flood.autoPick(s);
      } else {
        Object.defineProperty(s, '_floodSkipWarn', { value: s.night, writable: true, configurable: true });
        return null;
      }
    }
    if (s.over && s.offer && s.offer.chosen && IE.Cards) {
      IE.Cards.autoPutDown(s);
      afterDay(s);
      return null;
    }
    const rep = R.report(s, '睡懶覺');
    const sp = R.addSpark(s, D.ECON.skipSpark + sv(s, 'skipSpark'), true);
    rep.line('今天甚麼都不做，睡了一整天', 'good', sp, 'spark');
    afterDay(s);
    return rep.done();
  }

  // 選一張生活卡
  function choose(s, id, reply) {
    if (!s || s.phase !== 'day') return null;
    if (hasFloodPick(s)) {
      if (s._floodChooseWarn === s.night && IE.Flood && IE.Flood.autoPick) {
        delete s._floodChooseWarn;
        IE.Flood.autoPick(s);
      } else {
        Object.defineProperty(s, '_floodChooseWarn', { value: s.night, writable: true, configurable: true });
        return null;
      }
    }
    const of = offer(s);
    if (of && of.chosen && s.over && IE.Cards) {
      IE.Cards.autoPutDown(s);
      afterDay(s);
      return null;
    }
    if (!of || !of.ids.includes(id)) return null;
    const info = cardInfo(s, id);
    if (!info.enabled) return null;
    if (info.micro) {
      of.chosen = id;
      useGig(s, info.micro);
      return { micro: info.micro };
    }
    if (id.startsWith('friend:')) {
      of.chosen = id;
      const npcId = id.slice(7);
      const r = roundOf(s);
      const pl = IE.Story && IE.Story.plan ? IE.Story.plan(s) : (s.story && s.story.plan && s.story.plan[r]);
      if (pl && pl.npc === npcId && s.story) {
        s.story.met[npcId] = r;
      }
      const fid = (D.DESK_REMAP && D.DESK_REMAP.teach && D.DESK_REMAP.teach[npcId]) || D.TEACH[npcId];
      const lv0 = IE.Create && IE.Create.level ? IE.Create.level(s, fid) : ((s.forms && s.forms[fid]) || 1);
      const rep = R.applyChat(s, npcId, reply);
      normalizeForms(s, rep);
      const lv1 = IE.Create && IE.Create.level ? IE.Create.level(s, fid) : ((s.forms && s.forms[fid]) || 1);
      if (lv1 === lv0) {
        R.teach(s, npcId, 1, { line: (text, kind) => rep.lines.push({ text, kind: kind || '' }) });
        normalizeForms(s, rep);
      }
      const npc = D.NPCS.find((n) => n.id === npcId);
      const friendMicro = D.GIG_FRIEND && D.GIG_FRIEND[npcId];
      if (friendMicro && D.ECON16 && R.rand(s) < D.ECON16.friendGig) {
        addGig(s, { micro: friendMicro, from: 'friend', x: npc ? npc.name : npcId });
      }
      afterDay(s);
      return rep;
    }
    if (id === 'volunteer') {
      of.chosen = id;
      const rep = R.applyVolunteer(s);
      normalizeForms(s, rep);
      afterDay(s);
      return rep;
    }
    if (id === 'rest') {
      of.chosen = id;
      const rep = R.report(s, '在家發呆');
      const sp = R.addSpark(s, (D.ECON16 && D.ECON16.restSpark) || 0.2, true);
      rep.line('甚麼都不做。這在浮城是一種奢侈。', 'good', sp, 'spark');
      afterDay(s);
      return rep.done();
    }
    if (id.startsWith('trip:')) {
      const origin = id.slice(5);
      const reg = (D.REGIONS && D.REGIONS[origin]) || origin;
      const stMod = IE.Meta && IE.Meta.stakeMod ? IE.Meta.stakeMod(s, 'prices') : 1;
      const cost = Math.round(D.ECON.tripCost * stMod);
      of.chosen = id;
      // 出國的報告跟着 s.trip5 存檔：選到一半重新載入，報告仍然完整
      const rep = R.report(s, info.name);
      s.cr -= cost;
      rep.delta('cr', -cost);
      rep.line('飛往' + reg + '，看見浮城以外的世界', 'good', R.addSpark(s, D.ECON.tripSpark, true), 'spark');
      s.visited[origin] = (s.visited[origin] || 0) + 1;
      s.stats.trips = (s.stats.trips || 0) + 1;
      const pool = Object.keys(D.CARDS).filter((k) => D.CARDS[k].origin === origin && D.CARDS[k].rarity !== 'legend');
      const ids = [];
      while (ids.length < 5 && pool.length) {
        const k = R.pick(s, pool);
        pool.splice(pool.indexOf(k), 1);
        ids.push(k);
      }
      s.trip5 = { origin, ids, picked: [], rep: rep.done() };
      return { trip: true };
    }
    return null;
  }

  // 出國五選二：每選一張呼叫一次，選滿兩張後清除 s.trip5 並呼叫 afterDay(s)；
  // 選滿的那一次，回傳值多一個 rep（整個出國的報告：旅費、火花和帶回的素材）
  function tripPick(s, idx) {
    if (!s || !s.trip5 || !Array.isArray(s.trip5.ids)) return null;
    const t5 = s.trip5;
    t5.picked = t5.picked || [];
    // 無效或已選過的卡：甚麼都不做（不要靜靜地改選另一張，否則介面的錯誤會被掩蓋）
    const i = typeof idx === 'string' ? t5.ids.indexOf(idx) : idx;
    if (!Number.isInteger(i) || i < 0 || i >= t5.ids.length || t5.picked.includes(i)) return null;
    t5.picked.push(i);
    const reg = (D.REGIONS && D.REGIONS[t5.origin]) || t5.origin;
    const res = R.addCard(s, t5.ids[i], { kind: 'trip', x: reg });
    res.card.star = D.ECON.tripStar;
    if (t5.rep) {
      t5.rep.cards.push(res.card);
      if (res.dropped) t5.rep.dropped.push(res.dropped);
    }
    if (t5.picked.length >= D.ECON.tripPick) {
      s.trip5 = null;
      afterDay(s);
      res.rep = t5.rep || null;
    }
    return res;
  }

  // ---------- 夜晚：創作桌、獎金與機會 ----------
  // 總規格 §6 的獎金公式（不乘外星評級的價錢修正）
  function nightReward(s, kind, playsLeft) {
    const k = kind || kindOf(s ? s.night : 1);
    const base = D.ECON.nightPay[k] || 0;
    const r = roundOf(s);
    const pl = Math.max(0, playsLeft || 0);
    return Math.round(base * (1 + D.ECON.payGrowth * (r - 1))) + D.ECON.earlyBonus * pl;
  }

  // 這一晚是否已達標
  function cleared(s) {
    if (!s || !s.session || !s.session.stage || !IE.Stages) return false;
    return !!(s.session.passed || IE.Stages.stageScore(s.session) >= s.session.stage.target);
  }

  // 這一晚是否可以收工（四筆用完，或手牌與牌庫都沒有可下的素材）
  function canFinish(s) {
    if (!s || !s.session) return false;
    const ses = s.session;
    if (ses.plays <= 0) return true;
    if (!IE.Create) return true;
    const playable = (u) => {
      const c = s.cards.find((x) => x.uid === u);
      return !!(c && !IE.Create.forbidden(s, c));
    };
    if (ses.hand.some(playable)) return false;
    const canDiscard = ses.discards > 0 && ses.hand.length > 0 && !((D.BACKGROUNDS[s.bg].perk || {}).noEarlyDiscard && !ses.log.length);
    if (canDiscard && (ses.deck.some(playable) || ses.used.some(playable))) return false;
    return true;
  }

  // 失去一次機會；機會用完即進入結局
  function loseChance(s, cause, rep) {
    if (!s || !on(s)) return;
    if (sv(s, 'saveChance') && !s.chanceSaved) {
      s.chanceSaved = cause;
      if (rep && rep.line && D.SALVAGE_TEXT) rep.line(D.SALVAGE_TEXT.saved, 'good');
      return;
    }
    s.chances = Math.max(0, (s.chances == null ? 3 : s.chances) - 1);
    s.lost = s.lost || [];
    s.lost.push(cause);
    if (rep && rep.line) {
      const msg = cause === 'rent' ? D.ROUND_TEXT.rentFail.replace('{rent}', String(rentOf(s)))
        : cause === 'soul' ? D.ROUND_TEXT.soulFail.replace('{soul}', (s.soul || 0).toFixed(1))
        : cause === 'story' ? '失去一次機會。'
        : D.ROUND_TEXT.failed;
      rep.line(msg, 'bad');
    }
    if (s.chances <= 0) {
      s.ended = R.endingFor(s, cause === 'soul' ? 'heavy' : 'archived');
      s.phase = 'ended';
    }
  }

  // 開始夜晚創作（s.phase 必須是 'night'，否則回傳 null）
  function startNight(s) {
    if (!s || !on(s) || s.phase !== 'night' || hasFloodPick(s)) return null;
    normalizeForms(s);
    return IE.Create.start(s, 'normal');
  }

  // ---------- 市集：物件、素材包、服務、技法課、工具卡、遺物 ----------
  function priceMod(s) {
    return IE.Meta && IE.Meta.stakeMod ? IE.Meta.stakeMod(s, 'prices') : 1;
  }

  function shopOpen(s) {
    if (!s || !on(s) || s.phase !== 'shop') return null;
    normalizeForms(s);
    if (s.shop && s.shop.night === s.night) return s.shop;
    const objs = R.pickObjects(s, 2);
    // 第一局第 1 晚保證至少一件稀有物件
    if (s.firstRun && s.night === 1 && !objs.some((id) => D.OBJ[id] && D.OBJ[id].rarity === 'rare')) {
      const owns = (id) => s.objects.includes(id) || s.objStash.includes(id) || objs.includes(id);
      const avail = (o) => !o.unlock || (s.unlocked && s.unlocked.includes(o.id));
      const rares = D.OBJECTS.filter((o) => o.rarity === 'rare' && !o.npc && !o.start && !o.souvenir && avail(o) && !owns(o.id)).map((o) => o.id);
      if (rares.length) {
        const rId = R.pick(s, rares);
        if (objs.length >= 2) objs[1] = rId;
        else objs.push(rId);
      }
    }
    const packPool = D.PACKS.map((p) => p.id);
    const packs = [];
    while (packs.length < 2 && packPool.length) {
      const pid = R.pick(s, packPool);
      packPool.splice(packPool.indexOf(pid), 1);
      packs.push(pid);
    }
    const service = ['polish', 'burn', 'copy'][s.night % 3];
    const techPool = IE.Desk ? IE.Desk.RANK.slice(1) : ['adj', 'triad', 'split', 'comp', 'tetrad', 'full', 'mono'];
    if (!IE.Desk && s.formsSeen && s.formsSeen.paradox) techPool.push('paradox');
    const tech = R.pick(s, techPool);
    const hasToolSpace = IE.Stages && (s.tools || []).length < IE.Stages.toolSlots(s);
    const tool = hasToolSpace ? IE.Stages.randomTool(s) : null;
    const relic = s.night % 3 === 0 ? { items: R.pickObjects(s, 3, objs), taken: false } : null;
    s.shop = {
      night: s.night,
      objs,
      objRerolls: 0,
      packs,
      service,
      tech,
      tool,
      relic,
      bought: [],
    };
    return s.shop;
  }

  // 市集各項價錢（已乘 stakeMod(s, 'prices')，純查詢不消耗隨機數）
  function price(s, slot, card) {
    if (!s || typeof slot !== 'string') return 0;
    const mod = priceMod(s);
    if (slot.startsWith('obj:')) {
      const id = slot.slice(4);
      const o = D.OBJ[id];
      return o ? Math.round((D.OBJ_PRICE[o.rarity] || 90) * mod * (1 - sv(s, 'shopDisc'))) : 0;
    }
    if (slot.startsWith('pack:')) {
      const pid = slot.slice(5);
      const base = pid === 'far' ? D.ECON.packFar : D.ECON.pack;
      return Math.round(base * mod);
    }
    if (slot.startsWith('polish:')) {
      const st = Number(slot.slice(7));
      return Math.round((D.ECON.polish[st] || 0) * mod);
    }
    if (slot === 'service') {
      const srv = (s.pick && s.pick.service) || (s.shop && s.shop.service);
      if (srv === 'burn') return Math.round(D.ECON.burn * mod);
      if (srv === 'copy') return Math.round(D.ECON.copy * mod);
      if (srv === 'polish') {
        const c = typeof card === 'object' && card ? card : (card != null ? s.cards.find((x) => x.uid === card) : null);
        const st = c && IE.Create ? IE.Create.starOf(c) : 1;
        return Math.round((D.ECON.polish[st] || 0) * mod);
      }
      return 0;
    }
    if (slot === 'tech') {
      const fid = s.shop && s.shop.tech;
      const lv = fid ? (IE.Create && IE.Create.level ? IE.Create.level(s, fid) : ((s.forms && s.forms[fid]) || 1)) : 1;
      return Math.round((D.ECON.tech + D.ECON.techStep * (lv - 1)) * mod);
    }
    if (slot === 'tool') {
      const tid = s.shop && s.shop.tool;
      if (!tid || !IE.Stages || !IE.Stages.TOOL[tid]) return 0;
      return Math.round(IE.Stages.toolPrice(s, tid) * D.ECON.toolMult);
    }
    if (slot === 'objReroll') {
      const n = (s.shop && s.shop.objRerolls) || 0;
      const arr = D.ECON.objReroll;
      const base = arr[Math.min(n, arr.length - 1)];
      return Math.round(base * mod);
    }
    if ((slot === 'moveup' || slot === 'rehouse') && IE.Flood && IE.Flood.services) {
      const srv = IE.Flood.services(s).find((x) => x.id === slot);
      return srv ? srv.cost : 0;
    }
    if (slot.startsWith('relic:')) return 0;
    return 0;
  }

  function rollPackStar(s, def) {
    if (def && def.rarity === 'legend') return 5;
    const probs = D.ECON.packStars;
    const r = R.rand(s);
    let acc = 0;
    for (let i = 0; i < probs.length; i++) {
      acc += probs[i];
      if (r < acc) return i + 1;
    }
    return probs.length;
  }

  function openPack(s, pdef) {
    const allIds = Object.keys(D.CARDS).concat(D.DESK_IDS || []);
    const foreign = (c) => c.origin && c.origin !== 'home';
    // 極稀有只會出現在遠方包，而且每張只有 ECON.packLegend 的機會（外國素材中約四分之一是極稀有，照抽就太常見）
    const legends = pdef.foreign ? allIds.filter((k) => D.CARDS[k].rarity === 'legend' && foreign(D.CARDS[k])) : [];
    const pool = allIds.filter((k) => {
      const c = D.CARDS[k];
      if (c.rarity === 'legend') return false;
      if (pdef.foreign) return foreign(c);
      return (pdef.tags || []).some((t) => c.tags && c.tags.includes(t));
    });
    const fallback = allIds.filter((k) => D.CARDS[k].rarity !== 'legend' && !pool.includes(k));
    const cards = [];
    while (cards.length < 3 + sv(s, 'packExtra') && (pool.length || fallback.length || legends.length)) {
      const src = legends.length && (R.rand(s) < D.ECON.packLegend || !(pool.length || fallback.length)) ? legends : pool.length ? pool : fallback;
      const id = R.pick(s, src);
      src.splice(src.indexOf(id), 1);
      const def = D.CARDS[id];
      const star = rollPackStar(s, def);
      cards.push({
        id,
        star,
        name: def.name,
        tags: def.tags.slice(),
        value: def.value,
        medium: D.mediumOf(def),
        origin: def.origin,
        rarity: def.rarity,
      });
    }
    return { id: pdef.id, name: pdef.name, cards };
  }

  function shopBuy(s, slot) {
    if (!s || !on(s) || s.phase !== 'shop') return { ok: false, msg: '不在市集' };
    const sh = shopOpen(s);
    if (!sh || typeof slot !== 'string') return { ok: false, msg: '無效的欄位' };
    if (s.pack || s.pick) return { ok: false, msg: '請先完成目前的選擇' };

    if (slot.startsWith('obj:')) {
      const id = slot.slice(4);
      if (!sh.objs.includes(id) || !D.OBJ[id]) return { ok: false, msg: '市集沒有這件物件' };
      if (s.objects.includes(id) || s.objStash.includes(id)) return { ok: false, msg: '已經擁有這件物件' };
      if (!(R.canEquip(s, id) || s.objStash.length < 4)) return { ok: false, msg: '物件欄和儲物箱都滿了' };
      const cost = price(s, slot);
      if (s.cr < cost) return { ok: false, msg: '要 $' + cost };
      if (!R.gainObject(s, id, null)) return { ok: false, msg: '無法獲得物件' };
      s.cr -= cost;
      sh.objs = sh.objs.filter((x) => x !== id);
      sh.bought.push(slot);
      return { ok: true, msg: '買下「' + D.OBJ[id].name + '」' };
    }

    if (slot.startsWith('pack:')) {
      const pid = slot.slice(5);
      if (sh.bought.includes(slot) || !sh.packs.includes(pid)) return { ok: false, msg: '不能購買這個素材包' };
      const pdef = D.PACKS.find((p) => p.id === pid);
      if (!pdef) return { ok: false, msg: '找不到素材包' };
      const cost = price(s, slot);
      if (s.cr < cost) return { ok: false, msg: '要 $' + cost };
      s.cr -= cost;
      sh.bought.push(slot);
      s.pack = openPack(s, pdef);
      return { ok: true, msg: '打開「' + pdef.name + '」', pack: s.pack };
    }

    if (slot === 'service') {
      if (sh.bought.includes('service')) return { ok: false, msg: '已經買過了' };
      const srv = sh.service;
      if (!srv) return { ok: false, msg: '沒有可用的服務' };
      const cost = srv === 'polish' ? 0 : price(s, 'service');
      if (s.cr < cost) return { ok: false, msg: '要 $' + cost };
      s.cr -= cost;
      sh.bought.push('service');
      s.pick = { service: srv, paid: cost };
      return { ok: true, msg: '選擇要處理的素材', pick: s.pick };
    }

    if (slot === 'tech') {
      if (sh.bought.includes('tech')) return { ok: false, msg: '已經買過了' };
      const fid = sh.tech;
      const fdef = fid && IE.Create ? IE.Create.formOf(s, fid) : null;
      if (!fdef) return { ok: false, msg: '沒有可用的技法課' };
      const cost = price(s, 'tech');
      if (s.cr < cost) return { ok: false, msg: '要 $' + cost };
      s.cr -= cost;
      normalizeForms(s);
      s.forms[fid] = ((s.forms && s.forms[fid]) || 1) + 1;
      sh.bought.push('tech');
      return { ok: true, msg: '技法課：' + fdef.name + ' 升到 Lv.' + s.forms[fid] };
    }

    if (slot === 'tool') {
      if (sh.bought.includes('tool')) return { ok: false, msg: '已經買過了' };
      const tid = sh.tool;
      if (!tid || !IE.Stages || !IE.Stages.TOOL[tid]) return { ok: false, msg: '沒有可用的工具卡' };
      const cost = price(s, 'tool');
      if (s.cr < cost) return { ok: false, msg: '要 $' + cost };
      if (!IE.Stages.giveTool(s, tid)) return { ok: false, msg: '工具欄已滿' };
      s.cr -= cost;
      sh.bought.push('tool');
      return { ok: true, msg: '買下工具卡「' + IE.Stages.TOOL[tid].name + '」' };
    }

    if (slot.startsWith('relic:')) {
      const id = slot.slice(6);
      if (!sh.relic || sh.relic.taken) return { ok: false, msg: '已經拿過遺物了' };
      if (!Array.isArray(sh.relic.items) || !sh.relic.items.includes(id) || !D.OBJ[id]) {
        return { ok: false, msg: '沒有這件遺物' };
      }
      if (s.objects.includes(id) || s.objStash.includes(id)) return { ok: false, msg: '已經擁有這件物件' };
      if (!(R.canEquip(s, id) || s.objStash.length < 4)) return { ok: false, msg: '物件欄和儲物箱都滿了' };
      const cost = price(s, slot);
      if (s.cr < cost) return { ok: false, msg: '要 $' + cost };
      if (!R.gainObject(s, id, null)) return { ok: false, msg: '無法獲得遺物' };
      s.cr -= cost;
      sh.relic.taken = true;
      sh.bought.push(slot);
      return { ok: true, msg: '收下遺物「' + D.OBJ[id].name + '」' };
    }

    if ((slot === 'moveup' || slot === 'rehouse') && IE.Flood && IE.Flood.buy) {
      const res = IE.Flood.buy(s, slot);
      if (res && res.ok) sh.bought.push(slot + ':' + res.floor);
      return res;
    }

    return { ok: false, msg: '無效的欄位' };
  }

  function objReroll(s) {
    if (!s || !on(s) || s.phase !== 'shop') return { ok: false, msg: '不在市集' };
    const sh = shopOpen(s);
    if (!sh) return { ok: false, msg: '不在市集' };
    const cost = price(s, 'objReroll');
    if (s.cr < cost) return { ok: false, msg: '要 $' + cost };
    s.cr -= cost;
    sh.objRerolls = (sh.objRerolls || 0) + 1;
    const excl = (sh.objs || []).concat(sh.relic && sh.relic.items ? sh.relic.items : []);
    let next = R.pickObjects(s, 2, excl);
    if (next.length < 2) {
      const more = R.pickObjects(s, 2 - next.length, next);
      next = next.concat(more);
    }
    sh.objs = next;
    return { ok: true, msg: '重抽了市集物件' };
  }

  function packPick(s, i) {
    if (!s || !on(s) || s.phase !== 'shop') return { ok: false, msg: '不在市集' };
    if (!s.pack || !Array.isArray(s.pack.cards)) return { ok: false, msg: '沒有打開的素材包' };
    if (!Number.isInteger(i) || i < 0 || i >= s.pack.cards.length) return { ok: false, msg: '無效的選擇' };
    const picked = s.pack.cards[i];
    const res = R.addCard(s, picked.id, { kind: 'shop' });
    if (res.dup) res.card.star = Math.max(res.card.star || 1, picked.star);
    else res.card.star = picked.star;
    s.pack = null;
    return { ok: true, msg: '獲得「' + res.card.name + '」（★' + res.card.star + '）', card: res.card, dropped: res.dropped };
  }

  function pickCard(s, uid) {
    if (!s || !on(s) || s.phase !== 'shop') return { ok: false, msg: '不在市集' };
    if (!s.pick || !s.pick.service) return { ok: false, msg: '沒有進行中的服務' };
    const c = s.cards.find((x) => x.uid === uid);
    if (!c) return { ok: false, msg: '找不到這張素材' };
    if (c.guilt) return { ok: false, msg: '愧疚素材不能使用工作室服務' };
    const srv = s.pick.service;
    if (srv === 'polish') {
      const st = IE.Create.starOf(c);
      if (st >= 5) return { ok: false, msg: '已經是最亮的 ★5' };
      const cost = price(s, 'service', c);
      if (s.cr < cost) return { ok: false, msg: '要 $' + cost };
      s.cr -= cost;
      c.star = st + 1;
      s.stats.polished = (s.stats.polished || 0) + 1;
      s.pick = null;
      return { ok: true, msg: '「' + c.name + '」打磨到 ★' + c.star, card: c };
    }
    if (srv === 'burn') {
      if (s.cards.length <= D.ECON.minDeck) return { ok: false, msg: '素材庫最少要留 ' + D.ECON.minDeck + ' 張素材' };
      s.cards = s.cards.filter((x) => x.uid !== uid);
      s.pick = null;
      return { ok: true, msg: '燒掉了「' + c.name + '」', card: c };
    }
    if (srv === 'copy') {
      const copyDef = {
        id: c.id,
        name: c.name + '（副本）',
        tags: c.tags.slice(),
        value: c.value,
        star: IE.Create.starOf(c),
        medium: D.mediumOf(c),
        wear: 0,
      };
      if (c.rarity) copyDef.rarity = c.rarity;
      if (c.mod) copyDef.mod = c.mod;
      if (c.origin) copyDef.origin = c.origin;
      const res = R.addCard(s, copyDef, { kind: 'craft' });
      res.card.star = copyDef.star;
      if (c.mod) res.card.mod = c.mod;
      s.pick = null;
      return { ok: true, msg: '複製了「' + c.name + '」', card: res.card };
    }
    return { ok: false, msg: '未知的服務' };
  }

  function cancelPick(s) {
    if (!s || !on(s) || s.phase !== 'shop') return { ok: false, msg: '不在市集' };
    if (!s.pick) return { ok: false, msg: '沒有進行中的服務' };
    const srv = s.pick.service;
    const refund = s.pick.paid != null ? s.pick.paid : (srv === 'polish' ? 0 : price(s, 'service'));
    s.cr += refund;
    s.pick = null;
    if (s.shop && Array.isArray(s.shop.bought)) {
      s.shop.bought = s.shop.bought.filter((x) => x !== 'service');
    }
    return { ok: true, msg: '已取消工作室服務' };
  }

  // 到下一晚的白天（總規格 §10）
  function advance(s) {
    if (!s || !on(s)) return;
    const prevDay = s.day || 4;
    const S = D.SEASONS[s.season];
    if (S) s.water = Math.min(8.5, s.water + S.water * 4);
    s.night = (s.night || 1) + 1;
    s.day = dayOfNight(s.night);
    s.slot = 0;
    s.quarter = R.quarterOf(s.day, s);
    s.phase = 'day';
    s.offer = null;
    s.shop = null;
    s.pack = null;
    s.pick = null;
    const seasonLen = R.modeOf(s).season || 20;
    if (Math.floor((s.day - 1) / seasonLen) > Math.floor((prevDay - 1) / seasonLen)) {
      const i = D.SEASON_ORDER.indexOf(s.season);
      s.season = D.SEASON_ORDER[(i + 1) % D.SEASON_ORDER.length];
    }
    if (Array.isArray(s.events)) {
      if (s.events.some((e) => s.day >= e.until)) {
        s.eventNext = Math.max(s.eventNext || 0, s.day + 2 + Math.floor(R.rand(s) * 4));
      }
      s.events = s.events.filter((e) => s.day < e.until);
    }
    if (IE.Create && IE.Create.newDay) {
      for (let k = 0; k < 4; k++) IE.Create.newDay(s);
    }
    if (Array.isArray(s.cards)) {
      s.cards.forEach((c) => {
        if (c && c.wear > 0) c.wear = Math.max(0, c.wear - 1);
      });
    }
    // 第十七期：舊城打撈的每日和每輪效果
    if (sv(s, 'sparkFloor') && s.spark < 1) s.spark = 1;
    if ((s.night - 1) % 3 === 0) {
      if (sv(s, 'roundSpark')) R.addSpark(s, sv(s, 'roundSpark'), true);
      if (sv(s, 'roundPack')) grantSalvagePack(s);
    }
    if ((s.night - 1) % 3 === 0) {
      const gigs = ensureGigs(s);
      const due = [];
      const kept = [];
      gigs.forEach((g) => {
        if (isGigExpired(s, g)) due.push(g);
        else kept.push(g);
      });
      if (due.length) {
        s.pendingExpiredGigs = (s.pendingExpiredGigs || []).concat(due);
        s.gigs = kept;
      }
      grantRoundGig(s);
    }
    if (IE.Flood && IE.Flood.tick) {
      IE.Flood.tick(s);
    }
  }

  function leaveShop(s) {
    if (!s || !on(s) || s.phase !== 'shop') return { ok: false, msg: '不在市集' };
    if (s.pack || s.pick) return { ok: false, msg: '請先完成開包或選素材' };
    if (s.night % 3 === 0) {
      s.phase = 'review';
      s.shop = null;
      return { ok: true, phase: 'review' };
    }
    advance(s);
    return { ok: true, phase: s.phase };
  }

  // ---------- 篩選日（總規格 §9） ----------
  function review(s) {
    if (!s || !on(s) || s.phase !== 'review') return null;
    const round = roundOf(s);
    const rent = rentOf(s, round);
    const lost = [];
    const lines = [];
    let paid = false;
    if (s.cr >= rent) {
      s.cr -= rent;
      paid = true;
      lines.push(D.ROUND_TEXT.rentOk.replace('{rent}', String(rent)));
    } else {
      s.cr = 0;
      paid = false;
      lost.push('rent');
      loseChance(s, 'rent');
      lines.push(D.ROUND_TEXT.rentFail.replace('{rent}', String(rent)));
    }
    const soul = s.soul;
    const soulStr = (soul || 0).toFixed(1);
    const soulOk = soul <= R.soulLimit(s);
    if (soulOk) {
      lines.push(D.ROUND_TEXT.soulOk.replace('{soul}', soulStr));
    } else {
      lost.push('soul');
      loseChance(s, 'soul');
      lines.push(D.ROUND_TEXT.soulFail.replace('{soul}', soulStr));
    }
    const passed = lost.length === 0;
    if (passed) {
      s.reviewsPassed = (s.reviewsPassed || 0) + 1;
      R.gainTicket(s, 'gold', 1, '通過第 ' + round + ' 輪篩選');
    }
    s.roundLog = s.roundLog || [];
    s.roundLog.push({ round, rent, paid, soul, soulOk, lost });
    const rep = {
      round,
      rent,
      paid,
      cr: s.cr,
      soul,
      soulOk,
      lost,
      chances: s.chances,
      passed,
      ending: null,
      lines,
      collect: null,
    };
    if (!s.ended) {
      if (round >= total(s) && s.chances > 0) {
        s.ended = R.endingFor(s, 'recruited');
        s.phase = 'ended';
      } else {
        if (round < total(s) && feat(s, 'collect') && IE.Story && IE.Story.collect) {
          IE.Story.collect(s, rep);
        }
        // 第十七期：舊城的「招聘廣告」預告下一輪外星評審的規則
        if (sv(s, 'nextJudge') && feat(s, 'judge') && IE.Stages && IE.Stages.bossesFor && round < total(s)) {
          rep.nextJudge = IE.Stages.bossesFor(s, round).map((b) => b.name + '（' + b.desc + '）');
        }
        advance(s);
      }
    }
    rep.ending = s.ended || null;
    // 篩選日的報告跟着存檔（WO-15-08 §6）：重新載入時仍然可以顯示，ackReview 之後清除
    s.reviewRep = rep;
    return rep;
  }

  function ackReview(s) {
    if (!s || !on(s)) return;
    s.reviewRep = null;
  }

  // ---------- 第十七期：舊城打撈的白天效果 ----------
  // 沉船貨櫃：每輪開始送一個打撈包（一張平衡素材，來歷是打撈）；介面在早上把它當作一個包撕開
  function grantSalvagePack(s) {
    const pool = (D.DESK_IDS || []).slice();
    if (!pool.length) return null;
    const id = R.pick(s, pool);
    const res = R.addCard(s, id, { kind: 'salvage' });
    s.packQueue = s.packQueue || [];
    s.packQueue.push({ kind: 'salvage', uids: [res.card.uid], night: s.night });
    return res;
  }
  // 告解室：每輪一次，靈魂輕 1 克，火花 −0.2
  function canConfess(s) {
    return !!(on(s) && sv(s, 'confess') && s.phase === 'day' && s.confessRound !== roundOf(s));
  }
  function confess(s) {
    if (!canConfess(s)) return null;
    s.confessRound = roundOf(s);
    const rep = R.report(s, D.SALVAGE_TEXT.confessBtn);
    const g = Math.min(s.soul, 1);
    s.soul = Math.round((s.soul - g) * 10) / 10;
    rep.delta('soul', -g);
    const sp = R.addSpark(s, -0.2, true);
    rep.delta('spark', sp);
    rep.line(D.SALVAGE_TEXT.confessDone, 'good');
    return rep.done();
  }
  // 心電圖：每輪最後一晚，預告篩選的結果（不改局面）
  function reviewPreview(s) {
    if (!on(s) || (s.night % 3) !== 0) return null;
    const rent = rentOf(s, roundOf(s));
    return { rent, rentOk: s.cr >= rent, soul: s.soul, soulOk: s.soul <= R.soulLimit(s) };
  }

  // ---------- 第十六期乙段（WO-16-11）：序章之夜、引導局 ----------
  // 序章用一個用完即棄的局面 p（p.prologue === true）：不存檔、不計入晚數、不給錢。以下全部是純函數，不用 Math.random。
  const PRO = () => D.PROLOGUE;
  // 四張序章卡的 uid，按 PROLOGUE.cards 的次序
  function prologueUids(p) {
    return PRO().cards.map((id) => { const c = p && p.cards ? p.cards.find((x) => x.id === id) : null; return c ? c.uid : null; }).filter((u) => u != null);
  }
  function prologueRun() {
    const P = PRO();
    const p = R.newRun({ bg: P.bg, season: P.season, seed: P.seed, mode: 'rounds', meta: { runs: 0 }, chapter: P.chapter || null });
    p.prologue = true;
    p.objects = [];
    p.cards = [];
    P.cards.forEach((id) => R.addCard(p, id, { kind: 'prologue' }));
    p.weather = { id: P.scene.weather, day: p.day };
    p.phase = 'night';
    return p;
  }
  function prologueSession(p, target) {
    const P = PRO();
    const ses = IE.Create.start(p, 'normal');
    ses.hand = prologueUids(p);
    ses.deck = [];
    ses.used = [];
    ses.plays = P.steps.length;
    ses.discards = 0;
    ses.stage = { kind: 'prologue', name: P.stageName, target, rules: [], index: 0 };
    ses.prologueStep = 0;
    ses.base = { plays: ses.plays, discards: 0, handSize: ses.handSize };
    return ses;
  }
  function prologueStep(p) {
    const ses = p && p.session;
    if (!ses || ses.prologueStep == null) return null;
    const i = ses.prologueStep;
    const st = PRO().steps[i];
    if (!st) return null;
    const all = prologueUids(p);
    return { i, uids: st.pick.map((k) => all[k]), say: st.say, after: st.after };
  }
  // sel：介面上已經選了的 uid（按次序）。回傳下一張要按的卡、要按「下筆」，或者選錯了要重來
  function prologueNext(p, sel) {
    const step = prologueStep(p);
    if (!step) return null;
    const cur = Array.isArray(sel) ? sel : [];
    if (cur.length > step.uids.length || cur.some((u, k) => u !== step.uids[k])) return { reset: true };
    if (cur.length === step.uids.length) return { play: true };
    return { uid: step.uids[cur.length] };
  }
  // 每一筆之後：手上還原為四張卡（原來的次序），進入下一步
  function prologueAfterPlay(p) {
    const ses = p && p.session;
    if (!ses) return;
    ses.hand = prologueUids(p);
    ses.deck = [];
    ses.used = [];
    ses.prologueStep = (ses.prologueStep || 0) + 1;
  }
  // 目標：照三步實際下三筆，取第二、三筆累計分數的中間，第三筆一定剛剛達標（不可以寫成常數）
  function prologueTarget() {
    const q = prologueRun();
    prologueSession(q, Infinity);
    const cum = [];
    PRO().steps.forEach(() => {
      const st = prologueStep(q);
      IE.Create.play(q, st.uids);
      cum.push(q.session.total);
      prologueAfterPlay(q);
    });
    return Math.round((cum[cum.length - 2] + cum[cum.length - 1]) / 2);
  }
  function prologueStart(p) {
    return prologueSession(p, prologueTarget());
  }
  // 收工：不呼叫 IE.Create.finish、IE.Stages.settle（'prologue' 不在獎金表內）
  function prologueFinish(p) {
    const ses = p && p.session;
    if (!ses) return null;
    const out = {
      title: ses.log.length && IE.Create.workName ? IE.Create.workName(ses.log, p) : '',
      total: ses.total,
      target: ses.stage ? ses.stage.target : 0,
      passed: !!ses.passed,
      strokes: ses.paintStrokes || [],
    };
    p.session = null;
    return out;
  }
  // 正式的局：加入四張序章卡的新複本（耗損 0）
  function prologueCarry(s) {
    if (!on(s)) return [];
    return PRO().cards.map((id) => R.addCard(s, id, { kind: 'prologue' }).card).filter(Boolean);
  }
  // 引導局要顯示甚麼（只是顯示；被隱藏的部分規則照常運作）
  const REVEAL_ALL = { cardsMax: Infinity, map: true, rent: true, chances: true, water: true, skip: true, deck: true, boss: true, story: true, wx: true, reroll: true, memory: true };
  function reveal(s) {
    if (!s || !s.guided) return Object.assign({}, REVEAL_ALL);
    const n = s.night || 1;
    return {
      cardsMax: n <= 1 ? 2 : Infinity,
      map: n >= 2, rent: n >= 2, chances: n >= 2, water: n >= 2, skip: n >= 2, deck: n >= 2,
      boss: n >= 3, story: n >= 3, wx: n >= 3, reroll: n >= 3, memory: n >= 3,
    };
  }
  // 第一個故事章：引導局只給生存、為別人、巔峰各一（保留在 ch.options 裏原來的編號）
  function guidedOptions(s, ch) {
    const opts = (ch && ch.options) || [];
    const all = opts.map((o, i) => i);
    const answered = !!(s && s.story && s.story.log && s.story.log.length);
    if (!s || !s.guided || answered || opts.length <= 3) return all;
    const pick = [];
    ['survive', 'others', 'peak'].forEach((side) => {
      let i = opts.findIndex((o, k) => o && o.side === side && !o.extreme && !pick.includes(k));
      if (i < 0) i = opts.findIndex((o, k) => o && o.side === side && !pick.includes(k));
      if (i >= 0) pick.push(i);
    });
    for (let k = 0; k < opts.length && pick.length < 3; k++) if (!pick.includes(k)) pick.push(k);
    return pick.sort((a, b) => a - b);
  }
  // 引導局：錢、火花、靈魂第一次改變時要加一句說明（不改局面）
  function newHints(s, rep) {
    if (!s || !s.guided || !rep || !rep.deltas) return [];
    const h = s.hinted || {};
    return ['cr', 'spark', 'soul'].filter((k) => rep.deltas[k] && !h[k]);
  }

  IE.Rounds = {
    on,
    prologueRun,
    prologueStart,
    prologueStep,
    prologueNext,
    prologueAfterPlay,
    prologueTarget,
    prologueFinish,
    prologueCarry,
    reveal,
    guidedOptions,
    newHints,
    cash,
    cashText,
    total,
    nightsTotal,
    dayTitle,
    grantSalvagePack,
    canConfess,
    confess,
    reviewPreview,
    roundOf,
    kindOf,
    dayOfNight,
    sig3,
    target,
    rentOf,
    initGigs,
    addGig,
    useGig,
    expireGigs,
    offer,
    offerCost,
    rerollOffer,
    cardList,
    cardInfo,
    choose,
    afterDay,
    skipDay,
    tripPick,
    nightReward,
    cleared,
    canFinish,
    normalizeForms,
    loseChance,
    startNight,
    shopOpen,
    price,
    shopBuy,
    objReroll,
    packPick,
    pickCard,
    cancelPick,
    leaveShop,
    advance,
    review,
    ackReview,
  };
});
