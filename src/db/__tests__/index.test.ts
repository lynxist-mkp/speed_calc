import { describe, it, expect, beforeEach, vi } from 'vitest'

// mock @tauri-apps/plugin-sql 的 Database.load
const mockSelect = vi.fn()
const mockExecute = vi.fn()
vi.mock('@tauri-apps/plugin-sql', () => ({
  default: {
    load: vi.fn(() =>
      Promise.resolve({ select: mockSelect, execute: mockExecute, close: vi.fn() }),
    ),
  },
}))

import {
  getTimeStandard,
  insertSession,
  insertRecord,
  updateSession,
  listSessions,
  getSetting,
  setSetting,
  listCustomPresets,
  upsertCustomPreset,
} from '@/db/index'

describe('db/index.ts', () => {
  beforeEach(() => {
    mockSelect.mockReset()
    mockExecute.mockReset()
  })

  describe('getTimeStandard', () => {
    it('命中题型+题量返回标准', async () => {
      mockSelect.mockResolvedValueOnce([{ pass_s: 28, good_s: 22, excellent_s: 18 }])
      const r = await getTimeStandard('basic_addsub', 10)
      expect(r).toEqual({ pass: 28, good: 22, excellent: 18 })
    })

    it('未命中题量时降级返回同题型最接近且<=的档', async () => {
      // 第一次精确查询 count=12 无结果
      mockSelect.mockResolvedValueOnce([])
      // 第二次降级查询：SQL 已过滤 question_count <= 12，DESC 排序取最大，仅 count=10 满足
      mockSelect.mockResolvedValueOnce([
        { question_count: 10, pass_s: 28, good_s: 22, excellent_s: 18 },
      ])
      const r = await getTimeStandard('basic_addsub', 12)
      // 10 是满足 count<=12 的最大档，取 10 档
      expect(r).toEqual({ pass: 28, good: 22, excellent: 18 })
    })

    it('题型完全不存在返回 null', async () => {
      mockSelect.mockResolvedValueOnce([])
      mockSelect.mockResolvedValueOnce([])
      const r = await getTimeStandard('unknown_type', 10)
      expect(r).toBeNull()
    })
  })

  describe('insertSession', () => {
    it('插入会话返回 id', async () => {
      mockExecute.mockResolvedValueOnce({ lastInsertId: 42 })
      const id = await insertSession({
        type: 'basic_addsub',
        subtype: '两位数加减',
        difficulty: 'normal',
        total: 10,
        nback: 0,
      })
      expect(id).toBe(42)
      expect(mockExecute).toHaveBeenCalledOnce()
    })
  })

  describe('insertRecord', () => {
    it('插入答题记录', async () => {
      mockExecute.mockResolvedValueOnce({ lastInsertId: 1 })
      await insertRecord({
        sessionId: 42,
        qIndex: 0,
        question: '61+84=',
        userAnswer: '145',
        trueAnswer: '145',
        isCorrect: true,
        tolerance: 0,
        timeSpentMs: 3000,
      })
      expect(mockExecute).toHaveBeenCalledOnce()
    })
  })

  describe('updateSession', () => {
    it('更新会话正确数与总时长', async () => {
      await updateSession(42, { correct: 8, durationMs: 120000 })
      expect(mockExecute).toHaveBeenCalledOnce()
    })
  })

  describe('listSessions', () => {
    it('按 created_at DESC 返回会话列表', async () => {
      mockSelect.mockResolvedValueOnce([
        {
          id: 2,
          type: 'basic_addsub',
          total: 10,
          correct: 9,
          duration_ms: 60000,
          created_at: 1700000002,
        },
        {
          id: 1,
          type: 'basic_addsub',
          total: 10,
          correct: 7,
          duration_ms: 90000,
          created_at: 1700000001,
        },
      ])
      const list = await listSessions()
      expect(list).toHaveLength(2)
      expect(list[0].id).toBe(2)
    })
  })
})

describe('settings KV CRUD', () => {
  beforeEach(() => {
    mockSelect.mockReset()
    mockExecute.mockReset()
  })

  it('getSetting 命中返回 value', async () => {
    mockSelect.mockResolvedValueOnce([{ value: 'v1' }])
    const v = await getSetting('test.key1')
    expect(v).toBe('v1')
    expect(mockSelect).toHaveBeenCalledOnce()
  })

  it('getSetting 未命中返回 null', async () => {
    mockSelect.mockResolvedValueOnce([])
    const v = await getSetting('not.exist.key')
    expect(v).toBeNull()
  })

  it('setSetting 调用 execute INSERT OR REPLACE', async () => {
    await setSetting('test.key2', 'v2')
    expect(mockExecute).toHaveBeenCalledOnce()
    // 验证 SQL 包含 INSERT OR REPLACE INTO settings
    const sql = mockExecute.mock.calls[0][0]
    expect(sql).toContain('INSERT OR REPLACE INTO settings')
    expect(sql).toContain('settings')
  })
})

describe('custom_presets CRUD', () => {
  beforeEach(() => {
    mockSelect.mockReset()
    mockExecute.mockReset()
  })

  it('listCustomPresets 映射行到 CustomPreset 并按 used_at DESC', async () => {
    mockSelect.mockResolvedValueOnce([
      { id: 2, name: 'p2', config: '{"x":2}', used_at: 200 },
      { id: 1, name: 'p1', config: '{"x":1}', used_at: 100 },
    ])
    const list = await listCustomPresets()
    expect(list).toHaveLength(2)
    expect(list[0]).toEqual({ id: 2, name: 'p2', config: '{"x":2}', usedAt: 200 })
    expect(list[1]).toEqual({ id: 1, name: 'p1', config: '{"x":1}', usedAt: 100 })
  })

  it('upsertCustomPreset config 不存在时 INSERT', async () => {
    // existing 查询返回空数组
    mockSelect.mockResolvedValueOnce([])
    await upsertCustomPreset('new-preset', '{"a":1}')
    expect(mockExecute).toHaveBeenCalledOnce()
    const sql = mockExecute.mock.calls[0][0]
    expect(sql).toContain('INSERT INTO custom_presets')
  })

  it('upsertCustomPreset config 已存在时 UPDATE', async () => {
    // existing 查询返回已有 id
    mockSelect.mockResolvedValueOnce([{ id: 42 }])
    await upsertCustomPreset('dup-preset', '{"a":1}')
    expect(mockExecute).toHaveBeenCalledOnce()
    const sql = mockExecute.mock.calls[0][0]
    expect(sql).toContain('UPDATE custom_presets')
  })
})
