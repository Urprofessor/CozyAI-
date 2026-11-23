# Cozie 首次进入流程（冷启动 onboarding）· 评审材料

> 版本：2026-11-24（第 2 版）· 状态标记：✅ 已实现　🟡 已决定、尚未实现　⚪ 待定
> 本文是自包含的：评审者不需要看代码或其他文档。界面文案保留英文原文（产品界面是英文）。
> 第 2 版的变化：按"五步框架"（第 3 节）重排了信件。信件现在只负责温度、一条观察和关注方向；"第一件小事"挪进聊天；信件改为逐字书写出现；预览弹窗已实现；整页聚合页移出引导。

---

## 0. 给评审者的说明

你将评审一个母婴 App 内 AI 助手的**首次进入流程**。请站在三个角度评估：
1. **新用户**（刚生完孩子、睡眠不足、单手操作手机的妈妈）：会不会觉得有用、惊艳、愿意继续？
2. **产品**：流程能否让用户体会到"**告诉 Cozie 越多，回答越准**"，并愿意授权或导入更多信息？
3. **信任与合规**：数据使用、隐私承诺、健康内容的边界是否让人放心、是否站得住？

请按第 10 节的问题和输出格式作答。

---

## 1. 背景

- **产品**：Momcozy（母婴品牌，产品有吸奶器、婴儿监视器、白噪音机、孕产瑜伽球等）App 里的 AI 助手 **Cozie**（粉色兔子形象）。
- **用户**：大部分是 Momcozy **设备用户**。不同设备的用户关心的事不同：
  - 吸奶器用户：泌乳、吸奶，加上闲聊和育儿
  - 监视器 / 白噪音用户：宝宝睡眠、成长
  - 瑜伽球用户：孕产康复（本版**未覆盖**）
  - 没有设备的用户：产后生活、情绪、闲聊
- **Cozie 背后的"助手"**（产品里称为智能体）：泌乳助手、睡眠助手、**CareLog**（健康成长记录，所有方向通用）、陪伴闲聊。
- **冷启动优势**：Momcozy 账号里**已经有**宝宝资料、成长记录和设备数据（吸奶次数与奶量、睡眠时长等），这是通用 AI 没有的。
- **本次形态**：可公开体验的网页 demo（Next.js，手机尺寸）。账号数据是**模拟的**，演示人设固定：妈妈 Clara，宝宝 Noah，6 周大。
- **约束**：
  - 不能做诊断，只能描述规律（只说"这个阶段很典型"，不说"宝宝很健康"）。
  - 用到账号或设备数据时必须**标明来源**。
  - 隐私文案里的每一句都必须是真话。

---

## 2. 目标与成功标准

**目标**
1. 第一次进入就感到 **有用、惊艳、和别的 AI 不一样**。
2. 让用户**亲眼看到**：给 Cozie 的信息越多，回答越具体、越有用。
3. 尽量短：冷启动最怕中间多一步。

**建议的衡量指标**（demo 阶段还没有埋点）
- 从打开 Cozie 到收到第一个**个性化回答**的时间（目标 < 60 秒）
- 引导流程完成率、各屏流失率
- 点击"Talk to Cozie"的比例；点击聊天里第一组行动建议的比例
- 至少保留 1 个关注方向 / 至少导入 1 份数据的用户比例
- 次日、7 日回访率

---

## 3. 设计框架：五步

| 步骤 | 目的 | 在流程中的位置 |
|---|---|---|
| 1. **Welcome** | 简短介绍 Cozie 的核心差异，完成必要的数据使用告知和同意 | 开场（A 视频 / B 三屏引导） |
| 2. **First insight** | 用已经合法可用的数据，立即给出一条真正有价值的观察 | 信件中的"I noticed"观察卡 |
| 3. **First action** | 帮用户完成一件小事，点了就进聊天并拿到结果 | 聊天里 Cozie 的第一条消息和行动建议 |
| 4. **More personal** | 用户准备深入时，再解释"添加哪项记录能带来什么帮助"，可以跳过 | 预览弹窗和聊天里的"让回答更准" |
| 5. **Ongoing relationship** | 长期陪伴与品牌体验 | 信件（周期性来信）、方向聚合页、成长里程碑、记忆档案 |

