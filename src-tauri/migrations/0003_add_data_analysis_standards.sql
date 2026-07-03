-- L2 资料分析 9 类题型时间标准种子
-- 来源：references/levels.md 时间标准表 + 截图量级推断
INSERT OR IGNORE INTO time_standards
  (question_type, question_count, pass_s, good_s, excellent_s)
VALUES
  ('estimate_prev',       10, 35, 26, 20),
  ('estimate_growth',     10, 35, 26, 20),
  ('baihua_frac',         10, 30, 22, 16),
  ('baihua_frac_rev',     10, 30, 22, 16),
  ('frac_calc_lt',        10, 40, 30, 22),
  ('frac_calc_gt',        10, 40, 30, 22),
  ('annual_growth_rate',  5,  60, 45, 35),
  ('base_period_ratio',   10, 50, 38, 28),
  ('annual_avg',          5,  40, 30, 22);
