<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import * as echarts from "echarts/core";
import { BarChart, LineChart, RadarChart } from "echarts/charts";
import { TooltipComponent, GridComponent, RadarComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import {
  getOverallStats,
  getAccuracyByType,
  getRecentDailyAccuracy,
  getAvgDurationByType,
  type OverallStats,
  type TypeAccuracy,
  type DailyAccuracy,
  type TypeDuration,
} from "@/db/index";
import { typeLabel } from "@/constants/typeLabels";

echarts.use([
  BarChart,
  LineChart,
  RadarChart,
  TooltipComponent,
  GridComponent,
  RadarComponent,
  CanvasRenderer,
]);

const overall = ref<OverallStats | null>(null);
const typeAccuracy = ref<TypeAccuracy[]>([]);
const dailyAccuracy = ref<DailyAccuracy[]>([]);
const typeDuration = ref<TypeDuration[]>([]);
const loading = ref(true);

const radarEl = ref<HTMLDivElement | null>(null);
const trendEl = ref<HTMLDivElement | null>(null);
const durationEl = ref<HTMLDivElement | null>(null);
let radarChart: echarts.ECharts | null = null;
let trendChart: echarts.ECharts | null = null;
let durationChart: echarts.ECharts | null = null;

// Solarized 主题色板（ECharts 在 canvas 中渲染，无法读取 CSS 变量，故硬编码色值统一管理于此）
const SOLARIZED_COLORS = {
  primary: "#2aa198",    // cyan
  secondary: "#b58900",  // yellow
  success: "#859900",    // green
  danger: "#dc322f",     // red
  info: "#268bd2",       // blue
  text: "#93a1a1",       // base1
  textBright: "#eee8d5", // base3
  bg: "#073642",         // base02
  bgDeep: "#002b36",     // base03
  muted: "#586e75",      // base01
} as const;

// 系列主色（Solarized green #859900 = rgb(133, 153, 0)）及其透明变体
const TEXT_PRIMARY = SOLARIZED_COLORS.text;
const COLOR_PRIMARY = SOLARIZED_COLORS.success;
const COLOR_SPLIT = SOLARIZED_COLORS.bg;
const AREA_FILL_STRONG = "rgba(133, 153, 0, 0.3)";
const AREA_FILL_LIGHT = "rgba(133, 153, 0, 0.15)";

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}分${s}秒` : `${s}秒`;
}

function renderRadar() {
  if (!radarEl.value || typeAccuracy.value.length === 0) return;
  if (!radarChart) radarChart = echarts.init(radarEl.value);
  const indicator = typeAccuracy.value.map((t) => ({
    name: typeLabel(t.type),
    max: 100,
  }));
  const values = typeAccuracy.value.map((t) => Math.round(t.accuracy * 100));
  radarChart.setOption({
    backgroundColor: "transparent",
    tooltip: { trigger: "item" },
    radar: {
      indicator,
      radius: "65%",
      splitLine: { lineStyle: { color: COLOR_SPLIT } },
      splitArea: { areaStyle: { color: ["rgba(0,0,0,0)", "rgba(255,255,255,0.03)"] } },
      axisLine: { lineStyle: { color: COLOR_SPLIT } },
      axisName: { color: TEXT_PRIMARY, fontSize: 11 },
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: values,
            name: "正确率",
            areaStyle: { color: AREA_FILL_STRONG },
            lineStyle: { color: COLOR_PRIMARY, width: 2 },
            itemStyle: { color: COLOR_PRIMARY },
          },
        ],
      },
    ],
  });
}

function renderTrend() {
  if (!trendEl.value) return;
  if (!trendChart) trendChart = echarts.init(trendEl.value);
  const dates = dailyAccuracy.value.map((d) => d.date);
  const accuracies = dailyAccuracy.value.map((d) => Math.round(d.accuracy * 100));
  trendChart.setOption({
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", formatter: (p: any) => `${p[0].axisValue}<br/>正确率: ${p[0].data}%` },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: "category",
      data: dates,
      axisLabel: { color: TEXT_PRIMARY, fontSize: 11 },
      axisLine: { lineStyle: { color: COLOR_SPLIT } },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLabel: { color: TEXT_PRIMARY, fontSize: 11, formatter: "{value}%" },
      splitLine: { lineStyle: { color: COLOR_SPLIT } },
    },
    series: [
      {
        type: "line",
        data: accuracies,
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { color: COLOR_PRIMARY, width: 2 },
        itemStyle: { color: COLOR_PRIMARY },
        areaStyle: { color: AREA_FILL_LIGHT },
      },
    ],
  });
}

function renderDuration() {
  if (!durationEl.value || typeDuration.value.length === 0) return;
  if (!durationChart) durationChart = echarts.init(durationEl.value);
  const types = typeDuration.value.map((t) => typeLabel(t.type));
  const durations = typeDuration.value.map((t) => Math.round(t.avgDurationMs / 1000));
  durationChart.setOption({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      formatter: (p: any) => `${p[0].axisValue}<br/>平均用时: ${formatDuration(p[0].data * 1000)}`,
    },
    grid: { left: 50, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: "category",
      data: types,
      axisLabel: { color: TEXT_PRIMARY, fontSize: 10, rotate: 30 },
      axisLine: { lineStyle: { color: COLOR_SPLIT } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: TEXT_PRIMARY, fontSize: 11, formatter: "{value}秒" },
      splitLine: { lineStyle: { color: COLOR_SPLIT } },
    },
    series: [
      {
        type: "bar",
        data: durations,
        itemStyle: { color: COLOR_PRIMARY, borderRadius: [4, 4, 0, 0] },
      },
    ],
  });
}

function handleResize() {
  radarChart?.resize();
  trendChart?.resize();
  durationChart?.resize();
}

async function loadAll() {
  loading.value = true;
  try {
    const [ov, ta, da, td] = await Promise.all([
      getOverallStats(),
      getAccuracyByType(),
      getRecentDailyAccuracy(30),
      getAvgDurationByType(),
    ]);
    overall.value = ov;
    typeAccuracy.value = ta;
    dailyAccuracy.value = da;
    typeDuration.value = td;
  } finally {
    loading.value = false;
    await nextTick();
    renderRadar();
    renderTrend();
    renderDuration();
  }
}

watch(loading, async (v) => {
  if (!v) {
    await nextTick();
    renderRadar();
    renderTrend();
    renderDuration();
  }
});

onMounted(() => {
  loadAll();
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  radarChart?.dispose();
  trendChart?.dispose();
  durationChart?.dispose();
});
</script>

<template>
  <div class="stats-page">
    <h2 class="title">练习统计</h2>

    <div v-if="loading" class="empty">加载中…</div>

    <template v-else>
      <!-- 总正确率横幅 -->
      <div class="overall-banner glass-card">
        <div class="overall-item">
          <div class="overall-value">{{ overall?.totalSessions ?? 0 }}</div>
          <div class="overall-label">练习次数</div>
        </div>
        <div class="overall-item">
          <div class="overall-value">{{ overall?.totalQuestions ?? 0 }}</div>
          <div class="overall-label">总题数</div>
        </div>
        <div class="overall-item">
          <div class="overall-value">{{ overall?.totalCorrect ?? 0 }}</div>
          <div class="overall-label">答对数</div>
        </div>
        <div class="overall-item">
          <div class="overall-value">{{ Math.round((overall?.accuracy ?? 0) * 100) }}%</div>
          <div class="overall-label">总正确率</div>
        </div>
      </div>

      <!-- 雷达图：各题型正确率 -->
      <div v-if="typeAccuracy.length > 0" class="chart-section glass-card">
        <h3 class="chart-title">各题型正确率</h3>
        <div ref="radarEl" class="chart-box" />
      </div>

      <!-- 趋势折线 -->
      <div v-if="dailyAccuracy.length > 0" class="chart-section glass-card">
        <h3 class="chart-title">近期正确率趋势（30天）</h3>
        <div ref="trendEl" class="chart-box" />
      </div>

      <!-- 用时分布 -->
      <div v-if="typeDuration.length > 0" class="chart-section glass-card">
        <h3 class="chart-title">各题型平均用时</h3>
        <div ref="durationEl" class="chart-box" />
      </div>

      <div v-if="overall?.totalSessions === 0" class="empty">
        暂无练习记录，开始练习后这里会显示统计图表
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.stats-page {
  padding: 80px 24px 24px 96px;
  max-width: 900px;
  margin: 0 auto;
}

.title {
  color: var(--app-text-bright);
  margin-bottom: 16px;
}

.empty {
  color: var(--app-text-secondary);
  text-align: center;
  padding: 40px;
}

.overall-banner {
  display: flex;
  justify-content: space-around;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.overall-item {
  text-align: center;
}

.overall-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--app-color-primary);
  font-variant-numeric: tabular-nums;
}

.overall-label {
  margin-top: 4px;
  font-size: 12px;
  color: var(--app-text-secondary);
}

.chart-section {
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.chart-title {
  font-size: 15px;
  color: var(--app-text-bright);
  margin: 0 0 12px;
}

.chart-box {
  width: 100%;
  height: 300px;
}
</style>
