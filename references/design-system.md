# 设计规范（L0 用）

> 何时读：L0 做主题/视觉时。本文件给方向与原则，具体值实现时查证官方文档定。

## 规范来源

- **macOS 26 (Tahoe) Liquid Glass**（主，桌面应用）：浮动玻璃导航层、内容 edge-to-edge、去除多余背景色、同心圆角、标准控件交互变玻璃。
- **Material 3**（辅，tonal 思路）：tonal surfaces 分层、design tokens、可访问性对比度、大圆角。

实现前建议查证：Apple HIG「Liquid Glass」「Adopting Liquid Glass」、Material 3 color roles & surfaces。

## 主题方向：深色护眼

原则（why：长时间刷题护眼，避免高对比刺眼）：

- 避免 #000 纯黑 / #fff 纯白的高对比
- 背景用柔和深色，偏绿黑基调（呼应原版绿色基因）
- 文字用柔和白
- 强调色用原版绿色系，提亮以适应深色背景
- 背景分 3-4 级 tonal（page→surface→elevated→overlay）靠明度区分，不堆颜色

## 落地方式

- Element Plus 原生 dark mode（`html.dark`）启用
- 全部用 CSS 变量（`--el-*` 体系 + 自定义 `--app-*`），不硬编码色值
- 玻璃材质：`backdrop-filter: blur(~24px)` + 半透明背景，用于浮动 sidebar/toolbar
- 圆角同心递减：窗口 > 卡片 > 按钮（如 16/12/8）
- 对比度：正文 ≥ 4.5:1，大字 ≥ 3:1

## 示意色值（起步用，可调）

> 这是一组符合上述原则的示意值，实现时按实际渲染效果与官方规范微调。不必拘泥数值，重点是：深色、柔和、绿黑基调、绿色强调、tonal 分层。

| token                | 示意值              | 用途             |
| -------------------- | ------------------- | ---------------- |
| --app-bg-page        | #1a1d1a             | 最底层           |
| --app-bg-surface     | #242824             | 卡片             |
| --app-bg-elevated    | #2d322d             | 弹窗             |
| --app-text-primary   | #e8ece8             | 正文(柔和白)     |
| --app-text-secondary | #9ba89b             | 次要文字         |
| --el-color-primary   | #3da55c             | 强调(原版绿提亮) |
| --app-color-warning  | #ffb74d             | "小于"按钮橙     |
| --app-glass-bg       | rgba(45,50,45,0.55) | 玻璃层底         |
| --app-radius-card    | 12px                | 卡片圆角         |

## 字体

- 中文：PingFang SC（macOS）/ Microsoft YaHei（Windows）
- 数字/算式：等宽（SF Mono / JetBrains Mono）；算式用 KaTeX 渲染

## 留给实现的探索空间

- 具体 blur 半径、玻璃透明度——按 macOS 26 视觉效果调
- tonal 层级数与明度跨度——参考 M3 surface roles
- 是否引入 Liquid Glass 的"滚动时玻璃随内容明暗自适应"——可选增强
- 按钮交互变玻璃的具体过渡——查 SwiftUI/AppKit 玻璃控件行为对照
