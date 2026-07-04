<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import * as echarts from "echarts/core";
import { BarChart as EBarChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { ECharts } from "echarts/core";

echarts.use([EBarChart, GridComponent, TooltipComponent, CanvasRenderer]);

const SOLARIZED_COLORS = {
  text: "#93a1a1",
  success: "#859900",
  split: "rgba(255,255,255,0.08)",
} as const;

interface Props {
  labels: string[];
  values: number[];
  unit?: string;
  title?: string;
}
const props = defineProps<Props>();

const chartEl = ref<HTMLElement | null>(null);
let chart: ECharts | null = null;

function render() {
  if (!chartEl.value || !chart) return;
  chart.setOption({
    title: props.title ? { text: props.title, textStyle: { color: SOLARIZED_COLORS.text, fontSize: 14 } } : undefined,
    xAxis: {
      type: "category",
      data: props.labels,
      axisLabel: { color: SOLARIZED_COLORS.text },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: SOLARIZED_COLORS.text, formatter: (v: number) => `${v}${props.unit ?? ""}` },
      splitLine: { lineStyle: { color: SOLARIZED_COLORS.split } },
    },
    series: [{
      type: "bar",
      data: props.values,
      itemStyle: { color: SOLARIZED_COLORS.success },
      label: {
        show: true,
        position: "top",
        color: SOLARIZED_COLORS.text,
        formatter: (p: { value: number }) => `${p.value}${props.unit ?? ""}`,
      },
    }],
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
  });
}

function onResize() {
  chart?.resize();
}

onMounted(() => {
  if (chartEl.value) {
    chart = echarts.init(chartEl.value);
    render();
    window.addEventListener("resize", onResize);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
  chart?.dispose();
});

watch(() => [props.labels, props.values], render, { deep: true });
</script>

<template>
  <div ref="chartEl" class="bar-chart"></div>
</template>

<style scoped lang="scss">
.bar-chart {
  width: 100%;
  height: 240px;
}
</style>
