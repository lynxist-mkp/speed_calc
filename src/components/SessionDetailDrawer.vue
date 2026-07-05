<script setup lang="ts">
// 历史详情抽屉：从右侧滑出，展示某次 session 的所有题目详情
import { ref, watch } from "vue";
import { listRecordsBySession, type SessionRow, type RecordRow } from "@/db/index";
import { typeLabel } from "@/constants/typeLabels";

interface Props {
  visible: boolean;
  session: SessionRow | null;
}
const props = defineProps<Props>();
const emit = defineEmits<{ close: [] }>();

const records = ref<RecordRow[]>([]);
const loading = ref(false);

watch(
  () => [props.visible, props.session?.id],
  async ([vis]) => {
    if (vis && props.session) {
      loading.value = true;
      try {
        records.value = await listRecordsBySession(props.session.id);
      } finally {
        loading.value = false;
      }
    } else {
      records.value = [];
    }
  },
  { immediate: true }
);

function formatTime(ms: number): string {
  if (!ms) return "0s";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function accuracy(s: SessionRow): number {
  return s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
}

// 拦截 Esc/Enter 防止冒泡到练习页
function onKeydownCapture(e: KeyboardEvent) {
  if (!props.visible) return;
  if (e.code === "Escape") {
    e.stopPropagation();
    e.preventDefault();
    emit("close");
  }
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      window.addEventListener("keydown", onKeydownCapture, true);
    } else {
      window.removeEventListener("keydown", onKeydownCapture, true);
    }
  }
);
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="drawer-overlay" @click="emit('close')">
      <div
        class="drawer-panel glass-card"
        role="dialog"
        aria-modal="true"
        aria-label="答题详情"
        @click.stop
      >
        <button class="drawer-close" aria-label="关闭" @click="emit('close')">×</button>

        <template v-if="session">
          <!-- 头部信息 -->
          <header class="drawer-header">
            <div class="header-row">
              <span class="header-type">{{ session.subtype || typeLabel(session.type) }}</span>
              <span class="header-date">{{ formatDate(session.created_at) }}</span>
            </div>
            <div class="header-stats">
              <span class="stat-item">
                <span class="stat-label">答对</span>
                <span class="stat-value">{{ session.correct }}/{{ session.total }}</span>
              </span>
              <span class="stat-item">
                <span class="stat-label">正确率</span>
                <span class="stat-value" :class="accuracy(session) >= 75 ? 'good' : 'low'">{{ accuracy(session) }}%</span>
              </span>
            </div>
          </header>

          <!-- 题目列表 -->
          <div class="drawer-body">
            <div v-if="loading" class="empty">加载中…</div>
            <div v-else-if="records.length === 0" class="empty">该次练习无答题记录</div>
            <div v-else class="record-list">
              <div
                v-for="r in records"
                :key="r.id"
                class="record-row"
                :class="{ wrong: r.isCorrect === 0 }"
              >
                <span class="rec-idx" :class="r.isCorrect === 1 ? 'ok' : 'no'">
                  {{ r.isCorrect === 1 ? '✓' : '✗' }}
                </span>
                <div class="rec-content">
                  <div class="rec-question">{{ r.question }}</div>
                  <div class="rec-answers">
                    <span class="rec-user">你的答案：{{ r.userAnswer }}</span>
                    <span class="rec-true">正确答案：{{ r.trueAnswer }}</span>
                  </div>
                </div>
                <span class="rec-time">{{ formatTime(r.timeSpentMs) }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: var(--app-bg-overlay);
  z-index: 1000;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.drawer-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 420px;
  max-width: calc(100vw - 32px);
  background: var(--app-bg-elevated);
  border-radius: 0;
  border-left: 1px solid var(--app-glass-border);
  display: flex;
  flex-direction: column;
  animation: slideIn 0.25s ease;
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.drawer-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--app-text-secondary);
  font-size: 20px;
  cursor: pointer;
  z-index: 1;
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--app-text-bright);
  }
}

.drawer-header {
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--app-glass-border);
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.header-type {
  font-size: 16px;
  font-weight: 600;
  color: var(--app-text-bright);
}

.header-date {
  font-size: 12px;
  color: var(--app-text-secondary);
}

.header-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 11px;
  color: var(--app-text-secondary);
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--app-text-bright);
  font-variant-numeric: tabular-nums;
  &.good { color: var(--app-color-primary); }
  &.low { color: #dc6c6c; }
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 20px 20px;
}

.empty {
  color: var(--app-text-secondary);
  text-align: center;
  padding: 40px;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.record-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 6px;
  transition: background 0.1s;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  &.wrong {
    background: rgba(220, 108, 108, 0.06);
  }
}

.rec-idx {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  margin-top: 1px;

  &.ok {
    background: rgba(95, 175, 111, 0.2);
    color: var(--app-color-primary);
  }
  &.no {
    background: rgba(220, 108, 108, 0.2);
    color: #dc6c6c;
  }
}

.rec-content {
  flex: 1;
  min-width: 0;
}

.rec-question {
  font-family: var(--app-font-mono);
  font-size: 13px;
  color: var(--app-text-primary);
  margin-bottom: 4px;
  word-break: break-all;
}

.rec-answers {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.rec-user,
.rec-true {
  font-size: 11px;
  color: var(--app-text-secondary);
  font-variant-numeric: tabular-nums;
}

.rec-true {
  color: var(--app-color-primary);
}

.rec-time {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--app-text-muted);
  font-variant-numeric: tabular-nums;
  margin-top: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .drawer-overlay,
  .drawer-panel {
    animation: none;
    backdrop-filter: none;
  }
}
</style>
