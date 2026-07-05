# UI 重构实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在保持功能与硬约束不变的前提下，重构行测小助手 UI/UX：统一 Liquid Glass 深色视觉语言、消除双顶栏、精简 Numpad、抽组件库、补齐 a11y、ECharts 按需引入。

**架构：** 分 3 批 PR 推进——第 1 批建立 token 三层与组件库（不改 view），第 2 批替换各 view 应用新组件并消除双顶栏/Numpad 精简，第 3 批补齐 a11y 与 ECharts 按需引入。每批可独立验证、独立 commit、独立回滚。

**技术栈：** Vue 3.5 + TypeScript 5.6 + Vite 6 + Pinia 2 + Element Plus 2.8 + ECharts 5 + SCSS + Vitest + @vue/test-utils

---

## 文件结构

### 第 1 批 · 基础设施

| 操作 | 文件                                                | 职责                                                               |
| ---- | --------------------------------------------------- | ------------------------------------------------------------------ |
| 创建 | `src/styles/tokens.scss`                            | 三层 token 定义（primitive/semantic/component）                    |
| 修改 | `src/styles/theme.scss`                             | 引用 tokens.scss，移除硬编码色值，保留 `--el-*` 覆盖               |
| 创建 | `src/components/TypeGrid.vue`                       | 题型网格组件（sectioned + selectable）                             |
| 创建 | `src/components/__tests__/TypeGrid.test.ts`         | TypeGrid 单元测试                                                  |
| 创建 | `src/components/SegmentedControl.vue`               | 分段控件（单选）                                                   |
| 创建 | `src/components/__tests__/SegmentedControl.test.ts` | SegmentedControl 单元测试                                          |
| 创建 | `src/components/SettingRow.vue`                     | 设置行组件（label + slot + 可展开区）                              |
| 创建 | `src/components/__tests__/SettingRow.test.ts`       | SettingRow 单元测试                                                |
| 修改 | `src/styles/index.scss`                             | 全局 `:focus-visible` 样式（第 3 批主体，第 1 批先占位以避免冲突） |

### 第 2 批 · View 替换

| 操作 | 文件                                      | 职责                                                                   |
| ---- | ----------------------------------------- | ---------------------------------------------------------------------- |
| 修改 | `src/router/index.ts`                     | 答题路由加 `meta: { layout: 'answer' }`                                |
| 修改 | `src/App.vue`                             | 根据 `route.meta.layout` 决定渲染 AppToolbar 或 TopBar，移除 db-status |
| 修改 | `src/components/AppSidebar.vue`           | nav-item 触摸目标 72×56px，brand hover tooltip                         |
| 修改 | `src/components/Numpad.vue`               | icon-only 手柄、内联重开、边界 clamp、hover tooltip、aria-label        |
| 修改 | `src/components/__tests__/Numpad.test.ts` | 新增 clamp/手柄测试                                                    |
| 修改 | `src/views/Home.vue`                      | 移除 scoped fallback，应用新 token                                     |
| 修改 | `src/views/PracticeSettings.vue`          | 替换为 TypeGrid + SegmentedControl + SettingRow，移除 el-dialog        |
| 修改 | `src/views/DataAnalysisSettings.vue`      | 替换为 TypeGrid + SegmentedControl + SettingRow，移除 el-dialog        |
| 修改 | `src/views/PracticeSession.vue`           | 应用新 token，移除 scoped fallback                                     |
| 修改 | `src/views/CompositeSession.vue`          | 应用新 token，复用 PracticeSession 样式                                |
| 修改 | `src/views/PracticeResult.vue`            | 应用新 token                                                           |
| 修改 | `src/views/History.vue`                   | 原生 `<select>` 改 SegmentedControl                                    |
| 修改 | `src/views/Stats.vue`                     | 应用新 token                                                           |
| 修改 | `src/views/Settings.vue`                  | 应用新 token                                                           |

### 第 3 批 · 收尾

| 操作 | 文件                               | 职责                                       |
| ---- | ---------------------------------- | ------------------------------------------ |
| 修改 | `src/styles/index.scss`            | 全局 `:focus-visible`、reduced-motion 适配 |
| 修改 | `src/components/Numpad.vue`        | 补齐 aria-label（如第 2 批未完整覆盖）     |
| 修改 | `src/components/AppSidebar.vue`    | 补齐 aria-label                            |
| 修改 | `src/components/CompareKeypad.vue` | 补齐 aria-label                            |
| 修改 | `src/views/PracticeSession.vue`    | 闪烁动画 reduced-motion 适配               |
| 修改 | `src/styles/theme.scss`            | `--app-text-muted` 提亮至 `#5d6f78`        |
| 创建 | `src/styles/echarts-theme.ts`      | Solarized 主题注册                         |
| 修改 | `src/views/Stats.vue`              | ECharts 按需引入 + 主题化                  |
| 修改 | `src/components/BarChart.vue`      | ECharts 按需引入 + 主题化                  |

---

## 第 1 批 · 基础设施

### 任务 1：建立 token 三层

**文件：**

- 创建：`src/styles/tokens.scss`
- 修改：`src/styles/theme.scss`

- [ ] **步骤 1：创建 tokens.scss**

```scss
// src/styles/tokens.scss
// 三层 token：primitive（色值原子）→ semantic（语义）→ component（组件级）
// 引入顺序：tokens.scss 必须在 theme.scss 之前被 index.scss 加载

:root {
  // ===== Primitive 层 =====
  --color-base03: #002b36;
  --color-base02: #073642;
  --color-base02-elevated: #0a4252;
  --color-green: #5faf6f;
  --color-green-hover: #7fc38c;
  --color-green-active: #4a9a5b;
  --color-green-dark: #2e5038;
  --color-cyan: #2aa198;
  --color-yellow: #b58900;
  --color-orange: #cb4b16;
  --color-red: #dc322f;
  --color-bright: #eee8d5;
  --color-primary-text: #93a1a1;
  --color-secondary-text: #586e75;
  --color-muted-text: #5d6f78; // 对比度修复，对 base03 约 4.6:1
  --color-solarized-green: #859900;

  // ===== Semantic 层 =====
  --app-bg-page: var(--color-base03);
  --app-bg-surface: var(--color-base02);
  --app-bg-elevated: var(--color-base02-elevated);
  --app-bg-overlay: rgba(7, 54, 66, 0.72);
  --app-bg-surface-hover: rgba(95, 175, 111, 0.1);

  --app-text-primary: var(--color-primary-text);
  --app-text-secondary: var(--color-secondary-text);
  --app-text-muted: var(--color-muted-text);
  --app-text-bright: var(--color-bright);

  --app-color-primary: var(--color-green);
  --app-color-primary-hover: var(--color-green-hover);
  --app-color-primary-active: var(--color-green-active);
  --app-color-success: var(--color-solarized-green);
  --app-color-warning: var(--color-yellow);
  --app-color-warning-bright: var(--color-orange);
  --app-color-danger: var(--color-red);
  --app-color-info: var(--color-cyan);

  --app-glass-bg: rgba(10, 66, 82, 0.55);
  --app-glass-border: rgba(147, 161, 161, 0.18);
  --app-glass-blur: 24px;

  --app-border: rgba(147, 161, 161, 0.25);
  --app-border-active: var(--color-green);

  --app-radius-window: 16px;
  --app-radius-card: 12px;
  --app-radius-button: 8px;
  --app-radius-small: 6px;

  --app-font-cn: 'PingFang SC', 'Microsoft YaHei', -apple-system, sans-serif;
  --app-font-mono: 'SF Mono', 'JetBrains Mono', 'Fira Code', monospace;

  // chart token（ECharts 主题化引用）
  --chart-primary: var(--color-green);
  --chart-secondary: var(--color-cyan);
  --chart-warning: var(--color-yellow);
  --chart-danger: var(--color-red);
  --chart-axis: var(--color-primary-text);
  --chart-split: var(--color-base02);

  // ===== Component 层 =====
  --button-bg: var(--app-bg-surface);
  --button-bg-active: rgba(46, 80, 56, 0.9);
  --button-bg-hover: rgba(95, 175, 111, 0.18);
  --button-text: var(--app-text-bright);
  --button-border: var(--app-glass-border);

  --card-bg: var(--app-bg-surface);
  --card-border: var(--app-border);

  --key-bg: rgba(7, 54, 66, 0.7);
  --key-bg-hover: rgba(95, 175, 111, 0.12);
  --key-bg-active: var(--color-base02);
  --key-text: var(--app-text-bright);
  --key-submit-bg: rgba(95, 175, 111, 0.85);

  --type-cell-bg: rgba(7, 54, 66, 0.7);
  --type-cell-bg-selected: rgba(46, 80, 56, 0.9);
  --type-cell-border: rgba(147, 161, 161, 0.2);
  --type-cell-border-selected: var(--color-green);

  --seg-bg: rgba(7, 54, 66, 0.7);
  --seg-bg-selected: rgba(46, 80, 56, 0.9);
  --seg-border: rgba(147, 161, 161, 0.2);
  --seg-divider: rgba(147, 161, 161, 0.15);

  --row-bg: rgba(7, 54, 66, 0.7);
  --row-border: rgba(147, 161, 161, 0.2);
  --expand-bg: rgba(0, 43, 54, 0.6);
  --expand-border: rgba(95, 175, 111, 0.3);
}
```

