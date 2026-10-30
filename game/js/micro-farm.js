// 陰謀論內容農場：用「主語 + 動作 + 對象」拼出聳動標題，越假越多人轉發
//   - 三行字卡各選一張即自動發佈；標籤組合（外星 + 恐懼等）令轉發量倍增
//   - 熱門話題每 12 秒更換：標題含有該標籤，轉發量 ×1.5
//   - 演算法討厭重複：同一個組合用得越多，效果越差
//   - 被事實查核標記為可疑的帖文，轉發量反而上升
//   - 有根據的字卡（白色）轉發較少，但不會令城市更恐慌
(function (IE) {
  'use strict';
  const P = IE.Pixel, A = IE.Audio, C = IE.Micro.C;
  const R = () => IE.Rules, D = () => IE.DATA, G = () => IE.Game;
  const SLOTS = ['subject', 'verb', 'object'];
  const SLOT_NAME = { subject: '主語', verb: '動作', object: '對象' };
  const TAG = { alien: ['外星', '#9be36b'], fear: ['恐懼', '#a77bff'], anger: ['憤怒', '#ff4d5e'], celeb: ['名人', '#ffc247'], data: ['數據', '#37c3d6'], truth: ['真相', '#ffffff'] };
  const TREND = ['alien', 'fear', 'anger', 'celeb', 'data'];
  const ROW_Y = [31, 58, 85], TILE_X = [8, 70, 132], TILE_W = 58, TILE_H = 18;
  const PAY_PER_SHARE = 0.0026;
  const USERS = ['@真相獵人', '@浮城阿姨', '@匿名', '@天台貓', '@囤水專家', '@前標註員', '@愛國者2080', '@夜班外送', '@被提預備', '@阿星的粉絲'];

  function Farm(opts, onDone) {
    const s = G().state;
    const cfg = R().farmConfig(s);
    const fx = P.particles();
    const pool = D().FARM_TILES;
    const st = {
      t: -1.4, phase: 'intro', banner: null, endT: 0,
      tray: null, pick: [null, null, null], lock: 0, trend: TREND[Math.floor(Math.random() * TREND.length)], trendT: 12,
      posts: [], comments: [], headlines: 0, shares: 0, fakeTotal: 0, truth: 0, cr: 0, panic: s.paranoia,
      lastPost: -99, comboUse: {}, stamp: null, followers: 12400 + Math.floor(Math.random() * 3000),
    };
    function draw3(list) {
      const idx = list.map((_, i) => i);
      const out = [];
      while (out.length < 3 && idx.length) out.push(list[idx.splice(Math.floor(Math.random() * idx.length), 1)[0]]);
      return out;
    }
    function deal() { st.tray = SLOTS.map((k) => draw3(pool[k])); st.pick = [null, null, null]; }
    deal();
    C.banner(st, '開工', '#ff4fb4', '拼出標題，讓全城轉發');
    A.setMode('work', 128);

    function choose(row, i) {
      if (st.phase !== 'play' || st.lock > 0) return;
      if (st.pick[row] === i) { st.pick[row] = null; A.sfx('click'); return; }
      st.pick[row] = i; A.sfx('chips');
      if (st.pick.every((p) => p != null)) post();
    }
    const activeRow = () => st.pick.findIndex((p) => p == null);
    function post() {
      const tiles = st.pick.map((p, r) => st.tray[r][p]);
      const sc = R().farmScore(tiles);
      let mult = 1;
      const notes = sc.combos.slice();
      const tags = tiles.flatMap((t) => t.tags);
      if (tags.includes(st.trend)) { mult *= 1.5; notes.push('熱門話題'); }
      // 演算法疲勞：同一組合重複使用，效果遞減
      const key = sc.combos.join('+') || '平淡';
      const used = st.comboUse[key] || 0;
      st.comboUse[key] = used + 1;
      if (used) { mult *= Math.pow(0.75, used); notes.push('觀眾看膩了'); }
      if (st.t - st.lastPost < 6) { mult *= 1.15; notes.push('連發'); }
      let flagged = false;
      if (sc.fake >= 0.75 && Math.random() < 0.35) { flagged = true; mult *= 1.3; }
      const shares = Math.round(sc.shares * mult);
      const text = tiles.map((t) => t.text).join('');
      st.posts.unshift({ text, target: shares, shown: 0, t: 0, fake: sc.fake, truth: sc.truth > 0, flagged, notes });
      if (st.posts.length > 4) st.posts.pop();
      st.headlines++; st.shares += shares; st.fakeTotal += sc.fake; if (sc.truth) st.truth++;
      st.cr += shares * PAY_PER_SHARE * cfg.payMult;
      st.panic = Math.min(100, st.panic + sc.fake * 4);
      st.lastPost = st.t;
      st.stamp = { text: notes.length ? notes.join('・') : '已發佈', big: shares >= 4000, t: 0, shares };
      A.sfx(shares >= 4000 ? 'combo' : 'coin');
      if (shares >= 4000) P.view.shake = 3;
      for (let i = 0; i < Math.min(30, 6 + shares / 300); i++) {
        fx.add({ x: 96 + Math.random() * 40, y: 118, tx: 250 + Math.random() * 40, ty: 30, home: 2 + Math.random() * 2, life: 1 + Math.random() * 0.5, color: sc.truth ? '#ffffff' : '#ff4fb4', size: Math.random() < 0.3 ? 2 : 1 });
      }
      const n = 2 + Math.min(4, Math.floor(shares / 1500));
      for (let i = 0; i < n; i++) {
        st.comments.push({ user: USERS[Math.floor(Math.random() * USERS.length)], text: D().FARM_COMMENTS[Math.floor(Math.random() * D().FARM_COMMENTS.length)], t: -i * 0.35, x: 0 });
      }
      st.lock = 1.1; st.redeal = true;
    }
    function reroll() {
      if (st.phase !== 'play' || st.lock > 0) return;
      deal(); st.lock = 1.4; A.sfx('ad');
      st.stamp = { text: '重新抽卡中……', t: 0 };
    }
    function finish() {
      if (st.phase === 'end') return;
      st.phase = 'end'; st.endT = 0;
      C.banner(st, '下班', '#ffc247', '總轉發 ' + st.shares.toLocaleString());
    }
    const endTick = C.ender(st, () => ({ cr: st.cr, headlines: st.headlines, shares: st.shares, fakeTotal: Math.round(st.fakeTotal * 10) / 10, truth: st.truth }), onDone);

    return {
      kind: 'farm',
      controls: [{ id: 'k1', label: '1', key: '' }, { id: 'k2', label: '2', key: '' }, { id: 'k3', label: '3', key: '' }, { id: 'reroll', label: '重抽', key: 'R' }],
      hint: '每行選一張字卡（按字卡，或按 1 至 3 選擇目前那一行），三行選好就會發佈。顏色代表標籤：組合得好、碰上熱門話題，轉發量就會倍增。白色字卡有事實根據，轉發較少，但不會令城市更恐慌。',
      control(id, down) {
        if (!down) return;
        if (id === 'reroll') reroll();
        else { const r = activeRow(); if (r >= 0) choose(r, Number(id.slice(1)) - 1); }
      },
      key(k, down) {
        if (!down) return;
        if (k === '1' || k === '2' || k === '3') { const r = activeRow(); if (r >= 0) choose(r, Number(k) - 1); }
        else if (k === 'r' || k === 'R') reroll();
        else if (k === 'Backspace') { for (let r = 2; r >= 0; r--) if (st.pick[r] != null) { st.pick[r] = null; break; } }
      },
      pointer(type, x, y) {
        if (type !== 'down') return;
        ROW_Y.forEach((ry, row) => TILE_X.forEach((tx, i) => {
          if (x >= tx && x <= tx + TILE_W && y >= ry && y <= ry + TILE_H) choose(row, i);
        }));
        if (x >= 132 && x <= 190 && y >= 106 && y <= 120) reroll();
      },
      update(dt) {
        st.t += dt;
        if (st.banner) st.banner.t += dt;
        if (st.stamp) { st.stamp.t += dt; if (st.stamp.t > 1.8) st.stamp = null; }
        st.lock = Math.max(0, st.lock - dt);
        fx.update(dt);
        if (st.phase === 'intro' && st.t >= 0) st.phase = 'play';
        st.posts.forEach((p) => { p.t += dt; p.shown = Math.min(p.target, p.shown + p.target * dt / 2.5 + 3); });
        st.comments.forEach((c) => { c.t += dt; });
        st.comments = st.comments.filter((c) => c.t < 3.2);
        if (st.phase === 'play') {
          if (st.lock <= 0 && st.redeal) { st.redeal = false; deal(); }
          st.trendT -= dt;
          if (st.trendT <= 0) {
            st.trendT = 12;
            const others = TREND.filter((t) => t !== st.trend);
            st.trend = others[Math.floor(Math.random() * others.length)];
            A.sfx('tick');
          }
          if (st.t >= cfg.duration) finish();
        }
        endTick(dt);
      },
      draw(c) {
        c.fillStyle = '#140c1f'; c.fillRect(0, 0, 320, 180);
        // 左：標題編輯器
        c.fillStyle = '#1e1430'; c.fillRect(4, 14, 190, 164);
        const ar = activeRow();
        ROW_Y.forEach((ry, row) => {
          if (row === ar && st.lock <= 0) { c.fillStyle = 'rgba(255,79,180,0.12)'; c.fillRect(5, ry - 8, 188, TILE_H + 10); }
          TILE_X.forEach((tx, i) => {
            const tile = st.tray[row][i];
            const sel = st.pick[row] === i;
            const col = TAG[tile.tags[0]][1];
            c.fillStyle = sel ? col : '#2c2140'; c.fillRect(tx, ry, TILE_W, TILE_H);
            c.fillStyle = col; c.fillRect(tx, ry, TILE_W, 2);
            if (tile.tags[1]) { c.fillStyle = TAG[tile.tags[1]][1]; c.fillRect(tx + TILE_W / 2, ry, TILE_W / 2, 2); }
            if (st.lock > 0) { c.fillStyle = 'rgba(20,12,31,0.6)'; c.fillRect(tx, ry, TILE_W, TILE_H); }
            if (cfg.showFake) { c.fillStyle = '#ff4d5e'; c.fillRect(tx + 2, ry + TILE_H - 3, Math.round((TILE_W - 4) * tile.fake), 1); }
          });
        });
        // 預覽
        c.fillStyle = '#0d0816'; c.fillRect(8, 106, 120, 14);
        c.fillStyle = st.lock > 0 ? '#3a2c50' : '#ff4fb4'; c.fillRect(132, 106, 58, 14);
        // 恐慌指數
        c.fillStyle = '#26334d'; c.fillRect(8, 168, 182, 4);
        c.fillStyle = st.panic > 60 ? '#ff4d5e' : '#a77bff'; c.fillRect(8, 168, Math.round(182 * st.panic / 100), 4);
        // 右：動態
        c.fillStyle = '#0b0f1a'; c.fillRect(198, 14, 118, 164);
        c.fillStyle = '#1a2233'; c.fillRect(198, 14, 118, 12);
        st.posts.forEach((p, i) => {
          const y = 30 + i * 34;
          const pop = Math.min(1, p.t * 6);
          c.fillStyle = p.flagged ? '#3a1520' : '#151d2e'; c.fillRect(201, y, 112 * pop, 31);
          c.fillStyle = p.truth ? '#ffffff' : '#ff4fb4'; c.fillRect(201, y, 2, 31);
          c.fillStyle = ['#37c3d6', '#ffc247', '#9be36b'][i % 3]; c.fillRect(205, y + 3, 6, 6);
        });
        fx.draw(c);
        C.topBar(c, 1 - Math.max(0, st.t) / cfg.duration, '#ff4fb4');
      },
      drawText() {
        P.text('$ +' + Math.round(st.cr), 6, 1, { size: 9, font: 'num', color: '#8be28f', weight: 400 });
        P.text('轉發 ' + st.shares.toLocaleString(), 314, 1, { size: 8, font: 'num', color: '#ff4fb4', align: 'right', weight: 400 });
        P.text('熱門話題：#' + TAG[st.trend][0], 8, 16, { size: 6, color: TAG[st.trend][1], weight: 900 });
        P.text(Math.ceil(st.trendT) + '秒後更換', 190, 16, { size: 5, color: '#8d99b4', align: 'right' });
        ROW_Y.forEach((ry, row) => {
          P.text(SLOT_NAME[SLOTS[row]], 8, ry - 7, { size: 5, color: row === activeRow() ? '#ff4fb4' : '#8d99b4', weight: 900 });
          TILE_X.forEach((tx, i) => {
            const tile = st.tray[row][i];
            const sel = st.pick[row] === i;
            P.text(tile.text, tx + TILE_W / 2, ry + 5, { size: tile.text.length > 6 ? 5.5 : 6.5, align: 'center', color: sel ? '#0b0f1a' : '#e8edf6', weight: 900 });
            if (row === activeRow()) P.text(String(i + 1), tx + 3, ry + 3, { size: 4.5, color: '#8d99b4' });
          });
        });
        const prev = st.pick.map((p, r) => (p == null ? '＿＿' : st.tray[r][p].text)).join('');
        P.text(prev, 12, 109, { size: 6, color: '#e8edf6', weight: 900 });
        P.text(st.lock > 0 ? '上傳中…' : '重抽 R', 161, 109, { size: 6, align: 'center', color: '#ffffff', weight: 900 });
        if (st.stamp) {
          const a = Math.max(0, 1 - st.stamp.t / 1.8);
          P.text(st.stamp.text, 98, 126, { size: 6, align: 'center', color: '#ffc247', weight: 900, alpha: a });
          if (st.stamp.shares) P.text('+' + st.stamp.shares.toLocaleString() + ' 轉發', 98, 136 - st.stamp.t * 4, { size: st.stamp.big ? 11 : 8, align: 'center', color: '#ff4fb4', weight: 900, stroke: '#140c1f', alpha: a });
        }
        P.text('城市恐慌指數 ' + Math.round(st.panic) + '%', 8, 160, { size: 5, color: '#a77bff', weight: 900 });
        if (cfg.showFake) P.text('洞察 ≥ 50：紅線是捏造程度', 190, 160, { size: 5, color: '#ff8a9a', align: 'right' });
        P.text('@浮城真相　追蹤者 ' + (st.followers + Math.floor(st.shares / 40)).toLocaleString(), 202, 16, { size: 5, color: '#9fb0d0', weight: 900 });
        st.posts.forEach((p, i) => {
          const y = 30 + i * 34;
          P.text(P.wrap(p.text, 15), 214, y + 3, { size: 5.5, color: '#e8edf6', weight: 900, lineHeight: 1.2 });
          P.text('↻ ' + Math.round(p.shown).toLocaleString(), 214, y + 22, { size: 5.5, color: p.truth ? '#ffffff' : '#ff4fb4', weight: 900 });
          if (p.flagged) P.text('⚠ 已標記為可疑，轉發反而上升', 312, y + 22, { size: 4.5, color: '#ff8a9a', align: 'right', weight: 900 });
        });
        st.comments.forEach((c, i) => {
          if (c.t < 0) return;
          const a = Math.min(1, c.t * 4) * Math.max(0, 1 - (c.t - 2.4) / 0.8);
          P.text(c.user + '：' + c.text, 312, 170 - c.t * 18 - (i % 3) * 7, { size: 5, color: '#c9d1dc', align: 'right', alpha: Math.min(1, a) });
        });
        C.drawBanner(st);
      },
    };
  }

  IE.Micro.register('farm', Farm);
})(window.IE = window.IE || {});
