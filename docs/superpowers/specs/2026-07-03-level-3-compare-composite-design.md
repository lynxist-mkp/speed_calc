# Level 3 设计规格：比较题 + 一表通算

> **面向 AI 代理的工作者：** 本规格说明 L3（比较题 + 一表通算）的完整设计。实现时遵循 superpowers:writing-plans 创建计划，superpowers:subagent-driven-development 逐任务实现。

**目标：** 打通 L3 两类题型的"出题 → 答题 → 判分 → 计时 → 入库"闭环。比较题复用现有 PracticeSession 流程（模式切换），一表通算独立 CompositeSession（单题循环模式）。

**架构：** 方案 A（混合）— 比较题复用 PracticeSession + store（加 compare 模式分支）；一表通算独立 CompositeSession.vue + 组件内状态管理（走 db 入库但不走 store）。

**技术栈：** Tauri 2 + Vue 3.5 + TS + Vite 6 + Pinia + Vue Router 4 + Element Plus 2.8 + tauri-plugin-sql 2 + KaTeX 0.16 + vitest + @vue/test-utils + jsdom

**前置：** L2 已合并到 main（资料分析 9 题型填空题闭环 + KaTeX + 容差判分 + 105 测试通过）。在专用 worktree `feature/level-3` 中执行。

---

## 1. 文件结构与边界

### 新增文件

| 文件                                                 | 职责                                                 |
| ---------------------------------------------------- | ---------------------------------------------------- |
| `src/generators/compareAnalysis.ts`                  | 3 类比较题生成器（纯函数 + 两类难度模式）            |
| `src/generators/__tests__/compareAnalysis.test.ts`   | 比较题生成器单测                                     |
| `src/components/CompareQuestion.vue`                 | 比较题题目区（左右并排算式 + 绿色 `?`）              |
| `src/components/CompareKeypad.vue`                   | 比较题 4 大按钮（大于绿/小于橙/重开薄荷/确定灰）     |
| `src/components/__tests__/CompareQuestion.test.ts`   | CompareQuestion 组件测试                             |
| `src/components/__tests__/CompareKeypad.test.ts`     | CompareKeypad 组件测试                               |
| `src/generators/compositeAnalysis.ts`                | 一表通算数据生成器（已知数据 + 9 项答案计算）        |
| `src/generators/__tests__/compositeAnalysis.test.ts` | 一表通算生成器单测                                   |
| `src/views/CompositeSession.vue`                     | 一表通算答题页（独立交互：刷新数据/9填空/提交/随机） |

### 修改文件

| 文件                                                            | 改动                                                                                                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/stores/practice.ts`                                        | `questionCategory` 计算属性 + `compareChoice` ref + `selectCompare` + submit compare 分支                                             |
| `src/views/PracticeSession.vue`                                 | 按 `questionCategory` 切换题目区（QuestionDisplay vs CompareQuestion）+ 输入区（Numpad vs CompareKeypad）+ handleKeydown compare 分支 |
| `src/views/DataAnalysisSettings.vue`                            | 加 el-tabs（填空题/比较题）+ 一表通算独立区块按钮                                                                                     |
| `src/views/PracticeResult.vue`                                  | 结算页题目列对比较题用 KaTeX 渲染（已用 Katex，答案列显示 `>`/`<`）                                                                   |
| `src/router/index.ts`                                           | 新增 `/practice/composite` 路由                                                                                                       |
| `src-tauri/migrations/0004_add_compare_composite_standards.sql` | 比较题 3 类 + 一表通算时间标准种子                                                                                                    |
| `src-tauri/src/lib.rs`                                          | 注册 migration 0004                                                                                                                   |

### 边界原则

- **比较题**生成器纯函数无副作用可单测；CompareQuestion 纯展示；CompareKeypad 纯交互；复用 store 的 init/submit 顺序答题流程
- **一表通算**生成器纯函数（输入随机种子→输出已知数据 + 9 项答案）；CompositeSession 独立管理状态（不走 store 的 init/submit），但走 db 入库（复用 insertSession/insertRecord）
- L1/L2 文件改动最小化（PracticeSession 只加模式切换分支，不改现有 Numpad 逻辑）

---

## 2. 比较题生成器与难度模式

### 2.1 三类比较题

| 题型 type        | label      | 左算式       | 右算式       | 实际计算 |
| ---------------- | ---------- | ------------ | ------------ | -------- |
| `compare_growth` | 增量比大小 | `A1 × r1%`   | `A2 × r2%`   | A·r      |
| `compare_base`   | 基期比大小 | `A1/(1+r1%)` | `A2/(1+r2%)` | A/(1+r)  |
| `compare_frac`   | 分数比大小 | `a1/b1`      | `a2/b2`      | a/b      |

### 2.2 接口设计

```typescript
// src/generators/compareAnalysis.ts
export type CompareType = 'compare_growth' | 'compare_base' | 'compare_frac'

