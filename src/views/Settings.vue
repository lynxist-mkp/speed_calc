<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  listTimeStandards,
  updateTimeStandard,
  insertTimeStandard,
  deleteTimeStandard,
  clearAllSessions,
  type TimeStandardRow,
} from "@/db/index";
import { typeLabel } from "@/constants/typeLabels";
import { useSettingsStore } from "@/stores/settings";
import type { KeyboardLayout } from "@/utils/keymap";
import KeymapGuideModal from "@/components/KeymapGuideModal.vue";

const settingsStore = useSettingsStore();
const keyboardLayout = ref<KeyboardLayout>("qwerty");
const guideVisible = ref(false);

async function onLayoutChange(val: KeyboardLayout) {
  keyboardLayout.value = val;
  await settingsStore.saveGlobal({ keyboardInputLayout: val });
  ElMessage.success(val === "norman" ? "已切换到 Norman 布局" : "已切换到 QWERTY 布局");
}

// 精简键位预览：物理键盘统一按 QWERTY 标签显示（映射按物理位置）
const previewRows = [
  { nums: ["7", "8", "9"], keys: ["U", "I", "O"] },
  { nums: ["4", "5", "6"], keys: ["J", "K", "L"] },
  { nums: ["1", "2", "3"], keys: ["M", ",", "."] },
];

const standards = ref<TimeStandardRow[]>([]);
const loading = ref(true);
const editing = ref<Record<number, { pass: string; good: string; excellent: string }>>({});

// 分组定义：题型 → 分类
const TYPE_CATEGORIES: { name: string; types: string[] }[] = [
  { name: "基础运算", types: [
    "basic_addsub", "addsub_2d", "round_100", "add_3d", "sub_3d", "addsub_3d",
    "add_multi", "addsub_mix", "mul_2x1", "mul_3x1", "mul_2x11", "mul_2x15",
    "mul_2x2", "div_3x1", "div_3x2", "mul_est", "div_5x3", "div_3x4",
  ]},
  { name: "资料分析填空", types: [
    "estimate_prev", "estimate_growth", "baihua_frac", "baihua_frac_rev",
    "frac_calc_lt", "frac_calc_gt", "annual_growth_rate", "base_period_ratio", "annual_avg",
  ]},
  { name: "资料分析比较", types: ["compare_growth", "compare_base", "compare_frac"] },
  { name: "综合", types: ["composite"] },
  { name: "自定义", types: ["custom_standard", "custom_power"] },
];

// 按分类 + 题型分组
interface TypeGroup {
  type: string;
  label: string;
  rows: TimeStandardRow[];
}
interface CategoryGroup {
  name: string;
  types: TypeGroup[];
}
const groupedStandards = computed<CategoryGroup[]>(() => {
  const byType = new Map<string, TimeStandardRow[]>();
  for (const s of standards.value) {
    if (!byType.has(s.questionType)) byType.set(s.questionType, []);
    byType.get(s.questionType)!.push(s);
  }
  return TYPE_CATEGORIES.map((cat) => ({
    name: cat.name,
    types: cat.types
      .filter((t) => byType.has(t))
      .map((t) => ({
        type: t,
        label: typeLabel(t),
        rows: byType.get(t)!.sort((a, b) => a.questionCount - b.questionCount),
      })),
  }));
});

// 展开状态：按题型 key
const expandedTypes = ref<Set<string>>(new Set());
function toggleType(type: string) {
  if (expandedTypes.value.has(type)) {
    expandedTypes.value.delete(type);
  } else {
    expandedTypes.value.add(type);
  }
}

const newStandard = ref({
  questionType: "basic_addsub",
  questionCount: 10,
  passS: 28,
  goodS: 22,
  excellentS: 18,
});

async function loadStandards() {
  loading.value = true;
  try {
    standards.value = await listTimeStandards();
    editing.value = {};
    for (const s of standards.value) {
      editing.value[s.id] = {
        pass: String(s.passS),
        good: String(s.goodS),
        excellent: String(s.excellentS),
      };
    }
  } finally {
    loading.value = false;
  }
}

async function saveStandard(id: number) {
  const e = editing.value[id];
  if (!e) return;
  const pass = Number(e.pass);
  const good = Number(e.good);
  const excellent = Number(e.excellent);
  if ([pass, good, excellent].some((n) => !Number.isFinite(n) || n <= 0)) {
    ElMessage.warning("秒数必须为正数");
    return;
  }
  await updateTimeStandard(id, { passS: pass, goodS: good, excellentS: excellent });
  ElMessage.success("已更新");
  await loadStandards();
}

