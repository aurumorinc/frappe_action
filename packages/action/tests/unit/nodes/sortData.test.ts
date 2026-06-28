import { describe, it, expect } from 'vitest';
import { sortDataNode } from '../../../src/nodes/sortData';
import { Engine } from '../../../src/nodes/index';

describe('sortData node', () => {
  it('should sort an array of numbers ascending', async () => {
    const engine = {
      scrapedData: {
        myList: [3, 1, 4, 1, 5, 9]
      }
    } as unknown as Engine;

    const result = await sortDataNode.execute({ dataKey: 'myList', sortBy: '', order: 'asc' }, { engine } as any);
    
    expect(result.success).toBe(true);
    expect(engine.scrapedData.myList).toEqual([1, 1, 3, 4, 5, 9]);
  });

  it('should sort an array of objects descending by key', async () => {
    const engine = {
      scrapedData: {
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
          { name: 'Charlie', age: 35 }
        ]
      }
    } as unknown as Engine;

    const result = await sortDataNode.execute({ dataKey: 'users', sortBy: 'age', order: 'desc' }, { engine } as any);
    
    expect(result.success).toBe(true);
    expect(engine.scrapedData.users).toEqual([
      { name: 'Charlie', age: 35 },
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 }
    ]);
  });

  it('should return an error if dataKey is not an array', async () => {
    const engine = {
      scrapedData: {
        myList: 'not an array'
      }
    } as unknown as Engine;

    const result = await sortDataNode.execute({ dataKey: 'myList', sortBy: '', order: 'asc' }, { engine } as any);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Data at key myList is not an array');
    }
  });
});