export interface CompareQuestion {
  type: CompareType
  display: {
    leftTex: string // KaTeX tex，如 "\\frac{482}{252} \\times 25.2\\%"
    rightTex: string
  }
  leftValue: number // 用于判分（左实际值）
  rightValue: number // 用于判分（右实际值）
  answer: '>' | '<' // 真值：leftValue > rightValue ? ">" : "<"
  context?: string // 上下文（如现期/增长率数据）
  hint?: string
  pattern: 'A' | 'B' // 难度模式标记（统计/调试用，不影响判分）
}

export function generateCompareQuestion(type: CompareType, count: number): CompareQuestion[]
```

### 2.3 两类难度模式（3 类题通用）

**模式 A：相近难分**

- 两算式的"分母层"数值相近（差 < 10%）
- 实际值也很接近（差 1%~5%），需算到小数位才能判断
- 例（compare_frac）：`482/252 ? 503/265` → 1.913 vs 1.896（分母 252 vs 265 差 5%，值差 0.9%）
- 例（compare_base）：`909/1.261 ? 1046/1.315` → 721 vs 795（分母 1.261 vs 1.315 差 4%，值差 9%）
- 例（compare_growth）：`482×25.2% ? 530×24.8%` → 121 vs 131（A 482 vs 530 差 9%，值差 8%）

**模式 B：整数倍率**

- 两算式的"分母层"呈整数倍关系（2x 或 3x）
- 实际值接近，需通分心算
- 例（compare_frac）：`300/100 ? 590/200` → 3.0 vs 2.95（分母 2x 倍率，值差 1.7%）
- 例（compare_base）：`1000/1.10 ? 2000/1.20` → 909 vs 1667（现期 2x 倍率，需细算）
- 例（compare_growth）：`500×10% ? 1000×5.2%` → 50 vs 52（A 2x 倍率，值差 4%）

> **注**：compare_base 的"分母层"是 (1+r)，r 范围窄（5%~30%），倍率模式改用"现期值整数倍率"（currentA 与 currentB 呈 2x/3x 关系），调整 r 使实际值接近。compare_growth 同理，A1 与 A2 呈倍率关系。

### 2.4 生成策略

每次出题随机选模式 A 或 B（各 50% 概率），按模式约束生成参数：

- **模式 A**：分母层相近（差 <10%），保证实际值差 1%~5%（重试直至落入区间，最多 50 次）
- **模式 B**：分母层整数倍（2x 或 3x 随机），调整另一个参数使实际值差 1%~5%

### 2.5 参数范围

- **compare_growth**：A1/A2 ∈ [100, 999]，r1/r2 ∈ [5%, 30%]
- **compare_base**：A1/A2 ∈ [500, 2000]，r1/r2 ∈ [5%, 30%]
- **compare_frac**：a1/a2/b1/b2 ∈ [100, 999]

### 2.6 判分

- 用户选择 `">"` 或 `"<"` → 确定 → `userChoice === q.answer` 即正确
- 精确判分（无容差，二选一）
- 生成时强制 `Math.abs(leftValue - rightValue) > 0`（避免等号情况，因原版只有大于/小于两选项）

### 2.7 display tex 格式

- compare_growth：`482 \times 25.2\%`（按截图 #8，不用分数形式）
- compare_base：`\frac{909}{1.261}`（按截图 #9，真分数）
- compare_frac：`\frac{749}{732}`（按截图 #14，真分数）

### 2.8 答案分布平衡

- 生成器内部统计：连续生成时若连续 3 题答案相同，强制反转（交换左右算式）
- 保证 100 题样本中 `">"` 和 `"<"` 各占比 40%~60%

---

## 3. 一表通算生成器与数据结构

### 3.1 已知数据（4 项，刷新数据生成）

| 字段       | 含义      | 范围                                        |
| ---------- | --------- | ------------------------------------------- |
| `currentA` | 现期 A    | [100, 999]                                  |
| `currentB` | 现期 B    | [100, 999]                                  |
| `r1`       | 增长率 r1 | [5%, 30%]（百分数形式，如 10.2 表示 10.2%） |
| `r2`       | 增长率 r2 | [5%, 30%]                                   |

### 3.2 派生数据（由已知数据计算，展示给用户）

- `baseA = currentA / (1 + r1/100)` 基期 A'
- `baseB = currentB / (1 + r2/100)` 基期 B'
- `growthA = currentA - baseA` 增长量 x1（= currentA × r1/(100+r1)）
- `growthB = currentB - baseB` 增长量 x2

### 3.3 九项求解结果（用户填空，±5% 容差）

| #   | key | 标签          | 公式                                                      | 单位     |
| --- | --- | ------------- | --------------------------------------------------------- | -------- |
| 1   | P   | 现期比重 P    | `currentA / (currentA + currentB) × 100`                  | %        |
| 2   | Pp  | 基期比重 P'   | `baseA / (baseA + baseB) × 100`                           | %        |
| 3   | d   | 两期比重差 d  | `P - Pp`                                                  | 个百分点 |
| 4   | k   | 比值增长率 k  | `(currentA/currentB - baseA/baseB) / (baseA/baseB) × 100` | %        |
| 5   | S   | 基期和 S      | `baseA + baseB`                                           | —        |
| 6   | D   | 基期差 D      | `baseA - baseB`                                           | —        |
| 7   | r   | 隔年增长率 r  | `((1+r1/100)×(1+r2/100) - 1) × 100`                       | %        |
| 8   | r3  | AB和增长率 r3 | `((currentA+currentB)/(baseA+baseB) - 1) × 100`           | %        |
| 9   | r4  | AB差增长率 r4 | `((currentA-currentB)/(baseA-baseB) - 1) × 100`           | %        |

### 3.4 接口设计

```typescript
// src/generators/compositeAnalysis.ts
export interface CompositeData {
  currentA: number
  currentB: number
  r1: number // 百分数形式，如 10.2
  r2: number
  baseA: number
  baseB: number
  growthA: number
  growthB: number
}

