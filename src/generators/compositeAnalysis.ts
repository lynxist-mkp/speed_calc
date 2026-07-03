// L3 一表通算生成器（纯函数）
// 已知数据 4 项（现期+增长率）+ 13 项答案（基期/增长量 + 9 项派生指标）
// 用户填空，±5% 容差判分

export interface CompositeData {
  currentA: number;
  currentB: number;
  r1: number;  // 百分数形式，如 10.2 表示 10.2%
  r2: number;
  baseA: number;
  baseB: number;
  growthA: number;
  growthB: number;
}

export interface CompositeAnswers {
  baseA: number;    // 基期 A'
  baseB: number;    // 基期 B'
  growthA: number;  // 增长量 x1
  growthB: number;  // 增长量 x2
  P: number;   // 现期比重 %
  Pp: number;  // 基期比重 %
  d: number;   // 两期比重差 个百分点
  k: number;   // 比值增长率 %
  S: number;   // 基期和
  D: number;   // 基期差
  r: number;   // 隔年增长率 %
  r3: number;  // AB和增长率 %
  r4: number;  // AB差增长率 %
}

export interface CompositeQuestion {
  data: CompositeData;
  answers: CompositeAnswers;
}

export const COMPOSITE_FIELDS = [
  { key: "baseA",   label: "基期 A'",     unit: "" },
  { key: "baseB",   label: "基期 B'",     unit: "" },
  { key: "growthA", label: "增长量 x1",   unit: "" },
  { key: "growthB", label: "增长量 x2",   unit: "" },
  { key: "P",  label: "现期比重 P",   unit: "%" },
  { key: "Pp", label: "基期比重 P'",  unit: "%" },
  { key: "d",  label: "两期比重差 d", unit: "%" },
  { key: "k",  label: "比值增长率 k", unit: "%" },
  { key: "S",  label: "基期和 S",     unit: "" },
  { key: "D",  label: "基期差 D",     unit: "" },
  { key: "r",  label: "隔年增长率 r", unit: "%" },
  { key: "r3", label: "AB和增长率 r3", unit: "%" },
  { key: "r4", label: "AB差增长率 r4", unit: "%" },
] as const;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals: number): number {
  const v = Math.random() * (max - min) + min;
  return Number(v.toFixed(decimals));
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}

export function generateComposite(): CompositeQuestion {
  const currentA = randInt(100, 999);
  const currentB = randInt(100, 999);
  const r1 = randFloat(5, 30, 1);
  const r2 = randFloat(5, 30, 1);

  const baseA = round2(currentA / (1 + r1 / 100));
  const baseB = round2(currentB / (1 + r2 / 100));
  const growthA = round2(currentA - baseA);
  const growthB = round2(currentB - baseB);

  const data: CompositeData = {
    currentA, currentB, r1, r2,
    baseA, baseB, growthA, growthB,
  };

  const P = round2(currentA / (currentA + currentB) * 100);
  const Pp = round2(baseA / (baseA + baseB) * 100);
  const d = round2(P - Pp);
  const k = round2(
    ((currentA / currentB - baseA / baseB) / (baseA / baseB)) * 100
  );
  const S = round2(baseA + baseB);
  const D = round2(baseA - baseB);
  const r = round2(((1 + r1 / 100) * (1 + r2 / 100) - 1) * 100);
  const r3 = round2(((currentA + currentB) / (baseA + baseB) - 1) * 100);
  // r4 守卫：baseA - baseB ≠ 0（currentA/currentB 随机独立，理论可能等，概率极低但守卫）
  const denom4 = baseA - baseB;
  const r4 = denom4 !== 0
    ? round2(((currentA - currentB) / denom4 - 1) * 100)
    : 0;

  const answers: CompositeAnswers = { baseA, baseB, growthA, growthB, P, Pp, d, k, S, D, r, r3, r4 };

  return { data, answers };
}
