import { describe, it, expect } from 'vitest'
import { generateBasic, type BasicType } from '@/generators/basic'

const ALL_TYPES: BasicType[] = [
  'addsub_2d',
  'round_100',
  'add_3d',
  'sub_3d',
  'addsub_3d',
  'add_multi',
  'addsub_mix',
  'mul_2x1',
  'mul_3x1',
  'mul_2x11',
  'mul_2x15',
  'mul_2x2',
  'div_3x1',
  'div_3x2',
  'mul_est',
  'div_5x3',
  'div_3x4',
]

describe('generateBasic 17 题型调度', () => {
  it('每个题型能生成指定数量', () => {
    for (const t of ALL_TYPES) {
      const qs = generateBasic(t, 5)
      expect(qs).toHaveLength(5)
    }
  })

  it('BasicQuestion display 以 = 结尾', () => {
    const qs = generateBasic('add_3d', 3)
    for (const q of qs) {
      expect(q.display).toMatch(/=$/)
    }
  })
})

describe('各题型数值范围与计算正确性', () => {
  it('round_100: a+b=100', () => {
    const qs = generateBasic('round_100', 50)
    for (const q of qs) {
      expect(q.a + q.b).toBe(100)
      expect(q.answer).toBe(100)
      expect(q.op).toBe('+')
    }
  })

  it('add_3d: 三位数加法', () => {
    const qs = generateBasic('add_3d', 50)
    for (const q of qs) {
      expect(q.a).toBeGreaterThanOrEqual(100)
      expect(q.a).toBeLessThanOrEqual(999)
      expect(q.b).toBeGreaterThanOrEqual(100)
      expect(q.b).toBeLessThanOrEqual(999)
      expect(q.answer).toBe(q.a + q.b)
    }
  })

  it('sub_3d: 三位数减法非负', () => {
    const qs = generateBasic('sub_3d', 50)
    for (const q of qs) {
      expect(q.op).toBe('-')
      expect(q.answer).toBeGreaterThanOrEqual(0)
      expect(q.answer).toBe(q.a - q.b)
    }
  })

  it('addsub_3d: 三位数加减混合', () => {
    const qs = generateBasic('addsub_3d', 50)
    for (const q of qs) {
      expect(q.a).toBeGreaterThanOrEqual(100)
      expect(q.a).toBeLessThanOrEqual(999)
      expect(q.b).toBeGreaterThanOrEqual(100)
      expect(q.b).toBeLessThanOrEqual(999)
      if (q.op === '+') expect(q.answer).toBe(q.a + q.b)
      if (q.op === '-') {
        expect(q.answer).toBe(q.a - q.b)
        expect(q.answer).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('add_multi: 3-4 个两位数相加', () => {
    const qs = generateBasic('add_multi', 50)
    for (const q of qs) {
      const parts = q.display.replace(/=$/, '').split('+')
      expect(parts.length).toBeGreaterThanOrEqual(3)
      expect(parts.length).toBeLessThanOrEqual(4)
      for (const p of parts) {
        const n = Number(p)
        expect(n).toBeGreaterThanOrEqual(10)
        expect(n).toBeLessThanOrEqual(99)
      }
    }
  })

  it('addsub_mix: 3 个两位数', () => {
    const qs = generateBasic('addsub_mix', 50)
    for (const q of qs) {
      const matches = q.display.match(/\d+/g)
      expect(matches).not.toBeNull()
      expect(matches!.length).toBe(3)
    }
  })

  it('mul_2x1: 两位数乘一位数', () => {
    const qs = generateBasic('mul_2x1', 50)
    for (const q of qs) {
      expect(q.op).toBe('×')
      expect(q.a).toBeGreaterThanOrEqual(10)
      expect(q.a).toBeLessThanOrEqual(99)
      expect(q.b).toBeGreaterThanOrEqual(2)
      expect(q.b).toBeLessThanOrEqual(9)
      expect(q.answer).toBe(q.a * q.b)
    }
  })

  it('mul_3x1: 三位数乘一位数', () => {
    const qs = generateBasic('mul_3x1', 50)
    for (const q of qs) {
      expect(q.op).toBe('×')
      expect(q.a).toBeGreaterThanOrEqual(100)
      expect(q.a).toBeLessThanOrEqual(999)
      expect(q.answer).toBe(q.a * q.b)
    }
  })

  it('mul_2x11: 两位数乘 11', () => {
    const qs = generateBasic('mul_2x11', 50)
    for (const q of qs) {
      expect(q.op).toBe('×')
      expect(q.b).toBe(11)
      expect(q.answer).toBe(q.a * 11)
    }
  })

  it('mul_2x15: 两位数乘 15', () => {
    const qs = generateBasic('mul_2x15', 50)
    for (const q of qs) {
      expect(q.op).toBe('×')
      expect(q.b).toBe(15)
      expect(q.answer).toBe(q.a * 15)
    }
  })

  it('mul_2x2: 两位数乘两位数', () => {
    const qs = generateBasic('mul_2x2', 50)
    for (const q of qs) {
      expect(q.op).toBe('×')
      expect(q.a).toBeGreaterThanOrEqual(10)
      expect(q.a).toBeLessThanOrEqual(99)
      expect(q.b).toBeGreaterThanOrEqual(10)
      expect(q.b).toBeLessThanOrEqual(99)
      expect(q.answer).toBe(q.a * q.b)
    }
  })

  it('div_3x1: 三位数除一位数整除', () => {
    const qs = generateBasic('div_3x1', 50)
    for (const q of qs) {
      expect(q.op).toBe('÷')
      expect(q.a).toBeGreaterThanOrEqual(100)
      expect(q.a).toBeLessThanOrEqual(999)
      expect(q.b).toBeGreaterThanOrEqual(2)
      expect(q.b).toBeLessThanOrEqual(9)
      expect(q.a % q.b).toBe(0)
      expect(q.answer).toBe(q.a / q.b)
    }
  })

  it('div_3x2: 三位数除两位数整除', () => {
    const qs = generateBasic('div_3x2', 50)
    for (const q of qs) {
      expect(q.op).toBe('÷')
      expect(q.a).toBeGreaterThanOrEqual(100)
      expect(q.a).toBeLessThanOrEqual(999)
      expect(q.b).toBeGreaterThanOrEqual(10)
      expect(q.b).toBeLessThanOrEqual(99)
      expect(q.a % q.b).toBe(0)
      expect(q.answer).toBe(q.a / q.b)
    }
  })

  it('mul_est: 乘法估算答案取整到十位', () => {
    const qs = generateBasic('mul_est', 50)
    for (const q of qs) {
      expect(q.op).toBe('×')
      expect(q.a).toBeGreaterThanOrEqual(100)
      expect(q.a).toBeLessThanOrEqual(999)
      expect(q.b).toBeGreaterThanOrEqual(10)
      expect(q.b).toBeLessThanOrEqual(99)
      expect(q.answer % 10).toBe(0)
      expect(q.tolerance).toBe(0.02)
    }
  })

  it('div_5x3: 五位数除三位数整除', () => {
    const qs = generateBasic('div_5x3', 50)
    for (const q of qs) {
      expect(q.op).toBe('÷')
      expect(q.a).toBeGreaterThanOrEqual(10000)
      expect(q.a).toBeLessThanOrEqual(99999)
      expect(q.b).toBeGreaterThanOrEqual(100)
      expect(q.b).toBeLessThanOrEqual(999)
      expect(q.a % q.b).toBe(0)
      expect(q.answer).toBe(q.a / q.b)
    }
  })

  it('div_3x4: 三位数除四位数结果<1 预填 0.', () => {
    const qs = generateBasic('div_3x4', 50)
    for (const q of qs) {
      expect(q.op).toBe('÷')
      expect(q.a).toBeGreaterThanOrEqual(100)
      expect(q.a).toBeLessThanOrEqual(999)
      expect(q.b).toBeGreaterThanOrEqual(1000)
      expect(q.b).toBeLessThanOrEqual(9999)
      expect(q.answer).toBeLessThan(1)
      expect(q.preset).toBe('0.')
    }
  })
})

describe('边界与随机性', () => {
  it('count=5 与 count=100', () => {
    expect(generateBasic('add_3d', 5)).toHaveLength(5)
    expect(generateBasic('add_3d', 100)).toHaveLength(100)
  })

  it('多次调用结果不全相同', () => {
    const run1 = generateBasic('mul_2x2', 20)
      .map((q) => q.display)
      .join(',')
    const run2 = generateBasic('mul_2x2', 20)
      .map((q) => q.display)
      .join(',')
    expect(run1).not.toEqual(run2)
  })
})
