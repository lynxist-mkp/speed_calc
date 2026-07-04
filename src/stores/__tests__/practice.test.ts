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

// mock basic 生成器：generateBasicAddSub 按 count 循环返回固定题目（保证 N-back 测试的确定性答案，同时不破坏现有 count-based 测试）
vi.mock("@/generators/basic", async () => {
  const actual = await vi.importActual<typeof import("@/generators/basic")>("@/generators/basic");
  const base = [
    { a: 12, b: 34, op: "+" as const, answer: 46, display: "12+34=" },
    { a: 56, b: 78, op: "+" as const, answer: 134, display: "56+78=" },
    { a: 90, b: 12, op: "-" as const, answer: 78, display: "90-12=" },
  ];
  return {
    ...actual,
    generateBasicAddSub: vi.fn((count: number) =>
      Array.from({ length: count }, (_, i) => ({ ...base[i % base.length] }))
    ),
    generateBasic: vi.fn(() => [
      { a: 100, b: 200, op: "+", answer: 300, display: "100+200=" },
      { a: 300, b: 400, op: "+", answer: 700, display: "300+400=" },
      { a: 500, b: 600, op: "+", answer: 1100, display: "500+600=" },
    ]),
  };
});

vi.mock("@/generators/custom", () => ({
  generateCustomStandard: vi.fn(() => [
    { a: 10, b: 5, op: "+", answer: 15, display: "10+5=" },
  ]),
  generateCustomPower: vi.fn(() => [
    { a: 2, b: 2, op: "×", answer: 4, display: "2²=" },
  ]),
}));

