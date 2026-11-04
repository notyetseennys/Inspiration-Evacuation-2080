# 創作之夜的畫：美術素材規格（第七批，2026-11-04）

製作人的方向：

- 畫由製作人用 ChatGPT 生成大量、非常仔細的素材；
- 程式負責把素材組合成玩家的作品；
- 效果要非常有創作成份，令玩家有成功感。

這份文件說明四件事：素材怎樣變成玩家的畫、要生成甚麼、怎樣生成，以及收到之後怎樣處理。

**試做批已經完成（2026-11-04），可以大量生成。** 第五節記錄試做的結果，第六節是分期的全部清單。

---

## 一、玩家的畫是怎樣組成的

一晚最多四筆，畫面像舞台一樣分成五層，由後到前：

| 層 | 第幾筆 | 內容 | 由甚麼決定 |
|---|---|---|---|
| 天空 | 第一筆 | 整片天：顏色、時間、雲、月、日 | 第一筆的題材主調（10 種情緒各有天空） |
| 遠景 | 第一筆 | 地平線上的浮城剪影 | 第一筆的主調和配調 |
| 中景 | 第二筆 | 站在水上的建築和船：唐樓、燈塔、船、市集 | 每張素材的情緒 |
| 主角 | 第三筆 | 站在碼頭上的人和物：一家人、撐傘的人、機械人、糖水檔、霓虹招牌 | 每張素材的情緒；轉的那張是畫面焦點 |
| 前景和氣氛 | 第四筆 | 窗框、欄杆、燈串、光束 | 每張素材的情緒 |

程式負責下面幾件事：
- 加上光和動態：海面倒影、光暈、下雨、霓虹閃爍、煙、星星、波光。
- 按起承轉合決定位置和大小：
  - 起放在左邊；
  - 承依次往右；
  - 轉放大、放在三分線上、加聚光；
  - 合點亮燈火，令整幅畫亮起來。

**令玩家有成功感的設計**：打得越好，畫越豐富、越特別。

- **單一情緒的素材**：畫那種情緒的基本素材（每種情緒每層 3 個版本）。
- **兩種情緒的素材**（複合情緒）：換成專門的「小景」，例如：
  - 「雨夜霓虹」是霓虹招牌倒映在積水裏，一個人撐傘走過；
  - 「糖水舖」是 Mary 姐的糖水檔，一家人圍着吃。

  玩家會發現：組合有意思，畫面就會出現一個特別的故事。
- **完成評審的委託或具名組合**（名作）：作品頁出現一幅專門的「名作插畫」，收進作品集。
- **夥伴參與了這一晚**：夥伴在畫裏客串，例如 DJ 小妹在天台打碟、何伯在碼頭唸詩。
- **起承轉合完整**：作品配金框、加簽名；獨白配單色調的「藝術品」處理。

---

## 二、技術規格（每一張都要遵守）

1. **尺寸和比例**
   - 天空、遠景、碼頭、前景：橫 3:2（1536×1024）。
   - 中景、主角、小景、夥伴：方形（ChatGPT 現在出 1254×1254，可以）。
2. **背景**
   - 天空要畫滿整張。
   - 其他素材要**透明背景**；做不到透明，就用**純洋紅色 #FF00FF** 的背景，不要漸變、不要陰影，我會去背。
   - 洋紅色不可以出現在素材本身。
3. **視角**：一律是側面、平視，好像在海上的一條碼頭看過去，像舞台布景。不要俯視，不要魚眼。
4. **地面和底部**
   - 中景：建築或船的底部（水線）貼着圖的下邊，置中。
   - 主角和小景：人物的腳和物件的底部貼着圖的下邊，置中，四周留空，不要畫地面、陰影或倒影（程式會加）。
5. **大小**：主體盡量填滿畫面，細節越多越好。程式會按類別統一大小，所以不用理會比例。
6. **光**
   - 素材本身的燈要畫出來，窗、燈籠、招牌、火都要發亮。
   - 不要畫大片的光暈和光束（程式會加，而且會閃爍、會動）。
   - 除了天空，不要畫落下的雨或雪（程式會加會動的雨）。
   - 整體是夜晚，環境光微弱。
7. **風格**：16-bit 像素畫，方形像素在同一個格子上，最近鄰放大；沒有反鋸齒、沒有模糊、沒有筆觸、不要照片感、不要 3D。
8. **沒有任何文字**：沒有中英文字、數字、商標、水印、簽名。招牌只用圖形，例如碗、星、音符、心形、箭咀。

