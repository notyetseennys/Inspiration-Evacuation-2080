## 工單

WO-XX-XX：（標題）
工單檔案：`docs/workorders/phase-XX/WO-XX-XX.md`

## 做了甚麼

-

## 改了哪些檔案

（貼上 `git diff --stat claude/serene-dirac-xqu6dg...HEAD` 的輸出，並對照工單表頭的「可以改的檔案」）

```
```

## 驗收條件

（照抄工單的驗收清單，逐項打勾，每項附上證據：指令輸出或截圖）

- [ ]

## 測試結果

（貼上每個指令最後 15 行的輸出）

```
node tools/test.js
node tools/smoke.js
node tools/smoke-rounds.js（存在時）
舊模式的模擬比較（改動邏輯檔案時）
node tools/sim-rounds.js 200（工單要求時）
```

## 截圖（有介面改動時）

桌面 1280×800、手機 390×844：

## 偏離工單的地方

（沒有就寫「沒有」；有的話逐項說明原因）

## 需要 Claude 決定的問題

（規格不清楚或互相矛盾的地方，以及你選了哪一種做法）

## 發現的其他問題

（不在工單範圍、沒有修改的問題）

## 自我檢查

- [ ] 只改了工單列明的檔案，沒有順手的重構或格式化
- [ ] 遊戲文字用繁體中文書面語，取自資料檔
- [ ] 邏輯檔案沒有 `Math.random`、DOM、`localStorage`
- [ ] 新欄位有預設值，舊存檔可以載入
- [ ] 已合併整合分支的最新內容
- [ ] `node tools/build.js` 已更新 `dist/`
