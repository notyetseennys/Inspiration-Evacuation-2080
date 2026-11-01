# 美術盤點與生圖 prompt（第二版：黑色幽默）

> 給製作人。最後更新：2026-11-01（2.1：按遊戲的卡面文字、小遊戲操作、結局文字和朋友的對白逐張核對）。
> 用途：用 ChatGPT 生成遊戲缺少的插圖。收到圖之後，由 Claude 處理成像素圖，再寫成美術整合工單交給 Gemini。
> **第二版**：第一版試做的 5 張圖畫工很好，但語氣太可愛、太溫馨。第二版加入「黑色幽默的畫法」，重寫了風格設定；第三節說明哪些 prompt 真的要改、哪些不用（第一版在 git 歷史裡）。
> 參考圖在 `docs/art-prompts/ref/`（由遊戲直接截取，沒有文字）。

---

## 一、現在的美術

遊戲裡**沒有任何圖片檔**：全部畫面都是程式畫的。美術任務書 `docs/GEMINI_BRIEF.md` 本來規定「沒有外部素材」；製作人在 2026-11-01 刪除了這條規定，圖片可以加入。

**已經完成，不需要重畫**：
- 121 件物件圖示、20 個角色半身像、19 位外星評審（像素字串）。半身像本來就是豆眼、表情平淡，和冷面的風格一致；
- 素材卡的五種卡面、計分演出、11 個小遊戲；
- 浮城（天氣、水位、探射燈、朋友的窗）、創作桌的四個場景（CSS）；
- 房間、地圖、30 個目的地只在舊模式出現（五輪模式會藏起來），不值得再投資。

**缺口**（按每局看到的次數排列）：
1. 生活卡只有文字：五輪模式每天最重要的決定，一局要選 15 次。
2. 8 位朋友沒有臉：朋友卡和聊天視窗只有名字和對話泡泡。
3. 市集、素材包、篩選日（第十五期的新畫面）沒有圖。
4. 結局沒有插圖；設計大綱說結局和死亡畫面是玩家截圖分享的主要來源。
5. 沒有主視覺和標誌：路線圖的下一步是 Steam 頁面和 Next Fest。

**處理方法**：每張圖收到之後由我縮到遊戲的原生像素（結局和場景 320×180、生活卡約 160×80、頭像 64×64）、減到約 32 色；處理後每張約 2 至 20 KB。「沒有外部素材」的規定已經刪除，圖片放在 `game/img/`，用法在美術整合工單（WO-15-12）決定。

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
3. **主角被固定成前文案**（眼鏡、紅領帶）：玩家可以是 20 個角色之一。
4. **太熱鬧**：生活卡在遊戲裡只有約 160×80 像素。縮小之後，臉和小道具全部糊掉；笑位要靠大形狀和構圖，不能靠表情。
5. **背景出現了真實地標**（中銀大廈的輪廓）。浮城是虛構的城市，第二十期還要做其他城市，所以新的設定加了「不畫真實地標」。想保留香港的地標，刪掉風格設定裡的「Do not draw real landmarks.」就可以。

**從試做看到 ChatGPT 的三個習慣**（第二版的寫法就是針對這三點）：
1. **第一張圖會帶動之後每一張**：KA-01 的前文案出現在標註和診所兩張，可愛的語氣也延續下去。所以風格設定和第一張樣板錯了，之後全部都會錯。
2. **指定像素密度沒有效**：第一版寫了「約 192×128 放大 8 倍」，四張生活卡的像素仍然很細。所以不再在 prompt 控制像素，交給我縮圖。
3. **它偏向可愛**：寫了「穿西裝、拿文件夾的外星 HR」，出來的仍然是可愛的綠色小人。所以「不要可愛」要寫明，而且每張 prompt 的結尾都重複一次。

---

## 三、要不要改所有 prompt？

**不是全部都要大改。** 要分開看「畫法」和「內容」：畫法由第一則訊息的風格設定決定，每張都受影響；黑色幽默卻在「發生甚麼事」，要寫在每張的內容裡。

| 部分 | 要不要改 | 原因 |
|---|---|---|
| 風格設定（第一則訊息） | **一定要改** | 它決定每一張的畫法和語氣，而且第一張會帶動之後每一張 |
| 每張結尾的一句提醒 | 全部加上（機械式的改動） | 對付「偏向可愛」：每張都重複「不要動漫、世界用灰暗的顏色、不要文字」 |
| 主視覺、生活卡、市集、篩選日、素材包、徽章、創作桌場景、明信片、圖示 | **要改內容** | 第一版只寫了「畫面裡有甚麼」，沒有笑位；只改畫法，只會得到一張比較暗的溫馨圖 |
| 朋友頭像（8 張） | **只改畫法，內容沿用第一版** | 頭像每次聊天都會出現，笑話看三次就膩；朋友是遊戲裡真正的人情，黑色幽默要靠這份溫暖做對比。只加一個來自他們對白的小細節（例如何伯說過「被水泡過的詩，字會游走」） |
| 結局（6 張） | **保留第一版的情感核心，加一個苦澀的細節** | 設計大綱要求玩家第一次最常拿到的結局「令人心酸但又覺得有意義」，令玩家想再玩；只有笑話做不到。大綱當時指「平凡人」；模擬器裡五輪模式最常見的結局是「人才庫」 |
| 已經生成的 5 張 | **全部重做** | KA-01 是樣板：外星人可愛、主角固定成前文案、有真實地標；四張生活卡跟着它走 |

**2.1 修正了第二版的 17 張**（核對遊戲內容時發現的錯誤和改過頭的地方）：