export interface CompositeAnswers {
  P: number
  Pp: number
  d: number
  k: number
  S: number
  D: number
  r: number
  r3: number
  r4: number
}

export interface CompositeQuestion {
  data: CompositeData
  answers: CompositeAnswers // 用户不可见，判分用
}

export function generateComposite(): CompositeQuestion

export const COMPOSITE_FIELDS: ReadonlyArray<{
  key: keyof CompositeAnswers
  label: string
  unit: string
}>
```

### 3.5 COMPOSITE_FIELDS 元数据

```typescript
export const COMPOSITE_FIELDS = [
  { key: 'P', label: '现期比重 P', unit: '%' },
  { key: 'Pp', label: "基期比重 P'", unit: '%' },
  { key: 'd', label: '两期比重差 d', unit: '个百分点' },
  { key: 'k', label: '比值增长率 k', unit: '%' },
  { key: 'S', label: '基期和 S', unit: '' },
  { key: 'D', label: '基期差 D', unit: '' },
  { key: 'r', label: '隔年增长率 r', unit: '%' },
  { key: 'r3', label: 'AB和增长率 r3', unit: '%' },
  { key: 'r4', label: 'AB差增长率 r4', unit: '%' },
] as const
```

### 3.6 数值精度

- r1/r2 保留 1 位小数（如 10.2）
- baseA/baseB/growthA/growthB 保留 2 位小数
- 9 项答案保留 2 位小数

### 3.7 判分

- 每项独立判分：`Math.abs(userAns - trueAns) / Math.abs(trueAns) <= 0.05`
- trueAns = 0 时退化为精确判分（守卫，理论不出现）
- 9 项分别记录到 records 表

---

## 4. 比较题 UI 与交互

### 4.1 CompareQuestion.vue（题目区）

```
┌──────────────────────────────────────────┐
│                                          │
│    [左算式 KaTeX]    ?    [右算式 KaTeX]   │
│                                          │
│    [上下文]              [上下文]          │
│    允许误差范围: 精确判分                  │
│    合格 Xs 良好 Ys 优秀 Zs               │
│                                          │
└──────────────────────────────────────────┘
```

- 左右算式用 KaTeX 渲染（复用 L2 Katex.vue）
- 中间绿色 `?` 大字号
- 选中状态：用户选 大于/小于 后，`?` 替换为选中符号（`>` 绿 / `<` 橙）并高亮
- 上下文行（如现期/增长率）按需显示
- 时间标准行复用现有 logic（store.timeStandard）
- 误差行文案：`允许误差范围: 精确判分`（比较题无容差）

Props:

```typescript
interface Props {
  leftTex: string
  rightTex: string
  selected: '>' | '<' | null
  context?: string
  standardText: string | null
}
```

### 4.2 CompareKeypad.vue（4 大按钮）

```
┌──────────────┐  ┌──────────────┐
│    大于      │  │    小于      │
│   (绿色)     │  │   (橙色)     │
└──────────────┘  └──────────────┘
┌──────────────┐  ┌──────────────┐
│    重开      │  │    确定      │
│ (薄荷绿)     │  │   (灰色)     │
└──────────────┘  └──────────────┘
```

Props:

```typescript
interface Props {
  selected: '>' | '<' | null
}
```

Emits:

```typescript
{
  select: [choice: ">" | "<"];
  submit: [];
  restart: [];
}
```

- 大于按钮：selected === ">" 时高亮（绿色加深）
- 小于按钮：selected === "<" 时高亮（橙色加深）
- 确定按钮：selected === null 时禁用或提示"请先选择"

### 4.3 交互流程

1. 进入题目 → selected=null（store.compareChoice = null）
2. 用户点 大于/小于 → emit select → store.selectCompare(choice)（不提交）
3. 用户点 确定 → 若 selected=null 提示"请先选择" → 否则 emit submit → store.submit 判分
4. 用户点 重开 → emit restart → store.restart（重置当前题，compareChoice 清空）
5. 判分后 → 闪烁反馈（绿对/红错，复用现有 flashState）→ 下一题或结算

### 4.4 物理键盘映射（PracticeSession handleKeydown 扩展）

```typescript
// compare 模式额外分支（在现有 handleKeydown 开头）
if (store.questionCategory === 'compare') {
  if (k === '>' || k === '1') {
    e.preventDefault()
    store.selectCompare('>')
  } else if (k === '<' || k === '2') {
    e.preventDefault()
    store.selectCompare('<')
  } else if (k === 'Enter') {
    e.preventDefault()
    void onSubmit()
  } else if (k === 'Escape') {
    e.preventDefault()
    void onRestart()
  }
  return // compare 模式不处理数字/小数点/退格/逗号
}
// 现有 numpad 逻辑不变
```

### 4.5 store 扩展

```typescript
// practice.ts 新增
const compareChoice = ref<">" | "<" | null>(null);

