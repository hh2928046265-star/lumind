# 知光创序 / Lumind

> 个人创作者 AI 工作台 — 把想法变成作品，把知识变成能力。

## 核心功能

### 🎨 创作中心
- **图片识图**：上传照片，AI 自动分析画面内容与氛围
- **灵感发散**：基于图片或主题，生成多张灵感卡片供选择
- **标题生成**：为你的作品提供多个标题选择
- **文案创作**：短文 / 随笔 / 文章三种格式，DeepSeek V4 驱动
- **作品管理**：历史作品搜索、查看、复制、删除

### 📚 学习中心
- **知识库**：创建多个独立知识库（摄影、哲学、编程...自由定义）
- **资料导入**：文本粘贴 / PDF上传 / TXT/Markdown/CSV / 网页URL抓取
- **知识点提取**：AI 自动提炼核心概念，卡片模式展示
- **题库生成**：每个概念自动出3道题（单选+判断+多选），逐个生成绝不丢失
- **模拟考试**：三级难度（轻松60分 / 严格90分 / 完美100分）
- **错题本**：错题自动收录，高频出现直到掌握
- **混合出题**：新旧题目按比例混合，30%新题保底

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React 18 + TypeScript + Vite 6 + TailwindCSS 4 |
| 后端 | Hono (Node.js) + TypeScript |
| AI | DeepSeek V4 + Ollama 本地模型 |
| 数据 | JSON 文件存储（零依赖，无需数据库） |
| 包管理 | pnpm monorepo |

## 快速开始

### 环境要求
- Node.js >= 20
- pnpm >= 9

### 安装

```bash
# 克隆项目
git clone https://github.com/your-username/lumind.git
cd lumind

# 安装依赖
pnpm install

# 配置 API Key
cp packages/server/.env.example packages/server/.env
# 编辑 .env，填入你的 DeepSeek API Key
```

### 启动

```bash
# 同时启动前后端
pnpm dev

# 或分别启动
pnpm dev:server  # 后端 → http://localhost:3000
pnpm dev:client  # 前端 → http://localhost:5173
```

打开浏览器访问 **http://localhost:5173**

### 配置 LLM

进入「设置」页面，选择 DeepSeek 并填入 API Key，或配置本地 Ollama 模型。

## 项目结构

```
lumind/
├── packages/
│   ├── client/          # React 前端
│   │   ├── src/
│   │   │   ├── components/  # UI 组件
│   │   │   ├── pages/       # 页面
│   │   │   └── stores/      # 状态管理
│   │   └── index.html
│   ├── server/          # Hono API 后端
│   │   ├── src/
│   │   │   ├── routes/      # API 路由
│   │   │   ├── services/    # LLM 等核心服务
│   │   │   └── db/          # JSON 文件数据库
│   │   └── data/            # 持久化数据（自动生成）
│   └── shared/          # 共享类型定义
├── pnpm-workspace.yaml
└── package.json
```

## License

MIT
