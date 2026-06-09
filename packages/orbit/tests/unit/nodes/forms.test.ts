import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formsNode } from '../../../src/nodes/forms';
import { BrowserService } from '../../../src/services/browser/index';
import { Context } from '../../../src/nodes/types';

describe('forms node', () => {
  let mockBrowserService: any;
  let mockContext: Context;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockBrowserService = {
      getBoundingBox: vi.fn().mockResolvedValue({ x: 10, y: 10, width: 100, height: 20 }),
      clickBoundingBox: vi.fn().mockResolvedValue(undefined),
      sendCommand: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn(),
      type: vi.fn().mockResolvedValue(undefined),
    };

    mockContext = {
      browser: mockBrowserService as unknown as BrowserService,
      engine: {} as any,
      state: {},
      todo: {} as any,
    };
  });

  it('should handle checkbox inputs using BrowserService', async () => {
    mockBrowserService.evaluate.mockResolvedValue(false); // Current state is false

    const result = await formsNode.execute({
      selector: '#my-checkbox',
      type: 'checkbox',
      value: 'true',
    }, mockContext);

    if (!result.success) {
      console.error(result.error);
    }
    expect(result.success).toBe(true);
    
    // First click to focus/toggle
    expect(mockBrowserService.clickBoundingBox).toHaveBeenNthCalledWith(1, { x: 10, y: 10, width: 100, height: 20 });
    // Second click because target state (true) !== current state (false)
    expect(mockBrowserService.clickBoundingBox).toHaveBeenNthCalledWith(2, { x: 10, y: 10, width: 100, height: 20 });
  });

  it('should handle select inputs using BrowserService', async () => {
    mockBrowserService.evaluate.mockResolvedValue({ x: 10, y: 30, width: 100, height: 20 }); // Option box

    const result = await formsNode.execute({
      selector: '#my-select',
      type: 'select',
      value: 'Option 1',
    }, mockContext);

    expect(result.success).toBe(true);
    
    // First click to open dropdown
    expect(mockBrowserService.clickBoundingBox).toHaveBeenNthCalledWith(1, { x: 10, y: 10, width: 100, height: 20 });
    // Second click to select option
    expect(mockBrowserService.clickBoundingBox).toHaveBeenNthCalledWith(2, { x: 10, y: 30, width: 100, height: 20 });
  });

  it('should fallback to DOM manipulation for select if option has no size', async () => {
    mockBrowserService.evaluate.mockResolvedValue({ fallback: true });

    const result = await formsNode.execute({
      selector: '#my-select',
      type: 'select',
      value: 'Option 1',
    }, mockContext);

    expect(result.success).toBe(true);
    
    // First click to open dropdown
    expect(mockBrowserService.clickBoundingBox).toHaveBeenCalledTimes(1);
    // Second click should NOT happen because of fallback
  });
});
