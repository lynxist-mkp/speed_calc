-- L3 比较题 + 一表通算时间标准种子
INSERT OR IGNORE INTO time_standards
  (question_type, question_count, pass_s, good_s, excellent_s)
VALUES
  ('compare_growth', 10, 30, 22, 16),
  ('compare_base',   10, 30, 22, 16),
  ('compare_frac',   10, 30, 22, 16),
  ('composite',       1, 120, 90, 70);