---

## 三、風格設定（每個新對話的第一則訊息）

用法：
- 開新對話，上載 `ref-city-night.png`、`ref-palette-v2.png`，再上載試做批裏你最滿意的一張，作為風格樣板。
- 貼上下面的設定。
- 之後一則訊息生一張。

```
I'm making a pixel-art game called "Inspiration Evacuation 2080". In each level the player creates an artwork, and the game assembles the player's painting from many separate pixel-art pieces that you will draw: sky backdrops, distant skylines, mid-ground buildings and boats, foreground characters and props. Every piece must fit the same stage, scale and lighting so that any combination looks like one hand-made painting.

WORLD
- 2080, "the Floating City": a fictional, flooded, Hong Kong-inspired vertical city at night. Old tenement towers on stilts stand in calm sea water; footbridges, air-conditioner boxes, laundry poles, rooftop water tanks, antennas, boats tied to windows, neon signs with pictograms only. No real landmarks.
- This painting is the one beautiful thing the player makes in a bleak city: lyrical, atmospheric, quietly moving. Not cute, not comedic.

STAGE (always the same)
- Side view at eye level, as if standing on a long wooden pier and looking out across the water. Like layered theatre scenery. No top-down, no fisheye, no strong perspective.
- For every piece except sky backdrops: transparent background, or a flat pure magenta #FF00FF background if transparency is impossible. The object's base (feet, hull, building waterline) touches the bottom edge, centred. No ground, no cast shadow, no reflection, no glow halos: the game adds those.
- Let the subject fill most of the frame with rich detail; the game rescales every piece.
- Do not paint falling rain or snow, except on sky backdrops (the game animates rain).

LIGHT
- Night. Weak ambient light from the sky. The piece's own light sources are visible and bright: lit windows, lanterns, lamps, fire, neon tubes. Do not paint large glow halos or light beams; the game adds them and animates them.

COLOUR = EMOTION
- The game has ten emotions, each with a colour: warmth #ff6b5e (coral), hope #9be36b (spring green), water #37c3d6 (sea cyan), memory #e8c25a (old gold), rebel #a78bfa (violet), machine #8e9bb0 (steel), guilt #a89a82 (ash), anger #e04646 (red), neon #ff4fb4 (neon pink), hunger #f0883e (orange).
- Each piece is mostly the muted night city (#0d1020, #151a2e, #26334d, #3a4256, #5a6478, rust #7a4a32, concrete #8a8f99) plus its emotion colour as the accent and light colour.

ART STYLE
- 16-bit pixel art, crisp square pixels on one consistent grid, nearest-neighbour scaling. No anti-aliasing, no blur, no painterly strokes, no photorealism, no 3D look. About 32 colours, light ordered dithering.
- Rich, careful detail: textures on concrete, rust stains, cables, potted plants, laundry, tiles, wooden planks, ropes. Detail must still read when the piece is shrunk to one fifth.
- Semi-realistic figures about six heads tall, simple faces (dot eyes), quiet poses. No anime or chibi features.

RULES
- No text of any kind: no letters, numbers, Chinese characters, logos, watermarks or signatures. Signs show only pictograms (bowl, star, musical note, heart, arrow, fish).
- One piece per image. Nothing else in the image.

Reply "OK" and wait for my first request.
```

---

## 四、Prompt 的格式

每一則訊息的格式如下，把「主體」換成第六節清單裏那一行英文：

```
Piece <檔名>: <類別說明>.
Subject: <清單裏的英文主體>
<結尾>
```

各類別的說明和結尾（直接複製）：

| 類別 | `<類別說明>` | `<結尾>` |
|---|---|---|
| 天空 | `sky backdrop, landscape 3:2 (1536x1024), fill the whole image, nothing below the horizon line at 60% from the top except dark calm sea` | `Same style, palette and lighting as set at the start. Fill the whole image: no transparency, no text.` |
| 遠景 | `distant skyline strip, landscape 3:2 (1536x1024), silhouettes along the bottom third only, transparent above` | 甲 |
| 中景 | `mid-ground piece standing in the water, square (1024x1024)` | 甲 |
| 主角 | `foreground piece standing on the pier, square (1024x1024)` | 甲 |
| 小景 | `special foreground vignette standing on the pier, square (1024x1024), a small story in one picture` | 甲 |
| 夥伴 | `cameo of a recurring character standing on the pier, square (1024x1024)` | 甲 |
| 碼頭 | `stage ground strip seen from the side, landscape 3:2 (1536x1024), only along the bottom fifth, its top surface a straight horizontal line, transparent above` | 甲 |
| 前景 | `foreground frame overlay, landscape 3:2 (1536x1024), only along the edges, transparent centre` | `Same style and lighting as set at the start (transparent or #FF00FF background, no text).` |

