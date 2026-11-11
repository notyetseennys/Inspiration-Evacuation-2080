// 創作桌的規則核心（第十六期乙段）：起承轉合、複合情緒、題材、媒材。純函數，不讀也不改局面。
// 由原型第五版（proto/night5/engine.js）搬入；數值在 D.DESK，校準時只改那裏。
//   承：有相同的情緒（倍率 +2），或者情緒在色輪上相鄰（倍率 +1）
//   轉：情緒在色輪上相對（每一筆第一個轉：倍率 ×2）
//   斷：沒有關係（只計最長而沒有斷的一段；一樣長取後面的）
//   合：最後一張和第一張是「承」的關係（倍率 ×2）
(function (root) {
  'use strict';
  const IE = root.IE = root.IE || {};
  const D = IE.DATA;
  const WHEEL = D.WHEEL;
  const wpos = (t) => WHEEL.indexOf(t);
  const wdist = (a, b) => { const d = Math.abs(wpos(a) - wpos(b)); return Math.min(d, 10 - d); };
  const has = (c, t) => c.tags.includes(t);
  const tagsOf = (c) => c.tags.filter((t) => wpos(t) >= 0);
  const med = (c) => (D.mediumOf ? D.mediumOf(c) : c.medium || 'paper');

  D.DESK = {
    base: 10,                       // 每一筆的基本籌碼
    same: 2, near: 1,               // 承：倍率 +
    zhuan: 2, he: 2, title: 1.5,    // 轉、合、「起承轉合」和「獨白」：倍率 ×
    level: { chips: 40, mult: 4 },  // 結構每升一級
    subject: [0, 0, 0, 3, 6, 10],   // 主調的情緒出現 n 次：倍率 +
    media: { pure: 6, 3: 2, 4: 4, 5: 8 },
    family: { blend: { mult: 2 }, layer: { chips: 20 }, echo: { echo: 1 }, tension: { xmult: 1.25 }, paradox: { xmult: 1.5 } },
    artTag: { ancient: 'memory', cosmic: 'neon' },  // 外來素材借用哪一種情緒的圖
    // 舊的配色 id → 新的結構 id（物件、流派、評審、技法課的資料照這張表換）
    formMap: { mix: 'single', adj: 'flow', triad: 'twist', split: 'echo', comp: 'contrast', tetrad: 'loop', full: 'full', mono: 'mono', paradox: 'contrast' },
  };
  const N = D.DESK;

  const STRUCT = {
    single: { name: '單張', tag: '只有一張素材在計分' },
    pair: { name: '承接', tag: '兩張相連' },
    contrast: { name: '對照', tag: '兩張相對' },
    flow: { name: '一氣呵成', tag: '一路相連，沒有回到開頭' },
    twist: { name: '峰迴路轉', tag: '有轉折，沒有回到開頭' },
    echo: { name: '首尾呼應', tag: '最後一張回到開頭' },
    loop: { name: '迴旋', tag: '有轉有合，但不是先承後轉再合' },
    full: { name: '起承轉合', tag: '先承、後轉、轉了之後再合' },
    mono: { name: '獨白', tag: '全部帶着同一種情緒' },
  };
  const RANK = ['single', 'pair', 'contrast', 'flow', 'twist', 'echo', 'loop', 'mono', 'full'];
  const LINK_NAME = { same: '承', near: '承', fix: '承', zhuan: '轉', duan: '斷' };
  const isCheng = (k) => k === 'same' || k === 'near' || k === 'fix';

  // 兩張素材的關係：相同 > 相對 > 相鄰 > 斷。
  // 沒有色輪情緒的素材（旅行帶回來的「遠古」「宇宙」）是外來素材：和任何素材都接得上（當作相鄰的承）。
  function rel(a, b) {
    const ta = tagsOf(a), tb = tagsOf(b);
    if (!ta.length || !tb.length) return 'near';
    if (ta.some((t) => tb.includes(t))) return 'same';
    let near = false;
    for (const x of ta) for (const y of tb) {
      const d = wdist(x, y);
      if (d === 5) return 'zhuan';
      if (d === 1) near = true;
    }
    return near ? 'near' : 'duan';
  }

  // 複合情緒：兩種情緒放在一起就有名字。相隔越遠越戲劇性：相鄰＝交融、相近＝層次、相隔＝回響、相遠＝張力、相對＝矛盾
  const PAIRS = {
    'warmth+hope': ['守望', '在浮城互相看顧的人'], 'hope+water': ['雨後', '雨停了，天邊有光'], 'water+memory': ['舊城', '水底下的舊城區'],
    'memory+rebel': ['翻案', '不肯讓歷史被改寫'], 'rebel+machine': ['罷工', '機械人也放下工具'], 'machine+guilt': ['被取代', '被 AI 取代之後的空位'],
    'guilt+anger': ['罪與罰', '對自己的怒氣'], 'anger+neon': ['怒火', '霓虹下燒起來的怒氣'], 'neon+hunger': ['夜市', '霓虹燈下的熟食檔'], 'warmth+hunger': ['糖水舖', '三代人的一碗糖水'],
    'warmth+water': ['同舟', '同一條船上的人'], 'hope+memory': ['初心', '寫了一半的夢'], 'water+rebel': ['逆流', '逆着潮水划船'],
    'memory+machine': ['存檔', '存在硬碟裏的過去'], 'rebel+guilt': ['逃兵', '離開之後的內疚'], 'machine+anger': ['暴走', '失控的機器'],
    'guilt+neon': ['宿醉', '霓虹燈熄滅之後的早上'], 'anger+hunger': ['交租日', '月尾的怒氣和空肚'], 'warmth+neon': ['夜歸人', '霓虹下回家的人'], 'hope+hunger': ['飢餓藝術家', '捱餓也要創作'],
    'warmth+memory': ['思念', '舊相片裏的人'], 'hope+rebel': ['起義', '相信會變好，所以反抗'], 'water+machine': ['生鏽', '泡在水裏的機器'],
    'memory+guilt': ['懺悔', '忘不了的錯'], 'rebel+anger': ['抗爭', '走上街頭'], 'machine+neon': ['霓虹電路', '城市的神經線'],
    'guilt+hunger': ['施捨', '分出去的一碗飯'], 'warmth+anger': ['打抱不平', '為別人發火'], 'hope+neon': ['外星來信', '天上傳來的訊號'], 'water+hunger': ['漁火', '夜裏打魚的燈'],
    'warmth+rebel': ['同路人', '一起反抗的朋友'], 'hope+machine': ['機械人的夢', '機器也會做夢'], 'water+guilt': ['淚海', '淹過頭頂的內疚'],
    'memory+anger': ['舊恨', '記得太清楚的委屈'], 'rebel+neon': ['塗鴉', '噴在霓虹牆上的字'], 'machine+hunger': ['生產線', '只為了吃飯而轉動'],
    'warmth+guilt': ['告解', '對着家人說出口'], 'hope+anger': ['黑色幽默', '笑着憤怒'], 'water+neon': ['雨夜霓虹', '倒映在積水裏的招牌'], 'memory+hunger': ['古早味', '記憶裏的味道'],
    'warmth+machine': ['人機之間', '溫度和機器'], 'hope+guilt': ['贖罪', '想彌補的心'], 'water+anger': ['水火', '海嘯和火光'],
    'memory+neon': ['今昔', '舊樓和新招牌'], 'rebel+hunger': ['革命', '為了麵包而反抗'],
  };
  const SAME = { warmth: '人情味', hope: '曙光', water: '大雨', memory: '回憶錄', rebel: '反骨', machine: '齒輪', guilt: '心結', anger: '怒吼', neon: '不夜天', hunger: '空碗' };
  const FAMILY = {
    1: { id: 'blend', name: '交融', desc: '倍率 +2' },
    2: { id: 'layer', name: '層次', desc: '籌碼 +20' },
    3: { id: 'echo', name: '回響', desc: '下一張素材計分兩次' },
    4: { id: 'tension', name: '張力', desc: '倍率 ×1.25' },
    5: { id: 'paradox', name: '矛盾', desc: '倍率 ×1.5' },
  };
  const pairKey = (a, b) => (wpos(a) <= wpos(b) ? a + '+' + b : b + '+' + a);
  function pairOf(a, b) {
    if (a === b) return { key: a, name: SAME[a], line: '', dist: 0, fam: null };
    const k = pairKey(a, b), e = PAIRS[k] || [D.TAGS[a].name + '與' + D.TAGS[b].name, ''];
    const d = wdist(a, b);
    return { key: k, name: e[0], line: e[1], dist: d, fam: FAMILY[d] };
  }
  const compoundOf = (c) => { const t = tagsOf(c); return t.length >= 2 ? pairOf(t[0], t[1]) : null; };

  // 題材：計分的素材裏最多的情緒（主調）和第二多的（配調）；一樣多取先出現的
  function subjectOf(run) {
    const count = {}, first = {};
    run.forEach((c, i) => tagsOf(c).forEach((t) => { count[t] = (count[t] || 0) + 1; if (first[t] == null) first[t] = i; }));
    const order = Object.keys(count).sort((a, b) => count[b] - count[a] || first[a] - first[b] || wpos(a) - wpos(b));
    const main = order[0] || null, second = order.find((t) => t !== main) || null;
    if (!main) return { main: null, second: null, pair: null, name: '', strength: 0, bonus: 0 };
    const p = second ? pairOf(main, second) : pairOf(main, main);
    const strength = count[main];
    return { main, second, pair: p, name: p.name, strength, bonus: N.subject[Math.min(5, strength)] || 0 };
  }

  // 分析一行素材。opts.repair：可以把幾個「斷」當成「承」（夥伴的效果）
  function analyze(cards, opts) {
    const o = opts || {};
    const n = cards.length;
    const raw = [];
    for (let i = 0; i + 1 < n; i++) raw.push(rel(cards[i], cards[i + 1]));
    let repairs = o.repair || 0;
    const links = raw.map((k) => (k === 'duan' && repairs > 0 ? (repairs -= 1, 'fix') : k));
    let s = 0, e = 0, start = 0;
    for (let i = 0; i <= links.length; i++) {
      if (i === links.length || links[i] === 'duan') {
        if (i - start >= e - s) { s = start; e = i; }
        start = i + 1;
      }
    }
    const run = cards.slice(s, e + 1), rl = links.slice(s, e);
    const len = run.length;
    const zc = rl.filter((k) => k === 'zhuan').length;
    const he = len >= 3 && isCheng(rel(run[len - 1], run[0]));
    const mono = len >= 3 && WHEEL.some((t) => run.every((c) => has(c, t)));
    let id;
    if (len <= 1) id = 'single';
    else if (len === 2) id = rl[0] === 'zhuan' ? 'contrast' : 'pair';
    else if (mono) id = 'mono';
    else if (he && zc && isCheng(rl[0]) && len >= 4 && rl.indexOf('zhuan') < rl.length - 1) id = 'full';
    else if (he && zc) id = 'loop';
    else if (he) id = 'echo';
    else if (zc) id = 'twist';
    else id = 'flow';
    const media = new Set(run.map(med)).size;
    return { raw, links, s, e, run, rl, len, zc, he, mono, id, media, pure: len >= 3 && media === 1 };
  }
  const mediaBonus = (A) => (A.len < 3 ? 0 : A.pure ? N.media.pure : N.media[Math.min(5, A.media)] || 0);
  const mediaName = (A) => (A.pure ? '純粹' : A.media >= 5 ? '五感全開' : '合奏 ' + A.media + ' 種媒材');

  // 每張計分素材的角色：起、承、轉、合（畫和歌用）
  function roles(A) {
    const out = A.run.map((c, i) => (i === 0 ? 'qi' : A.rl[i - 1] === 'zhuan' ? 'zhuan' : 'cheng'));
    if (A.he && out.length >= 3) out[out.length - 1] = out[out.length - 1] === 'zhuan' ? 'zhuanhe' : 'he';
    return out;
  }

  // 一筆的結構部分怎樣計：回傳逐步的 steps（{t, chips?, mult?, xmult?, …}），由呼叫的一方套用和加上素材的籌碼。
  // 次序：每張素材（複合情緒）→ 和下一張的連接 → 媒材 → 題材 → 合 → 結構的稱號。
  function structSteps(A) {
    const out = [], rl = roles(A);
    let firstZhuan = true;
    A.run.forEach((c, i) => {
      out.push({ t: 'card', uid: c.uid, idx: i, role: rl[i] });
      const cp = compoundOf(c);
      if (cp && cp.fam) out.push(Object.assign({ t: 'compound', uid: c.uid, idx: i, key: cp.key, name: cp.name, fam: cp.fam.id, famName: cp.fam.name }, N.family[cp.fam.id]));
      if (i < A.len - 1) {
        const k = A.rl[i];
        if (isCheng(k)) out.push({ t: 'link', kind: k, idx: i, mult: k === 'near' ? N.near : N.same });
        else if (k === 'zhuan') { out.push(firstZhuan ? { t: 'link', kind: k, idx: i, xmult: N.zhuan } : { t: 'link', kind: k, idx: i, extra: true }); firstZhuan = false; }
      }
    });
    const mb = mediaBonus(A);
    if (mb) out.push({ t: 'media', name: mediaName(A), mult: mb });
    const sub = subjectOf(A.run);
    if (sub.bonus) out.push({ t: 'subject', name: sub.name, main: sub.main, strength: sub.strength, mult: sub.bonus });
    if (A.he) out.push({ t: 'he', xmult: N.he });
    if (A.id === 'full' || A.id === 'mono') out.push({ t: 'title', id: A.id, name: STRUCT[A.id].name, xmult: N.title });
    return out;
  }

  // 卡面和畫裏的素材：一種情緒是主角（三張之一），兩種情緒是小景。同一張卡永遠是同一張圖。
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  function artOf(c) {
    const h = hash(String(c.id || c.name || ''));
    const t = tagsOf(c).length ? tagsOf(c) : c.tags.map((x) => N.artTag[x]).filter(Boolean).slice(0, 1);
    if (!t.length) return null;
    const mid = 'np-mid-' + t[0] + '-' + (h % 3 + 1);
    const solo = 'np-focal-' + t[0] + '-' + (h % 3 + 1);
    if (t.length >= 2) {
      const a = 'np-duo-' + t[0] + '-' + t[1], b = 'np-duo-' + t[1] + '-' + t[0];
      const A = (D.ART && D.ART.a) || {};
      return { face: A[a] ? a : A[b] ? b : solo, mid, flip: !!(h & 8) };
    }
    return { face: solo, mid, flip: !!(h & 8) };
  }

  IE.Desk = { STRUCT, RANK, LINK_NAME, PAIRS, SAME, FAMILY, rel, isCheng, pairOf, compoundOf, subjectOf, analyze, roles, mediaBonus, mediaName, structSteps, artOf, wdist };
})(typeof window !== 'undefined' ? window : globalThis);
