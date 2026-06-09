import { SortDataNodeData, NodeType, Result } from './types';

export const sortDataNode: NodeType<SortDataNodeData> = {
  id: 'nodes:sort-data',
  name: 'sortData',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    const arrayToSort = context.engine.scrapedData[data.dataKey];
    
    if (!Array.isArray(arrayToSort)) {
      return { success: false, error: String(new Error(`Data at key ${data.dataKey} is not an array`)) };
    }

    arrayToSort.sort((a, b) => {
      let valA = a;
      let valB = b;

      if (data.sortBy && typeof a === 'object' && typeof b === 'object') {
        valA = a[data.sortBy];
        valB = b[data.sortBy];
      }

      if (valA < valB) return data.order === 'asc' ? -1 : 1;
      if (valA > valB) return data.order === 'asc' ? 1 : -1;
      return 0;
    });

    context.engine.scrapedData[data.dataKey] = arrayToSort;

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
