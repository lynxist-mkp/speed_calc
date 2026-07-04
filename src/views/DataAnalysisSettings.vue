<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { usePracticeStore } from "@/stores/practice";
import { useSettingsStore } from "@/stores/settings";
import type { CompareType } from "@/generators/compareAnalysis";
import TypeGrid from "@/components/TypeGrid.vue";
import SegmentedControl from "@/components/SegmentedControl.vue";
import SettingRow from "@/components/SettingRow.vue";

const router = useRouter();
const store = usePracticeStore();
const settings = useSettingsStore();

// 填空题题型（key 与 store 的 type 字段一致，供 TypeGrid 使用）
const fillSections = [
  {
    title: "填空题",
    types: [
      { key: "estimate_prev", label: "估算前期量" },
      { key: "estimate_growth", label: "估算增长量" },
      { key: "baihua_frac", label: "百化分" },
      { key: "baihua_frac_rev", label: "百化分反向" },
      { key: "frac_calc_lt", label: "分数计算(＜)" },
      { key: "frac_calc_gt", label: "分数计算(＞)" },
      { key: "annual_growth_rate", label: "年均增长率" },
      { key: "base_period_ratio", label: "基期比重" },
      { key: "annual_avg", label: "年平均量" },
    ],
  },
];
const fillFlatTypes: string[] = fillSections.flatMap((s) => s.types.map((t) => t.key));
const fillLabels: Record<string, string> = Object.fromEntries(
  fillSections.flatMap((s) => s.types.map((t) => [t.key, t.label])),
);

// 比较题题型
const compareSections = [
  {
    title: "比较题",
    types: [
      { key: "compare_growth", label: "增量比大小" },
      { key: "compare_base", label: "基期比大小" },
      { key: "compare_frac", label: "分数比大小" },
    ],
  },
];
const compareFlatTypes: CompareType[] = compareSections.flatMap((s) =>
  s.types.map((t) => t.key as CompareType),
);
const compareLabels: Record<string, string> = Object.fromEntries(
  compareSections.flatMap((s) => s.types.map((t) => [t.key, t.label])),
);

// 当前选中题型（字符串 key，供 TypeGrid 使用）
const selectedFillType = ref<string>("estimate_prev");
const selectedCompareType = ref<string>("compare_growth");

function onFillTypeChange(key: string) {
  selectedFillType.value = key;
  const idx = fillFlatTypes.indexOf(key);
  if (idx >= 0) {
    void settings.saveDataAnalysis({ selectedFillType: idx });
  }
}

function onCompareTypeChange(key: string) {
  selectedCompareType.value = key;
  const idx = compareFlatTypes.indexOf(key as CompareType);
  if (idx >= 0) {
    void settings.saveDataAnalysis({ selectedCompareType: idx });
  }
}

// 难度
const difficultyOptions = [
  { label: "简单", value: "easy" },
  { label: "一般", value: "normal" },
  { label: "困难", value: "hard" },
];
const difficulty = computed(() => settings.dataAnalysis.difficulty);

async function onDifficultyChange(v: string) {
  await settings.saveDataAnalysis({ difficulty: v as "easy" | "normal" | "hard" });
}

// 呈现方式
const displayOptions = [
  { label: "生成文字图表", value: "chart" },
  { label: "直接显示公式", value: "formula" },
];
const displayMode = computed(() => settings.dataAnalysis.displayMode);

async function onDisplayChange(v: string) {
  await settings.saveDataAnalysis({ displayMode: v as "chart" | "formula" });
}

// 题量
const countSegOptions = [
  { label: "5", value: "5" },
  { label: "10", value: "10" },
  { label: "15", value: "15" },
  { label: "20", value: "20" },
  { label: "25", value: "25" },
  { label: "自定", value: "custom" },
];
const countMode = computed(() => {
  const c = settings.dataAnalysis.count;
  // 预设值 5/10/15/20/25 显示对应数字，否则显示 custom
  if ([5, 10, 15, 20, 25].includes(c) && c === settings.dataAnalysis.count) {
    // 仅当 count 等于某个预设且非 custom 模式时显示数字
    // 这里简化：只要 count 在预设列表中就显示数字
    return String(c);
  }
  return "custom";
});
const customCount = ref(settings.dataAnalysis.count);
const showCustomExpand = computed(() => countMode.value === "custom");

async function onCountChange(v: string) {
  if (v === "custom") {
    await settings.saveDataAnalysis({ count: customCount.value });
  } else {
    await settings.saveDataAnalysis({ count: Number(v) });
  }
}

async function onCustomCountInput(e: Event) {
  const v = Number((e.target as HTMLInputElement).value);
  customCount.value = Math.max(5, Math.min(100, v));
  await settings.saveDataAnalysis({ count: customCount.value });
}

// N-back
const nbackOptions = [
  { label: "关闭", value: "0" },
  { label: "1-back", value: "1" },
  { label: "2-back", value: "2" },
];
const nback = computed(() => String(settings.dataAnalysis.nback));

async function onNbackChange(v: string) {
  await settings.saveDataAnalysis({ nback: Number(v) as 0 | 1 | 2 });
}

