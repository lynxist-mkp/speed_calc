<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { usePracticeStore } from "@/stores/practice";
import { useSettingsStore } from "@/stores/settings";
import { listCustomPresets, upsertCustomPreset, type CustomPreset } from "@/db/index";
import {
  formatStandardName,
  formatPowerName,
  type CustomStandardConfig,
  type CustomPowerConfig,
} from "@/generators/custom";
import type { BasicType } from "@/generators/basic";

type Operator = "+" | "-" | "×" | "÷";

const router = useRouter();
const store = usePracticeStore();
const settings = useSettingsStore();

const questionTypes: { label: string; type: BasicType }[] = [
  { label: "两位数加减", type: "addsub_2d" },
  { label: "凑整百练习", type: "round_100" },
  { label: "三位数加法", type: "add_3d" },
  { label: "三位数减法", type: "sub_3d" },
  { label: "三位数加减", type: "addsub_3d" },
  { label: "多数相加", type: "add_multi" },
  { label: "混合加减", type: "addsub_mix" },
  { label: "两位数乘一位数", type: "mul_2x1" },
  { label: "三位数乘一位数", type: "mul_3x1" },
  { label: "两位数乘11", type: "mul_2x11" },
  { label: "两位数乘15", type: "mul_2x15" },
  { label: "两位数乘两位数", type: "mul_2x2" },
  { label: "三位数除一位数", type: "div_3x1" },
  { label: "三位数除两位数", type: "div_3x2" },
  { label: "乘法估算", type: "mul_est" },
  { label: "五位数除三位数", type: "div_5x3" },
  { label: "三位数除四位数", type: "div_3x4" },
];

const OPERATORS: Operator[] = ["+", "-", "×", "÷"];

const countDialogVisible = ref(false);
const countMode = ref<"quick" | "normal" | "custom">("quick");
const customCount = ref(10);

function openCountDialog() {
  countMode.value = settings.basic.countMode;
  customCount.value = settings.basic.count;
  countDialogVisible.value = true;
}

function selectCountMode(mode: "quick" | "normal" | "custom") {
  countMode.value = mode;
  if (mode === "quick") customCount.value = 10;
  if (mode === "normal") customCount.value = 15;
}

async function confirmCount() {
  let count = customCount.value;
  if (countMode.value === "custom") {
    count = Math.max(5, Math.min(100, count));
  }
  await settings.saveBasic({ countMode: countMode.value, count });
  countDialogVisible.value = false;
}

const nbackDialogVisible = ref(false);
const nbackChoice = ref<0 | 1 | 2>(0);

function openNbackDialog() {
  nbackChoice.value = settings.basic.nback;
  nbackDialogVisible.value = true;
}

async function confirmNback() {
  await settings.saveBasic({ nback: nbackChoice.value });
  nbackDialogVisible.value = false;
}

const customVisible = ref(false);
const customTab = ref<"standard" | "power">("standard");
const presets = ref<CustomPreset[]>([]);

const stdCfg = ref<CustomStandardConfig>({
  firstDigits: 2,
  operators: ["+"],
  secondMode: "random_digits",
  secondDigits: 1,
  secondFixed: 5,
  secondMin: 1,
  secondMax: 9,
});
const powCfg = ref<CustomPowerConfig>({
  baseMode: "digits",
  baseDigits: 2,
  baseMin: 2,
  baseMax: 9,
  powerTypes: [2],
});

async function openCustomDialog() {
  customVisible.value = true;
  presets.value = await listCustomPresets();
}

function loadPreset(p: CustomPreset) {
  try {
    const cfg = JSON.parse(p.config);
    if (Array.isArray(cfg?.operators)) {
      stdCfg.value = { ...stdCfg.value, ...cfg };
      customTab.value = "standard";
    } else if (Array.isArray(cfg?.powerTypes)) {
      powCfg.value = { ...powCfg.value, ...cfg };
      customTab.value = "power";
    } else {
      ElMessage.warning("预设格式异常");
    }
  } catch {
    ElMessage.error("预设加载失败");
  }
}

function toggleOperator(op: Operator) {
  const idx = stdCfg.value.operators.indexOf(op);
  if (idx >= 0) stdCfg.value.operators.splice(idx, 1);
  else stdCfg.value.operators.push(op);
}

