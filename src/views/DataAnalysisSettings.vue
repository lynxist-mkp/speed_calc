<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { usePracticeStore } from "@/stores/practice";
import { useSettingsStore } from "@/stores/settings";
import type { CompareType } from "@/generators/compareAnalysis";

const router = useRouter();
const store = usePracticeStore();
const settings = useSettingsStore();

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

const countOptions = [5, 10, 15, 20, 25];
const customCount = ref(10);
const dialogVisible = ref(false);

function openDialog() {
  customCount.value = settings.dataAnalysis.count;
  dialogVisible.value = true;
}

async function selectPreset(n: number) {
  await settings.saveDataAnalysis({ count: n });
  dialogVisible.value = false;
}

async function confirmCustom() {
  const count = Math.max(5, Math.min(100, customCount.value));
  await settings.saveDataAnalysis({ count });
  dialogVisible.value = false;
}

const nbackDialogVisible = ref(false);
const nbackChoice = ref<0 | 1 | 2>(0);

function openNbackDialog() {
  nbackChoice.value = settings.dataAnalysis.nback;
  nbackDialogVisible.value = true;
}

async function confirmNback() {
  await settings.saveDataAnalysis({ nback: nbackChoice.value });
  nbackDialogVisible.value = false;
}

async function startPractice() {
  const t = questionTypes[settings.dataAnalysis.selectedFillType];
  await store.init({
    type: t.type,
    subtype: t.label,
    count: settings.dataAnalysis.count,
    difficulty: settings.dataAnalysis.difficulty,
    nback: settings.dataAnalysis.nback,
  });
  if (store.phase === "running") {
    router.push("/practice/session");
  } else {
    ElMessage.error(store.error ?? "练习初始化失败");
  }
}

