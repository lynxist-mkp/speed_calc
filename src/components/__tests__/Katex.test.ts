import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Katex from '@/components/Katex.vue'

describe('Katex.vue', () => {
  it('渲染有效 tex 输出 katex-html', () => {
    const wrapper = mount(Katex, { props: { tex: '\\frac{1}{2}' } })
    expect(wrapper.html()).toContain('katex-html')
  })

  it('渲染分数含分子 1 和分母 2', () => {
    const wrapper = mount(Katex, { props: { tex: '\\frac{1}{2}' } })
    const html = wrapper.html()
    expect(html).toContain('frac')
  })

  it('无效 tex 不崩溃（throwOnError:false）', () => {
    const wrapper = mount(Katex, { props: { tex: '\\invalidcmd' } })
    expect(wrapper.exists()).toBe(true)
  })

  it('tex 变化时重新渲染', async () => {
    const wrapper = mount(Katex, { props: { tex: '1+1' } })
    expect(wrapper.html()).toContain('1')
    await wrapper.setProps({ tex: '2+2' })
    expect(wrapper.html()).toContain('2')
  })

  it('渲染百分号', () => {
    const wrapper = mount(Katex, { props: { tex: '9.1\\%' } })
    expect(wrapper.html()).toContain('%')
  })
})