甲：`Same stage, scale, lighting and style as set at the start (transparent or #FF00FF background, base touching the bottom edge, no text).`

每張生兩、三次，揀最好的一張，按檔名存成 PNG。

---

## 五、試做批（已完成）

製作人在 2026-11-04 上載了 8 張，全部合格：

- **合格的地方**：
  - 真正透明的背景；
  - 風格統一，細節豐富；
  - 沒有文字，招牌只有圖形；
  - 底部貼着下邊。
- **跟規格不同、但沒有問題的地方**：
  - 正方形的圖是 1254×1254；
  - 主體填滿畫面，沒有照比例。

  程式會統一大小，所以第二節已經改為「主體盡量填滿畫面」。
- **組合測試**（`tools/art-night-preview.py`，960×600）：
  - 用 8 張組成「雨夜」和「黃昏的家」兩幅畫，以及「雨夜」逐筆長出來的四個階段。
  - 發光的地方由程式自動找出：窗、燈籠、霓虹、爐火。「合」之前燈未亮，「合」的一刻整幅畫亮起來。
  - 倒影、天空在水面的倒影、燈在水面的長影都由程式加上。
  - 統一減到 64 色會令霓虹褪色，所以**不做減色**，保留素材原本的顏色。
- **發現缺少的素材**：主角要站在碼頭上，所以第六節加入 3 張碼頭。

| 檔名 | 類別 | 主體 |
|---|---|---|
| `np-sky-water-1.png` | 天空 | a rainy night sky over the sea, low heavy clouds with faint moonlight breaking through, cool blue-grey, calm dark sea below the horizon |
| `np-sky-warmth-1.png` | 天空 | a warm dusk just after sunset, coral and violet bands above the horizon, first stars appearing, calm dark sea below |
| `np-far-old.png` | 遠景 | the old district of the Floating City: a long row of tenement towers on stilts, water tanks, antennas, a few warm lit windows, washing lines between buildings |
| `np-mid-warmth-1.png` | 中景 | a narrow old tenement tower on stilts in the water, many lit windows with families inside, laundry poles, air-conditioner boxes, potted plants on balconies |
| `np-mid-water-1.png` | 中景 | a small wooden sampan boat with a hanging lantern and a canvas roof, a fishing net drying on a pole |
| `np-focal-water-1.png` | 主角 | a lone adult in a long coat holding a red umbrella, walking, seen from the side |
| `np-focal-hunger-1.png` | 主角 | a tiny street food stall: a cook stirring a wok over fire, steam rising, stools, a hanging bulb, a stray cat waiting |
| `np-duo-water-neon.png` | 小景 | "neon after rain": a pink neon sign with a bowl pictogram on a pole, a big puddle at its base, a person with an umbrella stopping to look at the reflection |

---

## 六、全部清單

分兩期生成，每一期完成就可以放進原型：

| 期 | 內容 | 張數（已有） |
|---|---|---|
| 第一期 | 每一幅畫都用得着的基本素材：天空、遠景、碼頭、中景、主角 | 89（7） |
| 第二期 | 令畫更特別的素材：複合情緒小景、夥伴客串、前景 | 65（1） |
| 第三期 | 名作插畫 | 之後再寫 |

試做的 8 張已經包括在內，不用重做。

### 6.1 天空（第一期，20 張：每種情緒兩張）

檔名 `np-sky-<情緒>-<1|2>.png`；1 是平靜，2 是戲劇性。

