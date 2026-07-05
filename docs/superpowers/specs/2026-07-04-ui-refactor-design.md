# UI 重构设计规格

**日期**：2026-07-04
**主题**：行测小助手 UI/UX 重构
**状态**：已确认，待编写实现计划

---

## 1. 背景与目标

当前应用已完成 Level 1-4 功能开发（245 测试通过，13MB 包体），但 UI 层存在以下问题：

- **视觉一致性**：scoped style 大量带 fallback 硬编码、ECharts 色值未走 token、FAB 蓝色与主绿色调脱节
- **布局问题**：答题页双顶栏叠加（AppToolbar + TopBar）、sidebar 永远收起且 brand-text 不可见、PracticeSettings 与 DataAnalysisSettings 风格分裂
- **交互体验**：Numpad 拖拽手柄文案常驻造成视觉噪音、重开按钮浮在卡片外易超视口、题量弹窗 el-dialog 体感偏重
- **可访问性**：无 focus-visible、图标按钮无 aria-label、muted 文字对比度 2.6:1 未达 WCAG AA、闪烁动画无 reduced-motion 适配
- **工程债**：ECharts 全量引入影响包体、CompositeSession 与 PracticeSession 大量重复样式

**重构目标**：在保持功能与硬约束不变的前提下，统一视觉语言、消除布局冗余、补齐可访问性、清理工程债。

---

## 2. 设计决策

### 2.1 视觉方向

**决策**：强制使用 Apple Liquid Glass 设计语言，深色主题优先，侧重护眼。浅色主题后续迭代，本次不涉及。

**应用范围**：

- 沿用 Solarized 深色基底（base03 `#002b36` → base02 `#073642`）
- 保留 `@mixin glass($bg, $blur)` 玻璃材质体系（sidebar 28px / toolbar 20px / card 16px / button 12px）
- 主强调色仍为原版绿 `#5faf6f`
- 护眼优化：提升 muted 文字对比度至 4.5:1+（见 2.7 可访问性）

### 2.2 导航架构（方案 A）

**决策**：保留 72px 浮动 Sidebar，消除双顶栏叠加。

**具体规则**：

- 所有页面统一为"sidebar 72px + 单一顶栏"布局
- 主页/列表态：渲染 AppToolbar（浮动玻璃顶栏，56px 高）
- 答题态：渲染 TopBar（含返回/标题/进度/计时/N-back 徽章），**不渲染** AppToolbar
- 路由切换时由 App.vue 根据 `route.meta.layout` 决定渲染哪个顶栏
- Sidebar brand-text 仍隐藏，hover 时显示 tooltip "行测小助手"
- Sidebar nav-item 触摸目标提升至 72×56px（原 72×52px）

**布局参数**：

- 内容区 padding：`80px 24px 24px 96px`（避让浮动层）
- 主背景带左上角径向绿色微渐变（保留现状）

### 2.3 Numpad 拖拽行为（方案 A）

**决策**：保留自由拖拽浮窗，精简手柄，内联重开按钮，边界 clamp。

**具体规则**：

- 手柄改为 icon-only（`⋮⋮` 拖拽点），移除常驻文案"上下拖调大小 左右拖调位置 双击恢复"
- hover 手柄时显示 tooltip："拖动移动 · 双击复位"
- 重开按钮内联到手柄右侧（不再 `top: -28px` 绝对定位浮空）
- 拖拽边界自动 clamp 到视口内：拖动过程中 Numpad 左/上/右/下边均不可超出主内容区
- 双击手柄复位到默认位置（右下角，留 12px 边距）
- 保留 localStorage 持久化：`numpad:posX / numpad:posY / numpad:scale`
- 缩放范围保持 0.7~1.5

### 2.4 题型网格统一（3.1 A）

**决策**：抽 TypeGrid 组件，PracticeSettings 与 DataAnalysisSettings 共用。

**TypeGrid 组件规格**：

