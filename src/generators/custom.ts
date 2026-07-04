import type { BasicQuestion } from "./basic";

export interface CustomStandardConfig {
  firstDigits: 1 | 2 | 3 | 4;
  operators: Array<"+" | "-" | "×" | "÷">;
  secondMode: "random_digits" | "fixed" | "range";
  secondDigits?: 1 | 2 | 3 | 4;
  secondFixed?: number;
  secondMin?: number;
  secondMax?: number;
}

export interface CustomPowerConfig {
  baseMode: "range" | "digits";
  baseMin?: number;
  baseMax?: number;
  baseDigits?: 1 | 2 | 3;
  powerTypes: Array<2 | 3>;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function genByDigits(digits: number): number {
  // 1 位数 [2,9]（不含 0，避免 0 作首位），多位数 [10^(d-1), 10^d - 1]
  if (digits === 1) return randInt(2, 9);
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return randInt(min, max);
}

function genSecond(cfg: CustomStandardConfig): number {
  if (cfg.secondMode === "random_digits") {
    return genByDigits(cfg.secondDigits!);
  }
  if (cfg.secondMode === "fixed") {
    return cfg.secondFixed!;
  }
  return randInt(cfg.secondMin!, cfg.secondMax!);
}

export function generateCustomStandard(cfg: CustomStandardConfig, count: number): BasicQuestion[] {
  const questions: BasicQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const op = pickRandom(cfg.operators);
    let a = genByDigits(cfg.firstDigits);
    let b = genSecond(cfg);
    if (op === "-" && a < b) [a, b] = [b, a];
    let answer: number;
    let display: string;
    if (op === "÷") {
      const quotient = Math.max(1, Math.floor(a / Math.max(1, b)));
      b = Math.max(2, b);
      a = b * quotient;
      answer = quotient;
      display = `${a}÷${b}=`;
    } else if (op === "×") {
      answer = a * b;
      display = `${a}×${b}=`;
    } else if (op === "-") {
      answer = a - b;
      display = `${a}-${b}=`;
    } else {
      answer = a + b;
      display = `${a}+${b}=`;
    }
    questions.push({ a, b, op, answer, display });
  }
  return questions;
}

export function generateCustomPower(cfg: CustomPowerConfig, count: number): BasicQuestion[] {
  const questions: BasicQuestion[] = [];
  for (let i = 0; i < count; i++) {
    let base: number;
    if (cfg.baseMode === "range") {
      base = randInt(cfg.baseMin!, cfg.baseMax!);
    } else {
      base = genByDigits(cfg.baseDigits!);
    }
    const power = pickRandom(cfg.powerTypes);
    const answer = power === 2 ? base * base : base * base * base;
    const display = `${base}${power === 2 ? "²" : "³"}=`;
    questions.push({ a: base, b: power, op: "×", answer, display });
  }
  return questions;
}

export function formatStandardName(cfg: CustomStandardConfig): string {
  const opStr = cfg.operators[0];
  let secondStr: string;
  if (cfg.secondMode === "random_digits") {
    secondStr = `${cfg.secondDigits}位数`;
  } else if (cfg.secondMode === "fixed") {
    secondStr = String(cfg.secondFixed);
  } else {
    secondStr = `${cfg.secondMin}~${cfg.secondMax}`;
  }
  return `${cfg.firstDigits}位数${opStr}${secondStr}`;
}

export function formatPowerName(cfg: CustomPowerConfig): string {
  const baseStr = cfg.baseMode === "range"
    ? `${cfg.baseMin}~${cfg.baseMax}`
    : `${cfg.baseDigits}位数`;
  const powerStr = cfg.powerTypes[0] === 2 ? "²" : "³";
  return `${baseStr}${powerStr}`;
}
