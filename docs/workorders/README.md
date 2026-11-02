# 工單系統（第十五期起）

《靈感撤離 2080》由三方合作：

| 角色 | 負責 |
|---|---|
| **你（製作人）** | 決定方向；把工單交給 Gemini；試玩；批准合併 |
| **Claude（遊戲大腦）** | 設計規則和數值；寫工單；審核每一個 PR（讀程式、跑測試和模擬器、截圖、試玩）；按結果修訂工單 |
| **Gemini（實作）** | 按工單實作，一張工單一個 PR |

設計的依據是 `docs/REFORM_PLAN.md`（上癮改革藍圖）。

---

## 檔案

| 檔案 | 內容 |
|---|---|
| `docs/workorders/README.md` | 這份：流程、狀態表、交給 Gemini 的指令範本 |
| `docs/workorders/HANDOFF.md` | 給接手的 Claude 的交接文件（角色、規則、審核步驟、現在的狀態） |
| `docs/workorders/CONVENTIONS.md` | **工作守則**：分支、程式風格、文字、介面、測試、禁止事項（每張工單都要遵守） |
| `docs/workorders/REVIEW.md` | Claude 的審核標準（Gemini 交 PR 之前可以自己先檢查一次） |
| `docs/workorders/phase-15/README.md` | 第十五期總規格：規則、數值、狀態欄位、介面文字的唯一來源 |
| `docs/workorders/phase-15/WO-15-XX.md` | 第十五期的工單 |
| `docs/workorders/BACKLOG.md` | 第十六至二十期的工單清單（第十五期完成後才寫成正式工單） |
| `.github/pull_request_template.md` | PR 範本（開 PR 時自動出現） |
| `.github/ISSUE_TEMPLATE/work-order.md` | 如果想在 GitHub Issues 追蹤工單，用這個範本開 Issue |
| `.github/workflows/ci.yml` | 每個 PR 自動跑單元測試、模擬器、打包和瀏覽器煙霧測試 |
| `tools/test.js`、`tools/tests/*.test.js` | 邏輯單元測試（Node，不需要瀏覽器）；`spec.test.js` 是規格測試，由 Claude 維護 |
| `docs/workorders/reviews/` | Claude 每一輪的審核意見（`WO-XX-XX-r1.md`、`r2.md`……） |

---

## 流程

1. **開分支**：從整合分支 `claude/serene-dirac-xqu6dg` 的最新 commit 開 `gemini/wo-15-01-rounds-core`（名稱寫在每張工單的表頭）。
2. **實作**：只改工單列明的檔案；規則、數值、文字以總規格為準。
3. **自我檢查**：跑工單「驗收條件」的全部指令；對照 `REVIEW.md` 檢查一次。
4. **交付**：推送分支，然後告訴製作人「已完成」（製作人轉告 Claude）。也可以開 PR 到 `claude/serene-dirac-xqu6dg`，標題 `WO-15-01：五輪模式的骨架`，填好 PR 範本。兩種都可以；沒有 PR 時，把 PR 範本的內容寫在最後一個 commit 的訊息裡。
5. **審核**：Claude 在 PR 留言，結論是以下其中一種：
   - **通過**：可以合併。
   - **小修改**：逐項列出；Gemini 在同一條分支修改後再推送。
   - **要重做**：說明原因；必要時 Claude 先修訂工單。
6. **合併**：Claude 審核通過後直接把分支合併到整合分支（保留 Gemini 的提交紀錄），並在整合分支重跑全部測試。
7. **下一張**：工單之間有依賴（見狀態表），一次只做一張。建議次序：WO-15-08 → 14 → 12 → 13，最後 10。

---

## 第十五期狀態表

