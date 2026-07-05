# 开源治理补全实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 speed_calc 从个人本地工具升级为可开源发布的 GPL-3.0 项目，补全文档门面、工程化、CI/CD、社区文件。

**架构：** 4 阶段独立交付——文档门面（6 文件）→ 工程化（8 文件 + 依赖）→ CI/CD（3 workflow + Dependabot）→ 社区（4 模板）。每阶段验收后进入下一阶段。

**技术栈：** Tauri 2.x + Vue 3 + TypeScript + Vite + Vitest + pnpm 11 + Node 26 + Rust 1.96

**规格文档：** `docs/superpowers/specs/2026-07-05-open-source-governance-design.md`

---

## 文件结构总览

### 阶段 1: 文档门面（6 文件）

| 路径                 | 职责                                     |
| -------------------- | ---------------------------------------- |
| `LICENSE`            | GPL-3.0 官方全文 + 版权行                |
| `CHANGELOG.md`       | 版本变更记录入口                         |
| `README.md`          | 项目门面，GitHub 主页渲染                |
| `CONTRIBUTING.md`    | 贡献者指南                               |
| `SECURITY.md`        | 安全漏洞报告流程                         |
| `CODE_OF_CONDUCT.md` | 社区行为准则（Contributor Covenant 2.1） |

### 阶段 2: 工程化（8 文件 + package.json 修改）

| 路径                    | 职责                           |
| ----------------------- | ------------------------------ |
| `.editorconfig`         | 跨编辑器基础格式               |
| `.prettierrc.json`      | Prettier 格式化规则            |
| `.prettierignore`       | Prettier 忽略清单              |
| `eslint.config.js`      | ESLint flat config（v9+）      |
| `commitlint.config.js`  | Conventional Commits 中文适配  |
| `lint-staged.config.js` | lint-staged 文件类型映射       |
| `.husky/pre-commit`     | pre-commit 钩子                |
| `.husky/commit-msg`     | commit-msg 钩子                |
| `package.json`（修改）  | 新增 scripts + devDependencies |

### 阶段 3: CI/CD（4 文件，删除 1 文件）

| 路径                                          | 职责                          |
| --------------------------------------------- | ----------------------------- |
| `.github/workflows/ci.yml`                    | 跨平台 lint-test CI           |
| `.github/workflows/release.yml`               | Release 构建 + GitHub Release |
| `.github/workflows/codeql.yml`                | CodeQL 静态安全分析           |
| `.github/dependabot.yml`                      | 依赖更新监控                  |
| `.github/workflows/build-windows.yml`（删除） | 合并到 release.yml 后删除     |

### 阶段 4: 社区（4 模板）

| 路径                                         | 职责           |
| -------------------------------------------- | -------------- |
| `.github/ISSUE_TEMPLATE/bug_report.yml`      | Bug 报告表单   |
| `.github/ISSUE_TEMPLATE/feature_request.yml` | 功能请求表单   |
| `.github/ISSUE_TEMPLATE/config.yml`          | Issue 模板配置 |
| `.github/PULL_REQUEST_TEMPLATE.md`           | PR 模板        |

---

## 阶段 1: 文档门面

### 任务 1: 创建 LICENSE + CHANGELOG.md

**文件：**

- 创建：`LICENSE`
- 创建：`CHANGELOG.md`

- [ ] **步骤 1: 下载 GPL-3.0 官方全文**

运行：

```bash
curl -sL https://www.gnu.org/licenses/gpl-3.0.txt -o LICENSE
```

- [ ] **步骤 2: 在 LICENSE 顶部追加版权行**

在文件最顶部插入：

```
Copyright (c) 2026 linkslinks

```

运行：

```bash
printf 'Copyright (c) 2026 linkslinks\n\n' | cat - LICENSE > LICENSE.tmp && mv LICENSE.tmp LICENSE
```

- [ ] **步骤 3: 验证 LICENSE 内容**

运行：`head -5 LICENSE`
预期输出：

```
Copyright (c) 2026 linkslinks

                    GNU GENERAL PUBLIC LICENSE
                       Version 3, 29 June 2007
```

- [ ] **步骤 4: 创建 CHANGELOG.md**

写入文件 `CHANGELOG.md`：

```markdown
# Changelog

本项目所有重要变更记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本管理遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- 项目初始化开源治理结构（README / LICENSE / CONTRIBUTING / SECURITY / CODE_OF_CONDUCT）。
- 跨平台 CI（macOS / Windows / Ubuntu）lint + test + typecheck。
- CodeQL 静态安全分析。
- Dependabot 依赖更新监控。
- Issue 模板（bug / feature）+ PR 模板。

### Changed

- 集成 ESLint flat config + Prettier + husky + lint-staged + commitlint 工程化链路。
- 合并 `build-windows.yml` 到 `release.yml`，新增 macOS 构建。

## [0.1.0] - 2026-07-02

### Added

- L0 骨架 + Solarized 深色主题 + Liquid Glass 玻璃导航。
- L1 基础计算闭环（双输入 + 计时 + 判分 + 历史）。
- L2 资料分析 9 类填空 + 百化分反向。
- L3 比较题 + 一表通算复合题。
- L4 设置项 + 自定义运算 + N-back。
- L5 历史记录 + 统计图表。
- 键盘映射重构（右手小键盘映射 + QWERTY/Norman 双布局）。
- Windows NSIS 构建 CI。

[Unreleased]: https://github.com/linkslinks/speed_calc/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/linkslinks/speed_calc/releases/tag/v0.1.0
```