const questionCategory = computed<"numpad" | "compare" | "composite">(() => {
  const t = config.value?.type;
  if (!t) return "numpad";
  if (t.startsWith("compare_")) return "compare";
  if (t === "composite") return "composite";
  return "numpad";
});

function selectCompare(choice: ">" | "<") {
  compareChoice.value = choice;
}

// submit 内分支（在现有 submit 开头）
async function submit() {
  if (questionCategory.value === "compare") {
    if (compareChoice.value === null) return;  // 守卫
    const q = currentQuestion.value as CompareQuestion;
    const isCorrect = compareChoice.value === q.answer;
    const record: AnswerRecord = {
      qIndex: currentIndex.value,
      question: `${q.display.leftTex} ? ${q.display.rightTex}`,
      userAnswer: compareChoice.value,
      trueAnswer: q.answer,
      isCorrect,
      timeSpentMs: /* 同现有 */,
    };
    records.value.push(record);
    // 入库（同现有 insertRecord 逻辑）
    compareChoice.value = null;  // 清空，下一题
    // 翻题/结算逻辑复用（同现有）
    return;
  }
  // 现有 numpad 逻辑不变
}
```

### 4.6 答题页切换（PracticeSession.vue）

```vue
<template>
  <div class="practice-session" :class="`flash-${flashState}`">
    <TopBar ... />

    <!-- 题目区按 category 切换 -->
    <QuestionDisplay
      v-if="store.questionCategory === 'numpad'"
      :display="store.currentQuestion?.display ?? ''"
      ...
    />
    <CompareQuestion
      v-else-if="store.questionCategory === 'compare'"
      :left-tex="store.currentQuestion?.display?.leftTex ?? ''"
      :right-tex="store.currentQuestion?.display?.rightTex ?? ''"
      :selected="store.compareChoice"
      :context="store.questionMeta?.context"
      :standard-text="standardText"
    />

    <!-- 输入区按 category 切换 -->
    <Numpad v-if="store.questionCategory === 'numpad'" ... />
    <CompareKeypad
      v-else-if="store.questionCategory === 'compare'"
      :selected="store.compareChoice"
      @select="store.selectCompare($event)"
      @submit="onSubmit"
      @restart="onRestart"
    />
  </div>
