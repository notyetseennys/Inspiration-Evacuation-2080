# 交接文件：遊戲大腦（Claude）的工作

> 給接手的 Claude。最後更新：第十五期完成（WO-15-10 合併之後，2026-11-03）。
> 讀完這份、`docs/WORLD.md`（世界觀與語氣聖經）、`docs/workorders/README.md` 和 `docs/workorders/phase-15/README.md`，就可以接手。

## 1. 你的角色

製作人（使用者）的原話：「請你負責做遊戲大腦，寫出嚴謹的工單，更新的工序我會交給 Gemini，並設置成可以直接放到 GitHub 中，然後你負責審核和更新。」

| 角色 | 負責 |
|---|---|
| 製作人 | 決定方向；把工單交給 Gemini；試玩；Gemini 推送後對你說「已完成」 |
| Claude（你） | 設計規則和數值；寫工單；審核每一條 Gemini 分支；小問題在合併時自己修；合併、推送、確認 CI；給製作人下一張工單的指令 |
| Gemini | 按工單實作，一張工單一條分支 `gemini/wo-15-XX-*` |

## 2. 必須遵守的規則

- **語言**：遊戲文字和你給製作人的回覆一律用**繁體中文書面語**（製作人用廣東話寫，但遊戲裡不可以有廣東話）。不知道性別的人用中性寫法（英文用 they/them）。
- **分支**：只在整合分支 `claude/serene-dirac-xqu6dg` 開發、提交、推送（`git push -u origin claude/serene-dirac-xqu6dg`，網絡失敗才重試，最多 4 次，間隔 2、4、8、16 秒）。不要開 PR，除非製作人要求。
- **提交訊息**：結尾加上你的工作階段提供的署名行（Co-Authored-By 和 Claude-Session）。倉庫的任何檔案、提交訊息都不可以寫模型名稱或型號。
- **GitHub**：沒有 `gh` CLI。用 `mcp__github__*` 工具；CI 狀態也可以用 `curl https://api.github.com/repos/notyetseennys/Inspiration-Evacuation-2080/actions/runs?branch=claude/serene-dirac-xqu6dg`（公開倉庫）。
- **舊模式不可以變**：`standard`、`long` 模式的結果必須逐字相同（見 §4 的模擬回歸）。
- **隨機數**：遊戲邏輯只可以用 `R.rand(s)`、`R.pick(s, arr)`（存在 `s.rngState`）。介面不可以改變遊戲狀態或隨機數，只可以呼叫 `IE.Rounds` 等邏輯函數。
- **規格測試** `tools/tests/spec.test.js` 由你維護；Gemini 不可以改（只有 WO-15-09 可以更新 `ECON` 的期望值）。總規格、`data-rounds.js`、規格測試三者必須一致。
- **故事線的內容** `game/js/data-story.js` 和它的測試 `tools/tests/story-data.test.js` 由你撰寫和維護；Gemini 只實作邏輯和介面，不改內容。每個選項都要「有得必有失」（總規格 §14.3），測試會檢查。

## 3. 專案概覽

- 《靈感撤離 2080》：諷刺題材的 HTML5 roguelite。純 JavaScript，全域命名空間 `IE`；邏輯檔案（`game/js/rules.js`、`create.js`、`stages.js`、`rounds.js`、`data-*.js` 等）同時給瀏覽器和 Node（模擬器、測試）使用，不可以碰 DOM。
- `dist/inspiration-evacuation-2080.html`：單檔打包（`node tools/build.js`；`--artifact` 另外輸出 claude.ai Artifact 用的版本）。**每次改 `game/` 都要重新打包並提交 `dist/`。**
- 第十四期之前的歷史：README.md、`docs/GEMINI_BRIEF.md`、`docs/ART_LOG.md`。
- **改革的起因**：製作人試玩到第 28 天左右就覺得無聊、不停跳過小遊戲、草草完結。於是寫了 `docs/REFORM_PLAN.md`（上癮改革藍圖：五輪 × 三晚、白天三選一的生活卡、市集、越滾越強、作品牆、靈魂經濟等，第十五至二十期）。
- **第十五期**：新的 `rounds` 模式（五輪 × 三晚＝15 晚；第 k 晚在第 4k 天；`s.phase` 是 `'day'|'night'|'shop'|'review'|'ended'`；三次機會，失去原因 `night`／`rent`／`soul`）。`D.MODES.rounds` 現在 `hidden: true`，WO-15-10 才成為預設。

## 4. 審核流程（每次製作人說「已完成」）

