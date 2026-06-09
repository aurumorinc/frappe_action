import { ElementExistsNodeData, NodeType, Result } from './types';

export const elementExistsNode: NodeType<ElementExistsNodeData> = {
  id: 'nodes:element-exists',
  name: 'elementExists',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    
    const expression = `!!document.querySelector('${data.selector.replace(/'/g, "\\'")}')`;
    
    // Basic wait logic
    let exists = false;
    const timeout = data.waitSelectorTimeout || 5000;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      exists = await context.browser.evaluate( expression);
      if (exists || !data.waitForSelector) break;
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Store exists in context if needed
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
