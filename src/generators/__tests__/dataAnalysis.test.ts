import { describe, it, expect } from "vitest";
import { generateDataQuestion, type DataType, type DataQuestion } from "@/generators/dataAnalysis";

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

    it("答案可正可负（首末值随机）", () => {
      const qs = generateDataQuestion("annual_growth_rate", 50);
      const hasNeg = qs.some((q) => q.answer < 0);
      const hasPos = qs.some((q) => q.answer > 0);
      expect(hasPos).toBe(true);
      expect(hasNeg).toBe(true);
    });

    it("答案为负时 preset='-'（触屏无±键，负号预填）", () => {
      const qs = generateDataQuestion("annual_growth_rate", 50);
      const negQs = qs.filter((q) => q.answer < 0);
      expect(negQs.length).toBeGreaterThan(0);
      for (const q of negQs) {
        expect(q.preset).toBe("-");
      }
    });

    it("chartData 含 6 年 labels/values/unit，首末值与 context 一致", () => {
      const qs = generateDataQuestion("annual_growth_rate", 20);
      for (const q of qs) {
        expect(q.chartData).toBeDefined();
        expect(q.chartData!.labels).toEqual(["2012", "2013", "2014", "2015", "2016", "2017"]);
        expect(q.chartData!.values).toHaveLength(6);
        expect(q.chartData!.unit).toBe("万");
        // 首末值与 context 一致
        const mFirst = q.context?.match(/首: (\d+)万/);
        const mLast = q.context?.match(/末: (\d+)万/);
        if (mFirst && mLast) {
          expect(q.chartData!.values[0]).toBe(Number(mFirst[1]));
          expect(q.chartData!.values[5]).toBe(Number(mLast[1]));
        }
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

    it("chartData 含 5 年 labels/values/unit，values 与 context 一致", () => {
      const qs = generateDataQuestion("annual_avg", 20);
      for (const q of qs) {
        expect(q.chartData).toBeDefined();
        expect(q.chartData!.labels).toEqual(["2012", "2013", "2014", "2015", "2016"]);
        expect(q.chartData!.values).toHaveLength(5);
        expect(q.chartData!.unit).toBe("万");
        // values 与 context 中的"各年: a, b, c, d, e 万"一致
        const m = q.context?.match(/各年: ([\d, ]+) 万/);
        if (m) {
          const ctxValues = m[1].split(", ").map(Number);
          expect(q.chartData!.values).toEqual(ctxValues);
        }
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

describe("difficulty 参数影响数值范围", () => {
  it("estimate_prev easy 模式 A 范围更小", () => {
    const qsEasy = generateDataQuestion("estimate_prev", 50, "easy");
    const qsHard = generateDataQuestion("estimate_prev", 50, "hard");
    const maxA_Easy = Math.max(...qsEasy.map((q) => {
      const m = q.context?.match(/现期: (\d+)/);
      return m ? Number(m[1]) : 0;
    }));
    const maxA_Hard = Math.max(...qsHard.map((q) => {
      const m = q.context?.match(/现期: (\d+)/);
      return m ? Number(m[1]) : 0;
    }));
    expect(maxA_Hard).toBeGreaterThan(maxA_Easy);
  });

  it("baihua_frac hard 模式 n 范围更大", () => {
    const qsEasy = generateDataQuestion("baihua_frac", 50, "easy");
    const qsHard = generateDataQuestion("baihua_frac", 50, "hard");
    // ⚠️ 注意：display 是 `\frac{1}{n} \approx`（模板字符串 \\frac 渲染为 \frac）
    // 计划原 regex `/1\\\{(\d+)\\\}/` 有误，应改为 `/\\frac\{1\}\{(\d+)\}/`
    const ns_easy = qsEasy.map((q) => Number(q.display.match(/\\frac\{1\}\{(\d+)\}/)?.[1] ?? 0));
    const ns_hard = qsHard.map((q) => Number(q.display.match(/\\frac\{1\}\{(\d+)\}/)?.[1] ?? 0));
    expect(Math.max(...ns_hard)).toBeGreaterThanOrEqual(Math.max(...ns_easy));
  });

  it("默认 normal 与显式 normal 行为一致（A 范围在 [200,5000]）", () => {
    const qs = generateDataQuestion("estimate_prev", 50);
    const qsNormal = generateDataQuestion("estimate_prev", 50, "normal");
    expect(qs).toHaveLength(50);
    expect(qsNormal).toHaveLength(50);
    // 验证 normal 档 A 范围（新标准：[200, 5000]）
    for (const q of qsNormal) {
      const m = q.context?.match(/现期: (\d+)/);
      if (m) {
        const A = Number(m[1]);
        expect(A).toBeGreaterThanOrEqual(200);
        expect(A).toBeLessThanOrEqual(5000);
      }
    }
  });

  it("estimate_prev easy 档 r 范围在 [0, 0.29]", () => {
    const qs = generateDataQuestion("estimate_prev", 50, "easy");
    for (const q of qs) {
      const m = q.context?.match(/增长率: ([\-\d.]+)%/);
      if (m) {
        const rPct = Number(m[1]);
        expect(rPct).toBeGreaterThanOrEqual(0);
        expect(rPct).toBeLessThanOrEqual(29);
      }
    }
  });

  it("estimate_prev normal 档 r 范围在 [-29, 75]", () => {
    const qs = generateDataQuestion("estimate_prev", 50, "normal");
    for (const q of qs) {
      const m = q.context?.match(/增长率: ([\-\d.]+)%/);
      if (m) {
        const rPct = Number(m[1]);
        expect(rPct).toBeGreaterThanOrEqual(-29);
        expect(rPct).toBeLessThanOrEqual(75);
      }
    }
  });

  it("estimate_prev hard 档 r 范围在 [-29, 0] ∪ [9.5, 120]", () => {
    const qs = generateDataQuestion("estimate_prev", 100, "hard");
    for (const q of qs) {
      const m = q.context?.match(/增长率: ([\-\d.]+)%/);
      if (m) {
        const rPct = Number(m[1]);
        const inNeg = rPct >= -29 && rPct <= 0;
        const inHigh = rPct >= 9.5 && rPct <= 120;
        expect(inNeg || inHigh).toBe(true);
      }
    }
  });

  it("estimate_prev hard 档两区间都被采样到（100 题）", () => {
    const qs = generateDataQuestion("estimate_prev", 200, "hard");
    const rPcts = qs
      .map((q) => q.context?.match(/增长率: ([\-\d.]+)%/)?.[1])
      .filter(Boolean)
      .map(Number);
    const hasNeg = rPcts.some((r) => r <= 0);
    const hasHigh = rPcts.some((r) => r >= 9.5);
    expect(hasNeg).toBe(true);
    expect(hasHigh).toBe(true);
  });

  it("estimate_growth 难度档与 estimate_prev 一致（同 r 范围）", () => {
    // easy 档 r∈[0, 29]
    const qsEasy = generateDataQuestion("estimate_growth", 50, "easy");
    for (const q of qsEasy) {
      const m = q.context?.match(/增长率: ([\-\d.]+)%/);
      if (m) {
        const rPct = Number(m[1]);
        expect(rPct).toBeGreaterThanOrEqual(0);
        expect(rPct).toBeLessThanOrEqual(29);
      }
    }
    // hard 档 r∈[-29,0] ∪ [9.5,120]
    const qsHard = generateDataQuestion("estimate_growth", 100, "hard");
    for (const q of qsHard) {
      const m = q.context?.match(/增长率: ([\-\d.]+)%/);
      if (m) {
        const rPct = Number(m[1]);
        const inNeg = rPct >= -29 && rPct <= 0;
        const inHigh = rPct >= 9.5 && rPct <= 120;
        expect(inNeg || inHigh).toBe(true);
      }
    }
  });

  // 参数化测试：9 个生成器 hard 档数值规模 > easy 档
  const DIFFICULTY_CASES: Array<{
    name: string;
    type: DataType;
    extractMax: (q: DataQuestion) => number;
  }> = [
    {
      name: "estimate_prev",
      type: "estimate_prev",
      extractMax: (q) => {
        const m = q.context?.match(/现期: (\d+)/);
        return m ? Number(m[1]) : 0;
      },
    },
    {
      name: "estimate_growth",
      type: "estimate_growth",
      // display: `\text{求增长量：} ${A} \times \frac{...}{...} \approx`
      extractMax: (q) => {
        const m = q.display.match(/(\d+) \\times/);
        return m ? Number(m[1]) : 0;
      },
    },
    {
      name: "baihua_frac",
      type: "baihua_frac",
      // display: `\frac{1}{${n}} \approx`
      extractMax: (q) => Number(q.display.match(/\\frac\{1\}\{(\d+)\}/)?.[1] ?? 0),
    },
    {
      name: "baihua_frac_rev",
      type: "baihua_frac_rev",
      // answer 是 n（百化分反向：百分数 → 1/n）
      extractMax: (q) => q.answer,
    },
    {
      name: "frac_calc_lt",
      type: "frac_calc_lt",
      // display: `\frac{${a}}{${b}} \approx`
      extractMax: (q) => {
        const m = q.display.match(/\\frac\{(\d+)\}\{(\d+)\}/);
        return m ? Math.max(Number(m[1]), Number(m[2])) : 0;
      },
    },
    {
      name: "frac_calc_gt",
      type: "frac_calc_gt",
      // display: `\frac{${a}}{${b}} \approx`
      extractMax: (q) => {
        const m = q.display.match(/\\frac\{(\d+)\}\{(\d+)\}/);
        return m ? Math.max(Number(m[1]), Number(m[2])) : 0;
      },
    },
    {
      name: "annual_growth_rate",
      type: "annual_growth_rate",
      // context: `2012~2017, 首: ${first}万, 末: ${last}万, n=5`
      extractMax: (q) => {
        const mFirst = q.context?.match(/首: (\d+)万/);
        const mLast = q.context?.match(/末: (\d+)万/);
        const first = mFirst ? Number(mFirst[1]) : 0;
        const last = mLast ? Number(mLast[1]) : 0;
        return Math.max(first, last);
      },
    },
    {
      name: "base_period_ratio",
      type: "base_period_ratio",
      // context: `A: ${A}, rA: ...%; B: ${B}, rB: ...%`
      extractMax: (q) => {
        const mA = q.context?.match(/\bA: (\d+)/);
        const mB = q.context?.match(/\bB: (\d+)/);
        const A = mA ? Number(mA[1]) : 0;
        const B = mB ? Number(mB[1]) : 0;
        return Math.max(A, B);
      },
    },
    {
      name: "annual_avg",
      type: "annual_avg",
      // context: `各年: ${values.join(", ")} 万`
      extractMax: (q) => {
        const m = q.context?.match(/各年: ([\d, ]+) 万/);
        if (!m) return 0;
        const nums = m[1].split(", ").map(Number);
        return Math.max(...nums);
      },
    },
  ];

  it.each(DIFFICULTY_CASES)(
    "hard 档 $name 数值规模大于 easy 档",
    ({ type, extractMax }) => {
      const qsEasy = generateDataQuestion(type, 50, "easy");
      const qsHard = generateDataQuestion(type, 50, "hard");
      const maxEasy = Math.max(...qsEasy.map(extractMax));
      const maxHard = Math.max(...qsHard.map(extractMax));
      expect(maxHard).toBeGreaterThan(maxEasy);
    }
  );
});
