# 美術盤點與生圖 prompt

> 給製作人。最後更新：2026-11-01（WO-15-06 合併之後）。
> 用途：用 ChatGPT 生成遊戲現在缺少的插圖。收到圖之後，由 Claude 處理成像素圖，再寫成美術整合工單交給 Gemini。
> 參考圖在 `docs/art-prompts/ref/`（由遊戲直接截取，沒有文字）。

---

## 一、現在的美術

### 1. 做法

遊戲裡**沒有任何圖片檔**：所有畫面都是程式畫出來的。這是美術任務書 `docs/GEMINI_BRIEF.md` 的硬性規定「沒有外部素材」；唯一的例外是你提供的 13 首背景音樂。

| 技術 | 用在哪裡 |
|---|---|
| 320×180 像素的 canvas，放大顯示 | 浮城（天氣、早午晚、水位、探射燈、朋友的窗）、房間、浮城地圖、世界地圖、30 個目的地全景、11 個小遊戲 |
| 像素字串（每個字元一格） | 121 件物件圖示（16×16，兩兩不同）、20 個角色半身像（24×32）、19 位外星評審和 2 個場地（32×32）、流派、媒材、外星評級徽章（12×12） |
| CSS 與內嵌 SVG | 素材卡的五種媒材卡面、創作桌的四個場景（書桌、社區會堂、白盒畫廊、飛碟內部）、所有介面與特效 |
| 程式生成 | 「今晚的作品」小畫（`artwork.js`，按配色排成色塊） |
| Web Audio 即時合成 | 全部音效 |

美術方向（設計大綱 PDF 第 9 頁）：低解像度 16-bit 像素畫、320×180 原生解像度；主色是浸水的藍綠和霓虹粉紫，熱浪季轉橙紅，酸雨季轉病態黃綠；角色細小但表情誇張，對話時出大頭像（像超任 RPG）；浮城用橫切面看到上下層的階級差異；外星人刻意畫得很企業化（西裝、文件夾、標準笑容）。

### 2. 已經完成、不需要重畫

物件圖示、角色半身像、外星評審、素材卡面、計分演出、小遊戲、流派與媒材徽章都已經完整，而且風格統一（見 `docs/ART_LOG.md` 任務 1 至 15）。房間、浮城地圖、世界地圖和 30 個目的地全景只在舊模式出現；五輪模式（WO-15-08 之後）會把它們藏起來，不值得再投資。

### 3. 缺口（按玩家看到的次數排列）

| # | 缺口 | 現況 | 每局看到幾次 |
|---|---|---|---|
| 1 | **生活卡沒有圖** | 五輪模式每天最重要的決定（三選一），但三張卡只有文字 | 15 次 × 3 張 |
| 2 | **八位朋友沒有臉** | 朋友卡和聊天視窗只有名字和對話泡泡；浮城裡只有窗口剪影 | 數次 |
| 3 | **市集、素材包、篩選日沒有圖** | 第十五期的新畫面（WO-15-07、08）；開包是 roguelite 最興奮的時刻之一，現在沒有包裝 | 15 次市集、5 次篩選日 |
| 4 | **結局沒有插圖** | 「人類樣本檔案」只有文字和角色小頭像；設計大綱說結局和死亡畫面是玩家截圖分享的主要來源 | 1 次（但最重要） |
| 5 | **沒有主視覺、沒有標誌** | 標題畫面是浮城加一行字；路線圖下一步是開 Steam 頁面和參加 Next Fest，需要商店圖 | 宣傳用 |
| 6 | 浮城的畫面比較簡單 | 主要是長方形的樓和窗；但它有天氣、水位、朋友窗口等動態，換成圖片的工程大，而且第二十期的「城市」會重做 | 之後再做 |
| 7 | 作品只是色塊 | 第十七期「作品牆」才需要，到時按工單再出 prompt | 之後再做 |

### 4. 限制，以及我的處理方法

- **規則要開例外**：圖片也要像背景音樂一樣，成為「沒有外部素材」的例外。請你確認同意。
- **檔案大小**：單一 HTML 檔 `dist/inspiration-evacuation-2080.html` 現在 1.58 MB，已經超過任務書定下的 1.5 MB 上限。
- **ChatGPT 的「像素畫」不是真正的像素畫**：像素格大小不一、邊緣模糊、顏色太多。所以每張圖收到之後，由我：
  1. 縮到遊戲的原生像素（結局和場景 320×180、生活卡約 160×80、頭像 64×64）；
  2. 減到約 32 色，靠近遊戲的色票；
  3. 在遊戲裡以整數倍放大顯示。

  處理後每張只有約 2 至 20 KB（試過：320×180、32 色約 6 KB），全部加起來約 300 KB，可以直接放進單一 HTML 檔；上限改為 2.5 MB。Steam 用的大圖不放進遊戲。

---

## 二、結論：要生成甚麼

| 批次 | 內容 | 張數 | 用在哪裡 |
|---|---|---|---|
| 第一批 | 主視覺（橫）`KA-01` | 1 | Steam、標題畫面；**也是之後所有圖的風格樣板，請先做** |
| 第二批 | 生活卡 12 張、朋友頭像 8 張 | 20 | 白天的三張卡、朋友卡、聊天視窗 |
| 第三批 | 結局 6 張、主視覺（直）`KA-02` | 7 | 結局的「人類樣本檔案」頂部；Steam 直式圖 |
| 第四批 | 素材包 5 個、市集、篩選日、星際人才發展局徽章 | 8 | 市集（WO-15-07）、篩選日（WO-15-08）、檔案和備忘錄 |
| 第五批（選做） | 創作桌場景 4 張、出國明信片 6 張、全景 `KA-03`、圖示、另外 3 個結局 | 15 | 取代 CSS 畫的創作桌場景；出國卡；Steam 收藏庫 |

核心 36 張，選做 15 張。**現在就可以開始生圖**；放進遊戲的工單排在 WO-15-08 之後（生活卡、市集、篩選日的版面都會在 WO-15-07、08 改動）。

**不建議生成**：物件圖示、角色半身像、外星評審（已經完整，重畫的話風格難統一）；舊模式的房間、地圖、目的地；任何帶文字的東西（例如遊戲名稱標誌：中文字 ChatGPT 會寫錯，由我用遊戲的字型做）。

---

## 三、怎樣用 ChatGPT 生圖

1. **每一批開一個新對話。** 第一則訊息上載參考圖，貼上第四節的「風格設定」。
   - 一定要上載：`ref-city-night.png`、`ref-characters.png`、`ref-palette.png`。
   - 有外星人的圖（主視覺、結局「被選中」、篩選日、徽章、飛碟場景）再加上 `ref-judges.png`。
