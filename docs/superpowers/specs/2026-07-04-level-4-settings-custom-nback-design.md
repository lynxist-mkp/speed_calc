# L4 设计：设置项 + 自定义运算 + N-back

> 范围：A.设置页扩展+持久化、B.自定义运算生成器、C.N-back 机制。时间标准编辑延后 L5。
> 依据：references/levels.md L4 验收清单、references/original-app.md #16/#18/#19/#20/#21/#22/#24/#25、references/computation-area.md。

## 1. 架构概览

```
generators/
  basic.ts        扩展：17 题型生成器（BasicType + GENERATORS 调度）
  custom.ts       新建：标准运算 + 幂运算生成器
  dataAnalysis.ts 扩展：generateDataQuestion 加 difficulty 参数
stores/
  practice.ts     扩展：init 接受 difficulty/nback/customConfig，N-back 状态机
  settings.ts     新建：设置持久化 store（封装 settings 表读写）
components/
  NbackPrompt.vue 新建：N-back 回忆输入弹窗（复用 Numpad）
  BarChart.vue    新建：ECharts 柱状图包裹（chart 模式呈现）
views/
  PracticeSettings.vue     扩展：17 题型可选 + 键盘布局/N-back 弹窗 + 自定义运算弹窗
  DataAnalysisSettings.vue 扩展：难度 + 呈现方式 + N-back
  PracticeSession.vue      扩展：N-back 弹窗触发 + 延迟判分
db/
  index.ts        扩展：getSetting/setSetting + custom_presets CRUD
migrations/
  0005_add_basic_type_standards.sql  新建：16 题型时间标准种子
```

## 2. 设置持久化

### 2.1 settings 表

现有 `CREATE TABLE settings ( key TEXT PRIMARY KEY, value TEXT )`，KV 结构，无需迁移。

**Key 命名**：`<scope>.<field>`，value 存 `JSON.stringify`。

- `basic.keyboardLayout` → `"\"normal\""`
- `basic.touchPen` → `"false"`
- `basic.selectedType` → `"0"`
- `basic.countMode` → `"\"quick\""`
- `basic.count` → `"10"`
- `basic.nback` → `"0"`
- `da.selectedFillType` / `da.selectedCompareType` / `da.count` / `da.difficulty` / `da.displayMode` / `da.nback`

### 2.2 Settings store（src/stores/settings.ts，新建）

```typescript
interface BasicSettings {
  keyboardLayout: 'normal' | 'reverse' | 'shuffle'
  touchPen: boolean
  selectedType: number // 0-17，18 题型索引（17 = 自定义）
  countMode: 'quick' | 'normal' | 'custom'
  count: number // 5-100
  nback: 0 | 1 | 2
}

interface DASettings {
  selectedFillType: number // 9 填空题索引
  selectedCompareType: number // 3 比较题索引
  count: number // 5-100
  difficulty: 'easy' | 'normal' | 'hard'
  displayMode: 'chart' | 'formula'
  nback: 0 | 1 | 2
}

export const useSettingsStore = defineStore('settings', () => {
  const basic = ref<BasicSettings>({/* 默认值 */})
  const dataAnalysis = ref<DASettings>({/* 默认值 */})
  const loaded = ref(false)

  async function load(): Promise<void> // SELECT * FROM settings，按 key 前缀分发
  async function saveBasic(patch: Partial<BasicSettings>): Promise<void>
  async function saveDataAnalysis(patch: Partial<DASettings>): Promise<void>

  return { basic, dataAnalysis, loaded, load, saveBasic, saveDataAnalysis }
})
```

**默认值**（与现有设置页 ref 默认值一致）：

- basic: `{ keyboardLayout: "normal", touchPen: false, selectedType: 0, countMode: "quick", count: 10, nback: 0 }`
- dataAnalysis: `{ selectedFillType: 0, selectedCompareType: 0, count: 10, difficulty: "normal", displayMode: "chart", nback: 0 }`

### 2.3 db/index.ts 新增

```typescript
export async function getSetting(key: string): Promise<string | null>
export async function setSetting(key: string, value: string): Promise<void>
// upsert 用 INSERT OR REPLACE
```

### 2.4 使用方式

