# 創作之夜的歌：音樂分軌規格（2026-11-04）

製作人的方向：

- 歌由製作人用 Google Flow Music 生成大量分軌；
- 程式負責把分軌按玩家的選擇編成一首歌；
- 效果要非常有創作成份，令玩家有成功感。

做法和 Incredibox 一樣：所有分軌用同一個速度、同一個調、同一組和弦，所以任何組合都和諧。玩家的選擇決定以下三樣：

- 甚麼時候、哪一件樂器、奏哪一小節；
- 整首歌怎樣起、怎樣轉、怎樣收；
- 打得越好，編曲越飽滿。

**先做試做批（第五節），確定 Flow Music 生成的分軌可以對齊、可以切開，才大量生成。**

### Flow Music 能做甚麼（2026 年的公開資料，試做時請確認）

| 功能 | 資料 | 用途 |
|---|---|---|
| BPM | Lyria 3.5（2026 年 7 月）起可以直接設定 | 每首歌填同一個 BPM |
| 分軌 | 整首歌都可以下載分軌（zip，MP3 或 WAV） | 每首歌下載分軌的 zip |
| 編輯 | 可以用文字修改：刪短前奏、取代某一段、延長、改編（cover）、換樂器 | 刪前奏；同一首歌換主旋律的樂器 |
| 上載 | 可以上載自己的音樂，再改編 | 上載我做的樣板音軌（方法 B），鎖定速度和和弦 |
| 調、和弦 | 未找到可以直接設定的資料 | 寫在描述裏；或者用樣板音軌 |
| 長度 | 最長 3 分鐘 | 每首至少 16 小節 |

---

## 一、玩家的歌是怎樣組成的

- **每晚一種風格**：第一晚 lo-fi，第二晚 city pop，第三晚 synthwave。
  - 選牌時，這種風格的「樂隊」（鼓、低音、和弦）以很細的音量循環播放，這就是背景音樂。
- **每一筆是歌的一段，每張計分的素材是一小節。** 這一小節用哪個和弦，由起承轉合決定：

| 角色 | 和弦（四個和弦的循環裏） |
|---|---|
| 起 | 第 1 個和弦（主和弦） |
| 承 | 第 2、第 3 個和弦，輪流 |
| 轉 | 第 4 個和弦（緊張，想回家） |
| 合 | 第 1 個和弦（回到家） |
| 斷（接不上） | 歌停一停：那一小節只剩鼓 |

  例如「起承承轉合」就是 I–vi–IV–V–I。原曲本身就是這個循環，所以這五小節正好是原曲**連續**的五小節。程式會直接播原曲的那一段，旋律一氣呵成。
  - 結構越完整，歌越像一首真正的歌；
  - 結構斷了，旋律要跳到別的小節，甚至停一停，玩家一聽就知道。
- **素材的媒材決定哪件樂器在這一小節出場**：

| 媒材 | 樂器 |
|---|---|
| 聲 | 主旋律 |
| 身 | 敲擊和鼓的過門 |
| 數 | 電子琶音 |
| 影 | 弦樂 |
| 紙 | 人聲 |

- **素材的情緒決定主旋律用甚麼樂器**：

| 情緒 | 樂器 | 情緒 | 樂器 |
|---|---|---|---|
| 人情 | 色士風 | 機械 | 方波合成器 |
| 希望 | 鐘琴和長笛 | 愧疚 | 大提琴 |
| 水 | 有回聲的電結他 | 憤怒 | 失真合成器 |
| 記憶 | 舊鋼琴 | 霓虹 | synthwave 主音 |
| 反叛 | 破音結他 | 飢餓 | 口琴 |

**令玩家有成功感的設計**：

| 打出 | 歌的變化 |
|---|---|
| 這一筆的倍率升高 | 樂隊逐層加入，例如：×3 加低音，×6 加鼓，×10 換成副歌版。分數升，歌也一起升（實際門檻按試玩調校） |
| 完整的起承轉合 | 那一段用「副歌版」的樂隊：鼓、低音、和弦更飽滿，合的時候有重擊和鈸 |
| 具名組合或評審的委託 | 加上人聲的和聲 |
| 收工 | 掌聲和歡呼，然後播放完整的作品：前奏 → 每筆一段 → 結尾；分享頁播放同一首歌 |

