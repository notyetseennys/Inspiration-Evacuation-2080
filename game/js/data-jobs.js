// 《靈感撤離 2080》新小遊戲的內容：內容農場、夢境面試、義體診所、外送潛水、街頭表演。
(function (factory) {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.IE = root.IE || {};
  factory(root.IE);
})(function (IE) {
  'use strict';

  // ---------- 陰謀論內容農場 ----------
  // 每則標題 = 主語 + 動作 + 對象。tags 觸發組合；fake 代表捏造程度（0 = 有根據，1 = 完全捏造）
  const FARM_TILES = {
    subject: [
      { text: '外星人', tags: ['alien'], fake: 0.5 },
      { text: '天空區富豪', tags: ['celeb'], fake: 0.3 },
      { text: '你的鄰居', tags: ['fear'], fake: 0.6 },
      { text: 'AI 伴侶', tags: ['data'], fake: 0.4 },
      { text: '政府', tags: ['anger'], fake: 0.3 },
      { text: '科學家', tags: ['data'], fake: 0.2 },
      { text: '失蹤者家屬', tags: ['truth'], fake: 0 },
      { text: '被提教會', tags: ['fear'], fake: 0.4 },
    ],
    verb: [
      { text: '正在偷取', tags: ['fear'], fake: 0.8 },
      { text: '秘密收購', tags: ['anger'], fake: 0.7 },
      { text: '證實了', tags: ['truth'], fake: 0 },
      { text: '瘋狂囤積', tags: ['fear'], fake: 0.8 },
      { text: '悄悄刪除', tags: ['anger'], fake: 0.7 },
      { text: '公開了', tags: ['truth'], fake: 0 },
      { text: '用 AI 複製', tags: ['data', 'fear'], fake: 0.9 },
    ],
    object: [
      { text: '你的夢', tags: ['alien'], fake: 1 },
      { text: '全城的食水', tags: ['fear'], fake: 0.7 },
      { text: '所有失蹤者的名單', tags: ['alien'], fake: 0.8 },
      { text: '三成的工作', tags: ['data'], fake: 0.1 },
      { text: '今年的租金數據', tags: ['data', 'truth'], fake: 0 },
      { text: '整座舊城', tags: ['fear'], fake: 0.8 },
      { text: '一隻貓', tags: ['celeb'], fake: 0.5 },
      { text: '你的靈魂重量', tags: ['alien', 'fear'], fake: 1 },
    ],
  };
  // 組合：標題同時含有這些標籤，轉發量乘以 mult
  const FARM_COMBOS = [
    { need: ['alien', 'fear'], mult: 2.2, name: '外星恐慌' },
    { need: ['anger', 'celeb'], mult: 1.8, name: '仇富' },
    { need: ['data', 'fear'], mult: 1.6, name: '數據顯示' },
    { need: ['fear', 'fear'], mult: 1.5, name: '雙重恐懼' },
  ];
  const FARM_COMMENTS = [
    '早就知道！', '求出處', '已轉發', '我鄰居也是這樣', '政府又在隱瞞', '太可怕了', '笑死',
    '所以我要搬去天空區嗎', '這是真的嗎？？', '有人截圖了嗎', '樓主好人', '我昨晚也夢到了',
    '假的吧', '已舉報', '分享給我媽', '一定是外星人', '轉發不是我的立場', '馬上囤水',
  ];

  // ---------- 外星 HR 夢境面試 ----------
  // score：外星人對答案的評價（+ 加訊號，− 扣訊號）；react：面試官的回應
  const INTERVIEW_QS = [
    { q: '請用三個字形容你的宇宙觀。', a: [
      { t: '大家庭', score: 1, stats: { obey: 2 }, react: '很好。這個答案已被標記為「可塑」。' },
      { t: '很寬闊', score: 0, stats: { imag: 2 }, react: '已記錄。寬闊不是一種可量化的指標。' },
      { t: '我拒絕', score: -1, card: 'i_question', react: '拒絕不是三個字。請重新思考你的字數。' }] },
    { q: '如果你的同事比你更有靈感，你會怎樣做？', a: [
      { t: '向他學習', score: 0, stats: { craft: 1 }, react: '學習效率偏低，但態度可接受。' },
      { t: '向你們舉報', score: 1, sin: 0.5, react: '非常好。我們重視團隊的透明度。' },
      { t: '請他吃飯', score: -1, stats: { empathy: 1 }, react: '我們不理解「吃飯」在這裡的作用。' }] },
    { q: '你的最大缺點是甚麼？', a: [
      { t: '工作太投入', score: 1, react: '這不是缺點，這是規格。' },
      { t: '太有良知', score: -1, react: '已記錄。良知會增加重量。' },
      { t: '我會想念地球', score: -1, stats: { empathy: 1 }, react: '想念是一種不必要的記憶佔用。' }] },
    { q: '你願意為了 KPI 放棄一段記憶嗎？', a: [
      { t: '願意', score: 1, stats: { imag: -3, obey: 2 }, react: '請放心，我們會選一段不重要的。' },
      { t: '要看是哪一段', score: 0, stats: { insight: 1 }, react: '談判能力：中等。' },
      { t: '不願意', score: -1, react: '記憶不屬於你。但我們會尊重你的錯覺。' }] },
    { q: '請在三秒內感到快樂。', a: [
      { t: '（微笑）', score: 1, react: '合格。笑容與情緒無關，我們很滿意。' },
      { t: '（大笑）', score: 0, react: '音量超出標準。' },
      { t: '（哭）', score: -1, card: 'i_question', react: '這不是快樂。但很有趣，已存檔。' }] },
    { q: '你如何看待被淘汰的同類？', a: [
      { t: '他們是寶貴的數據', score: 1, sin: 0.5, react: '正確。你已經開始像我們一樣思考。' },
      { t: '我會記住他們', score: -1, stats: { empathy: 2 }, react: '記住他們不會提高任何人的效率。' },
      { t: '沒有看法', score: 1, stats: { obey: 1 }, react: '很好。看法是一種負擔。' }] },
    { q: '請描述一次失敗的經驗，但不可以帶任何情緒。', a: [
      { t: '我曾經失敗。', score: 1, react: '精簡。完美。' },
      { t: '我交不起租。', score: 0, react: '「租」是甚麼？已轉介地球事務部。' },
      { t: '我失去了一個朋友。', score: -1, stats: { empathy: 1 }, react: '偵測到情緒。面試暫停三秒。' }] },
    { q: '假如地球被淹沒了，你最想帶走甚麼？', a: [
      { t: '我的生產力', score: 1, react: '這是我們聽過最好的答案。' },
      { t: '一張舊照片', score: -1, card: 'i_question', react: '照片不能被收割。' },
      { t: '所有人', score: -1, atone: 0.5, react: '容量不足。請降低你的期望。' }] },
    { q: '你的靈魂重多少？', a: [
      { t: '不知道', score: 0, react: '我們知道。' },
      { t: '越輕越好', score: 1, react: '我們欣賞有自知之明的候選人。' },
      { t: '剛剛好', score: -1, react: '沒有「剛剛好」這個選項。' }] },
    { q: '我們是一個大家庭。你同意嗎？', a: [
      { t: '同意', score: 1, react: '謝謝。這是唯一的正確答案。' },
      { t: '非常同意', score: 2, stats: { obey: 2 }, react: '熱情過剩，但我們接受。' },
      { t: '家庭不是這樣的', score: -1, react: '你對「家庭」的定義已過時 3,000 年。' }] },
    { q: '你為甚麼想加入我們？', a: [
      { t: '因為地球快淹沒了', score: 0, react: '動機：逃避。常見。' },
      { t: '因為我想創作', score: -1, stats: { craft: 1 }, react: '我們不需要創作，我們需要靈感。兩者不同。' },
      { t: '因為你們選了我', score: 1, react: '正確。你沒有選擇的權利。' }] },
    { q: '如果光束拉不動你，你會怎樣做？', a: [
      { t: '減輕自己', score: 1, react: '很好。我們建議由良知開始。' },
      { t: '留在地球', score: -1, react: '這不在我們的流程之內。' },
      { t: '拉住別人一起上來', score: -1, atone: 0.5, react: '光束只能承載一人。請放手。' }] },
  ];
  const INTERVIEW_TIMEOUT = { t: '（沉默）', score: 0, react: '沉默已被記錄為「服從」。' };

  // ---------- 義體診所 ----------
  const CLINIC_PATIENTS = {
    legal: ['更換磨損的機械手指', '修理老人的聽覺義體', '替外送員調校義腿', '重接標註員的視覺增強器', '更換破損的心律調節器'],
    illegal: ['安裝未登記的情緒抑制器', '解除工作義體的疲勞警報', '加裝「永遠微笑」面部模組', '替少年裝專注力增強晶片', '移除義肢上的公司追蹤器'],
  };

  // ---------- 外送潛水 ----------
  const DELIVERY = {
    shops: ['阿強魚蛋', '浮城茶餐廳', '合成糊專門店', '天台燒臘'],
    late: ['你遲到了。', '外賣冷了。', '客人給了一星。', '湯都灑了。'],
    good: ['準時送達！', '客人給了小費。', '五星好評！', '客人說謝謝。'],
  };

  // ---------- 街頭表演 ----------
  const BUSK_LINES = {
    join: ['有人停下來聽', '一個小孩在跳舞', '有人錄影', '外送員停下來了', '有人跟著哼'],
    leave: ['觀眾走了', '有人搖頭離開', '下雨了，人散了', '沒有人在聽'],
  };

  Object.assign(IE.DATA, {
    FARM_TILES, FARM_COMBOS, FARM_COMMENTS, INTERVIEW_QS, INTERVIEW_TIMEOUT, CLINIC_PATIENTS, DELIVERY, BUSK_LINES,
  });
});
