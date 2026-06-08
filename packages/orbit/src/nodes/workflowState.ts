import { WorkflowStateNodeData } from '../models/nodes';
import { Result, Engine } from '../services/action';

export default async function workflowState(data: WorkflowStateNodeData, engine: Engine): Promise<Result<void>> {
  try {
    if (data.variables && typeof data.variables === 'object') {
      engine.scrapedData = {
        ...engine.scrapedData,
        ...data.variables
      };
    }
    return { success: true, value: undefined };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
