// 《靈感撤離 2080》創作之夜原型第四版（2026-11-04）：規則。純邏輯，瀏覽器和 Node 共用。
// 第三版：起承轉合（形式）之外加上標籤系統（內容）——兩種情緒合成有名字的複合情緒；一筆的標籤決定作品的題材。
// 第四版：每晚一個難題（像 Balatro 的 Boss）；每晚三次提示；結構可以進修升級；素材可以改造（加上第二種情緒）；目標大幅提高。
// 第二版的核心是「起承轉合」：素材按次序排成一行，相鄰兩張的情緒決定它們怎樣連接。
//   承：有相同的情緒（倍率 +2），或者情緒在色輪上相鄰（倍率 +1）
//   轉：情緒在色輪上相對（每一筆第一個轉：倍率 ×2）
//   斷：沒有關係（斷開的部分不計分）
//   合：最後一張和第一張是「承」的關係（倍率 ×2）
// 作品同時是畫、歌和詩：情緒決定顏色和音色，媒材決定筆觸和樂器，起承轉合決定構圖和和弦進行。
(function (root) {
  'use strict';
  const IE = root.IE = root.IE || {};
  const D = IE.DATA;

  // ---------- 隨機數（可以重現） ----------
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const shuffle = (r, arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const x = arr[i]; arr[i] = arr[j]; arr[j] = x; } return arr; };
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const r1 = (x) => Math.round(x * 10) / 10;
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

  // ---------- 色輪 ----------
  const WHEEL = D.WHEEL;
  const wpos = (t) => WHEEL.indexOf(t);
  const wdist = (a, b) => { const d = Math.abs(wpos(a) - wpos(b)); return Math.min(d, 10 - d); };
  const has = (c, t) => c.tags.includes(t);
  const STAR_CHIPS = [0, 10, 18, 28, 42, 60];
  const BASE_CHIPS = 10;
  const NUMS = { same: 2, near: 1, zhuan: 2, he: 2, title: 1.5 };

  // 兩張素材的關係：相同 > 相對 > 相鄰 > 斷
  function rel(a, b) {
    if (a.tags.some((t) => b.tags.includes(t))) return 'same';
    let near = false;
    for (const x of a.tags) for (const y of b.tags) {
      const d = wdist(x, y);
      if (d === 5) return 'zhuan';
      if (d === 1) near = true;
    }
    return near ? 'near' : 'duan';
  }
  const isCheng = (k) => k === 'same' || k === 'near' || k === 'fix';
  const LINK_NAME = { same: '承', near: '承', fix: '承', zhuan: '轉', duan: '斷' };

  // ---------- 標籤系統：兩種情緒放在一起，就是一種有名字的複合情緒 ----------
  // 相隔越遠，效果越戲劇性：相鄰＝交融、相近＝層次、相隔＝回響、相遠＝張力、相對＝矛盾
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
  const compoundOf = (c) => (c.tags.length >= 2 ? pairOf(c.tags[0], c.tags[1]) : null);
  // 題材：計分的素材裏最多的情緒（主調）和第二多的（配調）；一樣多取先出現的
  function subjectOf(run) {
    const count = {}, first = {};
    run.forEach((c, i) => c.tags.forEach((t) => { count[t] = (count[t] || 0) + 1; if (first[t] == null) first[t] = i; }));
    const order = Object.keys(count).sort((a, b) => count[b] - count[a] || first[a] - first[b] || wpos(a) - wpos(b));
    const main = order[0], second = order.find((t) => t !== main && count[t] >= 1) || null;
    const p = second && count[second] ? pairOf(main, second) : pairOf(main, main);
    const strength = count[main] || 0;
    return { main, second, pair: p, name: p.name, strength, bonus: SUBJECT_BONUS(strength) };
  }
  const SUBJECT_BONUS = (n) => (n >= 5 ? 10 : n === 4 ? 6 : n === 3 ? 3 : 0);

  // 結構
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
  const STRUCT_RANK = ['single', 'pair', 'contrast', 'flow', 'twist', 'echo', 'loop', 'mono', 'full'];

  // 分析一行素材：連接、計分的一段（最長而沒有「斷」的一段；一樣長取後面的）、結構
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
    const media = new Set(run.map((c) => c.medium)).size;
    return { raw, links, s, e, run, rl, len, zc, he, mono, id, media, pure: len >= 3 && media === 1 };
  }
  const MEDIA_BONUS = (A) => (A.len < 3 ? 0 : A.pure ? 6 : A.media >= 5 ? 8 : A.media === 4 ? 4 : A.media === 3 ? 2 : 0);
  const MEDIA_NAME = (A) => (A.pure ? '純粹' : A.media >= 5 ? '五感全開' : '合奏 ' + A.media + ' 種媒材');

  // 和弦的角色：起、承、轉、合（音樂和畫用）
  function roles(A) {
    const out = A.run.map((c, i) => (i === 0 ? 'qi' : A.rl[i - 1] === 'zhuan' ? 'zhuan' : 'cheng'));
    if (A.he && out.length >= 3) out[out.length - 1] = out[out.length - 1] === 'zhuan' ? 'zhuanhe' : 'he';
    return out;
  }

  // ---------- 具名組合（沿用 D.RECIPES：要「純」，每張計分的素材都要有組合要求的其中一個標籤） ----------
  const RECIPES = D.RECIPES.filter((r) => !r.legend && !r.cond && Object.keys(r.need).length && Object.keys(r.need).every((t) => wpos(t) >= 0));
  const power = (r) => r.chips / 10 + r.mult * 10;
  function matchRecipes(sel, limit) {
    const counts = {};
    sel.forEach((c) => c.tags.forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
    const hit = RECIPES.filter((r) => Object.keys(r.need).every((t) => (counts[t] || 0) >= r.need[t]) && sel.every((c) => c.tags.some((t) => r.need[t])));
    return hit.sort((a, b) => power(b) - power(a)).slice(0, limit || 2);
  }

  // ---------- 創作夥伴：浮城的八位朋友（data.js 的 NPCS）。計分效果之外，也在作品裏演奏和署名 ----------
  const COLABS = {
    dj: { name: '天台 DJ 小妹', short: 'DJ 小妹', img: 'friend-dj', part: '鼓和低音', desc: '每個「承」再 +2 倍率', layer: 'beat',
      link: (k) => (isCheng(k) ? { mult: 2 } : null) },
    ho: { name: '寫詩的何伯', short: '何伯', img: 'friend-ho', part: '朗誦', desc: '「合」由 ×2 變成 ×3', layer: 'recite',
      he: () => ({ xmult: 1.5 }) },
    ken: { name: '畫壁畫的阿 Ken', short: '阿 Ken', img: 'friend-ken', part: '噴漆', desc: '「轉」由 ×2 變成 ×3', layer: 'spray',
      link: (k, x) => (k === 'zhuan' && x.firstZhuan ? { xmult: 1.5 } : null) },
    miu: { name: '改裝機械人的 Miu', short: 'Miu', img: 'friend-miu', part: '電子琶音', desc: '「數」素材計分兩次', layer: 'arp',
      retrig: (c) => (c.medium === 'data' ? 1 : 0) },
    fong: { name: '唱粵劇的芳姐', short: '芳姐', img: 'friend-fong', part: '粵劇唱腔', desc: '完成「起承轉合」：再 ×2', layer: 'opera',
      title: (id) => (id === 'full' ? { xmult: 2 } : null) },
    chan: { name: '修船的老陳', short: '老陳', img: 'friend-chan', part: '木魚敲擊', desc: '每一筆第一個「斷」修補成「承」', layer: 'wood', repair: 1 },
    yu: { name: '寫歌的小雨', short: '小雨', img: 'friend-yu', part: '旋律', desc: '每張「聲」素材 +4 倍率', layer: 'melody',
      card: (c) => (c.medium === 'sound' ? { mult: 4 } : null) },
    mary: { name: '開糖水舖的 Mary 姐', short: 'Mary 姐', img: 'friend-mary', part: '和音', desc: '每張「人情」素材 +2 倍率；「獨白」再 ×2', layer: 'choir',
      card: (c) => (has(c, 'warmth') ? { mult: 2 } : null), title: (id) => (id === 'mono' ? { xmult: 2 } : null) },
  };
  const COLAB_IDS = Object.keys(COLABS);

  // 主角：三種出身，各自的素材和第一位夥伴
  const HEROES = {
    copywriter: { colab: 'ho', blurb: '用文字工作了二十年。素材多「紙」，第一位夥伴是寫詩的何伯。' },
    busker: { colab: 'yu', blurb: '在天橋下唱歌。素材多「聲」和「身」，第一位夥伴是寫歌的小雨。' },
    animator: { colab: 'ken', blurb: '被 AI 取代的動畫師。素材多「影」，第一位夥伴是畫壁畫的阿 Ken。' },
  };

  // ---------- 外星評審（docs/WORLD.md 第六節：每個種族有自己的腔調） ----------
  const JUDGES = {
    conserve: {
      name: '保育者', title: '人類保護區的觀察員', img: 'species-conserve',
      obstacles: ['mute_first', 'hand7', 'no_zhuan'],
      rules: [
        { id: 'chipsx2', tag: 'warmth', text: '保護瀕危的人情：「人情」素材的籌碼 ×2', good: true },
        { id: 'calm', text: '喜歡平靜：每個「承」再 +1 倍率', good: true },
      ],
      lines: {
        start: '一個瀕危的地球人，正準備在夜裡創作。我們保持距離，不要驚動牠。',
        small: '牠還在摸索。這很正常。',
        good: '看，牠找到了自己的節奏。',
        great: '罕見的畫面……這一刻值得保育。',
        recipe: '牠把幾種情緒放在一起了。我們從未見過這種行為。',
        full: '起、承、轉、合。牠在說一個完整的故事。',
        clear: '記錄完畢。這個個體狀態良好，可以繼續野放。',
        fail: '今晚沒有作品。保護區的床位已經準備好了。',
        wish: '就是這一幕！保育區的資料庫終於有了。',
      },
    },
    octo: {
      name: '章魚星人', title: '觀光團的私人收藏家', img: 'species-octo',
      obstacles: ['no_same', 'shuffle', 'hidden'],
      rules: [
        { id: 'multplus', tag: 'neon', text: '喜歡霓虹：「霓虹」素材計分時倍率 +2', good: true },
        { id: 'norepeat', text: '只要新奇：今晚同一種結構第二次起，倍率 ×0.5' },
      ],
      lines: {
        start: '各位團友，右手邊就是一位真正的地球創作者！請勿餵食。',
        small: '嗯……地球感不夠。',
        good: '很有地球感！大家拍照！',
        great: '成交！這一筆我出雙倍！',
        recipe: '限量款！這個組合在拍賣會上很少見！',
        full: '有開頭、有轉折、有結局！這就是地球人說的「故事」！',
        clear: '今晚的行程圓滿結束，請團友回到觀光船。',
        fail: '好可惜，今晚沒有紀念品可以帶回家。',
        wish: '就是這款！團友們，這一件我要帶回家！',
      },
    },
    myco: {
      name: '菌絲網絡', title: '蘑菇星的田野研究員', img: 'species-myco',
      obstacles: ['need5', 'no_compound', 'max4'],
      rules: [
        { id: 'min3', text: '樣本太少不算：少於 3 張相連的一筆不計分' },
        { id: 'chipsx2', tag: 'hope', text: '研究希望：「希望」素材的籌碼 ×2', good: true },
      ],
      lines: {
        start: '觀察記錄第 7,203 號：樣本開始創作。',
        small: '樣本的輸出偏低。原因待查。',
        good: '樣本出現明顯的情緒波動。很好。',
        great: '異常：樣本的輸出超出所有模型。記錄、記錄、記錄。',
        recipe: '新的組合。網絡正在同步這一刻。',
        full: '結構完整。網絡的每一條菌絲都在顫動。',
        clear: '研究結論：樣本仍然在創作。原因不明。',
        fail: '樣本今晚沒有輸出。我們會繼續觀察。',
        wish: '假設得到證實。網絡一致通過。',
      },
    },
    grey: {
      name: '灰人', title: '星際人才發展局的 HR', img: 'species-grey',
      obstacles: ['needhe', 'plays3', 'half_chips', 'discard0', 'no_subject'],
      rules: [
        { id: 'chipsx2', tag: 'machine', text: '欣賞效率：「機械」素材的籌碼 ×2', good: true },
        { id: 'block', tag: 'memory', text: '不准懷舊：「記憶」素材不計籌碼' },
        { id: 'block', tag: 'neon', text: '討厭霓虹：「霓虹」素材不計籌碼' },
      ],
      lines: {
        start: '本次評核開始。請在限時內展示你的可轉移技能。',
        small: '表現低於預期。',
        good: '表現符合預期。',
        great: '表現超出預期。建議列入人才庫的優先名單。',
        recipe: '此組合不在 KPI 範圍之內。已記錄為「創新」。',
        full: '起承轉合：結構合規。已加分。',
        clear: '評核通過。你的檔案已經更新。',
        fail: '評核不通過。我們會保留你的資料十二個月。',
        wish: '符合委託要求。已加分。',
      },
    },
  };
  // ---------- 難題：每晚一個（像 Balatro 的 Boss），由評審的性格決定 ----------
  const OBSTACLES = {
    mute_first: { name: '開場冷場', text: '每一筆的第一張（起）不計籌碼' },
    hand7: { name: '預算削減', text: '手牌只有 7 張' },
    no_zhuan: { name: '不准刺激', text: '「轉」不會令倍率加倍' },
    no_same: { name: '拒絕重複', text: '相同情緒的「承」不加倍率' },
    shuffle: { name: '團友搗亂', text: '每一筆之後，手上隨機兩張素材被拿走' },
    hidden: { name: '矇眼', text: '某一種情緒的素材看不見標籤' },
    need5: { name: '樣本要多', text: '少於 5 張的一筆，分數減半' },
    no_compound: { name: '分解', text: '複合情緒不會觸發' },
    max4: { name: '篇幅限制', text: '一筆最多 4 張' },
    needhe: { name: 'KPI', text: '沒有「合」的一筆不計分' },
    plays3: { name: '效率審查', text: '今晚只有 3 筆' },
    half_chips: { name: '通脹', text: '所有素材的籌碼減半' },
    discard0: { name: '一稿過', text: '今晚不能改稿' },
    no_subject: { name: '去個人化', text: '題材的加成不計' },
  };

  // 三晚：場地、目標、評審（第 3 晚是外星評審之夜：規則對你不利）；調性給音樂用
  const NIGHTS = [
    { name: '社區小展', target: 50000, judges: ['conserve'], goodRule: true, key: 60, mode: 'major', bpm: 108, style: 'lofi', bgm: 'pixel-plaza' },
    { name: '天台音樂會', target: 120000, judges: ['octo', 'myco'], key: 65, mode: 'major', bpm: 118, style: 'citypop', bgm: 'pixel-funk' },
    { name: '外星評審', target: 160000, judges: ['grey'], boss: true, key: 62, mode: 'minor', bpm: 126, style: 'synth', bgm: 'subspace-overdrive' },
  ];
  const BASE = { hand: 8, plays: 4, discards: 3, maxCards: 5, maxColabs: 4, hints: 3 };
  // 結構的等級：每升一級，這種結構 +40 籌碼、+4 倍率
  const LEVEL = { chips: 40, mult: 4 };

  // ---------- 一局 ----------
  const mediumOf = (id, c) => (D.mediumOf ? D.mediumOf({ id, tags: c.tags }) : 'paper');
  function makeCard(id, uid) {
    const c = D.CARDS[id];
    const star = c.star || (c.value < 16 ? 1 : c.value < 24 ? 2 : c.value < 32 ? 3 : c.value < 60 ? 4 : 5);
    return { uid, id, name: c.name, tags: c.tags.slice(), star, chips: STAR_CHIPS[star], medium: mediumOf(id, c) };
  }
  const wheelCard = (id) => D.CARDS[id] && D.CARDS[id].tags.every((t) => wpos(t) >= 0);
  function pickWish(r, deck, taken) {
    const have = {};
    deck.forEach((c) => c.tags.forEach((t) => { have[t] = (have[t] || 0) + 1; }));
    const ok = RECIPES.filter((rc) => !taken.includes(rc.id) && Object.keys(rc.need).every((t) => (have[t] || 0) >= rc.need[t] + 1));
    return ok.length ? pick(r, ok).id : null;
  }
  function newRun(seed, opts) {
    const o = opts || {};
    const r = rng(seed || 1);
    const hero = HEROES[o.bg] ? o.bg : 'copywriter';
    const bg = D.BACKGROUNDS[hero];
    const run = { seed: seed || 1, r, bg: hero, uid: 1, deck: [], colabs: [], spark: bg.spark || 2, night: 0, discovered: {}, nights: [], structSeen: {} };
    const ids = bg.cards.concat(D.STARTER).filter(wheelCard);
    // 原型：多加幾張常見的素材，令牌組有變化
    const extra = Object.keys(D.CARDS).filter((id) => wheelCard(id) && !D.CARDS[id].rarity && D.CARDS[id].value <= 18 && !ids.includes(id));
    shuffle(r, extra).slice(0, 7).forEach((id) => ids.push(id));
    ids.forEach((id) => run.deck.push(makeCard(id, run.uid++)));
    run.colabs.push(o.colab || HEROES[hero].colab);
    run.nightDefs = NIGHTS.map((n, i) => {
      const jid = pick(r, n.judges);
      const J = JUDGES[jid];
      const pool = J.rules.filter((x) => (n.boss ? !x.good : x.good));
      const ob = pick(r, J.obstacles);
      const hidden = ob === 'hidden' ? pick(r, ['water', 'neon', 'memory', 'warmth', 'hope']) : null;
      return { idx: i, name: n.name, target: n.target, judge: jid, rule: pick(r, pool.length ? pool : J.rules), obstacle: ob, hiddenTag: hidden, boss: !!n.boss, key: n.key, mode: n.mode, bpm: n.bpm, style: n.style, bgm: n.bgm };
    });
    const taken = [];
    run.nightDefs.forEach((d) => { d.wish = pickWish(r, run.deck, taken); if (d.wish) taken.push(d.wish); });
    return run;
  }
  function startNight(run) {
    const def = run.nightDefs[run.night];
    const ob = def.obstacle;
    const plays = BASE.plays - (def.rule.id === 'plays3' || ob === 'plays3' ? 1 : 0);
    const disc = ob === 'discard0' ? 0 : BASE.discards;
    const n = { def, target: def.target, score: 0, plays, playsMax: plays, discards: disc, discardsMax: disc, handSize: BASE.hand - (ob === 'hand7' ? 1 : 0),
      maxCards: ob === 'max4' ? 4 : BASE.maxCards, hints: BASE.hints,
      hand: [], pile: shuffle(run.r, run.deck.map((c) => c.uid)), used: [], log: [], structUsed: {}, wishDone: false, done: false, failed: false };
    run.cur = n;
    draw(run);
    return n;
  }
  const cardOf = (run, uid) => run.deck.find((c) => c.uid === uid);
  function draw(run) {
    const n = run.cur;
    while (n.hand.length < n.handSize && n.pile.length) n.hand.push(n.pile.shift());
    if (n.hand.length < n.handSize && n.used.length) {
      n.pile = shuffle(run.r, n.used.splice(0));
      while (n.hand.length < n.handSize && n.pile.length) n.hand.push(n.pile.shift());
    }
  }
  const repairOf = (run) => run.colabs.reduce((a, id) => a + ((COLABS[id] && COLABS[id].repair) || 0), 0);

  // 選牌時的預覽：結構、連接、計分的一段；籌碼 × 倍率只算結構和素材本身（不算夥伴、組合和評審，分數下筆之後才揭曉）
  function preview(run, uids) {
    const sel = uids.map((u) => cardOf(run, u)).filter(Boolean);
    if (!sel.length) return null;
    const A = analyze(sel, { repair: repairOf(run) });
    const n = run.cur, ob = n ? n.def.obstacle : null;
    const lv = (run.levels && run.levels[A.id]) || 1;
    let chips = BASE_CHIPS + A.run.reduce((a, c, i) => a + (ob === 'mute_first' && i === 0 ? 0 : ob === 'half_chips' ? Math.round(c.chips / 2) : c.chips), 0) + LEVEL.chips * (lv - 1), mult = 1 + LEVEL.mult * (lv - 1), first = true;
    A.rl.forEach((k) => { if (k === 'same' || k === 'fix') mult += ob === 'no_same' && k === 'same' ? 0 : NUMS.same; else if (k === 'near') mult += NUMS.near; else if (k === 'zhuan' && first) { if (ob !== 'no_zhuan') mult *= NUMS.zhuan; first = false; } });
    A.run.forEach((c) => { const cp = ob === 'no_compound' ? null : compoundOf(c); if (!cp || !cp.fam) return; const f = cp.fam.id; if (f === 'blend') mult += 2; else if (f === 'layer') chips += 20; else if (f === 'tension') mult *= 1.25; else if (f === 'paradox') mult *= 1.5; });
    const sub = subjectOf(A.run);
    mult += MEDIA_BONUS(A) + (ob === 'no_subject' ? 0 : sub.bonus);
    if (A.he) mult *= NUMS.he;
    if (A.id === 'full' || A.id === 'mono') mult *= NUMS.title;
    if (ob === 'need5' && sel.length < 5) mult *= 0.5;
    return { id: A.id, name: STRUCT[A.id].name, tag: STRUCT[A.id].tag, lv, chips, mult: r1(mult), links: A.links, s: A.s, e: A.e, he: A.he, media: A.media, pure: A.pure,
      run: A.run.map((c) => c.uid), noise: sel.filter((c) => !A.run.includes(c)).map((c) => c.uid), roles: roles(A), subject: sub };
  }

  // 計分：回傳逐步演出用的 steps（不改變狀態）
  function score(run, uids) {
    const n = run.cur;
    const rule = n.def.rule;
    const sel = uids.map((u) => cardOf(run, u)).filter(Boolean);
    const A = analyze(sel, { repair: repairOf(run) });
    const ST = STRUCT[A.id];
    const cols = run.colabs.map((id, slot) => ({ id, slot, fx: COLABS[id] })).filter((o) => o.fx);
    let chips = BASE_CHIPS, mult = 1;
    const steps = [];
    const snap = (o) => Object.assign(o, { C: Math.round(chips), M: r1(mult) });
    const apply = (e) => { if (e.chips) chips += e.chips; if (e.mult) mult += e.mult; if (e.xmult) mult *= e.xmult; };
    const rl = roles(A);
    steps.push(snap({ t: 'struct', id: A.id, name: ST.name }));
    const len = A.len;
    const ob = n.def.obstacle;
    const blockedAll = (rule.id === 'min3' && len < 3) || ((rule.id === 'needhe' || ob === 'needhe') && !A.he);
    // 結構的等級（進修）
    const lv = (run.levels && run.levels[A.id]) || 1;
    if (lv > 1) { chips += LEVEL.chips * (lv - 1); mult += LEVEL.mult * (lv - 1); steps.push(snap({ t: 'level', id: A.id, lv, chips: LEVEL.chips * (lv - 1), mult: LEVEL.mult * (lv - 1) })); }
    const x = { A, firstZhuan: true };
    let echoNext = 0;
    A.run.forEach((c, i) => {
      const echoed = echoNext; echoNext = 0;
      if (blockedAll || (rule.id === 'block' && has(c, rule.tag))) steps.push(snap({ t: 'blocked', uid: c.uid, idx: i, role: rl[i] }));
      else {
        let reps = 1 + echoed;
        cols.forEach((o) => { if (o.fx.retrig) reps += o.fx.retrig(c, x, i); });
        for (let k = 0; k < reps; k++) {
          let v = c.chips;
          const jx = rule.id === 'chipsx2' && has(c, rule.tag);
          if (jx) v *= 2;
          if (ob === 'half_chips') v = Math.round(v / 2);
          if (ob === 'mute_first' && i === 0) v = 0;
          chips += v;
          // 再計一次的來源：先算回響（上一張的複合情緒），再算夥伴（Miu）
          const isEcho = k > 0 && k <= echoed;
          const byCol = k > echoed ? ((cols.find((o) => o.fx.retrig && o.fx.retrig(c, x, i)) || {}).id || null) : null;
          steps.push(snap({ t: 'card', uid: c.uid, idx: i, role: rl[i], chips: v, again: k > 0, judge: jx, by: byCol, echo: isEcho }));
          // 複合情緒：兩種情緒的素材每次計分都觸發
          const cp = ob === 'no_compound' ? null : compoundOf(c);
          if (cp && cp.fam) {
            const f = cp.fam.id, e = f === 'blend' ? { mult: 2 } : f === 'layer' ? { chips: 20 } : f === 'tension' ? { xmult: 1.25 } : f === 'paradox' ? { xmult: 1.5 } : {};
            apply(e);
            if (f === 'echo' && k === 0 && i < len - 1) echoNext = 1;
            steps.push(snap(Object.assign({ t: 'compound', uid: c.uid, idx: i, key: cp.key, name: cp.name, fam: f, famName: cp.fam.name }, e)));
          }
          if (rule.id === 'multplus' && has(c, rule.tag)) { mult += 2; steps.push(snap({ t: 'rule', uid: c.uid, mult: 2 })); }
          cols.forEach((o) => {
            if (!o.fx.card) return;
            const e = o.fx.card(c, x);
            if (e) { apply(e); steps.push(snap(Object.assign({ t: 'colab', id: o.id, slot: o.slot, uid: c.uid }, e))); }
          });
        }
      }
      if (i < len - 1 && !blockedAll) {
        const k = A.rl[i];
        if (isCheng(k)) {
          const v = k === 'near' ? NUMS.near : ob === 'no_same' ? 0 : NUMS.same;
          mult += v;
          steps.push(snap({ t: 'link', kind: k, idx: i, mult: v, nulled: v === 0 }));
          if (rule.id === 'calm') { mult += 1; steps.push(snap({ t: 'rule', mult: 1 })); }
        } else if (k === 'zhuan') {
          if (x.firstZhuan && ob !== 'no_zhuan') { mult *= NUMS.zhuan; steps.push(snap({ t: 'link', kind: k, idx: i, xmult: NUMS.zhuan })); }
          else if (x.firstZhuan) steps.push(snap({ t: 'link', kind: k, idx: i, nulled: true }));
          else steps.push(snap({ t: 'link', kind: k, idx: i, extra: true }));
        }
        cols.forEach((o) => {
          if (!o.fx.link) return;
          const e = o.fx.link(k, x);
          if (e) { apply(e); steps.push(snap(Object.assign({ t: 'colab', id: o.id, slot: o.slot, idx: i }, e))); }
        });
        if (k === 'zhuan') x.firstZhuan = false;
      }
    });
    const sub = subjectOf(A.run);
    if (!blockedAll) {
      const mb = MEDIA_BONUS(A);
      if (mb) { mult += mb; steps.push(snap({ t: 'media', name: MEDIA_NAME(A), mult: mb })); }
      if (sub.bonus && ob !== 'no_subject') { mult += sub.bonus; steps.push(snap({ t: 'subject', name: sub.name, main: sub.main, strength: sub.strength, mult: sub.bonus })); }
    }
    // 具名組合（委託的組合排在第一）
    const wishId = n.def.wish && !n.wishDone ? n.def.wish : null;
    const recs = blockedAll || len < 2 ? [] : matchRecipes(A.run, 99)
      .sort((a, b) => (b.id === wishId) - (a.id === wishId) || power(b) - power(a)).slice(0, 2);
    recs.forEach((rc, i) => {
      const m = i === 0 ? rc.mult : rc.mult / 2;
      chips += rc.chips; mult += m;
      steps.push(snap({ t: 'recipe', id: rc.id, name: rc.name, chips: rc.chips, mult: m, isNew: !run.discovered[rc.id] }));
    });
    if (!blockedAll && A.he) {
      mult *= NUMS.he;
      steps.push(snap({ t: 'he', xmult: NUMS.he }));
      cols.forEach((o) => { if (!o.fx.he) return; const e = o.fx.he(x); if (e) { apply(e); steps.push(snap(Object.assign({ t: 'colab', id: o.id, slot: o.slot }, e))); } });
    }
    if (!blockedAll && (A.id === 'full' || A.id === 'mono')) {
      mult *= NUMS.title;
      steps.push(snap({ t: 'title', id: A.id, name: ST.name, xmult: NUMS.title }));
      cols.forEach((o) => { if (!o.fx.title) return; const e = o.fx.title(A.id, x); if (e) { apply(e); steps.push(snap(Object.assign({ t: 'colab', id: o.id, slot: o.slot }, e))); } });
    }
    const wish = !!(wishId && recs.some((rc) => rc.id === wishId));
    if (wish) { mult *= 2; steps.push(snap({ t: 'wish', id: wishId, xmult: 2 })); }
    if (!blockedAll && rule.id === 'norepeat' && n.structUsed[A.id]) { mult *= 0.5; steps.push(snap({ t: 'rule', xmult: 0.5 })); }
    if (!blockedAll && ob === 'need5' && sel.length < 5) { mult *= 0.5; steps.push(snap({ t: 'obstacle', id: ob, xmult: 0.5 })); }
    mult = Math.max(0, mult);
    const total = blockedAll ? 0 : Math.round(chips * mult * run.spark);
    steps.push({ t: 'spark', x: run.spark, C: Math.round(chips), M: r1(mult), total });
    return { id: A.id, name: ST.name, links: A.links, s: A.s, e: A.e, he: A.he, run: A.run.map((c) => c.uid), noise: sel.filter((c) => !A.run.includes(c)).map((c) => c.uid),
      roles: rl, media: A.media, chips: Math.round(chips), mult: r1(mult), total, steps, recipes: recs.map((rc) => rc.id), blockedAll, wish, subject: sub,
      usedColabs: [...new Set(steps.filter((s2) => s2.t === 'colab' || s2.by).map((s2) => s2.id || s2.by))] };
  }

  // 下筆：套用分數、記錄作品的一段、補牌
  function play(run, uids) {
    const n = run.cur;
    if (n.done || n.plays <= 0 || !uids.length || uids.length > n.maxCards) return null;
    const res = score(run, uids);
    n.score += res.total;
    n.plays -= 1;
    n.structUsed[res.id] = (n.structUsed[res.id] || 0) + 1;
    res.newRecipes = res.recipes.filter((id) => !run.discovered[id]);
    res.recipes.forEach((id) => { run.discovered[id] = true; });
    run.structSeen[res.id] = true;
    if (res.wish) n.wishDone = true;
    n.log.push({ uids: uids.slice(), run: res.run, roles: res.roles, links: res.links.slice(res.s, res.e), id: res.id, total: res.total, recipes: res.recipes, colabs: res.usedColabs, subject: res.subject });
    run.found = run.found || {};
    res.newCompounds = [];
    res.steps.forEach((st) => { if (st.t === 'compound' && !run.found[st.key]) { run.found[st.key] = true; res.newCompounds.push(st.key); } });
    if (!run.found['s:' + res.subject.pair.key]) { run.found['s:' + res.subject.pair.key] = true; res.newSubject = true; }
    n.hand = n.hand.filter((u) => !uids.includes(u));
    n.used.push(...uids);
    if (n.def.obstacle === 'shuffle' && n.score < n.target && n.plays > 0) {
      const gone = shuffle(run.r, n.hand.slice()).slice(0, 2);
      n.hand = n.hand.filter((u) => !gone.includes(u)); n.used.push(...gone); res.taken = gone;
    }
    if (n.score >= n.target) {
      n.done = true;
      res.clear = true;
      res.overkill = n.score >= n.target * 2;
    } else if (n.plays <= 0) {
      n.done = true;
      n.failed = true;
      res.fail = true;
    } else draw(run);
    return res;
  }
  function discard(run, uids) {
    const n = run.cur;
    if (n.done || n.discards <= 0 || !uids.length || uids.length > n.maxCards) return false;
    n.discards -= 1;
    n.hand = n.hand.filter((u) => !uids.includes(u));
    n.used.push(...uids);
    draw(run);
    return true;
  }
  // 收工：火花的獎勵（每剩一筆 +0.1；分數達到目標兩倍 +0.2；完成委託 +0.2），記錄作品，進入下一晚
  function finishNight(run, work) {
    const n = run.cur;
    const bonus = r1(0.1 * n.plays + (n.score >= n.target * 2 ? 0.2 : 0) + (n.wishDone ? 0.2 : 0));
    run.spark = r1(run.spark + bonus);
    run.nights.push({ name: n.def.name, score: n.score, target: n.target, judge: n.def.judge, work: work || null });
    run.night += 1;
    return { bonus, spark: run.spark };
  }
  // 收工之後的獎勵：三選一的夥伴、三選一的素材
  function offers(run) {
    const out = [];
    const cpool = shuffle(run.r, COLAB_IDS.filter((id) => !run.colabs.includes(id)));
    if (run.colabs.length < BASE.maxColabs && cpool.length) out.push({ type: 'colab', id: cpool[0] });
    // 進修：今晚用過的結構優先
    const used = Object.keys((run.cur && run.cur.structUsed) || {}).filter((id) => id !== 'single');
    const lvPool = shuffle(run.r, [...new Set(used.concat(['full', 'echo', 'mono', 'loop']))]);
    lvPool.slice(0, 2).forEach((sid) => out.push({ type: 'level', id: sid, lv: ((run.levels && run.levels[sid]) || 1) + 1 }));
    // 改造：一張只有一種情緒的素材，加上相隔 2 至 4 格的第二種情緒（得到層次、回響或張力）
    const singles = run.deck.filter((c) => c.tags.length === 1);
    if (singles.length) {
      const c = pick(run.r, singles);
      const d = 2 + Math.floor(run.r() * 3), dir = run.r() < 0.5 ? 1 : -1;
      const t2 = WHEEL[(wpos(c.tags[0]) + dir * d + 10) % 10];
      out.push({ type: 'mod', uid: c.uid, tag: t2, pair: pairOf(c.tags[0], t2) });
    } else if (cpool.length > 1 && run.colabs.length < BASE.maxColabs) out.push({ type: 'colab', id: cpool[1] });
    else out.push({ type: 'level', id: 'full', lv: ((run.levels && run.levels.full) || 1) + 1 });
    return out;
  }
  function takeOffer(run, o) {
    if (o.type === 'colab') takeColab(run, o.id);
    else if (o.type === 'level') { run.levels = run.levels || {}; run.levels[o.id] = ((run.levels[o.id]) || 1) + 1; }
    else if (o.type === 'mod') { const c = cardOf(run, o.uid); if (c && c.tags.length === 1) { c.tags.push(o.tag); c.modded = true; } }
  }
  function rewards(run) {
    const pool = shuffle(run.r, COLAB_IDS.filter((id) => !run.colabs.includes(id)));
    const cpool = Object.keys(D.CARDS).filter((id) => wheelCard(id) && D.CARDS[id].value >= 24 && D.CARDS[id].value < 60 && !D.CARDS[id].rarity);
    return { colabs: pool.slice(0, 3), cards: shuffle(run.r, cpool.slice()).slice(0, 3).map((id) => makeCard(id, 0)) };
  }
  function takeColab(run, id) { if (COLABS[id] && run.colabs.length < BASE.maxColabs && !run.colabs.includes(id)) run.colabs.push(id); }
  function takeCard(run, card) { const c = makeCard(card.id, run.uid++); run.deck.push(c); return c; }

  // ---------- 作品的分享碼：只用英文字母、數字和連字號（Artifact 的連結只保留這種 #名稱） ----------
  const CARD_IDS = Object.keys(D.CARDS).sort();
  const B36 = (n, w) => n.toString(36).padStart(w, '0');
  function encodeWork(w) {
    // w = { v, bg, night, judge, score, colabs: [], plays: [[cardId...]...], seed }
    const t = w.tsrc && w.tsrc.c ? 'c' + [...w.tsrc.c].slice(0, 12).map((ch) => B36(ch.codePointAt(0) % 1679616, 4)).join('')
      : w.tsrc && w.tsrc.r ? 'r' + B36(D.RECIPES.findIndex((x) => x.id === w.tsrc.r), 2) : 'p' + ((w.tsrc && w.tsrc.p) || 0);
    const head = [B36(Object.keys(HEROES).indexOf(w.bg), 1), B36(w.night, 1), B36(Object.keys(JUDGES).indexOf(w.judge), 1),
      w.colabs.map((id) => B36(COLAB_IDS.indexOf(id), 1)).join('') || 'z', B36(w.score, 1), B36(w.seed % 1679616, 4), t].join('-');
    const body = w.plays.map((p) => p.map((id) => B36(CARD_IDS.indexOf(id), 2)).join('')).join('-');
    return 'w2-' + head + '-' + body;
  }
  function decodeWork(code) {
    const m = /^w2-([0-9a-z]+(?:-[0-9a-z]+)+)$/.exec(code || '');
    if (!m) return null;
    const p = m[1].split('-');
    if (p.length < 8) return null;
    const bg = Object.keys(HEROES)[parseInt(p[0], 36)], night = parseInt(p[1], 36), judge = Object.keys(JUDGES)[parseInt(p[2], 36)];
    const colabs = p[3] === 'z' ? [] : p[3].split('').map((ch) => COLAB_IDS[parseInt(ch, 36)]).filter(Boolean);
    const plays = p.slice(7).map((s) => (s.match(/.{2}/g) || []).map((x) => CARD_IDS[parseInt(x, 36)]).filter((id) => id && D.CARDS[id]));
    if (!bg || !judge || isNaN(night) || night > 2 || !plays.length || plays.some((q) => !q.length)) return null;
    const tr = /^r([0-9a-z]{2})$/.exec(p[6]), tp = /^p([0-9])$/.exec(p[6]), tc = /^c((?:[0-9a-z]{4})+)$/.exec(p[6]);
    const tsrc = tc ? { c: tc[1].match(/.{4}/g).map((x) => String.fromCodePoint(parseInt(x, 36))).join('').replace(/[<>《》]/g, '') }
      : tr && D.RECIPES[parseInt(tr[1], 36)] ? { r: D.RECIPES[parseInt(tr[1], 36)].id } : { p: tp ? Number(tp[1]) : 0 };
    return { bg, night, judge, colabs, score: parseInt(p[4], 36), seed: parseInt(p[5], 36), tsrc, plays };
  }

  IE.Proto2 = IE.Proto3 = {
    rng, hash, WHEEL, STAR_CHIPS, BASE_CHIPS, NUMS, STRUCT, STRUCT_RANK, LINK_NAME, COLABS, COLAB_IDS, HEROES, JUDGES, NIGHTS, BASE, RECIPES,
    PAIRS, SAME, FAMILY, pairOf, compoundOf, subjectOf, SUBJECT_BONUS, wdist, OBSTACLES, LEVEL, offers, takeOffer,
    rel, isCheng, analyze, roles, matchRecipes, newRun, startNight, preview, score, play, discard, finishNight, rewards, takeColab, takeCard, cardOf, makeCard,
    encodeWork, decodeWork, MEDIA_BONUS, MEDIA_NAME,
  };
})(typeof window !== 'undefined' ? window : globalThis);
