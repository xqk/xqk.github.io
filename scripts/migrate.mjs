#!/usr/bin/env node
/**
 * 一次性迁移脚本（路线 A）
 *
 * 输入：
 *   - mainlib.db           旧建站工具的 SQLite 库（元数据：日期 / 分类 / 标签）
 *   - docs/<uuid>.md       正文，无 front matter，标题取首个 `# H1`
 *   - scripts/legacy-slugs.json  旧站文章 slug（用于生成旧链接跳转）
 *
 * 输出：
 *   - src/content/posts/<uuid>.md   带 front matter 的文章（文件名即 URL 片段）
 *   - src/content/pages/about.md    关于页（来自 type=1 的 README）
 *
 * 迁移后 markdown 成为唯一数据源，站点构建不再依赖 SQLite。
 */
import { DatabaseSync } from 'node:sqlite';
import { rmSync } from 'node:fs';
import {
  mkdirSync,
  readdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const DB_PATH = path.join(ROOT, 'mainlib.db');
const OUT_POSTS = path.join(ROOT, 'src', 'content', 'posts');
const OUT_PAGES = path.join(ROOT, 'src', 'content', 'pages');
const LEGACY_JSON = path.join(ROOT, 'scripts', 'legacy-slugs.json');

/** 关于页：旧库里 type=1 的 README */
const ABOUT_UUID = '17560012442149';

/**
 * 个别文章在新旧库里标题不同，无法靠标题自动对上旧 URL，这里手工兜底。
 * key 是正文里的 H1 标题，value 是旧站的 slug 列表。
 */
const MANUAL_ALIASES = {
  '读《活法》': ['2023-12-30-hui-fa-du-shu-bi-ji'],
};

/**
 * 旧编辑器里的自定义高亮标记 -> 语义标签。
 * 这几个不是标准 HTML，映射后由 global.css 接管样式。
 */
const INLINE_MARKUP = {
  um: '<mark class="mk mk-note">', // 长句强调
  b: '<strong class="mk mk-bold">', // 加粗
  u: '<em class="mk mk-em">', // 强调
  h: '<mark class="mk mk-hl">', // 高亮
  c: '<code class="mk mk-code">', // 行内代码
};
const CLOSING_MARKUP = {
  um: '</mark>',
  b: '</strong>',
  u: '</em>',
  h: '</mark>',
  c: '</code>',
};

const pad = (n) => String(n).padStart(2, '0');

/** unix 秒 -> 带 +08:00 偏移的 ISO 时间串 */
function formatDate(unixSeconds) {
  const d = new Date((unixSeconds + 8 * 3600) * 1000);
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+08:00`
  );
}

const datePrefix = (unixSeconds) => formatDate(unixSeconds).slice(0, 10);

/** markdown -> 纯文本，用于生成摘要 */
function toPlainText(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+.*$/gm, ' ')
    .replace(/^>\s?/gm, ' ')
    .replace(/^[-*+]\s+/gm, ' ')
    .replace(/[*_~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const truncate = (text, max = 120) =>
  text.length <= max ? text : `${text.slice(0, max).trimEnd()}…`;

/** 把正文里的自定义标记换成标准 HTML */
function convertInlineMarkup(md) {
  return md.replace(/<(\/?)x(um|b|u|h|c)>/g, (_, closing, tag) =>
    closing ? CLOSING_MARKUP[tag] : INLINE_MARKUP[tag],
  );
}

/** YAML 字符串：JSON 字符串是合法的 YAML 标量，直接借用可省去转义烦恼 */
const yamlStr = (value) => JSON.stringify(value);

function frontMatter(fields) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) lines.push(`  - ${yamlStr(item)}`);
      }
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: ${yamlStr(value)}`);
    }
  }
  lines.push('---', '');
  return lines.join('\n');
}