function togglePower(p: 2 | 3) {
  const idx = powCfg.value.powerTypes.indexOf(p);
  if (idx >= 0) powCfg.value.powerTypes.splice(idx, 1);
  else powCfg.value.powerTypes.push(p);
}

async function onCustomConfirm() {
  let cfg: CustomStandardConfig | CustomPowerConfig;
  let name: string;
  let type: "custom_standard" | "custom_power";
  if (customTab.value === "standard") {
    if (stdCfg.value.operators.length === 0) {
      ElMessage.warning("请至少选择一个运算符");
      return;
    }
    cfg = stdCfg.value;
    name = formatStandardName(cfg);
    type = "custom_standard";
  } else {
    if (powCfg.value.powerTypes.length === 0) {
      ElMessage.warning("请至少选择一个运算类型");
      return;
    }
    cfg = powCfg.value;
    name = formatPowerName(cfg);
    type = "custom_power";
  }
  try {
    await upsertCustomPreset(name, JSON.stringify(cfg));
    await settings.saveBasic({ selectedType: 17 });
    customVisible.value = false;
    await startCustom(type, cfg, name);
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : "自定义练习启动失败");
  }
}

async function startCustom(
  type: "custom_standard" | "custom_power",
  cfg: CustomStandardConfig | CustomPowerConfig,
  name: string,
) {
  await store.init({
    type,
    subtype: name,
    count: settings.basic.count,
    nback: settings.basic.nback,
    customConfig: cfg,
  });
  if (store.phase === "running") {
    router.push("/practice/session");
  } else {
    ElMessage.error(store.error ?? "练习初始化失败");
  }
}

async function onTypeClick(index: number) {
  if (index === 17) {
    await openCustomDialog();
    return;
  }
  await settings.saveBasic({ selectedType: index });
}

function onPlaceholderClick(feature: string) {
  ElMessage.info(`${feature} 待后续实现`);
}

async function startPractice() {
  const idx = settings.basic.selectedType;
  if (idx === 17) {
    ElMessage.info("请先在自定义中配置运算");
    return;
  }
  const t = questionTypes[idx];
  await store.init({
    type: t.type,
    subtype: t.label,
    count: settings.basic.count,
    nback: settings.basic.nback,
  });
  if (store.phase === "running") {
    router.push("/practice/session");
  } else {
    ElMessage.error(store.error ?? "练习初始化失败");
  }
}

function goHistory() {
  router.push("/history");
}

async function onKeyboardLayoutChange(v: string | number | boolean) {
  await settings.saveBasic({ keyboardLayout: v as "normal" | "reverse" | "shuffle" });
}

onMounted(() => settings.load());
</script>

