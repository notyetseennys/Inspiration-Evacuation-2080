// 審核用的試玩腳本（Claude，WO-15-06 審核時寫）：用瀏覽器實際玩幾晚五輪模式
// （朋友卡、親手做小遊戲、外星評審之夜、出國、選到一半重新載入），印出每晚的狀態並截圖。
// 用法：node tools/review-play.js <遊戲根目錄> <截圖目錄> [埠]　　SEED 環境變數可以換種子
// 注意：WO-15-07 之後結束面板的按鈕變成 [data-end="shop"] 並打開市集，要在 playNight() 之後
//       按市集的 [data-do="leave"]；WO-15-08 之後第 3 晚之後會出現篩選日 .rd-review（按 [data-do="next"]）。
'use strict';
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const ROOT = process.argv[2];
const OUT = process.argv[3];
const PORT = Number(process.argv[4] || 8131);
const SEED = Number(process.env.SEED || 20801031);
const URL = 'http://localhost:' + PORT + '/';

(async () => {
  const server = spawn(process.execPath, [path.join(ROOT, 'tools/serve.js'), String(PORT)], { stdio: 'ignore', cwd: ROOT });
  await new Promise((r) => setTimeout(r, 700));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push('console: ' + m.text()); });
  const log = (...a) => console.log(...a);
  const st = () => page.evaluate(() => { const s = window.__IE.Game.state; return { night: s.night, day: s.day, phase: s.phase, cr: s.cr, spark: Math.round(s.spark * 100) / 100, chances: s.chances, rng: s.rngState, bosses: JSON.stringify(s.bosses || {}), trip5: s.trip5 ? s.trip5.ids.length + '/' + s.trip5.picked.length : null }; });
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });

  const closeDilemma = async () => {
    for (let i = 0; i < 3; i++) {
      if (await page.$('#modal [data-do="pick"]')) {
        log('  （出門前的抉擇）');
        await page.click('#modal [data-do="pick"]:not([disabled])');
        await page.waitForSelector('#modal [data-do="ok"]');
        await page.click('#modal [data-do="ok"]');
        await page.waitForTimeout(150);
      }
    }
  };
  const playNight = async () => {
    await page.waitForSelector('#ctable .ct-hand .cc', { timeout: 15000 });
    for (let i = 0; i < 12; i++) {
      if (await page.$('.ct-end [data-end]')) break;
      const top = await page.$('#ctable .sg.top');
      if (top) await top.click();
      else {
        const uids = await page.$$eval('#ctable .ct-hand .cc[data-uid]', (els) => els.slice(0, 2).map((e) => e.dataset.uid));
        for (const u of uids) await page.click('#ctable .ct-hand .cc[data-uid="' + u + '"]');
      }
      await page.click('#ctable [data-ct="play"]');
      await page.waitForTimeout(400);
      for (let k = 0; k < 40; k++) { if (!(await page.evaluate(() => window.__IE.Craft.isBusy()))) break; await page.waitForTimeout(150); }
    }
    await page.waitForSelector('.ct-end [data-end]', { timeout: 30000 });
    const ends = await page.$$eval('.ct-end [data-end]', (els) => els.map((e) => e.dataset.end + ':' + e.textContent.trim()));
    log('  結束面板按鈕：', ends.join(' | '));
    await page.click('.ct-end [data-end]');
    await page.waitForTimeout(400);
  };
  const dayInfo = () => page.evaluate(() => ({
    title: (document.querySelector('.rd-day-title') || {}).textContent,
    tonight: (document.querySelector('.rd-tonight') || {}).textContent,
    rent: (document.querySelector('.rd-rent') || {}).textContent,
    wx: (document.querySelector('.rd-wx') || {}).textContent,
    cards: Array.from(document.querySelectorAll('.rd-card')).map((c) => c.dataset.card + (c.disabled ? '(disabled)' : '')),
    dots: Array.from(document.querySelectorAll('.rd-map .rm-night')).map((d) => d.className.replace('rm-night ', '')).join(' '),
  }));

  try {
    await page.goto(URL);
    await page.evaluate((seed) => { localStorage.clear(); localStorage.setItem('ie2080.speed', '4'); localStorage.setItem('ie2080.noEncounter', '1'); localStorage.setItem('ie2080.seed', String(seed)); }, SEED);
    await page.reload();
    await page.evaluate(() => window.__IE.Game.newGame('copywriter', 'storm', { mode: 'rounds' }));
    await closeDilemma();

    // ---- 第 1 晚：朋友卡（沒有就換一批），測試聊天 ----
    await page.waitForSelector('.rd-day');
    log('第 1 晚白天', JSON.stringify(await dayInfo()), JSON.stringify(await st()));
    await shot('n1-day');
    let friend = null;
    for (let i = 0; i < 6 && !friend; i++) {
      friend = await page.evaluate(() => (window.__IE.Rounds.offer(window.__IE.Game.state).ids || []).find((x) => x.startsWith('friend:')) || null);
      if (!friend) { await page.evaluate(() => { window.__IE.Game.state.cr += 100; }); await page.click('.rd-day [data-do="reroll"]'); await page.waitForTimeout(100); }
    }
    if (friend) {
      // 先按外面取消一次，確認可以取消
      await page.click('.rd-card[data-card="' + friend + '"]');
      await page.waitForSelector('#modal [data-do="reply"]');
      await shot('n1-friend');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
      const back = await page.$('.rd-day');
      log('  朋友卡：Esc 取消後回到白天面板：', !!back);
      await page.click('.rd-card[data-card="' + friend + '"]');
      await page.waitForSelector('#modal [data-do="reply"]');
      await page.click('#modal [data-do="reply"]');
      await page.waitForSelector('#modal [data-do="ok"]');
      const rep = await page.$eval('#modal', (m) => m.innerText.replace(/\s+/g, ' ').slice(0, 300));
      log('  朋友卡報告：', rep);
      await shot('n1-friend-report');
      await page.click('#modal [data-do="ok"]');
    } else {
      log('  沒有朋友卡，睡懶覺');
      await page.click('.rd-day [data-do="skip"]');
      await page.waitForSelector('#modal [data-do="ok"]');
      await page.click('#modal [data-do="ok"]');
    }
    log('  進入夜晚', JSON.stringify(await st()));
    await playNight();
    await closeDilemma();

    // ---- 第 2 晚：親手做（小遊戲按「跳過」） ----
    await page.waitForSelector('.rd-day');
    log('第 2 晚白天', JSON.stringify(await dayInfo()), JSON.stringify(await st()));
    let micro = null;
    for (let i = 0; i < 6 && !micro; i++) {
      micro = await page.evaluate(() => { const s = window.__IE.Game.state, RD = window.__IE.Rounds; return (RD.offer(s).ids || []).find((id) => { const c = RD.cardInfo(s, id); return c.enabled && c.micro; }) || null; });
      if (!micro) { await page.evaluate(() => { window.__IE.Game.state.cr += 100; }); await page.click('.rd-day [data-do="reroll"]'); await page.waitForTimeout(100); }
    }
    await page.click('.rd-card[data-card="' + micro + '"]');
    await page.waitForSelector('#modal [data-do="byhand"]');
    await shot('n2-micro-modal');
    await page.click('#modal [data-do="byhand"]');
    await page.waitForSelector('#panel [data-skip]');
    await page.waitForTimeout(500);
    await shot('n2-micro-game');
    await page.click('#panel [data-skip]');
    await page.waitForSelector('#modal [data-do="ok"]');
    log('  親手做「' + micro + '」→ 跳過 → 報告：', await page.$eval('#modal', (m) => m.innerText.replace(/\s+/g, ' ').slice(0, 300)));
    await page.click('#modal [data-do="ok"]');
    await playNight();
    await closeDilemma();

    // ---- 第 3 晚：外星評審之夜的白天面板 ----
    await page.waitForSelector('.rd-day');
    const s3a = await st();
    const d3 = await dayInfo();
    log('第 3 晚白天', JSON.stringify(d3), JSON.stringify(s3a));
    await shot('n3-boss-day');
    // 重畫白天面板（換一批）不應改變外星評審的規則
    await page.evaluate(() => { window.__IE.Game.state.cr += 100; });
    await page.click('.rd-day [data-do="reroll"]');
    await page.waitForTimeout(150);
    const s3b = await st();
    log('  換一批之後外星評審規則不變：', s3a.bosses === s3b.bosses, s3b.bosses);
    await page.click('.rd-day [data-do="skip"]');
    await page.waitForSelector('#modal [data-do="ok"]');
    await page.click('#modal [data-do="ok"]');
    await page.waitForSelector('#ctable .ct-hand .cc');
    const stagebar = await page.evaluate(() => { const b = document.querySelector('#ctable .ct-stagebar'); return b ? b.innerText.replace(/\s+/g, ' ') : null; });
    log('  評審之夜的關卡列：', stagebar);
    await shot('n3-boss-night');
    await playNight();
    await closeDilemma();

    // ---- 第 4 晚（第 2 輪）：出國 ----
    await page.waitForSelector('.rd-day');
    log('第 4 晚白天', JSON.stringify(await dayInfo()), JSON.stringify(await st()));
    await shot('n4-day');
    let trip = null;
    for (let i = 0; i < 30 && !trip; i++) {
      trip = await page.evaluate(() => (window.__IE.Rounds.offer(window.__IE.Game.state).ids || []).find((x) => x.startsWith('trip:')) || null);
      if (!trip) { await page.evaluate(() => { window.__IE.Game.state.cr += 200; }); await page.click('.rd-day [data-do="reroll"]'); await page.waitForTimeout(80); }
    }
    log('  出國卡：', trip);
    if (trip) {
      await page.evaluate(() => { const s = window.__IE.Game.state; s.cr = Math.max(s.cr, 300); });
      // 錢改了，重畫一次面板（換一批會換走出國卡，所以用 Esc 以外的方法：重新載入再繼續）
      const before = await st();
      await page.click('.rd-card[data-card="' + trip + '"]');
      await page.waitForSelector('#modal [data-do="trippick"]');
      const after = await st();
      log('  按出國卡：錢 ' + before.cr + ' → ' + after.cr + '，火花 ' + before.spark + ' → ' + after.spark + '，trip5 ' + after.trip5);
      const cls = await page.$eval('#modal .modal', (m) => m.className);
      log('  出國視窗 class：', cls);
      await shot('n4-trip');
      await page.click('#modal [data-do="trippick"][data-i="0"]');
      await page.waitForTimeout(150);
      log('  選了第一張之後：', JSON.stringify(await st()));
      // 重新載入：應該回到出國的選擇，而不是白天面板
      await page.reload();
      await page.waitForSelector('[data-do="continue"]');
      await page.click('[data-do="continue"]');
      await page.waitForTimeout(600);
      const resumedTrip = await page.$('#modal [data-do="trippick"]');
      const resumedDay = await page.$('.rd-day');
      log('  重新載入後：出國視窗 ' + !!resumedTrip + '，白天面板 ' + !!resumedDay, JSON.stringify(await st()));
      await shot('n4-trip-resumed');
      if (resumedTrip) {
        await page.click('#modal [data-do="trippick"]:not([disabled])');
        await page.waitForSelector('#modal [data-do="ok"]');
        log('  出國報告：', await page.$eval('#modal', (m) => m.innerText.replace(/\s+/g, ' ').slice(0, 300)));
        await shot('n4-trip-report');
        await page.click('#modal [data-do="ok"]');
        await page.waitForSelector('#ctable .ct-hand .cc');
        log('  出國之後進入創作桌', JSON.stringify(await st()));
      }
    }
    // ---- 手機 ----
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await shot('mobile-now');
  } catch (e) {
    log('✗ 例外：', e.message);
    try { await shot('fail'); } catch (_) { /* 略過 */ }
  }
  log('JS 錯誤：', errors.length ? errors.join('\n') : '沒有');
  await browser.close();
  server.kill();
})();
