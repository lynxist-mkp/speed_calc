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
