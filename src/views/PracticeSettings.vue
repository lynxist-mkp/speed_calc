<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { usePracticeStore } from '@/stores/practice'
import { useSettingsStore } from '@/stores/settings'
import { listCustomPresets, upsertCustomPreset, type CustomPreset } from '@/db/index'
import {
  formatStandardName,
  formatPowerName,
  type CustomStandardConfig,
  type CustomPowerConfig,
} from '@/generators/custom'
import type { BasicType } from '@/generators/basic'
import TypeGrid from '@/components/TypeGrid.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import SettingRow from '@/components/SettingRow.vue'

type Operator = '+' | '-' | '×' | '÷'

const router = useRouter()
const store = usePracticeStore()
const settings = useSettingsStore()

// 题型分 section（key 与 BasicType 一致，供 TypeGrid 使用）
const sections = [
  {
    title: '加减法',
    types: [
      { key: 'addsub_2d', label: '两位数加减' },
      { key: 'round_100', label: '凑整百练习' },
      { key: 'add_3d', label: '三位数加法' },
      { key: 'sub_3d', label: '三位数减法' },
      { key: 'addsub_3d', label: '三位数加减' },
      { key: 'add_multi', label: '多数相加' },
      { key: 'addsub_mix', label: '混合加减' },
    ],
  },
  {
    title: '乘除法',
    types: [
      { key: 'mul_2x1', label: '两位数乘一位数' },
      { key: 'mul_3x1', label: '三位数乘一位数' },
      { key: 'mul_2x11', label: '两位数乘11' },
      { key: 'mul_2x15', label: '两位数乘15' },
      { key: 'mul_2x2', label: '两位数乘两位数' },
      { key: 'div_3x1', label: '三位数除一位数' },
      { key: 'div_3x2', label: '三位数除两位数' },
      { key: 'mul_est', label: '乘法估算' },
      { key: 'div_5x3', label: '五位数除三位数' },
      { key: 'div_3x4', label: '三位数除四位数' },
    ],
  },
]

//扁平化题型列表（与原 questionTypes 顺序一致，用于 selectedType number index 与 BasicType 互转）
const flatTypes: BasicType[] = sections.flatMap((s) => s.types.map((t) => t.key as BasicType))

const OPERATORS: Operator[] = ['+', '-', '×', '÷']

// 当前选中题型（字符串 key，供 TypeGrid 使用）
const selectedType = ref<BasicType>('addsub_2d')

function onTypeChange(key: string) {
  selectedType.value = key as BasicType
  const idx = flatTypes.indexOf(key as BasicType)
  if (idx >= 0) {
    void settings.saveBasic({ selectedType: idx })
  }
}

// 键盘布局
const layoutOptions = [
  { label: '正序', value: 'normal' },
  { label: '倒序', value: 'reverse' },
  { label: '乱序', value: 'shuffle' },
]
const layout = computed(() => settings.basic.keyboardLayout)

async function onLayoutChange(v: string) {
  await settings.saveBasic({
    keyboardLayout: v as 'normal' | 'reverse' | 'shuffle',
  })
}

// 题量 segmented
const countOptions = [
  { label: '5', value: '5' },
  { label: '10', value: '10' },
  { label: '15', value: '15' },
  { label: '20', value: '20' },
  { label: '自定', value: 'custom' },
]
const countMode = computed(() => {
  if (settings.basic.countMode === 'custom') return 'custom'
  return String(settings.basic.count)
})
const customCount = ref(settings.basic.count)
const showCustomExpand = computed(() => countMode.value === 'custom')

async function onCountChange(v: string) {
  if (v === 'custom') {
    await settings.saveBasic({ countMode: 'custom', count: customCount.value })
  } else {
    const n = Number(v)
    await settings.saveBasic({ countMode: 'quick', count: n })
  }
}

async function onCustomCountInput(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  customCount.value = Math.max(5, Math.min(100, v))
  await settings.saveBasic({ countMode: 'custom', count: customCount.value })
}

// N-back
const nbackOptions = [
  { label: '关闭', value: '0' },
  { label: '1-back', value: '1' },
  { label: '2-back', value: '2' },
]
const nback = computed(() => String(settings.basic.nback))

async function onNbackChange(v: string) {
  await settings.saveBasic({ nback: Number(v) as 0 | 1 | 2 })
}

