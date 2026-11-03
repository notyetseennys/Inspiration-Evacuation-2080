#!/usr/bin/env node
// 五輪模式瀏覽器煙霧測試：用 Playwright 開啟遊戲，固定新局種子，
// 檢查白天面板、換一批、小遊戲、創作桌（今晚目標、收工演出、結束面板）、市集（開包、技法課、工作室服務）、重新載入，確保沒有 JS 錯誤。
// 用法：node tools/smoke-rounds.js
'use strict';
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
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
    for (let step = 0; step < 5; step++) {
      if (await page.$('#modal .rd-reversal [data-do="reverse"]')) {
        await page.click('#modal .rd-reversal [data-do="reverse"]');
        continue;
      }
      if (await page.$('#modal .rd-story [data-do="storypick"]')) {
        await page.click('#modal .rd-story [data-do="storypick"]:not([disabled])');
        if (await page.$('#modal [data-do="ok"]')) await page.click('#modal [data-do="ok"]');
        continue;
      }
      if (await page.$('#modal [data-do="pick"]')) {
        await page.click('#modal [data-do="pick"]:not([disabled])');
        if (await page.$('#modal [data-do="ok"]')) await page.click('#modal [data-do="ok"]');
        continue;
      }
      break;
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
  // WO-15-14 審核加入（工單第 5 節第 2 步）：畫面上每一個金額都已經換算成票面價格（第 7 區 × 20）。
  // 每一個金額都是 20 的倍數；同一個區域（一次寫入畫面）只要有金額，最大的一個至少 $100。
  // 沒有換算的區域，金額是遊戲數值（大多小於 $100，例如聊天 $15、素材包 $35），會被抓到；
  // 換算後的小額（例如 $2 的評級獎金 → $40）不會誤判，因為同一次寫入的其他金額證明這個區域已經換算。
  const scanMoney = async (label, sels, need) => {
    const groups = await page.evaluate((list) => {
      const re = /[+\-−]?\$[ \t]*[+\-−]?[ \t]*\d[\d,]*/g;
      const out = [];
      list.forEach((sel) => document.querySelectorAll(sel).forEach((el) => {
        const m = (el.innerText || '').match(re);
        if (m) out.push(m);
      }));
      return out;
    }, sels);
    const num = (x) => Number(x.replace(/[^\d]/g, ''));
    const found = [].concat(...groups);
    const bad = found.filter((x) => num(x) % 20 !== 0);
    const raw = groups.filter((g) => { const ns = g.map(num); return ns.some((n) => n > 0) && Math.max(...ns) < 100; });
    if (found.length < (need || 0)) await fail(label + '：應該至少有 ' + need + ' 個金額，只找到 ' + found.length + ' 個（' + sels.join('、') + '）');
    if (bad.length) await fail(label + '：有金額不是 20 的倍數（沒有換算）：' + bad.join('、'));
    if (raw.length) await fail(label + '：有區域的金額全部小於 $100（可能沒有換算）：' + raw.map((g) => g.join('、')).join('／'));
    ok('票面價格（' + label + '）：' + found.length + ' 個金額都已換算' + (found.length ? '，例如 ' + found.slice(0, 3).join('、') : ''));
  };
  const checkAllImgs = async (label) => {
    await page.waitForFunction(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.every((im) => im.complete);
    }, { timeout: 5000 }).catch(() => {});
    const res = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img')).map((im) => ({
        src: im.getAttribute('src') || '',
        cls: im.className || '',
        complete: im.complete,
        nw: im.naturalWidth,
        hidden: !!im.hidden,
      }));
    });
    const broken = res.filter((x) => !x.complete || x.nw <= 0 || x.hidden);
    if (broken.length) await fail(label + '：發現未載入或破圖的 img：' + JSON.stringify(broken));
    return res;
  };

  try {
    await page.goto(URL);
    await page.evaluate((seed) => {
      localStorage.clear();
      localStorage.setItem('ie2080.speed', '4');
      localStorage.setItem('ie2080.noEncounter', '1');
      localStorage.setItem('ie2080.seed', String(seed));
    }, SEED);
    await page.reload();

    // 1. WO-15-10 §3、§6：由開局畫面按「五輪」開始（確認預設選中、經典模式收在 <details>、起始現金顯示票面價格 $3,400，經典模式顯示 $170）
    await page.click('[data-do="new"]');
    await page.waitForSelector('.setup8');
    const setupDefault = await page.evaluate(() => {
      const rBtn = document.querySelector('[data-do="mode"][data-id="rounds"]');
      const det = document.querySelector('details.su-classic');
      const sum = det && det.querySelector('summary');
      const sBtn = det && det.querySelector('[data-do="mode"][data-id="standard"]');
      const lBtn = det && det.querySelector('[data-do="mode"][data-id="long"]');
      const cashChip = (document.querySelector('.sd-chips span') || {}).textContent || '';
      return {
        mode: window.__IE.Game.setup.mode,
        roundsSel: !!(rBtn && rBtn.classList.contains('sel')),
        roundsTxt: rBtn ? rBtn.textContent : '',
        hasClassic: !!det,
        classicOpen: !!(det && det.open),
        classicSum: sum ? sum.textContent : '',
        classicTxt: det ? det.textContent : '',
        hasStd: !!sBtn,
        hasLong: !!lBtn,
        cashChip,
      };
    });
    if (
      setupDefault.mode !== 'rounds' ||
      !setupDefault.roundsSel ||
      !setupDefault.roundsTxt.includes('五輪') ||
      !setupDefault.hasClassic ||
      setupDefault.classicOpen ||
      !setupDefault.classicSum.includes('經典模式') ||
      !setupDefault.classicTxt.includes('舊版玩法，不再平衡') ||
      !setupDefault.hasStd ||
      !setupDefault.hasLong ||
      setupDefault.cashChip !== '$3,400'
    ) {
      await fail('開局畫面預設五輪模式或起始現金檢查不通過：' + JSON.stringify(setupDefault));
    }
    // 切換到經典模式確認起始現金顯示 $170，再切回五輪模式確認顯示 $3,400
    await page.click('details.su-classic summary');
    await page.click('[data-do="mode"][data-id="standard"]');
    const stdCashChip = await page.$eval('.sd-chips span', (el) => el.textContent);
    if (stdCashChip !== '$170') {
      await fail('開局畫面切換為經典模式（標準）時，文案起始現金應為 $170，實際為 ' + stdCashChip);
    }
    await page.click('[data-do="mode"][data-id="rounds"]');
    const roundsCashChip = await page.$eval('.sd-chips span', (el) => el.textContent);
    if (roundsCashChip !== '$3,400') {
      await fail('開局畫面切回五輪模式時，文案起始現金應為 $3,400，實際為 ' + roundsCashChip);
    }
    await page.click('[data-do="season"][data-id="storm"]');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    const setupMobSw = await page.evaluate(() => document.documentElement.scrollWidth);
    if (setupMobSw > 390) await fail('手機 390px 開局畫面出現橫向捲動：scrollWidth=' + setupMobSw);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(150);
    if (process.env.SHOTS || process.env.SHOTS_10) {
      await page.evaluate(() => {
        const det = document.querySelector('details.su-classic');
        if (det) det.scrollIntoView({ block: 'end' });
      });
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-10-setup-desktop.png') });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => {
        const sd = document.querySelector('.su-detail');
        if (sd) sd.scrollIntoView({ block: 'start' });
      });
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-10-setup-mobile.png') });
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.waitForTimeout(150);
    }
    await page.click('[data-do="mode"][data-id="rounds"]');
    await page.click('[data-do="start"]');
    ok('五輪模式由開局畫面開新局（預設選中五輪、起始現金 $3,400、經典模式 $170，seed=' + SEED + '）');
    // WO-15-12 / WO-15-13 (1)：開發版的圖片清單（img.js 的 KNOWN）和 game/img/ 一致，包括第六批圖片
    const imgFiles = fs.readdirSync(path.join(__dirname, '..', 'game', 'img')).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4));
    const batch6Need = [
      'species-grey', 'species-octo', 'species-myco', 'species-conserve',
      'collect-grey', 'collect-octo', 'collect-myco', 'collect-conserve',
      'story-crossroads', 'story-reversal', 'astar', 'note-floatcity',
    ];
    const imgMissing = await page.evaluate((names) => names.filter((n) => !window.__IE.img(n)), imgFiles.concat(batch6Need));
    if (imgMissing.length) await fail('img.js 的圖片清單缺少：' + imgMissing.join('、'));
    ok('開發版的圖片清單和 game/img/ 一致（' + imgFiles.length + ' 張，含第六批故事與收藏圖片）');

    // WO-15-13 (2)：第 1 輪第 1 晚（s.night === 1）自動彈出 .rd-story
    await page.waitForSelector('#modal .rd-story');
    await checkAllImgs('角色線第 1 章（.rd-story）');
    const stCheck = await page.evaluate(() => {
      const m = document.querySelector('#modal .rd-story');
      const im = m && m.querySelector('img.st-banner');
      const btns = m ? Array.from(m.querySelectorAll('[data-do="storypick"]')) : [];
      const others = m ? m.querySelectorAll('.st-side.s-others').length : 0;
      const extreme = m ? m.querySelectorAll('.st-extreme').length : 0;
      return {
        bannerNw: im ? im.naturalWidth : 0,
        btnCount: btns.length,
        others,
        extreme,
      };
    });
    if (stCheck.bannerNw <= 0 || stCheck.btnCount < 4 || stCheck.btnCount > 5 || stCheck.others < 1 || stCheck.extreme < 1) {
      await fail('角色線第 1 章 .rd-story 檢查不通過：' + JSON.stringify(stCheck));
    }
    await scanMoney('角色線第 1 章（.rd-story）', ['#modal .rd-story'], 1);
    // WO-15-13 審核補上（工單第 5 節第 3 步）：章的視窗出現時重新載入、按「繼續」，仍然是同一章
    const stIdBefore = await page.evaluate(() => window.__IE.Game.state.story.pending);
    await page.reload();
    await page.waitForSelector('[data-do="continue"]');
    await page.click('[data-do="continue"]');
    await page.waitForSelector('#modal .rd-story');
    const stIdAfter = await page.evaluate(() => window.__IE.Game.state.story.pending);
    if (!stIdBefore || stIdAfter !== stIdBefore) await fail('章的視窗重新載入之後應該是同一章：' + stIdBefore + ' → ' + stIdAfter);
    ok('章的視窗重新載入、按「繼續」：仍然是同一章（' + stIdAfter + '）');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    const stMob = await page.evaluate(() => {
      const sw = document.documentElement.scrollWidth;
      const hs = Array.from(document.querySelectorAll('#modal .rd-story button')).map((b) => Math.round(b.getBoundingClientRect().height));
      return { sw, minH: Math.min(...hs) };
    });
    if (stMob.sw > 390) await fail('手機 390px .rd-story 出現橫向捲動：scrollWidth=' + stMob.sw);
    if (stMob.minH < 44) await fail('手機 .rd-story 按鈕高度不足 44px：minH=' + stMob.minH);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(150);
    if (process.env.SHOTS) {
      fs.mkdirSync(path.join(__dirname, '..', 'docs', 'shots'), { recursive: true });
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-13-story-desktop.png') });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-13-story-mobile.png') });
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.waitForTimeout(150);
    }
    await page.click('#modal .rd-story [data-do="storypick"]:has(.st-extreme)');
    await page.waitForSelector('#modal [data-do="ok"]');
    await scanMoney('角色線第 1 章結果報告', ['#modal'], 1);
    await page.click('#modal [data-do="ok"]');
    await page.waitForSelector('.rd-day');
    const stAfter = await page.evaluate(() => {
      const s = window.__IE.Game.state;
      return { logLen: s.story.log.length, laterLen: s.story.later.length, laterRound: s.story.later[0] && s.story.later[0].round };
    });
    // WO-15-13 審核補上（工單第 5 節第 1 步）：回答了章的那一天不抽道德抉擇
    const dilemmaToday = await page.evaluate(() => { const s = window.__IE.Game.state; return { dd: s.dilemmaDay, day: s.day, modal: !!document.querySelector('#modal [data-do="pick"]') }; });
    if (dilemmaToday.dd === dilemmaToday.day || dilemmaToday.modal) await fail('回答了章的那一天不應該抽道德抉擇：' + JSON.stringify(dilemmaToday));
    if (stAfter.logLen !== 1 || stAfter.laterLen !== 1) {
      await fail('點選極端選項後 s.story.log / later 長度不正確：' + JSON.stringify(stAfter));
    }
    ok('角色線第 1 章（.rd-story）：' + stCheck.btnCount + ' 個選項（含為別人與極端），選極端選項後 log=1、later=1（第 ' + stAfter.laterRound + ' 輪反轉）');

    // 2. 看到 .rd-day 和三張 .rd-card；.rd-map .rm-night 有 15 個
    await page.waitForSelector('.rd-day');
    const cardN = await page.$$eval('.rd-day .rd-card[data-card]', (els) => els.length);
    if (cardN !== 3) await fail('白天面板應有 3 張 .rd-card，現在有 ' + cardN + ' 張');
    const mapN = await page.$$eval('.rd-map .rm-night', (els) => els.length);
    if (mapN !== 15) await fail('.rd-map .rm-night 應有 15 個，現在有 ' + mapN + ' 個');

    // 14. 狀態列：有 .chip.chances、.chip.night、.chip.rent；沒有 [data-hud="stats"]、[data-hud="phone"]，也沒有「身體」字樣
    const hudCheck = await page.evaluate(() => {
      const hud = document.getElementById('hud');
      return {
        chances: !!hud.querySelector('.chip.chances'),
        night: !!hud.querySelector('.chip.night'),
        rent: !!hud.querySelector('.chip.rent'),
        statsBtn: !!hud.querySelector('[data-hud="stats"]'),
        phoneBtn: !!hud.querySelector('[data-hud="phone"]'),
        hasBodyText: hud.textContent.includes('身體'),
      };
    });
    if (!hudCheck.chances || !hudCheck.night || !hudCheck.rent) {
      await fail('狀態列缺少 .chip.chances / .chip.night / .chip.rent：' + JSON.stringify(hudCheck));
    }
    if (hudCheck.statsBtn || hudCheck.phoneBtn || hudCheck.hasBodyText) {
      await fail('五輪模式狀態列不應顯示狀態掣、手機掣或「身體」：' + JSON.stringify(hudCheck));
    }
    ok('狀態列：有 .chip.chances、.chip.night、.chip.rent；無狀態掣、手機掣與身體');

    // 18. 主畫面：浮城是主畫面（製作人 2026-11-03：「中間的主畫面好像太小了」）。
    // 舊規則「第一屏看到三張生活卡」（WO-15-08）取消：桌面 1280×800 的浮城畫面至少 300px 高，三張生活卡照樣存在
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);
    const stageH = await page.$eval('#stage canvas', (c) => Math.round(c.getBoundingClientRect().height));
    const nameBottoms = await page.$$eval('.rd-day .rd-card .rd-name', (els) => els.map((e) => Math.round(e.getBoundingClientRect().bottom)));
    if (stageH < 300 || nameBottoms.length !== 3) {
      await fail('桌面 1280×800 的浮城畫面應至少 300px 高，並有三張生活卡：' + JSON.stringify({ stageH, nameBottoms }));
    }
    ok('主畫面：桌面 1280×800 的浮城畫面高 ' + stageH + 'px；三張生活卡（.rd-name bottom=' + nameBottoms.join(', ') + '）');

    // 19a. 外星評審預告（第 1 晚）：存在 .rd-boss-ahead，文字包含 IE.Stages.bossesFor(s, 0)[0].name；進度條外星評審圓點 title 含規則名
    const bossAhead1 = await page.evaluate(() => {
      const s = window.__IE.Game.state;
      const b0 = window.__IE.Stages.bossesFor(s, 0)[0];
      const el = document.querySelector('.rd-day .rd-boss-ahead');
      const dot = document.querySelector('.rd-map .rm-night.k-boss');
      return {
        expected: b0 ? b0.name : '',
        text: el ? el.textContent : null,
        dotTitle: dot ? dot.getAttribute('title') : '',
      };
    });
    if (!bossAhead1.text || !bossAhead1.text.includes(bossAhead1.expected)) {
      await fail('第 1 晚應顯示 .rd-boss-ahead 並包含「' + bossAhead1.expected + '」，實際：' + bossAhead1.text);
    }
    if (!bossAhead1.dotTitle.includes(bossAhead1.expected)) {
      await fail('.rd-map 外星評審圓點 title 應包含「' + bossAhead1.expected + '」，實際：' + bossAhead1.dotTitle);
    }
    ok('外星評審預告（第 1 晚）：' + bossAhead1.text);

    // WO-15-14 (1) & (2)：狀態列與白天面板顯示票面價格（×20）
    const dayCashCheck = await page.evaluate(() => {
      const s = window.__IE.Game.state, RD = window.__IE.Rounds;
      const hudTxt = document.getElementById('hud').textContent || '';
      const rerollTxt = (document.querySelector('.rd-day [data-do="reroll"]') || {}).textContent || '';
      const expCr = RD.cash(s, s.cr);
      const expRent = RD.cash(s, RD.rentOf(s));
      const expReroll = RD.cash(s, RD.offerCost(s));
      return {
        hudHasCr: hudTxt.includes(expCr),
        hudHasRent: hudTxt.includes(expRent),
        rerollHasCost: rerollTxt.includes(expReroll),
        expCr,
        expRent,
        expReroll,
        hudTxt,
        rerollTxt,
      };
    });
    if (!dayCashCheck.hudHasCr || !dayCashCheck.hudHasRent || !dayCashCheck.rerollHasCost) {
      await fail('狀態列或白天面板票面價格不正確：' + JSON.stringify(dayCashCheck));
    }
    ok('票面價格（白天）：HUD 含 ' + dayCashCheck.expCr + ' 與租金 ' + dayCashCheck.expRent + '；換一批含 ' + dayCashCheck.expReroll);
    // WO-15-13 (4)：白天面板四條故事線（第 1 晚有 .rd-collect、.rd-astar、.rd-feed）
    const dayStoryCheck = await page.evaluate(() => {
      const s = window.__IE.Game.state;
      const pl = window.__IE.Story.plan(s);
      const npcDef = window.__IE.DATA.NPCS.find((x) => x.id === (pl && pl.npc));
      const colEl = document.querySelector('.rd-day .rd-collect');
      const colIm = colEl && colEl.querySelector('img.px');
      const astEl = document.querySelector('.rd-day .rd-astar');
      const astIm = astEl && astEl.querySelector('img.px');
      const feedEl = document.querySelector('.rd-day .rd-feed');
      const noteIm = document.querySelector('#hud .m-cash img.note-icon');
      return {
        npcName: npcDef ? npcDef.name : '',
        colTxt: colEl ? colEl.textContent : '',
        colNw: colIm ? colIm.naturalWidth : 0,
        astNw: astIm ? astIm.naturalWidth : 0,
        hasFeed: !!(feedEl && feedEl.textContent.trim()),
        noteNw: noteIm ? noteIm.naturalWidth : 0,
      };
    });
    if (!dayStoryCheck.colTxt.includes(dayStoryCheck.npcName) || dayStoryCheck.colNw <= 0 || dayStoryCheck.astNw <= 0 || !dayStoryCheck.hasFeed || dayStoryCheck.noteNw <= 0) {
      await fail('白天面板故事線區塊檢查不通過：' + JSON.stringify(dayStoryCheck));
    }
    ok('白天面板故事線：.rd-collect（含「' + dayStoryCheck.npcName + '」與種族頭像）、.rd-astar（含阿星頭像）、.rd-feed、HUD 浮城元紙幣圖示全部正常');
    // WO-15-14 審核加入（工單第 5 節第 1 步）：直接比對數字，不經 IE.Rounds.cash（第一期租金 $175 × 20；錢 = s.cr × 20，文案出身起始 $170）
    const hudLit = await page.evaluate(() => {
      const s = window.__IE.Game.state;
      return { cr: s.cr, want: '$' + (s.cr * 20).toLocaleString('en-US'),
        cash: ((document.querySelector('#hud .m-cash .num') || {}).textContent || '').trim(),
        rent: ((document.querySelector('#hud .chip.rent') || {}).textContent || '').trim() };
    });
    if (hudLit.cash !== hudLit.want || !hudLit.rent.includes('$3,500') || (hudLit.cr === 170 && hudLit.cash !== '$3,400')) {
      await fail('第 1 晚：狀態列的錢應是 ' + hudLit.want + '、租金應是 $3,500，實際：' + JSON.stringify(hudLit));
    }
    ok('第 1 晚：錢 ' + hudLit.cash + '（遊戲數值 $' + hudLit.cr + '）、' + hudLit.rent);
    await scanMoney('第 1 晚的白天', ['#hud', '#panel'], 3);
    await checkAllImgs('第 1 晚的白天');
    const dayImgs = await page.$$eval('.rd-day .rd-card', (cards) => cards.map((c) => {
      const im = c.querySelector('img.px');
      return im ? { src: im.getAttribute('src'), nw: im.naturalWidth } : null;
    }));
    if (dayImgs.length !== 3 || dayImgs.some((x) => !x || x.nw <= 0)) {
      await fail('第 1 晚的白天：三張 .rd-card 都應有載入完成的 img.px（naturalWidth > 0）：' + JSON.stringify(dayImgs));
    }
    ok('美術整合（第 1 晚的白天）：三張 .rd-card 都有插圖（' + dayImgs.map((x) => x.src).join('、') + '）');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    const dayMob = await page.evaluate(() => {
      const sw = document.documentElement.scrollWidth;
      const hs = Array.from(document.querySelectorAll('.rd-day button')).map((b) => Math.round(b.getBoundingClientRect().height));
      return { sw, minH: Math.min(...hs) };
    });
    if (dayMob.sw > 390) await fail('手機 390px 白天面板出現橫向捲動：scrollWidth=' + dayMob.sw);
    if (dayMob.minH < 44) await fail('手機白天面板按鈕高度不足 44px：minH=' + dayMob.minH);
    await page.setViewportSize({ width: 1280, height: 800 });

    if (process.env.SHOTS) {
      fs.mkdirSync(path.join(__dirname, '..', 'docs', 'shots'), { recursive: true });
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-06-day-desktop.png'), fullPage: true });
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-08-day-desktop.png') });
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-14-day-desktop.png') });
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-12-day-desktop.png') });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-06-day-mobile.png'), fullPage: true });
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-08-day-mobile.png') });
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-14-day-mobile.png') });
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-12-day-mobile.png') });
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
    await scanMoney('報告視窗', ['#modal'], 0);
    await page.click('#modal [data-do="ok"]');

    await page.waitForSelector('#ctable .ct-hand .cc');
    ok('選小遊戲卡「' + microCardId + '」→ 照舊做 → 報告確定 → 創作桌（#ctable）打開');

    // 5. 檢查創作桌上方進度列與第一筆前隱藏離開掣
    const goalLbl = await page.$eval('#ctable .ct-goal .lbl', (el) => el.textContent);
    const hasNightCls = await page.$eval('#ctable .ct-goal', (el) => el.classList.contains('night'));
    const leaveHidden = await page.$eval('#ctable [data-ct="leave"]', (el) => el.hidden);
    if (goalLbl !== '今晚目標' || !hasNightCls) await fail('創作桌進度列應為「今晚目標」並帶 .night');
    if (!leaveHidden) await fail('第一筆之前應隱藏 [data-ct="leave"]');

    await checkAllImgs('創作台');
    const stageImg = await page.$eval('#ctable .ct-scene-stage img.px', (im) => ({ src: im.getAttribute('src'), nw: im.naturalWidth })).catch(() => null);
    if (!stageImg || !/stage-(desk|hall|gallery|ufo)/.test(stageImg.src) || stageImg.nw <= 0) {
      await fail('創作台 .ct-scene-stage 應有對應關卡的 stage-* 圖片（naturalWidth > 0）：' + JSON.stringify(stageImg));
    }
    ok('美術整合（創作台）：.ct-scene-stage 顯示 ' + stageImg.src + '（naturalWidth=' + stageImg.nw + '）');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    const ctMob = await page.evaluate(() => {
      const sw = document.documentElement.scrollWidth;
      const hs = Array.from(document.querySelectorAll('#ctable .ct-actions .btn')).map((b) => Math.round(b.getBoundingClientRect().height));
      return { sw, minH: Math.min(...hs) };
    });
    if (ctMob.sw > 390) await fail('手機 390px 創作台出現橫向捲動：scrollWidth=' + ctMob.sw);
    if (ctMob.minH < 44) await fail('手機創作台動作按鈕高度不足 44px：minH=' + ctMob.minH);
    await page.setViewportSize({ width: 1280, height: 800 });
    if (process.env.SHOTS) {
      await page.evaluate(() => { const intro = document.querySelector('#ctable .ct-stage-intro'); if (intro) intro.remove(); });
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-12-craft-desktop.png') });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => {
        const stg = document.querySelector('#ctable .ct-scene-stage');
        if (stg) stg.scrollIntoView({ block: 'start' });
      });
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-12-craft-mobile.png') });
      await page.setViewportSize({ width: 1280, height: 800 });
    }

    // 收工演出只出現約一秒：用 MutationObserver 記下它曾經出現（WO-15-07 審核加入）
    await page.evaluate(() => {
      window.__sawCleared = false;
      new MutationObserver(() => { if (document.querySelector('#ctable .ct-cleared')) window.__sawCleared = true; }).observe(document.body, { childList: true, subtree: true });
    });
    // 6. 選最好的一手牌，按 .ct-play，等 .ct-end 出現。
    // 五輪模式的畫面不再顯示推薦（2026-11-03：讓玩家自己發現），所以測試直接用遊戲邏輯的 IE.Create.suggest 選牌，再按 data-uid 點卡
    let clearedShotDone = false;
    for (let playTurn = 0; playTurn < 6; playTurn++) {
      if (await page.$('#ctable .ct-end')) break;
      const best = await page.evaluate(() => {
        const s = window.__IE.Game.state, ses = s.session;
        const sg = ses && window.__IE.Create.suggest(s, ses.hand, 1);
        return sg && sg[0] ? sg[0].uids : null;
      });
      if (best && best.length) {
        for (const u of best) await page.click('#ctable .ct-hand .cc[data-uid="' + u + '"]');
      } else {
        const n = await page.locator('#ctable .ct-hand .cc:not(.forbidden)').count();
        for (let i = 0; i < Math.min(5, n); i++) await page.locator('#ctable .ct-hand .cc:not(.forbidden)').nth(i).click();
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
    await scanMoney('第 1 晚的收工結束卡', ['#ctable .ct-end'], n1.pass ? 1 : 0);
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

    // WO-15-14 (3) & (4)：市集票面價格已換算、s.cr 仍是遊戲數值（< 5000），開關「管理物件」（pushModal → closeModal）不會二次換算
    const shopCashBefore = await page.evaluate(() => {
      const s = window.__IE.Game.state, RD = window.__IE.Rounds;
      const packEl = document.querySelector('#modal .rs-item[data-slot^="pack:"]');
      const slot = packEl ? packEl.getAttribute('data-slot') : '';
      const btnTxt = packEl ? (packEl.querySelector('button') || {}).textContent.trim() : '';
      const expPack = RD.cash(s, RD.price(s, slot));
      return { cr: s.cr, slot, btnTxt, expPack };
    });
    if (shopCashBefore.cr >= 5000 || shopCashBefore.btnTxt !== shopCashBefore.expPack) {
      await fail('市集票面價格或 s.cr 不正確：' + JSON.stringify(shopCashBefore));
    }
    await page.click('#modal .rd-shop [data-do="objs"]');
    await page.waitForSelector('#modal [data-do="close"]');
    await page.click('#modal [data-do="close"]');
    await page.waitForSelector('#modal .rd-shop');
    const shopCashAfter = await page.evaluate((slot) => {
      const packEl = document.querySelector('#modal .rs-item[data-slot="' + slot + '"]');
      return packEl ? (packEl.querySelector('button') || {}).textContent.trim() : '';
    }, shopCashBefore.slot);
    if (shopCashAfter !== shopCashBefore.expPack) {
      await fail('關閉管理物件後市集價格被二次換算：應為 ' + shopCashBefore.expPack + '，實際為 ' + shopCashAfter);
    }
    await scanMoney('第 1 晚的市集', ['#modal .rd-shop', '#hud'], 3);
    ok('票面價格（市集）：' + shopCashBefore.slot + ' 顯示 ' + shopCashBefore.expPack + '（s.cr=' + shopCashBefore.cr + '），pushModal 還原後不重複換算');
    await checkAllImgs('第 1 輪市集');
    const shopArt = await page.evaluate(() => {
      const m = document.querySelector('#modal .rd-shop');
      const banner = m && m.querySelector('img.rs-banner');
      const packs = m ? Array.from(m.querySelectorAll('.rs-item[data-slot^="pack:"] img.rs-pack-img')) : [];
      return {
        banner: banner ? { src: banner.getAttribute('src'), nw: banner.naturalWidth } : null,
        packs: packs.map((p) => ({ src: p.getAttribute('src'), nw: p.naturalWidth })),
      };
    });
    if (!shopArt.banner || !shopArt.banner.src.includes('scene-market') || shopArt.banner.nw <= 0 || shopArt.packs.length !== 2 || shopArt.packs.some((p) => !p.src.includes('pack-') || p.nw <= 0)) {
      await fail('第 1 輪市集插圖不正確：' + JSON.stringify(shopArt));
    }
    ok('美術整合（第 1 輪市集）：頂部 scene-market 及 2 包 pack-* 插圖載入完成');

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
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-14-shop-mobile.png') });
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-12-shop-mobile.png') });
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(150);
    if (process.env.SHOTS) {
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-07-shop-desktop.png') });
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-14-shop-desktop.png') });
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-12-shop-desktop.png') });
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
    // 買素材包之後，開包的視窗會再畫一次狀態列，浮動數字留不住；技法課買完之後不再重畫，所以在這裡檢查
    await scanMoney('買技法課之後狀態列的浮動數字', ['#hud .float-delta'], 1);

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

    // 19b. 完成第 2 晚與市集，進入第 3 晚（本身已是外星評審）：不重複出現 .rd-boss-ahead
    if (!(await page.$('#ctable .ct-end'))) {
      await page.click('#ctable [data-ct="leave"]');
    }
    await page.waitForSelector('#ctable .ct-end [data-end="shop"]', { timeout: 15000 });
    await page.click('#ctable .ct-end [data-end="shop"]');
    await page.waitForSelector('#modal .rd-shop');
    await page.click('#modal .rd-shop [data-do="leave"]');
    await closeDilemma();
    await page.waitForSelector('.rd-day');
    const hasBossAheadOn3 = await page.$('.rd-day .rd-boss-ahead');
    if (hasBossAheadOn3) await fail('第 3 晚本身已是外星評審，不應重複出現 .rd-boss-ahead');
    ok('第 3 晚不重複出現 .rd-boss-ahead');

    // WO-15-13 (5)：幫朋友躲起來（第 1 輪第 3 晚，強制今日三張卡包含 friend:<plan.npc>）
    const r1Npc = await page.evaluate(() => {
      const s = window.__IE.Game.state;
      s.cr = 500;
      const pl = window.__IE.Story.plan(s);
      const npc = pl.npc;
      s.offer.ids[0] = 'friend:' + npc;
      window.__IE.Game.roundsGo();
      return npc;
    });
    await page.waitForSelector('.rd-day .rd-card[data-card="friend:' + r1Npc + '"]');
    const hasLastBadge = await page.$('.rd-day .rd-card[data-card="friend:' + r1Npc + '"] .rd-last');
    if (!hasLastBadge) await fail('本輪被盯上的朋友卡應顯示 .rd-last 標記');
    await page.click('.rd-day .rd-card[data-card="friend:' + r1Npc + '"]');
    await page.waitForSelector('#modal [data-do="hide"]');
    await scanMoney('幫朋友躲起來按鈕', ['#modal [data-do="hide"]'], 1);
    if (process.env.SHOTS) {
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-13-talk-desktop.png') });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-13-talk-mobile.png') });
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.waitForTimeout(150);
    }
    await page.click('#modal [data-do="hide"]');
    const hideCheck = await page.evaluate((npc) => {
      const s = window.__IE.Game.state;
      return { hidden: !!s.story.hidden[npc], cr: s.cr };
    }, r1Npc);
    if (!hideCheck.hidden || hideCheck.cr >= 500) {
      await fail('按幫朋友躲起來後 s.story.hidden / s.cr 不正確：' + JSON.stringify(hideCheck));
    }
    await page.click('#modal [data-do="reply"]');
    await page.waitForSelector('#modal [data-do="ok"]');
    await page.click('#modal [data-do="ok"]');
    await page.waitForSelector('#ctable .ct-hand .cc');
    ok('幫朋友躲起來（friend:' + r1Npc + '）：朋友卡有 .rd-last，聊天視窗有 [data-do="hide"]，躲藏成功（s.cr=500 → ' + hideCheck.cr + '）並進入夜晚');

    // 13. 第 3 晚完成創作和市集，按離開市集進入篩選日 .rd-review
    await page.evaluate(() => {
      const s = window.__IE.Game.state;
      s.session = null;
      if (window.__IE.Craft && window.__IE.Craft.close) window.__IE.Craft.close();
      s.night = 3;
      s.day = 12;
      s.cr = 300;
      s.soul = 5;
      s.chances = 3;
      s.phase = 'shop';
      window.__IE.Game.roundsGo();
    });
    await page.waitForSelector('#modal .rd-shop');
    await page.click('#modal .rd-shop [data-do="leave"]');
    await page.waitForSelector('#modal .rd-review');
    const revPass = await page.evaluate((npc) => {
      const s = window.__IE.Game.state;
      const fdef = window.__IE.DATA.STORY.friends[npc];
      const nObj = s.npcs.find((x) => x.id === npc);
      const m = document.querySelector('#modal .rd-review');
      const colEl = m && m.querySelector('.rr-collect');
      return {
        hasRent: !!m.querySelector('.rr-rent'),
        hasSoul: !!m.querySelector('.rr-soul'),
        hasCollect: !!colEl,
        colTxt: colEl ? colEl.textContent : '',
        hiddenLine: fdef ? fdef.hiddenLine : '',
        npcAlive: !!(nObj && nObj.alive),
        stamp: (m.querySelector('.stamp') || {}).textContent || '',
        nextBtn: (m.querySelector('[data-do="next"]') || {}).textContent || '',
      };
    }, r1Npc);
    if (!revPass.hasRent || !revPass.hasSoul || !revPass.hasCollect || !revPass.colTxt.includes(revPass.hiddenLine) || !revPass.npcAlive || revPass.stamp !== '通過' || !revPass.nextBtn.includes('進入第 2 輪')) {
      await fail('第 1 輪篩選日通過或朋友已藏好顯示不正確：' + JSON.stringify(revPass));
    }
    ok('篩選日（朋友已藏好）：.rr-collect 顯示 hiddenLine，朋友仍然 alive=true');
    // WO-15-14 (5)：篩選日本輪租金文字包含 IE.Rounds.cash(s, rep.rent)
    const revCashCheck = await page.evaluate(() => {
      const s = window.__IE.Game.state, RD = window.__IE.Rounds;
      const expRent = RD.cash(s, s.reviewRep.rent);
      const rentTxt = (document.querySelector('#modal .rd-review .rr-rent') || {}).textContent || '';
      return { expRent, rentTxt, ok: rentTxt.includes(expRent) };
    });
    if (!revCashCheck.ok) {
      await fail('篩選日本輪租金未換算為票面價格：應含 ' + revCashCheck.expRent + '，實際：' + revCashCheck.rentTxt);
    }
    ok('票面價格（篩選日）：本輪租金包含 ' + revCashCheck.expRent);
    await scanMoney('第 1 輪的篩選日', ['#modal .rd-review', '#modal .rr-collect', '#hud'], 2);
    await checkAllImgs('第 1 輪篩選日');
    const revArt = await page.$eval('#modal .rd-review img.rr-banner', (im) => ({ src: im.getAttribute('src'), nw: im.naturalWidth })).catch(() => null);
    if (!revArt || !revArt.src.includes('scene-review') || revArt.nw <= 0) {
      await fail('第 1 輪篩選日頂部應有 scene-review（naturalWidth > 0）：' + JSON.stringify(revArt));
    }
    ok('美術整合（第 1 輪篩選日）：頂部 scene-review 載入完成（naturalWidth=' + revArt.nw + '）');

    if (process.env.SHOTS) {
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-08-review-pass-desktop.png') });
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-14-review-desktop.png') });
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-12-review-desktop.png') });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-08-review-pass-mobile.png') });
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-14-review-mobile.png') });
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-12-review-mobile.png') });
      await page.setViewportSize({ width: 1280, height: 800 });
    }
    // 工單第 16 步：篩選日在手機 390px 沒有橫向捲動（WO-15-08 審核時加入）
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    const revMob = await page.evaluate(() => {
      const sw = document.documentElement.scrollWidth;
      const hs = Array.from(document.querySelectorAll('#modal .rd-review button')).map((b) => Math.round(b.getBoundingClientRect().height));
      return { sw, minH: Math.min(...hs) };
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    if (revMob.sw > 390) await fail('手機 390px 篩選日出現橫向捲動：scrollWidth=' + revMob.sw);
    if (revMob.minH < 44) await fail('手機篩選日按鈕高度不足 44px：minH=' + revMob.minH);
    ok('第 1 輪篩選日（.rd-review）：有 .rr-rent 與 .rr-soul，顯示「通過」及「進入第 2 輪」；手機 390px 沒有橫向捲動');

    // §6. 在 .rd-review 重新整理頁面再按「繼續」，仍然看到 .rd-review
    await page.reload();
    await page.waitForSelector('[data-do="continue"]');
    await page.click('[data-do="continue"]');
    await page.waitForSelector('#modal .rd-review');
    ok('篩選日重新整理再按「繼續」：仍然顯示 .rd-review');

    // 15. 按繼續：進入第 2 輪第 4 晚（第 2 輪・第 4／15 晚）
    await page.click('#modal .rd-review [data-do="next"]');
    await closeDilemma();
    await page.waitForSelector('.rd-day');
    const r2Title = await page.$eval('.rd-day .rd-day-title', (el) => el.textContent);
    if (!r2Title.includes('第 2 輪・第 4／15 晚')) {
      await fail('應進入「第 2 輪・第 4／15 晚」，實際：' + r2Title);
    }
    ok('按繼續進入：' + r2Title);

    // WO-15-13 (7) & (3)：第 2 輪不藏朋友，進入第 2 輪篩選日（朋友被收藏），按繼續到第 3 輪第 1 晚觸發 .rd-reversal 與 .rd-fate
    const r2Npc = await page.evaluate(() => {
      const s = window.__IE.Game.state;
      const pl = window.__IE.Story.plan(s);
      const npc = pl.npc;
      s.cr = 400;
      s.soul = 5;
      s.chances = 3;
      s.night = 6;
      s.day = 24;
      s.phase = 'review';
      window.__IE.Game.roundsGo();
      return npc;
    });
    await page.waitForSelector('#modal .rd-review .rr-collect');
    await checkAllImgs('第 2 輪篩選日（朋友被收藏）');
    await scanMoney('第 2 輪篩選日（朋友被收藏）', ['#modal .rd-review', '#modal .rr-collect', '#hud'], 2);
    const revTaken = await page.evaluate((npc) => {
      const s = window.__IE.Game.state;
      const fdef = window.__IE.DATA.STORY.friends[npc];
      const nObj = s.npcs.find((x) => x.id === npc);
      const colEl = document.querySelector('#modal .rd-review .rr-collect');
      const spIm = colEl && colEl.querySelector('img.rr-sp-img');
      const frIm = colEl && colEl.querySelector('img.rr-friend-img');
      const colTxt = colEl ? colEl.textContent : '';
      return {
        npcAlive: !!(nObj && nObj.alive),
        hasLine: !!(fdef && (colTxt.includes(fdef.nomeet) || colTxt.includes(fdef.farewell))),
        spSrc: spIm ? spIm.getAttribute('src') : '',
        spNw: spIm ? spIm.naturalWidth : 0,
        frNw: frIm ? frIm.naturalWidth : 0,
      };
    }, r2Npc);
    if (revTaken.npcAlive || !revTaken.hasLine || !revTaken.spSrc.includes('species-') || revTaken.spNw <= 0 || revTaken.frNw <= 0) {
      await fail('第 2 輪篩選日朋友被收藏檢查不通過：' + JSON.stringify(revTaken));
    }
    if (process.env.SHOTS) {
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-13-review-desktop.png') });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-13-review-mobile.png') });
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.waitForTimeout(150);
    }
    ok('篩選日（朋友被收藏）：.rr-collect 顯示被收藏文字與 species-* + friend-* 頭像');

    // 按繼續進入第 3 輪第 1 晚（s.night === 7），自動彈出 .rd-reversal（物極必反）
    await page.click('#modal .rd-review [data-do="next"]');
    await page.waitForSelector('#modal .rd-reversal');
    // WO-15-13 審核補上（工單第 5 節第 4a 步）：反轉出現時重新載入、按「繼續」，反轉仍然在，而且沒有提早套用
    const laterBefore = await page.evaluate(() => window.__IE.Game.state.story.later.length);
    await page.reload();
    await page.waitForSelector('[data-do="continue"]');
    await page.click('[data-do="continue"]');
    await page.waitForSelector('#modal .rd-reversal');
    const laterAfterReload = await page.evaluate(() => window.__IE.Game.state.story.later.length);
    if (laterBefore < 1 || laterAfterReload !== laterBefore) await fail('反轉的視窗重新載入之後應該仍然在：' + laterBefore + ' → ' + laterAfterReload);
    ok('物極必反的視窗重新載入、按「繼續」：仍然在（未發生的反轉 ' + laterAfterReload + ' 則）');
    await checkAllImgs('物極必反視窗（.rd-reversal）');
    await scanMoney('物極必反視窗（.rd-reversal）', ['#modal .rd-reversal', '#hud'], 1);
    const rvBannerNw = await page.$eval('#modal .rd-reversal img.rv-banner', (im) => im.naturalWidth);
    if (rvBannerNw <= 0) await fail('.rd-reversal 頂部圖片 naturalWidth 應 > 0');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    const rvMob = await page.evaluate(() => {
      const sw = document.documentElement.scrollWidth;
      const hs = Array.from(document.querySelectorAll('#modal .rd-reversal button')).map((b) => Math.round(b.getBoundingClientRect().height));
      return { sw, minH: Math.min(...hs) };
    });
    if (rvMob.sw > 390) await fail('手機 390px .rd-reversal 出現橫向捲動：scrollWidth=' + rvMob.sw);
    if (rvMob.minH < 44) await fail('手機 .rd-reversal 按鈕高度不足 44px：minH=' + rvMob.minH);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(150);
    if (process.env.SHOTS) {
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-13-reversal-desktop.png') });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-13-reversal-mobile.png') });
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.waitForTimeout(150);
    }
    await page.click('#modal .rd-reversal [data-do="reverse"]');
    const laterLeft = await page.evaluate(() => window.__IE.Game.state.story.later.length);
    if (laterLeft !== 0) await fail('按 [data-do="reverse"] 後 s.story.later.length 應為 0，實際為 ' + laterLeft);
    ok('物極必反觸發（.rd-reversal）：頂部圖片載入完成，按確認後 s.story.later.length === 0');

    // 關閉第 3 輪的角色章，進入第 3 輪第 7 晚白天面板：檢查 .rd-fate（被收藏朋友的近況）出現
    await closeDilemma();
    await page.waitForSelector('.rd-day .rd-fate');
    await checkAllImgs('第 3 輪白天面板（含 .rd-fate）');
    const fateNw = await page.$eval('.rd-day .rd-fate img.px', (im) => im.naturalWidth);
    if (fateNw <= 0) await fail('.rd-fate img.px 的 naturalWidth 應 > 0');
    const r3NameBottoms = await page.$$eval('.rd-card .rd-name', (els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().bottom))
    );
    if (r3NameBottoms.length !== 3) {
      await fail('第 3 輪白天面板（含 4 條故事區）應有三張生活卡：' + JSON.stringify(r3NameBottoms));
    }
    if (process.env.SHOTS) {
      await page.evaluate(() => {
        document.querySelectorAll('#toast, .toast, #ach-toast').forEach((el) => { el.innerHTML = ''; el.className = ''; });
      });
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-13-day-desktop.png') });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-13-day-mobile.png') });
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.waitForTimeout(150);
    }
    ok('第 3 輪白天面板：出現 .rd-fate（被收藏朋友的近況）與 collect-* 插圖（naturalWidth=' + fateNw + '），三張生活卡（卡名 bottom=' + r3NameBottoms.join(', ') + '）');

    // 16. 把 s.cr = 0、s.soul = 25、s.phase = 'review'，進入篩選日：同時顯示兩項失敗，s.chances === 1
    await page.evaluate(() => {
      const s = window.__IE.Game.state;
      s.cr = 0;
      s.soul = 25;
      s.chances = 3;
      s.night = 6;
      s.day = 24;
      s.phase = 'review';
      window.__IE.Game.roundsGo();
    });
    await page.waitForSelector('#modal .rd-review');
    const revFail = await page.evaluate(() => {
      const s = window.__IE.Game.state;
      const T = window.__IE.DATA.ROUND_TEXT;
      const m = document.querySelector('#modal .rd-review');
      const rentTxt = (m.querySelector('.rr-rent') || {}).textContent || '';
      const soulTxt = (m.querySelector('.rr-soul') || {}).textContent || '';
      const rentExpected = T.rentFail.split('{rent}')[0];
      const soulExpected = T.soulFail.split('{soul}')[0];
      return {
        chances: s.chances,
        rentFailCls: !!m.querySelector('.rr-rent.fail'),
        soulFailCls: !!m.querySelector('.rr-soul.fail'),
        scaleTilt: !!m.querySelector('.rr-scale.tilt'),
        hasRentFail: rentTxt.includes(rentExpected),
        hasSoulFail: soulTxt.includes(soulExpected),
        stamp: (m.querySelector('.stamp') || {}).textContent || '',
      };
    });
    if (revFail.chances !== 1 || !revFail.rentFailCls || !revFail.soulFailCls || !revFail.scaleTilt || !revFail.hasRentFail || !revFail.hasSoulFail || revFail.stamp !== '失去機會') {
      await fail('雙重失敗篩選日檢查不通過：' + JSON.stringify(revFail));
    }
    if (process.env.SHOTS) {
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-08-review-fail-desktop.png') });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-08-review-fail-mobile.png') });
      await page.setViewportSize({ width: 1280, height: 800 });
    }
    await page.click('#modal .rd-review [data-do="next"]');
    await closeDilemma();
    ok('篩選日同時欠租與超重：顯示兩項失敗、天秤傾斜、s.chances === 1');

    // 17. 把 s.chances = 1、s.cr = 0、s.night = 6、s.phase = 'review'，進入篩選日並按繼續：直接進入 .dossier 與 .run-sum
    await page.evaluate(() => {
      const s = window.__IE.Game.state;
      s.chances = 1;
      s.cr = 0;
      s.soul = 5;
      s.night = 6;
      s.day = 24;
      s.phase = 'review';
      window.__IE.Game.roundsGo();
    });
    await page.waitForSelector('#modal .rd-review');
    await page.click('#modal .rd-review [data-do="next"]');
    await page.waitForSelector('#modal .dossier');
    await page.waitForSelector('#panel .run-sum');
    const runSum = await page.$eval('#panel .run-sum', (el) => el.textContent);
    if (!/通過 \d+ \/ 5 輪・完成 \d+ \/ 15 晚/.test(runSum)) {
      await fail('.run-sum 格式不正確：' + runSum);
    }
    await checkAllImgs('結局畫面');
    const endArt = await page.evaluate(() => {
      const endIm = document.querySelector('#modal img.end-banner');
      const embIm = document.querySelector('#modal .dossier img.d-emblem');
      const dStory = document.querySelector('#modal .dossier .d-story');
      const dFriends = document.querySelector('#modal .dossier .d-friends');
      const dSide = document.querySelector('#modal .dossier .d-side');
      return {
        end: endIm ? { src: endIm.getAttribute('src'), nw: endIm.naturalWidth } : null,
        emblem: embIm ? { src: embIm.getAttribute('src'), nw: embIm.naturalWidth } : null,
        hasDStory: !!dStory,
        hasDFriends: !!dFriends,
        hasDSide: !!dSide,
      };
    });
    if (!endArt.end || !endArt.end.src.includes('end-archived') || endArt.end.nw <= 0 || !endArt.emblem || !endArt.emblem.src.includes('emblem') || endArt.emblem.nw <= 0) {
      await fail('結局畫面 end-* 或 emblem 插圖不正確：' + JSON.stringify(endArt));
    }
    if (!endArt.hasDStory || !endArt.hasDFriends || !endArt.hasDSide) {
      await fail('五輪模式結局 .dossier 缺少 .d-story / .d-friends / .d-side：' + JSON.stringify(endArt));
    }
    ok('美術整合与故事結局：end-archived、emblem、.d-story、.d-friends、.d-side 全部正常');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    const endMob = await page.evaluate(() => {
      const sw = document.documentElement.scrollWidth;
      const hs = Array.from(document.querySelectorAll('#modal .btn-row .btn, #panel .btn-row .btn')).map((b) => Math.round(b.getBoundingClientRect().height));
      return { sw, minH: Math.min(...hs) };
    });
    if (endMob.sw > 390) await fail('手機 390px 結局畫面出現橫向捲動：scrollWidth=' + endMob.sw);
    if (endMob.minH < 44) await fail('手機結局畫面按鈕高度不足 44px：minH=' + endMob.minH);
    await page.setViewportSize({ width: 1280, height: 800 });

    if (process.env.SHOTS) {
      await page.waitForTimeout(450);
      await page.evaluate(() => {
        document.querySelectorAll('#toast, .toast, #ach-toast, #toasts').forEach((el) => { el.innerHTML = ''; el.className = ''; });
      });
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-08-ending-desktop.png') });
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-12-ending-desktop.png') });
      await page.evaluate(() => {
        const ds = document.querySelector('#modal .dossier .d-story');
        if (ds) ds.scrollIntoView({ block: 'center' });
      });
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-13-ending-desktop.png') });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(200);
      await page.evaluate(() => {
        document.querySelectorAll('#toast, .toast, #ach-toast, #toasts').forEach((el) => { el.innerHTML = ''; el.className = ''; });
        const m = document.querySelector('#modal .modal');
        if (m) m.scrollTop = 0;
      });
      await page.waitForTimeout(100);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-08-ending-mobile.png') });
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-12-ending-mobile.png') });
      await page.evaluate(() => {
        const ds = document.querySelector('#modal .dossier .d-story');
        if (ds) ds.scrollIntoView({ block: 'center' });
      });
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-13-ending-mobile.png') });
      await page.setViewportSize({ width: 1280, height: 800 });
    }
    ok('最後一次機會耗盡 → 進入人才檔案結局畫面（.dossier）與局摘要（' + runSum + '）');

    // WO-15-12 §5.9：dist/inspiration-evacuation-2080.html 用 file:// 離線開啟時，圖片 naturalWidth > 0，檔案大小 < 4 MB
    const distFile = path.join(__dirname, '..', 'dist', 'inspiration-evacuation-2080.html');
    const distStat = fs.statSync(distFile);
    if (distStat.size >= 4 * 1024 * 1024) {
      await fail('dist/inspiration-evacuation-2080.html 超過 4 MB：' + distStat.size + ' bytes');
    }
    const filePage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await filePage.goto(pathToFileURL(distFile).href);
    await filePage.evaluate((seed) => {
      localStorage.clear();
      localStorage.setItem('ie2080.speed', '4');
      localStorage.setItem('ie2080.noEncounter', '1');
      localStorage.setItem('ie2080.seed', String(seed));
    }, SEED);
    await filePage.reload();
    await filePage.click('[data-do="new"]');
    await filePage.click('[data-do="season"][data-id="storm"]');
    await filePage.click('[data-do="mode"][data-id="rounds"]');
    await filePage.click('[data-do="start"]');
    const closeFileDilemma = async () => {
      for (let step = 0; step < 5; step++) {
        if (await filePage.$('#modal .rd-reversal [data-do="reverse"]')) {
          await filePage.click('#modal .rd-reversal [data-do="reverse"]');
          continue;
        }
        if (await filePage.$('#modal .rd-story [data-do="storypick"]')) {
          await filePage.click('#modal .rd-story [data-do="storypick"]:not([disabled])');
          if (await filePage.$('#modal [data-do="ok"]')) await filePage.click('#modal [data-do="ok"]');
          continue;
        }
        if (await filePage.$('#modal [data-do="pick"]')) {
          await filePage.click('#modal [data-do="pick"]:not([disabled])');
          if (await filePage.$('#modal [data-do="ok"]')) await filePage.click('#modal [data-do="ok"]');
          continue;
        }
        break;
      }
    };
    await closeFileDilemma();
    await filePage.waitForSelector('.rd-day');
    await filePage.waitForFunction(() => {
      const els = Array.from(document.querySelectorAll('img.px'));
      return els.length > 0 && els.every((im) => im.complete && im.naturalWidth > 0);
    }, { timeout: 3000 });
    const fileImgs = await filePage.$$eval('img.px', (els) => els.map((im) => ({ complete: im.complete, nw: im.naturalWidth })));
    if (!fileImgs.length || fileImgs.some((x) => !x.complete || x.nw <= 0)) {
      await filePage.close();
      await fail('file:// 離線開啟 dist/ 時圖片未載入：' + JSON.stringify(fileImgs));
    }
    // WO-15-10 驗收條件：用 dist/ 直接開啟玩到第 2 輪並截圖
    for (let n = 1; n <= 3; n++) {
      await closeFileDilemma();
      await filePage.waitForSelector('.rd-day [data-do="skip"]');
      await filePage.click('.rd-day [data-do="skip"]');
      await filePage.waitForSelector('#modal [data-do="ok"]');
      await filePage.click('#modal [data-do="ok"]');
      await filePage.waitForSelector('#ctable .ct-hand .cc');
      await filePage.evaluate(() => {
        const s = window.__IE.Game.state;
        s.spark = Math.max(s.spark, 8);
        s.session.hand.forEach((u) => {
          const c = s.cards.find((x) => x.uid === u);
          if (c) c.star = 5;
        });
      });
      for (let p = 0; p < 6; p++) {
        if (await filePage.$('.ct-end [data-end="shop"]')) break;
        const uids = await filePage.evaluate(() => {
          const b = window.__IE.Create.bestPlay(window.__IE.Game.state);
          return b ? b.uids : [];
        });
        if (!uids.length) break;
        for (const u of uids) await filePage.click('#ctable .ct-hand .cc[data-uid="' + u + '"]');
        await filePage.click('#ctable [data-ct="play"]');
        await filePage.waitForFunction(() => !!document.querySelector('.ct-end') || !window.__IE.Craft.isBusy(), null, { timeout: 15000 });
      }
      await filePage.waitForSelector('.ct-end [data-end="shop"]');
      await filePage.click('.ct-end [data-end="shop"]');
      await filePage.waitForSelector('#modal .rd-shop [data-do="leave"]');
      await filePage.click('#modal .rd-shop [data-do="leave"]');
      if (n === 3) {
        await filePage.waitForSelector('#modal .rd-review [data-do="next"]');
        await filePage.click('#modal .rd-review [data-do="next"]');
      }
    }
    await closeFileDilemma();
    await filePage.waitForSelector('.rd-day .rd-day-title');
    const distR2Title = await filePage.$eval('.rd-day .rd-day-title', (el) => el.textContent);
    if (!distR2Title.includes('第 2 輪・第 4／15 晚')) {
      await filePage.close();
      await fail('dist/ 離線遊玩應進入「第 2 輪・第 4／15 晚」，實際：' + distR2Title);
    }
    if (process.env.SHOTS || process.env.SHOTS_10) {
      await filePage.evaluate(() => {
        document.querySelectorAll('#toast, .toast, #ach-toast, #toasts').forEach((el) => { el.innerHTML = ''; el.className = ''; });
      });
      await filePage.waitForTimeout(150);
      await filePage.screenshot({ path: path.join(__dirname, '..', 'docs', 'shots', 'wo-15-10-dist-round2.png') });
    }
    await filePage.close();
    ok('dist/inspiration-evacuation-2080.html（' + (distStat.size / 1024).toFixed(0) + ' KB < 4 MB）用 file:// 離線開啟時，' + fileImgs.length + ' 張圖片 naturalWidth > 0，並可完整玩到第 2 輪（' + distR2Title + '）');

    if (errors.length) await fail('有 JS 錯誤：\n' + errors.join('\n'));
    ok('沒有 JS 錯誤');
  } catch (e) {
    await fail(e.message + '\n' + errors.join('\n'));
  }
  await browser.close();
  server.kill();
})();
