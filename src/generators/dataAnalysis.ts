export type DataType =
  | "estimate_prev" | "estimate_growth"
  | "baihua_frac" | "baihua_frac_rev"
  | "frac_calc_lt" | "frac_calc_gt"
  | "annual_growth_rate" | "base_period_ratio" | "annual_avg";

export type Difficulty = "easy" | "normal" | "hard";

export interface DataQuestion {
  display: string;        // KaTeX 源串
  answer: number;         // 数值答案
  tolerance: number;      // 误差比例
  context?: string;       // 上下文行
  hint?: string;          // 附加提示
  preset?: string;        // 预填
  unit?: string;          // 单位
  chartData?: { labels: string[]; values: number[]; unit?: string };
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals: number): number {
  const v = Math.random() * (max - min) + min;
  return Number(v.toFixed(decimals));
}

// ===== estimate_prev 估算前期量 =====
// 难度递进：现期量位数 + 增长率幅度（实际资料分析常见 A∈[200,9999], r∈[5%,40%]）
function genEstimatePrev(difficulty: Difficulty = "normal"): DataQuestion {
  const ranges = {
    easy:   { A: [200, 2000] as const, r: [0.05, 0.15] as const },
    normal: { A: [500, 5000] as const, r: [0.05, 0.25] as const },
    hard:   { A: [1000, 9999] as const, r: [0.05, 0.40] as const },
  };
  const range = ranges[difficulty];
  const A = randInt(range.A[0], range.A[1]);
  const r = randFloat(range.r[0], range.r[1], 3);
  const answer = A / (1 + r);
  return {
    display: `\\frac{${A}}{${(1 + r).toFixed(3)}} \\approx`,
    answer: Number(answer.toFixed(2)),
    tolerance: 0.03,
    context: `现期: ${A}, 增长率: ${(r * 100).toFixed(1)}%`,
  };
}

// ===== estimate_growth 估算增长量 =====
// 难度递进：同 estimate_prev，含负增长（符号判断）
function genEstimateGrowth(difficulty: Difficulty = "normal"): DataQuestion {
  const ranges = {
    easy:   { A: [200, 2000] as const, r: [-0.15, 0.15] as const },
    normal: { A: [500, 5000] as const, r: [-0.25, 0.25] as const },
    hard:   { A: [1000, 9999] as const, r: [-0.40, 0.40] as const },
  };
  const range = ranges[difficulty];
  let r = 0;
  let A = 0;
  while (r === 0) {
    A = randInt(range.A[0], range.A[1]);
    r = randFloat(range.r[0], range.r[1], 3);
  }
  const answer = (A * r) / (1 + r);
  return {
    display: `\\text{求增长量：} ${A} \\times \\frac{${r.toFixed(3)}}{${(1 + r).toFixed(3)}} \\approx`,
    answer: Number(answer.toFixed(2)),
    tolerance: 0.03,
    context: `现期: ${A}, 增长率: ${(r * 100).toFixed(1)}%`,
    hint: "需要负号时会自动生成",
    preset: answer < 0 ? "-" : undefined,
  };
}

// ===== baihua_frac 百化分 =====
// 难度递进：分母范围（实际资料分析常见 n∈[2,20]，1/21+ 几乎不出现）
function genBaihuaFrac(difficulty: Difficulty = "normal"): DataQuestion {
  const ranges = {
    easy:   { n: [2, 10] as const },
    normal: { n: [2, 15] as const },
    hard:   { n: [2, 20] as const },
  };
  const range = ranges[difficulty];
  const n = randInt(range.n[0], range.n[1]);
  const answer = 100 / n;
  return {
    display: `\\frac{1}{${n}} \\approx`,
    answer: Number(answer.toFixed(2)),
    tolerance: 0.02,
    hint: "写到小数点后一位即可",
    unit: "%",
  };
}

// ===== baihua_frac_rev 百化分反向 =====
// 难度递进：同 baihua_frac
function genBaihuaFracRev(difficulty: Difficulty = "normal"): DataQuestion {
  const ranges = {
    easy:   { n: [2, 10] as const },
    normal: { n: [2, 15] as const },
    hard:   { n: [2, 20] as const },
  };
  const range = ranges[difficulty];
  const n = randInt(range.n[0], range.n[1]);
  const pct = 100 / n;
  return {
    display: `${pct.toFixed(1)}\\% \\approx \\frac{1}{?} \\approx`,
    answer: n,
    tolerance: 0.02,
    hint: "写到小数点后一位即可",
  };
}

// ===== frac_calc_lt 分数计算(分子<分母) =====
// 难度递进：分子分母位数（easy 限制 bMax 避免分数过小）
function genFracCalcLt(difficulty: Difficulty = "normal"): DataQuestion {
  const ranges = {
    easy:   { a: [100, 499] as const, bMax: 499 as const },
    normal: { a: [100, 999] as const, bMax: 9999 as const },
    hard:   { a: [500, 9999] as const, bMax: 99999 as const },
  };
  const range = ranges[difficulty];
  const a = randInt(range.a[0], range.a[1]);
  const b = randInt(a + 1, range.bMax);
  const answer = a / b;
  return {
    display: `\\frac{${a}}{${b}} \\approx`,
    answer: Number(answer.toFixed(4)),
    tolerance: 0.02,
    hint: "建议写到小数点后2~3位",
    preset: "0.",
  };
}

