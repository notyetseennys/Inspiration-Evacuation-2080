#!/usr/bin/env node
// 邏輯單元測試（第十五期起）：node tools/test.js [關鍵字]
// 載入與模擬器相同的遊戲邏輯（不需要瀏覽器），執行 tools/tests/*.test.js。
// 每個測試檔匯出一個函數：module.exports = (t) => { t.test('名稱', () => { ... }); };
// t 提供：IE、D（IE.DATA）、R（IE.Rules）、C（IE.Create）、S（IE.Stages）、assert（node:assert/strict）、
//         run(opts)：開一局新遊戲（預設 copywriter、storm、seed 1、局外資料 { runs: 1 }，即不是第一局）。
// 有關鍵字時只跑名稱或檔名包含關鍵字的測試。全部通過時結束碼是 0，否則是 1。
'use strict';
const path = require('path');
const fs = require('fs');
const assert = require('node:assert/strict');

const FILES = ['data.js', 'data-events.js', 'data-incidents.js', 'data-deaths.js', 'data-jobs.js', 'data-craft.js', 'data-world.js', 'data-world2.js',
  'data-chars.js', 'data-schools.js', 'data-abilities.js', 'data-stories.js', 'data-weather.js', 'data-contacts.js',
  'rules.js', 'create.js', 'world.js', 'jobs2.js', 'auto.js', 'stages.js', 'meta.js', 'dossier.js'];
// 第十五期新增的純邏輯檔案（存在才載入，令工單可以逐步加入）
const OPTIONAL = ['data-rounds.js', 'data-story.js', 'rounds.js', 'story.js'];
FILES.forEach((f) => require(path.join(__dirname, '../game/js', f)));
OPTIONAL.forEach((f) => { const p = path.join(__dirname, '../game/js', f); if (fs.existsSync(p)) require(p); });

const IE = globalThis.IE;
const tests = [];
const run = (opts) => IE.Rules.newRun(Object.assign({ bg: 'copywriter', season: 'storm', seed: 1, meta: { runs: 1 } }, opts || {}));
const dir = path.join(__dirname, 'tests');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.test.js')).sort() : [];
files.forEach((file) => {
  const t = { IE, D: IE.DATA, R: IE.Rules, C: IE.Create, S: IE.Stages, assert, run, test: (name, fn) => tests.push({ file, name, fn }) };
  require(path.join(dir, file))(t);
});

const key = process.argv[2] || '';
const chosen = tests.filter((x) => !key || x.name.includes(key) || x.file.includes(key));
let pass = 0, fail = 0;
for (const x of chosen) {
  try {
    x.fn();
    pass++;
    console.log('✓ ' + x.file.replace('.test.js', '') + '：' + x.name);
  } catch (e) {
    fail++;
    console.log('✗ ' + x.file.replace('.test.js', '') + '：' + x.name);
    console.log('    ' + String((e && e.message) || e).split('\n').join('\n    '));
  }
}
console.log('\n' + pass + ' 項通過，' + fail + ' 項失敗' + (key ? '（關鍵字：' + key + '）' : ''));
process.exit(fail ? 1 : 0);
