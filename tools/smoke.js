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
  const fail = async (msg) => { console.error('✗ ' + msg); await browser.close(); server.kill(); process.exit(1); };
  const ok = (msg) => console.log('✓ ' + msg);
  try {
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
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
        const cards = await page.$$('#modal .craft-grid .card');
        for (let i = 0; i < Math.min(3, cards.length); i++) await (await page.$$('#modal .craft-grid .card'))[i].click();
        await page.click('#modal [data-do="make"]');
        await page.click('#modal [data-do="skip"]');
        await page.click('#modal [data-do="done"]');
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
    ok('玩完三天，現在是第 ' + day + ' 天（遇到 ' + dilemmas + ' 個道德抉擇）');

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

    // 夢境面試：跳到第 18 天晚上
    await page.evaluate(() => { const s = window.__IE.Game.state; s.day = 18; s.slot = 2; s.body = 80; s.morning = { day: 18, feed: [] }; });
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

    if (errors.length) await fail('有錯誤：\n' + errors.join('\n'));
    ok('沒有 JS 錯誤');
  } catch (e) {
    await fail(e.message + '\n' + errors.join('\n'));
  }
  await browser.close();
  server.kill();
})();
