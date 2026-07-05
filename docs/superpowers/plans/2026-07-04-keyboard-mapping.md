# 键盘映射重构实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将答案输入从横排数字键改为右手小键盘区映射（UIO/JKL/M,. → 789/456/123），用 `e.code` 识别物理键位置确保 Norman/QWERTY 通用。

**架构：** 新建 `src/utils/keymap.ts` 集中管理键位映射，导出纯函数 `resolveNumpadKey` / `resolveCompareKey` 供 `PracticeSession.vue` 和 `CompositeSession.vue` 调用。模式由 `store.questionCategory === 'compare'` 自动切换。

**技术栈：** Vue 3 + TypeScript + Vitest + jsdom

**规格文档：** `docs/superpowers/specs/2026-07-04-keyboard-mapping-design.md`

---

## 文件结构

**新增文件：**

- `src/utils/keymap.ts` — 键位映射常量 + 查询纯函数
- `src/utils/__tests__/keymap.test.ts` — keymap.ts 的单元测试

**修改文件：**

- `src/views/PracticeSession.vue` — `handleKeydown` 改用 resolve 函数
- `src/views/CompositeSession.vue` — `handleKeydown` 改用 resolve 函数

**不改文件：**

- `src/components/Numpad.vue` / `src/components/CompareKeypad.vue` — 浮窗点击交互不变
- `src/stores/practice.ts` — store 接口不变

---

## 任务 1：创建 keymap.ts 模块（TDD）

**文件：**

- 创建：`src/utils/keymap.ts`
- 测试：`src/utils/__tests__/keymap.test.ts`

- [ ] **步骤 1：编写数字题模式映射的失败测试**

创建 `src/utils/__tests__/keymap.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { resolveNumpadKey, resolveCompareKey } from '@/utils/keymap'

describe('resolveNumpadKey - 数字题模式', () => {
  // 右手小键盘区映射（方案 A 核心）
  it('KeyU → 7', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyU' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '7' })
  })

  it('KeyI → 8', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyI' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '8' })
  })

  it('KeyO → 9', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyO' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '9' })
  })

  it('KeyJ → 4', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyJ' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '4' })
  })

  it('KeyK → 5', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyK' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '5' })
  })

  it('KeyL → 6', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyL' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '6' })
  })

  it('KeyM → 1', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyM' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '1' })
  })

  it('Comma → 2', () => {
    const e = new KeyboardEvent('keydown', { code: 'Comma' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '2' })
  })

  it('Period → 3', () => {
    const e = new KeyboardEvent('keydown', { code: 'Period' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '3' })
  })

  it('Space → 0', () => {
    const e = new KeyboardEvent('keydown', { code: 'Space' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '0' })
  })

  it('Slash → .（小数点）', () => {
    const e = new KeyboardEvent('keydown', { code: 'Slash' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '.' })
  })

  // 横排数字键（备用）
  it('Digit1 → 1', () => {
    const e = new KeyboardEvent('keydown', { code: 'Digit1' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '1' })
  })

  it('Digit0 → 0', () => {
    const e = new KeyboardEvent('keydown', { code: 'Digit0' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '0' })
  })

  it('Digit9 → 9', () => {
    const e = new KeyboardEvent('keydown', { code: 'Digit9' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '9' })
  })

  // 小数点兼容（外接小键盘）
  it('NumpadDecimal → .', () => {
    const e = new KeyboardEvent('keydown', { code: 'NumpadDecimal' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '.' })
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm test src/utils/__tests__/keymap.test.ts`
预期：FAIL，报错 "Cannot find module '@/utils/keymap'"

- [ ] **步骤 3：编写 resolveNumpadKey 的 input 分支实现**

创建 `src/utils/keymap.ts`：

