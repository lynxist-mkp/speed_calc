<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessageBox } from "element-plus";
import TopBar from "@/components/TopBar.vue";
import Numpad from "@/components/Numpad.vue";
import QuestionDisplay from "@/components/QuestionDisplay.vue";
import CompareQuestion from "@/components/CompareQuestion.vue";
import CompareKeypad from "@/components/CompareKeypad.vue";
import NbackPrompt from "@/components/NbackPrompt.vue";
import BarChart from "@/components/BarChart.vue";
import { usePracticeStore } from "@/stores/practice";
import { useSettingsStore } from "@/stores/settings";

const router = useRouter();
const store = usePracticeStore();
const settings = useSettingsStore();

const flashState = ref<"none" | "correct" | "wrong">("none");
let flashTimer: number | null = null;

const standardText = computed(() => {
  const s = store.timeStandard;
  if (s === null) return null;
  return `合格 ${s.pass}s  良好 ${s.good}s  优秀 ${s.excellent}s`;
});

// chart 呈现模式：仅 annual_growth_rate / annual_avg 在 displayMode=chart 时启用
const CHART_TYPES = new Set(["annual_growth_rate", "annual_avg"]);
const useChart = computed(() => {
  if (settings.dataAnalysis.displayMode !== "chart") return false;
  const q = store.currentQuestion;
  if (!q || !("chartData" in q)) return false;
  return CHART_TYPES.has(store.config?.type ?? "");
});

function handleKeydown(e: KeyboardEvent) {
  if (store.phase !== "running") return;
  if (store.nbackPrompting) return; // N-back 弹窗显示时，键盘交给 NbackPrompt
  const k = e.key;
  // compare 模式键盘映射（按 UI 位置：左=小于，右=大于）：
  // 小于 = <//《/1/,//，  |  大于 = >//》/2/.//。
  // 左手键（1/,）→ 小于（UI 左），右手键（2/.) → 大于（UI 右），位置一致
  if (store.questionCategory === "compare") {
    if (k === "<" || k === "《" || k === "1" || k === "," || k === "，") { e.preventDefault(); store.selectCompare("<"); }
    else if (k === ">" || k === "》" || k === "2" || k === "." || k === "。") { e.preventDefault(); store.selectCompare(">"); }
    else if (k === "Enter") {
      if (e.target instanceof HTMLButtonElement) return;
      e.preventDefault();
      void onSubmit();
    } else if (k === "Escape") {
      if (e.target instanceof HTMLButtonElement) return;
      e.preventDefault();
      void onRestart();
    }
    return;
  }
  // 防止 Numpad 按钮聚焦时 Enter/Escape 双触发（keydown + 派生 click）
  if ((k === "Enter" || k === "Escape") && e.target instanceof HTMLButtonElement) {
    return;
  }
  if (/^[0-9]$/.test(k)) {
    e.preventDefault();
    store.inputChar(k);
  } else if (k === "." || k === "," || k === "，") {
    e.preventDefault();
    store.inputChar(".");
  } else if (k === "-") {
    e.preventDefault();
    store.toggleSign();
  } else if (k === "Backspace") {
    e.preventDefault();
    store.backspace();
  } else if (k === "Enter") {
    e.preventDefault();
    void onSubmit();
  } else if (k === "Escape") {
    e.preventDefault();
    void onRestart();
  } else if (k === "Delete") {
    e.preventDefault();
    store.clearAnswer();
  }
}

async function onSubmit() {
  // compare 模式：直接提交（不需 currentAnswer 守卫）
  if (store.questionCategory === "compare") {
    if (store.compareChoice === null) return;
    await store.submit();
    const lastRecord = store.records[store.records.length - 1];
    if (lastRecord) {
      if (flashTimer !== null) clearTimeout(flashTimer);
      flashState.value = lastRecord.isCorrect ? "correct" : "wrong";
      flashTimer = window.setTimeout(() => {
        flashState.value = "none";
        flashTimer = null;
      }, 200);
    }
    if (store.phase === "finished") {
      router.push("/practice/result");
    }
    return;
  }
  // numpad 模式
  if (store.currentAnswer === "") return;
  await store.submit();
  // 判分反馈
  const lastRecord = store.records[store.records.length - 1];
  if (lastRecord) {
    if (flashTimer !== null) clearTimeout(flashTimer);
    flashState.value = lastRecord.isCorrect ? "correct" : "wrong";
    flashTimer = window.setTimeout(() => {
      flashState.value = "none";
      flashTimer = null;
    }, 200);
  }
  if (store.phase === "finished") {
    router.push("/practice/result");
  }
}

