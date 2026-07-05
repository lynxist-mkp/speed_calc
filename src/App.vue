<script setup lang="ts">
// 行测小助手 - 应用根布局
// sidebar 72px + 单一顶栏（default→AppToolbar / answer→由 view 自带 TopBar）
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
import AppToolbar from './components/AppToolbar.vue'

const route = useRoute()
const layout = computed(() => (route.meta.layout as string | undefined) ?? 'default')
const showAppToolbar = computed(() => layout.value === 'default')
</script>

<template>
  <div class="app-shell">
    <AppSidebar />

    <div class="app-main">
      <AppToolbar v-if="showAppToolbar" />

      <main class="app-content" :class="{ 'answer-mode': !showAppToolbar }">
        <RouterView />
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
  background-image: radial-gradient(ellipse at top left, rgba(95, 175, 111, 0.06), transparent 60%);
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding-left: 0;
}

.app-content {
  flex: 1;
  overflow: auto;
  padding: 88px 24px 24px 96px;

  &.answer-mode {
    // 答题页由 TopBar 自带顶栏，AppToolbar 不渲染
    // TopBar 是文档流，padding-top 减小为 24px
    padding-top: 24px;
  }
}
</style>
