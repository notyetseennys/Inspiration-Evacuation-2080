#!/usr/bin/env python3
"""創作之夜：給 Flow Music 上載改編用的「樣板」音軌（guide track）。

每種風格 16 小節加 1 小節結尾：準確的 BPM、調和四和弦循環，第一拍就開始。
樣板只有鼓、低音和和弦，聲音簡單；用途是鎖定速度、調和和弦，令製作人在 Flow Music
生成的每一首歌都可以逐小節對齊、互相配合。規格見 docs/music/night-stems.md。

用法：python3 tools/music-guide.py [輸出資料夾]（預設 docs/music/guide/）
需要 numpy 和 ffmpeg。
"""
import os
import subprocess
import sys

import numpy as np

SR = 44100
PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11, 'Bb': 10}
QUAL = {'': [0, 4, 7], 'm': [0, 3, 7], 'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10], '7': [0, 4, 7, 10]}

# 和弦循環和 BPM 必須和 docs/music/night-stems.md 第二節一致
STYLES = {
    'lofi': dict(bpm=85, swing=0.58, chords=[('C', 'maj7'), ('A', 'm7'), ('F', 'maj7'), ('G', '7')]),
    'citypop': dict(bpm=112, swing=0.5, chords=[('F', 'maj7'), ('D', 'm7'), ('Bb', 'maj7'), ('C', '7')]),
    'synth': dict(bpm=100, swing=0.5, chords=[('A', 'm'), ('F', ''), ('C', ''), ('G', '')]),
}
BARS = 16


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def voicing(root, qual, low=53):
    """根音放在 [low, low+12)，其餘和弦音往上疊。"""
    r = PC[root]
    base = low + (r - low) % 12
    return [base + i for i in QUAL[qual]]


def bass_note(root, low=33):
    return low + (PC[root] - low) % 12


def onepole_lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


class Mix:
    def __init__(self, seconds, seed):
        self.buf = np.zeros(int(seconds * SR) + SR)
        self.rng = np.random.default_rng(seed)

    def add(self, t, sig, gain=1.0):
        i = int(round(t * SR))
        n = min(len(sig), len(self.buf) - i)
        if n > 0:
            self.buf[i:i + n] += gain * sig[:n]

    # 鼓
    def kick(self, t, gain=0.9):
        n = int(0.38 * SR)
        tt = np.arange(n) / SR
        f = 46 + 80 * np.exp(-tt / 0.028)
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.13)
        s[:int(0.003 * SR)] += 0.4 * self.rng.standard_normal(int(0.003 * SR))
        self.add(t, np.tanh(1.6 * s), gain)

    def snare(self, t, gain=0.5, tail=0.11):
        n = int(0.4 * SR)
        tt = np.arange(n) / SR
        noise = self.rng.standard_normal(n)
        noise = noise - onepole_lp(noise, 1200)  # 去低頻
        noise = onepole_lp(noise, 7000)
        s = 0.8 * noise * np.exp(-tt / tail) + 0.6 * np.sin(2 * np.pi * 190 * tt) * np.exp(-tt / 0.05)
        self.add(t, s, gain)

    def hat(self, t, gain=0.16, tail=0.018):
        n = int(0.12 * SR)
        tt = np.arange(n) / SR
        noise = self.rng.standard_normal(n)
        noise = noise - onepole_lp(noise, 6000)
        self.add(t, noise * np.exp(-tt / tail), gain)

    # 低音
    def bass(self, t, midi, dur, gain=0.42):
        n = int(dur * SR)
        tt = np.arange(n) / SR
        f = mtof(midi)
        s = np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(4 * np.pi * f * tt) + 0.12 * np.sin(6 * np.pi * f * tt)
        env = np.minimum(1, tt / 0.006) * np.minimum(1, (dur - tt) / 0.03) * (0.75 + 0.25 * np.exp(-tt / 0.2))
        self.add(t, np.tanh(1.3 * s * env), gain)

    # 電鋼琴（和弦）
    def ep(self, t, notes, dur, gain=0.16):
        n = int((dur + 0.25) * SR)
        tt = np.arange(n) / SR
        rel = np.clip((dur + 0.25 - tt) / 0.25, 0, 1)
        out = np.zeros(n)
        for m in notes:
            f = mtof(m)
            tone = np.sin(2 * np.pi * f * tt + 0.6 * np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.4))
            bell = 0.18 * np.sin(2 * np.pi * f * 14 * tt) * np.exp(-tt / 0.03)
            out += (tone * np.exp(-tt / 1.6) + bell) * rel
        self.add(t, out * np.minimum(1, tt / 0.004), gain)

    # 合成器墊音（和弦）
    def pad(self, t, notes, dur, gain=0.07):
        n = int((dur + 0.12) * SR)
        tt = np.arange(n) / SR
        env = np.minimum(1, tt / 0.08) * np.clip((dur + 0.12 - tt) / 0.12, 0, 1)
        out = np.zeros(n)
        for m in notes:
            for det in (-0.0018, 0.0018):
                f = mtof(m) * (1 + det)
                for k in range(1, 9):
                    out += np.sin(2 * np.pi * f * k * tt + k) / k * (0.85 ** k)
        self.add(t, out * env, gain)