- `PracticeSettings.vue` `onMounted` 调 `load()`，每次切换选项调 `saveBasic({ field: value })`
- `DataAnalysisSettings.vue` 同理调 `saveDataAnalysis`
- `PracticeSession.vue` 通过 `useSettingsStore()` 读 nback（或通过 SessionConfig.nback 传入）
- 自定义运算"最近使用"走 `custom_presets` 表，不走 settings 表

## 3. 17 题型生成器

### 3.1 题型 ID 映射

与 PracticeSettings.vue 18 网格对应（第 18 项"自定义"独立路由）：

| 索引 | 题型 ID      | 中文名         | 生成逻辑                                         |
| ---- | ------------ | -------------- | ------------------------------------------------ |
| 0    | `addsub_2d`  | 两位数加减     | 现有 generateBasicAddSub                         |
| 1    | `round_100`  | 凑整百练习     | a∈[10,99]，b=100-a，问 a+b                       |
| 2    | `add_3d`     | 三位数加法     | a,b∈[100,999]，a+b                               |
| 3    | `sub_3d`     | 三位数减法     | a,b∈[100,999]，a-b 非负                          |
| 4    | `addsub_3d`  | 三位数加减     | 随机 + 或 −，非负                                |
| 5    | `add_multi`  | 多数相加       | 3-4 个两位数相加                                 |
| 6    | `addsub_mix` | 混合加减       | 3 个两位数，± 混合                               |
| 7    | `mul_2x1`    | 两位数乘一位数 | a∈[10,99]，b∈[2,9]                               |
| 8    | `mul_3x1`    | 三位数乘一位数 | a∈[100,999]，b∈[2,9]                             |
| 9    | `mul_2x11`   | 两位数乘11     | a∈[10,99]，b=11                                  |
| 10   | `mul_2x15`   | 两位数乘15     | a∈[10,99]，b=15                                  |
| 11   | `mul_2x2`    | 两位数乘两位数 | a,b∈[10,99]                                      |
| 12   | `div_3x1`    | 三位数除一位数 | a∈[100,999]，b∈[2,9]，整除                       |
| 13   | `div_3x2`    | 三位数除两位数 | a∈[100,999]，b∈[10,99]，整除                     |
| 14   | `mul_est`    | 乘法估算       | a∈[100,999]，b∈[10,99]，答案取整到十位           |
| 15   | `div_5x3`    | 五位数除三位数 | a∈[10000,99999]，b∈[100,999]，整除               |
| 16   | `div_3x4`    | 三位数除四位数 | a∈[1000,9999]，b∈[100,999]，结果必 <1，预填 "0." |

### 3.2 接口（src/generators/basic.ts 扩展）

```typescript
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
  display: string // 如 "61+84="
  preset?: string // 仅 div_3x4 预填 "0."
}

export function generateBasic(type: BasicType, count: number): BasicQuestion[]
```

### 3.3 生成规则要点

- **整除保证**：除法题先生成商与除数，再反推被除数 `a = b × quotient`，保证整除
- **减法非负**：a<b 时交换
- **乘法估算**：答案 = `Math.round((a×b)/10)×10`（取整到十位），判分容差 ±2%
- **div_3x4**：结果 <1，预填 `"0."`（与分数计算分子<分母同模式）
- **display 格式**：`${a}${op}${b}=`，乘用 `×` 除用 `÷`
- **多数相加**：display 用 `a+b+c=` 或 `a+b+c+d=`（op 字段填第一个运算符，仅用于类型约束）

### 3.4 store 接入

[practice.ts](src/stores/practice.ts) init 分支扩展：

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

async function init(cfg: SessionConfig) {
  let qs: AnyQuestion[]
  if (cfg.type === 'custom_standard') {
    qs = generateCustomStandard(cfg.customConfig as CustomStandardConfig, cfg.count)
  } else if (cfg.type === 'custom_power') {
    qs = generateCustomPower(cfg.customConfig as CustomPowerConfig, cfg.count)
  } else if (BASIC_TYPES.has(cfg.type)) {
    qs = generateBasic(cfg.type as BasicType, cfg.count)
  } else if (cfg.type.startsWith('compare_')) {
    /* 现有 */
  } else {
    /* data 现有 */
  }
  // ...
}
```

### 3.5 SessionConfig 扩展

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

### 3.6 时间标准种子

migration `0005_add_basic_type_standards.sql` 插入 16 行（addsub_2d 已有）：

```sql
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

lib.rs 注册 migration 0005。

## 4. 自定义运算生成器（src/generators/custom.ts，新建）

### 4.1 标准运算

