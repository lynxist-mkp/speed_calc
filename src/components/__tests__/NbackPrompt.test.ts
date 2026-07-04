import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import NbackPrompt from "@/components/NbackPrompt.vue";

// el-dialog 默认 teleport 到 body，且其内部逻辑与被测组件无关。
// 这里 stub 成透明 div（透传 model-value / 渲染 default + footer slot），
// 让测试聚焦于 NbackPrompt 自身：props 渲染、input v-model、按钮 emit。
const stubs = {
  ElDialog: {
    name: "ElDialog",
    props: ["modelValue", "title", "width", "showClose", "closeOnClickModal"],
    emits: ["update:modelValue"],
    template: `
      <div class="el-dialog-stub">
        <div class="el-dialog__title">{{ title }}</div>
        <div class="el-dialog__body"><slot /></div>
        <div class="el-dialog__footer"><slot name="footer" /></div>
      </div>
    `,
  },
};

function mountPrompt(props: Record<string, unknown>) {
  return mount(NbackPrompt, {
    props: { visible: true, targetIndex: 0, ...props },
    global: { stubs },
  });
}

describe("NbackPrompt", () => {
  it("visible=true 时显示第 X 题提示", async () => {
    const wrapper = mountPrompt({ visible: true, targetIndex: 2 });
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("第 3 题");
    expect(wrapper.text()).toContain("答案是");
  });

  it("标题显示 N-back 回忆", async () => {
    const wrapper = mountPrompt({ visible: true, targetIndex: 0 });
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("N-back 回忆");
  });

  it("输入答案后点提交 emit submit 事件", async () => {
    const wrapper = mountPrompt({ visible: true, targetIndex: 0 });
    await wrapper.find('input[data-testid="nback-input"]').setValue("42");
    await wrapper.find('button[data-testid="nback-submit"]').trigger("click");
    expect(wrapper.emitted("submit")).toBeTruthy();
    expect(wrapper.emitted("submit")![0]).toEqual(["42"]);
  });

  it("点跳过 emit skip 事件", async () => {
    const wrapper = mountPrompt({ visible: true, targetIndex: 0 });
    await wrapper.find('button[data-testid="nback-skip"]').trigger("click");
    expect(wrapper.emitted("skip")).toBeTruthy();
  });

  it("提交后 emit update:visible 为 false", async () => {
    const wrapper = mountPrompt({ visible: true, targetIndex: 0 });
    await wrapper.find('input[data-testid="nback-input"]').setValue("42");
    await wrapper.find('button[data-testid="nback-submit"]').trigger("click");
    const updates = wrapper.emitted("update:visible");
    expect(updates).toBeTruthy();
    expect(updates![updates!.length - 1]).toEqual([false]);
  });

  it("跳过后 emit update:visible 为 false", async () => {
    const wrapper = mountPrompt({ visible: true, targetIndex: 0 });
    await wrapper.find('button[data-testid="nback-skip"]').trigger("click");
    const updates = wrapper.emitted("update:visible");
    expect(updates).toBeTruthy();
    expect(updates![updates!.length - 1]).toEqual([false]);
  });

  it("visible 从 false 变 true 时清空输入", async () => {
    const wrapper = mountPrompt({ visible: false, targetIndex: 0 });
    const input = wrapper.find('input[data-testid="nback-input"]');
    await input.setValue("99");
    await wrapper.setProps({ visible: true });
    await wrapper.vm.$nextTick();
    expect((input.element as HTMLInputElement).value).toBe("");
  });

  it("input 回车触发提交", async () => {
    const wrapper = mountPrompt({ visible: true, targetIndex: 0 });
    await wrapper.find('input[data-testid="nback-input"]').setValue("7");
    await wrapper.find('input[data-testid="nback-input"]').trigger("keyup.enter");
    expect(wrapper.emitted("submit")).toBeTruthy();
    expect(wrapper.emitted("submit")![0]).toEqual(["7"]);
  });

  it("空答案时点提交不 emit submit", async () => {
    const wrapper = mountPrompt({ visible: true, targetIndex: 0 });
    await wrapper.find('button[data-testid="nback-submit"]').trigger("click");
    expect(wrapper.emitted("submit")).toBeFalsy();
  });

  it("提交按钮在空答案时 disabled，输入后解除", async () => {
    const wrapper = mountPrompt({ visible: true, targetIndex: 0 });
    const btn = wrapper.find('button[data-testid="nback-submit"]');
    expect(btn.attributes("disabled")).toBeDefined();
    await wrapper.find('input[data-testid="nback-input"]').setValue("42");
    expect(btn.attributes("disabled")).toBeUndefined();
  });
});
