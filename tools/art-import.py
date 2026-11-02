#!/usr/bin/env python3
# 把製作人生成的美術（ChatGPT 的大圖）縮成遊戲的原生像素，放進 game/img/。
# 用法：python3 tools/art-import.py <原圖資料夾> [game/img]
# 原圖在 main 分支的根目錄（1536×1024 或 1254×1254）；這個腳本只在 Claude 整理美術時使用，遊戲和打包都不需要它。
# 每張圖：置中裁成指定比例 → 用平均法縮小（保留像素畫的塊面）→ 減到指定顏色數（不抖動）→ 存成 PNG。
import os
import sys
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else '.'
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', 'game', 'img')

# (檔名開頭, 比例 寬:高, 尺寸, 顏色數, 保留透明)
RULES = [
    ('day-', (2, 1), (256, 128), 48, False),      # 生活卡的橫幅
    ('trip-', (2, 1), (256, 128), 48, False),     # 出國卡的橫幅（按地區）
    ('friend-', (1, 1), (128, 128), 48, False),   # 朋友頭像
    ('pack-', (2, 3), (96, 144), 48, True),       # 素材包
    ('scene-', (16, 9), (320, 180), 64, False),   # 市集、篩選日
    ('stage-', (16, 9), (320, 180), 64, False),   # 創作桌的四個場景
    ('end-', (16, 9), (320, 180), 64, False),     # 結局（人類樣本檔案頂部）
    ('emblem', (1, 1), (128, 128), 16, True),     # 星際人才發展局徽章
    ('icon', (1, 1), (64, 64), 32, True),         # 遊戲圖示
    # 第十五期新增（docs/art-prompts/README.md 第九節；收到之後按這裡的規格處理）
    ('species-', (1, 1), (128, 128), 48, False),  # 外星種族的頭像
    ('collect-', (16, 9), (320, 180), 64, False), # 朋友被收藏之後的場景
    ('story-', (2, 1), (256, 128), 48, False),    # 章的視窗、反轉的視窗
    ('astar', (1, 1), (128, 128), 48, False),     # 阿星的頭像
    ('note-', (2, 1), (128, 64), 32, True),       # 浮城元的紙幣
]
SKIP = ('ka-',)  # 主視覺：Steam 頁面和 README 用，不放進遊戲（標題畫面由程式畫，會動）


def rule_for(name):
    for prefix, aspect, size, colors, alpha in RULES:
        if name.startswith(prefix):
            return aspect, size, colors, alpha
    return None


def crop_to(im, aspect):
    w, h = im.size
    aw, ah = aspect
    if w * ah > h * aw:  # 太寬：裁左右
        nw = h * aw // ah
        x = (w - nw) // 2
        return im.crop((x, 0, x + nw, h))
    nh = w * ah // aw  # 太高：裁上下
    y = (h - nh) // 2
    return im.crop((0, y, w, y + nh))


def process(path, out_dir):
    name = os.path.basename(path).lower()
    if name.startswith(SKIP):
        return None
    rule = rule_for(name)
    if not rule:
        return None
    aspect, size, colors, alpha = rule
    im = Image.open(path)
    im = im.convert('RGBA' if alpha else 'RGB')
    im = crop_to(im, aspect).resize(size, Image.Resampling.BOX)
    if alpha:
        a = im.getchannel('A').point(lambda v: 255 if v >= 128 else 0)  # 像素畫只要全透明或不透明
        q = im.convert('RGB').quantize(colors=colors - 1, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        pal = q.getpalette()[: (colors - 1) * 3] + [0, 0, 0]
        q.putpalette(pal)
        px = q.load()
        ap = a.load()
        for y in range(q.height):
            for x in range(q.width):
                if ap[x, y] == 0:
                    px[x, y] = colors - 1
        q.info['transparency'] = colors - 1
        out = q
    else:
        out = im.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    dst = os.path.join(out_dir, name)
    out.save(dst, optimize=True, transparency=out.info.get('transparency')) if alpha else out.save(dst, optimize=True)
    return dst, size, os.path.getsize(dst)


def main():
    os.makedirs(OUT, exist_ok=True)
    done = []
    for f in sorted(os.listdir(SRC)):
        if f.lower().endswith('.png'):
            r = process(os.path.join(SRC, f), OUT)
            if r:
                done.append(r)
    total = sum(r[2] for r in done)
    for dst, size, n in done:
        print('%-28s %4d×%-4d %6.1f KB' % (os.path.basename(dst), size[0], size[1], n / 1024))
    print('%d 張，合共 %.0f KB' % (len(done), total / 1024))


if __name__ == '__main__':
    main()
