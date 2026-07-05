import { describe, it, expect } from 'vitest'
import { resolveNumpadKey, resolveCompareKey } from '@/utils/keymap'
import type { KeyboardLayout } from '@/utils/keymap'

describe('resolveNumpadKey - 数字题模式', () => {
  // 右手小键盘区映射（方案 A 核心）
  it('KeyU → 7', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyU' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '7' })
  })

  it('KeyI → 8', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyI' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '8' })
  })

  it('KeyO → 9', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyO' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '9' })
  })

  it('KeyJ → 4', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyJ' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '4' })
  })

  it('KeyK → 5', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyK' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '5' })
  })

  it('KeyL → 6', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyL' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '6' })
  })

  it('KeyM → 1', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyM' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '1' })
  })

  it('Comma → 2', () => {
    const e = new KeyboardEvent('keydown', { code: 'Comma' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '2' })
  })

  it('Period → 3', () => {
    const e = new KeyboardEvent('keydown', { code: 'Period' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '3' })
  })

  it('Space → 0', () => {
    const e = new KeyboardEvent('keydown', { code: 'Space' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '0' })
  })

  it('Slash → .（小数点）', () => {
    const e = new KeyboardEvent('keydown', { code: 'Slash' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '.' })
  })

  // 横排数字键（备用）
  it('Digit1 → 1', () => {
    const e = new KeyboardEvent('keydown', { code: 'Digit1' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '1' })
  })

  it('Digit0 → 0', () => {
    const e = new KeyboardEvent('keydown', { code: 'Digit0' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '0' })
  })

  it('Digit9 → 9', () => {
    const e = new KeyboardEvent('keydown', { code: 'Digit9' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '9' })
  })

  // 小数点兼容（外接小键盘）
  it('NumpadDecimal → .', () => {
    const e = new KeyboardEvent('keydown', { code: 'NumpadDecimal' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '.' })
  })
})

describe('resolveNumpadKey - 功能键', () => {
  it('Backspace → function/backspace', () => {
    const e = new KeyboardEvent('keydown', { code: 'Backspace' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'function', payload: 'backspace' })
  })

  it('Enter → function/submit', () => {
    const e = new KeyboardEvent('keydown', { code: 'Enter' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'function', payload: 'submit' })
  })

  it('Escape → function/restart', () => {
    const e = new KeyboardEvent('keydown', { code: 'Escape' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'function', payload: 'restart' })
  })

  it('Delete → function/clear', () => {
    const e = new KeyboardEvent('keydown', { code: 'Delete' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'function', payload: 'clear' })
  })

  it('Minus → function/toggle-sign', () => {
    const e = new KeyboardEvent('keydown', { code: 'Minus' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'function', payload: 'toggle-sign' })
  })
})

describe('resolveNumpadKey - 未知键', () => {
  it('KeyA → ignore', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyA' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'ignore' })
  })

  it('Tab → ignore', () => {
    const e = new KeyboardEvent('keydown', { code: 'Tab' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'ignore' })
  })
})

describe('resolveCompareKey', () => {
  it('Comma → select/<', () => {
    const e = new KeyboardEvent('keydown', { code: 'Comma' })
    expect(resolveCompareKey(e)).toEqual({ type: 'select', payload: '<' })
  })

  it('Period → select/>', () => {
    const e = new KeyboardEvent('keydown', { code: 'Period' })
    expect(resolveCompareKey(e)).toEqual({ type: 'select', payload: '>' })
  })

  it('Enter → submit', () => {
    const e = new KeyboardEvent('keydown', { code: 'Enter' })
    expect(resolveCompareKey(e)).toEqual({ type: 'submit' })
  })

  it('Escape → restart', () => {
    const e = new KeyboardEvent('keydown', { code: 'Escape' })
    expect(resolveCompareKey(e)).toEqual({ type: 'restart' })
  })

  // 兼容：e.key 字符检测
  it("e.key='<' → select/<", () => {
    const e = new KeyboardEvent('keydown', { code: '', key: '<' })
    expect(resolveCompareKey(e)).toEqual({ type: 'select', payload: '<' })
  })

  it("e.key='>' → select/>", () => {
    const e = new KeyboardEvent('keydown', { code: '', key: '>' })
    expect(resolveCompareKey(e)).toEqual({ type: 'select', payload: '>' })
  })

  it("e.key='《' → select/<", () => {
    const e = new KeyboardEvent('keydown', { code: '', key: '《' })
    expect(resolveCompareKey(e)).toEqual({ type: 'select', payload: '<' })
  })

  it("e.key='》' → select/>", () => {
    const e = new KeyboardEvent('keydown', { code: '', key: '》' })
    expect(resolveCompareKey(e)).toEqual({ type: 'select', payload: '>' })
  })

  it('KeyA → ignore', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyA' })
    expect(resolveCompareKey(e)).toEqual({ type: 'ignore' })
  })
})

