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

---

## 任務 3：外星評審肖像與登場演出（P0）

### 改動摘要
1. **新增 `game/js/art-judges.js`（並於 `game/index.html` 載入）**：
   - 為 `IE.Stages.BOSSES` 全部 **19 條外星評審規則**各自建立專屬外星評審資料，包含 **32×32 像素肖像**、五色調色盤、評審姓名、職銜，以及三句繁體中文書面語台詞（登場、入選、落選）：
     1. `noneon`（深空觀測員・黯瞳）
     2. `waterhall`（潮汐策展官・渦流）
     3. `nomemory`（時間修剪員・零紀）
     4. `oneshot`（獨眼裁決官・剎那）
     5. `censor`（星際合規官・紅章）
     6. `copied`（鏡像演算法・雙生）
     7. `sponsor`（雲端贊助商・金顎）
     8. `blackout`（暗物質獵人・蝕影）
     9. `kpionly`（績效稽核長・刻度）
     10. `nodiscard`（雕刻監察官・碑石）
     11. `small`（微縮收藏家・針尖）
     12. `numb`（倦怠審美官・灰燼）
     13. `tired`（古文明考古官・風化）
     14. `noobj`（白盒苦行僧・素白）
     15. `finale`（終幕指揮家・尾聲）
     16. `thinhand`（配給精算師・緊縮）
     17. `silent`（真空聆聽者・無聲）
     18. `analog`（類比原教旨官・磁帶）
     19. `monomedia`（純度檢驗官・單晶）
   - 為「社區小展」（`社區會堂・舊城三樓防洪層`）與「畫廊聯展」（`白盒畫廊・浮城中層藝術區`）建立 32×32 像素場地徽章與開場／入選／落選敘述。
2. **`game/js/craft.js`、`game/js/audio.js` 與 `game/css/art.css`**：
   - 關卡之夜開啟創作桌時，先播放約 2 秒的登場演出（`.ct-stage-intro`）：肖像滑入、規則蓋章、播放外星評審低沉不協和音效（`IE.Audio.sfx('judge')`），點擊畫面任意處可立即跳過；外星評級 4 以上同時有兩條規則時，支援兩位評審同台演出。
   - 在創作桌關卡橫列（`.ct-stagebar`）常駐顯示評審肖像、姓名、規則印章與登場台詞（或小展／聯展場地資訊）。
   - 在關卡結算區塊（`stageResultHtml`）顯示評審肖像與入選／落選專屬評語。

### 前後對比截圖
- 修改前（桌面 1000px）：`docs/shots/t3-before-desktop.png`
- 修改前（手機 390px）：`docs/shots/t3-before-mobile.png`
- 修改後（桌面 1000px）：`docs/shots/t3-after-desktop.png`
- 修改後（手機 390px）：`docs/shots/t3-after-mobile.png`

### 已知問題
- 無。

---

## 任務 4：計分演出升級（P0）

### 改動摘要
1. **`game/js/craft.js` 與 `game/css/art.css`**：
   - **三級高分演出（破萬、破十萬、破百萬）**：
     - 單筆 ≥ 10,000（`tier-1`）：顯示「◆ 破萬・靈感湧現 ◆」徽章、青藍霓虹巨字、16 級震動與 150 顆粒子爆發。
     - 單筆 ≥ 100,000（`tier-2`）：顯示「✦ 破十萬・訊號狂潮 ✦」徽章、洋紅紫光巨字、22 級震動、畫面紫紅閃光與 220 顆粒子爆發。
     - 單筆 ≥ 1,000,000（`tier-3`）：顯示「★ 破百萬・超新星爆發 ★」徽章、96px 耀金多層光暈巨字、舞台（`.ct-stage.million-closeup`）放大特寫與金色邊框、28 級震動、320 顆粒子與多波煙花特效。
     - 手機窄屏（`≤ 640px`）自動以 `clamp(34px, 12.5vw, 58px)` 縮放巨字，確保八位數以上得分不超出畫面。
   - **打破最高單筆紀錄（`record`）**：觸發 5 波彩色煙花粒子（`fireworks(5)`）、「新紀錄！」金框標記與高光閃爍。
   - **重複觸發演出（`x.again: true`）**：素材卡因「波痕」改造、「迴聲室」或「無限迴圈」重複觸發時，卡片放大跳動並在卡片正上方彈出「再一次！」動態徽章（`.ct-again-pop`）。
   - **流派觸發光帶（`x.t === 'school'`）**：流派計分時，流派列（`.ct-schools.sweeping`）掃過對應流派色彩的斜向光帶，並為觸發的流派標籤（`.sch.sch-hit`）加上高光與粒子噴發。
   - **留在手牌觸發（`x.held: true`）**：手牌中未出牌但觸發加成的卡片（如「舊潛水頭盔」、「最後的硬幣」）在手牌區原地發光跳起（`.cc.held-glow`）、噴發金光粒子並浮出倍率數字。
   - **傳說組合全屏字卡（`x.legend: true`）**：達成傳說組合時，先全屏閃出金色傳說組合字卡（`.ct-legend-card`），顯示組合名稱、描述與籌碼／倍率加成，點擊任意處可立即跳過。
   - `prefers-reduced-motion: reduce` 時自動停用煙花、鏡頭震動、特寫放大與流光掃描。

