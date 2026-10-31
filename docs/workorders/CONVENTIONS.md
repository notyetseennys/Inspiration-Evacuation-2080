# 工作守則（每張工單都要遵守）

> 違反守則的 PR 會被要求修改。工單和守則衝突時，以工單為準，並在 PR 說明。

## 1. 分支與提交

- 整合分支：`claude/serene-dirac-xqu6dg`（不是 `main`）。每張工單從它的最新 commit 開分支，名稱照工單表頭，例如 `gemini/wo-15-01-rounds-core`。
- 一張工單一個 PR，目標分支是 `claude/serene-dirac-xqu6dg`。
- 提交訊息以工單編號開頭，例如 `WO-15-01：加入五輪模式的資料`。可以有多個 commit。
- 不要 force push、不要改寫已推送的歷史、不要直接推送到 `claude/` 或 `main` 分支。
- 開 PR 之前，把整合分支的最新內容合併進你的分支（`git merge`，不要 rebase），並解決衝突。
- **只改工單列明的檔案**。順手的重構、改名、格式化，一律不做。

## 2. 程式

- 純 JavaScript（ES2019），不加任何函式庫、框架、建置工具或外部素材。
- 兩格縮排、單引號、句尾分號、每個檔案 `'use strict'`。
- **純邏輯檔案**（`data*.js`、`rules.js`、`create.js`、`stages.js`、`rounds.js`、`world.js`、`jobs2.js`、`auto.js`、`meta.js`、`dossier.js`）：
  - 瀏覽器和 Node（模擬器、單元測試）共用，用 UMD 寫法：
    ```js
    (function (factory) {
      const root = typeof window !== 'undefined' ? window : globalThis;
      root.IE = root.IE || {};
      factory(root.IE);
    })(function (IE) {
      'use strict';
      // ……
      IE.Rounds = { /* 匯出 */ };
    });
    ```
  - 不可以用 `document`、`window`、`localStorage`、`setTimeout`。
  - **隨機數只用 `R.rand(s)`、`R.pick(s, arr)`**，不可以用 `Math.random()`（否則模擬器的結果不能重現）。
  - 數值一律放在資料檔（例如 `D.ECON`），不要寫死在函數裡。
- **介面檔案**（`ui.js`、`ui-roster.js`、`craft.js`、`main.js`、`micro*.js` 等）：不計算遊戲規則，只呼叫邏輯層的函數並顯示結果。
- 註解用繁體中文書面語，說明「為甚麼」，不重複程式在做甚麼。
- 不留下 `console.log`、除錯用的程式和註解掉的舊程式。
- 存檔相容：新欄位要有預設值（舊存檔載入時可能沒有）；不改現有欄位的名稱和意義。

## 3. 舊模式不變（第十五期）

第十五期以新模式 `rounds` 實作。**舊的 `standard`、`long` 模式的行為一點都不能變**。每張改動邏輯檔案的工單都要附上這個檢查：

```bash
git stash -u && node tools/sim.js 20 > /tmp/sim-before.txt && git stash pop
node tools/sim.js 20 > /tmp/sim-after.txt
diff /tmp/sim-before.txt /tmp/sim-after.txt && echo "舊模式沒有改變"
```

（也可以用 `git worktree` 在整合分支跑「改動前」的一份。）

## 4. 文字

- 遊戲內所有文字用**繁體中文書面語**，不用粵語口語（不用「唔、嘅、咗、係、喺、嘢、啲、冇、佢、睇、俾」等）。
- 語氣延續現有的諷刺風格：冷靜、具體、不說教。
- 新的介面文字放在資料檔（第十五期是 `D.ROUND_TEXT`），介面從那裡取字。
- 提到人時不假設性別（用名字或「對方」）。

## 5. 介面

- **做減法**：不加回已經收起的資訊（能力值、公式、長說明）；新資訊先問「玩家在這一刻需要嗎？」。
- 手機寬 360 至 390px 不可以出現橫向捲動；觸控目標至少 44px 高。
- 系統設定減少動態效果時（`IE.Pixel.reducedMotion`），閃光、震動、全畫面演出要改為靜態或極短版本。
- 總規格和煙霧測試用到的 class 名稱、`data-do`、`data-slot` 等屬性**不可以改名**。
- 新樣式加在 `game/css/polish.css` 檔尾，前面寫一行註解標明期數和工單（例如 `/* 第十五期 WO-15-06：白天面板 */`）。
- 字型只用已載入的 Noto Sans HK、Silkscreen、VT323；圖像用 CSS、內嵌 SVG、像素字串或 canvas。

## 6. 測試

| 指令 | 甚麼時候 |
|---|---|
| `node tools/test.js` | 每次提交前；每張工單都要加自己的 `tools/tests/*.test.js` |
| `node tools/smoke.js` | 每次提交前（舊模式的瀏覽器煙霧測試，需要 Playwright） |
| `node tools/smoke-rounds.js` | WO-15-06 之後每次提交前 |
| `node tools/sim.js 20` 前後比較 | 改動邏輯檔案的工單（見第 3 節） |
| `node tools/sim-rounds.js 200` | WO-15-09 之後改動規則或數值時 |
| `node tools/build.js` | 每個 PR 最後一次提交前（更新 `dist/`） |

- 測試的寫法照 `tools/tests/wheel.test.js`：`module.exports = (t) => { t.test('名稱', () => { t.assert.equal(…) }); };`。
- 測試名稱用工單規定的名稱。測試裡的數值盡量從 `D.ECON` 等資料取，不寫死（除非工單要求）。
- **不可以為了令測試通過而修改測試或刪除舊測試**（工單要求的除外）。
- 有介面改動的工單：附上桌面 1280×800 和手機 390×844 的截圖，存在 `docs/shots/`，檔名以工單編號開頭。

## 7. 遇到問題

- 規格不清楚或互相矛盾：選一個最符合總規格的做法，在 PR 的「需要 Claude 決定的問題」寫明，**不要自行發明新規則或新數值**。
- 發現現有程式的錯誤，但不在工單範圍：在 PR 的「發現的其他問題」記下，不要順手修改。
- 做不到某項驗收條件：照實寫出原因、試過的方法和最接近的結果。