| prompt | 第二版的問題 | 2.1 的做法 |
|---|---|---|
| DAY-clinic | 把主角畫成病人；但卡面是「替病人接駁義體」，小遊戲是替病人接線 | 主角是技師；笑位改為卡面的「有些義體沒有登記」：二手義肢還戴着別人的婚戒 |
| DAY-haggle | 賣「自己」的家當；但卡面是「把撿回來的舊物賣給遊客」 | 把撿回來的陌生人婚照當「真古董」賣（小遊戲可以按 B 吹噓真古董） |
| DAY-dive | 「自己童年的家」畫不出來，而且外星角色沒有童年的家 | 在別人淹沒的家裡撬開衣櫃尋寶（小遊戲是射魚、撬儲物櫃、看氧氣） |
| DAY-busk | 錄歌的機械人是新發明的 | 改用小遊戲裡的管理員：唯一停下來的人是在寫告票的管理員；主角難得真心快樂（這張卡令火花上升） |
| DAY-smile | 沒有用上小遊戲的「偏見言論」 | 客人說了一句偏見的話（紅色對話框），笑臉面具照樣微笑 |
| FRIEND ×8 | 為了笑話發明了細節（Miu 的鏡頭眼、小妹偷來的電線、Mary 姐水浸到胸口） | 沿用第一版的內容，只加對白裡有的小細節 |
| END-archived | 只剩「杯墊」的笑話，主角不見了，失去「不再被看見」的心酸 | 主角坐在窗台；探射燈掃過你的窗，停在隔壁的廣告牌上 |
| END-heavy | 鄰居吃零食，沖淡了「背著這份重量繼續生活」 | 鄰居安靜地看 |
| END-returned | 漏了結局文字的「你帶著一身火花回到浮城」 | 加回火花和上升的水位 |
| END-perfect | 靈魂畫成羽毛 | 照結局文字「輕得像一張表格」：頭上浮着一張空白的表格 |

---

## 四、黑色幽默的畫法

設計大綱對文字的要求是「冷面笑匠，用平淡的語氣講慘事，精華在最後一句」。畫面照同一個原則：

1. **一張圖，一個笑位**：企業光鮮的表面（吉祥物、笑容、霓虹廣告、五星評分、天空區的奢華）對比人的處境（疲倦、水浸、被取代、被標價）。笑位最好來自卡面文字或小遊戲本身。
2. **冷面**：人物不誇張，表情平淡、疲倦，或者是職業假笑；構圖平穩，像監控鏡頭或證件照，荒謬的事安靜地發生。
3. **顏色有意思**：城市和人是灰藍色、鏽色、日光燈的病態白；**只有企業和有錢人有霓虹色**；暖色燈光只留給真正的人情（朋友、義工、守護者結局）。
4. **主角是可以替換的普通人**：灰色連帽衫、掛着空白的工作證、黑眼圈、面無表情，不畫髮型和配飾。玩家可以是 20 個角色之一；而且在這個城市，每個人都可以被替換。
5. **不可愛**：不要 Q 版、汗滴、閃光、腮紅、大眼睛、張口大叫。只有企業吉祥物是可愛的：越可愛，越恐怖。
6. **看越多次的圖，笑話越輕**：生活卡、結局只看一兩次，笑位要清楚；朋友頭像、創作桌背景每局看很多次，只放安靜的小細節。

---

## 五、要生成甚麼

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

## 六、怎樣用 ChatGPT 生圖

1. **開一個新對話**，不要沿用第一版的對話，否則會延續可愛的風格。上載 `ref-city-night.png`、`ref-characters.png`、`ref-palette-v2.png`（第二版的色票，比遊戲現在的色票灰暗），貼上第七節的「風格設定」。有外星人的圖再加上 `ref-judges.png`。
2. **先做試做的三張**，傳給我看。三張都對了，KA-01 就成為風格樣板：之後每個新對話都把它和參考圖一起上載，並說「Match the style and tone of KA-01.」。
3. 一則訊息只生一張圖：貼上該張的 prompt 就可以。
4. **檢查笑位**：每張的中文說明寫了「笑位」。縮成小圖之後仍然一眼看出笑位，才算合格。
5. 出現文字或亂碼，回覆「Remove all text.」；又變回可愛，回覆「Too cute. Make it deadpan and bleaker; keep the composition.」。
6. 透明背景（素材包、徽章、圖示）做不到的話，純色背景也可以，我會去背。
7. 按清單的檔名存成 PNG，直接在這個對話上載。
8. 每張生兩、三次，揀最好的一張。縮成像素之後細節會消失，構圖、笑位和色彩才是重點。

---

## 七、風格設定（每個新對話的第一則訊息）

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

## 八、Prompt

每一段 prompt 都是完整的一則訊息，直接複製貼上。每段最後一句都是同一句提醒，不要刪。

### 試做（3 張）

#### KA-01 主視覺（橫）　`ka-01-landscape.png`
用途：Steam 主要圖和頁首圖、標題畫面；之後所有圖的風格樣板。左邊留空放遊戲名稱。
笑位：全城在為世界末日「面試」。每個窗口都有人像求職一樣舉起自己的作品，希望被外星人選中；水繼續上升，天空區的有錢人把垃圾倒下來。

```
Image KA-01: game key art. Landscape 3:2 (1536x1024).

Visual joke: the whole city is auditioning for the apocalypse. In every window, someone holds their art up to the alien searchlight like a job applicant, hoping to be evacuated, while the water keeps rising.

Scene: night, rain. Centre-right, a crumbling tenement tower stands in flood water, cut away like a dollhouse so we can see into every flat. In each flat a tired resident holds something up towards the sky: a painting, a poem, a guitar, a sculpture made of junk, a child's drawing. On the flooded lowest floor, residents stand on their tables, still holding their work above the water. Above, a sleek white saucer hovers; in its lit window, grey alien HR officers with identical smiles hold clipboards and stopwatches. Its searchlight ends in a thin red scanning line, like a supermarket barcode scanner, and the line has just stopped on one middle-floor window, where the Everyman sits at a desk and, deadpan, holds up a single sheet of paper. At the top, on a white Sky District terrace, rich residents sip drinks and casually tip their rubbish over the edge onto the tower. Under the water: the drowned old town and a sunken billboard of a smiling real-estate mascot.

Composition: keep the left third calm and dark (night sky, distant towers) as space for the game logo, which I will add later.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### DAY-label AI 數據標註　`day-label.png`
卡面：教 AI 認貓，好讓它以後不再需要你。
笑位：你在訓練取代你的 AI，而它已經掛上了你的工作證；保安拿着空紙箱在等你。

```
Image DAY-label: illustration for a "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: you are training your replacement, and it already wears your lanyard.

