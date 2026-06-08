import { ElementScrollNodeData } from '../models/nodes';
import { Result } from '../services/action';
import { CDPService } from '../services/cdp';
import { browser } from 'wxt/browser';

export default async function elementScroll(data: ElementScrollNodeData, id: string): Promise<Result<void>> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].id) {
      return { success: false, error: new Error('No active tab found') };
    }
    const tabId = tabs[0].id;

    const scrollY = data.scrollY || 0;
    const scrollX = data.scrollX || 0;
    const behavior = data.smooth ? 'smooth' : 'auto';

    if (!data.selector) {
      const expression = `window.scrollBy({ top: ${scrollY}, left: ${scrollX}, behavior: '${behavior}' })`;
      await CDPService.evaluate(tabId, expression);
      return { success: true, value: undefined };
    }

    const expression = `
      (() => {
        const elements = ${data.multiple ? `Array.from(document.querySelectorAll('${data.selector.replace(/'/g, "\\'")}'))` : `[document.querySelector('${data.selector.replace(/'/g, "\\'")}')]`};
        if (!elements[0]) return false;
        elements.forEach(el => el.scrollBy({ top: ${scrollY}, left: ${scrollX}, behavior: '${behavior}' }));
        return true;
      })();
    `;

    const success = await CDPService.evaluate(tabId, expression);

    if (!success) {
      return { success: false, error: new Error(`Element not found: ${data.selector}`) };
    }

    return { success: true, value: undefined };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
