import { VerifySelectorNodeData } from '../models/nodes';
import { Result } from '../services/action';
import { CDPService } from '../services/cdp';
import { browser } from 'wxt/browser';

export default async function verifySelector(data: VerifySelectorNodeData): Promise<Result<boolean>> {
  try {
    if (!data.selector) {
      return { success: true, value: false };
    }

    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].id) {
      return { success: false, error: new Error('No active tab found') };
    }
    const tabId = tabs[0].id;

    const expression = `
      (() => {
        try {
          document.querySelector('${data.selector.replace(/'/g, "\\'")}');
          return true;
        } catch (e) {
          return false;
        }
      })();
    `;

    const isValid = await CDPService.evaluate(tabId, expression);
    return { success: true, value: isValid };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