```typescript
// 物理键 → 数字题输入字符（数字或小数点）
export const NUMPAD_KEYMAP: Record<string, string> = {
  // 右手小键盘区（方案 A 核心）
  KeyU: '7',
  KeyI: '8',
  KeyO: '9',
  KeyJ: '4',
  KeyK: '5',
  KeyL: '6',
  KeyM: '1',
  Comma: '2',
  Period: '3',
  Space: '0',
  Slash: '.',
  // 横排数字键（备用）
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Digit4: '4',
  Digit5: '5',
  Digit6: '6',
  Digit7: '7',
  Digit8: '8',
  Digit9: '9',
  Digit0: '0',
  // 小数点兼容（外接小键盘）
  NumpadDecimal: '.',
}

// compare 题物理键映射
export const COMPARE_KEYMAP: Record<string, '>' | '<'> = {
  Comma: '<',
  Period: '>',
}

// 功能键 → 功能名
export const FUNCTION_KEYS: Record<string, string> = {
  Backspace: 'backspace',
  Enter: 'submit',
  Escape: 'restart',
  Delete: 'clear',
  Minus: 'toggle-sign',
}

export type NumpadResolveResult =
  { type: 'input'; payload: string } | { type: 'function'; payload: string } | { type: 'ignore' }

export type CompareResolveResult =
  | { type: 'select'; payload: '>' | '<' }
  | { type: 'submit' }
  | { type: 'restart' }
  | { type: 'ignore' }

/**
 * 数字题模式按键解析。
 * - type="input"：payload 为待输入字符（数字或小数点），调用 store.inputChar(payload)
 * - type="function"：payload 为功能名（backspace/submit/restart/clear/toggle-sign）
 * - type="ignore"：未识别的键，调用方应跳过
 */
export function resolveNumpadKey(e: KeyboardEvent): NumpadResolveResult {
  const code = e.code
  if (NUMPAD_KEYMAP[code]) {
    return { type: 'input', payload: NUMPAD_KEYMAP[code] }
  }
  if (FUNCTION_KEYS[code]) {
    return { type: 'function', payload: FUNCTION_KEYS[code] }
  }
  return { type: 'ignore' }
}

/**
 * compare 题模式按键解析。
 * - type="select"：payload 为 ">" 或 "<"，调用 store.selectCompare(payload)
 * - type="submit"：调用 onSubmit
 * - type="restart"：调用 onRestart
 * - type="ignore"：未识别的键
 *
 * 注：同时保留 e.key 字符检测（< > 《 》）作为兼容，因为这些字符键的物理位置随布局变化。
 */
export function resolveCompareKey(e: KeyboardEvent): CompareResolveResult {
  const code = e.code
  if (COMPARE_KEYMAP[code]) {
    return { type: 'select', payload: COMPARE_KEYMAP[code] }
  }
  // 兼容：e.key 字符检测（用户主动按 < > 《 》 字符键）
  const k = e.key
  if (k === '<' || k === '>' || k === '《' || k === '》') {
    return { type: 'select', payload: k === '<' || k === '《' ? '<' : '>' }
  }
  if (code === 'Enter') return { type: 'submit' }
  if (code === 'Escape') return { type: 'restart' }
  return { type: 'ignore' }
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm test src/utils/__tests__/keymap.test.ts`
预期：PASS（15 个用例全部通过）

- [ ] **步骤 5：补充功能键测试**

在 `src/utils/__tests__/keymap.test.ts` 末尾追加：

```typescript
describe('resolveNumpadKey - 功能键', () => {
  it('Backspace → function/backspace', () => {
    const e = new KeyboardEvent('keydown', { code: 'Backspace' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'function', payload: 'backspace' })
  })

  it('Enter → function/submit', () => {
    const e = new KeyboardEvent('keydown', { code: 'Enter' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'function', payload: 'submit' })
  })

  it('Escape → function/restart', () => {
    const e = new KeyboardEvent('keydown', { code: 'Escape' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'function', payload: 'restart' })
  })

  it('Delete → function/clear', () => {
    const e = new KeyboardEvent('keydown', { code: 'Delete' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'function', payload: 'clear' })
  })

  it('Minus → function/toggle-sign', () => {
    const e = new KeyboardEvent('keydown', { code: 'Minus' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'function', payload: 'toggle-sign' })
  })
})

describe('resolveNumpadKey - 未知键', () => {
  it('KeyA → ignore', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyA' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'ignore' })
  })

  it('Tab → ignore', () => {
    const e = new KeyboardEvent('keydown', { code: 'Tab' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'ignore' })
  })
})
```

- [ ] **步骤 6：运行测试验证通过**

运行：`pnpm test src/utils/__tests__/keymap.test.ts`
预期：PASS（22 个用例全部通过）

- [ ] **步骤 7：补充 compare 题测试**

在 `src/utils/__tests__/keymap.test.ts` 末尾追加：