</template>
```

### 4.7 结算页（PracticeResult.vue）

- 比较题的 record.question 存的是 `${leftTex} ? ${rightTex}`，结算页已用 Katex 渲染（L2 修复）
- 比较题的 record.userAnswer / trueAnswer 是 `">"` / `"<"`，直接文本显示（无需 KaTeX）
- 现有 PracticeResult 无需额外改动

---

## 5. 一表通算 UI、交互与数据流

### 5.1 CompositeSession.vue 布局

```
┌──────────────────────────────────────────┐
│ [<] 一表通算  0:0:1                       │  顶栏（无进度，单题模式）
├──────────────────────────────────────────┤
│ 点击标签可显示公式，允许误差±5%           │  指令行
├──────────────────────────────────────────┤
│ 现期A [值]   现期B [值]                   │
│ 增长率r1 [%] 增长率r2 [%]                 │  已知数据区（4列网格）
│ 基期A' [值]  基期B' [值]                  │
│ 增长量x1 [值] 增长量x2 [值]               │
├──────────────────────────────────────────┤
│ 现期比重P [输入]%   基期比重P' [输入]%    │
│ 两期比重差d [输入]百分点  比值增长率k[输入]%│
│ 基期和S [输入]   基期差D [输入]           │  9 项填空区（2列网格）
│ 隔年增长率r [输入]%  AB和增长率r3 [输入]% │
│ AB差增长率r4 [输入]%                      │
├──────────────────────────────────────────┤
│ [刷新数据]  [提交答案]                    │  操作按钮
├──────────────────────────────────────────┤
│ [随机]                       [自定义]      │  底部导航
└──────────────────────────────────────────┘
```

### 5.2 交互流程

1. 进入页面 → onMounted 自动调用 refreshData() 生成第一组 → 9 项输入位为空，占位"请先刷新数据"
2. 用户逐个填 9 项 → 用资料分析键盘（variant=data，复用 Numpad）
   - 当前聚焦的输入位接收键盘输入
   - 每个输入位独立双向绑定（`answers[key]`）
3. 点"提交答案" → 9 项逐项判分 → 反馈（每项对/错标记，对=绿✓，错=红✗）→ 入库
4. 反馈后可：
   - 点"随机" → refreshData() 生成新数据，清空 9 项，继续练
   - 点"自定义" → ElMessage.info("暂未实现，使用随机") 占位提示（YAGNI）
   - 点返回 → 回资料分析设置页

### 5.3 Numpad 复用方案

一表通算需要 9 个输入位轮流聚焦，每个输入位接受数字输入：

- 每个输入位是 `<input readonly @focus="activeField = key">` + 显示 `answers[key] || ""`
- Numpad `@input` 把字符追加到 `answers[activeField]`
- Numpad `@backspace` 删除 `answers[activeField]` 末位
- Numpad `@clear` 清空 `answers[activeField]`
- Numpad `@submit` 触发 submitAll
- Numpad 拖拽定位不遮挡输入位（用户可拖走，可接受）

### 5.4 状态管理（组件内，不走 store）

```typescript
// CompositeSession.vue 内部状态
const data = ref<CompositeData | null>(null)
const answers = ref<Partial<CompositeAnswers>>({})
const activeField = ref<keyof CompositeAnswers | null>(null)
const submitted = ref(false)
const results = ref<Partial<Record<keyof CompositeAnswers, boolean>>>({})
const startedAt = ref<number | null>(null)
const elapsedMs = ref(0)
let timerId: number | null = null
let trueAnswers: CompositeAnswers | null = null // 闭包持有，不入响应式