async function addStandard() {
  const { questionType, questionCount, passS, goodS, excellentS } = newStandard.value;
  if (!questionType.trim()) {
    ElMessage.warning("题型不能为空");
    return;
  }
  if ([passS, goodS, excellentS].some((n) => !Number.isFinite(n) || n <= 0)) {
    ElMessage.warning("秒数必须为正数");
    return;
  }
  await insertTimeStandard({ questionType, questionCount, passS, goodS, excellentS });
  ElMessage.success("已添加");
  expandedTypes.value.add(questionType);
  await loadStandards();
}

async function removeStandard(id: number) {
  try {
    await ElMessageBox.confirm("确认删除该时间标准？", "删除", {
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      type: "warning",
    });
    await deleteTimeStandard(id);
    ElMessage.success("已删除");
    await loadStandards();
  } catch {
    // 用户取消
  }
}

async function onClearHistory() {
  try {
    await ElMessageBox.confirm("确认清除所有练习记录？此操作不可恢复。", "清除历史", {
      confirmButtonText: "清除",
      cancelButtonText: "取消",
      type: "warning",
    });
    await clearAllSessions();
    ElMessage.success("已清除所有练习记录");
  } catch {
    // 用户取消
  }
}

onMounted(async () => {
  await loadStandards();
  keyboardLayout.value = settingsStore.global.keyboardInputLayout;
});
</script>

