<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessageBox } from "element-plus";
import TopBar from "@/components/TopBar.vue";
import Numpad from "@/components/Numpad.vue";
import QuestionDisplay from "@/components/QuestionDisplay.vue";
import { usePracticeStore } from "@/stores/practice";

const router = useRouter();
const store = usePracticeStore();

const flashState = ref<"none" | "correct" | "wrong">("none");
let flashTimer: number | null = null;

const standardText = computed(() => {
  const s = store.timeStandard;
  if (s === null) return null;
  return `合格 ${s.pass}s  良好 ${s.good}s  优秀 ${s.excellent}s`;
});

function handleKeydown(e: KeyboardEvent) {
  if (store.phase !== "running") return;
  const k = e.key;
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

onMounted(() => {
  // 若未初始化（如直接访问 URL），回设置页
  if (store.phase !== "running") {
    router.replace("/practice");
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
    </TopBar>

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

    <Numpad
      :variant="store.isDataType ? 'data' : 'basic'"
      layout="normal"
      @input="store.inputChar($event)"
      @submit="onSubmit"
      @clear="store.clearAnswer"
      @backspace="store.backspace"
      @restart="onRestart"
      @toggle-sign="store.toggleSign"
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
</style>
