<script setup lang="ts">
// 题型网格组件 - sectioned + selectable
// 用于 PracticeSettings 与 DataAnalysisSettings 共用
interface TypeItem {
  key: string;
  label: string;
  icon?: string;
}
interface Section {
  title: string;
  types: TypeItem[];
}

interface Props {
  sections: Section[];
  modelValue: string;
  disabled?: boolean;
  showTitle?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  showTitle: true,
});
const emit = defineEmits<{
  "update:modelValue": [key: string];
}>();

function select(key: string) {
  if (props.disabled) return;
  emit("update:modelValue", key);
}
</script>

<template>
  <div class="type-grid-container">
    <div v-for="(section, sIdx) in sections" :key="sIdx" class="type-section">
      <div v-if="showTitle" class="section-title">{{ section.title }}</div>
      <div class="type-grid">
        <button
          v-for="t in section.types"
          :key="t.key"
          :data-type-key="t.key"
          class="type-cell"
          :class="{
            selected: modelValue === t.key,
            disabled: disabled,
          }"
          :disabled="disabled"
          @click="select(t.key)"
        >
          {{ t.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.type-grid-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.type-section {
  .section-title {
    font-size: 11px;
    color: var(--app-text-bright);
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--type-section-border);
    display: flex;
    align-items: center;
    gap: 4px;

    &::before {
      content: "";
      width: 3px;
      height: 12px;
      background: var(--app-color-primary);
      border-radius: 2px;
    }
  }
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.type-cell {
  background: var(--type-cell-bg);
  border: 1px solid var(--type-cell-border);
  border-radius: 6px;
  padding: 10px 6px;
  text-align: center;
  font-size: 11px;
  color: var(--app-text-primary);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;

  &:hover:not(.disabled) {
    border-color: var(--type-cell-border-selected);
  }

  &.selected {
    background: var(--type-cell-bg-selected);
    border-color: var(--type-cell-border-selected);
    color: var(--app-text-bright);
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
