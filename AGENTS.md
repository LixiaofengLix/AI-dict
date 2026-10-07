# AI-dict

个人自用的桌面划词翻译工具（macOS + Windows），Tauri 2 + React + TypeScript。需求、交互设计、数据模型和分步计划都在 `docs/DEV_PLAN.md`，动手前先读。

## 工作方式

- 一次只做 `docs/DEV_PLAN.md` 第 9 节里的一个步骤。开始前用 `git log --oneline` 看已经完成到哪一步，接着做下一步；不要顺手做后面的步骤或"后续迭代"里的内容。
- 计划里没有的功能、依赖、抽象层不要加。实现时发现计划行不通，或者有明显更简单的做法，先停下来说明，等我决定；方案改了就同步更新 `docs/DEV_PLAN.md`。
- 每一步做完：`pnpm typecheck`、`pnpm lint`、`pnpm test` 全部通过，然后告诉我怎么手动验证（在哪个应用里、按什么键、应该看到什么）。快捷键、取词、权限、窗口位置这类效果你验证不了，要等我确认。
- 我确认后再提交，一步一个提交，信息格式 `阶段号.步骤号 简述`，例如 `1.2 注册划词翻译和输入翻译快捷键`。
- 开发在 macOS 上进行，Windows 由我在另一台电脑上验证。平台相关的代码按平台分开写（Rust 用 `#[cfg(target_os = "...")]`），不要写死 macOS 的行为，比如快捷键默认值、修饰键名称。

## 参考项目

- `ReadingBook/` 和 `pot-desktop-master/` 只读，不修改，不参与构建。
- ReadingBook 的 AI 层按 `docs/DEV_PLAN.md` 第 6 节复制后修改，保留原有的注释和测试。
- pot 是 GPL-3.0，只参考交互和思路，不复制代码。它用的是 Tauri 1，API 不能照搬。

## Tauri 2

- Tauri 2 和官方插件变化很快，不要凭记忆写 API。先看 `package.json` / `Cargo.toml` 里的实际版本，再查 https://v2.tauri.app 上对应的文档。
- 插件用 `pnpm tauri add <插件名>` 安装，它会同时装好 JS 包和 Rust crate，并注册插件。
- 用到的权限要写进 `src-tauri/capabilities/`；遇到 "not allowed" 一类报错先查这里。
- Rust 只写 `docs/DEV_PLAN.md` 第 2 节第 4 条允许的内容，其余都在 TypeScript 里做。

## 命令

```bash
pnpm tauri dev      # 开发运行
pnpm typecheck
pnpm lint
pnpm test
pnpm tauri build    # 打包
```

## 代码风格

- 和 ReadingBook 保持一致：注释、UI 文案、提交信息用中文。
- 组件不直接 `invoke` Rust 命令或调插件，统一通过 `src/services/` 里的函数。