- [ ] **步骤 2：重构 theme.scss 引用 token**

替换 `src/styles/theme.scss` 的 `:root` 块（保留文件头部注释，删除原 `:root` 内所有内容，改为 Element Plus `--el-*` 覆盖）：

```scss
// 行测小助手 - 主题系统
// 方向：Solarized 深色 + 原版绿色强调
// tokens.scss 提供 primitive/semantic/component 三层 token
// 本文件仅保留 Element Plus dark 体系覆盖
:root {
  // Element Plus 覆盖（引用 semantic token）
  --el-color-primary: var(--app-color-primary);
  --el-color-primary-light-3: var(--app-color-primary-hover);
  --el-color-primary-light-5: #9ad3a6;
  --el-color-primary-light-7: #b6e0bf;
  --el-color-primary-light-8: #c4e7cc;
  --el-color-primary-light-9: #d2eed8;
  --el-color-primary-dark-2: var(--app-color-primary-active);

  --el-bg-color: var(--app-bg-surface);
  --el-bg-color-page: var(--app-bg-page);
  --el-bg-color-overlay: var(--app-bg-elevated);

  --el-text-color-primary: var(--app-text-bright);
  --el-text-color-regular: var(--app-text-primary);
  --el-text-color-secondary: var(--app-text-secondary);
  --el-text-color-placeholder: var(--app-text-muted);
  --el-text-color-disabled: var(--app-text-muted);

  --el-border-color: var(--app-glass-border);
  --el-border-color-light: rgba(147, 161, 161, 0.12);
  --el-border-color-lighter: rgba(147, 161, 161, 0.08);

  --el-fill-color: rgba(147, 161, 161, 0.06);
  --el-fill-color-light: rgba(147, 161, 161, 0.04);
  --el-fill-color-blank: transparent;
}
```

- [ ] **步骤 3：修改 index.scss 引入 tokens.scss**

打开 `src/styles/index.scss`，在文件顶部确认引入顺序（tokens.scss 必须在 theme.scss 之前）。如已有引入则保持；如无则添加：

```scss
// src/styles/index.scss 顶部
@use './tokens.scss';
@use './theme.scss';
@use './glass.scss';
```

- [ ] **步骤 4：运行测试验证不破坏现有功能**

运行：`pnpm vitest run`
预期：全部通过（245 测试）

- [ ] **步骤 5：运行 vue-tsc 验证类型**

运行：`pnpm vue-tsc --noEmit`
预期：零错误

- [ ] **步骤 6：Commit**

```bash
git add src/styles/tokens.scss src/styles/theme.scss src/styles/index.scss
git commit -m "refactor(style): 建立 primitive/semantic/component 三层 token"
```

---

### 任务 2：TypeGrid 组件（TDD）

**文件：**

- 创建：`src/components/TypeGrid.vue`
- 创建：`src/components/__tests__/TypeGrid.test.ts`

- [ ] **步骤 1：编写失败的测试**

创建 `src/components/__tests__/TypeGrid.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TypeGrid from '@/components/TypeGrid.vue'

interface TypeItem {
  key: string
  label: string
}
interface Section {
  title: string
  types: TypeItem[]
}

const SECTIONS: Section[] = [
  {
    title: '基础运算',
    types: [
      { key: 'add', label: '加法' },
      { key: 'sub', label: '减法' },
    ],
  },
  { title: '资料分析', types: [{ key: 'growth', label: '增长率' }] },
]

describe('TypeGrid.vue', () => {
  it('渲染所有 section 与 type cell', () => {
    const wrapper = mount(TypeGrid, {
      props: { sections: SECTIONS, modelValue: '' },
    })
    expect(wrapper.text()).toContain('基础运算')
    expect(wrapper.text()).toContain('加法')
    expect(wrapper.text()).toContain('资料分析')
    expect(wrapper.text()).toContain('增长率')
  })

  it('modelValue 匹配项标记为 selected', () => {
    const wrapper = mount(TypeGrid, {
      props: { sections: SECTIONS, modelValue: 'sub' },
    })
    const sub = wrapper.find('[data-type-key="sub"]')
    expect(sub.classes()).toContain('selected')
  })

  it('点击 type cell 触发 update:modelValue', async () => {
    const wrapper = mount(TypeGrid, {
      props: { sections: SECTIONS, modelValue: '' },
    })
    await wrapper.find('[data-type-key="add"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['add'])
  })

  it('disabled 时点击不触发事件', async () => {
    const wrapper = mount(TypeGrid, {
      props: { sections: SECTIONS, modelValue: '', disabled: true },
    })
    await wrapper.find('[data-type-key="add"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('disabled 时 cell 添加 disabled class', () => {
    const wrapper = mount(TypeGrid, {
      props: { sections: SECTIONS, modelValue: '', disabled: true },
    })
    expect(wrapper.find('[data-type-key="add"]').classes()).toContain('disabled')
  })

  it('showTitle=false 时不渲染 section title', () => {
    const wrapper = mount(TypeGrid, {
      props: { sections: SECTIONS, modelValue: '', showTitle: false },
    })
    expect(wrapper.text()).not.toContain('基础运算')
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm vitest run src/components/__tests__/TypeGrid.test.ts`
预期：FAIL，报错 "Cannot find module '@/components/TypeGrid.vue'"

- [ ] **步骤 3：编写 TypeGrid 实现**

创建 `src/components/TypeGrid.vue`：

```vue
<script setup lang="ts">
// 题型网格组件 - sectioned + selectable
// 用于 PracticeSettings 与 DataAnalysisSettings 共用
interface TypeItem {
  key: string
  label: string
  icon?: string
}
interface Section {
  title: string
  types: TypeItem[]
}

interface Props {
  sections: Section[]
  modelValue: string
  disabled?: boolean
  showTitle?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  showTitle: true,
})
const emit = defineEmits<{
  'update:modelValue': [key: string]
}>()

function select(key: string) {
  if (props.disabled) return
  emit('update:modelValue', key)
}
</script>

<template>
  <div class="type-grid-container">
    <div v-for="(section, sIdx) in sections" :key="sIdx" class="type-section">
      <div v-if="showTitle" class="section-title">{{ section.title }}</div>
      <div class="type-grid">
        <button
          v-for="t in section.types"
          :key="t.key"
          :data-type-key="t.key"
          class="type-cell"
          :class="{
            selected: modelValue === t.key,
            disabled: disabled,
          }"
          :disabled="disabled"
          @click="select(t.key)"
        >
          {{ t.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.type-grid-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.type-section {
  .section-title {
    font-size: 11px;
    color: var(--app-text-bright);
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid rgba(95, 175, 111, 0.4);
    display: flex;
    align-items: center;
    gap: 4px;

    &::before {
      content: '';
      width: 3px;
      height: 12px;
      background: var(--app-color-primary);
      border-radius: 2px;
    }
  }
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.type-cell {
  background: var(--type-cell-bg);
  border: 1px solid var(--type-cell-border);
  border-radius: 6px;
  padding: 10px 6px;
  text-align: center;
  font-size: 11px;
  color: var(--app-text-primary);
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;

  &:hover:not(.disabled) {
    border-color: var(--type-cell-border-selected);
  }

  &.selected {
    background: var(--type-cell-bg-selected);
    border-color: var(--type-cell-border-selected);
    color: var(--app-text-bright);
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm vitest run src/components/__tests__/TypeGrid.test.ts`
预期：PASS（6 测试）

- [ ] **步骤 5：Commit**

```bash
git add src/components/TypeGrid.vue src/components/__tests__/TypeGrid.test.ts
git commit -m "feat(component): 新增 TypeGrid 题型网格组件"
```

---

### 任务 3：SegmentedControl 组件（TDD）

**文件：**

- 创建：`src/components/SegmentedControl.vue`
- 创建：`src/components/__tests__/SegmentedControl.test.ts`

- [ ] **步骤 1：编写失败的测试**

创建 `src/components/__tests__/SegmentedControl.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SegmentedControl from '@/components/SegmentedControl.vue'

interface Option {
  label: string
  value: string
}

const OPTIONS: Option[] = [
  { label: '简单', value: 'easy' },
  { label: '一般', value: 'normal' },
  { label: '困难', value: 'hard' },
]

describe('SegmentedControl.vue', () => {
  it('渲染所有选项', () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: '' },
    })
    expect(wrapper.text()).toContain('简单')
    expect(wrapper.text()).toContain('一般')
    expect(wrapper.text()).toContain('困难')
  })

  it('modelValue 匹配项标记为 active', () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: 'normal' },
    })
    const normal = wrapper.find('[data-seg-value="normal"]')
    expect(normal.classes()).toContain('active')
  })

  it('点击选项触发 update:modelValue', async () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: '' },
    })
    await wrapper.find('[data-seg-value="hard"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['hard'])
  })

  it('disabled 时点击不触发事件', async () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: '', disabled: true },
    })
    await wrapper.find('[data-seg-value="hard"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('disabled 时所有选项标记 disabled', () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: '', disabled: true },
    })
    const allButtons = wrapper.findAll('.seg-btn')
    expect(allButtons.every((b) => b.classes().contains('disabled'))).toBe(true)
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm vitest run src/components/__tests__/SegmentedControl.test.ts`
预期：FAIL，报错 "Cannot find module '@/components/SegmentedControl.vue'"

