import { NodeType, Context, Result } from './types';
import { Node } from './index';

const registry = new Map<string, NodeType>();

export function registerNode(node: NodeType): void {
  registry.set(node.id, node);
}

export function getNode(id: string): NodeType | undefined {
  return registry.get(id);
}

export async function executeNode(nodeInstance: Node, context: Context): Promise<Result<void>> {
  const definition = registry.get(nodeInstance.type);
  if (!definition) return { success: false, error: `Unknown node type: ${nodeInstance.type}` };
  return definition.execute(nodeInstance.data, context);
}
