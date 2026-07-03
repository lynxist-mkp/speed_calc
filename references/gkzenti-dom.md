# gkzenti 数据源与 DOM 探查（L6 用）

> 何时读：仅 L6（本期不实现）。以下为已用真实 HTML 验证的事实。

## 数据获取链路

```
1. GET https://www.gkzenti.cn/api/json?cls=行测&province={地区}
   → [{No, Title, Source}]   (No=详情页URL)
2. GET https://gwy.gkzhenti.cn/paper/{paperId}     (详情页HTML,cheerio解析题目)
3. GET https://gwy.gkzhenti.cn/answer/{paperId}    (答案页)
4. GET https://gwy.gkzhenti.cn/explain/{paperId}   (解析页)
```

paperId 形如 `1767342831658`（毫秒时间戳）。

## 选择器速查表（已验证）

| 目标 | 选择器 |
|---|---|
| 试卷标题 | `h3[align="center"]` |
| 模块标题 | `div.col-xs-12.subtitle` |
| 材料编号 | `div.col-xs-12.sub2title` |
| 单题 | `div.row`(含 `div.col-xs-1.left`) |
| 题号 | `div.col-xs-1.left` |
| 题干+选项 | 同级 `div.col-xs-11.right` |
| 题干 | `div.col-xs-11.right > p` |
| 选项 | `div.col-xs-11.right > div.col-xs-3\|6\|12` |
| TeX公式图 | `img[flag="tex"]` |
| 填空占位 | `<u>` |

## 图片
- `<img src>` 为协议相对(`//upload.gkzhenti.cn/...`)，必须补 `https:`
- 下载到 `app_data/images/{paperId}/`，DB 存相对路径

## 其他事实
- 无内嵌 JSON（无 `__INITIAL_STATE__`/`__NEXT_DATA__`），纯 HTML 渲染
- 选项布局：col-xs-3(一行4) / col-xs-6(一行2) / col-xs-12(独占)
- 模块题号：政治1-20/常识21-35/言语36-65/数量66-75/判断76-110/资料111-130
- 答案/解析页 DOM 未探查（L6 实现时再取 /answer、/explain 确认）

## 决策落地
- 初始国考；省份按需下载
- 答案缺失 → 跳过重抓
- 图片下载失败 → 重试3次 → 仍失败整卷跳过（不入库）
