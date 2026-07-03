import { describe, it, expect } from "vitest";
import { generateDataQuestion, type DataType } from "@/generators/dataAnalysis";

describe("generateDataQuestion", () => {
  describe("通用", () => {
    it("生成指定数量的题", () => {
      const qs = generateDataQuestion("estimate_prev", 10);
      expect(qs).toHaveLength(10);
    });

    it("每题含 display/answer/tolerance 必填字段", () => {
      const qs = generateDataQuestion("baihua_frac", 5);
      for (const q of qs) {
        expect(typeof q.display).toBe("string");
        expect(q.display.length).toBeGreaterThan(0);
        expect(typeof q.answer).toBe("number");
        expect(typeof q.tolerance).toBe("number");
        expect(q.tolerance).toBeGreaterThan(0);
        expect(q.tolerance).toBeLessThanOrEqual(0.05);
      }
    });
  });

  describe("estimate_prev 估算前期量", () => {
    it("答案 = A/(1+r)", () => {
      const qs = generateDataQuestion("estimate_prev", 20);
      for (const q of qs) {
        expect(q.tolerance).toBe(0.03);
        expect(q.answer).toBeGreaterThan(0);
      }
    });

    it("display 含 \\frac 和 \\approx", () => {
      const qs = generateDataQuestion("estimate_prev", 5);
      for (const q of qs) {
        expect(q.display).toContain("\\frac");
        expect(q.display).toContain("\\approx");
      }
    });

    it("context 含 现期 和 增长率", () => {
      const qs = generateDataQuestion("estimate_prev", 5);
      for (const q of qs) {
        expect(q.context).toContain("现期");
        expect(q.context).toContain("增长率");
      }
    });
  });

  describe("estimate_growth 估算增长量", () => {
    it("答案 = A*r/(1+r)，可正可负", () => {
      const qs = generateDataQuestion("estimate_growth", 50);
      const hasNeg = qs.some((q) => q.answer < 0);
      const hasPos = qs.some((q) => q.answer > 0);
      expect(hasPos).toBe(true);
      expect(hasNeg).toBe(true);
    });

    it("答案为负时 preset='-'", () => {
      const qs = generateDataQuestion("estimate_growth", 50);
      for (const q of qs) {
        if (q.answer < 0) {
          expect(q.preset).toBe("-");
        }
      }
    });

    it("hint 含 '需要负号时会自动生成'", () => {
      const qs = generateDataQuestion("estimate_growth", 5);
      for (const q of qs) {
        expect(q.hint).toContain("需要负号");
      }
    });

    it("不出现 0 增长量（r≠0）", () => {
      const qs = generateDataQuestion("estimate_growth", 50);
      for (const q of qs) {
        expect(q.answer).not.toBe(0);
      }
    });
  });

  describe("baihua_frac 百化分", () => {
    it("答案 = 100/n，n∈[2,20]", () => {
      const qs = generateDataQuestion("baihua_frac", 50);
      for (const q of qs) {
        expect(q.answer).toBeGreaterThanOrEqual(5);
        expect(q.answer).toBeLessThanOrEqual(50);
        expect(q.tolerance).toBe(0.02);
      }
    });

    it("display 含 \\frac{1}{n}", () => {
      const qs = generateDataQuestion("baihua_frac", 5);
      for (const q of qs) {
        expect(q.display).toContain("\\frac{1}{");
      }
    });

    it("unit='%' ", () => {
      const qs = generateDataQuestion("baihua_frac", 5);
      for (const q of qs) {
        expect(q.unit).toBe("%");
      }
    });

    it("hint 含 '小数点后一位'", () => {
      const qs = generateDataQuestion("baihua_frac", 5);
      for (const q of qs) {
        expect(q.hint).toContain("小数点后一位");
      }
    });
  });

  describe("baihua_frac_rev 百化分反向", () => {
    it("答案为整数 n∈[2,20]", () => {
      const qs = generateDataQuestion("baihua_frac_rev", 50);
      for (const q of qs) {
        expect(Number.isInteger(q.answer)).toBe(true);
        expect(q.answer).toBeGreaterThanOrEqual(2);
        expect(q.answer).toBeLessThanOrEqual(20);
      }
    });

    it("正反向互逆：反向题面百分数 ≈ 100/n", () => {
      const qs = generateDataQuestion("baihua_frac_rev", 50);
      for (const q of qs) {
        const n = q.answer;
        const pct = 100 / n;
        expect(q.display).toContain("%");
        expect(q.display).toContain(pct.toFixed(1));  // 验证题面含对应百分数
      }
    });
  });

  describe("frac_calc_lt 分数计算(分子<分母)", () => {
    it("答案 < 1", () => {
      const qs = generateDataQuestion("frac_calc_lt", 50);
      for (const q of qs) {
        expect(q.answer).toBeGreaterThan(0);
        expect(q.answer).toBeLessThan(1);
      }
    });

    it("preset='0.'", () => {
      const qs = generateDataQuestion("frac_calc_lt", 5);
      for (const q of qs) {
        expect(q.preset).toBe("0.");
      }
    });

    it("tolerance=0.02", () => {
      const qs = generateDataQuestion("frac_calc_lt", 5);
      for (const q of qs) {
        expect(q.tolerance).toBe(0.02);
      }
    });

    it("hint 含 '小数点后2~3位'", () => {
      const qs = generateDataQuestion("frac_calc_lt", 5);
      for (const q of qs) {
        expect(q.hint).toContain("2~3位");
      }
    });
  });

  describe("frac_calc_gt 分数计算(分子>分母)", () => {
    it("答案 > 1", () => {
      const qs = generateDataQuestion("frac_calc_gt", 50);
      for (const q of qs) {
        expect(q.answer).toBeGreaterThan(1);
      }
    });

    it("无 preset（不预填）", () => {
      const qs = generateDataQuestion("frac_calc_gt", 5);
      for (const q of qs) {
        expect(q.preset).toBeUndefined();
      }
    });

    it("tolerance=0.02", () => {
      const qs = generateDataQuestion("frac_calc_gt", 5);
      for (const q of qs) {
        expect(q.tolerance).toBe(0.02);
      }
    });

    it("a 严格大于 b（不出现 a==b）", () => {
      const qs = generateDataQuestion("frac_calc_gt", 200);
      for (const q of qs) {
        // answer = a/b > 1 严格成立，验证 a≠b
        expect(q.answer).toBeGreaterThan(1);
      }
    });
  });

  describe("annual_growth_rate 年均增长率", () => {
    it("答案为小数（增长率），含 unit='%'", () => {
      const qs = generateDataQuestion("annual_growth_rate", 5);
      for (const q of qs) {
        expect(q.unit).toBe("%");
        expect(q.tolerance).toBe(0.03);
      }
    });

    it("context 含年份范围", () => {
      const qs = generateDataQuestion("annual_growth_rate", 5);
      for (const q of qs) {
        expect(q.context).toContain("~");
        expect(q.context).toContain("首");
        expect(q.context).toContain("末");
      }
    });

    it("不出现 0 增长率（首末值不等）", () => {
      const qs = generateDataQuestion("annual_growth_rate", 50);
      for (const q of qs) {
        expect(q.answer).not.toBe(0);
      }
    });
  });

  describe("base_period_ratio 基期比重", () => {
    it("答案在 (0,100) 区间（百分数比重）", () => {
      const qs = generateDataQuestion("base_period_ratio", 50);
      for (const q of qs) {
        expect(q.answer).toBeGreaterThan(0);
        expect(q.answer).toBeLessThan(100);
      }
    });

    it("display 含 \\frac 和 \\approx", () => {
      const qs = generateDataQuestion("base_period_ratio", 5);
      for (const q of qs) {
        expect(q.display).toContain("\\frac");
        expect(q.display).toContain("\\approx");
      }
    });

    it("context 含 A、B、rA、rB", () => {
      const qs = generateDataQuestion("base_period_ratio", 5);
      for (const q of qs) {
        expect(q.context).toContain("A:");
        expect(q.context).toContain("B:");
      }
    });

    it("unit='%'", () => {
      const qs = generateDataQuestion("base_period_ratio", 5);
      for (const q of qs) {
        expect(q.unit).toBe("%");
      }
    });
  });

  describe("annual_avg 年平均量", () => {
    it("答案为正数（5 年平均）", () => {
      const qs = generateDataQuestion("annual_avg", 50);
      for (const q of qs) {
        expect(q.answer).toBeGreaterThan(0);
      }
    });

    it("tolerance=0.01（最严）", () => {
      const qs = generateDataQuestion("annual_avg", 5);
      for (const q of qs) {
        expect(q.tolerance).toBe(0.01);
      }
    });

    it("context 含 5 个年份值", () => {
      const qs = generateDataQuestion("annual_avg", 5);
      for (const q of qs) {
        expect(q.context).toContain("万");
        expect(q.context).toMatch(/\d{2,}/);
      }
    });

    it("unit='万'", () => {
      const qs = generateDataQuestion("annual_avg", 5);
      for (const q of qs) {
        expect(q.unit).toBe("万");
      }
    });
  });

  describe("边界与稳健性", () => {
    it("count=1 也能生成", () => {
      const qs = generateDataQuestion("estimate_prev", 1);
      expect(qs).toHaveLength(1);
    });

    it("count=100 也能生成", () => {
      const qs = generateDataQuestion("baihua_frac", 100);
      expect(qs).toHaveLength(100);
    });

    it("所有 9 类题型都能生成", () => {
      const types: DataType[] = [
        "estimate_prev", "estimate_growth",
        "baihua_frac", "baihua_frac_rev",
        "frac_calc_lt", "frac_calc_gt",
        "annual_growth_rate", "base_period_ratio", "annual_avg",
      ];
      for (const t of types) {
        const qs = generateDataQuestion(t, 3);
        expect(qs).toHaveLength(3);
        for (const q of qs) {
          expect(q.display.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
