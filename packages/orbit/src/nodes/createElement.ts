import { CreateElementNodeData } from '../models/nodes';
import { Result } from '../services/action';
import { CDPService } from '../services/cdp';
import { browser } from 'wxt/browser';

export default async function createElement(data: CreateElementNodeData, id: string): Promise<Result<void>> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].id) {
      return { success: false, error: new Error('No active tab found') };
    }
    const tabId = tabs[0].id;

    let position = 'beforeend';
    switch (data.insertType) {
      case 'append': position = 'beforeend'; break;
      case 'prepend': position = 'afterbegin'; break;
      case 'before': position = 'beforebegin'; break;
      case 'after': position = 'afterend'; break;
    }

    const expression = `
      (() => {
        const elements = ${data.multiple ? `Array.from(document.querySelectorAll('${data.selector.replace(/'/g, "\\'")}'))` : `[document.querySelector('${data.selector.replace(/'/g, "\\'")}')]`};
        if (!elements[0]) return false;
        elements.forEach(el => el.insertAdjacentHTML('${position}', \`${data.html.replace(/`/g, "\\`")}\`));
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