| 工單 | 標題 | 依賴 | 狀態 |
|---|---|---|---|
| [WO-15-01](phase-15/WO-15-01.md) | 五輪模式的骨架（資料、狀態、時間表） | — | 已合併（[第一輪](reviews/WO-15-01-r1.md)、[第二輪](reviews/WO-15-01-r2.md)） |
| [WO-15-02](phase-15/WO-15-02.md) | 生活卡的規則（白天） | 01 | 已合併（[審核](reviews/WO-15-02-r1.md)） |
| [WO-15-03](phase-15/WO-15-03.md) | 夜晚的規則（目標、收工、獎金、失敗） | 01 | 已合併（[審核](reviews/WO-15-03-r1.md)） |
| [WO-15-04](phase-15/WO-15-04.md) | 市集的規則 | 01、03 | 已合併（[審核](reviews/WO-15-04-r1.md)） |
| [WO-15-05](phase-15/WO-15-05.md) | 篩選日與日子推進 | 03、04 | 已合併（[審核](reviews/WO-15-05-r1.md)） |
| [WO-15-06](phase-15/WO-15-06.md) | 白天的介面與五輪模式的流程 | 05 | 已合併（[審核](reviews/WO-15-06-r1.md)，附小修正） |
| [WO-15-07](phase-15/WO-15-07.md) | 收工演出、結束面板與市集介面 | 06 | 已合併（[審核](reviews/WO-15-07-r1.md)，附小修正） |
| [WO-15-08](phase-15/WO-15-08.md) | 篩選日介面、狀態列與隱藏舊系統 | 07 | **可以開始** |
| [WO-15-09](phase-15/WO-15-09.md) | 五輪模式的模擬器與數值校準 | 05 | 已合併（[審核](reviews/WO-15-09-r1.md)，附註） |
| [WO-15-10](phase-15/WO-15-10.md) | 五輪模式成為預設、文件與發佈 | 08、09、11、12、13、14 | 待開始 |
| [WO-15-11](phase-15/WO-15-11.md) | 故事線（邏輯）：角色線、朋友被收藏、阿星、今日快訊、城市的金額 | 09 | 已合併（[審核](reviews/WO-15-11-r1.md)，附修正和租金校準） |
| [WO-15-12](phase-15/WO-15-12.md) | 美術整合：48 張插圖放進五輪模式（`game/img/`、`IE.img`、打包內嵌） | 08、14 | 待開始 |
| [WO-15-13](phase-15/WO-15-13.md) | 故事線（介面） | 08、11 | 待開始（第二版） |
| [WO-15-14](phase-15/WO-15-14.md) | 2080 年的票面價格（金額 × 20）與昂貴的出國 | 08 | 待開始（08 合併之後） |

狀態：待開始 → 進行中 → 審核中 → 要修改 → 已合併。由 Claude 在每次審核後更新。

故事線（總規格 §14）由製作人在 2026-11-01 要求立即做，2026-11-02 改為每章四至五個選項、金額跟城市有關（第二版）：內容 `game/js/data-story.js` 由 Claude 撰寫（第一批：六個 R 級角色、八位朋友；第二批：九個 SR 級角色），邏輯和介面分別是 WO-15-11、13。浮城經濟見 `docs/ECONOMY.md`。**WO-15-12 美術整合**已經寫好：製作人生成的 51 張圖中，48 張已經由 Claude 縮成遊戲的像素，放在 `game/img/`；第六批（外星種族、故事線、阿星、紙幣、重畫出國卡）的 prompt 在 `docs/art-prompts/README.md` 第十一節。

---

## 交給 Gemini 的指令範本

每次交一張工單時，可以直接貼上以下文字（把 `WO-15-01` 換成要做的工單）：

> 你負責實作《靈感撤離 2080》的工單 **WO-15-01**。倉庫：`notyetseennys/Inspiration-Evacuation-2080`。
>
> 開始之前，依次讀完：
> 1. `docs/workorders/CONVENTIONS.md`（工作守則，必須遵守）
> 2. `docs/workorders/phase-15/README.md`（第十五期總規格：規則、數值、文字以這份為準）
> 3. `docs/workorders/phase-15/WO-15-01.md`（這次的工單）
> 4. `docs/workorders/REVIEW.md`（審核標準）
>
> 從分支 `claude/serene-dirac-xqu6dg` 開新分支（名稱見工單表頭），只改工單列明的檔案。完成後跑完工單「驗收條件」的全部指令，開 PR 到 `claude/serene-dirac-xqu6dg`，按 PR 範本填寫，貼上測試輸出和截圖。
>
> 規格有不清楚或互相矛盾的地方：不要自行發明規則。選一個最符合總規格的做法，並在 PR 的「需要 Claude 決定的問題」寫明。