2. **第一批的 `KA-01` 滿意之後**，之後每一個對話都把它和參考圖一起上載，並說「match the style of KA-01」。這是保持風格一致最有效的方法。
3. **一則訊息只生一張圖**：貼上該張的 prompt 就可以。prompt 已經寫明比例（橫向 3:2、直向 2:3 或正方）。
4. **出現文字、亂碼、多餘的手指，或風格走樣**：回覆「Remove all text and letters; keep everything else exactly the same.」或「Redraw in the same pixel style as KA-01.」。
5. **透明背景**（素材包、徽章、圖示）：prompt 已經要求透明背景；做不到的話，純色背景也可以，我會去背。
6. **存檔**：按清單的檔名存成 PNG（例如 `day-label.png`）。
7. **交給我**：直接在這個對話上載（一次可以上載多張），並說「美術第 X 批」。我會先檢查，不合格的告訴你要重做哪幾張和怎樣改。
8. 每張生兩、三次，揀最好的一張就可以；不用追求完美，縮成像素之後很多細節都會消失，**構圖和色彩**才是重點。

---

## 四、風格設定（每個新對話的第一則訊息）

上載參考圖，然後貼上：

```
I'm making a pixel-art game called "Inspiration Evacuation 2080". For every image in this conversation, follow this art direction exactly.

ART STYLE
- Detailed 16-bit pixel art (SNES / hi-bit era). Crisp, hard-edged square pixels on one consistent grid, as if drawn at low resolution and scaled up with nearest-neighbour. No anti-aliasing, no blur, no soft airbrush, no painterly strokes, no photorealism, no 3D-render look, no vector look.
- Limited palette of about 32 colours. Flat colour areas, light ordered dithering for gradients. Dark outlines on characters and props.
- Characters are small and expressive, with slightly exaggerated faces, like SNES RPG sprites.

WORLD
- The year 2080. "The Floating City": a flooded, Hong Kong-inspired vertical city. Crowded old tenement towers and shabby high-rises stand in sea water; footbridges, concrete flyovers, neon signs, air-conditioner boxes, laundry poles, rooftop shacks, small boats tied to windows. The rich "Sky District" floats above on white platforms with gardens. The lower the floor, the poorer and wetter.
- Aliens run a corporate recruitment programme, the "Interstellar Talent Development Bureau". They look like polite corporate HR staff: neat suits, ID lanyards, clipboards, identical customer-service smiles. Their sleek white flying saucers sweep searchlight beams across the city at night, looking for inspired people.
- Tone: deadpan dark comedy and social satire; melancholic but warm.

PALETTE (anchor colours)
- Night navy #0d1020, #151a2e, #26334d
- Flood teal #0b2a3a, #37c3d6, #3fb6d9
- Neon pink-magenta #ff4fb4, warm window yellow #ffd36b
- Accents: lime #9be36b, violet #a77bff, coral #ff6b5e, off-white #e8fdff

RULES
- No text of any kind: no letters, numbers, Chinese characters, logos, watermarks or signatures. Signs, screens and papers show only abstract glyph-like shapes and symbols.
- No frame or border around the image unless I ask for one.
- The attached images are screenshots of the current game. Match their pixel style, palette and mood.

Reply "OK" and wait for my first image request.
```

---

## 五、Prompt

每一段 prompt 都是完整的一則訊息，直接複製貼上。

### 第一批：主視覺（風格樣板）

#### KA-01 主視覺（橫）　`ka-01-landscape.png`
用途：Steam 主要圖和頁首圖、頁面背景、標題畫面。內容：夜雨中的浮城，大廈像娃娃屋一樣切開，看到朋友們的生活；外星飛碟的探射燈快要照到主角的窗。左邊留空放遊戲名稱。

```
Image KA-01: game key art. Landscape 3:2 (1536x1024).
Pixel density: detailed hi-bit pixel art, as if drawn at about 384x256 pixels and scaled up 4x.

Night, light rain. Centre-right: a tall, crumbling tenement tower rises out of dark flood water, drawn as a cut-away cross-section so we can see inside its floors like a dollhouse:
- at the waterline, a tiny dessert shop with a rowing boat tied to its door;
- above it, an old poet sipping tea among stacks of books;
- a mechanic's workshop with a small robot cat;
- on the roof, a young DJ with huge speakers under string lights;
- on a middle floor, the hero: a former advertising copywriter (black-rimmed glasses, messy brown hair, white shirt, loose red tie) writing at a desk under a lamp, with tiny golden sparks of inspiration rising from their head.
Above the city, a sleek white corporate flying saucer hovers. Its searchlight beam slants down across the towers and is just about to reach the hero's window. Through the saucer's lit portholes we can see alien HR officers in suits holding clipboards.
Top edge: the rich Sky District floating on white platforms with trees and glass villas. Bottom edge: the drowned old town under the water, with submerged shop signs, a sunken tram and fish. Neon signs (abstract shapes only) reflect in the water.

Composition: keep the left third calmer and darker (night sky and distant towers) as empty space for the game logo, which I will add myself later. Strong silhouettes that still read when the image is shrunk to a small thumbnail.
Same art style, palette and no-text rule as set at the start.
```

### 第二批：生活卡（12 張）

用途：白天三選一的卡頂橫幅。會從中間裁成 2:1，所以主要動作放在中間。會顯示得很小，所以要大形狀、少細節。

#### DAY-label AI 數據標註　`day-label.png`
教 AI 認貓，好讓它以後不再需要你。

```
Image DAY-label: illustration for a "day card" in the game. Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle, so keep the main action in the central band.
Pixel density: chunky, as if drawn at about 192x128 pixels and scaled up 8x. It will be shown small, so use bold shapes and few details.

A cramped, windowless data-labelling room at night. A tired worker, seen from behind, sits at an old monitor showing a grid of photos (cats, traffic lights, blurry shapes) with green tick and red cross buttons. On a second screen, a cute AI mascot face grows bigger and smugger with every click, as if learning to replace the worker. Empty energy-drink cans, a wilted desk plant, cold blue screen glow.
Same art style, palette and no-text rule.
```

#### DAY-delivery 外送潛水　`day-delivery.png`
在淹水的街道限時送外賣，小心天空區的快艇。

```
Image DAY-delivery: illustration for a "day card" in the game. Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle, so keep the main action in the central band.
Pixel density: chunky, as if drawn at about 192x128 pixels and scaled up 8x. It will be shown small, so use bold shapes and few details.

A food courier in a yellow crash helmet and goggles rides a small battered motorboat through a flooded neon street between tenement towers, holding an insulated food bag high above the water. A sleek white speedboat from the Sky District cuts across in front of them, throwing up a big wave. Rain, neon reflections, a sense of speed and danger.
Same art style, palette and no-text rule.
```

