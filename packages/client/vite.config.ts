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
  },
});
