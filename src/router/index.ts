import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/home" },
    {
      path: "/home",
      name: "home",
      component: () => import("@/views/Home.vue"),
      meta: { title: "首页" },
    },
    {
      path: "/practice",
      name: "practice-settings",
      component: () => import("@/views/PracticeSettings.vue"),
      meta: { title: "基础计算" },
    },
    {
      path: "/practice/session",
      name: "practice-session",
      component: () => import("@/views/PracticeSession.vue"),
      meta: { title: "答题中" },
    },
    {
      path: "/practice/result",
      name: "practice-result",
      component: () => import("@/views/PracticeResult.vue"),
      meta: { title: "结算" },
    },
    {
      path: "/history",
      name: "history",
      component: () => import("@/views/History.vue"),
      meta: { title: "历史记录" },
    },
    {
      path: "/stats",
      name: "stats",
      component: () => import("@/views/Stats.vue"),
      meta: { title: "统计" },
    },
    {
      path: "/settings",
      name: "settings",
      component: () => import("@/views/Settings.vue"),
      meta: { title: "设置" },
    },
  ],
});

export default router;
