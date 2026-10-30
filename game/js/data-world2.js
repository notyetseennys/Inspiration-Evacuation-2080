// 《靈感撤離 2080》世界（第四期）：再多 14 個目的地、14 件極稀有素材、4 個傳說組合、12 種旅行死法、
// 各地區的紀念品（只在當地買得到的靈感物件）、旅途中的道德抉擇、特價機票與機票等級。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA;
  const ev = (s, id) => !!(IE.Rules && IE.Rules.eventActive(s, id));

  // ---------- 素材 ----------
  const C = (id, name, tags, value, origin, rarity) => [id, { name, tags, value, origin, rarity: rarity || null }];
  const CARDS = Object.fromEntries([
    C('t_subway', '水底地鐵站', ['water', 'neon'], 30, 'america'), C('t_broadway', '百老匯的最後一場', ['neon', 'warmth'], 34, 'america'),
    C('t_skyscraper', '只剩頂層的摩天大樓', ['water', 'machine'], 32, 'america'), C('z_liberty', '自由女神的火炬', ['rebel', 'hope'], 95, 'america', 'legend'),
    C('t_steam', '地熱的蒸氣', ['water', 'anger'], 30, 'europe'), C('t_saga', '冰島薩迦', ['memory', 'ancient'], 36, 'europe'),
    C('t_blacksand', '黑沙灘', ['water', 'memory'], 30, 'europe'), C('z_aurorasong', '極光的聲音', ['cosmic', 'warmth'], 92, 'europe', 'legend'),
    C('t_moai', '摩艾的背影', ['ancient', 'memory'], 36, 'ocean'), C('t_rongo', '朗格朗格木板', ['ancient', 'rebel'], 38, 'ocean'),
    C('t_birdman', '鳥人比賽的蛋', ['hope', 'ancient'], 34, 'ocean'), C('z_moaieye', '轉身的摩艾', ['ancient', 'water'], 100, 'ocean', 'legend'),
    C('t_terrace', '梯田', ['ancient', 'hunger'], 32, 'america'), C('t_condor', '禿鷹的影子', ['hope', 'cosmic'], 34, 'america'),
    C('t_intistone', '拴日石', ['ancient', 'cosmic'], 38, 'america'), C('z_khipu', '結繩文字', ['memory', 'ancient'], 98, 'america', 'legend'),
    C('t_rosestone', '玫瑰色的岩石', ['ancient', 'warmth'], 34, 'asia'), C('t_siq', '峽谷的回聲', ['ancient', 'water'], 32, 'asia'),
    C('t_camel', '駱駝的鈴', ['hunger', 'memory'], 28, 'asia'), C('z_treasury', '寶庫裡的光', ['ancient', 'hope'], 96, 'asia', 'legend'),
    C('t_beacon', '烽火台', ['ancient', 'anger'], 34, 'asia'), C('t_brickname', '城磚上的名字', ['memory', 'ancient'], 36, 'asia'),
    C('t_wallsnow', '長城的雪', ['hope', 'water'], 30, 'asia'), C('z_lastbrick', '最後一塊城磚', ['ancient', 'rebel'], 96, 'asia', 'legend'),
    C('t_fresco2', '龐貝的壁畫', ['ancient', 'neon'], 36, 'europe'), C('t_graffitiold', '兩千年前的塗鴉', ['rebel', 'ancient'], 38, 'europe'),
    C('t_bread', '碳化的麵包', ['hunger', 'ancient'], 30, 'europe'), C('z_ashhug', '灰燼裡的擁抱', ['warmth', 'ancient'], 100, 'europe', 'legend'),
    C('t_bluestone', '藍砂岩', ['ancient', 'cosmic'], 36, 'europe'), C('t_druid', '德魯伊的歌', ['ancient', 'hope'], 32, 'europe'),
    C('t_barrow', '古墳', ['ancient', 'memory'], 32, 'europe'), C('z_solstice', '冬至的第一道光', ['cosmic', 'hope'], 95, 'europe', 'legend'),
    C('t_hummingbird', '地上的蜂鳥', ['ancient', 'cosmic'], 36, 'america'), C('t_spider', '地上的蜘蛛', ['ancient', 'rebel'], 34, 'america'),
    C('t_desertline', '一直延伸的線', ['hope', 'ancient'], 30, 'america'), C('z_skyletter', '寫給天空的信', ['cosmic', 'ancient'], 100, 'america', 'legend'),
    C('t_bone', '恐龍的肋骨', ['ancient', 'hunger'], 34, 'asia'), C('t_redcliff', '火焰崖', ['anger', 'ancient'], 32, 'asia'),
    C('t_footprint', '恐龍的腳印', ['ancient', 'water'], 34, 'asia'), C('z_dinoegg', '沒有孵化的恐龍蛋', ['ancient', 'hope'], 100, 'asia', 'legend'),
    C('t_fallen', '倒下的樹林', ['anger', 'memory'], 32, 'arctic'), C('t_melt', '玻璃化的泥土', ['cosmic', 'machine'], 36, 'arctic'),
    C('t_reindeer', '馴鹿人的故事', ['warmth', 'memory'], 30, 'arctic'), C('z_tunguska', '1908 年的碎片', ['cosmic', 'anger'], 98, 'arctic', 'legend'),
    C('t_dish', '巨型天線', ['machine', 'cosmic'], 34, 'america'), C('t_static', '宇宙的雜音', ['cosmic', 'neon'], 34, 'america'),
    C('t_coqui', '樹蛙的叫聲', ['water', 'warmth'], 30, 'america'), C('z_reply', '外星人的回信', ['cosmic', 'hope'], 105, 'america', 'legend'),
    C('t_prayerflag', '經幡', ['hope', 'warmth'], 32, 'asia'), C('t_glacier', '雪山的倒影', ['water', 'hope'], 34, 'asia'),
    C('t_yak', '犛牛奶茶', ['warmth', 'hunger'], 28, 'asia'), C('z_camellia', '不會凋謝的山茶', ['hope', 'warmth'], 105, 'asia', 'legend'),
    C('t_raft', '黃金木筏', ['water', 'neon'], 36, 'america'), C('t_lagoongold', '湖底的金器', ['water', 'hunger'], 34, 'america'),
    C('t_jungle2', '雨林的夜', ['hope', 'anger'], 30, 'america'), C('z_goldman', '黃金人', ['neon', 'ancient'], 110, 'america', 'legend'),
  ]);
  Object.assign(D.CARDS, CARDS);

  // ---------- 目的地 ----------
  const S = (id, name, desc, fx) => Object.assign({ id, name, desc, body: 8, spark: 0, gain: [], risk: null, need: null, rare: null }, fx);
  const NEW = [
    { id: 'sunkennyc', name: '沉沒的紐約', region: 'america', kind: 'modern', x: 94, y: 49, cost: 420, stay: 2, landmark: 'nyc', sky: ['#1b2a4a', '#ff8a3c'], ground: '#0c4457',
      desc: '摩天大樓只剩頂層露出水面，華爾街變成了珊瑚礁。', sites: [
        S('subway', '水底地鐵站', '潛進淹沒的地鐵站，列車時刻表還在跳。', { gain: ['t_subway', 't_skyscraper'], body: 10, need: { swim: 30 }, risk: { chance: 0.02, death: 'nyc_current' } }),
        S('broadway', '百老匯', '最後一個劇團在屋頂上演出。', { gain: ['t_broadway'], spark: 0.4, body: 4 }),
        S('liberty', '自由女神', '划船到只剩火炬露出水面的自由女神像。', { gain: ['t_skyscraper'], body: 6,
          rare: { id: 'z_liberty', chance: 0.8, cond: (s) => ev(s, 'martial') || ev(s, 'election'), text: '浮城戒嚴或選舉期間，火炬在水底亮了起來' } }),
      ] },
    { id: 'reykjavik', name: '冰島地熱城', region: 'europe', kind: 'modern', x: 140, y: 26, cost: 460, stay: 2, landmark: 'geyser', sky: ['#0b1a3a', '#37c3d6'], ground: '#2a2a33',
      desc: '全世界最後一個不用擔心電費的城市，因為地底下全是火。', sites: [
        S('geysir', '間歇泉', '等間歇泉噴發。', { gain: ['t_steam'], body: 8, spark: 0.2, risk: { chance: 0.02, death: 'geyser' } }),
        S('sagahall', '薩迦圖書館', '讀古老的冰島薩迦。', { gain: ['t_saga'], spark: 0.3, body: 2 }),
        S('blacksand', '黑沙灘', '在黑沙灘上聽極光。', { gain: ['t_blacksand'], body: 6,
          rare: { id: 'z_aurorasong', chance: 0.8, cond: (s) => ev(s, 'blackout') || ev(s, 'netdown'), text: '全城停電或網絡崩潰的晚上，極光發出聲音' } }),
      ] },
    { id: 'moai', name: '復活節島', region: 'ocean', kind: 'ancient', x: 63, y: 117, cost: 780, stay: 3, landmark: 'moai', sky: ['#3a1a2e', '#ffb347'], ground: '#4f6a3a',
      desc: '摩艾石像背對大海，看著島上的人。島上已經沒有人了。', sites: [
        S('ahu', '石像祭壇', '在十五尊摩艾前面坐了一個下午。', { gain: ['t_moai'], spark: 0.4, body: 4 }),
        S('quarry', '石場', '爬進還沒完成的石像中間。', { gain: ['t_rongo', 't_moai'], body: 12, risk: { chance: 0.03, death: 'moai_fall' } }),
        S('shore', '海岸', '看海水一寸一寸爬上石像的腳。', { gain: ['t_birdman'], body: 6,
          rare: { id: 'z_moaieye', chance: 0.85, cond: (s) => ev(s, 'tsunami') || ev(s, 'moonfall') || ev(s, 'megastorm'), text: '海嘯、大潮或超級颶風之後，有一尊摩艾轉身看向大海' } }),
      ] },
    { id: 'machupicchu', name: '馬丘比丘', region: 'america', kind: 'ancient', x: 100, y: 98, cost: 620, stay: 2, landmark: 'machu', sky: ['#1d3a4a', '#c9d6e8'], ground: '#3d6b2a',
      desc: '雲上的城市，水淹不到的地方。山下的難民已經排了三年隊。', sites: [
        S('terraces', '梯田', '在梯田上幫難民種馬鈴薯。', { gain: ['t_terrace'], body: 10, atone: 1.5 }),
        S('intihuatana', '拴日石', '在拴日石旁邊等太陽。', { gain: ['t_intistone', 't_condor'], body: 8, risk: { chance: 0.02, death: 'altitude' } }),
        S('archive', '結繩記事館', '看老人用繩結記帳。', { gain: ['t_condor'], need: { insight: 40 }, body: 4,
          rare: { id: 'z_khipu', chance: 0.85, cond: (s) => ev(s, 'netdown') || ev(s, 'airogue'), text: '全球網絡崩潰或 AI 失控期間，結繩變回唯一可靠的記錄' } }),
      ] },
    { id: 'petra', name: '佩特拉', region: 'asia', kind: 'ancient', x: 206, y: 62, cost: 520, stay: 2, landmark: 'petra', sky: ['#5a2a1a', '#ffb38a'], ground: '#c46a4a',
      desc: '在玫瑰色岩石裡雕出來的城市，入口是一條窄窄的峽谷。', sites: [
        S('siq', '蛇道峽谷', '走過一公里長的峽谷。', { gain: ['t_siq'], body: 8, risk: { chance: 0.02, death: 'flashflood' } }),
        S('caravan', '駱駝隊', '跟著駱駝隊走了一天。', { gain: ['t_camel', 't_rosestone'], body: 10, spark: 0.2 }),
        S('khazneh', '寶庫', '站在寶庫門前，等太陽照到門楣。', { gain: ['t_rosestone'], body: 4,
          rare: { id: 'z_treasury', chance: 0.85, cond: (s) => s.spark >= 3.5, text: '只有火花 ×3.5 以上的人，才看得見寶庫裡的光' } }),
      ] },
    { id: 'greatwall', name: '長城', region: 'asia', kind: 'ancient', x: 263, y: 48, cost: 300, stay: 2, landmark: 'wall', sky: ['#2a3a5c', '#e8c25a'], ground: '#4a5a3a',
      desc: '一萬里長的牆，現在主要用來阻擋海水。', sites: [
        S('beacontower', '烽火台', '爬上最高的烽火台。', { gain: ['t_beacon'], body: 12, spark: 0.2, risk: { chance: 0.02, death: 'wall_fall' } }),
        S('bricks', '刻字的城磚', '找城磚上工匠留下的名字。', { gain: ['t_brickname'], need: { insight: 30 }, body: 6 }),
        S('snowwall', '雪中的城牆', '一個人在雪中的城牆走到天黑。', { gain: ['t_wallsnow', 't_beacon'], body: 10,
          rare: { id: 'z_lastbrick', chance: 0.85, cond: (s) => ev(s, 'war') || ev(s, 'arms'), text: '世界大戰或軍備競賽期間，烽火台又點起了火' } }),
      ] },
    { id: 'pompeii', name: '龐貝', region: 'europe', kind: 'ancient', x: 172, y: 55, cost: 440, stay: 2, landmark: 'pompeii', sky: ['#3a2a3a', '#ff8a3c'], ground: '#8a7a6a',
      desc: '被火山灰保存了兩千年的城市。維蘇威火山最近又在冒煙。', sites: [
        S('villa', '神秘別墅', '看兩千年前的壁畫。', { gain: ['t_fresco2'], spark: 0.4, body: 4 }),
        S('streets', '街道', '讀牆上兩千年前的塗鴉，內容和浮城的差不多。', { gain: ['t_graffitiold', 't_bread'], body: 6 }),
        S('crater', '維蘇威火山口', '爬上火山口往下看。', { gain: ['t_bread'], body: 14, risk: { chance: 0.03, death: 'vesuvius' },
          rare: { id: 'z_ashhug', chance: 0.85, cond: (s) => ev(s, 'nuclearwinter') || ev(s, 'meteor'), text: '天上落灰的日子，灰燼裡出現了一對擁抱的人' } }),
      ] },
    { id: 'stonehenge', name: '巨石陣', region: 'europe', kind: 'prehistoric', x: 152, y: 36, cost: 400, stay: 2, landmark: 'stonehenge', sky: ['#1b2a3a', '#9b8cff'], ground: '#4f6a3a',
      desc: '五千年前的人把巨石從兩百公里外運來，沒有人知道為甚麼。', sites: [
        S('circle2', '石圈', '在石圈中間躺了一整晚。', { gain: ['t_bluestone'], spark: 0.4, body: 4 }),
        S('druids', '新德魯伊', '和自稱德魯伊的人一起唱歌。', { gain: ['t_druid'], spark: 0.3, body: 2, paranoia: 3 }),
        S('heelstone', '踵石', '等日出穿過踵石。', { gain: ['t_barrow', 't_bluestone'], body: 6,
          rare: { id: 'z_solstice', chance: 0.85, cond: (s) => s.day % 25 <= 1 || s.day % 25 >= 24, text: '季節交替的前後兩天，第一道光剛好穿過石門' } }),
      ] },
    { id: 'nazca', name: '納斯卡線', region: 'america', kind: 'prehistoric', x: 88, y: 108, cost: 560, stay: 2, landmark: 'nazca', sky: ['#5a7aa8', '#ffd3a8'], ground: '#c98d5e',
      desc: '只有從天上才看得懂的巨大圖案。畫給誰看的？', sites: [
        S('tower', '觀景台', '爬上觀景台看蜂鳥。', { gain: ['t_hummingbird'], spark: 0.3, body: 4 }),
        S('walk', '沿著線走', '沿著一條線一直走。', { gain: ['t_desertline', 't_spider'], body: 12, risk: { chance: 0.02, death: 'nazca_lost' } }),
        S('flight', '小飛機', '坐小飛機從上面看。', { gain: ['t_spider', 't_hummingbird'], body: 6,
          rare: { id: 'z_skyletter', chance: 0.85, cond: (s) => ev(s, 'aliens') || ev(s, 'tourists') || ev(s, 'alienzoo'), text: '外星人在天上的日子，終於有人回應了地上的圖案' } }),
      ] },
    { id: 'gobi', name: '戈壁恐龍谷', region: 'asia', kind: 'prehistoric', x: 244, y: 44, cost: 480, stay: 2, landmark: 'fossil', sky: ['#5a3a1a', '#ffd36b'], ground: '#c46a3a',
      desc: '六千五百萬年前的墳場。上一次滅絕，原因是一顆隕石。', sites: [
        S('dig', '挖掘場', '跟考古隊挖了一整天。', { gain: ['t_bone', 't_footprint'], body: 12, risk: { chance: 0.02, death: 'fossil_pit' } }),
        S('cliffs', '火焰崖', '日落時火焰崖會燒起來。', { gain: ['t_redcliff'], spark: 0.4, body: 4 }),
        S('nest', '恐龍巢', '傳說有一窩蛋從來沒有孵化。', { gain: ['t_bone'], need: { insight: 35 }, body: 6,
          rare: { id: 'z_dinoegg', chance: 0.85, cond: (s) => ev(s, 'meteor'), text: '隕石雨期間：上一次，牠們也是這樣滅絕的' } }),
      ] },
    { id: 'tunguska', name: '通古斯', region: 'arctic', kind: 'alien', x: 250, y: 30, cost: 640, stay: 2, landmark: 'tunguska', sky: ['#1a2a3a', '#ff8a3c'], ground: '#3a4a3a',
      desc: '1908 年，有東西在這裡爆炸，推倒了八千萬棵樹。官方說是隕石。', sites: [
        S('forest', '倒下的森林', '在一百多年後仍然倒下的森林裡走。', { gain: ['t_fallen'], body: 8, spark: 0.2 }),
        S('epicenter', '爆炸中心', '站在所有樹倒下的方向的中心。', { gain: ['t_melt', 't_fallen'], body: 12, risk: { chance: 0.03, death: 'tunguska_blast' } }),
        S('camp', '馴鹿人的營地', '聽馴鹿人講那天的故事。', { gain: ['t_reindeer'], body: 4, atone: 1,
          rare: { id: 'z_tunguska', chance: 0.85, cond: (s) => ev(s, 'broadcast') || ev(s, 'cosmicray'), text: '宇宙廣播或宇宙射線暴期間，碎片開始回應' } }),
      ] },
    { id: 'arecibo', name: '阿雷西博天線', region: 'america', kind: 'alien', x: 100, y: 72, cost: 520, stay: 2, landmark: 'dish', sky: ['#0b1a2e', '#3d8b5a'], ground: '#2f5a2a',
      desc: '人類曾經從這裡向宇宙發出一封信。天線倒塌之後，有人偷偷把它修好了。', sites: [
        S('dishwalk', '天線上', '爬上天線的吊臂。', { gain: ['t_dish'], body: 10, need: { fit: 35 }, risk: { chance: 0.03, death: 'dish_fall' } }),
        S('control', '控制室', '戴上耳機聽宇宙的雜音。', { gain: ['t_static'], spark: 0.3, body: 2, paranoia: 4 }),
        S('rainforest', '雨林', '聽樹蛙叫了一整晚。', { gain: ['t_coqui', 't_static'], body: 6,
          rare: { id: 'z_reply', chance: 0.85, cond: (s) => ev(s, 'disclosure') || ev(s, 'strike'), text: '外星人真相公開，或外星 HR 罷工期間，有人偷偷回了信' } }),
      ] },
    { id: 'shangrila', name: '香格里拉', region: 'asia', kind: 'legend', x: 236, y: 64, cost: 900, stay: 3, landmark: 'shangrila', sky: ['#2a3a6a', '#e8edf6'], ground: '#3d6b5a',
      desc: '雪山後面的山谷，傳說住在那裡的人不會變老。只有靈魂很輕的人找得到入口。', when: (s) => s.soul <= 8, lockText: '靈魂 8 克以下才找得到入口',
      sites: [
        S('monastery2', '雪山寺院', '和喇嘛一起看雪山。', { gain: ['t_prayerflag', 't_glacier'], spark: 0.5, body: 6, atone: 2 }),
        S('valley', '不老的山谷', '在山谷裡住了一天，覺得過了一年。', { gain: ['t_yak'], spark: 0.4, body: -6 }),
        S('pass', '雪山埡口', '爬上雪山埡口。', { gain: ['t_glacier'], body: 14, risk: { chance: 0.03, death: 'altitude' },
          rare: { id: 'z_camellia', chance: 0.9, cond: (s) => s.soul <= 3, text: '靈魂輕過 3 克的人，會看見一朵不會凋謝的山茶' } }),
      ] },
    { id: 'eldorado', name: '黃金國', region: 'america', kind: 'legend', x: 96, y: 86, cost: 700, stay: 3, landmark: 'eldorado', sky: ['#14321c', '#ffd36b'], ground: '#1d4a2a',
      desc: '傳說中用黃金鋪路的城市。天空區的探險隊找了很多年，都找不到。', when: (s) => s.cr <= 1200, lockText: '身上超過 $1,200 的人找不到黃金國',
      sites: [
        S('lake', '瓜達維塔湖', '在湖邊看當地人把金器投進湖裡。', { gain: ['t_lagoongold', 't_raft'], body: 8, need: { swim: 30 } }),
        S('jungle', '雨林深處', '在雨林裡找黃金國的入口。', { gain: ['t_jungle2'], body: 14, risk: { chance: 0.04, death: 'eldorado_lost' } }),
        S('raft', '黃金木筏', '看一個人全身塗滿金粉，坐木筏划到湖中心。', { gain: ['t_raft'], spark: 0.4, body: 4,
          rare: { id: 'z_goldman', chance: 0.9, cond: (s) => s.cr <= 50, text: '只有身無分文（$50 以下）的人，黃金人才會出現' } }),
      ] },
  ];
  NEW.forEach((d) => { D.DESTINATIONS.push(d); D.DEST[d.id] = d; });
  // 舊目的地重新排位，免得在地圖上擠在一起
  const MOVE = { lascaux: [150, 48], venice: [166, 42], alexandria: [184, 56], cairo: [195, 64], giza: [183, 71], gobekli: [201, 50] };
  Object.keys(MOVE).forEach((id) => { D.DEST[id].x = MOVE[id][0]; D.DEST[id].y = MOVE[id][1]; });
  // 時間旅人：亞歷山大圖書館隨時開放；太空人：月球招聘中心一開始就邀請你
  const perk = (s) => (D.BACKGROUNDS[s.bg] && D.BACKGROUNDS[s.bg].perk) || {};
  const alexWhen = D.DEST.alexandria.when, moonWhen = D.DEST.moonbase.when;
  D.DEST.alexandria.when = (s) => !!perk(s).alexandria || alexWhen(s);
  D.DEST.moonbase.when = (s) => !!perk(s).moonInvite || moonWhen(s);

  // ---------- 傳說組合 ----------
  const has = (sel, id) => sel.some((c) => c.id === id);
  const R = (id, name, chips, mult, xmult, cond, hint) => ({ id, name, need: {}, chips, mult, legend: true, xmult, cond, hint });
  D.RECIPES.push(
    R('extinction', '第六次滅絕', 130, 6, 5, (s, sel) => has(sel, 'z_dinoegg') && has(sel, 'z_heartbeat'), '一隻沒有孵化的恐龍，和一隻長毛象的心跳。'),
    R('lostcities', '失落之城', 140, 7, 5, (s, sel) => ['z_goldman', 'z_camellia', 'z_atlantis', 'z_lastbook'].filter((id) => has(sel, id)).length >= 2, '兩座只存在於傳說裡的城市。'),
    R('reply', '寫給天空的信與回信', 150, 8, 5, (s, sel) => has(sel, 'z_skyletter') && has(sel, 'z_reply'), '地上的人寫了一封信，天上的人回了一封。'),
    R('humanhistory', '人類簡史', 100, 5, 4, (s, sel) => sel.filter((c) => c.rarity === 'legend').length >= 3, '把三件極稀有的東西放在一起，就是人類的歷史。'),
  );

  // ---------- 旅行死法 ----------
  const X = (id, name, ep, au, hint) => ({ id, name, cat: 'travel', p: 1, causes: ['instant'], when: null, ep, au, hint });
  [
    X('nyc_current', '被沉沒的紐約的暗流捲走', '他在水底地鐵站等一班永遠不會來的列車。', '樣本在舊人類的交通系統中停止運作。準時程度：未知。', '潛進沉沒的紐約的水底地鐵站。'),
    X('geyser', '被間歇泉燙死', '間歇泉每八分鐘噴一次。他算錯了一次。', '樣本被地球內部的熱能直接烹調。', '在冰島等間歇泉噴發。'),
    X('moai_fall', '被摩艾壓住', '那尊摩艾在石場裡躺了五百年，那天它決定翻身。', '樣本被一件未完成的作品壓毀。我們理解這種感覺。', '爬進復活節島的石場。'),
    X('altitude', '高山症', '空氣越來越稀薄，他還以為那是靈感。', '樣本在高海拔缺氧。它的最後一句話很有詩意，可惜沒有人聽懂。', '在馬丘比丘或香格里拉爬得太高。'),
    X('flashflood', '佩特拉的山洪', '一場遠方的雨，在峽谷裡變成了一堵牆。', '樣本在狹窄地形遇上突發水流。浮城人的老毛病。', '走進佩特拉的蛇道峽谷。'),
    X('wall_fall', '從長城跌下', '他想在烽火台上拍一張日落。', '樣本從防禦工事跌落。工事表現良好。', '爬上長城的烽火台。'),
    X('vesuvius', '維蘇威火山又爆發了', '兩千年後，龐貝又多了一具石膏像。', '樣本被火山灰保存。保存狀態極佳，已列為展品。', '爬上維蘇威火山口。'),
    X('nazca_lost', '在納斯卡荒原迷路', '他沿著一條線一直走，走進了一隻蜘蛛的肚子裡。', '樣本跟隨古代指示走失。指示原本是寫給天空看的。', '沿著納斯卡線一直走。'),
    X('fossil_pit', '掉進化石坑', '六千五百萬年後，戈壁多了一具新的化石。', '樣本加入了地層。未來的考古學家會很困惑。', '在戈壁的挖掘場挖得太深。'),
    X('tunguska_blast', '第二次通古斯爆炸', '一百多年後，同一個地方又爆炸了一次。這次沒有人說是隕石。', '［本局對此事件不予評論］', '站在通古斯爆炸中心。'),
    X('dish_fall', '從天線上跌下', '他爬上人類寫信給宇宙的地方，然後掉了下來。', '樣本從通訊設施跌落。設施仍在接收訊號。', '爬上阿雷西博天線的吊臂。'),
    X('eldorado_lost', '在雨林裡找黃金國', '他找到了。只是再也走不出來。', '樣本進入一個不存在的地方。我們已把它的檔案移到「傳說」類。', '在黃金國的雨林深處探險。'),
  ].forEach((d) => { D.DEATHS.push(d); D.DEATH[d.id] = d; });

  // ---------- 紀念品：只在當地買得到的靈感物件 ----------
  const O = (id, name, rarity, icon, pal, desc, region, price, fx) => Object.assign({ id, name, rarity, icon, pal, desc, souvenir: region, price, src: D.REGIONS[region] + '的紀念品店' }, fx);
  const hasTag = (c, t) => c.tags.includes(t);
  D.OBJECTS.push(
    O('manekineko', '招財貓', 'rare', 'cat', { a: '#ffffff', b: '#e8c25a', c: '#ff4d5e' }, '每次下筆得到 $8。', 'asia', 220,
      { after: () => ({ cr: 8 }) }),
    O('carnivalmask', '面具節的面具', 'rare', 'mask', { a: '#ffd36b', b: '#5a2f8a', c: '#ff4fb4' }, '每張「霓虹」或「記憶」素材計分時，倍率 +2。', 'europe', 200,
      { card: (c) => (hasTag(c, 'neon') || hasTag(c, 'memory') ? { mult: 2 } : null) }),
    O('scarab', '聖甲蟲', 'rare', 'gem', { a: '#37c3d6', b: '#1f4a6b', c: '#ffd36b' }, '每張「遠古」素材計分時，倍率 +3。', 'africa', 220,
      { card: (c) => (hasTag(c, 'ancient') ? { mult: 3 } : null) }),
    O('dreamcatcher', '捕夢網', 'rare', 'stone', { a: '#c98d5e', b: '#6b3a1e', c: '#e8edf6' }, '每張「希望」素材計分時，籌碼 +25。', 'america', 180,
      { card: (c) => (hasTag(c, 'hope') ? { chips: 25 } : null) }),
    O('snowglobe', '冰封的雪球', 'rare', 'gem', { a: '#e8edf6', b: '#8db7d6', c: '#ffffff' }, '每張「水」素材計分時，倍率 ×1.15。', 'arctic', 240,
      { card: (c) => (hasTag(c, 'water') ? { xmult: 1.15 } : null) }),
    O('penguin', '企鵝玩偶', 'rare', 'cat', { a: '#1b1b28', b: '#e8edf6', c: '#ffc247' }, '每張「人情」素材計分時，籌碼 +30。', 'antarctica', 260,
      { card: (c) => (hasTag(c, 'warmth') ? { chips: 30 } : null) }),
    O('minimoai', '迷你摩艾', 'legend', 'stone', { a: '#8a7a6a', b: '#4a3a2a', c: '#c9a86b' }, '只用一張素材下筆時，倍率 ×5。', 'ocean', 320,
      { play: (x) => (x.sel.length === 1 ? { xmult: 5 } : null) }),
    O('moondust', '一瓶月塵', 'legend', 'bottle', { a: '#c9d1dc', b: '#5a6478', c: '#9b8cff' }, '本局每去過一個目的地，倍率 +2。', 'space', 380,
      { play: (x) => { const n = Object.keys(x.s.visited || {}).length; return n ? { mult: 2 * n } : null; } }),
  );
  D.OBJECTS.forEach((o) => { D.OBJ[o.id] = o; });

  // ---------- 旅途中的抉擇 ----------
  D.DILEMMAS.push(
    { id: 'smuggle', trip: true, text: '一個商人在旅館大堂找你：「幫我把一件小東西帶回浮城，$300。不用問是甚麼。」',
      options: [{ label: '收下錢', cr: 300, sin: 3, guilt: '走私的文物', tag: 'ancient' }, { label: '拒絕', atone: 0.5 }] },
    { id: 'beggarkid', trip: true, text: '一個小孩跟著你走了一條街，向你伸出手。',
      options: [{ label: '給他 $40', cr: -40, atone: 1.5, stats: { empathy: 1 }, need: (s) => (s.cr >= 40 ? null : '你身上沒有 $40') },
        { label: '拍下來放上網', cr: 30, sin: 1.5, guilt: '那個小孩的照片', tag: 'neon', stats: { social: 1 } }, { label: '走開' }] },
    { id: 'selfie', trip: true, text: '一個網紅品牌說：只要你在聖地前面拍一張打卡照，就付你 $80。',
      options: [{ label: '拍', cr: 80, spark: -0.2, sin: 1, guilt: '聖地前的笑容', tag: 'neon' }, { label: '只是安靜地看', spark: 0.3, stats: { calm: 1 } }] },
    { id: 'forbidden', trip: true, text: '導遊壓低聲音說：「$80，我帶你去遊客不能去的地方。」',
      options: [{ label: '去', cr: -80, body: -10, tripCard: 2, stats: { insight: 1 }, need: (s) => (s.cr >= 80 ? null : '你身上沒有 $80') }, { label: '不去' }] },
    { id: 'fakerelic', trip: true, text: '紀念品店老闆發誓這是一件真古董，只賣 $120。你看得出它是浮城製造的。',
      options: [{ label: '揭穿他', stats: { insight: 1.5 }, paranoia: 2 }, { label: '買下來（它還是很漂亮）', cr: -120, card: 'a_icon', need: (s) => (s.cr >= 120 ? null : '你身上沒有 $120') },
        { label: '幫他把貨賣給下一個遊客', cr: 60, sin: 1.5, guilt: '那件假古董', tag: 'hunger' }] },
  );

  // 浮城地圖：新開的百貨公司
  D.PLACES.push({ id: 'mall', name: '浮城百貨', x: 233, y: 71, ui: 'store', icon: 'shop' });

  // ---------- 機票等級 ----------
  D.FARES = {
    budget: { name: '廉航', costMult: 0.6, risk: 2.5, body: 14, spark: -0.1, desc: '旅費 ×0.6；擠在最後一排，身體 −14，航班風險 ×2.5' },
    economy: { name: '經濟艙', costMult: 1, risk: 1, body: 6, spark: 0, desc: '旅費照價；身體 −6' },
    first: { name: '頭等', costMult: 1.8, risk: 0.5, body: -8, spark: 0.3, desc: '旅費 ×1.8；躺著飛，身體 +8、火花 +0.3，航班風險減半' },
  };
  // 護照印章：同一局去過越多地方，獎勵越多
  D.STAMPS = [
    { n: 3, text: '創作手牌 +1' },
    { n: 6, text: '靈感物件欄 +1' },
    { n: 10, text: '每晚多一次下筆' },
  ];
});
