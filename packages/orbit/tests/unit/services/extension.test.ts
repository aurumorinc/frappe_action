import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startAction } from '../../../src/services/extension';
import { browser } from 'wxt/browser';

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      sendMessage: vi.fn()
    }
  }
}));

describe('extension.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('startAction sends message via browser.runtime', () => {
    const todo = { name: 'todo1' };
    const compiledJson = { steps: [] };
    
    startAction(todo, compiledJson);
    
    expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
      type: "START_ACTION",
      payload: {
        todo,
        compiled_json: compiledJson
      }
    });
  });
});
