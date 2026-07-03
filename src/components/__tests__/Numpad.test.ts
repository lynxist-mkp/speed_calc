import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Numpad from "@/components/Numpad.vue";

describe("Numpad.vue", () => {
  it("basic variant 渲染 ± 键", () => {
    const wrapper = mount(Numpad, { props: { variant: "basic", layout: "normal" } });
    expect(wrapper.text()).toContain("±");
  });

  it("点击数字按钮触发 input 事件", async () => {
    const wrapper = mount(Numpad, { props: { variant: "basic", layout: "normal" } });
    await wrapper.find('[data-key="1"]').trigger("click");
    expect(wrapper.emitted("input")).toBeTruthy();
    expect(wrapper.emitted("input")![0]).toEqual(["1"]);
  });

  it("点击小数点触发 input", async () => {
    const wrapper = mount(Numpad, { props: { variant: "basic", layout: "normal" } });
    await wrapper.find('[data-key="."]').trigger("click");
    expect(wrapper.emitted("input")![0]).toEqual(["."]);
  });

  it("点击 ± 触发 toggle-sign", async () => {
    const wrapper = mount(Numpad, { props: { variant: "basic", layout: "normal" } });
    await wrapper.find('[data-key="sign"]').trigger("click");
    expect(wrapper.emitted("toggle-sign")).toBeTruthy();
  });

  it("点击清空触发 clear", async () => {
    const wrapper = mount(Numpad, { props: { variant: "basic", layout: "normal" } });
    await wrapper.find('[data-key="clear"]').trigger("click");
    expect(wrapper.emitted("clear")).toBeTruthy();
  });

  it("点击退格触发 backspace", async () => {
    const wrapper = mount(Numpad, { props: { variant: "basic", layout: "normal" } });
    await wrapper.find('[data-key="backspace"]').trigger("click");
    expect(wrapper.emitted("backspace")).toBeTruthy();
  });

  it("点击确定触发 submit", async () => {
    const wrapper = mount(Numpad, { props: { variant: "basic", layout: "normal" } });
    await wrapper.find('[data-key="submit"]').trigger("click");
    expect(wrapper.emitted("submit")).toBeTruthy();
  });

  it("点击重开触发 restart", async () => {
    const wrapper = mount(Numpad, { props: { variant: "basic", layout: "normal" } });
    await wrapper.find('[data-key="restart"]').trigger("click");
    expect(wrapper.emitted("restart")).toBeTruthy();
  });

  it("渲染拖拽手柄与说明文案", () => {
    const wrapper = mount(Numpad, { props: { variant: "basic", layout: "normal" } });
    expect(wrapper.find('[data-handle="drag"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("上下拖调大小");
    expect(wrapper.text()).toContain("左右拖调位置");
    expect(wrapper.text()).toContain("双击恢复");
  });
});
