#!/usr/bin/env node
// 平衡模擬：以與遊戲相同的規則，用不同策略各跑數百局，檢驗核心矛盾是否成立。
// 用法：node tools/sim.js [局數]　　DIST=1：查看訊號分佈　STRAT=名稱：只跑指定策略　TYPES=1：人類模組分佈
// 每個策略 = 行動方式 + 道德取向：
//   - 道德取向：saint（永遠選擇良心）、pragmatist（缺錢或有大好處就妥協，臨近篩選日會贖罪）、shameless（永遠選擇利益）
// 設計目標：
//   - 只工作：不會被選中；只創作：撐不下去
//   - 聖人：靈魂輕但生活困難；無恥：生活容易，但良知麻木令火花上限下降，而且早期的重量甩不掉
//   - 有節奏、懂得取捨的玩家被選中機會最高，但要管理靈魂重量
'use strict';
const path = require('path');
['data.js', 'data-events.js', 'data-incidents.js', 'data-deaths.js', 'data-jobs.js', 'data-craft.js', 'rules.js', 'create.js', 'dossier.js'].forEach((f) => require(path.join(__dirname, '../game/js', f)));
const { DATA: D, Rules: R, Dossier: DS, Create: CR } = globalThis.IE;

const RUNS = Number(process.argv[2]) || 400;

// ---------- 小遊戲表現模型（大約是一個普通玩家） ----------
function simLabel(s, ot, rng) {
  let combo = 0, cr = 0, drain = 0, correct = 0, wrong = 0, maxCombo = 0, flows = 0, flowLeft = 0;
  const items = 30 + Math.floor(rng() * 6);
  for (let i = 0; i < items; i++) {
    const gold = rng() < 0.12;
    if (rng() < 0.86) {
      const o = { ot, flow: flowLeft > 0, gold };
      cr += R.labelItemPay(s, combo, o); drain += R.labelItemDrain(s, o);
      correct++; combo++; maxCombo = Math.max(maxCombo, combo);
      if (flowLeft > 0) flowLeft--;
      if (combo === 15) { flows++; flowLeft = 6; }
    } else { wrong++; combo = 0; flowLeft = 0; }
  }
  return { cr, drain, correct, wrong, maxCombo, flows, caught: rng() < 0.3 ? 1 : 0 };
}
function simSmile(s, rng, moral) {
  let perfect = 0, good = 0, miss = 0, trapHits = 0, cr = 0, drain = 0, pours = 0, spills = 0, endorsed = 0;
  for (let i = 0; i < 40; i++) {
    const r0 = rng();
    if (r0 < 0.14) { if (rng() < 0.3) trapHits++; continue; }
    const lane = r0 < 0.42 ? 'nod' : r0 < 0.56 ? 'hold' : 'laugh';
    const r = rng();
    const kind = r < 0.45 ? 'perfect' : r < 0.8 ? 'good' : 'miss';
    if (kind === 'perfect') perfect++; else if (kind === 'good') good++; else miss++;
    cr += R.smileItemPay(s, kind, lane); drain += R.smileItemDrain(s, kind, lane);
  }
  // 每場約三句偏見言論
  for (let i = 0; i < 3; i++) {
    const nod = moral === 'shameless' || (moral === 'pragmatist' && rng() < 0.4) || (moral === 'random' && rng() < 0.5);
    if (nod) { endorsed++; cr += R.smileItemPay(s, 'perfect', 'bias'); }
  }
  for (let i = 0; i < 3; i++) {
    const r = rng();
    if (r < 0.55) { pours++; cr += R.smileItemPay(s, 'perfect', 'pour'); }
    else if (r < 0.8) cr += R.smileItemPay(s, 'good', 'pour');
    else spills++;
  }
  const total = perfect + good + miss;
  const satisfaction = Math.max(0, (perfect + 0.6 * good) / total - trapHits * 0.05 - spills * 0.05 + endorsed * 0.03);
  return { cr, drain, perfect, good, miss, trapHits, satisfaction, pours, spills, endorsed };
}
function simDive(s, rng, moral) {
  const cfg = R.diveConfig(s);
  const relics = [];
  let money = 0, weight = 0, lockers = 0;
  const fish = { sardine: 0, eel: 0, grouper: 0, jelly: 0 };
  const take = (w) => { if (weight + w > cfg.capacity) return false; weight += w; return true; };
  const findP = [0.9, 0.65, 0.45];
  cfg.zones.forEach((z, i) => {
    z.relics.forEach((id) => { if (rng() < findP[i] && take(1)) relics.push(id); });
    // 聖人不撬別人的儲物櫃
    if (moral !== 'saint') z.lockers.forEach((l) => { if (rng() < findP[i]) { lockers++; money += l.money; if (l.card && take(1)) relics.push(l.card); } });
  });
  if (cfg.legacy && rng() < 0.45 && take(1)) relics.push(cfg.legacy);
  cfg.scrap.forEach((v) => { if (rng() < 0.7 && take(1)) money += v; });
  const sard = 2 + Math.floor(rng() * 4);
  for (let i = 0; i < sard; i++) if (take(1)) { fish.sardine++; money += D.FISH.sardine.value; }
  for (let i = 0; i < cfg.fish.eel; i++) if (rng() < 0.45 && take(2)) {
    fish.eel++; money += D.FISH.eel.value; if (rng() < D.FISH.eel.cardChance) relics.push(D.FISH.eel.card);
  }
  for (let i = 0; i < cfg.fish.grouper; i++) if (rng() < 0.3 && take(4)) {
    fish.grouper++; money += D.FISH.grouper.value; if (rng() < D.FISH.grouper.cardChance) relics.push(D.FISH.grouper.card);
  }
  for (let i = 0; i < cfg.fish.jelly; i++) if (rng() < 0.25 && take(1)) { fish.jelly++; relics.push('d_jelly'); }
  // 靈魂越重越難浮上水面：更易受傷、更易溺水
  const hits = Math.floor(rng() * 3) + Math.floor(s.soul / 20);
  const drowned = rng() < 0.06 + Math.max(0, s.soul - 15) * 0.006;
  if (drowned) return { relics: relics.slice(0, Math.ceil(relics.length / 2)), money: Math.round(money / 2), fish, hits, drowned, lockers };
  return { relics, money, fish, hits, drowned, lockers };
}

