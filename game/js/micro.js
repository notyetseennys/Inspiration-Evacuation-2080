// 小遊戲共用部分：橫額、廣告、頂部列、大頭像，以及小遊戲登記表。
// 個別小遊戲見 micro-label.js、micro-smile.js、micro-dive.js。
(function (IE) {
  'use strict';
  const P = IE.Pixel, A = IE.Audio;

  // 11 個小遊戲的統一說明與操作步驟資料
  const MICRO_META = {
    label: { code: 'SHIFT-01', title: 'AI 數據標註', color: '#37c3d6', steps: ['看上方當前標註指引', '← 否（A）/ → 是（D）', '空白鍵關閉彈窗廣告'] },
    ot: { code: 'SHIFT-01X', title: '加班數據標註', color: '#ff4d5e', steps: ['高速檢視標註指引', '← 否（A）/ → 是（D）', '空白鍵清除廣告干擾'] },
    alien: { code: 'ALIEN-00', title: '篩選地球人', color: '#9be36b', steps: ['依外星標準審核樣本', '← 淘汰 / → 帶走', '完成全部地球人篩選'] },
    smile: { code: 'SHIFT-02', title: '企業情緒陪伴', color: '#ff4fb4', steps: ['笑軌按 J・點頭軌按 K', '杯空按住 L 倒酒至刻度', '紅色偏見言論可附和或沉默'] },
    dive: { code: 'SHIFT-03', title: '舊城潛水', color: '#37c3d6', steps: ['方向鍵游動・空白鍵射魚叉', '按 E 撬開儲物櫃拾取遺物', '氧氣耗盡前按 Q 浮回水面'] },
    delivery: { code: 'SHIFT-04', title: '外送潛水', color: '#37c3d6', steps: ['方向鍵游往店舖取餐', '限時內送達亮燈客人窗口', '避開快艇（！）・空白鍵衝刺'] },
    farm: { code: 'SHIFT-05', title: '陰謀論內容農場', color: '#ff4fb4', steps: ['三行各選一張（主語+動作+對象）', '配合熱門話題標籤倍增轉發', '按 R 換一批字卡避免重複'] },
    busk: { code: 'SHIFT-06', title: '天橋底賣唱', color: '#8be28f', steps: ['先聽觀眾點唱旋律次序', '按 1 / 2 / 3 / 4 依序彈出', '管理員巡邏時立刻停手'] },
    clinic: { code: 'SHIFT-07', title: '黑市義體診所', color: '#9be36b', steps: ['對照上方接線圖顏色與符號', '拖動左方插頭至右方插座', '非法義體可按 X 拒絕安裝'] },
    interview: { code: 'HR-EXAM', title: '外星 HR 夢境面試', color: '#c38bff', steps: ['閱讀無臉面試官的五道問題', '限時內按 1 / 2 / 3 選擇答案', '洞察夠高可看出觸鬚傾向'] },
    garden: { code: 'SHIFT-08', title: '天台菜園', color: '#9be36b', steps: ['水滴出現按 1–9 澆水', '蔬菜發光成熟按 1–9 收成', '白鴿落地按 1–9 趕走防偷'] },
    salvage: { code: 'SHIFT-09', title: '拆樓打撈', color: '#ffc247', steps: ['觀察吊臂鐵球左右擺動', '經過紅十字弱點按空白鍵落錘', '打穿樓層可掘出牆內舊物'] },
    haggle: { code: 'SHIFT-10', title: '夜市擺地攤', color: '#ff4fb4', steps: ['觀察價錢條指針來回擺動', '在客人底價內按空白鍵開價', '按 B 吹噓真古董可抬高底價'] },
  };

  let creatingKind = null;

  // ---------- 進場說明卡的操作示意圖（畫在 320×180 座標系） ----------
  function drawDiagram(ctx, s, kind, color, t) {
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x * s), Math.round(y * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))); };
    const box = (x, y, w, h, c, fill) => {
      if (fill) px(x, y, w, h, fill);
      px(x, y, w, 1, c); px(x, y + h - 1, w, 1, c); px(x, y, 1, h, c); px(x + w - 1, y, 1, h, c);
    };
    const pulse = 0.5 + 0.5 * Math.sin(t * 8);
    // 示意圖底框
    box(52, 74, 216, 46, '#24324d', 'rgba(12, 18, 32, 0.85)');

    if (kind === 'label' || kind === 'ot' || kind === 'alien') {
      box(64, 84, 42, 26, '#ff4d5e', '#2a1219');
      P.text('← 否', 85, 92, { size: 7, align: 'center', color: '#ffb3bd', weight: 900 });
      box(134, 80, 52, 34, color, '#132038');
      px(144, 86, 32, 14, '#263859');
      px(154, 89, 12, 8, color);
      P.text('樣本', 160, 102, { size: 6, align: 'center', color: '#e8edf6' });
      box(214, 84, 42, 26, '#6cc070', '#12281a');
      P.text('是 →', 235, 92, { size: 7, align: 'center', color: '#c9f7cf', weight: 900 });
      px(112, 96, 16, 2, '#ff4d5e'); px(192, 96, 16, 2, '#6cc070');
    } else if (kind === 'smile') {
      box(64, 82, 36, 30, '#ffd36b', '#1e1a12');
      px(72, 89, 4, 4, '#ffd36b'); px(88, 89, 4, 4, '#ffd36b');
      px(74, 99, 16, 3, '#ff4fb4');
      const labels = [['J 陪笑', '#ffd36b'], ['K 點頭', '#37c3d6'], ['L 倒酒', '#ff4fb4']];
      labels.forEach(([lb, c], i) => {
        box(112 + i * 48, 85, 44, 24, c, '#141c2e');
        P.text(lb, 134 + i * 48, 93, { size: 6.5, align: 'center', color: c, weight: 900 });
      });
    } else if (kind === 'dive') {
      box(62, 82, 56, 10, '#37c3d6', '#0d1c2a');
      px(64, 84, Math.round(52 * (0.4 + 0.5 * pulse)), 6, '#37c3d6');
      P.text('O₂ 氧氣', 90, 96, { size: 6, align: 'center', color: '#9fdcff' });
      px(140, 90, 16, 8, '#37c3d6'); px(158, 93, 12, 2, '#ffd36b');
      box(184, 83, 74, 28, '#ffd36b', '#1b1810');
      P.text('空白射魚叉・E 撬櫃\nQ 緊急上浮', 221, 88, { size: 5.5, align: 'center', color: '#ffe7a8', lineHeight: 1.2 });
    } else if (kind === 'delivery') {
      box(62, 83, 44, 28, '#ffc247', '#241c10');
      P.text('店舖\n取餐', 84, 88, { size: 6, align: 'center', color: '#ffd36b', lineHeight: 1.15 });
      px(112, 96, 26, 2, '#37c3d6');
      box(144, 83, 48, 28, '#ff4d5e', '#261219');
      P.text('！快艇\n避開水道', 168, 88, { size: 5.8, align: 'center', color: '#ffb3bd', lineHeight: 1.15 });
      px(196, 96, 14, 2, '#37c3d6');
      box(214, 83, 44, 28, '#9be36b', '#12261a');
      P.text('客窗\n送達', 236, 88, { size: 6, align: 'center', color: '#c9f7cf', lineHeight: 1.15 });
    } else if (kind === 'farm') {
      const rows = [['1–3 主語', '#37c3d6'], ['4–6 動作', '#ff4fb4'], ['7–9 對象', '#ffc247']];
      rows.forEach(([lb, c], i) => {
        box(62 + i * 66, 83, 60, 28, c, '#141c2e');
        P.text(lb, 92 + i * 66, 93, { size: 6.2, align: 'center', color: c, weight: 900 });
      });
    } else if (kind === 'busk') {
      const cols = ['#ff4d5e', '#ffc247', '#8be28f', '#37c3d6'];
      cols.forEach((c, i) => {
        box(62 + i * 34, 83, 30, 28, c, '#141c2e');
        P.text(String(i + 1), 77 + i * 34, 92, { size: 8, align: 'center', color: c, weight: 900 });
      });
      box(202, 83, 58, 28, '#ff4d5e', '#261219');
      P.text('先聽後彈\n巡邏停手', 231, 88, { size: 5.8, align: 'center', color: '#ffd0d5', lineHeight: 1.15 });
    } else if (kind === 'clinic') {
      const cols = ['#ff4d5e', '#37c3d6', '#ffc247'];
      cols.forEach((c, i) => {
        px(72, 82 + i * 11, 14, 6, c);
        px(88, 84 + i * 11, 56, 2, c);
        box(146, 81 + i * 11, 14, 8, c, '#141c2e');
      });
      box(178, 83, 80, 28, color, '#12261a');
      P.text('照接線圖連左至右\nX 拒絕非法義體', 218, 88, { size: 5.6, align: 'center', color: '#c9f7cf', lineHeight: 1.2 });
    } else if (kind === 'interview') {
      box(66, 82, 32, 30, '#c38bff', '#1a1228');
      px(76, 88, 12, 12, '#9be36b'); px(72, 102, 20, 8, '#2b3a5c');
      for (let i = 0; i < 3; i++) {
        box(112 + i * 48, 84, 42, 26, i === 0 ? '#c38bff' : '#3a4a6b', '#141c2c');
        P.text('答案 ' + (i + 1), 133 + i * 48, 93, { size: 6, align: 'center', color: '#e8edf6' });
      }
    } else if (kind === 'garden') {
      const pots = [['💧 水滴:澆水', '#37c3d6'], ['✦ 發光:收成', '#ffd36b'], ['🕊 白鴿:趕走', '#eef1f7']];
      pots.forEach(([lb, c], i) => {
        box(60 + i * 68, 83, 62, 28, c, '#131d2e');
        P.text(lb, 91 + i * 68, 93, { size: 5.8, align: 'center', color: c, weight: 900 });
      });
    } else if (kind === 'salvage') {
      px(84, 78, 52, 4, '#ffc247');
      const bx = 110 + Math.sin(t * 5) * 16;
      px(bx, 82, 2, 12, '#cbd5f0');
      px(bx - 4, 94, 10, 8, '#2a2f45');
      px(84, 106, 52, 10, '#8e7a6a');
      px(106, 104, 8, 4, '#ff4d5e');
      box(156, 83, 102, 28, color, '#241c10');
      P.text('鐵球對準紅點\n按空白鍵落錘拆樓', 207, 88, { size: 5.8, align: 'center', color: '#ffe7a8', lineHeight: 1.15 });
    } else if (kind === 'haggle') {
      box(62, 88, 114, 14, '#36486b', '#0d1524');
      px(96, 90, 38, 10, '#2a6b3a');
      const nx = 115 + Math.sin(t * 5) * 40;
      px(nx, 85, 3, 20, '#ffd36b');
      P.text('客人底價區', 115, 105, { size: 5.5, align: 'center', color: '#9be36b' });
      box(186, 83, 72, 28, '#ff4fb4', '#261224');
      P.text('空白鍵開價停針\nB 吹噓真古董', 222, 88, { size: 5.6, align: 'center', color: '#ffd6ef', lineHeight: 1.15 });
    }
  }

  // ---------- 橫額與統一進場字卡 ----------
  function banner(st, text, color, sub) {
    const kind = st.kind || creatingKind || 'label';
    st.kind = kind;
    const isIntro = st.phase === 'intro' && !st._introShown;
    if (isIntro) st._introShown = true;
    st.banner = { text, sub, color: color || '#37c3d6', t: 0, intro: isIntro, kind };
  }

  function drawBanner(st) {
    const b = st.banner;
    if (!b || b.t > 1.4) return;
    const a = b.t < 0.12 ? b.t / 0.12 : b.t > 1.12 ? 1 - (b.t - 1.12) / 0.28 : 1;
    const alpha = Math.max(0, Math.min(1, a));
    const ctx = P.view.ctx, s = P.view.scale;
    const meta = MICRO_META[b.kind] || MICRO_META.label;

    if (b.intro && ctx) {
      ctx.save();
      ctx.globalAlpha = alpha;
      const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x * s), Math.round(y * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))); };
      // 半透明暗角背景與統一外框
      px(34, 20, 252, 142, 'rgba(7, 11, 20, 0.94)');
      px(34, 20, 252, 2, b.color);
      px(34, 160, 252, 2, b.color);
      px(34, 20, 2, 142, b.color);
      px(284, 20, 2, 142, b.color);
      // 頂部資訊帶
      px(36, 22, 248, 14, 'rgba(255, 255, 255, 0.05)');
      P.text('WORK TERMINAL // ' + meta.code, 44, 25, { size: 5.5, color: b.color, font: 'pixel', alpha });
      P.text('操作說明', 276, 25, { size: 5.5, align: 'right', color: '#8e9bb0', alpha });
      // 主標題與副標題
      P.text(b.text, 160, 40, { size: 15, align: 'center', weight: 900, color: b.color, stroke: '#05070c', alpha });
      if (b.sub) P.text(b.sub, 160, 60, { size: 7.5, align: 'center', weight: 700, color: '#e8edf6', stroke: '#05070c', alpha });
      // 中央操作示意圖
      drawDiagram(ctx, s, b.kind, b.color, b.t);
      // 底部步驟提示與進度條
      const stepStr = meta.steps.map(( tx, i) => (i + 1) + '.' + tx).join('   ');
      P.text(stepStr, 160, 126, { size: 5.8, align: 'center', color: '#cbd5f0', alpha });
      px(48, 144, 224, 5, '#1b263d');
      px(48, 144, Math.round(224 * Math.min(1, b.t / 1.35)), 5, b.color);
      P.text('READY', 160, 151, { size: 5, align: 'center', color: b.color, font: 'pixel', alpha });
      ctx.restore();
      return;
    }

    // 結算 / 中途橫額：統一印章橫額框
    if (ctx) {
      ctx.save();
      ctx.globalAlpha = alpha;
      const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x * s), Math.round(y * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))); };
      px(64, 56, 192, 58, 'rgba(8, 12, 22, 0.92)');
      px(64, 56, 192, 2, b.color);
      px(64, 112, 192, 2, b.color);
      px(64, 56, 2, 58, b.color);
      px(254, 56, 2, 58, b.color);
      ctx.restore();
    }
    const pop = b.t < 0.15 ? 1.3 - b.t / 0.15 * 0.3 : 1;
    P.text(b.text, 160, 64, { size: 18 * pop, align: 'center', weight: 900, color: b.color, stroke: '#0b0f1a', alpha });
    if (b.sub) P.text(b.sub, 160, 92, { size: 7.5, align: 'center', weight: 700, color: '#ffffff', stroke: '#0b0f1a', alpha });
  }

  // ---------- 廣告：沒有付費訂閱時，彈出來遮住畫面 ----------
  function adSystem(enabled, area) {
    const ads = [];
    const box = area || { x: 70, y: 34, w: 90, h: 50 };
    let next = 5 + Math.random() * 3;
    return {
      ads,
      update(dt) {
        if (!enabled) return;
        next -= dt;
        if (next <= 0) {
          next = 6 + Math.random() * 4;
          const lines = IE.DATA.ADS;
          ads.push({ x: box.x + Math.random() * box.w, y: box.y + Math.random() * box.h, w: 104, h: 44,
            text: lines[Math.floor(Math.random() * lines.length)], t: 0, hue: Math.random() < 0.5 ? '#ff4fb4' : '#ffc247' });
          A.sfx('ad');
        }
        for (let i = ads.length - 1; i >= 0; i--) { ads[i].t += dt; if (ads[i].t > 5) ads.splice(i, 1); }
      },
      // 按中「×」就關閉；按中廣告其他位置等於沒有按
      hit(x, y) {
        for (let i = ads.length - 1; i >= 0; i--) {
          const a = ads[i];
          if (x >= a.x + a.w - 14 && x <= a.x + a.w + 2 && y >= a.y - 2 && y <= a.y + 12) { ads.splice(i, 1); A.sfx('click'); return 'closed'; }
          if (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) return 'blocked';
        }
        return null;
      },
      closeTop() { if (ads.length) { ads.pop(); A.sfx('click'); return true; } return false; },
      draw(c) {
        ads.forEach((a) => {
          const pop = Math.min(1, a.t * 8);
          c.fillStyle = '#ffffff'; c.fillRect(a.x - 1, a.y - 1, a.w + 2, (a.h + 2) * pop);
          c.fillStyle = a.hue; c.fillRect(a.x, a.y, a.w, a.h * pop);
          c.fillStyle = '#0b0f1a'; c.fillRect(a.x + a.w - 12, a.y + 2, 10, 9);
        });
      },
      drawText() {
        ads.forEach((a) => {
          P.text('廣告', a.x + 4, a.y + 3, { size: 5, color: '#0b0f1a', weight: 900 });
          P.text(a.text, a.x + 4, a.y + 13, { size: 7, color: '#0b0f1a', weight: 900, lineHeight: 1.2 });
          P.text('×', a.x + a.w - 7, a.y + 1, { size: 8, align: 'center', color: '#ffffff', weight: 900 });
        });
      },
    };
  }

  // ---------- 統一 HUD 頂部列與取景角標 ----------
  function drawHudCorners(c, color) {
    const col = color || '#37c3d6';
    c.fillStyle = col;
    // 四角 L 型取景器標記
    c.fillRect(2, 15, 6, 1); c.fillRect(2, 15, 1, 6);
    c.fillRect(312, 15, 6, 1); c.fillRect(317, 15, 1, 6);
    c.fillRect(2, 177, 6, 1); c.fillRect(2, 172, 1, 6);
    c.fillRect(312, 177, 6, 1); c.fillRect(317, 172, 1, 6);
  }

  function topBar(c, progress, color) {
    const col = color || '#37c3d6';
    const pct = Math.max(0, Math.min(1, progress));
    const fillW = Math.round(108 * pct);
    // 頂部深色裝甲橫樑與底線
    c.fillStyle = '#080c16'; c.fillRect(0, 0, 320, 13);
    c.fillStyle = '#1b263d'; c.fillRect(0, 12, 320, 1);
    c.fillStyle = col; c.fillRect(0, 12, 18, 1); c.fillRect(302, 12, 18, 1);
    // 進度槽外框與刻度
    c.fillStyle = '#141e30'; c.fillRect(105, 3, 110, 6);
    c.fillStyle = '#263654'; c.fillRect(106, 4, 108, 4);
    for (let x = 133; x < 214; x += 27) { c.fillStyle = '#0b0f1a'; c.fillRect(x, 4, 1, 4); }
    // 進度條與高亮游標
    if (fillW > 0) {
      c.fillStyle = col; c.fillRect(106, 4, fillW, 4);
      c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(106, 4, fillW, 1);
      c.fillStyle = '#ffffff'; c.fillRect(106 + Math.max(0, fillW - 2), 3, 2, 6);
    }
    drawHudCorners(c, col);
  }

  // ---------- 大頭像（28×32），用色塊拼成 ----------
  function face(c, x, y, o) {
    const nod = Math.round(o.nod || 0);
    y += nod;
    c.fillStyle = o.shirt; c.fillRect(x, y + 24 - nod, 28, 8 + nod);
    c.fillStyle = o.skin; c.fillRect(x + 4, y + 4, 20, 22);
    if (o.fat) c.fillRect(x + 2, y + 10, 24, 14);
    c.fillStyle = o.hair; c.fillRect(x + 3, y + 1, 22, 6); c.fillRect(x + 3, y + 3, 3, 10); c.fillRect(x + 22, y + 3, 3, 10);
    if (o.shades) {
      c.fillStyle = '#0b0f1a'; c.fillRect(x + 6, y + 11, 7, 4); c.fillRect(x + 15, y + 11, 7, 4); c.fillRect(x + 13, y + 12, 2, 1);
    } else {
      c.fillStyle = '#1b1b28';
      const eh = o.dead > 0.6 ? 1 : 3;
      c.fillRect(x + 8, y + 11 + (3 - eh), 3, eh); c.fillRect(x + 17, y + 11 + (3 - eh), 3, eh);
    }
    if (o.angry) { c.fillStyle = '#1b1b28'; c.fillRect(x + 7, y + 8, 4, 1); c.fillRect(x + 17, y + 8, 4, 1); }
    const mw = Math.round(o.smile);
    const mx = x + 14 - Math.floor(mw / 2);
    if (o.frown) {
      c.fillStyle = '#9e3040'; c.fillRect(mx, y + 20, mw, 1); c.fillRect(mx - 1, y + 21, 1, 1); c.fillRect(mx + mw, y + 21, 1, 1);
    } else {
      c.fillStyle = '#9e3040'; c.fillRect(mx, y + 19, mw, 3);
      c.fillStyle = '#ffffff'; c.fillRect(mx + 1, y + 19, Math.max(0, mw - 2), 1);
      c.fillStyle = o.skin; if (mw > 6) { c.fillRect(mx - 1, y + 17, 1, 2); c.fillRect(mx + mw, y + 17, 1, 2); }
    }
    if (o.chain) { c.fillStyle = '#e8c25a'; for (let i = 0; i < 14; i += 2) c.fillRect(x + 7 + i, y + 26 + (i > 6 ? 14 - i : i) / 3, 2, 1); }
  }

  // 結束後延遲一陣才回傳結果，讓「下班」橫額播完
  function ender(st, getResult, onDone) {
    return (dt) => {
      if (st.phase !== 'end') return;
      st.endT += dt;
      if (st.endT > 1.4 && onDone) { const cb = onDone; onDone = null; cb(getResult()); }
    };
  }

  const registry = {};
  IE.Micro = {
    META: MICRO_META,
    C: { banner, drawBanner, adSystem, topBar, face, ender },
    register(kind, factory) { registry[kind] = factory; },
    create(kind, opts, onDone) {
      creatingKind = kind;
      let m;
      try {
        if (kind === 'label' || kind === 'ot') m = registry.label(Object.assign({ ot: kind === 'ot' }, opts), onDone);
        else if (kind === 'alien') m = registry.label({ alien: true }, onDone);
        else if (registry[kind]) m = registry[kind](opts || {}, onDone);
        else throw new Error('未知的小遊戲：' + kind);
      } finally {
        creatingKind = null;
      }
      const meta = MICRO_META[kind] || MICRO_META.label;
      m.kind = kind;
      m.meta = meta;
      const origDraw = m.draw;
      m.draw = function (c) {
        origDraw.call(this, c);
        drawHudCorners(c, meta.color);
      };
      return m;
    },
  };
})(window.IE = window.IE || {});
