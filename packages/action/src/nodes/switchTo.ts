import { SwitchToNodeData, NodeType, Result } from './types';

export const switchToNode: NodeType<SwitchToNodeData> = {
  id: 'nodes:switch-to',
  name: 'switchTo',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    // In the context of the content script, switching to an iframe is handled
    // by passing the frameSelector to subsequent handleSelector calls.
    // This node might just need to update some global state or return the selector
    // so the engine knows to pass it to the next nodes.
    
    // For now, we'll just return success. The engine should store this frameSelector
    // and pass it to subsequent nodes.
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