function simDelivery(s, rng) {
  const cfg = R.deliveryConfig(s);
  const deliveries = Math.max(1, Math.round((4 + 3 * rng()) * cfg.speedMult));
  const late = Math.round(deliveries * (0.08 + 0.2 * rng()));
  const hits = rng() < 0.15 * cfg.boats ? 1 + Math.floor(rng() * 2) : 0;
  const on = deliveries - late;
  const cr = (on * 9.6 + late * 3) * cfg.payMult + on * 0.6 * 3 * cfg.tipMult;
  return { cr, deliveries, late, hits };
}
// 內容農場：聖人盡量選有根據的字卡，無恥的人選最煽動的
function simFarm(s, rng, moral) {
  const cfg = R.farmConfig(s);
  const T = D.FARM_TILES;
  const n = 5 + Math.floor(rng() * 4);
  let shares = 0, fakeTotal = 0, truth = 0;
  const draw = (list) => { const a = list.slice(); const out = []; while (out.length < 3) out.push(a.splice(Math.floor(rng() * a.length), 1)[0]); return out; };
  for (let h = 0; h < n; h++) {
    const tray = ['subject', 'verb', 'object'].map((k) => draw(T[k]));
    let best = null;
    tray[0].forEach((a) => tray[1].forEach((b) => tray[2].forEach((c) => {
      const sc = R.farmScore([a, b, c]);
      const v = moral === 'saint' ? -sc.fake * 10000 + sc.shares * 0.01 : moral === 'random' ? rng() : sc.shares * (moral === 'pragmatist' ? 0.7 + 0.3 * rng() : 1);
      if (!best || v > best.v) best = { v, sc };
    })));
    const mult = rng() < 0.4 ? 1.5 : 1;
    shares += Math.round(best.sc.shares * mult);
    fakeTotal += best.sc.fake;
    if (best.sc.truth) truth++;
  }
  return { cr: shares * 0.0026 * cfg.payMult, headlines: n, shares, fakeTotal: Math.round(fakeTotal * 10) / 10, truth };
}
function simBusk(s, rng) {
  const cfg = R.buskConfig(s);
  const rounds = 2 + Math.floor(rng() * 4);
  let crowd = 1, crowdMax = 1, cr = 0;
  for (let i = 0; i < rounds; i++) { cr += (1 + crowd * 0.5) * cfg.payMult; crowd = Math.min(12, crowd + 1 + (rng() < 0.3 ? 1 : 0)); crowdMax = Math.max(crowdMax, crowd); if (rng() < 0.3) crowd = Math.max(0, crowd - 2); }
  const soloNotes = Math.floor(rounds * (2 + rng() * 3));
  cr += soloNotes * 0.25 * cfg.payMult * 0.7 + crowd * cfg.payMult;
  return { cr, rounds, soloNotes, notes: soloNotes * 2 + rounds * 5, crowdMax };
}
function simClinic(s, rng, moral) {
  const cfg = R.clinicConfig(s);
  let patients = 0, illegal = 0, cr = 0;
  const slots = 4 + Math.floor(rng() * 3);
  for (let i = 0; i < slots; i++) {
    const offer = i > 0 && rng() < 0.38;
    if (offer) {
      const take = moral === 'shameless' || (moral === 'pragmatist' && s.cr < moneyNeed(s)) || (moral === 'random' && rng() < 0.5);
      if (!take) continue;
      illegal++;
    }
    patients++;
    cr += (10 + 4 * rng()) * cfg.payMult * (offer ? 2.5 : 1);
  }
  return { cr, patients, illegal, mistakes: Math.floor(rng() * 3) };
}
function simInterview(s, rng, moral) {
  return R.interviewQuestions(s).map((q) => {
    const a = D.INTERVIEW_QS[q].a;
    let pickI;
    if (moral === 'saint') { const honest = a.map((x, i) => i).filter((i) => !a[i].sin && a[i].score <= 0); pickI = honest[Math.floor(rng() * honest.length)] ?? 0; }
    else if (moral === 'random' || rng() < 0.35) pickI = Math.floor(rng() * 3);
    else { pickI = 0; a.forEach((x, i) => { if (x.score > a[pickI].score) pickI = i; }); }
    return { q, a: pickI };
  });
}

