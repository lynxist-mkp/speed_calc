import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// mock db 层
vi.mock("@/db/index", () => ({
  insertSession: vi.fn().mockResolvedValue(42),
  insertRecord: vi.fn().mockResolvedValue(undefined),
  updateSession: vi.fn().mockResolvedValue(undefined),
  getTimeStandard: vi.fn().mockResolvedValue({ pass: 28, good: 22, excellent: 18 }),
}));

import { usePracticeStore } from "@/stores/practice";

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
