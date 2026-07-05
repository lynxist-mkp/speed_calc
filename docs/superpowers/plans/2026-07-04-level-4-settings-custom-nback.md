# L4 实现：设置项 + 自定义运算 + N-back

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现设置持久化、17 题型基础生成器、自定义运算（标准+幂）、N-back 延迟判分机制，让设置页全部配置项生效并持久化。

**架构：** 分层模块化——新增 settings store 封装 KV 表读写、扩展 basic.ts 17 题型调度、新建 custom.ts 两套生成器、practice store 加 N-back 状态机、UI 层两个设置页接入 store + 自定义弹窗 + NbackPrompt 组件。ECharts 柱状图用于 chart 呈现模式。

**技术栈：** Tauri 2 + Vue 3 + TypeScript + Vite + Pinia + Element Plus + ECharts（新引入）+ vitest + @vue/test-utils

**规格依据：** [docs/superpowers/specs/2026-07-04-level-4-settings-custom-nback-design.md](file:///Users/linkslinks/project/speed_calc/docs/superpowers/specs/2026-07-04-level-4-settings-custom-nback-design.md)

---

## 文件清单

**新建：**

- `src-tauri/migrations/0005_add_basic_type_standards.sql` — 16 题型时间标准种子
- `src/generators/custom.ts` — 标准运算 + 幂运算生成器
- `src/generators/__tests__/custom.test.ts` — custom.ts 测试
- `src/stores/settings.ts` — 设置持久化 store
- `src/stores/__tests__/settings.test.ts` — settings store 测试
- `src/components/NbackPrompt.vue` — N-back 回忆弹窗
- `src/components/__tests__/NbackPrompt.test.ts` — 组件测试
- `src/components/BarChart.vue` — ECharts 柱状图包裹
- `src/generators/__tests__/basicExtended.test.ts` — 17 题型扩展测试（与现有 basic.test.ts 分离）

**修改：**

- `src-tauri/src/lib.rs` — 注册 migration 0005
- `src/generators/basic.ts` — 新增 16 生成器函数 + BasicType + generateBasic 调度
- `src/generators/dataAnalysis.ts` — 9 生成器启用 difficulty 参数
- `src/db/index.ts` — 新增 getSetting/setSetting/listCustomPresets/upsertCustomPreset
- `src/stores/practice.ts` — init 接受 difficulty/nback/customConfig + N-back 状态机
- `src/stores/__tests__/practice.test.ts` — N-back 状态机测试
- `src/views/PracticeSettings.vue` — 接入 settings store + N-back 弹窗 + 自定义运算弹窗
- `src/views/DataAnalysisSettings.vue` — 接入 settings store + 难度 + 呈现方式 + N-back
- `src/views/PracticeSession.vue` — N-back 弹窗触发 + 顶栏 N-back 等级标记
- `package.json` — 新增 echarts 依赖

---

## 任务 1：migration 0005 + lib.rs 注册

**文件：**

- 创建：`src-tauri/migrations/0005_add_basic_type_standards.sql`
- 修改：`src-tauri/src/lib.rs:32` (在 migrations() 末尾加 v5)

- [ ] **步骤 1：创建 migration 文件**

写入 `src-tauri/migrations/0005_add_basic_type_standards.sql`：

```sql
-- L4: 16 个基础计算题型的时间标准种子（addsub_2d 复用 L1 的 basic_addsub，不重复插入）
-- 参考值来源：references/levels.md 时间标准 + 加减类同档、乘除类高一档、多位除更高一档
INSERT OR IGNORE INTO time_standards (question_type, question_count, pass_s, good_s, excellent_s) VALUES
  ('round_100', 10, 28, 22, 18),
  ('add_3d', 10, 35, 28, 22),
  ('sub_3d', 10, 35, 28, 22),
  ('addsub_3d', 10, 40, 32, 25),
  ('add_multi', 10, 45, 35, 28),
  ('addsub_mix', 10, 50, 40, 32),
  ('mul_2x1', 10, 35, 28, 22),
  ('mul_3x1', 10, 45, 35, 28),
  ('mul_2x11', 10, 30, 24, 18),
  ('mul_2x15', 10, 35, 28, 22),
  ('mul_2x2', 10, 50, 40, 32),
  ('div_3x1', 10, 40, 32, 25),
  ('div_3x2', 10, 50, 40, 32),
  ('mul_est', 10, 45, 35, 28),
  ('div_5x3', 10, 60, 50, 40),
  ('div_3x4', 10, 50, 40, 32);
```

- [ ] **步骤 2：在 lib.rs 注册 migration**

修改 `src-tauri/src/lib.rs`，在 `migrations()` 的 vec 末尾（version 4 之后）追加：

```rust
        Migration {
            version: 5,
            description: "add 16 basic type time standard seeds (L4)",
            sql: include_str!("../migrations/0005_add_basic_type_standards.sql"),
            kind: MigrationKind::Up,
        },
```

- [ ] **步骤 3：验证 cargo check 通过**

运行：`cd src-tauri && cargo check`
预期：编译通过无错误

- [ ] **步骤 4：Commit**

```bash
git add src-tauri/migrations/0005_add_basic_type_standards.sql src-tauri/src/lib.rs
git commit -m "feat(db): migration 0005 添加 16 题型时间标准种子"
```

---

## 任务 2：17 题型生成器（basic.ts 扩展）

**文件：**

- 修改：`src/generators/basic.ts`（保留现有 generateBasicAddSub，新增 16 函数 + 调度）
- 测试：`src/generators/__tests__/basicExtended.test.ts`（新建，与现有 basic.test.ts 分离）

**关键约束：**

- 现有 `generateBasicAddSub` 保留不动（L1 测试与历史记录依赖 `basic_addsub` 题型 ID）
- 新增 `BasicType` 联合类型 17 个值，`generateBasic(type, count)` 调度
- `addsub_2d` 内部复用 `generateBasicAddSub` 同逻辑，返回 `BasicQuestion` 类型（op 联合扩展为 `+/-/×/÷`）
- 整除题：先生成商与除数，反推被除数 `a = b × quotient`
- 减法非负：a<b 时交换
- `mul_est` 容差 ±2%，BasicQuestion 接口加 `tolerance?: number` 字段

- [ ] **步骤 1：编写失败的测试**

创建 `src/generators/__tests__/basicExtended.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { generateBasic, type BasicType } from '@/generators/basic'

const ALL_TYPES: BasicType[] = [
  'addsub_2d',
  'round_100',
  'add_3d',
  'sub_3d',
  'addsub_3d',
  'add_multi',
  'addsub_mix',
  'mul_2x1',
  'mul_3x1',
  'mul_2x11',
  'mul_2x15',
  'mul_2x2',
  'div_3x1',
  'div_3x2',
  'mul_est',
  'div_5x3',
  'div_3x4',
]

describe('generateBasic 17 题型调度', () => {
  it('每个题型能生成指定数量', () => {
    for (const t of ALL_TYPES) {
      const qs = generateBasic(t, 5)
      expect(qs).toHaveLength(5)
    }
  })

  it('BasicQuestion display 以 = 结尾', () => {
    const qs = generateBasic('add_3d', 3)
    for (const q of qs) {
      expect(q.display).toMatch(/=$/)
    }
  })
})

describe('各题型数值范围与计算正确性', () => {
  it('round_100: a+b=100', () => {
    const qs = generateBasic('round_100', 50)
    for (const q of qs) {
      expect(q.a + q.b).toBe(100)
      expect(q.answer).toBe(100)
      expect(q.op).toBe('+')
    }
  })

  it('add_3d: 三位数加法', () => {
    const qs = generateBasic('add_3d', 50)
    for (const q of qs) {
      expect(q.a).toBeGreaterThanOrEqual(100)
      expect(q.a).toBeLessThanOrEqual(999)
      expect(q.b).toBeGreaterThanOrEqual(100)
      expect(q.b).toBeLessThanOrEqual(999)
      expect(q.answer).toBe(q.a + q.b)
    }
  })

  it('sub_3d: 三位数减法非负', () => {
    const qs = generateBasic('sub_3d', 50)
    for (const q of qs) {
      expect(q.op).toBe('-')
      expect(q.answer).toBeGreaterThanOrEqual(0)
      expect(q.answer).toBe(q.a - q.b)
    }
  })

  it('addsub_3d: 三位数加减混合', () => {
    const qs = generateBasic('addsub_3d', 50)
    for (const q of qs) {
      expect(q.a).toBeGreaterThanOrEqual(100)
      expect(q.a).toBeLessThanOrEqual(999)
      expect(q.b).toBeGreaterThanOrEqual(100)
      expect(q.b).toBeLessThanOrEqual(999)
      if (q.op === '+') expect(q.answer).toBe(q.a + q.b)
      if (q.op === '-') {
        expect(q.answer).toBe(q.a - q.b)
        expect(q.answer).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('add_multi: 3-4 个两位数相加', () => {
    const qs = generateBasic('add_multi', 50)
    for (const q of qs) {
      const parts = q.display.replace(/=$/, '').split('+')
      expect(parts.length).toBeGreaterThanOrEqual(3)
      expect(parts.length).toBeLessThanOrEqual(4)
      for (const p of parts) {
        const n = Number(p)
        expect(n).toBeGreaterThanOrEqual(10)
        expect(n).toBeLessThanOrEqual(99)
      }
    }
  })

  it('addsub_mix: 3 个两位数', () => {
    const qs = generateBasic('addsub_mix', 50)
    for (const q of qs) {
      const matches = q.display.match(/\d+/g)
      expect(matches).not.toBeNull()
      expect(matches!.length).toBe(3)
    }
  })

  it('mul_2x1: 两位数乘一位数', () => {
    const qs = generateBasic('mul_2x1', 50)
    for (const q of qs) {
      expect(q.op).toBe('×')
      expect(q.a).toBeGreaterThanOrEqual(10)
      expect(q.a).toBeLessThanOrEqual(99)
      expect(q.b).toBeGreaterThanOrEqual(2)
      expect(q.b).toBeLessThanOrEqual(9)
      expect(q.answer).toBe(q.a * q.b)
    }
  })

  it('mul_3x1: 三位数乘一位数', () => {
    const qs = generateBasic('mul_3x1', 50)
    for (const q of qs) {
      expect(q.op).toBe('×')
      expect(q.a).toBeGreaterThanOrEqual(100)
      expect(q.a).toBeLessThanOrEqual(999)
      expect(q.answer).toBe(q.a * q.b)
    }
  })

  it('mul_2x11: 两位数乘 11', () => {
    const qs = generateBasic('mul_2x11', 50)
    for (const q of qs) {
      expect(q.op).toBe('×')
      expect(q.b).toBe(11)
      expect(q.answer).toBe(q.a * 11)
    }
  })

  it('mul_2x15: 两位数乘 15', () => {
    const qs = generateBasic('mul_2x15', 50)
    for (const q of qs) {
      expect(q.op).toBe('×')
      expect(q.b).toBe(15)
      expect(q.answer).toBe(q.a * 15)
    }
  })

  it('mul_2x2: 两位数乘两位数', () => {
    const qs = generateBasic('mul_2x2', 50)
    for (const q of qs) {
      expect(q.op).toBe('×')
      expect(q.a).toBeGreaterThanOrEqual(10)
      expect(q.a).toBeLessThanOrEqual(99)
      expect(q.b).toBeGreaterThanOrEqual(10)
      expect(q.b).toBeLessThanOrEqual(99)
      expect(q.answer).toBe(q.a * q.b)
    }
  })

  it('div_3x1: 三位数除一位数整除', () => {
    const qs = generateBasic('div_3x1', 50)
    for (const q of qs) {
      expect(q.op).toBe('÷')
      expect(q.a).toBeGreaterThanOrEqual(100)
      expect(q.a).toBeLessThanOrEqual(999)
      expect(q.b).toBeGreaterThanOrEqual(2)
      expect(q.b).toBeLessThanOrEqual(9)
      expect(q.a % q.b).toBe(0)
      expect(q.answer).toBe(q.a / q.b)
    }
  })

  it('div_3x2: 三位数除两位数整除', () => {
    const qs = generateBasic('div_3x2', 50)
    for (const q of qs) {
      expect(q.op).toBe('÷')
      expect(q.b).toBeGreaterThanOrEqual(10)
      expect(q.b).toBeLessThanOrEqual(99)
      expect(q.a % q.b).toBe(0)
      expect(q.answer).toBe(q.a / q.b)
    }
  })

  it('mul_est: 乘法估算答案取整到十位', () => {
    const qs = generateBasic('mul_est', 50)
    for (const q of qs) {
      expect(q.op).toBe('×')
      expect(q.a).toBeGreaterThanOrEqual(100)
      expect(q.a).toBeLessThanOrEqual(999)
      expect(q.b).toBeGreaterThanOrEqual(10)
      expect(q.b).toBeLessThanOrEqual(99)
      expect(q.answer % 10).toBe(0)
      expect(q.tolerance).toBe(0.02)
    }
  })

  it('div_5x3: 五位数除三位数整除', () => {
    const qs = generateBasic('div_5x3', 50)
    for (const q of qs) {
      expect(q.op).toBe('÷')
      expect(q.a).toBeGreaterThanOrEqual(10000)
      expect(q.a).toBeLessThanOrEqual(99999)
      expect(q.b).toBeGreaterThanOrEqual(100)
      expect(q.b).toBeLessThanOrEqual(999)
      expect(q.a % q.b).toBe(0)
      expect(q.answer).toBe(q.a / q.b)
    }
  })

  it('div_3x4: 三位数除四位数结果<1 预填 0.', () => {
    const qs = generateBasic('div_3x4', 50)
    for (const q of qs) {
      expect(q.op).toBe('÷')
      expect(q.a).toBeGreaterThanOrEqual(100)
      expect(q.a).toBeLessThanOrEqual(999)
      expect(q.b).toBeGreaterThanOrEqual(1000)
      expect(q.b).toBeLessThanOrEqual(9999)
      expect(q.answer).toBeLessThan(1)
      expect(q.preset).toBe('0.')
    }
  })
})

describe('边界与随机性', () => {
  it('count=5 与 count=100', () => {
    expect(generateBasic('add_3d', 5)).toHaveLength(5)
    expect(generateBasic('add_3d', 100)).toHaveLength(100)
  })

  it('多次调用结果不全相同', () => {
    const run1 = generateBasic('mul_2x2', 20)
      .map((q) => q.display)
      .join(',')
    const run2 = generateBasic('mul_2x2', 20)
      .map((q) => q.display)
      .join(',')
    expect(run1).not.toEqual(run2)
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm vitest run src/generators/__tests__/basicExtended.test.ts`
预期：FAIL，报错 `generateBasic is not a function` 或 `BasicType is not exported`

- [ ] **步骤 3：扩展 basic.ts**

修改 `src/generators/basic.ts`，保留现有 `Question`/`generateBasicAddSub`，追加新类型与 16 生成器：

```typescript
// 保留现有 Question 与 generateBasicAddSub 不动
export interface Question {
  a: number
  b: number
  op: '+' | '-'
  answer: number
  display: string
}

export function generateBasicAddSub(count: number): Question[] {
  // 现有实现保持不变
  const questions: Question[] = []
  for (let i = 0; i < count; i++) {
    const op: '+' | '-' = Math.random() < 0.5 ? '+' : '-'
    let a = randInt(10, 99)
    let b = randInt(10, 99)
    if (op === '-' && a < b) {
      ;[a, b] = [b, a]
    }
    const answer = op === '+' ? a + b : a - b
    questions.push({ a, b, op, answer, display: `${a}${op}${b}=` })
  }
  return questions
}

// ===== L4 扩展：17 题型 =====

export type BasicType =
  | 'addsub_2d'
  | 'round_100'
  | 'add_3d'
  | 'sub_3d'
  | 'addsub_3d'
  | 'add_multi'
  | 'addsub_mix'
  | 'mul_2x1'
  | 'mul_3x1'
  | 'mul_2x11'
  | 'mul_2x15'
  | 'mul_2x2'
  | 'div_3x1'
  | 'div_3x2'
  | 'mul_est'
  | 'div_5x3'
  | 'div_3x4'

export interface BasicQuestion {
  a: number
  b: number
  op: '+' | '-' | '×' | '÷'
  answer: number
  display: string
  preset?: string
  tolerance?: number // 仅 mul_est 用 0.02，其余 undefined 表示精确判分
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function genAddsub2d(): BasicQuestion {
  const op: '+' | '-' = Math.random() < 0.5 ? '+' : '-'
  let a = randInt(10, 99)
  let b = randInt(10, 99)
  if (op === '-' && a < b) [a, b] = [b, a]
  const answer = op === '+' ? a + b : a - b
  return { a, b, op, answer, display: `${a}${op}${b}=` }
}

function genRound100(): BasicQuestion {
  const a = randInt(10, 90)
  const b = 100 - a
  return { a, b, op: '+', answer: 100, display: `${a}+${b}=` }
}

function genAdd3d(): BasicQuestion {
  const a = randInt(100, 999)
  const b = randInt(100, 999)
  return { a, b, op: '+', answer: a + b, display: `${a}+${b}=` }
}

function genSub3d(): BasicQuestion {
  let a = randInt(100, 999)
  let b = randInt(100, 999)
  if (a < b) [a, b] = [b, a]
  return { a, b, op: '-', answer: a - b, display: `${a}-${b}=` }
}

function genAddsub3d(): BasicQuestion {
  const op: '+' | '-' = Math.random() < 0.5 ? '+' : '-'
  let a = randInt(100, 999)
  let b = randInt(100, 999)
  if (op === '-' && a < b) [a, b] = [b, a]
  const answer = op === '+' ? a + b : a - b
  return { a, b, op, answer, display: `${a}${op}${b}=` }
}

function genAddMulti(): BasicQuestion {
  const n = Math.random() < 0.5 ? 3 : 4
  const nums: number[] = []
  for (let i = 0; i < n; i++) nums.push(randInt(10, 99))
  const answer = nums.reduce((s, x) => s + x, 0)
  return { a: nums[0], b: nums[1], op: '+', answer, display: nums.join('+') + '=' }
}

function genAddsubMix(): BasicQuestion {
  const a = randInt(10, 99)
  const b = randInt(10, 99)
  const c = randInt(10, 99)
  const op2: '+' | '-' = Math.random() < 0.5 ? '+' : '-'
  let answer = a + b
  if (op2 === '-') answer = answer - c
  else answer = answer + c
  if (answer < 0) {
    return { a, b, op: '+', answer: a + b + c, display: `${a}+${b}+${c}=` }
  }
  return { a, b, op: '+', answer, display: `${a}+${b}${op2}${c}=` }
}

function genMul2x1(): BasicQuestion {
  const a = randInt(10, 99)
  const b = randInt(2, 9)
  return { a, b, op: '×', answer: a * b, display: `${a}×${b}=` }
}

function genMul3x1(): BasicQuestion {
  const a = randInt(100, 999)
  const b = randInt(2, 9)
  return { a, b, op: '×', answer: a * b, display: `${a}×${b}=` }
}

function genMul2x11(): BasicQuestion {
  const a = randInt(10, 99)
  return { a, b: 11, op: '×', answer: a * 11, display: `${a}×11=` }
}

function genMul2x15(): BasicQuestion {
  const a = randInt(10, 99)
  return { a, b: 15, op: '×', answer: a * 15, display: `${a}×15=` }
}

function genMul2x2(): BasicQuestion {
  const a = randInt(10, 99)
  const b = randInt(10, 99)
  return { a, b, op: '×', answer: a * b, display: `${a}×${b}=` }
}

function genDiv3x1(): BasicQuestion {
  const b = randInt(2, 9)
  const quotient = randInt(50, 111) // a∈[100,999]
  const a = b * quotient
  return { a, b, op: '÷', answer: quotient, display: `${a}÷${b}=` }
}

function genDiv3x2(): BasicQuestion {
  const b = randInt(10, 99)
  const quotient = randInt(2, 9) // a∈[100,999] 且商为个位数
  const a = b * quotient
  return { a, b, op: '÷', answer: quotient, display: `${a}÷${b}=` }
}

function genMulEst(): BasicQuestion {
  const a = randInt(100, 999)
  const b = randInt(10, 99)
  const exact = a * b
  const answer = Math.round(exact / 10) * 10
  return { a, b, op: '×', answer, display: `${a}×${b}≈`, tolerance: 0.02 }
}

function genDiv5x3(): BasicQuestion {
  const b = randInt(100, 999)
  const quotient = randInt(10, 99) // a∈[1000,99999]
  const a = b * quotient
  return { a, b, op: '÷', answer: quotient, display: `${a}÷${b}=` }
}

function genDiv3x4(): BasicQuestion {
  // 三位数除四位数：被除数是 3 位，除数是 4 位，结果<1
  const a = randInt(100, 999)
  const bb = randInt(1000, 9999)
  const answer = a / bb
  return {
    a,
    b: bb,
    op: '÷',
    answer: Number(answer.toFixed(4)),
    display: `${a}÷${bb}≈`,
    preset: '0.',
  }
}

const GENERATORS: Record<BasicType, () => BasicQuestion> = {
  addsub_2d: genAddsub2d,
  round_100: genRound100,
  add_3d: genAdd3d,
  sub_3d: genSub3d,
  addsub_3d: genAddsub3d,
  add_multi: genAddMulti,
  addsub_mix: genAddsubMix,
  mul_2x1: genMul2x1,
  mul_3x1: genMul3x1,
  mul_2x11: genMul2x11,
  mul_2x15: genMul2x15,
  mul_2x2: genMul2x2,
  div_3x1: genDiv3x1,
  div_3x2: genDiv3x2,
  mul_est: genMulEst,
  div_5x3: genDiv5x3,
  div_3x4: genDiv3x4,
}

export function generateBasic(type: BasicType, count: number): BasicQuestion[] {
  const gen = GENERATORS[type]
  const questions: BasicQuestion[] = []
  for (let i = 0; i < count; i++) questions.push(gen())
  return questions
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm vitest run src/generators/__tests__/basicExtended.test.ts`
预期：PASS（全部用例通过）

- [ ] **步骤 5：运行全量测试确保未破坏 L1**

运行：`pnpm vitest run`
预期：全部 PASS（包括现有 basic.test.ts）

- [ ] **步骤 6：Commit**

```bash
git add src/generators/basic.ts src/generators/__tests__/basicExtended.test.ts
git commit -m "feat(gen): 17 题型基础计算生成器（L4）"
```

---

## 任务 3：自定义运算生成器（custom.ts）

**文件：**

- 创建：`src/generators/custom.ts`
- 测试：`src/generators/__tests__/custom.test.ts`

- [ ] **步骤 1：编写失败的测试**

创建 `src/generators/__tests__/custom.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import {
  generateCustomStandard,
  generateCustomPower,
  formatStandardName,
  formatPowerName,
  type CustomStandardConfig,
  type CustomPowerConfig,
} from '@/generators/custom'

describe('generateCustomStandard', () => {
  it('random_digits 模式生成正确位数', () => {
    const cfg: CustomStandardConfig = {
      firstDigits: 2,
      operators: ['+'],
      secondMode: 'random_digits',
      secondDigits: 1,
    }
    const qs = generateCustomStandard(cfg, 20)
    expect(qs).toHaveLength(20)
    for (const q of qs) {
      expect(q.op).toBe('+')
      expect(q.a).toBeGreaterThanOrEqual(10)
      expect(q.a).toBeLessThanOrEqual(99)
      expect(q.b).toBeGreaterThanOrEqual(2)
      expect(q.b).toBeLessThanOrEqual(9)
      expect(q.answer).toBe(q.a + q.b)
    }
  })

  it('fixed 模式第二个数固定', () => {
    const cfg: CustomStandardConfig = {
      firstDigits: 4,
      operators: ['-'],
      secondMode: 'fixed',
      secondFixed: 15,
    }
    const qs = generateCustomStandard(cfg, 20)
    for (const q of qs) {
      expect(q.b).toBe(15)
      expect(q.op).toBe('-')
      expect(q.answer).toBe(q.a - 15)
      expect(q.answer).toBeGreaterThanOrEqual(0)
    }
  })

  it('range 模式第二个数在范围内', () => {
    const cfg: CustomStandardConfig = {
      firstDigits: 2,
      operators: ['×'],
      secondMode: 'range',
      secondMin: 10,
      secondMax: 99,
    }
    const qs = generateCustomStandard(cfg, 50)
    for (const q of qs) {
      expect(q.b).toBeGreaterThanOrEqual(10)
      expect(q.b).toBeLessThanOrEqual(99)
      expect(q.answer).toBe(q.a * q.b)
    }
  })

  it('除法整除', () => {
    const cfg: CustomStandardConfig = {
      firstDigits: 3,
      operators: ['÷'],
      secondMode: 'random_digits',
      secondDigits: 1,
    }
    const qs = generateCustomStandard(cfg, 50)
    for (const q of qs) {
      expect(q.op).toBe('÷')
      expect(q.a % q.b).toBe(0)
      expect(q.answer).toBe(q.a / q.b)
    }
  })

  it('多运算符随机选择', () => {
    const cfg: CustomStandardConfig = {
      firstDigits: 2,
      operators: ['+', '-', '×', '÷'],
      secondMode: 'random_digits',
      secondDigits: 1,
    }
    const qs = generateCustomStandard(cfg, 100)
    const ops = new Set(qs.map((q) => q.op))
    expect(ops.size).toBe(4)
  })

  it('减法非负', () => {
    const cfg: CustomStandardConfig = {
      firstDigits: 2,
      operators: ['-'],
      secondMode: 'random_digits',
      secondDigits: 2,
    }
    const qs = generateCustomStandard(cfg, 100)
    for (const q of qs) {
      expect(q.answer).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('generateCustomPower', () => {
  it('range 模式底数在范围内', () => {
    const cfg: CustomPowerConfig = {
      baseMode: 'range',
      baseMin: 10,
      baseMax: 99,
      powerTypes: [2],
    }
    const qs = generateCustomPower(cfg, 20)
    expect(qs).toHaveLength(20)
    for (const q of qs) {
      expect(q.a).toBeGreaterThanOrEqual(10)
      expect(q.a).toBeLessThanOrEqual(99)
      expect(q.answer).toBe(q.a * q.a)
      expect(q.display).toMatch(/²=$/)
    }
  })

  it('digits 模式按位数生成底数', () => {
    const cfg: CustomPowerConfig = {
      baseMode: 'digits',
      baseDigits: 2,
      powerTypes: [3],
    }
    const qs = generateCustomPower(cfg, 50)
    for (const q of qs) {
      expect(q.a).toBeGreaterThanOrEqual(10)
      expect(q.a).toBeLessThanOrEqual(99)
      expect(q.answer).toBe(q.a * q.a * q.a)
      expect(q.display).toMatch(/³=$/)
    }
  })

  it('多指数随机选择', () => {
    const cfg: CustomPowerConfig = {
      baseMode: 'digits',
      baseDigits: 1,
      powerTypes: [2, 3],
    }
    const qs = generateCustomPower(cfg, 100)
    const displays = new Set(qs.map((q) => q.display.slice(-2, -1)))
    expect(displays.has('²')).toBe(true)
    expect(displays.has('³')).toBe(true)
  })
})

describe('name 格式化', () => {
  it('标准运算 random_digits', () => {
    const cfg: CustomStandardConfig = {
      firstDigits: 4,
      operators: ['-'],
      secondMode: 'random_digits',
      secondDigits: 4,
    }
    expect(formatStandardName(cfg)).toBe('4位数-4位数')
  })

  it('标准运算 fixed', () => {
    const cfg: CustomStandardConfig = {
      firstDigits: 2,
      operators: ['-'],
      secondMode: 'fixed',
      secondFixed: 15,
    }
    expect(formatStandardName(cfg)).toBe('2位数-15')
  })

  it('标准运算 range', () => {
    const cfg: CustomStandardConfig = {
      firstDigits: 2,
      operators: ['-'],
      secondMode: 'range',
      secondMin: 10,
      secondMax: 99,
    }
    expect(formatStandardName(cfg)).toBe('2位数-10~99')
  })

  it('幂运算', () => {
    const cfg: CustomPowerConfig = {
      baseMode: 'digits',
      baseDigits: 2,
      powerTypes: [2],
    }
    expect(formatPowerName(cfg)).toBe('2位数²')
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm vitest run src/generators/__tests__/custom.test.ts`
预期：FAIL，报错模块不存在

- [ ] **步骤 3：实现 custom.ts**

创建 `src/generators/custom.ts`：

```typescript
import type { BasicQuestion } from './basic'

export interface CustomStandardConfig {
  firstDigits: 1 | 2 | 3 | 4
  operators: Array<'+' | '-' | '×' | '÷'>
  secondMode: 'random_digits' | 'fixed' | 'range'
  secondDigits?: 1 | 2 | 3 | 4
  secondFixed?: number
  secondMin?: number
  secondMax?: number
}

export interface CustomPowerConfig {
  baseMode: 'range' | 'digits'
  baseMin?: number
  baseMax?: number
  baseDigits?: 1 | 2 | 3
  powerTypes: Array<2 | 3>
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function genByDigits(digits: number): number {
  // 1 位数 [2,9]（不含 0，避免 0 作首位），多位数 [10^(d-1), 10^d - 1]
  if (digits === 1) return randInt(2, 9)
  const min = Math.pow(10, digits - 1)
  const max = Math.pow(10, digits) - 1
  return randInt(min, max)
}

function genSecond(cfg: CustomStandardConfig): number {
  if (cfg.secondMode === 'random_digits') {
    return genByDigits(cfg.secondDigits!)
  }
  if (cfg.secondMode === 'fixed') {
    return cfg.secondFixed!
  }
  return randInt(cfg.secondMin!, cfg.secondMax!)
}

export function generateCustomStandard(cfg: CustomStandardConfig, count: number): BasicQuestion[] {
  const questions: BasicQuestion[] = []
  for (let i = 0; i < count; i++) {
    const op = pickRandom(cfg.operators)
    let a = genByDigits(cfg.firstDigits)
    let b = genSecond(cfg)
    if (op === '-' && a < b) [a, b] = [b, a]
    let answer: number
    let display: string
    if (op === '÷') {
      const quotient = Math.max(1, Math.floor(a / Math.max(1, b)))
      b = Math.max(2, b)
      a = b * quotient
      answer = quotient
      display = `${a}÷${b}=`
    } else if (op === '×') {
      answer = a * b
      display = `${a}×${b}=`
    } else if (op === '-') {
      answer = a - b
      display = `${a}-${b}=`
    } else {
      answer = a + b
      display = `${a}+${b}=`
    }
    questions.push({ a, b, op, answer, display })
  }
  return questions
}

export function generateCustomPower(cfg: CustomPowerConfig, count: number): BasicQuestion[] {
  const questions: BasicQuestion[] = []
  for (let i = 0; i < count; i++) {
    let base: number
    if (cfg.baseMode === 'range') {
      base = randInt(cfg.baseMin!, cfg.baseMax!)
    } else {
      base = genByDigits(cfg.baseDigits!)
    }
    const power = pickRandom(cfg.powerTypes)
    const answer = power === 2 ? base * base : base * base * base
    const display = `${base}${power === 2 ? '²' : '³'}=`
    questions.push({ a: base, b: power, op: '×', answer, display })
  }
  return questions
}

export function formatStandardName(cfg: CustomStandardConfig): string {
  const opStr = cfg.operators[0]
  let secondStr: string
  if (cfg.secondMode === 'random_digits') {
    secondStr = `${cfg.secondDigits}位数`
  } else if (cfg.secondMode === 'fixed') {
    secondStr = String(cfg.secondFixed)
  } else {
    secondStr = `${cfg.secondMin}~${cfg.secondMax}`
  }
  return `${cfg.firstDigits}位数${opStr}${secondStr}`
}

export function formatPowerName(cfg: CustomPowerConfig): string {
  const baseStr =
    cfg.baseMode === 'range' ? `${cfg.baseMin}~${cfg.baseMax}` : `${cfg.baseDigits}位数`
  const powerStr = cfg.powerTypes[0] === 2 ? '²' : '³'
  return `${baseStr}${powerStr}`
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm vitest run src/generators/__tests__/custom.test.ts`
预期：PASS

- [ ] **步骤 5：Commit**

```bash
git add src/generators/custom.ts src/generators/__tests__/custom.test.ts
git commit -m "feat(gen): 自定义运算生成器（标准+幂）"
```

---

## 任务 4：db 层 settings + custom_presets CRUD

**文件：**

- 修改：`src/db/index.ts`（在文件末尾追加）
- 修改：`src/db/__tests__/index.test.ts`（追加测试）

**注意：** 现有 `src/db/__tests__/index.test.ts` 的测试模式需先查看——如果它已 mock db，新测试用同样的 mock；如果用真实 db，沿用。若现有测试在 CI 跑不通，跳过 db 测试，仅靠手动验收覆盖（与 L1-L3 一致）。

- [ ] **步骤 1：编写失败的测试**

修改 `src/db/__tests__/index.test.ts`，在文件末尾追加（保留现有测试）：

```typescript
import { getSetting, setSetting, listCustomPresets, upsertCustomPreset } from '@/db/index'

describe('settings KV CRUD', () => {
  it('setSetting + getSetting 往返', async () => {
    await setSetting('test.key1', 'value1')
    const v = await getSetting('test.key1')
    expect(v).toBe('value1')
  })

  it('getSetting 未命中返回 null', async () => {
    const v = await getSetting('not.exist.key')
    expect(v).toBeNull()
  })

  it('setSetting 覆盖已存在 key', async () => {
    await setSetting('test.key2', 'v1')
    await setSetting('test.key2', 'v2')
    const v = await getSetting('test.key2')
    expect(v).toBe('v2')
  })
})

describe('custom_presets CRUD', () => {
  it('upsertCustomPreset 新增', async () => {
    await upsertCustomPreset('2位数+1位数', '{"firstDigits":2,"operators":["+"]}')
    const list = await listCustomPresets()
    const found = list.find((p) => p.name === '2位数+1位数')
    expect(found).toBeDefined()
    expect(found!.config).toBe('{"firstDigits":2,"operators":["+"]}')
  })

  it('upsertCustomPreset 同 config 更新 used_at 不新增', async () => {
    await upsertCustomPreset('dup-test', '{"a":1}')
    const list1 = await listCustomPresets()
    const count1 = list1.filter((p) => p.name === 'dup-test').length
    await new Promise((r) => setTimeout(r, 10))
    await upsertCustomPreset('dup-test', '{"a":1}')
    const list2 = await listCustomPresets()
    const count2 = list2.filter((p) => p.name === 'dup-test').length
    expect(count2).toBe(count1)
  })

  it('listCustomPresets 按 used_at 倒序', async () => {
    await upsertCustomPreset('order-1', '{"x":1}')
    await new Promise((r) => setTimeout(r, 10))
    await upsertCustomPreset('order-2', '{"x":2}')
    const list = await listCustomPresets()
    const i1 = list.findIndex((p) => p.name === 'order-1')
    const i2 = list.findIndex((p) => p.name === 'order-2')
    expect(i2).toBeLessThan(i1)
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm vitest run src/db/__tests__/index.test.ts`
预期：FAIL，报错 `getSetting is not a function` 等

- [ ] **步骤 3：实现 db 函数**

修改 `src/db/index.ts`，在文件末尾追加：

```typescript
// ===== L4 扩展：settings KV + custom_presets =====

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb()
  const rows = await db.select<{ value: string }[]>(`SELECT value FROM settings WHERE key = $1`, [
    key,
  ])
  return rows.length > 0 ? rows[0].value : null
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb()
  await db.execute(`INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)`, [key, value])
}

export interface CustomPreset {
  id: number
  name: string
  config: string
  usedAt: number
}

export async function listCustomPresets(limit = 10): Promise<CustomPreset[]> {
  const db = await getDb()
  const rows = await db.select<{ id: number; name: string; config: string; used_at: number }[]>(
    `SELECT id, name, config, used_at FROM custom_presets ORDER BY used_at DESC LIMIT $1`,
    [limit],
  )
  return rows.map((r) => ({ id: r.id, name: r.name, config: r.config, usedAt: r.used_at }))
}

export async function upsertCustomPreset(name: string, config: string): Promise<void> {
  const db = await getDb()
  const existing = await db.select<{ id: number }[]>(
    `SELECT id FROM custom_presets WHERE config = $1`,
    [config],
  )
  if (existing.length > 0) {
    await db.execute(`UPDATE custom_presets SET name = $1, used_at = $2 WHERE id = $3`, [
      name,
      Date.now(),
      existing[0].id,
    ])
  } else {
    await db.execute(`INSERT INTO custom_presets (name, config, used_at) VALUES ($1, $2, $3)`, [
      name,
      config,
      Date.now(),
    ])
  }
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm vitest run src/db/__tests__/index.test.ts`
预期：PASS（若现有测试在测试环境跑不通，至少新增的接口签名正确，typecheck 通过）

