import { WhileLoopNodeData, NodeType, Result } from './types';

export const whileLoopNode: NodeType<WhileLoopNodeData> = {
  id: 'nodes:while-loop',
  name: 'whileLoop',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    // eslint-disable-next-line no-new-func
    const func = new Function(...Object.keys(context.engine.scrapedData), `
      return (async () => {
        return ${data.condition};
      })();
    `);
    
    const result = await func(...Object.values(context.engine.scrapedData));
    // Store result in context if needed
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
