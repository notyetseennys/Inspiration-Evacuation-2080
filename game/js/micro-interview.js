// 外星 HR 夢境面試：篩選日前兩晚，你會在夢裡被外星人面試
//   - 五條問題，每條三個答案，限時作答；沉默也會被記錄
//   - 外星人喜歡的答案，往往是把自己變輕、變空的那一個
//   - 撿到「標準答案」的人會看見提示；洞察 ≥ 60 的人看得出外星人的觸鬚指向哪裡
(function (IE) {
  'use strict';
  const P = IE.Pixel, A = IE.Audio, C = IE.Micro.C;
  const R = () => IE.Rules, D = () => IE.DATA, G = () => IE.Game;
  const CARD_X = [8, 112, 216], CARD_Y = 112, CARD_W = 96, CARD_H = 58;
  const TIME = 9;

  function Interview(opts, onDone) {
    const s = G().state;
    const qs = (s.interviewSet && s.interviewSet.length ? s.interviewSet : R().interviewQuestions(s)).slice(0, 5);
    const sheet = !!s.flags.answerSheet;
    const insight = s.attr.insight >= 60;
    const fx = P.particles();
    const eyes = [];
    for (let i = 0; i < 7; i++) eyes.push({ x: 20 + Math.random() * 280, y: 18 + Math.random() * 50, r: 3 + Math.random() * 4, ph: Math.random() * 6 });
    const st = {
      t: -1.6, phase: 'intro', banner: null, endT: 0,
      qi: 0, mode: 'ask', modeT: 0, typed: 0, answers: [], react: null, mood: 0, ptr: { x: 160, y: 90 }, score: 0,
    };
    C.banner(st, '面試', '#c38bff', '星際人才發展局・夢境面試');
    A.setMode('alien', 70);

    const Q = () => D().INTERVIEW_QS[qs[st.qi]];
    function answer(a) {
      if (st.phase !== 'play' || st.mode !== 'ask' || st.typed < Q().q.length) return;
      const ans = a < 0 ? D().INTERVIEW_TIMEOUT : Q().a[a];
      st.answers.push({ q: qs[st.qi], a });
      st.score += ans.score;
      st.mood = ans.score;
      st.react = { text: ans.react, pick: a };
      st.mode = 'react'; st.modeT = 2.6;
      A.sfx(ans.score > 0 ? 'perfect' : ans.score < 0 ? 'wrong' : 'tick');
      if (ans.score > 0) fx.burst(160, 46, 14, { color: '#9be36b', life: 0.8, speed: 40 });
      if (ans.score < 0) P.view.shake = 4;
    }
    function finish() {
      if (st.phase === 'end') return;
      st.phase = 'end'; st.endT = 0;
      C.banner(st, '醒來', '#c38bff', st.score > 0 ? '你在夢裡被打了高分' : '你醒來時一身冷汗');
    }
    const endTick = C.ender(st, () => ({ answers: st.answers }), onDone);
    const best = () => { const a = Q().a; let b = 0; a.forEach((x, i) => { if (x.score > a[b].score) b = i; }); return b; };

    return {
      kind: 'interview',
      controls: [{ id: 'a0', label: 'A', key: '1' }, { id: 'a1', label: 'B', key: '2' }, { id: 'a2', label: 'C', key: '3' }],
      hint: '外星人會問你五條問題，每條限時 ' + TIME + ' 秒。按答案卡，或按 1 至 3 作答。不回答也是一種答案。面試結果會影響外星訊號。',
      control(id, down) { if (down) answer(Number(id.slice(1))); },
      key(k, down) {
        if (!down) return;
        if (k === '1' || k === 'a' || k === 'A' || k === 'ArrowLeft') answer(0);
        else if (k === '2' || k === 'b' || k === 'B' || k === 'ArrowDown') answer(1);
        else if (k === '3' || k === 'c' || k === 'C' || k === 'ArrowRight') answer(2);
        else if (k === ' ' && st.mode === 'ask') st.typed = Q().q.length;
      },
      pointer(type, x, y) {
        st.ptr = { x, y };
        if (type !== 'down') return;
        if (st.mode === 'ask' && st.typed < Q().q.length) { st.typed = Q().q.length; return; }
        CARD_X.forEach((cx, i) => { if (x >= cx && x <= cx + CARD_W && y >= CARD_Y && y <= CARD_Y + CARD_H) answer(i); });
      },
      update(dt) {
        st.t += dt;
        if (st.banner) st.banner.t += dt;
        fx.update(dt);
        if (st.phase === 'intro' && st.t >= 0) { st.phase = 'play'; st.mode = 'ask'; st.modeT = TIME; st.typed = 0; }
        if (st.phase === 'play') {
          if (st.mode === 'ask') {
            const len = Q().q.length;
            if (st.typed < len) { const before = Math.floor(st.typed); st.typed = Math.min(len, st.typed + dt * 22); if (Math.floor(st.typed) !== before) A.sfx('tick'); }
            else {
              st.modeT -= dt;
              if (st.modeT <= 0) answer(-1);
            }
          } else if (st.mode === 'react') {
            st.modeT -= dt;
            if (st.modeT <= 0) {
              st.qi++;
              if (st.qi >= qs.length) finish();
              else { st.mode = 'ask'; st.modeT = TIME; st.typed = 0; st.react = null; st.mood = 0; }
            }
          }
        }
        endTick(dt);
      },
      draw(c) {
        // 夢：漸層、漂浮的眼睛
        const g = c.createLinearGradient(0, 0, 0, 180);
        g.addColorStop(0, '#2a0f3d'); g.addColorStop(0.6, '#140a24'); g.addColorStop(1, '#07040d');
        c.fillStyle = g; c.fillRect(0, 0, 320, 180);
        for (let i = 0; i < 16; i++) { c.fillStyle = 'rgba(195,139,255,0.12)'; c.fillRect(0, 14 + i * 11 + Math.sin(st.t + i) * 3, 320, 1); }
        eyes.forEach((e) => {
          const y = e.y + Math.sin(st.t * 0.8 + e.ph) * 3;
          const blink = Math.sin(st.t * 0.7 + e.ph * 3) > 0.97;
          c.fillStyle = '#e8edf6'; c.fillRect(Math.round(e.x - e.r), Math.round(y - (blink ? 0 : e.r / 2)), Math.round(e.r * 2), blink ? 1 : Math.round(e.r));
          if (!blink) {
            const a = Math.atan2(st.ptr.y - y, st.ptr.x - e.x);
            c.fillStyle = '#14201a'; c.fillRect(Math.round(e.x + Math.cos(a) * e.r * 0.4 - 1), Math.round(y + Math.sin(a) * 1 - 1), 2, 2);
          }
        });
        // 溶化的時鐘
        if (st.mode === 'ask' && st.phase === 'play' && st.typed >= Q().q.length) {
          const f = Math.max(0, st.modeT / TIME);
          c.fillStyle = '#ffd36b'; c.beginPath(); c.ellipse(292, 34, 12, 12 + (1 - f) * 6, 0, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#2a0f3d'; c.beginPath(); c.moveTo(292, 34); c.arc(292, 34, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - f)); c.closePath(); c.fill();
          c.fillStyle = '#ffd36b'; c.fillRect(290, 46 + (1 - f) * 6, 3, 4 + (1 - f) * 10);
        }
        // 外星面試官
        const glitch = st.mood < 0 && Math.floor(st.t * 14) % 2 === 0;
        P.sprite(c, 'alien', 136 + (glitch ? 2 : 0), 13, { scale: 4, tint: st.mood > 0 ? null : glitch ? '#ff4d5e' : null, pal: st.mood > 0 ? { a: '#c8ff9a' } : null });
        if (insight && st.mode === 'ask' && st.typed >= Q().q.length) {
          const bx = CARD_X[best()] + CARD_W / 2;
          c.strokeStyle = 'rgba(155,227,107,0.35)'; c.lineWidth = 1; c.beginPath();
          c.moveTo(160, 60); c.quadraticCurveTo(160 + (bx - 160) * 0.5, 96, bx, CARD_Y - 2); c.stroke();
        }
        c.fillStyle = '#1e1430'; c.fillRect(100, 68, 120, 12); c.fillStyle = '#2c2140'; c.fillRect(100, 68, 120, 2);
        // 問題框
        c.fillStyle = 'rgba(11,15,26,0.85)'; c.fillRect(8, 82, 304, 26);
        if (st.mode === 'ask' && st.typed >= (st.phase === 'play' ? Q().q.length : 0)) {
          c.fillStyle = '#c38bff'; c.fillRect(8, 106, Math.round(304 * Math.max(0, st.modeT / TIME)), 2);
        }
        // 答案卡
        if (st.phase === 'play' || st.phase === 'end') {
          CARD_X.forEach((x, i) => {
            const picked = st.react && st.react.pick === i;
            c.fillStyle = picked ? '#c38bff' : st.mode === 'react' ? '#1a1228' : '#2c2140';
            c.fillRect(x, CARD_Y, CARD_W, CARD_H);
            c.fillStyle = '#c38bff'; c.fillRect(x, CARD_Y, CARD_W, 2);
          });
        }
        fx.draw(c);
        c.fillStyle = '#0b0f1a'; c.fillRect(0, 0, 320, 13);
      },
      drawText() {
        P.text('第 ' + Math.min(qs.length, st.qi + 1) + ' / ' + qs.length + ' 題', 6, 2, { size: 7, color: '#c38bff', weight: 900 });
        P.text('星際人才發展局', 314, 2, { size: 6, color: '#9be36b', align: 'right', weight: 900 });
        if (st.phase !== 'intro' && st.qi < qs.length) {
          const q = Q();
          if (st.react) P.text('「' + st.react.text + '」', 160, 89, { size: 7, align: 'center', color: st.mood > 0 ? '#c8ff9a' : st.mood < 0 ? '#ff8a9a' : '#e8edf6', weight: 900 });
          else P.text(q.q.slice(0, Math.floor(st.typed)), 160, 88, { size: 8, align: 'center', color: '#ffffff', weight: 900 });
          CARD_X.forEach((x, i) => {
            const picked = st.react && st.react.pick === i;
            P.text('ABC'[i], x + 5, CARD_Y + 4, { size: 6, color: picked ? '#0b0f1a' : '#c38bff', weight: 900 });
            P.text(P.wrap(q.a[i].t, 7), x + CARD_W / 2, CARD_Y + 16, { size: 8, align: 'center', color: picked ? '#0b0f1a' : st.mode === 'react' ? '#6b5a80' : '#ffffff', weight: 900, lineHeight: 1.3 });
            if (sheet && q.a[i].score > 0) P.text('＋', x + CARD_W - 6, CARD_Y + 3, { size: 8, align: 'right', color: '#9be36b', weight: 900 });
          });
        }
        if (sheet) P.text('你手上有一份「標準答案」', 160, 172, { size: 5, align: 'center', color: '#9be36b' });
        C.drawBanner(st);
      },
    };
  }

  IE.Micro.register('interview', Interview);
})(window.IE = window.IE || {});