| 情緒 | 1（平靜） | 2（戲劇性） |
|---|---|---|
| warmth 人情 | warm dusk after sunset, coral and violet bands, first stars | late golden evening, long pink clouds lit from below, a crescent moon |
| hope 希望 | pre-dawn, a pale green-gold glow rising at the horizon, last stars fading | sunrise breaking through clouds, beams of light over the sea, birds |
| water 水 | rainy night, low heavy clouds, faint moonlight | storm clearing, a huge moon in a hole in the clouds, rain curtains far away |
| memory 記憶 | sepia night like an old photograph, a large soft full moon | old film look, grainy sky, an old moon with a ring, faded stars |
| rebel 反叛 | violet night, searchlights from the city sweeping the clouds | thunderclouds lit violet from inside, many searchlights crossing |
| machine 機械 | smoggy teal night, factory haze, blinking aircraft warning lights | a sky full of tiny drones forming a grid of lights, cold steel clouds |
| guilt 愧疚 | overcast black night, no stars, one dim streetlight glow on the clouds | heavy fog over the sea, a single pale moon barely visible |
| anger 憤怒 | red night sky, glow of fires on the horizon, dark smoke | lightning storm, red clouds, sparks drifting in the air |
| neon 霓虹 | deep purple night, pink and cyan city glow on the clouds | giant holographic billboards projected on the clouds, magenta haze |
| hunger 飢餓 | pale grey night, a thin crescent moon, chimney smoke from the city | dull orange street-glow on low clouds, steam rising everywhere |

### 6.2 遠景（第一期，6 張）

檔名 `np-far-<區>.png`，程式按第一筆的情緒選用：

| 檔名 | 主體 | 用於 |
|---|---|---|
| `np-far-old` | （見試做批） | 人情、飢餓 |
| `np-far-neon` | the neon district: tall towers covered in pictogram neon signs, giant screens, dense lights | 霓虹、憤怒 |
| `np-far-industry` | the industrial edge: cranes, chimneys, container stacks, a power station, blinking red lights | 機械、反叛 |
| `np-far-sky` | the rich Sky District: white platforms floating above the city on pillars, clean glass towers, a few alien saucers parked | 希望 |
| `np-far-drowned` | the drowned old town: only the upper floors and rooftops above water, a temple roof, a clock tower | 記憶、水 |
| `np-far-ruin` | abandoned towers with dark windows, broken bridges, a single lit window | 愧疚 |

### 6.3 碼頭（第一期，3 張，新）

檔名 `np-stage-pier-<1|2|3>.png`。主角、小景和夥伴都站在碼頭上，每一幅畫用一張。

| 檔名 | 主體 |
|---|---|
| `np-stage-pier-1` | an old wooden pier deck seen from the side: worn planks, thick wooden posts going down into the water, a coiled rope, a wooden bollard |
| `np-stage-pier-2` | a concrete harbour edge seen from the side: chipped concrete, iron bollards, a rusty low railing, tyres hanging as fenders |
| `np-stage-pier-3` | a floating dock seen from the side: planks lashed on plastic barrels, ropes, a small lamp post, a bucket and a fishing net |

### 6.4 中景（第一期，30 張：每種情緒三個版本）

檔名 `np-mid-<情緒>-<1|2|3>.png`。

| 情緒 | 1 | 2 | 3 |
|---|---|---|---|
| warmth | （見試做批） | a ferry pier with paper lanterns and benches, people waiting | a rooftop garden on a short tower with string lights and a dinner table |
| hope | a red-and-white lighthouse on a concrete platform, its lamp glowing | a tall radio mast with a kite tied to it, small greenhouse at its base | a floating greenhouse barge full of plants and grow lights |
| water | （見試做批） | a cluster of three sampans tied together, laundry, a dog on the roof | a flooded bus stop with only the roof and the sign pole above water, a small boat moored |
| memory | an old cinema facade on stilts with a blank marquee, faded posters (pictograms only) | a half-submerged old tram with plants growing inside | a small temple roof with incense smoke and old lanterns |
| rebel | a concrete wall covered with abstract graffiti and banners on a barge | a pirate radio hut on stilts with antennas and a speaker horn | a barricade made of boats, doors and shopping trolleys |
| machine | a crane barge lifting a container, warning lights | a robot repair dock with robot parts hanging, sparks from a welder | a server tower with many blinking lights and cooling pipes |
| guilt | an abandoned hospital block with broken windows, one window lit | an empty playground on a platform, a single swing | a dark office tower with all lights off except one desk lamp |
| anger | a burning barge with black smoke | a riot shield wall of grey security drones hovering over the water | a factory with three tall chimneys and red smoke |
| neon | a narrow tower covered in pink and cyan pictogram neon signs | an arcade facade with flashing pictogram screens | a giant hologram fish projected above a tower roof |
| hunger | a row of floating food stall boats with awnings, steam, hanging bulbs | a noodle shop on stilts, steam from the windows, a queue on the footbridge | a soup kitchen barge with a long queue of tired people |

