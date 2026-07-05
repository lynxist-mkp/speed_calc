// 行测小助手 - SQLite 访问封装
// 用 @tauri-apps/plugin-sql 连接 tauri-plugin-sql 注册的 sqlite:speedcalc.db
// L0：仅提供连接 + 建表确认（建表由 Rust 端 migration 自动完成）
import Database from '@tauri-apps/plugin-sql'

let dbPromise: Promise<Database> | null = null

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    // 与 src-tauri/src/lib.rs 中 add_migrations("sqlite:speedcalc.db", ...) 对应
    dbPromise = Database.load('sqlite:speedcalc.db')
  }
  return dbPromise
}

// L0 验收用：确认 5 张表都建好了
export async function verifySchema(): Promise<{ table: string }[]> {
  const db = await getDb()
  const rows = await db.select<{ name: string }[]>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('sessions','records','custom_presets','settings','time_standards') ORDER BY name`,
  )
  return rows.map((r) => ({ table: r.name }))
}

export async function countTimeStandards(): Promise<number> {
  const db = await getDb()
  const rows = await db.select<{ c: number }[]>(`SELECT COUNT(*) as c FROM time_standards`)
  return rows[0]?.c ?? 0
}

// ===== L1 扩展 =====

export interface TimeStandard {
  pass: number
  good: number
  excellent: number
}

export async function getTimeStandard(
  questionType: string,
  questionCount: number,
): Promise<TimeStandard | null> {
  const db = await getDb()
  // 1. 精确命中
  const exact = await db.select<{ pass_s: number; good_s: number; excellent_s: number }[]>(
    `SELECT pass_s, good_s, excellent_s FROM time_standards
     WHERE question_type = $1 AND question_count = $2`,
    [questionType, questionCount],
  )
  if (exact.length > 0) {
    return { pass: exact[0].pass_s, good: exact[0].good_s, excellent: exact[0].excellent_s }
  }
  // 2. 降级：同题型 count <= target 取最大
  const fallback = await db.select<
    { question_count: number; pass_s: number; good_s: number; excellent_s: number }[]
  >(
    `SELECT question_count, pass_s, good_s, excellent_s FROM time_standards
     WHERE question_type = $1 AND question_count <= $2
     ORDER BY question_count DESC LIMIT 1`,
    [questionType, questionCount],
  )
  if (fallback.length > 0) {
    return {
      pass: fallback[0].pass_s,
      good: fallback[0].good_s,
      excellent: fallback[0].excellent_s,
    }
  }
  // 3. 全无
  return null
}

export interface SessionInput {
  type: string
  subtype: string
  difficulty: string
  total: number
  nback: number
}

export async function insertSession(input: SessionInput): Promise<number> {
  const db = await getDb()
  const result = await db.execute(
    `INSERT INTO sessions (type, subtype, difficulty, total, correct, duration_ms, nback, created_at)
     VALUES ($1, $2, $3, $4, 0, 0, $5, $6)`,
    [input.type, input.subtype, input.difficulty, input.total, input.nback, Date.now()],
  )
  return result.lastInsertId as number
}

export interface RecordInput {
  sessionId: number
  qIndex: number
  question: string
  userAnswer: string
  trueAnswer: string
  isCorrect: boolean
  tolerance: number
  timeSpentMs: number
}

export async function insertRecord(input: RecordInput): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT INTO records (session_id, q_index, question, user_answer, true_answer, is_correct, tolerance, time_spent_ms, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      input.sessionId,
      input.qIndex,
      input.question,
      input.userAnswer,
      input.trueAnswer,
      input.isCorrect ? 1 : 0,
      input.tolerance,
      input.timeSpentMs,
      Date.now(),
    ],
  )
}

export async function updateSession(
  sessionId: number,
  data: { correct: number; durationMs: number },
): Promise<void> {
  const db = await getDb()
  await db.execute(`UPDATE sessions SET correct = $1, duration_ms = $2 WHERE id = $3`, [
    data.correct,
    data.durationMs,
    sessionId,
  ])
}

export interface SessionRow {
  id: number
  type: string
  subtype: string
  total: number
  correct: number
  duration_ms: number
  created_at: number
}

export async function listSessions(): Promise<SessionRow[]> {
  const db = await getDb()
  return db.select<SessionRow[]>(
    `SELECT id, type, subtype, total, correct, duration_ms, created_at
     FROM sessions ORDER BY created_at DESC`,
  )
}

// ===== L5 扩展：分页/筛选/统计聚合 =====

export async function listSessionsPaged(
  page: number,
  pageSize: number,
  typeFilter?: string,
): Promise<{ rows: SessionRow[]; total: number }> {
  const db = await getDb()
  const offset = (page - 1) * pageSize
  if (typeFilter && typeFilter !== 'all') {
    const countRows = await db.select<{ c: number }[]>(
      `SELECT COUNT(*) as c FROM sessions WHERE type = $1`,
      [typeFilter],
    )
    const total = countRows[0]?.c ?? 0
    const rows = await db.select<SessionRow[]>(
      `SELECT id, type, subtype, total, correct, duration_ms, created_at
       FROM sessions WHERE type = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [typeFilter, pageSize, offset],
    )
    return { rows, total }
  }
  const countRows = await db.select<{ c: number }[]>(`SELECT COUNT(*) as c FROM sessions`)
  const total = countRows[0]?.c ?? 0
  const rows = await db.select<SessionRow[]>(
    `SELECT id, type, subtype, total, correct, duration_ms, created_at
     FROM sessions ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [pageSize, offset],
  )
  return { rows, total }
}

export async function listSessionTypes(): Promise<string[]> {
  const db = await getDb()
  const rows = await db.select<{ type: string }[]>(
    `SELECT DISTINCT type FROM sessions ORDER BY type`,
  )
  return rows.map((r) => r.type)
}

export async function clearAllSessions(): Promise<void> {
  const db = await getDb()
  await db.execute(`DELETE FROM records`)
  await db.execute(`DELETE FROM sessions`)
}

// 按 session id 查询答题记录（用于历史详情抽屉）
export interface RecordRow {
  id: number
  qIndex: number
  question: string
  userAnswer: string
  trueAnswer: string
  isCorrect: number // 0/1
  tolerance: number
  timeSpentMs: number
}

export async function listRecordsBySession(sessionId: number): Promise<RecordRow[]> {
  const db = await getDb()
  const rows = await db.select<RecordRow[]>(
    `SELECT id, q_index as qIndex, question, user_answer as userAnswer,
            true_answer as trueAnswer, is_correct as isCorrect,
            tolerance, time_spent_ms as timeSpentMs
     FROM records WHERE session_id = $1 ORDER BY q_index ASC`,
    [sessionId],
  )
  return rows
}

// 按题型聚合正确率（用于雷达图）
export interface TypeAccuracy {
  type: string
  total: number
  correct: number
  accuracy: number
}
export async function getAccuracyByType(): Promise<TypeAccuracy[]> {
  const db = await getDb()
  const rows = await db.select<{ type: string; total: number; correct: number }[]>(
    `SELECT type,
            SUM(total) as total,
            SUM(correct) as correct
     FROM sessions GROUP BY type ORDER BY type`,
  )
  return rows.map((r) => ({
    type: r.type,
    total: r.total,
    correct: r.correct,
    accuracy: r.total > 0 ? r.correct / r.total : 0,
  }))
}

// 近期趋势（按日期聚合正确率，最近 N 天）
export interface DailyAccuracy {
  date: string
  total: number
  correct: number
  accuracy: number
}
export async function getRecentDailyAccuracy(days = 30): Promise<DailyAccuracy[]> {
  const db = await getDb()
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  const rows = await db.select<{ created_at: number; total: number; correct: number }[]>(
    `SELECT created_at, total, correct FROM sessions
     WHERE created_at >= $1 ORDER BY created_at ASC`,
    [cutoff],
  )
  // 按日期分组
  const byDate = new Map<string, { total: number; correct: number }>()
  for (const r of rows) {
    const d = new Date(r.created_at)
    const key = `${d.getMonth() + 1}/${d.getDate()}`
    const prev = byDate.get(key) ?? { total: 0, correct: 0 }
    prev.total += r.total
    prev.correct += r.correct
    byDate.set(key, prev)
  }
  return Array.from(byDate.entries()).map(([date, v]) => ({
    date,
    total: v.total,
    correct: v.correct,
    accuracy: v.total > 0 ? v.correct / v.total : 0,
  }))
}

// 按题型聚合平均用时（ms）
export interface TypeDuration {
  type: string
  avgDurationMs: number
  count: number
}
export async function getAvgDurationByType(): Promise<TypeDuration[]> {
  const db = await getDb()
  const rows = await db.select<{ type: string; avg_ms: number; cnt: number }[]>(
    `SELECT type, AVG(duration_ms) as avg_ms, COUNT(*) as cnt
     FROM sessions WHERE duration_ms > 0 GROUP BY type ORDER BY type`,
  )
  return rows.map((r) => ({
    type: r.type,
    avgDurationMs: Math.round(r.avg_ms ?? 0),
    count: r.cnt,
  }))
}

// 全局总正确率
export interface OverallStats {
  totalSessions: number
  totalQuestions: number
  totalCorrect: number
  accuracy: number
}
export async function getOverallStats(): Promise<OverallStats> {
  const db = await getDb()
  const rows = await db.select<{ cnt: number; q: number; c: number }[]>(
    `SELECT COUNT(*) as cnt, COALESCE(SUM(total), 0) as q, COALESCE(SUM(correct), 0) as c
     FROM sessions`,
  )
  const r = rows[0] ?? { cnt: 0, q: 0, c: 0 }
  return {
    totalSessions: r.cnt,
    totalQuestions: r.q,
    totalCorrect: r.c,
    accuracy: r.q > 0 ? r.c / r.q : 0,
  }
}

// ===== L4 扩展：settings KV + custom_presets =====

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb()
  const rows = await db.select<{ value: string }[]>(`SELECT value FROM settings WHERE key = $1`, [
    key,
  ])
  return rows.length > 0 ? rows[0].value : null
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb()
  await db.execute(`INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)`, [key, value])
}

export interface CustomPreset {
  id: number
  name: string
  config: string
  usedAt: number
}

export async function listCustomPresets(limit = 10): Promise<CustomPreset[]> {
  const db = await getDb()
  const rows = await db.select<{ id: number; name: string; config: string; used_at: number }[]>(
    `SELECT id, name, config, used_at FROM custom_presets ORDER BY used_at DESC LIMIT $1`,
    [limit],
  )
  return rows.map((r) => ({ id: r.id, name: r.name, config: r.config, usedAt: r.used_at }))
}

export async function upsertCustomPreset(name: string, config: string): Promise<void> {
  const db = await getDb()
  const existing = await db.select<{ id: number }[]>(
    `SELECT id FROM custom_presets WHERE config = $1`,
    [config],
  )
  if (existing.length > 0) {
    await db.execute(`UPDATE custom_presets SET name = $1, used_at = $2 WHERE id = $3`, [
      name,
      Date.now(),
      existing[0].id,
    ])
  } else {
    await db.execute(`INSERT INTO custom_presets (name, config, used_at) VALUES ($1, $2, $3)`, [
      name,
      config,
      Date.now(),
    ])
  }
}

// ===== L5 扩展：时间标准 CRUD =====

export interface TimeStandardRow {
  id: number
  questionType: string
  questionCount: number
  passS: number
  goodS: number
  excellentS: number
}

export async function listTimeStandards(): Promise<TimeStandardRow[]> {
  const db = await getDb()
  const rows = await db.select<
    {
      id: number
      question_type: string
      question_count: number
      pass_s: number
      good_s: number
      excellent_s: number
    }[]
  >(
    `SELECT id, question_type, question_count, pass_s, good_s, excellent_s
     FROM time_standards ORDER BY question_type, question_count`,
  )
  return rows.map((r) => ({
    id: r.id,
    questionType: r.question_type,
    questionCount: r.question_count,
    passS: r.pass_s,
    goodS: r.good_s,
    excellentS: r.excellent_s,
  }))
}

export async function updateTimeStandard(
  id: number,
  data: { passS: number; goodS: number; excellentS: number },
): Promise<void> {
  const db = await getDb()
  await db.execute(
    `UPDATE time_standards SET pass_s = $1, good_s = $2, excellent_s = $3 WHERE id = $4`,
    [data.passS, data.goodS, data.excellentS, id],
  )
}

export async function insertTimeStandard(data: {
  questionType: string
  questionCount: number
  passS: number
  goodS: number
  excellentS: number
}): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT INTO time_standards (question_type, question_count, pass_s, good_s, excellent_s)
     VALUES ($1, $2, $3, $4, $5)`,
    [data.questionType, data.questionCount, data.passS, data.goodS, data.excellentS],
  )
}

export async function deleteTimeStandard(id: number): Promise<void> {
  const db = await getDb()
  await db.execute(`DELETE FROM time_standards WHERE id = $1`, [id])
}
