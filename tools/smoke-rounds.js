#!/usr/bin/env node
// 五輪模式瀏覽器煙霧測試：用 Playwright 開啟遊戲，固定新局種子，
// 檢查白天面板、三張生活卡、換一批、小遊戲「照舊做」與進入創作桌，確保沒有 JS 錯誤。
// 用法：node tools/smoke-rounds.js
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const PORT = 8092;
const URL = 'http://localhost:' + PORT + '/';

(async () => {
  const server = spawn(process.execPath, [path.join(__dirname, 'serve.js'), String(PORT)], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 600));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  // 固定新局的種子（SEED 環境變數可以更換），確保每次走同一條路
  const SEED = Number(process.env.SEED || 20801031);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(m.text()); });

  const closeDilemma = async () => {
    if (await page.$('#modal [data-do="pick"]')) {
      await page.click('#modal [data-do="pick"]:not([disabled])');
      await page.click('#modal [data-do="ok"]');
    }
  };

  const fail = async (msg) => {
    console.error('✗ ' + msg);
    if (process.env.SHOT) { try { await page.screenshot({ path: process.env.SHOT }); } catch (e) { /* 忽略 */ } }
    await browser.close();
    server.kill();
    process.exit(1);
  };
  const ok = (msg) => console.log('✓ ' + msg);

  try {
    await page.goto(URL);
    await page.evaluate((seed) => {
      localStorage.clear();
      localStorage.setItem('ie2080.speed', '4');
      localStorage.setItem('ie2080.noEncounter', '1');
      localStorage.setItem('ie2080.seed', String(seed));
    }, SEED);
    await page.reload();

    // 1. 開新局（五輪模式）
    await page.evaluate((seed) => {
      window.__IE.Game.newGame('copywriter', 'storm', { mode: 'rounds', seed });
    }, SEED);
    await closeDilemma();
    ok('五輪模式開新局（seed=' + SEED + '）');

    // 2. 看到 .rd-day 和三張 .rd-card；.rd-map .rm-night 有 15 個
    await page.waitForSelector('.rd-day');
    const cardN = await page.$$eval('.rd-day .rd-card[data-card]', (els) => els.length);
    if (cardN !== 3) await fail('白天面板應有 3 張 .rd-card，現在有 ' + cardN + ' 張');
    const mapN = await page.$$eval('.rd-map .rm-night', (els) => els.length);
    if (mapN !== 15) await fail('.rd-map .rm-night 應有 15 個，現在有 ' + mapN + ' 個');
    if (process.env.SHOTS) {
      fs.mkdirSync(path.join(__dirname, '..', 'docs', 'shots'), { recursive: true });
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-06-day-desktop.png'), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(250);
      const mob = await page.evaluate(() => {
        const sw = document.documentElement.scrollWidth;
        const hs = Array.from(document.querySelectorAll('.rd-day button')).map((b) => Math.round(b.getBoundingClientRect().height));
        return { sw, minH: Math.min(...hs) };
      });
      if (mob.sw > 390) await fail('手機 390px 出現橫向捲動：scrollWidth=' + mob.sw);
      if (mob.minH < 44) await fail('手機按鈕高度不足 44px：minH=' + mob.minH);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-06-day-mobile.png'), fullPage: true });
      await page.setViewportSize({ width: 1280, height: 800 });
    }
    ok('白天面板：3 張生活卡、15 晚進度點');

    // 3. 按「換一批」：錢少了 ECON.offerReroll[0]
    const beforeCr = await page.evaluate(() => window.__IE.Game.state.cr);
    const rerollCost = await page.evaluate(() => window.__IE.DATA.ECON.offerReroll[0]);
    await page.click('.rd-day [data-do="reroll"]');
    const afterCr = await page.evaluate(() => window.__IE.Game.state.cr);
    if (beforeCr - afterCr !== rerollCost) {
      await fail('換一批扣錢不正確：應扣 $' + rerollCost + '，實際 ' + beforeCr + ' → ' + afterCr);
    }
    ok('換一批：扣減 $' + rerollCost + '（$' + beforeCr + ' → $' + afterCr + '）');

    // 4. 找一張小遊戲卡（沒有就換一批直到有）按下，再按 [data-do="byauto"]，按報告的確定，之後創作桌（#ctable）打開
    let microCardId = null;
    for (let tries = 0; tries < 10; tries++) {
      microCardId = await page.evaluate(() => {
        const s = window.__IE.Game.state, RD = window.__IE.Rounds;
        const of = RD.offer(s);
        return (of.ids || []).find((id) => {
          const info = RD.cardInfo(s, id);
          return info && info.enabled && info.micro;
        }) || null;
      });
      if (microCardId) break;
      await page.evaluate(() => { window.__IE.Game.state.cr = Math.max(window.__IE.Game.state.cr, 200); });
      await page.click('.rd-day [data-do="reroll"]');
    }
    if (!microCardId) await fail('找不到可用的小遊戲生活卡');

    await page.click('.rd-day .rd-card[data-card="' + microCardId + '"]');
    await page.waitForSelector('#modal [data-do="byhand"]');
    await page.waitForSelector('#modal [data-do="byauto"]');
    await page.click('#modal [data-do="byauto"]');

    await page.waitForSelector('#modal [data-do="ok"]');
    const hasBodyDelta = await page.$('#modal .delta.body');
    if (hasBodyDelta) await fail('五輪模式的報告視窗不應顯示身體變化');
    await page.click('#modal [data-do="ok"]');

    await page.waitForSelector('#ctable .ct-hand .cc');
    ok('選小遊戲卡「' + microCardId + '」→ 照舊做 → 報告確定 → 創作桌（#ctable）打開');

    if (errors.length) await fail('有 JS 錯誤：\n' + errors.join('\n'));
    ok('沒有 JS 錯誤');
  } catch (e) {
    await fail(e.message + '\n' + errors.join('\n'));
  }
  await browser.close();
  server.kill();
})();
