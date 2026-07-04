import { describe, it, expect } from "vitest";
import { resolveNumpadKey, resolveCompareKey } from "@/utils/keymap";

describe("resolveNumpadKey - 数字题模式", () => {
  // 右手小键盘区映射（方案 A 核心）
  it("KeyU → 7", () => {
    const e = new KeyboardEvent("keydown", { code: "KeyU" });
    expect(resolveNumpadKey(e)).toEqual({ type: "input", payload: "7" });
  });

  it("KeyI → 8", () => {
    const e = new KeyboardEvent("keydown", { code: "KeyI" });
    expect(resolveNumpadKey(e)).toEqual({ type: "input", payload: "8" });
  });

  it("KeyO → 9", () => {
    const e = new KeyboardEvent("keydown", { code: "KeyO" });
    expect(resolveNumpadKey(e)).toEqual({ type: "input", payload: "9" });
  });

  it("KeyJ → 4", () => {
    const e = new KeyboardEvent("keydown", { code: "KeyJ" });
    expect(resolveNumpadKey(e)).toEqual({ type: "input", payload: "4" });
  });

  it("KeyK → 5", () => {
    const e = new KeyboardEvent("keydown", { code: "KeyK" });
    expect(resolveNumpadKey(e)).toEqual({ type: "input", payload: "5" });
  });

  it("KeyL → 6", () => {
    const e = new KeyboardEvent("keydown", { code: "KeyL" });
    expect(resolveNumpadKey(e)).toEqual({ type: "input", payload: "6" });
  });

  it("KeyM → 1", () => {
    const e = new KeyboardEvent("keydown", { code: "KeyM" });
    expect(resolveNumpadKey(e)).toEqual({ type: "input", payload: "1" });
  });

  it("Comma → 2", () => {
    const e = new KeyboardEvent("keydown", { code: "Comma" });
    expect(resolveNumpadKey(e)).toEqual({ type: "input", payload: "2" });
  });

  it("Period → 3", () => {
    const e = new KeyboardEvent("keydown", { code: "Period" });
    expect(resolveNumpadKey(e)).toEqual({ type: "input", payload: "3" });
  });

  it("Space → 0", () => {
    const e = new KeyboardEvent("keydown", { code: "Space" });
    expect(resolveNumpadKey(e)).toEqual({ type: "input", payload: "0" });
  });

  it("Slash → .（小数点）", () => {
    const e = new KeyboardEvent("keydown", { code: "Slash" });
    expect(resolveNumpadKey(e)).toEqual({ type: "input", payload: "." });
  });

  // 横排数字键（备用）
  it("Digit1 → 1", () => {
    const e = new KeyboardEvent("keydown", { code: "Digit1" });
    expect(resolveNumpadKey(e)).toEqual({ type: "input", payload: "1" });
  });

  it("Digit0 → 0", () => {
    const e = new KeyboardEvent("keydown", { code: "Digit0" });
    expect(resolveNumpadKey(e)).toEqual({ type: "input", payload: "0" });
  });

  it("Digit9 → 9", () => {
    const e = new KeyboardEvent("keydown", { code: "Digit9" });
    expect(resolveNumpadKey(e)).toEqual({ type: "input", payload: "9" });
  });

  // 小数点兼容（外接小键盘）
  it("NumpadDecimal → .", () => {
    const e = new KeyboardEvent("keydown", { code: "NumpadDecimal" });
    expect(resolveNumpadKey(e)).toEqual({ type: "input", payload: "." });
  });
});

describe("resolveNumpadKey - 功能键", () => {
  it("Backspace → function/backspace", () => {
    const e = new KeyboardEvent("keydown", { code: "Backspace" });
    expect(resolveNumpadKey(e)).toEqual({ type: "function", payload: "backspace" });
  });

  it("Enter → function/submit", () => {
    const e = new KeyboardEvent("keydown", { code: "Enter" });
    expect(resolveNumpadKey(e)).toEqual({ type: "function", payload: "submit" });
  });

  it("Escape → function/restart", () => {
    const e = new KeyboardEvent("keydown", { code: "Escape" });
    expect(resolveNumpadKey(e)).toEqual({ type: "function", payload: "restart" });
  });

  it("Delete → function/clear", () => {
    const e = new KeyboardEvent("keydown", { code: "Delete" });
    expect(resolveNumpadKey(e)).toEqual({ type: "function", payload: "clear" });
  });

  it("Minus → function/toggle-sign", () => {
    const e = new KeyboardEvent("keydown", { code: "Minus" });
    expect(resolveNumpadKey(e)).toEqual({ type: "function", payload: "toggle-sign" });
  });
});