### 6.5 主角（第一期，30 張：每種情緒三個版本）

檔名 `np-focal-<情緒>-<1|2|3>.png`。

| 情緒 | 1 | 2 | 3 |
|---|---|---|---|
| warmth | a parent and child sharing one bowl of dessert on two stools | a grandmother teaching a child to fold a paper boat | two friends under one coat in the rain, laughing quietly |
| hope | a child flying a kite on a long string | a person releasing a paper lantern into the sky | an old man pointing at the stars for a small girl |
| water | （見試做批） | an old fisherman with a rod sitting on a bucket | a child jumping into a puddle in rain boots |
| memory | an elderly couple on a bench, one holding an old photo frame | a person playing an old record on a gramophone | a woman looking at a box of letters under a lamp |
| rebel | a hooded artist spraying an abstract mural (no text) | a person with a megaphone and a blank flag | a small punk band: drummer, guitarist, singer on crates |
| machine | a tall slightly creepy service robot with a cheerful screen face, holding an umbrella for no one | a courier with a stack of delivery drones landing around them | a cyborg repairing their own arm with a tiny screwdriver |
| guilt | a lone figure sitting at the end of the pier, head down | a person kneeling to place a flower at a small shrine | a figure standing under a single streetlight, hands in pockets |
| anger | a person kicking a broken vending machine | three people around a burning trash barrel | a worker throwing a hard hat to the ground |
| neon | a tall standalone neon sign on a pole with a heart pictogram | a karaoke booth with a flashing door and a silhouette singing inside | a livestreamer with a ring light filming themself |
| hunger | （見試做批） | a hungry child and a cat sharing a bun | a tired worker eating instant noodles from the cup, standing |

### 6.6 複合情緒的小景（第二期，45 張：全部兩種情緒的組合）

檔名 `np-duo-<情緒1>-<情緒2>.png`。兩種情緒按色輪次序排列：warmth、hope、water、memory、rebel、machine、guilt、anger、neon、hunger。

一張素材有兩種情緒時，畫面用它取代單一情緒的素材，是玩家「發現組合」的獎勵。每一張都要是一個小故事。
第四版的「改造素材」可以把任何兩種情緒放在同一張素材上，所以 45 種組合都會出現。名字來自 `proto/night4/engine.js` 的 `PAIRS`；標「新」的 13 張是這一版加的。
小景可以畫一小塊自己的地面（例如積水的路面），像試做的「雨夜霓虹」。