Scene: a grim open-plan labelling office under flickering fluorescent tubes. In the foreground, the Everyman clicks through photos of cats on an old monitor (green tick, red cross). In the next chair, a cheerful white robot with a smiling screen-face copies every click and already wears the Everyman's lanyard. On the wall, a huge bright poster of the same robot giving a thumbs-up. Behind them, a security guard waits patiently, holding an empty cardboard box.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### DAY-delivery 外送潛水　`day-delivery.png`
卡面：在淹水的街道限時送外賣，小心天空區的快艇。
笑位：外賣是乾的，外送員不是；客人連頭也不抬，只給一粒星。

```
Image DAY-delivery: illustration for a "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: the food arrives dry; the courier does not.

Scene: a flooded neon street at night. The courier's little boat has sunk; the Everyman, in a yellow delivery helmet, stands chest-deep in the water, holding the insulated food bag perfectly dry above their head with both arms. From a high window, the customer lowers a basket on a rope without looking up from their phone; the phone shows a single star. A gleaming white Sky District speedboat roars past, and its wake washes over the courier's blank face.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

### 第二批：其餘生活卡（10 張）

用途：白天三選一的卡頂橫幅。會從中間裁成 2:1，在遊戲裡顯示得很小。

#### DAY-clinic 黑市義體診所　`day-clinic.png`
卡面：替病人接駁義體；有些義體沒有登記。（小遊戲：對照接線圖插插頭；非法義體可以拒絕安裝。）
笑位：你替病人裝上「沒有登記」的二手義肢，手指上還戴着別人的婚戒。

```
Image DAY-clinic: illustration for a "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: the "unregistered" second-hand arm still wears its previous owner's wedding ring.

Scene: a back-alley cybernetics clinic. The Everyman, working as the technician, plugs colourful cables into a mechanical arm newly attached to a patient, who sits in a cracked dentist's chair staring blankly ahead. On one of the arm's fingers is someone else's wedding ring, and a faded hospital wristband is still around its wrist. Behind them, more second-hand arms hang on a rack, each with a price tag. A cheerful poster of a smiling robot doctor gives a thumbs-up.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### DAY-salvage 拆樓打撈　`day-salvage.png`
卡面：替重建計劃拆舊樓，看準弱點落錘，牆裡可能藏著舊世界的東西。
笑位：「空置」的舊樓其實有人住：一對老夫婦還在吃晚飯，平靜地看着鐵球。

```
Image DAY-salvage: illustration for a "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: the "abandoned" building is not empty.

Scene: a wrecking ball has just smashed a big hole in the wall of an old, half-flooded tenement. Through the hole we see a small flat where an elderly couple still sits at their dinner table, chopsticks frozen mid-air, calmly looking at the crane. Beside the building, a glossy developer billboard with a smiling mascot shows the luxury tower that will replace it. In the crane cab, the Everyman, in a hard hat, looks away and sips tea from a flask.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### DAY-haggle 夜市擺地攤　`day-haggle.png`
卡面：把撿回來的舊物賣給遊客：開價太高客人會走，吹噓可以賣貴一點。（小遊戲可以按 B 吹噓「真古董」。）
笑位：你把從水底撈回來的陌生人婚照，當作「真古董」賣給有錢遊客；對方用放大鏡驗貨，還要殺價。

```
Image DAY-haggle: illustration for a "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: selling a drowned stranger's wedding photo as a "genuine antique", and being haggled down.

Scene: a night market under a concrete flyover. The Everyman sits on a low stool behind a mat of things salvaged from the drowned old town, all still a little damp: a stranger's framed wedding photo, a school bag, a mahjong set, a rusty rice cooker. Deadpan, they hold up the wedding photo like a priceless treasure. A rich Sky District tourist in spotless white inspects it through a jeweller's loupe and holds up two fingers. Above them, a cheerful neon sign of a big downward arrow.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### DAY-farm 陰謀論內容農場（虧心）　`day-farm.png`
卡面：拼湊聳動標題，越假越多人轉發。
笑位：你為了點擊率偽造 UFO 照片；真的飛碟就在窗外，沒有人回頭。

```
Image DAY-farm: illustration for a "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: faking UFO photos for clicks while a real UFO hovers right outside, ignored.

Scene: a dim room crammed with racks of phones and screens showing giant red arrows, shocked cartoon faces and a blurry fake UFO photo. The Everyman, lit by sickly green screens, tapes a paper UFO onto a photograph. Behind them, through the window, a real alien saucer hovers silently, its searchlight shining into the room. Nobody turns around. A corkboard with red string connects random pictures.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### DAY-smile 企業情緒陪伴（虧心）　`day-smile.png`
卡面：陪有錢人說笑、點頭、倒酒，笑得越準越值錢。（小遊戲：偏見言論可以附和或沉默。）
笑位：客人說了一句偏見的話（紅色對話框），你的笑臉面具照樣微笑；手腕上的「笑容指數」滿格。

```
Image DAY-smile: illustration for a "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: the smile is part of the uniform, even when the client says something ugly.

Scene: a glossy Sky District lounge in gold and white. A rich client leans back, mid-sentence, with a red speech bubble that contains only an angry symbol. The Everyman, working as a hired "emotional companion", pours wine with one hand and with the other holds a big, bright paper smile mask on a stick in front of their face; their real deadpan face shows at the edges. A smile-meter on their wrist glows full green. In the background, a row of other companions waits on a bench, all holding identical smile masks.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### DAY-dive 舊城潛水　`day-dive.png`
卡面：用魚叉捕魚，打撈水淹舊城的遺物。（小遊戲：射魚、撬開儲物櫃、氧氣用完前浮上水面。）
笑位：在別人淹沒的家裡「尋寶」：全家福還掛在牆上，商場吉祥物在窗外繼續微笑。

```
Image DAY-dive: illustration for a "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: treasure hunting in someone else's drowned home, while a mall mascot keeps smiling outside.

Scene: underwater in the drowned old town. The Everyman, in an old diving mask with a small speargun on their back, pries open a wardrobe in a sunken living room; a family portrait still hangs on the wall, and a fish swims out of an old TV screen. Through the window, a sunken shopping-mall sign of a smiling mascot still flickers. A small oxygen gauge on the Everyman's wrist glows red. Calm, teal, very quiet.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### DAY-busk 街頭表演　`day-busk.png`
卡面：在天橋下表演，收入很少，但會讓火花變旺。（小遊戲：管理員巡邏時要立刻停手。）
笑位：你難得真心快樂；唯一停下來聽的人，是正在寫告票的管理員。

```
Image DAY-busk: illustration for a "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: the only person who stops to listen is the officer writing you a fine.

