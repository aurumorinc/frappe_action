import { LoopElementsNodeData } from '../models/nodes';
import { Result } from '../services/action';

export default async function loopElements(data: LoopElementsNodeData): Promise<Result<void>> {
  // This node primarily interacts with the engine state in the background.
  // In the content script context, it might just be a no-op or return a signal.
  return { success: true, value: undefined };
}
