# 創作之夜的歌：音樂分軌規格（2026-11-04，試做後修訂）

製作人的方向：

- 歌由製作人用 Google Flow Music 生成大量分軌；
- 程式負責把分軌按玩家的選擇編成一首歌；
- 效果要非常有創作成份，令玩家有成功感。

做法和 Incredibox 相似：所有素材放在同一個速度、同一個調裏，所以可以自由組合。不同的是，這些素材來自真正的整首歌。程式先逐小節標出和弦，組合時按和弦配對整句樂句。玩家的選擇決定以下三樣：

- 甚麼時候、哪一件樂器、奏哪一句；
- 整首歌怎樣起、怎樣轉、怎樣收；
- 打得越好，編曲越飽滿。

**試做批已經完成（第五節）：只用文字生成也可以，大量生成按第三節的分期進行。**

### Flow Music 實際做到甚麼（試做的結果）

| 項目 | 結果 | 處理 |
|---|---|---|
| 分軌 | 每首 4 條：vocals、drums、bass、other（M4A，48 kHz，約 3 分鐘） | 直接用 |
| BPM | `base` 是 85.01（準確）；另外兩首是 86.00 和 87.02 | 程式用 rubberband 變速到 85（差 1–3%，聽不出） |
| 調 | 三首都不同：降 D 大調、F 小調、B 小調 | 程式按音高分佈移調到母曲的調（這次 +5 和 −1 半音） |
| 和弦 | 沒有照指定的循環走，各有各的進行 | 程式逐小節標出和弦，組合時按和弦配對 |
| 對齊 | 三首的小節線差 26–46 毫秒 | 程式按鼓點形狀對齊（誤差約 3 毫秒） |

結論：**BPM 一定要設定；調和和弦寫在描述裏就可以，不用強求。** 方法 B（上載樣板音軌再改編）不再是必要的。如果 Flow Music 可以上載音樂，試一首就好，對齊會更準。

---

## 一、玩家的歌是怎樣組成的

- **每晚一首「母曲」**：第一晚 lo-fi，第二晚 city pop，第三晚 synthwave。
  - 母曲就是那一晚的樂隊（鼓、低音、和弦），也決定那一晚的調。
  - 選牌時，母曲以很細的音量、隔着牆似的（低通）循環播放，這就是背景音樂。
- **每一筆是歌的一段，每張計分的素材是一小節。** 起承轉合決定這一小節的和弦功能，程式在母曲裏找出那些小節：

| 角色 | 和弦功能 | 試做的母曲（降 D 大調） |
|---|---|---|
| 起 | 主和弦 I | D♭maj7 |
| 承 | ii、iii、vi、IV | E♭m7、Fm7、B♭m7、G♭maj7 |
| 轉 | 屬和弦 V | A♭7 |
| 合 | 回到 I | D♭maj7 |
| 斷（接不上） | 歌停一停：那一小節只剩鼓 | |

- **怎樣選小節**：程式選的路徑會令整段盡量是原曲連續的小節。跳接時，只跳到「和弦轉換一模一樣」的地方，所以聽起來仍然順。
  - 例如試做時的「起承承轉合」，選了母曲第 7、8、9、6、7 小節：I–iii–ii–V–I。
  - 第 9 跳到第 6 小節，是因為第 5 小節和第 9 小節的和弦相同。
- **素材的媒材決定哪件樂器在這一小節出場**：

| 媒材 | 樂器 |
|---|---|
| 聲 | 主旋律（按情緒選樂器） |
| 身 | 敲擊和鼓的過門 |
| 數 | 電子琶音 |
| 影 | 弦樂 |
| 紙 | 人聲 |

  - 同一種媒材連續幾張，就取原曲連續的一整句；
  - 單獨一張，就選和弦最配合的一小節；
  - 用過的小節會盡量避開，令整首歌少重複。
- **素材的情緒決定主旋律用甚麼樂器**：

| 情緒 | 樂器 | 情緒 | 樂器 |
|---|---|---|---|
| 人情 | 色士風 | 機械 | 方波合成器 |
| 希望 | 鐘琴和長笛 | 愧疚 | 大提琴 |
| 水 | 有回聲的電結他 | 憤怒 | 失真合成器 |
| 記憶 | 舊鋼琴 | 霓虹 | synthwave 主音 |
| 反叛 | 破音結他 | 飢餓 | 口琴 |

**令玩家有成功感的設計**（試做的示範都已經做出來）：

| 打出 | 歌的變化 |
|---|---|
| 這一筆的倍率升高 | 樂隊逐層加入：先只有和弦，再加低音，再加鼓。分數升，歌也一起升（實際門檻按試玩調校） |
| 完整的起承轉合 | 「轉」之前有上升音效，「合」有重擊；路徑是原曲連續的樂句 |
| 具名組合或評審的委託 | 加上人聲的和聲 |
| 收工 | 播放完整作品：前奏 → 每筆一段 → 結尾 → 掌聲；分享頁播放同一首歌 |

---