```typescript
describe('resolveCompareKey', () => {
  it('Comma → select/<', () => {
    const e = new KeyboardEvent('keydown', { code: 'Comma' })
    expect(resolveCompareKey(e)).toEqual({ type: 'select', payload: '<' })
  })

  it('Period → select/>', () => {
    const e = new KeyboardEvent('keydown', { code: 'Period' })
    expect(resolveCompareKey(e)).toEqual({ type: 'select', payload: '>' })
  })

  it('Enter → submit', () => {
    const e = new KeyboardEvent('keydown', { code: 'Enter' })
    expect(resolveCompareKey(e)).toEqual({ type: 'submit' })
  })

  it('Escape → restart', () => {
    const e = new KeyboardEvent('keydown', { code: 'Escape' })
    expect(resolveCompareKey(e)).toEqual({ type: 'restart' })
  })

  // 兼容：e.key 字符检测
  it("e.key='<' → select/<", () => {
    const e = new KeyboardEvent('keydown', { code: '', key: '<' })
    expect(resolveCompareKey(e)).toEqual({ type: 'select', payload: '<' })
  })

  it("e.key='>' → select/>", () => {
    const e = new KeyboardEvent('keydown', { code: '', key: '>' })
    expect(resolveCompareKey(e)).toEqual({ type: 'select', payload: '>' })
  })

  it("e.key='《' → select/<", () => {
    const e = new KeyboardEvent('keydown', { code: '', key: '《' })
    expect(resolveCompareKey(e)).toEqual({ type: 'select', payload: '<' })
  })

  it("e.key='》' → select/>", () => {
    const e = new KeyboardEvent('keydown', { code: '', key: '》' })
    expect(resolveCompareKey(e)).toEqual({ type: 'select', payload: '>' })
  })

  it('KeyA → ignore', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyA' })
    expect(resolveCompareKey(e)).toEqual({ type: 'ignore' })
  })
})
```

- [ ] **步骤 8：运行测试验证通过**

运行：`pnpm test src/utils/__tests__/keymap.test.ts`
预期：PASS（31 个用例全部通过）

- [ ] **步骤 9：补充 Norman 兼容性测试**

在 `src/utils/__tests__/keymap.test.ts` 末尾追加：

```typescript
describe('Norman 布局兼容性', () => {
  // Norman 布局下，物理键位置不变（e.code 不变），但产生的字符（e.key）不同。
  // 映射应只看 e.code，不看 e.key。
  it("物理 KeyJ 位置（Norman 产生 'n' 字符）→ 4", () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyJ', key: 'n' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '4' })
  })

  it("物理 KeyK 位置（Norman 产生 'e' 字符）→ 5", () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyK', key: 'e' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '5' })
  })

  it("物理 KeyL 位置（Norman 产生 'i' 字符）→ 6", () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyL', key: 'i' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '6' })
  })

  it("物理 Comma 位置（Norman 产生 'w' 字符）→ 2", () => {
    const e = new KeyboardEvent('keydown', { code: 'Comma', key: 'w' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '2' })
  })

  it("物理 Period 位置（Norman 产生 'v' 字符）→ 3", () => {
    const e = new KeyboardEvent('keydown', { code: 'Period', key: 'v' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '3' })
  })

  it("物理 Slash 位置（Norman 产生 'z' 字符）→ .", () => {
    const e = new KeyboardEvent('keydown', { code: 'Slash', key: 'z' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '.' })
  })

  // compare 题同样只看 e.code
  it("compare 题物理 Comma 位置（Norman 产生 'w'）→ select/<", () => {
    const e = new KeyboardEvent('keydown', { code: 'Comma', key: 'w' })
    expect(resolveCompareKey(e)).toEqual({ type: 'select', payload: '<' })
  })
})
```

- [ ] **步骤 10：运行测试验证通过**

运行：`pnpm test src/utils/__tests__/keymap.test.ts`
预期：PASS（38 个用例全部通过）

- [ ] **步骤 11：Commit**

```bash
git add src/utils/keymap.ts src/utils/__tests__/keymap.test.ts
git commit -m "feat: 新增 keymap 模块（方案 A 右手小键盘映射 + e.code 物理键识别）

- NUMPAD_KEYMAP: UIO/JKL/M,. → 789/456/123, Space→0, Slash→小数点
- COMPARE_KEYMAP: Comma→<, Period→>
- FUNCTION_KEYS: Backspace/Enter/Escape/Delete/Minus
- resolveNumpadKey/resolveCompareKey 纯函数，与键盘布局无关"
```

---

## 任务 2：重构 PracticeSession.vue 的 handleKeydown