#### DAY-clinic 黑市義體診所　`day-clinic.png`
替病人接駁義體；有些義體沒有登記。

```
Image DAY-clinic: illustration for a "day card" in the game. Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle, so keep the main action in the central band.
Pixel density: chunky, as if drawn at about 192x128 pixels and scaled up 8x. It will be shown small, so use bold shapes and few details.

A back-alley black-market cybernetics clinic. A nervous patient sits in an old dentist's chair while a calm technician with a magnifying visor plugs colourful cables into a mechanical arm implant. Shelves of jars with spare robot eyes and fingers, unregistered prosthetic limbs hanging on hooks, a flickering red-and-green status light. Grimy but oddly cosy.
Same art style, palette and no-text rule.
```

#### DAY-salvage 拆樓打撈　`day-salvage.png`
替重建計劃拆舊樓，牆裡可能藏著舊世界的東西。

```
Image DAY-salvage: illustration for a "day card" in the game. Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle, so keep the main action in the central band.
Pixel density: chunky, as if drawn at about 192x128 pixels and scaled up 8x. It will be shown small, so use bold shapes and few details.

A demolition site in the flooded old town. A crane swings a wrecking ball into the wall of an old, half-submerged tenement. Through the freshly cracked wall, a forgotten treasure from the old world glows: a jade box, an old photo album and a vintage radio. A worker in a hard hat leans out of the crane cab, aiming. Dust and debris splash into the water.
Same art style, palette and no-text rule.
```

#### DAY-haggle 夜市擺地攤　`day-haggle.png`
把撿回來的舊物賣給遊客。

```
Image DAY-haggle: illustration for a "day card" in the game. Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle, so keep the main action in the central band.
Pixel density: chunky, as if drawn at about 192x128 pixels and scaled up 8x. It will be shown small, so use bold shapes and few details.

A night-market street stall under a concrete flyover. The seller sits on a low stool behind a mat of salvaged old-world goods: film cameras, vinyl records, a porcelain lucky cat, rusty tin toys. A rich tourist from the Sky District in spotless white clothes bends over to haggle, holding up fingers. Paper lanterns, neon, steam rising from a nearby noodle cart.
Same art style, palette and no-text rule.
```

#### DAY-farm 陰謀論內容農場（虧心）　`day-farm.png`
拼湊聳動標題，越假越多人轉發。

```
Image DAY-farm: illustration for a "day card" in the game. Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle, so keep the main action in the central band.
Pixel density: chunky, as if drawn at about 192x128 pixels and scaled up 8x. It will be shown small, so use bold shapes and few details.

A dim room crowded with racks of phones and screens. A content-farm worker glues together sensational fake news: giant red arrows, shocked cartoon faces, a blurry UFO photo, a lizard-person photo. View counters on the screens explode as spinning symbols (no digits). A corkboard with red string connecting random pictures. Sickly green light; uneasy, satirical mood.
Same art style, palette and no-text rule.
```

#### DAY-smile 企業情緒陪伴（虧心）　`day-smile.png`
陪有錢人說笑、點頭、倒酒，笑得越準越值錢。

```
Image DAY-smile: illustration for a "day card" in the game. Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle, so keep the main action in the central band.
Pixel density: chunky, as if drawn at about 192x128 pixels and scaled up 8x. It will be shown small, so use bold shapes and few details.

A glossy Sky District lounge with a view over the city. A rich client in a gold-trimmed suit laughs loudly at their own joke, while the hired "emotional companion" forces an enormous rehearsed smile, nodding and pouring wine at the same time. A small smile-meter glows on the companion's wristband; a single drop of sweat. Luxurious, uncomfortable, satirical.
Same art style, palette and no-text rule.
```

#### DAY-dive 舊城潛水　`day-dive.png`
用魚叉捕魚，打撈水淹舊城的遺物。

```
Image DAY-dive: illustration for a "day card" in the game. Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle, so keep the main action in the central band.
Pixel density: chunky, as if drawn at about 192x128 pixels and scaled up 8x. It will be shown small, so use bold shapes and few details.

Underwater in the drowned old town. A diver with a small speargun glides past sunken shop signs (abstract shapes only), a submerged tram and the roof of a flooded temple. A school of silver fish, light rays from the surface, and a glowing old music box half-buried in the silt, waiting to be found. Calm, mysterious, teal.
Same art style, palette and no-text rule.
```

#### DAY-busk 街頭表演　`day-busk.png`
在天橋下表演，收入很少，但會讓火花變旺。

```
Image DAY-busk: illustration for a "day card" in the game. Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle, so keep the main action in the central band.
Pixel density: chunky, as if drawn at about 192x128 pixels and scaled up 8x. It will be shown small, so use bold shapes and few details.

Under a concrete flyover at night, a street musician, seen from the side, plays an acoustic guitar and sings to a small crowd of tired commuters who have stopped to listen. An open guitar case with a few coins, puddles reflecting neon, a stray cat listening too. Warm streetlight against the cold rain.
Same art style, palette and no-text rule.
```

#### DAY-garden 天台菜園　`day-garden.png`
在大廈天台種菜：澆水、收成、趕走偷菜的白鴿。

```
Image DAY-garden: illustration for a "day card" in the game. Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle, so keep the main action in the central band.
Pixel density: chunky, as if drawn at about 192x128 pixels and scaled up 8x. It will be shown small, so use bold shapes and few details.

A rooftop vegetable garden on top of a tenement in the early morning. Planters made from old fridges, bathtubs and paint buckets. A person waters tomato plants with a watering can while a fat white pigeon steals a cherry tomato. Water tanks and laundry lines; in the background the flooded city and the floating Sky District under a soft dawn sky.
Same art style, palette and no-text rule.
```

#### DAY-volunteer 到避難所做義工　`day-volunteer.png`
幫人不會賺錢，但會讓靈魂變輕。

```
Image DAY-volunteer: illustration for a "day card" in the game. Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle, so keep the main action in the central band.
Pixel density: chunky, as if drawn at about 192x128 pixels and scaled up 8x. It will be shown small, so use bold shapes and few details.

A crowded flood shelter inside an old school gym. Rows of camp beds and donated blankets. A volunteer in a simple vest ladles hot soup for an old person and a child. Boxes of donated clothes, and a child's crayon drawing of a sun taped to the wall. Warm yellow light; gentle and hopeful.
Same art style, palette and no-text rule.
```