## 二、技術規格（每一首都要遵守）

| 項目 | lo-fi | city pop | synthwave |
|---|---|---|---|
| 速度（**一定要在 BPM 設定填**） | 85 | 112 | 100 |
| 建議的調（寫在描述裏） | C 大調 | F 大調 | A 小調 |
| 建議的和弦（寫在描述裏） | Cmaj7 – Am7 – Fmaj7 – G7 | Fmaj7 – Dm7 – B♭maj7 – C7 | Am – F – C – G |
| 拍號 | 4/4 | 4/4 | 4/4 |

1. **BPM**：一定要設定，這是唯一必須準確的項目。
2. **調和和弦**：寫在描述裏；生成出來不同也沒有關係，程式會處理。整首不要轉調。
3. **長度**：Flow Music 預設約 3 分鐘，很好：小節越多，變化越多。
4. **分軌**：每首歌下載全部分軌的 zip，不用解壓，不用改裏面的檔名。
5. **格式**：zip 裏是 M4A 或 MP3 都可以。GitHub 網頁每個檔案最大 25 MB，試做的 zip 是 20–25 MB，剛好在上限之內。太大的話，把裏面的檔案分開上載到同名的資料夾。
6. **除了 `vocal` 那一首，全部是純音樂。**

### 樣板音軌（可選）

`docs/music/guide/` 有三條樣板音軌，速度、調和和弦都準確。Flow Music 可以上載音樂再改編的話，可以用它們做方法 B，但不是必要的。

---

## 三、要生成的歌（每種風格 16 首，分三期）

| 期 | 內容 | 首數（已有） |
|---|---|---|
| 第一期 | lo-fi 全套 | 16（3） |
| 第二期 | city pop 全套 | 16（0） |
| 第三期 | synthwave 全套 | 16（0） |

第一期完成之後，我就可以做出完整的一晚：真的畫、真的歌。

Flow Music 拆分軌時只分「人聲、鼓、低音、其他」四條，所以除了樂隊那兩首，**每首歌只有鼓、低音和一件樂器**。這樣「其他」那一條就只有那件樂器，可以單獨使用。

zip 的檔名：`ns-<風格>-<歌>.zip`。風格是 `lofi`、`citypop` 或 `synth`，例如 `ns-citypop-lead-warmth.zip`。同一首想多做一個版本，就加 `-2`，例如 `ns-lofi-lead-hope-2.zip`。版本越多，變化越多。

| 歌 | 內容 | 遊戲裏的用途 |
|---|---|---|
| `base` 母曲 | 中等能量：鼓、低音、電鋼琴或結他的和弦、柔和的墊音 | 那一晚的樂隊和調、背景音樂 |
| `full` 副歌版樂隊 | 高能量：鼓更滿、低音更活躍、和弦更密，加銅管 | 起承轉合完整的一段、最後一段 |
| `lead-warmth` | 鼓、低音、溫暖的色士風 | 聲：人情 |
| `lead-hope` | 鼓、低音、鐘琴和長笛 | 聲：希望 |
| `lead-water` | 鼓、低音、有回聲的乾淨電結他 | 聲：水 |
| `lead-memory` | 鼓、低音、走音少許的舊鋼琴 | 聲：記憶 |
| `lead-rebel` | 鼓、低音、破音結他 | 聲：反叛 |
| `lead-machine` | 鼓、低音、方波合成器 | 聲：機械 |
| `lead-guilt` | 鼓、低音、大提琴 | 聲：愧疚 |
| `lead-anger` | 鼓、低音、失真合成器 | 聲：憤怒 |
| `lead-neon` | 鼓、低音、synthwave 鋸齒波主音 | 聲：霓虹 |
| `lead-hunger` | 鼓、低音、口琴 | 聲：飢餓 |
| `strings` | 鼓、低音、弦樂團 | 影 |
| `arp` | 鼓、低音、十六分音符的合成器琶音 | 數、Miu |
| `vocal` | 樂隊加沒有歌詞的人聲（「ooh」「aah」的旋律和和聲） | 紙、具名組合、Mary 姐的和音 |
| `perc` | 只有敲擊：手鼓、沙槌、拍手、通鼓的過門 | 身、DJ 小妹 |

音效由程式做：上升音效、重擊、掌聲。試做的示範已經用上。

---

## 四、Prompt

- 在 BPM 設定填那種風格的速度；
- 有「純音樂」的開關就打開（`vocal` 除外）；
- 描述照下面寫。

```
Instrumental <風格>, <BPM> BPM, key of <調>, 4/4.
One steady chord loop for the whole song, for example: <和弦>. No key change, no tempo change.
Instruments: <樂器>, nothing else.
<氣氛>
```

