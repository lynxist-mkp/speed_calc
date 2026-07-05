export interface Question {
  a: number
  b: number
  op: '+' | '-'
  answer: number
  display: string
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function generateBasicAddSub(count: number): Question[] {
  const questions: Question[] = []
  for (let i = 0; i < count; i++) {
    const op: '+' | '-' = Math.random() < 0.5 ? '+' : '-'
    let a = randInt(10, 99)
    let b = randInt(10, 99)
    // 减法保证非负：a >= b
    if (op === '-' && a < b) {
      ;[a, b] = [b, a]
    }
    const answer = op === '+' ? a + b : a - b
    questions.push({ a, b, op, answer, display: `${a}${op}${b}=` })
  }
  return questions
}

// ===== L4 扩展：17 题型 =====

export type BasicType =
  | 'addsub_2d'
  | 'round_100'
  | 'add_3d'
  | 'sub_3d'
  | 'addsub_3d'
  | 'add_multi'
  | 'addsub_mix'
  | 'mul_2x1'
  | 'mul_3x1'
  | 'mul_2x11'
  | 'mul_2x15'
  | 'mul_2x2'
  | 'div_3x1'
  | 'div_3x2'
  | 'mul_est'
  | 'div_5x3'
  | 'div_3x4'

export interface BasicQuestion {
  a: number
  b: number
  op: '+' | '-' | '×' | '÷'
  answer: number
  display: string
  preset?: string
  tolerance?: number // 仅 mul_est 用 0.02，其余 undefined 表示精确判分
}

// randInt 已在文件上方定义，复用现有函数，不要重复定义

function genAddsub2d(): BasicQuestion {
  const op: '+' | '-' = Math.random() < 0.5 ? '+' : '-'
  let a = randInt(10, 99)
  let b = randInt(10, 99)
  if (op === '-' && a < b) [a, b] = [b, a]
  const answer = op === '+' ? a + b : a - b
  return { a, b, op, answer, display: `${a}${op}${b}=` }
}

function genRound100(): BasicQuestion {
  const a = randInt(10, 90)
  const b = 100 - a
  return { a, b, op: '+', answer: 100, display: `${a}+${b}=` }
}

function genAdd3d(): BasicQuestion {
  const a = randInt(100, 999)
  const b = randInt(100, 999)
  return { a, b, op: '+', answer: a + b, display: `${a}+${b}=` }
}

function genSub3d(): BasicQuestion {
  let a = randInt(100, 999)
  let b = randInt(100, 999)
  if (a < b) [a, b] = [b, a]
  return { a, b, op: '-', answer: a - b, display: `${a}-${b}=` }
}

function genAddsub3d(): BasicQuestion {
  const op: '+' | '-' = Math.random() < 0.5 ? '+' : '-'
  let a = randInt(100, 999)
  let b = randInt(100, 999)
  if (op === '-' && a < b) [a, b] = [b, a]
  const answer = op === '+' ? a + b : a - b
  return { a, b, op, answer, display: `${a}${op}${b}=` }
}

function genAddMulti(): BasicQuestion {
  const n = Math.random() < 0.5 ? 3 : 4
  const nums: number[] = []
  for (let i = 0; i < n; i++) nums.push(randInt(10, 99))
  const answer = nums.reduce((s, x) => s + x, 0)
  return { a: nums[0], b: nums[1], op: '+', answer, display: nums.join('+') + '=' }
}

function genAddsubMix(): BasicQuestion {
  const a = randInt(10, 99)
  const b = randInt(10, 99)
  const c = randInt(10, 99)
  const op2: '+' | '-' = Math.random() < 0.5 ? '+' : '-'
  let answer = a + b
  if (op2 === '-') answer = answer - c
  else answer = answer + c
  if (answer < 0) {
    return { a, b, op: '+', answer: a + b + c, display: `${a}+${b}+${c}=` }
  }
  return { a, b, op: '+', answer, display: `${a}+${b}${op2}${c}=` }
}

function genMul2x1(): BasicQuestion {
  const a = randInt(10, 99)
  const b = randInt(2, 9)
  return { a, b, op: '×', answer: a * b, display: `${a}×${b}=` }
}

function genMul3x1(): BasicQuestion {
  const a = randInt(100, 999)
  const b = randInt(2, 9)
  return { a, b, op: '×', answer: a * b, display: `${a}×${b}=` }
}

function genMul2x11(): BasicQuestion {
  const a = randInt(10, 99)
  return { a, b: 11, op: '×', answer: a * 11, display: `${a}×11=` }
}

function genMul2x15(): BasicQuestion {
  const a = randInt(10, 99)
  return { a, b: 15, op: '×', answer: a * 15, display: `${a}×15=` }
}

function genMul2x2(): BasicQuestion {
  const a = randInt(10, 99)
  const b = randInt(10, 99)
  return { a, b, op: '×', answer: a * b, display: `${a}×${b}=` }
}

function genDiv3x1(): BasicQuestion {
  const b = randInt(2, 9)
  const quotient = randInt(50, 111) // a∈[100,999]
  const a = b * quotient
  return { a, b, op: '÷', answer: quotient, display: `${a}÷${b}=` }
}

function genDiv3x2(): BasicQuestion {
  let a: number, b: number, quotient: number
  do {
    b = randInt(10, 99)
    quotient = randInt(2, 9)
    a = b * quotient
  } while (a < 100)
  return { a, b, op: '÷', answer: quotient, display: `${a}÷${b}=` }
}

function genMulEst(): BasicQuestion {
  const a = randInt(100, 999)
  const b = randInt(10, 99)
  const exact = a * b
  const answer = Math.round(exact / 10) * 10
  return { a, b, op: '×', answer, display: `${a}×${b}≈`, tolerance: 0.02 }
}

function genDiv5x3(): BasicQuestion {
  // 五位数除三位数：保证 a∈[10000,99999]
  let a: number, b: number, quotient: number
  do {
    b = randInt(100, 999)
    quotient = randInt(10, 99)
    a = b * quotient
  } while (a < 10000)
  return { a, b, op: '÷', answer: quotient, display: `${a}÷${b}=` }
}

function genDiv3x4(): BasicQuestion {
  // 三位数除四位数：被除数是 3 位，除数是 4 位，结果<1
  const a = randInt(100, 999)
  const bb = randInt(1000, 9999)
  const answer = a / bb
  return {
    a,
    b: bb,
    op: '÷',
    answer: Number(answer.toFixed(4)),
    display: `${a}÷${bb}≈`,
    preset: '0.',
  }
}

const GENERATORS: Record<BasicType, () => BasicQuestion> = {
  addsub_2d: genAddsub2d,
  round_100: genRound100,
  add_3d: genAdd3d,
  sub_3d: genSub3d,
  addsub_3d: genAddsub3d,
  add_multi: genAddMulti,
  addsub_mix: genAddsubMix,
  mul_2x1: genMul2x1,
  mul_3x1: genMul3x1,
  mul_2x11: genMul2x11,
  mul_2x15: genMul2x15,
  mul_2x2: genMul2x2,
  div_3x1: genDiv3x1,
  div_3x2: genDiv3x2,
  mul_est: genMulEst,
  div_5x3: genDiv5x3,
  div_3x4: genDiv3x4,
}

export function generateBasic(type: BasicType, count: number): BasicQuestion[] {
  const gen = GENERATORS[type]
  const questions: BasicQuestion[] = []
  for (let i = 0; i < count; i++) questions.push(gen())
  return questions
}