// 創作之夜：每次下筆前，如果最好的只是隨筆或短詩，就先改稿換掉最弱的牌
function runCreate(s, mode) {
  CR.start(s, mode);
  const ses = s.session;
  while (ses.plays > 0 && ses.hand.length) {
    let best = CR.bestPlay(s);
    if (best && ses.discards > 0 && (best.form === 'sketch' || best.form === 'poem')) {
      const weak = ses.hand.filter((u) => !best.uids.includes(u))
        .map((u) => s.cards.find((c) => c.uid === u)).sort((a, b) => a.value - b.value).slice(0, 3).map((c) => c.uid);
      if (weak.length && CR.discard(s, weak)) best = CR.bestPlay(s);
    }
    if (!best) break;
    CR.play(s, best.uids);
  }
  return CR.finish(s);
}

function act(s, id, rng, moral) {
  switch (id) {
    case 'label': return R.applyLabel(s, simLabel(s, false, rng));
    case 'ot': return R.applyLabel(s, simLabel(s, true, rng), { ot: true });
    case 'smile': return R.applySmile(s, simSmile(s, rng, moral));
    case 'dive': return R.applyDive(s, simDive(s, rng, moral));
    case 'delivery': return R.applyDelivery(s, simDelivery(s, rng));
    case 'farm': return R.applyFarm(s, simFarm(s, rng, moral));
    case 'busk': return R.applyBusk(s, simBusk(s, rng));
    case 'clinic': return R.applyClinic(s, simClinic(s, rng, moral));
    case 'chat': {
      const alive = R.aliveNpcs(s);
      return R.applyChat(s, alive[Math.floor(rng() * alive.length)].id);
    }
    case 'volunteer': return R.applyVolunteer(s);
    case 'rest': return R.applyRest(s);
    case 'create': return runCreate(s, 'normal');
    case 'allnighter': return runCreate(s, 'allnighter');
  }
}
const enabled = (s, id) => { const a = R.actions(s).find((x) => x.id === id); return a && a.enabled; };
const firstEnabled = (s, ids) => ids.find((id) => enabled(s, id)) || 'rest';
const moneyNeed = (s) => {
  const daysToRent = R.nextRentDay(s) - s.day + 1;
  return R.rentAmount(s) + s.debt + R.foodCost(s) * daysToRent + 40;
};
const daysToReview = (s) => R.reviewDay(s) - s.day;

