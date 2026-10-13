import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** 文章集合：由 scripts/migrate.mjs 从旧库迁移生成 */
const posts = defineCollection({
  loader: glob({
    base: './src/content/posts',
    pattern: '**/*.md',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().default(''),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    /** 是否显示右侧目录 */
    toc: z.boolean().default(false),
    /** 首页置顶 */
    pinned: z.boolean().default(false),
    /** 旧站 URL 的 slug，用于生成跳转页 */
    legacySlugs: z.array(z.string()).default([]),
  }),
});

/** 独立页面（目前只有关于页） */
const pages = defineCollection({
  loader: glob({
    base: './src/content/pages',
    pattern: '**/*.md',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
    date: z.coerce.date().optional(),
    /** 是否显示右侧目录 */
    toc: z.boolean().default(false),
  }),
});

export const collections = { posts, pages };
