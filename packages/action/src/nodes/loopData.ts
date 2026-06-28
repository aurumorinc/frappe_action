import { LoopDataNodeData, NodeType, Result } from './types';

export const loopDataNode: NodeType<LoopDataNodeData> = {
  id: 'nodes:loop-data',
  name: 'loopData',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  // This node primarily interacts with the engine state in the background.
  // In the content script context, it might just be a no-op or return a signal.
  return { success: true, data: undefined };
}

};