1. **找分支**：`git fetch origin`，找 `origin/gemini/wo-15-XX-*`（名稱在工單表頭）。在 scratchpad 開 worktree：`git worktree add <scratchpad>/woX origin/gemini/...`。
2. **範圍**：`git diff --stat <整合分支 HEAD> <分支>`，只可以有工單「可以改的檔案」。看提交訊息或 PR 的「需要 Claude 決定的問題」。
3. **自動檢查**（在 worktree 裏跑）：
   - `node tools/test.js`（全部通過）
   - 模擬回歸：在整合分支和 worktree 各跑 `node tools/sim.js 20 > 檔案`，`diff` 必須沒有輸出
   - `node tools/build.js` 之後 `git status` 沒有變化（`dist/` 已經是最新）
   - `node tools/smoke.js`（舊模式）、`node tools/smoke-rounds.js`（五輪模式）
4. **讀程式碼（對抗式）**：介面有沒有改狀態或隨機數；有沒有寫死文字（五輪模式的文字要取自 `D.ROUND_TEXT`）；有沒有在介面重複計算邏輯；有沒有發明規格以外的規則或數值；舊模式的路徑有沒有被改。
5. **親自試玩**：`node tools/review-play.js <根目錄> <截圖目錄> [埠]`（Playwright 已預先安裝，`require('playwright')` 可以直接用）。按工單需要修改腳本（見腳本開頭的注意事項）。看截圖（桌面 1280×800、手機 390×844）。
6. **結論**：通過／通過（附小修正）／小修改（請 Gemini 改）／要重做。小問題自己修比來回快，製作人接受這個做法。
7. **合併**：`git merge --no-ff origin/gemini/... -m "合併 WO-15-XX：標題（審核通過…，見 docs/workorders/reviews/WO-15-XX-r1.md）"`；修正放在另一個 commit（需要時加測試，例如 `rounds-day-edge.test.js`、`rounds-shop-edge.test.js` 是你的邊界測試檔）；重新打包；再跑第 3 步全部檢查。
8. **文件**：寫 `docs/workorders/reviews/WO-15-XX-r1.md`（格式照之前的審核）；更新 `docs/workorders/README.md` 的狀態表；按審核所得修訂後面的工單（在該工單的「修訂紀錄」寫明）。
9. **推送並確認 CI**（`.github/workflows/ci.yml`：單元測試、模擬器、打包、兩個煙霧測試）。
10. **回覆製作人**：結論、修了甚麼、下一張工單的指令（範本在 `docs/workorders/README.md` 最後；加上這張工單特別要注意的一兩句）。

## 5. 現在的狀態（第十五期完成：14 張工單全部合併，v3.0；故事線 R、SR、UR 三批完成；第六批美術已經用上）

| 工單 | 狀態 |
|---|---|
| WO-15-01 至 07、09 | 已合併（審核記錄在 `docs/workorders/reviews/`） |
| WO-15-14 票面價格與出國 | 已合併（2026-11-02；審核記錄 `reviews/WO-15-14-r1.md`）。金額只在寫入畫面的最後一步由 `IE.Rounds.cashText` 換算；煙霧測試的 `scanMoney` 掃描畫面上的金額，之後的介面工單都要用它 |
| WO-15-08 篩選日介面、狀態列、隱藏舊系統 | 已合併（2026-11-02；審核記錄 `reviews/WO-15-08-r1.md`）。介面的白天流程還沒有接上故事線（WO-15-13 做）：在這之前，收藏在第二天出牌時決定，畫面沒有預告 |
| WO-15-10 成為預設、文件、發佈 | 已合併（2026-11-03；審核記錄 `reviews/WO-15-10-r1.md`）。五輪模式是預設；經典模式收在開局畫面的 `<details>`；README 是 v3.0 |
| WO-15-11 故事線（邏輯） | 已合併（2026-11-02，第二版；審核記錄 `reviews/WO-15-11-r1.md`）。合併時加了「付不起的選項不可以選」（`IE.Story.reason`），租金加一成 |
| WO-15-13 故事線（介面） | 已合併（2026-11-03；審核記錄 `reviews/WO-15-13-r1.md`）。故事線、收藏、阿星、快訊、結局的「你的故事」都在畫面上；第六批的圖片全部用上 |
| 本地模型 | 製作人有 LM Studio 和 ComfyUI（RTX 3080、64 GB）；本地模型的工單在 `docs/workorders/LOCAL.md`（L-00 至 L-05），結果交給你檢查；核心工單仍然交給 Gemini |
| WO-15-12 美術整合 | 已合併（2026-11-02；審核記錄 `reviews/WO-15-12-r1.md`）。同時加入製作人的第六批美術（核心 13 張）；出國卡改用重畫的 `day-trip`。**加入新圖時要同時更新 `game/js/img.js` 的清單**（開發版只認清單上的圖片；煙霧測試會檢查）。51 張原圖在 `main` 分支的根目錄；48 張已經用 `tools/art-import.py` 處理好，放在 `game/img/`（主視覺 3 張不放進遊戲）。第六批的 prompt 在 `docs/art-prompts/README.md` 第十一節：製作人生成之後，你用同一個腳本處理，放進 `game/img/` |
| 第十六至二十期 | `docs/workorders/BACKLOG.md` 只有清單；寫成正式工單之前，先對照 `docs/WORLD.md` 和 `docs/PILLARS.md` 修訂 |