#### DAY-trip 出國（通用）　`day-trip.png`
稀有卡：付旅費出國，帶回外國素材。

```
Image DAY-trip: illustration for a rare "day card" in the game. Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle, so keep the main action in the central band.
Pixel density: chunky, as if drawn at about 192x128 pixels and scaled up 8x. It will be shown small, so use bold shapes and few details.

Seen from inside a small aeroplane: through the oval window, the flooded Floating City shrinks away below and the sky ahead is bright. On the fold-down tray: a worn sticker-covered passport shape (no text), a sketchbook and a paper cup of coffee. A feeling of escape and adventure.
Same art style, palette and no-text rule.
```

### 第二批（續）：朋友頭像（8 張）

用途：朋友卡、聊天視窗（像超任 RPG 的對話頭像）。

#### FRIEND-ken 畫壁畫的阿 Ken（教三色）　`friend-ken.png`

```
Image FRIEND-ken: character portrait for dialogue, in the style of 16-bit SNES RPG portraits. Square 1:1 (1024x1024). Head and shoulders, three-quarter view facing slightly left, centred, on a plain flat dark navy background (#151a2e) with no scenery.
Pixel density: as if drawn at about 64x64 pixels and scaled up 16x. Bold dark outline, expressive face.

Ah Ken, a street muralist in their late twenties: paint-splattered denim jacket, a beanie pushed back on messy hair, a spray can in one hand, a smear of teal paint on one cheek, a friendly lopsided grin; the look of someone who just escaped the Sky District security guards again.
Same art style, palette and no-text rule.
```

#### FRIEND-dj 天台 DJ 小妹（教四色）　`friend-dj.png`

```
Image FRIEND-dj: character portrait for dialogue, in the style of 16-bit SNES RPG portraits. Square 1:1 (1024x1024). Head and shoulders, three-quarter view facing slightly left, centred, on a plain flat dark navy background (#151a2e) with no scenery.
Pixel density: as if drawn at about 64x64 pixels and scaled up 16x. Bold dark outline, expressive face.

Siu Mui, a young rooftop DJ in her early twenties: neon-pink bob haircut, oversized headphones around her neck, glow-stick bracelets, holding a vinyl record, a cheeky grin; the edge of a huge speaker just behind her shoulder.
Same art style, palette and no-text rule.
```

#### FRIEND-ho 寫詩的何伯（教單色）　`friend-ho.png`

```
Image FRIEND-ho: character portrait for dialogue, in the style of 16-bit SNES RPG portraits. Square 1:1 (1024x1024). Head and shoulders, three-quarter view facing slightly left, centred, on a plain flat dark navy background (#151a2e) with no scenery.
Pixel density: as if drawn at about 64x64 pixels and scaled up 16x. Bold dark outline, expressive face.

Uncle Ho, an elderly poet (about 80) who has written poems for fifty years that nobody reads: thin white hair, round wire glasses, a faded traditional Chinese cotton shirt, holding a chipped teacup with a wisp of steam, a water-stained notebook under his arm; a kind, wry, slightly sad smile.
Same art style, palette and no-text rule.
```

#### FRIEND-miu 改裝機械人的 Miu（教互補）　`friend-miu.png`

```
Image FRIEND-miu: character portrait for dialogue, in the style of 16-bit SNES RPG portraits. Square 1:1 (1024x1024). Head and shoulders, three-quarter view facing slightly left, centred, on a plain flat dark navy background (#151a2e) with no scenery.
Pixel density: as if drawn at about 64x64 pixels and scaled up 16x. Bold dark outline, expressive face.

Miu, a young mechanic who talks to machines more than to people: welding goggles pushed up on the forehead, oil-stained overalls, short messy hair with one teal streak, a screwdriver tucked behind one ear, and a small mechanical cat perched on the shoulder; a deadpan expression with a hint of pride.
Same art style, palette and no-text rule.
```

#### FRIEND-fong 唱粵劇的芳姐（教全光譜）　`friend-fong.png`

```
Image FRIEND-fong: character portrait for dialogue, in the style of 16-bit SNES RPG portraits. Square 1:1 (1024x1024). Head and shoulders, three-quarter view facing slightly left, centred, on a plain flat dark navy background (#151a2e) with no scenery.
Pixel density: as if drawn at about 64x64 pixels and scaled up 16x. Bold dark outline, expressive face.

Sister Fong, a Cantonese opera singer in her fifties: hair in an elegant bun with a jade hairpin, partial stage make-up with rose-red around the eyes, the embroidered collar of a red opera costume, a folding fan held near her chin; a proud, theatrical expression.
Same art style, palette and no-text rule.
```

#### FRIEND-chan 修船的老陳（教矛盾）　`friend-chan.png`

```
Image FRIEND-chan: character portrait for dialogue, in the style of 16-bit SNES RPG portraits. Square 1:1 (1024x1024). Head and shoulders, three-quarter view facing slightly left, centred, on a plain flat dark navy background (#151a2e) with no scenery.
Pixel density: as if drawn at about 64x64 pixels and scaled up 16x. Bold dark outline, expressive face.

Old Chan, a weather-beaten boat repairer in their sixties: sun-darkened skin, short grey stubble, a faded fisherman's cap, a coil of rope over one shoulder, a big wrench in one hand; a gruff look but kind eyes.
Same art style, palette and no-text rule.
```

#### FRIEND-yu 寫歌的小雨（教鄰近色）　`friend-yu.png`

```
Image FRIEND-yu: character portrait for dialogue, in the style of 16-bit SNES RPG portraits. Square 1:1 (1024x1024). Head and shoulders, three-quarter view facing slightly left, centred, on a plain flat dark navy background (#151a2e) with no scenery.
Pixel density: as if drawn at about 64x64 pixels and scaled up 16x. Bold dark outline, expressive face.

Siu Yu, a shy young songwriter (about 20): long dark hair partly covering one eye, an oversized yellow raincoat, the strap of an acoustic guitar over one shoulder, a pencil and a small lyric notebook; a gentle, melancholic half-smile.
Same art style, palette and no-text rule.
```

#### FRIEND-mary 開糖水舖的 Mary 姐（教分裂互補）　`friend-mary.png`

```
Image FRIEND-mary: character portrait for dialogue, in the style of 16-bit SNES RPG portraits. Square 1:1 (1024x1024). Head and shoulders, three-quarter view facing slightly left, centred, on a plain flat dark navy background (#151a2e) with no scenery.
Pixel density: as if drawn at about 64x64 pixels and scaled up 16x. Bold dark outline, expressive face.

Sister Mary, the warm, plump owner of a third-generation dessert shop that has been flooded twice (about 50): permed hair, an apron with a small embroidered mango, holding a steaming bowl of red bean soup towards the viewer, laughing.
Same art style, palette and no-text rule.
```

