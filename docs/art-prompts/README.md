# 美術盤點與生圖 prompt（第二版：黑色幽默）

> 給製作人。最後更新：2026-11-01。
> 用途：用 ChatGPT 生成遊戲缺少的插圖。收到圖之後，由 Claude 處理成像素圖，再寫成美術整合工單交給 Gemini。
> **第二版**：第一版試做的 5 張圖畫工很好，但語氣太可愛、太溫馨。這一版加入「黑色幽默的畫法」，重寫了風格設定和全部 prompt（第一版在 git 歷史裡）。
> 參考圖在 `docs/art-prompts/ref/`（由遊戲直接截取，沒有文字）。

---

## 一、現在的美術

遊戲裡**沒有任何圖片檔**：全部畫面都是程式畫的。美術任務書 `docs/GEMINI_BRIEF.md` 規定「沒有外部素材」，只有你提供的背景音樂是例外。

**已經完成，不需要重畫**：
- 121 件物件圖示、20 個角色半身像、19 位外星評審（像素字串）；
- 素材卡的五種卡面、計分演出、11 個小遊戲；
- 浮城（天氣、水位、探射燈、朋友的窗）、創作桌的四個場景（CSS）；
- 房間、地圖、30 個目的地只在舊模式出現（五輪模式會藏起來），不值得再投資。

**缺口**（按每局看到的次數排列）：
1. 生活卡只有文字：五輪模式每天最重要的決定，一局要選 15 次。
2. 8 位朋友沒有臉：朋友卡和聊天視窗只有名字和對話泡泡。
3. 市集、素材包、篩選日（第十五期的新畫面）沒有圖。
4. 結局沒有插圖；設計大綱說結局和死亡畫面是玩家截圖分享的主要來源。
5. 沒有主視覺和標誌：路線圖的下一步是 Steam 頁面和 Next Fest。

**限制**：單一 HTML 檔現在 1.58 MB，已經超過任務書的 1.5 MB 上限。每張圖收到之後由我縮到遊戲的原生像素（結局和場景 320×180、生活卡約 160×80、頭像 64×64）、減到約 32 色；處理後每張約 2 至 20 KB，全部約 300 KB。上限要改為 2.5 MB，而且圖片要像背景音樂一樣成為「沒有外部素材」的例外（等你決定）。

---

## 二、第一版試做的檢討

你用第一版 prompt 生成了主視覺 KA-01 和四張生活卡（標註、外送、義體診所、拆樓）。

**做得好**：
- 世界觀對：淹水的唐樓、天空區、霓虹、外星飛碟、水底的舊城。
- 畫工和構圖的水準很高，顏色大致在色票之內。
- 縮到遊戲的原生像素之後（KA-01 縮到 320×180、32 色），意外地很接近遊戲現在的畫風。

**不適合的地方**：
1. **語氣不對**：可愛、溫馨、熱鬧，像療癒系遊戲。外星人是可愛的綠色小人；人物是動漫表情（張口大叫、汗滴、閃光、瞇眼笑）。遊戲的文字是冷面的官僚式笑話（例如死亡結局：「標註過 53 張圖片，最後倒在螢幕前。螢幕還在問：『這是貓嗎？』」），圖和文字不同調。
2. **沒有笑位**：四張生活卡只是把工作畫出來。外送那張是熱血的追逐，不是「外賣乾了，外送員濕了」那種反差。
3. **主角被固定成前文案**（眼鏡、紅領帶）：KA-01 是風格樣板，ChatGPT 之後每張都沿用了他；但玩家可以是 20 個角色之一。
4. **太熱鬧**：生活卡在遊戲裡只有約 160×80 像素。縮小之後，臉和小道具全部糊掉；笑位要靠大形狀和構圖，不能靠表情。
5. **背景出現了真實地標**（中銀大廈的輪廓）。浮城是虛構的城市，第二十期還要做其他城市，所以這一版加了「不畫真實地標」。想保留香港的地標，刪掉風格設定裡的「Do not draw real landmarks.」就可以。

---

## 三、黑色幽默的畫法

設計大綱對文字的要求是「冷面笑匠，用平淡的語氣講慘事，精華在最後一句」。畫面照同一個原則：

1. **一張圖，一個笑位**：企業光鮮的表面（吉祥物、笑容、霓虹廣告、五星評分、天空區的奢華）對比人的處境（疲倦、水浸、被取代、被標價）。每張 prompt 都先寫明「Visual joke」。
2. **冷面**：人物不誇張，表情平淡、疲倦，或者是職業假笑；構圖平穩，像監控鏡頭或證件照，荒謬的事安靜地發生。
3. **顏色有意思**：城市和人是灰藍色、鏽色、日光燈的病態白；**只有企業和有錢人有霓虹色**；暖色燈光只留給真正的人情（朋友、義工、守護者結局）。
4. **主角是可以替換的普通人**：灰色連帽衫、掛着空白的工作證、黑眼圈、面無表情，不畫髮型和配飾。玩家可以是 20 個角色之一；而且在這個城市，每個人都可以被替換。
5. **不可愛**：不要 Q 版、汗滴、閃光、腮紅、大眼睛、張口大叫。只有企業吉祥物是可愛的：越可愛，越恐怖。

---

## 四、要生成甚麼

| 次序 | 內容 | 張數 | 用在哪裡 |
|---|---|---|---|
| **試做** | KA-01 主視覺（橫）、DAY-label、DAY-delivery | 3 | 確認新風格；KA-01 之後作為風格樣板 |
| 第二批 | 其餘 10 張生活卡、8 張朋友頭像 | 18 | 白天的三張卡、朋友卡、聊天視窗 |
| 第三批 | 結局 6 張、主視覺（直）KA-02 | 7 | 「人類樣本檔案」頂部；Steam 直式圖 |
| 第四批 | 素材包 5 個、市集、篩選日、徽章 | 8 | 市集（WO-15-07）、篩選日（WO-15-08）、檔案和備忘錄 |
| 第五批（選做） | 創作桌場景 4 張、出國明信片 6 張、全景 KA-03、圖示、另外 3 個結局 | 15 | 創作桌、出國卡、Steam 收藏庫 |

核心 36 張，選做 15 張。放進遊戲的工單排在 WO-15-08 之後。

**不建議生成**：物件圖示、角色半身像、外星評審（已經完整）；舊模式的房間、地圖、目的地；任何帶文字的東西（遊戲名稱標誌由我用遊戲的字型做，因為中文字 ChatGPT 會寫錯）。

---

## 五、怎樣用 ChatGPT 生圖

