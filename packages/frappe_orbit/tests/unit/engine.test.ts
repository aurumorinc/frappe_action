import { describe, it, expect } from 'vitest';
import { Engine, ActionGraph } from '../../lib/engine';

describe('Engine', () => {
  it('should traverse linear graph and aggregate data', () => {
    const graph: ActionGraph = {
      nodes: [
        { id: 'node_1', type: 'trigger', data: {} },
        { id: 'node_2', type: 'get-text', data: { data_key: 'email' } },
        { id: 'node_3', type: 'manual-step', data: {} }
      ],
      edges: [
        { id: 'e1', source: 'node_1', target: 'node_2' },
        { id: 'e2', source: 'node_2', target: 'node_3' }
      ]
    };

    const engine = new Engine(graph);
    expect(engine.currentNodeId).toBe('node_1');

    engine.advance();
    expect(engine.currentNodeId).toBe('node_2');

    engine.advance({ email: 'user@domain.com' });
    expect(engine.currentNodeId).toBe('node_3');
    expect(engine.scrapedData).toEqual({ email: 'user@domain.com' });

    const result = engine.advance();
    expect(result.success).toBe(true);
    expect(result.success && result.value).toBeNull();
    expect(engine.currentNodeId).toBeNull();
  });

  it('should evaluate conditions and branch correctly', () => {
    const graph: ActionGraph = {
      nodes: [
        { id: 'trigger', type: 'trigger', data: {} },
        { id: 'path_a', type: 'manual-step', data: {} },
        { id: 'path_b', type: 'manual-step', data: {} }
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'path_a', data: { condition: 'invoice_total > 100' } },
        { id: 'e2', source: 'trigger', target: 'path_b', data: { condition: 'invoice_total <= 100' } }
      ]
    };

    const engine = new Engine(graph);
    expect(engine.currentNodeId).toBe('trigger');

    engine.advance({ invoice_total: 50 });
    expect(engine.currentNodeId).toBe('path_b');
  });
});