**设计原则**
1. **先给，再要**：Cozie 先展示"我已经知道你什么"，再请求更多信息。
2. **需要的时候再要**，并说清楚换来什么；不一上来就要一堆权限。
3. **给了马上有回报**：每一份信息都要立刻带来一个看得见的变化。
4. **Cozie 知道什么，看得见、改得了**：每条数据都标来源，可以编辑或删除。
5. **只描述，不诊断**。

---

## 4. 完整流程

```
打开 Cozie（App 底部 Tab 栏右侧的圆形 Cozie 按钮）
   │
   ├─ A 版：全屏开场视频 + 同意勾选 + Get started            ✅  ← 第 1 步
   └─ B 版：3 屏引导弹层（屏幕 75% 高）                      ✅  ← 第 1 步
   │
   ▼
信件 "From Cozie"：信封自动拆开，内容逐字书写出现            ✅
   │  信头：阶段（Week 6）
   │  温情开场段（随账号微调）
   │  "I noticed"观察卡                                       ✅  ← 第 2 步
   │  关注标签（按设备默认勾选）→ 点名字弹出预览弹窗          ✅  ← 第 4 步（可选）
   │  情感话 · 署名 · 下一封信预告 · 来源说明                 ✅  ← 第 5 步
   ▼
[Talk to Cozie] → 聊天                                        ✅
   │  Cozie 第一条消息：延续观察 + 3 个可点的行动              ✅  ← 第 3 步
   ▼
聊天：每次提问都带上账号数据 + 记忆档案 + 她选的方向         ✅
   │
   └─ 之后：方向聚合页作为长期入口                            🟡  ← 第 5 步
```

步数（不算可选的预览弹窗）：
- A 版：视频（约 20 秒）→ 信件 → 聊天
- B 版：3 屏引导 → 信件 → 聊天

### 4.1 入口 ✅
App 有 4 个 Tab（Home / Device / Community / Me），右侧有一个独立的圆形 Cozie 按钮。点击后，Cozie 从按钮位置圆形扩散盖住当前页面。首次进入时显示引导。演示用的桌面页面左侧有"Demo controls"面板，可以切换 A/B 版、重播引导、切换模拟账号（手机宽度下隐藏）。

### 4.2 A 版 · 开场视频 ✅（第 1 步）
- 全屏播放约 20 秒的介绍视频（目前是占位的原型录屏），只播一次，停在最后一帧。
- 底部渐变遮罩上浮着：勾选框 "I agree to Privacy statement · Medical disclaimer"，以及按钮 "Get started"。没勾选就点按钮时，会提示她先勾选同意。

### 4.3 B 版 · 3 屏引导 ✅（第 1 步）
以底部弹层形式出现（占屏幕 75% 高，上方露出压暗的当前 Tab）。每屏上半部分是动画迷你手机，下半部分是标题和说明，顶部有进度条，可以返回。

| 屏 | 标题 | 内容 | 按钮 |
|---|---|---|---|
| 1 | Here for you, even at 3 a.m. | "Cozie keeps an eye on feeds, sleep and pumping, and checks in when you need it." | Continue |
| 2 | You never have to start over | 迷你手机里逐行出现记忆列表：Baby · Noah 6 weeks / Feeding · Mixed / Pumping · ~6× a day / Pump · Momcozy M5 / Sleep · Short naps lately，然后显示"Updated just now"。说明："Cozie remembers Noah, your routine and your devices, so every chat picks up where you left off." 底部小字：可以随时查看、编辑、删除。 | Continue |
| 3 | Honest when it matters | 迷你手机演示"先问再答"的对话。三条承诺：**Asks first**（给建议前先弄清情况）/ **Knows its limits**（需要看医生时直说）/ **Private by default**（你的聊天和数据属于你）。底部小字："Cozie offers general guidance, not medical advice. By continuing, you agree to the Privacy statement and Medical disclaimer." | **Agree & continue** |

