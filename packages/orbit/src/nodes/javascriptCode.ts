import { JavascriptCodeNodeData, NodeType, Result } from './types';

export const javascriptCodeNode: NodeType<JavascriptCodeNodeData> = {
  id: 'nodes:javascript-code',
  name: 'javascriptCode',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    
    const expression = `
      (async () => {
        ${data.code}
      })();
    `;

    const executeCode = context.browser.evaluate( expression);

    if (data.timeout && data.timeout > 0) {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('JavaScript execution timed out')), data.timeout);
      });
      
      const result = await Promise.race([executeCode, timeoutPromise]);
      return { success: true, data: result };
    }

    const result = await executeCode;
    // Store result in context if needed
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
