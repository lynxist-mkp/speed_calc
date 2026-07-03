<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { usePracticeStore } from "@/stores/practice";
import type { CompareType } from "@/generators/compareAnalysis";

const router = useRouter();
const store = usePracticeStore();

// 9 题型（computation-area.md §2.1 + levels.md L2）
const questionTypes: { label: string; type: string }[] = [
  { label: "估算前期量", type: "estimate_prev" },
  { label: "估算增长量", type: "estimate_growth" },
  { label: "百化分", type: "baihua_frac" },
  { label: "百化分反向", type: "baihua_frac_rev" },
  { label: "分数计算(＜)", type: "frac_calc_lt" },
  { label: "分数计算(＞)", type: "frac_calc_gt" },
  { label: "年均增长率", type: "annual_growth_rate" },
  { label: "基期比重", type: "base_period_ratio" },
  { label: "年平均量", type: "annual_avg" },
];

const compareTypes: { label: string; type: CompareType }[] = [
  { label: "增量比大小", type: "compare_growth" },
  { label: "基期比大小", type: "compare_base" },
  { label: "分数比大小", type: "compare_frac" },
];
const selectedCompareType = ref(0);
const activeTab = ref<"fill" | "compare">("fill");

const selectedType = ref(0);

// 题量：资料分析原版 5/10/15/20/25/自定义5-100
const countOptions = [5, 10, 15, 20, 25];
const selectedCount = ref(10);
const customCount = ref(10);
const isCustom = ref(false);
const dialogVisible = ref(false);

let savedCount = 10;
let savedIsCustom = false;

function openDialog() {
  savedCount = selectedCount.value;
  savedIsCustom = isCustom.value;
  dialogVisible.value = true;
}

function cancelDialog() {
  selectedCount.value = savedCount;
  isCustom.value = savedIsCustom;
  dialogVisible.value = false;
}

function selectPreset(n: number) {
  selectedCount.value = n;
  isCustom.value = false;
  dialogVisible.value = false;
}

function confirmCustom() {
  selectedCount.value = Math.max(5, Math.min(100, customCount.value));
  isCustom.value = true;
  dialogVisible.value = false;
}

async function startPractice() {
  const t = questionTypes[selectedType.value];
  await store.init({
    type: t.type,
    subtype: t.label,
    count: selectedCount.value,
  });
  if (store.phase === "running") {
    router.push("/practice/session");
  } else {
    ElMessage.error(store.error ?? "练习初始化失败");
  }
}

async function startCompare() {
  const t = compareTypes[selectedCompareType.value];
  await store.init({
    type: t.type,
    subtype: t.label,
    count: selectedCount.value,
  });
  if (store.phase === "running") {
    router.push("/practice/session");
  } else {
    ElMessage.error(store.error ?? "练习初始化失败");
  }
}

function startComposite() {
  router.push("/practice/composite");
}

function goHistory() {
  router.push("/history");
}
</script>

<template>
  <div class="da-settings">
    <h2 class="title">资料分析</h2>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="填空题" name="fill">
        <!-- 题型网格 3x3 -->
        <div class="type-grid">
          <button
            v-for="(t, i) in questionTypes"
            :key="t.type"
            class="type-cell"
            :class="{ selected: i === selectedType }"
            @click="selectedType = i"
          >{{ t.label }}</button>
        </div>

        <!-- 题量行 -->
        <div class="row" @click="openDialog">
          <span class="label">题量</span>
          <span class="value">{{ selectedCount }} 题 ›</span>
        </div>

        <!-- 主按钮 -->
        <button class="start-btn" @click="startPractice">开始练习</button>
        <button class="bottom-btn" @click="goHistory">历史记录</button>
      </el-tab-pane>

      <el-tab-pane label="比较题" name="compare">
        <div class="type-grid">
          <button
            v-for="(t, i) in compareTypes"
            :key="t.type"
            class="type-cell"
            :class="{ selected: i === selectedCompareType }"
            @click="selectedCompareType = i"
          >{{ t.label }}</button>
        </div>

        <div class="row" @click="openDialog">
          <span class="label">题量</span>
          <span class="value">{{ selectedCount }} 题 ›</span>
        </div>

        <button class="start-btn" @click="startCompare">开始练习</button>
      </el-tab-pane>
    </el-tabs>

    <!-- 一表通算独立区块 -->
    <div class="composite-block">
      <h3 class="section-title">一表通算</h3>
      <button class="start-btn" @click="startComposite">开始练习</button>
    </div>

    <!-- 题量弹窗（复用） -->
    <el-dialog v-model="dialogVisible" title="选择题量" width="320px">
      <div class="count-grid">
        <button
          v-for="n in countOptions"
          :key="n"
          class="count-opt"
          :class="{ active: !isCustom && selectedCount === n }"
          @click="selectPreset(n)"
        >{{ n }} 题</button>
        <div class="count-custom" :class="{ active: isCustom }">
          <div>自定义</div>
          <el-slider v-model="customCount" :min="5" :max="100" :step="1" />
          <div>{{ customCount }} 题</div>
          <el-button type="primary" size="small" @click="confirmCustom">确定</el-button>
        </div>
      </div>
      <template #footer>
        <el-button @click="cancelDialog">取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.da-settings {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px;
}

.title {
  color: var(--app-text-primary, #93a1a1);
  margin-bottom: 16px;
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

.start-btn {
  width: 100%;
  padding: 14px;
  margin: 16px 0 12px;
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

.bottom-btn {
  width: 100%;
  padding: 10px;
  background: var(--app-bg-surface, #073642);
  color: var(--app-text-primary, #93a1a1);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;
}

.count-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  &.active {
    border-color: var(--app-color-primary, #5faf6f);
  }
}

.composite-block {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.section-title {
  color: var(--app-text-primary, #93a1a1);
  font-size: 16px;
  margin-bottom: 12px;
}
</style>
