import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 使用自定义域名（如 game.rlzhao.com / test.rlzhao.com）时，
// 站点根就是域名本身，因此 base 固定为 '/'
const base = '/';

export default defineConfig({
  plugins: [react()],
  base,
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