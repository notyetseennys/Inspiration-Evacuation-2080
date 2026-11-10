// 創作之夜第五版「創作桌」的牌組：75 張素材，每張有自己的卡面（製作人的畫）。
// - 單一情緒 30 張：十種情緒各三張，卡面是「主角」（np-focal-<情緒>-<1..3>），中景用 np-mid-<情緒>-<1..3>。
// - 複合情緒 45 張：45 種組合各一張，卡面是「小景」（np-duo-<a>-<b>）。
// 主遊戲原有的素材卡不在創作之夜出現：138 張裏只有 1 張帶愧疚，13 種組合沒有卡（docs/art-prompts/night-painting.md 第五節）。
// 要在 data*.js 之後、engine.js 之前載入。
(function (root) {
  'use strict';
  const D = root.IE.DATA;
  const W = D.WHEEL;
  Object.keys(D.CARDS).forEach((id) => { D.CARDS[id].rarity = D.CARDS[id].rarity || 'main'; });
  // 名字、媒材（sound 聲、body 身、data 數、image 影、paper 紙）
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
  const N = { singles: [], duos: [] };
  W.forEach((e) => SINGLES[e].forEach((s, k) => {
    const id = 'n5_' + e + (k + 1);
    // 第一、二張是常見的素材（起手和補牌），第三張是收工的獎勵
    D.CARDS[id] = { name: s[0], tags: [e], value: k === 2 ? 26 : 14, med: s[1], face: 'np-focal-' + e + '-' + (k + 1), mid: 'np-mid-' + e + '-' + (k + 1) };
    N.singles.push(id);
  }));
  let k = 0;
  for (let i = 0; i < 10; i++) for (let j = i + 1; j < 10; j++) {
    const a = W[i], b = W[j], id = 'n5_' + a + '_' + b;
    D.CARDS[id] = { name: PAIR[a + '+' + b] || PAIR[b + '+' + a], tags: [a, b], value: 26, med: MEDIA[k % 5], face: 'np-duo-' + a + '-' + b, mid: 'np-mid-' + a + '-' + (1 + (k % 3)), pair: a + '+' + b };
    N.duos.push(id); k++;
  }
  const baseMedium = D.mediumOf;
  D.mediumOf = (c) => (D.CARDS[c.id] && D.CARDS[c.id].med) || (baseMedium ? baseMedium(c) : 'paper');
  // 起手：十種情緒各一張；三位主角各帶四張複合情緒（配合第一位夥伴）
  D.STARTER = W.map((e) => 'n5_' + e + '1');
  const HERO = {
    copywriter: ['n5_memory_guilt', 'n5_hope_memory', 'n5_warmth_memory', 'n5_anger_neon'],
    busker: ['n5_water_neon', 'n5_warmth_rebel', 'n5_rebel_anger', 'n5_hope_water'],
    animator: ['n5_hope_machine', 'n5_memory_machine', 'n5_rebel_neon', 'n5_machine_guilt'],
  };
  Object.keys(D.BACKGROUNDS).forEach((b) => { D.BACKGROUNDS[b].cards = HERO[b] || HERO.copywriter; });
  D.NIGHT5 = N;
})(typeof window !== 'undefined' ? window : globalThis);
