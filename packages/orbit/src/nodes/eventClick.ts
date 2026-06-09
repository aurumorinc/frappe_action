import { EventClickNodeData, NodeType, Result } from './types';

export const eventClickNode: NodeType<EventClickNodeData> = {
  id: 'nodes:event-click',
  name: 'eventClick',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    await context.browser.clickElement(data.selector);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