| 檔名 | 複合情緒 | 主體 |
|---|---|---|
| `np-duo-warmth-hope` | 守望 | two neighbours on facing balconies passing a lamp across on a rope |
| `np-duo-warmth-water` | 同舟 | strangers sharing one small boat, holding the side together |
| `np-duo-warmth-memory` | 思念 | a person holding an old family photo under a warm lamp, the photo glowing faintly |
| `np-duo-warmth-rebel` | 同路人 | two friends painting the same mural together, one on the other's shoulders |
| `np-duo-warmth-machine` | 人機之間 | an old woman holding hands with a small robot, both looking at the sea |
| `np-duo-warmth-guilt` | 告解（新） | a grown child sitting with an elderly parent at a small table by a window, finally saying something hard, the parent's hand resting on theirs |
| `np-duo-warmth-anger` | 打抱不平 | a person stepping in front of a smaller one to shield them from a security drone |
| `np-duo-warmth-neon` | 夜歸人 | a tired worker walking home under neon signs, a child running to meet them |
| `np-duo-warmth-hunger` | 糖水舖 | a tiny dessert stall with bowls of sweet soup, a family of three sitting on stools |
| `np-duo-hope-water` | 雨後 | a child holding out a hand as the rain stops, a small rainbow above |
| `np-duo-hope-memory` | 初心 | a young person writing in a notebook on a crate, an old typewriter beside them |
| `np-duo-hope-rebel` | 起義 | a crowd silhouette raising lanterns together |
| `np-duo-hope-machine` | 機械人的夢 | a small robot sitting on the pier edge looking up at the stars, a paper kite in its hand |
| `np-duo-hope-guilt` | 贖罪（新） | a person quietly repainting a neighbour's damaged door at night, a small lamp at their feet |
| `np-duo-hope-anger` | 黑色幽默 | a clown-faced protest puppet with a forced smile, a person holding its strings and laughing |
| `np-duo-hope-neon` | 外星來信 | a person with an antenna on their roof receiving a glowing signal, pointing at a distant saucer |
| `np-duo-hope-hunger` | 飢餓藝術家 | a thin artist painting on a canvas with an empty bowl beside the easel |
| `np-duo-water-memory` | 舊城 | a swimmer diving towards a drowned old street sign under clear water (cutaway view) |
| `np-duo-water-rebel` | 逆流（新） | a person rowing a small boat hard against high waves, the bow lifting, spray in the air |
| `np-duo-water-machine` | 生鏽 | a rusty half-sunken robot with fish swimming through its ribs |
| `np-duo-water-guilt` | 淚海（新） | a lone person standing knee-deep in dark water at the end of a broken pier, looking down at their own reflection |
| `np-duo-water-anger` | 水火 | a burning boat on the water and a person pouring a bucket of sea water on it |
| `np-duo-water-neon` | 雨夜霓虹 | （見試做批） |
| `np-duo-water-hunger` | 漁火 | a night fishing boat with bright lamps attracting fish, two fishermen |
| `np-duo-memory-rebel` | 翻案 | a person pasting old photos over a corporate poster |
| `np-duo-memory-machine` | 存檔 | a person plugging an old hard drive into a robot's chest, memories shown as small glowing pictures |
| `np-duo-memory-guilt` | 懺悔 | a person reading a letter at an old post box, shoulders shaking |
| `np-duo-memory-anger` | 舊恨 | a person tearing up an old photo, pieces flying in the wind |
| `np-duo-memory-neon` | 今昔 | an old tea-house facade with a new giant neon sign bolted on top of it |
| `np-duo-memory-hunger` | 古早味 | a grandmother cooking an old dish on a clay stove, a child watching |
| `np-duo-rebel-machine` | 罷工 | a row of factory robots sitting down with their tools on the ground, one holding a blank sign |
| `np-duo-rebel-guilt` | 逃兵（新） | a person with a backpack walking away down the pier, looking back over their shoulder at a lit mural behind them |
| `np-duo-rebel-anger` | 抗爭（新） | a small crowd holding blank placards and umbrellas against the wind, one person shouting into a megaphone |
| `np-duo-rebel-neon` | 塗鴉 | a person spraying over a neon advertisement, paint dripping |
| `np-duo-rebel-hunger` | 革命（新） | people sharing bread from a hand cart behind a barricade of crates, one person raising a loaf like a flag |
| `np-duo-machine-guilt` | 被取代（新） | an empty office chair with a worker's coat still hanging on it, beside a desk where a sleek robot now works |
| `np-duo-machine-anger` | 暴走 | a malfunctioning delivery robot spinning, sparks and packages flying |
| `np-duo-machine-neon` | 霓虹電路 | a street technician on a ladder fixing a tangle of neon tubes and cables |
| `np-duo-machine-hunger` | 生產線（新） | tired workers at a small conveyor belt packing food boxes under harsh white lights |
| `np-duo-guilt-anger` | 罪與罰（新） | a person in a narrow alley with bandaged knuckles leaning their forehead on a cracked wall, their shadow huge behind them |
| `np-duo-guilt-neon` | 宿醉（新） | the morning after: a person slumped on a bench under switched-off neon signs, an empty bottle, pale dawn light |
| `np-duo-guilt-hunger` | 施捨（新） | a person quietly leaving a bowl of rice and chopsticks beside a sleeping homeless person |
| `np-duo-anger-neon` | 怒火 | a person throwing a bottle at a giant smiling neon mascot sign |
| `np-duo-anger-hunger` | 交租日（新） | a person counting coins at an open door, a stern landlord silhouette in the doorway, an empty rice bag on the floor |
| `np-duo-neon-hunger` | 夜市 | a busy little night-market stall with skewers, neon pictogram sign, steam |

### 6.7 夥伴客串（第二期，8 張）

檔名 `np-mate-<id>.png`。夥伴這一晚有參與，就會在畫裏出現。

