/**
 * heti 没有随包提供类型声明，这里补一份最小声明，只覆盖本站实际用到的接口。
 */
declare module 'heti/js/heti-addon.js' {
  export default class Heti {
    constructor(rootSelector?: string);
    /** 遍历 `.heti` 容器，按需插入中西文间距与标点挤压所需的行内元素 */
    autoSpacing(): void;
    /** 与 autoSpacing 同源，作用于指定的元素列表 */
    spacingElements(elementList: Iterable<Element>): void;
    spacingElement(element: Element): void;
  }
}
