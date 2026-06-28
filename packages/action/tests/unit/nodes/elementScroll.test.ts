import { describe, it, expect, vi, beforeEach } from 'vitest';
import { elementScrollNode } from '../../../src/nodes/elementScroll';
import { BrowserService } from '../../../src/services/browser/index';
import { Context } from '../../../src/nodes/types';

describe('elementScroll node', () => {
  let mockBrowserService: any;
  let mockContext: Context;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockBrowserService = {
      getBoundingBox: vi.fn(),
      evaluate: vi.fn(),
      sendCommand: vi.fn(),
    };

    mockContext = {
      browser: mockBrowserService as unknown as BrowserService,
      engine: {} as any,
      state: {},
      todo: {} as any,
    };
  });

  it('should scroll from the center of the viewport if no selector is provided', async () => {
    mockBrowserService.evaluate.mockResolvedValue({ width: 1000, height: 800 });

    const result = await elementScrollNode.execute({
      selector: '',
      scrollX: 100,
      scrollY: 200,
      smooth: true,
    }, mockContext);

    expect(result.success).toBe(true);
    expect(mockBrowserService.evaluate).toHaveBeenCalledWith(`({ width: window.innerWidth, height: window.innerHeight })`);
    expect(mockBrowserService.sendCommand).toHaveBeenCalledWith('Input.synthesizeScrollGesture', {
      x: 500,
      y: 400,
      xDistance: 100,
      yDistance: 200,
      speed: 800,
      repeatCount: 1,
      repeatDelayMs: 0,
      interactionMarkerName: 'elementScroll'
    });
  });

  it('should scroll from the center of the element if a selector is provided', async () => {
    mockBrowserService.getBoundingBox.mockResolvedValue({ x: 100, y: 100, width: 200, height: 50 });

    const result = await elementScrollNode.execute({
      selector: '.my-element',
      scrollX: 0,
      scrollY: 500,
      smooth: false,
    }, mockContext);

    expect(result.success).toBe(true);
    expect(mockBrowserService.getBoundingBox).toHaveBeenCalledWith('.my-element');
    expect(mockBrowserService.sendCommand).toHaveBeenCalledWith('Input.synthesizeScrollGesture', {
      x: 200, // 100 + 200/2
      y: 125, // 100 + 50/2
      xDistance: 0,
      yDistance: 500,
      speed: 2000,
      repeatCount: 1,
      repeatDelayMs: 0,
      interactionMarkerName: 'elementScroll'
    });
  });

  it('should return an error if the element is not found', async () => {
    mockBrowserService.getBoundingBox.mockResolvedValue(null);

    const result = await elementScrollNode.execute({
      selector: '.missing-element',
      scrollX: 0,
      scrollY: 100,
    }, mockContext);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Element not found: .missing-element');
    }
    expect(mockBrowserService.sendCommand).not.toHaveBeenCalled();
  });
});
