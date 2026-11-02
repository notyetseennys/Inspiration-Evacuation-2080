// 靈感撤離 2080 — 第十五期：像素插圖載入器（WO-15-12）
(function () {
  window.IE = window.IE || {};

  // 已轉入 game/img/ 的圖片清單（第一至六批；第六批的核心 13 張在 2026-11-02 由 Claude 加入）。
  // 只給開發版（game/index.html）用；打包版讀 IE.IMG（build.js 自動收入 game/img/ 的全部圖片）。
  // 不在清單上的圖片（例如第六批的選做）回傳空字串，不留空框；Claude 加入新圖時要同時更新這份清單。
  const KNOWN = {
    'day-busk': 1, 'day-clinic': 1, 'day-delivery': 1, 'day-dive': 1,
    'day-farm': 1, 'day-garden': 1, 'day-haggle': 1, 'day-label': 1,
    'day-salvage': 1, 'day-smile': 1, 'day-trip': 1, 'day-volunteer': 1,
    'trip-africa': 1, 'trip-america': 1, 'trip-arctic': 1,
    'trip-asia': 1, 'trip-europe': 1, 'trip-ocean': 1,
    'friend-chan': 1, 'friend-dj': 1, 'friend-fong': 1, 'friend-ho': 1,
    'friend-ken': 1, 'friend-mary': 1, 'friend-miu': 1, 'friend-yu': 1,
    'pack-far': 1, 'pack-flood': 1, 'pack-sky': 1, 'pack-street': 1, 'pack-under': 1,
    'scene-market': 1, 'scene-review': 1,
    'stage-desk': 1, 'stage-gallery': 1, 'stage-hall': 1, 'stage-ufo': 1,
    'end-agent': 1, 'end-archived': 1, 'end-death': 1, 'end-grey': 1, 'end-guardian': 1,
    'end-heavy': 1, 'end-ordinary': 1, 'end-perfect': 1, 'end-returned': 1,
    'emblem': 1, 'icon': 1,
    'species-grey': 1, 'species-octo': 1, 'species-myco': 1, 'species-conserve': 1,
    'collect-grey': 1, 'collect-octo': 1, 'collect-myco': 1, 'collect-conserve': 1,
    'story-crossroads': 1, 'story-reversal': 1, 'astar': 1, 'note-floatcity': 1,
  };

  function img(name) {
    if (!name) return '';
    if (IE.IMG) return IE.IMG[name] || '';
    if (!KNOWN[name]) return '';
    return 'img/' + name + '.png';
  }

  function imgTag(name, cls) {
    const src = img(name);
    if (!src) return '';
    const c = cls ? 'px ' + cls : 'px';
    return '<img class="' + c + '" src="' + src + '" alt="" loading="lazy" onerror="this.hidden=true">';
  }

  IE.img = img;
  IE.imgTag = imgTag;
})();