---

## 二、技術規格（每一首都要遵守）

| 項目 | lo-fi | city pop | synthwave |
|---|---|---|---|
| 速度（在 BPM 設定填） | 85 | 112 | 100 |
| 調 | C 大調 | F 大調 | A 小調 |
| 四個和弦的循環（每個一小節） | Cmaj7 – Am7 – Fmaj7 – G7 | Fmaj7 – Dm7 – B♭maj7 – C7 | Am – F – C – G |
| 拍號 | 4/4 | 4/4 | 4/4 |
| 樣板音軌（方法 B 用） | `guide-lofi.mp3` | `guide-citypop.mp3` | `guide-synth.mp3` |

1. **和弦**：整首只用上面四個和弦，每小節一個，次序不變。這一點最重要，否則組合起來會走音。
2. **長度**：至少 16 小節（lo-fi 約 45 秒）。生成得更長也可以，多出來的小節會成為更多變化。
3. **開頭**：最好第一拍就開始。有前奏也可以，我會自己找出小節線；前奏太長，就用 Flow Music 的編輯功能刪短。
4. **分軌**：每首歌下載**全部分軌的 zip**，不用改裏面的檔名，也不用調整音量。
5. **格式**：MP3（或 WAV）。GitHub 網頁每個檔案最大 25 MB，zip 太大就改用 MP3。
6. **除了人聲那一首，全部是純音樂。**

### 樣板音軌

我用程式做了三條樣板音軌：每條 16 小節加 1 小節結尾，只有鼓、低音和和弦。
- 速度、調和和弦都準確，第一拍就開始。
- 用 `tools/music-check.py` 檢查過：每一小節的和弦都正確。
- 檔案放在倉庫的 `docs/music/guide/`，我也會直接傳給你。

如果 Flow Music 可以上載音樂再改編，所有的歌都從同一條樣板改編（方法 B），對齊和和弦最準。

---

## 三、要生成的歌（每種風格 16 首）

Flow Music 拆分軌時，未必把每件樂器分開，常見的是「人聲、鼓、低音、其他」四條。所以除了樂隊的兩首，**每首歌只有鼓、低音和一件旋律樂器**：這樣「其他」那一條就只有那件樂器，可以單獨使用。

zip 的檔名：`ns-<風格>-<歌>.zip`。風格是 `lofi`、`citypop` 或 `synth`，例如 `ns-lofi-lead-warmth.zip`。

| 歌 | 內容 | 遊戲裏的用途 |
|---|---|---|
| `base` 主歌版樂隊 | 中等能量：鼓、低音、電鋼琴或結他的和弦、柔和的墊音 | 背景音樂、每一段的伴奏 |
| `full` 副歌版樂隊 | 高能量：鼓更滿、低音更活躍、和弦更密，加銅管 | 起承轉合完整的一段、最後一段、結尾 |
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
| `perc` | 只有敲擊：手鼓、沙槌、拍手、通鼓的過門（每四小節一個過門） | 身、DJ 小妹 |

**主旋律的另一個做法**：Flow Music 的「換樂器」編輯能保持旋律的話，可以先做好 `lead-warmth`，再把色士風換成其他九種樂器。這樣十種情緒奏同一條旋律，只是樂器不同。玩家連續打出不同情緒時，旋律就在樂器之間傳遞，像電影配樂的主題。

**音效由我用程式做**：上升音效、重擊、唱片沙沙聲、雨聲。如果 Flow Music 做得到，可以加一首十秒的掌聲和歡呼 `ns-all-applause.zip`；做不到，我用程式合成。

---

## 四、Prompt

按 Flow Music 的介面調整：
- 有 BPM 設定就直接填；
- 有「純音樂」的開關就打開（`vocal` 那一首除外）；
- 其他寫在描述裏。

### 方法 A：只用文字

```
Instrumental <風格>, <BPM> BPM, key of <調>, 4/4.
The chord changes every bar, repeating this 4-bar loop for the whole song: <和弦>.
No intro, no breakdown, no key change: the loop starts on the first beat and keeps going.
Instruments: <樂器>, nothing else.
<氣氛>
```

