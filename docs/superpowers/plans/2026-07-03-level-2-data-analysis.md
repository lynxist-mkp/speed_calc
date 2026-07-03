# Level 2 实现计划：资料分析填空题

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 打通资料分析 9 类题型的"出题 → 答题 → 判分 → 计时 → 入库 → 结算"闭环，复用 L1 store/路由/Numpad/结算页，新增生成器多态 + KaTeX 渲染 + 容差判分。

**架构：** 方案 A — 复用 usePracticeStore（init 多题型调度）+ 三段式路由（新增 /practice/data-analysis 设置页）+ 生成器多态（basic.ts/dataAnalysis.ts）+ QuestionDisplay 动态渲染（基础纯文本 / 资料 KaTeX+上下文+误差行）+ Numpad variant 按 isDataType 切换。

**技术栈：** Tauri 2 + Vue 3.5 + TS + Vite 6 + Pinia + Vue Router 4 + Element Plus 2.8 + tauri-plugin-sql 2 + KaTeX 0.16 + vitest + @vue/test-utils + jsdom

**设计规格：** `docs/superpowers/specs/2026-07-03-level-2-data-analysis-design.md`

**前置：** L1 已合并到 main（基础计算闭环 + 双输入 + Numpad variant=data + store 状态机 + 38 测试通过）。在专用 worktree `feature/level-2` 中执行。

**工作目录：** 所有命令在 `/Users/linkslinks/project/speed_calc/.worktrees/level-2` 下执行。

---

## 文件结构

| 文件 | 职责 | 创建/修改 |
|---|---|---|
| `src-tauri/migrations/0003_add_data_analysis_standards.sql` | 资料分析 9 类题型时间标准种子 | 创建 |
| `src-tauri/src/lib.rs` | 注册 migration 0003 | 修改 |
| `src/generators/dataAnalysis.ts` | 9 类纯函数生成器 | 创建 |
| `src/generators/__tests__/dataAnalysis.test.ts` | 生成器单测 | 创建 |
| `src/components/Katex.vue` | KaTeX 极简渲染封装 | 创建 |
| `src/components/__tests__/Katex.test.ts` | KaTeX 组件测试 | 创建 |
| `src/components/QuestionDisplay.vue` | 题目区动态渲染 | 创建 |
| `src/components/__tests__/QuestionDisplay.test.ts` | QuestionDisplay 组件测试 | 创建 |
| `src/stores/practice.ts` | init 多题型调度 + questionMeta + submit 容差判分 + preset 预填 | 修改 |
| `src/stores/__tests__/practice.test.ts` | 扩展 store 测试 | 修改 |
| `src/views/DataAnalysisSettings.vue` | 资料分析独立设置页 | 创建 |
| `src/views/PracticeSession.vue` | 题目区替换为 QuestionDisplay + Numpad variant 动态 | 修改 |
| `src/views/Home.vue` | "资料分析"卡片跳 /practice/data-analysis | 修改 |
| `src/router/index.ts` | 加 /practice/data-analysis 路由 | 修改 |

边界原则：生成器纯函数无副作用可单测；store 保持单一会话状态源；QuestionDisplay 纯展示无状态；Katex.vue 极简封装单一职责；L1 文件改动最小化。

---

## 任务 1：migration 0003 + lib.rs 注册

**文件：**
- 创建：`src-tauri/migrations/0003_add_data_analysis_standards.sql`
- 修改：`src-tauri/src/lib.rs`

- [ ] **步骤 1：创建 migration 0003 SQL**

创建 `src-tauri/migrations/0003_add_data_analysis_standards.sql`：

```sql
-- L2 资料分析 9 类题型时间标准种子
-- 来源：references/levels.md 时间标准表 + 截图量级推断
INSERT OR IGNORE INTO time_standards
  (question_type, question_count, pass_s, good_s, excellent_s)
VALUES
  ('estimate_prev',       10, 35, 26, 20),
  ('estimate_growth',     10, 35, 26, 20),
  ('baihua_frac',         10, 30, 22, 16),
  ('baihua_frac_rev',     10, 30, 22, 16),
  ('frac_calc_lt',        10, 40, 30, 22),
  ('frac_calc_gt',        10, 40, 30, 22),
  ('annual_growth_rate',  5,  60, 45, 35),
  ('base_period_ratio',   10, 50, 38, 28),
  ('annual_avg',          5,  40, 30, 22);
```

- [ ] **步骤 2：在 lib.rs 注册 migration 0003**

修改 `src-tauri/src/lib.rs` 的 `migrations()` 函数，在 vec 中追加第三个 Migration：

```rust
use tauri_plugin_sql::{Migration, MigrationKind};

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "initial schema: sessions / records / custom_presets / settings / time_standards",
            sql: include_str!("../migrations/0001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add basic_addsub x15 time standard seed",
            sql: include_str!("../migrations/0002_add_basic_addsub_15.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add data analysis 9 types time standard seeds",
            sql: include_str!("../migrations/0003_add_data_analysis_standards.sql"),
            kind: MigrationKind::Up,
        },
    ]
}
```

- [ ] **步骤 3：cargo check 验证 migration 注册**

运行：
```bash
cd /Users/linkslinks/project/speed_calc/.worktrees/level-2/src-tauri
export PATH="/opt/homebrew/opt/rustup/bin:/opt/homebrew/bin:$PATH"
cargo check
```
预期：编译通过，无错误

- [ ] **步骤 4：Commit**

```bash
cd /Users/linkslinks/project/speed_calc/.worktrees/level-2
git add src-tauri/migrations/0003_add_data_analysis_standards.sql src-tauri/src/lib.rs
git commit -m "feat(l2): migration 0003 资料分析 9 类题型时间标准种子"
```

---

## 任务 2：KaTeX 组件（TDD）

**文件：**
- 创建：`src/components/Katex.vue`
- 创建：`src/components/__tests__/Katex.test.ts`

- [ ] **步骤 1：编写 Katex 组件失败的测试**

创建 `src/components/__tests__/Katex.test.ts`：

