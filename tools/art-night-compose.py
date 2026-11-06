#!/usr/bin/env python3
"""創作之夜：按一晚的出牌記錄，用製作人的素材組成「玩家的畫」，並統計素材的用量。

一晚四筆，對應畫的四層（docs/art-prompts/night-painting.md 第一節）：
- 第一筆：天空（主調的情緒；有「轉」就用戲劇性的版本）和兩排遠景（主調、配調的區）。
- 第二筆：中景，取起、轉、合三張，每張一座建築或一條船，站在水上，有倒影。
- 第三筆：前排的「小場景」，取起、轉、合三張，每張一格，像碼頭上一排舖位。
  - 複合素材用小景，單一情緒用主角；
  - 「轉」那一格放大、放在中間；
  - 這一晚有夥伴真的出過手，就多一格夥伴。
- 第四筆：前景框（主調的情緒，只用上方和兩側的款式）。一晚至少三筆完整的起承轉合，整幅畫裱上金框。
同一張卡（按卡的 id）永遠對應同一張圖和同一個方向（素材沒有文字，所以可以左右鏡像，多一倍變化），
卡面和畫裏的那一格可以是同一張圖。

用法：
  python3 tools/art-night-compose.py <素材資料夾> <出牌記錄.json> <輸出資料夾> [--render 12]
出牌記錄由模擬或原型輸出：[{seed, night, colabs, strokes: [{id, roles, cards: [{id, tags, medium}], subject}]}]
需要 numpy 和 Pillow。
"""
import collections
import hashlib
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

W, H = 960, 600
HORIZON = 340
WHEEL = ['warmth', 'hope', 'water', 'memory', 'rebel', 'machine', 'guilt', 'anger', 'neon', 'hunger']
FAR = {'warmth': 'old', 'hunger': 'old', 'neon': 'neon', 'anger': 'neon', 'machine': 'industry', 'rebel': 'industry',
       'hope': 'sky', 'memory': 'drowned', 'water': 'drowned', 'guilt': 'ruin'}
# 前景只用上方和兩側的款式；欄杆、船頭、觀眾在下方，會遮住前排，留給展覽的畫面
FRONT = {'warmth': 'lanterns', 'hope': 'leaves', 'water': 'rainglass', 'memory': 'window', 'rebel': 'cables',
         'machine': 'cables', 'guilt': 'window', 'anger': 'curtain', 'neon': 'neonframe', 'hunger': 'laundry'}
GOLD_FULL = 3  # 一晚至少三筆完整的起承轉合，才配金框（模擬約 18% 的晚上）


def stable(s, n):
    return int(hashlib.md5(s.encode()).hexdigest(), 16) % n


class Assets:
    def __init__(self, folder):
        self.folder = folder
        self.cache = {}
        self.names = {f[:-4] for f in os.listdir(folder) if f.endswith('.png')}

    def has(self, name):
        return name in self.names

    def raw(self, name):
        if name not in self.cache:
            self.cache[name] = Image.open(os.path.join(self.folder, name + '.png')).convert('RGBA')
        return self.cache[name]


def bbox(im, th=24):
    a = np.array(im)[..., 3] > th
    ys, xs = np.where(a)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def ground_line(im, frac=0.85):
    """自帶的一整條地面或水面（貼着左右兩邊的底部幾行）：回傳它的頂；沒有就回傳圖高。"""
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


def emissive(im, strict=False):
    a = np.array(im).astype(float) / 255
    rgb, al = a[..., :3], a[..., 3]
    mx, mn = rgb.max(-1), rgb.min(-1)
    sat = (mx - mn) / (mx + 1e-6)
    lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    hot = ((mx > (0.82 if strict else 0.78)) & (sat > 0.30) & (lum > 0.50)) | (lum > 0.88)
    m = hot & (al > 0.5)
    out = np.zeros_like(a)
    out[..., :3] = rgb * m[..., None]
    out[..., 3] = m
    return Image.fromarray((out * 255).astype(np.uint8))


def tint(im, color, amount, k=1.0):
    a = np.array(im).astype(float)
    a[..., :3] = (a[..., :3] * (1 - amount) + np.array(color) * amount) * k
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))


def fit(im, h=None, w=None, area=None, maxh=None, maxw=None):
    if area:
        s = area / np.sqrt(im.width * im.height)
    elif h:
        s = h / im.height
    else:
        s = w / im.width
    if maxh:
        s = min(s, maxh / im.height)
    if maxw:
        s = min(s, maxw / im.width)
    return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)


