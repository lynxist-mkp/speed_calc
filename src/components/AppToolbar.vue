<script setup lang="ts">
// 浮动玻璃 toolbar - 顶部
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => (route.meta.title as string) ?? '行测小助手')
</script>

<template>
  <header class="app-toolbar glass-toolbar">
    <div class="toolbar-left">
      <span class="toolbar-title">{{ title }}</span>
    </div>
    <div class="toolbar-right text-secondary">
      <span class="text-mono">行测小助手 · 本地版</span>
    </div>
  </header>
</template>

<style scoped lang="scss">
.app-toolbar {
  position: fixed;
  top: 16px;
  left: 96px; // sidebar 宽 72 + 16 间距 + 8 余量
  right: 16px;
  height: 56px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 99;
}

.toolbar-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--app-text-bright);
  letter-spacing: 0.5px;
}

.toolbar-right {
  font-size: 12px;
}
</style>
