import { describe, it, expect, beforeEach, vi } from "vitest";

// mock @tauri-apps/plugin-sql 的 Database.load
const mockSelect = vi.fn();
const mockExecute = vi.fn();
vi.mock("@tauri-apps/plugin-sql", () => ({
  default: {
    load: vi.fn(() =>
      Promise.resolve({ select: mockSelect, execute: mockExecute, close: vi.fn() })
    ),
  },
}));

import { getTimeStandard, insertSession, insertRecord, updateSession, listSessions } from "@/db/index";

describe("db/index.ts", () => {
  beforeEach(() => {
    mockSelect.mockReset();
    mockExecute.mockReset();
  });

  describe("getTimeStandard", () => {
    it("命中题型+题量返回标准", async () => {
      mockSelect.mockResolvedValueOnce([
        { pass_s: 28, good_s: 22, excellent_s: 18 },
      ]);
      const r = await getTimeStandard("basic_addsub", 10);
      expect(r).toEqual({ pass: 28, good: 22, excellent: 18 });
    });

    it("未命中题量时降级返回同题型最接近且<=的档", async () => {
      // 第一次查询 count=7 无结果
      mockSelect.mockResolvedValueOnce([]);
      // 第二次查询同题型所有行（取 count<=7 最近，即无，回退查所有 <= 实际逻辑取最大 count<=target）
      mockSelect.mockResolvedValueOnce([
        { question_count: 10, pass_s: 28, good_s: 22, excellent_s: 18 },
        { question_count: 15, pass_s: 42, good_s: 33, excellent_s: 27 },
      ]);
      const r = await getTimeStandard("basic_addsub", 7);
      // 7 < 10 < 15，取 10 档降级
      expect(r).toEqual({ pass: 28, good: 22, excellent: 18 });
    });

    it("题型完全不存在返回 null", async () => {
      mockSelect.mockResolvedValueOnce([]);
      mockSelect.mockResolvedValueOnce([]);
      const r = await getTimeStandard("unknown_type", 10);
      expect(r).toBeNull();
    });
  });

  describe("insertSession", () => {
    it("插入会话返回 id", async () => {
      mockExecute.mockResolvedValueOnce({ lastInsertId: 42 });
      const id = await insertSession({
        type: "basic_addsub",
        subtype: "两位数加减",
        difficulty: "normal",
        total: 10,
        nback: 0,
      });
      expect(id).toBe(42);
      expect(mockExecute).toHaveBeenCalledOnce();
    });
  });

  describe("insertRecord", () => {
    it("插入答题记录", async () => {
      mockExecute.mockResolvedValueOnce({ lastInsertId: 1 });
      await insertRecord({
        sessionId: 42,
        qIndex: 0,
        question: "61+84=",
        userAnswer: "145",
        trueAnswer: "145",
        isCorrect: true,
        tolerance: 0,
        timeSpentMs: 3000,
      });
      expect(mockExecute).toHaveBeenCalledOnce();
    });
  });

  describe("updateSession", () => {
    it("更新会话正确数与总时长", async () => {
      await updateSession(42, { correct: 8, durationMs: 120000 });
      expect(mockExecute).toHaveBeenCalledOnce();
    });
  });

  describe("listSessions", () => {
    it("按 created_at DESC 返回会话列表", async () => {
      mockSelect.mockResolvedValueOnce([
        { id: 2, type: "basic_addsub", total: 10, correct: 9, duration_ms: 60000, created_at: 1700000002 },
        { id: 1, type: "basic_addsub", total: 10, correct: 7, duration_ms: 90000, created_at: 1700000001 },
      ]);
      const list = await listSessions();
      expect(list).toHaveLength(2);
      expect(list[0].id).toBe(2);
    });
  });
});
