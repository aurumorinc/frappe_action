import { VerifySelectorNodeData, NodeType, Result } from './types';

export const verifySelectorNode: NodeType<VerifySelectorNodeData> = {
  id: 'nodes:verify-selector',
  name: 'verifySelector',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    if (!data.selector) {
      return { success: true, data: undefined };
    }

    
    const expression = `
      (() => {
        try {
          document.querySelector('${data.selector.replace(/'/g, "\\'")}');
          return true;
        } catch (e) {
          return false;
        }
      })();
    `;

    const isValid = await context.browser.evaluate( expression);
    // Store isValid in context if needed
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
