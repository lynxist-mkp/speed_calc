<script setup lang="ts">
// Home - 主页
// L0：四大入口卡片占位（呼应原版四大入口，后续 Level 接入实际功能）
import { useRouter } from 'vue-router'
import { Edit, DataAnalysis, MagicStick, Grid } from '@element-plus/icons-vue'

const router = useRouter()

const entries = [
  {
    key: 'basic',
    title: '基础计算练习',
    desc: '训练最基本的加减乘除，打好数资基础',
    icon: Edit,
    available: true,
    level: 'L1',
    route: '/practice',
  },
  {
    key: 'data',
    title: '资料分析专项',
    desc: '提供实际做题中常用公式的专项练习',
    icon: DataAnalysis,
    available: true,
    level: 'L2-L3',
    route: '/practice/data-analysis',
  },
  {
    key: 'think',
    title: '思维能力训练',
    desc: '在潜移默化中提升思维能力或反应能力',
    icon: MagicStick,
    available: false,
    level: '保留入口',
    route: '',
  },
  {
    key: 'reason',
    title: '数字推理训练',
    desc: '通过大量训练提高数字推理的敏感性',
    icon: Grid,
    available: false,
    level: '保留入口',
    route: '',
  },
] as const

function goEntry(e: { route: string }) {
  if (e.route) router.push(e.route)
}
</script>

<template>
  <section class="home">
    <header class="home-header">
      <h1 class="home-title">行测小助手</h1>
      <p class="home-subtitle text-secondary">资料分析速算训练 · 本地离线版</p>
    </header>

    <div class="entry-grid">
      <article
        v-for="e in entries"
        :key="e.key"
        class="entry-card glass-card"
        :class="{ 'is-disabled': !e.available }"
        @click="e.available && goEntry(e)"
      >
        <div class="entry-icon">
          <el-icon :size="28"><component :is="e.icon" /></el-icon>
        </div>
        <div class="entry-body">
          <div class="entry-title">{{ e.title }}</div>
          <div class="entry-desc text-secondary">{{ e.desc }}</div>
        </div>
        <div class="entry-tag" :class="e.available ? 'tag-on' : 'tag-off'">{{ e.level }}</div>
      </article>
    </div>

    <footer class="home-foot text-muted">
      <span>灵感源自网友红领巾的行测小助手，独立实现 · v0.1.0</span>
    </footer>
  </section>
</template>

<style scoped lang="scss">
.home {
  max-width: 960px;
  margin: 0 auto;
}

.home-header {
  margin-bottom: 32px;
}

.home-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--app-text-bright);
  margin: 0 0 8px;
  letter-spacing: 1px;
}

.home-subtitle {
  margin: 0;
  font-size: 14px;
}

.entry-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.entry-card {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease;

  &:hover:not(.is-disabled) {
    transform: translateY(-2px);
    border-color: var(--app-color-primary);
  }

  &.is-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.entry-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--app-radius-card);
  background: linear-gradient(135deg, rgba(95, 175, 111, 0.18), rgba(133, 153, 0, 0.12));
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-color-primary);
  flex-shrink: 0;
}

.entry-body {
  flex: 1;
  min-width: 0;
}

.entry-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--app-text-bright);
  margin-bottom: 4px;
}

.entry-desc {
  font-size: 12px;
  line-height: 1.4;
}

.entry-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  flex-shrink: 0;

  &.tag-on {
    background: rgba(95, 175, 111, 0.18);
    color: var(--app-color-primary);
  }

  &.tag-off {
    background: rgba(147, 161, 161, 0.1);
    color: var(--app-text-muted);
  }
}

.home-foot {
  margin-top: 40px;
  text-align: center;
  font-size: 12px;
}
</style>
