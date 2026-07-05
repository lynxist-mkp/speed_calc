import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SessionDetailDrawer from '@/components/SessionDetailDrawer.vue'
import type { SessionRow } from '@/db/index'

// mock db
vi.mock('@/db/index', () => ({
  listRecordsBySession: vi.fn(),
}))

import { listRecordsBySession } from '@/db/index'

const mockSession: SessionRow = {
  id: 1,
  type: 'basic_addsub',
  subtype: '两位数加减',
  total: 3,
  correct: 2,
  duration_ms: 90000,
  created_at: 1759500000000,
}

const mockRecords = [
  {
    id: 1,
    qIndex: 0,
    question: '12+34=',
    userAnswer: '46',
    trueAnswer: '46',
    isCorrect: 1,
    tolerance: 0,
    timeSpentMs: 12000,
  },
  {
    id: 2,
    qIndex: 1,
    question: '56+78=',
    userAnswer: '134',
    trueAnswer: '134',
    isCorrect: 1,
    tolerance: 0,
    timeSpentMs: 15000,
  },
  {
    id: 3,
    qIndex: 2,
    question: '90-12=',
    userAnswer: '79',
    trueAnswer: '78',
    isCorrect: 0,
    tolerance: 0,
    timeSpentMs: 9000,
  },
]

function queryDrawer() {
  return document.querySelector('.drawer-panel')
}

beforeEach(() => {
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('SessionDetailDrawer.vue', () => {
  it('visible=false 时不渲染', () => {
    mount(SessionDetailDrawer, {
      props: { visible: false, session: mockSession },
    })
    expect(queryDrawer()).toBeNull()
  })

  it('visible=true 时渲染抽屉', () => {
    ;(listRecordsBySession as ReturnType<typeof vi.fn>).mockResolvedValue(mockRecords)
    mount(SessionDetailDrawer, {
      props: { visible: true, session: mockSession },
    })
    expect(queryDrawer()).not.toBeNull()
  })

  it('显示 session 头部信息（题型 + 日期 + 正确率）', async () => {
    ;(listRecordsBySession as ReturnType<typeof vi.fn>).mockResolvedValue(mockRecords)
    mount(SessionDetailDrawer, {
      props: { visible: true, session: mockSession },
    })
    await new Promise((r) => setTimeout(r, 10))
    const text = document.body.textContent ?? ''
    expect(text).toContain('两位数加减')
    expect(text).toContain('2/3')
    expect(text).toContain('67%')
  })

  it('加载并显示答题记录列表', async () => {
    ;(listRecordsBySession as ReturnType<typeof vi.fn>).mockResolvedValue(mockRecords)
    mount(SessionDetailDrawer, {
      props: { visible: true, session: mockSession },
    })
    await new Promise((r) => setTimeout(r, 10))
    const text = document.body.textContent ?? ''
    expect(text).toContain('12+34=')
    expect(text).toContain('56+78=')
    expect(text).toContain('90-12=')
    expect(text).toContain('46')
    expect(text).toContain('78')
  })

  it('正确题显示 ✓ 标记', async () => {
    ;(listRecordsBySession as ReturnType<typeof vi.fn>).mockResolvedValue(mockRecords)
    mount(SessionDetailDrawer, {
      props: { visible: true, session: mockSession },
    })
    await new Promise((r) => setTimeout(r, 10))
    const okMarks = document.querySelectorAll('.rec-idx.ok')
    expect(okMarks).toHaveLength(2)
  })

  it('错误题显示 ✗ 标记 + wrong 行样式', async () => {
    ;(listRecordsBySession as ReturnType<typeof vi.fn>).mockResolvedValue(mockRecords)
    mount(SessionDetailDrawer, {
      props: { visible: true, session: mockSession },
    })
    await new Promise((r) => setTimeout(r, 10))
    const noMarks = document.querySelectorAll('.rec-idx.no')
    expect(noMarks).toHaveLength(1)
    const wrongRows = document.querySelectorAll('.record-row.wrong')
    expect(wrongRows).toHaveLength(1)
  })

  it('调用 listRecordsBySession 传入正确 sessionId', async () => {
    ;(listRecordsBySession as ReturnType<typeof vi.fn>).mockResolvedValue([])
    mount(SessionDetailDrawer, {
      props: { visible: true, session: mockSession },
    })
    await new Promise((r) => setTimeout(r, 10))
    expect(listRecordsBySession).toHaveBeenCalledWith(1)
  })

  it('records 为空时显示提示', async () => {
    ;(listRecordsBySession as ReturnType<typeof vi.fn>).mockResolvedValue([])
    mount(SessionDetailDrawer, {
      props: { visible: true, session: mockSession },
    })
    await new Promise((r) => setTimeout(r, 10))
    const text = document.body.textContent ?? ''
    expect(text).toContain('无答题记录')
  })

  it('点击关闭按钮触发 close 事件', async () => {
    ;(listRecordsBySession as ReturnType<typeof vi.fn>).mockResolvedValue(mockRecords)
    const wrapper = mount(SessionDetailDrawer, {
      props: { visible: true, session: mockSession },
    })
    const closeBtn = document.querySelector('.drawer-close') as HTMLElement
    closeBtn.click()
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('点击遮罩触发 close 事件', async () => {
    ;(listRecordsBySession as ReturnType<typeof vi.fn>).mockResolvedValue(mockRecords)
    const wrapper = mount(SessionDetailDrawer, {
      props: { visible: true, session: mockSession },
    })
    const overlay = document.querySelector('.drawer-overlay') as HTMLElement
    overlay.click()
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('正确率 ≥75% 显示绿色（good 类）', async () => {
    ;(listRecordsBySession as ReturnType<typeof vi.fn>).mockResolvedValue([])
    const goodSession = { ...mockSession, correct: 8, total: 10 }
    mount(SessionDetailDrawer, {
      props: { visible: true, session: goodSession },
    })
    await new Promise((r) => setTimeout(r, 10))
    // 第二个 stat-value 是正确率（带 % 后缀）
    const statValues = document.querySelectorAll('.stat-value')
    const accValue = Array.from(statValues).find((el) => el.textContent?.includes('%'))
    expect(accValue?.classList.contains('good')).toBe(true)
  })

  it('正确率 <75% 显示红色（low 类）', async () => {
    ;(listRecordsBySession as ReturnType<typeof vi.fn>).mockResolvedValue([])
    mount(SessionDetailDrawer, {
      props: { visible: true, session: mockSession }, // 2/3 = 67%
    })
    await new Promise((r) => setTimeout(r, 10))
    const statValues = document.querySelectorAll('.stat-value')
    const accValue = Array.from(statValues).find((el) => el.textContent?.includes('%'))
    expect(accValue?.classList.contains('low')).toBe(true)
  })

  it('模态有 aria-modal 与 aria-label', () => {
    ;(listRecordsBySession as ReturnType<typeof vi.fn>).mockResolvedValue([])
    mount(SessionDetailDrawer, {
      props: { visible: true, session: mockSession },
    })
    const panel = document.querySelector('.drawer-panel') as HTMLElement
    expect(panel.getAttribute('aria-modal')).toBe('true')
    expect(panel.getAttribute('aria-label')).toBe('答题详情')
  })
})