async function startCompare() {
  const t = compareTypes[settings.dataAnalysis.selectedCompareType];
  await store.init({
    type: t.type,
    subtype: t.label,
    count: settings.dataAnalysis.count,
    difficulty: settings.dataAnalysis.difficulty,
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

onMounted(() => settings.load());
</script>

<template>
  <div class="da-settings">
    <h2 class="title">资料分析</h2>

    <!-- 填空题区 -->
    <section class="block">
      <h3 class="section-title">填空题</h3>

      <div class="row">
        <span class="label">选择难度</span>
        <div class="triple-buttons">
          <button class="triple-btn" :class="{ active: settings.dataAnalysis.difficulty === 'easy' }"
            @click="settings.saveDataAnalysis({ difficulty: 'easy' })">简单</button>
          <button class="triple-btn" :class="{ active: settings.dataAnalysis.difficulty === 'normal' }"
            @click="settings.saveDataAnalysis({ difficulty: 'normal' })">一般</button>
          <button class="triple-btn" :class="{ active: settings.dataAnalysis.difficulty === 'hard' }"
            @click="settings.saveDataAnalysis({ difficulty: 'hard' })">困难</button>
        </div>
      </div>

      <div class="row">
        <span class="label">题目呈现方式</span>
        <div class="triple-buttons">
          <button class="triple-btn" :class="{ active: settings.dataAnalysis.displayMode === 'chart' }"
            @click="settings.saveDataAnalysis({ displayMode: 'chart' })">生成文字图表</button>
          <button class="triple-btn" :class="{ active: settings.dataAnalysis.displayMode === 'formula' }"
            @click="settings.saveDataAnalysis({ displayMode: 'formula' })">直接显示公式</button>
        </div>
      </div>

      <div class="type-grid">
        <button
          v-for="(t, i) in questionTypes"
          :key="t.type"
          class="type-cell"
          :class="{ selected: i === settings.dataAnalysis.selectedFillType }"
          @click="settings.saveDataAnalysis({ selectedFillType: i })"
        >{{ t.label }}</button>
      </div>

      <div class="row" @click="openDialog">
        <span class="label">题量</span>
        <span class="value">{{ settings.dataAnalysis.count }} 题 ›</span>
      </div>

      <div class="row" @click="openNbackDialog">
        <span class="label">N-back</span>
        <span class="value">{{ settings.dataAnalysis.nback === 0 ? "关闭" : `${settings.dataAnalysis.nback}-back` }} ›</span>
      </div>

      <button class="start-btn" @click="startPractice">开始练习</button>
    </section>

    <!-- 比较题区 -->
    <section class="block">
      <h3 class="section-title">比较题</h3>

      <div class="type-grid">
        <button
          v-for="(t, i) in compareTypes"
          :key="t.type"
          class="type-cell"
          :class="{ selected: i === settings.dataAnalysis.selectedCompareType }"
          @click="settings.saveDataAnalysis({ selectedCompareType: i })"
        >{{ t.label }}</button>
      </div>

      <div class="row" @click="openDialog">
        <span class="label">题量</span>
        <span class="value">{{ settings.dataAnalysis.count }} 题 ›</span>
      </div>

      <button class="start-btn" @click="startCompare">开始练习</button>
    </section>

    <!-- 一表通算区 -->
    <section class="block">
      <h3 class="section-title">一表通算</h3>
      <button class="start-btn" @click="startComposite">开始练习</button>
    </section>

    <button class="bottom-btn" @click="goHistory">历史记录</button>

    <el-dialog v-model="dialogVisible" title="选择题量" width="320px">
      <div class="count-grid">
        <button
          v-for="n in countOptions"
          :key="n"
          class="count-opt"
          :class="{ active: settings.dataAnalysis.count === n }"
          @click="selectPreset(n)"
        >{{ n }} 题</button>
        <div class="count-custom">
          <div>自定义</div>
          <el-slider v-model="customCount" :min="5" :max="100" :step="1" />
          <div>{{ customCount }} 题</div>
          <el-button type="primary" size="small" @click="confirmCustom">确定</el-button>
        </div>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="nbackDialogVisible" title="N-back 设置" width="320px">
      <div class="nback-options">
        <button class="nback-opt" :class="{ active: nbackChoice === 0 }" @click="nbackChoice = 0">关闭</button>
        <button class="nback-opt" :class="{ active: nbackChoice === 1 }" @click="nbackChoice = 1">1-back</button>
        <button class="nback-opt" :class="{ active: nbackChoice === 2 }" @click="nbackChoice = 2">2-back</button>
      </div>
      <template #footer>
        <el-button @click="nbackDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmNback">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.da-settings { max-width: 720px; margin: 0 auto; padding: 24px; }
.title { color: var(--app-text-primary, #93a1a1); margin-bottom: 16px; }
.type-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px;
}
.type-cell {
  padding: 14px 8px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px;
  background: rgba(133, 200, 142, 0.15); color: var(--app-text-primary, #93a1a1);
  font-size: 14px; cursor: pointer;
  &.selected {
    background: rgba(46, 80, 56, 0.9); color: #fff;
    border-color: var(--app-color-primary, #5faf6f);
  }
}
.row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; margin-bottom: 12px;
  background: var(--app-bg-surface, #073642); border-radius: 10px; cursor: pointer;
}
.label { color: var(--app-text-primary, #93a1a1); }
.value { color: var(--app-text-secondary, #586e75); }
.triple-buttons { display: flex; gap: 8px; }
.triple-btn {
  padding: 8px 14px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px;
  background: var(--app-bg-surface, #073642); color: var(--app-text-primary, #93a1a1); cursor: pointer;
  &.active {
    border-color: var(--app-color-primary, #5faf6f);
    background: rgba(95, 175, 111, 0.2); color: var(--app-color-primary, #5faf6f);
  }
}
.start-btn {
  width: 100%; padding: 14px; margin: 16px 0 12px;
  background: var(--app-color-primary, #5faf6f); color: #fff;
  border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer;
  &:hover { background: #6fbf7f; }
}
.bottom-btn {
  width: 100%; padding: 10px;
  background: var(--app-bg-surface, #073642); color: var(--app-text-primary, #93a1a1);
  border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; cursor: pointer;
}
.count-grid, .nback-options { display: flex; flex-direction: column; gap: 10px; }
.count-opt, .nback-opt {
  padding: 12px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px;
  background: var(--app-bg-surface, #073642); color: var(--app-text-primary, #93a1a1); cursor: pointer;
  &.active {
    border-color: var(--app-color-primary, #5faf6f);
    background: rgba(95, 175, 111, 0.2);
  }
}
.count-custom {
  padding: 12px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px;
}
.block {
  margin-bottom: 24px; padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  &:last-of-type { border-bottom: none; }
}
.section-title { color: var(--app-text-primary, #93a1a1); font-size: 16px; margin-bottom: 12px; }
</style>
