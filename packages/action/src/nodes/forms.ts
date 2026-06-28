import { FormsNodeData, NodeType, Result } from './types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const formsNode: NodeType<FormsNodeData> = {
  id: 'nodes:forms',
  name: 'forms',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    const box = await context.browser.getBoundingBox(data.selector);
    if (!box) {
      return { success: false, error: String(new Error(`Element not found: ${data.selector}`)) };
    }

    // Move to the element and click to focus
    await context.browser.clickBoundingBox(box);

    if (data.type === 'text') {
      if (data.clearValue) {
        // Select all and delete
        await context.browser.sendCommand('Input.dispatchKeyEvent', { type: 'keyDown', commands: ['SelectAll'] });
        await context.browser.sendCommand('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace' });
        await context.browser.sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace' });
      }

      if (data.value) {
        await context.browser.type(data.value);
      }
    } else if (data.type === 'checkbox' || data.type === 'radio') {
      // For checkbox and radio, the initial click() above already toggled it.
      // However, if we need to set it to a specific state based on data.value (e.g., "true" or "false"),
      // we should check its current state first.
      if (data.value !== undefined) {
        const targetState = data.value === 'true';
        const currentState = await context.browser.evaluate(`document.querySelector('${data.selector.replace(/'/g, "\\'")}').checked`);
        
        if (currentState !== targetState) {
          // Click again to toggle to the desired state
          await context.browser.clickBoundingBox(box);
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
        
        const optionBox = await context.browser.evaluate(optionExpression);
        
        if (optionBox && !optionBox.fallback) {
          await context.browser.clickBoundingBox(optionBox);
        }
      }
    }

    if (data.submitForm) {
      await context.browser.sendCommand('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter' });
      await context.browser.sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter' });
    }

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