1. **開一個新對話**，不要沿用第一版的對話，否則會延續可愛的風格。上載 `ref-city-night.png`、`ref-characters.png`、`ref-palette-v2.png`（第二版的色票，比遊戲現在的色票灰暗），貼上第六節的「風格設定」。有外星人的圖再加上 `ref-judges.png`。
2. **先做試做的三張**，傳給我看。三張都對了，KA-01 就成為風格樣板：之後每個新對話都把它和參考圖一起上載，並說「Match the style and tone of KA-01.」。
3. 一則訊息只生一張圖：貼上該張的 prompt 就可以。
4. **檢查笑位**：每張的中文說明寫了「笑位」。縮成小圖之後仍然一眼看出笑位，才算合格。
5. 出現文字或亂碼，回覆「Remove all text.」；又變回可愛，回覆「Too cute. Make it deadpan and bleaker; keep the composition.」。
6. 透明背景（素材包、徽章、圖示）做不到的話，純色背景也可以，我會去背。
7. 按清單的檔名存成 PNG，直接在這個對話上載。
8. 每張生兩、三次，揀最好的一張。縮成像素之後細節會消失，構圖、笑位和色彩才是重點。

---

## 六、風格設定（每個新對話的第一則訊息）

```
I'm making a pixel-art game called "Inspiration Evacuation 2080": a deadpan black comedy about a flooded city where aliens recruit "inspired" humans the way a corporate HR department hires staff. For every image in this conversation, follow this art direction exactly.

TONE: DEADPAN BLACK COMEDY
- Bleak bureaucratic satire, never cosy or cute. Every image tells ONE visual joke: an ironic contrast between cheerful corporate surfaces (mascots, smiles, neon ads, star ratings, Sky District luxury) and grim human reality (exhaustion, flooding, being replaced, being priced).
- Humans look tired, resigned and blank, or wear forced customer-service smiles. Nobody shouts, nobody cries comically. Absurd or sad things happen quietly.
- Calm, static compositions, often frontal and symmetrical, like a security-camera still or an ID photo.
- The joke must read from big shapes and silhouettes alone, even as a tiny thumbnail. Never rely on small facial details.

COLOUR MEANS SOMETHING
- The city and its people are muted: grey-blue, slate, rust, damp concrete, sickly fluorescent white-green.
- Saturated neon pink, cyan and gold belong ONLY to corporations and the rich: advertising, mascots, alien saucers, Sky District luxury, rating stars.
- Warm lamp light (orange, coral) is reserved for genuine human kindness.

ART STYLE
- 16-bit pixel art with crisp square pixels on one consistent grid, scaled up with nearest-neighbour. No anti-aliasing, no blur, no painterly strokes, no photorealism, no 3D look.
- About 24 colours, mostly dark and desaturated; flat areas, light ordered dithering.
- Semi-realistic small figures (about six heads tall) with simple faces: dot eyes, small mouths, heavy eyelids. Absolutely no anime or chibi features: no sweat drops, sparkles, blush marks, big shiny eyes, wide shouting mouths or speed lines. Only corporate mascots are cute; the cuter, the creepier.
- Simple compositions: one main subject, a few big props, plenty of dark negative space. Less busy than a typical pixel-art illustration.

WORLD
- 2080. "The Floating City": a fictional, flooded, Hong Kong-inspired vertical city. Do not draw real landmarks. Old tenement towers stand in sea water; footbridges, concrete flyovers, air-conditioner boxes, laundry poles, boats tied to windows. The rich "Sky District" floats above on white platforms. The lower the floor, the poorer and wetter.
- The aliens of the "Interstellar Talent Development Bureau" look like HR staff: grey skin, identical neat suits, ID lanyards, clipboards, identical fixed smiles. Their white saucers sweep the city with searchlights at night.
- THE EVERYMAN (whenever the protagonist appears): an anonymous adult of indeterminate gender in a faded grey hoodie, with a lanyard holding a blank ID card, dark circles under the eyes and a completely deadpan face. No distinctive hair or accessories, because in this city everyone is replaceable.

PALETTE (anchors)
- World: #0d1020, #151a2e, #26334d, #3a4256, #5a6478, rust #7a4a32, concrete #8a8f99, fluorescent #d9e8d0
- Water: #0b2a3a, #1f5c66
- Corporations and the rich only: neon pink #ff4fb4, cyan #37c3d6, gold #ffd36b, lime #9be36b
- Genuine warmth only: lamp orange #e8a85a, coral #ff6b5e

RULES
- No text of any kind: no letters, numbers, Chinese characters, logos, watermarks or signatures. Signs, screens and papers show only abstract shapes and symbols (arrows, stars, smiley faces, bars, a red cross, a green tick).
- No frame or border unless I ask.
- The attached screenshots show the current game. Match their palette and simplicity, but make the mood bleaker and the humour darker.

Reply "OK" and wait for my first image request.
```

---

## 七、Prompt

每一段 prompt 都是完整的一則訊息，直接複製貼上。

### 試做（3 張）

#### KA-01 主視覺（橫）　`ka-01-landscape.png`
用途：Steam 主要圖和頁首圖、標題畫面；之後所有圖的風格樣板。左邊留空放遊戲名稱。
笑位：全城在為世界末日「面試」。每個窗口都有人像求職一樣舉起自己的作品，希望被外星人選中；水繼續上升，天空區的有錢人把垃圾倒下來。

```
Image KA-01: game key art. Landscape 3:2 (1536x1024).

Visual joke: the whole city is auditioning for the apocalypse. In every window, someone holds their art up to the alien searchlight like a job applicant, hoping to be evacuated, while the water keeps rising.

Scene: night, rain. Centre-right, a crumbling tenement tower stands in flood water, cut away like a dollhouse so we can see into every flat. In each flat a tired resident holds something up towards the sky: a painting, a poem, a guitar, a sculpture made of junk, a child's drawing. On the flooded lowest floor, residents stand on their tables, still holding their work above the water. Above, a sleek white saucer hovers; in its lit window, grey alien HR officers with identical smiles hold clipboards and stopwatches. Its searchlight ends in a thin red scanning line, like a supermarket barcode scanner, and the line has just stopped on one middle-floor window, where the Everyman sits at a desk and, deadpan, holds up a single sheet of paper. At the top, on a white Sky District terrace, rich residents sip drinks and casually tip their rubbish over the edge onto the tower. Under the water: the drowned old town and a sunken billboard of a smiling real-estate mascot.

Composition: keep the left third calm and dark (night sky, distant towers) as space for the game logo, which I will add later.
Same rules as set at the start.
```

#### DAY-label AI 數據標註　`day-label.png`
笑位：你在訓練取代你的 AI，而它已經掛上了你的工作證；保安拿着空紙箱在等你。