class Painting:
    def __init__(self):
        self.sky = None
        self.items = []  # (層, 圖, x, y, 倒影的水線或 None, 發光強度)
        self.front = []

    def render(self, lights=1.0):
        base = self.sky.copy()
        hc = tuple(np.array(self.sky)[HORIZON - 4, :, :3].mean(0).astype(int))
        band = self.sky.crop((0, HORIZON - 140, W, HORIZON)).transpose(Image.FLIP_TOP_BOTTOM)
        ba = np.array(band).astype(float)
        ba[..., 3] = 255 * 0.38 * np.linspace(1, 0, ba.shape[0])[:, None]
        ba[..., :3] *= 0.8
        base.alpha_composite(Image.fromarray(ba.astype(np.uint8)), (0, HORIZON))
        water = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        glow_src = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        streak = np.zeros((H, W, 3))
        for layer, im, x, y, wl, g in sorted(self.items, key=lambda t: t[0]):
            base.alpha_composite(im, (x, y))
            if wl is not None:
                r = tint(im.transpose(Image.FLIP_TOP_BOTTOM), hc, 0.25, 0.5)
                ra = np.array(r).astype(float)
                ra[..., 3] *= np.linspace(0.7, 0, r.height)[:, None]
                water.alpha_composite(Image.fromarray(ra.astype(np.uint8)), (x, wl))
            if g > 0:
                e = emissive(im, strict=g < 1)
                if g != 1:
                    e = tint(e, (0, 0, 0), 0, g)
                glow_src.alpha_composite(e, (x, y))
                if wl is not None:
                    es = np.array(emissive(im, True).transpose(Image.FLIP_TOP_BOTTOM)).astype(float)[..., :3]
                    hgt = min(H - wl, es.shape[0] * 2)
                    if hgt > 0:
                        es = np.array(Image.fromarray(es.astype(np.uint8)).resize((es.shape[1], hgt), Image.BILINEAR)
                                      .filter(ImageFilter.BoxBlur(2))).astype(float)
                        x0, x1 = max(0, x), min(W, x + es.shape[1])
                        if x1 > x0:
                            streak[wl:wl + hgt, x0:x1] += es[:, x0 - x:x1 - x] * np.linspace(0.8, 0, hgt)[:, None, None] * g
        wa = np.array(water)
        wa[:HORIZON] = 0
        out = Image.alpha_composite(self.sky.copy(), Image.new('RGBA', (W, H)))
        # 重新按次序疊：天 → 水面倒影 → 物件 → 前景
        canvas = self.sky.copy()
        canvas.alpha_composite(Image.fromarray(ba.astype(np.uint8)), (0, HORIZON))
        canvas.alpha_composite(Image.fromarray(wa))
        for layer, im, x, y, wl, g in sorted(self.items, key=lambda t: t[0]):
            canvas.alpha_composite(im, (x, y))
        for im in self.front:
            canvas.alpha_composite(im, (0, 0))
        e_rgb = np.array(glow_src).astype(float)[..., :3]
        near = np.array(Image.fromarray(e_rgb.astype(np.uint8)).filter(ImageFilter.GaussianBlur(4))).astype(float)
        far = np.array(Image.fromarray(e_rgb.astype(np.uint8)).filter(ImageFilter.GaussianBlur(16))).astype(float)
        glow = (near * 0.9 + far * 1.3 + streak * 0.7) * lights
        b = np.array(canvas).astype(float)[..., :3]
        out = 255 - (255 - b) * (255 - np.clip(glow, 0, 255)) / 255
        yy, xx = np.mgrid[0:H, 0:W]
        v = np.clip(1 - 0.32 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) ** 1.5, 0.55, 1)
        return Image.fromarray((out * v[..., None]).clip(0, 255).astype(np.uint8))


