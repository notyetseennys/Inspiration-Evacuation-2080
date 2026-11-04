#!/usr/bin/env python3
"""創作之夜：由兩份規格生成「素材工作單」網頁（每一張圖、每一首歌的完整 prompt，可以逐張複製和打勾）。

資料來源（唯一的來源，改規格就重新生成）：
- docs/art-prompts/night-painting.md：第三節風格設定、第四節類別說明和結尾、第五節試做批、第六節全部清單。
- docs/music/night-stems.md：第二節速度、第三節歌的清單、第四節 prompt。
已經收到的素材（main 分支的 art-src/night/、music-src/night/）標為「已收到」。

用法：python3 tools/night-worksheet.py <輸出的 html> [--received 檔名,檔名,...]
不給 --received 就用 git 讀 origin/main 上已經有的檔案。
"""
import html
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EMO = {
    'warmth': ('人情', '#ff6b5e'), 'hope': ('希望', '#9be36b'), 'water': ('水', '#37c3d6'), 'memory': ('記憶', '#e8c25a'),
    'rebel': ('反叛', '#a78bfa'), 'machine': ('機械', '#8e9bb0'), 'guilt': ('愧疚', '#a89a82'), 'anger': ('憤怒', '#e04646'),
    'neon': ('霓虹', '#ff4fb4'), 'hunger': ('飢餓', '#f0883e'),
}


def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        return f.read()


def section(text, start, end=None):
    i = text.index(start)
    j = text.index(end, i + len(start)) if end else len(text)
    return text[i:j]


def table(text):
    rows = []
    for line in text.splitlines():
        if line.startswith('|') and not re.match(r'^\|[-\s|]+\|$', line):
            line = line.replace('\\|', '\x00')  # 儲存格裏轉義了的「|」
            cells = [c.strip().replace('\x00', '|') for c in line.strip().strip('|').split('|')]
            rows.append(cells)
    return rows[1:]  # 去掉表頭


def code(cell):
    m = re.search(r'`([^`]+)`', cell)
    return m.group(1) if m else cell


def art_items():
    md = read('docs/art-prompts/night-painting.md')
    style = re.search(r'```\n(.*?)```', section(md, '## 三、'), re.S).group(1).strip()
    sec4 = section(md, '## 四、', '## 五、')
    stage_end = re.search(r'^甲：`([^`]+)`', sec4, re.M).group(1)
    cats = {}
    for r in table(sec4[sec4.index('| 類別 |'):]):
        if len(r) >= 3:
            cats[r[0]] = (code(r[1]), stage_end if r[2] == '甲' else code(r[2]))
        elif len(r) == 2:
            cats[r[0]] = (code(r[1]), stage_end)
    pilot = {}
    for r in table(section(md, '## 五、', '## 六、')):
        if r[0].startswith('`np-'):
            pilot[code(r[0]).replace('.png', '')] = r[2]
    sec6 = section(md, '## 六、', '## 七、')
    items = []

    def add(phase, group, cat, name, subject, title, emos):
        subject = pilot.get(name, subject) if '見試做批' in subject else subject
        desc, end = cats[cat]
        prompt = 'Piece %s: %s.\nSubject: %s\n%s' % (name, desc, subject, end)
        items.append(dict(id='art-' + name, file=name + '.png', phase=phase, group=group, cat=cat, title=title,
                          emos=emos, prompt=prompt))

    # 6.1 天空
    for r in table(section(sec6, '### 6.1', '### 6.2')):
        e = r[0].split()[0]
        for v, subj in ((1, r[1]), (2, r[2])):
            add(1, '天空', '天空', 'np-sky-%s-%d' % (e, v), subj, '天空・%s・%s' % (EMO[e][0], '平靜' if v == 1 else '戲劇性'), [e])
    # 6.2 遠景
    for r in table(section(sec6, '### 6.2', '### 6.3')):
        n = code(r[0])
        add(1, '遠景', '遠景', n, r[1], '遠景・用於%s' % r[2], [])
    # 6.3 碼頭
    for r in table(section(sec6, '### 6.3', '### 6.4')):
        n = code(r[0])
        add(1, '碼頭', '碼頭', n, r[1], '碼頭・%s' % n[-1], [])
    # 6.4 中景、6.5 主角
    for key, cat, grp in (('### 6.4', '中景', 'mid'), ('### 6.5', '主角', 'focal')):
        nxt = '### 6.5' if key == '### 6.4' else '### 6.6'
        for r in table(section(sec6, key, nxt)):
            e = r[0].split()[0]
            for v in (1, 2, 3):
                add(1, cat, cat, 'np-%s-%s-%d' % (grp, e, v), r[v], '%s・%s・%d' % (cat, EMO[e][0], v), [e])
    # 6.6 小景
    for r in table(section(sec6, '### 6.6', '### 6.7')):
        n = code(r[0])
        a, b = n.split('-')[2:4]
        add(2, '複合情緒小景', '小景', n, r[2], '小景・%s' % r[1].replace('（新）', ''), [a, b])
    # 6.7 夥伴
    for r in table(section(sec6, '### 6.7', '### 6.8')):
        n = code(r[0])
        add(2, '夥伴客串', '夥伴', n, r[2], '夥伴・%s' % r[1], [])
    # 6.8 前景
    for r in table(section(sec6, '### 6.8', '### 6.9')):
        n = code(r[0])
        add(2, '前景', '前景', n, r[1], '前景・%s' % n.replace('np-front-', ''), [])
    return style, items


