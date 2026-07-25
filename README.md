# 知光创序 / Lumind

> **AI-Powered Personal Workspace** — 本地运行的个人创作者智能工作台，把想法变成作品，把知识变成能力。

[![Topics](https://img.shields.io/badge/topics-12-blue)](https://github.com/hh2928046265-star/lumind)
![TypeScript](https://img.shields.io/badge/TypeScript-0_errors-green)

---

## 这是什么？

知光创序是一个**跑在你电脑上的 AI 工作台**。它有两个核心：

- **创作中心**：你给照片或主题，AI 帮你发散灵感、生成标题、写出文案
- **学习中心**：你给资料，AI 提取知识点、出题、模拟考试，附带错题本

不需要服务器、不需要数据库、不需要付费订阅。下载 → 配个 API Key → 跑起来就用。

---

## 两大核心模块

### 🎨 创作中心

专为摄影师、写作者、内容创作者设计。

```
上传照片 / 输入主题
    ↓
AI 识图分析（DeepSeek V4 多模态）
    ↓
灵感卡片发散（5-8 张卡片，每张一个创作角度）
    ↓
选择标题（每张卡片 3-4 个标题备选）
    ↓
文案生成（短文 / 随笔 / 文章三种格式）
    ↓
作品保存、复制、历史管理
```

**特点：**
- 支持图片识别模式（上传照片 → 分析画面 → 生成配套文案）
- 支持纯主题模式（输入关键词 → 发散创作方向）
- 文案风格区分明确：短文精炼、随笔自然、文章完整
- 作品历史面板：搜索、过滤、一键复制

### 📚 学习中心

适合碎片化学习、备考复习、知识管理。

```
创建知识库（如：摄影、哲学、编程...）
    ↓
导入资料（文本粘贴 / PDF上传 / TXT/Markdown/CSV / 网页URL）
    ↓
AI 提取知识点（卡片模式，分类清晰）
    ↓
自动出题（每个知识点 3 道：单选 + 判断 + 多选）
    ↓
模拟考试（轻松60分 / 严格90分 / 完美100分）
    ↓
错题本自动收录 + 错题优先复习
```

**特点：**
- 多知识库独立管理，互不干扰
- 资料支持多种格式：PDF、TXT、Markdown、CSV、网页
- 出题严格校验：答案必须唯一确定，容不得模棱两可
- 考试题目混合策略：30% 新题 + 70% 优先级排序
- 错题高频出现直到连续答对 3 次
- Fisher-Yates 洗牌确保题目随机

---

## 技术架构

```
lumind/
├── packages/
│   ├── client/              # React 18 前端
│   │   ├── src/
│   │   │   ├── pages/       # LearnPage, WorkspacePage, SettingsPage...
│   │   │   ├── components/  # CanvasView, HistoryPanel, ErrorBoundary...
│   │   │   ├── stores/      # Zustand 状态管理
│   │   │   └── hooks/       # API 客户端 + 动画
│   │   └── vite.config.ts   # Vite 6 + TailwindCSS 4
│   ├── server/              # Hono Node.js 后端
│   │   ├── src/
│   │   │   ├── routes/      # 12 个路由模块（learn, kb, draft, canvas...）
│   │   │   ├── services/    # LLM 抽象层 + Prompt 模板
│   │   │   └── db/          # JSON 文件存储（17 个集合）
│   │   └── data/            # 持久化数据目录（自动创建）
│   └── shared/              # 共享 TypeScript 类型
├── pnpm-workspace.yaml
└── package.json
```

| 层 | 技术选型 | 理由 |
|---|---------|------|
| 前端框架 | React 18 + TypeScript | 生态成熟，类型安全 |
| 构建工具 | Vite 6 | 极速 HMR，零配置 |
| 样式 | TailwindCSS 4 | 原子化 CSS，浅色设计 |
| 路由 | React Router v6 | 声明式路由 |
| 状态管理 | Zustand | 轻量，无模板代码 |
| 画布 | @xyflow/react (React Flow) | 灵感卡片可视化 |
| 后端框架 | Hono | 轻量，TypeScript 原生 |
| LLM | DeepSeek V4 + Ollama | 云端主力 + 本地备份 |
| 数据存储 | JSON 文件 | 零依赖，无需数据库 |
| 包管理 | pnpm monorepo | 高效，workspace 原生支持 |

---

## 快速开始

### 前提

- Node.js >= 20
- pnpm >= 9
- DeepSeek API Key（[获取地址](https://platform.deepseek.com/)）

### 安装

```bash
git clone https://github.com/hh2928046265-star/lumind.git
cd lumind
pnpm install
```

### 配置

创建 `packages/server/.env`，内容参考 `packages/server/.env.example`：

```env
OPENAI_API_KEY=sk-your-deepseek-key
OPENAI_MODEL=deepseek-v4-pro
```

### 启动

```bash
pnpm dev
```

打开 **http://localhost:5173**

---

## 核心设计决策

### 为什么逐个概念出题而不是批量？

早期版本批量出题（一次塞 14 个概念给 LLM），DeepSeek API 频繁超时 → 所有题目丢失 → 考试抽到 0 题。

改进为**逐个概念独立调用 + 3 次重试 + 600ms 间隔**后：
- 每个概念出题成功率 100%
- 失败的概念完全隔离，不影响其他
- 补全题库按钮可一键重试失败的概念

### 为什么考试要混合新旧题目？

用户会多次导入资料。纯按优先级排序容易一直出第一批的题。改为：
- **30% 强制度**：从未做过的新题
- **70% 混合池**：剩余新题 + 已做题（错题优先 → Fisher-Yates 洗牌）

### 为什么用 JSON 文件而不是数据库？

- MVP 阶段单用户场景，JSON 完全够用
- 零安装依赖（不需要装 MySQL/PostgreSQL）
- 数据透明可读，方便备份迁移
- 17 个集合文件在 `data/` 目录，体积可控

---

## API 概览

| 路由 | 方法 | 说明 |
|------|------|------|
| /api/kb | GET/POST/DELETE | 知识库 CRUD |
| /api/learn/extract | POST | 提取知识点 + 出题 |
| /api/learn/concepts | GET | 获取知识点列表 |
| /api/learn/exam/generate | POST | 生成考试 |
| /api/learn/exam/submit | POST | 提交考试 |
| /api/learn/exams | GET | 考试记录 |
| /api/learn/wrong-questions | GET | 错题本 |
| /api/learn/regenerate-questions | POST | 补全题库 |
| /api/learn/sources | GET | 资料列表 |
| /api/learn/upload | POST | 上传文件 |
| /api/learn/fetch-url | POST | 抓取网页 |
| /api/canvas/* | GET/POST | 工作画布 |
| /api/drafts/* | GET/POST/DELETE | 作品管理 |
| /api/health | GET | 健康检查 |

---

## License

MIT © 2026 知光创序 / Lumind
