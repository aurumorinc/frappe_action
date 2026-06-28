import { ClipboardNodeData, NodeType, Result } from './types';

export const clipboardNode: NodeType<ClipboardNodeData> = {
  id: 'nodes:clipboard',
  name: 'clipboard',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    if (data.action === 'read') {
      const text = await navigator.clipboard.readText();
      // Store text in context if needed, but return void for now
      return { success: true, data: undefined };
    } else if (data.action === 'write' && data.text !== undefined) {
      await navigator.clipboard.writeText(data.text);
      return { success: true, data: undefined };
    }
    
    return { success: false, error: String(new Error('Invalid clipboard action or missing text')) };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