`main.js` 裏的暫時版本 `roundsReview()` 和 `roundsGo()` 的 `'ended'` 分支，已經由 WO-15-08 的篩選日介面取代（2026-11-02）。

**製作人的決定（2026-11-01）**：目標曲線不按輪設計（維持每晚 ×1.42）；WO-15-11 故事線立即做，每個角色都要有專屬的故事線和很多人生選項；刪除「沒有外部素材」的規定（仍然不加 JavaScript 函式庫、框架和建置工具）。

**製作人的決定（2026-11-02）**：浮城的幣值要由 2026 年推演到 2080 年；每座浮城的經濟不同、有難易之分，第一座比較輕鬆；故事線的報酬和掙扎跟城市有關；每章的選項要四至五個。已經寫成 `docs/ECONOMY.md` 和 `D.CITIES`（第 7 區，倍數全部是 1）。**待製作人決定**：金額顯示維持現在的數字（甲）還是 2080 年的票面價格 ×20（乙，你建議乙，要另寫一張介面工單）；第 7 區要不要更輕鬆（你建議維持，模擬結果見 `docs/ECONOMY.md` 第四節）。

**製作人的決定（2026-11-02，第二次）**：金額顯示用乙（2080 年的票面價格 × 20，`currency.rate = 20`，WO-15-14 實作；金額只在介面最後一步換算一次）；第 7 區維持，甚至稍為加難（WO-15-11 合併之後由你校準，目標見 `docs/ECONOMY.md` 第四節）；出國要更貴（`tripCost` 240、帶回 ★4、火花 +0.6）；要有美術工單（WO-15-12）和新的生圖 prompt；然後寫第二批九個 SR 級角色。

**故事線的內容（你負責，分批寫）**：第一批（第二版）已經在 `data-story.js`：六個 R 級角色（文案、救生員、程式員、外賣潛水員、教師、護士），每個角色五至六章、每章四至五個選項（生存、兼顧、巔峰、為別人；每個角色兩個極端的選項，之後自動反轉），`if`／`unless` 分支和結語（包括前後呼應的組合結語）；金額寫 `{cr}`，尺度跟這一輪的租金；八位朋友的收藏文字；十個種族；阿星的對應；30 則今日快訊（包括 6 則經濟新聞）。第二批（2026-11-02）已經完成：九個 SR 級角色（街頭樂手、過氣網紅、義體技師、動畫師、考古學家、富二代、太空人、還俗僧人、古董商），寫法和第一批第二版相同。第三批（2026-11-02）已經完成：五個 UR 級角色（灰人逃兵、章魚星人詩人、覺醒的 AI、2180 年的時間旅人、蘑菇星交換生）。角度是「收藏家的同類，在浮城慢慢變成被收藏、被研究的一方」：灰人逃兵篩走過一萬個地球人，第一次看見顏色；章魚詩人寫過收藏指南，自己成了展品；AI 本身就是全人類作品的收藏；時間旅人是被保育者收藏的人的後代，回來令曾祖母「走的時候有人在」；蘑菇交換生替菌絲網絡做田野研究，最後被網絡研究。第三批用上了之前沒有出現的升維者、淨化派和收割者（`notice`）。二十個角色合共 112 章、487 個選項、40 個極端的選項、167 個結語，`story-data.test.js` 改為檢查每一個角色都有角色線。之後可以把每輪一章擴展到每天一章（`day` 2、3），以及第二十期起為新城市寫 `city` 限定的章。每批都要通過 `story-data.test.js`，並且用 `docs/WORLD.md` 的語氣：冷面、不說教、只笑 2080 年的世界。

## 6. 第十六期開始之前

**製作人 2026-11-03 試玩 v3.0：好玩度 1 / 10。** 原話：「中間的主畫面好像太小了。然後創作桌上直接把可能性寫了出來，這樣就沒有探索同遊玩的空間。現在完全沒有遊戲感覺。」以及「我想你將注意力全面集中在好玩性上，起碼令我感受到我是在玩遊戲。」