async function onRestart() {
  // 已答 ≥1 题时确认
  if (store.records.length >= 1) {
    try {
      await ElMessageBox.confirm("将丢弃当前进度，整卷重开？", "确认", {
        type: "warning",
      });
    } catch {
      return; // 取消
    }
  }
  await store.restart();
}

function onBack() {
  router.push(store.isDataType ? "/practice/data-analysis" : "/practice");
}

async function onNbackSubmit(answer: string) {
  store.setNbackAnswer(answer);
  await store.submitNback();
}

async function onNbackSkip() {
  await store.skipNback();
}

onMounted(() => {
  // 若未初始化（如直接访问 URL），回设置页
  if (store.phase !== "running") {
    router.replace(store.isDataType ? "/practice/data-analysis" : "/practice");
    return;
  }
  window.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
  if (flashTimer !== null) clearTimeout(flashTimer);
});
</script>

<template>
  <div class="practice-session" :class="`flash-${flashState}`">
    <TopBar
      :title="store.isDataType ? '资料分析' : '基础计算'"
      :progress="store.progress"
      :elapsed-ms="store.elapsedMs"
      @back="onBack"
    >
      <template #left>
        <button class="back-btn glass-button" @click="onBack">‹</button>
      </template>
      <template #right>
        <span v-if="store.nback > 0" class="nback-badge">{{ store.nback }}-back</span>
        <span v-else class="pen-icon" title="待实现">✏</span>
      </template>
    </TopBar>

    <!-- 题目区按 category 切换 -->
    <template v-if="store.questionCategory === 'numpad'">
      <BarChart
        v-if="useChart"
        :labels="((store.currentQuestion as any)?.chartData?.labels) ?? []"
        :values="((store.currentQuestion as any)?.chartData?.values) ?? []"
        :unit="((store.currentQuestion as any)?.chartData?.unit)"
      />
      <QuestionDisplay
        :display="(store.currentQuestion as any)?.display ?? ''"
        :is-data="store.isDataType"
        :context="store.questionMeta?.context"
        :hint="store.questionMeta?.hint"
        :tolerance="store.questionMeta?.tolerance"
        :unit="store.questionMeta?.unit"
        :standard-text="standardText"
        :answer="store.currentAnswer"
      />
    </template>
    <CompareQuestion
      v-else-if="store.questionCategory === 'compare'"
      :left-tex="(store.currentQuestion as any)?.display?.leftTex ?? ''"
      :right-tex="(store.currentQuestion as any)?.display?.rightTex ?? ''"
      :selected="store.compareChoice"
      :context="(store.currentQuestion as any)?.context"
      :standard-text="standardText"
    />

    <!-- 输入区按 category 切换 -->
    <Numpad
      v-if="store.questionCategory === 'numpad'"
      :variant="store.isDataType ? 'data' : 'basic'"
      layout="normal"
      @input="store.inputChar($event)"
      @submit="onSubmit"
      @clear="store.clearAnswer"
      @backspace="store.backspace"
      @restart="onRestart"
      @toggle-sign="store.toggleSign"
    />
    <CompareKeypad
      v-else-if="store.questionCategory === 'compare'"
      :selected="store.compareChoice"
      @select="store.selectCompare($event)"
      @submit="onSubmit"
      @restart="onRestart"
    />

    <NbackPrompt
      :visible="store.nbackPrompting"
      :target-index="store.nbackTarget?.index ?? 0"
      @submit="onNbackSubmit"
      @skip="onNbackSkip"
    />
  </div>
</template>

<style scoped lang="scss">
.practice-session {
  min-height: 100vh;
  padding: 80px 24px 24px 96px;
  transition: box-shadow 0.2s;
}

.practice-session.flash-correct {
  box-shadow: inset 0 0 0 4px rgba(95, 175, 111, 0.8);
}

.practice-session.flash-wrong {
  box-shadow: inset 0 0 0 4px rgba(255, 110, 140, 0.8);
}

.back-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: var(--app-text-primary, #93a1a1);
  font-size: 22px;
  cursor: pointer;
}

.nback-badge {
  display: inline-block;
  padding: 2px 8px;
  margin-left: 8px;
  background: rgba(255, 110, 140, 0.2);
  color: #ff6e8c;
  border: 1px solid rgba(255, 110, 140, 0.4);
  border-radius: 999px;
  font-size: 11px;
}
</style>
