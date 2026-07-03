import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { generateBasicAddSub, type Question } from "@/generators/basic";
import { generateDataQuestion, type DataQuestion, type DataType } from "@/generators/dataAnalysis";
import { generateCompareQuestion, type CompareQuestion, type CompareType } from "@/generators/compareAnalysis";
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
  unit?: string;
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
  type AnyQuestion = Question | DataQuestion | CompareQuestion;
  const questions = ref<AnyQuestion[]>([]);
  const currentIndex = ref(0);
  const currentAnswer = ref("");
  const records = ref<AnswerRecord[]>([]);
  const startedAt = ref<number | null>(null);
  const questionStartedAt = ref<number | null>(null);
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

  const isDataType = computed(() => config.value?.type !== "basic_addsub");

  const questionCategory = computed<"numpad" | "compare" | "composite">(() => {
    const t = config.value?.type;
    if (!t) return "numpad";
    if (t.startsWith("compare_")) return "compare";
    if (t === "composite") return "composite";
    return "numpad";
  });

  const compareChoice = ref<">" | "<" | null>(null);

  const questionMeta = computed(() => {
    const q = currentQuestion.value;
    if (!q) return null;
    if ("tolerance" in q) {
      return {
        tolerance: q.tolerance,
        context: q.context,
        hint: q.hint,
        unit: q.unit,
        isData: true,
        display: q.display,
      };
    }
    return { isData: false, display: q.display };
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

  async function init(cfg: SessionConfig) {
    stopTimer();
    try {
      let qs: AnyQuestion[];
      if (cfg.type === "basic_addsub") {
        qs = generateBasicAddSub(cfg.count);
      } else if (cfg.type.startsWith("compare_")) {
        qs = generateCompareQuestion(cfg.type as CompareType, cfg.count);
      } else {
        qs = generateDataQuestion(cfg.type as DataType, cfg.count);
      }
      questions.value = qs;
      currentIndex.value = 0;
      currentAnswer.value = qs[0] && "preset" in qs[0] ? (qs[0].preset ?? "") : "";
      compareChoice.value = null;
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
      questionStartedAt.value = performance.now();
      phase.value = "running";
      startTimer();
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      phase.value = "idle";
    }
  }

  function selectCompare(choice: ">" | "<") {
    compareChoice.value = choice;
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
    // compare 模式分支
    if (questionCategory.value === "compare") {
      if (compareChoice.value === null) return; // 未选择守卫
      const cq = q as CompareQuestion;
      const isCorrect = compareChoice.value === cq.answer;
      const timeSpentMs =
        questionStartedAt.value !== null
          ? Math.floor(performance.now() - questionStartedAt.value)
          : 0;
      const record: AnswerRecord = {
        qIndex: currentIndex.value,
        question: `${cq.display.leftTex} ? ${cq.display.rightTex}`,
        userAnswer: compareChoice.value,
        trueAnswer: cq.answer,
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
      compareChoice.value = null;
      if (currentIndex.value + 1 >= questions.value.length) {
        await finish();
      } else {
        currentIndex.value += 1;
        questionStartedAt.value = performance.now();
      }
      return;
    }
    // 空答案守卫：空串、单负号、单"0." 视为未作答
    if (currentAnswer.value === "" || currentAnswer.value === "-" || currentAnswer.value === "0.") return;
    const userAns = Number(currentAnswer.value);
    let isCorrect: boolean;
    let tolerance: number;
    if ("tolerance" in q) {
      tolerance = q.tolerance;
      isCorrect = q.answer === 0
        ? userAns === 0
        : Math.abs(userAns - q.answer) / Math.abs(q.answer) <= tolerance;
    } else {
      tolerance = 0;
      isCorrect = userAns === q.answer;
    }
    const timeSpentMs =
      questionStartedAt.value !== null
        ? Math.floor(performance.now() - questionStartedAt.value)
        : 0;
    // compare 分支已 return，此处 q 必为 numpad/data 题型，收窄类型以安全访问 display/answer
    const qd = q as Question | DataQuestion;
    const record: AnswerRecord = {
      qIndex: currentIndex.value,
      question: qd.display,
      userAnswer: currentAnswer.value,
      trueAnswer: String(qd.answer),
      isCorrect,
      timeSpentMs,
      unit: "tolerance" in qd ? qd.unit : undefined,
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
          tolerance,
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
      questionStartedAt.value = performance.now();
      const next = questions.value[currentIndex.value];
      currentAnswer.value = next && "preset" in next ? (next.preset ?? "") : "";
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
    compareChoice.value = null;
    records.value = [];
    startedAt.value = null;
    questionStartedAt.value = null;
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
    isDataType,
    questionCategory,
    compareChoice,
    questionMeta,
    init,
    inputChar,
    selectCompare,
    toggleSign,
    clearAnswer,
    backspace,
    submit,
    finish,
    restart,
    reset,
  };
});