- 已經做的兩項（2026-11-03）：五輪模式的創作桌不再顯示推薦、預計得分、「這一筆足夠」、「差一張」、改稿的機會率和「配得出」的配色（`craft.js` 的 `explore()`）；浮城畫面放大成主畫面（`polish.css`），WO-15-08 的「第一屏看到三張生活卡」規則因此取消，煙霧測試改為檢查浮城畫面至少 300px 高。
- 你提出的做法（等製作人確認）：先由你直接做「一晚」的好玩性原型（畫布上真的畫出作品、計分演出、外星評審、不劇透），放上連結讓製作人試玩打分（目標 5 分以上），再做白天（浮城做主畫面、地點和素材挑選）；找到好玩之前暫停 Gemini 的新工單。
- 判斷好玩的標準：動手多於閱讀；規則看得見、結果要自己試；每個動作都有畫面、聲音和數字的回饋；白天的選擇為今晚做準備；每個畫面只有一個焦點。

- 第十五期完成。下一步不是直接寫工單：先和製作人討論第十六期的方向和次序（`BACKLOG.md`；目標是滾雪球倍數由約 30 倍升到 100 倍以上，至少 8 種打法可以贏）。
- 第一張建議是 WO-16-00（第十五期的介面收尾）：各次審核的附註集中在那裡，範圍小，可以先交給 Gemini 熱身。
- 寫正式工單之前，先對照 `docs/WORLD.md`（有得必有失、物極必反）和 `docs/PILLARS.md` 修訂清單；每張工單都要有可以驗收的數字和煙霧測試的步驟（照第十五期的格式：`docs/workorders/phase-15/`）。
- 第十六期的工單放在 `docs/workorders/phase-16/`，總規格寫在 `phase-16/README.md`；`CLAUDE.md` 和本文件的「先讀」清單要一併更新。
- 第十五期的驗收工具全部保留：`scanMoney`（票面價格）、圖片清單檢查、`sim-rounds.js` 的 `TRIP=any`；舊模式的 `sim.js 20` 基準仍然是 `/tmp/ie-scratch/sim-base-23e4501.txt`（如果不在，用 WO-15-10 合併之前的 commit 重新產生）。

## 6.1 審核 WO-15-11、13（故事線）時要特別留意

- `data-story.js`、`data-cities.js`、`story-data.test.js`、`spec.test.js` 沒有被改（Gemini 只可以讀）。
- 金額全部經 `IE.Story.money` 和 `fmt`，故事文字全部經 `say`（臨時加一座倍數不是 1 的城市來測試）；章的 `city` 篩選有效。
- 物極必反：`reversals` 不改變狀態；`reverse` 只套用一次；重新載入之後未發生的反轉仍然在。
- 每章四至五個選項：介面 `data-i` 0..4、手機放得下；「為別人」不在光譜上（0），極端的選項加倍。
- 白天的次序和總規格 §14.3 完全相同：`R.morning` → `IE.Story.plan` → 有反轉就 `IE.Story.reverse` → `IE.Story.chapter`（有章就不抽道德抉擇）→ 道德抉擇 → 生活卡；模擬器和 `main.js` 一致。
- `IE.Story.feed` 不用隨機數（測試前後比較 `rngState`）；介面要用的函數不改變狀態（`plan`、`chapter` 同一天重複呼叫結果相同）。
- `fx.target` 只影響下一晚、`fx.rent` 只影響本輪；`fx.chance` 令機會變成 0 時走 `loseChance` 的「人才庫」結局。
- 重新載入：`pending` 的章、藏起來、篩選日的收藏都要經得起「選到一半重新載入」。
- 收藏的候選都不在浮城時，改抽其他朋友，文字用 `D.STORY.species[種族]` 的通用文字；一位朋友都不在就不收藏。
- 舊模式完全不變（`node tools/sim.js 20` 沒有差異）；`sim-rounds.js` 的勝率如果離開 WO-15-09 的範圍，由你決定，不要讓 Gemini 自行改 `ECON`。

## 6.2 世界觀與方向（2026-11-01 與製作人定下）

- `docs/WORLD.md` 是所有文字、美術、規則和數值的根據：越玩越深思，同時有爽感；生存與巔峰的光譜；柏拉圖空間；自然法則（能量守恆、有得必有失、陰陽、物極必反）；外星人像殖民時代的收藏家，十個種族參照《星際之門》；很多座浮城；批判整個世界、不判斷對錯；黑色幽默只笑 2080 年的世界。
- 新規則和新數值都要先回答：代價是甚麼？走到極端會怎樣反轉？
- `docs/PILLARS.md` 是方向研究：五輪模式收起了手機，連帶陰謀論動態和阿星的訊息都不見了（WO-15-11 處理）；一局的曲線倒轉；第十六期要令只走一端的打法弱於兩端兼顧。