// ===== frac_calc_gt 分数计算(分子>分母) =====
// 难度递进：分子位数（easy 限制 a 范围）
function genFracCalcGt(difficulty: Difficulty = "normal"): DataQuestion {
  const ranges = {
    easy:   { a: [101, 499] as const },
    normal: { a: [101, 9999] as const },
    hard:   { a: [101, 99999] as const },
  };
  const range = ranges[difficulty];
  const a = randInt(range.a[0], range.a[1]);
  const b = randInt(100, a - 1);
  const answer = a / b;
  return {
    display: `\\frac{${a}}{${b}} \\approx`,
    answer: Number(answer.toFixed(4)),
    tolerance: 0.02,
    hint: "建议写到小数点后2~3位",
  };
}

// ===== annual_growth_rate 年均增长率 =====
function genAnnualGrowthRate(difficulty: Difficulty = "normal"): DataQuestion {
  const ranges = {
    easy:   { v: [10, 50] as const },
    normal: { v: [10, 99] as const },
    hard:   { v: [10, 999] as const },
  };
  const range = ranges[difficulty];
  let first = 0;
  let last = 0;
  while (first === last) {
    first = randInt(range.v[0], range.v[1]);
    last = randInt(range.v[0], range.v[1]);
  }
  const n = 5;
  const answer = Math.pow(last / first, 1 / n) - 1;
  const answerPct = Number((answer * 100).toFixed(2));
  // chartData：首末值已知，中间 4 年在 first~last 范围内随机填充
  const labels = ["2012", "2013", "2014", "2015", "2016", "2017"];
  const lo = Math.min(first, last);
  const hi = Math.max(first, last);
  const values = [first];
  for (let i = 1; i < 5; i++) {
    values.push(randInt(lo, hi));
  }
  values.push(last);
  return {
    display: `\\text{2012~2017 年均增长率} \\approx`,
    answer: answerPct,
    tolerance: 0.03,
    context: `2012~2017, 首: ${first}万, 末: ${last}万, n=5`,
    unit: "%",
    preset: answerPct < 0 ? "-" : undefined,
    chartData: { labels, values, unit: "万" },
  };
}

// ===== base_period_ratio 基期比重 =====
function genBasePeriodRatio(difficulty: Difficulty = "normal"): DataQuestion {
  const ranges = {
    easy:   { AB: [50, 499] as const },
    normal: { AB: [100, 999] as const },
    hard:   { AB: [200, 9999] as const },
  };
  const range = ranges[difficulty];
  const A = randInt(range.AB[0], range.AB[1]);
  const B = randInt(range.AB[0], range.AB[1]);
  const rA = randFloat(0.05, 0.30, 3);
  const rB = randFloat(0.05, 0.30, 3);
  const answer = (A / (1 + rA)) / (A / (1 + rA) + B / (1 + rB));
  return {
    display: `\\frac{${A}/(1+${rA.toFixed(3)})}{${A}/(1+${rA.toFixed(3)}) + ${B}/(1+${rB.toFixed(3)})} \\approx`,
    answer: Number((answer * 100).toFixed(2)),
    tolerance: 0.03,
    context: `A: ${A}, rA: ${(rA * 100).toFixed(1)}%; B: ${B}, rB: ${(rB * 100).toFixed(1)}%`,
    unit: "%",
  };
}

// ===== annual_avg 年平均量 =====
function genAnnualAvg(difficulty: Difficulty = "normal"): DataQuestion {
  const ranges = {
    easy:   { v: [10, 50] as const },
    normal: { v: [10, 99] as const },
    hard:   { v: [10, 999] as const },
  };
  const range = ranges[difficulty];
  const values: number[] = [];
  for (let i = 0; i < 5; i++) {
    values.push(randInt(range.v[0], range.v[1]));
  }
  const sum = values.reduce((a, b) => a + b, 0);
  const answer = sum / 5;
  const labels = ["2012", "2013", "2014", "2015", "2016"];
  return {
    display: `\\text{2012~2016 年平均成交量} \\approx`,
    answer: Number(answer.toFixed(2)),
    tolerance: 0.01,
    context: `各年: ${values.join(", ")} 万`,
    unit: "万",
    chartData: { labels, values: [...values], unit: "万" },
  };
}

const GENERATORS: Record<DataType, (difficulty: Difficulty) => DataQuestion> = {
  estimate_prev: genEstimatePrev,
  estimate_growth: genEstimateGrowth,
  baihua_frac: genBaihuaFrac,
  baihua_frac_rev: genBaihuaFracRev,
  frac_calc_lt: genFracCalcLt,
  frac_calc_gt: genFracCalcGt,
  annual_growth_rate: genAnnualGrowthRate,
  base_period_ratio: genBasePeriodRatio,
  annual_avg: genAnnualAvg,
};

export function generateDataQuestion(
  type: DataType,
  count: number,
  difficulty: Difficulty = "normal"
): DataQuestion[] {
  const gen = GENERATORS[type];
  const questions: DataQuestion[] = [];
  for (let i = 0; i < count; i++) {
    questions.push(gen(difficulty));
  }
  return questions;
}

// TODO(L5+): 难度自适应——根据答题正确率动态调整 difficulty
// 当前为静态三档（easy/normal/hard），后期可扩展为：
// 1. 记录最近 N 题正确率，正确率 > 80% 自动升档，< 50% 自动降档
// 2. 或基于时间标准（pass/good/excellent）动态调节数值范围
// 3. 自适应作为可选模式，与手动三档并存
