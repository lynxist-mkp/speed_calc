# Level 2 设计规格：资料分析填空题

> **状态**：已批准
> **日期**：2026-07-03
> **范围**：资料分析 9 类填空题——生成 → KaTeX 渲染 → 双输入 → 容差判分 → 入库 → 结算
> **前置**：L1 已合并 main（基础计算闭环 + 双输入 + Numpad variant=data + store 状态机）
> **参考**：references/levels.md L2、references/computation-area.md（实证规格）

---

## 1. 目标

打通资料分析 9 类题型的"出题 → 答题 → 判分 → 计时 → 入库 → 结算"闭环。复用 L1 的 store 状态机、三段式路由、Numpad 组件、结算页；新增生成器多态、KaTeX 公式渲染、容差判分。

**YAGNI 边界**（推迟到 L4）：
- 柱状图呈现（年均增长率/年平均量用纯文字数据 + KaTeX 公式）
- 难度选择（L2 写死 normal，生成器预留 difficulty 参数）
- 呈现方式开关、键盘布局开关、N-back、导出题目
- 比较题（增量/基期/分数比大小）属 L3
- 一表通算多结果填空属 L3

---

## 2. 9 类题型

| type 字符串 | 题型名 | 公式方向 | 误差 | 截图实证 |
|---|---|---|---|---|
| `estimate_prev` | 估算前期量 | 给现期 A、增长率 r，求 A/(1+r) | ±3% | #5 |
| `estimate_growth` | 估算增长量 | 给现期 A、r，求 A·r/(1+r) | ±3% | #6 |
| `baihua_frac` | 百化分 | 给 n，求 1/n 的百分数 | ±2% | #7 |
| `baihua_frac_rev` | 百化分反向 | 给百分数，求对应 1/n | ±2% | #7 反向 |
| `frac_calc_lt` | 分数计算(＜) | 给 a、b（a<b），求 a/b，预填"0." | ±2% | #11 |
| `frac_calc_gt` | 分数计算(＞) | 给 a、b（a>b），求 a/b | ±2% | #12 |
| `annual_growth_rate` | 年均增长率 | 给首末值 + 年数 n，求 (末/首)^(1/n)-1 | ±3% | #10 |
| `base_period_ratio` | 基期比重 | 给 A、B、rA、rB，求 (A/(1+rA)) / ((A+B)/(1+rA+rB)) | ±3% | #13 |
| `annual_avg` | 年平均量 | 给 5 年数据，求平均 | ±1% | #15 |

**判分公式**：`|user - true| / |true| <= tolerance`（true=0 时退化精确判分）

---

## 3. 文件结构

| 文件 | 职责 | 创建/修改 |
|---|---|---|
| `src-tauri/migrations/0003_add_data_analysis_standards.sql` | 资料分析 9 类题型时间标准种子 | 创建 |
| `src-tauri/src/lib.rs` | 注册 migration 0003 | 修改 |
| `src/generators/dataAnalysis.ts` | 9 类纯函数生成器 | 创建 |
| `src/generators/__tests__/dataAnalysis.test.ts` | 生成器单测 | 创建 |
| `src/components/Katex.vue` | KaTeX 极简渲染封装 | 创建 |
| `src/components/QuestionDisplay.vue` | 题目区动态渲染（基础纯文本 / 资料 KaTeX+上下文+误差行） | 创建 |
| `src/components/__tests__/Katex.test.ts` | KaTeX 组件测试 | 创建 |
| `src/components/__tests__/QuestionDisplay.test.ts` | QuestionDisplay 组件测试 | 创建 |
| `src/stores/practice.ts` | init 多题型调度 + questionMeta + submit 容差判分 + preset 预填 | 修改 |
| `src/stores/__tests__/practice.test.ts` | 扩展 store 测试 | 修改 |
| `src/views/DataAnalysisSettings.vue` | 资料分析独立设置页 | 创建 |
| `src/views/PracticeSession.vue` | 题目区替换为 QuestionDisplay + Numpad variant 动态 | 修改 |
| `src/views/Home.vue` | "资料分析"卡片跳 /practice/data-analysis | 修改 |
| `src/router/index.ts` | 加 /practice/data-analysis 路由 | 修改 |

**边界原则**：
- 生成器纯函数无副作用可单测
- store 保持单一会话状态源（题型无关状态机）
- QuestionDisplay 纯展示无状态，props 驱动
- Katex.vue 极简封装，单一职责（渲染 KaTeX 源串）
- L1 文件改动最小化（仅 store/PracticeSession/Home/router 必要连带）

---

## 4. 数据流

