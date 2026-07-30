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

## 注意

- `public/fonts/` 内的 Exposure[-10] 与 Aeonik Soft Pro 为公司授权字体，
  部署范围变更前请确认授权覆盖。
- `momcozy-demo/` 为本地参考工程，已 gitignore，不随仓库分发。
- 设计 token 源：`app/momcozy-theme.css`（Figma 导出生成，勿手改数值）。