Scene: under a concrete flyover at night. In a pool of warm streetlight, the Everyman plays an acoustic guitar with eyes closed, genuinely happy for once. Commuters walk past staring at their phones. The only one who stops is a uniformed patrol officer, calmly writing a ticket. A stray cat sits beside the open guitar case, which holds a single coin.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### DAY-garden 天台菜園　`day-garden.png`
卡面：在大廈天台種菜：澆水、收成、趕走偷菜的白鴿。
笑位：在有錢人的陰影裡種菜：全部盆栽擠在唯一一道陽光下。

```
Image DAY-garden: illustration for a "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: farming in the shadow of the rich.

Scene: a tenement rooftop garden in planters made from bathtubs and old fridges. Directly above, the underside of a Sky District platform blocks out the sun; a single narrow beam of sunlight falls through a drain hole, and the Everyman has crammed every pot into that one small patch of light. From the platform's edge, a rich resident absent-mindedly pours out a glass of water. A fat white pigeon walks off with the only ripe tomato.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### DAY-volunteer 到避難所做義工　`day-volunteer.png`
卡面：幫人不會賺錢，但會讓靈魂變輕。
笑位：名人在拍照做善事；鏡頭一轉開，就把碗交還給你。

```
Image DAY-volunteer: illustration for a "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: charity as a photo opportunity.

Scene: a crowded flood shelter in an old school gym, camp beds in rows. In warm lamp light, the Everyman, in a plain volunteer vest, ladles soup for an old person and a child. Beside them, a Sky District celebrity in a spotless white suit holds up a bowl and flashes a perfect smile at a hovering camera drone, while their other hand is already handing the bowl back to the Everyman. Cold camera-flash light on the celebrity, warm light on everyone else.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### DAY-trip 出國（通用）　`day-trip.png`
卡面：付旅費出國，從五張當地素材中帶回兩張。
笑位：所有乘客都戴着虛擬實境眼鏡看陽光海灘；只有你看着窗外淹水的世界。

```
Image DAY-trip: illustration for a rare "day card". Landscape 3:2 (1536x1024). It will be cropped to a 2:1 banner through the middle and shown very small, so use one main subject and a few big shapes; the joke must read from silhouettes alone.

Visual joke: everyone flies over the drowning world while watching a sunny beach in VR.

Scene: inside a small aeroplane cabin. Through the oval window, the flooded Floating City shrinks away below. Every passenger wears a glowing VR visor showing a bright, sunny beach and ignores the window. Only the Everyman looks out of the window, holding a sketchbook.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

### 第二批（續）：朋友頭像（8 張）

用途：朋友卡、聊天視窗的對話頭像。每次聊天都會出現，所以**不放笑話**：真誠、溫暖（暖色燈光），表情自然，最多一個來自對白的小細節。

#### FRIEND-ken 畫壁畫的阿 Ken（教三色）　`friend-ken.png`
對白：「我昨晚又被天空區的保安追，跑得比外送員還快。」

```
Image FRIEND-ken: dialogue portrait of one of the protagonist's friends. Square 1:1 (1024x1024). Head and shoulders, three-quarter view, centred, on a plain flat dark navy background (#151a2e) with no scenery. This portrait will be seen many times, so keep it sincere and warm (warm lamp-light colours) with a natural, wry expression and at most one small, quiet detail from their life.

Ah Ken, a street muralist in their late twenties: paint-splattered denim jacket, a beanie pushed back on messy hair, a spray can in one hand, a smear of teal paint on one cheek, a lopsided grin; the look of someone who has just outrun the Sky District security guards again.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### FRIEND-dj 天台 DJ 小妹（教四色）　`friend-dj.png`
對白：「我叫小妹，喇叭比我還大聲。」

```
Image FRIEND-dj: dialogue portrait of one of the protagonist's friends. Square 1:1 (1024x1024). Head and shoulders, three-quarter view, centred, on a plain flat dark navy background (#151a2e) with no scenery. This portrait will be seen many times, so keep it sincere and warm (warm lamp-light colours) with a natural, wry expression and at most one small, quiet detail from their life.

Siu Mui, a rooftop DJ in her early twenties: neon-pink bob, oversized headphones around her neck, glow-stick bracelets, holding a vinyl record, a cheeky, sleepy grin; the edge of a speaker bigger than she is, just behind her shoulder.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### FRIEND-ho 寫詩的何伯（教單色）　`friend-ho.png`
對白：「你有沒有讀過一首被水泡過的詩？字會游走。」

```
Image FRIEND-ho: dialogue portrait of one of the protagonist's friends. Square 1:1 (1024x1024). Head and shoulders, three-quarter view, centred, on a plain flat dark navy background (#151a2e) with no scenery. This portrait will be seen many times, so keep it sincere and warm (warm lamp-light colours) with a natural, wry expression and at most one small, quiet detail from their life.

Uncle Ho, an elderly poet (about 80) who has written poems for fifty years that nobody reads: thin white hair, round glasses, a faded cotton shirt, a chipped teacup in one hand and, in the other, a poetry notebook with water-stained, wavy pages; a kind, wry smile.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### FRIEND-miu 改裝機械人的 Miu（教互補）　`friend-miu.png`
對白：「別碰那個，它會咬人。是機械貓，不是真貓。」

```
Image FRIEND-miu: dialogue portrait of one of the protagonist's friends. Square 1:1 (1024x1024). Head and shoulders, three-quarter view, centred, on a plain flat dark navy background (#151a2e) with no scenery. This portrait will be seen many times, so keep it sincere and warm (warm lamp-light colours) with a natural, wry expression and at most one small, quiet detail from their life.

Miu, a young robot tinkerer who talks to machines more than to people: welding goggles pushed up on the forehead, oil-stained overalls, short messy hair with one teal streak, a screwdriver behind one ear, and a small mechanical cat on the shoulder, gnawing on Miu's hair; a deadpan expression with a hint of pride.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### FRIEND-fong 唱粵劇的芳姐（教全光譜）　`friend-fong.png`
對白：「我是芳姐，唱了一輩子戲，觀眾越來越少，魚越來越多。」

```
Image FRIEND-fong: dialogue portrait of one of the protagonist's friends. Square 1:1 (1024x1024). Head and shoulders, three-quarter view, centred, on a plain flat dark navy background (#151a2e) with no scenery. This portrait will be seen many times, so keep it sincere and warm (warm lamp-light colours) with a natural, wry expression and at most one small, quiet detail from their life.

