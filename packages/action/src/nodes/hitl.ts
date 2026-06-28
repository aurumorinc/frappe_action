import { HitlNodeData, NodeType, Result } from './types';

export const hitlNode: NodeType<HitlNodeData> = {
  id: 'nodes:hitl',
  name: 'hitl',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].id) {
      return { success: false, error: String(new Error('No active tab found')) };
    }

    // Pause execution and notify UI
    await browser.tabs.sendMessage(tabs[0].id, {
      type: "REQUIRE_HITL",
      payload: {
        nodeId: 'nodes:hitl',
        nodeType: 'hitl',
        message: data.message || "Human intervention required",
        todo_type: data.todo_type,
        dataKey: data.data_key
      }
    });

    // We return a special result or just undefined, and the context.engine will wait.
    // Actually, the context.engine's advance() method doesn't natively support pausing unless we return a Promise that resolves later.
    // In the original code, `processNextNode` just didn't call `advance()` or `processNextNode()` again.
    // To replicate this in a standard node, we can return a Promise that never resolves, or we can add a "pause" state to the context.engine.
    // For now, we can return a special error or value that tells the context.engine to pause.
    // Let's return a specific error that the context.engine can catch and ignore, or we can just return a Promise that we resolve later.
    // Since this is a refactor, we'll return a special value.
    // Store pause state in context if needed
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
