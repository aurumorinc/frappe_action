import { DelayNodeData } from '../models/nodes';
import { Result } from '../services/action';

export default async function delay(data: DelayNodeData): Promise<Result<void>> {
  try {
    await new Promise((resolve) => setTimeout(resolve, data.time || 1000));
    return { success: true, value: undefined };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
