# GitHub 上传指南 🚀

按照以下步骤将项目上传到 GitHub 并准备部署。

## 📋 步骤 1: 初始化 Git 仓库

在项目根目录执行：

```bash
# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 创建初始提交
git commit -m "Initial commit: AicanGo game project"
```

## 📋 步骤 2: 在 GitHub 创建仓库

1. 访问 [GitHub](https://github.com)
2. 点击右上角 "+" → "New repository"
3. 填写信息：
   - **Repository name**: `AicanGo`（或你喜欢的名字）
   - **Description**: `AI 怪物大作战游戏 - AI-powered monster collection game`
   - **Visibility**: 选择 Public（公开）或 Private（私有）
   - **不要**勾选 "Initialize this repository with a README"（我们已经有了）
4. 点击 "Create repository"

## 📋 步骤 3: 连接本地仓库到 GitHub

GitHub 创建仓库后会显示命令，类似这样：

```bash
# 添加远程仓库（替换 YOUR_USERNAME 为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/AicanGo.git

# 重命名主分支为 main（如果还没有）
git branch -M main

# 推送代码到 GitHub
git push -u origin main
```

**完整示例**（假设你的用户名是 `rlzhao`）：
```bash
git remote add origin https://github.com/rlzhao/AicanGo.git
git branch -M main
git push -u origin main
```

## 📋 步骤 4: 验证上传

1. 刷新 GitHub 仓库页面
2. 确认所有文件都已上传
3. 检查 `.env` 文件**不应该**出现在仓库中（应该在 .gitignore 中）

## ⚠️ 重要提醒

### 确保敏感信息不被提交

在推送前，检查以下文件**不在** Git 中：

```bash
# 检查 .env 文件是否被忽略
git check-ignore backend/.env
git check-ignore .env.local

# 如果返回文件路径，说明已被忽略 ✅
# 如果没有返回，需要检查 .gitignore
```

### 如果意外提交了敏感文件

如果 `.env` 文件已经被提交，需要从 Git 历史中移除：

```bash
# 从 Git 中移除但保留本地文件
git rm --cached backend/.env
git rm --cached .env.local

# 提交更改
git commit -m "Remove sensitive files from git"

# 推送到 GitHub
git push origin main
```

## 🔄 后续更新

以后每次修改代码后：

```bash
# 查看更改
git status

# 添加更改
git add .

# 提交更改
git commit -m "描述你的更改"

# 推送到 GitHub
git push origin main
```

## 📚 下一步

上传到 GitHub 后，可以按照 [DEPLOY.md](./DEPLOY.md) 中的指南进行部署：

1. **部署后端**（Railway 或 Render）
2. **部署前端**（Vercel 或 Netlify）
3. **配置环境变量**
4. **初始化数据库**

## 🆘 遇到问题？

### 问题 1: 推送被拒绝

**错误**: `error: failed to push some refs`

**解决方案**:
```bash
# 如果远程仓库有 README 等文件，先拉取
git pull origin main --allow-unrelated-histories

# 解决冲突后再次推送
git push origin main
```

### 问题 2: 认证失败

**错误**: `Authentication failed`

**解决方案**:
- 使用 Personal Access Token（推荐）
  1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
  2. 生成新 token，勾选 `repo` 权限
  3. 推送时使用 token 作为密码

- 或使用 SSH：
```bash
# 生成 SSH key（如果还没有）
ssh-keygen -t ed25519 -C "your_email@example.com"

# 添加到 GitHub: Settings → SSH and GPG keys → New SSH key
# 复制 ~/.ssh/id_ed25519.pub 的内容

# 改用 SSH URL
git remote set-url origin git@github.com:YOUR_USERNAME/AicanGo.git
```

### 问题 3: 文件太大

**错误**: `remote: error: File is too large`

**解决方案**:
- 检查 `node_modules` 是否在 .gitignore 中
- 如果提交了大文件，使用 Git LFS 或从历史中移除

## ✅ 检查清单

上传前确认：

- [ ] `.env` 文件在 `.gitignore` 中
- [ ] `node_modules` 在 `.gitignore` 中
- [ ] `dist` 在 `.gitignore` 中
- [ ] 所有代码文件都已保存
- [ ] README.md 已更新
- [ ] 没有硬编码的 API Key 或密码

完成以上步骤后，你的项目就已经在 GitHub 上了！🎉