### 第三批：結局（6 張）與主視覺（直）

用途：結局「人類樣本檔案」的頂部插圖。會裁成 16:9。主角只畫背影或剪影，令 20 個角色都適用（檔案裡另外有角色頭像）。

#### END-archived 人才庫（機會用完）　`end-archived.png`
探射燈不會再經過你的窗外。你還在浮城，只是不再被看見。

```
Image END-archived: ending illustration. Landscape 3:2 (1536x1024). It will be cropped to 16:9 through the middle, so keep the top and bottom 8% free of important details.
Pixel density: as if drawn at about 384x256 pixels and scaled up 4x. Show the protagonist only from behind or in silhouette, so that it can stand for any player character.

Night, steady rain. Inside a tiny low-floor flat in a flooded tenement, the protagonist sits on the windowsill hugging their knees, watching the alien flying saucer's white searchlight sweep slowly across the neighbouring towers and drift away into the distance without ever stopping at their window. Stacks of unfinished drawings and notebooks surround them. Flood water laps just below the window frame. Far away, in a lit porthole of the saucer, an alien clerk in a suit slides a thin folder into a filing cabinet. Mood: quiet, overlooked, melancholic.
Same art style, palette and no-text rule.
```

#### END-heavy 良知太重（靈魂超過 21 克）　`end-heavy.png`
光束嘗試把你拉起來，卻拉不動。

```
Image END-heavy: ending illustration. Landscape 3:2 (1536x1024). It will be cropped to 16:9 through the middle, so keep the top and bottom 8% free of important details.
Pixel density: as if drawn at about 384x256 pixels and scaled up 4x. Show the protagonist only from behind or in silhouette, so that it can stand for any player character.

Night on the flat rooftop of a flooded tenement. The alien saucer above pours down a bright tractor beam. The protagonist floats only a few centimetres above the rooftop, arms raised, straining upward, but cannot rise: a glowing, heavy, heart-shaped stone hangs from their chest on a chain and rests on the rooftop like an anchor. The beam flickers and sputters as if overloaded. In nearby windows, neighbours lean out to watch. Mood: tragicomic; their conscience is too heavy to be lifted.
Same art style, palette and no-text rule.
```

#### END-death 死亡（通用）　`end-death.png`
死因有 141 種，文字已經寫了；圖只負責氣氛。

```
Image END-death: ending illustration. Landscape 3:2 (1536x1024). It will be cropped to 16:9 through the middle, so keep the top and bottom 8% free of important details.
Pixel density: as if drawn at about 384x256 pixels and scaled up 4x.

Dawn after the rain in the drowned old town. A small paper boat carrying a lit candle and a tiny folded paper portrait drifts slowly down a canal between half-submerged tenements. The neon signs reflected in the still water are switching off one by one. A cat on a windowsill watches it pass. A gentle elegy with a touch of dark humour; no bodies, nothing gory.
Same art style, palette and no-text rule.
```

#### END-guardian 地球守護者（被選中但留下）　`end-guardian.png`
你關上了窗。探射燈在窗外等了很久，最後熄滅了。

```
Image END-guardian: ending illustration. Landscape 3:2 (1536x1024). It will be cropped to 16:9 through the middle, so keep the top and bottom 8% free of important details.
Pixel density: as if drawn at about 384x256 pixels and scaled up 4x. Show the protagonist only from behind or in silhouette, so that it can stand for any player character.

Night. Inside the protagonist's small apartment, the protagonist pulls the window shutters closed while, outside, the alien searchlight presses white light through the slats, waiting. Inside is warm lamplight, and the protagonist's paintings and poems are pinned to every wall. Through the open front door, neighbours fill the corridor: an old poet with a cup of tea, a young DJ with headphones, a dessert-shop owner carrying bowls, all smiling. Mood: warm defiance; choosing the people around you over escape.
Same art style, palette and no-text rule.
```

#### END-agent 星際特工（被選中並離開）　`end-agent.png`
第一份工作是篩選地球人。阿星就坐在隔壁，沒有抬頭看你。

```
Image END-agent: ending illustration. Landscape 3:2 (1536x1024). It will be cropped to 16:9 through the middle, so keep the top and bottom 8% free of important details.
Pixel density: as if drawn at about 384x256 pixels and scaled up 4x. Show the protagonist only from behind or in three-quarter back view, so that it can stand for any player character.

Inside the Interstellar Talent Development Bureau aboard the alien mothership: a vast, spotless open-plan office with identical white desks in perfect rows under cold lights; alien HR managers in tailored suits with clipboards and frozen customer-service smiles; motivational posters showing only abstract alien symbols; a giant window with Earth's flooded coastline far below. The protagonist, now in a sleek alien staff uniform with an ID lanyard, sits at a desk sorting holographic files of human candidates into a green tray and a red tray. At the next desk, their long-lost best friend Ah Sing, in the same uniform, keeps working and does not look up. Mood: success that feels hollow; corporate satire.
Same art style, palette and no-text rule.
```

#### END-returned 被遣返　`end-returned.png`
員工評分太低，以「文化不契合」為由被遣返地球。

```
Image END-returned: ending illustration. Landscape 3:2 (1536x1024). It will be cropped to 16:9 through the middle, so keep the top and bottom 8% free of important details.
Pixel density: as if drawn at about 384x256 pixels and scaled up 4x. Show the protagonist only from behind or in silhouette, so that it can stand for any player character.

A grey, drizzly morning. High above, a hatch in the alien saucer opens and a white beam gently lowers the protagonist, in a crumpled alien uniform and holding a cardboard box of desk things with a small cracked star-shaped badge on top, back down onto a floating wooden pallet in the flooded street. The water is higher than before. Neighbours peer out of their windows; a few golden sparks of inspiration still flicker around the protagonist's head. Mood: absurd, deflated, but not hopeless.
Same art style, palette and no-text rule.
```

#### KA-02 主視覺（直）　`ka-02-portrait.png`
用途：Steam 直式圖（748×896）和收藏庫圖（600×900）、手機分享。上方留空放遊戲名稱。

