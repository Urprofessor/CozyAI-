# CozyAI Demo

Momcozy CozyAI 总展示 demo — Next.js 15 (App Router) + TypeScript + Tailwind +
Vercel AI SDK，视觉层使用 Momcozy 3.0 design tokens。

## 结构

- 5 个 tab 真路由：`/home` `/device` `/cozy`（C 位 AI 聊天）`/community` `/me`
- Tab 栏：iOS 26 液态玻璃悬浮版，跨路由持久
- Home：代码模块（问候头 / 指导卡 / 7 类 Daily Check-ins / Reminders）+
  PNG 保留区块（AI Insights / Campaign / Reads / Featured Products）
- Cozy AI：AI 首页即会话。问候语是流的开场；30 分钟无活动自动开新会话，
  顶栏右侧可手动新开；保留 Sarah 人工转接流程
- `/api/chat`：带图消息走 Claude Haiku 4.5（视觉），纯文字走 DeepSeek，流式输出
- `/api/history`：Upstash Redis 持久化（未配置时静默降级）
- PWA：可安装（manifest + 图标），无 Service Worker
- 桌面访问显示居中手机框；≤480px 全屏

## 本地运行

```bash
npm install
npm run dev
```

打开 http://localhost:3000（自动跳 `/home`）。

## 环境变量

复制 `.env.example` 为 `.env.local` 并填入（不填则聊天返回友好报错、历史不持久化）：

```
DEEPSEEK_API_KEY=
ANTHROPIC_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Vercel 部署时在 Project Settings → Environment Variables 配置同名变量
（Upstash 走 Marketplace 时自动注入 `KV_REST_API_*`，代码两种前缀都认）。

## 用户画像（User Profile）

画像是 Cozy AI 的知识底座，作为各功能/卡片的**输入源**，也驱动顶部 NextUp 汇总。
类型定义在 `lib/cozy/profile.ts`，按设备存储。

### 字段结构（`CozyProfile`）

| 字段 | 含义 |
| --- | --- |
| `name` | 妈妈姓名 |
| `momAge` | 妈妈年龄 |
| `baby` | `{ name, birthDate(ISO), ageText("2 weeks") }` 宝宝信息 |
| `feeding` | `{ type: breast/bottle/mixed, intervalHrs, note }` 喂养 |
| `pumping` | `{ intervalHrs, note }` 泵奶 |
| `sleep` | `{ note }` 睡眠 |
| `reminders` | `[{ label, when }]` 待办/提醒（时间为文本） |
| `lactationPlan` | 吸乳计划 Skill 的数据（目标/频次/时长/apply-to/status/progress/tracking/sessions…） |
| `updatedAt` | 最后写入时间戳 |

时间一律存**人类可读文本**（如 "3 PM"、"every 3h"），不存 epoch——这样大模型能可靠产出。

### 存储

- Upstash Redis，key = `cozyai:profile:{deviceId}`（deviceId 来自 localStorage，稳定）。
- 读写走 `/api/profile`（GET/POST）；`useProfile` hook 负责加载 + 写入。
- **未配置 Redis 时静默降级**：GET 返回 `{}`，POST no-op——本地无 key 时画像不跨导航持久（部署带 Redis 才持久）。

### 写入规则

画像**只有一个写入入口**：`applyProfilePatch(current, patch)`（`lib/cozy/profile.ts`）。
无论补丁来自哪里，都经它合并 → `useProfile.applyPatch` 持久化。合并规则：

- **标量**：直接覆盖。
- **嵌套对象**（`baby`/`feeding`/`pumping`/`sleep`/`lactationPlan`）：浅合并（保留未提及的子字段）。
- **`reminders`**：按 `label` 大小写不敏感**去重更新**（upsert）。
- **`null`/`undefined`**：忽略，绝不清空已有数据。
- 每次写入刷新 `updatedAt`。

补丁有两个来源：

1. **对话自动抽取（方案 A · 内联标签）**——主要来源。
   系统 prompt（`lib/cozy/prompts.ts`）要求模型在回复末尾附一个静默标签
   `[[PROFILE:{...}]]`，`{...}` 是**只含变化字段**的 minified JSON。
   `useCozyChat` 流结束后正则解析该标签 → 调 `onProfilePatch` → `applyPatch`；
   标签本身从展示文本中剥离，用户看不到。
   - 抽取键：`name`、`momAge`、`baby{name,birthDate,ageText}`、`feeding{type,intervalHrs,note}`、
     `pumping{intervalHrs,note}`、`sleep{note}`、`reminders[{label,when}]`、
     `lactationPlan{goal,dailyFreq,durationMin,applyTo}`。
   - 约束：只填**有把握**的字段；无新信息则不输出标签；只静默、不向用户提及。
   - 想换成更准的独立抽取调用（方案 B）时，**只需替换这一层**——store/合并/消费方不动
     （接缝就是 `applyProfilePatch`）。

2. **手动写入**——如吸乳计划问卷，逐步用 `applyPatch({ lactationPlan: {...} })` 写入答案与进度。

### 消费方

- `isProfileSufficient(profile)`：`name + 宝宝月龄 + 至少一条 routine` 齐了算"充足"，
  NextUp 顶栏据此在冷启动/充足两态切换。
- `deriveNextUp(profile)`：先聚合各 Skill 摘要（吸乳计划的 next pump / today oz），
  再接 reminders 与 routine 概览。

## 注意

- `public/fonts/` 内的 Exposure[-10] 与 Aeonik Soft Pro 为公司授权字体，
  部署范围变更前请确认授权覆盖。
- `momcozy-demo/` 为本地参考工程，已 gitignore，不随仓库分发。
- 设计 token 源：`app/momcozy-theme.css`（Figma 导出生成，勿手改数值）。
