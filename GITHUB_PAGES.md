# GitHub Pages 部署指南 🌐

本指南将帮助你使用 GitHub Pages 部署前端，后端仍需单独部署。

## 📋 前置要求

1. **GitHub 仓库已创建**（参考 `GITHUB_SETUP.md`）
2. **后端已部署**（Railway/Render，参考 `DEPLOY.md`）
3. **获取后端 URL**（例如：`https://your-backend.up.railway.app`）

## 🚀 快速部署步骤

### 步骤 1: 配置 GitHub Pages

1. 访问你的 GitHub 仓库
2. 点击 **Settings**（设置）
3. 在左侧菜单找到 **Pages**
4. 在 **Source** 部分：
   - 选择 **GitHub Actions**（不是 "Deploy from a branch"）
5. 保存设置

### 步骤 2: 配置环境变量（Secrets）

在 GitHub 仓库中添加环境变量：

1. 进入仓库 **Settings** → **Secrets and variables** → **Actions**
2. 点击 **New repository secret**，添加以下变量：

   - **`VITE_BACKEND_URL`**: 你的后端 API 地址
     ```
     例如: https://your-backend.up.railway.app
     ```
   
   - **`VITE_GEMINI_API_KEY`**: 你的 Google Gemini API Key
     ```
     从 https://makersuite.google.com/app/apikey 获取
     ```

### 步骤 3: 推送代码触发部署

```bash
git add .
git commit -m "Configure GitHub Pages deployment"
git push origin main
```

### 步骤 4: 查看部署状态

1. 进入仓库的 **Actions** 标签页
2. 查看最新的工作流运行状态
3. 等待部署完成（通常需要 1-2 分钟）

### 步骤 5: 访问你的网站

部署完成后，你的网站地址将是：

- **如果仓库名是 `username.github.io`**:
  ```
  https://username.github.io
  ```

- **如果是普通仓库（例如 `AicanGo`）**:
  ```
  https://username.github.io/AicanGo/
  ```

⚠️ **注意**: 普通仓库的 URL 末尾有 `/`，这是正常的。

## 🔧 配置说明

### 仓库路径配置

项目已配置为自动检测仓库路径：

- **根路径仓库** (`username.github.io`): 自动使用 `/` 作为 base
- **子路径仓库** (`AicanGo`): 自动使用 `/AicanGo/` 作为 base

如果需要手动指定，修改 `.github/workflows/deploy-gh-pages.yml` 中的 `GITHUB_REPOSITORY` 环境变量。

### 环境变量

GitHub Actions 工作流会使用以下环境变量：

- `VITE_BACKEND_URL`: 后端 API 地址（必需）
- `VITE_GEMINI_API_KEY`: Gemini API Key（必需）
- `GITHUB_PAGES`: 自动设置为 `true`（用于构建配置）
- `GITHUB_REPOSITORY`: 自动从 GitHub Actions 获取

## 🔄 更新部署

每次推送到 `main` 分支时，GitHub Actions 会自动：

1. 安装依赖
2. 构建项目
3. 部署到 GitHub Pages

你也可以手动触发部署：

1. 进入 **Actions** 标签页
2. 选择 **Deploy to GitHub Pages** 工作流
3. 点击 **Run workflow**

## 🐛 常见问题

### 问题 1: 404 错误或页面空白

**原因**: 路径配置不正确

**解决方案**:
1. 检查仓库名是否正确
2. 确认访问 URL 末尾有 `/`（如果是子路径仓库）
3. 检查浏览器控制台的错误信息

### 问题 2: 无法连接到后端

**原因**: `VITE_BACKEND_URL` 配置错误或后端 CORS 未配置

**解决方案**:
1. 检查 GitHub Secrets 中的 `VITE_BACKEND_URL` 是否正确
2. 确认后端 CORS 配置允许 GitHub Pages 域名：
   ```javascript
   // backend/index.js
   app.use(cors({
     origin: [
       'https://username.github.io',
       'https://username.github.io/AicanGo',
       'http://localhost:3000'
     ],
     credentials: true
   }));
   ```

### 问题 3: 构建失败

**原因**: 环境变量缺失或构建错误

**解决方案**:
1. 检查 GitHub Secrets 是否都已配置
2. 查看 Actions 日志中的错误信息
3. 本地测试构建：
   ```bash
   npm run build
   ```

### 问题 4: 资源加载失败（CSS/JS 404）

**原因**: base 路径配置不正确

**解决方案**:
1. 检查 `vite.config.ts` 中的 `base` 配置
2. 确认仓库名与配置一致
3. 重新构建并部署

## 📝 本地测试 GitHub Pages 构建

在推送前，可以本地测试 GitHub Pages 的构建：

```bash
# 设置环境变量（Windows PowerShell）
$env:GITHUB_PAGES="true"
$env:GITHUB_REPOSITORY="username/AicanGo"
$env:VITE_BACKEND_URL="https://your-backend.up.railway.app"
$env:VITE_GEMINI_API_KEY="your-api-key"

# 构建
npm run build

# 预览
npm run preview
```

访问 `http://localhost:4173/AicanGo/`（根据你的仓库名调整）测试。

## ✅ 检查清单

部署前确认：

- [ ] GitHub Pages 已启用（Settings → Pages → Source: GitHub Actions）
- [ ] `VITE_BACKEND_URL` Secret 已配置
- [ ] `VITE_GEMINI_API_KEY` Secret 已配置
- [ ] 后端已部署并正常运行
- [ ] 后端 CORS 配置允许 GitHub Pages 域名
- [ ] 代码已推送到 `main` 分支

## 🎉 完成！

部署成功后，你的游戏就可以通过 GitHub Pages 访问了！

**记住**: 
- 前端：GitHub Pages（免费）
- 后端：Railway/Render（需要单独部署）

如有问题，查看 GitHub Actions 日志或提交 Issue。
