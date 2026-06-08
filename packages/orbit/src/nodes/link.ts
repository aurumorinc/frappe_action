import { LinkNodeData } from '../models/nodes';
import { Result } from '../services/action';
import { CDPService } from '../services/cdp';
import { browser } from 'wxt/browser';

export default async function link(data: LinkNodeData, id: string): Promise<Result<string | string[] | void>> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].id) {
      return { success: false, error: new Error('No active tab found') };
    }
    const tabId = tabs[0].id;

    const expression = `
      (() => {
        const elements = ${data.multiple ? `Array.from(document.querySelectorAll('${data.selector.replace(/'/g, "\\'")}'))` : `[document.querySelector('${data.selector.replace(/'/g, "\\'")}')]`};
        if (!elements[0]) return null;
        return elements.map(el => el.href || el.getAttribute('href') || '');
      })();
    `;

    const hrefs = await CDPService.evaluate(tabId, expression);

    if (!hrefs) {
      return { success: false, error: new Error(`Element not found: ${data.selector}`) };
    }

    if (data.action === 'get') {
      return { success: true, value: data.multiple ? hrefs : hrefs[0] };
    } else if (data.action === 'open') {
      for (const href of hrefs) {
        if (href) {
          const absoluteUrl = new URL(href, tabs[0].url).href;
          await browser.tabs.create({ url: absoluteUrl });
        }
      }
      return { success: true, value: undefined };
    }

    return { success: false, error: new Error('Invalid action') };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