def music_items():
    md = read('docs/music/night-stems.md')
    sec4 = section(md, '## 四、', '## 五、')
    tpl = re.search(r'```\n(.*?)```', sec4, re.S).group(1).strip()
    styles = []
    for r in table(sec4[sec4.index('| 風格 |'):sec4.index('| 歌 |')]):
        styles.append(dict(label=r[0], genre=code(r[1]), bpm=code(r[2]), key=code(r[3]), chords=code(r[4]),
                           mood=code(r[5])))
    inst = {}
    for r in table(sec4[sec4.index('| 歌 |'):]):
        inst[code(r[0])] = code(r[1])
    sec3 = section(md, '## 三、', '## 四、')
    use = {}
    for r in table(sec3[sec3.index('| 歌 | 內容 |'):]):
        use[code(r[0].split()[0])] = (r[1], r[2])
    ids = {'lo-fi': 'lofi', 'city pop': 'citypop', 'synthwave': 'synth'}
    items = []
    for ph, st in enumerate(styles, 1):
        sid = ids[st['label']]
        for song, ins in inst.items():
            vocal = song == 'vocal'
            p = tpl.replace('<風格>', st['genre']).replace('<BPM>', st['bpm']).replace('<調>', st['key']) \
                .replace('<和弦>', st['chords']).replace('<樂器>', ins).replace('<氣氛>', st['mood'])
            if vocal:
                p = p.replace('Instrumental ', '', 1)
                p = p[0].upper() + p[1:]
            name = 'ns-%s-%s' % (sid, song)
            items.append(dict(id='song-' + name, file=name + '.zip', phase=ph, group=st['label'], title=song,
                              desc='%s：%s' % (use[song][1], use[song][0]), prompt=p,
                              settings='BPM %s・純音樂：%s' % (st['bpm'], '關' if vocal else '開')))
    return items


def received_from_git():
    try:
        out = subprocess.run(['git', '-C', ROOT, 'ls-tree', '-r', '--name-only', 'origin/main'], capture_output=True,
                             text=True, check=True).stdout.split()
    except Exception:
        return set()
    got = set()
    for f in out:
        b = os.path.basename(f)
        if f.startswith('art-src/night/') and b.endswith('.png'):
            got.add('art-' + b[:-4])
        if f.startswith('music-src/night/') and b.endswith('.zip'):
            got.add('song-' + re.sub(r'-a$', '', b[:-4]))
    return got


def main():
    out = sys.argv[1]
    style, art = art_items()
    songs = music_items()
    if '--received' in sys.argv:
        got = {x for x in sys.argv[sys.argv.index('--received') + 1].split(',') if x}
    else:
        got = received_from_git()
    for it in art + songs:
        it['got'] = it['id'] in got
    data = dict(style=style, art=art, songs=songs, emo={k: list(v) for k, v in EMO.items()})
    tpl = read('tools/night-worksheet.html')
    page = tpl.replace('/*DATA*/null', json.dumps(data, ensure_ascii=False))
    with open(out, 'w', encoding='utf-8') as f:
        f.write(page)
    na = sum(1 for i in art if not i['got'])
    ns = sum(1 for i in songs if not i['got'])
    print('%s：畫 %d 張（已收到 %d），歌 %d 首（已收到 %d）' % (out, len(art), len(art) - na, len(songs), len(songs) - ns))
    for ph in (1, 2):
        print('  畫第 %d 期：%d 張' % (ph, sum(1 for i in art if i['phase'] == ph)))


if __name__ == '__main__':
    main()
