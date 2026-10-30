// 街頭表演：在天橋底下彈琴（唯一會令火花變旺的工作）
//   - 點唱：觀眾先唱一段旋律，你要按同樣次序彈出來；成功一次，旋律就長一個音
//   - 即興：每段點唱之後有幾秒自由演奏，踩中節拍的音會變成火花
//   - 管理員巡邏時要停手，否則罰款，觀眾也會散去
//   - 收入很少；圍觀的人越多，打賞越多
(function (IE) {
  'use strict';
  const P = IE.Pixel, A = IE.Audio, C = IE.Micro.C;
  const R = () => IE.Rules, D = () => IE.DATA, G = () => IE.Game;
  const PAD_COL = ['#ff4d5e', '#ffc247', '#8be28f', '#37c3d6'];
  const PAD_X = [12, 88, 164, 240], PAD_Y = 142, PAD_W = 68, PAD_H = 32;
  const SONGS = ['《浮城夜曲》', '《交租之歌》', '《外星人請帶我走》', '《水浸街》', '《最後一班渡輪》', '《天台上的貓》', '《標註員之歌》'];
  const SPOTS = [[112, 100], [196, 100], [96, 108], [212, 108], [80, 116], [228, 116], [126, 114], [182, 114], [60, 106], [248, 106], [140, 120], [168, 120]];
  const SOLO_BPM = 112, SOLO_TIME = 4.6;

  function Busk(opts, onDone) {
    const s = G().state;
    const cfg = R().buskConfig(s);
    const fx = P.particles();
    const people = SPOTS.map(([x, y]) => ({ x, y, a: 0, on: false, shirt: ['#ff8fb1', '#37c3d6', '#ffd36b', '#9be36b', '#a77bff', '#ff8a5c'][Math.floor(Math.random() * 6)], hair: ['#2b2140', '#3b2a1e', '#c9a227', '#8d99b4'][Math.floor(Math.random() * 4)], bob: Math.random() * 6 }));
    const st = {
      t: -1.4, phase: 'intro', mode: 'wait', modeT: 0.4, endT: 0, banner: null,
      len: 3, seq: [], idx: 0, lit: [0, 0, 0, 0], song: '', idle: 0,
      crowd: 1, crowdMax: 1, rounds: 0, soloNotes: 0, notes: 0, cr: 0, coins: [],
      inspector: null, msg: null, beatFlash: 0, soloStart: 0,
    };
    const rain = s.season === 'storm';
    C.banner(st, '開唱', '#8be28f', '先聽，再彈');
    A.setMode('city', 80);

    function say(text, color) { st.msg = { text, color: color || '#ffffff', t: 0 }; }
    function setCrowd(n) {
      st.crowd = Math.max(0, Math.min(SPOTS.length, n));
      st.crowdMax = Math.max(st.crowdMax, st.crowd);
      people.forEach((p, i) => { p.on = i < st.crowd; });
    }
    setCrowd(1);
    function coin(n) {
      for (let i = 0; i < n; i++) st.coins.push({ x: 120 + Math.random() * 80, y: 96, vx: (178 - 160) * 0.5 + (Math.random() - 0.5) * 30, vy: -60 - Math.random() * 30, t: 0 });
    }
    function newSeq() {
      st.seq = [];
      for (let i = 0; i < st.len; i++) {
        let n;
        do { n = Math.floor(Math.random() * 4); } while (i >= 2 && n === st.seq[i - 1] && n === st.seq[i - 2]);
        st.seq.push(n);
      }
      st.idx = 0; st.song = SONGS[Math.floor(Math.random() * SONGS.length)];
      st.mode = 'listen'; st.modeT = 0.6;
      say('點唱：' + st.song, '#ffd36b');
    }
    function light(i, dur) { st.lit[i] = dur || 0.25; }
    function press(i) {
      if (st.phase !== 'play' || st.mode === 'listen' || st.mode === 'wait') return;
      light(i, 0.18);
      st.notes++;
      if (st.mode === 'repeat') {
        A.note(i);
        st.idle = 0;
        if (i === st.seq[st.idx]) {
          st.idx++;
          fx.burst(PAD_X[i] + PAD_W / 2, PAD_Y, 5, { color: PAD_COL[i], life: 0.5, speed: 30, up: 20 });
          if (st.idx >= st.seq.length) success();
        } else fail('彈錯了');
      } else if (st.mode === 'solo') {
        if (st.inspector) {
          A.sfx('wrong'); st.cr -= 5; setCrowd(st.crowd - 2); P.view.shake = 4;
          say('管理員：「這裡不准演奏。」罰款 $5', '#ff4d5e');
          st.inspector.caught = true;
          return;
        }
        const beat = 60 / SOLO_BPM, el = st.t - st.soloStart;
        const off = Math.abs(el / beat - Math.round(el / beat)) * beat;
        if (off <= 0.11) {
          A.note(i, true);
          st.soloNotes++;
          if (st.crowd >= 3) { st.cr += 0.25 * cfg.payMult; coin(1); }
          for (let k = 0; k < 6; k++) fx.add({ x: 156 + Math.random() * 12, y: 70, vx: (Math.random() - 0.5) * 50, vy: -40 - Math.random() * 30, g: -10, life: 1.1, color: '#ffc247', size: Math.random() < 0.3 ? 2 : 1 });
        } else A.note(i);
      }
    }
    function success() {
      st.rounds++;
      const pay = (1 + st.crowd * 0.5) * cfg.payMult;
      st.cr += pay; coin(3 + Math.min(6, st.crowd));
      A.sfx('combo');
      setCrowd(st.crowd + 1 + (st.len >= 6 ? 1 : 0));
      const j = D().BUSK_LINES.join;
      say(j[Math.floor(Math.random() * j.length)] + '　+$' + pay.toFixed(1), '#8be28f');
      st.len = Math.min(9, st.len + 1);
      st.mode = 'solo'; st.modeT = SOLO_TIME; st.soloStart = st.t;
      st.inspector = st.rounds >= 2 && Math.random() < 0.35 ? { x: -20, caught: false } : null;
      if (st.inspector) say('管理員來了！停手！', '#ff4d5e');
    }
    function fail(why) {
      A.sfx('wrong');
      setCrowd(st.crowd - 2);
      const l = D().BUSK_LINES.leave;
      say(why + '。' + l[Math.floor(Math.random() * l.length)], '#ff8a9a');
      st.len = Math.max(3, st.len - 1);
      st.mode = 'wait'; st.modeT = 1.2;
    }
    function finish() {
      if (st.phase === 'end') return;
      st.phase = 'end'; st.endT = 0;
      const tip = st.crowd * cfg.payMult;
      st.cr += tip; coin(Math.min(10, st.crowd * 2));
      C.banner(st, '收工', '#ffc247', st.crowd ? '觀眾打賞 $' + tip.toFixed(1) : '沒有人留下來');
    }
    const endTick = C.ender(st, () => ({ cr: Math.max(0, st.cr), rounds: st.rounds, soloNotes: st.soloNotes, notes: st.notes, crowdMax: st.crowdMax }), onDone);
    const KEYS = [['1', 'ArrowLeft', 'd', 'D'], ['2', 'ArrowDown', 'f', 'F'], ['3', 'ArrowUp', 'j', 'J'], ['4', 'ArrowRight', 'k', 'K']];

    return {
      kind: 'busk',
      controls: [0, 1, 2, 3].map((i) => ({ id: 'p' + i, label: '♪' + (i + 1), key: ['←', '↓', '↑', '→'][i] })),
      hint: '「聽」的時候記住亮起的次序，「到你了」就按同樣次序彈出來。即興時段跟著節拍彈，踩中拍子的音會變成火花；管理員出現時要停手。鍵盤：1 至 4、方向鍵或 D F J K。',
      control(id, down) { if (down) press(Number(id.slice(1))); },
      key(k, down) { if (!down) return; KEYS.forEach((ks, i) => { if (ks.includes(k)) press(i); }); },
      pointer(type, x, y) {
        if (type !== 'down') return;
        PAD_X.forEach((px, i) => { if (x >= px && x <= px + PAD_W && y >= PAD_Y - 4 && y <= PAD_Y + PAD_H) press(i); });
      },
      update(dt) {
        st.t += dt;
        if (st.banner) st.banner.t += dt;
        if (st.msg) { st.msg.t += dt; if (st.msg.t > 2.4) st.msg = null; }
        st.lit = st.lit.map((v) => Math.max(0, v - dt));
        st.beatFlash = Math.max(0, st.beatFlash - dt);
        fx.update(dt);
        people.forEach((p) => { p.a += ((p.on ? 1 : 0) - p.a) * Math.min(1, dt * 3); });
        st.coins.forEach((c) => { c.t += dt; c.vy += 220 * dt; c.x += c.vx * dt; c.y += c.vy * dt; if (c.y > 116) { c.y = 116; c.vy = 0; c.vx = 0; } });
        st.coins = st.coins.filter((c) => c.t < 1.6);
        if (st.phase === 'intro' && st.t >= 0) st.phase = 'play';
        if (st.phase === 'play') {
          st.modeT -= dt;
          if (st.mode === 'wait' && st.modeT <= 0) newSeq();
          else if (st.mode === 'listen' && st.modeT <= 0) {
            if (st.idx < st.seq.length) {
              const n = st.seq[st.idx++];
              light(n, cfg.showTime); A.note(n);
              st.modeT = cfg.showTime + 0.12;
            } else { st.mode = 'repeat'; st.idx = 0; st.idle = 0; say('到你了', '#37c3d6'); }
          } else if (st.mode === 'repeat') {
            st.idle += dt;
            if (st.idle > 3.2) fail('你忘了旋律');
          } else if (st.mode === 'solo') {
            const beat = 60 / SOLO_BPM, el = st.t - st.soloStart;
            if (Math.floor(el / beat) !== Math.floor((el - dt) / beat)) { st.beatFlash = 0.12; A.sfx('tick'); }
            if (st.inspector) st.inspector.x += dt * 80;
            if (st.modeT <= 0) {
              if (st.inspector && !st.inspector.caught) say('管理員走了。你忍住了。', '#9fdcff');
              st.inspector = null; st.mode = 'wait'; st.modeT = 0.5;
            }
          }
          if (st.t >= cfg.duration) finish();
          A.setSpark(s.spark + Math.min(0.8, st.soloNotes * 0.02 + st.rounds * 0.03));
        }
        endTick(dt);
      },
      draw(c) {
        // 夜空、天橋
        c.fillStyle = '#0d1430'; c.fillRect(0, 0, 320, 180);
        for (let i = 0; i < 20; i++) { c.fillStyle = i % 4 ? '#2a3a6a' : '#ffd36b'; c.fillRect((i * 67) % 320, 40 + (i * 23) % 40, 1, 1); }
        c.fillStyle = '#3a4256'; c.fillRect(0, 14, 320, 18);
        c.fillStyle = '#4d5872'; c.fillRect(0, 30, 320, 3);
        [30, 120, 210, 300].forEach((x) => { c.fillStyle = '#2a3142'; c.fillRect(x, 33, 12, 90); });
        c.fillStyle = '#ff4fb4'; c.fillRect(250, 50, 40, 10);
        c.fillStyle = '#37c3d6'; c.fillRect(40, 60, 30, 8);
        // 地面（積水倒影）
        c.fillStyle = '#141c33'; c.fillRect(0, 122, 320, 58);
        c.fillStyle = '#1f2a4a'; for (let i = 0; i < 12; i++) c.fillRect((i * 41 + st.t * 6) % 330 - 5, 126 + (i * 7) % 12, 10, 1);
        // 觀眾
        people.forEach((p) => {
          if (p.a < 0.05) return;
          c.globalAlpha = p.a;
          const bob = st.mode === 'solo' && st.beatFlash > 0 ? -1 : Math.round(Math.sin(st.t * 3 + p.bob));
          c.fillStyle = p.shirt; c.fillRect(p.x - 3, p.y - 8 + bob, 7, 9);
          c.fillStyle = '#f2c6a0'; c.fillRect(p.x - 2, p.y - 13 + bob, 5, 5);
          c.fillStyle = p.hair; c.fillRect(p.x - 2, p.y - 14 + bob, 5, 2);
          c.fillStyle = '#2a3350'; c.fillRect(p.x - 2, p.y + 1, 2, 4); c.fillRect(p.x + 1, p.y + 1, 2, 4);
          c.globalAlpha = 1;
        });
        // 你、琴、帽子
        const glow = Math.min(1, st.soloNotes / 20 + st.rounds / 8);
        if (glow > 0.05) { c.fillStyle = 'rgba(255,194,71,' + (0.08 + glow * 0.12) + ')'; c.beginPath(); c.arc(160, 80, 30 + glow * 10, 0, Math.PI * 2); c.fill(); }
        P.sprite(c, IE.Chars.spr(IE.Game.state), 148, 62, { scale: 3, desat: Math.max(0, 0.6 - glow) });
        c.fillStyle = '#1b1b28'; c.fillRect(136, 96, 48, 8);
        for (let i = 0; i < 8; i++) { c.fillStyle = '#e8edf6'; c.fillRect(138 + i * 6, 97, 5, 6); }
        c.fillStyle = '#5a3b2a'; c.fillRect(170, 112, 18, 5); c.fillRect(173, 108, 12, 4);
        st.coins.forEach((cn) => { c.fillStyle = '#ffd36b'; c.fillRect(Math.round(cn.x), Math.round(cn.y), 2, 2); });
        // 管理員
        if (st.inspector) {
          const x = Math.round(st.inspector.x);
          c.fillStyle = '#26334d'; c.fillRect(x, 92, 10, 18);
          c.fillStyle = '#f2c6a0'; c.fillRect(x + 2, 84, 6, 7);
          c.fillStyle = '#1b2440'; c.fillRect(x + 1, 82, 8, 3);
          c.fillStyle = '#ffd36b'; c.fillRect(x + 3, 96, 3, 3);
        }
        // 雨
        if (rain) { c.fillStyle = 'rgba(159,220,255,0.35)'; for (let i = 0; i < 40; i++) c.fillRect((i * 37 + st.t * 40) % 320, (i * 53 + st.t * 220) % 180, 1, 4); }
        // 鍵盤
        PAD_X.forEach((x, i) => {
          const on = st.lit[i] > 0;
          c.fillStyle = on ? PAD_COL[i] : P.mix(PAD_COL[i], '#0b0f1a', 0.7);
          c.fillRect(x, PAD_Y + (on ? 1 : 0), PAD_W, PAD_H - (on ? 1 : 0));
          c.fillStyle = on ? '#ffffff' : P.mix(PAD_COL[i], '#0b0f1a', 0.45); c.fillRect(x, PAD_Y + (on ? 1 : 0), PAD_W, 2);
          if (on) { c.fillStyle = P.rgba(PAD_COL[i], 0.3); c.fillRect(x - 2, PAD_Y - 3, PAD_W + 4, PAD_H + 5); }
        });
        // 即興節拍
        if (st.mode === 'solo') {
          c.strokeStyle = st.beatFlash > 0 ? '#ffc247' : '#4a3b1e'; c.lineWidth = 2;
          c.strokeRect(4, PAD_Y - 6, 312, PAD_H + 10);
        }
        // 點唱進度
        if (st.mode === 'repeat' || st.mode === 'listen') {
          st.seq.forEach((n, i) => {
            const done = st.mode === 'repeat' ? i < st.idx : i < st.idx;
            c.fillStyle = done ? (st.mode === 'repeat' ? PAD_COL[n] : '#8d99b4') : '#26334d';
            c.fillRect(160 - st.seq.length * 5 + i * 10, 134, 8, 3);
          });
        }
        fx.draw(c);
        C.topBar(c, 1 - Math.max(0, st.t) / cfg.duration, '#8be28f');
      },
      drawText() {
        P.text('$ +' + Math.max(0, st.cr).toFixed(1), 6, 1, { size: 9, font: 'num', color: '#8be28f', weight: 400 });
        P.text('觀眾 ' + st.crowd + '　火花音 ' + st.soloNotes, 314, 1, { size: 7, color: '#ffc247', align: 'right' });
        const label = st.mode === 'listen' ? '聽' : st.mode === 'repeat' ? '到你了（' + st.idx + ' / ' + st.seq.length + '）' : st.mode === 'solo' ? (st.inspector ? '管理員巡邏中：停手！' : '即興！跟著節拍彈') : '';
        if (st.phase === 'play' && label) P.text(label, 160, 122, { size: 8, align: 'center', weight: 900, color: st.mode === 'solo' ? (st.inspector ? '#ff4d5e' : '#ffc247') : st.mode === 'repeat' ? '#37c3d6' : '#e8edf6', stroke: '#0d1430' });
        if (st.msg) P.text(st.msg.text, 160, 38, { size: 7, align: 'center', weight: 900, color: st.msg.color, stroke: '#0d1430', alpha: Math.max(0, 1 - Math.max(0, st.msg.t - 1.8) / 0.6) });
        PAD_X.forEach((x, i) => P.text(['←', '↓', '↑', '→'][i] + '　' + (i + 1), x + PAD_W / 2, PAD_Y + 11, { size: 7, align: 'center', color: st.lit[i] > 0 ? '#0b0f1a' : '#e8edf6', weight: 900 }));
        P.text('天橋底', 36, 20, { size: 6, color: '#8d99b4', weight: 900 });
        C.drawBanner(st);
      },
    };
  }

  IE.Micro.register('busk', Busk);
})(window.IE = window.IE || {});
