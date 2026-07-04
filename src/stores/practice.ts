import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  generateBasicAddSub,
  generateBasic,
  type Question,
  type BasicType,
  type BasicQuestion,
} from "@/generators/basic";
import { generateDataQuestion, type DataQuestion, type DataType } from "@/generators/dataAnalysis";
import { generateCompareQuestion, type CompareQuestion, type CompareType } from "@/generators/compareAnalysis";
import {
  generateCustomStandard,
  generateCustomPower,
  type CustomStandardConfig,
  type CustomPowerConfig,
} from "@/generators/custom";
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
  tolerance?: number;
}

export interface SessionConfig {
  type: string;
  subtype: string;
  count: number;
  difficulty?: "easy" | "normal" | "hard";
  nback?: 0 | 1 | 2;
  customConfig?: CustomStandardConfig | CustomPowerConfig;
}

const BASIC_TYPES: Set<string> = new Set([
  "addsub_2d", "round_100", "add_3d", "sub_3d", "addsub_3d",
  "add_multi", "addsub_mix",
  "mul_2x1", "mul_3x1", "mul_2x11", "mul_2x15", "mul_2x2",
  "div_3x1", "div_3x2", "mul_est", "div_5x3", "div_3x4",
]);

export const usePracticeStore = defineStore("practice", () => {
  const phase = ref<"idle" | "running" | "finished">("idle");
  const sessionId = ref<number | null>(null);
  const config = ref<SessionConfig | null>(null);
  type AnyQuestion = Question | DataQuestion | CompareQuestion | BasicQuestion;
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
  let nbackEndGame = false;

  const nback = ref<0 | 1 | 2>(0);
  const pendingRecords = ref<AnswerRecord[]>([]);
  const nbackPrompting = ref(false);
  const nbackTarget = ref<{ index: number; question: string; trueAnswer: string; tolerance: number } | null>(null);
  const nbackAnswer = ref("");

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
    // DataQuestion 有 tolerance 无 a；BasicQuestion 有 a（tolerance 可选），用 !"a" in q 排除
    if ("tolerance" in q && !("a" in q)) {
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
      nback.value = cfg.nback ?? 0;
      pendingRecords.value = [];
      nbackPrompting.value = false;
      nbackTarget.value = null;
      nbackAnswer.value = "";
      nbackEndGame = false;

      let qs: AnyQuestion[];
      if (cfg.type === "custom_standard") {
        qs = generateCustomStandard(cfg.customConfig as CustomStandardConfig, cfg.count);
      } else if (cfg.type === "custom_power") {
        qs = generateCustomPower(cfg.customConfig as CustomPowerConfig, cfg.count);
      } else if (BASIC_TYPES.has(cfg.type)) {
        qs = generateBasic(cfg.type as BasicType, cfg.count);
      } else if (cfg.type === "basic_addsub") {
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
        difficulty: cfg.difficulty ?? "normal",
        total: cfg.count,
        nback: cfg.nback ?? 0,
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
    if (nbackPrompting.value) return; // 由 submitNback 处理
    const q = currentQuestion.value;
    if (q === null) return;
    // compare 模式分支（compare 题型不启用 N-back）
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
    // DataQuestion 有 tolerance 无 a；BasicQuestion 有 a（tolerance 可选），用 !"a" in q 区分
    if ("tolerance" in q && !("a" in q)) {
      tolerance = q.tolerance;
      isCorrect = q.answer === 0
        ? userAns === 0
        : Math.abs(userAns - q.answer) / Math.abs(q.answer) <= tolerance;
    } else {
      // basic 题型：检查 BasicQuestion.tolerance（mul_est 用 0.02）
      const bq = q as BasicQuestion;
      tolerance = bq.tolerance ?? 0;
      if (tolerance > 0) {
        isCorrect = bq.answer === 0
          ? userAns === 0
          : Math.abs(userAns - bq.answer) / Math.abs(bq.answer) <= tolerance;
      } else {
        isCorrect = userAns === bq.answer;
      }
    }
    const timeSpentMs =
      questionStartedAt.value !== null
        ? Math.floor(performance.now() - questionStartedAt.value)
        : 0;
    // compare 分支已 return，此处 q 必为 numpad/data/basic 题型，收窄类型以安全访问 display/answer
    const qd = q as Question | DataQuestion | BasicQuestion;
    const record: AnswerRecord = {
      qIndex: currentIndex.value,
      question: qd.display,
      userAnswer: currentAnswer.value,
      trueAnswer: String(qd.answer),
      isCorrect,
      timeSpentMs,
      unit: "unit" in qd ? qd.unit : undefined,
      tolerance,
    };

    if (nback.value === 0) {
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
    } else {
      pendingRecords.value.push(record);
    }

    currentAnswer.value = "";
    const isLast = currentIndex.value + 1 >= questions.value.length;
    if (!isLast) {
      currentIndex.value += 1;
      questionStartedAt.value = performance.now();
      const next = questions.value[currentIndex.value];
      currentAnswer.value = next && "preset" in next ? (next.preset ?? "") : "";
    }

    // N-back 回收检查：pendingRecords.length > n 时回收最早的
    if (nback.value > 0 && pendingRecords.value.length > nback.value) {
      const target = pendingRecords.value.shift()!;
      nbackTarget.value = {
        index: target.qIndex,
        question: target.question,
        trueAnswer: target.trueAnswer,
        tolerance: target.tolerance ?? 0,
      };
      nbackAnswer.value = "";
      nbackPrompting.value = true;
      nbackEndGame = isLast;
    }

    if (isLast && nback.value === 0) {
      await finish();
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

  function setNbackAnswer(v: string) {
    nbackAnswer.value = v;
  }

  async function submitNback() {
    if (!nbackPrompting.value || nbackTarget.value === null) return;
    const target = nbackTarget.value;
    const userAns = Number(nbackAnswer.value);
    const trueAns = Number(target.trueAnswer);
    let isCorrect: boolean;
    if (target.tolerance > 0) {
      isCorrect = trueAns === 0
        ? userAns === 0
        : Math.abs(userAns - trueAns) / Math.abs(trueAns) <= target.tolerance;
    } else {
      isCorrect = userAns === trueAns;
    }
    const record: AnswerRecord = {
      qIndex: target.index,
      question: target.question,
      userAnswer: nbackAnswer.value,
      trueAnswer: target.trueAnswer,
      isCorrect,
      timeSpentMs: 0,
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
          tolerance: target.tolerance,
          timeSpentMs: 0,
        });
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    }
    nbackPrompting.value = false;
    nbackTarget.value = null;
    nbackAnswer.value = "";

    // 仅在最后一题答完（末尾收尾）时逐个回收剩余 pending；否则等待下一题 submit 触发回收
    if (nbackEndGame) {
      if (pendingRecords.value.length > 0) {
        const next = pendingRecords.value.shift()!;
        nbackTarget.value = {
          index: next.qIndex,
          question: next.question,
          trueAnswer: next.trueAnswer,
          tolerance: next.tolerance ?? 0,
        };
        nbackPrompting.value = true;
      } else {
        await finish();
      }
    }
  }

  async function skipNback() {
    if (!nbackPrompting.value || nbackTarget.value === null) return;
    const target = nbackTarget.value;
    const record: AnswerRecord = {
      qIndex: target.index,
      question: target.question,
      userAnswer: "",
      trueAnswer: target.trueAnswer,
      isCorrect: false,
      timeSpentMs: 0,
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
          isCorrect: false,
          tolerance: target.tolerance,
          timeSpentMs: 0,
        });
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    }
    nbackPrompting.value = false;
    nbackTarget.value = null;
    nbackAnswer.value = "";
    // 仅在最后一题答完（末尾收尾）时逐个回收剩余 pending；否则等待下一题 submit 触发回收
    if (nbackEndGame) {
      if (pendingRecords.value.length > 0) {
        const next = pendingRecords.value.shift()!;
        nbackTarget.value = {
          index: next.qIndex,
          question: next.question,
          trueAnswer: next.trueAnswer,
          tolerance: next.tolerance ?? 0,
        };
        nbackPrompting.value = true;
      } else {
        await finish();
      }
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
    nback.value = 0;
    pendingRecords.value = [];
    nbackPrompting.value = false;
    nbackTarget.value = null;
    nbackAnswer.value = "";
    nbackEndGame = false;
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
    nback,
    pendingRecords,
    nbackPrompting,
    nbackTarget,
    nbackAnswer,
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
    setNbackAnswer,
    submitNback,
    skipNback,
  };
});
