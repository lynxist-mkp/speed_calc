// 物理键盘布局类型
// - "qwerty"：标准 QWERTY 布局，e.code 直接反映物理键位置
// - "norman"：通过 Karabiner-Elements 启用的 Norman 布局，e.code 被 Karabiner 改变为 Norman 字符对应的 code
export type KeyboardLayout = "qwerty" | "norman";

// 数字字面量联合类型
type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

// QWERTY 布局：右手小键盘区物理键 → 数字（e.code 反映物理位置）
const NUMPAD_KEYMAP_QWERTY: Record<string, Digit | "."> = {
  // 右手小键盘区（方案 A 核心）
  KeyU: "7", KeyI: "8", KeyO: "9",
  KeyJ: "4", KeyK: "5", KeyL: "6",
  KeyM: "1", Comma: "2", Period: "3",
  Space: "0", Slash: ".",
  // 横排数字键（备用）
  Digit1: "1", Digit2: "2", Digit3: "3", Digit4: "4", Digit5: "5",
  Digit6: "6", Digit7: "7", Digit8: "8", Digit9: "9", Digit0: "0",
  // 小数点兼容（外接小键盘）
  NumpadDecimal: ".",
};

// Norman 布局（通过 Karabiner 启用）：Karabiner 改变 e.code，使其反映 Norman 字符在 QWERTY 中的位置
// 物理 QWERTY u/i/o 位置 → Norman u/r/l → e.code=KeyU/KeyR/KeyL
// 物理 QWERTY j/k/l 位置 → Norman n/i/o → e.code=KeyN/KeyI/KeyO
// 物理 QWERTY m/,/. 位置 → Norman m/,/. → e.code 不变（Norman 第 3 排与 QWERTY 相同）
const NUMPAD_KEYMAP_NORMAN: Record<string, Digit | "."> = {
  // 右手小键盘区（方案 A 核心，按物理 QWERTY 位置）
  KeyU: "7", KeyR: "8", KeyL: "9",
  KeyN: "4", KeyI: "5", KeyO: "6",
  KeyM: "1", Comma: "2", Period: "3",
  Space: "0", Slash: ".",
  // 横排数字键（备用，数字键在 Norman 中位置不变）
  Digit1: "1", Digit2: "2", Digit3: "3", Digit4: "4", Digit5: "5",
  Digit6: "6", Digit7: "7", Digit8: "8", Digit9: "9", Digit0: "0",
  // 小数点兼容（外接小键盘）
  NumpadDecimal: ".",
};

// compare 题物理键映射（QWERTY 和 Norman 通用，因为 , . / 在两种布局中位置相同）
const COMPARE_KEYMAP: Record<string, ">" | "<"> = {
  Comma: "<",
  Period: ">",
};

// 功能键 → 功能名
const FUNCTION_KEYS: Record<string, "backspace" | "submit" | "restart" | "clear" | "toggle-sign"> = {
  Backspace: "backspace",
  Enter: "submit",
  Escape: "restart",
  Delete: "clear",
  Minus: "toggle-sign",
};

export type NumpadResolveResult =
  | { type: "input"; payload: Digit | "." }
  | { type: "function"; payload: "backspace" | "submit" | "restart" | "clear" | "toggle-sign" }
  | { type: "ignore" };

export type CompareResolveResult =
  | { type: "select"; payload: ">" | "<" }
  | { type: "submit" }
  | { type: "restart" }
  | { type: "ignore" };

function getNumpadKeymap(layout: KeyboardLayout): Record<string, Digit | "."> {
  return layout === "norman" ? NUMPAD_KEYMAP_NORMAN : NUMPAD_KEYMAP_QWERTY;
}

/**
 * 数字题模式按键解析。
 * - type="input"：payload 为待输入字符（数字或小数点），调用 store.inputChar(payload)
 * - type="function"：payload 为功能名（backspace/submit/restart/clear/toggle-sign）
 * - type="ignore"：未识别的键，调用方应跳过
 *
 * @param e 键盘事件
 * @param layout 物理键盘布局（"qwerty" 或 "norman"），影响 e.code 到数字的映射
 */
export function resolveNumpadKey(e: KeyboardEvent, layout: KeyboardLayout = "qwerty"): NumpadResolveResult {
  const code = e.code;
  const keymap = getNumpadKeymap(layout);
  if (keymap[code]) {
    return { type: "input", payload: keymap[code] };
  }
  if (FUNCTION_KEYS[code]) {
    return { type: "function", payload: FUNCTION_KEYS[code] };
  }
  return { type: "ignore" };
}

/**
 * compare 题模式按键解析。
 * - type="select"：payload 为 ">" 或 "<"，调用 store.selectCompare(payload)
 * - type="submit"：调用 store.submit()
 * - type="restart"：调用 store.restart()
 * - type="ignore"：未识别的键
 *
 * 注：compare 题不需要 layout 参数，因为 , . / 在 QWERTY 和 Norman 中位置相同。
 * 同时保留 e.key 字符检测（< > 《 》）作为兼容，因为这些字符键的物理位置随布局变化。
 */
export function resolveCompareKey(e: KeyboardEvent): CompareResolveResult {
  const code = e.code;
  if (COMPARE_KEYMAP[code]) {
    return { type: "select", payload: COMPARE_KEYMAP[code] };
  }
  // 兼容：e.key 字符检测（用户主动按 < > 《 》 字符键）
  const k = e.key;
  if (k === "<" || k === ">" || k === "《" || k === "》") {
    return { type: "select", payload: k === "<" || k === "《" ? "<" : ">" };
  }
  if (code === "Enter") return { type: "submit" };
  if (code === "Escape") return { type: "restart" };
  return { type: "ignore" };
}
