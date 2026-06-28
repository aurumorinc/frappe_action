import { DelayNodeData, NodeType, Result } from './types';

export const delayNode: NodeType<DelayNodeData> = {
  id: 'nodes:delay',
  name: 'delay',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    await new Promise((resolve) => setTimeout(resolve, data.time || 1000));
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
