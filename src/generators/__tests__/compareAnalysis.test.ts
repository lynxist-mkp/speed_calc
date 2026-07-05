import { describe, it, expect } from 'vitest'
import { generateCompareQuestion, type CompareType } from '@/generators/compareAnalysis'

describe('generateCompareQuestion', () => {
  describe('通用', () => {
    it('3 类题型各生成指定数量', () => {
      const types: CompareType[] = ['compare_growth', 'compare_base', 'compare_frac']
      for (const t of types) {
        const qs = generateCompareQuestion(t, 5)
        expect(qs).toHaveLength(5)
        for (const q of qs) {
          expect(q.type).toBe(t)
        }
      }
    })

    it('每题含必填字段', () => {
      const qs = generateCompareQuestion('compare_growth', 5)
      for (const q of qs) {
        expect(typeof q.display.leftTex).toBe('string')
        expect(q.display.leftTex.length).toBeGreaterThan(0)
        expect(typeof q.display.rightTex).toBe('string')
        expect(q.display.rightTex.length).toBeGreaterThan(0)
        expect(typeof q.leftValue).toBe('number')
        expect(typeof q.rightValue).toBe('number')
        expect(q.answer === '>' || q.answer === '<').toBe(true)
        expect(q.pattern === 'A' || q.pattern === 'B').toBe(true)
      }
    })

    it('无等号：leftValue !== rightValue', () => {
      const qs = generateCompareQuestion('compare_frac', 50)
      for (const q of qs) {
        expect(q.leftValue).not.toBe(q.rightValue)
      }
    })

    it('answer 与 leftValue/rightValue 一致', () => {
      const qs = generateCompareQuestion('compare_frac', 20)
      for (const q of qs) {
        const expected = q.leftValue > q.rightValue ? '>' : '<'
        expect(q.answer).toBe(expected)
      }
    })
  })

  describe('模式 A 相近难分', () => {
    it('实际值差 1%~5%（frac 验证分母层差 <10%）', () => {
      const qs = generateCompareQuestion('compare_frac', 100)
      const aQs = qs.filter((q) => q.pattern === 'A')
      expect(aQs.length).toBeGreaterThan(0)
      for (const q of aQs) {
        const diff = Math.abs(q.leftValue - q.rightValue)
        const base = Math.max(Math.abs(q.leftValue), Math.abs(q.rightValue))
        const ratio = diff / base
        expect(ratio).toBeGreaterThanOrEqual(0.005)
        expect(ratio).toBeLessThanOrEqual(0.06)
      }
    })
  })

  describe('模式 B 整数倍率', () => {
    it('实际值差 1%~5%', () => {
      const qs = generateCompareQuestion('compare_frac', 100)
      const bQs = qs.filter((q) => q.pattern === 'B')
      expect(bQs.length).toBeGreaterThan(0)
      for (const q of bQs) {
        const diff = Math.abs(q.leftValue - q.rightValue)
        const base = Math.max(Math.abs(q.leftValue), Math.abs(q.rightValue))
        const ratio = diff / base
        expect(ratio).toBeLessThanOrEqual(0.06)
      }
    })

    it('compare_growth pattern B 底层参数满足整数倍率（A2/A1 ∈ {2,3}）', () => {
      const qs = generateCompareQuestion('compare_growth', 100)
      const bQs = qs.filter((q) => q.pattern === 'B')
      expect(bQs.length).toBeGreaterThan(0)
      for (const q of bQs) {
        // context 格式: "左: 现期${A1}, 增长率${r1}%; 右: 现期${A2}, 增长率${r2}%"
        const m = q.context?.match(/左: 现期(\d+),.*右: 现期(\d+),/)
        expect(m).not.toBeNull()
        const A1 = Number(m![1])
        const A2 = Number(m![2])
        const ratio = A2 / A1
        expect(ratio === 2 || ratio === 3).toBe(true)
      }
    })

    it('compare_frac pattern B 底层参数满足整数倍率（b2/b1 ∈ {2,3}）', () => {
      const qs = generateCompareQuestion('compare_frac', 100)
      const bQs = qs.filter((q) => q.pattern === 'B')
      expect(bQs.length).toBeGreaterThan(0)
      for (const q of bQs) {
        // context 格式: "左: 分子${a1}, 分母${b1}; 右: 分子${a2}, 分母${b2}"
        const m = q.context?.match(/左: 分子(\d+), 分母(\d+); 右: 分子(\d+), 分母(\d+)/)
        expect(m).not.toBeNull()
        const b1 = Number(m![2])
        const b2 = Number(m![4])
        const ratio = b2 / b1
        expect(ratio === 2 || ratio === 3).toBe(true)
      }
    })

    it('compare_base 只使用 pattern A（r∈[5,30] 限制下 pattern B 数学上难以满足 valueDiffInRange）', () => {
      const qs = generateCompareQuestion('compare_base', 100)
      for (const q of qs) {
        expect(q.pattern).toBe('A')
      }
    })
  })

  describe('答案分布', () => {
    it('100 题中 > 和 < 各占比 40%~60%', () => {
      const qs = generateCompareQuestion('compare_growth', 100)
      const gt = qs.filter((q) => q.answer === '>').length
      const lt = qs.filter((q) => q.answer === '<').length
      expect(gt).toBeGreaterThanOrEqual(40)
      expect(gt).toBeLessThanOrEqual(60)
      expect(lt).toBeGreaterThanOrEqual(40)
      expect(lt).toBeLessThanOrEqual(60)
    })
  })

  describe('display tex 格式', () => {
    it('compare_growth 含 \\times 和 \\%', () => {
      const qs = generateCompareQuestion('compare_growth', 5)
      for (const q of qs) {
        expect(q.display.leftTex).toContain('\\times')
        expect(q.display.leftTex).toContain('%')
        expect(q.display.rightTex).toContain('\\times')
        expect(q.display.rightTex).toContain('%')
      }
    })

    it('compare_base 含 \\frac', () => {
      const qs = generateCompareQuestion('compare_base', 5)
      for (const q of qs) {
        expect(q.display.leftTex).toContain('\\frac')
        expect(q.display.rightTex).toContain('\\frac')
      }
    })

    it('compare_frac 含 \\frac', () => {
      const qs = generateCompareQuestion('compare_frac', 5)
      for (const q of qs) {
        expect(q.display.leftTex).toContain('\\frac')
        expect(q.display.rightTex).toContain('\\frac')
      }
    })
  })

  describe('context 字段', () => {
    it('compare_growth context 含现期和增长率', () => {
      const qs = generateCompareQuestion('compare_growth', 5)
      for (const q of qs) {
        expect(q.context).toContain('现期')
        expect(q.context).toContain('增长率')
      }
    })

    it('compare_base context 含现期和增长率', () => {
      const qs = generateCompareQuestion('compare_base', 5)
      for (const q of qs) {
        expect(q.context).toContain('现期')
        expect(q.context).toContain('增长率')
      }
    })

    it('compare_frac context 含分子和分母', () => {
      const qs = generateCompareQuestion('compare_frac', 5)
      for (const q of qs) {
        expect(q.context).toContain('分子')
        expect(q.context).toContain('分母')
      }
    })
  })
})
