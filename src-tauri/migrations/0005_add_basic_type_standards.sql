-- L4: 16 个基础计算题型的时间标准种子（addsub_2d 复用 L1 的 basic_addsub，不重复插入）
-- 参考值来源：references/levels.md 时间标准 + 加减类同档、乘除类高一档、多位除更高一档
INSERT OR IGNORE INTO time_standards (question_type, question_count, pass_s, good_s, excellent_s) VALUES
  ('round_100', 10, 28, 22, 18),
  ('add_3d', 10, 35, 28, 22),
  ('sub_3d', 10, 35, 28, 22),
  ('addsub_3d', 10, 40, 32, 25),
  ('add_multi', 10, 45, 35, 28),
  ('addsub_mix', 10, 50, 40, 32),
  ('mul_2x1', 10, 35, 28, 22),
  ('mul_3x1', 10, 45, 35, 28),
  ('mul_2x11', 10, 30, 24, 18),
  ('mul_2x15', 10, 35, 28, 22),
  ('mul_2x2', 10, 50, 40, 32),
  ('div_3x1', 10, 40, 32, 25),
  ('div_3x2', 10, 50, 40, 32),
  ('mul_est', 10, 45, 35, 28),
  ('div_5x3', 10, 60, 50, 40),
  ('div_3x4', 10, 50, 40, 32);
