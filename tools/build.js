#!/usr/bin/env node
// 把 game/ 打包成單一 HTML 檔，方便直接開啟或分享。
// 用法：node tools/build.js            → dist/inspiration-evacuation-2080.html（完整 HTML，可以直接雙擊開啟）
//       node tools/build.js --artifact → 另外輸出沒有 <html>/<head>/<body> 外殼的版本（供 claude.ai Artifact 使用）
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const game = path.join(root, 'game');
const html = fs.readFileSync(path.join(game, 'index.html'), 'utf8');

const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<!-- BUILD:BODY -->([\s\S]*?)<!-- \/BUILD:BODY -->/)[1].trim();
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const css = fs.readFileSync(path.join(game, 'css/style.css'), 'utf8');
const js = scripts.map((src) => '// ---- ' + src + ' ----\n' + fs.readFileSync(path.join(game, src), 'utf8')).join('\n');
if (/<\/script/i.test(js)) throw new Error('JS 內含 </script>，不能直接內嵌');

const title = head.match(/<title>[\s\S]*?<\/title>/)[0];
const metaSides = head.match(/<meta name="claude:viewport-fit-sides"[^>]*>/)[0];
const metaDesc = head.match(/<meta name="description"[^>]*>/)[0];
const fontLinks = head.match(/<link rel="preconnect"[^>]*>|<link rel="stylesheet" href="https:\/\/fonts[^>]*>/g).join('\n');

const inner = [title, metaSides, metaDesc, fontLinks, '<style>\n' + css + '</style>', body, '<script>\n' + js + '</script>'].join('\n');
const full = '<!doctype html>\n<html lang="zh-HK">\n<head>\n<meta charset="utf-8">\n'
  + '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  + [title, metaSides, metaDesc, fontLinks, '<style>\n' + css + '</style>'].join('\n')
  + '\n</head>\n<body>\n' + body + '\n<script>\n' + js + '</script>\n</body>\n</html>\n';

const out = path.join(root, 'dist');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'inspiration-evacuation-2080.html'), full);
console.log('dist/inspiration-evacuation-2080.html  ' + (full.length / 1024).toFixed(0) + ' KB');
const ai = process.argv.indexOf('--artifact');
if (ai !== -1) {
  const target = process.argv[ai + 1] || path.join(out, 'artifact.html');
  fs.writeFileSync(target, inner + '\n');
  console.log(target + '  ' + (inner.length / 1024).toFixed(0) + ' KB');
}
