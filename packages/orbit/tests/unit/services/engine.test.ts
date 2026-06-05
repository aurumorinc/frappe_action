import { describe, it, expect } from 'vitest';
import { Engine, ActionGraph } from '../../../src/services/engine';

describe('Engine', () => {
  it('should traverse linear graph and aggregate data', () => {
    const graph: ActionGraph = {
      nodes: [
        { id: '1', type: 'trigger', data: {} },
        { id: '2', type: 'get-text', data: { target_selector: '#email', extract_target: 'innerText', data_key: 'email' } },
        { id: '3', type: 'network-request', data: {} }
      ],
      edges: [
        { id: 'e1', source: '1', target: '2' },
        { id: 'e2', source: '2', target: '3' }
      ]
    };

    const engine = new Engine(graph);
    
    // Initial state
    expect(engine.getCurrentNode()?.id).toBe('1');
    
    // Advance past trigger
    engine.advance();
    expect(engine.getCurrentNode()?.id).toBe('2');
    
    // Advance past get-text with data
    engine.advance({ email: 'user@domain.com' });
    expect(engine.getCurrentNode()?.id).toBe('3');
    expect(engine.scrapedData).toEqual({ email: 'user@domain.com' });
  });

  it('should evaluate conditions and branch correctly', () => {
    const graph: ActionGraph = {
      nodes: [
        { id: '1', type: 'trigger', data: {} },
        { id: '2', type: 'manual-step', data: {} },
        { id: '3', type: 'sub-task', data: {} }
      ],
      edges: [
        { id: 'e1', source: '1', target: '2', data: { condition: 'invoice_total > 100' } },
        { id: 'e2', source: '1', target: '3', data: { condition: 'invoice_total <= 100' } }
      ]
    };

    const engine = new Engine(graph);
    
    // Initial state
    expect(engine.getCurrentNode()?.id).toBe('1');
    
    // Advance with data that satisfies path_a
    engine.advance({ invoice_total: 500 });
    expect(engine.getCurrentNode()?.id).toBe('2');
  });

  it('should handle missing or invalid graph gracefully', () => {
    const graph: ActionGraph = { nodes: [], edges: [] };
    const engine = new Engine(graph);
    
    expect(engine.getCurrentNode()).toBeNull();
  });
});
