import { TriggerEventNodeData } from '../models/nodes';
import { Result } from '../services/action';
import { CDPService } from '../services/cdp';
import { browser } from 'wxt/browser';

/**
 * Triggers a custom event on an element.
 *
 * @warning This node uses `dispatchEvent` which generates events with `isTrusted: false`.
 * This is inherently non-stealthy and can be easily detected by anti-bot systems.
 * It should ONLY be used for triggering custom application events, NOT for simulating
 * native user interactions (like 'click', 'change', 'input'). For native interactions,
 * use the `eventClick` or `forms` nodes which utilize CDP for full stealth compliance.
 */
export default async function triggerEvent(data: TriggerEventNodeData, id: string): Promise<Result<void>> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].id) {
      return { success: false, error: new Error('No active tab found') };
    }
    const tabId = tabs[0].id;

    let eventParams = '{}';
    if (data.eventParams) {
      try {
        JSON.parse(data.eventParams); // Validate
        eventParams = data.eventParams;
      } catch (e) {
        // Ignore invalid JSON
      }
    }

    const expression = `
      (() => {
        const elements = ${data.multiple ? `Array.from(document.querySelectorAll('${data.selector.replace(/'/g, "\\'")}'))` : `[document.querySelector('${data.selector.replace(/'/g, "\\'")}')]`};
        if (!elements[0]) return false;
        
        const params = ${eventParams};
        const event = new CustomEvent('${data.eventName.replace(/'/g, "\\'")}', { detail: params, bubbles: true, cancelable: true });
        
        elements.forEach(el => el.dispatchEvent(event));
        return true;
      })();
    `;

    const success = await CDPService.evaluate(tabId, expression);

    if (!success) {
      return { success: false, error: new Error(`Element not found: ${data.selector}`) };
    }

    return { success: true, value: undefined };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
