import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SegmentedControl from "@/components/SegmentedControl.vue";

interface Option {
  label: string;
  value: string;
}

const OPTIONS: Option[] = [
  { label: "简单", value: "easy" },
  { label: "一般", value: "normal" },
  { label: "困难", value: "hard" },
];

describe("SegmentedControl.vue", () => {
  it("渲染所有选项", () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "" },
    });
    expect(wrapper.text()).toContain("简单");
    expect(wrapper.text()).toContain("一般");
    expect(wrapper.text()).toContain("困难");
  });

  it("modelValue 匹配项标记为 active", () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "normal" },
    });
    const normal = wrapper.find('[data-seg-value="normal"]');
    expect(normal.classes()).toContain("active");
  });

  it("点击选项触发 update:modelValue", async () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "" },
    });
    await wrapper.find('[data-seg-value="hard"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")![0]).toEqual(["hard"]);
  });

  it("disabled 时点击不触发事件", async () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "", disabled: true },
    });
    await wrapper.find('[data-seg-value="hard"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeFalsy();
  });

  it("disabled 时所有选项标记 disabled", () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "", disabled: true },
    });
    const allButtons = wrapper.findAll(".seg-btn");
    expect(allButtons.every((b) => b.classes().includes("disabled"))).toBe(true);
  });

  it("空 options 数组安全渲染不报错", () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: [], modelValue: "" },
    });
    expect(wrapper.findAll(".seg-btn")).toHaveLength(0);
  });

  it("切换 modelValue 后 active 正确转移", async () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "easy" },
    });
    expect(wrapper.find('[data-seg-value="easy"]').classes()).toContain("active");
    expect(wrapper.find('[data-seg-value="normal"]').classes()).not.toContain("active");

    await wrapper.setProps({ modelValue: "normal" });
    expect(wrapper.find('[data-seg-value="easy"]').classes()).not.toContain("active");
    expect(wrapper.find('[data-seg-value="normal"]').classes()).toContain("active");
  });

  it("modelValue 不匹配任何 value 时无项被 active", () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "nonexistent" },
    });
    expect(wrapper.find(".active").exists()).toBe(false);
  });
});