- Props：`sections: { title: string, types: TypeItem[] }[]`、`modelValue: string`、`disabled: boolean`
- TypeItem：`{ key: string, label: string, icon?: string }`
- 视觉：section title 带绿色左侧色条（3px 宽，12px 高，圆角 2px），下边框 `rgba(95, 175, 111, 0.4)`
- 网格：3 列，gap 6px，cell padding `10px 6px`，font-size 11px
- 选中态：`background: rgba(46, 80, 56, 0.9)` + `border-color: #5faf6f` + `color: #eee8d5`
- hover 态：`border-color: #5faf6f`（不改变 background）
- disabled 态：`opacity: 0.5` + `cursor: not-allowed`
- section title 可选（通过 `showTitle` prop 控制）

### 2.5 设置项控件统一（3.2 A）

**决策**：全部统一为 SegmentedControl 组件 + 行内展开，替换 el-dialog 弹窗。

**SegmentedControl 组件规格**：

- Props：`options: { label: string, value: string }[]`、`modelValue: string`、`disabled: boolean`
- 视觉：容器 `rgba(7, 54, 66, 0.7)` + 1px 边框 + 圆角 6px + overflow hidden
- 选项：flex 等分，padding 8px，font-size 11px，右边框 1px（最后一项无边框）
- 选中态：`background: rgba(46, 80, 56, 0.9)` + `color: #eee8d5`
- 未选态：`color: #93a1a1`

**SettingRow 组件规格**：

- Props：`label: string`、`expandable: boolean`、`expanded: boolean`
- 结构：label 行 + slot 内容 + 可选展开区
- 展开区：`background: rgba(0, 43, 54, 0.6)` + 1px `rgba(95, 175, 111, 0.3)` 边框 + 圆角 6px

**应用场景**：

- 难度：SegmentedControl（简单/一般/困难）
- 题量：SegmentedControl（5/10/15/20/自定）+ 自定选项展开 SettingRow 含滑块（5-100）
- N-back：SegmentedControl（关闭/1-back/2-back）
- 呈现方式：SegmentedControl（文字图表/直接公式）
- 键盘布局：SegmentedControl（正序/倒序/乱序）

### 2.6 ECharts 优化（3.3 A）

**决策**：按需引入 + 注册 Solarized 主题。

**实施**：

- 替换 `import * as echarts from 'echarts'` 为：
  ```ts
  import * as echarts from 'echarts/core'
  import { BarChart, LineChart, RadarChart } from 'echarts/charts'
  import {
    GridComponent,
    TooltipComponent,
    LegendComponent,
    RadarComponent,
  } from 'echarts/components'
  import { CanvasRenderer } from 'echarts/renderers'
  echarts.use([
    BarChart,
    LineChart,
    RadarChart,
    GridComponent,
    TooltipComponent,
    LegendComponent,
    RadarComponent,
    CanvasRenderer,
  ])
  ```
- 注册 Solarized 主题：`echarts.registerTheme('solarized', {...})`，色值引用 `--chart-primary` 等 token
- Stats.vue 与 BarChart.vue 所有图表 `echarts.init(el, 'solarized')`
- 移除硬编码色值 `#5faf6f / #93a1a1 / #073642`

### 2.7 可访问性补齐（3.5 A）

**决策**：WCAG AA 全量补齐。

**对比度修复**：

- `--app-text-muted`：`#42525c` → `#5d6f78`（对 `#002b36` 背景约 4.6:1）
- 同步调整 Element Plus `--el-text-color-disabled` 等关联 token

**focus-visible**：

- 全局样式：`:focus-visible { outline: 2px solid #5faf6f; outline-offset: 2px; }`
- 图标按钮 focus 态可见绿色描边

**aria-label**：

- 返回按钮：`aria-label="返回"`
- FAB +：`aria-label="新增自定义运算"`
- Numpad 手柄：`aria-label="拖动移动数字键盘，双击复位"`
- Numpad 各按键：`aria-label` 对应数字/操作（如 `aria-label="7"`、`aria-label="清除"`、`aria-label="提交"`）

**reduced-motion**：

- 提交闪烁动画：`@media (prefers-reduced-motion: reduce)` 时改为静态边框（`border: 2px solid #dc322f` 或 `#5faf6f`）
- cursor 闪烁、Numpad 拖拽过渡动画均加 reduced-motion 适配

### 2.8 Token 三层重构（3.4 A）

**决策**：建立 primitive → semantic → component 三层 token，移除 scoped fallback。