import { usePracticeStore } from "@/stores/practice";
import { generateDataQuestion } from "@/generators/dataAnalysis";
import { generateBasic } from "@/generators/basic";
import { insertRecord } from "@/db/index";

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
    store.inputChar(String(Number(firstQ.answer) + 1));
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
    expect(generateDataQuestion).toHaveBeenCalledWith("estimate_prev", 2, undefined);
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

  it("L4 新增基础题型 isDataType=false（addsub_2d）", async () => {
    const store = usePracticeStore();
    await store.init({ type: "addsub_2d", subtype: "两位数加减", count: 2 });
    expect(store.isDataType).toBe(false);
  });

  it("L4 新增基础题型 isDataType=false（mul_2x2）", async () => {
    const store = usePracticeStore();
    await store.init({ type: "mul_2x2", subtype: "两位数乘两位数", count: 2 });
    expect(store.isDataType).toBe(false);
  });

  it("L4 新增基础题型 isDataType=false（div_3x4）", async () => {
    const store = usePracticeStore();
    await store.init({ type: "div_3x4", subtype: "三位数除四位数", count: 2 });
    expect(store.isDataType).toBe(false);
  });

  it("自定义运算 isDataType=false（custom_standard）", async () => {
    const store = usePracticeStore();
    await store.init({
      type: "custom_standard",
      subtype: "自定义",
      count: 1,
      customConfig: { firstDigits: 2, operators: ["+"], secondMode: "random_digits", secondDigits: 1 } as any,
    });
    expect(store.isDataType).toBe(false);
  });

  it("自定义运算 isDataType=false（custom_power）", async () => {
    const store = usePracticeStore();
    await store.init({
      type: "custom_power",
      subtype: "幂运算",
      count: 1,
      customConfig: { baseMode: "digits", baseDigits: 2, powerTypes: [2] } as any,
    });
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

  it("submit 记录 unit 字段（百分数题型带 unit=%）", async () => {
    (generateDataQuestion as ReturnType<typeof vi.fn>).mockReturnValueOnce([
      { display: "\\frac{1}{11} \\approx", answer: 9.09, tolerance: 0.02, hint: "写到小数点后一位即可", unit: "%" },
      { display: "\\frac{1}{12} \\approx", answer: 8.33, tolerance: 0.02, hint: "写到小数点后一位即可", unit: "%" },
    ]);
    const store = usePracticeStore();
    await store.init({ type: "baihua_frac", subtype: "百化分", count: 2 });
    store.currentAnswer = "9.1";
    await store.submit();
    expect(store.records[0].unit).toBe("%");
    expect(store.records[0].trueAnswer).toBe("9.09");
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

describe("store compare 模式", () => {
  it("questionCategory: compare_ 开头 → compare", () => {
    const store = usePracticeStore();
    store.init({
      type: "compare_growth",
      subtype: "增量比大小",
      count: 5,
    });
    // init 是异步的，但 config 在 await 之前已设置
    expect(store.questionCategory).toBe("compare");
  });

  it("questionCategory: basic_addsub → numpad", () => {
    const store = usePracticeStore();
    store.init({ type: "basic_addsub", subtype: "基础加减", count: 5 });
    expect(store.questionCategory).toBe("numpad");
  });

  it("selectCompare 设置 compareChoice", () => {
    const store = usePracticeStore();
    store.selectCompare(">");
    expect(store.compareChoice).toBe(">");
    store.selectCompare("<");
    expect(store.compareChoice).toBe("<");
  });

  it("compare 模式 submit：选择 > 且答案 > → 正确", async () => {
    const store = usePracticeStore();
    await store.init({ type: "compare_growth", subtype: "增量比大小", count: 1 });
    // 找到第一题答案
    const q = store.currentQuestion as any;
    store.selectCompare(q.answer);
    await store.submit();
    expect(store.records[0].isCorrect).toBe(true);
    expect(store.records[0].userAnswer).toBe(q.answer);
    expect(store.records[0].trueAnswer).toBe(q.answer);
  });

  it("compare 模式 submit：选错 → 错误", async () => {
    const store = usePracticeStore();
    await store.init({ type: "compare_growth", subtype: "增量比大小", count: 1 });
    const q = store.currentQuestion as any;
    const wrong: ">" | "<" = q.answer === ">" ? "<" : ">";
    store.selectCompare(wrong);
    await store.submit();
    expect(store.records[0].isCorrect).toBe(false);
  });

  it("compare 模式 submit 守卫：未 select 时不提交", async () => {
    const store = usePracticeStore();
    await store.init({ type: "compare_growth", subtype: "增量比大小", count: 1 });
    const beforeLen = store.records.length;
    await store.submit();
    expect(store.records.length).toBe(beforeLen); // 未增加
  });

  it("compare 模式 submit 后 compareChoice 清空", async () => {
    const store = usePracticeStore();
    await store.init({ type: "compare_frac", subtype: "分数比大小", count: 2 });
    const q = store.currentQuestion as any;
    store.selectCompare(q.answer);
    await store.submit();
    expect(store.compareChoice).toBeNull();
  });
});

describe("N-back 延迟回忆模式", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // mock 答案循环：题0=46, 题1=134, 题2=78, 题3=46, 题4=134, 题5=78

  it("nback=0：立即判分入库（行为不变）", async () => {
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 3, nback: 0 });

    store.currentAnswer = "46";
    await store.submit();
    expect(store.records).toHaveLength(1);
    expect(store.records[0].isCorrect).toBe(true);
    expect(store.records[0].qIndex).toBe(0);
    expect(store.records[0].userAnswer).toBe("46");
    expect(store.pendingRecords).toHaveLength(0);
    expect(insertRecord).toHaveBeenCalledTimes(1);
  });

  it("nback=1 count=3：实际生成 4 题，判分 3 题（题 0/1/2），题 3 不判分", async () => {
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 3, nback: 1 });
    // 实际生成 count+nback = 4 题：题0=46, 题1=134, 题2=78, 题3=46

    expect(store.questions).toHaveLength(4); // 实际 4 题
    expect(store.progress).toBe("1/4"); // 进度显示 1/4

    // 题 0（k=0 < N=1）：前 1 题，不输入，不判分
    store.currentAnswer = "";
    await store.submit();
    expect(store.records).toHaveLength(0); // 不判分
    expect(store.pendingRecords).toHaveLength(1); // 题 0 record 暂存
    expect(store.currentIndex).toBe(1); // 推进到题 1

    // 题 1（k=1 >= N=1）：输入回忆题 0 答案 46，判分题 0
    store.currentAnswer = "46";
    await store.submit();
    expect(store.records).toHaveLength(1); // 题 0 判分
    expect(store.records[0].qIndex).toBe(0);
    expect(store.records[0].isCorrect).toBe(true); // 46 vs 46
    expect(store.records[0].userAnswer).toBe("46");
    expect(store.pendingRecords).toHaveLength(1); // 题 1 record 暂存
    expect(store.currentIndex).toBe(2);

    // 题 2（k=2 >= N=1）：输入回忆题 1 答案 134，判分题 1
    store.currentAnswer = "134";
    await store.submit();
    expect(store.records).toHaveLength(2); // 题 0 + 题 1 判分
    expect(store.records[1].qIndex).toBe(1);
    expect(store.records[1].isCorrect).toBe(true); // 134 vs 134

    // 题 3（k=3 >= N=1，最后一题）：输入回忆题 2 答案 78，判分题 2
    store.currentAnswer = "78";
    await store.submit();
    expect(store.phase).toBe("finished");
    expect(store.records).toHaveLength(3); // 题 0、1、2 判分
    expect(store.records[2].qIndex).toBe(2);
    expect(store.records[2].isCorrect).toBe(true); // 78 vs 78
    // 题 3 不判分（最后 N=1 题）
  });

  it("nback=1 答错回忆：题 0 回忆错，判分为错", async () => {
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 3, nback: 1 });
    // 实际 4 题

    // 题 0：不输入
    store.currentAnswer = "";
    await store.submit();

    // 题 1：输入错误回忆 99（正确答案 46）
    store.currentAnswer = "99";
    await store.submit();
    expect(store.records).toHaveLength(1);
    expect(store.records[0].qIndex).toBe(0);
    expect(store.records[0].isCorrect).toBe(false); // 99 ≠ 46
    expect(store.records[0].userAnswer).toBe("99");
  });

  it("nback=1 前 N 题空答案不守卫（允许空提交推进）", async () => {
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 3, nback: 1 });

    // 题 0：空答案也能提交（前 N 题不守卫）
    store.currentAnswer = "";
    await store.submit();
    expect(store.currentIndex).toBe(1); // 推进了
  });

  it("nback=1 从第 N+1 题开始空答案守卫", async () => {
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 3, nback: 1 });

    // 题 0：空答案提交（前 N 题）
    store.currentAnswer = "";
    await store.submit();

    // 题 1：空答案守卫（k >= N，必须输入回忆答案）
    store.currentAnswer = "";
    await store.submit();
    expect(store.currentIndex).toBe(1); // 未推进
    expect(store.records).toHaveLength(0); // 未判分
  });

  it("nback=2 count=5：实际生成 7 题，判分 5 题（题 0-4），题 5/6 不判分", async () => {
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 5, nback: 2 });
    // 实际生成 count+nback = 7 题
    expect(store.questions).toHaveLength(7);
    // mock 循环：题0=46, 题1=134, 题2=78, 题3=46, 题4=134, 题5=78, 题6=46

    // 题 0（k=0 < N=2）：不输入
    store.currentAnswer = "";
    await store.submit();
    expect(store.records).toHaveLength(0);
    expect(store.pendingRecords).toHaveLength(1);

    // 题 1（k=1 < N=2）：不输入
    store.currentAnswer = "";
    await store.submit();
    expect(store.records).toHaveLength(0);
    expect(store.pendingRecords).toHaveLength(2);

    // 题 2（k=2 >= N=2）：输入回忆题 0 答案 46，判分题 0
    store.currentAnswer = "46";
    await store.submit();
    expect(store.records).toHaveLength(1);
    expect(store.records[0].qIndex).toBe(0);
    expect(store.records[0].isCorrect).toBe(true);
    expect(store.pendingRecords).toHaveLength(2); // 题 1、2 暂存

    // 题 3（k=3 >= N=2）：输入回忆题 1 答案 134，判分题 1
    store.currentAnswer = "134";
    await store.submit();
    expect(store.records).toHaveLength(2);
    expect(store.records[1].qIndex).toBe(1);
    expect(store.records[1].isCorrect).toBe(true);

    // 题 4（k=4 >= N=2）：输入回忆题 2 答案 78，判分题 2
    store.currentAnswer = "78";
    await store.submit();
    expect(store.records).toHaveLength(3);
    expect(store.records[2].qIndex).toBe(2);
    expect(store.records[2].isCorrect).toBe(true);

    // 题 5（k=5 >= N=2）：输入回忆题 3 答案 46，判分题 3
    store.currentAnswer = "46";
    await store.submit();
    expect(store.records).toHaveLength(4);
    expect(store.records[3].qIndex).toBe(3);
    expect(store.records[3].isCorrect).toBe(true);

    // 题 6（k=6 >= N=2，最后一题）：输入回忆题 4 答案 134，判分题 4
    store.currentAnswer = "134";
    await store.submit();
    expect(store.phase).toBe("finished");
    expect(store.records).toHaveLength(5); // 题 0-4 判分，共 5 道
    expect(store.records[4].qIndex).toBe(4);
    expect(store.records[4].isCorrect).toBe(true);
    // 题 5、6 不判分（最后 N=2 题）
  });

  it("nback=1 count=5：端到端 6 题，判分 5 题（题 0-4）", async () => {
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 5, nback: 1 });
    // 实际 6 题：题0=46, 题1=134, 题2=78, 题3=46, 题4=134, 题5=78
    expect(store.questions).toHaveLength(6);
    expect(store.progress).toBe("1/6");

    // 题 0：不输入
    store.currentAnswer = "";
    await store.submit();
    // 题 1：输入 46（回忆题 0）
    store.currentAnswer = "46";
    await store.submit();
    // 题 2：输入 134（回忆题 1）
    store.currentAnswer = "134";
    await store.submit();
    // 题 3：输入 78（回忆题 2）
    store.currentAnswer = "78";
    await store.submit();
    // 题 4：输入 46（回忆题 3）
    store.currentAnswer = "46";
    await store.submit();
    // 题 5：输入 134（回忆题 4）
    store.currentAnswer = "134";
    await store.submit();

    expect(store.phase).toBe("finished");
    expect(store.records).toHaveLength(5); // 题 0-4 判分，共 5 道
    expect(store.records.map((r) => r.qIndex)).toEqual([0, 1, 2, 3, 4]);
    expect(store.records.every((r) => r.isCorrect)).toBe(true);
  });

  it("nback=0 count=3：不扩展题数（行为不变）", async () => {
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 3, nback: 0 });
    expect(store.questions).toHaveLength(3); // nback=0 不扩展
  });

  it("compare 题型不扩展题数（即使 nback>0）", async () => {
    const store = usePracticeStore();
    await store.init({ type: "compare_growth", subtype: "增量比大小", count: 5, nback: 1 });
    // compare 题型不启用 N-back，不扩展
    expect(store.questions).toHaveLength(5);
  });
});

describe("init 支持 basic 类型调度", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("init 用 addsub_2d 走 generateBasic", async () => {
    const store = usePracticeStore();
    await store.init({ type: "addsub_2d", subtype: "两位数加减", count: 3 });
    expect(store.phase).toBe("running");
    expect(store.questions).toHaveLength(3);
    expect(generateBasic).toHaveBeenCalledWith("addsub_2d", 3);
  });

  it("init 用 add_3d 走 generateBasic", async () => {
    const store = usePracticeStore();
    await store.init({ type: "add_3d", subtype: "三位数加法", count: 5 });
    expect(generateBasic).toHaveBeenCalledWith("add_3d", 5);
  });
});
