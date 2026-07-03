import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// mock db 层
vi.mock("@/db/index", () => ({
  insertSession: vi.fn().mockResolvedValue(42),
  insertRecord: vi.fn().mockResolvedValue(undefined),
  updateSession: vi.fn().mockResolvedValue(undefined),
  getTimeStandard: vi.fn().mockResolvedValue({ pass: 28, good: 22, excellent: 18 }),
}));

// mock 资料分析生成器
vi.mock("@/generators/dataAnalysis", () => ({
  generateDataQuestion: vi.fn(() => [
    {
      display: "\\frac{1000}{1.1} \\approx",
      answer: 909.09,
      tolerance: 0.03,
      context: "现期: 1000, 增长率: 10%",
    },
    {
      display: "\\frac{2000}{1.2} \\approx",
      answer: 1666.67,
      tolerance: 0.03,
      context: "现期: 2000, 增长率: 20%",
    },
  ]),
}));

import { usePracticeStore } from "@/stores/practice";
import { generateDataQuestion } from "@/generators/dataAnalysis";

describe("usePracticeStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("init 后进入 running 态并生成题目", async () => {
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 10 });
    expect(store.phase).toBe("running");
    expect(store.sessionId).toBe(42);
    expect(store.questions).toHaveLength(10);
    expect(store.currentIndex).toBe(0);
    expect(store.currentAnswer).toBe("");
  });

  it("inputChar 追加字符到 currentAnswer", () => {
    const store = usePracticeStore();
    store.inputChar("1");
    store.inputChar("2");
    expect(store.currentAnswer).toBe("12");
  });

  it("toggleSign 切换答案前缀正负", () => {
    const store = usePracticeStore();
    store.inputChar("5");
    store.toggleSign();
    expect(store.currentAnswer).toBe("-5");
    store.toggleSign();
    expect(store.currentAnswer).toBe("5");
  });

  it("clearAnswer 清空", () => {
    const store = usePracticeStore();
    store.inputChar("1");
    store.clearAnswer();
    expect(store.currentAnswer).toBe("");
  });

  it("backspace 删除末字符", () => {
    const store = usePracticeStore();
    store.inputChar("1");
    store.inputChar("2");
    store.backspace();
    expect(store.currentAnswer).toBe("1");
  });

  it("submit 判分正确并推进索引", async () => {
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 10 });
    // 找到第一题答案
    const firstQ = store.questions[0];
    store.inputChar(String(firstQ.answer));
    await store.submit();
    expect(store.records).toHaveLength(1);
    expect(store.records[0].isCorrect).toBe(true);
    expect(store.currentIndex).toBe(1);
    expect(store.currentAnswer).toBe("");
  });

  it("submit 判分错误也推进", async () => {
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 10 });
    const firstQ = store.questions[0];
    store.inputChar(String(firstQ.answer + 1));
    await store.submit();
    expect(store.records[0].isCorrect).toBe(false);
    expect(store.currentIndex).toBe(1);
  });

  it("最后一题 submit 后 finish 进入 finished 态", async () => {
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 2 });
    // 第一题
    store.inputChar(String(store.questions[0].answer));
    await store.submit();
    // 第二题（最后一题）
    store.inputChar(String(store.questions[1].answer));
    await store.submit();
    expect(store.phase).toBe("finished");
    expect(store.records).toHaveLength(2);
  });

  it("restart 清状态并重新 init（新 sessionId）", async () => {
    const { insertSession } = await import("@/db/index");
    const mockInsert = insertSession as ReturnType<typeof vi.fn>;
    mockInsert.mockReturnValueOnce(Promise.resolve(42));
    mockInsert.mockReturnValueOnce(Promise.resolve(43));
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 10 });
    store.inputChar("1");
    await store.submit();
    await store.restart();
    expect(store.sessionId).toBe(43); // 新 session id
    expect(store.currentIndex).toBe(0);
    expect(store.currentAnswer).toBe("");
    expect(store.records).toHaveLength(0);
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it("正确数统计正确", async () => {
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 3 });
    // 全答对
    store.inputChar(String(store.questions[0].answer));
    await store.submit();
    store.inputChar(String(store.questions[1].answer));
    await store.submit();
    store.inputChar(String(store.questions[2].answer));
    await store.submit();
    expect(store.phase).toBe("finished");
    expect(store.correctCount).toBe(3);
    expect(store.errorCount).toBe(0);
  });

  it("reset 清空所有状态回到 idle", async () => {
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 10 });
    store.inputChar("1");
    store.reset();
    expect(store.phase).toBe("idle");
    expect(store.sessionId).toBeNull();
    expect(store.questions).toHaveLength(0);
    expect(store.records).toHaveLength(0);
    expect(store.currentAnswer).toBe("");
  });

  it("init 失败时设置 error 并回到 idle", async () => {
    const { insertSession } = await import("@/db/index");
    const mockInsert = insertSession as ReturnType<typeof vi.fn>;
    mockInsert.mockRejectedValueOnce(new Error("DB down"));
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 10 });
    expect(store.error).toBe("DB down");
    expect(store.phase).toBe("idle");
  });
});

