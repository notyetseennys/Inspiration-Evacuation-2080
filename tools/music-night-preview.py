#!/usr/bin/env python3
"""創作之夜：「玩家的歌」編曲引擎的原型，離線輸出示範音檔（審核新分軌用）。

先用 tools/music-build.py 把分軌處理成小節資料庫（同一 BPM、同一個調、每小節的和弦）。
- 母曲（樂隊）：按起承轉合在原曲裏找和弦路徑（動態規劃，原曲連續的小節最好，「和弦轉換相同」的跳接次之）。
- 層（主旋律、人聲、敲擊）：按卡的媒材出場。同一種媒材連續幾張 = 原曲連續的一整句；按和弦相容度挑選，用過的小節扣分。
- 斷：只剩鼓；倍率升高：樂隊逐層加入；轉之前上升音效，合有重擊；收工有掌聲。
輸出四段：選牌時的背景、一筆完整、一筆斷了、完整作品。

用法：python3 tools/music-night-preview.py <music-build 的輸出資料夾> <輸出資料夾>
需要 numpy 和 ffmpeg。
"""
import json
import os
import subprocess
import sys

import numpy as np

SR = 44100
QUALS = {'': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 7, 10], 'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10],
         'sus4': [0, 5, 7], 'dim': [0, 3, 6]}
ROLE_FN = {
    '起': {'I'}, '合': {'I'},
    '承': {'ii', 'iii', 'vi', 'IV'},
    '轉': {'V'},
}


def load(folder, name):
    d = os.path.join(folder, name)
    meta = json.load(open(os.path.join(d, name + '.json'), encoding='utf-8'))
    audio = {}
    for s, f in meta['stems'].items():
        raw = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', os.path.join(d, f), '-ac', '2',
                              '-ar', str(SR), '-f', 'f32le', 'pipe:'], capture_output=True, check=True).stdout
        audio[s] = np.frombuffer(raw, dtype='<f4').reshape(-1, 2).astype(np.float64)
    meta['audio'] = audio
    return meta


def pcs(b):
    return {(b['root'] + i) % 12 for i in QUALS[b['q']]}


def compat(a, b):
    A, B = pcs(a), pcs(b)
    return len(A & B) / len(A | B) + (0.25 if a['root'] == b['root'] else 0)


def live(song, stem, th=0.012):
    return [b for b in song['bars'] if b['rms'].get(stem, 0) > th]


def fn_ok(bar, role):
    r = bar['roman']
    if role in ('起', '合'):
        return r == 'I' and bar['q'] in ('', 'maj7', 'sus4')
    if role == '轉':
        return r == 'V'
    if role == '承':
        return r in ROLE_FN['承']
    return True


def band_path(song, roles):
    """動態規劃：每個角色找一小節；連續的小節不扣分，「和弦轉換相同」的跳接扣少許，其他扣多。"""
    bars = [b for b in song['bars'] if b['rms'].get('other', 0) > 0.02 and b['rms'].get('drums', 0) > 0.02]
    idx = {b['i']: b for b in bars}
    cands = []
    for r in roles:
        if r == '斷':
            cands.append([None])
        else:
            cands.append([b for b in bars if fn_ok(b, r)] or bars)
    # cost[j][k]
    INF = 1e9
    cost = [[0.0 if c is not None else 0.0 for c in cands[0]]]
    back = [[-1] * len(cands[0])]
    for j in range(1, len(roles)):
        row, brow = [], []
        for c in cands[j]:
            best = (INF, -1)
            for pk, p in enumerate(cands[j - 1]):
                if c is None or p is None:
                    t = 0.5
                elif c['i'] == p['i'] + 1:
                    t = 0.0
                else:
                    prev = idx.get(c['i'] - 1)
                    t = 0.35 if prev is not None and prev['chord'] == p['chord'] else 1.0
                    if c['i'] == p['i']:
                        t += 0.5  # 不要重複同一小節
                best = min(best, (cost[j - 1][pk] + t, pk))
            row.append(best[0])
            brow.append(best[1])
        cost.append(row)
        back.append(brow)
    k = int(np.argmin(cost[-1]))
    path = []
    for j in range(len(roles) - 1, -1, -1):
        path.append(cands[j][k])
        k = back[j][k]
    return path[::-1]


def layer_bars(layer, stem, band_bars, use, used):
    """層的選擇：同一種媒材連續幾張 = 一整句，取原曲連續的小節；單獨一張 = 選最配合的一小節。
    已經用過的小節扣分，令整首歌少重複。"""
    L = len(band_bars)
    bars = layer['bars']
    out = [None] * L
    j = 0
    while j < L:
        if not use[j] or band_bars[j] is None:
            j += 1
            continue
        k = j
        while k + 1 < L and use[k + 1] and band_bars[k + 1] is not None:
            k += 1
        n = k - j + 1
        best = None
        for s in range(0, len(bars) - n + 1):
            sc = 0.0
            for q in range(n):
                lb = bars[s + q]
                if lb['rms'].get(stem, 0) < 0.012:
                    sc -= 0.8
                    continue
                sc += compat(lb, band_bars[j + q]) - (0.3 if (stem, lb['i']) in used else 0)
            if best is None or sc > best[0]:
                best = (sc, s)
        for q in range(n):
            lb = bars[best[1] + q]
            if lb['rms'].get(stem, 0) >= 0.012 and compat(lb, band_bars[j + q]) >= 0.45:
                out[j + q] = lb
                used.add((stem, lb['i']))
        j = k + 1
    return out