- [ ] **步骤 3：编写 SegmentedControl 实现**

创建 `src/components/SegmentedControl.vue`：

```vue
<script setup lang="ts">
// 分段控件 - 单选 segmented control
// 替换 el-dialog 弹窗，用于难度/题量/N-back 等单选场景
interface Option {
  label: string
  value: string
}

interface Props {
  options: Option[]
  modelValue: string
  disabled?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})
const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function select(value: string) {
  if (props.disabled) return
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="segmented-control" :class="{ disabled }">
    <button
      v-for="(opt, idx) in options"
      :key="opt.value"
      :data-seg-value="opt.value"
      class="seg-btn"
      :class="{
        active: modelValue === opt.value,
        disabled: disabled,
        'last-item': idx === options.length - 1,
      }"
      :disabled="disabled"
      @click="select(opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped lang="scss">
.segmented-control {
  display: flex;
  gap: 0;
  background: var(--seg-bg);
  border: 1px solid var(--seg-border);
  border-radius: 6px;
  overflow: hidden;
}

.seg-btn {
  flex: 1;
  padding: 8px;
  text-align: center;
  font-size: 11px;
  color: var(--app-text-primary);
  background: transparent;
  border: none;
  border-right: 1px solid var(--seg-divider);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;

  &:not(.last-item) {
    border-right: 1px solid var(--seg-divider);
  }
  &.last-item {
    border-right: none;
  }

  &:hover:not(.disabled) {
    color: var(--app-text-bright);
  }

  &.active {
    background: var(--seg-bg-selected);
    color: var(--app-text-bright);
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm vitest run src/components/__tests__/SegmentedControl.test.ts`
预期：PASS（5 测试）

- [ ] **步骤 5：Commit**

```bash
git add src/components/SegmentedControl.vue src/components/__tests__/SegmentedControl.test.ts
git commit -m "feat(component): 新增 SegmentedControl 分段控件"
```

---

### 任务 4：SettingRow 组件（TDD）

**文件：**

- 创建：`src/components/SettingRow.vue`
- 创建：`src/components/__tests__/SettingRow.test.ts`

- [ ] **步骤 1：编写失败的测试**

创建 `src/components/__tests__/SettingRow.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingRow from '@/components/SettingRow.vue'

describe('SettingRow.vue', () => {
  it('渲染 label 与默认 slot 内容', () => {
    const wrapper = mount(SettingRow, {
      props: { label: '题量' },
      slots: { default: '<span>10 题</span>' },
    })
    expect(wrapper.text()).toContain('题量')
    expect(wrapper.text()).toContain('10 题')
  })

  it('expandable=false 时不渲染展开区', () => {
    const wrapper = mount(SettingRow, {
      props: { label: '难度', expandable: false },
      slots: { default: '<span>简单</span>' },
    })
    expect(wrapper.find('.expand-area').exists()).toBe(false)
  })

  it('expandable=true 且 expanded=true 时渲染展开区', () => {
    const wrapper = mount(SettingRow, {
      props: { label: '题量', expandable: true, expanded: true },
      slots: {
        default: '<span>自定</span>',
        expand: "<div class='slider'>滑块</div>",
      },
    })
    expect(wrapper.find('.expand-area').exists()).toBe(true)
    expect(wrapper.text()).toContain('滑块')
  })

  it('expandable=true 且 expanded=false 时不渲染展开区', () => {
    const wrapper = mount(SettingRow, {
      props: { label: '题量', expandable: true, expanded: false },
      slots: {
        default: '<span>自定</span>',
        expand: '<div>滑块</div>',
      },
    })
    expect(wrapper.find('.expand-area').exists()).toBe(false)
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm vitest run src/components/__tests__/SettingRow.test.ts`
预期：FAIL，报错 "Cannot find module '@/components/SettingRow.vue'"

- [ ] **步骤 3：编写 SettingRow 实现**

创建 `src/components/SettingRow.vue`：

```vue
<script setup lang="ts">
// 设置行组件 - label + slot + 可选展开区
// 用于 PracticeSettings/DataAnalysisSettings 替换 row+el-dialog
interface Props {
  label: string
  expandable?: boolean
  expanded?: boolean
}
withDefaults(defineProps<Props>(), {
  expandable: false,
  expanded: false,
})
</script>

<template>
  <div class="setting-row">
    <div class="setting-label">{{ label }}</div>
    <div class="setting-content">
      <slot />
    </div>
    <div v-if="expandable && expanded" class="expand-area">
      <slot name="expand" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.setting-row {
  margin-bottom: 12px;
}

.setting-label {
  font-size: 11px;
  color: var(--app-text-primary);
  margin-bottom: 6px;
}

.setting-content {
  /* slot 内容自带样式 */
}

.expand-area {
  background: var(--expand-bg);
  border: 1px solid var(--expand-border);
  border-radius: 6px;
  padding: 10px;
  margin-top: 4px;
}
</style>
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm vitest run src/components/__tests__/SettingRow.test.ts`
预期：PASS（4 测试）

- [ ] **步骤 5：运行全量测试验证无回归**

运行：`pnpm vitest run`
预期：全部通过（245 + 15 = 260 测试）

- [ ] **步骤 6：Commit**

```bash
git add src/components/SettingRow.vue src/components/__tests__/SettingRow.test.ts
git commit -m "feat(component): 新增 SettingRow 设置行组件"
```

---

### 任务 5：第 1 批验收

- [ ] **步骤 1：运行全量测试**

运行：`pnpm vitest run`
预期：260 测试全部通过

- [ ] **步骤 2：运行 vue-tsc**

运行：`pnpm vue-tsc --noEmit`
预期：零错误

- [ ] **步骤 3：启动应用验证无白屏**

运行：`pnpm tauri dev`（开发模式）
预期：应用正常启动，现有页面视觉无变化（token 仅重命名，色值不变）

- [ ] **步骤 4：Commit 验收标记**

```bash
git commit --allow-empty -m "chore: 第 1 批基础设施验收通过"
```

---

## 第 2 批 · View 替换

### 任务 6：路由 layout meta 与 App.vue 双顶栏消除

**文件：**

- 修改：`src/router/index.ts`
- 修改：`src/App.vue`

- [ ] **步骤 1：路由添加 layout meta**

修改 `src/router/index.ts`，给答题路由加 `layout: 'answer'`：

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    {
      path: '/home',
      name: 'home',
      component: () => import('@/views/Home.vue'),
      meta: { title: '首页', layout: 'default' },
    },
    {
      path: '/practice',
      name: 'practice-settings',
      component: () => import('@/views/PracticeSettings.vue'),
      meta: { title: '基础计算', layout: 'default' },
    },
    {
      path: '/practice/data-analysis',
      name: 'data-analysis-settings',
      component: () => import('@/views/DataAnalysisSettings.vue'),
      meta: { title: '资料分析', layout: 'default' },
    },
    {
      path: '/practice/session',
      name: 'practice-session',
      component: () => import('@/views/PracticeSession.vue'),
      meta: { title: '答题中', layout: 'answer' },
    },
    {
      path: '/practice/composite',
      name: 'composite-session',
      component: () => import('@/views/CompositeSession.vue'),
      meta: { title: '一表通算', layout: 'answer' },
    },
    {
      path: '/practice/result',
      name: 'practice-result',
      component: () => import('@/views/PracticeResult.vue'),
      meta: { title: '结算', layout: 'default' },
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('@/views/History.vue'),
      meta: { title: '历史记录', layout: 'default' },
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('@/views/Stats.vue'),
      meta: { title: '统计', layout: 'default' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/Settings.vue'),
      meta: { title: '设置', layout: 'default' },
    },
  ],
})

export default router
```

- [ ] **步骤 2：App.vue 根据 layout 决定渲染哪个顶栏，移除 db-status**

替换 `src/App.vue` 全文：

```vue
<script setup lang="ts">
// 行测小助手 - 应用根布局
// sidebar 72px + 单一顶栏（default→AppToolbar / answer→由 view 自带 TopBar）
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
import AppToolbar from './components/AppToolbar.vue'

const route = useRoute()
const layout = computed(() => (route.meta.layout as string | undefined) ?? 'default')
const showAppToolbar = computed(() => layout.value === 'default')
</script>

<template>
  <div class="app-shell">
    <AppSidebar />

    <div class="app-main">
      <AppToolbar v-if="showAppToolbar" />

      <main class="app-content" :class="{ 'answer-mode': !showAppToolbar }">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-shell {
  display: flex;
  width: 100%;
  height: 100%;
  background: var(--app-bg-page);
  background-image: radial-gradient(ellipse at top left, rgba(95, 175, 111, 0.06), transparent 60%);
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding-left: 0;
}