async function refreshData() {
  const q = generateComposite()
  data.value = q.data
  trueAnswers = q.answers
  answers.value = {}
  submitted.value = false
  results.value = {}
  activeField.value = null
  if (startedAt.value === null) {
    startedAt.value = performance.now()
    startTimer()
  }
}

function onNumpadInput(char: string) {
  if (activeField.value === null) return
  const k = activeField.value
  answers.value[k] = ((answers.value[k] ?? '') + char) as any
}

function onNumpadBackspace() {
  if (activeField.value === null) return
  const k = activeField.value
  const cur = String(answers.value[k] ?? '')
  answers.value[k] = cur.slice(0, -1) as any
}

function onNumpadClear() {
  if (activeField.value === null) return
  answers.value[activeField.value] = undefined
}

async function submitAll() {
  if (!trueAnswers || !data.value) return
  const correctCount = COMPOSITE_FIELDS.reduce((acc, f) => {
    const userAns = Number(answers.value[f.key])
    const trueAns = trueAnswers[f.key]
    const isCorrect = !isNaN(userAns) && Math.abs(userAns - trueAns) / Math.abs(trueAns) <= 0.05
    results.value[f.key] = isCorrect
    return acc + (isCorrect ? 1 : 0)
  }, 0)
  submitted.value = true
  // 入库
  await persistSession(correctCount)
}

async function persistSession(correctCount: number) {
  // 1 个 session（type=composite, total=9, correct=correctCount）
  const sessionId = await insertSession({
    type: 'composite',
    subtype: '一表通算',
    difficulty: 'normal',
    total: 9,
    nback: 0,
  })
  // 9 个 record
  for (const f of COMPOSITE_FIELDS) {
    await insertRecord({
      sessionId,
      qIndex: COMPOSITE_FIELDS.indexOf(f),
      question: f.label,
      userAnswer: String(answers.value[f.key] ?? ''),
      trueAnswer: String(trueAnswers?.[f.key] ?? ''),
      isCorrect: results.value[f.key] ?? false,
      tolerance: 0.05,
      timeSpentMs: 0,
    })
  }
  await updateSession(sessionId, { correct: correctCount, durationMs: elapsedMs.value })
}
```

### 5.5 数据流与入库

- **session**：`type="composite"`, `subtype="一表通算"`, `total=9`, `correct=对的数量`, `duration_ms=会话时长`, `nback=0`
- **records**：9 个 record，每个 `question=标签名`, `user_answer=用户值`, `true_answer=真值`, `is_correct=对错`, `tolerance=0.05`, `time_spent_ms=0`（单题模式无单题计时，存 0）
- **结算**：一表通算无独立结算页，提交后直接在 CompositeSession 内显示 9 项对错 + 总正确率，用户点"随机"继续或返回

### 5.6 计时

- 进入页面首次 refreshData 时启动计时器（复用 setInterval 逻辑）
- 格式 `0:H:M`（与 L1/L2 一致）
- 无暂停（速算训练连续性）
- ~~提交时不停止计时，点"随机"继续累计（单题循环模式）~~ **[2026-07-03 验收决策变更]** 改为：每次 refreshData 重置计时器，反映"单组计时"语义（用户看一组用了多久），入库 durationMs = 单组时长
- 点返回时停止计时

---

## 6. 入口、路由与时间标准

### 6.1 DataAnalysisSettings.vue 改造

```
┌──────────────────────────────────────────┐
│ 资料分析                                  │
├──────────────────────────────────────────┤
│ [填空题]  [比较题]        ← el-tabs 切换   │
├──────────────────────────────────────────┤
│ （填空题 Tab，9 题型网格，现有内容）        │
│ ...                                       │
├──────────────────────────────────────────┤
│ （比较题 Tab，3 题型网格）                 │
│ [增量比大小] [基期比大小] [分数比大小]      │
│ 题量 [10 题 ›]                            │
│ [开始练习]                                │
├──────────────────────────────────────────┤
│ 一表通算                                  │  独立区块（不在 tab 内）
│ [开始练习]                                │
└──────────────────────────────────────────┘
```

- el-tabs 两个 tab pane（填空题/比较题）
- 一表通算在底部独立区块（单题模式无题量选择）
- 比较题题型网格 3 项（label + type 匹配 CompareType）

### 6.2 比较题题型列表

```typescript
const compareTypes: { label: string; type: CompareType }[] = [
  { label: '增量比大小', type: 'compare_growth' },
  { label: '基期比大小', type: 'compare_base' },
  { label: '分数比大小', type: 'compare_frac' },
]
```

### 6.3 路由新增

```typescript
// router/index.ts
{
  path: "/practice/composite",
  name: "composite-session",
  component: () => import("@/views/CompositeSession.vue"),
  meta: { title: "一表通算" },
},
```

比较题复用现有 `/practice/session`（PracticeSession 按 category 切换 UI）。遵循现有动态 import + meta title 模式。

### 6.4 时间标准种子（migration 0004）

```sql
-- L3 比较题 + 一表通算时间标准种子
INSERT OR IGNORE INTO time_standards
  (question_type, question_count, pass_s, good_s, excellent_s)
