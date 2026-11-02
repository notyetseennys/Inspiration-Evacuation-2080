// 靈感撤離 2080 — 第十五期：像素插圖載入器（WO-15-12）
(function () {
  window.IE = window.IE || {};

  // 已轉入 game/img/ 的第一至五批圖片清單；第六批尚未生成時回傳空字串，不留空框
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
