#!/usr/bin/env node
// 瀏覽器煙霧測試：用 Playwright 開啟遊戲，快速玩幾天（小遊戲結果直接注入），
// 檢查沒有 JS 錯誤、存檔可以繼續、結局畫面能正常顯示。
// 用法：node tools/smoke.js
'use strict';
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const PORT = 8091;
const URL = 'http://localhost:' + PORT + '/';

(async () => {
  const server = spawn(process.execPath, [path.join(__dirname, 'serve.js'), String(PORT)], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 600));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(m.text()); });
  // 關掉早上的手機；如果出現道德抉擇，就選第一個可選的選項
  const closePhone = async () => {
    await page.click('.phone [data-do="close"]');
    if (await page.$('#modal [data-do="pick"]')) {
      await page.click('#modal [data-do="pick"]:not([disabled])');
      await page.click('#modal [data-do="ok"]');
      dilemmas++;
    }
  };
  let dilemmas = 0;
  // 創作之夜：每次選最好的下筆，直到三次用完
  const createNight = async () => {
    await page.waitForSelector('#ctable .ct-hand .cc');
    for (let p = 0; p < 6; p++) {
      if (await page.$('.ct-end [data-end="done"]')) break;
      const uids = await page.evaluate(() => { const b = window.__IE.Create.bestPlay(window.__IE.Game.state); return b ? b.uids : []; });
      if (!uids.length) break;
      for (const u of uids) await page.click('#ctable .ct-hand .cc[data-uid="' + u + '"]');
      await page.click('#ctable [data-ct="play"]');
      await page.waitForFunction(() => !!document.querySelector('.ct-end') || !window.__IE.Craft.isBusy(), null, { timeout: 30000 });
    }
    await page.waitForSelector('.ct-end [data-end="done"]', { timeout: 30000 });
    await page.click('.ct-end [data-end="done"]');
    createdWorks++;
  };
  let createdWorks = 0;
  const window_name = (id) => id;
  const fail = async (msg) => {
    console.error('✗ ' + msg);
    if (process.env.SHOT) { try { await page.screenshot({ path: process.env.SHOT }); } catch (e) { /* 忽略 */ } }
    await browser.close(); server.kill(); process.exit(1);
  };
  const ok = (msg) => console.log('✓ ' + msg);
  try {
    await page.goto(URL);
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('ie2080.speed', '4'); });
    await page.reload();
    await page.click('[data-do="new"]');
    await page.click('[data-do="start"]');
    await closePhone();
    ok('開局');

    // 玩三天：早上工作（標註、外送、內容農場輪流）、下午潛水或表演、晚上創作或睡覺
    const MORNING = [
      ['label', { cr: 95, drain: 0.35, correct: 30, wrong: 2, maxCombo: 16, flows: 1, caught: 0 }],
      ['delivery', { cr: 80, deliveries: 6, late: 1, hits: 1 }],
      ['farm', { cr: 70, headlines: 6, shares: 24000, fakeTotal: 3.4, truth: 1 }],
    ];
    const AFTERNOON = [
      ['dive', { relics: ['d_album', 'd_crayon'], money: 20, fish: { sardine: 2, eel: 1, grouper: 0, jelly: 0 }, hits: 0, drowned: false }],
      ['busk', { cr: 22, rounds: 4, soloNotes: 12, notes: 40, crowdMax: 6 }],
      ['dive', { relics: ['d_album'], money: 12, fish: { sardine: 1, eel: 0, grouper: 0, jelly: 0 }, hits: 1, drowned: false }],
    ];
    for (let d = 0; d < 3; d++) {
      for (const [kind, res] of [MORNING[d], AFTERNOON[d]]) {
        await page.click('.act[data-id="' + kind + '"]');
        await page.evaluate(([k, r]) => window.__IE.Game.applyMicroResult(k, r), [kind, res]);
        await page.click('#modal [data-do="ok"]');
      }
      const canCreate = await page.$('.act[data-id="create"]:not([disabled])');
      if (canCreate) {
        await canCreate.click();
        if (await page.$('#modal [data-do="close"]')) await page.click('#modal [data-do="close"]'); // 第一次的教學
        await createNight();
      } else {
        await page.click('.act[data-id="rest"]');
        await page.click('#modal [data-do="ok"]');
      }
      await page.waitForSelector('#modal [data-do="ok"]', { timeout: 8000 });
      await page.click('#modal [data-do="ok"]');
      await closePhone();
    }
    const day = await page.evaluate(() => window.__IE.Game.state.day);
    if (day !== 4) await fail('應該是第 4 天，現在是第 ' + day + ' 天');
    ok('玩完三天，現在是第 ' + day + ' 天（遇到 ' + dilemmas + ' 個道德抉擇，創作了 ' + createdWorks + ' 件作品）');
    if (!createdWorks) await fail('三天都沒有創作');
    const works = await page.evaluate(() => window.__IE.Game.state.works.map((w) => w.name + ' ' + w.score));
    ok('作品：' + works.join('、'));

    // 存檔 → 重新載入 → 繼續
    await page.reload();
    await page.waitForSelector('[data-do="continue"]');
    await page.click('[data-do="continue"]');
    const resumed = await page.evaluate(() => window.__IE.Game.state.day);
    if (resumed !== 4) await fail('繼續後的天數不正確：' + resumed);
    ok('自動存檔與繼續');

    // 能力值面板
    await page.click('[data-hud="stats"]');
    const bars = await page.$$eval('#modal .sb', (els) => els.length);
    if (bars !== 12) await fail('能力值面板應有 12 項，現在有 ' + bars + ' 項');
    await page.click('#modal [data-do="close"]');
    ok('能力值面板（12 項）');

    // 第三期：房間、地圖、世界、旅行、畫廊、古董、家具
    for (const v of ['room', 'city', 'map', 'world']) {
      await page.click('#views [data-view="' + v + '"]');
      const okScene = await page.evaluate((v) => { const I = window.__IE, M = I.Maps; return I.Game.scene === { room: M.Room, city: I.Scenes.City, map: M.CityMap, world: M.WorldMap }[v]; }, v);
      if (!okScene) await fail('切換畫面失敗：' + v);
    }
    ok('切換畫面：房間、浮城、地圖、世界');
    await page.evaluate(() => { window.__IE.Game.state.cr = 5000; window.__IE.Game.state.body = 80; });
    const pick = (view, id) => page.evaluate(([view, id]) => { const M = window.__IE.Maps; const sc = { room: M.Room, map: M.CityMap, world: M.WorldMap, trip: M.Trip }[view]; M.onPick(view, sc.spots().find((x) => x.id === id)); }, [view, id]);
    await page.click('#views [data-view="room"]');
    await pick('room', 'decor');
    await page.click('#modal [data-do="buy"][data-id="bed"]');
    await page.click('#modal [data-do="close"]');
    if (!(await page.evaluate(() => !!window.__IE.Game.state.decor.bed))) await fail('買不到彈簧床');
    await page.click('#views [data-view="map"]');
    await pick('map', 'antique');
    await page.click('#modal .ant-item [data-do="buy"]:not([disabled])');
    await page.click('#modal .ant-sell [data-do="sellcard"]:not([disabled])');
    await page.click('#modal [data-do="close"]');
    await pick('map', 'gallery');
    await page.click('#modal [data-do="sell"]:not([disabled])');
    await page.click('#modal [data-do="close"]');
    const sold = await page.evaluate(() => window.__IE.Game.state.works.filter((w) => w.sold).length);
    if (sold !== 1) await fail('畫廊沒有賣出作品');
    ok('家具、古董市場（買賣）、天空區畫廊（賣出 1 件作品）');
    await page.click('#views [data-view="world"]');
    await pick('world', 'neotokyo');
    await page.click('#modal [data-do="go"]');
    await page.click('#modal [data-do="ok"]');
    if (!(await page.evaluate(() => window.__IE.Game.state.trip && window.__IE.Game.scene === window.__IE.Maps.Trip))) await fail('出發後沒有在旅途中');
    await page.click('#panel [data-do="souvenir"]');
    await page.waitForSelector('#modal .store-item');
    await page.click('#modal [data-do="close"]');
    await page.click('.act[data-id^="site:"]:not([disabled])');
    await page.click('#modal [data-do="ok"]');
    const origin = await page.evaluate(() => window.__IE.Game.state.cards.filter((c) => c.origin === 'asia').length);
    if (!origin) await fail('探索後沒有得到旅行素材');
    await page.click('.act[data-id="rest"]');
    await page.click('#modal [data-do="ok"]');
    await page.waitForSelector('#modal [data-do="ok"]', { timeout: 8000 });
    await page.click('#modal [data-do="ok"]');
    await closePhone();
    await page.click('.act[data-id="tripback"]');
    await page.click('#modal [data-do="ok"]');
    const back = await page.evaluate(() => { const s = window.__IE.Game.state; return { trip: s.trip, day: s.day, scene: window.__IE.Game.scene === window.__IE.Maps.Room, glow: s.glow }; });
    if (back.trip || !back.scene) await fail('提早回程失敗');
    ok('旅行：新東京（探索得到 ' + origin + ' 張亞洲素材，第 ' + back.day + ' 天回到浮城）');
    // 第四期：浮城百貨（分類貨架）
    await page.evaluate(() => { window.__IE.Game.state.cr = 2000; });
    await page.click('#panel [data-do="store"]');
    await page.click('#modal [data-do="tab"][data-id="safe"]');
    await page.click('#modal [data-do="buy"][data-id="lifejacket"]');
    await page.click('#modal [data-do="tab"][data-id="life"]');
    await page.click('#modal [data-do="buy"][data-id="blindbox"]');
    await page.click('#modal [data-do="close"]');
    const gear = await page.evaluate(() => window.__IE.Game.state.gear.lifejacket);
    if (!gear) await fail('浮城百貨買不到救生衣');
    ok('浮城百貨：救生衣、靈感盲盒、紀念品店');
    // 第五期：新小遊戲與分級獎勵
    await page.click('.act[data-id="garden"]');
    await page.evaluate(() => window.__IE.Game.applyMicroResult('garden', { harvest: 15, golden: 1, stolen: 0, wilted: 0, watered: 6, mutant: 0 }));
    await page.waitForSelector('#modal .rank-stamp');
    const rank = await page.textContent('#modal .rank-stamp b');
    await page.click('#modal [data-do="ok"]');
    ok('天台菜園：評級 ' + rank);
    // 第八期：親手玩過之後可以「照舊做」（最多 A 級）
    const autoT = await page.evaluate(() => window.__IE.Auto.target(window.__IE.Game.state, 'garden'));
    if (autoT !== 'A') await fail('照舊做的評級不對：' + autoT);
    const autoRep = await page.evaluate(() => { const s = window.__IE.Game.state; const r = window.__IE.Auto.result(s, 'garden'); return window.__IE.Jobs2.rankOf(window.__IE.Jobs2.PERF.garden(r)).id; });
    if (autoRep !== 'A') await fail('照舊做生成的結果不是 A 級：' + autoRep);
    ok('第八期：天台菜園可以「照舊做」（自動 ' + autoT + ' 級）');

    // 第六期：關卡之夜（第 7 天社區小展）、工具卡、預計得分、牌庫；第七期：媒材、流派加成、轉檔
    await page.evaluate(() => { const s = window.__IE.Game.state; s.day = 4; s.slot = 2; s.body = 80; s.cr = 500; s.tools = ['lamp', 'convert']; s.morning = { day: 4, feed: [] }; s.trip = null; s.stageDone = {};
      s.objects = ['tidegauge', 'sandbag']; s.water = 3; });
    await page.click('#views [data-view="room"]');
    await page.click('.act[data-id="create"]');
    if (await page.$('#modal [data-do="close"]')) await page.click('#modal [data-do="close"]');
    await page.waitForSelector('#ctable .ct-stagebar:not([hidden])');
    // 背景音樂：關卡之夜（社區小展）播 Pixel Funk
    const bgm = await page.evaluate(() => ({ cur: window.__IE.BGM.current, failed: window.__IE.BGM.failed }));
    if (bgm.cur !== 'funk') await fail('關卡之夜的背景音樂不對：' + bgm.cur);
    if (bgm.failed.length) await fail('背景音樂載入失敗：' + bgm.failed.join('、'));
    const playsBefore = await page.evaluate(() => window.__IE.Game.state.session.plays);
    await page.click('#ctable .ct-tool[data-tool="0"]');
    const playsAfter = await page.evaluate(() => window.__IE.Game.state.session.plays);
    if (playsAfter !== playsBefore + 1) await fail('加班燈沒有生效');
    await page.click('#ctable [data-ct="deck"]');
    await page.waitForSelector('#modal .dk-rows');
    await page.click('#modal [data-do="close"]');
    const u0 = await page.evaluate(() => window.__IE.Game.state.session.hand[0]);
    await page.click('#ctable .ct-hand .cc[data-uid="' + u0 + '"]');
    const est = await page.textContent('#ctable .ct-est');
    if (!/預計/.test(est)) await fail('沒有預計得分');
    await page.click('#ctable .ct-hand .cc[data-uid="' + u0 + '"]');
    // 第七期：每張手牌都有媒材標記；兩件水淹流物件觸發流派加成；轉檔令選中的素材變成同一媒材
    const meds = await page.$$eval('#ctable .ct-hand .cc-med', (els) => els.map((e) => e.textContent));
    const handN = await page.evaluate(() => window.__IE.Game.state.session.hand.length);
    if (meds.length !== handN) await fail('媒材標記數目不對：' + meds.length + '/' + handN);
    const sch = await page.textContent('#ctable .ct-schools .sch.on');
    if (!/水淹流 2\/3/.test(sch)) await fail('流派加成沒有顯示：' + sch);
    const two = await page.evaluate(() => window.__IE.Game.state.session.hand.slice(0, 2));
    for (const u of two) await page.click('#ctable .ct-hand .cc[data-uid="' + u + '"]');
    await page.click('#ctable .ct-tool[data-tool="0"]');
    const conv = await page.evaluate((us) => { const s = window.__IE.Game.state; return us.map((u) => window.__IE.DATA.mediumOf(s.cards.find((c) => c.uid === u))); }, two);
    if (conv[0] !== conv[1]) await fail('轉檔沒有生效');
    ok('第七期：手牌 ' + handN + ' 張都有媒材（' + meds.join('') + '）；' + sch.slice(0, 7) + ' 流派加成；轉檔後兩張都是「' + conv[0] + '」');
    await createNight();
    const stage = await page.evaluate(() => window.__IE.Game.state.stageDone && window.__IE.Game.state.stageDone[4]);
    if (!stage) await fail('關卡沒有結算');
    ok('第 1 關社區小展：' + (stage === 'pass' ? '入選' : '落選') + '（' + est.trim().slice(0, 24) + '…）');
    await page.waitForSelector('#modal [data-do="ok"]', { timeout: 10000 });
    await page.click('#modal [data-do="ok"]');
    await closePhone();

    // 夢境面試：跳到篩選日前兩晚（標準模式第 10 天）
    await page.evaluate(() => { const s = window.__IE.Game.state; s.quarter = 0; s.day = window.__IE.Rules.reviewDay(s) - 2; s.slot = 2; s.body = 80; s.morning = { day: s.day, feed: [] }; });
    if (!(await page.$('.phone'))) await page.click('[data-hud="phone"]');
    await closePhone();
    await page.click('.act[data-id="rest"]');
    await page.click('#modal [data-do="ok"]');
    await page.waitForSelector('#modal [data-do="ok"]', { timeout: 8000 });
    await page.click('#modal [data-do="ok"]');
    await page.waitForSelector('#modal .d-text');
    await page.click('#modal [data-do="ok"]');
    const before = await page.evaluate(() => window.__IE.Game.state.bonusSignal);
    // 直接驅動面試小遊戲：每題按 1，然後快轉
    await page.evaluate(() => {
      const G = window.__IE.Game, m = G.micro;
      const step = (n) => { for (let i = 0; i < n && G.micro === m; i++) m.update(0.05); };
      step(40);
      for (let q = 0; q < 5; q++) { m.key(' ', true); m.key('1', true); step(70); }
      step(80);
    });
    await page.waitForSelector('#modal [data-do="ok"]');
    const after = await page.evaluate(() => window.__IE.Game.state.bonusSignal);
    await page.click('#modal [data-do="ok"]');
    await closePhone();
    ok('夢境面試（訊號 ' + before + ' → ' + after + '）');

    // 強制死亡 → 結局
    await page.evaluate(() => { window.__IE.Game.state.body = 3; });
    if (await page.$('.phone [data-do="close"]')) await closePhone();
    await page.click('.act[data-id="label"]');
    await page.evaluate(() => window.__IE.Game.applyMicroResult('label', { cr: 50, drain: 0.2, correct: 20, wrong: 1, maxCombo: 8 }));
    await page.click('#modal [data-do="ok"]');
    await page.waitForSelector('.ending.death');
    ok('死亡結局：' + (await page.textContent('.ending .epitaph')));
    await page.waitForSelector('.dossier .d-class h3');
    const stamps = await page.$$eval('.dossier .dstamp', (els) => els.map((e) => e.textContent));
    ok('人類樣本檔案：' + (await page.textContent('.dossier .d-class h3')) + '｜印章 ' + stamps.join('、'));
    await page.waitForSelector('.meta-result .mr-xp');
    const prof = await page.evaluate(() => { const m = JSON.parse(localStorage.getItem('ie2080.meta')) || {}; return { xp: m.lastXp, level: m.level || 1, ach: Object.keys(m.ach || {}) }; });
    if (!prof.xp) throw new Error('結局沒有發放人才檔案經驗');
    ok('局外結算：經驗 +' + prof.xp + '，人才檔案 Lv.' + prof.level + '，成就 ' + (prof.ach.join('、') || '（沒有）'));
    const md = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('ie2080.meta')).deaths || {}; } catch (e) { return {}; } });
    if (!Object.keys(md).length) await fail('死亡圖鑑沒有記錄');
    // 人才扭蛋機
    await page.evaluate(() => { const m = JSON.parse(localStorage.getItem('ie2080.meta')); m.tickets = 6; m.goldTickets = 1; m.rainbowTickets = 1; localStorage.setItem('ie2080.meta', JSON.stringify(m)); });
    await page.reload();
    // 第八期：對局紀錄
    await page.click('[data-do="history"]');
    await page.waitForSelector('#modal .h-row');
    const hrow = (await page.textContent('#modal .h-row')).replace(/\s+/g, ' ').trim();
    await page.click('#modal [data-do="close"]');
    ok('對局紀錄：' + hrow);
    // 第八期：外星扭蛋券必定抽到 SR 或以上
    await page.click('[data-do="gacha"]');
    await page.click('#modal [data-do="pull"][data-id="rainbow"]');
    await page.waitForSelector('#modal .gacha-result', { timeout: 6000 });
    const got = (await page.textContent('#modal .gacha-result h3')).trim();
    const rar = await page.$eval('#modal .gacha-result', (el) => el.className);
    if (!/r-(SR|UR)/.test(rar)) await fail('外星扭蛋券沒有抽到 SR 或以上');
    const pulls = await page.evaluate(() => JSON.parse(localStorage.getItem('ie2080.meta')).pulls);
    if (pulls !== 1) await fail('扭蛋次數沒有記錄');
    await page.click('#modal [data-do="close"]');
    await page.click('[data-do="new"]');
    const open = await page.$$eval('.su-grid .ch:not(.locked)', (els) => els.length);
    if (open !== 7) await fail('新存檔應該有六個 R 角色加一個抽到的角色，現在有 ' + open + ' 個');
    const abil = (await page.textContent('.su-detail .sd-abil b')).trim();
    await page.click('[data-do="mode"][data-id="long"]');
    const longSel = await page.$eval('[data-do="mode"][data-id="long"]', (el) => el.classList.contains('sel'));
    if (!longSel) await fail('選不到長篇模式');
    ok('人才扭蛋機（外星扭蛋券）：' + rar.match(/r-(SR|UR)/)[1] + '「' + got + '」，招牌能力「' + abil + '」（可用角色 ' + open + '/20）');
    ok('死亡圖鑑記錄：' + Object.keys(md).map((k) => window_name(k)).join('、'));

    if (errors.length) await fail('有錯誤：\n' + errors.join('\n'));
    ok('沒有 JS 錯誤');
  } catch (e) {
    await fail(e.message + '\n' + errors.join('\n'));
  }
  await browser.close();
  server.kill();
})();
