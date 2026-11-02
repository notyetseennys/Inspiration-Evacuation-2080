# 第十五期總規格：一局重構（五輪十五晚）

> 這份是第十五期所有工單共用的規格。工單只寫「做甚麼、改哪裡、怎樣驗收」；**規則、數值、狀態欄位、介面文字一律以這裡為準**。工單與這份規格衝突時，以這份為準，並在 PR 的「偏離工單的地方」說明。
>
> 背景見 `docs/REFORM_PLAN.md` 第一至六節。

---

## §1 目標與做法

- 把一局改成：5 輪 × 3 晚 = 15 晚。每晚之前一張「生活卡」，每晚之後一個「市集」，每輪最後一晚之後是「篩選日」（交租、靈魂秤重）。
- **以新模式 `rounds` 實作**，舊的 `standard`、`long` 模式在第十五期內**保持可玩、測試照舊通過**。WO-15-10 才把 `rounds` 設為預設，舊模式收進「經典模式」。
- 新的流程邏輯集中在兩個新檔案：
  - `game/js/data-rounds.js`：數值表 `D.ECON`、生活卡 `D.DAYCARDS`、素材包 `D.PACKS`、工作室服務 `D.SERVICES`、介面文字 `D.ROUND_TEXT`。
  - `game/js/rounds.js`：`IE.Rounds`，流程邏輯（純邏輯，瀏覽器和 Node 共用，UMD 寫法照 `stages.js`）。
- 舊檔案只做**最少、有守衛**的改動：一律用 `IE.Rounds && IE.Rounds.on(s)` 判斷，舊模式的行為一點都不能變。

## §2 載入次序

| 檔案 | `game/index.html` 的位置 | `tools/sim.js`、`tools/test.js`、新的 `tools/sim-rounds.js` |
|---|---|---|
| `data-rounds.js` | 在 `data-contacts.js` 之後、`rules.js` 之前 | 加在資料檔清單最後 |
| `rounds.js` | 在 `dossier.js` 之後、`audio.js` 之前 | 加在 `dossier.js` 之後 |
| `data-cities.js`（§6.1，Claude 撰寫） | 在 `data-rounds.js` 之後、`data-story.js` 之前（已經加入） | `tools/test.js` 已經加入；`tools/sim-rounds.js` 加在 `data-rounds.js` 之後（WO-15-11） |
| `data-story.js`（§14，Claude 撰寫） | 在 `data-cities.js` 之後（已經加入） | `tools/test.js` 已經加入；`tools/sim-rounds.js` 加在 `data-cities.js` 之後（WO-15-11） |
| `story.js`（§14，WO-15-11） | 在 `rounds.js` 之後、`audio.js` 之前 | `tools/test.js` 已經預留；`tools/sim-rounds.js` 加在 `rounds.js` 之後 |

`tools/build.js` 會自動內嵌 `index.html` 列出的檔案，不用改。`tools/test.js` 已經預留這兩個檔名（存在才載入）。

## §3 一局的時間表

| 晚 `night` | 輪 `round` | 種類 `kind` | 日曆日 `day` |
|---|---|---|---|
| 1、2、3 | 1 | small、big、boss | 4、8、12 |
| 4、5、6 | 2 | small、big、boss | 16、20、24 |
| … | … | … | … |
| 13、14、15 | 5 | small、big、boss | 52、56、60 |

- `round = ceil(night / 3)`；`kind = ['small', 'big', 'boss'][(night - 1) % 3]`；`day = 4 × night`。
- 這正好是現在每期 12 天、關卡之夜在第 4、8、12 天的安排，所以 `IE.Stages.stageOn(s, day)` 原本的種類判斷可以沿用。
- 每晚的流程（`s.phase`）：

```
'day'（白天：生活卡）→ 'night'（創作桌）→ 'shop'（市集）
   → 不是每輪最後一晚：advance() 到下一晚的 'day'
   → 每輪最後一晚：'review'（篩選日）→ 第 5 輪：結局；否則 advance() 到下一晚的 'day'
任何時候機會用完：'ended'
```

## §4 狀態欄位（`newRun` 在 `rounds` 模式加入）