点完第 3 屏后出现大对勾 "You're all set"，信件随即升起。

- 原来的第 4 屏"权限页"（模拟连接 Apple Health + 开启提醒）**已用开关关闭，代码保留**。理由：还没给价值就先要权限。
- ⚪ "点 Agree & continue 即视为同意"是否合规，待法务确认。

### 4.4 信件 "From Cozie" ✅（第 2、5 步）
信封先合着，然后自动打开、信纸展开。信件**按账号生成**，内容从上到下：

**① 信头**
左侧：momcozy 标志、"From Cozie"、"Your first letter · Nov 23"。
右上角：**阶段**，显示"● Week 6"和一条迷你阶段条（出生 · 现在 · 第 8 周），"现在"那个点会从左滑到当前位置。

**② 温情开场段**（保留原信的语气，只有中间一句随账号变，**不带数字**，数字留给观察卡）
> Dear Clara,
> Noah turned six weeks old this week. That's about forty-two days of feeds, and more nights than anyone counted — **[随账号变的一句]** Many babies share their first real smile around now.

| 账号 | 中间那句 |
|---|---|
| 有吸奶器 | including the early pumps before sunrise. That's steady, quiet work, and it adds up. |
| 只有监视器 | and all the times you checked on Noah while he slept. That's steady, quiet care, and it adds up. |
| 无设备 | and every small thing you've figured out along the way. That's steady, quiet work, and it adds up. |

**③ "I noticed"观察卡**（第 2 步：First insight）
只放一条：标题、7 天柱状图（或成长记录）、一句解读，以及数据来源。选哪条的规则是：**设备数据里的趋势优先（她自己不容易看到），其次是 App 里已记录的下一个日期**。

| 账号 | 观察 |
|---|---|
| 有监视器（含"吸奶器 + 监视器"） | Noah's longest sleep is getting longer：最长一觉从 3 h 7 min 到 4 h 33 min，夜醒从 3 次降到 2 次；"Many babies start stretching one sleep out around six weeks."（来自 BM04 监视器） |
| 只有吸奶器 | Your 3 a.m. session is your fullest：约 122 ml，平均 101 ml，这周一次没落下；日总量从 565 ml 到 627 ml（来自 M5 吸奶器） |
| 无设备 | Noah's 2-month check-up is in 19 days：体重从出生 3.4 kg 长到 4.6 kg（来自 Momcozy App 的成长记录） |

**④ 关注标签**："I'll keep an eye on these for you:"
- 四个标签：Pumping / Sleep / Growth log / Feelings，按设备默认勾选（吸奶器 → Pumping；监视器 → Sleep；无设备 → Feelings），匹配的排在前面。
- **勾选框和名字是两个独立的点击区域**：
  - 点勾选框（40px 点击区）：勾选或取消；
  - 点名字：从下方弹出预览弹窗（4.5）。
- 下方小字："Tap a name to see what Cozie can do there."
- 她的选择会被保存，之后每次聊天都告诉模型"她希望 Cozie 侧重哪些方向"。

**⑤ 情感话**："You're doing more than you think."

**⑥ 署名 + 预告**（第 5 步）："With you, Cozie"，下面是 "Next letter: when Noah turns 8 weeks"。

**⑦ 来源说明与按钮**
"Based on your Momcozy account. Everything Cozie knows is in your memory profile, where you can change it."
主按钮 **Talk to Cozie**，文字链接 **Maybe later**。