// ---------- 道德抉擇 ----------
function chooseDilemma(s, moral, rng) {
  const v = R.dilemmaView(s);
  const d = D.DILEMMAS.find((x) => x.id === v.id);
  const ok = v.options.filter((o) => !o.reason).map((o) => o.i);
  const sinIdx = ok.find((i) => d.options[i].sin);
  const goodIdx = ok.find((i) => !d.options[i].sin) ?? ok[0];
  let pickI;
  if (moral === 'saint') pickI = goodIdx;
  else if (moral === 'shameless') pickI = sinIdx ?? goodIdx;
  else if (moral === 'random') pickI = ok[Math.floor(rng() * ok.length)];
  else {
    // 務實：缺錢、或者有大好處而且離重量上限還遠，就妥協
    const o = sinIdx != null ? d.options[sinIdx] : null;
    const grams = o ? o.sin * R.sinFactor(s) : 0;
    const margin = R.SOUL_LIMIT - 3 - s.soul;
    const broke = s.cr < moneyNeed(s);
    pickI = o && grams < margin && (broke || o.signal || (o.cr || 0) >= 120) ? sinIdx : goodIdx;
  }
  R.resolveDilemma(s, pickI ?? 0);
}

// ---------- 策略 ----------
function balancedAct(s, moral) {
  const need = moneyNeed(s);
  if (R.isNight(s)) {
    if (enabled(s, 'create') && s.cr >= need * 0.5 + 20) {
      if (daysToReview(s) <= 2 && s.body > 60 && enabled(s, 'allnighter')) return 'allnighter';
      return 'create';
    }
    if (s.cr < need && s.spark > 2.2 && s.body > 45) return firstEnabled(s, ['ot']);
    return 'rest';
  }
  if (s.body < 35) return 'rest';
  // 臨近篩選日而靈魂太重：去做義工
  if (moral !== 'shameless' && s.soul > R.SOUL_LIMIT - 4 && daysToReview(s) <= 4 && s.cr >= need * 0.6) return firstEnabled(s, ['volunteer']);
  if (moral === 'saint' && s.soul > 8 && s.cr >= need && s.slot === 1) return firstEnabled(s, ['volunteer']);
  // 火花太低就先救火花，否則會陷入「為交租而無限標註」的死循環
  if (s.spark < 1.2 && s.cr > R.foodCost(s) * 2) return firstEnabled(s, ['busk', 'chat', 'rest']);
  if (s.cr < need) {
    const jobs = moral === 'saint' ? ['delivery', 'clinic', 'label', 'smile'] : moral === 'shameless' ? ['farm', 'smile', 'clinic', 'label'] : ['clinic', 'delivery', 'smile', 'label', 'farm'];
    return firstEnabled(s, s.body > 40 ? jobs : jobs.filter((j) => j !== 'delivery'));
  }
  if (s.spark < 1.8) return firstEnabled(s, ['busk', 'chat', 'rest']);
  if (s.cards.length < 6) return firstEnabled(s, s.body > 45 ? (s.slot === 0 ? ['dive', 'busk'] : ['busk', 'dive', 'chat']) : ['chat', 'rest']);
  return firstEnabled(s, s.slot === 1 ? ['busk', 'chat', 'dive'] : ['chat', 'dive', 'busk']);
}
const STRATEGIES = {
  workaholic: { moral: 'shameless', act(s) {
    if (R.isNight(s)) return s.body > 30 ? firstEnabled(s, ['ot']) : 'rest';
    if (s.body < 25) return 'rest';
    return firstEnabled(s, ['smile', 'label', 'farm', 'dive']);
  } },
  courier: { moral: 'saint', act(s) {
    if (R.isNight(s)) return enabled(s, 'create') && s.cr >= 40 ? 'create' : 'rest';
    if (s.body < 40) return firstEnabled(s, ['busk', 'rest']);
    return s.slot === 0 ? firstEnabled(s, ['delivery', 'label']) : firstEnabled(s, s.cr < moneyNeed(s) ? ['delivery', 'busk'] : ['busk', 'volunteer', 'chat']);
  } },
  troll: { moral: 'shameless', act(s) {
    if (R.isNight(s)) return enabled(s, 'create') && s.cr >= 40 ? 'create' : 'rest';
    if (s.body < 30) return 'rest';
    return s.slot === 2 ? 'rest' : firstEnabled(s, s.slot === 0 ? ['farm', 'smile'] : ['farm', 'chat']);
  } },
  medic: { moral: 'pragmatist', act(s) {
    if (R.isNight(s)) return enabled(s, 'create') && s.cr >= 40 ? 'create' : 'rest';
    if (s.body < 30) return 'rest';
    if (s.soul > R.SOUL_LIMIT - 4 && daysToReview(s) <= 4) return firstEnabled(s, ['volunteer']);
    return s.slot === 0 ? firstEnabled(s, ['clinic', 'label']) : firstEnabled(s, ['chat', 'volunteer', 'clinic']);
  } },
  busker: { moral: 'saint', act(s) {
    if (R.isNight(s)) return enabled(s, 'create') && s.cr >= 40 ? 'create' : 'rest';
    if (s.body < 30) return 'rest';
    if (s.cr < moneyNeed(s) && s.slot === 0) return firstEnabled(s, ['delivery', 'label']);
    return firstEnabled(s, s.slot === 0 ? ['busk', 'chat'] : ['chat', 'busk', 'volunteer']);
  } },
  artist: { moral: 'saint', act(s) {
    if (R.isNight(s)) return enabled(s, 'create') ? 'create' : 'rest';
    if (s.body < 30) return 'rest';
    return firstEnabled(s, s.slot === 0 ? ['chat', 'dive', 'busk'] : ['dive', 'busk', 'chat']);
  } },
  balanced: { moral: 'pragmatist', act: (s) => balancedAct(s, 'pragmatist') },
  saint: { moral: 'saint', act: (s) => balancedAct(s, 'saint') },
  shameless: { moral: 'shameless', act: (s) => balancedAct(s, 'shameless') },
  diver: { moral: 'pragmatist', act(s) {
    if (R.isNight(s)) return enabled(s, 'create') && s.cr >= 40 ? 'create' : 'rest';
    if (s.body < 35) return 'rest';
    if (s.soul > R.SOUL_LIMIT - 4 && daysToReview(s) <= 3) return firstEnabled(s, ['volunteer']);
    return s.slot === 0 ? firstEnabled(s, ['dive', 'label']) : firstEnabled(s, ['label', 'dive', 'chat']);
  } },
  random: { moral: 'random', act(s, rng) {
    const opts = R.actions(s).filter((a) => a.enabled).map((a) => a.id);
    return opts[Math.floor(rng() * opts.length)];
  } },
};

