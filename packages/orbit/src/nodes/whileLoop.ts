import { WhileLoopNodeData } from '../models/nodes';
import { Result, Engine } from '../services/action';

export default async function whileLoop(data: WhileLoopNodeData, engine: Engine): Promise<Result<boolean>> {
  try {
    // eslint-disable-next-line no-new-func
    const func = new Function(...Object.keys(engine.scrapedData), `
      return (async () => {
        return ${data.condition};
      })();
    `);
    
    const result = await func(...Object.values(engine.scrapedData));
    return { success: true, value: Boolean(result) };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
