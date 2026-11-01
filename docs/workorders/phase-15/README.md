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

## §6 數值表 `D.ECON`（初始值；WO-15-09 用模擬器校準）

```js
ECON: {
  // 目標
  t1: 4000,             // 第 1 晚的目標
  growth: 1.45,         // 之後每晚 ×1.45
  firstRunEase: 0.7,    // 第一局的第 1、2 晚目標 ×0.7
  // 創作桌
  hand: 8, plays: 4, discards: 3,
  // 收入
  nightPay: { small: 60, big: 90, boss: 140 },
  payGrowth: 0.25,      // 每多一輪，獎金 +25%
  earlyBonus: 10,       // 每次沒有用的下筆
  overkillSpark: 0.2,   // 分數達到目標兩倍：火花 +0.2
  failSpark: -0.3,      // 一晚失敗：火花 −0.3
  // 篩選日
  rent: [120, 180, 260, 360, 480],
  // 白天
  offerReroll: [10, 20, 30],      // 換一批生活卡（第 4 次起都是最後一個價錢）
  skipSpark: 0.2,                 // 睡懶覺
  tripCost: 120, tripPick: 2,     // 出國：五選二
  // 市集
  objReroll: [20, 30, 40, 50],    // 重抽物件
  pack: 40, packFar: 70,          // 素材包
  packStars: [0.55, 0.27, 0.12, 0.05, 0.01],  // 素材包的星級機會（★1 至 ★5）
  packLegend: 0.03,               // 遠方包每張素材是極稀有（★5）的機會
  polish: [0, 30, 60, 100, 160],  // 打磨：★1→2 是 polish[1]……★4→5 是 polish[4]
  burn: 20, copy: 50, minDeck: 8,  // 起始素材庫約 11 張
  tech: 50, techStep: 25,         // 技法課：50 + 25 ×（現在等級 − 1）
  toolMult: 1,                    // 工具卡價錢 × toolMult
  sparkFloor: 1,
}
```

物件價錢沿用 `D.OBJ_PRICE`（普通 90、稀有 160、傳說 260）；所有價錢都乘 `IE.Meta.stakeMod(s, 'prices')`，租金乘 `stakeMod(s, 'rent')`、`R.worldMods(s).rentMult`、角色的 `perk.rentMult`；目標乘 `stakeMod(s, 'stageTarget')`。

**目標公式**：`target(s, k) = sig3(ECON.t1 × ECON.growth^(k−1) × stakeMod(s, 'stageTarget') × (s.firstRun && k ≤ 2 ? ECON.firstRunEase : 1))`，`sig3` 是取三位有效數字（例如 12,345 → 12,300；4,000 → 4,000）。

**獎金公式**：`reward = round(ECON.nightPay[kind] × (1 + ECON.payGrowth × (round − 1))) + ECON.earlyBonus × playsLeft`。

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
- 舊模式（`standard`、`long`）的模擬結果和第十四期相同（同一個 seed 的結果完全一樣）。
