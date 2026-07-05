<script setup lang="ts">
// 设置行组件 - label + slot + 可选展开区
// 用于 PracticeSettings/DataAnalysisSettings 替换 row+el-dialog
interface Props {
  label: string
  expandable?: boolean
  expanded?: boolean
}
withDefaults(defineProps<Props>(), {
  expandable: false,
  expanded: false,
})
</script>

<template>
  <div class="setting-row">
    <div class="setting-label">{{ label }}</div>
    <div class="setting-content">
      <slot />
    </div>
    <div v-if="expandable && expanded" class="expand-area">
      <slot name="expand" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.setting-row {
  margin-bottom: 12px;
}

.setting-label {
  font-size: 11px;
  color: var(--app-text-primary);
  margin-bottom: 6px;
}

.setting-content {
  /* slot 内容自带样式 */
}

.expand-area {
  background: var(--expand-bg);
  border: 1px solid var(--expand-border);
  border-radius: 6px;
  padding: 10px;
  margin-top: 4px;
}
</style>
