# AicanGo Git 初始化脚本
# 使用方法: .\setup-git.ps1

Write-Host "🚀 AicanGo Git 初始化脚本" -ForegroundColor Cyan
Write-Host ""

# 检查是否已经是 Git 仓库
if (Test-Path .git) {
    Write-Host "⚠️  已经是 Git 仓库，跳过初始化" -ForegroundColor Yellow
} else {
    Write-Host "📦 初始化 Git 仓库..." -ForegroundColor Green
    git init
    Write-Host "✅ Git 仓库初始化完成" -ForegroundColor Green
}

# 检查 .gitignore
if (Test-Path .gitignore) {
    Write-Host "✅ .gitignore 文件存在" -ForegroundColor Green
} else {
    Write-Host "⚠️  警告: .gitignore 文件不存在" -ForegroundColor Yellow
}

# 检查敏感文件
Write-Host ""
Write-Host "🔍 检查敏感文件..." -ForegroundColor Cyan

$sensitiveFiles = @("backend\.env", ".env.local")
$allIgnored = $true

foreach ($file in $sensitiveFiles) {
    if (Test-Path $file) {
        $ignored = git check-ignore $file 2>$null
        if ($ignored) {
            Write-Host "  ✅ $file 已被忽略" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  $file 存在但未被忽略！" -ForegroundColor Red
            $allIgnored = $false
        }
    } else {
        Write-Host "  ℹ️  $file 不存在（正常）" -ForegroundColor Gray
    }
}

if (-not $allIgnored) {
    Write-Host ""
    Write-Host "⚠️  警告: 有敏感文件未被忽略，请检查 .gitignore" -ForegroundColor Yellow
}

# 添加文件
Write-Host ""
Write-Host "📝 添加文件到 Git..." -ForegroundColor Cyan
git add .

# 显示状态
Write-Host ""
Write-Host "📊 Git 状态:" -ForegroundColor Cyan
git status --short

Write-Host ""
Write-Host "✨ 准备完成！" -ForegroundColor Green
Write-Host ""
Write-Host "下一步操作:" -ForegroundColor Yellow
Write-Host "1. 在 GitHub 创建新仓库" -ForegroundColor White
Write-Host "2. 运行以下命令连接远程仓库:" -ForegroundColor White
Write-Host "   git remote add origin https://github.com/YOUR_USERNAME/AicanGo.git" -ForegroundColor Cyan
Write-Host "   git branch -M main" -ForegroundColor Cyan
Write-Host "   git commit -m 'Initial commit'" -ForegroundColor Cyan
Write-Host "   git push -u origin main" -ForegroundColor Cyan
Write-Host ""
Write-Host "详细说明请查看 GITHUB_SETUP.md" -ForegroundColor Gray
