import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { generateBasicAddSub, type Question } from "@/generators/basic";
import {
  insertSession,
  insertRecord,
  updateSession,
  getTimeStandard,
  type TimeStandard,
} from "@/db/index";

export interface AnswerRecord {
  qIndex: number;
  question: string;
  userAnswer: string;
  trueAnswer: string;
  isCorrect: boolean;
  timeSpentMs: number;
}

export interface SessionConfig {
  type: string;
  subtype: string;
  count: number;
}

export const usePracticeStore = defineStore("practice", () => {
  const phase = ref<"idle" | "running" | "finished">("idle");
  const sessionId = ref<number | null>(null);
  const config = ref<SessionConfig | null>(null);
  const questions = ref<Question[]>([]);
  const currentIndex = ref(0);
  const currentAnswer = ref("");
  const records = ref<AnswerRecord[]>([]);
  const startedAt = ref<number | null>(null);
  const elapsedMs = ref(0);
  const error = ref<string | null>(null);
  const timeStandard = ref<TimeStandard | null>(null);
  let timerId: number | null = null;

  const correctCount = computed(() => records.value.filter((r) => r.isCorrect).length);
  const errorCount = computed(() => records.value.filter((r) => !r.isCorrect).length);
  const totalCount = computed(() => records.value.length);
  const accuracy = computed(() =>
    totalCount.value === 0 ? 0 : correctCount.value / totalCount.value
  );
  const currentQuestion = computed(() => questions.value[currentIndex.value] ?? null);
  const progress = computed(() => `${currentIndex.value + 1}/${questions.value.length}`);

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

  async function init(cfg: SessionConfig) {
    stopTimer();
    try {
      const qs = generateBasicAddSub(cfg.count);
      questions.value = qs;
      currentIndex.value = 0;
      currentAnswer.value = "";
      records.value = [];
      elapsedMs.value = 0;
      error.value = null;
      config.value = cfg;
      const id = await insertSession({
        type: cfg.type,
        subtype: cfg.subtype,
        difficulty: "normal",
        total: cfg.count,
        nback: 0,
      });
      sessionId.value = id;
      timeStandard.value = await getTimeStandard(cfg.type, cfg.count);
      phase.value = "running";
      startTimer();
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      phase.value = "idle";
    }
  }

  function inputChar(c: string) {
    currentAnswer.value += c;
  }

  function toggleSign() {
    if (currentAnswer.value.startsWith("-")) {
      currentAnswer.value = currentAnswer.value.slice(1);
    } else {
      currentAnswer.value = "-" + currentAnswer.value;
    }
  }

  function clearAnswer() {
    currentAnswer.value = "";
  }

  function backspace() {
    currentAnswer.value = currentAnswer.value.slice(0, -1);
  }

  async function submit() {
    const q = currentQuestion.value;
    if (q === null) return;
    if (currentAnswer.value === "") return;
    const userAns = currentAnswer.value;
    const isCorrect = Number(userAns) === q.answer;
    const timeSpentMs =
      startedAt.value !== null ? Math.floor(performance.now() - startedAt.value) : 0;
    const record: AnswerRecord = {
      qIndex: currentIndex.value,
      question: q.display,
      userAnswer: userAns,
      trueAnswer: String(q.answer),
      isCorrect,
      timeSpentMs,
    };
    records.value.push(record);
    try {
      if (sessionId.value !== null) {
        await insertRecord({
          sessionId: sessionId.value,
          qIndex: record.qIndex,
          question: record.question,
          userAnswer: record.userAnswer,
          trueAnswer: record.trueAnswer,
          isCorrect: record.isCorrect,
          tolerance: 0,
          timeSpentMs: record.timeSpentMs,
        });
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    }
    currentAnswer.value = "";
    if (currentIndex.value + 1 >= questions.value.length) {
      await finish();
    } else {
      currentIndex.value += 1;
    }
  }

  async function finish() {
    stopTimer();
    try {
      if (sessionId.value !== null) {
        await updateSession(sessionId.value, {
          correct: correctCount.value,
          durationMs: elapsedMs.value,
        });
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    }
    phase.value = "finished";
  }

  async function restart() {
    stopTimer();
    if (config.value !== null) {
      await init(config.value);
    }
  }

  function reset() {
    stopTimer();
    phase.value = "idle";
    sessionId.value = null;
    config.value = null;
    questions.value = [];
    currentIndex.value = 0;
    currentAnswer.value = "";
    records.value = [];
    startedAt.value = null;
    elapsedMs.value = 0;
    error.value = null;
    timeStandard.value = null;
  }

  return {
    phase,
    sessionId,
    config,
    questions,
    currentIndex,
    currentAnswer,
    records,
    elapsedMs,
    error,
    timeStandard,
    correctCount,
    errorCount,
    totalCount,
    accuracy,
    currentQuestion,
    progress,
    init,
    inputChar,
    toggleSign,
    clearAnswer,
    backspace,
    submit,
    finish,
    restart,
    reset,
  };
});