### 前後對比截圖
- 修改前（桌面 1000px）：`docs/shots/t4-before-desktop.png`
- 修改前（手機 390px）：`docs/shots/t4-before-mobile.png`
- 修改後（桌面 1000px）：`docs/shots/t4-after-desktop.png`
- 修改後（手機 390px）：`docs/shots/t4-after-mobile.png`

### 已知問題
- 無。

---

## 任務 5：聲音擴充（P0）

### 改動摘要
1. **`game/js/audio.js`（純 Web Audio 即時合成）**：
   - **十個流派觸發音色（`IE.Audio.school(id)`）**：
     - `flood`（水淹流）：三段連續上浮氣泡與高通濾波水流聲。
     - `neon`（霓虹流）：120Hz 鋸齒波電流嗡鳴與高頻方波閃爍。
     - `cliche`（陳腔濫調流）：黑膠高頻雜音與三段衰減走音磁帶回聲。
     - `guilt`（愧疚流）：110Hz 低音鐘鳴與金屬泛音枷鎖聲。
     - `machine`（機械流）：五連發高速方波數據滴答脈衝。
     - `hunger`（飢餓流）：低頻空腹共鳴與清脆陶碗敲擊聲。
     - `rebel`（反叛流）：失真五度和弦與噴漆高頻嘶聲。
     - `warmth`（人情流）：溫暖木結他大七和弦三角波琶音。
     - `faraway`（遠方流）：高音泛音空靈風鈴。
     - `minimal`（極簡流）：單一清脆木魚敲擊與留白泛音。
   - **五種媒材下筆／選牌質感音（`IE.Audio.medium(m)`）**：
     - `paper`（紙）：雙段高通白噪音翻紙沙沙聲。
     - `sound`（聲）：清亮電鋼琴雙泛音琴音。
     - `image`（影）：雙擊機械相機快門聲。
     - `body`（身）：78Hz／68Hz 雙拍低沉心跳聲。
     - `data`（數）：復古數據機雙音多頻（DTMF）撥號音。
   - **事件音效（`IE.Audio.sfx`）**：
     - `stagePass`（關卡入選）：昂揚大調銅管與高八度方波琶音。
     - `stageFail`（關卡落選）：半音下墜小調嘆息與低沉印章聲。
     - `judge`（外星評審主題）：低音鋸齒波 Drone 加不協和減五度和弦。
     - `levelUp`（人才檔案升級）：清脆上行晶體音階。
     - `ach`（成就解鎖）：閃亮徽章短號。
     - `typewriter`（外星 HR 備忘錄）：機械打字機敲擊聲。
   - **多層次音樂擴充**：
     - 新增 `stageDrum` 音軌層：關卡之夜（`stage` 與 `boss` 模式）自動疊加切分低鼓、過門小鼓與電子鈸節奏。
     - 外星評審之夜（`boss` 模式）自動換調為 **D 和聲小調**（`Dm – Bb – Gm – A`），並改用更具壓迫感的鋸齒波低音與增二度旋律音階。
