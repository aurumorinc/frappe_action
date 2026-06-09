import { NodeType, Result } from './types';

export interface TriggerNodeData {
  url_template?: string;
}

export const triggerNode: NodeType<TriggerNodeData> = {
  id: 'nodes:trigger',
  name: 'trigger',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    if (data.url_template) {
      const url = context.engine.interpolateString(data.url_template);
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        await browser.tabs.update(tabs[0].id, { url });
      }
    }
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
