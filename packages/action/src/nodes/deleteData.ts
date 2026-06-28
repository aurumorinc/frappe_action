import { DeleteDataNodeData, NodeType, Result } from './types';

export const deleteDataNode: NodeType<DeleteDataNodeData> = {
  id: 'nodes:delete-data',
  name: 'deleteData',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    if (data.deleteList && Array.isArray(data.deleteList)) {
      for (const key of data.deleteList) {
        delete context.engine.scrapedData[key];
      }
    }
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
