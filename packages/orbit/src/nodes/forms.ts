import { FormsNodeData } from '../models/nodes';
import { Result } from '../services/action';
import { CDPService } from '../services/cdp';
import { GhostCursor } from '../lib/ghost-cursor/spoof';
import { MarkovTyper } from '../lib/human-typing/typer';
import { browser } from 'wxt/browser';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default async function forms(data: FormsNodeData, id: string): Promise<Result<void>> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].id) {
      return { success: false, error: new Error('No active tab found') };
    }
    const tabId = tabs[0].id;

    const box = await CDPService.getBoundingBox(tabId, data.selector);
    if (!box) {
      return { success: false, error: new Error(`Element not found: ${data.selector}`) };
    }

    const cursor = new GhostCursor(tabId);
    
    // Move to the element and click to focus
    await cursor.click(box);

    if (data.type === 'text') {
      if (data.clearValue) {
        // Select all and delete
        await CDPService.sendCommand(tabId, 'Input.dispatchKeyEvent', { type: 'keyDown', commands: ['SelectAll'] });
        await CDPService.sendCommand(tabId, 'Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace' });
        await CDPService.sendCommand(tabId, 'Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace' });
      }

      if (data.value) {
        const typer = new MarkovTyper(data.value);
        const { history } = typer.run();

        for (const event of history) {
          await delay(event.delayMs);
          
          if (event.action === 'BACKSPACE') {
            await CDPService.sendCommand(tabId, 'Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace' });
            await CDPService.sendCommand(tabId, 'Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace' });
          } else if (event.char) {
            await CDPService.sendCommand(tabId, 'Input.dispatchKeyEvent', { type: 'keyDown', text: event.char });
            await CDPService.sendCommand(tabId, 'Input.dispatchKeyEvent', { type: 'keyUp', text: event.char });
          }
        }
      }
    } else {
      // For select, checkbox, radio, we might still need to use DOM manipulation
      // because CDP doesn't easily select options by value without complex DOM traversal.
      // We can send a message to the content script to handle the non-text inputs.
      await browser.tabs.sendMessage(tabId, {
        type: 'HANDLE_NON_TEXT_FORM',
        payload: { data, id }
      });
    }

    if (data.submitForm) {
      await CDPService.sendCommand(tabId, 'Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter' });
      await CDPService.sendCommand(tabId, 'Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter' });
    }

    return { success: true, value: undefined };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
