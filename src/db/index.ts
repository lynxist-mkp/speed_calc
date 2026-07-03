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
