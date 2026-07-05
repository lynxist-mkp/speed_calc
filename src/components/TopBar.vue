<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title: string
  progress: string
  elapsedMs: number
}
const props = defineProps<Props>()

const elapsedDisplay = computed(() => {
  const totalSec = Math.floor(props.elapsedMs / 1000)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `0:${m}:${s}`
})
</script>

<template>
  <div class="topbar glass-toolbar">
    <div class="topbar-left">
      <slot name="left">
        <button class="back-btn glass-button" aria-label="返回" @click="$emit('back')">‹</button>
      </slot>
    </div>
    <div class="topbar-title">{{ props.title }}</div>
    <div class="topbar-progress">{{ props.progress }}</div>
    <div class="topbar-right">
      <slot name="right" />
    </div>
    <div class="topbar-timer">{{ elapsedDisplay }}</div>
  </div>
</template>

<style scoped lang="scss">
.topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 20px;
  height: 56px;
  font-size: 15px;
  color: var(--app-text-primary, #e8ece8);
}

.back-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: var(--app-text-primary, #e8ece8);
  font-size: 22px;
  cursor: pointer;
  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
}

.topbar-title {
  font-weight: 600;
}

.topbar-progress {
  color: var(--app-text-secondary, #9ba89b);
  font-variant-numeric: tabular-nums;
}

.topbar-right {
  display: flex;
  align-items: center;
}

.topbar-timer {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  color: var(--app-text-secondary, #9ba89b);
}
</style>
