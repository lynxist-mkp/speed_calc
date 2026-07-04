<script setup lang="ts">
// 数字键盘 - 可拖拽浮窗，icon-only 手柄，内联重开，边界 clamp
import { ref, onMounted } from "vue";

interface Props {
  variant?: "basic" | "data";
  layout?: "normal" | "reverse" | "shuffle";
}
const props = withDefaults(defineProps<Props>(), {
  variant: "basic",
  layout: "normal",
});
const emit = defineEmits<{
  input: [char: string];
  submit: [];
  clear: [];
  backspace: [];
  restart: [];
  "toggle-sign": [];
}>();

// 拖拽状态
const posX = ref(0);
const posY = ref(0);
const scale = ref(1);
const dragging = ref(false);
let dragStartX = 0;
let dragStartY = 0;
let dragStartPosX = 0;
let dragStartPosY = 0;
let dragStartScale = 1;
let dragAxis: "h" | "v" | null = null;

// 视口边界 clamp 用：numpad 容器实际尺寸
const containerEl = ref<HTMLElement | null>(null);

const DEFAULT_POS_X = 0;
const DEFAULT_POS_Y = 0;
const DEFAULT_SCALE = 1;
const MIN_SCALE = 0.7;
const MAX_SCALE = 1.5;
const VIEWPORT_MARGIN = 12; // px，距视口边距

function loadPersistedState() {
  try {
    const pX = localStorage.getItem("numpad:posX");
    const pY = localStorage.getItem("numpad:posY");
    const sc = localStorage.getItem("numpad:scale");
    if (pX !== null) posX.value = Number(pX);
    if (pY !== null) posY.value = Number(pY);
    if (sc !== null) scale.value = Number(sc);
  } catch {
    // localStorage 不可用，用默认
  }
}

