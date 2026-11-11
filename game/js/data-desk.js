// 《靈感撤離 2080》第十六期乙段：創作桌的 75 張平衡素材（dk_*）與五輪模式專用的結構對照表。
// 純資料檔，不涉及 DOM，瀏覽器與 Node（tools/test.js、tools/sim-rounds.js）共用。
// 在 desk.js 之後載入；dk_* 以不可列舉屬性掛在 D.CARDS，確保舊模式 Object.keys(D.CARDS) 與模擬結果完全不變。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA;
  const Desk = IE.Desk;
  const W = D.WHEEL;

  const SINGLES = {
    warmth: [['一碗糖水兩個人', 'paper'], ['摺紙船', 'body'], ['同一件雨衣', 'image']],
    hope: [['天台的紙鳶', 'body'], ['放天燈', 'image'], ['指給你看的星', 'paper']],
    water: [['紅傘', 'image'], ['碼頭的釣竿', 'sound'], ['踩水窪', 'body']],
    memory: [['舊相架', 'image'], ['留聲機', 'sound'], ['一盒舊信', 'paper']],
    rebel: [['沒有字的壁畫', 'image'], ['空白的旗', 'paper'], ['天橋底的樂隊', 'sound']],
    machine: [['為誰撐傘的機械人', 'data'], ['無人機速遞', 'data'], ['自己修自己', 'body']],
    guilt: [['碼頭盡頭', 'body'], ['神龕前的花', 'paper'], ['街燈下', 'image']],
    anger: [['踢爛的販賣機', 'body'], ['火桶', 'sound'], ['摔在地上的安全帽', 'sound']],
    neon: [['心形招牌', 'image'], ['卡拉 OK 亭', 'sound'], ['直播的環形燈', 'data']],
    hunger: [['街邊小炒', 'body'], ['分給貓的包', 'paper'], ['站着吃的杯麵', 'data']],
  };

  const PAIR = {
    'warmth+hope': '守望', 'hope+water': '雨後', 'water+memory': '舊城', 'memory+rebel': '翻案', 'rebel+machine': '罷工', 'machine+guilt': '被取代',
    'guilt+anger': '罪與罰', 'anger+neon': '怒火', 'neon+hunger': '夜市', 'warmth+hunger': '糖水舖', 'warmth+water': '同舟', 'hope+memory': '初心',
    'water+rebel': '逆流', 'memory+machine': '存檔', 'rebel+guilt': '逃兵', 'machine+anger': '暴走', 'guilt+neon': '宿醉', 'anger+hunger': '交租日',
    'warmth+neon': '夜歸人', 'hope+hunger': '飢餓藝術家', 'warmth+memory': '思念', 'hope+rebel': '起義', 'water+machine': '生鏽', 'memory+guilt': '懺悔',
    'rebel+anger': '抗爭', 'machine+neon': '霓虹電路', 'guilt+hunger': '施捨', 'warmth+anger': '打抱不平', 'hope+neon': '外星來信', 'water+hunger': '漁火',
    'warmth+rebel': '同路人', 'hope+machine': '機械人的夢', 'water+guilt': '淚海', 'memory+anger': '舊恨', 'rebel+neon': '塗鴉', 'machine+hunger': '生產線',
    'warmth+guilt': '告解', 'hope+anger': '黑色幽默', 'water+neon': '雨夜霓虹', 'memory+hunger': '古早味', 'warmth+machine': '人機之間', 'hope+guilt': '贖罪',
    'water+anger': '水火', 'memory+neon': '今昔', 'rebel+hunger': '革命',
  };

  const MEDIA = ['sound', 'body', 'data', 'image', 'paper'];
  const DESK_CARDS = {};
  const DESK_IDS = [];

  function registerCard(id, def) {
    DESK_CARDS[id] = def;
    DESK_IDS.push(id);
    Object.defineProperty(D.CARDS, id, {
      value: def,
      enumerable: false,
      configurable: true,
      writable: true,
    });
  }

  W.forEach((e) => SINGLES[e].forEach((s, k) => {
    const id = 'dk_' + e + (k + 1);
    registerCard(id, {
      id,
      name: s[0],
      tags: [e],
      value: k === 2 ? 26 : 14,
      medium: s[1],
      med: s[1],
      face: 'np-focal-' + e + '-' + (k + 1),
      mid: 'np-mid-' + e + '-' + (k + 1),
    });
  }));

  let duoIdx = 0;
  for (let i = 0; i < 10; i++) {
    for (let j = i + 1; j < 10; j++) {
      const a = W[i], b = W[j], id = 'dk_' + a + '_' + b;
      const m = MEDIA[duoIdx % 5];
      registerCard(id, {
        id,
        name: PAIR[a + '+' + b] || PAIR[b + '+' + a],
        tags: [a, b],
        value: 26,
        medium: m,
        med: m,
        face: 'np-duo-' + a + '-' + b,
        mid: 'np-mid-' + a + '-' + (1 + (duoIdx % 3)),
        pair: a + '+' + b,
      });
      duoIdx++;
    }
  }

  // 九種結構（取代五輪模式中的九種色輪配色）
  const STRUCT_TEACH = {
    single: '標註工作、市集技法課',
    pair: '市集技法課',
    contrast: '舊城潛水、夜市擺地攤、與 Miu 或老陳聊天',
    flow: '內容農場、與小雨聊天',
    twist: '外送潛水、與阿 Ken 聊天',
    echo: '做義工、與 Mary 姐聊天',
    loop: '拆樓打撈、與 DJ 小妹聊天',
    mono: '街頭表演、天台菜園、與何伯聊天',
    full: '與芳姐聊天',
  };

  const N = D.DESK;
  const DESK_FORM = {};
  const DESK_FORMS = Desk.RANK.map((id) => {
    const st = Desk.STRUCT[id];
    const f = {
      id,
      name: st.name,
      tag: st.tag,
      desc: st.tag,
      chips: N.base,
      mult: 1,
      up: [N.level.chips, N.level.mult],
      teach: STRUCT_TEACH[id] || '市集技法課',
    };
    DESK_FORM[id] = f;
    return f;
  });

  // 全部用到配色 id 的來源對照表（只在五輪模式生效）
  const BASE_TEACH = Object.assign({
    label: 'mix', farm: 'adj', busk: 'mono', dive: 'comp', volunteer: 'split', delivery: 'triad',
    garden: 'mono', salvage: 'tetrad', haggle: 'comp',
    ho: 'mono', yu: 'adj', miu: 'comp', mary: 'split', ken: 'triad', dj: 'tetrad', fong: 'full', chan: 'paradox',
    trip_modern: 'full', trip_ancient: 'triad', trip_prehistoric: 'mono', trip_alien: 'tetrad', trip_legend: 'paradox',
  }, D.TEACH || {});
  const remappedTeach = {};
  Object.keys(BASE_TEACH).forEach((k) => {
    const oldId = BASE_TEACH[k];
    remappedTeach[k] = N.formMap[oldId] || oldId;
  });

  const DESK_REMAP = {
    formMap: Object.assign({}, N.formMap),
    teach: remappedTeach,
    objects: {
      oldpoems: {
        desc: '作品是「一氣呵成」或「獨白」時，籌碼 +60。',
        play: (x) => (x.form === 'flow' || x.form === 'mono' ? { chips: 60 } : null),
      },
      guitar: {
        desc: '作品是「獨白」時，倍率 ×1.6。',
        play: (x) => (x.form === 'mono' ? { xmult: 1.6 } : null),
      },
      oldmap: {
        desc: '作品是「對照」時，倍率 ×2。',
        play: (x) => (x.form === 'contrast' ? { xmult: 2 } : null),
      },
      catchphrase: {
        desc: '結構和今晚上一筆相同時，倍率 +10。',
      },
      sequel: {
        desc: '結構和上一件作品最好的一筆相同時，倍率 ×2。',
      },
      curator: {
        desc: '作品是「迴旋」或「起承轉合」時，倍率 ×2.5。',
        play: (x) => (x.form === 'loop' || x.form === 'full' ? { xmult: 2.5 } : null),
      },
      gesamt: {
        desc: '作品是「峰迴路轉」時，倍率 ×3。',
        play: (x) => (x.form === 'twist' ? { xmult: 3 } : null),
      },
    },
    bossDesc: {
      copied: '你最常用的結構 ×0.5',
    },
    toolDesc: {
      portfolio: '選中素材組成的結構升一級（永久）',
    },
  };

  Object.assign(D, { DESK_CARDS, DESK_IDS, DESK_FORMS, DESK_FORM, DESK_REMAP });
  if (IE.Create && IE.Create.syncDeskForms) IE.Create.syncDeskForms();
});
