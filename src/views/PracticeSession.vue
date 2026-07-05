<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import TopBar from '@/components/TopBar.vue'
import Numpad from '@/components/Numpad.vue'
import QuestionDisplay from '@/components/QuestionDisplay.vue'
import CompareQuestion from '@/components/CompareQuestion.vue'
import CompareKeypad from '@/components/CompareKeypad.vue'
import BarChart from '@/components/BarChart.vue'
import KeymapGuideModal from '@/components/KeymapGuideModal.vue'
import { usePracticeStore } from '@/stores/practice'
import { useSettingsStore } from '@/stores/settings'
import { resolveNumpadKey, resolveCompareKey } from '@/utils/keymap'

const router = useRouter()
const store = usePracticeStore()
const settings = useSettingsStore()

const flashState = ref<'none' | 'correct' | 'wrong'>('none')
let flashTimer: number | null = null

// 键盘指引弹窗：首次进入自动显示，之后可点 ? 按钮呼出
const GUIDE_SHOWN_KEY = 'keymap:guideShown'
const guideVisible = ref(false)

function openGuide() {
  guideVisible.value = true
}

function closeGuide() {
  guideVisible.value = false
  try {
    localStorage.setItem(GUIDE_SHOWN_KEY, '1')
  } catch {
    // localStorage 不可用，忽略
  }
}

function goSettingsFromGuide() {
  guideVisible.value = false
  try {
    localStorage.setItem(GUIDE_SHOWN_KEY, '1')
  } catch {
    // 忽略
  }
  router.push('/settings')
}

const standardText = computed(() => {
  const s = store.timeStandard
  if (s === null) return null
  return `合格 ${s.pass}s  良好 ${s.good}s  优秀 ${s.excellent}s`
})

// chart 呈现模式：仅 annual_growth_rate / annual_avg 在 displayMode=chart 时启用
const CHART_TYPES = new Set(['annual_growth_rate', 'annual_avg'])
const useChart = computed(() => {
  if (settings.dataAnalysis.displayMode !== 'chart') return false
  const q = store.currentQuestion
  if (!q || !('chartData' in q)) return false
  return CHART_TYPES.has(store.config?.type ?? '')
})

function handleKeydown(e: KeyboardEvent) {
  if (store.phase !== 'running') return

  // 防止 Numpad 按钮聚焦时 Enter/Escape 双触发，以及 Space 在按钮上触发点击
  if (
    (e.code === 'Enter' || e.code === 'Escape' || e.code === 'Space') &&
    e.target instanceof HTMLButtonElement
  ) {
    return
  }

  if (store.questionCategory === 'compare') {
    const r = resolveCompareKey(e)
    if (r.type === 'select') {
      e.preventDefault()
      store.selectCompare(r.payload)
    } else if (r.type === 'submit') {
      e.preventDefault()
      void onSubmit()
    } else if (r.type === 'restart') {
      e.preventDefault()
      void onRestart()
    }
    return
  }

  // 数字题模式
  const r = resolveNumpadKey(e, settings.global.keyboardInputLayout)
  if (r.type === 'input') {
    e.preventDefault()
    store.inputChar(r.payload)
  } else if (r.type === 'function') {
    e.preventDefault()
    if (r.payload === 'backspace') store.backspace()
    else if (r.payload === 'submit') void onSubmit()
    else if (r.payload === 'restart') void onRestart()
    else if (r.payload === 'clear') store.clearAnswer()
    else if (r.payload === 'toggle-sign') store.toggleSign()
  }
}