```js
s.v = 10;              // 所有新開的局都改為 10（main.js 的 savedRun 要同時接受 9 和 10）
s.mode = 'rounds';
s.night = 1;           // 1..15
s.phase = 'day';       // 'day' | 'night' | 'shop' | 'review' | 'ended'
s.day = 4;             // = 4 × night
s.slot = 0;            // 白天是 0；開始創作時設為 2（令 R.isNight(s) 為 true）
s.offer = null;        // { night, ids: [3 個卡 id], rerolls: 0, chosen: null }
s.shop = null;         // 見 §8
s.pack = null;         // 開了未選的素材包：{ pid, cards: [3 張素材定義 id], stars: [3 個星級] }
s.pick = null;         // 等待選素材的服務：{ service: 'polish' | 'burn' | 'copy' }
s.nightLog = [];       // [{ night, kind, target, score, pass, reward, playsLeft }]
s.roundLog = [];       // [{ round, rent, paid, soul, soulOk, lost: [原因] }]
s.lost = [];           // 失去機會的原因次序：'night' | 'rent' | 'soul'
s.chances = 3;         // 已有欄位
s.bosses = { 0: [...], 1: [...], 2: [...], 3: [...], 4: [...] };
                       // 五個外星評審之夜的規則，開局時全部選好（IE.Stages.bossesFor）；介面只讀取，可以整輪預告（WO-15-06 審核後加入）
// 出國選到一半時才有：s.trip5 = { origin, ids: [5 個素材定義 id], picked: [已選的位置], rep: 出國的報告 }
```

其他舊欄位照舊建立（`newRun` 不要分支太多），只是在 `rounds` 模式不使用。

## §5 規則差異（只在 `rounds` 模式生效）

| 項目 | 規則 |
|---|---|
| 身體 | `R.hurt`、`heal` 不改變 `s.body`（直接 return）。`R.kill` 照舊（世界事件期間的致命危險仍然存在，會在生活卡上顯示）。介面不顯示身體。 |
| 火花 | 下限 `D.ECON.sparkFloor`（1.0），上限照舊 `R.sparkMax(s)`。所以不會麻木、不會灰化。 |
| 晚餐、睡覺、搬樓、每 7 天交租、篩選日的訊號門檻、夢境面試、速寫、通宵、深夜加班 | 全部不使用（`R.endDay` 不會被呼叫；改用 `IE.Rounds.advance`） |
| 能力值的門檻 | 不使用（例如義體診所不需要技術 25） |
| 創作的材料費 | 0 |
| 創作桌 | 手牌 `ECON.hand`、下筆 `ECON.plays`、改稿 `ECON.discards`，再加上原有的物件、角色、外星評級修正 |
| 一晚的結束 | 分數一到目標就收工；或者下筆用完 |
| 失敗 | 一晚未達標、篩選日交不起租、篩選日靈魂超過 21 克：各失去一次機會。機會用完即結局 |
| AI 模仿 | 照舊（第十六期才改） |
| 旅行、畫廊賣畫、古董、家具、浮城百貨、人脈的幫忙 | 第十五期不提供（介面隱藏）。旅行改為稀有生活卡「出國」（§7） |
| 道德抉擇 | 每晚的白天開始時照舊 `R.drawDilemma(s)`，有就先處理 |
| 街頭奇遇 | 生活卡完成後照舊 `R.encounter(s)` |

## §6 數值表 `D.ECON`（WO-15-09 校準之後的數值；校準紀錄見 `CALIBRATION.md`）

```js
ECON: {
  // 目標
  t1: 3120,             // 第 1 晚的目標
  growth: 1.42,         // 之後每晚 ×1.42（製作人決定不按輪設計，2026-11-01）
  firstRunEase: 0.7,    // 第一局的第 1、2 晚目標 ×0.7
  // 創作桌
  hand: 8, plays: 4, discards: 3,
  // 收入
  nightPay: { small: 42, big: 62, boss: 140 },
  payGrowth: 0.25,      // 每多一輪，獎金 +25%
  earlyBonus: 8,        // 每次沒有用的下筆
  overkillSpark: 0.22,  // 分數達到目標兩倍：火花 +0.22
  failSpark: -0.3,      // 一晚失敗：火花 −0.3
  // 篩選日
  rent: [160, 240, 305, 365, 430],
  // 白天
  offerReroll: [10, 20, 30],      // 換一批生活卡（第 4 次起都是最後一個價錢）
  skipSpark: 0.2,                 // 睡懶覺
  tripCost: 85, tripPick: 2,      // 出國：五選二
  // 市集
  objReroll: [20, 30, 40, 50],    // 重抽物件
  pack: 35, packFar: 55,          // 素材包
  packStars: [0.01, 0.05, 0.18, 0.36, 0.40],  // 素材包的星級機會（★1 至 ★5）
  packLegend: 0.03,               // 遠方包每張素材是極稀有（★5）的機會
  polish: [0, 10, 20, 35, 55],    // 打磨：★1→2 是 polish[1]……★4→5 是 polish[4]
  burn: 15, copy: 35, minDeck: 8,  // 起始素材庫約 11 張
  tech: 20, techStep: 10,         // 技法課：20 + 10 ×（現在等級 − 1）
  toolMult: 1,                    // 工具卡價錢 × toolMult
  sparkFloor: 1,
  // 故事線（§14）
  hideCost: [80, 120, 160, 200],  // 把朋友藏起來（第 1 至 4 輪）
}
```

