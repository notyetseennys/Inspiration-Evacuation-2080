#!/usr/bin/env python3
"""創作之夜：把 Flow Music 的分軌處理成遊戲用的「小節資料庫」。

步驟：
1. 讀入一首歌的分軌（zip 或資料夾；Flow Music 拆成 vocals、drums、bass、other）。
2. 分析原曲：準確速度、拍點、小節線、調性。
3. 用 rubberband 變速到指定 BPM；有母曲的話，移調到「時間平均的音高分佈」和母曲最相關的位置（不靠調性名稱，避免五度的誤判）。
   - 鼓只變速不移調；
   - 其他分軌保留共振峰。
4. 再分析處理後的分軌：每一小節的和弦（低音分軌定根音，其他分軌定性質）、級數和各分軌的音量；
   再用「每小節的平均鼓點形狀」和母曲做互相關，校正小節線（誤差約 3 毫秒）。
5. 輸出處理後的分軌（WAV 或 MP3）和 <名>.json。

用法：
  python3 tools/music-build.py <母曲 zip> --bpm 85 --name ns-lofi-base --out 資料夾
  python3 tools/music-build.py <其他歌 zip> --bpm 85 --ref 資料夾/ns-lofi-base/ns-lofi-base.json --out 資料夾
規格見 docs/music/night-stems.md。需要 numpy 和有 rubberband 的 ffmpeg。
"""
import argparse
import glob
import json
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile

import numpy as np

SR = 44100
ASR = 22050  # 分析用
NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
ALIAS = {'C#': 1, 'D#': 3, 'F#': 6, 'G#': 8, 'A#': 10}
QUALS = {'': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 7, 10], 'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10],
         'sus4': [0, 5, 7], 'dim': [0, 3, 6]}
MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
ROMAN = {0: 'I', 1: 'bII', 2: 'ii', 3: 'bIII', 4: 'iii', 5: 'IV', 6: '#IV', 7: 'V', 8: 'bVI', 9: 'vi', 10: 'bVII', 11: 'vii'}
STEMS = ('drums', 'bass', 'other', 'vocals')


def pc(name):
    return ALIAS[name] if name in ALIAS else NAMES.index(name)


def decode(path, sr=ASR, mono=True):
    args = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', path, '-ac', '1' if mono else '2', '-ar', str(sr),
            '-f', 'f32le', 'pipe:']
    raw = subprocess.run(args, capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype='<f4').astype(np.float64)
    return x if mono else x.reshape(-1, 2)


def find_stems(folder):
    out = {}
    for s in STEMS:
        c = sorted(p for p in glob.glob(os.path.join(folder, '**', s + '.*'), recursive=True)
                   if os.path.splitext(p)[1].lower() in ('.m4a', '.mp3', '.wav', '.flac', '.ogg', '.aac'))
        if c:
            out[s] = c[0]
    return out


# ---------- 分析 ----------

def onset_env(x, hop=128, win=1024):
    frames = 1 + (len(x) - win) // hop
    idx = np.arange(win)[None, :] + hop * np.arange(frames)[:, None]
    spec = np.abs(np.fft.rfft(x[idx] * np.hanning(win), axis=1))
    flux = np.maximum(0, np.diff(np.log1p(100 * spec), axis=0)).sum(axis=1)
    flux = np.concatenate([[0], flux])
    flux = np.maximum(flux - np.convolve(flux, np.ones(64) / 64, 'same'), 0)
    return flux / (flux.max() + 1e-9), hop / ASR, (win / 2) / ASR


def tempo_phase(env, dt, t0, bpm_hint=None, lo=70, hi=180):
    n = len(env)
    t = np.arange(n) * dt + t0
    if bpm_hint is None:
        e = env - env.mean()
        f = np.fft.rfft(e, 2 * n)
        ac = np.fft.irfft(f * np.conj(f))[:n]
        lags = np.arange(n)
        bpms = 60 / np.maximum(lags * dt, 1e-9)
        ok = (bpms >= lo) & (bpms <= hi)
        bpm0 = 60 / (lags[ok][np.argmax(ac[ok])] * dt)
        grid = np.arange(bpm0 - 1.5, bpm0 + 1.5, 0.01)
    else:
        grid = [bpm_hint]
    best = None
    for bpm in grid:
        beat = 60 / bpm
        z = np.sum(env * np.exp(2j * np.pi * t / beat))
        if best is None or abs(z) > best[0]:
            best = (abs(z), bpm, np.angle(z))
    _, bpm, ang = best
    beat = 60 / bpm
    return bpm, (-ang / (2 * np.pi)) % 1 * beat