```
Image DAY-label: illustration for a "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: you are training your replacement, and it already wears your lanyard.

Scene: a grim open-plan labelling office under flickering fluorescent tubes. In the foreground, the Everyman clicks through photos of cats on an old monitor (green tick, red cross). In the next chair, a cheerful white robot with a smiling screen-face copies every click and already wears the Everyman's lanyard. On the wall, a huge bright poster of the same robot giving a thumbs-up. Behind them, a security guard waits patiently, holding an empty cardboard box.
Same rules as set at the start.
```

#### DAY-delivery 外送潛水　`day-delivery.png`
笑位：外賣是乾的，外送員不是；客人連頭也不抬，只給一粒星。

```
Image DAY-delivery: illustration for a "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: the food arrives dry; the courier does not.

Scene: a flooded neon street at night. The courier's little boat has sunk; the Everyman, in a yellow delivery helmet, stands chest-deep in the water, holding the insulated food bag perfectly dry above their head with both arms. From a high window, the customer lowers a basket on a rope without looking up from their phone; the phone shows a single star. A gleaming white Sky District speedboat roars past, and its wake washes over the courier's blank face.
Same rules as set at the start.
```

### 第二批：其餘生活卡（10 張）

用途：白天三選一的卡頂橫幅。會從中間裁成 2:1，在遊戲裡顯示得很小。

#### DAY-clinic 黑市義體診所　`day-clinic.png`
笑位：免費的義肢，只是會播廣告；你原本的手臂放在架上待售。

```
Image DAY-clinic: illustration for a "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: the prosthetic arm is free; it just shows advertisements.

Scene: a back-alley cybernetics clinic. The Everyman sits in a cracked dentist's chair, staring blankly ahead, while a bored technician screws on a free prosthetic arm covered in blinking neon advertising: a bright smiling mascot on the forearm and a band of scrolling symbols. On the shelf behind, the Everyman's original arm sits in a clear plastic display box with a price tag, like merchandise. A cheerful poster of a smiling robot doctor gives a thumbs-up.
Same rules as set at the start.
```

#### DAY-salvage 拆樓打撈　`day-salvage.png`
笑位：「空置」的舊樓其實有人住：一對老夫婦還在吃晚飯，平靜地看着鐵球。

```
Image DAY-salvage: illustration for a "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: the "abandoned" building is not empty.

Scene: a wrecking ball has just smashed a big hole in the wall of an old, half-flooded tenement. Through the hole we see a small flat where an elderly couple still sits at their dinner table, chopsticks frozen mid-air, calmly looking at the crane. Beside the building, a glossy developer billboard with a smiling mascot shows the luxury tower that will replace it. In the crane cab, the Everyman, in a hard hat, looks away and sips tea from a flask.
Same rules as set at the start.
```

#### DAY-haggle 夜市擺地攤　`day-haggle.png`
笑位：你把自己家的回憶賣給有錢人當擺設，對方還要殺價。

```
Image DAY-haggle: illustration for a "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: selling your own memories to the rich as kitsch, and being haggled down.

Scene: a night market under a concrete flyover. The Everyman sits on a low stool behind a mat of their own old belongings: a framed family photo (one person in it wears the same grey hoodie), a school bag, a mahjong set, a rice cooker. A rich Sky District tourist in spotless white, wearing a glowing VR visor, points at the family photo and holds up two fingers. The Everyman stares back without expression. Above them, a cheerful neon sign of a big downward arrow.
Same rules as set at the start.
```

#### DAY-farm 陰謀論內容農場（虧心）　`day-farm.png`
笑位：你為了點擊率偽造 UFO 照片；真的飛碟就在窗外，沒有人回頭。

```
Image DAY-farm: illustration for a "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: faking UFO photos for clicks while a real UFO hovers right outside, ignored.

Scene: a dim room crammed with racks of phones and screens showing giant red arrows, shocked cartoon faces and a blurry fake UFO photo. The Everyman, lit by sickly green screens, tapes a paper UFO onto a photograph. Behind them, through the window, a real alien saucer hovers silently, its searchlight shining into the room. Nobody turns around. A corkboard with red string connects random pictures.
Same rules as set at the start.
```

#### DAY-smile 企業情緒陪伴（虧心）　`day-smile.png`
笑位：笑容是制服：你舉着一個笑臉面具，手腕上的「笑容指數」滿格。

```
Image DAY-smile: illustration for a "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: the smile is part of the uniform.

Scene: a glossy Sky District lounge in gold and white. A rich client laughs at their own joke. The Everyman, working as a hired "emotional companion", pours wine with one hand and with the other holds a big, bright paper smile mask on a stick in front of their face; their real deadpan face shows at the edges. A smile-meter on their wrist glows full green. In the background, a row of other companions waits on a bench, all holding identical smile masks.
Same rules as set at the start.
```

#### DAY-dive 舊城潛水　`day-dive.png`
笑位：在自己童年的家裡打撈「遺物」。

```
Image DAY-dive: illustration for a "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: diving for "relics" in your own childhood home.

Scene: underwater in the drowned old town. The Everyman, in an old diving mask, swims slowly through a sunken living room: a family portrait still hangs on the wall, a fish swims out of an old TV screen, and on a child's bed a music box glows faintly. Outside the window, a sunken shopping-mall sign of a smiling mascot still flickers. Calm, teal, very quiet.
Same rules as set at the start.
```

#### DAY-busk 街頭表演　`day-busk.png`
笑位：唯一在聽的是一部機械人：它在錄你的歌，拿去訓練 AI。

```
Image DAY-busk: illustration for a "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: the only one listening is a robot recording your song to train an AI.

Scene: under a concrete flyover at night, the Everyman plays an acoustic guitar to a crowd that walks past staring at their phones. The only listeners are a stray cat and a small delivery robot that has stopped, its camera eye glowing red, recording. The open guitar case holds one coin and a takeaway menu.
Same rules as set at the start.
```

#### DAY-garden 天台菜園　`day-garden.png`
笑位：在有錢人的陰影裡種菜：全部盆栽擠在唯一一道陽光下。

```
Image DAY-garden: illustration for a "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: farming in the shadow of the rich.

Scene: a tenement rooftop garden in planters made from bathtubs and old fridges. Directly above, the underside of a Sky District platform blocks out the sun; a single narrow beam of sunlight falls through a drain hole, and the Everyman has crammed every pot into that one small patch of light. From the platform's edge, a rich resident absent-mindedly pours out a glass of water. A fat white pigeon walks off with the only ripe tomato.
Same rules as set at the start.
```

