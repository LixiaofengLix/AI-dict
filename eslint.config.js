// ESLint 扁平配置：JS / TS 官方推荐 + React Hooks + React Refresh。
// 与 Prettier 冲突的格式规则交给 eslint-config-prettier 关掉，它必须排在最后。
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default defineConfig([
  {
    // design/ 是本地 UI 设计台（不入库），有它自己的 eslint.config.js，主项目不扫它
    ignores: ['dist/', 'src-tauri/', 'ReadingBook/', 'pot-desktop-master/', 'design/'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      prettier,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // 构建配置跑在 Node 里
    files: ['*.config.{js,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