def groove(drums, start, bar, bars, hop=64, win=512):
    """每小節的平均鼓點形狀（起音強度，約 3 毫秒一格），用來和母曲對齊。"""
    frames = 1 + (len(drums) - win) // hop
    idx = np.arange(win)[None, :] + hop * np.arange(frames)[:, None]
    spec = np.abs(np.fft.rfft(drums[idx] * np.hanning(win), axis=1))
    env = np.concatenate([[0], np.maximum(0, np.diff(np.log1p(100 * spec), axis=0)).sum(axis=1)])
    dt, t0 = hop / ASR, (win / 2) / ASR
    L = int(round(bar / dt))
    prof, n = np.zeros(L), 0
    for b in bars:
        if b['rms'].get('drums', 0) < 0.02:
            continue
        i = int(round((b['t'] - t0) / dt))
        if 0 <= i and i + L <= len(env):
            prof += env[i:i + L]
            n += 1
    return (prof / max(n, 1)), dt


def align_lag(prof, ref, dt, beat):
    """在半拍之內找令鼓點形狀最吻合的偏移（秒）；正數 = 這首的拍點比小節線早。"""
    L = min(len(prof), len(ref))
    prof, ref = np.asarray(prof[:L]), np.asarray(ref[:L])
    lim = int(beat / 2 / dt)
    best = max(range(-lim, lim + 1), key=lambda k: float(np.dot(np.roll(prof, k), ref)))
    return best * dt


def chroma(seg, fmin, fmax, sr=ASR):
    if len(seg) < 256:
        return np.zeros(12)
    n = 1 << int(np.ceil(np.log2(len(seg))))
    spec = np.abs(np.fft.rfft(seg * np.hanning(len(seg)), n))
    freqs = np.fft.rfftfreq(n, 1 / sr)
    ok = (freqs > fmin) & (freqs < fmax)
    pcs = np.round(69 + 12 * np.log2(freqs[ok] / 440)).astype(int) % 12
    c = np.bincount(pcs, weights=spec[ok] ** 2, minlength=12)
    return c / (np.linalg.norm(c) + 1e-12)


def profile(x, fmin, fmax, win=8192, hop=4096, sr=ASR):
    """時間平均的音高分佈：每一格先歸一，令每個時刻同樣重要（不會被幾個長音主導）。"""
    out = np.zeros(12)
    freqs = np.fft.rfftfreq(win, 1 / sr)
    ok = (freqs > fmin) & (freqs < fmax)
    pcs = np.round(69 + 12 * np.log2(freqs[ok] / 440)).astype(int) % 12
    w = np.hanning(win)
    for i in range(0, len(x) - win, hop):
        c = np.bincount(pcs, weights=np.abs(np.fft.rfft(x[i:i + win] * w))[ok] ** 2, minlength=12)
        out += c / (c.sum() + 1e-12)
    return out / (out.sum() + 1e-12)


def key_of(ch):
    best = None
    for r in range(12):
        for mode, prof in (('major', MAJ), ('minor', MIN)):
            s = np.corrcoef(ch, np.roll(prof, r))[0, 1]
            if best is None or s > best[0]:
                best = (s, r, mode)
    return best


def label(bass_c, other_c):
    root = int(np.argmax(bass_c)) if bass_c.any() else int(np.argmax(other_c))
    best = None
    for q, ivs in QUALS.items():
        t = np.zeros(12)
        t[[(root + i) % 12 for i in ivs]] = 1
        t /= np.linalg.norm(t)
        s = float(other_c @ t) + (0.02 if q in ('', 'm') else 0)
        if best is None or s > best[0]:
            best = (s, q)
    return root, best[1], best[0]


def bar_grid(drums, bass, bpm_hint=None):
    env, dt, t0 = onset_env(drums if drums is not None else bass)
    bpm, phase = tempo_phase(env, dt, t0, bpm_hint)
    beat = 60 / bpm
    n = len(bass) / ASR
    nb = int((n - phase) / beat)
    bc = [chroma(bass[int((phase + j * beat) * ASR):int((phase + (j + 1) * beat) * ASR)], 30, 300) for j in range(nb)]
    nov = np.array([0] + [1 - bc[j] @ bc[j - 1] for j in range(1, nb)])
    k = int(np.argmax([nov[i::4].mean() for i in range(4)]))
    start = phase + k * beat
    while start - 4 * beat > -0.05:
        start -= 4 * beat
    return bpm, max(start, 0.0)


