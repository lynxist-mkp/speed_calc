<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import TopBar from "@/components/TopBar.vue";
import Numpad from "@/components/Numpad.vue";
import {
  generateComposite,
  COMPOSITE_FIELDS,
  type CompositeData,
  type CompositeAnswers,
} from "@/generators/compositeAnalysis";
import {
  insertSession,
  insertRecord,
  updateSession,
} from "@/db/index";

const router = useRouter();

const data = ref<CompositeData | null>(null);
const answers = ref<Partial<Record<keyof CompositeAnswers, string>>>({});
const activeField = ref<keyof CompositeAnswers | null>(null);
const submitted = ref(false);
const results = ref<Partial<Record<keyof CompositeAnswers, boolean>>>({});
const elapsedMs = ref(0);
const startedAt = ref<number | null>(null);
let timerId: number | null = null;
const trueAnswers = ref<CompositeAnswers | null>(null);

const knownFields = computed<{ label: string; value: string }[]>(() => {
  if (!data.value) return [];
  const d = data.value;
  return [
    { label: "现期 A", value: String(d.currentA) },
    { label: "现期 B", value: String(d.currentB) },
    { label: "增长率 r1", value: `${d.r1}%` },
    { label: "增长率 r2", value: `${d.r2}%` },
  ];
});

function tick() {
  if (startedAt.value !== null) {
    elapsedMs.value = Math.floor(performance.now() - startedAt.value);
  }
}

function startTimer() {
  startedAt.value = performance.now();
  if (timerId !== null) window.clearInterval(timerId);
  timerId = window.setInterval(tick, 100);
}

function stopTimer() {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function refreshData() {
  const q = generateComposite();
  data.value = q.data;
  trueAnswers.value = q.answers;
  answers.value = {};
  submitted.value = false;
  results.value = {};
  activeField.value = null;
  startTimer();
}

function onInput(char: string) {
  if (activeField.value === null) return;
  const k = activeField.value;
  answers.value[k] = (answers.value[k] ?? "") + char;
}

function onBackspace() {
  if (activeField.value === null) return;
  const k = activeField.value;
  const cur = answers.value[k] ?? "";
  answers.value[k] = cur.slice(0, -1);
}

function onClear() {
  if (activeField.value === null) return;
  answers.value[activeField.value] = "";
}

function onSubmit() {
  if (submitted.value) return;
  if (!trueAnswers.value || !data.value) return;
  const ta = trueAnswers.value;
  let correctCount = 0;
  for (const f of COMPOSITE_FIELDS) {
    const raw = answers.value[f.key];
    const userAns = raw === undefined || raw === "" ? NaN : Number(raw);
    const trueAns = ta[f.key];
    const isCorrect =
      !isNaN(userAns) &&
      (trueAns === 0 ? userAns === 0 : Math.abs(userAns - trueAns) / Math.abs(trueAns) <= 0.05);
    results.value[f.key] = isCorrect;
    if (isCorrect) correctCount++;
  }
  submitted.value = true;
  void persistSession(correctCount);
}

async function persistSession(correctCount: number) {
  try {
    const sessionId = await insertSession({
      type: "composite",
      subtype: "一表通算",
      difficulty: "normal",
      total: 13,
      nback: 0,
    });
    for (let i = 0; i < COMPOSITE_FIELDS.length; i++) {
      const f = COMPOSITE_FIELDS[i];
      await insertRecord({
        sessionId,
        qIndex: i,
        question: f.label,
        userAnswer: String(answers.value[f.key] ?? ""),
        trueAnswer: String(trueAnswers.value?.[f.key] ?? ""),
        isCorrect: results.value[f.key] ?? false,
        tolerance: 0.05,
        timeSpentMs: 0,
      });
    }
    await updateSession(sessionId, {
      correct: correctCount,
      durationMs: elapsedMs.value,
    });
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e));
  }
}

function onCustom() {
  ElMessage.info("自定义功能暂未实现");
}

function onBack() {
  router.push("/practice/data-analysis");
}

onMounted(() => {
  refreshData();
  window.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  stopTimer();
  window.removeEventListener("keydown", handleKeydown);
});

function handleKeydown(e: KeyboardEvent) {
  const k = e.key;
  if (/^[0-9]$/.test(k)) {
    e.preventDefault();
    onInput(k);
  } else if (k === "." || k === "," || k === "，") {
    e.preventDefault();
    onInput(".");
  } else if (k === "-") {
    e.preventDefault();
    onInput("-");
  } else if (k === "Backspace") {
    e.preventDefault();
    onBackspace();
  } else if (k === "Enter") {
    if (e.target instanceof HTMLButtonElement) return;
    e.preventDefault();
    onSubmit();
  } else if (k === "Delete") {
    e.preventDefault();
    onClear();
  }
}

