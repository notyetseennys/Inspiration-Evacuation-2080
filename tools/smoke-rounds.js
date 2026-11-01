#!/usr/bin/env node
// 五輪模式瀏覽器煙霧測試：用 Playwright 開啟遊戲，固定新局種子，
// 檢查白天面板、換一批、小遊戲、創作桌（今晚目標、收工演出、結束面板）、市集（開包、技法課、工作室服務）、重新載入，確保沒有 JS 錯誤。
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

    // 5. 檢查創作桌上方進度列與第一筆前隱藏離開掣
    const goalLbl = await page.$eval('#ctable .ct-goal .lbl', (el) => el.textContent);
    const hasNightCls = await page.$eval('#ctable .ct-goal', (el) => el.classList.contains('night'));
    const leaveHidden = await page.$eval('#ctable [data-ct="leave"]', (el) => el.hidden);
    if (goalLbl !== '今晚目標' || !hasNightCls) await fail('創作桌進度列應為「今晚目標」並帶 .night');
    if (!leaveHidden) await fail('第一筆之前應隱藏 [data-ct="leave"]');

    // 收工演出只出現約一秒：用 MutationObserver 記下它曾經出現（WO-15-07 審核加入）
    await page.evaluate(() => {
      window.__sawCleared = false;
      new MutationObserver(() => { if (document.querySelector('#ctable .ct-cleared')) window.__sawCleared = true; }).observe(document.body, { childList: true, subtree: true });
    });
    // 6. 選建議的第一手牌（[data-sg="0"]；如果沒有建議就選前五張 .ct-hand .cc），按 .ct-play，等 .ct-end 出現
    let clearedShotDone = false;
    for (let playTurn = 0; playTurn < 6; playTurn++) {
      if (await page.$('#ctable .ct-end')) break;
      const sg0 = await page.$('#ctable [data-sg="0"]');
      if (sg0) {
        await sg0.click();
      } else {
        const cards = await page.$$('#ctable .ct-hand .cc:not(.forbidden)');
        for (let i = 0; i < Math.min(5, cards.length); i++) await cards[i].click();
      }
      await page.click('#ctable .ct-play');
      if (process.env.SHOTS && !clearedShotDone) {
        try {
          await page.waitForSelector('#ctable .ct-cleared', { timeout: 15000 });
          await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-07-cleared-desktop.png') });
          await page.setViewportSize({ width: 390, height: 844 });
          await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-07-cleared-mobile.png') });
          await page.setViewportSize({ width: 1280, height: 800 });
          clearedShotDone = true;
        } catch (e) { /* 這一筆未過關，繼續下一筆 */ }
      }
      // 等這一筆演出完成（回到可操作狀態或進入 .ct-end）
      await page.waitForFunction(() => {
        const end = document.querySelector('#ctable .ct-end');
        const busy = window.__IE && window.__IE.Craft && window.__IE.Craft.isBusy();
        return !!end || !busy;
      }, { timeout: 15000 });
    }
    await page.waitForSelector('#ctable .ct-end', { timeout: 15000 });
    const n1 = await page.evaluate(() => { const s = window.__IE.Game.state; const g = (s.nightLog || [])[s.nightLog.length - 1]; return { pass: !!(g && g.pass), saw: window.__sawCleared }; });
    if (n1.pass && !n1.saw) await fail('第 1 晚達標，但沒有出現收工演出 .ct-cleared');
    ok('創作桌下筆並進入結束面板（.ct-end）' + (n1.pass ? '；達標時出現過收工演出 .ct-cleared' : ''));

    // 7. 檢查 .ct-end 裡沒有 .ct-goal.end（本季訊號列）；按 [data-end="shop"]
    const hasEndGoal = await page.$('#ctable .ct-end .ct-goal.end');
    if (hasEndGoal) await fail('五輪模式結束面板不應顯示 .ct-goal.end（本季訊號列）');
    await page.waitForSelector('#ctable .ct-end [data-end="shop"]');
    if (process.env.SHOTS) {
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-07-end-desktop.png') });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-07-end-mobile.png') });
      await page.setViewportSize({ width: 1280, height: 800 });
    }
    await page.click('#ctable .ct-end [data-end="shop"]');
    ok('結束面板無本季訊號列，按「前往市集」');

    // 8. 等 .rd-shop 出現；注入 s.cr = 500，重繪市集
    await page.waitForSelector('#modal .rd-shop');
    await page.evaluate(() => {
      window.__IE.Game.state.cr = 500;
      window.__IE.Game.roundsShop();
    });
    await page.waitForSelector('#modal .rd-shop');
    // 檢查手機 390px 市集無橫向捲軸且每個按鈕高度 >= 44px
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    const shopMob = await page.evaluate(() => {
      const sw = document.documentElement.scrollWidth;
      const hs = Array.from(document.querySelectorAll('#modal .rd-shop button')).map((b) => Math.round(b.getBoundingClientRect().height));
      return { sw, minH: Math.min(...hs) };
    });
    if (shopMob.sw > 390) await fail('手機 390px 市集出現橫向捲動：scrollWidth=' + shopMob.sw);
    if (shopMob.minH < 44) await fail('手機市集按鈕高度不足 44px：minH=' + shopMob.minH);
    if (process.env.SHOTS) {
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-07-shop-mobile.png') });
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(150);
    if (process.env.SHOTS) {
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-07-shop-desktop.png') });
    }
    ok('二手市集（.rd-shop）開啟並完成手機 390px 版面檢查');

    // 9. 按第一包素材包 .rs-item[data-slot^="pack:"] button:not([disabled])；等 .rd-pack 出現，檢查有 3 張 .rp-card；按 [data-i="0"]，檢查 s.cards.length 加了 1
    const cardsBefore = await page.evaluate(() => window.__IE.Game.state.cards.length);
    await page.click('#modal .rs-item[data-slot^="pack:"] button:not([disabled])');
    await page.waitForSelector('#modal .rd-pack');
    const packCardN = await page.$$eval('#modal .rd-pack .rp-card', (els) => els.length);
    if (packCardN !== 3) await fail('.rd-pack 應有 3 張 .rp-card，現在有 ' + packCardN + ' 張');
    if (process.env.SHOTS) {
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-07-pack-desktop.png') });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-07-pack-mobile.png') });
      await page.setViewportSize({ width: 1280, height: 800 });
    }
    await page.click('#modal .rd-pack [data-i="0"]');
    await page.waitForSelector('#modal .rd-shop');
    const cardsAfter = await page.evaluate(() => window.__IE.Game.state.cards.length);
    if (cardsAfter !== cardsBefore + 1) await fail('開包選卡後 s.cards.length 應 +1（' + cardsBefore + ' → ' + cardsAfter + '）');
    ok('開包三選一（.rd-pack）：素材庫 ' + cardsBefore + ' → ' + cardsAfter + ' 張');

    // 10. 按 .rs-item[data-slot="tech"] button:not([disabled])；檢查對應配色的等級加了 1，該格變成 disabled
    const techFid = await page.evaluate(() => window.__IE.Game.state.shop.tech);
    const lvBefore = await page.evaluate((fid) => (window.__IE.Game.state.forms && window.__IE.Game.state.forms[fid]) || 1, techFid);
    await page.click('#modal .rs-item[data-slot="tech"] button:not([disabled])');
    const lvAfter = await page.evaluate((fid) => (window.__IE.Game.state.forms && window.__IE.Game.state.forms[fid]) || 1, techFid);
    const techDisabled = await page.$eval('#modal .rs-item[data-slot="tech"] button', (b) => b.disabled);
    if (lvAfter !== lvBefore + 1) await fail('技法課升級後等級應 +1（' + lvBefore + ' → ' + lvAfter + '）');
    if (!techDisabled) await fail('技法課購買後按鈕應變成 disabled');
    ok('技法課升級「' + techFid + '」：Lv.' + lvBefore + ' → Lv.' + lvAfter);

    // 10b. 工作室服務（第 1 晚是燒掉）：在 .rd-pick 選一張，素材庫少一張（WO-15-07 第 9 步，審核時補上）
    const svc = await page.evaluate(() => window.__IE.Game.state.shop.service);
    if (svc !== 'burn') await fail('第 1 晚的工作室服務應是燒掉（burn），實際是 ' + svc);
    const cardsBurn = await page.evaluate(() => window.__IE.Game.state.cards.length);
    await page.click('#modal .rs-item[data-slot="service"] button:not([disabled])');
    await page.waitForSelector('#modal .rd-pick');
    await page.click('#modal .rd-pick .cardpick:not([disabled])');
    await page.waitForSelector('#modal .rd-shop');
    const cardsBurned = await page.evaluate(() => window.__IE.Game.state.cards.length);
    if (cardsBurned !== cardsBurn - 1) await fail('燒掉之後素材庫應少一張（' + cardsBurn + ' → ' + cardsBurned + '）');
    ok('工作室服務「燒掉」（.rd-pick）：素材庫 ' + cardsBurn + ' → ' + cardsBurned + ' 張');

    // 11. 按 [data-do="leave"]；檢查回到 .rd-day，而且 s.night === 2
    await page.click('#modal .rd-shop [data-do="leave"]');
    await closeDilemma();
    await page.waitForSelector('.rd-day');
    const nightNow = await page.evaluate(() => window.__IE.Game.state.night);
    if (nightNow !== 2) await fail('離開市集後 s.night 應為 2，實際為 ' + nightNow);
    ok('離開市集回到白天面板（s.night === 2）');

    // 11b. 重新載入頁面，按「繼續」：仍然是第 2 晚的白天（WO-15-07 第 11 步，審核時補上）
    await page.reload();
    await page.waitForSelector('[data-do="continue"]');
    await page.click('[data-do="continue"]');
    await closeDilemma();
    await page.waitForSelector('.rd-day');
    const nightReload = await page.evaluate(() => window.__IE.Game.state.night);
    if (nightReload !== 2) await fail('重新載入之後應仍是第 2 晚，實際是第 ' + nightReload + ' 晚');
    ok('重新載入、按「繼續」：仍然是第 2 晚的白天');

    // 11c. 創作到一半重新載入：接着玩，不會整晚重來（WO-15-07 審核加入）
    await page.click('.rd-day [data-do="skip"]');
    await page.waitForSelector('#modal [data-do="ok"]');
    await page.click('#modal [data-do="ok"]');
    await page.waitForSelector('#ctable .ct-hand .cc');
    await page.mouse.click(640, 300);
    await page.waitForTimeout(600);
    const weak = await page.$$eval('#ctable .ct-hand .cc[data-uid]', (els) => els.map((e) => e.dataset.uid).slice(-1)[0]);
    await page.click('#ctable .ct-hand .cc[data-uid="' + weak + '"]');
    await page.click('#ctable .ct-play');
    await page.waitForFunction(() => !!document.querySelector('#ctable .ct-end') || !(window.__IE.Craft.isBusy()), { timeout: 15000 });
    const before = await page.evaluate(() => { const s = window.__IE.Game.state; return s.session ? s.session.log.length : -1; });
    if (before === 1) {
      await page.reload();
      await page.waitForSelector('[data-do="continue"]');
      await page.click('[data-do="continue"]');
      await page.waitForSelector('#ctable .ct-hand .cc');
      const after = await page.evaluate(() => window.__IE.Game.state.session.log.length);
      if (after !== 1) await fail('創作到一半重新載入之後應接着玩（已下 1 筆），實際是 ' + after + ' 筆');
      ok('創作到一半重新載入：接着玩，已下的 1 筆仍然在');
    } else {
      ok('第 2 晚第一筆已經收工，略過創作到一半重新載入的檢查');
    }

    if (errors.length) await fail('有 JS 錯誤：\n' + errors.join('\n'));
    ok('沒有 JS 錯誤');
  } catch (e) {
    await fail(e.message + '\n' + errors.join('\n'));
  }
  await browser.close();
  server.kill();
})();
