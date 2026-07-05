# 安全策略

## 支持版本

本项目仅对最新 release 提供安全更新。

| 版本         | 支持状态  |
| ------------ | --------- |
| 最新 release | ✅ 支持   |
| 旧版本       | ❌ 不支持 |

## 报告安全漏洞

**请不要通过公开 Issue 报告安全漏洞。**

请通过 GitHub Security Advisory 报告：

1. 前往仓库 [Security](https://github.com/linkslinks/speed_calc/security/advisories) 页面
2. 点击「Report a vulnerability」
3. 填写漏洞描述、复现步骤、影响范围、建议修复方案

### 响应时间

| 阶段         | 时间                           |
| ------------ | ------------------------------ |
| 确认收到报告 | 72 小时内                      |
| 初步评估     | 7 天内                         |
| 修复版本发布 | 视严重程度而定（高危 30 天内） |

### 公开披露

- 在修复版本发布前，请勿公开披露漏洞细节
- 我们承诺 90 天 embargo 期内推进修复
- 修复发布后，我们会在 GitHub Security Advisory 公开致谢

## 已知安全考量

- 本应用为本地桌面应用，所有数据存储在本地 SQLite，不涉及网络传输
- Tauri capabilities 已按最小权限原则配置
- 物理键盘输入不离开应用进程

## 接收安全公告

Watch 本仓库或订阅 [GitHub Security Advisories](https://github.com/linkslinks/speed_calc/security/advisories) 接收安全公告。