物件價錢沿用 `D.OBJ_PRICE`（普通 90、稀有 160、傳說 260）；所有價錢都乘 `IE.Meta.stakeMod(s, 'prices')`，租金乘 `stakeMod(s, 'rent')`、`R.worldMods(s).rentMult`、角色的 `perk.rentMult`；目標乘 `stakeMod(s, 'stageTarget')`。

**目標公式**：`target(s, k) = sig3(ECON.t1 × ECON.growth^(k−1) × stakeMod(s, 'stageTarget') × (s.firstRun && k ≤ 2 ? ECON.firstRunEase : 1))`，`sig3` 是取三位有效數字（例如 12,345 → 12,300；4,000 → 4,000）。

**獎金公式**：`reward = round(ECON.nightPay[kind] × (1 + ECON.payGrowth × (round − 1))) + ECON.earlyBonus × playsLeft`。

## §6.1 城市 `D.CITIES`（`game/js/data-cities.js`；經濟的根據見 `docs/ECONOMY.md`）

```js
D.CITIES = {
  zone7: {
    name: '浮城', zone: '第 7 區', treaty: 'grey', difficulty: 1, difficultyName: '比較輕鬆',
    currency: { name: '浮城元', symbol: '$', rate: 1, regime: 'peg', regimeName: '與星際信用點掛鈎' },
    econ: { rent: 1, pay: 1, price: 1, inflation: 1 },
    blurb: '……',
  },
};
D.CITY_DEFAULT = 'zone7';
```

- 第十五期只有一座城市。它的倍數全部是 1，即 `D.ECON` 本身就是第 7 區的經濟；規格測試鎖定這些數值。
- `s.city`：五輪模式的城市 id，由 `IE.Story.init` 設定（沒有時用 `D.CITY_DEFAULT`）。
- 第十五期只有故事線讀取城市（`IE.Story.money`，§14.3）；`IE.Rounds` 的租金、收入和價錢暫時不讀 `econ`，第二十期加入其他城市時另寫工單接上。
- `currency.rate` 是顯示倍數（介面顯示的金額 = 遊戲數值 × `rate`）。第十五期維持 1；要不要改為 20（2080 年的票面價格）由製作人決定（`docs/ECONOMY.md` 第三節）。

## §7 生活卡 `D.DAYCARDS`

| id | 種類 `kind` | 做法 | 備註 |
|---|---|---|---|
| `label` | `work` | 小遊戲 `label` | |
| `delivery` | `work` | 小遊戲 `delivery` | 外出（會顯示致命危險） |
| `clinic` | `work` | 小遊戲 `clinic` | |
| `salvage` | `work` | 小遊戲 `salvage` | |
| `haggle` | `work` | 小遊戲 `haggle` | |
| `farm` | `shady` | 小遊戲 `farm` | 靈魂變重 |
| `smile` | `shady` | 小遊戲 `smile` | 附和偏見會變重 |
| `dive` | `life` | 小遊戲 `dive` | 外出 |
| `busk` | `life` | 小遊戲 `busk` | 外出 |
| `garden` | `life` | 小遊戲 `garden` | |
| `friend:<npc>` | `friend` | 和該朋友聊天（沿用 `IE.Talk` 和 `R.applyChat`），之後**必定**令 `D.TEACH[npc]` 的配色升一級 | 每位還在浮城的朋友一張；花 `R.chatCost(s)` |
| `volunteer` | `volunteer` | `R.applyVolunteer(s)` | 靈魂變輕 |
| `trip:<origin>` | `trip` | 付 `ECON.tripCost`，從 `origin` 相同的素材中抽 5 張，選 `ECON.tripPick` 張加入素材庫；火花 +0.4 | 第 2 輪起；每次出牌有 15% 機會出現在第三張；`origin` 只用 asia、europe、america、africa、arctic、ocean。報告（旅費、實際的火花、帶回的素材）由 `choose` 建立並存在 `s.trip5.rep`，`tripPick` 選滿時回傳 `rep`；選到一半重新載入，介面回到五選二（WO-15-06 審核後加入） |

