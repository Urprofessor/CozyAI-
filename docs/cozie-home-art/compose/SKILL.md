---
name: cozie-compose-art-assets
description: 为"Cozie 的家"里的胎教作曲功能（手指画旋律的作曲页、乐器和心情按键、妈妈哼唱录音、婴儿床床铃、歌曲列表、Cozie 哼歌动画）制作美术资产，统一成小屋概念图和胎教仪按键的软陶 3D 画风。用于出图交付；不用于写代码或改交互。
---

# 胎教作曲：美术资产清单

## 功能是什么（已定稿）
胎教仪激活后点**作曲**，打开全屏作曲页：
1. 妈妈在一条软陶"五线谱小路"上**用手指从左往右划**，手越高音越高。松手后轨迹变成一串小音符，用音乐盒的声音播放（只用五声音阶，怎么划都好听）。
2. 可以选**乐器**（音乐盒 / 竖琴 / 钢琴）和**心情**（安睡 / 开心 / 想你）。
3. 可以**录一段妈妈的哼唱**（可选，最长 15 秒），和旋律一起保存。
4. 保存前 Cozie 加一个温柔的结尾和弦；保存后一个小音符飞到 **Mila 婴儿床上方的床铃**，床铃转一下。
5. 点床铃打开"给宝宝的歌"列表，可以播放、改名、删除、"放给宝宝听"（胎教仪光环随节奏呼吸）。
6. 夜里 Cozie 会走到小床边，播放最新那首歌给 Mila 听，Mila 身边飘起音符。

声音由代码实时合成，**不需要音频素材**。这份清单只要画面。

## 风格目标
- 和作画、作曲两个软陶按键同一套材质：[`references/btn_draw.webp`](references/btn_draw.webp)、[`references/btn_music.webp`](references/btn_music.webp)。奶白软陶、浅浮雕图标、柔和体积和投影，不要描边线稿或扁平图标。
- 和房间一致：上一层的 [`../references/room-concept.png`](../references/room-concept.png)。暖光、浅原木、鼠尾草绿、豆沙粉。
- 作曲页主色偏**鼠尾草绿**（作画页偏暖杏），两页是一对。

## 参考文件（`references/`）
| 文件 | 内容 |
|---|---|
| `compose-screen-layout.png` | 作曲页布局线框（390×844pt），区域编号对应下面清单 |
| `crib-mobile-placement.png` | 床铃在房间里的位置：裁自下午背景，标出支架走向、吊挂区域和旋转中心 |
| `btn_draw.webp` / `btn_music.webp` | 材质和光感的标准 |
| `style-target-and-palette.png` | 色板 |

另外请看上一层的 `../references/pose-*-sheet.png` 和现有 Cozie 动画，Cozie 的新动作要和它们规格一致。

## 全局规格
- 透明底 PNG（32 位），**@3x**（下面的 pt × 3 = 像素）。
- 可点元素给出状态：常态 / 选中（或按下）/ 禁用，命名后缀 `_on`、`_off`。
- 不要把中文文字画进图里，文字由代码渲染。
- 光源左上方暖光，同组元素大小、光照、投影一致。

## 交付清单

