import { CreateElementNodeData, NodeType, Result } from './types';

export const createElementNode: NodeType<CreateElementNodeData> = {
  id: 'nodes:create-element',
  name: 'createElement',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    
    let position = 'beforeend';
    switch (data.insertType) {
      case 'append': position = 'beforeend'; break;
      case 'prepend': position = 'afterbegin'; break;
      case 'before': position = 'beforebegin'; break;
      case 'after': position = 'afterend'; break;
    }

    const expression = `
      (() => {
        const elements = ${data.multiple ? `Array.from(document.querySelectorAll('${data.selector.replace(/'/g, "\\'")}'))` : `[document.querySelector('${data.selector.replace(/'/g, "\\'")}')]`};
        if (!elements[0]) return false;
        elements.forEach(el => el.insertAdjacentHTML('${position}', \`${data.html.replace(/`/g, "\\`")}\`));
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
