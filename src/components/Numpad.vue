<script setup lang="ts">
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

const DEFAULT_POS_X = 0;
const DEFAULT_POS_Y = 0;
const DEFAULT_SCALE = 1;
const MIN_SCALE = 0.7;
const MAX_SCALE = 1.5;

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

function onPointerDown(e: PointerEvent) {
  dragging.value = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragStartPosX = posX.value;
  dragStartPosY = posY.value;
  dragStartScale = scale.value;
  // 判断方向：首次移动时定
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
  if (dragAxis === "v") {
    // 垂直拖动调高度（scale）
    const newScale = dragStartScale + dy / 200;
    scale.value = clamp(newScale, MIN_SCALE, MAX_SCALE);
  } else if (dragAxis === "h") {
    // 水平拖动调位置
    posX.value = dragStartPosX + dx;
    posY.value = dragStartPosY + dy;
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

// 数字键布局（正序）
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
    class="numpad-container glass-card"
    :style="{
      transform: `translate(${posX}px, ${posY}px) scale(${scale})`,
    }"
  >
    <!-- 拖拽手柄 -->
    <div
      data-handle="drag"
      class="drag-handle"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @dblclick="onDoubleClick"
    >
      <span class="handle-icon">⠿</span>
      <span class="drag-hint">上下拖调大小 左右拖调位置 双击恢复</span>
    </div>

    <!-- 重开独立粉色圆形按钮 -->
    <button
      v-if="props.variant === 'basic'"
      data-key="restart"
      class="key-restart glass-button"
      @click="onKey('restart')"
    >
      重开
    </button>

    <!-- 键盘网格 3列5行 -->
    <div class="keypad-grid">
      <!-- 行1：±/清空/退格（basic）或 重开/清空/退格（data）-->
      <template v-if="props.variant === 'basic'">
        <button data-key="sign" class="key-cell glass-button" @click="onKey('sign')">±</button>
      </template>
      <template v-else>
        <button data-key="restart" class="key-cell glass-button" @click="onKey('restart')">重开</button>
      </template>
      <button data-key="clear" class="key-cell glass-button" @click="onKey('clear')">清空</button>
      <button data-key="backspace" class="key-cell glass-button" @click="onKey('backspace')">退格</button>

      <!-- 行2-4：1-9 -->
      <button
        v-for="k in numberKeys"
        :key="k"
        :data-key="k"
        class="key-cell glass-button"
        @click="onKey(k)"
      >
        {{ k }}
      </button>

      <!-- 行5：./0/确定 -->
      <button data-key="." class="key-cell glass-button" @click="onKey('.')">.</button>
      <button data-key="0" class="key-cell glass-button" @click="onKey('0')">0</button>
      <button data-key="submit" class="key-cell key-submit" @click="onKey('submit')">确定</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.numpad-container {
  display: inline-block;
  padding: 12px;
  border-radius: var(--app-radius-card, 12px);
  user-select: none;
  position: relative;
}

.drag-handle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  cursor: grab;
  font-size: 12px;
  color: var(--app-text-secondary, #9ba89b);
  border-radius: 8px;
  &:active {
    cursor: grabbing;
  }
}

.handle-icon {
  font-size: 16px;
}

.drag-hint {
  flex: 1;
}

.key-restart {
  position: absolute;
  top: -28px;
  right: 12px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 110, 140, 0.85);
  color: #fff;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(255, 110, 140, 0.4);
  &:hover {
    background: rgba(255, 110, 140, 0.95);
  }
}

.keypad-grid {
  display: grid;
  grid-template-columns: repeat(3, 64px);
  grid-auto-rows: 56px;
  gap: 8px;
}

.key-cell {
  border: 1px solid var(--app-glass-border, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--app-text-primary, #e8ece8);
  font-size: 20px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, transform 0.05s;
  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
  &:active {
    transform: scale(0.96);
  }
}

.key-submit {
  background: rgba(95, 175, 111, 0.85);
  color: #fff;
  &:hover {
    background: rgba(95, 175, 111, 0.95);
  }
}
</style>