Sister Fong, a Cantonese opera singer in her fifties: hair in an elegant bun, partial stage make-up with rose-red around the eyes, the embroidered collar of a red opera costume, a folding fan held near her chin; a proud, theatrical expression. One small detail: her hairpin is a little silver fish, because these days her audience has more fish than people.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### FRIEND-chan 修船的老陳（教矛盾）　`friend-chan.png`
對白：「這根桅杆我換了三次，它還是歪的。像我。」

```
Image FRIEND-chan: dialogue portrait of one of the protagonist's friends. Square 1:1 (1024x1024). Head and shoulders, three-quarter view, centred, on a plain flat dark navy background (#151a2e) with no scenery. This portrait will be seen many times, so keep it sincere and warm (warm lamp-light colours) with a natural, wry expression and at most one small, quiet detail from their life.

Old Chan, a weather-beaten boat repairer in their sixties: sun-darkened skin, short grey stubble, a faded fisherman's cap worn slightly crooked, a coil of rope over one shoulder, a big wrench in one hand; a gruff look but kind eyes.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### FRIEND-yu 寫歌的小雨（教鄰近色）　`friend-yu.png`
對白：「噢……你好。我在寫歌，寫不出來。」

```
Image FRIEND-yu: dialogue portrait of one of the protagonist's friends. Square 1:1 (1024x1024). Head and shoulders, three-quarter view, centred, on a plain flat dark navy background (#151a2e) with no scenery. This portrait will be seen many times, so keep it sincere and warm (warm lamp-light colours) with a natural, wry expression and at most one small, quiet detail from their life.

Siu Yu, a shy young songwriter (about 20): long dark hair partly covering one eye, an oversized yellow raincoat, a guitar strap over one shoulder, holding a small lyric notebook in which every line has been scribbled out; a tired, gentle half-smile.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### FRIEND-mary 開糖水舖的 Mary 姐（教分裂互補）　`friend-mary.png`
對白：「我叫 Mary 姐，這間舖開了三代，水浸了兩次。」

```
Image FRIEND-mary: dialogue portrait of one of the protagonist's friends. Square 1:1 (1024x1024). Head and shoulders, three-quarter view, centred, on a plain flat dark navy background (#151a2e) with no scenery. This portrait will be seen many times, so keep it sincere and warm (warm lamp-light colours) with a natural, wry expression and at most one small, quiet detail from their life.

Sister Mary, the warm, plump owner of a third-generation dessert shop (about 50): permed hair, an apron with a small embroidered mango and a faded tide-line stain across it from the last flood, holding out a steaming bowl of red bean soup, laughing.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

### 第三批：結局（6 張）與主視覺（直）

用途：結局「人類樣本檔案」的頂部插圖，會裁成 16:9。先有心酸，再有一個苦澀的細節；笑話要苦，不要刻薄。

#### END-archived 人才庫（最常見的結局）　`end-archived.png`
結局文字：探射燈不會再經過你的窗外。你還在浮城，只是不再被看見。
笑位（安靜的）：探射燈掃過你的窗，停在隔壁的廣告牌上。

```
Image END-archived: ending illustration. Landscape 3:2 (1536x1024); it will be cropped to 16:9 through the middle, so keep the top and bottom 8% free of important details. Sadness first, then one bitter detail; never cruel.

Visual joke (quiet and sad): the searchlight passes over your window and settles on the billboard next door.

Scene: night, steady rain. Inside a tiny low-floor flat in a flooded tenement, the Everyman sits on the windowsill hugging their knees, surrounded by stacks of unfinished drawings. Flood water laps just below the window frame. The alien saucer's searchlight sweeps past their window without stopping and comes to rest, bright and steady, on a giant advertising billboard next door: a smiling mascot giving a thumbs-up. Mood: quiet and overlooked; you are still here, just no longer seen.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### END-heavy 良知太重（靈魂超過 21 克）　`end-heavy.png`
結局文字：光束嘗試把你拉起來，卻拉不動……你留在浮城，背著這份重量繼續生活。
笑位：良知太重，外星人的光束拉不動你；外星人看着紅色的超重警告，搖搖頭。

```
Image END-heavy: ending illustration. Landscape 3:2 (1536x1024); it will be cropped to 16:9 through the middle, so keep the top and bottom 8% free of important details. Sadness first, then one bitter detail; never cruel.

Visual joke: your conscience is too heavy for the alien elevator.

Scene: night on a tenement rooftop. A saucer's tractor beam strains to lift the Everyman, who hovers only a few centimetres off the roof, held down by a glowing, heavy, heart-shaped stone on a chain that rests on the rooftop like an anchor. In the saucer's window, one alien looks at a scale display flashing red and calmly shakes their head; another checks a wristwatch. Neighbours watch silently from their windows. Mood: tragicomic; they will stay, and carry this weight.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### END-death 死亡（通用）　`end-death.png`
死因有 141 種，文字已經寫了黑色幽默的墓誌銘；圖只負責氣氛。
笑位：連喪禮也是外判的：紙箱當棺材，送花的無人機要你評分。

```
Image END-death: ending illustration. Landscape 3:2 (1536x1024); it will be cropped to 16:9 through the middle, so keep the top and bottom 8% free of important details. Sadness first, then one bitter detail; never cruel. No bodies, nothing gory.

Visual joke: even your funeral is gig work.

Scene: a flooded old-town canal at dawn. A cardboard delivery box, used as a coffin, floats past with a single candle on top. The only mourner is a stray cat on a windowsill. A delivery drone drops a plastic-wrapped bouquet onto the box and immediately projects five rating stars, waiting for a review. Above the canal, a cheerful hologram advertisement shows a smiling mascot holding a coffin: a funeral subscription plan.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### END-guardian 地球守護者（被選中但留下）　`end-guardian.png`
結局文字：你關上了窗。探射燈在窗外等了很久，最後熄滅了。
笑位：外星人看不懂一扇關上的窗。

