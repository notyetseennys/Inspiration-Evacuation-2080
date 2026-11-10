#!/usr/bin/env node
// 創作之夜原型第五版「創作桌」：打包成一個檔案（claude.ai Artifact 格式：沒有 <html>/<head>/<body> 外殼）。
// 用法：node proto/night5/build.js [輸出檔] --art <素材資料夾> --music <分軌資料夾> [--share 作品分享連結的前綴]
//   素材資料夾由 tools/art-night-web.py 輸出（night-art.json 和 WebP），分軌資料夾由 tools/music-night-web.py 輸出（night-music.json 和 MP3）。
//   兩個資料夾要以 art/ 和 music/ 的名字和輸出檔一起發佈。預設輸出 proto/night5/dist/night.html（不入 git）。--share 給 Artifact 的網址，分享連結會是「網址#作品碼」。
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

// 只收原型用得到的圖：四個外星種族的評審、八位創作夥伴
const IMGS = ['species-conserve', 'species-octo', 'species-myco', 'species-grey',
  'friend-dj', 'friend-ho', 'friend-ken', 'friend-miu', 'friend-fong', 'friend-chan', 'friend-yu', 'friend-mary'];
const imgs = {};
IMGS.forEach((k) => { imgs[k] = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'game', 'img', k + '.png')).toString('base64'); });

const args = process.argv.slice(2);
const si = args.indexOf('--share');
const share = si >= 0 ? args[si + 1] : '';
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : ''; };
const artDir = opt('--art'), musicDir = opt('--music');
const target = args.find((a, i) => !a.startsWith('--') && !['--share', '--art', '--music'].includes(args[i - 1])) || path.join(here, 'dist', 'night.html');
const art = artDir ? JSON.parse(read(path.join(artDir, 'night-art.json'))) : { a: {}, sky: {} };
const music = musicDir ? JSON.parse(read(path.join(musicDir, 'night-music.json'))) : { styles: {} };
art.base = 'art/'; music.base = 'music/';
if (share && !/^https:\/\/[\w./-]+$/.test(share)) throw new Error('--share 的網址格式不對：' + share);

const title = head.match(/<title>[\s\S]*?<\/title>/)[0];
const metaSides = head.match(/<meta name="claude:viewport-fit-sides"[^>]*>/)[0];
const fonts = head.match(/<link rel="preconnect"[^>]*>|<link rel="stylesheet" href="https:\/\/fonts[^>]*>/g).join('\n');
// 背景音樂：複製到輸出檔旁邊的 audio/（Artifact 以 files 一併發佈）
const BGM = ['pixel-orbit'];
const boot = '<script>window.IE=window.IE||{};IE.IMG=' + JSON.stringify(imgs) + ';IE.ART=' + JSON.stringify(art) + ';IE.MUSIC=' + JSON.stringify(music) + ';window.IE_BGM_BASE="audio/";' + (share ? 'window.IE_SHARE_BASE=' + JSON.stringify(share) + ';' : '') + '</script>';
const out = [title, metaSides, fonts, '<style>\n' + css + '</style>', body, boot, '<script>\n' + js + '</script>'].join('\n') + '\n';

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, out);
const audioDir = path.join(path.dirname(target), 'audio');
fs.mkdirSync(audioDir, { recursive: true });
BGM.forEach((b) => fs.copyFileSync(path.join(root, 'game', 'audio', b + '.mp3'), path.join(audioDir, b + '.mp3')));
console.log(target + '  ' + (Buffer.byteLength(out, 'utf8') / 1024).toFixed(0) + ' KB' + (share ? '；分享前綴 ' + share : ''));