<template>
  <div class="practice-settings">
    <div class="row">
      <span class="label">键盘布局</span>
      <el-radio-group
        :model-value="settings.basic.keyboardLayout"
        @change="onKeyboardLayoutChange"
      >
        <el-radio-button value="normal">正序</el-radio-button>
        <el-radio-button value="reverse">倒序</el-radio-button>
        <el-radio-button value="shuffle">乱序</el-radio-button>
      </el-radio-group>
    </div>

    <div class="type-grid">
      <button
        v-for="(t, i) in questionTypes"
        :key="t.type"
        class="type-cell"
        :class="{ selected: i === settings.basic.selectedType }"
        @click="onTypeClick(i)"
      >{{ t.label }}</button>
      <button
        class="type-cell"
        :class="{ selected: settings.basic.selectedType === 17 }"
        @click="onTypeClick(17)"
      >自定义</button>
    </div>

    <div class="row" @click="openCountDialog">
      <span class="label">题量</span>
      <span class="value">{{ settings.basic.count }} 题 ›</span>
    </div>

    <div class="row" @click="openNbackDialog">
      <span class="label">N-back</span>
      <span class="value">{{ settings.basic.nback === 0 ? "关闭" : `${settings.basic.nback}-back` }} ›</span>
    </div>

    <button class="start-btn" @click="startPractice">开始练习</button>

    <div class="bottom-row">
      <button class="bottom-btn" @click="onPlaceholderClick('导出题目')">导出题目</button>
      <button class="bottom-btn" @click="goHistory">历史记录</button>
    </div>

    <button class="fab" @click="onPlaceholderClick('自定义新增')">+</button>

    <el-dialog v-model="countDialogVisible" title="选择题量" width="320px">
      <div class="count-options">
        <button class="count-opt" :class="{ active: countMode === 'quick' }" @click="selectCountMode('quick')">快速 10 题</button>
        <button class="count-opt" :class="{ active: countMode === 'normal' }" @click="selectCountMode('normal')">正常 15 题</button>
        <div class="count-custom" :class="{ active: countMode === 'custom' }" @click="selectCountMode('custom')">
          <div>自定义</div>
          <el-slider v-model="customCount" :min="5" :max="100" :step="1" />
          <div>{{ customCount }} 题</div>
        </div>
      </div>
      <template #footer>
        <el-button @click="countDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmCount">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="nbackDialogVisible" title="N-back 设置" width="320px">
      <div class="nback-options">
        <button class="nback-opt" :class="{ active: nbackChoice === 0 }" @click="nbackChoice = 0">关闭</button>
        <button class="nback-opt" :class="{ active: nbackChoice === 1 }" @click="nbackChoice = 1">1-back</button>
        <button class="nback-opt" :class="{ active: nbackChoice === 2 }" @click="nbackChoice = 2">2-back</button>
      </div>
      <template #footer>
        <el-button @click="nbackDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmNback">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="customVisible" title="自定义运算" width="480px">
      <el-tabs v-model="customTab">
        <el-tab-pane label="标准运算" name="standard">
          <div v-if="presets.length" class="recent-tags">
            <span class="recent-tag" v-for="p in presets" :key="p.id" @click="loadPreset(p)">{{ p.name }}</span>
          </div>
          <div class="cfg-block">
            <div class="cfg-label">第一个数位数</div>
            <div class="cfg-buttons">
              <button v-for="d in [1,2,3,4]" :key="d" class="cfg-btn"
                :class="{ active: stdCfg.firstDigits === d }"
                @click="stdCfg.firstDigits = d as 1|2|3|4">{{ d }}位数</button>
            </div>
          </div>
          <div class="cfg-block">
            <div class="cfg-label">运算符（可多选）</div>
            <div class="cfg-buttons">
              <button v-for="op in OPERATORS" :key="op" class="cfg-btn"
                :class="{ active: stdCfg.operators.includes(op) }"
                @click="toggleOperator(op)">{{ op }}</button>
            </div>
          </div>
          <div class="cfg-block">
            <div class="cfg-label">第二个数</div>
            <div class="cfg-buttons">
              <button class="cfg-btn" :class="{ active: stdCfg.secondMode === 'random_digits' }"
                @click="stdCfg.secondMode = 'random_digits'">随机位数</button>
              <button class="cfg-btn" :class="{ active: stdCfg.secondMode === 'fixed' }"
                @click="stdCfg.secondMode = 'fixed'">固定数字</button>
              <button class="cfg-btn" :class="{ active: stdCfg.secondMode === 'range' }"
                @click="stdCfg.secondMode = 'range'">随机范围</button>
            </div>
            <div v-if="stdCfg.secondMode === 'random_digits'" class="sub-cfg">
              <button v-for="d in [1,2,3,4]" :key="d" class="cfg-btn"
                :class="{ active: stdCfg.secondDigits === d }"
                @click="stdCfg.secondDigits = d as 1|2|3|4">{{ d }}位数</button>
            </div>
            <input v-if="stdCfg.secondMode === 'fixed'" v-model.number="stdCfg.secondFixed" class="cfg-input" type="number" placeholder="固定数字" />
            <div v-if="stdCfg.secondMode === 'range'" class="sub-cfg">
              <input v-model.number="stdCfg.secondMin" class="cfg-input" type="number" placeholder="最小" />
              <span>~</span>
              <input v-model.number="stdCfg.secondMax" class="cfg-input" type="number" placeholder="最大" />
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="幂运算" name="power">
          <div class="cfg-block">
            <div class="cfg-label">底数设置方式</div>
            <div class="cfg-buttons">
              <button class="cfg-btn" :class="{ active: powCfg.baseMode === 'range' }"
                @click="powCfg.baseMode = 'range'">按范围</button>
              <button class="cfg-btn" :class="{ active: powCfg.baseMode === 'digits' }"
                @click="powCfg.baseMode = 'digits'">按位数</button>
            </div>
            <div v-if="powCfg.baseMode === 'range'" class="sub-cfg">
              <input v-model.number="powCfg.baseMin" class="cfg-input" type="number" placeholder="最小值" />
              <span>~</span>
              <input v-model.number="powCfg.baseMax" class="cfg-input" type="number" placeholder="最大值" />
            </div>
            <div v-if="powCfg.baseMode === 'digits'" class="sub-cfg">
              <button v-for="d in [1,2,3]" :key="d" class="cfg-btn"
                :class="{ active: powCfg.baseDigits === d }"
                @click="powCfg.baseDigits = d as 1|2|3">{{ d }}位数</button>
            </div>
          </div>
          <div class="cfg-block">
            <div class="cfg-label">运算类型（可多选）</div>
            <div class="cfg-buttons">
              <button class="cfg-btn" :class="{ active: powCfg.powerTypes.includes(2) }"
                @click="togglePower(2)">平方</button>
              <button class="cfg-btn" :class="{ active: powCfg.powerTypes.includes(3) }"
                @click="togglePower(3)">立方</button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="customVisible = false">取消</el-button>
        <el-button type="primary" @click="onCustomConfirm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.practice-settings { max-width: 720px; margin: 0 auto; padding: 24px; }
