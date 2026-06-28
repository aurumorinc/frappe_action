declare module '@/lib/query-selector-shadow-dom' {
  export function querySelectorAllDeep(selector: string, root?: Document | Element): Element[];
  export function querySelectorDeep(selector: string, root?: Document | Element): Element | null;
}
