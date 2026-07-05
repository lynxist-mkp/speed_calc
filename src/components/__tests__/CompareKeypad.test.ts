import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CompareKeypad from '@/components/CompareKeypad.vue'

describe('CompareKeypad.vue', () => {
  it('渲染 4 按钮：大于/小于/重开/确定', () => {
    const wrapper = mount(CompareKeypad, {
      props: { selected: null },
    })
    expect(wrapper.text()).toContain('大于')
    expect(wrapper.text()).toContain('小于')
    expect(wrapper.text()).toContain('重开')
    expect(wrapper.text()).toContain('确定')
  })

  it('点击大于 → emit select 带 >', async () => {
    const wrapper = mount(CompareKeypad, { props: { selected: null } })
    await wrapper.find('[data-testid="btn-gt"]').trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')![0]).toEqual(['>'])
  })

  it('点击小于 → emit select 带 <', async () => {
    const wrapper = mount(CompareKeypad, { props: { selected: null } })
    await wrapper.find('[data-testid="btn-lt"]').trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')![0]).toEqual(['<'])
  })

  it('点击重开 → emit restart', async () => {
    const wrapper = mount(CompareKeypad, { props: { selected: null } })
    await wrapper.find('[data-testid="btn-restart"]').trigger('click')
    expect(wrapper.emitted('restart')).toBeTruthy()
  })

  it('点击确定 → emit submit', async () => {
    const wrapper = mount(CompareKeypad, { props: { selected: '>' } })
    await wrapper.find('[data-testid="btn-submit"]').trigger('click')
    expect(wrapper.emitted('submit')).toBeTruthy()
  })

  it("selected='>' 时大于按钮高亮（active 类）", () => {
    const wrapper = mount(CompareKeypad, { props: { selected: '>' } })
    expect(wrapper.find('[data-testid="btn-gt"]').classes()).toContain('active')
    expect(wrapper.find('[data-testid="btn-lt"]').classes()).not.toContain('active')
  })

  it("selected='<' 时小于按钮高亮（active 类）", () => {
    const wrapper = mount(CompareKeypad, { props: { selected: '<' } })
    expect(wrapper.find('[data-testid="btn-lt"]').classes()).toContain('active')
    expect(wrapper.find('[data-testid="btn-gt"]').classes()).not.toContain('active')
  })

  it('selected=null 时无高亮', () => {
    const wrapper = mount(CompareKeypad, { props: { selected: null } })
    expect(wrapper.find('[data-testid="btn-gt"]').classes()).not.toContain('active')
    expect(wrapper.find('[data-testid="btn-lt"]').classes()).not.toContain('active')
  })

  it('selected=null 时确定按钮 disabled', () => {
    const wrapper = mount(CompareKeypad, { props: { selected: null } })
    expect(wrapper.find('[data-testid="btn-submit"]').attributes('disabled')).toBeDefined()
  })

  it("selected='>' 时确定按钮可点击（非 disabled）", () => {
    const wrapper = mount(CompareKeypad, { props: { selected: '>' } })
    expect(wrapper.find('[data-testid="btn-submit"]').attributes('disabled')).toBeUndefined()
  })
})