.row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; margin-bottom: 12px;
  background: var(--app-bg-surface, #073642); border-radius: 10px; cursor: pointer;
}
.label { color: var(--app-text-primary, #93a1a1); }
.value { color: var(--app-text-secondary, #586e75); }
.type-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px;
}
.type-cell {
  padding: 14px 8px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px;
  background: rgba(133, 200, 142, 0.15); color: var(--app-text-primary, #93a1a1);
  font-size: 14px; cursor: pointer;
  &.selected {
    background: rgba(46, 80, 56, 0.9); color: #fff;
    border-color: var(--app-color-primary, #5faf6f);
  }
  &:hover { background: rgba(133, 200, 142, 0.25); }
}
.start-btn {
  width: 100%; padding: 14px; margin: 16px 0 12px;
  background: var(--app-color-primary, #5faf6f); color: #fff;
  border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer;
  &:hover { background: #6fbf7f; }
}
.bottom-row { display: flex; gap: 12px; margin-top: 12px; }
.bottom-btn {
  flex: 1; padding: 10px;
  background: var(--app-bg-surface, #073642); color: var(--app-text-primary, #93a1a1);
  border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; cursor: pointer;
}
.fab {
  position: fixed; bottom: 32px; right: 32px;
  width: 52px; height: 52px; border-radius: 50%;
  background: #5b9bfc; color: #fff; border: none; font-size: 24px; cursor: pointer;
  box-shadow: 0 4px 12px rgba(91, 155, 252, 0.4);
}
.count-options, .nback-options { display: flex; flex-direction: column; gap: 12px; }
.count-opt, .nback-opt {
  padding: 12px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px;
  background: var(--app-bg-surface, #073642); color: var(--app-text-primary, #93a1a1);
  cursor: pointer;
  &.active {
    border-color: var(--app-color-primary, #5faf6f);
    background: rgba(95, 175, 111, 0.2);
  }
}
.count-custom {
  padding: 12px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px;
  &.active { border-color: var(--app-color-primary, #5faf6f); }
}
.recent-tags {
  display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;
  padding-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.recent-tag {
  padding: 4px 10px; background: rgba(95, 175, 111, 0.15);
  border: 1px solid rgba(95, 175, 111, 0.3); border-radius: 999px;
  font-size: 12px; color: var(--app-color-primary, #5faf6f); cursor: pointer;
  &:hover { background: rgba(95, 175, 111, 0.25); }
}
.cfg-block { margin-bottom: 16px; }
.cfg-label { font-size: 13px; color: var(--app-text-primary, #93a1a1); margin-bottom: 8px; }
.cfg-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
.cfg-btn {
  padding: 8px 14px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px;
  background: var(--app-bg-surface, #073642); color: var(--app-text-primary, #93a1a1); cursor: pointer;
  &.active {
    border-color: var(--app-color-primary, #5faf6f);
    background: rgba(95, 175, 111, 0.2); color: var(--app-color-primary, #5faf6f);
  }
}
.sub-cfg { margin-top: 8px; display: flex; gap: 8px; align-items: center; }
.cfg-input {
  width: 80px; padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px;
  background: var(--app-bg-surface, #073642); color: var(--app-text-bright, #fdf6e3);
}
</style>