- [ ] **步骤 5: Commit**

```bash
git add LICENSE CHANGELOG.md
git commit -m "docs: 添加 GPL-3.0 LICENSE 与 CHANGELOG"
```

---

### 任务 2: 创建 README.md

**文件：**

- 创建：`README.md`

- [ ] **步骤 1: 创建 README.md**

写入文件 `README.md`：

````markdown
# 行测小助手

> 资料分析速算训练工具 — Tauri 2 本地桌面应用，离线使用

[![CI](https://github.com/linkslinks/speed_calc/actions/workflows/ci.yml/badge.svg)](https://github.com/linkslinks/speed_calc/actions/workflows/ci.yml)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![pnpm](https://img.shields.io/badge/pnpm-11-orange.svg)](https://pnpm.io/)
[![Tauri](https://img.shields.io/badge/Tauri-2-orange.svg)](https://tauri.app/)

将网友红领巾的「行测小助手」微信小程序以功能对等方式复刻为 Tauri 本地桌面应用，供个人离线使用。程序按参数随机出计算题 + 自定义数字键盘作答 + 计时判分 + 历史统计。

> **声明**：本项目灵感源自网友红领巾的行测小助手，独立实现，非官方版本。不反编译原小程序、不蹭「红领巾」名号、不传播、不商业化。

## 功能特性

- **基础计算训练** — 加减乘除、混合运算、自定义运算配置
- **资料分析专项** — 9 类填空题（基期/现期/增长量/增长率/比重等）+ 百化分反向
- **比较题** — 左右两数大小比较，物理键 `,`/`.` 直接作答
- **一表通算复合题** — 单题多空，一次输入求解 13 个相关字段
- **N-back 训练** — 工作 memory 训练模式
- **双输入路径** — 屏幕数字键盘 + 物理键盘（QWERTY / Norman 双布局）
- **计时判分** — 题型 × 题量 → 合格 / 良好 / 优秀秒数
- **历史统计** — 分页历史 + ECharts 可视化图表
- **Solarized 深色主题** — 护眼配色 + macOS Liquid Glass 玻璃导航
- **离线运行** — 全部数据本地 SQLite 存储，无需联网

## 前置依赖

| 依赖    | 版本要求 | 说明                |
| ------- | -------- | ------------------- |
| Node.js | ≥ 24     | 推荐使用 LTS        |
| pnpm    | ≥ 11     | 包管理器            |
| Rust    | stable   | Tauri 编译需要      |
| macOS   | ≥ 26     | 仅 macOS 构建需要   |
| Windows | ≥ 10     | 仅 Windows 构建需要 |

## 快速开始

```bash
# 安装依赖
pnpm install

# 开发模式（仅前端）
pnpm dev

# 桌面应用开发模式（Tauri + 前端）
pnpm tauri dev

# 运行测试
pnpm test

# 代码检查
pnpm lint

# 类型检查
pnpm typecheck
```

## 构建发布

```bash
# 构建当前平台桌面应用
pnpm tauri build

# 仅构建 macOS .app
pnpm tauri build --bundles app

# 仅构建 Windows NSIS 安装包
pnpm tauri build --bundles nsis
```

构建产物位于 `src-tauri/target/release/bundle/`。

## 项目结构

```
speed_calc/
├── src/                    # Vue 3 前端源码
│   ├── components/         # 组件（Numpad / CompareKeypad / QuestionDisplay 等）
│   ├── generators/         # 题目生成器（basic / dataAnalysis / compareAnalysis 等）
│   ├── stores/             # Pinia 状态管理（practice / settings）
│   ├── views/              # 页面（Home / PracticeSession / Settings / History / Stats）
│   ├── utils/              # 工具函数（keymap 键盘映射）
│   └── styles/             # Solarized 主题 + Liquid Glass 样式
├── src-tauri/              # Tauri Rust 后端
│   ├── src/                # Rust 入口
│   ├── migrations/         # SQLite 迁移脚本
│   └── tauri.conf.json     # Tauri 配置
├── references/             # 设计规格参考文档
├── docs/superpowers/       # 设计文档与实现计划
└── SPEC.md                 # 项目技术规格
```

## 技术栈

| 层          | 选型                               |
| ----------- | ---------------------------------- |
| 桌面框架    | Tauri 2.x                          |
| 前端框架    | Vue 3 + TypeScript + Vite          |
| UI 组件库   | Element Plus（Solarized 深色主题） |
| 状态管理    | Pinia                              |
| 图表 / 公式 | ECharts / KaTeX                    |
| 本地存储    | SQLite（tauri-plugin-sql）         |
| 测试框架    | Vitest + @vue/test-utils           |

## 贡献

欢迎贡献！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解开发流程、代码规范和 PR 提交流程。

发现 bug 或有功能建议？请通过 [Issue](https://github.com/linkslinks/speed_calc/issues) 提交（先搜索是否已有相同 issue）。

## 安全漏洞报告

请阅读 [SECURITY.md](SECURITY.md) 了解如何报告安全漏洞。

## License

本项目基于 [GPL-3.0](LICENSE) 协议开源。

Copyright (c) 2026 linkslinks

## 致谢

- 灵感源自网友红领巾的「行测小助手」微信小程序
- [Tauri](https://tauri.app/) — 跨平台桌面应用框架
- [Vue 3](https://vuejs.org/) — 渐进式前端框架
- [Element Plus](https://element-plus.org/) — Vue 3 组件库
- [Solarized](https://ethanschoonover.com/solarized/) — 配色方案
````

- [ ] **步骤 2: 验证 README 在 GitHub 主页可正常渲染**

运行：`head -10 README.md`
预期输出前 10 行包含标题和简介。

- [ ] **步骤 3: Commit**

```bash
git add README.md
git commit -m "docs: 添加 README 项目门面"
```

---

### 任务 3: 创建 CONTRIBUTING.md + SECURITY.md + CODE_OF_CONDUCT.md

**文件：**

- 创建：`CONTRIBUTING.md`
- 创建：`SECURITY.md`
- 创建：`CODE_OF_CONDUCT.md`

- [ ] **步骤 1: 创建 CONTRIBUTING.md**

写入文件 `CONTRIBUTING.md`：

````markdown
# 贡献指南

欢迎为行测小助手贡献代码！本文档说明开发流程和规范。

## 项目定位

本项目是 Tauri 2 本地桌面应用，复刻行测小助手速算训练功能。所有数据本地存储，离线运行。详见 [README.md](README.md) 和 [SPEC.md](SPEC.md)。

## 开发环境准备

### 依赖安装

| 依赖    | 版本要求 |
| ------- | -------- |
| Node.js | ≥ 24     |
| pnpm    | ≥ 11     |
| Rust    | stable   |

```bash
# 克隆仓库
git clone https://github.com/linkslinks/speed_calc.git
cd speed_calc

# 安装前端依赖
pnpm install

# 启动开发模式
pnpm tauri dev
```

### 验证开发环境

```bash
pnpm test       # 应全部通过
pnpm lint       # 应无错误
pnpm typecheck  # 应无错误
```

## Git 工作流

### 分支命名

- `feature/<功能名>` — 新功能（如 `feature/keyboard-mapping`）
- `fix/<问题描述>` — Bug 修复（如 `fix/numpad-focus`）
- `docs/<文档主题>` — 文档变更（如 `docs/contributing`）
- `refactor/<重构主题>` — 代码重构

### Conventional Commits

本项目使用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 规范，由 commitlint 强制校验：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**type 枚举**：

| type       | 说明                       |
| ---------- | -------------------------- |
| `feat`     | 新功能                     |
| `fix`      | Bug 修复                   |
| `docs`     | 文档变更                   |
| `style`    | 代码格式（不影响功能）     |
| `refactor` | 重构（既非 feat 也非 fix） |
| `perf`     | 性能优化                   |
| `test`     | 测试相关                   |
| `chore`    | 构建 / 工具链 / 杂项       |
| `build`    | 构建系统或外部依赖变更     |
| `ci`       | CI 配置变更                |
| `revert`   | 回滚某次提交               |

**示例**：

```
feat: 新增 Norman 键盘布局支持
fix: 修复 CompositeSession 负数输入失效
docs: 添加键盘映射重构设计文档
refactor: PracticeSession handleKeydown 改用 keymap 模块
```

中文 subject 不强制大小写。所有 commit 在 commit-msg 钩子中自动校验。

## 代码规范

### 格式化

- **Prettier** 配置：单引号、无分号、2 空格缩进、行宽 100
- **ESLint** flat config：TypeScript + Vue 3 推荐规则，禁止 `console.log`/`debugger`
- pre-commit 钩子自动运行 `lint-staged` 格式化暂存文件

### 代码风格约定

- TypeScript 优先使用类型推导，避免不必要的 `any`
- Vue 单文件组件使用 `<script setup lang="ts">` 语法
- 题目生成器为纯函数，便于单元测试
- 新增题目类型需对应 `time_standards` 种子数据

## PR 流程

1. **Fork** 仓库到个人账号
2. **创建分支**：`git checkout -b feature/<功能名>`
3. **编写代码**：遵循上述代码规范，新增功能必须有 vitest 测试
4. **本地验证**：
   ```bash
   pnpm test
   pnpm lint
   pnpm typecheck
   ```
5. **提交 commit**：遵循 Conventional Commits 规范
6. **推送分支**：`git push origin feature/<功能名>`
7. **创建 PR**：使用 PR 模板填写概述、变更类型、关联 Issue、测试说明
8. **CI 通过**：所有 CI 检查项必须通过
9. **Code Review**：等待 review，根据反馈调整
10. **合并**：squash merge 或 rebase merge

## 测试要求

- 新增功能必须有对应的 vitest 测试
- 测试文件放在 `__tests__/` 目录下，与被测文件同级
- 测试命名：`<被测文件名>.test.ts`
- 测试覆盖率不低于项目现有水平
- 题目生成器测试应覆盖边界情况（最小值 / 最大值 / 零值 / 负值）

## Tauri 桌面应用注意事项

### macOS

- 应用包大小必须 < 30 MB
- macOS Tahoe 26+ 需 ad-hoc 签名和 entitlements.plist 解决 TCC 限制
- DMG 打包在 CI 沙箱环境可能失败，本地构建正常
- 使用 `pnpm tauri build` 一步编译，避免分步 `cargo build` + `pnpm tauri bundle` 导致增量编译缓存问题

### Windows

- 使用 NSIS 安装包格式（WiX 对中文产品名支持差）
- Windows 构建产物：`*-setup.exe`

### 跨平台

- 不要在业务代码中使用平台特定 API
- 平台差异通过 Tauri capabilities 配置隔离
- 物理键盘映射使用 `e.code` 而非 `e.key`，保证跨平台一致性

## Issue 流程

1. 在 [Issues](https://github.com/linkslinks/speed_calc/issues) 页面搜索是否已有相同问题
2. 选择对应模板（Bug 报告 / 功能请求）
3. 按模板填写完整信息
4. 提交后耐心等待回应（72 小时内确认）

## 联系方式

- 通过 GitHub Issue / PR 沟通
- 安全漏洞请按 [SECURITY.md](SECURITY.md) 流程报告，勿在公开 Issue 提交
````

- [ ] **步骤 2: 创建 SECURITY.md**

写入文件 `SECURITY.md`：

```markdown
# 安全策略

## 支持版本

本项目仅对最新 release 提供安全更新。

| 版本         | 支持状态  |
| ------------ | --------- |
| 最新 release | ✅ 支持   |
| 旧版本       | ❌ 不支持 |

## 报告安全漏洞

**请不要通过公开 Issue 报告安全漏洞。**

请通过 GitHub Security Advisory 报告：

1. 前往仓库 [Security](https://github.com/linkslinks/speed_calc/security/advisories) 页面
2. 点击「Report a vulnerability」
3. 填写漏洞描述、复现步骤、影响范围、建议修复方案

### 响应时间

| 阶段         | 时间                           |
| ------------ | ------------------------------ |
| 确认收到报告 | 72 小时内                      |
| 初步评估     | 7 天内                         |
| 修复版本发布 | 视严重程度而定（高危 30 天内） |

### 公开披露

- 在修复版本发布前，请勿公开披露漏洞细节
- 我们承诺 90 天 embargo 期内推进修复
- 修复发布后，我们会在 GitHub Security Advisory 公开致谢

## 已知安全考量

- 本应用为本地桌面应用，所有数据存储在本地 SQLite，不涉及网络传输
- Tauri capabilities 已按最小权限原则配置
- 物理键盘输入不离开应用进程

## 接收安全公告

Watch 本仓库或订阅 [GitHub Security Advisories](https://github.com/linkslinks/speed_calc/security/advisories) 接收安全公告。
```

- [ ] **步骤 3: 下载 Contributor Covenant 2.1 标准模板**

运行：

```bash
curl -sL https://www.contributor-covenant.org/version/2/1/code_of_conduct/code_of_conduct.md -o CODE_OF_CONDUCT.md
```

- [ ] **步骤 4: 在 CODE_OF_CONDUCT.md 顶部添加项目说明**

在文件最顶部插入：

```
# Contributor Covenant Code of Conduct

```

如果下载的文件已有此标题，跳过此步骤。否则运行：

```bash
head -1 CODE_OF_CONDUCT.md | grep -q "Contributor Covenant Code of Conduct" || printf '# Contributor Covenant Code of Conduct\n\n' | cat - CODE_OF_CONDUCT.md > CODE_OF_CONDUCT.md.tmp && mv CODE_OF_CONDUCT.md.tmp CODE_OF_CONDUCT.md
```

- [ ] **步骤 5: 验证 3 个文件存在且内容完整**

运行：`ls -la CONTRIBUTING.md SECURITY.md CODE_OF_CONDUCT.md && wc -l CONTRIBUTING.md SECURITY.md CODE_OF_CONDUCT.md`
预期：3 个文件均存在，行数 > 20。

- [ ] **步骤 6: Commit**

```bash
git add CONTRIBUTING.md SECURITY.md CODE_OF_CONDUCT.md
git commit -m "docs: 添加 CONTRIBUTING / SECURITY / CODE_OF_CONDUCT"
```

---

## 阶段 2: 工程化文件

### 任务 4: 创建 .editorconfig + Prettier 配置

**文件：**

- 创建：`.editorconfig`
- 创建：`.prettierrc.json`
- 创建：`.prettierignore`

- [ ] **步骤 1: 创建 .editorconfig**

写入文件 `.editorconfig`：

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.{rs,toml}]
indent_size = 4

[*.md]
trim_trailing_whitespace = false
max_line_length = off

[Makefile]
indent_style = tab
```

- [ ] **步骤 2: 创建 .prettierrc.json**

写入文件 `.prettierrc.json`：

```json
{
  "singleQuote": true,
  "semi": false,
  "tabWidth": 2,
  "printWidth": 100,
  "trailingComma": "all",
  "arrowParens": "always",
  "endOfLine": "lf",
  "vueIndentScriptAndStyle": false,
  "htmlWhitespaceSensitivity": "css"
}
```

- [ ] **步骤 3: 创建 .prettierignore**

写入文件 `.prettierignore`：

```
# Dependencies
node_modules/
.pnpm-store/

# Build artifacts
dist/
dist-ssr/
build/
*.tsbuildinfo

# Tauri
src-tauri/target/
src-tauri/gen/
src-tauri/WixTools/
src-tauri/.cargo/

# Tauri bundle outputs
*.dmg
*.app
*.exe
*.msi
*.deb
*.rpm
*.AppImage
*.snap

# Cache
.vite/
.vitest/
coverage/

# Lock files
pnpm-lock.yaml
Cargo.lock

# Original app screenshots (reference only)
ref/

# OS files
.DS_Store

# IDE
.vscode/
.idea/

# Superpowers runtime
.superpowers/
.worktrees/
```

- [ ] **步骤 4: 验证 Prettier 配置可读取**

运行：`pnpm prettier --check package.json 2>&1 || true`
预期：报错「pnpm prettier: command not found」（依赖尚未安装，配置已就绪）。

- [ ] **步骤 5: Commit**

```bash
git add .editorconfig .prettierrc.json .prettierignore
git commit -m "chore: 添加 .editorconfig 与 Prettier 配置"
```

---

### 任务 5: 创建 ESLint flat config

**文件：**

- 创建：`eslint.config.js`

- [ ] **步骤 1: 创建 eslint.config.js**

写入文件 `eslint.config.js`：

```javascript
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import eslintConfigPrettier from 'eslint-config-prettier'

export default [
  {
    ignores: [
      'dist/**',
      'src-tauri/**',
      'node_modules/**',
      'coverage/**',
      'ref/**',
      'docs/superpowers/**',
      '.vite/**',
      '.vitest/**',
      '*.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
    },
  },
  {
    files: ['**/__tests__/**', '**/*.test.ts', 'vitest.config.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  eslintConfigPrettier,
]
```

- [ ] **步骤 2: Commit**

```bash
git add eslint.config.js
git commit -m "chore: 添加 ESLint flat config（TS + Vue3 + Prettier）"
```

---

### 任务 6: 安装依赖 + 配置 husky + lint-staged + commitlint

**文件：**

- 修改：`package.json`
- 创建：`commitlint.config.js`
- 创建：`lint-staged.config.js`
- 创建：`.husky/pre-commit`
- 创建：`.husky/commit-msg`

- [ ] **步骤 1: 安装 devDependencies**

运行：

```bash
pnpm add -D eslint@^9 @eslint/js typescript-eslint@^8 eslint-plugin-vue@^9 eslint-config-prettier prettier husky lint-staged @commitlint/cli @commitlint/config-conventional
```

- [ ] **步骤 2: 验证依赖安装成功**

运行：`pnpm list eslint prettier husky lint-staged @commitlint/cli`
预期：列出已安装版本，无 missing。

- [ ] **步骤 3: 在 package.json 添加 scripts**

读取 `package.json`，在 `scripts` 对象中添加（保持原有 scripts）：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "vue-tsc --noEmit",
    "prepare": "husky"
  }
}
```

- [ ] **步骤 4: 初始化 husky**

运行：`pnpm husky init`
预期：创建 `.husky/` 目录，生成 `.husky/pre-commit` 示例文件。

- [ ] **步骤 5: 创建 commitlint.config.js**

写入文件 `commitlint.config.js`：

```javascript
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'chore',
        'build',
        'ci',
        'revert',
      ],
    ],
    'subject-case': [0],
    'header-max-length': [2, 'always', 100],
  },
}
```

- [ ] **步骤 6: 创建 lint-staged.config.js**

写入文件 `lint-staged.config.js`：

```javascript
export default {
  '*.{ts,vue,js,cjs,mjs}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,scss,css,html,yml,yaml}': ['prettier --write'],
}
```

- [ ] **步骤 7: 覆写 .husky/pre-commit**

写入文件 `.husky/pre-commit`：

```sh
pnpm lint-staged
```

- [ ] **步骤 8: 创建 .husky/commit-msg**

写入文件 `.husky/commit-msg`：

```sh
pnpm commitlint --edit
```

- [ ] **步骤 9: 确保 husky 钩子可执行**

运行：

```bash
chmod +x .husky/pre-commit .husky/commit-msg
```

- [ ] **步骤 10: 验证 commitlint 可拒绝错误格式**

运行（应失败）：

```bash
echo "bad message format" | pnpm commitlint
```

预期：非零退出码。

运行（应通过）：

```bash
echo "feat: 测试消息" | pnpm commitlint
```

预期：退出码 0。

- [ ] **步骤 11: Commit**

```bash
git add package.json pnpm-lock.yaml commitlint.config.js lint-staged.config.js .husky/
git commit -m "chore: 集成 husky + lint-staged + commitlint 工程化链路"
```

---

### 任务 7: 一次性格式化 + 验证 lint/test/typecheck 通过

**文件：**

- 修改：所有源码文件（一次性 Prettier 格式化）

- [ ] **步骤 1: 运行 Prettier 一次性格式化**

运行：`pnpm format`
预期：输出格式化的文件列表，可能包含现有源码文件。

- [ ] **步骤 2: 检查格式化变更**

运行：`git diff --stat`
预期：仅格式变更，无逻辑变更。

- [ ] **步骤 3: 运行 ESLint**

运行：`pnpm lint`
预期：可能有 `warn`（console.log / any），但无 `error`。如有 error，手动修复。

- [ ] **步骤 4: 运行类型检查**

运行：`pnpm typecheck`
预期：vue-tsc 无错误。

- [ ] **步骤 5: 运行测试**

运行：`pnpm test`
预期：323/323 测试全部通过（与改造前一致）。如有失败，回退该文件的格式化或调整测试。

- [ ] **步骤 6: Commit 格式化变更**

```bash
git add -A
git commit -m "style: 应用 Prettier 一次性格式化"
```

- [ ] **步骤 7: 验证 commitlint 钩子生效**

尝试运行（应被拒绝）：

```bash
git commit -m "bad format" --allow-empty 2>&1 || true
```

预期：commitlint 拒绝，非零退出码。

---

## 阶段 3: CI/CD

### 任务 8: 创建跨平台 CI workflow

**文件：**

- 创建：`.github/workflows/ci.yml`

- [ ] **步骤 1: 创建 ci.yml**

写入文件 `.github/workflows/ci.yml`：

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-test:
    name: Lint + Test + Typecheck
    strategy:
      fail-fast: false
      matrix:
        os: [macos-latest, windows-latest, ubuntu-22.04]
    runs-on: ${{ matrix.os }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 11

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Cache Rust
        uses: Swatinem/rust-cache@v2
        with:
          workspaces: src-tauri

      - name: Install system dependencies (Ubuntu)
        if: matrix.os == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Test
        run: pnpm test
```

- [ ] **步骤 2: 验证 YAML 语法**

运行：`pnpm exec node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/ci.yml','utf8')); console.log('YAML OK')"`
预期：输出 `YAML OK`。

- [ ] **步骤 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: 添加跨平台 lint+test+typecheck CI（mac/win/ubuntu）"
```

---

### 任务 9: 创建 Release workflow + 删除 build-windows.yml

**文件：**

- 创建：`.github/workflows/release.yml`
- 删除：`.github/workflows/build-windows.yml`

- [ ] **步骤 1: 创建 release.yml**

写入文件 `.github/workflows/release.yml`：

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    name: Build and Release
    strategy:
      fail-fast: false
      matrix:
        include:
          - os: macos-latest
            target: aarch64-apple-darwin
            bundles: app,dmg
          - os: windows-latest
            target: x86_64-pc-windows-msvc
            bundles: nsis
    runs-on: ${{ matrix.os }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 11

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - name: Cache Rust
        uses: Swatinem/rust-cache@v2
        with:
          workspaces: src-tauri

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build Tauri app
        run: pnpm tauri build --bundles ${{ matrix.bundles }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: speed-calc-${{ matrix.os }}
          path: |
            src-tauri/target/release/bundle/**/*.app
            src-tauri/target/release/bundle/**/*.dmg
            src-tauri/target/release/bundle/nsis/*-setup.exe
            src-tauri/target/release/speed-calc*
            src-tauri/target/release/speed_calc*
          if-no-files-found: error
          retention-days: 90

      - name: Release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            src-tauri/target/release/bundle/**/*.app
            src-tauri/target/release/bundle/**/*.dmg
            src-tauri/target/release/bundle/nsis/*-setup.exe
          draft: false
          prerelease: false
          generate_release_notes: true
```

- [ ] **步骤 2: 删除 build-windows.yml**

运行：

```bash
git rm .github/workflows/build-windows.yml
```

- [ ] **步骤 3: 验证 release.yml 语法**

运行：`pnpm exec node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/release.yml','utf8')); console.log('YAML OK')"`
预期：输出 `YAML OK`。

- [ ] **步骤 4: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: 合并 build-windows 到 release workflow，新增 macOS 构建"
```

---

### 任务 10: 创建 CodeQL workflow + Dependabot

**文件：**

- 创建：`.github/workflows/codeql.yml`
- 创建：`.github/dependabot.yml`

- [ ] **步骤 1: 创建 codeql.yml**

写入文件 `.github/workflows/codeql.yml`：

```yaml
name: CodeQL

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 0 * * 1'

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    strategy:
      fail-fast: false
      matrix:
        language: [javascript-typescript]

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}
          queries: +security-and-quality

      - name: Autobuild
        uses: github/codeql-action/autobuild@v3

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: '/language:${{ matrix.language }}'
```

- [ ] **步骤 2: 创建 dependabot.yml**

写入文件 `.github/dependabot.yml`：

```yaml
version: 2

updates:
  - package-ecosystem: npm
    directory: '/'
    schedule:
      interval: daily
      time: '08:00'
      timezone: Asia/Shanghai
    open-pull-requests-limit: 5
    groups:
      eslint:
        patterns:
          - 'eslint*'
          - '@eslint/*'
          - 'typescript-eslint'
      vue:
        patterns:
          - 'vue'
          - '@vue/*'
          - 'vue-*'
          - 'eslint-plugin-vue'
      test:
        patterns:
          - 'vitest'
          - '@vue/test-utils'
          - 'jsdom'
          - '@pinia/testing'
      tauri:
        patterns:
          - '@tauri-apps/*'
      commitlint:
        patterns:
          - '@commitlint/*'
    commit-message:
      prefix: 'chore(deps)'
      include: scope

  - package-ecosystem: cargo
    directory: '/src-tauri'
    schedule:
      interval: weekly
      day: monday
      time: '08:00'
      timezone: Asia/Shanghai
    open-pull-requests-limit: 3
    commit-message:
      prefix: 'chore(cargo)'
      include: scope

  - package-ecosystem: github-actions
    directory: '/'
    schedule:
      interval: weekly
      day: monday
      time: '08:00'
      timezone: Asia/Shanghai
    open-pull-requests-limit: 3
    commit-message:
      prefix: 'chore(ci)'
      include: scope
```

- [ ] **步骤 3: Commit**

```bash
git add .github/workflows/codeql.yml .github/dependabot.yml
git commit -m "ci: 添加 CodeQL 静态分析与 Dependabot 依赖监控"
```

---

## 阶段 4: 社区文件

### 任务 11: 创建 Issue 模板 + PR 模板

**文件：**

- 创建：`.github/ISSUE_TEMPLATE/bug_report.yml`
- 创建：`.github/ISSUE_TEMPLATE/feature_request.yml`
- 创建：`.github/ISSUE_TEMPLATE/config.yml`
- 创建：`.github/PULL_REQUEST_TEMPLATE.md`

- [ ] **步骤 1: 创建 bug_report.yml**

写入文件 `.github/ISSUE_TEMPLATE/bug_report.yml`：

```yaml
name: Bug 报告
description: 报告一个 Bug 帮助我们改进
title: '[bug]: '
labels: ['bug']
body:
  - type: markdown
    attributes:
      value: |
        感谢报告 Bug！请先搜索是否已有相同 issue。
  - type: textarea
    id: description
    attributes:
      label: Bug 描述
      description: 简要描述遇到了什么问题
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: 复现步骤
      description: 详细描述如何复现
      placeholder: |
        1. 打开应用
        2. 点击「...」
        3. 输入「...」
        4. 看到错误
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: 期望行为
      description: 你期望发生什么
    validations:
      required: true
  - type: textarea
    id: actual
    attributes:
      label: 实际行为
      description: 实际发生了什么
    validations:
      required: true
  - type: textarea
    id: screenshots
    attributes:
      label: 截图
      description: 如有截图请粘贴
    validations:
      required: false
  - type: dropdown
    id: os
    attributes:
      label: 操作系统
      options:
        - macOS
        - Windows
        - Linux
    validations:
      required: true
  - type: input
    id: version
    attributes:
      label: 应用版本
      placeholder: '0.1.0'
    validations:
      required: true
  - type: textarea
    id: logs
    attributes:
      label: 日志
      description: 如有终端日志请粘贴（可选）
      render: shell
    validations:
      required: false
```

- [ ] **步骤 2: 创建 feature_request.yml**

写入文件 `.github/ISSUE_TEMPLATE/feature_request.yml`：

```yaml
name: 功能请求
description: 提议一个新功能或改进
title: '[feat]: '
labels: ['enhancement']
body:
  - type: markdown
    attributes:
      value: |
        感谢提出功能建议！
  - type: textarea
    id: problem
    attributes:
      label: 要解决的问题
      description: 这个功能要解决什么痛点
    validations:
      required: true
  - type: textarea
    id: solution
    attributes:
      label: 期望的方案
      description: 你希望怎么实现
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: 替代方案
      description: 你考虑过的其他方案
    validations:
      required: false
  - type: textarea
    id: additional
    attributes:
      label: 补充说明
      description: 其他想说的
    validations:
      required: false
```

- [ ] **步骤 3: 创建 config.yml**

写入文件 `.github/ISSUE_TEMPLATE/config.yml`：

```yaml
blank_issues_enabled: false
contact_links:
  - name: 提问讨论
    url: https://github.com/linkslinks/speed_calc/discussions
    about: 使用问题、想法交流请前往 Discussions
```

- [ ] **步骤 4: 创建 PR 模板**

写入文件 `.github/PULL_REQUEST_TEMPLATE.md`：

```markdown
## 概述

<!-- 一段话描述本 PR 做了什么 -->

## 变更类型

- [ ] feat — 新功能
- [ ] fix — Bug 修复
- [ ] docs — 文档变更
- [ ] style — 代码格式（不影响功能）
- [ ] refactor — 重构
- [ ] perf — 性能优化
- [ ] test — 测试相关
- [ ] chore — 构建 / 工具链

## 关联 Issue

<!-- Fixes #xxx -->

## 测试

<!-- 描述如何测试本次变更 -->

## 自检清单

- [ ] 本地 `pnpm test` 通过
- [ ] 本地 `pnpm lint` 通过
- [ ] 本地 `pnpm typecheck` 通过
- [ ] 新增功能已编写 vitest 测试
- [ ] 文档已更新（如有需要）
- [ ] commit message 遵循 Conventional Commits
- [ ] 无 `console.log` / `debugger` 残留
```

- [ ] **步骤 5: 验证 4 个文件存在**

运行：`ls -la .github/ISSUE_TEMPLATE/ .github/PULL_REQUEST_TEMPLATE.md`
预期：列出 4 个文件。

- [ ] **步骤 6: Commit**

```bash
git add .github/ISSUE_TEMPLATE/ .github/PULL_REQUEST_TEMPLATE.md
git commit -m "docs: 添加 Issue 模板与 PR 模板"
```

---

## 收尾验证

### 任务 12: 全量验收

**文件：** 无（仅验证）

- [ ] **步骤 1: 验证所有新增文件存在**

运行：

```bash
ls -la LICENSE CHANGELOG.md README.md CONTRIBUTING.md SECURITY.md CODE_OF_CONDUCT.md \
  .editorconfig .prettierrc.json .prettierignore eslint.config.js commitlint.config.js \
  lint-staged.config.js .husky/pre-commit .husky/commit-msg \
  .github/workflows/ci.yml .github/workflows/release.yml .github/workflows/codeql.yml \
  .github/dependabot.yml .github/ISSUE_TEMPLATE/bug_report.yml \
  .github/ISSUE_TEMPLATE/feature_request.yml .github/ISSUE_TEMPLATE/config.yml \
  .github/PULL_REQUEST_TEMPLATE.md
```

预期：所有文件存在。

- [ ] **步骤 2: 验证 build-windows.yml 已删除**

运行：`ls .github/workflows/build-windows.yml 2>&1 || echo "已删除 ✓"`
预期：输出 `已删除 ✓`。

- [ ] **步骤 3: 运行完整验证套件**

运行：

```bash
pnpm lint && pnpm typecheck && pnpm test
```

预期：全部通过，323/323 测试通过。

- [ ] **步骤 4: 验证 husky 钩子可执行**

运行：

```bash
ls -la .husky/pre-commit .husky/commit-msg | grep -E '^[^d].*x'
```

预期：两个文件均有可执行权限。

- [ ] **步骤 5: 验证 commitlint 拒绝错误格式**

运行：

```bash
echo "bad format" | pnpm commitlint && echo "❌ 应被拒绝" || echo "✓ 已拒绝"
```

预期：输出 `✓ 已拒绝`。

- [ ] **步骤 6: 查看提交历史**

运行：`git log --oneline -15`
预期：看到本次治理补全的 commit 序列。

- [ ] **步骤 7: 最终 Commit（如有未提交变更）**

```bash
git status
# 如有未提交变更：
# git add -A && git commit -m "chore: 开源治理补全收尾"
```

---

## 自检结果

### 规格覆盖度

| 规格章节           | 任务            |
| ------------------ | --------------- |
| 阶段 1: 文档门面   | 任务 1, 2, 3    |
| 阶段 2: 工程化文件 | 任务 4, 5, 6, 7 |
| 阶段 3: CI/CD      | 任务 8, 9, 10   |
| 阶段 4: 社区文件   | 任务 11         |
| 验收标准           | 任务 12         |

### 占位符扫描

无占位符。所有代码步骤均含完整代码块。LICENSE / CODE_OF_CONDUCT 通过 curl 下载官方标准文本（非占位符）。

### 类型一致性

- `pnpm` 命令一致
- 文件路径前后一致
- 依赖名前后一致
- ESLint flat config 与 package.json type=module 一致（ESM 语法）
- husky 钩子命令与 lint-staged.config.js 一致

## 执行交接

计划已完成并保存到 `docs/superpowers/plans/2026-07-05-open-source-governance.md`。两种执行方式：

**1. 子代理驱动（推荐）** - 每个任务调度一个新的子代理，任务间进行审查，快速迭代

**2. 内联执行** - 在当前会话中使用 executing-plans 执行任务，批量执行并设有检查点

选哪种方式？
