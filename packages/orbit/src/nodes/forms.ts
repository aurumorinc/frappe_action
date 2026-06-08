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
    } else if (data.type === 'checkbox' || data.type === 'radio') {
      // For checkbox and radio, the initial click() above already toggled it.
      // However, if we need to set it to a specific state based on data.value (e.g., "true" or "false"),
      // we should check its current state first.
      if (data.value !== undefined) {
        const targetState = data.value === 'true';
        const currentState = await CDPService.evaluate(tabId, `document.querySelector('${data.selector.replace(/'/g, "\\'")}').checked`);
        
        if (currentState !== targetState) {
          // Click again to toggle to the desired state
          await cursor.click(box);
        }
      }
    } else if (data.type === 'select') {
      // For select, we already clicked it to open the dropdown.
      // Now we need to find the option and click it.
      if (data.value) {
        // Wait a bit for the dropdown to render
        await delay(300);
        
        // Find the option element's bounding box
        const optionExpression = `
          (() => {
            const select = document.querySelector('${data.selector.replace(/'/g, "\\'")}');
            if (!select) return null;
            
            // Try to find option by value first, then by text
            let option = Array.from(select.options).find(opt => opt.value === '${data.value!.replace(/'/g, "\\'")}');
            if (!option) {
              option = Array.from(select.options).find(opt => opt.text.includes('${data.value!.replace(/'/g, "\\'")}'));
            }
            
            if (!option) return null;
            
            const rect = option.getBoundingClientRect();
            // If the option has no size (e.g., native OS dropdown), we can't click it via CDP easily.
            // In that case, we fallback to setting the value and dispatching a change event.
            if (rect.width === 0 || rect.height === 0) {
              select.value = option.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              return { fallback: true };
            }
            
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
          })();
        `;
        
        const optionBox = await CDPService.evaluate(tabId, optionExpression);
        
        if (optionBox && !optionBox.fallback) {
          await cursor.click(optionBox);
        }
      }
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
