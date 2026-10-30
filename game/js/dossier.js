// 《靈感撤離 2080》人類樣本檔案：遊戲結束時，外星人把你歸類為 30 種人類模組之一，
// 寫下觀察筆記，再蓋上印章。純邏輯，瀏覽器與 Node（tools/sim.js）共用。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA;

  // ---------- 印章 ----------
  // tone 決定顏色：hire 綠、reject 紅、odd 紫、file 灰、warn 橙
  const STAMPS = {
    hire:        { text: '錄用', tone: 'hire' },
    reject:      { text: '否決', tone: 'reject' },
    unknown:     { text: '不明', tone: 'odd' },
    observe:     { text: '待觀察', tone: 'warn' },
    pool:        { text: '列入人才庫', tone: 'file' },
    returned:    { text: '退回原廠', tone: 'reject' },
    reserve:     { text: '轉介地球保育區', tone: 'file' },
    exhibit:     { text: '留作展品', tone: 'odd' },
    mascot:      { text: '列為吉祥物', tone: 'odd' },
    reformat:    { text: '建議重新格式化', tone: 'warn' },
    moredata:    { text: '需要更多數據', tone: 'file' },
    damaged:     { text: '已損毀，仍予歸檔', tone: 'file' },
    resell:      { text: '轉售其他星系', tone: 'warn' },
    interesting: { text: '標記為「有趣」', tone: 'odd' },
    mistake:     { text: '誤收，建議退貨', tone: 'reject' },
    training:    { text: '列入培訓', tone: 'hire' },
    unclass:     { text: '無法分類', tone: 'odd' },
    overweight:  { text: '超重', tone: 'reject' },
    energy:      { text: '轉作能源用途', tone: 'warn' },
  };

  // ---------- 30 種人類模組 ----------
  // w：特徵權重（見 features）；cond：額外加分條件；stamp：主印章；label：印章旁的小字
  const ARCHETYPES = [
    { id: 'efficient', name: '高效能低耗電型', stamp: 'hire', label: '量產用途',
      desc: '性能穩定，幾乎不產生情緒廢熱，可以直接接入生產線。', w: { dex: 0.8, obey: 0.8, imag: -0.6, label: 1 } },
    { id: 'unstable', name: '不穩定發光體', stamp: 'unknown', label: '有自燃傾向',
      desc: '亮度足夠，但有自燃傾向。我們不確定應該收藏它，還是撲滅它。', w: { imag: 0.8, calm: -0.8, spark: 0.8 } },
    { id: 'overconnected', name: '過度連線型', stamp: 'reject', label: '無法拆除連線',
      desc: '與周邊個體建立了過多連線。強行搬運的話，整個社區會一起震動。', w: { social: 0.8, empathy: 0.6, chat: 1 } },
    { id: 'hollow', name: '空殼型', stamp: 'hire', label: '人力資源部',
      desc: '輕得可疑。內部沒有發現任何會發出噪音的部件。', w: { consc: -1, imag: -0.5, spark: -0.5 }, cond: (f) => (f.raw.conscience < 0.35 ? 0.8 : 0) },
    { id: 'paranoid', name: '疑神疑鬼型', stamp: 'observe', label: '列入觀察名單',
      desc: '已自行推論出 37% 的真相，其餘 63% 為錯誤推論。我們建議不要糾正它。', w: { para: 1.4, insight: 0.3 } },
    { id: 'average', name: '平均值人類', stamp: 'exhibit', label: '比較基準',
      desc: '各項數值都在平均範圍內。適合作為比較基準，放在入口大堂。', special: (f) => (1.15 - f.sd) * 3 },
    { id: 'amphibian', name: '兩棲勞動體', stamp: 'reserve', label: '連同原生環境保存',
      desc: '在水中的表現優於陸上。建議連同它的原生環境一併保存。', w: { swim: 0.8, fit: 0.4, dive: 1 } },
    { id: 'smilefactory', name: '笑容工廠', stamp: 'hire', label: '接待部',
      desc: '能在 0.07 秒內產生笑容，與內心狀態完全無關。這正是我們需要的。', w: { rhythm: 0.6, social: 0.4, empathy: -0.5, smile: 1 } },
    { id: 'overloaded', name: '良知過載型', stamp: 'reject', label: '重量超標',
      desc: '內含大量未處理的愧疚。接入神經網絡會導致全區梯度爆炸。', w: { soul: 1.2, consc: 0.8 } },
    { id: 'confessor', name: '懺悔機', stamp: 'unknown', label: '功能不明',
      desc: '持續把錯誤轉化成作品。我們無法判斷這是缺陷還是功能。', w: { confess: 1, consc: 0.3, works: 0.4 } },
    { id: 'snitch', name: '告密者', stamp: 'hire', label: '但不予信任',
      desc: '曾主動提供同類的資料。效率很高，但我們會把它的座位安排在角落。', w: { obey: 0.3 }, cond: (f) => (f.raw.snitched ? 2.5 : -5) },
    { id: 'nightwatch', name: '守夜人', stamp: 'reject', label: '過度照顧',
      desc: '會照顧身邊所有人，包括我們的競爭對手。風險過高。', w: { empathy: 0.8, calm: 0.4, volunteer: 1.2 } },
    { id: 'datacleaner', name: '數據清潔工', stamp: 'hire', label: '品質控制部',
      desc: '能準確分辨真假。可惜它也能分辨我們。', w: { dex: 0.7, insight: 0.8, label: 0.4 } },
    { id: 'fakenews', name: '假新聞工匠', stamp: 'returned', label: '資訊污染',
      desc: '已被自己製造的資訊污染。它現在相信自己寫過的每一個標題。', w: { farm: 1.1, para: 0.5 } },
    { id: 'surgeon', name: '義體縫合師', stamp: 'resell', label: '機械文明有興趣',
      desc: '擅長接駁不屬於自己的部件。其他星系的機械文明願意出高價。', w: { tech: 0.8, calm: 0.4, clinic: 1.1 } },
    { id: 'wanderer', name: '流浪樂章', stamp: 'interesting', label: '',
      desc: '會在沒有報酬的情況下發出有規律的聲波。原因不明，但觀眾人數證實有效。', w: { rhythm: 0.6, craft: 0.3, busk: 1.1 } },
    { id: 'backup', name: '沉默的備份', stamp: 'pool', label: '以防萬一',
      desc: '沒有可提取的內容，但它一直存在。我們把它保存起來，以防萬一。', w: { mean: -1.2, works: -0.8 } },
    { id: 'burnt', name: '燒毀的發光體', stamp: 'damaged', label: '',
      desc: '在最亮的時候損毀。殘骸仍有輕微熱度。', w: {}, cond: (f) => (f.kind === 'death' && f.raw.spark >= 2 ? 3.5 : -9) },
    { id: 'greystandard', name: '灰色標準件', stamp: 'reformat', label: '',
      desc: '已完成自我優化，不再產生任何靈感。和我們辦公室的家具很配。', w: {}, cond: (f) => (f.kind === 'grey' ? 10 : -9) },
    { id: 'refuser', name: '拒絕光束的人', stamp: 'unknown', label: '拒絕錄用',
      desc: '拒絕了錄用。系統沒有為此預留欄位，我們暫時把它歸類為錯誤。', w: {}, cond: (f) => (f.kind === 'guardian' ? 10 : -9) },
    { id: 'perfect', name: '完美員工', stamp: 'hire', label: '模範員工',
      desc: '已被帶走。篩選同類時從不猶豫。我們正在考慮讓它負責篩選你們。', w: {}, cond: (f) => (f.kind === 'agent' && f.raw.conscience < 0.3 ? 10 : -9) },
    { id: 'starving', name: '欠債藝術家', stamp: 'moredata', label: '',
      desc: '在沒有能量攝入的情況下仍然持續創作。這違反了我們已知的所有物理定律。', w: { craft: 0.4, hunger: 0.9, works: 0.4 } },
    { id: 'archaeologist', name: '浮城考古學家', stamp: 'exhibit', label: '連同收藏品',
      desc: '從淹沒的城市帶回大量沒有市場價值的物件，並為它們逐一命名。', w: { relics: 0.9, dive: 0.6, insight: 0.3 } },
    { id: 'courier', name: '外送永動機', stamp: 'hire', label: '物流部',
      desc: '在惡劣天氣下的準時率高達 94%。我們不明白它為甚麼還要說「謝謝」。', w: { delivery: 1.1, fit: 0.5 } },
    { id: 'skeptic', name: '聰明的懷疑者', stamp: 'reject', label: '知道太多',
      desc: '它知道得太多，而且不太聽話。這兩點加起來，就是我們最不想要的員工。', w: { insight: 0.9, obey: -0.9 } },
    { id: 'sleepwalker', name: '順從的夢遊者', stamp: 'training', label: '可塑性極高',
      desc: '想像力豐富，但完全聽從指示。只需要一點時間，它就會變成我們。', special: (f) => Math.min(f.obey, f.imag) * 2.2 },
    { id: 'prototype', name: '高敏感度原型機', stamp: 'hire', label: '研發部，須加裝外殼',
      desc: '對外界刺激的反應極度靈敏。不加裝外殼的話，會被我們的辦公室傷害。', w: { empathy: 0.6, imag: 0.6, consc: 0.6 } },
    { id: 'survivor', name: '生存專家', stamp: 'reserve', label: '',
      desc: '在惡劣環境中表現出色，但沒有任何靈感產出。它只是活了下來。', w: { fit: 0.6, calm: 0.6, works: -0.7 } },
    { id: 'speculator', name: '投機者', stamp: 'resell', label: '已有買家詢價',
      desc: '懂得把一切換成貨幣，包括它自己。', w: { cr: 0.8, sins: 0.8 } },
    { id: 'unclassifiable', name: '無法分類', stamp: 'unclass', label: '建議拆解研究',
      desc: '數值分佈不符合任何已知的人類模組。我們建議把它拆開研究。', special: (f) => (f.mean >= 1.9 ? 3.5 : f.sd >= 1.6 ? 1.2 : -2) },
  ];

  // 把局內數據轉成標準化特徵（大約 −2 至 +3）：
  //   - 能力值看「輪廓」：與自己十二項平均相比高多少（15 分 = 1）；mean / sd 才看絕對水平
  //   - 行動看比例：某類行動佔 10% = 0，30% = 2
  //   - 次數一律換算成每日比率，免得 100 天的局數字無限膨脹
  const clip = (v) => Math.max(-2, Math.min(3, v));
  function features(s, kind) {
    const f = { kind, raw: { conscience: s.conscience, spark: s.spark, snitched: !!s.flags.snitched } };
    const vals = D.STAT_KEYS.map((k) => s.attr[k]);
    const m = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((a, b) => a + (b - m) * (b - m), 0) / vals.length);
    D.STAT_KEYS.forEach((k) => { f[k] = clip((s.attr[k] - m) / 15); });
    f.mean = clip((m - 45) / 15);
    f.sd = sd / 15;
    const acts = s.stats.actions || {};
    const total = Math.max(1, Object.values(acts).reduce((a, b) => a + b, 0));
    ['label', 'smile', 'dive', 'delivery', 'farm', 'busk', 'clinic', 'chat', 'volunteer'].forEach((k) => {
      const share = ((acts[k] || 0) + (k === 'label' ? acts.ot || 0 : 0)) / total;
      f[k] = clip(Math.max(-1, (share - 0.1) / 0.1));
    });
    const days = Math.max(1, s.day);
    const works = s.works.length;
    f.para = clip((s.paranoia - 40) / 20);
    f.consc = clip((s.conscience - 0.6) / 0.2);
    f.soul = clip((s.soul - 14) / 6);
    f.spark = clip((s.spark - 2.2) / 0.8);
    f.works = clip((works / days - 0.25) / 0.15);
    f.hunger = clip((s.stats.hungryDays / days - 0.05) / 0.05);
    f.sins = clip((s.stats.sins / days - 0.6) / 0.4);
    f.confess = clip(((s.stats.confessions || 0) / Math.max(1, works) - 0.2) / 0.15);
    f.relics = clip((s.stats.relics / days - 0.3) / 0.3);
    f.cr = clip((s.cr - 400) / 400);
    return f;
  }

  function classify(s, kind) {
    const f = features(s, kind);
    const scored = ARCHETYPES.map((a) => {
      let sc = 0;
      if (a.w) Object.keys(a.w).forEach((k) => { sc += a.w[k] * (f[k] || 0); });
      if (a.special) sc += a.special(f);
      if (a.cond) sc += a.cond(f);
      return { a, sc };
    }).sort((x, y) => y.sc - x.sc);
    return { archetype: scored[0].a, runnerUp: scored[1].a, features: f };
  }

  // ---------- 觀察筆記 ----------
  // 每條筆記：p = 重要程度（越高越先列出），t = 內容；返回 null 代表不適用
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  function notes(s, kind, f) {
    const st = s.stats;
    const acts = st.actions || {};
    const alive = s.npcs.filter((n) => !n.alive).length;
    const list = [
      st.labels > 0 && { p: st.labels / 300, t: '為地球的 AI 貢獻了 ' + fmt(st.labels) + ' 筆訓練數據。我們代表那個 AI 表示感謝。' },
      st.perfects > 10 && { p: st.perfects / 60, t: '能在 0.07 秒內產生笑容，一共 ' + fmt(st.perfects) + ' 次。' },
      st.dives > 0 && { p: st.dives / 8, t: st.dives + ' 次潛入被淹沒的舊城，帶回 ' + st.relics + ' 件沒有市場價值的物件。' },
      st.fish > 0 && { p: st.fish / 30, t: '捕獲了 ' + st.fish + ' 條魚，並把其中一些吃掉了。' },
      st.deliveries > 0 && { p: st.deliveries / 25, t: '完成了 ' + st.deliveries + ' 次外送，準時率 ' + Math.round(100 * (1 - (st.lateDeliveries || 0) / Math.max(1, st.deliveries))) + '%。' },
      st.headlines > 0 && { p: st.headlines / 20, t: '製造了 ' + st.headlines + ' 則標題，總轉發量 ' + fmt(st.shares || 0) + '。它現在相信其中 ' + Math.min(99, Math.round(s.paranoia)) + '% 是真的。' },
      st.buskNotes > 0 && { p: st.buskNotes / 80, t: '在街頭發出了 ' + st.buskNotes + ' 次有規律的聲波，最多吸引 ' + (st.crowdMax || 0) + ' 名觀眾。' },
      st.patients > 0 && { p: st.patients / 20, t: '接駁了 ' + st.patients + ' 名同類的義體，其中 ' + (st.illegal || 0) + ' 件未經登記。' },
      st.chats > 5 && { p: st.chats / 15, t: '平均每 ' + Math.max(1, Math.round(s.day / st.chats)) + ' 天與同類交換一次沒有實際用途的資訊。' },
      st.volunteer > 0 && { p: st.volunteer / 6, t: st.volunteer + ' 次無償提供勞動力。動機不明。' },
      st.hungryDays > 2 && { p: st.hungryDays / 6, t: '曾 ' + st.hungryDays + ' 次在沒有能量攝入的情況下繼續運作。' },
      st.sins > 3 && { p: st.sins / 15, t: '道德模組曾出現 ' + st.sins + ' 次妥協，每次都附有合理化紀錄。' },
      st.atones > 3 && { p: st.atones / 12, t: '曾 ' + st.atones + ' 次嘗試修正道德模組。部分成功。' },
      (st.confessions || 0) > 0 && { p: st.confessions / 3, t: '把 ' + st.confessions + ' 件錯事寫進了作品。作品因此變重，樣本因此變輕。' },
      s.works.length > 0 && { p: s.works.length / 15, t: '產出了 ' + s.works.length + ' 件作品，其中 ' + s.works.filter((w) => /與|無題/.test(w.name)).length + ' 件無法被我們的模型命名。' },
      st.bestWork && { p: 0.9, t: '最佳作品《' + st.bestWork.name + '》，評分 ' + fmt(st.bestWork.raw) + '。我們把它掛在走廊。' },
      s.spark >= 3 && { p: 1, t: '亮度：可在三光年外觀測。' },
      s.spark < 1 && { p: 1, t: '亮度：需要放大鏡。' },
      { p: s.soul > D.SOUL_LIMIT ? 2 : 0.6, t: '靈魂重量 ' + s.soul.toFixed(1) + ' 克。' + (s.soul > D.SOUL_LIMIT ? '超出光束負載 ' + (s.soul - D.SOUL_LIMIT).toFixed(1) + ' 克。' : s.soul <= 5 ? '輕得可以飄起來。' : '在可接受範圍內。') },
      s.conscience < 0.3 && { p: 1.4, t: '良知殘餘 ' + Math.round(s.conscience * 100) + '%。運作非常安靜。' },
      s.conscience >= 0.85 && { p: 0.8, t: '良知仍有 ' + Math.round(s.conscience * 100) + '%，會發出持續的低頻噪音。' },
      s.paranoia >= 60 && { p: 1.5, t: '曾懷疑我們的存在。它是對的。' },
      s.flags.snitched && { p: 2, t: '曾提供同類名單一份。名單上的人已經處理完畢。' },
      alive > 0 && { p: alive / 3, t: '認識的 ' + alive + ' 名創作人已被我們帶走。它似乎很在意。' },
      s.cr >= 600 && { p: s.cr / 800, t: '持有 ' + fmt(s.cr) + ' 信用點。我們不明白它打算甚麼時候使用。' },
      { p: 0.3, t: '平台評分 ' + s.rating.toFixed(1) + ' 星。地球人似乎很在乎這個數字。' },
      kind === 'guardian' && { p: 3, t: '拒絕了光束。這是我們第一次被拒絕，正在檢討流程。' },
      kind === 'death' && { p: 3, t: '於第 ' + s.day + ' 天損毀。損毀原因：身體耗盡。' },
      kind === 'grey' && { p: 3, t: '已連續多天沒有產生火花，但仍然準時上班。' },
      kind === 'heavy' && { p: 3, t: '光束嘗試拉起它三次，都失敗了。' },
      { p: 0.4, t: s.floor ? '最後居住於 ' + s.floor + ' 樓，當時水位 ' + s.water.toFixed(1) + ' 樓。' : '最後居住於天橋下。' },
      s.auto >= 40 && { p: s.auto / 80, t: '全城自動化 ' + Math.round(s.auto) + '%，其中一部分是它親手完成的。' },
      st.lastReact && { p: 1.1, t: '夢境面試官的最後評語：「' + st.lastReact + '」' },
    ].filter(Boolean);
    return list.sort((a, b) => b.p - a.p).slice(0, 6).map((n) => n.t);
  }

  // ---------- 印章 ----------
  function stamps(s, kind, a) {
    const out = [{ id: a.stamp, label: a.label }];
    const add = (id, label) => { if (out.length < 3 && !out.some((x) => x.id === id)) out.push({ id, label: label || '' }); };
    const taken = kind === 'agent' || kind === 'returned';
    if (kind === 'death') add('damaged');
    if (kind === 'grey') add('reformat');
    if (s.soul > D.SOUL_LIMIT) add('overweight');
    if (taken && (STAMPS[a.stamp].tone === 'reject' || a.stamp === 'returned')) add('mistake');
    if (kind === 'returned') add('returned', '已遣返');
    if (s.spark >= 3 && s.conscience < 0.4) add('energy');
    if (s.spark >= 3.2) add('interesting');
    if (s.paranoia >= 70) add('observe');
    if (s.day < 30) add('moredata');
    if (kind === 'guardian') add('unknown');
    if (s.stats.volunteer >= 8 && a.stamp !== 'mascot') add('mascot', '社區吉祥物');
    return out;
  }

  const STATUS = {
    agent: '已被帶走，現任星際人才發展局員工',
    returned: '曾被帶走，已遣返地球',
    guardian: '拒絕光束，留在浮城',
    heavy: '光束拉不動，留在浮城',
    ordinary: '未被選中，仍在浮城',
    death: '已損毀',
    grey: '已灰化，仍在運作',
  };

  function evaluate(s, kind) {
    const c = classify(s, kind);
    return {
      sampleId: 'EARTH-' + String(Math.abs(s.seed) % 100000).padStart(5, '0'),
      kind, status: STATUS[kind] || '',
      archetype: c.archetype, runnerUp: c.runnerUp,
      notes: notes(s, kind, c.features),
      stamps: stamps(s, kind, c.archetype),
      attr: Object.assign({}, s.attr), days: s.day,
    };
  }

  IE.Dossier = { STAMPS, ARCHETYPES, STATUS, evaluate, classify, features };
});