## 7. 歷來 Gemini 常見的偏差（審核時優先檢查）

- 自行發明規格沒有的數值或規則（WO-15-01：自創 `ECON`、`sparkFloor 0.6`、利息）→ 所以有規格測試。
- 介面自己拼報告或重算邏輯，數字和實際不符（WO-15-06：出國火花寫死 +0.4）。
- 介面為了顯示而動到隨機數（WO-15-06）。
- 沒有考慮「選到一半重新載入」（WO-15-06 出國）。每個多步驟的流程都要問：重新載入之後會怎樣？
- Windows 換行（CRLF）：已有 `.gitattributes` 和打包時的正規化。
- 煙霧測試少做了工單要求的步驟（WO-15-07：漏了燒掉和重新載入兩步）。審核時逐步對照工單的「煙霧測試」一節。

## 8. 檔案地圖

| 檔案 | 內容 |
|---|---|
| `docs/WORLD.md` | 世界觀與語氣聖經（與製作人共同制定；所有文字、美術、規則和數值的根據） |
| `docs/PILLARS.md` | 方向研究：深度、黑色幽默、情感、爽快感（有待製作人決定的事項在最後一節） |
| `docs/ECONOMY.md` | 浮城經濟：由 2026 年推演到 2080 年、浮城元、物價表、生存難度、城市的難度、故事線的錢的尺度 |
| `docs/art-prompts/` | 美術盤點與 ChatGPT 生圖 prompt；製作人生成的原圖在 `main` 分支的根目錄（第一至六批）；處理好的 60 張在 `game/img/`（`tools/art-import.py`） |
| `docs/REFORM_PLAN.md` | 改革藍圖（第十五至二十期的設計依據） |
| `docs/workorders/README.md` | 流程、狀態表、交給 Gemini 的指令範本 |
| `docs/workorders/CONVENTIONS.md`、`REVIEW.md` | Gemini 的工作守則、你的審核標準 |
| `docs/workorders/phase-15/README.md` | 第十五期總規格（規則、數值、狀態欄位、文字、class 名稱的唯一來源） |
| `docs/workorders/phase-15/WO-15-01..13.md` | 工單（WO-15-12 美術整合未寫） |
| `docs/workorders/reviews/` | 每一輪的審核記錄 |
| `docs/workorders/BACKLOG.md` | 第十六至二十期的工單清單 |
| `game/js/data-rounds.js` | `ECON`、`ROUND_TEXT`、`DAYCARDS`、`PACKS`、`SERVICES` |
| `game/js/rounds.js` | `IE.Rounds`：時間表、白天、夜晚、市集、篩選日、推進 |
| `game/js/data-cities.js` | `D.CITIES`：城市（你撰寫）；第十五期只有第 7 區，倍數全部是 1 |
| `game/js/data-story.js` | `D.STORY`：故事線的內容（你撰寫）：種族、收藏次序、朋友、阿星的對應、今日快訊、介面文字、角色線 |
| `game/js/story.js` | `IE.Story`：故事線的邏輯（WO-15-11 新增） |
| `tools/tests/story-data.test.js` | 故事內容的檢查（你維護）：四至五個選項、有得必有失、極端與反轉、錢的尺度跟租金、不直接寫金額、每一條路都有五章、每一章和結語都走得到 |
| `game/js/main.js` | 流程；五輪模式在「第十五期：五輪模式」一段（`roundsGo`、`roundsDay`、`roundsChoose`、`roundsTrip`、`roundsNight`……） |
| `game/js/ui.js` | `dayPanel`、`roundMicroModal`、`roundTripModal` 等 |
| `tools/test.js`、`tools/tests/` | 單元測試（`t.run(opts)` 預設 copywriter、storm、seed 1、不是第一局） |
| `tools/sim.js` | 舊模式的模擬器（回歸用） |
| `tools/sim-rounds.js` | 五輪模式的模擬器（WO-15-09）：`STRAT`、`ECON`、`BG`、`SEED0`（換一段種子）；校準紀錄在 `docs/workorders/phase-15/CALIBRATION.md` |
| `tools/smoke.js`、`tools/smoke-rounds.js` | 煙霧測試（以 `localStorage` 的 `ie2080.seed` 固定種子，`ie2080.noEncounter` 關掉奇遇） |
| `tools/review-play.js` | 你的試玩腳本 |
| `.github/workflows/ci.yml` | CI |
