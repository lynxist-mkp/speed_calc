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

| 依赖 | 版本要求 | 说明 |
|---|---|---|
| Node.js | ≥ 24 | 推荐使用 LTS |
| pnpm | ≥ 11 | 包管理器 |
| Rust | stable | Tauri 编译需要 |
| macOS | ≥ 26 | 仅 macOS 构建需要 |
| Windows | ≥ 10 | 仅 Windows 构建需要 |

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

| 层 | 选型 |
|---|---|
| 桌面框架 | Tauri 2.x |
| 前端框架 | Vue 3 + TypeScript + Vite |
| UI 组件库 | Element Plus（Solarized 深色主题） |
| 状态管理 | Pinia |
| 图表 / 公式 | ECharts / KaTeX |
| 本地存储 | SQLite（tauri-plugin-sql） |
| 测试框架 | Vitest + @vue/test-utils |

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
