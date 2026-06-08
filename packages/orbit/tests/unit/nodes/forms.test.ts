import { describe, it, expect, vi, beforeEach } from 'vitest';
import forms from '../../../src/nodes/forms';
import { CDPService } from '../../../src/services/cdp';
import { GhostCursor } from '../../../src/lib/ghost-cursor/spoof';
import { browser } from 'wxt/browser';

vi.mock('wxt/browser', () => ({
  browser: {
    tabs: {
      query: vi.fn(),
      sendMessage: vi.fn(),
    },
  },
}));

vi.mock('../../../src/services/cdp', () => ({
  CDPService: {
    getBoundingBox: vi.fn(),
    evaluate: vi.fn(),
    sendCommand: vi.fn(),
  },
}));

const mockClick = vi.fn().mockResolvedValue(undefined);
vi.mock('../../../src/lib/ghost-cursor/spoof', () => {
  return {
    GhostCursor: class {
      click = mockClick;
    },
  };
});

describe('forms node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(browser.tabs.query).mockResolvedValue([{ id: 1, active: true, currentWindow: true } as any] as any);
    vi.mocked(CDPService.getBoundingBox).mockResolvedValue({ x: 10, y: 10, width: 100, height: 20 });
  });

  it('should handle checkbox inputs using GhostCursor', async () => {
    vi.mocked(CDPService.evaluate).mockResolvedValue(false); // Current state is false

    const result = await forms({
      selector: '#my-checkbox',
      type: 'checkbox',
      value: 'true',
    }, '1');

    if (!result.success) {
      console.error(result.error);
    }
    expect(result.success).toBe(true);
    
    // First click to focus/toggle
    expect(mockClick).toHaveBeenNthCalledWith(1, { x: 10, y: 10, width: 100, height: 20 });
    // Second click because target state (true) !== current state (false)
    expect(mockClick).toHaveBeenNthCalledWith(2, { x: 10, y: 10, width: 100, height: 20 });
  });

  it('should handle select inputs using GhostCursor', async () => {
    vi.mocked(CDPService.evaluate).mockResolvedValue({ x: 10, y: 30, width: 100, height: 20 }); // Option box

    const result = await forms({
      selector: '#my-select',
      type: 'select',
      value: 'Option 1',
    }, '1');

    expect(result.success).toBe(true);
    
    // First click to open dropdown
    expect(mockClick).toHaveBeenNthCalledWith(1, { x: 10, y: 10, width: 100, height: 20 });
    // Second click to select option
    expect(mockClick).toHaveBeenNthCalledWith(2, { x: 10, y: 30, width: 100, height: 20 });
  });

  it('should fallback to DOM manipulation for select if option has no size', async () => {
    vi.mocked(CDPService.evaluate).mockResolvedValue({ fallback: true });

    const result = await forms({
      selector: '#my-select',
      type: 'select',
      value: 'Option 1',
    }, '1');

    expect(result.success).toBe(true);
    
    // First click to open dropdown
    expect(mockClick).toHaveBeenCalledTimes(1);
    // Second click should NOT happen because of fallback
  });
});
