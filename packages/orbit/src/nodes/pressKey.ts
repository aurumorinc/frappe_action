import { PressKeyNodeData } from '../models/nodes';
import { Result } from '../services/action';
import { CDPService } from '../services/cdp';
import { browser } from 'wxt/browser';

export default async function pressKey(data: PressKeyNodeData, id: string): Promise<Result<void>> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].id) {
      return { success: false, error: new Error('No active tab found') };
    }
    const tabId = tabs[0].id;

    if (data.selector) {
      // Focus the element first
      const expression = `
        (() => {
          const el = document.querySelector('${data.selector.replace(/'/g, "\\'")}');
          if (el && typeof el.focus === 'function') {
            el.focus();
            return true;
          }
          return false;
        })();
      `;
      await CDPService.evaluate(tabId, expression);
    }

    let modifiers = 0;
    if (data.modifiers) {
      if (data.modifiers.includes('alt')) modifiers |= 1;
      if (data.modifiers.includes('ctrl')) modifiers |= 2;
      if (data.modifiers.includes('meta')) modifiers |= 4;
      if (data.modifiers.includes('shift')) modifiers |= 8;
    }

    // Send keyDown
    await CDPService.sendCommand(tabId, 'Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: data.key,
      modifiers
    });

    // Send keyUp
    await CDPService.sendCommand(tabId, 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: data.key,
      modifiers
    });

    return { success: true, value: undefined };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
