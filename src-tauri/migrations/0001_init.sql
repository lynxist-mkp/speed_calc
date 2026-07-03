-- 行测小助手 - 初始 schema
-- 来源：references/data-model.md
-- 范围：L0-L5（L6 真题扩展表 papers/questions/materials 暂不建）

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY,
  type TEXT,
  subtype TEXT,
  difficulty TEXT,
  total INTEGER,
  correct INTEGER DEFAULT 0,
  duration_ms INTEGER,
  nback INTEGER DEFAULT 0,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS records (
  id INTEGER PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  q_index INTEGER,
  question TEXT,
  user_answer TEXT,
  true_answer TEXT,
  is_correct INTEGER,
  tolerance REAL,
  time_spent_ms INTEGER,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS custom_presets (
  id INTEGER PRIMARY KEY,
  name TEXT,
  config TEXT,
  used_at INTEGER
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS time_standards (
  id INTEGER PRIMARY KEY,
  question_type TEXT NOT NULL,
  question_count INTEGER NOT NULL,
  pass_s INTEGER,
  good_s INTEGER,
  excellent_s INTEGER,
  UNIQUE(question_type, question_count)
);

-- 截图实证的种子值（references/levels.md 时间标准表）
INSERT OR IGNORE INTO time_standards (question_type, question_count, pass_s, good_s, excellent_s) VALUES
  ('basic_addsub', 10, 28, 22, 18),
  ('basic_addsub', 30, 90, 70, 55),
  ('frac_calc',    10, 40, 30, 22),
  ('estimate_prev', 10, 35, 26, 20),
  ('baihua_frac',  10, 30, 22, 16);
