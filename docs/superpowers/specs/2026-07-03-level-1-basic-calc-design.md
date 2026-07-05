# Level 1 设计规格：基础计算闭环 + 双输入

> 日期: 2026-07-03
> 状态: 已批准（待用户审查）
> 来源: SPEC.md §4 Level 1 + references/levels.md L1 + references/computation-area.md 实证
> 前置: L0 已合并到 main（项目骨架 + Solarized 深色 + Liquid Glass + SQLite 5 表 + 5 路由占位）

## 1. 范围

打通"出题 → 答题 → 判分 → 计时 → 入库 → 结算"完整闭环，聚焦**两位数加减**单一题型。完整渲染基础计算设置页（18 题型网格），但只有"两位数加减"可进入答题，其余 17 题型与"自定义"入口点击提示"待 L4 实现"。

### 1.1 L1 包含

- 完整基础计算设置页（18 题型网格 + 题量弹窗 + 键盘布局开关占位 + 触控笔/N-back/导出/FAB 占位）
- 两位数加减生成器（10-99，减法非负，精确判分误差 0）
- 答题界面（顶栏 + 题目区 + 基础计算键盘 + 时间标准行）
- 双输入（屏幕键盘 + 物理键盘，同一 handler）
- 键盘可拖拽（上下调高、左右调位、双击恢复）
- 整卷重开（重新生成所有题、计时归零、从第1题）
- 提交反馈（边框绿/红闪 200ms 消失，不显示正确答案）
- 结算页（题序/题目/正确答案/我的答案红绿/每题时间/错误数/正确率/总用时 + 三按钮）
- 时间标准查询（basic_addsub×10=28/22/18，×15=42/33/27，自定义降级）
- sessions + records 入库
- /history 显示至少 1 条记录

### 1.2 L1 不包含（YAGNI）

- 其余 17 题型生成器（L4）
- 资料分析题型（L2）
- 比较题（L3）
- 图表呈现（L2/L4）
- 键盘布局倒序/乱序生效（L4，L1 默认正序）
- N-back（L4）
- 触控笔功能（占位）
- 导出题目（占位）
- 翻题箭头 <- -> （弃用，不渲染）
- 笔图标 ✏ 功能（占位渲染，不实现行为）
- "点击这里唤起原生键盘"提示文案（原生键盘一直启用，无需提示）
- 统计图表（L5）

### 1.3 验收清单

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

## 2. 架构

### 2.1 方案选型

采用**方案 A：Pinia store + 三段式路由**。

理由：spec 明确 L2/L3/L4 持续扩展，三段式路由边界最清晰；结算页需"查看历史"返回时回到正确位置，深链稳健；store 独立可测；Numpad 无状态可复用 L2 资料分析版。

### 2.2 路由结构

`src/router/index.ts` 新增（替换 L0 占位）：

| 路径              | 组件                 | meta.title |
| ----------------- | -------------------- | ---------- |
| /practice         | PracticeSettings.vue | 基础计算   |
| /practice/session | PracticeSession.vue  | 答题中     |
| /practice/result  | PracticeResult.vue   | 结算       |

`/home` 的"基础计算"卡片点击跳 `/practice`。

### 2.3 模块划分

```
src/
├── stores/
│   └── practice.ts          # Pinia store，会话状态机
├── generators/
│   └── basic.ts             # 两位数加减纯函数生成器
├── components/
│   ├── Numpad.vue           # 数字键盘（props 驱动无状态）
│   ├── TopBar.vue           # 答题顶栏
│   ├── AppSidebar.vue       # L0 既有
│   └── AppToolbar.vue       # L0 既有
├── views/
│   ├── PracticeSettings.vue # 基础计算设置页
│   ├── PracticeSession.vue  # 答题页
│   ├── PracticeResult.vue   # 结算页
│   ├── Home.vue             # L0 既有，卡片跳转改 /practice
│   ├── History.vue          # L0 既有占位，L1 实现列表
│   ├── Stats.vue            # L0 既有占位
│   └── Settings.vue         # L0 既有占位（应用设置，非答题设置）
├── db/
│   └── index.ts             # L0 既有，扩展 getTimeStandard + session/record CRUD
└── styles/                  # L0 既有，复用
```

边界原则：生成器纯函数无副作用可单测；store 是唯一会话状态源；Numpad 无状态可复用；DB 层封装 SQL 细节。

## 3. 组件设计

### 3.1 Numpad.vue（核心复刻对象）

**职责**：渲染数字键盘 UI，捕获屏幕点击，emits 事件。不持有答案状态。

**Props**：

- `variant: 'basic' | 'data'`（L1 只用 'basic'；'data' 为 L2 预留）
- `layout: 'normal' | 'reverse' | 'shuffle'`（L1 只用 'normal'，开关占位）

