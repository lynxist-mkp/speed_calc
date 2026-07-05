import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import QuestionDisplay from '@/components/QuestionDisplay.vue'

describe('QuestionDisplay.vue', () => {
  it('基础计算模式渲染纯文本 display', () => {
    const wrapper = mount(QuestionDisplay, {
      props: {
        display: '61+84=',
        isData: false,
        answer: '145',
      },
    })
    expect(wrapper.text()).toContain('61+84=')
    expect(wrapper.text()).toContain('145')
  })

  it('基础计算模式不渲染 context', () => {
    const wrapper = mount(QuestionDisplay, {
      props: { display: '61+84=', isData: false, answer: '145' },
    })
    expect(wrapper.find('.context').exists()).toBe(false)
  })

  it('资料分析模式渲染 KaTeX', () => {
    const wrapper = mount(QuestionDisplay, {
      props: {
        display: '\\frac{9738}{1.102} \\approx',
        isData: true,
        answer: '8836',
      },
    })
    expect(wrapper.html()).toContain('katex')
  })

  it('资料分析模式渲染 context', () => {
    const wrapper = mount(QuestionDisplay, {
      props: {
        display: 'test',
        isData: true,
        answer: '100',
        context: '现期: 9738, 增长率: 10.2%',
      },
    })
    expect(wrapper.find('.context').text()).toContain('现期')
  })

  it('tolerance 渲染误差行', () => {
    const wrapper = mount(QuestionDisplay, {
      props: { display: 't', isData: true, answer: '1', tolerance: 0.03 },
    })
    expect(wrapper.find('.tolerance').text()).toContain('±3%')
  })

  it('无 tolerance 不渲染误差行', () => {
    const wrapper = mount(QuestionDisplay, {
      props: { display: 't', isData: true, answer: '1' },
    })
    expect(wrapper.find('.tolerance').exists()).toBe(false)
  })

  it('hint 渲染提示行', () => {
    const wrapper = mount(QuestionDisplay, {
      props: { display: 't', isData: true, answer: '1', hint: '建议写到小数点后2~3位' },
    })
    expect(wrapper.find('.hint').text()).toContain('小数点后')
  })

  it('unit 渲染单位', () => {
    const wrapper = mount(QuestionDisplay, {
      props: { display: 't', isData: true, answer: '9.1', unit: '%' },
    })
    expect(wrapper.find('.unit').text()).toBe('%')
  })

  it('standardText 渲染时间标准行', () => {
    const wrapper = mount(QuestionDisplay, {
      props: {
        display: 't',
        isData: false,
        answer: '1',
        standardText: '合格 28s  良好 22s  优秀 18s',
      },
    })
    expect(wrapper.find('.standard').text()).toContain('合格')
  })

  it('无 standardText 不渲染标准行', () => {
    const wrapper = mount(QuestionDisplay, {
      props: { display: 't', isData: false, answer: '1' },
    })
    expect(wrapper.find('.standard').exists()).toBe(false)
  })
})