**逐字书写的节奏**
| 顺序 | 内容 | 方式 | 时长 |
|---|---|---|---|
| 0 | 信纸展开后停顿 | — | 0.65 s |
| 1 | 称呼 | 逐字写出，带闪烁光标 | 约 0.45 s |
| 2 | 开场段 | 逐字写出 | 约 2.6 s（与长度无关） |
| 3 | 观察卡 | 升起，柱状图从左往右长出来 | 约 0.95 s |
| 4 | 关注标签 | 依次弹出 | 约 0.5 s |
| 5 | 情感话 | 逐字写出 | 约 0.75 s |
| 6 | 署名、预告、来源、按钮 | 淡入 | 约 0.4 s |

规则：
- 第一屏以下的内容，**滚动到才开始出现**；
- **点信纸任意处，立即显示全部**；
- 重新打开信件，或者系统开了"减少动态效果"，都直接显示全部；
- 没写出来的文字提前占好位置，排版不会跳动；读屏软件一次拿到整段文字。

### 4.5 预览弹窗 ✅（第 4 步）
点关注标签的名字，从下方弹出（用户仍停留在信件上）。内容：
1. 方向标题和对应助手（例如 "Health & growth log · CareLog"）
2. Cozie 在这个方向能做什么（3 条）
3. "Cozie noticed"观察卡（同 4.4 ③ 的格式；没有设备数据时，说明配对设备或导入文件后能看到什么）
4. **Ask Cozie**：3 个问题，点了就带着问题进聊天
5. **Make answers sharper**：上传文件或报告、导入其他 AI 的记忆（注明"Optional"）
6. 底部固定：**"Include in my Cozie"** 开关，和信件上的标签同步

### 4.6 进入聊天 ✅（第 3 步）
点 **Talk to Cozie** 后，聊天里先出现信件卡片（可以重新打开），然后是 Cozie 的**第一条消息**：延续信里的观察，并给出 3 个可以直接点的行动（点了就作为问题发出，模型直接给结果）。

| 观察来源 | 第一条消息 | 行动建议 |
|---|---|---|
| 睡眠（有监视器） | Since Noah's long stretch is growing, want help making it land at night? I can also get you ready for his Dec 12 check-up, or look over your pumping week.（没有吸奶器时去掉最后半句） | Help Noah's long sleep land at night / Make my check-up checklist / Review my pumping week（仅有吸奶器时） |
| 泌乳（只有吸奶器） | Your 3 a.m. session is doing a lot of work. Want me to look at whether it could shift later or get shorter? I can also get you ready for Noah's Dec 12 check-up. | Review my pumping week / Can I drop the 3 a.m. pump? / Make my check-up checklist |
| 体检（无设备） | Noah's 2-month check-up is on Dec 12, 19 days from now. Want a short checklist so nothing slips? I can also tell you what's typical at six weeks. | Make my check-up checklist / What's typical at six weeks? / I just want to talk |

- 如果她是从预览弹窗里点了某个问题进来的，Cozie 先用那个方向的开场白，然后自动发出她点的问题（见附录 C）。
- "Maybe later"直接进聊天，Cozie 说一句不催促的话。
- **每次提问，模型都会收到**：
  - 账号数据摘要（附录 A 的格式）
  - 她选的方向
  - 记忆档案（她确认保存过的条目，包括导入的内容）
  - 使用规则：引用真实数字、说明数据来源（"your M5 shows…"）、不编造、不诊断、健康信息只在相关时提及
- 这就是"给得越多越准"的实际机制：她导入或确认的信息越多，模型拿到的上下文越多。

### 4.7 之后：方向聚合页作为长期入口 🟡（第 5 步）
整页聚合页（每个方向一页：观察 + 7 天图表、成长时间线、心情选项、问题、"让回答更准"）**已经做好，但不在引导里**。计划作为"我的泌乳 / 睡眠 / 成长记录 / 情绪"长期空间，从聊天页底部现有的快捷入口（Lactation plan、Smart log、BB Sleep 等）进入，数据和记录随使用不断积累。

