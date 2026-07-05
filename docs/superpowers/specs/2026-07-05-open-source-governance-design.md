# 开源治理补全设计

> 版本: v1.0 日期: 2026-07-05
> 状态: 待最终确认
> 范围: 将 speed_calc 从个人本地工具升级为可开源发布的 GPL-3.0 项目

## 1. 背景与目标

### 1.1 现状

speed_calc 是 Tauri 2 + Vue 3 + TypeScript 桌面应用（行测速算训练工具），已完成 L0-L5 功能实现，323/323 测试通过，macOS/Windows 双平台可构建。但项目缺失开源发布所需的治理文件：

- 无 README（仅 SPEC.md 内部规格）
- 无 LICENSE / CONTRIBUTING / SECURITY / CODE_OF_CONDUCT / CHANGELOG
- 无 .editorconfig / ESLint / Prettier / husky / lint-staged / commitlint
- 仅有 Windows 构建 CI，无跨平台 lint-test CI、CodeQL、Dependabot
- 无 Issue / PR 模板

### 1.2 目标

补全开源项目治理标配，使项目可正式开源发布到 GitHub，贡献者能清晰了解如何参与、如何报告问题、版本如何发布。

### 1.3 约束

- License: GPL-3.0（与 SPEC.md「不商业化」红线一致）
- 不破坏现有 323 个测试和已通过验收的 L0-L5 功能
- 不改变现有代码风格（单引号 / 无分号 / 2 空格）
- 不引入新功能，仅补全治理与工程化文件

## 2. 方案选型

| 维度     | 方案 A 全套（采用）                    | 方案 B 核心      | 方案 C 最小 |
| -------- | -------------------------------------- | ---------------- | ----------- |
| 文档门面 | 6 文件                                 | 4 文件           | 2 文件      |
| 工程化   | 8 文件 + 配置                          | 6 文件           | 4 文件      |
| CI/CD    | 跨平台 + Release + CodeQL + Dependabot | 跨平台 lint-test | 单平台      |
| 社区     | Issue/PR 模板 + config                 | 无               | 无          |

**采用方案 A**：开源发布场景下完整治理结构是标配，分 4 阶段实现，每阶段独立可验收。

## 3. 实施阶段

### 阶段 1: 文档门面（6 文件）

| 文件                 | 内容                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`          | 标题 + 一句话简介；徽章区（CI / License / version / pnpm）；功能特性（基于 L0-L5）；截图占位（待补充本项目截图，不复用 ref/ 原版截图）；前置依赖（Node 24 / pnpm 11 / Rust stable / macOS 26 / Windows 10+）；安装运行（pnpm install / pnpm dev / pnpm tauri dev）；构建发布；项目结构精简树；技术栈表；贡献入口（链接 CONTRIBUTING）；License（GPL-3.0）；致谢（红领巾原版灵感，注明「独立实现、非官方」） |
| `LICENSE`            | GPL-3.0 官方全文，版权行：`Copyright (c) 2026 linkslinks`                                                                                                                                                                                                                                                                                                                                                   |
| `CONTRIBUTING.md`    | 欢迎语 + 项目定位；开发环境准备；Git 工作流（feature/* 分支命名 + Conventional Commits + commitlint 强制）；代码规范（ESLint flat + Prettier + pre-commit 自动修复）；PR 流程（fork → feature 分支 → PR → CI 通过 → review）；Issue 流程（用模板提交）；测试要求（新增功能必须有 vitest 测试，覆盖率不低于现有水平）；Tauri 桌面应用特有注意事项（macOS 签名 / Windows NSIS）                               |
| `SECURITY.md`        | 支持版本（仅最新 release）；报告方式（GitHub Security Advisory 优先，无公开邮箱）；响应时间（72 小时确认 / 7 天初步评估）；不公开披露要求（90 天 embargo）；已知安全问题处理流程                                                                                                                                                                                                                            |
| `CODE_OF_CONDUCT.md` | Contributor Covenant 2.1 标准模板                                                                                                                                                                                                                                                                                                                                                                           |
| `CHANGELOG.md`       | 初始头部 + release-please 自动维护说明（后续版本由 CI 自动追加）                                                                                                                                                                                                                                                                                                                                            |

**默认决策**：

- README 截图留「待补充」占位（避免 ref/ 原版截图混淆）
- 版权署名 `linkslinks`
- SECURITY 仅走 GitHub Security Advisory，不公开邮箱

### 阶段 2: 工程化文件（8 文件 + 配置 + 新增依赖）

| 文件                    | 内容                                                                                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.editorconfig`         | UTF-8、LF 换行、末尾换行、2 空格缩进（Vue/TS/SCSS/JSON/MD）、Markdown 末尾保留 1 空行                                                                                                                                                      |
| `eslint.config.js`      | ESLint flat config（v9+）。栈：`@eslint/js` + `typescript-eslint` + `eslint-plugin-vue` + `eslint-config-prettier`。规则：TS 推荐 + Vue3 推荐 + 禁止 `console.log`/`debugger`，警告 `any`。测试文件不强制严格类型，避免破坏现有 323 个测试 |
| `.prettierrc.json`      | 单引号、无分号、2 空格、行宽 100、尾逗号 all、箭头函数参数圆括号 always（与现有代码风格一致）                                                                                                                                              |
| `.prettierignore`       | node_modules / dist / src-tauri/target / src-tauri/gen / coverage / pnpm-lock.yaml / ref/ 截图                                                                                                                                             |
| `commitlint.config.js`  | `@commitlint/config-conventional` 中文适配：type 枚举 feat/fix/docs/style/refactor/perf/test/chore/build/ci/revert，subject 不强制大小写（中文 commit 友好）                                                                               |
| `.husky/pre-commit`     | `pnpm lint-staged`（运行 Prettier + ESLint --fix）                                                                                                                                                                                         |
| `.husky/commit-msg`     | `pnpm commitlint --edit`                                                                                                                                                                                                                   |
| `lint-staged.config.js` | `*.{ts,vue,js}` → `eslint --fix` + `prettier --write`；`*.{json,md,scss,css}` → `prettier --write`                                                                                                                                         |

