import { AttributeValueNodeData, NodeType, Result } from './types';

export const attributeValueNode: NodeType<AttributeValueNodeData> = {
  id: 'nodes:attribute-value',
  name: 'attributeValue',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    
    if (data.action === 'get') {
      const expression = `
        (() => {
          const elements = ${data.multiple ? `Array.from(document.querySelectorAll('${data.selector.replace(/'/g, "\\'")}'))` : `[document.querySelector('${data.selector.replace(/'/g, "\\'")}')]`};
          if (!elements[0]) return null;
          return elements.map(el => el.getAttribute('${data.attributeName.replace(/'/g, "\\'")}') || '');
        })();
      `;
      const result = await context.browser.evaluate( expression);
      if (!result) return { success: false, error: String(new Error(`Element not found: ${data.selector}`)) };
      // Store result in context if needed, but return void for now
      return { success: true, data: undefined };
    } else if (data.action === 'set' && data.attributeValue !== undefined) {
      const expression = `
        (() => {
          const elements = ${data.multiple ? `Array.from(document.querySelectorAll('${data.selector.replace(/'/g, "\\'")}'))` : `[document.querySelector('${data.selector.replace(/'/g, "\\'")}')]`};
          if (!elements[0]) return false;
          elements.forEach(el => el.setAttribute('${data.attributeName.replace(/'/g, "\\'")}', '${data.attributeValue!.replace(/'/g, "\\'")}'));
          return true;
        })();
      `;
      const success = await context.browser.evaluate( expression);
      if (!success) return { success: false, error: String(new Error(`Element not found: ${data.selector}`)) };
      return { success: true, data: undefined };
    }

    return { success: false, error: String(new Error('Invalid action or missing attributeValue')) };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
