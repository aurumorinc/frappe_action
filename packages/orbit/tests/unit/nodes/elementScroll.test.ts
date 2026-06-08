import { describe, it, expect, vi, beforeEach } from 'vitest';
import elementScroll from '../../../src/nodes/elementScroll';
import { CDPService } from '../../../src/services/cdp';
import { browser } from 'wxt/browser';

vi.mock('wxt/browser', () => ({
  browser: {
    tabs: {
      query: vi.fn(),
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

describe('elementScroll node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(browser.tabs.query).mockResolvedValue([{ id: 1, active: true, currentWindow: true } as any] as any);
  });

  it('should scroll from the center of the viewport if no selector is provided', async () => {
    vi.mocked(CDPService.evaluate).mockResolvedValue({ width: 1000, height: 800 });

    const result = await elementScroll({
      selector: '',
      scrollX: 100,
      scrollY: 200,
      smooth: true,
    }, '1');

    expect(result.success).toBe(true);
    expect(CDPService.evaluate).toHaveBeenCalledWith(1, `({ width: window.innerWidth, height: window.innerHeight })`);
    expect(CDPService.sendCommand).toHaveBeenCalledWith(1, 'Input.synthesizeScrollGesture', {
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
    vi.mocked(CDPService.getBoundingBox).mockResolvedValue({ x: 100, y: 100, width: 200, height: 50 });

    const result = await elementScroll({
      selector: '.my-element',
      scrollX: 0,
      scrollY: 500,
      smooth: false,
    }, '1');

    expect(result.success).toBe(true);
    expect(CDPService.getBoundingBox).toHaveBeenCalledWith(1, '.my-element');
    expect(CDPService.sendCommand).toHaveBeenCalledWith(1, 'Input.synthesizeScrollGesture', {
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
    vi.mocked(CDPService.getBoundingBox).mockResolvedValue(null);

    const result = await elementScroll({
      selector: '.missing-element',
      scrollX: 0,
      scrollY: 100,
    }, '1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.message).toBe('Element not found: .missing-element');
    }
    expect(CDPService.sendCommand).not.toHaveBeenCalled();
  });
});