- 卡名和說明沿用 `R.actions(s)` 對應行動的 `name`、`sub`；朋友卡用「找 X 聊天」、出國卡用「出國：X」（X 用 `D.REGIONS`）。
- **出牌規則** `IE.Rounds.offer(s)`：三張不同的卡。第一張從 `work`／`shady` 抽，第二張從 `life`／`friend` 抽，第三張從全部可用的卡（包括 `volunteer`，第 2 輪起有 15% 機會是 `trip`）抽。被世界事件關閉（`worldClosed`）或被 AI 取代（`s.removed`）的工作不出現。某一格的種類沒有可用的卡時（例如全部工作停工），改從其餘可用的卡抽，三張仍然不同。同一晚重複呼叫回傳同一組（存在 `s.offer`）。
- **小遊戲卡**：玩家可以「親手做」（開小遊戲）或「照舊做」（`IE.Auto.apply`，評級規則照舊：沒玩過是 B，最高 A）。結果經 `R.applyMicro` 套用，收入照舊（不另外縮放）。
- **睡懶覺**：不選卡，火花 +`ECON.skipSpark`。

## §8 市集 `s.shop`

```js
s.shop = {
  night,                       // 哪一晚之後的市集
  objs: ['id', 'id'],          // 靈感物件 2 件（R.pickObjects 的規則：同流派較常出現）；買了的從陣列移走
  objRerolls: 0,
  packs: ['flood', 'street'],  // 素材包 2 個（D.PACKS 的 id，不重複）
  service: 'polish',           // 工作室服務：polish、burn、copy 按 night % 3 輪流（1 → burn、2 → copy、3 → polish……）
  tech: 'triad',               // 技法課：adj、triad、split、comp、tetrad、full、mono 隨機一種（矛盾要 s.formsSeen.paradox 才會出現）
  tool: 'lamp',                // 工具卡 1 張（IE.Stages.randomTool；工具欄滿了就是 null）
  relic: null,                 // 每輪最後一晚之後：{ items: [3 件物件], taken: false }，第一件免費，只可以拿一件
  bought: [],                  // 買過甚麼（'obj:<id>'、'pack:<pid>'、'service'、'tech'、'tool'、'relic:<id>'），每項只可以買一次（物件除外）
};
```

| 素材包 `D.PACKS` | id | 抽卡範圍（素材定義，排除 `rarity: 'legend'`） | 價錢 |
|---|---|---|---|
| 舊城潛水包 | `flood` | 標籤有 water 或 memory | `ECON.pack` |
| 天空區垃圾包 | `sky` | 標籤有 machine 或 neon | `ECON.pack` |
| 街坊包 | `street` | 標籤有 warmth、hunger 或 hope | `ECON.pack` |
| 地下包 | `under` | 標籤有 rebel、anger 或 guilt | `ECON.pack` |
| 遠方包 | `far` | `origin` 不是 home 的素材（不含極稀有）；每張另有 `ECON.packLegend` 的機會換成一張外國的極稀有（★5） | `ECON.packFar` |

- 開包：抽 3 張不同的素材定義，每張按 `ECON.packStars` 擲一個星級（極稀有一律 ★5），存在 `s.pack`；玩家選一張加入素材庫（`R.addCard`，再設定 `card.star`），另外兩張丟掉。素材庫滿了照 `R.addCard` 原有規則。
- 工作室服務：選一張素材（不可以是愧疚素材）。打磨＝升一星（★5 不能再磨，價錢 `ECON.polish[現在星級]`）；燒掉＝從素材庫刪除（素材庫不少於 `ECON.minDeck` 張）；複印＝複製一張（磨損歸零，名字加「（副本）」）。
- 第一局的第 1 晚之後，兩件物件中至少一件是稀有。
- 離開市集：每輪最後一晚之後到篩選日；否則 `advance` 到下一晚。

## §9 篩選日 `IE.Rounds.review(s)`

1. 交租：`rent = ECON.rent[round−1] × 各種修正`。錢夠就扣；不夠：**房東收走你身上全部的錢**（`s.cr = 0`），失去一次機會（原因 `rent`）。
2. 靈魂秤重：`s.soul > R.SOUL_LIMIT` 失去一次機會（原因 `soul`）。
3. 兩項都沒有失去機會：`s.reviewsPassed++`，金色扭蛋券一張（`R.gainTicket(s, 'gold', 1, '通過第 X 輪篩選')`）。
4. 機會用完 → 結局：最後一次失去機會的原因是 `soul` 用 `R.endingFor(s, 'heavy')`，其他用 `R.endingFor(s, 'archived')`。
5. 第 5 輪而且還有機會 → `R.endingFor(s, 'recruited')`（之後的「選擇去不去」流程沿用 `main.js` 的 `chooseToGo`）。
6. 其他情況 → `advance(s)`。

## §10 `IE.Rounds.advance(s)`：到下一晚的白天

