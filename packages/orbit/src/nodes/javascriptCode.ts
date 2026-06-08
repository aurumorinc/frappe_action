import { JavascriptCodeNodeData } from '../models/nodes';
import { Result } from '../services/action';
import { CDPService } from '../services/cdp';
import { browser } from 'wxt/browser';

export default async function javascriptCode(data: JavascriptCodeNodeData): Promise<Result<any>> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].id) {
      return { success: false, error: new Error('No active tab found') };
    }
    const tabId = tabs[0].id;

    const expression = `
      (async () => {
        ${data.code}
      })();
    `;

    const executeCode = CDPService.evaluate(tabId, expression);

    if (data.timeout && data.timeout > 0) {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('JavaScript execution timed out')), data.timeout);
      });
      
      const result = await Promise.race([executeCode, timeoutPromise]);
      return { success: true, value: result };
    }

    const result = await executeCode;
    return { success: true, value: result };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
