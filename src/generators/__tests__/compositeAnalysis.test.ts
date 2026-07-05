import { describe, it, expect } from 'vitest'
import { generateComposite, COMPOSITE_FIELDS } from '@/generators/compositeAnalysis'

describe('generateComposite', () => {
  it('生成完整 CompositeQuestion（data + answers）', () => {
    const q = generateComposite()
    expect(q.data).toBeTruthy()
    expect(q.answers).toBeTruthy()
  })

  it('已知数据 4 项在范围内', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateComposite()
      expect(q.data.currentA).toBeGreaterThanOrEqual(100)
      expect(q.data.currentA).toBeLessThanOrEqual(999)
      expect(q.data.currentB).toBeGreaterThanOrEqual(100)
      expect(q.data.currentB).toBeLessThanOrEqual(999)
      expect(q.data.r1).toBeGreaterThanOrEqual(5)
      expect(q.data.r1).toBeLessThanOrEqual(30)
      expect(q.data.r2).toBeGreaterThanOrEqual(5)
      expect(q.data.r2).toBeLessThanOrEqual(30)
    }
  })

  it('派生数据计算正确：baseA = currentA / (1 + r1/100)', () => {
    for (let i = 0; i < 10; i++) {
      const q = generateComposite()
      const expectedBaseA = q.data.currentA / (1 + q.data.r1 / 100)
      expect(q.data.baseA).toBeCloseTo(expectedBaseA, 1)
    }
  })

  it('派生数据计算正确：growthA = currentA - baseA', () => {
    for (let i = 0; i < 10; i++) {
      const q = generateComposite()
      expect(q.data.growthA).toBeCloseTo(q.data.currentA - q.data.baseA, 1)
    }
  })

  it('13 项答案无 NaN/Infinity', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateComposite()
      const a = q.answers
      for (const v of Object.values(a)) {
        expect(Number.isFinite(v)).toBe(true)
      }
    }
  })

  it("baseA（基期 A'）= currentA / (1 + r1/100)", () => {
    for (let i = 0; i < 10; i++) {
      const q = generateComposite()
      const expected = q.data.currentA / (1 + q.data.r1 / 100)
      expect(q.answers.baseA).toBeCloseTo(expected, 1)
    }
  })

  it("baseB（基期 B'）= currentB / (1 + r2/100)", () => {
    for (let i = 0; i < 10; i++) {
      const q = generateComposite()
      const expected = q.data.currentB / (1 + q.data.r2 / 100)
      expect(q.answers.baseB).toBeCloseTo(expected, 1)
    }
  })

  it('growthA（增长量 x1）= currentA - baseA', () => {
    for (let i = 0; i < 10; i++) {
      const q = generateComposite()
      expect(q.answers.growthA).toBeCloseTo(q.data.currentA - q.data.baseA, 1)
    }
  })

  it('growthB（增长量 x2）= currentB - baseB', () => {
    for (let i = 0; i < 10; i++) {
      const q = generateComposite()
      expect(q.answers.growthB).toBeCloseTo(q.data.currentB - q.data.baseB, 1)
    }
  })

  it('P（现期比重）= currentA / (currentA + currentB) × 100', () => {
    for (let i = 0; i < 10; i++) {
      const q = generateComposite()
      const expected = (q.data.currentA / (q.data.currentA + q.data.currentB)) * 100
      expect(q.answers.P).toBeCloseTo(expected, 1)
    }
  })

  it('Pp（基期比重）= baseA / (baseA + baseB) × 100', () => {
    for (let i = 0; i < 10; i++) {
      const q = generateComposite()
      const expected = (q.data.baseA / (q.data.baseA + q.data.baseB)) * 100
      expect(q.answers.Pp).toBeCloseTo(expected, 1)
    }
  })

  it('d（两期比重差）= P - Pp', () => {
    for (let i = 0; i < 10; i++) {
      const q = generateComposite()
      expect(q.answers.d).toBeCloseTo(q.answers.P - q.answers.Pp, 1)
    }
  })

  it('r（隔年增长率）= ((1+r1/100)(1+r2/100) - 1) × 100', () => {
    for (let i = 0; i < 10; i++) {
      const q = generateComposite()
      const expected = ((1 + q.data.r1 / 100) * (1 + q.data.r2 / 100) - 1) * 100
      expect(q.answers.r).toBeCloseTo(expected, 1)
    }
  })

  it('S（基期和）= baseA + baseB', () => {
    for (let i = 0; i < 10; i++) {
      const q = generateComposite()
      expect(q.answers.S).toBeCloseTo(q.data.baseA + q.data.baseB, 1)
    }
  })

  it('D（基期差）= baseA - baseB', () => {
    for (let i = 0; i < 10; i++) {
      const q = generateComposite()
      expect(q.answers.D).toBeCloseTo(q.data.baseA - q.data.baseB, 1)
    }
  })

  it('k（比值增长率）= ((currentA/currentB - baseA/baseB) / (baseA/baseB)) × 100', () => {
    for (let i = 0; i < 10; i++) {
      const q = generateComposite()
      const ratioBase = q.data.baseA / q.data.baseB
      const expected = ((q.data.currentA / q.data.currentB - ratioBase) / ratioBase) * 100
      expect(q.answers.k).toBeCloseTo(expected, 1)
    }
  })

  it('r3（AB和增长率）= ((currentA+currentB) / (baseA+baseB) - 1) × 100', () => {
    for (let i = 0; i < 10; i++) {
      const q = generateComposite()
      const expected =
        ((q.data.currentA + q.data.currentB) / (q.data.baseA + q.data.baseB) - 1) * 100
      expect(q.answers.r3).toBeCloseTo(expected, 1)
    }
  })

  it('r4（AB差增长率）= ((currentA-currentB) / (baseA-baseB) - 1) × 100（denom≠0 时）', () => {
    for (let i = 0; i < 10; i++) {
      const q = generateComposite()
      const denom = q.data.baseA - q.data.baseB
      // denom 理论上极少为 0；若碰到跳过本次（不断言）
      if (denom === 0) continue
      const expected = ((q.data.currentA - q.data.currentB) / denom - 1) * 100
      expect(q.answers.r4).toBeCloseTo(expected, 1)
    }
  })

  it('COMPOSITE_FIELDS 长度为 13', () => {
    expect(COMPOSITE_FIELDS).toHaveLength(13)
  })

  it('COMPOSITE_FIELDS 每项含 key/label/unit', () => {
    for (const f of COMPOSITE_FIELDS) {
      expect(typeof f.key).toBe('string')
      expect(f.key.length).toBeGreaterThan(0)
      expect(typeof f.label).toBe('string')
      expect(f.label.length).toBeGreaterThan(0)
      expect(typeof f.unit).toBe('string')
    }
  })

  it('COMPOSITE_FIELDS keys 与 CompositeAnswers 字段一致', () => {
    const q = generateComposite()
    const answerKeys = Object.keys(q.answers)
    const fieldKeys = COMPOSITE_FIELDS.map((f) => f.key)
    for (const k of fieldKeys) {
      expect(answerKeys).toContain(k)
    }
  })
})
