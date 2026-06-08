import { SortDataNodeData } from '../models/nodes';
import { Result, Engine } from '../services/action';

export default async function sortData(data: SortDataNodeData, engine: Engine): Promise<Result<void>> {
  try {
    const arrayToSort = engine.scrapedData[data.dataKey];
    
    if (!Array.isArray(arrayToSort)) {
      return { success: false, error: new Error(`Data at key ${data.dataKey} is not an array`) };
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

    engine.scrapedData[data.dataKey] = arrayToSort;

    return { success: true, value: undefined };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
