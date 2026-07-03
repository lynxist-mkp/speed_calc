<script setup lang="ts">
import { computed } from "vue";
import Katex from "@/components/Katex.vue";

interface Props {
  display: string;
  isData: boolean;
  context?: string;
  hint?: string;
  tolerance?: number;
  unit?: string;
  standardText?: string | null;
  answer: string;
}
const props = defineProps<Props>();

const toleranceText = computed(() =>
  props.tolerance ? `允许误差范围：±${(props.tolerance * 100).toFixed(0)}%` : null
);
</script>

<template>
  <div class="question-area">
    <!-- 基础计算：纯文本 -->
    <div v-if="!isData" class="formula basic">
      <span class="expr">{{ display }}</span>
      <span class="answer-inline">{{ answer }}</span>
      <span class="cursor">|</span>
    </div>
    <!-- 资料分析：KaTeX -->
    <div v-else class="formula data">
      <Katex :tex="display + ' ' + answer" />
      <span class="cursor">|</span>
      <span v-if="unit" class="unit">{{ unit }}</span>
    </div>
    <div v-if="context" class="context">{{ context }}</div>
    <div v-if="toleranceText" class="tolerance">{{ toleranceText }}</div>
    <div v-if="hint" class="hint">{{ hint }}</div>
    <div v-if="standardText" class="standard">{{ standardText }}</div>
  </div>
</template>

<style scoped lang="scss">
.question-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.formula {
  font-size: 40px;
  font-family: "JetBrains Mono", "SF Mono", monospace;
  color: var(--app-text-primary, #93a1a1);
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.answer-inline {
  color: var(--app-color-primary, #5faf6f);
  font-weight: 600;
  min-width: 60px;
  display: inline-block;
  text-align: left;
}

.cursor {
  color: var(--app-color-primary, #5faf6f);
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.context {
  font-size: 15px;
  color: var(--app-text-secondary, #586e75);
}

.tolerance {
  font-size: 14px;
  color: var(--app-text-secondary, #586e75);
}

.hint {
  font-size: 13px;
  color: var(--app-text-secondary, #586e75);
  font-style: italic;
}

.unit {
  font-size: 28px;
  color: var(--app-text-primary, #93a1a1);
}

.standard {
  font-size: 15px;
  color: var(--app-text-secondary, #586e75);
  font-variant-numeric: tabular-nums;
}
</style>
