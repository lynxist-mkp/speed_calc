# 数据模型

> 何时读：涉及 DB 或类型时。schema 是确定性约束，按此建表。

## SQLite Schema

```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY,
  type TEXT, subtype TEXT, difficulty TEXT,
  total INTEGER, correct INTEGER DEFAULT 0,
  duration_ms INTEGER, nback INTEGER DEFAULT 0,
  created_at INTEGER
);
CREATE TABLE records (
  id INTEGER PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  q_index INTEGER, question TEXT, user_answer TEXT, true_answer TEXT,
  is_correct INTEGER, tolerance REAL, time_spent_ms INTEGER,
  created_at INTEGER
);
CREATE TABLE custom_presets (
  id INTEGER PRIMARY KEY, name TEXT, config TEXT, used_at INTEGER
);
CREATE TABLE settings ( key TEXT PRIMARY KEY, value TEXT );
CREATE TABLE time_standards (
  id INTEGER PRIMARY KEY,
  question_type TEXT NOT NULL,
  question_count INTEGER NOT NULL,
  pass_s INTEGER, good_s INTEGER, excellent_s INTEGER,
  UNIQUE(question_type, question_count)
);

-- L6 真题扩展(暂不实现)
CREATE TABLE papers ( id INTEGER PRIMARY KEY, source_id TEXT UNIQUE, title TEXT, region TEXT, year INTEGER, level TEXT, fetched_at INTEGER, questions_count INTEGER, status TEXT );
CREATE TABLE questions ( id INTEGER PRIMARY KEY, paper_id INTEGER NOT NULL REFERENCES papers(id), qno INTEGER, module TEXT, subtype TEXT, stem TEXT, stem_html TEXT, options TEXT, answer TEXT, explanation TEXT, material_id INTEGER, images TEXT, UNIQUE(paper_id, qno) );
CREATE TABLE materials ( id INTEGER PRIMARY KEY, paper_id INTEGER REFERENCES papers(id), group_label TEXT, content TEXT, content_html TEXT, images TEXT );
```

## TS 类型（前端用，方向性，实现时完善）

```typescript
interface Question {
  id: number; qno: number; module: ModuleType; subtype?: string;
  stem: string; options: Option[]; answer?: string; explanation?: string;
  images?: string[];
}
interface Option { label: string; text: string; image?: string; }
enum ModuleType { POLITICAL, COMMON, VERBAL, QUANTITATIVE, JUDGMENT, DATA }
```

> L6 真题题目的完整字段见 references/gkzenti-dom.md。