VALUES
  ('compare_growth', 10, 30, 22, 16),
  ('compare_base',   10, 30, 22, 16),
  ('compare_frac',   10, 30, 22, 16),
  ('composite',       1, 120, 90, 70);
```

时间标准来源说明：

- 比较题 3 类：30/22/16（与 baihua_frac 同档，比大小比填空快）
- 一表通算：单题 9 项，120/90/70（按 9 项×10s 估算，截图未实证）

### 6.5 跳转逻辑

```typescript
// DataAnalysisSettings.vue
async function startCompare() {
  const t = compareTypes[selectedCompareType.value]
  await store.init({
    type: t.type,
    subtype: t.label,
    count: selectedCount.value,
  })
  if (store.phase === 'running') {
    router.push('/practice/session') // 复用
  } else {
    ElMessage.error(store.error ?? '练习初始化失败')
  }
}

function startComposite() {
  router.push('/practice/composite') // 直接跳，不走 store.init
}
```

### 6.6 Home.vue

无需改动（"资料分析"卡片已跳 `/practice/data-analysis`，比较题和一表通算都在资料分析设置页内）。

### 6.7 lib.rs 注册 migration 0004

```rust
Migration {
    version: 4,
    description: "add compare 3 types + composite time standard seeds",
    sql: include_str!("../migrations/0004_add_compare_composite_standards.sql"),
    kind: MigrationKind::Up,
},
```

---

## 7. 测试策略与验收清单

### 7.1 比较题生成器测试（compareAnalysis.test.ts）

- 3 类题型各生成 N 题，验证接口完整性（display.leftTex/rightTex 非空、leftValue/rightValue 为数字、answer 是 `">"` 或 `"<"`、pattern 是 `"A"` 或 `"B"`）
- 模式 A/B 各生成 50 题，验证：
  - 模式 A：分母层差 <10%、实际值差 1%~5%
  - 模式 B：分母层整数倍（2x 或 3x）、实际值差 1%~5%
- 答案分布：生成 100 题，`">"` 和 `"<"` 各占比 40%~60%
- 无等号：所有题 `leftValue !== rightValue`
- display tex 含 `\frac`（compare_base / compare_frac）或 `\times` + `\%`（compare_growth）
- 各题型 context 字段正确

### 7.2 一表通算生成器测试（compositeAnalysis.test.ts）

- 生成 50 组，验证：
  - 已知数据 4 项在范围内（currentA/B ∈ [100,999], r1/r2 ∈ [5,30]）
  - 派生数据 4 项计算正确（baseA = currentA/(1+r1/100), growthA = currentA - baseA）
  - 9 项答案计算正确（固定输入对比预期输出）
  - 9 项答案无 NaN/Infinity
- COMPOSITE_FIELDS 长度为 9，每项 key/label/unit 完整

### 7.3 CompareQuestion 组件测试

- 渲染左右算式（含 `katex-html`）
- 中间 `?` 绿色显示
- props.selected 变化时 `?` 替换为 `>`/`<`

### 7.4 CompareKeypad 组件测试

- 4 按钮渲染（大于/小于/重开/确定）
- 点击大于 → emit `select` 带 `">"`
- 点击小于 → emit `select` 带 `"<"`
- 点击确定 → emit `submit`
- 点击重开 → emit `restart`
- selected props 高亮对应按钮

### 7.5 store 扩展测试（practice.test.ts 增量）

- questionCategory 计算：config.type 以 `compare_` 开头 → "compare"；`composite` → "composite"；其余 → "numpad"
- compare 模式 submit：selectCompare(">") → submit → 判分正确/错误
- compare 模式 submit 守卫：未 select 时 submit 不提交
- compare 模式翻题后 compareChoice 清空

### 7.6 验收清单

- [ ] 资料分析设置页 Tab 切换（填空题/比较题）正常
- [ ] 比较题 3 类各能出题（增量/基期/分数比大小）
- [ ] 比较题左右算式 KaTeX 渲染正确（真分数）
- [ ] 比较题大于/小于交互（屏幕 4 按钮 + 物理键盘 `>`/`<`/`1`/`2` + Enter）
- [ ] 比较题难度模式 A/B 都能出现（值接近/分母倍率）
- [ ] 比较题判分准确（二选一精确判分）
- [ ] 比较题结算页正确（题目列用 KaTeX 渲染，答案列显示 `>`/`<`）
- [ ] 一表通算刷新数据生成已知数据 4 项 + 派生 4 项
- [ ] 一表通算 9 项填空可用键盘输入
- [ ] 一表通算提交后 9 项逐项判分（±5% 容差）
- [ ] 一表通算"随机"换下一组继续练
- [ ] 一表通算"自定义"占位提示（本期不实现）
- [ ] 一表通算入库（历史记录可见 1 条，type=composite）
- [ ] migration 0004 时间标准种子齐全（4 行）
- [ ] L1/L2 功能不受影响（回归测试 105 个全过）
- [ ] 包体积 < 30MB

### 7.7 已知限制（YAGNI）

- 一表通算"自定义"按钮本期占位，不实现数据范围自定义
- 一表通算无独立结算页，提交后内联显示对错
- 一表通算无单题计时（9 项共享会话计时）
- 比较题难度模式不可选（随机 A/B），无难度设置项
- 翻题箭头（`<-` `->`）不在 L3 范围（L1 也未实现）
- 一表通算"点击标签显示公式"功能本期不实现（指令行文案保留，但标签不响应点击）

---

## 8. 决策记录

- **方案 A（混合架构）**：比较题复用 PracticeSession + store；一表通算独立 CompositeSession。理由：比较题答题流程与现有填空题相同（顺序答题→判分→计时→入库→结算），复用最合理；一表通算交互完全不同（单题 9 填空 + 刷新数据 + 无题量概念），独立实现更干净。
- **比较题两类难度模式**：模式 A（相近难分）+ 模式 B（整数倍率），3 类题通用。理由：用户指出比大小题的核心难点是"不容易区分哪个大哪个小"，这两类模式覆盖了分数比大小特有的陷阱设计，扩展到 3 类题保持一致性。
- **一表通算单题循环模式**：每次 1 组数据 + 9 项填空，无题量概念。理由：一表通算原版是单题模式，9 项填空本身已足够复杂，无需题量叠加。
- **一表通算组件内状态管理**：不走 store.init/submit。理由：一表通算交互模式（单题 9 填空 + 刷新数据 + 随机/自定义导航）与 store 的单题循环流程不兼容，强行复用会污染 L1/L2 的 store 状态。但走 db 入库（复用 insertSession/insertRecord）保证历史记录可见。
- **时间标准**：比较题 30/22/16（与 baihua_frac 同档）；一表通算 120/90/70（9 项×10s 估算）。截图未实证，按合理估算。
- **Numpad 复用**：一表通算复用 Numpad variant=data，9 个输入位轮流聚焦。理由：避免新键盘组件，复用现有拖拽/输入逻辑。
