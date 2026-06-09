import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerNode, getNode, executeNode } from '../../../src/nodes/registry';
import { NodeType, Context } from '../../../src/nodes/types';
import { Node } from '../../../src/nodes/index';

describe('NodeRegistry', () => {
  it('should register a node handler successfully', () => {
    const mockNode: NodeType = {
      id: 'test-node',
      name: 'Test Node',
      description: 'A test node',
      execute: vi.fn()
    };
    
    registerNode(mockNode);
    expect(getNode('test-node')).toBe(mockNode);
  });

  it('should execute a registered node handler', async () => {
    const mockExecute = vi.fn().mockResolvedValue({ success: true, data: 'result' });
    const mockNodeDef: NodeType = {
      id: 'test-execute',
      name: 'Test Execute',
      description: 'A test node',
      execute: mockExecute
    };
    
    registerNode(mockNodeDef);
    
    const nodeInstance: Node = { id: '1', type: 'test-execute', data: { foo: 'bar' } };
    const context = {} as Context;
    
    const result = await executeNode(nodeInstance, context);
    
    expect(mockExecute).toHaveBeenCalledWith({ foo: 'bar' }, context);
    expect(result).toEqual({ success: true, data: 'result' });
  });

  it('should return an error for an unregistered node type', async () => {
    const nodeInstance: Node = { id: '1', type: 'unregistered-type', data: {} };
    const context = {} as Context;
    
    const result = await executeNode(nodeInstance, context);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Unknown node type');
    }
  });
});
