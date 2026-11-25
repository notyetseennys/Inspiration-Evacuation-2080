#!/usr/bin/env node
// 頭五分鐘的量度工具（WO-16-11 §7.3；總規格第十六期 §11.2）。
// 用法：node tools/first-five.js [截圖資料夾]（預設 /tmp/ie-first-five，不要寫進倉庫）
// 以手機 390×844 用 file:// 打開 dist/inspiration-evacuation-2080.html，清空儲存（不設 ie2080.noPrologue），速度 ×1，
// 模擬新玩家：每次只按畫面上的一樣東西，到達第一晚的創作桌就停。任何一項超出上限就以非零的狀態結束。
'use strict';
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const OUT = process.argv[2] || '/tmp/ie-first-five';
const DIST = path.join(__dirname, '..', 'dist', 'inspiration-evacuation-2080.html');
const W = 390, H = 844;

// 新玩家的點擊次序（第十七期之後：先撕開包）
const CLICK_ORDER = [
  '#ctable .is-guide:not([disabled])',
  '#modal [data-do="storypick"]:not([disabled])',
  '#modal [data-do="pick"]:not([disabled])',
  '#modal .pk:not(.is-open) .pk-seal',
  '#modal [data-do="ok"]',
  '.rd-day .rd-card:not([disabled])',
  '#modal [data-do="byauto"]',
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(m.text()); });
  await page.goto(pathToFileURL(DIST).href);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('ie2080.speed', '1'); });
  await page.reload();
  const t0 = Date.now();
  await page.waitForSelector('.title-menu');

  const m = {
    titleWords: 0, clicksToFirstStroke: null, prologueWordsMax: 0, strokeMsMax: 0, toWorkMs: null,
    storyWords: null, day1Words: null, prologueFits: true, night1Fits: null, hScroll: 0,
  };
  const words = (sel) => page.evaluate((q) => { const e = document.querySelector(q); return e ? e.innerText.replace(/\s/g, '').length : 0; }, sel);
  m.titleWords = await words('.title-menu');

  let lastKey = '', shotN = 0;
  const screenKey = () => page.evaluate(() => {
    const ct = document.querySelector('#ctable');
    if (ct) {
      if (ct.querySelector('.dk-work.is-prologue')) return 'prologue-work';
      return ct.classList.contains('is-prologue') ? 'prologue' : 'night1';
    }
    if (document.querySelector('#modal .rd-story')) return 'story';
    if (document.querySelector('#modal [data-do="ok"]')) return 'report';
    if (document.querySelector('.rd-day')) return 'day';
    if (document.querySelector('.title-menu')) return 'title';
    return 'other';
  });
  const shotIfNew = async () => {
    const k = await screenKey();
    if (k !== lastKey) {
      lastKey = k;
      shotN++;
      await page.screenshot({ path: path.join(OUT, String(shotN).padStart(2, '0') + '-' + k + '.png') });
    }
    return k;
  };
  const checkHScroll = async () => {
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    if (sw > W) m.hScroll = Math.max(m.hScroll, sw - W);
  };

  await shotIfNew();
  await page.click('.title-menu [data-do="new"]');
  let clicks = 1;
  const deadline = Date.now() + 240000;
  while (Date.now() < deadline) {
    const k = await shotIfNew();
    await checkHScroll();
    if (k === 'prologue') {
      m.prologueWordsMax = Math.max(m.prologueWordsMax, await words('#ctable'));
      const fits = await page.evaluate(() => document.querySelector('#ctable').scrollHeight <= innerHeight);
      if (!fits) m.prologueFits = false;
    }
    if (k === 'prologue-work' && m.toWorkMs == null) m.toWorkMs = Date.now() - t0;
    if (k === 'story' && m.storyWords == null) m.storyWords = await words('#modal .rd-story');
    if (k === 'day' && m.day1Words == null) m.day1Words = await words('.rd-day');
    if (k === 'night1') {
      await page.waitForTimeout(800);
      m.night1Fits = await page.evaluate(() => document.querySelector('#ctable').scrollHeight <= innerHeight);
      break;
    }
    // 序章的作品頁：「開始第一晚」本身就是 .is-guide
    // 只按真正按得到的東西：看得見，而且在最上層（序章說明期間，創作桌底下的標題頁按鈕不算）
    const onTop = (el) => el.evaluate((e) => {
      // 長的報告：玩家會先捲動到按鈕
      e.scrollIntoView({ block: 'nearest' });
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      const hit = document.elementFromPoint(r.left + r.width / 2, Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
      return !!hit && (hit === e || e.contains(hit));
    });
    let target = null;
    for (const sel of CLICK_ORDER) {
      const els = await page.$$(sel);
      for (const el of els) { if (await el.isVisible() && await onTop(el)) { target = el; break; } }
      if (target) break;
    }
    if (!target) {
      const prim = await page.$$('.btn.primary:not([disabled])');
      for (const b of prim) { if (await b.isVisible() && await onTop(b)) { target = b; break; } }
    }
    if (!target) { await page.waitForTimeout(150); continue; }
    // 找按鈕期間畫面轉換了（例如序章的作品頁剛出現）：先量度新的畫面
    if (await screenKey() !== k) continue;
    const isPlay = await target.evaluate((el) => el.classList.contains('ct-play'));
    await target.click();
    clicks++;
    if (isPlay) {
      if (m.clicksToFirstStroke == null) m.clicksToFirstStroke = clicks;
      const tp = Date.now();
      await page.waitForFunction(() => window.__IE && window.__IE.Craft && !window.__IE.Craft.isBusy(), null, { timeout: 30000, polling: 50 });
      m.strokeMsMax = Math.max(m.strokeMsMax, Date.now() - tp);
    }
    await page.waitForTimeout(120);
  }

  const rows = [
    ['標題頁的字數', m.titleWords, 60, m.titleWords <= 60],
    ['由載入到第一筆的點擊', m.clicksToFirstStroke, 4, m.clicksToFirstStroke != null && m.clicksToFirstStroke <= 4],
    ['序章任何一刻的字數', m.prologueWordsMax, 200, m.prologueWordsMax <= 200],
    ['序章每一筆的演出（毫秒）', m.strokeMsMax, 8000, m.strokeMsMax > 0 && m.strokeMsMax <= 8000],
    ['由載入到序章作品頁（毫秒）', m.toWorkMs, 60000, m.toWorkMs != null && m.toWorkMs <= 60000],
    ['第一個故事章的字數', m.storyWords, 230, m.storyWords != null && m.storyWords <= 230],
    ['第一晚白天面板的字數', m.day1Words, 220, m.day1Words != null && m.day1Words <= 220],
    ['創作桌的高度：序章', m.prologueFits ? '一屏' : '超出', '一屏', m.prologueFits],
    ['創作桌的高度：第一晚', m.night1Fits == null ? '未到達' : (m.night1Fits ? '一屏' : '超出'), '一屏', m.night1Fits === true],
    ['橫向捲動（像素）', m.hScroll, 0, m.hScroll === 0],
    ['JS 錯誤', errors.length, 0, errors.length === 0],
  ];
  console.log('| 項目 | 實際 | 上限 | 結果 |');
  console.log('|---|---|---|---|');
  rows.forEach((r) => console.log('| ' + r[0] + ' | ' + (r[1] == null ? '—' : r[1]) + ' | ' + r[2] + ' | ' + (r[3] ? '通過' : '超出') + ' |'));
  if (errors.length) console.log('\nJS 錯誤：\n' + errors.join('\n'));
  console.log('\n截圖：' + OUT + '（' + shotN + ' 張）；點擊 ' + clicks + ' 次；總時間 ' + Math.round((Date.now() - t0) / 1000) + ' 秒');
  await browser.close();
  process.exit(rows.every((r) => r[3]) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