```
Image END-guardian: ending illustration. Landscape 3:2 (1536x1024); it will be cropped to 16:9 through the middle, so keep the top and bottom 8% free of important details. Sadness first, then one bitter detail; never cruel.

Visual joke: the aliens cannot understand a closed window.

Scene: night, seen as a cut-away of one apartment. Outside the closed shutters, the saucer hovers, its searchlight pressing through the slats; in the saucer's window, an alien HR officer frowns at a clipboard and taps it, confused. Inside, in warm lamp light, the Everyman's paintings cover every wall, and neighbours crowd around a small table sharing food: an old poet with tea, a young DJ with headphones, a dessert-shop owner carrying bowls. The Everyman sits with their back to the window, laughing. Warm inside, cold outside.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### END-agent 星際特工（被選中並離開）　`end-agent.png`
結局文字：第一份工作是篩選地球人……阿星就坐在隔壁，沒有抬頭看你。
笑位：你的第一份工作，是淘汰一個和你一模一樣的人。

```
Image END-agent: ending illustration. Landscape 3:2 (1536x1024); it will be cropped to 16:9 through the middle, so keep the top and bottom 8% free of important details. Sadness first, then one bitter detail; never cruel.

Visual joke: your first job is to reject someone exactly like you.

Scene: the vast open-plan office of the Talent Bureau aboard the mothership: identical white desks in perfect rows, grey alien managers with fixed smiles and clipboards, a framed photo of an alien "employee of the month". The Everyman, now in a crisp alien staff uniform, sits at a desk holding a human candidate's file whose photo shows someone identical to the Everyman, about to drop it into a red reject tray. At the next desk, a long-lost best friend in the same uniform keeps working and does not look up. Through a giant window: Earth's flooded coastline.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### END-returned 被遣返　`end-returned.png`
結局文字：以「文化不契合」為由把你遣返地球。你帶著一身火花回到浮城，水位又上升了。
笑位：外星人把你當作次貨退回；但你身上仍然帶着火花。

```
Image END-returned: ending illustration. Landscape 3:2 (1536x1024); it will be cropped to 16:9 through the middle, so keep the top and bottom 8% free of important details. Sadness first, then one bitter detail; never cruel.

Visual joke: the aliens return you like a faulty product, but you come back still sparkling.

Scene: grey drizzle over a flooded street; the water is higher than before. A hatch opens in the saucer and a beam lowers the Everyman, in a crumpled alien uniform, onto a floating wooden pallet. A big return label hangs from their neck (a barcode and a red cross symbol), a small cracked star badge is pinned to the chest, and they hold a cardboard box of desk things. A few golden sparks of inspiration still flicker around their head. Neighbours glance down from their windows and go back to their noodles.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### KA-02 主視覺（直）　`ka-02-portrait.png`
用途：Steam 直式圖（748×896）和收藏庫圖（600×900）。上方留空放遊戲名稱。
笑位：同一場「面試」的直式版本：樓層愈高愈乾、愈有希望；愈低愈絕望。

```
Image KA-02: vertical key art. Portrait 2:3 (1024x1536).

Visual joke: the same audition for the apocalypse, as a vertical ladder of hope: the higher the floor, the drier and more hopeful; the lower, the more desperate.

Scene: at the top, the white saucer, with grey alien HR officers looking down with clipboards. Its searchlight ends in a red scanning line that rests on one window in the middle, where the Everyman holds up a single sheet of paper, deadpan, bathed in white light. Above and below, dozens of windows with residents holding their art up towards the light. At the bottom, flood water up to the third floor: a resident on a floating door holds a painting above their head.
Composition: leave the upper quarter fairly plain for the game logo. The lit window is the brightest point.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

### 第四批：市集、篩選日、徽章、素材包（8 張）

#### SCENE-market 二手市集　`scene-market.png`
用途：市集視窗（WO-15-07）頂部橫幅，會裁成 3:1。
笑位：甚麼都有價錢，包括別人的假牙、婚戒和骨灰盅。

```
Image SCENE-market: banner for the in-game "Second-hand Market". Landscape 3:2 (1536x1024); it will be cropped to a 3:1 strip through the middle, so keep everything important between 30% and 70% of the height.

Visual joke: everything has a price, including other people's lives.

Scene: a night market under a concrete flyover, one big stall where every item hangs from a price tag: odd trinkets on velvet, sealed foil card packs, a photocopier, a polishing wheel, and also a set of dentures, a wedding ring, an urn and a framed family portrait. The stall keeper, a tired old trader with a cat asleep on the counter, waits. Overhead, a neon sign of a smiling coin mascot buzzes.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### SCENE-review 篩選日　`scene-review.png`
用途：每輪最後的篩選日視窗（WO-15-08）：交租和靈魂秤重。
笑位：你像菜市場的貨品一樣被秤重和掃描；房東的賬簿長到拖在地上。

```
Image SCENE-review: illustration for "Screening Day", the end-of-round check. Landscape 3:2 (1536x1024); it will be cropped to 16:9 through the middle, so keep the top and bottom 8% free of important details.

Visual joke: you are weighed and scanned like produce at a market.

Scene: night on a tenement rooftop. In a saucer's beam, a giant brass balance scale floats: on one pan a small glowing orb (a human soul), on the other a small brass weight. An alien HR officer with a fixed smile scans the Everyman's forehead with a supermarket barcode scanner. On the other side, a landlord in a vest and slippers holds out a palm, with a ledger so long that it unrolls across the whole rooftop. The Everyman stands between them, holding three coins, deadpan.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### EMBLEM 星際人才發展局徽章　`emblem.png`
用途：人類樣本檔案、外星 HR 備忘錄、篩選日的印章。
笑位：發展局的標誌，其實是一部夾公仔機。

