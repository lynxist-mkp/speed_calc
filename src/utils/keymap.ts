// 物理键 → 数字题输入字符（数字或小数点）
export const NUMPAD_KEYMAP: Record<string, "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "."> = {
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

// compare 题物理键映射
export const COMPARE_KEYMAP: Record<string, ">" | "<"> = {
  Comma: "<",
  Period: ">",
};

// 功能键 → 功能名
export const FUNCTION_KEYS: Record<string, "backspace" | "submit" | "restart" | "clear" | "toggle-sign"> = {
  Backspace: "backspace",
  Enter: "submit",
  Escape: "restart",
  Delete: "clear",
  Minus: "toggle-sign",
};

export type NumpadResolveResult =
  | { type: "input"; payload: "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." }
  | { type: "function"; payload: "backspace" | "submit" | "restart" | "clear" | "toggle-sign" }
  | { type: "ignore" };

export type CompareResolveResult =
  | { type: "select"; payload: ">" | "<" }
  | { type: "submit" }
  | { type: "restart" }
  | { type: "ignore" };

/**
 * 数字题模式按键解析。
 * - type="input"：payload 为待输入字符（数字或小数点），调用 store.inputChar(payload)
 * - type="function"：payload 为功能名（backspace/submit/restart/clear/toggle-sign）
 * - type="ignore"：未识别的键，调用方应跳过
 */
export function resolveNumpadKey(e: KeyboardEvent): NumpadResolveResult {
  const code = e.code;
  if (NUMPAD_KEYMAP[code]) {
    return { type: "input", payload: NUMPAD_KEYMAP[code] };
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
 * 注：同时保留 e.key 字符检测（< > 《 》）作为兼容，因为这些字符键的物理位置随布局变化。
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