- `s.night++`；`s.day = 4 × s.night`；`s.slot = 0`；`s.quarter = R.quarterOf(s.day, s)`；`s.phase = 'day'`；`s.offer = null`；`s.shop = null`。
- 水位：`s.water = min(8.5, s.water + 季節的 water × 4)`。
- 季節：如果 `floor((day − 1) / 20)` 比上一晚大，按 `D.SEASON_ORDER` 換季（照 `R.endDay` 的寫法）。
- 世界事件：`s.events` 中 `until ≤ day` 的移除（照 `R.endDay` 的寫法）；新事件由 `R.morning(s)` 照舊安排。
- AI 對風格的記憶：兩晚之間相隔四天，所以呼叫**四次** `IE.Create.newDay(s)`（與舊模式每天消退一次一致）。
- 素材休息了四天：每張素材的磨損 `wear` 減 1（不低於 0）。
- （WO-15-03 審核時的實驗：沒有這兩項時，即使火花不變，第 3 晚之後每一筆的分數也比第 1 晚低約三成；加上之後差距減半。）
- 一晚失敗或交不起租都不影響 `advance`；機會用完的話不會呼叫 `advance`。

## §11 介面文字 `D.ROUND_TEXT`（介面一律從這裡取字）

`{x}` 是要換成數值的位置（例如 `{cost}` 換成 10）；前面的 `$` 是錢的符號。字串一律用單引號，不是 JavaScript 的範本字串。

```js
ROUND_TEXT: {
  kinds: { work: '工作', shady: '虧心', life: '生活', friend: '朋友', volunteer: '義工', trip: '出國' },
  nightKinds: { small: '社區小展', big: '畫廊聯展', boss: '外星評審' },
  dayTitle: '第 {round} 輪・第 {night}／15 晚',
  dayAsk: '今天做甚麼？',
  reroll: '換一批（${cost}）',
  skip: '睡懶覺（火花 +{v}）',
  byHand: '親手做',
  byAuto: '照舊做（{rank} 級）',
  tonight: '今晚：{kind}・目標 {target} 分',
  rentLine: '本輪租金 ${rent}（第 {day} 天到期）',
  cleared: '收工！',
  early: '提早收工：還有 {n} 次下筆，每次 +${v}',
  failed: '今晚沒有達到目標。失去一次機會。',
  toShop: '前往市集',
  shopTitle: '二手市集',
  leave: '離開市集',
  relic: '遺物：三選一（免費）',
  rentOk: '交租 −${rent}',
  rentFail: '交不起租：房東收走了你身上全部的錢。失去一次機會。',
  soulOk: '靈魂 {soul} 克：光束拉得動你。',
  soulFail: '靈魂 {soul} 克，超過 21 克：光束拉不動你。失去一次機會。',
  nextRound: '進入第 {round} 輪',
  chances: '機會',
  bossAhead: '本輪的外星評審：{rules}',
}
```

## §12 介面元件與 class 名稱（煙霧測試會用到，不要改名）

| 元件 | class／屬性 |
|---|---|
| 白天面板 | `.rd-day`；三張卡 `.rd-card[data-card="<id>"]`；種類標記 `.rd-kind.k-<kind>`；換一批 `[data-do="reroll"]`；睡懶覺 `[data-do="skip"]`；本輪評審預告 `.rd-boss-ahead`（WO-15-08） |
| 出國五選二 | `.rd-trip`；每張 `.rp-card[data-do="trippick"][data-i="0..4"]` |
| 親手做／照舊做 | `[data-do="byhand"]`、`[data-do="byauto"]` |
| 一輪的進度 | `.rd-map`；每晚 `.rm-night.k-<kind>`，狀態 `.done`、`.fail`、`.now` |
| 狀態列 | 機會 `.chip.chances`；第幾晚 `.chip.night`；租金 `.chip.rent` |
| 創作桌 | 今晚目標 `.ct-goal.night`；收工演出 `.ct-cleared`；結束面板按鈕 `[data-end="shop"]` |
| 市集 | `.rd-shop`；物件 `.rs-item[data-slot="obj:<id>"]`；重抽 `[data-do="objreroll"]`；素材包 `.rs-item[data-slot="pack:<pid>"]`；服務 `.rs-item[data-slot="service"]`；技法課 `.rs-item[data-slot="tech"]`；工具卡 `.rs-item[data-slot="tool"]`；遺物 `.rs-relic .rs-item[data-slot="relic:<id>"]`；離開 `[data-do="leave"]` |
| 開包 | `.rd-pack`；每張 `.rp-card[data-i="0..2"]` |
| 選素材（服務） | `.rd-pick`；每張 `.cardpick[data-uid]` |
| 篩選日 | `.rd-review`；交租 `.rr-rent`；秤重 `.rr-soul`；繼續 `[data-do="next"]` |