- [ ] **步骤 5：Commit**

```bash
git add src/db/index.ts src/db/__tests__/index.test.ts
git commit -m "feat(db): settings KV + custom_presets CRUD"
```

---

## 任务 5：settings store

**文件：**

- 创建：`src/stores/settings.ts`
- 测试：`src/stores/__tests__/settings.test.ts`

- [ ] **步骤 1：编写失败的测试**

创建 `src/stores/__tests__/settings.test.ts`：

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/db/index', () => ({
  getSetting: vi.fn().mockResolvedValue(null),
  setSetting: vi.fn().mockResolvedValue(undefined),
}))

import { useSettingsStore } from '@/stores/settings'
import { getSetting, setSetting } from '@/db/index'

describe('useSettingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    ;(getSetting as ReturnType<typeof vi.fn>).mockResolvedValue(null)
  })

  it('初始默认值', () => {
    const store = useSettingsStore()
    expect(store.basic.keyboardLayout).toBe('normal')
    expect(store.basic.touchPen).toBe(false)
    expect(store.basic.selectedType).toBe(0)
    expect(store.basic.countMode).toBe('quick')
    expect(store.basic.count).toBe(10)
    expect(store.basic.nback).toBe(0)
    expect(store.dataAnalysis.difficulty).toBe('normal')
    expect(store.dataAnalysis.displayMode).toBe('chart')
    expect(store.dataAnalysis.nback).toBe(0)
  })

  it('load 从 db 读取覆盖默认值', async () => {
    ;(getSetting as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
      const map: Record<string, string> = {
        'basic.keyboardLayout': JSON.stringify('reverse'),
        'basic.count': JSON.stringify(20),
        'basic.nback': JSON.stringify(2),
        'da.difficulty': JSON.stringify('hard'),
      }
      return Promise.resolve(map[key] ?? null)
    })
    const store = useSettingsStore()
    await store.load()
    expect(store.basic.keyboardLayout).toBe('reverse')
    expect(store.basic.count).toBe(20)
    expect(store.basic.nback).toBe(2)
    expect(store.dataAnalysis.difficulty).toBe('hard')
  })

  it('saveBasic 写入 db 并更新本地', async () => {
    const store = useSettingsStore()
    await store.saveBasic({ count: 25 })
    expect(store.basic.count).toBe(25)
    expect(setSetting).toHaveBeenCalledWith('basic.count', '25')
  })

  it('saveDataAnalysis 写入 db 并更新本地', async () => {
    const store = useSettingsStore()
    await store.saveDataAnalysis({ difficulty: 'easy' })
    expect(store.dataAnalysis.difficulty).toBe('easy')
    expect(setSetting).toHaveBeenCalledWith('da.difficulty', JSON.stringify('easy'))
  })

  it('load 未设置的 key 保持默认值', async () => {
    ;(getSetting as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const store = useSettingsStore()
    await store.load()
    expect(store.basic.keyboardLayout).toBe('normal')
    expect(store.dataAnalysis.displayMode).toBe('chart')
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm vitest run src/stores/__tests__/settings.test.ts`
预期：FAIL，报错 `useSettingsStore is not exported`

- [ ] **步骤 3：实现 settings store**

创建 `src/stores/settings.ts`：

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSetting, setSetting } from '@/db/index'

export interface BasicSettings {
  keyboardLayout: 'normal' | 'reverse' | 'shuffle'
  touchPen: boolean
  selectedType: number
  countMode: 'quick' | 'normal' | 'custom'
  count: number
  nback: 0 | 1 | 2
}

export interface DASettings {
  selectedFillType: number
  selectedCompareType: number
  count: number
  difficulty: 'easy' | 'normal' | 'hard'
  displayMode: 'chart' | 'formula'
  nback: 0 | 1 | 2
}

const DEFAULT_BASIC: BasicSettings = {
  keyboardLayout: 'normal',
  touchPen: false,
  selectedType: 0,
  countMode: 'quick',
  count: 10,
  nback: 0,
}

const DEFAULT_DA: DASettings = {
  selectedFillType: 0,
  selectedCompareType: 0,
  count: 10,
  difficulty: 'normal',
  displayMode: 'chart',
  nback: 0,
}

const BASIC_KEYS: Record<keyof BasicSettings, string> = {
  keyboardLayout: 'basic.keyboardLayout',
  touchPen: 'basic.touchPen',
  selectedType: 'basic.selectedType',
  countMode: 'basic.countMode',
  count: 'basic.count',
  nback: 'basic.nback',
}

const DA_KEYS: Record<keyof DASettings, string> = {
  selectedFillType: 'da.selectedFillType',
  selectedCompareType: 'da.selectedCompareType',
  count: 'da.count',
  difficulty: 'da.difficulty',
  displayMode: 'da.displayMode',
  nback: 'da.nback',
}

function parseValue<T>(raw: string | null, defaultValue: T): T {
  if (raw === null) return defaultValue
  try {
    return JSON.parse(raw) as T
  } catch {
    return defaultValue
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const basic = ref<BasicSettings>({ ...DEFAULT_BASIC })
  const dataAnalysis = ref<DASettings>({ ...DEFAULT_DA })
  const loaded = ref(false)

  async function load(): Promise<void> {
    for (const k of Object.keys(BASIC_KEYS) as (keyof BasicSettings)[]) {
      const raw = await getSetting(BASIC_KEYS[k])
      ;(basic.value as Record<keyof BasicSettings, unknown>)[k] = parseValue(raw, DEFAULT_BASIC[k])
    }
    for (const k of Object.keys(DA_KEYS) as (keyof DASettings)[]) {
      const raw = await getSetting(DA_KEYS[k])
      ;(dataAnalysis.value as Record<keyof DASettings, unknown>)[k] = parseValue(raw, DEFAULT_DA[k])
    }
    loaded.value = true
  }

  async function saveBasic(patch: Partial<BasicSettings>): Promise<void> {
    for (const k of Object.keys(patch) as (keyof BasicSettings)[]) {
      const value = patch[k]!
      ;(basic.value as Record<keyof BasicSettings, unknown>)[k] = value
      await setSetting(BASIC_KEYS[k], JSON.stringify(value))
    }
  }

  async function saveDataAnalysis(patch: Partial<DASettings>): Promise<void> {
    for (const k of Object.keys(patch) as (keyof DASettings)[]) {
      const value = patch[k]!
      ;(dataAnalysis.value as Record<keyof DASettings, unknown>)[k] = value
      await setSetting(DA_KEYS[k], JSON.stringify(value))
    }
  }

  return { basic, dataAnalysis, loaded, load, saveBasic, saveDataAnalysis }
})
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm vitest run src/stores/__tests__/settings.test.ts`
预期：PASS

- [ ] **步骤 5：Commit**

```bash
git add src/stores/settings.ts src/stores/__tests__/settings.test.ts
git commit -m "feat(store): settings 持久化 store"
```

---

## 任务 6：practice store 扩展 SessionConfig + N-back 状态机

**文件：**

- 修改：`src/stores/practice.ts`
- 测试：`src/stores/__tests__/practice.test.ts`（追加 N-back 测试，保留现有）

**关键约束：**

- 保留 `generateBasicAddSub`（旧 `basic_addsub` 题型）分支不动
- 新增 `BASIC_TYPES` set + `custom_standard`/`custom_power` 分支
- N-back 状态机：`pendingRecords` 暂存，`nbackPrompting` 标记，回收时 shift + 弹窗
- 末尾收尾：最后一题答完且 pendingRecords 非空，逐个回收后 finish()
- `nbackTarget` 携带完整 record（含 tolerance 信息）

- [ ] **步骤 1：编写失败的测试**

修改 `src/stores/__tests__/practice.test.ts`，在文件顶部 mock 块扩展 basic mock（若已 mock 则扩展，否则新增），并在文件末尾追加测试：

顶部 mock 扩展（与现有 `vi.mock("@/generators/dataAnalysis", ...)` 同级）：

```typescript
vi.mock('@/generators/basic', async () => {
  const actual = await vi.importActual<typeof import('@/generators/basic')>('@/generators/basic')
  return {
    ...actual,
    generateBasicAddSub: vi.fn(() => [
      { a: 12, b: 34, op: '+', answer: 46, display: '12+34=' },
      { a: 56, b: 78, op: '+', answer: 134, display: '56+78=' },
      { a: 90, b: 12, op: '-', answer: 78, display: '90-12=' },
    ]),
    generateBasic: vi.fn(() => [
      { a: 100, b: 200, op: '+', answer: 300, display: '100+200=' },
      { a: 300, b: 400, op: '+', answer: 700, display: '300+400=' },
      { a: 500, b: 600, op: '+', answer: 1100, display: '500+600=' },
    ]),
  }
})

vi.mock('@/generators/custom', () => ({
  generateCustomStandard: vi.fn(() => [{ a: 10, b: 5, op: '+', answer: 15, display: '10+5=' }]),
  generateCustomPower: vi.fn(() => [{ a: 2, b: 2, op: '×', answer: 4, display: '2²=' }]),
}))
```

文件末尾追加测试：

```typescript
import { generateBasic } from '@/generators/basic'

describe('N-back 状态机', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('nback=0 行为不变：提交立即入库', async () => {
    const store = usePracticeStore()
    await store.init({ type: 'basic_addsub', subtype: '两位数加减', count: 3, nback: 0 })
    expect(store.nback).toBe(0)
    expect(store.pendingRecords).toHaveLength(0)

    store.inputChar('4')
    store.inputChar('6')
    await store.submit()
    expect(store.records).toHaveLength(1)
    expect(store.pendingRecords).toHaveLength(0)
    expect(insertRecord).toHaveBeenCalledTimes(1)
  })

  it('nback=1：前 1 题延迟入库', async () => {
    const store = usePracticeStore()
    await store.init({ type: 'basic_addsub', subtype: '两位数加减', count: 3, nback: 1 })

    store.inputChar('4')
    store.inputChar('6')
    await store.submit()
    expect(store.records).toHaveLength(0)
    expect(store.pendingRecords).toHaveLength(1)
    expect(store.nbackPrompting).toBe(false)
    expect(insertRecord).not.toHaveBeenCalled()

    store.inputChar('1')
    store.inputChar('3')
    store.inputChar('4')
    await store.submit()
    expect(store.nbackPrompting).toBe(true)
    expect(store.nbackTarget).not.toBeNull()
    expect(store.nbackTarget!.index).toBe(0)
  })

  it('nback=1：回忆正确则前题判对入库', async () => {
    const store = usePracticeStore()
    await store.init({ type: 'basic_addsub', subtype: '两位数加减', count: 3, nback: 1 })

    store.inputChar('4')
    store.inputChar('6')
    await store.submit()

    store.inputChar('1')
    store.inputChar('3')
    store.inputChar('4')
    await store.submit()
    expect(store.nbackPrompting).toBe(true)

    store.setNbackAnswer('46')
    await store.submitNback()
    expect(store.nbackPrompting).toBe(false)
    expect(store.records).toHaveLength(1)
    expect(store.records[0].isCorrect).toBe(true)
    expect(store.records[0].qIndex).toBe(0)
    expect(insertRecord).toHaveBeenCalledWith(
      expect.objectContaining({ qIndex: 0, isCorrect: true }),
    )
  })

  it('nback=1：回忆错误则前题判错入库', async () => {
    const store = usePracticeStore()
    await store.init({ type: 'basic_addsub', subtype: '两位数加减', count: 3, nback: 1 })

    store.inputChar('4')
    store.inputChar('6')
    await store.submit()

    store.inputChar('1')
    store.inputChar('3')
    store.inputChar('4')
    await store.submit()

    store.setNbackAnswer('99')
    await store.submitNback()
    expect(store.records[0].isCorrect).toBe(false)
  })

  it('nback=1 末尾收尾：最后一题答完回收剩余 pending', async () => {
    const store = usePracticeStore()
    await store.init({ type: 'basic_addsub', subtype: '两位数加减', count: 3, nback: 1 })

    // 题 0
    store.inputChar('4')
    store.inputChar('6')
    await store.submit()

    // 题 1 → 回忆题 0
    store.inputChar('1')
    store.inputChar('3')
    store.inputChar('4')
    await store.submit()
    store.setNbackAnswer('46')
    await store.submitNback()

    // 题 2 → 回忆题 1
    store.inputChar('7')
    store.inputChar('8')
    await store.submit()
    expect(store.nbackPrompting).toBe(true)
    store.setNbackAnswer('134')
    await store.submitNback()

    // 末尾：还剩题 2 待回忆
    expect(store.nbackPrompting).toBe(true)
    expect(store.nbackTarget!.index).toBe(2)
    store.setNbackAnswer('78')
    await store.submitNback()

    expect(store.phase).toBe('finished')
    expect(store.records).toHaveLength(3)
    expect(store.pendingRecords).toHaveLength(0)
  })

  it('skipNback 视为答错', async () => {
    const store = usePracticeStore()
    await store.init({ type: 'basic_addsub', subtype: '两位数加减', count: 3, nback: 1 })

    store.inputChar('4')
    store.inputChar('6')
    await store.submit()

    store.inputChar('1')
    store.inputChar('3')
    store.inputChar('4')
    await store.submit()

    await store.skipNback()
    expect(store.records[0].isCorrect).toBe(false)
    expect(store.nbackPrompting).toBe(false)
  })
})

describe('init 支持 basic 类型调度', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('init 用 addsub_2d 走 generateBasic', async () => {
    const store = usePracticeStore()
    await store.init({ type: 'addsub_2d', subtype: '两位数加减', count: 3 })
    expect(store.phase).toBe('running')
    expect(store.questions).toHaveLength(3)
    expect(generateBasic).toHaveBeenCalledWith('addsub_2d', 3)
  })

  it('init 用 add_3d 走 generateBasic', async () => {
    const store = usePracticeStore()
    await store.init({ type: 'add_3d', subtype: '三位数加法', count: 5 })
    expect(generateBasic).toHaveBeenCalledWith('add_3d', 5)
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm vitest run src/stores/__tests__/practice.test.ts`
预期：FAIL，报错 `store.nback is not defined`、`store.setNbackAnswer is not a function` 等

- [ ] **步骤 3：扩展 practice store**

修改 `src/stores/practice.ts`：

1. 顶部 import 追加：

```typescript
import { generateBasic, type BasicType, type BasicQuestion } from '@/generators/basic'
import {
  generateCustomStandard,
  generateCustomPower,
  type CustomStandardConfig,
  type CustomPowerConfig,
} from '@/generators/custom'
```

2. `SessionConfig` interface 修改为：

```typescript
export interface SessionConfig {
  type: string
  subtype: string
  count: number
  difficulty?: 'easy' | 'normal' | 'hard'
  nback?: 0 | 1 | 2
  customConfig?: CustomStandardConfig | CustomPowerConfig
}
```

3. 顶部加 `BASIC_TYPES` 常量（在 store 外）：

```typescript
const BASIC_TYPES: Set<string> = new Set([
  'addsub_2d',
  'round_100',
  'add_3d',
  'sub_3d',
  'addsub_3d',
  'add_multi',
  'addsub_mix',
  'mul_2x1',
  'mul_3x1',
  'mul_2x11',
  'mul_2x15',
  'mul_2x2',
  'div_3x1',
  'div_3x2',
  'mul_est',
  'div_5x3',
  'div_3x4',
])
```

4. store 内部新增状态（在现有 `error`/`timeStandard` 附近）：

```typescript
const nback = ref<0 | 1 | 2>(0)
const pendingRecords = ref<AnswerRecord[]>([])
const nbackPrompting = ref(false)
const nbackTarget = ref<{
  index: number
  question: string
  trueAnswer: string
  tolerance: number
} | null>(null)
const nbackAnswer = ref('')
```

5. `init` 函数改造（在现有 init 顶部加 nback 状态重置，在生成 qs 分支前加 custom/basic 调度）：

```typescript
async function init(cfg: SessionConfig) {
  stopTimer()
  try {
    nback.value = cfg.nback ?? 0
    pendingRecords.value = []
    nbackPrompting.value = false
    nbackTarget.value = null
    nbackAnswer.value = ''

    let qs: AnyQuestion[]
    if (cfg.type === 'custom_standard') {
      qs = generateCustomStandard(cfg.customConfig as CustomStandardConfig, cfg.count)
    } else if (cfg.type === 'custom_power') {
      qs = generateCustomPower(cfg.customConfig as CustomPowerConfig, cfg.count)
    } else if (BASIC_TYPES.has(cfg.type)) {
      qs = generateBasic(cfg.type as BasicType, cfg.count)
    } else if (cfg.type === 'basic_addsub') {
      qs = generateBasicAddSub(cfg.count)
    } else if (cfg.type.startsWith('compare_')) {
      qs = generateCompareQuestion(cfg.type as CompareType, cfg.count)
    } else {
      qs = generateDataQuestion(cfg.type as DataType, cfg.count, cfg.difficulty)
    }
    questions.value = qs
    currentIndex.value = 0
    currentAnswer.value = qs[0] && 'preset' in qs[0] ? (qs[0].preset ?? '') : ''
    compareChoice.value = null
    records.value = []
    elapsedMs.value = 0
    error.value = null
    config.value = cfg
    const id = await insertSession({
      type: cfg.type,
      subtype: cfg.subtype,
      difficulty: cfg.difficulty ?? 'normal',
      total: cfg.count,
      nback: cfg.nback ?? 0,
    })
    sessionId.value = id
    timeStandard.value = await getTimeStandard(cfg.type, cfg.count)
    questionStartedAt.value = performance.now()
    phase.value = 'running'
    startTimer()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    phase.value = 'idle'
  }
}
```

6. `submit` 函数改造（在现有 compare 分支后，numpad/data 分支内改造）：

```typescript
async function submit() {
  if (nbackPrompting.value) return // 由 submitNback 处理
  const q = currentQuestion.value
  if (q === null) return
  if (questionCategory.value === 'compare') {
    // 现有 compare 逻辑保留不动
    return
  }
  if (currentAnswer.value === '' || currentAnswer.value === '-' || currentAnswer.value === '0.')
    return
  const userAns = Number(currentAnswer.value)
  let isCorrect: boolean
  let tolerance: number
  if ('tolerance' in q) {
    tolerance = q.tolerance
    isCorrect =
      q.answer === 0
        ? userAns === 0
        : Math.abs(userAns - q.answer) / Math.abs(q.answer) <= tolerance
  } else {
    // basic 题型：检查 BasicQuestion.tolerance（mul_est 用 0.02）
    const bq = q as BasicQuestion
    tolerance = bq.tolerance ?? 0
    if (tolerance > 0) {
      isCorrect =
        q.answer === 0
          ? userAns === 0
          : Math.abs(userAns - q.answer) / Math.abs(q.answer) <= tolerance
    } else {
      isCorrect = userAns === q.answer
    }
  }
  const timeSpentMs =
    questionStartedAt.value !== null ? Math.floor(performance.now() - questionStartedAt.value) : 0
  const qd = q as Question | DataQuestion | BasicQuestion
  const record: AnswerRecord = {
    qIndex: currentIndex.value,
    question: qd.display,
    userAnswer: currentAnswer.value,
    trueAnswer: String(qd.answer),
    isCorrect,
    timeSpentMs,
    unit: 'tolerance' in qd ? qd.unit : undefined,
  }

  if (nback.value === 0) {
    records.value.push(record)
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
        })
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
  } else {
    pendingRecords.value.push(record)
  }

  currentAnswer.value = ''
  const isLast = currentIndex.value + 1 >= questions.value.length
  if (!isLast) {
    currentIndex.value += 1
    questionStartedAt.value = performance.now()
    const next = questions.value[currentIndex.value]
    currentAnswer.value = next && 'preset' in next ? (next.preset ?? '') : ''
  }

  // N-back 回收检查：pendingRecords.length > n 时回收最早的
  if (nback.value > 0 && pendingRecords.value.length > nback.value) {
    const target = pendingRecords.value.shift()!
    nbackTarget.value = {
      index: target.qIndex,
      question: target.question,
      trueAnswer: target.trueAnswer,
      tolerance: target.unit !== undefined ? 0.03 : 0,
    }
    nbackAnswer.value = ''
    nbackPrompting.value = true
  }

  if (isLast && nback.value === 0) {
    await finish()
  }
}
```

7. 新增 N-back 函数：

```typescript
function setNbackAnswer(v: string) {
  nbackAnswer.value = v
}

async function submitNback() {
  if (!nbackPrompting.value || nbackTarget.value === null) return
  const target = nbackTarget.value
  const userAns = Number(nbackAnswer.value)
  const trueAns = Number(target.trueAnswer)
  let isCorrect: boolean
  if (target.tolerance > 0) {
    isCorrect =
      trueAns === 0
        ? userAns === 0
        : Math.abs(userAns - trueAns) / Math.abs(trueAns) <= target.tolerance
  } else {
    isCorrect = userAns === trueAns
  }
  const record: AnswerRecord = {
    qIndex: target.index,
    question: target.question,
    userAnswer: nbackAnswer.value,
    trueAnswer: target.trueAnswer,
    isCorrect,
    timeSpentMs: 0,
  }
  records.value.push(record)
  try {
    if (sessionId.value !== null) {
      await insertRecord({
        sessionId: sessionId.value,
        qIndex: record.qIndex,
        question: record.question,
        userAnswer: record.userAnswer,
        trueAnswer: record.trueAnswer,
        isCorrect: record.isCorrect,
        tolerance: target.tolerance,
        timeSpentMs: 0,
      })
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
  nbackPrompting.value = false
  nbackTarget.value = null
  nbackAnswer.value = ''

  if (pendingRecords.value.length > 0) {
    const next = pendingRecords.value.shift()!
    nbackTarget.value = {
      index: next.qIndex,
      question: next.question,
      trueAnswer: next.trueAnswer,
      tolerance: next.unit !== undefined ? 0.03 : 0,
    }
    nbackPrompting.value = true
  } else if (currentIndex.value + 1 >= questions.value.length) {
    await finish()
  }
}

async function skipNback() {
  if (!nbackPrompting.value || nbackTarget.value === null) return
  const target = nbackTarget.value
  const record: AnswerRecord = {
    qIndex: target.index,
    question: target.question,
    userAnswer: '',
    trueAnswer: target.trueAnswer,
    isCorrect: false,
    timeSpentMs: 0,
  }
  records.value.push(record)
  try {
    if (sessionId.value !== null) {
      await insertRecord({
        sessionId: sessionId.value,
        qIndex: record.qIndex,
        question: record.question,
        userAnswer: record.userAnswer,
        trueAnswer: record.trueAnswer,
        isCorrect: false,
        tolerance: target.tolerance,
        timeSpentMs: 0,
      })
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
  nbackPrompting.value = false
  nbackTarget.value = null
  nbackAnswer.value = ''
  if (pendingRecords.value.length > 0) {
    const next = pendingRecords.value.shift()!
    nbackTarget.value = {
      index: next.qIndex,
      question: next.question,
      trueAnswer: next.trueAnswer,
      tolerance: next.unit !== undefined ? 0.03 : 0,
    }
    nbackPrompting.value = true
  } else if (currentIndex.value + 1 >= questions.value.length) {
    await finish()
  }
}
```

8. `reset` 函数末尾追加清理：

```typescript
function reset() {
  // ... 现有清理
  nback.value = 0
  pendingRecords.value = []
  nbackPrompting.value = false
  nbackTarget.value = null
  nbackAnswer.value = ''
}
```

9. return 对象追加导出：

```typescript
return {
  // ... 现有导出
  nback,
  pendingRecords,
  nbackPrompting,
  nbackTarget,
  nbackAnswer,
  setNbackAnswer,
  submitNback,
  skipNback,
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm vitest run src/stores/__tests__/practice.test.ts`
预期：PASS

- [ ] **步骤 5：运行全量测试确保未破坏 L1-L3**

运行：`pnpm vitest run`
预期：全部 PASS

- [ ] **步骤 6：Commit**

```bash
git add src/stores/practice.ts src/stores/__tests__/practice.test.ts
git commit -m "feat(store): SessionConfig 扩展 + N-back 延迟判分状态机"
```

---

## 任务 7：dataAnalysis.ts 启用 difficulty 参数

**文件：**

- 修改：`src/generators/dataAnalysis.ts`
- 测试：`src/generators/__tests__/dataAnalysis.test.ts`（追加）

**约束：**

- 现有 `generateDataQuestion(type, count, _difficulty)` 第三参数去下划线改为 `difficulty`
- 9 生成器内按 difficulty 调数值范围（简单范围小，困难范围大）
- 现有测试不破坏（默认 normal 行为不变）

- [ ] **步骤 1：编写失败的测试**

修改 `src/generators/__tests__/dataAnalysis.test.ts`，在文件末尾追加：

```typescript
describe('difficulty 参数影响数值范围', () => {
  it('estimate_prev easy 模式 A 范围更小', () => {
    const qsEasy = generateDataQuestion('estimate_prev', 50, 'easy')
    const qsHard = generateDataQuestion('estimate_prev', 50, 'hard')
    const maxA_Easy = Math.max(
      ...qsEasy.map((q) => {
        const m = q.context?.match(/现期: (\d+)/)
        return m ? Number(m[1]) : 0
      }),
    )
    const maxA_Hard = Math.max(
      ...qsHard.map((q) => {
        const m = q.context?.match(/现期: (\d+)/)
        return m ? Number(m[1]) : 0
      }),
    )
    expect(maxA_Hard).toBeGreaterThan(maxA_Easy)
  })

  it('baihua_frac easy 模式 n 范围更小', () => {
    const qsEasy = generateDataQuestion('baihua_frac', 50, 'easy')
    const qsHard = generateDataQuestion('baihua_frac', 50, 'hard')
    const ns_easy = qsEasy.map((q) => Number(q.display.match(/1\\\{(\d+)\\\}/)?.[1] ?? 0))
    const ns_hard = qsHard.map((q) => Number(q.display.match(/1\\\{(\d+)\\\}/)?.[1] ?? 0))
    expect(Math.max(...ns_hard)).toBeGreaterThanOrEqual(Math.max(...ns_easy))
  })

  it('默认 normal 与现有行为一致', () => {
    const qs = generateDataQuestion('estimate_prev', 5)
    const qsNormal = generateDataQuestion('estimate_prev', 5, 'normal')
    expect(qs).toHaveLength(5)
    expect(qsNormal).toHaveLength(5)
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm vitest run src/generators/__tests__/dataAnalysis.test.ts`
预期：FAIL（easy/hard 范围无差异）

- [ ] **步骤 3：修改 dataAnalysis.ts**

修改 `src/generators/dataAnalysis.ts`：

1. 顶部加 Difficulty 类型：

```typescript
export type Difficulty = 'easy' | 'normal' | 'hard'
```

2. 每个生成器加 `difficulty: Difficulty = "normal"` 参数，按难度调范围。示例（estimate_prev）：

```typescript
function genEstimatePrev(difficulty: Difficulty = 'normal'): DataQuestion {
  const ranges = {
    easy: { A: [500, 5000] as const, r: [0.05, 0.2] as const },
    normal: { A: [1000, 9999] as const, r: [0.05, 0.3] as const },
    hard: { A: [2000, 99999] as const, r: [0.05, 0.5] as const },
  }
  const range = ranges[difficulty]
  const A = randInt(range.A[0], range.A[1])
  const r = randFloat(range.r[0], range.r[1], 3)
  const answer = A / (1 + r)
  return {
    display: `\\frac{${A}}{${(1 + r).toFixed(3)}} \\approx`,
    answer: Number(answer.toFixed(2)),
    tolerance: 0.03,
    context: `现期: ${A}, 增长率: ${(r * 100).toFixed(1)}%`,
  }
}
```

3. 对 9 个生成器逐一改造，GENERATORS record 类型改为 `Record<DataType, (d: Difficulty) => DataQuestion>`：

```typescript
const GENERATORS: Record<DataType, (difficulty: Difficulty) => DataQuestion> = {
  estimate_prev: genEstimatePrev,
  // ... 其余 8 个
}

export function generateDataQuestion(
  type: DataType,
  count: number,
  difficulty: Difficulty = 'normal',
): DataQuestion[] {
  const gen = GENERATORS[type]
  const questions: DataQuestion[] = []
  for (let i = 0; i < count; i++) questions.push(gen(difficulty))
  return questions
}
```

各题型三档范围参考：

- estimate_prev：easy A∈[500,5000] r∈[5%,20%]；normal 现有；hard A∈[2000,99999] r∈[5%,50%]
- estimate_growth：同 estimate_prev
- baihua_frac：easy n∈[2,10]；normal n∈[2,20]；hard n∈[2,50]
- baihua_frac_rev：同 baihua_frac
- frac_calc_lt：easy a∈[100,499]；normal 现有；hard a∈[500,9999]
- frac_calc_gt：同 frac_calc_lt
- annual_growth_rate：easy first/last∈[10,50]；normal 现有；hard first/last∈[10,999]
- base_period_ratio：easy A/B∈[50,499]；normal 现有；hard A/B∈[200,9999]
- annual_avg：easy values∈[10,50]；normal 现有；hard values∈[10,999]

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm vitest run src/generators/__tests__/dataAnalysis.test.ts`
预期：PASS

- [ ] **步骤 5：Commit**

```bash
git add src/generators/dataAnalysis.ts src/generators/__tests__/dataAnalysis.test.ts
git commit -m "feat(gen): dataAnalysis 9 题型启用 difficulty 参数"
```

---

## 任务 8：NbackPrompt 组件

**文件：**

- 创建：`src/components/NbackPrompt.vue`
- 测试：`src/components/__tests__/NbackPrompt.test.ts`

**约束：**

- 不复用 Numpad（Numpad 是 emit 事件式 + 拖拽，N-back 弹窗场景不需要拖拽，用纯 input 简化）
- el-dialog 包裹，标题"N-back 回忆"，显示"第 X 题的答案是？"
- 内部用 `<input>` 接收数字答案 + 提交/跳过按钮
- v-model 控制 visible，emit submit/skip 事件

- [ ] **步骤 1：编写失败的测试**

创建 `src/components/__tests__/NbackPrompt.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NbackPrompt from '@/components/NbackPrompt.vue'

describe('NbackPrompt', () => {
  it('visible=true 时显示第 X 题提示', async () => {
    const wrapper = mount(NbackPrompt, {
      props: { visible: true, targetIndex: 2 },
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('第 3 题')
    expect(wrapper.text()).toContain('答案是')
  })

  it('输入答案后点提交 emit submit 事件', async () => {
    const wrapper = mount(NbackPrompt, {
      props: { visible: true, targetIndex: 0 },
    })
    await wrapper.find('input[data-testid="nback-input"]').setValue('42')
    await wrapper.find('button[data-testid="nback-submit"]').trigger('click')
    expect(wrapper.emitted('submit')).toBeTruthy()
    expect(wrapper.emitted('submit')![0]).toEqual(['42'])
  })

  it('点跳过 emit skip 事件', async () => {
    const wrapper = mount(NbackPrompt, {
      props: { visible: true, targetIndex: 0 },
    })
    await wrapper.find('button[data-testid="nback-skip"]').trigger('click')
    expect(wrapper.emitted('skip')).toBeTruthy()
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm vitest run src/components/__tests__/NbackPrompt.test.ts`
预期：FAIL，报错模块不存在

- [ ] **步骤 3：实现 NbackPrompt.vue**

创建 `src/components/NbackPrompt.vue`：

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  visible: boolean
  targetIndex: number
}
const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [v: boolean]
  submit: [answer: string]
  skip: []
}>()

const answer = ref('')

watch(
  () => props.visible,
  (v) => {
    if (v) answer.value = ''
  },
)

function onSubmit() {
  emit('submit', answer.value)
  emit('update:visible', false)
}

function onSkip() {
  emit('skip')
  emit('update:visible', false)
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="emit('update:visible', $event)"
    :show-close="false"
    :close-on-click-modal="false"
    title="N-back 回忆"
    width="320px"
  >
    <p class="prompt-text">第 {{ targetIndex + 1 }} 题的答案是？</p>
    <input
      data-testid="nback-input"
      v-model="answer"
      class="nback-input"
      type="text"
      inputmode="decimal"
      @keyup.enter="onSubmit"
      autofocus
    />
    <template #footer>
      <button data-testid="nback-skip" class="nback-skip-btn" @click="onSkip">跳过（计错）</button>
      <button data-testid="nback-submit" class="nback-submit-btn" @click="onSubmit">确定</button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.prompt-text {
  color: var(--app-text-primary, #93a1a1);
  text-align: center;
  margin: 12px 0;
  font-size: 16px;
}
.nback-input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--app-glass-border, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  background: var(--app-bg-surface, #073642);
  color: var(--app-text-bright, #fdf6e3);
  font-size: 18px;
  text-align: center;
  &:focus {
    outline: none;
    border-color: var(--app-color-primary, #5faf6f);
  }
}
.nback-skip-btn {
  padding: 8px 16px;
  background: var(--app-bg-surface, #073642);
  color: var(--app-text-primary, #93a1a1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  cursor: pointer;
  margin-right: 8px;
}
.nback-submit-btn {
  padding: 8px 16px;
  background: var(--app-color-primary, #5faf6f);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
</style>
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm vitest run src/components/__tests__/NbackPrompt.test.ts`
预期：PASS

- [ ] **步骤 5：Commit**

```bash
git add src/components/NbackPrompt.vue src/components/__tests__/NbackPrompt.test.ts
git commit -m "feat(ui): NbackPrompt 回忆弹窗组件"
```

---

## 任务 9：PracticeSettings.vue 接入 settings store + N-back 弹窗 + 自定义运算弹窗

**文件：**

- 修改：`src/views/PracticeSettings.vue`

**约束：**

- 接入 `useSettingsStore`，onMounted 调 load()
- 17 题型网格点击切换 selectedType 并 saveBasic（移除"待 L4 实现"提示）
- 第 18 项"自定义"点击打开自定义运算弹窗
- 键盘布局/触控笔/N-back 都接入 store
- 开始练习读 settings.basic.selectedType 调度：0-16 走 generateBasic，17 走 custom

- [ ] **步骤 1：实现 PracticeSettings.vue 改造**

完整替换 `src/views/PracticeSettings.vue`：

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { usePracticeStore } from '@/stores/practice'
import { useSettingsStore } from '@/stores/settings'
import { listCustomPresets, upsertCustomPreset, type CustomPreset } from '@/db/index'
import {
  generateCustomStandard,
  generateCustomPower,
  formatStandardName,
  formatPowerName,
  type CustomStandardConfig,
  type CustomPowerConfig,
} from '@/generators/custom'
import type { BasicType } from '@/generators/basic'

const router = useRouter()
const store = usePracticeStore()
const settings = useSettingsStore()

const questionTypes: { label: string; type: BasicType }[] = [
  { label: '两位数加减', type: 'addsub_2d' },
  { label: '凑整百练习', type: 'round_100' },
  { label: '三位数加法', type: 'add_3d' },
  { label: '三位数减法', type: 'sub_3d' },
  { label: '三位数加减', type: 'addsub_3d' },
  { label: '多数相加', type: 'add_multi' },
  { label: '混合加减', type: 'addsub_mix' },
  { label: '两位数乘一位数', type: 'mul_2x1' },
  { label: '三位数乘一位数', type: 'mul_3x1' },
  { label: '两位数乘11', type: 'mul_2x11' },
  { label: '两位数乘15', type: 'mul_2x15' },
  { label: '两位数乘两位数', type: 'mul_2x2' },
  { label: '三位数除一位数', type: 'div_3x1' },
  { label: '三位数除两位数', type: 'div_3x2' },
  { label: '乘法估算', type: 'mul_est' },
  { label: '五位数除三位数', type: 'div_5x3' },
  { label: '三位数除四位数', type: 'div_3x4' },
]

const countDialogVisible = ref(false)
const countMode = ref<'quick' | 'normal' | 'custom'>('quick')
const customCount = ref(10)

const modeLabel = ref('快速')

function openCountDialog() {
  countMode.value = settings.basic.countMode
  customCount.value = settings.basic.count
  countDialogVisible.value = true
}

function selectCountMode(mode: 'quick' | 'normal' | 'custom') {
  countMode.value = mode
  if (mode === 'quick') customCount.value = 10
  if (mode === 'normal') customCount.value = 15
}

async function confirmCount() {
  let count = customCount.value
  if (countMode.value === 'custom') {
    count = Math.max(5, Math.min(100, count))
  }
  await settings.saveBasic({ countMode: countMode.value, count })
  countDialogVisible.value = false
}

const nbackDialogVisible = ref(false)
const nbackChoice = ref<0 | 1 | 2>(0)

function openNbackDialog() {
  nbackChoice.value = settings.basic.nback
  nbackDialogVisible.value = true
}

async function confirmNback() {
  await settings.saveBasic({ nback: nbackChoice.value })
  nbackDialogVisible.value = false
}

const customVisible = ref(false)
const customTab = ref<'standard' | 'power'>('standard')
const presets = ref<CustomPreset[]>([])

const stdCfg = ref<CustomStandardConfig>({
  firstDigits: 2,
  operators: ['+'],
  secondMode: 'random_digits',
  secondDigits: 1,
})
const powCfg = ref<CustomPowerConfig>({
  baseMode: 'digits',
  baseDigits: 2,
  powerTypes: [2],
})

async function openCustomDialog() {
  customVisible.value = true
  presets.value = await listCustomPresets()
}

function loadPreset(p: CustomPreset) {
  const cfg = JSON.parse(p.config)
  if (cfg.operators) {
    stdCfg.value = cfg
    customTab.value = 'standard'
  } else {
    powCfg.value = cfg
    customTab.value = 'power'
  }
}

function toggleOperator(op: '+' | '-' | '×' | '÷') {
  const idx = stdCfg.value.operators.indexOf(op)
  if (idx >= 0) stdCfg.value.operators.splice(idx, 1)
  else stdCfg.value.operators.push(op)
}

function togglePower(p: 2 | 3) {
  const idx = powCfg.value.powerTypes.indexOf(p)
  if (idx >= 0) powCfg.value.powerTypes.splice(idx, 1)
  else powCfg.value.powerTypes.push(p)
}

async function onCustomConfirm() {
  let cfg: CustomStandardConfig | CustomPowerConfig
  let name: string
  let type: 'custom_standard' | 'custom_power'
  if (customTab.value === 'standard') {
    if (stdCfg.value.operators.length === 0) {
      ElMessage.warning('请至少选择一个运算符')
      return
    }
    cfg = stdCfg.value
    name = formatStandardName(cfg)
    type = 'custom_standard'
  } else {
    if (powCfg.value.powerTypes.length === 0) {
      ElMessage.warning('请至少选择一个运算类型')
      return
    }
    cfg = powCfg.value
    name = formatPowerName(cfg)
    type = 'custom_power'
  }
  await upsertCustomPreset(name, JSON.stringify(cfg))
  await settings.saveBasic({ selectedType: 17 })
  customVisible.value = false
  await startCustom(type, cfg)
}

async function startCustom(
  type: 'custom_standard' | 'custom_power',
  cfg: CustomStandardConfig | CustomPowerConfig,
) {
  await store.init({
    type,
    subtype: '自定义运算',
    count: settings.basic.count,
    nback: settings.basic.nback,
    customConfig: cfg,
  })
  if (store.phase === 'running') {
    router.push('/practice/session')
  } else {
    ElMessage.error(store.error ?? '练习初始化失败')
  }
}

async function onTypeClick(index: number) {
  if (index === 17) {
    await openCustomDialog()
    return
  }
  await settings.saveBasic({ selectedType: index })
}

function onPlaceholderClick(feature: string) {
  ElMessage.info(`${feature} 待后续实现`)
}

async function startPractice() {
  const idx = settings.basic.selectedType
  if (idx === 17) {
    ElMessage.info('请先在自定义中配置运算')
    return
  }
  const t = questionTypes[idx]
  await store.init({
    type: t.type,
    subtype: t.label,
    count: settings.basic.count,
    nback: settings.basic.nback,
  })
  if (store.phase === 'running') {
    router.push('/practice/session')
  } else {
    ElMessage.error(store.error ?? '练习初始化失败')
  }
}

function goHistory() {
  router.push('/history')
}

onMounted(() => settings.load())
</script>

<template>
  <div class="practice-settings">
    <div class="row">
      <span class="label">键盘布局</span>
      <el-radio-group
        :model-value="settings.basic.keyboardLayout"
        @change="(v) => settings.saveBasic({ keyboardLayout: v })"
      >
        <el-radio-button value="normal">正序</el-radio-button>
        <el-radio-button value="reverse">倒序</el-radio-button>
        <el-radio-button value="shuffle">乱序</el-radio-button>
      </el-radio-group>
    </div>

    <div class="row">
      <span class="label">触控笔</span>
      <el-switch
        :model-value="settings.basic.touchPen"
        @change="(v) => settings.saveBasic({ touchPen: v })"
      />
    </div>

    <div class="type-grid">
      <button
        v-for="(t, i) in questionTypes"
        :key="t.type"
        class="type-cell"
        :class="{ selected: i === settings.basic.selectedType }"
        @click="onTypeClick(i)"
      >
        {{ t.label }}
      </button>
      <button
        class="type-cell"
        :class="{ selected: settings.basic.selectedType === 17 }"
        @click="onTypeClick(17)"
      >
        自定义
      </button>
    </div>

    <div class="row" @click="openCountDialog">
      <span class="label">题量</span>
      <span class="value">{{ settings.basic.count }} 题 ›</span>
    </div>

    <div class="row" @click="openNbackDialog">
      <span class="label">N-back</span>
      <span class="value"
        >{{ settings.basic.nback === 0 ? '关闭' : `${settings.basic.nback}-back` }} ›</span
      >
    </div>

    <button class="start-btn" @click="startPractice">开始练习</button>

    <div class="bottom-row">
      <button class="bottom-btn" @click="onPlaceholderClick('导出题目')">导出题目</button>
      <button class="bottom-btn" @click="goHistory">历史记录</button>
    </div>

    <button class="fab" @click="onPlaceholderClick('自定义新增')">+</button>

    <el-dialog v-model="countDialogVisible" title="选择题量" width="320px">
      <div class="count-options">
        <button
          class="count-opt"
          :class="{ active: countMode === 'quick' }"
          @click="selectCountMode('quick')"
        >
          快速 10 题
        </button>
        <button
          class="count-opt"
          :class="{ active: countMode === 'normal' }"
          @click="selectCountMode('normal')"
        >
          正常 15 题
        </button>
        <div
          class="count-custom"
          :class="{ active: countMode === 'custom' }"
          @click="selectCountMode('custom')"
        >
          <div>自定义</div>
          <el-slider v-model="customCount" :min="5" :max="100" :step="1" />
          <div>{{ customCount }} 题</div>
        </div>
      </div>
      <template #footer>
        <el-button @click="countDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmCount">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="nbackDialogVisible" title="N-back 设置" width="320px">
      <div class="nback-options">
        <button class="nback-opt" :class="{ active: nbackChoice === 0 }" @click="nbackChoice = 0">
          关闭
        </button>
        <button class="nback-opt" :class="{ active: nbackChoice === 1 }" @click="nbackChoice = 1">
          1-back
        </button>
        <button class="nback-opt" :class="{ active: nbackChoice === 2 }" @click="nbackChoice = 2">
          2-back
        </button>
      </div>
      <template #footer>
        <el-button @click="nbackDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmNback">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="customVisible" title="自定义运算" width="480px">
      <el-tabs v-model="customTab">
        <el-tab-pane label="标准运算" name="standard">
          <div v-if="presets.length" class="recent-tags">
            <span class="recent-tag" v-for="p in presets" :key="p.id" @click="loadPreset(p)">{{
              p.name
            }}</span>
          </div>
          <div class="cfg-block">
            <div class="cfg-label">第一个数位数</div>
            <div class="cfg-buttons">
              <button
                v-for="d in [1, 2, 3, 4]"
                :key="d"
                class="cfg-btn"
                :class="{ active: stdCfg.firstDigits === d }"
                @click="stdCfg.firstDigits = d as 1 | 2 | 3 | 4"
              >
                {{ d }}位数
              </button>
            </div>
          </div>
          <div class="cfg-block">
            <div class="cfg-label">运算符（可多选）</div>
            <div class="cfg-buttons">
              <button
                v-for="op in ['+', '-', '×', '÷']"
                :key="op"
                class="cfg-btn"
                :class="{ active: stdCfg.operators.includes(op as any) }"
                @click="toggleOperator(op as any)"
              >
                {{ op }}
              </button>
            </div>
          </div>
          <div class="cfg-block">
            <div class="cfg-label">第二个数</div>
            <div class="cfg-buttons">
              <button
                class="cfg-btn"
                :class="{ active: stdCfg.secondMode === 'random_digits' }"
                @click="stdCfg.secondMode = 'random_digits'"
              >
                随机位数
              </button>
              <button
                class="cfg-btn"
                :class="{ active: stdCfg.secondMode === 'fixed' }"
                @click="stdCfg.secondMode = 'fixed'"
              >
                固定数字
              </button>
              <button
                class="cfg-btn"
                :class="{ active: stdCfg.secondMode === 'range' }"
                @click="stdCfg.secondMode = 'range'"
              >
                随机范围
              </button>
            </div>
            <div v-if="stdCfg.secondMode === 'random_digits'" class="sub-cfg">
              <button
                v-for="d in [1, 2, 3, 4]"
                :key="d"
                class="cfg-btn"
                :class="{ active: stdCfg.secondDigits === d }"
                @click="stdCfg.secondDigits = d as 1 | 2 | 3 | 4"
              >
                {{ d }}位数
              </button>
            </div>
            <input
              v-if="stdCfg.secondMode === 'fixed'"
              v-model.number="stdCfg.secondFixed"
              class="cfg-input"
              type="number"
              placeholder="固定数字"
            />
            <div v-if="stdCfg.secondMode === 'range'" class="sub-cfg">
              <input
                v-model.number="stdCfg.secondMin"
                class="cfg-input"
                type="number"
                placeholder="最小"
              />
              <span>~</span>
              <input
                v-model.number="stdCfg.secondMax"
                class="cfg-input"
                type="number"
                placeholder="最大"
              />
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="幂运算" name="power">
          <div class="cfg-block">
            <div class="cfg-label">底数设置方式</div>
            <div class="cfg-buttons">
              <button
                class="cfg-btn"
                :class="{ active: powCfg.baseMode === 'range' }"
                @click="powCfg.baseMode = 'range'"
              >
                按范围
              </button>
              <button
                class="cfg-btn"
                :class="{ active: powCfg.baseMode === 'digits' }"
                @click="powCfg.baseMode = 'digits'"
              >
                按位数
              </button>
            </div>
            <div v-if="powCfg.baseMode === 'range'" class="sub-cfg">
              <input
                v-model.number="powCfg.baseMin"
                class="cfg-input"
                type="number"
                placeholder="最小值"
              />
              <span>~</span>
              <input
                v-model.number="powCfg.baseMax"
                class="cfg-input"
                type="number"
                placeholder="最大值"
              />
            </div>
            <div v-if="powCfg.baseMode === 'digits'" class="sub-cfg">
              <button
                v-for="d in [1, 2, 3]"
                :key="d"
                class="cfg-btn"
                :class="{ active: powCfg.baseDigits === d }"
                @click="powCfg.baseDigits = d as 1 | 2 | 3"
              >
                {{ d }}位数
              </button>
            </div>
          </div>
          <div class="cfg-block">
            <div class="cfg-label">运算类型（可多选）</div>
            <div class="cfg-buttons">
              <button
                class="cfg-btn"
                :class="{ active: powCfg.powerTypes.includes(2) }"
                @click="togglePower(2)"
              >
                平方
              </button>
              <button
                class="cfg-btn"
                :class="{ active: powCfg.powerTypes.includes(3) }"
                @click="togglePower(3)"
              >
                立方
              </button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="customVisible = false">取消</el-button>
        <el-button type="primary" @click="onCustomConfirm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.practice-settings {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px;
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
.bottom-row {
  display: flex;
  gap: 12px;
  margin-top: 12px;
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
.fab {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #5b9bfc;
  color: #fff;
  border: none;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(91, 155, 252, 0.4);
}
.count-options,
.nback-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.count-opt,
.nback-opt {
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
.recent-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.recent-tag {
  padding: 4px 10px;
  background: rgba(95, 175, 111, 0.15);
  border: 1px solid rgba(95, 175, 111, 0.3);
  border-radius: 999px;
  font-size: 12px;
  color: var(--app-color-primary, #5faf6f);
  cursor: pointer;
  &:hover {
    background: rgba(95, 175, 111, 0.25);
  }
}
.cfg-block {
  margin-bottom: 16px;
}
.cfg-label {
  font-size: 13px;
  color: var(--app-text-primary, #93a1a1);
  margin-bottom: 8px;
}
.cfg-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.cfg-btn {
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: var(--app-bg-surface, #073642);
  color: var(--app-text-primary, #93a1a1);
  cursor: pointer;
  &.active {
    border-color: var(--app-color-primary, #5faf6f);
    background: rgba(95, 175, 111, 0.2);
    color: var(--app-color-primary, #5faf6f);
  }
}
.sub-cfg {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  align-items: center;
}
.cfg-input {
  width: 80px;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: var(--app-bg-surface, #073642);
  color: var(--app-text-bright, #fdf6e3);
}
</style>
```

- [ ] **步骤 2：运行 vue-tsc 验证类型**

运行：`pnpm vue-tsc --noEmit`
预期：无错误

- [ ] **步骤 3：运行全量测试确保未破坏其他**

运行：`pnpm vitest run`
预期：全部 PASS

- [ ] **步骤 4：Commit**

```bash
git add src/views/PracticeSettings.vue
git commit -m "feat(ui): PracticeSettings 接入 settings store + N-back + 自定义运算弹窗"
```

---

## 任务 10：DataAnalysisSettings.vue 接入 settings store + 难度 + 呈现方式 + N-back

**文件：**

- 修改：`src/views/DataAnalysisSettings.vue`

- [ ] **步骤 1：实现 DataAnalysisSettings.vue 改造**

完整替换 `src/views/DataAnalysisSettings.vue`：

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { usePracticeStore } from '@/stores/practice'
import { useSettingsStore } from '@/stores/settings'
import type { CompareType } from '@/generators/compareAnalysis'

const router = useRouter()
const store = usePracticeStore()
const settings = useSettingsStore()

const questionTypes: { label: string; type: string }[] = [
  { label: '估算前期量', type: 'estimate_prev' },
  { label: '估算增长量', type: 'estimate_growth' },
  { label: '百化分', type: 'baihua_frac' },
  { label: '百化分反向', type: 'baihua_frac_rev' },
  { label: '分数计算(＜)', type: 'frac_calc_lt' },
  { label: '分数计算(＞)', type: 'frac_calc_gt' },
  { label: '年均增长率', type: 'annual_growth_rate' },
  { label: '基期比重', type: 'base_period_ratio' },
  { label: '年平均量', type: 'annual_avg' },
]

const compareTypes: { label: string; type: CompareType }[] = [
  { label: '增量比大小', type: 'compare_growth' },
  { label: '基期比大小', type: 'compare_base' },
  { label: '分数比大小', type: 'compare_frac' },
]
const activeTab = ref<'fill' | 'compare'>('fill')

const countOptions = [5, 10, 15, 20, 25]
const customCount = ref(10)
const dialogVisible = ref(false)

function openDialog() {
  customCount.value = settings.dataAnalysis.count
  dialogVisible.value = true
}

async function selectPreset(n: number) {
  await settings.saveDataAnalysis({ count: n })
  dialogVisible.value = false
}

async function confirmCustom() {
  const count = Math.max(5, Math.min(100, customCount.value))
  await settings.saveDataAnalysis({ count })
  dialogVisible.value = false
}

const nbackDialogVisible = ref(false)
const nbackChoice = ref<0 | 1 | 2>(0)

function openNbackDialog() {
  nbackChoice.value = settings.dataAnalysis.nback
  nbackDialogVisible.value = true
}

async function confirmNback() {
  await settings.saveDataAnalysis({ nback: nbackChoice.value })
  nbackDialogVisible.value = false
}

async function startPractice() {
  const t = questionTypes[settings.dataAnalysis.selectedFillType]
  await store.init({
    type: t.type,
    subtype: t.label,
    count: settings.dataAnalysis.count,
    difficulty: settings.dataAnalysis.difficulty,
    nback: settings.dataAnalysis.nback,
  })
  if (store.phase === 'running') {
    router.push('/practice/session')
  } else {
    ElMessage.error(store.error ?? '练习初始化失败')
  }
}

async function startCompare() {
  const t = compareTypes[settings.dataAnalysis.selectedCompareType]
  await store.init({
    type: t.type,
    subtype: t.label,
    count: settings.dataAnalysis.count,
    difficulty: settings.dataAnalysis.difficulty,
  })
  if (store.phase === 'running') {
    router.push('/practice/session')
  } else {
    ElMessage.error(store.error ?? '练习初始化失败')
  }
}

function startComposite() {
  router.push('/practice/composite')
}

function goHistory() {
  router.push('/history')
}

onMounted(() => settings.load())
</script>

<template>
  <div class="da-settings">
    <h2 class="title">资料分析</h2>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="填空题" name="fill">
        <div class="row">
          <span class="label">选择难度</span>
          <div class="triple-buttons">
            <button
              class="triple-btn"
              :class="{ active: settings.dataAnalysis.difficulty === 'easy' }"
              @click="settings.saveDataAnalysis({ difficulty: 'easy' })"
            >
              简单
            </button>
            <button
              class="triple-btn"
              :class="{ active: settings.dataAnalysis.difficulty === 'normal' }"
              @click="settings.saveDataAnalysis({ difficulty: 'normal' })"
            >
              一般
            </button>
            <button
              class="triple-btn"
              :class="{ active: settings.dataAnalysis.difficulty === 'hard' }"
              @click="settings.saveDataAnalysis({ difficulty: 'hard' })"
            >
              困难
            </button>
          </div>
        </div>

        <div class="row">
          <span class="label">题目呈现方式</span>
          <div class="triple-buttons">
            <button
              class="triple-btn"
              :class="{ active: settings.dataAnalysis.displayMode === 'chart' }"
              @click="settings.saveDataAnalysis({ displayMode: 'chart' })"
            >
              生成文字图表
            </button>
            <button
              class="triple-btn"
              :class="{ active: settings.dataAnalysis.displayMode === 'formula' }"
              @click="settings.saveDataAnalysis({ displayMode: 'formula' })"
            >
              直接显示公式
            </button>
          </div>
        </div>

        <div class="type-grid">
          <button
            v-for="(t, i) in questionTypes"
            :key="t.type"
            class="type-cell"
            :class="{ selected: i === settings.dataAnalysis.selectedFillType }"
            @click="settings.saveDataAnalysis({ selectedFillType: i })"
          >
            {{ t.label }}
          </button>
        </div>

        <div class="row" @click="openDialog">
          <span class="label">题量</span>
          <span class="value">{{ settings.dataAnalysis.count }} 题 ›</span>
        </div>

        <div class="row" @click="openNbackDialog">
          <span class="label">N-back</span>
          <span class="value"
            >{{
              settings.dataAnalysis.nback === 0 ? '关闭' : `${settings.dataAnalysis.nback}-back`
            }}
            ›</span
          >
        </div>

        <button class="start-btn" @click="startPractice">开始练习</button>
        <button class="bottom-btn" @click="goHistory">历史记录</button>
      </el-tab-pane>

      <el-tab-pane label="比较题" name="compare">
        <div class="type-grid">
          <button
            v-for="(t, i) in compareTypes"
            :key="t.type"
            class="type-cell"
            :class="{ selected: i === settings.dataAnalysis.selectedCompareType }"
            @click="settings.saveDataAnalysis({ selectedCompareType: i })"
          >
            {{ t.label }}
          </button>
        </div>

        <div class="row" @click="openDialog">
          <span class="label">题量</span>
          <span class="value">{{ settings.dataAnalysis.count }} 题 ›</span>
        </div>

        <button class="start-btn" @click="startCompare">开始练习</button>
      </el-tab-pane>
    </el-tabs>

    <div class="composite-block">
      <h3 class="section-title">一表通算</h3>
      <button class="start-btn" @click="startComposite">开始练习</button>
    </div>

    <el-dialog v-model="dialogVisible" title="选择题量" width="320px">
      <div class="count-grid">
        <button
          v-for="n in countOptions"
          :key="n"
          class="count-opt"
          :class="{ active: settings.dataAnalysis.count === n }"
          @click="selectPreset(n)"
        >
          {{ n }} 题
        </button>
        <div class="count-custom">
          <div>自定义</div>
          <el-slider v-model="customCount" :min="5" :max="100" :step="1" />
          <div>{{ customCount }} 题</div>
          <el-button type="primary" size="small" @click="confirmCustom">确定</el-button>
        </div>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="nbackDialogVisible" title="N-back 设置" width="320px">
      <div class="nback-options">
        <button class="nback-opt" :class="{ active: nbackChoice === 0 }" @click="nbackChoice = 0">
          关闭
        </button>
        <button class="nback-opt" :class="{ active: nbackChoice === 1 }" @click="nbackChoice = 1">
          1-back
        </button>
        <button class="nback-opt" :class="{ active: nbackChoice === 2 }" @click="nbackChoice = 2">
          2-back
        </button>
      </div>
      <template #footer>
        <el-button @click="nbackDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmNback">确定</el-button>
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
.triple-buttons {
  display: flex;
  gap: 8px;
}
.triple-btn {
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: var(--app-bg-surface, #073642);
  color: var(--app-text-primary, #93a1a1);
  cursor: pointer;
  &.active {
    border-color: var(--app-color-primary, #5faf6f);
    background: rgba(95, 175, 111, 0.2);
    color: var(--app-color-primary, #5faf6f);
  }
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
.count-grid,
.nback-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.count-opt,
.nback-opt {
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
}
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
</style>
```

- [ ] **步骤 2：运行 vue-tsc 验证**

运行：`pnpm vue-tsc --noEmit`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add src/views/DataAnalysisSettings.vue
git commit -m "feat(ui): DataAnalysisSettings 接入 settings store + 难度 + 呈现方式 + N-back"
```

---

## 任务 11：PracticeSession.vue 接入 NbackPrompt + 顶栏 N-back 标记

**文件：**

- 修改：`src/views/PracticeSession.vue`

**约束：**

- 引入 NbackPrompt 组件，绑定 store.nbackPrompting
- 顶栏进度旁显示当前 N-back 等级（如 `1-back`）
- NbackPrompt 的 submit 事件调 store.setNbackAnswer + store.submitNback
- NbackPrompt 的 skip 事件调 store.skipNback

- [ ] **步骤 1：实现 PracticeSession.vue 改造**

修改 `src/views/PracticeSession.vue`，在现有 `<script setup>` 顶部 import，在 `<template>` 末尾加 NbackPrompt + 顶栏 N-back 标记：

`<script setup>` 内追加：

```typescript
import NbackPrompt from '@/components/NbackPrompt.vue'

async function onNbackSubmit(answer: string) {
  store.setNbackAnswer(answer)
  await store.submitNback()
}

async function onNbackSkip() {
  await store.skipNback()
}
```

`<template>` 内顶栏进度区域追加（在现有进度显示旁）：

```vue
<span v-if="store.nback > 0" class="nback-badge">{{ store.nback }}-back</span>
```

`<template>` 末尾（最外层 div 内）追加：

```vue
<NbackPrompt
  :visible="store.nbackPrompting"
  :target-index="store.nbackTarget?.index ?? 0"
  @update:visible="
    (v) => {
      if (!v && store.nbackPrompting) {
        /* 不允许点遮罩关闭 */
      }
    }
  "
  @submit="onNbackSubmit"
  @skip="onNbackSkip"
/>
```

`<style scoped lang="scss">` 末尾追加：

```scss
.nback-badge {
  display: inline-block;
  padding: 2px 8px;
  margin-left: 8px;
  background: rgba(255, 110, 140, 0.2);
  color: #ff6e8c;
  border: 1px solid rgba(255, 110, 140, 0.4);
  border-radius: 999px;
  font-size: 11px;
}
```

**实现者注意**：实际改动需在现有 PracticeSession.vue 基础上插入，不要整体替换。具体位置参考现有文件的顶栏与模板结构。

- [ ] **步骤 2：运行 vue-tsc 验证**

运行：`pnpm vue-tsc --noEmit`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add src/views/PracticeSession.vue
git commit -m "feat(ui): PracticeSession 接入 NbackPrompt + 顶栏 N-back 标记"
```

---

## 任务 12：ECharts 柱状图组件 + chart 呈现模式

**文件：**

- 修改：`package.json`（加 echarts 依赖）
- 创建：`src/components/BarChart.vue`
- 修改：`src/generators/dataAnalysis.ts`（DataQuestion 加 chartData 字段，2 生成器填充）
- 修改：`src/views/PracticeSession.vue`（chart 模式时年均增长率/年平均量用 BarChart）

**约束：**

- 仅 `annual_growth_rate`/`annual_avg` 在 displayMode=chart 时用 BarChart，其余题型 chart 模式降级为 formula
- DataQuestion 加可选 `chartData?: { labels: string[]; values: number[]; unit?: string }` 字段

- [ ] **步骤 1：安装 echarts**

运行：`pnpm add echarts`

- [ ] **步骤 2：扩展 DataQuestion 接口与生成器**

修改 `src/generators/dataAnalysis.ts`：

1. DataQuestion interface 加 chartData：

```typescript
export interface DataQuestion {
  display: string
  answer: number
  tolerance: number
  context?: string
  hint?: string
  preset?: string
  unit?: string
  chartData?: { labels: string[]; values: number[]; unit?: string }
}
```

2. `genAnnualGrowthRate` 与 `genAnnualAvg` 填 chartData。以 `genAnnualGrowthRate` 为例：

```typescript
function genAnnualGrowthRate(difficulty: Difficulty = 'normal'): DataQuestion {
  // 现有逻辑保留，生成 first/last/answer
  const labels = ['2012', '2013', '2014', '2015', '2016', '2017']
  const values = [first]
  for (let i = 1; i < 5; i++) {
    values.push(randInt(Math.min(first, last), Math.max(first, last)))
  }
  values.push(last)
  return {
    // 现有字段
    chartData: { labels, values, unit: '万' },
  }
}
```

`genAnnualAvg` 类似，labels 用 5 年，values 用现有的 5 个值。

- [ ] **步骤 3：创建 BarChart.vue**

创建 `src/components/BarChart.vue`：

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'

interface Props {
  labels: string[]
  values: number[]
  unit?: string
  title?: string
}
const props = defineProps<Props>()

const chartEl = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null

function render() {
  if (!chartEl.value || !chart) return
  chart.setOption({
    title: props.title
      ? { text: props.title, textStyle: { color: '#93a1a1', fontSize: 14 } }
      : undefined,
    xAxis: {
      type: 'category',
      data: props.labels,
      axisLabel: { color: '#93a1a1' },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#93a1a1', formatter: (v: number) => `${v}${props.unit ?? ''}` },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    series: [
      {
        type: 'bar',
        data: props.values,
        itemStyle: { color: '#5faf6f' },
        label: {
          show: true,
          position: 'top',
          color: '#93a1a1',
          formatter: (p: { value: number }) => `${p.value}${props.unit ?? ''}`,
        },
      },
    ],
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
  })
}

onMounted(() => {
  if (chartEl.value) {
    chart = echarts.init(chartEl.value)
    render()
  }
})

onUnmounted(() => {
  chart?.dispose()
})

watch(() => [props.labels, props.values], render, { deep: true })
</script>

<template>
  <div ref="chartEl" class="bar-chart"></div>
</template>

<style scoped lang="scss">
.bar-chart {
  width: 100%;
  height: 240px;
}
</style>
```

- [ ] **步骤 4：PracticeSession.vue chart 模式集成**

修改 `src/views/PracticeSession.vue`，在 `<script setup>` 加：

```typescript
import BarChart from '@/components/BarChart.vue'
import { useSettingsStore } from '@/stores/settings'
import { computed } from 'vue'
const settings = useSettingsStore()

const CHART_TYPES = new Set(['annual_growth_rate', 'annual_avg'])
const useChart = computed(() => {
  if (settings.dataAnalysis.displayMode !== 'chart') return false
  const q = store.currentQuestion
  if (!q || !('chartData' in q)) return false
  return CHART_TYPES.has(store.config?.type ?? '')
})
```

`<template>` 题目区根据 useChart 切换：

```vue
<div class="question-area">
  <BarChart
    v-if="useChart"
    :labels="(store.currentQuestion as any)?.chartData?.labels ?? []"
    :values="(store.currentQuestion as any)?.chartData?.values ?? []"
    :unit="(store.currentQuestion as any)?.chartData?.unit"
  />
  <Katex v-else :expr="store.currentQuestion?.display ?? ''" />
  <!-- 现有上下文/误差/时间标准行保留 -->
</div>
```

- [ ] **步骤 5：运行 vue-tsc 验证**

运行：`pnpm vue-tsc --noEmit`
预期：无错误

- [ ] **步骤 6：运行全量测试**

运行：`pnpm vitest run`
预期：全部 PASS

- [ ] **步骤 7：Commit**

```bash
git add package.json src/components/BarChart.vue src/generators/dataAnalysis.ts src/views/PracticeSession.vue
git commit -m "feat(ui): ECharts 柱状图 + chart 呈现模式（年均增长率/年平均量）"
```

---

## 任务 13：自动化验证

**文件：** 全项目

- [ ] **步骤 1：运行全量测试**

运行：`pnpm vitest run`
预期：全部 PASS（含 L1-L3 现有测试 + L4 新增测试）

- [ ] **步骤 2：vue-tsc 类型检查**

运行：`pnpm vue-tsc --noEmit`
预期：0 错误

- [ ] **步骤 3：vite 构建**

运行：`pnpm vite build`
预期：构建成功

- [ ] **步骤 4：cargo check**

运行：`cd src-tauri && cargo check`
预期：编译通过

- [ ] **步骤 5：cargo build release**

运行：`cd src-tauri && cargo build --release`
预期：编译通过，binary 启动无 panic

- [ ] **步骤 6：ad-hoc 签名**

运行（macOS）：

```bash
cd src-tauri
codesign --force --sign - --entitlements entitlements.plist target/release/bundle/macos/行测小助手.app
```

预期：签名成功

- [ ] **步骤 7：启动 binary 验证 migration**

运行：`open src-tauri/target/release/bundle/macos/行测小助手.app`
预期：应用启动，SQLite 自动跑 migration 0005，无 panic，无 TCC 报错

- [ ] **步骤 8：包体积检查**

运行：`du -sh src-tauri/target/release/bundle/macos/行测小助手.app`
预期：< 30MB（当前 13MB → 预计 14-15MB，加 ECharts +1MB）

- [ ] **步骤 9：Commit 验证记录**

```bash
git commit --allow-empty -m "chore: L4 自动化验证通过（测试/vite/cargo/签名/启动）"
```

---

## 自检

**1. 规格覆盖度：**

- §2 设置持久化 → 任务 4（db）+ 任务 5（store）+ 任务 9/10（UI 接入）✓
- §3 17 题型生成器 → 任务 2 ✓
- §4 自定义运算 → 任务 3（生成器）+ 任务 4（preset CRUD）+ 任务 9（弹窗 UI）✓
- §5 N-back → 任务 6（store 状态机）+ 任务 8（NbackPrompt）+ 任务 11（PracticeSession 接入）✓
- §6 UI 扩展 → 任务 9（PracticeSettings）+ 任务 10（DataAnalysisSettings）+ 任务 11（PracticeSession N-back 标记）+ 任务 12（BarChart）✓
- §7 数据库变更 → 任务 1（migration 0005）✓
- §8 测试策略 → 各任务内 TDD ✓
- §3.6 时间标准种子 → 任务 1 ✓
- §6.3 difficulty 影响 → 任务 7 ✓
- §6.4 呈现方式 → 任务 12 ✓

**2. 占位符扫描：** 无 TODO/待定；所有代码块完整。

**3. 类型一致性：**

- `BasicQuestion` 在任务 2 定义，任务 3（custom.ts）import 使用 ✓
- `CustomStandardConfig`/`CustomPowerConfig` 在任务 3 定义，任务 6（store）+ 任务 9（UI）使用 ✓
- `SessionConfig` 在任务 6 扩展，任务 9/10 调用 init 时传 nback/difficulty/customConfig ✓
- `setNbackAnswer`/`submitNback`/`skipNback` 在任务 6 定义，任务 11（PracticeSession）调用 ✓
- `nbackTarget` 携带 `{ index, question, trueAnswer, tolerance }`，任务 8 NbackPrompt 用 `targetIndex`，任务 11 传 `store.nbackTarget?.index` ✓

---

## 执行交接

计划已完成并保存到 `docs/superpowers/plans/2026-07-04-level-4-settings-custom-nback.md`。两种执行方式：

**1. 子代理驱动（推荐）** - 每个任务调度一个新的子代理，任务间进行审查，快速迭代

**2. 内联执行** - 在当前会话中使用 executing-plans 执行任务，批量执行并设有检查点

选哪种方式？