**Emits**：

- `input(char: string)` — 数字/小数点/符号输入
- `submit()` — 确定键
- `clear()` — 清空键
- `backspace()` — 退格键
- `restart()` — 重开键（独立粉色圆形按钮）
- `toggle-sign()` — ± 键（仅 basic variant）

**布局**（基础计算版，computation-area.md §5.1 实证）：

```
┌──────┬──────┬──────┐
│  ±   │ 清空 │ 退格 │   行1
├──────┼──────┼──────┤
│  1   │  2   │  3   │   行2
├──────┼──────┼──────┤
│  4   │  5   │  6   │   行3
├──────┼──────┼──────┤
│  7   │  8   │  9   │   行4
├──────┼──────┼──────┤
│  .   │  0   │ 确定 │   行5（确定=绿）
└──────┴──────┴──────┘
        [重开]            独立粉色圆形按钮（键盘上方/侧边）
```

**拖拽**（computation-area.md §5.3 实证）：

- 顶部拖拽手柄 + 说明文案"上下拖调大小 左右拖调位置 双击恢复"
- pointer events 实现：垂直拖动调高度（scale transform 或 height），水平拖动调位置（translate）
- 双击恢复默认
- 位置/尺寸用 localStorage 持久化（key: `numpad:pos` / `numpad:size`）
- clamp 限制视口内，min/max 防缩到看不见

**样式**：复用 glass.scss `.glass-button`（hover/active 半透明+模糊）。

### 3.2 TopBar.vue（答题顶栏）

**Props**：

- `title: string`
- `progress: string`（如 "3/10"）
- `elapsedMs: number`

**Slots**：

- `left` — 返回按钮
- `right` — 笔图标占位（点击无反应或 toast"待实现"）

**布局**（computation-area.md §1 实证）：

```
[< 返回]   [标题]   [进度 x/n]  [✏ 笔]  [计时 0:H:M]
```

**计时格式**：`0:H:M`（固定"0:"前缀 + 分 + 秒，秒不补零），computed from elapsedMs。

### 3.3 PracticeSettings.vue（基础计算设置页）

**职责**：渲染原版基础计算设置页，采集题量配置，跳转答题。

**布局**（original-app.md §基础计算设置页 实证）：

- 键盘布局开关：正序/倒序/乱序（默认正序，点击 toast"待 L4"）
- 触控笔开关：占位 toast
- 题型网格 6×3 = 18 格（computation-area.md 未给截图细节，按 original-app.md 表格）：
  - 行1: 两位数加减 / 凑整百练习 / 三位数加法
  - 行2: 三位数减法 / 三位数加减 / 多数相加
  - 行3: 混合加减 / 两位数乘一位数 / 三位数乘一位数
  - 行4: 两位数乘11 / 两位数乘15 / 两位数乘两位数
  - 行5: 三位数除一位数 / 三位数除两位数 / 乘法估算
  - 行6: 五位数除三位数 / 三位数除四位数 / 自定义
  - 选中项深森林绿底白字，未选项浅薄荷绿
  - **默认选中"两位数加减"**（L1 唯一生效题型）
  - 只有"两位数加减"可点击进入答题；其余 17 格 + 自定义点击 toast"待 L4 实现"
- 题量：`快速(10题) >` 按钮 → 弹窗（快速10/正常15/自定义5-100滑块）
- N-back 角标：占位 toast
- 主按钮"开始练习"（绿）→ store.init({type:'basic_addsub', count}) → 跳 /practice/session
- 底部"导出题目"占位 toast / "历史记录"→ /history
- FAB 蓝色 +：占位 toast

### 3.4 PracticeSession.vue（答题页）

**职责**：展示当前题，捕获双输入，提交判分，驱动状态机。

**布局**：

- 顶部 TopBar（title="基础计算"，progress="x/n"，elapsedMs from store）
- 题目区（居中）：
  - 算式行：`{a}{op}{b}=` + 内联答案输入位（光标在内联位）
  - 时间标准行：`合格{pass}s 良好{good}s 优秀{excellent}s`（getTimeStandard 查表，null 则隐藏）
  - 基础计算无误差行（精确判分）
- Numpad（basic variant）
- 答案字符串在 store，Numpad input 事件 append/toggle-sign，PracticeSession 渲染算式+答案

**双输入**：

- Numpad @input/@submit/@clear/@backspace/@restart/@toggle-sign → store 对应方法
- window keydown 监听（mounted 注册，unmounted 移除）：
  - `0-9` / `.` → input(char)
  - `-` → toggle-sign（与 ± 键一致，切换答案前缀正负；避免 append 产生 "1-2" 无效字符串）
  - Backspace → backspace
  - Enter → submit
  - Escape → restart（整卷重开，需确认）
  - Delete → clear
  - e.preventDefault() 防双触发