```
Image KA-02: vertical key art. Portrait 2:3 (1024x1536).
Pixel density: detailed hi-bit pixel art, as if drawn at about 256x384 pixels and scaled up 4x.

Same world, characters and mood as image KA-01, rearranged vertically:
- top: the white Sky District platforms among clouds, and the corporate flying saucer with its searchlight;
- middle: the beam falls diagonally onto one lit window of a crumbling tenement tower; inside, the copywriter hero (black-rimmed glasses, loose red tie) looks up from the desk in surprise, pen in hand, golden sparks rising;
- bottom: flood water with neon reflections, a small boat, and the drowned old town below the surface.
Composition: leave the upper quarter (sky) fairly plain for the game logo, which I will add later. The hero's window should be the brightest point of the image.
Same art style, palette and no-text rule.
```

### 第四批：市集、素材包、篩選日、徽章（8 張）

#### SCENE-market 二手市集　`scene-market.png`
用途：市集視窗（WO-15-07）頂部橫幅，會裁成 3:1。

```
Image SCENE-market: banner for the in-game "Second-hand Market" shop. Landscape 3:2 (1536x1024). It will be cropped to a 3:1 strip through the middle, so keep everything important between 30% and 70% of the height.
Pixel density: as if drawn at about 384x256 pixels and scaled up 4x.

A cosy night market under a concrete flyover in the flooded city. One big stall in the centre with a wooden counter: two curious trinkets on velvet cloth, a rack of sealed foil card packs, a polishing wheel and an old photocopier in a small workshop corner, a blank chalkboard for a painting class, and a mysterious antique chest. The stall keeper, a friendly old trader with a cat sleeping on the counter, waves. String lights, paper lanterns, puddles reflecting neon, a few shoppers.
Same art style, palette and no-text rule.
```

#### SCENE-review 篩選日　`scene-review.png`
用途：每輪最後的篩選日視窗（WO-15-08）：交租和靈魂秤重。

```
Image SCENE-review: illustration for "Screening Day", the end-of-round check. Landscape 3:2 (1536x1024). It will be cropped to 16:9 through the middle, so keep the top and bottom 8% free of important details.
Pixel density: as if drawn at about 384x256 pixels and scaled up 4x. Show the protagonist only from behind.

Night, on the flat rooftop of a tenement. In the white beam of a hovering alien saucer, a giant brass balance scale floats in the air: on one pan a small glowing orb (a human soul), on the other a small brass weight. Beside the scale, an alien HR officer in a neat suit holds a clipboard and smiles a standard smile. On the other side, a grumpy landlord in a vest and slippers holds out an open palm and clutches a fat ledger. The protagonist stands between them nervously, holding a few coins. Mood: bureaucratic judgement, absurd and tense.
Same art style, palette and no-text rule.
```

#### EMBLEM 星際人才發展局徽章　`emblem.png`
用途：人類樣本檔案、外星 HR 備忘錄、篩選日的印章。

```
Image EMBLEM: logo emblem of the alien corporation "Interstellar Talent Development Bureau". Square 1:1 (1024x1024), transparent background (if transparency is not possible, use plain flat #0d1020).
Pixel density: as if drawn at about 48x48 pixels and scaled up about 21x.

A sleek corporate emblem: a stylised flying-saucer silhouette with a single eye in its dome; from its underside a beam forms a downward triangle that cradles a tiny human figure; thin circuit-like lines curve around it like a laurel wreath. Symmetrical and flat, only two or three colours (white, pale lime #9be36b, a touch of navy). It should look like a friendly but slightly sinister company logo. No letters.
Same art style and no-text rule.
```

#### 素材包（5 個）
用途：市集的素材包（WO-15-07），開包時的包裝。直向 2:3，去背使用。

##### PACK-flood 舊城潛水包（水、記憶）　`pack-flood.png`

```
Image PACK-flood: a booster pack of "material cards" sold in the in-game market. Portrait 2:3 (1024x1536). A sealed, slightly crinkled foil pack, like a trading-card booster pack, with crimped seals at the top and bottom, standing upright and centred, on a transparent background (if transparency is not possible, use plain flat #151a2e). No words or numbers anywhere on the wrapper.
Pixel density: as if drawn at about 128x192 pixels and scaled up 8x.

Theme "Old Town Dive": a teal and gold wrapper showing sunken treasures from the drowned old town: an old family photo, a pocket watch, a porcelain bowl, rising bubbles and a small fish.
Same art style, palette and no-text rule.
```

##### PACK-sky 天空區垃圾包（機械、霓虹）　`pack-sky.png`

```
Image PACK-sky: a booster pack of "material cards" sold in the in-game market. Portrait 2:3 (1024x1536). A sealed, slightly crinkled foil pack, like a trading-card booster pack, with crimped seals at the top and bottom, standing upright and centred, on a transparent background (if transparency is not possible, use plain flat #151a2e). No words or numbers anywhere on the wrapper.
Pixel density: as if drawn at about 128x192 pixels and scaled up 8x.

Theme "Sky District Junk": a chrome-silver and neon-magenta wrapper showing discarded high-tech trash from the rich floating district: a broken neon tube, a circuit board, a cracked robot eye, a twisted chrome spoon.
Same art style, palette and no-text rule.
```

##### PACK-street 街坊包（人情、飢餓、希望）　`pack-street.png`

```
Image PACK-street: a booster pack of "material cards" sold in the in-game market. Portrait 2:3 (1024x1536). A sealed, slightly crinkled foil pack, like a trading-card booster pack, with crimped seals at the top and bottom, standing upright and centred, on a transparent background (if transparency is not possible, use plain flat #151a2e). No words or numbers anywhere on the wrapper.
Pixel density: as if drawn at about 128x192 pixels and scaled up 8x.

Theme "Neighbourhood": a warm coral-red, orange and green wrapper showing street life: a steaming bowl of noodles, a bowl of sweet soup, a potted plant on a windowsill, a handwritten note pinned with a clothes peg, a small rising sun.
Same art style, palette and no-text rule.
```

##### PACK-under 地下包（反叛、憤怒、愧疚）　`pack-under.png`

```
Image PACK-under: a booster pack of "material cards" sold in the in-game market. Portrait 2:3 (1024x1536). A sealed, slightly crinkled foil pack, like a trading-card booster pack, with crimped seals at the top and bottom, standing upright and centred, on a transparent background (if transparency is not possible, use plain flat #151a2e). No words or numbers anywhere on the wrapper.
Pixel density: as if drawn at about 128x192 pixels and scaled up 8x.

Theme "Underground": a dark violet and crimson wrapper showing rebellion and guilt: crossed spray-paint cans, a torn poster with a blank face, a broken chain, a smouldering match, a confession letter sealed with wax.
Same art style, palette and no-text rule.
```

##### PACK-far 遠方包（外國素材，較貴）　`pack-far.png`