<template>
  <div class="settings-page">
    <h2 class="title">全局设置</h2>

    <!-- 时间标准编辑 -->
    <section class="block glass-card">
      <h3 class="block-title">时间标准</h3>
      <p class="block-desc">不同题型 × 题量对应的合格/良好/优秀秒数，点击题型卡片展开编辑</p>

      <div v-if="loading" class="empty">加载中…</div>
      <div v-else-if="standards.length === 0" class="empty">暂无时间标准</div>
      <div v-else class="std-groups">
        <div v-for="cat in groupedStandards" :key="cat.name" class="std-category">
          <h4 class="cat-title">{{ cat.name }}</h4>
          <div class="cat-grid">
            <div
              v-for="tg in cat.types"
              :key="tg.type"
              class="std-card"
              :class="{ expanded: expandedTypes.has(tg.type) }"
            >
              <button class="std-card-header" @click="toggleType(tg.type)">
                <span class="std-card-label">{{ tg.label }}</span>
                <span class="std-card-summary">
                  <span
                    v-for="r in tg.rows"
                    :key="r.id"
                    class="std-chip"
                  >{{ r.questionCount }}题 · {{ r.passS }}/{{ r.goodS }}/{{ r.excellentS }}s</span>
                </span>
                <span class="std-card-arrow" :class="{ open: expandedTypes.has(tg.type) }">›</span>
              </button>
              <div v-if="expandedTypes.has(tg.type)" class="std-card-body">
                <div v-for="r in tg.rows" :key="r.id" class="std-edit-row">
                  <span class="std-edit-count">{{ r.questionCount }}题</span>
                  <label class="std-edit-field">
                    <span class="std-edit-label">合格</span>
                    <input
                      :value="editing[r.id]?.pass"
                      @input="editing[r.id] && (editing[r.id].pass = ($event.target as HTMLInputElement).value)"
                      class="num-input"
                      type="number"
                    />
                  </label>
                  <label class="std-edit-field">
                    <span class="std-edit-label">良好</span>
                    <input
                      :value="editing[r.id]?.good"
                      @input="editing[r.id] && (editing[r.id].good = ($event.target as HTMLInputElement).value)"
                      class="num-input"
                      type="number"
                    />
                  </label>
                  <label class="std-edit-field">
                    <span class="std-edit-label">优秀</span>
                    <input
                      :value="editing[r.id]?.excellent"
                      @input="editing[r.id] && (editing[r.id].excellent = ($event.target as HTMLInputElement).value)"
                      class="num-input"
                      type="number"
                    />
                  </label>
                  <span class="std-edit-unit">秒</span>
                  <button class="op-btn save" @click="saveStandard(r.id)">保存</button>
                  <button class="op-btn del" @click="removeStandard(r.id)">删除</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 新增 -->
      <div class="add-row">
        <h4 class="add-title">新增时间标准</h4>
        <div class="add-form">
          <input v-model="newStandard.questionType" class="text-input" placeholder="题型" />
          <input v-model.number="newStandard.questionCount" class="num-input" type="number" placeholder="题量" />
          <input v-model.number="newStandard.passS" class="num-input" type="number" placeholder="合格" />
          <input v-model.number="newStandard.goodS" class="num-input" type="number" placeholder="良好" />
          <input v-model.number="newStandard.excellentS" class="num-input" type="number" placeholder="优秀" />
          <button class="op-btn add" @click="addStandard">添加</button>
        </div>
      </div>
    </section>

    <!-- 键盘布局 -->
    <section class="block glass-card">
      <h3 class="block-title">键盘布局</h3>
      <p class="block-desc">选择你的物理键盘布局，影响答案输入的按键映射（右手小键盘区）</p>
      <div class="layout-options">
        <label class="layout-option" :class="{ active: keyboardLayout === 'qwerty' }">
          <input
            type="radio"
            name="keyboardLayout"
            value="qwerty"
            :checked="keyboardLayout === 'qwerty'"
            @change="onLayoutChange('qwerty')"
          />
          <span class="layout-label">QWERTY</span>
          <span class="layout-desc">标准布局，e.code 直接反映物理键位置</span>
        </label>
        <label class="layout-option" :class="{ active: keyboardLayout === 'norman' }">
          <input
            type="radio"
            name="keyboardLayout"
            value="norman"
            :checked="keyboardLayout === 'norman'"
            @change="onLayoutChange('norman')"
          />
          <span class="layout-label">Norman</span>
          <span class="layout-desc">通过 Karabiner-Elements 启用的 Norman 布局</span>
        </label>
      </div>

      <!-- 精简键位预览 -->
      <div class="keymap-preview">
        <div class="preview-title">右手主键盘区 → 数字映射</div>
        <div class="preview-rows">
          <div v-for="(row, i) in previewRows" :key="i" class="preview-row">
            <span class="preview-num">{{ row.nums.join(" ") }}</span>
            <span class="preview-arrow">←</span>
            <span class="preview-key">{{ row.keys.join(" ") }}</span>
          </div>
        </div>
        <div class="preview-bottom">
          <span class="preview-num">. 0 ↵</span>
          <span class="preview-arrow">←</span>
          <span class="preview-key">/ Space Enter</span>
        </div>
        <button class="view-guide-btn" @click="guideVisible = true">查看完整指引 →</button>
      </div>
    </section>

    <!-- 数据管理 -->
    <section class="block glass-card">
      <h3 class="block-title">数据管理</h3>
      <p class="block-desc">清除所有练习历史记录（不影响设置和时间标准）</p>
      <button class="danger-btn" @click="onClearHistory">清除所有练习记录</button>
    </section>

    <!-- 关于 -->
    <section class="block glass-card">
      <h3 class="block-title">关于</h3>
      <p class="about-text">行测小助手 · 本地版</p>
      <p class="about-sub">灵感源自网友红领巾的行测小助手，独立实现</p>
    </section>

    <!-- 键盘输入指引弹窗 -->
    <KeymapGuideModal
      :visible="guideVisible"
      :layout="keyboardLayout"
      @close="guideVisible = false"
      @go-settings="guideVisible = false"
    />
  </div>
</template>

<style scoped lang="scss">
.settings-page {
  padding: 80px 24px 24px 96px;
  max-width: 900px;
  margin: 0 auto;
}

.title {
  color: var(--app-text-bright);
  margin-bottom: 16px;
}

.block {
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.block-title {
  font-size: 16px;
  color: var(--app-text-bright);
  margin: 0 0 6px;
}

.block-desc {
  font-size: 12px;
  color: var(--app-text-secondary);
  margin: 0 0 12px;
}

.empty {
  color: var(--app-text-secondary);
  text-align: center;
  padding: 20px;
}

// 时间标准分组卡片
.std-groups {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.std-category {
  // 分类容器
}

.cat-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-color-info);
  margin: 0 0 8px;
  letter-spacing: 0.5px;
}

.cat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 8px;
}

.std-card {
  background: var(--app-bg-surface);
  border: 1px solid var(--app-glass-border);
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.15s;

  &.expanded {
    border-color: var(--app-color-primary);
  }
}