```typescript
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Katex from "@/components/Katex.vue";

describe("Katex.vue", () => {
  it("渲染有效 tex 输出 katex-html", () => {
    const wrapper = mount(Katex, { props: { tex: "\\frac{1}{2}" } });
    expect(wrapper.html()).toContain("katex-html");
  });

  it("渲染分数含分子 1 和分母 2", () => {
    const wrapper = mount(Katex, { props: { tex: "\\frac{1}{2}" } });
    const html = wrapper.html();
    expect(html).toContain("frac");
  });

  it("无效 tex 不崩溃（throwOnError:false）", () => {
    const wrapper = mount(Katex, { props: { tex: "\\invalidcmd" } });
    // 不抛异常即通过；输出含 errormessage 或原样
    expect(wrapper.exists()).toBe(true);
  });

  it("tex 变化时重新渲染", async () => {
    const wrapper = mount(Katex, { props: { tex: "1+1" } });
    expect(wrapper.html()).toContain("1");
    await wrapper.setProps({ tex: "2+2" });
    expect(wrapper.html()).toContain("2");
  });

  it("渲染百分号", () => {
    const wrapper = mount(Katex, { props: { tex: "9.1\\%" } });
    expect(wrapper.html()).toContain("%");
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`cd /Users/linkslinks/project/speed_calc/.worktrees/level-2 && pnpm test src/components/__tests__/Katex.test.ts`
预期：FAIL，报错 "Failed to resolve import '@/components/Katex.vue'"

- [ ] **步骤 3：实现 Katex 组件**

创建 `src/components/Katex.vue`：

```vue
<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import katex from "katex";
import "katex/dist/katex.min.css";

const props = defineProps<{ tex: string }>();
const el = ref<HTMLElement | null>(null);

function render() {
  if (el.value) {
    katex.render(props.tex, el.value, { throwOnError: false });
  }
}

onMounted(render);
watch(() => props.tex, render);
</script>

<template>
  <span ref="el" class="katex-render"></span>
</template>
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm test src/components/__tests__/Katex.test.ts`
预期：PASS，5 个用例通过

- [ ] **步骤 5：Commit**

```bash
git add src/components/Katex.vue src/components/__tests__/Katex.test.ts
git commit -m "feat(l2): Katex 组件极简封装（throwOnError:false 容错）"
```

---

## 任务 3：资料分析生成器（TDD）

**文件：**
- 创建：`src/generators/dataAnalysis.ts`
- 创建：`src/generators/__tests__/dataAnalysis.test.ts`

- [ ] **步骤 1：编写生成器失败的测试**

创建 `src/generators/__tests__/dataAnalysis.test.ts`：

```typescript
import { describe, it, expect } from "vitest";
import { generateDataQuestion, type DataType, type DataQuestion } from "@/generators/dataAnalysis";

