import { BrowserEventNodeData, NodeType, Result } from './types';
import { browser } from 'wxt/browser';

export const browserEventNode: NodeType<BrowserEventNodeData> = {
  id: 'nodes:browser-event',
  name: 'browserEvent',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    return new Promise((resolve) => {
      let timeoutId: ReturnType<typeof setTimeout>;

      const listener = (tabId: number, changeInfo: any) => {
        if (changeInfo.status === 'complete') {
          browser.tabs.onUpdated.removeListener(listener);
          if (timeoutId) clearTimeout(timeoutId);
          resolve({ success: true, data: undefined });
        }
      };

      browser.tabs.onUpdated.addListener(listener);

      if (data.timeout && data.timeout > 0) {
        timeoutId = setTimeout(() => {
          browser.tabs.onUpdated.removeListener(listener);
          resolve({ success: false, error: `Browser event timed out after ${data.timeout}ms` });
        }, data.timeout);
      }
    });
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
