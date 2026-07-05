import { describe, it, expect } from 'vitest'
import {
  generateCustomStandard,
  generateCustomPower,
  formatStandardName,
  formatPowerName,
  type CustomStandardConfig,
  type CustomPowerConfig,
} from '@/generators/custom'

describe('generateCustomStandard', () => {
  it('random_digits 模式生成正确位数', () => {
    const cfg: CustomStandardConfig = {
      firstDigits: 2,
      operators: ['+'],
      secondMode: 'random_digits',
      secondDigits: 1,
    }
    const qs = generateCustomStandard(cfg, 20)
    expect(qs).toHaveLength(20)
    for (const q of qs) {
      expect(q.op).toBe('+')
      expect(q.a).toBeGreaterThanOrEqual(10)
      expect(q.a).toBeLessThanOrEqual(99)
      expect(q.b).toBeGreaterThanOrEqual(2)
      expect(q.b).toBeLessThanOrEqual(9)
      expect(q.answer).toBe(q.a + q.b)
    }
  })

  it('fixed 模式第二个数固定', () => {
    const cfg: CustomStandardConfig = {
      firstDigits: 4,
      operators: ['-'],
      secondMode: 'fixed',
      secondFixed: 15,
    }
    const qs = generateCustomStandard(cfg, 20)
    for (const q of qs) {
      expect(q.b).toBe(15)
      expect(q.op).toBe('-')
      expect(q.answer).toBe(q.a - 15)
      expect(q.answer).toBeGreaterThanOrEqual(0)
    }
  })

  it('range 模式第二个数在范围内', () => {
    const cfg: CustomStandardConfig = {
      firstDigits: 2,
      operators: ['×'],
      secondMode: 'range',
      secondMin: 10,
      secondMax: 99,
    }
    const qs = generateCustomStandard(cfg, 50)
    for (const q of qs) {
      expect(q.b).toBeGreaterThanOrEqual(10)
      expect(q.b).toBeLessThanOrEqual(99)
      expect(q.answer).toBe(q.a * q.b)
    }
  })

  it('除法整除', () => {
    const cfg: CustomStandardConfig = {
      firstDigits: 3,
      operators: ['÷'],
      secondMode: 'random_digits',
      secondDigits: 1,
    }
    const qs = generateCustomStandard(cfg, 50)
    for (const q of qs) {
      expect(q.op).toBe('÷')
      expect(q.a % q.b).toBe(0)
      expect(q.answer).toBe(q.a / q.b)
    }
  })

  it('多运算符随机选择', () => {
    const cfg: CustomStandardConfig = {
      firstDigits: 2,
      operators: ['+', '-', '×', '÷'],
      secondMode: 'random_digits',
      secondDigits: 1,
    }
    const qs = generateCustomStandard(cfg, 100)
    const ops = new Set(qs.map((q) => q.op))
    expect(ops.size).toBe(4)
  })

  it('减法非负', () => {
    const cfg: CustomStandardConfig = {
      firstDigits: 2,
      operators: ['-'],
      secondMode: 'random_digits',
      secondDigits: 2,
    }
    const qs = generateCustomStandard(cfg, 100)
    for (const q of qs) {
      expect(q.answer).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('generateCustomPower', () => {
  it('range 模式底数在范围内', () => {
    const cfg: CustomPowerConfig = {
      baseMode: 'range',
      baseMin: 10,
      baseMax: 99,
      powerTypes: [2],
    }
    const qs = generateCustomPower(cfg, 20)
    expect(qs).toHaveLength(20)
    for (const q of qs) {
      expect(q.a).toBeGreaterThanOrEqual(10)
      expect(q.a).toBeLessThanOrEqual(99)
      expect(q.answer).toBe(q.a * q.a)
      expect(q.display).toMatch(/²=$/)
    }
  })

  it('digits 模式按位数生成底数', () => {
    const cfg: CustomPowerConfig = {
      baseMode: 'digits',
      baseDigits: 2,
      powerTypes: [3],
    }
    const qs = generateCustomPower(cfg, 50)
    for (const q of qs) {
      expect(q.a).toBeGreaterThanOrEqual(10)
      expect(q.a).toBeLessThanOrEqual(99)
      expect(q.answer).toBe(q.a * q.a * q.a)
      expect(q.display).toMatch(/³=$/)
    }
  })

  it('多指数随机选择', () => {
    const cfg: CustomPowerConfig = {
      baseMode: 'digits',
      baseDigits: 1,
      powerTypes: [2, 3],
    }
    const qs = generateCustomPower(cfg, 100)
    const displays = new Set(qs.map((q) => q.display.slice(-2, -1)))
    expect(displays.has('²')).toBe(true)
    expect(displays.has('³')).toBe(true)
  })
})

describe('name 格式化', () => {
  it('标准运算 random_digits', () => {
    const cfg: CustomStandardConfig = {
      firstDigits: 4,
      operators: ['-'],
      secondMode: 'random_digits',
      secondDigits: 4,
    }
    expect(formatStandardName(cfg)).toBe('4位数-4位数')
  })

  it('标准运算 fixed', () => {
    const cfg: CustomStandardConfig = {
      firstDigits: 2,
      operators: ['-'],
      secondMode: 'fixed',
      secondFixed: 15,
    }
    expect(formatStandardName(cfg)).toBe('2位数-15')
  })

  it('标准运算 range', () => {
    const cfg: CustomStandardConfig = {
      firstDigits: 2,
      operators: ['-'],
      secondMode: 'range',
      secondMin: 10,
      secondMax: 99,
    }
    expect(formatStandardName(cfg)).toBe('2位数-10~99')
  })

  it('幂运算', () => {
    const cfg: CustomPowerConfig = {
      baseMode: 'digits',
      baseDigits: 2,
      powerTypes: [2],
    }
    expect(formatPowerName(cfg)).toBe('2位数²')
  })
})
