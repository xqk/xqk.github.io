import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { site } from '../site.config';
import { getSortedPosts, postHref } from '../utils/posts';

export async function GET(context: APIContext) {
  // 与 atom.xml 保持一致的条数上限
  const posts = (await getSortedPosts()).slice(0, site.feedLimit);

  return rss({
    title: site.title,
    description: site.description,
    site: context.site ?? site.url,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      link: postHref(post),
      categories: [...post.data.categories, ...post.data.tags],
    })),
    customData: '<language>zh-cn</language>',
  });
}
