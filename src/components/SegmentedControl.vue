<script setup lang="ts">
// 分段控件 - 单选 segmented control
// 替换 el-dialog 弹窗，用于难度/题量/N-back 等单选场景
interface Option {
  label: string
  value: string
}

interface Props {
  options: Option[]
  modelValue: string
  disabled?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})
const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function select(value: string) {
  if (props.disabled) return
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="segmented-control" :class="{ disabled }">
    <button
      v-for="(opt, idx) in options"
      :key="opt.value"
      :data-seg-value="opt.value"
      class="seg-btn"
      :class="{
        active: modelValue === opt.value,
        disabled: disabled,
        'last-item': idx === options.length - 1,
      }"
      :disabled="disabled"
      @click="select(opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped lang="scss">
.segmented-control {
  display: flex;
  gap: 0;
  background: var(--seg-bg);
  border: 1px solid var(--seg-border);
  border-radius: 6px;
  overflow: hidden;
}

.seg-btn {
  flex: 1;
  padding: 8px;
  text-align: center;
  font-size: 11px;
  color: var(--app-text-primary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;

  &:not(.last-item) {
    border-right: 1px solid var(--seg-divider);
  }
  &.last-item {
    border-right: none;
  }

  &:hover:not(.disabled) {
    color: var(--app-text-bright);
  }

  &.active {
    background: var(--seg-bg-selected);
    color: var(--app-text-bright);
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
