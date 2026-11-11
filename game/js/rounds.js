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

  // 第幾輪（1..5）
  function roundOf(s, night) {
    const n = night == null ? s.night : night;
    return R.clamp(Math.ceil(n / 3), 1, 5);
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
    return sig3(D.ECON.t1 * Math.pow(D.ECON.growth, k - 1) * stMod * ease * nMod);
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

  function initGigs(s) {
    if (!s || !on(s)) return;
    s.gigs = [];
    s.pendingExpiredGigs = [];
    grantRoundGig(s);
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
    const trips = all.filter((id) => id.startsWith('trip:'));
    const restPool = nonMicro([c1, c2]);
    const c3 = trips.length && (R.rand(s) < (tripDef ? tripDef.chance : 0.15) || !restPool.length)
      ? R.pick(s, trips)
      : R.pick(s, restPool);

    return { ids: [c1, c2, c3].filter(Boolean), gig: firstGig };
  }

  // 回傳 s.offer；這一晚還沒有就按總規格 §3.1 的出牌規則產生
  function offer(s) {
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
    return Math.round(base * stMod);
  }

  // 換一批生活卡
  function rerollOffer(s) {
    const of = offer(s);
    const cost = offerCost(s);
    if (s.cr < cost) return { ok: false, msg: '換一批要 $' + cost };
    s.cr -= cost;
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
      const fid = D.TEACH[npcId];
      const form = D.FORMS.find((f) => f.id === fid);
      const cost = R.chatCost(s);
      const reason = s.cr < cost ? '沒錢請人喝東西' : null;
      return {
        id,
        kind: 'friend',
        kindName: D.ROUND_TEXT.kinds.friend,
        name: '找' + (npc ? npc.name : npcId) + '聊天',
        sub: form ? '聊聊近況，練習「' + form.name + '」的配色' : '和朋友聊聊近況',
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

  // 白天完結：進入創作之夜，若在致命危險中喪生則進入結局；超過素材庫上限時留在白天
  function afterDay(s) {
    if (!s || s.phase !== 'day') return { ok: false };
    if (s.body <= 0) {
      s.ended = R.endingFor(s, 'death');
      s.phase = 'ended';
      return { ok: true };
    }
    if (s.over) return { ok: false, msg: D.CARD_TEXT.overHead };
    s.phase = 'night';
    return { ok: true };
  }

  // 睡懶覺：不選卡，恢復火花並進入晚上
  function skipDay(s) {
    if (!s || s.phase !== 'day') return null;
    const rep = R.report(s, '睡懶覺');
    const sp = R.addSpark(s, D.ECON.skipSpark, true);
    rep.line('今天甚麼都不做，睡了一整天', 'good', sp, 'spark');
    afterDay(s);
    return rep.done();
  }

  // 選一張生活卡
  function choose(s, id, reply) {
    if (!s || s.phase !== 'day') return null;
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
      const fid = D.TEACH[npcId];
      const lv0 = (s.forms && s.forms[fid]) || 1;
      const rep = R.applyChat(s, npcId, reply);
      if (((s.forms && s.forms[fid]) || 1) === lv0) {
        R.teach(s, npcId, 1, { line: (text, kind) => rep.lines.push({ text, kind: kind || '' }) });
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

  // 這一晚是否已達標（可以提早收工）
  function cleared(s) {
    if (!s || !s.session || !s.session.stage || !IE.Stages) return false;
    return IE.Stages.stageScore(s.session) >= s.session.stage.target;
  }

  // 失去一次機會；機會用完即進入結局
  function loseChance(s, cause, rep) {
    if (!s || !on(s)) return;
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
    if (!s || !on(s) || s.phase !== 'night') return null;
    return IE.Create.start(s, 'normal');
  }

  // ---------- 市集：物件、素材包、服務、技法課、工具卡、遺物 ----------
  function priceMod(s) {
    return IE.Meta && IE.Meta.stakeMod ? IE.Meta.stakeMod(s, 'prices') : 1;
  }

  function shopOpen(s) {
    if (!s || !on(s) || s.phase !== 'shop') return null;
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
    const techPool = ['adj', 'triad', 'split', 'comp', 'tetrad', 'full', 'mono'];
    if (s.formsSeen && s.formsSeen.paradox) techPool.push('paradox');
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
      return o ? Math.round((D.OBJ_PRICE[o.rarity] || 90) * mod) : 0;
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
      const lv = (fid && s.forms && s.forms[fid]) || 1;
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
    const allIds = Object.keys(D.CARDS);
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
    while (cards.length < 3 && (pool.length || fallback.length || legends.length)) {
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
      if (!fid || !IE.Create || !IE.Create.FORM[fid]) return { ok: false, msg: '沒有可用的技法課' };
      const cost = price(s, 'tech');
      if (s.cr < cost) return { ok: false, msg: '要 $' + cost };
      s.cr -= cost;
      s.forms[fid] = ((s.forms && s.forms[fid]) || 1) + 1;
      sh.bought.push('tech');
      return { ok: true, msg: '技法課：' + IE.Create.FORM[fid].name + ' 升到 Lv.' + s.forms[fid] };
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
    res.card.star = picked.star;
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
    const soulOk = soul <= R.SOUL_LIMIT;
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
      if (round >= 5 && s.chances > 0) {
        s.ended = R.endingFor(s, 'recruited');
        s.phase = 'ended';
      } else {
        if (round < 5 && IE.Story && IE.Story.collect) {
          IE.Story.collect(s, rep);
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

  IE.Rounds = {
    on,
    cash,
    cashText,
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