2. **`game/js/craft.js`、`game/js/ui.js` 與 `game/css/art.css`**：
   - 在創作桌選牌與計分時播放對應媒材質感音，流派觸發時播放流派音色，關卡結算時播放 `stagePass`／`stageFail`。
   - 在局外結算畫面（`metaResultHtml`）觸發升級（`levelUp`）、成就（`ach`）與備忘錄打字機（`typewriter`）音效。
   - 新增創作桌頂部動態音軌與音色指示徽章（`.ct-audio-badge`）及 HUD 聲音按鈕音符標示。

### 前後對比截圖
- 修改前（桌面 1000px）：`docs/shots/t5-before-desktop.png`
- 修改前（手機 390px）：`docs/shots/t5-before-mobile.png`
- 修改後（桌面 1000px）：`docs/shots/t5-after-desktop.png`
- 修改後（手機 390px）：`docs/shots/t5-after-mobile.png`

### 已知問題
- 無。

---

## 任務 6：角色立繪（P1）

### 改動摘要
1. **`game/js/chars.js`**：
   - 在保留原有 8×12 場景全身像（`IE.Chars.spr`）的同時，為 `IE.DATA.BACKGROUNDS` 全部 **20 個角色**繪製獨立的 **24×32 半身立繪（`IE.Chars.BUST`）**，涵蓋表情、衣領、飾物與招牌道具：
     - **R 級普通人（6 位）**：`copywriter`（黑框眼鏡、鬆紅領帶與咖啡杯）、`lifeguard`（額頭蛙鏡、紅救生衣與哨子）、`programmer`（發光青色耳機與連帽衫）、`courier`（黃色防撞頭盔、護目鏡與保溫背帶）、`teacher`（銀白髮髻、銅框眼鏡與粉筆）、`nurse`（紅十字護士帽與聽診器）。
     - **SR 級稀有人才（9 位）**：`busker`（粉紅冷帽、絡腮鬍與木結他柄）、`influencer`（粉紅長捲髮、大墨鏡與環形燈高光）、`cybertech`（青色莫霍克頭、紅色義眼與金屬機械肩）、`animator`（紫色貝雷帽與沾滿粉藍顏料的工作服）、`archaeologist`（寬邊探險帽、皮帶與放大鏡）、`skyheir`（金髮、白禮服、金胸針與香檳杯）、`astronaut`（圓形太空頭盔、反光面罩與維生儀）、`monk`（光頭戒疤、橘色袈裟與木念珠）、`antiquedealer`（銀灰背頭、八字鬍、金框單片眼鏡與紫絨馬甲）。
     - **UR 級極稀有／非地球人（5 位）**：`greydeserter`（灰人頭顱、杏仁巨眼與外星 HR 制服）、`octopoet`（紫章魚圓頂頭、捲曲觸手握金羽毛筆）、`awakenedai`（雙天線復古螢幕頭、心電波形與綠核心）、`timetraveler`（白髮、黃銅時空護目鏡與發光時空懷錶）、`mushroom`（紅底白點大菌傘、米白菌絲臉龐與發光孢子斗篷）。
   - 更新 `IE.Chars.img(id, scale, locked)` 輸出 `24×32` 半身立繪，並附上稀有度類別 `r-R`、`r-SR`、`r-UR`。
2. **`game/js/ui.js` 與 `game/css/art.css`**：
   - 在結局「人類樣本檔案」（`dossierModal`）加入角色 24×32 半身立繪與角色名牌（`.d-por`）。
   - 為三個稀有度設計專屬立繪與卡片外框：**R 級銀框**（金屬銀邊與冷白內光）、**SR 級金框**（耀金邊框與暖金光暈）、**UR 級彩虹框**（五彩漸層邊框與霓虹雙色外發光）。
   - 為「人才扭蛋機」抽中 UR 角色時（`.modal.gacha.ur-hit`、`.gacha-result.ur-reveal`）加入專屬降臨演出：旋轉彩虹星芒光束（`.ur-rays`）、「★ 特級非地球樣本・UR 降臨 ★」橫幅與彈出特寫動畫。

### 前後對比截圖
- 修改前（桌面 1000px）：`docs/shots/t6-before-desktop.png`
- 修改前（手機 390px）：`docs/shots/t6-before-mobile.png`
- 修改後（桌面 1000px）：`docs/shots/t6-after-desktop.png`
- 修改後（手機 390px）：`docs/shots/t6-after-mobile.png`

### 已知問題
- 無。

---

## 任務 7：流派徽章與媒材圖示（P1）

