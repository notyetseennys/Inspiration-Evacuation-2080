#!/usr/bin/env python3
"""創作之夜：檢查 Flow Music 分軌的速度、小節線和每一小節的和弦。

步驟：解碼 → 起音包絡 → 估計速度 → 拍點相位 → 小節線（低音和和弦轉換最大的拍位）→ 每小節的色度 → 最接近的和弦。
不假設歌從第一拍開始，也不假設和弦的次序；最後報告有幾多個轉換跟四和弦循環走。

用法：python3 tools/music-check.py <音檔> <BPM> <和弦,和弦,和弦,和弦>
例如：python3 tools/music-check.py docs/music/guide/guide-lofi.mp3 85 Cmaj7,Am7,Fmaj7,G7
需要 numpy 和 ffmpeg。規格見 docs/music/night-stems.md。
"""
import subprocess
import sys

import numpy as np

SR = 22050
PC = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
      'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
QUAL = {'': [0, 4, 7], 'm': [0, 3, 7], 'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10], '7': [0, 4, 7, 10]}


def parse(ch):
    root = ch[:2] if len(ch) > 1 and ch[1] in '#b' else ch[:1]
    return PC[root], QUAL[ch[len(root):]]


def decode(path):
    raw = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', path, '-ac', '1', '-ar', str(SR),
                          '-f', 'f32le', 'pipe:'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<f4').astype(np.float64)


def onset_env(x, hop=256, win=1024):
    frames = 1 + (len(x) - win) // hop
    idx = np.arange(win)[None, :] + hop * np.arange(frames)[:, None]
    spec = np.abs(np.fft.rfft(x[idx] * np.hanning(win), axis=1))
    logs = np.log1p(100 * spec)
    flux = np.maximum(0, np.diff(logs, axis=0)).sum(axis=1)
    flux = np.concatenate([[0], flux])
    # 第 i 格的時間取窗口的中心
    return flux / (flux.max() + 1e-9), hop / SR, (win / 2) / SR


def tempo(env, dt, lo=60, hi=180):
    e = env - env.mean()
    ac = np.correlate(e, e, 'full')[len(e) - 1:]
    lags = np.arange(len(ac))
    bpms = 60 / np.maximum(lags * dt, 1e-9)
    ok = (bpms >= lo) & (bpms <= hi)
    best = lags[ok][np.argmax(ac[ok])]
    return 60 / (best * dt)


def beat_phase(env, dt, t0, bpm):
    """在一拍之內找相位，令拍點上的起音最強。"""
    beat = 60 / bpm
    phases = np.linspace(0, beat, 240, endpoint=False)
    n = int((len(env) * dt) / beat) - 2
    def at(t):
        i = int(round((t - t0) / dt))
        return env[i] if 0 <= i < len(env) else 0
    score = [sum(at(p + k * beat) for k in range(n)) for p in phases]
    return phases[int(np.argmax(score))]


def bar_phase(x, ph, bpm):
    """小節線 = 和弦轉換的地方：逐拍比較低音和和弦的色度，轉變最大的那個拍位就是第一拍。"""
    beat = 60 / bpm
    nb = int((len(x) / SR - ph) / beat)
    lo, hi = [], []
    for j in range(nb):
        i0 = int((ph + j * beat) * SR)
        seg = x[i0:i0 + int(beat * SR)]
        lo.append(chroma(seg, 40, 220))
        hi.append(chroma(seg, 220, 2000))
    nov = np.zeros(nb)
    for j in range(1, nb):
        nov[j] = (1 - lo[j] @ lo[j - 1]) + 0.5 * (1 - hi[j] @ hi[j - 1])
    k = int(np.argmax([nov[k::4].mean() for k in range(4)]))
    start = ph + k * beat
    while start - 4 * beat > -0.08:  # 相位可能稍早於 0：退回最前的一個小節線
        start -= 4 * beat
    return max(0.0, start)


def chroma(seg, fmin=50, fmax=2000):
    n = 1 << int(np.ceil(np.log2(max(len(seg), 2))))
    spec = np.abs(np.fft.rfft(seg * np.hanning(len(seg)), n))
    freqs = np.fft.rfftfreq(n, 1 / SR)
    ok = (freqs > fmin) & (freqs < fmax)
    midi = 69 + 12 * np.log2(freqs[ok] / 440)
    pcs = np.round(midi).astype(int) % 12
    c = np.bincount(pcs, weights=spec[ok] ** 2, minlength=12)
    return c / (np.linalg.norm(c) + 1e-9)


def template(root, ivs):
    t = np.zeros(12)
    for i in ivs:
        t[(root + i) % 12] = 1
    t[root] += 0.5
    return t / np.linalg.norm(t)


def main():
    path, bpm, chords = sys.argv[1], float(sys.argv[2]), sys.argv[3].split(',')
    x = decode(path)
    env, dt, t0 = onset_env(x)
    est = tempo(env, dt)
    temps = [template(*parse(c)) for c in chords]
    ph = beat_phase(env, dt, t0, bpm)
    start = bar_phase(x, ph, bpm)
    bar = 4 * 60 / bpm
    nbars = int((len(x) / SR - start) / bar)
    print('%s：長度 %.2f 秒；估計速度 %.1f BPM（指定 %g）；第一個小節線 %.3f 秒；%d 小節' % (path, len(x) / SR, est, bpm, start, nbars))
    labels = []
    for b in range(nbars):
        i0 = int((start + b * bar) * SR)
        c = chroma(x[i0:i0 + int(bar * SR)])
        sims = [float(c @ t) for t in temps]
        best = int(np.argmax(sims))
        labels.append(best)
        print('  第 %2d 小節：%-6s %.2f' % (b + 1, chords[best], sims[best]))
    follow = sum(1 for a, b in zip(labels, labels[1:]) if b == (a + 1) % 4)
    print('  和弦序列：%s' % ' '.join(chords[i] for i in labels))
    print('  跟循環走的轉換 %d/%d' % (follow, max(0, len(labels) - 1)))

if __name__ == '__main__':
    main()
