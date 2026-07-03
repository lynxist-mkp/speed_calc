<script setup lang="ts">
// Practice - 练习页占位（L1+ 实现）
</script>

<template>
  <section class="placeholder">
    <div class="ph-card glass-card">
      <h2 class="ph-title">练习</h2>
      <p class="ph-desc text-secondary">
        答题界面、出题生成器、双输入键盘、计时判分将在 L1 起实现。
      </p>
      <p class="ph-tag">L0 · 占位</p>
    </div>
  </section>
</template>

<style scoped lang="scss">
.placeholder {
  max-width: 720px;
  margin: 0 auto;
}
.ph-card {
  padding: 32px;
}
.ph-title {
  font-size: 24px;
  color: var(--app-text-bright);
  margin: 0 0 12px;
}
.ph-desc {
  margin: 0 0 16px;
  font-size: 14px;
}
.ph-tag {
  font-size: 11px;
  color: var(--app-color-primary);
  margin: 0;
}
</style>
