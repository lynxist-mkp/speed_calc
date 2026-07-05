import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Numpad from '@/components/Numpad.vue'

describe('Numpad.vue', () => {
  it('basic variant 渲染 ± 键', () => {
    const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
    expect(wrapper.text()).toContain('±')
  })

  it('点击数字按钮触发 input 事件', async () => {
    const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
    await wrapper.find('[data-key="1"]').trigger('click')
    expect(wrapper.emitted('input')).toBeTruthy()
    expect(wrapper.emitted('input')![0]).toEqual(['1'])
  })

  it('点击小数点触发 input', async () => {
    const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
    await wrapper.find('[data-key="."]').trigger('click')
    expect(wrapper.emitted('input')![0]).toEqual(['.'])
  })

  it('点击 ± 触发 toggle-sign', async () => {
    const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
    await wrapper.find('[data-key="sign"]').trigger('click')
    expect(wrapper.emitted('toggle-sign')).toBeTruthy()
  })

  it('点击清空触发 clear', async () => {
    const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
    await wrapper.find('[data-key="clear"]').trigger('click')
    expect(wrapper.emitted('clear')).toBeTruthy()
  })

  it('点击退格触发 backspace', async () => {
    const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
    await wrapper.find('[data-key="backspace"]').trigger('click')
    expect(wrapper.emitted('backspace')).toBeTruthy()
  })

  it('点击确定触发 submit', async () => {
    const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
    await wrapper.find('[data-key="submit"]').trigger('click')
    expect(wrapper.emitted('submit')).toBeTruthy()
  })

  it('点击重开触发 restart', async () => {
    const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
    await wrapper.find('[data-key="restart"]').trigger('click')
    expect(wrapper.emitted('restart')).toBeTruthy()
  })

  it('渲染拖拽手柄且手柄含 title 提示', () => {
    const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
    const handle = wrapper.find('[data-handle="drag"]')
    expect(handle.exists()).toBe(true)
    expect(handle.attributes('title')).toBe('拖动移动 · 双击复位')
  })

  it('data variant 不渲染 ± 键', () => {
    const wrapper = mount(Numpad, { props: { variant: 'data', layout: 'normal' } })
    expect(wrapper.find('[data-key="sign"]').exists()).toBe(false)
  })

  it('data variant 渲染网格内的重开按钮且无重复', () => {
    const wrapper = mount(Numpad, { props: { variant: 'data', layout: 'normal' } })
    const restartButtons = wrapper.findAll('[data-key="restart"]')
    expect(restartButtons).toHaveLength(1)
  })

  it('手柄为 icon-only，不含常驻文案', () => {
    const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
    const handle = wrapper.find('[data-handle="drag"]')
    expect(handle.text()).not.toContain('上下拖调大小')
    expect(handle.text()).not.toContain('双击恢复')
  })

  it('重开按钮内联手柄区，不浮在卡片外', () => {
    const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
    // 重开按钮应在手柄区内（同级而非 absolute 浮空）
    const handle = wrapper.find('[data-handle="drag"]')
    const restartInHandle = handle.find('[data-key="restart"]')
    expect(restartInHandle.exists()).toBe(true)
  })

  it('basic variant 仍有独立的 ± 键在网格中', () => {
    const wrapper = mount(Numpad, { props: { variant: 'basic', layout: 'normal' } })
    const signInGrid = wrapper.find('.keypad-grid [data-key="sign"]')
    expect(signInGrid.exists()).toBe(true)
  })

  it('data variant 重开按钮在网格中（非手柄区）', () => {
    const wrapper = mount(Numpad, { props: { variant: 'data', layout: 'normal' } })
    const restartInGrid = wrapper.find('.keypad-grid [data-key="restart"]')
    expect(restartInGrid.exists()).toBe(true)
  })
})
