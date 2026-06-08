import { DeleteDataNodeData } from '../models/nodes';
import { Result, Engine } from '../services/action';

export default async function deleteData(data: DeleteDataNodeData, engine: Engine): Promise<Result<void>> {
  try {
    if (data.deleteList && Array.isArray(data.deleteList)) {
      for (const key of data.deleteList) {
        delete engine.scrapedData[key];
      }
    }
    return { success: true, value: undefined };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