class Mixer:
    def __init__(self, seconds):
        self.buf = np.zeros((int(seconds * SR) + SR, 2))

    def place(self, src, t_src, t_dst, dur, gain=1.0, pre=0.012, post=0.06, fade_in=True, fade_out=True):
        a = int((t_src - pre) * SR)
        b = int((t_src + dur + post) * SR)
        d = int((t_dst - pre) * SR)
        if a < 0:
            d -= a
            a = 0
        seg = src[a:b].copy()
        n = len(seg)
        if n <= 0:
            return
        env = np.ones(n)
        fi, fo = int(pre * SR), int(post * SR)
        if fade_in and fi > 0:
            env[:fi] = np.linspace(0, 1, fi)
        if fade_out and fo > 0:
            env[-fo:] = np.linspace(1, 0, fo)
        seg *= (env * gain)[:, None]
        if d < 0:
            seg, d = seg[-d:], 0
        m = min(len(seg), len(self.buf) - d)
        if m > 0:
            self.buf[d:d + m] += seg[:m]


def place_run(mix, song, stem, bars_out, t0, bar, gain_fn):
    """把同一首歌、連續的小節合併成一段來貼，只在接口處淡入淡出。"""
    audio = song['audio'].get(stem)
    if audio is None:
        return
    j = 0
    while j < len(bars_out):
        b = bars_out[j]
        if b is None:
            j += 1
            continue
        k = j
        while k + 1 < len(bars_out) and bars_out[k + 1] is not None and bars_out[k + 1]['i'] == bars_out[k]['i'] + 1 \
                and gain_fn(k + 1) == gain_fn(j):
            k += 1
        n = k - j + 1
        mix.place(audio, b['t'], t0 + j * bar, n * bar, gain_fn(j))
        j = k + 1


def noise(n, rng):
    return rng.standard_normal(n)


def fx_riser(mix, t, dur, gain=0.06, seed=1):
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    x = noise(n, rng)
    # 逐漸變亮：用一階低通，截止頻率從 300 Hz 升到 8 kHz
    out = np.empty(n)
    acc = 0.0
    for i in range(n):
        fc = 300 * (8000 / 300) ** (i / n)
        a = np.exp(-2 * np.pi * fc / SR)
        acc = (1 - a) * x[i] + a * acc
        out[i] = acc
    env = np.linspace(0, 1, n) ** 2
    s = out * env * gain * 3
    mix.buf[int(t * SR):int(t * SR) + n] += np.stack([s, s[::-1] * 0 + s], 1)


def fx_impact(mix, t, gain=0.35, seed=2):
    rng = np.random.default_rng(seed)
    n = int(1.6 * SR)
    tt = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (40 + 40 * np.exp(-tt / 0.05)) * tt) * np.exp(-tt / 0.35)
    hiss = noise(n, rng) * np.exp(-tt / 0.6) * 0.25
    hiss = hiss - np.convolve(hiss, np.ones(8) / 8, 'same')
    s = (boom + hiss) * gain
    i = int(t * SR)
    mix.buf[i:i + n] += np.stack([s, s], 1)


def fx_applause(mix, t, dur=5.0, gain=0.5, seed=3):
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    out = np.zeros((n, 2))
    clap_n = int(0.02 * SR)
    tt = np.arange(clap_n) / SR
    for _ in range(int(dur * 60)):
        at = int(rng.uniform(0, dur - 0.05) * SR)
        c = noise(clap_n, rng) * np.exp(-tt / 0.006)
        c = c - np.convolve(c, np.ones(4) / 4, 'same')
        pan = rng.uniform(0.2, 0.8)
        out[at:at + clap_n, 0] += c * (1 - pan)
        out[at:at + clap_n, 1] += c * pan
    env = np.minimum(1, np.arange(n) / (0.4 * SR)) * np.minimum(1, (n - np.arange(n)) / (1.5 * SR))
    i = int(t * SR)
    m = min(n, len(mix.buf) - i)
    mix.buf[i:i + m] += (out * env[:, None] * gain)[:m]


def lowpass_stereo(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = np.zeros(2)
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def master(buf, path, target_peak=0.89):
    y = np.tanh(buf * 1.1) / np.tanh(1.1)
    nz = np.nonzero(np.abs(y).max(axis=1) > 1e-4)[0]
    if len(nz):
        y = y[:nz[-1] + int(0.5 * SR)]
    y = y / (np.abs(y).max() + 1e-9) * target_peak
    pcm = (np.clip(y, -1, 1) * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2',
                    '-i', 'pipe:', '-b:a', '192k', path], input=pcm, check=True)


STEM_OF = {'聲': ('lead', 'other'), '紙': ('vocal', 'vocals'), '身': ('lead', 'drums')}


