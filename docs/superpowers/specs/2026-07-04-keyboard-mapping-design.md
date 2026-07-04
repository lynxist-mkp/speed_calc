# 键盘映射重构设计 — 方案 A（右手小键盘区 + e.code 物理键识别）

**日期**: 2026-07-04
**状态**: 已批准（待规格审查）
**作者**: brainstorming session

## 1. 背景与动机

当前项目（speed_calc）的答案输入依赖标准键盘的横排数字键（`1 2 3 4 5 6 7 8 9 0`）。横排布局存在两个问题：

1. **手指位移大**：横排数字键位于主键盘顶部，输入时手指需离开主页键位（J/K/L），不利于快速盲打。
2. **0 与 1-9 不同行**：财务小键盘的肌肉记忆是 3×4 网格（7-8-9 / 4-5-6 / 1-2-3 / 0-.），而横排无法复用这种空间记忆。

此外，**用户使用 Norman 键盘布局**，与 QWERTY 不同。当前代码用 `e.key` 检测字符（如 `k === "1"`），在 Norman 下按物理 `1` 键产生的字符仍是 `1`（数字行不受布局影响），但其他键（如 `,` `.` `<` `>`）的字符与物理位置关系会随布局变化，导致 `e.key` 检测在 Norman 下不可靠。

## 2. 目标

- 让数字题的输入体验接近财务小键盘（3×4 网格，0 在底部）
- 复用主键盘右手区，输入时手指不离页
- **与键盘布局无关**：无论 QWERTY / Norman / Dvorak，物理键位置映射结果一致
- 保留横排数字键作为备用输入方式
- compare 题沿用物理 `,` / `.` 作小于/大于（与当前字符映射一致，但改用 `e.code`）

## 3. 非目标

- 不引入"模式切换"状态机（方案 C 已否决）
- 不改 UI 浮窗 Numpad 的鼠标交互（仍可点击）
- 不引入节拍声、输入气泡等额外反馈（方案 D 已否决）
- 不改 compare 题的 UI 布局（CompareKeypad.vue 保持不变）

## 4. 方案概述

**核心思路**：在 `handleKeydown` 中改用 `e.code` 识别物理键位置，建立一张"物理键 → 输入字符"的映射表。映射分两个模式：

- **数字题模式**（numpad + composite）：右手区物理键 UIO/JKL/M,. 映射为 789/456/123，Space→0，Slash→小数点
- **compare 题模式**：物理 `,`→小于，`.`→大于

模式由 `store.questionCategory === 'compare'` 自动切换，无需用户切换开关。

## 5. 详细映射表

### 5.1 数字题模式（numpad + composite）

**右手小键盘区（方案 A 核心）**：

| 物理键 (e.code) | QWERTY 字符 | Norman 字符 | 映射输入 |
|---|---|---|---|
| `KeyU` | u | u | `7` |
| `KeyI` | i | i | `8` |
| `KeyO` | o | o | `9` |
| `KeyJ` | j | n | `4` |
| `KeyK` | k | e | `5` |
| `KeyL` | l | i | `6` |
| `KeyM` | m | m | `1` |
| `Comma` | , | w | `2` |
| `Period` | . | v | `3` |
| `Space` | Space | Space | `0` |
| `Slash` | / | z | `.`（小数点） |

**横排数字键（备用，保留）**：

| 物理键 (e.code) | 映射输入 |
|---|---|
| `Digit1` ~ `Digit9` | `1` ~ `9` |
| `Digit0` | `0` |

> 注：数字行不受键盘布局影响，`e.code` 与 `e.key` 在数字行一致；但统一用 `e.code` 保持代码风格一致。

**小数点备用输入**：当前 `,` 和 `.` 都输入小数点。重构后：
- `,`/`.` 物理键在数字题模式下映射为 `2`/`3`，不再作小数点
- 小数点改为 `Slash`（物理 `/` 键）
- 保留 `NumpadDecimal`（外接小键盘的 `.` 键）作兼容

### 5.2 compare 题模式

| 物理键 (e.code) | 字符 (e.key, 兼容) | 映射 |
|---|---|---|
| `Comma` | `,` `，` | 小于 `<` |
| `Period` | `.` `。` | 大于 `>` |
| `Enter` | Enter | 提交 |
| `Escape` | Esc | 重开 |