def pick3(n, roles):
    """一筆裏挑最多三張代表：起（第一張）、轉（沒有就取中間）、合（最後一張）。"""
    if n <= 3:
        return list(range(n))
    z = next((i for i, r in enumerate(roles) if r in ('zhuan', 'zhuanhe')), n // 2)
    return sorted({0, min(max(z, 1), n - 2), n - 1})


def frame_gold(A, img):
    """把畫縮進金框的內框，再疊上金框。"""
    fr = crisp(A.raw('np-front-frame-gold').resize((W, H), Image.LANCZOS))
    a = np.array(fr)[..., 3] > 24
    cy, cx = H // 2, W // 2
    row, col = a[cy], a[:, cx]
    left = cx - int(np.argmax(row[cx::-1]))
    right = cx + int(np.argmax(row[cx:]))
    top = cy - int(np.argmax(col[cy::-1]))
    bottom = cy + int(np.argmax(col[cy:]))
    pad = 6
    inner = img.resize((right - left + 2 * pad, bottom - top + 2 * pad), Image.LANCZOS)
    out = Image.new('RGBA', (W, H), (18, 14, 10, 255))
    out.paste(inner, (left - pad, top - pad))
    out.alpha_composite(fr)
    return out.convert('RGB')


def has_zhuan(stroke):
    return any(r in ('zhuan', 'zhuanhe') for r in stroke.get('roles', []))


def main_tag(stroke):
    s = stroke.get('subject') or {}
    return s.get('main') or stroke['cards'][0]['tags'][0]


def compose(A, night, used):
    """回傳 Painting 和這幅畫用了的素材清單。"""
    P = Painting()
    picks = []
    st = night['strokes']
    s1 = st[0]
    emo = main_tag(s1)
    sky = 'np-sky-%s-%d' % (emo, 2 if has_zhuan(s1) else 1)
    raw = A.raw(sky)
    s = raw.resize((W, round(raw.height * W / raw.width)), Image.LANCZOS)
    top = max(0, round(0.60 * s.height) - HORIZON)
    P.sky = s.crop((0, top, W, top + H))
    picks.append(sky)
    # 遠景兩排：配調（遠、淡）和主調（近）
    sec = (s1.get('subject') or {}).get('second') or emo
    hc = tuple(np.array(P.sky)[HORIZON - 4, :, :3].mean(0).astype(int))
    for k, (e, hgt, hz, lay) in enumerate(((sec, 46, 0.55, 0), (emo, 72, 0.30, 1))):
        name = 'np-far-' + FAR[e]
        im = A.raw(name).crop(bbox(A.raw(name)))
        im = crisp(tint(fit(im, h=hgt), hc, hz, 0.85 if k == 0 else 1.0))
        x = -stable(name + str(k), im.width)
        while x < W:
            P.items.append((lay, im, x, HORIZON + 3 - im.height, HORIZON + 3 if k == 1 else None, 0.6))
            x += im.width - 2
        picks.append(name)
    # 第二筆：中景
    if len(st) > 1:
        cards = st[1]['cards']
        roles2 = st[1].get('roles', [])
        pick_i = pick3(len(cards), roles2)
        n = len(pick_i)
        xs = np.linspace(170, W - 170, n) if n > 1 else [W / 2]
        seen = set()
        for j, i in enumerate(pick_i):
            c = cards[i]
            t = c['tags'][0]
            v = stable(c['id'], 3)
            for k in range(3):
                name = 'np-mid-%s-%d' % (t, (v + k) % 3 + 1)
                if name not in seen:
                    break
            seen.add(name)
            im = A.raw(name)
            if stable(c['id'] + 'flip', 2):
                im = im.transpose(Image.FLIP_LEFT_RIGHT)
            gl = ground_line(im)
            x0, y0, x1, y1 = bbox(im)
            floating = (im.height - y1) > 0.04 * im.height and gl == im.height
            im = im.crop((x0, y0, x1, min(y1, gl)))
            role = roles2[i] if i < len(roles2) else ''
            big = 1.15 if role in ('zhuan', 'zhuanhe') else 1.0
            im = crisp(fit(im, area=150 * big, maxh=200 * big, maxw=240 * big))
            depth = j % 2
            base = 392 + 14 * depth
            if floating:
                base -= 30
            P.items.append((2 + depth, im, int(xs[j] - im.width / 2), base - im.height, None if floating else base, 1.0))
            picks.append(name)
    # 第三筆：前排的小場景
    if len(st) > 2:
        s3 = st[2]
        cells = []
        seen = set()
        for i in pick3(len(s3['cards']), s3.get('roles', [])):
            c = s3['cards'][i]
            tg = c['tags']
            name = None
            if len(tg) >= 2:
                a, b = sorted(tg[:2], key=WHEEL.index)
                if a != b and A.has('np-duo-%s-%s' % (a, b)):
                    name = 'np-duo-%s-%s' % (a, b)
            if name is None or name in seen:
                v = stable(c['id'], 3)
                for k in range(3):
                    name = 'np-focal-%s-%d' % (tg[0], (v + k) % 3 + 1)
                    if name not in seen:
                        break
            seen.add(name)
            role = s3['roles'][i] if i < len(s3.get('roles', [])) else ''
            cells.append((name, role in ('zhuan', 'zhuanhe'), stable(c['id'] + 'flip', 2) == 1))
        # 夥伴：這一晚真的出過手的夥伴（第三筆優先），不是牌組裏有就出場
        acted = list(s3.get('colabs') or []) + [x for t in st for x in (t.get('colabs') or [])]
        acted = [x for x in acted if A.has('np-mate-' + x)]
        if acted:
            mate = 'np-mate-%s-2' % acted[0] if A.has('np-mate-%s-2' % acted[0]) else 'np-mate-' + acted[0]  # 重做的新版優先
            cells.insert(len(cells) - 1 if len(cells) > 1 else 1, (mate, False, False))
        ims = []
        for name, z, flip in cells:
            im = A.raw(name)
            if flip:
                im = im.transpose(Image.FLIP_LEFT_RIGHT)
            im = im.crop(bbox(im))
            ims.append((fit(im, h=262 if z else 222), z, name))
        total = sum(im.width for im, _, _ in ims) * 0.94
        k = min(1.0, (W - 20) / total)
        ims = [(crisp(fit(im, w=max(1, round(im.width * k)))) if k < 1 else crisp(im), z, n2) for im, z, n2 in ims]
        x = (W - sum(im.width for im, _, _ in ims) * 0.94) / 2
        for idx, (im, z, n2) in enumerate(ims):
            # 小場景本身已經畫了很多燈，光暈要輕，否則整排發白
            P.items.append((6 if z else 5, im, int(x), H + 2 - im.height, None, 0.35))
            x += im.width * 0.94
            picks.append(n2)
        pier = 'np-stage-pier-%d' % (stable(str(night.get('seed')) + 'p', 3) + 1)
        pim = A.raw(pier)
        pim = crisp(fit(pim.crop(bbox(pim)), h=110))
        x = -stable(pier, pim.width)
        while x < W:
            P.items.append((4, pim, x, H - pim.height, None, 0.8))
            x += pim.width - 2
        picks.append(pier)
    # 第四筆：前景框；完整的起承轉合加金框
    if len(st) > 3:
        name = 'np-front-' + FRONT[main_tag(st[3])]
        P.front.append(crisp(A.raw(name).resize((W, H), Image.LANCZOS)))
        picks.append(name)
    P.gold = sum(1 for x in st if x.get('id') == 'full') >= GOLD_FULL
    if P.gold:
        picks.append('np-front-frame-gold')
    for p in picks:
        used[p] += 1
    return P, picks


def main():
    folder, log_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
    n_render = int(sys.argv[sys.argv.index('--render') + 1]) if '--render' in sys.argv else 12
    os.makedirs(out, exist_ok=True)
    A = Assets(folder)
    nights = json.load(open(log_path, encoding='utf-8'))
    used = collections.Counter()
    repeats = 0
    per = []
    for i, night in enumerate(nights):
        P, picks = compose(A, night, used)
        c = collections.Counter(p for p in picks if not p.startswith(('np-far', 'np-stage')))
        repeats += sum(v - 1 for v in c.values() if v > 1)
        per.append(picks)
        if i < n_render:
            img = P.render()
            if getattr(P, 'gold', False):
                img = frame_gold(A, img)
            img.save(os.path.join(out, 'night-%03d.png' % i))
    cats = collections.defaultdict(lambda: [0, 0])
    for name in A.names:
        cat = name.split('-')[1]
        cats[cat][1] += 1
        if used[name]:
            cats[cat][0] += 1
    stats = dict(nights=len(nights), repeats=repeats,
                 coverage={k: '%d/%d' % tuple(v) for k, v in sorted(cats.items())},
                 top=used.most_common(15), never=sorted(n for n in A.names if not used[n]))
    json.dump(dict(stats=stats, used=used, per=per), open(os.path.join(out, 'usage.json'), 'w'), ensure_ascii=False, indent=1)
    print('組了 %d 幅畫（輸出 %d 幅）；同一幅畫裏重複的素材 %d 次' % (len(nights), min(n_render, len(nights)), repeats))
    print('各類用過的素材：' + '  '.join('%s %s' % kv for kv in stats['coverage'].items()))
    print('最常用：' + '  '.join('%s×%d' % kv for kv in stats['top']))
    print('從未用過（%d）：%s' % (len(stats['never']), ' '.join(n.replace('np-', '') for n in stats['never'])))


if __name__ == '__main__':
    main()