#### DAY-volunteer 到避難所做義工　`day-volunteer.png`
笑位：名人在拍照做善事；鏡頭一轉開，就把碗交還給你。

```
Image DAY-volunteer: illustration for a "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: charity as a photo opportunity.

Scene: a crowded flood shelter in an old school gym, camp beds in rows. In warm lamp light, the Everyman, in a plain volunteer vest, ladles soup for an old person and a child. Beside them, a Sky District celebrity in a spotless white suit holds up a bowl and flashes a perfect smile at a hovering camera drone, while their other hand is already handing the bowl back to the Everyman. Cold camera-flash light on the celebrity, warm light on everyone else.
Same rules as set at the start.
```

#### DAY-trip 出國（通用）　`day-trip.png`
笑位：所有乘客都戴着虛擬實境眼鏡看陽光海灘；只有你看着窗外淹水的世界。

```
Image DAY-trip: illustration for a rare "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: everyone flies over the drowning world while watching a sunny beach in VR.

Scene: inside a small aeroplane cabin. Through the oval window, the flooded Floating City shrinks away below. Every passenger wears a glowing VR visor showing a bright, sunny beach and ignores the window. Only the Everyman looks out of the window, holding a sketchbook.
Same rules as set at the start.
```

### 第二批（續）：朋友頭像（8 張）

用途：朋友卡、聊天視窗的對話頭像。朋友是遊戲裡真正的人情，所以用暖色燈光；但城市的生活在每個人身上留下一個黑色幽默的細節。

#### FRIEND-ken 畫壁畫的阿 Ken（教三色）　`friend-ken.png`
細節：被天空區保安打到一隻眼瘀黑，仍然滿足地笑。

```
Image FRIEND-ken: dialogue portrait of one of the protagonist's friends. Square 1:1 (1024x1024). Head and shoulders, three-quarter view, centred, on a plain flat dark navy background (#151a2e) with no scenery. Friends are drawn with real warmth (warm lamp-light colours), but city life shows in one darkly funny detail. Wry or deadpan expression, never anime.

Ah Ken, a street muralist in their late twenties: paint-splattered denim jacket, beanie, a spray can in one hand. Detail: a fresh black eye from the Sky District security guards, and a calm, satisfied half-smile.
Same rules as set at the start.
```

#### FRIEND-dj 天台 DJ 小妹（教四色）　`friend-dj.png`
細節：肩上搭着一條從天空區偷來的電線（金色插頭）。

```
Image FRIEND-dj: dialogue portrait of one of the protagonist's friends. Square 1:1 (1024x1024). Head and shoulders, three-quarter view, centred, on a plain flat dark navy background (#151a2e) with no scenery. Friends are drawn with real warmth (warm lamp-light colours), but city life shows in one darkly funny detail. Wry or deadpan expression, never anime.

Siu Mui, a rooftop DJ in her early twenties: neon-pink bob, huge headphones around her neck. Detail: a stolen power cable with a fancy gold Sky District plug draped over her shoulder; a bored, unimpressed stare.
Same rules as set at the start.
```

#### FRIEND-ho 寫詩的何伯（教單色）　`friend-ho.png`
細節：一手茶杯，一手滴着水的詩集。

```
Image FRIEND-ho: dialogue portrait of one of the protagonist's friends. Square 1:1 (1024x1024). Head and shoulders, three-quarter view, centred, on a plain flat dark navy background (#151a2e) with no scenery. Friends are drawn with real warmth (warm lamp-light colours), but city life shows in one darkly funny detail. Wry or deadpan expression, never anime.

Uncle Ho, an elderly poet (about 80) who has written poems for fifty years that nobody reads: thin white hair, round glasses, a faded cotton shirt. Detail: a chipped teacup in one hand and, in the other, a poetry notebook dripping with flood water; a wry, patient smile.
Same rules as set at the start.
```

#### FRIEND-miu 改裝機械人的 Miu（教互補）　`friend-miu.png`
細節：一隻眼換成了便宜的鏡頭；機械貓在咬 Miu 的頭髮。

```
Image FRIEND-miu: dialogue portrait of one of the protagonist's friends. Square 1:1 (1024x1024). Head and shoulders, three-quarter view, centred, on a plain flat dark navy background (#151a2e) with no scenery. Friends are drawn with real warmth (warm lamp-light colours), but city life shows in one darkly funny detail. Wry or deadpan expression, never anime.

Miu, a young robot tinkerer: welding goggles on the forehead, oil-stained overalls, short messy hair. Detail: one eye replaced by a cheap camera lens with a blinking red light, and a small mechanical cat on the shoulder chewing on Miu's hair; completely deadpan.
Same rules as set at the start.
```

#### FRIEND-fong 唱粵劇的芳姐（教全光譜）　`friend-fong.png`
細節：雨水令戲妝流下來，仍然保持莊嚴的身段。

```
Image FRIEND-fong: dialogue portrait of one of the protagonist's friends. Square 1:1 (1024x1024). Head and shoulders, three-quarter view, centred, on a plain flat dark navy background (#151a2e) with no scenery. Friends are drawn with real warmth (warm lamp-light colours), but city life shows in one darkly funny detail. Wry or deadpan expression, never anime.

Sister Fong, a Cantonese opera singer in her fifties: full opera make-up, a jewelled headdress, the collar of a red embroidered costume, a folding fan. Detail: the rain has made her make-up run down her cheeks, yet she holds a perfectly proud, dignified pose.
Same rules as set at the start.
```

#### FRIEND-chan 修船的老陳（教矛盾）　`friend-chan.png`
細節：救生衣是用膠樽綁成的。

```
Image FRIEND-chan: dialogue portrait of one of the protagonist's friends. Square 1:1 (1024x1024). Head and shoulders, three-quarter view, centred, on a plain flat dark navy background (#151a2e) with no scenery. Friends are drawn with real warmth (warm lamp-light colours), but city life shows in one darkly funny detail. Wry or deadpan expression, never anime.

Old Chan, a weather-beaten boat repairer in their sixties: a faded fisherman's cap, grey stubble, a big wrench over one shoulder. Detail: a homemade life jacket made of empty plastic bottles tied together with string; a gruff, unbothered look.
Same rules as set at the start.
```

#### FRIEND-yu 寫歌的小雨（教鄰近色）　`friend-yu.png`
細節：歌詞本每一行都劃掉了。