describe('系统级 Norman 布局兼容性（e.code 不变，用默认 qwerty 映射）', () => {
  // 系统级 Norman（在 macOS 系统设置中选择 Norman 输入源）：
  // e.code 仍反映物理键位置，e.key 是 Norman 字符。
  // 用默认 layout="qwerty" 即可正确映射。
  it("物理 KeyJ 位置（系统级 Norman 产生 'n' 字符）→ 4", () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyJ', key: 'n' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '4' })
  })

  it("物理 KeyK 位置（系统级 Norman 产生 'i' 字符）→ 5", () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyK', key: 'i' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '5' })
  })

  it("物理 KeyL 位置（系统级 Norman 产生 'o' 字符）→ 6", () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyL', key: 'o' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '6' })
  })

  it('物理 Comma 位置 → 2（Norman 第 3 排与 QWERTY 相同）', () => {
    const e = new KeyboardEvent('keydown', { code: 'Comma', key: ',' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '2' })
  })

  it('物理 Period 位置 → 3（Norman 第 3 排与 QWERTY 相同）', () => {
    const e = new KeyboardEvent('keydown', { code: 'Period', key: '.' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '3' })
  })

  it('物理 Slash 位置 → .（Norman 第 3 排与 QWERTY 相同）', () => {
    const e = new KeyboardEvent('keydown', { code: 'Slash', key: '/' })
    expect(resolveNumpadKey(e)).toEqual({ type: 'input', payload: '.' })
  })

  // compare 题同样只看 e.code
  it('compare 题物理 Comma 位置 → select/<', () => {
    const e = new KeyboardEvent('keydown', { code: 'Comma' })
    expect(resolveCompareKey(e)).toEqual({ type: 'select', payload: '<' })
  })
})

describe("Karabiner + Norman 布局（layout='norman'，e.code 被 Karabiner 改变）", () => {
  // Karabiner-Elements 在驱动层工作，会改变 e.code，使其反映 Norman 字符在 QWERTY 中的位置。
  // 物理 QWERTY u/i/o 位置 → Norman u/r/l → e.code=KeyU/KeyR/KeyL
  // 物理 QWERTY j/k/l 位置 → Norman n/i/o → e.code=KeyN/KeyI/KeyO
  const layout: KeyboardLayout = 'norman'

  it('物理 u 位置（Karabiner 后 e.code=KeyU）→ 7', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyU', key: 'u' })
    expect(resolveNumpadKey(e, layout)).toEqual({ type: 'input', payload: '7' })
  })

  it('物理 i 位置（Karabiner 后 e.code=KeyR）→ 8', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyR', key: 'r' })
    expect(resolveNumpadKey(e, layout)).toEqual({ type: 'input', payload: '8' })
  })

  it('物理 o 位置（Karabiner 后 e.code=KeyL）→ 9', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyL', key: 'l' })
    expect(resolveNumpadKey(e, layout)).toEqual({ type: 'input', payload: '9' })
  })

  it('物理 j 位置（Karabiner 后 e.code=KeyN）→ 4', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyN', key: 'n' })
    expect(resolveNumpadKey(e, layout)).toEqual({ type: 'input', payload: '4' })
  })

  it('物理 k 位置（Karabiner 后 e.code=KeyI）→ 5', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyI', key: 'i' })
    expect(resolveNumpadKey(e, layout)).toEqual({ type: 'input', payload: '5' })
  })

  it('物理 l 位置（Karabiner 后 e.code=KeyO）→ 6', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyO', key: 'o' })
    expect(resolveNumpadKey(e, layout)).toEqual({ type: 'input', payload: '6' })
  })

  // 第 3 排（m/,/.）在 Norman 中位置不变，e.code 不变
  it('物理 m 位置（e.code=KeyM 不变）→ 1', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyM' })
    expect(resolveNumpadKey(e, layout)).toEqual({ type: 'input', payload: '1' })
  })

  it('物理 , 位置（e.code=Comma 不变）→ 2', () => {
    const e = new KeyboardEvent('keydown', { code: 'Comma' })
    expect(resolveNumpadKey(e, layout)).toEqual({ type: 'input', payload: '2' })
  })

  it('物理 . 位置（e.code=Period 不变）→ 3', () => {
    const e = new KeyboardEvent('keydown', { code: 'Period' })
    expect(resolveNumpadKey(e, layout)).toEqual({ type: 'input', payload: '3' })
  })

  it('物理 / 位置（e.code=Slash 不变）→ .', () => {
    const e = new KeyboardEvent('keydown', { code: 'Slash' })
    expect(resolveNumpadKey(e, layout)).toEqual({ type: 'input', payload: '.' })
  })

  it('Space → 0', () => {
    const e = new KeyboardEvent('keydown', { code: 'Space' })
    expect(resolveNumpadKey(e, layout)).toEqual({ type: 'input', payload: '0' })
  })

  // 功能键不受布局影响
  it('Backspace → function/backspace', () => {
    const e = new KeyboardEvent('keydown', { code: 'Backspace' })
    expect(resolveNumpadKey(e, layout)).toEqual({ type: 'function', payload: 'backspace' })
  })

  // 横排数字键不受布局影响
  it('Digit5 → 5（横排数字键在 Norman 中位置不变）', () => {
    const e = new KeyboardEvent('keydown', { code: 'Digit5' })
    expect(resolveNumpadKey(e, layout)).toEqual({ type: 'input', payload: '5' })
  })

  // Norman 布局下，QWERTY 的 KeyJ（不在 Norman 右手区）应被忽略
  it('e.code=KeyJ（Norman 布局中不存在此映射）→ ignore', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyJ' })
    expect(resolveNumpadKey(e, layout)).toEqual({ type: 'ignore' })
  })

  it('e.code=KeyK（Norman 布局中不存在此映射）→ ignore', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyK' })
    expect(resolveNumpadKey(e, layout)).toEqual({ type: 'ignore' })
  })
})