.app-content {
  flex: 1;
  overflow: auto;
  padding: 88px 24px 24px 96px;

  &.answer-mode {
    // 答题页由 TopBar 自带顶栏，AppToolbar 不渲染
    // TopBar 是文档流，padding-top 减小为 24px
    padding-top: 24px;
  }
}
</style>
```

- [ ] **步骤 3：运行测试验证**

运行：`pnpm vitest run`
预期：全部通过

- [ ] **步骤 4：Commit**

```bash
git add src/router/index.ts src/App.vue
git commit -m "refactor(layout): 答题页改用 TopBar，消除双顶栏叠加，移除 db-status"
```

---

### 任务 7：AppSidebar 触摸目标与 brand tooltip

**文件：**

- 修改：`src/components/AppSidebar.vue`

- [ ] **步骤 1：修改 AppSidebar.vue**

修改 `src/components/AppSidebar.vue` 的 `<style scoped>` 中 `.nav-item` padding 与 `.brand-mark` 添加 `title` 属性。完整替换 `<template>` 和 `<style>` 块（保留 `<script setup>`）：

`<template>` 替换为：

```vue
<template>
  <nav class="app-sidebar glass-sidebar" aria-label="主导航">
    <div class="brand" title="行测小助手">
      <div class="brand-mark" aria-label="行测小助手 logo">速</div>
    </div>

    <ul class="nav-list">
      <li
        v-for="item in items"
        :key="item.path"
        class="nav-item glass-button"
        :class="{ 'is-active': activePath === item.path }"
        :aria-label="item.label"
        :aria-current="activePath === item.path ? 'page' : undefined"
        @click="router.push(item.path)"
      >
        <el-icon :size="18"><component :is="item.icon" /></el-icon>
        <span class="nav-label">{{ item.label }}</span>
      </li>
    </ul>

    <div class="sidebar-footer">
      <div class="text-muted text-version">v0.1.0 · L0</div>
      <div class="text-muted text-credit">本地版 · 离线</div>
    </div>
  </nav>
</template>
```

`<style scoped lang="scss">` 替换为：

```scss
.app-sidebar {
  position: fixed;
  top: 16px;
  left: 16px;
  bottom: 16px;
  width: 72px;
  padding: 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 100;
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 0 16px;
  cursor: default;

  .brand-mark {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--app-color-primary), var(--app-color-success));
    color: var(--app-bg-page);
    font-size: 20px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(95, 175, 111, 0.3);
  }
}

.nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  // 触摸目标提升至 72×56px（原 72×52px）
  padding: 12px 4px;
  cursor: pointer;
  color: var(--app-text-secondary);
  font-size: 11px;

  .nav-label {
    font-size: 11px;
    line-height: 1;
  }

  &.is-active {
    color: var(--app-text-bright);
  }
}

.sidebar-footer {
  text-align: center;
  font-size: 10px;
  line-height: 1.4;
  padding-top: 8px;
  border-top: 1px solid var(--app-glass-border);

  .text-version {
    color: var(--app-color-primary);
    font-weight: 600;
  }
}
```

- [ ] **步骤 2：运行测试**

运行：`pnpm vitest run`
预期：全部通过

- [ ] **步骤 3：Commit**

```bash
git add src/components/AppSidebar.vue
git commit -m "refactor(sidebar): 触摸目标 72×56px，brand tooltip，aria-label"
```

---

### 任务 8：Numpad 精简手柄 + 内联重开 + 边界 clamp（TDD）

**文件：**

- 修改：`src/components/Numpad.vue`
- 修改：`src/components/__tests__/Numpad.test.ts`

- [ ] **步骤 1：先编写新测试用例**

在 `src/components/__tests__/Numpad.test.ts` 末尾追加：

```typescript
it('手柄为 icon-only，不含常驻文案', () => {
  const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
  const handle = wrapper.find('[data-handle="drag"]')
  expect(handle.text()).not.toContain('上下拖调大小')
  expect(handle.text()).not.toContain('双击恢复')
})

it('重开按钮内联手柄区，不浮在卡片外', () => {
  const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
  // 重开按钮应在手柄区内（同级而非 absolute 浮空）
  const handle = wrapper.find('[data-handle="drag"]')
  const restartInHandle = handle.find('[data-key="restart"]')
  expect(restartInHandle.exists()).toBe(true)
})

it('basic variant 仍有独立的 ± 键在网格中', () => {
  const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
  const signInGrid = wrapper.find('.keypad-grid [data-key="sign"]')
  expect(signInGrid.exists()).toBe(true)
})

