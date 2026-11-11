#!/usr/bin/env python3
"""創作之夜：把製作人的原圖轉成網頁版素材（WebP，按畫布 960×600 的顯示大小）和清單 night-art.json。

- 天空：960×600，地平線在 y=340；記下天空的平均色（統一色調用）。
- 遠景、碼頭、中景、主角、小景、夥伴：裁到主體；中景切去自帶的一整條水面；縮到這一類的顯示高度。
- 前景：960×600。金框記下內框的位置。
- 每張組畫素材另存一張光暈圖 <名稱>.glow.webp（四分之一大小，只留發光的像素），清單記 g:1。
- 名作：寬 1280；有重做（-2）就用重做的版本，檔名不變。
做法見 docs/art-prompts/night-painting.md 第八節。

用法：python3 tools/art-night-web.py <原圖資料夾>... <輸出資料夾>
需要 numpy 和 Pillow（有 WebP）。
"""
import json
import os
import sys

import numpy as np
from PIL import Image

W, H, HORIZON = 960, 600, 340


def bbox(im):
    a = np.array(im)[..., 3] > 24
    ys, xs = np.where(a)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def ground_line(im, frac=0.85):
    a = np.array(im)[..., 3] > 24
    fill = a.mean(axis=1)
    y = a.shape[0] - 1
    while y > 0 and fill[y] >= frac:
        y -= 1
    return y + 1 if (a.shape[0] - 1 - y) >= 0.015 * a.shape[0] else a.shape[0]


def crisp(im):
    a = np.array(im)
    a[..., 3] = np.where(a[..., 3] > 110, 255, 0)
    return Image.fromarray(a)


def scale(im, s):
    return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)


def glow(im):
    """發光的像素（和 proto/night5/painter.js 的 glowOf 相同）：縮到四分之一，不發光的變透明。
    主遊戲用 file:// 開啟時不可以讀畫布像素，所以在這裏先算好。沒有發光像素就回傳 None。"""
    q = im.convert('RGBA').resize((max(1, im.width // 4), max(1, im.height // 4)), Image.BILINEAR)
    a = np.array(q).astype(float)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a[..., :3].max(-1), a[..., :3].min(-1)
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    hot = (((mx > 205) & ((mx - mn) / (mx + 1) > 0.3) & (lum > 128)) | (lum > 225)) & (a[..., 3] >= 128)
    if not hot.any():
        return None
    a[..., 3] = np.where(hot, a[..., 3], 0)
    a[~hot, :3] = 0
    return Image.fromarray(a.astype('uint8'), 'RGBA')


def main():
    srcs, out = sys.argv[1:-1], sys.argv[-1]
    os.makedirs(out, exist_ok=True)
    files = {}
    for d in srcs:
        for n in os.listdir(d):
            if n.startswith('np-') and n.endswith('.png'):
                files[n[:-4]] = os.path.join(d, n)
    for n in [k for k in files if k.endswith('-2') and k[:-2] in files]:  # 重做的版本取代舊的
        files[n[:-2]] = files.pop(n)
    meta = {'W': W, 'H': H, 'horizon': HORIZON, 'a': {}, 'sky': {}}
    total = 0
    for name in sorted(files):
        cat = name.split('-')[1]
        im = Image.open(files[name])
        info = {}
        if cat == 'sky':
            s = im.convert('RGB').resize((W, round(im.height * W / im.width)), Image.LANCZOS)
            top = max(0, round(0.60 * s.height) - HORIZON)
            im = s.crop((0, top, W, top + H))
            amb = np.array(im).astype(float)[:HORIZON].reshape(-1, 3).mean(0)
            meta['sky'][name] = [int(v) for v in amb]
            q, kw = 82, {}
        elif cat == 'work':
            im = scale(im.convert('RGB'), 1280 / im.width)
            q = 80
        elif cat == 'front':
            im = crisp(im.convert('RGBA').resize((W, H), Image.LANCZOS))
            if name == 'np-front-frame-gold':
                a = np.array(im)[..., 3] > 24
                cy, cx = H // 2, W // 2
                meta['gold'] = [cx - int(np.argmax(a[cy, cx::-1])), cy - int(np.argmax(a[cy::-1, cx])),
                                cx + int(np.argmax(a[cy, cx:])), cy + int(np.argmax(a[cy:, cx]))]
            q = 86
        else:
            im = im.convert('RGBA')
            x0, y0, x1, y1 = bbox(im)
            if cat == 'mid':
                gl = ground_line(im)
                if (im.height - y1) > 0.04 * im.height and gl == im.height:
                    info['fl'] = 1  # 浮在半空（無人機）：沒有倒影
                im = im.crop((x0, y0, x1, min(y1, gl)))
                s = min(172 / np.sqrt(im.width * im.height), 230 / im.height, 276 / im.width)
            else:
                im = im.crop((x0, y0, x1, y1))
                s = {'far': 72, 'stage': 110}.get(cat, 262) / im.height
            im = crisp(scale(im, s))
            q = 86
        path = os.path.join(out, name + '.webp')
        im.save(path, 'WEBP', quality=q, method=6)
        total += os.path.getsize(path)
        if cat != 'work':
            info.update(w=im.width, h=im.height)
            gl_im = glow(im)
            if gl_im is not None:
                gpath = os.path.join(out, name + '.glow.webp')
                gl_im.save(gpath, 'WEBP', quality=80, method=6)
                total += os.path.getsize(gpath)
                info['g'] = 1  # 有光暈圖 <名稱>.glow.webp
            meta['a'][name] = info
    meta['works'] = sorted(n[8:] for n in files if n.startswith('np-work-'))
    with open(os.path.join(out, 'night-art.json'), 'w') as f:
        json.dump(meta, f, separators=(',', ':'))
    print('%d 張，%.1f MB → %s' % (len(files), total / 1e6, out))


if __name__ == '__main__':
    main()