### 4.8 让 Cozie 知道更多：数据导入 ✅（第 4 步）
入口在预览弹窗的"Make answers sharper"里，也在记忆档案页里。
- **导入其他 AI 的记忆**（Claude / ChatGPT / Gemini / Grok）：
  1. 把提示词发到她的邮箱（真实发信：优先用 Gmail，失败时用 Resend 兜底），也可以一键带着提示词打开对应的 AI；
  2. 她在那个 AI 里运行提示词，把回答粘贴回 Cozie；
  3. DeepSeek 从回答里提取记忆条目；
  4. 她**逐条勾选**后才保存，健康类、敏感类条目默认不勾。
- **上传文件或报告**：
  - 支持 PDF（包括扫描件）、Word、CSV（如 Huckleberry 等记录类 App 的导出）和照片。
  - PDF 和照片交给 Claude 读，文字类交给 DeepSeek 读。
  - CSV **在手机上先算成近 14 天的平均数**，只上传平均数，原始记录不离开手机。
  - 同样逐条审核后才保存。
- 保存后，条目进入记忆档案，标注来源（例如 "Imported from Claude" 或文件名），之后每次聊天都会带上。

---

## 5. 模拟账号数据 ✅

Demo 面板可以切换 4 种账号。所有日期都按"今天"倒推，Noah 永远是 6 周大。

| 预设 | 设备 | 默认关注 | 信件观察 |
|---|---|---|---|
| Pump + monitor（默认） | M5 吸奶器 + BM04 监视器 | Pumping、Sleep | 睡眠 |
| Pump user | M5 吸奶器 | Pumping | 泌乳 |
| Monitor user | BM04 监视器 + 白噪音机 | Sleep | 睡眠 |
| No device | 无 | Feelings | 体检 |

所有账号都有：宝宝出生日期、成长记录（出生 3.4 kg / 50 cm → 2 周体检 3.7 kg / 52 cm → 5 周在家称重 4.6 kg）、疫苗（乙肝第 1 针）、下次体检（2 月龄体检和疫苗）。

---

## 6. 隐私与信任承诺 ✅

数据导入页和邮件里统一使用的四条承诺（"We protect you and your baby"）：
1. **Only for Cozie's answers**：只用来让 Cozie 更好地帮你和宝宝。不出售，不用于广告。⚪ 这一条是政策承诺，需要法务确认。
2. **You decide what's kept**：每一条都由你确认后才保存。健康类信息默认不保存，除非你打开。
3. **Your AI's answer isn't stored / Your file isn't kept**：读一次（加密连接），我们不保存。CSV 在手机上先算好，只上传平均数。
4. **Delete anytime**：Cozie 记住的任何内容，都可以随时在记忆档案里编辑或删除。

**真实性说明**：
- 第 3 条只对我们自己的服务器成立。文件和回答会经过第三方模型服务（Anthropic、DeepSeek），所以文案写的是"我们不保存"，没有写"任何地方都不留"。
- 我们**没有**承诺服务器端加密存储或任何认证，因为后端目前没有这些。

---

## 7. 关键决策与理由

