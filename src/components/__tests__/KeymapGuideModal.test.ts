import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import KeymapGuideModal from "@/components/KeymapGuideModal.vue";

// Teleport 到 body，需通过 document.body 查询
function queryModal() {
  return document.querySelector(".kgm-modal");
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("KeymapGuideModal.vue", () => {
  it("visible=false 时不渲染", () => {
    mount(KeymapGuideModal, { props: { visible: false } });
    expect(queryModal()).toBeNull();
  });

  it("visible=true 时渲染模态", () => {
    mount(KeymapGuideModal, { props: { visible: true } });
    expect(queryModal()).not.toBeNull();
  });

  it("QWERTY 布局显示 I/K 物理键", () => {
    mount(KeymapGuideModal, { props: { visible: true, layout: "qwerty" } });
    const text = document.body.textContent ?? "";
    expect(text).toContain("7");
    // QWERTY: 8 对应 I，5 对应 K
    expect(text).toMatch(/8.*I/);
    expect(text).toMatch(/5.*K/);
  });

  it("Norman 布局也统一显示 QWERTY 物理键标签（按物理键盘位置）", () => {
    mount(KeymapGuideModal, { props: { visible: true, layout: "norman" } });
    const text = document.body.textContent ?? "";
    // 物理键盘统一显示 QWERTY 标签：8 对应 I，5 对应 K
    expect(text).toMatch(/8.*I/);
    expect(text).toMatch(/5.*K/);
    // 不应出现 Norman 字符 R/N
    expect(text).not.toMatch(/8.*R/);
    expect(text).not.toMatch(/5.*N/);
  });

  it("QWERTY 模式显示 Norman 提示条", () => {
    mount(KeymapGuideModal, { props: { visible: true, layout: "qwerty" } });
    const hint = document.querySelector(".kgm-norman-hint");
    expect(hint).not.toBeNull();
    expect(hint?.textContent).toContain("Norman");
  });

  it("Norman 模式不显示 Norman 提示条", () => {
    mount(KeymapGuideModal, { props: { visible: true, layout: "norman" } });
    expect(document.querySelector(".kgm-norman-hint")).toBeNull();
  });

  it("点击『我知道了』触发 close 事件", async () => {
    const wrapper = mount(KeymapGuideModal, { props: { visible: true } });
    const okBtn = document.querySelector(".kgm-ok-btn") as HTMLElement;
    okBtn.click();
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("点击 × 按钮触发 close 事件", async () => {
    const wrapper = mount(KeymapGuideModal, { props: { visible: true } });
    const closeBtn = document.querySelector(".kgm-close") as HTMLElement;
    closeBtn.click();
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("点击遮罩触发 close 事件", async () => {
    const wrapper = mount(KeymapGuideModal, { props: { visible: true } });
    const overlay = document.querySelector(".kgm-overlay") as HTMLElement;
    overlay.click();
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("点击 Norman 提示条触发 go-settings 事件", async () => {
    const wrapper = mount(KeymapGuideModal, { props: { visible: true, layout: "qwerty" } });
    const hint = document.querySelector(".kgm-norman-hint") as HTMLElement;
    hint.click();
    expect(wrapper.emitted("go-settings")).toBeTruthy();
  });

  it("展示功能键区域（退格/提交/重开/清空/切换正负号）", () => {
    mount(KeymapGuideModal, { props: { visible: true } });
    const text = document.body.textContent ?? "";
    expect(text).toContain("退格");
    expect(text).toContain("提交");
    expect(text).toContain("重开");
    expect(text).toContain("清空");
    expect(text).toContain("切换正负号");
  });

  it("展示比较题映射（, → ＜，. → ＞）", () => {
    mount(KeymapGuideModal, { props: { visible: true } });
    const text = document.body.textContent ?? "";
    expect(text).toContain("＜");
    expect(text).toContain("＞");
  });

  it("键盘图包含 0/./Enter 底行", () => {
    mount(KeymapGuideModal, { props: { visible: true } });
    const text = document.body.textContent ?? "";
    expect(text).toContain("Space");
    expect(text).toContain("Enter");
  });

  it("模态有 aria-modal 与 aria-label", () => {
    mount(KeymapGuideModal, { props: { visible: true } });
    const modal = document.querySelector(".kgm-modal") as HTMLElement;
    expect(modal.getAttribute("aria-modal")).toBe("true");
    expect(modal.getAttribute("aria-label")).toBe("键盘输入指引");
  });
});
