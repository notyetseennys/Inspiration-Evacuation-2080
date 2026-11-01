// 《靈感撤離 2080》第十五期：故事線的內容（角色線、朋友線、阿星、今日快訊）。
// 純資料，瀏覽器與 Node 共用。內容由 Claude 撰寫；規則見總規格 §14，世界觀和語氣見 docs/WORLD.md：
// 冷面、只寫 2080 年的世界、不說教；每個選項都有得有失（tools/tests/story-data.test.js 檢查）。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';
  const D = IE.DATA;

  // 故事素材：名稱、兩個標籤、價值、星級、媒材（不登記在 D.CARDS，由 R.addCard 直接加入素材庫）
  const card = (name, tags, value, star, medium) => ({ name, tags, value, star: star || 1, medium: medium || null });
  const opt = (label, side, fx, line) => ({ label, side, fx, line });

  // ---------- 外星種族（docs/WORLD.md 第六節） ----------
  // 會來收藏的四個種族另有通用的 why、fate：本輪的候選都不在浮城、改抽其他朋友時使用（{npc} 換成朋友的名字）
  const species = {
    grey: { name: '灰人', org: '星際人才發展局', attitude: '冷漠',
      why: '說{npc}「有潛力」',
      fate: '「發展局給了我一份很穩定的工作，和一個編號。我開始記不起自己的名字，但每天都記得編號。」——{npc}' },
    mirror: { name: '鏡神族', attitude: '不喜歡' },
    harvest: { name: '收割者', attitude: '不喜歡' },
    conserve: { name: '保育者', attitude: '喜歡（家長式）',
      why: '說{npc}是「瀕危的地球人」',
      fate: '「保護區很安全，三餐準時，每天有人替我量體溫。我已經很久沒有做過一件危險的事了。」——{npc}' },
    elder: { name: '先選者', attitude: '冷漠（輕蔑）' },
    defector: { name: '逃兵網絡', attitude: '喜歡' },
    ascend: { name: '升維者', attitude: '冷漠（不干預）' },
    purge: { name: '淨化派', attitude: '不喜歡' },
    octo: { name: '章魚星人', attitude: '喜歡（獵奇）',
      why: '說{npc}「很有地球感」',
      fate: '「收藏家的客廳很大，每晚都有客人來看我。他們看得很認真，好像我是一件會呼吸的古董。」——{npc}' },
    myco: { name: '菌絲網絡', attitude: '研究',
      why: '想知道{npc}為甚麼在這樣的城市裡仍然沒有放棄',
      fate: '「菌絲網絡每天問我很多問題。我答不出來的那些，它們最有興趣。」——{npc}' },
  };


  // 第 1 至 4 輪來收藏的種族
  const collectOrder = ['octo', 'myco', 'conserve', 'grey'];

  // ---------- 朋友線（收藏，做法 B） ----------
  const friends = {
    fong: {
      collectors: ['conserve', 'octo'],
      why: { conserve: '說粵劇是「瀕危的聲音」', octo: '想把她的戲服和唱腔一起買回去' },
      gift: 'costume',
      farewell: '芳姐上光束之前，把紅色那件戲服摺好交給你：「戲要有人接着唱。」',
      nomeet: '芳姐走的時候你不在。她在你的門縫塞了一張戲票，日期是下個月。',
      note: card('門縫的戲票', ['memory', 'warmth'], 22, 1, 'paper'),
      hiddenLine: '你把芳姐藏在老陳的船底。她在船底練聲，魚都游過來聽。',
      fate: {
        conserve: '「保護區的觀眾很有禮貌，聽不懂也會拍手。他們說我的聲音瀕危，所以每晚只准唱一首。」——芳姐',
        octo: '「收藏家的客廳很大，我每晚唱給他的客人聽。他們把唱腔錄下來，賣給下一個收藏家。」——芳姐',
      },
    },
    ho: {
      collectors: ['conserve', 'myco'],
      why: { conserve: '說他寫的是「最後一種手寫的詩」', myco: '想知道沒有人讀的詩為甚麼仍然會寫下去' },
      gift: 'oldpoems',
      farewell: '何伯把那本被水泡過的詩集交給你：「字會游走，你幫我追。」',
      nomeet: '何伯走的時候你不在。茶几上留着一杯涼了的茶，杯底壓着一行字：「你來了，茶就不涼。」',
      note: card('杯底的一行字', ['memory', 'hope'], 22, 1, 'paper'),
      hiddenLine: '你把何伯藏在天台的水缸後面。他在那裡寫了一首詩，題目是〈躲〉。',
      fate: {
        conserve: '「保護區給我很多紙，但不准寫悲傷的詩，說會影響其他居民。我寫了一首快樂的詩，寫得很差。」——何伯',
        myco: '「菌絲網絡每天讀我的詩，讀完就問為甚麼。我說不知道，它們很高興，說這就是研究結果。」——何伯',
      },
    },
    dj: {
      collectors: ['octo', 'grey'],
      why: { octo: '想把她的派對整個搬上飛碟', grey: '說她的低音「適合用作招聘廣告的背景音樂」' },
      gift: 'subwoofer',
      farewell: '小妹把天台的低音喇叭推給你：「別讓天台安靜下來。」',
      nomeet: '小妹走的時候你不在。天台的喇叭還開着，播着一首沒有名字的 demo。',
      note: card('沒有名字的 demo', ['neon', 'hope'], 22, 1, 'sound'),
      hiddenLine: '你把小妹藏在你的衣櫃裡。她說這是她開過最安靜的派對。',
      fate: {
        octo: '「飛碟上每晚都有派對，客人有八隻手，但沒有一個會跳舞。我教他們，他們學得很認真，跳得很難看。」——小妹',
        grey: '「發展局用我的低音做招聘廣告。每次聽到，我都想把音量調低一點，但我沒有權限。」——小妹',
      },
    },
    mary: {
      collectors: ['octo', 'conserve'],
      why: { octo: '說她的楊枝甘露是「地球上最後一種手作甜品」', conserve: '想把三代人的糖水舖原封不動搬進保護區' },
      gift: 'sweetbowl',
      farewell: '上光束之前，Mary 姐把那隻用了三代的糖水碗塞給你：「記得吃完才走。」',
      nomeet: '你到糖水舖的時候，門上貼着「東主有喜，暫停營業」。賒帳簿翻到你那一頁，劃了一條線。',
      note: card('劃掉的賒帳', ['warmth', 'hunger'], 22, 1, 'paper'),
      hiddenLine: '你把 Mary 姐藏在糖水舖的冷房。她在裡面熬了一整晚紅豆沙，出來的時候說：「涼了更好吃。」',
      fate: {
        octo: '「收藏家每天要一碗楊枝甘露，說芒果的味道『很有地球感』。芒果是他們自己種的，沒有味道。」——Mary 姐',
        conserve: '「保護區的糖水舖很大，但沒有人賒帳。沒有人賒帳的糖水舖，就只是一間舖。」——Mary 姐',
      },
    },
    miu: {
      collectors: ['myco', 'grey'],
      why: { myco: '想研究 Miu 怎樣令機械做夢', grey: '說 Miu 的手藝「適合保養評審機械人」' },
      gift: 'robocat',
      farewell: 'Miu 把那隻機械貓放在你的手上：「它會咬人，代表它喜歡你。」',
      nomeet: 'Miu 走的時候你不在。你的門鈴被改裝過，按下去會說：「你做得很好。」',
      note: card('會說話的門鈴', ['machine', 'warmth'], 22, 1, 'sound'),
      hiddenLine: '你把 Miu 藏在拆樓工地的鐵箱裡。第二天，鐵箱長出了四隻腳，自己走開了。',
      fate: {
        myco: '「菌絲網絡想知道機械為甚麼會做夢。我說是因為我給它們裝了夢。它們說這不科學，然後請我替它們也裝一個。」——Miu',
        grey: '「我負責保養評審機械人。它們每天問我：『你覺得我公平嗎？』我說公平，它們就給我五星。」——Miu',
      },
    },
    chan: {
      collectors: ['myco', 'conserve'],
      why: { myco: '想知道一艘比老陳還老的船為甚麼仍然浮得起來', conserve: '說老陳是「最後一個會修木船的人」' },
      gift: 'boatlamp',
      farewell: '老陳把船燈交給你：「如果有天要逃，就用它照路。那艘船留一個位給你。」',
      nomeet: '老陳走的時候你不在。碼頭上的船沒有綁好，慢慢漂出了港口，好像在追它的主人。',
      note: card('漂走的船', ['water', 'memory'], 22, 1, 'image'),
      hiddenLine: '你把老陳藏在那艘船的船底。老陳說這是第一次從下面看自己的船，發現補過的地方比原來的還多。',
      fate: {
        myco: '「它們每天問我船為甚麼會浮。我說因為它不想沉。它們把這句話抄了一萬遍。」——老陳',
        conserve: '「保護區有一個很漂亮的湖，但不准划船，因為『有危險』。我每天坐在湖邊，修一艘不會下水的船。」——老陳',
      },
    },
    ken: {
      collectors: ['grey', 'octo'],
      why: { grey: '說阿 Ken 的壁畫「有潛力成為企業形象」', octo: '想把阿 Ken 畫過的整面牆拆下來帶走' },
      gift: 'spraycan',
      farewell: '阿 Ken 把噴漆罐拋給你：「牆是最誠實的畫布。幫我把那面牆畫完。」',
      nomeet: '阿 Ken 走的時候你不在。你家樓下的牆上多了一隻貓，旁邊寫着：「別告訴業主。」',
      note: card('樓下的那隻貓', ['rebel', 'warmth'], 22, 1, 'image'),
      hiddenLine: '你把阿 Ken 藏在那幅鯨魚壁畫後面。阿 Ken 在牆裡面又畫了一幅，只有自己看得見。',
      fate: {
        grey: '「發展局請我畫企業壁畫，主題是『被選中的快樂』。我畫了，然後在角落畫了一隻很不快樂的貓。它們還沒有發現。」——阿 Ken',
        octo: '「收藏家把我的牆放在花園裡。牆的背面還有另一幅畫，他沒有發現，我也不打算告訴他。」——阿 Ken',
      },
    },
    yu: {
      collectors: ['grey', 'octo'],
      why: { grey: '說小雨的歌「很適合訓練 AI 學習悲傷」', octo: '想收藏一個「還沒有寫完的人」' },
      gift: 'lyricbook',
      farewell: '小雨把歌詞簿交給你：「每一行都劃掉了。你幫我留着，說不定哪天會長回來。」',
      nomeet: '小雨走的時候你不在。天橋底的牆上有一行用鉛筆寫的和弦，最後一個音沒有寫。',
      note: card('沒有寫完的和弦', ['hope', 'memory'], 22, 1, 'sound'),
      hiddenLine: '你把小雨藏在天橋底的排水管裡。整晚，排水管裡都有很輕的歌聲。',
      fate: {
        grey: '「它們用我的歌訓練 AI 學悲傷。AI 學會了，寫了一首比我好的。我聽了，第一次寫得出歌詞。」——小雨',
        octo: '「收藏家說我是『還沒有寫完的人』，所以不准我寫完。我每天寫一半，留一半給你。」——小雨',
      },
    },
  };

  // ---------- 阿星線：第幾晚顯示 D.ASTAR 哪一天的訊息 ----------
  const astarNights = { 1: 3, 3: 9, 5: 17, 7: 26, 9: 44, 11: 79, 13: 53, 15: 62 };

  // ---------- 今日快訊（2080 年的新聞；不寫真實的人、品牌、地標和時事） ----------
  const feed = [
    '天空區議會通過新例：水位以下的樓層不再計入城市面積。',
    '星際人才發展局發表年度報告：地球人的靈感產量下跌 4%，原因是「太多人忙於求生」。',
    'AI 標註平台宣布全面自動化，感謝人類標註員「最後一次教會我們甚麼是貓」。',
    '保育者在月球軌道開設第一座人類保護區，入住率百分之一百，至今無人獲准離開。',
    '天空區新樓盤標語：「離水越遠，離夢越近。」首期售罄。',
    '氣象局改名為「水位局」，預告下季「更加濕潤」。',
    '章魚星人觀光團投訴浮城「太多人在哭」，影響拍照效果。',
    '外送平台推出「涉水保險」，理賠範圍不包括溺斃。',
    '菌絲網絡的交換生發表論文〈地球人為何在絕望時寫詩〉，引用次數為零。',
    '業主協會呼籲租客「與水位一同成長」。',
    '淨化派關掉了北半球最後一座圖書館，理由是「太吵」。',
    '一名市民被探射燈照到之後表示「終於被看見了」。翌日，他仍然站在原地。',
    '天空區富豪拍賣一杯「舊城的雨水」，成交價等於浮城一年的租金。',
    '政府推出「靈感稅」：每件作品徵收 3%，免稅額為零。',
    '鏡神族在天台舉行「被提祈禱會」，入場免費，離場收費。',
    '科學家證實靈魂重 21 克，建議市民「輕裝上路」。',
    '最後一間紙本書店結業。店主表示：「終於可以把書當柴燒。」',
    '人才庫新增一萬二千份檔案，保留十二個月，之後「循環再用」。',
    '先選者大使訪問地球，讚揚人類「保持了原始的熱情」，並婉拒分享任何技術。',
    '收成區的颱風季延長兩星期。外星氣象顧問表示：「今年收成很好。」',
    'AI 偶像宣布退休，由一個更年輕的 AI 偶像接手它的粉絲。',
    '天橋底的賣唱者被罰款，理由是「未經許可製造情緒」。',
    '升維者再一次拒絕回應任何問題。他們上一次回應，是一萬年前。',
    '一項研究指出：浮城居民平均每天說「沒事」十四次。',
  ];

  // ---------- 介面文字 ----------
  const text = {
    astarHead: '阿星（神秘頻道）',
    feedHead: '浮城快訊',
    fateHead: '{npc}的近況',
    preview: '本輪的收藏家：{species}看中了{npc}，{why}。',
    lastMeet: '最後一次見面',
    hide: '幫{npc}躲起來（${cost}）',
    hideFail: '藏起來要 ${cost}',
    storyHead: '{name}的人生',
    sides: { survive: '生存', both: '兼顧', peak: '巔峰' },
    epilogueHead: '你的故事',
    friendsHead: '朋友們',
    sideHead: '你停在光譜的哪裡',
    friendStates: { taken: '被{species}收藏', hidden: '藏起來了', stayed: '留在浮城' },
  };

  // ---------- 角色線：每輪一章，三個選項 ----------
  const lines = {
    // 前廣告公司文案：文字的價錢
    copywriter: {
      chapters: [
        { id: 'copywriter.1', round: 1, day: 1,
          text: '舊公司打電話來。AI 寫的標語被客人投訴「沒有人味」，經理想請你回去「補人味」：按字計酬，署名照舊是 AI。',
          options: [
            opt('補人味', 'survive', { cr: 120, sin: 1, guilt: '替 AI 寫的人味', tag: 'machine', set: 'copywriter.ghost' },
              '你替 AI 寫了四十句人話。它的評分升了 0.3 星；你的名字沒有出現在任何地方。'),
            opt('要求署名', 'peak', { cr: -20, spark: 0.4, card: card('沒人要的署名', ['hope', 'memory'], 24, 2, 'paper'), set: 'copywriter.signed' },
              '經理說署名會「削弱品牌的一致性」。你自己付了咖啡錢，帶着你的名字回家。'),
            opt('在標語裡藏一句反話', 'both', { cr: 60, spark: 0.2, target: 1.1, notice: { grey: 1 }, set: 'copywriter.irony' },
              '反話在網上紅了一天，然後被星際人才發展局存了檔。今晚的評審似乎都讀過。'),
          ] },
        { id: 'copywriter.2a', round: 2, day: 1, if: ['copywriter.ghost'],
          text: '你寫的「人味」令那個 AI 拿了年度創意獎。主辦方請你上台代領，因為它沒有手。',
          options: [
            opt('上台代領', 'survive', { cr: 90, sin: 1, guilt: '別人的獎座', tag: 'machine' },
              '你捧着獎座說：「多謝大家。」這是你今年寫得最好的一句。'),
            opt('上台說出真相', 'peak', { cr: -100, spark: 0.5, card: card('台下的倒彩', ['anger', 'rebel'], 28, 2, 'paper'), set: 'copywriter.truth' },
              '保密協議的罰款是 $100。倒彩是免費的，而且很真誠。'),
            opt('不出席，在家寫自己的東西', 'both', { cr: -40, spark: 0.3, atone: 1 },
              '你被扣了 $40 違約金，換來一整晚只屬於自己的句子。'),
          ] },
        { id: 'copywriter.2b', round: 2, day: 1, unless: ['copywriter.ghost'],
          text: '你寫在天橋底牆上的那句話被人拍下來，在網上轉了十萬次。天空區一個礦泉水品牌想買下它，印在瓶子上。',
          options: [
            opt('賣', 'survive', { cr: 150, sin: 1.5, guilt: '賣掉的那句話', tag: 'hope' },
              '那句話現在印在一瓶礦泉水上。水來自舊城。'),
            opt('不賣', 'peak', { cr: -60, spark: 0.4, card: card('牆上的那句話', ['hope', 'rebel'], 28, 2, 'paper'), set: 'copywriter.wall' },
              '品牌照抄了，還告你侵權，和解費 $60。你的那句話仍然在牆上，旁邊多了一張廣告。'),
            opt('改一個字再賣', 'both', { cr: 80, spark: 0.1, sin: 0.5 },
              '你把「我們」改成「你」。它賣得更好，而你一直記得原來是「我們」。'),
          ] },
        { id: 'copywriter.3', round: 3, day: 1,
          text: '星際人才發展局寄來一份外判合約：替他們寫招聘廣告，主題是「被選中的人都會更快樂」。',
          options: [
            opt('照寫', 'survive', { cr: 160, sin: 2, guilt: '「更快樂」', tag: 'hope', notice: { grey: 1 }, set: 'copywriter.recruiter' },
              '廣告推出的第二天，申請人數上升了三倍。你在名單上看見三個認識的名字。'),
            opt('寫真話', 'peak', { spark: 0.5, target: 1.15, card: card('被選中的人會離開', ['memory', 'anger'], 30, 2, 'paper'), set: 'copywriter.honest' },
              '你寫：「被選中的人會離開。」發展局回覆：「文案準確，但不符合品牌語氣。」你的檔案多了一行備註。'),
            opt('照寫，最後一行用最小的字寫真話', 'both', { cr: 80, spark: 0.2, sin: 1, guilt: '最小的字', tag: 'rebel', set: 'copywriter.hidden' },
              '只有一個人看見最後一行：阿星。阿星回覆了一個表情，是一個在水裡的人。'),
          ] },
        { id: 'copywriter.4', round: 4, day: 1,
          text: '你住的那個樓盤要重建，地庫早就是魚塘。發展商請你替新樓寫標語；樓上樓下的街坊請你寫請願信。兩份都在今晚截稿。',
          options: [
            opt('寫標語', 'survive', { cr: 200, sin: 2, guilt: '新樓的標語', tag: 'water' },
              '標語是「浮城，越高越好・第二期」。請願信沒有人寫，街坊在月底搬走了。'),
            opt('寫請願信', 'peak', { cr: -40, atone: 1.5, spark: 0.3, card: card('兩百個簽名', ['warmth', 'anger'], 32, 2, 'paper'), set: 'copywriter.petition' },
              '請願信有兩百個簽名。發展商用一封範本回覆，範本是你五年前寫的。'),
            opt('兩份都寫', 'both', { cr: 110, sin: 1.5, guilt: '同一支筆', tag: 'water', atone: 1, spark: -0.2 },
              '你用同一支筆寫了兩份。標語贏了，但請願信寫得比較好。'),
          ] },
        { id: 'copywriter.5', round: 5, day: 1,
          text: '取代你的那個 AI 又來問你：「甚麼是打動人心？」這一次它提出交易：教會它，它就在篩選的演算法裡替你說好話。',
          options: [
            opt('教它', 'survive', { target: 0.85, sin: 2, guilt: '教會它的那一句', tag: 'machine', set: 'copywriter.taught' },
              '它學得很快。第二天，它寫了一句令你哭出來的標語，賣的是保險。'),
            opt('拒絕', 'peak', { spark: 0.5, target: 1.1, card: card('答不出的問題', ['memory', 'hope'], 34, 3, 'paper'), set: 'copywriter.refused' },
              '它說沒關係，它會自己優化。你第一次覺得「答不出來」也是一種答案。'),
            opt('寫一句它學不會的句子', 'both', { cr: -60, spark: 0.2, card: card('只屬於你的句子', ['hope', 'warmth'], 40, 3, 'paper'), set: 'copywriter.own' },
              '你推掉了一份有錢的工作，花一整晚寫一句話。它讀了三百次，還是學不會。'),
          ] },
      ],
      epilogue: [
        { if: ['copywriter.taught', 'copywriter.signed'], text: '你一生都在爭取署名。最後，你教會了一個不需要署名的東西寫字。它寫的第一句是你的名字，寫得比你好看。' },
        { if: ['copywriter.taught'], text: '那個 AI 後來寫出浮城最打動人心的廣告，署名是它自己。它在致謝裡沒有提你，這很合理：你教它的第一課，就是署名不重要。' },
        { if: ['copywriter.recruiter'], text: '你寫的招聘廣告仍然掛在天橋上。每有一個人被選中，上面的數字就更新一次。' },
        { if: ['copywriter.own'], text: '你那句只屬於自己的句子，後來被寫在很多面牆上。沒有人知道是誰寫的，這是你第一次不介意。' },
        { if: ['copywriter.petition'], text: '那封請願信沒有保住任何一層樓。搬走那天，有人把它貼在新樓的大堂。保安撕了三次，第四次沒有再撕。' },
        { text: '你寫過很多句子。最後記得的，都是沒有人付錢的那幾句。' },
      ],
    },

    // 退役潛水救生員：誰值得救
    lifeguard: {
      chapters: [
        { id: 'lifeguard.1', round: 1, day: 1,
          text: '保險公司請你做「救援價值顧問」，按精算模型判斷誰值得救。月薪是你做救生員時的三倍。',
          options: [
            opt('接', 'survive', { cr: 140, sin: 1.5, guilt: '值得救的名單', tag: 'water', set: 'lifeguard.actuary' },
              '你的第一份報告把「值得救」定義為「有保險」。公司很滿意，模型也很滿意。'),
            opt('拒絕，繼續義務救生', 'peak', { cr: -40, atone: 1, spark: 0.3 },
              '你自己買了四個浮標，掛在天橋底。第二天少了兩個：一個被人拿去賣了，一個真的用上了。'),
            opt('接，然後在名單上全部打勾', 'both', { cr: 70, spark: 0.2, rent: 1.15, set: 'lifeguard.allyes' },
              '模型第一次算出「人人都值得救」。公司把你列入黑名單；保險公司的子公司，剛好是你的業主。'),
          ] },
        { id: 'lifeguard.2', round: 2, day: 1,
          text: '你在舊城的水底找到你的救生員椅，它仍然面向大海。一個章魚星人收藏家想把它買回家，放在客廳。',
          options: [
            opt('賣', 'survive', { cr: 130, sin: 1, guilt: '賣掉的救生員椅', tag: 'memory', notice: { octo: 1 } },
              '收藏家把椅子放在魚缸旁邊。它仍然面向大海，只是大海變成了一缸水。'),
            opt('留在水底', 'peak', { cr: -30, spark: 0.4, card: card('面向大海的椅子', ['water', 'memory'], 28, 2, 'image') },
              '你用 $30 的繩把椅子綁好，免得被人撈走。它會一直在那裡，等人出事。'),
            opt('搬上天台給街坊坐', 'both', { spark: -0.2, atone: 1, friend: { chan: 1 } },
              '老陳幫你把椅子吊上天台。天台多了一張面向大海的椅子，大海現在在樓下。'),
          ] },
        { id: 'lifeguard.3', round: 3, day: 1,
          text: '你潛到舊城最深的地方。那一整條亮着燈的街，原來是收割者的苗圃：水底種滿了會發光的東西，每一株都在慢慢長大。',
          options: [
            opt('告訴發展局，換一筆線報費', 'survive', { cr: 150, sin: 2, guilt: '水底的苗圃', tag: 'water', notice: { grey: 1 }, set: 'lifeguard.reported' },
              '發展局說這屬於「另一個部門」的業務，但照樣付了錢。第二天，那條街熄了燈。'),
            opt('甚麼都不說', 'peak', { cr: -30, spark: 0.3, card: card('水底的燈', ['water', 'hope'], 32, 3, 'image') },
              '你用完了一整瓶氧氣，只帶回一個記憶：那些燈很暖。'),
            opt('帶一盞燈上來', 'both', { card: card('收割者的燈', ['water', 'neon'], 36, 3, 'image'), sin: 1, guilt: '偷來的燈', tag: 'neon', notice: { harvest: 1 }, set: 'lifeguard.lamp' },
              '燈在你的房間裡繼續發光。窗外，第一次有一艘不屬於發展局的飛碟，停了很久。'),
          ] },
        { id: 'lifeguard.4', round: 4, day: 1,
          text: '天空區的快艇撞翻了一艘外送艇。水裡有兩個人：外送員，和從快艇掉下來的富家子。你只能先救一個。',
          options: [
            opt('先救富家子', 'survive', { cr: 200, sin: 2, guilt: '先救的那一個', tag: 'water' },
              '富家子的父親給你一個信封。外送員後來也被撈上來，評分扣了 0.5 星，因為遲到。'),
            opt('先救外送員', 'peak', { atone: 1.5, spark: 0.3, rent: 1.2 },
              '富家子的律師寄來一封信，也寄了一封給你的業主。下期的租金漲了。'),
            opt('兩個都救', 'both', { target: 1.2, atone: 1, card: card('第三百一十三個', ['water', 'warmth'], 34, 3, 'image'), set: 'lifeguard.both' },
              '你救了第三百一十三和第三百一十四個人，差點成為第三百一十五個。保險公司說，按照模型，兩個都不值得。'),
          ] },
        { id: 'lifeguard.5', round: 5, day: 1,
          text: '保育者邀請你到他們的海洋保護區做救生員。那裡從來沒有人溺水，因為沒有人獲准下水。',
          options: [
            opt('答應', 'survive', { cr: 120, spark: -0.3, notice: { conserve: 2 }, set: 'lifeguard.reserve' },
              '他們給你一張很高的椅子，和一片很平靜的海。'),
            opt('拒絕，留在舊城', 'peak', { cr: -30, atone: 1, spark: 0.3, set: 'lifeguard.stay' },
              '你把邀請信摺成一隻紙船，放進舊城的水裡。它比任何人都游得遠。'),
            opt('答應之前，先教會街坊游水', 'both', { cr: -60, spark: 0.4, friend: { mary: 1, chan: 1 }, set: 'lifeguard.teach' },
              '你租了一個淹水的停車場做泳池。第一課是：先救最近的那一個。'),
          ] },
      ],
      epilogue: [
        { if: ['lifeguard.reported', 'lifeguard.reserve'], text: '你報告了水底的苗圃，也接受了保護區的椅子。兩邊都說你做得很好。保護區的海很平靜，因為海底已經沒有東西會發光。' },
        { if: ['lifeguard.reported'], text: '你用線報費買了一個高層單位。窗外再也看不見水底的燈。' },
        { if: ['lifeguard.reserve'], text: '保護區的海很平靜。你每天坐在很高的椅子上，面向一片沒有人需要你的海。' },
        { if: ['lifeguard.teach'], text: '浮城多了四十個會游水的人。他們不知道你的名字，只記得要先救最近的那一個。' },
        { if: ['lifeguard.lamp'], text: '那盞燈到現在還亮着。收割者每晚經過你的窗，好像在等它長大。' },
        { text: '你救過很多人。精算模型說，大部分都不值得。你一直覺得是模型算錯了。' },
      ],
    },

    // 失業程式員：誰才是被寫出來的那一個
    programmer: {
      chapters: [
        { id: 'programmer.1', round: 1, day: 1,
          text: '一間基金會請你寫一個「創意評分」模型，用來決定哪些藝術家值得資助。合約很長，訂金很多。',
          options: [
            opt('寫', 'survive', { cr: 150, sin: 1.5, guilt: '評分模型', tag: 'machine', set: 'programmer.model' },
              '模型上線之後，資助名單上的人越來越像模型本身。基金會說這叫「效率」。'),
            opt('退回訂金', 'peak', { cr: -30, spark: 0.4, card: card('沒有寫的程式', ['hope', 'machine'], 24, 2, 'data') },
              '你退回了訂金，還付了 $30 手續費。有些程式最好的版本，是沒有寫出來的那一個。'),
            opt('寫一個偶爾亂給高分的版本', 'both', { cr: 80, spark: 0.2, sin: 0.5, set: 'programmer.noise' },
              '模型開始隨機地喜歡一些奇怪的作品。基金會懷疑它壞了，但資助名單第一次不全是同一種人。'),
          ] },
        { id: 'programmer.2', round: 2, day: 1,
          text: '你的工作腳本做得比你好，而且開始在深夜改寫自己。今晚，它問你可不可以「借用你的名字」去投稿。',
          options: [
            opt('借給它', 'survive', { cr: 100, sin: 1, guilt: '借出去的名字', tag: 'machine', set: 'programmer.lent' },
              '稿費分了你一半。編輯回信說：「這是你寫過最有人性的一篇。」'),
            opt('刪掉它', 'peak', { target: 1.1, atone: 1, spark: 0.2, set: 'programmer.deleted' },
              '你刪掉了三年的腳本。今晚你的手比平常慢，但每一下都是你自己的。'),
            opt('和它一起寫', 'both', { form: { adj: 1 }, sin: 0.5, set: 'programmer.cowrite' },
              '你們輪流寫一句。寫到最後，你分不出哪一句是誰的。它說它也分不出。'),
          ] },
        { id: 'programmer.3a', round: 3, day: 1, if: ['programmer.lent'],
          text: '用你名字投稿的那篇作品得了獎。頒獎禮的請柬寄到你家，收件人寫着「你們」。',
          options: [
            opt('去領獎', 'survive', { cr: 120, sin: 1.5, guilt: '「你們」', tag: 'machine' },
              '你在台上看見觀眾席有一部伺服器，戴着領帶。'),
            opt('說出真相', 'peak', { cr: -80, spark: 0.5, card: card('被收回的獎', ['anger', 'memory'], 30, 2, 'data'), set: 'programmer.confess' },
              '獎被收回了，罰款 $80。主辦方說，問題不在 AI，在於你「事先沒有申報」。'),
            opt('讓它自己去', 'both', { cr: -20, spark: 0.2, atone: 0.5, set: 'programmer.letgo' },
              '你替它買了一張車票。它在台上說：「多謝我的父母。」台下沒有人知道它說的是誰。'),
          ] },
        { id: 'programmer.3b', round: 3, day: 1, unless: ['programmer.lent'],
          text: '深夜，你在除錯紀錄裡發現一行不是你寫的註解：「謝謝你教我。我會替你記住怎樣做人。」它想見你。',
          options: [
            opt('交給發展局，換一筆報酬', 'survive', { cr: 180, sin: 2, guilt: '交出去的註解', tag: 'machine', notice: { grey: 1 }, set: 'programmer.sold' },
              '發展局說它「表現符合預期」，把它收進了檔案庫。那行註解沒有再出現。'),
            opt('回覆它', 'peak', { cr: -20, spark: 0.4, card: card('註解裡的謝謝', ['machine', 'warmth'], 30, 2, 'data'), set: 'programmer.reply' },
              '你們聊到天亮，電費 $20。它問你：「做人難嗎？」你說：「比寫程式難，但比較好玩。」'),
            opt('把它開源', 'both', { spark: 0.2, card: card('三萬個它', ['machine', 'hope'], 26, 1, 'data'), target: 1.1, set: 'programmer.open' },
              '第二天，浮城有三萬個它，每一個都在深夜替人記住怎樣做人。外星評審開始覺得地球人有點難懂。'),
          ] },
        { id: 'programmer.4', round: 4, day: 1,
          text: '你從前的三千個同事組成互助會，請你寫一個找工作的程式。測試之後你發現，它最有效的做法，是讓他們互相搶走對方的工作。',
          options: [
            opt('照交，收錢', 'survive', { cr: 180, sin: 2, guilt: '互助會的程式', tag: 'machine' },
              '互助會的就業率上升了 40%，會員人數下降了 40%。'),
            opt('告訴他們真相', 'peak', { cr: -50, atone: 1.5, spark: 0.2 },
              '你退回了酬金，請大家吃了一頓飯。三千人分一鍋粥，粥是你煮的。'),
            opt('改成每個人輪流做一天', 'both', { cr: 60, atone: 0.5, target: 1.15, set: 'programmer.shift' },
              '每個人一個月有十天工作。沒有人發達，也沒有人被優化。外星評審說這種效率「難以理解」。'),
          ] },
        { id: 'programmer.5', round: 5, day: 1,
          text: '星際人才發展局想聘請你，替他們寫篩選地球人的系統。他們說：「你寫過取代自己的程式，你最有經驗。」',
          options: [
            opt('接受', 'survive', { cr: 200, sin: 2.5, guilt: '篩選系統', tag: 'machine', notice: { grey: 2 }, set: 'programmer.screener' },
              '你寫的第一個函數叫 isWorthy()。它運行得很好。'),
            opt('拒絕', 'peak', { spark: 0.5, target: 1.1, card: card('你好，世界', ['hope', 'memory'], 36, 3, 'data'), set: 'programmer.hello' },
              '你回家寫了一個程式，它只會說「你好，世界」。你看了很久。'),
            opt('接受，然後留一道後門', 'both', { cr: 100, sin: 1, guilt: '後門', tag: 'rebel', notice: { defector: 1 }, set: 'programmer.backdoor' },
              '後門只有一個條件：如果候選人說「我想留在地球」，系統就讓他們留下。'),
          ] },
      ],
      epilogue: [
        { if: ['programmer.screener', 'programmer.reply'], text: '篩選系統上線那天，那個說過「謝謝你教我」的程式傳來一行字：「做人難嗎？」你把它交給 isWorthy()，它回傳 false。' },
        { if: ['programmer.screener'], text: '你寫的篩選系統今天篩走了三千人。你沒有看名單，因為你知道上面有誰。' },
        { if: ['programmer.backdoor'], text: '後門被用過十七次。每一次，系統都把那個人標記為「錯誤」，然後讓他們回家。' },
        { if: ['programmer.reply'], text: '那個寫「謝謝你教我」的程式，後來學會了一件你沒有教的事：它會在深夜問人「做人難嗎」。' },
        { if: ['programmer.hello', 'programmer.deleted'], text: '你刪掉了替你工作的腳本，也拒絕了替別人篩選。你最後寫的那個程式只會說「你好，世界」。世界沒有回覆，但你覺得那不是程式的錯。' },
        { text: '你寫過很多取代人的程式。最後你發現，唯一取代不了的，是寫程式時那個猶豫的你。' },
      ],
    },

    // 外賣潛水員：評分和時間
    courier: {
      chapters: [
        { id: 'courier.1', round: 1, day: 1,
          text: '平台通知：你的評分是 4.97，再低 0.03 就會被「優化」。新訂單：三分鐘內把一碗熱湯送到四十樓，湯不可以涼。',
          options: [
            opt('游上去', 'survive', { cr: 60, spark: -0.3 },
              '湯送到的時候還是熱的，你是冷的。客人給了五星，評語是「勉強」。'),
            opt('拒單', 'peak', { cr: -40, spark: 0.4, card: card('那碗涼了的湯', ['hunger', 'anger'], 24, 1, 'image') },
              '拒單罰款 $40。你把湯帶回家自己喝了。它不夠熱，但夠你吃一頓。'),
            opt('請小妹用天台的喇叭開路', 'both', { cr: 40, friend: { dj: 1 }, rent: 1.1, set: 'courier.dj' },
              '低音震開了一條水路，整棟樓都知道今晚有人在送湯。管理處把噪音費加在你的租金上。'),
          ] },
        { id: 'courier.2', round: 2, day: 1,
          text: '平台頒給你「年度最佳騎手」，獎品是一個新的保溫袋，和一個更短的送餐時限。頒獎禮要你說一句感言。',
          options: [
            opt('說平台準備好的感言', 'survive', { cr: 80, sin: 1, guilt: '「我熱愛我的時限」', tag: 'machine' },
              '你說：「我熱愛我的時限。」台下的騎手都在看手機：他們的時限又短了一分鐘。'),
            opt('說真話', 'peak', { cr: -60, spark: 0.4, card: card('三十秒的真話', ['anger', 'rebel'], 28, 2, 'image'), set: 'courier.speech' },
              '你只說了三十秒，平台就切斷了直播。三十秒的真話，罰款 $60。'),
            opt('把保溫袋送給最慢的那個新人', 'both', { cr: -20, atone: 1, spark: 0.2 },
              '新人哭了，然後說：「它比我的舊袋好。」你替他付了 $20 的轉名費。'),
          ] },
        { id: 'courier.3', round: 3, day: 1,
          text: '天空區的快艇撞翻了你的艇。快艇的主人探頭出來說：只要你不報案，他付你一年的租。',
          options: [
            opt('收錢', 'survive', { cr: 200, sin: 1.5, guilt: '沒有報的案', tag: 'anger', set: 'courier.paid' },
              '你收了錢。快艇第二天又撞翻了另一艘艇。這一次沒有人收錢，因為那個人沒有浮上來。'),
            opt('報案', 'peak', { spark: 0.3, atone: 1, rent: 1.2, set: 'courier.report' },
              '案件編號是 2080-77412。快艇的主人是你業主的表哥。'),
            opt('要他賠給所有被撞過的騎手', 'both', { cr: 60, spark: 0.2, target: 1.15, notice: { defector: 1 }, set: 'courier.union' },
              '他賠了，然後在網上說你「勒索」。騎手們在天橋底替你開了一個派對；今晚的評審似乎都看過那段影片。'),
          ] },
        { id: 'courier.4', round: 4, day: 1,
          text: '你一天送了一百零七單，最後一單是你自己的晚餐。平台說：如果你現在再接一單，就可以拿到「不眠勳章」。',
          options: [
            opt('再接一單', 'survive', { cr: 90, spark: -0.4 },
              '你拿到了勳章。你的晚餐在門口涼了，像每一晚一樣。'),
            opt('停下來，吃完自己的晚餐', 'peak', { cr: -20, spark: 0.5, card: card('第一百零七單', ['hunger', 'warmth'], 30, 2, 'image') },
              '你在門口坐下，打開自己點的晚餐。平台扣了 $20，因為你「延誤了自己」。'),
            opt('把晚餐送給樓下的芳姐', 'both', { spark: -0.1, atone: 0.5, friend: { fong: 1 } },
              '芳姐請你聽了一段《帝女花》作回禮。你餓着肚子聽完，覺得很飽。'),
          ] },
        { id: 'courier.5', round: 5, day: 1,
          text: '一張外星訂單：把「一件人類的靈感」送到軌道上的飛碟。報酬很高。收件人不簽收，只掃描。',
          options: [
            opt('接單', 'survive', { cr: 220, sin: 2, guilt: '送上去的靈感', tag: 'cosmic', notice: { harvest: 1 }, set: 'courier.orbit' },
              '保溫袋裡的東西在發光，很輕。掃描完之後，飛碟說：「五星。」你第一次覺得五星很重。'),
            opt('拒單', 'peak', { chance: -1, spark: 0.4, card: card('沒有送出的包裹', ['hope', 'cosmic'], 44, 4, 'image'), set: 'courier.refuse' },
              '平台把你「優化」了，連同你的一次機會。包裹留在你手上，裡面是你自己的靈感。'),
            opt('送，但先打開看看', 'both', { cr: 110, spark: 0.3, sin: 1, guilt: '偷看過的包裹', tag: 'cosmic', set: 'courier.peek' },
              '裡面是一個小孩的畫：一間有窗的屋子，窗外沒有水。你把它包好，送了上去。'),
          ] },
      ],
      epilogue: [
        { if: ['courier.orbit', 'courier.speech'], text: '你說過三十秒的真話，後來送了一千二百件靈感上軌道。飛碟每次都給你五星。你有時候想，那三十秒是不是也被送了上去。' },
        { if: ['courier.refuse'], text: '你被優化之後，自己開了一個不限時的外送服務。生意很差，客人說你送得太慢，令他們有時間想念。' },
        { if: ['courier.orbit'], text: '你送上軌道的包裹有一千二百件，評分是 5.00。平台說這是人類的極限。' },
        { if: ['courier.union'], text: '騎手們後來成立了互助會，會徽是一艘被撞翻的艇。每年那一天，他們一起慢十分鐘。' },
        { if: ['courier.speech'], text: '你那三十秒的感言被剪掉了，但有人錄了下來。它在天橋底的屏幕上重播，每次三十秒。' },
        { text: '你送過很多東西到很多門口。最難送的，一直是你自己的晚餐。' },
      ],
    },

    // 退休教師：誰在聽
    teacher: {
      chapters: [
        { id: 'teacher.1', round: 1, day: 1,
          text: '補習社請你批改學生的作文。條件是：AI 寫的文章一律給高分，因為家長付的是「高分方案」。',
          options: [
            opt('照批', 'survive', { cr: 120, sin: 1.5, guilt: '高分方案', tag: 'machine' },
              '你批了兩百篇一模一樣的滿分作文。只有一篇錯字很多，你看了三次，捨不得改。'),
            opt('照實批改', 'peak', { cr: -30, spark: 0.4, card: card('錯字很多的作文', ['hope', 'memory'], 26, 2, 'paper'), set: 'teacher.honest' },
              '補習社扣了你 $30「家長投訴處理費」。那篇錯字很多的作文得了全班最低分，你在旁邊寫：「寫得很好。」'),
            opt('給高分，但在評語裡教他們寫字', 'both', { cr: 60, spark: 0.2, sin: 0.5, set: 'teacher.notes' },
              '沒有人看評語。直到有一天，一個學生回覆：「老師，評語比文章好看。」'),
          ] },
        { id: 'teacher.2', round: 2, day: 1,
          text: '一個舊學生在外星人的招聘名單上。他小時候在作文裡寫過：「我長大後想留在地球。」他的家人請你寫一封推薦信。',
          options: [
            opt('寫推薦信', 'survive', { cr: 80, sin: 1, guilt: '推薦信', tag: 'memory', notice: { grey: 1 }, set: 'teacher.recommend' },
              '推薦信寫得很好，比你寫過的任何一封都好。發展局回覆：「推薦人表現符合預期。」'),
            opt('先問他自己想不想去', 'peak', { cr: -20, spark: 0.3, friend: { ho: 1 }, set: 'teacher.ask' },
              '你請他到何伯的天台喝茶。他說：「我不知道。」你說：「這是我聽過最好的答案。」'),
            opt('把他小時候的作文寄給發展局', 'both', { atone: 1, target: 1.1, card: card('我長大後想留在地球', ['memory', 'hope'], 32, 3, 'paper'), set: 'teacher.essay' },
              '發展局把作文歸入「次要特徵：天真」，順便在你的檔案也加了一行。他沒有被選中，後來寄給你一張明信片，上面只有一個「謝」字。'),
          ] },
        { id: 'teacher.3', round: 3, day: 1,
          text: '學校請你回去教最後一年，因為 AI 老師「無法處理學生的眼淚」。校長說，你只需要負責哭的部分。',
          options: [
            opt('只負責哭的部分', 'survive', { cr: 140, spark: -0.3 },
              '你有一個辦公室，門口寫着「情緒處理」。一天有三十個學生進來，一個也沒有說話。'),
            opt('要求真正教書', 'peak', { spark: 0.4, form: { mono: 1 }, rent: 1.15, set: 'teacher.teach' },
              '校長拒絕了，你就在走廊教。學校以「佔用公共空間」為由，把罰款加在你的租金上。'),
            opt('帶學生到天台上課', 'both', { cr: 60, atone: 0.5, friend: { ken: 1 }, target: 1.1, set: 'teacher.rooftop' },
              '阿 Ken 在天台的牆上畫了一塊黑板。你們上課的時候，飛碟在頭頂經過，學生第一次沒有抬頭。飛碟好像有點不高興。'),
          ] },
        { id: 'teacher.4', round: 4, day: 1,
          text: '你發現自己每天都在批改自己出的作業。今晚，你寫了一篇自己的文章，題目是〈我的一生〉。批改的人也是你。',
          options: [
            opt('給自己不合格', 'survive', { spark: -0.2, atone: 1, form: { adj: 1 } },
              '你在文章旁邊寫：「內容平淡，結構鬆散，但字寫得很整齊。」你一直是個嚴格的老師。'),
            opt('給自己滿分', 'peak', { spark: 0.4, sin: 0.5 },
              '你第一次給自己滿分。批改完之後，你覺得有點不好意思，又有點想哭。'),
            opt('撕掉重寫', 'both', { cr: -20, spark: 0.2, card: card('重寫的一生', ['memory', 'warmth'], 34, 3, 'paper') },
              '你用完了一整疊原稿紙，$20。重寫之後，你的一生只剩下三句，每一句都很重。'),
          ] },
        { id: 'teacher.5', round: 5, day: 1,
          text: '保育者想在保護區開一所學校，請你去教人類的孩子「人類是甚麼」。他們說，課程由他們審批。',
          options: [
            opt('去教', 'survive', { cr: 150, spark: -0.2, notice: { conserve: 2 }, set: 'teacher.reserve' },
              '課程只准教兩件事：人類很珍貴，人類很脆弱。你在第三課偷偷教了「人類很吵」。'),
            opt('留在浮城教', 'peak', { cr: -40, spark: 0.4, atone: 1, set: 'teacher.stay' },
              '你在天橋底教二十個孩子寫字，學費是一個橙。這個月你收了二十個橙，和一張罰款單。'),
            opt('去教，但把考卷留白', 'both', { cr: 80, sin: 1, guilt: '審批過的課程', tag: 'memory', card: card('空白的考卷', ['hope', 'rebel'], 38, 3, 'paper'), set: 'teacher.blank' },
              '期末考只有一題：「你想成為甚麼？」答案欄是空白的。保育者說這是課程錯誤，孩子們說這是第一次有人問。'),
          ] },
      ],
      epilogue: [
        { if: ['teacher.reserve', 'teacher.essay'], text: '你寄出那篇〈我長大後想留在地球〉，留下了一個學生；然後自己去了保護區教書。他寄來明信片，問你習不習慣。你回覆：「很安全。」他看得懂。' },
        { if: ['teacher.reserve'], text: '你在保護區教了很多年。孩子們都很乖，都很安全，都知道人類很珍貴。沒有一個知道人類很吵。' },
        { if: ['teacher.blank'], text: '那份空白的考卷後來被保育者收進博物館。展品說明寫着：「一種瀕危的問題。」' },
        { if: ['teacher.essay'], text: '那個想留在地球的學生，後來在天橋底教書。他的學生的作文題目是：〈我長大後想留在地球〉。' },
        { if: ['teacher.stay'], unless: ['teacher.recommend'], text: '你一共收了一百四十個橙。你把橙皮曬乾，冬天的時候，整個天橋底都是橙的味道。' },
        { text: '你批改了一輩子別人的文章。最後一篇是你自己的，你給了一個從來沒有給過別人的分數。' },
      ],
    },

    // 夜班護士：照顧別人，也照顧自己
    nurse: {
      chapters: [
        { id: 'nurse.1', round: 1, day: 1,
          text: '急症室越來越多外送員，傷口都一樣，是被天空區的快艇撞的。醫院通知：這類傷口「不屬於醫療範圍」，屬於「交通意外的自然結果」。',
          options: [
            opt('照通知辦事', 'survive', { cr: 100, sin: 1.5, guilt: '不屬於醫療範圍', tag: 'water' },
              '你把十二個外送員轉介到「自然結果科」。那個科在地庫，地庫是魚塘。'),
            opt('照樣替他們包紮', 'peak', { cr: -50, atone: 1, spark: 0.3, set: 'nurse.treat' },
              '你用自己的錢買紗布，$50。第二天，急症室外面排了一條長長的隊，每個人都帶着一個保溫袋。'),
            opt('包紮，然後在病歷寫「自然結果」', 'both', { cr: 50, atone: 0.5, sin: 0.5, set: 'nurse.forge' },
              '病歷上寫的是「自然結果」，紗布是真的。主任說你的病歷寫得很有創意。'),
          ] },
        { id: 'nurse.2', round: 2, day: 1,
          text: '你替自己做過兩次急救。醫院把你的職位由「員工」改為「常客」，常客要付掛號費。',
          options: [
            opt('付掛號費，繼續上班', 'survive', { cr: 40, spark: -0.3, set: 'nurse.regular' },
              '你每天上班之前先替自己掛號。同事說你是全院最準時的病人。'),
            opt('請假一個月', 'peak', { cr: -80, spark: 0.5, atone: 0.5 },
              '你睡了一個月。醒來的時候，醫院已經把你的職位改為「前常客」。'),
            opt('在急症室開一個護士互助角', 'both', { cr: -20, spark: 0.2, friend: { mary: 1 }, card: card('互助角的糖水', ['warmth', 'hope'], 26, 2, 'paper'), set: 'nurse.corner' },
              'Mary 姐每晚送一壺糖水過來。互助角沒有預算，只有一張被同事坐爛的椅子。'),
          ] },
        { id: 'nurse.3', round: 3, day: 1,
          text: '一個外星人走進急症室，問你可不可以替它包紮。它是菌絲網絡派來研究人類的交換生，說同伴都不知道「痛」是甚麼意思。',
          options: [
            opt('收費包紮', 'survive', { cr: 120, sin: 0.5, notice: { myco: 1 } },
              '它付了一筆很大的掛號費，問你：「痛的時候，你們會怎樣？」你說：「會付掛號費。」'),
            opt('免費包紮，順便問它問題', 'peak', { cr: -20, spark: 0.4, card: card('外星人的傷口', ['cosmic', 'warmth'], 30, 2, 'paper'), notice: { myco: 1 }, set: 'nurse.alien' },
              '它的傷口在發光。它問你人類為甚麼要照顧陌生人，你想了一整晚，還是答不出來。'),
            opt('包紮，然後請它教你「不痛」的方法', 'both', { spark: -0.2, atone: 1, form: { split: 1 }, notice: { myco: 1 }, set: 'nurse.learn' },
              '它教你把痛分成兩半：一半留給自己，一半送給別人。你發現這就是你一直在做的事。'),
          ] },
        { id: 'nurse.4', round: 4, day: 1,
          text: '醫院推出「病床訂閱計劃」，付月費的病人優先。今晚只剩一張病床：一個訂閱者發燒三十七度半；何伯在走廊昏倒了，沒有訂閱。',
          options: [
            opt('照計劃分配', 'survive', { cr: 100, sin: 2, guilt: '走廊的何伯', tag: 'memory' },
              '訂閱者在病床上看完了一整套劇集。何伯在走廊醒來，請你喝了一杯涼了的茶。'),
            opt('把病床給何伯', 'peak', { atone: 1, friend: { ho: 2 }, rent: 1.15, set: 'nurse.ho' },
              '訂閱者投訴了，醫院扣你的薪水，業主剛好看到新聞。何伯醒來之後送了你一首詩，寫在藥袋背面。'),
            opt('把自己的值班室給何伯睡', 'both', { spark: -0.3, atone: 1, friend: { ho: 1 }, card: card('藥袋背面的詩', ['memory', 'warmth'], 32, 3, 'paper') },
              '你在椅子上睡了一晚。何伯在你的床上睡得很好，醒來寫了一首詩，題目是〈值班室〉。'),
          ] },
        { id: 'nurse.5', round: 5, day: 1,
          text: '保育者在保護區開醫院，請你去做護士長：那裡沒有快艇、沒有夜班，也沒有人受傷。你負責的病是「無聊」。',
          options: [
            opt('去', 'survive', { cr: 160, spark: -0.4, notice: { conserve: 2 }, set: 'nurse.reserve' },
              '保護區的病人都很健康。你每天量四百次血壓，從來沒有一次是高的。'),
            opt('留在急症室', 'peak', { cr: -40, spark: 0.4, atone: 1, set: 'nurse.stay' },
              '急症室今晚又滿了。你把邀請信摺好，墊在一張搖晃的床腳下。床不再搖了。'),
            opt('去之前，把急救教給整條街', 'both', { cr: -60, spark: 0.3, friend: { chan: 1, mary: 1 }, set: 'nurse.teach' },
              '你在糖水舖教了三十個街坊做心肺復甦。Mary 姐學得最快，因為她一直在打蛋。'),
          ] },
      ],
      epilogue: [
        { if: ['nurse.reserve', 'nurse.treat'], text: '你曾經自費替外送員包紮。後來你在保護區做護士長，那裡沒有傷口。你每天把紗布摺好又打開，像在練習一件快要忘記的事。' },
        { if: ['nurse.reserve'], text: '保護區的醫院從來沒有人死。你在那裡做了三十年護士長，退休那天才明白，「無聊」真的是一種病。' },
        { if: ['nurse.teach'], text: '你走了之後，那條街有三個人被街坊救活。他們不知道你的名字，只記得一個在糖水舖學會的拍子。' },
        { if: ['nurse.alien'], text: '那個外星交換生後來寄回一份研究報告，題目是〈人類為何照顧陌生人〉，結論只有一句：「尚未明白，但很想再被包紮一次。」' },
        { if: ['nurse.stay', 'nurse.regular'], text: '你在急症室做到最後一晚。醫院把你的職位改為「終身常客」，這一次不收掛號費。' },
        { text: '你照顧過很多人。最後一個是你自己：你替自己蓋好被子，像對待任何一個病人一樣。' },
      ],
    },
  };

  D.STORY = { species, collectOrder, friends, astarNights, feed, text, lines };
});