```
Image FRIEND-yu: dialogue portrait of one of the protagonist's friends. Square 1:1 (1024x1024). Head and shoulders, three-quarter view, centred, on a plain flat dark navy background (#151a2e) with no scenery. Friends are drawn with real warmth (warm lamp-light colours), but city life shows in one darkly funny detail. Wry or deadpan expression, never anime.

Siu Yu, a shy young songwriter (about 20): long dark hair over one eye, an oversized yellow raincoat, a guitar strap over one shoulder. Detail: holding up a lyric notebook in which every single line has been scribbled out; a tired, gentle half-smile.
Same rules as set at the start.
```

#### FRIEND-mary 開糖水舖的 Mary 姐（教分裂互補）　`friend-mary.png`
細節：水浸到胸口，仍然笑着遞上一碗紅豆沙。

```
Image FRIEND-mary: dialogue portrait of one of the protagonist's friends. Square 1:1 (1024x1024). Head and shoulders, three-quarter view, centred, on a plain flat dark navy background (#151a2e) with no scenery. Friends are drawn with real warmth (warm lamp-light colours), but city life shows in one darkly funny detail. Wry or deadpan expression, never anime.

Sister Mary, a plump dessert-shop owner (about 50): permed hair, an apron with a small embroidered mango. Detail: flood water has risen to her chest (a ripple line across the lower part of the portrait), and she is still holding out a steaming bowl of red bean soup with a cheerful, unbothered smile.
Same rules as set at the start.
```

### 第三批：結局（6 張）與主視覺（直）

用途：結局「人類樣本檔案」的頂部插圖，會裁成 16:9。笑話要苦，不要刻薄。

#### END-archived 人才庫（機會用完）　`end-archived.png`
笑位：你一生的作品，成了外星職員的杯墊。

```
Image END-archived: ending illustration. Landscape 3:2 (1536x1024); it will be cropped to 16:9 through the middle, so keep the top and bottom 8% free of important details. The humour should be bitter, never cruel.

Visual joke: your life's work ends up as an alien's coffee coaster.

Scene: the endless archive of the Interstellar Talent Development Bureau: identical filing cabinets vanish into the distance under cold light. A grey alien clerk with a fixed smile files a thin folder, with a small photo of the Everyman clipped to it, into a drawer marked only with a barcode. On the clerk's desk, a steaming coffee mug sits on the Everyman's best painting, used as a coaster. Through a porthole, far below, the flooded city glows.
Same rules as set at the start.
```

#### END-heavy 良知太重（靈魂超過 21 克）　`end-heavy.png`
笑位：良知太重，連外星人的光束也拉不動；鄰居一邊吃零食一邊看。

```
Image END-heavy: ending illustration. Landscape 3:2 (1536x1024); it will be cropped to 16:9 through the middle, so keep the top and bottom 8% free of important details. The humour should be bitter, never cruel.

Visual joke: your conscience is too heavy for the alien elevator.

Scene: night on a tenement rooftop. A saucer's tractor beam strains to lift the Everyman, who hovers only a few centimetres off the roof, held down by a glowing, heavy, heart-shaped stone on a chain that rests on the rooftop like an anchor. In the saucer's window, one alien looks at a scale display flashing red and calmly shakes their head; another checks a wristwatch. Neighbours watch from their windows with mild interest, eating snacks.
Same rules as set at the start.
```

#### END-death 死亡（通用）　`end-death.png`
笑位：連喪禮也是外判的：紙箱當棺材，送花的無人機要你評分。

```
Image END-death: ending illustration. Landscape 3:2 (1536x1024); it will be cropped to 16:9 through the middle, so keep the top and bottom 8% free of important details. The humour should be bitter, never cruel. No bodies, nothing gory.

Visual joke: even your funeral is gig work.

Scene: a flooded old-town canal at dawn. A cardboard delivery box, used as a coffin, floats past with a single candle on top. The only mourner is a stray cat on a windowsill. A delivery drone drops a plastic-wrapped bouquet onto the box and immediately projects five rating stars, waiting for a review. Above the canal, a cheerful hologram advertisement shows a smiling mascot holding a coffin: a funeral subscription plan.
Same rules as set at the start.
```

#### END-guardian 地球守護者（被選中但留下）　`end-guardian.png`
笑位：外星人看不懂一扇關上的窗。

```
Image END-guardian: ending illustration. Landscape 3:2 (1536x1024); it will be cropped to 16:9 through the middle, so keep the top and bottom 8% free of important details. The humour should be bitter, never cruel.

Visual joke: the aliens cannot understand a closed window.

Scene: night, seen as a cut-away of one apartment. Outside the closed shutters, the saucer hovers, its searchlight pressing through the slats; in the saucer's window, an alien HR officer frowns at a clipboard and taps it, confused. Inside, in warm lamp light, the Everyman's paintings cover every wall, and neighbours crowd around a small table sharing food: an old poet with tea, a young DJ with headphones, a dessert-shop owner carrying bowls. The Everyman sits with their back to the window, laughing. Warm inside, cold outside.
Same rules as set at the start.
```

#### END-agent 星際特工（被選中並離開）　`end-agent.png`
笑位：你的第一份工作，是淘汰一個和你一模一樣的人；阿星就在隔壁，沒有抬頭。

```
Image END-agent: ending illustration. Landscape 3:2 (1536x1024); it will be cropped to 16:9 through the middle, so keep the top and bottom 8% free of important details. The humour should be bitter, never cruel.

Visual joke: your first job is to reject someone exactly like you.

Scene: the vast open-plan office of the Talent Bureau aboard the mothership: identical white desks in perfect rows, grey alien managers with fixed smiles and clipboards, a framed photo of an alien "employee of the month". The Everyman, now in a crisp alien staff uniform, sits at a desk holding a human candidate's file whose photo shows someone identical to the Everyman, about to drop it into a red reject tray. At the next desk, a long-lost best friend in the same uniform keeps working and does not look up. Through a giant window: Earth's flooded coastline.
Same rules as set at the start.
```

#### END-returned 被遣返　`end-returned.png`
笑位：外星人把你當作次貨退回，頸上掛着退貨標籤；鄰居看一眼，繼續吃麵。

```
Image END-returned: ending illustration. Landscape 3:2 (1536x1024); it will be cropped to 16:9 through the middle, so keep the top and bottom 8% free of important details. The humour should be bitter, never cruel.

Visual joke: the aliens return you like a faulty product.

Scene: grey drizzle over a flooded street. A hatch opens in the saucer and a beam lowers the Everyman, in a crumpled alien uniform, onto a floating wooden pallet. A big return label hangs from their neck (a barcode and a red cross symbol), a small cracked star badge is pinned to the chest, and they hold a cardboard box of desk things. Neighbours glance down from their windows and go back to their noodles.
Same rules as set at the start.
```