## §13 第十五期完成的定義

- `rounds` 模式可以由開局玩到任何一種結局，沒有 JS 錯誤；存檔、重新載入、繼續都正確。
- `node tools/test.js`、`node tools/smoke.js`、`node tools/smoke-rounds.js` 全部通過。
- `node tools/sim-rounds.js 200` 達到 WO-15-09 的驗收數字。
- 故事線（§14）在五輪模式玩得到：每輪的章、朋友被收藏（預告、最後一次見面、藏起來）、阿星、今日快訊，以及結局的「你的故事」。
- 舊模式（`standard`、`long`）的模擬結果和第十四期相同（同一個 seed 的結果完全一樣）。

## §14 故事線（WO-15-11 邏輯、WO-15-13 介面；2026-11-01 製作人要求加入，2026-11-02 第二版）

> 世界觀和語氣以 `docs/WORLD.md` 為準，錢的尺度以 `docs/ECONOMY.md` 為準。內容（文字和選項）在 `game/js/data-story.js`（`D.STORY`），由 Claude 撰寫，`tools/tests/story-data.test.js` 檢查；Gemini 不改內容，只實作邏輯和介面。
> 第二版（製作人 2026-11-02）：每章四至五個選項（新增「為別人」）；極端的選項之後會反轉（物極必反）；故事線的錢按城市換算，文字裡的金額寫佔位符。

### 1. 四條線

| 線 | 內容 | 甚麼時候 |
|---|---|---|
| 角色線 | 每個角色一條：每輪一章，每章四至五個人生選項（生存、兼顧、巔峰、為別人；部分是極端的選項，之後會反轉）；選擇會改變之後的章；一局結束時有這個角色的結語 | 每輪第一天的早上 |
| 朋友線 | 第 1 至 4 輪各有一位朋友被一個外星種族收藏；有預告、有最後一次見面、可以把對方藏起來；被收藏之後傳來近況 | 預告在每輪第一天；收藏在篩選日 |
| 阿星線 | 隔一晚一則訊息（第 1、3、5……15 晚） | 白天面板 |
| 今日快訊 | 每天一則 2080 年的新聞 | 白天面板 |

### 2. 狀態欄位（五輪模式；舊存檔沒有時由 `IE.Story` 建立）

```js
s.city = 'zone7'; // 所在城市（§6.1）
s.story = {
  done: [],      // 已經回答的章 id
  pending: null, // 今天要回答、還沒有回答的章 id（重新載入時仍然在）
  flags: {},     // 故事旗標
  side: 0,       // 光譜：survive −1、peak +1、both 和 others 0；極端的選項加倍（−2、+2）
  notice: {},    // 外星種族對你的注意 { 種族 id: 次數 }
  log: [],       // [{ night, id, i }]
  later: [],     // 未發生的反轉 [{ round, id, i }]（§14.3 物極必反）
  plan: {},      // 收藏預告 { 輪: { npc, species } 或 null }
  met: {},       // 本輪見過最後一面 { npc: 輪 }
  hidden: {},    // 藏起來 { npc: 輪 }
  taken: {},     // 被收藏 { npc: { round, species, met } }
  fates: [],     // 待顯示的近況 [{ npc, species, night }]
};
s.nightMod = null; // { night, mult }：fx.target 留給下一晚的目標倍數
s.rentMod = null;  // { round, mult }：fx.rent 留給本輪租金的倍數
```

### 3. 角色線

- 資料：`D.STORY.lines[角色 id] = { chapters: [...], epilogue: [...] }`。
- 章：`{ id, round, day, city, if, unless, text, options }`。
  - `day` 是本輪的第幾天（1 至 3；現在全部是 1，之後可以加）；`if`、`unless` 是旗標的陣列。
  - `city`（可以沒有）：城市 id 的陣列，只在這些城市出現；沒有就每座城市都出現。
  - `options`：四至五個 `{ label, side, fx, line, extreme, later }`。`side` 是 `survive`、`both`、`peak`、`others` 其中一個；每章至少有生存、兼顧、巔峰各一。