it('data variant 重开按钮在网格中（非手柄区）', () => {
  const wrapper = mount(Numpad, { props: { variant: 'data', layout: 'normal' } })
  const restartInGrid = wrapper.find('.keypad-grid [data-key="restart"]')
  expect(restartInGrid.exists()).toBe(true)
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm vitest run src/components/__tests__/Numpad.test.ts`
预期：FAIL（手柄文案测试、内联重开测试失败）

- [ ] **步骤 3：重写 Numpad.vue**

替换 `src/components/Numpad.vue` 全文：

```vue
<script setup lang="ts">
// 数字键盘 - 可拖拽浮窗，icon-only 手柄，内联重开，边界 clamp
import { ref, onMounted } from 'vue'

interface Props {
  variant?: 'basic' | 'data'
  layout?: 'normal' | 'reverse' | 'shuffle'
}
const props = withDefaults(defineProps<Props>(), {
  variant: 'basic',
  layout: 'normal',
})
const emit = defineEmits<{
  input: [char: string]
  submit: []
  clear: []
  backspace: []
  restart: []
  'toggle-sign': []
}>()

// 拖拽状态
const posX = ref(0)
const posY = ref(0)
const scale = ref(1)
const dragging = ref(false)
let dragStartX = 0
let dragStartY = 0
let dragStartPosX = 0
let dragStartPosY = 0
let dragStartScale = 1
let dragAxis: 'h' | 'v' | null = null

// 视口边界 clamp 用：numpad 容器实际尺寸
const containerEl = ref<HTMLElement | null>(null)

const DEFAULT_POS_X = 0
const DEFAULT_POS_Y = 0
const DEFAULT_SCALE = 1
const MIN_SCALE = 0.7
const MAX_SCALE = 1.5
const VIEWPORT_MARGIN = 12 // px，距视口边距

function loadPersistedState() {
  try {
    const pX = localStorage.getItem('numpad:posX')
    const pY = localStorage.getItem('numpad:posY')
    const sc = localStorage.getItem('numpad:scale')
    if (pX !== null) posX.value = Number(pX)
    if (pY !== null) posY.value = Number(pY)
    if (sc !== null) scale.value = Number(sc)
  } catch {
    // localStorage 不可用，用默认
  }
}

function persistState() {
  try {
    localStorage.setItem('numpad:posX', String(posX.value))
    localStorage.setItem('numpad:posY', String(posY.value))
    localStorage.setItem('numpad:scale', String(scale.value))
  } catch {
    // 忽略
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

// 计算 clamp 范围（基于父容器与 numpad 实际尺寸）
function getClampBounds() {
  const parent = containerEl.value?.parentElement
  if (!parent || !containerEl.value) {
    return { minX: -1000, maxX: 1000, minY: -1000, maxY: 1000 }
  }
  const parentRect = parent.getBoundingClientRect()
  const selfRect = containerEl.value.getBoundingClientRect()
  // 实际显示尺寸 = selfRect * scale
  const scaledW = selfRect.width * scale.value
  const scaledH = selfRect.height * scale.value
  // Numpad 默认布局在父容器右下（由父容器 flex/position 决定），translate(0,0) 即默认位置
  // clamp 范围：让 numpad 不超出父容器
  const maxX = Math.max(0, parentRect.width - scaledW - VIEWPORT_MARGIN)
  const maxY = Math.max(0, parentRect.height - scaledH - VIEWPORT_MARGIN)
  return {
    minX: -scaledW + VIEWPORT_MARGIN, // 允许向左拖到只剩 margin 宽度可见
    maxX,
    minY: -scaledH + VIEWPORT_MARGIN,
    maxY,
  }
}

function onPointerDown(e: PointerEvent) {
  dragging.value = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  dragStartPosX = posX.value
  dragStartPosY = posY.value
  dragStartScale = scale.value
  dragAxis = null
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  const dx = e.clientX - dragStartX
  const dy = e.clientY - dragStartY
  if (dragAxis === null && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
    dragAxis = Math.abs(dy) > Math.abs(dx) ? 'v' : 'h'
  }
  const bounds = getClampBounds()
  if (dragAxis === 'v') {
    const newScale = dragStartScale + dy / 200
    scale.value = clamp(newScale, MIN_SCALE, MAX_SCALE)
  } else if (dragAxis === 'h') {
    posX.value = clamp(dragStartPosX + dx, bounds.minX, bounds.maxX)
    posY.value = clamp(dragStartPosY + dy, bounds.minY, bounds.maxY)
  }
}

function onPointerUp() {
  if (dragging.value) {
    dragging.value = false
    persistState()
  }
}

function onDoubleClick() {
  posX.value = DEFAULT_POS_X
  posY.value = DEFAULT_POS_Y
  scale.value = DEFAULT_SCALE
  persistState()
}

onMounted(loadPersistedState)

const numberKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

function onKey(key: string) {
  if (key === 'submit') emit('submit')
  else if (key === 'clear') emit('clear')
  else if (key === 'backspace') emit('backspace')
  else if (key === 'restart') emit('restart')
  else if (key === 'sign') emit('toggle-sign')
  else emit('input', key)
}
</script>

<template>
  <div
    ref="containerEl"
    class="numpad-container glass-card"
    :style="{
      transform: `translate(${posX}px, ${posY}px) scale(${scale})`,
    }"
  >
    <!-- 手柄：icon-only + 内联重开按钮 -->
    <div
      data-handle="drag"
      class="drag-handle"
      title="拖动移动 · 双击复位"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @dblclick="onDoubleClick"
    >
      <span class="handle-icon" aria-hidden="true">⋮⋮</span>
      <!-- basic variant 重开按钮内联到手柄右侧 -->
      <button
        v-if="props.variant === 'basic'"
        data-key="restart"
        class="handle-restart"
        aria-label="重开"
        @click.stop="onKey('restart')"
      >
        重开
      </button>
    </div>

    <!-- 键盘网格 3列5行 -->
    <div class="keypad-grid">
      <!-- 行1：±/清空/退格（basic）或 重开/清空/退格（data）-->
      <template v-if="props.variant === 'basic'">
        <button
          data-key="sign"
          class="key-cell glass-button"
          aria-label="切换正负号"
          @click="onKey('sign')"
        >
          ±
        </button>
      </template>
      <template v-else>
        <button
          data-key="restart"
          class="key-cell glass-button"
          aria-label="重开"
          @click="onKey('restart')"
        >
          重开
        </button>
      </template>
      <button
        data-key="clear"
        class="key-cell glass-button"
        aria-label="清空"
        @click="onKey('clear')"
      >
        清空
      </button>
      <button
        data-key="backspace"
        class="key-cell glass-button"
        aria-label="退格"
        @click="onKey('backspace')"
      >
        退格
      </button>

      <!-- 行2-4：1-9 -->
      <button
        v-for="k in numberKeys"
        :key="k"
        :data-key="k"
        class="key-cell glass-button"
        :aria-label="k"
        @click="onKey(k)"
      >
        {{ k }}
      </button>

      <!-- 行5：./0/确定 -->
      <button data-key="." class="key-cell glass-button" aria-label="小数点" @click="onKey('.')">
        .
      </button>
      <button data-key="0" class="key-cell glass-button" aria-label="0" @click="onKey('0')">
        0
      </button>
      <button
        data-key="submit"
        class="key-cell key-submit"
        aria-label="提交"
        @click="onKey('submit')"
      >
        确定
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.numpad-container {
  display: inline-block;
  padding: 12px;
  border-radius: var(--app-radius-card);
  user-select: none;
  position: relative;
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  cursor: grab;
  font-size: 12px;
  color: var(--app-text-secondary);
  border-radius: 8px;

  &:active {
    cursor: grabbing;
  }
}

.handle-icon {
  font-size: 14px;
  letter-spacing: 1px;
}

.handle-restart {
  background: rgba(42, 161, 152, 0.3);
  color: var(--app-color-info);
  border: 1px solid rgba(42, 161, 152, 0.4);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 10px;
  cursor: pointer;

  &:hover {
    background: rgba(42, 161, 152, 0.5);
  }
}

.keypad-grid {
  display: grid;
  grid-template-columns: repeat(3, 64px);
  grid-auto-rows: 56px;
  gap: 8px;
}

.key-cell {
  border: 1px solid var(--app-glass-border);
  border-radius: 8px;
  background: var(--key-bg);
  color: var(--key-text);
  font-size: 20px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.15s,
    transform 0.05s;

  &:hover {
    background: var(--key-bg-hover);
  }
  &:active {
    transform: scale(0.96);
  }
}

.key-submit {
  background: var(--key-submit-bg);
  color: #fff;

  &:hover {
    background: rgba(95, 175, 111, 0.95);
  }
}
</style>
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm vitest run src/components/__tests__/Numpad.test.ts`
预期：PASS（所有 Numpad 测试）

- [ ] **步骤 5：Commit**

```bash
git add src/components/Numpad.vue src/components/__tests__/Numpad.test.ts
git commit -m "refactor(numpad): icon-only 手柄，内联重开，边界 clamp，aria-label"
```

---

### 任务 9：PracticeSettings 替换为新组件

**文件：**

- 修改：`src/views/PracticeSettings.vue`

> **注意**：本任务需保留原有逻辑（settings store 读写、custom preset 弹窗、开始练习跳转），仅替换 UI 控件。先完整阅读原文件，理解所有逻辑后再替换。

- [ ] **步骤 1：阅读现有 PracticeSettings.vue 全文**

运行：用 Read 工具读取 `src/views/PracticeSettings.vue`（全文件）
预期：理解 questionTypes、countDialogVisible、customVisible、stdCfg/powCfg 等所有逻辑

- [ ] **步骤 2：替换 PracticeSettings.vue**

替换 `src/views/PracticeSettings.vue` 全文（保留所有原逻辑，仅将题型网格、题量弹窗、N-back 弹窗替换为 TypeGrid/SegmentedControl/SettingRow）：

```vue
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { usePracticeStore } from '@/stores/practice'
import { useSettingsStore } from '@/stores/settings'
import { listCustomPresets, upsertCustomPreset, type CustomPreset } from '@/db/index'
import {
  formatStandardName,
  formatPowerName,
  type CustomStandardConfig,
  type CustomPowerConfig,
} from '@/generators/custom'
import type { BasicType } from '@/generators/basic'
import TypeGrid from '@/components/TypeGrid.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import SettingRow from '@/components/SettingRow.vue'

type Operator = '+' | '-' | '×' | '÷'

const router = useRouter()
const store = usePracticeStore()
const settings = useSettingsStore()

// 题型分 section
const sections = [
  {
    title: '加减法',
    types: [
      { key: 'addsub_2d', label: '两位数加减' },
      { key: 'round_100', label: '凑整百练习' },
      { key: 'add_3d', label: '三位数加法' },
      { key: 'sub_3d', label: '三位数减法' },
      { key: 'addsub_3d', label: '三位数加减' },
      { key: 'add_multi', label: '多数相加' },
      { key: 'addsub_mix', label: '混合加减' },
    ],
  },
  {
    title: '乘除法',
    types: [
      { key: 'mul_2x1', label: '两位数乘一位数' },
      { key: 'mul_3x1', label: '三位数乘一位数' },
      { key: 'mul_2x11', label: '两位数乘11' },
      { key: 'mul_2x15', label: '两位数乘15' },
      { key: 'mul_2x2', label: '两位数乘两位数' },
      { key: 'div_3x1', label: '三位数除一位数' },
      { key: 'div_3x2', label: '三位数除两位数' },
      { key: 'mul_est', label: '乘法估算' },
      { key: 'div_5x3', label: '五位数除三位数' },
      { key: 'div_3x4', label: '三位数除四位数' },
    ],
  },
]

const OPERATORS: Operator[] = ['+', '-', '×', '÷']

// 当前选中题型
const selectedType = ref<BasicType>('addsub_2d')

function onTypeChange(key: string) {
  selectedType.value = key as BasicType
}

// 键盘布局
const layoutOptions = [
  { label: '正序', value: 'normal' },
  { label: '倒序', value: 'reverse' },
  { label: '乱序', value: 'shuffle' },
]
const layout = computed({
  get: () => settings.basic.layout ?? 'normal',
  set: async (v: string) => {
    await settings.saveBasic({ layout: v as 'normal' | 'reverse' | 'shuffle' })
  },
})

// 题量 segmented
const countOptions = [
  { label: '5', value: '5' },
  { label: '10', value: '10' },
  { label: '15', value: '15' },
  { label: '20', value: '20' },
  { label: '自定', value: 'custom' },
]
const countMode = computed(() => {
  const c = settings.basic.count
  const m = settings.basic.countMode
  if (m === 'custom') return 'custom'
  return String(c)
})
const customCount = ref(settings.basic.count)
const showCustomExpand = computed(() => countMode.value === 'custom')

async function onCountChange(v: string) {
  if (v === 'custom') {
    await settings.saveBasic({ countMode: 'custom', count: customCount.value })
  } else {
    const n = Number(v)
    await settings.saveBasic({ countMode: 'quick', count: n })
  }
}

async function onCustomCountInput(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  customCount.value = Math.max(5, Math.min(100, v))
  await settings.saveBasic({ countMode: 'custom', count: customCount.value })
}

// N-back
const nbackOptions = [
  { label: '关闭', value: '0' },
  { label: '1-back', value: '1' },
  { label: '2-back', value: '2' },
]
const nback = computed({
  get: () => String(settings.basic.nback ?? 0),
  set: async (v: string) => {
    await settings.saveBasic({ nback: Number(v) as 0 | 1 | 2 })
  },
})

// 自定义弹窗（保留 el-dialog 用于自定义配置——这是复杂表单，不在本次重构范围）
const customVisible = ref(false)
const customTab = ref<'standard' | 'power'>('standard')
const presets = ref<CustomPreset[]>([])

const stdCfg = ref<CustomStandardConfig>({
  firstDigits: 2,
  operators: ['+'],
  secondMode: 'random_digits',
  secondDigits: 1,
  secondFixed: 5,
  secondMin: 1,
  secondMax: 9,
})
const powCfg = ref<CustomPowerConfig>({
  baseMode: 'digits',
  baseDigits: 2,
  baseMin: 2,
  baseMax: 9,
  powerTypes: [2],
})

async function openCustomDialog() {
  customVisible.value = true
  presets.value = await listCustomPresets()
}

function loadPreset(p: CustomPreset) {
  try {
    const cfg = JSON.parse(p.config)
    if (Array.isArray(cfg?.operators)) {
      stdCfg.value = { ...stdCfg.value, ...cfg }
      customTab.value = 'standard'
    } else if (Array.isArray(cfg?.powerTypes)) {
      powCfg.value = { ...powCfg.value, ...cfg }
      customTab.value = 'power'
    } else {
      ElMessage.warning('预设格式异常')
    }
  } catch {
    ElMessage.error('预设解析失败')
  }
}

async function saveCustomPreset() {
  const cfg = customTab.value === 'standard' ? stdCfg.value : powCfg.value
  const name =
    customTab.value === 'standard'
      ? formatStandardName(stdCfg.value)
      : formatPowerName(powCfg.value)
  await upsertCustomPreset({ name, config: JSON.stringify(cfg) })
  presets.value = await listCustomPresets()
  ElMessage.success('预设已保存')
}

// 开始练习
async function startPractice() {
  await store.init({
    type: selectedType.value,
    count: settings.basic.count,
    nback: settings.basic.nback,
    layout: settings.basic.layout,
  })
  router.push('/practice/session')
}

function goHistory() {
  router.push('/history')
}

onMounted(async () => {
  await settings.loadBasic()
  selectedType.value = settings.basic.type ?? 'addsub_2d'
  customCount.value = settings.basic.count
})
</script>

<template>
  <div class="practice-settings">
    <h2 class="page-title">基础计算</h2>

    <!-- 键盘布局 -->
    <SettingRow label="键盘布局">
      <SegmentedControl
        :options="layoutOptions"
        :model-value="layout"
        @update:model-value="layout = $event"
      />
    </SettingRow>

    <!-- 题型选择 -->
    <SettingRow label="题型选择">
      <TypeGrid
        :sections="sections"
        :model-value="selectedType"
        @update:model-value="onTypeChange"
      />
    </SettingRow>

    <!-- 题量 -->
    <SettingRow label="题量" :expandable="showCustomExpand" :expanded="showCustomExpand">
      <SegmentedControl
        :options="countOptions"
        :model-value="countMode"
        @update:model-value="onCountChange"
      />
      <template #expand>
        <div class="custom-count">
          <label>自定义题量（5-100）</label>
          <input type="range" min="5" max="100" :value="customCount" @input="onCustomCountInput" />
          <span class="count-value">{{ customCount }} 题</span>
        </div>
      </template>
    </SettingRow>

    <!-- N-back -->
    <SettingRow label="N-back 工作记忆训练">
      <SegmentedControl
        :options="nbackOptions"
        :model-value="nback"
        @update:model-value="nback = $event"
      />
    </SettingRow>

    <!-- 操作按钮 -->
    <div class="actions">
      <button class="btn-primary" @click="startPractice">开始练习</button>
      <button class="btn-secondary" @click="openCustomDialog">自定义运算</button>
      <button class="btn-secondary" @click="goHistory">历史记录</button>
    </div>

    <!-- 自定义运算弹窗（保留 el-dialog 用于复杂表单） -->
    <el-dialog v-model="customVisible" title="自定义运算" width="600">
      <el-tabs v-model="customTab">
        <el-tab-pane label="标准运算" name="standard">
          <!-- 标准运算配置表单（保留原内容，参考原文件） -->
          <div class="custom-form">
            <div class="form-row">
              <label>首位位数</label>
              <input type="number" v-model.number="stdCfg.firstDigits" min="1" max="5" />
            </div>
            <div class="form-row">
              <label>运算符</label>
              <div class="op-list">
                <button
                  v-for="op in OPERATORS"
                  :key="op"
                  class="op-btn"
                  :class="{ active: stdCfg.operators.includes(op) }"
                  @click="toggleOperator(op)"
                >
                  {{ op }}
                </button>
              </div>
            </div>
            <div class="form-row">
              <label>次位模式</label>
              <select v-model="stdCfg.secondMode">
                <option value="random_digits">随机位数</option>
                <option value="fixed">固定值</option>
                <option value="range">范围</option>
              </select>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="幂运算" name="power">
          <div class="custom-form">
            <div class="form-row">
              <label>底数模式</label>
              <select v-model="powCfg.baseMode">
                <option value="digits">按位数</option>
                <option value="range">按范围</option>
              </select>
            </div>
            <div class="form-row">
              <label>底数位数</label>
              <input type="number" v-model.number="powCfg.baseDigits" min="1" max="5" />
            </div>
            <div class="form-row">
              <label>幂次</label>
              <div class="op-list">
                <button
                  v-for="p in [2, 3, 4]"
                  :key="p"
                  class="op-btn"
                  :class="{ active: powCfg.powerTypes.includes(p) }"
                  @click="togglePower(p)"
                >
                  {{ p }}
                </button>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>

      <div class="presets">
        <h4>最近预设</h4>
        <div v-if="presets.length === 0" class="empty">暂无预设</div>
        <div v-else class="preset-list">
          <button v-for="p in presets" :key="p.id" class="preset-item" @click="loadPreset(p)">
            {{ p.name }}
          </button>
        </div>
      </div>

      <template #footer>
        <button class="btn-secondary" @click="customVisible = false">取消</button>
        <button class="btn-primary" @click="saveCustomPreset">保存预设</button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.practice-settings {
  max-width: 720px;
  margin: 0 auto;
}

.page-title {
  font-size: 22px;
  color: var(--app-text-bright);
  margin-bottom: 16px;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-primary {
  flex: 1;
  padding: 12px 20px;
  background: var(--app-color-primary);
  color: var(--app-bg-page);
  border: none;
  border-radius: var(--app-radius-button);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: var(--app-color-primary-hover);
  }
}

.btn-secondary {
  flex: 1;
  padding: 12px 20px;
  background: var(--button-bg);
  color: var(--app-text-bright);
  border: 1px solid var(--button-border);
  border-radius: var(--app-radius-button);
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background: var(--button-bg-hover);
    border-color: var(--app-color-primary);
  }
}

.custom-count {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;

  label {
    color: var(--app-text-secondary);
  }

  input[type='range'] {
    width: 100%;
    accent-color: var(--app-color-primary);
  }

  .count-value {
    color: var(--app-color-primary);
    font-weight: 600;
    text-align: right;
  }
}

.custom-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;

  label {
    width: 80px;
    color: var(--app-text-secondary);
  }

  input,
  select {
    background: var(--app-bg-surface);
    color: var(--app-text-primary);
    border: 1px solid var(--app-glass-border);
    border-radius: 4px;
    padding: 4px 8px;
  }
}

.op-list {
  display: flex;
  gap: 6px;
}

.op-btn {
  width: 36px;
  height: 36px;
  background: var(--button-bg);
  border: 1px solid var(--button-border);
  border-radius: 4px;
  color: var(--app-text-primary);
  cursor: pointer;

  &.active {
    background: var(--button-bg-active);
    border-color: var(--app-color-primary);
    color: var(--app-text-bright);
  }
}

.presets {
  margin-top: 16px;

  h4 {
    font-size: 13px;
    color: var(--app-text-bright);
    margin-bottom: 8px;
  }

  .empty {
    font-size: 12px;
    color: var(--app-text-muted);
  }

  .preset-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .preset-item {
    background: var(--button-bg);
    border: 1px solid var(--button-border);
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 12px;
    color: var(--app-text-primary);
    cursor: pointer;

    &:hover {
      border-color: var(--app-color-primary);
    }
  }
}
</style>
```

> **注**：原文件中 `toggleOperator` 与 `togglePower` 函数需保留，由于上面的代码块已较长，这两个函数定义在 `<script setup>` 内（与原文件一致，请从原文件复制）：

补充 `<script setup>` 内（在 `saveCustomPreset` 函数后）：

```typescript
function toggleOperator(op: Operator) {
  const idx = stdCfg.value.operators.indexOf(op)
  if (idx >= 0) stdCfg.value.operators.splice(idx, 1)
  else stdCfg.value.operators.push(op)
}

function togglePower(p: number) {
  const idx = powCfg.value.powerTypes.indexOf(p)
  if (idx >= 0) powCfg.value.powerTypes.splice(idx, 1)
  else powCfg.value.powerTypes.push(p)
}
```

- [ ] **步骤 3：运行测试**

运行：`pnpm vitest run`
预期：全部通过（如有 settings store 相关测试需要 mock，参考已有测试模式）

- [ ] **步骤 4：Commit**

```bash
git add src/views/PracticeSettings.vue
git commit -m "refactor(practice-settings): 替换为 TypeGrid/SegmentedControl/SettingRow"
```

---

### 任务 10：DataAnalysisSettings 替换为新组件

**文件：**

- 修改：`src/views/DataAnalysisSettings.vue`

- [ ] **步骤 1：阅读现有 DataAnalysisSettings.vue 全文**

运行：用 Read 工具读取 `src/views/DataAnalysisSettings.vue`（全文件）

- [ ] **步骤 2：参照任务 9 模式替换**

按 PracticeSettings 的模式，将题型网格、难度、题量、N-back、呈现方式均替换为 TypeGrid/SegmentedControl/SettingRow。保留资料分析的三个分块结构（填空题/比较题/一表通算上下并排）。比较题 3 题型用 TypeGrid（showTitle=false），填空题 9 题型用 TypeGrid（showTitle=true）。

> **具体实现**：参考任务 9 的 PracticeSettings 替换模式，针对 DataAnalysisSettings 的字段做对应替换。本任务不展开完整代码（避免重复），工程师需根据 DataAnalysisSettings 现有字段与任务 9 的模式自行适配。

- [ ] **步骤 3：运行测试**

运行：`pnpm vitest run`
预期：全部通过

- [ ] **步骤 4：Commit**

```bash
git add src/views/DataAnalysisSettings.vue
git commit -m "refactor(data-analysis-settings): 替换为新组件"
```

---

### 任务 11：History.vue 下拉改 SegmentedControl

**文件：**

- 修改：`src/views/History.vue`

- [ ] **步骤 1：阅读现有 History.vue**

运行：用 Read 工具读取 `src/views/History.vue`

- [ ] **步骤 2：将原生 `<select>` 替换为 SegmentedControl**

在 `<template>` 中找到 `<select>` 元素，替换为：

```vue
<SegmentedControl
  :options="filterOptions"
  :model-value="filterType"
  @update:model-value="onFilterChange"
/>
```

在 `<script setup>` 中：

- import SegmentedControl
- 定义 `filterOptions` 数组（包含"全部"+"各题型"）
- `filterType` 改为 string（""表示全部）

- [ ] **步骤 3：运行测试**

运行：`pnpm vitest run`
预期：全部通过

- [ ] **步骤 4：Commit**

```bash
git add src/views/History.vue
git commit -m "refactor(history): 下拉改 SegmentedControl"
```

---

### 任务 12：其他 view 应用新 token（移除 fallback）

**文件：**

- 修改：`src/views/Home.vue`
- 修改：`src/views/PracticeSession.vue`
- 修改：`src/views/CompositeSession.vue`
- 修改：`src/views/PracticeResult.vue`
- 修改：`src/views/Stats.vue`
- 修改：`src/views/Settings.vue`

- [ ] **步骤 1：批量移除 scoped style 中的 fallback**

对每个文件，将 `var(--app-*, #xxx)` 替换为 `var(--app-*)`。

操作方式（每个文件）：

1. 用 Read 读取文件
2. 用 Edit 工具的 `replace_all: true`，将 `var(--app-bg-page, #002b36)` 替换为 `var(--app-bg-page)`
3. 同样替换其他带 fallback 的 token：`--app-bg-surface, #073642` / `--app-text-primary, #xxx` / `--app-text-secondary, #xxx` / `--app-text-bright, #xxx` / `--app-color-primary, #xxx` / `--app-glass-border, rgba(...)` / `--app-radius-card, 12px` 等
4. 注意：ECharts 色值硬编码（Stats.vue 中的 `#5faf6f / #93a1a1 / #073642`）暂不改，留到第 3 批

- [ ] **步骤 2：运行测试**

运行：`pnpm vitest run`
预期：全部通过

- [ ] **步骤 3：运行 vue-tsc**

运行：`pnpm vue-tsc --noEmit`
预期：零错误

- [ ] **步骤 4：Commit**

```bash
git add src/views/Home.vue src/views/PracticeSession.vue src/views/CompositeSession.vue src/views/PracticeResult.vue src/views/Stats.vue src/views/Settings.vue
git commit -m "refactor(views): 移除 scoped fallback，引用 semantic token"
```

---

### 任务 13：第 2 批验收

- [ ] **步骤 1：运行全量测试**

运行：`pnpm vitest run`
预期：全部通过

- [ ] **步骤 2：运行 vue-tsc**

运行：`pnpm vue-tsc --noEmit`
预期：零错误

- [ ] **步骤 3：构建并验证包体**

运行：`pnpm tauri build`
预期：成功，包体 < 30MB（应仍为 ~13MB，本批未引入新依赖）

- [ ] **步骤 4：启动应用手动验证**

运行：`pnpm tauri dev`
预期：

- 主页/列表态：AppToolbar 渲染
- 答题态（/practice/session, /practice/composite）：TopBar 渲染，AppToolbar 不渲染
- Numpad 手柄 icon-only，重开按钮内联，hover tooltip 显示
- PracticeSettings/DataAnalysisSettings 用 TypeGrid + SegmentedControl
- History 下拉改 SegmentedControl

- [ ] **步骤 5：Commit 验收标记**

```bash
git commit --allow-empty -m "chore: 第 2 批 view 替换验收通过"
```

---

## 第 3 批 · 收尾

### 任务 14：a11y 全局样式 + focus-visible + reduced-motion

**文件：**

- 修改：`src/styles/index.scss`
- 修改：`src/styles/theme.scss`（muted 对比度修复）
- 修改：`src/views/PracticeSession.vue`（闪烁动画 reduced-motion）

- [ ] **步骤 1：在 index.scss 添加全局 a11y 样式**

打开 `src/styles/index.scss`，在文件末尾追加：

```scss
// ===== 可访问性 =====

// focus-visible：键盘焦点时绿色描边（鼠标点击不显示）
:focus-visible {
  outline: 2px solid var(--app-color-primary);
  outline-offset: 2px;
}

// reduced-motion：尊重用户动画偏好
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **步骤 2：在 theme.scss 提亮 muted 文字**

修改 `src/styles/theme.scss`，由于 muted 已在 tokens.scss 中定义为 `#5d6f78`，确认 Element Plus `--el-text-color-placeholder` 与 `--el-text-color-disabled` 均引用 `var(--app-text-muted)`（任务 1 已完成）。

打开 tokens.scss 确认 `--color-muted-text: #5d6f78;`（已设置）。无需额外修改。

- [ ] **步骤 3：PracticeSession 闪烁动画添加 reduced-motion 静态降级**

打开 `src/views/PracticeSession.vue`，在 `<style scoped>` 末尾追加：

```scss
@media (prefers-reduced-motion: reduce) {
  .feedback-correct,
  .feedback-wrong {
    animation: none !important;
    // 改为静态边框
    border: 2px solid var(--app-color-primary); // correct
  }
  .feedback-wrong {
    border-color: var(--app-color-danger);
  }
}
```

> **注**：实际 class 名需根据 PracticeSession.vue 中闪烁反馈的真实 class 名调整。先用 Read 工具确认现有闪烁 class 名（搜索 `animation` 或 `@keyframes`），再调整上面的 selector。

- [ ] **步骤 4：运行测试**

运行：`pnpm vitest run`
预期：全部通过

- [ ] **步骤 5：Commit**

```bash
git add src/styles/index.scss src/views/PracticeSession.vue
git commit -m "feat(a11y): focus-visible + reduced-motion 适配"
```

---

### 任务 15：图标按钮 aria-label 补齐

**文件：**

- 修改：`src/components/AppSidebar.vue`（如任务 7 未完整覆盖）
- 修改：`src/components/CompareKeypad.vue`
- 修改：`src/components/TopBar.vue`
- 修改：`src/views/History.vue`（清除全部按钮）
- 修改：`src/views/PracticeResult.vue`（操作按钮）

- [ ] **步骤 1：扫描所有图标按钮**

用 Grep 工具搜索 `<button` 与 `class="` 包含 icon/FAB 的元素，列出未带 aria-label 的清单。

- [ ] **步骤 2：逐一补齐 aria-label**

对每个图标按钮（仅含图标无文字，或文字为符号）添加 `aria-label`：

- AppSidebar：nav-item 已在任务 7 添加
- CompareKeypad：小于/大于/重开/确定 各加 aria-label
- TopBar：返回按钮 `aria-label="返回"`
- History：清除全部按钮 `aria-label="清除全部历史记录"`
- PracticeResult：再练一局/返回设置/查看历史 已有文字，无需 aria-label

- [ ] **步骤 3：运行测试**

运行：`pnpm vitest run`
预期：全部通过

- [ ] **步骤 4：Commit**

```bash
git add src/components/ src/views/
git commit -m "feat(a11y): 图标按钮 aria-label 补齐"
```

---

### 任务 16：ECharts 按需引入 + Solarized 主题

**文件：**

- 创建：`src/styles/echarts-theme.ts`
- 修改：`src/views/Stats.vue`
- 修改：`src/components/BarChart.vue`

- [ ] **步骤 1：创建 ECharts Solarized 主题文件**

创建 `src/styles/echarts-theme.ts`：

```typescript
// ECharts Solarized 主题 - 色值引用 CSS token
import type { EChartsOption } from 'echarts'

// 主题色值（与 tokens.scss 中 --chart-* 对应）
export const CHART_COLORS = {
  primary: '#5faf6f',
  secondary: '#2aa198',
  warning: '#b58900',
  danger: '#dc322f',
  axis: '#93a1a1',
  split: '#073642',
  bright: '#eee8d5',
} as const

export const SOLARIZED_THEME: Record<string, unknown> = {
  backgroundColor: 'transparent',
  color: [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.warning, CHART_COLORS.danger],
  textStyle: {
    color: CHART_COLORS.axis,
  },
  title: {
    textStyle: { color: CHART_COLORS.bright },
  },
  legend: {
    textStyle: { color: CHART_COLORS.axis },
  },
  tooltip: {
    backgroundColor: 'rgba(7, 54, 66, 0.95)',
    borderColor: CHART_COLORS.primary,
    textStyle: { color: CHART_COLORS.bright },
  },
  radar: {
    axisName: { color: CHART_COLORS.axis },
    splitLine: { lineStyle: { color: CHART_COLORS.split } },
    splitArea: {
      areaStyle: { color: ['rgba(0,0,0,0)', 'rgba(255,255,255,0.03)'] },
    },
    axisLine: { lineStyle: { color: CHART_COLORS.split } },
  },
  categoryAxis: {
    axisLine: { lineStyle: { color: CHART_COLORS.split } },
    axisTick: { lineStyle: { color: CHART_COLORS.split } },
    axisLabel: { color: CHART_COLORS.axis },
    splitLine: { lineStyle: { color: CHART_COLORS.split } },
  },
  valueAxis: {
    axisLine: { lineStyle: { color: CHART_COLORS.split } },
    axisTick: { lineStyle: { color: CHART_COLORS.split } },
    axisLabel: { color: CHART_COLORS.axis },
    splitLine: { lineStyle: { color: CHART_COLORS.split } },
  },
}
```

- [ ] **步骤 2：修改 Stats.vue 按需引入 + 主题化**

替换 `src/views/Stats.vue` 顶部的 ECharts import 与图表初始化：

```typescript
// 替换原 import * as echarts from "echarts"
import * as echarts from 'echarts/core'
import { BarChart, LineChart, RadarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  RadarComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ECharts } from 'echarts/core'
import { SOLARIZED_THEME } from '@/styles/echarts-theme'

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

// 注册主题（仅注册一次，模块级执行）
echarts.registerTheme('solarized', SOLARIZED_THEME)
```

将原 `let radarChart: echarts.ECharts | null = null;` 等改为 `let radarChart: ECharts | null = null;`。

将所有 `echarts.init(radarEl.value)` 改为 `echarts.init(radarEl.value, "solarized")`。

删除原硬编码常量：

```typescript
// 删除：
// const TEXT_PRIMARY = "#93a1a1";
// const COLOR_PRIMARY = "#5faf6f";
// const COLOR_SPLIT = "#073642";
```

并将 setOption 中所有 `TEXT_PRIMARY / COLOR_PRIMARY / COLOR_SPLIT` 引用改为引用 `SOLARIZED_THEME` 的对应字段，或由于主题已注册，移除 chart option 中的硬编码色值（让主题接管）。

- [ ] **步骤 3：修改 BarChart.vue 按需引入 + 主题化**

参照 Stats.vue 模式，替换 `src/components/BarChart.vue` 的 ECharts import 与初始化。注册主题时需避免重复注册（可用模块级 guard）：

```typescript
// src/components/BarChart.vue 顶部
import * as echarts from 'echarts/core'
import { BarChart as EBarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { SOLARIZED_THEME } from '@/styles/echarts-theme'

let themeRegistered = false
function ensureTheme() {
  if (!themeRegistered) {
    echarts.registerTheme('solarized', SOLARIZED_THEME)
    themeRegistered = true
  }
}

echarts.use([EBarChart, GridComponent, TooltipComponent, CanvasRenderer])
```

将所有 `echarts.init(el)` 改为 `echarts.init(el, "solarized")`，移除硬编码色值。

- [ ] **步骤 4：运行测试**

运行：`pnpm vitest run`
预期：全部通过

- [ ] **步骤 5：运行 vue-tsc**

运行：`pnpm vue-tsc --noEmit`
预期：零错误

- [ ] **步骤 6：Commit**

```bash
git add src/styles/echarts-theme.ts src/views/Stats.vue src/components/BarChart.vue
git commit -m "perf(echarts): 按需引入 + Solarized 主题化，包体预计减少 ~800KB"
```

---

### 任务 17：最终验收

- [ ] **步骤 1：运行全量测试**

运行：`pnpm vitest run`
预期：全部通过（≥ 260 测试）

- [ ] **步骤 2：运行 vue-tsc**

运行：`pnpm vue-tsc --noEmit`
预期：零错误

- [ ] **步骤 3：构建并验证包体**

运行：`pnpm tauri build`
预期：成功，包体 < 30MB，应较第 2 批减少（ECharts 按需引入）

- [ ] **步骤 4：启动应用手动验证**

运行：`pnpm tauri dev`

逐项验证：

- [ ] 所有页面视觉一致（深色 Solarized + Liquid Glass）
- [ ] 答题页无双顶栏叠加
- [ ] Numpad 拖拽不超视口，手柄 icon-only，重开按钮内联
- [ ] 题型网格两页风格统一
- [ ] 设置项无 el-dialog 居中弹窗（自定义运算复杂表单除外）
- [ ] ECharts 三张图正常渲染（雷达图/折线图/柱状图）
- [ ] focus-visible 绿色描边可见（Tab 键导航时）
- [ ] 图标按钮 aria-label 完整（用浏览器 DevTools 检查）
- [ ] muted 文字对比度 ≥ 4.5:1（用浏览器 DevTools 检查）
- [ ] reduced-motion 下闪烁改为静态边框（系统设置开启"减少动态效果"后验证）

- [ ] **步骤 5：Commit 最终验收**

```bash
git commit --allow-empty -m "chore: UI 重构第 3 批验收通过，全部完成"
```

---

## 自检

### 规格覆盖度

| 规格章节                          | 对应任务                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------- |
| 2.1 视觉方向                      | 任务 1（token 体系保留 Solarized）                                           |
| 2.2 导航架构                      | 任务 6（layout meta + App.vue）、7（sidebar）                                |
| 2.3 Numpad                        | 任务 8                                                                       |
| 2.4 TypeGrid                      | 任务 2                                                                       |
| 2.5 SegmentedControl + SettingRow | 任务 3、4                                                                    |
| 2.6 ECharts                       | 任务 16                                                                      |
| 2.7 可访问性                      | 任务 14、15、1（muted 提亮）                                                 |
| 2.8 Token 三层                    | 任务 1                                                                       |
| 3.1 第 1 批                       | 任务 1-5                                                                     |
| 3.2 第 2 批                       | 任务 6-13                                                                    |
| 3.3 第 3 批                       | 任务 14-17                                                                   |
| 4 不变项                          | 任务 8（保留 Numpad 拖拽持久化）、6（保留 sidebar）、9（保留自定义运算弹窗） |

无遗漏。

### 占位符扫描

- 任务 9 已包含完整代码，并补全了 `toggleOperator/togglePower`
- 任务 10（DataAnalysisSettings）指向"参照任务 9 模式"——这是合理的，因为两个文件结构相似，完整展开会重复数百行。但任务 10 仍明确指出了"题型网格用 TypeGrid，难度/题量/N-back/呈现方式用 SegmentedControl，保留三块结构"，工程师有足够信息执行
- 任务 12（移除 fallback）给出了具体的替换模式与 token 列表
- 任务 14 的 reduced-motion selector 已注明"需根据真实 class 名调整"，并给出确认方法（Grep 搜索）

### 类型一致性

- TypeGrid 的 `sections/Section/TypeItem` 类型在任务 2 定义，任务 9/10 引用一致
- SegmentedControl 的 `options/Option` 类型在任务 3 定义，任务 9/10/11 引用一致
- SettingRow 的 props（label/expandable/expanded）在任务 4 定义，任务 9/10 引用一致
- ECharts 的 `ECharts` 类型在任务 16 中从 `echarts/core` import，与原 `echarts.ECharts` 等价

---

## 执行交接

**计划已完成并保存到 `docs/superpowers/plans/2026-07-04-ui-refactor.md`。两种执行方式：**

**1. 子代理驱动（推荐）** - 每个任务调度一个新的子代理，任务间进行审查，快速迭代

**2. 内联执行** - 在当前会话中使用 executing-plans 执行任务，批量执行并设有检查点

**选哪种方式？**
