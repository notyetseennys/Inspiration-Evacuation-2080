// 《靈感撤離 2080》第十五期：五輪模式的狀態機與時間表核心。
// 純邏輯，不涉及 DOM，瀏覽器與 Node（tools/sim.js）共用。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA, R = IE.Rules;

  // 是否為五輪模式
  function on(s) {
    return !!(s && D.MODES[s.mode] && D.MODES[s.mode].rounds);
  }

  // 第幾輪（1..5）
  function roundOf(s, night) {
    const n = night == null ? s.night : night;
    return R.clamp(Math.ceil(n / 3), 1, 5);
  }

  // 這一晚的關卡種類：小展／聯展／外星評審
  function kindOf(night) {
    return ['small', 'big', 'boss'][(night - 1) % 3];
  }

  // 對應標準模式的關卡之夜，讓季節、進度日、評審規則與 KPI 全部沿用現有邏輯
  function dayOfNight(night) {
    return 4 * night;
  }

  // 把正整數四捨五入到三位有效數字
  function sig3(v) {
    if (!v || v <= 0) return 0;
    const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(v)) - 2));
    return Math.round(v / p) * p;
  }

  // 第 k 晚的目標分數
  function target(s, night) {
    const k = night == null ? s.night : night;
    const stMod = IE.Meta && IE.Meta.stakeMod ? IE.Meta.stakeMod(s, 'stageTarget') : 1;
    const ease = s && s.firstRun && k <= 2 ? D.ECON.firstRunEase : 1;
    return sig3(D.ECON.t1 * Math.pow(D.ECON.growth, k - 1) * stMod * ease);
  }

  // 第 r 輪結束時的租金
  function rentOf(s, round) {
    const r = round == null ? roundOf(s) : round;
    const base = D.ECON.rent[R.clamp(r - 1, 0, D.ECON.rent.length - 1)];
    const stMod = IE.Meta && IE.Meta.stakeMod ? IE.Meta.stakeMod(s, 'rent') : 1;
    const wMod = (s && R.worldMods(s).rentMult) || 1;
    const pMod = (s && D.BACKGROUNDS[s.bg] && D.BACKGROUNDS[s.bg].perk && D.BACKGROUNDS[s.bg].perk.rentMult) || 1;
    return Math.round(base * stMod * wMod * pMod);
  }

  IE.Rounds = {
    on,
    roundOf,
    kindOf,
    dayOfNight,
    sig3,
    target,
    rentOf,
  };
});