```
Image PACK-far: a booster pack of "material cards" sold in the in-game market. Portrait 2:3 (1024x1536). A sealed, slightly crinkled foil pack, like a trading-card booster pack, with crimped seals at the top and bottom, standing upright and centred, on a transparent background (if transparency is not possible, use plain flat #151a2e). No words or numbers anywhere on the wrapper.
Pixel density: as if drawn at about 128x192 pixels and scaled up 8x.

Theme "Far Away": a lavender and gold wrapper with a holographic rainbow sheen, clearly the rarer and more expensive pack: postage stamps, a compass, a tiny pyramid, a snowflake, a palm tree and a distant planet.
Same art style, palette and no-text rule.
```

### 第五批（選做）

#### 創作桌場景（4 張）
用途：取代 CSS 畫的創作桌舞台背景（書桌、社區小展、畫廊聯展、外星評審）。會裁成 4:1 長條；中間要暗而且簡單，因為素材卡會放在上面。

##### STAGE-desk 平常的晚上　`stage-desk.png`

```
Image STAGE-desk: wide backdrop behind the card-playing area. Landscape 3:2 (1536x1024). It will be cropped to a 4:1 strip through the middle, so keep everything important between 35% and 65% of the height. The centre must stay fairly dark and plain, because game cards will be placed on top of it; no people in the centre.
Pixel density: as if drawn at about 384x256 pixels and scaled up 4x.

Late night at the protagonist's desk, seen from the front: on the left, a brass gooseneck lamp casts a warm pool of light on scattered manuscripts and a coffee mug; on the right, a window shows rain and the flood water level outside; a dark wall in between.
Same art style, palette and no-text rule.
```

##### STAGE-hall 社區小展　`stage-hall.png`

```
Image STAGE-hall: wide backdrop behind the card-playing area. Landscape 3:2 (1536x1024). It will be cropped to a 4:1 strip through the middle, so keep everything important between 35% and 65% of the height. The centre must stay fairly dark and plain, because game cards will be placed on top of it; no people in the centre.
Pixel density: as if drawn at about 384x256 pixels and scaled up 4x.

A small community hall in the old town, on a flood-proof upper floor: red velvet stage curtains at both sides, a bare wooden stage, triangle bunting, buzzing fluorescent tubes, a row of folding chairs along the bottom edge, a cork noticeboard. Humble and warm.
Same art style, palette and no-text rule.
```

##### STAGE-gallery 畫廊聯展　`stage-gallery.png`

```
Image STAGE-gallery: wide backdrop behind the card-playing area. Landscape 3:2 (1536x1024). It will be cropped to a 4:1 strip through the middle, so keep everything important between 35% and 65% of the height. The centre must stay fairly dark and plain, because game cards will be placed on top of it; no people in the centre.
Pixel density: as if drawn at about 384x256 pixels and scaled up 4x.

A pristine white-cube gallery in the Sky District: white walls, track spotlights forming cones of light, three abstract paintings in thin frames hung far apart, a red velvet rope barrier. Cold, expensive, intimidating. Keep the middle of the wall dimmer than the edges.
Same art style, palette and no-text rule.
```

##### STAGE-ufo 外星評審　`stage-ufo.png`

```
Image STAGE-ufo: wide backdrop behind the card-playing area. Landscape 3:2 (1536x1024). It will be cropped to a 4:1 strip through the middle, so keep everything important between 35% and 65% of the height. The centre must stay fairly dark and plain, because game cards will be placed on top of it; no people in the centre.
Pixel density: as if drawn at about 384x256 pixels and scaled up 4x.

The judging chamber inside the alien mothership: curved, ribbed metal walls, a tractor-beam core glowing pale green at the top centre, floating holographic consoles, and at the far left and far right, alien judges in suits seated behind a long curved bench, looking down. Eerie and corporate.
Same art style, palette and no-text rule.
```

#### 出國明信片（6 張，取代通用的 DAY-trip）
用途：稀有生活卡「出國：X」。2080 年全世界都淹了水，每個地方都有一部分在水下。

開頭共用（每張都貼上這三行，再加該張的內容）：

```
Image TRIP-<region>: travel postcard illustration for the rare "Go Abroad" day card. Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle.
Pixel density: chunky, as if drawn at about 192x128 pixels and scaled up 8x.
In the world of 2080 every place is partly flooded.
```

| 檔名 | 地區 | 內容（接在共用開頭之後） |
|---|---|---|
| `trip-asia.png` | 亞洲 | `A drowned neon megacity street in East Asia: shrine gates and temple roofs standing in the water, paper lanterns, a noodle stall on a raft, cherry blossoms drifting. Same art style, palette and no-text rule.` |
| `trip-europe.png` | 歐洲 | `A sunken canal city with gothic palaces and domes flooded up to their windows, gondolas drifting between them at sunset. Same art style, palette and no-text rule.` |
| `trip-america.png` | 美洲 | `The tops of giant skyscrapers rising out of the sea like islands, a broken suspension bridge, seagulls, a rusty giant statue's raised torch far away. Same art style, palette and no-text rule.` |
| `trip-africa.png` | 非洲 | `Ancient pyramids rising from a flooded desert, small sailing boats gliding between them, a warm dust haze. Same art style, palette and no-text rule.` |
| `trip-arctic.png` | 北極 | `The entrance of a seed vault in the snow under a green aurora, melting glacier cliffs crashing into the sea, a lone polar bear on an ice floe. Same art style, palette and no-text rule.` |
| `trip-ocean.png` | 大洋 | `Giant stone head statues standing waist-deep in the rising ocean on a lonely island at sunset, a small boat approaching. Same art style, palette and no-text rule.` |

#### KA-03 全景　`ka-03-panorama.png`
用途：Steam 收藏庫大圖（3840×1240，規定不可以有字）、標題畫面背景。

```
Image KA-03: wide panorama. Landscape 3:2 (1536x1024), but it will be cropped to a very wide 3:1 strip through the middle, so put everything important between 30% and 70% of the height; the top and bottom should be simple sky and water.
Pixel density: as if drawn at about 384x256 pixels and scaled up 4x.

A sweeping night panorama of the flooded Floating City: dozens of old tenement towers and high-rises standing in the sea, footbridges between them, neon signs (abstract shapes only), laundry and air-conditioner boxes, boats moored to windows; the white Sky District platforms floating above on the right; three corporate flying saucers sweeping searchlight beams across the city. No single character in focus; the city itself is the subject. Calm, wide and atmospheric, slightly darker in the centre so that a logo can sit on top.
Same art style, palette and no-text rule.
```

#### ICON 遊戲圖示　`icon.png`
用途：Steam 社群圖示（184×184）、網頁圖示。