#### KA-02 主視覺（直）　`ka-02-portrait.png`
用途：Steam 直式圖（748×896）和收藏庫圖（600×900）。上方留空放遊戲名稱。
笑位：同一場「面試」的直式版本：樓層愈高愈乾、愈有希望；愈低愈絕望。

```
Image KA-02: vertical key art. Portrait 2:3 (1024x1536).

Visual joke: the same audition for the apocalypse, as a vertical ladder of hope: the higher the floor, the drier and more hopeful; the lower, the more desperate.

Scene: at the top, the white saucer, with grey alien HR officers looking down with clipboards. Its searchlight ends in a red scanning line that rests on one window in the middle, where the Everyman holds up a single sheet of paper, deadpan, bathed in white light. Above and below, dozens of windows with residents holding their art up towards the light. At the bottom, flood water up to the third floor: a resident on a floating door holds a painting above their head.
Composition: leave the upper quarter fairly plain for the game logo. The lit window is the brightest point.
Same rules as set at the start.
```

### 第四批：市集、篩選日、徽章、素材包（8 張）

#### SCENE-market 二手市集　`scene-market.png`
用途：市集視窗（WO-15-07）頂部橫幅，會裁成 3:1。
笑位：甚麼都有價錢，包括別人的假牙、婚戒和骨灰盅。

```
Image SCENE-market: banner for the in-game "Second-hand Market". Landscape 3:2 (1536x1024); it will be cropped to a 3:1 strip through the middle, so keep everything important between 30% and 70% of the height.

Visual joke: everything has a price, including other people's lives.

Scene: a night market under a concrete flyover, one big stall where every item hangs from a price tag: odd trinkets on velvet, sealed foil card packs, a photocopier, a polishing wheel, and also a set of dentures, a wedding ring, an urn and a framed family portrait. The stall keeper, a tired old trader with a cat asleep on the counter, waits. Overhead, a neon sign of a smiling coin mascot buzzes.
Same rules as set at the start.
```

#### SCENE-review 篩選日　`scene-review.png`
用途：每輪最後的篩選日視窗（WO-15-08）：交租和靈魂秤重。
笑位：你像菜市場的貨品一樣被秤重和掃描；房東的賬簿長到拖在地上。

```
Image SCENE-review: illustration for "Screening Day", the end-of-round check. Landscape 3:2 (1536x1024); it will be cropped to 16:9 through the middle, so keep the top and bottom 8% free of important details.

Visual joke: you are weighed and scanned like produce at a market.

Scene: night on a tenement rooftop. In a saucer's beam, a giant brass balance scale floats: on one pan a small glowing orb (a human soul), on the other a small brass weight. An alien HR officer with a fixed smile scans the Everyman's forehead with a supermarket barcode scanner. On the other side, a landlord in a vest and slippers holds out a palm, with a ledger so long that it unrolls across the whole rooftop. The Everyman stands between them, holding three coins, deadpan.
Same rules as set at the start.
```

#### EMBLEM 星際人才發展局徽章　`emblem.png`
用途：人類樣本檔案、外星 HR 備忘錄、篩選日的印章。
笑位：發展局的標誌，其實是一部夾公仔機。

```
Image EMBLEM: logo emblem of the alien corporation "Interstellar Talent Development Bureau". Square 1:1 (1024x1024), transparent background (if transparency is not possible, use plain flat #0d1020).

Visual joke: the bureau's friendly corporate logo is literally a claw machine.

A sleek, symmetrical emblem: a smiling flying saucer lowers a claw-machine claw that is picking up a tiny human holding a paintbrush; thin circuit-like lines curve around it like a laurel wreath. Flat, only two or three colours (white, pale lime #9be36b, a touch of navy). Friendly and sinister at the same time. No letters.
Same rules as set at the start.
```

#### 素材包（5 個）
用途：市集的素材包（WO-15-07）。包裝像開心的零食包，笑位在「賣的是甚麼」。

##### PACK-flood 舊城潛水包（水、記憶）　`pack-flood.png`
笑位：可愛的魚吉祥物，高舉一張從水底撈來的陌生人全家福。

```
Image PACK-flood: a booster pack of "material cards" sold in the in-game market. Portrait 2:3 (1024x1536). A sealed, crinkled foil pack with crimped seals at the top and bottom, standing upright and centred, on a transparent background (if transparency is not possible, use plain flat #151a2e). The wrapper looks like cheerful corporate snack packaging with a cute mascot; the joke is in what is being sold. No words or numbers anywhere.

Theme "Old Town Dive", teal and gold: a cute cartoon fish mascot in a diving mask proudly holds up a stranger's family photo it found in a drowned living room.
Same rules as set at the start.
```

##### PACK-sky 天空區垃圾包（機械、霓虹）　`pack-sky.png`
笑位：有錢人的垃圾，用金絲帶包裝成高級禮品。

```
Image PACK-sky: a booster pack of "material cards" sold in the in-game market. Portrait 2:3 (1024x1536). A sealed, crinkled foil pack with crimped seals at the top and bottom, standing upright and centred, on a transparent background (if transparency is not possible, use plain flat #151a2e). The wrapper looks like cheerful corporate snack packaging with a cute mascot; the joke is in what is being sold. No words or numbers anywhere.

Theme "Sky District Junk", silver and neon magenta: the rich people's rubbish, gift-wrapped as a luxury product. A bin bag tied with a gold ribbon, overflowing with broken gadgets (a cracked robot eye, a burnt-out neon tube), presented by a smug champagne-glass mascot.
Same rules as set at the start.
```

##### PACK-street 街坊包（人情、飢餓、希望）　`pack-street.png`
笑位：價錢貼紙被一層一層地貼高。

```
Image PACK-street: a booster pack of "material cards" sold in the in-game market. Portrait 2:3 (1024x1536). A sealed, crinkled foil pack with crimped seals at the top and bottom, standing upright and centred, on a transparent background (if transparency is not possible, use plain flat #151a2e). The wrapper looks like cheerful corporate snack packaging with a cute mascot; the joke is in what is being sold. No words or numbers anywhere.

Theme "Neighbourhood", coral, orange and green: a bowl of noodles, a bowl of sweet soup and a potted plant, presented by a tired smiling dumpling mascot. A price sticker in the corner has been covered by five more price stickers, each one slightly bigger.
Same rules as set at the start.
```

##### PACK-under 地下包（反叛、憤怒、愧疚）　`pack-under.png`
笑位：整個包裝被一條黑色審查條斜斜遮住。

