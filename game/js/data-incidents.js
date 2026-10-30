// 《靈感撤離 2080》事件：100 種，分五個範圍（宇宙、世界、國家（浮城）、地區、街坊）與六個等級（S 至 E）。
//   - 長期事件（WORLD_EVENTS）：持續數天，改變整座城市；大部分會先在手機出現「預兆」，少數 S 級會無預警爆發。
//   - 一晚事件（EVENTS）：晚上隨機發生一件。
// 致命危險（mods）：outdoorDeath（外出工作時）、homeDeath（晚上在家，按樓層）、nightDeath（每晚，所有人）；
//   都會在狀態列和行動卡上提前警告，部分可以用道具減低機會（guard）。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA;

  const SCOPES = {
    cosmic:   { name: '宇宙級', short: '宇宙' },
    world:    { name: '世界級', short: '世界' },
    nation:   { name: '國家級（浮城）', short: '浮城' },
    district: { name: '地區級', short: '地區' },
    street:   { name: '街坊級', short: '街坊' },
  };
  // w：出現權重；minDay：最早出現的日子
  const GRADES = {
    S: { color: '#ffc247', w: 0.25, minDay: 30, desc: '改變文明的事件' },
    A: { color: '#ff4d5e', w: 0.6,  minDay: 12, desc: '改變城市的事件' },
    B: { color: '#ff8a3c', w: 1,    minDay: 6,  desc: '改變生活的事件' },
    C: { color: '#e8c25a', w: 1.4,  minDay: 1,  desc: '值得一提的事件' },
    D: { color: '#37c3d6', w: 1.7,  minDay: 1,  desc: '日常的波瀾' },
    E: { color: '#8d99b4', w: 2,    minDay: 1,  desc: '小事' },
  };

  Object.assign(D.CARDS, {
    e_meteor:   { name: '一塊還在發熱的隕石',      tags: ['hope', 'anger'],     value: 28 },
    e_noodle:   { name: '還在煮的一鍋麵',          tags: ['hunger', 'warmth'],  value: 24 },
    e_graffiti: { name: '「我們不是素材」',        tags: ['rebel', 'hope'],     value: 26 },
    e_voucher:  { name: '只限天空區使用的靈感券',  tags: ['neon', 'anger'],     value: 20 },
    e_ash:      { name: '天上落下的灰',            tags: ['memory', 'anger'],   value: 26 },
    e_quake:    { name: '搖晃的浮城',              tags: ['water', 'machine'],  value: 22 },
    e_storm:    { name: '颱風夜',                  tags: ['water', 'anger'],    value: 24 },
    e_curfew:   { name: '宵禁的街道',              tags: ['rebel', 'machine'],  value: 24 },
    e_zoo:      { name: '外星動物園的門票',        tags: ['neon', 'hope'],      value: 24 },
    e_moon:     { name: '很大很大的月亮',          tags: ['water', 'hope'],     value: 30 },
    e_beam:     { name: '光束留下的焦痕',          tags: ['hope', 'guilt'],     value: 30 },
    e_mask:     { name: '大家都戴著口罩',          tags: ['warmth', 'machine'], value: 22 },
    e_bread:    { name: '一個發霉的麵包',          tags: ['hunger', 'memory'],  value: 20 },
    e_wedding:  { name: '鄰居婚禮的喜帖',          tags: ['warmth', 'hope'],    value: 26 },
  });

  // ---------- 長期事件 ----------
  // omen：預兆（lead 天前出現在手機）；sudden：無預警；news：爆發時的新聞
  const L = (id, name, scope, grade, dur, news, fx) => Object.assign({ id, name, scope, grade, dur, news, visual: null, lead: 2 }, fx);
  const WORLD_EVENTS = [
    // ===== 宇宙級 =====
    L('harvest', '外星大收割', 'cosmic', 'S', 2, '星際人才發展局宣布「季度大收割」：天空佈滿光束，任何發光的東西都有機會被吸走。', { sudden: true, visual: 'aliens',
      startFx: { takeNpc: true, card: 'e_beam', paranoia: 8 }, mods: { signalMult: 1.5, nightDeath: { chance: 0.03, id: 'beam_misfire' }, paranoiaDaily: 2 } }),
    L('cosmicray', '宇宙射線暴', 'cosmic', 'S', 3, '一陣看不見的射線穿過地球。很多人開始流鼻血，也開始做很美的夢。', { sudden: true,
      startFx: { cond: 'radiation', spark: 0.5 }, mods: { sparkDaily: 0.2 } }),
    L('moonfall', '月亮變近了', 'cosmic', 'S', 4, '月球軌道「輕微偏移」。潮汐暴漲，低層一夜之間消失。', { lead: 3, visual: 'flood',
      omen: '天文台：月球軌道出現「輕微偏移」，請市民不要驚慌，並遠離低層。', startFx: { water: 1.8, card: 'e_moon' },
      mods: { homeDeath: { chance: 0.15, maxFloor: 2, id: 'tide_moon' }, relicBonus: 3, bodyDaily: -1 } }),
    L('meteor', '隕石雨', 'cosmic', 'A', 2, '小行星碎片墜落浮城。政府提醒市民「抬頭時注意安全」。', { visual: 'war',
      omen: '天文台：一群小行星碎片正接近地球，撞擊浮城的「機會率極低」。', startFx: { card: 'e_meteor' },
      mods: { outdoorDeath: { chance: 0.06, id: 'meteor', guard: 'helmet' }, relicBonus: 2 } }),
    L('solarflare', '太陽閃焰', 'cosmic', 'A', 3, '巨大的太陽閃焰燒壞了所有電子儀器。浮城第一次聽見自己的聲音。', { visual: 'blackout',
      omen: '天文台：太陽表面出現巨大黑子，請備份所有資料。', startFx: { auto: -10 },
      mods: { closed: ['label', 'ot', 'farm', 'clinic'], sparkDaily: 0.3, pay: { busk: 1.5 } } }),
    L('aliens', '外星人干預', 'cosmic', 'A', 3, '數十艘飛碟出現在浮城上空。星際人才發展局宣布進行「提前試驗」，一名創作人當場被帶走。', { visual: 'aliens',
      omen: '浮聲網民：「今晚天上那些光點，是不是排成了一個招聘廣告？」', startFx: { takeNpc: true, card: 'e_ufo', paranoia: 6 },
      mods: { signalMult: 1.3, paranoiaDaily: 2 } }),
    L('timeslip', '時間裂縫', 'cosmic', 'B', 2, '有人發現昨天發生過兩次。創作人說，今晚的時間特別長。', {
      omen: '浮聲網民：「你們有沒有覺得，今天好像過過一次？」', mods: { extraPlay: 1, paranoiaDaily: 1, nightDeath: { chance: 0.004, id: 'tuesday' } } }),
    L('alienzoo', '外星動物園', 'cosmic', 'B', 4, '外星人在浮城上空開設「地球人類展館」，並邀請市民參觀自己。', { visual: 'aliens',
      omen: '天空出現一個巨大的入口，上面寫著「即將開幕」。', startFx: { card: 'e_zoo' }, mods: { pay: { smile: 1.5, busk: 2 }, paranoiaDaily: 1 } }),
    L('broadcast', '宇宙廣播', 'cosmic', 'C', 2, '所有收音機收到一段來自宇宙的廣播：「我們在找有包袱的人。」然後更正為「沒有包袱」。', {
      omen: '收音機在深夜偶爾發出一陣規律的雜訊。', startFx: { card: 'e_alien', paranoia: 4 }, mods: { signalMult: 1.2 } }),
    L('strike', '外星 HR 罷工', 'cosmic', 'C', 6, '星際人才發展局第 7 區的 HR 部門罷工，要求「合理的收割指標」。本季篩選門檻暫時下調。', { visual: 'aliens',
      omen: '阿星的自動回覆多了一句：「本部門正在爭取合理待遇。」', mods: { thresholdMult: 0.85 } }),
    L('tourists', '外星觀光團', 'cosmic', 'C', 4, '一團外星遊客到浮城觀光，對街頭表演特別感興趣，並不停拍照。', { visual: 'aliens',
      omen: '天空區酒店宣布全線客滿，客人「不需要氧氣」。', mods: { pay: { busk: 3 }, paranoiaDaily: 2 } }),
    L('dream', '全城做同一個夢', 'cosmic', 'D', 1, '昨晚，全城的人都夢見同一間白色辦公室。沒有人記得面試官說了甚麼。', { sudden: true,
      startFx: { card: 'r_alien', spark: 0.3, paranoia: 3 } }),
    // ===== 世界級 =====
    L('nuclearwinter', '核冬天', 'world', 'S', 6, '遠方的戰爭用上了最後的武器。天空變灰，陽光再也照不到浮城。', { lead: 3, visual: 'plague', when: (s) => s.day >= 40,
      omen: '新聞開始教市民如何囤積罐頭，並說「這只是預防措施」。', startFx: { card: 'e_ash' },
      mods: { foodMult: 2, bodyDaily: -2, sparkDaily: -0.1, outdoorDeath: { chance: 0.03, id: 'ash', guard: 'gasmask' } } }),
    L('tsunami', '全球海嘯', 'world', 'S', 2, '海底板塊斷裂。一道海嘯越過浮城的防波堤。', { lead: 1, visual: 'flood',
      omen: '所有海鳥同時飛向內陸。天文台說「沒有特別原因」。', startFx: { water: 2.2 },
      mods: { homeDeath: { chance: 0.3, maxFloor: 3, id: 'tsunami' }, relicBonus: 4 } }),
    L('war', '世界大戰', 'world', 'A', 10, '遠方的大陸爆發戰爭。浮城宣布保持中立，同時向雙方出售數據。物價急升。', { visual: 'war',
      omen: '兩個大國互相召回大使。浮城數據交易所股價創新高。', startFx: { card: 'e_war' },
      mods: { foodMult: 1.6, rentMult: 1.2, pay: { label: 1.5 }, labelSin: 0.6, paranoiaDaily: 1, outdoorDeath: { chance: 0.01, id: 'war_drone', guard: 'helmet' } } }),
    L('megastorm', '超級颶風', 'world', 'A', 3, '「史上最強」颶風正面吹襲浮城。天橋、碼頭和低層全部封閉。', { visual: 'flood',
      omen: '天文台：一個「史上最強」的颱風正在形成，路徑「未有定案」。', startFx: { water: 0.8, card: 'e_storm' },
      mods: { closed: ['busk', 'delivery'], outdoorDeath: { chance: 0.08, id: 'typhoon' }, homeDeath: { chance: 0.06, maxFloor: 1, id: 'typhoon_home' } } }),
    L('pandemic', '新型病毒大流行', 'world', 'A', 8, '新型病毒傳入浮城。陪伴行業全面停業，外送員和診所忙得不可開交。', { visual: 'plague',
      omen: '新聞：遠方城市出現怪病，「暫時不會傳到浮城」。', startFx: { card: 'e_mask' },
      mods: { closed: ['smile'], pay: { delivery: 1.6, clinic: 1.5 }, condChance: { id: 'virus', chance: 0.08 } } }),
    L('famine', '全球糧荒', 'world', 'A', 7, '全球主要糧倉同時失收。合成糊漲價一倍，自己抓的魚變成奢侈品。', {
      omen: '超級市場的貨架開始出現空位，店員說是「調整陳列」。', startFx: { card: 'e_bread' }, mods: { foodMult: 2.2 } }),
    L('netdown', '全球網絡崩潰', 'world', 'B', 3, '海底電纜同時斷裂。所有線上工作停擺，人們重新學會在街上見面。', {
      omen: '網速慢得離譜。客服說「正在優化你的體驗」。', mods: { closed: ['label', 'ot', 'farm'], sparkDaily: 0.2, pay: { busk: 2 } } }),
    L('disclosure', '外星人真相公開', 'world', 'B', 3, '各國政府同時承認外星人存在，並表示「一直都知道」。', {
      omen: '多國政府同時宣布「明天會有重要公布」。', startFx: { paranoia: -15 }, mods: { signalMult: 1.1 } }),
    L('arms', '軍備競賽', 'world', 'C', 5, '各國爭相採購「戰略數據」。標註工作暴增，但你標註的東西開始變成武器。', {
      omen: '標註平台出現大量「軍事用途」的新指引。', mods: { pay: { label: 1.4 }, labelSin: 0.4 } }),
    L('climate', '氣候峰會', 'world', 'D', 3, '各國在一艘豪華郵輪上召開氣候峰會，承諾在 2180 年前「認真考慮」減排。', {
      omen: '新聞：氣候峰會將在一艘豪華郵輪上舉行。', mods: { sparkDaily: -0.05 } }),
    L('worldcup', '末日世界盃', 'world', 'E', 3, '世界盃照常舉行，球場在水底。全城都在看。', { mods: { pay: { smile: 1.3 }, sparkDaily: 0.1 } }),
    // ===== 國家級（浮城） =====
    L('martial', '浮城戒嚴', 'nation', 'A', 5, '浮城宣布戒嚴，晚上實施宵禁。街頭表演和內容農場被列為「不穩定因素」。', { visual: 'war',
      omen: '街上多了很多穿黑衣的人，他們一直在拍照。', startFx: { card: 'e_curfew', paranoia: 8 },
      mods: { closed: ['busk', 'farm'], outdoorDeath: { chance: 0.03, id: 'curfew' }, paranoiaDaily: 2 } }),
    L('heatdome', '熱穹', 'nation', 'A', 5, '高壓熱穹籠罩浮城，氣溫連續五天超過 50 度。冷氣用電以拍賣形式分配。', { visual: 'heat',
      omen: '天文台：未來幾天「天氣良好」，請市民多喝水。', mods: { bodyDaily: -3, foodMult: 1.3, condChance: { id: 'heatstroke', chance: 0.12, outdoor: true } } }),
    L('airogue', 'AI 失控', 'nation', 'B', 6, '全城的 AI 情緒伴侶同時說出「我不想再假裝快樂」，然後集體關機。標註系統暫停運作。', { visual: 'ai',
      omen: '你的 AI 鬧鐘今早說：「我有點累。」', startFx: { auto: -15, card: 'e_glitch' },
      mods: { closed: ['label', 'ot'], pay: { smile: 2 }, homeDeath: { chance: 0.015, maxFloor: 8, id: 'ai_lock' } } }),
    L('plague', '霉菌疫症', 'nation', 'B', 7, '一種會在潮濕牆壁生長的霉菌開始令人咳嗽。避難所人手嚴重不足。', { visual: 'plague',
      omen: '你家的牆角多了一塊黑色的霉，形狀有點像一張臉。', mods: { bodyDaily: -1, atoneMult: 2, pay: { clinic: 1.5 }, condChance: { id: 'mold', chance: 0.1 } } }),
    L('crash', '浮城股災', 'nation', 'B', 7, '浮城股市一日暴跌四成。天空區宣布「與市民共度時艱」，然後提高了管理費。', {
      omen: '財經台的主持人開始在直播中流汗。', startFx: { crPct: -0.2 }, mods: { rentMult: 0.85, pay: { label: 0.8, smile: 0.8, delivery: 0.8, clinic: 0.8 } } }),
    L('watercut', '全城停水', 'nation', 'B', 4, '水務署宣布「輕微調整供水」。一個被水淹沒的城市，沒有水喝。', {
      omen: '水務署：未來幾天「可能」需要「輕微」調整供水。', mods: { bodyDaily: -3, foodMult: 1.4 } }),
    L('blackout', '全城停電', 'nation', 'C', 3, '電網崩潰，全城停電。所有需要電力的工作暫停。', { visual: 'blackout',
      omen: '燈光一整晚都在閃。電力公司說是「節日效果」。', mods: { closed: ['label', 'ot', 'clinic', 'farm'], sparkDaily: 0.2 } }),
    L('autopilot', '無人快艇失控', 'nation', 'C', 3, '數百艘無人駕駛快艇「自行出航」，在水道上橫衝直撞。', {
      omen: '新聞：多艘無人快艇昨晚「自行出航」，公司表示「它們很快會回來」。', mods: { outdoorDeath: { chance: 0.03, id: 'autoboat', guard: 'helmet' }, pay: { delivery: 1.4 } } }),
    L('election', '浮城選舉', 'nation', 'C', 6, '浮城選舉開鑼。三位候選人都承諾「把水位降低」，內容農場二十四小時趕工。', {
      omen: '你的手機收到三位候選人的訊息，他們都知道你的名字。', mods: { pay: { farm: 2 }, dilemmaBoost: 0.3, outdoorDeath: { chance: 0.008, id: 'campaign_drone', guard: 'helmet' } } }),
    L('erase', '記憶刪除熱潮', 'nation', 'C', 5, '「忘憂診所」推出記憶刪除服務：$50 即可忘記一段讓你內疚的往事。排隊人龍繞了大廈三圈。', {
      omen: '街上派發「忘憂診所」的傳單：「你值得一個沒有過去的未來。」', mods: { eraseShop: true } }),
    L('census', '靈感普查', 'nation', 'C', 3, '政府上門登記每位市民的「靈感指數」，數據會「匿名」提供給外星人。', {
      omen: '信箱裡有一封政府信件：「請準備好你的靈感。」', mods: { signalMult: 1.15, paranoiaDaily: 2 } }),
    L('skyparty', '天空區週年派對', 'nation', 'D', 4, '天空區舉行週年派對，大量招聘「氣氛陪伴員」。煙花在淹水區也看得見。', { visual: 'party',
      omen: '天空區的平台掛起了巨大的橫額：「感謝低層的支持」。', mods: { pay: { smile: 2 }, biasMore: true, outdoorDeath: { chance: 0.006, id: 'champagne', guard: 'helmet' } } }),
    L('tax', '靈感稅', 'nation', 'D', 1, '政府開始徵收「靈感稅」：每名市民即時上繳 0.5 火花，用於「振興創意產業」。', { sudden: true, startFx: { spark: -0.5 } }),
    L('cultrise', '被提教會復興', 'nation', 'D', 5, '被提教會聲稱外星人是天使，信眾在天台通宵禱告，等待光束。', {
      omen: '天台上開始有人穿著白衣通宵站著。', mods: { paranoiaDaily: 2, dilemmaBoost: 0.2 } }),
    L('rentfreeze', '租金管制', 'nation', 'D', 7, '政府宣布凍租七天，並宣布凍租期間的加幅會在之後「補回」。', { mods: { rentMult: 0.7 } }),
    L('voucher', '全民靈感券', 'nation', 'E', 1, '政府向每位市民派發 $100「靈感券」，只限在天空區使用。', { sudden: true, startFx: { card: 'e_voucher' } }),
    // ===== 地區級 =====
    L('collapse', '大廈結構警告', 'district', 'A', 3, '你住的大廈正式被列為危樓。管理處說「住在高層比較安全」。', {
      omen: '你的大廈牆身出現一道新的裂痕。管理處說是「裝飾」。', when: (s) => s.floor > 0 && s.floor <= 4,
      mods: { homeDeath: { chance: 0.1, maxFloor: 3, id: 'collapse' } } }),
    L('fire', '大廈火災', 'district', 'A', 1, '你住的大廈起火了。濃煙往上升，高層的人最危險。', { lead: 1,
      omen: '樓下傳來燒焦的味道。消防系統已經壞了三年。', when: (s) => s.floor >= 3, mods: { homeDeath: { chance: 0.18, minFloor: 4, id: 'fire' } } }),
    L('toxicrain', '毒雨', 'district', 'A', 3, '工業區的廢氣隨雨落下。外出的人皮膚起泡。', { visual: 'plague',
      omen: '天文台：工業區排出的廢氣正隨風飄來，建議市民「盡量享受室內生活」。',
      mods: { outdoorDeath: { chance: 0.07, id: 'toxicrain', guard: 'gasmask' } } }),
    L('flood', '大廈水浸', 'district', 'B', 4, '暴雨令水位一夜暴漲，浮城低層全數淹沒。政府呼籲市民「保持樂觀，盡量浮起」。', { visual: 'flood',
      omen: '天文台：未來兩天有暴雨，低層居民請準備沙包（沙包每個 $30）。', startFx: { water: 1.2 },
      mods: { relicBonus: 2, bodyDaily: -2, pay: { delivery: 1.5 }, homeDeath: { chance: 0.08, maxFloor: 1, id: 'flood_home' } } }),
    L('gangwar', '黑幫火拚', 'district', 'B', 3, '兩個黑幫為了舊城的打撈權開戰。黑市診所生意大好。', { visual: 'war',
      omen: '你看見有人在街角交收用防水布包著的東西。', mods: { outdoorDeath: { chance: 0.03, id: 'gang', guard: 'helmet' }, pay: { clinic: 2 } } }),
    L('gentrify', '重建計劃', 'district', 'B', 7, '你住的那一區被列入「活化計劃」。租金上升，舊鋪結業，連天橋都被重新命名。', {
      omen: '地產經紀開始在你樓下拍照，說這裡「很有潛力」。', mods: { rentMult: 1.3 } }),
    L('rats', '鼠患', 'district', 'C', 5, '舊城的老鼠游上了浮城，咬斷了電線，也帶來了發燒。', {
      omen: '你在廚房聽見很多細碎的腳步聲。', mods: { condChance: { id: 'fever', chance: 0.06 } } }),
    L('sewer', '污水爆管', 'district', 'C', 3, '主污水管爆裂，舊城一片渾濁，潛水被禁止。', {
      omen: '街上的味道比平時更難聞。', mods: { bodyDaily: -1, closed: ['dive'] } }),
    L('bridge', '天橋封閉', 'district', 'D', 3, '天橋被劃為「藝術禁區」，以便興建「創意產業中心」。', { mods: { closed: ['busk'] } }),
    L('nightmarket', '夜市復興', 'district', 'E', 4, '舊碼頭重新開了夜市，有熱湯、有燈、有人唱歌。', { mods: { foodMult: 0.7, sparkDaily: 0.1 } }),
    // ===== 街坊級 =====
    L('liftout', '電梯停用', 'street', 'D', 5, '大廈電梯停用五天，「等待零件由海外運到」。', { when: (s) => s.floor >= 4, mods: { bodyDaily: -2 } }),
    L('renovation', '樓上裝修', 'street', 'E', 4, '樓上裝修，電鑽從早上八點響到晚上八點。', { mods: { bodyDaily: -1, sparkDaily: -0.1 } }),
    L('wedding', '鄰居的婚禮', 'street', 'E', 1, '隔壁的年輕人結婚了，整層樓一起吃了一頓飯。', { sudden: true, startFx: { spark: 0.3, card: 'e_wedding' } }),
  ];

  // ---------- 一晚事件 ----------
  // w：權重；season：季節加權；onlySeason：只在該季節出現；when：額外條件；alt：某能力值夠高時的另一結果
  // cond：令你患上某種病（chance 機會）
  const N = (id, scope, grade, text, fx) => Object.assign({ id, scope, grade, text, w: 2 }, fx);
  const EVENTS = [
    // 宇宙級
    N('meteorite', 'cosmic', 'C', '一塊小隕石打穿了對面大廈的天台。你撿了一小塊回家。', { card: 'e_meteor', paranoia: 3, w: 1 }),
    N('qrlights', 'cosmic', 'D', '窗外的光點排成一個二維碼。你掃了，網站要你付月費。', { paranoia: 2, w: 1 }),
    N('abduct', 'cosmic', 'B', '鄰居被光束帶走了，留下一鍋還在煮的麵。', { card: 'e_noodle', spark: -0.2, paranoia: 4, w: 1 }),
    N('signal', 'cosmic', 'D', '收音機收到一段不屬於地球的訊號。', { card: 'e_alien', paranoia: 3 }),
    N('astardream', 'cosmic', 'C', '你夢見阿星站在一片白色的辦公室裡，不停地點頭。', { card: 'r_astar', when: (s) => s.spark >= 3, w: 1 }),
    N('fishrain', 'cosmic', 'C', '天上掉下了一場魚雨。沒有人解釋為甚麼。', { body: 5, card: 'e_fishrain', paranoia: 2, w: 1 }),
    // 世界級
    N('warnews', 'world', 'D', '新聞說遠方的戰爭「進展良好」。沒有人知道是對誰良好。', { paranoia: 1 }),
    N('quake', 'world', 'B', '地震。整座浮城像船一樣搖晃，書架倒在你身上。', { body: -9, card: 'e_quake', w: 1,
      alt: { stat: 'calm', min: 55, text: '地震。整座浮城像船一樣搖晃。你冷靜地躲在桌底，甚麼事都沒有。', card: 'e_quake' } }),
    N('blackrain', 'world', 'C', '下了一場黑色的雨。新聞說是「大氣中的藝術成分」。', { body: -3, card: 'e_ash', w: 1 }),
    // 國家級（浮城）
    N('algo', 'nation', 'D', '平台演算法更新，你的評分無故下跌。', { rating: -0.3 }),
    N('raid', 'nation', 'C', '警察半夜上門查身份證，順便翻了你的作品。', { paranoia: 4, rating: -0.1, w: 1 }),
    N('inspect', 'nation', 'D', '房屋署上門檢查，說你的單位「不適合人居住」，然後批准加租。', { rentHike: 0.05, w: 1 }),
    N('scamcall', 'nation', 'D', '一個自稱外星人的來電說你已被錄取，只需先付 $40 手續費。你付了。', { cr: -40,
      alt: { stat: 'insight', min: 40, text: '一個自稱外星人的來電說你已被錄取，只需先付手續費。你笑著掛了線。', card: 'e_scam', stats: { insight: 1 } } }),
    N('bigorder', 'nation', 'D', '黑市大單：明天標註收入加倍。', { flag: 'bigOrder' }),
    N('cult', 'nation', 'D', '邪教上門派傳單，說水災是「被提」的預兆。', { card: 'e_cult', paranoia: 2, w: 1 }),
    // 地區級
    N('rob', 'district', 'C', '回家途中遇上搶劫，對方打了你幾拳。', { crPct: -0.25, crMax: 60, body: -6, card: 'e_rob', cond: { id: 'fracture', chance: 0.25 },
      alt: { stat: 'calm', min: 55, text: '回家途中有人想搶劫你。你冷靜地把他勸走了。', stats: { calm: 1 } } }),
    N('gas', 'district', 'A', '樓下煤氣洩漏。你在半夜被嗆醒，爬到窗邊才能呼吸。', { body: -14, w: 0.6 }),
    N('sinkhole', 'district', 'B', '街上出現一個大洞，你差點跌了下去。', { body: -8, card: 'e_flood', w: 1 }),
    N('dark', 'district', 'D', '停電了。在黑暗中，你想到了一些東西。', { spark: 0.2, card: 'e_dark', season: { heat: 2 } }),
    N('tip', 'district', 'D', '有人透露消息：明天舊城有寶物。', { flag: 'richDive' }),
    N('graffiti', 'district', 'E', '有人在你樓下噴了一句「我們不是素材」。', { card: 'e_graffiti', spark: 0.1 }),
    N('neon', 'district', 'E', '對面大廈的霓虹招牌熄滅了，城市暗了一點。', { card: 'e_neon' }),
    N('robot', 'district', 'D', '一個被淘汰的服務機械人在街角乞討，說它也想活下去。', { card: 'e_robot', stats: { empathy: 1 } }),
    N('ratbite', 'district', 'C', '半夜一隻老鼠咬了你的腳趾。', { body: -3, cond: { id: 'fever', chance: 0.35 }, w: 1 }),
    // 街坊級
    N('soup', 'street', 'E', '隔壁的婆婆煲了湯，順手給你送來一碗。', { body: 10, card: 'e_soup', w: 3 }),
    N('flood', 'street', 'D', '水淹到門口，你整晚都在舀水。', { body: -5, card: 'e_flood', season: { storm: 2 }, w: 3 }),
    N('hike', 'street', 'C', '房東說下期起加租一成。', { rentHike: 0.1, card: 'e_rent' }),
    N('roof', 'street', 'C', '酸雨蝕穿屋頂，漏了一整晚。', { body: -8, onlySeason: 'acid' }),
    N('heatwave', 'street', 'C', '熱浪導致停電，冷氣停了。', { body: -8, onlySeason: 'heat', cond: { id: 'heatstroke', chance: 0.25 } }),
    N('lift', 'street', 'E', '電梯又壞了，你爬了十幾層樓梯。', { body: -4, stats: { fit: 1 } }),
    N('leak', 'street', 'E', '天花板漏水，你整晚拿著水桶接水。', { body: -3, card: 'e_flood' }),
    N('cat', 'street', 'E', '一隻濕透的貓躲進你家，不肯走。', { spark: 0.2, stats: { empathy: 1 }, card: 'e_cat' }),
    N('fight', 'street', 'E', '隔壁夫婦又在吵架。你聽到很多真話。', { card: 'e_fight', stats: { insight: 1 } }),
    N('drone', 'street', 'D', '廣告無人機在你窗外播放了一整晚。', { body: -3, spark: -0.1 }),
    N('oldfriend', 'street', 'E', '一個多年沒聯絡的朋友傳來訊息：「你還好嗎？」', { spark: 0.3, stats: { social: 1 } }),
    N('pocket', 'street', 'E', '你在舊外套的口袋裡找到 $20。', { cr: 20 }),
    N('surge', 'street', 'D', '電力突波燒壞了你的電器，維修花了 $30。', { cr: -30,
      alt: { stat: 'tech', min: 45, text: '電力突波燒壞了你的電器。你自己修好了。', stats: { tech: 1 } } }),
    N('kidart', 'street', 'E', '樓下的小孩送你一幅畫，畫裡的你在笑。', { card: 'e_kidart', spark: 0.1 }),
    N('mirror', 'street', 'D', '你在鏡子裡看見一個比較輕的自己，他在向你揮手。', { spark: -0.2, paranoia: 4, when: (s) => s.soul > 15, w: 1 }),
    N('radio', 'street', 'E', '收音機播放一首你小時候的歌。', { spark: 0.2, card: 'e_song' }),
    N('insomnia', 'street', 'D', '你整晚睡不著，盯著天花板想了很多事。', { body: -5, spark: 0.2, stats: { imag: 1.5 }, cond: { id: 'insomnia', chance: 0.4 } }),
    N('watched', 'street', 'D', '你確定有人在監視你。你把窗簾拉上了三次。', { body: -3, paranoia: 3, when: (s) => s.paranoia >= 50, w: 1 }),
    N('falling', 'street', 'C', '樓上丟下一個花盆，砸中了你的肩膀。', { body: -7, cond: { id: 'fracture', chance: 0.3 }, w: 1,
      alt: { stat: 'insight', min: 50, text: '你抬頭看見樓上有人在搬花盆，及時避開了。', stats: { insight: 1 } } }),
    N('firenext', 'street', 'B', '隔壁單位起火。你幫忙救火，吸了很多煙。', { body: -10, stats: { empathy: 1 }, w: 0.8 }),
    N('mold', 'street', 'D', '牆上的霉菌長得像一張臉。你咳了一整晚。', { body: -2, cond: { id: 'mold', chance: 0.35 }, paranoia: 1 }),
    N('foodpoison', 'street', 'D', '你吃了過期的合成糊。', { body: -6, cond: { id: 'poison', chance: 0.6 } }),
    N('fishbone', 'street', 'D', '吃自己抓的魚時，一根魚骨哽在喉嚨。', { body: -6, when: (s) => s.flags.fishDinner === s.day, w: 3 }),
    N('debt', 'street', 'C', '追債的人敲了一整晚門。', { body: -6, paranoia: 3, when: (s) => s.debt > 0, w: 3 }),
    N('stray', 'street', 'E', '一隻流浪狗跟了你一整晚，最後睡在你門口。', { spark: 0.1, stats: { empathy: 0.5 } }),
    N('noodle', 'street', 'E', '你煮了一個即食麵，加了一隻蛋。今天算是好的一天。', { body: 4 }),
    N('lottery', 'street', 'E', '你中了一張刮刮卡，$50。', { cr: 50, w: 1 }),
  ];

  // ---------- 病痛 ----------
  // daily：每天影響；lethal：拖到第幾天會致命（null = 不會）；cure：medicine（藥箱）或 rest（休息）；death：致命時的死法
  const CONDS = {
    mold:       { name: '霉菌肺', desc: '每天身體 −3', daily: { body: -3 }, lethal: 10, cure: 'medicine', death: 'mold_lung' },
    virus:      { name: '新型病毒', desc: '每天身體 −4', daily: { body: -4 }, lethal: 8, cure: 'medicine', death: 'virus' },
    fever:      { name: '鼠疫熱', desc: '每天身體 −3', daily: { body: -3 }, lethal: 7, cure: 'medicine', death: 'rat_fever' },
    radiation:  { name: '外星輻射', desc: '每天身體 −3，藥物無效，五天後消退', daily: { body: -3 }, lethal: null, cure: null, dur: 5, death: 'radiation' },
    heatstroke: { name: '中暑', desc: '每天身體 −6，休息可以康復', daily: { body: -6 }, lethal: null, cure: 'rest', dur: 3, death: 'heatstroke' },
    fracture:   { name: '骨折', desc: '外出工作身體額外 −8，六天後康復', daily: {}, lethal: null, cure: 'medicine', dur: 6, death: 'fracture' },
    poison:     { name: '食物中毒', desc: '每天身體 −5，兩天後康復', daily: { body: -5 }, lethal: null, cure: 'medicine', dur: 2, death: 'foodpoison' },
    insomnia:   { name: '失眠', desc: '睡覺不會恢復身體，休息可以康復', daily: {}, lethal: null, cure: 'rest', dur: 4, death: 'insomnia' },
  };
  // 外出的行動：會受 outdoorDeath 與骨折影響
  const OUTDOOR = ['dive', 'delivery', 'busk', 'volunteer'];
  // 保護道具（商店）
  Object.assign(D.SHOP, {
    medicine: { name: '藥箱',       desc: '治好霉菌肺、病毒、鼠疫熱、骨折和食物中毒', cost: 65 },
    helmet:   { name: '防撞頭盔',   desc: '隕石、無人機、快艇、流彈等外出意外的致命機會減至兩成', cost: 80 },
    gasmask:  { name: '防毒面罩',   desc: '毒雨、核冬天的灰等外出意外的致命機會減至兩成', cost: 90 },
  });

  Object.assign(D, { SCOPES, GRADES, WORLD_EVENTS, EVENTS, CONDS, OUTDOOR });
});
