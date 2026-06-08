import { AttributeValueNodeData } from '../models/nodes';
import { Result } from '../services/action';
import { CDPService } from '../services/cdp';
import { browser } from 'wxt/browser';

export default async function attributeValue(data: AttributeValueNodeData, id: string): Promise<Result<string | string[] | void>> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].id) {
      return { success: false, error: new Error('No active tab found') };
    }
    const tabId = tabs[0].id;

    if (data.action === 'get') {
      const expression = `
        (() => {
          const elements = ${data.multiple ? `Array.from(document.querySelectorAll('${data.selector.replace(/'/g, "\\'")}'))` : `[document.querySelector('${data.selector.replace(/'/g, "\\'")}')]`};
          if (!elements[0]) return null;
          return elements.map(el => el.getAttribute('${data.attributeName.replace(/'/g, "\\'")}') || '');
        })();
      `;
      const result = await CDPService.evaluate(tabId, expression);
      if (!result) return { success: false, error: new Error(`Element not found: ${data.selector}`) };
      return { success: true, value: data.multiple ? result : result[0] };
    } else if (data.action === 'set' && data.attributeValue !== undefined) {
      const expression = `
        (() => {
          const elements = ${data.multiple ? `Array.from(document.querySelectorAll('${data.selector.replace(/'/g, "\\'")}'))` : `[document.querySelector('${data.selector.replace(/'/g, "\\'")}')]`};
          if (!elements[0]) return false;
          elements.forEach(el => el.setAttribute('${data.attributeName.replace(/'/g, "\\'")}', '${data.attributeValue!.replace(/'/g, "\\'")}'));
          return true;
        })();
      `;
      const success = await CDPService.evaluate(tabId, expression);
      if (!success) return { success: false, error: new Error(`Element not found: ${data.selector}`) };
      return { success: true, value: undefined };
    }

    return { success: false, error: new Error('Invalid action or missing attributeValue') };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