```
Image PACK-under: a booster pack of "material cards" sold in the in-game market. Portrait 2:3 (1024x1536). A sealed, crinkled foil pack with crimped seals at the top and bottom, standing upright and centred, on a transparent background (if transparency is not possible, use plain flat #151a2e). The wrapper looks like cheerful corporate snack packaging with a cute mascot; the joke is in what is being sold. No words or numbers anywhere.

Theme "Underground", dark violet and crimson: crossed spray-paint cans, a torn poster, a broken chain and a smouldering match, with a cute rebel-cat mascot, and a big black censor bar printed diagonally across the whole wrapper.
Same rules as set at the start.
```

##### PACK-far 遠方包（外國素材，較貴）　`pack-far.png`
笑位：度假宣傳單上的天堂海灘，棕櫚樹其實已經淹了一半。

```
Image PACK-far: a booster pack of "material cards" sold in the in-game market. Portrait 2:3 (1024x1536). A sealed, crinkled foil pack with crimped seals at the top and bottom, standing upright and centred, on a transparent background (if transparency is not possible, use plain flat #151a2e). The wrapper looks like cheerful corporate snack packaging with a cute mascot; the joke is in what is being sold. No words or numbers anywhere.

Theme "Far Away", lavender and gold with a holographic rainbow sheen (this is the rarer, more expensive pack): a glossy holiday-brochure picture of a paradise beach with a sunglasses-wearing sun mascot, except that the palm trees stand half underwater and the tip of a pyramid pokes out of the sea.
Same rules as set at the start.
```

### 第五批（選做）

#### 創作桌場景（4 張）
用途：取代 CSS 畫的創作桌舞台背景。會裁成 4:1 長條；中間要暗而且簡單（素材卡會放在上面），笑位放在左右兩端。

##### STAGE-desk 平常的晚上　`stage-desk.png`
笑位：日曆每天都劃掉；窗上用膠紙記錄水位，最新一條已經高過窗台。

```
Image STAGE-desk: wide backdrop behind the card-playing area. Landscape 3:2 (1536x1024); it will be cropped to a 4:1 strip through the middle, so keep everything important between 35% and 65% of the height. The centre must stay dark and plain because game cards will be placed on top; put the details and the joke at the left and right ends.

Visual joke: the water-level marks taped on the window have climbed above the windowsill.

Scene: late night at the protagonist's desk, seen from the front. Left end: a brass lamp casting a warm pool of light on manuscripts and a coffee mug, and a wall calendar with every single day crossed out. Right end: a window with rain outside and strips of tape marking the rising water level; the newest strip is already above the windowsill, and water glints outside.
Same rules as set at the start.
```

##### STAGE-hall 社區小展　`stage-hall.png`
笑位：觀眾席一半是紙板人；唯一的真人在前排睡着了。

```
Image STAGE-hall: wide backdrop behind the card-playing area. Landscape 3:2 (1536x1024); it will be cropped to a 4:1 strip through the middle, so keep everything important between 35% and 65% of the height. The centre must stay dark and plain because game cards will be placed on top; put the details and the joke at the left and right ends.

Visual joke: half the audience is cardboard cut-outs, and the only real person is asleep.

Scene: a small community hall on a flood-proof upper floor: red velvet curtains at both ends, triangle bunting, buzzing fluorescent tubes. Along the bottom edge, rows of folding chairs filled with flat cardboard cut-out people; in the front row, one real elderly person has fallen asleep.
Same rules as set at the start.
```

##### STAGE-gallery 畫廊聯展　`stage-gallery.png`
笑位：畫框裡只有價錢牌；有錢人在自拍，不看畫。

```
Image STAGE-gallery: wide backdrop behind the card-playing area. Landscape 3:2 (1536x1024); it will be cropped to a 4:1 strip through the middle, so keep everything important between 35% and 65% of the height. The centre must stay dark and plain because game cards will be placed on top; put the details and the joke at the left and right ends.

Visual joke: the frames contain only price tags, and the visitors photograph themselves instead.

Scene: a pristine white-cube gallery in the Sky District, track spotlights forming cones of light. At both ends, elegant gold frames hang on the white walls with nothing inside but a single dangling price tag; rich visitors in white pose for selfies in front of them. The middle of the wall is dim and empty.
Same rules as set at the start.
```

##### STAGE-ufo 外星評審　`stage-ufo.png`
笑位：評審一個睡着、一個看手機、一個未看已經寫好分數。

```
Image STAGE-ufo: wide backdrop behind the card-playing area. Landscape 3:2 (1536x1024); it will be cropped to a 4:1 strip through the middle, so keep everything important between 35% and 65% of the height. The centre must stay dark and plain because game cards will be placed on top; put the details and the joke at the left and right ends.

Visual joke: the judges are not paying attention.

Scene: the judging chamber inside the alien mothership: curved, ribbed metal walls and a tractor-beam core glowing pale green at the top centre. At the far left and far right, grey alien judges in suits sit behind a long curved bench: one is asleep, one scrolls a phone, and one has already raised a scorecard before anything has happened (the card shows only a symbol).
Same rules as set at the start.
```

#### 出國明信片（6 張，取代通用的 DAY-trip）
用途：稀有生活卡「出國：X」。笑位：世界末日的旅遊業。每張先貼共用的開頭，再接該地區的內容。

```
Image TRIP-<region>: travel postcard for the rare "Go Abroad" day card. Landscape 3:2 (1536x1024), cropped to a 2:1 banner through the middle and shown small, so use one main subject and big shapes.
Visual joke: tourism at the end of the world. Every place is partly flooded and full of tourists photographing it.
Same rules as set at the start.
```

| 檔名 | 地區 | 接在共用開頭之後 |
|---|---|---|
| `trip-asia.png` | 亞洲 | `Scene: a drowned neon street in East Asia; shrine gates and temple roofs stand in the water; a tour boat full of tourists with selfie sticks; a floating souvenir stall sells snow globes of the city before the flood.` |
| `trip-europe.png` | 歐洲 | `Scene: a sunken canal city; a gondola tour glides past the top floors of gothic palaces; on a rooftop terrace that is ankle-deep in water, a waiter in a tuxedo serves coffee as if nothing is wrong.` |
| `trip-america.png` | 美洲 | `Scene: the tops of giant skyscrapers stick out of the sea like islands; a luxury cruise ship is moored at a skyscraper's eightieth floor; far away, a giant rusty statue's raised torch is now used as a lighthouse.` |
| `trip-africa.png` | 非洲 | `Scene: ancient pyramids rise from a flooded desert; tourists in swan-shaped pedal boats circle them; a camel stands on a raft, unimpressed.` |
| `trip-arctic.png` | 北極 | `Scene: a seed-vault entrance in the snow with a red "closed" light; melting glacier cliffs; a lone polar bear on a tiny ice floe, surrounded by a tour boat of people photographing it.` |
| `trip-ocean.png` | 大洋 | `Scene: giant stone-head statues stand waist-deep in the rising ocean on a lonely island; one of them wears an inflatable swim ring.` |