| 决策 | 理由 | 考虑过的替代方案 |
|---|---|---|
| 按五步框架组织流程 | 每一步只做一件事：介绍与同意 → 证明价值 → 帮忙做事 → 按需补充 → 长期关系 | 在一屏里同时展示价值、请求数据、给出行动 |
| 所有版本都以信件收尾 | 信件比"Cozie 先开口"更有仪式感，也能复用为以后周期性的来信 | Cozie 直接在聊天里开口（被否） |
| 信件保留原来的温情开场段 | 温度是品牌体验的一部分；只把中间一句换成和账号相符的话 | 开场只写一句 |
| 信件只放一条观察 | 一条讲透比三条都浅更有冲击力；其余的放进预览和聚合页 | 多条观察左右滑动 |
| "第一件小事"放进聊天，而不是信里 | 行动放在对话里更自然；模型有上下文，结果更具体 | 信里放行动卡片（被否） |
| 信件逐字书写出现 | 像 Cozie 正在给她写信，增强"信"的感觉；点任意处可以跳过 | 一行行淡入；一次性全部显示 |
| 阶段放在信头 | 信头空间利用更好，正文更聚焦 | 正文里放三段式里程碑条 |
| 关注方向：标签、默认勾选、勾选框和名字分开点 | 体现"我认识你"，又省一步；分开点击避免误操作 | 四张大卡片 + "Continue with N"（上一版） |
| 预览用弹窗，整页聚合页移出引导 | 冷启动最短：信件 → 聊天；用户留在信件上，可以先看再选 | 勾选后进入整页聚合页（上一版） |
| 关掉引导里的权限页 | 还没给价值就先要权限；改为需要时再请求 | 保留权限页 |
| 使用模拟账号数据并标明来源 | demo 没有真实账号；标明来源也是正式产品的要求 | 不展示账号数据 |
| 不用"资料完成度百分比" | 百分比条像在索要数据 | 完成度进度条 |
| Feelings 不在第一屏放推断数据 | 第一眼就根据吸奶时间推测情绪，会让人觉得被盯着 | 卡片上写"这周每晚 3 点都起来" |

---

## 8. 已知问题与风险

1. **逐字书写可能让人着急**：开场段约 2.6 秒，整封信首屏约 4 秒。虽然点击可以跳过，但很多人不知道可以点。
2. **"Talk to Cozie"之前的内容偏多**：首屏以下还有关注标签、情感话、署名和来源，要滚动才能看到按钮。
3. **预览弹窗可能没人点开**：第 4 步的"让回答更准"主要藏在弹窗里；聊天里还没有在合适时机主动提出。
4. **导入后缺少即时回报**：导入完成后只有一句"Cozie will remember N things"，没有"导入后回答变得更准"的前后对比。
5. **层叠**：B 版引导本身是弹层，加上信件，再加预览弹窗，可能显得重。
6. **合规待确认**：点继续即同意；"不出售 / 不用于广告"的承诺。
7. **瑜伽球 / 孕产康方向未覆盖**，而且孕期人设和产后人设完全不同。
8. **demo 的局限**：账号数据是模拟的；本地开发环境没有模型 key，真实回答只能在线上验证；信件里的数字和日期跟着当天日期变化。

---

## 9. 待定问题

1. 瑜伽球用户按孕期还是产后处理？是否需要第二套人设？
2. 逐字书写的速度是否合适？是否需要一个明显的"跳过"提示？
3. 聊天里什么时候主动提出"让回答更准"（第 4 步）？例如在回答第一个问题之后，附一句"导入你的吸奶记录，我能看得更准"？
4. 预览弹窗里放 3 个问题是否太多？是否只放 1 个最相关的？
5. 引导要不要再缩短？例如 B 版的第 2、3 屏合并。
6. 方向聚合页作为长期入口，入口放在哪里最合适？

---

## 10. 请评审回答的问题

1. **第一印象**：作为新用户走完这个流程，哪一刻最可能让你觉得"有用 / 惊艳"？哪一刻最可能让你想退出？
2. **五步框架**：每一步是否落到了合适的位置？有没有哪一步太弱或缺失？
3. **"给得越多越准"**：用户能否感受到这一点？哪里最能体现，哪里最弱？有什么更直接的展示方式？
4. **信件**：结构（信头阶段 → 开场 → 观察 → 关注标签 → 情感话 → 署名 → Talk to Cozie）和逐字书写是否合适？你会删减或调整什么？
5. **进入聊天**：第一条消息和 3 个行动建议能否让用户立刻得到价值？
6. **信任**：数据来源标注、隐私承诺、"不诊断"的边界是否到位？有没有哪句话可能让用户不放心，或者说过了头？
7. **第 8、9 节**：对已知问题和待定问题，你的建议是什么？
8. **有没有我们没想到的更好方案？**

**输出格式**：
- 先给一段**总体评价**（3–5 句）。
- 再按上面 8 个问题分节回答。
- 最后列出**按优先级排序的修改建议**（最多 10 条）。每条注明：**影响**（高 / 中 / 低）、**工作量**（大 / 中 / 小），以及理由。