- `IE.Story.chapter(s)`：今天是本輪的第 `day` 天，找 `round` 等於本輪、城市符合、`if` 全部成立、`unless` 全部不成立、而且不在 `done` 的第一章；有的話設 `pending` 並回傳。同一天重複呼叫回傳同一章。這個角色還沒有內容就回傳 null。
- `IE.Story.choose(s, i)`：套用 `pending` 那一章的第 i 個選項，回傳報告（`R.report`，標題是選項的 `label`，第一行是 `say` 之後的 `line`）；記在 `done`、`log`；`side` 累加（極端加倍）；極端的選項在 `later` 加 `{ round: 本輪 + later.after, id, i }`；`pending = null`。
- **物極必反**（極端的選項，`extreme: true`）：現在得到很多；`later.after` 輪之後的第一天自動反轉。
  - `IE.Story.reversals(s)`：今天要發生的反轉（`later` 中 `round` 等於本輪，而且今天是本輪第一天），回傳 `[{ id, i, text, fx }]`（`text` 已經 `say`）；不改變狀態。
  - `IE.Story.reverse(s)`：套用這些反轉的 `later.fx`，從 `later` 移除，回傳報告（標題 `D.STORY.text.reversalHead`，每一則一行）；沒有就回傳 null。
  - 介面先顯示反轉、玩家按確認才呼叫 `reverse`；重新載入時反轉仍然在，不會重複套用。
- **白天的流程**（`main.js` 的 `roundsDay` 和 `tools/sim-rounds.js` 必須相同）：`R.morning(s)` → `IE.Story.plan(s)` → 有反轉就 `IE.Story.reverse(s)` → `IE.Story.chapter(s)`：**有章就先回答，而且那一天不抽道德抉擇** → 沒有章才 `R.drawDilemma(s)` → 生活卡。
- 選項的效果 `fx`（反轉的 `later.fx` 也一樣，但不設旗標）：

| 鍵 | 意思 |
|---|---|
| `cr` | 錢 ±（按城市換算：`IE.Story.money`） |
| `spark` | 火花 ±（`R.addSpark(s, v, true)`） |
| `sin`、`guilt`、`tag` | 靈魂變重（`R.sin`）；`sin` ≥ 1 時留下愧疚素材（名稱 `guilt`、第二個標籤 `tag`） |
| `atone` | 靈魂變輕（`R.atone`） |
| `card` | 得到一張故事素材 `{ name, tags, value, star, medium }`（`R.addCard` 加入素材庫，不登記在 `D.CARDS`） |
| `obj` | 得到一件靈感物件（`R.gainObject`） |
| `form` | 配色升級 `{ 配色 id: 1 }` |
| `friend` | 熟絡度 `{ npc: 1 }` |
| `chance` | 機會 ±1（最多 3；變成 0 時進入「人才庫」結局） |
| `target` | 下一晚的目標乘這個倍數（`s.nightMod`，`IE.Rounds.target` 讀取） |
| `rent` | 本輪的租金乘這個倍數（`s.rentMod`，`IE.Rounds.rentOf` 讀取） |
| `notice` | 外星種族的注意 `{ 種族 id: n }`（只記錄，結局和之後的工單用） |
| `set` | 設定旗標（字串或陣列） |

- **有得必有失**（`docs/WORLD.md` 第五節）：每個選項至少有一項「得」和一項「失」；每個反轉至少有一項「失」。得：`cr`、`spark`、`friend`、`chance` 大於 0；`atone`、`card`、`obj`、`form`；`target`、`rent` 小於 1。失：`cr`、`spark`、`chance` 小於 0；`sin`；`target`、`rent` 大於 1。`notice` 和 `set` 不算。
- **錢按城市換算**（`docs/ECONOMY.md` 第六節）：
  - `IE.Story.money(s, v)` = `round(v × (v ≥ 0 ? econ.pay : econ.price) × econ.inflation^(本輪 − 1))`，`econ` 是 `D.CITIES[s.city].econ`。
  - `IE.Story.fmt(s, v)` = `currency.symbol` + `|v| × currency.rate`（千位加逗號，不帶正負號）。
  - `IE.Story.say(s, str, fx)`：把文字裡的 `{cr}` 換成 `fmt(s, money(s, fx.cr))`、`{rent}` 換成 `fmt(s, IE.Rounds.rentOf(s, 本輪))`、`{city}` 換成城市名、`{currency}` 換成貨幣名。章的 `text`、選項的 `label` 和 `line`、反轉的 `text`、結語都要經過 `say`。
- 選項上顯示 `side`、極端的標記和效果：`IE.Story.fx(s, option)`，格式同 `R.optionFx`，金額已經換算；極端的選項另加一行 `['note', '物極必反（' + after + ' 輪後）：' + 反轉效果的摘要]`。玩家選擇之前看得見代價。
- 結語：`D.STORY.lines[角色].epilogue = [{ if, unless, text }]`，`IE.Story.epilogue(s)` 用第一個成立的。

### 4. 朋友線（收藏，做法 B）

