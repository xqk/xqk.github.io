import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

const SITE_TZ = 'Asia/Shanghai';

const dayFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: SITE_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const cnFmt = new Intl.DateTimeFormat('zh-CN', {
  timeZone: SITE_TZ,
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

/** 2025-07-30 */
export const formatDate = (date: Date): string => dayFmt.format(date);

/** 2025 年 7 月 30 日 */
export const formatDateCN = (date: Date): string => cnFmt.format(date);

export const yearOf = (date: Date): number => Number(dayFmt.format(date).slice(0, 4));

/** 按日期倒序的全部文章 */
export async function getSortedPosts(): Promise<Post[]> {
  const posts = await getCollection('posts');
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** 粗估阅读时长（分钟）：中文按 400 字/分，西文按 220 词/分 */
export function readingMinutes(body: string | undefined): number {
  if (!body) return 1;
  const text = body.replace(/```[\s\S]*?```/g, ' ').replace(/<[^>]+>/g, ' ');
  const cjk = (text.match(/[\u3400-\u9fff]/g) ?? []).length;
  const words = (text.replace(/[\u3400-\u9fff]/g, ' ').match(/[A-Za-z0-9]+/g) ?? []).length;
  return Math.max(1, Math.ceil(cjk / 400 + words / 220));
}

/**
 * 文章链接。文件名即 URL：`src/content/posts/17356627257151.md`
 * 对应 `dist/17356627257151.html`，与旧站 www.icl.site 的约定一致。
 */
export const postHref = (post: Post): string => `/${post.id}.html`;

/** 按年份分组，年份倒序 */
export function groupByYear(posts: Post[]): Array<{ year: number; posts: Post[] }> {
  const map = new Map<number, Post[]>();
  for (const post of posts) {
    const year = yearOf(post.data.date);
    const bucket = map.get(year);
    if (bucket) bucket.push(post);
    else map.set(year, [post]);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, list]) => ({ year, posts: list }));
}

/** 统计分类与标签的出现次数 */
export function collectTerms(posts: Post[]): {
  categories: Array<{ name: string; count: number }>;
  tags: Array<{ name: string; count: number }>;
} {
  const categories = new Map<string, number>();
  const tags = new Map<string, number>();

  for (const post of posts) {
    for (const name of post.data.categories) {
      categories.set(name, (categories.get(name) ?? 0) + 1);
    }
    for (const name of post.data.tags) {
      tags.set(name, (tags.get(name) ?? 0) + 1);
    }
  }

  const toSorted = (map: Map<string, number>) =>
    [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

  return { categories: toSorted(categories), tags: toSorted(tags) };
}

/** 取某分类/标签下的全部文章（已倒序） */
export function filterPosts(posts: Post[], key: 'categories' | 'tags', name: string): Post[] {
  return posts.filter((post) => post.data[key].includes(name));
}