```
DataAnalysisSettings（选题型 + 题量）
  → store.init({ type, subtype, count })
    → 多态调度：
        type === "basic_addsub" → generateBasicAddSub(count)
        else → generateDataQuestion(type, count)
    → insertSession(type, subtype, "normal", count, 0)
    → getTimeStandard(type, count)
    → currentAnswer 预填 preset（如 "0." / "-"）
    → phase = "running"
  → /practice/session
    → QuestionDisplay 渲染
        基础计算：纯文本 display + 答案内联 + 时间标准
        资料分析：KaTeX(display+answer) + 上下文 + 误差行 + 提示行 + 单位 + 时间标准
    → Numpad variant 按 isDataType 切换（basic=有±, data=无±）
    → submit：
        基础计算：精确判分（tolerance=0）
        资料分析：|user-true|/|true| <= tolerance
      → insertRecord(tolerance 存实际误差值)
      → 推进下一题：currentAnswer 预填 next.preset
  → /practice/result（复用 L1 结算页，无改动）
```

---

## 5. 生成器（dataAnalysis.ts）

### 统一接口

```typescript
export type DataType =
  | "estimate_prev" | "estimate_growth"
  | "baihua_frac" | "baihua_frac_rev"
  | "frac_calc_lt" | "frac_calc_gt"
  | "annual_growth_rate" | "base_period_ratio" | "annual_avg";

export interface DataQuestion {
  display: string;        // KaTeX 源串，如 "\\frac{9738}{1.102} \\approx"
  answer: number;         // 数值答案
  tolerance: number;      // 误差比例 0.03 = ±3%
  context?: string;       // 上下文行，如 "现期: 9738, 增长率: 10.2%"
  hint?: string;          // 附加提示，如 "建议写到小数点后2~3位"
  preset?: string;        // 预填，如 "0." 或 "-"
  unit?: string;          // 单位，如 "%" "万"
}

export function generateDataQuestion(
  type: DataType,
  count: number,
  difficulty?: "easy" | "normal" | "hard"
): DataQuestion[];
```

### 参数范围（normal 难度，参照截图量级）

| type | 参数范围 | display 样例 | answer | preset |
|---|---|---|---|---|
| `estimate_prev` | A∈[1000,9999], r∈[5%,30%] | `\frac{9738}{1.102} \approx` | A/(1+r) | — |
| `estimate_growth` | A∈[1000,9999], r∈[-30%,30%]（r 可负→答案负） | `\text{求增长量：} 9385 \times \frac{0.284}{1.284} \approx` | A·r/(1+r) | r<0 → "-" |
| `baihua_frac` | n∈[2,20] | `\frac{1}{11} \approx` + unit="%" | 100/n | — |
| `baihua_frac_rev` | n∈[2,20]，给 100/n 的近似百分数 | `9.1\% \approx \frac{1}{?} \approx` | n | — |
| `frac_calc_lt` | a∈[100,999], b∈[a,9999] | `\frac{632}{924} \approx` | a/b | "0." |
| `frac_calc_gt` | a∈[100,9999], b∈[100,a-1] | `\frac{977}{524} \approx` | a/b | — |
| `annual_growth_rate` | 6 年数据（首末值），n=5 | `\text{2012~2017 年均增长率} \approx` + unit="%" | (末/首)^(1/5)-1 | — |
| `base_period_ratio` | A,B∈[100,999], rA,rB∈[5%,30%] | `\frac{323}{371} \times \frac{1.02}{1.217} \approx` + unit="%" | (A/(1+rA))/((A+B)/(1+rA+rB)) | — |
| `annual_avg` | 5 年数据∈[10,99]（万） | `\text{2012~2016 年平均成交量} \approx` + unit="万" | sum/5 | — |

**辅助函数**：
- `randInt(min, max)`、`randFloat(min, max, decimals)` 工具
- 上下文行格式：`现期: ${A}, 增长率: ${(r*100).toFixed(1)}%`
- hint：百化分 → "写到小数点后一位即可"；分数计算 → "建议写到小数点后2~3位"；估算增长量 → "需要负号时会自动生成"

**边界处理**：
- `baihua_frac` n=1 退化：n 从 2 起，避免 100% 平凡解
- `annual_growth_rate` 首末值相等：重采，避免 0% 增长
- `frac_calc_lt` a=b 退化：b 严格大于 a
- `estimate_growth` r=0：重采，避免 0 增长量

---

## 6. store 扩展（practice.ts）

### Question 类型联合

```typescript
type AnyQuestion = BasicQuestion | DataQuestion;
const questions = ref<AnyQuestion[]>([]);
```

### 新增 computed

```typescript
const isDataType = computed(() => config.value?.type !== "basic_addsub");

const questionMeta = computed(() => {
  const q = currentQuestion.value;
  if (!q) return null;
  if ("context" in q) {  // DataQuestion
    return {
      tolerance: q.tolerance,
      context: q.context,
      hint: q.hint,
      unit: q.unit,
      isData: true,
      display: q.display,
    };
  }
  return { isData: false, display: q.display };
});
```