> 注：compare 题同时保留 `e.key` 的 `<` `>` `《` `》` 字符检测作为兼容（这些字符键位置不固定，但用户主动按 `<` `>` 字符键时仍生效）。

### 5.3 功能键（所有模式通用）

| 物理键 (e.code) | 功能 |
|---|---|
| `Backspace` | 退格 |
| `Enter` | 提交 |
| `Escape` | 重开 |
| `Delete` | 清空 |
| `Minus` | 切换正负号（仅 numpad） |

> `Minus` 物理键在 QWERTY 和 Norman 下都产生 `-`，但统一用 `e.code`。

## 6. 架构设计

### 6.1 映射表模块

新建 `src/utils/keymap.ts`，导出纯函数和映射常量：

```typescript
// 物理键 → 数字题输入字符
export const NUMPAD_KEYMAP: Record<string, string> = {
  KeyU: "7", KeyI: "8", KeyO: "9",
  KeyJ: "4", KeyK: "5", KeyL: "6",
  KeyM: "1", Comma: "2", Period: "3",
  Space: "0", Slash: ".",
  // 横排备用
  Digit1: "1", Digit2: "2", Digit3: "3", Digit4: "4", Digit5: "5",
  Digit6: "6", Digit7: "7", Digit8: "8", Digit9: "9", Digit0: "0",
  // 小数点兼容
  NumpadDecimal: ".",
};

// compare 题物理键映射
export const COMPARE_KEYMAP: Record<string, ">" | "<"> = {
  Comma: "<",
  Period: ">",
};

// 功能键
export const FUNCTION_KEYS = {
  Backspace: "backspace",
  Enter: "submit",
  Escape: "restart",
  Delete: "clear",
  Minus: "toggle-sign",
} as const;

// 模式判定与映射查询
export function resolveNumpadKey(e: KeyboardEvent): {
  type: "digit" | "dot" | "function" | "ignore";
  payload?: string;
};
export function resolveCompareKey(e: KeyboardEvent): {
  type: "select" | "submit" | "restart" | "ignore";
  payload?: ">" | "<";
};
```

**职责**：
- 集中管理所有键位映射，便于测试和维护
- 提供纯函数查询接口，调用方只需传入 `KeyboardEvent`
- 与 Vue 组件解耦，可独立单元测试

### 6.2 调用方改造

**PracticeSession.vue**：

```typescript
function handleKeydown(e: KeyboardEvent) {
  if (store.phase !== "running") return;
  
  // 防止 Numpad 按钮聚焦时 Enter/Escape 双触发
  if ((e.code === "Enter" || e.code === "Escape") 
      && e.target instanceof HTMLButtonElement) return;
  
  if (store.questionCategory === "compare") {
    const r = resolveCompareKey(e);
    if (r.type === "select") { e.preventDefault(); store.selectCompare(r.payload); }
    else if (r.type === "submit") { e.preventDefault(); void onSubmit(); }
    else if (r.type === "restart") { e.preventDefault(); void onRestart(); }
    return;
  }
  
  // 数字题模式
  const r = resolveNumpadKey(e);
  if (r.type === "digit") { e.preventDefault(); store.inputChar(r.payload); }
  else if (r.type === "dot") { e.preventDefault(); store.inputChar("."); }
  else if (r.type === "function") {
    e.preventDefault();
    if (r.payload === "backspace") store.backspace();
    else if (r.payload === "submit") void onSubmit();
    else if (r.payload === "restart") void onRestart();
    else if (r.payload === "clear") store.clearAnswer();
    else if (r.payload === "toggle-sign") store.toggleSign();
  }
}
```

**CompositeSession.vue**：同样改用 `resolveNumpadKey`，但无需 toggle-sign（composite 无负数）。

### 6.3 Numpad.vue 浮窗的视觉提示（可选增强）

在 Numpad.vue 的按键单元格上叠加显示对应的物理键名（如 `7 (U)`），帮助用户记忆映射。此为可选增强，非必需。

## 7. 兼容性处理

### 7.1 旧映射的废弃

当前 `PracticeSession.vue` 中的以下检测将被移除：

```typescript
// 旧（基于 e.key，Norman 下不可靠）
if (k === "<" || k === "《" || k === "1" || k === "," || k === "，") ...
if (/^[0-9]$/.test(k)) ...
if (k === "." || k === "," || k === "，") ...
```

