# Level 1 实现计划：基础计算闭环 + 双输入

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 打通"出题 → 答题 → 判分 → 计时 → 入库 → 结算"完整闭环，聚焦两位数加减单一题型，复刻原版基础计算设置页（18 题型网格，17 格占位）。

**架构：** 方案 A — Pinia store（会话状态机 idle→running→finished）+ 三段式路由（/practice 设置 → /practice/session 答题 → /practice/result 结算）+ 纯函数生成器 + props 驱动无状态 Numpad。

**技术栈：** Tauri 2 + Vue 3.5 + TS + Vite 6 + Pinia + Vue Router 4 + Element Plus 2.8 + tauri-plugin-sql 2 + vitest + @vue/test-utils + jsdom

**设计规格：** `docs/superpowers/specs/2026-07-03-level-1-basic-calc-design.md`

**前置：** L0 已合并到 main（项目骨架 + Solarized 深色 + Liquid Glass + SQLite 5 表 + 5 路由占位）。在专用 worktree `feature/level-1` 中执行。

---

## 文件结构

| 文件                                                | 职责                                                                    | 创建/修改 |
| --------------------------------------------------- | ----------------------------------------------------------------------- | --------- |
| `src-tauri/migrations/0002_add_basic_addsub_15.sql` | 插入 basic_addsub×15 时间标准种子                                       | 创建      |
| `src-tauri/src/lib.rs`                              | 注册 migration 0002                                                     | 修改      |
| `src/db/index.ts`                                   | getTimeStandard + insertSession/insertRecord/updateSession/listSessions | 修改      |
| `src/generators/basic.ts`                           | 两位数加减纯函数生成器                                                  | 创建      |
| `src/stores/practice.ts`                            | Pinia store 会话状态机                                                  | 创建      |
| `src/components/Numpad.vue`                         | 数字键盘（props 驱动无状态 + 拖拽）                                     | 创建      |
| `src/components/TopBar.vue`                         | 答题顶栏                                                                | 创建      |
| `src/views/PracticeSettings.vue`                    | 基础计算设置页（18 题型网格 + 题量弹窗 + 占位）                         | 创建      |
| `src/views/PracticeSession.vue`                     | 答题页（双输入 + 提交反馈）                                             | 创建      |
| `src/views/PracticeResult.vue`                      | 结算页（清单 + 三按钮）                                                 | 创建      |
| `src/views/History.vue`                             | 会话记录列表（L1 最小实现）                                             | 修改      |
| `src/views/Home.vue`                                | "基础计算"卡片跳 /practice                                              | 修改      |
| `src/router/index.ts`                               | 三段式路由                                                              | 修改      |
| `package.json`                                      | vitest + @vue/test-utils + jsdom 依赖                                   | 修改      |
| `vitest.config.ts`                                  | vitest 配置                                                             | 创建      |
| `src/generators/__tests__/basic.test.ts`            | 生成器单测                                                              | 创建      |
| `src/stores/__tests__/practice.test.ts`             | store 单测                                                              | 创建      |
| `src/db/__tests__/index.test.ts`                    | DB 集成测                                                               | 创建      |
| `src/components/__tests__/Numpad.test.ts`           | Numpad 交互测                                                           | 创建      |

边界原则：生成器纯函数无副作用可单测；store 是唯一会话状态源；Numpad 无状态可复用 L2；DB 层封装 SQL 细节。

---

## 任务 1：测试基建

**文件：**

- 修改：`package.json`
- 创建：`vitest.config.ts`

- [ ] **步骤 1：安装测试依赖**

运行：

```bash
cd /Users/linkslinks/project/speed_calc/.worktrees/level-1
pnpm add -D vitest@2 @vue/test-utils@2 jsdom@25 @pinia/testing@0.1
```

预期：package.json devDependencies 增加 vitest/@vue/test-utils/jsdom/@pinia/testing

- [ ] **步骤 2：创建 vitest 配置**

创建 `vitest.config.ts`：

```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/__tests__/**/*.test.ts'],
  },
})
```

- [ ] **步骤 3：在 package.json 加 test 脚本**

修改 `package.json` scripts，加：

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **步骤 4：运行空测试验证基建**

运行：`pnpm test`
预期：vitest 启动，0 测试通过（无测试文件），无配置错误

- [ ] **步骤 5：Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts
git commit -m "test(l1): 添加 vitest 测试基建"
```

---

## 任务 2：migration 0002 + DB 层扩展

**文件：**

- 创建：`src-tauri/migrations/0002_add_basic_addsub_15.sql`
- 修改：`src-tauri/src/lib.rs`
- 修改：`src/db/index.ts`
- 创建：`src/db/__tests__/index.test.ts`

- [ ] **步骤 1：创建 migration 0002 SQL**

创建 `src-tauri/migrations/0002_add_basic_addsub_15.sql`：

```sql
INSERT OR IGNORE INTO time_standards
  (question_type, question_count, pass_s, good_s, excellent_s)
VALUES
  ('basic_addsub', 15, 42, 33, 27);
```

- [ ] **步骤 2：在 lib.rs 注册 migration 0002**

修改 `src-tauri/src/lib.rs`，在 `migrations()` 函数的 vec 中追加第二个 Migration：

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
    ]
}
```

- [ ] **步骤 3：编写 DB 层失败的测试**

创建 `src/db/__tests__/index.test.ts`：

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

// mock @tauri-apps/plugin-sql 的 Database.load
const mockSelect = vi.fn()
const mockExecute = vi.fn()
vi.mock('@tauri-apps/plugin-sql', () => ({
  default: {
    load: vi.fn(() =>
      Promise.resolve({ select: mockSelect, execute: mockExecute, close: vi.fn() }),
    ),
  },
}))

import {
  getTimeStandard,
  insertSession,
  insertRecord,
  updateSession,
  listSessions,
} from '@/db/index'