### 方法 B：上載樣板音軌再改編

上載那種風格的 `guide-<風格>.mp3`，再寫：

```
Use the uploaded track as the exact blueprint: keep its tempo (<BPM> BPM), key (<調>), bar lines and chord changes (<和弦>, one chord per bar) exactly the same, from the first beat to the end.
Re-arrange it as instrumental <風格> with these instruments only: <樂器>.
<氣氛>
```

### 填入的內容

| 風格 | `<風格>` | `<調>` | `<和弦>` | `<氣氛>` |
|---|---|---|---|---|
| lo-fi | `lo-fi hip hop` | `C major` | `Cmaj7 \| Am7 \| Fmaj7 \| G7` | `Warm, nostalgic, late night, slightly dusty.` |
| city pop | `1980s Japanese city pop` | `F major` | `Fmaj7 \| Dm7 \| Bbmaj7 \| C7` | `Bright, glossy, a night drive by the sea.` |
| synthwave | `synthwave` | `A minor` | `Am \| F \| C \| G` | `Neon, cinematic, a retro-futuristic night city.` |

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

`vocal` 那一首要刪去 prompt 裏的 `Instrumental`（方法 B 是 `instrumental`），也不要打開「純音樂」。

---

## 五、試做批（先做 lo-fi 的 3 首）

| 次序 | 歌 | 方法 A 的 zip | 方法 B 的 zip（可以上載才做） |
|---|---|---|---|
| 1 | `base` | `ns-lofi-base-a.zip` | `ns-lofi-base-b.zip` |
| 2 | `lead-warmth` | `ns-lofi-lead-warmth-a.zip` | `ns-lofi-lead-warmth-b.zip` |
| 3 | `vocal` | `ns-lofi-vocal-a.zip` | `ns-lofi-vocal-b.zip` |

收到之後我會：
1. 用 `tools/music-check.py` 檢查每首歌的速度、小節線和每小節的和弦，比較兩個方法哪個準；
2. 在原型裏編一首「玩家的歌」給你聽：
   - 選牌時有背景樂隊；
   - 計分時每張素材加一小節；
   - 收工時播完整版。

沒有問題，才用準的那個方法做其餘的歌。

試做時請順便告訴我：
- BPM 設定在哪裏？生成出來的速度準不準？
- 有沒有調或和弦的設定？
- 下載的分軌有幾條？叫甚麼名字？
- 可以上載自己的音樂再改編嗎？改編之後速度和和弦有沒有保持？
- 「換樂器」的編輯會不會保持原來的旋律？

---

## 六、上載

zip 上載到 `main` 分支的 `music-src/night/` 資料夾，不用解壓。檔案很多的話，可以分幾次上載。

## 七、收到之後（Claude）

1. **檢查**：用 `tools/music-check.py` 找出每首歌的速度、小節線和每一小節的和弦。
   - 這個工具不假設歌從第一拍開始，也不假設和弦的次序。
   - 用樣板音軌測試過：17 小節全部正確；前面加了 1.3 秒雜音，也找得到小節線。
2. **挑選**：和弦不在四個之內、或者速度不對的小節不用。整首速度不對，就請你重做。
3. **音量**：每條分軌統一響度（EBU R128），樂器之間的比例由程式控制。
4. **壓縮**：每條分軌一個 MP3（約 128 kbps）。
   - 遊戲現有的背景音樂也是 MP3，所有瀏覽器都可以播。
   - `night-music.json` 記錄每條分軌每一小節的開始時間和和弦。
   - 播放時從檔案裏取出那一小節，不用切成幾百個小檔案。
5. **編曲引擎**：新的 `music.js` 用 WebAudio 按小節排程播放這些片段，取代第四版的合成器。
   - 同一筆裏，盡量播原曲連續的小節。
   - 小節之間交叉淡化幾毫秒，避免爆聲。
   - 倍率越高，樂隊越滿。
   - 混音、synthwave 的「呼吸感」和 lo-fi 的低通，仍然由程式處理。
