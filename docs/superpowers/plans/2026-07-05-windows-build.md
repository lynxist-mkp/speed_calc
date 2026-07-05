# Windows 构建流水线 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 通过 GitHub Actions 在 Windows runner 上构建 Tauri 应用，产出 MSI / NSIS .exe / portable .exe 三种 Windows 产物。

**架构：** 新增一个 workflow 文件 `.github/workflows/build-windows.yml`，运行于 `windows-latest`，触发条件为 `workflow_dispatch`（手动）和 `push tag v*`（自动发版）。构建步骤使用 pnpm + Rust stable，通过 `pnpm tauri build` 产出标准安装包，并额外提取 portable `.exe`，最终上传到 Artifacts 和（tag 触发时）GitHub Release。

**技术栈：** GitHub Actions、Tauri 2、pnpm 9、Node 20、Rust stable

---

## 文件结构

| 文件                                                        | 操作   | 职责                                                   |
| ----------------------------------------------------------- | ------ | ------------------------------------------------------ |
| `.github/workflows/build-windows.yml`                       | 创建   | Windows 构建 workflow：依赖安装、tauri build、产物上传 |
| `docs/superpowers/specs/2026-07-05-windows-build-design.md` | 已存在 | 设计规格（已 commit）                                  |

**关于测试：** workflow 文件无法做单元测试，验证方式为：(1) YAML 语法检查；(2) 推送后在 GitHub Actions 页面手动触发并观察构建日志；(3) 验证 Artifacts 包含 3 个产物文件。

---

### 任务 1：创建 GitHub Actions workflow 文件

**文件：**

- 创建：`.github/workflows/build-windows.yml`

- [ ] **步骤 1：确认 `.github/workflows/` 目录存在**

运行：`ls -la /Users/linkslinks/project/speed_calc/.github/workflows/ 2>/dev/null || echo "目录不存在"`

如果输出 "目录不存在"，创建目录：

```bash
mkdir -p /Users/linkslinks/project/speed_calc/.github/workflows
```

- [ ] **步骤 2：写入 workflow 文件**

创建 `.github/workflows/build-windows.yml`，完整内容：

```yaml
name: Build Windows

on:
  workflow_dispatch:
  push:
    tags:
      - 'v*'

jobs:
  build:
    name: Build Windows artifacts
    runs-on: windows-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Cache Rust
        uses: Swatinem/rust-cache@v2
        with:
          workspaces: src-tauri

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build Tauri app
        run: pnpm tauri build

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: speed-calc-windows
          path: |
            src-tauri/target/release/bundle/msi/*.msi
            src-tauri/target/release/bundle/nsis/*-setup.exe
            src-tauri/target/release/speed-calc.exe
          if-no-files-found: error
          retention-days: 90

      - name: Release
        if: startsWith(github.ref, 'refs/tags/v')
        uses: softprops/action-gh-release@v2
        with:
          files: |
            src-tauri/target/release/bundle/msi/*.msi
            src-tauri/target/release/bundle/nsis/*-setup.exe
          draft: false
          prerelease: false
```

- [ ] **步骤 3：验证 YAML 语法**

运行：

```bash
python3 -c "import yaml; yaml.safe_load(open('/Users/linkslinks/project/speed_calc/.github/workflows/build-windows.yml'))" && echo "YAML OK"
```

预期输出：`YAML OK`

- [ ] **步骤 4：验证 workflow 文件内容**

运行：`cat /Users/linkslinks/project/speed_calc/.github/workflows/build-windows.yml | head -5`

预期：第一行为 `name: Build Windows`

- [ ] **步骤 5：Commit workflow 文件**

```bash
cd /Users/linkslinks/project/speed_calc
git add .github/workflows/build-windows.yml docs/superpowers/specs/2026-07-05-windows-build-design.md
git commit -m "ci: 添加 Windows 构建 workflow"
```

- [ ] **步骤 6：推送到 main 分支**

```bash
git push origin main
```

预期：推送成功，GitHub 仓库 main 分支更新

---

### 任务 2：手动触发并验证构建

> **注意：** 此任务需要用户在浏览器中操作 GitHub Actions 页面，AI 代理无法直接触发或观察。代理应给出操作指引并等待用户反馈。

- [ ] **步骤 1：引导用户触发 workflow**

向用户说明：

1. 打开 https://github.com/lynxist-mkp/speed_calc/actions
2. 左侧找到 "Build Windows" workflow
3. 点击右侧 "Run workflow" → 选择 main 分支 → 点击绿色 "Run workflow" 按钮
4. 等待约 10-20 分钟（首次构建无 Rust 缓存）

- [ ] **步骤 2：用户反馈构建结果**

预期：

- 构建状态从黄色（进行中）变为绿色（成功）
- 构建运行页面底部出现 `speed-calc-windows` artifact
- 如果构建失败，请用户提供失败日志最后 50 行

- [ ] **步骤 3：用户下载并验证 artifact 内容**

引导用户：

1. 在构建运行页面点击 `speed-calc-windows` artifact 下载
2. 解压 zip 文件
3. 确认包含 3 个文件：
   - 1 个 `.msi` 文件（如 `行测小助手_0.1.0_x64_en-US.msi`）
   - 1 个 `-setup.exe` 文件（如 `行测小助手_0.1.0_x64-setup.exe`）
   - 1 个 `speed-calc.exe`

预期：解压后看到 3 个文件，体积合理（MSI 和 NSIS 约 5-10 MB，portable .exe 约 10-15 MB）

- [ ] **步骤 4：在 Windows 机器上验证可运行**

用户在 Windows 设备上：

1. 双击 `.msi` 或 `-setup.exe` 安装应用
2. 启动应用，确认窗口标题为「行测小助手」
3. 进入任一练习模式，确认 SQLite 数据库初始化成功（无报错弹窗）

预期：应用正常启动，可进入练习，历史记录可保存

---

## 自检

**1. 规格覆盖度：**

- ✓ workflow 文件创建（任务 1 步骤 1-2）
- ✓ YAML 语法验证（任务 1 步骤 3）
- ✓ commit + push（任务 1 步骤 5-6）
- ✓ 手动触发构建（任务 2 步骤 1）
- ✓ 验证 Artifacts 包含 3 个产物（任务 2 步骤 3）
- ✓ Windows 上可运行验证（任务 2 步骤 4）
- ✓ tag 触发 Release（workflow 文件中已实现 `if: startsWith(github.ref, 'refs/tags/v')` 条件）

**2. 占位符扫描：** 无 TODO/待定内容，所有步骤都包含完整代码或命令 ✓

**3. 类型一致性：** workflow 文件中：

- artifact 名 `speed-calc-windows` 在 workflow 和验证步骤中一致 ✓
- portable 路径 `src-tauri/target/release/speed-calc.exe`（cargo 包名 `speed-calc`）在 workflow 和规格中一致 ✓
- workflow 名称 `Build Windows` 在文件和验证步骤中一致 ✓

无需修改。
