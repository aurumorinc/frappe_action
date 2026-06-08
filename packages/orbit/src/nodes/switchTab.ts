import { SwitchTabNodeData } from '../models/nodes';
import { Result } from '../services/action';
import { browser } from 'wxt/browser';

export default async function switchTab(data: SwitchTabNodeData): Promise<Result<void>> {
  try {
    const tabs = await browser.tabs.query({ url: data.matchPattern });

    if (tabs && tabs.length > 0 && tabs[0].id) {
      await browser.tabs.update(tabs[0].id, { active: true });
      
      // Also focus the window if it's not the current one
      if (tabs[0].windowId) {
        await browser.windows.update(tabs[0].windowId, { focused: true });
      }
      
      return { success: true, value: undefined };
    } else if (data.createIfNoMatch) {
      // If matchPattern is a valid URL, we can create it.
      // Otherwise, we might just create an empty tab or fail.
      // Assuming matchPattern is a URL for this simple implementation.
      const urlToCreate = data.matchPattern.replace(/\*/g, ''); // Very basic cleanup
      await browser.tabs.create({ url: urlToCreate, active: true });
      return { success: true, value: undefined };
    }

    return { success: false, error: new Error(`No tab found matching pattern: ${data.matchPattern}`) };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
