# 創作之夜的歌：音樂分軌規格（2026-11-04）

製作人的方向：

- 歌由製作人用 Flow Music 生成大量分軌；
- 程式負責把分軌按玩家的選擇編成一首歌；
- 效果要非常有創作成份，令玩家有成功感。

做法和 Incredibox 一樣：所有分軌用同一個速度、同一個調、同一組和弦，所以任何組合都和諧。玩家的選擇決定以下三樣：

- 甚麼時候、哪一件樂器、奏哪一小節；
- 整首歌怎樣起、怎樣轉、怎樣收；
- 打得越好，編曲越飽滿。

**先做試做批（第五節），確定 Flow Music 生成的分軌可以對齊、可以切開，才大量生成。**

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

  例如「起承承轉合」就是 I–vi–IV–V–I。結構完整，聽起來就是完整的一句。
- **素材的媒材決定哪件樂器在這一小節出場**：

| 媒材 | 樂器 |
|---|---|
| 聲 | 主旋律 |
| 身 | 鼓的過門和敲擊 |
| 數 | 電子琶音 |
| 影 | 弦樂 |
| 紙 | 人聲 |

- **素材的情緒決定主旋律用甚麼樂器**：

| 情緒 | 樂器 | 情緒 | 樂器 |
|---|---|---|---|
| 人情 | 色士風 | 機械 | 方波合成器 |
| 希望 | 鐘琴 | 愧疚 | 大提琴 |
| 水 | 有回聲的電結他 | 憤怒 | 失真合成器 |
| 記憶 | 舊鋼琴 | 霓虹 | synthwave 主音 |
| 反叛 | 破音結他 | 飢餓 | 口琴 |

**令玩家有成功感的設計**：

| 打出 | 歌的變化 |
|---|---|
| 一般的一筆 | 用「主歌版」的樂隊 |
| 完整的起承轉合 | 那一段換成「副歌版」的樂隊，鼓、低音、和弦更飽滿，合的時候有鈸 |
| 具名組合或評審的委託 | 加上人聲的和聲 |
| 收工 | 掌聲和歡呼，然後播放完整的作品：前奏 → 每筆一段 → 結尾 |

---

## 二、技術規格（每一首都要遵守）

| 項目 | lo-fi | city pop | synthwave |
|---|---|---|---|
| 速度（BPM，準確） | 85 | 112 | 100 |
| 調 | C 大調 | F 大調 | A 小調 |
| 四個和弦的循環（每個一小節） | Cmaj7 – Am7 – Fmaj7 – G7 | Fmaj7 – Dm7 – B♭maj7 – C7 | Am – F – C – G |
| 拍號 | 4/4 | 4/4 | 4/4 |

1. **長度**：每首 16 小節，即四個和弦循環四次。第一拍就開始，不要前奏、不要淡入；最後讓聲音自然收尾即可。
2. **和弦**：整首只用上面四個和弦，每小節一個，次序不變。這一點最重要，否則切開之後會走音。
3. **分軌**：同一首歌的所有分軌要一起導出，長度相同、起點相同。不要個別調整音量。
4. **格式**：MP3 320 kbps（或 WAV），44.1 kHz 或 48 kHz。
5. **除了人聲那一首，全部是純音樂**，不要歌聲。
6. **混音**：分軌保持 Flow Music 導出時的音量和效果，不要個別正規化。

---

## 三、要生成的歌（每種風格 15 首）

檔名 `ns-<風格>-<歌>-<分軌>.mp3`；風格是 `lofi`、`citypop` 或 `synth`。

| 歌 | 需要的分軌 | 內容 | 用途 |
|---|---|---|---|
| `base` 主歌版樂隊 | drums、bass、keys、pad | 中等能量：鼓、低音、電鋼琴或結他的和弦、背景墊音 | 背景音樂、每段的基本伴奏 |
| `full` 副歌版樂隊 | drums、bass、keys、strings | 高能量：鼓更滿、低音更活、和弦更密，加弦樂 | 起承轉合完整時、最後一段、結尾 |
| `lead-warmth` | lead | 色士風主旋律（溫暖） | 聲素材：人情 |
| `lead-hope` | lead | 鐘琴或長笛（明亮） | 聲素材：希望 |
| `lead-water` | lead | 有回聲的乾淨電結他 | 聲素材：水 |
| `lead-memory` | lead | 走音少許的舊鋼琴 | 聲素材：記憶 |
| `lead-rebel` | lead | 破音結他 | 聲素材：反叛 |
| `lead-machine` | lead | 方波合成器 | 聲素材：機械 |
| `lead-guilt` | lead | 大提琴 | 聲素材：愧疚 |
| `lead-anger` | lead | 失真合成器 | 聲素材：憤怒 |
| `lead-neon` | lead | synthwave 鋸齒波主音 | 聲素材：霓虹 |
| `lead-hunger` | lead | 口琴 | 聲素材：飢餓 |
| `vocal` | vocal | 沒有歌詞的人聲：「ooh」「aah」的旋律和和聲 | 紙素材、具名組合、Mary 姐的和音 |
| `arp` | arp | 電子琶音、十六分音符的合成器音型 | 數素材、Miu |
| `perc` | perc | 鼓的過門、通鼓、手鼓、沙槌、拍手（每四小節一個過門） | 身素材、DJ 小妹 |

lead 那十首只需要導出主旋律的分軌，其他分軌不用上載。

### 音效（每種風格一套，可以用 Flow Music 或其他方法）

