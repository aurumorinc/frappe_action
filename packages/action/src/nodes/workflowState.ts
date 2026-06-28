import { WorkflowStateNodeData, NodeType, Result } from './types';

export const workflowStateNode: NodeType<WorkflowStateNodeData> = {
  id: 'nodes:workflow-state',
  name: 'workflowState',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    if (data.variables && typeof data.variables === 'object') {
      context.engine.scrapedData = {
        ...context.engine.scrapedData,
        ...data.variables
      };
    }
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
