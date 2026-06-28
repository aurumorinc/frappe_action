import { HoverElementNodeData, NodeType, Result } from './types';

export const hoverElementNode: NodeType<HoverElementNodeData> = {
  id: 'nodes:hover-element',
  name: 'hoverElement',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    
    const box = await context.browser.getBoundingBox( data.selector);
    if (!box) {
      return { success: false, error: String(new Error(`Element not found: ${data.selector}`)) };
    }

    await context.browser.hoverBoundingBox(box);

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
