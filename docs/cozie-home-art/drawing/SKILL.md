---
name: cozie-drawing-art-assets
description: 为"Cozie 的家"里的胎教作画功能（全屏画板、颜色和工具按键、Cozie 探头与签名、墙上画板的钉图、画作墙和大图查看）重做美术资产，统一成小屋概念图和胎教仪按键的软陶 3D 画风。用于出图交付；不用于写代码或改交互。
---

# 胎教作画：美术资产清单

## 背景
"Cozie 的家"里，胎教仪激活后点**作画**，会打开一个全屏画板。妈妈画完点保存，Cozie 在右下角盖一个小兔子签名，画作飞到墙上的软木画板上钉住；点画板可以看到以往所有画作。

现在这套界面是**工程师用代码临时画的**：纯色背景、平面圆点、通用线性图标。请你按统一画风**重做成美术资产**，交互和布局不变。

## 风格目标
- **和这两个按键同一套材质**：[`references/btn_draw.webp`](references/btn_draw.webp)、[`references/btn_music.webp`](references/btn_music.webp)。奶白软陶质感，图标是浅浮雕、带柔和体积，投影柔和，没有描边线。
- **和房间一致**：参考上一层的 [`../references/room-concept.png`](../references/room-concept.png)：暖光、浅原木、鼠尾草绿、豆沙粉。
- 色板见 [`references/style-target-and-palette.png`](references/style-target-and-palette.png)，颜色值在下面"色板"一节。

## 参考文件（`references/`）
| 文件 | 内容 |
|---|---|
| `drawing-screen-layout.png` | 画板页的布局线框（390×844pt），每个区域标了编号，对应下面的清单 |
| `style-target-and-palette.png` | 风格目标（两个软陶按键）和色板 |
| `btn_draw.webp` / `btn_music.webp` | 用户已定稿的软陶按键，**材质和光感的标准** |
| `signature-current.png` | 现在的 Cozie 签名（代码画的线稿小兔子，需要重做） |
| `wall-pin-current.png` | 现在画作钉在墙上软木板的样子（白纸片 + 红点，需要重做） |

## 全局规格
- 透明底 PNG（32 位），**@3x**：下面写的 pt 尺寸乘 3 就是像素尺寸。
- 每个可点的元素都要给出**状态**：常态 / 选中（或按下）/ 禁用。禁用态做成降低饱和度和亮度的同一张图，不要换形状。
- 不要把文字画进图里（除非下面特别说明）。中文文字由代码渲染。
- 同一组元素（比如 6 个颜色）大小、光照方向、投影必须完全一致。
- 光源：左上方暖光，和房间一致。

## 交付清单

### 画板页
| # | 文件名 | 内容 | 尺寸（pt） | 状态 | 优先级 |
|---|---|---|---|---|---|
| G1 | `draw_bg.png` | 画板页背景：暖杏色（约 `#f4e7dc`）的细腻纸面或桌面纹理，**不透明**，四周可以有很淡的暗角 | 390×844 | — | P1 |
| G2a | `draw_paper_frame.png` | 画纸的**外框**：奶白画纸的圆角边缘、柔和投影，可以加两角软陶胶带或小木夹。**中间可画区域必须是透明的**（代码在下面铺纸色并让用户画） | 358×620，可画区域内缩 10pt | — | P0 |
| G2b | `draw_paper_texture.png` | 画纸纹理，**可无缝平铺**，非常淡（对比度低，不影响画面），会同时用在画布和导出的画作里 | 256×256 | — | P1 |
| G3 | `swatch_{rose,sage,honey,sky,lilac,cocoa}.png` | 6 个颜色选择：做成**软陶小颜料团或圆形颜料碟**，颜色见色板 | 40×40 | 常态 / 选中（选中可以微微隆起，或外圈一道细环） | P0 |
| G4a | `tool_eraser.png` | 橡皮擦（软陶小橡皮） | 40×40 | 常态 / 选中 | P0 |
| G4b | `tool_size_{s,m,l}.png` | 笔刷粗细：同一支软陶笔刷，笔尖由细到粗，或三颗大小不同的颜料点 | 40×40 | 常态 / 选中 | P0 |
| G4c | `tool_undo.png` | 撤销（向左回转的箭头，软陶浮雕） | 40×40 | 常态 / 禁用 | P0 |
| G4d | `tool_clear.png` | 清空（小垃圾桶或一张揉皱的纸团） | 40×40 | 常态 / 禁用 | P0 |
| G5 | `toolbar_tray.png` | 工具栏底托（可选）：一块浅原木或软陶托盘，放颜色和工具 | 358×110 | — | P2 |
| G6 | `cozie_draw_peek.png` | **Cozie 从画纸左上角探出头**，一只手搭在纸边，另一只手拿一支小蜡笔。只画到身体上半部 | 120×100 | 常态 / 开心（眯眼笑） | P0 |
| G7 | `cozie_signature.png` | **Cozie 的签名章**：保存时盖在画作右下角。像小朋友用蜡笔画的小兔子脸，旁边手写 "Cozie"（**这里允许写这个英文单词**）。颜色用豆沙粉 `#c98f97` 为主 | 80×70 | — | P0 |
| G12 | `btn_save.png` | "保存"按钮的软陶胶囊底（文字由代码渲染），强调色酒红 `#770523` | 74×38 | 常态 / 按下 / 禁用 | P1 |
| G13 | — | 左上角关闭按钮沿用 App 统一的毛玻璃圆钮，**不用出图** | — | — | — |

