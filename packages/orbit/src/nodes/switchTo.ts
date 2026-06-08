import { SwitchToNodeData } from '../models/nodes';
import { Result } from '../services/action';

export default async function switchTo(data: SwitchToNodeData): Promise<Result<void>> {
  try {
    // In the context of the content script, switching to an iframe is handled
    // by passing the frameSelector to subsequent handleSelector calls.
    // This node might just need to update some global state or return the selector
    // so the engine knows to pass it to the next nodes.
    
    // For now, we'll just return success. The engine should store this frameSelector
    // and pass it to subsequent nodes.
    return { success: true, value: undefined };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
