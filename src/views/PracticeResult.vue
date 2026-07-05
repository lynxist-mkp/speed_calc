<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { usePracticeStore } from '@/stores/practice'
import Katex from '@/components/Katex.vue'

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
  const target = store.isDataType ? '/practice/data-analysis' : '/practice'
  store.reset()
  router.push(target)
}

function goHistory() {
  router.push('/history')
}

onMounted(() => {
  // 若会话未结束（如直接访问 URL），回设置页
  if (store.phase !== 'finished') {
    router.replace('/practice')
    return
  }
  if (store.error) {
    ElMessage.warning('会话保存失败，历史记录可能不完整')
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
        <span><Katex :tex="r.question" /></span>
        <span>{{ r.trueAnswer }}{{ r.unit || '' }}</span>
        <span :class="r.isCorrect ? 'ans-correct' : 'ans-wrong'">{{
          r.userAnswer ? r.userAnswer + (r.unit || '') : '（空）'
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
  color: var(--app-text-primary);
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
  color: var(--app-text-secondary);
  margin-bottom: 6px;
}

.summary-value {
  font-size: 28px;
  font-weight: 600;
  color: var(--app-text-primary);
  &.error {
    color: #ff6e8c;
  }
}

.record-list {
  background: var(--app-bg-surface);
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
  color: var(--app-text-primary);
}

.record-header {
  background: rgba(255, 255, 255, 0.04);
  font-weight: 600;
  color: var(--app-text-secondary);
}

.record-row {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  &.wrong {
    background: rgba(255, 110, 140, 0.05);
  }
}

.ans-correct {
  color: var(--app-color-primary);
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
  background: var(--app-bg-surface);
  color: var(--app-text-primary);
  cursor: pointer;
  font-size: 15px;
  &.primary {
    background: var(--app-color-primary);
    color: #fff;
    border-color: var(--app-color-primary);
    &:hover {
      background: #6fbf7f;
    }
  }
  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
}
</style>
