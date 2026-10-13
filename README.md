# 谋生者 ICL

个人主页与博客，线上地址 **https://www.icl.site**。基于 [Astro](https://astro.build) 构建，源码在 `main` 分支，推送到 GitHub 后由 Actions 自动发布到 GitHub Pages。

仓库名是 `xqk.github.io`，但 Pages 配了自定义域名 `www.icl.site`，所以 `xqk.github.io`
会 301 跳转到 `www.icl.site`。

- 旧 Hugo 站（terminal 主题）完整保留在 `archive/old-main-2023` 分支
- 旧建站工具生成的 `www.icl.site` 已由本站接管，`/{数字}.html` 的 URL 约定因此无缝延续

## 本地开发

```bash
pnpm install
pnpm dev      # http://localhost:4321
pnpm build    # 产出到 dist/
pnpm preview  # 预览构建结果
pnpm check    # 类型检查
```

## 内容与 URL 约定

**文件名即 URL。** 文章放在 `src/content/posts/`，关于页在 `src/content/pages/about.md`。

```
src/content/posts/17356627257151.md   →   https://www.icl.site/17356627257151.html
src/content/posts/2026-10-13-hello.md →   https://www.icl.site/2026-10-13-hello.html
```

从旧库迁移过来的文章沿用原有的数字 ID 文件名；新写的文章可以随意命名，文件名会成为 URL 片段。

front matter 字段：

```yaml
---
title: "标题"
date: "2025-07-30T10:05:52+08:00"
description: "列表页与 RSS 用的摘要"
categories: ["日常记录", "日记"]   # 栏目，从粗到细
tags: []                          # 主题标签
toc: true                         # 是否显示右侧目录
pinned: false                     # 首页置顶
legacySlugs: ["2023-12-30-hui-fa-du-shu-bi-ji"]  # 旧 Hugo 站的 slug，用于生成跳转页
---
```

正文支持原生 HTML。图表用围栏书写，浏览器端渲染：

- ` ```mermaid ` —— 流程图 / 时间线等，由 CDN 加载 mermaid 后渲染
- ` ```echarts ` —— 图表配置，由 CDN 加载 echarts 后渲染，代码里直接赋值 `option = {…}` 即可

这两个围栏由 `astro.config.mjs` 里的 `remarkDiagramBlocks` 转成占位元素，再由
`src/components/Scripts.astro` 在浏览器里渲染，原因见源码注释。

## 订阅

提供两个 feed，页面 `<head>` 里都做了自动发现：

| 地址 | 格式 | 内容 |
|---|---|---|
| `/atom.xml` | Atom 1.0 | 全文 `<content type="html">`，也是首页「订阅」按钮的目标 |
| `/rss.xml` | RSS 2.0 | 仅标题与摘要 |

两者都只包含最近 `feedLimit`（默认 20）篇。源文件分别是
`src/pages/atom.xml.ts` 与 `src/pages/rss.xml.ts`，共用的正文渲染逻辑在
`src/utils/feed.ts`。

Atom 的正文超过 `feedContentLimit`（默认 4000 字符，按 HTML 计）时会截断，
并在末尾附上「阅读全文」链接；设为 `0` 则输出全文。截断只在**顶层元素边界**
处发生，所以不会切出未闭合标签，也不会切在 `<pre>` 内部。这两个参数都在
`src/site.config.ts` 里。

## 路由结构

`astro.config.mjs` 里设了 `build.format: 'preserve'`，输出格式由源文件的路径决定：

| 源文件 | 产物 | 访问地址 |
|---|---|---|
| `pages/index.astro` | `index.html` | `/` |
| `pages/[uuid].astro` | `<uuid>.html` | `/<uuid>.html` |
| `pages/404.astro` | `404.html` | `/404.html` |
| `pages/about/index.astro` | `about/index.html` | `/about/` |
| `pages/categories/[category]/index.astro` | `categories/<名字>/index.html` | `/categories/<名字>/` |
| `pages/zh-cn/posts/[slug]/index.astro` | `zh-cn/posts/<slug>/index.html` | `/zh-cn/posts/<slug>/` |

文章路由特意放在根目录：默认的 `directory` 格式会把它输出成 `<uuid>/index.html`，
拿不到 `/<uuid>.html` 这种单文件。要新增带尾斜杠的路径，就用 `目录/index.astro` 的写法。

## 站点配置

站名、标语、导航、社交链接集中在 `src/site.config.ts`。

## 样式

设计令牌（颜色 / 字体 / 圆角）与正文排版都在 `src/styles/global.css`。
主题跟随系统，右上角可手动切换并记忆。

## 中文排版：赫蹏

正文接入了 [赫蹏（heti）](https://github.com/sivan/heti) 做中文排版增强，负责两件事：

- **中西文混排间距**——中英文、中数字之间自动留出 1/4 字空隙，不用手敲空格
- **全角标点挤压**——连续全角标点（如 `。”`）自动收窄

启用需要三件套同时到位，缺一不可：

1. `import 'heti/umd/heti.min.css'`（在 `src/layouts/BaseLayout.astro`，**必须排在
   `global.css` 之前**，这样同特异度的规则以本站设计系统为准）
2. 正文容器上的 `heti` 类（`<div class="prose heti">`）
3. `src/components/HetiEnhance.astro` 里的客户端脚本执行 `autoSpacing()`，
   它负责插入 `<heti-spacing>` / `<heti-adjacent>` 元素；这两个元素只有在 `.heti`
   容器内才有对应样式

脚本只在含正文的页面渲染，列表页不会加载它（压缩后约 10 KB）。长文遍历开销实测
在 50 ms 以内，仍放进了 `requestIdleCallback` 以免阻塞首屏。

`global.css` 末尾有一段「赫蹏适配」，把 heti 与本站布局系统冲突的**容器级**约束放开
（`max-width: 42em`、`hyphens: auto`、字形平滑、段落首行缩进），保留全部**文字级**增强。
若想让正文也跟随 heti 的连字符设定，删掉那几行即可。

## 迁移脚本

`scripts/migrate.mjs` 是一次性迁移脚本，把旧建站工具的 `mainlib.db`（元数据）与
`docs/<uuid>.md`（正文）合并成带 front matter 的 `src/content/` 内容：

```bash
pnpm migrate
```

它会重建全部文章，并打印分类分布、旧 URL 映射等汇总信息。`docs/` 与 `mainlib.db`
默认不入库（见 `.gitignore`），如果想把原始资料也纳入版本管理，删掉那两行即可。
