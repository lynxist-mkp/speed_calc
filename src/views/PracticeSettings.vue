<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { usePracticeStore } from "@/stores/practice";

const router = useRouter();
const store = usePracticeStore();

// 18 题型网格（original-app.md 实证）
const questionTypes = [
  "两位数加减", "凑整百练习", "三位数加法",
  "三位数减法", "三位数加减", "多数相加",
  "混合加减", "两位数乘一位数", "三位数乘一位数",
  "两位数乘11", "两位数乘15", "两位数乘两位数",
  "三位数除一位数", "三位数除两位数", "乘法估算",
  "五位数除三位数", "三位数除四位数", "自定义",
];
const SELECTED_INDEX = 0; // 默认选中"两位数加减"
const selectedType = ref(0);

// 题量弹窗
const countDialogVisible = ref(false);
const countMode = ref<"quick" | "normal" | "custom">("quick");
const customCount = ref(10);
const currentCount = ref(10);

const modeLabel = computed(() => {
  if (countMode.value === "quick") return "快速";
  if (countMode.value === "normal") return "正常";
  return "自定义";
});

let savedCount = 10;
let savedMode: "quick" | "normal" | "custom" = "quick";

function openCountDialog() {
  savedCount = currentCount.value;
  savedMode = countMode.value;
  countDialogVisible.value = true;
}

function cancelCount() {
  currentCount.value = savedCount;
  countMode.value = savedMode;
  countDialogVisible.value = false;
}

function selectCountMode(mode: "quick" | "normal" | "custom") {
  countMode.value = mode;
  if (mode === "quick") currentCount.value = 10;
  if (mode === "normal") currentCount.value = 15;
}

function confirmCount() {
  if (countMode.value === "custom") {
    currentCount.value = clamp(customCount.value, 5, 100);
  }
  countDialogVisible.value = false;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function onTypeClick(index: number) {
  if (index === SELECTED_INDEX) {
    selectedType.value = index;
    return;
  }
  if (questionTypes[index] === "自定义") {
    ElMessage.info("自定义运算待 L4 实现");
    return;
  }
  ElMessage.info(`${questionTypes[index]} 待 L4 实现`);
}

function onPlaceholderClick(feature: string) {
  ElMessage.info(`${feature} 待 L4 实现`);
}

async function startPractice() {
  await store.init({
    type: "basic_addsub",
    subtype: "两位数加减",
    count: currentCount.value,
  });
  if (store.phase === "running") {
    router.push("/practice/session");
  } else {
    ElMessage.error(store.error ?? "练习初始化失败");
  }
}

function goHistory() {
  router.push("/history");
}
</script>

<template>
  <div class="practice-settings">
    <!-- 键盘布局开关 -->
    <div class="row">
      <span class="label">键盘布局</span>
      <el-radio-group :model-value="'normal'" @click="onPlaceholderClick('键盘布局倒序/乱序')">
        <el-radio-button value="normal">正序</el-radio-button>
        <el-radio-button value="reverse">倒序</el-radio-button>
        <el-radio-button value="shuffle">乱序</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 触控笔开关 -->
    <div class="row">
      <span class="label">触控笔</span>
      <el-switch :model-value="false" @click="onPlaceholderClick('触控笔')" />
    </div>

    <!-- 题型网格 6x3 -->
    <div class="type-grid">
      <button
        v-for="(t, i) in questionTypes"
        :key="t"
        class="type-cell"
        :class="{ selected: i === selectedType }"
        @click="onTypeClick(i)"
      >
        {{ t }}
      </button>
    </div>

    <!-- 题量 -->
    <div class="row" @click="openCountDialog">
      <span class="label">题量</span>
      <span class="value">{{ modeLabel }}({{ currentCount }}题) ›</span>
    </div>

    <!-- N-back 角标 -->
    <div class="row" @click="onPlaceholderClick('N-back')">
      <span class="label">N-back</span>
      <span class="value">关闭 ›</span>
    </div>

    <!-- 主按钮 -->
    <button class="start-btn" @click="startPractice">开始练习</button>

    <!-- 底部 -->
    <div class="bottom-row">
      <button class="bottom-btn" @click="onPlaceholderClick('导出题目')">导出题目</button>
      <button class="bottom-btn" @click="goHistory">历史记录</button>
    </div>

    <!-- FAB -->
    <button class="fab" @click="onPlaceholderClick('自定义新增')">+</button>

    <!-- 题量弹窗 -->
    <el-dialog v-model="countDialogVisible" title="选择题量" width="320px">
      <div class="count-options">
        <button
          class="count-opt"
          :class="{ active: countMode === 'quick' }"
          @click="selectCountMode('quick')"
        >快速 10 题</button>
        <button
          class="count-opt"
          :class="{ active: countMode === 'normal' }"
          @click="selectCountMode('normal')"
        >正常 15 题</button>
        <div class="count-custom" :class="{ active: countMode === 'custom' }" @click="selectCountMode('custom')">
          <div>自定义</div>
          <el-slider v-model="customCount" :min="5" :max="100" :step="1" />
          <div>{{ customCount }} 题</div>
        </div>
      </div>
      <template #footer>
        <el-button @click="cancelCount">取消</el-button>
        <el-button type="primary" @click="confirmCount">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.practice-settings {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  margin-bottom: 12px;
  background: var(--app-bg-surface, #073642);
  border-radius: 10px;
  cursor: pointer;
}

.label {
  color: var(--app-text-primary, #93a1a1);
}

.value {
  color: var(--app-text-secondary, #586e75);
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.type-cell {
  padding: 14px 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(133, 200, 142, 0.15);
  color: var(--app-text-primary, #93a1a1);
  font-size: 14px;
  cursor: pointer;
  &.selected {
    background: rgba(46, 80, 56, 0.9);
    color: #fff;
    border-color: var(--app-color-primary, #5faf6f);
  }
  &:hover {
    background: rgba(133, 200, 142, 0.25);
  }
}

.start-btn {
  width: 100%;
  padding: 14px;
  margin: 16px 0;
  background: var(--app-color-primary, #5faf6f);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: #6fbf7f;
  }
}

.bottom-row {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.bottom-btn {
  flex: 1;
  padding: 10px;
  background: var(--app-bg-surface, #073642);
  color: var(--app-text-primary, #93a1a1);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;
}

.fab {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #5b9bfc;
  color: #fff;
  border: none;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(91, 155, 252, 0.4);
}

.count-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.count-opt {
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: var(--app-bg-surface, #073642);
  color: var(--app-text-primary, #93a1a1);
  cursor: pointer;
  &.active {
    border-color: var(--app-color-primary, #5faf6f);
    background: rgba(95, 175, 111, 0.2);
  }
}

.count-custom {
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  &.active {
    border-color: var(--app-color-primary, #5faf6f);
  }
}
</style>
