import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CompareQuestion from "@/components/CompareQuestion.vue";

describe("CompareQuestion.vue", () => {
  it("渲染左右算式（含 katex-html）", () => {
    const wrapper = mount(CompareQuestion, {
      props: {
        leftTex: "\\frac{482}{252}",
        rightTex: "\\frac{503}{265}",
        selected: null,
      },
    });
    expect(wrapper.html()).toContain("katex-html");
  });

  it("selected=null 时中间显示 ? 且有 compare-symbol 类", () => {
    const wrapper = mount(CompareQuestion, {
      props: {
        leftTex: "1",
        rightTex: "2",
        selected: null,
      },
    });
    const sym = wrapper.find(".compare-symbol");
    expect(sym.exists()).toBe(true);
    expect(sym.text()).toContain("?");
  });

  it("selected='>' 时中间显示 > 且有 selected-gt 类", () => {
    const wrapper = mount(CompareQuestion, {
      props: {
        leftTex: "1",
        rightTex: "2",
        selected: ">",
      },
    });
    const sym = wrapper.find(".compare-symbol");
    expect(sym.text()).toContain(">");
    expect(sym.classes()).toContain("selected-gt");
  });

  it("selected='<' 时中间显示 < 且有 selected-lt 类", () => {
    const wrapper = mount(CompareQuestion, {
      props: {
        leftTex: "1",
        rightTex: "2",
        selected: "<",
      },
    });
    const sym = wrapper.find(".compare-symbol");
    expect(sym.text()).toContain("<");
    expect(sym.classes()).toContain("selected-lt");
  });

  it("显示 standardText prop", () => {
    const wrapper = mount(CompareQuestion, {
      props: {
        leftTex: "1",
        rightTex: "2",
        selected: null,
        standardText: "合格 30s 良好 22s 优秀 16s",
      },
    });
    expect(wrapper.html()).toContain("合格 30s");
  });

  it("显示 context prop", () => {
    const wrapper = mount(CompareQuestion, {
      props: {
        leftTex: "1",
        rightTex: "2",
        selected: null,
        context: "左: 现期482; 右: 现期503",
      },
    });
    expect(wrapper.html()).toContain("现期482");
  });

  it("显示误差范围文案（精确判分）", () => {
    const wrapper = mount(CompareQuestion, {
      props: {
        leftTex: "1",
        rightTex: "2",
        selected: null,
      },
    });
    expect(wrapper.html()).toContain("精确判分");
  });
});
