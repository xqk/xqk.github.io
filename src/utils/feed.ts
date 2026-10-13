import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { render } from 'astro:content';
import { site } from '../site.config';
import { getSortedPosts, postHref, type Post } from './posts';

export interface FeedEntry {
  title: string;
  link: string;
  updated: Date;
  summary: string;
  /** 正文渲染后的 HTML（可能已按预算截断），供 Atom 的 <content type="html"> 使用 */
  html: string;
  /** 正文是否被截断 */
  truncated: boolean;
  categories: string[];
}

/** 把站内路径补成绝对地址，feed 里必须是绝对 URL */
export const absolute = (pathname: string): string => new URL(pathname, site.url).href;

/**
 * 图表代码块在正文里是 `<script type="text/plain" data-diagram="…">` 占位，
 * 由浏览器端脚本渲染。feed 里没有这个脚本，留着只会把 mermaid / echarts
 * 源码当正文显示，所以剔除。
 */
const stripDiagramPlaceholders = (html: string): string =>
  html.replace(/<script[^>]*data-diagram="[a-z]+"[^>]*>[\s\S]*?<\/script>/g, '');

/** HTML 里不参与嵌套计数的空元素 */
const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);

/**
 * 按字符预算截断渲染后的 HTML。
 *
 * 只在**顶层元素结束之后**切，所以切点必然是合法的元素边界，不会产生未闭合标签，
 * 也不会切在 `<pre>` 内部。若第一个顶层元素就超出预算，则退化为保留它。
 */
export function truncateHtml(html: string, budget: number): { html: string; truncated: boolean } {
  if (html.length <= budget) return { html, truncated: false };

  const tagRe = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  let depth = 0;
  let lastCut = -1;
  let firstCut = -1;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(html)) !== null) {
    const [raw, slash, name] = match;
    const tag = name.toLowerCase();
    const selfClosing = slash === '/' || VOID_TAGS.has(tag) || /\/\s*>$/.test(raw);
    const end = match.index + raw.length;

    if (slash === '/') {
      depth = Math.max(0, depth - 1);
      if (depth === 0) {
        if (firstCut === -1) firstCut = end;
        if (end <= budget) lastCut = end;
      }
    } else if (!selfClosing) {
      depth += 1;
    }
  }

  // 没有任何完整的顶层元素就不截，宁可给全文也不给残缺结构
  const cut = lastCut !== -1 ? lastCut : firstCut;
  if (cut === -1) return { html, truncated: false };

  return { html: html.slice(0, cut), truncated: true };
}

/** Atom 要求 RFC 3339 时间，这里输出站点的 +08:00 本地时间 */
export function formatAtomDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const at = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  // en-CA 在午夜可能给出 "24"，规范化为 "00"
  const hour = at('hour') === '24' ? '00' : at('hour');

  return `${at('year')}-${at('month')}-${at('day')}T${hour}:${at('minute')}:${at('second')}+08:00`;
}

/**
 * 按时间倒序生成 feed 条目，只取最近 {@link site.feedLimit} 篇——
 * 带全文的 feed 不宜过长，这一点与旧站 atom.xml 的做法一致。
 *
 * 正文超过 {@link site.feedContentLimit} 个字符时截断并附上原文链接，
 * 避免单篇长文把 feed 撑到几百 KB。
 */
export async function buildFeedEntries(posts?: Post[]): Promise<FeedEntry[]> {
  const list = (posts ?? (await getSortedPosts())).slice(0, site.feedLimit);
  const container = await AstroContainer.create();

  const entries: FeedEntry[] = [];
  for (const post of list) {
    const { Content } = await render(post);
    const rendered = await container.renderToString(Content);
    const link = absolute(postHref(post));

    const full = stripDiagramPlaceholders(rendered).trim();
    // feedContentLimit 为 0 表示不截断
    const { html, truncated } =
      site.feedContentLimit > 0
        ? truncateHtml(full, site.feedContentLimit)
        : { html: full, truncated: false };

    entries.push({
      title: post.data.title,
      link,
      updated: post.data.date,
      summary: post.data.description,
      html: truncated ? `${html}\n<p><a href="${link}">阅读全文 →</a></p>` : html,
      truncated,
      categories: [...post.data.categories, ...post.data.tags],
    });
  }

  return entries;
}
