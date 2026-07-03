export interface Question {
  a: number;
  b: number;
  op: "+" | "-";
  answer: number;
  display: string;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateBasicAddSub(count: number): Question[] {
  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    const op: "+" | "-" = Math.random() < 0.5 ? "+" : "-";
    let a = randInt(10, 99);
    let b = randInt(10, 99);
    // 减法保证非负：a >= b
    if (op === "-" && a < b) {
      [a, b] = [b, a];
    }
    const answer = op === "+" ? a + b : a - b;
    questions.push({ a, b, op, answer, display: `${a}${op}${b}=` });
  }
  return questions;
}