/** 统计正文里 h2/h3 数量，用于决定是否显示目录 */
const countHeadings = (md) => (md.match(/^#{2,3}\s+\S/gm) || []).length;

function main() {
  if (!existsSync(DB_PATH)) throw new Error(`找不到数据库：${DB_PATH}`);
  if (!existsSync(DOCS_DIR)) throw new Error(`找不到正文目录：${DOCS_DIR}`);

  const db = new DatabaseSync(DB_PATH, { readOnly: true });

  // ---- 分类树（只保留 catType=13 的真实分类，跳过站点根与导入来源）----
  const cats = db.prepare('SELECT id, pid, uuid, name, catType FROM cat').all();
  const catByUuid = new Map(cats.map((c) => [c.uuid, c]));

  /** 自底向上拼出分类路径，如 [日常记录, 日记] */
  function categoryPath(catUuid) {
    const chain = [];
    let node = catByUuid.get(catUuid);
    const seen = new Set();
    while (node && !seen.has(node.uuid)) {
      seen.add(node.uuid);
      if (node.catType === 13) chain.unshift(node.name);
      node = node.pid ? catByUuid.get(node.pid) : null;
    }
    return chain;
  }

  const articles = db
    .prepare('SELECT uuid, type, dateArt, isTop FROM article ORDER BY dateArt ASC')
    .all();

  const catLinksOf = db.prepare('SELECT rid FROM cat_article WHERE aid = ?');
  const tagLinksOf = db.prepare(
    `SELECT t.name AS name FROM tag_article ta
     JOIN tag t ON t.uuid = ta.rid
     WHERE ta.aid = ?`,
  );

  // 旧站 slug：标题 -> slug，用于给对应文章附上 legacySlugs
  const legacyByTitle = new Map(
    existsSync(LEGACY_JSON)
      ? JSON.parse(readFileSync(LEGACY_JSON, 'utf8')).map((r) => [r.title, r.slug])
      : [],
  );

  // 清空输出目录，保证可重复执行
  for (const dir of [OUT_POSTS, OUT_PAGES]) {
    mkdirSync(dir, { recursive: true });
    for (const f of readdirSync(dir)) {
      if (f.endsWith('.md')) rmSync(path.join(dir, f));
    }
  }

  const report = [];
  const warnings = [];

  for (const article of articles) {
    const srcFile = path.join(DOCS_DIR, `${article.uuid}.md`);
    if (!existsSync(srcFile)) {
      warnings.push(`DB 中有记录但缺少正文：${article.uuid}.md`);
      continue;
    }

    const raw = readFileSync(srcFile, 'utf8').replace(/\r\n/g, '\n');

    // 标题 = 首个 H1；正文里去掉这一行（标题改由模板渲染）
    const h1 = raw.match(/^#\s+(.+?)\s*$/m);
    if (!h1) {
      warnings.push(`正文缺少 H1 标题，已跳过：${article.uuid}.md`);
      continue;
    }
    const title = h1[1].trim();
    let body = raw.slice(h1.index + h1[0].length).replace(/^\n+/, '');

    body = convertInlineMarkup(body);

    // [TOC] 占位符 -> toc 开关
    const hadTocPlaceholder = /^\s*\[TOC\]\s*$/m.test(body);
    body = body.replace(/^\s*\[TOC\]\s*$\n?/gm, '');

    // <!-- more --> 之前的文字作为摘要
    let excerpt = '';
    const moreIndex = body.search(/<!--\s*more\s*-->/i);
    if (moreIndex !== -1) {
      excerpt = toPlainText(body.slice(0, moreIndex));
      body = body.replace(/<!--\s*more\s*-->/i, '');
    }
    if (excerpt.replace(/\s/g, '').length < 12) {
      excerpt = toPlainText(body);
    }
    const description = truncate(excerpt);

    body = body.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';

    // ---- 分类与标签 ----
    let categories = [];
    for (const { rid } of catLinksOf.all(article.uuid)) {
      const candidate = categoryPath(rid);
      if (candidate.length > categories.length) categories = candidate;
    }
    const tags = tagLinksOf.all(article.uuid).map((r) => r.name);

    const legacySlugs = [
      ...(legacyByTitle.has(title) ? [legacyByTitle.get(title)] : []),
      ...(MANUAL_ALIASES[title] ?? []),
    ];

    // ---- 文件名即 URL：沿用旧库的 uuid 命名，与 www.icl.site 的 /{uuid}.html 约定一致 ----
    const slug = String(article.uuid);

    // uuid 在库里是 INTEGER，比较前统一成字符串
    const isAbout = slug === ABOUT_UUID;
    const fields = {
      title: isAbout ? '关于' : title,
      date: formatDate(article.dateArt),
      description,
      categories,
      tags,
      toc: countHeadings(body) >= 4 || hadTocPlaceholder,
    };
    if (legacySlugs.length) fields.legacySlugs = legacySlugs;
    if (article.isTop) fields.pinned = true;

    const target = isAbout
      ? path.join(OUT_PAGES, 'about.md')
      : path.join(OUT_POSTS, `${slug}.md`);
    writeFileSync(target, frontMatter(fields) + body, 'utf8');

    report.push({
      uuid: article.uuid,
      title: fields.title,
      slug: path.relative(ROOT, target).replace(/^src\/content\//, ''),
      date: datePrefix(article.dateArt),
      categories,
      tags,
      legacy: legacySlugs.join(','),
      kind: isAbout ? 'page' : 'post',
    });
  }

  db.close();

  // ---- 汇总 ----
  const byCategory = new Map();
  for (const r of report) {
    const key = r.categories[0] || '(未分类)';
    byCategory.set(key, (byCategory.get(key) || 0) + 1);
  }

  console.log(`\n迁移完成：${report.length} 条`);
  console.log(`  文章 ${report.filter((r) => r.kind === 'post').length} 篇`);
  console.log(`  独立页 ${report.filter((r) => r.kind === 'page').length} 个`);
  console.log('\n栏目分布：');
  for (const [name, n] of [...byCategory].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${name.padEnd(8, ' ')} ${n}`);
  }

  const tagged = report.filter((r) => r.tags.length);
  console.log(`\n带标签文章：${tagged.length} 篇`);
  const withLegacy = report.filter((r) => r.legacy);
  console.log(`关联旧 URL：${withLegacy.length} 篇`);
  for (const r of withLegacy) console.log(`  ${r.legacy}  ->  ${r.slug}`);

  if (warnings.length) {
    console.log('\n警告：');
    for (const w of warnings) console.log(`  - ${w}`);
  }

  console.log('\n明细：');
  for (const r of report) {
    console.log(
      `  ${r.date}  ${r.slug.padEnd(52, ' ')} [${r.categories.join(' / ') || '未分类'}]${
        r.tags.length ? ` #${r.tags.join(' #')}` : ''
      }`,
    );
  }
}

main();
