#!/usr/bin/env python3
"""創作之夜：把 tools/music-build.py 的小節資料庫轉成網頁版（每條分軌一段 24 小節的 MP3）和清單 night-music.json。

- 每首歌挑最好的一段連續 24 小節：樂隊要有主和弦、屬和弦和承用的和弦；其他歌要那件樂器有聲的小節最多。
- 只留遊戲用的分軌：樂隊（base、full）是鼓、低音、和弦；主旋律、弦樂、琶音取「其他」；人聲取人聲；敲擊取最響的一條。
- 統一響度（按有聲小節的 RMS），樂隊三條分軌用同一個增益，保持原本的比例。
清單記錄每一小節的開始時間、和弦根音、性質和級數，網頁按小節取出播放。

用法：python3 tools/music-night-web.py <music-build 的輸出資料夾> <輸出資料夾>
需要 numpy 和 ffmpeg。
"""
import json
import os
import re
import subprocess
import sys

import numpy as np

WIN = 24
TARGET = 0.085  # 目標 RMS
FUNC = {'I', 'ii', 'iii', 'IV', 'V', 'vi'}


def rms_db(v):
    return 20 * np.log10(max(v, 1e-6))


def main():
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    meta = {'styles': {}}
    total = 0
    for name in sorted(os.listdir(src)):
        m = re.match(r'ns-(lofi|citypop|synth)-(.+)$', name)
        jp = os.path.join(src, name, name + '.json')
        if not m or not os.path.exists(jp):
            continue
        style, song = m.groups()
        d = json.load(open(jp, encoding='utf-8'))
        bars = d['bars']
        band = song in ('base', 'full')
        if band:
            stems = ['drums', 'bass', 'other']
        elif song == 'vocal':
            stems = ['vocals']
        elif song == 'perc':
            stems = [max(('drums', 'other'), key=lambda s: np.mean([b['rms'].get(s, 0) for b in bars]))]
        else:
            stems = ['other']
        key = stems[-1]
        live = lambda b, s=key: b['rms'].get(s, 0) > 0.012
        best = None
        for s0 in range(0, max(1, len(bars) - WIN + 1)):
            w = bars[s0:s0 + WIN]
            if band:
                ok = [b for b in w if live(b) and b['rms'].get('drums', 0) > 0.02]
                sc = sum(1 for b in ok if b['roman'] in FUNC) + 3 * min(3, sum(1 for b in ok if b['roman'] == 'I')) + 3 * min(3, sum(1 for b in ok if b['roman'] == 'V'))
            else:
                sc = sum(1 for b in w if live(b))
            if best is None or sc > best[0]:
                best = (sc, s0)
        s0 = best[1]
        w = bars[s0:s0 + WIN]
        t0 = max(0.0, w[0]['t'] - 0.05)
        dur = w[-1]['t'] + d['bar'] + 0.35 - t0
        lv = [b['rms'].get(key, 0) for b in w if live(b)]
        gain = min(6.0, TARGET / (np.sqrt(np.mean(np.square(lv))) if lv else TARGET))
        files = {}
        for s in stems:
            fn = '%s-%s-%s.mp3' % (style, song, s)
            stereo = band and s == 'other'
            subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', '%.4f' % t0, '-t', '%.4f' % dur,
                            '-i', os.path.join(src, name, d['stems'][s]), '-af', 'volume=%.3f,alimiter=limit=0.95' % gain,
                            '-ac', '2' if stereo else '1', '-ar', '44100', '-b:a', '96k' if stereo else '64k', os.path.join(out, fn)], check=True)
            total += os.path.getsize(os.path.join(out, fn))
            files[s] = fn
        st = meta['styles'].setdefault(style, {'bpm': d['bpm'], 'bar': d['bar'], 'key': d['key'], 'songs': {}})
        st['songs'][song] = {'stems': files, 'bars': [
            {'t': round(b['t'] - t0, 4), 'r': b['root'], 'q': b['q'], 'ro': b['roman'], 'l': {s: int(b['rms'].get(s, 0) > 0.012) for s in stems}} for b in w]}
        print('%-24s 第 %d–%d 小節  有聲 %d/%d  增益 %+.1f dB  %s' % (name, s0 + 1, s0 + len(w), len(lv), len(w), rms_db(gain), ' '.join(b['roman'] for b in w[:12])))
    with open(os.path.join(out, 'night-music.json'), 'w') as f:
        json.dump(meta, f, separators=(',', ':'))
    print('%.1f MB → %s' % (total / 1e6, out))


if __name__ == '__main__':
    main()
