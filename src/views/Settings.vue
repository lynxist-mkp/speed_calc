<script setup lang="ts">
import { ref, onMounted } from "vue";
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

const standards = ref<TimeStandardRow[]>([]);
const loading = ref(true);
const editing = ref<Record<number, { pass: string; good: string; excellent: string }>>({});

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

onMounted(() => loadStandards());
</script>

<template>
  <div class="settings-page">
    <h2 class="title">全局设置</h2>

    <!-- 时间标准编辑 -->
    <section class="block glass-card">
      <h3 class="block-title">时间标准</h3>
      <p class="block-desc">不同题型 × 题量对应的合格/良好/优秀秒数</p>

      <div v-if="loading" class="empty">加载中…</div>
      <div v-else-if="standards.length === 0" class="empty">暂无时间标准</div>
      <div v-else class="table-wrap">
        <table class="std-table">
          <thead>
            <tr>
              <th>题型</th>
              <th>题量</th>
              <th>合格(秒)</th>
              <th>良好(秒)</th>
              <th>优秀(秒)</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in standards" :key="s.id">
              <td>{{ typeLabel(s.questionType) }}</td>
              <td>{{ s.questionCount }}</td>
              <td>
                <input
                  :value="editing[s.id]?.pass"
                  @input="editing[s.id] && (editing[s.id].pass = ($event.target as HTMLInputElement).value)"
                  class="num-input"
                  type="number"
                />
              </td>
              <td>
                <input
                  :value="editing[s.id]?.good"
                  @input="editing[s.id] && (editing[s.id].good = ($event.target as HTMLInputElement).value)"
                  class="num-input"
                  type="number"
                />
              </td>
              <td>
                <input
                  :value="editing[s.id]?.excellent"
                  @input="editing[s.id] && (editing[s.id].excellent = ($event.target as HTMLInputElement).value)"
                  class="num-input"
                  type="number"
                />
              </td>
              <td class="op-cell">
                <button class="op-btn save" @click="saveStandard(s.id)">保存</button>
                <button class="op-btn del" @click="removeStandard(s.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
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
  </div>
</template>

<style scoped lang="scss">
.settings-page {
  padding: 80px 24px 24px 96px;
  max-width: 900px;
  margin: 0 auto;
}

.title {
  color: var(--app-text-bright, #eee8d5);
  margin-bottom: 16px;
}

.block {
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.block-title {
  font-size: 16px;
  color: var(--app-text-bright, #eee8d5);
  margin: 0 0 6px;
}

.block-desc {
  font-size: 12px;
  color: var(--app-text-secondary, #586e75);
  margin: 0 0 12px;
}

.empty {
  color: var(--app-text-secondary, #586e75);
  text-align: center;
  padding: 20px;
}

.table-wrap {
  overflow-x: auto;
}

.std-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th, td {
    padding: 8px 6px;
    text-align: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    color: var(--app-text-primary, #93a1a1);
  }

  th {
    color: var(--app-text-bright, #eee8d5);
    font-weight: 600;
  }
}

.num-input {
  width: 60px;
  padding: 4px 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background: var(--app-bg-surface, #073642);
  color: var(--app-text-bright, #eee8d5);
  font-size: 13px;
  text-align: center;
}

.text-input {
  width: 140px;
  padding: 4px 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background: var(--app-bg-surface, #073642);
  color: var(--app-text-bright, #eee8d5);
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
  background: var(--app-bg-surface, #073642);
  color: var(--app-text-primary, #93a1a1);
  font-size: 12px;
  cursor: pointer;

  &.save:hover {
    border-color: var(--app-color-primary, #5faf6f);
    color: var(--app-color-primary, #5faf6f);
  }
  &.del:hover {
    border-color: #dc6c6c;
    color: #dc6c6c;
  }
  &.add {
    background: var(--app-color-primary, #5faf6f);
    color: #fff;
    border-color: var(--app-color-primary, #5faf6f);
    &:hover { background: var(--app-color-primary-hover, #7fc38c); }
  }
}

.add-row {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.add-title {
  font-size: 13px;
  color: var(--app-text-primary, #93a1a1);
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

.about-text {
  font-size: 14px;
  color: var(--app-text-primary, #93a1a1);
  margin: 0 0 4px;
}

.about-sub {
  font-size: 12px;
  color: var(--app-text-secondary, #586e75);
  margin: 0;
}
</style>