**新增 package.json scripts**：

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "vue-tsc --noEmit",
    "prepare": "husky"
  }
}
```

**新增 devDependencies**：

- `eslint@^9`、`@eslint/js`、`typescript-eslint@^8`、`eslint-plugin-vue@^9`、`eslint-config-prettier`
- `prettier`
- `husky`、`lint-staged`
- `@commitlint/cli`、`@commitlint/config-conventional`

**关键决策**：

- ESLint flat config（v9+ 标准，未来方向）
- 配置完全对齐现有代码风格（单引号 / 无分号 / 2 空格），避免大规模重格式化
- pre-commit 仅跑 lint+format（秒级），test 放 CI 兜底

### 阶段 3: CI/CD（3 workflow + 1 Dependabot）

| 文件                            | 内容                                                                                                                                                                                                                                                                             |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`      | 触发：push 到 main + PR。矩阵：macos-latest + windows-latest + ubuntu-22.04（Ubuntu 需装 webkit2gtk 系统依赖）。步骤：checkout → pnpm 11 → Node 24 → Rust stable → cargo cache → pnpm install --frozen-lockfile → `pnpm lint` → `pnpm test` → `pnpm typecheck`。不跑 tauri build |
| `.github/workflows/release.yml` | 触发：push tag `v*`。矩阵：macos + windows。步骤：合并现有 `build-windows.yml` 内容，扩展 macOS .app + .dmg 构建（无证书则 ad-hoc 签名）。产物上传到 GitHub Release。**删除 build-windows.yml**，避免双源维护                                                                    |
| `.github/workflows/codeql.yml`  | 触发：push 到 main + PR + 每周定时。CodeQL 静态安全分析（TS + JS），GitHub 原生免费                                                                                                                                                                                              |
| `.github/dependabot.yml`        | 监控：npm（每日）、cargo（每周，src-tauri/）、github-actions（每周）。分组更新，自动开 PR                                                                                                                                                                                        |

**关键决策**：

- build-windows.yml 合并到 release.yml 后删除（避免双源维护混乱）
- Ubuntu 加入 CI 矩阵（3 平台覆盖是开源项目标配）
- CI 不跑 tauri build（节省 CI 配额，仅 release workflow 跑）
- CodeQL 加入（GitHub 免费功能，零配置成本）
- Dependabot：npm 每日（前端库迭代快），cargo 每周（Rust 生态稳定）

