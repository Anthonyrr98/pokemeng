# GenMon: AI 怪物大作战 🎮

一个基于 AI 生成的怪物收集与战斗游戏，使用 React + Three.js + Node.js + MySQL 构建。

## ✨ 功能特性

- 🤖 **AI 生成怪物**：使用 AI API（如 SiliconFlow 等）在游戏内设置中配置，生成独特怪物
- 🎨 **3D 可视化**：使用 Three.js 展示怪物模型
- ⚔️ **回合制战斗**：策略性的战斗系统
- 📈 **经验与进化**：怪物升级和进化系统
- 🎒 **精灵背包**：管理战斗队伍
- 💾 **云端存档**：数据持久化存储
- 👤 **用户系统**：注册登录、管理员功能

## 🛠️ 技术栈

### 前端
- React 18 + TypeScript
- Vite
- Three.js + React Three Fiber
- Tailwind CSS
- Lucide Icons

### 后端
- Node.js + Express
- MySQL (Prisma ORM)
- JWT 认证
- SHA-256 密码加密

## 📦 本地开发

### 前置要求
- Node.js 18+
- MySQL 8.0+
- （可选）AI 生成用的 API Key 在游戏内「设置」中配置

### 安装步骤

1. **克隆仓库**
```bash
git clone https://github.com/yourusername/AicanGo.git
cd AicanGo
```

2. **安装前端依赖**
```bash
npm install
```

3. **安装后端依赖**
```bash
cd backend
npm install
```

4. **配置环境变量**

创建 `backend/.env` 文件：
```env
# 数据库连接（必填）
DATABASE_URL=mysql://用户名:密码@主机:端口/数据库名
# 示例: DATABASE_URL=mysql://aicango:aicango9988!@localhost:3306/aicango

# 管理员账号（可选）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=你的密码

# 端口（可选，默认 4000）
PORT=4000
```

创建 `.env.local` 文件（前端，可选）：
```env
VITE_BACKEND_URL=http://localhost:4000
```
（AI 生成用的 API Key 在游戏内「设置」里配置。）

5. **初始化数据库**
```bash
cd backend
npx prisma db push
```

6. **启动开发服务器**

前端（端口 3000）：
```bash
npm run dev
```

后端（端口 4000）：
```bash
cd backend
npm run dev
```

访问 http://localhost:3000 开始游戏！

## 🚀 部署指南

### 前端部署选项

#### 选项 1: GitHub Pages（推荐，免费）

GitHub Pages 是免费的静态网站托管服务，非常适合前端部署。

**快速步骤**:
1. 在 GitHub 仓库 Settings → Pages → Source 选择 "GitHub Actions"
2. 在 Settings → Secrets 添加 `VITE_BACKEND_URL`
3. 推送代码到 `main` 分支，GitHub Actions 会自动部署

**详细指南**: 查看 [GITHUB_PAGES.md](./GITHUB_PAGES.md)

- **Vercel 前后端同站**：查看 [VERCEL_CONFIG.md](./VERCEL_CONFIG.md) 了解环境变量、构建命令等详细配置

#### 选项 2: Vercel

1. **推送代码到 GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/AicanGo.git
git push -u origin main
```

2. **在 Vercel 部署**
   - 访问 [Vercel](https://vercel.com)
   - 点击 "New Project"
   - 导入你的 GitHub 仓库
   - 配置环境变量：
     - `VITE_BACKEND_URL`: 你的后端 API 地址
   - 点击 "Deploy"

### 后端部署（Railway / Render）

#### Railway 部署

1. 访问 [Railway](https://railway.app)
2. 点击 "New Project" → "Deploy from GitHub repo"
3. 选择你的仓库，选择 `backend` 目录
4. 配置环境变量：
   - `DATABASE_URL`: Railway 会自动提供 MySQL 数据库
   - `ADMIN_USERNAME`: 管理员用户名（可选）
   - `ADMIN_PASSWORD`: 管理员密码（可选）
   - `PORT`: Railway 会自动设置
5. 部署完成后，Railway 会提供一个 URL，更新前端的 `VITE_BACKEND_URL`

#### Render 部署

1. 访问 [Render](https://render.com)
2. 创建新的 "Web Service"
3. 连接 GitHub 仓库，选择 `backend` 目录
4. 配置：
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: `Node`
5. 添加环境变量（同上）
6. 创建 MySQL 数据库（Render Dashboard → New → PostgreSQL/MySQL）
7. 更新 `DATABASE_URL`

### 数据库迁移

部署后需要初始化数据库：
```bash
# 在本地或通过 SSH 连接到服务器
cd backend
npx prisma db push
```

或者使用 Prisma Migrate：
```bash
npx prisma migrate deploy
```

## 📁 项目结构

```
AicanGo/
├── backend/              # 后端服务
│   ├── index.js         # Express 服务器
│   ├── prisma/          # Prisma 配置
│   └── package.json
├── components/          # React 组件
│   ├── AuthPanel.tsx    # 登录/注册
│   ├── BattleScene.tsx  # 战斗场景
│   ├── TeamView.tsx    # 队伍管理
│   └── ...
├── services/            # 业务逻辑
│   ├── geminiService.ts # AI 生成服务
│   ├── exp.ts          # 经验系统
│   └── ...
├── App.tsx             # 主应用组件
└── package.json        # 前端依赖
```

## 🔐 环境变量说明

### 前端 (.env.local，可选)
- `VITE_BACKEND_URL`: 后端 API 地址（默认 `http://localhost:4000`）
- AI 生成用的 API Key 在游戏内「设置」中配置

### 后端 (backend/.env)
- `DATABASE_URL`: MySQL 数据库连接字符串
- `ADMIN_USERNAME`: 管理员用户名（可选）
- `ADMIN_PASSWORD`: 管理员密码（可选）
- `PORT`: 服务器端口（默认 4000）

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题，请提交 Issue 或联系项目维护者。
