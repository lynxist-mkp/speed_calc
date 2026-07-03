<script setup lang="ts">
// 浮动玻璃 sidebar - 左侧导航
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { House, Edit, Clock, DataLine, Setting } from "@element-plus/icons-vue";

const route = useRoute();
const router = useRouter();

const items = [
  { path: "/home", label: "主页", icon: House },
  { path: "/practice", label: "练习", icon: Edit },
  { path: "/history", label: "历史", icon: Clock },
  { path: "/stats", label: "统计", icon: DataLine },
  { path: "/settings", label: "设置", icon: Setting },
] as const;

const activePath = computed(() => route.path);
</script>

<template>
  <nav class="app-sidebar glass-sidebar">
    <div class="brand">
      <div class="brand-mark">速</div>
      <div class="brand-text">
        <div class="brand-title">行测小助手</div>
        <div class="brand-sub">资料分析速算训练</div>
      </div>
    </div>

    <ul class="nav-list">
      <li
        v-for="item in items"
        :key="item.path"
        class="nav-item glass-button"
        :class="{ 'is-active': activePath === item.path }"
        @click="router.push(item.path)"
      >
        <el-icon :size="18"><component :is="item.icon" /></el-icon>
        <span class="nav-label">{{ item.label }}</span>
      </li>
    </ul>

    <div class="sidebar-footer">
      <div class="text-muted text-version">v0.1.0 · L0</div>
      <div class="text-muted text-credit">本地版 · 离线</div>
    </div>
  </nav>
</template>

<style scoped lang="scss">
.app-sidebar {
  position: fixed;
  top: 16px;
  left: 16px;
  bottom: 16px;
  width: 72px;
  padding: 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 100;
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 0 16px;

  .brand-mark {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--app-color-primary), var(--app-color-success));
    color: var(--app-bg-page);
    font-size: 20px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(95, 175, 111, 0.3);
  }

  .brand-text {
    display: none; // L0 sidebar 收起态：只显示图标
  }
}

.nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 4px;
  cursor: pointer;
  color: var(--app-text-secondary);
  font-size: 11px;

  .nav-label {
    font-size: 11px;
    line-height: 1;
  }

  &.is-active {
    color: var(--app-text-bright);
  }
}

.sidebar-footer {
  text-align: center;
  font-size: 10px;
  line-height: 1.4;
  padding-top: 8px;
  border-top: 1px solid var(--app-glass-border);

  .text-version {
    color: var(--app-color-primary);
    font-weight: 600;
  }
}
</style>