USED = set()


def render_stroke(mix, band, layers, roles, media, t0, escalate=False, fx=True, report=None):
    bar = band['bar']
    path = band_path(band, roles)
    # 樂隊
    stems = ('other', 'bass', 'drums')
    for si, stem in enumerate(stems):
        def g(j, si=si, stem=stem):
            if roles[j] == '斷':
                return 1.0 if stem == 'drums' else 0.0
            if escalate and j < si:  # 第 1 小節只有和弦，第 2 小節加低音，第 3 小節加鼓
                return 0.0
            return 1.0
        bars_out = []
        for j, b in enumerate(path):
            if roles[j] == '斷':
                # 斷：只剩鼓，取上一小節的鼓（歌停一停）
                prev = next((p for p in path[:j][::-1] if p is not None), None)
                bars_out.append(prev if stem == 'drums' else None)
            else:
                bars_out.append(b if g(j) > 0 else None)
        place_run(mix, band, stem, bars_out, t0, bar, lambda j, g=g: g(j))
    # 層
    chosen = {}
    for m in ('聲', '紙', '身'):
        use = [x == m for x in media]
        if not any(use):
            continue
        key, stem = STEM_OF[m]
        win = layer_bars(layers[key], stem, path, use, USED)
        chosen[m] = (win, 0)
        gain = {'other': 1.0, 'vocals': 0.95, 'drums': 0.55}[stem]
        place_run(mix, layers[key], stem, win, t0, bar, lambda j, gain=gain: gain)
    if fx and '轉' in roles and '合' in roles:
        z = roles.index('合')
        fx_riser(mix, t0 + (z - 1) * bar, bar)
        fx_impact(mix, t0 + z * bar)
    if report is not None:
        report.append(dict(roles=''.join(roles), media=''.join(media),
                           band=[(p['i'] + 1, p['chord'], p['roman']) if p else None for p in path],
                           layers={m: [(b['i'] + 1, b['chord']) if b else None for b in w] for m, (w, _) in chosen.items()}))
    return len(roles) * bar


def main():
    built, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    band = load(built, 'ns-lofi-base')
    layers = {'lead': load(built, 'ns-lofi-lead-warmth'), 'vocal': load(built, 'ns-lofi-vocal')}
    bar = band['bar']
    rep = []

    # 1. 選牌：樂隊隔着牆（低通），8 小節
    mix = Mixer(10 * bar)
    for stem in ('drums', 'bass', 'other'):
        mix.place(band['audio'][stem], band['bars'][4]['t'], 0.0, 8 * bar, 0.8)
    mix.buf = lowpass_stereo(mix.buf, 900)
    mix.buf[:int(2 * SR)] *= np.linspace(0, 1, int(2 * SR))[:, None]
    master(mix.buf, os.path.join(out, '1-select.mp3'), 0.5)

    # 2. 一筆：起承承轉合（聲・紙・聲・身・聲），樂隊逐層加入
    roles = list('起承承轉合')
    media = list('聲紙聲身聲')
    mix = Mixer(8 * bar)
    render_stroke(mix, band, layers, roles, media, 0.3, escalate=True, report=rep)
    master(mix.buf, os.path.join(out, '2-stroke-full.mp3'))

    # 3. 一筆：起承（斷）承
    roles = list('起承斷承')
    media = list('聲聲紙聲')
    mix = Mixer(7 * bar)
    render_stroke(mix, band, layers, roles, media, 0.3, report=rep)
    master(mix.buf, os.path.join(out, '3-stroke-broken.mp3'))

    # 4. 完整作品：前奏 2 小節 → 三筆 → 結尾 → 掌聲
    strokes = [(list('起承承轉合'), list('聲紙聲身聲')),
               (list('起承轉合'), list('紙聲聲紙')),
               (list('起承承轉合'), list('聲聲紙聲紙'))]
    total = 2 + sum(len(r) for r, _ in strokes) + 3
    mix = Mixer((total + 4) * bar + 6)
    t = 0.3
    intro = band_path(band, ['承', '轉'])
    place_run(mix, band, 'other', intro, t, bar, lambda j: 0.9)
    t += 2 * bar
    for roles, media in strokes:
        t += render_stroke(mix, band, layers, roles, media, t, report=rep)
    end = band_path(band, ['合'])[0]
    for stem in ('other', 'bass'):
        mix.place(band['audio'][stem], end['t'], t, bar * 1.0, 1.0, post=1.2)
    mix.place(band['audio']['drums'], end['t'], t, 0.25 * bar, 1.0, post=0.3)
    fx_impact(mix, t, 0.3)
    fx_applause(mix, t + bar * 0.8, 5.0, 0.35)
    master(mix.buf, os.path.join(out, '4-full-work.mp3'))

    json.dump(rep, open(os.path.join(out, 'report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for r in rep:
        print(r['roles'], r['media'])
        print('  樂隊：', ' '.join('%d:%s(%s)' % x if x else '斷' for x in r['band']))
        for m, w in r['layers'].items():
            print('  %s：' % m, ' '.join('%d:%s' % x if x else '—' for x in w))


if __name__ == '__main__':
    main()
