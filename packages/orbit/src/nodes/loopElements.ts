import { LoopElementsNodeData, NodeType, Result } from './types';

export const loopElementsNode: NodeType<LoopElementsNodeData> = {
  id: 'nodes:loop-elements',
  name: 'loopElements',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  // This node primarily interacts with the engine state in the background.
  // In the content script context, it might just be a no-op or return a signal.
  return { success: true, data: undefined };
}

};
