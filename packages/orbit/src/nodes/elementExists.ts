import { ElementExistsNodeData } from '../models/nodes';
import { Result } from '../services/action';
import { CDPService } from '../services/cdp';
import { browser } from 'wxt/browser';

export default async function elementExists(data: ElementExistsNodeData): Promise<Result<boolean>> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].id) {
      return { success: false, error: new Error('No active tab found') };
    }
    const tabId = tabs[0].id;

    const expression = `!!document.querySelector('${data.selector.replace(/'/g, "\\'")}')`;
    
    // Basic wait logic
    let exists = false;
    const timeout = data.waitSelectorTimeout || 5000;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      exists = await CDPService.evaluate(tabId, expression);
      if (exists || !data.waitForSelector) break;
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return { success: true, value: exists };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
