import { describe, it, expect } from 'vitest';
import { workflowStateNode } from '../../../src/nodes/workflowState';
import { Engine } from '../../../src/nodes/index';

describe('workflowState node', () => {
  it('should merge variables into engine scrapedData', async () => {
    const engine = {
      scrapedData: {
        existingKey: 'value'
      }
    } as unknown as Engine;

    const result = await workflowStateNode.execute({ variables: { newKey: 123, existingKey: 'updated' } }, { engine } as any);
    
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

    const result = await workflowStateNode.execute({ variables: {} }, { engine } as any);
    
    expect(result.success).toBe(true);
    expect(engine.scrapedData).toEqual({
      existingKey: 'value'
    });
  });
});