### init 多题型调度 + 预填

```typescript
async function init(cfg: SessionConfig) {
  stopTimer();
  try {
    const qs = cfg.type === "basic_addsub"
      ? generateBasicAddSub(cfg.count)
      : generateDataQuestion(cfg.type as DataType, cfg.count);
    questions.value = qs;
    currentIndex.value = 0;
    currentAnswer.value = qs[0] && "preset" in qs[0] ? (qs[0].preset ?? "") : "";
    // ... 其余不变（records/elapsedMs/error/config/insertSession/getTimeStandard/startTimer）
  } catch (e) { /* 不变 */ }
}
```

### submit 容差判分 + 推进预填

```typescript
async function submit() {
  const q = currentQuestion.value;
  if (q === null) return;
  // 空答案守卫：空串、单负号、单"0." 视为未作答
  if (currentAnswer.value === "" || currentAnswer.value === "-" || currentAnswer.value === "0.") return;
  const userAns = Number(currentAnswer.value);
  let isCorrect: boolean;
  let tolerance: number;
  if ("tolerance" in q) {  // DataQuestion
    tolerance = q.tolerance;
    isCorrect = q.answer === 0
      ? userAns === 0
      : Math.abs(userAns - q.answer) / Math.abs(q.answer) <= tolerance;
  } else {  // BasicQuestion
    tolerance = 0;
    isCorrect = userAns === q.answer;
  }
  const record: AnswerRecord = {
    qIndex: currentIndex.value,
    question: q.display,  // 资料分析存 KaTeX 源串
    userAnswer: currentAnswer.value,
    trueAnswer: String(q.answer),
    isCorrect,
    timeSpentMs: /* 不变 */,
  };
  records.value.push(record);
  try { /* insertRecord 不变，tolerance 字段存实际值 */ } catch (e) { /* 不变 */ }
  currentAnswer.value = "";
  if (currentIndex.value + 1 >= questions.value.length) {
    await finish();
  } else {
    currentIndex.value += 1;
    questionStartedAt.value = performance.now();
    // 预填下一题 preset
    const next = questions.value[currentIndex.value];
    currentAnswer.value = next && "preset" in next ? (next.preset ?? "") : "";
  }
}
```

### AnswerRecord 兼容

`AnswerRecord.question` 在资料分析时存 KaTeX 源串（如 `\frac{9738}{1.102} \approx`），结算页 PracticeResult 显示原样（KaTeX 源串可读性可接受，L5 优化为渲染）。

---

## 7. QuestionDisplay.vue

纯展示无状态，props 驱动。

```vue
<script setup lang="ts">
import { computed } from "vue";
import Katex from "@/components/Katex.vue";

interface Props {
  display: string;
  isData: boolean;
  context?: string;
  hint?: string;
  tolerance?: number;
  unit?: string;
  standardText?: string | null;
  answer: string;
}
const props = defineProps<Props>();
const toleranceText = computed(() =>
  props.tolerance ? `允许误差范围：±${(props.tolerance * 100).toFixed(0)}%` : null
);
</script>

<template>
  <div class="question-area">
    <div v-if="!isData" class="formula basic">
      <span class="expr">{{ display }}</span>
      <span class="answer-inline">{{ answer }}</span>
      <span class="cursor">|</span>
    </div>
    <div v-else class="formula data">
      <Katex :tex="display + ' ' + answer" />
      <span class="cursor">|</span>
      <span v-if="unit" class="unit">{{ unit }}</span>
    </div>
    <div v-if="context" class="context">{{ context }}</div>
    <div v-if="toleranceText" class="tolerance">{{ toleranceText }}</div>
    <div v-if="hint" class="hint">{{ hint }}</div>
    <div v-if="standardText" class="standard">{{ standardText }}</div>
  </div>
</template>
```

---

## 8. Katex.vue

极简封装，单一职责。

```vue
<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import katex from "katex";
import "katex/dist/katex.min.css";

const props = defineProps<{ tex: string }>();
const el = ref<HTMLElement | null>(null);
function render() {
  if (el.value) katex.render(props.tex, el.value, { throwOnError: false });
}
onMounted(render);
watch(() => props.tex, render);
</script>
<template><span ref="el" class="katex-render"></span></template>
```

---

## 9. PracticeSession.vue 改动

仅题目区替换为 QuestionDisplay，Numpad variant 动态，其余不变（双输入/flash/计时/重开确认/onMounted 守卫）。

