import { ExtractNodeData, NodeType, Result } from './types';
import { executeModelNode } from '../services/model/index';
import { browser } from 'wxt/browser';

export const extractNode: NodeType<ExtractNodeData> = {
  id: 'nodes:extract',
  name: 'extract',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].id || !tabs[0].url) {
      return { success: false, error: String(new Error('No active tab found')) };
    }
    
    const node = { id: 'nodes:extract', type: 'nodes:extract' as const, data };
    const result = await executeModelNode(node, tabs[0].id, tabs[0].url, context.engine, context.todo);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
