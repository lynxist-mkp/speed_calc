import { describe, it, expect } from "vitest";
import { generateBasicAddSub } from "@/generators/basic";

describe("generateBasicAddSub", () => {
  it("生成指定数量的题", () => {
    const qs = generateBasicAddSub(10);
    expect(qs).toHaveLength(10);
  });

  it("每题 a/b 在 10-99 范围", () => {
    const qs = generateBasicAddSub(50);
    for (const q of qs) {
      expect(q.a).toBeGreaterThanOrEqual(10);
      expect(q.a).toBeLessThanOrEqual(99);
      expect(q.b).toBeGreaterThanOrEqual(10);
      expect(q.b).toBeLessThanOrEqual(99);
    }
  });

  it("op 只能是 + 或 -", () => {
    const qs = generateBasicAddSub(50);
    for (const q of qs) {
      expect(["+", "-"]).toContain(q.op);
    }
  });

  it("减法结果非负", () => {
    const qs = generateBasicAddSub(100);
    for (const q of qs) {
      if (q.op === "-") {
        expect(q.answer).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("answer 计算正确", () => {
    const qs = generateBasicAddSub(100);
    for (const q of qs) {
      if (q.op === "+") expect(q.answer).toBe(q.a + q.b);
      if (q.op === "-") expect(q.answer).toBe(q.a - q.b);
    }
  });

  it("display 格式为 a{op}b=", () => {
    const qs = generateBasicAddSub(10);
    for (const q of qs) {
      expect(q.display).toMatch(/^\d{2}[+-]\d{2}=$/);
    }
  });

  it("边界 count=5 与 count=100", () => {
    expect(generateBasicAddSub(5)).toHaveLength(5);
    expect(generateBasicAddSub(100)).toHaveLength(100);
  });

  it("多次调用结果不全相同（随机性）", () => {
    const run1 = generateBasicAddSub(20).map((q) => q.display).join(",");
    const run2 = generateBasicAddSub(20).map((q) => q.display).join(",");
    expect(run1).not.toEqual(run2);
  });
});
