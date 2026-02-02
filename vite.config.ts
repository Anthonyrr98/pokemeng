import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 部署路径配置
// 如果仓库名是 username.github.io，base 应该是 '/'
// 如果是普通仓库，base 应该是 '/repository-name/'
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'AicanGo';
const base = process.env.NODE_ENV === 'production' && process.env.GITHUB_PAGES === 'true' 
  ? `/${repositoryName}/` 
  : '/';

export default defineConfig({
  plugins: [react()],
  base: base,
  define: {
    'process.env': {}
  },
  server: {
    host: true,
    port: 3000
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});