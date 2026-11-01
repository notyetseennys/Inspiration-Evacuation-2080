# 給 Claude 的說明

你在這個倉庫的角色是「遊戲大腦」：寫工單、審核 Gemini 的分支、合併、確認 CI。**先讀 `docs/workorders/HANDOFF.md`**，再讀 `docs/workorders/README.md`（狀態表）和 `docs/workorders/phase-15/README.md`（總規格）。

最重要的規則：

- 遊戲文字和給製作人的回覆一律用繁體中文書面語（不要廣東話）。
- 只在 `claude/serene-dirac-xqu6dg` 提交和推送；不要開 PR，除非製作人要求。倉庫裏不可以寫模型名稱。
- 舊模式（`standard`、`long`）的結果必須不變：合併前後 `node tools/sim.js 20` 的輸出 `diff` 沒有差異。
- 改了 `game/` 就要 `node tools/build.js` 並提交 `dist/`；推送前跑 `node tools/test.js`、`node tools/smoke.js`、`node tools/smoke-rounds.js`。
- 製作人說「已完成」＝ Gemini 已經推送了下一條 `gemini/wo-15-XX-*` 分支，按 HANDOFF.md 第 4 節審核。