#### KA-03 全景　`ka-03-panorama.png`
用途：Steam 收藏庫大圖（3840×1240，規定不可以有字）、標題畫面背景。
笑位：外星飛碟像超級市場收銀機一樣掃描整個城市；天台上有人排隊等被掃描。

```
Image KA-03: wide panorama. Landscape 3:2 (1536x1024); it will be cropped to a 3:1 strip through the middle, so keep everything important between 30% and 70% of the height; the top and bottom should be simple sky and water.

Visual joke: the saucers scan the city like a supermarket checkout.

Scene: a calm night panorama of the flooded Floating City: dozens of tenements standing in the sea, lit windows, laundry, boats tied to windows. Three white saucers glide above, each sweeping a beam that ends in a thin red scanning line across the rooftops; on each rooftop, a small queue of hopeful residents waits, holding up their art. The Sky District floats on the right, glowing gold, with a giant cheerful mascot billboard. No single character in focus. Slightly darker in the centre for the logo.
Same rules as set at the start.
```

#### ICON 遊戲圖示　`icon.png`
用途：Steam 社群圖示（184×184）、網頁圖示。和徽章同一個笑位，方便記認。

```
Image ICON: game icon. Square 1:1 (1024x1024), transparent background (if transparency is not possible, use plain flat #0d1020).

Visual joke: aliens pick talent the way you play a claw machine.

A claw-machine claw hangs from the underside of a white saucer and lifts a tiny person holding a pencil. Very chunky pixels, as if drawn at 32x32 and scaled up, so it reads at tiny sizes. Bold shapes, maximum contrast.
Same rules as set at the start.
```

#### 另外三個結局
`END-perfect` 是「被選中」的變化（靈魂很輕的時候）；`END-grey`、`END-ordinary` 只在舊模式出現。

`END-perfect`：你的臉變成了外星人的標準笑容。

```
Image END-perfect: ending illustration in the same office and framing as image END-agent. Landscape 3:2 (1536x1024), cropped to 16:9 through the middle. The humour should be bitter, never cruel.

Visual joke: you have become the perfect employee: your face is now the aliens' face.

Scene: the same alien office as END-agent, but colder and almost monochrome. The Everyman's skin has turned grey and their face wears exactly the same fixed smile as the aliens; they stamp red crosses onto human files at machine speed. Their reflection in the dark window is an alien. A tiny white feather, all that is left of their soul, floats above their head.
Same rules as set at the start.
```

`END-grey`：你終於當上了「本月最佳員工」，在你變成灰色之後。

```
Image END-grey: ending illustration. Landscape 3:2 (1536x1024), cropped to 16:9 through the middle. The humour should be bitter, never cruel.

Visual joke: you finally became employee of the month, after you turned grey.

Scene: a night office of identical cubicles where workers label photos on monitors. The Everyman sits perfectly upright in profile, completely grey like a stone statue (skin, clothes, hair), eyes empty, clicking mechanically. On the wall, a framed "employee of the month" photo shows the same grey face. The whole picture is greyscale except the cold monitor glow and one tiny, dim pink spark on the desk.
Same rules as set at the start.
```

`END-ordinary`：外星人走了，房東沒有。

```
Image END-ordinary: ending illustration. Landscape 3:2 (1536x1024), cropped to 16:9 through the middle. The humour should be bitter, never cruel.

Visual joke: the aliens leave; the landlord doesn't.

Scene: dawn on a rooftop garden. The Everyman sits on a plastic stool with a cup of tea; the water has risen to the edge of the roof and laps at their slippers; their drawings hang drying on the laundry line. Far away, the alien saucers fly off into the sunrise. Close by, the landlord's little boat is already approaching, ledger in hand. Bittersweet and quiet.
Same rules as set at the start.
```

---

## 八、收到圖之後（Claude）

1. **檢查**：文字、亂碼、手指、風格是否一致、構圖能不能裁切、縮小之後笑位還看不看得出。不合格的列出來請你重做。
2. **像素化**：縮到原生像素、減色、對齊色票；人物頭像和素材包去背。原圖不放進遊戲。
3. **美術整合工單**（暫定 WO-15-11，排在 WO-15-08 之後，交給 Gemini）：
   - 生活卡的卡頂橫幅（同時保證 WO-15-08 的「桌面第一屏看到三張卡」）；
   - 朋友頭像放進朋友卡和聊天視窗；
   - 結局插圖放在「人類樣本檔案」頂部；
   - 市集橫幅、素材包、篩選日插圖、徽章；
   - 手機版面、減少動態效果；單一 HTML 的大小上限改為 2.5 MB。
4. **Steam**：遊戲名稱標誌由我用遊戲標題的字型做成透明 PNG，再和主視覺合成各種尺寸（2024 年起的要求是：頁首 920×430、小 462×174、主要 1232×706、直式 748×896、收藏庫 600×900、收藏庫大圖 3840×1240、標誌 1280×720；上傳時以 Steamworks 的最新說明為準）。

## 九、注意事項

- **Steam 要申報 AI 內容**：上架時要在「內容調查」申報 AI 生成的內容（預先生成的美術可以使用，但要寫明）。
- **版權**：完全由 AI 生成的圖，在部分地區未必受版權保護；經過人手修改（像素化、修圖、合成）會比較穩妥。商業用途以 ChatGPT 當時的使用條款為準。
- **不要在 prompt 加入其他遊戲或在世畫家的名字**，避免模仿特定作品引起爭議。
- **插圖只負責氣氛和笑位**：規則和數字仍然由介面顯示，插圖上不放任何資訊。

---

## 附錄：清單

| 次序 | 編號 | 檔名 | 比例 |
|---|---|---|---|
| 試做 | KA-01 主視覺（橫）、DAY-label、DAY-delivery | `ka-01-landscape.png`、`day-label.png`、`day-delivery.png` | 3:2 |
| 二 | DAY-clinic、salvage、haggle、farm、smile、dive、busk、garden、volunteer、trip | `day-<id>.png` ×10 | 3:2 |
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
| `ref-palette-v2.png` | **第二版色票（生圖用這張）**：第一行是城市（灰暗），第二行是水，第三行是企業和有錢人專用的霓虹色，第四行是真正人情的暖色 |
| `ref-palette.png` | 遊戲現在的色票：第一行是十種情緒的顏色，第二行是介面和季節的顏色 |