function persistState() {
  try {
    localStorage.setItem("numpad:posX", String(posX.value));
    localStorage.setItem("numpad:posY", String(posY.value));
    localStorage.setItem("numpad:scale", String(scale.value));
  } catch {
    // 忽略
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// 计算 clamp 范围（基于父容器与 numpad 实际尺寸）
function getClampBounds() {
  const parent = containerEl.value?.parentElement;
  if (!parent || !containerEl.value) {
    return { minX: -1000, maxX: 1000, minY: -1000, maxY: 1000 };
  }
  const parentRect = parent.getBoundingClientRect();
  const selfRect = containerEl.value.getBoundingClientRect();
  // 实际显示尺寸 = selfRect * scale
  const scaledW = selfRect.width * scale.value;
  const scaledH = selfRect.height * scale.value;
  // Numpad 默认布局在父容器右下（由父容器 flex/position 决定），translate(0,0) 即默认位置
  // clamp 范围：让 numpad 不超出父容器
  const maxX = Math.max(0, parentRect.width - scaledW - VIEWPORT_MARGIN);
  const maxY = Math.max(0, parentRect.height - scaledH - VIEWPORT_MARGIN);
  return {
    minX: -scaledW + VIEWPORT_MARGIN, // 允许向左拖到只剩 margin 宽度可见
    maxX,
    minY: -scaledH + VIEWPORT_MARGIN,
    maxY,
  };
}

function onPointerDown(e: PointerEvent) {
  dragging.value = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragStartPosX = posX.value;
  dragStartPosY = posY.value;
  dragStartScale = scale.value;
  dragAxis = null;
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return;
  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;
  if (dragAxis === null && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
    dragAxis = Math.abs(dy) > Math.abs(dx) ? "v" : "h";
  }
  const bounds = getClampBounds();
  if (dragAxis === "v") {
    const newScale = dragStartScale + dy / 200;
    scale.value = clamp(newScale, MIN_SCALE, MAX_SCALE);
  } else if (dragAxis === "h") {
    posX.value = clamp(dragStartPosX + dx, bounds.minX, bounds.maxX);
    posY.value = clamp(dragStartPosY + dy, bounds.minY, bounds.maxY);
  }
}

function onPointerUp() {
  if (dragging.value) {
    dragging.value = false;
    persistState();
  }
}

function onDoubleClick() {
  posX.value = DEFAULT_POS_X;
  posY.value = DEFAULT_POS_Y;
  scale.value = DEFAULT_SCALE;
  persistState();
}

onMounted(loadPersistedState);

const numberKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

function onKey(key: string) {
  if (key === "submit") emit("submit");
  else if (key === "clear") emit("clear");
  else if (key === "backspace") emit("backspace");
  else if (key === "restart") emit("restart");
  else if (key === "sign") emit("toggle-sign");
  else emit("input", key);
}
</script>

<template>
  <div
    ref="containerEl"
    class="numpad-container glass-card"
    :style="{
      transform: `translate(${posX}px, ${posY}px) scale(${scale})`,
    }"
  >
    <!-- 手柄：icon-only + 内联重开按钮 -->
    <div
      data-handle="drag"
      class="drag-handle"
      title="拖动移动 · 双击复位"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @dblclick="onDoubleClick"
    >
      <span class="handle-icon" aria-hidden="true">⋮⋮</span>
      <!-- basic variant 重开按钮内联到手柄右侧 -->
      <button
        v-if="props.variant === 'basic'"
        data-key="restart"
        class="handle-restart"
        aria-label="重开"
        @click.stop="onKey('restart')"
      >
        重开
      </button>
    </div>

    <!-- 键盘网格 3列5行 -->
    <div class="keypad-grid">
      <!-- 行1：±/清空/退格（basic）或 重开/清空/退格（data）-->
      <template v-if="props.variant === 'basic'">
        <button
          data-key="sign"
          class="key-cell glass-button"
          aria-label="切换正负号"
          @click="onKey('sign')"
        >
          ±
        </button>
      </template>
      <template v-else>
        <button
          data-key="restart"
          class="key-cell glass-button"
          aria-label="重开"
          @click="onKey('restart')"
        >
          重开
        </button>
      </template>
      <button
        data-key="clear"
        class="key-cell glass-button"
        aria-label="清空"
        @click="onKey('clear')"
      >
        清空
      </button>
      <button
        data-key="backspace"
        class="key-cell glass-button"
        aria-label="退格"
        @click="onKey('backspace')"
      >
        退格
      </button>

      <!-- 行2-4：1-9 -->
      <button
        v-for="k in numberKeys"
        :key="k"
        :data-key="k"
        class="key-cell glass-button"
        :aria-label="k"
        @click="onKey(k)"
      >
        {{ k }}
      </button>

      <!-- 行5：./0/确定 -->
      <button
        data-key="."
        class="key-cell glass-button"
        aria-label="小数点"
        @click="onKey('.')"
      >
        .
      </button>
      <button
        data-key="0"
        class="key-cell glass-button"
        aria-label="0"
        @click="onKey('0')"
      >
        0
      </button>
      <button
        data-key="submit"
        class="key-cell key-submit"
        aria-label="提交"
        @click="onKey('submit')"
      >
        确定
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.numpad-container {
  display: inline-block;
  padding: 12px;
  border-radius: var(--app-radius-card);
  user-select: none;
  position: relative;
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  cursor: grab;
  font-size: 12px;
  color: var(--app-text-secondary);
  border-radius: 8px;

  &:active {
    cursor: grabbing;
  }
}

.handle-icon {
  font-size: 14px;
  letter-spacing: 1px;
}

.handle-restart {
  background: rgba(42, 161, 152, 0.3);
  color: var(--app-color-info);
  border: 1px solid rgba(42, 161, 152, 0.4);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 10px;
  cursor: pointer;

  &:hover {
    background: rgba(42, 161, 152, 0.5);
  }
}

.keypad-grid {
  display: grid;
  grid-template-columns: repeat(3, 64px);
  grid-auto-rows: 56px;
  gap: 8px;
}

.key-cell {
  border: 1px solid var(--app-glass-border);
  border-radius: 8px;
  background: var(--key-bg);
  color: var(--key-text);
  font-size: 20px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, transform 0.05s;

  &:hover {
    background: var(--key-bg-hover);
  }
  &:active {
    transform: scale(0.96);
  }
}

.key-submit {
  background: var(--key-submit-bg);
  color: #fff;

  &:hover {
    background: rgba(95, 175, 111, 0.95);
  }
}
</style>