1. **預告**：每輪第一天（第 1、4、7、10 晚），`IE.Story.plan(s)` 決定本輪的收藏：種族是 `D.STORY.collectOrder[本輪 − 1]`；候選是還在浮城、沒有被收藏、而且 `D.STORY.friends[npc].collectors` 包含這個種族的朋友；沒有就用其他還在浮城的朋友；`R.pick` 一位，存在 `s.story.plan[本輪]`。一位朋友都不在浮城就不收藏（`plan[本輪] = null`）。同一輪重複呼叫不再抽。第 5 輪不收藏。
   - 文字：朋友的 `why[種族]`、`fate[種族]`；改抽其他朋友時朋友沒有這個種族的文字，用 `D.STORY.species[種族].why`、`.fate`（`{npc}` 換成朋友的名字）。
2. **最後一次見面**：本輪第二天，生活卡的第二張固定是這位朋友的朋友卡（`IE.Rounds.offer` 的出牌規則；朋友已經藏起來或不在就照舊）。選了這張朋友卡：`met[npc] = 本輪`。
3. **藏起來**：朋友卡的聊天視窗多一個選項；`IE.Story.hide(s, npc)` 付 `|IE.Story.money(s, −ECON.hideCost[本輪 − 1])|`（錢不夠回傳失敗），`hidden[npc] = 本輪`，`notice[種族] += 1`，然後照常聊天。
4. **收藏**：`IE.Rounds.review` 在交租和秤重之後、`advance` 之前呼叫 `IE.Story.collect(s, rep)`：
   - 機會已經用完：不收藏；
   - 藏起來了：不收藏，報告加 `hiddenLine`；
   - 否則：朋友 `alive = false`，記在 `taken`；見過最後一面就得到贈物（`gift` 物件）和 `farewell`，沒見就得到一張紙條素材（`note`）和 `nomeet`；報告加上這些文字，`rep.collect = { npc, species, met, hidden }`；
   - `fates` 加一則，下一晚的白天顯示 `fate[種族]`。
5. 結局：`IE.Story.epilogue(s)` 回傳 `{ line, friends: [{ npc, state: 'taken' | 'hidden' | 'stayed', species }], side: 'survive' | 'both' | 'peak', others }`（`side` ≤ −2 生存、≥ 2 巔峰、其餘兼顧；`others` 是選了「為別人」的次數；`line` 已經 `say`）。

### 5. 阿星和今日快訊

- `IE.Story.astar(s)`：`D.STORY.astarNights[s.night]` 是 `D.ASTAR` 的日子，回傳那則訊息（`{ style, text }`）；沒有就 null。
- `IE.Story.feed(s)`：**不使用隨機數**。今天的早上動態（`s.morning.feed`）有世界事件（`kind === 'world'`）就用它；否則用 `D.STORY.feed[(s.night × 7 + |s.seed|) % 長度]`。
- `IE.Story.fate(s)`：今晚要顯示的近況（`fates` 中 `night === s.night` 的那幾則）。

### 6. 數值

- `ECON.hideCost: [80, 120, 160, 200]`：把朋友藏起來的費用（第 1 至 4 輪，第 7 區的數值）。
- 故事線的錢的尺度（`story-data.test.js` 檢查，R 是這一輪的租金）：一般的選項收入不超過 0.8R、支出不超過 0.5R；極端的選項不超過 1.5R；反轉不超過反轉那一輪的 0.5R。

### 7. 介面（WO-15-13；煙霧測試會用到，不要改名）

| 元件 | class／屬性 |
|---|---|
| 章 | 視窗 `.rd-story`；選項 `[data-do="storypick"][data-i="0..4"]`；光譜標記 `.st-side.s-survive`／`.s-both`／`.s-peak`／`.s-others`；極端的標記 `.st-extreme` |
| 反轉 | 視窗 `.rd-reversal`；確認 `[data-do="reverse"]` |
| 白天面板 | 阿星 `.rd-astar`（加 `.st-casual`、`.st-memo`、`.st-auto`、`.st-glitch`）；今日快訊 `.rd-feed`；收藏預告 `.rd-collect`；朋友近況 `.rd-fate` |
| 朋友卡 | 最後一次見面 `.rd-card .rd-last`；聊天視窗的藏起來 `[data-do="hide"]` |
| 篩選日 | 收藏那一行 `.rr-collect` |
| 人類樣本檔案 | 你的故事 `.d-story`；朋友們 `.d-friends`；光譜 `.d-side`（包括「為別人」的次數，`D.STORY.text.othersCount`） |

介面文字取自 `D.STORY.text`；金額一律經 `IE.Story.fmt`。
