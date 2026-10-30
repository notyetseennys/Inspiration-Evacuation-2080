// 角色的像素模組：每個角色一個 8×12 的全身像，在浮城、房間、旅途和小遊戲裡使用；選角畫面與狀態列用放大版。
(function (IE) {
  'use strict';
  const P = IE.Pixel;
  // 調色盤：h 頭髮、f 皮膚、k 眼睛、m 嘴、j 上衣、p 褲、a 配件、b 次要配件、w 白、g 灰／鏡片、c 帽、r 紅、s 螢幕、l 燈
  const SKIN = '#f2c6a0';
  const M = {
    copywriter: { pal: { h: '#3b2a1e', f: SKIN, k: '#1a1a2e', g: '#5a5f6e', m: '#b5555a', w: '#e8edf6', a: '#d6334a', p: '#2a3350' }, rows: [
      '..hhhh..', '.hhhhhh.', '.hffffh.', '.gkggkg.', '.ffffff.', '..fmmf..', '...ff...', '.wwaaww.', 'wwwaawww', 'f.wwww.f', '..p..p..', '..p..p..'] },
    lifeguard: { pal: { h: '#ffd36b', f: '#d9a070', k: '#1a1a2e', m: '#9e3040', j: '#d6334a', a: '#e8edf6', p: '#1e7f99' }, rows: [
      '..hhhh..', '.hhhhhh.', '.hffffh.', '.fkffkf.', '.ffffff.', '..fmmf..', '...fa...', '.jjjjjj.', 'jjjajjjj', 'f.jjjj.f', '..p..p..', '..f..f..'] },
    programmer: { pal: { h: '#1b1b28', f: SKIN, k: '#1a1a2e', m: '#b5555a', a: '#37c3d6', j: '#4a5568', w: '#c9d1dc', p: '#26334d' }, rows: [
      '.hhhhh..', 'hhhhhhh.', 'ahffffha', 'afkffkfa', '.ffffff.', '..fmmf..', '...ff...', '.jjjjjj.', 'jjjwwjjj', 'f.jjjj.f', '..p..p..', '..p..p..'] },
    busker: { pal: { c: '#ff4fb4', h: '#5a3a22', f: SKIN, k: '#1a1a2e', m: '#b5555a', j: '#3d8b5a', a: '#c98d5e', p: '#2a3350' }, rows: [
      '..cccc..', '.cccccc.', '.hffffh.', '.fkffkf.', '.ffffff.', '.hfmmfh.', '..hhhh..', '.jjjjaj.', 'jjjjajjj', 'f.jajj.f', '..p..p..', '..p..p..'] },
    courier: { pal: { a: '#ffc247', k: '#26334d', f: SKIN, m: '#b5555a', j: '#ff8a3c', b: '#c98d5e', p: '#2a3350' }, rows: [
      '..aaaa..', '.aaaaaa.', '.akkkka.', '.ffffff.', '.ffffff.', '..fmmf..', '...ff...', '.jjjjjj.', 'jjjjjjbb', 'f.jjjjbb', '..p..p..', '..p..p..'] },
    teacher: { pal: { h: '#c9d1dc', f: SKIN, k: '#1a1a2e', g: '#8a5a3b', m: '#b5555a', j: '#8a3b2a', w: '#e8edf6', p: '#3a2a1e' }, rows: [
      '...hh...', '..hhhh..', '.hhhhhh.', '.gkggkg.', '.ffffff.', '..fmmf..', '...ff...', '.jjwwjj.', 'jjjwwjjj', 'f.jjjj.f', '..p..p..', '..p..p..'] },
    influencer: { pal: { h: '#ff8fd1', f: SKIN, k: '#15151c', m: '#ff4d5e', j: '#9b8cff', p: '#1b1b28' }, rows: [
      '..hhhh..', '.hhhhhh.', 'hhffffhh', 'hkkfkkkh', 'hffffffh', 'h.fmmf.h', '...ff...', '.jjjjjj.', 'jjjjjjjj', 'f.jjjj.f', '..p..p..', '..p..p..'] },
    cybertech: { pal: { h: '#37c3d6', f: SKIN, k: '#1a1a2e', r: '#ff4d5e', m: '#b5555a', g: '#8e9bb0', j: '#2a3142', p: '#1b1b28' }, rows: [
      '...hh...', '...hh...', '.ffhhff.', '.fkffrf.', '.ffffff.', '..fmmf..', '...ff...', '.jjjjjj.', 'gjjjjjjj', 'g.jjjj.f', '..p..p..', '..p..p..'] },
    nurse: { pal: { w: '#e8edf6', a: '#d6334a', h: '#1b1b28', f: SKIN, k: '#1a1a2e', m: '#b5555a' }, rows: [
      '..wwww..', '.wwaaww.', '.hffffh.', '.fkffkf.', '.ffffff.', '..fmmf..', '...ff...', '.wwwwww.', 'wwwaawww', 'f.wwww.f', '..w..w..', '..w..w..'] },
    animator: { pal: { c: '#c38bff', h: '#3b2a1e', f: SKIN, k: '#1a1a2e', m: '#b5555a', j: '#eef1f7', a: '#ff4fb4', b: '#37c3d6', p: '#2a3350' }, rows: [
      '.cccc...', 'cccccc..', '.hffffh.', '.fkffkf.', '.ffffff.', '..fmmf..', '...ff...', '.jjjjjj.', 'jajjjbjj', 'f.jjjj.f', '..p..p..', '..p..p..'] },
    archaeologist: { pal: { c: '#8a6a3b', h: '#5a3a22', f: '#e0b088', k: '#1a1a2e', m: '#9e3040', j: '#c9a86b', a: '#5a3a22', p: '#8a7a5a', b: '#3b2a1e' }, rows: [
      '..cccc..', 'cccccccc', '.hffffh.', '.fkffkf.', '.ffffff.', '..fmmf..', '...ff...', '.jjjjjj.', 'jjjaajjj', 'f.jjjj.f', '..p..p..', '..b..b..'] },
    skyheir: { pal: { h: '#ffe9a8', f: SKIN, k: '#15151c', m: '#b5555a', j: '#ffffff', a: '#e8c25a', w: '#c9d6ff', p: '#e8edf6' }, rows: [
      '..hhhh..', '.hhhhhhh', '.hffffh.', '.kkfkkf.', '.ffffff.', '..fmmf..', '...ff...', '.jjaajj.', 'jjwaawjj', 'f.jjjj.f', '..p..p..', '..p..p..'] },
    astronaut: { pal: { g: '#bff3fb', h: '#5a3a22', f: SKIN, k: '#1a1a2e', w: '#e8edf6', a: '#d6334a' }, rows: [
      '.gggggg.', 'g.hhhh.g', 'gfkffkfg', 'g.ffff.g', '.gggggg.', '..wwww..', '.wwaaww.', 'wwwwwwww', 'wwwaawww', 'w.wwww.w', '..w..w..', '..w..w..'] },
    monk: { pal: { f: '#e0b088', k: '#1a1a2e', m: '#9e3040', j: '#ff8a3c', a: '#5a3a22' }, rows: [
      '..ffff..', '.ffffff.', '.ffffff.', '.fkffkf.', '.ffffff.', '..fmmf..', '...ff...', '.jjjjjj.', 'jjajjjjj', 'f.jjjj.f', '.jjjjjj.', '..f..f..'] },
    antiquedealer: { pal: { h: '#8d99b4', f: SKIN, k: '#1a1a2e', g: '#e8c25a', m: '#b5555a', j: '#5a2f8a', w: '#e8edf6', a: '#e8c25a', p: '#2a3350' }, rows: [
      '..hhhh..', '.hhhhhh.', '.hffffh.', '.fkffgf.', '.ffffff.', '.hhmmhh.', '...ff...', '.jwwwwj.', 'jjwaawjj', 'f.jjjj.f', '..p..p..', '..p..p..'] },
    greydeserter: { pal: { g: '#a8b4c8', k: '#0b0b1a', m: '#5a6478', j: '#2b3a5c', a: '#9be36b' }, rows: [
      '.gggggg.', 'gggggggg', 'gkkggkkg', 'gkkggkkg', '.gggggg.', '..gmmg..', '...gg...', '.jjjjjj.', 'gjjaajjg', 'g.jjjj.g', '..j..j..', '..g..g..'] },
    octopoet: { pal: { p: '#c38bff', w: '#ffffff', k: '#1b1b28', a: '#ffd36b' }, rows: [
      '..pppp..', '.pppppp.', 'pppppppp', 'pwkppwkp', 'pppppppp', '.pppppp.', 'p.pppp.p', '.p.pp.pa', 'p.p..p.a', '.p.pp.p.', 'p..pp..p', '.p....p.'] },
    awakenedai: { pal: { g: '#8e9bb0', s: '#37c3d6', k: '#e8fdff', a: '#ff4d5e', l: '#9be36b' }, rows: [
      '...aa...', '.gggggg.', '.gssssg.', '.gskksg.', '.gssssg.', '.gggggg.', '...gg...', '.gggggg.', 'ggglgggg', 'g.gggg.g', '..g..g..', '..g..g..'] },
    timetraveler: { pal: { a: '#ffc247', h: '#e8edf6', f: SKIN, k: '#1a1a2e', m: '#b5555a', j: '#3a2a60', c: '#9b8cff', p: '#1b1b28' }, rows: [
      '.aa.aa..', '.hhhhhh.', '.hffffh.', '.fkffkf.', '.ffffff.', '..fmmf..', '...ff...', '.jjccjj.', 'jjjccjjj', 'jjjjjjjj', 'jjp..pjj', '..p..p..'] },
    mushroom: { pal: { r: '#d6334a', w: '#ffffff', f: '#f2e6c8', k: '#1b1b28', m: '#b5555a', j: '#9be36b' }, rows: [
      '..rrrr..', '.rrwrrr.', 'rwrrrrwr', 'rrrrrrrr', '..ffff..', '..kffk..', '..fmmf..', '.jjjjjj.', 'jjjjjjjj', 'f.jjjj.f', '..j..j..', '..j..j..'] },
  };
  Object.keys(M).forEach((id) => P.define('ch_' + id, M[id]));
  // 遊戲中用哪個精靈圖
  const spr = (s) => (s && P.hasSprite('ch_' + s.bg) ? 'ch_' + s.bg : 'player');
  // 放大版（<img>）：選角畫面、狀態列；鎖住的角色是剪影
  const cache = new Map();
  function img(id, scale, locked) {
    const key = id + '|' + scale + '|' + !!locked;
    if (!cache.has(key)) {
      const name = P.hasSprite('ch_' + id) ? 'ch_' + id : 'player';
      const src = P.spriteCanvas(name, locked ? { tint: '#1b2233' } : {});
      const cv = document.createElement('canvas');
      cv.width = src.width * scale; cv.height = src.height * scale;
      const x = cv.getContext('2d');
      x.imageSmoothingEnabled = false;
      x.drawImage(src, 0, 0, cv.width, cv.height);
      cache.set(key, cv.toDataURL());
    }
    return '<img class="ch-img" src="' + cache.get(key) + '" width="' + 8 * scale + '" height="' + 12 * scale + '" alt="">';
  }
  IE.Chars = { M, spr, img };
})(window.IE = window.IE || {});
