// L3 比较题 3 类生成器（纯函数 + 两类难度模式）
// 模式 A：相近难分（分母层差 <10%，实际值差 1%~5%）
// 模式 B：整数倍率（分母层 2x/3x 倍率，实际值差 1%~5%）

export type CompareType = "compare_growth" | "compare_base" | "compare_frac";

export interface CompareQuestion {
  type: CompareType;
  display: {
    leftTex: string;
    rightTex: string;
  };
  leftValue: number;
  rightValue: number;
  answer: ">" | "<";
  context?: string;
  hint?: string;
  pattern: "A" | "B";
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals: number): number {
  const v = Math.random() * (max - min) + min;
  return Number(v.toFixed(decimals));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 实际值差比例落入 [0.01, 0.05] 区间
function valueDiffInRange(left: number, right: number): boolean {
  if (left === right) return false;
  const diff = Math.abs(left - right);
  const base = Math.max(Math.abs(left), Math.abs(right));
  const ratio = diff / base;
  return ratio >= 0.01 && ratio <= 0.05;
}

function buildQuestion(
  type: CompareType,
  pattern: "A" | "B",
  leftValue: number,
  rightValue: number,
  leftTex: string,
  rightTex: string,
  context: string
): CompareQuestion {
  const answer: ">" | "<" = leftValue > rightValue ? ">" : "<";
  return {
    type,
    display: { leftTex, rightTex },
    leftValue,
    rightValue,
    answer,
    context,
    pattern,
  };
}

// ===== compare_growth: A1 × r1% ? A2 × r2% =====
function genCompareGrowth(pattern: "A" | "B"): CompareQuestion {
  const mult = pick([2, 3]);
  for (let attempt = 0; attempt < 50; attempt++) {
    let A1: number, A2: number, r1: number, r2: number;
    if (pattern === "A") {
      A1 = randInt(100, 999);
      A2 = randInt(Math.floor(A1 * 0.9), Math.floor(A1 * 1.1));
      r1 = randFloat(5, 30, 1);
      r2 = randFloat(Math.max(5, r1 - 3), Math.min(30, r1 + 3), 1);
    } else {
      A1 = randInt(100, Math.floor(999 / mult));
      A2 = A1 * mult;
      r1 = randFloat(5, 30, 1);
      r2 = randFloat(5, 30, 1);
    }
    const lv = A1 * r1 / 100;
    const rv = A2 * r2 / 100;
    if (!valueDiffInRange(lv, rv)) continue;
    return buildQuestion(
      "compare_growth",
      pattern,
      lv,
      rv,
      `${A1} \\times ${r1.toFixed(1)}\\%`,
      `${A2} \\times ${r2.toFixed(1)}\\%`,
      `左: 现期${A1}, 增长率${r1.toFixed(1)}%; 右: 现期${A2}, 增长率${r2.toFixed(1)}%`
    );
  }
  // 约束兜底：持续重试直至满足 valueDiffInRange（约束可满足，概率 1 终止）
  // pattern B 必须保留 A2 = A1 * mult 倍率约束，与主循环一致
  for (let attempt = 0; attempt < 1000; attempt++) {
    let A1: number, A2: number, r1: number, r2: number;
    if (pattern === "A") {
      A1 = randInt(100, 999);
      A2 = randInt(100, 999);
      r1 = randFloat(5, 30, 1);
      r2 = randFloat(5, 30, 1);
    } else {
      A1 = randInt(100, Math.floor(999 / mult));
      A2 = A1 * mult;
      r1 = randFloat(5, 30, 1);
      r2 = randFloat(5, 30, 1);
    }
    const lv = A1 * r1 / 100;
    const rv = A2 * r2 / 100;
    if (!valueDiffInRange(lv, rv)) continue;
    return buildQuestion(
      "compare_growth",
      pattern,
      lv,
      rv,
      `${A1} \\times ${r1.toFixed(1)}\\%`,
      `${A2} \\times ${r2.toFixed(1)}\\%`,
      `左: 现期${A1}, 增长率${r1.toFixed(1)}%; 右: 现期${A2}, 增长率${r2.toFixed(1)}%`
    );
  }
  // 极端兜底（理论不可达）：构造确定满足约束的值
  // pattern B 需保留倍率 A2 = A1 * mult 并满足 valueDiffInRange
  let A1: number, A2: number, r1: number, r2: number;
  if (pattern === "A") {
    A1 = 200; A2 = 206; r1 = 10.0; r2 = 10.0;
  } else {
    // mult=2: lv=20, rv=20.6, ratio≈0.0291 ∈ [0.01,0.05] ✅
    // mult=3: lv=30, rv=31.5, ratio≈0.0476 ∈ [0.01,0.05] ✅
    if (mult === 2) {
      A1 = 100; A2 = 200; r1 = 20.0; r2 = 10.3;
    } else {
      A1 = 100; A2 = 300; r1 = 30.0; r2 = 10.5;
    }
  }
  const lv = A1 * r1 / 100;
  const rv = A2 * r2 / 100;
  return buildQuestion(
    "compare_growth",
    pattern,
    lv,
    rv,
    `${A1} \\times ${r1.toFixed(1)}\\%`,
    `${A2} \\times ${r2.toFixed(1)}\\%`,
    `左: 现期${A1}, 增长率${r1.toFixed(1)}%; 右: 现期${A2}, 增长率${r2.toFixed(1)}%`
  );
}

// ===== compare_base: A1/(1+r1%) ? A2/(1+r2%) =====
// 注意：compare_base 固定 pattern A。原因：r∈[5,30] 范围下 pattern B（A2=A1*mult）
// 数学上几乎无法满足 valueDiffInRange（rv 永远远大于 lv）。详见 generateCompareQuestion 注释。
// 函数签名保留 pattern 参数以统一 GENERATORS 调度，但内部忽略其值（始终按 A 处理）。
function genCompareBase(_pattern: "A" | "B"): CompareQuestion {
  for (let attempt = 0; attempt < 50; attempt++) {
    const A1 = randInt(500, 2000);
    const A2 = randInt(Math.floor(A1 * 0.9), Math.floor(A1 * 1.1));
    const r1 = randFloat(5, 30, 1);
    const r2 = randFloat(Math.max(5, r1 - 3), Math.min(30, r1 + 3), 1);
    const lv = A1 / (1 + r1 / 100);
    const rv = A2 / (1 + r2 / 100);
    if (!valueDiffInRange(lv, rv)) continue;
    return buildQuestion(
      "compare_base",
      "A",
      lv,
      rv,
      `\\frac{${A1}}{${(1 + r1 / 100).toFixed(3)}}`,
      `\\frac{${A2}}{${(1 + r2 / 100).toFixed(3)}}`,
      `左: 现期${A1}, 增长率${r1.toFixed(1)}%; 右: 现期${A2}, 增长率${r2.toFixed(1)}%`
    );
  }
  // 约束兜底：持续重试直至满足 valueDiffInRange（约束可满足，概率 1 终止）
  for (let attempt = 0; attempt < 1000; attempt++) {
    const A1 = randInt(500, 2000);
    const A2 = randInt(500, 2000);
    const r1 = randFloat(5, 30, 1);
    const r2 = randFloat(5, 30, 1);
    const lv = A1 / (1 + r1 / 100);
    const rv = A2 / (1 + r2 / 100);
    if (!valueDiffInRange(lv, rv)) continue;
    return buildQuestion(
      "compare_base",
      "A",
      lv,
      rv,
      `\\frac{${A1}}{${(1 + r1 / 100).toFixed(3)}}`,
      `\\frac{${A2}}{${(1 + r2 / 100).toFixed(3)}}`,
      `左: 现期${A1}, 增长率${r1.toFixed(1)}%; 右: 现期${A2}, 增长率${r2.toFixed(1)}%`
    );
  }
  // 极端兜底（理论不可达）：构造确定满足约束的值
  const A1 = 1000, A2 = 1030, r1 = 10.0, r2 = 10.0;
  const lv = A1 / (1 + r1 / 100);
  const rv = A2 / (1 + r2 / 100);
  return buildQuestion(
    "compare_base",
    "A",
    lv,
    rv,
    `\\frac{${A1}}{${(1 + r1 / 100).toFixed(3)}}`,
    `\\frac{${A2}}{${(1 + r2 / 100).toFixed(3)}}`,
    `左: 现期${A1}, 增长率${r1.toFixed(1)}%; 右: 现期${A2}, 增长率${r2.toFixed(1)}%`
  );
}

// ===== compare_frac: a1/b1 ? a2/b2 =====
function genCompareFrac(pattern: "A" | "B"): CompareQuestion {
  const mult = pick([2, 3]);
  for (let attempt = 0; attempt < 50; attempt++) {
    let a1: number, b1: number, a2: number, b2: number;
    if (pattern === "A") {
      b1 = randInt(100, 999);
      b2 = randInt(Math.floor(b1 * 0.9), Math.floor(b1 * 1.1));
      a1 = randInt(100, 999);
      a2 = randInt(100, 999);
    } else {
      b1 = randInt(100, Math.floor(999 / mult));
      b2 = b1 * mult;
      a1 = randInt(100, 999);
      a2 = randInt(100, 999);
    }
    const lv = a1 / b1;
    const rv = a2 / b2;
    if (!valueDiffInRange(lv, rv)) continue;
    return buildQuestion(
      "compare_frac",
      pattern,
      lv,
      rv,
      `\\frac{${a1}}{${b1}}`,
      `\\frac{${a2}}{${b2}}`,
      `左: 分子${a1}, 分母${b1}; 右: 分子${a2}, 分母${b2}`
    );
  }
  // 约束兜底：持续重试直至满足 valueDiffInRange（约束可满足，概率 1 终止）
  // pattern B 必须保留 b2 = b1 * mult 倍率约束，与主循环一致
  for (let attempt = 0; attempt < 1000; attempt++) {
    let a1: number, b1: number, a2: number, b2: number;
    if (pattern === "A") {
      a1 = randInt(100, 999);
      b1 = randInt(100, 999);
      a2 = randInt(100, 999);
      b2 = randInt(100, 999);
    } else {
      b1 = randInt(100, Math.floor(999 / mult));
      b2 = b1 * mult;
      a1 = randInt(100, 999);
      a2 = randInt(100, 999);
    }
    const lv = a1 / b1;
    const rv = a2 / b2;
    if (!valueDiffInRange(lv, rv)) continue;
    return buildQuestion(
      "compare_frac",
      pattern,
      lv,
      rv,
      `\\frac{${a1}}{${b1}}`,
      `\\frac{${a2}}{${b2}}`,
      `左: 分子${a1}, 分母${b1}; 右: 分子${a2}, 分母${b2}`
    );
  }
  // 极端兜底（理论不可达）：构造确定满足约束的值
  // pattern B 需保留倍率 b2 = b1 * mult 并满足 valueDiffInRange
  let a1: number, b1: number, a2: number, b2: number;
  if (pattern === "A") {
    a1 = 300; b1 = 100; a2 = 309; b2 = 100;
  } else {
    // mult=2: lv=3, rv=3.09, ratio≈0.0291 ∈ [0.01,0.05] ✅
    // mult=3: lv=3, rv=3.09, ratio≈0.0291 ∈ [0.01,0.05] ✅
    if (mult === 2) {
      a1 = 300; b1 = 100; a2 = 618; b2 = 200;
    } else {
      a1 = 300; b1 = 100; a2 = 927; b2 = 300;
    }
  }
  const lv = a1 / b1;
  const rv = a2 / b2;
  return buildQuestion(
    "compare_frac",
    pattern,
    lv,
    rv,
    `\\frac{${a1}}{${b1}}`,
    `\\frac{${a2}}{${b2}}`,
    `左: 分子${a1}, 分母${b1}; 右: 分子${a2}, 分母${b2}`
  );
}

const GENERATORS: Record<CompareType, (p: "A" | "B") => CompareQuestion> = {
  compare_growth: genCompareGrowth,
  compare_base: genCompareBase,
  compare_frac: genCompareFrac,
};

export function generateCompareQuestion(type: CompareType, count: number): CompareQuestion[] {
  const result: CompareQuestion[] = [];
  let consecutiveSame = 0;
  let lastAnswer: ">" | "<" | null = null;
  for (let i = 0; i < count; i++) {
    // compare_base 因 r∈[5,30] 范围限制，pattern B（A2=A1*mult）数学上
    // 几乎无法满足 valueDiffInRange（rv 永远远大于 lv），故固定用 pattern A；
    // growth/frac 保持 50/50 pattern 分布
    const pattern: "A" | "B" = type === "compare_base"
      ? "A"
      : (Math.random() < 0.5 ? "A" : "B");
    let q = GENERATORS[type](pattern);
    if (q.answer === lastAnswer) {
      consecutiveSame++;
      if (consecutiveSame >= 3) {
        q = {
          ...q,
          display: { leftTex: q.display.rightTex, rightTex: q.display.leftTex },
          leftValue: q.rightValue,
          rightValue: q.leftValue,
          answer: q.answer === ">" ? "<" : ">",
        };
        consecutiveSame = 0;
        lastAnswer = q.answer;
      }
    } else {
      consecutiveSame = 0;
      lastAnswer = q.answer;
    }
    result.push(q);
  }
  return result;
}