**Primitive 层**（色值原子）：

```scss
--color-base03: #002b36;
--color-base02: #073642;
--color-green: #5faf6f;
--color-cyan: #2aa198;
--color-yellow: #b58900;
--color-orange: #cb4b16;
--color-red: #dc322f;
--color-bright: #eee8d5;
--color-primary-text: #93a1a1;
--color-secondary-text: #586e75;
```

**Semantic 层**（语义映射）：

```scss
--app-bg-page: var(--color-base03);
--app-bg-surface: var(--color-base02);
--app-bg-surface-hover: rgba(95, 175, 111, 0.1);
--app-text-bright: var(--color-bright);
--app-text-primary: var(--color-primary-text);
--app-text-secondary: var(--color-secondary-text);
--app-text-muted: #5d6f78; // 对比度修复后
--app-accent: var(--color-green);
--app-success: #859900;
--app-warning: var(--color-yellow);
--app-danger: var(--color-red);
--app-info: var(--color-cyan);
--app-border: rgba(147, 161, 161, 0.25);
--app-border-active: var(--color-green);
--chart-primary: var(--color-green);
--chart-secondary: var(--color-cyan);
--chart-warning: var(--color-yellow);
```

**Component 层**（组件级）：

```scss
--button-bg: var(--app-bg-surface);
--button-bg-active: rgba(46, 80, 56, 0.9);
--button-text: var(--app-text-bright);
--card-bg: var(--app-bg-surface);
--card-border: var(--app-border);
--key-bg: rgba(7, 54, 66, 0.7);
--key-bg-active: var(--color-base02);
--key-text: var(--app-text-bright);
```

**迁移规则**：

- 所有 scoped style 中的 `var(--app-*, #xxx)` 改为 `var(--app-*)`（移除 fallback）
- 所有硬编码色值改为引用 semantic token
- ECharts 色值改为引用 `--chart-*` token
- Element Plus `--el-*` 关联 token 同步更新

---

## 3. 推进路线图（3.6 A）

### 第 1 批 · 基础设施

**目标**：建立 token 体系与组件库，不改动现有 view。

**交付物**：

1. `src/styles/tokens.scss`：三层 token 定义
2. `src/styles/theme.scss` 重构：移除 scoped fallback，引用 token
3. `src/components/TypeGrid.vue`：题型网格组件
4. `src/components/SegmentedControl.vue`：分段控件
5. `src/components/SettingRow.vue`：设置行组件
6. 单元测试：3 个新组件各覆盖 selected/disabled/hover 态

**验证**：

- `pnpm vitest run` 全部通过
- `pnpm vue-tsc --noEmit` 零错误
- 现有 view 未改动，应用启动正常

### 第 2 批 · View 替换

**目标**：各 view 应用新组件 + 消除双顶栏 + Numpad 精简。

**交付物**：

1. `src/App.vue`：根据 `route.meta.layout` 决定渲染 AppToolbar 或 TopBar
2. `src/router/index.ts`：答题路由添加 `meta: { layout: 'answer' }`
3. `src/components/TopBar.vue`：保持现状（已含返回/标题/进度/计时）
4. `src/components/AppSidebar.vue`：nav-item 触摸目标 72×56px，brand hover tooltip
5. `src/components/Numpad.vue`：icon-only 手柄 + 内联重开 + 边界 clamp + hover tooltip
6. `src/views/Home.vue`：应用新 token
7. `src/views/PracticeSettings.vue`：替换为 TypeGrid + SegmentedControl + SettingRow
8. `src/views/DataAnalysisSettings.vue`：替换为 TypeGrid + SegmentedControl + SettingRow
9. `src/views/PracticeSession.vue`：应用新 token
10. `src/views/CompositeSession.vue`：应用新 token，复用 PracticeSession 样式
11. `src/views/PracticeResult.vue`：应用新 token
12. `src/views/History.vue`：原生 `<select>` 改 SegmentedControl（按题型筛选，单选）
13. `src/views/Stats.vue`：应用新 token
14. `src/views/Settings.vue`：应用新 token

**验证**：

- `pnpm vitest run` 全部通过
- `pnpm vue-tsc --noEmit` 零错误
- 手动验证：所有页面视觉一致，双顶栏消除，Numpad 不超视口
- `pnpm tauri build` 包体 < 30MB

