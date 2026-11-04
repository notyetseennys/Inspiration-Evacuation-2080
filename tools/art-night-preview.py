#!/usr/bin/env python3
"""創作之夜：用製作人的素材組成「玩家的畫」的預覽（審核新素材用）。

做法見 docs/art-prompts/night-painting.md 第八節：裁切、按類別縮放、舞台位置、自動找發光的像素、
光暈和水面長影、倒影、「合」之前燈未亮。現在組成試做批的兩幅畫：「雨夜」（另有逐筆的四個階段）和「黃昏的家」。
每幅畫輸出合成圖，以及背景（天和水）、前景（物件和碼頭）、發光三層，給網頁做水波、閃爍和雨。

用法：python3 tools/art-night-preview.py <素材資料夾，例如 art-src/night> <輸出資料夾>
需要 numpy 和 Pillow。
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

W, H = 960, 600
HORIZON = 362
PIER_TOP = 566


def load(folder, name):
    im = Image.open(os.path.join(folder, name + '.png')).convert('RGBA')
    a = np.array(im)
    if name.startswith('np-sky'):
        return im
    alpha = a[..., 3] > 24
    ys, xs = np.where(alpha)
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def scale_h(im, h):
    w = max(1, round(im.width * h / im.height))
    return im.resize((w, h), Image.LANCZOS)


def scale_w(im, w):
    h = max(1, round(im.height * w / im.width))
    return im.resize((w, h), Image.LANCZOS)


def crisp_alpha(im):
    """像素畫的邊緣：透明度只分有和無。"""
    a = np.array(im)
    a[..., 3] = np.where(a[..., 3] > 110, 255, 0)
    return Image.fromarray(a)


def emissive(im, strict=False):
    """找出發光的像素：亮而且有顏色（窗、燈籠、霓虹、火），或者接近白色的燈泡。"""
    a = np.array(im.convert('RGBA')).astype(float) / 255
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


def haze(im, color, amount):
    a = np.array(im).astype(float)
    a[..., :3] = a[..., :3] * (1 - amount) + np.array(color) * amount
    return Image.fromarray(a.astype(np.uint8))


def darken(im, k):
    a = np.array(im).astype(float)
    a[..., :3] *= k
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))


class Painting:
    def __init__(self, sky):
        s = sky.resize((W, round(sky.height * W / sky.width)), Image.LANCZOS)
        top = max(0, round(0.60 * s.height) - HORIZON)
        self.sky = s.crop((0, top, W, top + H)).convert('RGBA')
        self.layers = []  # (圖, x, y, 會倒影, 水線)
        self.glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        self.horizon_color = tuple(np.array(self.sky)[HORIZON - 6, :, :3].mean(0).astype(int))

    def add(self, im, cx, base_y, reflect=False, waterline=None, glow=1.0, hazed=0.0, shade=1.0):
        if hazed:
            im = haze(im, self.horizon_color, hazed)
        if shade != 1.0:
            im = darken(im, shade)
        im = crisp_alpha(im)
        x, y = round(cx - im.width / 2), round(base_y - im.height)
        self.layers.append((im, x, y, reflect, waterline if waterline is not None else base_y, glow))

    def pier(self):
        deck = Image.new('RGBA', (W, H - PIER_TOP), (0, 0, 0, 0))
        a = np.zeros((H - PIER_TOP, W, 4), np.uint8)
        a[..., :3] = (38, 28, 24)
        a[..., 3] = 255
        a[0:2, :, :3] = (92, 70, 52)    # 邊緣受光
        for y in range(6, H - PIER_TOP, 7):
            a[y, :, :3] = (28, 20, 18)  # 木板縫
        rng = np.random.default_rng(7)
        for x in range(0, W, 46):
            off = rng.integers(0, 40)
            a[3:, (x + off) % W, :3] = (30, 22, 19)
        self.deck = Image.fromarray(a)

    def render(self, ripple=0.0, lights_on=1.0, sky_reflect=0.40):
        base = self.sky.copy()
        if sky_reflect:
            band = self.sky.crop((0, HORIZON - 150, W, HORIZON)).transpose(Image.FLIP_TOP_BOTTOM)
            ba = np.array(band).astype(float)
            ba[..., 3] = 255 * sky_reflect * np.linspace(1, 0, ba.shape[0])[:, None]
            ba[..., :3] *= 0.8
            base.alpha_composite(Image.fromarray(ba.astype(np.uint8)), (0, HORIZON))
        water = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        self.orig = [l[0] for l in self.layers]

        def lit(im, g):
            """合之前燈未亮：發光的像素調暗。"""
            if lights_on >= 1 or g <= 0:
                return im
            a = np.array(im).astype(float)
            m = np.array(emissive(im))[..., 3] > 0
            a[m, :3] *= 0.30 + 0.45 * lights_on
            return Image.fromarray(a.clip(0, 255).astype(np.uint8))
        self.layers = [(lit(im, g), x, y, refl, wl, g) for im, x, y, refl, wl, g in self.layers]
        for im, x, y, refl, wl, g in self.layers:
            base.alpha_composite(im, (x, y))
            if refl:
                r = darken(im.transpose(Image.FLIP_TOP_BOTTOM), 0.45)
                ra = np.array(r).astype(float)
                fade = np.linspace(0.75, 0.0, r.height)[:, None]
                ra[..., 3] *= fade
                water.alpha_composite(Image.fromarray(ra.astype(np.uint8)), (x, wl))
        # 倒影只在水面範圍（地平線以下、碼頭以上）
        wa = np.array(water)
        wa[:HORIZON] = 0
        wa[PIER_TOP:] = 0
        bg = self.sky.copy()
        if sky_reflect:
            bg.alpha_composite(Image.fromarray(ba.astype(np.uint8)), (0, HORIZON))
        bg.alpha_composite(Image.fromarray(wa))
        fg = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        for im, x, y, refl, wl, g in self.layers:
            if y + im.height < PIER_TOP:
                fg.alpha_composite(im, (x, y))
        if hasattr(self, 'deck'):
            fg.alpha_composite(self.deck, (0, PIER_TOP))
        for im, x, y, refl, wl, g in self.layers:
            if y + im.height >= PIER_TOP:
                fg.alpha_composite(im, (x, y))
        self.bg, self.fg = bg, fg
        base.alpha_composite(Image.fromarray(wa))
        # 碼頭在倒影之上、人物之下：重新疊一次站在碼頭上的人和物
        if hasattr(self, 'deck'):
            base.alpha_composite(self.deck, (0, PIER_TOP))
            for im, x, y, refl, wl, g in self.layers:
                if y + im.height >= PIER_TOP:
                    base.alpha_composite(im, (x, y))
        # 發光層
        em = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        for (im, x, y, refl, wl, g), orig in zip(self.layers, self.orig):
            if g > 0:
                e = emissive(orig)
                if g != 1.0:
                    e = darken(e, g)
                em.alpha_composite(e, (x, y))
        e_rgb = np.array(em).astype(float)[..., :3]
        near = np.array(Image.fromarray(e_rgb.astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))).astype(float)
        far = np.array(Image.fromarray(e_rgb.astype(np.uint8)).filter(ImageFilter.GaussianBlur(18))).astype(float)
        glow = (near * 1.1 + far * 1.6) * lights_on
        # 燈在水面的長倒影：把發光圖上下翻轉、拉長、模糊
        streak = np.zeros_like(glow)
        for (im, x, y, refl, wl, g), orig in zip(self.layers, self.orig):
            if not refl or g <= 0:
                continue
            e = np.array(emissive(orig, strict=True).transpose(Image.FLIP_TOP_BOTTOM)).astype(float)[..., :3]
            hgt = min(H - wl, e.shape[0] * 2)
            if hgt <= 0:
                continue
            e = np.array(Image.fromarray(e.astype(np.uint8)).resize((e.shape[1], hgt), Image.BILINEAR)).astype(float)
            e = np.array(Image.fromarray(e.astype(np.uint8)).filter(ImageFilter.BoxBlur(2))).astype(float)
            x0, x1 = max(0, x), min(W, x + e.shape[1])
            if x1 > x0:
                streak[wl:wl + hgt, x0:x1] += e[:, x0 - x:x1 - x] * np.linspace(0.9, 0.0, hgt)[:, None, None]
        streak[:HORIZON] = 0
        streak[PIER_TOP:] = 0
        glow += streak * 0.8 * lights_on
        b = np.array(base).astype(float)[..., :3]
        yy, xx = np.mgrid[0:H, 0:W]
        vig = np.clip(1 - 0.35 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) ** 1.5, 0.55, 1)[..., None]
        self.base_only = Image.fromarray((b * vig).clip(0, 255).astype(np.uint8))
        out = 255 - (255 - b) * (255 - np.clip(glow, 0, 255)) / 255  # screen
        # 四邊暗角
        yy, xx = np.mgrid[0:H, 0:W]
        v = 1 - 0.35 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) ** 1.5
        out *= np.clip(v, 0.55, 1)[..., None]
        return Image.fromarray(out.clip(0, 255).astype(np.uint8)), np.clip(glow, 0, 255).astype(np.uint8)


def quantize(img, colors=64):
    return img.convert('RGB').quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')


def main():
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    A = {n: load(src, n) for n in ['np-sky-water-1', 'np-sky-warmth-1', 'np-far-old', 'np-mid-warmth-1', 'np-mid-water-1',
                                     'np-focal-water-1', 'np-focal-hunger-1', 'np-duo-water-neon']}
    far = scale_h(A['np-far-old'], 70)
    far2 = scale_h(A['np-far-old'], 48)
    tower = scale_h(A['np-mid-warmth-1'], 250)
    boat = scale_w(A['np-mid-water-1'], 190)
    walker = scale_h(A['np-focal-water-1'], 236)
    stall = scale_h(A['np-focal-hunger-1'], 230)
    duo = scale_h(A['np-duo-water-neon'], 300)
    meta = {}

    def skyline(p, shade=1.0, hz=0.35):
        for i, x in enumerate(range(-60, W + 200, far2.width - 6)):
            p.add(far2, x + far2.width / 2, HORIZON + 2, reflect=False, glow=0.5, hazed=hz + 0.2, shade=shade)
        for i, x in enumerate(range(-140, W + 200, far.width - 4)):
            p.add(far, x + far.width / 2, HORIZON + 4, reflect=True, waterline=HORIZON + 4, glow=0.8, hazed=hz, shade=shade)

    # 一：雨夜（水・霓虹）——四個階段：天空和遠景 → 中景 → 主角 → 合（燈全亮）
    stages = []
    for step in range(4):
        p = Painting(A['np-sky-water-1'])
        skyline(p)
        if step >= 1:
            p.add(tower, 175, 452, reflect=True, waterline=452)
            p.add(boat, 868, 468, reflect=True, waterline=460)
        if step >= 2:
            p.pier()
            p.add(walker, 300, PIER_TOP + 14)
            p.add(duo, 640, PIER_TOP + 14)
        img, glow = p.render(lights_on=1.0 if step == 3 else 0.0)
        stages.append(img)
        img.save(os.path.join(out, 'rain-%d.png' % (step + 1)))
    Image.fromarray(glow).save(os.path.join(out, 'rain-glow.png'))
    p.base_only.save(os.path.join(out, 'rain-base.png'))
    p.bg.save(os.path.join(out, 'rain-bg.png'))
    p.fg.save(os.path.join(out, 'rain-fg.png'))

    # 二：黃昏的家（人情・飢餓）
    p = Painting(A['np-sky-warmth-1'])
    skyline(p, shade=0.55, hz=0.25)
    p.add(tower, 770, 456, reflect=True, waterline=456)
    p.add(boat, 250, 472, reflect=True, waterline=464)
    p.pier()
    p.add(stall, 470, PIER_TOP + 12)
    img, glow = p.render()
    img.save(os.path.join(out, 'dusk.png'))
    Image.fromarray(glow).save(os.path.join(out, 'dusk-glow.png'))
    p.base_only.save(os.path.join(out, 'dusk-base.png'))
    p.bg.save(os.path.join(out, 'dusk-bg.png'))
    p.fg.save(os.path.join(out, 'dusk-fg.png'))
    json.dump(dict(W=W, H=H, horizon=HORIZON, pier=PIER_TOP), open(os.path.join(out, 'stage.json'), 'w'))


if __name__ == '__main__':
    main()
