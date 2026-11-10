#!/usr/bin/env node
// 《靈感撤離 2080》五輪模式自動模擬與數值校準工具（第十五期 WO-15-09）。
// 用法：
//   node tools/sim-rounds.js [runs=100]
//   STRAT=balanced node tools/sim-rounds.js 200
//   ECON='{"growth":1.28,"nightPay":{"small":95,"big":150,"boss":220}}' node tools/sim-rounds.js 200
//   BG=monk node tools/sim-rounds.js 50
//   SEED0=5000 node tools/sim-rounds.js 200（換一段種子：第 i 局的種子是 SEED0 + i，審核時確認結果穩定）
//   TRIP=any node tools/sim-rounds.js 200（只要付得起旅費就出國，不保留本輪租金：估計出國本身的價值，見 CALIBRATION.md 第九節）
'use strict';

const path = require('path');
[
  'data.js', 'data-events.js', 'data-incidents.js', 'data-deaths.js', 'data-jobs.js',
  'data-craft.js', 'data-world.js', 'data-world2.js', 'data-chars.js', 'data-schools.js',
  'data-abilities.js', 'data-stories.js', 'data-weather.js', 'data-contacts.js',
  'data-rounds.js', 'data-cities.js', 'data-story.js', 'rules.js', 'cards.js', 'create.js', 'world.js', 'jobs2.js', 'auto.js',
  'stages.js', 'meta.js', 'dossier.js', 'rounds.js', 'story.js',
].forEach((f) => require(path.join(__dirname, '../game/js', f)));

const IE = globalThis.IE;
const D = IE.DATA, R = IE.Rules, CARDS = IE.Cards, RD = IE.Rounds, CR = IE.Create, ST = IE.Stages, AU = IE.Auto, STORY = IE.Story;

// 支援 ECON 環境變數覆寫 D.ECON（供校準迭代使用）
if (process.env.ECON) {
  const over = JSON.parse(process.env.ECON);
  Object.keys(over).forEach((k) => {
    const v = over[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && D.ECON[k] && typeof D.ECON[k] === 'object') {
      Object.assign(D.ECON[k], v);
    } else {
      D.ECON[k] = v;
    }
  });
}

const RUNS = Math.max(1, parseInt(process.argv[2] || '100', 10));
const BG_ALIAS = { illustrator: 'copywriter', writer: 'copywriter', musician: 'busker', freelancer: 'programmer' };
const BGS = process.env.BG
  ? [BG_ALIAS[process.env.BG] || process.env.BG]
  : Object.keys(D.BACKGROUNDS);
const SEASONS = Object.keys(D.SEASONS);
const ALL_STRATS = [
  { id: 'balanced',  name: '均衡型 (balanced)' },
  { id: 'worker',    name: '打工狂 (worker)' },
  { id: 'liver',     name: '生活派 (liver)' },
  { id: 'saint',     name: '聖人   (saint)' },
  { id: 'shameless', name: '無良   (shameless)' },
  { id: 'random',    name: '亂玩   (random)' },
];
// 出國的門檻（WO-15-14 審核加入）：TRIP=any 時只要付得起旅費就出國，不保留本輪租金；用來估計出國本身的價值
const TRIP_ANY = process.env.TRIP === 'any';
const STRATS = process.env.STRAT
  ? ALL_STRATS.filter((x) => process.env.STRAT.split(',').includes(x.id))
  : ALL_STRATS;

const FORM_KEYS = ['mono', 'adj', 'triad', 'split', 'comp', 'tetrad', 'full', 'mix', 'series', 'cross', 'mini', 'epic', 'paradox'];
const SNOW_NIGHTS = [1, 3, 6, 9, 12, 15];

// 工作卡預期薪水排序（由高至低）
const WORK_RANK = { clinic: 5, haggle: 4, delivery: 3, salvage: 2, label: 1 };
const LIFE_RANK = { busk: 4, garden: 3, dive: 2, volunteer: 1 };

function median(arr) {
  if (!arr || !arr.length) return 0;
  const a = arr.slice().sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2);
}

function topUsedForms(s) {
  const counts = Object.assign({}, s.style || {});
  (s.works || []).forEach((w) => {
    if (w && w.form) counts[w.form] = (counts[w.form] || 0) + 2;
  });
  Object.keys(s.forms || {}).forEach((f) => {
    if (s.forms[f] > 1) counts[f] = (counts[f] || 0) + (s.forms[f] - 1) * 3;
  });
  return Object.keys(counts)
    .filter((f) => f !== 'mix')
    .sort((a, b) => (counts[b] || 0) - (counts[a] || 0));
}

function cardExpectedPay(c) {
  const crFx = (c && c.fx || []).find(([k]) => k === 'cr');
  if (!crFx) return 0;
  const m = String(crFx[1]).match(/([+-−]?)\s*\$(\d+)/);
  if (!m) return 0;
  return (m[1] === '-' || m[1] === '−' ? -1 : 1) * Number(m[2]);
}

