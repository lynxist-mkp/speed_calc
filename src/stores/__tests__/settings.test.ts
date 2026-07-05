import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/db/index', () => ({
  getSetting: vi.fn().mockResolvedValue(null),
  setSetting: vi.fn().mockResolvedValue(undefined),
}))

import { useSettingsStore } from '@/stores/settings'
import { getSetting, setSetting } from '@/db/index'

describe('useSettingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    ;(getSetting as ReturnType<typeof vi.fn>).mockResolvedValue(null)
  })

  it('初始默认值', () => {
    const store = useSettingsStore()
    expect(store.basic.keyboardLayout).toBe('normal')
    expect(store.basic.selectedType).toBe(0)
    expect(store.basic.countMode).toBe('quick')
    expect(store.basic.count).toBe(10)
    expect(store.basic.nback).toBe(0)
    expect(store.dataAnalysis.difficulty).toBe('normal')
    expect(store.dataAnalysis.displayMode).toBe('chart')
    expect(store.dataAnalysis.nback).toBe(0)
  })

  it('load 从 db 读取覆盖默认值', async () => {
    ;(getSetting as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
      const map: Record<string, string> = {
        'basic.keyboardLayout': JSON.stringify('reverse'),
        'basic.count': JSON.stringify(20),
        'basic.nback': JSON.stringify(2),
        'da.difficulty': JSON.stringify('hard'),
      }
      return Promise.resolve(map[key] ?? null)
    })
    const store = useSettingsStore()
    await store.load()
    expect(store.basic.keyboardLayout).toBe('reverse')
    expect(store.basic.count).toBe(20)
    expect(store.basic.nback).toBe(2)
    expect(store.dataAnalysis.difficulty).toBe('hard')
  })

  it('saveBasic 写入 db 并更新本地', async () => {
    const store = useSettingsStore()
    await store.saveBasic({ count: 25 })
    expect(store.basic.count).toBe(25)
    expect(setSetting).toHaveBeenCalledWith('basic.count', '25')
  })

  it('saveDataAnalysis 写入 db 并更新本地', async () => {
    const store = useSettingsStore()
    await store.saveDataAnalysis({ difficulty: 'easy' })
    expect(store.dataAnalysis.difficulty).toBe('easy')
    expect(setSetting).toHaveBeenCalledWith('da.difficulty', JSON.stringify('easy'))
  })

  it('load 未设置的 key 保持默认值', async () => {
    ;(getSetting as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const store = useSettingsStore()
    await store.load()
    expect(store.basic.keyboardLayout).toBe('normal')
    expect(store.dataAnalysis.displayMode).toBe('chart')
  })
})