### 第 3 批 · 收尾

**目标**：a11y 补齐 + ECharts 优化。

**交付物**：

1. 全局 `:focus-visible` 样式
2. 所有图标按钮添加 aria-label
3. `--app-text-muted` 对比度修复
4. 闪烁动画 reduced-motion 适配
5. `src/views/Stats.vue` 与 `src/components/BarChart.vue` ECharts 按需引入
6. `src/styles/echarts-theme.ts`：Solarized 主题注册
7. 移除 `src/App.vue` 中的 db-status 验收条（已注释为"后续 Level 移除"）

**验证**：

- `pnpm vitest run` 全部通过
- `pnpm vue-tsc --noEmit` 零错误
- axe-core 或 Lighthouse 可访问性评分 ≥ 90
- ECharts 包体减少（前后对比 `pnpm tauri build` 输出）
- 包体 < 30MB

---

## 4. 不变项（硬约束保留）

以下硬约束不在重构范围内，必须保持现状：

| 约束                      | 说明                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| 比较题键盘映射            | 左=小于（1/,/，/</《），右=大于（2/./。/>/》），UI 按钮位置与键位严格对齐                         |
| N-back 状态机             | count=N, nback=K → 生成 N+K 题，前 K 不判分，中间 N 判分，后 K 不判分；不弹新窗口，直接用原输入框 |
| CompositeSession 独立状态 | 不走 practice store 的 init/submit 流程                                                           |
| 比较题判分                | 精确判分，无容差                                                                                  |
| 复合题判分                | ±5% 容差                                                                                          |
| 比较题答案分布            | ~50/50 大于/小于，禁相等                                                                          |
| "两期比重差 d" 单位       | 用 `%` 不用"个百分点"                                                                             |
| CompositeSession 操作行   | 仅两按钮：刷新数据/提交答案                                                                       |
| 资料分析填空/比较题布局   | 上下并排，不用 tab                                                                                |
| 基础计算返回按钮          | 不返回资料分析专项                                                                                |
| 基础题型判断              | 基于 `BASIC_TYPES` Set + `custom_*` 前缀（正向枚举）                                              |
| 包体                      | < 30MB                                                                                            |
| macOS 签名                | ad-hoc 签名 + entitlements.plist                                                                  |

---

## 5. 风险与缓解

| 风险                       | 缓解措施                                                                 |
| -------------------------- | ------------------------------------------------------------------------ |
| Token 重命名导致大面积回归 | 第 1 批仅建立新 token，保留旧 token 别名；第 2 批逐步迁移                |
| Numpad 边界 clamp 逻辑错误 | 单元测试覆盖：左/右/上/下/四角/缩放后拖拽                                |
| ECharts 按需引入遗漏组件   | 第 3 批验证时手动测试三张图均正常渲染                                    |
| 双顶栏消除后路由切换闪烁   | App.vue 用 `v-if` + transition，避免同时渲染                             |
| 可访问性修复影响视觉       | 对比度修复仅提亮 muted，不影响主色；focus-visible 仅 outline 不改 layout |

---

## 6. 验收标准

- [ ] `pnpm vitest run` 全部通过（≥ 245 测试）
- [ ] `pnpm vue-tsc --noEmit` 零错误
- [ ] `pnpm tauri build` 成功，包体 < 30MB
- [ ] macOS 启动正常，无白屏
- [ ] 所有页面视觉一致（深色 Solarized + Liquid Glass）
- [ ] 答题页无双顶栏叠加
- [ ] Numpad 拖拽不超视口，手柄 icon-only，重开按钮内联
- [ ] 题型网格两页风格统一
- [ ] 设置项无 el-dialog 居中弹窗
- [ ] ECharts 三张图正常渲染
- [ ] focus-visible 绿色描边可见
- [ ] 图标按钮 aria-label 完整
- [ ] muted 文字对比度 ≥ 4.5:1
- [ ] reduced-motion 下闪烁改为静态边框

---

## 7. 后续迭代（本次不做）

- 浅色主题支持
- 移动端适配
- 国际化（i18n）
- 主题切换 UI（用户可选深/浅色）