### A. 作曲页（编号见 `compose-screen-layout.png`）
| # | 文件名 | 内容 | 尺寸（pt） | 状态 | 优先级 |
|---|---|---|---|---|---|
| M1 | `compose_bg.png` | 作曲页背景：很浅的鼠尾草绿纸面纹理，不透明 | 390×844 | — | P1 |
| M2 | `staff_board.png` | **五线谱小路底板**：奶白软陶圆角板，上面五条柔和的浅绿软陶横线（像压出来的浅槽），左端可以有一个小小的软陶高音谱号装饰。中间要留干净，手指在上面划 | 358×400 | — | P0 |
| M3 | `note_{1..5}.png` | 音符：软陶小圆音符（带一点点小尾巴），**5 种颜色对应 5 个音高**，从低到高：可可棕、豆沙粉、蜂蜜黄、鼠尾草绿、天空蓝 | 24×24 | 常态 / 正在发声（微微发光、放大） | P0 |
| M3b | `note_trail.png` | 手指划过时的轨迹点：一颗很小的软陶亮点，代码会沿轨迹重复摆放 | 8×8 | — | P1 |
| M4 | `btn_play.png` / `btn_pause.png` | 播放 / 暂停大圆钮：奶白软陶圆盘，中间浮雕三角或双竖 | 90×90 | 常态 / 按下 | P0 |
| M5 | `btn_redo.png` | 重画：软陶回转箭头 | 56×56 | 常态 / 禁用 | P0 |
| M6 | `btn_beat.png` | 节拍点开关（可选功能）：软陶小鼓或心跳形 | 56×56 | 常态 / 选中 | P2 |
| M7 | `inst_{musicbox,harp,piano}.png` | 乐器选择，**只要图标部分**（底板由代码画）：软陶小音乐盒（可以带小曲柄）、小竖琴、小钢琴 | 48×48 | 常态 / 选中 | P0 |
| M8 | `mood_{sleep,happy,miss}.png` | 心情选择图标：安睡＝弯月亮，开心＝小太阳，想你＝小爱心 | 32×32 | 常态 / 选中 | P0 |
| M10a | `btn_mic.png` | 录哼唱的麦克风按钮：软陶圆形，豆沙粉，浮雕小麦克风 | 56×56 | 常态 / 录音中（外圈一道呼吸光环）/ 禁用 | P0 |
| M10b | `voice_chip.png` | 录好以后显示的"妈妈的声音"小胶囊底（左边一个小麦克风浮雕，右边留空给波形和时长，由代码画） | 220×44 | — | P1 |
| M10c | `btn_voice_{play,delete}.png` | 试听 / 删除录音的小按钮 | 32×32 | 常态 / 按下 | P1 |
| M9 | `cozie_compose_peek.png` | Cozie 从五线谱板左上角探头，戴一个小小的软陶耳机或闭眼跟着哼，头顶 1–2 个小音符 | 120×100 | 常态 / 开心 | P0 |

保存按钮、关闭按钮复用作画页（`../drawing/SKILL.md` 的 G12、G13），不用重出。

### B. 房间里的床铃
床铃挂在 Mila 的婴儿床上方，从床的右后柱升起一根弯支架，吊着几个软陶小挂件慢慢转。位置看 `crib-mobile-placement.png`。

| # | 文件名 | 内容 | 规格 | 优先级 |
|---|---|---|---|---|
| M11 | `mobile_arm_{night,afternoon,morning}.png` | **支架**（静止部分）：浅原木弯杆，从床右后柱升起，顶端弯向床中央 | **整张画布**透明底，和现有背景 `room/bg_*.webp`（872×1802）像素对齐；光线按三个时段各一张 | P0 |
| M12 | `mobile_toys.png` | **吊挂部分**（会转的部分）：顶部一个小圆环，垂下 4 根细绳，分别挂软陶小月亮、小星星、小云朵、小兔子（Mila 的样子） | 单独一张，正方形 512×512 透明底；**旋转中心在图片顶部正中**，要在交付时标出这个点的像素坐标 | P0 |
| M12b | `mobile_toys_spin/0000.png…` | 吊挂部分的旋转序列：转一整圈，12 帧，首尾无缝 | 每帧和 M12 同尺寸、同锚点 | P1 |
| M12c | `mobile_toys_halloween.png` | 万圣节版吊挂：小幽灵、小南瓜、小蝙蝠、小月亮（参考现有万圣节素材的毛毡/软陶质感） | 同 M12 | P2 |
| M13 | `note_fly.png` | 保存时飞向床铃的小音符（带一点拖尾光） | 40×40 | P0 |
| M14 | `note_float_{1,2,3}.png` | 夜里放歌时在 Mila 身边飘的小音符，3 种造型 | 24×24 | P0 |

### C. "给宝宝的歌"列表
| # | 文件名 | 内容 | 尺寸（pt） | 状态 | 优先级 |
|---|---|---|---|---|---|
| M15 | `song_card.png` | 一首歌的卡片底：软陶小唱片或小音乐盒卡片，左边留出放圆形播放钮的位置，右边留空给标题和时长（代码渲染文字） | 358×76 | 常态 / 正在播放（底色微微发亮） | P0 |
| M16 | `badge_voice.png` | 带妈妈哼唱的歌的小标记：小麦克风 + 小爱心 | 20×20 | — | P1 |
| M17 | `btn_to_device.png` | "放给宝宝听"按钮图标：胎教仪的小剪影 + 两道声波 | 36×36 | 常态 / 播放中 | P0 |
| M18 | `songs_empty.png` | 还没有歌时的空状态插画：Cozie 抱着一个小音乐盒，歪头看你 | 160×120 | — | P1 |

