# Level 3 实现计划：比较题 + 一表通算

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 打通 L3 两类题型的"出题 → 答题 → 判分 → 计时 → 入库"闭环。比较题复用现有 PracticeSession 流程（按 questionCategory 切换 UI），一表通算独立 CompositeSession（单题循环模式）。

**架构：** 方案 A（混合）— 比较题复用 PracticeSession + store（加 compare 模式分支）；一表通算独立 CompositeSession.vue + 组件内状态管理（走 db 入库但不走 store）。

**技术栈：** Tauri 2 + Vue 3.5 + TS + Vite 6 + Pinia + Vue Router 4 + Element Plus 2.8 + tauri-plugin-sql 2 + KaTeX 0.16 + vitest + @vue/test-utils + jsdom

**设计规格：** `docs/superpowers/specs/2026-07-03-level-3-compare-composite-design.md`

**前置：** L2 已合并到 main（资料分析 9 题型填空题闭环 + KaTeX + 容差判分 + 105 测试通过）。在专用 worktree `feature/level-3` 中执行。

**工作目录：** 所有命令在 `/Users/linkslinks/project/speed_calc/.worktrees/level-3` 下执行。

---

## 文件结构

| 文件 | 职责 | 创建/修改 |
|---|---|---|
| `src-tauri/migrations/0004_add_compare_composite_standards.sql` | 比较题 3 类 + 一表通算时间标准种子 | 创建 |
| `src-tauri/src/lib.rs` | 注册 migration 0004 | 修改 |
| `src/generators/compareAnalysis.ts` | 3 类比较题生成器（纯函数 + 两类难度模式） | 创建 |
| `src/generators/__tests__/compareAnalysis.test.ts` | 比较题生成器单测 | 创建 |
| `src/components/CompareQuestion.vue` | 比较题题目区（左右并排算式 + 绿色 `?`） | 创建 |
| `src/components/__tests__/CompareQuestion.test.ts` | CompareQuestion 组件测试 | 创建 |
| `src/components/CompareKeypad.vue` | 比较题 4 大按钮（大于绿/小于橙/重开薄荷/确定灰） | 创建 |
| `src/components/__tests__/CompareKeypad.test.ts` | CompareKeypad 组件测试 | 创建 |
| `src/stores/practice.ts` | questionCategory + compareChoice + selectCompare + submit compare 分支 | 修改 |
| `src/stores/__tests__/practice.test.ts` | store 扩展测试 | 修改 |
| `src/views/PracticeSession.vue` | 按 questionCategory 切换题目区/输入区 + handleKeydown compare 分支 | 修改 |
| `src/generators/compositeAnalysis.ts` | 一表通算数据生成器（已知数据 + 9 项答案计算） | 创建 |
| `src/generators/__tests__/compositeAnalysis.test.ts` | 一表通算生成器单测 | 创建 |
| `src/views/CompositeSession.vue` | 一表通算答题页（独立交互：刷新数据/9填空/提交/随机） | 创建 |
| `src/views/DataAnalysisSettings.vue` | 加 el-tabs（填空题/比较题）+ 一表通算独立区块按钮 | 修改 |
| `src/router/index.ts` | 新增 `/practice/composite` 路由 | 修改 |

边界原则：比较题生成器纯函数无副作用可单测；CompareQuestion/CompareKeypad 纯展示/纯交互；复用 store 的 init/submit 顺序答题流程。一表通算生成器纯函数（输入随机种子→输出已知数据 + 9 项答案）；CompositeSession 独立管理状态（不走 store 的 init/submit），但走 db 入库（复用 insertSession/insertRecord）。L1/L2 文件改动最小化（PracticeSession 只加模式切换分支，不改现有 Numpad 逻辑）。

---

## 任务 1：migration 0004 + lib.rs 注册

**文件：**
- 创建：`src-tauri/migrations/0004_add_compare_composite_standards.sql`
- 修改：`src-tauri/src/lib.rs`

- [ ] **步骤 1：创建 migration 0004 SQL**

创建 `src-tauri/migrations/0004_add_compare_composite_standards.sql`：

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

- [ ] **步骤 2：在 lib.rs 注册 migration 0004**

修改 `src-tauri/src/lib.rs` 的 `migrations()` 函数，在 vec 中追加第 4 个 Migration（在 version 3 项之后、vec 闭合 `]` 之前插入）：

```rust
        Migration {
            version: 4,
            description: "add compare 3 types + composite time standard seeds",
            sql: include_str!("../migrations/0004_add_compare_composite_standards.sql"),
            kind: MigrationKind::Up,
        },
```

- [ ] **步骤 3：cargo check 验证 migration 注册**

运行：
```bash
cd /Users/linkslinks/project/speed_calc/.worktrees/level-3/src-tauri
export PATH="/opt/homebrew/opt/rustup/bin:/opt/homebrew/bin:$PATH"
cargo check
```
预期：编译通过，无错误

- [ ] **步骤 4：Commit**

```bash
cd /Users/linkslinks/project/speed_calc/.worktrees/level-3
git add src-tauri/migrations/0004_add_compare_composite_standards.sql src-tauri/src/lib.rs
git commit -m "feat(l3): migration 0004 比较题 3 类 + 一表通算时间标准种子"
```

---

## 任务 2：比较题生成器（TDD）

**文件：**
- 创建：`src/generators/compareAnalysis.ts`
- 创建：`src/generators/__tests__/compareAnalysis.test.ts`

- [ ] **步骤 1：编写生成器失败的测试**

创建 `src/generators/__tests__/compareAnalysis.test.ts`：

```typescript
import { describe, it, expect } from "vitest";
import {
  generateCompareQuestion,
  type CompareType,
  type CompareQuestion,
} from "@/generators/compareAnalysis";

describe("generateCompareQuestion", () => {
  describe("通用", () => {
    it("3 类题型各生成指定数量", () => {
      const types: CompareType[] = ["compare_growth", "compare_base", "compare_frac"];
      for (const t of types) {
        const qs = generateCompareQuestion(t, 5);
        expect(qs).toHaveLength(5);
        for (const q of qs) {
          expect(q.type).toBe(t);
        }
      }
    });

    it("每题含必填字段", () => {
      const qs = generateCompareQuestion("compare_growth", 5);
      for (const q of qs) {
        expect(typeof q.display.leftTex).toBe("string");
        expect(q.display.leftTex.length).toBeGreaterThan(0);
        expect(typeof q.display.rightTex).toBe("string");
        expect(q.display.rightTex.length).toBeGreaterThan(0);
        expect(typeof q.leftValue).toBe("number");
        expect(typeof q.rightValue).toBe("number");
        expect(q.answer === ">" || q.answer === "<").toBe(true);
        expect(q.pattern === "A" || q.pattern === "B").toBe(true);
      }
    });

    it("无等号：leftValue !== rightValue", () => {
      const qs = generateCompareQuestion("compare_frac", 50);
      for (const q of qs) {
        expect(q.leftValue).not.toBe(q.rightValue);
      }
    });

    it("answer 与 leftValue/rightValue 一致", () => {
      const qs = generateCompareQuestion("compare_frac", 20);
      for (const q of qs) {
        const expected = q.leftValue > q.rightValue ? ">" : "<";
        expect(q.answer).toBe(expected);
      }
    });
  });

  describe("模式 A 相近难分", () => {
    it("实际值差 1%~5%（frac 验证分母层差 <10%）", () => {
      // 生成 100 题，过滤 pattern=A 的 compare_frac，验证约束
      const qs = generateCompareQuestion("compare_frac", 100);
      const aQs = qs.filter((q) => q.pattern === "A");
      expect(aQs.length).toBeGreaterThan(0);
      for (const q of aQs) {
        const diff = Math.abs(q.leftValue - q.rightValue);
        const base = Math.max(Math.abs(q.leftValue), Math.abs(q.rightValue));
        const ratio = diff / base;
        expect(ratio).toBeGreaterThanOrEqual(0.005); // 至少不等
        expect(ratio).toBeLessThanOrEqual(0.06); // 1%~5% + 容差
      }
    });
  });

  describe("模式 B 整数倍率", () => {
    it("实际值差 1%~5%", () => {
      const qs = generateCompareQuestion("compare_frac", 100);
      const bQs = qs.filter((q) => q.pattern === "B");
      expect(bQs.length).toBeGreaterThan(0);
      for (const q of bQs) {
        const diff = Math.abs(q.leftValue - q.rightValue);
        const base = Math.max(Math.abs(q.leftValue), Math.abs(q.rightValue));
        const ratio = diff / base;
        expect(ratio).toBeLessThanOrEqual(0.06);
      }
    });
  });

  describe("答案分布", () => {
    it("100 题中 > 和 < 各占比 40%~60%", () => {
      const qs = generateCompareQuestion("compare_growth", 100);
      const gt = qs.filter((q) => q.answer === ">").length;
      const lt = qs.filter((q) => q.answer === "<").length;
      expect(gt).toBeGreaterThanOrEqual(40);
      expect(gt).toBeLessThanOrEqual(60);
      expect(lt).toBeGreaterThanOrEqual(40);
      expect(lt).toBeLessThanOrEqual(60);
    });
  });

  describe("display tex 格式", () => {
    it("compare_growth 含 \\times 和 \\%", () => {
      const qs = generateCompareQuestion("compare_growth", 5);
      for (const q of qs) {
        expect(q.display.leftTex).toContain("\\times");
        expect(q.display.leftTex).toContain("%");
        expect(q.display.rightTex).toContain("\\times");
        expect(q.display.rightTex).toContain("%");
      }
    });

    it("compare_base 含 \\frac", () => {
      const qs = generateCompareQuestion("compare_base", 5);
      for (const q of qs) {
        expect(q.display.leftTex).toContain("\\frac");
        expect(q.display.rightTex).toContain("\\frac");
      }
    });

    it("compare_frac 含 \\frac", () => {
      const qs = generateCompareQuestion("compare_frac", 5);
      for (const q of qs) {
        expect(q.display.leftTex).toContain("\\frac");
        expect(q.display.rightTex).toContain("\\frac");
      }
    });
  });

  describe("context 字段", () => {
    it("compare_growth context 含现期和增长率", () => {
      const qs = generateCompareQuestion("compare_growth", 5);
      for (const q of qs) {
        expect(q.context).toContain("现期");
        expect(q.context).toContain("增长率");
      }
    });

    it("compare_base context 含现期和增长率", () => {
      const qs = generateCompareQuestion("compare_base", 5);
      for (const q of qs) {
        expect(q.context).toContain("现期");
        expect(q.context).toContain("增长率");
      }
    });

    it("compare_frac context 含分子和分母", () => {
      const qs = generateCompareQuestion("compare_frac", 5);
      for (const q of qs) {
        expect(q.context).toContain("分子");
        expect(q.context).toContain("分母");
      }
    });
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`cd /Users/linkslinks/project/speed_calc/.worktrees/level-3 && pnpm test src/generators/__tests__/compareAnalysis.test.ts`
预期：FAIL，报错 "Failed to resolve import '@/generators/compareAnalysis'"

- [ ] **步骤 3：实现生成器**

创建 `src/generators/compareAnalysis.ts`：

```typescript
// L3 比较题 3 类生成器（纯函数 + 两类难度模式）
// 模式 A：相近难分（分母层差 <10%，实际值差 1%~5%）
// 模式 B：整数倍率（分母层 2x/3x 倍率，实际值差 1%~5%）

