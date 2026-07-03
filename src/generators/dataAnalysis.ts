export type DataType =
  | "estimate_prev" | "estimate_growth"
  | "baihua_frac" | "baihua_frac_rev"
  | "frac_calc_lt" | "frac_calc_gt"
  | "annual_growth_rate" | "base_period_ratio" | "annual_avg";

export interface DataQuestion {
  display: string;        // KaTeX 源串
  answer: number;         // 数值答案
  tolerance: number;      // 误差比例
  context?: string;       // 上下文行
  hint?: string;          // 附加提示
  preset?: string;        // 预填
  unit?: string;          // 单位
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals: number): number {
  const v = Math.random() * (max - min) + min;
  return Number(v.toFixed(decimals));
}

// ===== estimate_prev 估算前期量 =====
function genEstimatePrev(): DataQuestion {
  const A = randInt(1000, 9999);
  const r = randFloat(0.05, 0.30, 3);
  const answer = A / (1 + r);
  return {
    display: `\\frac{${A}}{${(1 + r).toFixed(3)}} \\approx`,
    answer: Number(answer.toFixed(2)),
    tolerance: 0.03,
    context: `现期: ${A}, 增长率: ${(r * 100).toFixed(1)}%`,
  };
}

// ===== estimate_growth 估算增长量 =====
function genEstimateGrowth(): DataQuestion {
  let r = 0;
  let A = 0;
  while (r === 0) {
    A = randInt(1000, 9999);
    r = randFloat(-0.30, 0.30, 3);
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
function genBaihuaFrac(): DataQuestion {
  const n = randInt(2, 20);
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
function genBaihuaFracRev(): DataQuestion {
  const n = randInt(2, 20);
  const pct = 100 / n;
  return {
    display: `${pct.toFixed(1)}\\% \\approx \\frac{1}{?} \\approx`,
    answer: n,
    tolerance: 0.02,
    hint: "写到小数点后一位即可",
  };
}

// ===== frac_calc_lt 分数计算(分子<分母) =====
function genFracCalcLt(): DataQuestion {
  const a = randInt(100, 999);
  const b = randInt(a + 1, 9999);
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
function genFracCalcGt(): DataQuestion {
  const a = randInt(101, 9999);
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
function genAnnualGrowthRate(): DataQuestion {
  let first = 0;
  let last = 0;
  while (first === last) {
    first = randInt(10, 99);
    last = randInt(10, 99);
  }
  const n = 5;
  const answer = Math.pow(last / first, 1 / n) - 1;
  const answerPct = Number((answer * 100).toFixed(2));
  return {
    display: `\\text{2012~2017 年均增长率} \\approx`,
    answer: answerPct,
    tolerance: 0.03,
    context: `2012~2017, 首: ${first}万, 末: ${last}万, n=5`,
    unit: "%",
    preset: answerPct < 0 ? "-" : undefined,
  };
}

// ===== base_period_ratio 基期比重 =====
function genBasePeriodRatio(): DataQuestion {
  const A = randInt(100, 999);
  const B = randInt(100, 999);
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
function genAnnualAvg(): DataQuestion {
  const values: number[] = [];
  for (let i = 0; i < 5; i++) {
    values.push(randInt(10, 99));
  }
  const sum = values.reduce((a, b) => a + b, 0);
  const answer = sum / 5;
  return {
    display: `\\text{2012~2016 年平均成交量} \\approx`,
    answer: Number(answer.toFixed(2)),
    tolerance: 0.01,
    context: `各年: ${values.join(", ")} 万`,
    unit: "万",
  };
}

const GENERATORS: Record<DataType, () => DataQuestion> = {
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
  _difficulty?: "easy" | "normal" | "hard"
): DataQuestion[] {
  const gen = GENERATORS[type];
  const questions: DataQuestion[] = [];
  for (let i = 0; i < count; i++) {
    questions.push(gen());
  }
  return questions;
}