### 改動摘要
1. **`game/js/icons.js`**：
   - 新增 **10 個流派徽章（12×12）**（`sc_flood` 水滴波紋、`sc_neon` 霓虹星芒、`sc_cliche` 無限迴圈、`sc_guilt` 鎖鏈鉛錘、`sc_machine` 針腳晶片、`sc_hunger` 蒸氣裂碗、`sc_rebel` 鋸齒閃電、`sc_warmth` 雙層暖心、`sc_faraway` 四方羅盤、`sc_minimal` 留白禪圓）與 `IE.Icons.school(id, size)` 介面。
   - 新增 **5 個媒材圖示（12×12）**（`med_paper` 摺角橫線稿紙、`med_sound` 雙八分音符、`med_image` 菲林鏡頭框、`med_body` 手印掌心、`med_data` 數據終端螢幕）與 `IE.Icons.media(m, size)` 介面。
2. **`game/js/craft.js`、`game/js/ui.js` 與 `game/css/art.css`**：
   - 將流派徽章嵌入創作桌物件格的流派標記（`.ct-obj .osc`）、創作桌流派欄（`.ct-schools .sch`）及收藏頁流派標題（`.sch-head`）。
   - 將媒材圖示嵌入牌庫視窗的媒材分佈標籤（`.dk-med`）。
   - 當流派湊滿三件（`.ct-schools .sch.max`，3/3）時，為流派欄加上雙色漸層流動光框（`sch-max-border-flow`）與斜向流光掃描（`sch-max-sheen`）。

### 前後對比截圖
- 修改前（桌面 1000px）：`docs/shots/t7-before-desktop.png`
- 修改前（手機 390px）：`docs/shots/t7-before-mobile.png`
- 修改後（桌面 1000px）：`docs/shots/t7-after-desktop.png`
- 修改後（手機 390px）：`docs/shots/t7-after-mobile.png`

### 已知問題
- 無。

---

## 任務 8：創作之夜的場景（P1）

### 改動摘要
1. **`game/js/craft.js` 與 `game/css/art.css`**：
   - 新增創作桌背景層（`.ct-scene-bg`）與舞台中央微縮景觀（`.ct-scene-stage`），按當晚情境自動切換四種場景：
     - **平常晚上（`desk`）**：深夜木書桌、黃銅鵝頸檯燈與暖光束（`.sc-lamp`、`.sc-lamp-cone`）、手稿與熱咖啡杯（`.sc-desk-items`），以及中央窗景（`.sc-window`），動態反映當前浮城水位（`--water-pct`、水位刻度 `2F–6F` 與波浪動畫）。
     - **社區小展（`small`）**：舊城社區會堂場景，配紅絨舞台布幕（`.sc-curtain`）、暖白光管（`.sc-tubes`）、三角彩旗（`.sc-bunting`）、木佈告板與摺凳列（`.sc-chairs`）。
     - **畫廊聯展（`gallery`）**：天空區白盒畫廊場景，配極簡白牆、軌道射燈與三道聚光燈束（`.sc-track`、`.sc-cones`）、三幅抽象畫框（`.sc-frames`）及紅絨圍欄柱（`.sc-stanchion`）。
     - **外星評審（`boss`）**：母艦飛碟內部評審艙場景，配弧形外星金屬肋骨（`.sc-ufo-ribs`）、頂部牽引光束核心與垂直光柱（`.sc-ufo-core`、`.sc-ufo-beam`）、反重力脈衝光環（`.sc-ufo-rings`）與全息控制台（`.sc-ufo-consoles`）。
   - **通宵創作漸亮演出（`mode-allnighter`）**：當玩家選擇「通宵創作」時，隨每次下筆推進（`data-dawn="0"` 至 `"4"`，由「子夜 01:00」→「寅時 03:00」→「破曉 04:45」→「魚肚白 05:30」→「天亮 06:30」），背景與窗外天空由深夜星空漸變為破曉晨曦並升起朝陽。

### 前後對比截圖
- 修改前（桌面 1000px）：`docs/shots/t8-before-desktop.png`
- 修改前（手機 390px）：`docs/shots/t8-before-mobile.png`
- 修改後（桌面 1000px）：`docs/shots/t8-after-desktop.png`
- 修改後（手機 390px）：`docs/shots/t8-after-mobile.png`

### 已知問題
- 無。