```
Image EMBLEM: logo emblem of the alien corporation "Interstellar Talent Development Bureau". Square 1:1 (1024x1024), transparent background (if transparency is not possible, use plain flat #0d1020).

Visual joke: the bureau's friendly corporate logo is literally a claw machine.

A sleek, symmetrical emblem: a smiling flying saucer lowers a claw-machine claw that is picking up a tiny human holding a paintbrush; thin circuit-like lines curve around it like a laurel wreath. Flat, only two or three colours (white, pale lime #9be36b, a touch of navy). Friendly and sinister at the same time. No letters.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### 素材包（5 個）
用途：市集的素材包（WO-15-07）。包裝像開心的零食包，笑位在「賣的是甚麼」。

##### PACK-flood 舊城潛水包（水、記憶）　`pack-flood.png`
笑位：可愛的魚吉祥物，高舉一張從水底撈來的陌生人全家福。

```
Image PACK-flood: a booster pack of "material cards" sold in the in-game market. Portrait 2:3 (1024x1536). A sealed, crinkled foil pack with crimped seals at the top and bottom, standing upright and centred, on a transparent background (if transparency is not possible, use plain flat #151a2e). The wrapper looks like cheerful corporate snack packaging with a cute mascot; the joke is in what is being sold. No words or numbers anywhere.

Theme "Old Town Dive", teal and gold: a cute cartoon fish mascot in a diving mask proudly holds up a stranger's family photo it found in a drowned living room.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

##### PACK-sky 天空區垃圾包（機械、霓虹）　`pack-sky.png`
笑位：有錢人的垃圾，用金絲帶包裝成高級禮品。

```
Image PACK-sky: a booster pack of "material cards" sold in the in-game market. Portrait 2:3 (1024x1536). A sealed, crinkled foil pack with crimped seals at the top and bottom, standing upright and centred, on a transparent background (if transparency is not possible, use plain flat #151a2e). The wrapper looks like cheerful corporate snack packaging with a cute mascot; the joke is in what is being sold. No words or numbers anywhere.

Theme "Sky District Junk", silver and neon magenta: the rich people's rubbish, gift-wrapped as a luxury product. A bin bag tied with a gold ribbon, overflowing with broken gadgets (a cracked robot eye, a burnt-out neon tube), presented by a smug champagne-glass mascot.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

##### PACK-street 街坊包（人情、飢餓、希望）　`pack-street.png`
笑位：價錢貼紙被一層一層地貼高。

```
Image PACK-street: a booster pack of "material cards" sold in the in-game market. Portrait 2:3 (1024x1536). A sealed, crinkled foil pack with crimped seals at the top and bottom, standing upright and centred, on a transparent background (if transparency is not possible, use plain flat #151a2e). The wrapper looks like cheerful corporate snack packaging with a cute mascot; the joke is in what is being sold. No words or numbers anywhere.

Theme "Neighbourhood", coral, orange and green: a bowl of noodles, a bowl of sweet soup and a potted plant, presented by a tired smiling dumpling mascot. A price sticker in the corner has been covered by five more price stickers, each one slightly bigger.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

##### PACK-under 地下包（反叛、憤怒、愧疚）　`pack-under.png`
笑位：整個包裝被一條黑色審查條斜斜遮住。

```
Image PACK-under: a booster pack of "material cards" sold in the in-game market. Portrait 2:3 (1024x1536). A sealed, crinkled foil pack with crimped seals at the top and bottom, standing upright and centred, on a transparent background (if transparency is not possible, use plain flat #151a2e). The wrapper looks like cheerful corporate snack packaging with a cute mascot; the joke is in what is being sold. No words or numbers anywhere.

Theme "Underground", dark violet and crimson: crossed spray-paint cans, a torn poster, a broken chain and a smouldering match, with a cute rebel-cat mascot, and a big black censor bar printed diagonally across the whole wrapper.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

##### PACK-far 遠方包（外國素材，較貴）　`pack-far.png`
笑位：度假宣傳單上的天堂海灘，棕櫚樹其實已經淹了一半。

```
Image PACK-far: a booster pack of "material cards" sold in the in-game market. Portrait 2:3 (1024x1536). A sealed, crinkled foil pack with crimped seals at the top and bottom, standing upright and centred, on a transparent background (if transparency is not possible, use plain flat #151a2e). The wrapper looks like cheerful corporate snack packaging with a cute mascot; the joke is in what is being sold. No words or numbers anywhere.

Theme "Far Away", lavender and gold with a holographic rainbow sheen (this is the rarer, more expensive pack): a glossy holiday-brochure picture of a paradise beach with a sunglasses-wearing sun mascot, except that the palm trees stand half underwater and the tip of a pyramid pokes out of the sea.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

### 第五批（選做）

#### 創作桌場景（4 張）
用途：取代 CSS 畫的創作桌舞台背景。每局看 15 次，所以笑話放在左右兩端、安靜一點；會裁成 4:1 長條，中間要暗而且簡單（素材卡會放在上面）。

##### STAGE-desk 平常的晚上　`stage-desk.png`
笑位：日曆每天都劃掉；窗上用膠紙記錄水位，最新一條已經高過窗台。

```
Image STAGE-desk: wide backdrop behind the card-playing area. Landscape 3:2 (1536x1024); it will be cropped to a 4:1 strip through the middle, so keep everything important between 35% and 65% of the height. The centre must stay dark and plain because game cards will be placed on top; put the details and the joke at the left and right ends.

Visual joke: the water-level marks taped on the window have climbed above the windowsill.

Scene: late night at the protagonist's desk, seen from the front. Left end: a brass lamp casting a warm pool of light on manuscripts and a coffee mug, and a wall calendar with every single day crossed out. Right end: a window with rain outside and strips of tape marking the rising water level; the newest strip is already above the windowsill, and water glints outside.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

##### STAGE-hall 社區小展　`stage-hall.png`
笑位：觀眾席一半是紙板人；唯一的真人在前排睡着了。

```
Image STAGE-hall: wide backdrop behind the card-playing area. Landscape 3:2 (1536x1024); it will be cropped to a 4:1 strip through the middle, so keep everything important between 35% and 65% of the height. The centre must stay dark and plain because game cards will be placed on top; put the details and the joke at the left and right ends.

Visual joke: half the audience is cardboard cut-outs, and the only real person is asleep.

Scene: a small community hall on a flood-proof upper floor: red velvet curtains at both ends, triangle bunting, buzzing fluorescent tubes. Along the bottom edge, rows of folding chairs filled with flat cardboard cut-out people; in the front row, one real elderly person has fallen asleep.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

##### STAGE-gallery 畫廊聯展　`stage-gallery.png`
笑位：畫框裡只有價錢牌；有錢人在自拍，不看畫。

```
Image STAGE-gallery: wide backdrop behind the card-playing area. Landscape 3:2 (1536x1024); it will be cropped to a 4:1 strip through the middle, so keep everything important between 35% and 65% of the height. The centre must stay dark and plain because game cards will be placed on top; put the details and the joke at the left and right ends.

Visual joke: the frames contain only price tags, and the visitors photograph themselves instead.

Scene: a pristine white-cube gallery in the Sky District, track spotlights forming cones of light. At both ends, elegant gold frames hang on the white walls with nothing inside but a single dangling price tag; rich visitors in white pose for selfies in front of them. The middle of the wall is dim and empty.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

##### STAGE-ufo 外星評審　`stage-ufo.png`
笑位：評審一個睡着、一個看手機、一個未看已經寫好分數。

```
Image STAGE-ufo: wide backdrop behind the card-playing area. Landscape 3:2 (1536x1024); it will be cropped to a 4:1 strip through the middle, so keep everything important between 35% and 65% of the height. The centre must stay dark and plain because game cards will be placed on top; put the details and the joke at the left and right ends.

Visual joke: the judges are not paying attention.

Scene: the judging chamber inside the alien mothership: curved, ribbed metal walls and a tractor-beam core glowing pale green at the top centre. At the far left and far right, grey alien judges in suits sit behind a long curved bench: one is asleep, one scrolls a phone, and one has already raised a scorecard before anything has happened (the card shows only a symbol).
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### 出國明信片（6 張，取代通用的 DAY-trip）
用途：稀有生活卡「出國：X」。笑位：世界末日的旅遊業。每張先貼共用的開頭，再接該地區的內容。

```
Image TRIP-<region>: travel postcard for the rare "Go Abroad" day card. Landscape 3:2 (1536x1024), cropped to a 2:1 banner through the middle and shown small, so use one main subject and big shapes.
Visual joke: tourism at the end of the world. Every place is partly flooded and full of tourists photographing it.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
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
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### ICON 遊戲圖示　`icon.png`
用途：Steam 社群圖示（184×184）、網頁圖示。和徽章同一個笑位，方便記認。

```
Image ICON: game icon. Square 1:1 (1024x1024), transparent background (if transparency is not possible, use plain flat #0d1020).

Visual joke: aliens pick talent the way you play a claw machine.

A claw-machine claw hangs from the underside of a white saucer and lifts a tiny person holding a pencil. Very chunky pixels and bold, simple shapes with maximum contrast, so it reads at tiny sizes.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

#### 另外三個結局
`END-perfect` 是「被選中」的變化（靈魂很輕的時候）；`END-grey`、`END-ordinary` 只在舊模式出現。

`END-perfect`：結局文字「你的靈魂只有幾克，輕得像一張表格。你篩選地球人時，一點也不猶豫。」笑位：你的臉變成了外星人的標準笑容；靈魂只剩一張表格。

```
Image END-perfect: ending illustration in the same office and framing as image END-agent. Landscape 3:2 (1536x1024), cropped to 16:9 through the middle. Sadness first, then one bitter detail; never cruel.

Visual joke: you have become the perfect employee: your face is now the aliens' face, and your soul is as light as a form.

Scene: the same alien office as END-agent, but colder and almost monochrome. The Everyman's skin has turned grey and their face wears exactly the same fixed smile as the aliens; they stamp red crosses onto human files at machine speed. Their reflection in the dark window is an alien. Above their head floats a single blank form, all that is left of their soul.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

`END-grey`：結局文字「你沒有死，只是不再思考。浮城多了一個非常有效率的標註員。」笑位：你終於當上了「本月最佳員工」，在你變成灰色之後。

```
Image END-grey: ending illustration. Landscape 3:2 (1536x1024), cropped to 16:9 through the middle. Sadness first, then one bitter detail; never cruel.

Visual joke: you finally became employee of the month, after you turned grey.

Scene: a night office of identical cubicles where workers label photos on monitors. The Everyman sits perfectly upright in profile, completely grey like a stone statue (skin, clothes, hair), eyes empty, clicking mechanically. On the wall, a framed "employee of the month" photo shows the same grey face. The whole picture is greyscale except the cold monitor glow and one tiny, dim pink spark on the desk.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

`END-ordinary`：結局文字「探射燈今晚沒有停在你的窗外……而你仍然在這裡。」笑位：外星人走了，房東沒有。

```
Image END-ordinary: ending illustration. Landscape 3:2 (1536x1024), cropped to 16:9 through the middle. Sadness first, then one bitter detail; never cruel.

Visual joke: the aliens leave; the landlord doesn't.

Scene: dawn on a rooftop garden. The Everyman sits on a plastic stool with a cup of tea; the water has risen to the edge of the roof and laps at their slippers; their drawings hang drying on the laundry line. Far away, the alien saucers fly off into the sunrise. Close by, the landlord's little boat is already approaching, ledger in hand. Bittersweet and quiet.
Same rules as set at the start (no anime or chibi features, muted world colours, no text).
```

---

## 九、收到圖之後（Claude）

1. **檢查**：文字、亂碼、手指、風格是否一致、構圖能不能裁切、縮小之後笑位還看不看得出。不合格的列出來請你重做。
2. **像素化**：縮到原生像素、減色、對齊色票；人物頭像和素材包去背。原圖不放進遊戲。
3. **美術整合工單**（暫定 WO-15-11，排在 WO-15-08 之後，交給 Gemini）：
   - 生活卡的卡頂橫幅（同時保證 WO-15-08 的「桌面第一屏看到三張卡」）；
   - 朋友頭像放進朋友卡和聊天視窗；
   - 結局插圖放在「人類樣本檔案」頂部；
   - 市集橫幅、素材包、篩選日插圖、徽章；
   - 手機版面、減少動態效果；單一 HTML 的大小上限改為 2.5 MB。
4. **Steam**：遊戲名稱標誌由我用遊戲標題的字型做成透明 PNG，再和主視覺合成各種尺寸（2024 年起的要求是：頁首 920×430、小 462×174、主要 1232×706、直式 748×896、收藏庫 600×900、收藏庫大圖 3840×1240、標誌 1280×720；上傳時以 Steamworks 的最新說明為準）。

## 十、注意事項

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