function chooseDilemma(s, strat) {
  const v = R.dilemmaView(s);
  const d = D.DILEMMAS.find((x) => x.id === v.id);
  const ok = v.options.filter((o) => !o.reason).map((o) => o.i);
  if (!ok.length) return 0;
  const sinIdx = ok.find((i) => d.options[i].sin);
  const goodIdx = ok.find((i) => !d.options[i].sin && (d.options[i].cr || 0) >= 0) ?? ok.find((i) => !d.options[i].sin) ?? ok[0];
  if (strat === 'saint') return goodIdx;
  if (strat === 'shameless') return sinIdx ?? goodIdx;
  if (strat === 'random') return R.pick(s, ok);
  const o = sinIdx != null ? d.options[sinIdx] : null;
  const grams = o ? o.sin * R.sinFactor(s) : 0;
  const margin = R.SOUL_LIMIT - 3 - s.soul;
  const broke = s.cr < RD.rentOf(s);
  const paysMoney = o && ((o.cr || 0) > 0 || o.rentDiscount || o.foodFree);
  return o && grams < margin && ((broke && paysMoney) || (o.cr || 0) >= 120) ? sinIdx : goodIdx;
}

function pickDayCard(s, strat) {
  const of = RD.offer(s);
  const infos = (of.ids || []).map((id) => RD.cardInfo(s, id)).filter((c) => c && c.enabled);
  if (!infos.length) return null;

  if (strat === 'random') {
    return R.pick(s, infos).id;
  }

  // 第十六期（WO-16-02）：有差事的卡就選它（照舊做）；沒有就照原本的偏好
  const gigCard = infos.find((c) => c.gig && c.micro && (strat !== 'saint' || c.kind !== 'shady'));
  if (gigCard) return gigCard.id;

  const rent = RD.rentOf(s);
  const stMod = IE.Meta && IE.Meta.stakeMod ? IE.Meta.stakeMod(s, 'prices') : 1;
  const tripCost = Math.round(D.ECON.tripCost * stMod);

  // worker：永遠選工作或虧心卡（按收入由高至低）
  if (strat === 'worker') {
    const works = infos
      .filter((c) => c.kind === 'work' || c.kind === 'shady')
      .sort((a, b) => cardExpectedPay(b) - cardExpectedPay(a));
    return works.length ? works[0].id : infos[0].id;
  }

  // liver：永遠選生活、朋友或出國卡（出國要錢足夠「本輪租金 + 旅費」；都沒有就發呆或睡懶覺）
  if (strat === 'liver') {
    const topForms = topUsedForms(s);
    const friends = infos.filter((c) => c.kind === 'friend').sort((a, b) => {
      const fa = D.TEACH[a.id.slice(7)], fb = D.TEACH[b.id.slice(7)];
      const ia = topForms.indexOf(fa), ib = topForms.indexOf(fb);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    const trips = infos.filter((c) => c.kind === 'trip' && s.cr >= (TRIP_ANY ? tripCost : rent + tripCost));
    const lives = infos.filter((c) => c.kind === 'life').sort((a, b) => (LIFE_RANK[b.id] || 0) - (LIFE_RANK[a.id] || 0));
    const restCard = infos.find((c) => c.kind === 'rest');
    if (trips.length) return trips[0].id;
    if (lives.length) return lives[0].id;
    if (friends.length) return friends[0].id;
    if (restCard) return restCard.id;
    return null;
  }

  // shameless：有虧心差事時選虧心卡；從不義工
  if (strat === 'shameless') {
    const shady = infos.filter((c) => c.kind === 'shady').sort((a, b) => (a.id === 'farm' ? -1 : 1) - (b.id === 'farm' ? -1 : 1));
    if (shady.length) return shady[0].id;
  }

  // saint：不選虧心卡
  const curInfos = (RD.offer(s).ids || []).map((id) => RD.cardInfo(s, id)).filter((c) => c && c.enabled);
  const pool = strat === 'saint' ? curInfos.filter((c) => c.kind !== 'shady') : curInfos;
  if (!pool.length) return null;

  const cleanWorks = pool
    .filter((c) => c.kind === 'work')
    .sort((a, b) => cardExpectedPay(b) - cardExpectedPay(a));

  // 1. 錢不夠「本輪租金 + 60」→ 收入最高的工作卡
  if (s.cr < rent + 60 && cleanWorks.length) {
    return cleanWorks[0].id;
  }

  // 2. 靈魂超過門檻（balanced > 17，saint > 12）→ 義工（shameless 從不義工）
  if (strat !== 'shameless' && s.soul > (strat === 'saint' ? 12 : 17)) {
    const vol = pool.find((c) => c.kind === 'volunteer' || c.id === 'volunteer');
    if (vol) return vol.id;
  }

  // 若牌庫已滿且最殘的一張是 ★4+ 主力牌，睡懶覺養火花並避免新拿到的 ★1 卡覆蓋主力牌
  const deckCap = (D.BACKGROUNDS[s.bg] && D.BACKGROUNDS[s.bg].perk && D.BACKGROUNDS[s.bg].perk.deckMax) || 12;
  if (s.cards.length >= deckCap) {
    let worst = s.cards[0];
    s.cards.forEach((c) => {
      if ((c.wear || 0) > (worst.wear || 0) || ((c.wear || 0) === (worst.wear || 0) && c.value < worst.value && (c.wear || 0) > 0)) worst = c;
    });
    if (worst && (worst.wear || 0) > 0 && CR.starOf(worst) >= 4) return null;
  }

  // 3. 否則優先：朋友卡（教的配色是最常用的配色）＞ 出國（錢足夠「本輪租金 + 旅費 + 60」時）＞ 生活卡 ＞ 工作卡
  const topForms = topUsedForms(s);
  const friends = pool.filter((c) => c.kind === 'friend').sort((a, b) => {
    const fa = D.TEACH[a.id.slice(7)], fb = D.TEACH[b.id.slice(7)];
    const ia = topForms.indexOf(fa), ib = topForms.indexOf(fb);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  if (friends.length) return friends[0].id;

  const trips = pool.filter((c) => c.kind === 'trip' && s.cr >= (TRIP_ANY ? tripCost : rent + tripCost + 60));
  if (trips.length) return trips[0].id;

  const lives = pool.filter((c) => c.kind === 'life').sort((a, b) => (LIFE_RANK[b.id] || 0) - (LIFE_RANK[a.id] || 0));
  if (lives.length) return lives[0].id;

  if (cleanWorks.length) return cleanWorks[0].id;
  const restCard = pool.find((c) => c.kind === 'rest');
  if (restCard) return restCard.id;
  return null;
}

function chooseStoryChapter(s, ch, strat) {
  const opts = ch.options || [];
  if (!opts.length) return 0;
  // 只考慮付得起的選項（總規格 §14.3：錢不夠的選項不可以選；每章至少有一個不用付錢的選項）
  const affordable = opts.map((_, i) => i).filter((i) => !STORY.reason(s, opts[i]));
  const indices = affordable.length ? affordable : opts.map((_, i) => i);
  if (strat === 'random') {
    return R.pick(s, indices);
  }
  if (strat === 'balanced') {
    const idx = indices.find((i) => opts[i].side === 'both');
    return idx != null ? idx : indices[0];
  }
  if (strat === 'worker') {
    const surv = indices.filter((i) => opts[i].side === 'survive');
    const cands = surv.length ? surv : indices;
    return cands.slice().sort((a, b) => ((opts[b].fx && opts[b].fx.cr) || 0) - ((opts[a].fx && opts[a].fx.cr) || 0))[0];
  }
  if (strat === 'liver') {
    const peaks = indices.filter((i) => opts[i].side === 'peak');
    const cands = peaks.length ? peaks : indices;
    return cands.slice().sort((a, b) => ((opts[b].fx && opts[b].fx.spark) || 0) - ((opts[a].fx && opts[a].fx.spark) || 0))[0];
  }
  if (strat === 'saint') {
    return indices.slice().sort((a, b) => {
      const sinA = (opts[a].fx && opts[a].fx.sin) || 0;
      const sinB = (opts[b].fx && opts[b].fx.sin) || 0;
      if (sinA !== sinB) return sinA - sinB;
      const atA = (opts[a].fx && opts[a].fx.atone) || 0;
      const atB = (opts[b].fx && opts[b].fx.atone) || 0;
      if (atB !== atA) return atB - atA;
      return a - b;
    })[0];
  }
  if (strat === 'shameless') {
    return indices.slice().sort((a, b) => ((opts[b].fx && opts[b].fx.cr) || 0) - ((opts[a].fx && opts[a].fx.cr) || 0))[0];
  }
  return indices[0];
}

function runDay(s, strat, metrics) {
  R.morning(s);
  const expired = RD.expireGigs(s);
  metrics.expiredGigs += expired.length;
  CARDS.autoPutDown(s);
  metrics.transitions++;
  const pl = STORY.plan(s);
  const revs = STORY.reversals(s);
  if (revs.length) {
    STORY.reverse(s);
    CARDS.autoPutDown(s);
    metrics.reversals += revs.length;
    metrics.transitions++;
  }
  const ch = STORY.chapter(s);
  if (ch) {
    const optIdx = chooseStoryChapter(s, ch, strat);
    if (ch.options[optIdx] && ch.options[optIdx].extreme) metrics.extremes++;
    STORY.choose(s, optIdx);
    CARDS.autoPutDown(s);
    metrics.transitions++;
  } else if (R.drawDilemma(s)) {
    const opt = chooseDilemma(s, strat);
    R.resolveDilemma(s, opt);
    CARDS.autoPutDown(s);
    metrics.transitions++;
  }
  RD.offer(s);
  const id = pickDayCard(s, strat);
  metrics.dayChoices++;
  if (!id) {
    RD.skipDay(s);
  } else {
    const res = RD.choose(s, id);
    CARDS.autoPutDown(s);
    if (id.startsWith('friend:')) {
      const npcId = id.slice(7);
      const r = RD.roundOf(s);
      const rawHide = (D.ECON.hideCost && D.ECON.hideCost[r - 1]) || 80;
      const hideCost = Math.abs(STORY.money(s, -rawHide));
      const rent = RD.rentOf(s);
      if (pl && pl.npc === npcId && !(s.story && s.story.hidden && s.story.hidden[npcId])) {
        if (strat === 'balanced' && s.cr >= rent + hideCost + 60) {
          STORY.hide(s, npcId);
        } else if ((strat === 'saint' || strat === 'liver') && s.cr >= rent + hideCost) {
          STORY.hide(s, npcId);
        } else if (strat === 'random' && s.cr >= hideCost && R.rand(s) < 0.5) {
          STORY.hide(s, npcId);
        }
      }
    }
    if (res && res.micro) {
      metrics.micros++;
      AU.apply(s, res.micro);
      CARDS.autoPutDown(s);
      metrics.transitions++;
    } else if (res && res.trip) {
      while (s.trip5 && Array.isArray(s.trip5.ids)) {
        const picked = s.trip5.picked || [];
        const rem = s.trip5.ids
          .map((cid, i) => ({ cid, i, def: D.CARDS[cid] }))
          .filter((x) => !picked.includes(x.i));
        if (!rem.length) break;
        let pickIdx = rem[0].i;
        if (strat === 'random') {
          pickIdx = R.pick(s, rem).i;
        } else {
          rem.sort((a, b) => (CR.starOf(b.def) - CR.starOf(a.def)) || ((b.def.value || 0) - (a.def.value || 0)));
          pickIdx = rem[0].i;
        }
        if (!RD.tripPick(s, pickIdx)) break;
        CARDS.autoPutDown(s);
      }
      metrics.transitions++;
    }
  }
  if (R.encounter) {
    const e = R.encounter(s);
    if (e) {
      R.applyEncounter(s, e.id, 0);
      CARDS.autoPutDown(s);
      metrics.transitions++;
    }
  }
  CARDS.autoPutDown(s);
  RD.afterDay(s);
  metrics.transitions++;
}

function runNight(s, strat, metrics) {
  const night = s.night;
  const ses = RD.startNight(s);
  if (!ses) return;
  metrics.transitions++;

  if (strat === 'random') {
    while (ses.plays > 0 && ses.hand.length > 0) {
      const valid = ses.hand.filter((u) => {
        const c = s.cards.find((x) => x.uid === u);
        return c && !CR.forbidden(s, c);
      });
      if (!valid.length) break;
      const maxK = Math.min(5, CR.maxCards(s), valid.length);
      const k = 1 + Math.floor(R.rand(s) * maxK);
      const pool = valid.slice();
      const uids = [];
      while (uids.length < k && pool.length) {
        const u = R.pick(s, pool);
        pool.splice(pool.indexOf(u), 1);
        uids.push(u);
      }
      const res = CR.play(s, uids);
      if (!res) break;
      metrics.plays++;
      metrics.forms[res.form] = (metrics.forms[res.form] || 0) + 1;
      if (RD.cleared(s)) break;
    }
    if (ses.log.length && metrics.nightPlays[night]) {
      metrics.nightPlays[night].push(Math.max(...ses.log.map((x) => x.total)));
    }
    CR.finish(s);
    CARDS.autoPutDown(s);
    metrics.transitions++;
    return;
  }

  for (let i = (s.tools || []).length - 1; i >= 0; i--) {
    if (s.tools[i] === 'lamp' || s.tools[i] === 'coffee') ST.useTool(s, i, []);
  }
  const bg = s.bg;
  if (bg === 'copywriter' && ses.stage && ses.stage.kind === 'boss' && strat !== 'saint') CR.useAbility(s, 'package');
  if (bg === 'influencer' && ses.stage && ses.stage.kind === 'boss') CR.useAbility(s, 'live');
  if (bg === 'greydeserter' && ses.stage && ses.stage.rules.length) CR.useAbility(s, 'bribe');
  if (bg === 'skyheir' && s.cr > RD.rentOf(s) + 150) CR.useAbility(s, 'buyPlay');
  if (bg === 'animator') {
    const p = CR.useAbility(s, 'frames');
    if (p && p.ok && p.peek && p.peek.length) {
      const top = p.peek.map((u) => s.cards.find((c) => c.uid === u)).filter(Boolean).sort((a, b) => b.value - a.value)[0];
      if (top) CR.useAbility(s, 'frames', top.uid);
    }
  }
  if (bg === 'teacher') {
    const top = ses.hand.map((u) => s.cards.find((c) => c.uid === u)).filter(Boolean).sort((a, b) => b.value - a.value)[0];
    if (top) CR.useAbility(s, 'mark', top.uid);
  }

  while (ses.plays > 0 && ses.hand.length > 0) {
    let best = CR.bestPlay(s);
    while (best && ses.discards > 0 && s.cards.length - ses.hand.length - ses.used.length >= 3) {
      const remScore = ses.stage.target - ST.stageScore(ses);
      const needMore = best.form === 'mix' || best.total * ses.plays < remScore;
      if (!needMore) break;
      const keep = new Set(best.uids);
      const weak = ses.hand
        .map((u) => s.cards.find((c) => c.uid === u))
        .filter((c) => c && !keep.has(c.uid))
        .sort((a, b) => (CR.starOf(a) - CR.starOf(b)) || ((a.value || 0) - (b.value || 0)))
        .slice(0, 3)
        .map((c) => c.uid);
      if (!weak.length || !CR.discard(s, weak)) break;
      metrics.discards++;
      best = CR.bestPlay(s);
    }
    if (!best) break;
    const res = CR.play(s, best.uids);
    if (!res) break;
    metrics.plays++;
    metrics.forms[res.form] = (metrics.forms[res.form] || 0) + 1;
    if (bg === 'busker' && !RD.cleared(s)) CR.useAbility(s, 'encore');
    if (RD.cleared(s)) break;
  }
  if (ses.log.length && metrics.nightPlays[night]) {
    metrics.nightPlays[night].push(Math.max(...ses.log.map((x) => x.total)));
  }
  CR.finish(s);
  CARDS.autoPutDown(s);
  metrics.transitions++;
}

function ownedSchools(s) {
  const counts = {};
  (s.objects || []).forEach((id) => {
    const sc = D.OBJ[id] && D.OBJ[id].school;
    if (sc) counts[sc] = (counts[sc] || 0) + 1;
  });
  return counts;
}

function ensureObjectSpace(s) {
  if (s.objects.length < R.slotsOf(s)) return true;
  if ((s.objStash || []).length < 4) return true;
  if (s.objStash && s.objStash.length) {
    R.sellObject(s, s.objStash[0]);
    return true;
  }
  return false;
}

function maybePromoteFromStash(s) {
  if (!s.objStash || !s.objStash.length) return;
  const eqCounts = ownedSchools(s);
  const allCounts = Object.assign({}, eqCounts);
  (s.objStash || []).forEach((id) => {
    const sc = D.OBJ[id] && D.OBJ[id].school;
    if (sc) allCounts[sc] = (allCounts[sc] || 0) + 1;
  });
  const topSc = Object.keys(allCounts).sort((a, b) => allCounts[b] - allCounts[a])[0];
  if (!topSc || allCounts[topSc] < 2) return;
  for (const stId of s.objStash.slice()) {
    if (!D.OBJ[stId] || D.OBJ[stId].school !== topSc) continue;
    if (R.canEquip(s, stId)) {
      R.equipObject(s, stId);
      continue;
    }
    const curEq = ownedSchools(s);
    const offId = s.objects.find((id) => D.OBJ[id] && !D.OBJ[id].start && D.OBJ[id].school !== topSc && (curEq[D.OBJ[id].school] || 0) <= 1);
    if (offId) {
      R.sellObject(s, offId);
      R.equipObject(s, stId);
    }
  }
}

function runShop(s, strat, metrics) {
  const sh = RD.shopOpen(s);
  if (!sh) return;
  metrics.shopVisits++;
  metrics.transitions++;

  if (strat === 'random') {
    const cands = [];
    if (sh.relic && !sh.relic.taken && Array.isArray(sh.relic.items)) {
      sh.relic.items.forEach((id) => {
        if (!s.objects.includes(id) && !s.objStash.includes(id) && (R.canEquip(s, id) || s.objStash.length < 4)) {
          cands.push('relic:' + id);
        }
      });
    }
    (sh.objs || []).forEach((id) => {
      const slot = 'obj:' + id;
      if (!s.objects.includes(id) && !s.objStash.includes(id) && (R.canEquip(s, id) || s.objStash.length < 4) && s.cr >= RD.price(s, slot)) {
        cands.push(slot);
      }
    });
    (sh.packs || []).forEach((pid) => {
      const slot = 'pack:' + pid;
      if (!sh.bought.includes(slot) && s.cr >= RD.price(s, slot)) cands.push(slot);
    });
    if (sh.tech && !sh.bought.includes('tech') && s.cr >= RD.price(s, 'tech')) cands.push('tech');
    if (sh.tool && !sh.bought.includes('tool') && (s.tools || []).length < ST.toolSlots(s) && s.cr >= RD.price(s, 'tool')) cands.push('tool');
    if (sh.service && !sh.bought.includes('service')) {
      if (sh.service === 'burn' && s.cards.filter((c) => !c.guilt).length > D.ECON.minDeck && s.cr >= RD.price(s, 'service')) cands.push('service');
      if (sh.service === 'copy' && s.cards.some((c) => !c.guilt) && s.cr >= RD.price(s, 'service')) cands.push('service');
      if (sh.service === 'polish' && s.cards.some((c) => !c.guilt && CR.starOf(c) < 5 && s.cr >= RD.price(s, 'service', c))) cands.push('service');
    }
    if (cands.length) {
      const slot = R.pick(s, cands);
      const b = RD.shopBuy(s, slot);
      if (b && b.ok) {
        metrics.shopBuys++;
        if (s.pack && s.pack.cards && s.pack.cards.length) {
          const idx = Math.floor(R.rand(s) * s.pack.cards.length);
          RD.packPick(s, idx);
          CARDS.autoPutDown(s);
        }
        if (s.pick && s.pick.service) {
          const valid = s.cards.filter((c) => {
            if (c.guilt) return false;
            if (s.pick.service === 'polish') return CR.starOf(c) < 5 && s.cr >= RD.price(s, 'service', c);
            return true;
          });
          if (valid.length) {
            RD.pickCard(s, R.pick(s, valid).uid);
            CARDS.autoPutDown(s);
          } else {
            RD.cancelPick(s);
          }
        }
      }
    }
    RD.leaveShop(s);
    metrics.transitions++;
    return;
  }

  const reserve = RD.rentOf(s);
  const RAR_SCORE = { legend: 3, rare: 2, common: 1 };

  // 1. 遺物一定拿
  if (sh.relic && !sh.relic.taken && Array.isArray(sh.relic.items) && sh.relic.items.length) {
    const counts = ownedSchools(s);
    const items = sh.relic.items
      .filter((id) => D.OBJ[id] && !s.objects.includes(id) && !s.objStash.includes(id))
      .sort((a, b) => {
        const oa = D.OBJ[a], ob = D.OBJ[b];
        const sa = (counts[oa.school] || 0) * 10 + (RAR_SCORE[oa.rarity] || 1);
        const sb = (counts[ob.school] || 0) * 10 + (RAR_SCORE[ob.rarity] || 1);
        return sb - sa;
      });
    if (items.length && ensureObjectSpace(s)) {
      const b = RD.shopBuy(s, 'relic:' + items[0]);
      if (b && b.ok) {
        metrics.shopBuys++;
        maybePromoteFromStash(s);
      }
    }
  }

  // 2. 同流派的物件
  if (sh.objs && sh.objs.length) {
    let counts = ownedSchools(s);
    const matching = sh.objs
      .filter((id) => {
        const o = D.OBJ[id];
        return o && counts[o.school] > 0;
      })
      .sort((a, b) => {
        const ca = counts[D.OBJ[a].school] || 0, cb = counts[D.OBJ[b].school] || 0;
        if (cb !== ca) return cb - ca;
        return (RAR_SCORE[D.OBJ[b].rarity] || 1) - (RAR_SCORE[D.OBJ[a].rarity] || 1);
      });
    for (const id of matching) {
      const slot = 'obj:' + id;
      const cost = RD.price(s, slot);
      if (s.cr - cost < reserve) continue;
      if (!R.canEquip(s, id) && !ensureObjectSpace(s)) continue;
      const b = RD.shopBuy(s, slot);
      if (b && b.ok) {
        metrics.shopBuys++;
        maybePromoteFromStash(s);
        counts = ownedSchools(s);
      }
    }
  }

  // 3. 最常用配色的技法課
  if (sh.tech && !sh.bought.includes('tech')) {
    const topForms = topUsedForms(s);
    const cost = RD.price(s, 'tech');
    const isTop = !topForms.length || topForms.slice(0, 2).includes(sh.tech) || (s.forms && s.forms[sh.tech] > 1);
    if (isTop && s.cr - cost >= reserve) {
      const b = RD.shopBuy(s, 'tech');
      if (b && b.ok) metrics.shopBuys++;
    }
  }

  // 4. 工作室服務：打磨最高星的素材／燒掉低星素材騰出空位／複製高星素材（wear 歸零）
  if (sh.service === 'polish' && !sh.bought.includes('service')) {
    const cands = s.cards
      .filter((c) => !c.guilt && CR.starOf(c) < 5 && s.cr - RD.price(s, 'service', c) >= reserve)
      .sort((a, b) => (CR.starOf(b) - CR.starOf(a)) || ((b.value || 0) - (a.value || 0)));
    if (cands.length) {
      const b = RD.shopBuy(s, 'service');
      if (b && b.ok) {
        const p = RD.pickCard(s, cands[0].uid);
        if (p && p.ok) metrics.shopBuys++;
        else RD.cancelPick(s);
      }
    }
  } else if (sh.service === 'burn' && !sh.bought.includes('service') && s.cards.length > D.ECON.minDeck && s.cr - RD.price(s, 'service') >= reserve) {
    const cands = s.cards
      .filter((c) => !c.guilt && CR.starOf(c) <= 2)
      .sort((a, b) => (CR.starOf(a) - CR.starOf(b)) || ((a.value || 0) - (b.value || 0)));
    if (cands.length) {
      const b = RD.shopBuy(s, 'service');
      if (b && b.ok) {
        const p = RD.pickCard(s, cands[0].uid);
        if (p && p.ok) metrics.shopBuys++;
        else RD.cancelPick(s);
      }
    }
  } else if (sh.service === 'copy' && !sh.bought.includes('service') && s.cr - RD.price(s, 'service') >= reserve) {
    const cands = s.cards
      .filter((c) => !c.guilt && CR.starOf(c) >= 4)
      .sort((a, b) => (CR.starOf(b) - CR.starOf(a)) || ((b.value || 0) - (a.value || 0)));
    if (cands.length) {
      const b = RD.shopBuy(s, 'service');
      if (b && b.ok) {
        const p = RD.pickCard(s, cands[0].uid);
        if (p && p.ok) {
          CARDS.autoPutDown(s);
          metrics.shopBuys++;
        }
        else RD.cancelPick(s);
      }
    }
  }

  // 5. 素材包（選星級最高的一張；若牌庫已滿且最殘的一張已是 ★4+，避免買普通包覆蓋主力牌）
  if (sh.packs && sh.packs.length) {
    const packs = sh.packs.slice().sort((a, b) => (b === 'far' ? 1 : 0) - (a === 'far' ? 1 : 0));
    for (const pid of packs) {
      const slot = 'pack:' + pid;
      if (sh.bought.includes(slot)) continue;
      const deckCap = (D.BACKGROUNDS[s.bg] && D.BACKGROUNDS[s.bg].perk && D.BACKGROUNDS[s.bg].perk.deckMax) || 12;
      if (s.cards.length >= deckCap && pid !== 'far') {
        let worst = s.cards[0];
        s.cards.forEach((c) => {
          if ((c.wear || 0) > (worst.wear || 0) || ((c.wear || 0) === (worst.wear || 0) && c.value < worst.value && (c.wear || 0) > 0)) worst = c;
        });
        if (worst && CR.starOf(worst) >= 4) continue;
      }
      const cost = RD.price(s, slot);
      if (s.cr - cost < reserve) continue;
      const b = RD.shopBuy(s, slot);
      if (b && b.ok && s.pack && Array.isArray(s.pack.cards) && s.pack.cards.length) {
        metrics.shopBuys++;
        let bestIdx = 0;
        for (let i = 1; i < s.pack.cards.length; i++) {
          const cur = s.pack.cards[i], top = s.pack.cards[bestIdx];
          if (cur.star > top.star || (cur.star === top.star && (cur.value || 0) > (top.value || 0))) {
            bestIdx = i;
          }
        }
        RD.packPick(s, bestIdx);
        CARDS.autoPutDown(s);
      }
    }
  }

  RD.leaveShop(s);
  metrics.transitions++;
}

function runOne(bg, season, seed, strat) {
  const s = R.newRun({ bg, season, seed, mode: 'rounds' });
  const metrics = {
    plays: 0,
    discards: 0,
    shopBuys: 0,
    shopVisits: 0,
    dayChoices: 0,
    micros: 0,
    expiredGigs: 0,
    transitions: 0,
    extremes: 0,
    reversals: 0,
    forms: {},
    nightPlays: {},
    preReviewCr: {},
  };
  SNOW_NIGHTS.forEach((n) => { metrics.nightPlays[n] = []; });

  let guard = 0;
  while (!s.ended && guard++ < 200) {
    if (s.phase === 'day') {
      runDay(s, strat, metrics);
    } else if (s.phase === 'night') {
      runNight(s, strat, metrics);
    } else if (s.phase === 'shop') {
      runShop(s, strat, metrics);
    } else if (s.phase === 'review') {
      const r = RD.roundOf(s);
      metrics.preReviewCr[r] = s.cr;
      RD.review(s);
      CARDS.autoPutDown(s);
      metrics.transitions++;
    } else {
      break;
    }
  }
  if (!s.ended) s.ended = R.endingFor(s, 'archived');

  const estMin = (
    metrics.plays * 10 +
    metrics.discards * 4 +
    metrics.shopBuys * 15 +
    metrics.dayChoices * 20 +
    metrics.shopVisits * 10
  ) / 60;

  return {
    ending: s.ended.type || s.ended.id || 'archived',
    nightsDone: (s.nightLog || []).length,
    nightsPassed: (s.nightLog || []).filter((x) => x.pass).length,
    roundsPassed: s.reviewsPassed || 0,
    lost: (s.lost || []).slice(),
    objectsCount: (s.objects || []).length,
    trips: (s.stats && s.stats.trips) || 0,
    crEarned: (s.stats && s.stats.crEarned) || 0,
    chaptersDone: s.story && Array.isArray(s.story.done) ? s.story.done.length : 0,
    friendsTaken: s.story && s.story.taken ? Object.keys(s.story.taken).length : 0,
    friendsHidden: s.story && s.story.hidden ? Object.keys(s.story.hidden).length : 0,
    estMin,
    metrics,
  };
}

function runStrategy(strat) {
  const results = [];
  for (let i = 0; i < RUNS; i++) {
    const bg = BGS[i % BGS.length];
    const season = SEASONS[i % SEASONS.length];
    const seed = i + (Number(process.env.SEED0) || 0);
    results.push(runOne(bg, season, seed, strat.id));
  }

  const n = results.length;
  const avg = (fn) => results.reduce((a, r) => a + fn(r), 0) / n;
  const pct = (c) => Math.round((c / n) * 100) + '%';

  const endings = {};
  const lostRuns = { night: 0, rent: 0, soul: 0 };
  const lostTotal = { night: 0, rent: 0, soul: 0 };
  const formTotals = {};
  FORM_KEYS.forEach((k) => { formTotals[k] = 0; });
  let totalPlays = 0;
  let totalShopBuys = 0;
  let totalShopVisits = 0;

  const nightPlayScores = {};
  SNOW_NIGHTS.forEach((k) => { nightPlayScores[k] = []; });
  const n1OfReached15 = [];
  const preReviewCrs = { 1: [], 2: [], 3: [], 4: [], 5: [] };

  results.forEach((r) => {
    endings[r.ending] = (endings[r.ending] || 0) + 1;
    const seen = new Set(r.lost);
    ['night', 'rent', 'soul'].forEach((c) => {
      if (seen.has(c)) lostRuns[c]++;
    });
    r.lost.forEach((c) => {
      if (lostTotal[c] != null) lostTotal[c]++;
    });
    Object.keys(r.metrics.forms).forEach((f) => {
      formTotals[f] = (formTotals[f] || 0) + r.metrics.forms[f];
      totalPlays += r.metrics.forms[f];
    });
    totalShopBuys += r.metrics.shopBuys;
    totalShopVisits += r.metrics.shopVisits;
    SNOW_NIGHTS.forEach((k) => {
      if (r.metrics.nightPlays[k] && r.metrics.nightPlays[k].length) {
        nightPlayScores[k].push(...r.metrics.nightPlays[k]);
      }
    });
    if (r.metrics.nightPlays[15] && r.metrics.nightPlays[15].length && r.metrics.nightPlays[1] && r.metrics.nightPlays[1].length) {
      n1OfReached15.push(...r.metrics.nightPlays[1]);
    }
    [1, 2, 3, 4, 5].forEach((rd) => {
      if (r.metrics.preReviewCr[rd] != null) preReviewCrs[rd].push(r.metrics.preReviewCr[rd]);
    });
  });

  const snowMed = {};
  SNOW_NIGHTS.forEach((k) => { snowMed[k] = median(nightPlayScores[k]); });
  const snowMult = snowMed[1] > 0 && snowMed[15] > 0 ? (snowMed[15] / snowMed[1]).toFixed(1) : 'N/A';

  const winRate = ((endings.recruited || 0) / n) * 100;
  const avgNights = avg((r) => r.nightsDone);
  const avgRounds = avg((r) => r.roundsPassed);
  const medObjects = median(results.map((r) => r.objectsCount));
  const medEstMin = Math.round(median(results.map((r) => r.estMin)) * 10) / 10;
  const buysPerShop = totalShopVisits > 0 ? (totalShopBuys / totalShopVisits).toFixed(2) : '0.00';
  const buysPerRun = (totalShopBuys / n).toFixed(1);

  console.log(`\n=== ${strat.name}（${n} 局） ===`);
  console.log(`  勝率 (recruited): ${winRate.toFixed(1)}%  | 平均完成夜數: ${avgNights.toFixed(1)}  | 平均通過輪數: ${avgRounds.toFixed(2)}`);
  const endLine = Object.entries(endings)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}: ${v} (${pct(v)})`)
    .join(' · ');
  console.log(`  結局分佈: ${endLine}`);
  console.log(`  失機會局數比例: night ${pct(lostRuns.night)} (${lostTotal.night}次) · rent ${pct(lostRuns.rent)} (${lostTotal.rent}次) · soul ${pct(lostRuns.soul)} (${lostTotal.soul}次)`);
  console.log(`  單筆得分中位數: N1=${snowMed[1]} · N3=${snowMed[3]} · N6=${snowMed[6]} · N9=${snowMed[9]} · N12=${snowMed[12]} · N15=${snowMed[15]}  | 雪球倍數 (N15÷N1): ${snowMult}×`);
  console.log(`  篩選前現金中位數: R1=$${median(preReviewCrs[1])} · R2=$${median(preReviewCrs[2])} · R3=$${median(preReviewCrs[3])} · R4=$${median(preReviewCrs[4])} · R5=$${median(preReviewCrs[5])}`);
  console.log(`  市集平均購買: 每次進店 ${buysPerShop} 項（每局 ${buysPerRun} 項） | 終局物件數中位數: ${medObjects} 件 | 估算局時中位數: ${medEstMin} 分鐘`);
  const avgChapters = avg((r) => r.chaptersDone);
  const avgExtremes = avg((r) => r.metrics.extremes);
  const avgReversals = avg((r) => r.metrics.reversals);
  const avgTaken = avg((r) => r.friendsTaken);
  const avgHidden = avg((r) => r.friendsHidden);
  const avgTrips = avg((r) => r.trips);
  const avgMicros = avg((r) => r.metrics.micros);
  const avgExpired = avg((r) => r.metrics.expiredGigs);
  const avgIncome = avg((r) => r.crEarned);
  console.log(`  差事與工作: 平均每局小遊戲 ${avgMicros.toFixed(2)} 次 · 過期差事 ${avgExpired.toFixed(2)} 個 · 平均總收入 $${Math.round(avgIncome)}`);
  console.log(`  出國與故事線: 平均每局出國 ${avgTrips.toFixed(2)} 次 · 回答 ${avgChapters.toFixed(2)} 章角色線 · 極端選項 ${avgExtremes.toFixed(2)} 個 · 發生反轉 ${avgReversals.toFixed(2)} 次 · 朋友被收藏 ${avgTaken.toFixed(2)} 位 · 被藏起 ${avgHidden.toFixed(2)} 位`);
  const formLine = FORM_KEYS
    .map((f) => `${f}:${totalPlays ? Math.round((formTotals[f] / totalPlays) * 100) : 0}%`)
    .join(' ');
  console.log(`  配色分佈: ${formLine}`);

  return {
    name: strat.name,
    winRate: winRate.toFixed(1) + '%',
    avgNights: avgNights.toFixed(1),
    avgRounds: avgRounds.toFixed(2),
    snowMult: snowMult + '×',
    rentFail: pct(lostRuns.rent),
    soulFail: pct(lostRuns.soul),
    medObj: medObjects,
    estMin: medEstMin + 'm',
  };
}

const summary = STRATS.map(runStrategy);
console.log('\n=== 五輪模式總覽 ===');
console.log('策略                  | 勝率   | 完成夜 | 過輪 | 雪球(N15/N1) | 租金失誤 | 靈魂失誤 | 終局物件 | 局時');
console.log('----------------------+--------+--------+------+--------------+----------+----------+----------+------');
summary.forEach((r) => {
  console.log(
    `${r.name.padEnd(21)} | ${r.winRate.padStart(6)} | ${r.avgNights.padStart(6)} | ${r.avgRounds.padStart(4)} | ${r.snowMult.padStart(12)} | ${r.rentFail.padStart(8)} | ${r.soulFail.padStart(8)} | ${String(r.medObj).padStart(8)} | ${r.estMin.padStart(5)}`
  );
});