describe('db/index.ts', () => {
  beforeEach(() => {
    mockSelect.mockReset()
    mockExecute.mockReset()
  })

  describe('getTimeStandard', () => {
    it('命中题型+题量返回标准', async () => {
      mockSelect.mockResolvedValueOnce([{ pass_s: 28, good_s: 22, excellent_s: 18 }])
      const r = await getTimeStandard('basic_addsub', 10)
      expect(r).toEqual({ pass: 28, good: 22, excellent: 18 })
    })

    it('未命中题量时降级返回同题型最接近且<=的档', async () => {
      // 第一次查询 count=7 无结果
      mockSelect.mockResolvedValueOnce([])
      // 第二次查询同题型所有行（取 count<=7 最近，即无，回退查所有 <= 实际逻辑取最大 count<=target）
      mockSelect.mockResolvedValueOnce([
        { question_count: 10, pass_s: 28, good_s: 22, excellent_s: 18 },
        { question_count: 15, pass_s: 42, good_s: 33, excellent_s: 27 },
      ])
      const r = await getTimeStandard('basic_addsub', 7)
      // 7 < 10 < 15，取 10 档降级
      expect(r).toEqual({ pass: 28, good: 22, excellent: 18 })
    })

    it('题型完全不存在返回 null', async () => {
      mockSelect.mockResolvedValueOnce([])
      mockSelect.mockResolvedValueOnce([])
      const r = await getTimeStandard('unknown_type', 10)
      expect(r).toBeNull()
    })
  })

  describe('insertSession', () => {
    it('插入会话返回 id', async () => {
      mockExecute.mockResolvedValueOnce({ lastInsertId: 42 })
      const id = await insertSession({
        type: 'basic_addsub',
        subtype: '两位数加减',
        difficulty: 'normal',
        total: 10,
        nback: 0,
      })
      expect(id).toBe(42)
      expect(mockExecute).toHaveBeenCalledOnce()
    })
  })

  describe('insertRecord', () => {
    it('插入答题记录', async () => {
      mockExecute.mockResolvedValueOnce({ lastInsertId: 1 })
      await insertRecord({
        sessionId: 42,
        qIndex: 0,
        question: '61+84=',
        userAnswer: '145',
        trueAnswer: '145',
        isCorrect: true,
        tolerance: 0,
        timeSpentMs: 3000,
      })
      expect(mockExecute).toHaveBeenCalledOnce()
    })
  })

  describe('updateSession', () => {
    it('更新会话正确数与总时长', async () => {
      await updateSession(42, { correct: 8, durationMs: 120000 })
      expect(mockExecute).toHaveBeenCalledOnce()
    })
  })

  describe('listSessions', () => {
    it('按 created_at DESC 返回会话列表', async () => {
      mockSelect.mockResolvedValueOnce([
        {
          id: 2,
          type: 'basic_addsub',
          total: 10,
          correct: 9,
          duration_ms: 60000,
          created_at: 1700000002,
        },
        {
          id: 1,
          type: 'basic_addsub',
          total: 10,
          correct: 7,
          duration_ms: 90000,
          created_at: 1700000001,
        },
      ])
      const list = await listSessions()
      expect(list).toHaveLength(2)
      expect(list[0].id).toBe(2)
    })
  })
})
```

- [ ] **步骤 4：运行测试验证失败**

运行：`pnpm test src/db/__tests__/index.test.ts`
预期：FAIL，报错 "Failed to resolve import '@/db/index'" 中的 getTimeStandard 等未导出

- [ ] **步骤 5：实现 DB 层扩展**

修改 `src/db/index.ts`，在现有代码后追加：

```typescript
// ===== L1 扩展 =====

export interface TimeStandard {
  pass: number
  good: number
  excellent: number
}

export async function getTimeStandard(
  questionType: string,
  questionCount: number,
): Promise<TimeStandard | null> {
  const db = await getDb()
  // 1. 精确命中
  const exact = await db.select<{ pass_s: number; good_s: number; excellent_s: number }[]>(
    `SELECT pass_s, good_s, excellent_s FROM time_standards
     WHERE question_type = $1 AND question_count = $2`,
    [questionType, questionCount],
  )
  if (exact.length > 0) {
    return { pass: exact[0].pass_s, good: exact[0].good_s, excellent: exact[0].excellent_s }
  }
  // 2. 降级：同题型 count <= target 取最大
  const fallback = await db.select<
    { question_count: number; pass_s: number; good_s: number; excellent_s: number }[]
  >(
    `SELECT question_count, pass_s, good_s, excellent_s FROM time_standards
     WHERE question_type = $1 AND question_count <= $2
     ORDER BY question_count DESC LIMIT 1`,
    [questionType, questionCount],
  )
  if (fallback.length > 0) {
    return {
      pass: fallback[0].pass_s,
      good: fallback[0].good_s,
      excellent: fallback[0].excellent_s,
    }
  }
  // 3. 全无
  return null
}

export interface SessionInput {
  type: string
  subtype: string
  difficulty: string
  total: number
  nback: number
}

export async function insertSession(input: SessionInput): Promise<number> {
  const db = await getDb()
  const result = await db.execute(
    `INSERT INTO sessions (type, subtype, difficulty, total, correct, duration_ms, nback, created_at)
     VALUES ($1, $2, $3, $4, 0, 0, $5, $6)`,
    [input.type, input.subtype, input.difficulty, input.total, input.nback, Date.now()],
  )
  return result.lastInsertId
}

export interface RecordInput {
  sessionId: number
  qIndex: number
  question: string
  userAnswer: string
  trueAnswer: string
  isCorrect: boolean
  tolerance: number
  timeSpentMs: number
}

export async function insertRecord(input: RecordInput): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT INTO records (session_id, q_index, question, user_answer, true_answer, is_correct, tolerance, time_spent_ms, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      input.sessionId,
      input.qIndex,
      input.question,
      input.userAnswer,
      input.trueAnswer,
      input.isCorrect ? 1 : 0,
      input.tolerance,
      input.timeSpentMs,
      Date.now(),
    ],
  )
}

export async function updateSession(
  sessionId: number,
  data: { correct: number; durationMs: number },
): Promise<void> {
  const db = await getDb()
  await db.execute(`UPDATE sessions SET correct = $1, duration_ms = $2 WHERE id = $3`, [
    data.correct,
    data.durationMs,
    sessionId,
  ])
}

export interface SessionRow {
  id: number
  type: string
  subtype: string
  total: number
  correct: number
  duration_ms: number
  created_at: number
}

export async function listSessions(): Promise<SessionRow[]> {
  const db = await getDb()
  return db.select<SessionRow[]>(
    `SELECT id, type, subtype, total, correct, duration_ms, created_at
     FROM sessions ORDER BY created_at DESC`,
  )
}
```

- [ ] **步骤 6：运行测试验证通过**

运行：`pnpm test src/db/__tests__/index.test.ts`
预期：PASS，所有用例通过

- [ ] **步骤 7：cargo check 验证 migration 注册**

运行：

```bash
cd src-tauri
export PATH="/opt/homebrew/opt/rustup/bin:/opt/homebrew/bin:$PATH"
cargo check
```

预期：编译通过，无错误

- [ ] **步骤 8：Commit**

```bash
git add src-tauri/migrations/0002_add_basic_addsub_15.sql src-tauri/src/lib.rs src/db/index.ts src/db/__tests__/index.test.ts
git commit -m "feat(l1): migration 0002 + DB 层扩展（时间标准查询/会话CRUD）"
```

---

## 任务 3：两位数加减生成器

**文件：**

- 创建：`src/generators/basic.ts`
- 创建：`src/generators/__tests__/basic.test.ts`

- [ ] **步骤 1：编写生成器失败的测试**

创建 `src/generators/__tests__/basic.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { generateBasicAddSub, type Question } from '@/generators/basic'

