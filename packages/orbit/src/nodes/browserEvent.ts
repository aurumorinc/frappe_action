import { BrowserEventNodeData } from '../models/nodes';
import { Result } from '../services/action';
import { browser } from 'wxt/browser';

export default async function browserEvent(data: BrowserEventNodeData): Promise<Result<void>> {
  try {
    return new Promise((resolve) => {
      let timeoutId: ReturnType<typeof setTimeout>;

      const listener = (tabId: number, changeInfo: any) => {
        if (changeInfo.status === 'complete') {
          browser.tabs.onUpdated.removeListener(listener);
          if (timeoutId) clearTimeout(timeoutId);
          resolve({ success: true, value: undefined });
        }
      };

      browser.tabs.onUpdated.addListener(listener);

      if (data.timeout && data.timeout > 0) {
        timeoutId = setTimeout(() => {
          browser.tabs.onUpdated.removeListener(listener);
          resolve({ success: false, error: new Error(`Browser event timed out after ${data.timeout}ms`) });
        }, data.timeout);
      }
    });
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