def analyse(paths, bpm_hint=None, key=None):
    """key：(主音, 'major') 指定級數的主音；None = 自動。"""
    a = {s: decode(p) for s, p in paths.items()}
    n = min(len(v) for v in a.values())
    a = {s: v[:n] for s, v in a.items()}
    bass = a.get('bass', np.zeros(n))
    other = a.get('other', np.zeros(n))
    bpm, start = bar_grid(a.get('drums'), bass, bpm_hint)
    bar = 240 / bpm
    ks, kr, kmode = key_of(chroma(other, 80, 2000) + 0.5 * chroma(bass, 30, 300))
    if key is not None:
        kr, kmode = key
    bars = []
    for b in range(int((n / ASR - start) / bar)):
        i0, i1 = int((start + b * bar) * ASR), int((start + (b + 1) * bar) * ASR)
        root, q, fit = label(chroma(bass[i0:i0 + (i1 - i0) // 2], 30, 300), chroma(other[i0:i1], 80, 2000))
        rms = {s: round(float(np.sqrt(np.mean(v[i0:i1] ** 2))), 4) for s, v in a.items()}
        bars.append(dict(i=b, t=round(start + b * bar, 4), chord=NAMES[root] + q, root=root, q=q,
                         fit=round(fit, 3), rms=rms))
    tonic = key[0] if key is not None else chord_tonic(bars)
    for b in bars:
        b['roman'] = ROMAN[(b['root'] - tonic) % 12]
    gv, gdt = groove(a['drums'], start, bar, bars) if 'drums' in a else (np.zeros(1), 1.0)
    prof = profile(other, 80, 2000) + 0.5 * profile(bass, 30, 300)
    if 'vocals' in a and np.sqrt(np.mean(a['vocals'] ** 2)) > 0.01:
        prof = prof + profile(a['vocals'], 80, 2000)
    return dict(bpm=round(bpm, 3), start=round(start, 4), key=NAMES[kr], mode=kmode, keyfit=round(float(ks), 3),
                tonic=chord_tonic(bars), chroma=[round(float(v), 5) for v in prof / prof.sum()],
                groove=[round(float(v), 3) for v in gv], groove_dt=gdt,
                bars=bars, dur=round(n / ASR, 3))


def pcs(root, q):
    return {(root + i) % 12 for i in QUALS[q]}


def compat(a, b):
    """兩個和弦的相容度：音的重疊（Jaccard），同根音再加分。"""
    A, B = pcs(a['root'], a['q']), pcs(b['root'], b['q'])
    return len(A & B) / len(A | B) + (0.25 if a['root'] == b['root'] else 0)


def best_shift(bars, ref_bars):
    """選移調：令這首歌每一小節的和弦，在母曲的和弦裏都找得到相同或相容的和弦。"""
    vocab = {(b['root'], b['q']) for b in ref_bars}
    vocab = [dict(root=r, q=q) for r, q in vocab]
    live = [b for b in bars if max(b['rms'].values()) > 0.01] or bars
    scores = {}
    for k in range(-6, 6):
        tot = 0.0
        for b in live:
            sb = dict(root=(b['root'] + k) % 12, q=b['q'])
            tot += max(compat(sb, v) for v in vocab)
        scores[k] = tot / len(live) - 0.015 * abs(k)
    return max(scores, key=scores.get), scores


DIATONIC = {0: ('', 'maj7'), 2: ('m', 'm7'), 4: ('m', 'm7'), 5: ('', 'maj7'), 7: ('', '7'), 9: ('m', 'm7'), 11: ('dim',)}


def chord_tonic(bars):
    """用和弦找主音：順階和弦加分，屬七和弦解決到大七或大三和弦（V7→I）加很多分。"""
    best = None
    for k in range(12):
        sc = 0.0
        for j, b in enumerate(bars):
            rel = (b['root'] - k) % 12
            q = b['q']
            if rel in DIATONIC and (q in DIATONIC[rel] or q == 'sus4'):
                sc += 1
            else:
                sc -= 0.5
            if rel == 0 and q in ('', 'maj7'):
                sc += 0.5
            if j + 1 < len(bars) and rel == 7 and q == '7':
                n = bars[j + 1]
                if (n['root'] - k) % 12 == 0 and n['q'] in ('', 'maj7'):
                    sc += 3
        if best is None or sc > best[0]:
            best = (sc, k)
    return best[1]


# ---------- 處理 ----------

def process(src, dst, tempo, semis, drums):
    filt = 'rubberband=tempo=%.6f:pitch=%.6f:pitchq=quality:formant=%s:transients=%s' % (
        tempo, 1.0 if drums else 2 ** (semis / 12), 'shifted' if drums else 'preserved', 'crisp' if drums else 'mixed')
    if abs(tempo - 1) < 1e-4 and (drums or semis == 0):
        filt = 'anull'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-af', filt, '-ar', str(SR),
                    '-ac', '2', '-c:a', 'pcm_s16le', dst], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('--bpm', type=float, required=True)
    ap.add_argument('--ref', help='母曲的 json：按整首的音高分佈對齊（移調），級數用母曲的主音；不給 = 這首就是母曲，不移調')
    ap.add_argument('--name')
    ap.add_argument('--out', default='.')
    ap.add_argument('--mp3', type=int, default=0, help='輸出 MP3 的 kbps；0 = 保留 WAV')
    args = ap.parse_args()
    name = args.name or os.path.splitext(os.path.basename(args.src.rstrip('/')))[0]
    work = tempfile.mkdtemp(prefix='mb-')
    try:
        folder = args.src
        if args.src.lower().endswith('.zip'):
            folder = os.path.join(work, 'src')
            os.makedirs(folder)
            with zipfile.ZipFile(args.src) as z:
                for i in z.infolist():
                    base = os.path.basename(i.filename)
                    if base and not base.startswith('.'):
                        with open(os.path.join(folder, base), 'wb') as f:
                            f.write(z.read(i))
        paths = find_stems(folder)
        if not paths:
            sys.exit('找不到分軌：%s' % args.src)
        orig = analyse(paths)
        if args.ref:
            ref = json.load(open(args.ref, encoding='utf-8'))
            rc, oc = np.array(ref['chroma']), np.array(orig['chroma'])
            corr = {k: float(np.corrcoef(np.roll(oc, k), rc)[0, 1]) - 0.005 * abs(k) for k in range(-6, 6)}
            semis = max(corr, key=corr.get)
            _, vocab = best_shift(orig['bars'], ref['bars'])
            print('  移調候選（音高分佈相關／和弦配對）：' + '  '.join(
                '%+d:%.2f/%.2f' % (k, corr[k], vocab[k]) for k in sorted(corr, key=lambda k: -corr[k])[:4]))
            tonic = pc(ref['key'])
        else:
            semis = 0
            tonic = orig['tonic']
        key_name = NAMES[tonic]
        tempo = args.bpm / orig['bpm']
        out_dir = os.path.join(args.out, name)
        os.makedirs(out_dir, exist_ok=True)
        done = {}
        for s, p in paths.items():
            dst = os.path.join(out_dir, s + '.wav')
            process(p, dst, tempo, semis, s == 'drums')
            done[s] = dst
        res = analyse(done, bpm_hint=args.bpm, key=(tonic, 'major'))
        lag = 0.0
        if args.ref and ref.get('groove'):
            lag = align_lag(res['groove'], ref['groove'], res['groove_dt'], 60 / args.bpm)
            res['start'] = round(res['start'] - lag, 4)
            for b in res['bars']:
                b['t'] = round(b['t'] - lag, 4)
            print('  按鼓點形狀對齊母曲：小節線移 %+.1f 毫秒' % (-lag * 1000))
        if args.mp3:
            for s, p in list(done.items()):
                mp3 = p[:-4] + '.mp3'
                subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', p, '-b:a', '%dk' % args.mp3, mp3],
                               check=True)
                os.remove(p)
                done[s] = mp3
        meta = dict(name=name, bpm=args.bpm, key=key_name, shift=semis, tempo=round(tempo, 6), chroma=res['chroma'],
                    src=dict(bpm=orig['bpm'], key=NAMES[orig['tonic']], shift=semis),
                    start=res['start'], bar=round(240 / args.bpm, 6), dur=res['dur'], align_ms=round(-lag * 1000, 1),
                    groove=res['groove'], groove_dt=res['groove_dt'],
                    stems={s: os.path.basename(p) for s, p in done.items()}, bars=res['bars'])
        with open(os.path.join(out_dir, name + '.json'), 'w', encoding='utf-8') as f:
            json.dump(meta, f, ensure_ascii=False, indent=1)
        seq = ' '.join(b['chord'] for b in res['bars'])
        print('%s：原曲 %.2f BPM，主音 %s → %g BPM，%s 大調（移 %+d 半音，變速 ×%.4f）；第一個小節線 %.3f 秒；%d 小節' % (
            name, orig['bpm'], NAMES[orig['tonic']], args.bpm, key_name, semis, tempo, res['start'], len(res['bars'])))
        print('  ' + seq)
        print('  ' + ' '.join(b['roman'] + b['q'] for b in res['bars']))
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == '__main__':
    main()
