<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { ElMessageBox, ElMessage } from "element-plus";
import {
  listSessionsPaged,
  listSessionTypes,
  clearAllSessions,
  type SessionRow,
} from "@/db/index";
import { typeLabel } from "@/constants/typeLabels";

const PAGE_SIZE = 10;
const sessions = ref<SessionRow[]>([]);
const total = ref(0);
const page = ref(1);
const typeFilter = ref<string>("all");
const availableTypes = ref<string[]>([]);
const loading = ref(true);

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)));

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `0:${m}:${s}`;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function accuracy(s: SessionRow): number {
  return s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
}

function comment(acc: number): string {
  if (acc >= 90) return "优秀";
  if (acc >= 75) return "良好";
  if (acc >= 60) return "合格";
  return "加油";
}

function commentClass(acc: number): string {
  if (acc >= 90) return "excellent";
  if (acc >= 75) return "good";
  if (acc >= 60) return "pass";
  return "fail";
}

async function loadTypes() {
  availableTypes.value = await listSessionTypes();
}

async function loadPage() {
  loading.value = true;
  try {
    const { rows, total: t } = await listSessionsPaged(page.value, PAGE_SIZE, typeFilter.value);
    sessions.value = rows;
    total.value = t;
  } finally {
    loading.value = false;
  }
}

watch(typeFilter, () => {
  page.value = 1;
  loadPage();
});

watch(page, () => loadPage());

function prevPage() {
  if (page.value > 1) page.value -= 1;
}

function nextPage() {
  if (page.value < totalPages.value) page.value += 1;
}

async function onClear() {
  try {
    await ElMessageBox.confirm("确认清除所有练习记录？此操作不可恢复。", "清除历史", {
      confirmButtonText: "清除",
      cancelButtonText: "取消",
      type: "warning",
    });
    await clearAllSessions();
    ElMessage.success("已清除所有练习记录");
    page.value = 1;
    await loadPage();
    await loadTypes();
  } catch {
    // 用户取消
  }
}

onMounted(async () => {
  await Promise.all([loadTypes(), loadPage()]);
});
</script>

<template>
  <div class="history-page">
    <div class="header-row">
      <h2 class="title">练习历史</h2>
      <button class="clear-btn" :disabled="sessions.length === 0" @click="onClear">
        清除全部
      </button>
    </div>

    <div class="filter-row">
      <span class="filter-label">题型筛选</span>
      <select v-model="typeFilter" class="filter-select">
        <option value="all">全部</option>
        <option v-for="t in availableTypes" :key="t" :value="t">{{ typeLabel(t) }}</option>
      </select>
    </div>

    <div v-if="loading" class="empty">加载中…</div>
    <div v-else-if="sessions.length === 0" class="empty">暂无记录</div>
    <div v-else class="session-list">
      <div v-for="s in sessions" :key="s.id" class="session-card glass-card">
        <div class="card-row">
          <span class="date">{{ formatDate(s.created_at) }}</span>
          <span class="type">{{ s.subtype || typeLabel(s.type) }}</span>
        </div>
        <div class="card-row">
          <span class="stat">答对 {{ s.correct }}/{{ s.total }}</span>
          <span class="stat">用时 {{ formatDuration(s.duration_ms) }}</span>
          <span class="acc">{{ accuracy(s) }}%</span>
        </div>
        <div class="comment" :class="commentClass(accuracy(s))">{{ comment(accuracy(s)) }}</div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="page === 1" @click="prevPage">‹ 上一页</button>
      <span class="page-info">{{ page }} / {{ totalPages }}</span>
      <button class="page-btn" :disabled="page === totalPages" @click="nextPage">下一页 ›</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.history-page {
  padding: 80px 24px 24px 96px;
  max-width: 720px;
  margin: 0 auto;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.title {
  color: var(--app-text-bright, #eee8d5);
  margin: 0;
}

.clear-btn {
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: var(--app-bg-surface, #073642);
  color: var(--app-text-secondary, #586e75);
  font-size: 13px;
  cursor: pointer;
  &:hover:not(:disabled) {
    color: #dc6c6c;
    border-color: #dc6c6c;
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.filter-label {
  color: var(--app-text-secondary, #586e75);
  font-size: 13px;
}

.filter-select {
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: var(--app-bg-surface, #073642);
  color: var(--app-text-primary, #93a1a1);
  font-size: 13px;
  cursor: pointer;
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
  align-items: center;
  margin-bottom: 6px;
  color: var(--app-text-primary, #93a1a1);
  gap: 12px;
}

.date {
  color: var(--app-text-secondary, #586e75);
  font-size: 13px;
}

.type {
  font-weight: 600;
}

.stat {
  font-variant-numeric: tabular-nums;
}

.acc {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--app-color-primary, #5faf6f);
}

.comment {
  margin-top: 8px;
  font-size: 13px;
  &.excellent { color: #5faf6f; }
  &.good { color: #b58900; }
  &.pass { color: #268bd2; }
  &.fail { color: #dc6c6c; }
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
}

.page-btn {
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: var(--app-bg-surface, #073642);
  color: var(--app-text-primary, #93a1a1);
  cursor: pointer;
  &:hover:not(:disabled) {
    border-color: var(--app-color-primary, #5faf6f);
    color: var(--app-color-primary, #5faf6f);
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.page-info {
  color: var(--app-text-secondary, #586e75);
  font-variant-numeric: tabular-nums;
}
</style>