// 开始练习
async function startPractice() {
  const key = selectedFillType.value;
  const label = fillLabels[key];
  await store.init({
    type: key,
    subtype: label,
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
  const key = selectedCompareType.value as CompareType;
  const label = compareLabels[key];
  await store.init({
    type: key,
    subtype: label,
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

onMounted(async () => {
  await settings.load();
  const fillIdx = settings.dataAnalysis.selectedFillType;
  if (fillIdx >= 0 && fillIdx < fillFlatTypes.length) {
    selectedFillType.value = fillFlatTypes[fillIdx];
  }
  const cmpIdx = settings.dataAnalysis.selectedCompareType;
  if (cmpIdx >= 0 && cmpIdx < compareFlatTypes.length) {
    selectedCompareType.value = compareFlatTypes[cmpIdx];
  }
  customCount.value = settings.dataAnalysis.count;
});
</script>

<template>
  <div class="da-settings">
    <h2 class="page-title">资料分析</h2>

    <!-- 填空题区 -->
    <section class="block">
      <h3 class="section-title">填空题</h3>

      <SettingRow label="选择难度">
        <SegmentedControl
          :options="difficultyOptions"
          :model-value="difficulty"
          @update:model-value="onDifficultyChange"
        />
      </SettingRow>

      <SettingRow label="题目呈现方式">
        <SegmentedControl
          :options="displayOptions"
          :model-value="displayMode"
          @update:model-value="onDisplayChange"
        />
      </SettingRow>

      <SettingRow label="题型选择">
        <TypeGrid
          :sections="fillSections"
          :show-title="false"
          :model-value="selectedFillType"
          @update:model-value="onFillTypeChange"
        />
      </SettingRow>

      <SettingRow label="题量" :expandable="showCustomExpand" :expanded="showCustomExpand">
        <SegmentedControl
          :options="countSegOptions"
          :model-value="countMode"
          @update:model-value="onCountChange"
        />
        <template #expand>
          <div class="custom-count">
            <label>自定义题量（5-100）</label>
            <input
              type="range"
              min="5"
              max="100"
              :value="customCount"
              @input="onCustomCountInput"
            />
            <span class="count-value">{{ customCount }} 题</span>
          </div>
        </template>
      </SettingRow>

      <SettingRow label="N-back 工作记忆训练">
        <SegmentedControl
          :options="nbackOptions"
          :model-value="nback"
          @update:model-value="onNbackChange"
        />
      </SettingRow>

      <div class="actions">
        <button class="btn-primary" @click="startPractice">开始练习</button>
      </div>
    </section>

    <!-- 比较题区 -->
    <section class="block">
      <h3 class="section-title">比较题</h3>

      <SettingRow label="题型选择">
        <TypeGrid
          :sections="compareSections"
          :show-title="false"
          :model-value="selectedCompareType"
          @update:model-value="onCompareTypeChange"
        />
      </SettingRow>

      <SettingRow label="题量" :expandable="showCustomExpand" :expanded="showCustomExpand">
        <SegmentedControl
          :options="countSegOptions"
          :model-value="countMode"
          @update:model-value="onCountChange"
        />
        <template #expand>
          <div class="custom-count">
            <label>自定义题量（5-100）</label>
            <input
              type="range"
              min="5"
              max="100"
              :value="customCount"
              @input="onCustomCountInput"
            />
            <span class="count-value">{{ customCount }} 题</span>
          </div>
        </template>
      </SettingRow>

      <div class="actions">
        <button class="btn-primary" @click="startCompare">开始练习</button>
      </div>
    </section>

    <!-- 一表通算区 -->
    <section class="block">
      <h3 class="section-title">一表通算</h3>
      <div class="actions">
        <button class="btn-primary" @click="startComposite">开始练习</button>
      </div>
    </section>

    <div class="actions">
      <button class="btn-secondary" @click="goHistory">历史记录</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.da-settings {
  max-width: 720px;
  margin: 0 auto;
}

.page-title {
  font-size: 22px;
  color: var(--app-text-bright);
  margin-bottom: 16px;
}

.block {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--app-glass-border);

  &:last-of-type {
    border-bottom: none;
  }
}

.section-title {
  color: var(--app-text-bright);
  font-size: 16px;
  margin-bottom: 12px;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.btn-primary {
  flex: 1;
  padding: 12px 20px;
  background: var(--app-color-primary);
  color: var(--app-bg-page);
  border: none;
  border-radius: var(--app-radius-button);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: var(--app-color-primary-hover);
  }
}

.btn-secondary {
  flex: 1;
  padding: 12px 20px;
  background: var(--button-bg);
  color: var(--app-text-bright);
  border: 1px solid var(--button-border);
  border-radius: var(--app-radius-button);
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background: var(--button-bg-hover);
    border-color: var(--app-color-primary);
  }
}

.custom-count {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;

  label {
    color: var(--app-text-secondary);
  }

  input[type="range"] {
    width: 100%;
    accent-color: var(--app-color-primary);
  }

  .count-value {
    color: var(--app-color-primary);
    font-weight: 600;
    text-align: right;
  }
}
</style>