**保留**：
- compare 题的 `<` `>` `《` `》` 字符检测（用户主动按这些字符键时仍生效，作为兼容输入方式）
- `NumpadDecimal` 物理键（外接小键盘用户）

### 7.2 Enter/Escape 双触发防护

当前代码：
```typescript
if ((k === "Enter" || k === "Escape") && e.target instanceof HTMLButtonElement) return;
```

改为：
```typescript
if ((e.code === "Enter" || e.code === "Escape") 
    && e.target instanceof HTMLButtonElement) return;
```

## 8. 测试策略

### 8.1 单元测试（keymap.ts）

新建 `src/utils/keymap.test.ts`：

- **数字题模式**：每个 `e.code` 映射到正确字符
- **compare 题模式**：`Comma`→`<`，`Period`→`>`
- **功能键**：Backspace/Enter/Escape/Delete/Minus 正确分发
- **未知键**：返回 `type: "ignore"`
- **Norman 兼容性**：模拟 Norman 下 `KeyJ` 产生 `n` 字符，但 `e.code` 仍为 `KeyJ`，映射仍为 `4`

测试用例构造方式：用 `new KeyboardEvent("keydown", { code: "KeyJ", key: "n" })` 模拟 Norman 输入。

### 8.2 集成测试（PracticeSession.vue）

更新现有 `practice.test.ts` 中涉及键盘的用例：
- 数字题：模拟 `e.code: "KeyK"` 应输入 `5`
- compare 题：模拟 `e.code: "Comma"` 应选择 `<`

### 8.3 手工验收

- QWERTY 布局下：UIO/JKL/M,. 输入 789/456/123，Space→0，Slash→小数点
- Norman 布局下：同样物理键位置产生同样映射
- 横排数字键仍可输入
- compare 题 `,`/`.` 仍作小于/大于
- 外接小键盘（如有）的 `.` 仍作小数点

## 9. 影响范围

**新增文件**：
- `src/utils/keymap.ts`
- `src/utils/keymap.test.ts`

**修改文件**：
- `src/views/PracticeSession.vue` — `handleKeydown` 改用 `resolveNumpadKey` / `resolveCompareKey`
- `src/views/CompositeSession.vue` — `handleKeydown` 改用 `resolveNumpadKey`

**不改文件**：
- `src/components/Numpad.vue` — 浮窗点击交互不变（仍通过 emit 触发，不经过键盘事件）
- `src/components/CompareKeypad.vue` — 同上
- `src/stores/practice.ts` — store 接口不变（`inputChar` / `selectCompare` 等签名不变）

## 10. 风险与权衡

| 风险 | 缓解措施 |
|---|---|
| 用户已习惯横排输入，方案 A 增加学习成本 | 保留横排作为备用，不强制使用方案 A |
| Norman 下 `,` 产生 `w` 字符，可能引起混淆 | 用 `e.code` 完全规避字符差异 |
| `Space` 映射为 `0` 可能与 UI 焦点冲突（按钮激活） | 在 `handleKeydown` 中检测 `e.target`，若为按钮则跳过 Space→0 映射 |
| compare 题保留 `e.key` 字符检测（`<` `>`）与 `e.code` 双轨 | 文档明确：`e.code` 为主，`e.key` 字符为兼容补丁 |

## 11. 未来扩展

- 如需支持左手方案 B，只需在 `keymap.ts` 增加 `LEFT_HANDED_KEYMAP` 并通过设置切换
- 如需模式切换（方案 C），可在 `keymap.ts` 之上加状态机层，不影响核心映射逻辑
- 如需自定义映射，可在设置页暴露 `keymap.ts` 的映射表编辑接口

## 12. 验收标准

- [ ] `src/utils/keymap.ts` 实现，所有映射查询函数为纯函数
- [ ] `src/utils/keymap.test.ts` 覆盖所有映射分支，包括 Norman 模拟
- [ ] `PracticeSession.vue` 和 `CompositeSession.vue` 改用 `resolveNumpadKey` / `resolveCompareKey`
- [ ] 所有现有 Vitest 测试通过
- [ ] `vue-tsc` 无类型错误
- [ ] 手工验收：QWERTY 和 Norman 布局下方案 A 映射一致
