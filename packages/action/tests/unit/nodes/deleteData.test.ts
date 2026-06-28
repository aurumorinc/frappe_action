import { describe, it, expect } from 'vitest';
import { deleteDataNode } from '../../../src/nodes/deleteData';
import { Engine } from '../../../src/nodes/index';

describe('deleteData node', () => {
  it('should delete specified keys from engine scrapedData', async () => {
    const engine = {
      scrapedData: {
        key1: 'value1',
        key2: 'value2',
        key3: 'value3'
      }
    } as unknown as Engine;

    const result = await deleteDataNode.execute({ deleteList: ['key1', 'key3'] }, { engine } as any);
    
    if (!result.success) {
      console.error(result.error);
    }
    expect(result.success).toBe(true);
    expect(engine.scrapedData).toEqual({
      key2: 'value2'
    });
  });

  it('should handle non-existent keys gracefully', async () => {
    const engine = {
      scrapedData: {
        key1: 'value1'
      }
    } as unknown as Engine;

    const result = await deleteDataNode.execute({ deleteList: ['key2'] }, { engine } as any);
    
    expect(result.success).toBe(true);
    expect(engine.scrapedData).toEqual({
      key1: 'value1'
    });
  });
});
