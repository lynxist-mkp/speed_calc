import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingRow from '@/components/SettingRow.vue'

describe('SettingRow.vue', () => {
  it('渲染 label 与默认 slot 内容', () => {
    const wrapper = mount(SettingRow, {
      props: { label: '题量' },
      slots: { default: '<span>10 题</span>' },
    })
    expect(wrapper.text()).toContain('题量')
    expect(wrapper.text()).toContain('10 题')
  })

  it('expandable=false 时不渲染展开区', () => {
    const wrapper = mount(SettingRow, {
      props: { label: '难度', expandable: false },
      slots: { default: '<span>简单</span>' },
    })
    expect(wrapper.find('.expand-area').exists()).toBe(false)
  })

  it('expandable=true 且 expanded=true 时渲染展开区', () => {
    const wrapper = mount(SettingRow, {
      props: { label: '题量', expandable: true, expanded: true },
      slots: {
        default: '<span>自定</span>',
        expand: "<div class='slider'>滑块</div>",
      },
    })
    expect(wrapper.find('.expand-area').exists()).toBe(true)
    expect(wrapper.text()).toContain('滑块')
  })

  it('expandable=true 且 expanded=false 时不渲染展开区', () => {
    const wrapper = mount(SettingRow, {
      props: { label: '题量', expandable: true, expanded: false },
      slots: {
        default: '<span>自定</span>',
        expand: '<div>滑块</div>',
      },
    })
    expect(wrapper.find('.expand-area').exists()).toBe(false)
  })
})
