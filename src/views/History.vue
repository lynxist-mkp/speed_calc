<script setup lang="ts">
import { ref, onMounted } from "vue";
import { listSessions, type SessionRow } from "@/db/index";

const sessions = ref<SessionRow[]>([]);
const loading = ref(true);

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

onMounted(async () => {
  try {
    sessions.value = await listSessions();
  } finally {
    loading.value = false;
  }
});
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