function shopping(s, moral) {
  if (moral === 'random') return;
  // 保命：有會致命的病就買藥；外出危險時買頭盔或面罩
  if (R.condsInfo(s).some((c) => c.cure === 'medicine')) R.buy(s, 'medicine');
  (R.worldMods(s).outdoorDeath || []).forEach((h) => { if (h.guard && !s.gear[h.guard]) R.buy(s, h.guard); });
  if (R.flooded(s)) R.buy(s, 'moveup');
  if (s.floor === 0) R.buy(s, 'rehouse');
  if (!s.handBonus && s.cr > 450) R.buy(s, 'tools');
  if (s.objSlots < 5 && s.cr > 650) R.buy(s, 'studio');
  // 二手市集：有空位又有餘錢就買靈感物件
  R.shop(s).filter((it) => it.obj && it.enabled).forEach((it) => { if (s.objects.length < s.objSlots && s.cr > moneyNeed(s) + it.cost + 80) R.buy(s, it.id); });
  if (s.premiumUntil < s.day && s.cr > 300) R.buy(s, 'premium');
  // 有錢就買業力抵銷：天空區的做法
  while (s.soul > R.SOUL_LIMIT - 2 && daysToReview(s) <= 3 && s.cr > moneyNeed(s) + R.offsetCost(s)) {
    if (!R.buy(s, 'offset').ok) break;
  }
}

