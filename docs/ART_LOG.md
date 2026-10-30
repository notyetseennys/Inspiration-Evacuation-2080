# 《靈感撤離 2080》美術、動畫與音效更新紀錄（ART_LOG）

本文件按任務次序記錄每次改動內容、桌面版（寬 1000px）與手機版（寬 390px）的前後對比截圖檔名，以及已知問題。

---

## 任務 1：121 件靈感物件的獨立圖示（P0）

### 改動摘要
1. **`game/js/icons.js`**：
   - 擴充 `IE.Icons.url(shape, pal)` 支援 `16×16` 像素字串（自動偵測列數／字元長度大於 12 時使用 `16×16` 畫布，同時保留原有商店貨品與家具的 `12×12` 畫布）。
   - 修改 `IE.Icons.obj(id, size)`，優先查找 `SHAPES[id]` 的專屬圖示，並在 `<img class="px-icon">` 加上稀有度類別 `r-<rarity>` 及流派類別 `sc-<school>`。
   - 為 `IE.DATA.OBJECTS` 全部 **121 件靈感物件**繪製各自獨立、兩兩不重複的 `16×16` 像素圖示，並按 10 個流派與獨立媒材物件建立統一造型語言：
     - **水淹流（10 件）**：底部雙層波浪水紋與飛濺水滴（`boatlamp`、`whistle`、`raincoat`、`snowglobe`、`tidegauge`、`sandbag`、`inksac`、`aquarium`、`divehelm`、`ark`）。
     - **霓虹流（11 件）**：四角閃爍十字星芒與雙色高光燈管（`subwoofer`、`slogans`、`ringlight`、`anonacct`、`carnivalmask`、`billboard`、`glowstick`、`adcontract`、`hologram`、`vipcard`、`voidtower`）。
     - **陳腔濫調流（9 件）**：重複疊影、菲林齒孔與無限迴圈符號（`frame24`、`lastpainter`、`rubbing`、`rubberstamp`、`catchphrase`、`templatebook`、`sequel`、`remaster`、`loop`）。
     - **愧疚流（8 件）**：沉重石質、鎖鏈、十字架與枷鎖意象（`confkey`、`stolen`、`rosary`、`hairshirt`、`indulgence`、`sinlog`、`accomplice`、`scales`）。
     - **機械流（11 件）**：電路針腳、晶片外框、散熱孔與終端螢幕（`robocat`、`autoedit`、`solder`、`kpiclock`、`instant`、`overclock`、`selfpatch`、`antivirus`、`recursion`、`gpu`、`mainframe`）。
     - **飢餓流（10 件）**：空碗器皿、裂紋、微弱蒸氣與殘餘碎片（`thermobag`、`emptybowl`、`pills`、`nightlamp`、`coupon`、`ramen`、`sporedish`、`pawnticket`、`palette`、`lastcoin`）。
     - **反叛流（10 件）**：鋸齒裂痕、塗鴉噴濺與對角線破壞感（`spraycan`、`angrydiary`、`shredder`、`neonshard`、`deserterbadge`、`paradox`、`boltcutter`、`blackflag`、`underground`、`statue`）。
     - **人情流（14 件）**：手作織物、樂器音符、熱湯蒸氣與心形信物（`oldpoems`、`costume`、`lyricbook`、`sweetbowl`、`guitar`、`aliencard`、`dreamcatcher`、`penguin`、`groupchat`、`potluck`、`scarf`、`mixtape`、`photobooth`、`promise`）。
     - **遠方流（14 件）**：羅盤星芒、郵戳、地圖折線與異域文物（`oldmap`、`collectorbox`、`passport`、`postcards`、`aliencompass`、`manekineko`、`scarab`、`moondust`、`fieldnotes`、`telescope`、`appraisal`、`phrasebook`、`jetlag`、`worldpuzzle`）。
     - **極簡流（9 件）**：乾淨幾何線條、大量留白與禪意造型（`redpen`、`weight21`、`minimoai`、`woodfish`、`whitespace`、`eraser`、`zen`、`capsule`、`monolith`）。
     - **媒材與獨立傳說物件（15 件）**：各自鮮明的專屬器物造型（`alienradio`、`typewriter`、`espresso`、`mirror`、`blackbox`、`greybadge`、`goldframe`、`fountainpen`、`earphones`、`projector`、`tattoo`、`usb`、`prism`、`curator`、`gesamt`）。
2. **`game/css/art.css`**：
   - 為傳說物件（`.px-icon.r-legend`、`.ct-obj.r-legend`、`.obj-row.r-legend`、`.obj-card.r-legend`、`.store-item.r-legend`）加上金色外框與緩慢流光閃爍動畫（`ie-legend-icon-glow`、`ie-legend-box-shimmer`），並在 `@media (prefers-reduced-motion: reduce)` 時停用動畫。

### 前後對比截圖
- 修改前（桌面 1000px）：`docs/shots/t1-before-desktop.png`
- 修改前（手機 390px）：`docs/shots/t1-before-mobile.png`
- 修改後（桌面 1000px）：`docs/shots/t1-after-desktop.png`
- 修改後（手機 390px）：`docs/shots/t1-after-mobile.png`

### 已知問題
- 無。

---

## 任務 2：素材卡按媒材有不同卡面（P0）

### 改動摘要
1. **`game/js/craft.js` 與 `game/js/ui.js`**：
   - 在 `craft.js` 的 `cardEl` 與 `ui.js` 的 `cardHtml` 為卡片加上 `med-paper`、`med-sound`、`med-image`、`med-body`、`med-data` 媒材類別，以及異地素材 `foreign` 類別。
   - 在卡片頂部色條（`.cc-stripes i`）與標籤（`.cc-tags .t`、`.tag`）加上 `tag-<id>` 類別，供 CSS 套用色盲友善花紋。
2. **`game/css/art.css`**：
   - **五種媒材底紋**（同時支援創作桌淺色卡 `.cc` 與面板素材庫深色卡 `.card`，並確保停電規則 `.cc.dark` 不洩漏底紋）：
     - `paper`（紙）：橫線信紙與左側紅色邊界線。
     - `sound`（聲）：內嵌 SVG 聲波折線與黑膠音軌同心弧線。
     - `image`（影）：左右兩側菲林齒孔邊框與相框內邊線。
     - `body`（身）：交織布紋與右下角指紋漩渦水印。
     - `data`（數）：座標方格線與 CRT 水平掃描線。
   - **特殊素材效果**：
     - 極稀有卡（`.r-legend`）：彩色全息箔光流動效果，並修正淺色卡面上極稀有卡名的深金對比度。
     - 異地素材（`.foreign`）：右下角復古圓形郵戳與波浪銷票線。
     - 愧疚素材（`.guilt`）：深色壓抑內陰影與暗角效果。
   - **色盲友善標籤花紋**：為 10 種標籤（水、霓虹、飢餓、記憶、機械、人情、希望、憤怒、反叛、愧疚）各自設計不同的幾何底紋（波浪、雙斜線、鋸齒、圓點、方格網、十字編織、菱形、裂紋、警示斜紋、垂直柵紋）。
   - 修正卡片改造標籤（`.cc-mod`）與右上角媒材標記（`.cc-med`）重疊的位置問題。

### 前後對比截圖
- 修改前（桌面 1000px）：`docs/shots/t2-before-desktop.png`
- 修改前（手機 390px）：`docs/shots/t2-before-mobile.png`
- 修改後（桌面 1000px）：`docs/shots/t2-after-desktop.png`
- 修改後（手機 390px）：`docs/shots/t2-after-mobile.png`

### 已知問題
- 無。
