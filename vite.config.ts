// 用 vitest/config 的 defineConfig：它带 test 字段的类型，vite 本身也能读
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import process from 'node:process';

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // 以下几项只在 tauri dev / tauri build 时起作用
  // 1. 别让 Vite 清屏把 Rust 的报错刷掉
  clearScreen: false,
  // 2. Tauri 要求端口固定，被占用时直接失败
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. src-tauri 的改动由 Rust 自己监听
      ignored: ['**/src-tauri/**'],
    },
  },

  // 只测 src/ 下的纯逻辑；参考项目（ReadingBook 等）里的测试不参与
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
