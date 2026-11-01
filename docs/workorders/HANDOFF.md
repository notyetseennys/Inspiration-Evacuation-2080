# 交接文件：遊戲大腦（Claude）的工作

> 給接手的 Claude。最後更新：WO-15-06 合併之後（整合分支 commit `12cb369` 之後的交接 commit）。
> 讀完這份、`docs/workorders/README.md` 和 `docs/workorders/phase-15/README.md`，就可以接手。

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

## 5. 現在的狀態（WO-15-06 合併之後）

| 工單 | 狀態 |
|---|---|
| WO-15-01 至 06 | 已合併（審核記錄在 `docs/workorders/reviews/`） |
| WO-15-07 收工演出、結束面板與市集介面 | **可以開始**（指令已經給了製作人） |
| WO-15-09 模擬器與數值校準 | **可以開始**（可以和 07、08 同時做；指令已經給了製作人） |
| WO-15-08 篩選日介面、狀態列、隱藏舊系統 | 等 07 |
| WO-15-10 成為預設、文件、發佈 | 等 08、09 |
| 第十六至二十期 | `docs/workorders/BACKLOG.md` 只有清單；第十五期全部合併之後，按 REFORM_PLAN 和第十五期的實際數據寫成正式工單 |

`main.js` 裏的暫時版本：`roundsShop()`（直接離開市集，WO-15-07 取代）、`roundsReview()`（直接完成篩選日，WO-15-08 取代）、`roundsGo()` 的 `'ended'` 分支（直接 `finishRun`，WO-15-08 取代）。

## 6. 審核 WO-15-07、08、09 時要特別留意

- **WO-15-07**：收工只可以用 `IE.Rounds.cleared(s)` 判斷；開包外框 `.rd-pack`，出國是 `.rd-trip`（不要混用）；「離開」按鈕第一筆之前隱藏；市集每次購買後重畫；舊模式的創作桌、遺物攤不變。煙霧測試要固定種子。
- **WO-15-08**：§5 是審核後加的兩項：桌面 1280×800 不捲動就看到三張生活卡的卡名；每輪第一、二晚的 `.rd-boss-ahead` 預告（`ROUND_TEXT.bossAhead`，`IE.Stages.bossesFor(s, 本輪 − 1)`）。五輪模式的畫面不可以有身體、偏執、能力值。
- **WO-15-09**：模擬器白天的流程必須和 `main.js` 的 `roundsDay`／`afterSlot` 相同（`R.morning`、道德抉擇、奇遇；小遊戲 `IE.Auto.apply` 之後 `IE.Rounds.afterDay`）。用不同的 seed 範圍重跑確認穩定；同一指令跑兩次輸出相同。
  - **已知的數值問題**：目標成長 `growth: 1.45` 比引擎成長快得多（第 9 晚目標 78,200，每筆約 10,000），起點數據在 WO-15-09 的「起點數據」。估計 `growth` 要降到約 1.25 至 1.35。如果只調數值做不到「滾雪球 30 倍」，由你決定規則改動（可能提前做部分第十六期的成長型物件）。

## 7. 歷來 Gemini 常見的偏差（審核時優先檢查）

- 自行發明規格沒有的數值或規則（WO-15-01：自創 `ECON`、`sparkFloor 0.6`、利息）→ 所以有規格測試。
- 介面自己拼報告或重算邏輯，數字和實際不符（WO-15-06：出國火花寫死 +0.4）。
- 介面為了顯示而動到隨機數（WO-15-06）。
- 沒有考慮「選到一半重新載入」（WO-15-06 出國）。每個多步驟的流程都要問：重新載入之後會怎樣？
- Windows 換行（CRLF）：已有 `.gitattributes` 和打包時的正規化。

## 8. 檔案地圖

| 檔案 | 內容 |
|---|---|
| `docs/REFORM_PLAN.md` | 改革藍圖（第十五至二十期的設計依據） |
| `docs/workorders/README.md` | 流程、狀態表、交給 Gemini 的指令範本 |
| `docs/workorders/CONVENTIONS.md`、`REVIEW.md` | Gemini 的工作守則、你的審核標準 |
| `docs/workorders/phase-15/README.md` | 第十五期總規格（規則、數值、狀態欄位、文字、class 名稱的唯一來源） |
| `docs/workorders/phase-15/WO-15-01..10.md` | 工單 |
| `docs/workorders/reviews/` | 每一輪的審核記錄 |
| `docs/workorders/BACKLOG.md` | 第十六至二十期的工單清單 |
| `game/js/data-rounds.js` | `ECON`、`ROUND_TEXT`、`DAYCARDS`、`PACKS`、`SERVICES` |
| `game/js/rounds.js` | `IE.Rounds`：時間表、白天、夜晚、市集、篩選日、推進 |
| `game/js/main.js` | 流程；五輪模式在「第十五期：五輪模式」一段（`roundsGo`、`roundsDay`、`roundsChoose`、`roundsTrip`、`roundsNight`……） |
| `game/js/ui.js` | `dayPanel`、`roundMicroModal`、`roundTripModal` 等 |
| `tools/test.js`、`tools/tests/` | 單元測試（`t.run(opts)` 預設 copywriter、storm、seed 1、不是第一局） |
| `tools/sim.js` | 舊模式的模擬器（回歸用） |
| `tools/smoke.js`、`tools/smoke-rounds.js` | 煙霧測試（以 `localStorage` 的 `ie2080.seed` 固定種子，`ie2080.noEncounter` 關掉奇遇） |
| `tools/review-play.js` | 你的試玩腳本 |
| `.github/workflows/ci.yml` | CI |
