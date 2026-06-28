import { PressKeyNodeData, NodeType, Result } from './types';

export const pressKeyNode: NodeType<PressKeyNodeData> = {
  id: 'nodes:press-key',
  name: 'pressKey',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    
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
      await context.browser.evaluate( expression);
    }

    let modifiers = 0;
    if (data.modifiers) {
      if (data.modifiers.includes('alt')) modifiers |= 1;
      if (data.modifiers.includes('ctrl')) modifiers |= 2;
      if (data.modifiers.includes('meta')) modifiers |= 4;
      if (data.modifiers.includes('shift')) modifiers |= 8;
    }

    // Send keyDown
    await context.browser.sendCommand( 'Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: data.key,
      modifiers
    });

    // Send keyUp
    await context.browser.sendCommand( 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: data.key,
      modifiers
    });

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
