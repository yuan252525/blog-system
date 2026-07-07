import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages 部署到 https://yuan252525.github.io/blog-system/
  // 本地开发时无需此 base，由 dev server 自动处理
  base: process.env.GITHUB_PAGES === 'true' ? '/blog-system/' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5178,
    // 本地开发时把 /api 请求代理到后端（Nest 运行在 3000），
    // 否则前端页面（5178）请求 /api/v1/uploads/.../file 会被 Vite 当成前端路由
    // 返回 index.html，导致图片加载失败（裂图）。
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