describe('generateBasicAddSub', () => {
  it('生成指定数量的题', () => {
    const qs = generateBasicAddSub(10)
    expect(qs).toHaveLength(10)
  })

  it('每题 a/b 在 10-99 范围', () => {
    const qs = generateBasicAddSub(50)
    for (const q of qs) {
      expect(q.a).toBeGreaterThanOrEqual(10)
      expect(q.a).toBeLessThanOrEqual(99)
      expect(q.b).toBeGreaterThanOrEqual(10)
      expect(q.b).toBeLessThanOrEqual(99)
    }
  })

  it('op 只能是 + 或 -', () => {
    const qs = generateBasicAddSub(50)
    for (const q of qs) {
      expect(['+', '-']).toContain(q.op)
    }
  })

  it('减法结果非负', () => {
    const qs = generateBasicAddSub(100)
    for (const q of qs) {
      if (q.op === '-') {
        expect(q.answer).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('answer 计算正确', () => {
    const qs = generateBasicAddSub(100)
    for (const q of qs) {
      if (q.op === '+') expect(q.answer).toBe(q.a + q.b)
      if (q.op === '-') expect(q.answer).toBe(q.a - q.b)
    }
  })

  it('display 格式为 a{op}b=', () => {
    const qs = generateBasicAddSub(10)
    for (const q of qs) {
      expect(q.display).toMatch(/^\d{2}[+-]\d{2}=$/)
    }
  })

  it('边界 count=5 与 count=100', () => {
    expect(generateBasicAddSub(5)).toHaveLength(5)
    expect(generateBasicAddSub(100)).toHaveLength(100)
  })

  it('多次调用结果不全相同（随机性）', () => {
    const run1 = generateBasicAddSub(20)
      .map((q) => q.display)
      .join(',')
    const run2 = generateBasicAddSub(20)
      .map((q) => q.display)
      .join(',')
    expect(run1).not.toEqual(run2)
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm test src/generators/__tests__/basic.test.ts`
预期：FAIL，"Failed to resolve import '@/generators/basic'"

- [ ] **步骤 3：实现生成器**

创建 `src/generators/basic.ts`：

```typescript
export interface Question {
  a: number
  b: number
  op: '+' | '-'
  answer: number
  display: string
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function generateBasicAddSub(count: number): Question[] {
  const questions: Question[] = []
  for (let i = 0; i < count; i++) {
    const op: '+' | '-' = Math.random() < 0.5 ? '+' : '-'
    let a = randInt(10, 99)
    let b = randInt(10, 99)
    // 减法保证非负：a >= b
    if (op === '-' && a < b) {
      ;[a, b] = [b, a]
    }
    const answer = op === '+' ? a + b : a - b
    questions.push({ a, b, op, answer, display: `${a}${op}${b}=` })
  }
  return questions
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm test src/generators/__tests__/basic.test.ts`
预期：PASS，8 个用例全通过

- [ ] **步骤 5：Commit**

```bash
git add src/generators/basic.ts src/generators/__tests__/basic.test.ts
git commit -m "feat(l1): 两位数加减生成器（纯函数 + 单测）"
```

---

## 任务 4：Pinia store 会话状态机

**文件：**

- 创建：`src/stores/practice.ts`
- 创建：`src/stores/__tests__/practice.test.ts`

- [ ] **步骤 1：编写 store 失败的测试**

创建 `src/stores/__tests__/practice.test.ts`：

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// mock db 层
vi.mock('@/db/index', () => ({
  insertSession: vi.fn().mockResolvedValue(42),
  insertRecord: vi.fn().mockResolvedValue(undefined),
  updateSession: vi.fn().mockResolvedValue(undefined),
  getTimeStandard: vi.fn().mockResolvedValue({ pass: 28, good: 22, excellent: 18 }),
}))

import { usePracticeStore } from '@/stores/practice'

describe('usePracticeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('init 后进入 running 态并生成题目', async () => {
    const store = usePracticeStore()
    await store.init({ type: 'basic_addsub', subtype: '两位数加减', count: 10 })
    expect(store.phase).toBe('running')
    expect(store.sessionId).toBe(42)
    expect(store.questions).toHaveLength(10)
    expect(store.currentIndex).toBe(0)
    expect(store.currentAnswer).toBe('')
  })

  it('inputChar 追加字符到 currentAnswer', () => {
    const store = usePracticeStore()
    store.inputChar('1')
    store.inputChar('2')
    expect(store.currentAnswer).toBe('12')
  })

  it('toggleSign 切换答案前缀正负', () => {
    const store = usePracticeStore()
    store.inputChar('5')
    store.toggleSign()
    expect(store.currentAnswer).toBe('-5')
    store.toggleSign()
    expect(store.currentAnswer).toBe('5')
  })

  it('clearAnswer 清空', () => {
    const store = usePracticeStore()
    store.inputChar('1')
    store.clearAnswer()
    expect(store.currentAnswer).toBe('')
  })

  it('backspace 删除末字符', () => {
    const store = usePracticeStore()
    store.inputChar('1')
    store.inputChar('2')
    store.backspace()
    expect(store.currentAnswer).toBe('1')
  })

  it('submit 判分正确并推进索引', async () => {
    const store = usePracticeStore()
    await store.init({ type: 'basic_addsub', subtype: '两位数加减', count: 10 })
    // 找到第一题答案
    const firstQ = store.questions[0]
    store.inputChar(String(firstQ.answer))
    await store.submit()
    expect(store.records).toHaveLength(1)
    expect(store.records[0].isCorrect).toBe(true)
    expect(store.currentIndex).toBe(1)
    expect(store.currentAnswer).toBe('')
  })

  it('submit 判分错误也推进', async () => {
    const store = usePracticeStore()
    await store.init({ type: 'basic_addsub', subtype: '两位数加减', count: 10 })
    const firstQ = store.questions[0]
    store.inputChar(String(firstQ.answer + 1))
    await store.submit()
    expect(store.records[0].isCorrect).toBe(false)
    expect(store.currentIndex).toBe(1)
  })

  it('最后一题 submit 后 finish 进入 finished 态', async () => {
    const store = usePracticeStore()
    await store.init({ type: 'basic_addsub', subtype: '两位数加减', count: 2 })
    // 第一题
    store.inputChar(String(store.questions[0].answer))
    await store.submit()
    // 第二题（最后一题）
    store.inputChar(String(store.questions[1].answer))
    await store.submit()
    expect(store.phase).toBe('finished')
    expect(store.records).toHaveLength(2)
  })

  it('restart 清状态并重新 init（新 sessionId）', async () => {
    const store = usePracticeStore()
    await store.init({ type: 'basic_addsub', subtype: '两位数加减', count: 10 })
    store.inputChar('1')
    await store.submit()
    const oldSessionId = store.sessionId
    const oldRecords = store.records.length
    await store.restart()
    expect(store.sessionId).toBe(42) // mock 固定返回 42，新会话
    expect(store.currentIndex).toBe(0)
    expect(store.currentAnswer).toBe('')
    expect(store.records).toHaveLength(0)
  })

  it('正确数统计正确', async () => {
    const store = usePracticeStore()
    await store.init({ type: 'basic_addsub', subtype: '两位数加减', count: 3 })
    // 全答对
    store.inputChar(String(store.questions[0].answer))
    await store.submit()
    store.inputChar(String(store.questions[1].answer))
    await store.submit()
    store.inputChar(String(store.questions[2].answer))
    await store.submit()
    expect(store.phase).toBe('finished')
    expect(store.correctCount).toBe(3)
    expect(store.errorCount).toBe(0)
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm test src/stores/__tests__/practice.test.ts`
预期：FAIL，"Failed to resolve import '@/stores/practice'"

- [ ] **步骤 3：实现 store**

创建 `src/stores/practice.ts`：

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateBasicAddSub, type Question } from '@/generators/basic'
import {
  insertSession,
  insertRecord,
  updateSession,
  getTimeStandard,
  type TimeStandard,
} from '@/db/index'

export interface AnswerRecord {
  qIndex: number
  question: string
  userAnswer: string
  trueAnswer: string
  isCorrect: boolean
  timeSpentMs: number
}

export interface SessionConfig {
  type: string
  subtype: string
  count: number
}

export const usePracticeStore = defineStore('practice', () => {
  const phase = ref<'idle' | 'running' | 'finished'>('idle')
  const sessionId = ref<number | null>(null)
  const config = ref<SessionConfig | null>(null)
  const questions = ref<Question[]>([])
  const currentIndex = ref(0)
  const currentAnswer = ref('')
  const records = ref<AnswerRecord[]>([])
  const startedAt = ref<number | null>(null)
  const elapsedMs = ref(0)
  const error = ref<string | null>(null)
  const timeStandard = ref<TimeStandard | null>(null)
  let timerId: number | null = null

  const correctCount = computed(() => records.value.filter((r) => r.isCorrect).length)
  const errorCount = computed(() => records.value.filter((r) => !r.isCorrect).length)
  const totalCount = computed(() => records.value.length)
  const accuracy = computed(() =>
    totalCount.value === 0 ? 0 : correctCount.value / totalCount.value,
  )
  const currentQuestion = computed(() => questions.value[currentIndex.value] ?? null)
  const progress = computed(() => `${currentIndex.value + 1}/${questions.value.length}`)

  function tick() {
    if (startedAt.value !== null) {
      elapsedMs.value = Math.floor(performance.now() - startedAt.value)
    }
  }

  function startTimer() {
    startedAt.value = performance.now()
    if (timerId !== null) window.clearInterval(timerId)
    timerId = window.setInterval(tick, 100)
  }

  function stopTimer() {
    if (timerId !== null) {
      window.clearInterval(timerId)
      timerId = null
    }
  }

  async function init(cfg: SessionConfig) {
    try {
      const qs = generateBasicAddSub(cfg.count)
      questions.value = qs
      currentIndex.value = 0
      currentAnswer.value = ''
      records.value = []
      elapsedMs.value = 0
      error.value = null
      config.value = cfg
      const id = await insertSession({
        type: cfg.type,
        subtype: cfg.subtype,
        difficulty: 'normal',
        total: cfg.count,
        nback: 0,
      })
      sessionId.value = id
      timeStandard.value = await getTimeStandard(cfg.type, cfg.count)
      phase.value = 'running'
      startTimer()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
  }

  function inputChar(c: string) {
    currentAnswer.value += c
  }

  function toggleSign() {
    if (currentAnswer.value.startsWith('-')) {
      currentAnswer.value = currentAnswer.value.slice(1)
    } else {
      currentAnswer.value = '-' + currentAnswer.value
    }
  }

  function clearAnswer() {
    currentAnswer.value = ''
  }

  function backspace() {
    currentAnswer.value = currentAnswer.value.slice(0, -1)
  }

  async function submit() {
    const q = currentQuestion.value
    if (q === null) return
    const userAns = currentAnswer.value
    const isCorrect = Number(userAns) === q.answer
    const timeSpentMs =
      startedAt.value !== null ? Math.floor(performance.now() - startedAt.value) : 0
    const record: AnswerRecord = {
      qIndex: currentIndex.value,
      question: q.display,
      userAnswer: userAns,
      trueAnswer: String(q.answer),
      isCorrect,
      timeSpentMs,
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
          tolerance: 0,
          timeSpentMs: record.timeSpentMs,
        })
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
    currentAnswer.value = ''
    if (currentIndex.value + 1 >= questions.value.length) {
      await finish()
    } else {
      currentIndex.value += 1
    }
  }

  async function finish() {
    stopTimer()
    try {
      if (sessionId.value !== null) {
        await updateSession(sessionId.value, {
          correct: correctCount.value,
          durationMs: elapsedMs.value,
        })
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
    phase.value = 'finished'
  }

  async function restart() {
    stopTimer()
    if (config.value !== null) {
      await init(config.value)
    }
  }

  function reset() {
    stopTimer()
    phase.value = 'idle'
    sessionId.value = null
    config.value = null
    questions.value = []
    currentIndex.value = 0
    currentAnswer.value = ''
    records.value = []
    startedAt.value = null
    elapsedMs.value = 0
    error.value = null
    timeStandard.value = null
  }

  return {
    phase,
    sessionId,
    config,
    questions,
    currentIndex,
    currentAnswer,
    records,
    elapsedMs,
    error,
    timeStandard,
    correctCount,
    errorCount,
    totalCount,
    accuracy,
    currentQuestion,
    progress,
    init,
    inputChar,
    toggleSign,
    clearAnswer,
    backspace,
    submit,
    finish,
    restart,
    reset,
  }
})
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm test src/stores/__tests__/practice.test.ts`
预期：PASS，10 个用例全通过

- [ ] **步骤 5：Commit**

```bash
git add src/stores/practice.ts src/stores/__tests__/practice.test.ts
git commit -m "feat(l1): Pinia store 会话状态机（idle→running→finished + 单测）"
```

---

## 任务 5：Numpad.vue 数字键盘组件

**文件：**

- 创建：`src/components/Numpad.vue`
- 创建：`src/components/__tests__/Numpad.test.ts`

- [ ] **步骤 1：编写 Numpad 失败的测试**

创建 `src/components/__tests__/Numpad.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Numpad from '@/components/Numpad.vue'

describe('Numpad.vue', () => {
  it('basic variant 渲染 ± 键', () => {
    const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
    expect(wrapper.text()).toContain('±')
  })

  it('点击数字按钮触发 input 事件', async () => {
    const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
    await wrapper.find('[data-key="1"]').trigger('click')
    expect(wrapper.emitted('input')).toBeTruthy()
    expect(wrapper.emitted('input')![0]).toEqual(['1'])
  })

  it('点击小数点触发 input', async () => {
    const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
    await wrapper.find('[data-key="."]').trigger('click')
    expect(wrapper.emitted('input')![0]).toEqual(['.'])
  })

  it('点击 ± 触发 toggle-sign', async () => {
    const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
    await wrapper.find('[data-key="sign"]').trigger('click')
    expect(wrapper.emitted('toggle-sign')).toBeTruthy()
  })

  it('点击清空触发 clear', async () => {
    const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
    await wrapper.find('[data-key="clear"]').trigger('click')
    expect(wrapper.emitted('clear')).toBeTruthy()
  })

  it('点击退格触发 backspace', async () => {
    const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
    await wrapper.find('[data-key="backspace"]').trigger('click')
    expect(wrapper.emitted('backspace')).toBeTruthy()
  })

  it('点击确定触发 submit', async () => {
    const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
    await wrapper.find('[data-key="submit"]').trigger('click')
    expect(wrapper.emitted('submit')).toBeTruthy()
  })

  it('点击重开触发 restart', async () => {
    const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
    await wrapper.find('[data-key="restart"]').trigger('click')
    expect(wrapper.emitted('restart')).toBeTruthy()
  })

  it('渲染拖拽手柄与说明文案', () => {
    const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
    expect(wrapper.find('[data-handle="drag"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('上下拖调大小')
    expect(wrapper.text()).toContain('左右拖调位置')
    expect(wrapper.text()).toContain('双击恢复')
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm test src/components/__tests__/Numpad.test.ts`
预期：FAIL，"Cannot find module '@/components/Numpad.vue'"

- [ ] **步骤 3：实现 Numpad.vue**

创建 `src/components/Numpad.vue`：

```vue
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

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
let isVerticalDrag = false

const DEFAULT_POS_X = 0
const DEFAULT_POS_Y = 0
const DEFAULT_SCALE = 1
const MIN_SCALE = 0.7
const MAX_SCALE = 1.5

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

function onPointerDown(e: PointerEvent) {
  dragging.value = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  dragStartPosX = posX.value
  dragStartPosY = posY.value
  dragStartScale = scale.value
  // 判断方向：首次移动时定
  isVerticalDrag = false
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  const dx = e.clientX - dragStartX
  const dy = e.clientY - dragStartY
  if (!isVerticalDrag && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
    isVerticalDrag = Math.abs(dy) > Math.abs(dx)
  }
  if (isVerticalDrag) {
    // 垂直拖动调高度（scale）
    const newScale = dragStartScale + dy / 200
    scale.value = clamp(newScale, MIN_SCALE, MAX_SCALE)
  } else {
    // 水平拖动调位置
    posX.value = dragStartPosX + dx
    posY.value = dragStartPosY + dy
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
onBeforeUnmount(() => {
  // 组件卸载无需清理 localStorage
})

// 数字键布局（正序）
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
    class="numpad-container glass-card"
    :style="{
      transform: `translate(${posX}px, ${posY}px) scale(${scale})`,
    }"
  >
    <!-- 拖拽手柄 -->
    <div
      data-handle="drag"
      class="drag-handle"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @dblclick="onDoubleClick"
    >
      <span class="handle-icon">⠿</span>
      <span class="drag-hint">上下拖调大小 左右拖调位置 双击恢复</span>
    </div>

    <!-- 重开独立粉色圆形按钮 -->
    <button data-key="restart" class="key-restart glass-button" @click="onKey('restart')">
      重开
    </button>

    <!-- 键盘网格 3列5行 -->
    <div class="keypad-grid">
      <!-- 行1：±/清空/退格（basic）或 重开/清空/退格（data）-->
      <template v-if="props.variant === 'basic'">
        <button data-key="sign" class="key-cell glass-button" @click="onKey('sign')">±</button>
      </template>
      <template v-else>
        <button data-key="restart" class="key-cell glass-button" @click="onKey('restart')">
          重开
        </button>
      </template>
      <button data-key="clear" class="key-cell glass-button" @click="onKey('clear')">清空</button>
      <button data-key="backspace" class="key-cell glass-button" @click="onKey('backspace')">
        退格
      </button>

      <!-- 行2-4：1-9 -->
      <button
        v-for="k in numberKeys"
        :key="k"
        :data-key="k"
        class="key-cell glass-button"
        @click="onKey(k)"
      >
        {{ k }}
      </button>

      <!-- 行5：./0/确定 -->
      <button data-key="." class="key-cell glass-button" @click="onKey('.')">.</button>
      <button data-key="0" class="key-cell glass-button" @click="onKey('0')">0</button>
      <button data-key="submit" class="key-cell key-submit" @click="onKey('submit')">确定</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.numpad-container {
  display: inline-block;
  padding: 12px;
  border-radius: var(--app-radius-card, 12px);
  user-select: none;
  position: relative;
}

.drag-handle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  cursor: grab;
  font-size: 12px;
  color: var(--app-text-secondary, #9ba89b);
  border-radius: 8px;
  &:active {
    cursor: grabbing;
  }
}

.handle-icon {
  font-size: 16px;
}

.drag-hint {
  flex: 1;
}

.key-restart {
  position: absolute;
  top: -28px;
  right: 12px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 110, 140, 0.85);
  color: #fff;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(255, 110, 140, 0.4);
  &:hover {
    background: rgba(255, 110, 140, 0.95);
  }
}

.keypad-grid {
  display: grid;
  grid-template-columns: repeat(3, 64px);
  grid-auto-rows: 56px;
  gap: 8px;
}

.key-cell {
  border: 1px solid var(--app-glass-border, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--app-text-primary, #e8ece8);
  font-size: 20px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.15s,
    transform 0.05s;
  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
  &:active {
    transform: scale(0.96);
  }
}

.key-submit {
  background: rgba(95, 175, 111, 0.85);
  color: #fff;
  &:hover {
    background: rgba(95, 175, 111, 0.95);
  }
}
</style>
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm test src/components/__tests__/Numpad.test.ts`
预期：PASS，9 个用例全通过

- [ ] **步骤 5：Commit**

```bash
git add src/components/Numpad.vue src/components/__tests__/Numpad.test.ts
git commit -m "feat(l1): Numpad 数字键盘组件（props 驱动 + 拖拽 + 单测）"
```

---

## 任务 6：TopBar.vue 答题顶栏

**文件：**

- 创建：`src/components/TopBar.vue`

- [ ] **步骤 1：实现 TopBar.vue**

创建 `src/components/TopBar.vue`：

```vue
<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title: string
  progress: string
  elapsedMs: number
}
const props = defineProps<Props>()

const elapsedDisplay = computed(() => {
  const totalSec = Math.floor(props.elapsedMs / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `0:${m}:${s}`
})
</script>

<template>
  <div class="topbar glass-toolbar">
    <div class="topbar-left">
      <slot name="left">
        <button class="back-btn glass-button" @click="$emit('back')">‹</button>
      </slot>
    </div>
    <div class="topbar-title">{{ props.title }}</div>
    <div class="topbar-progress">{{ props.progress }}</div>
    <div class="topbar-pen">
      <slot name="right">
        <span class="pen-icon" title="待实现">✏</span>
      </slot>
    </div>
    <div class="topbar-timer">{{ elapsedDisplay }}</div>
  </div>
</template>

<style scoped lang="scss">
.topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 20px;
  height: 56px;
  font-size: 15px;
  color: var(--app-text-primary, #e8ece8);
}

.back-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: var(--app-text-primary, #e8ece8);
  font-size: 22px;
  cursor: pointer;
  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
}

.topbar-title {
  font-weight: 600;
}

.topbar-progress {
  color: var(--app-text-secondary, #9ba89b);
  font-variant-numeric: tabular-nums;
}

.topbar-pen {
  color: #5b9bfc;
}

.topbar-timer {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  color: var(--app-text-secondary, #9ba89b);
}
</style>
```

- [ ] **步骤 2：类型检查**

运行：`./node_modules/.bin/vue-tsc --noEmit`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add src/components/TopBar.vue
git commit -m "feat(l1): TopBar 答题顶栏（返回/标题/进度/笔图标/计时）"
```

---

## 任务 7：PracticeSettings.vue 基础计算设置页

**文件：**

- 创建：`src/views/PracticeSettings.vue`

- [ ] **步骤 1：实现 PracticeSettings.vue**

创建 `src/views/PracticeSettings.vue`：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usePracticeStore } from '@/stores/practice'

const router = useRouter()
const store = usePracticeStore()

// 18 题型网格（original-app.md 实证）
const questionTypes = [
  '两位数加减',
  '凑整百练习',
  '三位数加法',
  '三位数减法',
  '三位数加减',
  '多数相加',
  '混合加减',
  '两位数乘一位数',
  '三位数乘一位数',
  '两位数乘11',
  '两位数乘15',
  '两位数乘两位数',
  '三位数除一位数',
  '三位数除两位数',
  '乘法估算',
  '五位数除三位数',
  '三位数除四位数',
  '自定义',
]
const SELECTED_INDEX = 0 // 默认选中"两位数加减"
const selectedType = ref(0)

// 题量弹窗
const countDialogVisible = ref(false)
const countMode = ref<'quick' | 'normal' | 'custom'>('quick')
const customCount = ref(10)
const currentCount = ref(10)

function openCountDialog() {
  countDialogVisible.value = true
}

function selectCountMode(mode: 'quick' | 'normal' | 'custom') {
  countMode.value = mode
  if (mode === 'quick') currentCount.value = 10
  if (mode === 'normal') currentCount.value = 15
}

function confirmCount() {
  if (countMode.value === 'custom') {
    currentCount.value = clamp(customCount.value, 5, 100)
  }
  countDialogVisible.value = false
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function onTypeClick(index: number) {
  if (index === SELECTED_INDEX) {
    selectedType.value = index
    return
  }
  if (questionTypes[index] === '自定义') {
    ElMessage.info('自定义运算待 L4 实现')
    return
  }
  ElMessage.info(`${questionTypes[index]} 待 L4 实现`)
}

function onPlaceholderClick(feature: string) {
  ElMessage.info(`${feature} 待 L4 实现`)
}

async function startPractice() {
  await store.init({
    type: 'basic_addsub',
    subtype: '两位数加减',
    count: currentCount.value,
  })
  router.push('/practice/session')
}

function goHistory() {
  router.push('/history')
}
</script>

<template>
  <div class="practice-settings">
    <!-- 键盘布局开关 -->
    <div class="row">
      <span class="label">键盘布局</span>
      <el-radio-group :model-value="'normal'" @click="onPlaceholderClick('键盘布局倒序/乱序')">
        <el-radio-button value="normal">正序</el-radio-button>
        <el-radio-button value="reverse">倒序</el-radio-button>
        <el-radio-button value="shuffle">乱序</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 触控笔开关 -->
    <div class="row">
      <span class="label">触控笔</span>
      <el-switch :model-value="false" @click="onPlaceholderClick('触控笔')" />
    </div>

    <!-- 题型网格 6x3 -->
    <div class="type-grid">
      <button
        v-for="(t, i) in questionTypes"
        :key="t"
        class="type-cell"
        :class="{ selected: i === selectedType }"
        @click="onTypeClick(i)"
      >
        {{ t }}
      </button>
    </div>

    <!-- 题量 -->
    <div class="row" @click="openCountDialog">
      <span class="label">题量</span>
      <span class="value">快速({{ currentCount }}题) ›</span>
    </div>

    <!-- N-back 角标 -->
    <div class="row" @click="onPlaceholderClick('N-back')">
      <span class="label">N-back</span>
      <span class="value">关闭 ›</span>
    </div>

    <!-- 主按钮 -->
    <button class="start-btn" @click="startPractice">开始练习</button>

    <!-- 底部 -->
    <div class="bottom-row">
      <button class="bottom-btn" @click="onPlaceholderClick('导出题目')">导出题目</button>
      <button class="bottom-btn" @click="goHistory">历史记录</button>
    </div>

    <!-- FAB -->
    <button class="fab" @click="onPlaceholderClick('自定义新增')">+</button>

    <!-- 题量弹窗 -->
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
  margin: 16px 0;
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

.count-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  cursor: pointer;
  &.active {
    border-color: var(--app-color-primary, #5faf6f);
  }
}
</style>
```

- [ ] **步骤 2：类型检查**

运行：`./node_modules/.bin/vue-tsc --noEmit`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add src/views/PracticeSettings.vue
git commit -m "feat(l1): PracticeSettings 基础计算设置页（18题型网格 + 题量弹窗 + 占位）"
```

---

## 任务 8：PracticeSession.vue 答题页

**文件：**

- 创建：`src/views/PracticeSession.vue`

- [ ] **步骤 1：实现 PracticeSession.vue**

创建 `src/views/PracticeSession.vue`：

```vue
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import TopBar from '@/components/TopBar.vue'
import Numpad from '@/components/Numpad.vue'
import { usePracticeStore } from '@/stores/practice'

const router = useRouter()
const store = usePracticeStore()

const flashState = ref<'none' | 'correct' | 'wrong'>('none')

const standardText = computed(() => {
  const s = store.timeStandard
  if (s === null) return null
  return `合格 ${s.pass}s  良好 ${s.good}s  优秀 ${s.excellent}s`
})

function handleKeydown(e: KeyboardEvent) {
  if (store.phase !== 'running') return
  const k = e.key
  if (/^[0-9]$/.test(k)) {
    e.preventDefault()
    store.inputChar(k)
  } else if (k === '.') {
    e.preventDefault()
    store.inputChar('.')
  } else if (k === '-') {
    e.preventDefault()
    store.toggleSign()
  } else if (k === 'Backspace') {
    e.preventDefault()
    store.backspace()
  } else if (k === 'Enter') {
    e.preventDefault()
    void onSubmit()
  } else if (k === 'Escape') {
    e.preventDefault()
    void onRestart()
  } else if (k === 'Delete') {
    e.preventDefault()
    store.clearAnswer()
  }
}

async function onSubmit() {
  await store.submit()
  // 判分反馈
  const lastRecord = store.records[store.records.length - 1]
  if (lastRecord) {
    flashState.value = lastRecord.isCorrect ? 'correct' : 'wrong'
    setTimeout(() => {
      flashState.value = 'none'
    }, 200)
  }
  if (store.phase === 'finished') {
    router.push('/practice/result')
  }
}

async function onRestart() {
  // 已答 ≥1 题时确认
  if (store.records.length >= 1) {
    try {
      await ElMessageBox.confirm('将丢弃当前进度，整卷重开？', '确认', {
        type: 'warning',
      })
    } catch {
      return // 取消
    }
  }
  await store.restart()
}

function onBack() {
  router.push('/practice')
}

onMounted(() => {
  // 若未初始化（如直接访问 URL），回设置页
  if (store.phase !== 'running') {
    router.replace('/practice')
    return
  }
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="practice-session" :class="`flash-${flashState}`">
    <TopBar
      :title="'基础计算'"
      :progress="store.progress"
      :elapsed-ms="store.elapsedMs"
      @back="onBack"
    >
      <template #left>
        <button class="back-btn glass-button" @click="onBack">‹</button>
      </template>
    </TopBar>

    <div class="question-area">
      <div class="formula">
        <span class="expr">{{ store.currentQuestion?.display }}</span>
        <span class="answer-inline">{{ store.currentAnswer }}</span>
        <span class="cursor">|</span>
      </div>
      <div v-if="standardText" class="standard-row">{{ standardText }}</div>
    </div>

    <Numpad
      variant="basic"
      layout="normal"
      @input="store.inputChar($event)"
      @submit="onSubmit"
      @clear="store.clearAnswer"
      @backspace="store.backspace"
      @restart="onRestart"
      @toggle-sign="store.toggleSign"
    />
  </div>
</template>

<style scoped lang="scss">
.practice-session {
  min-height: 100vh;
  padding: 80px 24px 24px 96px;
  transition: box-shadow 0.2s;
}

.practice-session.flash-correct {
  box-shadow: inset 0 0 0 4px rgba(95, 175, 111, 0.8);
}

.practice-session.flash-wrong {
  box-shadow: inset 0 0 0 4px rgba(255, 110, 140, 0.8);
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

.question-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin: 48px 0;
}

.formula {
  font-size: 48px;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
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
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

.standard-row {
  font-size: 15px;
  color: var(--app-text-secondary, #586e75);
  font-variant-numeric: tabular-nums;
}
</style>
```

- [ ] **步骤 2：类型检查**

运行：`./node_modules/.bin/vue-tsc --noEmit`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add src/views/PracticeSession.vue
git commit -m "feat(l1): PracticeSession 答题页（双输入 + 提交反馈边框闪）"
```

---

## 任务 9：PracticeResult.vue 结算页

**文件：**

- 创建：`src/views/PracticeResult.vue`

- [ ] **步骤 1：实现 PracticeResult.vue**

创建 `src/views/PracticeResult.vue`：

```vue
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePracticeStore } from '@/stores/practice'

const router = useRouter()
const store = usePracticeStore()

const totalDurationText = computed(() => {
  const totalSec = Math.floor(store.elapsedMs / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `0:${m}:${s}`
})

const accuracyText = computed(() => {
  return `${Math.round(store.accuracy * 100)}%`
})

function formatTime(ms: number) {
  const sec = (ms / 1000).toFixed(1)
  return `${sec}s`
}

function restart() {
  void store.restart().then(() => {
    router.push('/practice/session')
  })
}

function backToSettings() {
  store.reset()
  router.push('/practice')
}

function goHistory() {
  router.push('/history')
}

onMounted(() => {
  // 若会话未结束（如直接访问 URL），回设置页
  if (store.phase !== 'finished') {
    router.replace('/practice')
  }
})
</script>

<template>
  <div class="practice-result">
    <h2 class="title">结算</h2>

    <div class="summary glass-card">
      <div class="summary-item">
        <div class="summary-label">错误数</div>
        <div class="summary-value error">{{ store.errorCount }}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">正确率</div>
        <div class="summary-value">{{ accuracyText }}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">总用时</div>
        <div class="summary-value">{{ totalDurationText }}</div>
      </div>
    </div>

    <div class="record-list">
      <div class="record-header">
        <span>题序</span>
        <span>题目</span>
        <span>正确答案</span>
        <span>我的答案</span>
        <span>用时</span>
      </div>
      <div
        v-for="r in store.records"
        :key="r.qIndex"
        class="record-row"
        :class="{ wrong: !r.isCorrect }"
      >
        <span>{{ r.qIndex + 1 }}</span>
        <span>{{ r.question }}</span>
        <span>{{ r.trueAnswer }}</span>
        <span :class="r.isCorrect ? 'ans-correct' : 'ans-wrong'">{{
          r.userAnswer || '（空）'
        }}</span>
        <span>{{ formatTime(r.timeSpentMs) }}</span>
      </div>
    </div>

    <div class="actions">
      <button class="action-btn primary" @click="restart">再练一局</button>
      <button class="action-btn" @click="backToSettings">返回设置</button>
      <button class="action-btn" @click="goHistory">查看历史</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.practice-result {
  padding: 80px 24px 24px 96px;
  max-width: 900px;
  margin: 0 auto;
}

.title {
  color: var(--app-text-primary, #93a1a1);
  margin-bottom: 16px;
}

.summary {
  display: flex;
  gap: 24px;
  padding: 20px;
  margin-bottom: 24px;
}

.summary-item {
  flex: 1;
  text-align: center;
}

.summary-label {
  font-size: 13px;
  color: var(--app-text-secondary, #586e75);
  margin-bottom: 6px;
}

.summary-value {
  font-size: 28px;
  font-weight: 600;
  color: var(--app-text-primary, #93a1a1);
  &.error {
    color: #ff6e8c;
  }
}

.record-list {
  background: var(--app-bg-surface, #073642);
  border-radius: 10px;
  overflow: hidden;
}

.record-header,
.record-row {
  display: grid;
  grid-template-columns: 60px 1.5fr 1fr 1fr 80px;
  gap: 12px;
  padding: 12px 16px;
  font-size: 14px;
  color: var(--app-text-primary, #93a1a1);
}

.record-header {
  background: rgba(255, 255, 255, 0.04);
  font-weight: 600;
  color: var(--app-text-secondary, #586e75);
}

.record-row {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  &.wrong {
    background: rgba(255, 110, 140, 0.05);
  }
}

.ans-correct {
  color: var(--app-color-primary, #5faf6f);
  font-weight: 600;
}

.ans-wrong {
  color: #ff6e8c;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.action-btn {
  flex: 1;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: var(--app-bg-surface, #073642);
  color: var(--app-text-primary, #93a1a1);
  cursor: pointer;
  font-size: 15px;
  &.primary {
    background: var(--app-color-primary, #5faf6f);
    color: #fff;
    border-color: var(--app-color-primary, #5faf6f);
    &:hover {
      background: #6fbf7f;
    }
  }
  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
}
</style>
```

- [ ] **步骤 2：类型检查**

运行：`./node_modules/.bin/vue-tsc --noEmit`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add src/views/PracticeResult.vue
git commit -m "feat(l1): PracticeResult 结算页（清单 + 汇总 + 三按钮）"
```

---

## 任务 10：History.vue 会话记录列表

**文件：**

- 修改：`src/views/History.vue`

- [ ] **步骤 1：实现 History.vue（替换 L0 占位）**

读取 L0 既有 `src/views/History.vue` 占位内容后，替换为：

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listSessions, type SessionRow } from '@/db/index'

const sessions = ref<SessionRow[]>([])
const loading = ref(true)

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `0:${m}:${s}`
}

function formatDate(ts: number) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(async () => {
  try {
    sessions.value = await listSessions()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="history-page">
    <h2 class="title">练习历史</h2>
    <div v-if="loading" class="empty">加载中…</div>
    <div v-else-if="sessions.length === 0" class="empty">暂无记录</div>
    <div v-else class="session-list">
      <div v-for="s in sessions" :key="s.id" class="session-card glass-card">
        <div class="card-row">
          <span class="date">{{ formatDate(s.created_at) }}</span>
          <span class="type">{{ s.subtype || s.type }}</span>
        </div>
        <div class="card-row">
          <span class="stat">答对 {{ s.correct }}/{{ s.total }}</span>
          <span class="stat">用时 {{ formatDuration(s.duration_ms) }}</span>
        </div>
        <div class="comment">加油</div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.history-page {
  padding: 80px 24px 24px 96px;
  max-width: 720px;
  margin: 0 auto;
}

.title {
  color: var(--app-text-primary, #93a1a1);
  margin-bottom: 16px;
}

.empty {
  color: var(--app-text-secondary, #586e75);
  text-align: center;
  padding: 40px;
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.session-card {
  padding: 16px;
  border-radius: 10px;
}

.card-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  color: var(--app-text-primary, #93a1a1);
}

.date {
  color: var(--app-text-secondary, #586e75);
  font-size: 13px;
}

.stat {
  font-variant-numeric: tabular-nums;
}

.comment {
  margin-top: 8px;
  color: var(--app-color-primary, #5faf6f);
  font-size: 13px;
}
</style>
```

- [ ] **步骤 2：类型检查**

运行：`./node_modules/.bin/vue-tsc --noEmit`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add src/views/History.vue
git commit -m "feat(l1): History 历史记录列表（最小实现，L5 扩展分页）"
```

---

## 任务 11：路由更新 + Home 卡片跳转

**文件：**

- 修改：`src/router/index.ts`
- 修改：`src/views/Home.vue`

- [ ] **步骤 1：更新路由**

修改 `src/router/index.ts`，将 `/practice` 路由的懒加载指向 PracticeSettings，并新增 session/result 子路由：

```typescript
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    {
      path: '/home',
      name: 'home',
      component: () => import('@/views/Home.vue'),
      meta: { title: '首页' },
    },
    {
      path: '/practice',
      name: 'practice-settings',
      component: () => import('@/views/PracticeSettings.vue'),
      meta: { title: '基础计算' },
    },
    {
      path: '/practice/session',
      name: 'practice-session',
      component: () => import('@/views/PracticeSession.vue'),
      meta: { title: '答题中' },
    },
    {
      path: '/practice/result',
      name: 'practice-result',
      component: () => import('@/views/PracticeResult.vue'),
      meta: { title: '结算' },
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('@/views/History.vue'),
      meta: { title: '历史记录' },
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('@/views/Stats.vue'),
      meta: { title: '统计' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/Settings.vue'),
      meta: { title: '设置' },
    },
  ],
})

export default router
```

- [ ] **步骤 2：修改 Home.vue 卡片跳转**

读取 L0 既有 `src/views/Home.vue`，将"基础计算"卡片的点击跳转从 `/practice`（已是 /practice）确认指向 PracticeSettings。若 L0 已是 `router.push('/practice')` 则无需改；若卡片是 disabled 则改为 enabled 并跳转。

具体修改：将"基础计算"卡片：

- 移除 disabled 状态
- `@click="router.push('/practice')"`

- [ ] **步骤 3：类型检查 + 构建验证**

运行：

```bash
./node_modules/.bin/vue-tsc --noEmit
./node_modules/.bin/vite build
```

预期：无错误，dist 生成

- [ ] **步骤 4：Commit**

```bash
git add src/router/index.ts src/views/Home.vue
git commit -m "feat(l1): 三段式路由 + Home 基础计算卡片跳转"
```

---

## 任务 12：手动验收

**文件：** 无（运行时验收）

- [ ] **步骤 1：启动 vite dev server**

运行：

```bash
cd /Users/linkslinks/project/speed_calc/.worktrees/level-1
./node_modules/.bin/vite --port 1420 --strictPort
```

保持运行（后台）

- [ ] **步骤 2：cargo build + ad-hoc 签名**

运行：

```bash
cd src-tauri
export PATH="/opt/homebrew/opt/rustup/bin:/opt/homebrew/bin:$PATH"
cargo build
codesign --sign - --entitlements entitlements.plist --force target/debug/speed-calc
```

预期：编译成功，签名成功（参考 L0 流程）

- [ ] **步骤 3：启动 binary 验证**

运行：

```bash
./target/debug/speed-calc &
sleep 6
ls -la "$HOME/Library/Application Support/com.speedcalc.app/"
sqlite3 "$HOME/Library/Application Support/com.speedcalc.app/speedcalc.db" "SELECT * FROM time_standards WHERE question_count=15;"
```

预期：speedcalc.db 存在，time_standards 含 basic_addsub×15=42/33/27

- [ ] **步骤 4：逐项验收清单**

按设计规格 §1.3 验收清单逐项检查（在应用内手动操作）：

- [ ] 设置页 18 题型网格渲染，"两位数加减"可点击进入答题，其余 17 格 + 自定义入口点击 toast"待 L4"
- [ ] 题量弹窗 10/15/自定义5-100 生效，影响出题数
- [ ] 键盘布局开关默认正序，点击 toast"待 L4"
- [ ] 触控笔/N-back/导出/FAB 占位 toast
- [ ] 10 道与 15 道两位数加减题可正常作答
- [ ] 屏幕键盘和物理键盘都能输入，互不冲突
- [ ] 键盘可拖拽（上下调高、左右调位、双击恢复）
- [ ] 重开按钮 = 整卷重开（重新出题、计时归零、从第1题），有确认提示
- [ ] 提交后边框绿/红闪 200ms 消失，不显示正确答案
- [ ] 判分+计时准确（精确判分，会话总时长 0:H:M 格式）
- [ ] 时间标准行显示"合格Xs 良好Ys 优秀Zs"（10题=28/22/18，15题=42/33/27）
- [ ] 结算页显示题序/题目/正确答案/我的答案（红绿）/每题时间/错误数/正确率/总用时
- [ ] 结算页三按钮：再练一局/返回设置/查看历史
- [ ] 历史记录页可见至少 1 条
- [ ] 17 占位题型 + 自定义入口点击有 toast

- [ ] **步骤 5：运行全部单测**

运行：`pnpm test`
预期：所有测试通过（生成器 + store + db + Numpad）

- [ ] **步骤 6：Commit 验收记录（可选）**

如验收通过，无需额外 commit（代码已在前面任务提交）。记录验收结果到执行报告。

---

## 自检

**1. 规格覆盖度**：对照设计规格 §1.1 L1 包含清单：

- 完整基础计算设置页（18 题型网格 + 题量弹窗 + 占位）→ 任务 7 ✓
- 两位数加减生成器（10-99，减法非负，精确判分）→ 任务 3 ✓
- 答题界面（顶栏 + 题目区 + 基础计算键盘 + 时间标准行）→ 任务 5/6/8 ✓
- 双输入（屏幕 + 物理）→ 任务 8 ✓
- 键盘可拖拽 → 任务 5 ✓
- 整卷重开 → 任务 4（store.restart）+ 任务 8（确认）✓
- 提交反馈边框闪 → 任务 8 ✓
- 结算页（清单 + 三按钮）→ 任务 9 ✓
- 时间标准查询 → 任务 2 ✓
- sessions + records 入库 → 任务 2 + 任务 4 ✓
- /history 显示至少 1 条 → 任务 10 ✓

**2. 占位符扫描**：无 TODO/待定。所有步骤含完整代码。✓

**3. 类型一致性**：

- `Question` 类型在任务 3 定义，任务 4 store 引用 ✓
- `AnswerRecord` 类型在任务 4 定义，任务 9 结算页引用 store.records ✓
- `SessionConfig` 在任务 4 定义，任务 7 设置页 init 调用 ✓
- `SessionRow` 在任务 2 定义，任务 10 History 引用 ✓
- `TimeStandard` 在任务 2 定义，任务 4 store 引用 ✓
- store action 名（init/inputChar/toggleSign/clearAnswer/backspace/submit/finish/restart/reset）在任务 4 定义，任务 8/9 引用一致 ✓

**4. 类型一致性检查**：Numpad emits（input/submit/clear/backspace/restart/toggle-sign）在任务 5 定义，任务 8 PracticeSession 绑定一致 ✓

自检通过，无遗漏。

---

## 执行交接

计划已完成并保存到 `docs/superpowers/plans/2026-07-03-level-1-basic-calc.md`。两种执行方式：

**1. 子代理驱动（推荐）** - 每个任务调度一个新的子代理，任务间进行审查，快速迭代

**2. 内联执行** - 在当前会话中使用 executing-plans 执行任务，批量执行并设有检查点