| 檔名 | 夥伴 | 主體 |
|---|---|---|
| `np-mate-dj` | 天台 DJ 小妹 | a young woman DJ at a small turntable rig on a crate, headphones on one ear, cables |
| `np-mate-ho` | 寫詩的何伯 | an old man in a cardigan reading a poem aloud from a notebook, one hand raised |
| `np-mate-ken` | 畫壁畫的阿 Ken | a muralist on a stepladder with a spray can and a bucket of brushes |
| `np-mate-miu` | 改裝機械人的 Miu | a young engineer with goggles and a small modified robot cat on her shoulder |
| `np-mate-fong` | 唱粵劇的芳姐 | a middle-aged woman in a simple Cantonese opera costume singing, sleeves flowing |
| `np-mate-chan` | 修船的老陳 | an old boat repairman sanding a wooden hull, a toolbox and lantern |
| `np-mate-yu` | 寫歌的小雨 | a young songwriter with an acoustic guitar sitting on a stool |
| `np-mate-mary` | 開糖水舖的 Mary 姐 | a cheerful woman in an apron holding a tray of dessert bowls |

### 6.8 前景（第二期，12 張）

檔名 `np-front-<名>.png`，只畫在四邊，中間透明。

| 檔名 | 主體 |
|---|---|
| `np-front-window` | the inside edges of an old window frame with peeling paint and a potted plant on the sill |
| `np-front-rainglass` | rain-streaked glass edges of a window, water drops (centre clear) |
| `np-front-balcony` | an iron balcony railing along the bottom with hanging plants and a bicycle |
| `np-front-lanterns` | a string of paper lanterns across the top edge |
| `np-front-laundry` | laundry lines with shirts across the top corners |
| `np-front-cables` | tangled power cables and a lamp across the top |
| `np-front-leaves` | leaves of a banyan tree hanging from the top corners |
| `np-front-boat` | the bow of a wooden boat and a rope along the bottom-left |
| `np-front-neonframe` | thin neon tube shapes along the edges (pink and cyan) |
| `np-front-curtain` | a heavy theatre curtain at both sides, slightly open |
| `np-front-crowd` | silhouettes of the backs of an audience's heads along the bottom |
| `np-front-frame-gold` | an ornate golden picture frame around the whole image (for masterpieces) |

### 6.9 名作插畫（第三期，之後再寫）

一共 58 個具名組合，例如《地下樂隊》《浮城日記》《水淹童年》。每個組合一張完整的插畫，橫 3:2，作為名作的獎勵和收藏。這一批等第一至七類的素材確定之後才做，到時再寫 prompt。

---

## 七、上載

- 存成 PNG，按清單的檔名命名。
- 上載到 `main` 分支的 `art-src/night/` 資料夾（和之前一樣，直接上載到 GitHub）。

## 八、收到之後（Claude）

試做批已經用 `tools/art-night-preview.py` 跑過一次。處理的方法：

1. **去背**：透明背景直接用；洋紅色背景按色鍵去背。透明度只分有和無，令邊緣保持像素的乾淨。
2. **裁切和縮放**：
   - 裁到主體的範圍，按類別縮到統一的高度。在 960×600 的畫布上：遠景 70 px（另一排更遠的 48 px），唐樓 250 px，船寬 190 px，人物約 236 px，小景約 300 px。
   - 縮小用 Lanczos 濾波；**不減色**，因為統一減到 64 色會令霓虹褪色。
3. **舞台**：
   - 天空的地平線在 60%（y = 362）；
   - 遠景貼着地平線，混入天色（霧）；
   - 中景站在水上；
   - 主角站在碼頭上（y = 566 以下）。
4. **光**：
   - 自動找出發光的像素：亮、有顏色、夠光；或者接近白色。
   - 發光的地方用兩層模糊做光暈，以 screen 疊上；燈在水面拉成長影。
   - 「合」之前發光的像素調暗（燈未亮），「合」的一刻整幅畫亮起來。
5. **倒影**：
   - 中景和遠景在水面有倒影：翻轉、調暗、越遠越淡；
   - 地平線附近的天色也倒映在水面。
6. **會動**：分成背景（天和水）、前景（物件和碼頭）和發光三層輸出。網頁按行移動水面做水波，發光層閃爍，再加雨和蒸氣。
7. **之後**：把這套做法搬進原型的 `painter.js`，並輸出素材清單 `night-art.json`，記錄每一張的底部錨點、大小和發光區。
