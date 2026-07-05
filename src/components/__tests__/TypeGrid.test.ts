import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TypeGrid from '@/components/TypeGrid.vue'

interface TypeItem {
  key: string
  label: string
}
interface Section {
  title: string
  types: TypeItem[]
}

const SECTIONS: Section[] = [
  {
    title: '基础运算',
    types: [
      { key: 'add', label: '加法' },
      { key: 'sub', label: '减法' },
    ],
  },
  { title: '资料分析', types: [{ key: 'growth', label: '增长率' }] },
]

describe('TypeGrid.vue', () => {
  it('渲染所有 section 与 type cell', () => {
    const wrapper = mount(TypeGrid, {
      props: { sections: SECTIONS, modelValue: '' },
    })
    expect(wrapper.text()).toContain('基础运算')
    expect(wrapper.text()).toContain('加法')
    expect(wrapper.text()).toContain('资料分析')
    expect(wrapper.text()).toContain('增长率')
  })

  it('modelValue 匹配项标记为 selected', () => {
    const wrapper = mount(TypeGrid, {
      props: { sections: SECTIONS, modelValue: 'sub' },
    })
    const sub = wrapper.find('[data-type-key="sub"]')
    expect(sub.classes()).toContain('selected')
  })

  it('点击 type cell 触发 update:modelValue', async () => {
    const wrapper = mount(TypeGrid, {
      props: { sections: SECTIONS, modelValue: '' },
    })
    await wrapper.find('[data-type-key="add"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['add'])
  })

  it('disabled 时点击不触发事件', async () => {
    const wrapper = mount(TypeGrid, {
      props: { sections: SECTIONS, modelValue: '', disabled: true },
    })
    await wrapper.find('[data-type-key="add"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('disabled 时 cell 添加 disabled class', () => {
    const wrapper = mount(TypeGrid, {
      props: { sections: SECTIONS, modelValue: '', disabled: true },
    })
    expect(wrapper.find('[data-type-key="add"]').classes()).toContain('disabled')
  })

  it('showTitle=false 时不渲染 section title', () => {
    const wrapper = mount(TypeGrid, {
      props: { sections: SECTIONS, modelValue: '', showTitle: false },
    })
    expect(wrapper.text()).not.toContain('基础运算')
  })

  it('空 sections 数组安全渲染不报错', () => {
    const wrapper = mount(TypeGrid, {
      props: { sections: [], modelValue: '' },
    })
    expect(wrapper.findAll('.type-cell')).toHaveLength(0)
  })

  it('切换 modelValue 后 selected 正确转移', async () => {
    const wrapper = mount(TypeGrid, {
      props: { sections: SECTIONS, modelValue: 'add' },
    })
    expect(wrapper.find('[data-type-key="add"]').classes()).toContain('selected')
    expect(wrapper.find('[data-type-key="sub"]').classes()).not.toContain('selected')

    await wrapper.setProps({ modelValue: 'sub' })
    expect(wrapper.find('[data-type-key="add"]').classes()).not.toContain('selected')
    expect(wrapper.find('[data-type-key="sub"]').classes()).toContain('selected')
  })

  it('modelValue 不匹配任何 key 时无 cell 被 selected', () => {
    const wrapper = mount(TypeGrid, {
      props: { sections: SECTIONS, modelValue: 'nonexistent' },
    })
    expect(wrapper.find('.selected').exists()).toBe(false)
  })
})
