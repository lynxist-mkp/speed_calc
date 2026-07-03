<script setup lang="ts">
// 行测小助手 - 应用根布局
// L0：浮动玻璃 sidebar（左）+ 浮动玻璃 toolbar（顶）+ edge-to-edge 主内容区
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import AppSidebar from "./components/AppSidebar.vue";
import AppToolbar from "./components/AppToolbar.vue";
import { verifySchema, countTimeStandards } from "./db";

const route = useRoute();
const dbStatus = ref<"pending" | "ok" | "error">("pending");
const dbDetail = ref<string>("");

async function checkDb() {
  try {
    const tables = await verifySchema();
    const seedCount = await countTimeStandards();
    const names = tables.map((t) => t.table).join(", ");
    dbStatus.value = "ok";
    dbDetail.value = `5 表就绪（${names}）；time_standards 种子 ${seedCount} 条`;
  } catch (e) {
    dbStatus.value = "error";
    dbDetail.value = String(e);
  }
}

onMounted(checkDb);
</script>

<template>
  <div class="app-shell">
    <AppSidebar />

    <div class="app-main">
      <AppToolbar />

      <main class="app-content">
        <RouterView />

        <!-- L0 验收辅助：DB 状态条（后续 Level 移除） -->
        <div v-if="route.path === '/home'" class="db-status glass-card">
          <span class="label">SQLite 建表自检：</span>
          <span v-if="dbStatus === 'pending'" class="text-secondary">检查中…</span>
          <span v-else-if="dbStatus === 'ok'" class="text-primary">✓ {{ dbDetail }}</span>
          <span v-else class="text-danger">✗ {{ dbDetail }}</span>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-shell {
  display: flex;
  width: 100%;
  height: 100%;
  background: var(--app-bg-page);
  // 主背景轻微径向渐变，让玻璃浮层有层次感
  background-image: radial-gradient(ellipse at top left, rgba(95, 175, 111, 0.06), transparent 60%);
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  // edge-to-edge：内容铺满，不被 sidebar 挤压（sidebar 浮于其上）
  padding-left: 0;
}

.app-content {
  flex: 1;
  overflow: auto;
  padding: 88px 24px 24px 96px; // 顶:toolbar 高 + 左:sidebar 宽 + 内边距
}

.db-status {
  margin-top: 24px;
  padding: 12px 16px;
  font-size: 13px;
  display: inline-flex;
  gap: 8px;
  align-items: center;

  .label {
    color: var(--app-text-secondary);
  }
  .text-danger {
    color: var(--app-color-danger);
  }
}
</style>