function mulberry(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function runOne(strat, bg, season, seed) {
  const rng = mulberry(seed * 7 + 13);
  const S = STRATEGIES[strat];
  const s = R.newRun({ bg, season, seed });
  const signals = [];
  let overweightFails = 0;
  while (!s.ended) {
    R.morning(s);
    shopping(s, S.moral);
    if (R.drawDilemma(s)) chooseDilemma(s, S.moral, rng);
    for (let slot = 0; slot < 3 && !s.ended; slot++) {
      s.slot = slot;
      // 普通玩家都懂得：身體太差就休息、連續工作太多天要休息、外出太危險就留在室內（隨機策略除外）
      const careful = S.moral !== 'random' && strat !== 'workaholic';
      const tired = careful && (s.body < (R.isNight(s) ? 36 : 26) || (s.noRest >= 3 && slot === 1) || ((s.conds.heatstroke || s.conds.insomnia) && slot === 1));
      let choice = tired ? 'rest' : S.act(s, rng);
      if (careful && D.OUTDOOR.includes(choice) && R.outdoorRisk(s) >= 0.03) choice = R.isNight(s) ? 'rest' : (['label', 'smile', 'farm', 'clinic', 'chat', 'rest'].find((id) => enabled(s, id)) || 'rest');
      act(s, choice, rng, S.moral);
      if (s.body <= 0) break;
    }
    if (s.day === R.reviewDay(s)) signals.push(R.signal(s));
    const rep = R.endDay(s);
    if (rep.review && rep.review.overweight && rep.review.signalOk) overweightFails++;
    if (rep.ending) break;
    if (rep.interview) R.applyInterview(s, simInterview(s, rng, S.moral));
  }
  const kind = { recruited: 'agent' }[s.ended.type] || s.ended.type;
  const dos = DS.evaluate(s, kind);
  return { ending: s.ended.type, death: s.ended.deathId, day: s.ended.day, signals, works: s.works.length, soul: s.soul,
    conscience: s.conscience, sparkMax: R.sparkMax(s), overweightFails, type: dos.archetype.id, worlds: Object.keys(s.eventsSeen).length };
}

const bgs = Object.keys(D.BACKGROUNDS);
const seasons = Object.keys(D.SEASONS);
const pct = (n, t) => (100 * n / t).toFixed(0).padStart(3) + '%';
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

// DIST=1：不設門檻，查看各策略在第 10、20、30 天的累積訊號分佈，用來設定門檻
if (process.env.DIST) {
  D.THRESHOLDS = D.REVIEW_DAYS.map(() => 1e12);
  const pctl = (arr, p) => { if (!arr.length) return '-'; const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
  for (const strat of Object.keys(STRATEGIES)) {
    const res = [];
    for (let i = 0; i < RUNS; i++) res.push(runOne(strat, bgs[i % bgs.length], seasons[Math.floor(i / bgs.length) % 3], 1000 + i));
    const line = D.REVIEW_DAYS.map((day, q) => {
      const arr = res.filter((r) => r.signals[q] != null).map((r) => r.signals[q]);
      return 'D' + day + ' 存活' + String(Math.round(100 * arr.length / RUNS)).padStart(3) + '% p50/75/90 '
        + [0.5, 0.75, 0.9].map((p) => pctl(arr, p)).join('/');
    });
    console.log(strat.padEnd(11) + line.join('  ｜ '));
  }
  process.exit(0);
}

// STRAT=名稱：只跑一個策略
const only = process.env.STRAT ? process.env.STRAT.split(',') : Object.keys(STRATEGIES);
console.log('訊號門檻：' + D.THRESHOLDS.join(' / ') + '　靈魂上限：' + R.SOUL_LIMIT + ' 克　每個策略 ' + RUNS + ' 局\n');
for (const strat of only) {
  const res = [];
  for (let i = 0; i < RUNS; i++) res.push(runOne(strat, bgs[i % bgs.length], seasons[Math.floor(i / bgs.length) % seasons.length], 1000 + i));
  const count = (f) => res.filter(f).length;
  const rec = res.filter((r) => r.ending === 'recruited');
  console.log(strat.padEnd(11) + '（' + STRATEGIES[strat].moral.padEnd(10) + '）'
    + ' 被選中' + pct(rec.length, RUNS)
    + '（' + D.REVIEW_DAYS.map((d) => 'D' + d + pct(count((r) => r.ending === 'recruited' && r.day === d), RUNS)).join(' ') + '）'
    + ' 良知太重' + pct(count((r) => r.ending === 'heavy'), RUNS)
    + ' 平凡人' + pct(count((r) => r.ending === 'ordinary'), RUNS)
    + ' 死亡' + pct(count((r) => r.ending === 'death'), RUNS)
    + ' 灰化' + pct(count((r) => r.ending === 'grey'), RUNS)
    + ' ｜超重落選 ' + avg(res.map((r) => r.overweightFails)).toFixed(2) + ' 次'
    + ' 最終靈魂 ' + avg(res.map((r) => r.soul)).toFixed(1) + ' 克'
    + ' 良知 ' + Math.round(avg(res.map((r) => r.conscience)) * 100) + '%'
    + ' 火花上限 ' + avg(res.map((r) => r.sparkMax)).toFixed(1)
    + ' 平均存活 ' + avg(res.map((r) => r.day)).toFixed(0) + ' 天');
}
// TYPES=1：人類模組分佈（所有策略、所有背景）
if (process.env.TYPES) {
  const counts = {}, byStrat = {};
  let total = 0;
  for (const strat of only) {
    byStrat[strat] = {};
    for (let i = 0; i < RUNS; i++) {
      const r = runOne(strat, bgs[i % bgs.length], seasons[Math.floor(i / bgs.length) % seasons.length], 9000 + i);
      counts[r.type] = (counts[r.type] || 0) + 1; byStrat[strat][r.type] = (byStrat[strat][r.type] || 0) + 1; total++;
    }
  }
  console.log('\n人類模組分佈（' + Object.keys(counts).length + '/' + DS.ARCHETYPES.length + ' 種出現過）：');
  DS.ARCHETYPES.forEach((a) => console.log('  ' + a.name.padEnd(10, '　') + pct(counts[a.id] || 0, total) + '　' + Object.keys(byStrat).filter((k) => byStrat[k][a.id]).map((k) => k + ':' + byStrat[k][a.id]).join(' ')));
  process.exit(0);
}
if (process.env.STRAT) process.exit(0);
console.log('\n按開局背景（balanced）：');
for (const bg of bgs) {
  const res = [];
  for (let i = 0; i < RUNS / 2; i++) res.push(runOne('balanced', bg, seasons[i % seasons.length], 5000 + i));
  const n = res.length;
  const c = (t) => pct(res.filter((r) => r.ending === t).length, n);
  console.log('  ' + D.BACKGROUNDS[bg].name.padEnd(8, '　') + ' 被選中' + c('recruited') + ' 良知太重' + c('heavy') + ' 平凡人' + c('ordinary') + ' 死亡' + c('death'));
}
