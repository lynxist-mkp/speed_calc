// 行测小助手 - SQLite 访问封装
// 用 @tauri-apps/plugin-sql 连接 tauri-plugin-sql 注册的 sqlite:speedcalc.db
// L0：仅提供连接 + 建表确认（建表由 Rust 端 migration 自动完成）
import Database from "@tauri-apps/plugin-sql";

let dbPromise: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    // 与 src-tauri/src/lib.rs 中 add_migrations("sqlite:speedcalc.db", ...) 对应
    dbPromise = Database.load("sqlite:speedcalc.db");
  }
  return dbPromise;
}

// L0 验收用：确认 5 张表都建好了
export async function verifySchema(): Promise<{ table: string }[]> {
  const db = await getDb();
  const rows = await db.select<{ name: string }[]>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('sessions','records','custom_presets','settings','time_standards') ORDER BY name`
  );
  return rows.map((r) => ({ table: r.name }));
}

export async function countTimeStandards(): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ c: number }[]>(`SELECT COUNT(*) as c FROM time_standards`);
  return rows[0]?.c ?? 0;
}

// ===== L1 扩展 =====

export interface TimeStandard {
  pass: number;
  good: number;
  excellent: number;
}

export async function getTimeStandard(
  questionType: string,
  questionCount: number
): Promise<TimeStandard | null> {
  const db = await getDb();
  // 1. 精确命中
  const exact = await db.select<{ pass_s: number; good_s: number; excellent_s: number }[]>(
    `SELECT pass_s, good_s, excellent_s FROM time_standards
     WHERE question_type = $1 AND question_count = $2`,
    [questionType, questionCount]
  );
  if (exact.length > 0) {
    return { pass: exact[0].pass_s, good: exact[0].good_s, excellent: exact[0].excellent_s };
  }
  // 2. 降级：同题型 count <= target 取最大
  const fallback = await db.select<{ question_count: number; pass_s: number; good_s: number; excellent_s: number }[]>(
    `SELECT question_count, pass_s, good_s, excellent_s FROM time_standards
     WHERE question_type = $1 AND question_count <= $2
     ORDER BY question_count DESC LIMIT 1`,
    [questionType, questionCount]
  );
  if (fallback.length > 0) {
    return { pass: fallback[0].pass_s, good: fallback[0].good_s, excellent: fallback[0].excellent_s };
  }
  // 3. 全无
  return null;
}

export interface SessionInput {
  type: string;
  subtype: string;
  difficulty: string;
  total: number;
  nback: number;
}

export async function insertSession(input: SessionInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO sessions (type, subtype, difficulty, total, correct, duration_ms, nback, created_at)
     VALUES ($1, $2, $3, $4, 0, 0, $5, $6)`,
    [input.type, input.subtype, input.difficulty, input.total, input.nback, Date.now()]
  );
  return result.lastInsertId;
}

export interface RecordInput {
  sessionId: number;
  qIndex: number;
  question: string;
  userAnswer: string;
  trueAnswer: string;
  isCorrect: boolean;
  tolerance: number;
  timeSpentMs: number;
}

export async function insertRecord(input: RecordInput): Promise<void> {
  const db = await getDb();
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
    ]
  );
}

export async function updateSession(
  sessionId: number,
  data: { correct: number; durationMs: number }
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE sessions SET correct = $1, duration_ms = $2 WHERE id = $3`,
    [data.correct, data.durationMs, sessionId]
  );
}

export interface SessionRow {
  id: number;
  type: string;
  subtype: string;
  total: number;
  correct: number;
  duration_ms: number;
  created_at: number;
}

export async function listSessions(): Promise<SessionRow[]> {
  const db = await getDb();
  return db.select<SessionRow[]>(
    `SELECT id, type, subtype, total, correct, duration_ms, created_at
     FROM sessions ORDER BY created_at DESC`
  );
}