| 風格 | `<風格>` | `<BPM>` | `<調>` | `<和弦>` | `<氣氛>` |
|---|---|---|---|---|---|
| lo-fi | `lo-fi hip hop` | `85` | `C major` | `Cmaj7 \| Am7 \| Fmaj7 \| G7` | `Warm, nostalgic, late night, slightly dusty.` |
| city pop | `1980s Japanese city pop` | `112` | `F major` | `Fmaj7 \| Dm7 \| Bbmaj7 \| C7` | `Bright, glossy, a night drive by the sea.` |
| synthwave | `synthwave` | `100` | `A minor` | `Am \| F \| C \| G` | `Neon, cinematic, a retro-futuristic night city.` |

| 歌 | `<樂器>` |
|---|---|
| `base` | `drums, bass, electric piano chords, a soft synth pad (medium energy, verse feel)` |
| `full` | `full drums with crash cymbals, busy bass, dense piano or guitar chords, brass stabs (high energy, chorus feel)` |
| `lead-warmth` | `drums, bass and a warm tenor saxophone playing a memorable melody` |
| `lead-hope` | `drums, bass and a glockenspiel doubled by a flute playing a bright, hopeful melody` |
| `lead-water` | `drums, bass and a clean electric guitar with echo delay playing a flowing melody` |
| `lead-memory` | `drums, bass and a slightly detuned old upright piano playing a nostalgic melody` |
| `lead-rebel` | `drums, bass and an overdriven electric guitar playing a defiant melody` |
| `lead-machine` | `drums, bass and a square-wave synthesizer playing a robotic melody` |
| `lead-guilt` | `drums, bass and a solo cello playing a sad, regretful melody` |
| `lead-anger` | `drums, bass and a distorted, aggressive synth lead playing an intense melody` |
| `lead-neon` | `drums, bass and a bright sawtooth synthwave lead playing a soaring melody` |
| `lead-hunger` | `drums, bass and a lonely harmonica playing a thin, hungry melody` |
| `strings` | `drums, bass and a string section playing long, emotional lines` |
| `arp` | `drums, bass and one synthesizer playing a sixteenth-note arpeggio that follows the chords` |
| `perc` | `percussion only: congas, shaker, claps and a tom fill every four bars; no drum kit, no bass` |
| `vocal` | `drums, bass, electric piano and wordless vocals ("ooh", "aah") with harmonies, no lyrics` |

`vocal` 那一首要刪去 prompt 開頭的 `Instrumental`，也不要打開「純音樂」。

---

## 五、試做批（已完成）

製作人在 2026-11-04 上載了 lo-fi 的 `base`、`lead-warmth`、`vocal`（方法 A，只用文字）。

處理：用 `tools/music-build.py`，以 `base` 做母曲。

| 歌 | 生成的速度和調 | 處理 |
|---|---|---|
| `base` | 85.01 BPM，降 D 大調；8 小節循環 ii–V–I–iii–ii–iii–vi–vi | 母曲，不用動 |
| `lead-warmth` | 86.00 BPM，F 小調 | 變速 ×0.988，移 +5 半音，小節線對齊 −26 毫秒 |
| `vocal` | 87.02 BPM，B 小調 | 變速 ×0.977，移 −1 半音，小節線對齊 +46 毫秒 |

示範（`tools/music-night-preview.py`）：
1. 選牌時的背景；
2. 一筆完整的「起承承轉合」；
3. 一筆斷了的「起承（斷）承」；
4. 完整作品：前奏、三筆、結尾、掌聲。

示範音檔放在審核頁。

試做時學到的：
- 調性用音高的統計（Krumhansl 的調性輪廓）來判斷，會誤判五度，例如把降 D 大調判成降 A 大調。所以改用兩個方法：
  - 主音：看和弦進行裏「V7 → I」的解決；
  - 移調：比較整首的時間平均音高分佈。
- 每首歌的小節線估計會差幾十毫秒，所以要用鼓點形狀和母曲對齊。

---

## 六、上載

zip 上載到 `main` 分支的 `music-src/night/` 資料夾，不用解壓。檔案很多的話，可以分幾次上載。

## 七、收到之後（Claude）

1. **建立小節資料庫**：`tools/music-build.py`
   - 先處理母曲：`--bpm 85 --name ns-lofi-base`；
   - 其他歌加 `--ref <母曲的 json>`。
   - 工具會分析速度、拍點和小節線（低音轉換最大的拍位），用 rubberband 變速和移調（鼓只變速），再按鼓點形狀對齊母曲。
   - 每一小節記下和弦（低音分軌定根音，其他分軌定性質）、級數和各分軌的音量，輸出到 `<名>.json`。
2. **預覽**：用 `tools/music-night-preview.py` 輸出示範，檢查響度、頻譜和每小節的和弦。
3. **壓縮**：每條分軌一個 MP3（約 128 kbps，所有瀏覽器都可以播）；播放時從檔案中取出小節，不用切成幾百個小檔案。
4. **編曲引擎**：新的 `music.js` 把 `music-night-preview.py` 的做法搬到 WebAudio，按小節排程，取代第四版的合成器：
   - 找和弦路徑、按和弦配對層；
   - 倍率越高樂隊越滿；
   - 斷的地方只剩鼓；
   - 轉之前上升，合有重擊。
