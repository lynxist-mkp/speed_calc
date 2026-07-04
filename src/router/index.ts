// src/router/index.ts
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/home" },
    {
      path: "/home",
      name: "home",
      component: () => import("@/views/Home.vue"),
      meta: { title: "首页", layout: "default" },
    },
    {
      path: "/practice",
      name: "practice-settings",
      component: () => import("@/views/PracticeSettings.vue"),
      meta: { title: "基础计算", layout: "default" },
    },
    {
      path: "/practice/data-analysis",
      name: "data-analysis-settings",
      component: () => import("@/views/DataAnalysisSettings.vue"),
      meta: { title: "资料分析", layout: "default" },
    },
    {
      path: "/practice/session",
      name: "practice-session",
      component: () => import("@/views/PracticeSession.vue"),
      meta: { title: "答题中", layout: "answer" },
    },
    {
      path: "/practice/composite",
      name: "composite-session",
      component: () => import("@/views/CompositeSession.vue"),
      meta: { title: "一表通算", layout: "answer" },
    },
    {
      path: "/practice/result",
      name: "practice-result",
      component: () => import("@/views/PracticeResult.vue"),
      meta: { title: "结算", layout: "default" },
    },
    {
      path: "/history",
      name: "history",
      component: () => import("@/views/History.vue"),
      meta: { title: "历史记录", layout: "default" },
    },
    {
      path: "/stats",
      name: "stats",
      component: () => import("@/views/Stats.vue"),
      meta: { title: "统计", layout: "default" },
    },
    {
      path: "/settings",
      name: "settings",
      component: () => import("@/views/Settings.vue"),
      meta: { title: "设置", layout: "default" },
    },
  ],
});

export default router;
