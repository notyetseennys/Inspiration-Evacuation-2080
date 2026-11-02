// 《靈感撤離 2080》：浮城（城市）的資料。純資料，瀏覽器與 Node 共用。
// 經濟的根據（由 2026 年推演到 2080 年、貨幣體制、難度）見 docs/ECONOMY.md；世界觀見 docs/WORLD.md 第七節。
// 第十五期只有一座城市：第 7 區（本地人叫它「浮城」）。它的倍數全部是 1，即 D.ECON 本身就是這座城市的經濟。
// currency.rate 只用於顯示：介面在最後一步把金額乘 rate（WO-15-14）；邏輯和資料一律用遊戲數值。
// 之後加入的城市用 econ 的倍數表達難度（相對第 7 區）：rent 租金、pay 收入、price 物價、inflation 每輪的物價倍數。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA;

  const CITIES = {
    zone7: {
      name: '浮城',
      zone: '第 7 區',
      treaty: 'grey', // 星際條約：灰人（星際人才發展局）的招聘區
      difficulty: 1, // 1 比較輕鬆 … 5 極難
      difficultyName: '比較輕鬆',
      currency: {
        name: '浮城元',
        symbol: '$',
        rate: 20, // 顯示倍數：介面顯示的金額 = 遊戲數值 × rate（2080 年的票面價格；製作人 2026-11-02 決定，WO-15-14 接上）
        regime: 'peg',
        regimeName: '與星際信用點掛鈎',
      },
      econ: { rent: 1, pay: 1, price: 1, inflation: 1 },
      blurb: '颱風、粵劇、糖水、唐樓、天橋、天台。浮城元與星際信用點掛鈎，物價穩定，找得到散工；代價是這座城市最主要的出口是人。',
    },
  };

  D.CITIES = CITIES;
  D.CITY_DEFAULT = 'zone7';
});
