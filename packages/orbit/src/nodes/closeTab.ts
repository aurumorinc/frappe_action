import { CloseTabNodeData } from '../models/nodes';
import { Result } from '../services/action';
import { browser } from 'wxt/browser';

export default async function closeTab(data: CloseTabNodeData): Promise<Result<void>> {
  try {
    if (data.closeType === 'window') {
      if (data.allWindows) {
        const windows = await browser.windows.getAll();
        await Promise.all(windows.map(w => w.id ? browser.windows.remove(w.id) : Promise.resolve()));
      } else {
        const currentWindow = await browser.windows.getCurrent();
        if (currentWindow.id) {
          await browser.windows.remove(currentWindow.id);
        }
      }
    } else {
      // Close tab
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs.length > 0 && tabs[0].id) {
        await browser.tabs.remove(tabs[0].id);
      }
    }

    return { success: true, value: undefined };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
