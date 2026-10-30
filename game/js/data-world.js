// 《靈感撤離 2080》世界：浮城地圖的地點、全球目的地、旅行素材（包括只在特定事件期間出現的極稀有素材）、家居、古董市場。
// 新標籤「遠古」「星辰」與相應的具名組合也在這裡。規則見 rules.js（旅行、畫廊、古董、家居）。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA;
  const ev = (s, id) => !!(IE.Rules && IE.Rules.eventActive(s, id));

  // ---------- 新標籤 ----------
  Object.assign(D.TAGS, {
    ancient: { name: '遠古', color: '#c98d5e' },
    cosmic:  { name: '星辰', color: '#9b8cff' },
  });

  // ---------- 旅行素材 ----------
  // origin：地區（「地球之歌」要五個不同地區）；rarity：rare 稀有、legend 極稀有（只在特定條件下出現）
  const C = (id, name, tags, value, origin, rarity) => [id, { name, tags, value, origin, rarity: rarity || null }];
  const TRAVEL_CARDS = Object.fromEntries([
    // 新東京
    C('t_capsule', '膠囊旅館的一夜', ['neon', 'machine'], 28, 'asia'), C('t_robotmonk', '機械人和尚的經文', ['machine', 'hope'], 32, 'asia'),
    C('t_neonrain', '新東京的霓虹雨', ['neon', 'water'], 30, 'asia'), C('z_lastbyte', '最後一個手寫字型', ['memory', 'machine'], 70, 'asia', 'legend'),
    // 沉沒的威尼斯
    C('t_gondola', '沉沒的貢多拉', ['water', 'memory'], 30, 'europe'), C('t_mask', '面具節的面具', ['neon', 'memory'], 28, 'europe'),
    C('t_fresco', '水底的壁畫', ['water', 'ancient'], 34, 'europe'), C('z_lagoonvoice', '潟湖裡的歌聲', ['water', 'warmth'], 72, 'europe', 'legend'),
    // 沙漠化的開羅
    C('t_sand', '一瓶紅色的沙', ['hunger', 'anger'], 26, 'africa'), C('t_market', '舊市集的叫賣', ['warmth', 'hunger'], 28, 'africa'),
    C('t_mirage', '海市蜃樓', ['hope', 'water'], 32, 'africa'),
    // 北極種子庫
    C('t_seed', '一粒冰封的種子', ['hope', 'memory'], 34, 'arctic'), C('t_aurora', '北極光', ['cosmic', 'hope'], 36, 'arctic'),
    C('t_frozen', '冰層下的氣泡', ['water', 'ancient'], 30, 'arctic'), C('z_lastseed', '人類最後一粒種子', ['hope', 'ancient'], 80, 'arctic', 'legend'),
    // 金字塔
    C('t_hiero', '半淹的象形文字', ['ancient', 'water'], 34, 'africa'), C('t_scarab', '聖甲蟲護身符', ['ancient', 'hope'], 32, 'africa'),
    C('t_tombair', '墓室裡的空氣', ['ancient', 'memory'], 36, 'africa'), C('z_sunboat', '太陽船的槳', ['ancient', 'cosmic'], 85, 'africa', 'legend'),
    // 馬雅遺跡
    C('t_glyph', '馬雅石刻', ['ancient', 'cosmic'], 36, 'america'), C('t_jungle', '雨林的呼吸', ['hope', 'water'], 30, 'america'),
    C('t_ballcourt', '球場上的回音', ['ancient', 'anger'], 32, 'america'), C('z_calendar', '曆法的最後一頁', ['ancient', 'cosmic'], 90, 'america', 'legend'),
    // 吳哥窟
    C('t_root', '纏住神殿的樹根', ['ancient', 'hope'], 32, 'asia'), C('t_smile', '高棉的微笑', ['ancient', 'warmth'], 36, 'asia'),
    C('t_monk', '小沙彌的早課', ['warmth', 'memory'], 30, 'asia'),
    // 三星堆
    C('t_bronze', '青銅面具', ['ancient', 'machine'], 34, 'asia'), C('t_tree', '青銅神樹', ['ancient', 'hope'], 34, 'asia'),
    C('t_gold', '金杖上的魚和鳥', ['ancient', 'water'], 32, 'asia'), C('z_bronzeeye', '縱目的凝視', ['ancient', 'cosmic'], 88, 'asia', 'legend'),
    // 拉斯科洞穴
    C('t_cavehorse', '洞穴裡的馬', ['ancient', 'rebel'], 36, 'europe'), C('t_handprint', '手印', ['ancient', 'warmth'], 38, 'europe'),
    C('t_ochre', '一把赭石', ['ancient', 'anger'], 30, 'europe'), C('z_fire', '人類的第一把火', ['ancient', 'hope'], 95, 'europe', 'legend'),
    // 哥貝克力石陣
    C('t_pillar', '刻著狐狸的石柱', ['ancient', 'cosmic'], 36, 'asia'), C('t_vulture', '禿鷲石', ['ancient', 'guilt'], 34, 'asia'),
    C('t_feast', '一萬年前的宴會', ['ancient', 'hunger'], 32, 'asia'), C('z_starmap', '刻著星圖的石頭', ['ancient', 'cosmic'], 90, 'asia', 'legend'),
    // 西伯利亞凍土
    C('t_mammothhair', '長毛象的毛', ['ancient', 'warmth'], 34, 'arctic'), C('t_permafrost', '融化的凍土', ['ancient', 'water'], 30, 'arctic'),
    C('t_methane', '冒泡的湖', ['anger', 'water'], 28, 'arctic'), C('z_heartbeat', '長毛象的心跳', ['ancient', 'warmth'], 92, 'arctic', 'legend'),
    // 51 區
    C('t_redacted', '塗黑的文件', ['cosmic', 'rebel'], 36, 'america'), C('t_saucer', '飛碟的螺絲', ['cosmic', 'machine'], 36, 'america'),
    C('t_desertsky', '沙漠的夜空', ['cosmic', 'hope'], 32, 'america'), C('z_truthfile', '真相檔案', ['cosmic', 'rebel'], 90, 'america', 'legend'),
    // 南極外星基地
    C('t_iceglyph', '冰牆上的符號', ['cosmic', 'ancient'], 40, 'antarctica'), C('t_penguin', '一隻好奇的企鵝', ['warmth', 'water'], 30, 'antarctica'),
    C('t_hum', '冰層下的嗡嗡聲', ['cosmic', 'machine'], 38, 'antarctica'), C('z_firstcontact', '第一次接觸的錄音', ['cosmic', 'hope'], 100, 'antarctica', 'legend'),
    // 月球背面招聘中心
    C('t_moondust', '月塵', ['cosmic', 'memory'], 42, 'space'), C('t_contract', '外星勞動合約', ['cosmic', 'machine'], 38, 'space'),
    C('t_silence', '月球的寂靜', ['cosmic', 'hope'], 44, 'space'), C('z_earthrise', '從月球看見的浮城', ['cosmic', 'warmth'], 110, 'space', 'legend'),
    // 亞特蘭提斯
    C('t_orichalcum', '山銅碎片', ['ancient', 'machine'], 44, 'ocean'), C('t_coralthrone', '珊瑚王座', ['ancient', 'water'], 42, 'ocean'),
    C('t_tidesong', '潮汐的歌', ['water', 'cosmic'], 44, 'ocean'), C('z_atlantis', '亞特蘭提斯的鑰匙', ['ancient', 'cosmic'], 120, 'ocean', 'legend'),
    // 亞歷山大圖書館（另一條時間線）
    C('t_scroll', '一卷沒被燒掉的書', ['ancient', 'memory'], 44, 'africa'), C('t_lamp', '閱覽室的油燈', ['warmth', 'ancient'], 40, 'africa'),
    C('t_catalog', '失傳書目', ['memory', 'rebel'], 42, 'africa'), C('z_lastbook', '世上最後一本手寫的書', ['memory', 'ancient'], 115, 'africa', 'legend'),
    // 古董市場（浮城）
    C('a_vinyl', '首版黑膠', ['memory', 'neon'], 38, 'home', 'rare'), C('a_camera', '菲林相機', ['memory', 'machine'], 36, 'home', 'rare'),
    C('a_letter', '戰前的情書', ['warmth', 'memory'], 40, 'home', 'rare'), C('a_globe', '沒有淹水的地球儀', ['hope', 'memory'], 42, 'home', 'rare'),
    C('a_meteor', '真正的隕石', ['cosmic', 'anger'], 44, 'home', 'rare'), C('a_fossil', '三葉蟲化石', ['ancient', 'water'], 40, 'home', 'rare'),
    C('a_typewriter', '作家的打字機', ['machine', 'rebel'], 38, 'home', 'rare'), C('a_icon', '褪色的聖像', ['hope', 'guilt'], 40, 'home', 'rare'),
  ].map(([id, c]) => [id, c]));
  Object.assign(D.CARDS, TRAVEL_CARDS);
  const ANTIQUES = Object.keys(TRAVEL_CARDS).filter((k) => k.startsWith('a_'));

  // ---------- 新的具名組合 ----------
  const has = (c, id) => c.id === id;
  const R = (id, name, need, chips, mult, extra) => Object.assign({ id, name, need, chips, mult }, extra || {});
  D.RECIPES.push(
    R('prehistoric', '史前回音', { ancient: 2, memory: 1 }, 40, 3.5),
    R('stargazer', '觀星者', { cosmic: 1, hope: 1, ancient: 1 }, 40, 3.5),
    R('firstart', '第一幅畫', { ancient: 1, rebel: 1 }, 25, 2.5),
    R('neontemple', '霓虹神殿', { ancient: 1, neon: 2 }, 35, 3),
    R('starsea', '星海', { cosmic: 1, water: 2 }, 35, 3),
    R('alientech', '外星機械', { cosmic: 2, machine: 1 }, 40, 3.5),
    R('doomtour', '末日觀光', { ancient: 1, hunger: 1, neon: 1 }, 30, 3),
    R('homesick', '想家', { memory: 1, warmth: 1, cosmic: 1 }, 35, 3),
    R('deeptime', '深時', { ancient: 3 }, 45, 4),
    R('cosmos', '宇宙', { cosmic: 3 }, 45, 4),
    // 傳說：需要旅行才找得到的極稀有素材
    R('atlantissong', '亞特蘭提斯之歌', {}, 120, 6, { legend: true, xmult: 4, cond: (s, sel) => sel.some((c) => has(c, 'z_atlantis')),
      hint: '一把只在海水暴漲時才會浮現的鑰匙。' }),
    R('firstcontact', '第一次接觸', {}, 120, 6, { legend: true, xmult: 4, cond: (s, sel) => sel.some((c) => has(c, 'z_firstcontact')),
      hint: '南極冰層下，有一段錄音在等外星人回來。' }),
    R('firstlastfire', '第一把火與最後一個字', {}, 150, 8, { legend: true, xmult: 5, cond: (s, sel) => sel.some((c) => has(c, 'z_fire')) && sel.some((c) => has(c, 'z_lastbyte')),
      hint: '人類的第一把火，和人類最後一個手寫的字。' }),
    R('earthsong', '地球之歌', {}, 100, 5, { legend: true, xmult: 4, cond: (s, sel) => new Set(sel.map((c) => c.origin).filter((o) => o && o !== 'home')).size >= 5,
      hint: '用來自五個不同地方的東西，唱一首關於地球的歌。' }),
  );

  // ---------- 全球目的地 ----------
  // kind：modern 現代、ancient 古文明、prehistoric 史前、alien 外星人基地、legend 傳說；x, y：在世界地圖上的位置（320×180）
  // cost：來回旅費與住宿；stay：停留天數；landmark：場景的地標畫法；sky / ground：場景配色
  // sites：探索點（每個時段選一個）；gain：可得素材；risk：致命機會（death 為死法）；need：能力要求；rare：極稀有素材的條件
  const S = (id, name, desc, fx) => Object.assign({ id, name, desc, body: 8, spark: 0, gain: [], risk: null, need: null, rare: null }, fx);
  const DESTINATIONS = [
    { id: 'neotokyo', name: '新東京', region: 'asia', kind: 'modern', x: 284, y: 54, cost: 240, stay: 2, landmark: 'towers', sky: ['#1a0b2e', '#ff4fb4'], ground: '#2a1a40',
      desc: '浮在海上的霓虹都市，機械人比人多。', sites: [
        S('neonst', '霓虹街', '在永遠下雨的霓虹街迷路。', { gain: ['t_neonrain', 't_capsule'], spark: 0.2 }),
        S('robotemple', '機械人寺廟', '機械人和尚為過期的 AI 誦經。', { gain: ['t_robotmonk'], body: 4, spark: 0.3 }),
        S('archive', '手寫字型檔案館', '全世界最後一間保存手寫字型的檔案館，正準備拆卸。', { gain: ['t_capsule'], need: { insight: 40 },
          rare: { id: 'z_lastbyte', chance: 0.6, cond: (s) => s.auto >= 60, text: '全城自動化 60% 以上時，檔案館正好在清空最後一批字型' } }),
      ] },
    { id: 'venice', name: '沉沒的威尼斯', region: 'europe', kind: 'modern', x: 170, y: 44, cost: 320, stay: 2, landmark: 'sunken', sky: ['#1b3a5c', '#e8c25a'], ground: '#0c4457',
      desc: '只剩鐘樓頂露出水面。貢多拉船夫改行做潛水導遊。', sites: [
        S('canal', '水底運河', '在水底的運河裡游過一間又一間的教堂。', { gain: ['t_gondola', 't_fresco'], body: 10, need: { swim: 30 }, risk: { chance: 0.02, death: 'venice_drown' } }),
        S('carnival', '面具節', '面具節照常舉行，只是在船上。', { gain: ['t_mask'], spark: 0.3, body: 4 }),
        S('lagoon', '潟湖', '傳說潟湖裡有人在唱歌。', { gain: ['t_gondola'], rare: { id: 'z_lagoonvoice', chance: 0.5, cond: (s) => s.season === 'storm', text: '風暴季的晚上' } }),
      ] },
    { id: 'cairo', name: '沙漠化的開羅', region: 'africa', kind: 'modern', x: 190, y: 61, cost: 300, stay: 2, landmark: 'dunes', sky: ['#c46a1e', '#ffd36b'], ground: '#c98d5e',
      desc: '一半淹沒、一半變成沙漠的城市。舊市集還在營業。', sites: [
        S('souq', '舊市集', '討價還價了一整個下午。', { gain: ['t_market', 't_sand'], body: 6 }),
        S('dune', '沙丘', '走進沙丘看海市蜃樓。', { gain: ['t_mirage'], body: 12, risk: { chance: 0.03, death: 'sandstorm' }, spark: 0.2 }),
        S('nile', '剩下的尼羅河', '尼羅河只剩一條小溪。', { gain: ['t_sand', 't_mirage'], body: 5 }),
      ] },
    { id: 'svalbard', name: '北極種子庫', region: 'arctic', kind: 'modern', x: 172, y: 13, cost: 420, stay: 2, landmark: 'ice', sky: ['#0b1a3a', '#9be36b'], ground: '#dfe9f5',
      desc: '人類保存所有農作物種子的地下倉庫，入口已被冰封。', sites: [
        S('vault', '種子庫', '爬進被冰封的種子庫。', { gain: ['t_seed', 't_frozen'], body: 12, risk: { chance: 0.03, death: 'frozen' },
          rare: { id: 'z_lastseed', chance: 0.7, cond: (s) => ev(s, 'famine') || ev(s, 'nuclearwinter'), text: '糧荒或核冬天期間，倉庫裡只剩最後一粒種子' } }),
        S('aurora', '極光', '整晚看北極光。', { gain: ['t_aurora'], spark: 0.5, body: 6 }),
        S('glacier', '冰川', '在冰川上聽冰層移動。', { gain: ['t_frozen'], body: 10, risk: { chance: 0.02, death: 'frozen' } }),
      ] },
    { id: 'giza', name: '半淹的金字塔', region: 'africa', kind: 'ancient', x: 184, y: 68, cost: 400, stay: 3, landmark: 'pyramid', sky: ['#3a1a10', '#ffb347'], ground: '#0c4457',
      desc: '海水淹到金字塔的一半。墓室要潛水才能進入。', sites: [
        S('chamber', '水底墓室', '潛進半淹的墓室。', { gain: ['t_tombair', 't_hiero'], body: 12, need: { swim: 35 }, risk: { chance: 0.03, death: 'pyramid' } }),
        S('sphinx', '獅身人面像', '坐在獅身人面像的頭上看日落。', { gain: ['t_scarab'], spark: 0.4, body: 4 }),
        S('boatpit', '太陽船坑', '傳說法老的太陽船就埋在這裡。', { gain: ['t_hiero'], need: { insight: 35 },
          rare: { id: 'z_sunboat', chance: 0.7, cond: (s) => ev(s, 'solarflare'), text: '太陽閃焰期間，船坑會發光' } }),
      ] },
    { id: 'maya', name: '馬雅遺跡', region: 'america', kind: 'ancient', x: 80, y: 74, cost: 420, stay: 3, landmark: 'temple', sky: ['#14321c', '#9be36b'], ground: '#1d4a2a',
      desc: '雨林吞沒了神殿，神殿上刻著一本永遠在倒數的曆法。', sites: [
        S('pyramidstep', '神殿階梯', '爬上神殿頂端。', { gain: ['t_glyph', 't_jungle'], body: 12, risk: { chance: 0.02, death: 'temple_fall' } }),
        S('ballcourt', '古球場', '在古球場拍了一下手，回音很長。', { gain: ['t_ballcourt'], spark: 0.2, body: 4 }),
        S('calendar', '曆法石', '研究刻在石上的曆法。', { gain: ['t_glyph'], need: { insight: 45 },
          rare: { id: 'z_calendar', chance: 0.8, cond: (s) => s.day >= 85, text: '當日子快要走到盡頭（第 85 天之後）' } }),
      ] },
    { id: 'angkor', name: '吳哥窟', region: 'asia', kind: 'ancient', x: 253, y: 79, cost: 340, stay: 2, landmark: 'temple', sky: ['#3a1a2e', '#ffc247'], ground: '#2a3a1a',
      desc: '樹根纏住神殿，石像一直在微笑。', sites: [
        S('roots', '樹根神殿', '在被樹根纏住的神殿裡走了一天。', { gain: ['t_root'], body: 8, spark: 0.2 }),
        S('smiles', '微笑佛塔', '數了一整天石像的微笑。', { gain: ['t_smile'], spark: 0.4, body: 4 }),
        S('monastery', '寺院', '和小沙彌一起做早課。', { gain: ['t_monk', 't_smile'], body: 2, atone: 1.5 }),
      ] },
    { id: 'sanxingdui', name: '三星堆', region: 'asia', kind: 'ancient', x: 249, y: 58, cost: 260, stay: 2, landmark: 'masks', sky: ['#1a1a0b', '#e8c25a'], ground: '#3a2a10',
      desc: '三千年前的青銅面具，眼睛長得像望遠鏡。', sites: [
        S('pits', '祭祀坑', '看考古隊從坑裡挖出青銅器。', { gain: ['t_bronze', 't_gold'], body: 6 }),
        S('tree', '青銅神樹', '神樹上的鳥好像隨時會飛走。', { gain: ['t_tree'], spark: 0.3, body: 4 }),
        S('eyes', '縱目面具', '和縱目面具對望。', { gain: ['t_bronze'], need: { imag: 40 },
          rare: { id: 'z_bronzeeye', chance: 0.7, cond: (s) => ev(s, 'aliens') || ev(s, 'disclosure') || ev(s, 'alienzoo'), text: '外星人出現在天空的日子，面具好像在看著它們' } }),
      ] },
    { id: 'lascaux', name: '拉斯科洞穴', region: 'europe', kind: 'prehistoric', x: 158, y: 46, cost: 380, stay: 2, landmark: 'cave', sky: ['#1a1410', '#c98d5e'], ground: '#3a2a1e',
      desc: '一萬七千年前的人類在牆上畫馬。洞穴已經關閉了很久。', sites: [
        S('hall', '公牛大廳', '在公牛大廳看了一整天的壁畫。', { gain: ['t_cavehorse', 't_ochre'], spark: 0.4, body: 6 }),
        S('hands', '手印牆', '把手放在一萬七千年前的手印上。', { gain: ['t_handprint'], spark: 0.3, body: 4 }),
        S('deep', '洞穴深處', '爬進從來沒有人畫過的最深處。', { gain: ['t_ochre'], body: 14, risk: { chance: 0.03, death: 'cave' },
          rare: { id: 'z_fire', chance: 0.7, cond: (s) => ev(s, 'blackout') || ev(s, 'solarflare') || ev(s, 'netdown'), text: '全世界的燈都熄滅的日子，洞穴深處有一點火光' } }),
      ] },
    { id: 'gobekli', name: '哥貝克力石陣', region: 'asia', kind: 'prehistoric', x: 199, y: 53, cost: 400, stay: 2, landmark: 'monolith', sky: ['#0b0b1a', '#9b8cff'], ground: '#5a4a3a',
      desc: '比金字塔早七千年的石柱，刻滿了動物。沒有人知道是誰建的。', sites: [
        S('circle', '石柱圈', '在石柱圈中間坐了一整晚。', { gain: ['t_pillar', 't_vulture'], spark: 0.3, body: 6 }),
        S('feast', '宴會遺跡', '考古學家說這裡辦過一場一萬年前的宴會。', { gain: ['t_feast'], body: 4 }),
        S('stars', '星空', '對照石柱上的符號看星空。', { gain: ['t_pillar'], need: { insight: 50 },
          rare: { id: 'z_starmap', chance: 0.8, cond: (s) => ev(s, 'meteor') || ev(s, 'cosmicray'), text: '隕石雨或宇宙射線暴期間，石柱上的星圖對上了天空' } }),
      ] },
    { id: 'siberia', name: '西伯利亞凍土', region: 'arctic', kind: 'prehistoric', x: 276, y: 25, cost: 450, stay: 2, landmark: 'ice', sky: ['#1a2a3a', '#dfe9f5'], ground: '#8a7a6a',
      desc: '凍土在融化，冰河時期的東西一件一件露出來。', sites: [
        S('thaw', '融化的凍土', '在泥濘裡找長毛象的毛。', { gain: ['t_mammothhair', 't_permafrost'], body: 10, cond: { id: 'fever', chance: 0.15 } }),
        S('lake', '冒泡的湖', '湖面不停冒出古老的氣體。', { gain: ['t_methane'], body: 8, risk: { chance: 0.03, death: 'methane' } }),
        S('mammoth', '長毛象', '有人說凍土裡有一隻完整的長毛象。', { gain: ['t_mammothhair'], need: { fit: 35 },
          rare: { id: 'z_heartbeat', chance: 0.7, cond: (s) => ev(s, 'heatdome'), text: '熱穹令凍土融化得最快的日子' } }),
      ] },
    { id: 'area51', name: '51 區', region: 'america', kind: 'alien', x: 57, y: 53, cost: 550, stay: 2, landmark: 'dome', sky: ['#0b0b1a', '#37c3d6'], ground: '#a8865a',
      desc: '圍欄還在，守衛換成了機械人。據說他們在等你。', sites: [
        S('fence', '圍欄外', '在圍欄外看了一整晚的天空。', { gain: ['t_desertsky'], spark: 0.3, body: 4 }),
        S('hangar', '機庫', '從排氣口爬進機庫。', { gain: ['t_saucer', 't_redacted'], body: 10, need: { dex: 40 }, risk: { chance: 0.05, death: 'area51' } }),
        S('archive51', '檔案室', '翻閱塗黑的文件。', { gain: ['t_redacted'], need: { insight: 50 }, risk: { chance: 0.02, death: 'area51' },
          rare: { id: 'z_truthfile', chance: 0.8, cond: (s) => ev(s, 'disclosure') || ev(s, 'census'), text: '外星人真相公開或靈感普查期間，文件忘了塗黑' } }),
      ] },
    { id: 'antarctica', name: '南極外星基地', region: 'antarctica', kind: 'alien', x: 160, y: 166, cost: 900, stay: 3, landmark: 'crater', sky: ['#0b1a2e', '#9b8cff'], ground: '#eef2f8',
      desc: '冰層下有一座不屬於人類的建築，一直在發出嗡嗡聲。', when: (s) => s.day >= 30, lockText: '第 30 天後才有航班',
      sites: [
        S('wall', '冰牆', '研究冰牆上的符號。', { gain: ['t_iceglyph'], body: 10, need: { insight: 40 }, risk: { chance: 0.02, death: 'frozen' } }),
        S('colony', '企鵝群', '一隻企鵝跟了你一整天。', { gain: ['t_penguin'], spark: 0.3, body: 6 }),
        S('below', '冰層下', '跟著嗡嗡聲走進冰層下面。', { gain: ['t_hum', 't_iceglyph'], body: 16, need: { calm: 40 }, risk: { chance: 0.05, death: 'antarctic_base' },
          rare: { id: 'z_firstcontact', chance: 0.8, cond: (s) => ev(s, 'aliens') || ev(s, 'harvest') || ev(s, 'broadcast'), text: '外星人干預、大收割或宇宙廣播期間，錄音機自己開始播放' } }),
      ] },
    { id: 'moonbase', name: '月球背面招聘中心', region: 'space', kind: 'alien', x: 300, y: 16, cost: 2500, stay: 2, landmark: 'moon', sky: ['#000000', '#1b2233'], ground: '#8d99b4',
      desc: '星際人才發展局在月球背面的招聘中心。可以買票參觀，不包回程保險。', when: (s) => s.stats.bestPlay >= 100000, lockText: '一次下筆得到 10 萬分以上，才會收到參觀邀請',
      sites: [
        S('lobby', '招聘大堂', '看外星 HR 面試其他星球的候選人。', { gain: ['t_contract'], body: 6, paranoia: 6 }),
        S('crater', '環形山', '在月球上走路。', { gain: ['t_moondust', 't_silence'], spark: 0.6, body: 10, risk: { chance: 0.03, death: 'moon' } }),
        S('window', '觀景窗', '從月球看地球。', { gain: ['t_silence'], spark: 0.5, body: 2,
          rare: { id: 'z_earthrise', chance: 0.9, cond: (s) => ev(s, 'moonfall'), text: '月亮變近的日子，浮城看起來很大很大' } }),
      ] },
    { id: 'atlantis', name: '亞特蘭提斯', region: 'ocean', kind: 'legend', x: 132, y: 57, cost: 700, stay: 2, landmark: 'atlantis', sky: ['#04161f', '#37c3d6'], ground: '#062433',
      desc: '傳說中沉沒的城市。只有潛水高手和不怕死的人才會去。', when: (s) => s.attr.swim >= 50, lockText: '水性 50 以上才找得到入口',
      sites: [
        S('gate', '城門', '游過亞特蘭提斯的城門。', { gain: ['t_orichalcum', 't_tidesong'], body: 14, risk: { chance: 0.04, death: 'atlantis' } }),
        S('throne', '珊瑚王座', '坐在珊瑚王座上。', { gain: ['t_coralthrone'], spark: 0.5, body: 10, risk: { chance: 0.02, death: 'atlantis' } }),
        S('vault', '王的寶庫', '寶庫的門上有一個鑰匙孔。', { gain: ['t_orichalcum'], need: { swim: 65 }, body: 16, risk: { chance: 0.05, death: 'atlantis' },
          rare: { id: 'z_atlantis', chance: 0.9, cond: (s) => ev(s, 'moonfall') || ev(s, 'tsunami'), text: '月亮變近或全球海嘯期間，海水把鑰匙沖了出來' } }),
      ] },
    { id: 'alexandria', name: '亞歷山大圖書館', region: 'africa', kind: 'legend', x: 178, y: 56, cost: 500, stay: 2, landmark: 'library', sky: ['#2a1a0b', '#ffd36b'], ground: '#c9a86b',
      desc: '在另一條時間線裡，它沒有被燒掉。只有時間出現裂縫時才去得到。', when: (s) => IE.Rules.eventActive(s, 'timeslip'), lockText: '只在時間裂縫期間開放',
      sites: [
        S('reading', '閱覽室', '在油燈下讀了一整天的書。', { gain: ['t_scroll', 't_lamp'], spark: 0.5, body: 4 }),
        S('stacks', '書庫', '在書架之間找失傳的書目。', { gain: ['t_catalog'], need: { insight: 40 }, body: 6 }),
        S('scribe', '抄寫室', '看最後一位抄寫員抄書。', { gain: ['t_scroll'], body: 4, rare: { id: 'z_lastbook', chance: 0.8, cond: () => true, text: '只要你去得到' } }),
      ] },
  ];
  const HOME = { name: '浮城', x: 262, y: 68 };
  const DEST = {};
  DESTINATIONS.forEach((d) => { DEST[d.id] = d; });
  const KINDS = { modern: { name: '現代都市', color: '#37c3d6' }, ancient: { name: '古文明', color: '#e8c25a' }, prehistoric: { name: '史前遺跡', color: '#c98d5e' },
    alien: { name: '外星人基地', color: '#9be36b' }, legend: { name: '傳說之地', color: '#ff4fb4' } };
  const REGIONS = { asia: '亞洲', europe: '歐洲', africa: '非洲', america: '美洲', arctic: '北極', antarctica: '南極', ocean: '大洋', space: '月球', home: '浮城' };

  // ---------- 浮城地圖的地點 ----------
  // act：對應的行動；ui：打開某個介面（不佔時段）
  const PLACES = [
    { id: 'home', name: '你的家', x: 150, y: 96, ui: 'room', icon: 'home' },
    { id: 'labelhub', name: '標註中心', x: 92, y: 60, act: 'label', icon: 'office' },
    { id: 'skyclub', name: '天空區會所', x: 206, y: 28, act: 'smile', icon: 'sky' },
    { id: 'deliveryhub', name: '外送站', x: 122, y: 128, act: 'delivery', icon: 'boat' },
    { id: 'farm', name: '內容農場', x: 60, y: 104, act: 'farm', icon: 'office' },
    { id: 'clinic', name: '黑市診所', x: 248, y: 112, act: 'clinic', icon: 'clinic' },
    { id: 'olddive', name: '舊城潛水點', x: 186, y: 150, act: 'dive', icon: 'dive' },
    { id: 'bridge', name: '天橋', x: 196, y: 92, act: 'busk', icon: 'bridge' },
    { id: 'friends', name: '朋友們', x: 104, y: 92, act: 'chat', icon: 'friends' },
    { id: 'shelter', name: '避難所', x: 34, y: 140, act: 'volunteer', icon: 'shelter' },
    { id: 'antique', name: '古董市場', x: 270, y: 74, ui: 'antique', icon: 'market' },
    { id: 'gallery', name: '天空區畫廊', x: 252, y: 34, ui: 'gallery', icon: 'sky' },
    { id: 'airport', name: '浮城機場', x: 294, y: 144, ui: 'world', icon: 'plane' },
  ];

  // ---------- 家居：買得到、看得見，而且有用 ----------
  const DECOR = [
    { id: 'bed', name: '二手彈簧床', cost: 180, desc: '睡覺恢復身體 +3' },
    { id: 'ac', name: '冷氣機', cost: 260, desc: '熱浪季不會熱得睡不著；中暑機會減半' },
    { id: 'pump', name: '抽水泵', cost: 160, desc: '家裡淹水時不會受傷，也不會發霉' },
    { id: 'lock', name: '防盜門', cost: 120, desc: '遇上搶劫時不會被搶走錢' },
    { id: 'plant', name: '一盆植物', cost: 40, desc: '每天火花 +0.05' },
    { id: 'aquarium', name: '魚缸', cost: 200, desc: '每天火花 +0.1，冷靜慢慢上升' },
    { id: 'bookshelf', name: '書架', cost: 150, desc: '素材籌碼 +5%' },
    { id: 'easel', name: '畫架', cost: 240, desc: '每晚創作多一次改稿' },
    { id: 'telescope', name: '望遠鏡', cost: 350, desc: '看得清楚所有預兆的天數與等級' },
    { id: 'stereo', name: '唱盤', cost: 220, desc: '街頭表演收入 +20%，每週得到一張音樂素材' },
    { id: 'neonsign', name: '自製霓虹燈', cost: 90, desc: '每五天得到一張霓虹素材' },
    { id: 'poster', name: '地下樂隊海報', cost: 30, desc: '每週得到一張反叛素材' },
  ];
  const DEC = {};
  DECOR.forEach((d) => { DEC[d.id] = d; });

  // ---------- 旅行帶回來的靈感物件 ----------
  const O = (id, name, rarity, icon, pal, desc, fx) => Object.assign({ id, name, rarity, icon, pal, desc }, fx);
  D.OBJECTS.push(
    O('passport', '蓋滿印章的護照', 'rare', 'book', { a: '#5a2f8a', b: '#2a1640', c: '#e8c25a' }, '每張「遠古」或「星辰」素材計分時，籌碼 +25。', { src: '第一次出國',
      card: (c) => (c.tags.includes('ancient') || c.tags.includes('cosmic') ? { chips: 25 } : null) }),
    O('postcards', '一疊沒寄出的明信片', 'common', 'paper', { a: '#ffd36b', b: '#c98d5e', c: '#37c3d6' }, '下筆的素材每來自一個浮城以外的地方，倍率 +3。', { src: '旅行的探索點',
      play: (x) => { const n = new Set(x.sel.map((c) => c.origin).filter((o) => o && o !== 'home')).size; return n ? { mult: 3 * n } : null; } }),
    O('aliencompass', '外星指南針', 'legend', 'clock', { a: '#9b8cff', b: '#2b3a5c', c: '#9be36b' }, '每張極稀有素材計分時，倍率 ×1.5。', {
      unlock: { text: '跨局累積找到 3 種極稀有素材', test: (m) => Object.keys(m.rares || {}).length >= 3 },
      card: (c) => (c.rarity === 'legend' ? { xmult: 1.5 } : null) }),
  );
  D.OBJECTS.forEach((o) => { D.OBJ[o.id] = o; });

  // 家居送的素材：每隔幾天出現一張
  const DECOR_GIFTS = { stereo: { every: 7, cards: ['d_vinyl', 'p_chorus', 'n_dj1'] }, neonsign: { every: 5, cards: ['d_sign', 'l_sunset', 'f_viral'] },
    poster: { every: 7, cards: ['m_graffiti', 'e_graffiti', 'b_guitar'] } };

  // 旅途的晚上：住在旅館，偶然會發生的事
  const TRIP_EVENTS = [
    { id: 't_luggage', w: 3, text: '航空公司弄丟了你的行李。', cr: -60 },
    { id: 't_local', w: 4, text: '一位當地人請你吃晚飯，說了很多你聽不懂、但很動人的話。', spark: 0.3, body: 4, gainOrigin: true },
    { id: 't_food', w: 3, text: '你吃了路邊攤。很好吃，然後很不好。', body: -8, cond: { id: 'poison', chance: 0.25 } },
    { id: 't_hostel', w: 3, text: '青年旅館的上格床很吵，但同房的人教了你一首歌。', body: -3, spark: 0.2, card: 'p_chorus' },
    { id: 't_scam', w: 2, text: '你在紀念品店買了一塊「真正的古董」。它是浮城製造的。', cr: -40 },
    { id: 't_sky', w: 4, text: '這裡的夜空沒有探射燈，你看見了很多很多星星。', spark: 0.4, paranoia: -4 },
    { id: 't_homesick', w: 3, text: '你在旅館的電視上看到浮城的新聞，突然很想家。', spark: 0.2, card: 'a_globe' },
    { id: 't_robbed', w: 2, text: '你在夜市被扒手偷了錢包。', crPct: 0.15, crMax: 150 },
  ];
  // 航班：平時很安全；戰爭、AI 失控、太陽閃焰、超級颶風期間就不一定
  const FLIGHT = { base: 0.002, events: { war: 0.02, airogue: 0.012, solarflare: 0.015, megastorm: 0.01, netdown: 0.006 } };
  // 旅行教你的技法：按目的地的種類
  Object.assign(D.TEACH, { trip_modern: 'collage', trip_ancient: 'mural', trip_prehistoric: 'sketch', trip_alien: 'symphony', trip_legend: 'epic' });

  Object.assign(D, { DESTINATIONS, DEST, HOME, KINDS, REGIONS, PLACES, DECOR, DEC, ANTIQUES, DECOR_GIFTS, TRIP_EVENTS, FLIGHT });
});
