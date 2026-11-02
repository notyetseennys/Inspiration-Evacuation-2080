# 交接文件：遊戲大腦（Claude）的工作

> 給接手的 Claude。最後更新：WO-15-07、09 合併之後（2026-11-01）。
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

## 5. 現在的狀態（WO-15-07、09 合併；故事線第一批第二版、浮城經濟之後）

| 工單 | 狀態 |
|---|---|
| WO-15-01 至 07、09 | 已合併（審核記錄在 `docs/workorders/reviews/`） |
| WO-15-08 篩選日介面、狀態列、隱藏舊系統 | **可以開始**（WO-15-07 審核後加了 §6：篩選日的重新載入） |
| WO-15-10 成為預設、文件、發佈 | 等 08、11、13（第二版：故事線要在發佈之前完成） |
| WO-15-11 故事線（邏輯） | **可以開始**（第二版，2026-11-02），可以和 08 同時做；規格在總規格 §6.1、§14 |
| WO-15-13 故事線（介面） | 等 08、11（第二版） |
| WO-15-14 票面價格與出國 | 等 08 |
| Gemini 的分支 | `gemini/wo-15-08-review-hud`（741af26）和 `gemini/wo-15-11-story-logic`（c0f6668，按第一版做，要補上第二版）已經推送，等製作人說「已完成」再審核 |
| WO-15-12 美術整合 | 工單未寫；51 張圖在 `main` 分支的根目錄（`docs/art-prompts/` 是 prompt 和參考圖）；「沒有外部素材」的規定已經刪除（2026-11-01），圖片可以加入 |
| 第十六至二十期 | `docs/workorders/BACKLOG.md` 只有清單；寫成正式工單之前，先對照 `docs/WORLD.md` 和 `docs/PILLARS.md` 修訂 |

`main.js` 裏的暫時版本：`roundsReview()`（直接完成篩選日）和 `roundsGo()` 的 `'ended'` 分支（直接 `finishRun`），都由 WO-15-08 取代。

**製作人的決定（2026-11-01）**：目標曲線不按輪設計（維持每晚 ×1.42）；WO-15-11 故事線立即做，每個角色都要有專屬的故事線和很多人生選項；刪除「沒有外部素材」的規定（仍然不加 JavaScript 函式庫、框架和建置工具）。

**製作人的決定（2026-11-02）**：浮城的幣值要由 2026 年推演到 2080 年；每座浮城的經濟不同、有難易之分，第一座比較輕鬆；故事線的報酬和掙扎跟城市有關；每章的選項要四至五個。已經寫成 `docs/ECONOMY.md` 和 `D.CITIES`（第 7 區，倍數全部是 1）。**待製作人決定**：金額顯示維持現在的數字（甲）還是 2080 年的票面價格 ×20（乙，你建議乙，要另寫一張介面工單）；第 7 區要不要更輕鬆（你建議維持，模擬結果見 `docs/ECONOMY.md` 第四節）。

**製作人的決定（2026-11-02，第二次）**：金額顯示用乙（2080 年的票面價格 × 20，`currency.rate = 20`，WO-15-14 實作；金額只在介面最後一步換算一次）；第 7 區維持，甚至稍為加難（WO-15-11 合併之後由你校準，目標見 `docs/ECONOMY.md` 第四節）；出國要更貴（`tripCost` 240、帶回 ★4、火花 +0.6）；要有美術工單（WO-15-12）和新的生圖 prompt；然後寫第二批九個 SR 級角色。

**故事線的內容（你負責，分批寫）**：第一批（第二版）已經在 `data-story.js`：六個 R 級角色（文案、救生員、程式員、外賣潛水員、教師、護士），每個角色五至六章、每章四至五個選項（生存、兼顧、巔峰、為別人；每個角色兩個極端的選項，之後自動反轉），`if`／`unless` 分支和結語（包括前後呼應的組合結語）；金額寫 `{cr}`，尺度跟這一輪的租金；八位朋友的收藏文字；十個種族；阿星的對應；30 則今日快訊（包括 6 則經濟新聞）。下一批：九個 SR 級角色；再下一批：五個 UR 級角色（外星和 AI，角度要不同：他們是被收藏的一方，還是收藏家的同類）。之後可以把每輪一章擴展到每天一章（`day` 2、3）。每批都要通過 `story-data.test.js`，並且用 `docs/WORLD.md` 的語氣：冷面、不說教、只笑 2080 年的世界。

## 6. 審核 WO-15-08 時要特別留意

- §5 的兩項：桌面 1280×800 不捲動就看到三張生活卡的卡名；每輪第一、二晚的 `.rd-boss-ahead` 預告。
- §6 篩選日的重新載入：`s.reviewRep` 跟着存檔，`ackReview` 之後清除；煙霧測試在 `.rd-review` 重新載入。
- 五輪模式的畫面不可以有身體、偏執、能力值。
- 創作桌在五輪模式每一筆之後存檔（`IE.Game.save`，WO-15-07 審核加入）：測試裏改狀態的步驟要注意，存檔之後重新載入不會回到這一晚的開頭。
- 煙霧測試要逐項對照工單：WO-15-07 漏了兩步（見第 7 節）。

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
| `docs/art-prompts/` | 美術盤點與 ChatGPT 生圖 prompt；製作人生成的 51 張圖在 `main` 分支的根目錄 |
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