| 檔名 | 內容 |
|---|---|
| `ns-<風格>-fx-riser.mp3` | 兩小節的上升音效（噪音掃頻），用在「轉」之前 |
| `ns-<風格>-fx-impact.mp3` | 一下重擊加鈸，用在「合」 |
| `ns-<風格>-fx-ending.mp3` | 兩小節的結尾：最後一個主和弦長音收尾 |
| `ns-all-fx-applause.mp3` | 十秒的掌聲和歡呼（收工時） |
| `ns-all-fx-vinyl.mp3` | 三十秒可循環的唱片沙沙聲（lo-fi 的底噪） |
| `ns-all-fx-rain.mp3` | 三十秒可循環的雨聲 |

---

## 四、Prompt

Flow Music 的寫法未必相同，以下是建議的描述，按 Flow Music 的介面調整：可以填 BPM、調和和弦的就直接填，不能填的就寫在描述裏。

### lo-fi（第一晚）

```
Instrumental lo-fi hip hop, exactly 85 BPM, key of C major, 4/4.
Chord progression, one chord per bar, repeated for 16 bars: Cmaj7 | Am7 | Fmaj7 | G7.
Starts immediately on beat 1 with no intro and no fade-in. Loopable.
Instruments: <分軌的樂器>.
Warm, nostalgic, late night, slightly dusty vinyl texture. No vocals.
```

### city pop（第二晚）

```
Instrumental 1980s Japanese city pop, exactly 112 BPM, key of F major, 4/4.
Chord progression, one chord per bar, repeated for 16 bars: Fmaj7 | Dm7 | Bbmaj7 | C7.
Starts immediately on beat 1 with no intro and no fade-in. Loopable.
Instruments: <分軌的樂器>.
Bright, glossy, nighttime drive by the sea. No vocals.
```

### synthwave（第三晚）

```
Instrumental synthwave, exactly 100 BPM, key of A minor, 4/4.
Chord progression, one chord per bar, repeated for 16 bars: Am | F | C | G.
Starts immediately on beat 1 with no intro and no fade-in. Loopable.
Instruments: <分軌的樂器>.
Neon, cinematic, retro-futuristic night city. No vocals.
```

`<分軌的樂器>` 的寫法：

| 歌 | 填入 |
|---|---|
| `base` | `drums, bass, electric piano chords, soft synth pad (medium energy, verse feel)` |
| `full` | `full drums, busy bass, dense piano or guitar chords, lush strings (high energy, chorus feel)` |
| `lead-warmth` | `a warm tenor saxophone playing a memorable melody, sparse backing` |
| `lead-hope` | `a glockenspiel and flute playing a bright hopeful melody, sparse backing` |
| `lead-water` | `a clean electric guitar with echo delay playing a flowing melody, sparse backing` |
| `lead-memory` | `a slightly detuned old upright piano playing a nostalgic melody, sparse backing` |
| `lead-rebel` | `an overdriven electric guitar playing a defiant melody, sparse backing` |
| `lead-machine` | `a square-wave synthesizer playing a robotic melody, sparse backing` |
| `lead-guilt` | `a solo cello playing a sad, regretful melody, sparse backing` |
| `lead-anger` | `a distorted aggressive synth lead playing an intense melody, sparse backing` |
| `lead-neon` | `a bright sawtooth synthwave lead playing a soaring melody, sparse backing` |
| `lead-hunger` | `a lonely harmonica playing a thin, hungry melody, sparse backing` |
| `vocal` | `wordless vocals only, "ooh" and "aah" melody with harmonies, no lyrics` |
| `arp` | `a sixteenth-note synthesizer arpeggio following the chords` |
| `perc` | `percussion only: drum fills every four bars, toms, congas, shaker, claps` |

---

## 五、試做批（先做這 3 首）

先做 lo-fi 的 3 首：
- `base`：上載 drums、bass、keys、pad 四條分軌；
- `lead-warmth`：上載 lead；
- `vocal`：上載 vocal。

收到之後我會：
1. 檢查速度、起點和和弦有沒有對齊；
2. 按小節切開；
3. 在原型裏編一首「玩家的歌」給你聽：選牌時有背景樂隊，計分時每張素材加一小節，收工時播完整版。

沒有問題，才做其餘的分軌。

試做時請順便告訴我 Flow Music 的以下幾點：
- 能不能指定準確的 BPM、調和和弦？
- 能不能導出分軌？導出的分軌有哪幾條？
- 生成的長度可以控制嗎？

做不到的地方，我會改用分析的方法：自己找出拍子和每一小節的和弦。

---

## 六、上載

上載到 `main` 分支的 `music-src/night/` 資料夾，按檔名命名。檔案很多的話，可以分幾次上載。

## 七、收到之後（Claude）

1. **對齊**：用起音偵測找出第一拍；按 BPM 計算每一小節，檢查分軌有沒有走速。
2. **切開**：每條分軌切成一小節一個檔案，例如 `lofi/lead-warmth/bar-03.ogg`。
   - 16 小節裏，每個和弦有 4 個版本，程式輪流使用，令每次的歌都不一樣。
   - 切口加 5 毫秒的淡入淡出，避免爆聲。
3. **確認和弦**：用色度分析確認每一小節的和弦和第二節的表一致；不一致的小節不用。
4. **壓縮**：轉成 OGG（約 128 kbps），全部分軌加起來控制在 20 MB 左右，記錄在 `night-music.json`。
5. **編曲引擎**：新的 `music.js` 用 WebAudio 按小節排程播放這些片段，取代第四版的合成器。混音、淡入、
   synthwave 的「呼吸感」和 lo-fi 的低通，仍然由程式處理。