```typescript
export interface CustomStandardConfig {
  firstDigits: 1 | 2 | 3 | 4
  operators: Array<'+' | '-' | '×' | '÷'>
  secondMode: 'random_digits' | 'fixed' | 'range'
  secondDigits?: 1 | 2 | 3 | 4 // random_digits
  secondFixed?: number // fixed
  secondMin?: number // range
  secondMax?: number // range
}

export function generateCustomStandard(cfg: CustomStandardConfig, count: number): BasicQuestion[]
```

**生成规则**：

- `firstDigits`：按位数生成（1 位 [2,9]，2 位 [10,99]，3 位 [100,999]，4 位 [1000,9999]）
- `operators`：每题随机抽一个选中的运算符
- `secondMode`：
  - `random_digits`：用 `secondDigits` 按位数生成
  - `fixed`：固定为 `secondFixed`
  - `range`：在 `[secondMin, secondMax]` 内随机
- 减法非负；除法整除（反推被除数）
- display: `${a}${op}${b}=`

### 4.2 幂运算

```typescript
export interface CustomPowerConfig {
  baseMode: 'range' | 'digits'
  baseMin?: number
  baseMax?: number
  baseDigits?: 1 | 2 | 3
  powerTypes: Array<2 | 3>
}

export function generateCustomPower(cfg: CustomPowerConfig, count: number): BasicQuestion[]
```

**生成规则**：

- `baseMode=range`：底数 ∈ [baseMin, baseMax]
- `baseMode=digits`：按位数生成底数
- `powerTypes`：每题随机抽一个指数
- op 字段填 `"×"`（接口约束），display 用上标 Unicode：`${base}²=` 或 `${base}³=`
- answer = base² 或 base³

### 4.3 最近使用标签

存 `custom_presets` 表（`name/config/used_at`）。

**name 格式**（截图 #24 实证）：

- 标准运算：`4位数-4位数` / `2位数×1位数` / `2位数-15~99`（range）/ `2位数-15`（fixed）
- 幂运算：`2位数²` / `3位数³`

**config 字段**：`JSON.stringify(cfg)`

**触发时机**：自定义弹窗点"确定"时 upsert（同 config 视为同条，更新 `used_at`）

**展示**：弹窗顶部"最近使用"区横向标签，点击恢复 config

### 4.4 db/index.ts 新增

```typescript
export interface CustomPreset {
  id: number
  name: string
  config: string
  usedAt: number
}

export async function listCustomPresets(limit = 10): Promise<CustomPreset[]>
export async function upsertCustomPreset(name: string, config: string): Promise<void>
// upsert 逻辑：先按 config 查，有则更新 used_at，无则插入
```

## 5. N-back 机制

### 5.1 语义

答第 k 题前，先回忆第 k-n 题的答案；回忆结果决定第 k-n 题的最终判分（前 n 题延迟判分）。

### 5.2 状态机

```
phase: running
每题答题流程（k = currentIndex）：
1. 用户答当前题 k → 构建 record → pendingRecords.push(record)
2. 推进到下一题前，检查 pendingRecords.length：
   - 若 > n：shift 最早的 record，弹 N-back 弹窗（回忆该题答案）
            → 用户回忆 → 判分 → 入库 → 关弹窗 → 推进 currentIndex
   - 若 <= n：直接推进 currentIndex
3. 当 currentIndex == N（答完最后一题）且 pendingRecords 非空：
   逐个 shift + 弹回忆 + 判分 + 入库，全部回收后 finish()

N = questions.length，n = nback
nback=0 时完全跳过此机制，所有题答完立即入库（现有行为）

示例（nback=1, N=3）：
- k=0 答 → pending=[r0] (len=1, <=1, 不弹) → 推进
- k=1 答 → pending=[r0,r1] (len=2, >1, shift r0 弹回忆) → 判 r0 入库 → pending=[r1] → 推进
- k=2 答 → pending=[r1,r2] (len=2, >1, shift r1 弹回忆) → 判 r1 入库 → pending=[r2]
- 末尾：pending=[r2] 非空 → shift r2 弹回忆 → 判 r2 入库 → pending=[] → finish()
```

### 5.3 store 扩展（practice.ts）

