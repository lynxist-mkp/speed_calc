<script setup lang="ts">
// 键盘输入指引模态弹窗：视觉化展示右手主键盘区 → 财务小键盘映射
import { computed, watch, onBeforeUnmount } from "vue";
import type { KeyboardLayout } from "@/utils/keymap";

interface Props {
  visible: boolean;
  layout?: KeyboardLayout;
}
const props = withDefaults(defineProps<Props>(), {
  layout: "qwerty",
});
const emit = defineEmits<{
  close: [];
  "go-settings": [];
}>();

// 物理键帽标签统一按标准 QWERTY 显示（物理键盘本身就是 QWERTY 标签，映射按物理位置）
const keyRows = [
  { num: "7", key: "U" }, { num: "8", key: "I" }, { num: "9", key: "O" },
  { num: "4", key: "J" }, { num: "5", key: "K" }, { num: "6", key: "L" },
  { num: "1", key: "M" }, { num: "2", key: "," }, { num: "3", key: "." },
];

// 仅 QWERTY 模式下提示 Norman 用户去设置切换
const showNormanHint = computed(() => props.layout === "qwerty");

// 模态打开时拦截 Esc/Enter，避免冒泡到练习页触发重开/提交
function onKeydownCapture(e: KeyboardEvent) {
  if (!props.visible) return;
  if (e.code === "Escape" || e.code === "Enter") {
    e.stopPropagation();
    e.preventDefault();
    emit("close");
  }
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      window.addEventListener("keydown", onKeydownCapture, true);
    } else {
      window.removeEventListener("keydown", onKeydownCapture, true);
    }
  }
);

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydownCapture, true);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="kgm-overlay" @click="emit('close')">
      <div
        class="kgm-modal glass-card"
        role="dialog"
        aria-modal="true"
        aria-label="键盘输入指引"
        @click.stop
      >
        <button class="kgm-close" aria-label="关闭" @click="emit('close')">×</button>

        <h2 class="kgm-title">键盘输入指引</h2>
        <p class="kgm-subtitle">右手主键盘区 = 财务小键盘，无需鼠标即可快速输入</p>

        <!-- 视觉键盘图：3 列 4 行 -->
        <div class="kgm-keyboard" aria-hidden="true">
          <div v-for="row in [0, 1, 2]" :key="row" class="kgm-row">
            <div
              v-for="cell in keyRows.slice(row * 3, row * 3 + 3)"
              :key="cell.num"
              class="kgm-key"
            >
              <span class="kgm-key-num">{{ cell.num }}</span>
              <span class="kgm-key-phys">{{ cell.key }}</span>
            </div>
          </div>
          <div class="kgm-row">
            <div class="kgm-key">
              <span class="kgm-key-num">.</span>
              <span class="kgm-key-phys">/</span>
            </div>
            <div class="kgm-key">
              <span class="kgm-key-num">0</span>
              <span class="kgm-key-phys">Space</span>
            </div>
            <div class="kgm-key kgm-key-submit">
              <span class="kgm-key-num">↵</span>
              <span class="kgm-key-phys">Enter</span>
            </div>
          </div>
        </div>

        <!-- 功能键 -->
        <section class="kgm-section">
          <h3 class="kgm-section-title">功能键</h3>
          <div class="kgm-func-grid">
            <div class="kgm-func"><kbd>⌫</kbd>退格</div>
            <div class="kgm-func"><kbd>↵</kbd>提交</div>
            <div class="kgm-func"><kbd>Esc</kbd>重开</div>
            <div class="kgm-func"><kbd>Del</kbd>清空</div>
            <div class="kgm-func"><kbd>−</kbd>切换正负号</div>
          </div>
        </section>

        <!-- 比较题 -->
        <section class="kgm-section">
          <h3 class="kgm-section-title">比较题</h3>
          <div class="kgm-compare">
            <div class="kgm-func"><kbd>,</kbd> → ＜</div>
            <div class="kgm-func"><kbd>.</kbd> → ＞</div>
          </div>
        </section>

        <!-- Norman 提示条（仅 QWERTY 模式显示） -->
        <button
          v-if="showNormanHint"
          class="kgm-norman-hint"
          @click="emit('go-settings')"
        >
          <span class="kgm-hint-icon">ⓘ</span>
          <span>使用 Norman 布局？前往设置切换键盘布局</span>
          <span class="kgm-hint-arrow">→</span>
        </button>

        <button class="kgm-ok-btn" @click="emit('close')">我知道了</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.kgm-overlay {
  position: fixed;
  inset: 0;
  background: var(--app-bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.kgm-modal {
  position: relative;
  width: 440px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  padding: 24px 24px 20px;
  border-radius: var(--app-radius-card);
  background: var(--app-bg-elevated);
}

.kgm-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--app-text-secondary);
  font-size: 20px;
  cursor: pointer;
  line-height: 1;
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--app-text-bright);
  }
}

.kgm-title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 700;
  color: var(--app-text-bright);
}

.kgm-subtitle {
  margin: 0 0 18px;
  font-size: 12px;
  color: var(--app-text-secondary);
}

// 视觉键盘图
.kgm-keyboard {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background: rgba(0, 43, 54, 0.5);
  border-radius: 10px;
  margin-bottom: 18px;
}

.kgm-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.kgm-key {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 8px;
  background: var(--key-bg);
  border: 1px solid var(--app-glass-border);
  min-height: 50px;
}

.kgm-key-num {
  font-size: 18px;
  font-weight: 700;
  color: var(--app-color-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.kgm-key-phys {
  font-size: 10px;
  color: var(--app-text-secondary);
  line-height: 1;
}

.kgm-key-submit {
  background: var(--key-submit-bg);
  .kgm-key-num,
  .kgm-key-phys {
    color: #fff;
  }
}

.kgm-section {
  margin-bottom: 14px;
}

.kgm-section-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-bright);
}

.kgm-func-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.kgm-func {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--app-text-primary);

  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    padding: 2px 6px;
    background: var(--key-bg);
    border: 1px solid var(--app-glass-border);
    border-radius: 4px;
    font-family: var(--app-font-mono);
    font-size: 11px;
    color: var(--app-text-bright);
  }
}

.kgm-compare {
  display: flex;
  gap: 16px;
}

.kgm-norman-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-bottom: 14px;
  padding: 10px 12px;
  border: none;
  border-left: 3px solid var(--app-color-warning);
  border-radius: 4px;
  background: rgba(181, 137, 0, 0.12);
  color: var(--app-text-primary);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
  &:hover {
    background: rgba(181, 137, 0, 0.2);
  }
}

.kgm-hint-icon {
  color: var(--app-color-warning);
  font-size: 14px;
}

.kgm-hint-arrow {
  margin-left: auto;
  color: var(--app-color-warning);
}

.kgm-ok-btn {
  display: block;
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: var(--app-radius-button);
  background: var(--app-color-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: var(--app-color-primary-hover);
  }
}

@media (prefers-reduced-motion: reduce) {
  .kgm-overlay {
    backdrop-filter: none;
  }
}
</style>