**文件：**

- 修改：`src/views/PracticeSession.vue:36-82`（handleKeydown 函数）

- [ ] **步骤 1：在 PracticeSession.vue 顶部添加 keymap 导入**

在 `src/views/PracticeSession.vue` 的 `<script setup>` 块中，找到现有的 import 区块（第 1-12 行），在最后一个 import 之后添加：

```typescript
import { resolveNumpadKey, resolveCompareKey } from '@/utils/keymap'
```

- [ ] **步骤 2：替换 handleKeydown 函数体**

将 `src/views/PracticeSession.vue` 第 36-82 行的整个 `handleKeydown` 函数替换为：

```typescript
function handleKeydown(e: KeyboardEvent) {
  if (store.phase !== 'running') return

  // 防止 Numpad 按钮聚焦时 Enter/Escape 双触发，以及 Space 在按钮上触发点击
  if (
    (e.code === 'Enter' || e.code === 'Escape' || e.code === 'Space') &&
    e.target instanceof HTMLButtonElement
  ) {
    return
  }

  if (store.questionCategory === 'compare') {
    const r = resolveCompareKey(e)
    if (r.type === 'select') {
      e.preventDefault()
      store.selectCompare(r.payload)
    } else if (r.type === 'submit') {
      e.preventDefault()
      void onSubmit()
    } else if (r.type === 'restart') {
      e.preventDefault()
      void onRestart()
    }
    return
  }

  // 数字题模式
  const r = resolveNumpadKey(e)
  if (r.type === 'input') {
    e.preventDefault()
    store.inputChar(r.payload)
  } else if (r.type === 'function') {
    e.preventDefault()
    if (r.payload === 'backspace') store.backspace()
    else if (r.payload === 'submit') void onSubmit()
    else if (r.payload === 'restart') void onRestart()
    else if (r.payload === 'clear') store.clearAnswer()
    else if (r.payload === 'toggle-sign') store.toggleSign()
  }
}
```

- [ ] **步骤 3：运行现有测试验证未破坏**

运行：`pnpm test`
预期：PASS（所有现有测试通过，新增的 keymap.test.ts 也通过）

- [ ] **步骤 4：运行 vue-tsc 类型检查**

运行：`pnpm exec vue-tsc --noEmit`
预期：无错误输出

- [ ] **步骤 5：Commit**

```bash
git add src/views/PracticeSession.vue
git commit -m "refactor: PracticeSession handleKeydown 改用 keymap 模块

- 废弃 e.key 字符检测，改用 e.code 物理键识别（Norman 兼容）
- compare 题保留 e.key 的 < > 《 》 兼容检测
- 补充 Space 在按钮聚焦时跳过映射的防护"
```

---

## 任务 3：重构 CompositeSession.vue 的 handleKeydown

**文件：**

- 修改：`src/views/CompositeSession.vue:154-176`（handleKeydown 函数）

- [ ] **步骤 1：在 CompositeSession.vue 顶部添加 keymap 导入**

在 `src/views/CompositeSession.vue` 的 `<script setup>` 块中，找到现有的 import 区块（第 1-17 行），在最后一个 import 之后添加：

```typescript
import { resolveNumpadKey } from '@/utils/keymap'
```

- [ ] **步骤 2：替换 handleKeydown 函数体**

将 `src/views/CompositeSession.vue` 第 154-176 行的整个 `handleKeydown` 函数替换为：

```typescript
function handleKeydown(e: KeyboardEvent) {
  // 防止 Numpad 按钮聚焦时 Enter/Escape 双触发，以及 Space 在按钮上触发点击
  if (
    (e.code === 'Enter' || e.code === 'Escape' || e.code === 'Space') &&
    e.target instanceof HTMLButtonElement
  ) {
    return
  }

  const r = resolveNumpadKey(e)
  if (r.type === 'input') {
    e.preventDefault()
    onInput(r.payload)
  } else if (r.type === 'function') {
    e.preventDefault()
    if (r.payload === 'backspace') onBackspace()
    else if (r.payload === 'submit') onSubmit()
    else if (r.payload === 'clear') onClear()
    // composite 无 toggle-sign / restart（composite 用 onBack 返回，不绑定 Esc）
  }
}
```

> 注：composite 模式不处理 `restart`（CompositeSession 没有 onRestart 函数，只有 onBack）和 `toggle-sign`（composite 无负数）。`Escape` 键在 resolveNumpadKey 中会返回 `{ type: "function", payload: "restart" }`，但此处不处理，等同于忽略——这是预期行为，因为 composite 模式没有重开功能。

