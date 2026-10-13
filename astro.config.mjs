// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';

/**
 * Astro 7 默认的 Markdown 处理器是 Sätteri，它不认识 ```mermaid / ```echarts
 * 这两种围栏，会把语言名降级成 plaintext，前端就无从分辨。
 *
 * 这里改用官方推荐的 unified 处理器，在语言信息还在时把图表代码块换成占位元素，
 * 由 src/components/Scripts.astro 在浏览器里渲染成真正的图表。
 *
 * 用 <script type="text/plain"> 承载源码而不是普通 div：按 CommonMark，
 * script 是 HTML block type 1，可以安全包含空行；浏览器也不会执行 text/plain 的脚本。
 *
 * @type {import('@astrojs/markdown-remark').RemarkPlugin}
 */
const remarkDiagramBlocks = () => (tree) => {
  const SUPPORTED = new Set(['mermaid', 'echarts']);

  /**
   * 递归遍历 mdast。这里刻意用宽松类型——插件只关心 type / lang / value / children，
   * 为它引入完整 mdast 联合类型不划算。
   * @param {{ children?: any[] }} parent
   */
  const walk = (parent) => {
    if (!Array.isArray(parent.children)) return;

    parent.children = parent.children.map((node) => {
      const lang = typeof node.lang === 'string' ? node.lang.toLowerCase() : '';

      if (node.type === 'code' && SUPPORTED.has(lang)) {
        const payload = String(node.value ?? '').replace(/<\/script/gi, '<\\/script');
        return {
          type: 'html',
          value: `<script type="text/plain" data-diagram="${lang}">\n${payload}\n</script>`,
        };
      }

      walk(node);
      return node;
    });
  };

  walk(tree);
};

export default defineConfig({
  site: 'https://xqk.github.io',
  integrations: [
    sitemap({
      /*
       * `preserve` 下文章路由是 `/[uuid]`，实际产物是 `/<uuid>.html`，
       * 而 sitemap 集成按路由路径输出，会漏掉扩展名。这里把「根目录下不带扩展名的
       * 单段路径」补回 `.html`，与 canonical、RSS 保持一致，避免同一页面出现两个地址。
       */
      serialize(item) {
        const url = new URL(item.url);
        const segments = url.pathname.split('/').filter(Boolean);
        const last = segments.at(-1) ?? '';
        if (segments.length === 1 && !last.includes('.')) {
          url.pathname = `/${last}.html`;
        }
        return { ...item, url: url.href };
      },
    }),
  ],
  build: {
    /*
     * 默认的 directory 格式会把 `src/pages/[uuid].astro` 输出成 `<uuid>/index.html`，
     * 拿不到旧站那种根目录下的 `/<uuid>.html`。preserve 会按源文件路径决定输出：
     * 非 index 的路由（[uuid].astro、404.astro）落成单文件 .html，
     * index.astro 仍然落成目录 + index.html，因此 /about/、/posts/ 这类路径不受影响。
     */
    format: 'preserve',
  },
  markdown: {
    processor: unified({ remarkPlugins: [remarkDiagramBlocks] }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: true,
    },
  },
});
