// 行测小助手 - 路由
// L0：5 个占位路由，后续 Level 填充内容
import { createRouter, createWebHistory } from "vue-router";

export const routes = [
  { path: "/", redirect: "/home" },
  { path: "/home", name: "home", component: () => import("@/views/Home.vue"), meta: { title: "主页" } },
  { path: "/practice", name: "practice", component: () => import("@/views/Practice.vue"), meta: { title: "练习" } },
  { path: "/history", name: "history", component: () => import("@/views/History.vue"), meta: { title: "历史记录" } },
  { path: "/stats", name: "stats", component: () => import("@/views/Stats.vue"), meta: { title: "统计" } },
  { path: "/settings", name: "settings", component: () => import("@/views/Settings.vue"), meta: { title: "设置" } },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
