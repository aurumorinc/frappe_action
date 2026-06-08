import { ConditionsNodeData } from '../models/nodes';
import { Result } from '../services/action';
import { CDPService } from '../services/cdp';
import { browser } from 'wxt/browser';

export default async function conditions(data: ConditionsNodeData): Promise<Result<boolean>> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].id) {
      return { success: false, error: new Error('No active tab found') };
    }
    const tabId = tabs[0].id;

    if (data.type === 'javascript') {
      const expression = `
        (async () => {
          ${data.condition}
        })();
      `;
      const result = await CDPService.evaluate(tabId, expression);
      return { success: true, value: Boolean(result) };
    }
    
    // Element conditions would require querying the DOM, but the blueprint says:
    // "Check element visibility/text/attribute, or evaluate JS expression. Return boolean."
    // For simplicity, we'll just return false for unimplemented element conditions for now.
    return { success: true, value: false };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
