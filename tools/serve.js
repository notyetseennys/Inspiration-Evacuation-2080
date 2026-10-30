#!/usr/bin/env node
// 簡單的靜態伺服器：node tools/serve.js [port]，然後開啟 http://localhost:8080/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'game');
const port = Number(process.argv[2]) || 8080;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(root, url === '/' ? 'index.html' : url);
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    const type = types[path.extname(file)] || 'application/octet-stream';
    // 背景音樂要支援分段讀取（瀏覽器由頭播放時會用到）
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (m) {
      const start = m[1] ? Number(m[1]) : 0, end = m[2] ? Math.min(Number(m[2]), data.length - 1) : data.length - 1;
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': 'bytes ' + start + '-' + end + '/' + data.length, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
      res.end(data.subarray(start, end + 1));
      return;
    }
    res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes' });
    res.end(data);
  });
}).listen(port, () => console.log('靈感撤離 2080：http://localhost:' + port + '/'));
