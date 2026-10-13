import type { APIContext } from 'astro';
import { site } from '../site.config';
import { absolute, buildFeedEntries, formatAtomDate } from '../utils/feed';

/** XML 文本转义，用于标题等短字段 */
const esc = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** CDATA 包裹，正文里的裸 HTML 不必逐字符转义；顺带处理 ]]> 的边界 */
const cdata = (value: string): string =>
  `<![CDATA[${value.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;

export async function GET(context: APIContext) {
  const entries = await buildFeedEntries();

  const homeUrl = new URL('/', context.site ?? site.url).href;
  // 用最新一篇的时间而不是构建时刻，保证同样的内容构建结果稳定
  const updated = formatAtomDate(entries[0]?.updated ?? new Date());

  const items = entries
    .map((entry) => {
      const updatedAt = formatAtomDate(entry.updated);
      const lines = [
        '  <entry>',
        `    <title>${esc(entry.title)}</title>`,
        `    <link href="${esc(entry.link)}"/>`,
        `    <id>${esc(entry.link)}</id>`,
        `    <updated>${updatedAt}</updated>`,
        `    <published>${updatedAt}</published>`,
      ];

      if (entry.summary) lines.push(`    <summary>${esc(entry.summary)}</summary>`);
      for (const term of entry.categories) {
        lines.push(`    <category term="${esc(term)}"/>`);
      }

      lines.push(`    <content type="html">${cdata(entry.html)}</content>`);
      lines.push('  </entry>');
      return lines.join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${esc(site.title)}</title>
  <subtitle>${esc(site.tagline)}</subtitle>
  <link href="${esc(absolute('/atom.xml'))}" rel="self" type="application/atom+xml"/>
  <link href="${esc(homeUrl)}" rel="alternate" type="text/html"/>
  <id>${esc(homeUrl)}</id>
  <updated>${updated}</updated>
  <author>
    <name>${esc(site.author.name)}</name>
    <email>${esc(site.author.email)}</email>
  </author>
  <generator uri="https://astro.build">Astro</generator>
${items}
</feed>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
  });
}