- 同一 handler 处理两路径，状态同步天然成立（store 是单一源）

**提交反馈**：

- submit 后 store 判分 → 边框绿（对）/红（错）闪 200ms → setTimeout 进下一题
- 最后一题 → store.finish() → router.push('/practice/result')
- 不显示正确答案（结算页才显示）

**重开**：Escape 或重开按钮 → el-message-box 确认"将丢弃当前进度，整卷重开？" → store.restart()

### 3.5 PracticeResult.vue（结算页）

**职责**：展示会话清单与汇总，提供出口。

**布局**：

- 汇总卡：错误数 / 正确率 / 总用时（0:H:M）
- 清单表格：题序 / 题目 / 正确答案 / 我的答案（红绿标识）/ 每题时间
- 三按钮：
  - "再练一局"（绿）→ store.restart() → /practice/session
  - "返回设置"→ /practice
  - "查看历史"→ /history

**数据源**：store（finished 态，含 records 数组）。刷新页面丢失（无持久化，符合无暂停语义）——若 store 已清空则跳 /practice。

### 3.6 History.vue（L1 实现）

**职责**：展示会话记录列表。

**布局**（最小实现，L5 扩展分页/筛选/详情）：

- 卡片列表：每条 session 显示 日期 / 题型 / 答对/总数 / 用时 / 评语（鼓励语"加油"）
- onMounted 查 sessions 表（按 created_at DESC）
- L1 只需"可见 1 条"验收

## 4. 数据流

### 4.1 会话状态机（stores/practice.ts）

```
状态：idle → running → finished
        ↑___________|  (restart 回 idle→running)
```

**State**：

- `phase: 'idle' | 'running' | 'finished'`
- `sessionId: number | null`
- `config: { type: string; count: number }`
- `questions: Question[]`（生成器产出）
- `currentIndex: number`
- `currentAnswer: string`（当前题用户输入）
- `records: AnswerRecord[]`（已答记录）
- `startedAt: number | null`（performance.now() 基准）
- `elapsedMs: number`
- `error: string | null`

**Question 类型**（generators/basic.ts 导出）：

```typescript
interface Question {
  a: number
  b: number
  op: '+' | '-'
  answer: number // 正确答案
  display: string // 如 "61+84="
}
```

**AnswerRecord 类型**：

```typescript
interface AnswerRecord {
  qIndex: number
  question: string // display
  userAnswer: string
  trueAnswer: string
  isCorrect: boolean
  timeSpentMs: number
}
```

**Actions**：

- `init(config)`：生成器产 N 题 → `INSERT sessions`（type/subtype/difficulty/total/nback/created_at，correct=0,duration=0 占位）拿 sessionId → startedAt=now → phase=running
- `inputChar(c)`：currentAnswer += c
- `toggleSign()`：currentAnswer 前缀切 ±
- `clearAnswer()`：currentAnswer=''
- `backspace()`：currentAnswer.slice(0,-1)
- `submit()`：判分（Number(currentAnswer)===question.answer，精确）→ 计算 timeSpentMs → push records → `INSERT records` → currentAnswer='' → 边框闪 → currentIndex++ 或 finish()
- `finish()`：`UPDATE sessions`（correct/duration_ms）→ phase=finished
- `restart()`：清状态 → init(同 config)（新 sessionId）
- `tick()`：elapsedMs = now - startedAt（setInterval 100ms 调用）

**计时**：setInterval(100ms) 调 tick；进入第一题即开始（computation-area.md §8 实证）；无暂停；restart 归零。

### 4.2 时间标准查询（db/index.ts 扩展）

```typescript
async function getTimeStandard(
  questionType: string,
  questionCount: number,
): Promise<{ pass: number; good: number; excellent: number } | null>
```

逻辑：

1. 查 `time_standards WHERE question_type=? AND question_count=?` → 命中返回
2. 未命中：查同 question_type 所有行，取 count 最接近且 ≤ 的档（降级）→ 返回
3. 全无：返回 null（答题页隐藏标准行）

### 4.3 DB 写入时机

- `sessions`：init 时 INSERT（correct=0/duration=0 占位），finish 时 UPDATE
- `records`：每题 submit 即 INSERT（不缓冲，防崩溃丢数据）
- 不批量事务（SQLite 单条写入足够快，且顺序明确）

### 4.4 新增 migration 0002

`src-tauri/migrations/0002_add_basic_addsub_15.sql`：

```sql
INSERT OR IGNORE INTO time_standards
  (question_type, question_count, pass_s, good_s, excellent_s)
VALUES
  ('basic_addsub', 15, 42, 33, 27);
```

