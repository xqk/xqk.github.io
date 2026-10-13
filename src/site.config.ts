/**
 * 站点全局配置。改这里就能改站名、标语、导航和社交链接，不用动组件。
 */
export const site = {
  /**
   * 站点规范地址。本仓库配的自定义域名是 www.icl.site，xqk.github.io 会 301 跳过来，
   * 所以这里必须是 www.icl.site，否则 canonical / sitemap / feed 会指向一个跳转地址。
   * 改动时记得同步 astro.config.mjs 的 `site`（sitemap 集成读的是那个）。
   */
  url: 'https://www.icl.site',
  /** 顶栏 logo 前缀标记 */
  mark: 'ICL::',
  /** 站点标题 */
  title: '谋生者 ICL',
  /** 首页标语 */
  tagline: '心向己，万事轻。',
  /** SEO 描述 */
  description: '心向己，万事轻。个人博客：生活记录、经验日志与读书随想。',
  /** 建站年份，用于页脚版权区间 */
  since: 2017,

  author: {
    name: 'xqk',
    email: 'xiaqiankun@outlook.com',
    url: 'https://www.icl.site',
  },

  /** 顶部导航 */
  nav: [
    { label: '文章', href: '/posts/' },
    { label: '分类', href: '/categories/' },
    { label: '标签', href: '/tags/' },
    { label: '关于', href: '/about/' },
  ],

  /** 首页与页脚的社交链接 */
  social: [
    { label: 'GitHub', href: 'https://github.com/xqk', icon: 'github' },
    { label: 'Email', href: 'mailto:xiaqiankun@outlook.com', icon: 'mail' },
  ],

  /** 每页文章数 */
  pageSize: 10,

  /** feed（atom.xml / rss.xml）包含的最近文章数，带全文不宜过长 */
  feedLimit: 20,

  /**
   * feed 正文的字符预算（按渲染后的 HTML 计）。超出部分会截断并附上原文链接，
   * 仅在顶层元素边界处切，不会破坏结构。设为 0 表示不截断。
   */
  feedContentLimit: 4000,
} as const;

export type Site = typeof site;