```typescript
const nback = ref<0 | 1 | 2>(0);
const pendingRecords = ref<AnswerRecord[]>([]);
const nbackPrompting = ref(false);
const nbackTarget = ref<{ index: number; question: string; trueAnswer: string } | null>(null);

async function init(cfg: SessionConfig) {
  nback.value = cfg.nback ?? 0;
  pendingRecords.value = [];
  nbackPrompting.value = false;
  nbackTarget.value = null;
  // ... 现有逻辑
}

async function submit() {
  if (nbackPrompting.value) {
    judgeNback(currentNbackAnswer);
    return;
  }
  // 正常答当前题
  const record = buildRecord(currentQ, currentAnswer);
  if (nback.value === 0) {
    records.value.push(record);
    await insertRecord(...);  // 立即入库
  } else {
    pendingRecords.value.push(record);  // 暂存
  }
  // 推进前回收：pendingRecords.length > n 时回收最早的
  if (pendingRecords.value.length > nback.value) {
    const target = pendingRecords.value.shift()!;
    nbackTarget.value = { index: target.qIndex, question: record.question, trueAnswer: record.trueAnswer };
    nbackPrompting.value = true;
  }
  advanceToNextQuestion();
}
```

**末尾收尾**：最后一题答完且 pendingRecords 非空时，逐个弹回忆弹窗，全部回收后 `finish()`。

### 5.4 NbackPrompt 组件（src/components/NbackPrompt.vue，新建）

```vue
<el-dialog
  v-model="visible"
  :show-close="false"
  :close-on-click-modal="false"
  title="N-back 回忆"
  width="320px"
>
  <p>第 {{ target.index + 1 }} 题的答案是？</p>
  <Numpad v-model="answer" :has-sign="true" @submit="onSubmit" />
  <template #footer>
    <el-button @click="onSkip">跳过（计错）</el-button>
  </template>
</el-dialog>
```

**交互**：

- 复用 Numpad（带 ±，答案可能负）
- "跳过"= 答错处理
- 提交调 store.submitNback(answer)，store 判分并关闭弹窗

### 5.5 判分

- 与正常题判分逻辑一致：基础计算精确判分，资料分析按 tolerance
- 回忆答案正确 → 第 k-n 题 isCorrect=true，否则 false
- 入库时机：回忆判分完成时

### 5.6 不启用的题型

- 比较题（`compare_*`）：答案非数值，Numpad 不适用
- 一表通算（`composite`）：独立 CompositeSession，不走 store.init
- 设置页对这两类题型隐藏 N-back 选项

### 5.7 UI 提示

- 答题屏顶栏进度右侧加标记显示当前 N-back 等级（如 `1-back`）
- 弹窗出现时计时继续（不暂停，认知负荷训练）

## 6. UI 扩展

### 6.1 PracticeSettings.vue 扩展

| 区块           | 改动                                                                          |
| -------------- | ----------------------------------------------------------------------------- |
| 键盘布局开关   | 接 settings.basic.keyboardLayout，点击即时 saveBasic；移除 onPlaceholderClick |
| 触控笔开关     | 接 settings.basic.touchPen                                                    |
| 题型网格 18 项 | 17 项可选（切换 selectedType 并 saveBasic）；"自定义"点击打开自定义运算弹窗   |
| 题量           | 现有逻辑保留，确认时 saveBasic({ countMode, count })                          |
| N-back 角标    | 点击弹窗（#22 复刻），关/1-back/2-back，确认 saveBasic({ nback })             |
| 开始练习       | 读 settings.basic.selectedType 调 generateBasic，nback 传入                   |
| 导出题目       | L4 仍占位（验收未列）                                                         |

### 6.2 DataAnalysisSettings.vue 扩展

| 区块       | 改动                                                  |
| ---------- | ----------------------------------------------------- |
| 难度三按钮 | 新增区块，接 settings.dataAnalysis.difficulty         |
| 呈现方式   | 新增区块，生成文字图表 / 直接显示公式，接 displayMode |
| N-back     | 填空题 tab 显示，比较题 tab 隐藏                      |
| 题量/题型  | 接 settings.dataAnalysis 各字段                       |
| 开始练习   | 传 difficulty/nback 给 store.init                     |

### 6.3 难度影响生成器

difficulty 作为参数传入生成器函数：`generateDataQuestion(type, count, difficulty)`。

各生成器内按难度调数值范围（简单=范围小，困难=范围大）。需扩展现有 dataAnalysis.ts 9 个生成函数签名——加可选第三参数，默认 `normal`，向后兼容。