async function onSubmit() {
  // compare 模式：直接提交（不需 currentAnswer 守卫）
  if (store.questionCategory === 'compare') {
    if (store.compareChoice === null) return
    await store.submit()
    const lastRecord = store.records[store.records.length - 1]
    if (lastRecord) {
      if (flashTimer !== null) clearTimeout(flashTimer)
      flashState.value = lastRecord.isCorrect ? 'correct' : 'wrong'
      flashTimer = window.setTimeout(() => {
        flashState.value = 'none'
        flashTimer = null
      }, 200)
    }
    if (store.phase === 'finished') {
      router.push('/practice/result')
    }
    return
  }
  // numpad 模式：空答案守卫由 store.submit() 处理（N-back 前 N 题允许空提交）
  const beforeLen = store.records.length
  await store.submit()
  // 仅当有新判分记录时显示反馈（N-back 前 N 题无判分，不闪烁）
  if (store.records.length > beforeLen) {
    const lastRecord = store.records[store.records.length - 1]
    if (lastRecord) {
      if (flashTimer !== null) clearTimeout(flashTimer)
      flashState.value = lastRecord.isCorrect ? 'correct' : 'wrong'
      flashTimer = window.setTimeout(() => {
        flashState.value = 'none'
        flashTimer = null
      }, 200)
    }
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
  router.push(store.isDataType ? '/practice/data-analysis' : '/practice')
}

onMounted(() => {
  // 若未初始化（如直接访问 URL），回设置页
  if (store.phase !== 'running') {
    router.replace(store.isDataType ? '/practice/data-analysis' : '/practice')
    return
  }
  window.addEventListener('keydown', handleKeydown)
  // 首次进入练习时自动弹出键盘指引
  try {
    if (!localStorage.getItem(GUIDE_SHOWN_KEY)) {
      guideVisible.value = true
    }
  } catch {
    // localStorage 不可用，忽略
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (flashTimer !== null) clearTimeout(flashTimer)
})
</script>

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
      <template #right>
        <button
          class="guide-btn glass-button"
          aria-label="键盘输入指引"
          title="键盘输入指引"
          @click="openGuide"
        >
          ?
        </button>
        <span v-if="store.nback > 0" class="nback-badge">{{ store.nback }}-back</span>
      </template>
    </TopBar>

    <!-- 题目区按 category 切换 -->
    <template v-if="store.questionCategory === 'numpad'">
      <BarChart
        v-if="useChart"
        :labels="(store.currentQuestion as any)?.chartData?.labels ?? []"
        :values="(store.currentQuestion as any)?.chartData?.values ?? []"
        :unit="(store.currentQuestion as any)?.chartData?.unit"
      />
      <QuestionDisplay
        :display="(store.currentQuestion as any)?.display ?? ''"
        :is-data="store.isDataType"
        :context="store.questionMeta?.context"
        :hint="store.questionMeta?.hint"
        :tolerance="store.questionMeta?.tolerance"
        :unit="store.questionMeta?.unit"
        :standard-text="standardText"
        :answer="store.currentAnswer"
      />
    </template>
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
      @open-guide="openGuide"
    />
    <CompareKeypad
      v-else-if="store.questionCategory === 'compare'"
      :selected="store.compareChoice"
      @select="store.selectCompare($event)"
      @submit="onSubmit"
      @restart="onRestart"
    />

    <!-- 键盘输入指引弹窗 -->
    <KeymapGuideModal
      :visible="guideVisible"
      :layout="settings.global.keyboardInputLayout"
      @close="closeGuide"
      @go-settings="goSettingsFromGuide"
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
  color: var(--app-text-primary);
  font-size: 22px;
  cursor: pointer;
}

.guide-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: var(--app-text-secondary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-right: 4px;
  &:hover {
    background: rgba(95, 175, 111, 0.2);
    color: var(--app-color-primary);
  }
}

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

// reduced-motion 静态降级：闪烁反馈改为静态边框
@media (prefers-reduced-motion: reduce) {
  .practice-session.flash-correct,
  .practice-session.flash-wrong {
    animation: none !important;
    border: 2px solid var(--app-color-primary);
  }
  .practice-session.flash-wrong {
    border-color: var(--app-color-danger);
  }
}
</style>
