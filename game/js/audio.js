// 音樂與音效：全部以 Web Audio 即時合成，沒有外部音檔。
// 音樂分為 5 層（含關卡之夜鼓層），由火花與場景控制：火花高時旋律豐富；關卡之夜加一層鼓；外星評審之夜換調。
(function (IE) {
  'use strict';
  let ctx = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null;
  let muted = false, timer = null, step = 0, nextTime = 0;
  let spark = 2, mode = 'city', tempo = 92;
  let lastSfx = '';
  const layers = {};

  const CHORDS = {
    city:  [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],   // Am F C G
    alien: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]],   // C Am F G（創作電梯音樂）
    stage: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]],   // 關卡之夜（加鼓層）
    boss:  [[62, 65, 69], [58, 62, 65], [55, 58, 62], [57, 61, 64]],   // 外星評審之夜（換調：D 和聲小調：Dm Bb Gm A）
    work:  [[57, 60, 64], [57, 60, 64], [56, 60, 63], [56, 60, 63]],   // 單調
  };
  const LEAD = [0, 2, 4, 2, 1, 0, 2, -1, 0, 4, 2, 1, 0, -1, 0, -1];
  const BOSS_LEAD = [0, 3, 2, 1, 4, 2, 1, 0, 2, 5, 3, 2, 1, 0, 2, -1];

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.7; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
    ['beat', 'stageDrum', 'bass', 'arp', 'lead'].forEach((k) => {
      layers[k] = ctx.createGain(); layers[k].gain.value = 0; layers[k].connect(musicBus);
    });
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    nextTime = ctx.currentTime + 0.1;
    timer = setInterval(schedule, 25);
    applyLayers();
  }

  function applyLayers() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const isCreative = mode === 'alien' || mode === 'stage' || mode === 'boss';
    const isStage = mode === 'stage' || mode === 'boss';
    const v = {
      beat: isCreative ? 0.32 : 0.9,
      stageDrum: isStage ? (mode === 'boss' ? 0.85 : 0.68) : 0,
      bass: clamp01((spark - 0.6) / 1.4),
      arp: mode === 'work' ? 0.15 : clamp01((spark - 1.6) / 1.4),
      lead: mode === 'work' ? 0 : clamp01((spark - 2.6) / 1.2),
    };
    if (isCreative) {
      v.bass = mode === 'boss' ? 0.78 : 0.62;
      v.arp = mode === 'boss' ? 0.62 : 0.5;
      v.lead = mode === 'boss' ? 0.88 : 0.8;
    }
    Object.keys(v).forEach((k) => {
      if (layers[k]) layers[k].gain.setTargetAtTime(v[k], t, 0.35);
    });
  }

  function tone(type, freq, start, dur, gain, dest, slideTo) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(dest);
    o.start(start); o.stop(start + dur + 0.02);
  }
  function noise(start, dur, gain, dest, hp) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = hp ? 'highpass' : 'lowpass';
    f.frequency.value = hp || 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(start); src.stop(start + dur + 0.02);
  }

  function schedule() {
    if (!ctx) return;
    const spb = 60 / tempo / 4; // 每個 16 分音符
    while (nextTime < ctx.currentTime + 0.12) {
      playStep(step, nextTime, spb);
      nextTime += spb;
      step = (step + 1) % 64;
    }
  }
  function playStep(i, t, spb) {
    const bar = Math.floor(i / 16) % 4;
    const s = i % 16;
    const chord = (CHORDS[mode] || CHORDS.city)[bar];
    // 機械節拍
    if (s % 8 === 0) tone('sine', 120, t, 0.18, 0.5, layers.beat, 45);
    if (s % 2 === 0) noise(t, 0.03, 0.12, layers.beat, 7000);
    if (s === 4 || s === 12) noise(t, 0.09, 0.18, layers.beat, 1800);
    // 關卡之夜附加鼓層（切分低鼓、過門小鼓與電子鈸）
    if (layers.stageDrum) {
      if (s === 0 || s === 6 || s === 10) tone('sine', 150, t, 0.14, 0.42, layers.stageDrum, 42);
      if (s === 3 || s === 7 || s === 11 || s === 15) noise(t, 0.04, 0.14, layers.stageDrum, 5200);
      if (s === 14 || (bar === 3 && s >= 12)) {
        tone('triangle', 190 - (s - 12) * 22, t, 0.09, 0.25, layers.stageDrum, 70);
        noise(t, 0.06, 0.16, layers.stageDrum, 2400);
      }
    }
    // 低音
    if (s % 4 === 0) tone(mode === 'boss' ? 'sawtooth' : 'triangle', midi(chord[0] - 24), t, spb * 3.5, mode === 'boss' ? 0.22 : 0.35, layers.bass);
    if (mode === 'boss' && s % 4 === 2) tone('triangle', midi(chord[0] - 12), t, spb * 1.5, 0.18, layers.bass);
    // 琶音
    if (s % 2 === 0) tone('square', midi(chord[(s / 2) % 3] + 12), t, spb * 1.6, 0.06, layers.arp);
    // 旋律
    if (s % 4 === 0 || s % 4 === 3 || (mode === 'boss' && s % 4 === 2)) {
      const seq = mode === 'boss' ? BOSS_LEAD : LEAD;
      const deg = seq[(s + bar * 4) % 16];
      if (deg >= 0) tone(mode === 'boss' ? 'sawtooth' : 'triangle', midi(chord[deg % 3] + 12 + (deg >= 3 ? 12 : 0)), t, spb * 2.6, mode === 'boss' ? 0.09 : 0.12, layers.lead);
    }
  }

  // ---------- 十個流派觸發音色 ----------
  const SCHOOL_SFX = {
    // 水淹流：連續上浮氣泡與水流聲
    flood() {
      const t = ctx.currentTime;
      [320, 440, 580].forEach((f, i) => tone('sine', f, t + i * 0.055, 0.11, 0.11, sfxBus, f * 2.1));
      noise(t + 0.02, 0.18, 0.1, sfxBus, 1400);
    },
    // 霓虹流：高壓電流嗡鳴與高頻閃爍
    neon() {
      const t = ctx.currentTime;
      tone('sawtooth', 120, t, 0.22, 0.09, sfxBus, 180);
      tone('square', 1760, t + 0.03, 0.08, 0.07, sfxBus, 2637);
      tone('square', 2349, t + 0.1, 0.09, 0.07, sfxBus, 3136);
    },
    // 陳腔濫調流：黑膠雜音與走音磁帶回聲
    cliche() {
      const t = ctx.currentTime;
      noise(t, 0.24, 0.08, sfxBus, 3000);
      [0, 1, 2].forEach((i) => {
        tone('triangle', 523.25 - i * 9, t + i * 0.075, 0.09, 0.09 * Math.pow(0.7, i), sfxBus);
      });
    },
    // 愧疚流：沉重低音鐘鳴與枷鎖聲
    guilt() {
      const t = ctx.currentTime;
      tone('sine', 110, t, 0.55, 0.18, sfxBus, 98);
      tone('triangle', 164.8, t, 0.45, 0.11, sfxBus);
      tone('sine', 311.1, t + 0.01, 0.35, 0.06, sfxBus);
      noise(t, 0.05, 0.15, sfxBus, 2200);
    },
    // 機械流：高速數據滴答與終端機脈衝
    machine() {
      const t = ctx.currentTime;
      [1600, 2400, 1920, 3200, 2800].forEach((f, i) => tone('square', f, t + i * 0.032, 0.025, 0.065, sfxBus));
    },
    // 飢餓流：空腹低鳴與陶碗敲擊聲
    hunger() {
      const t = ctx.currentTime;
      tone('sine', 96, t, 0.26, 0.15, sfxBus, 52);
      tone('triangle', 480, t + 0.06, 0.08, 0.1, sfxBus, 290);
    },
    // 反叛流：失真五度和弦與噴漆嘶聲
    rebel() {
      const t = ctx.currentTime;
      [48, 55, 60].forEach((n) => tone('sawtooth', midi(n), t, 0.26, 0.08, sfxBus, midi(n) * 1.03));
      noise(t, 0.14, 0.18, sfxBus, 1600);
    },
    // 人情流：溫暖木結他大七和弦琶音
    warmth() {
      const t = ctx.currentTime;
      [65, 69, 72, 76].forEach((n, i) => tone('triangle', midi(n), t + i * 0.04, 0.24, 0.09, sfxBus));
    },
    // 遠方流：空靈風鈴與泛音星芒
    faraway() {
      const t = ctx.currentTime;
      [1318.5, 1568, 1975.5, 2637].forEach((f, i) => tone('sine', f, t + i * 0.05, 0.32, 0.07, sfxBus));
    },
    // 極簡流：單一清脆木魚與留白泛音
    minimal() {
      const t = ctx.currentTime;
      tone('sine', 784, t, 0.12, 0.13, sfxBus, 740);
      tone('triangle', 1568, t, 0.035, 0.08, sfxBus);
    },
  };

  // ---------- 五種媒材質感音 ----------
  const MEDIUM_SFX = {
    // 紙：翻動信紙的沙沙聲
    paper() {
      const t = ctx.currentTime;
      noise(t, 0.065, 0.16, sfxBus, 2600);
      noise(t + 0.035, 0.05, 0.11, sfxBus, 1500);
    },
    // 聲：清亮琴音
    sound() {
      const t = ctx.currentTime;
      tone('triangle', 587.33, t, 0.22, 0.11, sfxBus);
      tone('sine', 1174.66, t, 0.14, 0.05, sfxBus);
    },
    // 影：機械相機快門聲
    image() {
      const t = ctx.currentTime;
      noise(t, 0.018, 0.22, sfxBus, 3800);
      tone('square', 1400, t, 0.02, 0.05, sfxBus, 420);
      noise(t + 0.032, 0.022, 0.18, sfxBus, 2800);
    },
    // 身：低沉雙拍心跳聲
    body() {
      const t = ctx.currentTime;
      tone('sine', 78, t, 0.09, 0.2, sfxBus, 44);
      tone('sine', 68, t + 0.1, 0.11, 0.16, sfxBus, 38);
    },
    // 數：數據機撥號雙頻音
    data() {
      const t = ctx.currentTime;
      tone('sine', 1209, t, 0.055, 0.065, sfxBus);
      tone('square', 697, t, 0.055, 0.04, sfxBus);
      tone('sine', 1477, t + 0.06, 0.065, 0.065, sfxBus);
      tone('square', 852, t + 0.06, 0.065, 0.04, sfxBus);
    },
  };

  // ---------- 音效 ----------
  const SFX = {
    coin() { const t = ctx.currentTime; tone('square', 988, t, 0.06, 0.12, sfxBus); tone('square', 1319, t + 0.05, 0.1, 0.12, sfxBus); },
    spark() { const t = ctx.currentTime; tone('sine', 1200, t, 0.35, 0.06, sfxBus, 260); },
    wrong() { const t = ctx.currentTime; tone('square', 110, t, 0.18, 0.15, sfxBus, 80); },
    combo() { const t = ctx.currentTime; [0, 4, 7, 12].forEach((n, i) => tone('square', midi(72 + n), t + i * 0.05, 0.08, 0.08, sfxBus)); },
    stamp() { const t = ctx.currentTime; noise(t, 0.08, 0.35, sfxBus); tone('sine', 90, t, 0.1, 0.3, sfxBus, 50); },
    click() { const t = ctx.currentTime; tone('square', 660, t, 0.03, 0.05, sfxBus); },
    perfect() { const t = ctx.currentTime; tone('triangle', 1568, t, 0.09, 0.1, sfxBus); tone('triangle', 2093, t + 0.04, 0.1, 0.08, sfxBus); },
    good() { const t = ctx.currentTime; tone('triangle', 1047, t, 0.08, 0.08, sfxBus); },
    splash() { const t = ctx.currentTime; noise(t, 0.4, 0.3, sfxBus); },
    bubble() { const t = ctx.currentTime; tone('sine', 400, t, 0.12, 0.08, sfxBus, 900); },
    pickup() { const t = ctx.currentTime; [0, 7, 12].forEach((n, i) => tone('triangle', midi(76 + n), t + i * 0.06, 0.1, 0.1, sfxBus)); },
    hurt() { const t = ctx.currentTime; noise(t, 0.15, 0.3, sfxBus); tone('sawtooth', 200, t, 0.2, 0.1, sfxBus, 60); },
    tick() { const t = ctx.currentTime; tone('square', 2400, t, 0.02, 0.04, sfxBus); },
    chips() { const t = ctx.currentTime; tone('square', 880 + Math.random() * 200, t, 0.04, 0.06, sfxBus); },
    mult() { const t = ctx.currentTime; tone('sawtooth', 220, t, 0.25, 0.1, sfxBus, 880); },
    boom() {
      const t = ctx.currentTime;
      noise(t, 0.6, 0.4, sfxBus);
      [0, 4, 7, 11, 14].forEach((n, i) => tone('triangle', midi(60 + n), t + i * 0.03, 1.2, 0.09, sfxBus));
    },
    beam() { const t = ctx.currentTime; tone('sine', 180, t, 3.5, 0.15, sfxBus, 1400); tone('triangle', 90, t, 3.5, 0.1, sfxBus, 700); },
    rent() { const t = ctx.currentTime; tone('square', 330, t, 0.15, 0.1, sfxBus); tone('square', 262, t + 0.15, 0.25, 0.1, sfxBus); },
    ad() { const t = ctx.currentTime; tone('square', 1760, t, 0.05, 0.06, sfxBus); tone('square', 1760, t + 0.08, 0.05, 0.06, sfxBus); },
    // 外星評審登場主題：低音加不協和和弦
    judge() {
      const t = ctx.currentTime;
      tone('sawtooth', 65.4, t, 0.9, 0.14, sfxBus, 49);
      tone('triangle', 98, t, 0.95, 0.12, sfxBus, 73.4);
      [36, 42, 49, 54].forEach((n, i) => tone('sawtooth', midi(n), t + 0.18 + i * 0.04, 0.65, 0.06, sfxBus));
      noise(t + 0.32, 0.12, 0.28, sfxBus);
    },
    // 關卡入選：昂揚銅管與星芒琶音
    stagePass() {
      const t = ctx.currentTime;
      [60, 64, 67, 72, 76, 79].forEach((n, i) => {
        tone('triangle', midi(n), t + i * 0.055, 0.32, 0.11, sfxBus);
        tone('square', midi(n + 12), t + i * 0.055, 0.18, 0.045, sfxBus);
      });
      noise(t, 0.08, 0.22, sfxBus);
    },
    // 關卡落選：下墜小調嘆息與低沉印章
    stageFail() {
      const t = ctx.currentTime;
      [64, 63, 60, 55].forEach((n, i) => tone('sawtooth', midi(n), t + i * 0.09, 0.24, 0.08, sfxBus, midi(n - 2)));
      tone('sine', 75, t + 0.28, 0.35, 0.18, sfxBus, 42);
    },
    // 人才檔案升級：清脆上行晶體音階
    levelUp() {
      const t = ctx.currentTime;
      [60, 65, 69, 72, 77, 84].forEach((n, i) => {
        tone('triangle', midi(n), t + i * 0.05, 0.26, 0.1, sfxBus);
        tone('sine', midi(n + 12), t + i * 0.05, 0.18, 0.05, sfxBus);
      });
    },
    // 成就解鎖：閃亮徽章短號
    ach() {
      const t = ctx.currentTime;
      [67, 71, 74, 79, 83].forEach((n, i) => tone('square', midi(n), t + i * 0.045, 0.16, 0.075, sfxBus));
      tone('triangle', midi(91), t + 0.22, 0.35, 0.09, sfxBus);
    },
    // 外星 HR 備忘錄：機械打字機敲擊聲
    typewriter() {
      const t = ctx.currentTime;
      noise(t, 0.015, 0.18, sfxBus, 3200);
      tone('square', 1850 + Math.random() * 350, t, 0.016, 0.045, sfxBus);
    },
  };

  IE.Audio = {
    init,
    get ready() { return !!ctx; },
    get mode() { return mode; },
    get lastSfx() { return lastSfx; },
    setSpark(v) { spark = v; applyLayers(); },
    setMode(m, bpm) {
      mode = m;
      tempo = bpm || (m === 'work' ? 120 : m === 'boss' ? 88 : m === 'stage' ? 84 : m === 'alien' ? 80 : 92);
      applyLayers();
    },
    sfx(name) {
      lastSfx = name;
      if (ctx && SFX[name] && !muted) {
        try { SFX[name](); } catch (e) { /* 音效失敗不影響遊戲 */ }
      }
    },
    school(id) {
      lastSfx = 'school:' + id;
      if (ctx && SCHOOL_SFX[id] && !muted) {
        try { SCHOOL_SFX[id](); } catch (e) { /* 忽略 */ }
      }
    },
    medium(m) {
      lastSfx = 'medium:' + m;
      if (ctx && MEDIUM_SFX[m] && !muted) {
        try { MEDIUM_SFX[m](); } catch (e) { /* 忽略 */ }
      }
    },
    // 創作計分：n 越大音越高（每張素材升半音），營造越計越興奮的感覺
    fx(name, n) {
      if (!ctx || muted) return;
      const t = ctx.currentTime, k = Math.pow(2, Math.min(24, n || 0) / 12);
      try {
        if (name === 'chip') { tone('square', 440 * k, t, 0.07, 0.07, sfxBus); tone('triangle', 880 * k, t, 0.05, 0.04, sfxBus); }
        else if (name === 'mult') { tone('sawtooth', 220 * k, t, 0.12, 0.06, sfxBus, 330 * k); }
        else if (name === 'xmult') { tone('sawtooth', 110, t, 0.35, 0.1, sfxBus, 880); tone('square', 660, t + 0.12, 0.2, 0.08, sfxBus); noise(t, 0.25, 0.15, sfxBus); }
        else if (name === 'burn') { noise(t, 0.6, 0.22, sfxBus); tone('sawtooth', 80, t, 0.6, 0.08, sfxBus, 320); }
        else if (name === 'card') { noise(t, 0.05, 0.12, sfxBus); tone('triangle', 1200 * k, t, 0.04, 0.03, sfxBus); }
        else if (name === 'total') { [0, 4, 7, 12, 16].forEach((d, i) => tone('square', midi(60 + d + Math.min(12, n || 0)), t + i * 0.05, 0.14, 0.07, sfxBus)); }
        else if (name === 'legend') { [0, 3, 7, 10, 14, 19].forEach((d, i) => tone('triangle', midi(55 + d), t + i * 0.07, 0.6, 0.1, sfxBus)); noise(t, 0.8, 0.2, sfxBus); }
      } catch (e) { /* 忽略 */ }
    },
    // 街頭表演的音階（五聲音階）；i 由 0 開始，oct 升八度
    note(i, oct) {
      if (!ctx || muted) return;
      const SCALE = [60, 64, 67, 69, 72, 76];
      try {
        const t = ctx.currentTime, f = midi(SCALE[i % SCALE.length] + (oct ? 12 : 0));
        tone('triangle', f, t, 0.35, 0.14, sfxBus); tone('sine', f * 2, t, 0.2, 0.04, sfxBus);
      } catch (e) { /* 忽略 */ }
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.7, ctx.currentTime, 0.05);
      return muted;
    },
    get muted() { return muted; },
  };
})(window.IE = window.IE || {});