describe("resolveNumpadKey - 未知键", () => {
  it("KeyA → ignore", () => {
    const e = new KeyboardEvent("keydown", { code: "KeyA" });
    expect(resolveNumpadKey(e)).toEqual({ type: "ignore" });
  });

  it("Tab → ignore", () => {
    const e = new KeyboardEvent("keydown", { code: "Tab" });
    expect(resolveNumpadKey(e)).toEqual({ type: "ignore" });
  });
});

describe("resolveCompareKey", () => {
  it("Comma → select/<", () => {
    const e = new KeyboardEvent("keydown", { code: "Comma" });
    expect(resolveCompareKey(e)).toEqual({ type: "select", payload: "<" });
  });

  it("Period → select/>", () => {
    const e = new KeyboardEvent("keydown", { code: "Period" });
    expect(resolveCompareKey(e)).toEqual({ type: "select", payload: ">" });
  });

  it("Enter → submit", () => {
    const e = new KeyboardEvent("keydown", { code: "Enter" });
    expect(resolveCompareKey(e)).toEqual({ type: "submit" });
  });

  it("Escape → restart", () => {
    const e = new KeyboardEvent("keydown", { code: "Escape" });
    expect(resolveCompareKey(e)).toEqual({ type: "restart" });
  });

  // 兼容：e.key 字符检测
  it("e.key='<' → select/<", () => {
    const e = new KeyboardEvent("keydown", { code: "", key: "<" });
    expect(resolveCompareKey(e)).toEqual({ type: "select", payload: "<" });
  });

  it("e.key='>' → select/>", () => {
    const e = new KeyboardEvent("keydown", { code: "", key: ">" });
    expect(resolveCompareKey(e)).toEqual({ type: "select", payload: ">" });
  });

  it("e.key='《' → select/<", () => {
    const e = new KeyboardEvent("keydown", { code: "", key: "《" });
    expect(resolveCompareKey(e)).toEqual({ type: "select", payload: "<" });
  });

  it("e.key='》' → select/>", () => {
    const e = new KeyboardEvent("keydown", { code: "", key: "》" });
    expect(resolveCompareKey(e)).toEqual({ type: "select", payload: ">" });
  });

  it("KeyA → ignore", () => {
    const e = new KeyboardEvent("keydown", { code: "KeyA" });
    expect(resolveCompareKey(e)).toEqual({ type: "ignore" });
  });
});

describe("Norman 布局兼容性", () => {
  // Norman 布局下，物理键位置不变（e.code 不变），但产生的字符（e.key）不同。
  // 映射应只看 e.code，不看 e.key。
  it("物理 KeyJ 位置（Norman 产生 'n' 字符）→ 4", () => {
    const e = new KeyboardEvent("keydown", { code: "KeyJ", key: "n" });
    expect(resolveNumpadKey(e)).toEqual({ type: "input", payload: "4" });
  });

  it("物理 KeyK 位置（Norman 产生 'e' 字符）→ 5", () => {
    const e = new KeyboardEvent("keydown", { code: "KeyK", key: "e" });
    expect(resolveNumpadKey(e)).toEqual({ type: "input", payload: "5" });
  });

  it("物理 KeyL 位置（Norman 产生 'i' 字符）→ 6", () => {
    const e = new KeyboardEvent("keydown", { code: "KeyL", key: "i" });
    expect(resolveNumpadKey(e)).toEqual({ type: "input", payload: "6" });
  });

  it("物理 Comma 位置（Norman 产生 'w' 字符）→ 2", () => {
    const e = new KeyboardEvent("keydown", { code: "Comma", key: "w" });
    expect(resolveNumpadKey(e)).toEqual({ type: "input", payload: "2" });
  });

  it("物理 Period 位置（Norman 产生 'v' 字符）→ 3", () => {
    const e = new KeyboardEvent("keydown", { code: "Period", key: "v" });
    expect(resolveNumpadKey(e)).toEqual({ type: "input", payload: "3" });
  });

  it("物理 Slash 位置（Norman 产生 'z' 字符）→ .", () => {
    const e = new KeyboardEvent("keydown", { code: "Slash", key: "z" });
    expect(resolveNumpadKey(e)).toEqual({ type: "input", payload: "." });
  });

  // compare 题同样只看 e.code
  it("compare 题物理 Comma 位置（Norman 产生 'w'）→ select/<", () => {
    const e = new KeyboardEvent("keydown", { code: "Comma", key: "w" });
    expect(resolveCompareKey(e)).toEqual({ type: "select", payload: "<" });
  });
});