### 阶段 4: 社区文件（4 模板）

| 文件                                         | 内容                                                                                                                                                                                                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/ISSUE_TEMPLATE/bug_report.yml`      | GitHub Actions 表单式。字段：标题 + 描述 + 复现步骤 + 期望行为 + 实际行为 + 截图（可选）+ 环境（OS / 版本 / Tauri 版本，下拉选择）+ 日志（可选折叠）。标签自动加 `bug`                                                                                          |
| `.github/ISSUE_TEMPLATE/feature_request.yml` | 表单式。字段：标题 + 解决的问题 + 期望方案 + 替代方案 + 其他。标签自动加 `enhancement`                                                                                                                                                                          |
| `.github/ISSUE_TEMPLATE/config.yml`          | `blank_issues_enabled: false`（强制使用模板）+ 联系引导（「问题先去 Discussions 讨论」）                                                                                                                                                                        |
| `.github/PULL_REQUEST_TEMPLATE.md`           | Markdown 模板。结构：## 概述 / ## 变更类型（feat/fix/docs/refactor/test/chore，多选）/ ## 关联 Issue（Fixes #xxx）/ ## 测试 / ## 自检清单（5 项：本地 lint/test 通过、新增测试覆盖、文档已更新、commit message 遵循 Conventional Commits、无 console.log 残留） |

**关键决策**：

- Issue 模板用表单式（YAML）—— GitHub 2022+ 推荐，字段结构化便于 triage
- PR 模板自检清单是引导而非强制
- 暂不加 CODEOWNERS（项目目前单人维护，会强制 review 阻塞 PR）
- 不加 Funding.yml（GPL-3.0 个人项目，无商业化）

## 4. 验收标准

### 阶段 1 验收

- 6 文件存在且内容完整
- README 在 GitHub 仓库主页正常渲染
- LICENSE 被 GitHub 自动识别为 GPL-3.0

### 阶段 2 验收

- `pnpm install` 成功安装所有新依赖
- `pnpm lint` 通过（可能需要先 `pnpm format` 一次性格式化）
- `pnpm test` 仍然 323/323 通过（不破坏现有测试）
- `pnpm typecheck` 通过
- `git commit` 触发 husky pre-commit 和 commit-msg 钩子
- 故意写错 commit message 时被 commitlint 拒绝

### 阶段 3 验收

- push 到 main 触发 ci.yml，3 平台矩阵全部通过
- CodeQL workflow 在 GitHub Security 标签页可见
- Dependabot 在 push 后 24 小时内开始监控并开 PR

### 阶段 4 验收

- 在 GitHub 仓库 New Issue 页面看到 bug/feature 两个模板选项
- 创建 PR 时自动加载 PR 模板

## 5. 不在范围

- 不实现 GitHub Discussions 启用（属仓库设置，非文件层面）
- 不实现 release-please 自动 CHANGELOG（属后续增强）
- 不修改现有业务代码（除一次性 `pnpm format` 格式化）
- 不实现 macOS 代码签名（需 Apple Developer 证书，属后续）
- 不加 CODEOWNERS / Funding.yml

## 6. 风险与缓解

| 风险                                                | 缓解                                                         |
| --------------------------------------------------- | ------------------------------------------------------------ |
| ESLint flat config 与现有代码冲突导致大量 lint 错误 | 先 `pnpm format` 一次性格式化，再调整 ESLint 规则至通过      |
| husky 钩子失败阻塞已有 commit 流程                  | 钩子仅做格式化和 lint，不跑测试；提供 `--no-verify` 应急出口 |
| Ubuntu CI 因 Tauri 系统依赖缺失失败                 | 在 workflow 中显式安装 webkit2gtk-4.1 / libgtk-3-dev 等      |
| build-windows.yml 删除后历史 release 失效           | git 历史保留，且 release.yml 完全覆盖其功能                  |

## 7. 后续可选增强

- 启用 GitHub Discussions（仓库 Settings → Features）
- 集成 release-please 自动维护 CHANGELOG
- 添加 macOS Developer ID 签名与公证
- 添加 CODEOWNERS（多人协作后）
- 添加 Vite bundle analyzer / visualizer
- 添加 GitHub Pages 部署用户文档
