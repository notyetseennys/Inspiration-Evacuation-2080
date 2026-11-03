#!/usr/bin/env node
// 創作之夜原型：打包成一個檔案（claude.ai Artifact 格式：沒有 <html>/<head>/<body> 外殼）。
// 用法：node proto/night/build.js [輸出檔]   預設輸出 proto/night/dist/night.html（不入 git）
// 背景音樂另外複製到輸出檔旁邊的 audio/（Artifact 以 files 一併發佈）。
'use strict';
const fs = require('fs');
const path = require('path');

const here = __dirname;
const root = path.join(here, '..', '..');
const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n?/g, '\n');
const html = read(path.join(here, 'index.html'));
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<!-- BUILD:BODY -->([\s\S]*?)<!-- \/BUILD:BODY -->/)[1].trim();
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const css = [...head.matchAll(/<link rel="stylesheet" href="([^"h][^"]*)">/g)].map((m) => read(path.join(here, m[1]))).join('\n');
const js = scripts.map((src) => '// ---- ' + path.basename(src) + ' ----\n' + read(path.join(here, src))).join('\n');
if (/<\/script/i.test(js)) throw new Error('JS 內含 </script>，不能直接內嵌');

// 只收原型用得到的圖：四個外星種族的評審頭像
const IMGS = ['species-conserve', 'species-octo', 'species-myco', 'species-grey'];
const imgs = {};
IMGS.forEach((k) => { imgs[k] = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'game', 'img', k + '.png')).toString('base64'); });
const BGM = 'pixel-orbit.mp3';

const title = head.match(/<title>[\s\S]*?<\/title>/)[0];
const metaSides = head.match(/<meta name="claude:viewport-fit-sides"[^>]*>/)[0];
const fonts = head.match(/<link rel="preconnect"[^>]*>|<link rel="stylesheet" href="https:\/\/fonts[^>]*>/g).join('\n');
const boot = '<script>window.IE=window.IE||{};IE.IMG=' + JSON.stringify(imgs) + ';window.IE_NIGHT_BGM="audio/' + BGM + '";</script>';
const out = [title, metaSides, fonts, '<style>\n' + css + '</style>', body, boot, '<script>\n' + js + '</script>'].join('\n') + '\n';

const target = process.argv[2] || path.join(here, 'dist', 'night.html');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, out);
const audioDir = path.join(path.dirname(target), 'audio');
fs.mkdirSync(audioDir, { recursive: true });
fs.copyFileSync(path.join(root, 'game', 'audio', BGM), path.join(audioDir, BGM));
console.log(target + '  ' + (Buffer.byteLength(out, 'utf8') / 1024).toFixed(0) + ' KB；audio/' + BGM);