describe("L2 store 多题型调度", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("init 资料分析题型调度 generateDataQuestion", async () => {
    const store = usePracticeStore();
    await store.init({ type: "estimate_prev", subtype: "估算前期量", count: 2 });
    expect(generateDataQuestion).toHaveBeenCalledWith("estimate_prev", 2);
    expect(store.phase).toBe("running");
    expect(store.questions).toHaveLength(2);
  });

  it("isDataType computed 正确", async () => {
    const store = usePracticeStore();
    await store.init({ type: "estimate_prev", subtype: "估算前期量", count: 2 });
    expect(store.isDataType).toBe(true);
  });

  it("基础计算 isDataType=false", async () => {
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 2 });
    expect(store.isDataType).toBe(false);
  });

  it("questionMeta 返回资料分析元数据", async () => {
    const store = usePracticeStore();
    await store.init({ type: "estimate_prev", subtype: "估算前期量", count: 2 });
    expect(store.questionMeta).not.toBeNull();
    expect(store.questionMeta?.isData).toBe(true);
    expect(store.questionMeta?.tolerance).toBe(0.03);
    expect(store.questionMeta?.context).toContain("现期");
  });

  it("questionMeta 对无 context 的资料分析题型也返回 tolerance/unit", async () => {
    // baihua_frac 无 context 但有 tolerance/unit/hint
    (generateDataQuestion as ReturnType<typeof vi.fn>).mockReturnValueOnce([
      { display: "\\frac{1}{11} \\approx", answer: 9.09, tolerance: 0.02, hint: "写到小数点后一位即可", unit: "%" },
    ]);
    const store = usePracticeStore();
    await store.init({ type: "baihua_frac", subtype: "百化分", count: 1 });
    expect(store.questionMeta).not.toBeNull();
    expect(store.questionMeta?.isData).toBe(true);
    expect(store.questionMeta?.tolerance).toBe(0.02);
    expect(store.questionMeta?.unit).toBe("%");
    expect(store.questionMeta?.hint).toContain("小数点后一位");
  });

  it("submit 容差判分——边界内正确", async () => {
    const store = usePracticeStore();
    await store.init({ type: "estimate_prev", subtype: "估算前期量", count: 2 });
    store.currentAnswer = "930";
    await store.submit();
    expect(store.records[0].isCorrect).toBe(true);
  });

  it("submit 容差判分——边界外错误", async () => {
    const store = usePracticeStore();
    await store.init({ type: "estimate_prev", subtype: "估算前期量", count: 2 });
    store.currentAnswer = "1000";
    await store.submit();
    expect(store.records[0].isCorrect).toBe(false);
  });

  it("submit 空答案守卫——'-' 不提交", async () => {
    const store = usePracticeStore();
    await store.init({ type: "estimate_prev", subtype: "估算前期量", count: 2 });
    store.currentAnswer = "-";
    await store.submit();
    expect(store.records).toHaveLength(0);
  });

  it("submit 空答案守卫——'0.' 不提交", async () => {
    const store = usePracticeStore();
    await store.init({ type: "estimate_prev", subtype: "估算前期量", count: 2 });
    store.currentAnswer = "0.";
    await store.submit();
    expect(store.records).toHaveLength(0);
  });

  it("preset 预填——init 后 currentAnswer 为 preset", async () => {
    (generateDataQuestion as ReturnType<typeof vi.fn>).mockReturnValueOnce([
      { display: "test", answer: 0.5, tolerance: 0.02, preset: "0." },
    ]);
    const store = usePracticeStore();
    await store.init({ type: "frac_calc_lt", subtype: "分数计算", count: 1 });
    expect(store.currentAnswer).toBe("0.");
  });

  it("推进下一题时预填 next.preset", async () => {
    (generateDataQuestion as ReturnType<typeof vi.fn>).mockReturnValueOnce([
      { display: "q1", answer: 1, tolerance: 0.02 },
      { display: "q2", answer: 2, tolerance: 0.02, preset: "0." },
    ]);
    const store = usePracticeStore();
    await store.init({ type: "frac_calc_lt", subtype: "分数计算", count: 2 });
    store.currentAnswer = "1";
    await store.submit();
    expect(store.currentIndex).toBe(1);
    expect(store.currentAnswer).toBe("0.");
  });

  it("records.question 存 KaTeX 源串", async () => {
    const store = usePracticeStore();
    await store.init({ type: "estimate_prev", subtype: "估算前期量", count: 2 });
    store.currentAnswer = "909";
    await store.submit();
    expect(store.records[0].question).toContain("\\frac");
  });
});
