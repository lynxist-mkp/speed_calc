<script setup lang="ts">
import Katex from '@/components/Katex.vue'

interface Props {
  leftTex: string
  rightTex: string
  selected: '>' | '<' | null
  context?: string
  standardText?: string | null
}

defineProps<Props>()
</script>

<template>
  <div class="compare-question">
    <div class="compare-row">
      <div class="compare-side">
        <Katex :tex="leftTex" />
      </div>
      <div
        class="compare-symbol"
        :class="{
          'selected-gt': selected === '>',
          'selected-lt': selected === '<',
        }"
      >
        <span v-if="selected === null">?</span>
        <span v-else>{{ selected }}</span>
      </div>
      <div class="compare-side">
        <Katex :tex="rightTex" />
      </div>
    </div>
    <div v-if="context" class="compare-context">{{ context }}</div>
    <div class="compare-tolerance">允许误差范围: 精确判分</div>
    <div v-if="standardText" class="compare-standard">{{ standardText }}</div>
  </div>
</template>

<style scoped lang="scss">
.compare-question {
  padding: 24px 16px;
  text-align: center;
}

.compare-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-bottom: 16px;
}

.compare-side {
  flex: 1;
  display: flex;
  justify-content: center;
  font-size: 20px;
  color: var(--app-text-primary, #93a1a1);
}

.compare-symbol {
  font-size: 36px;
  font-weight: 700;
  color: #5faf6f; // Solarized green

  &.selected-gt {
    color: #5faf6f;
  }
  &.selected-lt {
    color: #d33682; // Solarized magenta
  }
}

.compare-context {
  margin-top: 8px;
  font-size: 13px;
  color: var(--app-text-secondary, #586e75);
}

.compare-tolerance {
  margin-top: 4px;
  font-size: 13px;
  color: var(--app-text-secondary, #586e75);
}

.compare-standard {
  margin-top: 4px;
  font-size: 13px;
  color: var(--app-color-primary, #5faf6f);
}
</style>