// 自定义弹窗（保留 el-dialog 用于复杂表单——这是复杂表单，不在本次重构范围）
const customVisible = ref(false)
const customTab = ref<'standard' | 'power'>('standard')
const presets = ref<CustomPreset[]>([])

const stdCfg = ref<CustomStandardConfig>({
  firstDigits: 2,
  operators: ['+'],
  secondMode: 'random_digits',
  secondDigits: 1,
  secondFixed: 5,
  secondMin: 1,
  secondMax: 9,
})
const powCfg = ref<CustomPowerConfig>({
  baseMode: 'digits',
  baseDigits: 2,
  baseMin: 2,
  baseMax: 9,
  powerTypes: [2],
})

async function openCustomDialog() {
  customVisible.value = true
  presets.value = await listCustomPresets()
}

function loadPreset(p: CustomPreset) {
  try {
    const cfg = JSON.parse(p.config)
    if (Array.isArray(cfg?.operators)) {
      stdCfg.value = { ...stdCfg.value, ...cfg }
      customTab.value = 'standard'
    } else if (Array.isArray(cfg?.powerTypes)) {
      powCfg.value = { ...powCfg.value, ...cfg }
      customTab.value = 'power'
    } else {
      ElMessage.warning('预设格式异常')
    }
  } catch {
    ElMessage.error('预设加载失败')
  }
}

function toggleOperator(op: Operator) {
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
  try {
    await upsertCustomPreset(name, JSON.stringify(cfg))
    await settings.saveBasic({ selectedType: flatTypes.length }) // 自定义索引 = 题型总数
    customVisible.value = false
    await startCustom(type, cfg, name)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '自定义练习启动失败')
  }
}