```vue
<QuestionDisplay
  :display="store.currentQuestion?.display ?? ''"
  :is-data="store.isDataType"
  :context="store.questionMeta?.context"
  :hint="store.questionMeta?.hint"
  :tolerance="store.questionMeta?.tolerance"
  :unit="store.questionMeta?.unit"
  :standard-text="standardText"
  :answer="store.currentAnswer"
/>

<Numpad
  :variant="store.isDataType ? 'data' : 'basic'"
  layout="normal"
  @input="store.inputChar($event)"
  @submit="onSubmit"
  @clear="store.clearAnswer"
  @backspace="store.backspace"
  @restart="onRestart"
  @toggle-sign="store.toggleSign"
/>
```

**注意**：资料分析 Numpad variant="data" 无 ± 键，但 store.toggleSign 仍保留（物理键盘 "-" 仍可触发，且 estimate_growth 答案为负时由 preset 预填 "-"，用户无需手动输入负号）。

---

## 10. DataAnalysisSettings.vue

仿 L1 PracticeSettings 结构，简化（无键盘布局/触控笔/N-back/导出/FAB）。

- 9 题型网格 3×3
- 题量：5/10/15/20/25/自定义5-100（弹窗）
- 开始练习：store.init → 检查 phase==="running" → router.push("/practice/session")；失败 ElMessage.error
- 历史记录按钮跳 /history

---

## 11. 路由（router/index.ts）

```typescript
{ path: "/practice", name: "practice", component: PracticeSettings },
{ path: "/practice/data-analysis", name: "data-analysis-settings", component: DataAnalysisSettings },
{ path: "/practice/session", name: "practice-session", component: PracticeSession },
{ path: "/practice/result", name: "practice-result", component: PracticeResult },
```

Home.vue "资料分析"卡片跳 `/practice/data-analysis`。

---

## 12. 时间标准种子（migration 0003）

```sql
INSERT OR IGNORE INTO time_standards
  (question_type, question_count, pass_s, good_s, excellent_s)
VALUES
  ('estimate_prev',       10, 35, 26, 20),  -- levels.md 实证
  ('estimate_growth',     10, 35, 26, 20),  -- 同 estimate_prev
  ('baihua_frac',         10, 30, 22, 16),  -- levels.md 实证
  ('baihua_frac_rev',     10, 30, 22, 16),  -- 同 baihua_frac
  ('frac_calc_lt',        10, 40, 30, 22),  -- levels.md 实证（frac_calc）
  ('frac_calc_gt',        10, 40, 30, 22),  -- 同 frac_calc
  ('annual_growth_rate',  5,  60, 45, 35),  -- 推断（5 题，复合计算）
  ('base_period_ratio',   10, 50, 38, 28),  -- 推断（复合公式）
  ('annual_avg',          5,  40, 30, 22);  -- 推断（5 题简单平均）
```

查不到时 store 用 getTimeStandard 降级（题型默认 → null）。

---

## 13. 测试策略

| 层 | 测试文件 | 覆盖 |
|---|---|---|
| 生成器 | `src/generators/__tests__/dataAnalysis.test.ts` | 9 类各生成 N 题；答案计算正确；参数范围合规；负数预填；分数计算 lt/gt 分支；百化分正反向互逆；边界（n≥2、首末值不等、a≠b） |
| store | `src/stores/__tests__/practice.test.ts`（扩展） | init 多题型调度；questionMeta 正确；submit 容差判分（边界 ±0.01%）；preset 预填；推进时下一题 preset；空答案守卫（"-" / "0."） |
| 组件 | `src/components/__tests__/Katex.test.ts` | 渲染输出含 katex-html；throwOnError:false 容错（无效 tex 不崩溃） |
| 组件 | `src/components/__tests__/QuestionDisplay.test.ts` | 基础纯文本渲染；资料 KaTeX 渲染；上下文/误差/提示/标准行显隐；unit 显示 |

预期 L2 新增约 30-40 个测试用例，L1 既有 38 个不回归。

---

## 14. 边界与降级

- **getTimeStandard 降级**：精确命中 → 题型 count≤target 最近 → null（L1 已实现）
- **KaTeX 渲染失败**：throwOnError:false，原样显示 tex 源串
- **答案为 0**：容差判分退化为精确判分
- **预设负号**：estimate_growth r<0 时 preset="-"，用户直接输数字
- **预设 "0."**：frac_calc_lt 必 <1，preset="0."，光标在小数点后

---

## 15. 验收清单（对应 levels.md L2）

- [ ] 9 类题型各能出题（含百化分正/反向）
- [ ] 误差判断按表正确（±1%/±2%/±3%）
- [ ] KaTeX 公式正确渲染（分数真分数排版）
- [ ] 双输入可用于小数/负数答案（资料分析键盘无±，负号预填）
- [ ] 时间标准按题型×题量查表显示
- [ ] 历史记录可见资料分析会话
- [ ] 资料分析设置页 9 题型网格 + 题量可选
- [ ] L1 基础计算闭环不回归（38 测试通过）
