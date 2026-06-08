import { describe, it, expect } from 'vitest';
import workflowState from '../../../src/nodes/workflowState';
import { Engine } from '../../../src/services/action';

describe('workflowState node', () => {
  it('should merge variables into engine scrapedData', async () => {
    const engine = {
      scrapedData: {
        existingKey: 'value'
      }
    } as unknown as Engine;

    const result = await workflowState({ variables: { newKey: 123, existingKey: 'updated' } }, engine);
    
    expect(result.success).toBe(true);
    expect(engine.scrapedData).toEqual({
      existingKey: 'updated',
      newKey: 123
    });
  });

  it('should handle empty variables gracefully', async () => {
    const engine = {
      scrapedData: {
        existingKey: 'value'
      }
    } as unknown as Engine;

    const result = await workflowState({ variables: {} }, engine);
    
    expect(result.success).toBe(true);
    expect(engine.scrapedData).toEqual({
      existingKey: 'value'
    });
  });
});
