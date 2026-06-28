import { LinkNodeData, NodeType, Result } from './types';
import { browser } from 'wxt/browser';

export const linkNode: NodeType<LinkNodeData> = {
  id: 'nodes:link',
  name: 'link',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    
    const expression = `
      (() => {
        const elements = ${data.multiple ? `Array.from(document.querySelectorAll('${data.selector.replace(/'/g, "\\'")}'))` : `[document.querySelector('${data.selector.replace(/'/g, "\\'")}')]`};
        if (!elements[0]) return null;
        return elements.map(el => el.href || el.getAttribute('href') || '');
      })();
    `;

    const hrefs = await context.browser.evaluate( expression);

    if (!hrefs) {
      return { success: false, error: String(new Error(`Element not found: ${data.selector}`)) };
    }

    if (data.action === 'get') {
      // Store result in context if needed
      return { success: true, data: undefined };
    } else if (data.action === 'open') {
      const tab = await browser.tabs.get(context.browser.getTabId());
      for (const href of hrefs) {
        if (href) {
          const absoluteUrl = new URL(href, tab.url).href;
          await browser.tabs.create({ url: absoluteUrl });
        }
      }
      return { success: true, data: undefined };
    }

    return { success: false, error: String(new Error('Invalid action')) };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