def render(name, cfg):
    bpm = cfg['bpm']
    beat = 60.0 / bpm
    bar = 4 * beat
    swing = cfg['swing']
    mix = Mix((BARS + 2) * bar, seed=2080)

    def at(b, pos):
        """第 b 小節、第 pos 拍（0 起計）的時間；八分音符的後半拍按 swing 推後。"""
        whole, frac = divmod(pos, 1.0)
        if abs(frac - 0.5) < 1e-9:
            frac = swing
        return b * bar + (whole + frac) * beat

    for b in range(BARS):
        root, qual = cfg['chords'][b % 4]
        notes = voicing(root, qual)
        bn = bass_note(root)
        fill = b % 4 == 3
        if name == 'lofi':
            for p in (0, 2.5):
                mix.kick(at(b, p))
            for p in (1, 3):
                mix.snare(at(b, p), 0.42)
            for i in range(8):
                mix.hat(at(b, i / 2), 0.14 if i % 2 else 0.18)
            mix.bass(at(b, 0), bn, 1.9 * beat)
            mix.bass(at(b, 2.5), bn, 1.3 * beat)
            mix.ep(at(b, 0), notes, 2.2 * beat)
            mix.ep(at(b, 2.5), notes, 1.3 * beat, 0.11)
        elif name == 'citypop':
            for p in (0, 1.5, 2) if not fill else (0, 1.5, 2, 3.5):
                mix.kick(at(b, p), 0.8)
            for p in (1, 3):
                mix.snare(at(b, p), 0.5, 0.09)
            for i in range(16):
                mix.hat(b * bar + i * beat / 4, 0.12 if i % 2 else 0.17, 0.014)
            for i in range(8):
                mix.bass(at(b, i / 2), bn + (12 if i % 2 else 0), 0.42 * beat, 0.36)
            for p, d in ((0, 0.7), (1.5, 0.45), (2.5, 0.45), (3.5, 0.4)):
                mix.ep(at(b, p), [m + 12 if m < 57 else m for m in notes], d * beat, 0.13)
        else:  # synth
            for p in range(4):
                mix.kick(at(b, p), 0.85)
            for p in (1, 3):
                mix.snare(at(b, p), 0.55, 0.2)
            for i in range(8):
                mix.hat(at(b, i / 2), 0.17 if i % 2 else 0.08, 0.025)
            for i in range(8):
                mix.bass(at(b, i / 2), bn, 0.45 * beat, 0.34)
            mix.pad(at(b, 0), notes + [notes[0] + 12], bar - 0.02)

    # 結尾：主和弦一小節
    root, qual = cfg['chords'][0]
    notes = voicing(root, qual)
    end = BARS * bar
    mix.kick(end)
    mix.bass(end, bass_note(root), 3 * beat)
    if name == 'synth':
        mix.pad(end, notes + [notes[0] + 12], 3 * beat)
    else:
        mix.ep(end, notes, 3 * beat)

    total = int((BARS + 1) * bar * SR + 0.6 * SR)
    y = mix.buf[:total]
    y[-int(0.3 * SR):] *= np.linspace(1, 0, int(0.3 * SR))
    y = y / np.max(np.abs(y)) * 0.89  # 約 -1 dBFS
    return y


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'docs', 'music', 'guide')
    os.makedirs(out, exist_ok=True)
    for name, cfg in STYLES.items():
        y = render(name, cfg)
        pcm = (np.clip(y, -1, 1) * 32767).astype('<i2').tobytes()
        path = os.path.join(out, 'guide-%s.mp3' % name)
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1',
                        '-i', 'pipe:', '-ac', '2', '-b:a', '192k', '-metadata', 'title=guide-%s %d BPM' % (name, cfg['bpm']),
                        path], input=pcm, check=True)
        print('%s  %d BPM  %.1f 秒' % (path, cfg['bpm'], len(y) / SR))


if __name__ == '__main__':
    main()
