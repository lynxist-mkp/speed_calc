<script setup lang="ts">
interface Props {
  selected: ">" | "<" | null;
}
defineProps<Props>();

defineEmits<{
  select: [choice: ">" | "<"];
  submit: [];
  restart: [];
}>();
</script>

<template>
  <div class="compare-keypad">
    <button
      data-testid="btn-gt"
      class="ck-btn gt-btn"
      :class="{ active: selected === '>' }"
      @click="$emit('select', '>')"
    >大于</button>
    <button
      data-testid="btn-lt"
      class="ck-btn lt-btn"
      :class="{ active: selected === '<' }"
      @click="$emit('select', '<')"
    >小于</button>
    <button
      data-testid="btn-restart"
      class="ck-btn restart-btn"
      @click="$emit('restart')"
    >重开</button>
    <button
      data-testid="btn-submit"
      class="ck-btn submit-btn"
      :disabled="selected === null"
      @click="$emit('submit')"
    >确定</button>
  </div>
</template>

<style scoped lang="scss">
.compare-keypad {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 16px;
  max-width: 720px;
  margin: 0 auto;
}

.ck-btn {
  padding: 24px 12px;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.gt-btn {
  background: rgba(95, 175, 111, 0.2);
  color: #5faf6f;
  &.active {
    background: #5faf6f;
    color: #fff;
  }
}

.lt-btn {
  background: rgba(211, 54, 130, 0.2);
  color: #d33682;
  &.active {
    background: #d33682;
    color: #fff;
  }
}

.restart-btn {
  background: rgba(42, 161, 152, 0.2);
  color: #2aa198;
}

.submit-btn {
  background: rgba(88, 110, 117, 0.3);
  color: var(--app-text-primary, #93a1a1);
  &:not(:disabled):hover {
    background: rgba(88, 110, 117, 0.5);
  }
}
</style>