const correctCount = computed(() =>
  Object.values(results.value).filter(Boolean).length
);
</script>

<template>
  <div class="composite-session">
    <TopBar
      title="一表通算"
      :progress="''"
      :elapsed-ms="elapsedMs"
      @back="onBack"
    >
      <template #left>
        <button class="back-btn glass-button" @click="onBack">‹</button>
      </template>
    </TopBar>

    <div class="instruction">点击输入位填空，允许误差 ±5%</div>

    <!-- 已知数据区 -->
    <div class="known-grid">
      <div v-for="f in knownFields" :key="f.label" class="known-cell">
        <span class="k-label">{{ f.label }}</span>
        <span class="k-value">{{ f.value }}</span>
      </div>
    </div>

    <!-- 13 项填空区 -->
    <div class="answer-grid">
      <div
        v-for="f in COMPOSITE_FIELDS"
        :key="f.key"
        class="answer-cell"
        :class="{
          active: activeField === f.key,
          correct: submitted && results[f.key] === true,
          wrong: submitted && results[f.key] === false,
        }"
        @click="activeField = f.key"
      >
        <span class="a-label">{{ f.label }}</span>
        <span class="a-input">
          <template v-if="submitted">
            <span class="user-ans">{{ answers[f.key] || '—' }}</span>
            <span class="true-ans">/ {{ trueAnswers?.[f.key] }}</span>
          </template>
          <template v-else>{{ answers[f.key] || '点击填入' }}</template>
        </span>
        <span class="a-unit">{{ f.unit }}</span>
      </div>
    </div>

    <!-- 操作按钮（一行三按钮：刷新数据/提交答案/自定义） -->
    <div class="ops-row">
      <button class="op-btn refresh-btn" @click="refreshData">刷新数据</button>
      <button class="op-btn submit-btn" @click="onSubmit">提交答案</button>
      <button class="op-btn custom-btn" @click="onCustom">自定义</button>
    </div>

    <!-- 已提交反馈 -->
    <div v-if="submitted" class="feedback">
      正确 {{ correctCount }}/13
    </div>

    <!-- Numpad -->
    <Numpad
      variant="data"
      layout="normal"
      @input="onInput($event)"
      @submit="onSubmit"
      @clear="onClear"
      @backspace="onBackspace"
      @restart="refreshData"
    />
  </div>
</template>

<style scoped lang="scss">
.composite-session {
  min-height: 100vh;
  padding: 80px 24px 24px 96px;
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

.instruction {
  color: var(--app-text-secondary, #586e75);
  font-size: 13px;
  margin-bottom: 12px;
}

.known-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.known-cell {
  padding: 10px 8px;
  background: var(--app-bg-surface, #073642);
  border-radius: 8px;
  text-align: center;
}

.k-label {
  display: block;
  font-size: 12px;
  color: var(--app-text-secondary, #586e75);
  margin-bottom: 4px;
}

.k-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--app-text-primary, #93a1a1);
  font-variant-numeric: tabular-nums;
}

.answer-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.answer-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--app-bg-surface, #073642);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;

  &.active {
    border-color: var(--app-color-primary, #5faf6f);
    background: rgba(95, 175, 111, 0.15);
  }
  &.correct {
    border-color: #5faf6f;
    background: rgba(95, 175, 111, 0.2);
  }
  &.wrong {
    border-color: #d33682;
    background: rgba(211, 54, 130, 0.15);
  }
}

.a-label {
  font-size: 13px;
  color: var(--app-text-secondary, #586e75);
}

.a-input {
  flex: 1;
  text-align: right;
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text-primary, #93a1a1);
  font-variant-numeric: tabular-nums;
}

.user-ans {
  color: var(--app-text-primary, #93a1a1);
}

.true-ans {
  margin-left: 6px;
  color: var(--app-color-primary, #5faf6f);
  font-weight: 500;
  font-size: 13px;
}

.a-unit {
  margin-left: 4px;
  font-size: 12px;
  color: var(--app-text-secondary, #586e75);
}

.ops-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.op-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.refresh-btn {
  background: rgba(42, 161, 152, 0.2);
  color: #2aa198;
}

.submit-btn {
  background: var(--app-color-primary, #5faf6f);
  color: #fff;
}

.custom-btn {
  background: var(--app-bg-surface, #073642);
  color: var(--app-text-primary, #93a1a1);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.feedback {
  margin-top: 12px;
  padding: 10px;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: var(--app-color-primary, #5faf6f);
}
</style>
