// 《靈感撤離 2080》每日天氣與奇怪狀態（第十期）。
// 每天早上擲一次：一般天氣跟季節走；奇怪狀態越到後期越常見。
// mods 與世界事件相同（pay：工作收入倍數、closed：停業、sparkDaily／bodyDaily／paranoiaDaily：當晚結算、foodMult：飯錢倍數）。
// tag：下筆的素材有這個標籤時，作品分 ×x。vis：浮城畫面的天氣效果（weather-fx.js）。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA;
  const W = (id, name, glyph, o) => Object.assign({ id, name, glyph, kind: 'normal', w: 1, mods: {} }, o);
  const WEATHER = [
    // ---------- 風暴季 ----------
    W('drizzle', '毛毛雨', '☂', { seasons: ['storm', 'acid'], w: 3, vis: 'drizzle', forecast: '毛毛雨，全日不停。傘子是浮城最常見的遺物。' }),
    W('downpour', '暴雨', '☔', { seasons: ['storm'], w: 3, vis: 'storm', mods: { pay: { delivery: 1.3 } }, tag: { t: 'water', x: 1.2 },
      forecast: '黑色暴雨警告。外送平台把「準時」重新定義為「今天之內」，小費加三成。' }),
    W('typhoon', '八號風球', '🌀', { seasons: ['storm'], w: 1, vis: 'typhoon', mods: { closed: ['delivery', 'busk', 'garden'], pay: { farm: 1.5 } }, tag: { t: 'water', x: 1.3 },
      forecast: '八號烈風信號。外送、街頭表演、天台菜園暫停；全城困在家裡刷手機，內容農場收入 ×1.5。' }),
    W('fog', '濃霧', '🌫', { seasons: ['storm', 'acid'], w: 2, vis: 'fog', mods: { pay: { delivery: 0.8 } }, tag: { t: 'memory', x: 1.25 },
      forecast: '濃霧。能見度十米，舊城的輪廓像回憶一樣模糊。適合寫「記憶」。' }),
    W('thunder', '雷暴', '⚡', { seasons: ['storm', 'heat'], w: 2, vis: 'thunder', tag: { t: 'anger', x: 1.25 },
      forecast: '雷暴。天空區的避雷針全部亮着，像一排生氣的手指。' }),
    // ---------- 熱浪季 ----------
    W('scorch', '烈日', '☀', { seasons: ['heat'], w: 3, vis: 'heat', forecast: '烈日當空。體感溫度 52 度，天空區的冷氣排向下層。' }),
    W('heatdome', '熱穹頂', '♨', { seasons: ['heat'], w: 1, vis: 'heatdome', mods: { bodyDaily: -3, pay: { garden: 0.7 } }, tag: { t: 'hunger', x: 1.25 },
      forecast: '熱穹頂籠罩浮城。晚上身體 −3；菜都曬乾了。' }),
    W('sandstorm', '沙塵暴', '🏜', { seasons: ['heat'], w: 2, vis: 'sand', mods: { pay: { dive: 0.85 } }, tag: { t: 'rebel', x: 1.2 },
      forecast: '沙塵從乾涸的內陸吹來。天空變成橙色，所有人的牙縫都有沙。' }),
    W('drythunder', '乾雷', '🌩', { seasons: ['heat'], w: 1, vis: 'drythunder', tag: { t: 'anger', x: 1.2 },
      forecast: '只打雷不下雨。氣象局說這是「情緒化的天氣」。' }),
    // ---------- 酸雨季 ----------
    W('acidrain', '酸雨', '☣', { seasons: ['acid'], w: 3, vis: 'acid', forecast: '酸雨。請勿用舌頭試雨。雨傘半價促銷。' }),
    W('acidfog', '酸霧', '☁', { seasons: ['acid'], w: 1, vis: 'acidfog', mods: { sparkDaily: -0.05 }, tag: { t: 'guilt', x: 1.3 },
      forecast: '酸霧。空氣有種內疚的味道。晚上火花 −0.05。' }),
    W('neonsmog', '霓虹煙霞', '🌆', { seasons: ['acid', 'heat'], w: 2, vis: 'neonsmog', mods: { pay: { smile: 1.2 } }, tag: { t: 'neon', x: 1.3 },
      forecast: '霓虹燈的光被煙霞困住，整個城市粉紅一片。天空區的派對特別多，陪伴收入 ×1.2。' }),
    // ---------- 任何季節 ----------
    W('clear', '放晴', '🌤', { w: 2, vis: 'clear', mods: { sparkDaily: 0.05 }, forecast: '難得放晴。看得見遠處淹沒的舊山頂。晚上火花 +0.05。' }),
    W('rainbow', '彩虹', '🌈', { w: 1, vis: 'rainbow', tag: { t: 'hope', x: 1.3 }, forecast: '雨後彩虹。天空區有人申請了專利。' }),
    W('overcast', '陰天', '☁', { w: 3, vis: 'overcast', forecast: '陰天。沒有雨，沒有太陽，沒有特別的事。這本身就很特別。' }),
    W('hail', '冰雹', '🧊', { w: 1, vis: 'hail', mods: { pay: { delivery: 1.4 } }, forecast: '冰雹。外送員加錢出動；天空區的玻璃屋頂受到保險保障，你沒有。' }),
    // ---------- 奇怪狀態 ----------
    W('snow', '熱帶落雪', '❄', { kind: 'odd', vis: 'snow', mods: { sparkDaily: 0.1 }, tag: { t: 'memory', x: 1.4 },
      forecast: '【異常】浮城一百年來第一場雪。老人在哭，小孩不知道這是甚麼。晚上火花 +0.1。' }),
    W('fishrain', '魚雨', '🐟', { kind: 'odd', vis: 'fishrain', mods: { foodMult: 0.4, pay: { haggle: 1.5 } }, tag: { t: 'hunger', x: 1.3 },
      forecast: '【異常】天上掉下沙甸魚。今晚的飯錢 ×0.4；夜市收入 ×1.5。' }),
    W('jellysky', '天空水母', '🪼', { kind: 'odd', vis: 'jellysky', tag: { t: 'water', x: 1.35 },
      forecast: '【異常】發光水母從海面升上天空，慢慢飄過大廈之間。專家說「不要摸」。' }),
    W('aurora', '赤道極光', '🌌', { kind: 'odd', vis: 'aurora', mods: { sparkDaily: 0.1 }, tag: { t: 'hope', x: 1.4 },
      forecast: '【異常】赤道上空出現極光。磁場紊亂，所有指南針都指向天空區。晚上火花 +0.1。' }),
    W('meteor', '流星雨', '☄', { kind: 'odd', vis: 'meteor', tag: { t: 'hope', x: 1.25 },
      forecast: '【異常】今晚有流星雨。外星人說那是他們的垃圾。' }),
    W('doublemoon', '兩個月亮', '🌗', { kind: 'odd', vis: 'doublemoon', mods: { paranoiaDaily: 3 }, tag: { t: 'rebel', x: 1.3 },
      forecast: '【異常】天上有兩個月亮。官方說其中一個是廣告。偏執 +3。' }),
    W('blackout', '全城停電', '🕯', { kind: 'odd', vis: 'blackout', mods: { closed: ['label', 'ot', 'farm'], pay: { busk: 1.5 } }, tag: { t: 'warmth', x: 1.3 },
      forecast: '【異常】全城停電。AI 標註和內容農場停工；人們走到街上，街頭表演收入 ×1.5。' }),
    W('adsky', '天空廣告', '📺', { kind: 'odd', vis: 'adsky', mods: { sparkDaily: -0.05, pay: { farm: 1.3 } }, tag: { t: 'neon', x: 1.2 },
      forecast: '【異常】雲層被租了出去，整個天空在播廣告。晚上火花 −0.05。' }),
    W('gravity', '重力異常', '🪨', { kind: 'odd', vis: 'gravity', mods: { pay: { salvage: 1.5 } }, tag: { t: 'machine', x: 1.25 },
      forecast: '【異常】局部重力減弱，碎石和舊招牌慢慢浮起來。拆樓打撈收入 ×1.5。' }),
    W('uprain', '雨倒着下', '🔼', { kind: 'odd', vis: 'uprain', mods: { paranoiaDaily: 2 }, tag: { t: 'rebel', x: 1.25 },
      forecast: '【異常】雨從海面往天上落。氣象局拒絕解釋。偏執 +2。' }),
    W('redtide', '紅潮', '🩸', { kind: 'odd', vis: 'redtide', mods: { pay: { dive: 0.7 } }, tag: { t: 'anger', x: 1.3 },
      forecast: '【異常】海水變紅。潛水的漁獲 ×0.7；新聞說這是「季節性的」。' }),
    W('glitch', '現實延遲', '▦', { kind: 'odd', vis: 'glitch', mods: { paranoiaDaily: 2 }, tag: { t: 'machine', x: 1.4 },
      forecast: '【異常】城市在「緩衝」。有人看見同一隻雀鳥飛過三次。偏執 +2。' }),
    W('paperstorm', '文件風暴', '📄', { kind: 'odd', vis: 'paper', mods: { pay: { label: 1.3, farm: 1.2 } }, tag: { t: 'guilt', x: 1.2 },
      forecast: '【異常】天空區的碎紙機壞了，十年的機密文件從天而降。' }),
    W('bubbles', '肥皂泡天', '🫧', { kind: 'odd', vis: 'bubbles', mods: { sparkDaily: 0.1 }, tag: { t: 'hope', x: 1.2 },
      forecast: '【異常】海面不停冒出彩色泡泡，全城的小孩都在追。晚上火花 +0.1。' }),
    W('eclipse', '日蝕', '🌑', { kind: 'odd', vis: 'eclipse', mods: { paranoiaDaily: 2 }, tag: { t: 'guilt', x: 1.35 },
      forecast: '【異常】日全蝕。外星人選這個時候「調整天線」。偏執 +2。' }),
    W('skywhale', '天空鯨魚', '🐋', { kind: 'odd', vis: 'whale', mods: { sparkDaily: 0.05 }, tag: { t: 'water', x: 1.25 },
      forecast: '【異常】一條鯨魚在雲層中游過浮城。沒有人知道牠怎樣上去。' }),
    W('freeze', '雨停在半空', '⏸', { kind: 'odd', vis: 'freeze', tag: { t: 'memory', x: 1.3 },
      forecast: '【異常】雨點停在半空，一動不動。時間局說會在「工作天內」處理。' }),
    W('ufofleet', '飛碟艦隊', '🛸', { kind: 'odd', vis: 'ufos', mods: { paranoiaDaily: 4, signalMult: 1.1 },
      forecast: '【異常】幾十艘飛碟停在雲層下面。外星人今天看得特別仔細：訊號 ×1.1，偏執 +4。' }),
    W('drones', '無人機螢火', '✦', { kind: 'odd', vis: 'drones', mods: { pay: { delivery: 1.2 } }, tag: { t: 'machine', x: 1.2 },
      forecast: '【異常】幾千架送貨無人機失去訊號，在空中閃着燈打轉，像螢火蟲。' }),
    W('glowsea', '夜光海', '✨', { kind: 'odd', vis: 'glowsea', mods: { sparkDaily: 0.05 }, tag: { t: 'water', x: 1.3 },
      forecast: '【異常】海水在發光。每一個浪都是藍色的。晚上火花 +0.05。' }),
  ];
  const WEATHER_BY = {};
  WEATHER.forEach((w) => { WEATHER_BY[w.id] = w; });
  // 效果的簡短說明（狀態列提示、手機）
  const PAY_NAME = { label: 'AI 標註', ot: '加班', smile: '陪伴', delivery: '外送', farm: '內容農場', clinic: '診所', dive: '潛水', busk: '表演', garden: '菜園', salvage: '拆樓', haggle: '夜市' };
  function weatherNote(w) {
    const m = w.mods || {}, out = [];
    if (w.tag) out.push('「' + D.TAGS[w.tag.t].name + '」素材 ×' + w.tag.x);
    Object.keys(m.pay || {}).forEach((j) => out.push((PAY_NAME[j] || j) + '收入 ×' + m.pay[j]));
    if (m.closed) out.push(m.closed.map((j) => PAY_NAME[j] || j).join('、') + '暫停');
    if (m.sparkDaily) out.push('晚上火花 ' + (m.sparkDaily > 0 ? '+' : '−') + Math.abs(m.sparkDaily));
    if (m.bodyDaily) out.push('晚上身體 ' + m.bodyDaily);
    if (m.paranoiaDaily) out.push('偏執 +' + m.paranoiaDaily);
    if (m.foodMult) out.push('飯錢 ×' + m.foodMult);
    if (m.signalMult) out.push('訊號 ×' + m.signalMult);
    return out.join('・');
  }
  Object.assign(D, { WEATHER, WEATHER_BY, weatherNote });
});
