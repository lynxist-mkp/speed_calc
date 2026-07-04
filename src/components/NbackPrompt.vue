<script setup lang="ts">
import { ref, watch } from "vue";

interface Props {
  visible: boolean;
  targetIndex: number;
}
const props = defineProps<Props>();
const emit = defineEmits<{
  "update:visible": [v: boolean];
  submit: [answer: string];
  skip: [];
}>();

const answer = ref("");

watch(
  () => props.visible,
  (v) => {
    if (v) answer.value = "";
  },
);

function onSubmit() {
  if (answer.value.trim() === "") return;
  emit("submit", answer.value);
  emit("update:visible", false);
}

function onSkip() {
  emit("skip");
  emit("update:visible", false);
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="emit('update:visible', $event)"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    title="N-back 回忆"
    width="320px"
  >
    <p class="prompt-text">第 {{ targetIndex + 1 }} 题的答案是？</p>
    <input
      data-testid="nback-input"
      v-model="answer"
      class="nback-input"
      type="text"
      inputmode="decimal"
      @keyup.enter="onSubmit"
      autofocus
    />
    <template #footer>
      <button data-testid="nback-skip" class="nback-skip-btn" @click="onSkip">跳过（计错）</button>
      <button data-testid="nback-submit" class="nback-submit-btn" :disabled="!answer.trim()" @click="onSubmit">确定</button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.prompt-text {
  color: var(--app-text-primary, #93a1a1);
  text-align: center;
  margin: 12px 0;
  font-size: 16px;
}
.nback-input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--app-glass-border, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  background: var(--app-bg-surface, #073642);
  color: var(--app-text-bright, #fdf6e3);
  font-size: 18px;
  text-align: center;
  &:focus {
    outline: none;
    border-color: var(--app-color-primary, #5faf6f);
  }
}
.nback-skip-btn {
  padding: 8px 16px;
  background: var(--app-bg-surface, #073642);
  color: var(--app-text-primary, #93a1a1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  cursor: pointer;
  margin-right: 8px;
}
.nback-submit-btn {
  padding: 8px 16px;
  background: var(--app-color-primary, #5faf6f);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
