<script setup lang="ts">
// Settings - 设置页占位（L4 实现）
</script>

<template>
  <section class="placeholder">
    <div class="ph-card glass-card">
      <h2 class="ph-title">设置</h2>
      <p class="ph-desc text-secondary">
        题型/题量/难度选择、自定义运算、N-back、时间标准编辑将在 L4 实现。
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
