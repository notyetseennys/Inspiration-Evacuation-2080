#!/usr/bin/env node
// 把 game/ 打包成單一 HTML 檔，方便直接開啟或分享。
// 用法：node tools/build.js            → dist/inspiration-evacuation-2080.html（完整 HTML，可以直接雙擊開啟）
//       node tools/build.js --artifact → 另外輸出沒有 <html>/<head>/<body> 外殼的版本（供 claude.ai Artifact 使用）
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const game = path.join(root, 'game');
// 一律用 LF 換行（在 Windows 打包時，原始檔可能是 CRLF，令 dist/ 出現大量無意義的差異）
const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n?/g, '\n');
const html = read(path.join(game, 'index.html'));

const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<!-- BUILD:BODY -->([\s\S]*?)<!-- \/BUILD:BODY -->/)[1].trim();
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
// 依 index.html 的次序內嵌所有本機樣式表（style.css、art.css……）
const css = [...head.matchAll(/<link rel="stylesheet" href="(css\/[^"]+)">/g)].map((m) => read(path.join(game, m[1]))).join('\n');
const js = scripts.map((src) => '// ---- ' + src + ' ----\n' + read(path.join(game, src))).join('\n');
if (/<\/script/i.test(js)) throw new Error('JS 內含 </script>，不能直接內嵌');

const title = head.match(/<title>[\s\S]*?<\/title>/)[0];
const metaSides = head.match(/<meta name="claude:viewport-fit-sides"[^>]*>/)[0];
const metaDesc = head.match(/<meta name="description"[^>]*>/)[0];
const fontLinks = head.match(/<link rel="preconnect"[^>]*>|<link rel="stylesheet" href="https:\/\/fonts[^>]*>/g).join('\n');

const imgDir = path.join(game, 'img');
const imgs = {};
if (fs.existsSync(imgDir)) {
  fs.readdirSync(imgDir).filter((f) => f.endsWith('.png')).sort().forEach((f) => {
    const key = f.replace(/\.png$/, '');
    imgs[key] = 'data:image/png;base64,' + fs.readFileSync(path.join(imgDir, f)).toString('base64');
  });
}
const imgScript = '<script>window.IE=window.IE||{};IE.IMG=' + JSON.stringify(imgs) + ';</script>';
const iconLink = imgs.icon ? '<link rel="icon" href="' + imgs.icon + '">' : '';

const inner = [title, metaSides, metaDesc, iconLink, fontLinks, '<style>\n' + css + '</style>', body, imgScript, '<script>\n' + js + '</script>'].filter(Boolean).join('\n');
const full = '<!doctype html>\n<html lang="zh-HK">\n<head>\n<meta charset="utf-8">\n'
  + '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  + [title, metaSides, metaDesc, iconLink, fontLinks, '<style>\n' + css + '</style>'].filter(Boolean).join('\n')
  + '\n</head>\n<body>\n' + body + '\n<script>window.IE_AUDIO_BASE = "../game/";</script>\n' + imgScript + '\n<script>\n' + js + '</script>\n</body>\n</html>\n';

const out = path.join(root, 'dist');
fs.mkdirSync(out, { recursive: true });
const outFile = path.join(out, 'inspiration-evacuation-2080.html');
fs.writeFileSync(outFile, full);
const bytes = Buffer.byteLength(full, 'utf8');
console.log('dist/inspiration-evacuation-2080.html  ' + (bytes / 1024).toFixed(0) + ' KB (' + (bytes / (1024 * 1024)).toFixed(2) + ' MB)');
if (bytes > 4 * 1024 * 1024) {
  throw new Error('dist/inspiration-evacuation-2080.html 超過 4 MB 上限：' + bytes + ' bytes');
}
// 背景音樂：dist/ 直接讀 game/audio/（不在 git 裡重複存一份）；Artifact 版本把音樂檔複製到 HTML 旁邊的 audio/
const ai = process.argv.indexOf('--artifact');
if (ai !== -1) {
  const target = process.argv[ai + 1] || path.join(out, 'artifact.html');
  fs.writeFileSync(target, inner + '\n');
  console.log(target + '  ' + (inner.length / 1024).toFixed(0) + ' KB');
  const audioDir = path.join(game, 'audio');
  if (fs.existsSync(audioDir)) {
    const dest = path.join(path.dirname(target), 'audio');
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(audioDir).filter((f) => f.endsWith('.mp3')).forEach((f) => fs.copyFileSync(path.join(audioDir, f), path.join(dest, f)));
    console.log(dest + '/  ' + fs.readdirSync(dest).length + ' 首背景音樂');
  }
}
