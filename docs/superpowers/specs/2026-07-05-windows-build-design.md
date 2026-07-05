# Windows 构建流水线设计

> 日期：2026-07-05
> 主题：通过 GitHub Actions 为 Tauri 项目产出 Windows 安装包与可执行文件

## 背景与动机

当前项目是 Tauri 2 + Vue 3 桌面应用「行测小助手」，开发环境为 macOS，已在 macOS 上验证可正常构建（应用体积约 13 MB）。用户希望产出可在 Windows 上运行的安装包或免安装可执行文件，以便在 Windows 设备上使用。

由于 Tauri 在 macOS 上无法直接交叉编译到 Windows（MSVC 工具链限制），需要借助 GitHub Actions 的 `windows-latest` runner 完成构建。

## 目标

1. 通过 GitHub Actions 在 Windows runner 上构建 Tauri 应用
2. 同时产出三种 Windows 产物：
   - `.msi` 标准安装包
   - NSIS `-setup.exe` 安装程序
   - 免安装 portable `.exe` 可执行文件
3. 支持手动触发与打 tag 自动发版两种方式

## 非目标

- 不修改 Rust / Vue 前端代码
- 不修改 `tauri.conf.json`（已有 Windows `.ico` 图标，`bundle.targets: "all"` 已覆盖所需目标）
- 不处理代码签名（开源仓库无需，Windows SmartScreen 首次运行会提示）
- 不交叉编译，不在 macOS 上做任何 Windows 构建尝试

## 架构

```
GitHub Actions (windows-latest)
  ├─ checkout 代码
  ├─ 安装 pnpm + Node 20
  ├─ 安装 Rust stable + 缓存
  ├─ pnpm install
  ├─ pnpm tauri build
  │     ├─ 产出 src-tauri/target/release/bundle/msi/*.msi
  │     └─ 产出 src-tauri/target/release/bundle/nsis/*-setup.exe
  ├─ 复制 src-tauri/target/release/speed-calc.exe 为 portable 产物
  └─ 上传 Artifacts / Release
```

## 触发条件

| 触发方式                    | 用途               | 产物分发                                                                        |
| --------------------------- | ------------------ | ------------------------------------------------------------------------------- |
| `workflow_dispatch`（手动） | 首次打包、调试构建 | 上传到 Actions Artifacts（90 天有效期）                                         |
| `push tag v*`（自动发版）   | 后续发版本         | 自动创建 GitHub Release，附带 MSI + NSIS .exe；portable .exe 仍上传到 Artifacts |

## 工作流文件

新增 `.github/workflows/build-windows.yml`，包含单个 `build` job，运行于 `windows-latest`。

### 步骤详解

1. **触发器**：`workflow_dispatch` + `push: tags: ['v*']`
2. **环境**：`runs-on: windows-latest`
3. **依赖安装**：
   - `actions/checkout@v4`
   - `pnpm/action-setup@v4`（pnpm 9）
   - `actions/setup-node@v4`（Node 20，cache: pnpm）
   - `dtolnay/rust-toolchain@stable`
   - `Swatinem/rust-cache@v2`（缓存 `~/.cargo` 和 `src-tauri/target`）
4. **构建**：`pnpm install` → `pnpm tauri build`
5. **产物整理**：
   - 用 `actions/upload-artifact@v4` 上传 MSI、NSIS exe、portable exe 三种产物到一个名为 `speed-calc-windows` 的 artifact
   - 若为 tag 触发，额外用 `softprops/action-gh-release@v2` 将 MSI + NSIS exe 上传到对应 Release
6. **portable 产物路径**：`src-tauri/target/release/speed-calc.exe`（Cargo 包名 `speed-calc` 转换为连字符）

## 产物说明

| 产物             | 用途                     | 说明                                                |
| ---------------- | ------------------------ | --------------------------------------------------- |
| `*.msi`          | Windows Installer 安装包 | 标准安装方式，适合企业部署                          |
| `*-setup.exe`    | NSIS 安装程序            | 体积更小的安装包，适合个人用户                      |
| `speed-calc.exe` | 免安装可执行文件         | 双击即运行，需 WebView2 运行时（Win10/11 系统自带） |

## 用户操作流程

1. 开发者 commit 并 push workflow 文件到 main 分支
2. 在 GitHub 仓库的 **Actions** 页面找到 "Build Windows" workflow
3. 点击 **Run workflow** 手动触发
4. 等待约 10-15 分钟构建完成
5. 在构建运行页面下载 `speed-calc-windows` artifact 压缩包
6. 解压后获得三种 Windows 产物，按需选用

## 风险与缓解

| 风险                                     | 影响                      | 缓解                                                                                             |
| ---------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------ |
| `tauri-plugin-sql` 在 Windows 上编译失败 | 构建失败                  | 已在 Cargo.toml 启用 `sqlite` feature，理论可行；若失败，需检查是否需要 `sqlite-bundled` feature |
| `entitlements.plist` 在 Windows 上无效   | 无影响                    | macOS 专属文件，Tauri 在 Windows 构建时会自动忽略                                                |
| portable `.exe` 缺少 WebView2 运行时     | 用户首次运行失败          | NSIS / MSI 安装包会自动引导安装 WebView2；portable 用户需自备，文档中说明                        |
| GitHub Actions 首次构建缓存未命中        | 构建较慢（约 15-20 分钟） | 后续构建命中 Rust 缓存后约 5-8 分钟                                                              |
| Windows 文件系统大小写不敏感             | 极小概率路径冲突          | 项目目前无 import 大小写混用情况，构建时会暴露                                                   |

## 验证标准

- workflow 文件 YAML 语法正确
- 手动触发后构建成功（exit code 0）
- Artifacts 包含 3 个文件：1 个 `.msi`、1 个 `-setup.exe`、1 个 `speed-calc.exe`
- 在 Windows 机器上双击任一产物可正常启动应用，SQLite 数据库初始化成功
