<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import * as echarts from "echarts";

interface Props {
  labels: string[];
  values: number[];
  unit?: string;
  title?: string;
}
const props = defineProps<Props>();

const chartEl = ref<HTMLElement | null>(null);
let chart: echarts.ECharts | null = null;

function render() {
  if (!chartEl.value || !chart) return;
  chart.setOption({
    title: props.title ? { text: props.title, textStyle: { color: "#93a1a1", fontSize: 14 } } : undefined,
    xAxis: {
      type: "category",
      data: props.labels,
      axisLabel: { color: "#93a1a1" },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#93a1a1", formatter: (v: number) => `${v}${props.unit ?? ""}` },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
    },
    series: [{
      type: "bar",
      data: props.values,
      itemStyle: { color: "#5faf6f" },
      label: {
        show: true,
        position: "top",
        color: "#93a1a1",
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