### 6.4 呈现方式影响

- `formula` 模式：现有行为（KaTeX 渲染算式）
- `chart` 模式：年均增长率/年平均量用 ECharts 柱状图（#10#15），其余题型仍用公式

**ECharts 引入**：`pnpm add echarts`，新组件 `BarChart.vue` 包裹。仅 `annual_growth_rate`/`annual_avg` 启用，其余题型 `displayMode=chart` 时降级为 formula。包体积 +1MB（gzip），仍在 30MB 限内。

### 6.5 自定义运算弹窗（嵌入 PracticeSettings.vue）

```vue
<el-dialog v-model="customVisible" title="自定义运算" width="480px">
  <el-tabs v-model="customTab">
    <el-tab-pane label="标准运算" name="standard">
      <div class="recent-tags">
        <span v-for="p in presets" :key="p.id" @click="loadPreset(p)">{{ p.name }}</span>
      </div>
      <!-- 第一个数位数 4 按钮 -->
      <!-- 运算符 4 多选 -->
      <!-- 第二个数三模式切换 + 子选项 -->
    </el-tab-pane>
    <el-tab-pane label="幂运算" name="power">
      <!-- 底数设置方式 2 选 -->
      <!-- 范围/位数子选项 -->
      <!-- 平方/立方多选 -->
    </el-tab-pane>
  </el-tabs>
  <template #footer>
    <el-button @click="customVisible = false">取消</el-button>
    <el-button type="primary" @click="onConfirm">确定</el-button>
  </template>
</el-dialog>
```

**确定按钮流程**：

1. 校验（运算符至少 1 个；幂运算至少 1 个）
2. upsertCustomPreset(name, config) 记录最近使用
3. saveBasic({ selectedType: 17 })
4. 关弹窗，开始练习时走 generateCustomStandard/generateCustomPower

## 7. 数据库变更

- migration `0005_add_basic_type_standards.sql`（见 §3.6）
- lib.rs 注册 migration 0005
- settings 表、custom_presets 表 schema 已就位，无需迁移

## 8. 测试策略

| 层                         | 测试                                                                        |
| -------------------------- | --------------------------------------------------------------------------- |
| generators/basic.ts        | 17 题型各 1 生成测试 + 整除/非负保证 + 边界（1 位数不含 0）                 |
| generators/custom.ts       | 标准 4 种 secondMode + 幂 range/digits + 运算符多选 + name 格式化           |
| generators/dataAnalysis.ts | 现有测试不动；新增 difficulty 参数传递测试（不破坏向后兼容）                |
| stores/settings.ts         | load/save 往返 + 默认值 + key 命名                                          |
| stores/practice.ts         | N-back 状态机：nback=0 不变 / nback=1 前 1 题延迟入库 / 末尾回收 / 跳过计错 |
| db/index.ts                | upsertCustomPreset 重复 config 更新 used_at / listCustomPresets limit       |
| 组件                       | NbackPrompt 弹窗显示/提交/跳过                                              |

**N-back 状态机单测要点**（store 测试）：

```
nback=1, count=3:
- submit(题0) → pendingRecords=[r0], records=[]
- submit(题1) → 触发回忆题0 → judgeNback(对) → records=[r0✓], pendingRecords=[r1]
- submit(题2) → 触发回忆题1 → judgeNback(错) → records=[r0✓,r1✗], pendingRecords=[r2]
- finish 阶段 → 触发回忆题2 → judgeNback(对) → records=[r0✓,r1✗,r2✓], pendingRecords=[]
```

## 9. 包体积估算

- ECharts gzip 后约 +1MB
- 自定义运算/N-back 代码约 +30KB
- 总体仍 <30MB（当前 13MB → 预计 14-15MB）

## 10. 不做项（YAGNI）

- 题型选择弹窗（#18 的"随机/基期量/基期差..."8 选项）——已被现有 9 填空题网格替代
- 导出题目（验收未列）
- 触控笔功能实质化（开关持久化即可，行为占位）
- 时间标准编辑页（延后 L5）

## 11. 验收清单对应

levels.md L4 验收：

- [ ] 设置全可配置并持久化 → §2 + §6.1 + §6.2
- [ ] 配置生效到出题 → §3.4 + §6.1 开始练习 + §6.2 难度传递
- [ ] 自定义运算(标准+幂)能生成 → §4
- [ ] N-back 1/2 可启用 → §5
