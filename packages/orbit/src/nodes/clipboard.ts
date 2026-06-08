import { ClipboardNodeData } from '../models/nodes';
import { Result } from '../services/action';

export default async function clipboard(data: ClipboardNodeData): Promise<Result<string | void>> {
  try {
    if (data.action === 'read') {
      const text = await navigator.clipboard.readText();
      return { success: true, value: text };
    } else if (data.action === 'write' && data.text !== undefined) {
      await navigator.clipboard.writeText(data.text);
      return { success: true, value: undefined };
    }
    
    return { success: false, error: new Error('Invalid clipboard action or missing text') };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