- [ ] **步骤 3：运行现有测试验证未破坏**

运行：`pnpm test`
预期：PASS（所有测试通过）

- [ ] **步骤 4：运行 vue-tsc 类型检查**

运行：`pnpm exec vue-tsc --noEmit`
预期：无错误输出

- [ ] **步骤 5：Commit**

```bash
git add src/views/CompositeSession.vue
git commit -m "refactor: CompositeSession handleKeydown 改用 keymap 模块

- 废弃 e.key 字符检测，改用 e.code 物理键识别（Norman 兼容）
- composite 模式不处理 restart/toggle-sign"
```

---

## 任务 4：全量验证与构建

**文件：** 无修改

- [ ] **步骤 1：运行完整测试套件**

运行：`pnpm test`
预期：所有测试通过（包括新增的 38 个 keymap.test.ts 用例和现有 270 个用例）

- [ ] **步骤 2：运行 vue-tsc 类型检查**

运行：`pnpm exec vue-tsc --noEmit`
预期：无错误输出

- [ ] **步骤 3：构建应用验证打包**

运行：`pnpm tauri build`
预期：构建成功，应用包大小 < 30 MB

- [ ] **步骤 4：手工验收清单**

启动应用，逐项验证：

- [ ] 基础计算（numpad）模式：按物理 U/I/O 键输入 7/8/9，J/K/L 输入 4/5/6，M/,/. 输入 1/2/3
- [ ] 基础计算：按 Space 输入 0，按 Slash（/）输入小数点
- [ ] 基础计算：横排数字键 1-9, 0 仍可输入
- [ ] 基础计算：Backspace 退格，Enter 提交，Escape 重开，Delete 清空，Minus 切换正负号
- [ ] 资料分析（numpad）模式：同基础计算
- [ ] compare 题：按物理 ,（Comma）选择小于，按物理 .（Period）选择大于
- [ ] compare 题：按 < > 《 》 字符键仍可选小于/大于（兼容）
- [ ] compare 题：Enter 提交，Escape 重开
- [ ] 一表通算（composite）模式：按物理 UIO/JKL/M,. 输入 789/456/123
- [ ] composite：Space 输入 0，Slash 输入小数点
- [ ] Norman 布局下（若可切换）：同样物理键位置产生同样映射
- [ ] 浮窗 Numpad 鼠标点击仍正常工作

- [ ] **步骤 5：最终 Commit（如有构建产物变更）**

```bash
git add -A
git status  # 确认无意外文件
# 若有变更再 commit，否则跳过
```

---

## 自检

**1. 规格覆盖度：**

- §5.1 数字题模式映射 → 任务 1 步骤 1-4
- §5.2 compare 题模式映射 → 任务 1 步骤 7-8
- §5.3 功能键 → 任务 1 步骤 5-6
- §6.1 keymap.ts 模块 → 任务 1
- §6.2 PracticeSession.vue 改造 → 任务 2
- §6.2 CompositeSession.vue 改造 → 任务 3
- §6.3 Numpad 视觉提示 → 规格§6.3 已明确不在本次范围 ✓
- §7.1 旧映射废弃 → 任务 2/3 替换 handleKeydown 时自动废弃
- §7.2 Enter/Escape 双触发防护 → 任务 2/3 新代码包含 Space 防护
- §8.1 单元测试 → 任务 1 步骤 1-10
- §8.2 现有测试 → 任务 2/3 步骤 3 运行完整测试
- §8.3 手工验收 → 任务 4 步骤 4
- §12 验收标准 → 任务 4 全部覆盖

**2. 占位符扫描：** 无 TODO/待定/类似任务 N 等占位符。每个步骤都有完整代码。

**3. 类型一致性：**

- `NumpadResolveResult` 在任务 1 步骤 3 定义，任务 2/3 使用 `r.type === "input"` / `r.type === "function"` 与定义一致
- `CompareResolveResult` 在任务 1 步骤 3 定义，任务 2 使用 `r.type === "select"` / `"submit"` / `"restart"` 与定义一致
- `resolveNumpadKey` / `resolveCompareKey` 函数名在所有任务中一致
- store 方法名 `inputChar` / `selectCompare` / `backspace` / `clearAnswer` / `toggleSign` 与现有代码一致

无遗漏，计划完整。