（按 10 题标准 28/22/18 × 1.5 线性推算，用户确认）

## 5. 错误处理

- **DB 错误**：init/insert/update 失败 → store.error 置位 → PracticeSession 用 el-message 显示错误 + "重试"按钮；不静默吞错
- **生成器**：纯函数无 IO，不抛错（count 边界 5-100 在 UI 层约束）
- **双输入冲突**：物理 keydown 用 e.preventDefault() 防双触发；两路径走同一 store action
- **拖拽边界**：clamp 限制视口内；尺寸 min/max（防缩到看不见）
- **时间标准缺失**：getTimeStandard 返回 null → 答题页隐藏标准行（不报错）
- **重开确认**：已答 ≥1 题时弹 el-message-box 确认"将丢弃当前进度"
- **结算页 store 已清**：跳 /practice（避免空状态渲染）

## 6. 测试

### 6.1 生成器单测（vitest，纯函数易测）

- `generateBasicAddSub(10)` 产 10 题，每题 a/b ∈ [10,99]、op ∈ {+,-}、减法 answer ≥ 0、answer 计算正确
- `generateBasicAddSub(15)` 产 15 题
- `generateBasicAddSub(5)` / `generateBasicAddSub(100)` 边界
- 跑 100 次验证随机性（不全部相同）

### 6.2 store 单测（vitest + pinia testing，mock db 层）

- init({type,count}) → phase=running、sessionId>0、questions.length=count
- inputChar('1') → currentAnswer='1'
- submit() → records.length+1、判分正确、currentIndex+1
- 最后一题 submit → finish() → phase=finished、sessions.correct 更新
- restart() → 新 sessionId、旧 records 清空、questions 新序列

### 6.3 DB 集成测（vitest + 内存 SQLite）

- migration 0002 应用后 time_standards 含 basic_addsub×15 行
- getTimeStandard('basic_addsub',10) = {28,22,18}
- getTimeStandard('basic_addsub',15) = {42,33,27}
- getTimeStandard('basic_addsub',7) 降级返回 10 题档 {28,22,18}
- getTimeStandard('unknown_type',10) = null

### 6.4 Numpad 交互测（@vue/test-utils）

- 各按钮点击触发对应 emit（input/submit/clear/backspace/restart/toggle-sign）
- 拖拽 pointer events 改变位置（jsdom 模拟 pointermove）
- 双击恢复默认位置
- variant='basic' 渲染 ± 键（data variant 留 L2 测）

### 6.5 手动验收

按 §1.3 验收清单逐项检查。

## 7. 实现顺序（writing-plans 阶段细化）

1. migration 0002 + db 层扩展（getTimeStandard + session/record CRUD）
2. 生成器 basic.ts + 单测
3. store practice.ts + 单测
4. Numpad.vue（含拖拽）+ 交互测
5. TopBar.vue
6. PracticeSettings.vue（18 题型网格 + 题量弹窗 + 占位）
7. PracticeSession.vue（双输入 + 提交反馈）
8. PracticeResult.vue（清单 + 三按钮）
9. History.vue（最小列表）
10. Home.vue 卡片跳转改 /practice
11. 路由更新
12. 手动验收 + L1 验收清单

## 8. 决策记录

| #   | 决策点               | 取值                                                                   | 来源     |
| --- | -------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | 入口                 | 完整基础计算设置页（18 题型网格，17 格占位）                           | 用户确认 |
| 2   | 题量                 | 10/15/自定义5-100 生效                                                 | 用户确认 |
| 3   | 键盘布局开关         | L1 默认正序，开关占位 toast"待 L4"                                     | 用户确认 |
| 4   | 重开语义             | 整卷重开（重新出题、计时归零、从第1题）                                | 用户确认 |
| 5   | 翻题箭头 <- ->       | 弃用，不渲染                                                           | 用户确认 |
| 6   | 提交反馈             | 边框绿/红闪 200ms 消失，不显示正确答案                                 | 用户确认 |
| 7   | 结算页内容           | 题序/题目/正确答案/我的答案红绿/每题时间/错误数/正确率/总用时 + 三按钮 | 用户确认 |
| 8   | 生成器参数           | 10-99，减法非负，精确判分                                              | 用户确认 |
| 9   | basic_addsub×15 标准 | 42/33/27（10题×1.5 推算）                                              | 用户确认 |
| 10  | 笔图标 ✏             | 占位渲染，不实现功能                                                   | 用户确认 |
| 11  | 自定义入口           | 占位 toast"待 L4"                                                      | 用户确认 |
| 12  | 原生键盘提示文案     | 不渲染（原生键盘一直启用）                                             | 用户确认 |
| 13  | 架构方案             | 方案 A（Pinia store + 三段式路由）                                     | 用户确认 |