```
Image ICON: game icon. Square 1:1 (1024x1024), transparent background (if transparency is not possible, use plain flat #0d1020).
Pixel density: very chunky, as if drawn at 32x32 pixels and scaled up 32x, so it reads at tiny sizes.

A single lit apartment window at night with a tiny figure working at a desk inside; a cone of white alien searchlight shines down on it from the top; a few golden sparks rise. Bold, simple shapes and maximum contrast.
Same palette and no-text rule.
```

#### 另外三個結局
`END-perfect` 是「被選中」的變化（靈魂很輕的時候）；`END-grey`、`END-ordinary` 只在舊模式出現。

```
Image END-perfect: ending illustration, same office and same framing as image END-agent. Landscape 3:2 (1536x1024), cropped to 16:9 through the middle.
Pixel density: as if drawn at about 384x256 pixels and scaled up 4x.

The same alien office as END-agent, but colder and almost monochrome. The protagonist's skin has turned faintly grey, their eyes are flat, and they wear exactly the same standard smile as the aliens, stamping red cross marks onto human files at machine speed. Above their head floats a tiny white feather, all that is left of their soul. Mood: chilling satire.
Same art style, palette and no-text rule.
```

```
Image END-grey: ending illustration. Landscape 3:2 (1536x1024), cropped to 16:9 through the middle.
Pixel density: as if drawn at about 384x256 pixels and scaled up 4x.

A night office full of identical cubicles where workers label images on monitors (cats, traffic lights). The protagonist sits perfectly upright in profile, completely grey like a stone statue (skin, clothes, hair), eyes empty, clicking mechanically. The whole picture is greyscale except for the cold monitor glow and one tiny, dim pink spark on the desk. Mood: the quiet horror of efficiency.
Same art style and no-text rule.
```

```
Image END-ordinary: ending illustration. Landscape 3:2 (1536x1024), cropped to 16:9 through the middle.
Pixel density: as if drawn at about 384x256 pixels and scaled up 4x. Show the protagonist only from behind.

Dawn on a rooftop garden above the flooded city. The protagonist sits on a plastic stool with a cup of tea among potted vegetables; their drawings and poems hang drying on the laundry lines like clothes. Far away, the alien saucers fly off into the sunrise without them. The water has risen, but the morning light is gentle and golden. Mood: bittersweet; they were not chosen, but they survived and kept creating.
Same art style, palette and no-text rule.
```

---

## 六、收到圖之後（Claude）

1. **檢查**：文字、亂碼、手指、風格是否一致、構圖能不能裁切。不合格的列出來請你重做。
2. **像素化**：縮到原生像素、減色、對齊色票；人物頭像和素材包去背。原圖不放進遊戲。
3. **美術整合工單**（暫定 WO-15-11，排在 WO-15-08 之後，交給 Gemini）：
   - 生活卡的卡頂橫幅（同時保證 WO-15-08 的「桌面第一屏看到三張卡」）；
   - 朋友頭像放進朋友卡和聊天視窗；
   - 結局插圖放在「人類樣本檔案」頂部；
   - 市集橫幅、素材包、篩選日插圖、徽章；
   - 手機版面、減少動態效果；單一 HTML 的大小上限改為 2.5 MB。
4. **Steam**：遊戲名稱標誌由我用遊戲標題的字型做成透明 PNG，再和主視覺合成各種尺寸（2024 年起的要求是：頁首 920×430、小 462×174、主要 1232×706、直式 748×896、收藏庫 600×900、收藏庫大圖 3840×1240、標誌 1280×720；上傳時以 Steamworks 的最新說明為準）。

## 七、注意事項

- **Steam 要申報 AI 內容**：Steam 規定上架時在「內容調查」申報 AI 生成的內容（預先生成的美術可以使用，但要寫明）。
- **版權**：完全由 AI 生成的圖，在部分地區未必受版權保護；經過人手修改（像素化、修圖、合成）會比較穩妥。商業用途以 ChatGPT 當時的使用條款為準。
- **不要在 prompt 加入其他遊戲或在世畫家的名字**：避免模仿特定作品引起爭議；上面的 prompt 只描述風格（16-bit、超任年代）。
- **插圖只負責氣氛**：規則和數字仍然由介面顯示，插圖上不放任何資訊（符合「資訊量克制」的原則）。

---

## 附錄：清單

| 批次 | 編號 | 檔名 | 比例 |
|---|---|---|---|
| 一 | KA-01 主視覺（橫） | `ka-01-landscape.png` | 3:2 |
| 二 | DAY-label、delivery、clinic、salvage、haggle、farm、smile、dive、busk、garden、volunteer、trip | `day-<id>.png` ×12 | 3:2 |
| 二 | FRIEND-ken、dj、ho、miu、fong、chan、yu、mary | `friend-<id>.png` ×8 | 1:1 |
| 三 | END-archived、heavy、death、guardian、agent、returned | `end-<id>.png` ×6 | 3:2 |
| 三 | KA-02 主視覺（直） | `ka-02-portrait.png` | 2:3 |
| 四 | SCENE-market、SCENE-review | `scene-market.png`、`scene-review.png` | 3:2 |
| 四 | EMBLEM | `emblem.png` | 1:1 |
| 四 | PACK-flood、sky、street、under、far | `pack-<id>.png` ×5 | 2:3 |
| 五 | STAGE-desk、hall、gallery、ufo | `stage-<id>.png` ×4 | 3:2 |
| 五 | TRIP-asia、europe、america、africa、arctic、ocean | `trip-<region>.png` ×6 | 3:2 |
| 五 | KA-03、ICON | `ka-03-panorama.png`、`icon.png` | 3:2、1:1 |
| 五 | END-perfect、grey、ordinary | `end-<id>.png` ×3 | 3:2 |

參考圖（`docs/art-prompts/ref/`）：

| 檔案 | 內容 |
|---|---|
| `ref-city-night.png` | 標題畫面的夜晚浮城（拿走了標題字） |
| `ref-city-dusk.png` | 熱浪季黃昏的浮城 |
| `ref-characters.png` | 20 個角色的半身像。第一行：前文案、救生員、程式員、街頭樂手、外賣潛水員、退休教師、過氣網紅、義體技師、夜班護士、動畫師；第二行：考古學家、天空區富二代、太空人、還俗僧人、古董商、灰人逃兵、章魚星人詩人、覺醒的 AI、時間旅人、蘑菇星交換生 |
| `ref-judges.png` | 19 位外星評審 |
| `ref-object-icons.png` | 40 件物件圖示 |
| `ref-palette.png` | 色票：第一行是十種情緒的顏色，第二行是介面和季節的顏色 |