### 墙上画板与画作墙
| # | 文件名 | 内容 | 尺寸（pt） | 状态 | 优先级 |
|---|---|---|---|---|---|
| G8a | `pin.png` | 图钉：软陶圆头图钉，豆沙粉（另出一个鼠尾草绿版本 `pin_sage.png`） | 12×12 | — | P0 |
| G8b | `pinned_frame.png` | 钉在软木板上的小画框：像一张拍立得或带白边的厚卡纸，**中间画作窗口透明**（3:4 竖版），底边留宽一点 | 66×90，窗口内缩 6pt，底边 14pt | — | P0 |
| G9 | `gallery_card.png` | 画作墙里的缩略图卡片：同 G8b 的语言，奶白卡纸 + 柔和投影，中间窗口透明（3:4） | 108×150，窗口内缩 6pt，下方留 24pt 放标题 | 常态 / 按下 | P0 |
| G10 | `viewer_frame.png` | 点开大图时的画框：**浅原木画框**（和房间书架上的相框一致），中间窗口透明（3:4） | 350×470，窗口内缩 18pt | — | P0 |
| G11 | `gallery_empty.png` | 还没有画时的空状态插画：Cozie 抱着一张空白画纸，期待地看着你 | 160×120 | — | P1 |

## 色板（从现有界面和房间取）
| 用途 | 色值 |
|---|---|
| 豆沙粉 rose | `#d98e98` |
| 鼠尾草绿 sage | `#8fa77c` |
| 蜂蜜黄 honey | `#e6b85c` |
| 天空蓝 sky | `#86a9c9` |
| 薰衣草紫 lilac | `#a48bb8` |
| 可可棕 cocoa | `#7a5a48` |
| 画纸 | `#fffaf2` |
| 画板页底色 | `#f4e7dc` |
| 强调色（保存按钮） | `#770523` |
| 签名粉 | `#c98f97` |

**注意**：6 个颜色是用户真正落笔的颜色，色块必须和这个色值一致（允许软陶的明暗起伏，但平均色要对得上），否则选的颜色和画出来的会不一样。

## 交付方式
```
cozie-drawing-art/
  screen/    draw_bg.png  draw_paper_frame.png  draw_paper_texture.png  toolbar_tray.png
  tools/     swatch_*.png  swatch_*_on.png  tool_*.png  tool_*_on.png  tool_*_off.png  btn_save*.png
  cozie/     cozie_draw_peek.png  cozie_draw_peek_happy.png  cozie_signature.png
  wall/      pin.png  pin_sage.png  pinned_frame.png  gallery_card.png  gallery_card_pressed.png  viewer_frame.png  gallery_empty.png
  preview/   draw_screen_mock.png   wall_mock.png
```
状态命名：常态不加后缀，选中/按下 `_on`，禁用 `_off`。

## 交付前自检
1. **合成预览**：按 `drawing-screen-layout.png` 的位置把所有画板页元素摆好，出一张 `preview/draw_screen_mock.png`，看起来要和两个软陶按键是一家人。
2. **墙面预览**：把 G8a + G8b（里面放一张示例涂鸦）叠在 `wall-pin-current.png` 那块软木板上，出 `preview/wall_mock.png`，比例要合适，不能比便条大太多。
3. **透明窗口**：G2a、G8b、G9、G10 的中间窗口是真透明，边缘干净。
4. **色值**：6 个颜色块的平均色和色板一致。
5. **无多余文字**：除了 G7 的 "Cozie"，任何图里都没有文字。

## 不要做的事
- 不要改布局和交互，只换"皮"。
- 不要用描边线稿或扁平图标风，要软陶 3D。
- 不要画成小朋友绘画 App 那种高饱和彩虹色。
- 不要在画纸可画区域里放图案或水印。

## 给接入方
- 素材放到 `public/cozie/home/drawing/`。
- 画板代码在 `components/cozy/home/DrawingBoard.tsx`；墙上钉图、画作墙、大图查看在 `components/cozy/home/CozieHomePage.tsx`（`ch-pin`、`ch-gallery`、`ch-viewer`），样式在 `app/cozie-home.css`。
- 签名章 G7 要在导出时画进画作（目前在 `drawSignature()` 里用代码画），换成 `drawImage` 即可。
- 画纸纹理 G2b 如果使用，导出时也要铺上，保证保存下来的画和画的时候看到的一样。