---

## 附录 A · 发给模型的账号上下文（示例）

以"吸奶器 + 监视器"账号为例，日期截至 2026-11-23：

```
Mom: Clara. Baby: Noah, born 2026-10-12 (6 weeks old).
Momcozy devices: Momcozy M5 pump, Momcozy BM04 monitor.
Pumping, last 7 days (Momcozy M5 pump): 5.7 sessions a day, about 101 ml each; the 3 a.m. session is the fullest (about 122 ml) and she did it 7 of 7 nights; daily total went from 565 ml to 627 ml.
Baby sleep, last 7 days (Momcozy BM04 monitor): longest stretch grew from 3 h 7 min to 4 h 33 min; about 14 h 25 min of sleep a day; night wakes went from 3 to 2.
Growth log (Momcozy app): Birth 2026-10-12 3.4 kg 50 cm; 2-week check-up 2026-10-26 3.7 kg 52 cm; Home weigh-in 2026-11-16 4.6 kg.
Vaccines: Hepatitis B, dose 1 (2026-10-12). Next: 2-month check-up and vaccines on 2026-12-12.
She asked Cozie to focus on: Pumping & breastfeeding, Sleep.
Memory profile: …（她确认保存过的条目）
```

## 附录 B · 各方向的"Cozie noticed"观察（信件和预览弹窗使用）

| 方向 | 标题 | 正文 | 来源 |
|---|---|---|---|
| Pumping | Your 3 a.m. session is your fullest | About 122 ml, compared with 101 ml on average — and you haven't missed it once this week. Your daily total went from 565 ml to 627 ml. | Momcozy M5 pump（附 7 天奶量柱状图） |
| Sleep | Noah's longest sleep is getting longer | It grew from 3 h 7 min to 4 h 33 min this week, and night wakes dropped from 3 to 2. Many babies start stretching one sleep out around six weeks. | Momcozy BM04 monitor（附 7 天最长睡眠柱状图） |
| Growth log | Noah's 2-month check-up is in 19 days | He's gone from 3.4 kg at birth to 4.6 kg at the last weigh-in. Next on the list: 2-month check-up and vaccines. | Noah's profile in the Momcozy app |
| Feelings | You've been up at 3 a.m. most nights | Your pump logged a 3 a.m. session every night this week. That's a lot of broken sleep — how you're doing matters too. | Momcozy M5 pump（只在预览弹窗里出现，不放在信件标签上） |

## 附录 C · 从预览弹窗进入聊天时的开场白与推荐问题

| 方向 | Cozie 的开场白（有设备数据时） | 预览弹窗里的问题 |
|---|---|---|
| Pumping | Let's talk pumping. Your M5 shows about 6 sessions a day at around 101 ml, with 3 a.m. as your fullest. What would help most right now — more milk, fewer sessions, or fitting pumping around sleep? | Is my milk supply on track? / Can I drop the 3 a.m. session? / Help me plan pumping for going back to work |
| Sleep | Let's talk sleep. Your BM04 shows Noah's longest stretch is up to 4 h 33 min — good timing for six weeks. Is that stretch happening at night, or during the day? | Is Noah waking up too often at night? / How do I make the long stretch happen at night? / What does a six-week nap rhythm look like? |
| Growth log | Here's Noah's log so far: birth 3.4 kg, 2-week check-up 3.7 kg, home weigh-in 4.6 kg. His 2-month check-up is in 19 days. Want me to help you get ready for it, or is something on your mind about his growth? | Is Noah gaining weight well? / What happens at the 2-month check-up? / Which vaccines are coming up? |
| Feelings | I'm glad you're here. Your pump has you up at 3 a.m. most nights, and that wears on anyone. How are you, really — not Noah, you? | I'm exhausted and need to vent / Is it normal to feel this low? / Help me find a bit of time for me |