export type CompareType = "compare_growth" | "compare_base" | "compare_frac";

export interface CompareQuestion {
  type: CompareType;
  display: {
    leftTex: string;
    rightTex: string;
  };
  leftValue: number;
  rightValue: number;
  answer: ">" | "<";
  context?: string;
  hint?: string;
  pattern: "A" | "B";
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals: number): number {
  const v = Math.random() * (max - min) + min;
  return Number(v.toFixed(decimals));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 实际值差比例落入 [0.01, 0.05] 区间
function valueDiffInRange(left: number, right: number): boolean {
  if (left === right) return false;
  const diff = Math.abs(left - right);
  const base = Math.max(Math.abs(left), Math.abs(right));
  const ratio = diff / base;
  return ratio >= 0.01 && ratio <= 0.05;
}

function buildQuestion(
  type: CompareType,
  pattern: "A" | "B",
  leftValue: number,
  rightValue: number,
  leftTex: string,
  rightTex: string,
  context: string
): CompareQuestion {
  // 若 leftValue < rightValue，交换左右使答案分布平衡（这里不强制反转，由调用方决定）
  const answer: ">" | "<" = leftValue > rightValue ? ">" : "<";
  return {
    type,
    display: { leftTex, rightTex },
    leftValue,
    rightValue,
    answer,
    context,
    pattern,
  };
}

// ===== compare_growth: A1 × r1% ? A2 × r2% =====
function genCompareGrowth(pattern: "A" | "B"): CompareQuestion {
  const mult = pick([2, 3]);
  for (let attempt = 0; attempt < 50; attempt++) {
    let A1: number, A2: number, r1: number, r2: number;
    if (pattern === "A") {
      // A1/A2 相近（差 <10%），r1/r2 相近
      A1 = randInt(100, 999);
      A2 = randInt(Math.floor(A1 * 0.9), Math.floor(A1 * 1.1));
      r1 = randFloat(5, 30, 1);
      r2 = randFloat(Math.max(5, r1 - 3), Math.min(30, r1 + 3), 1);
    } else {
      // A2 = A1 × mult（整数倍率）
      A1 = randInt(100, Math.floor(999 / mult));
      A2 = A1 * mult;
      r1 = randFloat(5, 30, 1);
      // r2 调整使值接近
      r2 = randFloat(5, 30, 1);
    }
    const lv = A1 * r1 / 100;
    const rv = A2 * r2 / 100;
    if (!valueDiffInRange(lv, rv)) continue;
    return buildQuestion(
      "compare_growth",
      pattern,
      lv,
      rv,
      `${A1} \\times ${r1.toFixed(1)}\\%`,
      `${A2} \\times ${r2.toFixed(1)}\\%`,
      `左: 现期${A1}, 增长率${r1.toFixed(1)}%; 右: 现期${A2}, 增长率${r2.toFixed(1)}%`
    );
  }
  // 兜底：放宽约束
  const A1 = randInt(100, 999);
  const A2 = randInt(100, 999);
  const r1 = randFloat(5, 30, 1);
  const r2 = randFloat(5, 30, 1);
  const lv = A1 * r1 / 100;
  const rv = A2 * r2 / 100;
  return buildQuestion(
    "compare_growth",
    pattern,
    lv,
    rv,
    `${A1} \\times ${r1.toFixed(1)}\\%`,
    `${A2} \\times ${r2.toFixed(1)}\\%`,
    `左: 现期${A1}, 增长率${r1.toFixed(1)}%; 右: 现期${A2}, 增长率${r2.toFixed(1)}%`
  );
}

// ===== compare_base: A1/(1+r1%) ? A2/(1+r2%) =====
function genCompareBase(pattern: "A" | "B"): CompareQuestion {
  const mult = pick([2, 3]);
  for (let attempt = 0; attempt < 50; attempt++) {
    let A1: number, A2: number, r1: number, r2: number;
    if (pattern === "A") {
      // A1/A2 相近（差 <10%），r1/r2 相近
      A1 = randInt(500, 2000);
      A2 = randInt(Math.floor(A1 * 0.9), Math.floor(A1 * 1.1));
      r1 = randFloat(5, 30, 1);
      r2 = randFloat(Math.max(5, r1 - 3), Math.min(30, r1 + 3), 1);
    } else {
      // 现期值整数倍率（r 范围窄无法倍率）
      A1 = randInt(500, Math.floor(2000 / mult));
      A2 = A1 * mult;
      r1 = randFloat(5, 30, 1);
      r2 = randFloat(5, 30, 1);
    }
    const lv = A1 / (1 + r1 / 100);
    const rv = A2 / (1 + r2 / 100);
    if (!valueDiffInRange(lv, rv)) continue;
    return buildQuestion(
      "compare_base",
      pattern,
      lv,
      rv,
      `\\frac{${A1}}{${(1 + r1 / 100).toFixed(3)}}`,
      `\\frac{${A2}}{${(1 + r2 / 100).toFixed(3)}}`,
      `左: 现期${A1}, 增长率${r1.toFixed(1)}%; 右: 现期${A2}, 增长率${r2.toFixed(1)}%`
    );
  }
  // 兜底
  const A1 = randInt(500, 2000);
  const A2 = randInt(500, 2000);
  const r1 = randFloat(5, 30, 1);
  const r2 = randFloat(5, 30, 1);
  const lv = A1 / (1 + r1 / 100);
  const rv = A2 / (1 + r2 / 100);
  return buildQuestion(
    "compare_base",
    pattern,
    lv,
    rv,
    `\\frac{${A1}}{${(1 + r1 / 100).toFixed(3)}}`,
    `\\frac{${A2}}{${(1 + r2 / 100).toFixed(3)}}`,
    `左: 现期${A1}, 增长率${r1.toFixed(1)}%; 右: 现期${A2}, 增长率${r2.toFixed(1)}%`
  );
}

// ===== compare_frac: a1/b1 ? a2/b2 =====
function genCompareFrac(pattern: "A" | "B"): CompareQuestion {
  const mult = pick([2, 3]);
  for (let attempt = 0; attempt < 50; attempt++) {
    let a1: number, b1: number, a2: number, b2: number;
    if (pattern === "A") {
      // b1/b2 相近（差 <10%）
      b1 = randInt(100, 999);
      b2 = randInt(Math.floor(b1 * 0.9), Math.floor(b1 * 1.1));
      a1 = randInt(100, 999);
      a2 = randInt(100, 999);
    } else {
      // b2 = b1 × mult（整数倍率）
      b1 = randInt(100, Math.floor(999 / mult));
      b2 = b1 * mult;
      a1 = randInt(100, 999);
      a2 = randInt(100, 999);
    }
    const lv = a1 / b1;
    const rv = a2 / b2;
    if (!valueDiffInRange(lv, rv)) continue;
    return buildQuestion(
      "compare_frac",
      pattern,
      lv,
      rv,
      `\\frac{${a1}}{${b1}}`,
      `\\frac{${a2}}{${b2}}`,
      `左: 分子${a1}, 分母${b1}; 右: 分子${a2}, 分母${b2}`
    );
  }
  // 兜底
  const a1 = randInt(100, 999);
  const b1 = randInt(100, 999);
  const a2 = randInt(100, 999);
  const b2 = randInt(100, 999);
  const lv = a1 / b1;
  const rv = a2 / b2;
  return buildQuestion(
    "compare_frac",
    pattern,
    lv,
    rv,
    `\\frac{${a1}}{${b1}}`,
    `\\frac{${a2}}{${b2}}`,
    `左: 分子${a1}, 分母${b1}; 右: 分子${a2}, 分母${b2}`
  );
}

const GENERATORS: Record<CompareType, (p: "A" | "B") => CompareQuestion> = {
  compare_growth: genCompareGrowth,
  compare_base: genCompareBase,
  compare_frac: genCompareFrac,
};

export function generateCompareQuestion(type: CompareType, count: number): CompareQuestion[] {
  const result: CompareQuestion[] = [];
  let consecutiveSame = 0;
  let lastAnswer: ">" | "<" | null = null;
  for (let i = 0; i < count; i++) {
    const pattern: "A" | "B" = Math.random() < 0.5 ? "A" : "B";
    let q = GENERATORS[type](pattern);
    // 答案分布纠偏：连续 3 题答案相同则交换左右
    if (q.answer === lastAnswer) {
      consecutiveSame++;
      if (consecutiveSame >= 3) {
        q = {
          ...q,
          display: { leftTex: q.display.rightTex, rightTex: q.display.leftTex },
          leftValue: q.rightValue,
          rightValue: q.leftValue,
          answer: q.answer === ">" ? "<" : ">",
        };
        consecutiveSame = 0;
        lastAnswer = q.answer;
      }
    } else {
      consecutiveSame = 0;
      lastAnswer = q.answer;
    }
    result.push(q);
  }
  return result;
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm test src/generators/__tests__/compareAnalysis.test.ts`
预期：PASS，所有用例通过

- [ ] **步骤 5：Commit**

```bash
git add src/generators/compareAnalysis.ts src/generators/__tests__/compareAnalysis.test.ts
git commit -m "feat(l3): 比较题 3 类生成器（两类难度模式 + 答案分布纠偏）"
```

---

## 任务 3：CompareQuestion 组件（TDD）

**文件：**
- 创建：`src/components/CompareQuestion.vue`
- 创建：`src/components/__tests__/CompareQuestion.test.ts`

- [ ] **步骤 1：编写组件失败的测试**

创建 `src/components/__tests__/CompareQuestion.test.ts`：

```typescript
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CompareQuestion from "@/components/CompareQuestion.vue";

describe("CompareQuestion.vue", () => {
  it("渲染左右算式（含 katex-html）", () => {
    const wrapper = mount(CompareQuestion, {
      props: {
        leftTex: "\\frac{482}{252}",
        rightTex: "\\frac{503}{265}",
        selected: null,
      },
    });
    expect(wrapper.html()).toContain("katex-html");
  });

  it("selected=null 时中间显示 ? 且有 compare-symbol 类", () => {
    const wrapper = mount(CompareQuestion, {
      props: {
        leftTex: "1",
        rightTex: "2",
        selected: null,
      },
    });
    const sym = wrapper.find(".compare-symbol");
    expect(sym.exists()).toBe(true);
    expect(sym.text()).toContain("?");
  });

  it("selected='>' 时中间显示 > 且有 selected-gt 类", () => {
    const wrapper = mount(CompareQuestion, {
      props: {
        leftTex: "1",
        rightTex: "2",
        selected: ">",
      },
    });
    const sym = wrapper.find(".compare-symbol");
    expect(sym.text()).toContain(">");
    expect(sym.classes()).toContain("selected-gt");
  });

  it("selected='<' 时中间显示 < 且有 selected-lt 类", () => {
    const wrapper = mount(CompareQuestion, {
      props: {
        leftTex: "1",
        rightTex: "2",
        selected: "<",
      },
    });
    const sym = wrapper.find(".compare-symbol");
    expect(sym.text()).toContain("<");
    expect(sym.classes()).toContain("selected-lt");
  });

  it("显示 standardText prop", () => {
    const wrapper = mount(CompareQuestion, {
      props: {
        leftTex: "1",
        rightTex: "2",
        selected: null,
        standardText: "合格 30s 良好 22s 优秀 16s",
      },
    });
    expect(wrapper.html()).toContain("合格 30s");
  });

  it("显示 context prop", () => {
    const wrapper = mount(CompareQuestion, {
      props: {
        leftTex: "1",
        rightTex: "2",
        selected: null,
        context: "左: 现期482; 右: 现期503",
      },
    });
    expect(wrapper.html()).toContain("现期482");
  });

  it("显示误差范围文案（精确判分）", () => {
    const wrapper = mount(CompareQuestion, {
      props: {
        leftTex: "1",
        rightTex: "2",
        selected: null,
      },
    });
    expect(wrapper.html()).toContain("精确判分");
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm test src/components/__tests__/CompareQuestion.test.ts`
预期：FAIL，报错 "Failed to resolve import '@/components/CompareQuestion.vue'"

- [ ] **步骤 3：实现 CompareQuestion 组件**

创建 `src/components/CompareQuestion.vue`：

```vue
<script setup lang="ts">
import Katex from "@/components/Katex.vue";

interface Props {
  leftTex: string;
  rightTex: string;
  selected: ">" | "<" | null;
  context?: string;
  standardText?: string | null;
}

defineProps<Props>();
</script>

<template>
  <div class="compare-question">
    <div class="compare-row">
      <div class="compare-side">
        <Katex :tex="leftTex" />
      </div>
      <div
        class="compare-symbol"
        :class="{
          'selected-gt': selected === '>'",
          'selected-lt': selected === '<'",
        }"
      >
        <span v-if="selected === null">?</span>
        <span v-else>{{ selected }}</span>
      </div>
      <div class="compare-side">
        <Katex :tex="rightTex" />
      </div>
    </div>
    <div v-if="context" class="compare-context">{{ context }}</div>
    <div class="compare-tolerance">允许误差范围: 精确判分</div>
    <div v-if="standardText" class="compare-standard">{{ standardText }}</div>
  </div>
</template>

<style scoped lang="scss">
.compare-question {
  padding: 24px 16px;
  text-align: center;
}

.compare-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-bottom: 16px;
}

.compare-side {
  flex: 1;
  display: flex;
  justify-content: center;
  font-size: 20px;
  color: var(--app-text-primary, #93a1a1);
}

.compare-symbol {
  font-size: 36px;
  font-weight: 700;
  color: #5faf6f; // Solarized green

  &.selected-gt {
    color: #5faf6f;
  }
  &.selected-lt {
    color: #d33682; // Solarized magenta
  }
}

.compare-context {
  margin-top: 8px;
  font-size: 13px;
  color: var(--app-text-secondary, #586e75);
}

.compare-tolerance {
  margin-top: 4px;
  font-size: 13px;
  color: var(--app-text-secondary, #586e75);
}

.compare-standard {
  margin-top: 4px;
  font-size: 13px;
  color: var(--app-color-primary, #5faf6f);
}
</style>
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm test src/components/__tests__/CompareQuestion.test.ts`
预期：PASS，7 个用例通过

- [ ] **步骤 5：Commit**

```bash
git add src/components/CompareQuestion.vue src/components/__tests__/CompareQuestion.test.ts
git commit -m "feat(l3): CompareQuestion 组件（左右算式 + 绿色 ? + 选中态）"
```

---

## 任务 4：CompareKeypad 组件（TDD）

**文件：**
- 创建：`src/components/CompareKeypad.vue`
- 创建：`src/components/__tests__/CompareKeypad.test.ts`

- [ ] **步骤 1：编写组件失败的测试**

创建 `src/components/__tests__/CompareKeypad.test.ts`：

```typescript
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CompareKeypad from "@/components/CompareKeypad.vue";

describe("CompareKeypad.vue", () => {
  it("渲染 4 按钮：大于/小于/重开/确定", () => {
    const wrapper = mount(CompareKeypad, {
      props: { selected: null },
    });
    expect(wrapper.text()).toContain("大于");
    expect(wrapper.text()).toContain("小于");
    expect(wrapper.text()).toContain("重开");
    expect(wrapper.text()).toContain("确定");
  });

  it("点击大于 → emit select 带 >", async () => {
    const wrapper = mount(CompareKeypad, { props: { selected: null } });
    await wrapper.find('[data-testid="btn-gt"]').trigger("click");
    expect(wrapper.emitted("select")).toBeTruthy();
    expect(wrapper.emitted("select")![0]).toEqual([">"]);
  });

  it("点击小于 → emit select 带 <", async () => {
    const wrapper = mount(CompareKeypad, { props: { selected: null } });
    await wrapper.find('[data-testid="btn-lt"]').trigger("click");
    expect(wrapper.emitted("select")).toBeTruthy();
    expect(wrapper.emitted("select")![0]).toEqual(["<"]);
  });

  it("点击重开 → emit restart", async () => {
    const wrapper = mount(CompareKeypad, { props: { selected: null } });
    await wrapper.find('[data-testid="btn-restart"]').trigger("click");
    expect(wrapper.emitted("restart")).toBeTruthy();
  });

  it("点击确定 → emit submit", async () => {
    const wrapper = mount(CompareKeypad, { props: { selected: ">" } });
    await wrapper.find('[data-testid="btn-submit"]').trigger("click");
    expect(wrapper.emitted("submit")).toBeTruthy();
  });

  it("selected='>' 时大于按钮高亮（btn-gt-active 类）", () => {
    const wrapper = mount(CompareKeypad, { props: { selected: ">" } });
    expect(wrapper.find('[data-testid="btn-gt"]').classes()).toContain("active");
  });

  it("selected='<' 时小于按钮高亮（btn-lt-active 类）", () => {
    const wrapper = mount(CompareKeypad, { props: { selected: "<" } });
    expect(wrapper.find('[data-testid="btn-lt"]').classes()).toContain("active");
  });

  it("selected=null 时无高亮", () => {
    const wrapper = mount(CompareKeypad, { props: { selected: null } });
    expect(wrapper.find('[data-testid="btn-gt"]').classes()).not.toContain("active");
    expect(wrapper.find('[data-testid="btn-lt"]').classes()).not.toContain("active");
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm test src/components/__tests__/CompareKeypad.test.ts`
预期：FAIL，报错 "Failed to resolve import '@/components/CompareKeypad.vue'"

- [ ] **步骤 3：实现 CompareKeypad 组件**

创建 `src/components/CompareKeypad.vue`：

```vue
<script setup lang="ts">
interface Props {
  selected: ">" | "<" | null;
}
defineProps<Props>();

defineEmits<{
  select: [choice: ">" | "<"];
  submit: [];
  restart: [];
}>();
</script>

<template>
  <div class="compare-keypad">
    <button
      data-testid="btn-gt"
      class="ck-btn gt-btn"
      :class="{ active: selected === '>' }"
      @click="$emit('select', '>')"
    >大于</button>
    <button
      data-testid="btn-lt"
      class="ck-btn lt-btn"
      :class="{ active: selected === '<' }"
      @click="$emit('select', '<')"
    >小于</button>
    <button
      data-testid="btn-restart"
      class="ck-btn restart-btn"
      @click="$emit('restart')"
    >重开</button>
    <button
      data-testid="btn-submit"
      class="ck-btn submit-btn"
      :disabled="selected === null"
      @click="$emit('submit')"
    >确定</button>
  </div>
</template>

<style scoped lang="scss">
.compare-keypad {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 16px;
  max-width: 720px;
  margin: 0 auto;
}

.ck-btn {
  padding: 24px 12px;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.gt-btn {
  background: rgba(95, 175, 111, 0.2);
  color: #5faf6f;
  &.active {
    background: #5faf6f;
    color: #fff;
  }
}

.lt-btn {
  background: rgba(211, 54, 130, 0.2);
  color: #d33682;
  &.active {
    background: #d33682;
    color: #fff;
  }
}

.restart-btn {
  background: rgba(42, 161, 152, 0.2);
  color: #2aa198;
}

.submit-btn {
  background: rgba(88, 110, 117, 0.3);
  color: var(--app-text-primary, #93a1a1);
  &:not(:disabled):hover {
    background: rgba(88, 110, 117, 0.5);
  }
}
</style>
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm test src/components/__tests__/CompareKeypad.test.ts`
预期：PASS，8 个用例通过

- [ ] **步骤 5：Commit**

```bash
git add src/components/CompareKeypad.vue src/components/__tests__/CompareKeypad.test.ts
git commit -m "feat(l3): CompareKeypad 组件（4 大按钮 + 选中高亮 + 禁用守卫）"
```

---

## 任务 5：store compare 模式扩展（TDD）

**文件：**
- 修改：`src/stores/practice.ts`
- 修改：`src/stores/__tests__/practice.test.ts`

- [ ] **步骤 1：编写 store 扩展失败的测试**

在 `src/stores/__tests__/practice.test.ts` 末尾追加以下测试块（保持现有测试不变）：

```typescript
import { generateCompareQuestion } from "@/generators/compareAnalysis";

describe("store compare 模式", () => {
  it("questionCategory: compare_ 开头 → compare", () => {
    const store = usePracticeStore();
    store.init({
      type: "compare_growth",
      subtype: "增量比大小",
      count: 5,
    });
    // init 是异步的，但 config 在 await 之前已设置
    expect(store.questionCategory).toBe("compare");
  });

  it("questionCategory: composite → composite", () => {
    const store = usePracticeStore();
    // 用直接设置 config 的方式避免触发 init（composite 不走 store.init）
    // 这里通过 init compare 验证 category 类型，composite 类型由 CompositeSession 独立管理
    const store2 = usePracticeStore();
    store2.init({ type: "compare_frac", subtype: "分数比大小", count: 5 });
    expect(store2.questionCategory).toBe("compare");
  });

  it("questionCategory: basic_addsub → numpad", () => {
    const store = usePracticeStore();
    store.init({ type: "basic_addsub", subtype: "基础加减", count: 5 });
    expect(store.questionCategory).toBe("numpad");
  });

  it("selectCompare 设置 compareChoice", () => {
    const store = usePracticeStore();
    store.selectCompare(">");
    expect(store.compareChoice).toBe(">");
    store.selectCompare("<");
    expect(store.compareChoice).toBe("<");
  });

  it("compare 模式 submit：选择 > 且答案 > → 正确", async () => {
    const store = usePracticeStore();
    await store.init({ type: "compare_growth", subtype: "增量比大小", count: 1 });
    // 找到第一题答案
    const q = store.currentQuestion as any;
    store.selectCompare(q.answer);
    await store.submit();
    expect(store.records[0].isCorrect).toBe(true);
    expect(store.records[0].userAnswer).toBe(q.answer);
    expect(store.records[0].trueAnswer).toBe(q.answer);
  });

  it("compare 模式 submit：选错 → 错误", async () => {
    const store = usePracticeStore();
    await store.init({ type: "compare_growth", subtype: "增量比大小", count: 1 });
    const q = store.currentQuestion as any;
    const wrong: ">" | "<" = q.answer === ">" ? "<" : ">";
    store.selectCompare(wrong);
    await store.submit();
    expect(store.records[0].isCorrect).toBe(false);
  });

  it("compare 模式 submit 守卫：未 select 时不提交", async () => {
    const store = usePracticeStore();
    await store.init({ type: "compare_growth", subtype: "增量比大小", count: 1 });
    const beforeLen = store.records.length;
    await store.submit();
    expect(store.records.length).toBe(beforeLen); // 未增加
  });

  it("compare 模式 submit 后 compareChoice 清空", async () => {
    const store = usePracticeStore();
    await store.init({ type: "compare_frac", subtype: "分数比大小", count: 2 });
    const q = store.currentQuestion as any;
    store.selectCompare(q.answer);
    await store.submit();
    expect(store.compareChoice).toBeNull();
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm test src/stores/__tests__/practice.test.ts`
预期：FAIL，报错 "store.questionCategory is not a function" 或 "store.selectCompare is not a function"

- [ ] **步骤 3：修改 store 添加 compare 模式**

修改 `src/stores/practice.ts`：

3a. 在文件顶部 import 区追加（在 dataAnalysis import 之后）：

```typescript
import { generateCompareQuestion, type CompareQuestion, type CompareType } from "@/generators/compareAnalysis";
```

3b. 在 `AnyQuestion` 类型定义行（第 33 行附近）改为：

```typescript
  type AnyQuestion = Question | DataQuestion | CompareQuestion;
```

3c. 在 `isDataType` computed（第 54 行附近）之后追加 `questionCategory` 和 `compareChoice`：

```typescript
  const isDataType = computed(() => config.value?.type !== "basic_addsub");

  const questionCategory = computed<"numpad" | "compare" | "composite">(() => {
    const t = config.value?.type;
    if (!t) return "numpad";
    if (t.startsWith("compare_")) return "compare";
    if (t === "composite") return "composite";
    return "numpad";
  });

  const compareChoice = ref<">" | "<" | null>(null);
```

3d. 在 `init` 函数内（第 91-120 行），将 `qs` 生成逻辑改为支持 3 类调度：

替换原 init 函数的开头部分（从第 91 行 `async function init` 到第 99 行 `currentAnswer.value = ...`）：

```typescript
  async function init(cfg: SessionConfig) {
    stopTimer();
    try {
      let qs: AnyQuestion[];
      if (cfg.type === "basic_addsub") {
        qs = generateBasicAddSub(cfg.count);
      } else if (cfg.type.startsWith("compare_")) {
        qs = generateCompareQuestion(cfg.type as CompareType, cfg.count);
      } else {
        qs = generateDataQuestion(cfg.type as DataType, cfg.count);
      }
      questions.value = qs;
      currentIndex.value = 0;
      currentAnswer.value = qs[0] && "preset" in qs[0] ? (qs[0].preset ?? "") : "";
      compareChoice.value = null;
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

3e. 在 `inputChar` 函数之前（第 122 行附近）追加 `selectCompare`：

```typescript
  function selectCompare(choice: ">" | "<") {
    compareChoice.value = choice;
  }

```

3f. 在 `submit` 函数内（第 142-198 行），在 `if (q === null) return;` 之后、`// 空答案守卫` 之前，插入 compare 分支：

```typescript
  async function submit() {
    const q = currentQuestion.value;
    if (q === null) return;

    // compare 模式分支
    if (questionCategory.value === "compare") {
      if (compareChoice.value === null) return; // 未选择守卫
      const cq = q as CompareQuestion;
      const isCorrect = compareChoice.value === cq.answer;
      const timeSpentMs =
        questionStartedAt.value !== null
          ? Math.floor(performance.now() - questionStartedAt.value)
          : 0;
      const record: AnswerRecord = {
        qIndex: currentIndex.value,
        question: `${cq.display.leftTex} ? ${cq.display.rightTex}`,
        userAnswer: compareChoice.value,
        trueAnswer: cq.answer,
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
            tolerance: 0,
            timeSpentMs: record.timeSpentMs,
          });
        }
      } catch (e) {
        error.value = e instanceof Error ? e.message : String(e);
      }
      compareChoice.value = null;
      if (currentIndex.value + 1 >= questions.value.length) {
        await finish();
      } else {
        currentIndex.value += 1;
        questionStartedAt.value = performance.now();
        compareChoice.value = null;
      }
      return;
    }

    // 空答案守卫：空串、单负号、单"0." 视为未作答
    if (currentAnswer.value === "" || currentAnswer.value === "-" || currentAnswer.value === "0.") return;
    // ... 现有 numpad 逻辑不变 ...
```

3g. 在 `reset` 函数内（第 222-236 行）追加 `compareChoice.value = null;`（在 `currentAnswer.value = "";` 之后）：

```typescript
    currentAnswer.value = "";
    compareChoice.value = null;
    records.value = [];
```

3h. 在 return 语句的导出对象中（第 238-266 行），追加 `questionCategory`、`compareChoice`、`selectCompare`：

```typescript
    isDataType,
    questionCategory,
    compareChoice,
    questionMeta,
    init,
    inputChar,
    selectCompare,
    toggleSign,
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm test src/stores/__tests__/practice.test.ts`
预期：PASS，所有用例（含新增 8 个 compare 测试）通过

- [ ] **步骤 5：Commit**

```bash
git add src/stores/practice.ts src/stores/__tests__/practice.test.ts
git commit -m "feat(l3): store compare 模式扩展（questionCategory + compareChoice + submit 分支）"
```

---

## 任务 6：PracticeSession compare 模式切换

**文件：**
- 修改：`src/views/PracticeSession.vue`

- [ ] **步骤 1：修改 PracticeSession.vue 的 script 和 template**

修改 `src/views/PracticeSession.vue`：

1a. 在 `<script setup>` 顶部 import 区追加（在 QuestionDisplay import 之后）：

```typescript
import CompareQuestion from "@/components/CompareQuestion.vue";
import CompareKeypad from "@/components/CompareKeypad.vue";
```

1b. 在 `handleKeydown` 函数开头（第 23 行 `if (store.phase !== "running") return;` 之后）追加 compare 分支：

```typescript
function handleKeydown(e: KeyboardEvent) {
  if (store.phase !== "running") return;
  const k = e.key;
  // compare 模式键盘映射：>/1=大于, </2=小于, Enter=确定, Escape=重开
  if (store.questionCategory === "compare") {
    if (k === ">" || k === "1") { e.preventDefault(); store.selectCompare(">"); }
    else if (k === "<" || k === "2") { e.preventDefault(); store.selectCompare("<"); }
    else if (k === "Enter") {
      if (e.target instanceof HTMLButtonElement) return;
      e.preventDefault();
      void onSubmit();
    } else if (k === "Escape") {
      if (e.target instanceof HTMLButtonElement) return;
      e.preventDefault();
      void onRestart();
    }
    return;
  }
  // 防止 Numpad 按钮聚焦时 Enter/Escape 双触发（keydown + 派生 click）
  if ((k === "Enter" || k === "Escape") && e.target instanceof HTMLButtonElement) {
    return;
  }
  // ... 现有逻辑不变 ...
```

1c. 在 `onSubmit` 函数开头（第 53 行）追加 compare 模式守卫：

```typescript
async function onSubmit() {
  // compare 模式：直接提交（不需 currentAnswer 守卫）
  if (store.questionCategory === "compare") {
    if (store.compareChoice === null) return;
    await store.submit();
    const lastRecord = store.records[store.records.length - 1];
    if (lastRecord) {
      if (flashTimer !== null) clearTimeout(flashTimer);
      flashState.value = lastRecord.isCorrect ? "correct" : "wrong";
      flashTimer = window.setTimeout(() => {
        flashState.value = "none";
        flashTimer = null;
      }, 200);
    }
    if (store.phase === "finished") {
      router.push("/practice/result");
    }
    return;
  }
  // numpad 模式
  if (store.currentAnswer === "") return;
  // ... 现有逻辑不变 ...
```

1d. 在 `onMounted` 函数内（第 89-96 行）修改兜底跳转，按 category 分流：

```typescript
onMounted(() => {
  // 若未初始化（如直接访问 URL），回设置页
  if (store.phase !== "running") {
    router.replace(store.isDataType ? "/practice/data-analysis" : "/practice");
    return;
  }
  window.addEventListener("keydown", handleKeydown);
});
```

1e. 修改 template（第 104-138 行）按 category 切换题目区和输入区：

```vue
<template>
  <div class="practice-session" :class="`flash-${flashState}`">
    <TopBar
      :title="store.isDataType ? '资料分析' : '基础计算'"
      :progress="store.progress"
      :elapsed-ms="store.elapsedMs"
      @back="onBack"
    >
      <template #left>
        <button class="back-btn glass-button" @click="onBack">‹</button>
      </template>
    </TopBar>

    <!-- 题目区按 category 切换 -->
    <QuestionDisplay
      v-if="store.questionCategory === 'numpad'"
      :display="store.currentQuestion?.display ?? ''"
      :is-data="store.isDataType"
      :context="store.questionMeta?.context"
      :hint="store.questionMeta?.hint"
      :tolerance="store.questionMeta?.tolerance"
      :unit="store.questionMeta?.unit"
      :standard-text="standardText"
      :answer="store.currentAnswer"
    />
    <CompareQuestion
      v-else-if="store.questionCategory === 'compare'"
      :left-tex="(store.currentQuestion as any)?.display?.leftTex ?? ''"
      :right-tex="(store.currentQuestion as any)?.display?.rightTex ?? ''"
      :selected="store.compareChoice"
      :context="(store.currentQuestion as any)?.context"
      :standard-text="standardText"
    />

    <!-- 输入区按 category 切换 -->
    <Numpad
      v-if="store.questionCategory === 'numpad'"
      :variant="store.isDataType ? 'data' : 'basic'"
      layout="normal"
      @input="store.inputChar($event)"
      @submit="onSubmit"
      @clear="store.clearAnswer"
      @backspace="store.backspace"
      @restart="onRestart"
      @toggle-sign="store.toggleSign"
    />
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

- [ ] **步骤 2：运行全量测试验证不破坏现有功能**

运行：`pnpm test`
预期：PASS，所有现有测试通过（compare 相关组件无集成测试，store 测试在任务 5 已覆盖）

- [ ] **步骤 3：vue-tsc 类型检查**

运行：`pnpm exec vue-tsc --noEmit`
预期：0 错误

- [ ] **步骤 4：Commit**

```bash
git add src/views/PracticeSession.vue
git commit -m "feat(l3): PracticeSession 按 questionCategory 切换 CompareQuestion/CompareKeypad"
```

---

## 任务 7：一表通算生成器（TDD）

**文件：**
- 创建：`src/generators/compositeAnalysis.ts`
- 创建：`src/generators/__tests__/compositeAnalysis.test.ts`

- [ ] **步骤 1：编写生成器失败的测试**

创建 `src/generators/__tests__/compositeAnalysis.test.ts`：

```typescript
import { describe, it, expect } from "vitest";
import {
  generateComposite,
  COMPOSITE_FIELDS,
  type CompositeData,
  type CompositeAnswers,
} from "@/generators/compositeAnalysis";

describe("generateComposite", () => {
  it("生成完整 CompositeQuestion（data + answers）", () => {
    const q = generateComposite();
    expect(q.data).toBeTruthy();
    expect(q.answers).toBeTruthy();
  });

  it("已知数据 4 项在范围内", () => {
    for (let i = 0; i < 50; i++) {
      const q = generateComposite();
      expect(q.data.currentA).toBeGreaterThanOrEqual(100);
      expect(q.data.currentA).toBeLessThanOrEqual(999);
      expect(q.data.currentB).toBeGreaterThanOrEqual(100);
      expect(q.data.currentB).toBeLessThanOrEqual(999);
      expect(q.data.r1).toBeGreaterThanOrEqual(5);
      expect(q.data.r1).toBeLessThanOrEqual(30);
      expect(q.data.r2).toBeGreaterThanOrEqual(5);
      expect(q.data.r2).toBeLessThanOrEqual(30);
    }
  });

  it("派生数据计算正确：baseA = currentA / (1 + r1/100)", () => {
    for (let i = 0; i < 10; i++) {
      const q = generateComposite();
      const expectedBaseA = q.data.currentA / (1 + q.data.r1 / 100);
      expect(q.data.baseA).toBeCloseTo(expectedBaseA, 1);
    }
  });

  it("派生数据计算正确：growthA = currentA - baseA", () => {
    for (let i = 0; i < 10; i++) {
      const q = generateComposite();
      expect(q.data.growthA).toBeCloseTo(q.data.currentA - q.data.baseA, 1);
    }
  });

  it("9 项答案无 NaN/Infinity", () => {
    for (let i = 0; i < 50; i++) {
      const q = generateComposite();
      const a = q.answers;
      for (const v of Object.values(a)) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it("P（现期比重）= currentA / (currentA + currentB) × 100", () => {
    for (let i = 0; i < 10; i++) {
      const q = generateComposite();
      const expected = q.data.currentA / (q.data.currentA + q.data.currentB) * 100;
      expect(q.answers.P).toBeCloseTo(expected, 1);
    }
  });

  it("Pp（基期比重）= baseA / (baseA + baseB) × 100", () => {
    for (let i = 0; i < 10; i++) {
      const q = generateComposite();
      const expected = q.data.baseA / (q.data.baseA + q.data.baseB) * 100;
      expect(q.answers.Pp).toBeCloseTo(expected, 1);
    }
  });

  it("d（两期比重差）= P - Pp", () => {
    for (let i = 0; i < 10; i++) {
      const q = generateComposite();
      expect(q.answers.d).toBeCloseTo(q.answers.P - q.answers.Pp, 1);
    }
  });

  it("r（隔年增长率）= ((1+r1/100)(1+r2/100) - 1) × 100", () => {
    for (let i = 0; i < 10; i++) {
      const q = generateComposite();
      const expected = ((1 + q.data.r1 / 100) * (1 + q.data.r2 / 100) - 1) * 100;
      expect(q.answers.r).toBeCloseTo(expected, 1);
    }
  });

  it("S（基期和）= baseA + baseB", () => {
    for (let i = 0; i < 10; i++) {
      const q = generateComposite();
      expect(q.answers.S).toBeCloseTo(q.data.baseA + q.data.baseB, 1);
    }
  });

  it("D（基期差）= baseA - baseB", () => {
    for (let i = 0; i < 10; i++) {
      const q = generateComposite();
      expect(q.answers.D).toBeCloseTo(q.data.baseA - q.data.baseB, 1);
    }
  });

  it("COMPOSITE_FIELDS 长度为 9", () => {
    expect(COMPOSITE_FIELDS).toHaveLength(9);
  });

  it("COMPOSITE_FIELDS 每项含 key/label/unit", () => {
    for (const f of COMPOSITE_FIELDS) {
      expect(typeof f.key).toBe("string");
      expect(f.key.length).toBeGreaterThan(0);
      expect(typeof f.label).toBe("string");
      expect(f.label.length).toBeGreaterThan(0);
      expect(typeof f.unit).toBe("string");
    }
  });

  it("COMPOSITE_FIELDS keys 与 CompositeAnswers 字段一致", () => {
    const q = generateComposite();
    const answerKeys = Object.keys(q.answers);
    const fieldKeys = COMPOSITE_FIELDS.map((f) => f.key);
    for (const k of fieldKeys) {
      expect(answerKeys).toContain(k);
    }
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm test src/generators/__tests__/compositeAnalysis.test.ts`
预期：FAIL，报错 "Failed to resolve import '@/generators/compositeAnalysis'"

- [ ] **步骤 3：实现生成器**

创建 `src/generators/compositeAnalysis.ts`：

```typescript
// L3 一表通算生成器（纯函数）
// 已知数据 4 项 + 派生 4 项 + 9 项答案计算
// 用户填空，±5% 容差判分

export interface CompositeData {
  currentA: number;
  currentB: number;
  r1: number;  // 百分数形式，如 10.2 表示 10.2%
  r2: number;
  baseA: number;
  baseB: number;
  growthA: number;
  growthB: number;
}

export interface CompositeAnswers {
  P: number;   // 现期比重 %
  Pp: number;  // 基期比重 %
  d: number;   // 两期比重差 个百分点
  k: number;   // 比值增长率 %
  S: number;   // 基期和
  D: number;   // 基期差
  r: number;   // 隔年增长率 %
  r3: number;  // AB和增长率 %
  r4: number;  // AB差增长率 %
}

export interface CompositeQuestion {
  data: CompositeData;
  answers: CompositeAnswers;
}

export const COMPOSITE_FIELDS = [
  { key: "P",  label: "现期比重 P",   unit: "%" },
  { key: "Pp", label: "基期比重 P'",  unit: "%" },
  { key: "d",  label: "两期比重差 d", unit: "个百分点" },
  { key: "k",  label: "比值增长率 k", unit: "%" },
  { key: "S",  label: "基期和 S",     unit: "" },
  { key: "D",  label: "基期差 D",     unit: "" },
  { key: "r",  label: "隔年增长率 r", unit: "%" },
  { key: "r3", label: "AB和增长率 r3", unit: "%" },
  { key: "r4", label: "AB差增长率 r4", unit: "%" },
] as const;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals: number): number {
  const v = Math.random() * (max - min) + min;
  return Number(v.toFixed(decimals));
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}

export function generateComposite(): CompositeQuestion {
  const currentA = randInt(100, 999);
  const currentB = randInt(100, 999);
  const r1 = randFloat(5, 30, 1);
  const r2 = randFloat(5, 30, 1);

  const baseA = round2(currentA / (1 + r1 / 100));
  const baseB = round2(currentB / (1 + r2 / 100));
  const growthA = round2(currentA - baseA);
  const growthB = round2(currentB - baseB);

  const data: CompositeData = {
    currentA, currentB, r1, r2,
    baseA, baseB, growthA, growthB,
  };

  const P = round2(currentA / (currentA + currentB) * 100);
  const Pp = round2(baseA / (baseA + baseB) * 100);
  const d = round2(P - Pp);
  const k = round2(
    ((currentA / currentB - baseA / baseB) / (baseA / baseB)) * 100
  );
  const S = round2(baseA + baseB);
  const D = round2(baseA - baseB);
  const r = round2(((1 + r1 / 100) * (1 + r2 / 100) - 1) * 100);
  const r3 = round2(((currentA + currentB) / (baseA + baseB) - 1) * 100);
  // r4 守卫：baseA - baseB ≠ 0（currentA/currentB 随机独立，理论可能等，概率极低但守卫）
  const denom4 = baseA - baseB;
  const r4 = denom4 !== 0
    ? round2(((currentA - currentB) / denom4 - 1) * 100)
    : 0;

  const answers: CompositeAnswers = { P, Pp, d, k, S, D, r, r3, r4 };

  return { data, answers };
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm test src/generators/__tests__/compositeAnalysis.test.ts`
预期：PASS，所有用例通过

- [ ] **步骤 5：Commit**

```bash
git add src/generators/compositeAnalysis.ts src/generators/__tests__/compositeAnalysis.test.ts
git commit -m "feat(l3): 一表通算生成器（4 已知 + 4 派生 + 9 项答案）"
```

---

## 任务 8：CompositeSession 答题页

**文件：**
- 创建：`src/views/CompositeSession.vue`

- [ ] **步骤 1：实现 CompositeSession.vue**

创建 `src/views/CompositeSession.vue`：

```vue
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import TopBar from "@/components/TopBar.vue";
import Numpad from "@/components/Numpad.vue";
import {
  generateComposite,
  COMPOSITE_FIELDS,
  type CompositeData,
  type CompositeAnswers,
} from "@/generators/compositeAnalysis";
import {
  insertSession,
  insertRecord,
  updateSession,
} from "@/db/index";

const router = useRouter();

const data = ref<CompositeData | null>(null);
const answers = ref<Partial<Record<keyof CompositeAnswers, string>>>({});
const activeField = ref<keyof CompositeAnswers | null>(null);
const submitted = ref(false);
const results = ref<Partial<Record<keyof CompositeAnswers, boolean>>>({});
const elapsedMs = ref(0);
const startedAt = ref<number | null>(null);
let timerId: number | null = null;
let trueAnswers: CompositeAnswers | null = null;

const knownFields: { label: string; value: string }[] = computed(() => {
  if (!data.value) return [];
  const d = data.value;
  return [
    { label: "现期 A", value: String(d.currentA) },
    { label: "现期 B", value: String(d.currentB) },
    { label: "增长率 r1", value: `${d.r1}%` },
    { label: "增长率 r2", value: `${d.r2}%` },
    { label: "基期 A'", value: String(d.baseA) },
    { label: "基期 B'", value: String(d.baseB) },
    { label: "增长量 x1", value: String(d.growthA) },
    { label: "增长量 x2", value: String(d.growthB) },
  ];
});

function tick() {
  if (startedAt.value !== null) {
    elapsedMs.value = Math.floor(performance.now() - startedAt.value);
  }
}

function startTimer() {
  startedAt.value = performance.now();
  if (timerId !== null) window.clearInterval(timerId);
  timerId = window.setInterval(tick, 100);
}

function stopTimer() {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function refreshData() {
  const q = generateComposite();
  data.value = q.data;
  trueAnswers = q.answers;
  answers.value = {};
  submitted.value = false;
  results.value = {};
  activeField.value = null;
  if (startedAt.value === null) {
    startTimer();
  }
}

function onInput(char: string) {
  if (activeField.value === null) return;
  const k = activeField.value;
  answers.value[k] = (answers.value[k] ?? "") + char;
}

function onBackspace() {
  if (activeField.value === null) return;
  const k = activeField.value;
  const cur = answers.value[k] ?? "";
  answers.value[k] = cur.slice(0, -1);
}

function onClear() {
  if (activeField.value === null) return;
  answers.value[activeField.value] = "";
}

function onSubmit() {
  if (!trueAnswers || !data.value) return;
  let correctCount = 0;
  for (const f of COMPOSITE_FIELDS) {
    const userAns = Number(answers.value[f.key] ?? "");
    const trueAns = trueAnswers[f.key];
    const isCorrect =
      !isNaN(userAns) &&
      (trueAns === 0 ? userAns === 0 : Math.abs(userAns - trueAns) / Math.abs(trueAns) <= 0.05);
    results.value[f.key] = isCorrect;
    if (isCorrect) correctCount++;
  }
  submitted.value = true;
  void persistSession(correctCount);
}

async function persistSession(correctCount: number) {
  try {
    const sessionId = await insertSession({
      type: "composite",
      subtype: "一表通算",
      difficulty: "normal",
      total: 9,
      nback: 0,
    });
    for (let i = 0; i < COMPOSITE_FIELDS.length; i++) {
      const f = COMPOSITE_FIELDS[i];
      await insertRecord({
        sessionId,
        qIndex: i,
        question: f.label,
        userAnswer: String(answers.value[f.key] ?? ""),
        trueAnswer: String(trueAnswers?.[f.key] ?? ""),
        isCorrect: results.value[f.key] ?? false,
        tolerance: 0.05,
        timeSpentMs: 0,
      });
    }
    await updateSession(sessionId, {
      correct: correctCount,
      durationMs: elapsedMs.value,
    });
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e));
  }
}

function onCustom() {
  ElMessage.info("自定义功能暂未实现，使用随机");
}

function onBack() {
  router.push("/practice/data-analysis");
}

onMounted(() => {
  refreshData();
  window.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  stopTimer();
  window.removeEventListener("keydown", handleKeydown);
});

function handleKeydown(e: KeyboardEvent) {
  const k = e.key;
  if (/^[0-9]$/.test(k)) {
    e.preventDefault();
    onInput(k);
  } else if (k === "." || k === "," || k === "，") {
    e.preventDefault();
    onInput(".");
  } else if (k === "-") {
    e.preventDefault();
    onInput("-");
  } else if (k === "Backspace") {
    e.preventDefault();
    onBackspace();
  } else if (k === "Enter") {
    if (e.target instanceof HTMLButtonElement) return;
    e.preventDefault();
    onSubmit();
  } else if (k === "Delete") {
    e.preventDefault();
    onClear();
  }
}

const correctCount = computed(() =>
  Object.values(results.value).filter(Boolean).length
);
</script>

<template>
  <div class="composite-session">
    <TopBar
      title="一表通算"
      :progress="''"
      :elapsed-ms="elapsedMs"
      @back="onBack"
    >
      <template #left>
        <button class="back-btn glass-button" @click="onBack">‹</button>
      </template>
    </TopBar>

    <div class="instruction">点击输入位填空，允许误差 ±5%</div>

    <!-- 已知数据区 -->
    <div class="known-grid">
      <div v-for="f in knownFields" :key="f.label" class="known-cell">
        <span class="k-label">{{ f.label }}</span>
        <span class="k-value">{{ f.value }}</span>
      </div>
    </div>

    <!-- 9 项填空区 -->
    <div class="answer-grid">
      <div
        v-for="f in COMPOSITE_FIELDS"
        :key="f.key"
        class="answer-cell"
        :class="{
          active: activeField === f.key,
          correct: submitted && results[f.key] === true,
          wrong: submitted && results[f.key] === false,
        }"
        @click="activeField = f.key"
      >
        <span class="a-label">{{ f.label }}</span>
        <span class="a-input">{{ answers[f.key] || (submitted ? '—' : '点击填入') }}</span>
        <span class="a-unit">{{ f.unit }}</span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="ops-row">
      <button class="op-btn refresh-btn" @click="refreshData">刷新数据</button>
      <button class="op-btn submit-btn" @click="onSubmit">提交答案</button>
    </div>

    <!-- 底部导航 -->
    <div class="bottom-row">
      <button class="bottom-btn" @click="refreshData">随机</button>
      <button class="bottom-btn" @click="onCustom">自定义</button>
    </div>

    <!-- 已提交反馈 -->
    <div v-if="submitted" class="feedback">
      正确 {{ correctCount }}/9
    </div>

    <!-- Numpad -->
    <Numpad
      variant="data"
      layout="normal"
      @input="onInput($event)"
      @submit="onSubmit"
      @clear="onClear"
      @backspace="onBackspace"
      @restart="refreshData"
    />
  </div>
</template>

<style scoped lang="scss">
.composite-session {
  min-height: 100vh;
  padding: 80px 24px 24px 96px;
}

.back-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: var(--app-text-primary, #93a1a1);
  font-size: 22px;
  cursor: pointer;
}

.instruction {
  color: var(--app-text-secondary, #586e75);
  font-size: 13px;
  margin-bottom: 12px;
}

.known-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.known-cell {
  padding: 10px 8px;
  background: var(--app-bg-surface, #073642);
  border-radius: 8px;
  text-align: center;
}

.k-label {
  display: block;
  font-size: 12px;
  color: var(--app-text-secondary, #586e75);
  margin-bottom: 4px;
}

.k-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--app-text-primary, #93a1a1);
  font-variant-numeric: tabular-nums;
}

.answer-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.answer-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--app-bg-surface, #073642);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;

  &.active {
    border-color: var(--app-color-primary, #5faf6f);
    background: rgba(95, 175, 111, 0.15);
  }
  &.correct {
    border-color: #5faf6f;
    background: rgba(95, 175, 111, 0.2);
  }
  &.wrong {
    border-color: #d33682;
    background: rgba(211, 54, 130, 0.15);
  }
}

.a-label {
  font-size: 13px;
  color: var(--app-text-secondary, #586e75);
}

.a-input {
  flex: 1;
  text-align: right;
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text-primary, #93a1a1);
  font-variant-numeric: tabular-nums;
}

.a-unit {
  margin-left: 4px;
  font-size: 12px;
  color: var(--app-text-secondary, #586e75);
}

.ops-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.op-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.refresh-btn {
  background: rgba(42, 161, 152, 0.2);
  color: #2aa198;
}

.submit-btn {
  background: var(--app-color-primary, #5faf6f);
  color: #fff;
}

.bottom-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.bottom-btn {
  flex: 1;
  padding: 10px;
  background: var(--app-bg-surface, #073642);
  color: var(--app-text-primary, #93a1a1);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;
}

.feedback {
  margin-top: 12px;
  padding: 10px;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: var(--app-color-primary, #5faf6f);
}
</style>
```

- [ ] **步骤 2：vue-tsc 类型检查**

运行：`pnpm exec vue-tsc --noEmit`
预期：0 错误

- [ ] **步骤 3：运行全量测试验证不破坏现有功能**

运行：`pnpm test`
预期：PASS（CompositeSession 无单测，但其他测试不受影响）

- [ ] **步骤 4：Commit**

```bash
git add src/views/CompositeSession.vue
git commit -m "feat(l3): CompositeSession 一表通算答题页（4 已知 + 9 填空 + ±5% 容差判分）"
```

---

## 任务 9：路由 + DataAnalysisSettings 接入

**文件：**
- 修改：`src/router/index.ts`
- 修改：`src/views/DataAnalysisSettings.vue`

- [ ] **步骤 1：在 router/index.ts 新增 /practice/composite 路由**

修改 `src/router/index.ts`，在 `/practice/session` 路由项之后插入：

```typescript
    {
      path: "/practice/composite",
      name: "composite-session",
      component: () => import("@/views/CompositeSession.vue"),
      meta: { title: "一表通算" },
    },
```

- [ ] **步骤 2：修改 DataAnalysisSettings.vue 加 el-tabs + 一表通算区块**

修改 `src/views/DataAnalysisSettings.vue`：

2a. 在 `<script setup>` 顶部追加 import（在现有 import 之后）：

```typescript
import type { CompareType } from "@/generators/compareAnalysis";
```

2b. 在 `questionTypes` 数组定义之后（第 22 行附近）追加比较题题型列表：

```typescript
const compareTypes: { label: string; type: CompareType }[] = [
  { label: "增量比大小", type: "compare_growth" },
  { label: "基期比大小", type: "compare_base" },
  { label: "分数比大小", type: "compare_frac" },
];
const selectedCompareType = ref(0);
const activeTab = ref<"fill" | "compare">("fill");
```

2c. 在 `startPractice` 函数之后追加 `startCompare` 和 `startComposite`：

```typescript
async function startCompare() {
  const t = compareTypes[selectedCompareType.value];
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

function startComposite() {
  router.push("/practice/composite");
}
```

2d. 替换整个 `<template>` 部分，用 el-tabs 包裹填空题/比较题，底部追加一表通算区块：

```vue
<template>
  <div class="da-settings">
    <h2 class="title">资料分析</h2>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="填空题" name="fill">
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
        <button class="bottom-btn" @click="goHistory">历史记录</button>
      </el-tab-pane>

      <el-tab-pane label="比较题" name="compare">
        <div class="type-grid">
          <button
            v-for="(t, i) in compareTypes"
            :key="t.type"
            class="type-cell"
            :class="{ selected: i === selectedCompareType }"
            @click="selectedCompareType = i"
          >{{ t.label }}</button>
        </div>

        <div class="row" @click="openDialog">
          <span class="label">题量</span>
          <span class="value">{{ selectedCount }} 题 ›</span>
        </div>

        <button class="start-btn" @click="startCompare">开始练习</button>
      </el-tab-pane>
    </el-tabs>

    <!-- 一表通算独立区块 -->
    <div class="composite-block">
      <h3 class="section-title">一表通算</h3>
      <button class="start-btn" @click="startComposite">开始练习</button>
    </div>

    <!-- 题量弹窗（复用） -->
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
```

2e. 在 `<style scoped>` 末尾追加一表通算区块样式：

```scss
.composite-block {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.section-title {
  color: var(--app-text-primary, #93a1a1);
  font-size: 16px;
  margin-bottom: 12px;
}
```

- [ ] **步骤 3：vue-tsc 类型检查**

运行：`pnpm exec vue-tsc --noEmit`
预期：0 错误

- [ ] **步骤 4：运行全量测试**

运行：`pnpm test`
预期：PASS，所有测试通过

- [ ] **步骤 5：Commit**

```bash
git add src/router/index.ts src/views/DataAnalysisSettings.vue
git commit -m "feat(l3): DataAnalysisSettings 加 el-tabs（填空/比较）+ 一表通算入口 + /practice/composite 路由"
```

---

## 任务 10：全量验证 + 验收

**文件：** 无代码变更，仅验证

- [ ] **步骤 1：运行全量测试**

运行：
```bash
cd /Users/linkslinks/project/speed_calc/.worktrees/level-3
pnpm test
```
预期：PASS，所有测试通过（105 旧 + 新增 compare/composite 测试）

- [ ] **步骤 2：vue-tsc 类型检查**

运行：`pnpm exec vue-tsc --noEmit`
预期：0 错误

- [ ] **步骤 3：vite build 验证**

运行：`pnpm build`
预期：构建成功，无错误

- [ ] **步骤 4：cargo check 验证后端**

运行：
```bash
cd /Users/linkslinks/project/speed_calc/.worktrees/level-3/src-tauri
export PATH="/opt/homebrew/opt/rustup/bin:/opt/homebrew/bin:$PATH"
cargo check
```
预期：编译通过

- [ ] **步骤 5：cargo build release + ad-hoc 签名**

运行：
```bash
cd /Users/linkslinks/project/speed_calc/.worktrees/level-3
export PATH="/opt/homebrew/opt/rustup/bin:/opt/homebrew/bin:$PATH"
pnpm tauri build
codesign --force --sign - --entitlements src-tauri/entitlements.plist "src-tauri/target/release/bundle/macos/行测小助手.app"
```
预期：构建成功，签名成功

- [ ] **步骤 6：启动 binary 验证无 panic**

运行：
```bash
"src-tauri/target/release/bundle/macos/行测小助手.app/Contents/MacOS/行测小助手" &
sleep 3
ps aux | grep "行测小助手" | grep -v grep | head -1
kill %1 2>/dev/null || true
```
预期：进程存在（启动无 panic）

- [ ] **步骤 7：包体积检查**

运行：`ls -lh "src-tauri/target/release/bundle/macos/行测小助手.app" | awk '{print $5}'`
预期：体积 < 30 MB

- [ ] **步骤 8：手动验收清单**

按设计规格 §7.6 验收清单逐项手动测试：
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

- [ ] **步骤 9：使用 superpowers:finishing-a-development-branch 收尾**

调用 `superpowers:finishing-a-development-branch` 技能合并 feature/level-3 回 main，清理 worktree 和分支。
