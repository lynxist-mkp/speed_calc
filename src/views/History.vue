<script setup lang="ts">
// History - 历史记录占位（L5 实现）
</script>

<template>
  <section class="placeholder">
    <div class="ph-card glass-card">
      <h2 class="ph-title">历史记录</h2>
      <p class="ph-desc text-secondary">
        分页卡片、按题型筛选、总正确率、清除记录将在 L5 实现。
      </p>
      <p class="ph-tag">L0 · 占位</p>
    </div>
  </section>
</template>

<style scoped lang="scss">
.placeholder { max-width: 720px; margin: 0 auto; }
.ph-card { padding: 32px; }
.ph-title { font-size: 24px; color: var(--app-text-bright); margin: 0 0 12px; }
.ph-desc { margin: 0 0 16px; font-size: 14px; }
.ph-tag { font-size: 11px; color: var(--app-color-primary); margin: 0; }
</style>