.std-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
}

.std-card-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-bright);
  flex-shrink: 0;
}

.std-card-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1;
  overflow: hidden;
}

.std-chip {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(38, 139, 210, 0.12);
  color: var(--app-color-info);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.std-card-arrow {
  font-size: 16px;
  color: var(--app-text-secondary);
  transition: transform 0.15s;
  flex-shrink: 0;
  &.open {
    transform: rotate(90deg);
  }
}

.std-card-body {
  padding: 8px 12px 12px;
  border-top: 1px solid var(--app-glass-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.std-edit-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 6px 0;
  border-bottom: 1px solid rgba(147, 161, 161, 0.08);
  &:last-child {
    border-bottom: none;
  }
}

.std-edit-count {
  font-size: 12px;
  font-weight: 600;
  color: var(--app-text-primary);
  min-width: 40px;
}

.std-edit-field {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.std-edit-label {
  font-size: 10px;
  color: var(--app-text-secondary);
}

.std-edit-unit {
  font-size: 11px;
  color: var(--app-text-muted);
}

.num-input {
  width: 60px;
  padding: 4px 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background: var(--app-bg-surface);
  color: var(--app-text-bright);
  font-size: 13px;
  text-align: center;
}

.text-input {
  width: 140px;
  padding: 4px 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background: var(--app-bg-surface);
  color: var(--app-text-bright);
  font-size: 13px;
}

.op-cell {
  display: flex;
  gap: 4px;
  justify-content: center;
}

.op-btn {
  padding: 4px 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background: var(--app-bg-surface);
  color: var(--app-text-primary);
  font-size: 12px;
  cursor: pointer;

  &.save:hover {
    border-color: var(--app-color-primary);
    color: var(--app-color-primary);
  }
  &.del:hover {
    border-color: #dc6c6c;
    color: #dc6c6c;
  }
  &.add {
    background: var(--app-color-primary);
    color: #fff;
    border-color: var(--app-color-primary);
    &:hover { background: var(--app-color-primary-hover); }
  }
}

.add-row {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.add-title {
  font-size: 13px;
  color: var(--app-text-primary);
  margin: 0 0 8px;
}

.add-form {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.danger-btn {
  padding: 8px 16px;
  border: 1px solid #dc6c6c;
  border-radius: 6px;
  background: transparent;
  color: #dc6c6c;
  font-size: 13px;
  cursor: pointer;
  &:hover {
    background: rgba(220, 108, 108, 0.15);
  }
}

.layout-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.layout-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;

  input[type="radio"] {
    cursor: pointer;
  }

  &.active {
    border-color: var(--app-color-primary);
    background: rgba(38, 139, 210, 0.1);
  }

  &:hover {
    border-color: rgba(255, 255, 255, 0.2);
  }
}

.layout-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text-bright);
  min-width: 70px;
}

.layout-desc {
  font-size: 12px;
  color: var(--app-text-secondary);
}

.keymap-preview {
  margin-top: 16px;
  padding: 14px;
  border-radius: 8px;
  background: rgba(0, 43, 54, 0.5);
  border: 1px solid rgba(147, 161, 161, 0.15);
}

.preview-title {
  font-size: 12px;
  color: var(--app-text-secondary);
  margin-bottom: 10px;
}

.preview-rows {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 4px;
}

.preview-row,
.preview-bottom {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: var(--app-font-mono);
  font-size: 13px;
}

.preview-num {
  color: var(--app-color-primary);
  font-weight: 600;
  min-width: 56px;
  letter-spacing: 2px;
}

.preview-arrow {
  color: var(--app-text-muted);
}

.preview-key {
  color: var(--app-text-secondary);
  letter-spacing: 2px;
}

.preview-bottom {
  margin-bottom: 12px;
}

.view-guide-btn {
  margin-top: 4px;
  padding: 6px 12px;
  border: 1px solid var(--app-glass-border);
  border-radius: 6px;
  background: transparent;
  color: var(--app-color-primary);
  font-size: 12px;
  cursor: pointer;
  &:hover {
    background: rgba(95, 175, 111, 0.12);
    border-color: var(--app-color-primary);
  }
}

.about-text {
  font-size: 14px;
  color: var(--app-text-primary);
  margin: 0 0 4px;
}

.about-sub {
  font-size: 12px;
  color: var(--app-text-secondary);
  margin: 0;
}
</style>