describe("generateDataQuestion", () => {
  describe("通用", () => {
    it("生成指定数量的题", () => {
      const qs = generateDataQuestion("estimate_prev", 10);
      expect(qs).toHaveLength(10);
    });

    it("每题含 display/answer/tolerance 必填字段", () => {
      const qs = generateDataQuestion("baihua_frac", 5);
      for (const q of qs) {
        expect(typeof q.display).toBe("string");
        expect(q.display.length).toBeGreaterThan(0);
        expect(typeof q.answer).toBe("number");
        expect(typeof q.tolerance).toBe("number");
        expect(q.tolerance).toBeGreaterThan(0);
        expect(q.tolerance).toBeLessThanOrEqual(0.05);
      }
    });
  });

  describe("estimate_prev 估算前期量", () => {
    it("答案 = A/(1+r)", () => {
      const qs = generateDataQuestion("estimate_prev", 20);
      for (const q of qs) {
        // 从 context 解析 A 和 r 验证
        expect(q.tolerance).toBe(0.03);
        expect(q.answer).toBeGreaterThan(0);
      }
    });

    it("display 含 \\frac 和 \\approx", () => {
      const qs = generateDataQuestion("estimate_prev", 5);
      for (const q of qs) {
        expect(q.display).toContain("\\frac");
        expect(q.display).toContain("\\approx");
      }
    });

    it("context 含 现期 和 增长率", () => {
      const qs = generateDataQuestion("estimate_prev", 5);
      for (const q of qs) {
        expect(q.context).toContain("现期");
        expect(q.context).toContain("增长率");
      }
    });
  });

  describe("estimate_growth 估算增长量", () => {
    it("答案 = A*r/(1+r)，可正可负", () => {
      const qs = generateDataQuestion("estimate_growth", 50);
      const hasNeg = qs.some((q) => q.answer < 0);
      const hasPos = qs.some((q) => q.answer > 0);
      expect(hasPos).toBe(true);
      // 50 题中应有负数（r 可负）
      expect(hasNeg).toBe(true);
    });

    it("答案为负时 preset='-'", () => {
      const qs = generateDataQuestion("estimate_growth", 50);
      for (const q of qs) {
        if (q.answer < 0) {
          expect(q.preset).toBe("-");
        }
      }
    });

    it("hint 含 '需要负号时会自动生成'", () => {
      const qs = generateDataQuestion("estimate_growth", 5);
      for (const q of qs) {
        expect(q.hint).toContain("需要负号");
      }
    });

    it("不出现 0 增长量（r≠0）", () => {
      const qs = generateDataQuestion("estimate_growth", 50);
      for (const q of qs) {
        expect(q.answer).not.toBe(0);
      }
    });
  });

  describe("baihua_frac 百化分", () => {
    it("答案 = 100/n，n∈[2,20]", () => {
      const qs = generateDataQuestion("baihua_frac", 50);
      for (const q of qs) {
        expect(q.answer).toBeGreaterThanOrEqual(5);   // 100/20
        expect(q.answer).toBeLessThanOrEqual(50);      // 100/2
        expect(q.tolerance).toBe(0.02);
      }
    });

    it("display 含 \\frac{1}{n}", () => {
      const qs = generateDataQuestion("baihua_frac", 5);
      for (const q of qs) {
        expect(q.display).toContain("\\frac{1}{");
      }
    });

    it("unit='%' ", () => {
      const qs = generateDataQuestion("baihua_frac", 5);
      for (const q of qs) {
        expect(q.unit).toBe("%");
      }
    });

    it("hint 含 '小数点后一位'", () => {
      const qs = generateDataQuestion("baihua_frac", 5);
      for (const q of qs) {
        expect(q.hint).toContain("小数点后一位");
      }
    });
  });

  describe("baihua_frac_rev 百化分反向", () => {
    it("答案为整数 n∈[2,20]", () => {
      const qs = generateDataQuestion("baihua_frac_rev", 50);
      for (const q of qs) {
        expect(Number.isInteger(q.answer)).toBe(true);
        expect(q.answer).toBeGreaterThanOrEqual(2);
        expect(q.answer).toBeLessThanOrEqual(20);
      }
    });

    it("正反向互逆：正向 answer=100/n，反向 answer=n", () => {
      // 反向题给的百分数 ≈ 100/n
      const qs = generateDataQuestion("baihua_frac_rev", 50);
      for (const q of qs) {
        const n = q.answer;
        const pct = 100 / n;
        // display 中应含该百分数（近似）
        expect(q.display).toContain("%");
      }
    });
  });

  describe("frac_calc_lt 分数计算(分子<分母)", () => {
    it("答案 < 1", () => {
      const qs = generateDataQuestion("frac_calc_lt", 50);
      for (const q of qs) {
        expect(q.answer).toBeGreaterThan(0);
        expect(q.answer).toBeLessThan(1);
      }
    });

    it("preset='0.'", () => {
      const qs = generateDataQuestion("frac_calc_lt", 5);
      for (const q of qs) {
        expect(q.preset).toBe("0.");
      }
    });

    it("tolerance=0.02", () => {
      const qs = generateDataQuestion("frac_calc_lt", 5);
      for (const q of qs) {
        expect(q.tolerance).toBe(0.02);
      }
    });

    it("hint 含 '小数点后2~3位'", () => {
      const qs = generateDataQuestion("frac_calc_lt", 5);
      for (const q of qs) {
        expect(q.hint).toContain("2~3位");
      }
    });
  });

  describe("frac_calc_gt 分数计算(分子>分母)", () => {
    it("答案 > 1", () => {
      const qs = generateDataQuestion("frac_calc_gt", 50);
      for (const q of qs) {
        expect(q.answer).toBeGreaterThan(1);
      }
    });

    it("无 preset（不预填）", () => {
      const qs = generateDataQuestion("frac_calc_gt", 5);
      for (const q of qs) {
        expect(q.preset).toBeUndefined();
      }
    });

    it("tolerance=0.02", () => {
      const qs = generateDataQuestion("frac_calc_gt", 5);
      for (const q of qs) {
        expect(q.tolerance).toBe(0.02);
      }
    });
  });

  describe("annual_growth_rate 年均增长率", () => {
    it("答案为小数（增长率），含 unit='%'", () => {
      const qs = generateDataQuestion("annual_growth_rate", 5);
      for (const q of qs) {
        expect(q.unit).toBe("%");
        expect(q.tolerance).toBe(0.03);
      }
    });

    it("context 含年份范围", () => {
      const qs = generateDataQuestion("annual_growth_rate", 5);
      for (const q of qs) {
        expect(q.context).toContain("~");
        expect(q.context).toContain("首");
        expect(q.context).toContain("末");
      }
    });

    it("不出现 0 增长率（首末值不等）", () => {
      const qs = generateDataQuestion("annual_growth_rate", 50);
      for (const q of qs) {
        expect(q.answer).not.toBe(0);
      }
    });
  });

  describe("base_period_ratio 基期比重", () => {
    it("答案在 (0,1) 区间（比重）", () => {
      const qs = generateDataQuestion("base_period_ratio", 50);
      for (const q of qs) {
        expect(q.answer).toBeGreaterThan(0);
        expect(q.answer).toBeLessThan(1);
      }
    });

    it("display 含 \\frac 和 \\times", () => {
      const qs = generateDataQuestion("base_period_ratio", 5);
      for (const q of qs) {
        expect(q.display).toContain("\\frac");
        expect(q.display).toContain("\\times");
      }
    });

    it("context 含 A、B、rA、rB", () => {
      const qs = generateDataQuestion("base_period_ratio", 5);
      for (const q of qs) {
        expect(q.context).toContain("A:");
        expect(q.context).toContain("B:");
      }
    });

    it("unit='%'", () => {
      const qs = generateDataQuestion("base_period_ratio", 5);
      for (const q of qs) {
        expect(q.unit).toBe("%");
      }
    });
  });

  describe("annual_avg 年平均量", () => {
    it("答案为正数（5 年平均）", () => {
      const qs = generateDataQuestion("annual_avg", 50);
      for (const q of qs) {
        expect(q.answer).toBeGreaterThan(0);
      }
    });

    it("tolerance=0.01（最严）", () => {
      const qs = generateDataQuestion("annual_avg", 5);
      for (const q of qs) {
        expect(q.tolerance).toBe(0.01);
      }
    });

    it("context 含 5 个年份值", () => {
      const qs = generateDataQuestion("annual_avg", 5);
      for (const q of qs) {
        expect(q.context).toContain("万");
        expect(q.context).toMatch(/\d{2,}/);  // 至少 2 位数值
      }
    });

    it("unit='万'", () => {
      const qs = generateDataQuestion("annual_avg", 5);
      for (const q of qs) {
        expect(q.unit).toBe("万");
      }
    });
  });

  describe("边界与稳健性", () => {
    it("count=1 也能生成", () => {
      const qs = generateDataQuestion("estimate_prev", 1);
      expect(qs).toHaveLength(1);
    });

    it("count=100 也能生成", () => {
      const qs = generateDataQuestion("baihua_frac", 100);
      expect(qs).toHaveLength(100);
    });

    it("所有 9 类题型都能生成", () => {
      const types: DataType[] = [
        "estimate_prev", "estimate_growth",
        "baihua_frac", "baihua_frac_rev",
        "frac_calc_lt", "frac_calc_gt",
        "annual_growth_rate", "base_period_ratio", "annual_avg",
      ];
      for (const t of types) {
        const qs = generateDataQuestion(t, 3);
        expect(qs).toHaveLength(3);
        for (const q of qs) {
          expect(q.display.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`cd /Users/linkslinks/project/speed_calc/.worktrees/level-2 && pnpm test src/generators/__tests__/dataAnalysis.test.ts`
预期：FAIL，报错 "Failed to resolve import '@/generators/dataAnalysis'"

- [ ] **步骤 3：实现生成器**

创建 `src/generators/dataAnalysis.ts`：

```typescript
export type DataType =
  | "estimate_prev" | "estimate_growth"
  | "baihua_frac" | "baihua_frac_rev"
  | "frac_calc_lt" | "frac_calc_gt"
  | "annual_growth_rate" | "base_period_ratio" | "annual_avg";

export interface DataQuestion {
  display: string;        // KaTeX 源串
  answer: number;         // 数值答案
  tolerance: number;      // 误差比例
  context?: string;       // 上下文行
  hint?: string;          // 附加提示
  preset?: string;        // 预填
  unit?: string;          // 单位
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals: number): number {
  const v = Math.random() * (max - min) + min;
  return Number(v.toFixed(decimals));
}

// ===== estimate_prev 估算前期量 =====
function genEstimatePrev(): DataQuestion {
  const A = randInt(1000, 9999);
  const r = randFloat(0.05, 0.30, 3);
  const answer = A / (1 + r);
  return {
    display: `\\frac{${A}}{${(1 + r).toFixed(3)}} \\approx`,
    answer: Number(answer.toFixed(2)),
    tolerance: 0.03,
    context: `现期: ${A}, 增长率: ${(r * 100).toFixed(1)}%`,
  };
}

// ===== estimate_growth 估算增长量 =====
function genEstimateGrowth(): DataQuestion {
  let r = 0;
  let A = 0;
  // 重采避免 r=0
  while (r === 0) {
    A = randInt(1000, 9999);
    r = randFloat(-0.30, 0.30, 3);
  }
  const answer = (A * r) / (1 + r);
  return {
    display: `\\text{求增长量：} ${A} \\times \\frac{${r.toFixed(3)}}{${(1 + r).toFixed(3)}} \\approx`,
    answer: Number(answer.toFixed(2)),
    tolerance: 0.03,
    context: `现期: ${A}, 增长率: ${(r * 100).toFixed(1)}%`,
    hint: "需要负号时会自动生成",
    preset: answer < 0 ? "-" : undefined,
  };
}

// ===== baihua_frac 百化分 =====
function genBaihuaFrac(): DataQuestion {
  const n = randInt(2, 20);
  const answer = 100 / n;
  return {
    display: `\\frac{1}{${n}} \\approx`,
    answer: Number(answer.toFixed(2)),
    tolerance: 0.02,
    hint: "写到小数点后一位即可",
    unit: "%",
  };
}

// ===== baihua_frac_rev 百化分反向 =====
function genBaihuaFracRev(): DataQuestion {
  const n = randInt(2, 20);
  const pct = 100 / n;
  return {
    display: `${pct.toFixed(1)}\\% \\approx \\frac{1}{?} \\approx`,
    answer: n,
    tolerance: 0.02,
    hint: "写到小数点后一位即可",
  };
}

// ===== frac_calc_lt 分数计算(分子<分母) =====
function genFracCalcLt(): DataQuestion {
  const a = randInt(100, 999);
  const b = randInt(a + 1, 9999);  // 严格大于
  const answer = a / b;
  return {
    display: `\\frac{${a}}{${b}} \\approx`,
    answer: Number(answer.toFixed(4)),
    tolerance: 0.02,
    hint: "建议写到小数点后2~3位",
    preset: "0.",
  };
}

// ===== frac_calc_gt 分数计算(分子>分母) =====
function genFracCalcGt(): DataQuestion {
  const a = randInt(100, 9999);
  const b = randInt(100, a - 1);  // 严格小于
  const answer = a / b;
  return {
    display: `\\frac{${a}}{${b}} \\approx`,
    answer: Number(answer.toFixed(4)),
    tolerance: 0.02,
    hint: "建议写到小数点后2~3位",
  };
}

// ===== annual_growth_rate 年均增长率 =====
function genAnnualGrowthRate(): DataQuestion {
  let first = 0;
  let last = 0;
  // 重采避免首末相等
  while (first === last) {
    first = randInt(10, 99);
    last = randInt(10, 99);
  }
  const n = 5;
  const answer = Math.pow(last / first, 1 / n) - 1;
  return {
    display: `\\text{2012~2017 年均增长率} \\approx`,
    answer: Number(answer.toFixed(4)),
    tolerance: 0.03,
    context: `首: ${first}万, 末: ${last}万, n=5`,
    unit: "%",
  };
}

// ===== base_period_ratio 基期比重 =====
function genBasePeriodRatio(): DataQuestion {
  const A = randInt(100, 999);
  const B = randInt(100, 999);
  const rA = randFloat(0.05, 0.30, 3);
  const rB = randFloat(0.05, 0.30, 3);
  const answer = (A / (1 + rA)) / ((A + B) / (1 + rA + rB));
  return {
    display: `\\frac{${A}}{${B}} \\times \\frac{${(1 + rB).toFixed(3)}}{${(1 + rA + rB).toFixed(3)}} \\approx`,
    answer: Number((answer * 100).toFixed(2)),  // 存为百分数值
    tolerance: 0.03,
    context: `A: ${A}, rA: ${(rA * 100).toFixed(1)}%; B: ${B}, rB: ${(rB * 100).toFixed(1)}%`,
    unit: "%",
  };
}

// ===== annual_avg 年平均量 =====
function genAnnualAvg(): DataQuestion {
  const values: number[] = [];
  for (let i = 0; i < 5; i++) {
    values.push(randInt(10, 99));
  }
  const sum = values.reduce((a, b) => a + b, 0);
  const answer = sum / 5;
  return {
    display: `\\text{2012~2016 年平均成交量} \\approx`,
    answer: Number(answer.toFixed(2)),
    tolerance: 0.01,
    context: `各年: ${values.join(", ")} 万`,
    unit: "万",
  };
}

const GENERATORS: Record<DataType, () => DataQuestion> = {
  estimate_prev: genEstimatePrev,
  estimate_growth: genEstimateGrowth,
  baihua_frac: genBaihuaFrac,
  baihua_frac_rev: genBaihuaFracRev,
  frac_calc_lt: genFracCalcLt,
  frac_calc_gt: genFracCalcGt,
  annual_growth_rate: genAnnualGrowthRate,
  base_period_ratio: genBasePeriodRatio,
  annual_avg: genAnnualAvg,
};

export function generateDataQuestion(
  type: DataType,
  count: number,
  _difficulty?: "easy" | "normal" | "hard"
): DataQuestion[] {
  const gen = GENERATORS[type];
  const questions: DataQuestion[] = [];
  for (let i = 0; i < count; i++) {
    questions.push(gen());
  }
  return questions;
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm test src/generators/__tests__/dataAnalysis.test.ts`
预期：PASS，全部用例通过

- [ ] **步骤 5：Commit**

```bash
git add src/generators/dataAnalysis.ts src/generators/__tests__/dataAnalysis.test.ts
git commit -m "feat(l2): 资料分析 9 类题型生成器（纯函数 + 单测）"
```

---

## 任务 4：store 扩展——多题型调度 + 容差判分（TDD）

**文件：**
- 修改：`src/stores/practice.ts`
- 修改：`src/stores/__tests__/practice.test.ts`

- [ ] **步骤 1：扩展 store 测试**

在 `src/stores/__tests__/practice.test.ts` 末尾追加（不删除既有用例）：

```typescript
import { generateDataQuestion } from "@/generators/dataAnalysis";

// mock 生成器与 DB
vi.mock("@/generators/dataAnalysis", () => ({
  generateDataQuestion: vi.fn(() => [
    {
      display: "\\frac{1000}{1.1} \\approx",
      answer: 909.09,
      tolerance: 0.03,
      context: "现期: 1000, 增长率: 10%",
    },
    {
      display: "\\frac{2000}{1.2} \\approx",
      answer: 1666.67,
      tolerance: 0.03,
      context: "现期: 2000, 增长率: 20%",
    },
  ]),
}));

describe("L2 store 多题型调度", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockExecute.mockReset();
    mockSelect.mockReset();
    mockExecute.mockResolvedValue({ lastInsertId: 1 });
    mockSelect.mockResolvedValue([{ pass_s: 35, good_s: 26, excellent_s: 20 }]);
  });

  it("init 资料分析题型调度 generateDataQuestion", async () => {
    const store = usePracticeStore();
    await store.init({ type: "estimate_prev", subtype: "估算前期量", count: 2 });
    expect(generateDataQuestion).toHaveBeenCalledWith("estimate_prev", 2);
    expect(store.phase).toBe("running");
    expect(store.questions).toHaveLength(2);
  });

  it("isDataType computed 正确", async () => {
    const store = usePracticeStore();
    await store.init({ type: "estimate_prev", subtype: "估算前期量", count: 2 });
    expect(store.isDataType).toBe(true);
  });

  it("基础计算 isDataType=false", async () => {
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 2 });
    expect(store.isDataType).toBe(false);
  });

  it("questionMeta 返回资料分析元数据", async () => {
    const store = usePracticeStore();
    await store.init({ type: "estimate_prev", subtype: "估算前期量", count: 2 });
    expect(store.questionMeta).not.toBeNull();
    expect(store.questionMeta?.isData).toBe(true);
    expect(store.questionMeta?.tolerance).toBe(0.03);
    expect(store.questionMeta?.context).toContain("现期");
  });

  it("submit 容差判分——边界内正确", async () => {
    const store = usePracticeStore();
    await store.init({ type: "estimate_prev", subtype: "估算前期量", count: 2 });
    // answer=909.09, tolerance=0.03, 边界 909.09*1.03=936.36
    store.currentAnswer = "930";
    await store.submit();
    expect(store.records[0].isCorrect).toBe(true);
  });

  it("submit 容差判分——边界外错误", async () => {
    const store = usePracticeStore();
    await store.init({ type: "estimate_prev", subtype: "估算前期量", count: 2 });
    // answer=909.09, tolerance=0.03, 1000 超出 3%
    store.currentAnswer = "1000";
    await store.submit();
    expect(store.records[0].isCorrect).toBe(false);
  });

  it("submit 空答案守卫——'-' 不提交", async () => {
    const store = usePracticeStore();
    await store.init({ type: "estimate_prev", subtype: "估算前期量", count: 2 });
    store.currentAnswer = "-";
    await store.submit();
    expect(store.records).toHaveLength(0);
  });

  it("submit 空答案守卫——'0.' 不提交", async () => {
    const store = usePracticeStore();
    await store.init({ type: "estimate_prev", subtype: "估算前期量", count: 2 });
    store.currentAnswer = "0.";
    await store.submit();
    expect(store.records).toHaveLength(0);
  });

  it("preset 预填——init 后 currentAnswer 为 preset", async () => {
    // 重写 mock 返回带 preset 的题
    (generateDataQuestion as ReturnType<typeof vi.fn>).mockReturnValueOnce([
      { display: "test", answer: 0.5, tolerance: 0.02, preset: "0." },
    ]);
    const store = usePracticeStore();
    await store.init({ type: "frac_calc_lt", subtype: "分数计算", count: 1 });
    expect(store.currentAnswer).toBe("0.");
  });

  it("推进下一题时预填 next.preset", async () => {
    (generateDataQuestion as ReturnType<typeof vi.fn>).mockReturnValueOnce([
      { display: "q1", answer: 1, tolerance: 0.02 },
      { display: "q2", answer: 2, tolerance: 0.02, preset: "0." },
    ]);
    const store = usePracticeStore();
    await store.init({ type: "frac_calc_lt", subtype: "分数计算", count: 2 });
    store.currentAnswer = "1";
    await store.submit();
    expect(store.currentIndex).toBe(1);
    expect(store.currentAnswer).toBe("0.");
  });

  it("records.question 存 KaTeX 源串", async () => {
    const store = usePracticeStore();
    await store.init({ type: "estimate_prev", subtype: "估算前期量", count: 2 });
    store.currentAnswer = "909";
    await store.submit();
    expect(store.records[0].question).toContain("\\frac");
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`cd /Users/linkslinks/project/speed_calc/.worktrees/level-2 && pnpm test src/stores/__tests__/practice.test.ts`
预期：FAIL，新用例报错（isDataType/questionMeta/preset 等不存在）

- [ ] **步骤 3：修改 store 实现**

修改 `src/stores/practice.ts`：

1. 顶部 import 区追加：
```typescript
import { generateDataQuestion, type DataQuestion, type DataType } from "@/generators/dataAnalysis";
```

2. 在 `const questions = ref<Question[]>([]);` 上方追加类型联合：
```typescript
type AnyQuestion = Question | DataQuestion;
```
并将 `const questions = ref<Question[]>([]);` 改为：
```typescript
const questions = ref<AnyQuestion[]>([]);
```

3. 在 `const progress = computed(...)` 后追加两个 computed：
```typescript
const isDataType = computed(() => config.value?.type !== "basic_addsub");

const questionMeta = computed(() => {
  const q = currentQuestion.value;
  if (!q) return null;
  if ("context" in q) {
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

4. 修改 `init` 函数的生成器调度与预填：
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
    records.value = [];
    elapsedMs.value = 0;
    error.value = null;
    config.value = cfg;
    const id = await insertSession({
      type: cfg.type,
      subtype: cfg.subtype,
      difficulty: "normal",
      total: cfg.count,
      nback: 0,
    });
    sessionId.value = id;
    timeStandard.value = await getTimeStandard(cfg.type, cfg.count);
    questionStartedAt.value = performance.now();
    phase.value = "running";
    startTimer();
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
    phase.value = "idle";
  }
}
```

5. 修改 `submit` 函数的判分与推进预填：
```typescript
async function submit() {
  const q = currentQuestion.value;
  if (q === null) return;
  // 空答案守卫：空串、单负号、单"0." 视为未作答
  if (currentAnswer.value === "" || currentAnswer.value === "-" || currentAnswer.value === "0.") return;
  const userAns = Number(currentAnswer.value);
  let isCorrect: boolean;
  let tolerance: number;
  if ("tolerance" in q) {
    tolerance = q.tolerance;
    isCorrect = q.answer === 0
      ? userAns === 0
      : Math.abs(userAns - q.answer) / Math.abs(q.answer) <= tolerance;
  } else {
    tolerance = 0;
    isCorrect = userAns === q.answer;
  }
  const timeSpentMs =
    questionStartedAt.value !== null
      ? Math.floor(performance.now() - questionStartedAt.value)
      : 0;
  const record: AnswerRecord = {
    qIndex: currentIndex.value,
    question: q.display,
    userAnswer: currentAnswer.value,
    trueAnswer: String(q.answer),
    isCorrect,
    timeSpentMs,
  };
  records.value.push(record);
  try {
    if (sessionId.value !== null) {
      await insertRecord({
        sessionId: sessionId.value,
        qIndex: record.qIndex,
        question: record.question,
        userAnswer: record.userAnswer,
        trueAnswer: record.trueAnswer,
        isCorrect: record.isCorrect,
        tolerance,
        timeSpentMs: record.timeSpentMs,
      });
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
  currentAnswer.value = "";
  if (currentIndex.value + 1 >= questions.value.length) {
    await finish();
  } else {
    currentIndex.value += 1;
    questionStartedAt.value = performance.now();
    const next = questions.value[currentIndex.value];
    currentAnswer.value = next && "preset" in next ? (next.preset ?? "") : "";
  }
}
```

6. 在 return 对象中追加 `isDataType` 和 `questionMeta`：
```typescript
return {
  phase, sessionId, config, questions, currentIndex, currentAnswer, records,
  elapsedMs, error, timeStandard,
  correctCount, errorCount, totalCount, accuracy, currentQuestion, progress,
  isDataType, questionMeta,  // 新增
  init, inputChar, toggleSign, clearAnswer, backspace, submit, finish, restart, reset,
};
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm test src/stores/__tests__/practice.test.ts`
预期：PASS，既有 12 用例 + 新增 L2 用例全部通过

- [ ] **步骤 5：运行全量测试验证不回归**

运行：`pnpm test`
预期：PASS，所有测试通过（L1 38 + L2 新增）

- [ ] **步骤 6：Commit**

```bash
git add src/stores/practice.ts src/stores/__tests__/practice.test.ts
git commit -m "feat(l2): store 多题型调度 + 容差判分 + preset 预填"
```

---

## 任务 5：QuestionDisplay 组件（TDD）

**文件：**
- 创建：`src/components/QuestionDisplay.vue`
- 创建：`src/components/__tests__/QuestionDisplay.test.ts`

- [ ] **步骤 1：编写 QuestionDisplay 失败的测试**

创建 `src/components/__tests__/QuestionDisplay.test.ts`：

```typescript
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import QuestionDisplay from "@/components/QuestionDisplay.vue";

describe("QuestionDisplay.vue", () => {
  it("基础计算模式渲染纯文本 display", () => {
    const wrapper = mount(QuestionDisplay, {
      props: {
        display: "61+84=",
        isData: false,
        answer: "145",
      },
    });
    expect(wrapper.text()).toContain("61+84=");
    expect(wrapper.text()).toContain("145");
  });

  it("基础计算模式不渲染 context", () => {
    const wrapper = mount(QuestionDisplay, {
      props: { display: "61+84=", isData: false, answer: "145" },
    });
    expect(wrapper.find(".context").exists()).toBe(false);
  });

  it("资料分析模式渲染 KaTeX", () => {
    const wrapper = mount(QuestionDisplay, {
      props: {
        display: "\\frac{9738}{1.102} \\approx",
        isData: true,
        answer: "8836",
      },
    });
    expect(wrapper.html()).toContain("katex");
  });

  it("资料分析模式渲染 context", () => {
    const wrapper = mount(QuestionDisplay, {
      props: {
        display: "test",
        isData: true,
        answer: "100",
        context: "现期: 9738, 增长率: 10.2%",
      },
    });
    expect(wrapper.find(".context").text()).toContain("现期");
  });

  it("tolerance 渲染误差行", () => {
    const wrapper = mount(QuestionDisplay, {
      props: { display: "t", isData: true, answer: "1", tolerance: 0.03 },
    });
    expect(wrapper.find(".tolerance").text()).toContain("±3%");
  });

  it("无 tolerance 不渲染误差行", () => {
    const wrapper = mount(QuestionDisplay, {
      props: { display: "t", isData: true, answer: "1" },
    });
    expect(wrapper.find(".tolerance").exists()).toBe(false);
  });

  it("hint 渲染提示行", () => {
    const wrapper = mount(QuestionDisplay, {
      props: { display: "t", isData: true, answer: "1", hint: "建议写到小数点后2~3位" },
    });
    expect(wrapper.find(".hint").text()).toContain("小数点后");
  });

  it("unit 渲染单位", () => {
    const wrapper = mount(QuestionDisplay, {
      props: { display: "t", isData: true, answer: "9.1", unit: "%" },
    });
    expect(wrapper.find(".unit").text()).toBe("%");
  });

  it("standardText 渲染时间标准行", () => {
    const wrapper = mount(QuestionDisplay, {
      props: {
        display: "t", isData: false, answer: "1",
        standardText: "合格 28s  良好 22s  优秀 18s",
      },
    });
    expect(wrapper.find(".standard").text()).toContain("合格");
  });

  it("无 standardText 不渲染标准行", () => {
    const wrapper = mount(QuestionDisplay, {
      props: { display: "t", isData: false, answer: "1" },
    });
    expect(wrapper.find(".standard").exists()).toBe(false);
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`cd /Users/linkslinks/project/speed_calc/.worktrees/level-2 && pnpm test src/components/__tests__/QuestionDisplay.test.ts`
预期：FAIL，报错 "Failed to resolve import '@/components/QuestionDisplay.vue'"

- [ ] **步骤 3：实现 QuestionDisplay 组件**

创建 `src/components/QuestionDisplay.vue`：

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
    <!-- 基础计算：纯文本 -->
    <div v-if="!isData" class="formula basic">
      <span class="expr">{{ display }}</span>
      <span class="answer-inline">{{ answer }}</span>
      <span class="cursor">|</span>
    </div>
    <!-- 资料分析：KaTeX -->
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

<style scoped lang="scss">
.question-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.formula {
  font-size: 40px;
  font-family: "JetBrains Mono", "SF Mono", monospace;
  color: var(--app-text-primary, #93a1a1);
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.answer-inline {
  color: var(--app-color-primary, #5faf6f);
  font-weight: 600;
  min-width: 60px;
  display: inline-block;
  text-align: left;
}

.cursor {
  color: var(--app-color-primary, #5faf6f);
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.context {
  font-size: 15px;
  color: var(--app-text-secondary, #586e75);
}

.tolerance {
  font-size: 14px;
  color: var(--app-text-secondary, #586e75);
}

.hint {
  font-size: 13px;
  color: var(--app-text-secondary, #586e75);
  font-style: italic;
}

.unit {
  font-size: 28px;
  color: var(--app-text-primary, #93a1a1);
}

.standard {
  font-size: 15px;
  color: var(--app-text-secondary, #586e75);
  font-variant-numeric: tabular-nums;
}
</style>
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm test src/components/__tests__/QuestionDisplay.test.ts`
预期：PASS，10 个用例通过

- [ ] **步骤 5：Commit**

```bash
git add src/components/QuestionDisplay.vue src/components/__tests__/QuestionDisplay.test.ts
git commit -m "feat(l2): QuestionDisplay 动态渲染（基础纯文本/资料KaTeX+上下文+误差行）"
```

---

## 任务 6：PracticeSession 改造——接入 QuestionDisplay + Numpad variant 动态

**文件：**
- 修改：`src/views/PracticeSession.vue`

- [ ] **步骤 1：修改 PracticeSession.vue**

在 `src/views/PracticeSession.vue` 中：

1. script setup 顶部 import 区追加：
```typescript
import QuestionDisplay from "@/components/QuestionDisplay.vue";
```

2. 将 `<template>` 中的 `<div class="question-area">...</div>` 整段替换为：
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
```

3. 将 `<Numpad` 标签的 `variant="basic"` 改为动态绑定：
```vue
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

4. 删除原 `.question-area` / `.formula` / `.answer-inline` / `.cursor` / `.standard-row` 的 `<style>` 块（已移入 QuestionDisplay），保留其余样式（.practice-session / .flash-* / .back-btn）。

- [ ] **步骤 2：运行全量测试验证不回归**

运行：`cd /Users/linkslinks/project/speed_calc/.worktrees/level-2 && pnpm test`
预期：PASS，所有测试通过

- [ ] **步骤 3：vue-tsc 类型检查**

运行：`pnpm build`
预期：vue-tsc 0 错误，vite build 成功

- [ ] **步骤 4：Commit**

```bash
git add src/views/PracticeSession.vue
git commit -m "feat(l2): PracticeSession 接入 QuestionDisplay + Numpad variant 动态"
```

---

## 任务 7：DataAnalysisSettings 设置页

**文件：**
- 创建：`src/views/DataAnalysisSettings.vue`

- [ ] **步骤 1：实现 DataAnalysisSettings.vue**

创建 `src/views/DataAnalysisSettings.vue`：

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { usePracticeStore } from "@/stores/practice";

const router = useRouter();
const store = usePracticeStore();

// 9 题型（computation-area.md §2.1 + levels.md L2）
const questionTypes: { label: string; type: string }[] = [
  { label: "估算前期量", type: "estimate_prev" },
  { label: "估算增长量", type: "estimate_growth" },
  { label: "百化分", type: "baihua_frac" },
  { label: "百化分反向", type: "baihua_frac_rev" },
  { label: "分数计算(＜)", type: "frac_calc_lt" },
  { label: "分数计算(＞)", type: "frac_calc_gt" },
  { label: "年均增长率", type: "annual_growth_rate" },
  { label: "基期比重", type: "base_period_ratio" },
  { label: "年平均量", type: "annual_avg" },
];
const selectedType = ref(0);

// 题量：资料分析原版 5/10/15/20/25/自定义5-100
const countOptions = [5, 10, 15, 20, 25];
const selectedCount = ref(10);
const customCount = ref(10);
const isCustom = ref(false);
const dialogVisible = ref(false);

let savedCount = 10;
let savedIsCustom = false;

function openDialog() {
  savedCount = selectedCount.value;
  savedIsCustom = isCustom.value;
  dialogVisible.value = true;
}

function cancelDialog() {
  selectedCount.value = savedCount;
  isCustom.value = savedIsCustom;
  dialogVisible.value = false;
}

function selectPreset(n: number) {
  selectedCount.value = n;
  isCustom.value = false;
  dialogVisible.value = false;
}

function confirmCustom() {
  selectedCount.value = Math.max(5, Math.min(100, customCount.value));
  isCustom.value = true;
  dialogVisible.value = false;
}

async function startPractice() {
  const t = questionTypes[selectedType.value];
  await store.init({
    type: t.type,
    subtype: t.label,
    count: selectedCount.value,
  });
  if (store.phase === "running") {
    router.push("/practice/session");
  } else {
    ElMessage.error(store.error ?? "练习初始化失败");
  }
}

function goHistory() {
  router.push("/history");
}
</script>

<template>
  <div class="da-settings">
    <h2 class="title">资料分析</h2>

    <!-- 题型网格 3x3 -->
    <div class="type-grid">
      <button
        v-for="(t, i) in questionTypes"
        :key="t.type"
        class="type-cell"
        :class="{ selected: i === selectedType }"
        @click="selectedType = i"
      >{{ t.label }}</button>
    </div>

    <!-- 题量行 -->
    <div class="row" @click="openDialog">
      <span class="label">题量</span>
      <span class="value">{{ selectedCount }} 题 ›</span>
    </div>

    <!-- 主按钮 -->
    <button class="start-btn" @click="startPractice">开始练习</button>

    <!-- 底部 -->
    <button class="bottom-btn" @click="goHistory">历史记录</button>

    <!-- 题量弹窗 -->
    <el-dialog v-model="dialogVisible" title="选择题量" width="320px">
      <div class="count-grid">
        <button
          v-for="n in countOptions"
          :key="n"
          class="count-opt"
          :class="{ active: !isCustom && selectedCount === n }"
          @click="selectPreset(n)"
        >{{ n }} 题</button>
        <div class="count-custom" :class="{ active: isCustom }">
          <div>自定义</div>
          <el-slider v-model="customCount" :min="5" :max="100" :step="1" />
          <div>{{ customCount }} 题</div>
          <el-button type="primary" size="small" @click="confirmCustom">确定</el-button>
        </div>
      </div>
      <template #footer>
        <el-button @click="cancelDialog">取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.da-settings {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px;
}

.title {
  color: var(--app-text-primary, #93a1a1);
  margin-bottom: 16px;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.type-cell {
  padding: 14px 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(133, 200, 142, 0.15);
  color: var(--app-text-primary, #93a1a1);
  font-size: 14px;
  cursor: pointer;
  &.selected {
    background: rgba(46, 80, 56, 0.9);
    color: #fff;
    border-color: var(--app-color-primary, #5faf6f);
  }
  &:hover {
    background: rgba(133, 200, 142, 0.25);
  }
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  margin-bottom: 12px;
  background: var(--app-bg-surface, #073642);
  border-radius: 10px;
  cursor: pointer;
}

.label {
  color: var(--app-text-primary, #93a1a1);
}

.value {
  color: var(--app-text-secondary, #586e75);
}

.start-btn {
  width: 100%;
  padding: 14px;
  margin: 16px 0 12px;
  background: var(--app-color-primary, #5faf6f);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: #6fbf7f;
  }
}

.bottom-btn {
  width: 100%;
  padding: 10px;
  background: var(--app-bg-surface, #073642);
  color: var(--app-text-primary, #93a1a1);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;
}

.count-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.count-opt {
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: var(--app-bg-surface, #073642);
  color: var(--app-text-primary, #93a1a1);
  cursor: pointer;
  &.active {
    border-color: var(--app-color-primary, #5faf6f);
    background: rgba(95, 175, 111, 0.2);
  }
}

.count-custom {
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  &.active {
    border-color: var(--app-color-primary, #5faf6f);
  }
}
</style>
```

- [ ] **步骤 2：vue-tsc 类型检查**

运行：`cd /Users/linkslinks/project/speed_calc/.worktrees/level-2 && pnpm build`
预期：vue-tsc 0 错误（DataAnalysisSettings 暂未被路由引用，但 import 类型应正确）

- [ ] **步骤 3：Commit**

```bash
git add src/views/DataAnalysisSettings.vue
git commit -m "feat(l2): DataAnalysisSettings 资料分析独立设置页（9题型+题量5/10/15/20/25/自定义）"
```

---

## 任务 8：路由 + Home 接入

**文件：**
- 修改：`src/router/index.ts`
- 修改：`src/views/Home.vue`

- [ ] **步骤 1：修改路由**

修改 `src/router/index.ts`，在 `/practice` 路由后追加 `/practice/data-analysis`：

```typescript
import { createRouter, createWebHistory } from "vue-router";
import PracticeSettings from "@/views/PracticeSettings.vue";
import DataAnalysisSettings from "@/views/DataAnalysisSettings.vue";
import PracticeSession from "@/views/PracticeSession.vue";
import PracticeResult from "@/views/PracticeResult.vue";
import Home from "@/views/Home.vue";
import History from "@/views/History.vue";
import Stats from "@/views/Stats.vue";
import Settings from "@/views/Settings.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/home" },
    { path: "/home", name: "home", component: Home },
    { path: "/practice", name: "practice", component: PracticeSettings },
    { path: "/practice/data-analysis", name: "data-analysis-settings", component: DataAnalysisSettings },
    { path: "/practice/session", name: "practice-session", component: PracticeSession },
    { path: "/practice/result", name: "practice-result", component: PracticeResult },
    { path: "/history", name: "history", component: History },
    { path: "/stats", name: "stats", component: Stats },
    { path: "/settings", name: "settings", component: Settings },
  ],
});

export default router;
```

- [ ] **步骤 2：修改 Home.vue "资料分析"卡片跳转**

读取 `src/views/Home.vue` 找到"资料分析"卡片的点击处理，改为跳 `/practice/data-analysis`。具体实现依赖 Home.vue 现有结构——若 L0 占位为 toast，改为 `router.push("/practice/data-analysis")`。

```vue
<script setup lang="ts">
import { useRouter } from "vue-router";
const router = useRouter();
function goDataAnalysis() {
  router.push("/practice/data-analysis");
}
</script>
```

在"资料分析"卡片按钮上绑定 `@click="goDataAnalysis"`。

- [ ] **步骤 3：运行全量测试验证不回归**

运行：`cd /Users/linkslinks/project/speed_calc/.worktrees/level-2 && pnpm test`
预期：PASS

- [ ] **步骤 4：vue-tsc + vite build**

运行：`pnpm build`
预期：vue-tsc 0 错误，vite build 成功

- [ ] **步骤 5：Commit**

```bash
git add src/router/index.ts src/views/Home.vue
git commit -m "feat(l2): 路由 /practice/data-analysis + Home 资料分析卡片跳转"
```

---

## 任务 9：cargo build + ad-hoc 签名 + 启动验证

**文件：** 无（仅验证）

- [ ] **步骤 1：cargo build 验证 migration 0003**

运行：
```bash
cd /Users/linkslinks/project/speed_calc/.worktrees/level-2/src-tauri
export PATH="/opt/homebrew/opt/rustup/bin:/opt/homebrew/bin:$PATH"
cargo build
```
预期：编译成功

- [ ] **步骤 2：ad-hoc 签名（macOS TCC 要求）**

运行：
```bash
codesign --force --sign - --entitlements entitlements.plist target/debug/speed-calc
```
预期：签名成功

- [ ] **步骤 3：启动 binary 验证不 panic**

运行（非阻塞，观察 5 秒后停止）：
```bash
./target/debug/speed-calc
```
预期：5 秒内无 panic 输出

- [ ] **步骤 4：验证 DB migration 0003 应用**

运行：
```bash
sqlite3 ~/Library/Application\ Support/com.speedcalc.app/speedcalc.db "SELECT question_type, question_count, pass_s, good_s, excellent_s FROM time_standards WHERE question_type LIKE 'estimate%' OR question_type LIKE 'baihua%' OR question_type LIKE 'frac%' OR question_type LIKE 'annual%' OR question_type = 'base_period_ratio' ORDER BY question_type, question_count;"
```
预期：9 行资料分析种子（若首次启动该 binary 后）

- [ ] **步骤 5：运行全量测试最终确认**

运行：`cd /Users/linkslinks/project/speed_calc/.worktrees/level-2 && pnpm test`
预期：所有测试通过

- [ ] **步骤 6：Commit（如有遗留改动）**

```bash
git status
# 若无改动则跳过；若有则 git add + commit
```

---

## 任务 10：最终验收

**文件：** 无（验收清单核查）

- [ ] **步骤 1：代码路径核查验收清单**

逐项核查 `docs/superpowers/specs/2026-07-03-level-2-data-analysis-design.md` §15 验收清单：

1. 9 类题型各能出题——`generateDataQuestion` 9 类 + 单测覆盖
2. 误差判断按表正确——`submit` 容差判分 + 单测边界
3. KaTeX 公式正确渲染——Katex.vue + QuestionDisplay 测试
4. 双输入可用于小数/负数——Numpad variant=data + preset 预填
5. 时间标准按题型×题量查表显示——getTimeStandard + 9 类种子
6. 历史记录可见资料分析会话——History.vue 按 `subtype || type` 显示（L1 已实现）
7. 资料分析设置页 9 题型网格 + 题量可选——DataAnalysisSettings.vue
8. L1 基础计算闭环不回归——38 测试通过

- [ ] **步骤 2：UI 交互验收（启动 .app 用户点击）**

启动 release .app，按清单点击验收：
1. Home → 资料分析卡片 → 进入设置页（9 题型网格）
2. 选"估算前期量" + 题量 10 → 开始练习 → 答题页
3. 核对 KaTeX 公式渲染（分数真分数排版）
4. 核对上下文行 + 误差行 + 时间标准行
5. 物理键盘输入数字 + Enter 提交 → flash 反馈
6. 屏幕键盘（无 ±）输入 + 确定 → 同样反馈
7. 答完 10 题 → 结算页 → 查看历史 → 见资料分析会话

- [ ] **步骤 3：包体积验证**

运行：`pnpm tauri build`，测量 .app 体积
预期：< 30 MB（硬约束）

- [ ] **步骤 4：记录验收结果**

若全部通过，准备使用 `superpowers:finishing-a-development-branch` 收尾。
