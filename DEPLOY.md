# 部署指南 📦

本指南将帮助你将 AicanGo 项目部署到生产环境。

## 🎯 部署架构

- **前端**: Vercel、GitHub Pages 或 Netlify
- **后端**: Vercel（与前端同站）、Railway 或 Render
- **数据库**: MySQL（需支持外网连接，如 PlanetScale、Railway MySQL 等）

## 📋 部署前准备

1. **确保代码已推送到 GitHub**
```bash
git add .
git commit -m "准备部署"
git push origin main
```

2. **准备环境变量**
   - 数据库连接字符串（如果使用外部数据库）
   - AI 生成用的 API Key 在游戏内「设置」中配置，无需部署时填写

## 🚀 步骤 1: 部署后端

### 选项 A: Railway（推荐）

1. 访问 [Railway](https://railway.app) 并登录（使用 GitHub）
2. 点击 "New Project" → "Deploy from GitHub repo"
3. 选择你的 `AicanGo` 仓库
4. 在 "Root Directory" 设置为 `backend`
5. 点击 "Add Database" → 选择 "MySQL"
6. Railway 会自动创建数据库并设置 `DATABASE_URL` 环境变量
7. 添加其他环境变量：
   - `ADMIN_USERNAME`: 你的管理员用户名（可选）
   - `ADMIN_PASSWORD`: 你的管理员密码（可选）
8. 点击 "Deploy"
9. 部署完成后，点击 "Settings" → "Generate Domain" 获取后端 URL（例如：`https://your-app.up.railway.app`）

### 选项 B: Vercel（前后端同站）

前后端可一起部署在同一个 Vercel 项目，API 路径为 `/api/*`。

**详细配置步骤**（环境变量、构建命令、域名等）见 **[VERCEL_CONFIG.md](./VERCEL_CONFIG.md)**。

简要步骤：
1. 在 Vercel 导入 GitHub 仓库（根目录，不要选 backend 子目录）
2. 环境变量在 Vercel 项目 **Settings → Environment Variables** 中配置：
   - `DATABASE_URL`: MySQL 连接字符串（必填，需支持外网连接）
   - `VITE_BACKEND_URL`: 填你的 Vercel 项目地址，如 `https://你的项目.vercel.app`（前端会请求该域名下的 `/api/*`）
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD`: 可选
3. 部署后：
   - 前端：`https://你的项目.vercel.app`
   - 后端：`https://你的项目.vercel.app/api/health`、`/api/auth/register` 等

**注意**：Vercel 后端为 Serverless，冷启动可能稍慢；数据库需支持外网（如 PlanetScale、Railway MySQL）。

### 选项 D: Render

1. 访问 [Render](https://render.com) 并登录
2. 点击 "New +" → "Web Service"
3. 连接你的 GitHub 仓库
4. 配置：
   - **Name**: `aicango-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. 点击 "Advanced" → "Add Environment Variable":
   - `DATABASE_URL`: （稍后添加）
   - `ADMIN_USERNAME`: （可选）
   - `ADMIN_PASSWORD`: （可选）
   - `PORT`: `10000`（Render 要求）
6. 创建数据库：
   - 点击 "New +" → "PostgreSQL" 或 "MySQL"
   - 选择免费计划
   - 复制 "Internal Database URL" 或 "External Database URL"
   - 更新 `DATABASE_URL` 环境变量
7. 点击 "Create Web Service"
8. 等待部署完成，复制服务 URL（例如：`https://aicango-backend.onrender.com`）

### 初始化数据库

部署完成后，需要初始化数据库表结构：

**方法 1: 使用 Railway CLI**
```bash
npm install -g @railway/cli
railway login
railway link
railway run npx prisma db push
```

**方法 2: 使用 Render Shell**
- 在 Render Dashboard 中找到你的服务
- 点击 "Shell" 标签
- 运行：
```bash
cd backend
npx prisma db push
```

**方法 3: 本地连接远程数据库**
```bash
# 在 backend/.env 中设置远程 DATABASE_URL
cd backend
npx prisma db push
```

## 🎨 步骤 2: 部署前端

### 使用 Vercel（推荐）

1. 访问 [Vercel](https://vercel.com) 并登录（使用 GitHub）
2. 点击 "Add New..." → "Project"
3. 导入你的 GitHub 仓库 `AicanGo`
4. 配置项目：
   - **Framework Preset**: Vite
   - **Root Directory**: `./`（根目录）
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. 添加环境变量：
   - `VITE_BACKEND_URL`: 你的后端 URL（例如：`https://your-app.up.railway.app`）
6. 点击 "Deploy"
7. 部署完成后，Vercel 会提供一个 URL（例如：`https://aicango.vercel.app`）

### 使用 Netlify

1. 访问 [Netlify](https://netlify.com) 并登录
2. 点击 "Add new site" → "Import an existing project"
3. 连接 GitHub 仓库
4. 配置：
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. 点击 "Site settings" → "Environment variables" 添加：
   - `VITE_BACKEND_URL`
6. 点击 "Deploy site"

## ✅ 步骤 3: 验证部署

1. **检查后端健康状态**
   - 访问 `https://your-backend-url/health`
   - 应该返回 `{"status":"ok","database":"connected"}`

2. **测试前端**
   - 访问你的前端 URL
   - 尝试注册新账号
   - 检查是否能正常连接后端

3. **检查数据库**
   - 使用 Prisma Studio 或 MySQL 客户端连接数据库
   - 确认 `User` 表已创建

## 🔧 常见问题

### 问题 1: 前端无法连接后端

**解决方案**:
- 检查 `VITE_BACKEND_URL` 是否正确
- 确保后端 CORS 配置允许前端域名
- 检查后端是否正常运行（访问 `/health` 端点）

### 问题 2: 数据库连接失败

**解决方案**:
- 检查 `DATABASE_URL` 格式是否正确
- Railway: 使用 "Internal Database URL"
- Render: 使用 "Internal Database URL"（如果前端也在 Render）或 "External Database URL"
- 确保数据库已创建并运行

### 问题 3: Prisma 迁移失败

**解决方案**:
```bash
# 在本地设置远程 DATABASE_URL
cd backend
npx prisma db push
# 或使用 migrate
npx prisma migrate deploy
```

### 问题 4: CORS 错误

**解决方案**:
在 `backend/index.js` 中更新 CORS 配置：
```javascript
app.use(cors({
  origin: ['https://your-frontend-url.vercel.app', 'http://localhost:3000'],
  credentials: true
}));
```

## 📊 监控和维护

### Railway
- Dashboard 提供实时日志和指标
- 可以查看请求、错误、数据库连接等

### Render
- Dashboard 提供日志和指标
- 免费计划有 15 分钟无活动后休眠的限制

### Vercel
- Analytics 提供访问统计
- 日志在 Dashboard → Deployments → 选择部署 → Functions

## 🔄 更新部署

每次推送代码到 GitHub 后，Railway/Render/Vercel 会自动重新部署。

手动触发部署：
- **Railway**: Dashboard → 点击 "Redeploy"
- **Render**: Dashboard → 点击 "Manual Deploy"
- **Vercel**: Dashboard → Deployments → "Redeploy"

## 💰 费用说明

- **Railway**: 免费计划提供 $5 额度，超出后按使用付费
- **Render**: 免费计划可用，但服务会在无活动 15 分钟后休眠
- **Vercel**: 免费计划足够个人项目使用
- **数据库**: Railway/Render 免费计划包含 MySQL

## 📚 相关资源

- [Railway 文档](https://docs.railway.app)
- [Render 文档](https://render.com/docs)
- [Vercel 文档](https://vercel.com/docs)
- [Prisma 部署指南](https://www.prisma.io/docs/guides/deployment)