### D. Cozie 的新动作（序列帧，规格和现有动画一致）
沿用上一层 `../SKILL.md` C 节的规格：1024×1024 透明底，脚底线 y = 880，身体宽约 560px，24fps，2–4 秒，首尾无缝。

| 文件夹 | 动作 | 用途 | 优先级 |
|---|---|---|---|
| `cozie_hum/` | 闭眼轻轻左右摇摆，嘴巴哼歌，头顶飘小音符 | 作曲时、播放歌曲时 | P0 |
| `cozie_play_crib/` | 站在床边，一只手轻轻拨动床铃，温柔地看着床里 | 夜里放歌给 Mila 听 | P1 |
| `cozie_record_listen/` | 双手捂在胸前，安静专注地听（耳朵竖起） | 妈妈录哼唱时 | P1 |

万圣节装扮版（巫师帽 + 斗篷）同样需要 `cozie_hum`（P2）。

## 色板
| 用途 | 色值 |
|---|---|
| 音高 1 可可棕 | `#7a5a48` |
| 音高 2 豆沙粉 | `#d98e98` |
| 音高 3 蜂蜜黄 | `#e6b85c` |
| 音高 4 鼠尾草绿 | `#8fa77c` |
| 音高 5 天空蓝 | `#86a9c9` |
| 五线谱横线 | `#cfdcc2` |
| 作曲页底色 | `#eef1e6` |
| 板面奶白 | `#fffaf2` |
| 强调色 | `#770523` |

## 交付方式
```
cozie-compose-art/
  screen/   compose_bg.png  staff_board.png
  notes/    note_1..5.png  note_1..5_on.png  note_trail.png  note_fly.png  note_float_1..3.png
  controls/ btn_play*.png  btn_pause*.png  btn_redo*.png  btn_beat*.png  inst_*.png  mood_*.png  btn_mic*.png  voice_chip.png  btn_voice_*.png
  room/     mobile_arm_{night,afternoon,morning}.png  mobile_toys.png  mobile_toys_spin/  mobile_toys_halloween.png
  list/     song_card*.png  badge_voice.png  btn_to_device*.png  songs_empty.png
  cozie/    cozie_compose_peek*.png  cozie_hum/  cozie_play_crib/  cozie_record_listen/
  preview/  compose_screen_mock.png  crib_mobile_mock.png
  ANCHORS.md   ← 写明 mobile_toys 的旋转中心像素坐标
```

## 交付前自检
1. **作曲页合成**：按 `compose-screen-layout.png` 摆好所有元素，出 `preview/compose_screen_mock.png`，要和作画页、两个软陶按键是一家人。
2. **床铃合成**：把 M11 + M12 叠到下午背景上（婴儿床和 Mila 都在），出 `preview/crib_mobile_mock.png`。床铃不能挡住 Mila 的脸，也不能盖住窗户的大部分。
3. **对齐**：M11 三张和对应时段背景像素对齐；M12/M12b 每帧锚点一致，转起来不抖。
4. **颜色**：5 个音符颜色和色板一致，能一眼分出高低。
5. **无文字**：所有图里都没有文字。

## 不要做的事
- 不要改交互和布局，只出画面。
- 不要做成复杂的专业乐谱（不要真实音符时值、谱号细节堆满）。要一眼看懂、像玩具。
- 不要高饱和彩虹色。
- 床铃不要改动现有婴儿床的造型。

## 给接入方
- 素材放到 `public/cozie/home/compose/`。
- 床铃 M11 按时段和背景一起切换，层级在背景之上、Mila 之下；M12 用 CSS 绕锚点慢速旋转，或播放 M12b 序列。
- 歌曲只存音符数据和（可选的）哼唱录音；录音需要麦克风权限，播放需要用户先点一下（iOS 限制）。
