#!/usr/bin/env node
// 瀏覽器煙霧測試：用 Playwright 開遊戲，快速玩幾日（小遊戲結果直接注入），
// 檢查冇 JS 錯誤、存檔可以繼續、結局畫面出到。
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
  const fail = async (msg) => { console.error('✗ ' + msg); await browser.close(); server.kill(); process.exit(1); };
  const ok = (msg) => console.log('✓ ' + msg);
  try {
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.click('[data-do="new"]');
    await page.click('[data-do="start"]');
    await page.click('.phone [data-do="close"]');
    ok('開局');

    // 玩三日：朝早標註、晏晝潛水、夜晚創作或者瞓覺
    for (let d = 0; d < 3; d++) {
      await page.click('.act[data-id="label"]');
      await page.evaluate(() => window.__IE.Game.applyMicroResult('label', { cr: 95, drain: 0.35, correct: 30, wrong: 2, maxCombo: 16 }));
      await page.click('#modal [data-do="ok"]');
      await page.click('.act[data-id="dive"]');
      await page.evaluate(() => window.__IE.Game.applyMicroResult('dive', { relics: ['d_album', 'd_crayon'], sold: 20, hits: 0, drowned: false }));
      await page.click('#modal [data-do="ok"]');
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
      await page.click('.phone [data-do="close"]');
    }
    const day = await page.evaluate(() => window.__IE.Game.state.day);
    if (day !== 4) await fail('應該係第 4 日，而家係第 ' + day + ' 日');
    ok('玩完三日，而家第 ' + day + ' 日');

    // 存檔 → 重新載入 → 繼續
    await page.reload();
    await page.waitForSelector('[data-do="continue"]');
    await page.click('[data-do="continue"]');
    const resumed = await page.evaluate(() => window.__IE.Game.state.day);
    if (resumed !== 4) await fail('繼續之後日數唔啱：' + resumed);
    ok('自動存檔同繼續');

    // 強制死亡 → 結局
    await page.evaluate(() => { window.__IE.Game.state.body = 3; });
    if (await page.$('.phone [data-do="close"]')) await page.click('.phone [data-do="close"]');
    await page.click('.act[data-id="label"]');
    await page.evaluate(() => window.__IE.Game.applyMicroResult('label', { cr: 50, drain: 0.2, correct: 20, wrong: 1, maxCombo: 8 }));
    await page.click('#modal [data-do="ok"]');
    await page.waitForSelector('.ending.death');
    ok('死亡結局：' + (await page.textContent('.ending .epitaph')));

    if (errors.length) await fail('有錯誤：\n' + errors.join('\n'));
    ok('冇 JS 錯誤');
  } catch (e) {
    await fail(e.message + '\n' + errors.join('\n'));
  }
  await browser.close();
  server.kill();
})();
