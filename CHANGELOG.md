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
