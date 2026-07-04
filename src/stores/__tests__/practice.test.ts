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

describe("N-back 状态机", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("nback=0 行为不变：提交立即入库", async () => {
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 3, nback: 0 });
    expect(store.nback).toBe(0);
    expect(store.pendingRecords).toHaveLength(0);

    store.inputChar("4");
    store.inputChar("6");
    await store.submit();
    expect(store.records).toHaveLength(1);
    expect(store.pendingRecords).toHaveLength(0);
    expect(insertRecord).toHaveBeenCalledTimes(1);
  });

  it("nback=1：前 1 题延迟入库", async () => {
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 3, nback: 1 });

    store.inputChar("4");
    store.inputChar("6");
    await store.submit();
    expect(store.records).toHaveLength(0);
    expect(store.pendingRecords).toHaveLength(1);
    expect(store.nbackPrompting).toBe(false);
    expect(insertRecord).not.toHaveBeenCalled();

    store.inputChar("1");
    store.inputChar("3");
    store.inputChar("4");
    await store.submit();
    expect(store.nbackPrompting).toBe(true);
    expect(store.nbackTarget).not.toBeNull();
    expect(store.nbackTarget!.index).toBe(0);
  });

  it("nback=1：回忆正确则前题判对入库", async () => {
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 3, nback: 1 });

    store.inputChar("4");
    store.inputChar("6");
    await store.submit();

    store.inputChar("1");
    store.inputChar("3");
    store.inputChar("4");
    await store.submit();
    expect(store.nbackPrompting).toBe(true);

    store.setNbackAnswer("46");
    await store.submitNback();
    expect(store.nbackPrompting).toBe(false);
    expect(store.records).toHaveLength(1);
    expect(store.records[0].isCorrect).toBe(true);
    expect(store.records[0].qIndex).toBe(0);
    expect(insertRecord).toHaveBeenCalledWith(expect.objectContaining({ qIndex: 0, isCorrect: true }));
  });

  it("nback=1：回忆错误则前题判错入库", async () => {
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 3, nback: 1 });

    store.inputChar("4");
    store.inputChar("6");
    await store.submit();

    store.inputChar("1");
    store.inputChar("3");
    store.inputChar("4");
    await store.submit();

    store.setNbackAnswer("99");
    await store.submitNback();
    expect(store.records[0].isCorrect).toBe(false);
  });

  it("nback=1 末尾收尾：最后一题答完回收剩余 pending", async () => {
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 3, nback: 1 });

    // 题 0
    store.inputChar("4");
    store.inputChar("6");
    await store.submit();

    // 题 1 → 回忆题 0
    store.inputChar("1");
    store.inputChar("3");
    store.inputChar("4");
    await store.submit();
    store.setNbackAnswer("46");
    await store.submitNback();

    // 题 2 → 回忆题 1
    store.inputChar("7");
    store.inputChar("8");
    await store.submit();
    expect(store.nbackPrompting).toBe(true);
    store.setNbackAnswer("134");
    await store.submitNback();

    // 末尾：还剩题 2 待回忆
    expect(store.nbackPrompting).toBe(true);
    expect(store.nbackTarget!.index).toBe(2);
    store.setNbackAnswer("78");
    await store.submitNback();

    expect(store.phase).toBe("finished");
    expect(store.records).toHaveLength(3);
    expect(store.pendingRecords).toHaveLength(0);
  });

  it("skipNback 视为答错", async () => {
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 3, nback: 1 });

    store.inputChar("4");
    store.inputChar("6");
    await store.submit();

    store.inputChar("1");
    store.inputChar("3");
    store.inputChar("4");
    await store.submit();

    await store.skipNback();
    expect(store.records[0].isCorrect).toBe(false);
    expect(store.nbackPrompting).toBe(false);
  });

  it("nback=2 端到端：题2答完才第一次弹窗，末尾连环回收剩余3题", async () => {
    const store = usePracticeStore();
    await store.init({ type: "basic_addsub", subtype: "两位数加减", count: 4, nback: 2 });
    expect(store.nback).toBe(2);
    expect(store.pendingRecords).toHaveLength(0);
    expect(store.nbackPrompting).toBe(false);
    // mock 答案循环：题0=46, 题1=134, 题2=78, 题3=46（循环回题0）

    // 题 0：pending 累积到 1，1 > 2 为 false，不弹窗
    store.currentAnswer = "46";
    await store.submit();
    expect(store.pendingRecords).toHaveLength(1);
    expect(store.nbackPrompting).toBe(false);
    expect(store.currentIndex).toBe(1);

    // 题 1：pending 累积到 2，2 > 2 为 false，不弹窗
    store.currentAnswer = "134";
    await store.submit();
    expect(store.pendingRecords).toHaveLength(2);
    expect(store.nbackPrompting).toBe(false);
    expect(store.currentIndex).toBe(2);

    // 题 2：pending 累积到 3，3 > 2 触发回收题 0
    store.currentAnswer = "78";
    await store.submit();
    expect(store.nbackPrompting).toBe(true);
    expect(store.nbackTarget!.index).toBe(0);
    expect(store.pendingRecords).toHaveLength(2); // shift 后剩 [1, 2]
    expect(store.currentIndex).toBe(3);

    // 回忆题 0（答 46）：题 2 不是最后一题，nbackEndGame=false，不连环
    store.setNbackAnswer("46");
    await store.submitNback();
    expect(store.nbackPrompting).toBe(false);
    expect(store.nbackTarget).toBeNull();

    // 题 3（最后一题）：pending 累积到 3，3 > 2 触发回收题 1，isLast=true → nbackEndGame=true
    store.currentAnswer = "46";
    await store.submit();
    expect(store.nbackPrompting).toBe(true);
    expect(store.nbackTarget!.index).toBe(1);
    expect(store.pendingRecords).toHaveLength(2); // 剩 [2, 3]

    // 回忆题 1（答 134）：nbackEndGame=true 连环回收题 2
    store.setNbackAnswer("134");
    await store.submitNback();
    expect(store.nbackPrompting).toBe(true);
    expect(store.nbackTarget!.index).toBe(2);
    expect(store.pendingRecords).toHaveLength(1); // 剩 [3]

    // 回忆题 2（答 78）：连环回收题 3
    store.setNbackAnswer("78");
    await store.submitNback();
    expect(store.nbackPrompting).toBe(true);
    expect(store.nbackTarget!.index).toBe(3);
    expect(store.pendingRecords).toHaveLength(0);

    // 回忆题 3（答 46）：pending 空，触发 finish
    store.setNbackAnswer("46");
    await store.submitNback();
    expect(store.nbackPrompting).toBe(false);
    expect(store.nbackTarget).toBeNull();
    expect(store.pendingRecords).toHaveLength(0);
    expect(store.phase).toBe("finished");
    expect(store.records).toHaveLength(4);
    expect(store.records.map((r) => r.qIndex)).toEqual([0, 1, 2, 3]);
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
