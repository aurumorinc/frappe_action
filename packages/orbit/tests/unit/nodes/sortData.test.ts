import { describe, it, expect } from 'vitest';
import sortData from '../../../src/nodes/sortData';
import { Engine } from '../../../src/services/action';

describe('sortData node', () => {
  it('should sort an array of numbers ascending', async () => {
    const engine = {
      scrapedData: {
        myList: [3, 1, 4, 1, 5, 9]
      }
    } as unknown as Engine;

    const result = await sortData({ dataKey: 'myList', sortBy: '', order: 'asc' }, engine);
    
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

    const result = await sortData({ dataKey: 'users', sortBy: 'age', order: 'desc' }, engine);
    
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
        notAnArray: 'hello'
      }
    } as unknown as Engine;

    const result = await sortData({ dataKey: 'notAnArray', sortBy: '', order: 'asc' }, engine);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('not an array');
    }
  });
});
