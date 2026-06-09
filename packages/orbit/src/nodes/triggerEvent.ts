import { TriggerEventNodeData, NodeType, Result } from './types';

/**
 * Triggers a custom event on an element.
 *
 * @warning This node uses `dispatchEvent` which generates events with `isTrusted: false`.
 * This is inherently non-stealthy and can be easily detected by anti-bot systems.
 * It should ONLY be used for triggering custom application events, NOT for simulating
 * native user interactions (like 'click', 'change', 'input'). For native interactions,
 * use the `eventClick` or `forms` nodes which utilize CDP for full stealth compliance.
 */
export const triggerEventNode: NodeType<TriggerEventNodeData> = {
  id: 'nodes:trigger-event',
  name: 'triggerEvent',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    
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

    const success = await context.browser.evaluate( expression);

    if (!success) {
      return { success: false, error: String(new Error(`Element not found: ${data.selector}`)) };
    }

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
