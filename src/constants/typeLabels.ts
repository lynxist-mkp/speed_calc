// 题型中文名映射表（统一所有展示位置）
// key = 数据库 type 字段，value = 中文显示名

export const TYPE_LABELS: Record<string, string> = {
  // 基础运算
  basic_addsub: '基础加减',
  addsub_2d: '两位数加减',
  round_100: '凑整百练习',
  add_3d: '三位数加法',
  sub_3d: '三位数减法',
  addsub_3d: '三位数加减',
  add_multi: '多数相加',
  addsub_mix: '混合加减',
  mul_2x1: '两位数乘一位数',
  mul_3x1: '三位数乘一位数',
  mul_2x11: '两位数乘11',
  mul_2x15: '两位数乘15',
  mul_2x2: '两位数乘两位数',
  div_3x1: '三位数除一位数',
  div_3x2: '三位数除两位数',
  mul_est: '乘法估算',
  div_5x3: '五位数除三位数',
  div_3x4: '三位数除四位数',
  // 资料分析填空题
  estimate_prev: '估算前期量',
  estimate_growth: '估算增长量',
  baihua_frac: '百化分',
  baihua_frac_rev: '百化分反向',
  frac_calc_lt: '分数计算(＜)',
  frac_calc_gt: '分数计算(＞)',
  annual_growth_rate: '年均增长率',
  base_period_ratio: '基期比重',
  annual_avg: '年平均量',
  // 资料分析比较题
  compare_growth: '增量比大小',
  compare_base: '基期比大小',
  compare_frac: '分数比大小',
  // 资料分析综合
  composite: '一表通算',
  // 自定义
  custom_standard: '自定义运算',
  custom_power: '幂运算',
}

/**
 * 获取题型中文名
 * 优先使用映射表；未知类型回退到原值（避免显示 undefined）
 */
export function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type
}