async function startCustom(
  type: 'custom_standard' | 'custom_power',
  cfg: CustomStandardConfig | CustomPowerConfig,
  name: string,
) {
  await store.init({
    type,
    subtype: name,
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

// 开始练习
async function startPractice() {
  const idx = flatTypes.indexOf(selectedType.value)
  if (idx < 0) {
    ElMessage.error('题型无效')
    return
  }
  const t = sections.flatMap((s) => s.types)[idx]
  await store.init({
    type: selectedType.value,
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

onMounted(async () => {
  await settings.load()
  const idx = settings.basic.selectedType
  if (idx >= 0 && idx < flatTypes.length) {
    selectedType.value = flatTypes[idx]
  }
  customCount.value = settings.basic.count
})
</script>

<template>
  <div class="practice-settings">
    <h2 class="page-title">基础计算</h2>

    <!-- 键盘布局 -->
    <SettingRow label="键盘布局">
      <SegmentedControl
        :options="layoutOptions"
        :model-value="layout"
        @update:model-value="onLayoutChange"
      />
    </SettingRow>

    <!-- 题型选择 -->
    <SettingRow label="题型选择">
      <TypeGrid
        :sections="sections"
        :model-value="selectedType"
        @update:model-value="onTypeChange"
      />
    </SettingRow>

    <!-- 题量 -->
    <SettingRow label="题量" :expandable="showCustomExpand" :expanded="showCustomExpand">
      <SegmentedControl
        :options="countOptions"
        :model-value="countMode"
        @update:model-value="onCountChange"
      />
      <template #expand>
        <div class="custom-count">
          <label>自定义题量（5-100）</label>
          <input type="range" min="5" max="100" :value="customCount" @input="onCustomCountInput" />
          <span class="count-value">{{ customCount }} 题</span>
        </div>
      </template>
    </SettingRow>

    <!-- N-back -->
    <SettingRow label="N-back 工作记忆训练">
      <SegmentedControl
        :options="nbackOptions"
        :model-value="nback"
        @update:model-value="onNbackChange"
      />
    </SettingRow>

    <!-- 操作按钮 -->
    <div class="actions">
      <button class="btn-primary" @click="startPractice">开始练习</button>
      <button class="btn-secondary" @click="openCustomDialog">自定义运算</button>
      <button class="btn-secondary" @click="goHistory">历史记录</button>
    </div>

    <!-- 自定义运算弹窗（保留 el-dialog 用于复杂表单） -->
    <el-dialog v-model="customVisible" title="自定义运算" width="600">
      <el-tabs v-model="customTab">
        <el-tab-pane label="标准运算" name="standard">
          <div class="custom-form">
            <div class="form-row">
              <label>首位位数</label>
              <input v-model.number="stdCfg.firstDigits" type="number" min="1" max="5" />
            </div>
            <div class="form-row">
              <label>运算符</label>
              <div class="op-list">
                <button
                  v-for="op in OPERATORS"
                  :key="op"
                  class="op-btn"
                  :class="{ active: stdCfg.operators.includes(op) }"
                  @click="toggleOperator(op)"
                >
                  {{ op }}
                </button>
              </div>
            </div>
            <div class="form-row">
              <label>次位模式</label>
              <select v-model="stdCfg.secondMode">
                <option value="random_digits">随机位数</option>
                <option value="fixed">固定值</option>
                <option value="range">范围</option>
              </select>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="幂运算" name="power">
          <div class="custom-form">
            <div class="form-row">
              <label>底数模式</label>
              <select v-model="powCfg.baseMode">
                <option value="digits">按位数</option>
                <option value="range">按范围</option>
              </select>
            </div>
            <div class="form-row">
              <label>底数位数</label>
              <input v-model.number="powCfg.baseDigits" type="number" min="1" max="5" />
            </div>
            <div class="form-row">
              <label>幂次</label>
              <div class="op-list">
                <button
                  v-for="p in [2, 3] as const"
                  :key="p"
                  class="op-btn"
                  :class="{ active: powCfg.powerTypes.includes(p) }"
                  @click="togglePower(p)"
                >
                  {{ p }}
                </button>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>

      <div class="presets">
        <h4>最近预设</h4>
        <div v-if="presets.length === 0" class="empty">暂无预设</div>
        <div v-else class="preset-list">
          <button v-for="p in presets" :key="p.id" class="preset-item" @click="loadPreset(p)">
            {{ p.name }}
          </button>
        </div>
      </div>

      <template #footer>
        <button class="btn-secondary" @click="customVisible = false">取消</button>
        <button class="btn-primary" @click="onCustomConfirm">保存并开始</button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.practice-settings {
  max-width: 720px;
  margin: 0 auto;
}

.page-title {
  font-size: 22px;
  color: var(--app-text-bright);
  margin-bottom: 16px;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-primary {
  flex: 1;
  padding: 12px 20px;
  background: var(--app-color-primary);
  color: var(--app-bg-page);
  border: none;
  border-radius: var(--app-radius-button);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: var(--app-color-primary-hover);
  }
}

.btn-secondary {
  flex: 1;
  padding: 12px 20px;
  background: var(--button-bg);
  color: var(--app-text-bright);
  border: 1px solid var(--button-border);
  border-radius: var(--app-radius-button);
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background: var(--button-bg-hover);
    border-color: var(--app-color-primary);
  }
}

.custom-count {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;

  label {
    color: var(--app-text-secondary);
  }

  input[type='range'] {
    width: 100%;
    accent-color: var(--app-color-primary);
  }

  .count-value {
    color: var(--app-color-primary);
    font-weight: 600;
    text-align: right;
  }
}

.custom-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;

  label {
    width: 80px;
    color: var(--app-text-secondary);
  }

  input,
  select {
    background: var(--app-bg-surface);
    color: var(--app-text-primary);
    border: 1px solid var(--app-glass-border);
    border-radius: 4px;
    padding: 4px 8px;
  }
}

.op-list {
  display: flex;
  gap: 6px;
}

.op-btn {
  width: 36px;
  height: 36px;
  background: var(--button-bg);
  border: 1px solid var(--button-border);
  border-radius: 4px;
  color: var(--app-text-primary);
  cursor: pointer;

  &.active {
    background: var(--button-bg-active);
    border-color: var(--app-color-primary);
    color: var(--app-text-bright);
  }
}

.presets {
  margin-top: 16px;

  h4 {
    font-size: 13px;
    color: var(--app-text-bright);
    margin-bottom: 8px;
  }

  .empty {
    font-size: 12px;
    color: var(--app-text-muted);
  }

  .preset-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .preset-item {
    background: var(--button-bg);
    border: 1px solid var(--button-border);
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 12px;
    color: var(--app-text-primary);
    cursor: pointer;

    &:hover {
      border-color: var(--app-color-primary);
    }
  }
}
</style>
