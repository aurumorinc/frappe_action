import { ObserveNodeData, NodeType, Result } from './types';
import { executeModelNode } from '../services/model/index';

export const observeNode: NodeType<ObserveNodeData> = {
  id: 'nodes:observe',
  name: 'observe',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].id || !tabs[0].url) {
      return { success: false, error: String(new Error('No active tab found')) };
    }
    
    const node = { id: 'nodes:observe', type: 'nodes:observe' as const, data };
    const result = await executeModelNode(node, tabs[0].id, tabs[0].url, context.engine, null);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
