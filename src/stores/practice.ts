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

  const nback = ref<0 | 1 | 2>(0);
  const pendingRecords = ref<AnswerRecord[]>([]);

  const correctCount = computed(() => records.value.filter((r) => r.isCorrect).length);
  const errorCount = computed(() => records.value.filter((r) => !r.isCorrect).length);
  const totalCount = computed(() => records.value.length);
  const accuracy = computed(() =>
    totalCount.value === 0 ? 0 : correctCount.value / totalCount.value
  );
  const currentQuestion = computed(() => questions.value[currentIndex.value] ?? null);
  const progress = computed(() => `${currentIndex.value + 1}/${questions.value.length}`);

  // 正向枚举基础题型（含 basic_addsub + L4 17 题型 + custom_*），其余归资料分析
  const isDataType = computed(() => {
    const t = config.value?.type;
    if (!t) return false;
    if (t === "basic_addsub") return false;
    if (BASIC_TYPES.has(t)) return false;
    if (t.startsWith("custom_")) return false;
    return true; // 资料分析填空题（DataType）+ 比较题（compare_*）
  });

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

      // N-back 模式下额外生成 nback 道题，使判分题数 = cfg.count
      // （前 nback 题不输入不判分，最后 nback 题不判分，中间 cfg.count 题判分）
      // compare 题型不启用 N-back，无需扩展
      const actualCount =
        nback.value > 0 && !cfg.type.startsWith("compare_")
          ? cfg.count + nback.value
          : cfg.count;

      let qs: AnyQuestion[];
      if (cfg.type === "custom_standard") {
        qs = generateCustomStandard(cfg.customConfig as CustomStandardConfig, actualCount);
      } else if (cfg.type === "custom_power") {
        qs = generateCustomPower(cfg.customConfig as CustomPowerConfig, actualCount);
      } else if (BASIC_TYPES.has(cfg.type)) {
        qs = generateBasic(cfg.type as BasicType, actualCount);
      } else if (cfg.type === "basic_addsub") {
        qs = generateBasicAddSub(actualCount);
      } else if (cfg.type.startsWith("compare_")) {
        qs = generateCompareQuestion(cfg.type as CompareType, actualCount);
      } else {
        qs = generateDataQuestion(cfg.type as DataType, actualCount, cfg.difficulty);
      }
      questions.value = qs;
      currentIndex.value = 0;
      currentAnswer.value = qs[0] && "preset" in qs[0] ? (qs[0].preset ?? "") : "";
      compareChoice.value = null;
      records.value = [];
      elapsedMs.value = 0;
      error.value = null;
      config.value = cfg;
      // 延迟到 finish() 才落库，避免未完成练习留下脏数据
      sessionId.value = null;
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

  // 判分：用 target.userAnswer vs target.trueAnswer，按容差判定
  function judgeRecord(target: AnswerRecord): void {
    const userAns = Number(target.userAnswer);
    const trueAns = Number(target.trueAnswer);
    const tol = target.tolerance ?? 0;
    if (tol > 0) {
      target.isCorrect = trueAns === 0
        ? userAns === 0
        : Math.abs(userAns - trueAns) / Math.abs(trueAns) <= tol;
    } else {
      target.isCorrect = userAns === trueAns;
    }
  }

  async function submit() {
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
      compareChoice.value = null;
      if (currentIndex.value + 1 >= questions.value.length) {
        await finish();
      } else {
        currentIndex.value += 1;
        questionStartedAt.value = performance.now();
      }
      return;
    }

    const k = currentIndex.value;
    const isLast = k + 1 >= questions.value.length;
    const qd = q as Question | DataQuestion | BasicQuestion;
    let tolerance: number;
    if ("tolerance" in q && !("a" in q)) {
      tolerance = q.tolerance;
    } else {
      const bq = q as BasicQuestion;
      tolerance = bq.tolerance ?? 0;
    }
    const timeSpentMs =
      questionStartedAt.value !== null
        ? Math.floor(performance.now() - questionStartedAt.value)
        : 0;

    function buildCurrentRecord(userAnswer: string): AnswerRecord {
      return {
        qIndex: k,
        question: qd.display,
        userAnswer,
        trueAnswer: String(qd.answer),
        isCorrect: false,
        timeSpentMs,
        unit: "unit" in qd ? qd.unit : undefined,
        tolerance,
      };
    }

    function advance() {
      currentAnswer.value = "";
      if (!isLast) {
        currentIndex.value += 1;
        questionStartedAt.value = performance.now();
        const next = questions.value[currentIndex.value];
        currentAnswer.value = next && "preset" in next ? (next.preset ?? "") : "";
      }
    }

    if (nback.value === 0) {
      // 立即判分模式：空答案守卫
      if (currentAnswer.value === "" || currentAnswer.value === "-" || currentAnswer.value === "0.") return;
      const record = buildCurrentRecord(currentAnswer.value);
      judgeRecord(record);
      records.value.push(record);
      advance();
      if (isLast) await finish();
      return;
    }

    // N-back 模式（nback > 0）：传统 N-back
    // 前 N 题（k < nback）：不输入、不守卫、不判分，仅暂存
    if (k < nback.value) {
      pendingRecords.value.push(buildCurrentRecord(""));
      advance();
      if (isLast) {
        pendingRecords.value = [];
        await finish();
      }
      return;
    }

    // k >= nback：用户输入的是前第 N 题的回忆答案
    // 空答案守卫（必须提供回忆答案）
    if (currentAnswer.value === "" || currentAnswer.value === "-" || currentAnswer.value === "0.") return;
    // 取出最早的 pending record（前第 N 题），用当前输入判分
    const target = pendingRecords.value.shift()!;
    target.userAnswer = currentAnswer.value;
    judgeRecord(target);
    records.value.push(target);
    // 当前题入 pending（等待后续题回忆，或最后 N 题不判分）
    pendingRecords.value.push(buildCurrentRecord(""));
    advance();
    if (isLast) {
      // 最后 N 题不判分，直接清空 pending 并结束
      pendingRecords.value = [];
      await finish();
    }
  }

  async function finish() {
    stopTimer();
    try {
      if (config.value !== null) {
        // 延迟落库：finish 时才创建 session + 写入所有 records
        // 避免未完成练习（退出/重开/关 app）留下脏数据
        const id = await insertSession({
          type: config.value.type,
          subtype: config.value.subtype,
          difficulty: config.value.difficulty ?? "normal",
          total: config.value.count,
          nback: config.value.nback ?? 0,
        });
        sessionId.value = id;
        for (const r of records.value) {
          await insertRecord({
            sessionId: id,
            qIndex: r.qIndex,
            question: r.question,
            userAnswer: r.userAnswer,
            trueAnswer: r.trueAnswer,
            isCorrect: r.isCorrect,
            tolerance: r.tolerance ?? 0,
            timeSpentMs: r.timeSpentMs,
          });
        }
        await updateSession(id, {
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
    nback.value = 0;
    pendingRecords.value = [];
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
