// 《靈感撤離 2080》街頭奇遇與人脈（第十期）。
// 奇遇：在浮城做完一件事之後，有機會碰到一件小事，二選一。有些只在某種天氣出現。
// fx：cr 錢、spark 火花、body 身體、soul 靈魂（正數是虧心、負數是放下）、paranoia 偏執、tag 得到一張該標籤的素材、contact 認識一位人脈。
// 人脈：認識之後可以請對方幫忙，每隔 cd 天一次，不用花時段。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA;
  const CONTACTS = [
    { id: 'vivian', name: 'Vivian', title: '天空區收藏家', desc: '只買「有故事」的東西，價錢從不還價。', favor: '收購你的速寫：+$180', cd: 6, fx: { cr: 180 } },
    { id: 'zero', name: '零醫生', title: '黑市義體醫生', desc: '診所在舊地鐵站，招牌是一隻發光的手。', favor: '免費檢查：身體 +30', cd: 6, fx: { body: 30 } },
    { id: 'ching', name: '阿晴', title: '天文台實習生', desc: '負責寫天氣預報，經常寫錯，但寫得很好看。', favor: '「改寫」今天的天氣（重新擲一次）', cd: 8, fx: { weather: true } },
    { id: 'hoi', name: '海叔', title: '舊城潛水教練', desc: '說自己在水底住過三年。', favor: '帶你撈兩件「水」的素材', cd: 6, fx: { tag: 'water', n: 2 } },
    { id: 'r07', name: 'R-07', title: '垃圾回收機械人', desc: '把撿到的東西分類成「有用」和「有感情」。', favor: '送你兩件「機械」素材', cd: 6, fx: { tag: 'machine', n: 2 } },
    { id: 'zed', name: '佐德', title: '外星推廣員', desc: '笑容的角度永遠是三十度。', favor: '一張銀色扭蛋券', cd: 12, fx: { ticket: 'silver' } },
    { id: 'boss', name: '肥龍', title: '內容農場老闆', desc: '手下有一百部手機，每部都在生氣。', favor: '外判稿費：+$120・偏執 +5', cd: 4, fx: { cr: 120, paranoia: 5 } },
    { id: 'lib', name: '書蟲', title: '地下圖書館館員', desc: '把書藏在冷氣機槽裡，借書要對暗號。', favor: '借你一本舊書：「記憶」素材・創作 +1', cd: 6, fx: { tag: 'memory', n: 1, train: { craft: 1 } } },
    { id: 'monk', name: '淨水師父', title: '浮城的和尚', desc: '寺廟淹了，在一艘船上唸經。', favor: '聽經：靈魂 −1.5 克', cd: 8, fx: { soul: -1.5 } },
    { id: 'kid', name: '阿仔', title: '送報童', desc: '浮城最後一個送實體報紙的人，報紙是自己寫的。', favor: '一份「號外」：火花 +0.3', cd: 4, fx: { spark: 0.3 } },
  ];
  const E = (id, text, opts, o) => Object.assign({ id, text, opts }, o || {});
  const O = (label, fx, note) => ({ label, fx, note });
  const ENCOUNTERS = [
    E('lottery', '一個穿西裝的人塞給你一張刮刮卡：「天空區福利彩票，頭獎是一個窗口位。」', [O('刮開', { cr: 30, spark: 0.1 }, '中了 $30'), O('還給對方', { spark: 0.05 })]),
    E('lostdog', '一隻機械狗跟着你走了三條街，頸圈寫着「如拾獲，請送回第 9 層」。', [O('送牠回家', { body: -4, spark: 0.2, contact: 'r07' }, '主人是一部回收機械人'), O('摸摸頭就走', { spark: 0.05 })]),
    E('collector', '一個戴金色口罩的女人看着你手上的素材：「這個，有故事嗎？」', [O('講給她聽', { cr: 60, contact: 'vivian' }, '她留下了名片'), O('說沒有', {})]),
    E('clinic', '你在舊地鐵站門口看見一隻發光的手，招牌下有人在排隊。', [O('排隊看看', { body: 10, cr: -20, contact: 'zero' }, '醫生替你止了舊患'), O('不排了', {})]),
    E('forecast', '天文台的實習生在街上派傳單：「明天的天氣，你想要怎樣？」', [O('「想要彩虹」', { spark: 0.1, contact: 'ching' }, '她在本子上記了下來'), O('「隨便」', {})]),
    E('diver', '一個濕淋淋的大叔從水裡冒出來，手上拿着一個舊鬧鐘。', [O('拉大叔上岸', { body: -3, tag: 'water', contact: 'hoi' }, '大叔把鬧鐘送了給你'), O('拍照', { spark: 0.05 })]),
    E('promoter', '一個笑容角度很準確的人遞上傳單：「加入星際人才發展局，名額有限！」', [O('收下傳單', { paranoia: 3, contact: 'zed' }, '傳單背面有聯絡方法'), O('搖頭', { paranoia: -2 })]),
    E('farmboss', '一個胖子攔住你：「你會不會寫標題？越假越好。」', [O('留下電話', { cr: 40, soul: 0.4, contact: 'boss' }, '對方先付了訂金'), O('走開', { soul: -0.2 })]),
    E('library', '冷氣機槽裡傳出聲音：「暗號？」', [O('「水退之後」', { tag: 'memory', contact: 'lib' }, '一本書從縫裡遞了出來'), O('「沒有暗號」', { paranoia: 2 })]),
    E('monk', '一艘小船上有人在唸經，經文被雨聲蓋住。', [O('坐下聽一會', { soul: -0.6, contact: 'monk' }, '師父說：「重的不是靈魂，是放不下」'), O('繼續趕路', {})]),
    E('paperboy', '一個小孩塞給你一份報紙：「號外！號外！今天一切正常！」', [O('買一份', { cr: -5, spark: 0.15, contact: 'kid' }, '報紙的頭條是你的名字'), O('不用了', {})]),
    E('busker', '天橋底有人在拉二胡，前面的鐵罐只有一個硬幣。', [O('放 $10', { cr: -10, spark: 0.15, soul: -0.2 }), O('站着聽完', { spark: 0.1 })]),
    E('drowned', '水面浮着一本相簿，封面寫着「1997」。', [O('撈起來', { body: -2, tag: 'memory' }), O('讓它漂走', { spark: -0.05 })]),
    E('aiad', '一部廣告機器人跟着你說：「根據你的步速，你今天不快樂。」', [O('承認', { spark: 0.05, paranoia: 2 }), O('跑開', { body: -2, paranoia: -1 })]),
    E('neighbor', '樓下的婆婆在窗口叫你：「後生仔，幫我拿一下這包米。」', [O('幫她拿上樓', { body: -4, spark: 0.15, soul: -0.3 }), O('說趕時間', { soul: 0.2 })]),
    E('wallet', '地上有一個銀包，裡面有 $200 和一張天空區通行證。', [O('交給警察', { soul: -0.5 }), O('拿走現金', { cr: 200, soul: 1.2 })]),
    E('graffiti', '你看見有人在天空區的電梯門上噴字：「我們也在這裡」。', [O('替對方把風', { paranoia: 3, tag: 'rebel' }), O('裝作看不見', {})]),
    E('vending', '一部自動販賣機出錯，一直掉罐裝咖啡出來。', [O('拿兩罐', { body: 4, soul: 0.2 }), O('按「報告故障」', { soul: -0.2 })]),
    E('protest', '一小群人舉着牌：「水位不是我們的錯」。', [O('加入一會', { body: -3, tag: 'anger', paranoia: 2 }), O('拍照轉發', { spark: 0.05 })]),
    E('street', '一個天空區的遊客問你：「這裡的人怎麼還笑得出來？」', [O('「因為不笑會哭」', { spark: 0.1, tag: 'hope' }), O('不回答', {})]),
    // 天氣限定
    E('snowkid', '一群小孩在天台堆雪人，雪人只有一尺高，已經在融化。', [O('幫忙堆', { body: -2, spark: 0.25, tag: 'memory' }), O('拍下來', { spark: 0.1 })], { weather: ['snow'] }),
    E('fishseller', '一個小孩在賣從天上掉下來的魚：「新鮮，從天上空運！」', [O('買一條', { cr: -8, body: 6 }), O('問魚從哪裡來', { tag: 'hunger', paranoia: 1 })], { weather: ['fishrain'] }),
    E('jelly', '一隻發光水母飄到你面前，停住了。', [O('伸手碰一下', { body: -5, spark: 0.3, tag: 'water' }), O('慢慢退後', { spark: 0.05 })], { weather: ['jellysky', 'glowsea'] }),
    E('blackoutsong', '停電的街上，有人點起蠟燭開始唱歌，越來越多人加入。', [O('一起唱', { spark: 0.25, tag: 'warmth' }), O('靜靜聽', { spark: 0.15 })], { weather: ['blackout'] }),
    E('adglitch', '天空的廣告螢幕出錯，打出一行字：「救命，我是被困在雲裡的實習生」。', [O('打電話給天文台', { contact: 'ching', paranoia: 2 }), O('截圖發上網', { cr: 20, paranoia: 3 })], { weather: ['adsky', 'glitch'] }),
    E('floater', '重力異常，一個舊招牌浮到你面前，上面寫着「永遠營業」。', [O('抓住它', { body: -3, tag: 'machine', contact: 'r07' }), O('讓它飄走', { spark: 0.1 })], { weather: ['gravity'] }),
    E('whalewatch', '整條街的人都停下來看天上的鯨魚，沒有人說話。', [O('一起看', { spark: 0.2, soul: -0.3 }), O('趁機去排隊買便宜貨', { cr: 15 })], { weather: ['skywhale'] }),
    E('ufowave', '一艘飛碟降低高度，舷窗裡有人向你揮手。', [O('揮手回應', { paranoia: 4, spark: 0.1, contact: 'zed' }), O('躲進騎樓', { paranoia: -1 })], { weather: ['ufofleet', 'doublemoon'] }),
    E('typhoonroof', '風球下，有人在天台追一塊被吹走的鐵皮。', [O('幫忙抓住', { body: -6, soul: -0.4 }), O('叫對方回去', { spark: 0.05 })], { weather: ['typhoon', 'downpour'] }),
    E('paperfall', '一張從天而降的文件落在你腳邊，蓋着「絕密」的印章。', [O('讀一下', { paranoia: 4, tag: 'rebel' }), O('撕掉', { paranoia: -1 })], { weather: ['paperstorm'] }),
    E('rainbowbet', '有人在彩虹下開賭：「彩虹會不會在十分鐘內消失？」', [O('押「會」', { cr: 25 }), O('押「不會」', { cr: -15, spark: 0.1 })], { weather: ['rainbow', 'clear'] }),
  ];
  Object.assign(D, { CONTACTS, CONTACT_BY: Object.fromEntries(CONTACTS.map((c) => [c.id, c])), ENCOUNTERS });
});
